# Web prototype

A dependency-free HTML/CSS/JS build of the game. It exists to be **played on a
phone right now** without an install, and to try mechanics faster than the
Flutter app can be rebuilt.

`index.html` is written as page content — no `<html>`/`<head>`/`<body>` wrapper —
because the host that serves it supplies the skeleton. To open it as a plain
local file, wrap it in a minimal HTML document first.

It is a demo, not a second implementation to keep in lockstep. The Flutter app in
`../lib/` is the product.
