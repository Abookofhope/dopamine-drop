/* The first rounds of a new player are guided.
 *
 *   - until three boards have been solved, a miss costs nothing (up to three a run), the prompt says
 *     it was free, and the rule is shown again on the next board
 *   - after that a miss costs what it always did
 *   - the second and third solves each get one short note, once, and the notes fit a 320px phone at
 *     the largest text size
 *   - the first time a run that solved something ends, Game Over points at the Room, and a tap goes
 *     there; a second run, or someone who has already seen the Room, is not shown it again
 *   - all of it in en, fr, es and de
 *
 * A run is held on one board (Odd Skein) with a probe-only pool, so a miss is something the script
 * does. Odd Skein is three boards a round and forgives a first wrong tap, so the script counts rounds
 * with the app's own counter (data-done on #play) and not taps. What a miss cost is read from the run's
 * clock (data-clock, set at the start of a round and again on a miss), so "free" is a number.
 *
 *   node tools/probe/guided.mjs
 */
import { chromium } from 'playwright';
import { openApp, startShuffle, BASE } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const oddAt = (page, wrong) => page.evaluate(wrong => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = tiles.map(rgb), key = c => c.join(',');
  const light = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  const dark = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1);
  const uniq = cols.findIndex(c => n[key(c)] === 1);
  let pick = /lightest|plus claire|más claro|hellste/i.test(prompt) ? light : /darkest|plus foncée|más oscuro|dunkelste/i.test(prompt) ? dark : uniq;
  if (wrong){ pick = tiles.findIndex((t, i) => !t.disabled && i !== light && i !== dark && i !== uniq); }
  if (pick < 0) return null;
  const r = tiles[pick].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, wrong);
const boardUp = async page => {
  await page.waitForFunction(() => { const t = document.querySelector('#surface .oddwrap .tile'); return t && !t.dataset.old && !t.disabled; },
    null, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(150);
};
const mark = page => page.evaluate(() => document.querySelectorAll('#surface .oddwrap .tile').forEach(t => { t.dataset.old = '1'; }));
const doneCount = page => page.evaluate(() => +document.getElementById('play').dataset.done || 0);
const state = page => page.evaluate(() => {
  const p = document.getElementById('play'), h = document.getElementById('howto');
  const vis = e => !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  return { miss: p.dataset.miss || '', clock: +p.dataset.clock, prompt: document.getElementById('prompt').textContent.trim(),
    howto: vis(h) && !h.classList.contains('gone') ? h.textContent.trim() : '' };
});

/* One round to its end. A hit waits for a fresh board each time; a miss taps wrong until the round gives up. */
async function playRound(page, step){
  const before = await doneCount(page);
  for (let i = 0; i < 12; i++){
    if (step === 'hit'){ await boardUp(page); await mark(page); }
    else await page.waitForFunction(() => [...document.querySelectorAll('#surface .oddwrap .tile')].some(t => !t.disabled), null, { timeout: 8000, polling: 100 });
    const at = await oddAt(page, step === 'miss');
    if (!at) return;
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(260);
    if (await doneCount(page) > before) return;
  }
}
/* A miss, with what the run's clock did across it. Taken at the start of the round, so the only time
   in the difference is the half second it took to tap. */
async function miss(page){
  await boardUp(page);
  const t0 = await page.evaluate(() => +document.getElementById('play').dataset.clock);
  await playRound(page, 'miss');
  const s = await state(page);
  return Object.assign(s, { cost: t0 - s.clock });
}

/* A page that has never been here: nothing in storage. The pool and the probe flag are set before the first load. */
async function fresh({ vw = 360, vh = 640, lang = 'en-US' } = {}){
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: true, locale: lang });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return { page, ctx };
}
/* Every toast title and its text, as they appear, so a note told once can be counted. */
const watchToasts = page => page.evaluate(() => {
  window.__toasts = [];
  setInterval(() => {
    const h = document.getElementById('achToast');
    if (!h || h.hidden) return;
    const b = h.querySelector('b').textContent;
    if (b && !window.__toasts.some(x => x.title === b))
      window.__toasts.push({ title: b, eyebrow: h.querySelector('em').textContent, desc: h.querySelector('small').textContent });
  }, 40);
});
const toasts = page => page.evaluate(() => window.__toasts || []);
const waitToast = (page, re) => page.waitForFunction(re => (window.__toasts || []).some(x => new RegExp(re, 'i').test(x.title)), re, { timeout: 9000, polling: 100 }).then(() => true, () => false);
async function endRun(page){
  await page.click('#quitBtn'); await page.waitForTimeout(300);
  await page.click('.pausebox .pauseEnd');
  await page.waitForFunction(() => { const o = document.getElementById('over'); return o && !o.hidden && o.getClientRects().length > 0; }, null, { timeout: 8000, polling: 100 });
  await page.waitForTimeout(500);
}
const roomCall = page => page.evaluate(() => {
  const b = document.getElementById('roomCall');
  if (!b) return { shown: false, text: '', h: 0, w: 0, within: false };   /* an older build has no such button */
  const r = b.getBoundingClientRect();
  return { shown: !b.hidden && r.height > 0, text: b.textContent.replace(/\s+/g, ' ').trim(), h: Math.round(r.height), w: Math.round(r.width),
    within: r.left >= 0 && r.right <= innerWidth };
});

/* ── 1. a new player's first rounds ── */
{
  const { page, ctx } = await fresh();
  await page.click('#wcStart');
  await watchToasts(page);
  await boardUp(page);

  const a = await miss(page);
  check(a.miss === 'learn', 'the first miss of a new player is free (' + a.miss + ')');
  check(a.cost < 2500, 'and the run\'s clock did not pay for it (' + a.cost + ' ms taken, the penalty is 4000)');
  check(/free while you learn/i.test(a.prompt), 'and the prompt says so (' + JSON.stringify(a.prompt) + ')');
  await boardUp(page);
  const next = await state(page);
  check(next.howto.length > 10, 'the rule is shown again on the next board (' + JSON.stringify(next.howto.slice(0, 40)) + ')');

  await playRound(page, 'hit');
  check(await waitToast(page, 'game'), 'the first solve says "That is the game"');
  await playRound(page, 'hit');
  check(await waitToast(page, 'two in a row'), 'the second solve says what a streak does');
  await playRound(page, 'hit');
  check(await waitToast(page, 'now it counts'), 'the third solve says the free misses are over');

  const b = await miss(page);
  check(b.miss === 'paid', 'after three solves a miss is paid for (' + b.miss + ')');
  check(b.cost >= 3500, 'the clock paid the 4 s penalty (' + b.cost + ' ms taken)');
  check(!/learn/i.test(b.prompt), 'and the prompt does not say it was free (' + JSON.stringify(b.prompt) + ')');

  await playRound(page, 'hit'); await playRound(page, 'hit');
  await page.waitForTimeout(3200);
  const all = await toasts(page);
  const count = re => all.filter(x => new RegExp(re, 'i').test(x.title)).length;
  check(count('two in a row') === 1 && count('now it counts') === 1, 'each note was told once (' + count('two in a row') + ', ' + count('now it counts') + ')');

  /* The Room, once. */
  await endRun(page);
  const rc = await roomCall(page);
  check(rc.shown, 'the first Game Over points at the Room (' + JSON.stringify(rc.text) + ')');
  check(/biscuit/i.test(rc.text), 'and names where the gift is (Biscuit and the daily gift)');
  check(rc.h >= 44 && rc.within, 'it is a 44px target inside the screen (' + rc.w + 'x' + rc.h + ')');
  if (rc.shown){ await page.click('#roomCall'); await page.waitForTimeout(500); }
  const room = await page.evaluate(() => { const r = document.getElementById('tabRoom'); return !!r && !r.hidden && r.getClientRects().length > 0; });
  check(room, 'tapping it opens the Room');
  /* A second run: solve one, end it. */
  await startShuffle(page);
  await boardUp(page);
  await playRound(page, 'hit');
  await endRun(page);
  const again = await roomCall(page);
  check(!again.shown, 'a second Game Over does not show it again');
  await ctx.close();
}

/* ── 2. three free misses, then it costs ── */
{
  const { page, ctx } = await fresh();
  await page.click('#wcStart');
  await boardUp(page);
  const seq = [];
  for (let i = 0; i < 4; i++){ const m = await miss(page); seq.push(m.miss); }
  check(seq.join(',') === 'learn,learn,learn,paid', 'three free misses in a run, then the fourth costs (' + seq.join(', ') + ')');
  await ctx.close();
}

/* ── 3. someone who has played is not coached ── */
{
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, { xp: 4000, runs: 12, solved: 80, seen: { odd: 1, order: 1 }, schema: 11, introRoom: true });
  await startShuffle(page);
  await watchToasts(page);
  await boardUp(page);
  const m = await miss(page);
  check(m.miss === 'paid', 'a returning player\'s miss costs as it always did (' + m.miss + ', ' + m.cost + ' ms)');
  await playRound(page, 'hit'); await playRound(page, 'hit');
  await page.waitForTimeout(3000);
  const all = await toasts(page);
  check(!all.some(x => /two in a row|now it counts/i.test(x.title)), 'and is told nothing about streaks (' + all.map(x => x.title).join(' | ') + ')');
  await endRun(page);
  check(!(await roomCall(page)).shown, 'and, having seen the Room, is not pointed at it');
  await page.close();
}

/* ── 4. the notes fit a 320px phone at the largest text size ── */
{
  const { page, ctx } = await fresh({ vw: 320, vh: 568 });
  await page.evaluate(() => { document.documentElement.setAttribute('data-ts', '150'); });
  await page.click('#wcStart');
  await watchToasts(page);
  await boardUp(page);
  await playRound(page, 'hit'); await playRound(page, 'hit');
  check(await waitToast(page, 'two in a row'), '320x568 at 150 percent: the second solve shows its note');
  const box = await page.evaluate(() => {
    const h = document.getElementById('achToast'), r = h.getBoundingClientRect();
    const s = h.querySelector('small'), b = h.querySelector('b');
    return { left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, top: Math.round(r.top),
      clipped: s.scrollWidth > s.clientWidth + 1 || b.scrollWidth > b.clientWidth + 1, wraps: getComputedStyle(s).whiteSpace };
  });
  check(box.right - box.left > 200 && box.left >= 0 && box.right <= box.vw, 'the note is on screen and inside a 320px screen (' + box.left + '..' + box.right + ')');
  check(!box.clipped && box.wraps === 'normal', 'and its words are not cut off (white-space ' + box.wraps + ')');
  await ctx.close();
}

/* ── 5. every language ── */
for (const [lang, loc, learn, streak, room] of [
  ['fr', 'fr-FR', /gratuit/i, /d.affil/i, /biscuit/i],
  ['es', 'es-ES', /gratis/i, /dos seguidos/i, /biscuit/i],
  ['de', 'de-DE', /gratis/i, /zwei am st/i, /biscuit/i]]){
  const { page, ctx } = await fresh({ lang: loc });
  await page.click('#wcStart');
  await watchToasts(page);
  await boardUp(page);
  const m = await miss(page);
  check(m.miss === 'learn' && learn.test(m.prompt), lang + ': the free miss is said in the player\'s language (' + JSON.stringify(m.prompt) + ')');
  await playRound(page, 'hit'); await playRound(page, 'hit');
  await waitToast(page, '.');
  const ok = await page.waitForFunction(re => (window.__toasts || []).some(x => new RegExp(re, 'i').test(x.title)), streak.source, { timeout: 9000, polling: 100 }).then(() => true, () => false);
  check(ok, lang + ': the second solve\'s note is in ' + lang + ' (' + (await toasts(page)).map(x => x.title).join(' | ') + ')');
  await endRun(page);
  const rc = await roomCall(page);
  check(rc.shown && room.test(rc.text), lang + ': Game Over\'s pointer is in ' + lang + ' (' + JSON.stringify(rc.text) + ')');
  await ctx.close();
}

check(errs.length === 0, 'no page errors' + (errs.length ? ' (' + errs[0] + ')' : ''));
await browser.close();
console.log(bad ? `\n${bad} check(s) FAILED` : '\nall checks passed');
process.exit(bad ? 1 : 0);
