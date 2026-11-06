# 12. Risks, and how the design avoids them

Engaging games tend to fail in a handful of known ways. Each is listed here
with how this design defends against it, and the check that would catch it if
the defence failed.

| # | Risk | How it shows up | Defence in this design | Check |
|---|---|---|---|---|
| R1 | **Overstimulation** | every solve explodes; motion sickness; fatigue | the ladder (proportion and rarity); Big celebrations and Reduce motion; the board never moves; no flashing above 3 a second | `motion.mjs`, `framebudget.mjs` |
| R2 | **Compulsion over joy** | "one more run" from anxiety, not desire; playing past enjoyment | Tuck in; no streak loss; no FOMO; the 30-minute kind nudge; Cozy | `peakend.mjs`; analytics (opt-in): session length vs a 1-tap mood check |
| R3 | **Health claims** | store rejection, or a label that pathologises the player | done in v0.155.0 on the owner's decision: the kinds' subtitles are mood words ("Slow and soothing", "Quick and bright", "A bit of both") in all four languages, and the gate refuses ADHD, subtype and diagnostic words in any of them | `check_site.py` banned terms |
| R4 | **Streak anxiety** | players play out of fear of losing a streak | the gift rests (Q3); the Daily streak is shown only as a celebration from day 2; no "at risk" copy | `honest.mjs` |
| R5 | **Economy inflation** | yarn stops meaning anything (B7) | new cosmetic sinks (~44k), seasons, the treat jar; prices tied to days of play | income model in [05-economy.md](05-economy.md), re-checked each season |
| R6 | **Economy deflation** | new players see nothing affordable | the first cat (Noodle) costs 150, about one session; the first room grade costs 50 | `meta.mjs` |
| R7 | **Power creep** | late players are untouchably strong; new content must outdo old | power sources are fixed and capped (perks to level 3, cats' passives in 3 steps, charms run-local); everything new in the overhaul is cosmetic | design review rule: no new power source without retiring one |
| R8 | **Cognitive overload** | 44 games and a dozen systems confuse new players | the gate (three kinds), the guided start, systems introduced by appearing (grades, the Thread), the quilt as the map | `firstrun.mjs`: no must-read text before the first solve |
| R9 | **Performance on cheap phones** | dropped frames during the best moments, which ruins the peak | particle cap with back-off; transform-only rule; the frame budget probe at 4× slowdown; Room Radio on a lookahead scheduler | `framebudget.mjs`, `loaf.mjs` |
| R10 | **Readability under juice** | effects hide the board | the canvas never hides a piece for over 300 ms; board contrast held at 4.5:1 | `framebudget.mjs` contrast sample |
| R11 | **Accessibility regressions** | a new feature with no caption, no switch, a small target | the review checklist in [10-ethics.md](10-ethics.md); probes for captions, targets, text size | `captions.mjs`, `textsize.mjs`, axe |
| R12 | **Localization drift** | new strings in English only | the gate refuses a key missing in any language | `check_site.py` |
| R13 | **Novelty decay** | month two is month one again | the quilt, milestones, Gold Threads, seasons, the Weekly Pattern, Challenge ghosts | late walkthrough |
| R14 | **Social pressure** | comparison makes people feel bad | no global leaderboards; the only rival is your own ghost or a friend's link you chose to open | design rule |
| R15 | **Scope creep** | the bible is bigger than any team | the MVP is the 9 releases in [13-roadmap.md](13-roadmap.md); each has a cut list | release reviews |
| R16 | **Single-file fragility** | one 1.7 MB file and one change breaks another game | 70+ probes, the full chain before each merge, a probe that fails on the old build for every change | `all.mjs`, the release checklist |

## Common pitfalls of addictive games, and where this design stands

| Pitfall | Present? | Note |
|---|---|---|
| Energy or lives gating play | **No** | E1 |
| Paid continues / pay to win | **No** | E2, E3; the old +15 s ad plan withdrawn |
| Loot boxes | **No** | E6 |
| Limited-time FOMO items | **No** | E4: the Archive |
| Streak punishment | **Fixing**: the gift ladder reset (B4) | E4, Q3 |
| Interrupting play with offers or notices | **Fixing**: in-run toasts (B5) | E5, Q5 |
| Dark-pattern notifications | **No** | E7: none at all |
| Hidden odds | **No** | odds shown for every roll |
| Social pressure / leaderboards | **No** | R14 |
| Grind walls | **No** | cosmetics priced in days, not weeks; nothing gameplay-essential is bought |
