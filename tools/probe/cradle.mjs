/* Cat's Cradle, with its rules: a board at each step of what the cradle asks for, played the way its own proof says it can be.
 *
 *   from the start   a long pull (a jump near the edge of the reach) pays on the spot, and a thread that never crosses is a clean weave
 *   level 6          one peg carries a gold bead: looping it lets the thread back out
 *   level 12         a cat naps on one peg, and that peg is looped last
 *   level 20         the thread may not cross itself at all
 *
 * Each board is solved by the plan the page proved it with (a clean weave, under the same costs the player pays), so a board that
 * cannot be finished cleanly fails here. Then the rules are leaned on: the cat's peg tapped early, a stretch that would cross, the
 * bead, and a player who taps whatever is lit up until the board ends, who must never be left with nothing to tap.
 *
 *   node tools/probe/cradle.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const TIERS = [{ xp: 0, name: 'first boards' }, { xp: 1500, name: 'the bead' }, { xp: 12000, name: 'the cat' }, { xp: 60000, name: 'no crossing' }];
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { arc: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'arc');
  await page.waitForSelector('.arcbox .arcdot.lit', { timeout: 15000 });
  await page.waitForTimeout(350);                                  /* the first reach is drawn growing to its size */
  await page.evaluate(() => { window.__rounds = []; });
  return page;
};
const read = page => page.evaluate(() => {
  const box = document.querySelector('.arcbox');
  /* a round that has ended takes its board with it */
  if (!box) return { gone: true, lit: [], near: [], plan: [], n: 0, lines: 0, crossLines: 0, pulls: 0, reach: 0, made: false, clean: false, prompt: (document.querySelector('.prompt') || {}).textContent || '', score: '', paws: 0, rounds: (window.__rounds || []).slice() };
  const dots = [...box.querySelectorAll('.arcdot')], halo = box.querySelector('.arcreach');
  return { lv: +box.dataset.lv, cat: +box.dataset.cat, bead: +box.dataset.bead, strict: box.dataset.strict === '1', weave: box.dataset.weave === '1', pulls: +box.dataset.pulls,
    plan: box._plan.slice(), n: dots.length, lit: dots.map(d => d.classList.contains('lit')), near: dots.map(d => d.classList.contains('near')),
    reach: halo.getBoundingClientRect().width, made: box.querySelector('.arcwire').classList.contains('made'), clean: box.querySelector('.arcwire').classList.contains('weave'),
    lines: box.querySelectorAll('.arcwire line').length, crossLines: box.querySelectorAll('.arcwire line.cross').length,
    prompt: (document.querySelector('.prompt') || {}).textContent || '', score: (document.getElementById('hudScore') || {}).textContent || '',
    paws: document.querySelectorAll('.budget.paws i:not(.used)').length, rounds: (window.__rounds || []).slice() };
});
const tap = async (page, i) => { await page.locator('.arcbox .arcdot').nth(i).click({ force: true }); await page.waitForTimeout(60); };

for (const tier of TIERS){
  /* ── the plan the page proved the board with finishes it, as a clean weave ── */
  const page = await open(tier.xp);
  const st0 = await read(page);
  const want = { bead: st0.lv >= 6, cat: st0.lv >= 12, strict: st0.lv >= 20 };
  check((st0.bead >= 0) === want.bead && (st0.cat >= 0) === want.cat && st0.strict === want.strict,
    `${tier.name} (level ${st0.lv}, ${st0.n} pegs): ${want.bead ? 'a bead' : 'no bead'}, ${want.cat ? 'a cat' : 'no cat'}, ${want.strict ? 'no crossing' : 'crossing allowed'}`);
  check(st0.plan.length === st0.n && st0.weave && (!want.cat || st0.plan[st0.n - 1] === st0.cat), `the board is proved by a clean weave${want.cat ? ' that ends on the cat’s peg' : ''}`);
  const expect = st0.lv >= 20 ? /cross/i : st0.lv >= 12 ? /cat/i : st0.lv >= 6 ? /bead/i : /left/i;
  check(expect.test(st0.prompt), `the line over the board teaches the newest rule ("${st0.prompt}")`);
  /* the cat's peg, tapped before its turn, is not taken (and a paw says so, when it was in reach) */
  if (want.cat && st0.paws >= 2){            /* with one paw left a wrong tap is the round, which is its own rule and not this one */
    await tap(page, st0.cat);
    const a = await read(page);
    check(!a.lit[st0.cat] && a.lines === 0, 'the cat’s peg tapped first is not looped' + (st0.near[st0.cat] ? ` ("${a.prompt}")` : ''));
  }
  let reach0 = st0.reach, beadOk = null, pullPaid = null, order = [0];
  for (const i of st0.plan.slice(1)){
    const before = await read(page);
    await tap(page, i);
    if (i === st0.bead) await page.waitForTimeout(450);          /* the reach is drawn growing back, not snapped */
    const after = await read(page);
    order.push(i);
    if (after.pulls > before.pulls && pullPaid === null) pullPaid = { from: before.score, to: after.score, prompt: after.prompt };
    if (i === st0.bead && !after.made){ beadOk = Math.abs(after.reach - reach0) < 2 && after.reach > before.reach; if (!beadOk) console.log('   bead: first reach', reach0, 'before', before.reach, 'after', after.reach); }
    if (after.made) break;
  }
  const fin = await read(page);
  check(fin.made && fin.clean && fin.crossLines === 0, `the plan finishes the cradle, and it is a clean weave (${fin.lines} stretches, ${fin.pulls} long pulls)`);
  check(fin.rounds.some(r => r.ok === true) && !fin.rounds.some(r => r.ok === false), 'and the round is won');
  if (want.bead) check(beadOk !== false, beadOk === null ? 'the bead was the last peg of this plan (nothing to let out)' : 'looping the bead lets the thread back out to its first reach');
  if (pullPaid) check(pullPaid.to !== pullPaid.from || /pull/i.test(pullPaid.prompt), `a long pull pays on the spot (${pullPaid.from} -> ${pullPaid.to}, "${pullPaid.prompt}")`);
  await page.close();
}

/* ── where the thread may not cross, a stretch that would is refused ── */
{
  let seen = false, refused = true;
  for (let board = 0; board < 4 && !seen; board++){
    const page = await open(60000);
    const st0 = await read(page);
    const pts = await page.evaluate(() => { const b = document.querySelector('.arcbox').getBoundingClientRect(); return [...document.querySelectorAll('.arcbox .arcdot')].map(d => { const r = d.getBoundingClientRect(); return { x: r.left + r.width/2 - b.left, y: r.top + r.height/2 - b.top }; }); });
    const side = (a, b, c) => (b.x - a.x)*(c.y - a.y) - (b.y - a.y)*(c.x - a.x);
    const cut = (a, b, c, d) => side(a, b, c)*side(a, b, d) < 0 && side(c, d, a)*side(c, d, b) < 0;
    const order = [0];
    for (const i of st0.plan.slice(1)){
      const now = await read(page), from = pts[order[order.length - 1]];
      if (now.gone || now.made) break;
      const x = now.near.findIndex((nr, k) => nr && !now.lit[k] && k !== st0.cat && order.slice(0, -1).some((_, q) => q + 1 < order.length - 1 + 1 && q + 2 <= order.length - 1 && cut(pts[order[q]], pts[order[q + 1]], from, pts[k])));
      if (x >= 0){
        seen = true;
        await tap(page, x);
        const a = await read(page);
        refused = a.gone ? a.rounds.some(r => r.ok === false) : !a.lit[x] && a.lines === now.lines && (/cross/i.test(a.prompt) || a.rounds.some(r => r.ok === false));   /* the last paw ends the round, and the shell says so */
        break;
      }
      await tap(page, i); order.push(i);
    }
    await page.close();
  }
  check(!seen || refused, seen ? 'no crossing: a stretch that would cross the thread is refused (the line says why, or the last paw is spent)' : 'no crossing: no board in four offered a crossing stretch in reach (nothing to refuse)');
}

/* ── a player who taps whatever is lit up is never left with nothing to tap ── */
for (const xp of [0, 12000, 60000]){
  let stuck = 0, ended = 0, boards = 0, lets = 0;
  for (let b = 0; b < 3; b++){
    const page = await open(xp); boards++;
    let seed = 7 + b*13 + xp;
    const rnd = () => { seed = (seed*1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let step = 0; step < 60; step++){
      const st = await read(page);
      if (st.made || st.gone || st.rounds.some(r => r.ok !== undefined)) { ended++; break; }
      if (/let out/i.test(st.prompt)) lets++;
      const can = st.near.map((nr, k) => nr && !st.lit[k] ? k : -1).filter(k => k >= 0);
      if (!can.length){ stuck++; break; }
      await tap(page, can[Math.floor(rnd()*can.length)]);
    }
    await page.close();
  }
  check(stuck === 0 && ended === boards, `tapping any peg in reach, at ${xp} XP: ${ended} of ${boards} boards ended, never with nothing in reach${lets ? ' (the thread was let out ' + lets + ' times)' : ''}`);
}

if (errs.length){ bad++; console.log('PAGE ERRORS', [...new Set(errs)].slice(0, 3)); }
await browser.close();
console.log(bad ? `\n${bad} problem(s) in Cat's Cradle` : '\nCat’s Cradle: long pulls, a clean weave, a bead, a cat and a thread that will not cross');
process.exit(bad ? 1 : 0);
