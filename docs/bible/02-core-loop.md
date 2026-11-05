# 2. The amplified core loop

## The loops, in one sentence each

- **Inner loop (a run):** *you solve a tiny puzzle to keep the thread going, so
  the next puzzle pays more.*
- **Outer loop (the room):** *you spend what a run earned on your room and
  cats, so the next run carries more of you.*

The two are deliberately separate. The inner loop is skill and rhythm, and the
outer loop is ownership and care. A player can live in either one and still be
fully served: a Cozy player who never chases a score still furnishes the room,
and a Challenge player who never buys a cushion still climbs the mastery
ladder.

| | Inner loop | Outer loop |
|---|---|---|
| **Verb** | tap or drag to solve a board | choose: adopt, place, equip, stitch |
| **Tension** | the clock (Challenge), the thread you are carrying, the next board being a surprise | what to make next with the yarn you have |
| **Fantasy** | "I'm quick, clever and in the zone" | "this cozy room and these cats are mine" |
| **Minute one** | a board you can solve in 3 seconds without reading anything | after the first run: yarn flies to a basket, and the cat you met is waiting in the Room |
| **Failure** | a miss costs the thread and some clock, never the run's progress (XP, yarn and lifetime points bank per solve; true since v0.94) | none: nothing in the outer loop can be lost |

## The single most satisfying moment

**The solve.** The instant a board resolves: the odd tile found, the pair met,
the row latched. It already gets a signature burst per game (44 of them,
v0.144.0), a token flying to the score, a chime and a haptic tick. The overhaul
amplifies it tenfold. It doesn't do that with a bigger explosion on every
solve, which would flatten everything. It makes the solve **graded, chained
and musical**, so the best solves feel transcendent and ordinary ones still
feel good.

### Style grades (new)

Every solve gets one grade. The grade is the largest single lever on how the
solve feels.

| Grade | Rule | Extra pay | Feel (see [03-juice.md](03-juice.md)) |
|---|---|---|---|
| **Solved** | the board was solved | base pay (unchanged) | tier T2: the game's signature, chime, tick |
| **Clean** | solved with no slip: no wrong touch in the round, no hint, no undo | +10% points, +0.2 yarn | T3: + glints along the board's edge, a brighter chime voicing |
| **Swift** | solved within 55% of par (`speed ≥ 0.45`, the threshold adaptive difficulty already calls quick) | speed already pays (`130 × speed`); the grade adds +0.2 yarn | T3: + a speed streak across the score |
| **Purrfect** | Clean **and** Swift | +25% points, +1 yarn, +1 Thread | T4: + a stamp ghost, a gold ring, a rising three-note figure in the music's key, a double-tick haptic |

Why these rules:
- **Competence (SDT).** A grade tells you exactly what you did well, in words
  and in feel. "Clean" teaches care and "Swift" teaches pace, and Purrfect asks
  for both.
- **Fair and readable.** Each grade is computed from things the player can see:
  the slip chime they heard, the par bar they watched. Nothing is hidden.
- **No punishment.** A plain Solved is never shamed. It pays exactly what it
  pays today. Grades are only ever extra.

How a slip is detected: every in-round mistake already plays `sfx.bad` while the
round is live (the `Vfx.bit` wrapper hooks it since v0.144.0). Counting those
calls per round needs no per-game code. Hints and undo are per-game buttons
(17 games have a Hint, several an Undo); each gets an `aid` class, and the shell
marks a round as aided when one is pressed. That is one line per game, and the
shell needs no knowledge of how any game's hint works.

### The Thread (new chain layer)

Purrfects in a row spin a **Thread**, a single strand of yarn drawn across the
top of the board, five knots long.

- Each Purrfect ties a knot (the strand brightens and the knot pops).
- A plain solve **holds** the thread: no knot, nothing lost. *Safety: tension
  without punishment.*
- A miss **unravels** it, visibly and gently, back to zero.
- The fifth knot closes a **Cat's Cradle**: the strand loops into a cradle
  figure over the whole surface (canvas, never the board), the music hits its
  peak chord, and the run pays a cradle bonus: `500 × stage` points and +5 yarn.
  Then the thread starts over.

This sits on top of the existing streak multiplier (×1 to ×5, built by
consecutive solves and lost on a miss). The two chains differ:

| Chain | Built by | Broken by | Pays | Spectacle |
|---|---|---|---|---|
| Streak heat (live) | any solve | a miss | point multiplier ×1 to ×5, embers | tier-up ring, ×5 veil and rain once a run |
| Thread (new) | Purrfects | a miss | cradle bonus every 5 knots | knots, then the Cat's Cradle |
| Stage (live) | every 10 solves | nothing | `250 × stage` points, 6 s of clock, a charm draft | sweep and stars |

Three layers, three rhythms: heat every solve, the thread every few, stages
every ten. They escalate into each other, so a hot run with a full thread
crossing a stage beat is the biggest moment a run can produce. That is how
the Peak-End rule gets a peak worth remembering.

### Synergies (new, small)

Combos between what you carry and how you play, so builds matter:

- **Charms** gain Thread-aware variants at the draft. *Silk*: Purrfects pay
  +2 yarn. *Double knot*: a Purrfect ties two knots once per stage. *Spare
  strand*: the first miss of a stage holds the thread instead of unravelling
  it. These sit beside today's charms, not in place of them.
- **Cats riding along** (live: each does something different) gain a style
  line at bond level 3: the cat reacts to your Purrfects (purr, ear twitch)
  and its perk ticks up a little on a Clean.
- **Variety** (today only the kitten cat pays for changing family, `fx.varied`
  ×1.2 points) gets its own feedback for everyone: a three-colour stitch when the last three solves were from three
  different kinds. Called **Patchwork**, it pays +1 yarn.

## The loop, second by second (Challenge, a good run)

| t | Event | What the player feels |
|---|---|---|
| 0.0 s | Board dealt with the game's reveal (iris, wipe, curtain...) | "ooh, this one" |
| 0.3 s | First touch: a soft tick, the touched piece glows (the board never moves) | instant response |
| 2.1 s | Solved, Swift and Clean: **Purrfect** | stamp, gold ring, three rising notes in key, double tick, +1 knot |
| 2.4 s | Token flies to the score; score counts up; heat ×3 to ×4 | progress, visible |
| 2.8 s | Next board deals | novelty again |
| ... | Five Purrfects later: **Cat's Cradle** | the run's peak: music swell, cradle figure, cradle bonus |
| 10th solve | **Stage** beat: sweep, stars, charm draft | a choice, a breather, a landmark |

## Pressure test

| Question | Answer |
|---|---|
| **Decisions with a downside?** | Charm drafts (three cards, one pick); Swift vs Clean (rushing risks a slip); kind and mode choice; Different puzzle (3 a run, costs nothing but skips a board you might have liked) |
| **Mastery curve?** | A new player solves. A practised one solves Clean, then Swift, then Purrfect, then keeps a thread through boards they find hard, then plays twists, then chases mastery stars and the Gold Thread |
| **Dominant strategy?** | "Play only the easiest kind." Variety pays (Patchwork, the kitten's ×1.2), each game's mastery stars only come from that game, and the Quilt shows every game you haven't touched |
| **Snowballing?** | Heat compounds points, but the clock and the cradle bonus are capped per stage. Losing doesn't compound: adaptive difficulty eases after two misses, and a miss costs the thread and some clock, never progress |
| **The second hour?** | Charms and synergies, twists (five rule variants per game), cats' perks and bonds, the Thread, Challenge ghosts |
| **The tenth hour?** | The Quilt nearing completion, Gold Thread mastery, seasonal patterns, Sparkle kits and stations, the Archive |
| **Cut list (first to go if time is short)** | 1. Patchwork variety stitch. 2. Thread-aware charms. 3. Cat style reactions. The grades and the Thread stand without them |

## Numbers (tunables, collected in one block)

The new code keeps every new constant in a `STYLE` table beside `STAGE_EVERY`,
so tuning never means hunting:

```js
const STYLE = {
  swiftSpeed: 0.45,      // speed ≥ this is Swift (same "quick" as adaptive)
  cleanPts: 1.10, purrPts: 1.25,
  cleanYarn: 0.2, swiftYarn: 0.2, purrYarn: 1,
  threadKnots: 5,        // Purrfects to a Cat's Cradle
  cradlePts: 500,        // × stage (min 1)
  cradleYarn: 5,
  patchworkYarn: 1
};
```
