"""Even Skeins (halve): tied skeins, a cat's weight, a pinned skein, fewest moves. Run from the repo root."""
import sys, re
p = 'site/app.html'; s = open(p).read()
VER = sys.argv[1] if len(sys.argv) > 1 else '0.183.0'
CAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11 4 4l5.5 3.5M19 11l1-7-5.5 3.5" fill="#F6EBD9" stroke="#2A1B4D" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="8" fill="#F6EBD9" stroke="#2A1B4D" stroke-width="1.6"/><path d="M7.5 13q1.8 1.8 3.6 0M12.9 13q1.8 1.8 3.6 0" fill="none" stroke="#2A1B4D" stroke-width="1.5" stroke-linecap="round"/><path d="M11 16.5h2l-1 1.2z" fill="#FF7E96"/></svg>'

def sub(old, new, count=1):
    global s
    assert s.count(old) == count, old[:80]
    s = s.replace(old, new)

a = s.index("  halve: {\n    name:'Even Skeins'")
e = s.index("\n  },\n\n  /* ── Loaf Box", a)
body = s[a:e]
def bsub(old, new):
    global body
    assert body.count(old) == 1, old[:90]
    body = body.replace(old, new)

bsub("""    build(ctx){
      /* Sum Snap""", """    /* Since __VER__ the skeins stop being loose, one rule at a time. From level 6 two skeins are tied and move as one (two pairs
       from 16). From 12 the cat sits in the left basket and her weight counts. From 20 one skein is pinned where it lies. The
       fewest moves is worked out over every split, and a round finished in that many pays extra. */
    build(ctx){
      /* Sum Snap""")
bsub("      const n = 8 + Math.min(4, Math.floor(ctx.level/5));", """      const lv = ctx.level;
      const nTies = lv >= 16 ? 2 : lv >= 6 ? 1 : 0, hasCat = lv >= 12, hasPin = lv >= 20;
      /* The cat is one of the skeins, taken out: so the board still balances with her in it. */
      let n = 8 + Math.min(4, Math.floor(lv/5)) + (hasCat ? 1 : 0);""")
bsub("        vals = shuffle(a.concat(b), ctx.rnd);\n      }\n      /* Two mirrored", "        vals = shuffle(a.map(v => ({ v, g: 0 })).concat(b.map(v => ({ v, g: 1 }))), ctx.rnd);\n      }\n      /* Two mirrored")
bsub("        vals = shuffle(a.concat(b), ctx.rnd);\n      }\n\n      const sum", """        vals = shuffle(a.map(v => ({ v, g: 0 })).concat(b.map(v => ({ v, g: 1 }))), ctx.rnd);
      }
      let catW = 0, catG = 0;
      if (hasCat){
        let ci = vals.findIndex(o => o.v >= 3 && o.v <= 12);
        if (ci < 0) ci = 0;
        catW = vals[ci].v; catG = vals[ci].g; vals.splice(ci, 1);
      }
      const grp = vals.map(o => o.g);
      vals = vals.map(o => o.v);
      n = vals.length;
      /* Which basket each group belongs in for the split the board was built from: the cat's group goes left, with her. */
      const homeOf = i => grp[i] === catG ? 0 : 1;
      /* Ties are between two skeins of one group, so the built split still works; the pinned skein is never tied. */
      const unit = vals.map((_, i) => i), tie = new Array(n).fill(-1);
      for (let k = 0, tries = 0; k < nTies && tries < 40; tries++){
        const i = Math.floor(ctx.rnd()*n), j = Math.floor(ctx.rnd()*n);
        if (i === j || grp[i] !== grp[j] || unit[i] !== i || unit[j] !== j || tie[i] >= 0 || tie[j] >= 0) continue;
        unit[j] = i; tie[i] = tie[j] = k; k++;
      }
      let pin = -1;
      if (hasPin) for (let tries = 0; tries < 40 && pin < 0; tries++){ const i = Math.floor(ctx.rnd()*n); if (tie[i] < 0) pin = i; }
      const members = u => vals.map((_, i) => i).filter(i => unit[i] === u);
      const units = vals.map((_, i) => i).filter(i => unit[i] === i);

      const sum""")
bsub("      const half = sum / 2;", "      const half = (sum + catW) / 2;")
bsub("""      let side = vals.map(() => ctx.rnd() < 0.5 ? 1 : 0);
      const totalOf = w => vals.reduce((x,v,i) => x + (side[i] === w ? v : 0), 0);
      for (let guard = 0; guard < 40 && totalOf(0) === totalOf(1); guard++)
        side[Math.floor(ctx.rnd()*n)] ^= 1;""", """      const side = new Array(n).fill(0);
      units.forEach(u => { const w = u === pin ? homeOf(u) : ctx.rnd() < 0.5 ? 1 : 0; members(u).forEach(i => { side[i] = w; }); });
      const totalOf = w => vals.reduce((x,v,i) => x + (side[i] === w ? v : 0), 0) + (w === 0 ? catW : 0);
      const free = units.filter(u => u !== pin);
      /* Never all the skeins in one basket: no more than two over half on either side, so a crowded basket still fits. */
      const lim = Math.ceil(n/2) + 2, count = w => side.filter(v => v === w).length;
      for (let guard = 0; guard < 60 && (totalOf(0) === totalOf(1) || count(0) > lim || count(1) > lim); guard++){
        const heavy = count(0) > lim ? 0 : count(1) > lim ? 1 : -1;
        const pool = heavy < 0 ? free : free.filter(u => side[u] === heavy);
        const u = pool[Math.floor(ctx.rnd()*pool.length)]; members(u).forEach(i => { side[i] ^= 1; });
      }
      /* The fewest moves from here to any split that balances: a tied pair moves as one, the pinned skein not at all. */
      const bestFrom = () => {
        let best = { cost: 1e9, mask: -1 };
        for (let mask = 0; mask < (1 << units.length); mask++){
          let sm = catW, c = 0, ok = true;
          for (let k = 0; k < units.length; k++){
            const u = units[k], w = (mask >> k) & 1;
            if (u === pin && w !== side[u]){ ok = false; break; }
            if (w === 0) for (const i of members(u)) sm += vals[i];
            if (w !== side[u]) c++;
          }
          if (ok && sm === half && c < best.cost) best = { cost: c, mask };
        }
        return best;
      };""")
bsub("""      let least = n;
      for (let mask = 0; mask < (1 << n); mask++){
        let s = 0;
        for (let i = 0; i < n; i++) if (mask & (1 << i)) s += vals[i];
        if (s !== half) continue;
        let moves = 0;
        for (let i = 0; i < n; i++) if (((mask >> i) & 1) !== side[i]) moves++;
        least = Math.min(least, moves);
      }
      if (!isFinite(least) || least < 1) least = 1;""", """      let least = bestFrom().cost;
      if (!isFinite(least) || least < 1 || least > n) least = 1;""")
bsub("""        return { tray, grid, tot };
      });""", """        return { tray, grid, tot };
      });
      let catEl = null;
      if (hasCat){
        const c = mk('div','hlvcat'); c.innerHTML = '__CAT__<b>' + catW + '</b>';
        c.setAttribute('role','img'); c.setAttribute('aria-label', t('a.halveCat', { w: catW }));
        catEl = c;
      }""")
bsub("""      const flip = (i, b) => {
        if (done) return;
        side[i] ^= 1; history.push(i);
        sfx.tap(); buzz('tap');
        paint();
        if (totalOf(0) === totalOf(1)){
          done = true; paintHint();
          wrap.classList.add('good');
          return ctx.win(b);
        }""", """      const flip = (i, b) => {
        if (done) return;
        if (i === pin){
          b.classList.add('nope'); sfx.tap(); ctx.prompt(t('p.halvePinned'));
          ctx.after(320, () => b.classList.remove('nope')); return;
        }
        const u = unit[i];
        members(u).forEach(k => { side[k] ^= 1; }); history.push(u);
        sfx.tap(); buzz('tap');
        paint();
        if (totalOf(0) === totalOf(1)){
          done = true; paintHint();
          wrap.classList.add('good');
          if (history.length <= least){
            wrap.classList.add('exact'); par.classList.add('made');
            ctx.points(20 + Math.min(40, lv*2), wrap);
            floatPts(b, t('fx.halveExact'), 3);
          }
          return ctx.win(b);
        }""")
bsub("""        b.textContent = String(v);
        b._i = i;""", """        b.textContent = String(v);
        b._i = i;
        if (tie[i] >= 0) b.classList.add('tied', 'tie' + tie[i]);
        if (i === pin){ b.classList.add('pin'); b.setAttribute('aria-disabled', 'true'); }""")
bsub("onTap(undo, () => { const i = history.pop(); if (i === undefined || done) return; side[i] ^= 1;", "onTap(undo, () => { const u = history.pop(); if (u === undefined || done) return; members(u).forEach(k => { side[k] ^= 1; });")
bsub("""        let bestMask = -1, bestCost = 1e9;
        for (let mask = 0; mask < (1 << n); mask++){
          let sm = 0;
          for (let i = 0; i < n; i++) if (mask & (1 << i)) sm += vals[i];
          if (sm !== half) continue;
          let c = 0; for (let i = 0; i < n; i++) if (((mask >> i) & 1) !== side[i]) c++;
          if (c < bestCost){ bestCost = c; bestMask = mask; }
        }
        const i = bestMask < 0 ? -1 : vals.findIndex((_, k) => ((bestMask >> k) & 1) !== side[k]);
        if (i < 0) return;
        hints--; paintHint(); sfx.tap();
        chips[i].classList.add('hint');
        ctx.after(2200, () => chips[i].classList.remove('hint'));""", """        const best = bestFrom();
        const k0 = best.mask < 0 ? -1 : units.findIndex((u, k) => ((best.mask >> k) & 1) !== side[u]);
        if (k0 < 0) return;
        hints--; paintHint(); sfx.tap();
        const lit = members(units[k0]);
        lit.forEach(i => chips[i].classList.add('hint'));
        ctx.after(2200, () => lit.forEach(i => chips[i].classList.remove('hint')));""")
bsub("      const paintHint = () => { hint.textContent = t('halve.hint') + ' ' + hints; hint.disabled = hints <= 0 || done; };",
     "      const par = mk('div','parchip');\n      const paintHint = () => { hint.textContent = t('halve.hint') + ' ' + hints; hint.disabled = hints <= 0 || done;\n        par.textContent = t('halve.least', { m: history.length, p: least }); par.classList.toggle('over', history.length > least); };")
bsub("      tools.appendChild(undo); tools.appendChild(hint); col.appendChild(tools);", "      tools.appendChild(par); tools.appendChild(undo); tools.appendChild(hint); col.appendChild(tools);")
bsub("""        chips.forEach((b, i) => b.setAttribute('aria-label',
          t('halve.chip', { v: vals[i], s: side[i] + 1 })));""", """        chips.forEach((b, i) => b.setAttribute('aria-label',
          t('halve.chip', { v: vals[i], s: side[i] + 1 }) + (i === pin ? ', ' + t('a.halvePin') : tie[i] >= 0 ? ', ' + t('a.halveTied') : '')));
        paintHint();
        wrap.dataset.lv = lv; wrap.dataset.least = least; wrap.dataset.moves = history.length;""")
bsub("        ctx.prompt(t('p.halve', { n: Math.abs(totalOf(0) - totalOf(1)) }));", """        /* The newest rule rides on the gap until the first move: taught in the prompt, never in a tutorial. */
        const teach = hasPin ? 'p.halvePin' : hasCat ? 'p.halveCat' : nTies ? 'p.halveTie' : 'p.halve';
        ctx.prompt(t(history.length ? 'p.halve' : teach, { n: Math.abs(totalOf(0) - totalOf(1)), w: catW }));""")
bsub("      paint();\n    }", "      wrap._state = () => ({ vals: vals.slice(), side: side.slice(), unit: unit.slice(), pin, catW, least, best: bestFrom() });\n      paint();\n    }")
bsub("          tr.grid.replaceChildren.apply(tr.grid, mine);", "          tr.grid.replaceChildren.apply(tr.grid, w === 0 && catEl ? [catEl].concat(mine) : mine);")
body = body.replace('__VER__', VER).replace('__CAT__', CAT)
s = s[:a] + body + s[e:]

sub(".hlvwrap.good .hlvchip{border-color:var(--cool)}\n", """.hlvwrap.good .hlvchip{border-color:var(--cool)}
/* Even Skeins' own rules (__VER__): tied skeins, the cat's weight, a pinned skein. */
.hlvchip.tie0{border-color:#FFC53D;background:#ffc53d1f;color:#FFE29A}
.hlvchip.tie0::after{border-color:#FFC53D;border-style:solid}
.hlvchip.tie1{border-color:#FF7E96;background:#ff7e961f;color:#FFC2CE}
.hlvchip.tie1::after{border-color:#FF7E96;border-style:solid}
.hlvchip.pin{border-style:dashed;border-color:#CDBCF7;color:#CDBCF7;cursor:not-allowed;
  background:repeating-linear-gradient(45deg,#cdbcf726 0 4px,transparent 4px 9px)}
/* Three skeins to a row in a narrow basket (a 320px phone), so a crowded basket still fits above the tools. */
@media (max-width:360px){.hlvtray{padding:6px}.hlvgrid{gap:3px}.hlvchip{width:40px;height:40px}.hlvcat svg{width:24px;height:24px}}
html[data-motion="on"] .hlvchip.nope{animation:ltcNope .3s ease-in-out}
.hlvcat{flex:none;display:flex;align-items:center;gap:6px;align-self:flex-start;padding:3px 10px 3px 4px;border-radius:999px;
  background:#f6ebd914;border:1px solid #f6ebd955}
.hlvcat svg{width:30px;height:30px;display:block}
.hlvcat b{font-family:var(--f-data);font-size:calc(15px*var(--ts));font-weight:700;color:var(--cream)}
.hlvwrap + .sumtools .parchip,.sumcol .parchip{margin-right:10px}
html[data-motion="on"] .hlvwrap.exact .hlvtot{animation:arcWeave .7s ease-out}
""".replace('__VER__', VER))

adds = [
 {'p.halveTie':'{n} apart · tied skeins go together','p.halveCat':'{n} apart · the cat weighs {w}','p.halvePin':'{n} apart · the dashed skein stays','p.halvePinned':'That skein is pinned','halve.least':'Moves {m} · Least {p}','fx.halveExact':'Fewest moves!','a.halveCat':'The cat, weighing {w}, in basket 1','a.halvePin':'pinned','a.halveTied':'tied to another'},
 {'p.halveTie':'Écart de {n} · pelotes liées ensemble','p.halveCat':'Écart de {n} · le chat pèse {w}','p.halvePin':'Écart de {n} · la pelote pointillée reste','p.halvePinned':'Cette pelote est épinglée','halve.least':'Coups {m} · Mini {p}','fx.halveExact':'Le moins de coups !','a.halveCat':'Le chat, qui pèse {w}, dans le panier 1','a.halvePin':'épinglée','a.halveTied':'liée à une autre'},
 {'p.halveTie':'{n} de diferencia · atadas van juntas','p.halveCat':'{n} de diferencia · el gato pesa {w}','p.halvePin':'{n} de diferencia · la punteada queda','p.halvePinned':'Esa madeja está fija','halve.least':'Jugadas {m} · Mínimo {p}','fx.halveExact':'¡Mínimo de jugadas!','a.halveCat':'El gato, que pesa {w}, en la cesta 1','a.halvePin':'fija','a.halveTied':'atada a otra'},
 {'p.halveTie':'{n} Unterschied · gebundene gehen zusammen','p.halveCat':'{n} Unterschied · die Katze wiegt {w}','p.halvePin':'{n} Unterschied · der gestrichelte bleibt','p.halvePinned':'Dieser Strang ist festgesteckt','halve.least':'Züge {m} · Minimum {p}','fx.halveExact':'Wenigste Züge!','a.halveCat':'Die Katze, {w} schwer, in Korb 1','a.halvePin':'festgesteckt','a.halveTied':'an einen anderen gebunden'},
]
anchors = re.findall(r"'p\.halve':'[^']*'", s)
assert len(anchors) == 4, anchors
pos = 0
for anc, add in zip(anchors, adds):
    i = s.index(anc, pos); j = i + len(anc)
    ins = ', ' + ', '.join("'%s':'%s'" % kv for kv in add.items())
    s = s[:j] + ins + s[j:]; pos = j + len(ins)
open(p, 'w').write(s)
print('halve applied')
