/* How a solve was made is told and paid (v0.147.0).
 *
 * Grades: Purrfect (quick, no slip, no hint), Swift (quick, but a slip or a hint), Clean (several steps, no slip).
 * Purrfects tie knots in the Thread beside the multiplier; five tie a Bow, which pays 500 points a stage and 5 yarn.
 * A miss unravels the Thread. A miss no longer shakes the board.
 *
 * Held on Odd Skein (`dd.pool`), whose odd tile the probe can find, so every solve is quick and clean unless the probe
 * makes it otherwise: a sniff (Odd Skein's hint) before solving, or a wrong tile.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/style.mjs
 */
import { chromium } from 'playwright';
import { openApp } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

/* The question is remembered per board, as it was dealt: a sniff or a wrong tap replaces the prompt (a "lightest" or "darkest"
   board would then be read as "the one that differs"), and the tiles they rule out are disabled, so they are left out. A round
   of Odd Skein is three boards, each with its own question, so the memory is keyed on the board's first tile. */
const tiles = page => page.evaluate(() => {
  const all = [...document.querySelectorAll('#surface .oddwrap .tile')];
  if (!all.length) return null;
  const pr = document.getElementById('prompt');
  if (window.__oddFirst !== all[0] && pr.className === 'prompt'){ window.__oddFirst = all[0]; window.__oddAsk = pr.textContent.trim(); }
  const prompt = window.__oddFirst === all[0] ? window.__oddAsk : pr.textContent.trim();
  const ts = all.filter(e => !e.disabled && !e.classList.contains('ruled'));
  if (!ts.length) return null;
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
    && ![...sf.children].some(c => c.classList.contains('swap')) && document.getElementById('prompt').className === 'prompt';
}, null, { timeout: 12000, polling: 60 }).then(() => true, () => false);
const saveNow = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')) || {});
const knots = page => page.evaluate(() => document.querySelectorAll('#hudThread i.on').length);
const prompt = page => page.evaluate(() => ({ text: document.getElementById('prompt').textContent, cls: document.getElementById('prompt').className }));
/* Solve the board in front of us, quickly, tapping only odd tiles. Returns the prompt as the solve left it. */
async function solve(page, { wait = 0, sniff = false } = {}){
  if (!await live(page)) return null;
  const s0 = (await saveNow(page)).solved | 0;
  if (wait) await page.waitForTimeout(wait);
  if (sniff){
    await tiles(page);   /* note the board's question before the sniff replaces it */
    await page.evaluate(() => { const b = document.querySelector('#surface .aid'); if (b && !b.disabled) b.click(); });
    await page.waitForTimeout(200);
  }
  for (let i = 0; i < 10; i++){
    const t = await tiles(page); if (!t){ await page.waitForTimeout(80); continue; }
    await page.mouse.click(t.odd.x, t.odd.y);
    await page.waitForTimeout(90);
    if (((await saveNow(page)).solved | 0) > s0) return prompt(page);
  }
  return null;
}
async function open(state = {}){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true }, state));
  await page.evaluate(() => document.getElementById('moodPlay').click());
  return { page, ctx };
}

/* ── 1. a quick, clean solve is a Purrfect and ties a knot ── */
{
  const { page, ctx } = await open();
  const p1 = await solve(page);
  check(!!p1 && /Purrfect/i.test(p1.text) && /g-purr/.test(p1.cls), `a quick solve with no slip is a Purrfect ("${p1 && p1.text}", ${p1 && p1.cls})`);
  check(await knots(page) === 1, `and ties a knot in the Thread (${await knots(page)} lit)`);
  const sv = await saveNow(page);
  check((sv.purrfects | 0) === 1, `the lifetime count of Purrfects is kept (${sv.purrfects})`);
  /* four more: a Bow */
  const before = await page.evaluate(() => parseInt(document.getElementById('hudScore').textContent.replace(/\D/g, ''), 10) || 0);
  let all = true;
  for (let i = 0; i < 4; i++){ const p = await solve(page); if (!p || !/Purrfect/i.test(p.text)) all = false; }
  check(all, 'four more quick solves are all Purrfects');
  await page.waitForTimeout(900);
  const sv2 = await saveNow(page);
  check((sv2.bows | 0) === 1, `five Purrfects tie a Bow (bows ${sv2.bows})`);
  check(await knots(page) === 0, `and the Thread starts again (${await knots(page)} lit)`);
  const after = await page.evaluate(() => parseInt(document.getElementById('hudScore').textContent.replace(/\D/g, ''), 10) || 0);
  check(after - before >= 500 + 4 * 100, `the Bow pays its 500 on top of the solves (score ${before} to ${after})`);
  /* a hint before solving: Swift at best */
  const p6 = await solve(page, { sniff: true });
  check(!!p6 && !/Purrfect/i.test(p6.text), `a solve after a sniff is not a Purrfect ("${p6 && p6.text}")`);
  /* a wrong tile with tries left is a slip: the solve after it can be Swift, never Purrfect */
  {
    await live(page);
    const t = await tiles(page);
    if (t){ await page.mouse.click(t.wrong.x, t.wrong.y); await page.waitForTimeout(120); }
    const p7 = await solve(page);
    check(!!p7 && !/Purrfect/i.test(p7.text), `a solve after a wrong tile is not a Purrfect ("${p7 && p7.text}")`);
  }
  /* a miss unravels the Thread */
  await solve(page);
  const k1 = await knots(page);
  await live(page);
  /* Odd Skein gives a try or two before a wrong tile is a miss: keep choosing wrong ones until the round is lost. */
  for (let i = 0; i < 5; i++){
    const t = await page.evaluate(() => { const b = [...document.querySelectorAll('#surface .oddwrap .tile:not([disabled])')];
      const prompt = document.getElementById('prompt'); if (prompt.className !== 'prompt' || b.length < 2) return null;
      const rgb = e => getComputedStyle(e).backgroundColor; const n = {}; b.forEach(x => n[rgb(x)] = (n[rgb(x)] || 0) + 1);
      const w = b.find(x => n[rgb(x)] > 1) || b[0]; const r = w.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (!t) break;
    await page.mouse.click(t.x, t.y); await page.waitForTimeout(160);
  }
  await page.waitForTimeout(600);
  check(k1 >= 1 && await knots(page) === 0, `a miss unravels the Thread (${k1} knot${k1 === 1 ? '' : 's'} to ${await knots(page)})`);
  /* and does not shake the board */
  const shook = await page.evaluate(() => /shake/.test(document.getElementById('surface').className));
  check(!shook, 'a miss does not shake the board');
  await ctx.close();
}

/* ── 2. a slow, careful solve of a board with steps is Clean ── */
{
  const { page, ctx } = await open();
  /* Odd Skein's boards at this level take more than one find, so there are steps to be clean on. */
  const p = await solve(page, { wait: 6000 });
  check(!!p && /Clean/i.test(p.text), `a slow solve with no slip on a board of steps is Clean ("${p && p.text}")`);
  check(await knots(page) === 0, 'and ties no knot');
  await ctx.close();
}

/* ── 3. with motion on, a Purrfect and a Bow draw and leave nothing behind ── */
{
  const { page, ctx } = await open({ reduceMotion: false, bigFx: true });
  for (let i = 0; i < 5; i++) await solve(page);
  const drawn = await page.waitForFunction(() => !!document.querySelector('.bowfx'), null, { timeout: 2500, polling: 40 }).then(() => true, () => false);
  check(drawn, 'the Bow is drawn over the board');
  const onBoard = await page.evaluate(() => !!document.querySelector('#surface .bowfx'));
  check(!onBoard, 'as an overlay, not inside the board');
  await page.waitForTimeout(1900);
  check(!(await page.evaluate(() => !!document.querySelector('.bowfx'))), 'and it is gone 2 s later');
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
