#!/usr/bin/env python3
"""Synthesise the game's sound effects as small mono WAVs.

The web prototype builds these with WebAudio oscillators at runtime; Flutter has
no synthesiser, so the same waveforms are rendered ahead of time and shipped as
assets. Keeping the generator in the repo means the sounds stay editable — tweak
a frequency here and re-run, rather than hunting for a replacement sample.

    python3 tool/make_sfx.py

Everything is deliberately tiny (a few KB each) and starts on a zero crossing
with a short fade in and out, so rapid retriggering never clicks.
"""
import math
import struct
import wave
from pathlib import Path

RATE = 44100
OUT = Path(__file__).resolve().parent.parent / "assets" / "sfx"


def osc(shape, phase):
    if shape == "sine":
        return math.sin(phase)
    if shape == "triangle":
        return 2 / math.pi * math.asin(math.sin(phase))
    if shape == "square":
        return 1.0 if math.sin(phase) >= 0 else -1.0
    if shape == "saw":
        t = (phase / (2 * math.pi)) % 1.0
        return 2 * t - 1
    raise ValueError(shape)


def tone(freq, dur, shape="triangle", gain=0.5, decay=True, sweep=0.0):
    """One voice. `sweep` bends the pitch by that factor across the note."""
    n = int(RATE * dur)
    out = []
    phase = 0.0
    fade = max(1, int(RATE * 0.004))
    for i in range(n):
        f = freq * (1 + sweep * i / n)
        phase += 2 * math.pi * f / RATE
        env = math.exp(-5.0 * i / n) if decay else 1.0
        if i < fade:
            env *= i / fade
        if i > n - fade:
            env *= max(0.0, (n - i) / fade)
        out.append(osc(shape, phase) * env * gain)
    return out


def mix(*layers):
    length = max(len(l) for l in layers)
    out = [0.0] * length
    for layer in layers:
        for i, v in enumerate(layer):
            out[i] += v
    peak = max((abs(v) for v in out), default=1.0)
    if peak > 1.0:
        out = [v / peak for v in out]
    return out


def delay(samples, seconds):
    return [0.0] * int(RATE * seconds) + samples


def write(name, samples):
    path = OUT / f"{name}.wav"
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767)) for s in samples))
    print(f"{path.name:16} {path.stat().st_size / 1024:6.1f} KB")


OUT.mkdir(parents=True, exist_ok=True)

# A tap: short, dry, low enough not to compete with the reward sounds.
write("tap", tone(520, 0.05, "square", 0.22))

# Correct answers rise. Five variants stepping up a scale so a streak audibly
# climbs — the single most effective bit of juice in the prototype.
for i, base in enumerate([600, 660, 740, 830, 940]):
    write(f"good{i + 1}", mix(
        tone(base, 0.10, "triangle", 0.45),
        delay(tone(base * 1.5, 0.09, "triangle", 0.30), 0.055),
    ))

# A miss: a falling buzz, unpleasant but brief. It should register as "no",
# not as punishment — this game never ends a run on a mistake.
write("bad", tone(190, 0.22, "saw", 0.35, sweep=-0.45))

# Run over: a descending three-note figure.
write("over", mix(
    tone(430, 0.20, "triangle", 0.40),
    delay(tone(340, 0.20, "triangle", 0.38), 0.13),
    delay(tone(255, 0.30, "triangle", 0.36), 0.26),
))

# Level up: the opposite shape, rising and held.
write("levelup", mix(
    tone(520, 0.14, "triangle", 0.38),
    delay(tone(660, 0.14, "triangle", 0.38), 0.10),
    delay(tone(880, 0.30, "triangle", 0.42), 0.20),
))

# Countdown ticks, then the go.
write("tick", tone(470, 0.06, "triangle", 0.30))
write("go", tone(770, 0.14, "triangle", 0.42, sweep=0.10))
