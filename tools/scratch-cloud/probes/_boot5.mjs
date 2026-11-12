import { chromium } from 'playwright';
import { save as seedSave } from './harness.mjs';
import fs from 'fs';
const URL = `http://127.0.0.1:${process.env.PORT}/`;
const dir = fs.mkdtempSync(process.env.TMPD + '/prof-');
const ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 390, height: 844 }, hasTouch: true });
await ctx.addInitScript(v => { if (window.top !== window) return; localStorage.setItem('dd.v1', v);
  window.__lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); },
  seedSave({ onboarded: true, xp: 9000, runs: 40, solved: 600, lang: 'en', introSeen: true, seenVersion: '0.164.0' }));
const out = [];
for (let v = 0; v < 5; v++){
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const lt = await page.evaluate(() => window.__lt.slice()); out.push(Math.max(0, ...lt) + (lt.length ? ` (${lt.join('+')})` : ''));
  await page.close();
}
console.log(process.env.LABEL, out.join(' | '));
await ctx.close();
