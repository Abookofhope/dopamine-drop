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

## v0.143.0: sound captions and a one-handed layout

Measured on served builds; "before" is v0.142.0.

| Measure | Before (v0.142.0) | After (v0.143.0) |
|---|---|---|
| A player who cannot hear the game | no sign of the tick, go, chime, buzz or run over | Sound captions: one word each for the tick, go, solve chime, combo, miss buzz, level-up and run over; off by default, on in the Easy to see preset, off after Reset to defaults; shown with sound on or off |
| The caption on a 320x568 phone at 150 percent text | n/a | 160px wide (80 to 240), inside the screen, ignores touches, hidden from screen readers |
| Which sounds are not captioned | n/a | Chalk Line's ball bounces and the tap click |
| Where the exit is in a run | top left, 44x44, about 3px from the top edge | with One-handed layout: 48x48 in the lower corner on the chosen side, 9px from the bottom edge, at 320x568, 360x640, 390x844, 412x915, 568x320, 844x390, 768x1024 and 1024x768 |
| What the board gives up for it | n/a | 36px of height on a phone in portrait; 8px of width at 568x320 and none at 844x390 (the exit is fixed to the screen's edge there; the screens are a 460px column) |
| The pause sheet's End the run at 360x640 | 414 of 640 (upper half) | 533 of 640 (a thumb's reach), and on a 568x320 screen the sheet still scrolls from its title |
| Game Over | Back to menu on screen and topmost | unchanged, and the exit does not show through it in either landscape |
| Languages | n/a | the two settings, the group name and the seven captions in en, fr, es, de |
| `captions.mjs` failed checks | 1 (no setting; the rest cannot run) | 0 of 21 |
| `onehand.mjs` failed checks | 1 (no setting; the rest cannot run) | 0 of 113 |

What this does not prove: that the lower corner is the best place for every hand (a left-handed player on a tall phone may prefer the middle; the setting is a first answer, not a measured one), or that captions are enough for a deaf player: they cover the seven moments above and nothing else. An on-demand rule button is still open (roadmap M6).

## v0.143.1: a bucket let go of over the belt

Measured on served builds; "before" is v0.143.0.

| Measure | Before (v0.143.0) | After (v0.143.1) |
|---|---|---|
| Pick a bucket up and let go of it over the belt (Spool Belt) | the bucket's put ran 0 times in 3 of 3 runs, so nothing went on the belt | it ran once, and the bucket is on the belt |
| Touch a bucket and let go | worked | unchanged |
| `drag.mjs` check that found it | counted belt places and passed when nothing happened | counts calls to the bucket's put, so a drag that does nothing fails |

What this does not prove: that the other drag modes are free of the same kind of fault. Each of them has a check that a drop lands, and this one passed for about 47 releases because of how it counted. The same check is worth reading in every mode that has one.

## v0.144.0: the motion overhaul

Measured on served builds; "before" is v0.143.1. The vocabulary is in [07-motion.md](07-motion.md).

| Measure | Before (v0.143.1) | After (v0.144.0) |
|---|---|---|
| A solve | ten square sparks inside the board, clipped at its edge, the same in every game | the game's own shapes on one canvas over the whole screen (curls and threads in Odd Skein, dye drops in Dye Trap, sand in Sandbox of Softness...), a ghost glowing over the piece, a ring from x3, glints and confetti from x4 |
| Games with their own signature | 0 of 44 | 44 of 44; no two share both a style and a set of shapes |
| A board opening | a 240 ms fade, the same everywhere | the game's reveal (iris, wipe, curtain, rise, split or diamond), 320 ms, a clip and a fade |
| A miss | a red wash and a shake | the piece snags with a pulled thread, the game's shapes slump off it in grey, the screen's edge reddens (less when forgiven), the prompt shakes its head |
| A game's own chime inside a round (a pair, a stage) | sound only | a little of the signature where the finger was, and a glow (or a snag) on the piece under it |
| Squares moving or resizing with motion on (`stable.mjs`, 44 games) | 0 | 0 |
| Particles alive at once, asked for 2000 | n/a | 251 (cap 260; a late frame lowers it) |
| Endless animations that repaint every frame | 3 (hot streak, level ring, Daily) | 0: each glow is a layer whose opacity breathes |
| What the in-app Reduce motion switch stopped | particles and shake | that and every ghost, veil, sweep, idle loop and entrance, through `html[data-motion]` |
| Confetti at a level-up | 26 squares inside the card | from both lower corners (125 pieces in the probe run); none with Big celebrations off |
| The tab bar | the tab you left goes dark, the new one lights | a pill slides under the new tab, its icon hops, the page slides the way the pill went |
| The Room | cats sway and breathe | and now, one at a time, blink, twitch an ear, flick a tail, take a breath, a sleeper lets out a z; dust drifts in the window light; petting squashes and sends hearts. An idle Room: 0 layouts in 3 s before, 18 to 29 after (36 to 56 ms of work) |
| Dragging a loaf at 4x CPU slowdown (`loaf.mjs`) | 0 layouts, 9.6 ms a move | 0 layouts (the first draft gave the run's mascot endless loops inside its drawing: 113 to 124 layouts and 16.5 ms a move, caught before shipping) |
| `motion.mjs` failed checks | 26 of 40 | 0 of 40 |

What this does not prove: that it feels right on a slow phone. The cap and the transform-only rule are the guard, and the probe measures the cap, not the frame rate on a real device; manual check 10 in [06-qa-plan.md](06-qa-plan.md) is for that.

## v0.145.0: the logo, the two HUDs, small comforts

Measured on served builds; "before" is v0.144.0.

| Measure | Before (v0.144.0) | After (v0.145.0) |
|---|---|---|
| The mark | a coral drop holding a 2x2 grid, one tile lit (from before the cats) | the drop become a cat: ears on its shoulders, one eye lit aqua, yarn wound round it, a loose thread; on the home-screen icon (192, 512, maskable), in the header and on the welcome card, with "Brain snacks" under the name there |
| The header | the name and a level chip | logo, name ("Drop" in the drop's gradient), daily streak from two days, the yarn in the basket (a tap opens the Room), the level ring with its number on it |
| The header at 320 wide, 150 percent text, a five-figure basket | n/a | fits: it drops the level's word, then the name's words (still read out), then the streak, then the yarn, measured, never the ring |
| The in-run button | drawn as a cross, labelled "End run" in English in every language, and it paused | drawn as a pause, labelled Pause / Pausa / Pause in the player's language |
| The clock in a timed run | a bar only | the bar and m:ss beside the name, red in the last ten seconds |
| What the run is chasing | shown only on Game Over | your best beside the multiplier from the first board; once passed, "New best +N" in gold, once, with a moment |
| The screen during a long think | could dim and lock mid-run | kept awake while a run is live (Screen Wake Lock), let go on pause and at the end |
| The pause sheet | the game's rule, resume, end, sound and vibration | and where the run stands (points, solved, best streak) |
| A keyboard | Escape pauses (as the back button) | and P pauses and resumes |
| The welcome card on a 320x568 or 360x640 phone | 508 and 506 px, no scroll | the same 508 and 506 px: below 700 px tall the mark sits beside the name and the tagline steps aside (the first draft, with the mark above the name, was 663 px and hid Start below the fold; `firstrun.mjs` caught it) |
| Seeded boards in `shots.mjs` | v0.144.0's cats drew a random animation phase, shifting the deal of all 34 seeded boards | no decoration draws from the game's random stream; the boards deal as their baselines |
| `polish.mjs` failed checks | 17 of 25 | 0 of 25 |

What this does not prove: that the cat reads as a cat at 29 px on every launcher (it is checked by eye at 192 and in the header at 30), or that every browser grants a wake lock (where it cannot, nothing changes).

## v0.146.0: honest and uninterrupted (bible release 1)

The first release of the overhaul bible ([../bible/](../bible/README.md)), fixing what taking stock found
(B1–B5 and B8 in [00-baseline.md](../bible/00-baseline.md)).

| What | Before | After |
|---|---|---|
| Go again after a Quick Paws mix | dealt all 44 games (4 boards seen: 1 not Quick); Game Over said "Shuffle" | deals Quick Paws games (4 of 4); Game Over says "Quick Paws" |
| The best a run chases | one number for every Shuffle and Custom: a 60-second Custom run and a Calm mix were shown a 10-minute Full Purr best (9,000) | a best per kind and one for Custom; an old save's best carries over as the Full Purr's; pbBlitz stays the overall best for achievements |
| Window Seat (rare) | did nothing in any run that deals charms | the run's clock drains 13% slower (2.6 s in 3 s against 3.0) |
| Sharp Claws' price | never applied | the clock drains 25% faster (3.75 s in 3 s) |
| Charms that pay or cost time, in Endless | dealt (Endless has no clock) | never dealt (0 in 1,200 cards); timed runs still deal them |
| The daily gift after three days away, four days into the ladder | day 1, 20 yarn | day 5, 50 yarn, "Welcome back. Day 5 waited for you." |
| A cat's bond deepening mid-run | a toast and a fanfare over the board | banked at once, listed on Game Over under While you played |
| A note in a run (the first solve's) | slid over the pause button, the clock and the score (top 14 px) | under the score (top 110 px at 390 wide, 105 at 320), covering none of them |
| Tapping a notice | went through it (pointer-events none) | puts it away |
| A notice's sound | the level-up fanfare, every time | two soft notes of its own, uncaptioned; the gift's rising chimes are captioned "a reward", not "streak up" |
| Text | Reflex Rush "7 modes" (8); "N solved" and the colour helper's caption in English in every language | 8; both in the player's language |
| The busiest moment at 4× CPU slowdown | not measured | p95 frame 16.8 ms at 390x844 and 16.7 at 412x915 (median of 3), particles shed from 198 to 44–51 inside 2.5 s; at 20× it is 67–83 ms, so the probe can fail |
| `shots.mjs` | byte-exact; Meld "unstable" on about half of runs (one pixel, 1 of 255) | a 24 px / 3-of-255 anti-aliasing budget, counted in the output; an environment fingerprint (browser, font widths) beside the pictures |
| Perk and cat cards (axe 4.14, WCAG 2.5.3 label in name) | named by a label that left out the words under the name (8 findings) | named by what they show; equipped is told by pressed or not |
| Tapping two tabs quickly | an unhandled AbortError from the skipped page transition (a page error in Chromium 153) | the skipped transition's promises are caught |
| `honest.mjs` failed checks | 9 of 22 on v0.145.0 | 0 of 22 |
| `toasts.mjs` failed checks | 11 of 22 on v0.145.0 | 0 of 22 |

Found while verifying: the v0.145.0 baselines could not be reproduced on this session's fresh container, on
v0.145.0 itself, because it has neither Archivo nor Instrument Sans (the game names them and ships no web font),
so everything falls back to Inter and every board comes out 17 px taller. The pictures were re-taken from the
v0.145.0 build here and v0.146.0 compared against them; `shots.mjs` now refuses to compare across font
environments instead of reporting every board changed.

## v0.147.0: Purrfect, the Thread and the Bow (bible release 2)

| What | Before | After |
|---|---|---|
| A quick solve with no slip | the game's burst, a chime, a 16 ms pulse; nothing said how it was made | "Purrfect!" in gold under the score, three rising notes, a double pulse, a gold ring and a stamp, a 2 px kick of the frame round the board; 25% more points and 1 more yarn |
| A quick solve after a hint or a slip | the same | "Swift", a slide up, 0.2 more yarn |
| A careful solve of a board of two or more touches with no slip | the same | "Clean", a bright third note, 10% more points |
| Five Purrfects in a row | nothing | the Thread beside the multiplier ties a Bow: drawn over the board as an overlay (gone 2 s later), a bright chord, 500 points a stage and 5 yarn |
| A miss | the board shook up to 13 px | the board stays put; the Thread unravels if the miss cost something |
| A round that timed out | "Too slow" | "Time ran out on this one" |
| Odd Skein: a wrong tile with tries left | silent to everything but the tries (a quick solve after it could not be told from a clean one) | a slip: the solve after it is Swift at best |
| Game Over | led with the number, even a giant 0 | leads with the run's best true moment (a new best, a Bow, the fastest Purrfect with its game and time, ×5, a streak) or, for a run with no solves, the game met and its rule |
| `style.mjs` failed checks | 9 of 17 on v0.146.0 | 0 of 17 |
| `peakend.mjs` failed checks | 6 of 7 on v0.146.0 | 0 of 7 |

## v0.148.0: Room Radio (bible release 3)

| What | Before | After |
|---|---|---|
| Music | none (a three-sine pad in Fidget Loop only) | Room Radio: generated live in Web Audio, I-vi-IV-V in C at 76 bpm; the room's air and a pad from the start, a plucked arpeggio at ×2, brushes and a kick at ×3, bells at ×5; scheduled 120 ms ahead on a 25 ms timer |
| A miss | a falling tone | and the music muffles (low-pass to 900 Hz) and opens again over 1.5 s |
| A stage beat, a Bow | sound effects only | the progression lifts a tone; the bells come in for four bars |
| A Purrfect's three notes | fixed pitches in the family's key | the notes of the chord the music is on |
| Pause, Game Over | — | the music fades out; Game Over resolves to the home chord and stops |
| Controls | Sound and Volume | and Music (follows Sound) and Music volume; silent in Fidget Loop and the menus |
| Choosing effects | play to find out | Preview effects in Settings plays a solve, a Purrfect, a miss and a level-up at the current settings |
| `radio.mjs` failed checks | 5 of 5 that can run on v0.147.0 | 0 of 18 |

## v0.149.0: two doors (bible release 4)

| What | Before | After |
|---|---|---|
| How a mix is played | always against the clock (Shuffle, 10:00) | the player picks a door under "How is your brain today?": Cozy or Challenge (Challenge first) |
| Cozy | — | no clock, no score on show, no records; a miss cools the streak one step (×2 stays ×2 after six solves) and holds the Thread; every tenth solve is a stage with 10 yarn instead of a charm draft; adaptive difficulty eases after one miss; 0.6 yarn per solve at the end |
| The chip beside the multiplier | the final best ("Best 3,000") | where your best run stood at this moment ("Pace +767"), gold when ahead, grey when behind; the best run's score is kept every 10 s of play (about 60 numbers for ten minutes) |
| The HUD | one density | Minimal (score, multiplier, Thread, clock, the way out), Standard, Detailed (adds solves a minute and Purrfect rate) |
| While a round is live | everything at full strength | the game's name, perks, charms and the adaptive note step back to 70% after 1.2 s (opacity only) |
| Installing | only from the browser's menu | a quiet row in Settings when the browser offers it |
| `dualmode.mjs` failed checks | 14 of 19 on v0.148.0 | 0 of 19 |

## v0.150.0: never lose a run (bible release 5)

| What | Before | After |
|---|---|---|
| A run when the app is closed or reclaimed mid-way | gone (its XP and yarn were banked, the run was not) | written down when it pauses and after every round; the Play tab offers it back for a day ("Calm & Collect · 841 points · 10:00 left"); Resume restores the score, clock, streak, Thread, charms and lives and deals the round again; Let it go forgets it; never the Daily Drop |
| Ending a session | Back to menu | Tuck in: the room goes dark, the cats riding along asleep, a music box, one line about the session; first on Game Over after 30 minutes of play, once |
| Petting three cats | three taps | Pet everyone (2 yarn each, unchanged) |
| Collecting ready wishes | one by one | Collect all |
| A bad change to the save | only an exported file could undo it | a copy kept on the device each week (the last two), offered back in Settings |
| `resume.mjs` failed checks | stops at its first check on v0.149.0 (no Resume card) | 0 of 20 |

## v0.151.0: the Quilt (bible release 6)

| What | Before | After |
|---|---|---|
| Seeing everything you have played | a list of 44 games and a stars count | Your quilt in the Room: one patch per game, an outline until played, then knitted in its family colour, its stars stitched across it, its rank as its border, and the Gold Thread for a Lion solved Purrfect in at least half of its last twenty solves |
| A patch | — | a full-size button that opens the game's card with Marathon and Practise |
| A change since the last look | nothing marked it | the patch is stitched in when the quilt is next opened, then remembered as seen |
| The Room's picture | furniture you bought | also a small copy of the quilt on its wall, and things milestones add for good: a pom-pom garland (100 solves), a music box (500), a warm glow (1,000), a rainbow or a shooting star (2,500), a yarn mobile (5,000), a cat in the stars (10,000), a gold frame (ten Purrfects in one run), a rod (every game played), a lamp (every game a Lion) |
| `quilt.mjs` failed checks | stops at its first check on v0.150.0 (no quilt panel) | 0 of 16 |

## v0.152.0: make it yours (bible release 7)

| What | Before | After |
|---|---|---|
| What yarn buys | the Room's furniture and the cats | also four Sparkle kits in Settings (900 to 1,200 yarn), each adding its own shapes to every solve; two Room Radio stations (800 and 1,200); something for each cat to wear (150 to 600); treats (25 yarn for 10 bond, any time) |
| Buying | — | two taps: the first shows the price, the second buys; nothing needs a dialog |
| The Room Radio | one station | Hearth, Busy Paws (quicker, keys from the first heat), Rainy Window (slower, with rain), Music Box (from the 500th solve, not for sale) |
| A cat at the deepest bond | its own name only | a name of your own (12 letters), shown on its card and wherever it is named |
| Changing what you take into a run | cats, perks, sparkle and station one by one | Your kits, under Riding along in the Room: three slots; Save here keeps all four together, Use puts them back (only what you still own) |
| How you solve | — | You shows the share of your last hundred solves that were Purrfect, Swift and Clean |
| `kit.mjs` failed checks | stops at its first check on v0.151.0 (no kit for sale) | 0 of 14 |

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
PORT=8400 SITE=/tmp/site node tools/probe/captions.mjs
PORT=8400 SITE=/tmp/site node tools/probe/onehand.mjs
```
