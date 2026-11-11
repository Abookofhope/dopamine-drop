/* A quicker start (v0.165.0): the game's script is a file of its own, so the browser compiles it off the main thread and
 * keeps the compiled code; and it still works offline.
 *
 *   1. The page loads the script from app.js, named by its content (app.js?v=<hash>).
 *   2. The longest task of a launch, at 4x CPU slowdown, over five visits in one browser profile (so the worker and its
 *      caches carry over, as they do for a player): the median of visits 2-5 is under 300 ms. With the script inline it
 *      was 325-416 ms; as a file, 170-251 ms (measured 2026-11-11 in this container).
 *   3. After one visit, the game opens and a board plays with the network cut off.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/startup.mjs
 */
import { chromium } from 'playwright';
import { save as seedSave, openModeList, clickMode } from './harness.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const URL = `http://127.0.0.1:${process.env.PORT || 8275}/`;
const LIMIT = 300;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-startup-'));
const ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 390, height: 844 }, hasTouch: true });
await ctx.addInitScript(v => { if (window.top !== window) return; localStorage.setItem('dd.v1', v);
  window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch(e){} },
  seedSave({ onboarded: true, xp: 9000, runs: 40, solved: 600, lang: 'en', introSeen: true }));

/* ── 1 ── */
const html = await (await fetch(URL)).text();
const tag = /<script src="app\.js\?v=([0-9a-f]{12})"><\/script>/.exec(html);
check(!!tag, `the page loads its script from app.js, named by its content (${tag ? tag[1] : 'inline'})`);

/* ── 2 ── */
const longest = [];
for (let v = 0; v < 5; v++){
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  longest.push(Math.max(0, ...(await page.evaluate(() => window.__lt.slice()))));
  await page.close();
}
const later = longest.slice(1).sort((a, b) => a - b), median = (later[1] + later[2]) / 2;
check(median < LIMIT, `the longest task of a launch at 4x, median of visits 2-5, is under ${LIMIT} ms (${median} ms; every visit: ${longest.join(', ')})`);

/* ── 3 ── */
await ctx.setOffline(true);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
await page.goto(URL, { waitUntil: 'load' }).catch(e => errs.push('goto: ' + String(e).slice(0, 100)));
await page.waitForTimeout(1500);
const up = await page.evaluate(() => !!document.querySelector('.tab[data-tab="Play"]') && !!document.getElementById('surface')).catch(() => false);
check(up, 'offline after one visit, the game opens');
let played = false;
if (up){
  try { await page.evaluate(() => { const c = document.getElementById('logClose'); if (c) c.click(); });
    await openModeList(page); await clickMode(page, 'odd');
    await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); played = true; } catch(e){ errs.push('board: ' + String(e).slice(0, 100)); }
}
check(played, 'and a board deals and plays offline');
check(!errs.length, `no page errors offline (${errs.slice(0, 2).join(' | ') || 'none'})`);
await ctx.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(bad ? `\n${bad} failed` : '\nthe game starts quicker, and still offline');
process.exit(bad ? 1 : 0);
