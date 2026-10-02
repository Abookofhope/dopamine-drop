/* Odd Skein: a wrong tile is not always the end.
 *
 *   - the grid grows to seven across and stops there (it used to reach eight, sixty-four near-identical tiles)
 *   - tries are paws: three for a new player, two in the middle, one at a high level; a wrong tile fades out and takes one paw, and
 *     the round only ends when the paws run out
 *   - Sniff rules out about half of the tiles that are left (and never the odd one), and there are only one or two of them
 *   - the right tile still wins, with or without a wrong tap first
 *
 *   node tools/probe/odd.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { odd: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'odd');
  await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
/* Which tile is the odd one: by colour for "tap the odd one out", the lightest or darkest when the prompt says so. */
const read = page => page.evaluate(() => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = tiles.map(rgb), key = c => c.join(',');
  let odd;
  if (/lightest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  else if (/darkest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  else { const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1); odd = cols.findIndex(c => n[key(c)] === 1); }
  const r = tiles.map(e => e.getBoundingClientRect());
  return { n: tiles.length, across: Math.round(Math.sqrt(tiles.length)), odd, prompt, paws: document.querySelectorAll('.oddpips i').length, pawsLeft: document.querySelectorAll('.oddpips i:not(.used)').length,
    faded: tiles.filter(e => e.classList.contains('ruled')).length, sniffText: (document.querySelector('.oddbar .sumtool') || {}).textContent || '',
    sniffOff: !!(document.querySelector('.oddbar .sumtool') || {}).disabled,
    xy: r.map(q => [q.left + q.width / 2, q.top + q.height / 2]), side: r[0].width,
    bar: (() => { const q = document.querySelector('.oddbar').getBoundingClientRect(), s = document.getElementById('surface').getBoundingClientRect(); return q.bottom <= s.bottom + 1 && q.top >= s.top - 1; })() };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const tap = async (page, s, i) => { await page.mouse.click(s.xy[i][0], s.xy[i][1]); await page.waitForTimeout(120); };
/* a round is two to four boards: keep finding the odd one until the score moves */
const playOut = async page => {
  for (let k = 0; k < 6; k++){
    await page.waitForSelector('#surface .oddwrap .tile'); await page.waitForTimeout(500);
    if (await score(page) > 0) return true;
    const s = await read(page); await tap(page, s, s.odd); await page.waitForTimeout(600);
    if (await score(page) > 0) return true;
  }
  return false;
};
const settled = async page => { await page.waitForTimeout(1500); await page.waitForSelector('#surface .oddwrap .tile'); await page.waitForTimeout(300); };

/* ── how big the grid gets, and how many paws ─────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, paws] of [[0, 'a new player', 3], [2000, 'a middle level', 2], [12000, 'a higher level', 2], [60000, 'a high level', 1]]){
  const seen = [];
  for (let k = 0; k < 3; k++){
    const page = await open(xp); const s = await read(page);
    seen.push(s);
    check(s.bar, `${label}: the paws and Sniff sit inside the play area (${s.across}x${s.across}, tiles ${Math.round(s.side)}px)`);
    await page.close();
  }
  check(seen.every(s => s.across <= 7), `${label}: never more than seven across (${seen.map(s => s.across).join(', ')})`);
  check(seen.every(s => s.side >= 34), `${label}: tiles stay big enough for a thumb (${Math.round(Math.min(...seen.map(s => s.side)))}px)`);
  check(seen.every(s => s.paws === paws && s.pawsLeft === paws), `${label}: ${paws} paw${paws > 1 ? 's' : ''} to start (${seen.map(s => s.paws).join(', ')})`);
}

/* ── a wrong tile fades and takes a paw while there are paws left ─────────────────────────────────────────────────────── */
{
  const page = await open(0); const s = await read(page);
  const w = s.xy.findIndex((_, i) => i !== s.odd);
  await tap(page, s, w);
  const a = await read(page);
  check(a.faded === 1 && a.pawsLeft === 2 && (await score(page)) === 0, `a wrong tile at the start fades out and takes one paw, and the round goes on (faded ${a.faded}, ${a.pawsLeft} paws left)`);
  check(/2/.test(a.prompt) && /try again/i.test(a.prompt), `and the words say how many tries are left ("${a.prompt}")`);
  await tap(page, a, w);
  check((await read(page)).pawsLeft === 2, 'tapping the faded tile again costs nothing');
  await tap(page, a, a.odd); await page.waitForTimeout(400);
  check(await playOut(page), 'finding the odd one after a wrong tap still wins the round');
  await page.close();
}
{
  /* three wrong tiles in a row end a round at three paws; the round is lost and a new one is dealt */
  const page = await open(0); let s = await read(page);
  const wrongs = s.xy.map((_, i) => i).filter(i => i !== s.odd).slice(0, 3);
  for (const i of wrongs) await tap(page, s, i);
  const lost = await page.evaluate(() => document.getElementById('prompt').textContent.trim());
  await settled(page);
  const after = await read(page);
  check((await score(page)) === 0 && after.faded === 0 && after.pawsLeft === 3, `a third wrong tile ends the round with no score and a new board is dealt ("${lost}", ${after.faded} faded, ${after.pawsLeft}/${after.paws} paws)`);
  await page.close();
}
{
  /* at a high level one paw: the first wrong tile ends the round */
  const page = await open(60000); const s = await read(page);
  const w = s.xy.findIndex((_, i) => i !== s.odd);
  await tap(page, s, w); await settled(page);
  const a = await read(page);
  check(a.faded === 0 && a.pawsLeft === a.paws, `at a high level one wrong tile ends the round and a new board is dealt (${a.pawsLeft}/${a.paws} paws)`);
  await page.close();
}

/* ── Sniff ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, count] of [[0, 'a new player', 2], [60000, 'a high level', 1]]){
  const page = await open(xp); const s = await read(page);
  check(new RegExp(String(count)).test(s.sniffText) && !s.sniffOff, `${label}: Sniff shows ${count} to use (${s.sniffText})`);
  await page.locator('.oddbar .sumtool').click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(250);
  const a = await read(page);
  const want = Math.floor((s.n - 1) / 2);
  check(a.faded === want, `${label}: Sniff fades about half of the tiles that are left (${a.faded} of ${s.n}, wanted ${want})`);
  const stillOdd = await page.evaluate(i => !document.querySelectorAll('#surface .oddwrap .tile')[i].classList.contains('ruled'), a.odd);
  check(stillOdd, `${label}: and never the odd one`);
  check(a.pawsLeft === a.paws, `${label}: and costs no paw`);
  if (count === 2){ await page.locator('.oddbar .sumtool').click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(250); const b = await read(page); check(b.faded > a.faded && b.sniffOff, `${label}: a second Sniff fades more, then Sniff is used up (${b.faded} faded)`); }
  await tap(page, a, a.odd); await page.waitForTimeout(400);
  check(await playOut(page), `${label}: the odd one still wins after Sniff`);
  await page.close();
}

/* ── small phone, other languages ─────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(12000, { width: 320, height: 568 }); const s = await read(page);
  check(s.bar && s.side >= 33, `320 wide: the grid and the bar fit (${s.across}x${s.across}, tiles ${Math.round(s.side)}px)`);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  check(!wide, '320 wide: nothing scrolls sideways');
  await page.close();
}
for (const lang of ['fr', 'es', 'de']){
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, hasTouch: true });
  await openApp(page, { reduceMotion: true, xp: 0, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { odd: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'odd'); await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(400);
  const s = await read(page);
  await tap(page, s, s.xy.findIndex((_, i) => i !== s.odd));
  const a = await read(page);
  check(!/\{|odd\./.test(s.sniffText + a.prompt) && a.prompt !== s.prompt && s.sniffText.length > 3, `${lang}: Sniff and the try-again words are in the language ("${s.sniffText}", "${a.prompt}")`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nOdd Skein gives you paws and a Sniff');
process.exit(bad ? 1 : 0);
