/* Modes that can be played by picking a piece up and letting go of it, played that way with a real mouse.
 *
 * A tap used to be the only way to move anything. Each mode here keeps its taps and gains a drag: the piece is picked up anywhere,
 * a lifted copy follows the finger while the piece stays in its slot, and letting go over the right place does what tapping it
 * would have. This plays each one with press, move, release, not click.
 *
 *   node tools/probe/drag.mjs
 *   ONLY=sum node tools/probe/drag.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (id, sel, xp = 12000, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(id + ': ' + String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { [id]: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, id);
  await page.waitForSelector(sel, { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const centre = (page, sel, i = 0) => page.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, [sel, i]);
const drag = async (page, a, b, steps = 8) => {
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(a.x + (b.x - a.x) * 0.3, a.y + (b.y - a.y) * 0.3, { steps: 3 });
  const mid = await page.evaluate(() => ({ ghost: !!document.querySelector('.carried'), lifted: !!document.querySelector('.lifted') }));
  await page.mouse.move(b.x, b.y, { steps });
  const over = await page.evaluate(() => !!document.querySelector('.dropover'));
  await page.mouse.up();
  return { mid, over };
};
const resolved = (page, sel) => page.waitForFunction(s => { const e = document.querySelector(s); return !e || e.disabled || !!document.querySelector('.stagepips i.on') || document.querySelector('.over.show, #over.show') || document.getElementById('surface').classList.contains('flash-win') || document.getElementById('surface').classList.contains('flash-bad'); }, sel, { timeout: 3000, polling: 40 }).then(() => true).catch(() => false);

/* ── Stitch Count: a count carried onto its partner ─────────────────────── */
if (!only || only.includes('sum')){
  const page = await open('sum', '.cell.num');
  const info = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.cell.num')].map(c => +c.textContent);
    const tgt = parseInt(document.querySelector('.target b').textContent.replace(/\D/g, ''), 10), diff = !!document.querySelector('.target.diffmode');
    for (let i = 0; i < cells.length; i++) for (let j = 0; j < cells.length; j++) if (i !== j && (diff ? Math.abs(cells[i] - cells[j]) === tgt : cells[i] + cells[j] === tgt)) return { i, j, n: Math.round(Math.sqrt(cells.length)) };
    return null;
  });
  check(info && info.n >= 4, `the grid is at least four wide (${info && info.n})`);
  const a = await centre(page, '.cell.num', info.i), b = await centre(page, '.cell.num', info.j);
  const before = await page.evaluate(() => [...document.querySelectorAll('.cell.num')].map(c => { const r = c.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }).join('|'));
  const r = await drag(page, a, b);
  check(r.mid.ghost && r.mid.lifted, 'picking a count up lifts a copy and leaves the square where it was');
  check(r.over, 'the square under the finger lights up');
  check(await resolved(page, '.cell.num'), 'letting go over the partner wins the round');
  await page.close();
}

/* ── Mirror Stitch: paint across cells with one finger ───────────────────── */
if (!only || only.includes('mirror')){
  const page = await open('mirror', '.cell.mcell', 12000);
  const info = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('#surface .grid > .cell')]; const N = Math.round(Math.sqrt(cells.length));
    const given = []; cells.forEach((c, i) => { if (c.classList.contains('given') && c.classList.contains('on')) given.push(i); });
    return { N, down: !!document.querySelector('.grid.folded.flat'), given };
  });
  check(info.N >= 6, `the fold is at least six squares across (${info.N})`);
  const idxs = await page.evaluate(() => [...document.querySelectorAll('.cell.mcell')].map(c => +c.dataset.idx));
  /* three in a row on the input side */
  let run = null; for (const i of idxs) if (idxs.includes(i + 1) && idxs.includes(i + 2) && (i % info.N) + 2 < info.N){ run = i; break; }
  const at = async i => { const e = await page.evaluate(k => { const c = document.querySelector(`.cell.mcell[data-idx="${k}"]`); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, i); return e; };
  const a = await at(run), z = await at(run + 2);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(z.x, z.y, { steps: 10 }); await page.mouse.up();
  const on3 = await page.evaluate(r => [0, 1, 2].every(k => document.querySelector(`.cell.mcell[data-idx="${r + k}"]`).classList.contains('on')), run);
  check(on3, 'one finger dragged across three cells turns all three on');
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(z.x, z.y, { steps: 10 }); await page.mouse.up();
  const off3 = await page.evaluate(r => [0, 1, 2].every(k => !document.querySelector(`.cell.mcell[data-idx="${r + k}"]`).classList.contains('on')), run);
  check(off3, 'and dragged again from a lit one, turns them off');
  /* a finger moved over cells with nothing held down paints nothing */
  await page.mouse.move(a.x, a.y); await page.mouse.move(z.x, z.y, { steps: 6 });
  check(await page.evaluate(() => !document.querySelector('.cell.mcell.on')), 'moving over cells without pressing paints nothing');
  const wanted = info.given.map(g => { const x = g % info.N, y = Math.floor(g / info.N); const m = info.down ? [x, info.N - 1 - y] : [info.N - 1 - x, y]; return m[1] * info.N + m[0]; });
  for (const w of wanted){ const c = await at(w); await page.mouse.click(c.x, c.y); await page.waitForTimeout(40); }
  check(await resolved(page, '.cell.mcell'), 'and tapping the reflection still wins');
  await page.close();
}

/* ── Let the Cat Out: slide a bar along its track ───────────────────────── */
if (!only || only.includes('slide')){
  const page = await open('slide', '.cell.bar', 12000);
  const snap = () => page.evaluate(() => [...document.querySelectorAll('#surface .grid > .cell')].map((c, i) => c.classList.contains('bar') ? i : -1).filter(i => i >= 0).join(','));
  const info = await page.evaluate(() => { const cells = [...document.querySelectorAll('#surface .grid > .cell')]; const n = Math.round(Math.sqrt(cells.length)); return { n, bars: cells.filter(c => c.classList.contains('bar')).length }; });
  check(info.n >= 5, `the board is at least five squares across (${info.n})`);
  const before = await snap();
  const emptyBefore = await page.evaluate(() => [...document.querySelectorAll('.cell.empty, .cell.corridor')].map(c => { const r = c.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }).join('|'));
  /* try every bar in both directions until one moves */
  const cellsN = await page.evaluate(() => document.querySelectorAll('.cell.bar').length);
  let moved = false, lifted = false, still = true;
  for (let k = 0; k < cellsN && !moved; k++){
    const a = await centre(page, '.cell.bar:not(.stuck)', k); if (!a) break;
    const vert = await page.evaluate(i => document.querySelectorAll('.cell.bar:not(.stuck)')[i].classList.contains('upright'), k);
    for (const sgn of [1, -1]){
      const pitch = a.h + 10, dx = vert ? 0 : sgn * a.w * 1.1, dy = vert ? sgn * pitch * 1.1 : 0;
      await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + dx * 0.5, a.y + dy * 0.5, { steps: 4 });
      const mid = await page.evaluate(() => ({ sliding: !!document.querySelector('.cell.bar.sliding'), empty: [...document.querySelectorAll('.cell.empty, .cell.corridor')].map(c => { const r = c.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }).join('|') }));
      lifted = lifted || mid.sliding; still = still && mid.empty === emptyBefore;
      await page.mouse.move(a.x + dx, a.y + dy, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(80);
      if ((await snap()) !== before){ moved = true; break; }
    }
  }
  check(lifted, 'a bar taken hold of slides under the finger');
  check(still, 'and the empty squares around it stay exactly where they were');
  check(moved, 'letting go leaves it on the nearest cell it can reach');
  const tapBefore = await snap();
  await page.locator('.sumtool').first().click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(100);
  check((await snap()) !== tapBefore || !moved, 'Undo takes the slide back');
  await page.close();
}

/* ── Sorting Basket: the yarn carried to its basket ─────────────────────── */
if (!only || only.includes('sort')){
  const page = await open('sort', '.sortitem', 12000);
  const count = () => page.evaluate(() => (document.querySelector('.prompt') || {}).textContent || '');
  let threeSeen = false, progressed = 0;
  for (let round = 0; round < 6; round++){
    const plan = await page.evaluate(() => {
      const rule = (document.querySelector('.sortrule') || {}).textContent.toUpperCase(), it = document.querySelector('.sortitem');
      if (!it) return null;
      const bins = [...document.querySelectorAll('.bins .bin')].filter(b => getComputedStyle(b).display !== 'none' && !b.disabled);
      const w = it.getBoundingClientRect().width, hollow = it.classList.contains('hollow');
      const ink = hollow ? getComputedStyle(it).borderTopColor : getComputedStyle(it).backgroundColor;
      let pick;
      if (/COLOU?R|COULEUR|COLOR|FARBE/.test(rule)) pick = bins.findIndex(b => getComputedStyle(b).borderTopColor === ink);
      else if (/SIZE|TAILLE|TAMA|GR/.test(rule)) pick = w > 60 ? bins.length - 1 : 0;
      else pick = hollow ? 0 : bins.length - 1;
      return { pick, n: bins.length, rule };
    });
    if (!plan || plan.pick < 0) break;
    threeSeen = threeSeen || plan.n === 3;
    const a = await centre(page, '.sortitem'), b = await centre(page, '.bins .bin:not([style*="display: none"]):not([disabled])', plan.pick);
    const before = await count();
    const r = await drag(page, a, b);
    if (round === 0){ check(r.mid.ghost && r.mid.lifted, 'the yarn lifts a copy under the finger'); check(r.over, 'the basket under it lights up'); }
    await page.waitForTimeout(120);
    if ((await count()) !== before) progressed++;
    else if (await page.evaluate(() => !document.querySelector('.sortitem:not(.carried)'))) { progressed++; break; }
  }
  check(progressed >= 3, `carrying the yarn to the right basket counts it, round after round (${progressed})`);
  await page.close();
}

/* ── Tumble Dryer: a sock carried onto its partner ─────────────────────── */
if (!only || only.includes('tumble')){
  const page = await open('tumble', '.cell.sock.full', 12000);
  const n0 = await page.evaluate(() => document.querySelectorAll('.cell.sock.full').length), cells = await page.evaluate(() => document.querySelectorAll('.cell.sock').length);
  check(Math.round(Math.sqrt(cells)) >= 5, `the drum is at least five squares across (${Math.round(Math.sqrt(cells))})`);
  const pair = await page.evaluate(() => { const f = [...document.querySelectorAll('.cell.sock.full')]; const by = {}; f.forEach((e, i) => (by[e.dataset.hex] = by[e.dataset.hex] || []).push(i)); const k = Object.values(by).find(v => v.length >= 2); return k ? [k[0], k[1]] : null; });
  const slots = await page.evaluate(p => { const all = [...document.querySelectorAll('.cell.sock')], f = [...document.querySelectorAll('.cell.sock.full')]; return p.map(i => all.indexOf(f[i])); }, pair);
  const a = await centre(page, '.cell.sock.full', pair[0]), b = await centre(page, '.cell.sock.full', pair[1]);
  const r = await drag(page, a, b);
  check(r.mid.ghost && r.mid.lifted, 'the sock lifts a copy and leaves its square where it was');
  await page.waitForTimeout(150);
  const n1 = await page.evaluate(() => document.querySelectorAll('.cell.sock.full').length);
  check(await page.evaluate(sl => { const all = [...document.querySelectorAll('.cell.sock')]; return sl.every(i => !all[i].classList.contains('full')); }, slots), 'letting go over its partner pairs them off');
  check(await page.evaluate(() => document.querySelectorAll('.cell.sock').length) === cells, 'and the drum has exactly as many squares as before');
  const hold = await page.locator('.sumtool').first().innerText();
  check(/2/.test(hold), `the drum can be held twice a round (${hold})`);
  await page.close();
}

/* ── Latch Hook: slide a row ─────────────────────────────────────────────── */
if (!only || only.includes('latch')){
  const page = await open('latch', '.ltcstrip', 2000);
  const notches = () => page.evaluate(() => [...document.querySelectorAll('.ltcrow')].map(r => [...r.querySelectorAll('.ltccell')].findIndex(c => c.classList.contains('notch'))));
  const dims = await page.evaluate(() => ({ rows: document.querySelectorAll('.ltcrow').length, cols: document.querySelector('.ltcstrip').children.length }));
  check(dims.rows >= 4 && dims.cols >= 6, `the lock is ${dims.cols} across and ${dims.rows} rows down`);
  const before = await notches(), a = await centre(page, '.ltcstrip', 1);
  const cw = a.w / dims.cols;
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + cw * 2, a.y, { steps: 6 });
  const preview = (await notches())[1];
  await page.mouse.up(); await page.waitForTimeout(100);
  const after = await notches();
  check(preview === (before[1] + 2) % dims.cols, 'while the finger is down the notch shows where it will land');
  check(after[1] === (before[1] + 2) % dims.cols && after[0] === before[0], 'letting go two cells along turns that row twice and no other');
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x - cw * 1, a.y, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(100);
  check((await notches())[1] === ((after[1] - 1) % dims.cols + dims.cols) % dims.cols, 'and the other way turns it back');
  await page.close();
}

/* ── Even Skeins: a skein carried to the other basket ──────────────────── */
if (!only || only.includes('halve')){
  const page = await open('halve', '.hlvchip', 2000);
  const where = () => page.evaluate(() => [...document.querySelectorAll('.hlvtray')].map(t => [...t.querySelectorAll('.hlvchip')].map(c => c.textContent).join(',')));
  const n = await page.evaluate(() => document.querySelectorAll('.hlvchip').length);
  check(n >= 8, `there are at least eight skeins (${n})`);
  const w0 = await where();
  const a = await centre(page, '.hlvtray:nth-child(1) .hlvchip', 0), t2 = await centre(page, '.hlvtray:nth-child(2)', 0);
  const r = await drag(page, a, { x: t2.x, y: t2.y + t2.h * 0.3 });
  check(r.mid.ghost && r.mid.lifted, 'the skein lifts a copy under the finger');
  check(r.over, 'and the basket under it lights up');
  await page.waitForTimeout(150);
  const w1 = await where();
  check(w1[0].split(',').filter(Boolean).length === w0[0].split(',').filter(Boolean).length - 1 && w1[1].split(',').filter(Boolean).length === w0[1].split(',').filter(Boolean).length + 1, 'letting go over the other basket moves it there');
  /* and into the basket it is already in, nothing */
  const b = await centre(page, '.hlvtray:nth-child(2) .hlvchip', 0), t2b = await centre(page, '.hlvtray:nth-child(2)', 0);
  await drag(page, b, { x: t2b.x, y: t2b.y + t2b.h * 0.4 }); await page.waitForTimeout(150);
  check(JSON.stringify(await where()) === JSON.stringify(w1), 'letting go over its own basket changes nothing');
  await page.locator('.sumtool').first().click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(100);
  check(JSON.stringify(await where()) === JSON.stringify(w0), 'Undo puts it back');
  const tapped = await centre(page, '.hlvtray:nth-child(1) .hlvchip', 0); await page.mouse.click(tapped.x, tapped.y); await page.waitForTimeout(120);
  check(JSON.stringify(await where()) !== JSON.stringify(w0), 'and a plain tap still moves a skein');
  await page.close();
}

/* ── Heft: sit the cat in the heavier basket ───────────────────────────── */
if (!only || only.includes('heft')){
  let won = 0, tries = 0;
  for (let k = 0; k < 3; k++){
    const page = await open('heft', '.hpan', 12000);
    const heavy = await page.evaluate(() => {
      const pans = [...document.querySelectorAll('.hpan')];
      const weight = p => [...p.querySelectorAll('.hbit')].reduce((a, b) => a + Math.pow(parseFloat(b.style.width), 2), 0);
      const w = pans.map(weight); return { i: w.indexOf(Math.max(...w)), n: pans.length };
    });
    if (k === 0) check(await page.evaluate(() => !!document.querySelector('.hcat svg')), 'a cat waits under the baskets');
    const a = await centre(page, '.hcat'), b = await centre(page, '.hpan', heavy.i);
    const r = await drag(page, a, b);
    if (k === 0){ check(r.mid.ghost && r.mid.lifted, 'the cat lifts a copy under the finger'); check(r.over, 'and the basket under it lights up'); }
    tries++;
    if (await page.evaluate(() => !!document.querySelector('.hpan.right') && !document.querySelector('.hpan.wrong'))) won++;
    await page.close();
  }
  check(won === tries, `sitting the cat in the heavier basket answers it right (${won}/${tries})`);
}

/* ── Count the Stitches: run a finger through the numbers ────────────────── */
if (!only || only.includes('order')){
  const page = await open('order', '.bub', 2000);
  const labels = await page.evaluate(() => [...document.querySelectorAll('.bub')].map(b => b.textContent));
  check(labels.length >= 4, `there are at least four stitches (${labels.length})`);
  const seq = await page.evaluate(() => { const bs = [...document.querySelectorAll('.bub')]; const num = bs.every(b => /^\d+$/.test(b.textContent)); return num ? bs.map((b, i) => [+b.textContent, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]) : null; });
  if (seq){
    const pts = [];
    for (const i of seq.slice(0, 3)) pts.push(await centre(page, '.bub', i));
    await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
    for (const q of pts.slice(1)) await page.mouse.move(q.x, q.y, { steps: 6 });
    await page.mouse.up(); await page.waitForTimeout(100);
    check(await page.evaluate(() => document.querySelectorAll('.bub.done').length) === 3, 'a finger run through 1, 2 and 3 counts all three');
    check(await page.evaluate(() => !!document.querySelector('.orderthread polyline').getAttribute('points')), 'and the thread is stitched from one to the next');
  } else check(true, 'this round counts letters, not numbers');
  await page.close();
}

/* ── Cat's Cradle: a finger carries the thread from peg to peg ────────────── */
if (!only || only.includes('arc')){
  const page = await open('arc', '.arcdot.lit', 2000);
  const pegs = await page.evaluate(() => document.querySelectorAll('.arcdot').length);
  check(pegs >= 6, `there are at least six pegs (${pegs})`);
  const from = await centre(page, '.arcdot.lit', 0);
  /* A peg in reach is taken the moment the finger is over it, so a finger run to the far peg takes every peg it crosses on the way. Aim at
     a peg in reach whose straight path from the lit one crosses no other peg, or the answer depends on where the board happened to put them. */
  const pick = await page.evaluate(() => {
    const dots = [...document.querySelectorAll('.arcdot')], c = d => { const r = d.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; };
    const f = c(dots.find(d => d.classList.contains('lit')));
    const seg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0; return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)); };
    const clear = i => dots.every((d, j) => j === i || d.classList.contains('lit') || seg(c(d), f, c(dots[i])) > c(d).w * 0.8);
    const near = dots.map((d, i) => i).filter(i => dots[i].classList.contains('near'));
    return { any: near.length, idx: near.find(clear) ?? -1 };
  });
  const idx = pick.idx;
  if (pick.any && idx < 0) check(true, 'every peg in reach has another on the way to it; skipped');
  else if (idx >= 0){
    const to = await centre(page, '.arcdot', idx);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(100);
    check(await page.evaluate(() => document.querySelectorAll('.arcdot.lit').length) === 2, 'running a finger from the lit peg to one in reach loops it in');
  } else check(true, 'no peg was in reach to begin with');
  await page.close();
}

/* ── Darning: lay a run of stitches with one finger ──────────────────────── */
if (!only || only.includes('bridge')){
  const page = await open('bridge', '.brcell', 2000);
  const g = await page.evaluate(() => Math.round(Math.sqrt(document.querySelectorAll('.brcell').length)));
  check(g >= 6, `the water is at least six across (${g})`);
  const run = await page.evaluate(() => { const c = [...document.querySelectorAll('.brcell')]; const n = Math.round(Math.sqrt(c.length)); for (let i = 0; i < c.length - 2; i++) if ((i % n) + 2 < n && [0, 1, 2].every(k => c[i + k].dataset.idx !== undefined)) return i; return -1; });
  const at = async i => page.evaluate(k => { const r = document.querySelectorAll('.brcell')[k].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, i);
  if (run >= 0){
    const a = await at(run), z = await at(run + 2);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(z.x, z.y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(100);
    check(await page.evaluate(r => [0, 1, 2].every(k => document.querySelectorAll('.brcell')[r + k].classList.contains('plank')), run), 'one finger dragged across three squares of water lays three stitches');
  } else check(true, 'no run of three open squares in this round');
  await page.close();
}

/* ── Splice: an end carried to its beginning ────────────────────────────── */
if (!only || only.includes('splice')){
  const page = await open('splice', '.spltile.head', 2000);
  const words = await page.evaluate(() => document.querySelectorAll('.spltile.head').length);
  check(words >= 3, `there are at least three words to join (${words})`);
  const ti = await page.evaluate(() => [...document.querySelectorAll('.spltile.tail')].findIndex(t => t.dataset.src === '0'));
  const a = await centre(page, '.spltile.head', 0), b = await centre(page, '.spltile.tail', ti);
  const r = await drag(page, a, b);
  check(r.mid.ghost && r.mid.lifted, 'the end lifts a copy and leaves its place');
  await page.waitForTimeout(150);
  check(await page.evaluate(() => document.querySelector('.spltile.head').classList.contains('locked')), 'letting go over its own ending joins them');
  await page.close();
}

/* ── Spool Belt: a bucket carried onto the belt ─────────────────────────── */
if (!only || only.includes('sift')){
  const page = await open('sift', '.bkt', 2000);
  const slots = await page.evaluate(() => document.querySelectorAll('.bslot').length);
  check(slots >= 4, `the belt has at least four places (${slots})`);
  /* The belt moves on its own timer, so a count of full slots before and after the drop drifts with how long the drag took (a slow
     stretch let it use up two slots against the one put, and the check failed for no reason in the game). Ask the bucket instead:
     letting go over the belt must run its put, once. */
  await page.evaluate(() => { window.__puts = 0; document.querySelectorAll('.bkt').forEach(k => { const f = k._put; k._put = (...x) => { window.__puts++; return f && f(...x); }; }); });
  await page.waitForTimeout(300);
  const a = await centre(page, '.bkt', 0), b = await centre(page, '.belt', 0);
  const r = await drag(page, a, b);
  check(r.mid.ghost && r.mid.lifted, 'the bucket lifts a copy under the finger');
  await page.waitForTimeout(120);
  const puts = await page.evaluate(() => window.__puts);
  check(puts === 1, `letting go over the belt puts it on (the bucket's put ran ${puts} time${puts === 1 ? '' : 's'})`);
  await page.close();
}

/* ── Tangle Watch: a thread drawn from one drifting dot to the one it will meet ───────────────────── */
if (!only || only.includes('drift')){
  const readDots = page => page.evaluate(() => [...document.querySelectorAll('.ddot')].map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }));
  const page = await open('drift', '.ddot', 12000);
  const p0 = await readDots(page); const t0 = Date.now(); await page.waitForTimeout(500); const p1 = await readDots(page); const dt = Date.now() - t0;
  let best = null;
  for (let i = 0; i < p1.length; i++) for (let j = i + 1; j < p1.length; j++){
    const px = p1[i].x - p1[j].x, py = p1[i].y - p1[j].y, vx = ((p1[i].x - p0[i].x) - (p1[j].x - p0[j].x)) / dt, vy = ((p1[i].y - p0[i].y) - (p1[j].y - p0[j].y)) / dt;
    const vv = vx * vx + vy * vy, ms = vv < 1e-12 ? 0 : Math.max(0, Math.min(12000, -(px * vx + py * vy) / vv));
    const d = Math.hypot(px + vx * ms, py + vy * ms);
    if (!best || d < best.d) best = { i, j, d };
  }
  check(p1.length >= 6 && best && best.d < p1[0].w, `the bot reads the pair from how the dots drift (${p1.length} dots, ${best && Math.round(best.d)}px at the nearest)`);
  const now = await readDots(page); const a = now[best.i], b = now[best.j];
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + (b.x - a.x) * 0.4, a.y + (b.y - a.y) * 0.4, { steps: 4 });
  const mid = await page.evaluate(() => ({ thread: !!document.querySelector('.driftthread.on'), sel: document.querySelectorAll('.ddot.dsel').length }));
  check(mid.thread, 'pulling away from a dot draws a thread from it');
  check(mid.sel === 1, 'the dot that was pressed is chosen');
  const b2 = (await readDots(page))[best.j];
  await page.mouse.move(b2.x + 3, b2.y - 3, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
  check(await page.evaluate(() => document.querySelectorAll('.ddot.dhit').length === 2), 'letting go over the other dot of the pair wins the round');
  await page.close();

  /* A thread let go over nothing is just a tap on the first dot: it stays chosen and nothing is lost. */
  const page2 = await open('drift', '.ddot', 12000);
  const q = (await readDots(page2))[0];
  await page2.mouse.move(q.x, q.y); await page2.mouse.down(); await page2.mouse.move(q.x + 12, q.y + 12, { steps: 3 });
  /* The dots drift, so a fixed spot 40px away is sometimes another dot (one run in the v0.139.0 chain): look where they are now and let go in the clear. */
  const rel = await page2.evaluate(([qx, qy]) => {
    const ds = [...document.querySelectorAll('.ddot')].map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
    const f = document.getElementById('surface').getBoundingClientRect();
    for (const [dx, dy] of [[40, 5], [-40, 5], [5, 40], [5, -40], [30, 30], [-30, 30], [30, -30], [-30, -30], [60, 0], [-60, 0]]){
      const x = qx + dx, y = qy + dy;
      if (x < f.left + 6 || x > f.right - 6 || y < f.top + 6 || y > f.bottom - 6) continue;
      if (ds.every((d, i) => i === 0 || Math.hypot(d.x - x, d.y - y) > d.w * 1.2)) return { x, y };
    }
    return { x: qx + 40, y: qy + 5 };
  }, [q.x, q.y]);
  await page2.mouse.move(rel.x, rel.y, { steps: 4 }); await page2.mouse.up(); await page2.waitForTimeout(120);
  const after = await page2.evaluate(() => ({ sel: document.querySelectorAll('.ddot.dsel').length, thread: !!document.querySelector('.driftthread.on'), over: !document.querySelector('.stagepips') && !!document.querySelector('.over:not([hidden])') }));
  check(after.sel === 1 && !after.thread, 'a thread let go over nothing leaves its first dot chosen and the thread gone');
  await page2.close();
}

/* ── Spool Shots: a spool is pulled and let go, with a look at what it would paint first ───────────── */
if (!only || only.includes('volley')){
  const page = await open('volley', '.vgun', 12000);
  const left = () => page.evaluate(() => { const b = document.querySelector('.budget'); return b ? +(b.textContent.match(/\d+/) || [0])[0] : null; });
  const bare = () => page.evaluate(() => document.querySelectorAll('.vpix.bare').length);
  const box = await page.evaluate(() => { const r = document.querySelector('.vbox').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top, w: r.width, h: r.height }; });
  const l0 = await left(), b0 = await bare();
  const g = await centre(page, '.vgun', 0);
  await page.mouse.move(g.x, g.y); await page.mouse.down();
  const prev = await page.evaluate(() => ({ aim: document.querySelectorAll('.vpix.aim, .vpix.aimbad').length, aiming: document.querySelectorAll('.vgun.aiming').length, prompt: (document.querySelector('.prompt') || {}).textContent || '' }));
  check(prev.aim >= 1 && prev.aiming === 1, `pressing a spool outlines the squares its shot would reach (${prev.aim})`);
  check(/paint|peint|pinta|malt|colou?r|couleur|color|farbe/i.test(prev.prompt), `and the line above says what it would do ("${prev.prompt}")`);
  await page.mouse.move(box.x, box.y - 45, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
  const cancelled = await page.evaluate(() => ({ aim: document.querySelectorAll('.vpix.aim, .vpix.aimbad').length }));
  check(cancelled.aim === 0 && await left() === l0 && await bare() === b0, 'pulled off the board and let go, nothing is fired and nothing is spent');
  /* a spool that fits: pulled in and let go over the board, it paints */
  const fits = await page.evaluate(() => { const gs = [...document.querySelectorAll('.vgun')]; const i = gs.findIndex(x => x.classList.contains('fits')); return i; });
  const f = await centre(page, '.vgun', fits >= 0 ? fits : 0);
  await page.mouse.move(f.x, f.y); await page.mouse.down(); await page.mouse.move(box.x, box.y + box.h / 2, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  check(await left() === l0 - 1, `pulled across the board and let go, the shot is fired and costs a move (${l0} -> ${await left()})`);
  if (fits >= 0) check(await bare() < b0, 'and it painted some of the picture');
  /* and a plain tap is the same press and release */
  const fits2 = await page.evaluate(() => [...document.querySelectorAll('.vgun')].findIndex(x => x.classList.contains('fits')));
  const t2 = await centre(page, '.vgun', fits2 >= 0 ? fits2 : 1); const l1 = await left();
  await page.mouse.click(t2.x, t2.y); await page.waitForTimeout(300);
  check(await left() === l1 - 1, 'a tap on a spool still fires it');
  await page.close();
}

/* ── Tidy Up: pieces start on the floor, stay under the finger, and go into their own basket ───────── */
if (!only || only.includes('tidy')){
  /* Pieces were once stacked down the board by a style rule that beat the one placing them: on the baskets, under them, or off the
     board, and offset from the finger by however many pieces were above them. */
  for (const vp of [{ width: 400, height: 820 }, { width: 320, height: 568 }]){
    const page = await open('tidy', '.tidyitem', 12000, vp);
    const geo = await page.evaluate(() => {
      const bins = [...document.querySelectorAll('.tidybin')].map(b => b.getBoundingClientRect()), box = document.querySelector('.tidybox').getBoundingClientRect();
      const items = [...document.querySelectorAll('.tidyitem')].map(i => i.getBoundingClientRect());
      return { n: items.length,
        over: items.filter(r => bins.some(b => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top)).length,
        outside: items.filter(r => r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1).length };
    });
    check(geo.n >= 6 && geo.over === 0 && geo.outside === 0, `${vp.width}px wide: ${geo.n} pieces, none on a basket (${geo.over}), none off the board (${geo.outside})`);
    if (vp.width === 400){
      const pick = await page.evaluate(() => { const its = [...document.querySelectorAll('.tidyitem')], i = its.length - 1, r = its[i].getBoundingClientRect(), b = document.querySelector('.tidybox').getBoundingClientRect();
        /* a step towards the middle of the floor, so the edge of the board cannot be what stops it */
        return { i, x: r.left + r.width / 2, y: r.top + r.height / 2, hex: its[i].dataset.hex, dx: (r.left + r.width / 2 < b.left + b.width / 2) ? 40 : -40, dy: (r.top + r.height / 2 < b.top + b.height * 0.3) ? 30 : -30 }; });
      await page.mouse.move(pick.x, pick.y); await page.mouse.down(); await page.mouse.move(pick.x + pick.dx, pick.y + pick.dy, { steps: 5 });
      const under = await page.evaluate(([i, x, y]) => { const r = document.querySelectorAll('.tidyitem')[i].getBoundingClientRect(); return { dx: Math.abs(r.left + r.width / 2 - x), dy: Math.abs(r.top + r.height / 2 - y) }; }, [pick.i, pick.x + pick.dx, pick.y + pick.dy]);
      check(under.dx < 6 && under.dy < 6, `a piece sits under the finger while it is carried (${Math.round(under.dx)}px, ${Math.round(under.dy)}px off)`);
      const bin = await page.evaluate(hex => { const b = [...document.querySelectorAll('.tidybin')].find(x => x.dataset.hex === hex); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, pick.hex);
      if (bin){
        const before = await page.evaluate(() => (document.querySelector('.prompt') || {}).textContent);
        await page.mouse.move(bin.x, bin.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(250);
        check(await page.evaluate(() => (document.querySelector('.prompt') || {}).textContent) !== before || await page.evaluate(() => !!document.querySelector('.tidyitem.binned')), 'let go over its own basket, it is counted');
      } else { await page.mouse.up(); check(true, 'no basket carries that colour (a lost-and-found round)'); }
    }
    await page.close();
  }
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nevery piece can be carried');
process.exit(bad ? 1 : 0);
