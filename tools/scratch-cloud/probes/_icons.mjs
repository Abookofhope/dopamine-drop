// scratch (never commit): the app icon at launcher sizes, circle and squircle masks, on light and dark wallpapers
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const b64 = readFileSync('/home/user/dopamine-drop/site/icons/maskable-512.png').toString('base64');
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 520, height: 300 }, deviceScaleFactor: 2 });
const cell = (size, r, bg) => `<div style="background:${bg};padding:10px;display:inline-block"><img src="data:image/png;base64,${b64}" style="width:${size}px;height:${size}px;border-radius:${r};display:block"></div>`;
let html = '<body style="margin:0;font:12px sans-serif;background:#222">';
for (const bg of ['#F2EEE8', '#1B1B22']) {
  html += '<div>';
  for (const size of [48, 40, 29]) for (const r of ['50%', '30%']) html += cell(size, r, bg);
  html += '</div>';
}
await page.setContent(html + '</body>'); await page.waitForTimeout(300);
await page.screenshot({ path: process.env.OUT });
await browser.close();
