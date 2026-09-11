"""Master art for the Dopamine Drop app icon.

The mark is the drop from the name, carrying a 2x2 grid with one tile lit —
brand, genre and the game's signature mode in one shape. Everything is drawn
from the in-game palette so the icon and the first screen agree.

Geometry note: the drop spans 404x532 centred in a 1024 canvas, which keeps it
inside the central 66% that an Android adaptive icon guarantees to show. The
foreground layer is therefore safe to use as-is, with no extra inset.
"""
DROP = ("M512,{tip} C512,{tip} {rx},498 {rx},592 "
        "A202,202 0 1,1 {lx},592 C{lx},498 512,{tip} 512,{tip} Z")

def drop(scale=1.0):
    # Scale about the drop's own centre so it stays in the safe zone.
    cx, cy = 512, 560
    d = DROP.format(tip=262, rx=714, lx=310)
    return f'<g transform="translate({cx},{cy}) scale({scale}) translate({-cx},{-cy})"><path d="{d}" fill="url(#drop)"/>{tiles()}</g>'

def tiles():
    out = ""
    for r in range(2):
        for c in range(2):
            x, y = 432 + c*90, 512 + r*90
            odd = (r, c) == (0, 1)
            out += (f'<rect x="{x}" y="{y}" width="70" height="70" rx="16" '
                    f'fill="{"#33E6C8" if odd else "#0D0918"}" '
                    f'opacity="{1 if odd else 0.82}"/>')
    return out

DEFS = '''<defs>
    <linearGradient id="drop" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#FF7A54"/>
      <stop offset="0.55" stop-color="#FF5B39"/>
      <stop offset="1" stop-color="#C93A1E"/>
    </linearGradient>
    <radialGradient id="ground" cx="0.5" cy="0.28" r="0.85">
      <stop offset="0" stop-color="#2A1846"/>
      <stop offset="0.6" stop-color="#150E27"/>
      <stop offset="1" stop-color="#0D0918"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="38" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>'''

def svg(body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" '
            f'width="1024" height="1024">{DEFS}{body}</svg>')

# Full-bleed master: Play listing, iOS, and the legacy Android icon.
open("icon.svg","w").write(svg(
    '<rect width="1024" height="1024" fill="url(#ground)"/>'
    + f'<g filter="url(#glow)">{drop(1.08)}</g>'))

# Adaptive foreground: transparent, no glow (Android composites its own
# shadow), mark unchanged because it already sits inside the safe zone.
open("icon_foreground.svg","w").write(svg(drop(1.08)))
print("wrote icon.svg icon_foreground.svg")
