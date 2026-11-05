# 7. HUD and interface

## Principles

1. **The board is the interface.** During a round the player's eyes belong on
   the board. The HUD is read at a glance between boards, never during one.
2. **Quiet when calm, loud when it matters.** The HUD stays still and dim
   while a round is live, and springs up when something happens (a solve, a
   tier-up, a gap to the ghost closing).
3. **Never covered, never covering.** Nothing overlays the score or the way out
   during a run (E5, E11). Toasts wait.
4. **Density is the player's choice.** Three levels, one setting.
5. **Safe areas and thumbs.** All controls 44 px or larger (live since
   v0.136.0); the exit can move to the thumb's side (one-handed, live).

## The in-run HUD, element by element (live unless marked)

| Element | Position | Shows | Minimal | Standard | Detailed |
|---|---|---|---|---|---|
| Pause | top-left (or bottom corner one-handed) | the pause glyph, labelled in the player's language | ✓ | ✓ | ✓ |
| Mode name + family dot | top, after pause | which game this is, and its twist | — | ✓ | ✓ |
| Clock | top-right | m:ss; amber under 8 s | ✓ | ✓ | ✓ |
| Time meter | under the top row | the run clock as a bar | — | ✓ | ✓ |
| Score | centre | the run's score (Challenge) or solves (Cozy) | ✓ | ✓ | ✓ |
| Mascot | beside the score | the riding cat, reacting (new reactions) | — | ✓ | ✓ |
| Multiplier ring | beside the score | ×N with embers | ✓ | ✓ | ✓ |
| Best / ghost (new) | beside the multiplier | the gap to your best run at this moment | — | ✓ | ✓ |
| **Thread** (new) | a strand across the top of the board's frame | 0–5 knots | ✓ | ✓ | ✓ |
| Lives | top row | hearts (runs with lives) | ✓ | ✓ | ✓ |
| Charms and perks | top row | icons | — | — | ✓ |
| Round pips | top row | 12 pips (Daily) | — | ✓ | ✓ |
| Round clock bar | over the board | the per-round clock | ✓ | ✓ | ✓ |
| Prompt line | under the score | what the board asks, then what happened | ✓ | ✓ | ✓ |
| Grade word (new) | under the score, replacing the prompt for 600 ms | Clean / Swift / Purrfect | ✓ | ✓ | ✓ |
| Adaptive note | top row | "easing a step" | — | ✓ | ✓ |
| **Par bar** (new) | thin line under the prompt | time left to Swift on this board | — | — | ✓ |
| **Pace numbers** (new) | under the multiplier | solves a minute, Purrfect rate this run | — | — | ✓ |

**Minimal** is for players who want only the board and the essentials.
**Standard** is today's HUD plus the Thread, grade word and ghost.
**Detailed** is for players who like to watch the numbers.

### Behaviour while a round is live (new)

- Elements that don't change during a round dim to 70% opacity 1.2 s after the
  board is dealt: mode name, charms, perks, adaptive note. They come back to
  100% on the solve. It's an opacity-only change, so it costs no layout.
- The score and clock never dim.
- Under Reduce motion the dimming still happens (it's not motion), as a
  200 ms opacity step.

## Toasts and notices (changed)

Today, toasts (first solve, coach notes, stage beats, achievements, survival
lives) slide in at the top during a run, over the HUD (B5).

New rules:
- **During a live round, nothing is toasted.** Notices queue.
- **Between rounds** (the 400 ms after a solve, or a stage beat's pause), one
  queued notice may show, **below the score**, never over it, for 1.6 s.
- **Tap to dismiss** any toast, anywhere.
- At Game Over, the queue is shown as lines in the recap ("Achievement: Night
  Owl, +60 yarn") instead of a stack of toasts.
- Outside a run (menus), toasts behave as today, plus tap to dismiss.

## Menus (live, with additions)

- **Header HUD** (v0.145.0): logo, streak flame (from 2 days), yarn basket
  (opens the Room), level ring with number. Fits by measuring, words first.
- **Play tab**: the gate (three kinds), the **door switch** (new), Daily Drop
  row, Custom, and a **Resume card** at the top when a run was interrupted
  (new, see [08-qol.md](08-qol.md)).
- **Room**: the scene with the Quilt (new) on the back wall, the Kit (new)
  button, the daily gift, cats, decor.
- **You**: Progress (with the Style profile, new) and Settings.

## Readability standards (all screens)

| Standard | Value | Check |
|---|---|---|
| Body text | 15 px at 100% text size, line height 1.4, scales with `--ts` | `textsize.mjs` |
| Contrast | 4.5:1 text, 3:1 large text and controls | axe in `panels.mjs` and friends |
| Targets | 44 × 44 px minimum | `hudstates.mjs`, roadmap Q4 |
| Safe areas | all edges respect `env(safe-area-inset-*)` | `geometry.mjs` |
| Colour | never the only cue; the colour helper adds shapes | colour assist |
| Numbers | tabular figures on every counter (no jitter while counting) | design system |
| Languages | all four carry every string; the gate refuses a missing key | `check_site.py` |
