/* Tumble Dryer: a Pair hint that lights two socks that go together.
 *
 *   - Pair (two a round) lights exactly two socks of the same colour for a moment and uses one of two
 *   - tapping the lit pair clears them; pairing off the whole drum wins the round
 *   - Hold still waits the drum, and both buttons are inside the board and translated
 *
 *   node tools/probe/tumble.mjs
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
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { tumble: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'tumble');
  await page.waitForSelector('#surface .cell.sock.full', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const socks = [...document.querySelectorAll('.cell.sock')].map((e, i) => ({ i, full: e.classList.contains('full'), hex: e.dataset.hex || '', hint: e.classList.contains('hint'), ...R(e) }));
  const tools = [...document.querySelectorAll('.sumcol .sumtool')].map(b => ({ text: b.textContent.trim(), off: b.disabled, ...R(b) }));
  return { socks, tools, surface: R(document.getElementById('surface')) };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const mid = e => [e.x + e.w / 2, e.y + e.h / 2];
const click = async (page, e) => { const [x, y] = mid(e); await page.mouse.click(x, y); await page.waitForTimeout(90); };

for (const [xp, label, vp] of [[0, 'a new player', { width: 400, height: 820 }], [0, 'a new player on a 320px phone', { width: 320, height: 568 }]]){
  const page = await open(xp, vp); const s = await read(page);
  check(s.tools.length === 2 && s.tools.every(t => t.h >= 40 && t.y + t.h <= s.surface.y + s.surface.h + 1 && t.x >= 0 && t.x + t.w <= vp.width), `${label}: Hold and Pair are inside the board and big enough to hit (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}
{
  const page = await open(0); let s = await read(page);
  const full0 = s.socks.filter(c => c.full).length;
  await click(page, s.tools[1]); await page.waitForTimeout(120); s = await read(page);
  const lit = s.socks.filter(c => c.hint);
  check(lit.length === 2 && lit[0].hex === lit[1].hex && /1/.test(s.tools[1].text), `Pair lights two socks of one colour and uses one of two (${lit.map(c => c.hex).join(' = ')}; ${s.tools[1].text})`);
  await click(page, lit[0]); await click(page, lit[1]); await page.waitForTimeout(150);
  s = await read(page);
  check(s.socks.filter(c => c.full).length === full0 - 2, `tapping the lit pair clears them (${full0} -> ${s.socks.filter(c => c.full).length} socks)`);
  /* pair off the rest, as fast as a thumb would */
  for (let guard = 0; guard < 20; guard++){
    s = await read(page); const by = {}; s.socks.filter(c => c.full).forEach(c => (by[c.hex] = by[c.hex] || []).push(c));
    const pair = Object.values(by).find(a => a.length >= 2); if (!pair) break;
    await click(page, pair[0]); await click(page, pair[1]);
    if (await score(page) > 0) break;
  }
  await page.waitForTimeout(500);
  check(await score(page) > 0, 'pairing off the whole drum wins the round');
  await page.close();
}
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(s.tools.length === 2 && /Paire/.test(s.tools[1].text), `fr: the Pair button is in French (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nTumble Dryer shows you a pair');
process.exit(bad ? 1 : 0);
