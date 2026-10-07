"""Master art for the Dopamine Drop app icon.

The mark is the drop from the name, become a cat (v0.145.0): ears, one eye
lit aqua (the old icon lit one tile of four), yarn wound round it. Everything is drawn
from the in-game palette so the icon and the first screen agree.

Geometry note: the drop spans 404x532 centred in a 1024 canvas, which keeps it
inside the central 66% that an Android adaptive icon guarantees to show. The
foreground layer is therefore safe to use as-is, with no extra inset.
"""
DROP = ("M512,{tip} C512,{tip} {rx},498 {rx},592 "
        "A202,202 0 1,1 {lx},592 C{lx},498 512,{tip} 512,{tip} Z")

# The mark (v0.145.0): the drop has become a cat. Ears on its shoulders, one eye
# lit aqua the way the old icon lit one tile of four, yarn wound round it and a
# loose thread curling off. The same geometry is inlined in site/app.html
# (logoSvg) for the header and the welcome screen; change both together.
def mark():
    d = DROP.format(tip=262, rx=714, lx=310)
    return (
        '<path d="M592 372L700 312L652 462Z" fill="url(#drop)"/><path d="M432 372L324 312L372 462Z" fill="url(#drop)"/>'
        '<path d="M608 388L676 348L648 440Z" fill="#FF9BB5"/><path d="M416 388L348 348L376 440Z" fill="#FF9BB5"/>'
        f'<path d="{d}" fill="url(#drop)"/>'
        '<path d="M410 500Q462 452 534 456" fill="none" stroke="#FFC4AE" stroke-opacity=".55" stroke-width="13" stroke-linecap="round"/>'
        '<path d="M352 704Q512 660 672 700M402 756Q512 722 622 754" fill="none" stroke="#9E2A14" stroke-opacity=".42" stroke-width="12" stroke-linecap="round"/>'
        '<ellipse cx="446" cy="598" rx="31" ry="39" fill="#2A0F14"/><ellipse cx="578" cy="598" rx="31" ry="39" fill="#33E6C8"/>'
        '<ellipse cx="578" cy="600" rx="9" ry="27" fill="#0D2B26"/><circle cx="457" cy="583" r="9" fill="#FFF3E6"/><circle cx="589" cy="583" r="9" fill="#FFFFFF"/>'
        '<path d="M496 648L528 648L512 666Z" fill="#FFB3C8"/>'
        '<path d="M512 666q-12 16-28 6M512 666q12 16 28 6" fill="none" stroke="#2A0F14" stroke-width="7" stroke-linecap="round"/>'
        '<path d="M394 640L328 628M396 664L332 676M630 640L696 628M628 664L692 676" stroke="#FFE3D6" stroke-opacity=".7" stroke-width="6" stroke-linecap="round"/>'
        '<path d="M672 742C740 752 786 800 750 838C722 866 680 846 694 816" fill="none" stroke="#FF8A5C" stroke-width="13" stroke-linecap="round"/>'
    )

def drop(scale=1.0):
    # Scale about the drop's own centre so the ears and face stay in the safe zone.
    cx, cy = 512, 560
    return f'<g transform="translate({cx},{cy}) scale({scale}) translate({-cx},{-cy})">{mark()}</g>'

DEFS = '''<defs>
    <linearGradient id="drop" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#FF8A5C"/>
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
