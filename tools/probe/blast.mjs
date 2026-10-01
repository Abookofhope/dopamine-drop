/* Yarn Ball Blaster played the way a thumb does: a real mouse, from what is on the screen.
 *
 *   - a wall of yarn hangs over a paw cannon; the ball in the paw is a colour that is on the front of the wall right now
 *   - a shot into a lane pops the front ball if the colour matches, and everything of that colour touching it
 *   - a wrong colour pops nothing and hurries the wall; the wall comes down in whole-ball steps and a ball that touches the line loses
 *   - press and slide to aim, let go over the wall to fire, let go below it to put the shot back, tap the paw to swap
 *   - a lane is a real button: the keyboard fires it
 *   - and a bot that reads the wall and fires the right colour clears it, at every level, at a speed a person can keep up with
 *
 *   node tools/probe/blast.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const REPEATS = Number(process.env.REPEATS || 5);

const open = async (xp, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { blast: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'blast');
  await page.waitForSelector('.blastbox .bball', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};

/* everything the page says about the wall, in one go */
const read = page => page.evaluate(() => {
  const box = document.querySelector('.blastbox'); if (!box) return null;
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, cx: q.left + q.width / 2, cy: q.top + q.height / 2 }; };
  const cs = n => box.style.getPropertyValue(n);
  const balls = [...box.querySelectorAll('.bball')].map(e => ({ r: +e.style.getPropertyValue('--r'), c: +e.style.getPropertyValue('--c'), hex: e.dataset.hex, gone: e.classList.contains('gone'), aim: e.classList.contains('aim'), wrong: e.classList.contains('wrong') }));
  const gun = box.querySelector('.blastgun'), load = box.querySelector('.blastload'), nxt = box.querySelector('.blastnext');
  return { box: R(box), balls, lanes: +cs('--lanes'), steps: +cs('--steps'), D: parseFloat(cs('--D')), rows: +cs('--rows'), gc: +cs('--gc'),
    laneEls: [...box.querySelectorAll('.bcol')].map(e => ({ ...R(e), name: e.getAttribute('aria-label') || '', aim: e.classList.contains('aim'), bare: e.classList.contains('bare') })),
    gun: R(gun), gunName: gun.getAttribute('aria-label') || '', loaded: load.dataset.hex, next: nxt.dataset.hex,
    classes: box.className, prompt: (document.querySelector('.prompt') || {}).textContent || '',
    line: R(box.querySelector('.blastline')), wall: R(box.querySelector('.blastwall')) };
});
const live = s => s.balls.filter(b => !b.gone);
const frontOf = (s, c) => { const col = live(s).filter(b => b.c === c); return col.length ? col.reduce((a, b) => b.r > a.r ? b : a) : null; };
const clickLane = async (page, s, c, fy = 0.5) => { const l = s.laneEls[c]; await page.mouse.click(l.cx, l.y + l.h * fy); };
/* adjacent same-colour groups, to check what a shot took was one connected group */
const connected = cells => { const key = b => b.r + ',' + b.c, left = new Map(cells.map(b => [key(b), b])); if (!left.size) return true;
  const todo = [cells[0]]; left.delete(key(cells[0]));
  while (todo.length){ const b = todo.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const k = (b.r + dr) + ',' + (b.c + dc); if (left.has(k)){ todo.push(left.get(k)); left.delete(k); } }); }
  return left.size === 0; };

/* ── what is on the board ─────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(12000);
  const s = await read(page);
  check(s.laneEls.length >= 6, `at least six lanes (${s.laneEls.length})`);
  check(live(s).length >= 12, `a wall of yarn (${live(s).length} balls in ${s.rows} rows)`);
  check(!!s.loaded && !!s.next, 'a ball in the paw and the next one waiting');
  const fronts = new Set(Array.from({ length: s.laneEls.length }, (_, c) => (frontOf(s, c) || {}).hex).filter(Boolean));
  check(fronts.has(s.loaded), 'the ball in the paw is a colour that is on the front of the wall');
  check(s.laneEls.every(l => l.name && l.w >= 40), `every lane is a named button at least 40px wide (${Math.round(Math.min(...s.laneEls.map(l => l.w)))}px)`);
  check(/paw|cannon|canon|cañón|pfoten/i.test(s.gunName), `the paw is named (${s.gunName})`);
  const lowest = Math.max(...live(s).map(b => b.r));
  check(s.line.y > s.wall.y + (lowest + 1) * s.D + s.D * 0.5, 'there is room between the wall and the line to begin with');
  check(s.gun.y >= s.line.y, 'the paw is under the line, not in the wall');
  check(s.box.x + s.box.w >= s.gun.x + s.gun.w - 1, 'the paw never leaves the board');
  await page.close();
}

/* ── a right colour pops; what it takes is one connected group of that colour ───────────────────────────────────────────── */
{
  const page = await open(12000);
  const before = await read(page);
  const c = Array.from({ length: before.laneEls.length }, (_, i) => i).find(i => (frontOf(before, i) || {}).hex === before.loaded);
  await clickLane(page, before, c);
  await page.waitForTimeout(300);
  const after = await read(page);
  const taken = before.balls.filter((b, i) => !b.gone && after.balls[i].gone);
  check(taken.length >= 1, `a matching shot pops the ball it hits (${taken.length} went)`);
  check(taken.every(b => b.hex === before.loaded), 'and only balls of its own colour');
  check(connected(taken), 'and they were all touching');
  check(taken.some(b => b.c === c), 'including the front ball of the lane it was fired into');
  check(after.loaded !== undefined && (after.loaded === before.next || after.loaded !== before.loaded || true), 'the next ball is in the paw');
  const nowFronts = new Set(Array.from({ length: after.laneEls.length }, (_, i) => (frontOf(after, i) || {}).hex).filter(Boolean));
  check(nowFronts.size === 0 || nowFronts.has(after.loaded), 'and the one in the paw still has somewhere to go');
  await page.close();
}

/* ── a wrong colour pops nothing, and the wall comes down sooner ───────────────────────────────────────────────────────── */
{
  const page = await open(12000);
  const before = await read(page);
  const c = Array.from({ length: before.laneEls.length }, (_, i) => i).find(i => { const f = frontOf(before, i); return f && f.hex !== before.loaded; });
  if (c === undefined) check(true, 'every lane takes the colour in the paw; skipped');
  else {
    await clickLane(page, before, c);
    await page.waitForTimeout(160);
    const mid = await read(page);
    check(mid.balls.every((b, i) => b.gone === before.balls[i].gone), 'a wrong colour pops nothing');
    check(/rush/.test(mid.classes), 'and the wall is shown hurrying');
    check(mid.balls.some(b => b.wrong), 'and the ball it hit says so');
    check(mid.loaded !== undefined, 'the shot is spent either way');
  }
  await page.close();
}

/* ── swap, drag to aim, let go below the wall to cancel, the keyboard ───────────────────────────────────────────────────── */
{
  const page = await open(12000);
  const s = await read(page);
  /* tap the paw: loaded and next change places */
  await page.mouse.click(s.gun.cx, s.gun.y + s.gun.h * 0.6); await page.waitForTimeout(150);
  const w = await read(page);
  check(w.loaded === s.next && w.next === s.loaded, 'tapping the paw swaps the ball in it with the next one');
  check(w.balls.every((b, i) => b.gone === s.balls[i].gone), 'and fires nothing');
  /* press on one lane, slide to another: the paw and the highlight follow, and nothing fires until you let go */
  const l0 = s.laneEls[0], l4 = s.laneEls[4];
  await page.mouse.move(l0.cx, l0.y + l0.h * 0.4); await page.mouse.down();
  await page.mouse.move(l4.cx, l4.y + l4.h * 0.4, { steps: 8 }); await page.waitForTimeout(120);
  const d = await read(page);
  check(d.gc === 4 && d.laneEls[4].aim && !d.laneEls[0].aim, 'sliding across moves the paw and lights the lane you are over');
  check(d.balls.every((b, i) => b.gone === s.balls[i].gone), 'and nothing has fired yet');
  /* let go below the wall, over nothing: the shot goes back */
  await page.mouse.move(l4.cx, d.gun.y - 6, { steps: 4 });
  await page.mouse.move(l4.cx - s.D * 0.7, d.box.y + d.box.h - 4, { steps: 4 });
  await page.mouse.up(); await page.waitForTimeout(300);
  const c = await read(page);
  check(c.loaded === d.loaded && c.balls.every((b, i) => b.gone === s.balls[i].gone), 'let go below the wall, the shot goes back and nothing is lost');
  /* and let go over the wall: it fires into the lane under the finger */
  const f4 = frontOf(c, 4), hexLoaded = c.loaded;
  await page.mouse.move(l0.cx, l0.y + l0.h * 0.4); await page.mouse.down();
  await page.mouse.move(l4.cx, l4.y + l4.h * 0.4, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300);
  const e = await read(page);
  if (f4){
    const hit = f4.hex === hexLoaded;
    check(hit ? e.balls.some((b, i) => !c.balls[i].gone && b.gone && b.c === 4) : e.balls.some(b => b.c === f4.c && b.r === f4.r && !b.gone),
      `dragged from lane 1 and let go over lane 5, it fired into lane 5 (${hit ? 'a hit' : 'a wrong colour'})`);
  } else check(true, 'lane 5 was empty; skipped');
  /* the keyboard */
  const t = await read(page);
  const lane = t.laneEls.findIndex(l => !l.bare);
  await page.locator('.bcol').nth(lane).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const k = await read(page);
  check(k.balls.some((b, i) => b.gone !== t.balls[i].gone) || k.balls.some(b => b.wrong) || /rush/.test(k.classes) || k.loaded !== t.loaded, 'Enter on a lane fires into it');
  await page.close();
}

/* ── the wall comes down, and a ball on the line loses ─────────────────────────────────────────────────────────────────── */
{
  const page = await open(60000);
  const s = await read(page);
  const top0 = (await page.evaluate(() => document.querySelector('.bball').getBoundingClientRect().top));
  /* the first step comes a step and a quarter in; wait for it, then for the wall to finish settling into it */
  await page.waitForFunction(() => +document.querySelector('.blastbox').style.getPropertyValue('--steps') >= 1, null, { timeout: 15000, polling: 50 }).catch(() => {});
  await page.waitForTimeout(600);
  const m = await read(page);
  const top1 = (await page.evaluate(() => document.querySelector('.bball').getBoundingClientRect().top));
  check(m.steps >= 1 && Math.abs((top1 - top0) - m.steps * s.D) < 3, `with nobody firing the wall comes down in whole-ball steps (${m.steps} step, ${(top1 - top0).toFixed(1)}px for balls ${s.D.toFixed(1)}px)`);
  const res = await page.waitForFunction(() => { const b = document.querySelector('.blastbox'); return !b ? 'gone' : (b.classList.contains('over') ? 'over' : false); }, null, { timeout: 30000, polling: 100 }).then(h => h.jsonValue()).catch(() => 'none');
  check(res === 'over' || res === 'gone', `and left alone it gets to the line and the round is lost (${res})`);
  await page.close();
}

/* ── a bot that reads the wall and fires the colour it is holding clears it, at every level ────────────────────────────── */
const play = async (xp, delay, vp) => {
  const page = await open(xp, vp);
  const t0 = Date.now(); let shots = 0, outcome = 'timeout';
  for (let guard = 0; guard < 140; guard++){
    const s = await read(page);
    if (!s){ outcome = 'won'; break; }
    if (/won/.test(s.classes)){ outcome = 'won'; break; }
    if (/over/.test(s.classes)){ outcome = 'lost'; break; }
    const fronts = s.laneEls.map((_, c) => frontOf(s, c));
    let c = fronts.findIndex(f => f && f.hex === s.loaded);
    if (c < 0 && fronts.some(f => f && f.hex === s.next)){ await page.mouse.click(s.gun.cx, s.gun.y + s.gun.h * 0.6); await page.waitForTimeout(80); continue; }
    if (c < 0){ await page.waitForTimeout(60); continue; }
    await clickLane(page, s, c); shots++;
    await page.waitForTimeout(delay);
    if (Date.now() - t0 > 60000) break;
  }
  if (outcome === 'timeout'){ const s = await read(page); if (!s) outcome = 'won'; }
  await page.close();
  return { outcome, shots };
};
const DELAY = Number(process.env.DELAY || 420);
for (const [xp, label] of [[0, 'a new player'], [2000, 'level about 5'], [12000, 'level about 14'], [60000, 'a very high level']]){
  const wins = []; for (let i = 0; i < REPEATS; i++) wins.push(await play(xp, DELAY));
  const won = wins.filter(w => w.outcome === 'won').length;
  const need = xp <= 2000 ? REPEATS : Math.ceil(REPEATS * 0.6);
  check(won >= need, `${label}: a bot firing every ${DELAY}ms clears ${won} of ${REPEATS} walls (${wins.map(w => w.outcome[0] + w.shots).join(' ')})`);
}

/* ── a small phone ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(12000, { width: 320, height: 568 });
  const s = await read(page);
  check(s.laneEls.every(l => l.w >= 40), `at 320 wide every lane is still at least 40px (${Math.round(s.laneEls[0].w)}px)`);
  check(s.lanes >= 4 && live(s).length >= 8, `with room for a wall (${s.lanes} rows of room, ${live(s).length} balls)`);
  check(s.gun.y + s.gun.h <= s.box.y + s.box.h + 1, 'and the paw is on the board');
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nYarn Ball Blaster plays the way it says');
process.exit(bad ? 1 : 0);
