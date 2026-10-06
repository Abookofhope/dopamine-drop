/* The end of a run pays out where you can see it: the XP the run earned counts up, the level
 * bar starts where the run found it and fills (wrapping round when a level was crossed), and
 * the level-up card waits for the bar rather than covering it. With reduced motion the numbers
 * are simply there.
 *
 *   node tools/probe/runend.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const total = l => l <= 1 ? 0 : (l - 1) * (5 * l + 40);
const levelFor = xp => xp <= 0 ? 1 : Math.max(1, Math.floor((-35 + Math.sqrt(1225 + 20 * (40 + xp))) / 10));
const frac = xp => { const l = levelFor(xp); return (xp - total(l)) / (50 + 10 * (l - 1)); };

const oddAt = page => page.evaluate(() => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
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
const barNow = page => page.evaluate(() => { const f = document.getElementById('xpFill'); if (!f) return -1; const m = getComputedStyle(f).transform.match(/matrix\(([\d.e-]+)/); return m ? +m[1] : 0; });

async function run(xp, reduce){
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { xp, runs: 12, solved: 80, sound: false, haptics: false, onboarded: true, seen: { odd: 1 }, schema: 11, reduceMotion: reduce, lang: 'en' });
  await openModeList(page); await clickMode(page, 'odd');
  await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(900);
  for (let k = 0; k < 8; k++){
    await page.waitForSelector('#surface .oddwrap .tile'); await page.waitForTimeout(500);
    if (await score(page) > 0) break;
    const at = await oddAt(page); await page.mouse.click(at.x, at.y); await page.waitForTimeout(800);
  }
  /* lose, and catch the first look at Game Over. The first tile can be the odd one (a second solve),
     so what the run earned is read once the run is over, not before. */
  let first = null;
  for (let k = 0; k < 16 && !first; k++){
    if (await page.evaluate(() => !document.getElementById('over').hidden)) break;
    await page.evaluate(() => { const t = document.querySelector('#surface .tile:not(.ruled):not([disabled])'); if (t) t.click(); });
    for (let w = 0; w < 40 && !first; w++){
      await page.waitForTimeout(60);
      if (await page.evaluate(() => !document.getElementById('over').hidden)) first = { bar: await barNow(page), text: await page.evaluate(() => document.getElementById('xpGain').textContent), card: await page.evaluate(() => !document.getElementById('levelup').hidden) };
    }
  }
  if (!first) first = { bar: await barNow(page), text: await page.evaluate(() => document.getElementById('xpGain').textContent), card: false };
  const solvedXp = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).xp);
  return { page, solvedXp, first };
}

/* ── a run that does not change level ── */
{
  const { page, solvedXp, first } = await run(400, false);
  const gained = solvedXp - 400;
  check(gained >= 8, `one board solved (+${gained} XP)`);
  check(Math.abs(first.bar - frac(400)) < 0.06, `Game Over opens with the bar where the run found it (${first.bar.toFixed(2)}, expected ${frac(400).toFixed(2)})`);
  check(first.text !== '+' + gained + ' XP' || gained < 2, `and the XP is still counting at first sight ("${first.text}")`);
  await page.waitForTimeout(1600);
  const end = await barNow(page);
  check(Math.abs(end - frac(solvedXp)) < 0.03, `it fills to where the run left it (${end.toFixed(2)}, expected ${frac(solvedXp).toFixed(2)})`);
  const txt = await page.evaluate(() => document.getElementById('xpGain').textContent);
  check(txt === `+${gained} XP`, `and the count lands on the total ("${txt}")`);
  check(!(await page.evaluate(() => !document.getElementById('levelup').hidden)), 'no level card when the level did not change');
  await page.close();
}

/* ── a run that crosses a level: bar runs to the end, wraps, then the card ── */
{
  const { page, solvedXp, first } = await run(805, false);
  check(levelFor(solvedXp) === 10, 'the run crossed into level 10');
  check(!first.card, 'the level card is not up the instant Game Over is');
  await page.waitForTimeout(1000);
  const mid = await barNow(page);
  check(mid > 0.9 || mid < frac(solvedXp) + 0.08, `the bar has run to the end or wrapped by now (${mid.toFixed(2)})`);
  await page.waitForTimeout(1900);
  const end = await barNow(page);
  check(Math.abs(end - frac(solvedXp)) < 0.05, `and rests at the new level's progress (${end.toFixed(2)}, expected ${frac(solvedXp).toFixed(2)})`);
  check(await page.evaluate(() => !document.getElementById('levelup').hidden), 'then the level card arrives');
  await page.keyboard.press('Escape');
  await page.close();
}

/* ── reduced motion: everything is already where it ends ── */
{
  const { page, solvedXp, first } = await run(400, true);
  const gained = solvedXp - 400;
  check(Math.abs(first.bar - frac(solvedXp)) < 0.03, `reduced motion: the bar is already full at first sight (${first.bar.toFixed(2)})`);
  check(first.text === `+${gained} XP`, `reduced motion: the XP is already the total ("${first.text}")`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nA run pays out in view: the XP counts, the bar fills, and the level card waits for it');
process.exit(bad ? 1 : 0);
