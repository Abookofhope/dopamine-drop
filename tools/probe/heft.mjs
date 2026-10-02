/* Heft: a Squint that draws each pile as one disc, so two piles can be compared by size.
 *
 *   - at a new level there is one Squint, inside the board; pressing it draws a disc in every pile for a moment and uses it up
 *   - the biggest disc is in the heavier pile (its area is the sum of that pile's pieces), and tapping that pile wins
 *   - from level 12 there is no Squint
 *
 *   node tools/probe/heft.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, lang = 'en', vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { heft: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'heft');
  await page.waitForSelector('#surface .hpan', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const tool = document.querySelector('.sumcol .sumtool');
  return { pans: [...document.querySelectorAll('.hpan')].map(e => ({ which: e.dataset.which, disc: (e.querySelector('.hdisc') || {}).getBoundingClientRect ? e.querySelector('.hdisc').getBoundingClientRect().width : 0, ...R(e) })),
    tool: tool ? { text: tool.textContent.trim(), off: tool.disabled, ...R(tool) } : null, surface: R(document.getElementById('surface')) };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));

{
  const page = await open(0); let s = await read(page);
  check(!!s.tool && /1/.test(s.tool.text) && s.tool.h >= 40 && s.tool.y + s.tool.h <= s.surface.y + s.surface.h + 1, `one Squint at a new level, inside the board (${s.tool && s.tool.text}, ${s.tool && Math.round(s.tool.h)}px)`);
  await page.mouse.click(s.tool.x + 20, s.tool.y + 18); await page.waitForTimeout(250);
  s = await read(page);
  const biggest = s.pans.reduce((a, p) => p.disc > a.disc ? p : a, s.pans[0]);
  check(s.pans.every(p => p.disc > 10) && biggest.which === 'heavy' && /0/.test(s.tool.text), `Squint draws a disc in every pile, the biggest in the heavier one, and is used up (${s.pans.map(p => p.which + ' ' + Math.round(p.disc) + 'px').join(', ')}; ${s.tool.text})`);
  await page.mouse.click(biggest.x + biggest.w / 2, biggest.y + biggest.h / 2); await page.waitForTimeout(700);
  check(await score(page) > 0, 'tapping the pile with the biggest disc wins');
  await page.close();
}
{
  const page = await open(60000); const s = await read(page);
  check(!s.tool, 'from level 12 there is no Squint');
  await page.close();
}
{
  const page = await open(0, 'fr', { width: 320, height: 568 }); const s = await read(page);
  check(!!s.tool && /Plisser/.test(s.tool.text) && s.tool.h >= 40, `fr: Squint is in French and fits (${s.tool && s.tool.text})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nHeft can be squinted at');
process.exit(bad ? 1 : 0);
