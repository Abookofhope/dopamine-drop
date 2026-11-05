# 3. The juice and feedback bible

Juice is how the game tells you that what you did mattered, in proportion to how
much it mattered. Too little and the game feels dead. The same amount for
everything and nothing stands out. This chapter fixes the proportions.

## Laws

1. **Proportion.** The size of a response is set by the size of the event, from
   one table ([the ladder](#the-ladder)), never chosen at the call site. Today
   the haptic vocabulary (`HAPTIC`) and the motion tokens (`--m-*`) already work
   this way. Sound, particles and UI join them.
2. **Every channel, every time.** A meaningful event answers on at least four
   channels: sight, sound, touch, UI. Plus a "camera" beat from tier T4 up.
   A channel that is switched off is replaced, never just dropped. A caption
   stands in for sound, a glow for haptics, a stamp for motion.
3. **The board never moves.** Pieces glow, ghosts move above them, the canvas
   sprays over them, and the frame around the board may kick. Nothing the
   player is reading or touching moves or resizes (`stable.mjs`). "Screen
   shake" here means **frame kick**: the HUD chrome, background and vignette
   move a few pixels and the board stays put. This is the rule that makes the
   juice compatible with perfect readability.
4. **Anticipation, impact, follow-through.** Every T3+ moment has three beats:
   a wind-up of 60–120 ms (glow builds, a rising pitch), an impact (the flash,
   the burst, the haptic), and a 300–900 ms follow-through (particles settle,
   the score counts, the music resolves).
5. **Rarity is a budget.** The higher a tier, the rarer it must be. Each
   tier's expected frequency is in the ladder. If a tier fires more often than
   that, it gets demoted, not shrunk.
6. **Earned, then given.** Celebrations happen after the player's action
   resolves, never in front of the next board. The next board waits for the
   follow-through of T5 and above. The round reveal starts no sooner than 400 ms
   after a T2–T4 impact (today's `later(400, nextRound)`).

## The ladder

| Tier | Event | Frequency | Visual | Audio | Haptic | UI | Camera |
|---|---|---|---|---|---|---|---|
| **T0 Touch** | any touch that lands | constant | the piece glows or depresses in place; a 40 ms ripple ghost | `tap` (detuned ±1.5%), family key | `tap` 7 ms | — | — |
| **T1 Step** | a correct partial step (a pair half-matched, a stitch laid) | every few seconds | `Vfx.bit` mini signature at the touch | a soft pluck in key, a third above tap | `step` 11 ms | progress line ticks | — |
| **T2 Solve** | a board solved | every 2–15 s | the game's signature spray (44, 16 styles); a token flies to the score | `good(n)`: two notes in key, pitch rises with streak | `good` 16 ms | score count-up; floating `+pts` | — |
| **T3 Clean / Swift** | a graded solve | 1 in 3 solves for a practised player | T2 + glints along the board edge (Clean) or a speed streak across the score (Swift) | `good` + a third voice; Swift adds a short whoosh | `[12,30,16]` | grade word under the score, 600 ms | frame kick 1 px |
| **T4 Purrfect** | Clean and Swift | 1 in 6 solves for a practised player | T3 + a stamp ghost on the board, a gold ring, a Thread knot pops | three rising notes in the music's key (Room Radio), panned to the board | `[14,40,14,40,22]` | "Purrfect" stamped in gold; knot count | frame kick 2 px, vignette breathes warm |
| **T5 Milestone** | ×3–×5 tier-up, stage beat, new best passed, Cat's Cradle, level-up | 3–8 a run | sweep across the surface, fountain or rain, ring; a veil at ×5 and the Cradle | `combo(tier)` fanfare; the music adds its next layer or plays its stinger | `win` | chip pops; toast **queued** to the round end | frame kick 3 px; background parallax swells |
| **T6 Peak** | the run's best moment replayed on Game Over; a first-ever (first Purrfect, first Cradle, first ×5, a game mastered) | 0–2 a session | full choreography: cannons, the Room lights up behind the card | the music resolves to its home chord; a purr | `done` | the recap leads with it | slow push-in on the recap card (scale 1.00 to 1.02 over 900 ms, the card only) |

Notes:
- **Misses** sit outside the ladder on purpose. A miss is a clear, short
  T2-sized "no": the snag ghost, the `bad` fall (out of key, never pleasant),
  the `bad` haptic, a red veil at 12% for 220 ms, the prompt naming what
  happened. No shake, no shame.
- **Frame kick** is a single translate on `#chrome`, `.bg` and the vignette
  layer, easing back over 180 ms with `--e-spring`. It is **off** under Reduce
  motion and under Big celebrations off, and never above 3 px.
- **"Camera" in a DOM game** means the layers around the board: a background
  parallax, a vignette, the frame kick, the recap card's push-in. The board's
  own coordinates are sacred.

## Feedback per system

| System | Event | Tier | Notes |
|---|---|---|---|
| Run | count-in (3, 2, 1, Go) | T1 ×3, T2 on Go | rings and a Go burst (live since v0.144.0) |
| Run | round reveal | — | per-style reveal: iris, wipe, curtain, rise, split, diamond (live) |
| Run | clock under 8 s | — | the clock warms to amber, a soft tick each second (no alarm) |
| Run | Thread knot | T4 | knot pop on the strand |
| Run | Thread unravels | miss | the strand slackens and fades over 500 ms (never a snap) |
| Run | Cat's Cradle | T5 | cradle figure on the canvas, the music peaks |
| Run | stage beat | T5 | sweep and stars (live), then the charm draft |
| Run | charm dealt and picked | T3 | cards dealt with a flip; the picked charm flies to the HUD (live) |
| Run | Game Over | T6 | peak first, then the count-ups (live), then the Today card |
| Meta | yarn earned | T2 | yarn balls fly to the basket count (live) |
| Meta | level-up | T5 then T6 | the card waits for the XP bar to fill (live) |
| Meta | Quilt stitch added | T5 | the patch stitches itself in, needle and thread on the canvas |
| Meta | cat bond level | T5 | hearts, a purr, the cat's name in its colour |
| Meta | decor placed | T3 | settle puff, a soft thud; the room's light shifts if it was a lamp |
| Meta | wish complete | T3, queued | the wish card ticks with a stitch; the reward on collect is T4 |
| Meta | daily gift, day 7 | T5 | a treat for every cat riding along (live) |
| Shell | tab change | T0 | the pill slides, the page slides in its direction (live) |
| Shell | sheet open and close | T0 | spring in, ease out (live) |
| Shell | setting toggled | T0 | the switch thumb springs; the change shows at once |

## Escalation inside a run

A run is a crescendo, so the same event feels bigger late in a hot run:

- **Heat scales T2.** The solve spray grows with the multiplier (burst tier =
  `mult`, live), so the hundredth solve at ×5 is bigger than the first at ×1.
- **Music scales everything.** Room Radio adds a layer at ×2, ×3 and ×5 (see
  [09-av-standards.md](09-av-standards.md)), so the same chime sits in a fuller
  room.
- **Embers** (live) rise from the board's frame at ×3+, denser at ×5.
- **Caps** stop escalation from becoming noise: at most one T5 per round, and
  the ×5 veil fires once a run (live).

## Reduced and quiet profiles

| Setting | What changes |
|---|---|
| Big celebrations off | T5 and T6 keep their sound, haptic and UI; the veil, cannons, sweep and frame kick are off; T2–T4 unchanged |
| Reduce motion (app or system) | no particles, ghosts, sweeps or kicks; tiers are carried by colour, sound, haptics and text; the grade word stays |
| Sound off | captions carry T2+ (live for good, bad, go, combo, level, over); the new grade words double as captions |
| Haptics off or unsupported | nothing replaces it; every haptic beat already has a visual one. The switch is hidden where `navigator.vibrate` is missing (live) |

## Performance budget

| Item | Limit | Checked by |
|---|---|---|
| live particles | 260, lowered by 10 per frame over 26 ms, floor 70 (live) | `motion.mjs` |
| busiest moment (×5 + Purrfect + Cradle + level confetti) | p95 frame under 33 ms at 4× CPU slowdown | `framebudget.mjs` (new) |
| animated properties | transform and opacity only for anything endless; nothing endless inside an SVG drawing | `motion.mjs`, `loaf.mjs` |
| layout during a drag | 0 layouts per frame | `loaf.mjs`, `drag.mjs` |
| flashes | never more than 3 per second; no full-screen luminance flip above 20% contrast | `framebudget.mjs` |
