/* Chalk Line, played: the round is built from an answer, so the answer must win, and everything around it must do what it says.
 *
 * The app hands the probe the answer it built the round from (only when localStorage carries dd.probe), and this draws it the
 * way a finger would: pressed, dragged through every point, lifted. Then it checks the things a player leans on around it: the
 * chalk stops when it runs out and says so, Undo takes the last line back, Peek draws where the yarn would end up and is
 * limited, Drop is not offered until there is something to drop, a round with nothing useful drawn is lost, and two lines
 * make the same answer as one. It reports what is in the field at each level so the ramp can be read.
 *
 *   node tools/probe/chalk.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const PROFILES = [[0, 2], [2000, 9], [12000, 15], [60000, 23], [900000, 40]];
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const boot = async (xp, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); window.__long = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) {} });
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { chalk: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'chalk');
  await page.waitForSelector('.chalkbox', { timeout: 9000 });
  await page.waitForTimeout(700);
  return page;
};
const read = page => page.evaluate(() => {
  const b = document.querySelector('.chalkbox'); if (!b) return null; const r = b.getBoundingClientRect();
  const n = sel => document.querySelectorAll('.chalkbox ' + sel).length;
  const btn = i => { const e = document.querySelectorAll('.ctool')[i]; return e ? { off: e.disabled, text: e.textContent.trim() } : null; };
  const ink = document.querySelector('.cink'); const ib = ink ? ink.getBoundingClientRect() : { width: 0 };
  return { x: r.left, y: r.top, w: r.width, h: r.height, sol: b.dataset.solution ? JSON.parse(b.dataset.solution) : null,
    lines: n('.cline'), peek: (b.querySelector('.cpeek') || { getAttribute: () => '' }).getAttribute('points') || '', inkFrac: ib.width / r.width, lowInk: !!document.querySelector('.cink.low'),
    prompt: (document.querySelector('.prompt') || {}).textContent || '', undo: btn(0), peekBtn: btn(1), drop: btn(2),
    things: { block: n('.cblock'), button: n('.cbump'), pin: n('.cpad'), scissors: n('.cscis'), tin: n('.cportal'), ribbon: n('.cribbon'), paw: n('.cpaw') },
    basket: !!document.querySelector('.cbasket'), cat: !!document.querySelector('.cbasket .ccat svg'), ball: !!document.querySelector('.cball'),
    long: Math.max(0, ...(window.__long || [0])) };
});
const px = (s, p) => [s.x + p[0] / 100 * s.w, s.y + p[1] / 100 * s.h];
const stroke = async (page, s, pts) => {
  const a = px(s, pts[0]); await page.mouse.move(a[0], a[1]); await page.mouse.down();
  for (const p of pts.slice(1)){ const q = px(s, p); await page.mouse.move(q[0], q[1]); }
  await page.mouse.up();
};
const outcome = page => page.waitForFunction(() => document.querySelector('.cbasket.caught') ? 'win' : (document.querySelector('.cball.lost') ? 'miss' : (document.querySelector('.results, .over.show, #over.show') ? 'over' : false)), null, { timeout: 14000, polling: 40 }).then(h => h.jsonValue()).catch(() => 'none');

for (const [xp, lvl] of PROFILES){
  const page = await boot(xp); const s = await read(page);
  const th = Object.entries(s.things).filter(e => e[1]).map(e => e[0] + ' ' + e[1]).join(', ') || 'nothing';
  console.log(`\n--- level about ${lvl}: field ${Math.round(s.w)}x${Math.round(s.h)} (${(s.h / s.w).toFixed(2)}), with ${th}; longest task ${Math.round(s.long)}ms`);
  check(s.basket && s.ball && s.cat, 'a ball of yarn, a basket, and a cat in the basket');
  check(!!s.sol, 'the round was built from an answer');
  check(s.drop.off && s.undo.off && s.peekBtn.off, 'Drop, Undo and Peek are not offered before anything is drawn');
  check(s.long < 500, `building the field does not stall the page (${Math.round(s.long)}ms)`);
  check(s.h > 250, `the field is tall enough to play on (${Math.round(s.h)}px)`);
  if (!s.sol){ await page.close(); continue; }
  for (const st of s.sol) await stroke(page, s, st);
  const d = await read(page);
  check(d.lines === s.sol.length && !d.drop.off && !d.undo.off, `${s.sol.length} line${s.sol.length > 1 ? 's are' : ' is'} on the paper and Drop and Undo are offered`);
  check(d.inkFrac > 0.02 && d.inkFrac < 0.75, `the answer leaves chalk over (${Math.round(d.inkFrac * 100)}% left)`);
  await page.locator('.ctool.drop').click({ position: { x: 20, y: 18 } });
  const out = await outcome(page);
  check(out === 'win', `the answer wins (${out})`);
  await page.close();
}

/* the things around it, at a level with a few obstacles */
{
  const page = await boot(12000); let s = await read(page);
  /* Peek: draws where it would go, counts down, and runs out */
  for (const st of s.sol) await stroke(page, s, st);
  s = await read(page);
  const before = s.peekBtn.text;
  await page.locator('.ctool').nth(1).click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(250);
  let p1 = await read(page);
  check(p1.peek.split(' ').length > 8, 'Peek draws where the yarn would go');
  check(p1.peekBtn.text !== before, `Peek counts down (${before} -> ${p1.peekBtn.text})`);
  await page.locator('.ctool').nth(1).click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(150);
  const p2 = await read(page);
  check(p2.peekBtn.off, 'Peek is used up after two');
  /* Undo takes the last line back, and the peek with it */
  await page.locator('.ctool').nth(0).click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(120);
  const u = await read(page);
  check(u.lines === s.sol.length - 1 && u.peek === '', 'Undo takes the last line back and clears the peek');
  for (let i = 1; i < s.sol.length; i++){ await page.locator('.ctool').nth(0).click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(80); }
  const cleared = await read(page);
  check(cleared.lines === 0 && cleared.drop.off && cleared.undo.off, 'Undo all the way leaves an empty paper, and nothing to drop');
  /* a line drawn in two goes is two lines, and still lands the yarn */
  const first = s.sol[0], h = Math.floor(first.length / 2);
  await stroke(page, s, first.slice(0, h + 1)); await stroke(page, s, first.slice(h));
  for (const st of s.sol.slice(1)) await stroke(page, s, st);
  const two = await read(page);
  check(two.lines === s.sol.length + 1, 'a line drawn in two goes is two lines');
  await page.locator('.ctool.drop').click({ position: { x: 20, y: 18 } });
  check((await outcome(page)) === 'win', 'and it still lands the yarn');
  await page.close();
}

/* the chalk runs out */
{
  const page = await boot(12000); const s = await read(page);
  /* the chalk runs out: a long scribble stops at the budget and says so */
  await stroke(page, s, Array.from({ length: 420 }, (_, i) => { const row = Math.floor(i / 42), c = i % 42; return [row % 2 ? 92 - c * 2 : 8 + c * 2, 14 + row * 7]; }));
  /* the bar eases down as the chalk is spent: read it once it has stopped, not mid-way */
  await page.waitForTimeout(500);
  const dry = await read(page);
  check(dry.inkFrac < 0.02 && dry.lowInk, `the chalk runs out (${(dry.inkFrac * 100).toFixed(1)}% left, ${dry.lines} lines, low ${dry.lowInk})`);
  check(/out|plus|acab|alle/i.test(dry.prompt), `and says so (${dry.prompt.trim()})`);
  await page.locator('.ctool').nth(0).click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(120);
  const back = await read(page);
  check(back.lines === 0 && back.inkFrac > 0.95, 'Undo gives the chalk back');
  /* a tap is not a line */
  await page.mouse.click(s.x + s.w / 2, s.y + s.h / 2); await page.waitForTimeout(100);
  const tap = await read(page);
  check(tap.lines === back.lines, 'a tap is not a line');
  await page.close();
}

/* a round with nothing useful drawn is lost on EVERY board: a bumper can send the ball into the basket on its own, and a board like that is not a puzzle */
{
  const results = [];
  for (let k = 0; k < 6; k++){
    const page = await boot(k % 2 ? 12000 : 2000); const s = await read(page);
    /* Drop wants a line drawn, so the least that can be: a short one in the bottom corner, below the basket's mouth, where no ball
       can use it. (A line in the middle of the field is sometimes a real ramp for the board it lands on.) */
    await stroke(page, s, [[96, 97], [93, 97.2], [90, 97.4]]);
    await page.locator('.ctool.drop').click({ position: { x: 20, y: 18 } });
    results.push(await outcome(page));
    await page.close();
  }
  const free = results.filter(r => r === 'win').length;
  check(free === 0, `dropping the ball with only a harmless line drawn never wins (${results.join(', ')})`);
}

/* a round with nothing useful drawn is lost, not stuck */
{
  const page = await boot(2000); const s = await read(page);
  await stroke(page, s, [[96, 97], [93, 97.2], [90, 97.4]]);
  await page.locator('.ctool.drop').click({ position: { x: 20, y: 18 } });
  const out = await outcome(page);
  check(out === 'miss' || out === 'over', `a line that does not help loses the round (${out})`);
  await page.close();
}

/* small screens: the field and the three buttons fit */
for (const vp of [{ width: 320, height: 568 }, { width: 360, height: 640 }]){
  const page = await boot(60000, vp); const s = await read(page);
  const fit = await page.evaluate(() => { const t = document.querySelector('.ctools').getBoundingClientRect(), z = document.getElementById('surface').getBoundingClientRect(); return { tb: t.bottom, sb: z.bottom, tr: t.right, sr: z.right }; });
  check(s.h > 150 && fit.tb <= fit.sb + 1 && fit.tr <= fit.sr + 1, `${vp.width}x${vp.height}: the field is ${Math.round(s.w)}x${Math.round(s.h)} and the buttons sit inside the board`);
  check(!!s.sol, `${vp.width}x${vp.height}: and the round still has an answer`);
  if (s.sol){ for (const st of s.sol) await stroke(page, s, st); await page.locator('.ctool.drop').click({ position: { x: 20, y: 18 } }); check((await outcome(page)) === 'win', `${vp.width}x${vp.height}: and it wins`); }
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nChalk Line plays the way a finger does');
process.exit(bad ? 1 : 0);
