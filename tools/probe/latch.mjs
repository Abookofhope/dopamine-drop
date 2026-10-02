/* Latch Hook: the rows fill the board, every turn can be taken back, and a hint marks where to meet.
 *
 *   - the rows share the board (each at least 60px tall on a phone) instead of sitting in a small stack in the middle of it
 *   - Undo takes a turn back and gives its move back; Hint marks the cheapest column on every row for a moment, twice a round
 *   - turning each row the short way to the marked column wins; a finger dragged along a row slides it
 *   - on a 320px phone everything still fits, and in French the new buttons are in French
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
