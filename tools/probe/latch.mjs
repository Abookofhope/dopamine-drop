/* Latch Hook: the rows fill the board, every turn can be taken back, and a hint marks where to meet.
 *
 *   - the rows share the board (each at least 60px tall on a phone) instead of sitting in a small stack in the middle of it
 *   - Undo takes a turn back and gives its move back; Hint marks the cheapest column on every row for a moment, twice a round
 *   - turning each row the short way to the marked column wins; a finger dragged along a row slides it
 *   - on a 320px phone everything still fits, and in French the new buttons are in French
 *
 *   - 0.182.0: a link turns the row below (level 6, the other way from 12), a double hook (12), a ratchet row that will not turn
 *     back (20); the least turns is shown and is exact: that plan, by taps, wins and is marked
 *
 *   node tools/probe/latch.mjs
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
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { latch: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'latch');
  await page.waitForSelector('#surface .ltcwrap .ltcrow', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
const read = page => page.evaluate(() => {
  const rows = [...document.querySelectorAll('.ltcrow')], R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const sf = R(document.getElementById('surface'));
  const tools = [...document.querySelectorAll('.ltcwrap .sumtool')];
  return { n: rows.length, cols: rows[0].querySelectorAll('.ltccell').length, rows: rows.map(r => ({ ...R(r), at: [...r.querySelectorAll('.ltccell')].findIndex(c => c.classList.contains('notch')),
    meet: [...r.querySelectorAll('.ltccell')].findIndex(c => c.classList.contains('meet')), strip: R(r.querySelector('.ltcstrip')), left: R(r.children[0]), right: R(r.children[2]) })),
    surface: sf, tools: tools.map(b => ({ text: b.textContent.trim(), off: b.disabled, ...R(b) })), budget: (document.querySelector('.budget') || {}).textContent || '',
    lined: document.querySelector('.ltcwrap').classList.contains('good') };
});
const left = s => parseInt((s.budget.match(/\d+/) || ['0'])[0], 10);
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const mid = b => [b.x + b.w / 2, b.y + b.h / 2];

/* ── the rows fill the board, at a few levels and on a small phone ────────────────────────────────────────────────────── */
for (const [xp, label, vp, minRow] of [[0, 'a new player', { width: 400, height: 820 }, 60], [60000, 'a high level', { width: 400, height: 820 }, 48], [0, 'a new player on a 320px phone', { width: 320, height: 568 }, 48]]){
  const page = await open(xp, vp); const s = await read(page);
  const used = (s.rows[s.n - 1].y + s.rows[s.n - 1].h - s.rows[0].y) / s.surface.h;
  check(s.rows.every(r => r.h >= minRow), `${label}: every row is at least ${minRow}px tall (${s.rows.map(r => Math.round(r.h)).join(', ')})`);
  check(used > 0.55, `${label}: the rows use ${Math.round(used * 100)}% of the board's height`);
  check(s.tools.length === 2 && s.tools.every(t => t.y + t.h <= s.surface.y + s.surface.h + 1 && t.h >= 40 && t.x >= 0 && t.x + t.w <= vp.width), `${label}: Undo and Hint sit inside the board and are big enough to hit (${s.tools.map(t => t.text + ' ' + Math.round(t.h) + 'px').join(', ')})`);
  check(s.rows.every(r => r.left.w >= 40 && r.right.w >= 40), `${label}: the turn buttons are at least 40px wide`);
  await page.close();
}

/* ── Undo gives the move back ─────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); const s = await read(page);
  const r = s.rows[0]; const before = left(s);
  const [bx, by] = mid(r.right);
  await page.mouse.click(bx, by); await page.waitForTimeout(150);
  const a = await read(page);
  check(a.rows[0].at === (r.at + 1) % s.cols && left(a) === before - 1, `a turn moves the row one place and costs a move (${before} -> ${left(a)} left)`);
  check(!a.tools[0].off, 'and Undo is switched on');
  const [ux, uy] = mid(a.tools[0]); await page.mouse.click(ux, uy); await page.waitForTimeout(150);
  const b = await read(page);
  check(b.rows[0].at === r.at && left(b) === before && b.tools[0].off, `Undo puts the row back and gives the move back (${left(b)} left, Undo off again)`);
  await page.close();
}

/* ── Hint marks the cheapest column, twice ────────────────────────────────────────────────────────────────────────────── */
let target = null;
{
  const page = await open(0); const s = await read(page);
  const cost = c => s.rows.reduce((n, r) => n + Math.min((r.at - c + s.cols) % s.cols, (c - r.at + s.cols) % s.cols), 0);
  let best = 0; for (let c = 1; c < s.cols; c++) if (cost(c) < cost(best)) best = c;
  const [hx, hy] = mid(s.tools[1]); await page.mouse.click(hx, hy); await page.waitForTimeout(250);
  const a = await read(page);
  check(a.rows.every(r => r.meet === best), `Hint marks the cheapest column on every row (column ${best + 1})`);
  check(/1/.test(a.tools[1].text), `and uses one of the two hints (${a.tools[1].text})`);
  await page.waitForTimeout(3100);
  check((await read(page)).rows.every(r => r.meet === -1), 'and the mark goes away again');
  target = best;
  /* ── turning every row the short way to that column wins ── */
  let cur = await read(page);
  for (let i = 0; i < cur.n; i++){
    const r = cur.rows[i]; const fwd = (best - r.at + cur.cols) % cur.cols, back = (r.at - best + cur.cols) % cur.cols;
    const btn = fwd <= back ? r.right : r.left; const times = Math.min(fwd, back);
    for (let k = 0; k < times; k++){ const [x, y] = mid(btn); await page.mouse.click(x, y); await page.waitForTimeout(90); }
  }
  await page.waitForTimeout(600);
  check(await score(page) > 0, 'lining every row up on that column wins the round');
  await page.close();
}

/* ── a finger dragged along a row slides it ───────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); const s = await read(page);
  const r = s.rows[1], step = r.strip.w / s.cols, [x, y] = mid(r.strip);
  const want = (r.at + 2) % s.cols;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + step * 2, y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(200);
  check((await read(page)).rows[1].at === want, `dragging a row two places along slides it two places (${r.at} -> ${want})`);
  await page.close();
}

/* ── its own rules (0.182.0): links, a double hook, a ratchet, and the least turns, worked out exactly ─────────────── */
const st = page => page.evaluate(() => { const w = document.querySelector('.ltcwrap'); if (!w) return { gone: true }; const d = w.dataset;
  const rows = [...w.querySelectorAll('.ltcrow')].map(r => [...r.querySelectorAll('.ltccell')].map((c, i) => c.classList.contains('notch') ? i : -1).filter(i => i >= 0));
  return { lv: +d.lv, least: +d.least, used: +d.used, link: d.link.split(',').map(Number), rat: d.rat.split(',').map(Number), twin: +d.twin, rows,
    chains: w.querySelectorAll('.ltclink').length, stuck: w.querySelectorAll('.ltcturn.stuck').length, good: w.classList.contains('good'), exact: w.classList.contains('exact'),
    chip: (w.querySelector('.parchip') || {}).textContent || '', prompt: document.getElementById('prompt').textContent.trim(), plan: w._plan() }; });
for (const [xp, label, want, vp] of [[0, 'level 2', { links: 0, twin: false, rat: false }], [4000, 'level 11', { links: 1, twin: false, rat: false, word: /chained/ }],
  [30000, 'level 19', { links: 2, twin: true, rat: false, word: /two hooks/ }], [60000, 'level 23', { links: 2, twin: true, rat: true, word: /one way/ }],
  [60000, 'level 23 on a 320px phone', { links: 2, twin: true, rat: true, word: /one way/ }, { width: 320, height: 568 }]]){
  const page = await open(xp, vp); let s = await st(page);
  const nl = s.link.filter(Boolean).length;
  check(nl === want.links && (s.twin >= 0) === want.twin && s.rat.some(Boolean) === want.rat && s.chains === nl && s.stuck === (want.rat ? 1 : 0),
    `${label}: the rules on the board are the ones for the level (level ${s.lv}: ${nl} links, twin ${s.twin >= 0}, ratchet ${s.rat.some(Boolean)})`);
  check(s.link.every((v, r) => !v || !s.link[r + 1]), `${label}: no link chains three rows`);
  check(!want.word || want.word.test(s.prompt), `${label}: the prompt teaches the newest rule (${s.prompt})`);
  check(s.plan.sum === s.least && new RegExp(`0\\D+${s.least}$`).test(s.chip), `${label}: the chip shows the least turns (${s.chip})`);
  if (vp){ const g = await read(page); check(g.rows.every(r => r.y >= g.surface.y - 1 && r.y + r.h <= g.surface.y + g.surface.h + 1) && g.tools.every(t => t.y + t.h <= g.surface.y + g.surface.h + 1), `${label}: every row and button is on the board (${g.n} rows)`); }
  const btn = async (r, dir) => { const g = await read(page); const b = dir < 0 ? g.rows[r].left : g.rows[r].right; await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2); await page.waitForTimeout(70); };
  if (nl){
    const r = s.link.findIndex(Boolean), below = s.rows[r + 1][0];
    await btn(r, s.rat[r] || 1); const a = await st(page);
    const d = s.rat[r] || 1, cols = (await read(page)).cols;
    check(a.rows[r + 1][0] === ((below + s.link[r] * d) % cols + cols) % cols, `${label}: turning a linked row turns the one below it, ${s.link[r] > 0 ? 'the same way' : 'the other way'}`);
    const g = await read(page); await page.mouse.click(g.tools[0].x + g.tools[0].w / 2, g.tools[0].y + g.tools[0].h / 2); await page.waitForTimeout(80);
    s = await st(page); check(s.used === 0, `${label}: and Undo puts both back`);
  }
  if (want.rat){
    const r = s.rat.findIndex(Boolean), before = JSON.stringify(s.rows);
    await btn(r, -s.rat[r]); const a = await st(page);
    check(JSON.stringify(a.rows) === before && /other way/.test(a.prompt) && a.used === 0, `${label}: the ratchet row will not turn back, says so, and costs nothing (${a.prompt})`);
  }
  /* the exact plan, by taps */
  s = await st(page); const plan = s.plan;
  for (let r = 0; r < plan.ks.length; r++){ const k = plan.ks[r]; for (let i = 0; i < Math.abs(k); i++){ if ((await st(page)).gone) break; await btn(r, Math.sign(k)); } }
  await page.waitForTimeout(250); const end = await st(page);
  check(end.gone || end.good, `${label}: the least-turns plan, by taps alone, lines every row up (${plan.sum} turns)`);
  if (!end.gone) check(end.exact && end.used === end.least, `${label}: and finishing in the least turns is marked (${end.used} of ${end.least})`);
  await page.close();
}

/* ── French ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(s.tools.length === 2 && s.tools.every(t => t.text.length > 2 && !/\{|latch\./.test(t.text)) && s.tools[0].text !== 'Undo', `fr: the buttons are in French (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nLatch Hook fills the board and forgives a wrong turn');
process.exit(bad ? 1 : 0);
