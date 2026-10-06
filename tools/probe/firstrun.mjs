/* The first thirty seconds of a brand-new player: no save at all, no help.
 *
 *   - the welcome screen's Start button is on the first screen (or reachable by scrolling the panel)
 *     on every phone shape, so the first tap can start a run
 *   - the first run opens on the two plainest boards (Odd Skein, then Count the Stitches), every
 *     time, so the first solve does not depend on the draw
 *   - the first solve lands within 15 seconds of that tap, and says so once
 *   - a returning player is not given the opening again
 *   - a step up the streak sends a second token to the multiplier, and Game Over's perk and yarn
 *     lines count up and fill from where the run found them
 *
 *   node tools/probe/firstrun.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, BASE } from './harness.mjs';

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
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));

/* A page that has never been here: no seeded save, nothing in storage. */
async function fresh(vp, lang){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, locale: lang || 'en-US' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return { page, ctx };
}

/* ── 1. the welcome screen leads to a first tap on every shape ── */
for (const [w, h, label] of [[320, 568, 'small phone'], [360, 640, 'phone'], [390, 844, 'tall phone'], [568, 320, 'small phone on its side'], [844, 390, 'phone on its side']]){
  const { page, ctx } = await fresh({ width: w, height: h });
  const g = await page.evaluate(() => {
    const wc = document.getElementById('welcome'), b = document.getElementById('wcStart').getBoundingClientRect(), p = wc.querySelector('.panel');
    const top = document.elementFromPoint(Math.min(innerWidth - 1, b.left + b.width / 2), Math.min(innerHeight - 1, b.top + b.height / 2));
    return { shown: !wc.hidden, inside: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth,
      scrolls: p.scrollHeight > p.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(p).overflowY) || wc.scrollHeight > wc.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(wc).overflowY),
      h: Math.round(b.height), top: !!top && !!top.closest('#wcStart'), y: Math.round(b.top), bottom: Math.round(b.bottom) };
  });
  check(g.shown, `${w}x${h} (${label}): a new player is greeted`);
  check(g.inside && g.top || g.scrolls, `${w}x${h}: the Start button is on screen and topmost, or the panel scrolls to it (y ${g.y}-${g.bottom} of ${h}${g.scrolls ? ', scrolls' : ''})`);
  if (w <= 390 && h >= 560) check(g.inside && g.top, `${w}x${h}: and on a portrait phone it needs no scrolling at all`);
  check(g.h >= 44, `${w}x${h}: it is a 44px target (${g.h}px)`);
  await ctx.close();
}

/* ── 2. the first run, five fresh visits: the opening, and the clock ── */
const times = [];
for (let visit = 0; visit < 5; visit++){
  const { page, ctx } = await fresh({ width: 360, height: 640 });
  await page.click('#wcStart');
  const t0 = Date.now();
  const first = await page.waitForSelector('#surface .oddwrap .tile, #surface .orderbox, #surface .tile', { timeout: 9000 }).then(() => page.evaluate(() => !!document.querySelector('#surface .oddwrap .tile')), () => null);
  check(first === true, `visit ${visit + 1}: the first board is Odd Skein`);
  let solvedAt = 0;
  for (let k = 0; k < 8 && !solvedAt; k++){
    await page.waitForTimeout(450);
    if (await score(page) > 0){ solvedAt = Date.now() - t0; break; }
    const at = await oddAt(page);
    if (at){ await page.mouse.click(at.x, at.y); await page.waitForTimeout(500); }
    if (await score(page) > 0) solvedAt = Date.now() - t0;
  }
  times.push(solvedAt);
  check(solvedAt > 0 && solvedAt <= 15000, `visit ${visit + 1}: the first solve comes ${(solvedAt / 1000).toFixed(1)} s after the first tap (limit 15)`);
  if (visit === 0){
    await page.waitForTimeout(700);
    const toast = await page.evaluate(() => { const t = document.getElementById('achToast'); return { shown: !t.hidden, title: t.querySelector('b').textContent, eyebrow: t.querySelector('em').textContent }; });
    check(toast.shown && /That is the game/.test(toast.title), `the first solve says so ("${toast.eyebrow}: ${toast.title}")`);
    /* the second board is the stitches in order */
    let order = false;
    for (let k = 0; k < 14 && !order; k++){ await page.waitForTimeout(250); order = await page.evaluate(() => !!document.querySelector('#surface .orderbox')); }
    check(order, 'and the next board is Count the Stitches');
  }
  await ctx.close();
}
check(times.every(x => x > 0), `five fresh visits all reached a first solve (${times.map(x => (x / 1000).toFixed(1)).join(', ')} s)`);

/* ── 3. a player who has been here is not given the opening again ── */
{
  /* Eight starts of Just Play for somebody with a history: if the opening leaked, every first board would be Odd Skein. */
  let odd = 0, started = 0;
  for (let k = 0; k < 8; k++){
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
    page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
    await openApp(page, { runs: 6, solved: 40, xp: 900, onboarded: true, sound: false, haptics: false, schema: 11 });
    await page.evaluate(() => document.getElementById('endlessBtn').click());
    const ok = await page.waitForFunction(() => !document.getElementById('count') && document.querySelector('#surface') && document.querySelector('#surface').children.length > 0, null, { timeout: 9000, polling: 100 }).then(() => true, () => false);
    if (ok){ started++; if (await page.evaluate(() => !!document.querySelector('#surface .oddwrap'))) odd++; }
    await page.close();
  }
  check(started >= 6, `a returning player's runs start (${started} of 8)`);
  check(odd < started, `and they are not all Odd Skein first (${odd} of ${started}): the opening is for the very first run only`);
}

/* ── 4. a step up the streak sends a second token; Game Over's lines pay out in view ── */
async function marathon(reduce){
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: reduce, xp: 400, runs: 12, solved: 80, lifetime: 30000, sound: false, haptics: false, onboarded: true, seen: { odd: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'odd');
  await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(900);
  let maxFly = 0, solves = 0;
  for (let k = 0; k < 40 && solves < 9; k++){
    await page.waitForSelector('#surface .oddwrap .tile'); await page.waitForTimeout(350);
    const before = await score(page);
    const at = await oddAt(page); if (!at) continue;
    await page.mouse.click(at.x, at.y);
    for (let w = 0; w < 9; w++){ await page.waitForTimeout(45); maxFly = Math.max(maxFly, await page.evaluate(() => document.querySelectorAll('.flyer').length)); }
    await page.waitForTimeout(250);
    if (await score(page) > before) solves++;
  }
  return { page, maxFly, solves };
}
{
  const { page, maxFly, solves } = await marathon(false);
  check(solves >= 6, `a streak was built (${solves} solves)`);
  check(maxFly >= 2, `a step up the streak sent a second token (${maxFly} in the air at once)`);
  await page.close();
}
{
  const { page, maxFly } = await marathon(true);
  check(maxFly === 0, `reduced motion: no tokens (${maxFly})`);
  await page.close();
}
{
  /* lose, and watch the perk line fill from where the run found it */
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: false, xp: 400, runs: 12, solved: 80, lifetime: 52000, sound: false, haptics: false, onboarded: true, seen: { odd: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'odd');
  await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(900);
  for (let k = 0; k < 6; k++){
    await page.waitForSelector('#surface .oddwrap .tile'); await page.waitForTimeout(400);
    if (await score(page) >= 2) break;
    const at = await oddAt(page); if (at){ await page.mouse.click(at.x, at.y); await page.waitForTimeout(600); }
  }
  let first = null;
  for (let k = 0; k < 16 && !first; k++){
    if (await page.evaluate(() => !document.getElementById('over').hidden)) break;
    await page.evaluate(() => { const t = document.querySelector('#surface .tile:not(.ruled):not([disabled])'); if (t) t.click(); });
    for (let w = 0; w < 40 && !first; w++){
      await page.waitForTimeout(60);
      if (await page.evaluate(() => !document.getElementById('over').hidden)) first = await page.evaluate(() => ({
        bar: (() => { const m = getComputedStyle(document.getElementById('lifeFill')).transform.match(/matrix\(([\d.e-]+)/); return m ? +m[1] : 0; })(),
        text: document.getElementById('lifeGain').textContent }));
    }
  }
  if (!first) first = { bar: -1, text: '' };
  await page.waitForTimeout(1700);
  const end = await page.evaluate(() => ({
    bar: (() => { const m = getComputedStyle(document.getElementById('lifeFill')).transform.match(/matrix\(([\d.e-]+)/); return m ? +m[1] : 0; })(),
    text: document.getElementById('lifeGain').textContent, v: Number(document.getElementById('lifeGain').dataset.v || 0),
    yarn: document.getElementById('yarnGain').textContent, yv: Number(document.getElementById('yarnGain').dataset.v || -1),
    yarnShown: !document.getElementById('yarnStrip').hidden }));
  check(end.v > 0 && end.text.replace(/\D/g, '') === String(end.v), `the perk line lands on what the run earned (${end.text})`);
  check(first.text.replace(/\D/g, '') !== String(end.v) || end.v < 2, `and was still counting at first sight (${first.text})`);
  /* 52000 sits between the 30000 and 75000 rungs: (52000 - 30000) / (75000 - 30000) = 0.489, a bar that starts part-way, not empty */
  check(Math.abs(first.bar - 0.489) < 0.03, `its bar starts where the run found it (${first.bar.toFixed(3)}, expected 0.489)`);
  check(end.bar >= first.bar - 0.001 && end.bar < 0.489 + 0.05, `and ends a little further on (${end.bar.toFixed(3)})`);
  if (end.yarnShown) check(end.yarn.replace(/\D/g, '') === String(Math.round(end.yv)), `the yarn line lands on its total (${end.yarn})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nA new player gets to a first win in seconds, and rewards arrive where you can see them');
process.exit(bad ? 1 : 0);
