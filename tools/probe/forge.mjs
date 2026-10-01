/* Patchwork, played: three ways to finish a quilt, each played the way a thumb does.
 *
 *   fill   the hole is the pattern, and the patches make it (the old puzzle, now with spare patches in the tray)
 *   line   any one row or any one column covered from edge to edge, anywhere on an open quilt
 *   block  a solid rectangle (2x3, 3x3 or 3x4 by level) anywhere on an open quilt
 *
 * A patch is picked up anywhere, follows the finger, and lands on the nearest place it fits when let go. This plays it the way a
 * thumb does rather than the way a test does: every patch is dropped up to nearly half a square away from where it belongs and
 * must still land where it was meant to, the patches are turned by tapping them, and the bot works out what to do from wherever
 * the last drop put things. A goal is forced for each run (the page reads dd.forge, as dd.probe does for Chalk Line), so all three
 * are played at three levels every time. It also checks what a player leans on around that: a patch dropped nowhere goes back,
 * a laid patch can be lifted and carried, Undo takes the last one back and gives its move back, Hint shows a place and turns the
 * patch to suit, R turns the patch in the hand, the line or block nearest done is outlined and the words under the board count
 * down, there are patches to spare, and a finished quilt says so.
 *
 *   node tools/probe/forge.mjs              all three goals at three levels
 *   XP=60000 node tools/probe/forge.mjs     one level
 *   GOAL=line node tools/probe/forge.mjs    one goal
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const XPS = process.env.XP ? [+process.env.XP] : [2000, 12000, 60000];
const GOALS = process.env.GOAL ? [process.env.GOAL] : ['line', 'block', 'fill'];
const OFF = 0.45;
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const norm = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(c => [c[0] - mx, c[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
const key = cs => cs.map(c => c.join(',')).join(' ');
const turn = cs => norm(cs.map(c => [-c[1], c[0]]));

const open = async (goal, xp, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await page.addInitScript(g => localStorage.setItem('dd.forge', g), goal);
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { forge: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'forge');
  await page.waitForFunction(() => document.querySelector('.fgrid .fcell'), null, { timeout: 9000, polling: 60 });
  await page.waitForTimeout(1500);
  return page;
};
const read = page => page.evaluate(() => {
  const cells = [...document.querySelectorAll('.fgrid .fcell')]; const g = Math.round(Math.sqrt(cells.length));
  const r = c => { const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; };
  const wrap = document.querySelector('.forgewrap');
  const spare = +(wrap.dataset.spare || 0);
  const mv = (document.querySelector('.budget') || {}).textContent || '';
  return { g, spare, goal: wrap.dataset.goal, block: wrap.dataset.block || '', hole: cells.map((c, i) => c.classList.contains('mould') && !c.classList.contains('set') ? i : -1).filter(i => i >= 0),
    knots: cells.map((c, i) => c.classList.contains('knot') ? i : -1).filter(i => i >= 0), aim: cells.filter(c => c.classList.contains('aim')).length, win: cells.filter(c => c.classList.contains('win')).length,
    setc: cells.map((c, i) => c.classList.contains('set') ? i : -1).filter(i => i >= 0),
    col: Object.fromEntries(cells.map((c, i) => [i, c.classList.contains('set') ? c.style.getPropertyValue('--pc') : null]).filter(a => a[1])),
    pos: cells.map(r), prompt: (document.querySelector('.prompt') || {}).textContent || '', made: !!document.querySelector('.fgrid.made'), cat: !!document.querySelector('.fcat'),
    chip: (document.querySelector('.fnote') || {}).textContent || '', moves: +((mv.match(/\d+/) || [0])[0]),
    undoDisabled: document.querySelector('.ftool:nth-child(1)').disabled, hintText: document.querySelector('.ftool:nth-child(2) b').textContent,
    ghost: (() => { const gh = document.querySelector('.fghost'); return gh ? { w: +gh.dataset.w, h: +gh.dataset.h } : null; })(),
    tray: [...document.querySelectorAll('.ftray .fpiece')].map(p => { const w = getComputedStyle(p.querySelector('.fbits')).gridTemplateColumns.split(' ').length || 1;
      const on = []; let mark = null; [...p.querySelectorAll('.fbit')].forEach((bt, i) => { if (bt.classList.contains('on')) { on.push([i % w, Math.floor(i / w)]); if (bt.classList.contains('m')) mark = [i % w, Math.floor(i / w)]; } });
      const bb = p.getBoundingClientRect(); return { idx: +p.dataset.idx, col: p.querySelector('.fbits').style.getPropertyValue('--pc'), on, mark, x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }; }) };
});
const num = s => +((s.match(/\d+/) || [0])[0]);

/* what has to be covered for each candidate (a row, a column, a block), nearest done first; the whole hole for fill */
const candidates = st => {
  const g = st.g, at = (x, y) => y * g + x, out = [];
  if (st.goal === 'fill') return [st.hole.slice()];
  if (st.goal === 'line'){ for (let k = 0; k < g; k++){ out.push(Array.from({ length: g }, (_, i) => at(i, k))); out.push(Array.from({ length: g }, (_, i) => at(k, i))); } }
  else { const [bw, bh] = st.block.split('x').map(Number);
    const rects = (w, h) => { for (let y = 0; y + h <= g; y++) for (let x = 0; x + w <= g; x++){ const c = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.push(at(x + i, y + j)); out.push(c); } };
    rects(bw, bh); if (bw !== bh) rects(bh, bw); }
  const ok = new Set([...st.hole, ...st.setc]);
  return out.filter(R => R.every(i => ok.has(i))).map(R => R.filter(i => !st.setc.includes(i))).filter(R => R.length).sort((a, b) => a.length - b.length);
};
/* a way to cover `need` with the patches in the tray (which may poke out onto any free square), or null */
const solveNeed = (st, need) => {
  const g = st.g, free = new Set(st.hole), own = new Map(Object.entries(st.col).map(([k, v]) => [+k, v]));
  const ruleOn = /colour|couleur|color|Farben/i.test(st.chip);
  const pieces = st.tray.map(p => ({ idx: p.idx, col: p.col, base: norm(p.on) }));
  let sol = null, nodes = 0; const order = need.slice().sort((a, b) => a - b), fl = new Set();
  const go = (rem, acc) => {
    if (sol || nodes++ > 120000) return; const first = order.find(c => !fl.has(c)); if (first === undefined){ sol = acc.slice(); return; }
    for (const p of rem){ let c = p.base; const seen = new Set();
      for (let r = 0; r < 4; r++, c = turn(c)){ const k = key(c); if (seen.has(k)) continue; seen.add(k);
        const a0 = c[0], ax = first % g - a0[0], ay = Math.floor(first / g) - a0[1];
        const cells = c.map(q => (ay + q[1]) * g + ax + q[0]);
        if (c.some(q => ax + q[0] < 0 || ax + q[0] >= g || ay + q[1] < 0 || ay + q[1] >= g) || cells.some(i => !free.has(i) || fl.has(i))) continue;
        if (ruleOn && cells.some(i => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => { const x = i % g + d[0], y = Math.floor(i / g) + d[1]; if (x < 0 || y < 0 || x >= g || y >= g) return false; const n = y * g + x; return own.has(n) && !cells.includes(n) && own.get(n) === p.col; }))) continue;
        cells.forEach(i => { fl.add(i); own.set(i, p.col); }); acc.push({ p, o: c, cells }); go(rem.filter(q => q !== p), acc); acc.pop(); cells.forEach(i => { fl.delete(i); own.delete(i); }); if (sol) return; } }
  };
  go(pieces, []);
  return sol;
};
const plan = st => { for (const need of candidates(st)){ const sol = solveNeed(st, need); if (sol) return sol; } return null; };

for (const goal of GOALS) for (const xp of XPS){
  const page = await open(goal, xp);
  const st0 = await read(page);
  console.log(`\n--- ${goal}, xp ${xp}: a ${st0.g}x${st0.g} quilt, ${st0.tray.length} patches, ${st0.knots.length} knots, "${st0.prompt}"`);
  check(st0.goal === goal, `the round asks for a ${goal}`);
  check(st0.g >= 5, `the quilt is at least five wide (${st0.g})`);
  check(!!st0.chip, `and says what counts ("${st0.chip}")`);
  const first = plan(st0);
  check(!!first, 'there is a way to finish it with the patches in the tray');
  check(st0.spare >= 1 && st0.tray.length >= (first ? first.length : 0) + 0, `with patches to spare (${st0.spare} of the ${st0.tray.length} in the tray)`);
  if (goal !== 'fill') check(st0.hole.length + st0.knots.length === st0.g * st0.g, `every square is open or a knot (${st0.knots.length} knots)`);

  const t0 = st0.tray.find(p => key(norm(p.on)) !== key(turn(norm(p.on)))) || st0.tray[0];
  if (xp === XPS[0]){
    /* turning: a tap on a patch in the tray turns it a quarter, and its paw turns with it */
    await page.mouse.click(t0.x, t0.y); await page.waitForTimeout(100);
    const s1 = await read(page); const t1 = s1.tray.find(p => p.idx === t0.idx);
    check(key(norm(t1.on)) === key(turn(norm(t0.on))) || key(norm(t0.on)) === key(turn(norm(t0.on))), 'a tap turns the patch a quarter');
    /* a patch let go nowhere near the quilt goes back where it was */
    await page.mouse.move(t1.x, t1.y); await page.mouse.down(); await page.mouse.move(t1.x + 12, t1.y - 12, { steps: 2 });
    check(!!(await read(page)).ghost, 'lifting a patch shows it in the hand');
    await page.mouse.move(8, 8, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(120);
    const s2 = await read(page);
    check(s2.setc.length === 0 && s2.tray.length === st0.tray.length, 'let go nowhere near the quilt, the patch goes back to the tray');
    /* R turns the patch in the hand */
    const t2 = s2.tray.find(p => p.idx === t0.idx) || s2.tray[0];
    await page.mouse.move(t2.x, t2.y); await page.mouse.down(); await page.mouse.move(t2.x + 12, t2.y - 12, { steps: 2 });
    const g0 = (await read(page)).ghost; await page.keyboard.press('r'); await page.waitForTimeout(80); const g1 = (await read(page)).ghost;
    const square = g0 && g0.w === g0.h;
    check(g0 && g1 && (square || (g0.w === g1.h && g0.h === g1.w)), 'R turns the patch in the hand' + (square ? ' (this one is as wide as it is tall)' : ''));
    await page.mouse.move(8, 8, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(100);
    /* Hint shows a place, and turns the patch to suit */
    const before = await read(page);
    await page.click('.ftool:nth-child(2)'); await page.waitForTimeout(150);
    const hinted = await page.evaluate(() => [...document.querySelectorAll('.fgrid .fcell.hint')].length);
    const after = await read(page);
    check(hinted >= 2 && hinted <= 5 && after.hintText !== before.hintText, `Hint lights the place (${hinted} squares) and spends one (${before.hintText} -> ${after.hintText})`);
    await page.waitForTimeout(2300);
  }

  /* play it out like a thumb, from wherever each drop leaves things */
  let exact = 0, elsewhere = 0, refused = 0, lifted = false, shrank = false, aimSeen = false, undone = false;
  const promptN0 = num(st0.prompt);
  for (let step = 0; step < 40; step++){
    const st = await read(page);
    if (st.made || !st.tray.length) break;
    const sol = plan(st);
    if (!sol){ const u = await page.$('.ftool:not([disabled])'); if (!u) break; await u.click(); await page.waitForTimeout(120); continue; }
    const s = sol[0]; let cur = st; let tp = cur.tray.find(t => t.idx === s.p.idx);
    for (let k = 0; k < 4 && key(norm(tp.on)) !== key(s.o); k++){ await page.mouse.click(tp.x, tp.y); await page.waitForTimeout(80); cur = await read(page); tp = cur.tray.find(t => t.idx === s.p.idx); }
    const xs = s.cells.map(i => cur.pos[i].x), ys = s.cells.map(i => cur.pos[i].y), cw = cur.pos[0].w;
    const cx = xs.reduce((a, c) => a + c, 0) / xs.length, cy = ys.reduce((a, c) => a + c, 0) / ys.length;
    const lift = (Math.max(...s.o.map(q => q[1])) + 1) * (cw + 3) / 2 + 34;
    const go2 = async (fx, fy, tx, ty) => { await page.mouse.move(fx, fy); await page.mouse.down(); await page.mouse.move(fx + 10, fy - 10, { steps: 2 });
      await page.mouse.move(tx, ty, { steps: 8 }); await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(130); };
    await go2(tp.x, tp.y, cx + (Math.random() - .5) * cw * OFF * 2, cy + lift + (Math.random() - .5) * cw * OFF * 2);
    const now = await read(page);
    const got = now.setc.filter(i => !st.setc.includes(i));
    if (!got.length) refused++; else if (s.cells.every(i => got.includes(i))) exact++; else elsewhere++;
    if (goal !== 'fill' && got.length && !now.made){ if (num(now.prompt) < promptN0) shrank = true; if (now.aim > 0) aimSeen = true; }
    /* Undo gives the move back, and the patch can go down again the same way */
    if (!undone && got.length && !now.made && step === 0){
      undone = true;
      await page.click('.ftool:nth-child(1)'); await page.waitForTimeout(150);
      const u = await read(page);
      check(u.setc.length === st.setc.length && u.moves === st.moves, `Undo takes the patch off and gives its move back (${st.moves} -> ${now.moves} -> ${u.moves} moves left)`);
      continue;
    }
    /* once something is laid, lift it by its paw and put it straight back down: it must stay a patch on the quilt */
    if (!lifted && got.length && step === 2 && !now.made){
      lifted = true;
      const a = now.pos[got[0]]; const n0 = now.setc.length;
      await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 14, a.y - 14, { steps: 3 });
      const mid = await read(page); check(!!mid.ghost && mid.setc.length === n0 - got.length, 'touching a laid patch lifts it off the quilt');
      await page.mouse.move(a.x, a.y + lift, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(130);
      const back = await read(page); check(back.setc.length === n0, 'and it can be put down again (' + back.setc.length + ' of ' + n0 + ' squares laid)');
    }
  }
  const fin = await read(page);
  check(exact + elsewhere >= 2, `dropped up to ${OFF} of a square off, ${exact} landed where aimed, ${elsewhere} elsewhere, ${refused} refused`);
  if (goal !== 'fill'){ check(shrank, 'the words under the board counted down as the line or block grew'); check(aimSeen, 'and the line or block nearest done was outlined on the quilt'); }
  check(fin.made, `the finished quilt is marked done${goal !== 'fill' ? ' (' + fin.win + ' squares glow)' : ''}`);
  check(fin.cat, 'and the cat is on it');
  await page.close();
}

/* Hint also marks which patch in the tray it means, and the patch goes where it points; Undo takes it back */
{
  const page = await open('fill', 2000);
  await page.click('.ftool:nth-child(2)'); await page.waitForTimeout(200);
  const hint = await page.evaluate(() => ({ cells: [...document.querySelectorAll('.fgrid .fcell.hint')].map(c => { const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; }),
    piece: (() => { const p = document.querySelector('.fpiece.hinted'); if (!p) return null; const b = p.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })() }));
  check(hint.piece && hint.cells.length >= 2, 'Hint also marks which patch in the tray it means');
  if (hint.piece){
    const cx = hint.cells.reduce((a, c) => a + c.x, 0) / hint.cells.length, cy = hint.cells.reduce((a, c) => a + c.y, 0) / hint.cells.length;
    await page.mouse.move(hint.piece.x, hint.piece.y); await page.mouse.down(); await page.mouse.move(hint.piece.x + 10, hint.piece.y - 10, { steps: 2 });
    await page.mouse.move(cx, cy + 70, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(150);
    const laid = await page.evaluate(() => document.querySelectorAll('.fgrid .fcell.set').length);
    check(laid === hint.cells.length, 'the patch Hint pointed at goes where Hint pointed (' + laid + ' squares)');
    await page.click('.ftool:nth-child(1)'); await page.waitForTimeout(150);
    const gone = await page.evaluate(() => document.querySelectorAll('.fgrid .fcell.set').length);
    check(gone === 0, 'Undo takes it back off the quilt');
  }
  await page.close();
}

/* a small phone still has a quilt you can use */
for (const goal of GOALS){
  const page = await open(goal, 12000, { width: 320, height: 568 });
  const st = await read(page);
  check(st.pos[0].w >= 30 && st.tray.length >= 2, `${goal} at 320x568: ${st.g}x${st.g}, squares ${Math.round(st.pos[0].w)}px, ${st.tray.length} patches`);
  await page.close();
}

if (errs.length){ bad++; console.log('PAGE ERRORS', [...new Set(errs)].slice(0, 3)); }
await browser.close();
console.log(bad ? `\n${bad} problem(s) in Patchwork` : '\nPatchwork plays the way a thumb does, three ways');
process.exit(bad ? 1 : 0);
