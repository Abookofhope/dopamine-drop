/* Cat Fight: while the tells are new, the right counter starts to glow.
 *
 *   - below level 8, once half the beat has gone without an answer, the button that beats the tell glows (and only that one)
 *   - answering with it hurts the cat and the glow clears; from level 8 nothing glows
 *
 *   node tools/probe/peril.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async xp => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { peril: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'peril');
  await page.waitForSelector('#surface .duel .duelbtn', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
/* what each tell is beaten by, from the picture the cat shows */
const BEATS = { 'M5 19 19 5M14 5h5v5': 'Parry', 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z': 'Wait', 'M13 2 4 14h7l-1 8 9-12h-7z': 'Strike', 'M4 12h10a4 4 0 1 0 0-8M4 12l4-4M4 12l4 4': 'Dodge' };
const read = page => page.evaluate(() => ({ tell: (document.querySelector('.tell svg.now path') || document.querySelector('.tell svg path') || {}).getAttribute ? (document.querySelector('.tell svg.now path') || document.querySelector('.tell svg path')).getAttribute('d') : '',
  glow: [...document.querySelectorAll('.duelbtn.hint')].map(b => b.textContent.trim()), foe: document.querySelectorAll('.duelfoe .pip.foe:not(.out)').length,
  btns: [...document.querySelectorAll('.duelbtn')].map(b => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 }; }) }));

{
  const page = await open(0);
  let s = await read(page); const want = BEATS[s.tell];
  check(s.glow.length === 0, 'nothing glows the moment a tell appears');
  await page.waitForFunction(() => !!document.querySelector('.duelbtn.hint'), null, { timeout: 4000, polling: 40 }).catch(() => {});
  s = await read(page);
  check(!!want && s.glow.length === 1 && s.glow[0] === want, `after half a beat the counter to the tell glows, and only that one (tell wants ${want}, glowing: ${s.glow.join() || 'nothing'})`);
  const b = s.btns.find(x => x.text === want), foe0 = s.foe;
  await page.mouse.click(b.x, b.y); await page.waitForTimeout(350);
  s = await read(page);
  check(s.foe < foe0 && s.glow.length === 0, `answering with it hurts the cat and the glow clears (${foe0} -> ${s.foe})`);
  await page.close();
}
{
  const page = await open(60000);
  await page.waitForTimeout(1500);
  const s = await read(page);
  check(s.glow.length === 0, 'at a high level nothing glows');
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nCat Fight shows you the counter while you learn');
process.exit(bad ? 1 : 0);
