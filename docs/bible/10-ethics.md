# 10. Psychological safety and ethical engagement

People should come back because the game is good to them, not because it has
hooks in them. This chapter is the rulebook. Each rule says what it forbids or
requires, which pillar it protects, and how it is enforced. A rule with no
enforcement is a wish, so each one names a probe, a gate check or a review step.

## The five-minute test

> A tired or stressed player with five minutes leaves restored and satisfied.

Each part of that sentence becomes a requirement:

| Part | Requirement | Enforced by |
|---|---|---|
| *five minutes* | A run fits in five minutes or less by default. No reward needs a longer session (wishes count across sessions, the daily gift is one tap) | review of every new reward; `wishes` counted across runs |
| *tired* | Cozy mode exists, with no clock and no cost for a miss, and is one tap from Play | `dualmode.mjs` |
| *stressed* | Nothing in a run is new pressure the player didn't choose: no toast, no sale, no timer they didn't pick | `peakend.mjs`, toasts queued during runs (`toasts.mjs`) |
| *restored* | The session can end with Tuck in, a short calm closing scene with no offer in it | `peakend.mjs` |
| *satisfied* | Game Over leads with the best true thing about the run, even a run with no solves | `peakend.mjs` |

## Hard rules

These cannot be overridden by any feature, event or business case.

| # | Rule | Protects | Enforced by |
|---|---|---|---|
| E1 | **No energy, lives between runs, or wait timers.** You can always start another run, in any mode, immediately | Autonomy | gate: no cooldown fields in the save schema |
| E2 | **No paid power.** Money (if the game ever takes any) buys cosmetics or convenience only. Every cosmetic can also be earned with yarn | Competence, fairness | MONETIZATION.md rules; a review checklist item for every new shop entry |
| E3 | **No paid continues.** A run's end is final. The old "+15 seconds" rewarded-ad plan is withdrawn (see [05-economy.md](05-economy.md)) | Fairness, safety | the design decision is recorded; a probe checks the Game Over path has no offer |
| E4 | **Nothing is lost by not logging in.** No streak that destroys progress, and no item gone forever. Seasons keep their items in the Archive | Safety | `honest.mjs` (a missed day rests the gift ladder, it doesn't restart it); the Archive lists every past season |
| E5 | **No interruptions during a run.** Toasts, achievements, wishes and level-ups queue until the round ends or the run ends. Only the player's own pause stops a board | Flow | `toasts.mjs` |
| E6 | **No loot boxes or paid randomness.** Random rewards are free (gift days, charm drafts), and their odds are shown | Fairness | review; odds visible in the UI |
| E7 | **No notifications that nag.** None at all by default. If the player opts in, at most one a day, about something they asked to hear about | Autonomy | no Notification permission request in the code (gate) |
| E8 | **No shame copy.** No "You failed", "Too slow" or "Don't give up!" guilt. A miss names what happened and how to read the board | Safety, competence | i18n review list; the gate rejects a short list of banned phrases in all four languages |
| E9 | **Every celebration can be turned down.** Big celebrations, Reduce motion, sound, music, captions and vibration are separate switches, and all are respected everywhere | Sensory comfort | `motion.mjs`, `settings.mjs` |
| E10 | **No health claims.** Never "for ADHD", "treats", "therapy" or "improves focus" in the app or a listing. Mood words, not diagnoses | Honesty, platform policy | gate: banned-term list (see [12-risks.md](12-risks.md), R3) |
| E11 | **The player can always stop.** The way out is visible and reachable on every screen at every size (since v0.135.0) | Autonomy | `hudstates.mjs` |
| E12 | **Data stays on the device** unless the player opts in to something specific. No tracking SDK | Trust | gate: no third-party script origins |

## Soft rules (defaults that need a reason to break)

- **Session nudges are kind.** After 30 minutes of continuous play, Game Over
  offers Tuck in as the first option instead of Go again, once a session. It
  never blocks, counts down or nags.
- **Streaks are for celebrating, not threatening.** A streak is shown when it is
  a pleasure (two days or more) and is never shown as "at risk".
- **Variable rewards are bonuses on top of a fixed floor.** Every solve pays a
  known amount, and surprises add to it. A player is never left waiting for a
  roll to come good.
- **Difficulty is honest.** Adaptive difficulty is visible (the note, the pause
  line, the switch), and Challenge records say which assists were on.
- **Failure is information.** When a run ends, the player learns one thing: which
  board took the longest, the rule of the board they missed most, or a twist
  that would suit them.

## Accessibility is part of safety

Players with motor, visual, hearing, cognitive or vestibular needs must get the
same dignity as anyone else. The full status is in
[../overhaul/03-accessibility.md](../overhaul/03-accessibility.md). The bible adds:

- **Assists are a style, not a penalty.** Cozy, game speed, adaptive difficulty,
  the colour helper and hints never reduce yarn. Challenge records note the
  assists that were on, and nothing more.
- **Every new sense has a fallback.** Music has captions for its stingers ("♪
  rising"), haptics mirror a visual, and colour is never the only cue.
- **Motion budgets are hard limits.** No flashing above 3 per second (WCAG
  2.3.1); the frame budget probe also checks for large-area luminance flips.

## Review checklist (each release)

1. Does anything new interrupt a run? (E5)
2. Does anything new cost money, time or attention to keep? (E1, E4)
3. Can a five-minute Cozy player still get it? If not, why not?
4. Is it explained in the player's language with no shame copy? (E8)
5. Can it be turned down or off? (E9)
6. Does a probe or a gate check cover it?
