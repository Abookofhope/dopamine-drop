#!/usr/bin/env python3
"""Refuse to publish a build that would not load.

    python3 tools/check_site.py _site

The app is cached offline the moment a phone opens it, so a broken deploy is
not merely a bad page — it is a bad page that installs itself. These checks are
cheap and run before anything is uploaded.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
fail = []


def check(label, ok, detail=""):
    print(f"{'ok  ' if ok else 'FAIL'}  {label}{'  — ' + detail if detail and not ok else ''}")
    if not ok:
        fail.append(label)


index = OUT / "index.html"
check("index.html exists", index.is_file())
if not index.is_file():
    sys.exit(1)

html = index.read_text(encoding="utf-8")

# Every inline script, checked separately. The page has more than one — the
# game and the service-worker registration — and treating them as one blob
# produces a syntax error from the boundary between them, not from the code.
scripts = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S)
check("page has inline scripts", len(scripts) >= 1, f"found {len(scripts)}")
for i, body in enumerate(scripts, 1):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(body)
        path = f.name
    result = subprocess.run(["node", "--check", path], capture_output=True, text=True)
    check(f"inline script {i} parses", result.returncode == 0,
          result.stderr.strip().splitlines()[0] if result.stderr.strip() else "")

sw = OUT / "sw.js"
check("sw.js exists", sw.is_file())
if sw.is_file():
    result = subprocess.run(["node", "--check", str(sw)], capture_output=True, text=True)
    check("sw.js parses", result.returncode == 0, result.stderr.strip()[:200])
    text = sw.read_text(encoding="utf-8")
    # The cache name must be build-specific, or an update can never evict the
    # previous one and a phone keeps a stale copy forever.
    match = re.search(r"const CACHE = 'dopamine-drop-([0-9a-f]{12})'", text)
    check("cache name is a build hash", bool(match), match.group(1) if match else "not found")

manifest = OUT / "manifest.webmanifest"
check("manifest exists", manifest.is_file())
if manifest.is_file():
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
        check("manifest parses", True)
        check("manifest is installable",
              data.get("display") == "standalone" and len(data.get("icons", [])) >= 2,
              f"display={data.get('display')} icons={len(data.get('icons', []))}")
        for icon in data.get("icons", []):
            p = OUT / icon["src"]
            check(f"icon {icon['src']} present", p.is_file() and p.stat().st_size > 0)
    except json.JSONDecodeError as e:
        check("manifest parses", False, str(e))

# The page must contain the game, not just a shell that loads one.
check("page contains the game", 'id="playBtn"' in html and "MODE_IDS" in html)
check("page links the manifest", 'rel="manifest"' in html)
check("page registers the worker", "serviceWorker" in html)

print()
if fail:
    print(f"{len(fail)} check(s) failed: {', '.join(fail)}")
    sys.exit(1)
print("all checks passed")
