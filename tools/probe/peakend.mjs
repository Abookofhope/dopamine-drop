/* Game Over leads with the best true thing about the run (v0.147.0).
 *
 * The Peak-End rule: a session is remembered by its best moment and its end, so the end shows the best moment
 * first. Before, a run that solved nothing opened on a giant 0 and nothing else; a good run opened on the number.
 * Now the first line above the score is the run's peak: a new best, a Bow, the fastest Purrfect, ×5, a streak,
 * the quickest solve, or, for a run with no solves, the game that was met and its rule.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/peakend.mjs
 */
import { chromium } from 'playwright';
import { openApp } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const oddAt = page => page.evaluate(() => {
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
  const r = ts[odd].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const live = (page, sel) => page.waitForFunction(s => {
  const p = document.getElementById('play'), sf = document.getElementById('surface');
  return !p.hidden && !document.getElementById('count') && !!document.querySelector(s)
    && ![...sf.children].some(c => c.classList.contains('swap')) && document.getElementById('prompt').className === 'prompt';
}, sel, { timeout: 12000, polling: 60 }).then(() => page.waitForTimeout(150)).then(() => true, () => false);
async function open(pool, state = {}, locale = 'en-US'){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(p => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', p); }, pool);
  await openApp(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true }, state));
  await page.evaluate(() => document.getElementById('moodPlay').click());
  return { page, ctx };
}
async function endRun(page){
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForSelector('.pauseEnd', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('.pauseEnd').click());
  await page.waitForFunction(() => !document.getElementById('over').hidden, null, { timeout: 6000 });
  await page.waitForTimeout(400);
}
const peak = page => page.evaluate(() => { const p = document.getElementById('overPeak'); return p && !p.hidden ? p.textContent : ''; });
const order = page => page.evaluate(() => {
  const p = document.getElementById('overPeak'), s = document.getElementById('overScore');
  return p && s ? p.getBoundingClientRect().top < s.getBoundingClientRect().top : false;
});

/* ── 1. a run with no solves leads with the game that was met and its rule ── */
{
  const { page, ctx } = await open('latch');
  await live(page, '#surface .ltcwrap');
  await endRun(page);
  const p = await peak(page);
  check(/Latch Hook/.test(p), `a run with no solves names the game it met ("${p}")`);
  check(p.length > 'You met Latch Hook. '.length + 10, 'and says its rule');
  check(await order(page), 'above the score');
  await ctx.close();
}

/* ── 2. a run with Purrfects leads with one ── */
{
  const { page, ctx } = await open('odd', { purrfects: 3, pbGate: { calm: 999999, quick: 999999, full: 999999 }, pbBlitz: 999999 });
  for (let n = 0; n < 2; n++){
    await live(page, '#surface .oddwrap .tile');
    const s0 = await page.evaluate(() => (JSON.parse(localStorage.getItem('dd.v1')) || {}).solved | 0);
    for (let i = 0; i < 10; i++){
      const at = await oddAt(page); if (!at){ await page.waitForTimeout(80); continue; }
      await page.mouse.click(at.x, at.y); await page.waitForTimeout(90);
      if ((await page.evaluate(() => (JSON.parse(localStorage.getItem('dd.v1')) || {}).solved | 0)) > s0) break;
    }
  }
  await endRun(page);
  const p = await peak(page);
  check(/Purrfect/.test(p) && /Odd Skein/.test(p) && /\d\.\d s/.test(p), `a run with Purrfects leads with the fastest one ("${p}")`);
  await ctx.close();
}

/* ── 3. a new best leads ── */
{
  const { page, ctx } = await open('odd', { pbGate: { calm: 1, quick: 1, full: 1 }, pbBlitz: 1 });
  await live(page, '#surface .oddwrap .tile');
  for (let i = 0; i < 10; i++){
    const at = await oddAt(page); if (!at){ await page.waitForTimeout(80); continue; }
    await page.mouse.click(at.x, at.y); await page.waitForTimeout(90);
    if (await page.evaluate(() => document.getElementById('prompt').className !== 'prompt')) break;
  }
  await page.waitForTimeout(300);
  await endRun(page);
  const p = await peak(page);
  check(/new best/i.test(p), `a new best leads ("${p}")`);
  await ctx.close();
}

/* ── 4. in another language ── */
{
  const { page, ctx } = await open('latch', { lang: 'de' }, 'de-DE');
  await live(page, '#surface .ltcwrap');
  await endRun(page);
  const p = await peak(page);
  check(/kennengelernt/.test(p), `in German too ("${p}")`);
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
