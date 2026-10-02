/* Paws on Dye Trap, Quick Count and Count the Stitches: a wrong answer takes a paw, not the round.
 *
 *   - at a new level there are three paws above the board (they are the round's, not each board's: a round of several boards keeps
 *     the same three), a wrong choice uses one and the round goes on, and the third wrong choice ends the round
 *   - the right choice still wins the board, and a wrong swatch / number is ruled out while a wrong stitch just shakes
 *   - at a high level there is one paw and no row of them: the first wrong choice ends the round as before
 *
 *   node tools/probe/paws.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (mode, sel, xp, lang = 'en') => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { [mode]: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, mode);
  await page.waitForSelector(sel, { timeout: 9000 }); await page.waitForTimeout(900);
  return page;
};
const paws = page => page.evaluate(() => { const c = document.querySelector('.budget.paws'); return { shown: c ? c.querySelectorAll('i').length : 0, left: c ? c.querySelectorAll('i:not(.used)').length : 0, aria: c ? c.getAttribute('aria-label') : '', prompt: document.getElementById('prompt').textContent.trim() }; });
const centre = (page, loc) => loc.evaluate(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
const click = async (page, loc) => { const [x, y] = await centre(page, loc); await page.mouse.click(x, y); await page.waitForTimeout(160); };
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const hexOf = rgb => '#' + (rgb.match(/\d+/g) || []).slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');

/* what a wrong choice and the right choice are, per mode */
const modes = {
  stroop: {
    name: 'Dye Trap', sel: '#surface .swatch.dyedrop',
    pick: async page => {
      const ink = await page.evaluate(() => getComputedStyle(document.querySelector('.stroopword')).color);
      const hex = hexOf(ink).toLowerCase();
      const sw = await page.$$eval('.swatch.dyedrop', els => els.map(e => ({ hex: (e.dataset.hex || '').toLowerCase(), off: e.disabled })));
      const right = sw.findIndex(x => x.hex === hex), wrong = sw.findIndex((x, i) => i !== right && !x.off);
      return { right: page.locator('.swatch.dyedrop').nth(right), wrong: page.locator('.swatch.dyedrop').nth(wrong) };
    },
    ruled: page => page.evaluate(() => document.querySelectorAll('.swatch.ruled').length)
  },
  count: {
    name: 'Quick Count', sel: '#surface .answers .abtn',
    pick: async page => {
      const ans = await page.evaluate(() => document.querySelector('.answers').dataset.answer);
      const t = await page.$$eval('.answers .abtn', els => els.map(e => ({ text: e.textContent.trim(), off: e.disabled })));
      const right = t.findIndex(x => x.text === ans), wrong = t.findIndex((x, i) => i !== right && !x.off);
      return { right: page.locator('.answers .abtn').nth(right), wrong: page.locator('.answers .abtn').nth(wrong) };
    },
    ruled: page => page.evaluate(() => document.querySelectorAll('.abtn.ruled').length)
  },
  order: {
    name: 'Count the Stitches', sel: '#surface .bub',
    pick: async page => {
      const t = await page.$$eval('.bub', els => els.map(e => ({ text: e.textContent.trim(), done: e.classList.contains('done') })));
      const left = t.map((x, i) => ({ ...x, i })).filter(x => !x.done), nums = left.map(x => Number(x.text));
      const right = left[nums.indexOf(Math.min(...nums))].i, wrong = left.find(x => x.i !== right).i;
      return { right: page.locator('.bub').nth(right), wrong: page.locator('.bub').nth(wrong) };
    },
    ruled: page => page.evaluate(() => document.querySelectorAll('.bub.ruled').length)
  }
};

for (const [id, m] of Object.entries(modes)){
  /* a new level: three paws */
  {
    const page = await open(id, m.sel, 0); let s = await paws(page);
    check(s.shown === 3 && s.left === 3 && /3/.test(s.aria), `${m.name}: three paws are shown above the board ("${s.aria}")`);
    let p = await m.pick(page); await p.wrong.click({ force: true }); await page.waitForTimeout(250);
    s = await paws(page);
    check(s.left === 2 && /try again/i.test(s.prompt) && (await score(page)) === 0, `${m.name}: a wrong choice uses a paw and the round goes on (${s.left} left, "${s.prompt}")`);
    if (id !== 'order') check((await m.ruled(page)) === 1, `${m.name}: and the wrong choice is ruled out`);
    p = await m.pick(page); await p.wrong.click({ force: true }); await page.waitForTimeout(250);
    s = await paws(page); check(s.left === 1, `${m.name}: a second wrong choice uses another (${s.left} left)`);
    /* the right one still wins the board, and the paws belong to the round: they are not refilled by the next board */
    p = await m.pick(page); await p.right.click({ force: true }); await page.waitForTimeout(700);
    s = await paws(page);
    check(s.left === 1 && s.shown === 3, `${m.name}: the right choice still wins the board and the paws carry on (${s.left} of ${s.shown} left)`);
    p = await m.pick(page).catch(() => null);
    if (p){ await p.wrong.click({ force: true }); }
    const ended = await page.waitForFunction(() => { const c = document.querySelector('.budget.paws'); return !c || c.querySelectorAll('i:not(.used)').length === c.querySelectorAll('i').length; }, null, { timeout: 4000, polling: 30 }).then(() => true).catch(() => false);
    check(ended, `${m.name}: the third wrong choice ends the round and the next one starts with all its paws`);
    await page.close();
  }
  /* a high level: one paw */
  {
    const page = await open(id, m.sel, 60000); const s = await paws(page);
    check(s.shown === 0, `${m.name}: at a high level there is no row of paws (${s.shown} shown)`);
    await page.close();
  }
}

/* French */
{
  const page = await open('count', modes.count.sel, 0, 'fr'); let s = await paws(page);
  const p = await modes.count.pick(page); await p.wrong.click({ force: true }); await page.waitForTimeout(250);
  const a = await paws(page);
  check(/chances/.test(s.aria) && /encore/.test(a.prompt) && !/\{|paws\./.test(s.aria + a.prompt), `fr: the paws and the words are in French ("${s.aria}", "${a.prompt}")`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nDye Trap, Quick Count and Count the Stitches have paws');
process.exit(bad ? 1 : 0);
