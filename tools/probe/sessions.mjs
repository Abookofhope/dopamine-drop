/* Your sessions and the check-in (v0.174.0): what a session of play looks like, counted on this device and never sent.
 *
 *   1. Off by default: no check-in on the menu or on Game Over; the Stats card says nothing has been counted yet and
 *      that nothing is sent; its switch is off.
 *   2. Switched on: the menu asks how you feel before a session (three full-size choices); a tap is remembered. A real
 *      round of Quick Count is solved and the run ended: the session holds one run, the time to its first point and
 *      its play time, and Game Over asks how you feel now. The menu stops asking until the next session.
 *   3. Half an hour away starts a new session, and the menu asks again.
 *   4. The numbers (in the Last 14 days panel) from a known history: medians, the Cozy share, the tuck-ins and the before-and-after line;
 *      thirty sessions are kept, no more.
 *   5. Nothing leaves the device: every request the page made went to the game's own server. axe passes on the card
 *      and on both check-ins.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/sessions.mjs
 */
import { chromium } from 'playwright';
import { BASE, openApp, goTab, openMode, axeOn } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errs = [], hosts = new Set();
page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
page.on('request', r => { try { hosts.add(new URL(r.url()).host); } catch {} });
await page.addInitScript(() => { try { localStorage.setItem('dd.probe', '1'); } catch {} });
await openApp(page, { door: 'challenge' });

const shown = id => page.evaluate(i => { const e = document.getElementById(i); return !!e && !e.hidden && e.getClientRects().length > 0; }, id);
const sessions = () => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).sessions || []);
const openCard = async () => {
  await goTab(page, 'Stats'); await page.waitForTimeout(250);
  await page.evaluate(() => { const h = document.getElementById('accH_s-act'); if (h.getAttribute('aria-expanded') !== 'true') h.click(); });
  await page.waitForTimeout(350);
};
/* Quit asks first in a run that has begun: end it from the pause sheet. */
const endTheRun = async () => {
  await page.evaluate(() => document.getElementById('quitBtn').click()); await page.waitForTimeout(350);
  await page.evaluate(() => { const e = document.querySelector('.pausebox .pauseEnd'); if (e && e.getClientRects().length) e.click(); });
};
const card = () => page.evaluate(() => ({ count: document.getElementById('sesCount').textContent, len: document.getElementById('sesLen').textContent,
  first: document.getElementById('sesFirst').textContent, cozy: document.getElementById('sesCozy').textContent,
  feel: document.getElementById('sesFeel').hidden ? '' : document.getElementById('sesFeel').textContent, note: document.getElementById('sesNote').textContent,
  sw: document.getElementById('swFeel').getAttribute('aria-checked') }));

/* ── 1. off by default ── */
await goTab(page, 'Play'); await page.waitForTimeout(250);
check(!(await shown('feelBefore')), 'with the check-in off, the menu does not ask how you feel');
await openCard();
let c = await card();
check(c.sw === 'false', 'the check-in switch is off by default');
check(/Sessions: 0/.test(c.count) && c.len === '—' && /ever sent/.test(c.note), `with nothing played the card says so, and that nothing is sent (${c.count}; ${c.note})`);

/* ── 2. switched on: before, a solved round, after ── */
await page.click('#swFeel'); await page.waitForTimeout(200);
check((await card()).sw === 'true' && (await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).feelCheck)) === true, 'the switch turns the check-in on, and it is saved');
await goTab(page, 'Play'); await page.waitForTimeout(300);
check(await shown('feelBefore'), 'switched on, the menu asks how you feel before a session');
const sizes = await page.$$eval('#feelBefore [data-feel]', bs => bs.map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
check(sizes.length === 3 && sizes.every(([w, h]) => w >= 44 && h >= 44), `three choices, each a full-size target (${sizes.map(s => s.join('x')).join(', ')})`);
let ax = await axeOn(page, '#feelBefore');
check(!ax.length, `the menu's check-in passes axe (${ax.map(x => x.id).join(', ') || 'clean'})`);
await page.click('#feelBefore [data-feel="1"]'); await page.waitForTimeout(150);
let l = await sessions();
check(l.length === 1 && l[0].b === 1 && l[0].runs === 0 && await page.getAttribute('#feelBefore [data-feel="1"]', 'aria-pressed') === 'true',
  `a tap is remembered, and opens the session (${JSON.stringify(l[0] || {})})`);

await openMode(page, 'count', '#surface .answers[data-answer]');
await page.waitForFunction(() => !document.getElementById('count'), null, { timeout: 9000 }).catch(() => {});
await page.waitForTimeout(400);
/* a round can hold several boards: answer each until the solve is banked */
const solvedNow = () => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).solved);
const solved0 = await solvedNow();
let tapped = false;
for (let i = 0; i < 8; i++){
  const at = await page.evaluate(() => { const row = document.querySelector('#surface .answers'); const b = row && [...row.querySelectorAll('.abtn')].find(x => x.textContent.trim() === row.dataset.answer && !x.disabled);
    if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  if (at){ await page.mouse.click(at[0], at[1]); tapped = true; }
  await page.waitForTimeout(700);
  if ((await solvedNow()) > solved0) break;
}
await endTheRun();
await page.waitForFunction(() => !document.getElementById('over').hidden, null, { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(500);
l = await sessions();
const s0 = l[l.length - 1] || {};
check(tapped && l.length === 1 && s0.runs === 1, `a solved round of Quick Count is one run of the same session (${l.length} session, ${s0.runs} run)`);
check(s0.first > 0 && s0.first < 60000 && s0.ms > 0, `the session holds the time to its first point and its play time (${s0.first} ms, ${s0.ms} ms)`);
check(await shown('feelAfter'), 'Game Over asks how you feel now');
ax = await axeOn(page, '#feelAfter');
check(!ax.length, `Game Over's check-in passes axe (${ax.map(x => x.id).join(', ') || 'clean'})`);
await page.click('#feelAfter [data-feel="3"]'); await page.waitForTimeout(150);
check((await sessions()).at(-1).a === 3, 'the answer after is remembered with the one before');
await page.evaluate(() => document.getElementById('homeBtn').click()); await page.waitForTimeout(400);
await goTab(page, 'Play'); await page.waitForTimeout(250);
check(!(await shown('feelBefore')), 'once the session has a run, the menu stops asking');
await openCard();
c = await card();
check(/Sessions: 1/.test(c.count) && /1 better/.test(c.feel) && /not a measurement/.test(c.feel), `the card counts it, and the before-and-after line says what it is (${c.count}; ${c.feel})`);

/* ── 3. half an hour away is a new session ── */
await page.evaluate(() => window.__sess.age(31 * 60000));
await goTab(page, 'Play'); await page.waitForTimeout(250);
check(await shown('feelBefore') && await page.getAttribute('#feelBefore [data-feel="1"]', 'aria-pressed') === 'false', 'half an hour away, the menu asks again, fresh');
await openMode(page, 'count', '#surface .answers');
await page.waitForTimeout(600);
await endTheRun(); await page.waitForTimeout(400);
l = await sessions();
check(l.length === 2 && l[1].runs === 1 && l[1].first == null, `and the next run opens a second session, with no point yet (${l.length}, ${JSON.stringify(l[1] || {})})`);
await page.evaluate(() => document.getElementById('homeBtn').click()); await page.waitForTimeout(400);

/* ── 4. the numbers, from a known history ── */
const known = await page.evaluate(() => {
  const S = (ms, first, runs, cozy, tuck, b, a) => ({ start: 1, last: 1, ms, first, runs, cozy, tuck, b, a });
  window.__sess.set([S(60000, 2000, 1, 1, false, 1, 3), S(180000, 4000, 2, 0, true, 2, 2), S(600000, null, 1, 0, false, 3, 1), S(0, null, 0, 0, false, 2, 0)]);
  return true;
});
c = await card();
check(c.len === '3 min' && c.first === '3 s' && c.cozy === '25%', `medians and the Cozy share, from runs only (${c.len}, ${c.first}, ${c.cozy})`);
check(/Sessions: 3/.test(c.count) && /1 tucked in/.test(c.count), `a session with no run is not counted, and tuck-ins are (${c.count})`);
check(/of 3 check-ins: 1 better, 1 the same, 1 lower/.test(c.feel), `before and after, only where both were given (${c.feel})`);
ax = await axeOn(page, '[data-acc="s-act"]');
check(!ax.length, `the card passes axe (${ax.map(x => x.id).join(', ') || 'clean'})`);

const kept = await page.evaluate(() => { for (let i = 0; i < 35; i++){ window.__sess.age(3600000); window.__sess.open(); } return window.__sess.count(); });
check(kept === 30, `thirty sessions are kept, no more (${kept})`);

/* ── 5. nothing leaves the device ── */
const own = new URL(BASE).host, other = [...hosts].filter(h => h !== own);
check(!other.length, `every request went to the game's own server (${other.join(', ') || own})`);
check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nyour sessions are counted on this device, and the check-in asks only when switched on');
process.exit(bad ? 1 : 0);
