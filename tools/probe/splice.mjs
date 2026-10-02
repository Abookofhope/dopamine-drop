/* Splice: the tiles fill the board, a joined word reads in full, and a hint shows one pair.
 *
 *   - the tiles share the board's height (at least 70px tall on a phone, 48px on the smallest) instead of a small stack in the middle
 *   - a wrong pairing costs a move; the right one locks the two, shows the whole word on the left and ticks off the loose end
 *   - Hint (two a round) lights one beginning and the end that belongs to it, and they pair when tapped
 *   - joining every pair wins, with taps and with a dragged end, and the button is translated
 *
 *   node tools/probe/splice.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }, lang = 'en') => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { splice: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'splice');
  await page.waitForSelector('#surface .splwrap .spltile', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const el = e => ({ ...R(e), text: e.textContent.trim(), locked: e.classList.contains('locked'), hint: e.classList.contains('hint'), src: e.dataset.src === undefined ? -1 : Number(e.dataset.src) });
  const sf = R(document.getElementById('surface')), tool = document.querySelector('.splwrap').parentNode.querySelector('.sumtool');
  return { surface: sf, heads: [...document.querySelectorAll('.spltile.head')].map(el), tails: [...document.querySelectorAll('.spltile.tail')].map(el),
    hint: tool ? { ...R(tool), text: tool.textContent.trim(), off: tool.disabled } : null, budget: (document.querySelector('.budget') || {}).textContent || '' };
});
const left = s => parseInt((s.budget.match(/\d+/) || ['0'])[0], 10);
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const mid = b => [b.x + b.w / 2, b.y + b.h / 2];
const click = async (page, b) => { const [x, y] = mid(b); await page.mouse.click(x, y); await page.waitForTimeout(110); };

/* ── the tiles fill the board ─────────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, vp, minH] of [[0, 'a new player', { width: 400, height: 820 }, 70], [60000, 'a high level', { width: 400, height: 820 }, 48], [0, 'a new player on a 320px phone', { width: 320, height: 568 }, 48]]){
  const page = await open(xp, vp); const s = await read(page);
  check([...s.heads, ...s.tails].every(t => t.h >= minH), `${label}: every tile is at least ${minH}px tall (${s.heads.map(t => Math.round(t.h)).join(', ')})`);
  check([...s.heads, ...s.tails].every(t => t.w >= 100 && t.x >= 0 && t.x + t.w <= vp.width), `${label}: and wide enough, and inside the screen`);
  check(!!s.hint && s.hint.h >= 40 && s.hint.y + s.hint.h <= s.surface.y + s.surface.h + 1, `${label}: Hint is inside the board and big enough to hit (${s.hint && Math.round(s.hint.h)}px)`);
  await page.close();
}

/* ── a wrong pairing, a right one, and the hint ───────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  const before = left(s);
  const wrongTail = s.tails.find(t => t.src !== 0);
  await click(page, s.heads[0]); await click(page, wrongTail);
  s = await read(page);
  check(left(s) === before - 1 && !s.heads[0].locked, `a wrong pairing costs a move and locks nothing (${before} -> ${left(s)} left)`);
  await page.waitForTimeout(400);
  /* the hint */
  await click(page, s.hint); s = await read(page);
  const hh = s.heads.findIndex(h => h.hint), ht = s.tails.findIndex(t => t.hint);
  check(hh >= 0 && ht >= 0 && s.tails[ht].src === hh, `Hint lights a beginning and the end that belongs to it (head ${hh + 1}, its end is tile ${ht + 1})`);
  check(/1/.test(s.hint.text), `and uses one of two (${s.hint.text})`);
  await click(page, s.heads[hh]); await click(page, s.tails[ht]); s = await read(page);
  check(s.heads[hh].locked && s.tails[ht].locked, 'tapping the lit pair joins it');
  const word = (await page.evaluate(i => document.querySelectorAll('.spltile.head')[i].textContent.trim(), hh));
  check(word.length >= 4 && /^[A-ZÀ-ÖØ-ÞŒ]+$/i.test(word), `the joined word reads in full on the left ("${word}")`);
  check(s.tails[ht].text === '✓', 'and the loose end it came from is ticked off');
  /* the rest, one by one, the last by dragging the end onto the beginning */
  for (let i = 0; i < s.heads.length; i++){
    if (i === hh) continue;
    const tail = s.tails.find(t => t.src === i);
    if (i === s.heads.length - 1 || (i === s.heads.length - 2 && hh === s.heads.length - 1)){
      const [fx, fy] = mid(s.heads[i]), [tx, ty] = mid(tail);
      await page.mouse.move(fx, fy); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(150);
    } else { await click(page, s.heads[i]); await click(page, tail); }
  }
  await page.waitForTimeout(600);
  check(await score(page) > 0, 'joining every pair wins the round');
  await page.close();
}

/* ── French ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(!!s.hint && /Indice/.test(s.hint.text), `fr: Hint is in French (${s.hint && s.hint.text})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nSplice fills the board and shows the words it makes');
process.exit(bad ? 1 : 0);
