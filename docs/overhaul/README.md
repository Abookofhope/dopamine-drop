# Overhaul — product reinvention notes

Working documents for the "master overhaul" of Dopamine Drop: Brain Snacks. They record what was measured, what was changed, what is still open and how it is checked. Everything stated as a number here was measured by a probe in `tools/probe/` against a served build, not estimated.

| File | What it is |
|---|---|
| [01-audit.md](01-audit.md) | UX, UI and game-feel audit: findings, evidence, severity, status |
| [02-design-system.md](02-design-system.md) | Tokens, components and the rules the overhaul added (targets, panels, scroll versus tap, safe areas) |
| [03-accessibility.md](03-accessibility.md) | WCAG 2.2 AA status by criterion, with evidence and the remediation plan |
| [04-roadmap.md](04-roadmap.md) | What to do next: quick wins, medium term, long term, experiments, each with rationale, expected impact and effort |
| [05-before-after.md](05-before-after.md) | Measured before and after, per release |
| [06-qa-plan.md](06-qa-plan.md) | Device and viewport matrix, probe suite, manual checks and the release checklist |

## Releases so far

| Release | What changed for the player |
|---|---|
| v0.135.0 | The way out is always there: Game Over scrolls with a pinned Go again / Back to menu bar, the exit button and pause sheet are thumb-sized, scrolling a list no longer presses the buttons under the finger |
| v0.136.0 | Settings, You and the Room are folded panels with live summaries; settings search; presets (Calm, Focus, Easy to see) and Reset to defaults, all with Undo; easy-read text; 44px targets |
| v0.137.0 | The level-up card stays until you close it and says what the run was worth, what the level unlocked and what is next; every solve sends a token to the score |
| v0.138.0 | Game Over: the run's XP counts up and fills the level bar (wrapping on a new level), and the level-up card waits for it |
| v0.139.0 | First run opens on the two plainest boards (first solve in seconds); streak steps send a second token; Game Over's perk and yarn lines pay out in view; Chalk Line's unwinnable fallback fixed |
| v0.140.0 | Text size (100, 115, 130, 150 percent) for menus, prompts, HUD and sheets, with the boards unchanged; the achievements grid fits a 320px phone |

## Ground rules the work follows

1. Reproduce first, with a probe that fails on the old build, then fix, then show the same probe passing.
2. Every change is checked at 320x568, 360x640, 390x844, 412x915, both landscapes and two tablet sizes where the screen is affected.
3. All four languages (en, fr, es, de) carry every string; the gate (`tools/check_site.py`) enforces it.
4. Nothing ships on a red probe, and a probe that is flaky is fixed rather than re-run.
