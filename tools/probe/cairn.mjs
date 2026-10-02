/* Folds: a drop that misses the stack altogether is not always the end.
 *
 *   - at a new level a full miss slips off, the next block is a little narrower, and the words say how many chances are left (two)
 *   - the third full miss ends the round
 *   - at a high level there are no chances: the first full miss ends the round
 *
 *   node tools/probe/cairn.mjs
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
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { cairn: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'cairn');
  await page.waitForSelector('#surface .cairnwrap .cmove', { timeout: 9000 }); await page.waitForTimeout(800);
  return page;
};
const read = page => page.evaluate(() => {
  const m = document.querySelector('.cmove');
  return { layers: document.querySelectorAll('.clayer').length, fell: !!document.querySelector('.cmove.fell'), gone: !m,
    left: m ? parseFloat(m.style.left) : -1, width: m ? parseFloat(m.style.width) : -1, prompt: document.getElementById('prompt').textContent.trim() };
});
const tapWrap = async page => { const r = await page.evaluate(() => { const b = document.querySelector('.cairnwrap').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }); await page.mouse.click(r[0], r[1]); };
/* tap when the moving block is at an edge of its track */
const tapAtEdge = async (page, side) => {
  await page.waitForFunction(side => { const m = document.querySelector('.cmove'); if (!m) return false; const l = parseFloat(m.style.left), w = parseFloat(m.style.width); return side === 'left' ? l <= 2 : l >= 98 - w - 2; }, side, { timeout: 8000, polling: 8 });
  await tapWrap(page);
};

/* ── a new level: chances ─────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0);
  let s = await read(page);
  /* a drop at the far left overlaps the foundation a little, so it lands narrow */
  await tapAtEdge(page, 'left'); await page.waitForTimeout(150);
  let a = await read(page);
  check(a.layers === 2 && a.width < s.width, `a clumsy drop lands narrow and the next block is narrower (${s.width.toFixed(1)} -> ${a.width.toFixed(1)}, ${a.layers} layers)`);
  /* now a full miss from the other end */
  await tapAtEdge(page, 'right'); await page.waitForTimeout(200);
  let b = await read(page);
  check(!b.fell && !b.gone && b.layers === 2 && b.width < a.width && /1/.test(b.prompt) && /slip/i.test(b.prompt), `a full miss slips off, the block is narrower and the words say one chance is left ("${b.prompt}", ${a.width.toFixed(1)} -> ${b.width.toFixed(1)})`);
  await tapAtEdge(page, 'left'); await page.waitForTimeout(200);
  let c = await read(page);
  check(!c.fell && c.layers === 2 && /0/.test(c.prompt), `a second full miss slips too and none are left ("${c.prompt}")`);
  await tapAtEdge(page, 'right');
  const ended = await page.waitForFunction(() => { const m = document.querySelector('.cmove'); return !m || m.classList.contains('fell'); }, null, { timeout: 4000, polling: 20 }).then(() => true).catch(() => false);
  check(ended, 'the third full miss ends the round');
  await page.close();
}

/* ── a high level: no chances ─────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(60000);
  await tapAtEdge(page, 'left');
  const ended = await page.waitForFunction(() => { const m = document.querySelector('.cmove'); return !m || m.classList.contains('fell'); }, null, { timeout: 4000, polling: 20 }).then(() => true).catch(() => false);
  const s = await read(page);
  check(ended || s.layers === 2, `at a high level the first full miss ends the round (${ended ? 'it did' : 'it did not, ' + s.layers + ' layers'})`);
  await page.close();
}

/* ── French ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0, 'fr');
  await tapAtEdge(page, 'left'); await page.waitForTimeout(150); await tapAtEdge(page, 'right'); await page.waitForTimeout(200);
  const s = await read(page);
  check(/glissé/.test(s.prompt) && !/\{/.test(s.prompt), `fr: the slip words are in French ("${s.prompt}")`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nFolds gives you chances while the tower is young');
process.exit(bad ? 1 : 0);
