/* The Mix tab under a real touch gesture, not a synthetic click. A browser
 * pairs pointerdown with a click a beat later — the second half of the same
 * physical tap — and if the paint in between rebuilds the node under the
 * finger, that click lands on a brand-new element and can silently undo what
 * the first half just did. This bit here once: tapping mode after mode into
 * a tape, each one appeared to toggle itself back off, and nothing could be
 * added. See the comment inside paintMix() in site/app.html.
 *
 *   node tools/probe/mix.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab } from './harness.mjs';

const tap = async (page, sel) => {
  const box = await page.evaluate(s => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  await page.touchscreen.tap(box.x, box.y);
  await page.waitForTimeout(280);
};
const tapNth = async (page, sel, n) => {
  const box = await page.evaluate(([s, i]) => {
    const r = document.querySelectorAll(s)[i].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [sel, n]);
  await page.touchscreen.tap(box.x, box.y);
  await page.waitForTimeout(280);
};
const mix = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).mix || []);

const browser = await chromium.launch();
let bad = 0;

/* Three different modes, tapped one at a time, must add up to three — not
 * cancel out on every other tap. */
{
  const ctx = await browser.newContext({ viewport: { width: 400, height: 820 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await openApp(page, { mix: [] });
  await goTab(page, 'Mix');
  await page.waitForTimeout(400);

  const before = await mix(page);
  for (let i = 0; i < 3; i++) await tapNth(page, '#mixGrid .pickrow', i);
  const after = await mix(page);
  const ok = before.length === 0 && after.length === 3;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} three separate row taps -> ${after.length} modes chosen (want 3)`);
  await ctx.close();
}

/* The family bulk button, tapped twice, must select-all then clear — not
 * clear-then-reselect-one on the way there. */
{
  const ctx = await browser.newContext({ viewport: { width: 400, height: 820 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await openApp(page, { mix: [] });
  await goTab(page, 'Mix');
  await page.waitForTimeout(400);

  const famSize = await page.evaluate(() =>
    document.querySelectorAll('#mixGrid .picksec:first-child .pickrow').length);
  await tap(page, '#mixGrid .pickall');
  const afterOne = (await mix(page)).length;
  await tap(page, '#mixGrid .pickall');
  const afterTwo = (await mix(page)).length;
  const ok = afterOne === famSize && afterTwo === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} family bulk toggle -> select all ${afterOne}/${famSize}, `
    + `then clear -> ${afterTwo}`);
  await ctx.close();
}

/* A row that starts already chosen (switching to a tape someone built
 * earlier) must come off on one tap, not stay stuck on. */
{
  const ctx = await browser.newContext({ viewport: { width: 400, height: 820 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  /* save.mix is a read-only mirror kept in sync on persist(); the tape itself
     — the thing that actually drives the screen — lives in save.tapes. */
  await openApp(page, { tapes: [{ id: 't1', name: '', modes: ['odd', 'order'] }], tapeId: 't1' });
  await goTab(page, 'Mix');
  await page.waitForTimeout(400);

  const before = await mix(page);
  await tapNth(page, '#mixGrid .pickrow.on', 0);
  const after = await mix(page);
  const ok = before.length === 2 && after.length === 1;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} removing a pre-chosen mode -> ${before.length} to ${after.length}`);
  await ctx.close();
}

await browser.close();
console.log(bad ? `\n${bad} problem(s)` : '\nMix: taps add up, they do not cancel out');
process.exit(bad ? 1 : 0);
