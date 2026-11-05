/* The game keeps its word (v0.146.0).
 *
 * Four promises the game made and did not keep, found while taking stock for the overhaul bible:
 *   1. Go again after a Calm or Quick mix dealt all forty-four games: the button carried the run type and not the
 *      kind, so the mood the player picked was forgotten.
 *   2. Every Shuffle and Custom run chased one best, so a sixty-second Custom run was shown a ten-minute score to beat
 *      and a Calm mix a Full Purr one.
 *   3. Window Seat stretched round clocks, and no run that deals charms has one, so a rare card did nothing; Sharp
 *      Claws' price was the same no-op; and charms that pay or cost time were dealt in Endless, which has no clock.
 *   4. The daily gift went back to day one after a single missed day.
 * Plus the small text faults: Reflex Rush said seven games (there are eight), and two lines stayed in English.
 *
 *   PORT=8501 SITE=/path/to/built node tools/probe/honest.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const QUICK = ['blast','forage','beat','arc','skim','bruise','slice','descent','gather','tumble','odd','stroop','count','order'];
const TIMED_ONLY = ['sunbeam','blanket','ghostcat','sharpclaws','nightlight','bowl','windowseat','tangle','tunatin','moonmilk'];
const dayKey = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };

async function page0(state = {}, vp = { width: 390, height: 844 }, locale = 'en-US'){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, locale });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true, schema: 11 }, state));
  return { page, ctx };
}
/* A round is live once the count-in is gone and a board (not the mode plate) is on the surface. Pausing before that
   leaves the run at once, by design, so the wait matters. */
const live = page => page.waitForFunction(() => {
  const p = document.getElementById('play'), sf = document.getElementById('surface');
  return !p.hidden && !!p.dataset.mode && !document.getElementById('count')
    && [...sf.children].some(c => !c.classList.contains('swap')) && ![...sf.children].some(c => c.classList.contains('swap'));
}, null, { timeout: 12000, polling: 100 }).then(() => page.waitForTimeout(350)).then(() => true, () => false);
const modeNow = page => page.evaluate(() => document.getElementById('play').dataset.mode || '');
async function playGate(page, gate){
  await goTab(page, 'Play');
  await page.evaluate(() => { const b = document.getElementById('gateBack'); if (b && !document.getElementById('playGate').hidden) b.click(); });
  await page.waitForTimeout(150);
  await page.evaluate(g => document.querySelector('.gateBtn[data-gate="' + g + '"]').click(), gate);
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('moodPlay').click());
}
async function endRun(page){
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForSelector('.pauseEnd', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('.pauseEnd').click());
  await page.waitForFunction(() => !document.getElementById('over').hidden, null, { timeout: 6000 });
  await page.waitForTimeout(400);
}
/* Deal the next board from the pause sheet and wait for it. */
/* Different puzzle keeps the round number and changes the game, so it is the game that is watched. */
async function different(page){
  const before = await page.evaluate(() => document.getElementById('play').dataset.mode);
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForSelector('.pauseSkip', { timeout: 5000 });
  const ok = await page.evaluate(() => { const b = document.querySelector('.pauseSkip'); if (!b || b.disabled) return false; b.click(); return true; });
  if (!ok) return false;
  const moved = await page.waitForFunction(m => document.getElementById('play').dataset.mode !== m, before, { timeout: 9000, polling: 100 }).then(() => true, () => false);
  return moved && live(page);
}

/* ── 1. Go again deals the same kind ── */
{
  const { page, ctx } = await page0();
  await playGate(page, 'quick');
  check(await live(page), 'a Quick Paws mix starts');
  await endRun(page);
  const over = await page.evaluate(() => ({ gate: document.getElementById('over').dataset.gate || '', kind: document.getElementById('overKind').textContent }));
  check(/Quick Paws/.test(over.kind), `Game Over names the kind ("${over.kind}")`);
  await page.evaluate(() => document.getElementById('againBtn').click());
  check(await live(page), 'Go again starts a run');
  const seen = [await modeNow(page)];
  for (let i = 0; i < 3; i++){ if (await different(page)) seen.push(await modeNow(page)); }
  const off = seen.filter(id => QUICK.indexOf(id) < 0);
  check(seen.length >= 3 && !off.length, `every board Go again deals is a Quick Paws game (${seen.join(', ')}${off.length ? '; not Quick: ' + off.join(', ') : ''})`);
  await ctx.close();
}

/* ── 2. a best per kind, and Custom's own ── */
{
  /* An old save whose one best (9,000) came from the full shuffle. */
  const { page, ctx } = await page0({ pbBlitz: 9000, tapes: [{ id: 'tp1', name: 'Mine', modes: ['odd', 'order', 'count'] }], tapeId: 'tp1' });
  await playGate(page, 'full');
  await live(page); await page.waitForTimeout(500);
  const full = await page.evaluate(() => { const b = document.getElementById('hudBest'); return b && !b.hidden ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  check(/9\D?000/.test(full), `the Full Purr still chases the old best ("${full}")`);
  await endRun(page);
  await playGate(page, 'calm');
  await live(page); await page.waitForTimeout(500);
  const calm = await page.evaluate(() => { const b = document.getElementById('hudBest'); return b && !b.hidden ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  check(!/9\D?000/.test(calm), `a Calm mix does not chase the Full Purr's 9,000 ("${calm || 'no best yet'}")`);
  await endRun(page);
  const sub = await page.evaluate(() => document.getElementById('againSub').textContent);
  check(!/9\D?000/.test(sub), `and Go again does not ask it to beat 9,000 ("${sub}")`);
  await page.evaluate(() => document.getElementById('mixBtn').click());
  const mixLive = await live(page);
  if (mixLive){
    await page.waitForTimeout(500);
    const mix = await page.evaluate(() => { const b = document.getElementById('hudBest'); return b && !b.hidden ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
    check(!/9\D?000/.test(mix), `a 60-second Custom run does not chase a 10-minute best ("${mix || 'no best yet'}")`);
    await endRun(page);
  } else check(false, 'a Custom run starts from the Play tab');
  const pb = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')));
  check(pb.pbBlitz === 9000 && pb.pbGate && pb.pbGate.full === 9000, `the old best is kept as the Full Purr's and the overall best (pbBlitz ${pb.pbBlitz}, full ${pb.pbGate && pb.pbGate.full})`);
  await ctx.close();
}

/* ── 3. charms ── */
{
  const { page, ctx } = await page0();
  const offers = await page.evaluate(() => {
    if (!window.__charm) return null;
    const take = k => { const n = {}; for (let i = 0; i < 400; i++) window.__charm.offer(k).forEach(id => n[id] = (n[id] | 0) + 1); return n; };
    return { endless: take('endless'), shuffle: take('shuffle') };
  });
  check(!!offers, 'the draft can be sampled (probe hook)');
  if (offers){
    const blank = TIMED_ONLY.filter(id => offers.endless[id]);
    check(!blank.length, `Endless never deals a charm that pays or costs clock time (${blank.length ? 'dealt: ' + blank.join(', ') : '1,200 cards'})`);
    check(!!offers.shuffle.windowseat && !!offers.shuffle.sunbeam, `a timed run still deals them (Window Seat ${offers.shuffle.windowseat | 0}, Sunbeam ${offers.shuffle.sunbeam | 0} times in 1,200)`);
  }
  await ctx.close();
}
{
  /* Window Seat and Sharp Claws do something now: the clock drains slower and faster. Held on Untangle, a board with
     no timer of its own, so a timed-out round cannot land a miss penalty inside the measurement. */
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'rewire'); });
  await openApp(page, { reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true });
  const offers = await page.evaluate(() => !!window.__charm);
  const drain = async id => {
    await playGate(page, 'full');
    await live(page);
    await page.waitForFunction(() => window.__charm && window.__charm.time() > 0, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);                                        /* past the count-in */
    if (id) await page.evaluate(id => window.__charm.give(id), id);
    const a = await page.evaluate(() => window.__charm ? window.__charm.time() : -1);
    await page.waitForTimeout(3000);
    const b = await page.evaluate(() => window.__charm ? window.__charm.time() : -1);
    await endRun(page);
    return a - b;
  };
  if (offers){
    const plain = await drain(null), seat = await drain('windowseat'), claws = await drain('sharpclaws');
    check(plain > 2000, `the clock drains in a plain run (${plain} ms in 3 s)`);
    check(seat < plain * 0.93, `Window Seat slows it (${seat} vs ${plain} ms)`);
    check(claws > plain * 1.12, `Sharp Claws speeds it (${claws} vs ${plain} ms)`);
  }
  await ctx.close();
}

/* ── 4. the gift rests ── */
{
  /* Last collected three days ago, four days into the ladder: the next one is day 5, not day 1. */
  const { page, ctx } = await page0({ gift: { last: dayKey(-3), streak: 4 }, yarn: 0, yarnEver: 0 });
  await goTab(page, 'Room');
  await page.waitForTimeout(300);
  const card = await page.evaluate(() => document.getElementById('giftCard').innerText.replace(/\s+/g, ' '));
  check(/waited/i.test(card), `the gift card says the day waited ("${card.slice(0, 90)}")`);
  const y0 = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).yarn);
  const got = await page.evaluate(() => {
    const b = document.querySelector('#giftCard .wclaim'); if (!b || b.disabled) return null;
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); b.click();
    return true;
  });
  await page.waitForTimeout(400);
  const g = await page.evaluate(() => (JSON.parse(localStorage.getItem('dd.v1')).gift || {}));
  check(got && g.streak === 5, `collecting after three days away is day 5 of the ladder (streak ${g.streak})`);
  const yarn = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).yarn) - y0;
  check(yarn >= 50 && yarn < 70, `and pays day 5's 50 yarn, not day 1's 20 (+${yarn})`);
  await ctx.close();
}

/* ── 5. text ── */
{
  const { page, ctx } = await page0({ lang: 'fr' }, { width: 390, height: 844 }, 'fr-FR');
  const rr = await page.evaluate(() => { const b = document.getElementById('reflexRushBtn'); return b ? b.textContent.replace(/\s+/g, ' ') : document.body.innerHTML.match(/Les \d modes réflexe/) + ''; });
  check(/8/.test(rr) && !/\b7\b/.test(rr), `Reflex Rush counts eight games ("${rr.trim().slice(0, 60)}")`);
  /* Fidget Loop's HUD counts solves in French. */
  await page.evaluate(() => document.getElementById('zenBtn').click());
  check(await live(page), 'Fidget Loop starts');
  await page.waitForTimeout(600);
  const hud = await page.evaluate(() => document.getElementById('hudScore').textContent);
  check(!/solved/.test(hud) && /réussi/.test(hud), `the unscored HUD is in French ("${hud}")`);
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
