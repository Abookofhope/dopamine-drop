# 13. Roadmap: from today to the full vision

Three stages. **Now** is v0.145.0 (the baseline). **MVP** is the overhauled
game in nine releases, each one shippable by itself. **AAA** is the vision once
the MVP has proven itself, which needs things a one-file web game can't
provide (a server, recorded audio, illustrators, testers).

Every release follows the project's ground rules: a probe that fails on the
old build and passes on the new one; all four languages; the 7-viewport check
where the screen is affected; the full verification chain before it is merged;
nothing ships on a red probe.

## MVP releases

| Release | Name | Contents | New probe | Bible refs |
|---|---|---|---|---|
| **v0.146.0** | Honest and uninterrupted | Go again keeps the kind (B1); honest charms, each offered only where it works (B2, B3); the gift rests (B4); text faults (B8); toasts wait during rounds, sit below the score, tap to dismiss, and the recap lists them (B5); the frame budget probe; Meld's board on whole pixels | `honest.mjs`, `toasts.mjs`, `framebudget.mjs` | 00, 08 Q1–Q5, 10 E4–E5 |
| **v0.147.0** | Purrfect | style grades (Solved, Clean, Swift, Purrfect); the Thread and the Bow; the Variety stitch; the frame kick; grade captions; haptic tiers; **peak-first Game Over** (B10) | `style.mjs`, `peakend.mjs` | 02, 03, 05 |
| **v0.148.0** | Room Radio | generated music with five layers that follow heat; stingers in key; Hearth station; music settings; an Effects preview in Settings | `radio.mjs` | 09 |
| **v0.149.0** | Two doors | the Cozy and Challenge switch; Cozy runs; the ghost pace line; HUD density; the install row | `dualmode.mjs` | 06, 07 |
| **v0.150.0** | Never lose a run | instant resume; Tuck in; Pet everyone and Collect all; a weekly automatic backup on the device | `resume.mjs` | 08 Q6, Q8, Q13, Q15 |
| **v0.151.0** | The Quilt | the quilt on the Room wall (44 patches, states, borders, the Gold Thread); patch cards with Play and Practise; the stitch moment; milestones | `quilt.mjs` | 04 |
| **v0.152.0** | Make it yours | the Kit screen with three saved kits; Sparkle kits; stations to buy; cat accessories; the treat jar; naming a cat at bond 3; the Style profile | `kit.mjs` | 04, 05 |
| **v0.153.0** | The living room | seasons and the Archive; the Weekly Pattern; the lucky skein; the Daily ghost link | `seasons.mjs` | 04, 05, 06 |
| **v0.154.0** | Finish | icons checked at launcher sizes; the undo audit (Q14); the first-run probe extended to 90 s; the kinds' subtitles (pending the owner's decision, B9) | `firstrun.mjs` (extended) | 08, 12 |

### Cut lists (what each release drops first if it runs long)

- v0.147: the Variety stitch, the frame kick.
- v0.148: the Effects preview, the clock-under-8-s hats.
- v0.149: the install row, the Detailed density level.
- v0.150: the weekly backup.
- v0.151: the milestones beyond 1,000 solves.
- v0.152: accessories, the treat jar.
- v0.153: the Weekly Pattern.

## AAA vision (after the MVP)

| Area | What | Needs |
|---|---|---|
| Platforms | native Android and iOS builds (a WebView shell with haptics and audio session control); tablet layouts | store accounts, the Play closed test (12 testers, 14 days) |
| Save | opt-in cloud sync, end-to-end encrypted with a passphrase the player keeps | a small backend; a privacy review |
| Audio | recorded foley for the craft room (yarn, wood, cloth, purrs) layered under the synth; a composer's stems for Room Radio with the same layer and stinger rules | an audio designer |
| Art | hand-drawn cat animation (Lottie or sprite sheets) for the Room; illustrated season sets | an illustrator |
| Content | a new game each season, built to the same rules (stability, signature, four languages, probes) | design time |
| Accessibility | an independent review: screen readers on iOS and Android, a photosensitivity analysis, a motor-impairment pass; keyboard play on every board | external testers |
| Languages | +6 (pt, it, nl, pl, ja, ko) | translators |
| Insight | opt-in analytics that stay on the device by default, aggregate-only: first-win time, session length, door chosen, Tuck in use; a one-tap mood check before and after a session (opt-in), to test the five-minute promise directly | a privacy review |
| Social | friend codes and a private weekly Daily league among friends only, still serverless where possible | design and a privacy review |

## Measures of success at each stage

| Measure | Now | MVP target | AAA target |
|---|---|---|---|
| First solve | 3.3 s | under 5 s | under 5 s |
| Taught in play | grades and chains don't exist | Thread and grades seen within 90 s in 4 of 5 first runs | — |
| Busiest moment at 4× slowdown | not measured | p95 frame under 33 ms | under 16.7 ms on a mid phone |
| Game Over leads with a peak | no (B10) | 100% of runs | — |
| Things to buy for a 3-month regular | none left at about month 2 | through month 6 | through year 2, with seasons |
| Dark-pattern checklist | 2 open (B4, B5) | 0 open | 0 open, audited externally |
| D1 / D7 return | unknown | measured on device, opt-in | above casual-puzzle medians with no notifications |
