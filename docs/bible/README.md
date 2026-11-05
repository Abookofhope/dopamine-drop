# Dopamine Drop: the overhaul bible

The complete design for the overhauled game: what it is for, how every system
works and why, the standards every piece must meet, and the road from the
current build to the full vision.

It builds on the game as it stands (v0.145.0, 44 games, the craft room and its
cats) and on the overhaul notes in [../overhaul/](../overhaul/), which record
what was measured and shipped. The bible says where the game is going. The
overhaul notes say where it has been.

## Chapters

| # | Chapter | What it answers |
|---|---|---|
| 0 | [Baseline](00-baseline.md) | What exists today, with numbers, and the ten faults found while taking stock |
| 1 | [Vision](01-vision.md) | The one-page promise: what stays, what's added, for whom, how we'll know |
| 2 | [Core loop](02-core-loop.md) | The inner and outer loops; style grades, the Thread, the Cat's Cradle; the pressure test |
| 3 | [Juice and feedback](03-juice.md) | The feedback ladder T0–T6, laws, per-system table, profiles, budget |
| 4 | [Progression and ownership](04-progression.md) | Three time scales; the Quilt; milestones; cats; the Kit; mastery |
| 5 | [Economy](05-economy.md) | Sources, sinks, the income model, variable rewards, the recap, money if ever |
| 6 | [Two doors](06-dual-mode.md) | Cozy (Bliss) and Challenge (Mastery); the ghost |
| 7 | [HUD and interface](07-hud.md) | Every HUD element, density levels, toasts, readability standards |
| 8 | [Quality of life](08-qol.md) | The prioritized list, P0 to P3; onboarding under 90 seconds |
| 9 | [AV standards](09-av-standards.md) | Animation, particles, audio and Room Radio, lighting |
| 10 | [Ethics](10-ethics.md) | The five-minute test; hard rules E1–E12; the review checklist |
| 11 | [Walkthroughs](11-walkthroughs.md) | Early, mid and late sessions, step by step |
| 12 | [Risks](12-risks.md) | Sixteen risks and their defences; pitfalls of addictive games |
| 13 | [Roadmap](13-roadmap.md) | Now → MVP (nine releases) → AAA |

## The pillars, and where each is served

| Pillar | Main systems |
|---|---|
| **Flow** (clear goals, instant feedback, matched challenge) | rotation, the ladder, adaptive difficulty, the HUD dimming in a round, toasts that wait |
| **Competence** | style grades, the Style profile, mastery ranks, the Gold Thread, informative misses |
| **Autonomy** | the two doors, the kinds, the Kit, Custom mixes, every switch in Settings |
| **Relatedness** | the cats (bonds, reactions, names), the Daily ghost link |
| **Sensory pleasure** | 44 signatures, Room Radio, haptic tiers, lighting |
| **Progress and Peak-End** | peak-first Game Over, the Today line, the Thread, stages, Tuck in |
| **Ownership** | the Quilt, the Room, milestones, accessories, named cats |
| **Generous rewards** | yarn on every solve, style pay, gifts, the lucky skein, no hard currency |
| **Psychological safety** | Cozy, the gift that rests, no shame copy, no loss for a day off |
| **Mastery** | Challenge, twists, stars, ghosts, the Thread under pressure |

## Status marks used in the chapters

- **live**: in the shipped game (v0.145.0 or earlier)
- **new**: specified here, built in the MVP
- **AAA**: specified here, needs resources beyond the MVP

As releases ship, the matching rows in [00-baseline.md](00-baseline.md) and
[13-roadmap.md](13-roadmap.md) are updated, and the release is recorded in
[../overhaul/05-before-after.md](../overhaul/05-before-after.md).
