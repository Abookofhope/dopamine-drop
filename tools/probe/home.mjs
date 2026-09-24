/* The Play tab (guided home, then My Stuff) across the three save states it has
 * to hold: a player who has never played, one mid-climb, and one who has
 * mastered everything. Two sub-screens now instead of one long scroll — both
 * get checked, since My Stuff is where Favorites/Mixtape/Fidget/Marathon/Stats
 * actually live.
 *
 *   node tools/probe/home.mjs
 */
import { chromium } from 'playwright';
import { openApp, axeOn, modeIdsFromBuild, floorOrDie } from './harness.mjs';

const SITE = process.env.SITE || '/tmp/pw/_site';
const ids = modeIdsFromBuild(SITE);
const mastered = Object.fromEntries(ids.map(id => [id, 4000]));

const dayKey = n => { const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const PROFILES = [
  ['fresh',   { xp: 0, solved: 0, runs: 0, onboarded: true }],
  ['playing', { xp: 9000, solved: 600, runs: 40, lastMode: 'cairn', pbBlitz: 3120,
                marathon: { odd: 2400, echo: 1700, cairn: 700 },
                mix: ['odd','echo','heft'], dailyStreak: 4, dailyLast: dayKey(-1),
                favs: ['odd', 'echo'] }],
  ['veteran', { xp: 400000, solved: 20000, runs: 900, lastMode: 'weave', pbBlitz: 9400,
                marathon: mastered, mix: ['odd','echo'], dailyStreak: 31, dailyLast: dayKey(0),
                favs: ['weave'] }],
];

/* Shared shape-and-reach measurement for whichever sub-screen is currently
 * showing — same checks the old single-screen probe made, just callable
 * twice (once for the guided home, once for My Stuff). */
const measure = () => {
  const scroll = document.querySelector('#tabPlay .scroll');
  const visible = [...scroll.children].find(n => !n.hidden) || scroll;
  const sr = visible.getBoundingClientRect();
  const clipped = [...visible.querySelectorAll('*')].filter(n => {
    const r = n.getBoundingClientRect();
    return r.width && (r.left < sr.left - 1 || r.right > sr.right + 1);
  }).map(n => `${n.className}(${Math.round(n.getBoundingClientRect().width)})`);
  const taps = [...visible.querySelectorAll('button')]
    .filter(x => x.getBoundingClientRect().width)
    .map(x => { const r = x.getBoundingClientRect();
      return { id: x.id || x.className, s: Math.round(Math.min(r.width, r.height)) }; })
    .sort((a, c) => a.s - c.s);
  return {
    hscroll: scroll.scrollWidth > scroll.clientWidth + 1,
    clipped: clipped.slice(0, 3),
    minTap: taps.length ? taps[0].s : 0, minWho: taps.length ? taps[0].id : '',
  };
};

const browser = await chromium.launch();
let bad = 0;

for (const [label, extra] of PROFILES){
  for (const [vw, vh] of [[400, 820], [360, 640], [320, 568]]){
    for (const lang of (vw === 400 ? ['en','de','fr','es'] : ['en'])){
      const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: true });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      await openApp(page, { ...extra, lang });

      /* ── Guided home: exactly three choices, and Just Play knows what it's
         continuing (or falls back to the Shuffle blurb with nothing to carry). */
      const home = await page.evaluate(measure);
      const homeInfo = await page.evaluate(() => ({
        labels: [...document.querySelectorAll('.guidedBtn b')].map(b => b.textContent.trim()),
        subs: [...document.querySelectorAll('.guidedBtn small')].map(s => s.textContent.trim()),
        justPlaySub: document.getElementById('justPlaySub').textContent.trim(),
        pickModeSub: document.getElementById('pickModeSub').textContent.trim(),
        dailyLine: document.getElementById('dailyStatusLine').textContent.trim(),
      }));
      /* A {placeholder} that made it to screen unfilled — the exact shape of bug
         a static data-i18n span produces when its string needs a var() and none
         was given — is worse than blank: it reads as broken software. */
      const rawBrace = [...homeInfo.labels, ...homeInfo.subs, homeInfo.dailyLine]
        .find(s => /\{[a-zA-Z]/.test(s));
      const homeDistinct = new Set(homeInfo.labels).size === homeInfo.labels.length;
      const homeOk = !home.hscroll && !home.clipped.length && home.minTap >= 30
        && homeInfo.labels.length === 3 && homeInfo.subs.length === 3 && homeDistinct
        && !!homeInfo.justPlaySub && !!homeInfo.pickModeSub && !!homeInfo.dailyLine
        && !rawBrace && !errs.length;
      if (!homeOk) bad++;
      console.log(`${homeOk ? 'ok  ' : 'FAIL'} ${label.padEnd(8)} ${vw}x${vh} ${lang}  home`
        + `  "${homeInfo.labels.join(' / ')}"  subs "${homeInfo.subs.join(' / ')}"  daily "${homeInfo.dailyLine}"`
        + `  ${home.clipped.length ? 'clipped ' + home.clipped.join(',') : ''}${home.hscroll ? ' H-SCROLL' : ''}`
        + `  smallest tap ${home.minTap}px (${home.minWho})`
        + (rawBrace ? ' UNFILLED-PLACEHOLDER "' + rawBrace + '"' : '')
        + (errs.length ? ' ERR ' + errs[0] : ''));
      floorOrDie(`${label} guided labels`, homeInfo.labels.length, 3);

      /* ── My Stuff: everything that isn't one of the three guided choices —
         Favorites (once earned), the perk chip, and the four rows below it. */
      await page.click('#myStuffBtn');
      await page.waitForTimeout(280);
      const stuff = await page.evaluate(measure);
      const stuffInfo = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('#playMyStuff .stufflist b')].map(b => b.textContent.trim()),
        favCount: document.getElementById('favModes').hidden ? 0
          : document.getElementById('favModes').children.length,
      }));
      const rowsDistinct = new Set(stuffInfo.rows).size === stuffInfo.rows.length;
      const stuffOk = !stuff.hscroll && !stuff.clipped.length && stuff.minTap >= 30
        && stuffInfo.rows.length === 7 && rowsDistinct && !errs.length;
      if (!stuffOk) bad++;
      console.log(`${stuffOk ? 'ok  ' : 'FAIL'} ${label.padEnd(8)} ${vw}x${vh} ${lang}  my-stuff`
        + `  rows "${stuffInfo.rows.join('/')}"  favs ${stuffInfo.favCount}`
        + `  ${stuff.clipped.length ? 'clipped ' + stuff.clipped.join(',') : ''}${stuff.hscroll ? ' H-SCROLL' : ''}`
        + `  smallest tap ${stuff.minTap}px (${stuff.minWho})`);
      floorOrDie(`${label} my-stuff rows`, stuffInfo.rows.length, 7);

      if (vw === 400 && lang === 'en'){
        const vHome = await axeOn(page, '#playHome');
        await page.click('#myStuffBack');
        await page.waitForTimeout(280);
        const v = vHome;
        if (v.length) bad++;
        console.log('     ' + (v.length
          ? 'FAIL a11y (home): ' + v.map(x => `${x.id} x${x.n}`).join(' | ') : 'a11y clean (home)'));
        await page.click('#myStuffBtn');
        await page.waitForTimeout(280);
        const vStuff = await axeOn(page, '#playMyStuff');
        if (vStuff.length) bad++;
        console.log('     ' + (vStuff.length
          ? 'FAIL a11y (my-stuff): ' + vStuff.map(x => `${x.id} x${x.n}`).join(' | ') : 'a11y clean (my-stuff)'));
      }
      await ctx.close();
    }
  }
}
await browser.close();
console.log(bad ? `\n${bad} home-tab problem(s)` : '\nthe home tab holds in every save state');
process.exit(bad ? 1 : 0);
