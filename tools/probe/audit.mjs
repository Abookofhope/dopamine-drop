/* Not in the suite: screenshots one mode at three levels and prints what a player sees (prompt, the number of things to touch).
 *   MODE=odd PORT=8380 node tools/probe/audit.mjs      -> /tmp/pw/sheets/audit_<mode>.png (three boards side by side)
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';
const id = process.env.MODE; const W = +(process.env.W || 400);
const browser = await chromium.launch();
const out = [];
for (const [xp, label] of [[0, 'new'], [12000, 'mid'], [60000, 'high']]){
  const page = await browser.newPage({ viewport: { width: W, height: 820 }, hasTouch: true });
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { [id]: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, id);
  await page.waitForFunction(() => document.querySelector('#surface > *') && document.getElementById('hudKind').textContent.trim() !== 'Shuffle', null, { timeout: 12000, polling: 80 }).catch(() => {});
  await page.waitForTimeout(1600);
  const info = await page.evaluate(() => ({ prompt: (document.querySelector('.prompt') || {}).textContent, touch: document.querySelectorAll('#surface button, #surface [role=button], #surface .cell, #surface .bub, #surface .tile').length, budget: (document.querySelector('.budget') || {}).textContent || '', hint: [...document.querySelectorAll('#surface .ftool, #surface .sumtool, #surface .ctool')].map(b => b.textContent.trim()).join('|') }));
  console.log(label, JSON.stringify(info), errs.join('|'));
  await page.screenshot({ path: `/tmp/pw/sheets/aud_${id}_${label}.png` });
  await page.close();
}
await browser.close();
