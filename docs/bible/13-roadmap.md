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

### Where the build stands (2026-11-05)

| Release | Shipped | Where it differs from the plan above |
|---|---|---|
| v0.146.0 | 7edbbea | — |
| v0.147.0 | efb3943 | — |
| v0.148.0 | 87d1c88 | — |
| v0.149.0 | 20eea4c | — |
| v0.150.0 | 7224e9e | — |
| v0.151.0 | 3bf90f4 | the patch card offers Marathon and Practise |
| v0.152.0 | a635825 | no Kit screen of its own: the three kits sit under Riding along in the Room, so the Room stays under two screens (`panels.mjs`) |
| v0.153.0 | 74d0780 | seasons sit under The room for the same reason; the week's board is chosen from all boards by the date (Classic for a player who has not opened it); the week card shows from the third run; a friend's link is read when the app opens and when it arrives while open |
| v0.154.0 | b1af522 | the full chain on v0.154.0 passed 84 of 86 steps (a container restart split it into three runs); the two left, alive's Tidy Up and slack's French Hint, passed 5 of 5 alone and were blind probes, fixed after; the Finish docs and probes landed first (73deae1); the full chain on v0.153.0 then found two class-name collisions (v0.151, v0.152), a duplicate string key (v0.153), the Play menu past one screen (v0.149) and three stale or blind probes, all fixed in v0.154.0, with the week's pattern moved beside Marathon; icons checked at 48, 40 and 29 px, circle and squircle masks, light and dark wallpapers: the mark stays inside the safe zone and keeps its contrast, no change; the undo audit is written ([../overhaul/08-undo-audit.md](../overhaul/08-undo-audit.md)), with five games left for review; `firstrun.mjs` checks that nothing opens over the first board and that a grade is shown on an early solve (not yet a full 90 s of play); B9 waits on the owner |
| v0.155.0 | see the log | B9, on the owner's decision: the kinds say how they feel ("Slow and soothing", "Quick and bright", "A bit of both") instead of naming ADHD subtypes; `check_site.py` refuses clinical and diagnostic words in all four languages |
| v0.156.0 | see the log | AAA, art: the load-up opens with the Books Entertainment intro (the owner's own asset, imported unchanged), skippable, short with Reduce motion |
| v0.157.0 | see the log | AAA, accessibility: keyboard play on every board, through one keyboard pointer that sends the game the same events a finger does (`kbd.mjs`: 44 of 44). The independent review (screen readers on phones, photosensitivity, motor) still needs external testers |
| v0.158.0 | 2c939d8 | the owner's rule: the intro plays every launch and can be skipped only after one full watch |
| v0.159.0 | 949da33 | the intro is the studio's web v8 |
| v0.160.0 | b1884c1 | AAA, performance: the busiest moment already holds 60 fps at 4x (and to 8x); the first launch after an update no longer freezes building What's new; the release history is gated |
| v0.161.0 | 04228cd | AAA, the open probes: the lucky skein pays exactly double (probed); a friend's Daily raced on your first Daily of the day (fixed, probed); the first 90 s: a grade and the Thread on screen in 5 of 5 first runs (probed) |
| v0.162.0 | fd79e9d | AAA, platforms: tablet layouts. The column widens from 460 to 640px on a screen at least 700px each way; all 44 boards checked at an upright and a sideways tablet (`tablet.mjs`); Patchwork's quilt now sizes to its real room. Native shells and store builds still need store accounts |
| v0.163.0 | ee87fbc | AAA, content: the first seasonal game, Pond Skate (winter), built to the same rules: a signature, four languages, a difficulty curve past level 20, a move budget from the true shortest route, keyboard and Reduce motion, and its own probe (`skate.mjs`) that solves every pond it is dealt. Kept all year, like the season sets |
| v0.164.0 | b13e8de | the seasonal-game checklist as a build check (`check_site.py`): five quips, a signature, a kind, an icon and a probe naming every game, and a floor of 45; Peekaboo and Dye Pots probed for the first time; Dye Pots' mixed pots restored past level 18 |
| v0.164.1 | 9c3f90a | the owner's request, "super smooth on anything": the intro plays as a recording (upright and widescreen, 60 fps, top quality); the live page is the fallback and lowers its detail below about 50 fps, not 30 (`splash.mjs`: 28 of 28) |
| v0.165.0 | c9fc373 | AAA, performance: the build lifts the game's 1.5 MB script into `app.js?v=<hash>`, compiled off the main thread and code-cached; the longest launch task at 4x falls from 325-416 ms to 170-251 (median 363 to 189); offline still works. Pond Skate: a Hint, and a round the ice has closed ends with a message |
| v0.166.0 | 8bc8374 | economy, toward "things to buy through year 2": the bible's season sets of about six each (two more per season, at 750 and 1,200 yarn; a season's set went from 2,250 to 4,200); the sill shows six |
| v0.167.0 | 055b24a | Pond Skate's achievements, as the earlier new games had: Not a Slide Wasted (10 ponds in exactly their shortest route), Thin Ice Waltz (one with thin ice); counted by the game at the solve, checked by `skate.mjs` |
| v0.168.0 | f0168c6 | juice on the verb (bible 03): Pond Skate's slide swishes (a falling sine as long as the slide), a bump thuds, thin ice cracks, yarn rings and sparkles in the game's own shapes; the closed-pond check in `skate.mjs` made robust (four slides deep, sixteen ponds) |
| v0.169.0 | 47e252b | AV (bible 09): an audit found 44 of 45 games used only the generic tap, good and bad; a voice per family (wave, register, length, slide) now plays every tap in a live round, in the family's key; menus keep the plain tap; the gate requires a voice for every family |
| v0.170.0 | 0b1646e | accessibility: Pond Skate's board names where the cat, the basket and the yarn are (row and column) and which ways the cat can slide, after every slide, in four languages; the independent review still needs external testers |
| v0.171.0 | 2c1c55c | platforms, tablets on their side: play in two panes (the score and the round's chips on the left, the board at nearly the full height on the right), menus, sheets and the header kept to the 640px column; all 45 boards checked in two panes |
| v0.172.0 | 2c1c55c | content: Puddle Hop, the 46th game (numbers family; Calm door), built to the README checklist and stopped by the gate until its probe existed: fixed-distance hops, every board searched before it is dealt, budget from the true minimum, dead ends announced, Hint, read aloud, keyboard, an achievement |
| v0.173.0 | see the log | Puddle Hop's verb gets its own sound: a hop springs (a rising sine) and lands (a low triangle), heard by `puddle.mjs` through the page's oscillators |

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
| Taught in play | grades and chains don't exist | Thread and grades seen within 90 s in 4 of 5 first runs (now: 5 of 5, `promises.mjs`, v0.161.0) | — |
| Busiest moment at 4× slowdown | not measured (now: p95 16.7 ms at 4×, 60 fps to 8×, v0.160.0) | p95 frame under 33 ms | under 16.7 ms on a mid phone |
| Game Over leads with a peak | no (B10) | 100% of runs | — |
| Things to buy for a 3-month regular | none left at about month 2 | through month 6 | through year 2, with seasons |
| Dark-pattern checklist | 2 open (B4, B5) | 0 open | 0 open, audited externally |
| D1 / D7 return | unknown | measured on device, opt-in | above casual-puzzle medians with no notifications |
