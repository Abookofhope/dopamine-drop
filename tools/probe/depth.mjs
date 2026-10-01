/* The depth added to Ripples, Snip and Needle Pass, played.
 *
 *   Ripples      a breeze pushes the leaf where you did not send it, a tail points the way it blows, and a finger dragged through
 *                the water makes a softer ripple every few steps instead of one per tap.
 *   Snip         one stroke through three threads is worth two more, five worth three more again, and from level 9 the threads
 *                sway on the spot (and are cut where they are, not where they were).
 *   Needle Pass  a tap through the middle of the window is a clean stitch (a gold pip); from level 14 the window itself sways.
 *
 * Run at a high level so every one of those is switched on.
 *
 *   node tools/probe/depth.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const open = async (id, sel, xp = 60000) => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(id + ': ' + String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { [id]: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, id);
  await page.waitForSelector(sel, { timeout: 9000 }); await page.waitForTimeout(600);
  return page;
};

/* ── Ripples ── */
{
  const page = await open('ripple', '.ripplepool');
  check(await page.evaluate(() => !!document.querySelector('.windvane')), 'there is a wind vane once the breeze is up');
  const pool = await page.evaluate(() => { const r = document.querySelector('.ripplepool').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const leafAt = () => page.evaluate(() => { const l = document.querySelector('.leaf'), r = l.getBoundingClientRect(), p = document.querySelector('.ripplepool').getBoundingClientRect(); return { x: (r.left + r.width / 2 - p.left) / p.width * 100, y: (r.top + r.height / 2 - p.top) / p.height * 100 }; });
  const a = await leafAt(); await page.waitForTimeout(1800); const b = await leafAt();
  check(Math.hypot(b.x - a.x, b.y - a.y) > 0.8, `with nobody touching the water, the breeze moves the leaf (${Math.hypot(b.x - a.x, b.y - a.y).toFixed(1)}% in under two seconds)`);
  const v0 = await page.evaluate(() => document.querySelector('.windvane').style.transform);
  await page.waitForTimeout(600);
  check(await page.evaluate(v => document.querySelector('.windvane').style.transform !== v, v0), 'and the vane turns as it veers');
  /* one tap, one ripple */
  await page.mouse.click(pool.x + pool.w * 0.2, pool.y + pool.h * 0.3);
  check(await page.evaluate(() => document.querySelectorAll('.wave').length) === 1, 'a tap is one ripple');
  await page.waitForTimeout(700);
  /* a stroke, several */
  await page.mouse.move(pool.x + pool.w * 0.15, pool.y + pool.h * 0.25); await page.mouse.down();
  await page.mouse.move(pool.x + pool.w * 0.85, pool.y + pool.h * 0.25, { steps: 24 });
  const during = await page.evaluate(() => document.querySelectorAll('.wave').length);
  await page.mouse.up();
  check(during >= 4, `a finger dragged through the water makes a ripple every few steps (${during} on the water)`);
  await page.close();
}

/* ── Snip ── */
{
  const page = await open('slice', '.bit');
  const bits = () => page.evaluate(() => [...document.querySelectorAll('.bit')].map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, rot: e.classList.contains('rot'), gone: e.classList.contains('cut') }; }));
  const l0 = (await bits()); const s0 = await page.evaluate(() => [...document.querySelectorAll('.bit')].map(e => e.style.left + e.style.top).join('|'));
  await page.waitForTimeout(700);
  const s1 = await page.evaluate(() => [...document.querySelectorAll('.bit')].map(e => e.style.left + e.style.top).join('|'));
  check(s0 !== s1, 'the threads sway on the spot');
  const list = await bits(), good = list.filter(b => !b.rot), rot = list.filter(b => b.rot), rad = list[0].w / 2;
  const clear = (p, q) => rot.every(r => { const dx = q.x - p.x, dy = q.y - p.y, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((r.x - p.x) * dx + (r.y - p.y) * dy) / L)) : 0; return Math.hypot(r.x - (p.x + dx * t), r.y - (p.y + dy * t)) > rad * 1.35; });
  let trio = null;
  for (const a of good) for (const b of good) for (const c of good) if (!trio && a !== b && b !== c && a !== c && clear(a, b) && clear(b, c)) trio = [a, b, c];
  if (!trio) check(true, 'no three threads could be reached without a knot on this board; skipped');
  else {
    const before = await page.evaluate(() => (document.querySelector('.prompt') || {}).textContent);
    /* the threads sway, so aim at where each is now */
    const now = await bits(); const idx = trio.map(t => list.indexOf(t));
    const [a, b, c] = idx.map(i => now[i]);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.move(c.x, c.y, { steps: 10 });
    const after = await page.evaluate(() => ({ prompt: (document.querySelector('.prompt') || {}).textContent || '', cut: document.querySelectorAll('.bit.cut').length }));
    await page.mouse.up();
    check(after.cut >= 3, `one stroke cut ${after.cut} threads`);
    check(/sweep|net|limpio|glatt/i.test(after.prompt), `and the line above says so ("${after.prompt}")`);
  }
  await page.close();
}

/* ── Needle Pass ── */
{
  const page = await open('skim', '.skimhit');
  const z = () => page.evaluate(() => document.querySelector('.skimzone').style.left);
  const z0 = await z(); await page.waitForTimeout(500); const z1 = await z();
  check(z0 !== z1, 'the window sways');
  /* wait until the needle is through the middle, then tap. A timer, not requestAnimationFrame (the app drops those when a round
     ends), with a hard stop; and a window whose whole middle is knotted has nothing to aim at, so it is skipped, not waited on. */
  const res = await page.evaluate(() => new Promise(done => {
    const t0 = performance.now();
    const aim = () => {
      const zone = document.querySelector('.skimzone'); if (!zone) return null;
      const l = parseFloat(zone.style.left), w = parseFloat(zone.style.width), c = l + w / 2;
      const knot = zone.querySelector('.skimknot'), hasKnot = knot && knot.style.display !== 'none';
      const kc = hasKnot ? l + (parseFloat(knot.style.left) + parseFloat(knot.style.width) / 2) / 100 * w : null, kh = hasKnot ? parseFloat(knot.style.width) / 100 * w / 2 + 0.6 : 0;
      /* the core is the middle 30% of the window; the nearest point in it that is clear of the knot */
      const core = [c - w * 0.15, c + w * 0.15]; let best = null;
      for (let x = core[0]; x <= core[1]; x += w * 0.01) if (!hasKnot || Math.abs(x - kc) > kh) if (best === null || Math.abs(x - c) < Math.abs(best - c)) best = x;
      return best;
    };
    const t = setInterval(() => {
      const mark = document.querySelector('.skimmark'), target = aim();
      if (!mark || performance.now() - t0 > 5000){ clearInterval(t); return done({ tapped: false }); }
      if (target === null){ clearInterval(t); return done({ tapped: false, skipped: true }); }
      if (Math.abs(parseFloat(mark.style.left) - target) < 0.45){ clearInterval(t); document.querySelector('.skimhit').click(); return done({ tapped: true }); }
    }, 6);
  }));
  if (res.skipped){ check(true, 'this window had a knot across its whole middle: nothing to aim at, skipped'); await page.close(); }
  else {
  await page.waitForTimeout(100);
  const pips = await page.evaluate(() => ({ on: document.querySelectorAll('.skimpips i.on').length, clean: document.querySelectorAll('.skimpips i.on.clean').length, prompt: (document.querySelector('.prompt') || {}).textContent || '' }));
  check(res.tapped && pips.on === 1, 'a tap through the window counts');
  check(pips.clean === 1, 'and through the middle of it, the pip is gold (a clean stitch)');
  check(/clean|net|limpio|sauber/i.test(pips.prompt), `and the line above says so ("${pips.prompt}")`);
  await page.close();
  }
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nthe added depth is there');
process.exit(bad ? 1 : 0);
