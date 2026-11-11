/* The living room (v0.153.0): seasons and the Archive, the week's pattern, the lucky skein, a friend's Daily.
 *
 * Seasons: the window shows the time of year; this season's six things (four until v0.166.0) are for sale and every other season's are
 * in the Archive at the same price (nothing is ever gone). The week's pattern: one game and board, the same for
 * everyone, paying yarn ×1.5 in Marathon this week. The lucky skein: about one solve in forty pays double yarn,
 * never two within ten. A friend's Daily: a shared Daily carries its round-by-round score in its link, and the
 * friend who opens it the same day races it.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/seasons.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab, openMyStuff } from './harness.mjs';

let bad = 0;
/* On a build without these features the page has none of their elements: say so as a failure rather than a stack trace. */
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 120)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const sv = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')) || {});
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
async function open(state, hash = ''){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true }, state));
  /* A link opened cold: leave the page (for a same-origin file, so the probe's init scripts can still reach storage),
     then load it with the hash (a hash-only goto would not reload). */
  if (hash){ await page.goto(`http://127.0.0.1:${process.env.PORT || 8275}/manifest.webmanifest`); await page.goto(`http://127.0.0.1:${process.env.PORT || 8275}/${hash}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500); }
  return { page, ctx };
}

/* ── 1. seasons and the Archive ── */
{
  const { page, ctx } = await open({ yarn: 2000, yarnEver: 2000 });
  await goTab(page, 'Room');
  await page.evaluate(() => { const h = document.getElementById('accH_r-decor'); if (h.getAttribute('aria-expanded') !== 'true') h.click(); });
  await page.waitForTimeout(300);
  const list = await page.evaluate(() => ({ heads: [...document.querySelectorAll('#seasonList .pxh')].map(x => x.textContent), n: document.querySelectorAll('#seasonList .accbtn').length }));
  check(list.n === 24 && /This season/.test(list.heads[0]) && /Archive/.test(list.heads[1]), `this season's six things, and the Archive's eighteen (${list.n}; ${list.heads.join(' | ')})`);
  /* buy one from the Archive: two taps */
  const archived = () => page.evaluate(() => { const b = document.querySelectorAll('#seasonList .seasongrid')[1].querySelector('.accbtn'); b.click(); });
  await archived(); await archived(); await page.waitForTimeout(300);
  const own = Object.keys(((await sv(page)).owned || {}).season || {});
  check(own.length === 1, `a past season's thing can still be bought, at its price (${own.join()})`);
  const sill = await page.evaluate(() => document.querySelector('#roomScene svg.roomsvg').innerHTML.length);
  check(sill > 0, 'and it sits on the window sill');
  await ctx.close();
}
/* ── 1b. six on the sill: everything bought this season can be seen (v0.166.0; the sill showed four) ── */
{
  const now = await (async () => { const m = new Date().getMonth(); return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn'; })();
  const SIX = { winter: ['stocking', 'globe', 'star', 'mittens', 'cocoa', 'sled'], spring: ['pot', 'kite', 'bunting', 'boots', 'nest', 'umbrella'],
    summer: ['fan', 'hat', 'melon', 'boat', 'shell', 'lemonade'], autumn: ['lantern', 'leaves', 'pumpkin', 'throw', 'acorn', 'scarf'] }[now];
  const { page, ctx } = await open({ yarn: 50, owned: { season: Object.fromEntries(SIX.map(id => [id, 1])) } });
  await goTab(page, 'Room'); await page.waitForTimeout(400);
  const onSill = await page.evaluate(() => { const svg = document.querySelector('#roomScene svg.roomsvg'); return svg ? svg.querySelectorAll('g.sillitem').length : -1; });
  check(onSill === 6, `all six of this season's things, owned, sit on the sill (${onSill})`);
  const fit = await page.evaluate(() => { const g = [...document.querySelectorAll('#roomScene svg.roomsvg g.sillitem')].map(e => e.getBoundingClientRect());
    return g.every((r, i) => i === 0 || r.left >= g[i - 1].right - 1); });
  check(fit, 'and none of them overlaps the next');
  await ctx.close();
}

/* ── 2. the week's pattern ── */
{
  const { page, ctx } = await open({});
  await openMyStuff(page);
  const wk = await page.evaluate(() => { const b = document.getElementById('weekPat'); const r = b ? b.getBoundingClientRect() : { width: 0, height: 0 };
    return { shown: !!b && !!b.closest('#playMyStuff') && r.width > 0 && r.height >= 44, home: !!(b && b.closest('#playHome')), line: (document.getElementById('weekLine') || {}).textContent || '' }; });
  check(wk.shown && !wk.home && wk.line.length > 2, `More ways to play shows this week's pattern, beside Marathon, not the Play menu ("${wk.line}")`);
  await page.evaluate(() => document.getElementById('weekPat').click());
  await page.waitForTimeout(800);
  const run = await page.evaluate(() => ({ play: !document.getElementById('play').hidden, kind: document.getElementById('hudKind').textContent }));
  check(run.play, `and starts it in Marathon ("${run.kind}")`);
  await ctx.close();
}

{
  const { page, ctx } = await open({ runs: 1 });
  check(await page.evaluate(() => document.getElementById('weekPat').hidden), 'but not before the third run');
  await ctx.close();
}

/* ── 3. a friend's Daily ── */
{
  const link = '#vs=' + today() + '.' + [120, 260, 410, 600].map(x => x.toString(36)).join('-');
  const { page, ctx } = await open({}, link);
  const vs = (await sv(page)).vs;
  check(vs && vs.date === today() && vs.c.join() === '120,260,410,600', `a link with today's Daily is kept to race (${vs && vs.c.join()})`);
  check(await page.evaluate(() => !location.hash), 'and the link is tidied out of the address bar');
  await ctx.close();
}
{
  const { page, ctx } = await open({}, '#vs=2001-01-01.5k-9z');
  check(!(await sv(page)).vs && await page.evaluate(() => !location.hash), 'a link from another day is ignored, and tidied away too');
  await ctx.close();
}
{
  /* the app already open in this tab when the link is tapped: only the hash changes */
  const { page, ctx } = await open({});
  const link = '#vs=' + today() + '.' + [90, 200].map(x => x.toString(36)).join('-');
  await page.evaluate(h => { location.hash = h; }, link); await page.waitForTimeout(400);
  const vs = (await sv(page)).vs;
  check(vs && vs.c.join() === '90,200', `a link opened while the app is open is kept too (${vs && vs.c.join()})`);
  await ctx.close();
}

/* ── 4. the lucky skein (forced through the dd.probe hook window.__luck; the real roll is 1 in 40) ── */
{
  const { page, ctx } = await open({ captions: true });
  await page.evaluate(() => localStorage.setItem('dd.pool', 'odd'));
  await page.evaluate(() => document.getElementById('moodPlay').click());
  const tiles = () => page.evaluate(() => {
    const ts = [...document.querySelectorAll('#surface .oddwrap .tile')]; if (!ts.length) return null;
    const prompt = document.getElementById('prompt').textContent.trim();
    const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const cols = ts.map(rgb), key = c => c.join(',');
    let odd;
    if (/lightest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
    else if (/darkest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
    else { const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1); odd = cols.findIndex(c => n[key(c)] === 1); }
    const r = ts[odd].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const live = () => page.waitForFunction(() => { const p = document.getElementById('play'), sf = document.getElementById('surface');
    return !p.hidden && !document.getElementById('count') && !!document.querySelector('#surface .oddwrap .tile')
      && ![...sf.children].some(c => c.classList.contains('swap')) && document.getElementById('prompt').className === 'prompt'; }, null, { timeout: 12000, polling: 60 }).then(() => true, () => false);
  const solve = async () => {
    if (!await live()) return false;
    const s0 = (await sv(page)).solved | 0;
    for (let i = 0; i < 10; i++){ const at = await tiles(); if (!at){ await page.waitForTimeout(80); continue; }
      await page.mouse.click(at.x, at.y); await page.waitForTimeout(90); if (((await sv(page)).solved | 0) > s0) return true; }
    return false;
  };
  const caps = [];
  await page.exposeFunction('__cap', x => caps.push(x));
  await page.evaluate(() => { const b = document.getElementById('sndCapTxt'); new MutationObserver(() => window.__cap(b.textContent)).observe(b, { childList: true, characterData: true, subtree: true });
    window.__lines = []; const p = document.getElementById('prompt'); new MutationObserver(() => window.__lines.push(p.textContent)).observe(p, { childList: true, characterData: true, subtree: true }); });
  await page.evaluate(() => window.__luck.force());
  const ok1 = await solve(); await page.waitForTimeout(400);
  const n1 = await page.evaluate(() => window.__luck.count());
  check(ok1 && n1 === 1, `a lucky solve is counted (${n1})`);
  const lines = await page.evaluate(() => window.__lines.filter(x => /lucky skein/i.test(x)));
  check(lines.length > 0, `and says so under the score, with reduced motion on ("${lines[0] || ''}")`);
  check(caps.some(c => /lucky/i.test(c)), `and has a sound of its own, captioned ("${caps.filter(c => /lucky/i.test(c))[0] || caps.slice(-2).join(' | ')}")`);
  await page.evaluate(() => window.__luck.force());
  await solve(); await page.waitForTimeout(400);
  const n2 = await page.evaluate(() => ({ n: window.__luck.count(), armed: window.__luck.armed() }));
  check(n2.n === 1 && n2.armed, `never two within ten solves (${n2.n} after the next solve, still waiting)`);
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
