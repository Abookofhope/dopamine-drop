/* Scrolling never presses buttons.
 *
 * A finger that lands on a button to start a scroll must not press it: in the Room, Settings and Games (the long, scrolling tabs) and Games a real
 * touch swipe that starts on each of several buttons scrolls the list and changes nothing (no purchase, no sheet, no switch flipped), while
 * a genuine tap on a button still works. Touch is sent as real touch events (touchStart, a run of touchMoves, touchEnd), so the page sees
 * the same pointer events a phone gives it. The old buttons fired on the finger landing, so scrolling bought things and opened sheets.
 *
 *   node tools/probe/roomscroll.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
const cdp = await page.context().newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const swipe = async (x, y, dy) => { await touch('touchStart', x, y); for (let i = 1; i <= 8; i++){ await touch('touchMove', x, y + dy * i / 8); await page.waitForTimeout(16); } await touch('touchEnd', x, y + dy); await page.waitForTimeout(250); };
const tap = async (x, y) => { await touch('touchStart', x, y); await page.waitForTimeout(40); await touch('touchEnd', x, y); await page.waitForTimeout(350); };

await openApp(page, { reduceMotion: true, xp: 12000, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, schema: 11 });

const fingerprint = tab => page.evaluate(tab => {
  const sec = document.getElementById(tab), keys = Object.keys(localStorage).filter(k => /dopamine|dd|save/i.test(k)).sort();
  return keys.map(k => localStorage.getItem(k)).join('|').length + ':' + localStorage.length + ':' + sec.innerHTML.length + ':' + document.querySelectorAll('.sheetbox:not([hidden]),[role=dialog]:not([hidden]),.pausebox,.modal:not([hidden])').length
    + ':' + (document.getElementById('play').hidden ? 'menu' : 'RUNNING') + ':' + [...sec.querySelectorAll('[aria-checked],[aria-pressed],[aria-expanded],[aria-selected]')].map(e => e.getAttribute('aria-checked') + e.getAttribute('aria-pressed') + e.getAttribute('aria-expanded') + e.getAttribute('aria-selected')).join('');
}, tab);
const buttons = tab => page.evaluate(tab => {
  const sec = document.getElementById(tab), sc = sec.querySelector('.scroll') || sec, box = sc.getBoundingClientRect();
  return { scrollTop: sc.scrollTop, scrollable: sc.scrollHeight > sc.clientHeight + 1,
    list: [...sc.querySelectorAll('button, [role=button], .setrow')].map(b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, w: r.width, vis: r.height > 8 && r.top > box.top + 70 && r.bottom < box.bottom - 70 && r.left >= 0 && r.right <= innerWidth, label: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 18) }; }).filter(b => b.vis) };
}, tab);
const scrollTo = (tab, v) => page.evaluate(([tab, v]) => { const sec = document.getElementById(tab); (sec.querySelector('.scroll') || sec).scrollTop = v; }, [tab, v]);
const scrollTop = tab => page.evaluate(tab => { const sec = document.getElementById(tab); return (sec.querySelector('.scroll') || sec).scrollTop; }, tab);
const roomLeft = tab => page.evaluate(tab => { const sc = (document.getElementById(tab).querySelector('.scroll') || document.getElementById(tab)); return sc.scrollHeight - sc.clientHeight - sc.scrollTop; }, tab);

for (const [tab, id] of [['Room', 'tabRoom'], ['Settings', 'tabSettings'], ['Modes', 'tabModes']]){
  await goTab(page, tab); await page.waitForTimeout(700);
  /* dismiss anything that is in the way: a toast and the first-visit card are not what is being tested */
  await page.evaluate(() => { document.querySelectorAll('.achtoast').forEach(e => e.remove()); });
  let swipes = 0, pressed = 0, scrolled = 0, needed = 0;
  for (let k = 0; k < 8; k++){
    await scrollTo(id, k * 200); await page.waitForTimeout(150);
    const info = await buttons(id);
    if (!info.scrollable) break;
    const cands = info.list.filter(b => b.h >= 20 && b.w >= 20);
    if (!cands.length) continue;
    const b = cands[0];
    const before = await fingerprint(id), top0 = await scrollTop(id), room = await roomLeft(id);
    await swipe(b.x, b.y, -150);
    const after = await fingerprint(id), top1 = await scrollTop(id);
    swipes++; if (before !== after) pressed++; if (room >= 170){ needed++; if (top1 - top0 > 60) scrolled++; }
  }
  check(swipes >= 3, `${tab}: ${swipes} swipes were made over its buttons`);
  check(scrolled === needed, `${tab}: every swipe that had room scrolled the list (${scrolled} of ${needed})`);
  check(pressed === 0, `${tab}: no swipe pressed anything (${pressed} of ${swipes} changed something)`);
  /* a real tap still works: some button on this tab changes something when tapped */
  await scrollTo(id, 0); await page.waitForTimeout(150);
  const info = await buttons(id); let worked = 0;
  for (const b of info.list.filter(b => b.h >= 20 && b.w >= 20).slice(0, 8)){
    await goTab(page, tab); await page.waitForTimeout(250); await scrollTo(id, 0); await page.waitForTimeout(100);
    const before = await fingerprint(id); await tap(b.x, b.y); const after = await fingerprint(id);
    if (before !== after){ worked++; break; }
  }
  check(worked >= 1, `${tab}: a real tap on a button still does its job`);
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nScrolling never presses buttons');
process.exit(bad ? 1 : 0);
