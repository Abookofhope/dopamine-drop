# Motion

How things move in Dopamine Drop, and the rules that keep motion from costing a frame, hiding a control or moving a square. Shipped in v0.144.0. The code is the `Vfx` module and the "Motion" and "Shell motion" CSS blocks in `site/app.html`; the probe is `tools/probe/motion.mjs`.

## Principles

1. **A square never moves.** A piece on a board answers a solve through a ghost (`.fxghost`): a copy of its outline laid over it outside the board, which glows, grows and fades. The piece itself may only change colour, light or opacity. `stable.mjs` holds every board to this with motion on.
2. **Everything that flies is drawn on one canvas.** `#fxCanvas` covers the screen (fixed, z 75: above the board, the level card and the pause sheet; below sheets and toasts), takes no touch, is hidden from screen readers and lives outside `#surface`. Particles are pooled; the frame loop runs only while one is alive.
3. **A late frame takes something away.** A frame over 26 ms lowers the live-particle cap by 10 (floor 70); an on-time one lets it creep back to 260. Asking for two thousand at once leaves at most 260 alive.
4. **Endless means transform or opacity, and never a part inside a drawing.** An endless animation on a part of an SVG drawing cannot be handed to the compositor: the run's mascot breathing and blinking that way made a Loaf Box drag cost 113 to 124 layouts where it had cost none. Idle life inside drawings is a moment that plays and stops. An animation that loops forever (a glow, a sheen, a cat breathing) moves only transform or opacity. The glows that used to repaint a shadow every frame (the hot streak, the level ring, the Daily) are now a layer whose opacity breathes. No keyframe in the app animates a layout property.
5. **Arrivals ease out, departures ease in, living things spring.** Tokens: `--m-quick` 140, `--m-base` 260, `--m-slow` 520, `--m-stage` 900 ms; `--e-out` (expo out), `--e-in`, `--e-snap` (overshoot) and `--e-spring`/`--e-soft` (`linear()` springs, falling back to an overshoot curve).
6. **Off means off.** Reduce motion (or the system asking for less) stops every particle, ghost, veil, sweep, idle loop and entrance; `html[data-motion]` carries the state so CSS-only decoration stops too. **Big celebrations** off keeps the small touches and drops confetti, light sweeps and the screen-edge glow.
7. **Nothing waits on motion.** No effect delays a tap, a round or a screen; Game Over's buttons only fade in, so they are where they will stay from the first frame.

## The engine

| Call | What it draws |
|---|---|
| `Vfx.solve(node, colour, tier, id)` | the game's signature (below), its ghost, its ring; from ×3 a ring for everyone, from ×4 glints and (Big celebrations) a confetti fountain |
| `Vfx.miss(node, id)` | a pulled thread scribbled across the piece, and the game's own shapes slumping off it in grey |
| `Vfx.bit(x, y, id, good)` | a little of the signature for a game's own chime or buzz inside a live round, where the finger last was |
| `Vfx.cannons(n)` / `Vfx.rain(n)` | confetti from both lower corners / from the top edge (Big celebrations) |
| `Vfx.sweep(node)` / `Vfx.veil(colour)` | a band of light across a box / the screen's edge glowing (Big celebrations; the veil also obeys Screen flashes) |
| `Vfx.embers(node, heat)` | embers rising off the multiplier from ×3 |
| `Vfx.hearts(node)` / `Vfx.tap(node)` | hearts off a petted cat / a ring and two glints off a big button |

Shapes: dot, glow, spark, ring, ellipse ring, confetti (it flips as it falls), patch, curl, thread, stitch, bubble, button, yarn ball, text, paw, heart, star, glint, drop, fish, crumb, shard, leaf and coin.

## Every game's signature

No two games share both a style and a set of shapes (`motion.mjs` checks it). The reveal is how the board opens: a clip and a fade, never a square moving.

| Game | How it leaves the piece | Shapes | The piece answers with | Board opens with |
|---|---|---|---|---|
| Odd Skein | spiral | curl, thread | halo | iris |
| Count the Stitches | line | stitch | stamp | wipe |
| Dye Trap | fountain | drop | ripple | rise |
| Untangle | radial | thread | halo | iris |
| Stitch Count | fountain | "+" | stamp | rise |
| Quick Count | twinkle | dot, glow | pulse | diamond |
| Mirror Stitch | mirror | glint, star | halo | split |
| Let the Cat Out | line | paw | stamp | wipe |
| Stitch Sampler | orbit | star, stitch | halo | iris |
| Off Beat | drift (double ring) | "♪" | pulse | rise |
| Sorting Basket | rain | crumb, dot | stamp | curtain |
| Cat's Cradle | radial | curl | halo | iris |
| No Crossing | cross | spark | halo | diamond |
| Purr | drift (triple ring) | heart | pulse | rise |
| Basket Drop | bounce | yarnball | stamp | curtain |
| Cat Fight | radial | dot, star | stamp | iris |
| Tumble Dryer | orbit | button | halo | iris |
| Needle Pass | cross | glint, spark | halo | diamond |
| Mending | fountain | patch, heart | stamp | rise |
| Peekaboo | twinkle | glint, star | pulse | diamond |
| Tidy Up | drift | bubble, glint | halo | rise |
| Cat's Eyes | radial (single ring) | glint | pulse | iris |
| Snip | split | shard, spark | halo | split |
| Ripples | fountain (ell ring) | drop, bubble | ripple | rise |
| Dropped Stitch | rain | stitch, curl | halo | curtain |
| Dye Pots | pour | drop | ripple | curtain |
| Folds | fountain | confetti | stamp | rise |
| Tangle Watch | drift | curl, dot | halo | rise |
| Chalk Line | radial | dot | halo | iris |
| Catch the Balls | bounce | yarnball, glint | halo | curtain |
| Patchwork | fountain | patch | stamp | rise |
| Heft | puff (ell ring) | dot, crumb | stamp | rise |
| Darning | cross | stitch, thread | stamp | diamond |
| Latch Hook | fountain | curl, button | halo | rise |
| Splice | implode then radial | glow | pulse | diamond |
| Follow the Thread | trail | glow | halo | wipe |
| Balance | split | star, dot | stamp | split |
| Kitten's Snack Attack | fountain | fish, crumb, heart | stamp | rise |
| Yarn Tangled Tangle | fountain | coin, leaf | halo | rise |
| Spool Shots | radial (single ring) | spark, button | halo | iris |
| Sandbox of Softness | rain | dot | stamp | curtain |
| Even Skeins | split | yarnball | halo | split |
| Loaf Box | drift | "z", crumb | stamp | rise |
| Yarn Ball Blaster | radial (single ring) | shard, yarnball | halo | iris |
## Moments

| Moment | Motion |
|---|---|
| Count-in | each number rings; Go bursts outward |
| Board opens | the game's reveal (iris, wipe, curtain, rise, split or diamond), 320 ms |
| Solve | signature, ghost, the token to the score with a comet's tail, the prompt springs up |
| Miss | snag, grey slump, the screen's edge reddens (less when forgiven), the prompt shakes its head, the board shakes |
| Streak up | the chip rings as the token lands; from ×3 it smoulders (embers every 230 ms); the first ×5 of a run sends light across the board and a little gold rain |
| Life lost / gained | the pip breaks into shards / hearts |
| Stage beat | light across the board and a fountain of stars |
| Charm draft | the cards are dealt with a turn and settle on a spring, the keepsake spins in, a rare one has light running along it, the kept one bursts in its colour |
| Level up | confetti from both corners, then a ring off the new number |
| Game Over | the score lands on a spring, the lines rise in order, a new best is stamped on (and it rains), Flawless catches the light, the buttons fade |
| Tabs | the pill slides under the tab, the icon hops, the page slides the way the pill went; the header and the bar stay put |
| Home | "Drop" drops in, the three doors catch a shine in turn and their cats bob, the Daily breathes until it is played |
| Room | besides the sway and breathing they always had, one cat at a time blinks, twitches an ear, flicks its tail or takes a deeper breath, and sleepers let out a z (moments, never loops on parts of a drawing; an idle Room costs about 18 to 29 layouts and 36 to 56 ms of work in 3 s); dust drifts in the window light; petting squashes the cat and sends hearts; a new cat comes home with confetti in its colours; a corner bought sends light across the room |
| Yarn | gift, wish and week claims send a fountain of yarn and tokens to the count, which pops as each lands |
| Sheets, pause, welcome | spring up over a fading backdrop; lines follow one by one |

## Budget

Measured on the build in `motion.mjs` and `stable.mjs`: see [05-before-after.md](05-before-after.md).
