import { stepCountIs, streamText, type ModelMessage } from "ai"

import type { Engine, ProviderList, PromptInput } from "../types"
import type { Event, Message, Part, Session } from "../../lib/sdk"
import { getProviderKey } from "../../lib/phone/key"
import { providerModel } from "../../lib/phone/provider"
import { DEFAULT_PROVIDER_ID, PRESETS } from "../../lib/phone/providers"
import { createPhoneTools } from "./tools"
import {
  appendApprovalAudit,
  completePhoneMessage,
  deletePhoneSession,
  getPhoneSession,
  getPhoneSessionConfig,
  getProvider,
  insertPhoneMessage,
  insertPhoneSession,
  listPhoneMessages,
  listPhoneSessions,
  touchPhoneSession,
  upsertPhonePart,
} from "./store"

// Phone mode is a coding assistant with no shell and no files yet. State the
// limits so the model does not promise work it cannot do.
const SYSTEM_PROMPT = [
  "You are Devmote, an AI coding assistant running entirely on the user's Android phone.",
  "You can read, search, create and edit files inside a dedicated workspace using your tools.",
  "You cannot run shell commands, install packages, build or test code, and you have no network tools.",
  "Ask for approval-worthy changes normally: writes and edits are shown to the user for approval before they happen.",
  "If a task needs execution, make the change you can and tell the user what to run.",
  "Answer in the language the user writes in. Prefer short, concrete answers with code blocks where useful.",
].join(" ")

// Used when the chosen provider cannot do tool calls: better to say so than to
// run a loop that fails halfway.
const CHAT_ONLY_PROMPT = [
  "You are Devmote, an AI assistant running on the user's Android phone.",
  "You have no tools in this conversation: you cannot read files, run commands, or reach the network.",
  "Answer from what you already know, and tell the user when a task needs a tool-capable model.",
  "Answer in the language the user writes in.",
].join(" ")

const MAX_STEPS = 25

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function textOf(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("\n")
}

type Listener = (event: Event) => void

export function createPhoneEngine(): Engine {
  const listeners = new Set<Listener>()
  const aborts = new Map<string, AbortController>()

  // Permission gating for mutating tools. "always" is scoped to the session,
  // matching the spec's "Always allow (this session)".
  const approvals = new Map<string, { sessionID: string; settle: (reply: "once" | "always" | "reject") => void }>()
  const alwaysAllow = new Set<string>()

  const emit = (event: Event) => {
    for (const listener of listeners) listener(event)
  }

  const approvalGate = (sessionID: string) => async (
    toolName: string,
    input: Record<string, unknown>,
    preview?: string,
  ): Promise<void> => {
    const key = `${sessionID}:${toolName}`
    if (alwaysAllow.has(key)) {
      console.log(`[phone] approval auto-allowed for ${key}`)
      void appendApprovalAudit({ sessionID, tool: toolName, decision: "auto-allowed" }).catch(() => undefined)
      return
    }
    const requestID = id("p_perm")
    console.log(`[phone] approval asked ${requestID} tool=${toolName} session=${sessionID}`)
    void appendApprovalAudit({ sessionID, tool: toolName, decision: "asked", detail: preview }).catch(() => undefined)
    emit({ type: "permission.asked", properties: { id: requestID, sessionID, tool: toolName, input, preview } })
    await new Promise<void>((resolve, reject) => {
      approvals.set(requestID, {
        sessionID,
        settle: (reply) => {
          console.log(`[phone] approval settled ${requestID} reply=${reply}`)
          void appendApprovalAudit({ sessionID, tool: toolName, decision: reply }).catch(() => undefined)
          if (reply === "reject") {
            reject(new Error(`The user rejected the ${toolName} tool call.`))
            return
          }
          if (reply === "always") alwaysAllow.add(key)
          resolve()
        },
      })
    })
  }

  const engine: Engine = {
    kind: "phone",

    listSessions: () => listPhoneSessions(),
    getSession: async (sessionID) => {
      const session = await getPhoneSession(sessionID)
      if (!session) throw new Error(`Unknown phone session: ${sessionID}`)
      return session
    },
    createSession: async (opts) => {
      const now = Date.now()
      const modelID = opts?.modelID ?? "deepseek-v4.1-flash"
      const providerID = opts?.providerID ?? DEFAULT_PROVIDER_ID
      const session: Session = {
        id: id("p_ses"),
        slug: "",
        projectID: "phone",
        directory: "",
        title: opts?.title?.trim() || "New chat",
        version: modelID,
        time: { created: now, updated: now },
      }
      session.slug = session.id
      await insertPhoneSession(session, modelID, providerID)
      emit({ type: "session.updated", properties: { info: session } })
      return session
    },
    deleteSession: async (sessionID) => {
      await deletePhoneSession(sessionID)
    },

    getMessages: (sessionID) => listPhoneMessages(sessionID),

    prompt: async (sessionID, input: PromptInput) => {
      const session = await engine.getSession(sessionID)
      const config = await getPhoneSessionConfig(sessionID)
      const provider =
        (await getProvider(config.providerID)) ?? PRESETS.find((preset) => preset.id === config.providerID) ?? PRESETS[0]
      const modelID = input.model?.modelID ?? config.modelID
      const apiKey = provider.requiresKey ? await getProviderKey(provider.id) : null
      if (provider.requiresKey && !apiKey) throw new Error(`Add an API key for ${provider.name} in Settings.`)

      const text = textOf(input.parts)
      if (!text) return

      const created = Date.now()
      const user: Message = {
        id: id("p_msg"),
        sessionID,
        role: "user",
        time: { created },
        model: { providerID: "opencode-go", modelID },
      }
      const userPart: Part = {
        id: id("p_part"),
        messageID: user.id,
        type: "text",
        text,
      }
      await insertPhoneMessage(user)
      await upsertPhonePart(userPart, 0)
      emit({ type: "message.updated", properties: { info: user } })
      emit({ type: "part.updated", properties: { part: userPart } })

      const title = session.title === "New chat" ? text.replace(/\s+/g, " ").slice(0, 60) : session.title
      if (title !== session.title) await touchPhoneSession(sessionID, { title })

      const assistant: Message = {
        id: id("p_msg"),
        sessionID,
        role: "assistant",
        time: { created: Date.now() },
        modelID,
        providerID: "opencode-go",
      }
      await insertPhoneMessage(assistant)
      emit({ type: "message.updated", properties: { info: assistant } })

      const textPart: Part = { id: id("p_part"), messageID: assistant.id, type: "text", text: "" }
      let reasoningPart: Part | null = null
      emit({ type: "part.updated", properties: { part: textPart } })

      const history: ModelMessage[] = (await listPhoneMessages(sessionID))
        .filter((entry) => entry.info.id !== assistant.id)
        .map((entry) => ({ role: entry.info.role, content: textOf(entry.parts) }))
        .filter((entry) => entry.content.length > 0)

      const controller = new AbortController()
      aborts.set(sessionID, controller)

      try {
        const result = streamText({
          model: providerModel({ provider, modelID, sessionID, apiKey }),
          system: provider.tools ? SYSTEM_PROMPT : CHAT_ONLY_PROMPT,
          messages: history,
          tools: provider.tools ? createPhoneTools(sessionID, approvalGate(sessionID)) : undefined,
          abortSignal: controller.signal,
          maxRetries: 1,
          stopWhen: stepCountIs(provider.tools ? MAX_STEPS : 1),
        })

        let textBuffer = ""
        let reasoningBuffer = ""
        const toolParts = new Map<string, Part>()

        for await (const chunk of result.fullStream) {
          if (chunk.type === "tool-call") {
            const part: Part = {
              id: id("p_part"),
              messageID: assistant.id,
              type: "tool",
              tool: chunk.toolName,
              callID: chunk.toolCallId,
              state: { status: "running", input: chunk.input },
            }
            toolParts.set(chunk.toolCallId, part)
            emit({ type: "part.updated", properties: { part } })
            continue
          }
          if (chunk.type === "tool-result") {
            const part = toolParts.get(chunk.toolCallId)
            if (!part) {
              // The provider returned a result for a call we never issued, or
              // executed the tool itself. It cannot have touched our workspace,
              // so never render it as a successful local tool call.
              const stray: Part = {
                id: id("p_part"),
                messageID: assistant.id,
                type: "tool",
                tool: chunk.toolName,
                callID: chunk.toolCallId,
                state: {
                  status: "error",
                  input: chunk.input,
                  error: {
                    message: "This tool ran outside Devmote, so it did not change your workspace.",
                  },
                },
              }
              toolParts.set(chunk.toolCallId, stray)
              emit({ type: "part.updated", properties: { part: stray } })
              continue
            }
            part.state = { ...part.state, status: "completed", output: chunk.output }
            emit({ type: "part.updated", properties: { part } })
            continue
          }
          if (chunk.type === "tool-error") {
            const part = toolParts.get(chunk.toolCallId)
            if (part) {
              part.state = {
                ...part.state,
                status: "error",
                error: { message: chunk.error instanceof Error ? chunk.error.message : String(chunk.error) },
              }
              emit({ type: "part.updated", properties: { part } })
            }
            continue
          }
          if (chunk.type === "text-delta") {
            textBuffer += chunk.text
            textPart.text = textBuffer
            emit({ type: "part.updated", properties: { part: textPart } })
            continue
          }
          if (chunk.type === "reasoning-delta") {
            reasoningBuffer += chunk.text
            if (!reasoningPart) {
              reasoningPart = { id: id("p_part"), messageID: assistant.id, type: "reasoning", text: "" }
              emit({ type: "part.updated", properties: { part: reasoningPart } })
            }
            reasoningPart.text = reasoningBuffer
            emit({ type: "part.updated", properties: { part: reasoningPart } })
            continue
          }
          if (chunk.type === "error") {
            throw chunk.error instanceof Error ? chunk.error : new Error(String(chunk.error))
          }
          if (chunk.type === "finish") {
            const usage = chunk.totalUsage
            assistant.tokens = {
              input: usage.inputTokens ?? 0,
              output: usage.outputTokens ?? 0,
              reasoning: usage.outputTokenDetails?.reasoningTokens ?? 0,
              cache: {
                read: usage.inputTokenDetails?.cacheReadTokens ?? 0,
                write: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
              },
            }
            assistant.time.completed = Date.now()
            assistant.finish = chunk.finishReason
          }
        }

        await upsertPhonePart(textPart, 0)
        if (reasoningPart) await upsertPhonePart(reasoningPart, 1)
        let seq = 2
        for (const part of toolParts.values()) await upsertPhonePart(part, seq++)
        await completePhoneMessage(assistant.id, {
          completed: assistant.time.completed ?? Date.now(),
          tokens: assistant.tokens,
        })
        await touchPhoneSession(sessionID)
        emit({ type: "message.updated", properties: { info: assistant } })
        emit({ type: "session.updated", properties: { info: { ...session, title } } })
      } catch (error) {
        const aborted = controller.signal.aborted
        const message = aborted ? "aborted" : error instanceof Error ? error.message : String(error)
        assistant.error = { message }
        assistant.time.completed = Date.now()
        await completePhoneMessage(assistant.id, { completed: Date.now(), error: message })
        emit({ type: "message.updated", properties: { info: assistant } })
        if (!aborted) emit({ type: "session.error", properties: { sessionID, error: message } })
      } finally {
        aborts.delete(sessionID)
        emit({ type: "session.idle", properties: { sessionID } })
      }
    },

    abort: async (sessionID) => {
      // Reject anything waiting on the user before the stream unwinds, or the
      // tool loop would stay parked on a promise nobody can answer.
      for (const [requestID, entry] of approvals) {
        if (entry.sessionID !== sessionID) continue
        approvals.delete(requestID)
        entry.settle("reject")
      }
      const controller = aborts.get(sessionID)
      if (!controller) return false
      controller.abort()
      return true
    },

    revert: async () => {
      throw new Error("Edit and revert are not available in phone mode yet.")
    },
    unrevert: async () => {
      throw new Error("Edit and revert are not available in phone mode yet.")
    },

    listPermissions: async () => [],
    replyPermission: async (requestID, reply) => {
      const entry = approvals.get(requestID)
      if (!entry) return false
      approvals.delete(requestID)
      entry.settle(reply)
      return true
    },
    listQuestions: async () => [],
    replyQuestion: async () => false,
    rejectQuestion: async () => false,

    events: (signal?: AbortSignal) => {
      const queue: Event[] = []
      let wake: (() => void) | null = null
      let closed = false
      const listener: Listener = (event) => {
        queue.push(event)
        wake?.()
      }
      listeners.add(listener)
      const close = () => {
        closed = true
        listeners.delete(listener)
        wake?.()
      }
      signal?.addEventListener("abort", close)

      return {
        async *[Symbol.asyncIterator]() {
          while (!closed || queue.length > 0) {
            if (queue.length === 0) {
              await new Promise<void>((resolve) => {
                wake = resolve
              })
              wake = null
              continue
            }
            yield queue.shift() as Event
          }
        },
      }
    },

    listAgents: async () => [],
    listCommands: async () => [],
    listProviders: async () => ({ all: [], connected: [], default: {} }) as unknown as ProviderList,
  }

  return engine
}

export const phoneEngine = createPhoneEngine()
