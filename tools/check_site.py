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
# Anchored on things that do not churn with UI work: the play surface, the
# mode registry, and the fact that the registry is non-trivial. A check tied
# to one button's id fails every time a screen is redesigned, which teaches
# people to ignore it.
check("page contains the play surface", 'id="surface"' in html)
check("page contains the mode registry", "const MODES = {" in html and "MODE_IDS" in html)
modes = re.findall(r"^  ([a-z]+): \{$", html, re.M)
check("registry has a full roster", len(modes) >= 12, f"found {len(modes)}")
# Every language table must carry every key. A missing one renders as the
# raw key ("tab.Mix") in the interface, which nobody notices in a language
# they do not read — so it is checked rather than eyeballed.
si = html.find("const STRINGS")
if si >= 0:
    block = html[si:html.find("const WORD_BANKS", si)]
    tables = {}
    for lang in re.findall(r"\n  (\w+): \{", block):
        m = re.search(r"\n  %s: \{(.*?)\n  \}" % lang, block, re.S)
        if m:
            tables[lang] = set(re.findall(r"'([\w.]+)'\s*:", m.group(1)))
    check("string tables found", len(tables) >= 2, f"{sorted(tables)}")
    if len(tables) >= 2:
        base = tables.get("en") or next(iter(tables.values()))
        gaps = []
        for lang, keys in tables.items():
            missing = base - keys
            if missing:
                gaps.append(f"{lang} missing {sorted(missing)[:3]}")
        check("every language has every string", not gaps, "; ".join(gaps[:3]))
        check("string tables are not empty", len(base) >= 100, f"{len(base)} keys")

# A mode that creates an element with a class the chrome already uses will
# restyle the chrome, silently. This has happened twice now: a mode's `.target`
# floated over another mode's header, and a mode's `.ring` resized the level
# ring in the app bar. Neither raised an error — they just quietly broke a
# screen nobody happened to be looking at. Classes the chrome owns and styles
# itself are fine; the danger is one being used in both places at once.
chrome_start = html.find('class="chrome"')
chrome_end = html.find('id="stage"', chrome_start) if chrome_start >= 0 else -1
modes_start = html.find("const MODES = {")
modes_end = html.find("const MODE_IDS", modes_start) if modes_start >= 0 else -1
if chrome_start >= 0 and chrome_end > chrome_start and modes_end > modes_start:
    chrome_classes = set()
    for attr in re.findall(r'class="([^"]+)"', html[chrome_start:chrome_end]):
        chrome_classes.update(attr.split())
    mode_src = html[modes_start:modes_end]
    mode_classes = set()
    for made in re.findall(r"mk\(\s*'[a-z]+'\s*,\s*'([^']+)'", mode_src):
        mode_classes.update(re.split(r"[\s+]", made))
    for attr in re.findall(r"class=\\?[\"']([a-z0-9 _-]+)", mode_src):
        mode_classes.update(attr.split())
    shared = sorted(c for c in (chrome_classes & mode_classes) if c)
    check("no mode reuses a class the header owns", not shared,
          "shared: " + ", ".join(shared) if shared else "")

# A mode's own setTimeout outlives its round. Peril armed its hesitation timer
# with a raw one, so quitting mid-tell and starting anything else took a life
# off the new round a beat later, with no input at all. The shell hands every
# mode ctx.after for exactly this — it registers the timer so ending a round
# disposes of it.
if modes_start >= 0 and modes_end > modes_start:
    mode_body = html[modes_start:modes_end]
    raw = len(re.findall(r"\bsetTimeout\(", mode_body)) + len(re.findall(r"\bsetInterval\(", mode_body))
    check("no mode arms a timer the shell cannot clear", raw == 0,
          "%d raw setTimeout/setInterval calls inside the mode registry" % raw if raw else "")

# Four string tables at key parity say nothing about text that never went
# through them. The app shipped with "Get ready", "Nice", "Beat 3200" and three
# dozen screen-reader labels written straight into the script, so a French
# player got French menus and English gameplay, and the parity check passed
# every time because there was no key to be missing.
if modes_start >= 0:
    script = html[html.find("<script", modes_start - 400000 if modes_start > 400000 else 0):]
    hardcoded = []
    for m in re.finditer(r"(?:textContent|\.setAttribute\(\s*['\"]aria-label['\"])\s*(?:=|,)\s*([^;\n]{0,160})", html):
        expr = m.group(1)
        if "t(" in expr or "fmt(" in expr or "inkName(" in expr or "modeName(" in expr:
            continue
        for lit in re.findall(r"'([^']{3,})'|\"([^\"]{3,})\"", expr):
            text = lit[0] or lit[1]
            # a sentence or phrase of real words, not a class name or a symbol
            if re.fullmatch(r"[A-Za-z][A-Za-z ,'\u2019\-]{2,}", text) and " " in text.strip():
                hardcoded.append(text)
    hardcoded = sorted(set(hardcoded))
    check("no player-visible text is written in English by hand", not hardcoded,
          "untranslated: " + "; ".join(hardcoded[:6]) + ("; ..." if len(hardcoded) > 6 else "")
          if hardcoded else "")

# A stray `*/` in the stylesheet is not a parse error you can see. The CSS
# parser treats the garbage before it as the start of a selector and swallows
# the next rule whole. That is how a scripted edit that overwrote a section
# comment silently deleted `.siphonwrap`, leaving a whole mode laid out as
# plain block flow with the failure invisible to every structural test.
stray = unterminated = 0
for sheet in re.findall(r"<style[^>]*>(.*?)</style>", html, re.S):
    depth, k = 0, 0
    while k < len(sheet) - 1:
        if sheet[k:k+2] == "/*":
            depth += 1; k += 2; continue
        if sheet[k:k+2] == "*/":
            if depth == 0: stray += 1
            else: depth -= 1
            k += 2; continue
        k += 1
    unterminated += depth
check("stylesheet comments are balanced", not stray and not unterminated,
      "stray */: %d, unterminated /*: %d" % (stray, unterminated)
      if (stray or unterminated) else "")

# A var() naming a custom property that nothing ever defines does not warn and
# does not fall back to the previous declaration — the whole property becomes
# unset, so `stroke:var(--nope)` paints nothing and `background:var(--nope)`
# paints transparent. Arc shipped for several versions with its chain wire
# invisible and its lit nodes hollow because of exactly this, and no test
# noticed: the geometry was right, the win path worked, the colour was absent.
# A var() written with a fallback is deliberate and left alone.
declared = set(re.findall(r"(--[a-z0-9-]+)\s*:", html))
declared |= set(re.findall(r"setProperty\(\s*['\"](--[a-z0-9-]+)['\"]", html))
used_bare = set()
for m in re.finditer(r"var\(\s*(--[a-z0-9-]+)\s*([,)])", html):
    if m.group(2) == ")":
        used_bare.add(m.group(1))
dead = sorted(used_bare - declared)
check("every custom property a var() names is defined somewhere", not dead,
      "never defined: " + ", ".join(dead) if dead else "")

# Word banks are player-visible content in four languages, and the failure
# mode is silent: a word of the wrong length just renders a puzzle with a
# letter too few. This has already shipped twice — once as a truncated
# non-word, once as a stray character from the wrong alphabet — so the
# lengths, the alphabet and the duplicates are checked here rather than
# trusted to review.
m = re.search(r"const WORD_BANKS = \{(.*?)\n\};", html, re.S)
check("word banks present", bool(m))
if m:
    problems, total = [], 0
    for lang, body in re.findall(r"(\w+):\s*\{(.*?)\}", m.group(1), re.S):
        for length, words in re.findall(r"(\d+):\s*\[(.*?)\]", body, re.S):
            ws = re.findall(r"'([^']*)'", words)
            total += len(ws)
            for w in ws:
                if len(w) != int(length):
                    problems.append(f"{lang}/{length}:{w} is {len(w)}")
                if not re.fullmatch(r"[A-Z]+", w):
                    problems.append(f"{lang}/{length}:{w} not A-Z")
            dupes = {w for w in ws if ws.count(w) > 1}
            if dupes:
                problems.append(f"{lang}/{length} repeats {sorted(dupes)}")
            # Two words built from the same letters give Word Snap an identical
            # rack that wants a different order depending on which was drawn.
            by_letters = {}
            for w in ws:
                by_letters.setdefault("".join(sorted(w)), []).append(w)
            for group in by_letters.values():
                if len(group) > 1:
                    problems.append(f"{lang}/{length} anagrams {sorted(group)}")
            if len(ws) < 20:
                problems.append(f"{lang}/{length} only has {len(ws)} words")
    check("every word matches its bucket, alphabet and is unique",
          not problems, "; ".join(problems[:4]))
    check("word banks are large enough to not repeat", total >= 400, f"{total} words")

# ── Difficulty ramps ──────────────────────────────────────────────────────
# A mode whose every knob has hit its clamp stops getting harder for good, and
# nothing on screen says so. Stroop topped out at ctx.level 9 and three others
# by 12, while the median mode was barely half way — so a run rotating families
# mixed finished modes with ones that had hardly started. The ceilings are real
# (a 12x12 grid does not fit on a phone); what has to hold is that no mode
# reaches its ceiling while the rest of the roster is still climbing.
RAMP_FLOOR = 15          # no mode may stop changing before this ctx.level

def _ternary(src):
    """a ? b : c  ->  ((b) if (a) else (c)). JS chains right-associatively, so
    the match for the first '?' is the ':' that balances it, not the first one."""
    i = src.find("?")
    if i < 0:
        return src
    depth = 0
    for j in range(i + 1, len(src)):
        c = src[j]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth < 0:
                return None
        elif depth == 0 and c == "?":
            inner = _ternary(src[j:])
            if inner is None:
                return None
            return _ternary(src[:j] + inner) if "?" in src[:j] else src[:j] + inner
        elif depth == 0 and c == ":":
            cond, then, els = src[:i], src[i + 1:j], src[j + 1:]
            els = _ternary(els)
            if els is None:
                return None
            return f"(({then}) if ({cond}) else ({els}))"
    return None


def _js_number(expr, level):
    """Evaluate the small arithmetic the difficulty knobs are written in.
    Anything richer than this is skipped rather than guessed at."""
    import math as _m
    e = expr.strip()
    if not re.fullmatch(r"[0-9A-Za-z_.,:?<>=!+\-*/() ]+", e):
        return None
    py = e.replace("ctx.level", str(level))
    py = py.replace("Math.floor", "_m.floor").replace("Math.round", "_round")
    py = py.replace("Math.min", "min").replace("Math.max", "max")
    py = py.replace("Math.sqrt", "_m.sqrt").replace("Math.abs", "abs")
    py = py.replace("Math.hypot", "_m.hypot").replace("Math.PI", "_m.pi")
    if "Math." in py or "assistOn" in py:
        return None
    py = _ternary(py)
    if py is None or "?" in py or ":" in py:
        return None
    def _clamp(v, lo, hi): return lo if v < lo else hi if v > hi else v
    def _round(v):         return _m.floor(v + 0.5)
    try:
        v = eval(py, {"__builtins__": {}},
                 {"_m": _m, "clamp": _clamp, "_round": _round, "min": min, "max": max, "abs": abs})
        return float(v) if isinstance(v, (int, float)) else None
    except Exception:
        return None

modes_src = html[html.index("const MODES = {"):html.index("\nconst CATS = [")]
_starts = [(m.start(), m.group(1)) for m in re.finditer(r"\n  ([a-zA-Z0-9_]+): \{\n", modes_src)]
# A mode block can be deleted by an edit that meant to touch only its neighbour,
# and nothing downstream notices: MODE_IDS is derived from MODES, so the count
# quietly drops and every other check still passes. The floor is the only thing
# that can catch it. RAISE IT when a mode is added, never lower it.
MODE_FLOOR = 66
check(f"the game still has at least {MODE_FLOOR} modes",
      len(_starts) >= MODE_FLOOR,
      f"found {len(_starts)}" + ("" if len(_starts) >= MODE_FLOOR else
        " — a mode block was deleted, or the floor needs raising"))
# Every mode must carry a name+blurb string, or it is a card with no words on it.
_missing = [n for _, n in _starts if f"'m.{n}':" not in html]
check("every mode has a name and blurb string",
      not _missing, "missing: " + ", ".join(_missing[:5]) if _missing else "")

frozen, scanned = [], 0
for _i, (_off, _name) in enumerate(_starts):
    _end = _starts[_i + 1][0] if _i + 1 < len(_starts) else len(modes_src)
    last_move = 0
    saw_knob = False
    for line in modes_src[_off:_end].split("\n"):
        if "ctx.level" not in line:
            continue
        m = re.match(r"\s*const\s+\w+\s*=\s*(.+?);\s*(/\*.*)?$", line.strip())
        if not m:
            continue
        vals = [_js_number(m.group(1), L) for L in range(1, 61)]
        if any(v is None for v in vals):
            continue
        saw_knob = True
        for L in range(59, 0, -1):
            if abs(vals[L] - vals[L - 1]) > 1e-12:
                last_move = max(last_move, L + 1)
                break
    if saw_knob:
        scanned += 1
        if last_move < RAMP_FLOOR:
            frozen.append(f"{_name} stops at L{last_move}")
# Coverage is part of the result: a check that silently reads nothing passes.
check(f"no mode stops getting harder before level {RAMP_FLOOR} "
      f"({scanned}/{len(_starts)} modes read)",
      not frozen and scanned >= len(_starts) * 0.75, "; ".join(frozen[:5]) or "too few modes read")

check("page links the manifest", 'rel="manifest"' in html)
check("page registers the worker", "serviceWorker" in html)

print()
if fail:
    print(f"{len(fail)} check(s) failed: {', '.join(fail)}")
    sys.exit(1)
print("all checks passed")
