"""Cat's Eyes (glimmer): oil, gold twins, shy eyes, glowworms. Run from the repo root."""
import sys, re
p = 'site/app.html'; s = open(p).read()
VER = sys.argv[1] if len(sys.argv) > 1 else '0.186.0'
a = s.index("  glimmer: {\n    name:'Cat’s Eyes'")
e = s.index("\n  },\n\n  /* ── Slice", a)
body = s[a:e]
def bsub(old, new):
    global body
    assert body.count(old) == 1, old[:90]
    body = body.replace(old, new)

bsub("""    build(ctx){
      const lamps = clamp(4 + Math.floor(ctx.level/3), 4, 12);
      let reach = 26;""", """    /* Since __VER__ the light is a thing you spend. It burns oil as it moves, and its pool shrinks as the oil runs down (never
       to nothing: you can always finish); every pair of eyes you open pours some back, and finishing with a quarter of the oil
       or more pays extra. So the order you take the eyes in is the game. From level 6 two pairs are gold and come as twins:
       open one and the other glints, and opening both close together pays. From 12 one pair is shy and hides somewhere new if
       the light jumps onto it: creep up. From 20 glowworms glint pink in the dark, and one touched eats oil. */
    build(ctx){
      const lv = ctx.level;
      const lamps = clamp(4 + Math.floor(ctx.level/3), 4, 12);
      const hasTwins = lv >= 6, hasShy = lv >= 12, hasWorms = lv >= 20;
      let oil = 100, base = 26, stepLen = 0, twinAt = 0, hops = 0;
      const burn = 0.26 + Math.min(0.12, lv*0.005);
      const SHY = 10;
      let reach = base;""")
bsub("""      const tools = mk('div','sumtools'), glow = mk('button','sumtool'); glow.type = 'button';
      const paintGlow = () => { glow.textContent = t('glimmer.glow') + ' ' + glows; glow.disabled = glows <= 0 || done; };
      tools.appendChild(glow); col.appendChild(tools);""", """      const tools = mk('div','sumtools'), glow = mk('button','sumtool'); glow.type = 'button';
      const paintGlow = () => { glow.textContent = t('glimmer.glow') + ' ' + glows; glow.disabled = glows <= 0 || done; };
      /* The oil gauge: a short bar and the share left. */
      const gauge = mk('div','parchip glimoil'), bar = mk('i','glimbar'), fillBar = mk('b'), num = mk('span');
      bar.appendChild(fillBar); gauge.appendChild(bar); gauge.appendChild(num);
      const paintOil = () => { const v = Math.round(oil); fillBar.style.width = v + '%'; num.textContent = t('glimmer.oil', { n: v }); gauge.classList.toggle('low', v < 25); box.dataset.oil = v; };
      tools.appendChild(gauge); tools.appendChild(glow); col.appendChild(tools);""")
bsub("""      const els = pts.map((p,i) => {""", """      /* Which pairs are the gold twins and which is shy: never the same pair. */
      const twins = hasTwins && pts.length >= 4 ? [0, 1] : [];
      const shy = hasShy && pts.length >= 3 ? 2 : -1;
      twins.forEach(i => { pts[i].twin = true; });
      if (shy >= 0) pts[shy].shy = true;
      /* Glowworms, placed like eyes but never on them. */
      const worms = [];
      if (hasWorms) for (let k = 0; k < 2; k++) for (let a2=0;a2<240;a2++){
        const x = 12 + ctx.rnd()*76, y = 12 + ctx.rnd()*76;
        if (Math.hypot(x-50, y-50) > 22 && pts.concat(worms).every(p => Math.hypot(p.x-x, p.y-y) > 15)){ worms.push({ x, y }); break; }
      }
      const els = pts.map((p,i) => {""")
bsub("""        e.setAttribute('aria-label', t('a.lampOff', { n: i+1 }));
        box.appendChild(e);
        return e;
      });""", """        e.setAttribute('aria-label', t('a.lampOff', { n: i+1 }));
        if (p.twin) e.classList.add('twin');
        if (p.shy) e.classList.add('shy');
        box.appendChild(e);
        return e;
      });
      const wormEls = worms.map(w => {
        const e = mk('div','glimworm'); e.style.left = w.x+'%'; e.style.top = w.y+'%';
        e.setAttribute('role','img'); e.setAttribute('aria-label', t('a.glimWorm'));
        box.appendChild(e); return e;
      });""")
bsub("""      const say = () => ctx.prompt(t('p.glimmer', { n: lamps - lit }));""", """      /* The newest rule rides on the count until the first pair opens: taught in the prompt, never in a tutorial. */
      const teach = hasWorms ? 'p.glimWorm' : hasShy ? 'p.glimShy' : hasTwins ? 'p.glimTwin' : 'p.glimOil';
      const say = () => ctx.prompt(t(lit ? 'p.glimmer' : teach, { n: lamps - lit }));""")
bsub("""      const paint = () => {
        bug.style.left = bx+'%'; bug.style.top = by+'%';
        light.style.left = bx+'%'; light.style.top = by+'%';
        if (reach !== shownReach){ shownReach = reach; light.style.width = reach*2.2 + '%'; }
        const a = aspect(), now = performance.now();""", """      const paint = () => {
        bug.style.left = bx+'%'; bug.style.top = by+'%';
        light.style.left = bx+'%'; light.style.top = by+'%';
        const a = aspect(), now = performance.now();
        /* Oil burns with the way the light has come, and the pool of light is as big as the oil left lets it be. */
        if (!done && !ctx.relaxed){ oil = Math.max(0, oil - Math.hypot(bx - px, (by - py) * a) * burn); }
        reach = Math.round(base * (0.55 + 0.45 * oil / 100) * 10) / 10;
        if (reach !== shownReach){ shownReach = reach; light.style.width = reach*2.2 + '%'; }
        paintOil();
        worms.forEach((w, k) => {
          if (w.gone) return;
          const d = Math.hypot(w.x-bx, (w.y-by) * a);
          wormEls[k].style.opacity = Math.max(clamp(1 - (d - reach*0.35) / (reach*0.9), 0, 1), now < glowUntil ? 0.7 : 0).toFixed(2);
          if (segDist(w, px, py, bx, by) < 7){
            w.gone = true; wormEls[k].remove();
            oil = Math.max(0, oil - 30); paintOil(); sfx.bad(); buzz('bad'); ctx.prompt(t('p.glimAte'));
          }
        });""")
bsub("""          if (segDist(p, px, py, bx, by) < 9){
            p.lit = true; lit++; progressAt = now;""", """          if (segDist(p, px, py, bx, by) < 9){
            /* Shy eyes, jumped on, shut and open somewhere else (twice at most: then they give in). */
            if (p.shy && stepLen > SHY && hops < 2){
              hops++;
              let q = null;
              for (let a2=0;a2<240 && !q;a2++){
                const x = 12 + ctx.rnd()*76, y = 12 + ctx.rnd()*76;
                if (Math.hypot(x-bx, (y-by)*a) > 30 && pts.concat(worms).every(o => o === p || Math.hypot(o.x-x, o.y-y) > 15)) q = { x, y };
              }
              if (q){
                p.x = q.x; p.y = q.y; els[i].style.left = q.x+'%'; els[i].style.top = q.y+'%'; els[i].style.opacity = 0;
                els[i].classList.add('hid'); ctx.after(500, () => els[i].classList.remove('hid'));
                sfx.tap(); ctx.prompt(t('p.glimHid')); box.dataset.hops = hops;
                return;
              }
            }
            p.lit = true; lit++; progressAt = now;
            oil = Math.min(100, oil + 14); paintOil();
            /* a gold pair: its twin glints, and opening the two close together pays */
            if (p.twin){
              const other = pts.find(o => o !== p && o.twin);
              if (other && other.lit && now - twinAt < 6000){ ctx.points(20 + Math.min(30, lv), els[i]); floatPts(els[i], t('fx.glimTwins'), 3); box.dataset.twins = '1'; }
              else if (other && !other.lit){ twinAt = now; other.peekUntil = now + 1600; ctx.after(1700, () => { if (!done) paint(); }); }
            }""")
bsub("""            reach = Math.min(46, reach + 3.5);
            sfx.good(lit); buzz('good');
            if (lit >= lamps){ done = true; paintGlow(); return ctx.win(bug); }""", """            base = Math.min(46, base + 3.5);
            sfx.good(lit); buzz('good');
            if (lit >= lamps){
              done = true; paintGlow();
              /* A bright finish: a quarter of the oil or more still in the lamp. */
              if (oil >= 25 && !ctx.relaxed){ light.classList.add('bright'); ctx.points(20 + Math.min(40, lv*2), bug); floatPts(bug, t('fx.glimBright'), 3); box.dataset.bright = '1'; }
              return ctx.win(bug);
            }""")
bsub("""      onDrag(box, {
        start: q => { if (!done){ bx = clamp(q.x,4,96); by = clamp(q.y,4,96); px = bx; py = by; paint(); } },
        move:  q => { if (!done){ bx = clamp(q.x,4,96); by = clamp(q.y,4,96); paint(); } }
      });""", """      onDrag(box, {
        /* A touch puts the light where it lands. The jump burns oil like the way round would, and is how far it came at once. */
        start: q => { if (!done){
          const nx = clamp(q.x,4,96), ny = clamp(q.y,4,96), a = aspect();
          stepLen = Math.hypot(nx - bx, (ny - by) * a);
          if (!ctx.relaxed) oil = Math.max(0, oil - stepLen * burn);
          bx = nx; by = ny; px = bx; py = by; paint(); } },
        move:  q => { if (!done){ bx = clamp(q.x,4,96); by = clamp(q.y,4,96); stepLen = Math.hypot(bx - px, (by - py) * aspect()); paint(); } }
      });
      box._state = () => ({ oil, lamps: pts.map(p => ({ x: p.x, y: p.y, lit: !!p.lit, twin: !!p.twin, shy: !!p.shy })), worms: worms.map(w => ({ x: w.x, y: w.y, gone: !!w.gone })), hops });""")
body = body.replace('__VER__', VER)
s = s[:a] + body + s[e:]

css_old = ".glimlamp.peek{opacity:.8}\n"
assert s.count(css_old) == 1
s = s.replace(css_old, css_old + """/* Cat's Eyes' own rules (__VER__): the oil, gold twins, shy eyes, glowworms. */
.glimoil{display:flex;align-items:center;gap:7px}
.glimbar{display:block;width:44px;height:6px;border-radius:3px;background:#ffffff1a;overflow:hidden}
.glimbar b{display:block;height:100%;background:#7BE38A;transition:width var(--t-med)}
.glimoil.low .glimbar b{background:var(--bad)}
.glimlamp.twin{filter:sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.15)}
.glimlamp.hid{transition:none}
.glimworm{position:absolute;width:3.2%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;
  background:#FF7E96;box-shadow:0 0 10px 3px #ff7e9688;transition:opacity 160ms linear;opacity:0}
html[data-motion="on"] .glimlight.bright{animation:arcWeave .7s ease-out}
""".replace('__VER__', VER))

adds = [
 {'p.glimOil':'{n} to find · the light burns oil','p.glimTwin':'{n} to find · gold eyes come in twos','p.glimShy':'{n} to find · creep up on shy eyes','p.glimWorm':'{n} to find · pink glints eat oil','p.glimHid':'Too quick: they hid','p.glimAte':'A glowworm ate some oil','glimmer.oil':'Oil {n}%','fx.glimTwins':'Twins!','fx.glimBright':'Bright finish!','a.glimWorm':'A glowworm'},
 {'p.glimOil':'{n} à trouver · la lumière brûle l’huile','p.glimTwin':'{n} à trouver · les yeux dorés vont par deux','p.glimShy':'{n} à trouver · approchez doucement','p.glimWorm':'{n} à trouver · les lueurs roses mangent l’huile','p.glimHid':'Trop vite : ils se cachent','p.glimAte':'Un ver luisant a mangé de l’huile','glimmer.oil':'Huile {n} %','fx.glimTwins':'Jumeaux !','fx.glimBright':'Fin lumineuse !','a.glimWorm':'Un ver luisant'},
 {'p.glimOil':'{n} por encontrar · la luz gasta aceite','p.glimTwin':'{n} por encontrar · los ojos dorados van en pareja','p.glimShy':'{n} por encontrar · acércate despacio','p.glimWorm':'{n} por encontrar · los brillos rosas comen aceite','p.glimHid':'Muy rápido: se escondieron','p.glimAte':'Una luciérnaga comió aceite','glimmer.oil':'Aceite {n} %','fx.glimTwins':'¡Gemelos!','fx.glimBright':'¡Final brillante!','a.glimWorm':'Una luciérnaga'},
 {'p.glimOil':'{n} zu finden · das Licht verbrennt Öl','p.glimTwin':'{n} zu finden · goldene Augen kommen zu zweit','p.glimShy':'{n} zu finden · schleich dich an','p.glimWorm':'{n} zu finden · rosa Glimmer frisst Öl','p.glimHid':'Zu schnell: versteckt','p.glimAte':'Ein Glühwurm hat Öl gefressen','glimmer.oil':'Öl {n} %','fx.glimTwins':'Zwillinge!','fx.glimBright':'Helles Ende!','a.glimWorm':'Ein Glühwurm'},
]
anchors = re.findall(r"'p\.glimmer':'[^']*'", s)
assert len(anchors) == 4, anchors
pos = 0
for anc, add in zip(anchors, adds):
    i = s.index(anc, pos); j = i + len(anc)
    ins = ', ' + ', '.join("'%s':'%s'" % kv for kv in add.items())
    s = s[:j] + ins + s[j:]; pos = j + len(ins)
open(p, 'w').write(s)
print('glimmer applied')
