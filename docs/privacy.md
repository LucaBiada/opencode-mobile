# Devmote privacy policy (draft)

**Status:** draft, not published. Needs legal review and a public URL before the first store
submission. Until then `PRIVACY_POLICY_URL` in `src/lib/links.ts` points here.

Devmote is an unofficial client for the opencode coding agent. It is not affiliated with the opencode
project.

## What Devmote does not do

- It has no backend of its own and no user accounts. There is nothing to sign up for.
- It does not collect your code, prompts, model responses, files or repository contents.
- It does not sell or share data with advertisers.
- It does not run analytics or crash reporting unless you opt in.

## What stays on your device

- **Your conversations and workspaces** are stored in the app's private storage.
- **Credentials** — opencode server passwords, your OpenCode Go API key, and your GitHub token — are
  stored in the Android Keystore / iOS Keychain via `expo-secure-store`. They are never written to
  logs, crash reports or exports.
- **Settings** are stored locally.

## Data that leaves your device, and only when you configure it

- **Your opencode server.** Remote mode sends your prompts, attachments and tool approvals to the
  server address you enter. That server is yours; its operator is you.
- **Model providers.** Phone mode sends prompts and attachments directly to the provider whose API
  key you entered (for example OpenCode Go). Their terms apply.
- **GitHub.** If you add a token, the app calls the GitHub API on your behalf to clone, commit, push
  and read issues or pull requests.
- **Web pages.** When the agent fetches a URL, that URL and the page contents pass through the app.

## Optional telemetry, off by default

If you turn on telemetry in Settings:

- **Crash reports** are sent to Sentry and **usage events** to PostHog, under this project's own keys.
- Payloads are scrubbed: no prompts, file contents, URLs, tokens or personal identifiers.
- Turning telemetry off discards anything queued and never sent, and stops further collection.

Support reports, when configured, are sent to a support inbox only if you explicitly choose to send
one from the diagnostics screen.

## Children

Devmote is a developer tool and is not directed at children.

## Changes

Material changes to this policy will be published in the repository before they take effect.

## Contact

Open an issue at the project's repository.
