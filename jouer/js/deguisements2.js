/* La deuxieme fournee du hangar (Max, 06/11/2026 au soir : « ajoute le double de personnages et de drones, trouve des idees fun »).
   18 personnages deguises et 18 drones farfelus de plus, peints au pixel par le code comme les premiers (deguisements.js, memes
   pinceaux et memes reperes : tete x -5..5, y by..by+9, nez en x 6 ; buste x0..x0+lg, hb..hb+12 ; pieds y -13 ; dessus du drone y -12).
   Ils sont ranges dans l'ordre ou on les gagne (gains.js). */
'use strict';
(function () {
  const H = G.HeroPinceau, { r, d, seg, K } = H;
  const COS = G.HERO_COSTUMES, DRO = G.HERO_DRONES;
  const { capuche, fen, soulier } = G.DEG;
  const sin = Math.sin, cos = Math.cos, PI = Math.PI;
  const p1 = () => H.passe() === 1;
  // un disque (ou une ellipse) plein, ligne par ligne : avec contour (disque) ou sans (disqueD)
  const larg = (ray, ry, j) => Math.round(ray * Math.sqrt(Math.max(0, 1 - (j / (ry + .3)) ** 2)));
  const disque = (c, cx, cy, ray, ry = ray) => { for (let j = -ry; j <= ry; j++) { const w = larg(ray, ry, j); r(c, cx - w, cy + j, 2 * w + 1, 1); } };
  const disqueD = (c, cx, cy, ray, ry = ray) => { for (let j = -ry; j <= ry; j++) { const w = larg(ray, ry, j); d(c, cx - w, cy + j, 2 * w + 1, 1); } };
  // un trait d'un pixel, sans contour
  const trait = (c, x0, y0, x1, y1) => { const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) d(c, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); };
  // un polygone convexe rempli ligne par ligne (f = r avec contour, d sans)
  const poly = (f, c, pts) => {
    const ys = pts.map(q => q[1]), y0 = Math.round(Math.min(...ys)), y1 = Math.round(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      let xa = Infinity, xb = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [qx, qy] = pts[(i + 1) % pts.length];
        if (ay === qy) { if (Math.round(ay) === y) { xa = Math.min(xa, ax, qx); xb = Math.max(xb, ax, qx); } continue; }
        if (y >= Math.min(ay, qy) - .5 && y <= Math.max(ay, qy) + .5) { const t = Math.max(0, Math.min(1, (y - ay) / (qy - ay))), x = ax + (qx - ax) * t; xa = Math.min(xa, x); xb = Math.max(xb, x); }
      }
      if (xa <= xb) f(c, Math.round(xa), y, Math.round(xb) - Math.round(xa) + 1, 1);
    }
  };
  // une bouffee transparente (fumee, vapeur), seulement a la passe des couleurs
  const bouffee = (x, y, s, a, c = '235,235,240') => { if (p1() && a > .02) d(`rgba(${c},${a.toFixed(2)})`, Math.round(x), Math.round(y), s, s); };

  /* ================= LES PERSONNAGES ================= */

  /* Le requin : la tete sort de sa gueule, dents tout autour, aileron sur le crane, queue qui balaie */
  const RQ = '#7f93ad', RQ1 = '#56677f', RQ2 = '#a9bdd6', RQV = '#eef2f6';
  COS.requin = {
    dos(P, st, a, h, hb, bx) {
      const k = Math.max(a, .35), w = sin(st.t * 5), w2 = sin(st.t * 5 - 1.2);
      const pts = [[-3, h - 6], [-9, h - 4 + w * .6], [-15, h - 2 + w * 1.4], [-20, h - 1 + w2 * 2.2]], ep = [6, 4, 3];
      for (let i = 0; i < 3; i++) seg(RQ, bx + pts[i][0] * k, pts[i][1], bx + pts[i + 1][0] * k, pts[i + 1][1], ep[i]);
      const x = bx + pts[3][0] * k, y = pts[3][1];
      seg(RQ, x, y, x - 4 * k - 1, y - 6 + w2, 2); seg(RQ, x, y, x - 3 * k - 1, y + 4 + w2 * .5, 2);
      for (let i = 0; i < 2; i++) { const [px, py] = pts[i + 1]; d(RQV, bx + px * k - 1, py + 1, 3, 1); d(RQ2, bx + px * k - 1, py - 2, 2, 1); }
    },
    buste(P, st, x0, hb, lg, a, bx) { d(RQV, a === 1 ? x0 + lg - 4 : bx - 3, hb + 1, a === 1 ? 3 : 7, 10); },
    tete(P, st, bx, by, a) {
      const [f0, f1] = fen(a);
      if (a >= .5) for (let j = 0; j < 7; j++) { const xf = Math.round(1 - j * .9), xb = Math.round(-5 - j * .35); r(RQ, bx + xb, by - 5 - j, xf - xb, 1); }
      else for (let j = 0; j < 7; j++) r(RQ, bx - 1, by - 5 - j, j < 4 ? 3 : 2, 1);
      capuche(bx, by, a, RQ, RQ1, RQ2);
      if (a >= .5) { d(RQ2, bx - 4, by - 6, 3, 1); d(RQ2, bx - 5, by - 8, 2, 1); d(RQ1, bx - 7, by - 10, 1, 2); d(K, bx + 3, by - 3, 1, 1); d(RQ1, bx - 4, by + 2, 1, 4); d(RQ1, bx - 6, by + 2, 1, 4); }
      else { d(RQ2, bx, by - 10, 1, 4); d(K, bx - 6, by - 2, 1, 1); d(K, bx + 5, by - 2, 1, 1); }
      // la gencive et les dents : la tete sort de la gueule
      d('#d8606e', bx + f0 - 1, by, 1, 10); if (a < 1) d('#d8606e', bx + f1, by, 1, 10);
      for (let x = f0; x < f1; x += 2) d('#ffffff', bx + x, by - 1, 1, 2);
      for (let x = f0 + 1; x < f1; x += 2) d('#ffffff', bx + x, by + 10, 1, 1);
    },
    pied: soulier(RQ1, '#34404f', RQ2),
  };

  /* Le clown : perruque en deux touffes qui rebondissent, nez rouge, sourire peint, petit chapeau a fleur, souliers geants */
  const CLO = '#ff7a2a', CLO1 = '#c84a1a', CLO2 = '#ffb46a', NEZ = '#e8283a', POIS = ['#ff4a5a', '#3a9ae8', '#4ac86a', '#b47aff'];
  COS.clown = {
    buste(P, st, x0, hb, lg, a, bx) {
      for (const [x, y, c] of [[1, 3, 0], [lg - 4, 2, 1], [4, 7, 2], [lg - 3, 8, 3], [1, 9, 1]]) d(POIS[c], x0 + x, hb + y, 2, 2);
      const px = a === 1 ? x0 + lg - 2 : bx - 1;
      r('#ffffff', px, hb + 3, 2, 2); r('#ffffff', px, hb + 7, 2, 2); d(NEZ, px, hb + 3, 1, 1); d('#3a9ae8', px, hb + 7, 1, 1);
      // la collerette
      for (let i = -2; i < lg + 2; i += 2) r(((i + 2) >> 1) % 2 ? '#ffd0e8' : '#ffffff', x0 + i, hb - 2 - ((i + 2) >> 1) % 2, 2, 3);
    },
    tete(P, st, bx, by, a, ly) {
      const b = Math.round(sin(st.t * 7) * 1.3), b2 = Math.round(sin(st.t * 7 + 1.4) * 1.3);
      const T = a >= .5 ? [[-7, 2 + b, 4], [-4, -2 + b2, 3]] : [[-9, 2 + b, 4], [9, 2 + b2, 4]];
      for (const [x, y, rr] of T) { disque(CLO, bx + x, by + y, rr); d(CLO2, bx + x - 2, by + y - rr + 1, 2, 1); d(CLO1, bx + x + 1, by + y + 1, 1, 1); d(CLO1, bx + x - 2, by + y + 2, 1, 1); d(CLO2, bx + x, by + y - 1, 1, 1); }
      // le petit chapeau vert et sa fleur qui fait boing
      const fl = Math.round(sin(st.t * 5) * 1.5);
      seg('#3a9a4a', bx + 1, by - 7, bx + 2 + fl, by - 11, 1); r('#ff6ab4', bx + 1 + fl, by - 14, 3, 3); d('#ffe24a', bx + 2 + fl, by - 13, 1, 1);
      r('#3a9a4a', bx - 4, by - 3, 8, 1); r('#3a9a4a', bx - 2, by - 7, 5, 4); d('#5ac86a', bx - 1, by - 7, 2, 1); d('#ffd23a', bx - 2, by - 4, 5, 1);
      // le nez rouge, le sourire peint, les losanges bleus
      const nx = a === 1 ? 6 : a === .66 ? 5 : -1, ny = a >= .5 ? 3 : 4;
      r(NEZ, bx + nx, by + ny + ly, 3, 3); d('#ff9aa8', bx + nx, by + ny + ly, 1, 1);
      if (a >= .5) { d(NEZ, bx, by + 7, 6, 1); d(NEZ, bx - 1, by + 6, 1, 1); d('#4ab4ff', bx + 3, by + 1 + ly, 2, 1); d('#4ab4ff', bx + 3, by + 5 + ly, 1, 1); }
      else { d(NEZ, bx - 3, by + 8, 7, 1); d(NEZ, bx - 4, by + 7, 1, 1); d(NEZ, bx + 4, by + 7, 1, 1); d('#4ab4ff', bx - 3, by + 1 + ly, 2, 1); d('#4ab4ff', bx + 2, by + 1 + ly, 2, 1); }
    },
    pied: (P, x, fy, lg, i, a) => { const L = a >= .5 ? lg + 5 : lg + 3; r(NEZ, x - 1, fy, L, 3); d('#ff7a8a', x, fy, L - 4, 1); d('#9a1a2a', x - 1, fy + 2, L, 1); },
  };

  /* Le ninja : cagoule noire, seuls les yeux depassent, bandeau rouge dont les deux pans flottent */
  const NJ = '#2a2c3a', NJ1 = '#17181f', NJ2 = '#4a4c5e', BAND = '#d8393b';
  COS.ninja = {
    buste(P, st, x0, hb, lg) { d(NJ2, x0 + 1, hb + 1, 1, 9); d(NJ1, x0 + lg - 4, hb + 2, 1, 8); d(NJ1, x0 + 2, hb + 4, lg - 4, 1); },
    tete(P, st, bx, by, a, ly) {
      const w = sin(st.t * 9), w2 = sin(st.t * 9 - 1.1);
      seg(BAND, bx - 7, by - 1, bx - 12, by + 1 + w, 2); seg(BAND, bx - 12, by + 1 + w, bx - 18, by + w2 * 2, 2);
      seg(BAND, bx - 7, by, bx - 11, by + 4 + w2, 2); seg(BAND, bx - 11, by + 4 + w2, bx - 16, by + 5 + w * 2, 2);
      r(NJ, bx - 6, by - 3, 13, 14); r(NJ, bx - 5, by - 4, 11, 1);
      d(NJ2, bx - 4, by - 3, 6, 1); d(NJ2, bx - 6, by + 1, 1, 5); d(NJ1, bx - 6, by + 8, 13, 3);
      const yy = by + 3 + ly, cl = st.cligne > 0;
      if (a >= .5) {
        d(P.s, bx + 1, yy - 1, 6, 3);
        if (cl) d(K, bx + 2, yy, 4, 1); else { d('#ffffff', bx + 2, yy, 4, 1); d('#2c2233', bx + 4, yy, 2, 1); }
        d(P.h1, bx + 2, yy - 1, 4, 1);
      } else {
        d(P.s, bx - 5, yy - 1, 11, 3);
        for (const e of [-3, 2]) { if (cl) d(K, bx + e, yy, 2, 1); else { d('#ffffff', bx + e, yy, 2, 1); d('#2c2233', bx + e + (e < 0 ? 1 : 0), yy, 1, 1); } d(P.h1, bx + e, yy - 1, 2, 1); }
      }
      r(BAND, bx - 6, by - 2, 13, 2); d('#ff6a5a', bx - 4, by - 2, 8, 1);
    },
    pied: soulier(NJ, NJ1, NJ2),
  };

  /* Le pompier : casque blanc argent a visiere doree, veste de feu marine a bandes jaunes, extincteur dans le dos, bottes */
  const PF = '#253556', PF1 = '#141c30', PF2 = '#3a4c78', BJ = '#e8e23a', BG = '#c8d0dc', CQ = '#e9edf3', CQ1 = '#a8b0c0', CQ2 = '#ffffff';
  COS.pompier = {
    dos(P, st, a, h, hb, bx) {
      if (a === 0) return;
      const x = bx + (a === 1 ? -11 : a === .66 ? -10 : -8);
      r('#d8282e', x, hb + 1, 5, 11); r('#2c2a38', x + 1, hb - 1, 3, 2);
      d('#ff6a6a', x + 1, hb + 2, 1, 8); d('#9a1a22', x + 4, hb + 2, 1, 9); d('#f4f0e6', x + 1, hb + 5, 3, 2);
      seg('#2c2a38', x + 2, hb - 2, x - 2, hb + 2, 1);
    },
    buste(P, st, x0, hb, lg) {
      for (const y of [4, 8]) { d(BJ, x0, hb + y, lg, 1); d(BG, x0, hb + y + 1, lg, 1); }
      d(PF2, x0, hb, lg, 1); d(PF1, x0, hb + 1, 2, 3);
    },
    tete(P, st, bx, by, a) {
      r(CQ, bx - 6, by - 4, 13, 5); r(CQ, bx - 5, by - 6, 11, 2); r(CQ, bx - 1, by - 8, 3, 2);
      if (a >= .5) r(CQ, bx - 7, by + 1, 3, 7); else { r(CQ, bx - 7, by + 1, 2, 6); r(CQ, bx + 6, by + 1, 2, 6); }
      d(CQ2, bx - 3, by - 6, 5, 1); d(CQ2, bx - 5, by - 3, 1, 3); d(CQ1, bx - 6, by, 13, 1); d(CQ1, bx + 1, by - 8, 1, 2);
      d('#d8393b', bx - 4, by - 2, 2, 1); d('#3a5ab8', bx - 6, by - 2, 2, 1);
      if (a >= .5) { r('#e8b030', bx + 1, by - 2, 8, 2); d('#fff0a0', bx + 2, by - 2, 4, 1); d('#b8801a', bx + 1, by - 1, 8, 1); }
      else { r('#e8b030', bx - 6, by - 2, 13, 2); d('#fff0a0', bx - 4, by - 2, 6, 1); d('#b8801a', bx - 6, by - 1, 13, 1); }
    },
    pied: (P, x, fy, lg) => { r('#1c1a24', x, fy - 2, lg, 5); d('#3a3c4a', x + 1, fy - 2, lg - 3, 1); d(BJ, x, fy, lg, 1); d('#000000', x, fy + 2, lg, 1); },
  };

  /* La grenouille : capuche verte, deux gros yeux sur le dessus qui clignent, sac vocal qui gonfle, palmes */
  const GR = '#4ab84a', GR1 = '#2e8a34', GR2 = '#86e06a', GV = '#e4f08a';
  COS.grenouille = {
    buste(P, st, x0, hb, lg, a, bx) {
      d(GV, a === 1 ? x0 + lg - 4 : bx - 3, hb + 2, a === 1 ? 3 : 7, 9);
      d(GR1, x0 + 1, hb + 3, 2, 2); d(GR1, x0 + 2, hb + 8, 2, 1); d(GR1, x0 + 4, hb + 5, 1, 1);
    },
    tete(P, st, bx, by, a) {
      capuche(bx, by, a, GR, GR1, GR2);
      const ph = st.t % 2.4;
      if (ph < .8) { const s = Math.round(sin(ph / .8 * PI) * 3); if (s > 0) { disque('#eef49a', bx + (a >= .5 ? 3 : 0), by + 11, s); d('#ffffff', bx + (a >= .5 ? 2 : -1), by + 10, 1, 1); } }
      const cl = st.cligne > 0 || st.t % 3.1 < .14;
      for (const x of (a >= .5 ? [bx - 3, bx + 3] : [bx - 4, bx + 4])) {
        disque(GR, x, by - 5, 3); d(GR2, x - 2, by - 8, 3, 1);
        if (cl) d(GR1, x - 2, by - 5, 5, 1);
        else { disqueD('#ffffff', x, by - 5, 2); d(K, x, by - 6, 2, 2); d('#ffffff', x, by - 6, 1, 1); }
      }
    },
    pied: (P, x, fy, lg) => { r(GR, x - 1, fy + 1, lg + 3, 2); d(GR2, x, fy + 1, lg, 1); d(GR1, x - 1, fy + 2, lg + 3, 1); r(GR, x + lg + 2, fy + 2, 1, 1); },
  };

  /* Le robot : tete en boite, visiere ou un oeil balaie, antenne qui clignote, voyants sur la poitrine */
  const RB = '#b8c2d0', RB1 = '#7e8a9e', RB2 = '#e6edf6', ECR = '#1c2030', LED = ['#ff4a4a', '#4aff8a', '#ffd23a', '#4ab4ff'], CY = '#5af0ff';
  COS.robot = {
    genou: true,
    buste(P, st, x0, hb, lg, a, bx) {
      const w = a === 1 ? 7 : 9, x = a === 1 ? x0 + lg - 8 : bx - 4, k = st.t * 3 | 0;
      d(ECR, x, hb + 2, w, 7); d(RB1, x, hb + 9, w, 1);
      for (let i = 0; i < (a === 1 ? 2 : 3); i++) d(LED[(k + i) % 4], x + 1 + i * 3, hb + 3, 2, 2);
      d('#4aff8a', x + 1, hb + 7, 1 + (k % 4) + (a === 1 ? 0 : 2), 1);
      for (const [xx, yy] of [[0, 0], [lg - 1, 0], [0, 9], [lg - 1, 9]]) d(RB1, x0 + xx, hb + yy, 1, 1);
    },
    tete(P, st, bx, by, a, ly) {
      const on = (st.t * 2.5 | 0) % 2 === 0;
      seg(RB1, bx, by - 4, bx - 1, by - 8, 1); r(on ? '#ff4a4a' : '#8a2a2a', bx - 2, by - 11, 3, 3); if (on) d('#ffc0c0', bx - 2, by - 11, 1, 1);
      r(RB, bx - 6, by - 4, 13, 14);
      d(RB2, bx - 5, by - 4, 11, 1); d(RB2, bx - 6, by - 3, 1, 10); d(RB1, bx - 6, by + 8, 13, 2);
      for (const [x, y] of [[-5, -3], [5, -3], [-5, 7], [5, 7]]) d(RB1, bx + x, by + y, 1, 1);
      r(RB1, bx - 8, by + 1, 2, 4); if (a < .5) r(RB1, bx + 7, by + 1, 2, 4);
      const s = Math.round(sin(st.t * 3) * 1.5);
      if (a >= .5) {
        d(ECR, bx, by, 7, 5); d(CY, bx + 3 + s, by + 1 + ly, 2, 2); d('#c8ffff', bx + 3 + s, by + 1 + ly, 1, 1);
        d('#4a5468', bx + 1, by + 6, 5, 2); d(RB2, bx + 2, by + 6, 1, 2); d(RB2, bx + 4, by + 6, 1, 2);
      } else {
        d(ECR, bx - 5, by, 11, 5);
        for (const e of [-3, 2]) { d(CY, bx + e + s, by + 1 + ly, 2, 2); d('#c8ffff', bx + e + s, by + 1 + ly, 1, 1); }
        d('#4a5468', bx - 3, by + 6, 7, 2); for (const x of [-2, 0, 2]) d(RB2, bx + x, by + 6, 1, 2);
      }
    },
    pied: (P, x, fy, lg) => { r(RB1, x - 1, fy, lg + 1, 3); d(RB, x, fy, lg - 1, 1); d('#4a5468', x - 1, fy + 2, lg + 1, 1); },
  };

  /* Le hot-dog : le pain des deux cotes, la saucisse au milieu (qui depasse en bas), moutarde et ketchup en zigzag */
  const SC = '#c8583a', SC1 = '#9a3a24', SC2 = '#e88a6a', PN = '#e8b06a', PN1 = '#b87a3a', PN2 = '#f8d8a0', MO = '#ffd83a', KE = '#e8283a';
  COS.hotdog = {
    dessous(P, st, x0, hb, lg, a, bx) {
      const W = a === 1 ? 15 : 17, xg = a === 1 ? x0 - 2 : bx - 8;
      for (let j = 0; j < 19; j++) { const e = j > 15 ? (j - 15) * 2 : 0; r(PN, xg + e, hb - 1 + j, W - 2 * e, 1); }
      d(PN2, xg + 1, hb, 2, 14); d(PN1, xg + W - 3, hb, 2, 15); d(PN1, xg + 3, hb + 16, W - 6, 1);
      const cx = xg + (W >> 1) - 2;
      r(SC, cx, hb - 1, 5, 21); d(SC2, cx + 1, hb, 1, 19); d(SC1, cx + 4, hb, 1, 20);
      for (let j = 0; j < 19; j++) d(MO, cx + 1 + ((j >> 1) % 2) * 2, hb + j, 2, 1);
    },
    tete(P, st, bx, by, a) {
      capuche(bx, by, a, SC, SC1, SC2);
      r(SC, bx - 6, by - 6, 12, 2); r(SC, bx - 4, by - 8, 8, 2);
      d(SC2, bx - 3, by - 8, 4, 1); d(SC2, bx - 5, by - 5, 3, 1);
      for (let i = 0; i < 5; i++) d(MO, bx - 5 + i * 2, by - 5 - (i % 2), 2, 1);
      for (let i = 0; i < 3; i++) d(KE, bx - 4 + i * 3, by - 7 + (i % 2), 2, 1);
    },
    pied: soulier('#6a4426', '#3a2416', '#8e6238'),
  };

  /* Le lion : criniere en meches tout autour du visage, oreilles rondes, truffe, queue a houppe qui fouette, pattes */
  const LN = '#e0a040', LN1 = '#b0762a', LN2 = '#f4c870', CR = '#b0602a', CR1 = '#7a3a1a', CR2 = '#d8843a';
  COS.lion = {
    dos(P, st, a, h, hb, bx) {
      const k = Math.max(a, .35), w = sin(st.t * 3.5), w2 = sin(st.t * 3.5 - 1.3);
      const pts = [[-3, h - 5], [-9, h - 2 + w], [-13, h - 6 + w2 * 2], [-14, h - 11 + w2 * 3]];
      for (let i = 0; i < 3; i++) seg(LN, bx + pts[i][0] * k, pts[i][1], bx + pts[i + 1][0] * k, pts[i + 1][1], 2);
      const x = Math.round(bx + pts[3][0] * k), y = Math.round(pts[3][1]);
      r(CR, x - 2, y - 3, 4, 4); d(CR2, x - 1, y - 3, 2, 1); d(CR1, x - 2, y, 4, 1);
    },
    buste(P, st, x0, hb, lg, a, bx) { d(LN2, a === 1 ? x0 + lg - 4 : bx - 3, hb + 3, a === 1 ? 3 : 7, 8); },
    tete(P, st, bx, by, a, ly) {
      const w = Math.round(sin(st.t * 4)), w2 = Math.round(sin(st.t * 4 + 2));
      // des meches rondes, en couronne autour de la tete (de profil, elle s'ouvre devant le visage)
      const cx = a >= .5 ? bx - 1 : bx, cy = by + 4;
      const ANG = a >= .5 ? [-1.2, -1.65, -2.1, -2.55, -3.0, 2.85, 2.4, 1.95, 1.5, 1.1] : Array.from({ length: 13 }, (_, i) => -PI / 2 + i * PI * 2 / 13);
      ANG.forEach((an, i) => {
        const x = Math.round(cx + cos(an) * 10), y = Math.round(cy + sin(an) * 10.5) + (i % 2 ? w : w2);
        disque(i % 3 === 1 ? CR2 : i % 3 === 2 ? CR1 : CR, x, y, 3); d(i % 3 === 1 ? '#f0a85a' : CR2, x - 1, y - 2, 2, 1);
      });
      capuche(bx, by, a, CR, CR1, CR2);
      for (const x of (a >= .5 ? [-3] : [-5, 3])) { r(LN, bx + x, by - 7, 3, 3); d('#f4a0a0', bx + x + 1, by - 6, 1, 1); }
      if (a >= .5) { d('#4a2418', bx + 5, by + 4 + ly, 2, 2); d('#4a2418', bx + 2, by + 6, 1, 1); d('#4a2418', bx + 4, by + 7, 1, 1); }
      else { d('#4a2418', bx - 1, by + 4 + ly, 3, 2); d('#4a2418', bx - 4, by + 6, 1, 1); d('#4a2418', bx + 4, by + 6, 1, 1); }
    },
    pied: (P, x, fy, lg) => { r(LN, x, fy, lg, 3); d(LN2, x + 1, fy, lg - 2, 1); d(LN1, x + lg - 2, fy + 1, 1, 2); d(LN1, x + lg - 4, fy + 1, 1, 2); },
  };

  /* La momie : bandelettes partout, un seul oeil qui se voit, une bande qui se deroule et flotte derriere */
  const MM = '#e8dcc0', MM1 = '#b8a888', MM2 = '#fff8e8';
  COS.momie = {
    dos(P, st, a, h, hb, bx) {
      const k = Math.max(a, .4), w = sin(st.t * 6), w2 = sin(st.t * 6 - 1.4), w3 = sin(st.t * 6 - 2.6), y0 = hb + 2;
      // la bande pend de l'epaule et flotte un peu vers l'arriere
      const P0 = [bx - 5 * k, y0], P1 = [bx - 10 * k, y0 + 3 + w], P2 = [bx - 14 * k, y0 + 6 + w2 * 1.5], P3 = [bx - 17 * k, y0 + 8 + w3 * 2.2];
      seg(MM, P0[0], P0[1], P1[0], P1[1], 2); seg(MM, P1[0], P1[1], P2[0], P2[1], 2); seg(MM, P2[0], P2[1], P3[0], P3[1], 2);
      d(MM1, P1[0], P1[1], 2, 1); d(MM1, P2[0], P2[1], 2, 1);
    },
    buste(P, st, x0, hb, lg) { for (let j = 0; j < 12; j += 3) { d(MM1, x0, hb + j, lg, 1); d(MM2, x0 + 1 + (j % 2) * 3, hb + j + 1, 4, 1); } },
    tete(P, st, bx, by, a, ly) {
      const w = Math.round(sin(st.t * 6) * 1.5);
      seg(MM, bx - 6, by + 2, bx - 8 - w, by + 5, 2); seg(MM, bx - 8 - w, by + 5, bx - 9 - w, by + 9, 2);
      r(MM, bx - 6, by - 3, 13, 13); r(MM, bx - 5, by - 4, 11, 1);
      for (let j = -2; j < 10; j += 3) { d(MM1, bx - 6, by + j, 13, 1); d(MM2, bx - 4 + (j & 2), by + j + 1, 4, 1); }
      const yy = by + 3 + ly;
      if (a >= .5) { d('#3a2e24', bx + 1, yy, 6, 2); d('#f8f4d0', bx + 3, yy, 2, 2); d(K, bx + 4, yy, 1, 2); }
      else { d('#3a2e24', bx + 1, yy, 5, 2); d('#f8f4d0', bx + 2, yy, 2, 2); d(K, bx + 2, yy, 1, 2); d(MM1, bx - 4, yy + 1, 4, 1); }
    },
    pied: (P, x, fy, lg) => { r(MM, x, fy, lg, 3); d(MM1, x, fy + 1, lg, 1); d(MM2, x + 1, fy, 2, 1); },
  };

  /* Le vampire : cape noire doublee de rouge qui ondule, grand col dresse, cheveux plaques en pointe, crocs */
  const VP = '#1c1a26', VP1 = '#0e0d14', VP2 = '#3a3650', VR = '#b8202e', VR2 = '#e8404a';
  COS.vampire = {
    dos(P, st, a, h, hb, bx) {
      const n = 25;
      for (let k = 0; k <= n; k++) {
        const v = sin(st.t * 4 - k * .35) * (k / n) * 2, back = (k * .35 + v) * Math.max(a, .12), w = Math.round(9 + k * .25 + (1 - a) * 6);
        const x = a === 1 ? bx - 6 - back : bx - w / 2 - back * .5, y = hb + k;
        r(VP, x, y, w, 1); d(VR, x, y, 2, 1); if (a < 1) d(VR, x + w - 2, y, 2, 1); if (k > 2) d(VP2, x + 2, y, 1, 1); if (k === n) d(VR, x, y, w, 1);
      }
      // le grand col dresse, rouge dedans : derriere la nuque (de face, de chaque cote du cou)
      if (a > 0) { r(VP, bx - 9, hb - 8, 4, 9); d(VR, bx - 7, hb - 7, 2, 7); }
      else { r(VP, bx - 10, hb - 7, 3, 8); r(VP, bx + 8, hb - 7, 3, 8); d(VR, bx - 9, hb - 6, 2, 6); d(VR, bx + 8, hb - 6, 2, 6); }
    },
    buste(P, st, x0, hb, lg, a, bx) {
      const x = a === 1 ? x0 + lg - 4 : bx - 2;
      d('#f4f0f4', x, hb, a === 1 ? 3 : 5, 7); d(VR, x + (a === 1 ? 1 : 1), hb, a === 1 ? 2 : 3, 2);
      d('#e8b84a', x + (a === 1 ? 0 : 1), hb + 5, 2, 2); d(VR2, x + (a === 1 ? 0 : 1), hb + 5, 1, 1);
    },
    tete(P, st, bx, by, a) {
      r(VP, bx - 5, by - 2, 11, 3); r(VP, bx - 5, by + 1, 3, 4);
      d(VP2, bx - 3, by - 2, 4, 1); d(VP2, bx - 5, by + 1, 1, 2);
      if (a >= .5) { d(VP, bx + 1, by + 1, 3, 1); d(VP, bx + 2, by + 2, 1, 1); d('#ffffff', bx + 2, by + 8, 1, 1); d('#ffffff', bx + 4, by + 8, 1, 1); d('#9a8ab0', bx + 2, by + 5, 3, 1); }
      else { d(VP, bx - 2, by + 1, 4, 1); d(VP, bx - 1, by + 2, 2, 1); d('#ffffff', bx - 1, by + 8, 1, 1); d('#ffffff', bx + 1, by + 8, 1, 1); }
    },
    pied: soulier(VP, VP1, VP2),
  };

  /* La pieuvre : capuche et manteau en bulbe, gros yeux a pupille fendue, tentacules qui ondulent sur les epaules */
  const PV = '#c05ab0', PV1 = '#8a3a80', PV2 = '#e88ad8', VE = '#f8d0f0';
  COS.pieuvre = {
    tete(P, st, bx, by, a) {
      (a >= .5 ? [-7, -4, -1, 3] : [-8, -5, 4, 7]).forEach((x0, i) => {
        let x = bx + x0, y = by + 10;
        for (let j = 1; j <= 4; j++) {
          const nx = bx + x0 + Math.round(sin(st.t * 4 + i * 1.3 + j * .9) * j * .7) + (x0 < 0 ? -(j >> 1) : (j >> 1)), ny = by + 10 + j * 3;
          seg(PV, x, y, nx, ny, j < 3 ? 3 : 2); d(VE, nx, ny, 1, 1); x = nx; y = ny;
        }
      });
      capuche(bx, by, a, PV, PV1, PV2);
      if (a >= .5) {
        r(PV, bx - 9, by - 9, 13, 6); r(PV, bx - 12, by - 6, 4, 4); r(PV, bx - 7, by - 11, 9, 2);
        d(PV2, bx - 6, by - 10, 5, 1); d(PV2, bx - 9, by - 8, 2, 1); d(PV1, bx - 11, by - 4, 3, 1); d(PV1, bx - 5, by - 6, 1, 1); d(PV1, bx - 8, by - 5, 1, 1);
        d(PV1, bx - 1, by - 9, 5, 1); d('#fff8e0', bx, by - 8, 3, 3); d(K, bx, by - 7, 3, 1);
      } else {
        r(PV, bx - 7, by - 10, 15, 7); r(PV, bx - 5, by - 12, 11, 2);
        d(PV2, bx - 3, by - 12, 6, 1); d(PV1, bx - 7, by - 5, 15, 1);
        for (const x of [-5, 2]) { d('#fff8e0', bx + x, by - 8, 3, 3); d(K, bx + x, by - 7, 3, 1); }
      }
    },
    pied: soulier(PV, PV1, PV2),
  };

  /* La citrouille : la tete creusee, ses cotes, la tige et sa feuille, la lumiere qui tremble dedans */
  const CT = '#f08a2a', CT1 = '#c0601a', CT2 = '#ffb45a', TG = '#4a8a3a';
  COS.citrouille = {
    buste(P, st, x0, hb, lg) { d(TG, x0, hb, lg, 2); d('#6ab84a', x0 + 2, hb, 3, 1); r('#6ab84a', x0 + lg - 3, hb - 1, 3, 2); },
    tete(P, st, bx, by, a, ly) {
      seg(TG, bx, by - 4, bx - 1, by - 8, 2); r(TG, bx + 1, by - 9, 4, 2); d('#6ab84a', bx + 2, by - 9, 2, 1);
      r(CT, bx - 8, by - 2, 17, 12); r(CT, bx - 7, by - 4, 15, 2); r(CT, bx - 7, by + 10, 15, 1);
      for (const x of [-4, 0, 4]) d(CT1, bx + x, by - 3, 1, 13);
      d(CT2, bx - 6, by - 3, 2, 8); d(CT2, bx + 2, by - 4, 2, 1); d(CT1, bx - 7, by + 9, 15, 2);
      const L = ['#ffe24a', '#ffb43a', '#fff6a0'][(st.t * 9 | 0) % 3];
      const oeil = x => { d(L, x, by + 2 + ly, 3, 1); d(L, x + 1, by + 1 + ly, 1, 1); };
      if (a >= .5) {
        oeil(bx + 3); d(L, bx + 6, by + 4, 2, 1);
        d(L, bx, by + 6, 8, 1); d(L, bx + 1, by + 7, 2, 1); d(L, bx + 5, by + 7, 2, 1); d(L, bx, by + 5, 1, 1);
      } else {
        oeil(bx - 5); oeil(bx + 2); d(L, bx - 1, by + 4, 2, 1);
        d(L, bx - 5, by + 6, 11, 1); d(L, bx - 4, by + 7, 2, 1); d(L, bx, by + 7, 2, 1); d(L, bx + 4, by + 7, 2, 1); d(L, bx - 5, by + 5, 1, 1); d(L, bx + 5, by + 5, 1, 1);
      }
    },
    pied: soulier('#2a3a2a', '#141c14', '#4a5a4a'),
  };

  /* Le scaphandrier : casque rond de cuivre a hublots, collet boulonne, tuyau d'air, bulles qui montent, semelles de plomb */
  const LA = '#d8a040', LA1 = '#a06a1a', LA2 = '#f8d880', VI = '#9ad8ff';
  COS.scaphandrier = {
    dos(P, st, a, h, hb, bx) {
      const k = Math.max(a, .3), w = sin(st.t * 2) * 1.5;
      seg('#3a3c4a', bx - 8 * k, hb - 6, bx - 13 * k + w, hb + 4, 2); seg('#3a3c4a', bx - 13 * k + w, hb + 4, bx - 16 * k + w * 1.5, hb + 16, 2);
    },
    buste(P, st, x0, hb, lg) {
      r(LA, x0 - 2, hb - 2, lg + 4, 4); d(LA2, x0 - 1, hb - 2, lg + 2, 1); d(LA1, x0 - 2, hb + 1, lg + 4, 1);
      for (let i = 0; i < lg + 2; i += 3) d('#5a4420', x0 - 1 + i, hb, 1, 1);
    },
    tete(P, st, bx, by, a, ly) {
      if (!st.mort) for (let i = 0; i < 3; i++) {
        const ph = (st.t * .8 + i / 3) % 1, x = bx + 2 + Math.round(sin(st.t * 4 + i * 2) * 2), y = Math.round(by - 9 - ph * 18);
        if (ph < .9 && p1()) { d('rgba(200,240,255,.85)', x, y, 2, 2); d('#ffffff', x, y, 1, 1); }
      }
      disque(LA, bx, by + 4, 9); r(LA1, bx - 1, by - 7, 3, 2);
      d(LA2, bx - 6, by - 3, 4, 1); d(LA2, bx - 7, by - 1, 1, 4); d(LA1, bx + 3, by + 11, 5, 1); d(LA1, bx + 7, by + 6, 1, 4);
      if (a >= .5) {
        disqueD('#7a5420', bx + 4, by + 4, 4); disqueD(VI, bx + 4, by + 4, 3);
        d('#ffffff', bx + 4, by + 3 + ly, 2, 2); d(K, bx + 5, by + 3 + ly, 1, 2); d('#ffffff', bx + 2, by + 2, 1, 1);
        disqueD('#7a5420', bx - 4, by + 3, 2); disqueD(VI, bx - 4, by + 3, 1);
        for (const [x, y] of [[4, -1], [8, 4], [4, 9], [0, 4]]) d('#5a4420', bx + x, by + y, 1, 1);
      } else {
        disqueD('#7a5420', bx, by + 4, 5); disqueD(VI, bx, by + 4, 4);
        for (const e of [-3, 1]) { d('#ffffff', bx + e, by + 3 + ly, 2, 2); d(K, bx + e + 1, by + 3 + ly, 1, 2); }
        d('#ffffff', bx - 3, by + 1, 1, 1);
        for (const x of [-8, 8]) { disqueD('#7a5420', bx + x, by + 4, 1); }
      }
    },
    pied: (P, x, fy, lg) => { r('#4a4c5a', x - 1, fy - 1, lg + 2, 4); d('#6a6c7a', x, fy - 1, lg, 1); d('#2c2e3a', x - 1, fy + 2, lg + 2, 1); d(LA, x, fy, 2, 1); },
  };

  /* Le bebe geant : bonnet a volant noue sous le menton, tetine, grosse couche et son epingle, chaussons */
  const BB = '#9ad0f8', BB1 = '#6aa8d8', BB2 = '#e0f2ff';
  COS.bebe = {
    buste(P, st, x0, hb, lg, a, bx) {
      const x = a === 1 ? x0 + 4 : bx - 2;
      d('#ffd23a', x, hb + 4, 4, 2); d('#ffd23a', x + 2, hb + 2, 2, 2); d('#ff8a2a', x + 4, hb + 3, 1, 1); d(K, x + 3, hb + 2, 1, 1);
    },
    dessous(P, st, x0, hb, lg) {
      r('#fbfbff', x0 - 1, hb + 10, lg + 2, 6); r('#fbfbff', x0, hb + 16, lg, 1);
      d('#ffffff', x0, hb + 10, lg - 2, 1); d('#dfe4ee', x0 - 1, hb + 14, lg + 2, 1); d('#dfe4ee', x0, hb + 16, lg, 1);
      const m = x0 + (lg >> 1) - 2; d('#c8d0dc', m, hb + 12, 4, 1); d('#ff8ab0', m + 4, hb + 12, 1, 1); d('#c8d0dc', m, hb + 13, 1, 1);
    },
    tete(P, st, bx, by, a) {
      const [f0, f1] = fen(a);
      capuche(bx, by, a, BB, BB1, BB2);
      for (let y = by - 1; y < by + 10; y += 2) { r('#ffffff', bx + f0 - 2, y, 2, 2); if (a < 1) r('#ffffff', bx + f1, y, 2, 2); }
      for (let x = f0 - 1; x < f1; x += 2) r('#ffffff', bx + x, by - 2, 2, 2);
      r(BB1, bx + (a >= .5 ? 1 : -2), by + 11, 5, 2); d('#ffffff', bx + (a >= .5 ? 2 : -1), by + 11, 1, 1);
      const s = Math.round(sin(st.t * 8) * .5 + .5);
      if (a >= .5) { r('#ff8ab0', bx + 5 + s, by + 5, 2, 4); r('#ffd23a', bx + 7 + s, by + 6, 2, 2); d('#ffd0e0', bx + 5 + s, by + 5, 1, 1); d('#ffa0a8', bx + 1, by + 5, 2, 1); }
      else { r('#ff8ab0', bx - 2, by + 6, 5, 2); r('#ffd23a', bx - 1, by + 8 + s, 3, 2); d('#ffd0e0', bx - 2, by + 6, 1, 1); d('#ffa0a8', bx - 5, by + 5, 2, 1); d('#ffa0a8', bx + 4, by + 5, 2, 1); }
    },
    pied: (P, x, fy, lg) => { r(BB, x, fy, lg, 3); d(BB2, x + 1, fy, lg - 2, 1); d(BB1, x, fy + 2, lg, 1); d('#ffffff', x + lg - 3, fy, 1, 1); },
  };

  /* Le Martien : peau verte, grands yeux noirs, antennes a boules qui dodelinent, combinaison argent a insigne */
  const MV = '#8ad86a', MV1 = '#5aa84a', AG = '#c8d0dc', AG1 = '#8a94a6', AG2 = '#eef2f8';
  COS.martien = {
    buste(P, st, x0, hb, lg, a, bx) {
      d(AG2, x0, hb, lg, 1); d(AG2, x0 + lg - 3, hb + 1, 2, 6);
      const x = a === 1 ? x0 + 2 : bx - 2;
      d('#ffd23a', x, hb + 4, 4, 2); d('#ff8a3a', x - 1, hb + 5, 6, 1); d('#fff6c0', x + 1, hb + 4, 1, 1);
    },
    tete(P, st, bx, by, a, ly) {
      const w = sin(st.t * 5) * 2, w2 = sin(st.t * 5 + 1.5) * 2;
      seg(MV1, bx - 2, by - 1, bx - 4 + w, by - 8, 1); r('#ffd23a', bx - 5 + w, by - 11, 3, 3); d('#fff6c0', bx - 5 + w, by - 11, 1, 1);
      seg(MV1, bx + 2, by - 1, bx + 3 + w2, by - 9, 1); r('#ff6ab4', bx + 2 + w2, by - 12, 3, 3); d('#ffd0e8', bx + 2 + w2, by - 12, 1, 1);
      const yy = by + 2 + ly;
      if (a >= .5) { d(K, bx + 1, yy, 5, 3); d(K, bx + 2, yy + 3, 3, 1); d('#ffffff', bx + 2, yy, 1, 1); d('#6a7aff', bx + 4, yy + 1, 1, 1); }
      else for (const e of [-4, 1]) { d(K, bx + e, yy, 4, 3); d(K, bx + e + (e < 0 ? 1 : 0), yy + 3, 3, 1); d('#ffffff', bx + e + 1, yy, 1, 1); }
    },
    pied: soulier(AG, AG1, AG2),
  };

  /* Le pharaon : nemes raye bleu et or qui tombe sur les epaules, cobra d'or, barbe postiche, grand collier, pagne */
  const NM = '#2f5fb5', NMO = '#f0c93a', NMO2 = '#ffe27a';
  const raye = (x, y, w, h) => { r(NMO, x, y, w, h); for (let j = 1; j < h; j += 2) d(NM, x, y + j, w, 1); };
  COS.pharaon = {
    buste(P, st, x0, hb, lg) { const C = [NMO, '#3ac0c0', NMO, '#c8393b', NMO]; for (let j = 0; j < 5; j++) d(C[j], x0 - (j < 3 ? 1 : 0), hb - 1 + j, lg + (j < 3 ? 2 : 0), 1); },
    dessous(P, st, x0, hb, lg) {
      r('#f4f0e0', x0 - 1, hb + 13, lg + 2, 5); for (let i = 0; i < lg; i += 2) d('#d8d0b8', x0 + i, hb + 14, 1, 4);
      d(NMO, x0 + (lg >> 1) - 1, hb + 13, 3, 5); d('#3ac0c0', x0 + (lg >> 1), hb + 14, 1, 1);
    },
    tete(P, st, bx, by, a, ly) {
      if (a >= .5) { raye(bx - 9, by - 1, 5, 14); raye(bx - 6, by - 4, 12, 5); raye(bx - 3, by + 5, 3, 9); }
      else { raye(bx - 10, by + 1, 4, 13); raye(bx + 7, by + 1, 4, 13); raye(bx - 7, by - 4, 15, 5); }
      d(NMO2, bx - 6, by + 1, 12, 1);
      const cx = a >= .5 ? bx + 4 : bx - 1;
      r(NMO, cx, by - 3, 2, 3); d('#3ac0c0', cx, by - 2, 1, 1);
      if (a >= .5) { r(NM, bx + 2, by + 10, 2, 4); d(NMO, bx + 2, by + 11, 2, 1); d(NMO, bx + 2, by + 13, 2, 1); d(K, bx + 1, by + 2 + ly, 6, 1); d(K, bx + 6, by + 3 + ly, 1, 1); }
      else { r(NM, bx - 1, by + 10, 3, 4); d(NMO, bx - 1, by + 11, 3, 1); d(NMO, bx - 1, by + 13, 3, 1); d(K, bx - 4, by + 2 + ly, 3, 1); d(K, bx + 2, by + 2 + ly, 3, 1); }
    },
    pied: (P, x, fy, lg) => { r('#ba8358', x, fy + 1, lg, 2); d(NMO, x, fy + 2, lg, 1); d(NMO, x + 2, fy + 1, 1, 1); },
  };

  /* Le pere Noel : bonnet a pompon qui ballotte, grande barbe blanche, veste bordee de fourrure, ceinture, hotte et cadeau */
  const NR = '#d8282e', NR1 = '#9a1a22', NR2 = '#ff5a5a', FW = '#f8f8f4', FW1 = '#d0d4dc';
  COS.perenoel = {
    dos(P, st, a, h, hb, bx) {
      if (a === 0) return;
      const x = bx + (a === 1 ? -14 : a === .66 ? -13 : -10);
      r('#3a9a4a', x + 1, hb - 7, 5, 4); r('#4a7ad8', x + 4, hb - 9, 3, 6);
      r('#8a5a2a', x, hb - 1, 8, 12); r('#8a5a2a', x + 1, hb - 3, 6, 2);
      d('#ffd23a', x + 3, hb - 7, 1, 4); d('#ffd23a', x + 1, hb - 6, 5, 1); d('#ffffff', x + 5, hb - 9, 1, 6);
      d('#a8763a', x + 1, hb, 2, 10); d('#6a4420', x + 6, hb, 2, 11); d('#6a4420', x + 1, hb - 2, 6, 1);
    },
    buste(P, st, x0, hb, lg, a, bx) { d(FW, a === 1 ? x0 + lg - 3 : bx - 1, hb, 3, 11); d(FW1, a === 1 ? x0 + lg - 3 : bx - 1, hb + 10, 3, 1); },
    dessous(P, st, x0, hb, lg) { r(NR, x0 - 1, hb + 13, lg + 2, 2); r(FW, x0 - 1, hb + 15, lg + 2, 2); d(FW1, x0 - 1, hb + 16, lg + 2, 1); },
    tete(P, st, bx, by, a) {
      const b = a >= .5 ? bx - 1 : bx - 6, bw = a >= .5 ? 8 : 13;
      r(FW, b, by + 6, bw, 6); r(FW, b + 1, by + 12, bw - 2, 3); r(FW, b + 2, by + 15, bw - 4, 1);
      d(FW1, b + 1, by + 10, bw - 2, 1); d(FW1, b + 2, by + 13, bw - 4, 1); d('#ffffff', b + bw - 3, by + 7, 2, 3);
      if (a >= .5) { d('#ffffff', bx + 1, by + 6, 6, 1); d('#ff8a8a', bx + 2, by + 5, 2, 1); } else { d('#ffffff', bx - 4, by + 6, 9, 1); d('#ff8a8a', bx - 4, by + 5, 2, 1); d('#ff8a8a', bx + 3, by + 5, 2, 1); }
      const t = Math.round(sin(st.t * 4) * 1.2 + 1), t2 = Math.round(sin(st.t * 4 + 1) * 1.5);
      r(NR, bx - 5, by - 6, 10, 4); r(NR, bx - 4, by - 8, 7, 2);
      seg(NR, bx - 2, by - 8, bx - 7 - t, by - 9, 3); seg(NR, bx - 7 - t, by - 9, bx - 10 - t, by - 5 + t2, 2);
      disque(FW, bx - 10 - t, by - 3 + t2, 2);
      r(FW, bx - 6, by - 3, 13, 3); d(FW1, bx - 6, by - 1, 13, 1); d(NR2, bx - 3, by - 7, 4, 1);
    },
    pied: (P, x, fy, lg) => { r('#1c1a24', x, fy - 1, lg, 4); r(FW, x - 1, fy - 2, lg - 2, 2); d('#3a3c4a', x + 1, fy - 1, lg - 3, 1); },
  };

  /* Le roi : couronne d'or a pierres, manteau rouge borde d'hermine qui traine, col d'hermine, chaine d'or */
  const RR = '#9a1a3a', RR1 = '#6a0e26', RR2 = '#c83a5a', HE = '#f8f8f4';
  COS.roi = {
    dos(P, st, a, h, hb, bx) {
      const n = 24;
      for (let k = 0; k <= n; k++) {
        const v = sin(st.t * 3 - k * .3) * (k / n) * 1.6, back = (k * .45 + v) * Math.max(a, .12), w = Math.round(9 + k * .3 + (1 - a) * 6);
        const x = a === 1 ? bx - 6 - back : bx - w / 2 - back * .5, y = hb - 1 + k;
        r(RR, x, y, w, 1); d(RR1, x, y, 2, 1); d(RR2, x + w - 3, y, 1, 1);
        if (k > n - 3) { d(HE, x, y, w, 1); if (k === n - 1) for (let i = 1; i < w - 1; i += 3) d(K, x + i, y, 1, 1); }
      }
    },
    buste(P, st, x0, hb, lg, a, bx) {
      r(HE, x0 - 1, hb - 1, lg + 2, 3); for (let i = 1; i < lg; i += 3) d(K, x0 + i, hb, 1, 1);
      const x = a === 1 ? x0 + lg - 4 : bx - 2;
      d('#f0c93a', x, hb + 2, 1, 3); d('#f0c93a', x + 1, hb + 5, 1, 1); d('#f0c93a', x + 2, hb + 4, 1, 2); r('#f0c93a', x, hb + 6, 3, 3); d('#e8283a', x + 1, hb + 7, 1, 1);
    },
    tete(P, st, bx, by) {
      r('#f0c93a', bx - 5, by - 4, 11, 3);
      for (const x of [-5, -1, 3]) { r('#f0c93a', bx + x, by - 7 - (x === -1 ? 1 : 0), 2, 3 + (x === -1 ? 1 : 0)); d('#fff6c0', bx + x, by - 7 - (x === -1 ? 1 : 0), 1, 1); }
      d(RR, bx - 3, by - 6, 2, 2); d(RR, bx + 1, by - 6, 2, 2);
      d('#fff6c0', bx - 4, by - 4, 8, 1); d('#c8961a', bx - 5, by - 2, 11, 1);
      const sc = (st.t * 2 | 0) % 3;
      d(sc === 0 ? '#ffffff' : '#e8283a', bx - 1, by - 3, 2, 1); d(sc === 1 ? '#ffffff' : '#3a7ad8', bx - 4, by - 3, 1, 1); d(sc === 2 ? '#ffffff' : '#3ad07a', bx + 3, by - 3, 1, 1);
    },
    pied: (P, x, fy, lg) => { r(RR, x, fy + 1, lg, 2); d(RR2, x + 1, fy + 1, lg - 3, 1); d(RR1, x, fy + 2, lg, 1); d('#f0c93a', x + 2, fy + 1, 2, 1); },
  };

  const PERSOS = [
    { id: 'requin', n: 'Le requin', costume: 'requin', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 1, tee: 0, teeC: RQ, sansGilet: true, jean: '#687c96' },
    { id: 'clown', n: 'Le clown', costume: 'clown', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, peauC: '#f8f2ee', tee: 0, teeC: '#ffd84a', sansGilet: true, sansSangle: true, jean: '#3a7ad8', ceinture: NEZ, boucle: '#ffffff' },
    { id: 'ninja', n: 'Le ninja', costume: 'ninja', anime: true, cheveux: 3, couleur: 3, barbe: 0, lunettes: 0, peau: 1, tee: 0, teeC: NJ, sansGilet: true, jean: NJ, ceinture: BAND, boucle: BAND },
    { id: 'pompier', n: 'Le pompier', costume: 'pompier', cheveux: 0, couleur: 1, barbe: 0, lunettes: 0, peau: 1, tee: 0, teeC: PF, sansGilet: true, sansSac: true, sansSangle: true, jean: PF, ceinture: '#17151f', boucle: BG },
    { id: 'grenouille', n: 'La grenouille', costume: 'grenouille', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: GR, sansGilet: true, jean: GR, ceinture: GR1, boucle: GV },
    { id: 'robot', n: 'Le robot', costume: 'robot', anime: true, sansSac: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, peauC: RB, tee: 0, teeC: RB, sansGilet: true, sansSangle: true, jean: RB1, ceinture: '#5a6478', boucle: '#ffd23a' },
    { id: 'hotdog', n: 'Le hot-dog', costume: 'hotdog', sansSac: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 1, tee: 0, teeC: SC, sansGilet: true, sansSangle: true, jean: '#3a3a4a' },
    { id: 'lion', n: 'Le lion', costume: 'lion', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 1, tee: 0, teeC: LN, sansGilet: true, jean: LN, ceinture: LN1, boucle: LN2 },
    { id: 'momie', n: 'La momie', costume: 'momie', anime: true, sansSac: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, peauC: MM, tee: 0, teeC: MM, sansGilet: true, sansSangle: true, jean: '#d8cca8', ceinture: MM1, boucle: MM1 },
    { id: 'vampire', n: 'Le vampire', costume: 'vampire', anime: true, sansSac: true, cheveux: 3, couleur: 3, barbe: 0, lunettes: 0, peau: 0, peauC: '#dfe3ee', tee: 0, teeC: VP, sansGilet: true, sansSangle: true, jean: '#3e3a52', ceinture: VP1, boucle: '#e8b84a' },
    { id: 'pieuvre', n: 'La pieuvre', costume: 'pieuvre', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: PV, sansGilet: true, jean: PV1 },
    { id: 'citrouille', n: 'La citrouille', costume: 'citrouille', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: '#3a2a4a', sansGilet: true, jean: '#2a2434' },
    { id: 'scaphandrier', n: 'Le scaphandrier', costume: 'scaphandrier', anime: true, sansSac: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: '#c8b890', sansGilet: true, sansSangle: true, jean: '#a89870', ceinture: '#5a4a3a', boucle: LA },
    { id: 'bebe', n: 'Le bébé', costume: 'bebe', sansSac: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: '#fff4c8', sansGilet: true, sansSangle: true, jean: '#f4cdaa', ceinture: '#fbfbff', boucle: '#fbfbff' },
    { id: 'martien', n: 'Le Martien', costume: 'martien', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, peauC: MV, tee: 0, teeC: AG, sansGilet: true, sansSangle: true, jean: AG1, ceinture: AG1, boucle: '#ffd23a' },
    { id: 'pharaon', n: 'Le pharaon', costume: 'pharaon', sansSac: true, cheveux: 3, couleur: 3, barbe: 0, lunettes: 0, peau: 2, tee: 0, teeC: '#f4f0e0', sansGilet: true, sansSangle: true, jean: '#ba8358', ceinture: NMO, boucle: '#3ac0c0' },
    { id: 'perenoel', n: 'Le père Noël', costume: 'perenoel', anime: true, sansSac: true, cheveux: 0, couleur: 5, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: NR, sansGilet: true, sansSangle: true, jean: NR, ceinture: '#1c1a24', boucle: NMO },
    { id: 'roi', n: 'Le roi', costume: 'roi', anime: true, sansSac: true, cheveux: 1, couleur: 5, barbe: 2, lunettes: 0, peau: 0, tee: 0, teeC: '#2f4f9a', sansGilet: true, sansSangle: true, jean: '#e8e6df', ceinture: NMO, boucle: '#e8283a' },
  ];

  /* ================= LES DRONES ================= */

  /* L'avion en papier : une feuille de cahier pliee, vue un peu d'au-dessus (les deux ailes, le pli, la quille), lignes bleues,
     marge rouge, une etoile au feutre ; la queue frissonne, des filets de vent derriere */
  DRO.avion = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort) for (let i = 0; i < 3; i++) { const ph = (st.t * 2.2 + i / 3) % 1; if (p1()) d('rgba(255,255,255,.75)', Math.round(-42 - ph * 18), -15 + i * 5, 9 - Math.round(ph * 5), 1); }
      const fl = st.mort ? 0 : Math.round(sin(st.t * 22)), N = [33, -11], TC = [-27, -11 + fl];
      poly(r, '#c8d2e4', [N, [-23, -10 + fl], [-19, 1]]);
      poly(r, '#dfe6f2', [N, [-29, -18 + fl], TC]);
      poly(r, '#f8faff', [N, TC, [-31, -5 + fl]]);
      trait('#b8c4d8', 32, -11, -26, -11 + fl); trait('#b8c4d8', 30, -10, -20, 0); d('#eef2fa', -27, -17 + fl, 30, 1);
      trait('#9ac0f0', 26, -10, -27, -8 + fl); trait('#9ac0f0', 18, -9, -28, -6 + fl);
      trait('#ff8a8a', -21, -11, -23, -6 + fl);
      d('#ffd23a', -13, -9, 3, 1); d('#ffd23a', -12, -10, 1, 3);
    },
  };

  /* Le pot de pop-corn : rayures rouges et blanches, le tas de grains sous ses pieds, des grains qui sautent */
  const grain = (x, y) => { r('#fff6d8', x - 1, y - 1, 4, 3); d('#f8e08a', x, y + 1, 2, 1); d('#ffffff', x, y - 1, 1, 1); d('#d8a850', x + 2, y, 1, 1); };
  DRO.popcorn = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort) for (let i = 0; i < 3; i++) {
        const ph = (st.t * 1.1 + i / 3) % 1, x = Math.round([-10, 4, 12][i] + (i - 1) * ph * 12), y = Math.round(-16 - sin(ph * PI) * 16);
        if (ph < .95) grain(x, y);
      }
      for (let j = 0; j < 22; j++) {
        const hw = Math.round(17 - j * .25), y = -11 + j, W = 2 * hw + 1;
        r('#f4f0ea', -hw, y, W, 1);
        for (let b = 0; b < 7; b += 2) { const xs = -hw + Math.round(b * W / 7), xe = -hw + Math.round((b + 1) * W / 7); d('#d8282e', xs, y, xe - xs, 1); }
        d('#9a1a22', -hw, y, 1, 1); d('#ffffff', hw - 3, y, 1, 1);
      }
      d('#ffffff', -17, -11, 35, 2); d('#c8c0b8', -17, -10, 35, 1);
      for (const [x, y] of [[-14, -13], [-9, -14], [-4, -15], [1, -14], [6, -15], [11, -14], [15, -13], [-11, -17], [-1, -18], [9, -17], [4, -19]]) grain(x, y);
    },
  };

  /* La tortue de mer : carapace a ecailles sous ses pieds, la tete qui sourit, les nageoires qui rament */
  const TT = '#6aa85a', TT1 = '#3a6a2a', TC = '#7a8a3a', TC1 = '#5a6a2a', TC2 = '#a8b45a';
  DRO.tortue = {
    rotors: [],
    dessin(P, st) {
      const f = st.mort ? 0 : sin(st.t * 4), g = st.mort ? 0 : sin(st.t * 4 + 1.2);
      seg(TT, 6, -6, 13 - g * 2, -12 - g * 4, 3); seg(TT, 13 - g * 2, -12 - g * 4, 18 - g * 3, -15 - g * 5, 2);
      seg(TT, -14, -2, -22, g * 3, 3); seg(TT, -22, g * 3, -26, 1 + g * 4, 2);
      r(TT, 17, -7, 5, 4); r(TT, 20, -10, 9, 7);
      d('#8ac87a', 21, -10, 6, 1); d(TT1, 21, -4, 7, 1); d('#ffffff', 24, -9, 2, 2); d(K, 25, -9, 1, 2); d(TT1, 25, -6, 3, 1); d(TT1, 28, -7, 1, 1);
      for (let j = 0; j <= 10; j++) { const hw = Math.round(21 * Math.sqrt(1 - ((10 - j) / 11) ** 2)); r(TC, -hw, -12 + j, 2 * hw + 1, 1); }
      for (const [x, y] of [[-13, -6], [-5, -9], [3, -9], [11, -6], [-1, -5], [-9, -3], [7, -3]]) { d(TC2, x, y, 5, 2); d(TC1, x - 1, y + 2, 7, 1); d(TC1, x - 1, y - 1, 1, 3); }
      d('#c8d07a', -7, -12, 14, 1); d(TC1, -21, -3, 43, 2);
      r('#e8d890', -18, -1, 36, 2); d('#c8b870', -18, 0, 36, 1);
      seg(TT, 10, -2, 20, 2 + f * 5, 4); seg(TT, 20, 2 + f * 5, 27, 4 + f * 7, 2);
      d('#8ac87a', 12, -2, 4, 1);
    },
  };

  /* Le donut : pate doree, glacage rose qui coule, vermicelles qui tournent avec lui, et un vrai trou */
  DRO.donut = {
    rotors: [],
    dessin(P, st) {
      const RX = 22, RY = 10, cy = -2, rot = st.mort ? 0 : st.t * 1.8;
      disque('#d8964a', 0, cy, RX, RY);
      d('#b87430', -18, cy + 5, 36, 2); d('#9a5a24', -12, cy + 8, 24, 1);
      for (let j = -RY; j <= 2; j++) { const w = larg(RX - 2, RY - 1, j); d('#ff8ac0', -w, cy + j, 2 * w + 1, 1); }
      for (const [x, l] of [[-15, 3], [-7, 4], [3, 2], [12, 4], [17, 2]]) d('#ff8ac0', x, cy + 3, 3, l);
      d('#ffc0dc', -10, cy - 9, 12, 1); d('#ffc0dc', -16, cy - 6, 3, 1);
      const S = ['#ffe24a', '#4ab4ff', '#4ad06a', '#ffffff', '#b47aff', '#ff6a3a'];
      for (let i = 0; i < 14; i++) {
        const an = rot + i * PI * 2 / 14, x = Math.round(cos(an) * 14), y = cy + Math.round(sin(an) * 5) - 2;
        if (Math.abs(x) > 6 || Math.abs(y - cy) > 2) d(S[i % 6], x, y, 2, 1);
      }
      // le trou : un liseré sombre, puis on retire vraiment les pixels (on voit le decor au travers)
      if (p1()) {
        disqueD('#9a5a24', 0, cy, 7, 3);
        const c = H.ctx(), A = H.A, m = H.mir();
        for (let j = -2; j <= 2; j++) { const w = larg(6, 2, j), W = 2 * w + 1; let x = -w; if (m < 0) x = -x - W; c.clearRect(A.x + x, A.y + cy + j, W, 1); }
      }
    },
  };

  /* La cassette video : boitier noir, etiquette a rayures, bobines qui tournent, la bande qui s'echappe et flotte */
  DRO.cassette = {
    rotors: [],
    dessin(P, st) {
      const ro = st.mort ? 0 : st.t * 6;
      for (let i = 0; i < 26; i++) { const x = -27 - i, y = Math.round(sin(ro * .7 - i * .45) * 2.5 * (i / 26) + 1 + i * .15); r('#4a2e1e', x, y, 1, 2); d('#7a4e32', x, y, 1, 1); }
      r('#23242e', -26, -12, 53, 15);
      d('#3a3c4a', -25, -12, 51, 1); d('#17151f', -26, 1, 53, 2);
      d('#f4f0e6', -22, -10, 45, 4); d('#d8393b', -22, -10, 45, 1); d('#3a7ad8', -22, -9, 45, 1); d('#9a9890', -18, -7, 14, 1); d('#9a9890', 2, -7, 10, 1);
      d('#0e0f16', -16, -5, 33, 7);
      disqueD('#5a3a26', -9, -2, 3); disqueD('#5a3a26', 9, -2, 2);
      d('#5a3a26', -9, 1, 18, 1);
      for (const x of [-9, 9]) {
        disqueD('#f4f0e6', x, -2, 1);
        for (let k = 0; k < 3; k++) { const an = ro + k * 2.09; d('#23242e', x + Math.round(cos(an) * 1.4), -2 + Math.round(sin(an) * 1.4), 1, 1); }
      }
      d('rgba(255,255,255,.35)', -15, -5, 6, 1);
      for (const x of [-24, 24]) d('#8a8c9c', x, -1, 1, 1);
    },
  };

  /* La poele : elle vole sur la flamme bleue de son brûleur ; l'oeuf au plat grésille, la vapeur monte */
  DRO.poele = {
    rotors: [],
    dessin(P, st) {
      r('#5a5c6a', -15, 3, 31, 2); d('#7a7c8a', -14, 3, 29, 1);
      if (!st.mort) for (let i = 0; i < 7; i++) {
        const x = -12 + i * 4, h = 4 + Math.round(sin(st.t * 23 + i * 1.7) * 1.5 + 1.5);
        r('#4a9aff', x, 3 - h, 2, h); d('#d0ecff', x, 3 - h, 1, Math.max(1, h - 2)); d('#ffb43a', x, 2, 2, 1);
      }
      for (let j = 0; j < 8; j++) { const hw = Math.round(20 - j * .6); r('#2c2e3a', -hw, -12 + j, 2 * hw + 1, 1); }
      d('#5a5c6a', -20, -12, 41, 1); d('#3e404e', -18, -11, 5, 6); d('#17151f', -16, -5, 33, 1);
      r('#3a3c4a', -38, -11, 19, 2); r('#7a4a26', -49, -12, 12, 4); d('#9a6a3a', -48, -12, 10, 1); d('#4a2a16', -47, -10, 2, 1);
      r('#fbfbf4', -17, -14, 33, 2); r('#fbfbf4', -14, -15, 26, 1); r('#fbfbf4', 4, -16, 12, 1); r('#ffb81a', 7, -19, 8, 4); d('#fff0a0', 8, -19, 3, 1); d('#e89a10', 8, -16, 6, 1); d('#ffffff', -12, -15, 6, 1);
      if (!st.mort) for (let i = 0; i < 6; i++) if ((st.t * 5 + i * .37) % 1 < .5) d('#ffffff', -17 + i * 6, -13 - (i % 2), 1, 1);
      if (!st.mort) for (let i = 0; i < 2; i++) { const ph = (st.t * .7 + i * .5) % 1; bouffee(-6 + i * 10 + sin(st.t * 3 + i) * 2, -18 - ph * 16, 2 + Math.round(ph * 3), .6 * (1 - ph)); }
    },
  };

  /* Le poisson rouge : bocal rond (on voit au travers), l'eau, l'algue, les cailloux, le poisson qui fait des allers-retours */
  DRO.bocal = {
    rotors: [],
    dessin(P, st) {
      const R = 15, cy = 1;
      for (let j = -13; j <= R; j++) { const w = Math.round(Math.sqrt(Math.max(0, R * R - j * j))); r('rgba(200,235,255,.32)', -w, cy + j, 2 * w + 1, 1); }
      const sw = st.mort ? 0 : sin(st.t * 2) * 2;
      if (p1()) {
        for (let y = -8; y <= R + cy; y++) { const j = y - cy, w = Math.round(Math.sqrt(Math.max(0, R * R - j * j))) - 1; if (w > 0) d('rgba(70,160,255,.5)', -w, y, 2 * w + 1, 1); }
        d('#c8f0ff', -14, -8, 29, 1);
      }
      trait('#3a9a4a', -6, 14, -7 + sw, 6); trait('#3a9a4a', -7 + sw, 6, -5 + sw * 1.5, 0); trait('#4ab85a', -4, 14, -2 + sw, 8);
      for (const [x, c] of [[-8, '#c8b8a0'], [-4, '#e8a87a'], [0, '#a8a8b8'], [4, '#d8c8a8'], [7, '#b89a7a']]) d(c, x, 14, 3, 2);
      const fx = st.mort ? 0 : Math.round(sin(st.t * 1.3) * 7), dir = st.mort || cos(st.t * 1.3) > 0 ? 1 : -1, fy = 4 + (st.mort ? 0 : Math.round(sin(st.t * 2.6) * 1.5));
      const F = (xx, yy, w, h, c) => d(c, dir > 0 ? fx + xx : fx - xx - w + 1, fy + yy, w, h);
      F(-3, -1, 6, 3, '#ff7a1a'); F(-2, -2, 3, 1, '#ffa04a'); F(-6, -2, 2, 5, '#ff9a3a'); F(-4, -1, 1, 3, '#ff9a3a'); F(1, -1, 1, 1, K); F(-1, 1, 3, 1, '#d8540a');
      if (!st.mort && p1()) for (let i = 0; i < 2; i++) { const ph = (st.t * .9 + i * .5) % 1; d('rgba(255,255,255,.85)', fx + dir * 4, Math.round(fy - 2 - ph * 9), 1, 1); }
      r('#d8f0ff', -9, -14, 19, 2); d('#ffffff', -8, -14, 8, 1);
      d('rgba(255,255,255,.8)', -12, -6, 1, 7); d('rgba(255,255,255,.8)', -11, -8, 1, 2);
    },
  };

  /* Le hamburger : pain aux graines de sesame, salade qui ondule, fromage qui coule, steak, tomate */
  DRO.hamburger = {
    rotors: [],
    dessin(P, st) {
      const w = st.mort ? 0 : st.t * 5, dg = st.mort ? 0 : Math.round(1 + sin(st.t * 2) * 1.2);
      r('#d89a4a', -19, 4, 39, 5); r('#d89a4a', -17, 9, 35, 1); d('#b8762a', -19, 7, 39, 2); d('#e8b06a', -17, 4, 30, 1);
      r('#e8404a', -20, 2, 41, 2); d('#ff7a7a', -18, 2, 12, 1);
      r('#6a3a1a', -21, -3, 43, 5); for (let i = 0; i < 8; i++) d('#8a5a2a', -18 + i * 5, -2 + (i % 2), 2, 1); d('#4a2410', -21, 1, 43, 1);
      r('#ffc83a', -20, -5, 41, 2); r('#ffc83a', -15, -3, 3, 2 + dg); r('#ffc83a', 8, -3, 3, 3 + dg); d('#ffe27a', -18, -5, 30, 1);
      for (let x = -21; x <= 21; x++) { const y = -7 + Math.round(sin(x * .7 + w)); r('#5ac84a', x, y, 1, 2); d('#8ae07a', x, y, 1, 1); }
      for (let j = 0; j < 6; j++) { const hw = Math.round(19 * Math.sqrt(1 - ((5 - j) / 6.5) ** 2)); r('#e0a050', -hw, -12 + j, 2 * hw + 1, 1); }
      d('#f8c878', -8, -12, 10, 1); d('#f8c878', -13, -11, 4, 1); d('#c07a30', -19, -7, 39, 1);
      for (const [x, y] of [[-10, -10], [-4, -11], [3, -10], [9, -11], [14, -9], [-15, -8], [6, -8], [-1, -8]]) d('#fff6d8', x, y, 2, 1);
    },
  };

  /* Le chariot fusee : panier grillage, poignee rouge, une baguette et une salade dedans, roues qui tournent, reacteur derriere */
  DRO.chariot = {
    rotors: [],
    dessin(P, st) {
      const ro = st.mort ? 0 : st.t * 9;
      if (!st.mort && p1()) { const L = 9 + Math.round(sin(st.t * 31) * 2 + ((st.t * 23 | 0) % 2) * 2); for (let i = 0; i < L; i++) { const h = Math.max(1, Math.round(5 * (1 - i / L))); d('#ff8a2a', -35 - i, 1 - (h >> 1), 1, h); if (i < L * .6) d('#ffe24a', -35 - i, 1 - (h >> 2), 1, Math.max(1, h >> 1)); } }
      r('#d8393b', -34, -2, 12, 5); r('#9aa2b0', -36, -1, 2, 3); r('#d8393b', -22, -1, 3, 3); d('#ff6a5a', -33, -2, 10, 1); d('#ffffff', -30, -1, 3, 3);
      seg('#e0a050', -18, -11, -25, -24, 3); d('#f4d498', -21, -18, 1, 1); d('#f4d498', -23, -21, 1, 1); d('#b87a30', -19, -14, 1, 1);
      r('#5ab84a', 10, -17, 7, 6); d('#8ae07a', 11, -17, 3, 2); d('#3a8a3a', 13, -13, 3, 2);
      r('#c6ccd8', -22, -12, 41, 2); r('#c6ccd8', -16, 1, 31, 2);
      seg('#c6ccd8', 18, -11, 14, 2, 2); seg('#c6ccd8', -22, -11, -16, 2, 2);
      for (let x = -18; x <= 14; x += 4) trait('#9aa2b0', x - 2, -10, x, 0);
      d('#9aa2b0', -20, -5, 37, 1);
      r('#d8393b', -29, -16, 7, 3); d('#ff6a5a', -28, -16, 5, 1); seg('#c6ccd8', -24, -14, -21, -11, 1);
      seg('#9aa2b0', -13, 3, -12, 6, 1); seg('#9aa2b0', 11, 3, 10, 6, 1);
      for (const x of [-12, 10]) { disque('#23242e', x, 8, 3); for (let k = 0; k < 2; k++) { const an = ro + k * PI; d('#c6ccd8', x + Math.round(cos(an) * 2), 8 + Math.round(sin(an) * 2), 1, 1); } d('#8a8c9c', x, 8, 1, 1); }
    },
  };

  /* La pasteque : une tranche en demi-lune, ecorce verte, chair rouge a pepins, le jus qui goutte */
  DRO.pasteque = {
    rotors: [],
    dessin(P, st) {
      const demi = (c, R, V, f) => { for (let j = 0; j <= V; j++) { const w = Math.round(R * Math.sqrt(Math.max(0, 1 - (j / (V + .3)) ** 2))); f(c, -w, -12 + j, 2 * w + 1, 1); } };
      demi('#2e8a3a', 25, 14, r); demi('#86d06a', 23, 12, d); demi('#f0f8e0', 22, 11, d); demi('#e8404e', 20, 10, d);
      d('#ff7a8a', -18, -12, 36, 1); d('#c82a3a', -14, -4, 28, 1);
      for (const [x, y] of [[-14, -9], [-8, -6], [-2, -9], [4, -5], [10, -8], [15, -10], [-11, -3], [7, -1], [0, -2], [-5, -11], [12, -4]]) { d('#2c1a1a', x, y, 1, 2); d('#6a4a4a', x, y, 1, 1); }
      d('#1e6a2a', -15, 1, 30, 1);
      if (!st.mort && p1()) for (let i = 0; i < 2; i++) { const ph = (st.t * 1.1 + i * .5) % 1; d('#ff5a6a', -6 + i * 12, Math.round(3 + ph * 22), 1, 2); }
    },
  };

  /* La theiere : porcelaine a fleurs bleues, le bec qui fume, le couvercle qui saute quand ca bout */
  const PO = '#f4f4f8', PO1 = '#c8ccd8', BLF = '#3a6ad8';
  DRO.theiere = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort) for (let i = 0; i < 3; i++) { const ph = (st.t * .8 + i / 3) % 1; bouffee(28 + ph * 8, -14 - ph * 14, 2 + Math.round(ph * 3), .75 * (1 - ph), '255,255,255'); }
      seg(PO, -12, -5, -20, -5, 3); seg(PO, -20, -5, -21, 4, 3); seg(PO, -21, 4, -12, 7, 3);
      seg(PO, 11, 3, 20, -2, 4); seg(PO, 20, -2, 26, -10, 3);
      disque(PO, 0, 1, 14, 11);
      d('#ffffff', -8, -8, 7, 1); d('#ffffff', -11, -5, 2, 8); d(PO1, -10, 10, 20, 2); d(PO1, 9, -4, 3, 11);
      d('#e0b04a', -13, -4, 27, 1); d('#e0b04a', -13, 7, 27, 1);
      for (const [x, y] of [[-8, 2], [-1, 3], [6, 2], [-5, -8], [3, -8]]) { d(BLF, x, y, 3, 1); d(BLF, x + 1, y - 1, 1, 3); d('#ffd23a', x + 1, y, 1, 1); }
      const s = !st.mort && (st.t % 2.2) < .25 ? -2 : 0;
      r(PO, -9, -12 + s, 19, 3); r(BLF, -2, -15 + s, 5, 3); d('#ffffff', -8, -12 + s, 9, 1); d('#6a9aff', -1, -15 + s, 2, 1); d('#e0b04a', -9, -10 + s, 19, 1);
    },
  };

  /* L'aspirateur robot : vu un peu d'au-dessus, dessus clair et bouton, flanc sombre, pare-chocs, voyant qui clignote,
     ses brosses qui tournent dessous et la poussiere aspiree derriere */
  DRO.aspirateur = {
    rotors: [],
    dessin(P, st) {
      const ro = st.mort ? 0 : st.t * 14, on = st.mort ? false : (st.t * 2 | 0) % 2 === 0;
      for (const bxx of [-14, 14]) for (let k = 0; k < 3; k++) { const an = ro + k * 2.09; seg('#c8a83a', bxx, 1, bxx + cos(an) * 7, 1 + sin(an) * 2, 1); }
      if (!st.mort) for (let i = 0; i < 3; i++) { const ph = (st.t * 1.4 + i / 3) % 1; bouffee(-28 - ph * 16, -6 + sin(i * 2.1) * 3 - ph * 3, 2 + Math.round(ph * 3), .75 * (1 - ph), '170,160,150'); }
      disque('#3a3c4a', 0, -4, 23, 4);
      disque('#c8ced8', 0, -8, 23, 4);
      disqueD('#9aa2b0', 0, -8, 19, 3); disqueD('#dfe4ec', 0, -8, 18, 2); d('#ffffff', -12, -11, 14, 1);
      disqueD('#3a3c4a', 5, -8, 3, 1); d(on ? '#5af0ff' : '#1a6a7a', 4, -8, 3, 1);
      d('#5a5c6a', -22, -4, 45, 1); d('#17151f', -18, 0, 37, 1);
      d('#6a6c7a', 17, -6, 6, 4); d('#17151f', 19, -5, 3, 2); d(on ? '#ff5a5a' : '#7a2a2a', 20, -5, 1, 1);
    },
  };

  /* L'escargot turbo : coquille en spirale, cornes et yeux qui dodelinent, un reacteur fixe sur la coquille, la bave qui brille */
  const ES = '#c8d86a', ES1 = '#98a83a', ES2 = '#e8f0a0', CQE = '#d8883a', CQE1 = '#8a4a1a', CQE2 = '#f0b46a';
  DRO.escargot = {
    rotors: [],
    dessin(P, st) {
      const w = st.mort ? 0 : sin(st.t * 3) * 2, w2 = st.mort ? 0 : sin(st.t * 3 + 1.4) * 2;
      if (!st.mort && p1()) { const L = 8 + Math.round(sin(st.t * 29) * 2 + ((st.t * 21 | 0) % 2) * 2); for (let i = 0; i < L; i++) { const h = Math.max(1, Math.round(5 * (1 - i / L))); d('#ff8a2a', -28 - i, -7 - (h >> 1), 1, h); if (i < L * .6) d('#ffe24a', -28 - i, -7 - (h >> 2), 1, Math.max(1, h >> 1)); } }
      if (!st.mort && p1()) for (let i = 0; i < 4; i++) d('rgba(220,250,220,.7)', -30 - i * 7, 3 + (i % 2), 3, 1);
      seg(ES, 21, -10, 21 + w, -21, 2); seg(ES, 25, -10, 28 + w2, -20, 2);
      r('#ffffff', 20 + w, -24, 3, 3); r('#ffffff', 27 + w2, -23, 3, 3); d(K, 21 + w, -23, 1, 2); d(K, 28 + w2, -22, 1, 2);
      r(ES, -26, -2, 50, 5); r(ES, 17, -10, 10, 9); r(ES, 26, -6, 3, 4);
      d(ES2, -24, -2, 46, 1); d(ES1, -26, 2, 50, 1); d(ES2, 18, -10, 7, 1); d(ES1, 22, -4, 4, 1);
      r('#9aa2b0', -27, -10, 7, 6); d('#c6ccd8', -26, -10, 5, 1); d('#5a5c6a', -27, -5, 7, 1);
      disque(CQE, -5, -6, 15, 8);
      d(CQE2, -14, -13, 14, 1); d(CQE2, -17, -10, 3, 1); d(CQE1, -18, 1, 26, 1);
      // la spirale : un trait epais qui s'enroule vers le centre
      for (let k = 0; k <= 60; k++) { const an = PI * .35 + k / 60 * PI * 4.2, rr = 1 - k / 70, x = -5 + Math.round(cos(an) * 12 * rr), y = -6 + Math.round(sin(an) * 6.5 * rr); d(CQE1, x, y, 2, 1); d(CQE2, x, y - 1, 1, 1); }
    },
  };

  /* Le cerf-volant : un losange a quatre couleurs, ses baguettes, et une queue de noeuds qui ondule */
  DRO.cervolant = {
    rotors: [],
    dessin(P, st) {
      const C = ['#e8393b', '#ffd23a', '#3a9ae8', '#4ac86a'];
      let px = 0, py = 10;
      for (let i = 0; i < 6; i++) {
        const x = -5 - i * 6, y = Math.round(13 + i * 2 + sin(st.t * 6 - i * .8) * (1.5 + i * .5));
        trait('#5a5c6a', px, py, x, y); r(C[i % 4], x - 2, y - 1, 2, 3); r(C[i % 4], x + 1, y - 1, 2, 3); d('#ffffff', x - 2, y - 1, 1, 1);
        px = x; py = y;
      }
      for (let y = -14; y <= 10; y++) {
        const hw = Math.round(y <= -6 ? (y + 14) / 8 * 30 : (10 - y) / 16 * 30);
        r(y <= -6 ? C[0] : C[2], -hw, y, hw + 1, 1); r(y <= -6 ? C[1] : C[3], 1, y, hw, 1);
      }
      d('#8a5a2a', -30, -6, 61, 1); d('#8a5a2a', 0, -14, 1, 25);
      d('#ff7a7a', -8, -11, 6, 1); d('#fff08a', 3, -11, 6, 1);
    },
  };

  /* Le chaudron de sorciere : fonte noire ventrue, potion verte qui bouillonne, fumees violettes, flammes dessous */
  DRO.chaudron = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort) for (let i = 0; i < 5; i++) { const x = -10 + i * 5, h = 4 + Math.round(sin(st.t * 21 + i * 1.9) * 1.5 + 1.5); r('#ff7a2a', x, 11, 3, h); d('#ffe24a', x + 1, 11, 1, Math.max(1, h - 2)); }
      for (const x of [-13, -1, 11]) r('#2c2a34', x, 7, 3, 5);
      for (let j = 0; j < 20; j++) { const w = Math.round(19 * Math.sqrt(Math.max(0, 1 - ((j - 9) / 11) ** 2))); r('#2c2a34', -w, -10 + j, 2 * w + 1, 1); }
      d('#4a4858', -14, -6, 2, 10); d('#4a4858', -12, -8, 3, 1); d('#17151f', -16, 6, 32, 2);
      r('#3a3846', -20, -12, 41, 3); d('#5a5868', -19, -12, 39, 1);
      d('#6aff6a', -17, -13, 35, 1);
      if (!st.mort) for (let i = 0; i < 4; i++) { const ph = (st.t * 1.3 + i / 4) % 1, x = -14 + i * 9, s = ph < .7 ? 1 + Math.round(ph * 3) : 0; if (s) { r('#8aff7a', x, -14 - s - Math.round(ph * 4), s + 1, s + 1); d('#d8ffd0', x, -14 - s - Math.round(ph * 4), 1, 1); } }
      if (!st.mort) for (let i = 0; i < 2; i++) { const ph = (st.t * .6 + i * .5) % 1; bouffee(-20 - ph * 14 + sin(st.t * 2 + i) * 2, -16 - ph * 14, 3 + Math.round(ph * 3), .55 * (1 - ph), '190,120,230'); }
    },
  };

  /* Le traineau : caisse rouge a volutes d'or, patins recourbes, grelots qui se balancent, cadeau a l'arriere, etincelles de neige */
  const TR = '#c8282e', TR1 = '#8a1a22', TR2 = '#ff5a5a', TOR = '#f0c93a';
  DRO.traineau = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort && p1()) for (let i = 0; i < 5; i++) { const ph = (st.t * 1.2 + i / 5) % 1, x = Math.round(-34 - ph * 18), y = Math.round(-4 + sin(i * 2.7) * 6 + ph * 3); if (ph < .85) { d(i % 2 ? '#ffffff' : '#fff6c0', x, y - 1, 1, 3); d(i % 2 ? '#ffffff' : '#fff6c0', x - 1, y, 3, 1); } }
      r('#3a7ad8', -27, -30, 7, 6); d('#ffffff', -24, -30, 1, 6); d('#ffffff', -27, -28, 7, 1); r('#ffffff', -25, -32, 3, 2);
      r(TR, -29, -24, 8, 18); d(TR2, -28, -24, 6, 1); d(TR1, -29, -8, 8, 2); d(TOR, -27, -21, 4, 1); d(TOR, -27, -14, 4, 1);
      r(TOR, -26, 6, 48, 2); seg(TOR, 22, 7, 28, 4, 2); seg(TOR, 28, 4, 29, -2, 2); seg(TOR, 29, -2, 26, -4, 2);
      r(TOR, -16, 1, 2, 5); r(TOR, 10, 1, 2, 5); d('#fff6c0', -24, 6, 40, 1);
      r(TR, -24, -12, 44, 13); r(TR, 18, -18, 6, 10); seg(TR, 22, -18, 25, -21, 2);
      d(TR2, -22, -12, 40, 1); d(TR1, -24, -1, 44, 2); d(TOR, -24, -4, 44, 1); d(TOR, 18, -18, 2, 8);
      for (const x of [-18, -8, 2, 12]) { d(TOR, x, -9, 3, 1); d(TOR, x + 1, -10, 1, 3); }
      for (let i = 0; i < 4; i++) { const x = -18 + i * 10, y = Math.round(-1 + sin(st.t * 10 + i * 1.3) * (st.mort ? 0 : 1)); r(TOR, x, y, 3, 3); d('#fff6c0', x, y, 1, 1); d('#8a6a1a', x + 1, y + 2, 1, 1); }
    },
  };

  /* Le dirigeable : enveloppe argent a bande rouge, empennage, nacelle a hublots, l'helice qui tourne a l'arriere */
  DRO.dirigeable = {
    rotors: [],
    dessin(P, st) {
      const L = st.mort ? 3 : Math.round(Math.abs(sin(st.t * 30)) * 6) + 1;
      r('#5a5c6a', -38, -4 - L, 2, 2 * L + 1); r('#3a3c4a', -36, -5, 3, 3);
      poly(r, '#c8282e', [[-35, -19], [-31, -19], [-20, -9], [-35, -7]]); poly(r, '#c8282e', [[-35, -1], [-20, 1], [-31, 11], [-35, 11]]);
      d('#ff5a5a', -34, -18, 3, 1); d('#ff5a5a', -34, -17, 1, 8); d('#9a1a22', -34, 10, 3, 1);
      disque('#c8d0dc', 0, -4, 30, 8);
      d('#eef2f8', -18, -12, 34, 1); d('#eef2f8', -24, -10, 6, 1); d('#ffffff', -10, -11, 14, 1);
      d('#8a94a6', -24, 2, 48, 2); d('#a8b0c0', -28, 0, 56, 1);
      d('#d8393b', -29, -4, 59, 2);
      for (const x of [-20, -10, 0, 10, 20]) d('#a8b0c0', x, -11, 1, 6);
      r('#3a3c4a', -7, 6, 15, 4); d('#5a5c6a', -6, 6, 13, 1);
      for (const x of [-5, -1, 3]) d((st.t * 2 | 0) % 2 && x === 3 ? '#ffffff' : '#ffe27a', x, 7, 2, 1);
      trait('#5a5c6a', -6, 4, -8, 6); trait('#5a5c6a', 7, 4, 9, 6);
      d((st.t * 1.5 | 0) % 2 ? '#ff3b3b' : '#7a1a1a', 29, -5, 1, 2);
    },
  };

  /* Le dragon : il bat de son aile, sa queue a pointe ondule, il crache de petites fumees ; on est debout sur son dos */
  const DG = '#4aa84a', DG1 = '#2e7a34', DG2 = '#86d86a', DV = '#f0d870', DV1 = '#c8a840', DM = '#5ab86a', DM1 = '#2e7a40';
  DRO.dragon = {
    rotors: [],
    dessin(P, st) {
      const f = st.mort ? -.6 : sin(st.t * 6), w = st.mort ? 0 : sin(st.t * 4), w2 = st.mort ? 0 : sin(st.t * 4 - 1.3);
      // l'aile, au fond, derriere ses jambes
      const tx = -14 + Math.round(f * 2), ty = Math.round(-22 - f * 9), n = Math.max(1, -12 - ty);
      for (let k = 0; k <= n; k++) { const s = k / n, y = -12 - k, xl = Math.round(-15 + (tx + 15) * s), xr = Math.round(5 + (tx - 5) * s); r(DM, Math.min(xl, xr), y, Math.abs(xr - xl) + 1, 1); }
      trait(DM1, -1, -12, tx, ty); trait(DM1, -7, -12, Math.round(tx * .7 - 4), Math.round(ty * .7 - 4)); trait('#8ad89a', -12, -13, tx, ty + 1);
      // la queue
      seg(DG, -18, -8, -28, -6 + w * 1.5, 5); seg(DG, -28, -6 + w * 1.5, -37, -5 + w2 * 3, 3); seg(DG, -37, -5 + w2 * 3, -42, -7 + w2 * 4, 2);
      const qy = Math.round(-7 + w2 * 4);
      r('#f39a3a', -47, qy - 2, 4, 5); r('#f39a3a', -49, qy - 1, 2, 3); d('#ffc06a', -46, qy - 2, 2, 1);
      // le corps, le ventre a ecailles, les pattes
      r(DG, -14, -1, 4, 5); r(DG, 4, -1, 4, 5);
      r(DG, -20, -12, 34, 9); r(DG, -18, -3, 30, 2);
      d(DG2, -18, -12, 28, 1); d(DG1, -20, -5, 34, 2);
      d(DV, -16, -4, 26, 3); for (let i = 0; i < 9; i++) d(DV1, -15 + i * 3, -4, 1, 3);
      for (const x of [-14, -12, 4, 6]) d('#f4e8c8', x, 3, 1, 1);
      for (const x of [-19, -15]) r('#f39a3a', x, -14, 2, 2);
      // le cou et la tete
      seg(DG, 10, -8, 18, -17, 6);
      r('#f39a3a', 13, -16, 2, 2); r('#f39a3a', 16, -21, 2, 2);
      r(DG, 16, -25, 10, 8); r(DG, 25, -22, 6, 5);
      d(DG2, 17, -25, 7, 1); d(DG1, 25, -18, 6, 1); d(DG1, 26, -19, 4, 1);
      d('#ffffff', 20, -23, 3, 2); d(K, 21, -23, 2, 2); d('#ffffff', 22, -23, 1, 1);
      d(K, 29, -21, 1, 1);
      seg('#f4e8c8', 17, -25, 14, -29, 1); seg('#f4e8c8', 20, -25, 18, -30, 1);
      if (!st.mort) { const ph = st.t % 2.6; if (ph < 1.1) for (let k = 0; k < 3; k++) { const q = ph - k * .15; if (q > 0 && q < .8) bouffee(31 + q * 14, -21 - q * 6 - (1 + q * 2), 2 + Math.round(q * 4), .8 * (1 - q / .8), '210,210,220'); } }
    },
  };

  const MODELES = [
    { id: 'avion', n: 'Avion en papier', anime: true }, { id: 'popcorn', n: 'Pop-corn', anime: true }, { id: 'tortue', n: 'Tortue', anime: true },
    { id: 'donut', n: 'Donut', anime: true }, { id: 'cassette', n: 'Cassette', anime: true }, { id: 'poele', n: 'Poêle', anime: true },
    { id: 'bocal', n: 'Poisson rouge', anime: true }, { id: 'hamburger', n: 'Hamburger', anime: true }, { id: 'chariot', n: 'Chariot', anime: true },
    { id: 'pasteque', n: 'Pastèque', anime: true }, { id: 'theiere', n: 'Théière', anime: true }, { id: 'aspirateur', n: 'Aspirateur', anime: true },
    { id: 'escargot', n: 'Escargot', anime: true }, { id: 'cervolant', n: 'Cerf-volant', anime: true }, { id: 'chaudron', n: 'Chaudron', anime: true },
    { id: 'traineau', n: 'Traîneau', anime: true }, { id: 'dirigeable', n: 'Dirigeable', anime: true }, { id: 'dragon', n: 'Dragon', anime: true },
  ];
  G.PERSOS.push(...PERSOS);
  G.MODELES.push(...MODELES);
})();
