// Provider presets and helpers, free of React Native imports so they can be
// unit-tested. A provider is the whole description of where a phone chat goes.
export type ProviderFormat = "opencode-go" | "openai-chat" | "openai-responses" | "anthropic" | "google"

export interface Provider {
  id: string
  name: string
  baseURL: string
  modelsURL: string
  format: ProviderFormat
  requiresKey: boolean
  tools: boolean
  builtin: boolean
}

export function modelsURLFor(baseURL: string): string {
  return `${baseURL.replace(/\/+$/, "")}/models`
}

// `<host>` is a LAN address. On a phone, localhost is the phone itself, so the
// presets ship with a placeholder the user edits rather than something that
// silently fails.
export const PLACEHOLDER_HOST = "192.168.1.100"

export const PRESETS: Provider[] = [
  {
    id: "opencode-go",
    name: "OpenCode Go",
    baseURL: "https://opencode.ai/inference/go/openai/v1",
    modelsURL: "https://opencode.ai/inference/go/v1/models",
    format: "opencode-go",
    requiresKey: true,
    tools: true,
    builtin: true,
  },
  {
    id: "ollama",
    name: "Ollama",
    baseURL: `http://${PLACEHOLDER_HOST}:11434/v1`,
    modelsURL: `http://${PLACEHOLDER_HOST}:11434/v1/models`,
    format: "openai-chat",
    requiresKey: false,
    tools: true,
    builtin: true,
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    baseURL: `http://${PLACEHOLDER_HOST}:1234/v1`,
    modelsURL: `http://${PLACEHOLDER_HOST}:1234/v1/models`,
    format: "openai-chat",
    requiresKey: false,
    tools: true,
    builtin: true,
  },
  {
    id: "unsloth",
    name: "Unsloth Studio",
    baseURL: `http://${PLACEHOLDER_HOST}:8888/v1`,
    modelsURL: `http://${PLACEHOLDER_HOST}:8888/v1/models`,
    format: "openai-chat",
    // Studio serves an API key even for local use; see its "API & health" banner.
    requiresKey: true,
    tools: true,
    builtin: true,
  },
]

export const CUSTOM_PROVIDER: Provider = {
  id: "custom",
  name: "Custom (OpenAI-compatible)",
  baseURL: `http://${PLACEHOLDER_HOST}/v1`,
  modelsURL: `http://${PLACEHOLDER_HOST}/v1/models`,
  format: "openai-chat",
  requiresKey: false,
  tools: true,
  builtin: false,
}

export const DEFAULT_PROVIDER_ID = "opencode-go"

// A provider must be able to answer one question: is this usable right now?
export function providerProblem(provider: Provider): string | null {
  if (!/^https?:\/\//i.test(provider.baseURL)) return "Server URL must start with http:// or https://"
  if (provider.baseURL.includes("<host>")) return "Replace the host with your computer's LAN address"
  if (provider.baseURL.includes(PLACEHOLDER_HOST)) return "Replace the example host with your computer's LAN address"
  return null
}
