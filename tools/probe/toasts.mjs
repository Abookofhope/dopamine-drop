/* Notices never cut into a round (v0.146.0).
 *
 * Before: every toast slid down over the top of the screen, in a run as well, covering the pause button and the clock;
 * it could not be tapped away (pointer-events:none); a cat's bond deepening popped up mid-round with a fanfare; and
 * every toast played the level-up sound, so with captions on a stage beat or a coach note read "Rising notes: level up".
 * Now: news from the room waits for Game Over ("While you played"), notes in a run sit under the score, a tap puts any
 * notice away, and a notice has its own small sound, uncaptioned.
 *
 *   PORT=8501 SITE=/path/to/built node tools/probe/toasts.mjs
 */
import { chromium } from 'playwright';
import { openApp } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const oddAt = page => page.evaluate(() => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
  if (!tiles.length) return null;
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = tiles.map(rgb), key = c => c.join(',');
  let odd;
  if (/lightest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  else if (/darkest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  else { const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1); odd = cols.findIndex(c => n[key(c)] === 1); }
  const r = tiles[odd].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const live = page => page.waitForFunction(() => {
  const p = document.getElementById('play'), sf = document.getElementById('surface');
  return !p.hidden && !document.getElementById('count') && !!document.querySelector('#surface .oddwrap .tile')
    && ![...sf.children].some(c => c.classList.contains('swap'));
}, null, { timeout: 12000, polling: 100 }).then(() => page.waitForTimeout(300)).then(() => true, () => false);
/* Odd Skein can take more than one find a round (it has stages), so tap the odd one until the round is solved. */
const solvedNow = page => page.evaluate(() => (JSON.parse(localStorage.getItem('dd.v1')) || {}).solved | 0);
async function solveOne(page){
  if (!await live(page)) return false;
  const s0 = await solvedNow(page);
  for (let i = 0; i < 8; i++){
    const at = await oddAt(page); if (!at){ await page.waitForTimeout(150); continue; }
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(260);
    if (await solvedNow(page) > s0) return true;
  }
  return false;
}
/* Every toast title as it appears, with whether a run was on at that moment. */
const watch = page => page.evaluate(() => {
  window.__seen = [];
  const h = document.getElementById('achToast');
  new MutationObserver(() => {
    if (h.hidden) return;
    const b = h.querySelector('b').textContent, e = h.querySelector('em').textContent;
    const inRun = !document.getElementById('play').hidden && document.getElementById('over').hidden;
    if (b && !window.__seen.some(x => x.b === b)) window.__seen.push({ b, e, inRun });
  }).observe(h, { attributes: true, subtree: true, childList: true, characterData: true });
});
async function open(state, vp = { width: 390, height: 844 }){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true }, state));
  await watch(page);
  return { page, ctx };
}
async function endRun(page){
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForSelector('.pauseEnd', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('.pauseEnd').click());
  await page.waitForFunction(() => !document.getElementById('over').hidden, null, { timeout: 6000 });
  await page.waitForTimeout(500);
}
const overlap = (a, b) => a && b && a.width && b.width && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/* ── 1. a cat's bond deepening waits for Game Over ── */
{
  const { page, ctx } = await open({ pals: { biscuit: { bond: 59, pet: null, bow: '' } }, palsOn: ['biscuit'] });
  await page.evaluate(() => document.getElementById('moodPlay').click());
  check(await solveOne(page), 'a board is solved with Biscuit riding along (bond 59 of 60)');
  await page.waitForTimeout(1600);
  const seen = await page.evaluate(() => window.__seen);
  const midRun = seen.filter(x => x.inRun && /biscuit/i.test(x.e + ' ' + x.b));
  check(!midRun.length, `no bond notice pops up during the round (${midRun.map(x => x.e + ': ' + x.b).join(' | ') || 'none'})`);
  const bond = await page.evaluate(() => (JSON.parse(localStorage.getItem('dd.v1')).pals.biscuit || {}).bond);
  check(bond >= 60, `the bond itself is banked at once (${bond})`);
  await endRun(page);
  const held = await page.evaluate(() => { const b = document.getElementById('overHeld'); return b && !b.hidden ? b.innerText.replace(/\s+/g, ' ') : ''; });
  check(/biscuit/i.test(held), `Game Over lists it under While you played ("${held.slice(0, 90)}")`);
  await ctx.close();
}

/* ── 2. a note in a run sits under the score, not over the pause button or the clock ── */
for (const vp of [{ width: 390, height: 844 }, { width: 320, height: 568 }]){
  /* Somebody's very first solve, which has a note of its own. */
  const { page, ctx } = await open({ solved: 0, runs: 3, captions: true }, vp);
  await page.evaluate(() => document.getElementById('moodPlay').click());
  check(await solveOne(page), `${vp.width}x${vp.height}: the first board is solved`);
  const shown = await page.waitForFunction(() => { const h = document.getElementById('achToast'); return !h.hidden && h.classList.contains('in'); },
    null, { timeout: 3000, polling: 50 }).then(() => true, () => false);
  check(shown, `${vp.width}x${vp.height}: the first solve's note shows`);
  await page.waitForTimeout(450);
  const g = await page.evaluate(() => {
    const r = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
    return { toast: r('achToast'), quit: r('quitBtn'), clock: r('hudClock'), score: r('hudScore'), cap: (document.getElementById('sndCapTxt') || {}).textContent || '' };
  });
  check(!overlap(g.toast, g.quit), `${vp.width}x${vp.height}: it does not cover the pause button`);
  check(!overlap(g.toast, g.clock), `${vp.width}x${vp.height}: or the clock`);
  check(!overlap(g.toast, g.score), `${vp.width}x${vp.height}: or the score (toast top ${g.toast && Math.round(g.toast.top)}, score bottom ${g.score && Math.round(g.score.bottom)})`);
  check(g.toast && g.toast.left >= 0 && g.toast.right <= vp.width, `${vp.width}x${vp.height}: and it is on screen`);
  /* 3. captions: the note is not called a level-up */
  check(!/level/i.test(g.cap), `${vp.width}x${vp.height}: with captions on, the note is not captioned as a level-up ("${g.cap}")`);
  /* 4. a tap puts it away */
  if (g.toast){
    await page.mouse.click((g.toast.left + g.toast.right) / 2, (g.toast.top + g.toast.bottom) / 2);
    const gone = await page.waitForFunction(() => { const h = document.getElementById('achToast'); return h.hidden || !h.classList.contains('in'); },
      null, { timeout: 600, polling: 30 }).then(() => true, () => false);
    check(gone, `${vp.width}x${vp.height}: a tap puts it away`);
  }
  await ctx.close();
}

/* ── 5. outside a run a notice is still at the top, and can be tapped away ── */
{
  const { page, ctx } = await open({ gift: { last: '', streak: 0 }, captions: true });
  await page.evaluate(() => document.querySelector('[data-tab="Room"]').click());
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.querySelector('#giftCard .wclaim'); if (b) b.click(); });
  const top = await page.waitForFunction(() => { const h = document.getElementById('achToast'); return !h.hidden && h.classList.contains('in') ? h.getBoundingClientRect().top : 0; },
    null, { timeout: 3000, polling: 50 }).then(h => h.jsonValue(), () => -1);
  check(top >= 0 && top < 80, `in the menus the notice is at the top of the screen (${Math.round(top)} px)`);
  /* Collecting the gift plays rising chimes and shows a notice; neither is a level-up or a streak. */
  await page.waitForTimeout(250);
  const cap = await page.evaluate(() => (document.getElementById('sndCapTxt') || {}).textContent || '');
  check(cap && !/level|streak/i.test(cap), `with captions on, collecting the gift is not captioned as a level-up or a streak ("${cap}")`);
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
