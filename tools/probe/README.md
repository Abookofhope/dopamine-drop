# Browser probes

Playwright probes that drive the built site in a real browser. They are the
reason most changes in this repo carry numbers rather than adjectives.

## Running

```sh
cd tools/probe && npm install && npx playwright install chromium   # once
cd ../.. && python3 tools/build_site.py _site
(cd _site && python3 -m http.server 8275 &)

node tools/probe/all.mjs         # all four, in order
```

Or one at a time:

| Probe | What it answers |
|---|---|
| `sweep.mjs` | Opens every mode and looks for what an eye would catch: something outside the board, a target under 40px, a control with no name, an element that takes space and paints nothing, an SVG whose ink is black on black. Plus axe on each. |
| `board.mjs` | Do the four hand-built boards fit a 320px phone in German with colour assist on, and is every control named? |
| `home.mjs` | Does the home tab hold up fresh, mid-climb, and with every mode mastered — four distinct picks, each with a reason, in four languages at three sizes? |
| `settings.mjs` | Does a settings row toggle when you tap it, does a row holding a button *not*, and does erasing your progress ask in the page? |

Environment: `PORT` (default 8275), `SITE` (default `/tmp/pw/_site`, where
`home.mjs` reads the mode roster from), `VW`/`VH` and `MAX` for `sweep.mjs`,
`MODES` for `board.mjs`, `AXE` to point at `axe.min.js` if it is installed
somewhere unusual.

Each probe exits non-zero when it finds something.

## Why `harness.mjs` exists

These probes used to live in a scratch directory with the navigation inlined in
each one. Changing where the Modes tab lands invalidated the selector in **eighty
of them at once**: one passed silently with `0/0 clean`, and seventy-nine hung on
a timeout. The repair was a regex over eighty files, which is the wrong shape of
repair.

So: anything about *how you reach a screen* lives in `harness.mjs` and nowhere
else. If the navigation changes again it is one edit.

Three rules the helper enforces, because each one has caught a real bug here:

- **Modes are opened by id, not by displayed name.** `openMode(page, 'sift', …)`
  works in German without the probe knowing the German for Sift. The ids come
  off `data-id` on the card, which exists for exactly this.
- **`openModeList` throws** if it reaches the Modes tab and finds no mode cards,
  rather than letting the caller hang or sweep nothing.
- **`floorOrDie`** fails a probe that found less work than it should have. Zero
  of zero is not a pass — that is how the sweep reported success at having done
  nothing for a whole afternoon.

`openApp` also dismisses the welcome screen and the changelog sheet, because a
probe that forgets them measures the welcome screen.
