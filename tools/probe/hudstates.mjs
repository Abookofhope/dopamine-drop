/* The way out is always there: the exit button in a round, the pause sheet, and the Game Over screen after a lost run.
 *
 * On eight screen shapes (three small phones, two large ones, a phone on its side twice, a tablet) this checks that in the round, the
 * exit button is a real 44px target inside the screen and on top; the pause sheet's buttons and switches are 44px and on screen; and
 * after a genuinely lost Marathon run (the odd tile tapped wrong until the lives run out) the Game Over screen shows its score from the
 * top, with Go again and Back to menu on screen, at least 44px tall and on top, with nothing scrolling sideways, and that Back to
 * menu takes you back to the menu. Game Over used to be one centred column with no scrolling: on a phone shorter than the result, the
 * score was cut off at the top and Back to menu was off the bottom with no way to reach it.
 *
 *   node tools/probe/hudstates.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const SHAPES = [[320, 568, 'small phone'], [360, 640, 'phone'], [390, 844, 'tall phone'], [412, 915, 'large phone'], [568, 320, 'small phone on its side'], [844, 390, 'phone on its side'], [768, 1024, 'tablet'], [1024, 768, 'tablet on its side']];

const geo = (page, sel) => page.evaluate(sel => {
  const e = typeof sel === 'string' ? document.querySelector(sel) : null; if (!e) return null;
  const r = e.getBoundingClientRect(), top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
  return { x: r.left, y: r.top, w: r.width, h: r.height, inside: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, top: !!top && (top === e || e.contains(top)), vw: innerWidth, vh: innerHeight };
}, sel);

for (const [w, h, label] of SHAPES){
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: true, xp: 60000, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { odd: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'odd');
  await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(1500);
  const tag = `${w}x${h} (${label})`;

  /* in the round */
  const q = await geo(page, '#quitBtn');
  check(!!q && q.w >= 44 && q.h >= 44 && q.inside && q.top, `${tag}: the exit button is a 44px target, on screen and on top (${q && Math.round(q.w)}x${q && Math.round(q.h)})`);

  /* the pause sheet */
  await page.evaluate(() => document.getElementById('quitBtn').click()); await page.waitForTimeout(600);
  const sheet = await page.evaluate(() => {
    const box = document.querySelector('.pausebox'); if (!box || box.getBoundingClientRect().height < 50) return null;
    const btns = [...box.querySelectorAll('button:not(.sw), .pauseswrow')].filter(b => b.getBoundingClientRect().height > 0).map(b => { const r = b.getBoundingClientRect(); return { t: (b.textContent || '').trim().slice(0, 14), h: r.height, w: r.width, inside: r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5 }; });
    return { btns, scrolls: box.scrollHeight > box.clientHeight + 1, overflowY: getComputedStyle(box).overflowY };
  });
  check(!!sheet && sheet.btns.length >= 3 && sheet.btns.every(b => b.h >= 43.5 && b.w >= 43.5) && (sheet.btns.every(b => b.inside) || (sheet.scrolls && /auto|scroll/.test(sheet.overflowY))),
    `${tag}: the pause sheet's ${sheet ? sheet.btns.length : 0} controls are 44px and reachable (${sheet ? sheet.btns.map(b => Math.round(b.h)).join(', ') : 'no sheet'}${sheet && sheet.scrolls ? ', it scrolls' : ''})`);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.pausebox button')].find(b => /back to it/i.test(b.textContent)); if (b) b.click(); }); await page.waitForTimeout(700);

  /* a lost run */
  for (let k = 0; k < 14; k++){
    if (await page.evaluate(() => !document.getElementById('over').hidden)) break;
    await page.evaluate(() => { const t = document.querySelector('#surface .tile:not(.ruled):not([disabled])'); if (t) t.click(); });
    await page.waitForTimeout(2300);
  }
  await page.waitForTimeout(1200);
  const over = await page.evaluate(() => {
    const o = document.getElementById('over'); if (o.hidden) return null;
    const sc = document.getElementById('overScroll') || document.getElementById('over'), big = document.getElementById('overScore').getBoundingClientRect();
    return { scrolls: sc.scrollHeight > sc.clientHeight + 1, scrollTop: sc.scrollTop, scoreTop: big.top, scoreVisible: big.top >= -0.5 && big.bottom <= innerHeight, sideways: document.documentElement.scrollWidth > innerWidth + 1 || sc.scrollWidth > sc.clientWidth + 1 };
  });
  check(!!over, `${tag}: a lost run reaches Game Over`);
  if (over){
    const home = await geo(page, '#homeBtn'), again = await geo(page, '#againBtn');
    check(over.scoreVisible, `${tag}: Game Over shows its score from the top (${Math.round(over.scoreTop)}px from the top)`);
    check(!!home && home.h >= 44 && home.inside && home.top, `${tag}: Back to menu is on screen, on top and 44px tall (y ${home && Math.round(home.y)} of ${home && home.vh}, ${home && Math.round(home.h)}px)`);
    check(!!again && again.h >= 44 && again.inside && again.top, `${tag}: Go again is on screen, on top and 44px tall (y ${again && Math.round(again.y)}, ${again && Math.round(again.h)}px)`);
    check(!over.sideways, `${tag}: Game Over does not scroll sideways`);
    if (h <= 640 || w > h){
      /* a short screen scrolls the body, never the buttons */
      await page.evaluate(() => { const sc = document.getElementById('overScroll') || document.getElementById('over'); sc.scrollTop = sc.scrollHeight; }); await page.waitForTimeout(200);
      const home2 = await geo(page, '#homeBtn'); check(!!home2 && home2.inside && home2.top && Math.abs(home2.y - home.y) < 1, `${tag}: scrolling the result leaves the buttons where they are`);
    }
    await page.evaluate(() => document.getElementById('homeBtn').click()); await page.waitForTimeout(800);
    const back = await page.evaluate(() => ({ over: !document.getElementById('over').hidden, tabs: document.getElementById('tabbar').getBoundingClientRect().height > 0 }));
    check(!back.over && back.tabs, `${tag}: Back to menu returns to the menu`);
  }
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nThe way out is always there');
process.exit(bad ? 1 : 0);
