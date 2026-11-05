# 0. Baseline: the game as it stands (v0.145.0)

Everything in this bible builds on what exists. This chapter is the inventory,
read out of `site/app.html` on 2026-11-05. Line numbers are approximate because
the file moves. Numbers marked ✓ were re-checked by hand against the code.

## Shape

- One file, about 22,600 lines, published as a PWA (manifest, service worker,
  offline). Four languages (en, fr, es, de). No server, no accounts, no ads, no
  purchases, no tracking.
- **44 games** in 8 families (focus 9, logic 8, reflex 8, physics 6, numbers 4,
  make 4, calm 3, words 2). They are grouped on the Play tab into three
  **kinds**: Calm & Collect (15), Quick Paws (14) and The Full Purr (19 listed;
  its mix deals all 44).
- Tabs: Play, Games, Room, You (Progress and Settings). The Mix editor
  (Custom) is a seventh screen.

## Ways to play ✓

| Run | Clock | Lives | Scored | Ends |
|---|---|---|---|---|
| Shuffle (Play a mix, and the first run) | 10:00, capped at 15:00; a miss costs 4 s; at ×5 the clock stops while you keep solving (the zone) | — | yes | clock out |
| Mixtape (Custom) | 60 s | — | yes | clock out |
| Reflex Rush | 40 s, miss −3 s | — | yes | clock out |
| Puzzle Cascade | 90 s, cap 120 s, miss −6 s | — | yes | clock out |
| Chaos Gauntlet | 70 s; 35% of rounds carry a modifier | — | yes | clock out |
| Survival Protocol | per-round clock | 3, +1 every 5 solves, boss every 10th | yes | lives out |
| Daily Drop | per-round clock, 12 rounds, seeded by date | — | yes | 12 rounds |
| Marathon (one game, five twists) | per-round clock | 3 (Ironclad 1) | yes, stars at 600, 1600, 3200 | lives out |
| Endless | none | — | yes | you stop |
| Fidget Loop | none | — | no | you stop |
| Taste Test | none | — | no, rate each game | when every game has a verdict |

## Inside a run ✓

- **Points per solve** = `(100 + 130 × speed) × multiplier × charms × twist`,
  where `speed = 1 − elapsed / par` (0 to 1).
- **Streak multiplier** ×1 to ×5, one step per 4 consecutive solves (faster with
  the Zeal perk and the Bell Collar charm), lost on a miss. Embers at ×3+, a veil
  and rain the first time a run reaches ×5.
- **Stage beat** every 10 solves (Shuffle, Mix, Chaos, Endless, Rush, Cascade):
  `250 × stage` points, 6 s of clock, then a **charm draft** (3 cards, 1 pick,
  32 charms: 10 common, 11 uncommon, 8 rare, 3 "bargains" with a cost).
- **Timed solves refund time**: the game's bonus plus the time saved against
  par, so speed compounds into a longer run.
- XP, yarn and lifetime points are banked on every solve, so quitting costs a
  run's score, never its progress.

## Progression ✓

| Track | How it grows | What it gives |
|---|---|---|
| Level | XP per solve, 8 to 16; level L needs `50 + 10(L−1)`; unbounded | victory colours at 0, 5, 10, 15, 25, 40; two cats; wish tiers |
| Perks | lifetime points: slots at 10k, 30k, 75k, 150k, 300k, then a level token per 150k | 6 perks (Spare, Shield, Patience, Zeal, Steady, Rally), 3 levels each |
| Stars | Marathon bests per board: 600 / 1600 / 3200 | 132 Classic stars; twists unlock at 1, 2, 3 stars |
| Mastery rank | stars across a game's 5 boards: 0, 1, 3, 6, 10, 15 | Kitten, Tabby, Mouser, Alley Cat, Pouncer, Lion |
| Cats | adopted with yarn | 20 cats, each with a passive in 3 steps; bond 60 / 300 / 900 solves ridden; 10 friend pairs |
| Room | yarn | 8 corners × 3 grades; comfort +1% yarn per grade; seats at grades 0, 10, 20 |
| Achievements | 87 | yarn rewards, 18,770 in total |
| Wishes | 3 a day from 11 types; 9 a week | 30 / 45 / 65 yarn by tier; 250 a week |
| Daily gift | one tap a day, 7-day ladder | 20, 25, 30, 40, 50, 70, 120 yarn; day 7 treats the seated cats |

## Economy ✓

- **One soft currency, yarn.** Sources: 0.8 to 2.4 a solve, `score / 500` at the
  end of a scored run, wishes, the gift, achievements, cat and charm effects.
- **Two sinks only:** cats (21,350 for all 20) and the Room (6,020 for all 24
  grades), so **27,370 in all**. Achievements alone pay 18,770.
- No hard currency, no purchases, no energy, no wait timers.

## Feel ✓

- **Motion:** one particle canvas (pooled, capped), ghost overlays so no board
  piece moves, a signature per game (16 spray styles × shapes), reveals,
  count-ins, embers, sweeps, veils, cannons; Big celebrations and Reduce motion
  switches. Docs: [../overhaul/07-motion.md](../overhaul/07-motion.md).
- **Sound:** synthesized one-shots (tap, good, bad, combo, level, go, over),
  purr and meow, each family in its own key of C major; a three-sine pad in
  Fidget Loop only. **No music.**
- **Haptics:** a vocabulary of 7 patterns (`HAPTIC`), switch hidden where
  vibration is unsupported.

## Comfort and access ✓

Text size (4 steps), easy-read font, high contrast, colour helper (shapes on
colours), Reduce motion, Big celebrations, flashes, captions, one-handed layout,
game speed (normal, relaxed, slow), adaptive difficulty with a visible note,
Different puzzle (3 a run), a guided start, presets (Calm, Focus, Easy to see),
settings search, reset with undo, save export and import, wake lock, P to pause.

## Found while taking stock (fixed in the MVP, see [13-roadmap.md](13-roadmap.md))

| # | Finding | Why it matters |
|---|---|---|
| B1 | **Go again after a Calm or Quick mix deals all 44 games**: the replay button doesn't carry the kind's pool ✓ | the player chose a mood and the game forgot it |
| B2 | **Window Seat does nothing**, and Sunbeam's "round clocks 20% longer" never applies. Charms are only offered in runs without round clocks ✓ | a rare card that is a blank breaks trust in every card |
| B3 | **Sharp Claws' cost never applies** (it slows round clocks, which those runs don't have), and Ghost Cat and Tangle cost nothing in Endless, where a miss costs no time ✓ | a "bargain" with no price is a dominant pick |
| B4 | **The daily gift ladder restarts at day 1 after one missed day** ✓ | punishes a day off; against E4 |
| B5 | Toasts (first solve, coach notes, stage beats, achievements) appear **during a run, over the HUD** | breaks flow; against E5 |
| B6 | A run is lost if the app is closed or killed mid-run (progress is banked, but the run is gone) | a phone call shouldn't cost a run |
| B7 | **Yarn runs out of things to buy** (27,370 in all) | a currency with nothing to buy is noise, and the most loyal players reach that point first |
| B8 | Small text faults: Reflex Rush says 7 reflex games (there are 8); the Room says comfort gives "a fifth" more yarn (it is up to 24%); "N solved" on the HUD and the colour-helper preview caption are English in every language | correctness and localization |
| B9 | The three kinds are subtitled with **clinical ADHD subtype names** ("Predominantly Inattentive", ...) | a health-claim risk on app stores and a label on the player; see [12-risks.md](12-risks.md) R3. **Needs the owner's decision** |
| B10 | A Game Over with no solves leads with a giant **0** | a five-minute player who had a bad run leaves on a low; against the Peak-End rule |
