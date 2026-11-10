import type { Agent, Client, Command, Event, MessageWithParts, Session } from "../lib/sdk"

// Both engines (remote opencode server, on-device phone mode) implement this.
// The stores own UI state; an Engine is pure I/O and never touches a store.
//
// Anything the UI can do to a session has to be expressible here, otherwise
// phone mode would need its own screen. That is why actions live next to the
// event stream: the fork's stores currently call the HTTP client directly.

export type EngineKind = "remote" | "phone"

// Derived from the client so the contract can't drift from the v1/v2 shapes
// the stores already consume.
export type PermissionRequest = Awaited<ReturnType<Client["permission"]["list"]>>[number]
export type QuestionRequest = Awaited<ReturnType<Client["question"]["list"]>>[number]
export type ProviderList = Awaited<ReturnType<Client["provider"]["list"]>>

export interface PromptInput {
  parts: Array<
    { type: "text"; text: string } | { type: "file"; mime: string; url: string; filename?: string }
  >
  model?: { providerID: string; modelID: string }
  agent?: string
  variant?: string
}

export interface ListSessionsOptions {
  roots?: boolean
  limit?: number
  search?: string
}

export interface GetMessagesOptions {
  limit?: number
}

export interface CreateSessionOptions {
  title?: string
  // Phone mode records which model and provider the chat uses; remote engines
  // ignore both.
  modelID?: string
  providerID?: string
}

export interface Engine {
  readonly kind: EngineKind

  listSessions(opts?: ListSessionsOptions): Promise<Session[]>
  getSession(sessionID: string): Promise<Session>
  createSession(opts?: CreateSessionOptions): Promise<Session>
  deleteSession(sessionID: string): Promise<void>

  getMessages(sessionID: string, opts?: GetMessagesOptions): Promise<MessageWithParts[]>
  prompt(sessionID: string, input: PromptInput): Promise<void>
  abort(sessionID: string): Promise<boolean>

  revert(sessionID: string, messageID: string): Promise<Session>
  unrevert(sessionID: string): Promise<Session>

  listPermissions(sessionID?: string): Promise<PermissionRequest[]>
  replyPermission(requestID: string, reply: "once" | "always" | "reject"): Promise<boolean>

  listQuestions(sessionID?: string): Promise<QuestionRequest[]>
  replyQuestion(requestID: string, answers: string[][]): Promise<boolean>
  rejectQuestion(requestID: string): Promise<boolean>

  events(signal?: AbortSignal): AsyncIterable<Event>

  listAgents(): Promise<Agent[]>
  listCommands(): Promise<Command[]>
  listProviders(): Promise<ProviderList>
}
