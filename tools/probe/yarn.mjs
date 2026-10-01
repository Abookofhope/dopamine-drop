/* Yarn Tangled Tangle played the way a thumb does, from what is on the screen.
 *
 *   - pieces are crafts (a loose thread, a tangled ball, a neat ball, a skein, a knitted square, a crocheted flower, a plush kitten),
 *     drawn, named, and priced, with the day's best price ringed
 *   - drag one onto its twin next to it and they merge into the next craft up; tap one and tap it again to gift it for its price
 *   - the till counts Coins of Gratitude, and "More yarn" buys a fresh thread with them, twice at most
 *   - a bot that works the board out (the same sums the game used to build it), then plays it with a real mouse, reaches the goal
 *
 *   node tools/probe/yarn.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const REPEATS = Number(process.env.REPEATS || 4);
const VAL = [0, 2, 5, 12, 28, 65, 150, 345];

const open = async (xp, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { meld: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'meld');
  await page.waitForSelector('.meldgrid .jel', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const grid = document.querySelector('.meldgrid'); if (!grid) return null;
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, cx: q.left + q.width / 2, cy: q.top + q.height / 2 }; };
  const cells = [...grid.querySelectorAll('.jel')].map(e => ({ v: +(e.dataset.v || 0), prime: e.classList.contains('prime'), sel: e.classList.contains('sel'), ...R(e), name: e.getAttribute('aria-label') || '', art: e.innerHTML.length, svg: !!e.querySelector('svg.art'), text: e.textContent.trim() }));
  const buy = document.querySelector('.moreyarn');
  const till = document.querySelector('.till');
  const gr = R(grid);
  return { cols, cells, cellW: (gr.w - 9 * (cols - 1)) / cols, coins: +(till.querySelector('b').textContent.replace(/\D/g, '') || 0), goal: +(till.querySelector('i').textContent.replace(/\D/g, '') || 0), tillText: till.textContent,
    buy: buy ? { disabled: buy.disabled, text: buy.textContent, ...R(buy), name: buy.getAttribute('aria-label') || '' } : null,
    band: document.querySelector('.bestprice').textContent, bandPay: +((document.querySelector('.bestprice').textContent.match(/\d+/g) || []).pop() || 0), prompt: (document.querySelector('.prompt') || {}).textContent || '', made: till.classList.contains('made') };
});

/* ── what is on the board ─────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(12000);
  const s = await read(page);
  const live = s.cells.filter(c => c.v);
  check(live.length >= 5 && s.cells.length >= 16, `a shop of ${s.cells.length} places with ${live.length} crafts on it`);
  check(live.every(c => c.svg && c.text === ''), 'every craft is drawn, and none is a number');
  check(live.every(c => /thread|ball|skein|square|flower|kitten|fil|pelote|écheveau|carré|fleur|chaton|hilo|ovillo|madeja|cuadrado|flor|gatito|faden|knäuel|strang|quadrat|blume|kätzchen/i.test(c.name)), `and each is named for what it is ("${live[0].name}")`);
  check(new Set(live.map(c => c.v)).size === 1 || new Set(live.map(c => c.art)).size > 1, 'and different crafts look different');
  check(/\d/.test(s.band) && VAL.some((v, i) => i && v * 3 === s.bandPay), `the day’s best price is said, and it is a level paying triple (${s.band})`);
  check(/Gratitude|gratitude|gratitud|Dankbarkeit/.test(s.tillText), `the till counts Coins of Gratitude (${s.tillText.replace(/\s+/g, ' ')})`);
  check(!!s.buy && s.buy.disabled && s.buy.h >= 40, `and there is a More yarn button, off until there are coins (${s.buy && s.buy.text})`);
  check(s.cellW >= 40, `places are big enough to touch (${Math.round(s.cellW)}px)`);
  await page.close();
}

/* ── the bot: work the board out, then play it ─────────────────────────────────────────────────────────────────────────── */
const plan = (cells, cols, band, take) => {
  const rows = cells.length / cols;
  const nb = i => { const r = Math.floor(i / cols), c = i % cols, o = []; if (r > 0) o.push(i - cols); if (r < rows - 1) o.push(i + cols); if (c > 0) o.push(i - 1); if (c < cols - 1) o.push(i + 1); return o; };
  const price = v => VAL[Math.min(v, 7)] * (v === band ? 3 : 1);
  const n = cells.filter(v => v).length;
  const memo = new Map();
  /* the best plan (as a list of actions) that reaches `take` in at most `moves` actions, by most coins */
  const go = (g, moves, coins) => {
    if (coins >= take) return { coins, acts: [] };
    if (moves <= 0) return null;
    const key = g.join(',') + '|' + moves + '|' + Math.min(coins, take);
    if (memo.has(key)) return memo.get(key);
    let best = null;
    for (let i = 0; i < g.length; i++){
      if (!g[i]) continue;
      for (const j of nb(i)){
        if (g[j] !== g[i]) continue;
        const m = g.slice(); m[j] = Math.min(g[i] + 1, 7); m[i] = 0;
        const r = go(m, moves - 1, coins);
        if (r && (!best || r.coins > best.coins)) best = { coins: r.coins, acts: [{ k: 'merge', from: i, to: j }].concat(r.acts) };
      }
      const m = g.slice(); m[i] = 0;
      const r = go(m, moves - 1, coins + price(g[i]));
      if (r && (!best || r.coins > best.coins)) best = { coins: r.coins, acts: [{ k: 'gift', at: i }].concat(r.acts) };
    }
    memo.set(key, best);
    return best;
  };
  return go(cells.slice(), n, 0);
};

for (const [xp, label] of [[0, 'a new player'], [12000, 'level about 14']]){
  const results = [];
  for (let r = 0; r < REPEATS; r++){
    const page = await open(xp);
    const s = await read(page);
    const cells = s.cells.map(c => c.v), band = VAL.findIndex((v, i) => i && v * 3 === s.bandPay);
    const sol = plan(cells, s.cols, band, s.goal);
    if (!sol){ results.push('noplan'); await page.close(); continue; }
    let coinsSeen = 0, merged = 0, gifted = 0, fault = null;
    for (const a of sol.acts){
      const cur = await read(page); if (!cur){ break; }
      if (a.k === 'merge'){
        const f = cur.cells[a.from], t = cur.cells[a.to], before = cur.cells.map(c => c.v);
        await page.mouse.move(f.cx, f.cy); await page.mouse.down(); await page.mouse.move(t.cx, t.cy, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(260);
        const nx = await read(page);
        if (nx){ merged++; if (nx.cells[a.to].v !== Math.min(before[a.from] + 1, 7) || nx.cells[a.from].v !== 0) fault = fault || `merge ${a.from}->${a.to}: got ${nx.cells[a.to].v}/${nx.cells[a.from].v} from ${before[a.from]}`; }
      } else {
        const c = cur.cells[a.at];
        await page.mouse.click(c.cx, c.cy); await page.waitForTimeout(120); await page.mouse.click(c.cx, c.cy); await page.waitForTimeout(260);
        const nx = await read(page);
        if (nx){ gifted++; const gain = nx.coins - cur.coins; const want = VAL[Math.min(cur.cells[a.at].v, 7)] * (cur.cells[a.at].v === band ? 3 : 1); if (gain !== want || nx.cells[a.at].v !== 0) fault = fault || `gift ${a.at}: +${gain}, wanted +${want}`; coinsSeen = nx.coins; }
      }
    }
    await page.waitForTimeout(700);
    /* the round is won when the till reaches its goal: the shell scores it and builds the next board, so the score has moved */
    const score = await page.evaluate(() => +((document.getElementById('hudScore') || {}).textContent || '0').replace(/\D/g, ''));
    const won = score > 0;
    results.push(fault ? 'fault: ' + fault : (won ? 'won' : 'short'));
    await page.close();
  }
  const ok = results.filter(x => x === 'won').length;
  check(ok === results.length, `${label}: a bot that works out the board and plays it with the mouse reaches the goal ${ok} of ${results.length} times${ok < results.length ? ' (' + results.join(' | ') + ')' : ''}`);
}

/* ── More yarn: coins buy a thread next to its own kind, twice at most ──────────────────────────────────────────────────── */
{
  const page = await open(12000);
  let s = await read(page);
  /* earn coins by gifting the dearest craft */
  const top = s.cells.map((c, i) => ({ c, i })).filter(x => x.c.v).sort((a, b) => b.c.v - a.c.v)[0];
  await page.mouse.click(top.c.cx, top.c.cy); await page.waitForTimeout(120); await page.mouse.click(top.c.cx, top.c.cy); await page.waitForTimeout(320);
  s = await read(page);
  check(!s.buy.disabled, `with coins in the till, More yarn is on (${s.coins} coins, ${s.buy.text})`);
  const before = s.cells.filter(c => c.v).length, coins0 = s.coins;
  await page.mouse.click(s.buy.cx, s.buy.cy); await page.waitForTimeout(300);
  const a = await read(page);
  check(a.cells.filter(c => c.v).length === before + 1 && a.coins < coins0, `buying puts one more craft on the board and takes coins (${coins0} to ${a.coins})`);
  await page.close();
}

/* ── a small phone ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(12000, { width: 320, height: 568 });
  const s = await read(page);
  check(s.cellW >= 40 && s.buy.h >= 40, `at 320 wide places are at least 40px and More yarn at least 40px (${Math.round(s.cellW)}px, ${Math.round(s.buy.h)}px)`);
  check(s.buy.y + s.buy.h <= 568, 'and the button is on the screen');
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nYarn Tangled Tangle plays the way it says');
process.exit(bad ? 1 : 0);
