import type { Client } from "../lib/sdk"
import type { Engine } from "./types"

// Adapter over the existing HTTP/SSE client. Deliberately 1:1: this layer is
// introduced before phone mode so the stores stop depending on `Client`
// directly, and must not change remote behaviour.
export function createRemoteEngine(client: Client): Engine {
  return {
    kind: "remote",

    listSessions: (opts) => client.session.list(opts),
    getSession: (sessionID) => client.session.get(sessionID),
    createSession: (opts) => client.session.create(opts),
    deleteSession: (sessionID) => client.session.delete(sessionID),

    getMessages: (sessionID, opts) => client.session.messages(sessionID, opts),
    prompt: (sessionID, input) => client.session.prompt(sessionID, input),
    abort: (sessionID) => client.session.abort(sessionID),

    revert: (sessionID, messageID) => client.session.revert(sessionID, messageID),
    unrevert: (sessionID) => client.session.unrevert(sessionID),

    listPermissions: (sessionID) => client.permission.list(sessionID),
    replyPermission: (requestID, reply) => client.permission.reply(requestID, reply),

    listQuestions: (sessionID) => client.question.list(sessionID),
    replyQuestion: (requestID, answers) => client.question.reply(requestID, answers),
    rejectQuestion: (requestID) => client.question.reject(requestID),

    events: (signal) => client.global.events(signal),

    listAgents: () => client.agent.list(),
    listCommands: () => client.command.list(),
    listProviders: () => client.provider.list(),
  }
}
