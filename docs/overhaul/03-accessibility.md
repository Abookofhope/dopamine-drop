# Accessibility audit and remediation plan

Target: WCAG 2.2 level AA. "Evidence" names the check that backs the status; "Open" items are in the roadmap. axe-core (WCAG 2.0/2.1 A and AA tags) runs over Settings, You, Room, Play, Games and every mode's board; it is not a substitute for a screen reader pass, which is still to be done by a person.

| Criterion | Status | Evidence / plan |
|---|---|---|
| 1.1.1 Non-text content | Pass | Boards and glyphs are named; the Room's grade marks are now `role=img` with a label (v0.136.0, found by `panels.mjs`) |
| 1.3.1 Info and relationships | Pass | Panels are a heading containing a button, with `aria-expanded` and a labelled region; switches are `role=switch` with `aria-checked` |
| 1.3.4 Orientation | Pass | Both orientations probed (`hudstates.mjs`) |
| 1.4.1 Use of colour | Pass with Colour assist on | Colour assist adds a shape to every ink; `board.mjs` checks the hand-built boards with it on |
| 1.4.3 Contrast (minimum) | Pass by axe | axe's colour-contrast rule passes on every shell screen and board probed; High contrast raises contrast further. A hand measurement of every token pair is **Open** |
| 1.4.4 Resize text | Pass for the app's own text; boards partial | Text size 100, 115, 130, 150 percent (v0.140.0): every font size is calc(Npx*var(--ts)), a gate check refuses a bare px size, and `textsize.mjs` finds no sideways scroll and no clipped or off-screen line on the shell, HUD, pause sheet, Game Over and welcome screen at 320x568 and 360x640. Puzzle boards keep their tile text at a fixed size (they are drawn to fit): scaling those is **Open** |
| 1.4.10 Reflow | Pass at 320 CSS px | No horizontal scroll at 320x568 on any shell screen (`hudstates.mjs`, `settingsacc.mjs`, `panels.mjs`) |
| 1.4.11 Non-text contrast | Not measured | Switch, focus ring and panel chevrons have not been measured by hand; **Open** |
| 1.4.12 Text spacing | Pass in Easy-read | Easy-read widens letter and word spacing and the layout holds (no sideways scroll at 320) |
| 1.4.13 Content on hover or focus | Pass | No hover-only content |
| 2.1.1 Keyboard | Pass for shell screens | Enter and Space open panels; every control is a button or input. Boards: keyboard play is **Open** (many modes are drag or tap only) |
| 2.2.1 Timing adjustable | Partial | Game speed Relaxed and Slow stretch every clock, and an untimed Endless mode exists; adaptive difficulty (v0.141.0) eases boards after two misses and can be turned off; a new player's first three misses a run cost no time at all (v0.142.0); the Daily and timed modes cannot be switched to untimed |
| 2.2.2 Pause, stop, hide | Pass | Pause on every run; the in-run button is labelled Pause in the player's language (it was "End run" in English everywhere until v0.145.0); P pauses from a keyboard; Reduce motion stops particles, shake, ghosts, idle loops and entrances (the page carries the switch to CSS as `html[data-motion]`); Big celebrations off keeps the small touches and drops confetti, sweeps and the screen-edge glow |
| 2.3.1 Three flashes | Control provided; not independently audited | The Screen flashes switch turns the colour wash off, and the Calm, Focus and Easy to see presets set it off. A solve or miss is one 200 to 260 ms wash, but a frame-by-frame photosensitivity audit is **Open** |
| 2.1.2 No keyboard trap | Pass | The level-up card is modal and keeps Tab on its one button on purpose; Escape, Enter or a tap closes it and focus returns to where it was |
| 2.4.3 Focus order | Pass | DOM order matches visual order in panels |
| 2.4.7 Focus visible | Pass | Gold 2.5px ring; inside the sticky search and panel headers it is drawn inside so the scroller does not clip it |
| 2.5.1 Pointer gestures | Partial | Path-based gestures (draw, drag) exist in several modes; which have a single-pointer tap alternative has not been audited mode by mode, **Open** |
| 2.5.3 Label in name | Pass | Visible names match accessible names |
| 2.5.7 Dragging movements | Partial | Drag modes accept tap-to-select then tap-to-place where adapted; the rest are **Open** |
| 2.5.8 Target size (minimum 24px) | Pass; 44px adopted | Settings, You, Room, pause sheet and Game Over assert 44px. Boards: `sweep.mjs` flags anything under 40px |
| 3.1.1 Language of page | Pass | `html lang` follows the chosen language |
| 3.2.x Predictable | Pass | A panel opening never moves focus; a preset says what it did and offers Undo |
| 3.3.x Input assistance | Pass | The only text input is the settings search; erasing progress asks first |
| 4.1.2 Name, role, value | Pass | axe 0 on Settings, You and the Room with every panel open |
| 4.1.3 Status messages | Pass | Preset status, the "no match" message and toasts are live regions |

## Features requested in the brief, by status

| Feature | Status |
|---|---|
| Screen reader labels and roles | Done on the shell; boards named |
| Keyboard navigation | Shell done; boards open |
| Colourblind support | Done (Colour assist, shapes) |
| High contrast | Done |
| Reduced motion | Done (OS setting and in-app switch) |
| Flash reduction / photosensitivity | Switch and presets done; audit open |
| Dyslexia-friendly option | Easy-read text done (plain wide-set stack; not a claim of a clinical benefit) |
| Adjustable text size | Done for menus, prompts, HUD and sheets; boards keep their size |
| Adaptive difficulty and a different puzzle | Done (v0.141.0): visible, switchable, announced to screen readers through a status line |
| Plain help for a new player | Done (v0.142.0): free misses while learning, the rule shown again, two short notes in the polite live region (so a screen reader says them), words that wrap rather than being cut off on a 320px phone |
| Captions for sound | Done (v0.143.0) for the tick, go, solve chime, combo, miss buzz, level-up and run over; a pill at the bottom, hidden from screen readers (the polite status line already says the same events), shown even when sound is off; Chalk Line's bounce tones and the tap click are not captioned |
| Haptics toggle | Done |
| One-handed mode | Done (v0.143.0): the exit button moves to the lower corner on the chosen side (48px), the board gives up a strip for it, the pause sheet is built from the bottom; the score and streak stay at the top |
| Localisation-ready | Done (four languages, gate-enforced) |

## Remediation order

1. Scale board text where a board can grow to hold it (needs per-mode work).
2. Caption the remaining sounds (Chalk Line's bounces, the tap click) once there is a reason to.
3. Keyboard play for board modes, starting with the tap-only ones.
4. A person with a screen reader and a person with photosensitive epilepsy guidance review the releases.
