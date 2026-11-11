/* La lumiere et la vie du decor : tout ce qui fait qu'une image fixe devient un endroit vivant.
   Ces effets sont choisis automatiquement d'apres l'ambiance du lieu, sans rien changer au jeu. */
'use strict';
(function () {
  const L = G.Lumiere = {};
  const D = G.Decor;
  const { rnd, irnd, pick } = G;

  /* Ce qui vit au loin, par region : [objet, ou, vitesse propre px/s]. ou = 'ciel', 'mer', 'terre' */
  G.VIE = {
    metro: [],
    paris: [['pigeon', 'ciel', -14], ['helico', 'ciel', -22], ['montgolfiere', 'ciel', -5], ['avion', 'ciel', -30]],
    deauville: [['mouette', 'ciel', -16], ['voilier', 'mer', 6], ['avion', 'ciel', -30], ['parapente', 'ciel', -12]],
    normandie: [['tracteur', 'terre', 8], ['mouette', 'ciel', -14], ['montgolfiere', 'ciel', -5], ['vache', 'terre', 2], ['mouton', 'terre', 3]],
    camargue: [['flamant_vol', 'ciel', -20], ['mouette', 'ciel', -14], ['cheval', 'terre', 10]],
    alpes: [['parapente', 'ciel', -14], ['helico', 'ciel', -24], ['vautour', 'ciel', -10], ['moto', 'terre', 24]],
    afriquesud: [['zodiac', 'mer', 22], ['voilier', 'mer', 6], ['mouette', 'ciel', -16], ['helico', 'ciel', -24], ['parapente', 'ciel', -12], ['tout_terrain', 'terre', 14]],
    australie: [['mouette', 'ciel', -16], ['voilier', 'mer', 6], ['kangourou', 'terre', 20]],
    egypte: [['montgolfiere', 'ciel', -5], ['vautour', 'ciel', -10], ['dromadaire', 'terre', 4], ['ane', 'terre', 3]],
    hawaii: [['planche_voile', 'mer', 30], ['voilier', 'mer', 7], ['paille_en_queue', 'ciel', -16], ['helico', 'ciel', -24], ['van', 'terre', 16]],
    irlande: [['mouton', 'terre', 3], ['cheval_noir', 'terre', 12], ['mouette', 'ciel', -14]],
    mediterranee: [['voilier', 'mer', 6], ['catamaran', 'mer', 9], ['zodiac', 'mer', 24], ['dauphin', 'mer', 26], ['mouette', 'ciel', -16]],
    caledonie: [['catamaran', 'mer', 8], ['paille_en_queue', 'ciel', -16], ['helico', 'ciel', -24], ['tout_terrain', 'terre', 14]],
    reunion: [['paille_en_queue', 'ciel', -18], ['parapente', 'ciel', -12], ['helico', 'ciel', -24], ['voilier', 'mer', 6]],
    puy: [['vautour', 'ciel', -10], ['pigeon', 'ciel', -14]],
    stade: [['helico', 'ciel', -24]],
    tunisie: [['dromadaire', 'terre', 4], ['montgolfiere', 'ciel', -5], ['vautour', 'ciel', -10], ['buggy', 'terre', 30], ['tout_terrain', 'terre', 18], ['barque', 'mer', 5]],
    tatooine: [['dromadaire', 'terre', 4], ['vautour', 'ciel', -10], ['buggy', 'terre', 30]],
    madagascar: [['paille_en_queue', 'ciel', -16], ['chauve_souris', 'ciel', -20]],
    niger: [['vautour', 'ciel', -10], ['dromadaire', 'terre', 4]],
    maroc: [['pigeon', 'ciel', -14], ['ane', 'terre', 3], ['montgolfiere', 'ciel', -5]],
    russie: [['pigeon', 'ciel', -14], ['helico', 'ciel', -24]],
    londres: [['pigeon', 'ciel', -14], ['helico', 'ciel', -24]],
    canada: [['pigeon', 'ciel', -14], ['helico', 'ciel', -24], ['montgolfiere', 'ciel', -5]],
    sousmarin: [['raie', 'eau', -10], ['tortue', 'eau', -8], ['dauphin', 'eau', -26], ['poisson_bleu', 'eau', -20], ['poisson_jaune', 'eau', -18]],
  };

  /* Les petits gags du plan moyen : ils se jouent au loin, pour qui regarde bien.
     Acteurs : s = objet ; dx, dy = position ; v = vitesse propre ; hop = sautille */
  const VIGNETTES = {
    tunisie: [{ a: [{ s: 'dromadaire' }], t: 'Enfin de l\'ombre' }, { a: [{ s: 'buggy', v: 40 }, { s: 'dromadaire', dx: -40, v: 40, hop: 1 }], t: 'Doublé par un chameau' }],
    tatooine: [{ a: [{ s: 'mat_antenne' }, { s: 'dromadaire', dx: 22 }], t: 'Ça capte ?' }],
    egypte: [{ a: [{ s: 'dromadaire' }], t: 'Il fait chaud' }, { a: [{ s: 'ane', hop: 1, v: 26 }, { s: 'ane', dx: 30, v: 26 }], t: 'Hi-han !' }],
    normandie: [{ a: [{ s: 'mouton', hop: 2, v: 40 }, { s: 'mouton', dx: 22, hop: 2, v: 40 }, { s: 'mouton', dx: 44, hop: 2, v: 40 }], t: 'La marée ! Bêêê !' }, { a: [{ s: 'vache' }, { s: 'mouton', dx: 34, hop: 1 }], t: 'Meuh ?' }, { a: [{ s: 'tracteur', v: 8 }, { s: 'mouton', dx: 44, hop: 1, v: 8 }], t: 'On fait la course ?' }],
    camargue: [{ a: [{ s: 'flamant' }, { s: 'flamant', dx: 16 }], t: 'Il nous filme ?' }],
    alpes: [{ a: [{ s: 'marmotte', hop: 1 }, { s: 'marmotte', dx: 16, hop: 1 }], t: 'Fuiiit !' }, { a: [{ s: 'bouquetin' }], t: 'Mon meilleur profil' }],
    hawaii: [{ a: [{ s: 'van' }], t: 'Aloha !' }],
    afriquesud: [{ a: [{ s: 'manchot', hop: 1, v: 14 }, { s: 'manchot', dx: -12, hop: 1, v: 14 }, { s: 'manchot', dx: -24, hop: 1, v: 14 }], t: 'Par ici le poisson !' }, { a: [{ s: 'babouin' }], t: 'Beau sac à dos' }],
    australie: [{ a: [{ s: 'kangourou', hop: 2, v: 44 }], t: 'Boing !' }],
    irlande: [{ a: [{ s: 'mouton', hop: 1 }, { s: 'cheval_noir', dx: 30 }], t: 'Il pleut pas' }],
    mediterranee: [{ a: [{ s: 'dauphin', hop: 2, v: 30 }, { s: 'dauphin', dx: 34, hop: 2, v: 30 }], t: 'Hiii hiii !' }],
    niger: [{ a: [{ s: 'dromadaire' }, { s: 'dromadaire', dx: 30 }], t: 'On boit au fleuve ?' }],
    maroc: [{ a: [{ s: 'ane', v: 18 }], t: 'Yallah !' }, { a: [{ s: 'ane' }, { s: 'ane', dx: 26 }], t: 'Hi-han !' }],
    caledonie: [{ a: [{ s: 'tortue', hop: 1 }], t: 'Zen...' }],
    reunion: [{ a: [{ s: 'coureur_panda', v: 34 }], t: 'Dossard 1 !' }, { a: [{ s: 'gecko' }], t: '...' }],
    puy: [{ a: [{ s: 'oie', hop: 2, v: 30 }, { s: 'oie', dx: 14, hop: 2, v: 30 }, { s: 'char_romain', dx: 44, v: 30 }], t: 'Coin coin !' }],
    deauville: [{ a: [{ s: 'mouette' }], t: 'Ma star préférée' }],
    paris: [],
  };

  /* A la preparation du lieu : on prepare sa lumiere et sa vie */
  L.preparer = sc => {
    const m = sc.m;
    sc.lum = {
      sun: m.sun || null,
      motes: [],
      ombres: [],
      leak: { t: rnd(6, 14), T: 0, cote: 0 },
      taches: [],
      passants: [],
      nextPass: rnd(.5, 3),
      nextVig: rnd(2, 6),
      vignettes: [],
      phares: m.nuit && sc.type !== 'int',
    };
    for (let i = 0; i < 26; i++) sc.lum.motes.push({ x: rnd(G.VW), y: rnd(216), v: rnd(4, 14), ph: rnd(6), s: rnd(.4, 1) });
    const terreFerme = sc.def && !sc.def.flotte && !sc.def.sobre && !m.plans.some(p => p.wob >= 1 && p.f > .2);
    if (m.nuages && !m.nuit && sc.type === 'ext' && terreFerme) for (let i = 0; i < 3; i++) sc.lum.ombres.push({ x: rnd(G.VW * 2), w: rnd(90, 240), v: rnd(.4, .8) });
    // ou poser ce qui passe au loin
    const pl = m.plans;
    sc.lum.iCiel = Math.min(1, pl.length - 1);
    sc.lum.iMer = pl.findIndex(p => p.wob >= 1);
    // on ne marche que sur un vrai terrain : ni montagne, ni foret, ni monument, ni eau
    sc.lum.iTerre = D.planTerre(sc);
  };

  function nouveauPassant(sc) {
    // dans une salle, il n'y a pas de lointain
    if (sc.type === 'int' && !sc.def.pleinAir) return;
    let l = (sc.def.vie || G.VIE[sc.def.r] || []).filter(v => D.existe(v[0]));
    // au-dessus des nuages, seul ce qui vole a sa place
    if (sc.def.sobre || sc.def.altitude) l = l.filter(v => v[1] === 'ciel');
    if (!l.length) return;
    // un decor peut dire ce qui n'a rien a faire chez lui
    const sauf = sc.def.sansVie || [];
    const ok = l.filter(v => !sauf.includes(v[0]) && (v[1] === 'ciel' || (v[1] === 'mer' && sc.lum.iMer >= 0) || (v[1] === 'terre' && sc.lum.iTerre >= 0 && !sc.def.flotte) || v[1] === 'eau'));
    if (!ok.length) return;
    const [s, ou, v] = pick(ok);
    let i, y, tag = 's';
    const hy = sc.m.hy;
    if (ou === 'ciel') { i = sc.lum.iCiel; y = rnd(14, Math.max(24, hy - 34)); }
    else if (ou === 'mer') { const p = sc.m.plans[sc.lum.iMer]; i = sc.lum.iMer; y = p.y / G.S + rnd(2, 8) + (sc.def.vie ? rnd(4, 26) : 0); tag = sc.def.vie ? 'm' : 's'; }
    else if (ou === 'eau') { i = 1; y = rnd(30, 120); tag = 'm'; }
    else { i = sc.lum.iTerre; y = 0; tag = 's'; }
    const f = sc.m.plans[i].f;
    // au sol : pas plus grand que ce qui l'entoure sur ce plan
    const e = ou === 'terre' ? D.echPlan(f) : 0;
    if (ou === 'terre') { const sl = D.spr(s, 'l'); tag = e >= .9 ? 'l' : e >= .5 ? 'm' : 's'; }
    // un cheval dessine par le code galope vraiment (1,8 a 2,3 foulees par seconde), ses images calees sur le sol (D.sprAllure) :
    // a 12, ses sabots glissaient (05/11/2026)
    const fo = ou === 'terre' ? D.foulee(s, tag) : 0;
    const vp = fo ? fo * rnd(1.8, 2.3) : v;
    sc.lum.passants.push({ s, i, y, v: vp, f, tag, dist: 0, x: vp - (G.Jeu.w() ? G.Jeu.w().v : 120) * f < 0 ? G.VW + 30 : -30, ph: rnd(6), vol: ou === 'ciel' || ou === 'eau', terre: ou === 'terre' });
  }

  L.maj = (sc, dt, d, W) => {
    const l = sc.lum;
    if (!l) return;
    L.majMeteo(sc, dt, W);
    l.nextPass -= dt;
    if (l.nextPass <= 0 && l.passants.length < 4) { l.nextPass = rnd(2.5, 7); nouveauPassant(sc); }
    const vit = W ? W.v * W.ech : 120;
    for (const p of l.passants) { p.x += (p.v - vit * p.f) * dt; p.dist = (p.dist || 0) + Math.abs(p.v) * dt; }
    l.passants = l.passants.filter(p => p.x > -80 && p.x < G.VW + 90);
    // un petit gag au plan moyen de temps en temps
    l.nextVig -= dt;
    if (l.nextVig <= 0 && l.iTerre >= 0 && !sc.def.flotte && !sc.def.sobre && !sc.def.sansVignette && sc.type === 'ext') {
      l.nextVig = rnd(5, 10);
      const sauf = sc.def.sansVie || [];
      const lv = (VIGNETTES[sc.def.r] || []).filter(v => v.a.every(q => D.existe(q.s) && !sauf.includes(q.s)));
      if (lv.length) {
        const v = pick(lv), p = sc.m.plans[l.iTerre];
        l.vignettes.push({ v, i: l.iTerre, f: p.f, y: Math.min(p.y / G.S + 34, 168), x: G.VW + 30, T: 0, tp: rnd(6) });
      }
    }
    for (const g of l.vignettes) { g.x -= vit * g.f * dt; g.T += dt; g.tp += dt; }
    l.vignettes = l.vignettes.filter(g => g.x > -120);
    for (const m of l.motes) { m.y -= m.v * dt * .3; m.x += (Math.sin(m.ph + G.t * .6) * 8 - vit * .08) * dt; if (m.y < -2) m.y = 216; if (m.x < -2) m.x = G.VW; }
    for (const o of l.ombres) { o.x -= (vit * .22 + 10) * o.v * dt; if (o.x < -o.w) { o.x = G.VW + rnd(10, 200); o.w = rnd(90, 240); } }
    // fuite de lumiere facon Super 8 : de temps en temps, un voile chaud glisse sur le cote de l'image
    l.leak.t -= dt;
    if (l.leak.t <= 0) { l.leak.T = 1.6; l.leak.t = rnd(9, 20); l.leak.cote = Math.random() < .5 ? 0 : 1; }
    if (l.leak.T > 0) l.leak.T -= dt;
  };

  /* Ce qui passe au loin, dessine entre deux plans du decor */
  L.passants = (x, sc, i, camY, T) => {
    const l = sc.lum;
    if (!l) return;
    for (const g of l.vignettes) {
      if (g.i !== i) continue;
      let hautMax = 0;
      for (const q of g.v.a) {
        // un cheval se tient debout s'il ne bouge pas, et galope au rythme de ce qu'il parcourt sinon (D.sprAllure, 05/11/2026)
        const e = D.echPlan(g.f), sp = D.sprAllure(q.s, e >= .9 ? 'l' : e >= .5 ? 'm' : 's', Math.abs(q.v || 0) * g.T * .5, !q.v);
        if (!sp.ok) continue;
        q._x = (q._x || 0) + (q.v || 0) * G.dt;
        const hop = q.hop ? Math.abs(Math.sin(g.tp * (q.hop > 1 ? 8 : 4) + (q.dx || 0))) * (q.hop > 1 ? 5 : 2) : 0;
        const X = g.x + (q.dx || 0) + (q.v || 0) * g.T * .5;
        const py = D.crete(sc, i, X + sp.w / 2) + 1 + (q.dy || 0) - sp.h - hop + camY * Math.max(.1, g.f);
        x.drawImage(sp.img, Math.round(X), Math.round(py));
        hautMax = Math.max(hautMax, sp.h);
      }
      if (g.v.t && g.x < G.VW - 10 && g.x > 10) L.bulle(x, g.v.t, g.x + 10, D.crete(sc, i, g.x + 10) - hautMax - 2 + camY * g.f, 0, g);
    }
    for (const p of l.passants) {
      if (p.i !== i) continue;
      const sp = D.sprAllure(p.s, p.tag, p.dist, false);
      if (!sp.ok) continue;
      const img = D.teinte(sp, sc.m.c_hz, .3);
      if (!img) continue;
      const bob = p.vol ? Math.sin(T * 2 + p.ph) * 2 : 0;
      const py = (p.terre ? D.crete(sc, i, p.x + sp.w / 2) + 1 - sp.h : p.vol ? p.y : p.y - sp.h) + bob + camY * Math.max(.1, p.f);
      if (p.v < 0) { x.save(); x.scale(-1, 1); x.drawImage(img, -Math.round(p.x + sp.w), Math.round(py)); x.restore(); } else x.drawImage(img, Math.round(p.x), Math.round(py));
    }
  };

  function disque(x, cx, cy, r, c) { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }

  /* Ombres de nuages qui balayent le sol */
  L.ombresNuages = (x, sc) => {
    const l = sc.lum;
    if (!l || !l.ombres.length || G.PERF_BAS) return;
    const hy = Math.max(sc.m.hy, 40);
    for (const o of l.ombres) {
      const y0 = hy + 12 + (o.w % 30);
      const cx = o.x + o.w / 2, ry = 9 + o.w * .05;
      x.fillStyle = 'rgba(24,30,80,.06)';
      x.beginPath(); x.ellipse(cx, y0 + ry + 8, o.w * .6, ry, 0, 0, 7); x.fill();
    }
  };

  /* La lumiere devant l'image */
  L.devant = (x, sc, W, T) => {
    const l = sc.lum;
    if (!l) return;
    const hero = W && W.vivant ? { x: G.Jeu.HX, y: W.y - 22 } : null;
    x.save();
    x.globalCompositeOperation = 'lighter';
    if (!G.PERF_BAS) {
      if (l.sun) rayons(x, sc, W, T);
      if (sc.type === 'eau') caustiques(x, sc, W, T);
      if (sc.type === 'int' && sc.m.nuit) projecteurs(x, T);
      if (sc.type === 'int' && !sc.m.nuit) puitsDeLumiere(x, W, T);
    }
    // poussieres qui dansent dans la lumiere
    if (!sc.m.nuit || sc.type === 'int') {
      // la couleur lue une fois, la transparence au centieme : les memes chaines d'une image a l'autre (11/11/2026 : chaque grain
      // faisait une couleur neuve a chaque image, autant de dechets ; un centieme de transparence ne se voit pas sur un grain d'un pixel)
      const c = G.hex(l.sun ? l.sun[2] : '#ffffff');
      for (const m of l.motes) {
        const a = Math.round((.1 + .3 * Math.abs(Math.sin(T * m.s + m.ph))) * 100) / 100;
        x.fillStyle = G.rgb(c, a);
        x.fillRect(m.x | 0, m.y | 0, 1, 1);
      }
    }
    // la nuit, la camera porte une torche : c'est elle qui eclaire la scene
    if (L.torcheAllumee(sc) && hero) torche(x, W, hero);
    // fuite de lumiere
    if (l.leak.T > 0) {
      const a = Math.sin(l.leak.T / 1.6 * Math.PI) * .22;
      const g = x.createLinearGradient(l.leak.cote ? G.VW : 0, 0, l.leak.cote ? G.VW - 150 : 150, 0);
      g.addColorStop(0, `rgba(255,120,40,${a})`); g.addColorStop(.5, `rgba(255,180,70,${a * .5})`); g.addColorStop(1, 'rgba(255,180,70,0)');
      x.fillStyle = g; x.fillRect(0, 0, G.VW, G.VH);
    }
    x.restore();
    pellicule(x, T);
  };

  function rayons(x, sc, W, T) {
    const s = sc.lum.sun, d = W.x - sc.x0;
    const sx = s[0] - d * .008, sy = s[1];
    if (sx < -120 || sx > G.VW + 120) return;
    const c = G.hex(s[2]);
    // halo qui respire
    const b = 1 + Math.sin(T * 1.1) * .06;
    // rayons : de longs pans de lumiere qui tournent tres lentement
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = T * .03 + i * 6.283 / n + Math.sin(i * 3.1) * .22;
      const larg = .05 + .04 * Math.sin(i * 1.7 + T * .3);
      const lg = 340;
      x.fillStyle = G.rgb(c, .022 + .012 * Math.sin(T * .7 + i * 2));
      x.beginPath(); x.moveTo(sx, sy);
      x.lineTo(sx + Math.cos(a - larg) * lg, sy + Math.sin(a - larg) * lg);
      x.lineTo(sx + Math.cos(a + larg) * lg, sy + Math.sin(a + larg) * lg);
      x.fill();
    }
    // reflets d'objectif : ils glissent sur la diagonale soleil -> centre, et suivent le drone
    const cx = G.VW / 2, cy = G.VH / 2 + (W.camY || 0) * 3;
    for (const [k, r, col, al] of [[.45, 7, '#ffd9a0', .13], [.8, 3, '#a0e0ff', .2], [1.25, 12, '#ffb080', .08], [1.6, 5, '#c8ffd8', .14], [2, 20, '#a0c0ff', .06]]) {
      const fx = sx + (cx - sx) * k, fy = sy + (cy - sy) * k;
      // petits octogones de diaphragme
      x.fillStyle = G.rgb(G.hex(col), al * .4);
      x.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * .785 + .39; const px = fx + Math.cos(a) * r, py = fy + Math.sin(a) * r; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
      x.fill();
    }
  }

  function caustiques(x, sc, W, T) {
    // filet de lumiere qui ondule sur le fond
    const d = W.x - sc.x0, y0 = Math.max(120, sc.m.hy - 10);
    x.fillStyle = 'rgba(190,255,245,.16)';
    for (let i = 0; i < 44; i++) {
      const b = i * 37.3;
      const px = ((b - d * .3 + Math.sin(T * .9 + i) * 10) % (G.VW + 40) + G.VW + 40) % (G.VW + 40) - 20;
      const py = y0 + (i * 17 % (216 - y0)) + Math.sin(T * 1.3 + i * 2) * 3;
      x.fillRect(px | 0, py | 0, 9 + i % 13, 1);
    }
  }

  function projecteurs(x, T) {
    for (let i = 0; i < 3; i++) {
      const a = Math.sin(T * .5 + i * 2.1) * .7 + 1.57;
      const sx = G.VW * (.2 + i * .3);
      x.fillStyle = `rgba(${i === 1 ? '255,200,120' : '160,200,255'},.07)`;
      x.beginPath(); x.moveTo(sx, -6); x.lineTo(sx + Math.cos(a - .1) * 300, Math.sin(a - .1) * 300); x.lineTo(sx + Math.cos(a + .1) * 300, Math.sin(a + .1) * 300); x.fill();
    }
  }

  function puitsDeLumiere(x, W, T) {
    for (let i = 0; i < 4; i++) {
      const px = ((i * 170 - (W.x * .2)) % (G.VW + 170) + G.VW + 170) % (G.VW + 170) - 70;
      x.fillStyle = `rgba(255,245,215,${.06 + .02 * Math.sin(T + i)})`;
      x.beginPath(); x.moveTo(px, 0); x.lineTo(px + 34, 0); x.lineTo(px + 8, 216); x.lineTo(px - 40, 216); x.fill();
    }
  }

  function torche(x, W, h) {
    const fr = G.heroFront(W.st), a = fr.ang;
    const cx = G.Jeu.HX + (W.heroDx || 0) + fr.dx, cy = W.y + fr.dy;
    const lg = 250;
    // trois cones l'un dans l'autre : le bord s'adoucit
    for (const [ec, al] of [[.36, .06], [.27, .07], [.17, .08]]) {
      const g = x.createRadialGradient(cx, cy, 6, cx, cy, lg);
      g.addColorStop(0, `rgba(255,235,180,${al})`); g.addColorStop(1, 'rgba(255,235,180,0)');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a - ec) * lg, cy + Math.sin(a - ec) * lg);
      x.lineTo(cx + Math.cos(a + ec) * lg, cy + Math.sin(a + ec) * lg);
      x.fill();
    }
    disque(x, cx, cy, 3, 'rgba(255,240,200,.4)');
  }

  /* Les accidents de la pellicule Super 8 : grains de poussiere, rare rayure. La signature du jeu, a dose discrete. */
  let graines = [], rayure = 0;
  // les chances sont donnees pour une image a 60 images/s : rapportees a la duree de l'image, pour qu'un ecran a 90 ou 120
  // images/s n'ait pas deux fois plus de poussieres (09/11/2026, tests/frequences.js)
  function pellicule(x, T) {
    const k = Math.min(3, (G.dt || 1 / 60) * 60);
    if (Math.random() < .07 * k) graines = Array.from({ length: irnd(1, 3) }, () => ({ x: rnd(G.VW), y: rnd(216), t: .06, c: Math.random() < .5 ? 'rgba(20,16,24,.7)' : 'rgba(255,250,235,.7)', w: irnd(1, 2), h: irnd(1, 3) }));
    for (const g of graines) { if (g.t > 0) { x.fillStyle = g.c; x.fillRect(g.x | 0, g.y | 0, g.w, g.h); g.t -= G.dt; } }
    if (Math.random() < .0012 * k) rayure = .18;
    if (rayure > 0) { rayure -= G.dt; x.fillStyle = 'rgba(255,250,235,.1)'; x.fillRect((Math.sin(T * 40) * 90 + G.VW * .6) | 0, 0, 1, 216); }
  }

  /* ---- Eclairage des personnages et des obstacles ----
     Chaque ambiance a sa lumiere : les acteurs ne sont pas colles sur le decor, ils baignent dedans.
     La nuit ils sont sombres et bleutes, sauf la ou une lumiere les touche (torche, feu de camp, eclair). */
  const TEINTE = {
    nuit_bleue: [8, 14, 52, .62], nuit_desert: [16, 10, 44, .56], rouge: [70, 18, 12, .4], soir_desert: [96, 44, 76, .24], couchant: [96, 44, 76, .22],
    dore: [130, 84, 34, .12], gris_irl: [58, 68, 82, .16], soir_irl: [100, 74, 40, .12], matin_brume: [150, 150, 142, .2], laiteux: [160, 165, 150, .08],
    rose_lagune: [150, 90, 96, .12], salle: [10, 10, 26, .5], eau_bleue: [8, 30, 96, .4], eau_turquoise: [10, 96, 126, .2], argent: [90, 100, 112, .14],
    aube_desert: [150, 110, 130, .08], niamey_soir: [110, 60, 60, .16], moscou_hiver: [110, 120, 140, .12], montreal_automne: [130, 84, 40, .1], marrakech_or: [130, 80, 40, .1],
  };
  let masque = null;
  const trou = (m, x, y, r, f = 1) => {
    const g = m.createRadialGradient(x, y, r * .2, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${f})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g;
    m.fillRect(x - r, y - r, r * 2, r * 2);
  };

  /* ---- Le moteur de lumiere ----
     Une seule liste de lumieres pour une image : explosions, flammes, lampes du lieu, objets qui brillent.
     Chacune agit trois fois : elle ouvre l'obscurite sur les acteurs, les colore (y compris la fumee et les debris),
     et elle eclaire le decor et le sol. */
  const halos = new Map();
  // une tache de lumiere par couleur, en paliers : le degrade reste dans l'esprit pixel
  function tache(c) {
    let t = halos.get(c);
    if (t) return t;
    const N = 72, v = G.hex(c);
    t = G.mk(N, N);
    const R = N / 2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - R + .5, y - R + .5) / R;
      if (d >= 1) continue;
      const q = Math.ceil(Math.pow(1 - d, 1.7) * 16) / 16;
      t.x.fillStyle = `rgba(${v[0]},${v[1]},${v[2]},${q})`;
      t.x.fillRect(x, y, 1, 1);
    }
    halos.set(c, t);
    return t;
  }
  // les lampes du lieu sont fixes dans le monde : on passe dessous
  function lampesDuLieu(W, sc, out) {
    const def = sc.def.lampes;
    if (!def) return;
    const d = W.x - sc.x0;
    const pas = def.pas, x0 = -((d - (def.x0 || 0)) % pas + pas) % pas;
    const vac = n => (def.vacille && ((W.T * 9 + n * 3.3) | 0) % 11 === 0) ? .35 : 1;
    let n = Math.floor(d / pas);
    for (let X = x0; X < G.VW + def.r; X += pas, n++) if (X > -def.r) out.push({ x: X, y: def.y, r: def.r, c: def.c, i: def.i * vac(n), lampe: 1 });
  }
  L.lumieresDe = (W, sc) => {
    const l = [];
    lampesDuLieu(W, sc, l);
    const fx = W.fx;
    if (fx) {
      for (const q of fx.lum) {
        const k = Math.pow(q.T / q.T0, 1.4), v = q.vacille ? .82 + .18 * Math.sin(W.T * q.vacille * 6.3) : 1;
        l.push({ x: q.x, y: q.y, r: q.r * (.75 + .25 * k), c: q.c, i: q.i * k * v });
      }
      for (const q of fx.lueurs) l.push(q);
    }
    return l.filter(q => isFinite(q.x) && isFinite(q.y) && isFinite(q.r) && q.r > 0);
  };
  // ce que la lumiere change sur les acteurs, une fois le masque pose
  function colorerActeurs(a, l) {
    a.globalCompositeOperation = 'source-atop';
    a.imageSmoothingEnabled = true;
    for (const q of l) {
      const f = Math.min(1, q.i) * (q.lampe ? .32 : .62);
      if (f < .02) continue;
      a.globalAlpha = f;
      a.drawImage(tache(q.c), q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
    }
    a.globalAlpha = 1;
    a.imageSmoothingEnabled = false;
    a.globalCompositeOperation = 'source-over';
  }
  /* Sur le decor : additif. Plus le lieu est sombre, plus elle porte. Le sol recoit sa flaque de lumiere. */
  L.eclairerDecor = (x, W, sc, l) => {
    const base = sc.def.penombre || TEINTE[sc.m.amb] || [0, 0, 0, 0], met = sc.met || { k: 0, type: '' };
    const sombre = Math.min(1, base[3] + ({ orage: .3, pluie: .12 }[met.type] || 0) * met.k);
    const force = .42 + sombre * .6;
    const solY = G.SOLF + W.camY + 2;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.imageSmoothingEnabled = true;
    const so = sc.lum && sc.lum.sun;
    if (so && !G.PERF_BAS) {
      const b = 1 + Math.sin(W.T * 1.1) * .06, sx = so[0] - (W.x - sc.x0) * .008;
      x.globalAlpha = .2;
      x.drawImage(tache(so[2]), sx - 130 * b, so[1] - 130 * b, 260 * b, 260 * b);
      x.globalAlpha = 1;
    }
    for (const q of l) {
      const f = Math.min(1.2, q.i) * force * (q.lampe ? .3 : 1);
      if (f < .015) continue;
      const t = tache(q.c);
      x.globalAlpha = Math.min(1, f);
      x.drawImage(t, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
      // le sol : la tache s'ecrase, et faiblit avec la hauteur
      const h = solY - q.y;
      if (h > -8 && h < q.r * 1.2 && !sc.def.flotte) {
        const k = 1 - Math.max(0, h) / (q.r * 1.2), rx = q.r * (.55 + .4 * k), ry = Math.max(4, rx * .13);
        x.globalAlpha = Math.min(1, f * k * 1.5);
        x.drawImage(t, q.x - rx, solY - ry, rx * 2, ry * 2);
      }
    }
    // le cone sous les lampes, visible dans l'air
    for (const q of l) if (q.lampe && !G.PERF_BAS) {
      const h = solY - q.y, g = x.createLinearGradient(0, q.y, 0, solY);
      const v = G.hex(q.c);
      g.addColorStop(0, `rgba(${v[0]},${v[1]},${v[2]},${.1 * Math.min(1, q.i)})`);
      g.addColorStop(1, `rgba(${v[0]},${v[1]},${v[2]},0)`);
      x.globalAlpha = 1;
      x.fillStyle = g;
      x.beginPath(); x.moveTo(q.x - 7, q.y); x.lineTo(q.x + 7, q.y); x.lineTo(q.x + 7 + h * .3, solY); x.lineTo(q.x - 7 - h * .3, solY); x.fill();
    }
    x.imageSmoothingEnabled = false;
    x.restore();
    for (const q of l) if (q.lampe) {
      x.fillStyle = '#2a2833'; x.fillRect(q.x - 11, q.y - 3, 22, 3);
      x.fillStyle = q.i > .5 ? '#fff8e0' : '#9a9484'; x.fillRect(q.x - 10, q.y - 1, 20, 1.4);
    }
  };

  L.eclairer = (a, sc, W, T, lum, xDecor) => {
    if (!masque || masque.lw !== G.VW) masque = G.mkE(G.VW, G.VH);
    const pen = sc.def.penombre;
    const base = pen || TEINTE[sc.m.amb] || [0, 0, 0, 0];
    const met = sc.met || { k: 0, type: '' };
    const sombre = { orage: .34, pluie: .16, averse: .06, sable: .12, brouillard: .1, neige: .05 }[met.type] || 0;
    const k = sombre * met.k;
    const flash = met.eclair > 0 ? Math.min(1, met.eclair * 6) : 0;
    let al = (base[3] + (1 - base[3]) * k) * (1 - flash * .9);
    const col = k > base[3] ? [28, 34, 56] : base;
    if (al > .015) {
      const m = masque.x;
      m.globalCompositeOperation = 'source-over';
      m.clearRect(0, 0, G.VW, G.VH);
      m.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${al})`;
      m.fillRect(0, 0, G.VW, G.VH);
      m.globalCompositeOperation = 'destination-out';
      // toutes les lumieres de l'image ouvrent l'obscurite
      for (const q of lum) trou(m, q.x, q.y, q.r * (q.lampe ? 1.2 : 1.05), Math.min(1, q.i));
      if (pen && xDecor) xDecor.drawImage(masque, 0, 0);
      if (W.vivant) {
        const hx = G.Jeu.HX + (W.heroDx || 0), hy = W.y - 22;
        // le heros est toujours un peu eclaire : il reste lisible
        trou(m, hx, hy + 6, 50, 1);
        if (L.torcheAllumee(sc)) {
          const fr = G.heroFront(W.st), an = fr.ang, lg = 250, ec = .36, fx = hx + fr.dx, fy = W.y + fr.dy;
          const g = m.createRadialGradient(fx, fy, 8, fx, fy, lg);
          g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.6, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          m.fillStyle = g;
          m.beginPath(); m.moveTo(fx, fy);
          m.lineTo(fx + Math.cos(an - ec) * lg, fy + Math.sin(an - ec) * lg);
          m.lineTo(fx + Math.cos(an + ec) * lg, fy + Math.sin(an + ec) * lg);
          m.fill();
        }
      }
      // les sources de lumiere du decor : feu de camp, lampadaires et projecteurs du jeu
      const d = W.x - sc.x0;
      for (const n of (sc.def.fx || [])) {
        const f = /^feu:(.+),(.+)$/.exec(n);
        if (f) { const vac = 1 + Math.sin(T * 11) * .08; trou(m, +f[1] * G.PW - d * (sc.rf[Math.floor(+f[2] * G.PH)] || .3), +f[2] * G.PH - 14, 120 * vac, .95); }
      }
      for (const o of W.obs) {
        if ((o.k === 'col' || o.k === 'sprite') && (o.s === 'lampadaire' || o.s === 'projecteur' || o.s === 'mat_projecteurs')) trou(m, o.x, o.haut ? 60 : (o.ytop || o.y - 60) + 8, 80, .9);
      }
      m.globalCompositeOperation = 'source-over';
      a.globalCompositeOperation = 'source-atop';
      a.drawImage(masque, 0, 0);
      a.globalCompositeOperation = 'source-over';
    }
    if (lum.length) colorerActeurs(a, lum);
    // le soleil enveloppe ce qui est de son cote : une lumiere chaude qui vient de la bonne direction
    const so = sc.lum && sc.lum.sun;
    if (so && !G.PERF_BAS) {
      const sx = so[0] - (W.x - sc.x0) * .008, sy = so[1];
      a.globalCompositeOperation = 'source-atop';
      const g = a.createRadialGradient(sx, sy, 20, sx, sy, 260);
      const c = G.hex(so[2]);
      g.addColorStop(0, G.rgb(c, .26 * (1 - k))); g.addColorStop(1, G.rgb(c, 0));
      a.fillStyle = g;
      a.fillRect(0, 0, G.VW, G.VH);
      a.globalCompositeOperation = 'source-over';
    }
    if (flash > 0) {
      a.globalCompositeOperation = 'source-atop';
      a.fillStyle = `rgba(235,240,255,${flash * .5})`;
      a.fillRect(0, 0, G.VW, G.VH);
      a.globalCompositeOperation = 'source-over';
    }
  };
  // ce lieu est-il assez sombre pour qu'on doive eclairer le heros ?
  L.sombre = sc => { const b = sc.def.penombre || TEINTE[sc.m.amb] || [0, 0, 0, 0]; return b[3] >= .3 || !!sc.m.nuit || L.torcheAllumee(sc); };
  L.torcheAllumee = sc => sc.type !== 'int' && (sc.m.nuit || (sc.met && sc.met.type === 'orage' && sc.met.k > .4)) || sc.m.amb === 'eau_bleue' || sc.m.amb === 'salle';

  /* ---- La meteo : elle change pendant qu'on est dans le decor ---- */
  G.METEO = {
    normandie: ['pluie', 'brouillard', 'pluie', 'vent'], irlande: ['pluie', 'pluie', 'brouillard', 'orage'], paris: ['pluie', 'orage', 'vent'], deauville: ['pluie', 'vent', 'orage'],
    camargue: ['vent', 'sable', 'averse'], alpes: ['neige', 'neige', 'brouillard', 'orage'], afriquesud: ['vent', 'brouillard', 'pluie'], australie: ['averse', 'vent'],
    egypte: ['sable', 'sable', 'vent'], hawaii: ['averse', 'averse', 'orage', 'vent'], mediterranee: ['averse', 'vent', 'brouillard', 'orage'], caledonie: ['averse', 'vent', 'orage'],
    reunion: ['averse', 'brouillard', 'orage'], puy: ['pluie', 'vent'], madagascar: ['averse', 'orage', 'vent'], niger: ['sable', 'vent'], maroc: ['sable', 'vent'],
    russie: ['neige', 'neige', 'brouillard'], londres: ['pluie', 'pluie', 'brouillard'], canada: ['pluie', 'vent', 'neige'], stade: ['pluie', 'orage'], tunisie: ['sable', 'sable', 'vent'], tatooine: ['sable', 'sable'],
  };
  const DIT_METEO = {
    pluie: ['Ma caméra n\'est pas étanche !', 'Il pleut sur le plan !', 'On couvre le matos !', 'Ça, ce n\'était pas prévu'],
    averse: ['Ça rince !', 'Soleil et pluie : j\'adore', 'Vise la lumière !'],
    orage: ['Sors pas le trépied !', 'Quelle lumière !', 'Je suis un paratonnerre !', 'Pas le moment !'],
    neige: ['Il neige !', 'Magnifique...', 'Mes piles vont geler'],
    brouillard: ['Je ne vois rien !', 'Ça fait très film d\'auteur', 'Effet spécial gratuit'],
    sable: ['Du sable dans l\'objectif !', 'Mes dents !', 'Quelle ambiance !'],
    vent: ['Ça décoiffe !', 'Tiens bon, le drone !'],
  };
  const DIT_GENS = {
    pluie: ['Mon brushing !', 'Il pleut !', 'Un abri !', 'Et mon parapluie ?'], averse: ['Ça mouille !', 'Oh !'], orage: ['Aaah !', 'Rentrez !', 'Ça tonne !'],
    sable: ['Je n\'y vois rien !', 'Quel vent !'], neige: ['Il neige !', 'Enfin !'], vent: ['Mon chapeau !', 'Ça souffle !'], brouillard: ['Vous êtes où ?', 'Ho ho ?'],
  };
  L.majMeteo = (sc, dt, W) => {
    if (!sc.met) {
      const r = sc.def.r;
      const dehors = sc.type !== 'eau' && (sc.type !== 'int' || r === 'stade' || r === 'puy');
      sc.met = { type: '', k: 0, cible: 0, t: dehors ? rnd(12, 34) : 1e9, eclair: 0, bolt: null, arc: 0, gouttes: [], tEclair: rnd(2, 5), dehors };
      for (let i = 0; i < 110; i++) sc.met.gouttes.push({ x: rnd(G.VW), y: rnd(216), v: rnd(.7, 1.3), z: rnd(.5, 1.3), ph: rnd(6) });
    }
    const m = sc.met;
    if (!m.dehors) return;
    m.t -= dt;
    if (m.t <= 0) {
      if (m.cible === 1) { if (m.type === 'pluie' || m.type === 'averse') m.arc = sc.m.nuit ? 0 : 1; m.cible = 0; m.t = rnd(8, 16); }
      else {
        const l = G.METEO[sc.def.r];
        // le beau temps reste la regle : il ne se gate qu'une fois sur trois
        if (Math.random() > .34) m.t = rnd(14, 34);
        else if (l && l.length && m.k < .05) {
          m.type = pick(l); m.cible = 1; m.t = rnd(13, 24);
          if (W && W.vivant && !W.demo) {
            const dit = DIT_METEO[m.type];
            if (dit && !W.bulleH) W.bulleH = { t: pick(dit), T: 2 };
            const dg = DIT_GENS[m.type];
            if (dg) for (const f of W.figs) if (f.d && !f.tombe && Math.random() < .5) { if (!(f.bulleT > 0)) { f.bulle = pick(dg); f.bulleT = 1.4; } if (m.type !== 'vent') { f.pose = 'course'; f.v = (f.v || 0) + 30; } }
          }
        } else m.t = 1;
      }
    }
    m.k += (m.cible - m.k) * Math.min(1, dt * .55);
    if (m.arc > 0 && m.k < .3) m.arc = Math.min(1, m.arc);
    if (m.arc > 0 && m.cible === 0) { m.arcT = (m.arcT || 0) + dt; if (m.arcT > 14) { m.arc = 0; m.arcT = 0; } }
    if (m.type === 'averse' && m.cible === 1 && m.k > .5 && !sc.m.nuit) m.arc = 1;
    if (m.eclair > 0) m.eclair -= dt;
    if (m.type === 'orage' && m.k > .5) {
      m.tEclair -= dt;
      if (m.tEclair <= 0) {
        m.tEclair = rnd(2.5, 7);
        m.eclair = .28;
        // un eclair qui zigzague jusqu'au sol
        const b = []; let px = rnd(60, G.VW - 60), py = -4;
        while (py < sc.m.hy + 20) { b.push([px, py]); px += rnd(-16, 16); py += rnd(8, 20); }
        m.bolt = b;
        setTimeout(() => { if (G.Audio) G.Audio.sfx('tonnerre'); }, 350);
        if (W && W.vivant && !W.demo) { W.secousse = Math.max(W.secousse, 2); W.st.mood = 'peur'; W.st.moodT = .5; }
      }
    }
    if (G.Audio && G.Audio.pluie) G.Audio.pluie(['pluie', 'averse', 'orage'].includes(m.type) ? m.k : (m.type === 'sable' || m.type === 'vent') ? m.k * .5 : 0);
    const vit = W ? W.v * W.ech : 120;
    for (const g of m.gouttes) {
      if (m.type === 'neige') { g.y += 26 * g.v * dt; g.x += (Math.sin(G.t + g.ph) * 14 - vit * .18 * g.z) * dt; }
      else if (m.type === 'sable' || m.type === 'vent') { g.x -= (vit * .9 + 240) * g.z * dt; g.y += Math.sin(G.t * 3 + g.ph) * 12 * dt; }
      else { g.y += 330 * g.v * dt; g.x -= (vit * .4 + 40) * g.z * dt; }
      if (g.y > 216) { g.y = rnd(-12, 0); g.x = rnd(G.VW * 1.3); }
      if (g.x < -8) { g.x = G.VW + rnd(30); if (m.type === 'sable' || m.type === 'vent') g.y = rnd(216); }
    }
  };
  /* Dans le ciel : l'arc-en-ciel et les eclairs passent derriere les reliefs */
  L.dansLeCiel = (x, sc, d) => {
    const m = sc.met;
    if (!m) return;
    if (m.arc > 0) {
      const a = Math.min(1, (1 - m.k) * 1.4 + (m.type === 'averse' ? .5 : 0)) * .34;
      const cx = 300 - d * .012, cy = sc.m.hy + 26;
      const cols = ['#ff5a5a', '#ffa54a', '#ffe65a', '#6fe07a', '#5ac8ff', '#a07aff'];
      x.save(); x.lineWidth = 3;
      cols.forEach((c, i) => { x.strokeStyle = G.rgb(G.hex(c), a); x.beginPath(); x.arc(cx, cy, 118 - i * 3, Math.PI, 0); x.stroke(); });
      x.restore();
    }
    if (m.bolt && m.eclair > 0) {
      x.save();
      x.strokeStyle = 'rgba(180,200,255,.5)'; x.lineWidth = 3;
      x.beginPath(); m.bolt.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
      x.strokeStyle = '#fff'; x.lineWidth = 1; x.stroke();
      x.restore();
    }
  };
  /* Le voile sur le fond : la couverture nuageuse assombrit le paysage */
  L.voileMeteo = (x, sc) => {
    const m = sc.met;
    if (!m || m.k < .02) return;
    const c = { orage: [22, 26, 52, .46], pluie: [56, 66, 88, .26], averse: [90, 110, 130, .12], brouillard: [205, 208, 208, .3], sable: [190, 130, 70, .32], neige: [210, 222, 238, .16] }[m.type];
    if (!c) return;
    x.fillStyle = G.rgb(c, c[3] * m.k);
    x.fillRect(0, 0, G.VW, G.VH);
    if (m.eclair > 0) { x.fillStyle = `rgba(225,232,255,${Math.min(.75, m.eclair * 3)})`; x.fillRect(0, 0, G.VW, G.VH); }
  };
  /* Devant tout : pluie, neige, sable, bancs de brume */
  L.meteoDevant = (x, sc, W, T) => {
    const m = sc.met;
    if (!m || m.k < .03) return;
    const n = Math.floor(m.gouttes.length * m.k);
    const t = m.type;
    if (t === 'pluie' || t === 'orage' || t === 'averse') {
      const nn = t === 'averse' ? n * .7 | 0 : n;
      x.fillStyle = t === 'averse' ? 'rgba(235,245,255,.6)' : 'rgba(200,215,240,.55)';
      for (let i = 0; i < nn; i++) { const g = m.gouttes[i]; x.fillRect(g.x | 0, g.y | 0, 1, g.z > 1 ? 6 : 4); }
      // la pluie rebondit sur le sol
      x.fillStyle = 'rgba(230,240,255,.65)';
      for (let i = 0; i < nn / 3; i++) { const g = m.gouttes[i]; const ph = (T * 3 + g.ph) % 1; const sx = (g.ph * 80 + i * 37) % G.VW, sy = G.SOLF + (i % 7) + 2; x.fillRect(sx - ph * 3 | 0, sy - ph * 2 | 0, 1, 1); x.fillRect(sx + ph * 3 | 0, sy - ph * 2 | 0, 1, 1); }
    } else if (t === 'neige') {
      x.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < n; i++) { const g = m.gouttes[i]; const s = g.z > 1 ? 2 : 1; x.fillRect(g.x | 0, g.y | 0, s, s); }
    } else if (t === 'sable') {
      x.fillStyle = 'rgba(232,190,120,.62)';
      for (let i = 0; i < n; i++) { const g = m.gouttes[i]; x.fillRect(g.x | 0, g.y | 0, 4 + g.z * 8 | 0, 1); }
    } else if (t === 'vent') {
      x.fillStyle = 'rgba(255,255,255,.4)';
      for (let i = 0; i < n * .3; i++) { const g = m.gouttes[i]; x.fillRect(g.x | 0, g.y | 0, 14 + g.z * 12 | 0, 1); }
      for (let i = 0; i < n * .2; i++) { const g = m.gouttes[i + 40]; x.fillStyle = i % 2 ? '#a8c85a' : '#e0a03a'; x.fillRect(g.x | 0, g.y + Math.sin(T * 7 + g.ph) * 4 | 0, 2, 1); }
    } else if (t === 'brouillard') {
      for (let i = 0; i < 8; i++) {
        const w = 170 + i * 26, sx = ((i * 113 - (W.x - sc.x0) * (.5 + i * .09)) % (G.VW + w) + G.VW + w) % (G.VW + w) - w;
        const y = 34 + i * 22;
        x.fillStyle = `rgba(232,236,236,${.13 * m.k})`;
        x.fillRect(sx | 0, y, w, 16); x.fillRect(sx + 18 | 0, y - 5, w - 36, 26);
      }
    }
  };

  /* ---- Fete : confettis pour les paliers et le record ---- */
  L.confettis = (W, n = 70) => {
    const cols = ['#ff5a6e', '#ffd54a', '#6fe6ff', '#7dff8a', '#c79bff', '#ffffff', '#ff9a4a'];
    for (let i = 0; i < n; i++) W.parts.push({ x: rnd(G.VW), y: rnd(-40, -4), vx: rnd(-50, 30), vy: rnd(30, 110), g: 60, T: rnd(1.6, 3), c: pick(cols), s: pick([1, 2, 2]), conf: rnd(6) });
  };
})();
