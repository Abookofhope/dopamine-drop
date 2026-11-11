/* Without dragging (v0.175.0, WCAG 2.5.7): every game that was drag-only can be finished with taps alone.
 *
 * A tap that does not move picks a piece up, ringed and announced as pressed, and the next tap puts it where the tap
 * is; a tap on the same piece puts it down again. A drag still works as it did. Each game below is played to a win
 * with taps only (the pointer never moves while pressed), at a low and a high level:
 *   - Tidy Up: tap a piece, tap the basket of its colour (with a touch screen's taps);
 *   - Dye Pots (siphon): tap a dye, tap its pot; the two dyes of the mixed pot go in one after the other;
 *   - No Crossing: tap a peg, tap a spot on the circle the threads were drawn from, until nothing crosses.
 * Also: picking up shows "Now tap where it goes" and sets aria-pressed; tapping the piece again puts it down; a wrong
 * basket after a tap costs a paw exactly as a wrong drag does; a peg tapped onto a spot right next to another peg
 * stays where it was.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/taponly.mjs
 */
import { chromium } from 'playwright';
import { openApp, openMode } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

async function open(id, sel, xp){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, onboarded: true, seen: { [id]: 1 } });
  await openMode(page, id, sel);
  await page.waitForFunction(() => !document.getElementById('count'), null, { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(700);
  return page;
}
const centre = (page, sel, i = 0) => page.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [sel, i]);
const tapAt = async (page, xy, touch) => { if (!xy) return; if (touch) await page.touchscreen.tap(xy[0], xy[1]); else await page.mouse.click(xy[0], xy[1]); await page.waitForTimeout(160); };
const won = page => page.evaluate(() => (document.getElementById('surface').className || '').includes('won') || +(document.getElementById('hudScore') || {}).textContent > 0);
const solvedCount = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).solved);
const prompt = page => page.evaluate(() => (document.querySelector('.prompt') || {}).textContent || '');

/* ── Tidy Up ── */
for (const xp of [0, 40000]){
  const page = await open('tidy', '#surface .tidyitem', xp);
  const s0 = await solvedCount(page);
  if (xp === 0){
    /* pick up, announce, put down */
    await tapAt(page, await centre(page, '.tidyitem'), true);
    const st = await page.evaluate(() => { const e = document.querySelector('.tidyitem'); return { armed: e.classList.contains('armed'), pressed: e.getAttribute('aria-pressed') }; });
    check(st.armed && st.pressed === 'true' && /Now tap where it goes/.test(await prompt(page)), `Tidy Up: a tap picks a piece up, ringed and pressed, and says to tap where it goes (${JSON.stringify(st)})`);
    await tapAt(page, await centre(page, '.tidyitem'), true);
    check(!(await page.evaluate(() => document.querySelector('.tidyitem').classList.contains('armed'))), 'Tidy Up: tapping it again puts it down');
    /* a wrong basket after a tap costs a paw */
    const wrong = await page.evaluate(() => { const it = document.querySelector('.tidyitem:not(.binned)'); const bins = [...document.querySelectorAll('.tidybin')]; return bins.findIndex(b => b.dataset.hex !== it.dataset.hex); });
    const paws0 = await page.evaluate(() => document.querySelectorAll('.paw.used, .pawlost, .paws .gone').length);
    await tapAt(page, await centre(page, '.tidyitem:not(.binned)'), true);
    await tapAt(page, await centre(page, '.tidybin', wrong), true);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ wrong: !!document.querySelector('.tidyitem.wrong'), prompt: (document.querySelector('.prompt') || {}).textContent }));
    check(after.wrong || /Not that one/.test(after.prompt), `Tidy Up: a wrong basket after a tap is a wrong answer, as a wrong drag is (${after.prompt})`);
    await page.waitForTimeout(500);
  }
  for (let guard = 0; guard < 40; guard++){
    const next = await page.evaluate(() => { const it = [...document.querySelectorAll('.tidyitem')].findIndex(e => !e.classList.contains('binned')); if (it < 0) return null;
      const hex = document.querySelectorAll('.tidyitem')[it].dataset.hex; return [it, [...document.querySelectorAll('.tidybin')].findIndex(b => b.dataset.hex === hex)]; });
    if (!next) break;
    await tapAt(page, await centre(page, '.tidyitem', next[0]), true);
    await tapAt(page, await centre(page, '.tidybin', next[1]), true);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(900);
  check((await solvedCount(page)) > s0, `Tidy Up at ${xp} XP: won with taps alone`);
  await page.close();
}

/* ── Dye Pots (siphon) ── */
for (const xp of [0, 40000]){
  const page = await open('siphon', '#surface .vial', xp);
  const s0 = await solvedCount(page);
  for (let guard = 0; guard < 12; guard++){
    const plan = await page.evaluate(() => {
      const vials = [...document.querySelectorAll('.vial')], jars = [...document.querySelectorAll('.jar')];
      const plain = jars.map((j, i) => ({ j, i })).filter(o => !o.j.classList.contains('mixed'));
      for (const { j, i } of plain){ if (j.classList.contains('full')) continue; const v = vials.findIndex(x => !x.classList.contains('empty') && x.dataset.hex === j.dataset.hex); if (v >= 0) return [v, i]; }
      /* what is left goes into the mixed pot */
      const m = jars.findIndex(j => j.classList.contains('mixed') && !j.classList.contains('full')); if (m < 0) return null;
      const taken = new Set(plain.map(o => o.j.dataset.hex));
      const v = vials.findIndex(x => !x.classList.contains('empty') && !taken.has(x.dataset.hex));
      return v >= 0 ? [v, m] : null;
    });
    if (!plan) break;
    await tapAt(page, await centre(page, '.vial', plan[0]));
    if (xp === 0 && guard === 0){
      const st = await page.evaluate(k => { const e = document.querySelectorAll('.vial')[k]; return { armed: e.classList.contains('armed'), pressed: e.getAttribute('aria-pressed') }; }, plan[0]);
      check(st.armed && st.pressed === 'true', `Dye Pots: a tap picks a dye up, ringed and pressed (${JSON.stringify(st)})`);
    }
    await tapAt(page, await centre(page, '.jar', plan[1]));
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(900);
  check((await solvedCount(page)) > s0, `Dye Pots at ${xp} XP: won with taps alone`);
  await page.close();
}

/* ── No Crossing ── */
for (const xp of [0, 40000]){
  const page = await open('slack', '#surface .slacknode', xp);
  const s0 = await solvedCount(page);
  const box = await page.evaluate(() => { const r = document.querySelector('.arcbox').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const n = await page.evaluate(() => document.querySelectorAll('.slacknode').length);
  const spot = i => { const a = 2 * Math.PI * i / n - Math.PI / 2; return [box.x + box.w * (0.5 + 0.36 * Math.cos(a)), box.y + box.h * (0.5 + 0.36 * Math.sin(a))]; };
  const where = () => page.evaluate(() => [...document.querySelectorAll('.slacknode')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; }));
  if (xp === 0){
    /* a spot right beside another peg is refused */
    const w = await where();
    await tapAt(page, w[0]);
    check(await page.evaluate(() => document.querySelector('.slacknode').getAttribute('aria-pressed')) === 'true', 'No Crossing: a tap picks a peg up');
    await tapAt(page, [w[1][0] + 6, w[1][1] + 6]);
    const w2 = await where();
    check(Math.abs(w2[0][0] - w[0][0]) < 2 && Math.abs(w2[0][1] - w[0][1]) < 2, 'No Crossing: a spot right beside another peg leaves it where it was');
  }
  /* in widths, as the game measures: a spot within 11 of a peg is a tap on that peg, so first move it out of the way */
  const dw = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) / box.w * 100;
  const spots = [...Array(n).keys()].map(spot);
  const park = w => { for (let gy = 0.2; gy <= 0.8; gy += 0.05) for (let gx = 0.12; gx <= 0.88; gx += 0.04){ const p = [box.x + box.w * gx, box.y + box.h * gy];
    if (w.every(q => dw(p, q) > 16) && spots.every(q => dw(p, q) > 14)) return p; } return null; };
  for (let pass = 0; pass < 4 && (await solvedCount(page)) === s0; pass++){
    for (let i = 0; i < n && (await solvedCount(page)) === s0; i++){
      let w = await where();
      if (dw(w[i], spots[i]) < 3) continue;
      const k = w.findIndex((q, j) => j !== i && dw(q, spots[i]) < 13);
      if (k >= 0){ const p = park(w); if (p){ await tapAt(page, w[k]); await tapAt(page, p); w = await where(); } }
      await tapAt(page, w[i]);
      await tapAt(page, spots[i]);
    }
  }
  await page.waitForTimeout(900);
  check((await solvedCount(page)) > s0, `No Crossing at ${xp} XP: untangled with taps alone (${n} pegs)`);
  await page.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nthe drag-only games can be finished with taps alone');
process.exit(bad ? 1 : 0);
