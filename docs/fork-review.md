# Fork review (Phase 0)

**Date:** 2026-11-10
**Base:** `dzianisv/opencode-mobile` @ `4a23a05` (v0.4.17)
**Fork:** `LucaBiada/opencode-mobile`
**Purpose:** answer the §4.3 checklist of `Ideas/opencode-phone-app/SPEC.md` before building on the fork.

## Verdict

The fork is a **better base than the spec assumed**, and the spec is slightly out of date about it. The
API layer is hand-written but already normalizes two opencode server generations into one internal
model, which was listed as a top-5 project risk (§14). The chat UI renders from that model through
Zustand stores, so a second engine can plausibly feed the same UI.

The two real costs are different from the ones the spec expected:

1. **Rebrand surface is large.** The fork is not a prototype: it is published on Google Play and
   F-Droid, has iOS CI, a marketing site and a docs site, telemetry, a waitlist backend and a demo
   mode. Renaming touches far more than `app.json` (full list below).
2. **The engine seam sits lower than "events".** The stores do not just consume events; they own the
   client, post prompts, abort, and resolve permissions directly against the connection. `Engine` has
   to abstract actions, not only event streams.

One spec correction: **there is no SQLite in the fork.** Phone-mode storage (§9) is new work, not an
extension of an existing pattern.

## §4.3 checklist

### 1. Where the API layer lives, and how it talks to the server

**Hand-written client. No `@opencode-ai/sdk`, no `@opencode/client`, no generated code.**

| File | Lines | Role |
|---|---|---|
| `src/lib/sdk.ts` | 723 | Public surface: `createClient`, `ApiError`, and the internal types (`Session`, `Message`, `Part`, `Event`, `MessageWithParts`, `Client`). Delegates to a version-specific client. |
| `src/lib/sdk-v1.ts` | 490 | opencode server **v1 (≤ 1.18.x)**: different route prefix, list envelopes, SSE payload names, question/permission endpoints. Uses `expo/fetch` + a local `SSEParser`. |
| `src/lib/v2-shape.ts` | 742 | Pure conversion layer from **v2** payloads to the same internal v1-style shapes. Unit-tested (`v2-shape.test.ts`, 333 lines). |
| `src/lib/api-detect.ts` | – | Probes a connection to choose v1 vs v2. Has its own tests. |

The comment in `sdk-v1.ts` states the design intent plainly: the two APIs differ enough that mixing
them in one request path causes silent failures, so each has its own module and the stores only see
the normalized shape.

**Implication:** §6.2 (version compatibility) is already implemented better than specified. Keep this
layer; do not replace it with the official SDK during the fork. Do pin the supported v1/v2 range and
add a test fixture when the server shape changes again.

**Loose end:** `v2-shape.ts` points at `docs/v2-api-map.md` as its reference, but that file is not in
the repo. Either restore it or drop the reference.

### 2. Is the chat UI fed by a typed model, or tied to network responses?

**Typed model, but the stores are network-coupled.**

- `app/session/[id].tsx` (1,040 lines) imports `useSessions`, `useEvents`, `useConnections`,
  `useCatalog` — it renders store state, never a fetch response.
- `src/stores/sessions.ts` holds `messages: Message[]` and `parts: Record<messageId, Part[]>` and gets
  them from `parseMessages(MessageWithParts[])`. Parts are typed in `sdk.ts`.
- Unknown part types would need a fallback card; check `MessageBubble`/part renderers for a default
  branch when adding phone-mode parts.

**The catch:** the same store reaches for the client directly —
`clientFor(directory)` → `useConnections.client`, `client.session.list(...)`,
`sendMessage` posting to the server, `abortSession`, revert/unrevert. `src/stores/events.ts` (521
lines) owns the SSE subscription and dispatches into the other stores.

So the `Engine` interface in §5.1 is the right shape, but the cut line is **store actions**, not the
SSE listener. Concretely: sessions and events need a `getEngine()`-style indirection for list, create,
delete, prompt, abort, permission reply, revert, and model/agent catalog. Budget this as a real
refactor of `sessions.ts` + `events.ts` + `connections.ts`, not a thin adapter.

### 3. State management

- **Zustand** — `auth`, `catalog`, `connections`, `events`, `sessions`, `settings`.
- `@tanstack/react-query` is a dependency but the app's data flow is store + SSE.
- Persistence: `@react-native-async-storage/async-storage`; secrets in `expo-secure-store`.
- No SQLite, no ORM, no migrations. §9 is greenfield.

### 4. Test coverage and CI health

- **41** colocated `node --test` files under `src/**` (pure logic: shape conversion, auth headers,
  merge, policies, noise filters, waitlist). `tests/mock-opencode-server.ts` for server fixtures.
- **7** Maestro flows in `.maestro/flows/` (activation, sessions, demo, diff, directory picker,
  variant picker).
- **13** GitHub workflows: build, iOS CI, CUA smoke, Play rollout/publish, F-Droid publish, App Store
  publish, security scan, Sentry noise gate, triage, release uptake, product intelligence.
- No component/unit tests for React components. The end-to-end safety net is
  `scripts/android-cua-smoke.py`, a vision-LLM loop over ADB, and `AGENTS.md` makes it a **merge
  gate**.

**Caveat for this workstation:** the emulator and build instructions in `AGENTS.md` assume macOS and
an external disk. This machine has its own working setup, documented in
[`dev-setup-windows.md`](dev-setup-windows.md).

### Build verification (Windows, 2026-11-10)

| Step | Result |
|---|---|
| `npm ci` | 793 packages in 18 s. Exit code 1 only because npm 11 defers `@sentry/cli`'s postinstall until approved (`npm install-scripts approve @sentry/cli`); irrelevant to JS work. |
| `npx tsc --noEmit` | Clean. |
| `npm test` | 380/380 pass (after the script fix below). |
| `npx expo config --type public` | Resolves. |
| `npx expo-doctor` | 14/18 checks pass; 4 findings below. |
| Android compile | `.\gradlew.bat assembleDebug` → BUILD SUCCESSFUL (2m44s warm, 6m36s cold), 180.6 MB debug APK. The first attempt failed on a missing `android/app/debug.keystore` (gitignored by design); generated one with `keytool`. |
| Emulator + install | AVD `devmote` (API 35, x86_64, WHPX) boots in ~31 s; the APK installs and launches. Debug JS needs Metro plus `adb reverse tcp:8081 tcp:8081`. The edited connection screen renders correctly (waitlist card gone, layout intact). |

**Fixed on the fork:** `npm test` ran 0 tests on Windows. The script quoted its glob patterns, which
POSIX shells strip but cmd and PowerShell pass through literally, so `node --test` matched nothing.
Changed to `node --test`, which discovers `src/`, `scripts/` and `plugins/` itself — same 380 tests,
cross-platform.

**expo-doctor findings** (upstream issues, not caused by this review):

1. `app.json` schema error: `android.usesCleartextTraffic` is not a valid Expo field, so it is
   silently ignored. Cleartext has to live in the committed `android/` manifest or a config plugin.
2. Missing direct peer dependencies: `expo-font` (for `@expo/vector-icons`) and `expo-constants`
   (for `expo-router`). Doctor warns a standalone build may crash without them.
3. Committed `android/` and `ios/` folders alongside prebuild-time `app.json` fields (icon, splash,
   scheme, orientation, plugins): EAS Build will not sync those fields, so `app.json` and the native
   projects can drift. CI appears to run prebuild; confirm before rebranding.
4. Version drift: `@sentry/react-native` 6.22.0 against SDK 54's expected ~7.2.0 (major), plus
   minor/patch drift on `expo`, `expo-router`, `expo-image-picker`,
   `expo-local-authentication` and `react-native-svg`.

### 5. Which server versions are supported, and how API changes are handled

- v1: up to `1.18.x` (what `npm install -g opencode-ai` shipped at the time).
- v2: current, via `api-detect` + `v2-shape`.
- Detection happens per connection; the UI shows a compatibility surface rather than hard-failing.
- Types are hand-maintained. There is no contract test against a live server beyond the CUA flows and
  the shape tests.

This is the strongest part of the fork for our purposes.

### 6. Upstream-specific code that has to go

**Branding and identity**

- `app.json`: `name` "OpenCode", `slug` `opencode-mobile`, `scheme` `opencode`, Android
  `package` / iOS `bundleIdentifier` `cc.agentlabs.opencode`, `versionCode` 44, icon, adaptive icon,
  splash, all permission strings.
- `android/` and `ios/` native projects, `fastlane/`, `fdroid/`, `distribution/` assets, `docs-site/`,
  `website/`, `docs/playstore.md`, `docs/privacy/`, `assets/`.
- `README.md`, `CONTRIBUTING.md`, deep links and the `opencode://` scheme in links/QR pairing.

**Third-party projects and endpoints**

| Thing | Where | Action |
|---|---|---|
| Sentry org/project `vibetechnologies/opencode-mobile` | `app.json` plugin, `src/lib/sentry*.ts` | New project + DSN, or disable |
| PostHog key + EU host | `src/lib/analytics.ts` | Remove or re-own; consent logic is reusable |
| Waitlist → `opencode.agentlabs.cc/api/beta-signup` | `src/lib/waitlist.ts` | Remove (no backend in v1) |
| Support `support@agentlabs.cc` | waitlist fallback, settings | Replace |
| Update check → GitHub releases of `dzianisv/opencode-mobile` | update-check policy | Repoint to our repo |
| Docs/privacy links `dzianisv.github.io/opencode-mobile/...` | settings, README | Replace or drop |
| Sentry noise gate, release uptake, product-intelligence workflows | `.github/workflows` | Delete or re-own |

**Product surfaces that are optional for our v1**

Offline demo mode (`app/demo.tsx`), speech recognition, store-review prompt, notifications, i18n
(i18next, en + others), update checker, diagnostics, biometric gate. None of these hurt, but each is
surface area to keep building.

### 7. License

MIT. Keep the upstream LICENSE/copyright (VIBE TECHNOLOGIES, LLC), add ours. The About screen and
README must credit the fork (§12.1).

## What this changes in SPEC.md

1. **§4.1 is stale.** "Already has" understates it; "Phase 0 checklist" is now answered here. Add a
   link to this document and delete the checklist or mark it done.
2. **§4.2 fork vs. contribute:** fork is clearly right. The dual v1/v2 API layer is a local
   advantage worth carrying in our own repo. Small generic fixes can still go upstream.
3. **§5.1/§5.2 engine seam:** move the emphasis from `subscribe()` to store actions. The event model
   is already close to what we need; the actions are where the work is.
4. **§6.2 version compatibility:** implemented; downgrade from a Phase 5 task to "keep it working".
5. **§9 storage:** SQLite is new. No existing migration system to follow.
6. **§11 privacy:** the fork already has consent-gated Sentry + PostHog with a well-documented
   revocation path (`analytics.ts`). Decide whether to keep the mechanism with our keys or strip it.
   There is also a waitlist network call that must go, since v1 has no backend.
7. **§12 distribution:** the fork has working Play (internal track), F-Droid and iOS CI. Reuse the
   pipelines, replace the identities.
8. **§13 Phase 0:** re-scope from "audit" to "rebrand + engine seam + build on Windows". The audit
   is this document.

## Engine seam (landed)

`src/engines/` now holds the contract and the remote adapter:

- `types.ts` — `Engine` with sessions, messages, prompt/abort, revert, permissions, questions, the event
  stream, and the catalog (`listAgents`, `listCommands`, `listProviders`). Permission/question/provider
  types are derived from `Client` (`Awaited<ReturnType<...>>`) so they cannot drift from the v1/v2 shapes.
- `remote.ts` — `createRemoteEngine(client)`, a deliberately 1:1 adapter. No behaviour change.
- `index.ts` — `engineFor(directory?)` and `directorylessEngine()`, mirroring the old
  `clientForDirectory` scoping including its fallback to the active connection.
- `remote.test.ts` — four tests asserting every method forwards its arguments unchanged and returns the
  client's value untouched.

`stores/sessions.ts`, `stores/events.ts` (event stream, busy resync) and `stores/catalog.ts` now go
through the engine. What deliberately still talks to `Client` directly:

- `stores/connections.ts` — it *is* the remote transport factory; a phone engine will sit beside it.
- `events.ts` `refreshPending` / `refreshAllPending` — permission reconciliation across several
  directory-scoped clients, which is remote-specific. Phone mode has one workspace per session, so it
  needs a different shape; resolve when the phone engine lands.
- Screens that call `refreshPending(client, sessionID)` directly.

Typecheck clean, 385/385 tests pass. Nothing here has been exercised on a device yet.

## Suggested order of work

1. **Name and package ID** — blocks every rebrand step.
2. ~~**Verify the build**~~ — done: TypeScript, unit tests, native debug build, emulator install and
   launch (see the build table above).
3. ~~**Engine seam PR**~~ — landed; next is the phone engine behind the same interface.
4. **Rebrand PR** — identity, endpoints, workflows, Sentry/PostHog decision.
5. **Spikes** — AI SDK streaming over `expo/fetch` against OpenCode Go; `isomorphic-git` vs. GitHub
   REST commits.
