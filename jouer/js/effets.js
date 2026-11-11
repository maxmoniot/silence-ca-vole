/* Les effets : ce qui casse, ce qui fume, ce qui brille.
   - les eclats sont decoupes dans la vraie image de l'objet, ils tournent, rebondissent et restent au sol ;
   - la fumee et les eclats vivent sur le calque des acteurs : ils recoivent donc la lumiere du lieu et celle des explosions ;
   - le feu et les etincelles emettent leur propre lumiere : ils ne sont jamais assombris et ils eclairent ce qui les entoure.
   Toute lumiere passe par FX.lumiere (qui dure) ou FX.lueur (une image), le moteur de lumiere.js fait le reste. */
'use strict';
(function () {
  const FX = G.FX = {};
  const { rnd, pick, clamp } = G;

  /* ---- Etat ---- */
  FX.nouveau = W => { W.fx = { eclats: [], fumee: [], etin: [], feu: [], ondes: [], lum: [], lueurs: [] }; };
  const plafond = () => G.PERF_BAS ? { eclats: 26, fumee: 18, etin: 40 } : { eclats: 70, fumee: 46, etin: 110 };
  const sous = W => W.sc && W.sc.type === 'eau';

  /* ---- Lumieres ---- */
  // qui dure : elle decroit et suit le decor
  FX.lumiere = (W, x, y, r, c, i, T = .35, vacille = 0) => { W.fx.lum.push({ x, y, r, c, i, T, T0: T, vacille }); };
  // pour une seule image (une lampe, un objet qui brille)
  FX.lueur = (W, x, y, r, c, i) => { W.fx.lueurs.push({ x, y, r, c, i }); };

  /* ---- Fumee : boules dessinees une fois pour toutes, eclairees par le haut, qui se dissolvent en pixels ---- */
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const TONS = {
    suie: ['#8c8791', '#5e5a68', '#3a3744', '#262430'],
    fumee: ['#d9d6d2', '#a8a5ab', '#77747f', '#55525e'],
    vapeur: ['#ffffff', '#e8eef4', '#c6d0dc', '#a4b0c0'],
    bulle: ['#ffffff', '#bfefff', '#6fc7ea', '#3f90bd'],
    poussiere: ['#e3d6bc', '#c2b193', '#9a8a70', '#75684f'],
  };
  const TAILLES = [4, 6, 8, 11, 14, 18, 23, 29];
  const puffs = new Map();
  function tonPoussiere(col) { const c = G.hex(col); return ['#' + hx2(mixL(c, .45)), '#' + hx2(c), '#' + hx2(mixO(c, .22)), '#' + hx2(mixO(c, .42))]; }
  const hx2 = v => v.map(a => Math.round(clamp(a, 0, 255)).toString(16).padStart(2, '0')).join('');
  const mixL = (c, k) => c.map((a, i) => a * (1 - k) + [255, 245, 225][i] * k);
  const mixO = (c, k) => c.map((a, i) => a * (1 - k) + [34, 28, 62][i] * k);
  function puff(ton, taille, fondu) {
    const cle = (typeof ton === 'string' ? ton : ton.join()) + '|' + taille + '|' + fondu;
    let c = puffs.get(cle);
    if (c) return c;
    const R = TAILLES[taille], pal = typeof ton === 'string' ? TONS[ton] : ton, D = R * 2 + 4;
    c = G.mk(D, D);
    const X = c.x, cx = R + 2;
    // quelques bosses, pour un nuage et non un disque
    const bosses = [];
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + taille, d = R * .5; bosses.push([Math.cos(a) * d, Math.sin(a) * d, R * (.42 + .1 * ((i * 7 + taille) % 3))]); }
    bosses.push([0, 0, R * .72]);
    for (let py = 0; py < D; py++) for (let px = 0; px < D; px++) {
      const a = px - cx, b = py - cx;
      let h = -1;
      for (const q of bosses) { const dd = Math.hypot(a - q[0], b - q[1]); if (dd < q[2]) h = Math.max(h, 1 - dd / q[2]); }
      if (h < 0) continue;
      if (fondu && BAYER[py & 3][px & 3] < fondu * 4) continue;
      const lum = (-b / R) * .62 + (-a / R) * .2 + h * .5;
      X.fillStyle = pal[lum > .62 ? 0 : lum > .2 ? 1 : lum > -.22 ? 2 : 3];
      X.fillRect(px, py, 1, 1);
    }
    if (puffs.size > 800) puffs.clear();
    puffs.set(cle, c);
    return c;
  }
  // la fumee prend la couleur de l'air du lieu : doree au couchant, bleue la nuit
  const tonsLieu = new Map();
  function tonDuLieu(W, ton) {
    if (typeof ton !== 'string' || ton === 'bulle') return ton;
    const hz = W.sc && W.sc.m && W.sc.m.c_hz;
    if (!hz) return ton;
    const cle = ton + hz.join();
    let p = tonsLieu.get(cle);
    if (!p) { p = TONS[ton].map((c, i) => { const v = G.hex(c), k = .16 + i * .09; return '#' + hx2(v.map((a, j) => a * (1 - k) + hz[j] * k)); }); tonsLieu.set(cle, p); }
    return p;
  }
  FX.fumee = (W, x, y, o = {}) => {
    const f = W.fx.fumee;
    if (f.length >= plafond().fumee) f.shift();
    const T = o.T || rnd(.6, 1.2);
    f.push({ x, y, vx: o.vx === undefined ? rnd(-20, 20) : o.vx, vy: o.vy === undefined ? rnd(-30, -8) : o.vy, ton: o.ton || 'fumee', r0: o.r0 === undefined ? 1 : o.r0, r1: o.r1 === undefined ? 4 : o.r1, T, T0: T, freine: o.freine === undefined ? 2.4 : o.freine, monte: o.monte === undefined ? -16 : o.monte });
  };

  /* ---- Boule de feu : 10 images peintes une fois ---- */
  const FEU_PAL = ['#fffbe0', '#ffe27a', '#ffb545', '#ff7a2e', '#d63f1f', '#7c2420'];
  const feux = new Map();
  function feuImages(R) {
    let l = feux.get(R);
    if (l) return l;
    l = [];
    const dephase = []; for (let i = 0; i < 16; i++) dephase.push(Math.random());
    for (let f = 0; f < 10; f++) {
      const k = (f + 1) / 10, c = G.mk(R * 2 + 4, R * 2 + 4), X = c.x, cx = R + 2;
      const rayon = R * (1 - Math.pow(1 - k, 3)) ;
      for (let py = 0; py < R * 2 + 4; py++) for (let px = 0; px < R * 2 + 4; px++) {
        const a = px - cx, b = py - cx, d = Math.hypot(a, b);
        const an = (Math.atan2(b, a) + Math.PI) / 6.2832 * 16;
        const bord = rayon * (.72 + .28 * dephase[an | 0 & 15] * (1 + .3 * Math.sin(k * 8 + an)));
        if (d > bord) continue;
        const q = d / (bord || 1);
        // en vieillissant le feu se creuse et noircit par le centre et par le bas
        const age = Math.pow(k, 1.6) * 5.2 + q * 1.8 + (b / R) * .8 * k - 1.2;
        const n = Math.floor(clamp(age + (BAYER[py & 3][px & 3] / 16 - .5) * .9, 0, 5.99));
        if (k > .78 && BAYER[py & 3][px & 3] < (k - .78) * 72) continue;
        X.fillStyle = FEU_PAL[n];
        X.fillRect(px, py, 1, 1);
      }
      l.push(c);
    }
    feux.set(R, l);
    return l;
  }
  FX.boule = (W, x, y, R = 26, retard = 0, duree = .42) => {
    feuImages(R);
    W.fx.feu.push({ x, y, R, t: -retard, T: duree });
  };

  /* ---- Etincelles : un petit trait qui file, blanc puis orange puis rouge ---- */
  const ET_COL = ['#ffffff', '#fff4a8', '#ffd54a', '#ffb545', '#ff7a2e', '#c8391f'];
  FX.etincelles = (W, n, x, y, o = {}) => {
    const e = W.fx.etin, s = o.force || 170;
    for (let i = 0; i < n; i++) {
      if (e.length >= plafond().etin) e.shift();
      const a = o.a !== undefined ? o.a + rnd(-(o.ouv || .6), o.ouv || .6) : rnd(6.283), v = rnd(s * .25, s);
      const T = rnd(.22, o.T || .6);
      e.push({ x, y, vx: Math.cos(a) * v - W.v * .35, vy: Math.sin(a) * v, g: o.g === undefined ? 340 : o.g, T, T0: T, cols: o.cols || ET_COL, flotte: !!o.flotte });
    }
  };

  /* ---- Eclats ---- */
  const cartes = new Map();
  // une carte de l'image : ou y a-t-il vraiment quelque chose a decouper ?
  function pleine(img, sx, sy, sw, sh) {
    let m = cartes.get(img);
    if (m === undefined) {
      try {
        const c = G.mk(img.width, img.height);
        c.x.drawImage(img, 0, 0);
        m = c.x.getImageData(0, 0, img.width, img.height).data;
      } catch (e) { m = null; }
      cartes.set(img, m);
    }
    if (!m) return true;
    let n = 0;
    for (let y = sy; y < sy + sh; y += 2) for (let x = sx; x < sx + sw; x += 2) if (m[(y * img.width + x) * 4 + 3] > 128) n++;
    return n > 2;
  }
  // la couleur moyenne d'un objet : c'est la teinte de sa poussiere
  const moyennes = new Map();
  function teinteDe(img) {
    if (moyennes.has(img)) return moyennes.get(img);
    let r = '#a89f8c';
    pleine(img, 0, 0, 1, 1);
    const m = cartes.get(img);
    if (m) {
      let a = 0, b = 0, c = 0, n = 0;
      for (let i = 0; i < m.length; i += 28) if (m[i + 3] > 128) { a += m[i]; b += m[i + 1]; c += m[i + 2]; n++; }
      if (n) r = '#' + hx2([a / n, b / n, c / n]);
    }
    moyennes.set(img, r);
    return r;
  }
  function ajoutEclat(W, q) {
    const l = W.fx.eclats;
    if (l.length >= plafond().eclats) {
      // on retire d'abord ce qui est deja pose par terre
      const i = l.findIndex(e => e.pose);
      l.splice(i >= 0 ? i : 0, 1);
    }
    l.push(q);
  }
  /* Decoupe une image en morceaux irreguliers et les projette.
     cx, cy, a : centre et angle de l'objet a l'ecran ; w, h : sa taille en unites de jeu */
  FX.briser = (W, img, cx, cy, w, h, a = 0, o = {}) => {
    const S = G.S, nw = img.width, nh = img.height;
    const pas = o.pas || clamp(Math.sqrt(nw * nh / (o.n || 12)), 7, 32);
    const force = o.force || 150, poids = o.poids || 1;
    const cs = Math.cos(a), sn = Math.sin(a);
    let py = 0;
    while (py < nh) {
      const ph = Math.min(nh - py, Math.round(pas * rnd(.7, 1.3)));
      let px = 0;
      while (px < nw) {
        const pw = Math.min(nw - px, Math.round(pas * rnd(.7, 1.4)));
        if (pw > 2 && ph > 2 && pleine(img, px, py, pw, ph)) {
          const lx = (px + pw / 2) / nw * w - w / 2, ly = (py + ph / 2) / nh * h - h / 2;
          const X = cx + lx * cs - ly * sn, Y = cy + lx * sn + ly * cs;
          const d = Math.hypot(X - cx, Y - cy) || 1, an = Math.atan2(Y - cy, X - cx) + rnd(-.5, .5), v = rnd(.45, 1.1) * force;
          ajoutEclat(W, { img, sx: px, sy: py, sw: pw, sh: ph, w: pw / nw * w, h: ph / nh * h, x: X, y: Y, a, va: rnd(5, 17) * (Math.random() < .5 ? -1 : 1), vx: Math.cos(an) * v + (o.vx || 0), vy: Math.sin(an) * v - rnd(30, 110), g: 460 * poids, reb: o.reb === undefined ? .42 : o.reb, T: rnd(1.6, 3.2), pose: false });
        }
        px += pw;
      }
      py += ph;
    }
  };
  /* Un objet entier qui part en tournant (un oiseau assomme ne se casse pas : il s'en va) */
  FX.valser = (W, img, cx, cy, w, h, o = {}) => {
    ajoutEclat(W, { img, sx: 0, sy: 0, sw: img.width, sh: img.height, w, h, x: cx, y: cy, a: 0, va: rnd(7, 13) * (Math.random() < .5 ? -1 : 1), vx: rnd(40, 150), vy: rnd(-210, -130), g: 520, reb: .3, T: 2.2, pose: false, flip: !!o.flip });
  };
  /* Petits morceaux sans image : debris de plastique, de metal, de verre */
  FX.debris = (W, n, x, y, cols, o = {}) => {
    for (let i = 0; i < n; i++) {
      const s = rnd(1.2, o.gros || 3.4), an = rnd(6.283), v = rnd(30, o.force || 190);
      ajoutEclat(W, { col: pick(cols), w: s, h: s * rnd(.4, 1), x, y, a: rnd(6), va: rnd(-16, 16), vx: Math.cos(an) * v - W.v * .2, vy: Math.sin(an) * v - 60, g: o.g || 460, reb: .4, T: rnd(.8, 2.2), pose: false });
    }
  };
  FX.onde = (W, x, y, r = 34, c = '255,240,190') => { W.fx.ondes.push({ x, y, r, c, t: 0 }); };

  /* ---- Ce qui se casse : chaque matiere a sa facon de finir ---- */
  const MATIERES = [
    [/mouette|pigeon|chauve|flamant|paille_en_queue|vautour|poisson|meduse|anguille/, 'vivant'],
    [/neon|lampadaire|projecteur|rampe_projos|lanterne|bouteille/, 'verre'],
    [/ballon|sac_plastique|chapeau|cerf_volant|parasol|tapis|bouee|filet|botte|baguette|voile|montgolfiere|parapente|drapeau/, 'leger'],
    [/branche|tronc|planche|pagaie|rame|fourche|crosse|canne|boomerang|belier|barriere|arbre|sapin|palmier|cocotier|filao|pommier|pandanus|cactus|roseaux|hampe|poteau|barre_but|lance/, 'bois'],
    [/rocher|colonne|obelisque|corail/, 'pierre'],
  ];
  const matiereDe = nom => { for (const [re, m] of MATIERES) if (re.test(nom || '')) return m; return 'metal'; };
  FX.matiereDe = matiereDe;

  FX.fracasser = (W, o) => {
    const barre = o.skin;
    const nom = o.skin || o.s;
    const sp = nom ? G.Decor.spr(nom, 'l') : null;
    let cx = o.x, cy = o.yc !== undefined ? o.yc : o.y;
    let w = 20, h = 12;
    if (sp && sp.ok) { w = sp.w; h = sp.h; }
    if (o.k === 'col' && sp && sp.ok) { cy = o.haut ? G.PLAFOND - 8 + sp.h / 2 : o.y - sp.h / 2; }
    if (o.k === 'sprite') { w = o.w; h = o.h; cy = o.type === 'pend' ? o.yh + o.h / 2 : o.type === 'arche' ? o.yd - o.dh * .5 : o.y - o.h / 2; }
    const mS = o.k === 'struct' ? G.Structures.MATIERES[o.m] : null;
    if (mS) { w = Math.min(o.w, 160); h = 30; }
    const eau = sous(W), mat = mS ? (mS.empile ? 'pierre' : mS.ajoure ? 'metal' : 'bois') : sp && sp.ok ? matiereDe(nom) : 'metal';
    const vx = -W.v * .15;
    const teinte = mS ? mS.c : sp && sp.ok ? teinteDe(sp.img) : '#a89f8c';
    const tonP = tonPoussiere(teinte);
    if (mS) G.Structures.briser(W, o, vx);
    else if (sp && sp.ok) {
      if (mat === 'vivant') {
        FX.valser(W, sp.img, cx, cy, sp.w, sp.h, { flip: true });
      } else if (barre && o.len) {
        // une barre : les morceaux suivent toute sa longueur
        const n = Math.max(1, Math.round(o.len / (sp.w * 1.35))), lg = o.len / n, cs = Math.cos(o.a || 0), sn = Math.sin(o.a || 0);
        for (let i = 0; i < n; i++) {
          const d = -o.len / 2 + (i + .5) * lg;
          FX.briser(W, sp.img, cx + d * cs, cy + d * sn, lg, Math.max(sp.h, 10), o.a || 0, { n: mat === 'verre' ? 12 : 8, vx, force: mat === 'leger' ? 90 : 160, poids: mat === 'leger' ? .45 : 1 });
        }
      } else {
        FX.briser(W, sp.img, cx, cy, w, h, 0, { n: o.k === 'sprite' ? 20 : 14, vx, force: mat === 'leger' ? 90 : 170, poids: mat === 'leger' ? .45 : 1 });
      }
    } else FX.debris(W, 14, cx, cy, ['#3a3c48', '#8f97a6', o.c || '#ff3b5c'], { force: 200 });

    if (eau) {
      for (let i = 0; i < 16; i++) FX.fumee(W, cx + rnd(-16, 16), cy + rnd(-10, 10), { ton: 'bulle', r0: 0, r1: rnd(.5, 2), vy: rnd(-70, -24), T: rnd(.6, 1.3), monte: -40, freine: 1 });
      FX.lumiere(W, cx, cy, 80, '#bff0ff', .5, .3);
      return;
    }
    switch (mat) {
      case 'vivant':
        // pouf de dessin anime, plumes
        for (let i = 0; i < 7; i++) FX.fumee(W, cx + rnd(-9, 9), cy + rnd(-7, 7), { ton: 'vapeur', r0: 1, r1: rnd(2, 4), T: rnd(.3, .6), vx: rnd(-40, 40), vy: rnd(-40, 30) });
        for (let i = 0; i < 12; i++) ajoutEclat(W, { col: pick(['#ffffff', '#f0ece4', teinte]), w: rnd(1.4, 2.8), h: .7, x: cx + rnd(-6, 6), y: cy + rnd(-6, 6), a: rnd(6), va: rnd(-5, 5), vx: rnd(-70, 70), vy: rnd(-90, 10), g: 34, reb: 0, T: rnd(.9, 1.8), plume: rnd(6), pose: false });
        break;
      case 'leger':
        for (let i = 0; i < 9; i++) FX.fumee(W, cx + rnd(-w * .4, w * .4), cy + rnd(-h * .4, h * .4), { ton: tonP, r0: 1, r1: rnd(2, 4), T: rnd(.35, .8), vx: rnd(-50, 50) + vx, vy: rnd(-44, 24) });
        FX.etincelles(W, 5, cx, cy, { force: 110, T: .35 });
        FX.lumiere(W, cx, cy, 60, '#fff0c8', .35, .18);
        break;
      case 'bois':
        for (let i = 0; i < 11; i++) FX.fumee(W, cx + rnd(-w * .4, w * .4), cy + rnd(-h * .4, h * .4), { ton: tonP, r0: 1, r1: rnd(3, 5), T: rnd(.5, 1.1), vx: rnd(-60, 60) + vx, vy: rnd(-50, 20) });
        FX.debris(W, 10, cx, cy, [teinte, '#c9a26a', '#8a6236'], { gros: 3.2, force: 210 });
        FX.etincelles(W, 7, cx, cy, { force: 130, T: .4 });
        FX.lumiere(W, cx, cy, 70, '#ffd59a', .45, .2);
        break;
      case 'pierre':
        for (let i = 0; i < 14; i++) FX.fumee(W, cx + rnd(-w * .4, w * .4), cy + rnd(-h * .4, h * .4), { ton: tonP, r0: 2, r1: rnd(4, 6), T: rnd(.7, 1.4), vx: rnd(-70, 70) + vx, vy: rnd(-46, 14) });
        FX.debris(W, 12, cx, cy, [teinte, '#8c8580', '#5e5a60'], { gros: 3.6, force: 220 });
        FX.etincelles(W, 6, cx, cy, { force: 150, T: .35 });
        FX.lumiere(W, cx, cy, 60, '#ffe7c2', .35, .16);
        W.secousse = Math.max(W.secousse, 4);
        break;
      case 'verre':
        // le coup de jus : eclair froid, verre en pluie, etincelles qui tombent
        FX.debris(W, 22, cx, cy, ['#ffffff', '#cdf3ff', '#8fdcff', '#e8fbff'], { gros: 2.2, force: 240 });
        FX.etincelles(W, 34, cx, cy, { force: 240, T: .9, cols: ['#ffffff', '#cdf3ff', '#8fdcff', '#fff4a8', '#ffb545', '#ff7a2e'], g: 420 });
        FX.lumiere(W, cx, cy, 130, '#bfe9ff', 1.1, .24, 22);
        FX.onde(W, cx, cy, 30, '190,235,255');
        for (let i = 0; i < 5; i++) FX.fumee(W, cx + rnd(-10, 10), cy + rnd(-6, 6), { ton: 'suie', r0: 0, r1: rnd(2, 3), T: rnd(.6, 1.1) });
        break;
      default:
        // metal : la vraie explosion
        FX.boule(W, cx, cy, 26);
        FX.boule(W, cx + rnd(-16, 16), cy + rnd(-12, 12), 16, .05);
        FX.boule(W, cx + rnd(-16, 16), cy + rnd(-12, 12), 16, .1);
        FX.etincelles(W, 30, cx, cy, { force: 260, T: .8 });
        FX.debris(W, 10, cx, cy, ['#3a3c48', '#8f97a6', '#5e6270'], { gros: 3, force: 220 });
        for (let i = 0; i < 10; i++) FX.fumee(W, cx + rnd(-14, 14), cy + rnd(-10, 10), { ton: 'suie', r0: 1, r1: rnd(3, 6), T: rnd(.8, 1.7), vx: rnd(-30, 30) + vx, vy: rnd(-34, -6) });
        FX.lumiere(W, cx, cy, 170, '#ffb545', 1.25, .45, 18);
        FX.onde(W, cx, cy, 38);
        W.secousse = Math.max(W.secousse, 3.5);
        W.arret = Math.max(W.arret || 0, .045);
    }
  };

  /* Le souffle au sol, un atterrissage, une raclure */
  FX.pouf = (W, x, y, n = 6, f = 1) => {
    const ton = tonPoussiere(sol(W));
    for (let i = 0; i < n; i++) FX.fumee(W, x + rnd(-6, 6), y, { ton, r0: 0, r1: rnd(1, 3), T: rnd(.3, .7), vx: rnd(-60, 60) * f - W.v * .5, vy: rnd(-26, -4) });
  };
  function sol(W) {
    const c = W.sc && W.sc.m && W.sc.m.c_sol;
    return c ? '#' + hx2(c) : '#c8bea8';
  }
  /* L'armure saute : plaques, etincelles et coup de lumiere froide */
  FX.armure = (W, x, y) => {
    FX.debris(W, 12, x, y, ['#c6ccd8', '#8f97a6', '#6a7180', '#ffd54a'], { gros: 3.4, force: 220 });
    FX.etincelles(W, 22, x, y, { force: 240, T: .6 });
    FX.lumiere(W, x, y, 110, '#dff0ff', .9, .22, 14);
    FX.onde(W, x, y, 28, '220,235,255');
    for (let i = 0; i < 5; i++) FX.fumee(W, x + rnd(-8, 8), y + rnd(-8, 8), { ton: 'suie', r0: 0, r1: rnd(2, 3), T: rnd(.4, .8) });
  };
  /* Le drone meurt */
  FX.crash = (W, x, y) => {
    FX.boule(W, x + 8, y - 4, 22);
    FX.boule(W, x - 12, y + 4, 14, .05);
    FX.etincelles(W, 46, x, y, { force: 300, T: 1 });
    FX.debris(W, 22, x, y, ['#f6f6f2', '#c9a13a', '#3a3c4a', '#8a8c9c', '#23242e'], { gros: 4, force: 280 });
    for (let i = 0; i < 16; i++) FX.fumee(W, x + rnd(-18, 18), y + rnd(-14, 14), { ton: 'suie', r0: 1, r1: rnd(4, 7), T: rnd(1, 2.1), vx: rnd(-30, 30), vy: rnd(-40, -8) });
    FX.lumiere(W, x, y, 240, '#ffb545', 1.5, .7, 16);
    FX.onde(W, x, y, 44);
    W.arret = .09;
  };

  /* Le drone touche le sol */
  FX.impact = (W, x, y) => {
    FX.boule(W, x, y - 6, 26);
    FX.etincelles(W, 30, x, y, { a: -1.57, ouv: 1.3, force: 280, T: .7 });
    FX.debris(W, 18, x, y - 4, ['#f6f6f2', '#c9a13a', '#3a3c4a', '#8a8c9c', '#23242e'], { gros: 4, force: 240 });
    for (let i = 0; i < 12; i++) FX.pouf(W, x + rnd(-14, 14), G.SOLF - 1, 1, 1.4);
    for (let i = 0; i < 8; i++) FX.fumee(W, x + rnd(-14, 14), y - rnd(0, 12), { ton: 'suie', r0: 1, r1: rnd(3, 6), T: rnd(.8, 1.6), vy: rnd(-40, -10) });
    FX.lumiere(W, x, y - 8, 170, '#ffb545', 1.2, .5, 16);
    FX.onde(W, x, y - 4, 36);
    W.secousse = Math.max(W.secousse, 8);
    W.arret = Math.max(W.arret || 0, .06);
  };

  /* ---- La percee du debut : on entre en scene en traversant le mur du metro ---- */
  function peindreMur(larg, trouX, trouY) {
    const c = G.mkE(larg, 216), x = c.x;
    // le local technique, derriere le mur
    const zone = trouX;
    x.fillStyle = '#17161f'; x.fillRect(0, 0, zone, 216);
    x.fillStyle = '#1f1e2a'; x.fillRect(0, 0, zone, 18); x.fillRect(0, 200, zone, 16);
    x.fillStyle = '#2c2a38'; for (let i = 0; i < zone; i += 22) x.fillRect(i, 200, 11, 2);
    for (const [py, col] of [[34, '#3b3a4a'], [46, '#4a3b34'], [160, '#3b3a4a']]) {
      x.fillStyle = col; x.fillRect(0, py, zone, 6);
      x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(0, py, zone, 1);
      x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, py + 5, zone, 1);
      for (let i = 12; i < zone; i += 34) { x.fillStyle = '#23222e'; x.fillRect(i, py - 1, 3, 8); }
    }
    G.txt(x, 'LOCAL', zone * .42, 76, '#5a5868', { al: .5, sc: 1 });
    G.txt(x, 'CAMERA', zone * .42, 86, '#5a5868', { al: .5, sc: 1 });
    // le mur : carreaux de metro, joints, biseaux
    const W0 = trouX, LM = larg - trouX;
    x.fillStyle = '#6b6a72'; x.fillRect(W0, 0, LM, 216);
    for (let r = 0; r * 7 < 216; r++) {
      const dec = r % 2 ? 6 : 0;
      for (let q = -1; q * 12 < LM + 12; q++) {
        const tx = W0 + q * 12 + dec, ty = r * 7;
        const a = Math.max(tx, W0), b = Math.min(tx + 11, W0 + LM);
        if (b <= a) continue;
        const v = (r * 7 + q * 13) % 5;
        x.fillStyle = ['#f0ecdf', '#e9e5d6', '#f4f0e4', '#e4e0d0', '#efebdd'][Math.abs(v)];
        x.fillRect(a, ty + .6, b - a, 6);
        x.fillStyle = '#ffffff'; x.fillRect(a, ty + .6, b - a, .6);
        x.fillStyle = '#c9c4b2'; x.fillRect(a, ty + 6, b - a, .6);
      }
    }
    // frise bleue du metro, et l'ombre du mur sur le cote
    x.fillStyle = '#1f4f8c'; x.fillRect(W0, 62, LM, 5); x.fillRect(W0, 192, LM, 3);
    x.fillStyle = '#6fa0d8'; x.fillRect(W0, 62, LM, .6);
    x.fillStyle = 'rgba(30,26,60,.35)'; x.fillRect(W0, 0, 2, 216);
    return c;
  }
  FX.lancerPercee = W => {
    const trouX = 74, larg = 74 + 38;
    W.percee = { c: peindreMur(larg, trouX), x: 0, trouX, larg, t: 0, choc: .42, casse: false, y: 124, dx: -150 };
    W.heroDx = -150;
  };
  FX.majPercee = (W, dt) => {
    const p = W.percee;
    if (!p) return;
    p.t += dt;
    if (!p.casse) {
      // il arrive de plus en plus vite
      const k = p.t / p.choc;
      W.heroDx = -150 + k * k * (p.trouX - 26 - G.Jeu.HX + 150);
      W.y = p.y; W.vy = 0;
      W.st.flex = .85; W.st.tilt = -.12;
      if (p.t >= p.choc) percer(W, p);
    } else {
      p.x -= W.v * dt;
      W.heroDx *= Math.pow(.004, dt);
      if (Math.abs(W.heroDx) < .5) W.heroDx = 0;
      if (p.titre && p.t > p.choc + 1) { W.titre = p.titre; p.titre = null; }
      if (p.x + p.larg < -4 && !W.heroDx && !p.titre) { W.percee = null; W.heroDx = 0; }
    }
  };
  function percer(W, p) {
    p.casse = true;
    const yc = p.y - 12, xm = p.trouX + (p.larg - p.trouX) / 2;
    const X = p.c.x;
    // les carreaux qui sautent sont decoupes dans le mur lui-meme
    const copie = G.mk(p.c.width, p.c.height); copie.x.drawImage(p.c, 0, 0);
    const S = G.S;
    for (let i = 0; i < 46; i++) {
      const a = rnd(6.283), d = Math.pow(Math.random(), .6) * 36;
      const tx = p.trouX + 4 + rnd(0, p.larg - p.trouX - 8), ty = yc + Math.sin(a) * d;
      const n = rnd(7, 15) * S | 0, m = rnd(5, 10) * S | 0;
      const sx = clamp(tx * S | 0, 0, copie.width - n), sy = clamp(ty * S | 0, 0, copie.height - m);
      ajoutEclat(W, { img: copie, sx, sy, sw: n, sh: m, w: n / S, h: m / S, x: tx, y: ty, a: rnd(-.3, .3), va: rnd(-15, 15), vx: rnd(60, 340), vy: rnd(-190, 90), g: 480, reb: .38, T: rnd(2, 3.6), pose: false, carreau: true });
    }
    // le trou : bords dechiquetes, on voit la brique et le noir du local
    const brique = [['#8c4a34', 30], ['#3a2f2e', 24]];
    for (const [col, rc] of brique) {
      X.fillStyle = col;
      for (let i = 0; i < 56; i++) {
        const a = i / 56 * 6.283, r = rc + ((i * 37) % 7) - 2;
        X.fillRect(xm + Math.cos(a) * r * .9 - 5, yc + Math.sin(a) * r - 4, 10, 8);
      }
      X.beginPath(); X.ellipse(xm, yc, rc * .9, rc, 0, 0, 7); X.fill();
    }
    // explosion de poussiere vers l'avant, lumiere crue qui entre
    const tonM = tonPoussiere('#d9d2bd');
    for (let i = 0; i < 26; i++) FX.fumee(W, xm + rnd(-6, 26), yc + rnd(-30, 30), { ton: tonM, r0: 2, r1: rnd(4, 7), T: rnd(.7, 1.7), vx: rnd(30, 190), vy: rnd(-46, 40), freine: 2.8 });
    FX.etincelles(W, 22, xm + 6, yc, { a: 0, ouv: 1.2, force: 300, T: .6 });
    FX.debris(W, 22, xm, yc, ['#f0ecdf', '#c9c4b2', '#8c4a34', '#1f4f8c'], { force: 320, gros: 3 });
    FX.lumiere(W, xm + 14, yc, 170, '#fff0cf', .95, .45);
    FX.onde(W, xm + 6, yc, 62, '255,245,220');
    W.secousse = 9; W.arret = .07;
    G.Audio && G.Audio.sfx('crash');
    G.vibre('heavy');
    W.bulleH = { t: 'Silence, ça vole !', T: 2.2 };
    // sur le quai, tout le monde sursaute
    for (const f of W.figs) if (f.x > 0 && f.x < G.VW && !f.tombe) { f.pose = Math.random() < .5 ? 'saute' : 'panique'; f.hop = 1; if (!f.bulle && Math.random() < .35) { f.bulle = pick(['Ça va pas ?!', 'Mon mur !', 'Oh là !', 'Le ticket ?!']); f.bulleT = 1.6; } }
  }
  FX.dessinerPercee = (x, W) => { const p = W.percee; if (p) x.drawImage(p.c, p.x, 0); };

  /* ---- Mise a jour ---- */
  FX.maj = (W, dt) => {
    const fx = W.fx;
    if (!fx) return;
    const v = W.v * (W.ech || 1), solY = G.SOLF, eau = sous(W);
    for (const e of fx.eclats) {
      e.T -= dt;
      if (e.pose) { e.x -= v * dt; continue; }
      if (e.plume !== undefined) {
        // une plume descend en se balancant
        e.vx += (-v * .6 - e.vx) * dt * 3;
        e.vy += (22 - e.vy) * dt * 2.5;
        e.x += (e.vx + Math.sin(W.T * 4 + e.plume) * 26) * dt; e.y += e.vy * dt; e.a = Math.sin(W.T * 4 + e.plume) * .9;
        continue;
      }
      // l'air freine : dans la scene, un debris finit par rester en arriere
      e.vx += (-v * .8 - e.vx) * dt * (eau ? 2.8 : 1.1);
      e.vy += e.g * (eau ? .22 : 1) * dt;
      if (eau) e.vy *= 1 - dt * 2;
      e.x += e.vx * dt; e.y += e.vy * dt; e.a += e.va * dt;
      if (e.y > solY - 1 && e.vy > 0 && !(W.sc && W.sc.def && W.sc.def.flotte) && !eau) {
        e.y = solY - 1;
        if (e.vy > 90 && e.reb) {
          e.vy *= -e.reb; e.va *= .6; e.vx += (-v - e.vx) * .55;
          if (Math.random() < .25) FX.pouf(W, e.x, solY - 1, 1, .4);
        } else { e.pose = true; e.vy = 0; e.a = Math.round(e.a / 3.1416) * 3.1416; }
      }
    }
    fx.eclats = fx.eclats.filter(e => e.T > 0 && e.x > -40 && e.y < G.VH + 30);
    for (const f of fx.fumee) {
      f.T -= dt;
      f.vx += (-v * .72 - f.vx) * dt * f.freine * .5;
      f.vy += (f.monte - f.vy) * dt * 1.6;
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
    fx.fumee = fx.fumee.filter(f => f.T > 0 && f.x > -50);
    for (const s of fx.etin) {
      s.T -= dt; s.px = s.x; s.py = s.y;
      s.vy += s.g * dt; s.vx *= 1 - dt * 1.2;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y > solY && s.vy > 0) { s.y = solY; s.vy *= -.45; s.vx = s.vx * .6 - v * .4; }
    }
    fx.etin = fx.etin.filter(s => s.T > 0);
    for (const b of fx.feu) {
      if (b.t >= 0) { b.x -= v * .7 * dt; b.y -= 16 * dt; }
      const avant = b.t;
      b.t += dt;
      // la flamme eclaire tant qu'elle brule
      if (b.t >= 0 && b.t < b.T) FX.lueur(W, b.x, b.y, b.R * 5, '#ff9a3c', (1 - b.t / b.T) * .9);
      // quand elle s'eteint, elle laisse sa fumee
      if (avant < b.T * .55 && b.t >= b.T * .55) for (let i = 0; i < 3; i++) FX.fumee(W, b.x + rnd(-b.R * .4, b.R * .4), b.y + rnd(-b.R * .4, b.R * .4), { ton: 'suie', r0: 2, r1: Math.min(7, 3 + b.R / 12), T: rnd(.7, 1.3) });
    }
    fx.feu = fx.feu.filter(b => b.t < b.T);
    for (const o of fx.ondes) { o.t += dt * 3.4; o.x -= v * dt; }
    fx.ondes = fx.ondes.filter(o => o.t < 1);
    for (const l of fx.lum) { l.T -= dt; l.x -= v * dt * .9; }
    fx.lum = fx.lum.filter(l => l.T > 0);
  };

  /* ---- Dessin ---- */
  // sur le calque des acteurs : recoit la lumiere
  FX.dessinerFumee = (a, W, avant) => {
    const fx = W.fx; if (!fx) return;
    const S = G.S;
    for (let i = 0; i < fx.fumee.length; i++) {
      const f = fx.fumee[i];
      if ((i % 3 === 0) !== !!avant) continue;
      const k = 1 - f.T / f.T0, t = clamp(Math.round(f.r0 + (f.r1 - f.r0) * Math.sqrt(k)), 0, TAILLES.length - 1), dissous = clamp(Math.floor(k * k * 4), 0, 3);
      const im = puff(tonDuLieu(W, f.ton), t, dissous);
      a.drawImage(im, f.x - im.width / S / 2, f.y + W.camY * .4 - im.height / S / 2);
    }
  };
  FX.dessinerEclats = (a, W) => {
    const fx = W.fx; if (!fx) return;
    const solY = G.SOLF + W.camY, flotte = W.sc && W.sc.def && W.sc.def.flotte;
    // leur ombre au sol
    if (!sous(W) && !flotte) {
      a.fillStyle = 'rgba(0,0,0,.22)';
      for (const e of fx.eclats) {
        if (e.plume !== undefined) continue;
        const d = solY - e.y;
        if (d < 80 && d >= 0) { const q = e.w * (1 - d / 110); a.fillRect(e.x - q / 2, solY, q, .7); }
      }
    }
    for (const e of fx.eclats) {
      const fin = Math.min(1, e.T * 3);
      if (fin < 1) a.globalAlpha = fin;
      a.save();
      a.translate(e.x, e.y + (e.pose ? W.camY : W.camY * .5));
      a.rotate(e.a);
      if (e.img) a.drawImage(e.img, e.sx, e.sy, e.sw, e.sh, -e.w / 2, -e.h / 2, e.w, e.h);
      else { a.fillStyle = e.col; a.fillRect(-e.w / 2, -e.h / 2, e.w, e.h); }
      a.restore();
      a.globalAlpha = 1;
    }
  };
  // par-dessus tout : ce qui emet sa propre lumiere
  FX.dessinerEmissif = (x, W) => {
    const fx = W.fx; if (!fx) return;
    const S = G.S;
    for (const b of fx.feu) {
      if (b.t < 0) continue;
      const l = feuImages(b.R), im = l[clamp(Math.floor(b.t / b.T * l.length), 0, l.length - 1)];
      x.drawImage(im, b.x - im.width / S / 2, b.y - im.height / S / 2);
    }
    for (const s of fx.etin) {
      const k = 1 - s.T / s.T0, c = s.cols[clamp(Math.floor(k * s.cols.length), 0, s.cols.length - 1)];
      x.fillStyle = c;
      const dx = s.x - (s.px === undefined ? s.x : s.px), dy = s.y - (s.py === undefined ? s.y : s.py);
      const n = clamp(Math.ceil(Math.hypot(dx, dy) * S), 1, 7);
      for (let i = 0; i < n; i++) x.fillRect(s.x - dx * i / n, s.y - dy * i / n, .6, .6);
    }
    for (const o of fx.ondes) {
      x.strokeStyle = `rgba(${o.c},${(1 - o.t) * .85})`;
      x.lineWidth = 2.4 * (1 - o.t) + .4;
      x.beginPath(); x.arc(o.x, o.y, 5 + (1 - Math.pow(1 - o.t, 2.4)) * o.r, 0, 6.3); x.stroke();
    }
  };
})();
