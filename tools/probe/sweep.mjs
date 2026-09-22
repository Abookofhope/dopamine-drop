/* Every mode, opened once, looked over for the faults a human would catch in a
 * glance: something outside the board, a control too small to hit, a control
 * with no name, an element that takes up space and paints nothing, an SVG whose
 * ink resolves to black on black.
 *
 *   node tools/probe/sweep.mjs            400x820, a mid-game save
 *   MAX=1 node tools/probe/sweep.mjs      the same at maximum difficulty
 *   VW=320 VH=568 node tools/probe/sweep.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, quitToHome, modeList, axeOn, floorOrDie } from './harness.mjs';

const VW = +(process.env.VW || 400), VH = +(process.env.VH || 820);
const MAX = !!process.env.MAX;
const PROF = MAX ? { xp: 900000, solved: 40000, runs: 900 } : { xp: 9000, solved: 600, runs: 40 };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, hasTouch: true });
const page = await ctx.newPage();
let errs = [];
page.on('pageerror', e => errs.push(String(e)));

await openApp(page, PROF);
const modes = await modeList(page);
console.log(`sweeping ${modes.length} modes at ${VW}x${VH}${MAX ? ' at maximum difficulty' : ''}\n`);

/* Everything the eye would catch, measured off the live board. */
const inspect = () => page.evaluate(() => {
  const s = document.getElementById('surface');
  const sb = s.getBoundingClientRect();
  const all = [...s.querySelectorAll('*')];
  const vis = e => { const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01; };
  const rects = all.filter(vis)
    .map(e => ({ e, r: e.getBoundingClientRect(), cs: getComputedStyle(e) }))
    .filter(o => o.r.width > 0 && o.r.height > 0);

  const spill = rects.filter(o => o.r.left < sb.left - 2 || o.r.right > sb.right + 2
                               || o.r.top < sb.top - 2 || o.r.bottom > sb.bottom + 2)
                     .map(o => o.e.className || o.e.tagName);

  const tappable = rects.filter(o => o.e.tagName === 'BUTTON'
    || o.e.getAttribute('role') === 'button' || o.cs.cursor === 'pointer');
  const small = tappable.filter(o => o.r.width < 40 || o.r.height < 40)
    .map(o => `${o.e.className || o.e.tagName} ${Math.round(o.r.width)}x${Math.round(o.r.height)}`);
  const unnamed = tappable
    .filter(o => !(o.e.getAttribute('aria-label') || o.e.textContent.trim()
                || o.e.querySelector('[aria-label]')))
    .map(o => o.e.className || o.e.tagName);

  /* Space with nothing in it: the shape of the var(--undefined) bug, which no
     structural test can see because the markup is perfectly correct. */
  const blank = rects.filter(o => {
    if (o.e.children.length || o.e.textContent.trim()) return false;
    if (o.r.width < 6 || o.r.height < 6) return false;
    const c = o.cs;
    const bg = c.backgroundColor === 'rgba(0, 0, 0, 0)' || c.backgroundColor === 'transparent';
    const img = c.backgroundImage && c.backgroundImage !== 'none';
    const bord = ['Top','Right','Bottom','Left'].some(k =>
      parseFloat(c['border' + k + 'Width']) > 0 && c['border' + k + 'Style'] !== 'none'
      && c['border' + k + 'Color'] !== 'rgba(0, 0, 0, 0)');
    const shadow = c.boxShadow && c.boxShadow !== 'none';
    return bg && !img && !bord && !shadow;
  }).map(o => o.e.className || o.e.tagName);

  const deadInk = [...s.querySelectorAll('svg line, svg path, svg polyline, svg circle, svg rect')]
    .filter(e => { const c = getComputedStyle(e);
      const noStroke = c.stroke === 'none' || c.stroke === 'rgb(0, 0, 0)';
      const noFill = c.fill === 'none' || c.fill === 'rgb(0, 0, 0)';
      return noStroke && noFill; })
    .map(e => (e.parentElement && e.parentElement.getAttribute('class')) || e.tagName);

  return { spill: [...new Set(spill)], small: [...new Set(small)], unnamed: [...new Set(unnamed)],
           blank: [...new Set(blank)], deadInk: [...new Set(deadInk)] };
});

const rows = [];
for (const m of modes){
  errs = [];
  await quitToHome(page);
  await openModeList(page);
  try { await clickMode(page, m.id); }
  catch (e){ rows.push({ name: m.name, err: e.message }); continue; }
  await page.waitForFunction(() => document.getElementById('surface').children.length > 0,
    { timeout: 9000, polling: 80 }).catch(() => {});
  await page.waitForTimeout(650);
  const g = await inspect();
  const a11y = (await axeOn(page, '#play')).map(v => `${v.id} x${v.n}`);
  rows.push({ name: m.name, ...g, a11y, errs: errs.slice(0, 2) });
}
await browser.close();

const bad = r => (r.err ? 1 : 0) + (r.spill || []).length + (r.small || []).length
  + (r.unnamed || []).length + (r.blank || []).length + (r.deadInk || []).length
  + (r.a11y || []).length + (r.errs || []).length;
let clean = 0;
for (const r of rows){
  if (!bad(r)){ clean++; continue; }
  console.log(r.name);
  if (r.err)             console.log(`    ! ${r.err}`);
  if (r.spill?.length)   console.log(`    spills the surface : ${r.spill.join(', ')}`);
  if (r.small?.length)   console.log(`    under 40px         : ${r.small.join(', ')}`);
  if (r.unnamed?.length) console.log(`    tappable, no name  : ${r.unnamed.join(', ')}`);
  if (r.blank?.length)   console.log(`    paints nothing     : ${r.blank.join(', ')}`);
  if (r.deadInk?.length) console.log(`    svg with no ink    : ${r.deadInk.join(', ')}`);
  if (r.a11y?.length)    console.log(`    axe                : ${r.a11y.join(', ')}`);
  if (r.errs?.length)    console.log(`    page error         : ${r.errs.join(' | ')}`);
}
console.log(`\n${clean}/${rows.length} modes clean`);
floorOrDie('sweep', rows.length, 60);
process.exit(clean === rows.length ? 0 : 1);
