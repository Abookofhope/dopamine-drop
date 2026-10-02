# Browser probes

Playwright probes that drive the built site in a real browser. They are the
reason most changes in this repo carry numbers rather than adjectives.

## Running

```sh
cd tools/probe && npm install && npx playwright install chromium   # once
cd ../.. && python3 tools/build_site.py _site
(cd _site && python3 -m http.server 8275 &)

node tools/probe/all.mjs         # the suite below, in order; stops at the first failure
```

Not in the suite because they take minutes (run them before a release):

```sh
MAX=1 node tools/probe/alive.mjs     # every board answers a real touch at maximum difficulty
node tools/probe/soak.mjs            # four minutes of real play across modes; nothing leaks between them
node tools/probe/shots.mjs           # byte-exact picture of every board against tools/probe/baseline/
node tools/probe/monkey.mjs          # random taps and drags in every mode, motion on
```

Or one at a time:

| Probe | What it answers |
|---|---|
| `sweep.mjs` | Opens every mode and looks for what an eye would catch: something outside the board, a target under 40px, a control with no name, an element that takes space and paints nothing, an SVG whose ink is black on black. Plus axe on each. |
| `board.mjs` | Do the four hand-built boards fit a 320px phone in German with colour assist on, and is every control named? |
| `mix.mjs` | Under a real touch gesture — not a synthetic click — do taps in the Mix tab add up, or does each one cancel the last? |
| `home.mjs` | Does the home tab hold up fresh, mid-climb, and with every mode mastered — four distinct picks, each with a reason, in four languages at three sizes? |
| `settings.mjs` | Does a settings row toggle when you tap it, does a row holding a button *not*, and does erasing your progress ask in the page? |
| `firstvisit.mjs` | Does a first visit load the page once, and does the offline worker still take control and apply updates? |
| `threads.mjs` | Measured in pixels: does every thread end on a peg, is a peg grabbed from a circle and not an ellipse, does Snip's trail end under the finger? Attempts where the round ended underneath the measurement are thrown out and retried. |
| `layoutshift.mjs` | Does the play area hold still around the board appearing, the first touch and the how-to line's timeout, in every mode? |
| `geometry.mjs` | Every mode at several viewports and levels: nothing past the board's edge, nothing overlapping that should not. |
| `alive.mjs` | Does every board answer a real tap and a real drag from a real control (not a pixel that happens to be first in the DOM)? |
| `timing.mjs`, `momentum.mjs` | The round clock, the streak heat and the stage beats, played by a bot. |
| `fx_unit.mjs` | The craft room's rules by value: what each cat and charm adds at each bond, wishes from a date, adoption without the yarn. Lifts the real source out of the build and runs it in a sandbox. |
| `meta.mjs` | The craft room played: a solve pays yarn, the tenth offers a charm, the results show what a run paid, a twist run never touches the Classic best, Stats and the Room in every language. |
| `forge.mjs` | Patchwork's three ways to finish (fill the hole, a straight line on an open quilt, a solid block) each played at three levels with a real mouse: every drop is up to nearly half a square off, patches are turned by tapping, a laid patch can be lifted and carried, Undo gives its move back, Hint turns the patch to suit, R turns the one in hand, there are patches to spare, the words under the board count down while the nearest line or block is outlined, and the finished quilt glows. The goal is forced through `dd.forge` so all three are always played. |
| `odd.mjs` | Odd Skein's paws and Sniff: the grid never passes seven across and never gets too small to hit on a 320px phone, three paws to start and one at the top, a wrong skein fades and takes a paw while there are paws left (and the words say how many), the third wrong ends the round and deals a new board, the right one still wins after a wrong tap, Sniff fades about half of what is left (never the odd one, no paw spent), in four languages. |
| `trace.mjs` | Follow the Thread, followed with a real mouse: the thread is a smooth curve with no sharp corner, the part followed turns bright, dragging from the dot to the ring wins at a new, middle and high level and on a 320px phone, wandering off for good loses and the words say you are drifting, wandering off a little does not (the meter empties while you are back on the thread, twice over), lifting a finger is free. The probe reads the thread from the `.trcline` path. |
| `tide.mjs` | Purr at the same speed on every screen: holding for 0.6 s swells the cat by the same amount at 60, 120 and 30 Hz (the page's animation frames are swapped for a clock of that rate) and about 0.6 of it at Slow game speed; a servo that keeps the cat in the band with a real mouse wins at a new and a higher level and at 120 Hz; the phone pulses while the cat is in the band (a stubbed `navigator.vibrate` counts) and is quiet outside it. |
| `glimmer.mjs` | Cat's Eyes with a real mouse: the lantern's pool of light is round and wide, Glow shows three at first and two later, carrying the light over every pair of eyes wins at a new, middle and high level and on a 320px phone, a swipe made of two events still opens the eyes it crosses, open eyes' pupils follow the light, and left alone the nearest closed pair stirs after a few seconds. |
| `audit.mjs` | One mode's board at three levels, for looking at (not in the suite): `MODE=odd node tools/probe/audit.mjs` saves a picture at a new, a middle and a high level to `/tmp/pw/sheets/` and prints the prompt, how many things answer a touch, the budget and the hint button. Used to see what a mode feels like before changing it. |
| `loaf.mjs` | Loaf Box, the endless one, played the way a thumb does: the bot solves the box from what is on screen and plays it with a real mouse, every loaf dropped a little off; after every loaf the page's box is compared to the box its own copy of the rules gives (a full line clears, nothing else changes) and the placed slot is refilled. Also: three fixed tray slots that never shift when a loaf is lifted or turned, the preview lights the exact landing, Undo gives the loaf and the move back, the box carries on into the next round, Hint, tap-a-loaf-then-the-box, and a smoothness guard (a throttled drag forces no layouts and stays in budget). |
| `blast.mjs` | Yarn Ball Blaster played with a real mouse from what is on the screen: the ball in the paw is a colour on the front of the wall, a match pops it and the group of that colour touching it (and nothing else), a wrong colour pops nothing and hurries the wall, the wall comes down in whole-ball steps and a ball on the line loses, press-and-slide aims and the paw follows, letting go below the wall puts the shot back, tapping the paw swaps, Enter on a lane fires, and a bot that reads the wall clears it at every level at a speed a person can keep up with. |
| `sand.mjs` | Sandbox of Softness played from what is on the screen: a picture of squares that all look alike until sand of their colour is caught, a chute over the first belt slot with the picture beside it, a bot that loads the belt for the grain the back of it will meet and completes the picture at three levels, a grain that finds no scoop is said to roll round again and costs a move rather than the picture, and a 320px phone. |
| `yarn.mjs` | Yarn Tangled Tangle played with a real mouse: crafts drawn, named and priced (never numbers) with the day's best price said, the till counting Coins of Gratitude, a bot that works the board out with the game's own sums and plays it by dragging twins together and tapping to gift, reaching the goal (the score moves), More yarn buying a thread next to its own kind, and a 320px phone. |
| `gate.mjs` | The menu: three kinds of game (Calm & Collect, Quick Paws, The Full Purr) named with their presentation and a line for the feel, plus Custom and a Daily Drop row, all on one screen with a four-tab bar; every one of the 44 games is in a kind (never both calm and quick; the Full Purr shows the four newest first); opening a kind shows all its games and a Play a mix button that deals from it; a game starts on its own; the back gesture closes a kind; Custom opens the playlist builder; You switches between Progress and Settings; and the same in French, Spanish and German at 320px. |
| `mirror.mjs` | Mirror Stitch played with a real mouse: nothing on the far side is picked out at any level (a decoy square used to be marked in orange from level 14 and read as a glitch in the pattern), both folds (down the side, and across the top from level 8) are played until each has been seen twice, a finger dragged over two squares lights both, a square tapped twice goes dark, and lighting exactly the reflection wins. |
| `chalk.mjs` | Chalk Line: the answer the round was built from is drawn with a real mouse at five levels and on small screens and must win; the chalk runs out and says so, Undo gives it back, Peek shows where the yarn would go and is limited, a line that does not help loses. Needs `localStorage.dd.probe`, which it sets, for the app to hand over the answer. |
| `chalkseed.mjs` | Chalk Line one seeded board at a time (not in the suite): `SEEDS=1-60 XP=12000` draws the answer with a real mouse and says which seeds miss, `PEEK=1` adds the game's own Peek prediction, and `JITTER=0.4 TRIES=4` moves every point and reports the boards whose answer only works when drawn perfectly. It found the knife-edge boards behind the intermittent `answer wins (miss)`. |
| `drag.mjs` | Every mode that can be played by picking a piece up and letting go of it, played that way with a real mouse: Stitch Count, Mirror Stitch, Let the Cat Out, Sorting Basket, Tumble Dryer, Latch Hook, Even Skeins and Heft. A lifted copy follows the finger, the piece stays in its slot, the target lights, and letting go does what tapping would. |
| `tidyspawn.mjs` | Tidy Up from the first frame: every frame for 1.5 seconds after the board appears, no piece is on a basket or off the board, at phone, tablet and landscape sizes, at several levels, with motion on and reduced. The suite runs the short matrix (twelve boards); the full one is `FULL=1 node tools/probe/tidyspawn.mjs`. |
| `stable.mjs` | Do the squares of a board hold their size and place while it draws in, and while it is pressed, in every mode? Watches every box on the board every 16ms; anything that changes size by more than 1.5px or moves by more than 2px is reported unless it is something meant to move. |
| `zone_unit.mjs` | Just Play's zone by value: at the top multiplier the clock stops, but only while each puzzle is being solved at a real pace and only for the run that has a zone. |
| `soak.mjs` | Four minutes of real play (taps on real controls, not random pixels); reports a play area that moved under a live board. |
| `monkey.mjs` | Random input in every mode with motion on: page errors, hangs, and the play area moving under a board that is still the same board (a prompt that wraps to a second line does this). |

Environment: `PORT` (default 8275), `SITE` (default `/tmp/pw/_site`, where
`home.mjs` reads the mode roster from), `VW`/`VH` and `MAX` for `sweep.mjs`,
`MODES` for `board.mjs`, `AXE` to point at `axe.min.js` if it is installed
somewhere unusual.

Each probe exits non-zero when it finds something.

`SITE` and `PORT` must point at the same build: probes read the version and the mode roster from `SITE` and open the page on `PORT`.

## Why `harness.mjs` exists

These probes used to live in a scratch directory with the navigation inlined in
each one. Changing where the Modes tab lands invalidated the selector in **eighty
of them at once**: one passed silently with `0/0 clean`, and seventy-nine hung on
a timeout. The repair was a regex over eighty files, which is the wrong shape of
repair.

So: anything about *how you reach a screen* lives in `harness.mjs` and nowhere
else. If the navigation changes again it is one edit.

Three rules the helper enforces, because each one has caught a real bug here:

- **Modes are opened by id, not by displayed name.** `openMode(page, 'sift', …)`
  works in German without the probe knowing the German for Sift. The ids come
  off `data-id` on the card, which exists for exactly this.
- **`openModeList` throws** if it reaches the Modes tab and finds no mode cards,
  rather than letting the caller hang or sweep nothing.
- **`floorOrDie`** fails a probe that found less work than it should have. Zero
  of zero is not a pass — that is how the sweep reported success at having done
  nothing for a whole afternoon.

`openApp` also dismisses the welcome screen and the changelog sheet, because a
probe that forgets them measures the welcome screen.
