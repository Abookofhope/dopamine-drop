/* Needle Pass: a stitch in the wrong place takes a paw, not the round.
 *
 *   - at a new level there are three paws, shown above the board; a stitch while the needle is outside the window uses one, shakes
 *     the board, says the needle keeps going, and the round carries on
 *   - the third wrong stitch ends the round
 *   - at a high level there is one paw (no row of them) and the first wrong stitch ends the round
 *   - a stitch inside the window still counts
 *
 *   node tools/probe/skim.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, lang = 'en') => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { skim: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'skim');
  await page.waitForSelector('#surface .skimtrack .skimmark', { timeout: 9000 }); await page.waitForTimeout(800);
  return page;
};
const read = page => page.evaluate(() => {
  const mark = parseFloat(document.querySelector('.skimmark').style.left), z = document.querySelector('.skimzone');
  const zl = parseFloat(z.style.left), zw = parseFloat(z.style.width);
  const paws = document.querySelector('.budget.paws');
  return { mark, zl, zw, pawsShown: paws ? paws.querySelectorAll('i').length : 0, pawsLeft: paws ? paws.querySelectorAll('i:not(.used)').length : 0,
    pips: document.querySelectorAll('.skimpips i.on').length, prompt: document.getElementById('prompt').textContent.trim(), aria: paws ? paws.getAttribute('aria-label') : '' };
});
const tap = async page => { const r = await page.evaluate(() => { const b = document.querySelector('.skimtrack').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height * 0.8]; }); await page.mouse.click(r[0], r[1]); };
/* tap while the needle is clearly outside the window (4+ units away), or clearly inside it (within a quarter of its width of the middle) */
const wait = (page, where) => page.waitForFunction(where => {
  const m = parseFloat(document.querySelector('.skimmark').style.left), z = document.querySelector('.skimzone'), zl = parseFloat(z.style.left), zw = parseFloat(z.style.width);
  return where === 'out' ? (m < zl - 4 || m > zl + zw + 4) : Math.abs(m - (zl + zw / 2)) < zw * 0.2;
}, where, { timeout: 9000, polling: 6 });
const ended = page => page.waitForFunction(() => !document.querySelector('.budget.paws') || document.querySelectorAll('.budget.paws i:not(.used)').length === document.querySelectorAll('.budget.paws i').length, null, { timeout: 4000, polling: 30 }).then(() => true).catch(() => false);

/* ── a new level: three paws ──────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  check(s.pawsShown === 3 && s.pawsLeft === 3 && /3/.test(s.aria), `three paws are shown above the board (${s.pawsShown} shown, "${s.aria}")`);
  await wait(page, 'out'); await tap(page); await page.waitForTimeout(250);
  let a = await read(page);
  check(a.pawsLeft === 2 && a.pips === 0 && /needle/i.test(a.prompt), `a stitch outside the window uses a paw and the round goes on (${a.pawsLeft} left, "${a.prompt}")`);
  const shook = await page.evaluate(() => getComputedStyle(document.querySelector('.skimtrack')).animationName !== 'none' || document.querySelector('.skimtrack').classList.contains('flinch'));
  check(shook, 'and the board shakes');
  await wait(page, 'out'); await tap(page); await page.waitForTimeout(250);
  a = await read(page); check(a.pawsLeft === 1, `a second wrong stitch uses another (${a.pawsLeft} left)`);
  /* a stitch inside the window still counts */
  await wait(page, 'in'); await tap(page); await page.waitForTimeout(250);
  a = await read(page); check(a.pips >= 1 && a.pawsLeft === 1, `a stitch in the window still counts (${a.pips} laid) and costs no paw`);
  await wait(page, 'out'); await tap(page);
  check(await ended(page), 'the third wrong stitch ends the round and a new one starts with all its paws');
  await page.close();
}

/* ── a high level: one paw ────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(60000); const s = await read(page);
  check(s.pawsShown === 0, `at a high level there is no row of paws (one chance, as before; ${s.pawsShown} shown)`);
  await wait(page, 'out'); await tap(page); await page.waitForTimeout(900);
  const a = await read(page);
  check(a.pips === 0 && !/keeps going/.test(a.prompt), `and the first wrong stitch ends the round ("${a.prompt}")`);
  await page.close();
}

/* ── French ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0, 'fr'); const s = await read(page);
  await wait(page, 'out'); await tap(page); await page.waitForTimeout(250);
  const a = await read(page);
  check(/chances/.test(s.aria) && /aiguille/.test(a.prompt) && !/\{|skim\./.test(a.prompt + s.aria), `fr: the paws and the words are in French ("${s.aria}", "${a.prompt}")`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nNeedle Pass has paws');
process.exit(bad ? 1 : 0);
