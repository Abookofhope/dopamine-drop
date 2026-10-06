/* You and the Room as panels. Before: You was 10.8 screens of stats, a hundred
 * achievement tiles and sixty rows, and the Room 5.3 screens of four lists. Now
 * each long section is a closed panel whose header carries its count, so both
 * tabs open as roughly one screen and the section you want is a tap away.
 *
 *   PORT=8400 SITE=/tmp/pw/cur node tools/probe/panels.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab, openPanels, axeOn } from './harness.mjs';

const browser = await chromium.launch();
let bad = 0;
const check = (name, ok, extra = '') => {
  if (!ok) bad++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
};
const settle = page => page.waitForTimeout(340);

/* The Monday this week began on, the way the app keys it — so a save can say the week's wishes are all but done. */
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

const rich = { xp: 60000, solved: 900, runs: 120, lifetime: 80000, yarn: 300, yarnEver: 5000,
  marathon: { odd: 900, mend: 400, tumble: 700 }, pals: { biscuit: { bond: 3, pet: null, bow: '' } },
  palsOn: ['biscuit'], wishTotal: 12, introRoom: true, tokens: 0,
  wishes: { week: weekKey(), weekN: 9, weekDone: false } };

const panels = page => page.evaluate(() => [...document.querySelectorAll('.screen:not([hidden]) .setcard.acc')].map(c => {
  const head = c.querySelector('.acchead'), body = c.querySelector('.accin');
  const b = body.getBoundingClientRect(), cs = getComputedStyle(c.querySelector('.accbody'));
  return { id: c.dataset.acc, open: head.getAttribute('aria-expanded') === 'true',
    shown: b.height > 4 && cs.visibility !== 'hidden', hot: c.classList.contains('hot'),
    summary: c.querySelector('.acct small').textContent.trim(), h: Math.round(head.getBoundingClientRect().height) };
}));
const tall = page => page.evaluate(() => { const sc = document.querySelector('.screen:not([hidden]) .scroll');
  return { screens: +(sc.scrollHeight / sc.clientHeight).toFixed(2), spill: sc.scrollHeight - sc.clientHeight }; });

for (const [w, h, lang] of [[360, 640, 'en'], [320, 568, 'de'], [390, 844, 'fr']]){
  console.log(`\n── ${w}x${h} ${lang}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await openApp(page, { ...rich, lang });

  /* ── You ── */
  await goTab(page, 'Stats'); await settle(page);
  let ps = await panels(page), len = await tall(page);
  check('You has four panels', ps.length === 4, ps.map(p => p.id).join(','));
  check('all start shut', ps.every(p => !p.open && !p.shown));
  check('each header says what is inside', ps.every(p => p.summary.length > 1), ps.map(p => p.summary).join(' | '));
  check('every header is a 44px target', ps.every(p => p.h >= 44), ps.map(p => p.h).join(','));
  check('You is about a screen (was 10.8)', len.screens <= 1.5, len.screens + ' screens');
  await page.click('#accH_s-ach'); await settle(page);
  ps = await panels(page);
  check('Achievements opens', ps.find(p => p.id === 's-ach').shown);
  check('and shows its tiles', (await page.evaluate(() => document.querySelectorAll('#achGrid > *').length)) > 5);
  await page.click('#accH_s-ach'); await settle(page);
  await page.click('#accH_s-modes'); await settle(page);
  check('Every mode opens with its rows',
    (await page.evaluate(() => document.querySelectorAll('#sRows .scat').length)) > 2 && (await panels(page)).find(p => p.id === 's-modes').shown);
  await page.click('#accH_s-modes'); await settle(page);

  /* the Perks door from the Play tab opens its panel and takes you there */
  await goTab(page, 'Play'); await settle(page);
  /* The chip lives in the My Stuff view, which this probe is not opening; its handler is what is under test. */
  check('a perk is waiting, and the tab says so', !(await page.evaluate(() => document.getElementById('statsDot').hidden)));
  await page.evaluate(() => document.getElementById('perkCall').click());
  await page.waitForTimeout(900);
  ps = await panels(page);
  const pk = ps.find(p => p.id === 's-perks');
  const inView = await page.evaluate(() => { const r = document.getElementById('pkPanel').getBoundingClientRect();
    const sc = document.querySelector('#tabStats .scroll').getBoundingClientRect();
    return r.top >= sc.top - 2 && r.top < sc.bottom - 40; });
  check('the Perks link opens the panel', !!pk && pk.open && pk.shown);
  check('and scrolls it into view', inView);
  await page.click('#accH_s-perks'); await settle(page);

  /* ── the Room ── */
  await goTab(page, 'Room'); await settle(page);
  ps = await panels(page); len = await tall(page);
  check('the Room has four panels', ps.length === 4, ps.map(p => p.id).join(','));
  check('all start shut', ps.every(p => !p.open && !p.shown));
  check('each header says what is inside', ps.every(p => p.summary.length > 1), ps.map(p => p.summary).join(' | '));
  check('the Room is under two screens (was 5.3)', len.screens <= 2.0, len.screens + ' screens');
  ps = await panels(page);
  check('a wish ready to collect lights the header', ps.find(p => p.id === 'r-wishes').hot,
    ps.find(p => p.id === 'r-wishes').summary);
  await page.click('#accH_r-wishes'); await settle(page);
  check('and the wishes are inside it', (await page.evaluate(() => document.querySelectorAll('#wishList .wish').length)) >= 4);
  const claim = await page.evaluate(() => { const b = document.querySelector('#wishList .wish.week .wclaim');
    const r = b.getBoundingClientRect(); return { dis: b.disabled, h: Math.round(r.height), w: Math.round(r.width) }; });
  check('the collect button is enabled and 44px', !claim.dis && claim.h >= 44 && claim.w >= 44, JSON.stringify(claim));
  await page.click('#accH_r-wishes'); await settle(page);

  /* panels remember how you left them */
  await page.click('#accH_r-cats'); await settle(page);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  await page.evaluate(() => { const x = document.getElementById('wcSkip'); if (x && !document.getElementById('welcome').hidden) x.click(); });
  await goTab(page, 'Room'); await settle(page);
  ps = await panels(page);
  check('an open panel is still open after a reload', ps.find(p => p.id === 'r-cats').open);

  /* a screen reader gets the same panels: with every one open, nothing axe can fail on */
  for (const [tab, sel] of [['Stats', '#tabStats'], ['Room', '#tabRoom']]){
    await goTab(page, tab); await settle(page);
    await openPanels(page);
    const v = await axeOn(page, sel);
    check(`${tab}: axe (WCAG 2.1 A/AA) with every panel open`, v.length === 0, v.map(x => `${x.id}x${x.n} ${x.sample}`).join(' | '));
  }

  check('no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nYou and the Room fold into panels');
process.exit(bad ? 1 : 0);
