# Naming

**Decision (2026-11-10):** the app is called **Devmote**.
Status: provisional until trademarks are checked and the first Play listing exists.

## Why Devmote

- **dev + remote.** A developer hears it once and knows what it does, with no explanation.
- **Short and unambiguous.** Two syllables, no spelling questions: DEV-mote.
- **The package ID falls out of it.** `dev.devmote.app` is a valid reverse-domain ID and reads
  naturally, which is rare.
- **It doesn't touch opencode's marks.** No "Open" prefix, so it can't imply affiliation, which is
  what SPEC.md §12.1 warns about.

It undersells phone mode on its own — the tagline carries that: *Devmote — your opencode agent, on
your phone and on your desktop.*

## Availability checked (2026-11-10)

| Thing | Result |
|---|---|
| Play package `dev.devmote.app` | free (404) |
| Google Play search "devmote" | no app with that name |
| GitHub user/org `devmote` | free (404) |
| npm `devmote` | free |
| `devmote.dev` | free |
| `devmote.app` | taken |

Re-check the Play package ID and the npm name immediately before the first upload; these are the two
that are expensive to change later.

## How the name is displayed

- App name / launcher: **Devmote**
- Play title: **Devmote — opencode client** (30-character limit, this is 25)
- Repo: `devmote` (rename the fork when the rebrand lands; GitHub keeps redirects)
- Every listing, README and About screen: *"Unofficial; not affiliated with the opencode project."*
- Never use opencode's logo or wordmark. Refer to opencode in text only, as the protocol the app
  speaks.

## Rejected, and why

Single dictionary words were all unavailable on `.app`, `.dev`, GitHub and Play: `tandem`, `pillion`,
`sidecar`, `helm`, `lever`, `clutch`, `bosun`, `pinion`, `magpie`, `meerkat`, `pocketwatch`,
`spyglass`, `deckhand`, `binnacle`, `sprocket`. Several are also crowded trademarks (Helm/Kubernetes,
Spanner/Google).

- **Pocketmote** — best two-mode story, everything free, but more invented and easier to misspell.
  Keep as the fallback if "Devmote" runs into a trademark.
- **Codeferry** — nicest brand, `.app` and `.dev` free, but "ferry" is transport, not an agent.
- **Anything "Open…"** — implies affiliation.
- **Pocket Code / PocketCode** — existing Catrobat app.
- **Copilot-ish** — Microsoft's mark.

## Cost of changing later

Cheap: display name, docs, README, store listing copy.
Expensive: the Android package ID (permanent after the first Play upload), the iOS bundle ID, the
signing identity, and anything already published to a store. That is why the package ID above is
checked now, not at release time.
