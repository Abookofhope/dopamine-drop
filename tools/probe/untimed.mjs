/* Cozy has no clock (v0.178.0, WCAG 2.2.1): in a Cozy run no game can beat a player who is only thinking.
 *
 * Cozy runs have never had a run clock or a round clock, but some games keep time of their own: a wall that comes down
 * on a beat, balls that fall, a light that fades. Here every game is dealt in a Cozy run on its own (dd.pool), and the
 * player does nothing for 16 seconds: no round may be lost, no slip counted, in any game. As a control, three of the
 * games that keep their own time are idled in a Challenge run, where they must beat the idle player, so a clean Cozy
 * result cannot come from rounds that never end. Tumble Dryer, whose drum takes longer to fill, is idled for 45 s.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/untimed.mjs        ONLY=blast,beat   some games
 */
import { chromium } from 'playwright';
import { openApp, startShuffle, quitToHome, modeIdsFromBuild } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const IDLE = +(process.env.IDLE || 16000);
let ids = modeIdsFromBuild(process.env.SITE);
if (process.env.ONLY) ids = ids.filter(id => process.env.ONLY.split(',').includes(id));
const browser = await chromium.launch();
const errs = [];

async function idle(id, door){ return idleFor(id, door, IDLE); }
async function idleFor(id, door, ms){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(id + ': ' + String(e).slice(0, 120)));
  await page.addInitScript(p => { try { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', p); } catch {} }, id);
  await openApp(page, { door, reduceMotion: true, onboarded: true, xp: 12000, runs: 40, solved: 600, seen: { [id]: 1 } });
  await startShuffle(page);
  await page.waitForFunction(() => document.getElementById('play').classList.contains('live'), null, { timeout: 12000 }).catch(() => {});
  await page.evaluate(() => { window.__rounds.length = 0; });
  await page.waitForTimeout(ms);
  const got = await page.evaluate(() => window.__rounds.slice());
  await quitToHome(page);
  await page.close();
  return { lost: got.filter(r => r.ok === false).length, slips: got.filter(r => r.slip).length, kind: (got[0] || {}).kind };
}

const timedInChallenge = [], beat = [];
/* four boards at a time: forty-six games idled one after another took longer than a probe may run */
const ALONG = +(process.env.ALONG || 4);
for (let i = 0; i < ids.length; i += ALONG){
  const part = ids.slice(i, i + ALONG);
  const got = await Promise.all(part.map(id => idle(id, 'cozy')));
  part.forEach((id, k) => { const c = got[k];
    if (c.lost || c.slips) beat.push(`${id} (${c.lost} lost, ${c.slips} slips)`);
    if (process.env.REPORT) console.log(`   ${id.padEnd(8)} cozy: ${c.lost} lost, ${c.slips} slips`); });
}
/* the control: the games that keep time of their own (found by this probe on v0.177.0) do take a round from an idle
   player in a Challenge run, so a clean Cozy result means something. A Challenge run's own clock ends the run rather than
   a round, so the control has to be a game with a clock of its own. */
const OWN = ['peril', 'bruise', 'descent', 'drift', 'gather', 'blast'].filter(id => ids.includes(id)).slice(0, 3);
(await Promise.all(OWN.map(id => idle(id, 'challenge')))).forEach((c, k) => { if (c.lost) timedInChallenge.push(OWN[k]); });
check(!OWN.length || timedInChallenge.length === OWN.length, `the control: in a Challenge run they do beat an idle player (${timedInChallenge.join(', ') || 'none'} of ${OWN.join(', ')})`);
/* Tumble Dryer's drum takes longer than the idle above to fill: wait it out, in Cozy and (as its control) Challenge */
if (ids.includes('tumble')){
  const [cz, ch] = await Promise.all([idleFor('tumble', 'cozy', 45000), idleFor('tumble', 'challenge', 45000)]);
  check(!cz.lost && ch.lost > 0, `Tumble Dryer: 45 s untouched, Cozy keeps the round (${cz.lost} lost) and Challenge's drum fills (${ch.lost} lost)`);
}

/* And they can still be played and won in Cozy, where they wait: Dropped Stitch by steering under each waiting gap and
   letting go, Catch the Balls by moving the pail under a good ball (or away from a tangle) and letting go, and Sandbox of
   Softness by making the front bucket match the next grain and dropping it. Sandbox is won with no spill at all: before
   0.178.0 its last grain was refused, so a round with no spill could never be finished, in any mode. */
async function play(id, step, ms){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(id + ': ' + String(e).slice(0, 120)));
  await page.addInitScript(p => { try { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', p); } catch {} }, id);
  await openApp(page, { door: 'cozy', reduceMotion: true, onboarded: true, xp: 2000, runs: 40, solved: 600, seen: { [id]: 1 } });
  await startShuffle(page);
  await page.waitForFunction(() => document.getElementById('play').classList.contains('live'), null, { timeout: 12000 }).catch(() => {});
  const t0 = Date.now();
  while (Date.now() - t0 < ms){ await step(page); if (await page.evaluate(() => window.__rounds.some(r => r.ok !== undefined))) break; }
  const r = await page.evaluate(() => window.__rounds.filter(x => x.ok !== undefined));
  await page.close();
  return r;
}
if (!process.env.ONLY || process.env.ONLY.split(',').some(x => ['descent', 'gather', 'sift'].includes(x))){
  const won = async (id, step, ms, what) => { if (process.env.ONLY && !process.env.ONLY.split(',').includes(id)) return; const r = await play(id, step, ms);
    check(r.length > 0 && r[0].ok === true, `${what} (${JSON.stringify(r)})`); };
  await won('descent', async page => {
  const g = await page.evaluate(() => { const sky = document.querySelector('.descentsky').getBoundingClientRect(), star = document.querySelector('.dstar').getBoundingClientRect();
    const bars = [...document.querySelectorAll('.dbar')].filter(e => !e.classList.contains('cleared') && !e.classList.contains('struck'));
    if (!bars.length) return null; const bar = bars.map(e => ({ e, y: e.getBoundingClientRect().top })).filter(o => o.y > star.top).sort((a, c) => a.y - c.y)[0]; if (!bar) return null;
    const kids = [...bar.e.children].map(k => k.getBoundingClientRect()).sort((a, c) => a.left - c.left);
    return [(kids[0].right + kids[kids.length - 1].left) / 2, sky.top + 40, kids.length]; });
  if (g){ await page.mouse.click(g[0], Math.max(120, g[1])); }
  await page.waitForTimeout(250);
}, 60000, 'Dropped Stitch in Cozy: won by steering under each waiting gap and letting go');
  await won('gather', async page => {
  const g = await page.evaluate(() => { if (!/let go/.test((document.querySelector('.prompt')||{}).textContent || '')) return null;
    const f = document.querySelector('.gatherfield, #surface [class*=field]') || document.getElementById('surface'), fr = document.querySelector('.gdrop').parentElement.getBoundingClientRect();
    const ds = [...document.querySelectorAll('.gdrop.gfall')].filter(e => !e.classList.contains('landed') && !e.classList.contains('fell') && !e.classList.contains('splat'));
    if (!ds.length) return null; const d = ds.map(e => ({ e, r: e.getBoundingClientRect() })).sort((a, c) => c.r.top - a.r.top)[0];
    const x = d.r.left + d.r.width / 2, dud = d.e.classList.contains('dud');
    return [dud ? (x > fr.left + fr.width / 2 ? fr.left + 30 : fr.right - 30) : x, fr.top + fr.height * 0.9]; });
  if (g) await page.mouse.click(g[0], g[1]);
  await page.waitForTimeout(250);
}, 90000, 'Catch the Balls in Cozy: won by moving the pail and letting go');
  await won('sift', async page => {
  const st = await page.evaluate(() => ({ front: (document.querySelector('.belt > *') || {}).dataset?.hex || null, next: (document.querySelector('.grain.next') || {}).dataset?.hex || null }));
  if (!st.next){ await page.waitForTimeout(300); return; }
  if (st.front && st.front !== st.next){ await page.click('.belt > *'); await page.waitForTimeout(350); return; }
  if (!st.front){ const btn = await page.$(`.bkt[data-hex="${st.next}"]`); if (btn) await btn.click(); await page.waitForTimeout(350); return; }
  const p = await page.$('.sumtools .sumtool'); if (p) await p.click(); await page.waitForTimeout(650);
}, 100000, 'Sandbox of Softness in Cozy: won with no spill, the last grain included');
}
check(ids.length > 0 && !beat.length, `Cozy: ${ids.length} games, and none beats a player who does nothing for ${IDLE / 1000}s (${beat.join('; ') || 'none'})`);
check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nin Cozy, nothing in any game runs out while you think');
process.exit(bad ? 1 : 0);
