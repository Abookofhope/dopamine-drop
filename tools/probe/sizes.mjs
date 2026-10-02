/* Every control smaller than 40px, in every mode (not in the suite: it takes about twenty minutes).
 *
 * Opens each mode at a new and at a high level, on a 400x820 and a 320x568 phone, and lists the things a thumb is meant to hit
 * (buttons, cells, pegs, nodes, swatches) whose smaller side is under 40px, grouped by class with a count and the smallest size.
 * It reads the element's own box, so a hit area enlarged with a pseudo-element (the pegs in Basket Drop) still reads as small.
 *
 *   SITE=/tmp/pw/_site node tools/probe/sizes.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, modeIdsFromBuild } from './harness.mjs';
const ids = modeIdsFromBuild(process.env.SITE || '.');
const b = await chromium.launch();
const rows = [];
for (const vp of [{ width: 400, height: 820 }, { width: 320, height: 568 }]){
  for (const xp of [0, 60000]){
    for (const id of ids){
      const page = await b.newPage({ viewport: vp, hasTouch: true });
      try {
        await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { [id]: 1 }, schema: 11 });
        await openModeList(page); await clickMode(page, id);
        await page.waitForFunction(() => document.getElementById('surface').querySelectorAll('button, [role="button"], .cell, .peg, .bub, .swatch, .vpix').length > 2, null, { timeout: 9000, polling: 80 }).catch(() => {});
        await page.waitForTimeout(700);
        const small = await page.evaluate(() => {
          const s = document.getElementById('surface'), out = [];
          const vis = e => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.05 && c.pointerEvents !== 'none'; };
          for (const e of s.querySelectorAll('button, [role="button"], .cell, [tabindex], .peg, .arcdot, .slacknode, .bub, .swatch, .abtn')){
            if (!vis(e) || e.disabled) continue;
            const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue;
            if (Math.min(r.width, r.height) < 40) out.push({ cls: (e.className || '').toString().split(' ').slice(0, 2).join('.'), w: Math.round(r.width), h: Math.round(r.height) });
          }
          const agg = {}; out.forEach(o => { const k = o.cls; agg[k] = agg[k] || { n: 0, min: 999 }; agg[k].n++; agg[k].min = Math.min(agg[k].min, Math.min(o.w, o.h)); });
          return agg;
        });
        for (const [k, v] of Object.entries(small)){ const line = `${vp.width}x${vp.height} xp${xp} ${id}: .${k} x${v.n} min ${v.min}px`; rows.push(line); console.log(line); }
      } catch (e) { rows.push(`${vp.width} ${id}: ERR ${String(e).slice(0, 60)}`); }
      await page.close();
    }
  }
}
await b.close();
console.log(rows.join('\n'));
