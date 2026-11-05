/* Make it yours (v0.152.0): Sparkle kits, stations, something for a cat to wear, a treat, a name, saved kits, the
 * style profile. Everything is bought with yarn, with two taps (the first asks), and nothing changes the puzzles.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/kit.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab } from './harness.mjs';

let bad = 0;
/* On a build without these features the page has none of their elements: say so as a failure rather than a stack trace. */
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 120)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const sv = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')) || {});
async function open(state){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true }, state));
  return { page, ctx };
}
/* Yarn is read after load: the seeded totals unlock achievements, which pay their yarn once at boot. */
const yarnNow = async page => (await sv(page)).yarn | 0;
const openAcc = (page, key) => page.evaluate(k => { const h = document.getElementById('accH_' + k); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); }, key);

/* ── 1. a Sparkle kit: two taps buy it, and it is worn at once ── */
{
  const { page, ctx } = await open({ yarn: 5000, yarnEver: 5000 });
  await goTab(page, 'Settings');
  await openAcc(page, 'cosmetic'); await page.waitForTimeout(300);
  const y0 = await yarnNow(page);
  const sw = () => page.evaluate(() => [...document.querySelectorAll('#cosmeticRow .swatch')].map(b => b.getAttribute('aria-label')));
  const labels = await sw();
  check(labels.some(l => /Sakura/.test(l) && /900/.test(l)), `Sakura is on sale for 900 yarn (${labels.filter(l => /Sakura/.test(l)).join('')})`);
  const tapSakura = () => page.evaluate(() => [...document.querySelectorAll('#cosmeticRow .swatch')].find(b => /Sakura/.test(b.getAttribute('aria-label'))).click());
  await tapSakura(); await page.waitForTimeout(150);
  check(await yarnNow(page) === y0, 'the first tap only asks');
  await tapSakura(); await page.waitForTimeout(250);
  const s1 = await sv(page);
  check(y0 - s1.yarn === 900 && s1.cosmetic === 'sakura' && s1.owned && s1.owned.kit && s1.owned.kit.sakura, `the second buys it for 900 and puts it on (${y0 - s1.yarn} spent, ${s1.cosmetic})`);
  await ctx.close();
}

/* ── 2. a station (under 500 solves, so the Music Box is not yet open) ── */
{
  const { page, ctx } = await open({ yarn: 1000, yarnEver: 1000, solved: 120 });
  await goTab(page, 'Settings');
  await openAcc(page, 'feedback'); await page.waitForTimeout(300);
  const y0 = await yarnNow(page);
  const paws = () => page.evaluate(() => document.querySelector('#stationRow .seg[data-st="paws"]').click());
  await paws(); await paws(); await page.waitForTimeout(250);
  const s = await sv(page);
  check(s.station === 'paws' && y0 - s.yarn === 800, `Busy Paws is bought for 800 and tuned in (${s.station}, ${y0 - s.yarn} spent)`);
  const box = () => page.evaluate(() => document.querySelector('#stationRow .seg[data-st="box"]').click());
  await box(); await box(); await page.waitForTimeout(200);
  const s2 = await sv(page);
  check(s2.station === 'paws' && s2.yarn === s.yarn, 'the Music Box cannot be bought: it comes with 500 solves');
  await ctx.close();
}
{
  /* past 500 solves it is simply there, for nothing */
  const { page, ctx } = await open({ yarn: 0, yarnEver: 0, solved: 600 });
  await goTab(page, 'Settings');
  await openAcc(page, 'feedback'); await page.waitForTimeout(300);
  const y0 = await yarnNow(page);
  await page.evaluate(() => document.querySelector('#stationRow .seg[data-st="box"]').click()); await page.waitForTimeout(200);
  const s = await sv(page);
  check(s.station === 'box' && s.yarn === y0, `past 500 solves the Music Box tunes in for nothing (${s.station})`);
  await ctx.close();
}

/* ── 3. something to wear, a treat, a name ── */
{
  const pals = { biscuit: { bond: 905, pet: null, bow: '' } };
  const { page, ctx } = await open({ yarn: 1000, yarnEver: 1000, pals, palsOn: ['biscuit'] });
  await goTab(page, 'Room');
  await openAcc(page, 'r-cats'); await page.waitForTimeout(300);
  await page.evaluate(() => { const c = [...document.querySelectorAll('.palcard')].find(c => /Biscuit/.test(c.textContent)); c.click(); });
  await page.waitForTimeout(400);
  const y0 = await yarnNow(page);
  const has = await page.evaluate(() => !!document.querySelector('.metasheet .palextras'));
  check(has, "a cat's card has something to wear, a treat and a name");
  const collar = () => page.evaluate(() => document.querySelector('.metasheet .accbtn').click());
  await collar(); await collar(); await page.waitForTimeout(300);
  const s = await sv(page);
  check(s.pals.biscuit.acc === 'collar' && y0 - s.yarn === 150, `a collar for 150, worn at once (${s.pals.biscuit.acc}, ${y0 - s.yarn} spent)`);
  const drawn = await page.evaluate(() => /stroke="#E8618C"/.test(document.getElementById('roomScene').innerHTML));
  check(drawn, 'and Biscuit wears it in the Room');
  await page.evaluate(() => document.querySelector('.metasheet .treatbtn').click()); await page.waitForTimeout(250);
  const s2 = await sv(page);
  check(s2.pals.biscuit.bond === 915 && s.yarn - s2.yarn === 25, `a treat is 25 yarn for 10 bond (${s2.pals.biscuit.bond} bond, ${s.yarn - s2.yarn} spent)`);
  await page.evaluate(() => { const i = document.querySelector('.metasheet .namerow input'); i.value = 'Muffin'; [...document.querySelectorAll('.metasheet .namerow button')][0].click(); });
  await page.waitForTimeout(250);
  check((await sv(page)).pals.biscuit.name === 'Muffin', 'past 900 bond the cat takes a name of your own');
  await page.evaluate(() => { const c = document.querySelector('.metasheet'); if (c) c.click(); });
  await ctx.close();
}

/* ── 4. saved kits ── */
{
  const pals = { biscuit: { bond: 0, pet: null, bow: '' }, noodle: { bond: 0, pet: null, bow: '' } };
  const { page, ctx } = await open({ pals, palsOn: ['biscuit'], room: { rug: 3, window: 3, wall: 3, shelf: 1 }, cosmetic: 'teal' });
  await goTab(page, 'Room');
  await openAcc(page, 'r-seats'); await page.waitForTimeout(300);
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#kitList .kitrow')]);
  await page.evaluate(() => document.querySelectorAll('#kitList .kitrow')[0].querySelectorAll('button')[1].click());
  await page.waitForTimeout(150);
  /* change the cat riding along, then put kit 1 back */
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dd.v1')); s.palsOn = ['noodle']; localStorage.setItem('dd.v1', JSON.stringify(s)); });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400);
  await goTab(page, 'Room');
  await openAcc(page, 'r-seats'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll('#kitList .kitrow')[0].querySelectorAll('button')[0].click());
  await page.waitForTimeout(200);
  check((await sv(page)).palsOn.join() === 'biscuit', `Use puts kit 1's cats back (${(await sv(page)).palsOn.join()})`);
  await ctx.close();
}

/* ── 5. the style profile ── */
{
  const { page, ctx } = await open({ glog: 'ppppsscccnnnnnnnnnnn' });
  await goTab(page, 'Stats');
  const st = await page.evaluate(() => { const c = document.getElementById('styleCard'); return c && !c.hidden ? c.innerText.replace(/\s+/g, ' ') : ''; });
  check(/Purrfect 20%/.test(st) && /Swift 30%/.test(st) && /Clean 35%/.test(st), `You shows the style of your last solves ("${st}")`);
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
