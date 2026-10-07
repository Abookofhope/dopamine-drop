# Before and after

All numbers come from probes against served builds. "Before" is the build named in the column; "after" is the release that fixed it.

## v0.135.0: the way out, and scrolling that does not press

| Measure | Before (v0.134.0) | After (v0.135.0) |
|---|---|---|
| Game Over, 320x568: Back to menu top edge vs screen height | 597 of 568 (off screen) | inside the viewport, pinned |
| Game Over, 568x320: Back to menu | 439 of 320 (off screen) | inside the viewport, beside Go again |
| Score cropped off the top | up to 145px | none; scrolls from the top |
| In-round exit button | 34x34 | 44x44 (margins keep the HUD height) |
| Pause sheet End the run | 43px | 46px, sheet scrolls on short screens |
| Swipes over eight buttons that pressed something (real touch) | 3 of 8 | 0 of 8 |
| `hudstates.mjs` failed checks | 31 | 0 |
| `roomscroll.mjs` failed checks | 6 | 0 |

## v0.136.0: Settings, You, Room

| Measure at 360x640 | Before | After |
|---|---|---|
| Settings length | 3.2 screens | about 1.2 screens with every panel closed (at most 0.25 of a screen of scroll on a 320x568 phone) |
| Settings buttons under 40px | 17 of 25 | none (every control 44px; a switch is hit through its 59px row) |
| You (Progress) length | 10.8 screens | 1.17 screens |
| Room length | 5.3 screens | 1.35 screens |
| Finding one setting | scroll and read | type a word (accents ignored) or open one panel |
| Changing several settings | one switch at a time | a preset in one tap, with Undo; Reset to defaults with Undo |
| axe violations, Room with all panels open | 8 (grade marks) | 0 |

Other sizes (closed): 320x568 Settings 1.29 screens, You 1.41, Room 1.52; 390x844 Settings 1.0, You 1.0, Room 1.0 (all fit without scrolling).

## v0.137.0: celebrations that wait, rewards that arrive

| Measure | Before (v0.136.0) | After (v0.137.0) |
|---|---|---|
| How long the level-up card stays | 1.9 s, then gone | until closed (Nice, back button, Escape, tap outside) |
| What it says | "Level N" and a star count, English only | level, XP the run earned, colour unlocked, next unlock, in four languages |
| Game Over level line | English only | translated |
| Where a solve's reward goes | a burst at the piece | a token flies from the piece to the score, which jumps |
| With Reduce motion | n/a | no token, no sparks; same card |
| `levelup.mjs` failed checks | 35 | 0 |

## v0.138.0: the pay-out is visible

| Measure | Before (v0.137.0) | After (v0.138.0) |
|---|---|---|
| XP earned on Game Over | a number, already final | counts up over 0.7 s |
| Level progress on Game Over | text only | a bar that starts where the run found it and fills; wraps on a new level |
| Level-up card | 0.42 s after Game Over, covering it | 1.5 s after (0.5 s with reduced motion), once the bar has finished |
| With Reduce motion | n/a | bar and XP already in place |
| `runend.mjs` failed checks | 5 | 0 |

## v0.139.0: the first thirty seconds, and a rare unwinnable board

| Measure | Before (v0.138.0) | After (v0.139.0) |
|---|---|---|
| First board of a brand-new player's first run | random of 44; Odd Skein in 0 of 5 fresh visits | Odd Skein in 5 of 5, then Count the Stitches |
| First solve after the first tap | depends on the draw (a bot that plays Odd Skein never got one) | 3.3 s in 5 of 5 fresh visits (limit 15) |
| The first solve | nothing said | "First solve: That is the game", once |
| A step up the streak | one token | a second token to the multiplier |
| Game Over perk and yarn lines | static | count up; the perk bar starts where the run found it |
| `firstrun.mjs` failed checks | 14 | 0 |
| Chalk Line fallback ramp, forced on 50 boards | 0 won | 36 won (10 of 10 on empty fields) |
| Chalk Line boards that lose to their own answer, natural play | 12 of 390 (3.1%) | 0 of 150 |

## v0.140.0: Text size

| Measure | Before (v0.139.0) | After (v0.140.0) |
|---|---|---|
| Making the app's words bigger | not possible (sizes in px, no setting) | Text size 100, 115, 130, 150 percent; the Easy to see preset uses 115 |
| Menu, prompt and sheet text at 150 percent | n/a | 1.5 times the size (measured by computed style, within 2 percent) |
| Board text at 150 percent | n/a | unchanged (tiles are drawn to fit) |
| Sideways scroll or clipped line on 11 screens at 4 sizes, 2 phones | n/a | none |
| Achievements grid on a 320px phone | third column off the edge at 100 percent | fits; two columns at 130 and 150 percent |
| Bare px font sizes in the stylesheets | 246 | 0 except the logotype and a ring digit, refused by the gate |
| `textsize.mjs` failed checks | 33 | 0 |

## v0.141.0: the game keeps up, and a different puzzle

Measured on Odd Skein held as the only board (a probe-only pool), level of the board read from the build; "setting off" is the same moves with Adaptive difficulty switched off, which is also what v0.140.0 always did.

| Measure | Before (v0.140.0) | After (v0.141.0) |
|---|---|---|
| Two misses in three rounds | next board at the same level (11) | one step easier (10), the rule shown again, a note, and a line on the pause sheet |
| Three quick solves in a row | next board at the level the curve gave (12) | one step harder (13) and a note |
| How far it can move | n/a | three steps either way (a step is 8 percent of the level, at least one level) |
| Turning it off | n/a | one switch in Accessibility settings, 91px row; Reset to defaults and the presets' Undo cover it |
| Where it is not used | n/a | Daily Drop, Marathon, Fidget Loop, Taste Test, and a boss wave |
| A board you do not want | play it, lose it or quit | Different puzzle on the pause sheet, three a run, 46px, not a miss (difficulty unchanged) |
| The note on a 320px phone at 150 percent text | n/a | inside the screen, clear of the mode label, HUD height unchanged (63px) |
| Languages | n/a | the note, the pause line and the setting in en, fr, es, de |
| `adapt.mjs` failed checks | 1 (no setting; the rest cannot run) | 0 of 33 |

What this does not prove: the thresholds (three rounds, two misses, "quick" meaning inside 55 percent of par, eight percent per step) are reasoned, not tuned from play data. Roadmap Q7 and L3 are the way to tune them.

## v0.142.0: a guided start

Measured with a brand-new player (nothing in storage) held on Odd Skein by a probe-only pool; the cost of a miss is read from the run's clock at the start of the round and just after the miss, so it is a number and not a label.

| Measure | Before (v0.141.0) | After (v0.142.0) |
|---|---|---|
| The first miss of a new player | 4 s off the clock, "Wrong skein, minus 4 seconds" | no time lost (about 1 s of ordinary time passed; the penalty is 4 s), "Free while you learn" |
| After a free miss | the next board, rule hidden | the rule is shown again |
| How many are free | n/a | three a run, until three boards have been solved in all; the fourth costs 4 s |
| The second and third solves | silence | one note each: what a streak does, and that early misses were free and from here they cost a little; each told once |
| The notes on a 320px phone at 150 percent text | the first-solve note was cut off at the edge (measured) | the three notes wrap and sit inside the screen (13 to 307 of 320) |
| The first Game Over | yarn and a goal line, nowhere to go | a 328x78 button that names Biscuit and the daily gift and opens the Room; shown once, never again, and not to someone who has already seen the Room |
| A returning player (80 solved) | n/a | a miss costs 4.8 s as before; no notes; no pointer |
| Languages | n/a | the free-miss line, both notes and the Room pointer in en, fr, es, de |
| `guided.mjs` failed checks | 27 of 33 | 0 of 33 |

What this does not prove: that a guided start keeps more people. The three-solve and three-miss numbers are reasoned, not tuned; roadmap Q9 and L3 are how to tune them.

## How to reproduce

```
python3 tools/build_site.py /tmp/site && python3 tools/check_site.py /tmp/site
cd /tmp/site && python3 -m http.server 8400 &
PORT=8400 SITE=/tmp/site node tools/probe/hudstates.mjs
PORT=8400 SITE=/tmp/site node tools/probe/roomscroll.mjs
PORT=8400 SITE=/tmp/site node tools/probe/settingsacc.mjs
PORT=8400 SITE=/tmp/site node tools/probe/panels.mjs
PORT=8400 SITE=/tmp/site node tools/probe/adapt.mjs
PORT=8400 SITE=/tmp/site node tools/probe/guided.mjs
```
