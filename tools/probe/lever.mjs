/* Balance: a hint that narrows the search, and the round still plays by eye.
 *
 *   - Hint (two a round) shades a stretch of the beam for a moment, and the balance point is somewhere inside it
 *   - sliding the wedge to the balance point and letting go wins; letting go somewhere else tips the beam and costs a move
 *   - the button is inside the board and translated
 *
 *   node tools/probe/lever.mjs
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
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { lever: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'lever');
  await page.waitForSelector('#surface .lvrstage .lvrbeam', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
/* the balance point from what is on the beam: weight times distance from the middle, over the total weight */
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const loads = [...document.querySelectorAll('.lvrload')].map(e => ({ x: parseFloat(e.style.left) - 50, w: Number(getComputedStyle(e).getPropertyValue('--w')) || Number(e.style.getPropertyValue('--w')) }));
  const W = loads.reduce((a, o) => a + o.w, 0), star = loads.reduce((a, o) => a + o.w * o.x, 0) / W;
  const band = document.querySelector('.lvrband'), tool = document.querySelector('.sumcol .sumtool');
  const rig = document.querySelector('.lvrrig').getBoundingClientRect();
  return { star, stage: R(document.querySelector('.lvrstage')), rig: { x: rig.left, w: rig.width }, surface: R(document.getElementById('surface')),
    band: band ? { on: band.classList.contains('on'), left: parseFloat(band.style.left), width: parseFloat(band.style.width) } : null,
    tool: tool ? { text: tool.textContent.trim(), ...R(tool) } : null, tipped: document.querySelector('.lvrstage').classList.contains('tipped'), budget: (document.querySelector('.budget') || {}).textContent || '' };
});
const left = s => parseInt((s.budget.match(/\d+/) || ['0'])[0], 10);
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
/* the pixel that puts the wedge at a beam position: the rig spans 6% in from each side of the stage */
const xAt = (s, f) => s.stage.x + s.stage.w * (0.06 + (f + 50) / 100 * 0.88);
const y = s => s.stage.y + s.stage.h * 0.5;

/* ── layout ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, vp] of [[0, 'a new player', { width: 400, height: 820 }], [60000, 'a high level', { width: 400, height: 820 }], [0, 'a new player on a 320px phone', { width: 320, height: 568 }]]){
  const page = await open(xp, vp); const s = await read(page);
  check(!!s.tool && s.tool.h >= 40 && s.tool.y + s.tool.h <= s.surface.y + s.surface.h + 1 && s.stage.h > 150, `${label}: Hint is inside the board and big enough to hit (${s.tool && Math.round(s.tool.h)}px, the stage is ${Math.round(s.stage.h)}px tall)`);
  await page.close();
}

/* ── the hint narrows the search ──────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label] of [[0, 'a new player'], [12000, 'a higher level'], [60000, 'a high level']]){
  let inside = 0, tries = 4, shown = 0;
  for (let k = 0; k < tries; k++){
    const page = await open(xp); let s = await read(page);
    const mx = s.tool.x + 20, my = s.tool.y + 18; await page.mouse.click(mx, my); await page.waitForTimeout(350);
    s = await read(page);
    const lo = s.band.left - 50, hi = lo + s.band.width;
    if (s.band.on) shown++;
    if (s.band.on && s.star >= lo && s.star <= hi) inside++;
    await page.close();
  }
  check(shown === tries && inside === tries, `${label}: Hint shades a stretch of the beam with the balance point inside it (${inside} of ${tries})`);
}
{
  const page = await open(0); let s = await read(page);
  await page.mouse.click(s.tool.x + 20, s.tool.y + 18); await page.waitForTimeout(2500);
  s = await read(page); check(!s.band.on && /1/.test(s.tool.text), `the shade goes away again and one hint is used (${s.tool.text})`);
  await page.mouse.click(s.tool.x + 20, s.tool.y + 18); await page.waitForTimeout(300);
  s = await read(page); check(/0/.test(s.tool.text), 'and the second use leaves none');
  await page.close();
}

/* ── a wrong test costs a move, the right place wins ──────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  const before = left(s), far = s.star > 0 ? -38 : 38;
  await page.mouse.move(xAt(s, far), y(s)); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
  const a = await read(page);
  check(a.tipped && left(a) === before - 1, `letting go away from the balance point tips the beam and costs a move (${before} -> ${left(a)} left)`);
  await page.mouse.move(xAt(s, a.star), y(s)); await page.mouse.down(); await page.mouse.move(xAt(s, a.star) + 1, y(s)); await page.mouse.move(xAt(s, a.star), y(s)); await page.mouse.up(); await page.waitForTimeout(600);
  check(await score(page) > 0, 'sliding the wedge to the balance point and letting go wins the round');
  await page.close();
}

/* ── French ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(!!s.tool && /Indice/.test(s.tool.text), `fr: Hint is in French (${s.tool && s.tool.text})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nBalance has a hint that narrows the search');
process.exit(bad ? 1 : 0);
