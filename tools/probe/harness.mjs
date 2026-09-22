/* Shared plumbing for the browser probes.
 *
 * These used to live in a scratch directory with the navigation inlined in each
 * one. Changing where the Modes tab lands invalidated the selector in eighty of
 * them at once: one passed silently with "0/0 clean" and seventy-nine hung on a
 * timeout. The repair was a regex over eighty files, which is the wrong shape of
 * repair — so the navigation lives here, once.
 *
 * Requires playwright and axe-core. See README.md.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export const PORT = process.env.PORT || 8275;
export const BASE = `http://127.0.0.1:${PORT}/`;

/* A save with sensible defaults; pass what the probe actually cares about. */
export const save = (o = {}) => JSON.stringify(Object.assign({
  schema: 10, xp: 40000, solved: 180, runs: 42, marathon: {}, daily: {}, mix: [],
  sound: false, haptics: false, reduceMotion: true, colorAssist: false, lang: 'en',
  seenVersion: '9.9.9', lifetime: 52000, perks: [], perkLv: {}, tokens: 0,
  pbBlitz: 0, pbStreak: 0, dailyStreak: 0, dailyLast: null, dailyBestStreak: 0,
  onboarded: true, lastMode: null, tapes: [], tapeId: null, seen: {}
}, o));

/* Open the app with a given save, and get past anything that opens over the
 * top of it. A probe that forgets the welcome screen measures the welcome
 * screen. */
export async function openApp(page, state = {}){
  await page.addInitScript(v => localStorage.setItem('dd.v1', v), save(state));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const w = document.getElementById('wcSkip');
    if (w && !document.getElementById('welcome').hidden) w.click();
    const c = document.getElementById('logClose');
    if (c) c.click();
  });
  await page.waitForTimeout(200);
}

export async function goTab(page, name){
  const ok = await page.evaluate(n => {
    const b = document.querySelector(`[data-tab="${n}"]`);
    if (b) b.click();
    return !!b;
  }, name);
  /* Named, not a TypeError on null: the next person to move a tab should read
     which tab moved, not a stack trace from inside page.evaluate. */
  if (!ok) throw new Error(`no tab called "${name}" — the tab bar has changed`);
  await page.waitForTimeout(320);
}

/* THE one place that knows how to reach a mode. The Modes tab lands on a family
 * picker, so the flat list has to be opened before any mode card exists. If that
 * ever changes again, it changes here. */
export async function openModeList(page){
  await goTab(page, 'Modes');
  await page.evaluate(() => { const w = document.querySelector('.catcard.wide'); if (w) w.click(); });
  await page.waitForTimeout(320);
  const n = await page.evaluate(() => document.querySelectorAll('#modeSections .mcard').length);
  if (n < 2) throw new Error(
    `openModeList reached the Modes tab but found ${n} mode cards — the navigation has changed again`);
  return n;
}

/* Start a mode by its id and wait for its board. Ids, not displayed names: a
 * probe that runs in German should not have to know the German for "Sift". */
export async function openMode(page, id, sel, timeout = 15000){
  await openModeList(page);
  await clickMode(page, id);
  if (sel) await page.waitForFunction(s => !!document.querySelector(s), sel, { timeout, polling: 80 });
  await page.waitForTimeout(250);
}

/* Click one card in an already-open list. */
export async function clickMode(page, id){
  const found = await page.evaluate(k => {
    const c = document.querySelector(`#modeSections .mcard[data-id="${k}"]`);
    if (c) c.click();
    return !!c;
  }, id);
  if (!found) throw new Error(`no mode card with id "${id}" in the list`);
}

/* Back out of whatever is on screen to the home tab. */
export async function quitToHome(page){
  await page.evaluate(() => {
    const q = document.getElementById('quitBtn');
    if (q && !document.getElementById('play').hidden) q.click();
  });
  await page.waitForTimeout(330);
  await page.evaluate(() => { const h = document.getElementById('homeBtn'); if (h) h.click(); });
  await page.waitForTimeout(360);
}

/* Every mode, as {id, name} in the current language. */
export async function modeList(page){
  await openModeList(page);
  return page.evaluate(() =>
    [...document.querySelectorAll('#modeSections .mcard')].map(c => ({
      id: c.dataset.id, name: c.querySelector('b').textContent.trim() })));
}

/* Mode ids read out of the built file, for probes that need the roster before a
 * browser exists (seeding a save where every mode is mastered, say). */
export function modeIdsFromBuild(dir){
  const src = readFileSync(join(dir, 'index.html'), 'utf8');
  const i = src.indexOf('const MODES = {'), j = src.indexOf('const MODE_IDS', i);
  const ids = [...src.slice(i, j).matchAll(/\n  ([a-z][a-zA-Z0-9]*): \{\n/g)].map(m => m[1]);
  floorOrDie('modeIdsFromBuild', ids.length, 60);
  return ids;
}

/* axe-core is a dev dependency and may be installed beside the repo or beside
 * the scratch runner; look in both rather than making the caller care. */
const HERE = dirname(fileURLToPath(import.meta.url));
const AXE = (() => {
  const tries = [join(HERE, '../../node_modules/axe-core/axe.min.js'),
                 process.env.AXE || '',
                 '/tmp/pw/node_modules/axe-core/axe.min.js'].filter(Boolean);
  for (const f of tries){ try { return readFileSync(f, 'utf8'); } catch {} }
  throw new Error('axe-core not found — npm i -D axe-core, or set AXE to axe.min.js');
})();

export async function axeOn(page, sel){
  await page.addScriptTag({ content: AXE }).catch(() => {});
  return page.evaluate(async s => {
    const r = await axe.run(document.querySelector(s), { resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } });
    return r.violations.map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length,
      sample: (x.nodes[0] && x.nodes[0].html || '').slice(0, 110) }));
  }, sel);
}

/* A count that must not be allowed to come back empty: "0 of 0 clean" is how a
 * probe reports success at having done nothing. */
export function floorOrDie(label, got, min){
  if (got < min){
    console.log(`\n${label}: found ${got}, expected at least ${min} — the probe is no longer finding its work`);
    process.exit(1);
  }
}
