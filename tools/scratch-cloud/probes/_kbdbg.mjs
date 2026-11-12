import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 400, height: 820 } });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
for (const id of (process.env.ONLY || 'order').split(',')){
await openApp(page, { reduceMotion: true, onboarded: true, seen: { [id]: 1 }, xp: 9000, runs: 40, solved: 600 });
await openModeList(page); await clickMode(page, id); await page.waitForTimeout(2500);
await page.evaluate(() => { window.__ev = []; for (const t of ['pointerdown','pointerup','click']) document.addEventListener(t, e => window.__ev.push(t + ':' + (e.target.className || e.target.tagName).toString().slice(0, 30) + ':' + e.pointerId), true); });
await page.focus('#surface');
const info = await page.evaluate(() => { const r = document.getElementById('surface').getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return { r: [Math.round(r.top), Math.round(r.height)], hit: h ? (h.className || h.tagName).toString().slice(0, 40) : null, btns: [...document.querySelectorAll('#surface button')].slice(0, 3).map(b => { const q = b.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width)]; }) }; });
await page.keyboard.press('Enter'); await page.waitForTimeout(300);
console.log(id, JSON.stringify(info), JSON.stringify(await page.evaluate(() => window.__ev)), errs.slice(0, 1));
}
await b.close();
