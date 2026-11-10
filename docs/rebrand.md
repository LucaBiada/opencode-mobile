# Rebrand: opencode-mobile fork → Devmote

Identity values this document applies:

| Field | Value |
|---|---|
| Display name | `Devmote` |
| Slug | `devmote` |
| URL scheme | `devmote://` |
| Android package | `dev.devmote.app` |
| iOS bundle ID | `dev.devmote.app` |
| Repo | `LucaBiada/devmote` (rename from `opencode-mobile`) |
| Play title | `Devmote — opencode client` |
| Disclaimer | *Unofficial; not affiliated with the opencode project.* |

**Do not change `app.json` alone.** The repo commits `android/` and `ios/` folders, and `expo-doctor`
already flags that app.json fields are not synced into them. A half-applied rename ships an app whose
launcher name, deep-link scheme and package ID disagree. Rebrand natively in one pass (step 2), then
build.

## 1. Identity

- [ ] `app.json`: `name`, `slug`, `scheme`, `android.package`, `ios.bundleIdentifier`, and the
      `opencode://` deep links that appear in screens/links.
- [ ] Reset versioning for a new listing: `version` `0.5.0`, Android `versionCode` `1` (Play rejects a
      new listing that reuses a code from another track).
- [ ] New icon, adaptive icon, splash, notification icon (the current assets carry opencode's mark).
- [ ] All permission strings in `app.json` mention "OpenCode" — rewrite them for Devmote.
- [ ] `package.json` name: `@opencode-ai/mobile` → `@devmote/mobile` (unpublished, safe).

## 2. Native pass

- [ ] After step 1, run `npx expo prebuild --clean` to regenerate `android/` and `ios/` from config,
      then verify the custom `plugins/withKeyboardInsets` config plugin still applies.
- [ ] If prebuild is not viable, hand-edit: `android/app/build.gradle` (`namespace`,
      `applicationId`), `MainActivity` package path, `strings.xml` `app_name`, `AndroidManifest.xml`
      intent filters + cleartext policy; iOS `project.pbxproj`, `Info.plist` `CFBundleDisplayName`,
      `CFBundleURLSchemes`, permission strings.
- [ ] Fix the two expo-doctor config issues while in here: drop the invalid
      `android.usesCleartextTraffic` (put it in the manifest) and add `expo-font` + `expo-constants`.
- [ ] New signing keystore for the new package ID; never reuse upstream's. Enable Play App Signing.
- [ ] Build and run before touching anything else.

## 3. Endpoints and telemetry that point at upstream

- [ ] `src/lib/waitlist.ts` → delete the whole feature. It posts to
      `opencode.agentlabs.cc/api/beta-signup` and SPEC.md v1 has no backend.
- [ ] Sentry: `app.json` plugin org/project `vibetechnologies/opencode-mobile` and
      `src/lib/sentry*.ts` → own project, or disable crash reporting for v1.
- [ ] PostHog: `src/lib/analytics.ts` (`EXPO_PUBLIC_POSTHOG_KEY`, EU host) → own project or strip.
      Keep the consent/revocation mechanism; it is good.
- [ ] Support address `support@agentlabs.cc` (waitlist fallback, settings) → ours.
- [ ] Update check → GitHub releases of `dzianisv/opencode-mobile` → our repo, or disable.
- [ ] Docs/privacy links → `dzianisv.github.io/opencode-mobile/...` → ours or drop.

## 4. CI, stores, distribution

- [ ] `.github/workflows`: keep `build`, `ios-ci`, `security-scan`; delete or re-own
      `publish-play-store`, `play-rollout`, `publish-fdroid`, `publish-app-store`, `cua-smoke`,
      `sentry-noise-gate-report`, `release-uptake-series`, `product-intelligence`, `triage-reviews`,
      `activation-e2e`. Several embed upstream secrets and release names.
- [ ] `fastlane/`, `fdroid/`, `distribution/`, `docs/playstore.md`, `docs/privacy/`, `website/`,
      `docs-site/` — rewrite or remove.
- [ ] New Play Console app, new service account, new F-Droid repo (or drop F-Droid until Sentry is
      optional).
- [ ] Privacy policy URL and store listing copy, both carrying the disclaimer.

## 5. Docs and legal

- [ ] `README.md`: name, screenshots, install links, disclaimer. Keep nothing that sends users to the
      upstream APK.
- [ ] About screen: "Devmote — Unofficial; not affiliated with the opencode project", plus the MIT
      notice for VIBE TECHNOLOGIES, LLC and our own copyright.
- [ ] Keep `LICENSE`; add a `NOTICE` with the fork lineage and the upstream commit.

## 6. Verify

- [ ] `npx expo-doctor` — config schema and peers clean.
- [ ] `npx tsc --noEmit` and `npm test` — the 385 tests still pass.
- [ ] `npx expo run:android` on a real device or emulator: launcher name, deep link, chat streaming,
      diff, permissions.
- [ ] `grep -ri "agentlabs\|dzianisv\|vibetechnologies\|opencode-mobile"` returns only intentional
      attribution and the opencode protocol mentions.

## Suggested split

1. **Identity + native + build** (steps 1–2, 6 partly) — one PR, verified on a device.
2. **Strip upstream endpoints** (step 3) — independent, can land before or after.
3. **CI and stores** (step 4) — last, because it needs the new Play/F-Droid accounts.
4. **Docs and legal** (step 5) — can land with 1.
