import assert from "node:assert/strict"
import { test } from "node:test"

import type { Client, Event } from "../lib/sdk"
import { createRemoteEngine } from "./remote.ts"

type Call = { method: string; args: unknown[] }

// Records every call and answers with a method-specific sentinel, so a test
// can assert both the forwarding and that the return value is untouched.
function fakeClient(calls: Call[] = []) {
  const answer = (method: string) => (value: unknown) => async (...args: unknown[]) => {
    calls.push({ method, args })
    return value
  }
  const session = {
    list: answer("session.list")([{ id: "ses_1" }]),
    get: answer("session.get")({ id: "ses_1" }),
    create: answer("session.create")({ id: "ses_new" }),
    delete: answer("session.delete")(undefined),
    messages: answer("session.messages")([{ info: { id: "msg_1" }, parts: [] }]),
    prompt: answer("session.prompt")(undefined),
    abort: answer("session.abort")(true),
    revert: answer("session.revert")({ id: "ses_1", revert: { messageID: "msg_1" } }),
    unrevert: answer("session.unrevert")({ id: "ses_1" }),
  }
  const permission = {
    list: answer("permission.list")([{ id: "per_1", sessionID: "ses_1" }]),
    reply: answer("permission.reply")(true),
  }
  const question = {
    list: answer("question.list")([{ id: "q_1", sessionID: "ses_1" }]),
    reply: answer("question.reply")(true),
    reject: answer("question.reject")(true),
  }
  const global = {
    events: async function* (signal?: AbortSignal): AsyncIterable<Event> {
      calls.push({ method: "global.events", args: [signal] })
      yield { type: "session.idle", properties: {} } as Event
    },
  }
  const agent = { list: answer("agent.list")([{ name: "build" }]) }
  const command = { list: answer("command.list")([{ name: "review" }]) }
  const provider = { list: answer("provider.list")({ all: [], connected: [], default: {} }) }
  return {
    client: { session, permission, question, global, agent, command, provider } as unknown as Client,
    calls,
  }
}

test("remote engine forwards every session call and its arguments unchanged", async () => {
  const { client, calls } = fakeClient()
  const engine = createRemoteEngine(client)

  assert.equal(engine.kind, "remote")

  await engine.listSessions({ roots: true, limit: 50 })
  await engine.getSession("ses_1")
  await engine.createSession({ title: "hello" })
  await engine.deleteSession("ses_1")
  await engine.getMessages("ses_1", { limit: 20 })
  await engine.prompt("ses_1", { parts: [{ type: "text", text: "hi" }], agent: "build" })
  await engine.abort("ses_1")
  await engine.revert("ses_1", "msg_1")
  await engine.unrevert("ses_1")

  assert.deepEqual(calls, [
    { method: "session.list", args: [{ roots: true, limit: 50 }] },
    { method: "session.get", args: ["ses_1"] },
    { method: "session.create", args: [{ title: "hello" }] },
    { method: "session.delete", args: ["ses_1"] },
    { method: "session.messages", args: ["ses_1", { limit: 20 }] },
    { method: "session.prompt", args: ["ses_1", { parts: [{ type: "text", text: "hi" }], agent: "build" }] },
    { method: "session.abort", args: ["ses_1"] },
    { method: "session.revert", args: ["ses_1", "msg_1"] },
    { method: "session.unrevert", args: ["ses_1"] },
  ])
})

test("remote engine returns the client's values untouched", async () => {
  const { client } = fakeClient()
  const engine = createRemoteEngine(client)

  assert.deepEqual(await engine.getSession("ses_1"), { id: "ses_1" })
  assert.equal(await engine.abort("ses_1"), true)
  assert.deepEqual(await engine.getMessages("ses_1"), [{ info: { id: "msg_1" }, parts: [] }])
})

test("remote engine forwards permission and question handling", async () => {
  const { client, calls } = fakeClient()
  const engine = createRemoteEngine(client)

  await engine.listPermissions("ses_1")
  await engine.replyPermission("per_1", "always")
  await engine.listQuestions("ses_1")
  await engine.replyQuestion("q_1", [["yes"]])
  await engine.rejectQuestion("q_1")

  assert.deepEqual(calls, [
    { method: "permission.list", args: ["ses_1"] },
    { method: "permission.reply", args: ["per_1", "always"] },
    { method: "question.list", args: ["ses_1"] },
    { method: "question.reply", args: ["q_1", [["yes"]]] },
    { method: "question.reject", args: ["q_1"] },
  ])
})

test("remote engine forwards the catalog calls phone mode has to synthesize", async () => {
  const { client, calls } = fakeClient()
  const engine = createRemoteEngine(client)

  await engine.listAgents()
  await engine.listCommands()
  await engine.listProviders()

  assert.deepEqual(calls, [
    { method: "agent.list", args: [] },
    { method: "command.list", args: [] },
    { method: "provider.list", args: [] },
  ])
})

test("remote engine passes the abort signal through to the event stream", async () => {
  const { client, calls } = fakeClient()
  const engine = createRemoteEngine(client)
  const controller = new AbortController()

  const received: Event[] = []
  for await (const event of engine.events(controller.signal)) received.push(event)

  assert.deepEqual(calls, [{ method: "global.events", args: [controller.signal] }])
  assert.deepEqual(
    received.map((e) => e.type),
    ["session.idle"],
  )
})
