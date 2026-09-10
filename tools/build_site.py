#!/usr/bin/env python3
"""Build the installable web app from the single source file.

The source lives in `site/`, deliberately not `web/`: Flutter generates its own
`web/` target on `flutter create .` and would overwrite anything kept there —
and the Flutter .gitignore excludes that path, which silently dropped these
files from the first commit.

    python3 tools/build_site.py [outdir]

`site/app.html` is the only source. It is written as page content — no
document shell — because the same file is also published as an Artifact, where
the host supplies the head. This script wraps it into a real document, adds the
manifest and icon links, and emits a service worker.

The service worker's cache name is a hash of everything it caches. That is the
whole update story: a new build produces a new cache name, the worker's activate
step deletes every cache that is not the current one, and the old version
evicts itself. No version constant to forget to bump, and no way for a phone to
sit on a stale build indefinitely.
"""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site" / "app.html"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_site"

TITLE = "Dopamine Drop: Brain Snacks"
DESCRIPTION = ("Quick puzzle games that switch every round. "
               "60-second runs for restless brains.")
GROUND = "#0D0918"

ICONS = ROOT / "site" / "icons"
REQUIRED_ICONS = ["icon-192.png", "icon-512.png", "maskable-512.png"]

# Fail here, with the reason, rather than three steps later with a confusing
# one. The first version of this build died on a runner because .gitignore had
# quietly excluded the icons, and the error gave no hint of that.
missing = [n for n in REQUIRED_ICONS if not (ICONS / n).is_file()]
if not SRC.is_file():
    sys.exit(f"missing source: {SRC}")
if missing:
    sys.exit(
        f"missing icons in {ICONS}: {', '.join(missing)}\n"
        "If they exist on disk but not here, check .gitignore — they may never "
        "have been committed."
    )

body = SRC.read_text(encoding="utf-8")

# The data-URI icon links exist so the Artifact build is self-contained. Here
# there are real files to point at, and 32KB of base64 per icon is dead weight.
body = re.sub(r'\s*<link rel="(?:apple-touch-)?icon"[^>]*href="data:image/png;base64,[^"]*">', "", body)

manifest = {
    "name": TITLE,
    "short_name": "Dopamine Drop",
    # Relative so the app works under /<repo>/ on Pages and at a domain root.
    "start_url": "./",
    "scope": "./",
    "id": "./",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": GROUND,
    "theme_color": GROUND,
    "description": DESCRIPTION,
    "categories": ["games", "puzzle"],
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
manifest_text = json.dumps(manifest, indent=2)

head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="{DESCRIPTION}">
<meta name="theme-color" content="{GROUND}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Dopamine Drop">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="icons/icon-512.png">
<link rel="apple-touch-icon" sizes="192x192" href="icons/icon-192.png">
<style>
  /* The Artifact host supplies a reset; standing alone, the page needs its own. */
  html {{ color-scheme: dark; background: {GROUND}; }}
  body {{ margin: 0; font: 14px system-ui, sans-serif; background: {GROUND};
         -webkit-tap-highlight-color: transparent; }}
  img {{ max-width: 100%; }}
  [hidden] {{ display: none !important; }}
</style>
</head>
<body>
"""

tail = """
<script>
  // Registration failures are normal and harmless: file://, an http origin, a
  // browser with service workers disabled. The game is fully playable without
  // one; it just will not be available offline.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
</script>
</body>
</html>
"""

page = head + body + tail

# Hash everything the worker will cache, so any change to any of them produces
# a new cache name.
digest = hashlib.sha256()
digest.update(page.encode("utf-8"))
digest.update(manifest_text.encode("utf-8"))
for icon in sorted(ICONS.glob("*.png")):
    digest.update(icon.read_bytes())
build_id = digest.hexdigest()[:12]

sw = f"""// GENERATED by tools/build_site.py — do not edit.
//
// The cache name is a hash of the built page, the manifest and the icons.
// A new build means a new name, and `activate` deletes every cache that is not
// the current one, so an installed copy replaces itself rather than pinning a
// stale version forever.
const CACHE = 'dopamine-drop-{build_id}';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {{
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      // Take over immediately; waiting for every tab to close would leave a
      // phone on the old build for days.
      .then(() => self.skipWaiting())
  );
}});

self.addEventListener('activate', (event) => {{
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
}});

self.addEventListener('fetch', (event) => {{
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // A navigation offline must still land on the game, not a browser error page.
  if (request.mode === 'navigate') {{
    event.respondWith(
      fetch(request)
        .then((response) => {{
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return response;
        }})
        .catch(() => caches.match('./index.html', {{ ignoreSearch: true }}))
    );
    return;
  }}

  // Everything else: cache first. The contents are immutable for a given build,
  // and a new build arrives under a new cache name.
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {{
      if (response && response.status === 200 && response.type === 'basic') {{
        const copy = response.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }}
      return response;
    }}))
  );
}});
"""

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
(OUT / "index.html").write_text(page, encoding="utf-8")
(OUT / "manifest.webmanifest").write_text(manifest_text, encoding="utf-8")
(OUT / "sw.js").write_text(sw, encoding="utf-8")
# Pages runs Jekyll by default, which would ignore anything starting with `_`.
(OUT / ".nojekyll").write_text("", encoding="utf-8")
shutil.copytree(ICONS, OUT / "icons")

total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
try:
    print(f"build {build_id}  ->  {OUT}  ({total/1024:.0f} KB)")
    for f in sorted(OUT.rglob("*")):
        if f.is_file():
            print(f"  {f.relative_to(OUT)}  {f.stat().st_size/1024:.1f} KB")
except BrokenPipeError:
    pass  # Someone piped the output into `head`.
