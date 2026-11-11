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

## v0.153.0: the living room (bible release 8)

| What | Before | After |
|---|---|---|
| The window | the same all year | the season: snow, blossom, sun, falling leaves |
| Seasonal things | — | four small things for the sill each season (300 to 900 yarn), under The room in the Room; every other season's are in the Archive at the same price, so nothing is ever gone (bible E4) |
| A reason to try a game this week | — | This week's pattern on the Play tab (from the third run): one game and one of its boards, chosen from the date alone so it is the same for everyone (Classic for a player who has not opened that board), paying yarn ×1.5 in Marathon all week |
| A surprise in a run | — | a lucky skein: about one solve in forty pays double yarn, with a gold thread and a chime and a caption of its own; never two within ten solves; rolled on its own generator so the boards are not shifted |
| Sharing a Daily | a link to the game | the link carries the score after each round; a friend who opens it the same day races it, with a Friend chip beside the multiplier; a link from another day is ignored; the link is tidied out of the address bar; read on opening the app and when it arrives while the app is open |
| `seasons.mjs` failed checks | stops at its first check on v0.152.0 (no seasons) | 0 of 14 |

## v0.154.0: what the full chain found

The full chain on v0.153.0 passed 78 of 86 steps. Everything it found is fixed here, and the gate and probes now hold it.

| What | Before | After |
|---|---|---|
| Patchwork's quilt | since v0.151.0 collapsed into a column, its tray over Undo (the Room's quilt took the class name `.quilt`) | as it was; the Room's grid is `.rquilt` (`forge.mjs`, `clear.mjs`, 34 of 34 screenshots unchanged) |
| The rows of numbers on You | since v0.152.0 laid out by the style card's rules (`.srow`) | as they were; the style card's rows are `.stylerow` |
| The Lucky paw perk's note | since v0.153.0 "A lucky skein! ×2 yarn" (a second `fx.lucky` key won) | "Lucky paw!"; the skein has its own key, and the gate refuses a key written twice in one language (it found three more, `over.*`, older than this work) |
| A lucky skein with reduced motion | a sound only (its words were a float, which reduced motion turns off) | "Lucky skein ×2" under the score, after the grade |
| The Play menu at 400×820 | 37 px past one screen since v0.149.0's doors | fits: one line under each door, a little less padding (`gate.mjs`) |
| This week's pattern | a card on the Play menu | in More ways to play, beside Marathon; the menu stays three kinds, Custom and the Daily |
| The Yarn Shop's More yarn button | named "Buy … for 12 Coins of Gratitude" while it shows "More yarn · 12" (axe 4.14, WCAG 2.5.3) | named by what it shows first, then the details (`board.mjs`) |
| `fx_unit.mjs`, `style.mjs`, `tumble.mjs` | red since v0.146.0 (old charm rules); one run in two; crashed on a one-colour drum | updated to the v0.146.0 rules; 6 of 6 runs; picks a two-colour drum |

## v0.155.0: the kinds say how they feel (bible B9)

| What | Before | After |
|---|---|---|
| Under each kind's name | ADHD subtype names: "(Predominantly Inattentive)", "(Predominantly Hyperactive-Impulsive)", "(Combined)", and the same in French, Spanish and German | how it feels: "Slow and soothing", "Quick and bright", "A bit of both" (and "Lent et apaisant", "Lento y relajante", "Langsam und beruhigend", ...) |
| A clinical word in the build | nothing stopped one | `check_site.py` refuses ADHD (and TDAH, ADHS), subtype and diagnostic words in any of the four languages (fails on v0.154.0, passes on v0.155.0) |
| `gate.mjs` | expected the subtype names | expects the mood words |

## v0.156.0: the load-up opens with Books Entertainment

| What | Before | After |
|---|---|---|
| Opening the app | straight to the Play menu | the Books Entertainment intro ("The Forging", about 12 s): cold letters behind glass, the glass cracks and bursts, the pieces forge the name in gold; then it fades to the game, which has been starting underneath |
| Skipping it | — | a tap anywhere, or Escape, Enter or Space; a Skip button (44 px) has focus for keyboards and screen readers |
| Reduce motion | — | the finished name for a moment (about 2 s), then the game |
| The intro's own code | — | the studio's page byte for byte, played in a frame of its own: its class names (`.wordmark`, `.stage`, `.hint`) and colours cannot reach the game's; the game adds only a Reduce motion signal and hides the page's "click for sound" line |
| `splash.mjs` | stops at its first check on v0.155.0 (no intro) | 0 of 11 |

The first-solve measure (bible 13, target under 5 s) now counts from the end of the intro, or from the first tap, which skips it.

## v0.157.0: every board plays from the keyboard (bible 13, AAA accessibility)

| What | Before | After |
|---|---|---|
| A board with nothing to tap (Tidy Up, Chalk Line, Trace, Siphon, Cairn, Gather, Ripples, Snip, Dropped Stitch, Purr) | needed a mouse or a finger | Tab to the board: the arrow keys move a crosshair over it (Shift for fine steps), Space presses where it is (held, it drags or holds), Enter taps |
| A board of buttons | Tab and Enter reached its buttons, but not what lies between them (a bar's end, a peg) | the same buttons, and the pointer for everything else |
| How the pointer reaches a game | — | the same pointer events a finger sends, so every game answers as it does to touch and no game's rules changed; a game that captures the pointer gets it, and a click lands on what the press and release share |
| The board itself | not focusable | a Tab stop named "Board", described by its keys in four languages; the crosshair shows only while it has focus |
| `kbd.mjs` (new) | 44 of 44 games fail (no board takes focus) | 0 of 44 |

## v0.158.0: the intro plays every launch, and is skippable after one full watch (the owner's rule)

| What | Before | After |
|---|---|---|
| The first launch on a device | the intro could be skipped at once | it plays through: no Skip button, and taps, Escape, Enter and Space do nothing (and reach nothing behind it) |
| After one full watch | — | kept in the save (`introSeen`); every later launch still plays it, and a tap or a key skips it |
| Reduce motion | — | its short version (the finished name) counts as a full watch |
| A frame that fails to load | — | the game is let in after a safety timeout, but that is not counted as a watch |
| `splash.mjs` | 11 checks | 15; the new five fail on v0.157.0 |

## v0.159.0: the studio's web v8 intro (the owner's request)

| What | Before | After |
|---|---|---|
| The intro's page | the uploaded Books Entertainment page (62 KB) | the studio's web v8, byte for byte (94 KB): fog and dust in the light, cracks that branch from one point, the camera moving through the frozen pieces, molten gold filling each letter, a mirror image under the name |
| Smoothness | one level of detail | the page picks a level of detail from the device and drops a level if frames run slow |
| Length | about 12 s | about 13 s (the page's own data-end); every rule from v0.158.0 is kept |
| `splash.mjs` | 15 checks | 16; the new one (a fog layer and a quality level, which only v8 has) fails on v0.158.0 |

## v0.160.0: a smooth first launch after an update (AAA, performance)

Measured at 4x CPU slowdown, 390x844 and 412x915, three runs each, with the intro playing (frames over 120 ms in the first 2 s).

| What | Before | After |
|---|---|---|
| The busiest moment in play (`framebudget.mjs`) | p95 16.7 ms at 4x; holds 60 fps to 8x, 30 fps at 12x | unchanged: already at the AAA target with twice the margin |
| What's new, on the first launch after an update | built all 218 releases at once (1,640 elements) | builds what is new to the player, at least three (19 elements for three); "Older updates" builds the rest on request |
| The freeze it caused, about 1.5 s into that launch | 300–480 ms, in 6 of 6 runs | gone, in 6 of 6 runs |
| The start-up freeze, about 0.35 s in (compiling the page's one script) | 450–680 ms | unchanged; noted, not fixed (splitting the script is an architecture change) |
| The release history | 0.71.0 was written as a second 0.70.0 | fixed; `check_site.py` now refuses a history that is not newest first with each version once, or whose newest entry is not the build's version |
| `logsheet.mjs` (new) | 7 of 13 fail on v0.159.0 | 13 of 13 |

The intro itself, measured the same way, runs at a median of 33 ms per frame at 4x in this container (it draws its canvas in software here, which overstates a phone's cost), and its own governor steps down from "high" to "light" within 7–9 s. It is the studio's page, kept unchanged, so it is measured here and not tuned.

## v0.161.0: the promises the roadmap left unprobed (AAA)

| What | Before | After |
|---|---|---|
| A lucky skein pays exactly double | not probed | probed: the lucky solve gains 2.0 against a 1.0 base, every other solve exactly its base, and the stored wool grows by exactly the sum of the payouts |
| A friend's Daily, raced on your first Daily of the day | broken since v0.153.0: your best for today is 0, so the first point "beat" it; the chip said New best and the race never showed | the chip says Friend and how far ahead or behind you are from the first round; only a best that exists can be beaten |
| A friend's link from another day | not probed | probed: not raced |
| The first 90 s, five new players at 0.5–1.8 s a board | "partly done" (two checks) | probed: a grade and the Thread on screen in 5 of 5 runs (the bible asks 4); knots tied are reported (3 of 5 and 5 of 5 in two runs: a matter of pace) |
| `promises.mjs` (new) | — | 16 of 16; with only the Daily fix reverted, its 4 race checks fail |

How the probe went wrong on the way, all in the probe, none in the game: a solver for Odd Skein that reads colours from the DOM must use only the board on top (a Daily round stacks boards), skip the tiles a wrong tap rules out, and judge "lightest" perceptually; a Daily round of several boards scores only when the last is solved; and a stage at ten solves asks the player to choose a charm, which a bot has to answer.


## v0.162.0: tablets (AAA, platforms)

| What | Before | After |
|---|---|---|
| The screens on a tablet (768x1024 to 1180x820) | a 460px phone column; 154–360px empty on each side | a 640px column, centred with a margin; phones unchanged (`--colw`, one variable for the column and the sheets) |
| A board on an upright tablet (820x1180, Patchwork) | 6x6 cells about 66px | about 96px |
| Every board at 820x1180 and 1024x768 (`sweep`, `geometry`) | — | 44 of 44 clean at both |
| Patchwork on a short, wide screen | its note sat on the grid's top row, and Undo and Hint ran off the bottom (also at 460px, and on phones on their side) | the note keeps a strip of its own; the quilt is sized from the board's own inner height, not the surface's (which counted the surface's padding) |
| `tablet.mjs` (new) | before the Patchwork fix, its board check fails at 1024x768 (the note over the grid) | 23 of 23 |

Not done here: native Android and iOS shells (they need store accounts) and a two-pane layout for sideways tablets (the boards are drawn upright, so a sideways tablet still shows one centred column).

## v0.163.0: Pond Skate, the winter game (AAA, content)

The bible's AAA content line is "a new game each season, built to the same rules". This is the first.

| Rule | How Pond Skate keeps it |
|---|---|
| A loop in one sentence | slide the cat, to reach the basket with the yarn, to get the next pond |
| A real choice with a cost | every slide spends a move; the budget is the pond's true shortest route (found by search before the pond is dealt) plus a slack that shrinks with level; run out and the round is lost |
| Scales past level 20 | pond 5x5 to 8x8; yarn 0 to 3; target route length from 2-3 moves to 7-12; from level 20, thin ice that turns to water once crossed |
| Never unfair | a pond is dealt only if it can be done; the probe solves every pond it sees with its own search and wins it with the arrows |
| Four languages | name, blurb, prompts, arrow names, the thin-ice note and five quips in en, fr, es, de |
| A signature | snow: stars and dots drifting, in ice blue (no other game uses that style with those shapes) |
| Keyboard and Reduce motion | four named 44px arrows (Tab, Enter); a tap in line with the cat; the keyboard pointer's Enter works through the same tap; the cat glides, or moves at once with Reduce motion |
| No rush | in Calm & Collect; kept all year, like the season sets in the Archive |
| `skate.mjs` (new) | 14 of 14 |

Found by its own probe before shipping: the cat never glided (setting the transition's duration and then resetting the shorthand wiped it). Fixed by setting the whole transition in one place.

## v0.164.0: every game complete, or the build stops

| What | Before | After |
|---|---|---|
| What a game needs besides its board | a README checklist, followed by hand | `check_site.py` refuses a build where any game lacks its five quips, a signature, a kind, a card icon, or a probe that names it; the floor of games is 45 (it was left at 44 when Pond Skate shipped) |
| Games no probe had ever named | Peekaboo, Dye Pots (covered only by the all-games walks) | each has its own probe |
| Peekaboo | not probed | the probe follows every marked swap itself; at three levels the cats are where it followed them, and every swap moves a cat |
| Dye Pots' mixed pots | offered only when the mix's colour was not among the dyes; from level 18 all six are, so they never came | the mix's colour leaves the dyes when a mix is chosen; `dyepots.mjs`' two mix checks fail on v0.163.0 |
| `peekaboo.mjs`, `dyepots.mjs` (new) | — | 12 of 12, 8 of 8 |

## v0.164.1: the intro plays as a recording (the owner's request)

The owner found the intro still lagging and asked why a film on a television does not: a film's frames are already
drawn, and the intro was being drawn live. So it is now recorded once, every frame at the top quality setting, and
played back.

| What | Before | After |
|---|---|---|
| How the intro is shown | the studio's page, drawn live in a frame | a recording beside the page (`intro/splash-phone.mp4`, 864x1920, 7.2 MB; `intro/splash-wide.mp4`, 1920x1080, 9.2 MB on a wide screen): 60 fps, the top quality level |
| With the page's processor slowed 4x (phone-sized, headless Chromium) | 25 to 34 fps through the burst, freeze and forge, at the lowest quality level | 3 of 837 frames dropped |
| The same, 6x | 17 to 23 fps | 0 frames dropped |
| When the recording cannot play | — | not ready to play through within 2.5 s, missing, or the browser saving data: the live page plays, as before |
| Reduce motion | the live page shows the finished name | the same; no recording is fetched |
| The rules from v0.158.0 | every launch; skippable only after one full watch | the same: the recording's own ending is the full watch |
| The service worker | caches what it fetches | leaves the recording to the browser (a video is fetched in pieces); offline, the live page plays |
| The live page's own quality rule | it lowered its detail when frames ran slower than about 30 a second (33 ms), for 24 frames | slower than about 50 a second (20 ms), for 20 frames: it aims for 60. The page is otherwise the studio's web v8, byte for byte |
| `splash.mjs` | 16 checks | 28: eleven for the recording (the first fails on v0.164.0) and one for the 60-fps rule; the page's own checks now run with the recording blocked |
| `check_site.py` | — | both recordings present and MP4s, named by the page; the worker leaves them alone |

The slowdown in rows two and three is of the page's own thread, where the live intro is drawn; a recording is decoded
outside it, which is why it holds. Not checked: on a real phone. A first visit now downloads the recording (7.2 MB
on a phone) as it plays.

## v0.165.0: a start about half as long (AAA, performance)

Measured at 4x CPU slowdown, five visits in one persistent browser profile (so the worker and caches carry over).

| What | Before | After |
|---|---|---|
| The game's script | 1.5 MB inline: parsed and compiled on the main thread at every launch | `app.js?v=<hash>`: compiled off the main thread as it arrives, and its compiled code kept once the worker has cached it; the source is still one file, only the build splits it |
| The longest task of a launch | 325–416 ms (median of visits 2–5: 363) | 170–251 ms (median: 189) |
| An update | one file, so page and script could never disagree | the script is named by its hash, so a new page can never be served an old cached script |
| Offline after one visit | worked | still works (`startup.mjs` opens the game and plays a board offline) |
| Readers of the build | read `index.html` | the gate and the probes read it with `app.js` put back (`builtSource()`, `built.mjs`), so no check changed; the gate also checks the page loads the script by its own hash and the worker caches that file |
| Pond Skate | no help; a pond the ice had closed ran the moves down | a Hint (two a round) lights the first arrow of a shortest way; a closed pond says "The ice has closed the way through" and ends |
| `startup.mjs` (new) | 2 of 5 fail on v0.164.0 | 5 of 5 |

## v0.166.0: six things a season (economy)

| What | Before | After |
|---|---|---|
| Season sets | four things each (16 in all; 2,250 yarn a season) | six each, the bible's "about 6" (24 in all; 4,200 a season): cocoa, a sled; a bird's nest, an umbrella; a seashell, lemonade; acorns, a striped scarf, at 750 and 1,200 |
| The window sill | showed four, so a fifth or sixth thing bought would never be seen | shows six; four or fewer keep their old size and places, five or six sit a little smaller round the same middle |
| `seasons.mjs` | 16 things | 24, and six owned all on the sill without overlapping (that check fails on v0.165.0) |

## v0.167.0: Pond Skate's achievements

| What | Before | After |
|---|---|---|
| Achievements for Pond Skate | none (the earlier new games each had their own) | Not a Slide Wasted: 10 ponds in exactly their shortest route (80 yarn); Thin Ice Waltz: a pond with thin ice in exactly its shortest route (150 yarn); both reward skating well, not skating a lot |
| `skate.mjs` | 18 checks | 22: the game counts each pond skated in its shortest route at three levels, and the counts earn both achievements |

## v0.168.0: Pond Skate sounds like ice (juice on the verb)

| What | Before | After |
|---|---|---|
| A slide | the generic tap | a swish: a falling sine, longer for a longer slide |
| A bump into a snowbank | a buzz only | a soft thud (a low triangle) and the buzz |
| Thin ice cracking | silent; the cell changed | a two-note crack; the water appears with a short flash (motion only) |
| Yarn picked up | points only | a ring and a burst of stars and dots in the game's own signature (motion only) |
| `skate.mjs` | 22 checks | 24: the probe wraps the page's oscillators and hears a sine on a slide and a low triangle on a bump (both fail on v0.167.0); its closed-pond search goes four slides deep over sixteen ponds, after three over eight missed once in five runs |

## v0.169.0: a voice for every family of games (AV)

| What | Before | After |
|---|---|---|
| The sounds each game uses (audit of every game's code) | 44 of 45 used only the generic `tap`, `good` and `bad`: a tile, a peg and a letter clicked alike | — |
| A tap inside a live round | a square blip at 520 Hz × the family's key, whatever the game | the family's voice: focus a clear triangle chime, reflex a short bright square, logic a woody triangle knock, numbers a small sine bell, words a low typewriter square, calm a soft long sine, physics a falling pluck, make a soft rising sine; in the family's key, detuned as before |
| A tap in the menus | the plain tap | unchanged |
| The gate | — | refuses a family without a voice |
| `voices.mjs` (new) | 3 of 6 fail on v0.168.0 | 6 of 6 |

## v0.170.0: Pond Skate, read aloud (accessibility)

| What | Before | After |
|---|---|---|
| The pond for a screen reader | "Frozen pond" and the prompt: the arrows were named, but nothing said where anything was | the board's name reads the pond: the cat's, the basket's and the yarn's row and column, and the ways the cat can slide; updated after every slide; en, fr, es, de |
| `skate.mjs` | 24 checks | 27: the name matches what the probe reads off the pond, before and after a slide (both fail on v0.169.0), and the board passes axe |

## v0.171.0: two panes on a tablet on its side (platforms)

| What | Before | After |
|---|---|---|
| Playing at 1180x820 | one 640px column: the score, the Thread and the prompt above a board about 500px tall | two panes in a 1,080px frame: the score, the Thread, the prompt and the board's chips on the left (260-320px), the board on the right at 810px tall |
| Playing at 1024x768 | the same column, the board about 500px tall | the board 596x758 |
| Menus, sheets and the header on a tablet on its side | the 640px column | unchanged: only play takes the width |
| Upright tablets and phones | — | unchanged |
| `tablet.mjs` | 23 checks | 27: two panes on its side (the board beside the score and at least 90% of the height), one column upright; the column and the sheets are measured against the screen you see; and every board is checked at 1024x768, now in two panes |

## v0.172.0: Puddle Hop, the 46th game (content)

| Rule | How Puddle Hop keeps it |
|---|---|
| A loop in one sentence | read the stone, hop that far, to reach the basket |
| A real choice with a cost | every hop spends a move; the budget is the board's true shortest route (searched before dealing) plus the shared slack; dead ends exist, and a hop into one is announced and ends the round |
| Scales past level 20 | 5x5 to 8x8; numbers to 4; target routes from 2-3 hops to 6-9; more puddles from level 10 |
| No hidden rules | a stone always means exactly the number it shows (a "slippery stone that hops one further" was designed and dropped for that reason); the cat's own number rides on it as a badge |
| Four languages, a signature, a door, a voice | en, fr, es, de; raindrops that bounce (no other game pairs that style and shape); Calm & Collect; the numbers family's bell for its taps |
| Accessibility | the lit stones are buttons named for where they are and the number they show (axe's label-in-name rule caught the first version, which left the number out); the board's name says where the cat and basket are |
| The gate | refused the build until a probe named it |
| `puddle.mjs` (new) | 21 of 21 |

## v0.173.0: Puddle Hop sounds like hopping

| What | Before | After |
|---|---|---|
| A hop | the numbers family's bell, like any tap | a spring (a sine rising by half) as the cat jumps, and a soft landing (a low triangle) on the stone, in the numbers key |
| `puddle.mjs` | 21 checks | 22: hears a sine and then a low triangle on a hop (fails on v0.172.0, which plays the bell) |

## v0.174.0: Your sessions, and a check-in you switch on (Insight, on the device)

| What | Before | After |
|---|---|---|
| Session length, first point, door, Tuck in | not counted anywhere (the roadmap's Insight row waited on a backend and a privacy review) | counted on the device for the last thirty sessions and shown as medians in the Last 14 days panel under Progress (a fifth panel broke the four-panel, one-screen rule `panels.mjs` holds); nothing is sent, so no backend and no data leaves the phone |
| Does a session leave you better? | no way to tell | an opt-in check-in: one tap before (on the menu) and one after (on Game Over), Low, Okay or Good; the card says how often you finished better, the same or lower, and that it is a note to yourself, not a measurement |
| A session | — | the first run after half an hour away (the half hour Tuck in uses) starts one |
| `sessions.mjs` (new) | — | 24 of 24; fails on v0.173.0 (no card) |

## v0.175.0: three games played without dragging (WCAG 2.5.7)

| What | Before | After |
|---|---|---|
| The audit | 2.5.1 and 2.5.7 marked Partial, never checked mode by mode | read mode by mode: 24 drag games already had a tap path; Tidy Up, Dye Pots, No Crossing, Patchwork, Slice and Chalk Line did not |
| Tidy Up, Dye Pots, No Crossing | a piece moved only by dragging it | a tap picks it up (ringed, announced as pressed, "Now tap where it goes"), a tap places it; a shaky tap still counts as a tap; dragging unchanged |
| Keyboard play | a press and release on the spot did nothing in these three | a pick-up or a place, as for a finger (the keyboard pointer sends a finger's events) |
| `taponly.mjs` (new) | — | 13 of 13: each of the three won at a low and a high level with taps alone; fails on v0.174.0 |

## v0.176.0: Patchwork, Snip and Chalk Line without dragging; every game by taps

| What | Before | After |
|---|---|---|
| Laying a patch | only by dragging it onto the quilt (a tap on a tray patch turned it) | a tap still turns it and also chooses it (ringed, pressed, "Tap again to turn it, or tap the quilt where it goes"); a tap on a quilt square lays it at the fit around that square nearest by its own squares; a square it cannot cover flashes and nothing is spent |
| Keyboard | Enter on a tray patch turned it | it turns and chooses it |
| Snip, Chalk Line | a cut or a ramp only by swiping or drawing a path | a tap sets where the line starts (a ring, "Now tap where the line ends"), the next tap makes the straight line: Snip cuts what it crosses, Chalk Line chalks it with the same ink (stopping where the ink runs out) |
| `forge.mjs` | dragged every patch | TAP=1 lays every patch with taps: nine quilts finished, 49 of 50 patches where aimed |
| `taponly.mjs` | 13 checks | 25: Patchwork's choose check, a hint-led quilt by taps, the TAP=1 run of `forge.mjs`, Snip won at two levels by two-tap snips, Chalk Line's answer laid by two-tap lines and won at two levels |

## v0.177.0: an off switch you can see (WCAG 1.4.11)

| What | Before | After |
|---|---|---|
| An off switch's outline against its card | 1.39:1 (`--edge`), so an off switch read as a knob on its own | 4.31:1 (#7B69CC); 7.82:1 in High contrast |
| Knobs, tracks, focus ring, chevrons, tab icons | not measured | measured on the pixels: 5.80:1 to 13.06:1 |
| `nontext.mjs` (new) | — | 14 of 14; fails on v0.176.0 (the off outline) |

## v0.177.1: the intro's cracks reach the edges, and it switches off (the owner's requests)

| What | Before | After |
|---|---|---|
| The cracks before the shatter | the first crack crossed the pane; the others stopped where they met another | seven to nine main cracks run from the blow all the way to the edges, each aimed at its own point on the frame |
| How the intro ends | it held on the gold name, and the game faded in over it | the name is held for 0.6 s, the last 0.4 s under static; the power cuts; the picture collapses to a line, then a dot; the afterglow dies; black. The game fades in from black |
| The recordings | 13.95 s; 7.2 MB upright, 9.2 MB widescreen | 14.7 s; 8.9 MB upright, 9.8 MB widescreen |
| The live page (the fallback) | ended on the name; `data-end` was that moment | the same ending; `data-end` is the moment the screen is black, and `data-named` the moment the name is done |
| Reduce motion | the finished name | the same: no static, no switch-off |
| The shards, the burst, the forging | unchanged | unchanged |
| `splash.mjs` | 28 checks | 29: the new one (every main crack reaches the frame) fails on v0.177.0 |

Not checked: on a real phone.

## v0.177.2: a dimmer afterglow in the intro (the owner's request)

| What | Before | After |
|---|---|---|
| The gold light round the finished name | the fog, the light behind the name, the glow round the letters and the shafts through them stayed at full strength until the set was switched off | once the forging's flash has passed they settle, over about two seconds, to 30% |
| The name itself, its reflection, the embers | unchanged | unchanged |
| Everything up to the forging, and the switch-off | unchanged | unchanged (the recordings' first ten seconds are the same frames) |
| Reduce motion | the finished name in full light | the finished name in the dimmer light |
| `splash.mjs` | 29 checks | 30: the new one (the live page reports how much gold light is left) fails on v0.177.1 |

Not checked: on a real phone.

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
