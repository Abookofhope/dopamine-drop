"""Follow the Thread (trace): beads, a steady hand, knots, a frayed stretch, a burr. Run from the repo root."""
import sys, re
p = 'site/app.html'; s = open(p).read()
VER = sys.argv[1] if len(sys.argv) > 1 else '0.187.0'
a = s.index("  trace: {\n    name:'Follow the Thread'")
e = s.index("\n  },\n\n  /* ── Lever", a)
body = s[a:e]
def bsub(old, new):
    global body
    assert body.count(old) == 1, old[:90]
    body = body.replace(old, new)

bsub("""    build(ctx){
      /* Calm had three modes""", """    /* Since __VER__ the thread has things on it. Beads sit near the edge of the band, worth having and worth the wobble they
       risk; a thread followed without ever straying, every bead taken, pays for a steady hand. From level 6 a stitch can be a
       knot: rest on it a moment (or touch it twice) to untie it before going on. From 12 one stretch is frayed and its band is
       narrow. From 20 a burr sits on the thread: brushing it pricks, so go round it inside the band. */
    build(ctx){
      const lv = ctx.level;
      const hasKnots = lv >= 6, hasFray = lv >= 12, hasBurr = lv >= 20;
      /* Calm had three modes""")
bsub("""      const pathOf = n => 'M ' + curve.slice(0, n).map(p => p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' L ');""", """      const pathOf = n => 'M ' + curve.slice(0, n).map(p => p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' L ');
      const pathFrom = (i0, i1) => 'M ' + curve.slice(i0, i1).map(p => p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' L ');
      /* The frayed stretch: the curve between two waypoints in the middle, held to six tenths of the band. */
      const fray = hasFray ? (() => { const w = 2 + Math.floor(ctx.rnd() * Math.max(1, steps - 4)); return { i0: w * SAMP, i1: (w + 1) * SAMP + 1 }; })() : null;
      const tolAt = i => fray && i >= fray.i0 && i < fray.i1 ? tol * 0.6 : tol;
      /* Knots: one or two waypoints in the middle, never the start or the end. */
      const knots = new Set();
      if (hasKnots){ const k = lv >= 16 ? 2 : 1; for (let g2 = 0; knots.size < k && g2 < 40; g2++) knots.add(1 + Math.floor(ctx.rnd() * (pts.length - 2))); }
      /* Beads: on the curve, pushed out toward the edge of the band. */
      const beads = [];
      const nBeads = 3 + Math.min(2, Math.floor(lv/8));
      for (let k = 0; k < nBeads; k++){
        const i = Math.floor((k + 0.5) / nBeads * (curve.length - 2)) + 1;
        const a2 = curve[i-1], b2 = curve[i+1], dx = b2.x - a2.x, dy = b2.y - a2.y, L = Math.hypot(dx, dy) || 1;
        const side = k % 2 ? 1 : -1, off = tolAt(i) * 0.72;
        beads.push({ x: clamp(curve[i].x - dy / L * off * side, 3, 97), y: clamp(curve[i].y + dx / L * off * side, 3, 97) });
      }
      /* The burr sits on the thread itself, a little past half way. */
      const burr = hasBurr ? curve[Math.floor(curve.length * (0.55 + ctx.rnd() * 0.15))] : null;""")
bsub("""      svg.appendChild(band); svg.appendChild(line); svg.appendChild(trail);
      box.appendChild(svg);""", """      svg.appendChild(band);
      if (fray){
        /* the frayed stretch: the wide band masked off and a narrow one laid on it */
        const mask = document.createElementNS(ns, 'path'); mask.setAttribute('d', pathFrom(fray.i0, fray.i1)); mask.setAttribute('class', 'trcmask'); mask.setAttribute('stroke-width', String(tol * 2 + 0.6));
        const thin = document.createElementNS(ns, 'path'); thin.setAttribute('d', pathFrom(fray.i0, fray.i1)); thin.setAttribute('class', 'trcband trcfray'); thin.setAttribute('stroke-width', String(tol * 1.2));
        svg.appendChild(mask); svg.appendChild(thin);
      }
      svg.appendChild(line); svg.appendChild(trail);
      box.appendChild(svg);""")
bsub("""      const dot = mk('i','trcdot');
      box.appendChild(dot);""", """      knots.forEach(i => marks[i].classList.add('knot'));
      const beadEls = beads.map(b => { const e = mk('i','trcbead'); e.style.left = b.x + '%'; e.style.top = b.y + '%'; box.appendChild(e); return e; });
      let burrEl = null;
      if (burr){ burrEl = mk('i','trcburr'); burrEl.style.left = burr.x + '%'; burrEl.style.top = burr.y + '%'; box.appendChild(burrEl); }
      const dot = mk('i','trcdot');
      box.appendChild(dot);""")
bsub("""      let done = false, next = 1, off = 0, holding = false, raf2 = 0, astray = false, shown = 0;
      let px = pts[0].x, py = pts[0].y;
      const say = () => ctx.prompt(astray ? t('trace.back') : t('p.trace', { n: pts.length - next }));""", """      let done = false, next = 1, off = 0, holding = false, raf2 = 0, astray = false, shown = 0;
      let px = pts[0].x, py = pts[0].y;
      let strayed = false, got = 0, knotMs = 0, knotTaps = 0, untied = new Set(), pricked = 0;
      const teach = hasBurr ? 'p.traceBurr' : hasFray ? 'p.traceFray' : hasKnots ? 'p.traceKnot' : 'p.traceBead';
      const say = () => ctx.prompt(astray ? t('trace.back') : next < pts.length && knots.has(next) && !untied.has(next) && Math.hypot(px - pts[next].x, py - pts[next].y) <= tol * 1.25 ? t('p.traceUntie')
        : t(next === 1 ? teach : 'p.trace', { n: pts.length - next }));
      const untie = i => { untied.add(i); marks[i].classList.add('untied'); sfx.good(1); buzz('good'); box.dataset.untied = untied.size; };""")
bsub("""          best = Math.min(best, Math.sqrt(dx*dx + dy*dy));
        }
        return best;
      };""", """          /* measured against the band where it is: a frayed stretch counts as farther away by as much as it is narrower */
          best = Math.min(best, Math.sqrt(dx*dx + dy*dy) * tol / tolAt(i));
        }
        return best;
      };""")
bsub("""        const out = away(x, y) > tol;
        if (out !== astray){ astray = out; box.classList.toggle('astray', out); say(); }""", """        const out = away(x, y) > tol;
        if (out !== astray){ astray = out; box.classList.toggle('astray', out); if (out) strayed = true; say(); }
        beads.forEach((b, k) => {
          if (b.got || Math.hypot(x - b.x, y - b.y) > 3.4) return;
          b.got = true; got++; beadEls[k].classList.add('got'); sfx.good(got); box.dataset.beads = got;
          ctx.points(8 + Math.floor(lv/2), beadEls[k]);
        });
        /* the burr: a brush with it pricks, once a second at most, and fills a third of the meter */
        if (burr && Math.hypot(x - burr.x, y - burr.y) < 3.6 && performance.now() - pricked > 1000){
          pricked = performance.now(); strayed = true; off = Math.min(slack, off + slack * 0.35); burrEl.classList.add('ow');
          ctx.after(300, () => burrEl.classList.remove('ow')); sfx.bad(); buzz('bad'); ctx.prompt(t('p.traceOw')); box.dataset.pricked = '1';
        }""")
bsub("""        while (next < pts.length && Math.hypot(x - pts[next].x, y - pts[next].y) <= tol * 1.25){""", """        while (next < pts.length && Math.hypot(x - pts[next].x, y - pts[next].y) <= tol * 1.25 && (!knots.has(next) || untied.has(next))){""")
bsub("""          if (next >= pts.length){
            done = true;
            cancelAnimationFrame(raf2);
            box.classList.add('won');
            return ctx.win(dot);
          }""", """          if (next >= pts.length){
            done = true;
            cancelAnimationFrame(raf2);
            box.classList.add('won');
            /* A steady hand: never off the thread, never pricked, every bead taken. */
            if (!strayed && got === beads.length && !ctx.relaxed){ box.classList.add('steady'); ctx.points(25 + Math.min(40, lv*2), dot); floatPts(dot, t('fx.traceSteady'), 3); box.dataset.steady = '1'; }
            return ctx.win(dot);
          }""")
bsub("""        if (holding){
          /* Wandering off""", """        /* Resting on a knot unties it. */
        if (holding && next < pts.length && knots.has(next) && !untied.has(next) && Math.hypot(px - pts[next].x, py - pts[next].y) <= tol * 1.25){
          knotMs += ms; marks[next].style.setProperty('--k', Math.min(1, knotMs / 550).toFixed(2));
          if (knotMs >= 550){ untie(next); knotMs = 0; at(px, py); if (done) return; }
        } else knotMs = 0;
        if (holding){
          /* Wandering off""")
bsub("""        start(p){ holding = true; prev = performance.now(); at(p.x, p.y); },""", """        start(p){
          holding = true; prev = performance.now();
          /* touched twice, a knot comes undone too: for a hand that cannot rest still */
          if (next < pts.length && knots.has(next) && !untied.has(next) && Math.hypot(p.x - pts[next].x, p.y - pts[next].y) <= tol * 1.25){ if (++knotTaps >= 2){ untie(next); knotTaps = 0; } }
          else knotTaps = 0;
          at(p.x, p.y); say();
        },""")
bsub("""      onDrag(box, {""", """      box._state = () => ({ pts, curve, tol, knots: [...knots], untied: [...untied], beads, burr, fray, next, got, strayed });
      onDrag(box, {""")
body = body.replace('__VER__', VER)
s = s[:a] + body + s[e:]

css_old = ".trcmark.start{background:#7BE38A;border-color:#7BE38A}\n"
assert s.count(css_old) == 1
s = s.replace(css_old, css_old + """/* Follow the Thread's own rules (__VER__): beads, knots, a frayed stretch, a burr. */
.trcbead{position:absolute;width:2.8%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;
  background:#FFC53D;box-shadow:0 0 0 1.5px #7A4A00,0 0 8px #ffc53d88;transition:transform var(--t-fast),opacity var(--t-med)}
.trcbead.got{opacity:0;transform:translate(-50%,-50%) scale(1.8)}
.trcmark.knot{width:4.2%;background:conic-gradient(#FF7E96 calc(var(--k,0)*360deg),#ff7e9633 0);border-color:#FF7E96;border-radius:30%}
.trcmark.knot.untied{background:#7BE38A;border-color:#7BE38A;border-radius:50%}
.trcmask{fill:none;stroke:var(--ink-2);stroke-linecap:butt;stroke-linejoin:round}
.trcfray{stroke:#ffc53d26;stroke-dasharray:2 1.4}
.trcburr{position:absolute;width:4.4%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(20deg);pointer-events:none;
  background:#C08BFF;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
html[data-motion="on"] .trcburr.ow{animation:ltcNope .3s ease-in-out}
""".replace('__VER__', VER))

adds = [
 {'p.traceBead':'{n} to reach · take the beads if you dare','p.traceKnot':'{n} to reach · rest on a knot to untie it','p.traceFray':'{n} to reach · the frayed stretch is narrow','p.traceBurr':'{n} to reach · go round the burr','p.traceUntie':'Rest here to untie the knot','p.traceOw':'Ow, a burr','fx.traceSteady':'Steady hand!'},
 {'p.traceBead':'{n} points · prenez les perles si vous osez','p.traceKnot':'{n} points · restez sur un nœud pour le défaire','p.traceFray':'{n} points · le passage effiloché est étroit','p.traceBurr':'{n} points · contournez la bardane','p.traceUntie':'Restez ici pour défaire le nœud','p.traceOw':'Aïe, une bardane','fx.traceSteady':'Main sûre !'},
 {'p.traceBead':'{n} puntadas · toma las cuentas si te atreves','p.traceKnot':'{n} puntadas · quédate en un nudo para soltarlo','p.traceFray':'{n} puntadas · el tramo deshilachado es estrecho','p.traceBurr':'{n} puntadas · rodea el abrojo','p.traceUntie':'Quédate aquí para soltar el nudo','p.traceOw':'¡Ay, un abrojo!','fx.traceSteady':'¡Pulso firme!'},
 {'p.traceBead':'{n} Stiche · nimm die Perlen, wenn du dich traust','p.traceKnot':'{n} Stiche · auf einem Knoten verweilen löst ihn','p.traceFray':'{n} Stiche · das ausgefranste Stück ist schmal','p.traceBurr':'{n} Stiche · um die Klette herum','p.traceUntie':'Hier verweilen löst den Knoten','p.traceOw':'Au, eine Klette','fx.traceSteady':'Ruhige Hand!'},
]
anchors = re.findall(r"'p\.trace':'[^']*'", s)
assert len(anchors) == 4, anchors
pos = 0
for anc, add in zip(anchors, adds):
    i = s.index(anc, pos); j = i + len(anc)
    ins = ', ' + ', '.join("'%s':'%s'" % kv for kv in add.items())
    s = s[:j] + ins + s[j:]; pos = j + len(ins)
open(p, 'w').write(s)
print('trace applied')
