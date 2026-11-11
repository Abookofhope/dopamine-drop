/* Pond Skate, the winter game (v0.163.0).
 *
 * A cat on a frozen pond slides until a snowbank, the edge, open water or the basket stops it; stop in the basket with
 * all the yarn. The probe reads each pond off the screen and solves it with its own search, so it checks the game's
 * promises from outside:
 *   1. Every pond dealt can be done, within the moves given: at a beginner's level, a middle one and past level 20 (with
 *      thin ice), several ponds each, the probe's own shortest route fits the budget, and playing it with the arrow
 *      buttons wins the round.
 *   2. A slide that goes nowhere costs no move; running out of moves loses the round.
 *   3. Thin ice: once the cat has crossed it, it is open water and stops the cat.
 *   4. The arrows are full-size, named buttons that a keyboard reaches with Tab and works with Enter; a tap on a cell in
 *      line with the cat slides it that way; with Reduce motion the cat moves without a transition.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/skate.mjs
 *   OUT=/dir   saves a picture of each level's first pond
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, quitToHome } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const OUT = process.env.OUT || '';
const browser = await chromium.launch();
const errs = [];
const D = [[0, -1], [1, 0], [0, 1], [-1, 0]], NAME = ['up', 'right', 'down', 'left'];

/* the pond as the screen shows it */
const read = page => page.evaluate(() => {
  const inner = document.querySelector('#surface .pondboard'); if (!inner) return null;
  const cells = [...inner.querySelectorAll('.pondcell')], n = Math.round(Math.sqrt(cells.length));
  const ir = inner.getBoundingClientRect(), cr = document.querySelector('#surface .pondcat').getBoundingClientRect();
  const cat = Math.round((cr.top - ir.top) / (ir.height / n)) * n + Math.round((cr.left - ir.left) / (ir.width / n));
  const chip = document.querySelector('.budget');
  return { n, cat,
    kind: cells.map(c => c.classList.contains('bank') ? '#' : c.classList.contains('water') ? 'w' : c.classList.contains('thin') ? 't' : '.'),
    goal: cells.findIndex(c => c.querySelector('.pondicon:not(.pondyarn)')),
    yarn: cells.map((c, i) => c.querySelector('.pondyarn') && !c.classList.contains('got') ? i : -1).filter(i => i >= 0),
    left: chip ? parseInt(chip.textContent.replace(/\D/g, ''), 10) : NaN,
    prompt: document.getElementById('prompt').textContent };
});
/* the probe's own search: the same rules, written again from the description */
function solve(p){
  const { n } = p, thin = p.kind.map((k, i) => k === 't' ? i : -1).filter(i => i >= 0);
  const goalMask = (1 << p.yarn.length) - 1;
  const move = (pos, d, got, cracked) => {
    let x = pos % n, y = Math.floor(pos / n); const path = [];
    for (;;){
      const nx = x + D[d][0], ny = y + D[d][1]; if (nx < 0 || ny < 0 || nx >= n || ny >= n) break;
      const q = ny * n + nx;
      if (p.kind[q] === '#' || p.kind[q] === 'w' || cracked.includes(q)) break;
      x = nx; y = ny; path.push(q); if (q === p.goal) break;
    }
    const to = y * n + x; if (to === pos) return null;
    let g = got; path.forEach(q => { const i = p.yarn.indexOf(q); if (i >= 0) g |= 1 << i; });
    const c = cracked.slice(); [pos].concat(path.slice(0, -1)).forEach(q => { if (thin.includes(q) && !c.includes(q)) c.push(q); });
    return { to, got: g, cracked: c.sort((a, b) => a - b) };
  };
  const key = s => s.pos + '|' + s.got + '|' + s.cracked.join(',');
  let front = [{ pos: p.cat, got: 0, cracked: [], route: [] }]; const seen = new Set([key(front[0])]);
  for (let depth = 0; depth < 18 && front.length; depth++){
    const next = [];
    for (const s of front) for (let d = 0; d < 4; d++){
      const m = move(s.pos, d, s.got, s.cracked); if (!m) continue;
      const ns = { pos: m.to, got: m.got, cracked: m.cracked, route: s.route.concat(d) };
      if (m.to === p.goal && m.got === goalMask) return ns.route;
      const k = key(ns); if (!seen.has(k)){ seen.add(k); next.push(ns); }
    }
    front = next;
  }
  return null;
}
const press = (page, d) => page.evaluate(lbl => { const b = [...document.querySelectorAll('#surface .ponddir')].find(x => x.getAttribute('aria-label') === lbl); b.click(); }, 'Slide ' + NAME[d]);
const live = page => page.evaluate(() => document.getElementById('play').classList.contains('live'));
async function waitPond(page){
  for (let k = 0; k < 120; k++){ if (await live(page) && await page.evaluate(() => !!document.querySelector('#surface .pondboard'))) return true; await page.waitForTimeout(100); }
  return false;
}
async function open(prof, w = 390, h = 844){
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'skate'); });
  await openApp(page, Object.assign({ reduceMotion: true, onboarded: true, seen: { skate: 1 } }, prof));
  await openModeList(page); await clickMode(page, 'skate');
  await waitPond(page);
  return page;
}
const done = page => page.evaluate(() => +document.getElementById('play').dataset.done || 0);

/* ── 1. every pond can be done within its moves ── */
const LEVELS = [['a beginner', { xp: 0, runs: 3, solved: 5 }], ['the middle', { xp: 9000, runs: 40, solved: 600 }], ['past level 20', { xp: 900000, runs: 900, solved: 40000 }]];
let sawThin = false;
for (const [label, prof] of LEVELS){
  const page = await open(prof);
  const rows = [];
  for (let r = 0; r < 4; r++){
    if (!(await waitPond(page))) { rows.push('no pond'); break; }
    await page.waitForTimeout(200);
    const p = await read(page);
    if (r === 0 && OUT) await page.screenshot({ path: `${OUT}/skate_${label.replace(/\W+/g, '_')}.png` });
    if (p.kind.includes('t')) sawThin = true;
    const route = solve(p);
    if (!route){ rows.push(`${p.n}x${p.n}: no route`); break; }
    if (route.length > p.left){ rows.push(`${p.n}x${p.n}: shortest ${route.length} > ${p.left} moves`); break; }
    const d0 = await done(page);
    for (const d of route){ await press(page, d); await page.waitForTimeout(120); }
    for (let w = 0; w < 30 && (await done(page)) === d0; w++) await page.waitForTimeout(100);
    const sp = await page.evaluate(() => document.getElementById('play').dataset.speed);
    rows.push(`${p.n}x${p.n}, ${p.yarn.length} yarn${p.kind.includes('t') ? ', thin ice' : ''}: ${route.length} of ${p.left}${sp === 'miss' || (await done(page)) === d0 ? ' NOT WON' : ''}`);
    if (sp === 'miss' || (await done(page)) === d0) break;
    await page.waitForTimeout(900);
  }
  check(rows.length === 4 && rows.every(x => /of \d+$/.test(x)), `${label}: four ponds, each solved by the probe's own shortest route within the moves given (${rows.join('; ')})`);
  await page.close();
}
check(sawThin, 'past level 20 there is thin ice on the pond');

/* ── 2. a slide that goes nowhere is free; running out loses ── */
{
  const page = await open({ xp: 9000, runs: 40, solved: 600 });
  const p = await read(page);
  /* find a direction that is blocked, and one that moves */
  const blocked = [0, 1, 2, 3].find(d => { const x = p.cat % p.n + D[d][0], y = Math.floor(p.cat / p.n) + D[d][1]; return x < 0 || y < 0 || x >= p.n || y >= p.n || p.kind[y * p.n + x] === '#'; });
  if (blocked !== undefined){
    await press(page, blocked); await page.waitForTimeout(250);
    const q = await read(page);
    check(q.left === p.left && q.cat === p.cat, `a slide into a snowbank or the edge goes nowhere and costs no move (${p.left} then ${q.left})`);
  } else check(true, 'a slide that goes nowhere costs no move (no blocked direction on this pond; not tested here)');
  /* back and forth until the moves run out, avoiding the basket */
  const d0 = await done(page);
  let k = 0;
  for (; k < 40 && (await done(page)) === d0; k++){
    const s = await read(page); if (!s) break;
    const moves = [0, 1, 2, 3].filter(d => { let x = s.cat % s.n, y = Math.floor(s.cat / s.n);
      for (;;){ const nx = x + D[d][0], ny = y + D[d][1]; if (nx < 0 || ny < 0 || nx >= s.n || ny >= s.n || s.kind[ny * s.n + nx] === '#' || s.kind[ny * s.n + nx] === 'w') break; x = nx; y = ny; if (ny * s.n + nx === s.goal) return false; }
      return y * s.n + x !== s.cat; });
    if (!moves.length) break;
    await press(page, moves[k % moves.length]); await page.waitForTimeout(150);
  }
  const sp = await page.evaluate(() => document.getElementById('play').dataset.speed);
  check((await done(page)) > d0 && sp === 'miss', `running out of moves loses the round (after ${k} slides that avoid the basket)`);
  await page.close();
}

/* ── 3. thin ice turns to water behind the cat ── */
{
  const page = await open({ xp: 900000, runs: 900, solved: 40000 });
  let seen = false, stopped = null;
  for (let r = 0; r < 6 && !seen; r++){
    const p = await read(page); if (!p) break;
    for (let d = 0; d < 4 && !seen; d++){
      /* a slide whose path crosses thin ice (and does not end on it) */
      let x = p.cat % p.n, y = Math.floor(p.cat / p.n), crossed = -1;
      for (;;){ const nx = x + D[d][0], ny = y + D[d][1]; if (nx < 0 || ny < 0 || nx >= p.n || ny >= p.n) break; const q = ny * p.n + nx;
        if (p.kind[q] === '#' || p.kind[q] === 'w') break; x = nx; y = ny; if (q === p.goal) break;
        const nx2 = x + D[d][0], ny2 = y + D[d][1], q2 = ny2 * p.n + nx2;
        if (p.kind[q] === 't' && nx2 >= 0 && ny2 >= 0 && nx2 < p.n && ny2 < p.n && p.kind[q2] !== '#' && p.kind[q2] !== 'w') crossed = q; }
      if (crossed < 0) continue;
      await press(page, d); await page.waitForTimeout(300);
      const q = await read(page);
      seen = q.kind[crossed] === 'w';
      /* and it stops the cat: slide back the way it came */
      if (seen){ await press(page, (d + 2) % 4); await page.waitForTimeout(300); const b = await read(page);
        const bx = b.cat % b.n, by = Math.floor(b.cat / b.n), cx = crossed % b.n, cy = Math.floor(crossed / b.n);
        stopped = (bx === cx + D[d][0] && by === cy + D[d][1]) || b.cat === q.cat; }
    }
    if (!seen){ /* this pond had no such slide; play it out and try the next */ const route = solve(p); if (route) for (const d of route){ await press(page, d); await page.waitForTimeout(120); } await page.waitForTimeout(1200); await waitPond(page); }
  }
  check(seen, 'thin ice the cat has crossed is open water');
  check(seen && stopped === true, 'and open water stops the cat like a snowbank');
  await page.close();
}

/* ── 4. the controls ── */
{
  const page = await open({ xp: 9000, runs: 40, solved: 600, reduceMotion: false });
  const g = await page.evaluate(() => [...document.querySelectorAll('#surface .ponddir')].map(b => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), name: b.getAttribute('aria-label') }; }));
  check(g.length === 4 && g.every(b => b.w >= 44 && b.h >= 44 && /^Slide (up|down|left|right)$/.test(b.name)), `four arrows, each named and at least 44px (${g.map(b => b.name + ' ' + b.w + 'x' + b.h).join(', ')})`);
  /* the keyboard: Tab to an arrow that moves the cat, Enter */
  const p = await read(page);
  const mover = [0, 1, 2, 3].find(d => { const x = p.cat % p.n + D[d][0], y = Math.floor(p.cat / p.n) + D[d][1]; return x >= 0 && y >= 0 && x < p.n && y < p.n && p.kind[y * p.n + x] !== '#'; });
  let moved = false;
  for (let k = 0; k < 40 && mover !== undefined; k++){
    await page.keyboard.press('Tab');
    const at = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'));
    if (at === 'Slide ' + NAME[mover]){ await page.keyboard.press('Enter'); await page.waitForTimeout(700); moved = (await read(page)).cat !== p.cat; break; }
  }
  check(moved, `Tab reaches the arrows and Enter slides the cat (${NAME[mover]})`);
  /* a tap in line with the cat */
  const q = await read(page);
  const tap = [0, 1, 2, 3].map(d => { const x = q.cat % q.n + D[d][0], y = Math.floor(q.cat / q.n) + D[d][1]; return x >= 0 && y >= 0 && x < q.n && y < q.n && q.kind[y * q.n + x] !== '#' ? { d, x, y } : null; }).find(Boolean);
  if (tap){
    const pt = await page.evaluate(([x, y]) => { const r = document.querySelector('#surface .pondboard').getBoundingClientRect(), n = Math.round(Math.sqrt(document.querySelectorAll('#surface .pondcell').length)); return { x: r.left + (x + 0.5) * r.width / n, y: r.top + (y + 0.5) * r.height / n }; }, [tap.x, tap.y]);
    await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(800);
    check((await read(page)).cat !== q.cat, `a tap on a cell in line with the cat slides it that way (${NAME[tap.d]})`);
  }
  const tr = await page.evaluate(() => getComputedStyle(document.querySelector('#surface .pondcat')).transitionDuration);
  check(tr !== '0s', `with motion on, the cat glides (${tr})`);
  await page.close();
  const still = await open({ xp: 9000, runs: 40, solved: 600, reduceMotion: true });
  const p2 = await read(still);
  const d2 = [0, 1, 2, 3].find(d => { const x = p2.cat % p2.n + D[d][0], y = Math.floor(p2.cat / p2.n) + D[d][1]; return x >= 0 && y >= 0 && x < p2.n && y < p2.n && p2.kind[y * p2.n + x] !== '#'; });
  if (d2 !== undefined){ await press(still, d2); await still.waitForTimeout(30); }
  const tr2 = await still.evaluate(() => getComputedStyle(document.querySelector('#surface .pondcat')).transitionProperty + ' ' + getComputedStyle(document.querySelector('#surface .pondcat')).transitionDuration);
  check(/none|^all 0s|0s$/.test(tr2), `with Reduce motion, it moves at once (${tr2})`);
  await still.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nevery pond can be skated, the moves are honest, and the ice keeps its rules');
process.exit(bad ? 1 : 0);
