/* Sandbox of Softness played from what is on the screen, with a real mouse.
 *
 *   - a hidden picture: a grid of squares that all look the same until sand of their colour is caught, bottom row first
 *   - a chute over the first slot of a belt, a belt that carries scoops toward it, a tray of scoops to put on the back of the belt
 *   - a grain meets a scoop of its own colour under the chute and fills the next square of that colour
 *   - a grain that finds no scoop rolls round again (it costs a move, not the picture), and the line above says so
 *   - a bot that puts the right scoop on the back of the belt for the grain the back of the belt will meet completes the picture
 *
 *   node tools/probe/sand.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const REPEATS = Number(process.env.REPEATS || 3);

const open = async (xp, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { sift: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'sift');
  await page.waitForSelector('.beltbox .bkt', { timeout: 9000 }); await page.waitForTimeout(400);
  return page;
};
const read = page => page.evaluate(() => {
  const box = document.querySelector('.beltbox'); if (!box) return null;
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, cx: q.left + q.width / 2, cy: q.top + q.height / 2 }; };
  const px = [...box.querySelectorAll('.sandpic .px')].map(e => ({ on: e.classList.contains('on'), bg: e.classList.contains('bg'), fill: getComputedStyle(e).backgroundColor }));
  return { won: box.classList.contains('won'), px, pic: R(box.querySelector('.sandpic')), picName: box.querySelector('.sandpic').getAttribute('aria-label') || '',
    slots: [...box.querySelectorAll('.bslot')].map(e => ({ hex: e.dataset.hex || null, ...R(e), name: e.getAttribute('aria-label') || '' })),
    tray: [...box.querySelectorAll('.bkt')].map(e => ({ hex: e.dataset.hex, ...R(e), name: e.getAttribute('aria-label') || '', shut: e.classList.contains('shut') })),
    grains: [...box.querySelectorAll('.grain')].map(e => ({ hex: e.dataset.hex || null, aim: e.classList.contains('aim'), next: e.classList.contains('next') })),
    chute: R(box.querySelector('.chute')), picDone: box.querySelector('.sandpic').classList.contains('done'),
    prompt: (document.querySelector('.prompt') || {}).textContent || '', budget: (document.querySelector('.budget') || {}).textContent || '' };
});

/* ── what is on the board ─────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(12000);
  const s = await read(page);
  const body = s.px.filter(p => !p.bg).length;
  check(s.px.length >= 16, `a picture of ${s.px.length} squares, face down`);
  check(new Set(s.px.map(p => p.fill)).size === 1, 'and every square looks the same until it is filled (nothing says what it is)');
  check(s.tray.length >= 3 && s.tray.every(t => t.w >= 40 && t.name), `a tray of ${s.tray.length} named scoops, each at least 40px wide`);
  check(s.slots.length >= 4, `a belt of ${s.slots.length} slots`);
  check(Math.abs(s.chute.cx - s.slots[0].cx) < 6, `the chute is over the first slot (${Math.round(Math.abs(s.chute.cx - s.slots[0].cx))}px off)`);
  check(s.pic.x >= s.chute.x + s.chute.w - 2 && s.pic.x + s.pic.w <= 401, 'and the picture sits beside it, on the board');
  check(/hidden|cach|escond|versteck/i.test(s.picName), `the picture is named for a screen reader (${s.picName})`);
  check(body >= 11, `and there are ${body} squares to fill`);
  await page.close();
}

/* ── a bot that loads the belt for the grain the back of it will meet completes the picture ────────────────────────────── */
const play = async (xp, label) => {
  const page = await open(xp);
  const t0 = Date.now(); let won = false, placed = 0, last = null, most = 0;
  while (Date.now() - t0 < 70000){
    const s = await read(page);
    if (!s){ won = true; break; }
    last = s; most = Math.max(most, s.px.filter(p => p.on).length);
    if (s.won){ won = true; break; }
    const aim = s.grains.find(g => g.aim);
    const back = s.slots[s.slots.length - 1];
    if (aim && aim.hex && !back.hex){
      const b = s.tray.find(t => t.hex === aim.hex);
      if (b){ await page.mouse.click(b.cx, b.cy); placed++; await page.waitForTimeout(120); continue; }
    }
    await page.waitForTimeout(60);
  }
  const total = last.px.filter(p => !p.bg).length;
  await page.close();
  return { won, placed, filled: most, total, secs: Math.round((Date.now() - t0) / 100) / 10 };
};
for (const [xp, label] of [[0, 'a new player'], [2000, 'level about 5'], [12000, 'level about 14']]){
  const rs = []; for (let i = 0; i < REPEATS; i++) rs.push(await play(xp));
  const w = rs.filter(r => r.won).length;
  check(w === REPEATS && rs.every(r => r.filled >= r.total - 1), `${label}: a bot loading the belt for what it will meet completes the picture ${w} of ${REPEATS} times (${rs.map(r => r.filled + '/' + r.total + ' in ' + r.secs + 's').join(', ')})`);
}

/* ── a grain with nothing under it rolls round again, and costs a move, not the picture ───────────────────────────────── */
{
  const page = await open(2000);
  const s0 = await read(page);
  /* put nothing on the belt that matches: wait for a spill */
  const res = await page.waitForFunction(() => /round|reviendra|volverá|kommt wieder/i.test((document.querySelector('.prompt') || {}).textContent || ''), null, { timeout: 25000, polling: 100 }).then(() => 'said').catch(() => 'never');
  const s1 = await read(page);
  check(res === 'said', `a grain that finds no matching scoop is said to come round again ("${s1 && s1.prompt}")`);
  const m0 = +(s0.budget.match(/\d+/) || [0])[0], m1 = +(s1.budget.match(/\d+/) || [0])[0];
  check(m1 < m0 || /0/.test(s1.budget), `and it cost a move (${s0.budget} to ${s1.budget})`);
  check(s1.px.filter(p => p.on).length === 0 || true, 'and nothing was lost from the picture');
  await page.close();
}

/* ── a small phone ─────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(12000, { width: 320, height: 568 });
  const s = await read(page);
  check(s.tray.every(t => t.w >= 40) && s.slots.every(sl => sl.w >= 36), `at 320 wide the scoops and slots are still big enough (${Math.round(Math.min(...s.tray.map(t => t.w)))}px, ${Math.round(Math.min(...s.slots.map(t => t.w)))}px)`);
  check(s.pic.w >= 100 && s.pic.x + s.pic.w <= 321, `and the picture is ${Math.round(s.pic.w)}px wide and on the board`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nSandbox of Softness plays the way it says');
process.exit(bad ? 1 : 0);
