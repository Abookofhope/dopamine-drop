"""Latch Hook (latch): linked rows, a double hook, one-way rows, least turns. Run from the repo root."""
import sys, re
p = 'site/app.html'; s = open(p).read()
VER = sys.argv[1] if len(sys.argv) > 1 else '0.182.0'
a = s.index("  latch: {\n    name:'Latch Hook'")
b0 = s.index("    build(ctx){", a)
e = s.index("\n  },\n\n  /* ── Splice", a)
build = r"""    /* Since __VER__ the rows stop being strangers, one rule at a time. From level 6 a row can be linked to the one below it: turn
       it and the one below turns too (the same way, or from level 12 the other way). From 12 one row has two hooks, and either can
       be the one that lines up. From 20 a row has a ratchet and turns only one way. The least turns is worked out exactly, so a
       round finished in that many pays extra. */
    build(ctx){
      /* A lock, taken apart. Braid reorders a set and Weave flips one; this
         turns rows past each other until they agree, and it does not care WHICH
         column they agree on — which is the whole puzzle, because the cheapest
         column to meet in is rarely the one any single row is already at. */
      const lv = ctx.level;
      /* Six rows do not fit a short phone's board with the tools under them (320x568): five there. */
      const rows = 4 + Math.min(ctx.surface.getBoundingClientRect().height < 400 ? 1 : 2, Math.floor(lv/8));
      const cols = lv < 6 ? 6 : lv < 16 ? 8 : 10;
      const R = k => Math.floor(ctx.rnd() * k);

      /* link[r]: 0, or +1 / -1, how row r+1 turns when row r does. */
      const link = new Array(rows).fill(0);
      const nLinks = lv >= 12 ? 2 : lv >= 6 ? 1 : 0;
      for (let k = 0, tries = 0; k < nLinks && tries < 20; tries++){
        const r = R(rows - 1);
        if (link[r] || (r > 0 && link[r-1]) || link[r+1]) continue;     /* no chains of three: one turn moves two rows at most */
        link[r] = lv >= 12 && ctx.rnd() < 0.5 ? -1 : 1; k++;
      }
      /* The double hook sits on a row of its own, half way round from its other hook or near it. */
      const twin = lv >= 12 ? R(rows) : -1, twinOff = twin >= 0 ? 2 + R(cols - 3) : 0;
      /* A ratchet row turns one way only: +1 right, -1 left. */
      const rat = new Array(rows).fill(0);
      if (lv >= 20){ const r = R(rows); rat[r] = ctx.rnd() < 0.5 ? 1 : -1; }

      const at = [];
      const home = R(cols);
      for (let r = 0; r < rows; r++) at.push((home + R(cols)) % cols);
      const md = v => ((v % cols) + cols) % cols;
      const notches = r => r === twin ? [at[r], md(at[r] + twinOff)] : [at[r]];
      const lined = () => { for (let c = 0; c < cols; c++) if (at.every((v, r) => notches(r).includes(c))) return true; return false; };
      /* A board that starts solved is not a board. */
      for (let g = 0; lined() && g < 30; g++) at[0] = md(at[0] + 1 + R(cols - 1));

      /* The least turns, exactly. Turning row r by k moves row r+1 by link[r]*k, so working down from the top each row's turn is
         fixed by the column chosen and the turn above it; the only choices are the column and, on the twin row, which hook. */
      const cost = (r, k) => rat[r] > 0 ? md(k) : rat[r] < 0 ? md(-k) : Math.min(md(k), md(-k));
      const plan = c => {
        let best = null;
        for (const h of (twin >= 0 ? [0, twinOff] : [0])){
          let sum = 0, carry = 0; const ks = [];
          for (let r = 0; r < rows; r++){
            const from = md(at[r] + carry + (r === twin ? h : 0));
            let k = md(c - from);
            if (!rat[r] && md(-k) < k) k = -md(-k);
            else if (rat[r] < 0) k = -md(-k);
            ks.push(k); sum += cost(r, k);
            carry = link[r] * k;
          }
          if (!best || sum < best.sum) best = { sum, ks, c };
        }
        return best;
      };
      let least = Infinity, meetAt = 0;
      for (let c = 0; c < cols; c++){ const q = plan(c); if (q.sum < least){ least = q.sum; meetAt = c; } }

      const wrap = mk('div','ltcwrap');
      ctx.surface.appendChild(wrap);

      const budget = moveBudget(ctx, least);
      let done = false, used = 0;
      /* Every turn can be taken back, and the move comes back with it. */
      const history = [];
      let hints = 2;
      const teach = rat.some(Boolean) ? 'p.latchRat' : twin >= 0 ? 'p.latchTwin' : nLinks ? 'p.latchLink' : '';

      const rowEls = [];
      const turn = (r, k) => {
        history.push({ prev: at.slice(), used });
        at[r] = md(at[r] + k);
        if (link[r]) at[r+1] = md(at[r+1] + link[r] * k);
        used += Math.abs(k);
        sfx.tap(); buzz('tap'); paint();
        const lead = rowEls[r].strip;
        if (lined()){ finish(lead); return true; }
        return false;
      };
      const finish = node => {
        done = true; paintTools();
        wrap.classList.add('good');
        if (used <= least){
          wrap.classList.add('exact'); par.classList.add('made');
          ctx.points(20 + Math.min(40, lv*2), wrap);
          floatPts(node, t('fx.latchExact'), 3);
        }
        ctx.win(node);
      };
      const nope = (r, btn) => {
        const row = rowEls[r].row; row.classList.add('nope'); sfx.tap(); ctx.prompt(t('p.latchRatNo'));
        ctx.after(320, () => row.classList.remove('nope'));
      };
      for (let r = 0; r < rows; r++){
        const row = mk('div','ltcrow');
        const left = mk('button','ltcturn');
        left.type = 'button';
        left.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
        const strip = mk('div','ltcstrip');
        strip.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
        strip.setAttribute('role','img');
        const right = mk('button','ltcturn');
        right.type = 'button';
        right.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
        row.appendChild(left); row.appendChild(strip); row.appendChild(right);
        /* The link to the row below: a short chain between the two strips, crossed when the row below turns the other way. */
        if (link[r]){
          const ch = mk('span','ltclink' + (link[r] < 0 ? ' flip' : ''));
          ch.innerHTML = link[r] > 0
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="1.5" width="8" height="11" rx="4" fill="none" stroke="#FFC53D" stroke-width="2.4"/><rect x="8" y="11.5" width="8" height="11" rx="4" fill="none" stroke="#FFC53D" stroke-width="2.4"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v14l-3-3M7 17l3-3M17 21V7l3 3M17 7l-3 3" fill="none" stroke="#FF7E96" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          row.appendChild(ch); row.classList.add('linked');
        }
        if (rat[r]){ row.classList.add('ratchet'); (rat[r] > 0 ? left : right).classList.add('stuck'); (rat[r] > 0 ? left : right).setAttribute('aria-disabled', 'true'); }
        if (r === twin) row.classList.add('twin');
        wrap.appendChild(row);
        const cells = [];
        for (let c = 0; c < cols; c++){ const e2 = mk('i','ltccell'); strip.appendChild(e2); cells.push(e2); }
        rowEls.push({ row, strip, cells, left, right });
        /* Or take hold of the row and slide it: every cell's width is one turn, and however far you take it is one move. */
        strip.style.touchAction = 'none';
        let grip = null;
        strip.addEventListener('pointerdown', ev => {
          if (done || ev.button || grip) return;
          grip = { id: ev.pointerId, x0: ev.clientX, w: strip.getBoundingClientRect().width / cols, steps: 0 };
          try { strip.setPointerCapture(ev.pointerId); } catch (e2) {}
        });
        strip.addEventListener('pointermove', ev => {
          if (!grip || ev.pointerId !== grip.id) return;
          let st = Math.round((ev.clientX - grip.x0) / grip.w);
          if (rat[r] && Math.sign(st) === -rat[r]) st = 0;          /* a ratchet will not go back, not even a little */
          if (st === grip.steps) return;
          grip.steps = st;
          cells.forEach((e2, c) => e2.classList.toggle('notch', c === md(at[r] + st) || (r === twin && c === md(at[r] + st + twinOff))));
        });
        const release = ev => {
          if (!grip || (ev && ev.pointerId !== grip.id)) return;
          const g2 = grip; grip = null;
          try { strip.releasePointerCapture(g2.id); } catch (e2) {}
          if (md(g2.steps) === 0){ paint(); return; }
          if (turn(r, g2.steps)) return;
          budget.spend(strip); paintTools();
        };
        strip.addEventListener('pointerup', release);
        strip.addEventListener('pointercancel', ev => { if (grip) grip.steps = 0; release(ev); });
        [[left, -1], [right, 1]].forEach(([btn, dir]) => {
          btn.setAttribute('aria-label', t(dir < 0 ? 'latch.left' : 'latch.right', { n: r + 1 }));
          onTap(btn, () => {
            if (done) return;
            if (rat[r] && dir !== rat[r]) return nope(r, btn);
            if (turn(r, dir)) return;
            budget.spend(btn); paintTools();
          });
        });
      }

      const tools = mk('div','sumtools'), undo = mk('button','sumtool'), hint = mk('button','sumtool'), par = mk('div','parchip');
      undo.type = 'button'; hint.type = 'button'; undo.style.marginRight = '10px';
      tools.appendChild(par); tools.appendChild(undo); tools.appendChild(hint); wrap.appendChild(tools);
      const paintTools = () => {
        undo.textContent = t('latch.undo'); undo.disabled = done || !history.length;
        hint.textContent = t('latch.hint') + ' ' + hints; hint.disabled = done || hints <= 0;
        par.textContent = t('latch.least', { m: used, p: least }); par.classList.toggle('over', used > least);
      };
      undo.classList.add('aid'); onTap(undo, () => {
        const h = history.pop(); if (done || !h) return;
        h.prev.forEach((v, r) => { at[r] = v; }); used = h.used;
        sfx.tap(); buzz('tap'); budget.refund(); paint(); paintTools();
      });
      /* A hint marks the column that is cheapest to meet in from where the rows are now, for a moment. */
      hint.classList.add('aid'); onTap(hint, () => {
        if (done || hints <= 0) return;
        hints--; sfx.tap(); paintTools();
        let c0 = 0, q0 = plan(0);
        for (let c = 1; c < cols; c++){ const q = plan(c); if (q.sum < q0.sum){ q0 = q; c0 = c; } }
        rowEls.forEach(re => re.cells[c0].classList.add('meet'));
        ctx.prompt(t('latch.meet'));
        ctx.after(2800, () => { rowEls.forEach(re => re.cells[c0].classList.remove('meet')); if (!done) paint(); });
      });

      const paint = () => {
        const agree = lined();
        rowEls.forEach((re, r) => {
          const ns = notches(r);
          re.cells.forEach((e2, c) => e2.classList.toggle('notch', ns.includes(c)));
          re.strip.setAttribute('aria-label', t('latch.row', { n: r + 1, c: ns.map(v => v + 1).join(' / ') }));
          re.row.classList.toggle('lined', agree);
        });
        /* How many rows are already on the best column to meet at — the number
           that actually tells you whether the last turn helped. */
        let best = 0;
        for (let c = 0; c < cols; c++)
          best = Math.max(best, at.reduce((n, a2, r) => n + (notches(r).includes(c) ? 1 : 0), 0));
        /* The newest rule rides on the count until the first turn: taught in the prompt, never in a tutorial. */
        ctx.prompt(t(teach && !history.length ? teach : 'p.latch', { n: rows - best }));
        wrap.dataset.lv = lv; wrap.dataset.least = least; wrap.dataset.used = used; wrap.dataset.meet = meetAt;
        wrap.dataset.link = link.join(','); wrap.dataset.rat = rat.join(','); wrap.dataset.twin = twin; wrap.dataset.off = twinOff;
      };
      wrap._plan = () => { let q0 = plan(0); for (let c = 1; c < cols; c++){ const q = plan(c); if (q.sum < q0.sum) q0 = q; } return q0; };
      paint(); paintTools();
    }""".replace('__VER__', VER)
s = s[:b0] + build + s[e:]

css_old = ".ltcwrap > .sumtools{margin-top:2px}\n"
assert s.count(css_old) == 1
css_new = css_old + """/* Latch Hook's own rules (__VER__): a link to the row below, a double hook, a ratchet row, and the least turns. */
.ltcrow{position:relative}
.ltclink{position:absolute;left:50%;bottom:-13px;width:18px;height:18px;margin-left:-9px;z-index:2;pointer-events:none;
  border-radius:50%;background:var(--ink-2);box-shadow:0 0 0 2px var(--ink-2)}
.ltclink svg{display:block;width:100%;height:100%}
.ltcrow.twin .ltcstrip{border-color:#ffc53d66}
.ltcrow.twin .ltccell.notch{background:#FFC53D;box-shadow:0 0 12px #ffc53d66}
.ltcrow.ratchet .ltcstrip{border-style:dashed;border-color:#ff7e9688}
.ltcturn.stuck{opacity:.28;border-style:dashed;cursor:not-allowed}
html[data-motion="on"] .ltcrow.nope .ltcstrip{animation:ltcNope .3s ease-in-out}
@keyframes ltcNope{0%,100%{transform:none}30%{transform:translateX(-5px)}70%{transform:translateX(5px)}}
.ltcwrap .parchip{margin-right:10px}
html[data-motion="on"] .ltcwrap.exact .ltccell.notch{animation:arcWeave .7s ease-out}
""".replace('__VER__', VER)
s = s.replace(css_old, css_new)

adds = [
 {'p.latchLink':'{n} off · a chained row turns the one below','p.latchTwin':'{n} off · the gold row has two hooks','p.latchRat':'{n} off · the dashed row turns one way','p.latchRatNo':'That row only turns the other way','latch.least':'Turns {m} · Least {p}','fx.latchExact':'Least turns!'},
 {'p.latchLink':'{n} décalés · un rang enchaîné tourne celui du dessous','p.latchTwin':'{n} décalés · le rang doré a deux crochets','p.latchRat':'{n} décalés · le rang pointillé tourne dans un sens','p.latchRatNo':'Ce rang ne tourne que dans l’autre sens','latch.least':'Tours {m} · Mini {p}','fx.latchExact':'Le moins de tours !'},
 {'p.latchLink':'{n} fuera · una fila encadenada gira la de abajo','p.latchTwin':'{n} fuera · la fila dorada tiene dos ganchos','p.latchRat':'{n} fuera · la fila punteada gira en un sentido','p.latchRatNo':'Esa fila solo gira al otro lado','latch.least':'Giros {m} · Mínimo {p}','fx.latchExact':'¡Mínimo de giros!'},
 {'p.latchLink':'{n} daneben · eine verkettete Reihe dreht die darunter','p.latchTwin':'{n} daneben · die goldene Reihe hat zwei Haken','p.latchRat':'{n} daneben · die gestrichelte Reihe dreht nur in eine Richtung','p.latchRatNo':'Diese Reihe dreht nur andersherum','latch.least':'Drehungen {m} · Minimum {p}','fx.latchExact':'Wenigste Drehungen!'},
]
anchors = re.findall(r"'p\.latch':'[^']*'", s)
assert len(anchors) == 4, anchors
pos = 0
for anc, add in zip(anchors, adds):
    i = s.index(anc, pos); j = i + len(anc)
    ins = ', ' + ', '.join("'%s':'%s'" % kv for kv in add.items())
    s = s[:j] + ins + s[j:]; pos = j + len(ins)
open(p, 'w').write(s)
print('latch applied')
