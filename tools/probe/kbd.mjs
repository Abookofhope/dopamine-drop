/* Keyboard play on every board (bible 13, AAA: accessibility).
 *
 * For each game, with no mouse or touch at all: Tab from the top of the page until the board has focus, then use the
 * keyboard pointer (v0.156.0): Enter taps at five places, Space held while the arrows move drags, Space held still holds.
 * Then Tab on to the board's own buttons, if it has any, and press Enter on each of the first three. The board has answered when the line under the score or the score changes, the round ends, or the board changes clearly
 * more than it does by itself (some boards move all the time). A board that cannot be reached by Tab, or that answers
 * none of the three, cannot be played without a pointer.
 *
 *   PORT=8502 SITE=/path/to/built ONLY=odd,order node tools/probe/kbd.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, modeIdsFromBuild } from './harness.mjs';

const ids = process.env.ONLY ? process.env.ONLY.split(',') : modeIdsFromBuild(process.env.SITE || '.');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 820 } });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 100)));
const SEEN = Object.fromEntries(ids.map(id => [id, 1]));

const arm = () => page.evaluate(() => {
  window.__mut = 0; window.__score = (document.getElementById('hudScore') || {}).textContent || '';
  if (window.__mo) window.__mo.disconnect();
  window.__mo = new MutationObserver(m => { window.__mut += m.length; });
  for (const id of ['surface', 'prompt']){ const e = document.getElementById(id); if (e) window.__mo.observe(e, { subtree: true, childList: true, attributes: true, characterData: true }); }
});
const answered = () => page.evaluate(() => window.__mut > 0 || ((document.getElementById('hudScore') || {}).textContent || '') !== window.__score || !document.getElementById('over').hidden);
const inBoard = () => page.evaluate(() => { const a = document.activeElement; return !!(a && a.closest && a.closest('#surface')); });

const press = async (k, n = 1) => { for (let i = 0; i < n; i++) await page.keyboard.press(k); };
const idle = async ms => { await arm(); await page.waitForTimeout(ms); return page.evaluate(() => window.__mut); };
const signal = () => page.evaluate(() => ({ p: (document.getElementById('prompt') || {}).textContent || '', s: (document.getElementById('hudScore') || {}).textContent || '', over: !document.getElementById('over').hidden }));
const onBoard = () => page.evaluate(() => document.activeElement === document.getElementById('surface'));
/* Did the board answer this action, beyond what it does by itself (some boards move all the time)? */
async function tryIt(base, act){
  const s0 = await signal(); await arm(); await act(); await page.waitForTimeout(260);
  const m = await page.evaluate(() => window.__mut), s1 = await signal();
  if (process.env.DEBUG) console.log('   ', JSON.stringify({ base, m, p0: s0.p.slice(0, 30), p1: s1.p.slice(0, 30), focus: await page.evaluate(() => { const a = document.activeElement; return a ? (a.id || String(a.className)).slice(0, 30) + (a.disabled ? ' (disabled)' : '') : ''; }) }));
  /* a still board: any change is an answer (turning one tile is one or two); a moving board must clearly beat its own motion */
  return s1.over || s1.p !== s0.p || s1.s !== s0.s || (base === 0 ? m > 0 : m > base * 1.5 + 3);
}

const rows = [];
for (const id of ids){
  errs.length = 0;
  await openApp(page, { reduceMotion: true, sound: false, haptics: false, onboarded: true, seen: SEEN, xp: 9000, runs: 40, solved: 600 });
  await openModeList(page);
  if (!await clickMode(page, id).then(() => true, () => false)){ rows.push({ id, err: 'no card' }); continue; }
  await page.waitForFunction(() => [...document.getElementById('surface').children].some(c => c.id !== 'count' && !c.classList.contains('swap')), null, { timeout: 9000, polling: 50 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  /* Tab in from the top until the board itself has focus */
  let tabs = 0, reached = false;
  for (; tabs < 40 && !reached; tabs++){ await page.keyboard.press('Tab'); reached = await onBoard(); }
  const base = await idle(260);
  let verbs = [];
  if (reached){
    /* taps: Enter at the middle and the four quarters */
    let taps = 0;
    for (const [dx, dy] of [[0, 0], [-5, -5], [10, 0], [0, 10], [-10, 0]]){
      if ((await signal()).over) break;
      if (!await onBoard()) await page.focus('#surface');
      if (await tryIt(base, async () => { await press(dx < 0 ? 'ArrowLeft' : 'ArrowRight', Math.abs(dx)); await press(dy < 0 ? 'ArrowUp' : 'ArrowDown', Math.abs(dy)); await page.keyboard.press('Enter'); })) taps++;
    }
    verbs.push(`taps ${taps}/5`);
    /* a drag: Space held while the pointer travels down and across */
    let drag = false;
    if (!(await signal()).over){ if (!await onBoard()) await page.focus('#surface');
      drag = await tryIt(base, async () => { await press('ArrowUp', 6); await page.keyboard.down(' '); await press('ArrowDown', 8); await press('ArrowRight', 4); await page.keyboard.up(' '); }); }
    verbs.push(`drag ${drag ? 'yes' : 'no'}`);
    /* a hold: Space down for most of a second */
    let hold = false;
    if (!(await signal()).over){ if (!await onBoard()) await page.focus('#surface');
      hold = await tryIt(base, async () => { await page.keyboard.down(' '); await page.waitForTimeout(900); await page.keyboard.up(' '); }); }
    verbs.push(`hold ${hold ? 'yes' : 'no'}`);
    /* and the board's own controls: Tab on from the board to each of its first three buttons and press Enter */
    let btn = 0;
    if (!(await signal()).over){
      await page.focus('#surface');
      for (let i = 0; i < 3 && !(await signal()).over; i++){
        await page.keyboard.press('Tab');
        const inside = await page.evaluate(() => { const a = document.activeElement, s = document.getElementById('surface'); return !!a && a !== s && s.contains(a); });
        if (!inside) break;
        if (await tryIt(base, () => page.keyboard.press('Enter'))) btn++;
      }
    }
    verbs.push(`buttons ${btn}`);
    rows.push({ id, tabs, verbs, ok: taps > 0 || drag || hold || btn > 0, errs: [...new Set(errs)].slice(0, 1) });
  } else rows.push({ id, tabs: null, verbs, ok: false, errs: [...new Set(errs)].slice(0, 1) });
}
await browser.close();
let dead = 0;
for (const r of rows){
  const ok = !r.err && r.ok && !(r.errs && r.errs.length);
  if (!ok) dead++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.id.padEnd(10)} ${r.err || `${r.tabs === null ? 'the board is not reached by Tab' : 'board in ' + r.tabs + ' Tabs'} · ${r.verbs.join(' · ')}`}${r.errs && r.errs.length ? ' · ERR ' + r.errs[0] : ''}`);
}
console.log(dead ? `\n${dead} of ${rows.length} games cannot be played from the keyboard` : `\nevery game can be played from the keyboard (${rows.length})`);
process.exit(dead ? 1 : 0);
