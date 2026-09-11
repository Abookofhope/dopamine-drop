# Dopamine Drop: Brain Snacks

A rotating-mode puzzle game for short attention spans. The puzzle type changes
every round, so novelty never runs out.

**Play it:** https://abookofhope.github.io/dopamine-drop/

Installs to the home screen from Chrome, runs full screen, works fully offline,
and keeps everything on the device.

The three names each do a different job:

| Name | Where it lives |
|---|---|
| **Dopamine Drop** | The brand — app name, icon, wordmark |
| **Brain Snacks** | Store subtitle and the in-app term for the modes. `Dopamine Drop: Brain Snacks` is 27 characters, inside Play's 30-character title limit |
| **Fidget Loop** | The no-timer, no-score mode. Also carries the "fidget" keyword that keeps the listing clear of health-claim territory |

---

## What ships

Everything the live game is, is in **one file**: `site/app.html`. Markup, style
and the whole game in a single inline script. That is deliberate — it is also
published as a standalone artifact, where the host supplies the document
shell, so the file contains no `<html>`, `<head>` or `<body>` of its own.

```
site/app.html          the game — the only file that matters
site/icons/            app icons, referenced by the manifest
tools/build_site.py    wraps app.html into a real document; emits sw.js + manifest
tools/check_site.py    pre-deploy checks; the Action fails on any of them
.github/workflows/     builds and deploys to GitHub Pages on every push to main
```

### Build it locally

```bash
python3 tools/build_site.py _site     # writes index.html, sw.js, manifest, icons
python3 tools/check_site.py _site     # must pass before anything is pushed
cd _site && python3 -m http.server 8080
```

`_site/` is generated and git-ignored. Committing it would mean two sources of
truth for what is deployed.

### How updates reach an installed copy

The service worker's cache name is a **hash of the page, the manifest and the
icons**. Change anything and the name changes, so the old cache can never be
served for the new build. The worker does not call `skipWaiting` on install:
it waits, the page shows a banner at the top, and tapping it hands control
over and reloads. Nothing reloads under the player mid-run.

### What the pre-deploy check enforces

`tools/check_site.py` is not a formality — several of these have caught real
bugs that were about to ship:

- every inline script parses, and `sw.js` parses
- the cache name is a twelve-hex-digit build hash, not a constant
- the manifest parses, is installable, and every icon it names exists
- the page actually contains the game, not just a shell
- **every string exists in every language table** — a missing one renders as
  its own raw key, which nobody notices in a language they do not read
- **every word in every bank** matches its length bucket, is pure A-Z, is
  unique, and is not an anagram of another word in the same bucket — an
  anagram pair gives Word Snap one rack of tiles with two different answers

---

## How the game is built

One contract, in `site/app.html`:

```js
mode.build(ctx)   // renders into ctx.surface, then calls ctx.win() or ctx.miss()
```

`ctx` carries `level`, `rnd`, `surface`, `prompt()`, `after()` (a timer the
shell will clean up), `deal()` (non-repeating content) and `relaxed` (true in
Fidget Loop, where nothing can be lost).

The shell owns the timer, scoring, streak multiplier, difficulty, teardown and
persistence. A mode owns **only its puzzle**. That split is what makes
"sixteen modes" tractable.

### Difficulty

`Prog.effectiveLevel(solvedThisRun, playerLevel)` decides what every mode sees.
It is `2.2 * sqrt(playerLevel)` plus half the solves in the current run — a
root curve, so early levels are felt and later ones keep giving, with no
ceiling until well past where the modes themselves run out.

This replaced a version where the player's level was worth `floor(level/12)`
capped at eight. Under that, levels 1-11 were identical, everything past 96 was
identical, and nearly all the ramp came from within-run solves that reset every
run — which meant most modes had a harder half nobody had ever reached. If you
add a mode, give it somewhere to go past effective level 20.

### There is no unlock ladder

Every mode is playable from the first launch. Content gating fought the one
idea the game is built on: it exists because a single mechanic loses people by
round three, so withholding modes recreates the problem it solves. Mastery
stars per mode replace it — something to chase that is not permission to play.

### Every mode can be lost

A mode with no failure path cannot end a Marathon, which has lives and no
clock. The three manipulation puzzles — Mirror, Rewire, Slide Path — use a
budget of moves computed from the board in front of the player, so it is always
beatable and never endless. Fidget Loop is the deliberate exception.

### Adding a mode

1. Add an entry to `MODES` in `site/app.html` with `name`, `blurb`, `par`,
   `bonus`, `glyph` and `build(ctx)`.
2. Add its strings to all four language tables — the build fails otherwise.
3. Make sure it can be lost, and that it scales past effective level 20.
4. Run `tools/check_site.py`, then look at it on a 400px-wide screen.

### Accessibility

Colour assist adds a redundant **shape** channel to every hue-dependent mode
and widens lightness separation; shape is reserved for that, which is why Sort
Drop's third axis is fill rather than shape. Reduce motion turns off every
animation. Difficulty never comes from making something imperceptible — Odd
One Out's grid grows, its hue difference has a floor.

---

## There was a Flutter version. There isn't any more.

The game was first built as a native Flutter app — `lib/`, `test/`, `tool/`,
`assets/`, `pubspec.yaml`. When the brief became "one file, GitHub Pages,
installs from Chrome", it was rebuilt as the single HTML file above, and the
Flutter tree stopped being touched. By the time it was removed it was four
versions behind: twelve modes instead of sixteen, still carrying the unlock
ladder that had been deleted from the real game, no translations, no move
budgets, none of the current difficulty curve.

It has been deleted, because a second implementation that nobody updates is
not a backup — it is a trap for whoever reads the repo next and fixes a bug in
the copy that does not ship. It remains in git history if it is ever wanted.

Two things were kept out of it:

- **`site/icon-src/`** — the editable icon artwork (`icon.svg`,
  `icon_foreground.svg`) and `make_icon.py`, which renders them. `site/icons/`
  holds only the flat PNGs the app ships; this is what you edit if you ever
  need a different size for a store listing.
- **`docs/MONETIZATION.md`** — the ad placement and pacing rules. The
  decisions outlived the code; the file now states them without pointing at
  files that no longer exist.
