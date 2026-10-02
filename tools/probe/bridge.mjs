/* Darning: lifting a stitch gives it back, and a hint shows the next stitch on the cheapest way across.
 *
 *   - the allowance counts stitches laid, so laying one costs a move and lifting it returns the move
 *   - Hint (two a round) lights one empty square; laying it leaves the crossing exactly one stitch nearer (a shortest-path search
 *     over the visible board checks it)
 *   - laying the squares that search names wins the round, a finger dragged along a row lays every square it crosses, and the
 *     button is translated
 *
 *   node tools/probe/bridge.mjs
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
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { bridge: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'bridge');
  await page.waitForSelector('#surface .brgrid .brcell', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const cs = [...document.querySelectorAll('.brcell')], g = Math.round(Math.sqrt(cs.length));
  const tool = document.querySelector('.sumcol .sumtool');
  return { g, cells: cs.map((c, i) => ({ i, bank: c.classList.contains('bank'), rock: c.classList.contains('rock'), plank: c.classList.contains('plank'), hint: c.classList.contains('hint'), ...R(c) })),
    tool: tool ? { text: tool.textContent.trim(), ...R(tool) } : null, budget: (document.querySelector('.budget') || {}).textContent || '', surface: R(document.getElementById('surface')) };
});
const left = s => parseInt((s.budget.match(/\d+/) || ['0'])[0], 10);
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const mid = b => [b.x + b.w / 2, b.y + b.h / 2];
const click = async (page, b) => { const [x, y] = mid(b); await page.mouse.click(x, y); await page.waitForTimeout(110); };
/* cheapest way across: laid squares and banks are free, empty squares cost one, rocks block. Returns the cost and the empty squares on the way. */
const cheapest = s => {
  const g = s.g, start = s.cells.findIndex(c => c.bank), end = s.cells.length - 1 - [...s.cells].reverse().findIndex(c => c.bank);
  const A = s.cells.findIndex(c => c.bank), B = s.cells.map((c, i) => c.bank ? i : -1).filter(i => i >= 0).pop();
  const dist = new Array(g * g).fill(1e9), from = new Array(g * g).fill(-1), open = new Set([A]); dist[A] = 0;
  while (open.size){
    let u = -1; open.forEach(k => { if (u < 0 || dist[k] < dist[u]) u = k; }); open.delete(u);
    const x = u % g, y = Math.floor(u / g);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= g || ny >= g) continue;
      const n = ny * g + nx, c = s.cells[n]; if (c.rock) continue;
      const w = c.bank || c.plank ? 0 : 1; if (dist[u] + w < dist[n]){ dist[n] = dist[u] + w; from[n] = u; open.add(n); }
    }
  }
  const route = []; for (let q = B; q !== -1; q = from[q]) route.push(q);
  return { cost: dist[B], empties: route.reverse().filter(i => !s.cells[i].bank && !s.cells[i].plank) };
};

/* ── layout ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, vp] of [[0, 'a new player', { width: 400, height: 820 }], [60000, 'a high level', { width: 400, height: 820 }], [0, 'a new player on a 320px phone', { width: 320, height: 568 }]]){
  const page = await open(xp, vp); const s = await read(page);
  const sq = s.cells.filter(c => !c.bank && !c.rock);
  check(!!s.tool && s.tool.h >= 40 && s.tool.y + s.tool.h <= s.surface.y + s.surface.h + 1, `${label}: Hint is inside the board and big enough to hit (${s.tool && Math.round(s.tool.h)}px)`);
  check(Math.min(...s.cells.map(c => c.w)) >= 30, `${label}: every square is at least 30px wide (${Math.round(Math.min(...s.cells.map(c => c.w)))}px on a ${s.g} x ${s.g} board)`);
  await page.close();
}

/* ── lifting a stitch gives it back ───────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  const before = left(s), c = s.cells.find(c => !c.bank && !c.rock && !c.plank);
  await click(page, c); const a = await read(page);
  await click(page, a.cells[c.i]); const b = await read(page);
  check(a.cells[c.i].plank && left(a) === before - 1 && !b.cells[c.i].plank && left(b) === before, `laying a stitch costs a move and lifting it gives the move back (${before} -> ${left(a)} -> ${left(b)})`);
  await page.close();
}

/* ── the hint, and a solution ─────────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label] of [[0, 'a new player'], [12000, 'a higher level']]){
  const page = await open(xp); let s = await read(page);
  const c0 = cheapest(s);
  await click(page, s.tool); s = await read(page);
  const lit = s.cells.filter(c => c.hint);
  check(lit.length === 1 && /1/.test(s.tool.text) && !lit[0].plank && !lit[0].bank && !lit[0].rock, `${label}: Hint lights one empty square and uses one of two (${s.tool.text})`);
  await click(page, lit[0]); s = await read(page);
  check(cheapest(s).cost === c0.cost - 1, `${label}: laying it leaves the crossing one stitch nearer (${c0.cost} -> ${cheapest(s).cost})`);
  for (let guard = 0; guard < 30; guard++){
    s = await read(page); const q = cheapest(s); if (!q.empties.length) break;
    await click(page, s.cells[q.empties[0]]);
    if (await score(page) > 0) break;
  }
  await page.waitForTimeout(500);
  check(await score(page) > 0, `${label}: laying the squares the search names wins the round`);
  await page.close();
}

/* ── a finger dragged along a row ─────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); const s = await read(page);
  /* two neighbours in a row that are both open */
  const pair = s.cells.find(c => !c.bank && !c.rock && (c.i % s.g) < s.g - 1 && !s.cells[c.i + 1].bank && !s.cells[c.i + 1].rock);
  const [ax, ay] = mid(pair), [bx, by] = mid(s.cells[pair.i + 1]);
  await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
  const a = await read(page);
  check(a.cells[pair.i].plank && a.cells[pair.i + 1].plank, 'a finger dragged over two squares lays both');
  await page.close();
}

/* ── French ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(!!s.tool && /Indice/.test(s.tool.text), `fr: Hint is in French (${s.tool && s.tool.text})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nDarning gives stitches back and shows the next one');
process.exit(bad ? 1 : 0);
