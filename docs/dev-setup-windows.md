# Windows dev setup

How this machine is set up to build Devmote. Written down because the fork's own instructions
(`AGENTS.md`) assume macOS and an external disk, and nothing here is committed to git.

## Installed toolchain

Everything lives on `E:` so the system disk stays clean.

| Part | Version | Location |
|---|---|---|
| JDK (Temurin) | 17.0.21 | `E:\Android\jdk17` |
| Android cmdline-tools | 11076708 (`latest`) | `E:\Android\sdk\cmdline-tools\latest` |
| Android SDK platform | `android-35` | `E:\Android\sdk\platforms` |
| Build-tools | 35.0.0 | `E:\Android\sdk\build-tools` |
| NDK | 27.1.12297006 (required by RN 0.81 / Expo SDK 54) | `E:\Android\sdk\ndk` |
| CMake | 3.22.1 | `E:\Android\sdk\cmake` |
| Platform-tools (adb) | 37.0.1 | `E:\Android\sdk\platform-tools` |
| Emulator | 37.2.13 | `E:\Android\sdk\emulator` |
| System image | `android-35;google_apis;x86_64` | `E:\Android\sdk\system-images` |
| AVD | `devmote` (Pixel 7) | `E:\Android\avd` |
| Downloads | JDK and cmdline-tools zips | `E:\Android\downloads` |

Acceleration is `WHPX` (Windows Hypervisor Platform), reported usable by
`emulator -accel-check`. No HAXM needed.

Boot takes ~31 s headless. The host has an RTX 5090, so `-gpu host` renders much faster than the
`swiftshader_indirect` fallback used for the first verification pass; keep swiftshader only when
testing graphics-related bugs, since it is the more conservative renderer.

## Environment variables (user scope, already set)

```
JAVA_HOME         E:\Android\jdk17
ANDROID_HOME      E:\Android\sdk
ANDROID_SDK_ROOT  E:\Android\sdk
ANDROID_AVD_HOME  E:\Android\avd
Path             +E:\Android\jdk17\bin
                 +E:\Android\sdk\platform-tools
                 +E:\Android\sdk\emulator
                 +E:\Android\sdk\cmdline-tools\latest\bin
```

OpenCode's service was started before these were set, so shell calls from a session may need them
inline:

```powershell
$env:JAVA_HOME="E:\Android\jdk17"; $env:ANDROID_HOME="E:\Android\sdk"
$env:ANDROID_SDK_ROOT="E:\Android\sdk"; $env:ANDROID_AVD_HOME="E:\Android\avd"
$env:Path="E:\Android\jdk17\bin;E:\Android\sdk\platform-tools;E:\Android\sdk\emulator;E:\Android\sdk\cmdline-tools\latest\bin;$env:Path"
```

## Gotchas

- **A fresh clone has no `debug.keystore`.** It is gitignored (correctly — it must not be shared), so
  `assembleDebug` fails at `:app:validateSigningDebug`. Generate one:
  ```powershell
  keytool -genkeypair -v -storetype PKCS12 -keystore android\app\debug.keystore `
    -storepass android -alias androiddebugkey -keypass android `
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
  ```
- **`npm` is blocked by PowerShell's execution policy** (`npm.ps1` cannot run). Use `npm.cmd` and
  `npx.cmd`, or change the policy for the current user.
- **`npm test`** works cross-platform now (`node --test`); it used to report 0 tests on Windows because
  of quoted globs.
- **The app config and the native folders can drift.** `android/` and `ios/` are committed, so
  `app.json` fields such as package ID, icon or scheme are only applied after a prebuild. Do not rename
  anything in `app.json` without running `npx expo prebuild --clean` and rebuilding.
- **The emulator needs the AVD on `E:`.** Without `ANDROID_AVD_HOME`, Android puts AVDs in
  `%USERPROFILE%\.android\avd` on `C:`.

## Commands

```powershell
# build the debug APK (first build downloads Gradle + dependencies)
cd android
.\gradlew.bat assembleDebug

# or let Expo build and install on the running emulator
npx.cmd expo run:android

# emulator
emulator -avd devmote -no-snapshot
adb devices
adb install -r android\app\build\outputs\apk\debug\app-debug.apk

# debug builds load JS from Metro, so keep it running and forward the port
npx.cmd expo start --port 8081
adb reverse tcp:8081 tcp:8081

# tests and typecheck (no device needed)
npm.cmd test
npx.cmd tsc --noEmit
```

## Install on a physical phone

The debug APK is not usable on its own: it loads JS from Metro, so unplugged it shows "Unable to
load script". For a phone that should just run, build and install a **release** APK:

```powershell
cd android
.\gradlew.bat assembleRelease
adb install -r app\build\outputs\apk\release\app-release.apk
```

Without `RELEASE_STORE_*` env vars the release build is signed with the debug keystore and falls back
to the debug signing config. That is fine for testing on your own phone, and **not** acceptable for a
store upload or for sharing.

On the phone: enable Developer options → USB debugging, accept the RSA prompt, then `adb devices`
should list it. If `adb install` reports `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, an older copy signed
with a different key is installed — uninstall `dev.devmote.app` first (that erases its data).

To use the app end to end, the phone must reach an opencode server: run
`opencode serve --hostname 0.0.0.0 --port 4096` on the computer and enter the computer's LAN IP in the
app. Cleartext HTTP is enabled for exactly this case.

## Not installed

- `ios` / Xcode: not possible on Windows.
- `fastlane`, `bundletool`: only needed for store uploads.
- Sentry / PostHog credentials: intentionally absent.
