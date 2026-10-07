# Design system notes

The look is a cat-and-yarn craft room on a dark violet ground. The tokens live in `:root` at the top of `site/app.html`; this file records the rules the overhaul added on top of them.

## Tokens

| Group | Tokens |
|---|---|
| Surface | `--ink` (ground), `--ink-2`, `--ink-3` (raised), `--edge`, `--edge-soft` (hairlines) |
| Text | `--cream` (primary), `--haze` (secondary; passes 4.5:1 on `--ink-2`) |
| Accent | `--flare` (action), `--zap` (gold: level, waiting), `--cool` (on, success), `--bad` (loss, danger) |
| Depth | `--lift`, `--lift-deep`, `--lift-press` (inset highlight plus shadow) |
| Radius | `--r-sm` 9, `--r-md` 15, `--r-lg` 22, `--r-xl` 30 |
| Type | `--f-disp` (headings), `--f-body`, `--f-data` (numerals); easy-read mode swaps display and body to a plain wide-set stack |
| Motion | `--t-fast`, `--t-med`; every animation is cut to 1ms under `prefers-reduced-motion`, and particles and shake also obey the in-app Reduce motion switch |

## Rules added by the overhaul

1. **Targets.** Anything a thumb must hit is at least 44px in both directions. A switch is small (46x27) and so the whole row is the target; the row is measured, not the switch. Probes assert this.
2. **Scroll versus tap.** Inside a scrolling ancestor, a touch or pen press fires on release, and only if the finger moved no more than 10px and the list did not scroll. Elsewhere (boards, buttons outside lists) a press fires on landing.
3. **Screens that can outgrow the phone scroll, and the exit is pinned.** Body scrolls, action bar is fixed to the bottom with safe-area padding, content is centred with auto margins rather than `justify-content:center`.
4. **Panels.** A long section is a `.setcard.acc`: header button (`.acchead`, 54px) with title and a live summary (`.acct small`), body that unfolds with a grid-rows transition, `visibility:hidden` when closed. Open state is stored under `dd.acc` by `data-acc` key, outside the save. A panel may default open with `data-open="1"`. A gold dot (`.hot`) says something inside is waiting.
5. **Undo over confirm.** A change that touches several settings (presets, reset) applies at once and offers Undo for 12 seconds in a status line that is a live region. Erasing progress keeps its explicit two-step.
6. **Status in the page, not in a dialog.** No native `alert` or `confirm`.
7. **Text scales through `--ts`.** Every font size in the stylesheets is `calc(Npx*var(--ts))` (or `calc(clamp(...)*var(--ts))`); the player's setting puts 1, 1.15, 1.3 or 1.5 on `html[data-ts]`. `#surface` resets it to 1 so boards fit. A size that must not scale (the logotype, a digit inside a ring) says `fixed` on its line, and the gate (`check_site.py`) refuses any other bare px size. The header's level text is capped at 115 percent so it stays on one line with the logo.
8. **Sound has a word.** With Sound captions on, each chime, buzz, tick, go, level-up and run end puts one short word in `#sndCap`, a pill 14px above the bottom edge, `aria-hidden` (the polite status line already says the event), `pointer-events:none`, gone after 1.3 s, shown whether or not sound is on. It is called from wrappers around the sound functions, so a new sound is captioned by adding a key to `CAPTION_OF`, not by editing each mode.
9. **Thumb zones.** With One-handed layout on, the exit is a 48px button fixed in the lower corner on the player's side (absolute inside the screen in portrait, fixed to the screen's edge in landscape, because the screens are a 460px column centred on the page), the board gives up the strip it needs (66px of height in portrait, only the overlap in landscape), and a sheet that can outgrow the phone is built from the bottom with an auto margin on its first child, never `justify-content:flex-end`, which would hide its top.

## Components

| Component | Where | Notes |
|---|---|---|
| Panel (accordion) | Settings, You, Room | see rule 4 |
| Search bar | Settings | sticky, accent-blind match on name and explanation (presets match on name only), "nothing matches" message |
| Preset row | Settings | name, one-line effect, Apply / Active button (`aria-pressed`) |
| Switch | Settings | `role=switch`, row-wide target |
| Segmented control | Game speed, Text size, One-handed layout, Stats filter | 44px high |
| Sound caption | Over a run, bottom | rule 8; one word, 1.3 s |
| Corner exit | In a run, one-handed | rule 9; 48px |
| Status line | Settings | `role=status`, Undo button |
| Pinned action bar | Game Over | Go again, Back to menu; side by side under 460px tall |

## To add

A shared token for the 44px minimum (`--hit`), a documented spacing scale, and a component page rendered from the real CSS so the system cannot drift from the product. Tracked in the roadmap.
