/* Even Skeins: sorted baskets and a hint that points at the next skein to move.
 *
 *   - each basket lists its skeins biggest first
 *   - Hint (two a round) lights one skein; moving it brings the baskets one step closer to balanced (the fewest moves from here to any
 *     balanced split goes down by exactly one)
 *   - moving the skeins a brute-force search says to move wins the round, and Undo still gives a move back
 *
 *   node tools/probe/halve.mjs
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
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { halve: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'halve');
  await page.waitForSelector('#surface .hlvwrap .hlvchip', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const trays = [...document.querySelectorAll('.hlvtray')].map(tr => [...tr.querySelectorAll('.hlvchip')].map(c => ({ v: Number(c.textContent), hint: c.classList.contains('hint'), ...R(c) })));
  const tools = [...document.querySelectorAll('.sumcol .sumtool')].map(b => ({ text: b.textContent.trim(), off: b.disabled, ...R(b) }));
  return { trays, tools, budget: (document.querySelector('.budget') || {}).textContent || '', surface: R(document.getElementById('surface')) };
});
const left = s => parseInt((s.budget.match(/\d+/) || ['0'])[0], 10);
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const mid = b => [b.x + b.w / 2, b.y + b.h / 2];
const click = async (page, b) => { const [x, y] = mid(b); await page.mouse.click(x, y); await page.waitForTimeout(130); };
/* fewest skeins to move from this split to any that balances, and which split that is */
const plan = s => {
  const items = [...s.trays[0].map(c => ({ v: c.v, side: 0 })), ...s.trays[1].map(c => ({ v: c.v, side: 1 }))];
  const total = items.reduce((a, c) => a + c.v, 0); let best = { cost: 1e9, mask: 0 };
  for (let mask = 0; mask < (1 << items.length); mask++){
    let sm = 0; items.forEach((c, i) => { if (mask >> i & 1) sm += c.v; });
    if (sm * 2 !== total) continue;
    let c = 0; items.forEach((it, i) => { if ((mask >> i & 1) !== it.side) c++; });
    if (c < best.cost) best = { cost: c, mask };
  }
  return { items, best };
};

/* ── layout and order ─────────────────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, vp] of [[0, 'a new player', { width: 400, height: 820 }], [60000, 'a high level', { width: 400, height: 820 }], [0, 'a new player on a 320px phone', { width: 320, height: 568 }]]){
  const page = await open(xp, vp); const s = await read(page);
  check(s.trays.every(tr => tr.every((c, i) => i === 0 || tr[i - 1].v >= c.v)), `${label}: each basket lists its skeins biggest first (${s.trays.map(tr => tr.map(c => c.v).join(' ')).join(' | ')})`);
  check(s.tools.length === 2 && s.tools.every(t => t.h >= 40 && t.y + t.h <= s.surface.y + s.surface.h + 1 && t.x >= 0 && t.x + t.w <= vp.width), `${label}: Undo and Hint are inside the board and big enough to hit (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}

/* ── the hint, and a solution ─────────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label] of [[0, 'a new player'], [12000, 'a higher level']]){
  const page = await open(xp); let s = await read(page);
  const p0 = plan(s);
  await click(page, s.tools[1]); s = await read(page);
  const lit = s.trays.flat().filter(c => c.hint);
  check(lit.length === 1 && /1/.test(s.tools[1].text), `${label}: Hint lights one skein and uses one of two (${s.tools[1].text})`);
  await click(page, lit[0]); s = await read(page);
  const p1 = plan(s);
  check(p1.best.cost === p0.best.cost - 1, `${label}: moving it brings the baskets one move closer (${p0.best.cost} -> ${p1.best.cost} to go)`);
  /* finish it by moving what the search says */
  for (let guard = 0; guard < 14; guard++){
    s = await read(page); const q = plan(s);
    if (q.best.cost === 0) break;
    /* the chip to move: first item whose side differs from the plan */
    const flat = [...s.trays[0].map((c, i) => ({ ...c, side: 0 })), ...s.trays[1].map(c => ({ ...c, side: 1 }))];
    const i = q.items.findIndex((it, k) => ((q.best.mask >> k) & 1) !== it.side);
    await click(page, flat[i]);
    if (await score(page) > 0) break;
  }
  await page.waitForTimeout(500);
  check(await score(page) > 0, `${label}: moving what the search says wins the round`);
  await page.close();
}

/* ── Undo ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  const before = left(s); const c = s.trays[0][0] || s.trays[1][0];
  await click(page, c); const a = await read(page);
  const [ux, uy] = mid(a.tools[0]); await page.mouse.click(ux, uy); await page.waitForTimeout(150);
  const b = await read(page);
  check(left(a) === before - 1 && left(b) === before, `Undo still gives the move back (${before} -> ${left(a)} -> ${left(b)})`);
  await page.close();
}

/* ── French ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(s.tools.length === 2 && /Indice/.test(s.tools[1].text), `fr: Hint is in French (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nEven Skeins sorts the baskets and points at the next skein');
process.exit(bad ? 1 : 0);
