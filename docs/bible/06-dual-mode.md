# 6. Two doors: Cozy and Challenge

The same 44 games, two ways of being with them. The player picks the door, not
the game. A door is a promise about pressure, and the game keeps it exactly.

## The switch

On the Play tab, under "How is your brain today?", a two-way switch:

```
[ Cozy · no clock ]  [ Challenge · beat your best ]
```

- It sets what **Play a mix** on every kind card does. The Games tab's per-game
  buttons offer both (Practise = Cozy, Marathon = Challenge, as today).
- It is remembered. A new player starts on **Challenge** (today's Shuffle, the
  run the game was built and tuned around), and the first Game Over with no
  solves offers Cozy once.
- Daily Drop stays one shared format for everyone, so it is outside the
  switch.

## Cozy (the Bliss door)

**Promise:** nothing can go wrong. Play as long or as short as you like, and
everything is as beautiful as the game can make it.

| Rule | Cozy | Why (pillar) |
|---|---|---|
| Clock | none, no round clock | Safety, Autonomy |
| Misses | free. The board says what happened and deals the next one; heat **cools one step** instead of resetting | Safety; flow stays warm |
| Thread | holds on a miss (never unravels) | Safety |
| Score | not shown; the HUD shows solves, yarn and the Thread | removes comparison pressure |
| Records | none (no bests, no stars) | nothing to protect |
| Stage beats | every 10 solves: sweep, stars and a **stage gift** (10 yarn) instead of a charm draft | landmarks without decisions |
| Adaptive difficulty | on by default; eases after one miss rather than two | competence without strain |
| Yarn | per solve as Challenge at the same heat, plus `0.6 × solves` at the end | Generosity: a cozy minute is never worth less |
| XP | same per solve | progress for everyone |
| Music | Room Radio's **Hearth** station, layers rise more slowly | Sensory comfort |
| Ends | when you stop, with Tuck in offered first | Peak-End, restoration |

Built on Endless's code path (no clock, no lives, scored) with scoring hidden,
misses softened and the stage draft swapped for a gift. Fidget Loop (one game,
no score) and Taste Test stay as they are, as Cozy's quieter cousins in the
Games tab.

## Challenge (the Mastery door)

**Promise:** your skill is measured fairly, and getting better shows.

| Rule | Challenge | Why (pillar) |
|---|---|---|
| Clock | Shuffle's 10:00 (live), or the run type's own | tension, chosen |
| Misses | cost time (live), reset heat, unravel the Thread | stakes |
| Style grades | full pay | Competence |
| Records | bests, the Best chip (live), **your ghost**: a pace line showing where your best run stood at this minute | Mastery; competing only with yourself |
| Stage beats | charm draft (live) | Autonomy: builds |
| Mastery | Marathon stars, twists, ranks, the Gold Thread | long-term mastery |
| Assists | allowed and noted on the record ("relaxed speed"), never blocked | dignity |
| Yarn | as live, plus style and Cradle | — |

## The ghost (new, Challenge only)

- Each run type keeps the **score curve of its best run**: score at every 10
  seconds, about 60 numbers for a 10-minute run, stored on the device.
- During a run a thin thread under the score shows where that best run stood
  at this second: ahead (gold) or behind (grey), with the gap as a number
  ("+340" / "−120"). It replaces the static Best chip from v0.145.0, which
  shows only the final best.
- At the moment you pass your best's final score, the chip turns gold and says
  New best (live).
- **Daily ghost link** (new): after a Daily Drop, Share includes a link that
  carries your round-by-round score (12 numbers) and the date. A friend who
  opens it and plays the same day's Daily races your thread. There is no
  server: the link is the data. Same-day only, because each date has its own
  board.

## Why two doors and not one tuned middle

- **Self-Determination Theory.** Autonomy means choosing your own
  pressure. One middle-ground mode is a little too tense for a tired player
  and a little too soft for a sharp one.
- **The five-minute test** (see [10-ethics.md](10-ethics.md)) is passed by
  Cozy outright, and by Challenge through peak-first recaps and Tuck in.
- **No one is punished for the door they pick.** Both pay yarn and XP at the
  same rate per solve, so the choice is about feel, never reward.

## Edge cases

| Case | Rule |
|---|---|
| A Cozy player wants a star | stars come from Marathon (Challenge). The quilt patch says so and offers it |
| Switching doors mid-run | not possible; the switch is on the Play tab. The pause sheet says which door you're in |
| A wish asks for a score ("score 5,000") | wishes are drawn from both doors' verbs: a Cozy player is never given a score wish while their last 5 runs were Cozy |
| Achievements that need a score | stay Challenge achievements; Cozy has its own (solves, Threads, gifts) |
