# Phone mode (first slice)

Chat with an OpenCode Go model entirely on the device. No computer, no server, no tunnel. This is
the first increment: **chat only** — no tools, no workspace, no shell.

## What exists

| Piece | Path | Notes |
|---|---|---|
| Go API key | `src/lib/phone/key.ts` | Keystore (`expo-secure-store`), registered in `persisted-keys.test.ts` |
| Model list | `src/lib/phone/models.ts` | `GET /inference/go/v1/models`, cached 24 h in AsyncStorage |
| Pure parsing | `src/lib/phone/models-parse.ts` | Handles `{data}`, bare array and `{models}` envelopes; unit-tested |
| Provider | `src/lib/phone/provider.ts` | `@ai-sdk/openai-compatible` + `expo/fetch` (streaming on RN) |
| Storage | `src/engines/phone/store.ts` | SQLite (`devmote.db`), tables `phone_sessions`, `phone_messages`, `phone_parts` |
| Engine | `src/engines/phone/engine.ts` | Implements `Engine`; streams via AI SDK `streamText` |
| UI | `app/phone/index.tsx`, `app/phone/[id].tsx` | Key, model, session list, chat; reachable from Settings → Phone mode |

## Contract details that the original spec got wrong

- Base URLs are **per API**, not one `zen/go/v1` prefix. Chat uses
  `https://opencode.ai/inference/go/openai/v1`; the model list is `https://opencode.ai/inference/go/v1/models`.
- Go asks clients to identify themselves (`User-Agent: devmote/0.5.0`) and to send a stable
  `x-opencode-session` header per conversation for routing and prompt caching. Both are set in
  `provider.ts`.
- Most models are OpenAI-compatible; a few need the Responses, Anthropic or Google adapters. Only the
  OpenAI-compatible adapter is wired up today.

## Storage rules

Phone sessions never touch the remote-mode tables or AsyncStorage. The tripwire test
(`persisted-keys.test.ts`) forced one deliberate decision: the Go key is a credential, so it goes to
the Keystore and is named in the reviewed-keys list. Message text lives in SQLite only, never in a
key-value store.

## Deliberate shortcuts

- **`Session.version` carries the model id.** The shared `Session` shape has no model field, and
  phone sessions have no use for a server version string. Documented at the mapping site; revisit if
  the UI needs both.
- **No agent loop yet.** `MAX_STEPS = 1`; the system prompt states there is no shell or file access.
- **One assistant message per prompt**, with `text` and optional `reasoning` parts. Tool parts,
  step parts and diffs come with the tool work.
- **Events are emitted as full part snapshots**, so the screen replaces rather than merges deltas. Simpler
  than the remote stream, and enough for text streaming.

## Next increments

1. Enter a key on the device and prove streaming end to end.
2. Anthropic/OpenAI-Responses adapters for the models that need them.
3. Tools: `read`/`write`/`edit`/`glob`/`grep` over a workspace, with the approval UI.
4. Merge phone sessions into the main session list with a mode badge.
