# Web prototype

A dependency-free HTML/CSS/JS build of the game. It exists to be **played on a
phone right now** without an install, and to try mechanics faster than the
Flutter app can be rebuilt.

`index.html` is written as page content — no `<html>`/`<head>`/`<body>` wrapper —
because the host that serves it supplies the skeleton. To open it as a plain
local file, wrap it in a minimal HTML document first.

It is a demo, not a second implementation to keep in lockstep. The Flutter app in
`../lib/` is the product. Where they differ, the app wins.

At parity with the app as of v0.2.0: all twelve modes, the level ladder and
unlocks, sound, vibration, reduce motion, colour assist, and progress saved to
`localStorage` on the device. It does not have the app's real audio (it
synthesises tones with WebAudio instead of playing the bundled WAVs) or its
particle effects.

**Preview level** under Settings → Prototype scrubs the player level, so the
whole unlock ladder can be inspected without grinding to level 300. It is a
development control and would not ship in a store build.
