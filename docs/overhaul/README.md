# Overhaul — product reinvention notes

Working documents for the "master overhaul" of Dopamine Drop: Brain Snacks. They record what was measured, what was changed, what is still open and how it is checked. Everything stated as a number here was measured by a probe in `tools/probe/` against a served build, not estimated.

| File | What it is |
|---|---|
| [01-audit.md](01-audit.md) | UX, UI and game-feel audit: findings, evidence, severity, status |
| [02-design-system.md](02-design-system.md) | Tokens, components and the rules the overhaul added (targets, panels, scroll versus tap, safe areas) |
| [03-accessibility.md](03-accessibility.md) | WCAG 2.2 AA status by criterion, with evidence and the remediation plan |
| [04-roadmap.md](04-roadmap.md) | What to do next: quick wins, medium term, long term, experiments, each with rationale, expected impact and effort |
| [05-before-after.md](05-before-after.md) | Measured before and after, per release |
| [06-qa-plan.md](06-qa-plan.md) | Device and viewport matrix, probe suite, manual checks and the release checklist |
| [07-motion.md](07-motion.md) | How things move: the principles, the engine, every game's signature, the moments and the budget |
| [08-undo-audit.md](08-undo-audit.md) | Which games have Undo, which need none, and the five with a move budget and no Undo left for review (bible Q14) |
| [../bible/](../bible/README.md) | The overhaul bible: the design for where the game goes next, and the nine-release roadmap that builds it |

## Releases so far

| Release | What changed for the player |
|---|---|
| v0.135.0 | The way out is always there: Game Over scrolls with a pinned Go again / Back to menu bar, the exit button and pause sheet are thumb-sized, scrolling a list no longer presses the buttons under the finger |
| v0.136.0 | Settings, You and the Room are folded panels with live summaries; settings search; presets (Calm, Focus, Easy to see) and Reset to defaults, all with Undo; easy-read text; 44px targets |
| v0.137.0 | The level-up card stays until you close it and says what the run was worth, what the level unlocked and what is next; every solve sends a token to the score |
| v0.138.0 | Game Over: the run's XP counts up and fills the level bar (wrapping on a new level), and the level-up card waits for it |
| v0.139.0 | First run opens on the two plainest boards (first solve in seconds); streak steps send a second token; Game Over's perk and yarn lines pay out in view; Chalk Line's unwinnable fallback fixed |
| v0.140.0 | Text size (100, 115, 130, 150 percent) for menus, prompts, HUD and sheets, with the boards unchanged; the achievements grid fits a 320px phone |
| v0.141.0 | The game keeps up: two misses ease the next boards a step (and show the rule again), three quick solves raise them a step, a note says so and a switch turns it off; the pause sheet deals a different puzzle three times a run |
| v0.142.0 | A guided start: until three boards are solved a miss is free (three a run) and the rule comes back; the second and third solves each get a short note; the first Game Over points at the Room once |
| v0.143.0 | Sound captions (a short word for the tick, go, chime, buzz and run over, off by default, on in Easy to see) and a one-handed layout (the exit moves to the lower corner on your side, the pause sheet builds from the bottom) |
| v0.143.1 | A bucket picked up and let go of over the belt in Spool Belt now goes on the belt (it never did; only touching one worked) |
| v0.144.0 | The motion overhaul: every game celebrates in its own shapes and opens its own way, a piece glows instead of moving, a miss snags; streaks smoulder, stages and levels fire light and confetti, Game Over arrives in order; the tab pill slides and pages slide with it, Room cats breathe, blink and purr hearts, yarn flies to its count, charms are dealt; Big celebrations switch; Reduce motion stops all of it |
| v0.145.0 | A new logo (the drop become a cat, one eye lit) on the icon, the header and the welcome card; the header is a HUD (streak, yarn that opens the Room, level ring with its number) that fits any width by dropping words first; in a run the button is drawn as the pause it is, timed runs show m:ss, the best you are chasing sits beside the multiplier and turns gold when passed; the screen stays awake in a run, the pause sheet says where the run stands, P pauses |
| v0.146.0 | Honest and uninterrupted (bible release 1): Go again keeps your kind and each kind has its own best; every charm does what its card says where it is dealt; the daily gift waits for you after days away; nothing that is not about the round interrupts it, notes sit under the score and a tap puts them away |
| v0.147.0 | Purrfect (bible release 2): every solve graded by how it was made (Purrfect, Swift, Clean) and told on every channel; Purrfects tie a Thread and five tie a Bow; Game Over leads with the run's best moment; a miss no longer shakes the board |
| v0.148.0 | Room Radio (bible release 3): music made as you play, in the games' own key, with layers that rise with your streak; a miss muffles it, a stage lifts it, a Bow brings the bells; its own switch and volume; Preview effects in Settings |
| v0.149.0 | Two doors (bible release 4): Cozy (no clock, nothing to lose, the same yarn) and Challenge (the clock, and your best run's pace beside the multiplier); HUD density; the HUD steps back during a round; an install row |
| v0.150.0 | Never lose a run (bible release 5): a run closed mid-way is offered back for a day; Tuck in ends a session gently; Pet everyone and Collect all; a weekly copy of progress on the device |
| v0.151.0 | The Quilt (bible release 6): one patch per game in the Room, knitted as it is played, with stars, rank and the Gold Thread; milestones add things to the Room for good |
| v0.152.0 | Make it yours (bible release 7): Sparkle kits, radio stations, something for a cat to wear, treats, a name of your own, three saved kits, your style on You |
| v0.153.0 | The living room (bible release 8): seasons in the window and on the sill, with every season in the Archive; this week's pattern; the lucky skein; a friend's Daily to race |
| v0.154.0 | What the full chain found: Patchwork's quilt and the You rows restored (two borrowed class names), the Lucky paw note restored and duplicate string keys refused by the gate, the lucky skein named under the score, the Play menu on one screen again, the week's pattern beside Marathon, a label-in-name fix, three probes repaired |
| v0.155.0 | The kinds say how they feel (bible B9): mood words in place of ADHD subtype names, and a gate that refuses clinical words |
| v0.156.0 | The load-up opens with the Books Entertainment intro, played in its own frame, skippable with a tap or a key, short with Reduce motion |
| v0.157.0 | Every board plays from the keyboard: Tab to the board, arrows move a pointer, Space presses or holds, Enter taps |
| v0.158.0 | The intro plays on every launch and can be skipped only after it has been watched to the end once |
| v0.159.0 | The intro is the studio's web v8 |
| v0.160.0 | What's new shows what is new to you, so the first launch after an update no longer freezes while it builds 218 releases |
| v0.161.0 | The three promises the roadmap left unprobed are probed; the friend's Daily race now shows on your first Daily of the day |
| v0.162.0 | Tablets: every screen is 640px wide instead of a phone strip; Patchwork fits a short, wide screen |
| v0.163.0 | A winter game, Pond Skate: the 45th |
| v0.164.0 | Every game is complete or the build stops: quips, signature, kind, icon and a probe that names it; Peekaboo and Dye Pots get their first probes, and Dye Pots' mixed pots come back past level 18 |
| v0.164.1 | The intro plays as a recording, so it is smooth on any device; the live intro is the fallback, and it now aims for 60 fps |
| v0.165.0 | A start about half as long: the game's script is a file of its own; Pond Skate has a Hint and says when the ice has closed the way |
| v0.166.0 | Six things a season for the window sill (24 in all); the sill holds six |
| v0.167.0 | Two achievements for Pond Skate, for skating it well |
| v0.168.0 | Pond Skate sounds like ice |
| v0.169.0 | Every family of games has a voice for its taps |
| v0.170.0 | Pond Skate reads the pond aloud for a screen reader |
| v0.171.0 | On a tablet on its side, play in two panes: the board at nearly the full height |
| v0.172.0 | A new game, Puddle Hop: the 46th |
| v0.173.0 | Puddle Hop's own sounds |
| v0.177.1 | The intro's cracks run to the edges, and it ends like a television being switched off, on black |

## Ground rules the work follows

1. Reproduce first, with a probe that fails on the old build, then fix, then show the same probe passing.
2. Every change is checked at 320x568, 360x640, 390x844, 412x915, both landscapes and two tablet sizes where the screen is affected.
3. All four languages (en, fr, es, de) carry every string; the gate (`tools/check_site.py`) enforces it.
4. Nothing ships on a red probe, and a probe that is flaky is fixed rather than re-run.
