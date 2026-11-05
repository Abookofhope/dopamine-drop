# 8. Quality of life

Quality of life is a feature, not polish. Each item removes friction, which
gives the player back attention and autonomy. Ordered by priority. **P0** is a
broken promise (fix first), **P1** is everyday friction, **P2** is comfort and
**P3** is the long tail.

## Already live (keep and protect)

The way out is always visible (v0.135.0); scrolling never presses (v0.135.0);
settings search, presets, reset with undo (v0.136.0); text size (v0.140.0);
adaptive difficulty and Different puzzle (v0.141.0); a guided start (v0.142.0);
captions and one-handed (v0.143.0); Reduce motion and Big celebrations
(v0.144.0); the header HUD, wake lock, P to pause, the pause summary
(v0.145.0); save export and import; offline play; progress banked per solve.

## The list

| # | P | Item | Pillars | Effort | Release |
|---|---|---|---|---|---|
| Q1 | P0 | **Go again keeps your kind** (B1) | Autonomy | S | v0.146 |
| Q2 | P0 | **Honest charms**: no blank or free-lunch cards (B2, B3); a charm is offered only where it does something | Competence, fairness | S | v0.146 |
| Q3 | P0 | **The gift rests** instead of resetting (B4) | Safety | S | v0.146 |
| Q4 | P0 | **Text faults** (B8): counts, comfort text, English left in other languages | Trust | S | v0.146 |
| Q5 | P1 | **Toasts wait**: queued during rounds, shown below the score, tap to dismiss, the recap lists what was queued (B5) | Flow | S | v0.146 |
| Q6 | P1 | **Instant resume**: a run interrupted by closing the app, a call or the OS killing the tab resumes from the Play tab within 24 h, with score, clock, heat, Thread, charms and lives as they were; the round in play is dealt again at the same level (as the pause sheet already promises) | Safety, Autonomy | M | v0.150 |
| Q7 | P1 | **Peak-first Game Over** (B10): the recap leads with the run's best true moment, and an empty run leads with what was learned | Peak-End | S | v0.147 |
| Q8 | P1 | **Tuck in**: a calm closing ritual offered at Game Over (first after 30 minutes of play) | Restoration | S | v0.150 |
| Q9 | P1 | **HUD density** (Minimal, Standard, Detailed) | Autonomy, Flow | S | v0.149 |
| Q10 | P1 | **Effects preview** in Settings: a button that plays a solve, a Purrfect, a miss and a level-up at the current motion and sound settings | Autonomy | S | v0.148 |
| Q11 | P2 | **Install prompt**: a quiet "Add to home screen" row in Settings when the browser offers it (`beforeinstallprompt`), never a pop-up | Autonomy | S | v0.149 |
| Q12 | P2 | **Smart defaults on first run**: language from the browser (live); Reduce motion from the system (live); text size from the system font scale where readable | Accessibility | S | v0.149 |
| Q13 | P2 | **Batch actions** in the Room: "Pet everyone" (one tap pets every cat; the 2 yarn a cat a day is unchanged), "Collect all" for wishes | Friction | S | v0.150 |
| Q14 | P2 | **Undo where a wrong move damages the board**: every game with multi-step state either has Undo or a reason not to, recorded in the per-game notes (the rule is in the Knowledge Bank: an undo that costs a move is worse than the mistake) | Competence, Safety | M | v0.152 |
| Q15 | P2 | **Save safety**: an automatic weekly backup kept on the device (the last 2), restorable from Settings | Safety | S | v0.150 |
| Q16 | P3 | **Cloud sync**, opt-in, privacy-first: end-to-end encrypted with a passphrase the player keeps; needs a server, so it waits for the native app or a hosted backend | Ownership | L | AAA |
| Q17 | P3 | **Keyboard play on every board** (WCAG 2.1.1) | Accessibility | L | AAA |
| Q18 | P3 | **Command palette**: search modes, settings and screens from one box | Friction | M | AAA |

## Onboarding: taught in play, under 90 seconds

Live today (v0.139.0 to v0.142.0): the welcome card; the first run opens on the
two plainest boards; first solve in about 3.3 s; free misses until three
solves; a short note on the 2nd and 3rd solve; how-to lines on each first
meeting; the Room pointed at once.

The overhaul adds, without adding any reading:

| Second | What the player does | What they learn |
|---|---|---|
| 0–5 | taps the odd skein | touching works; a solve feels great |
| 5–20 | solves 2–4 more boards, each different | the puzzle changes every round |
| ~20 | their first **Swift** or **Clean** grade appears under the score | there's a better way to solve |
| 20–60 | heat climbs to ×2; the music adds a layer | rhythm is rewarded |
| 60–90 | first Purrfect, first knot on the Thread | the chain exists |
| first Game Over | the peak, the yarn flying to the basket, the Room called once | where the yarn goes |
| second session | the quilt shows the patches they've tried | the long game exists |

`firstrun.mjs` is extended to measure: the first solve under 5 s, the third
solve under 30 s, and **no text a player must read** (no modal with more than
one sentence) before the first solve.
