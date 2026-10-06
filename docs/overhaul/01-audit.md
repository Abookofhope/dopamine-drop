# UX, UI and game-feel audit

Method: each finding was reproduced with a script on a served build (real touch events through the Chrome DevTools protocol where touch matters), measured, fixed and re-measured. "Status" says where it stands today.

## Findings

| # | Area | Finding | Evidence | Severity | Status |
|---|---|---|---|---|---|
| 1 | Mobile HUD | After a lost run the Game Over screen is cropped: the score runs off the top and Back to menu is below the bottom | `hudstates.mjs`: 31 failed checks on v0.134.0. At 320x568 Back to menu at y 597 of 568; at 568x320 at y 439 of 320; score up to 145px above the top. Cause: one centred flex column with no scrolling | Critical | Fixed in v0.135.0 |
| 2 | Mobile HUD | In-round exit button 34x34 and the pause sheet's End the run 43px | `hudstates.mjs` | High | Fixed in v0.135.0 |
| 3 | Touch | Scrolling a list presses the item under the finger (the shared tap helper fires on pointerdown) | `roomscroll.mjs` with real touch events: 3 of 8 swipes pressed something, 7 of 8 scrolled, one script error | Critical | Fixed in v0.135.0 |
| 4 | Navigation | Settings is a single 3.2-screen column of 25 controls, 17 of them under 40px | measured at 360x640 | High | Fixed in v0.136.0 (about 1.2 screens closed; every control 44px) |
| 5 | Navigation | You (Progress) is 10.8 screens: stat grids, a tile per achievement, a row per mode | measured | High | Fixed in v0.136.0 (1.2 screens) |
| 6 | Navigation | The Room is 5.3 screens: scene, gift, four long lists | measured | High | Fixed in v0.136.0 (1.35 screens) |
| 7 | Accessibility | The Room's grade marks have an `aria-label` on a span with no role (8 axe violations) | axe, WCAG 2.1 A/AA | Medium | Fixed in v0.136.0 |
| 8 | Localisation | The "progress is saved on this device only" line was English-only | read | Low | Fixed in v0.136.0 |
| 9 | Game feel | The level-up celebration disappears by itself after 1.9 s, so a player who looked away misses it; its text and the Game Over level line are English-only | read; `levelup.mjs` 35 failed checks on v0.136.0 | High | Fixed in v0.137.0 |
| 10 | Game feel | A solve bursts and flashes at the tile; nothing travels to the score, so the reward does not "arrive" | read | Medium | Fixed in v0.137.0 (a token flies from the solved piece to the score) |
| 11 | Game feel | Game Over shows the run's XP, perk and yarn lines as static numbers: nothing counts or fills, so the pay-out is read rather than felt | read; `runend.mjs` 5 failed checks on v0.137.0 | Medium | Fixed for XP in v0.138.0 (counts up, fills the level bar, wraps on a new level); the perk and yarn lines are still static |
| 12 | Accessibility | No text size control; the layout is built in px | read | Medium | Open (needs a rem migration) |
| 13 | Accessibility | Sounds have no visual captions | read | Low to medium | Open |
| 14 | Mobile | One-handed use: the top-left exit and the top-of-screen HUD are the reach-hardest places | read | Low to medium | Open |
| 16 | First run | A brand-new player's first run opens on a random board of 44, so the first solve depends on the draw (Odd Skein 0 of 5 fresh visits on v0.138.0) | `firstrun.mjs`: 14 failed checks on v0.138.0 | High | Fixed in v0.139.0 (opening on Odd Skein then Count the Stitches; first solve 3.3 s after the first tap in 5 of 5 fresh visits) |
| 17 | Game feel | Perk and yarn lines on Game Over are static numbers | `firstrun.mjs` | Low | Fixed in v0.139.0 |
| 18 | Reliability | Chalk Line's last-resort ramp started on the basket's side of the ball and could never be won: about 1 in 40 top-level boards (4 of 150 in one hunt, 2 of 120 in another); a further 1 to 2 percent of boards on the paw lost to pixel rounding of their own stored answer | hunts over 390 boards: 12 failures; forced fallback 0 of 50 | Medium | Fixed in v0.139.0 (0 of 150 afterwards; the fallback's fix is proven, the pixel-rounding part is encouraging not proven) |
| 15 | Retention | No weekly or seasonal structure beyond the daily gift, the day's wishes and the week's wish total | read | Medium | Open (see roadmap) |

## What the player already had

Worth keeping because it works: four tabs (Play, Games, Room, You), three plain game kinds on Play, a daily gift, wishes, a craft room with cats, per-mode twists and ranks, a game-speed setting, colour assist, high contrast, reduced motion, a flashes switch, sound and vibration switches, four languages, an offline worker and a backup file.

## Principles taken from the findings

- Anything taller than a phone scrolls, and the way out is never inside the scrolling part.
- A press that could be the start of a scroll fires on release.
- A long list is a folded panel whose header already tells you its state.
- A change to several settings is a preset that can be undone, not a confirm dialog.
