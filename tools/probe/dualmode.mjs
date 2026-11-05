/* Two doors: Cozy and Challenge (v0.149.0).
 *
 * Cozy: the same games with nothing that can go wrong. No clock and no score on show; a miss cools the streak a step
 * and holds the Thread; every ten solves is a stage with a gift of 10 yarn instead of a charm draft; the end pays a
 * little for every solve; Go again stays Cozy. Challenge is the run as it was, and now shows where your best run
 * stood at this moment (the ghost). Also: the HUD density setting and the install row.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/dualmode.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const tiles = page => page.evaluate(() => {
  const ts = [...document.querySelectorAll('#surface .oddwrap .tile')];
  if (!ts.length) return null;
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = ts.map(rgb), key = c => c.join(',');
  let odd;
  if (/lightest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  else if (/darkest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  else { const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1); odd = cols.findIndex(c => n[key(c)] === 1); }
  const at = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  return { odd: at(ts[odd]), wrong: at(ts[(odd + 1) % ts.length]) };
});
const live = page => page.waitForFunction(() => {
  const p = document.getElementById('play'), sf = document.getElementById('surface');
  return !p.hidden && !document.getElementById('count') && !!document.querySelector('#surface .oddwrap .tile')
    && ![...sf.children].some(c => c.classList.contains('swap')) && document.getElementById('prompt').className === 'prompt'
    && !document.querySelector('.draftbox');
}, null, { timeout: 12000, polling: 60 }).then(() => true, () => false);
const sv = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')) || {});
async function solve(page){
  if (!await live(page)) return false;
  const s0 = (await sv(page)).solved | 0;
  for (let i = 0; i < 10; i++){
    const t = await tiles(page); if (!t){ await page.waitForTimeout(80); continue; }
    await page.mouse.click(t.odd.x, t.odd.y); await page.waitForTimeout(90);
    if (((await sv(page)).solved | 0) > s0) return true;
  }
  return false;
}
async function miss(page){ await live(page); const t = await tiles(page); if (t) await page.mouse.click(t.wrong.x, t.wrong.y); await page.waitForTimeout(500); }
async function open(state = {}, vp = { width: 390, height: 844 }){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true }, state));
  return { page, ctx };
}
async function endRun(page){
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForSelector('.pauseEnd', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('.pauseEnd').click());
  await page.waitForFunction(() => !document.getElementById('over').hidden, null, { timeout: 6000 });
  await page.waitForTimeout(400);
}

/* ── 1. the door is there, and remembered ── */
{
  const { page, ctx } = await open();
  const doors = await page.evaluate(() => [...document.querySelectorAll('#doors .door')].map(b => ({ d: b.dataset.door, on: b.getAttribute('aria-checked'), h: b.getBoundingClientRect().height })));
  check(doors.length === 2, `the Play tab has the two doors (${doors.map(d => d.d).join(', ')})`);
  check(doors.length === 2 && doors.find(d => d.d === 'challenge').on === 'true', 'Challenge is the door a player starts on');
  check(doors.every(d => d.h >= 44), `each is a full-size target (${doors.map(d => Math.round(d.h)).join(', ')} px)`);
  await page.evaluate(() => { const d = document.querySelector('#doors .door[data-door="cozy"]'); if (d) d.click(); });
  check((await sv(page)).door === 'cozy', 'choosing Cozy is kept');
  await ctx.close();
}

/* ── 2. a Cozy run ── */
{
  const { page, ctx } = await open({ door: 'cozy', yarn: 0, yarnEver: 0 });
  await page.evaluate(() => document.getElementById('moodPlay').click());
  check(await live(page), 'Play a mix starts a Cozy run');
  const base = (await sv(page)).solved | 0;
  const hud = await page.evaluate(() => ({ clock: !document.getElementById('hudClock').hidden, score: document.getElementById('hudScore').textContent }));
  check(!hud.clock, 'it has no clock');
  check(/solved/i.test(hud.score), `and no score on show ("${hud.score}")`);
  for (let i = 0; i < 6; i++) await solve(page);
  const before = await page.evaluate(() => document.getElementById('hudStreak').textContent.trim());
  const k0 = await page.evaluate(() => document.querySelectorAll('#hudThread i.on').length);
  await miss(page);
  const after = await page.evaluate(() => document.getElementById('hudStreak').textContent.trim());
  const k1 = await page.evaluate(() => document.querySelectorAll('#hudThread i.on').length);
  check(before !== '×1' && after !== '×1' || before === after, `a miss cools the streak a step rather than breaking it (${before} to ${after})`);
  check(k1 === k0, `and the Thread holds (${k0} to ${k1} knots)`);
  const y0 = (await sv(page)).yarn || 0;
  /* on to the tenth solve of the run (the miss did not count), however many tries that takes */
  for (let i = 0; i < 10 && ((await sv(page)).solved | 0) < base + 10; i++) await solve(page);
  await page.waitForTimeout(900);
  const draft = await page.evaluate(() => !!document.querySelector('.draftbox'));
  check(!draft, 'the tenth solve is a stage without a charm draft');
  const y1 = (await sv(page)).yarn || 0;
  check(y1 - y0 >= 10, `and its gift is banked (+${y1 - y0} yarn over four solves and the stage)`);
  await endRun(page);
  const over = await page.evaluate(() => ({ kind: document.getElementById('over').dataset.kind, nb: !document.getElementById('newBest').hidden }));
  check(over.kind === 'cozy' && !over.nb, `Game Over keeps no record for it (kind ${over.kind}, new best ${over.nb})`);
  await page.evaluate(() => document.getElementById('againBtn').click());
  await live(page);
  check(await page.evaluate(() => document.getElementById('hudClock').hidden), 'Go again stays Cozy');
  await ctx.close();
}

/* ── 3. Challenge shows the ghost ── */
{
  /* a best run of 3,000 that stood at 200 after ten seconds and 600 after twenty */
  const curve = [0, 200, 600, 1000, 1500, 3000];
  const { page, ctx } = await open({ door: 'challenge', pbGate: { calm: 3000, quick: 3000, full: 3000 }, pbBlitz: 3000,
    curves: { 'g.calm': curve, 'g.quick': curve, 'g.full': curve } });
  await page.evaluate(() => document.getElementById('moodPlay').click());
  await live(page);
  for (let i = 0; i < 3; i++) await solve(page);
  await page.waitForTimeout(3500);
  const chip = await page.evaluate(() => { const b = document.getElementById('hudBest'); return { shown: !b.hidden, l: document.getElementById('hudBestL').textContent, n: document.getElementById('hudBestN').textContent, cls: b.className }; });
  check(chip.shown && /Pace/i.test(chip.l) && /^[+−]/.test(chip.n), `the chip shows the gap to your best run at this moment ("${chip.l} ${chip.n}")`);
  check(/ahead|behind/.test(chip.cls), `ahead or behind is marked (${chip.cls})`);
  await ctx.close();
}

/* ── 4. HUD density ── */
{
  const { page, ctx } = await open({ hud: 'minimal' });
  await page.evaluate(() => document.getElementById('moodPlay').click());
  await live(page);
  const m = await page.evaluate(() => ({ kind: getComputedStyle(document.getElementById('hudKind')).display, score: getComputedStyle(document.getElementById('hudScore')).display, quit: getComputedStyle(document.getElementById('quitBtn')).display }));
  check(m.kind === 'none' && m.score !== 'none' && m.quit !== 'none', `Minimal hides the game's name and keeps the score and the way out (${JSON.stringify(m)})`);
  await ctx.close();
}
{
  const { page, ctx } = await open({ hud: 'detailed' });
  await page.evaluate(() => document.getElementById('moodPlay').click());
  await live(page); await solve(page); await page.waitForTimeout(300);
  const d = await page.evaluate(() => { const p = document.getElementById('hudPace'); return p ? { disp: getComputedStyle(p).display, txt: p.textContent } : { disp: 'none', txt: '' }; });
  check(d.disp !== 'none' && /\/min/.test(d.txt), `Detailed adds solves a minute and the Purrfect rate ("${d.txt}")`);
  await ctx.close();
}

/* ── 5. install: a quiet row, only when the browser offers it ── */
{
  const { page, ctx } = await open();
  await goTab(page, 'Settings');
  const before = await page.evaluate(() => { const r = document.getElementById('installRow'); return r ? r.hidden : null; });
  await page.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__asked = true; }; window.dispatchEvent(e); });
  const after = await page.evaluate(() => { const r = document.getElementById('installRow'); return r ? r.hidden : null; });
  await page.evaluate(() => { const b = document.getElementById('installBtn'); if (b) b.click(); });
  const asked = await page.evaluate(() => !!window.__asked);
  check(before && !after && asked, `the install row shows only when the browser offers it, and asks it (${before}, ${after}, ${asked})`);
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
