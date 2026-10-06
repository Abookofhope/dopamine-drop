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

## How to reproduce

```
python3 tools/build_site.py /tmp/site && python3 tools/check_site.py /tmp/site
cd /tmp/site && python3 -m http.server 8400 &
PORT=8400 SITE=/tmp/site node tools/probe/hudstates.mjs
PORT=8400 SITE=/tmp/site node tools/probe/roomscroll.mjs
PORT=8400 SITE=/tmp/site node tools/probe/settingsacc.mjs
PORT=8400 SITE=/tmp/site node tools/probe/panels.mjs
```
