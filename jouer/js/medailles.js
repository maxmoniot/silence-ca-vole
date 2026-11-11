/* Les medailles de bonus (retour de Max du 03/11/2026 : « trop moches, enleve le texte »).
   Les boutons a gauche et les bonus a ramasser sur le parcours sont une meme medaille : couronne d'or, picto du bonus
   sur un disque de sa couleur. Celle qu'on attrape file vers son bouton et l'allume.
   Aucun texte : la couronne d'or est la jauge, les pastilles d'or les charges, le gris dit « pas pret »,
   un eclat dit « de nouveau pret », un halo dit « en marche ». Tout est peint au pixel pres, a la definition de l'ecran. */
'use strict';
(function () {
  const M = G.Medailles = {};
  const K = '#17151f', K0 = G.hex(K), BL = [255, 255, 255], CORAIL = G.hex('#ff5a4a');
  const clamp = G.clamp;
  const mel = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  const DB = 40, DP = 38;                 // diametre en pixels : bouton, bonus du parcours
  // les boutons, les uns sous les autres a gauche : c = la medaille (unites de jeu), pas = la hauteur d'appui de chacun
  // (Max, 04/11/2026) plus a droite et un peu plus bas : en paysage, la camera frontale du Pixel 6 (trou rond au milieu du bord
  // gauche) tombait sur le 2e et le 3e bouton, et le premier touchait le COMBO (tests/boutons_bonus.js)
  // a gauche, sous les coeurs (descendus a 78 en 1.9, revenus a 64 : « le personnage passe derriere les coeurs », Max, 07/11/2026)
  // y 69 : sous les coeurs, descendus avec eux de 5 unites le 08/11/2026 (avant 64)
  G.BTN = { y: 69, pas: 29, c: DB / G.S };
  // x 24 ; la colonne entiere s'ecarte d'une encoche plus profonde que la camera du Pixel 6 (G.libre, 09/11/2026 ; sans encoche, 24)
  Object.defineProperty(G.BTN, 'x', { enumerable: true, get: () => G.libre(24, G.BTN.y, G.BTN.c + 8, 4 * G.BTN.pas + G.BTN.c, 1) });

  /* Les pictos : 12 x 12 cases de 2 pixels. W blanc, w blanc a l'ombre, A accent, a accent sombre, B creux sombre. */
  const PICTOS = {
    // un sablier : le sable file d'un bulbe a l'autre
    ralenti: ['..WWWWWWWW..', '..wwwwwwww..', '..W......W..', '..WAAAAAAW..', '...WaAAaW...', '....WAAW....', '....WA.W....', '...W.A..W...', '..W..A...W..', '..W.aAAa.W..', '..WWWWWWWW..', '..wwwwwwww..'],
    // deux chevrons qui foncent
    turbo: ['............', '.WW...WW....', '.WWW..WWW...', '..WWW..WWW..', '...WWW..WWW.', '....WWW..WWW', '....www..www', '...www..www.', '..www..www..', '.www..www...', '.ww...ww....', '............'],
    // un ecu, liseré d'or
    bouclier: ['............', '.WWWWWWWWWW.', '.WAAAAAAAAw.', '.WAWWWwwwAw.', '.WAWWWwwwAw.', '.WAWWWwwwAw.', '.WAWWWwwwAw.', '..WAWWwwAw..', '...WAWwAw...', '....WAAw....', '.....Ww.....', '............'],
    // une fusee qui file a droite, comme celles du bazooka : nez rouge, hublot, ailerons, flamme
    roquette: ['............', '............', '..RR........', '..RRR.......', '..WWWWWWRR..', 'aAWWWBBWWRRR', 'aAwwwBBwwRRR', '..wwwwwwRR..', '..RRR.......', '..RR........', '............', '............'],
    // le bonus de la statuette d'or : tout saute (une explosion d'or, ses eclats blancs)
    oscar: ['.....W......', '.W...W...W..', '..W..W..W...', '...WAAAW....', '...AAAAA....', 'WWWAAaAAWWW.', '...AAAAA....', '...WAAAW....', '..W..W..W...', '.W...W...W..', '.....W......', '............'],
  };
  const DISQUE = {
    ralenti: ['#341c66', '#4f2f99', '#6e4bc9', '#9476ea'],
    turbo: ['#14502a', '#1f783a', '#31a24d', '#5fcf6e'],
    bouclier: ['#11376b', '#1b559b', '#2b7fca', '#57abea'],
    roquette: ['#5e1a10', '#8f2d17', '#bf4820', '#e9703a'],
    oscar: ['#4a0d14', '#7a1420', '#a81e2c', '#d8344a'],
    gris: ['#23222d', '#2f2e3b', '#3c3a4b', '#4a485c'],
  };
  const ACCENT = { ralenti: ['#ffd23f', '#e0952a'], turbo: ['#ffe066', '#c9a227'], bouclier: ['#ffd23f', '#e0952a'], roquette: ['#ffe066', '#ff8a2a'], oscar: ['#ffd23f', '#e0952a'] };
  const OR = ['#6e3d0e', '#a8661a', '#e2a12c', '#ffd64c', '#fff3b4'];       // du plus sombre au plus clair
  const ETEINT = ['#16151f', '#22212d', '#2f2d3c', '#403e50', '#555368'];

  function palette(k, gris, dq) {
    if (gris) return { W: G.hex('#aeacbe'), w: G.hex('#82808f'), A: G.hex('#9a97a8'), a: G.hex('#75727f'), B: dq[0], R: G.hex('#82808f') };
    const W = G.hex('#fffaf0');
    return { W, w: mel(W, dq[1], .38), A: G.hex(ACCENT[k][0]), a: G.hex(ACCENT[k][1]), B: mel(dq[0], K0, .35), R: G.hex('#ff4a3d') };
  }

  /* Les pixels fixes d'une medaille : la couronne allumee (or) et eteinte, le disque, le picto ; ang = place sur la couronne (0 en haut, sens des aiguilles) */
  const memo = new Map();
  function couches(k, D, gris) {
    const cle = k + ':' + D + ':' + (gris ? 1 : 0);
    let e = memo.get(cle);
    if (e) return e;
    const N = D * D, A = new Uint8ClampedArray(N * 4), E = new Uint8ClampedArray(N * 4), ang = new Float32Array(N).fill(-1), bord = new Uint8Array(N);
    const R0 = D / 2, ep = 3, rIn = R0 - 1.4 - ep, rD = rIn - 1;
    const dq = DISQUE[gris ? 'gris' : k].map(G.hex), or = OR.map(G.hex), et = ETEINT.map(G.hex);
    const mets = (n, a, b) => { b = b || a; A[n * 4] = a[0]; A[n * 4 + 1] = a[1]; A[n * 4 + 2] = a[2]; A[n * 4 + 3] = 255; E[n * 4] = b[0]; E[n * 4 + 1] = b[1]; E[n * 4 + 2] = b[2]; E[n * 4 + 3] = 255; };
    for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
      const dx = i + .5 - R0, dy = j + .5 - R0, r = Math.hypot(dx, dy), n = j * D + i;
      if (r >= R0 - .3) continue;
      if (r >= R0 - 1.4) { mets(n, K0); bord[n] = 1; continue; }
      const face = -(dx + dy) / r * Math.SQRT1_2;      // 1 : tourne vers la lumiere, en haut a gauche
      if (r >= rIn) {
        // la couronne en biseau : le bord exterieur regarde dehors, le bord interieur regarde dedans
        const q = (r - rIn) / ep, l = q > .67 ? face : q < .34 ? -face * .8 : .2 + face * .35;
        const t = l > .6 ? 4 : l > .18 ? 3 : l > -.25 ? 2 : l > -.62 ? 1 : 0;
        mets(n, or[t], et[t]);
        ang[n] = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
        if (q > .67 && ang[n] > .85 && ang[n] < .9) mets(n, BL, et[4]);
        continue;
      }
      if (r >= rD) { mets(n, mel(dq[0], K0, .55)); continue; }
      // le disque, bombe : clair en haut a gauche, sombre en bas a droite
      const u = dx / rD, v = dy / rD, nz = Math.sqrt(Math.max(0, 1 - u * u - v * v)), l = -u * .42 - v * .5 + nz * .62;
      mets(n, dq[l > .8 ? 3 : l > .52 ? 2 : l > .2 ? 1 : 0]);
    }
    // le picto, cerne d'un pixel sombre
    const P = PICTOS[k], o = Math.round((D - 24) / 2), pal = palette(k, gris, dq), dedans = new Map();
    P.forEach((l, cj) => { for (let ci = 0; ci < 12; ci++) { const ch = l[ci]; if (ch === '.') continue; for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) dedans.set((o + cj * 2 + b) * D + o + ci * 2 + a, pal[ch]); } });
    for (const n of dedans.keys()) {
      const i = n % D, j = (n / D) | 0;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = (j + b) * D + i + a; if (!dedans.has(m) && A[m * 4 + 3]) mets(m, K0); }
    }
    for (const [n, c] of dedans) mets(n, c);
    e = { A, E, ang, bord };
    memo.set(cle, e);
    return e;
  }

  const mix = (d, n, c, t) => { for (let q = 0; q < 3; q++) d[n * 4 + q] += (c[q] - d[n * 4 + q]) * t; };
  /* Une medaille. f : part allumee de la couronne (la jauge). seg / on : couronne en segments, on allumes (les chocs du bouclier).
     blanc : eclat. brille : position du reflet qui la traverse. teinte : refus (rouge). */
  const toiles = new Map();
  function medaille(k, D, o) {
    const f = Math.round(clamp(o.f === undefined ? 1 : o.f, 0, 1) * 72), seg = o.seg || 0, on = o.on || 0, bl = Math.round((o.blanc || 0) * 10) / 10, sh = o.brille === undefined ? -99 : o.brille, ti = o.teinte ? 1 : 0;
    const cle = k + ':' + D + ':' + (o.gris ? 1 : 0) + ':' + f + ':' + seg + ':' + on + ':' + bl + ':' + sh + ':' + ti;
    let c = toiles.get(cle);
    if (c) return c;
    if (toiles.size > 700) toiles.clear();
    const e = couches(k, D, !!o.gris), N = D * D, circ = 2 * Math.PI * (D / 2 - 3);
    c = G.mk(D, D);
    const im = c.x.createImageData(D, D), d = im.data;
    for (let n = 0; n < N; n++) {
      let s = e.A;
      const a = e.ang[n];
      if (a >= 0) {
        if (seg > 1) {
          const q = a * seg;
          if ((q % 1) * circ / seg < 2) { d[n * 4] = K0[0]; d[n * 4 + 1] = K0[1]; d[n * 4 + 2] = K0[2]; d[n * 4 + 3] = 255; continue; }
          s = Math.floor(q) < on ? e.A : e.E;
        } else s = a < f / 72 ? e.A : e.E;
      }
      d[n * 4] = s[n * 4]; d[n * 4 + 1] = s[n * 4 + 1]; d[n * 4 + 2] = s[n * 4 + 2]; d[n * 4 + 3] = s[n * 4 + 3];
      if (!d[n * 4 + 3] || e.bord[n]) continue;
      if (sh > -99) { const z = (n % D) + ((n / D) | 0) - sh; if (z >= 0 && z < 4) mix(d, n, BL, z === 0 || z === 3 ? .3 : .55); }
      if (ti) mix(d, n, CORAIL, .5);
      if (bl) mix(d, n, BL, bl);
    }
    c.x.putImageData(im, 0, 0);
    toiles.set(cle, c);
    return c;
  }

  /* Petits dessins au pixel : pastille d'or (une charge), etincelles, anneau d'eclat */
  const dessin = (lignes, pal) => { const c = G.mk(lignes[0].length, lignes.length); lignes.forEach((l, j) => { for (let i = 0; i < l.length; i++) if (pal[l[i]]) { c.x.fillStyle = pal[l[i]]; c.x.fillRect(i, j, 1, 1); } }); return c; };
  const PAST = ['..KKK..', '.KhggK.', 'KhgggGK', 'KggggGK', 'KgggGdK', '.KGGdK.', '..KKK..'];
  const pastille = dessin(PAST, { K, h: '#fff3b4', g: '#ffd64c', G: '#e2a12c', d: '#a8661a' });
  const pastilleVide = dessin(PAST, { K, h: '#5c5a71', g: '#454357', G: '#3a3848', d: '#2f2d3c' });
  const ETOILE = [
    dessin(['.W.', 'WHW', '.W.'], { W: '#ffe9a0', H: '#ffffff' }),
    dessin(['..W..', '..W..', 'WWHWW', '..W..', '..W..'], { W: '#ffe9a0', H: '#ffffff' }),
    dessin(['...W...', '...W...', '..WHW..', 'WWHHHWW', '..WHW..', '...W...', '...W...'], { W: '#ffe9a0', H: '#ffffff' }),
  ];
  const cercles = new Map();
  function cercle(r, col = '#fff') {
    r = Math.round(r);
    let c = cercles.get(r + col);
    if (c) return c;
    const D = 2 * r + 2;
    c = G.mk(D, D); c.x.fillStyle = col;
    for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) { const q = Math.hypot(i + .5 - D / 2, j + .5 - D / 2); if (q > r - .5 && q <= r + .5) c.x.fillRect(i, j, 1, 1); }
    cercles.set(r + col, c);
    return c;
  }
  // pose un dessin au pixel, centre sur (cx, cy) en unites de jeu, sans le deformer
  const poser = (x, c, cx, cy) => x.drawImage(c, cx - c.width / (2 * G.S), cy - c.height / (2 * G.S));
  // une lueur qui teinte (et ne blanchit pas un decor clair)
  function halo(x, cx, cy, r, col, a) {
    const c = G.hex(col);
    x.save();
    const g = x.createRadialGradient(cx, cy, r * .3, cx, cy, r);
    g.addColorStop(0, G.rgb(c, a)); g.addColorStop(1, G.rgb(c, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    x.restore();
  }
  const ressort = t => { const s = 1.70158; t -= 1; return 1 + (s + 1) * t * t * t + s * t * t; };

  /* ---- Les boutons, a gauche ---- */
  M.boutons = (x, W) => {
    const J = G.Jeu, l = J.boutons(), B = G.BTN, fx = W.btFx = W.btFx || {}, t = G.t;
    l.forEach((k, i) => {
      const e = J.etatBouton(k), f = fx[k] = fx[k] || {};
      // a son arrivee il glisse depuis le bord ; il s'illumine quand il redevient pret
      if (f.t0 === undefined) { f.t0 = t + i * .07; f.pret = e.pret; }
      if (e.pret && f.pret === false) f.eclat = t;
      f.pret = e.pret;
      const arr = clamp((t - f.t0) / .3, 0, 1);
      if (arr <= 0) return;
      let cx = B.x + B.c / 2 - (1 - ressort(arr)) * 30;
      const cy = B.y + i * B.pas + B.c / 2;
      // refus (rien a viser) : il tremble et rougit
      const non = f.non !== undefined ? (t - f.non) / .4 : 1;
      if (non < 1) cx += Math.sin(non * 38) * 2.2 * (1 - non);
      const ec = f.eclat !== undefined ? (t - f.eclat) / .55 : 1;
      // en marche : un halo et un anneau de sa couleur qui battent
      const coul = (J.POUVOIRS[k] || { c: '#ffd23f' }).c;
      if (e.actif) { halo(x, cx, cy, 18 + Math.sin(t * 9) * 2.5, coul, .7); poser(x, cercle(22 + (Math.sin(t * 9) > 0 ? 1 : 0), coul), cx, cy); }
      if (ec < 1) halo(x, cx, cy, 14 + ec * 12, '#fff2b0', .75 * (1 - ec));
      const o = { gris: !e.pret && !e.actif, f: e.jauge, seg: e.seg, on: e.on, teinte: non < 1 && Math.sin(non * 30) > 0, blanc: ec < .2 ? 1 : ec < .45 ? 1 - (ec - .2) / .25 : 0 };
      poser(x, medaille(k, DB, o), cx, cy);
      // en marche : une etincelle fait le tour de la couronne
      if (e.actif) { const a = t * 7; poser(x, ETOILE[1], cx + Math.sin(a) * 10.6, cy - Math.cos(a) * 10.6); }
      // les charges : des pastilles d'or en arc, sur la droite
      const n = Math.min(e.n || 0, 6);
      for (let m = 0; m < n; m++) { const a = (m - (n - 1) / 2) * .46; poser(x, pastille, cx + Math.cos(a) * 14.6, cy + Math.sin(a) * 14.6); }
      // l'eclat : un anneau qui s'ouvre et quatre etoiles
      if (ec < 1) {
        x.globalAlpha = 1 - ec;
        poser(x, cercle(20 + ec * 16), cx, cy);
        for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + Math.PI / 4, r = 12 + ec * 10; poser(x, ETOILE[ec < .5 ? 2 : 1], cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        x.globalAlpha = 1;
      }
    });
    // les medailles ramassees filent vers leur bouton, puis l'allument
    if (W.envols && W.envols.length) {
      for (const v of W.envols) {
        const i = l.indexOf(v.p), k = (t - v.t0) / .45;
        if (i < 0 || k >= 1) { v.fini = true; (fx[v.p] = fx[v.p] || {}).eclat = t; continue; }
        if (k < 0) continue;
        const tx = B.x + B.c / 2, ty = B.y + i * B.pas + B.c / 2, mx = (v.x + tx) / 2, my = Math.min(v.y, ty) - 30;
        const pt = q => [(1 - q) * (1 - q) * v.x + 2 * (1 - q) * q * mx + q * q * tx, (1 - q) * (1 - q) * v.y + 2 * (1 - q) * q * my + q * q * ty];
        const q = k * k * (3 - 2 * k);
        for (let s = 3; s >= 1; s--) { const p = pt(Math.max(0, q - s * .06)); poser(x, ETOILE[s === 1 ? 1 : 0], p[0], p[1]); }
        const p = pt(q);
        poser(x, medaille(v.p, DP, {}), p[0], p[1]);
      }
      W.envols = W.envols.filter(v => !v.fini);
    }
  };
  // ramasse sur le parcours : la medaille part de la vers son bouton
  M.gagne = (W, p, px, py) => { (W.envols = W.envols || []).push({ p, x: px, y: py, t0: G.t }); };
  // un appui pour rien (la roquette n'a rien a viser)
  M.refus = (W, k) => { const fx = W.btFx = W.btFx || {}; (fx[k] = fx[k] || {}).non = G.t; };

  /* ---- Le bonus a ramasser : une medaille d'or qui flotte, des rayons qui tournent, un halo qui bat, un reflet, des etincelles ---- */
  M.parcours = (x, it, W) => {
    const T = W.T;
    if (it.ph === undefined) it.ph = Math.random() * 6;
    const cx = it.x, cy = it.y + Math.sin(T * 3.1 + it.ph) * 2;
    // six rayons d'or qui tournent lentement et s'effacent vers leur pointe
    x.save();
    x.translate(cx, cy); x.rotate(T * .7 + it.ph);
    const g = x.createRadialGradient(0, 0, 4, 0, 0, 23);
    g.addColorStop(0, 'rgba(255,214,90,.5)'); g.addColorStop(1, 'rgba(255,200,70,0)');
    x.fillStyle = g;
    for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); x.beginPath(); x.moveTo(0, -1); x.lineTo(23, -3.2); x.lineTo(23, 3.2); x.lineTo(0, 1); x.fill(); }
    x.restore();
    halo(x, cx, cy, 18 + Math.sin(T * 5 + it.ph) * 2.5, '#ffc94a', .55);
    const c = ((T + it.ph) % 2.1) / .5;
    poser(x, medaille(it.p, DP, { brille: c < 1 ? 2 * Math.round((-6 + c * (2 * DP + 6)) / 2) : undefined }), cx, cy);
    for (let i = 0; i < 3; i++) {
      const s = Math.sin(T * 6.5 + i * 2.4 + it.ph);
      if (s < .15) continue;
      const a = T * 1.2 + it.ph + i * 2.09;
      poser(x, ETOILE[s > .75 ? 1 : 0], cx + Math.cos(a) * 15.5, cy + Math.sin(a) * 15.5);
    }
  };

  /* Pour les menus (atelier) : une medaille, une pastille pleine ou vide */
  M.dessiner = (x, k, cx, cy, o) => poser(x, medaille(k, (o && o.D) || DB, o || {}), cx, cy);
  M.pastille = (x, cx, cy, plein, z = 1) => { const c = plein ? pastille : pastilleVide, w = c.width * z / G.S; if (z === 1) poser(x, c, cx, cy); else x.drawImage(c, cx - w / 2, cy - w / 2, w, w); };
})();
