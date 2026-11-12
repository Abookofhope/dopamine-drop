/* Even Skeins: sorted baskets and a hint that points at the next skein to move.
 *
 *   - each basket lists its skeins biggest first
 *   - Hint (two a round) lights one skein; moving it brings the baskets one step closer to balanced (the fewest moves from here to any
 *     balanced split goes down by exactly one)
 *   - moving the skeins a brute-force search says to move wins the round, and Undo still gives a move back
 *
 *   - 0.183.0: tied skeins move as one (level 6, two pairs from 16), the cat sits in the left basket and counts (12), a pinned
 *     skein will not move (20); the fewest moves is shown and exact; a crowded basket fits a 320px phone
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

/* ── the hint, and a solution (the page's own search, since tied skeins, the cat and a pin change what a move is) ─────── */
const state = page => page.evaluate(() => { const w = document.querySelector('.hlvwrap'); if (!w) return { gone: true };
  const st = w._state(); return { ...st, good: w.classList.contains('good'), exact: w.classList.contains('exact'), moves: +w.dataset.moves, lv: +w.dataset.lv,
    chip: (document.querySelector('.sumcol .parchip') || {}).textContent || '', prompt: document.getElementById('prompt').textContent.trim(),
    tot: [...w.querySelectorAll('.hlvtot')].map(e => +e.textContent), cat: !!w.querySelector('.hlvtray:first-child .hlvcat') }; });
const chipAt = (page, i) => page.evaluate(i => { const b = [...document.querySelectorAll('.hlvchip')].find(c => c._i === i); const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, i);
const toMove = st => { const units = st.unit.map((u, i) => u === i ? i : -1).filter(i => i >= 0); const k = units.findIndex((u, k) => ((st.best.mask >> k) & 1) !== st.side[u]); return k < 0 ? -1 : units[k]; };
for (const [xp, label] of [[0, 'a new player'], [12000, 'a higher level'], [60000, 'level 23']]){
  const page = await open(xp); let s = await read(page);
  const p0 = (await state(page)).best.cost;
  await click(page, s.tools[1]); s = await read(page);
  const lit = s.trays.flat().filter(c => c.hint);
  check((lit.length === 1 || lit.length === 2) && /1/.test(s.tools[1].text), `${label}: Hint lights one skein, or one tied pair, and uses one of two (${lit.length} lit, ${s.tools[1].text})`);
  await click(page, lit[0]);
  const p1 = (await state(page)).best.cost;
  check(p1 === p0 - 1, `${label}: moving it brings the baskets one move closer (${p0} -> ${p1} to go)`);
  for (let guard = 0; guard < 14; guard++){
    const st = await state(page); if (st.gone || st.good) break;
    const u = toMove(st); if (u < 0) break;
    await click(page, await chipAt(page, u));
  }
  await page.waitForTimeout(500);
  check(await score(page) > 0, `${label}: moving what the search says wins the round`);
  await page.close();
}

/* ── its own rules (0.183.0) ─────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, want, vp] of [[0, 'level 2', { ties: 0, cat: false, pin: false }], [4000, 'level 11', { ties: 1, cat: false, pin: false, word: /tied/ }],
  [30000, 'level 19', { ties: 2, cat: true, pin: false, word: /cat/ }], [60000, 'level 23', { ties: 2, cat: true, pin: true, word: /dashed/ }],
  [60000, 'level 23 on a 320px phone', { ties: 2, cat: true, pin: true }, { width: 320, height: 568 }]]){
  const page = await open(xp, vp); let st = await state(page);
  const ties = st.unit.filter((u, i) => u !== i).length;
  check(ties === want.ties && (st.catW > 0) === want.cat && st.cat === want.cat && (st.pin >= 0) === want.pin, `${label}: the rules on the board are the ones for the level (level ${st.lv}: ${ties} ties, cat ${st.catW}, pin ${st.pin})`);
  check(!want.word || want.word.test(st.prompt), `${label}: the prompt teaches the newest rule (${st.prompt})`);
  const sum0 = st.vals.reduce((a, v, i) => a + (st.side[i] === 0 ? v : 0), 0) + st.catW;
  check(st.tot[0] === sum0, `${label}: the left basket's total counts the cat (${st.tot[0]} = ${sum0})`);
  check(st.best.cost === st.least && new RegExp(`0\\D+${st.least}$`).test(st.chip), `${label}: the chip shows the fewest moves (${st.chip})`);
  if (vp){ const g = await page.evaluate(() => { const sf = document.getElementById('surface').getBoundingClientRect(); const all = [...document.querySelectorAll('.hlvchip, .hlvcat, .hlvtot, .sumcol .sumtool, .sumcol .parchip')];
    return { out: all.filter(e => { const r = e.getBoundingClientRect(); return r.bottom > sf.bottom + 1 || r.top < sf.top - 1 || r.right > sf.right + 1 || r.left < sf.left - 1; }).length,
      overlap: (() => { const tools = document.querySelector('.sumcol .sumtools').getBoundingClientRect(); return [...document.querySelectorAll('.hlvchip')].filter(e => e.getBoundingClientRect().bottom > tools.top + 1).length; })(),
      small: [...document.querySelectorAll('.hlvchip')].filter(e => e.getBoundingClientRect().width < 40).length }; });
    check(g.out === 0 && g.overlap === 0 && g.small === 0, `${label}: every skein fits on the board above the tools, 40px or more (${g.out} outside, ${g.overlap} under the tools, ${g.small} small)`); }
  if (want.ties){
    const u = st.unit.findIndex((v, i) => v !== i), a = st.unit[u], before = [st.side[a], st.side[u]];
    await click(page, await chipAt(page, u)); const a2 = await state(page);
    check(a2.side[a] !== before[0] && a2.side[u] !== before[1] && a2.moves === 1, `${label}: a tied skein takes its partner with it, for one move`);
    const t = await read(page); await click(page, t.tools[0]); st = await state(page);
  }
  if (want.pin){
    const before = st.side[st.pin]; await click(page, await chipAt(page, st.pin)); const a2 = await state(page);
    check(a2.side[a2.pin] === before && a2.moves === 0 && /pinned/.test(a2.prompt), `${label}: the pinned skein will not move, says so, and costs nothing (${a2.prompt})`);
  }
  st = await state(page);
  for (let guard = 0; guard < 14; guard++){ const q = await state(page); if (q.gone || q.good) { st = q; break; } const u = toMove(q); if (u < 0) break; await click(page, await chipAt(page, u)); st = q; }
  const end = await state(page);
  check(end.gone || end.good, `${label}: the fewest-moves plan wins`);
  if (!end.gone) check(end.exact && end.moves <= end.least, `${label}: and finishing in the fewest moves is marked (${end.moves} of ${end.least})`);
  await page.close();
}

/* ── Undo ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  /* a skein whose move does not balance the baskets, or the round would end before Undo is pressed */
  const d = s.trays[0].reduce((x, c) => x + c.v, 0) - s.trays[1].reduce((x, c) => x + c.v, 0);
  const before = left(s); const c = s.trays[0].find(c => d - 2 * c.v !== 0) || s.trays[1].find(c => d + 2 * c.v !== 0);
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
