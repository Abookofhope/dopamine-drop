# 9. Animation, particles, audio and visual standards

The full motion system is documented in
[../overhaul/07-motion.md](../overhaul/07-motion.md) (v0.144.0). This chapter
sets the standards every new piece must meet, and specifies the parts the
overhaul adds: Room Radio, the frame kick and the lighting layer.

## Animation

### Curves and durations (tokens, live)

| Token | Use | Value |
|---|---|---|
| `--e-out` | things arriving | `cubic-bezier(.16,1,.3,1)` |
| `--e-in` | things leaving | `cubic-bezier(.7,0,.84,0)` |
| `--e-snap` | toggles, chips | `cubic-bezier(.34,1.56,.64,1)` |
| `--e-spring` | pops, stamps, the frame kick's return | a sampled spring, `linear(...)`, with a cubic-bezier fallback |
| `--e-soft` | settling, glows | a soft `linear(...)` overshoot of 6% |
| `--m-quick`, `--m-base`, `--m-slow`, `--m-stage` | 140, 260, 520, 900 ms | — |

### The rules

1. **Anticipation, action, follow-through** on every T3+ moment (see the
   ladder in [03-juice.md](03-juice.md)). Wind-up 60–120 ms, impact, settle
   300–900 ms.
2. **Secondary motion** on characters: a cat's tail follows its body by 80 ms,
   and its ears lag a head turn. Implemented as staggered keyframes, never as
   endless loops inside the SVG (the Loaf Box lesson: an infinite animation on
   a part inside a drawing costs layout every frame).
3. **Endless animation only on transform and opacity**, only on whole layers,
   and only outside a run's board. Idle life is scheduled *moments* (a blink,
   a twitch), never a loop (live since v0.144.0).
4. **Frame rate independent.** Anything that moves per frame moves per
   millisecond (`framerate.mjs` checks 30, 60 and 120 Hz).
5. **60 fps target, 120 Hz clean.** The busiest moment's p95 frame stays under
   16.7 ms on a mid phone and under 33 ms at 4× CPU slowdown
   (`framebudget.mjs`).
6. **The stability rule.** Board pieces never move or resize from rendering.
   Motion goes through ghosts, the canvas, clip-path and opacity
   (`stable.mjs`).

## Particles: the language

The particle canvas (`Vfx`) speaks in the craft room's vocabulary only.

| Family of shapes | Used for |
|---|---|
| yarn balls, threads, stitches, buttons | solves, yarn, the Thread, the quilt |
| paws, fish, crumbs | cats, treats, petting |
| hearts | bonds, petting, love |
| stars, glints, sparks | achievement, grades, stage beats |
| leaves, drops, bubbles, shards | per-game signatures (garden, dye, water, glass games) |
| confetti, coins | the very top of the ladder only (T5–T6) |

Rules: no generic "magic sparkles" without a craft meaning; at most two shape
families per moment; colours from the game's family or the player's Sparkle
kit; the canvas never draws over the board's pieces in a way that hides one
for more than 300 ms.

**Sparkle kits** change the palette and add one accent shape to every solve:

| Kit | Palette | Accent | Unlock |
|---|---|---|---|
| Classic | the family's colours | — | free |
| Teal, Flare, Gold, Violet, Pink, Sky | the victory colours | — | levels 0–40 (live) |
| Sakura | pinks, white | petals | 900 yarn |
| Fishbone | blues, silver | fish | 900 yarn |
| Starlight | indigo, gold | stars | 1,200 yarn |
| Button box | primaries | buttons | 1,200 yarn |
| Autumn | ambers | leaves | autumn season |
| Snowfall | whites, ice | flakes | winter season |

## Audio

### Sound effects (live, extended)

Synthesized with WebAudio, so the game stays one small file and works offline.
Standards:
- **Every sound in key.** Player-caused sounds are in C major, shifted per family
  (`CAT_TONE`). A miss and the run-over sting stay out of key on purpose.
- **Humanised.** Taps detune ±1.5% (live). New voices add ±8 ms of timing
  jitter on arpeggios.
- **Layered by tier.** T2 is two notes, T3 adds a third voice, T4 a rising
  three-note figure, T5 a fanfare plus the music's stinger.
- **Captions for everything that carries information** (live for good, bad,
  go, combo, level, over, tick). New: Clean, Swift, Purrfect, Thread, Bow,
  and the music's peak ("♪ the room swells").
- **Mixing.** Master gain 0.9 × volume (live). Room Radio sits on its own bus
  at 0.5 × the music volume, ducking −6 dB for 300 ms under every T3+ effect.
- **A voice per family (live since v0.169.0).** A tap inside a live round plays
  the family's voice (`VOICE`: a wave, a register, a length, a slide), not one
  square blip for all 45 games: focus a clear triangle chime, reflex a short
  bright square, logic a woody knock, numbers a small bell, words a low
  typewriter key, calm a soft long sine, physics a falling pluck, make a soft
  rise. Menus keep the plain tap. The gate refuses a family without a voice.
- **A sound for the verb.** A game whose verb is not a tap gives it its own
  sound (Pond Skate: a glide as long as the slide, a bump, a crack, a pick-up).
- **Haptics stay one vocabulary.** Unlike sound, the five haptic patterns
  (`HAPTIC`) are deliberately the same in every game: they once differed by game
  and were unified, so a buzz means the same event everywhere.

### Room Radio (new): dynamic music

Generated live in WebAudio and never sampled, so it costs no download, never
repeats exactly and follows the run.

**Structure:**
- **Tempo** 84 BPM (Hearth: 72; Busy Paws: 96).
- **Key** C major, the key every game's sounds already share, so solve chimes
  are always consonant with the music.
- **Progression** I – vi – IV – V (C, Am, F, G), one bar each, with a ii–V
  turnaround every 8 bars. The chord is exposed to the sfx engine, so T4
  figures use **the current chord's tones**: a Purrfect always lands on a
  note the music agrees with.
- **Scheduler**: a 25 ms lookahead timer schedules 120 ms ahead (the standard
  WebAudio pattern), so the main thread's jank never makes the music stutter.

**Layers by heat:**

| Layer | Instrument (synth) | Enters at | Character |
|---|---|---|---|
| L0 Room | brown noise at −42 dB, low-passed, with a slow 0.1 Hz swell | always (when music is on) | the room's air |
| L1 Pad | two detuned triangles per chord tone, slow attack | ×1 | warmth |
| L2 Keys | plucked sine-triangle arpeggio, 8th notes | ×2 | movement |
| L3 Brushes | filtered noise hats on 8ths, a soft sine kick on 1 and 3 | ×3 | groove |
| L4 Bells | a pentatonic bell melody, sparse, generated from the chord | ×5 | lift-off |

**Events:**

| Event | Music response |
|---|---|
| a miss | low-pass sweeps down to 900 Hz for 1.5 s, then back (muffled, not stopped) |
| Purrfect | a three-note figure from the current chord, quantized to the next 16th |
| a Bow | the next downbeat plays a full chord swell; L4 enters for 4 bars even below ×5 |
| stage beat | the progression steps up a tone (C to D) until the next stage, then home |
| clock under 8 s | L3 doubles to 16th hats (urgency without an alarm) |
| pause | music fades to L0 over 600 ms |
| Game Over | a resolve to the home chord with a slow arpeggio, then fade |
| Tuck in | everything thins to L0 and a music-box version of the I chord |

**Stations** (a cosmetic choice in the Kit): **Hearth** (free; slow, pad and
keys), **Busy Paws** (brighter, faster), **Rainy Window** (L0 is rain; minor
seventh voicings), **Music Box** (a milestone; bells and plucks only).

**Settings:** Music on or off (default on when Sound is on), Music volume
(default 0.5), and Music in menus (default off: the menus stay quiet unless
asked).

## Visual: lighting and the "camera"

- **Lighting** is a layer of CSS gradients over the background and behind the
  board, never on it. It warms with heat (a 2% amber tint per step), flashes
  warm on T4+, and cools for 1.5 s on a miss. All opacity, all composited.
- **Vignette** is a radial gradient layer that breathes on T4 and swells on T5.
- **Frame kick** (T3–T5, see [03-juice.md](03-juice.md)) moves `#chrome`, the
  background and the vignette 1–3 px. The board stays put.
- **The Room** has a real time of day (live: the window). Lamps you've bought
  light pools on the floor in the evening; fairy lights (a milestone) twinkle
  as moments.
- **Clarity first.** No effect lowers a board's contrast below 4.5:1 for more
  than 300 ms. Tested by sampling the board's colours during the busiest
  moment (`framebudget.mjs`).
