# 1. Vision

> **A warm little snack for your brain, in a craft room full of cats.
> Every solve makes the room, and the cats, a little more yours.**

## The promise

Open Dopamine Drop with five minutes and a tired head. In those five minutes you
solve a run of tiny puzzles, each one different. Each one answers your touch
instantly, and each one finishes with a sound and a burst of colour made for that
puzzle alone. The music in the room rises as you find your rhythm. A cat rides
along beside the score and does something kind for you. When you stop, the game
leads with the best thing you did, pays you in yarn, and adds a stitch to a
quilt that has been growing since the day you started. Then the cats curl up and
the lights go down, and you leave feeling sharper, calmer and a little richer
than when you came in.

That last sentence is the test every system in this bible has to pass.

## What stays (the identity)

Four things make Dopamine Drop itself. The overhaul amplifies them and replaces
none of them.

1. **Rotation is the mechanic.** The puzzle changes every round, so you are never
   more than a few seconds from something new. It is what lets a short attention
   span help rather than hurt. Today: 44 games in three kinds.
2. **Brain snacks, not meals.** A board takes seconds and a run takes minutes.
   Depth comes from mastery and style, never from making a board longer.
3. **The craft room and its cats.** Yarn, stitches, patches and cats are the whole
   visual language, from the logo (a drop that became a cat) to the particles
   (yarn, paws, buttons).
4. **Kindness.** No board ever moves under your finger, and the way out is always
   in reach. Every celebration can be turned down, and nothing is sold to you
   in the middle of a run.

## What the overhaul adds (the 10x)

| Layer | Today (v0.145.0) | The overhauled game | Pillars served |
|---|---|---|---|
| The solve | A signature burst per game, a token to the score | **Style**: every solve is graded Solved, Clean, Swift or Purrfect, and each grade has its own sound, light and pay. Purrfects in a row weave a **Thread** that closes into a **Cat's Cradle** spectacle | Flow, Competence, Sensory |
| Rhythm | Streak heat ×1 to ×5, embers | **Room Radio**: generated music whose layers rise with your heat; solve chimes play in the music's key, so a good run sounds like a song you are playing | Sensory, Flow |
| Moods | Kinds, Fidget Loop, Marathon, timed runs | **Two doors**: Cozy (no clock, no cost, full beauty, full yarn) and Challenge (clock, style multipliers, your own ghost to beat, mastery) | Autonomy, Safety, Mastery |
| Ownership | Room decor, cats with bonds, perks | **The Quilt**: one patch per game, stitched up by mastery, hung in your Room; **Sparkle kits**, a music station and the cat riding along make up *your* loadout | Ownership, Relatedness |
| The ending | Game Over with count-ups | **Peak first**: Game Over leads with your best moment; a **Today** card shows what moved; **Tuck in** ends a session with a ritual instead of a cliff | Peak-End, Progress |
| Time | Daily Drop, wishes, daily gift | **Living room**: seasons that bring new decor and a pattern without FOMO (every past season stays in the Archive), a weekly pattern, a streak that **rests** instead of breaking | Autonomy, Safety |

## Who it is for

- **The tired five-minute player.** Wants something pleasant and quick, and to
  stop without guilt. Served by Cozy, Tuck in, and runs that are short by default.
- **The fidget player.** Wants hands busy and mind light: Fidget Loop, Cozy,
  Room Radio as background.
- **The mastery player.** Wants to get better and to show it: Challenge, style
  grades, twists, mastery stars, the Gold Thread, ghosts of their own best.
- **The collector.** Wants the room to be theirs: cats, decor, the Quilt, Sparkle
  kits, stations, seasons.

One person is usually all four on different days. The **"How is your brain
today?"** gate on the Play tab is the right instinct. The overhaul extends it to
how you want to play as well as what.

## Non-negotiables

- No energy, no lives that gate play, no timers that lock content, no paid
  continues.
- Nothing that is lost by not logging in. A season's items stay earnable forever.
- Nothing during a run asks for money, attention or a decision that isn't the
  puzzle.
- Every effect respects Reduce motion and Big celebrations; every sound has a
  caption and a volume; every haptic has a switch.
- No board element ever moves or resizes while you are looking at it (the
  stability rule, enforced by `stable.mjs` since v0.96).

## How we will know it worked

Measured on the device by probes, and later by opt-in, on-device analytics
(see [13-roadmap.md](13-roadmap.md), L3):

| Signal | Target | How it is checked |
|---|---|---|
| First solve after the first tap | under 5 s (3.3 s today) | `firstrun.mjs` |
| Taught through play, no reading required | under 90 s to the first run's third solve | `firstrun.mjs` (extended) |
| The busiest moment (×5 heat, Purrfect, level-up confetti) on a slow phone | 95th-percentile frame under 33 ms at 4× CPU slowdown | `framebudget.mjs` (new) |
| A five-minute session ends on a high | Game Over's first line is the run's best moment in 100% of runs, including a run with no solves | `peakend.mjs` (new) |
| No dark patterns | Every rule in [10-ethics.md](10-ethics.md) has a probe or a gate check | the gate plus probes |
| Players come back because they want to | D1 and D7 return with no notifications at all | on-device analytics, opt-in |
