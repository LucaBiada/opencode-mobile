# Phone mode

Chat with an OpenCode Go model entirely on the device: no computer, no server, no tunnel. The agent
can read, search and edit files inside a per-session workspace, with approvals for mutations.

## What exists

| Piece | Path | Notes |
|---|---|---|
| Go API key | `src/lib/phone/key.ts` | Keystore (`expo-secure-store`), registered in `persisted-keys.test.ts` |
| Model list | `src/lib/phone/models.ts` | `GET /inference/go/v1/models`, cached 24 h in AsyncStorage |
| Envelope parsing | `src/lib/phone/models-parse.ts` | Handles `{data}`, bare array and `{models}`; unit-tested |
| Provider routing | `src/lib/phone/provider-format.ts` | Model → request format table; unit-tested |
| Providers | `src/lib/phone/provider.ts` | Chat-completions, Responses, Anthropic and Google adapters over `expo/fetch` |
| Sandbox rules | `src/lib/phone/sandbox.ts` | Path normalization, escape rejection, glob matching; unit-tested |
| Workspace | `src/engines/phone/workspace.ts` | `expo-file-system` under `Paths.document/workspaces/<session>` |
| Tools | `src/engines/phone/tools.ts` | `read`, `list`, `glob`, `grep`, `write`, `edit`, `todowrite`, `todoread` |
| Storage | `src/engines/phone/store.ts` | SQLite (`devmote.db`): sessions, messages, parts |
| Engine | `src/engines/phone/engine.ts` | `Engine` implementation: streaming, tool loop, approvals, abort |
| UI | `app/phone/index.tsx`, `app/phone/[id].tsx` | Setup + chat, approval card above the composer |
| Session list | `app/(tabs)/index.tsx` | Phone sessions merged in, phone badge, phone-aware routing and delete |

## Contract details the original spec got wrong

- Base URLs are **per API**, not one `zen/go/v1` prefix:
  - chat: `https://opencode.ai/inference/go/openai/v1`
  - responses: same host, `/openai/v1`
  - anthropic: `/anthropic/v1`
  - google: `/google/v1beta`
  - model list: `https://opencode.ai/inference/go/v1/models`
- Go asks clients to send a real `User-Agent` and a stable `x-opencode-session` per conversation.
  Both are set on every adapter.
- Most models are chat-completions. `claude-haiku-5-5`, `qwen3.8-*`, `qwen3.7-plus` and `minimax-m3`
  use the Anthropic shape; `grok-4.7`, `gpt-*-luna` and `muse-spark-*` use the Responses shape;
  `gemini-4-argon` uses Google. The table lives in `provider-format.ts`.

## Tools and approvals

- Every path a model supplies is normalized and **rejected** if it is absolute, has a drive letter,
  starts with `~`, or contains `..`. No clamping — a model asking to leave the sandbox is either a bug
  or an injection attempt.
- `read`, `list`, `glob`, `grep` and the todo tools run without approval.
- `write` and `edit` call the engine's approval gate first. The gate emits `permission.asked`, the chat
  shows a card with a preview, and the user chooses **Allow once**, **Always** (session-scoped) or
  **Reject**. Rejecting rejects the tool promise, so the model receives an error result and can adapt.
- Outputs are clipped at 50 KB; `read` is capped at 2000 lines.
- `walk`/`grep` cap their traversal (2000–4000 entries, 500 files) so a phone never tries to enumerate
  a huge tree in one call.

## Storage rules

Phone sessions never touch the remote-mode tables or AsyncStorage. The tripwire test
(`persisted-keys.test.ts`) forced one deliberate decision: the Go key is a credential, so it goes to
the Keystore and is named in the reviewed-keys list. Message text lives in SQLite only.

## Deliberate shortcuts

- **`Session.version` carries the model id.** The shared `Session` shape has no model field, and phone
  sessions have no use for a server version string.
- **Todos are in memory**, not SQLite. They reset when the app restarts.
- **One workspace per session**, created on first use. Import/clone workspaces are not built yet.
- **No rename for phone sessions**; the list hides the rename action for them.
- **Approvals are per session and in memory**: "Always" does not survive a restart.
- **Provider routing is a static table.** If Go adds a model on a different format, it falls back to
  chat-completions and would 404 until the table is updated.

## Not built yet

1. Imported/cloned workspaces (`isomorphic-git`, GitHub REST), git tools.
2. Model capabilities in the picker (tool support, image input, context size).
3. Compaction when the conversation approaches the context limit.
4. Share-sheet input, attachments from the camera/gallery.
5. Foreground service so a run survives the app being backgrounded.
