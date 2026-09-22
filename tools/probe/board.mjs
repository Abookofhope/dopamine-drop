/* The four hand-built boards, checked for the two things that break them:
 * whether they fit the phone, and whether a screen reader can use them.
 *
 * Run in German with colour assist on, because German is the longest language
 * in the file and assist adds a shape to every token — if it fits there it fits.
 *
 *   node tools/probe/board.mjs
 *   MODES=sift,meld node tools/probe/board.mjs
 */
import { chromium } from 'playwright';
import { openApp, openMode, axeOn } from './harness.mjs';

/* id -> the selector that means "the board has rendered". */
const BOARDS = { sift: '.belt', meld: '.meldgrid', volley: '.vbox', forage: '.cell.bug' };
const want = (process.env.MODES || 'sift,meld,volley,forage').split(',');
const SIZES = [[320, 568], [360, 640], [400, 820]];
const seen = { sift: 1, meld: 1, volley: 1, forage: 1 };

const browser = await chromium.launch();
let bad = 0;

for (const [w, h] of SIZES){
  for (const id of want){
    const sel = BOARDS[id];
    if (!sel){ console.log(`FAIL ${id}: no board selector known`); bad++; continue; }
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
    const page = await ctx.newPage();
    try {
      await openApp(page, { lang: 'de', colorAssist: true, xp: 900000, solved: 200, seen });
      await openMode(page, id, sel);
      await page.waitForTimeout(450);

      const m = await page.evaluate(() => {
        const vh = window.innerHeight, vw = window.innerWidth;
        const s = document.getElementById('surface').getBoundingClientRect();
        const p = document.getElementById('prompt');
        const over = [...document.querySelectorAll('#surface *')].filter(e => {
          const r = e.getBoundingClientRect();
          return r.width && (r.right > vw + 1 || r.left < -1); }).length;
        const unnamed = [...document.querySelectorAll('#surface button')]
          .filter(e => !(e.getAttribute('aria-label') || e.textContent.trim())).length;
        return { vh, vw, sb: Math.round(s.bottom), sr: Math.round(s.right), over, unnamed,
          lines: Math.round(p.getBoundingClientRect().height /
            parseFloat(getComputedStyle(p).lineHeight || 16)) };
      });
      /* axe once per mode, at the size where a violation is easiest to read. */
      const v = w === 400 ? await axeOn(page, '#surface') : [];
      const ok = m.sb <= m.vh + 1 && m.sr <= m.vw + 1 && !m.over && !m.unnamed && !v.length;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${w}x${h} ${id.padEnd(7)} board ends ${m.sb}/${m.vh}  `
        + `overflow ${m.over}  unnamed ${m.unnamed}  prompt ${m.lines} line(s)`
        + (v.length ? `  axe ${v.length}` : ''));
      v.forEach(x => console.log(`        [${x.impact}] ${x.id} x${x.n} :: ${x.sample}`));
    } catch (e){
      bad++;
      console.log(`FAIL ${w}x${h} ${id.padEnd(7)} ${e.message}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(bad ? `\n${bad} board problem(s)`
  : `\nall ${want.length} boards fit and are named, German, colour assist on`);
process.exit(bad ? 1 : 0);
