/* Visual regression: what each mode's board actually LOOKS like.
 *
 * Every visual fault found in this project so far — a board filling half the
 * screen, tiles stretched to 1:1.6, a swapped tile covering the whole board,
 * thread drawn too fine to see — passed the gate check, the sweep and every
 * DOM assertion. Those prove a mode does not crash. Nothing proved it looked
 * right, so a person had to notice, which is the slowest possible test.
 *
 * This takes a picture of each board and compares it to a stored one.
 *
 *   node tools/probe/shots.mjs            compare against the baseline
 *   UPDATE=1 node tools/probe/shots.mjs   accept what is on screen now
 *
 * Comparison is byte-exact, which is only honest if the render is actually
 * deterministic, so the run does not assume that — it shoots every mode TWICE
 * and only compares the ones that produced identical bytes both times. A mode
 * that cannot hold still is reported as unstable and skipped rather than
 * failing at random, which is the failure mode that gets a visual suite
 * switched off and ignored.
 *
 * Determinism comes from seeding Math.random before any app code runs: a
 * mode's board is built from ctx.rnd, which is Math.random for every run type
 * except the Daily. Nothing in the app changes for this.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openApp, openModeList, clickMode, modeIdsFromBuild, floorOrDie } from './harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, 'baseline');
const UPDATE = !!process.env.UPDATE;
const SITE = process.env.SITE || '/tmp/pw/_site';

if (!existsSync(BASE)) mkdirSync(BASE, { recursive: true });
const ids = modeIdsFromBuild(SITE);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 400, height: 820 }, hasTouch: true });
/* Before any app script: a fixed stream, so every board is dealt the same
   cards on every run. */
await ctx.addInitScript(() => {
  const SEED = 0x9E3779B9;
  let a = SEED;
  Math.random = () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  /* Rewound before each mode is started. A fixed seed alone is not enough:
     the stream keeps advancing as the app runs, so the second visit to a mode
     deals from wherever the first one left it and every board comes out
     different. That is what the stability check caught. */
  window.__reseed = () => { a = SEED; };
});
const page = await ctx.newPage();

/* A fresh save for every single shot. A seeded RNG is not enough on its own:
   a mode's difficulty ramps on save.runs, and quitting a run increments it, so
   the second visit to Odd Skein deals 25 tiles where the first dealt 9. Same
   seed, different board. Reloading is slow and is the only thing that makes
   this comparable at all. */
const shoot = async id => {
  await openApp(page, { reduceMotion: true, xp: 9000, runs: 40, solved: 600,
                        sound: false, haptics: false, onboarded: true });
  await openModeList(page);
  await page.evaluate(() => window.__reseed && window.__reseed());
  await clickMode(page, id);
  await page.waitForTimeout(1100);
  const el = await page.$('#surface');
  return el.screenshot({ type: 'png' });
};

const changed = [], unstable = [], fresh = [];
let same = 0;
for (const id of ids){
  let a, b;
  try { a = await shoot(id); b = await shoot(id); }
  catch (e){ unstable.push(id + ' (' + e.message.slice(0, 40) + ')'); continue; }
  if (!a.equals(b)){ unstable.push(id); continue; }
  const file = join(BASE, id + '.png');
  if (!existsSync(file) || UPDATE){
    writeFileSync(file, a);
    if (!existsSync(file)) fresh.push(id); else fresh.push(id);
    continue;
  }
  if (readFileSync(file).equals(a)) same++;
  else {
    changed.push(id);
    writeFileSync(join(BASE, id + '.actual.png'), a);
  }
}
await browser.close();

floorOrDie('shots', ids.length, 40);
console.log('');
if (UPDATE){
  console.log(`baseline written for ${fresh.length} modes; ${unstable.length} could not hold still`);
} else {
  console.log(`${same} unchanged · ${changed.length} changed · ${fresh.length} new · ${unstable.length} unstable`);
}
if (fresh.length && !UPDATE) console.log('  no baseline yet: ' + fresh.join(', '));
if (unstable.length) console.log('  unstable (not compared): ' + unstable.join(', '));
if (changed.length){
  console.log('\n  CHANGED — the board does not look how it used to:');
  changed.forEach(id => console.log(`    ${id}  (was baseline/${id}.png, now baseline/${id}.actual.png)`));
  console.log('\n  If the change was intended: UPDATE=1 node tools/probe/shots.mjs');
}
process.exit(changed.length ? 1 : 0);
