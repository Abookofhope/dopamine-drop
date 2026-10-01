/* The Gateway: three moods at the top of Play, each opening the games that suit it.
 *
 *   Calm & Collect  (Predominantly Inattentive)             -> Yarn Tangled Tangle, Sandbox of Softness
 *   Quick Paws      (Predominantly Hyperactive-Impulsive)   -> Yarn Ball Blaster, Kitten's Snack Attack
 *   The Full Purr   (Combined)                              -> all four
 *
 * Every game is still one tap away, the back gesture closes a mood, a card starts its game, and it reads in four languages at the
 * smallest phone.
 *
 *   node tools/probe/gate.mjs
 */
import { chromium } from 'playwright';
import { openApp } from './harness.mjs';

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
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, cx: q.left + q.width / 2, cy: q.top + q.height / 2 }; };
  const jp = document.getElementById('justPlayBtn');
  return { gates: [...document.querySelectorAll('.gateBtn')].map(b => ({ id: b.dataset.gate, title: b.querySelector('b').textContent.trim(), who: b.querySelector('small').textContent.trim(), vibe: b.querySelector('em').textContent.trim(), ...R(b) })),
    justPlayY: jp.getBoundingClientRect().top, hscroll: document.documentElement.scrollWidth > innerWidth + 1, homeShown: !document.getElementById('playHome').hidden, gateShown: !document.getElementById('playGate').hidden };
});
const inside = page => page.evaluate(() => ({
  name: document.getElementById('gateName').textContent.trim(), who: document.getElementById('gateWho').textContent.trim(), vibe: document.getElementById('gateVibe').textContent.trim(),
  featured: [...document.querySelectorAll('#gateModes .mcard')].map(c => ({ id: c.dataset.id, name: (c.querySelector('b, .nm, h3') || c).textContent.trim().slice(0, 40) })),
  more: [...document.querySelectorAll('#gateMore .mcard')].map(c => c.dataset.id),
  moreShown: !document.getElementById('gateMore').hidden, homeShown: !document.getElementById('playHome').hidden, gateShown: !document.getElementById('playGate').hidden,
  allText: document.getElementById('gateAll').textContent.trim() }));

/* ── the three moods, and what is written on them ─────────────────────────────────────────────────────────────────────── */
{
  const page = await open('en');
  const h = await home(page);
  check(h.gates.length === 3, 'three big buttons');
  check(h.gates.map(g => g.title).join('|') === 'Calm & Collect|Quick Paws|The Full Purr', `named Calm & Collect, Quick Paws and The Full Purr (${h.gates.map(g => g.title).join(', ')})`);
  check(h.gates.map(g => g.who).join('|') === '(Predominantly Inattentive)|(Predominantly Hyperactive-Impulsive)|(Combined)', 'each with its presentation under the name');
  check(h.gates.every(g => g.vibe.length > 10), `and a line for the feel of it ("${h.gates[0].vibe}")`);
  check(h.gates.every(g => g.h >= 80 && g.w >= 300), `big and friendly (${Math.round(h.gates[0].w)}x${Math.round(h.gates[0].h)}px)`);
  check(h.gates.every(g => g.y + g.h < h.justPlayY), 'and they sit above Just play and the rest');
  check(!h.hscroll, 'and nothing scrolls sideways');
  await page.close();
}

/* ── each mood opens the games that suit it ───────────────────────────────────────────────────────────────────────────── */
const EXPECT = { calm: ['meld', 'sift'], quick: ['blast', 'forage'], full: ['meld', 'sift', 'blast', 'forage'] };
for (const id of ['calm', 'quick', 'full']){
  const page = await open('en');
  await page.locator(`.gateBtn[data-gate="${id}"]`).click(); await page.waitForTimeout(500);
  const g = await inside(page);
  check(g.gateShown && !g.homeShown, `${id}: the mood's screen opens in place of the menu`);
  check(g.featured.map(f => f.id).join() === EXPECT[id].join(), `${id}: it shows ${EXPECT[id].join(' + ')} (${g.featured.map(f => f.id).join(' + ')})`);
  check(g.name && g.who && g.vibe, `${id}: headed by its name, its presentation and its feel (${g.name} ${g.who})`);
  if (id !== 'full') check(g.moreShown && g.more.length >= 2 && g.more.every(m => !EXPECT[id].includes(m)), `${id}: and more of the same feeling beside them (${g.more.join(', ')})`);
  check(/All \d+ modes/.test(g.allText), `${id}: and every game is one tap away (${g.allText.replace(/\s+/g, ' ')})`);
  await page.close();
}

/* ── a card starts its game; the back gesture closes the mood; All modes opens the whole list ────────────────────────── */
{
  const page = await open('en');
  await page.locator('.gateBtn[data-gate="quick"]').click(); await page.waitForTimeout(400);
  await page.locator('#gateModes .mcard[data-id="blast"]').click();
  const started = await page.waitForSelector('.blastbox', { timeout: 12000 }).then(() => true).catch(() => false);
  check(started, 'a card in Quick Paws starts Yarn Ball Blaster');
  await page.close();
}
{
  const page = await open('en');
  await page.locator('.gateBtn[data-gate="calm"]').click(); await page.waitForTimeout(400);
  await page.locator('#gateModes .mcard[data-id="meld"]').click();
  const started = await page.waitForSelector('.meldgrid', { timeout: 12000 }).then(() => true).catch(() => false);
  check(started, 'and a card in Calm & Collect starts Yarn Tangled Tangle');
  await page.close();
}
{
  const page = await open('en');
  await page.locator('.gateBtn[data-gate="full"]').click(); await page.waitForTimeout(400);
  await page.evaluate(() => history.back()); await page.waitForTimeout(500);
  let h = await home(page);
  check(h.homeShown && !h.gateShown, 'the back gesture closes a mood and leaves you on the menu');
  await page.locator('.gateBtn[data-gate="calm"]').click(); await page.waitForTimeout(300);
  await page.locator('#gateBack').click(); await page.waitForTimeout(300);
  h = await home(page);
  check(h.homeShown && !h.gateShown, 'and so does Back to menu');
  await page.locator('.gateBtn[data-gate="calm"]').click(); await page.waitForTimeout(300);
  await page.locator('#gateAll').click(); await page.waitForTimeout(600);
  const n = await page.evaluate(() => ({ cards: document.querySelectorAll('#modeSections .mcard').length, onModes: !document.getElementById('tabModes').hidden }));
  check(n.onModes && n.cards >= 40, `All modes opens the whole list (${n.cards} cards)`);
  await page.close();
}

/* ── four languages, smallest phone ───────────────────────────────────────────────────────────────────────────────────── */
for (const lang of ['fr', 'es', 'de']){
  const page = await open(lang, { width: 320, height: 568 });
  const h = await home(page);
  const en = ['Calm & Collect', 'Quick Paws', 'The Full Purr'];
  check(h.gates.length === 3 && h.gates.every((g, i) => g.title && g.title !== en[i] && !/\{/.test(g.title + g.who + g.vibe) && g.h >= 80), `${lang}: three buttons in the language (${h.gates.map(g => g.title).join(', ')})`);
  check(h.gates.every(g => g.x >= 0 && g.x + g.w <= 321) && !h.hscroll, `${lang}: and they fit 320 wide`);
  await page.locator('.gateBtn[data-gate="quick"]').click(); await page.waitForTimeout(400);
  const g = await inside(page);
  check(g.featured.length === 2 && g.name && !/\{/.test(g.allText), `${lang}: the mood opens with its two games (${g.name})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nthe Gateway sends each mood to its games');
process.exit(bad ? 1 : 0);
