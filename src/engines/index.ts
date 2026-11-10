import { useConnections } from "../stores/connections"
import { createRemoteEngine } from "./remote"
import type { Engine } from "./types"

export type {
  CreateSessionOptions,
  Engine,
  EngineKind,
  GetMessagesOptions,
  ListSessionsOptions,
  PermissionRequest,
  PromptInput,
  ProviderList,
  QuestionRequest,
} from "./types"

// Engine for one session's project. `directory` scopes the client the same
// way clientForDirectory does; omit it for the active connection's project.
export function engineFor(directory?: string): Engine | null {
  const connections = useConnections.getState()
  const client = directory ? connections.clientForDirectory(directory) ?? connections.client : connections.client
  return client ? createRemoteEngine(client) : null
}

// Directory-less client, used to list sessions across every project.
export function directorylessEngine(): Engine | null {
  const connections = useConnections.getState()
  const client = connections.clientForDirectory(undefined) ?? connections.client
  return client ? createRemoteEngine(client) : null
}
