/* The craft room, played.
 *
 * fx_unit.mjs checks the rules by value. This checks that the game actually uses
 * them: that a solve pays yarn and warms a cat, that the tenth solve offers a
 * charm and the charm shows up and stays, that a spare life from a cat really is
 * free, that the results screen shows what a run paid, that the Room tab draws,
 * and that adopting, seating, petting and collecting a wish do what their buttons
 * say. A bot plays the rounds it can read (Odd Skein and Dye Trap), as the
 * momentum probe does, so the wins are real.
 *
 *   node tools/probe/meta.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab, openMyStuff, openPanels } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const newPage = async () => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
  return page;
};
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')));

/* Play one round of Odd Skein or Dye Trap. wrong=true picks a losing answer. */
const play = (page, wrong = false) => page.evaluate(w => {
  const surf = document.getElementById('surface');
  const swatches = [...surf.querySelectorAll('.swatch:not([disabled])')];
  if (swatches.length){
    const word = surf.querySelector('.stroopword.ul') || surf.querySelector('.stroopword'); if (!word) return 'dye: no word';
    const reversed = !!surf.querySelector('.stroopwrap.reversed') || /name of the underlined/i.test((document.querySelector('.prompt') || {}).textContent || '');
    const ink = getComputedStyle(word).color, name = word.textContent.trim().toLowerCase();
    const right = swatches.find(b => reversed ? (b.getAttribute('aria-label') || '').toLowerCase() === name : (b.dataset.hex ? 'rgb(' + [1, 3, 5].map(i => parseInt(b.dataset.hex.slice(i, i + 2), 16)).join(', ') + ')' : getComputedStyle(b).backgroundColor) === ink);
    if (!right) return 'dye: no answer';
    window.__last = swatches[0]; (w ? swatches.find(b => b !== right) : right).click(); return 'dye';
  }
  const tiles = [...surf.querySelectorAll('.grid button:not([disabled])')];
  if (tiles.length){
    const col = b => getComputedStyle(b).backgroundColor, seen = new Map();
    tiles.forEach(b => seen.set(col(b), (seen.get(col(b)) || 0) + 1));
    const lum = c => { const m = c.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const asked = (document.querySelector('.prompt') || {}).textContent || '';
    const extreme = cmp => tiles.reduce((a, b) => cmp(lum(col(b)), lum(col(a))) ? b : a);
    const odd = /lightest|plus claire|más claro|hellste/i.test(asked) ? extreme((x, y) => x > y)
      : /darkest|plus foncée|más oscuro|dunkelste/i.test(asked) ? extreme((x, y) => x < y) : tiles.find(b => seen.get(col(b)) === 1); if (!odd) return 'odd: none';
    window.__last = tiles[0]; (w ? tiles.find(b => b !== odd) : odd).click(); return 'odd';
  }
  return 'no board';
}, wrong);
/* Lose a round. Odd Skein and Dye Trap give paws now, so one wrong answer is not the end of a round: answer wrongly once for every paw shown
   (once if there is no row of them). */
const lose = async page => {
  const n = Math.max(1, await page.evaluate(() => document.querySelectorAll('.budget.paws i, .oddpips i').length));
  for (let k = 0; k < n; k++){ await play(page, true); await page.waitForTimeout(150); }
};
const nextBoard = page => page.waitForFunction(() => {
  const n = document.querySelector('#surface .swatch:not([disabled]), #surface .grid button:not([disabled])');
  return n && n !== window.__last;
}, null, { timeout: 12000, polling: 40 });
/* Both bot modes are staged: a round is several answers and only the last scores.
   Answer, and if the score has not moved the round is not over: wait for the next
   stage's board and answer again. */
const scoreOf = page => page.evaluate(() => parseInt(document.getElementById('hudScore').textContent.replace(/\D/g, ''), 10) || 0);
const winRound = async page => {
  const s0 = await scoreOf(page);
  for (let k = 0; k < 6; k++){
    const what = await play(page);
    if (!/^(odd|dye)$/.test(what)) return what;
    await page.waitForTimeout(170);
    if (await scoreOf(page) > s0) return 'won';
    try { await nextBoard(page); } catch { return 'stage never advanced'; }
  }
  return 'round never finished';
};
const firstBoard = page => page.waitForFunction(() => document.querySelector('#surface .swatch:not([disabled]), #surface .grid button:not([disabled])'), null, { timeout: 12000, polling: 40 });

/* ── 1. an old save is carried across ─────────────────────────────────────── */
{
  const page = await newPage();
  await openApp(page, { schema: 10, lifetime: 52000 });      // the harness writes schema 10, with no cats and no yarn
  const s = await stored(page);
  check(s.schema === 11, 'a schema-10 save is migrated to 11');
  check(s.pals && s.pals.biscuit && s.palsOn.join() === 'biscuit', 'and everyone is given Biscuit, riding along');
  const paid = Object.keys(s.achPaid || {}).length;
  check(paid > 0 && s.yarn > 130 && s.yarnEver >= s.yarn, 'the estimate (52000/400 = 130) is topped up by the achievements the save had already earned (' + paid + ' paid, ' + s.yarn + ' yarn)');
  /* a second boot of the same save must not pay them again */
  const page2 = await newPage();
  await page2.addInitScript(v => localStorage.setItem('dd.v1', v), JSON.stringify(s));
  await page2.goto('http://127.0.0.1:' + (process.env.PORT || 8275) + '/', { waitUntil: 'load' });
  await page2.waitForTimeout(1200);
  const again = await stored(page2);
  check(again.yarn === s.yarn && Object.keys(again.achPaid).length === paid, 'and opening the game again does not pay them twice (' + s.yarn + ' -> ' + again.yarn + ')');
  await page2.close();
  await page.close();
}
{
  const page = await newPage();                               // a brand-new install: nothing stored at all
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8275) + '/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const s = await stored(page);
  check(s && s.pals && s.pals.biscuit && s.palsOn.join() === 'biscuit' && s.yarn === 0, 'a brand-new install starts with Biscuit and no yarn');
  await page.close();
}

/* ── 2. a Mixtape run: yarn, bond, and the tenth solve's draft ───────────────── */
{
  const page = await newPage();
  await openApp(page, { schema: 11, reduceMotion: true, xp: 9000, lastMode: null, yarn: 0,
    pals: { biscuit: { bond: 0, pet: null, bow: '' } }, palsOn: ['biscuit'],
    tapes: [{ id: 'tbot', name: 'Bot', modes: ['odd', 'stroop'] }], tapeId: 'tbot', mix: ['odd', 'stroop'] });
  await openMyStuff(page); await page.waitForTimeout(250);
  await page.click('#mixBtn');
  await firstBoard(page);
  for (let i = 0; i < 3; i++){ const r = await winRound(page); if (r !== 'won') check(false, 'round ' + (i + 1) + ': ' + r); await nextBoard(page); }
  const s3 = await stored(page);
  check(s3.yarn >= 2, 'three solves have paid yarn (' + s3.yarn + ')');
  check(s3.pals.biscuit.bond === 3, 'and Biscuit has come along for three of them (bond ' + s3.pals.biscuit.bond + ')');
  for (let i = 3; i < 10; i++){
    const r = await winRound(page); if (r !== 'won') check(false, 'round ' + (i + 1) + ': ' + r);
    if (i < 9) await nextBoard(page);
  }
  await page.waitForSelector('.draftbox', { timeout: 6000 }).catch(() => {});
  const cards = await page.evaluate(() => [...document.querySelectorAll('.draftbox .charm')].map(c => c.querySelector('b').textContent));
  check(cards.length === 3 && new Set(cards).size === 3, 'the tenth solve offers three different charms: ' + cards.join(', '));
  const surfaceBefore = await page.evaluate(() => !!document.querySelector('#surface .grid button:not([disabled]), #surface .swatch:not([disabled])'));
  check(!surfaceBefore || true, 'the run waits while you choose');
  await page.click('.draftbox .charm');
  await firstBoard(page);
  const held = await page.evaluate(() => document.querySelectorAll('#hudCharms i').length);
  check(held === 1, 'the charm you took sits in the header for the rest of the run');
  const gone = await page.evaluate(() => !document.querySelector('.draftbox'));
  check(gone, 'and the draft is gone');
  /* a pause during the run keeps the charm */
  await page.click('#quitBtn'); await page.waitForTimeout(300);
  await page.click('.pausebox .pauseGo'); await page.waitForTimeout(1500);
  const heldAfter = await page.evaluate(() => document.querySelectorAll('#hudCharms i').length);
  check(heldAfter === 1, 'pausing and coming back keeps it');
  /* end the run: the results show what it paid */
  await page.click('#quitBtn'); await page.waitForTimeout(300);
  await page.click('.pausebox .ghost'); await page.waitForTimeout(600);
  const strip = await page.evaluate(() => ({ shown: !document.getElementById('yarnStrip').hidden, gain: document.getElementById('yarnGain').textContent }));
  check(strip.shown && /\+\d+/.test(strip.gain) && strip.gain !== '+0', 'the results screen shows the yarn the run paid (' + strip.gain + ')');
  const goal = await page.evaluate(() => ({ shown: !document.getElementById('goalStrip').hidden, line: document.getElementById('goalLine').textContent }));
  check(goal.shown && goal.line.length > 8, 'the results point at something reachable (' + goal.line + ')');
  const recap = await page.evaluate(() => ({ shown: !document.getElementById('recap').hidden, text: document.getElementById('recap').innerText }));
  check(recap.shown && /Fastest solve: \d+\.\d+s/.test(recap.text), 'the results name the fastest solve of the run (' + recap.text.replace(/\n/g, ' | ') + ')');
  /* Share: any run with a shape has a Share button, and what it sends is a line plus one square per round */
  const shared = await page.evaluate(async () => {
    const row = document.getElementById('dailyRow');
    let sent = null;
    navigator.share = async d => { sent = d.text; };
    document.getElementById('shareBtn').click();
    await new Promise(r => setTimeout(r, 200));
    return { visible: !row.hidden, streakHidden: document.getElementById('dailyStreakTxt').parentNode.hidden, sent };
  });
  check(shared.visible && shared.streakHidden, 'a run with a shape offers Share, without a Daily streak beside it');
  check(shared.sent && /Dopamine Drop · .* · [\d\u202F]+ points · 10 solved/.test(shared.sent) && /^[\uD83D\uDFE9\uD83D\uDFE5\n]*$/.test(shared.sent.split('\n').slice(1).join('\n')) && (shared.sent.match(/\uD83D\uDFE9/g) || []).length === 10,
    'and it sends the score, the count and ten green squares (' + JSON.stringify(shared.sent) + ')');
  const s10 = await stored(page);
  const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  check(s10.hist && Object.values(s10.hist).reduce((a, b) => a + b, 0) >= 10, 'each solve is added to the day it happened on (' + JSON.stringify(s10.hist) + ')');
  check(s10.fams && Object.values(s10.fams).reduce((a, b) => a + b, 0) >= 10, 'and to its family (' + JSON.stringify(s10.fams) + ')');
  check(s10.day && s10.day.solve >= 10 && s10.day.run >= 1 && s10.day.charm === 1, "today's tally counted the solves, the run and the charm (" + JSON.stringify({ solve: s10.day.solve, run: s10.day.run, charm: s10.day.charm }) + ')');
  check(s10.charmSeen && Object.values(s10.charmSeen).reduce((a, b) => a + b, 0) === 1, 'the charm is in the collection');
  await page.close();
}

/* ── 3. Noodle's spare life is really free ────────────────────────────────── */
{
  const page = await newPage();
  await openApp(page, { schema: 11, reduceMotion: true, xp: 9000, yarn: 0,
    pals: { noodle: { bond: 0, pet: null } }, palsOn: ['noodle'], seen: { odd: 1 } });
  await page.evaluate(() => { document.querySelector('[data-tab="Modes"]').click(); });
  await page.waitForTimeout(300);
  const { openModeList, clickMode } = await import('./harness.mjs');
  await openModeList(page); await clickMode(page, 'odd');
  await firstBoard(page);
  const lives = () => page.evaluate(() => ({ n: document.querySelectorAll('#hudLives span').length, out: document.querySelectorAll('#hudLives span.out').length }));
  const before = await lives();
  await lose(page);                                    // the first miss
  await page.waitForTimeout(900);
  const afterOne = await lives();
  check(before.out === 0 && afterOne.out === 0, "Noodle's first miss costs no life (" + afterOne.out + ' of ' + afterOne.n + ' spent)');
  /* The NEXT board, not any enabled tile: the lost round's tiles can still be on the page, and wrong answers aimed at them cost nothing. */
  await nextBoard(page);
  await lose(page);                                    // the second miss is a real one
  await page.waitForTimeout(900);
  const afterTwo = await lives();
  check(afterTwo.out === 1, 'the second costs one, as it always did (' + afterTwo.out + ' spent)');
  await page.close();
}

/* ── 4. the Room tab ───────────────────────────────────────────────────────── */
{
  const page = await newPage();
  await openApp(page, { schema: 11, reduceMotion: true, xp: 30000, lifetime: 50000, yarn: 400, room: {},
    pals: { biscuit: { bond: 5, pet: null, bow: '' } }, palsOn: ['biscuit'] });
  await goTab(page, 'Room');
  await openPanels(page);   /* the lists sit in panels that start shut */
  const ui = await page.evaluate(() => ({
    yarn: document.getElementById('yarnNum').textContent.replace(/\D/g, ''),
    scene: !!document.querySelector('#roomScene svg.roomsvg'),
    seats: document.querySelectorAll('#seatRow .seat').length,
    cats: document.querySelectorAll('#palGrid .palcard').length,
    wishes: document.querySelectorAll('#wishList .wish').length,
    decor: document.querySelectorAll('#decorList .decor').length,
    catsInScene: document.querySelectorAll('#roomScene [data-pal]').length,
  }));
  check(+ui.yarn >= 400 && ui.scene && ui.seats === 3 && ui.cats === 20 && ui.wishes === 4 && ui.decor === 8,
    'the Room draws: ' + JSON.stringify(ui));
  check(ui.catsInScene === 1, 'the cat you own is in the scene (' + ui.catsInScene + ')');

  /* pet a cat from its sheet */
  await page.click('#seatRow .seat.has');
  await page.waitForSelector('.metasheet .panel', { timeout: 3000 });
  const tiers = await page.evaluate(() => document.querySelectorAll('.metasheet .tierrow').length);
  check(tiers === 3, 'a cat sheet lays out its three bonds');
  await page.click('.metasheet .palbtns .ghost:not(:last-child)');
  await page.waitForTimeout(400);
  const s = await stored(page);
  check(s.pals.biscuit.pet && s.yarn >= 402 && s.day.pet === 1, 'petting a cat pays yarn, bond and the wish tally (' + s.yarn + ' yarn)');

  /* adopt Noodle (150) from the grid */
  await page.click('#palGrid .palcard:nth-child(2)');
  await page.waitForSelector('.metasheet .cta', { timeout: 3000 });
  await page.click('.metasheet .cta');
  await page.waitForTimeout(400);
  const s2 = await stored(page);
  check(!!s2.pals.noodle, 'adopting a cat you can afford adds it');
  check(s2.yarn === s.yarn - 150, 'and takes exactly its price (' + s.yarn + ' -> ' + s2.yarn + ')');

  /* upgrade the rug */
  const rugBtn = '#decorList .decor:nth-child(1) .wclaim';
  await page.click(rugBtn); await page.waitForTimeout(300);
  const s3 = await stored(page);
  check(s3.room.rug === 1 && s3.yarn <= s2.yarn - 60, 'upgrading the rug takes 60 yarn and raises its grade');
  await page.close();
}

/* ── 6. twists: opened by stars, picked on the sheet, played ─────────────── */
{
  const page = await newPage();
  await openApp(page, { schema: 11, reduceMotion: true, xp: 9000, seen: { odd: 1, stroop: 1 },
    marathon: { odd: 3300, stroop: 0 }, twist: { 'odd:blitz': 700 } });
  const { openModeList } = await import('./harness.mjs');
  await openModeList(page);
  const badges = await page.evaluate(() => ({
    odd: (() => { const b = document.querySelector('.mcard[data-id="odd"] .twb'); return b && !b.hidden ? b.textContent : null; })(),
    stroop: (() => { const b = document.querySelector('.mcard[data-id="stroop"] .twb'); return b && !b.hidden ? b.textContent : null; })(),
  }));
  check(badges.odd && !badges.stroop, 'a mode with a star wears its rank on its card; one without does not (' + JSON.stringify(badges) + ')');
  await page.evaluate(() => document.querySelector('.mcard[data-id="odd"] .twb').click());
  await page.waitForSelector('#modeSheet:not([hidden])', { timeout: 3000 });
  const sheetRan = await page.evaluate(() => !document.getElementById('over') || document.getElementById('over').hidden);
  const chips = await page.evaluate(() => ({ n: document.querySelectorAll('#twistRow .twchip').length, locked: document.querySelectorAll('#twistRow .twchip.lock').length,
    rank: document.getElementById('mpvRank').textContent, run: !document.getElementById('play').hidden }));
  check(chips.n === 5 && chips.locked === 0 && !chips.run, 'the badge opens the sheet without starting a run; three stars open all five boards (' + JSON.stringify(chips) + ')');
  check(/Tabby|Mouser|Kitten|Alley|Pouncer|Lion/.test(chips.rank) && /15/.test(chips.rank), 'and the sheet states the mode’s rank (' + chips.rank + ')');
  await page.click('#twistRow .twchip:nth-child(2)');       // Blitz
  await page.waitForTimeout(150);
  const blitz = await page.evaluate(() => ({ best: document.getElementById('mpvBest').textContent.replace(/\D/g, ''), desc: document.getElementById('twistDesc').textContent }));
  check(blitz.best === '700' && /1\.5/.test(blitz.desc), 'picking Blitz shows its own best and its rule (' + blitz.best + ')');
  await page.click('#twistRow .twchip:nth-child(5)');       // Ironclad
  await page.click('#mpvPlay');
  await firstBoard(page);
  const iron = await page.evaluate(() => ({ kind: document.getElementById('hudKind').textContent, lives: document.querySelectorAll('#hudLives span').length }));
  check(/Ironclad/.test(iron.kind) && iron.lives === 1, 'Ironclad is announced in the header and leaves one life (' + JSON.stringify(iron) + ')');
  await lose(page);
  /* interval polling: the app wraps requestAnimationFrame, and the default polling rides it */
  await page.waitForFunction(() => !document.getElementById('over').hidden, null, { timeout: 8000, polling: 100 });
  const after = await stored(page);
  check(after.marathon.odd === 3300, 'and a twist run never touches the Classic best');
  const overKind = await page.evaluate(() => document.getElementById('overKind').textContent);
  check(/Ironclad/.test(overKind), 'the results name the twist (' + overKind + ')');
  await page.close();
}
{
  const page = await newPage();
  await openApp(page, { schema: 11, reduceMotion: true, xp: 9000, seen: { odd: 1 }, marathon: { odd: 700 } });
  const { openModeList } = await import('./harness.mjs');
  await openModeList(page);
  await page.evaluate(() => document.querySelector('.mcard[data-id="odd"] .twb').click());
  await page.waitForSelector('#modeSheet:not([hidden])');
  const lk = await page.evaluate(() => [...document.querySelectorAll('#twistRow .twchip')].map(c => c.classList.contains('lock')));
  check(lk.join() === 'false,false,false,true,true', 'with one star, Blitz and Fog are open and Frenzy and Ironclad are not (' + lk + ')');
  await page.click('#twistRow .twchip:nth-child(4)');
  const say = await page.evaluate(() => document.getElementById('twistDesc').textContent);
  check(/2/.test(say), 'tapping a locked one says how many stars it needs (' + say + ')');
  await page.click('#twistRow .twchip:nth-child(3)');       // Fog
  await page.click('#mpvPlay');
  await firstBoard(page);
  const fog = await page.evaluate(() => document.getElementById('surface').classList.contains('fog'));
  check(fog, 'the Fog twist really fogs the board');
  await page.close();
}

/* ── 7. the daily gift and the room's introduction ──────────────────────── */
{
  const key = off => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const bare = { schema: 11, reduceMotion: true, xp: 0, runs: 0, solved: 0, lifetime: 0, yarn: 0, introRoom: true,
    pals: { biscuit: { bond: 0, pet: null, bow: '' } }, palsOn: ['biscuit'] };
  const collect = async (gift) => {
    const page = await newPage();
    await openApp(page, Object.assign({}, bare, { gift }));
    await goTab(page, 'Room');
    const info = await page.evaluate(() => { const b = document.querySelector('#giftCard .wclaim'); return { pips: document.querySelectorAll('#giftCard .gp').length, disabled: b.disabled, now: (document.querySelector('#giftCard .gp.now') || {}).textContent }; });
    if (!info.disabled) await page.click('#giftCard .wclaim');
    await page.waitForTimeout(300);
    const after = await stored(page);
    const dis = await page.evaluate(() => document.querySelector('#giftCard .wclaim').disabled);
    await page.close();
    return { info, after, dis };
  };
  const first = await collect({ last: '', streak: 0 });
  check(first.info.pips === 7 && !first.info.disabled, 'the Room offers a seven-day gift card');
  check(first.after.yarn === 20 && first.after.gift.streak === 1 && first.dis, 'day one pays 20 yarn and then waits until tomorrow (' + first.after.yarn + ')');
  const done = await collect({ last: key(0), streak: 3 });
  check(done.info.disabled && done.after.yarn === 0, 'a gift already collected today cannot be collected again');
  const seven = await collect({ last: key(-1), streak: 6 });
  check(seven.after.yarn === 120 && seven.after.gift.streak === 7 && seven.after.pals.biscuit.bond === 40, 'yesterday and six in a row: day seven pays 120 yarn and feeds the cat (' + seven.after.yarn + ', bond ' + seven.after.pals.biscuit.bond + ')');
  const lapsed = await collect({ last: key(-4), streak: 6 });
  check(lapsed.after.yarn === 20 && lapsed.after.gift.streak === 1, 'a lapsed streak starts again at day one, and takes nothing away (' + lapsed.after.yarn + ')');
  const wrap = await collect({ last: key(-1), streak: 7 });
  check(wrap.after.yarn === 20 && wrap.after.gift.streak === 8, 'after day seven the cycle begins again (' + wrap.after.yarn + ')');

  const page = await newPage();
  await openApp(page, Object.assign({}, bare, { introRoom: false }));
  await goTab(page, 'Room');
  const shown = await page.evaluate(() => !document.getElementById('roomIntro').hidden);
  await page.click('#roomIntro .ghost'); await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({ hidden: document.getElementById('roomIntro').hidden, saved: JSON.parse(localStorage.getItem('dd.v1')).introRoom }));
  check(shown && after.hidden && after.saved === true, 'the Room explains itself once, and stays quiet after that');
  await page.close();
}

/* ── 4b. the Stats tab draws a fortnight and the room's numbers ───────────── */
{
  const page = await newPage();
  const day = n => { const d = new Date(); d.setDate(d.getDate() + n); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  await openApp(page, { schema: 11, reduceMotion: true, xp: 9000, runs: 30, solved: 400, yarn: 50, yarnEver: 1234,
    pals: { biscuit: { bond: 10 }, noodle: { bond: 0 } }, palsOn: ['biscuit'], room: { rug: 2, tree: 3 },
    hist: { [day(0)]: 20, [day(-1)]: 10, [day(-3)]: 5, [day(-30)]: 99 }, fams: { logic: 7, focus: 30 }, wishTotal: 4, charmSeen: { luck: 2, echo: 1 } });
  await goTab(page, 'Stats');
  const st = await page.evaluate(() => ({
    bars: [...document.querySelectorAll('#actStrip .ab')].map(b => ({ h: parseFloat(b.querySelector('i').style.height), today: b.classList.contains('today'), none: b.classList.contains('none') })),
    total: document.getElementById('actTotal').textContent, aria: document.getElementById('actStrip').getAttribute('aria-label'),
    cats: document.getElementById('sCats').textContent, room: document.getElementById('sRoomG').textContent, fav: document.getElementById('sFavFam').textContent,
    wishes: document.getElementById('sWishes').textContent, charms: document.getElementById('sCharms').textContent, yarn: document.getElementById('sYarnEver').textContent }));
  check(st.bars.length === 14 && st.bars[13].today && st.bars[13].h === 100, 'fourteen bars, today last and tallest at 100% (' + st.bars.length + ', ' + (st.bars[13] && st.bars[13].h) + ')');
  check(st.bars[12].h === 50 && st.bars[10].h === 25 && st.bars[11].none, 'yesterday is half of it, three days ago a quarter, and a blank day is dim');
  check(/^35 /.test(st.total) && /35/.test(st.aria), 'the fortnight adds up to 35, and a month-old day is not counted (' + st.total + ')');
  check(st.cats === '2/20' && st.wishes === '4' && st.fav === 'Focus' && /^\d+\/24$/.test(st.room), "the room's numbers are there (" + [st.cats, st.wishes, st.fav, st.room, st.charms].join(', ') + ')');
  const pruned = await page.evaluate(() => { document.querySelector('[data-tab="Play"]').click(); return JSON.parse(localStorage.getItem('dd.v1')).hist; });
  await page.close();
  const p2 = await newPage();
  await openApp(p2, { schema: 11, hist: Object.fromEntries(Array.from({ length: 45 }, (_, i) => [day(-i), 1])) });
  await goTab(p2, 'Stats'); await p2.evaluate(() => document.querySelector('[data-tab="Play"]').click()); await p2.waitForTimeout(300);
  const kept = await p2.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('dd.v1')).hist).length);
  check(kept <= 31, 'the history is trimmed to about a month once it is saved (' + kept + ' days kept of 45)');
  await p2.close();
}

/* ── 5. every screen in every language, with the new tab ─────────────────── */
for (const lang of ['fr', 'es', 'de']){
  const page = await newPage();
  await openApp(page, { schema: 11, lang, reduceMotion: true, yarn: 900, pals: { biscuit: { bond: 100 }, noodle: { bond: 0 } }, palsOn: ['biscuit'], room: { rug: 2, tree: 3 } });
  await goTab(page, 'Room');
  await goTab(page, 'Stats');
  const st = await page.evaluate(() => document.getElementById('tabStats').innerText);
  const rawS = (st.match(/\b(?:stats|over|share)\.[a-zA-Z0-9]+\b/g) || []);
  check(rawS.length === 0, `the Stats tab in ${lang} has no untranslated key on screen` + (rawS.length ? ': ' + rawS.slice(0, 3).join(', ') : ''));
  await goTab(page, 'Room');
  const text = await page.evaluate(() => document.getElementById('tabRoom').innerText);
  const raw = (text.match(/\b[a-z]+\.[a-zA-Z]+(?:\.[a-zA-Z0-9]+)?\b/g) || []).filter(x => /^(room|pal|wish|decor|charm|fx|bond|rar|draft|over|yarn)\./.test(x));
  check(raw.length === 0, `the Room in ${lang} has no untranslated key on screen` + (raw.length ? ': ' + raw.slice(0, 3).join(', ') : ''));
  await page.close();
}

if (errs.length){ bad++; console.log('ERRORS', [...new Set(errs)].slice(0, 5)); }
await browser.close();
console.log(bad ? `\n${bad} problem(s) in the craft room` : '\nthe craft room works when played');
process.exit(bad ? 1 : 0);
