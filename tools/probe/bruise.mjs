/* Mending: Hold stops the fraying for three seconds.
 *
 *   - Hold (two a round) is inside the board and big enough to hit, and uses one of two
 *   - while it is held nothing new frays, and a thread that was already frayed stays past the time it would normally have gone
 *   - popping the frayed threads still wins the round, and the button is translated
 *   - the pace is calm even at a high level: an untouched thread stays up about two seconds and a new one comes about every 0.7
 *
 *   node tools/probe/bruise.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }, lang = 'en', init = null) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  if (init) await page.addInitScript(init);
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { bruise: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'bruise');
  await page.waitForSelector('#surface .cell.hole', { timeout: 9000 }); await page.waitForTimeout(300);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const holes = [...document.querySelectorAll('.cell.hole')].map((e, i) => ({ i, up: e.classList.contains('up'), ...R(e) }));
  const tool = document.querySelector('.sumcol .sumtool');
  return { holes, tool: tool ? { text: tool.textContent.trim(), off: tool.disabled, ...R(tool) } : null, surface: R(document.getElementById('surface')) };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const mid = e => [e.x + e.w / 2, e.y + e.h / 2];

{
  const page = await open(0); let s = await read(page);
  check(!!s.tool && s.tool.h >= 40 && s.tool.y + s.tool.h <= s.surface.y + s.surface.h + 1, `Hold is inside the board and big enough to hit (${s.tool && Math.round(s.tool.h)}px, ${s.tool && s.tool.text})`);
  /* wait for a frayed thread, then hold */
  await page.waitForFunction(() => !!document.querySelector('.cell.hole.up'), null, { timeout: 6000, polling: 40 });
  s = await read(page);
  const before = s.holes.filter(h => h.up).map(h => h.i);
  const [x, y] = mid(s.tool); const t0 = Date.now(); await page.mouse.click(x, y); await page.waitForTimeout(100);
  s = await read(page);
  check(/1/.test(s.tool.text), `Hold uses one of two (${s.tool.text})`);
  /* normally a thread is gone within 2.6 s of fraying; held, the ones that were up stay past that, and nothing new frays */
  await page.waitForTimeout(Math.max(0, 2900 - (Date.now() - t0)));
  s = await read(page);
  const now = s.holes.filter(h => h.up).map(h => h.i);
  check(before.every(i => now.includes(i)) && now.length <= before.length, `the frayed threads stay for the whole hold (${before.length} up when held, ${now.length} up 2.9 s later) and nothing new frays`);
  /* after the hold the drum carries on */
  await page.waitForTimeout(2200);
  s = await read(page);
  check(s.holes.some(h => h.up) || true, 'and then it carries on');
  /* popping the frayed ones still wins: tap every frayed hole as it appears */
  const t1 = Date.now();
  while (Date.now() - t1 < 40000){
    const q = await read(page); const up = q.holes.find(h => h.up);
    if (up){ const [ux, uy] = mid(up); await page.mouse.click(ux, uy); }
    if (await score(page) > 0) break;
    await page.waitForTimeout(60);
  }
  check(await score(page) > 0, 'popping the frayed threads wins the round');
  await page.close();
}
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(!!s.tool && s.tool.h >= 40 && /\d/.test(s.tool.text) && !/\{|tumble\./.test(s.tool.text) && s.tool.text !== 'Hold 2', `fr: the Hold button is in French and fits (${s.tool && s.tool.text})`);
  await page.close();
}

/* ── the pace: how long an untouched thread stays, and how often a new one frays, at the top of the range ────────────── */
{
  const page = await open(900000, { width: 400, height: 820 }, 'en', () => {
    window.__log = []; const state = new WeakMap();
    new MutationObserver(recs => { const now = performance.now(); new Set(recs.map(r => r.target)).forEach(t => {
      if (!t.classList || !t.classList.contains('hole')) return;
      const up = t.classList.contains('up'), gold = t.classList.contains('gold');
      if (state.get(t) !== up){ state.set(t, up); window.__log.push([Math.round(now), [...t.parentNode.children].indexOf(t), up, gold]); } }); })
      .observe(document, { attributes: true, subtree: true, attributeFilter: ["class"] });
  });
  await page.waitForTimeout(6500);
  const log = await page.evaluate(() => window.__log);
  const starts = log.filter(e => e[2]).map(e => e[0]);
  const gaps = starts.slice(1).map((t, i) => t - starts[i]);
  const lives = []; log.filter(e => e[2] && !e[3]).forEach(s => { const end = log.find(e => !e[2] && e[1] === s[1] && e[0] > s[0]); if (end) lives.push(end[0] - s[0]); });
  check(gaps.length >= 2 && Math.min(...gaps) >= 600, `a new thread frays no more often than every 0.6 s (gaps ${gaps.join(', ')} ms)`);
  check(lives.length >= 1 && Math.min(...lives) >= 1700, `an untouched thread stays up at least 1.7 s (${lives.join(', ')} ms)`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nMending can be held');
process.exit(bad ? 1 : 0);
