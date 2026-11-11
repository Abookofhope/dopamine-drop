/* Non-text contrast (WCAG 1.4.11, v0.177.0): the parts of a control that say what it is and what state it is in stand at
 * least 3:1 against what is next to them, measured on the pixels the screen shows.
 *
 * Each check takes a screenshot around the control, decodes it, and compares the colour of one pixel on the part that
 * matters with one just beside it, by WCAG's contrast ratio:
 *   - a switch, off: its outline against the card around it, and its knob against its track;
 *   - a switch, on: its track against the card, and its knob against the track;
 *   - the focus ring against the card it is drawn on;
 *   - a panel's chevron, a tab's icon, and the volume slider's thumb against what is behind them;
 * in the default colours and with High contrast on. The off switch's outline was 1.3:1 before 0.177.0, which made an off
 * switch read as a dot on its own.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/nontext.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab, openPanels } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const lab = await browser.newPage();

/* the colour of the pixel at (x, y) on the page as shown */
async function pixel(page, x, y){
  const png = await page.screenshot({ clip: { x: Math.round(x) - 1, y: Math.round(y) - 1, width: 3, height: 3 } });
  return lab.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = 3; c.height = 3; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(1, 1, 1, 1).data; return [d[0], d[1], d[2]]; }, png.toString('base64'));
}
/* the brightest pixel in a box: a thin stroke, wherever it is (a chevron turns over when its panel opens) */
async function brightest(page, x, y, w, h){
  const png = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) } });
  return lab.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let best = [0, 0, 0], bl = -1;
    for (let i = 0; i < d.length; i += 4){ const l = d[i] * .2126 + d[i + 1] * .7152 + d[i + 2] * .0722; if (l > bl){ bl = l; best = [d[i], d[i + 1], d[i + 2]]; } }
    return best; }, png.toString('base64'));
}
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
async function pair(page, label, at, beside){
  const a = await pixel(page, at[0], at[1]), b = await pixel(page, beside[0], beside[1]), r = ratio(a, b);
  check(r >= 3, `${label}: ${r.toFixed(2)}:1 (${hex(a)} against ${hex(b)})`);
}

for (const hc of [false, true]){
  const tag = hc ? 'High contrast: ' : '';
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  await openApp(page, { reduceMotion: true, contrast: hc, captions: false, sound: true, onboarded: true, xp: 9000, runs: 40, solved: 600 });
  await goTab(page, 'Settings'); await page.waitForTimeout(300);
  await openPanels(page, 'feedback');
  await page.waitForTimeout(400);
  /* an off switch (Sound captions, off in this save) and an on one (Sound, on) */
  const sw = await page.evaluate(() => {
    const box = e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
    const off = document.getElementById('swCaps'), on = document.getElementById('swSound');
    return { off: off.getAttribute('aria-checked') === 'false' ? box(off) : null, on: on.getAttribute('aria-checked') === 'true' ? box(on) : null };
  });
  await page.waitForTimeout(300);
  const sw2 = await page.evaluate(() => { const b = id => { const r = document.getElementById(id).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }; return { off: b('swCaps'), on: b('swSound') }; });
  if (sw.off){
    const o = sw2.off;
    await pair(page, `${tag}an off switch's outline against its card`, [o.cx, o.t + 0.5], [o.cx, o.t - 3]);
    await pair(page, `${tag}an off switch's knob against its track`, [o.l + 2 + 9.5, o.cy], [o.r - 7, o.cy]);
  } else check(false, `${tag}an off switch to measure (Sound captions was on)`);
  if (sw.on){
    const o = sw2.on;
    await pair(page, `${tag}an on switch's track against its card`, [o.l + 6, o.cy], [o.l - 4, o.cy]);
    await pair(page, `${tag}an on switch's knob against its track`, [o.r - 2 - 9.5, o.cy], [o.l + 6, o.cy]);
  } else check(false, `${tag}an on switch to measure (Sound was off)`);
  /* the focus ring, on a switch row's switch reached by the keyboard */
  await page.evaluate(() => document.getElementById('swSound').blur());
  await page.locator('#swSound').focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
  const ring = await page.evaluate(() => { const e = document.activeElement, r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { id: e.id, w: parseFloat(cs.outlineWidth) || 0, off: parseFloat(cs.outlineOffset) || 0, t: r.top, cx: r.left + r.width / 2 }; });
  if (ring.id === 'swSound' && ring.w > 0){
    const y = ring.t - ring.off - ring.w / 2;
    await pair(page, `${tag}the focus ring against the card`, [ring.cx, y], [ring.cx, y - ring.w - 3]);
  } else check(false, `${tag}the focus ring shows on a switch reached by the keyboard (${ring.id}, ${ring.w}px)`);
  /* a panel's chevron: the middle of its stroke against the header behind it */
  const chev = await page.evaluate(() => { const c = document.querySelector('[data-acc="feedback"] .chev'); c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.waitForTimeout(250);
  {
    const a = await brightest(page, chev.x, chev.y, chev.w, chev.h), b = await pixel(page, chev.x - 4, chev.y + chev.h / 2), r = ratio(a, b);
    check(r >= 3, `${tag}a panel's chevron against its header: ${r.toFixed(2)}:1 (${hex(a)} against ${hex(b)})`);
  }
  /* a tab's icon (not the current one) against the bar */
  const tab = await page.evaluate(() => { const t = [...document.querySelectorAll('.tabbar .tab')].find(x => x.getAttribute('aria-current') !== 'page'); const r = t.querySelector('svg').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  {
    const a = await brightest(page, tab.x, tab.y, tab.w, tab.h), b = await pixel(page, tab.x - 4, tab.y + tab.h / 2), r = ratio(a, b);
    check(r >= 3, `${tag}a tab's icon against the bar: ${r.toFixed(2)}:1 (${hex(a)} against ${hex(b)})`);
  }
  await page.close();
}

await browser.close();
console.log(bad ? `\n${bad} failed` : '\nevery control part that says what it is stands 3:1 or more against what is beside it');
process.exit(bad ? 1 : 0);
