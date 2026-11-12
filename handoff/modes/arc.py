# Re-appliable edit: Cat's Cradle gets a decision, an arc and a style goal. Run from the repo root.
import re
p='site/app.html'; s=open(p).read()
def r(old,new,count=1):
    global s; assert s.count(old)==count, (s.count(old), old[:70]); s=s.replace(old,new)

a=s.index("    build(ctx){\n      const paws = pawChances(ctx);\n      const n = clamp(6 + Math.floor(ctx.level/3), 6, 14);")
end_marker="      ctx.prompt(t('p.arc', { n: n - 1 }));\n    }\n  },"
b=s.index(end_marker, a)+len(end_marker)
new_build = r"""    build(ctx){
      const paws = pawChances(ctx);
      const lv = ctx.level;
      const n = clamp(6 + Math.floor(lv/3), 6, 14);
      /* What the cradle asks for, a step at a time. From the first board: a long pull (a jump near the edge of the reach) pays
         but uses up more thread than a short hop, and a cradle whose thread never crosses itself is a clean weave, which pays
         too. Level 6: one peg carries a gold bead, and looping it lets the thread back out. Level 12: a cat naps on one peg,
         and that peg is looped last. Level 20: the thread may not cross itself at all. */
      const hasBead = lv >= 6, hasCat = lv >= 12;
      const cat = hasCat ? 1 + Math.floor(ctx.rnd()*(n - 1)) : -1;
      let bead = -1;
      if (hasBead){ do { bead = 1 + Math.floor(ctx.rnd()*(n - 1)); } while (bead === cat); }
      /* Every distance below is in widths, so the dashed circle you can see and
         the pegs the game counts as in reach are the same set. Reach and the
         gaps between pegs were once taken straight from the percentages, which on
         a tall board made "in reach" an oval far taller than the circle drawn. */
      const ar = aspectOf(ctx.surface);
      const dd = (a, b, k) => Math.hypot(a.x-b.x, (a.y-b.y)*k);
      /* 52 was tuned on a square. A round reach covering the same AREA as the old
         oval on a tall board is 52 times the square root of its aspect. */
      let START = Math.round(52 * Math.sqrt(Math.max(1, ar)));
      /* What a jump costs. It used to be the same for every jump; now a hop to the peg next door costs half of that and a pull
         to the very edge of the reach half as much again, so how far to reach is a choice and not only which way. */
      const loss = 0.06 + Math.min(0.06, lv*0.0025);
      const PULL = 0.72;                                   /* this far across the reach, or more, is a long pull */
      const after = (reach, d, i) => i === bead ? START : reach * (1 - loss*(0.5 + d/reach));
      /* Two stretches of thread cross when each one's ends lie either side of the other. A stretch that only shares a peg with
         another does not cross it. Measured in the same widths as everything else. */
      const side = (a, b, c, k) => (b.x - a.x)*((c.y - a.y)*k) - ((b.y - a.y)*k)*(c.x - a.x);
      const cut = (a, b, c, d, k) => side(a, b, c, k)*side(a, b, d, k) < 0 && side(c, d, a, k)*side(c, d, b, k) < 0;
      const crossing = (list, ord, to, k) => {
        const from = list[ord[ord.length - 1]];
        for (let q = 0; q + 2 < ord.length; q++) if (cut(list[ord[q]], list[ord[q + 1]], from, list[to], k)) return true;
        return false;
      };
      /* "Wide enough to probably work" is what Slide Path used to assume, and it
         was wrong there too. Prove it: depth-first over orderings under the very rules the player will face (the cost of each
         jump, the bead, the cat's peg last, no crossing), and regenerate the board until one completes. The proof is always
         of a clean weave, so the style the round pays for is never one this board cannot give. The budget keeps the search
         honest on the worst layouts. */
      function solve(list, weave){
        const seen = new Array(list.length).fill(false), ord = [0];
        let budget = 40000;
        const go = (at, reach) => {
          if (ord.length === list.length) return true;
          if (budget-- <= 0) return false;
          for (let i=0;i<list.length;i++){
            if (seen[i]) continue;
            const d = dd(list[i], list[at], ar);
            /* The proof keeps a little inside the reach. The board is measured again once it is in the page, and a jump proved at
               the very edge of the reach here could be a hair outside it there, which with one paw left is the round. */
            if (d > reach * 0.96) continue;
            if (i === cat && ord.length !== list.length - 1) continue;
            if (weave && crossing(list, ord, i, ar)) continue;
            seen[i] = true; ord.push(i);
            if (go(i, after(reach, d, i))) return true;
            ord.pop(); seen[i] = false;
          }
          return false;
        };
        seen[0] = true;
        return go(0, START) ? ord.slice() : null;
      }
      const spread = () => {
        const out = [];
        for (let i=0;i<n;i++){
          for (let a=0;a<200;a++){
            const x = 12 + ctx.rnd()*76, y = 12 + ctx.rnd()*76;
            if (out.every(q => dd(q, {x,y}, ar) > 15)) { out.push({x,y}); break; }
          }
        }
        return out;
      };
      let pts = spread(), plan = pts.length === n ? solve(pts, true) : null;
      for (let tries=0; tries<60 && !plan; tries++){
        pts = spread();
        plan = pts.length === n ? solve(pts, true) : null;
      }
      /* Sixty layouts and none completable used to mean playing the last one
         anyway, which may not be winnable at all. Widen the reach until it is. */
      while (!plan && START < 150){ START += 4; plan = solve(pts, true); }
      /* And if even that finds no clean weave, the board is played without one being asked for. */
      const weaveOk = !!plan;
      while (!plan && START < 400){ plan = solve(pts, false); if (!plan) START += 8; }
      let strict = lv >= 20 && weaveOk;
      let reach = START, live = 0, crossed = false;
      const box = mk('div','arcbox');
      box.dataset.lv = String(lv); box.dataset.cat = String(cat); box.dataset.bead = String(bead);
      box.dataset.strict = strict ? '1' : '0'; box.dataset.weave = weaveOk ? '1' : '0'; box.dataset.pulls = '0';
      box._plan = plan || [];
      /* The board, not the browser, decides how tall the box is, and it is not in
         the page yet when the first reach is painted, so fall back to the shape
         it was built for. */
      const arNow = () => box.clientWidth > 0 ? aspectOf(box) : ar;
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 100 100');
      svg.setAttribute('class','arcwire');
      svg.setAttribute('preserveAspectRatio','none');   // 0-100 spans the board, like the pegs' percentages
      box.appendChild(svg);
      const halo = mk('div','arcreach'); box.appendChild(halo);
      const dots = pts.map((p,i) => {
        const b = mk('button','arcdot'); b.type='button';
        b.style.left = p.x+'%'; b.style.top = p.y+'%';
        b.setAttribute('aria-label', i === cat ? t('a.arcCat') : i === bead ? t('a.arcBead') : t('a.node', { n: i+1 }));
        if (i === cat){ b.classList.add('cat');
          b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11 4 4l5.5 3.5M19 11l1-7-5.5 3.5" fill="#F6EBD9" stroke="#2A1B4D" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="8" fill="#F6EBD9" stroke="#2A1B4D" stroke-width="1.6"/><path d="M7.5 13q1.8 1.8 3.6 0M12.9 13q1.8 1.8 3.6 0" fill="none" stroke="#2A1B4D" stroke-width="1.5" stroke-linecap="round"/><path d="M11 16.5h2l-1 1.2z" fill="#FF7E96"/></svg>'; }
        if (i === bead){ b.classList.add('bead');
          b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="#FFC53D" stroke="#7A4A00" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="#2A1B4D"/><path d="M7.5 8.5q2-2.5 5-2.5" fill="none" stroke="#FFF3C4" stroke-width="1.6" stroke-linecap="round"/></svg>'; }
        box.appendChild(b); return b;
      });
      const order = [0];
      /* A peg can be taken now when it is in reach, it is not the cat's before its turn, and (where the thread may not cross) the
         stretch to it crosses nothing. */
      const legal = i => !order.includes(i) && dd(pts[i], pts[live], arNow()) <= reach
        && (i !== cat || order.length === n - 1) && !(strict && crossing(pts, order, i, arNow()));
      const paintReach = () => {
        const p = pts[live];
        halo.style.left = p.x+'%'; halo.style.top = p.y+'%';
        halo.style.width = (reach*2)+'%'; halo.style.aspectRatio = '1'; halo.style.height = 'auto';
        dots.forEach((d,i) => {
          if (order.includes(i)) return;
          d.classList.toggle('near', dd(pts[i], p, arNow()) <= reach);
        });
      };
      dots[0].classList.add('lit');
      paintReach();
      const left = () => n - order.length;
      /* Reaching for a peg is a tap, or a finger kept down and run along to it: a peg in reach is taken the moment the finger is
         over it, and one out of reach is only ever a miss when it is tapped. The same goes for the cat's peg before its turn and
         for a stretch that would cross: a finger passing over is not a mistake, a tap is. */
      const link = (i, sweep) => {
        const d = dots[i];
        if (i === live || order.includes(i)) return;
        const from = pts[live], to = pts[i];
        const dist = dd(to, from, arNow());
        if (dist > reach){ if (!sweep) wrongTap(ctx, paws, d, false); return; }
        if (i === cat && order.length !== n - 1){ if (!sweep && wrongTap(ctx, paws, d, false)) ctx.prompt(t('p.arcCat')); return; }
        const x = crossing(pts, order, i, arNow());
        if (x && strict){ if (!sweep && wrongTap(ctx, paws, d, false)) ctx.prompt(t('p.arcCross')); return; }
        const pull = dist / reach >= PULL;
        const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
        ln.setAttribute('x1',from.x); ln.setAttribute('y1',from.y);
        ln.setAttribute('x2',to.x);   ln.setAttribute('y2',to.y);
        if (pull) ln.setAttribute('class', 'pull');
        if (x){ crossed = true; ln.setAttribute('class', 'cross'); box.dataset.weave = '0'; }
        svg.appendChild(ln);
        d.classList.add('lit'); d.classList.remove('near'); order.push(i); live = i;
        reach = after(reach, dist, i);
        sfx.tap(); buzz('tap');
        /* The long pull is paid on the spot, so the choice it was is felt on the spot. */
        if (pull){ box.dataset.pulls = String(+box.dataset.pulls + 1); ctx.points(12 + Math.min(18, lv), d); }
        if (order.length >= n){
          svg.classList.add('made');
          if (!crossed && weaveOk){ svg.classList.add('weave'); const paid = ctx.points(30 + Math.min(40, lv*2), box); if (paid) floatPts(dots[0], t('fx.arcWeave'), 3); }
          return ctx.win(d);
        }
        /* Never a dead end: with nothing left that can be taken, the thread is let out as far as the nearest peg, and that costs a
           paw. Where the thread may not cross and every stretch left would, the rule is let go for the rest of the board. */
        if (!dots.some((_, k) => legal(k))){
          if (!paws.use(d)) return;
          ctx.slip();
          const open = pts.map((q, k) => order.includes(k) || (k === cat && order.length !== n - 1) ? Infinity : dd(q, pts[live], arNow()));
          reach = Math.max(reach, Math.min(...open) * 1.12);
          if (!dots.some((_, k) => legal(k))){ strict = false; box.dataset.strict = '0'; }
          paintReach();
          ctx.prompt(t('p.arcOut'));
          return;
        }
        paintReach();
        ctx.prompt(i === bead ? t('p.arcBead') : pull ? t('p.arcPull', { n: left() }) : t('p.arc', { n: left() }));
      };
      dots.forEach((d,i) => onTap(d, () => link(i, false)));
      let down = false;
      box.style.touchAction = 'none';
      box.addEventListener('pointerdown', () => { down = true; });
      box.addEventListener('pointerup', () => { down = false; });
      box.addEventListener('pointercancel', () => { down = false; });
      box.addEventListener('pointermove', ev => {
        if (!down) return;
        const e = document.elementFromPoint(ev.clientX, ev.clientY), d = e && e.closest && e.closest('.arcdot');
        const i = d ? dots.indexOf(d) : -1;
        if (i >= 0) link(i, true);
      });
      ctx.surface.appendChild(box);
      /* The first reach was painted before the box was in the page, from the shape the board was built for; paint it again now it
         is, so the pegs marked in reach are the pegs inside the circle you can see, to the pixel. */
      paintReach();
      /* The newest rule on this board is the line above it: taught in the prompt, never in a tutorial. */
      ctx.prompt(strict ? t('p.arcCross') : hasCat ? t('p.arcCat') : hasBead ? t('p.arcBead') : t('p.arc', { n: n - 1 }));
    }
  },"""
s = s[:a] + new_build + s[b:]

# the old header comment undersold it
r("""     From "connect dots with electricity". The advance is that range shrinks
     with every jump, so the order you take the dots in is the whole puzzle:
     a greedy nearest-first run strands the far ones. */""",
"""     From "connect dots with electricity". The advance is that range shrinks
     with every jump, so the order you take the dots in is the whole puzzle:
     a greedy nearest-first run strands the far ones. Since 0.180.0 how far each
     jump reaches is a choice too (a long pull pays and costs thread), a thread
     that never crosses itself is a clean weave, and three rules arrive with the
     levels: a gold bead, a napping cat's peg, and no crossing at all. */""")

# CSS
r(""".arcdot:active{transform:translate(-50%,-50%) scale(.88)}""",
""".arcdot:active{transform:translate(-50%,-50%) scale(.88)}
.arcdot svg{width:100%;height:100%;display:block;pointer-events:none}
.arcdot.bead,.arcdot.cat{padding:0;background:var(--ink-2)}
.arcdot.bead{border-color:#FFC53D;box-shadow:0 0 10px #ffc53d55}
.arcdot.cat{border-color:#CDBCF7;border-style:dashed}
.arcdot.cat.near{border-style:solid}
.arcdot.bead.lit,.arcdot.cat.lit{background:var(--zap)}
.arcwire line.pull{stroke-width:6px;stroke:#FFE08A}
.arcwire line.cross{stroke:#FF6E9E;stroke-dasharray:1 9;filter:none}
.arcwire.made line{stroke:#FFF3C4}
.arcwire.weave line{stroke:#FFF3C4;stroke-width:6px;filter:drop-shadow(0 0 6px #FFE08A)}
html[data-motion="on"] .arcwire.weave line{animation:arcWeave .7s ease-out}
@keyframes arcWeave{0%{stroke-width:4px;opacity:.6}40%{stroke-width:9px;opacity:1}100%{stroke-width:6px}}""")

# strings, four languages in the order the tables come: en, fr, es, de
add = [
 {"p.arcBead":"The gold bead lets the thread back out","p.arcCat":"Loop the napping cat’s peg last","p.arcCross":"The thread must not cross itself","p.arcPull":"Long pull! {n} left","p.arcOut":"Nothing in reach: the thread is let out","fx.arcWeave":"Clean weave","a.arcCat":"Napping cat’s peg, loop it last","a.arcBead":"Gold bead peg"},
 {"p.arcBead":"La perle dorée redonne du fil","p.arcCat":"Bouclez le piquet du chat endormi en dernier","p.arcCross":"Le fil ne doit pas se croiser","p.arcPull":"Grand tirage ! Encore {n}","p.arcOut":"Rien à portée : on redonne du fil","fx.arcWeave":"Tissage net","a.arcCat":"Piquet du chat endormi, à boucler en dernier","a.arcBead":"Piquet à perle dorée"},
 {"p.arcBead":"La cuenta dorada suelta más hilo","p.arcCat":"Enlaza la clavija del gato dormido al final","p.arcCross":"El hilo no debe cruzarse","p.arcPull":"¡Tirón largo! Faltan {n}","p.arcOut":"Nada al alcance: se suelta hilo","fx.arcWeave":"Tejido limpio","a.arcCat":"Clavija del gato dormido, enlázala al final","a.arcBead":"Clavija con cuenta dorada"},
 {"p.arcBead":"Die goldene Perle gibt wieder Faden","p.arcCat":"Den Stift der schlafenden Katze zuletzt","p.arcCross":"Der Faden darf sich nicht kreuzen","p.arcPull":"Weiter Zug! Noch {n}","p.arcOut":"Nichts in Reichweite: Faden wird nachgelassen","fx.arcWeave":"Sauber gewebt","a.arcCat":"Stift der schlafenden Katze, zuletzt umschlingen","a.arcBead":"Stift mit goldener Perle"},
]
hits = list(re.finditer(r"'p\.arc':'[^']*'", s)); assert len(hits)==4, len(hits)
for m, d in reversed(list(zip(hits, add))):
    extra = ''.join(", '%s':'%s'" % (k, v) for k, v in d.items())
    s = s[:m.end()] + extra + s[m.end():]
open(p,'w').write(s)
print('ok')
