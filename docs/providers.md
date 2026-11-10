# Providers

The app is no longer "an OpenCode Go client with an opencode remote mode". It is an AI coding agent on
the phone with pluggable backends:

| Connection type | Backend | Tools run on |
|---|---|---|
| Remote | an opencode server (PC) | the PC |
| Phone → cloud | OpenCode Go, OpenAI, Anthropic, Gemini, OpenRouter, any compatible API | the phone |
| Phone → local | Ollama, LM Studio, Unsloth, llama.cpp, vLLM on the LAN | the phone |

Remote mode is unchanged. This document covers the phone side.

## Why this is cheap

The phone engine already speaks OpenAI-compatible chat completions with a configurable base URL and
optional bearer key. Everything provider-specific is confined to three places: endpoint constants, the
Go request-format table, and the single Keystore key. The agent loop, tools, workspace, approvals,
SQLite and UI never see the provider.

## Data model

A provider is a record:

```ts
type ProviderFormat = "opencode-go" | "openai-chat" | "openai-responses" | "anthropic" | "google"

interface Provider {
  id: string                 // stable, used in Keystore key names
  name: string
  baseURL: string            // e.g. http://192.168.1.9:11434/v1
  modelsURL: string          // full URL, because Go and OpenAI-compatible differ
  format: ProviderFormat
  requiresKey: boolean
  tools: boolean             // false = chat-only; the loop is not given tools
  builtin: boolean
}
```

- **Non-secret fields live in SQLite** (`phone_providers`).
- **Keys live in the Keystore**, one per provider: `devmote_provider_key_<id>`. The persisted-keys
  tripwire is updated alongside, as with the existing per-connection password prefix.
- A session stores `provider_id` and `model_id`; the engine resolves the model at prompt time, so
  switching providers is a session setting, not a code path.

### Presets

| Preset | baseURL | modelsURL | Key | Tools |
|---|---|---|---|---|
| OpenCode Go | `https://opencode.ai/inference/go/openai/v1` | `https://opencode.ai/inference/go/v1/models` | required | yes |
| Ollama | `http://<host>:11434/v1` | `<base>/models` | none | yes |
| LM Studio | `http://<host>:1234/v1` | `<base>/models` | none | yes |
| Unsloth Studio | `http://<host>:8888/v1` | `<base>/models` | none | yes |
| Custom | user-entered | `<base>/models` | optional | toggle |

`<host>` is a LAN address: on a phone, `localhost` means the phone itself. The app should say that
plainly when a preset is added, and remote-mode connection guidance already covers the networking.

## Format routing

- `opencode-go` keeps the model→format table from `provider-format.ts` (chat / responses / anthropic /
  google), because Go serves several shapes under one key.
- `openai-chat` → `@ai-sdk/openai-compatible`
- `openai-responses` → `@ai-sdk/openai`
- `anthropic` → `@ai-sdk/anthropic`
- `google` → `@ai-sdk/google`

Every adapter gets the same `User-Agent` and, where the provider accepts it, an
`x-opencode-session`-equivalent stable session id. Only Go documents that header; sending it elsewhere
is harmless but not required.

## Capabilities

Transport compatibility is not the same as agent compatibility. Local models range from excellent tool
callers to ones that emit malformed calls or ignore tools entirely, and context windows start at 8k.

First version:

- `tools: boolean` per provider, defaulting to true. When false, the engine passes no tools and the
  system prompt says the model can only chat. This is the honest fallback instead of a 25-step loop
  that fails mid-way.
- No per-model capability matrix yet. The model list is shown as-is; context size and vision are a
  later increment once the list endpoints actually report them consistently.

## Migration steps

1. `phone_providers` table + provider CRUD + per-provider Keystore keys.
2. `phone_sessions.provider_id` (default `opencode-go` so existing chats keep working).
3. `provider.ts` takes a `Provider` instead of Go constants; `opencode-go` keeps its routing table.
4. Phone settings screen: provider picker, add/edit/delete, test connection, model list per provider.
5. Engine: resolve provider + model per session; skip tools when the provider disables them.
6. Then, and only then, per-model capability badges and extra cloud presets.

## Risks

- **Bad tool callers make a bad agent.** The UI must make "chat only" a first-class choice, not a
  failure state.
- **Local HTTP has no TLS.** Already allowed for private ranges; warn outside the LAN, as remote mode
  does.
- **Terms of service.** Each third-party API has its own rules for third-party clients; Go's are
  already flagged in the spec.
- **Product framing.** SPEC.md §1–2 describes an opencode client. It becomes "an AI coding agent on
  your phone, with opencode as one backend". The opencode disclaimer stays, but stops being the whole
  identity.
