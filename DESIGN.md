---
type: design-doc
tags: [project, game, mobile, monetization]
created: 2026-09-09
status: prototype-built
---

# Dopamine Drop — design doc

> Six games. One tap.
> 60-second puzzle runs for people who can't sit through a 10-minute one.

**Naming.** Three names, each with its own job rather than competing for one
slot:

| Name | Where it lives |
|---|---|
| **Dopamine Drop** | The brand — app name, icon, wordmark |
| **Brain Snacks** | Store subtitle and the in-app term for the modes. `Dopamine Drop: Brain Snacks` is 27 characters, inside Play's 30-character title limit |
| **Fidget Loop** | The no-timer, no-score mode. Also carries the "fidget" keyword that keeps the listing clear of the health-claim problem in §7 |

**Playable prototype:** https://claude.ai/code/artifact/814ca54b-4129-41f8-b687-a45ca8bca233

---

## 1. The bet

The market is full of single-mechanic puzzle games. They lose the target player
in round three, because the novelty is gone and the mechanic is now a chore.

Dopamine Drop's mechanic **is** the rotation. The puzzle type changes every
round, so the player is never more than five seconds from something new. That
turns "short attention span" from the thing the game fights into the thing the
game is built around.

Every design decision below follows from that.

---

## 2. Design rules

| Rule | Why | Where it shows up |
|---|---|---|
| Playing within 3 seconds of launch | A menu is a place to lose someone | Home screen is one big **Blitz** button; no tutorial gate |
| Rounds resolve in 2–6 seconds | Round length is the real attention budget | Every mode is tuned to a `par` time in that band |
| Never punish with a dead end | A "you lose, watch an ad" wall ends the session | Time is the resource, not lives — a miss costs 4s, not the run |
| Correct answers buy time | Skill extends the session instead of ending it | +1.2s to +2.6s per solve, capped at 60s |
| Teach in the prompt, never in a tutorial | Nobody reads a tutorial | One line above the board: "Tap the colour it is printed in" |
| Difficulty ramps inside a run, not across sessions | No grind before the game gets good | `level = floor(solved / 3)` feeds every mode's generator |
| Feedback on every single tap | The feedback loop *is* the product | Haptics, synth blip, particle burst, floating score, screen shake |

**Explicit non-goals:** energy timers, forced tutorials, an account requirement,
a metagame you must engage with, anything that gates play behind waiting.

---

## 3. The mode engine — the part that actually matters

The "many modes" requirement is an architecture problem, not a content problem.
Solve it once and modes become cheap forever.

Every puzzle implements one contract:

```
build(ctx) → renders into ctx.surface, then calls ctx.win() or ctx.miss()

ctx = {
  surface,        // the DOM node / canvas to draw into
  level,          // 0..N difficulty, owned by the shell
  rnd,            // seeded PRNG — makes Daily Drop identical for everyone
  after(ms, fn),  // timers the shell will tear down for you
  prompt(text),   // the one-line instruction
  win(node), miss(node)
}
```

The shell owns the run timer, scoring, streak multiplier, difficulty ramp,
teardown, persistence, and eventually ads and analytics. A mode owns *only its
puzzle*. In the prototype each mode is 30–90 lines.

Consequences worth naming:

- **A new mode is a weekend, not a sprint.** That is the whole moat. A
  competitor with a hardcoded single mechanic cannot follow you.
- **Modes are content, so they can ship live.** Once modes are data-driven you
  can add them by config push instead of a store release.
- **A/B testing modes is trivial** — the shell already knows solve rate and
  time-to-solve per mode, so you can cut the ones players quit on.

---

## 4. Mode roster

### Built in the prototype

| Mode | Mechanic | Cognitive hook | Ramps by |
|---|---|---|---|
| **Odd One Out** | Grid of tiles, one hue is off. Tap it. | Visual discrimination | Grid 2×2→5×5, hue delta 52°→7° |
| **Snap Order** | Scattered numbers, tap 1→N ascending. | Visual search + sequencing | Count 3→8, bubbles shrink |
| **Color Trap** | Colour word printed in a different ink. Tap the ink. | Stroop inhibition | Swatch count 3→5 |
| **Echo** | Pads flash a sequence, repeat it. | Working memory | Length 3→7, grid 2×2→3×3 |
| **Rewire** | Rotate pipe tiles until current flows source→sink. | Spatial planning | Grid 3×3→4×4, path length |
| **Sum Snap** | Find two numbers that hit the target. | Light arithmetic | Grid 3×3→4×4, values to 20 |

Deliberate texture variation: **Rewire has no wrong answer** — it costs time,
not a penalty. **Echo rewards sitting still**, which is the one mode that
contrasts with the rest. Don't make all twelve modes reaction tests.

### Modes 7-12 — built

| Mode | Unlocks | Mechanic | Cognitive hook |
|---|--:|---|---|
| **Count Fast** | 50 | How many of the target colour? Four answers | Enumeration under time pressure |
| **Mirror** | 100 | Reflect the pattern across the centre line | Spatial reflection |
| **Rising Tap** | 150 | Targets appear and shrink; catch them | Reaction and precision |
| **Blink** | 200 | A pattern flashes once; rebuild it | Spatial working memory |
| **Slide Path** | 250 | Slide bars out of the corridor | Planning about order and space |
| **Word Snap** | 300 | Unscramble the word letter by letter | Verbal |

Each was picked for an axis the roster did not already cover, not for variety's
own sake. Three deliberate pairings: **Blink** is spatial where **Echo** is
sequential; **Slide Path** is about order and space where **Rewire** is about
orientation; **Rising Tap** is the only mode with a clock of its own, and the
only one where doing nothing is a mistake.

**Word Snap sits last on purpose.** It is the only mode with a language
dependency — every other mode ships to every locale untouched, and this one
needs a curated word list per language before the game can be localised.

Three of twelve (Rewire, Mirror, Slide Path) cannot be failed: a wrong move
costs time, not the streak. Thinking puzzles that punish a wrong move stop being
thinking puzzles.

### Still on the list

Balance, Trace, Odd Rhythm, Fold, Chain, Sort Drop — the roster in the original
plan that has not been built. Slot each into the ladder at the next 50-level
rung as it ships.

## 5. Run types

| Type | Shape | Job |
|---|---|---|
| **Blitz** | 60s cap, modes rotate, correct answers add time | The default. The thing the game *is*. |
| **Marathon** | One mode, 3 lives, endless ramp | For the session where they lock in |
| **Daily Drop** | Seeded from the date — identical for every player | Retention + a reason to share a score |
| **Zen** | No timer, no score, no fail | Fidget mode. Costs nothing, keeps the app on the phone. |

**Scoring:** `(100 + 130 × speed) × multiplier`, where `speed` is how far under
the mode's par time you solved it, and `multiplier = 1 + floor(streak / 4)`,
capped at ×5. Speed and streak both matter, so there are two ways to be good.

---

## 5b. Levels, scaling and unlocks

### There is no level cap, and there shouldn't be

Player level is derived from lifetime XP (`~10 XP` a solve), never stored
directly — one source of truth, so retuning the curve re-levels everyone
correctly instead of stranding saved levels at the old rate.

`xpToNext(level) = 50 + 10 × (level − 1)`, which has the closed form
`totalXpForLevel(L) = (L−1)(5L+40)`. The inverse is solved as a quadratic
rather than counted up, so it stays O(1) at level 10,000.

### Difficulty scales in two stages, because one stage can't scale forever

Board complexity has a hard ceiling: a 12×12 Odd One Out is unplayable on a
phone, and Echo cannot ask for a 40-flash sequence. So:

| Stage | Mechanism | Bounded? |
|---|---|---|
| **Structural** | Grids grow, sequences lengthen, hue gaps narrow. `effectiveLevel = solvedThisRun/3 + min(playerLevel/12, 8)` | Yes — each mode clamps its own generator |
| **Pressure** | `pressure(level) = 0.55 + 0.45 × 0.985^level` scales both the speed-bonus window and the time returned per solve | Asymptotic — approaches 0.55, never zero |

Two properties worth keeping when tuning: pressure is **monotonic** (difficulty
never dips as you level) and **floored** (level 5,000 is sharper than level 250,
never impossible). Both are enforced by tests.

The in-run ramp and the veteran offset are separate on purpose. The ramp means a
run gets harder as you earn it; the offset means a level-200 player doesn't
replay 2×2 grids every time. Both are snapshotted at run start, so crossing a
level boundary never changes the rules mid-run.

### The unlock ladder

Two modes from the first launch so the rotation — the actual product — is real
immediately; the rest of the base game inside the first sitting; then
fifty-level spacing for modes that don't exist yet.

| Unlock | Kind | Level | XP | Runs | Time |
|---|---|--:|--:|--:|--:|
| Odd One Out | mode | 1 | 0 | 0 | — |
| Snap Order | mode | 1 | 0 | 0 | — |
| Color Trap | mode | 4 | 180 | 1 | 2 min |
| Fidget Loop | run type | 6 | 350 | 2 | 4 min |
| Echo | mode | 8 | 560 | 4 | 6 min |
| Marathon | run type | 12 | 1,100 | 7 | 11 min |
| Rewire | mode | 13 | 1,260 | 8 | 13 min |
| Sum Snap | mode | 19 | 2,430 | 16 | **24 min** |
| Daily Drop | run type | 26 | 4,250 | 28 | **42 min** |
| Slide Path | *planned* | 50 | 14,210 | 95 | 2.4 h |
| Rising Tap | *planned* | 100 | 53,460 | 356 | 8.9 h |
| Mirror | *planned* | 150 | 117,710 | 785 | 19.6 h |
| Count Fast | *planned* | 200 | 206,960 | 1,380 | 34.5 h |
| Word Snap | *planned* | 250 | 321,210 | 2,141 | 53.5 h |

*(15 solves a run, ~10 XP a solve, 90-second runs.)*

Three decisions inside that table:

**Two modes at level 1, not one.** One mode alone is the single-mechanic game
this one exists to beat, and the first run is where the rotation has to sell
itself. Two is the minimum that demonstrates the product.

**Daily Drop last, at 26.** It's the retention hook, so it lands as the payoff
for finishing the opening ladder rather than as one more button on day one — but
at 42 minutes, not the 53 hours the fifty-level version would have cost.

**The long ladder spends its pull on content that doesn't exist yet.** Levels
50–250 are modes 7–12 from §4, not modes already built. That's the whole
argument for this shape: a drip aimed at new content instead of at content the
player could already be enjoying.

Those five later rungs are **promises, not grants**. A planned rung carries a
name and nothing else — it can never enter the playable pool, never counts as
something the player just earned, and renders as "in an upcoming update" rather
than as a lock they failed to reach. As each mode ships, its `plannedName`
becomes a real `modeId`: the level stays, the promise becomes the thing. Tests
enforce that a promise grants nothing and that levelling past every planned rung
still yields exactly six modes.

The ladder remains one constant. `kLadderClassic` (one mode per fifty levels,
run types at 250) and `kLadderFast` (everything inside ten minutes) are kept as
the two ends this sits between, and swapping `kLadder` swaps the entire economy.
Tests pin the shape: rotation is real at level 1, every mode is open by 19,
every run type by 26, the tail keeps exact fifty-level spacing, and the whole
base game stays reachable inside 90 minutes.

### Locked ≠ locked

Two distinct gates, and conflating them misdescribes the game: a mode can be in
the Blitz rotation while **Marathon** — playing it solo — is still gated. The
mode list says "Unlocks at level N" for the first and "In the Blitz rotation ·
solo play at level N" for the second. Locked rungs stay on screen rather than
being hidden: the ladder ahead is most of the reason to come back, and a hidden
reward motivates nobody.

## 6. Money

### Structure

| Source | Placement | Notes |
|---|---|---|
| **Rewarded video** | "+15 seconds" on the game-over screen; unlock a cosmetic theme | Highest eCPM and entirely opt-in. The main earner. |
| **Interstitial** | Every 3rd run ends, never mid-run, never before run 3 of the session | Mid-run interstitials are the single fastest way to a 1-star review |
| **Banner** | Home screen only. Never during play. | Low value, low harm, quietly compounds |
| **Remove Ads IAP** | One-time, ~$3.49 | Keeps banner+interstitial off, leaves rewarded available |

No subscription. A subscription on a game like this creates support load,
refund handling, and churn management — the opposite of passive.

### Honest expectations

Blended ARPDAU for a casual puzzle game with no user-acquisition spend runs
roughly **$0.01–0.05**. So ~1,000 daily active users is somewhere around
**$300–900/month**, and the hard part is emphatically the 1,000 DAU, not the
monetization. Most self-published games never get there. Outcomes in this market
are extremely skewed: a small number do very well, the median does close to
nothing.

That does not make this a bad idea — build cost here is low, the mode engine is
reusable across future titles, and ASO iteration is a real skill that compounds.
But plan it as *a portfolio bet with a long tail*, not a salary. The realistic
first goal is a few hundred organic installs and a retention number worth
optimizing, not revenue.

### The lever that actually matters

D1 retention. Everything else is downstream. Instrument from day one:
- D1 / D7 retention
- Session length + sessions per day
- **Per-mode quit rate** — which mode is on screen when people close the app
- Runs before first rewarded-ad view

The per-mode quit rate is the metric the engine was built to exploit. Cut the
bottom two modes every release and the game gets monotonically better.

---

## 7. Play Store path

These are the non-obvious blockers. **Verify each in the Play Console before
relying on it — Google changes these regularly.**

1. **$25 one-time developer registration fee.** Stable for years.
2. **Personal accounts registered after 13 Nov 2023 must run a closed test with
   ~12 testers opted in continuously for 14 days** before they can apply for
   production access. This was originally 20 testers and was reduced. **This is
   the big schedule risk** — line up the testers *before* you finish the build,
   not after. Organization accounts (which need a D-U-N-S number) are exempt.
3. **Do not market it as an ADHD treatment.** "A game for ADHD" edges into
   Google Play's health-claims territory and invites a rejection or a demand for
   substantiation. Frame it as a *fidget / quick-play / short-session* game.
   Same content, no policy exposure. Use ADHD language in community marketing,
   not in the store listing's claims.
4. **Set the target age to 13+** in the content-rating questionnaire. A bright,
   simple puzzle game can get classified as child-directed or mixed-audience,
   which pulls you into the Families policy: certified ad SDKs only, no
   interest-based ads, much lower eCPM. Avoid it deliberately.
5. **Data safety form + IARC content rating** are both mandatory. AdMob collects
   an advertising ID — declare it.
6. **Target API level** must stay within Google's rolling window (roughly one
   year behind the current Android release), which means a recompile-and-ship
   roughly annually. That is the real "passive income" tax on a mobile game:
   it is passive revenue, but not zero maintenance.

### ASO

Name in the listing should carry the searchable words the brand name doesn't:
`Dopamine Drop — Quick Puzzle Games`. Primary keywords: *quick puzzle, brain
games, fidget, time killer, short games, offline puzzle, reaction, satisfying*.

---

## 8. Stack — decided, then changed

**Originally Flutter**, targeting Android first. That is not what shipped.

The brief changed partway through: the game had to be playable on a phone
*now*, installable from Chrome, working offline, deployed in about a minute.
That is a web app, so the game was rebuilt as a single HTML file — `site/app.html` —
with a service worker whose cache name is a hash of the page, so an update
invalidates itself. No framework, no build step beyond a script that wraps the
file into a document and emits the manifest and worker.

The Flutter implementation reached twelve modes and 151 tests before it was
abandoned, and has since been deleted rather than left to rot four versions
behind the real game. The one idea that survived the move intact is the mode
contract: `build(ctx)` renders a puzzle and calls `ctx.win()` or `ctx.miss()`,
and the shell owns everything else. That is what made porting sixteen modes
between two entirely different stacks tractable at all.

**If it ever goes native for the Play Store**, the same contract should be the
first thing rebuilt, and `docs/MONETIZATION.md` has the ad and purchase rules
waiting. A game engine is still not needed — every mode is a grid of tap
targets, some text and a little drawing.

## 9. Roadmap

| Phase | Work | Gate |
|---|---|---|
| **0 — done** | Name, concept, mode engine, six playable modes | Prototype is live |
| **1 — done, then superseded** | Flutter port: shell, twelve modes, four run types, levels and unlock ladder, audio, particles, 151 tests | Built and ran. Replaced by the web app when the brief changed; since deleted |
| **2 — done** | Ads, IAP and pacing rules behind interfaces; Play Console release path documented | `docs/MONETIZATION.md`, `docs/PLAY-CONSOLE.md` |
| **3 — done, differently** | Own repo, live at GitHub Pages. Sixteen modes, no unlock gating, mastery stars, Mixtape, four languages, settings, colour assist. | Installs to the home screen from Chrome and runs offline |
| **4 — next** | Decide whether the Play Store is still the goal. It needs a native build, which the web app is not. Until then the web app is the product. | A decision, not a build |
| **5** | If native: closed test (12 testers, 14 days), then soft launch, ASO, cut the worst modes on quit rate | D1 retention > 25% |

## 10. Known gaps

- ~~Colour-blind accessibility~~ **done.** Colour assist adds a second,
  non-colour channel to all three hue-dependent modes: a floored lightness
  difference in Odd One Out, and shapes on the swatches and dots in Color Trap
  and Count Fast. Verified against a simulated deuteranope view, not just
  asserted. Difficulty never comes from making something imperceptible — Odd
  One Out's grid grows, its hue difference has a floor.
- **There is no monetization at all.** The shipping web app serves no ads and
  sells nothing. The placement and pacing rules are decided and written down in
  `docs/MONETIZATION.md`; none of it is implemented.
- No localization, no cloud save or leaderboard.
- **Settings are per-device.** Sound, vibration, reduce motion and colour assist
  all persist locally; there is no account to sync them to, which is deliberate.
  Resetting progress deliberately keeps them: a player clearing their scores has
  not asked for sound back.
- **The web prototype is behind the app.** It has the original six modes and no
  audio or particles. It is kept as a hands-on demo of the core loop and the
  unlock ladder, not as a second implementation to maintain.
