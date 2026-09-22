/* Settings, which is nothing but controls, so it is the one tab where a control
 * that is hard to hit is the whole experience. Checks that a row toggles, that
 * a row holding a button does not, and that erasing your progress asks in the
 * page rather than through a system dialog you cannot style or trust.
 *
 *   node tools/probe/settings.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab, axeOn } from './harness.mjs';

/* A click at a point inside the row, not on the control: the question is
 * whether the empty space next to the label does anything. */
const tapRow = (page, id) => page.evaluate(k => {
  const r = document.getElementById(k).closest('.setrow');
  const b = r.getBoundingClientRect();
  r.dispatchEvent(new MouseEvent('click',
    { bubbles: true, clientX: b.left + 30, clientY: b.top + 20 }));
}, id);

const read = (page, fn) => page.evaluate(fn);
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')));

const browser = await chromium.launch();
let bad = 0;

for (const [w, h, lang] of [[400, 820, 'en'], [320, 568, 'de'], [360, 640, 'fr']]){
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  /* If a window.confirm ever comes back, this catches it. */
  let nativeDialog = false;
  page.on('dialog', d => { nativeDialog = true; d.dismiss(); });

  await openApp(page, { lang, sound: true, haptics: true, reduceMotion: false,
    marathon: { odd: 900 }, pbBlitz: 4200, pbStreak: 9 });
  await goTab(page, 'Settings');

  const sw = () => read(page, () => document.getElementById('swSound').getAttribute('aria-checked'));
  const on0 = await sw();
  await tapRow(page, 'swSound');
  await page.waitForTimeout(250);
  const on1 = await sw();
  /* and the switch itself still works, exactly once — the row listener must not
     double-fire on top of the switch's own */
  await page.evaluate(() => document.getElementById('swSound').click());
  await page.waitForTimeout(250);
  const on2 = await sw();

  const langBefore = await read(page, () => document.documentElement.lang);
  await tapRow(page, 'langBtn2');
  await page.waitForTimeout(250);
  const langAfter = await read(page, () => document.documentElement.lang);

  const xpBefore = (await stored(page)).xp;
  await page.evaluate(() => document.getElementById('resetBtn').click());
  await page.waitForTimeout(250);
  const asked = await read(page, () => ({
    box: !document.getElementById('resetConfirm').hidden,
    row: !document.getElementById('resetRow').hidden }));
  await page.evaluate(() => document.getElementById('resetKeep').click());
  await page.waitForTimeout(250);
  const kept = { xp: (await stored(page)).xp,
    box: await read(page, () => !document.getElementById('resetConfirm').hidden) };

  await page.evaluate(() => document.getElementById('resetBtn').click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('resetGone').click());
  await page.waitForTimeout(350);
  const gone = await stored(page);

  const v = await axeOn(page, '#tabSettings');

  const ok = on1 !== on0 && on2 === on0 && langAfter === langBefore
    && asked.box && !asked.row && kept.xp === xpBefore && !kept.box
    && gone.xp === 0 && gone.pbBlitz === 0 && gone.sound === true
    && !nativeDialog && !v.length && !errs.length;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${w}x${h} ${lang}`);
  console.log(`     tap the row      -> sound ${on0} to ${on1}; tap the switch -> back to ${on2}`);
  console.log(`     a button row     -> language unchanged (${langAfter})`);
  console.log(`     Reset            -> asks in the page (${asked.box}), native dialog ${nativeDialog}`);
  console.log(`     Keep it          -> xp still ${kept.xp}`);
  console.log(`     Erase            -> xp ${gone.xp}, best ${gone.pbBlitz}, sound kept ${gone.sound}`);
  console.log(`     axe ${v.length}`);
  v.forEach(x => console.log(`       [${x.impact}] ${x.id} x${x.n} :: ${x.sample}`));
  if (errs.length) console.log('     errors', errs[0]);
  await ctx.close();
}
await browser.close();
console.log(bad ? `\n${bad} problem(s)`
  : '\nSettings: whole rows toggle, button rows do not, and erasing asks in the page');
process.exit(bad ? 1 : 0);
