/* Tablets (v0.162.0): the screens use the room a tablet has, and every board still fits and can be played.
 *
 * The app is a column of screens. On a phone it is up to 460px wide; on a screen at least 700px each way (a tablet, in
 * either orientation) it widens to 640px, keeping a margin, so a board is not a phone-sized strip in the middle of it.
 *
 *   1. The column: 640px and centred on four tablet shapes; still 460px or less on phones, upright and on their side.
 *   2. The four tabs and a bottom sheet on a tablet: nothing wider than the screen, nothing outside the column, and
 *      the sheet as wide as the column.
 *   3. Every board, at an upright and a sideways tablet: it opens, it fits on the screen, and nothing drawn over it
 *      (a chip or a note placed on top of the board) covers a tile, a cell or a button the player has to reach.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/tablet.mjs
 *   ONLY=1|2|3   one part;   MODES=forge,odd   some boards
 */
import { chromium } from 'playwright';
import { openApp, goTab, openModeList, clickMode, quitToHome, modeList } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const ONLY = process.env.ONLY || '';
const part = n => !ONLY || ONLY === String(n);
const browser = await chromium.launch();
const errs = [];
const PROF = { xp: 9000, runs: 40, solved: 600, onboarded: true, yarn: 300, reduceMotion: true };
const TABLETS = [[768, 1024], [1024, 768], [820, 1180], [1180, 820]];
const PHONES = [[360, 640], [390, 844], [844, 390], [568, 320]];

async function open(w, h){
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await openApp(page, PROF);
  return page;
}
const column = page => page.evaluate(() => { const r = document.querySelector('.cab').getBoundingClientRect(); return { left: Math.round(r.left), w: Math.round(r.width), right: Math.round(innerWidth - r.right) }; });

/* ── 1. the column ── */
if (part(1)){
  for (const [w, h] of TABLETS){
    const page = await open(w, h); const c = await column(page);
    check(c.w === 640 && Math.abs(c.left - c.right) <= 1, `${w}x${h}: the column is 640px and centred (${c.w}, margins ${c.left}/${c.right})`);
    await page.close();
  }
  for (const [w, h] of PHONES){
    const page = await open(w, h); const c = await column(page);
    check(c.w <= 460 && c.w === Math.min(460, w), `${w}x${h}: a phone keeps its column (${c.w})`);
    await page.close();
  }
}

/* ── 2. the tabs and a sheet ── */
if (part(2)){
  for (const [w, h] of [[820, 1180], [1180, 820]]){
    const page = await open(w, h);
    for (const tab of ['Play', 'Modes', 'Room', 'Stats']){
      await goTab(page, tab); await page.waitForTimeout(350);
      const r = await page.evaluate(() => {
        const cab = document.querySelector('.cab').getBoundingClientRect();
        const out = [...document.querySelectorAll('.cab *')].filter(e => { const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false;
          const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.position === 'fixed') return false;
          return b.left < cab.left - 1 || b.right > cab.right + 1; }).map(e => e.id || e.className).slice(0, 4);
        return { over: document.documentElement.scrollWidth > innerWidth, out };
      });
      check(!r.over && !r.out.length, `${w}x${h} ${tab}: nothing wider than the screen or outside the column (${r.out.join(', ') || 'clean'})`);
    }
    await goTab(page, 'Play');
    await page.evaluate(() => document.getElementById('logBtn').click()); await page.waitForTimeout(400);
    const s = await page.evaluate(() => { const p = document.querySelector('#logSheet .panel').getBoundingClientRect(), c = document.querySelector('.cab').getBoundingClientRect(); return [Math.round(p.width), Math.round(c.width)]; });
    check(s[0] === s[1], `${w}x${h}: a bottom sheet is as wide as the column (${s[0]} and ${s[1]})`);
    await page.close();
  }
}

/* ── 3. every board ── */
if (part(3)){
  for (const [w, h] of [[820, 1180], [1024, 768]]){
    const page = await open(w, h);
    let ids = (await modeList(page)).map(m => m.id);
    if (process.env.MODES) ids = ids.filter(id => process.env.MODES.split(',').includes(id));
    const bad3 = [];
    for (const id of ids){
      await openModeList(page); await clickMode(page, id);
      await page.waitForFunction(() => { const s = document.getElementById('surface'); return s && s.children.length > 0 && !document.getElementById('count'); }, null, { timeout: 9000 }).catch(() => {});
      await page.waitForTimeout(1300);
      const r = await page.evaluate(() => {
        const vis = e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
        const sf = document.getElementById('surface'), sr = sf.getBoundingClientRect();
        const fits = sr.top >= -1 && sr.left >= -1 && sr.bottom <= innerHeight + 1 && sr.right <= innerWidth + 1;
        /* things the player reaches for, and things laid over the board that carry words */
        const targets = [...sf.querySelectorAll('button, [role="button"], .tile, .cell, .fcell')].filter(vis);
        const overlays = [...sf.querySelectorAll('*')].filter(e => vis(e) && /absolute|fixed/.test(getComputedStyle(e).position) && e.children.length === 0 && (e.textContent || '').trim().length > 2
          && !targets.includes(e) && !targets.some(t => t.contains(e)));
        const hits = [];
        for (const o of overlays){ const a = o.getBoundingClientRect();
          for (const t of targets){ if (t.contains(o) || o.contains(t)) continue; const b = t.getBoundingClientRect();
            const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (ix > 4 && iy > 4){ hits.push(`"${o.textContent.trim().slice(0, 28)}" over ${t.className || t.tagName}`); break; } } }
        return { fits, sr: [sr.top, sr.bottom].map(Math.round), hits: hits.slice(0, 2) };
      });
      if (!r.fits || r.hits.length) bad3.push(`${id}${r.fits ? '' : ' (off screen ' + r.sr.join('-') + ')'}${r.hits.length ? ' ' + r.hits.join('; ') : ''}`);
      await quitToHome(page);
    }
    check(ids.length >= 40 || !!process.env.MODES, `${w}x${h}: ${ids.length} boards opened`);
    check(!bad3.length, `${w}x${h}: every board fits on the screen with nothing laid over a tile or a button (${bad3.slice(0, 4).join(' | ') || 'all clean'})`);
    await page.close();
  }
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\non a tablet the screens use the room, and every board fits and can be played');
process.exit(bad ? 1 : 0);
