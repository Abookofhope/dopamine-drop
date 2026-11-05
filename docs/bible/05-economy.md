# 5. Economy and rewards

## Philosophy

1. **Generous, always.** Every solve pays something, and every session ends with
   more than it started with. The game gives freely, so a gift that arrives
   feels like a gift, not a payment.
2. **One soft currency.** Yarn. It's earned only by playing and caring for the
   cats, and spent on cats, the room and how things look. A second currency
   would add arithmetic and no joy.
3. **No hard currency.** If the game ever takes money (a native build), it sells
   **priced items**, not a currency. A currency hides real prices behind an
   exchange rate, and that is a dark pattern by itself. See
   [Money, if ever](#money-if-ever).
4. **Sinks are beautiful.** Everything you can buy makes the room, the cats or
   the solve look and sound more yours. Power is earned by play (perks, stars),
   cats aside (below).
5. **Inflation is checked as hard as income.** A currency with nothing to buy is
   noise.

## Sources (live) and what changes

| Source | Amount (live) | Change | Why |
|---|---|---|---|
| Each solve | 0.8 (×1) to 2.4 (×5) | + style: Clean +0.2, Swift +0.2, Purrfect +1 | competence pays visibly |
| End of a scored run | `score / 500` | Cozy runs (unscored) pay `solves × 0.6` | Cozy must not earn less per minute of play than an average Challenge run |
| Cat's Cradle | — | +5 | the run's peak pays |
| Patchwork stitch | — | +1 | variety pays everyone, not only kitten owners |
| Stage beat | charm draft or a 12-yarn nap | Cozy: a 10-yarn stage gift instead of a draft | Cozy has no point charms to draft |
| Wishes | 30 / 45 / 65; 250 a week for 9 | unchanged | already generous |
| Daily gift | 20 … 120 over 7 days | **a missed day rests the ladder** (you resume on the day you reached) | E4: nothing is lost by taking a day off |
| Achievements | 87, 18,770 in all | unchanged | one-time |
| Petting a cat | 2 a cat a day | unchanged | care loop |
| Milestones | — | none: they pay in beauty | keeps them from feeling like a job |

### Expected income (estimates for tuning, not measured)

| Player | Session | Yarn a day, first month | After the achievements are paid |
|---|---|---|---|
| Five-minute player | one 5-minute run | about 60 (run) + 50 (gift) + 45 (one wish) = **~155** | ~155 |
| Daily regular | 15 minutes, a Daily Drop | about 180 + 50 + 135 = **~365**, plus ~300 a day of achievements in week one | ~365 |
| Enthusiast | an hour | about 700 + 185 = **~885** | ~885 |

At these rates a daily regular has bought every cat and room grade (27,370) in
about **two months**. That is B7: today, yarn stops meaning anything for the
most loyal players.

## Sinks

| Sink | Items | Price range | Total | Status |
|---|---|---|---|---|
| Cats | 20 | 0 – 3,500 | 21,350 | live |
| Room grades | 24 | 50 – 900 | 6,020 | live |
| **Accessories** | 60 (3 per cat) | 150 / 300 / 600 | 21,000 | new |
| **Sparkle kits** | 6 new (the 6 victory colours stay free by level) | 600 – 1,500 | ~6,000 | new |
| **Room Radio stations** | 3 to buy (one free; one from a milestone) | 800 – 1,600 | ~3,600 | new |
| **Wallpapers and floors** | 8 + 8 | 400 – 1,200 | ~10,000 | new |
| **Season sets** | about 6 a season, 4 seasons a year | 250 – 1,200 | ~3,600 a season | new |
| **Treat jar** (repeatable) | a treat for a cat: +10 bond | 25 | unbounded | new |

The new sinks add **~44,000** of cosmetics plus **~14,400 a year** of
seasons, which carries a daily regular from month two to about month six. The
treat jar is a soft, repeatable sink after that. Bond is slow by design (900
solves for the top step), and buying treats speeds it up gently without
breaking it: 25 yarn buys 10 bond, against 1 bond per solve ridden.

**Rule for prices:** a common cosmetic costs about one day of a regular's yarn,
a rare one about a week, a legendary one about a month. Nothing costs more
than 3,500 (the dearest cat today).

## Variable rewards, on a fixed floor

The fixed part (yarn per solve, wish pay, gift ladder) is known and dependable.
The variable part is always free and always a bonus:

| Variable reward | Odds (shown in the UI) | Pays |
|---|---|---|
| Charm draft | rarity weights 60 / 32 / 8 (rare weight rises with the stage) | a run modifier |
| Hairball charm | 12% per solve | ×3 points |
| Cat procs (Clover, Pixel, ...) | per cat, shown on the cat's card | small yarn or time |
| **Lucky skein** (new, E1 on the old roadmap) | 1 solve in 40, never twice in 10 | ×2 yarn on that solve, a gold-thread spray and a distinct chime |
| **Mystery treat** on gift day 7 | one of 4 accessory colours you don't own, else 120 yarn | a cosmetic |

Variable-ratio rewards are the strongest pull a game has, so they are used
only for delight. Nothing a player needs comes from a roll, and no roll costs
anything to make.

## Post-session recap (the payout moment)

Game Over is where the economy is felt. It pays out in this order (Peak-End):

1. **The peak**: the run's best moment, as a line and a replayed stinger
   ("Purrfect on Patchwork, 2.1 s", "Cat's Cradle at 4:12", "New best", "First
   ×5"). A run with no solves leads with something true and kind: "You met
   Latch Hook. The rule: turn rows until every hook lines up", with Practise in
   Cozy offered.
2. **The score** counts up (Challenge), or the solves (Cozy).
3. **XP** fills the level bar (live).
4. **Yarn** flies to the basket with the breakdown: solves, style, Cradle,
   stage gifts (live, extended).
5. **What moved**: quilt stitches, bond steps, wishes ticked, milestones near.
6. **Next up** (live): one concrete next goal.

## Money, if ever

The live web game has no monetization and the bible recommends it stays that
way. If a native build ever needs revenue, these rules replace the earlier plan
in [../MONETIZATION.md](../MONETIZATION.md):

| Earlier plan | Decision | Why |
|---|---|---|
| Rewarded ad: "+15 seconds" at the end of a timed run | **Withdrawn** | a paid continue; it sells power at the moment of loss (E2, E3) |
| Interstitial after Game Over (paced) | Withdrawn | it lands exactly on the peak-end moment and spends it |
| Banner on the Play tab | Withdrawn | ruins the Room's warmth for very little revenue |
| Remove Ads purchase | moot without ads | — |
| **New:** Supporter pack | a one-time purchase: a season's set early, a Supporter sparkle kit, a thank-you cat bandana; everything in it also earnable with yarn | cosmetic, honest price, no currency |
| **New:** optional rewarded ad (only if ads are ever required) | "Double this run's yarn", offered once after the recap, never before the peak, never in Cozy | convenience, not power; the recap's peak is already spent |
