/* The first time the app is opened, and the first time it is updated.
 *
 * The page registers a service worker on the window's load event, and the
 * worker claims the page it was registered from. The app used to answer that
 * claim the way it answers an update, by reloading, so every first visit loaded
 * TWICE: the welcome screen appeared, and about 170ms later was thrown away and
 * built again. It also made any probe that touched the page in that window fail
 * at random with "execution context was destroyed".
 *
 * Fixing it exposed a second thing. The update wiring looks for a registration
 * when the script runs, which is before the load event, so on a first visit it
 * found none and gave up. The accidental reload was the only reason the first
 * session ever watched for updates. So this checks both halves:
 *
 *   1. a first visit loads once, and the worker still ends up in control
 *   2. an update that arrives during the first session is still applied
 *   3. an update on a returning visit is applied, by exactly one reload
 *
 * "An update" is a real one: this serves a private copy of the site, then swaps
 * in a page carrying a marker and a worker with a new cache name.
 *
 *   node tools/probe/firstvisit.mjs
 *   SITE=_site node tools/probe/firstvisit.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, cpSync, mkdtempSync, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, extname } from 'path';

const SITE = process.env.SITE || '/tmp/pw/_site';
const dir = mkdtempSync(join(tmpdir(), 'dd-firstvisit-'));
cpSync(SITE, dir, { recursive: true });
const pristine = { html: readFileSync(join(dir, 'index.html'), 'utf8'), sw: readFileSync(join(dir, 'sw.js'), 'utf8') };
const deployA = () => { writeFileSync(join(dir, 'index.html'), pristine.html); writeFileSync(join(dir, 'sw.js'), pristine.sw); };
const deployB = () => {
  writeFileSync(join(dir, 'index.html'), pristine.html.replace('</body>', '<script>window.__B = 1;</script></body>'));
  writeFileSync(join(dir, 'sw.js'), pristine.sw.replace(/dopamine-drop-[0-9a-f]+/, 'dopamine-drop-BBBBBBBBBBBB'));
};

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = join(dir, p);
  if (!f.startsWith(dir) || !existsSync(f) || !statSync(f).isFile()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL = `http://127.0.0.1:${server.address().port}/`;

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const open = async () => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 820 } });   // brand new: no worker, no storage
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 100)));
  await page.addInitScript(() => { if (!localStorage.getItem('dd.v1'))
    localStorage.setItem('dd.v1', JSON.stringify({ schema: 10, onboarded: true, xp: 9000, reduceMotion: true, seenVersion: 'x' })); });
  return { ctx, page };
};
const ask = page => page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
const gotB = page => page.waitForFunction(() => window.__B === 1, null, { timeout: 9000 }).then(() => true, () => false);

/* 1. a first visit */
deployA();
const seen = [];
for (let i = 0; i < 3; i++){
  const { ctx, page } = await open();
  let loads = 0; page.on('load', () => loads++);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  seen.push({ loads, ctl: await page.evaluate(() => !!navigator.serviceWorker.controller) });
  await ctx.close();
}
console.log('   first visits:', JSON.stringify(seen));
check(seen.every(s => s.loads === 1), 'a first visit loads the page once, not twice');
check(seen.every(s => s.ctl), 'the worker still takes control of the first visit');

/* 2. an update that lands during the first session */
deployA();
{
  const { ctx, page } = await open();
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(1800);
  deployB(); await ask(page);
  check(await gotB(page), 'an update during the first session is applied');
  await ctx.close();
}

/* 3. an update on a returning visit */
deployA();
{
  const { ctx, page } = await open();
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(1800);
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  let loads = 0; page.on('load', () => loads++);
  deployB(); await ask(page);
  check(await gotB(page), 'an update on a returning visit is applied');
  await page.waitForTimeout(1500);
  check(loads === 1, `and it takes exactly one reload (${loads})`);
  await ctx.close();
}

if (errs.length){ bad++; console.log('PAGE ERRORS', errs.slice(0, 3)); }
await browser.close(); server.close();
console.log(bad ? `\n${bad} first-visit problem(s)` : '\nfirst visit loads once, and updates still land');
process.exit(bad ? 1 : 0);
