/* Let the Cat Out: a hint shows the first step of a shortest way out.
 *
 *   - Hint (two a round) lights one bar and the end of it to tap; taking that step leaves the cat exactly one step nearer (a search over
 *     the board as it is drawn checks it)
 *   - taking the steps that search names wins the round, and the button is translated
 *
 *   node tools/probe/slide.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }, lang = 'en') => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { slide: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'slide');
  await page.waitForSelector('#surface .slidewrap .grid .cell', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
/* the board as drawn: every cell with its row and column, which bars there are, and the buttons */
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const cells = [...document.querySelectorAll('.slidewrap .grid > .cell')], n = Math.round(Math.sqrt(cells.length));
  const info = cells.map((e, i) => ({ i, r: Math.floor(i / n), c: i % n, bar: e.classList.contains('bar'), flat: e.classList.contains('flat'), hint: e.classList.contains('hint'), end: e.classList.contains('hintend'), car: e.classList.contains('car'), ...R(e) }));
  const tools = [...document.querySelectorAll('.slidewrap .sumtool')].map(b => ({ text: b.textContent.trim(), off: b.disabled, ...R(b) }));
  return { n, cells: info, tools, surface: R(document.getElementById('surface')), budget: (document.querySelector('.budget') || {}).textContent || '' };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
/* bars from the drawn cells: a run of bar cells along its own axis is one bar (the app keeps a gap between bars end to end) */
const barsOf = s => {
  const bars = [], seen = new Set(), at = (r, c) => (r >= 0 && c >= 0 && r < s.n && c < s.n) ? s.cells[r * s.n + c] : null;
  for (const e of s.cells){
    if (!e.bar || seen.has(e.i)) continue;
    const o = e.flat ? 'h' : 'v', cells = [e]; seen.add(e.i);
    for (let k = 1; ; k++){ const q = o === 'h' ? at(e.r, e.c + k) : at(e.r + k, e.c); if (!q || !q.bar || (o === 'h') !== q.flat || seen.has(q.i)) break; cells.push(q); seen.add(q.i); }
    bars.push({ o, len: cells.length, r: e.r, c: e.c });
  }
  return bars;
};
const carRowOf = s => s.cells.find(c => c.car).r;
const cellsOf = p => Array.from({ length: p.len }, (_, k) => p.o === 'v' ? [p.r + k, p.c] : [p.r, p.c + k]);
const solver = (s) => {
  const n = s.n, carRow = carRowOf(s);
  const legal = ps => { const seen = new Set(); for (const p of ps){ if (p.r < 0 || p.c < 0 || (p.o === 'v' ? p.r + p.len > n : p.c + p.len > n)) return false; for (const [r, c] of cellsOf(p)){ if (r === carRow && c <= 1) return false; const k = r + ',' + c; if (seen.has(k)) return false; seen.add(k); } } return true; };
  const blocks = ps => ps.some(p => cellsOf(p).some(([r, c]) => r === carRow && c >= 2));
  /* steps from this state to the cat being out: breadth first, one square at a time */
  const dist = start => {
    if (!blocks(start)) return { d: 0, first: null };
    const key = ps => ps.map(p => p.r + '.' + p.c).join('|'), seen = new Set([key(start)]);
    let frontier = [{ ps: start, first: null }];
    for (let depth = 1; depth <= 14; depth++){
      const next = [];
      for (const { ps, first } of frontier) for (let i = 0; i < ps.length; i++) for (const d of [-1, 1]){
        const p = ps[i], moved = ps.slice(); moved[i] = { o: p.o, len: p.len, r: p.o === 'v' ? p.r + d : p.r, c: p.o === 'h' ? p.c + d : p.c };
        if (!legal(moved)) continue; const k = key(moved); if (seen.has(k)) continue; seen.add(k);
        const f = first || { i, d }; if (!blocks(moved)) return { d: depth, first: f }; next.push({ ps: moved, first: f });
      }
      if (!next.length) break; frontier = next;
    }
    return { d: -1, first: null };
  };
  return dist;
};
const mid = e => [e.x + e.w / 2, e.y + e.h / 2];
const click = async (page, e) => { const [x, y] = mid(e); await page.mouse.click(x, y); await page.waitForTimeout(160); };
const endCell = (s, bar, d) => { const cs = cellsOf(bar), [r, c] = d < 0 ? cs[0] : cs[cs.length - 1]; return s.cells[r * s.n + c]; };

for (const [xp, label, vp] of [[0, 'a new player', { width: 400, height: 820 }], [12000, 'a higher level', { width: 400, height: 820 }]]){
  const page = await open(xp, vp); let s = await read(page);
  check(s.tools.length === 2 && s.tools.every(t => t.h >= 40 && t.y + t.h <= s.surface.y + s.surface.h + 1), `${label}: Undo and Hint are inside the board and big enough to hit (${s.tools.map(t => t.text).join(', ')})`);
  const dist = solver(s); const d0 = dist(barsOf(s));
  await click(page, s.tools[1]); s = await read(page);
  const lit = s.cells.filter(c => c.hint), ends = s.cells.filter(c => c.end);
  check(lit.length >= 2 && ends.length === 1 && /1/.test(s.tools[1].text), `${label}: Hint lights one bar and the end to tap, and uses one of two (${lit.length} cells, ${s.tools[1].text})`);
  await click(page, ends[0]); s = await read(page);
  const d1 = dist(barsOf(s));
  check(d0.d > 0 && d1.d === d0.d - 1, `${label}: taking that step leaves the cat one step nearer (${d0.d} -> ${d1.d})`);
  /* then follow the search to the end */
  for (let guard = 0; guard < 30; guard++){
    s = await read(page); const bars = barsOf(s), q = dist(bars); if (!q.first || q.d <= 0) break;
    await click(page, endCell(s, bars[q.first.i], q.first.d));
    if (await score(page) > 0) break;
  }
  await page.waitForTimeout(500);
  check(await score(page) > 0, `${label}: taking the steps the search names wins the round`);
  await page.close();
}
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(s.tools.length === 2 && /Indice/.test(s.tools[1].text), `fr: Hint is in French (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nLet the Cat Out points the way');
process.exit(bad ? 1 : 0);
