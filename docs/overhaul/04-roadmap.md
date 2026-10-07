# Roadmap: what to improve next

Effort: **S** about half a day, **M** one to three days, **L** a week or more. Impact is the expected effect on the success criteria in the brief (enjoyment, no layout trouble on a phone, little scrolling, a game that feels alive, accessibility). Items are ordered within each group by value for effort. This list is revised after every major iteration.

## Quick wins (days, not weeks)

| # | Item | Why | Expected impact | Effort |
|---|---|---|---|---|
| Q7 | Tune the adaptive thresholds from data: today a step is 8 percent of the level, quick means inside 55 percent of par, the window is three rounds | The numbers are reasoned, not measured; a flat or wild difficulty curve is the main risk of the feature | Medium to high | S once L3 exists |
| Q8 | Put the adaptive state on Game Over too ("you played at +2 steps") | A summary that explains a lower or higher score | Low to medium | S |
| Q4 | A 44px token (`--hit`) and a probe that scans every visible control on every shell screen | Stops the next small button from sneaking in | Medium (prevention) | S |
| Q5 | Settings: a "Recently changed" line in the presets header; Reset on a single panel | Small clarity gains once the panels exist | Low to medium | S |
| Q6 | Section jump on Stats and Room via an optional sticky chip row | Only worth doing if analytics show people open many panels per visit | Low | S |

## Medium term (one to three days each)

| # | Item | Why | Expected impact | Effort |
|---|---|---|---|---|
| M2 | Sound captions: a brief text strip for chimes, warnings and the level-up, off by default, on in the Easy to see preset | Hearing-impaired and sound-off play | Medium | M |
| M3 | One-handed mode: exit and the HUD actions move to the lower right, the pause sheet anchors to the bottom | The exit is top-left, the hardest place for a right thumb | Medium | M |
| M4 | First 30 seconds, part two: v0.139.0 gives a first solve in about 3 s; still to do is a guided second and third round, a quicker path past the welcome screen for a reinstall, and measuring drop-off with the opt-in analytics (L3) | Hook and retention at the point of highest drop-off | Medium to high | M |
| M6 | Hints, skip and undo as a consistent trio: Different puzzle and the unasked rule reminder are done (v0.141.0); still open are an on-demand rule button (needs a place for it on the HUD, see M3), per-mode hints beyond the modes that already carry one (Stitch Sampler, Kitten's Snack Attack and No Crossing among them), and a yarn cost in non-Relaxed runs | Agency and fewer dead-ends | Medium | M |
| M7 | Session shapes: pick 2, 5 or 10 minutes on Play and get a fitting playlist and a clear end | Matches the player's real time; clean stopping points are kind to attention | Medium | M |
| M8 | Command palette (search across modes, settings, tabs) reachable from the search icon | Fast route to anything | Low to medium | M |
| M9 | Keyboard play for tap-only boards | WCAG 2.1.1 on boards | Medium for keyboard users | M to L |

## Long term (a week or more)

| # | Item | Why | Expected impact | Effort |
|---|---|---|---|---|
| L1 | Optional cloud sync with sign-in, conflict-safe (last write wins per key, with a restore point) | Moving phone or sharing a tablet | Medium; privacy and security cost | L |
| L2 | Seasonal, ethical events: a themed set of wishes and a cosmetic for finishing, no streak loss, no countdown pressure | Reasons to return without dark patterns | Medium to high | L |
| L3 | Analytics that stay on device by default: an opt-in, aggregate-only event set (session length, first-win time, drop-off screen) | Replaces guesses with numbers for M4 and M5 | High for decisions | L |
| L4 | A component page rendered from the real CSS, with a visual-regression baseline per component | Keeps the design system honest | Medium (prevention) | L |
| L5 | An independent accessibility review: screen reader on iOS and Android, a photosensitivity analysis, a motor-impairment pass | The only way to know what the automated checks miss | High | L |

## Experiments (cheap to try, judged on data)

| # | Experiment | Hypothesis | Measure |
|---|---|---|---|
| E1 | Surprise: a rare "lucky skein" solve that pays double with a distinct sound | Variable reward lifts the feel of an ordinary solve | Session length; opt-out rate of sound |
| E2 | Mode hop prompt after two losses: offer an easier sibling mode in one tap (adaptive difficulty now eases the level; this would change the game) | Fewer quits on a hard run | Next-run start rate after a loss |
| E3 | Streak shield: one free miss forgiven a day | Less punishing streaks, no dark pattern since it only ever forgives | Streak length distribution |
| E4 | Calm preset offered once after a lost run | Self-regulation helps ADHD players stay | Preset adoption; session length after |
| E5 | Cat reactions on the level-up card (the riding cat celebrates) | Ties the new celebration to the Room's characters | Qualitative |

## Done in this overhaul so far

See [05-before-after.md](05-before-after.md). Brief items now complete: adaptive difficulty with a visible note and a switch, and a Different puzzle on the pause sheet (v0.141.0); the first run opens on the two plainest boards, with a first solve in seconds, and the Game Over pay-out and the streak token are done (v0.139.0); a level-up card that stays until closed and a reward token on every solve (v0.137.0); mobile HUD and Game Over never hide the way out; Room, Settings and Games scroll without pressing items; Settings, You and the Room as panels; settings search, presets, reset to defaults, undo; easy-read text; 44px targets across the shell; axe clean on the shell screens.

## Principles for choosing

- Anything that removes a way to get stuck or a way to lose control comes before anything that adds delight.
- Rewards stay honest: no fake scarcity, no countdown to lose progress, no purchases required to win, and every celebration can be dismissed or reduced.
- Every release adds or extends a probe that fails on the old build.
