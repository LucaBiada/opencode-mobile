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

- [x] `app.json`: `name` Devmote, `slug` `devmote`, `scheme` `devmote`, Android package and iOS bundle
      ID `dev.devmote.app`, and all permission strings rewritten.
- [x] Reset versioning for a new listing: `0.5.0`, Android `versionCode` `1`, with matching
      `distribution/changelogs/1.txt` and `fastlane/.../changelogs/1.txt` so `check:versions` passes.
- [ ] New icon, adaptive icon, splash, notification icon (the current assets carry opencode's mark).
- [x] All permission strings mention "OpenCode" → rewritten for Devmote.
- [x] `package.json` name: `@opencode-ai/mobile` → `@devmote/mobile` (unpublished, safe).

## 2. Native pass

- [x] Regenerated `android/` with `npx expo prebuild --platform android --clean --no-install`. The
      package, scheme, app name and MainActivity path all moved to `dev.devmote.app` / `devmote`.
- [x] Restored the hand-edited native config that `prebuild --clean` silently deleted (see below).
- [ ] `ios/`: not regenerated — `expo prebuild` for iOS on Windows can't be verified. Do it on a Mac
      with `npx expo prebuild --platform ios --clean`, or hand-edit the bundle ID and URL scheme.
- [x] Fixed the `android.usesCleartextTraffic` schema error by deleting it from `app.json` and keeping
      the setting in `AndroidManifest.xml`.
- [ ] Add `expo-font` and `expo-constants` (expo-doctor reports them missing).
- [ ] New icon, adaptive icon, splash and notification icon. The regenerated `mipmap-*` and
      `splashscreen_logo` assets are still opencode's art.
- [ ] New signing keystore for `dev.devmote.app`; never reuse upstream's. Enable Play App Signing.
- [ ] Build and run before touching anything else.

### Native customizations that `prebuild --clean` removed

`prebuild` regenerates `android/` from `app.json` and the config plugins. These four were hand-edited
in the committed folder and are **not** expressible in `app.json` today, so they had to be re-applied
by hand. Move them into a config plugin (or `expo-build-properties`) before the next prebuild, or the
next regeneration will drop them again.

1. **`signingConfigs.release`** driven by `RELEASE_STORE_*` env vars, with v1+v2 signing only
   (v2+v3 crashes the androguard that fdroidserver uses).
2. **`dependenciesInfo { includeInApk false; includeInBundle false }`** for F-Droid.
3. **`android:usesCleartextTraffic="true"`** in `AndroidManifest.xml`. Without it the app cannot reach
   a LAN `http://` opencode server, which is remote mode's core use case.
4. **`RECORD_AUDIO`** without `tools:node="remove"`; the generated manifest had the removal attribute,
   which kills speech input.

The `@sentry/react-native/expo` gradle hook was dropped on purpose: crash reporting is disabled for
v1 and no longer points at the upstream Sentry project.

## 3. Endpoints and telemetry that point at upstream

- [x] `src/lib/waitlist.ts` → deleted with its storage, UI, i18n strings and tests. It posted to
      `opencode.agentlabs.cc/api/beta-signup`, and SPEC.md v1 has no backend.
- [ ] Sentry: `app.json` plugin org/project `vibetechnologies/opencode-mobile` and
      `src/lib/sentry*.ts` → own project, or disable crash reporting for v1.
- [ ] PostHog: `src/lib/analytics.ts` (`EXPO_PUBLIC_POSTHOG_KEY`, EU host) → own project or strip.
      Keep the consent/revocation mechanism; it is good.
- [x] Support address `support@agentlabs.cc` → removed with the waitlist; nothing in the app points at
      it any more.
- [x] Update check → `src/lib/update-check.ts` now reads `RELEASES_*` from `src/lib/links.ts`, which
      points at `LucaBiada/opencode-mobile` (one constant to change after the repo rename).
- [x] Docs/privacy links → centralized in `src/lib/links.ts`; both point into the repo for now
      (`docs/privacy.md` is a new draft).

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
