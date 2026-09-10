# Dopamine Drop: Brain Snacks

A rotating-mode puzzle game for short attention spans. The puzzle type changes
every round, so novelty never runs out.

**Play it:** https://abookofhope.github.io/dopamine-drop/

Installs to the home screen from Chrome, runs full screen, works fully offline.
Built from one source file (`web/app.html`) and deployed by a GitHub Action on
every push to `main` — see `web/README.md`.

The three names each do a different job:

| Name | Where it lives |
|---|---|
| **Dopamine Drop** | The brand — app name, icon, wordmark |
| **Brain Snacks** | Store subtitle and the in-app term for the modes. `Dopamine Drop: Brain Snacks` is 27 characters, inside Play's 30-character title limit |
| **Fidget Loop** | The no-timer, no-score mode. Also carries the "fidget" keyword that keeps the listing clear of health-claim territory |

---

## Getting started

The generated platform folders are not committed. Regenerate them first:

```bash
flutter create .          # recreates android/, ios/, web/ around the existing pubspec
flutter pub get
dart run flutter_launcher_icons   # writes the launcher icons into those folders
flutter run
```

The icon step is separate because the platform folders are not committed, so
there is nowhere to write the generated sizes until `flutter create .` has run.
Source art and the script that draws it are in `assets/icon/`; re-run
`python3 assets/icon/make_icon.py` after editing it, then regenerate.

```bash
flutter analyze           # must be clean
flutter test              # 136 tests
```

Sixteen of those are golden images: one per mode, three more for the
hue-dependent modes with colour assist on, and the settings screen. They catch what the render
tests cannot — a puzzle that throws no exception but no longer looks like
itself. After a deliberate visual change:

```bash
flutter test --update-goldens test/golden_modes_test.dart
```

A failure writes a diff into `test/failures/`, which is usually faster to read
than the code that caused it.

---

## Architecture

Everything rests on one contract, in `lib/engine/mode.dart`:

```dart
abstract class PuzzleMode {
  String get id;
  String get name;
  String get blurb;
  Duration get par;      // target solve time; beating it earns a speed bonus
  Duration get bonus;    // time returned to the clock on a solve
  bool get canMiss;      // false for modes where a wrong tap is impossible
  Widget build(PuzzleContext ctx);
}
```

The shell owns the run timer, scoring, streak multiplier, difficulty ramp,
teardown and persistence. A mode owns **only its puzzle**. That split is the
whole point: it is what makes "many modes" a weekend of work each rather than a
feature each, and a competitor with a hardcoded single mechanic cannot follow.

```
lib/
  engine/
    mode.dart        the contract above — read this first
    registry.dart    the list of modes; adding one is a single line
    run.dart         run kinds, scoring, streak multiplier, run state
    progression.dart levels, XP curve, difficulty scaling, unlock ladder
    rng.dart         seeded randomness (Daily Drop must match across devices)
    store.dart       local progress
    feedback.dart    sound and haptics
  modes/             one file per puzzle, 90-200 lines each
  money/
    ads.dart         Ads interface + AdPacing (the rules, testable without a network)
    billing.dart     Billing interface, one product
  ui/                home, play loop, game over, HUD, particles
  theme.dart         design tokens
tool/
  make_sfx.py        generates every sound effect; edit and re-run
docs/
  MONETIZATION.md    wiring AdMob and IAP, and the placement rules
  PLAY-CONSOLE.md    release checklist, the 14-day gate, data safety, listing
```

### Adding a mode

1. Write `lib/modes/your_mode.dart` implementing `PuzzleMode`.
2. Add one line to `kModes` in `lib/engine/registry.dart`.

Nothing else changes. The home screen, HUD, scoring and rotation all pick it up.

### Two decisions worth knowing about

**Difficulty ramps inside a run, not across sessions.** `level` is
`solved ~/ 3`, so the game gets harder only as the player earns it. There is no
grind before it gets good.

**Time is the resource, not lives.** A miss costs four seconds; it does not end
the run. A "you lose, watch an ad to continue" wall is the fastest way to end a
session, which is the exact failure this game is designed around.

---

## On Flame

`flame` is **not** a dependency, despite being the obvious pick for a Flutter
game. Every mode here is a grid of tap targets, some text and a `CustomPaint` —
Flutter's own widget layer does that better than a game engine does, and it
brings layout, accessibility and hit-testing for free.

Flame earns its place when a mode needs a real game loop — falling objects,
physics, hundreds of particles. Two planned modes (*Rising Tap*, *Sort Drop*)
are in that category. Because those modes sit behind the same `PuzzleMode`
contract as everything else, adding Flame then is additive: no shell change, no
migration.

---

## Status

**Twelve modes**

| Mode | Unlocks | Hook |
|---|--:|---|
| Odd One Out | 1 | visual discrimination |
| Snap Order | 1 | visual search + sequencing |
| Color Trap | 4 | Stroop inhibition |
| Echo | 8 | sequential memory |
| Rewire | 13 | orientation planning |
| Sum Snap | 19 | arithmetic |
| Count Fast | 50 | enumeration |
| Mirror | 100 | spatial reflection |
| Rising Tap | 150 | reaction; the only mode with its own clock |
| Blink | 200 | spatial memory |
| Slide Path | 250 | order-and-space planning |
| Word Snap | 300 | verbal — the only language-dependent mode |

**Accessibility**

Colour assist (Settings → Accessibility) adds a second, non-colour channel to
every puzzle that would otherwise ask the player to tell two hues apart:

| Mode | Without assist | With assist |
|---|---|---|
| Odd One Out | hue only | plus a floored lightness difference |
| Color Trap | colour swatches | every swatch and the word carry a shape |
| Count Fast | "how many purple?" | "how many crosses?" — shapes on every dot |

Lightness is the channel every form of colour vision deficiency can still
read, including total achromatopsia, and it keeps Odd One Out a discrimination
puzzle rather than turning it into find-the-different-symbol.

`test/golden_assist_test.dart` renders these three; the images are worth
checking through a colour-blindness simulator whenever the palette changes.

**Done**
- Mode engine and the six modes: Odd One Out, Snap Order, Color Trap, Echo,
  Rewire, Sum Snap
- Four run types: Blitz, Daily Drop (date-seeded, identical for everyone),
  Marathon, Fidget Loop
- Scoring with speed bonus and capped streak multiplier, difficulty ramp,
  local persistence, haptics
- 41 tests: scoring and run-state rules, daily-seed determinism, pipe-rotation
  invariants, and a render pass over every mode at three difficulty levels

**Not done**
- **AdMob and IAP are interfaces only.** `createAds()` returns `NoAds` until
  real unit ids exist; `AdMobAds` throws rather than shipping Google's test ids,
  which would serve real impressions against a policy violation. The placement
  and pacing rules are written and tested. See `docs/MONETIZATION.md`.
- **Fonts** are bundled, not fetched — `google_fonts` pulls typefaces over the
  network at runtime and does not reliably fall back, which rendered the whole
  game with no text at all on a first launch with no signal.
- Analytics and localization.

See `DESIGN.md` for the monetization model, the Play Store blockers and the
twelve planned modes.
