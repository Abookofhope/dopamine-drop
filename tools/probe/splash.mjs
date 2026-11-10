/* The load-up (v0.156.0): the Books Entertainment intro plays over the game as it starts.
 *
 * It plays on every launch and can be skipped only after one full watch (save.introSeen, v0.158.0).
 * The page is the studio's web v8 (v0.159.0).
 * Asked for with dd.splash (automated browsers skip it otherwise): it covers the screen, its frame is the studio's own page
 * (the wordmark "Books Entertainment"); the harness seeds Reduce motion on, so the full intro is asked for with it off, the Skip button is a full-size target and has focus; Escape skips it and the game
 * underneath is ready; left alone it leaves when the forging ends (the page's own data-end); with Reduce motion it leaves
 * within a few seconds; and an automated run that does not ask never sees it.
 *
 *   PORT=8502 SITE=/path/to/built OUT=/dir/for/frames node tools/probe/splash.mjs
 */
import { chromium } from 'playwright';
import { save as seedSave } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 120)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const URL = `http://127.0.0.1:${process.env.PORT || 8275}/`;
const OUT = process.env.OUT || '';
const browser = await chromium.launch();
const errs = [];
async function open(state = {}, asked = true){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  /* the top window only: the intro's own frame shares this storage, and seeding it again there would undo what the game saved */
  await page.addInitScript(([v, a]) => { if (window.top !== window) return; localStorage.setItem('dd.v1', v); localStorage.setItem('dd.probe', '1'); if (a) localStorage.setItem('dd.splash', '1'); },
    [seedSave(Object.assign({ onboarded: true, xp: 9000, runs: 40, solved: 600, lang: 'en', reduceMotion: false }, state)), asked]);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  return { page, ctx };
}
const shown = page => page.evaluate(() => { const h = document.getElementById('bootSplash'); return !!h && !h.hidden && !h.classList.contains('out'); });
const frameDoc = page => page.frame({ url: /about:srcdoc/ });

/* ── 1. it plays, it is the studio's page, and once it has been watched fully Escape skips it ── */
{
  const { page, ctx } = await open({ introSeen: true });
  await page.waitForTimeout(600);
  const s = await page.evaluate(() => { const h = document.getElementById('bootSplash'), r = h.getBoundingClientRect(), b = document.getElementById('bootSkip').getBoundingClientRect();
    return { shown: !h.hidden, full: r.width >= innerWidth - 1 && r.height >= innerHeight - 1, skip: [Math.round(b.width), Math.round(b.height)], focus: document.activeElement && document.activeElement.id, label: h.getAttribute('aria-label') }; });
  check(s.shown && s.full, 'the intro covers the screen as the app opens');
  check(s.skip[0] >= 44 && s.skip[1] >= 44 && s.focus === 'bootSkip', `Skip is a full-size target and has focus (${s.skip.join('x')}, ${s.focus})`);
  const f = frameDoc(page);
  const word = f ? await f.evaluate(() => ({ label: document.getElementById('wordmark').getAttribute('aria-label'), text: document.getElementById('wordmark').textContent.replace(/\s+/g, ''), hint: getComputedStyle(document.getElementById('hint')).display })) : null;
  check(!!word && word.label === 'Books Entertainment' && word.text === 'BOOKSENTERTAINMENT', `its frame is the studio's own page ("${word && word.text}")`);
  check(!!word && word.hint === 'none', 'without its "click for sound" line (a tap skips here)');
  /* v0.159.0: the studio's web v8 — the only version with a fog layer and a quality level it writes for itself */
  const v8 = f ? await f.evaluate(() => ({ fog: !!document.getElementById('bgfx'), q: document.body.dataset.q || '' })) : null;
  check(!!v8 && v8.fog && /^(full|high|medium|light)$/.test(v8.q), `and it is the studio's web v8 (fog layer ${v8 && v8.fog}, quality "${v8 && v8.q}")`);
  /* frames along the way, for a person to look at (OUT) */
  if (OUT){ let at = 600; for (const t of [2000, 3400, 4600, 6400, 9200]){ await page.waitForTimeout(t - at); at = t; await page.screenshot({ path: `${OUT}/intro_${t}.png` }); } }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({ hidden: document.getElementById('bootSplash').hidden, play: !document.getElementById('tabPlay').hidden }));
  check(after.hidden && after.play, 'Escape skips it, and the game is there underneath');
  await ctx.close();
}

/* ── 2. the first time it cannot be skipped: it plays to the end, and that full watch is kept ── */
{
  const { page, ctx } = await open({ introSeen: false });
  await page.waitForTimeout(900);
  const sk = await page.evaluate(() => { const b = document.getElementById('bootSkip'); return { hidden: b.hidden || !b.getClientRects().length }; });
  check(sk.hidden, 'before a first full watch there is no Skip button');
  await page.keyboard.press('Escape'); await page.mouse.click(195, 300); await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check(await shown(page), 'and Escape, Enter and a tap do not skip it');
  const f = frameDoc(page);
  const end = f ? await f.evaluate(() => parseFloat(document.body.dataset.end)) : NaN;
  check(end > 6 && end < 16, `the page says how long it runs (${end && end.toFixed(1)} s)`);
  const t0 = Date.now();
  const left = await page.waitForFunction(() => document.getElementById('bootSplash').hidden, null, { timeout: 22000, polling: 200 }).then(() => true, () => false);
  const took = (Date.now() - t0) / 1000 + 1.5;
  check(left && took >= end - 0.5 && took <= end + 2.5, `it plays to the end and leaves by itself (after ${took.toFixed(1)} s)`);
  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).introSeen);
  check(seen === true, 'and the full watch is kept, so it can be skipped from the next launch');
  if (OUT && left) await page.screenshot({ path: `${OUT}/after.png` });
  await ctx.close();
}

/* ── 3. with Reduce motion: the finished name, briefly ── */
{
  const { page, ctx } = await open({ reduceMotion: true });
  const t0 = Date.now();
  await page.waitForTimeout(700);
  if (OUT) await page.screenshot({ path: `${OUT}/reduced.png` });
  const left = await page.waitForFunction(() => document.getElementById('bootSplash').hidden, null, { timeout: 8000, polling: 100 }).then(() => true, () => false);
  const took = (Date.now() - t0) / 1000;
  check(left && took < 4, `with Reduce motion it shows the finished name and leaves within a few seconds (${took.toFixed(1)} s)`);
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).introSeen) === true, 'and that counts as watching it');
  await ctx.close();
}

/* ── 4. once watched, a tap anywhere skips it ── */
{
  const { page, ctx } = await open({ introSeen: true });
  await page.waitForTimeout(900);
  await page.mouse.click(195, 300);
  await page.waitForTimeout(800);
  check(await page.evaluate(() => document.getElementById('bootSplash').hidden), 'a tap anywhere skips it');
  await ctx.close();
}

/* ── 5. automated runs that do not ask never see it ── */
{
  const { page, ctx } = await open({}, false);
  await page.waitForTimeout(500);
  check(!(await shown(page)), 'an automated run that does not ask goes straight to the game');
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
