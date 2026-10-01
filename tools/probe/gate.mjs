/* The menu: three kinds of game, and a place to make your own.
 *
 *   Calm & Collect  (Predominantly Inattentive)             soothing, repetitive, low-pressure
 *   Quick Paws      (Predominantly Hyperactive-Impulsive)   fast, satisfying, action-oriented
 *   The Full Purr   (Combined)                              a balanced mix of calm strategy and quick action
 *   Custom                                                  your own playlist
 *
 * Every game belongs to one of the three kinds. Opening a kind shows all of its games and a button that plays a mix of them, a game
 * starts on its own, Custom opens the playlist builder, the bar at the bottom is four tabs, and You holds progress and settings.
 *
 *   node tools/probe/gate.mjs
 */
import { chromium } from 'playwright';
import { openApp, modeIdsFromBuild } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (lang = 'en', vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp: 12000, runs: 40, solved: 200, sound: false, haptics: false, onboarded: true, schema: 11, lang });
  return page;
};
const home = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const sc = document.querySelector('#tabPlay .scroll');
  return { gates: [...document.querySelectorAll('.gateBtn')].map(b => ({ id: b.dataset.gate, title: b.querySelector('b').textContent.trim(), who: b.querySelector('small').textContent.trim(), vibe: b.querySelector('em').textContent.trim(),
      count: +((b.querySelector('.gcount') || {}).textContent || '').replace(/\D/g, ''), ...R(b) })),
    custom: document.getElementById('customBtn') ? { title: document.querySelector('#customBtn b').textContent.trim(), ...R(document.getElementById('customBtn')) } : null,
    daily: (document.getElementById('dailyStatusLine') || {}).textContent || '',
    tabs: [...document.querySelectorAll('#tabbar .tab')].map(b => b.dataset.tab + (b.getAttribute('aria-current') ? '*' : '')),
    scrolls: sc ? sc.scrollHeight > sc.clientHeight + 2 : null, hscroll: document.documentElement.scrollWidth > innerWidth + 1,
    homeShown: !document.getElementById('playHome').hidden, gateShown: !document.getElementById('playGate').hidden };
});
const inside = page => page.evaluate(() => ({
  name: document.getElementById('gateName').textContent.trim(), who: document.getElementById('gateWho').textContent.trim(), vibe: document.getElementById('gateVibe').textContent.trim(),
  cards: [...document.querySelectorAll('#gateModes .mcard')].map(c => ({ id: c.dataset.id, name: (c.querySelector('b') || c).textContent.trim() })),
  hasPlay: !!document.getElementById('moodPlay') && document.getElementById('moodPlay').offsetParent !== null, count: document.getElementById('gateCount').textContent.trim() }));

/* ── what is on the menu ──────────────────────────────────────────────────────────────────────────────────────────────── */
const ALL = modeIdsFromBuild(process.env.SITE || '.');
const kinds = {};
{
  const page = await open('en');
  const h = await home(page);
  check(h.gates.map(g => g.title).join('|') === 'Calm & Collect|Quick Paws|The Full Purr', `three kinds of game, named Calm & Collect, Quick Paws and The Full Purr (${h.gates.map(g => g.title).join(', ')})`);
  check(h.gates.map(g => g.who).join('|') === '(Predominantly Inattentive)|(Predominantly Hyperactive-Impulsive)|(Combined)', 'each with its presentation under the name');
  check(h.gates.every(g => g.vibe.length > 10 && g.h >= 90 && g.count >= 10), `a line for the feel of it, and how many games it holds (${h.gates.map(g => g.count).join(', ')})`);
  check(!!h.custom && /Custom/.test(h.custom.title) && h.custom.h >= 56, `and Custom, for your own playlist (${h.custom && h.custom.title})`);
  check(!!h.daily, `with Daily Drop above them (${h.daily})`);
  check(h.tabs.join(',') === 'Play*,Modes,Room,Stats', `a bar of four tabs, Play, Games, Room and You (${h.tabs.join(' ')})`);
  check(h.scrolls === false && !h.hscroll, 'and all of it fits one screen: nothing scrolls');
  /* every game belongs to a kind: open each and read what is in it */
  for (const id of ['calm', 'quick', 'full']){
    await page.locator(`.gateBtn[data-gate="${id}"]`).click(); await page.waitForTimeout(450);
    const g = await inside(page);
    kinds[id] = g;
    check(g.cards.length === h.gates.find(x => x.id === id).count && g.hasPlay && g.name && g.who && g.vibe, `${id}: opens with its name, a Play a mix button and all ${g.cards.length} of its games (${g.count})`);
    await page.locator('#gateBack').click(); await page.waitForTimeout(250);
  }
  const calm = new Set(kinds.calm.cards.map(c => c.id)), quick = new Set(kinds.quick.cards.map(c => c.id)), full = new Set(kinds.full.cards.map(c => c.id));
  const union = new Set([...calm, ...quick, ...full]);
  check(ALL.length >= 44 && ALL.every(id => union.has(id)), `every one of the ${ALL.length} games is in a kind (${union.size} found)`);
  check([...calm].every(id => !quick.has(id)), 'a game is never both calm and quick');
  check(['meld', 'sift'].every(id => calm.has(id)) && ['blast', 'forage'].every(id => quick.has(id)) && ['meld', 'sift', 'blast', 'forage'].every(id => full.has(id)), 'Yarn Tangled Tangle and Sandbox of Softness are Calm, Yarn Ball Blaster and Kitten’s Snack Attack are Quick, and The Full Purr holds all four');
  check(kinds.full.cards.slice(0, 4).map(c => c.id).join() === 'meld,sift,blast,forage', 'and shows them first');
  await page.close();
}

/* ── Play a mix draws from the kind; a game starts on its own ─────────────────────────────────────────────────────────── */
for (const id of ['calm', 'quick']){
  const names = new Set(kinds[id].cards.map(c => c.name));
  const outside = [];
  for (let i = 0; i < 3; i++){
    const page = await open('en');
    await page.locator(`.gateBtn[data-gate="${id}"]`).click(); await page.waitForTimeout(350);
    await page.locator('#moodPlay').click();
    /* the label says Shuffle through the count-in, then names the game once it is dealt */
    await page.waitForFunction(() => { const k = document.getElementById('hudKind').textContent.trim(); return k && k !== 'Shuffle'; }, null, { timeout: 9000, polling: 100 }).catch(() => {});
    const kind = await page.evaluate(() => (document.getElementById('hudKind') || {}).textContent.trim());
    if (!names.has(kind)) outside.push(kind);
    await page.close();
  }
  check(outside.length === 0, `${id}: Play a mix starts a game from that kind (3 tries${outside.length ? ', not from it: ' + outside.join(', ') : ''})`);
}
{
  const page = await open('en');
  await page.locator('.gateBtn[data-gate="quick"]').click(); await page.waitForTimeout(350);
  await page.locator('#gateModes .mcard[data-id="blast"]').click();
  check(await page.waitForSelector('.blastbox', { timeout: 12000 }).then(() => true).catch(() => false), 'a game in Quick Paws starts on its own (Yarn Ball Blaster)');
  await page.close();
}

/* ── Custom, the back gesture, and the You tab ────────────────────────────────────────────────────────────────────────── */
{
  const page = await open('en');
  await page.locator('.gateBtn[data-gate="full"]').click(); await page.waitForTimeout(350);
  await page.evaluate(() => history.back()); await page.waitForTimeout(500);
  const h = await home(page);
  check(h.homeShown && !h.gateShown, 'the back gesture closes a kind and leaves you on the menu');
  await page.locator('#customBtn').click(); await page.waitForTimeout(450);
  const c = await page.evaluate(() => ({ mix: !document.getElementById('tabMix').hidden, tabs: [...document.querySelectorAll('#tabbar .tab')].map(b => b.dataset.tab + (b.getAttribute('aria-current') ? '*' : '')).join(' ') }));
  check(c.mix && /Play\*/.test(c.tabs), `Custom opens the playlist builder and Play stays lit (${c.tabs})`);
  await page.locator('#tabbar .tab[data-tab="Stats"]').click(); await page.waitForTimeout(400);
  let y = await page.evaluate(() => ({ stats: !document.getElementById('tabStats').hidden, settings: !document.getElementById('tabSettings').hidden, switchOn: [...document.querySelectorAll('#tabStats .ysub button')].map(b => b.getAttribute('aria-pressed')).join() }));
  check(y.stats && !y.settings && y.switchOn === 'true,false', 'You opens Progress, with a switch for Settings');
  await page.locator('#tabStats .ysub button[data-tab="Settings"]').click(); await page.waitForTimeout(400);
  y = await page.evaluate(() => ({ stats: !document.getElementById('tabStats').hidden, settings: !document.getElementById('tabSettings').hidden, you: document.querySelector('#tabbar .tab[data-tab="Stats"]').getAttribute('aria-current') }));
  check(!y.stats && y.settings && y.you === 'page', 'and the switch opens Settings while You stays lit');
  await page.close();
}

/* ── four languages, smallest phone ───────────────────────────────────────────────────────────────────────────────────── */
for (const lang of ['fr', 'es', 'de']){
  const page = await open(lang, { width: 320, height: 568 });
  const h = await home(page);
  const en = ['Calm & Collect', 'Quick Paws', 'The Full Purr'];
  check(h.gates.length === 3 && h.gates.every((g, i) => g.title && g.title !== en[i] && !/\{/.test(g.title + g.who + g.vibe) && g.h >= 90), `${lang}: three kinds in the language (${h.gates.map(g => g.title).join(', ')})`);
  check(h.gates.every(g => g.x >= 0 && g.x + g.w <= 321) && !h.hscroll && h.custom && h.custom.x + h.custom.w <= 321, `${lang}: and they fit 320 wide`);
  await page.locator('.gateBtn[data-gate="quick"]').click(); await page.waitForTimeout(400);
  const g = await inside(page);
  check(g.cards.length === 14 && g.hasPlay && !/\{/.test(g.count), `${lang}: a kind opens with its games and a play button (${g.name}, ${g.count})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nthe menu is three kinds of game and a place for your own');
process.exit(bad ? 1 : 0);
