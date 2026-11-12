"""No Crossing (slack): par, pinned pegs, a napping cat, a short gold thread. Run from the repo root."""
import sys
p = 'site/app.html'; s = open(p).read()
VER = sys.argv[1] if len(sys.argv) > 1 else '0.181.0'

a = s.index("  slack: {\n    name:'No Crossing'")
b0 = s.index("    build(ctx){", a)
e = s.index("\n  },\n\n  /* ── Tide Breath", a)
CAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11 4 4l5.5 3.5M19 11l1-7-5.5 3.5" fill="#F6EBD9" stroke="#2A1B4D" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="8" fill="#F6EBD9" stroke="#2A1B4D" stroke-width="1.6"/><path d="M7.5 13q1.8 1.8 3.6 0M12.9 13q1.8 1.8 3.6 0" fill="none" stroke="#2A1B4D" stroke-width="1.5" stroke-linecap="round"/><path d="M11 16.5h2l-1 1.2z" fill="#FF7E96"/></svg>'
build = r"""    /* Since __VER__ the board has a par and three rules of its own, each met in turn. Par: the game untangles the board itself before
       you see it and counts the pegs it had to move; do it in that many (moving one peg twice in a row is one move) and the round
       pays extra. From level 8 a peg is pinned where it is; from 14 a cat naps in the middle and no thread may lie across her; from
       20 one gold thread is short, and pulled past its length it counts against you like a crossing. Every board is still the
       ring it was built from, with the pins already at their places on it, so there is always a way out. */
    build(ctx){
      const lv = ctx.level;
      const n = clamp(6 + Math.floor(lv/3), 6, 12);
      const nPins = lv >= 18 ? 2 : lv >= 8 ? 1 : 0, hasCat = lv >= 14, hasShort = lv >= 20;
      /* Nodes evenly on a circle and edges only between near neighbours is a
         layout with no crossings by construction. Scrambling the positions
         keeps the edges, so the solution is always the circle. */
      const edges = [];
      for (let i=0;i<n;i++){
        edges.push([i, (i+1)%n]);
        /* not the chord that wraps round an odd ring: that one crosses the first chord, and the ring would not be a way out */
        if (n > 5 && i % 2 === 0 && i + 2 <= n) edges.push([i, (i+2)%n]);
      }
      const spotOf = i => { const a = 2*Math.PI*i/n - Math.PI/2; return { x: 50 + 36*Math.cos(a), y: 50 + 36*Math.sin(a) }; };
      const pins = new Set();
      while (pins.size < nPins) pins.add(Math.floor(ctx.rnd()*n));
      /* The cat sleeps near the middle, where the ring's threads never go. */
      const catAt = hasCat ? { x: 50 + (ctx.rnd() - 0.5)*8, y: 50 + (ctx.rnd() - 0.5)*8, r: 9 } : null;
      /* The short thread joins two neighbours on the ring, neither of them pinned if that can be had. */
      const SHORT = 34;
      let shortE = -1;
      if (hasShort){
        const ring = edges.map((e2, i) => i).filter(i => (edges[i][1] - edges[i][0] + n) % n === 1);
        const free = ring.filter(i => !pins.has(edges[i][0]) && !pins.has(edges[i][1]));
        const from = free.length ? free : ring;
        shortE = from[Math.floor(ctx.rnd()*from.length)];
      }
      /* Nodes must never sit on top of each other. Two overlapping knobs make a
         drag ambiguous — the nearest wins, which is deterministic but not
         something the player can see or predict. */
      const MINGAP = 17;
      /* Measured in widths, so "17 apart" is the same distance whichever way the
         two pegs lie on a board taller than it is wide. */
      const gap = (p, q, ar) => Math.hypot(p.x-q.x, (p.y-q.y)*ar);
      const scatter = () => {
        const out = new Array(n).fill(null), ar = aspectOf(ctx.surface);
        pins.forEach(i => { out[i] = spotOf(i); });
        for (let i=0;i<n;i++){
          if (out[i]) continue;
          let best = null, bestD = -1;
          const placed = out.filter(Boolean);
          for (let a=0;a<160;a++){
            const q = { x: 14 + ctx.rnd()*72, y: 14 + ctx.rnd()*72 };
            let d = placed.length ? Math.min(...placed.map(o => gap(o, q, ar))) : 99;
            if (catAt) d = Math.min(d, gap(catAt, q, ar) - catAt.r + 5);
            if (d >= MINGAP) { best = q; break; }
            if (d > bestD) { bestD = d; best = q; }
          }
          out[i] = best;
        }
        return out;
      };
      const pos = scatter();
      const box = mk('div','arcbox');
      const arNow = () => box.isConnected ? aspectOf(box) : aspectOf(ctx.surface);
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 100 100'); svg.setAttribute('class','slackwire');
      /* Stretch the 0-100 space over the whole board, the way the pegs' left and
         top percentages are. Left to itself the SVG keeps a square and sits in
         the middle of a tall box, so every thread ended a hand's width from the
         peg it was meant to join. */
      svg.setAttribute('preserveAspectRatio','none');
      box.appendChild(svg);
      const lines = edges.map(() => {
        const l = document.createElementNS('http://www.w3.org/2000/svg','line');
        svg.appendChild(l); return l;
      });
      if (shortE >= 0) lines[shortE].classList.add('short');
      if (catAt){
        const c = mk('div','slackcat'); c.innerHTML = '__CAT__';
        c.style.left = catAt.x + '%'; c.style.top = catAt.y + '%';
        box.appendChild(c);
      }
      const cross = (a,b2,c,d) => {
        const s = (p,q,r) => Math.sign((q.x-p.x)*(r.y-p.y) - (q.y-p.y)*(r.x-p.x));
        return s(a,b2,c) !== s(a,b2,d) && s(c,d,a) !== s(c,d,b2);
      };
      const crossings = (P = pos) => {
        let k = 0;
        for (let i=0;i<edges.length;i++) for (let j=i+1;j<edges.length;j++){
          const [a,b2] = edges[i], [c,d] = edges[j];
          if (a===c||a===d||b2===c||b2===d) continue;
          if (cross(P[a],P[b2],P[c],P[d])) k++;
        }
        return k;
      };
      /* Does this thread lie across the cat: how near its nearest point comes to her, in widths. */
      const overCat = (i, P, ar) => {
        if (!catAt) return false;
        const A = P[edges[i][0]], B = P[edges[i][1]];
        const ax = A.x, ay = A.y*ar, bx = B.x, by = B.y*ar, cx = catAt.x, cy = catAt.y*ar;
        const L = (bx-ax)*(bx-ax) + (by-ay)*(by-ay);
        const u = L ? clamp(((cx-ax)*(bx-ax) + (cy-ay)*(by-ay)) / L, 0, 1) : 0;
        return Math.hypot(ax + u*(bx-ax) - cx, ay + u*(by-ay) - cy) < catAt.r;
      };
      const taut = (P, ar) => shortE >= 0 && gap(P[edges[shortE][0]], P[edges[shortE][1]], ar) > SHORT;
      /* Everything still wrong with the board: crossings, threads over the cat, and the short thread pulled too far. */
      const wrong = (P = pos, ar = arNow()) => {
        let k = crossings(P);
        if (catAt) for (let i=0;i<edges.length;i++) if (overCat(i, P, ar)) k++;
        return k + (taut(P, ar) ? 1 : 0);
      };
      const knobs = pos.map((p,i) => {
        const e = mk('div','slacknode');
        e.setAttribute('role','button');
        e.setAttribute('aria-label', t(pins.has(i) ? 'a.slackPin' : 'a.node', { n: i+1 }));
        if (pins.has(i)){ e.classList.add('pin'); e.setAttribute('aria-disabled', 'true'); }
        box.appendChild(e); return e;
      });
      /* Par. Greedy and on a coarse grid: each turn it moves the one free peg, to the one place, that leaves the least wrong. What
         it manages is a count a person can match, which is all a par has to be; one is added because it can see the whole grid. */
      const solvePar = () => {
        const P = pos.map(q => ({ x:q.x, y:q.y })), ar = aspectOf(ctx.surface);
        let cur = wrong(P, ar), moves = 0, last = -1;
        while (cur > 0 && moves < n*2){
          let best = null;
          for (let i=0;i<n;i++){
            if (pins.has(i) || i === last) continue;
            const keep = P[i];
            for (let gx=10; gx<=90; gx+=10) for (let gy=10; gy<=90; gy+=10){
              const q = { x:gx, y:gy };
              if (P.some((o,k) => k !== i && gap(o, q, ar) < MINGAP)) continue;
              if (catAt && gap(catAt, q, ar) < catAt.r + 6) continue;
              P[i] = q;
              const w = wrong(P, ar);
              if (!best || w < best.w) best = { i, q, w };
            }
            P[i] = keep;
          }
          if (!best || best.w >= cur) break;
          P[best.i] = best.q; cur = best.w; moves++; last = best.i;
        }
        return cur === 0 ? moves : 0;
      };
      let par = n - nPins, moves = 0, lastMoved = -1;
      let done = false, live = false;
      const teach = hasShort ? 'p.slackShort' : hasCat ? 'p.slackCat' : nPins ? 'p.slackPin' : '';
      const parChip = mk('div','parchip');
      const paintPar = () => { parChip.textContent = t('slack.par', { m: moves, p: par }); parChip.classList.toggle('over', moves > par); };
      const repaint = () => {
        const ar = arNow();
        edges.forEach(([a,b2],i) => {
          lines[i].setAttribute('x1',pos[a].x); lines[i].setAttribute('y1',pos[a].y);
          lines[i].setAttribute('x2',pos[b2].x); lines[i].setAttribute('y2',pos[b2].y);
          if (catAt) lines[i].classList.toggle('oncat', overCat(i, pos, ar));
        });
        if (shortE >= 0) lines[shortE].classList.toggle('taut', taut(pos, ar));
        knobs.forEach((k,i) => { k.style.left = pos[i].x+'%'; k.style.top = pos[i].y+'%'; });
        const c = wrong(pos, ar);
        svg.classList.toggle('clean', c === 0);
        /* The newest rule on this board rides on the count until the first move: taught in the prompt, never in a tutorial. */
        ctx.prompt(t(teach && moves === 0 ? teach : 'p.slack', { n: c }));
        box.dataset.wrong = c; box.dataset.moves = moves;
        if (c === 0 && live && !done){
          done = true;
          if (moves <= par){
            svg.classList.add('neat'); parChip.classList.add('made');
            ctx.points(20 + Math.min(40, lv*2), box);
            floatPts(knobs[0], t('fx.slackPar'), 3);
          }
          ctx.win(knobs[0]);
        }
      };
      let held = -1;
      /* Without dragging (0.175.0, WCAG 2.5.7): a tap on a peg picks it up, ringed, and a tap on an open spot sets it
         down there; a drag works as it always did. A spot too close to another peg is refused, as a drag would be. */
      let armed = -1, moved = false, q0 = null;
      const arm = i => {
        if (armed >= 0){ knobs[armed].classList.remove('armed'); knobs[armed].setAttribute('aria-pressed', 'false'); }
        armed = i;
        if (i >= 0){ knobs[i].classList.add('armed'); knobs[i].setAttribute('aria-pressed', 'true'); ctx.prompt(t('p.tapPlace')); sfx.tap(); }
      };
      knobs.forEach(k => k.setAttribute('aria-pressed', 'false'));
      const placeAt = (i, q) => {
        const nx = clamp(q.x, 6, 94), ny = clamp(q.y, 6, 94);
        const ar = aspectOf(box);
        const clash = pos.some((o,k) => k !== i && gap(o, { x:nx, y:ny }, ar) < MINGAP*0.7)
          || (catAt && gap(catAt, { x:nx, y:ny }, ar) < catAt.r + 4);          /* nor on the cat */
        if (!clash){
          /* One move is one peg: nudging the same peg again is still that move. */
          if (i !== lastMoved){ moves++; lastMoved = i; paintPar(); }
          pos[i].x = nx; pos[i].y = ny; repaint(); return true;
        }
        return false;
      };
      const nope = i => {
        knobs[i].classList.add('nope'); sfx.tap(); ctx.prompt(t('p.slackPinned'));
        ctx.after(320, () => knobs[i].classList.remove('nope'));
      };
      onDrag(box, {
        start: q => {
          held = -1; moved = false; q0 = q; let best = 9e9;
          if (done) return;
          const ar = aspectOf(box);
          pos.forEach((p,i) => { const d = gap(p, q, ar); if (d < 11 && d < best){ best = d; held = i; } });
          /* a pinned peg is not picked up, and a touch on it is not a touch on the open board either */
          if (held >= 0 && pins.has(held)){ nope(held); held = -1; return; }
          if (held >= 0){ if (held !== armed) arm(-1); knobs[held].classList.add('held'); return; }
          /* an open spot: a picked-up peg goes there */
          if (armed >= 0){ const i = armed; arm(-1); if (!placeAt(i, q)){ sfx.tap(); repaint(); } }
        },
        move: q => {
          if (held < 0 || done) return;
          if (!moved && Math.hypot(q.x - q0.x, q.y - q0.y) < 2.5) return;
          moved = true;
          placeAt(held, q);
        },
        end: () => {
          if (held < 0) return;
          knobs[held].classList.remove('held');
          const i = held; held = -1;
          if (done) return;
          if (!moved){ if (armed === i){ arm(-1); repaint(); } else arm(i); }
        }
      });
      const col = mk('div','sumcol');
      col.appendChild(box);
      /* A hint lights the two threads of one crossing for a moment, and rings the peg among their four ends that is caught up in the most
         crossings: moving that one is the quickest way to untangle. Two a round. With no crossing left it lights the thread that lies
         over the cat, or the short thread pulled too far. The peg it rings is never a pinned one. */
      let hints = 2;
      const tools = mk('div','sumtools'), hintBtn = mk('button','sumtool'); hintBtn.type = 'button';
      const paintHint = () => { hintBtn.textContent = t('slack.hint') + ' ' + hints; hintBtn.disabled = hints <= 0 || done; };
      hintBtn.classList.add('aid'); onTap(hintBtn, () => {
        if (hints <= 0 || done) return;
        const ar = arNow();
        const caught = new Array(n).fill(0);
        for (let x=0;x<edges.length;x++) for (let y=x+1;y<edges.length;y++){
          const [p1,q1] = edges[x], [r1,u1] = edges[y];
          if (p1===r1||p1===u1||q1===r1||q1===u1) continue;
          if (cross(pos[p1],pos[q1],pos[r1],pos[u1])){ caught[p1]++; caught[q1]++; caught[r1]++; caught[u1]++; }
        }
        let lit = null;
        for (let i=0;i<edges.length && !lit;i++) for (let j=i+1;j<edges.length;j++){
          const [a1,b1] = edges[i], [c1,d1] = edges[j];
          if (a1===c1||a1===d1||b1===c1||b1===d1) continue;
          if (cross(pos[a1],pos[b1],pos[c1],pos[d1])){ lit = [i, j]; break; }
        }
        if (!lit && catAt){ const i = edges.findIndex((e2, k) => overCat(k, pos, ar)); if (i >= 0) lit = [i]; }
        if (!lit && taut(pos, ar)) lit = [shortE];
        if (!lit) return;
        const ends = lit.flatMap(i => edges[i]).filter(k => !pins.has(k));
        if (!ends.length) return;
        hints--; paintHint(); sfx.tap();
        const worst = ends.reduce((m, k) => caught[k] > caught[m] ? k : m, ends[0]);
        lit.forEach(i => lines[i].classList.add('hint'));
        knobs[worst].classList.add('hot');
        ctx.after(1600, () => { lit.forEach(i => lines[i].classList.remove('hint')); knobs[worst].classList.remove('hot'); });
      });
      tools.appendChild(parChip); tools.appendChild(hintBtn); col.appendChild(tools);
      ctx.surface.appendChild(col);
      /* A layout that starts solved is not a puzzle. */
      let guard = 0;
      while (wrong() === 0 && guard++ < 40){
        scatter().forEach((q,i) => { pos[i] = q; });
      }
      const g = solvePar();
      if (g > 0) par = Math.min(par, g + 1);
      box.dataset.lv = lv; box.dataset.pins = [...pins].join(','); box.dataset.cat = catAt ? '1' : ''; box.dataset.short = shortE;
      box.dataset.par = par;
      live = true;
      paintPar(); paintHint();
      repaint();
    }""".replace('__VER__', VER).replace('__CAT__', CAT)
s = s[:b0] + build + s[e:]

css_old = ".slackwire.clean line{stroke:var(--cool)}\n"
assert s.count(css_old) == 1
css_new = css_old + """/* No Crossing's own rules (__VER__): a pinned peg, a cat no thread may lie across, a short gold thread, and a par. */
.slackwire line.short{stroke:#FFC53D;stroke-width:5px}
.slackwire.clean line.short{stroke:#FFC53D}
.slackwire line.taut{stroke:var(--bad);stroke-dasharray:7 6}
.slackwire line.oncat{stroke:var(--bad)}
.slackcat{position:absolute;width:19%;aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 2px 4px #0006)}
.slackcat svg{display:block;width:100%;height:100%}
.slacknode.pin{background:var(--ink-2);border-color:#CDBCF7;cursor:not-allowed}
.slacknode.pin::after{content:"";position:absolute;inset:30%;border-radius:50%;background:#CDBCF7;box-shadow:0 1px 0 #0008}
html[data-motion="on"] .slacknode.nope{animation:slackNope .3s ease-in-out}
@keyframes slackNope{0%,100%{transform:translate(-50%,-50%)}30%{transform:translate(-58%,-50%)}70%{transform:translate(-42%,-50%)}}
.parchip{align-self:center;margin-right:10px;padding:4px 10px;border-radius:999px;color:var(--haze);background:#00000038;border:1px solid var(--edge-soft);
  font-family:var(--f-data);font-size:calc(11px*var(--ts));font-weight:700;letter-spacing:.06em;white-space:nowrap;transition:color var(--t-fast),border-color var(--t-fast)}
.parchip.over{opacity:.55}
.parchip.made{color:#FFC53D;border-color:#FFC53D}
html[data-motion="on"] .slackwire.neat line{animation:arcWeave .7s ease-out}
""".replace('__VER__', VER)
s = s.replace(css_old, css_new)

L = [
 ("'p.slack':'{n} crossings left'", {'p.slackPin':'{n} crossings · pins stay put','p.slackCat':'{n} crossings · not over the cat','p.slackShort':'{n} crossings · short gold thread','p.slackPinned':'That peg is pinned','slack.par':'Moves {m} · Par {p}','fx.slackPar':'Under par!','a.slackPin':'Peg {n}, pinned'}),
 ("'p.slack':'{n} croisements restants'", {'p.slackPin':'{n} croisements · piquets cloués','p.slackCat':'{n} croisements · pas sur le chat','p.slackShort':'{n} croisements · fil doré court','p.slackPinned':'Ce piquet est cloué','slack.par':'Coups {m} · Par {p}','fx.slackPar':'Sous le par !','a.slackPin':'Piquet {n}, cloué'}),
 ("'p.slack':'{n} cruces restantes'", {'p.slackPin':'{n} cruces · clavijas fijas','p.slackCat':'{n} cruces · no sobre el gato','p.slackShort':'{n} cruces · hilo dorado corto','p.slackPinned':'Esa clavija está fija','slack.par':'Jugadas {m} · Par {p}','fx.slackPar':'¡Bajo par!','a.slackPin':'Clavija {n}, fija'}),
 ("__DE__", {'p.slackPin':'{n} Kreuzungen · feste Stifte','p.slackCat':'{n} Kreuzungen · Katze frei lassen','p.slackShort':'{n} Kreuzungen · kurzer Goldfaden','p.slackPinned':'Dieser Stift sitzt fest','slack.par':'Züge {m} · Par {p}','fx.slackPar':'Unter Par!','a.slackPin':'Stift {n}, fest'}),
]
import re
de = [m for m in re.findall(r"'p\.slack':'[^']*'", s)][3]
for anchor, add in L:
    if anchor == '__DE__': anchor = de
    assert s.count(anchor) == 1, anchor
    s = s.replace(anchor, anchor + ', ' + ', '.join("'%s':'%s'" % kv for kv in add.items()))
open(p, 'w').write(s)
print('slack applied')
