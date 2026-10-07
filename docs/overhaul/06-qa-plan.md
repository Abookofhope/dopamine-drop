# QA plan

## Matrix

| Axis | Values |
|---|---|
| Viewports (CSS px) | 320x568, 360x640, 390x844, 412x915, 568x320, 844x390, 768x1024, 1024x768 |
| Languages | en, fr, es, de (German is the longest; every shell screen is checked in it at 320 wide) |
| Settings states | defaults; Calm; Easy to see (high contrast, colour assist, easy-read); reduced motion on; sound off |
| Input | mouse, real touch (CDP touch events), keyboard on the shell |
| Save states | fresh install, veteran (level 100 or more), every mode mastered, a save from an older schema, an unreadable save |

## Automated suite (`node tools/probe/all.mjs`, fails on the first red probe)

| Layer | Probes |
|---|---|
| Gate | `tools/check_site.py`: four-language strings, every string used, difficulty ramp rule, manifest and worker |
| Shell | `firstvisit`, `layoutshift`, `geometry`, `settings`, `settingsacc`, `panels`, `board`, `mix`, `home`, `meta`, `roomscroll`, `hudstates`, `captions`, `onehand` |
| Feel and timing | `timing`, `momentum`, `fx_unit`, `framerate` |
| Per mode | one probe per mode that matters plus `sweep` (every mode) and `alive` (every mode, at its hardest level) |
| Long | `soak` (long run), `monkey` (random input) |
| Visual | `shots` (per-mode screenshot baselines) |

Rules: a probe passes on the new build and fails on the old; a flaky probe is fixed, not re-run; logs are written to a file outside the repo; the full chain runs once, with nothing else running, before a release is called verified.

## Manual checks (once per release, on a real phone where possible)

1. Fresh install: first win inside 30 seconds, no dead end, back button behaves.
2. Lose a run on a small phone and a landscape phone: Game Over reads, Back to menu is visible and works.
3. Scroll the Room, Settings and Games with a thumb: nothing opens or buys by accident.
4. Settings: every panel opens and closes, the search finds a word, presets apply and undo, Reset to defaults and undo.
5. Turn on Easy to see: nothing overlaps or runs off the side on any tab or board.
6. TalkBack or VoiceOver through Play, a round, Game Over, Settings.
7. Airplane mode: the app opens and plays; after reconnect, an update is offered and applies on one reload.
8. Rotate mid-run: the board and HUD recover without a reload.
9. Back button at every layer (sheet, pause, run, drill-down, tab) steps out one layer and never leaves the app.

## Release checklist

- [ ] Gate passes on the built site.
- [ ] Every new or changed behaviour has a probe that failed on the previous build.
- [ ] Shell probes pass on the final build.
- [ ] Full chain passes on the final build with nothing else running.
- [ ] CHANGELOG entry in plain language, VERSION_TAG bumped.
- [ ] Served build verified by fetching a string unique to it.
- [ ] Lessons captured, roadmap revised, "further improvements" list sent with the release note.
