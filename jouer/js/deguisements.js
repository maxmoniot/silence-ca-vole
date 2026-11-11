/* Les deguisements et les drones farfelus du hangar (Max, 06/11/2026 : « ajoute plusieurs pages de personnages et de drones.
   Fais-en des rigolos, aie de l'imagination (personnages deguises ou autre), il faut que ca donne envie de continuer le jeu pour
   les debloquer »).
   Tout est peint au pixel par le code, comme le heros (hero.js) : un contour d'abord (r), les couleurs ensuite (d), en pixels de
   la haute definition, rien d'agrandi. Ce qui doit bouger bouge : cape, queue, ailes, flamme, clap, toasts... (tests/hangar_pages.js).
   Reperes (de profil, regardant a droite) : tete x -5..5, y by..by+9, nez en x 6 ; buste x0..x0+lg, hb..hb+12 ; hanches h ;
   pieds y -13 ; le dessus du drone en y -12, son centre en 0. */
'use strict';
(function () {
  const H = G.HeroPinceau, { r, d, seg, K } = H;
  const lu = G.tonLumiere, om = G.tonOmbre;
  const COS = G.HERO_COSTUMES, DRO = G.HERO_DRONES;
  const sin = Math.sin, cos = Math.cos;
  const p1 = () => H.passe() === 1;

  /* ---- Une capuche de costume : la tete couverte, le visage dans l'ouverture ---- */
  const fen = a => a === 1 ? [-1, 7] : a === .66 ? [-2, 6] : a === .33 ? [-3, 5] : [-4, 4];
  function capuche(bx, by, a, c, c1, c2) {
    const [f0, f1] = fen(a);
    r(c, bx - 7, by - 4, 14, 4);
    r(c, bx - 7, by, f0 + 7, 11);
    if (a < 1) r(c, bx + f1, by, 7 - f1, 11);
    r(c, bx - 6, by + 10, 13, 2);
    d(c2, bx - 5, by - 4, 9, 1); d(c2, bx - 7, by - 2, 1, 5);
    d(c1, bx - 7, by + 6, 2, 5); d(c1, bx - 6, by + 11, 13, 1);
    // le bord de l'ouverture, un ton plus sombre
    d(c1, bx + f0 - 1, by, 1, 10); d(c1, bx + f0 - 1, by - 1, f1 - f0 + 1, 1);
    if (a < 1) d(c1, bx + f1, by, 1, 10);
  }
  // le devant de la tete selon la vue : de profil il est a droite, de face au milieu
  const devant = (a, k) => Math.round(k * a);
  // une chaussure d'une couleur, avec son reflet et sa semelle
  const soulier = (c, c1, c2) => (P, x, fy, lg) => { r(c, x, fy + 1, lg, 2); d(c2, x + 1, fy + 1, lg - 3, 1); d(c1, x, fy + 2, lg, 1); };

  /* ================= LES PERSONNAGES ================= */

  /* Le dino : capuche de T. rex aux dents blanches, piquants orange, une queue qui fouette */
  const V0 = '#5aa84a', V1 = '#3d7a34', V2 = '#8fd06a', OR = '#f39a3a', OR1 = '#c46a1a';
  COS.dino = {
    dos(P, st, a, h, hb, bx) {
      const k = Math.max(a, .35), w = sin(st.t * 4.2), w2 = sin(st.t * 4.2 - 1.1);
      const pts = [[-3, h - 5], [-9, h - 2 + w * .4], [-15, h + 2 + w], [-20, h + 4 + w2 * 1.8], [-24, h + 3 + w2 * 2.8]];
      const ep = [6, 5, 4, 2];
      for (let i = 0; i < 4; i++) seg(V0, bx + pts[i][0] * k, pts[i][1], bx + pts[i + 1][0] * k, pts[i + 1][1], ep[i]);
      for (let i = 1; i < 4; i++) { const [x, y] = pts[i]; r(OR, bx + x * k - 1, y - ep[i - 1] / 2 - 2, 2, 2); }
      for (let i = 0; i < 3; i++) { const [x, y] = pts[i + 1]; d(V1, bx + x * k - 1, y + ep[i] / 2 - 1, 3, 1); d(V2, bx + x * k - 1, y - ep[i] / 2 + 1, 2, 1); }
    },
    buste(P, st, x0, hb, lg, a, bx) {
      // le ventre clair, rainure par rainure
      const x = a === 1 ? x0 + lg - 4 : bx - 3, w = a === 1 ? 3 : 7;
      d('#d8e08a', x, hb + 2, w, 9);
      for (let i = 0; i < 3; i++) d('#b8c066', x, hb + 4 + i * 3, w, 1);
    },
    tete(P, st, bx, by, a) {
      capuche(bx, by, a, V0, V1, V2);
      if (a >= .5) {
        // la machoire du haut, au-dessus du front, et ses dents
        r(V0, bx - 2, by - 7, 12, 5); r(V0, bx - 4, by - 9, 7, 3);
        d(V2, bx - 1, by - 7, 9, 1); d(V1, bx + 9, by - 6, 1, 1);
        for (let i = 0; i < 5; i++) d('#fff', bx + 1 + i * 2, by - 2, 1, 2);
        d('#fff', bx - 2, by - 9, 3, 2); d(K, bx - 1, by - 9, 1, 2);
        for (const [x, y] of [[-6, -8], [-9, -4], [-9, 0], [-9, 4]]) r(OR, bx + x, by + y, 2, 2);
      } else {
        r(V0, bx - 6, by - 8, 13, 5);
        d(V1, bx - 2, by - 6, 1, 1); d(V1, bx + 2, by - 6, 1, 1);
        for (let i = 0; i < 6; i++) d('#fff', bx - 5 + i * 2, by - 3, 1, 2);
        d('#fff', bx - 5, by - 10, 3, 2); d('#fff', bx + 3, by - 10, 3, 2); d(K, bx - 4, by - 10, 1, 2); d(K, bx + 4, by - 10, 1, 2);
        for (const x of [-2, 1]) r(OR, bx + x, by - 11, 2, 2);
      }
    },
    pied: (P, x, fy, lg) => { r(V0, x, fy, lg, 3); d(V1, x, fy + 2, lg, 1); d('#f4f0e0', x + lg - 1, fy + 2, 1, 1); d('#f4f0e0', x + lg - 3, fy + 2, 1, 1); },
  };

  /* Super Cadreur : cape qui claque au vent, loup noir, ecusson, et le slip par-dessus le collant */
  const RG = '#d8393b', RG1 = '#9a2228', RG2 = '#ff6a5a', BL = '#2f6fb5', JA = '#ffd54a';
  COS.super = {
    dos(P, st, a, h, hb, bx) {
      const n = 19;
      for (let k = 0; k <= n; k++) {
        const v = sin(st.t * 7 - k * .5) * (k / n) * 2.4, back = (k * .5 + v) * Math.max(a, .12), w = Math.round(7 + k * .22 + (1 - a) * 6);
        const x = a === 1 ? bx - 4 - back : bx - w / 2 - back * .5, y = hb + k;
        r(RG, x, y, w, 1);
        d(RG1, x, y, 2, 1); if (k > 2) d(RG2, x + w - 2, y, 1, 1);
        if (k === n) d(RG1, x, y, w, 1);
      }
    },
    buste(P, st, x0, hb, lg, a, bx) {
      const x = a === 1 ? x0 + lg - 5 : bx - 2;
      d(JA, x + 1, hb + 2, 3, 1); d(JA, x, hb + 3, 5, 2); d(JA, x + 1, hb + 5, 3, 1); d(JA, x + 2, hb + 6, 1, 1); d(RG, x + 1, hb + 3, 3, 2);
    },
    dessous(P, st, x0, hb, lg) { r(RG, x0, hb + 12, lg, 3); d(RG2, x0 + 1, hb + 12, lg - 3, 1); d(RG1, x0, hb + 14, lg, 1); },
    tete(P, st, bx, by, a, ly) {
      const y = by + 2 + ly, w = Math.round(1 + sin(st.t * 9));
      if (a >= .5) {
        d('#23242e', bx, y, 7, 3); d('#fff', bx + 2, y + 1, 3, 1);
        // les deux bouts du noeud, derriere la tete
        r('#23242e', bx - 7 - w, y, 2, 1); r('#23242e', bx - 8 - w * 2, y + 2, 3, 1);
      } else {
        d('#23242e', bx - 5, y, 11, 3); d('#fff', bx - 4, y + 1, 3, 1); d('#fff', bx + 2, y + 1, 3, 1);
      }
      d('#2c2833', bx + devant(a, 3), by - 1, 1, 2);
    },
    pied: soulier(RG, RG1, RG2),
  };

  /* Monsieur Banane : la banane entiere, le visage dans l'ouverture, la queue brune en haut */
  const BA = '#f6d23a', BA1 = '#c99a1a', BA2 = '#fff08a', BR = '#6a4a1a';
  COS.banane = {
    buste(P, st, x0, hb, lg, a, bx) {
      for (let j = 0; j <= 18; j++) {
        const o = Math.round(1.6 * sin(j / 18 * Math.PI)) * (a === 1 ? 1 : 0), w = j > 14 ? 13 - (j - 14) * 3 : 13;
        const x = (a === 1 ? x0 - 1 : bx - 6) + o + (13 - w) / 2;
        r(BA, x, hb - 2 + j, w, 1);
        d(BA1, x, hb - 2 + j, 1, 1); d(BA2, x + w - 3, hb - 2 + j, 1, 1); d(BA1, x + 4, hb - 2 + j, 1, 1);
      }
      r(BR, (a === 1 ? x0 + 4 : bx - 1), hb + 17, 3, 2);
    },
    tete(P, st, bx, by, a) {
      capuche(bx, by, a, BA, BA1, BA2);
      r(BA, bx - 6, by - 6, 12, 2); r(BA, bx - 5, by - 8, 9, 2); r(BA, bx - 4, by - 10, 6, 2);
      d(BA2, bx - 3, by - 8, 4, 1); d(BA1, bx - 6, by - 5, 2, 1);
      r(BR, bx - 3, by - 13, 3, 3); r(BR, bx - 5, by - 14, 3, 2); d('#9a7a3a', bx - 2, by - 13, 1, 2);
    },
    pied: soulier(BR, '#3a2a10', '#9a7a3a'),
  };

  /* La licorne : pyjama blanc, corne doree, criniere et queue arc-en-ciel qui flottent */
  const LI = '#f8f4fa', LI1 = '#d8c8e0', LI2 = '#ffffff', ARC = ['#ff6a8a', '#ffb43a', '#ffe24a', '#6ad06a', '#5ab4ff', '#a07aff'];
  COS.licorne = {
    dos(P, st, a, h, hb, bx) {
      const k = Math.max(a, .3);
      for (let i = 0; i < 4; i++) { const w = sin(st.t * 6 + i) * 1.5; seg(ARC[i + 1], bx - 4 * k, h - 4 + i, bx + (-11 - i) * k, h + 3 + i * 1.6 + w, 2); }
    },
    buste(P, st, x0, hb, lg, a, bx) { d('#ffd0e8', a === 1 ? x0 + lg - 4 : bx - 3, hb + 2, a === 1 ? 3 : 7, 9); },
    tete(P, st, bx, by, a) {
      // la criniere : six meches, derriere, dans le vent
      for (let i = 0; i < 6; i++) { const w = sin(st.t * 6 + i * .8) * 1.4; seg(ARC[i], bx - 6, by - 4 + i * 2, bx - 10 - (i % 2) + w, by - 2 + i * 2.4, 2); }
      capuche(bx, by, a, LI, LI1, LI2);
      // les oreilles et la corne
      r(LI, bx - 4, by - 6, 2, 2); d('#ff9ac8', bx - 4, by - 5, 1, 1); r(LI, bx - 1, by - 6, 2, 2); d('#ff9ac8', bx, by - 5, 1, 1);
      const cx = devant(a, 4);
      seg('#f0c93a', bx + cx, by - 4, bx + cx + devant(a, 3), by - 11, 2);
      d('#fff6c0', bx + cx + devant(a, 1), by - 6, 1, 1); d('#fff6c0', bx + cx + devant(a, 2), by - 9, 1, 1);
    },
    pied: (P, x, fy, lg) => { r('#b8a0d8', x + 1, fy + 1, lg - 1, 2); d('#7a62a0', x + 1, fy + 2, lg - 1, 1); d('#e0d0f4', x + 2, fy + 1, 2, 1); },
  };

  /* Le chevalier : heaume a fente, plumet rouge qui ondule, cotte bleue, genouilleres */
  const AC = '#b8c0cc', AC1 = '#7a8494', AC2 = '#e4e9f0', NOIR = '#2c2e3a';
  COS.chevalier = {
    genou: true,
    buste(P, st, x0, hb, lg, a, bx) {
      const x = a === 1 ? x0 + 3 : bx - 3, w = a === 1 ? lg - 4 : 7;
      d('#2f4f9a', x, hb + 2, w, 9); d('#4a6ac0', x, hb + 2, w, 1); d('#f0c93a', x, hb + 10, w, 1);
      d('#f0c93a', x + (w >> 1) - 1, hb + 4, 2, 4); d('#f0c93a', x + (w >> 1) - 2, hb + 5, 4, 1);
      r(AC, x0 - 1, hb - 1, 5, 3); d(AC2, x0, hb - 1, 3, 1);
    },
    tete(P, st, bx, by, a, ly) {
      const w = Math.round(sin(st.t * 5) * 1.5 + 1.5);
      seg(RG, bx, by - 5, bx - 4, by - 9 - (w >> 1), 3); seg(RG, bx - 4, by - 9 - (w >> 1), bx - 9 - w, by - 7 + w, 3);
      d(RG2, bx - 2, by - 8, 2, 1); d(RG1, bx - 8 - w, by - 6 + w, 2, 1);
      r(AC, bx - 6, by - 3, 13, 14); r(AC, bx - 4, by - 5, 9, 2);
      d(AC2, bx - 3, by - 5, 4, 1); d(AC2, bx - 5, by - 2, 1, 7); d(AC1, bx - 6, by + 8, 13, 3);
      if (a >= .5) {
        d(NOIR, bx + 1, by + 3, 6, 2); d('#9ad8ff', bx + 4, by + 3, 1, 1);
        for (const x of [3, 5]) d(NOIR, bx + x, by + 7, 1, 1);
        d(AC2, bx + 5, by - 2, 1, 4);
      } else {
        d(NOIR, bx - 5, by + 3, 11, 2); d('#9ad8ff', bx - 3, by + 3, 1, 1); d('#9ad8ff', bx + 2, by + 3, 1, 1);
        d(AC2, bx, by - 3, 1, 5); for (const x of [-2, 0, 2]) d(NOIR, bx + x, by + 7, 1, 1);
      }
    },
    pied: soulier(AC, AC1, AC2),
  };

  /* Le fantome : le drap sur la tete, deux trous pour les yeux, l'ourlet qui ondule, et les baskets qui depassent */
  const DR = '#f2f2f8', DR1 = '#c4c4dc', DR2 = '#ffffff';
  COS.fantome = {
    dessous(P, st, x0, hb, lg, a, bx) {
      const xg = (a === 1 ? x0 : bx - 6) - 2, w = 15;
      r(DR, xg, hb - 1, w, 18);
      d(DR2, xg + w - 4, hb, 2, 10); d(DR1, xg + 1, hb + 2, 2, 14); d(DR1, xg + 6, hb + 9, 1, 7);
      // l'ourlet en festons qui ondulent
      for (let i = 0; i < 5; i++) { const u = Math.round(1.5 + sin(st.t * 6 + i * 1.3) * 1.5); r(DR, xg + i * 3, hb + 17, 3, u); d(DR1, xg + i * 3, hb + 16 + u, 3, 1); }
    },
    tete(P, st, bx, by, a, ly) {
      r(DR, bx - 7, by - 3, 15, 14); r(DR, bx - 5, by - 5, 11, 2);
      d(DR2, bx - 3, by - 5, 5, 1); d(DR2, bx - 6, by - 2, 1, 5); d(DR1, bx - 7, by + 8, 3, 3);
      const peur = st.mood === 'peur';
      const e = a >= .5 ? [1, 4] : [-3, 2], m = a >= .5 ? 2 : -1;
      for (const x of e) d('#23242e', bx + x, by + 2 + ly, 2, 3);
      d('#23242e', bx + m, by + 7, 2, peur ? 3 : 2);
    },
  };

  /* Le poulet : la crete rouge, le bec orange au-dessus du visage, la queue en plumes qui frissonne, les pattes */
  const PO = '#f8f6ee', PO1 = '#d0ccb8', PO2 = '#ffffff', BE = '#f39a2a', BE1 = '#c8701a';
  COS.poulet = {
    dos(P, st, a, h, hb, bx) {
      const k = Math.max(a, .3);
      for (let i = 0; i < 3; i++) { const w = sin(st.t * 8 + i * 1.7) * 1.2; seg(PO, bx - 4 * k, h - 4, bx + (-9 - i * 2) * k + w, h - 9 - i * 2 + i * 3, 3); }
      // un bout d'aile dans le dos, qui bat
      const f = Math.round(sin(st.t * 10) * 1.5);
      r(PO, bx - 7 * k, hb + 2 + f, 4, 6); d(PO1, bx - 7 * k, hb + 6 + f, 4, 1);
    },
    buste(P, st, x0, hb, lg, a, bx) { for (let i = 0; i < 3; i++) d(PO1, (a === 1 ? x0 + 2 : bx - 3) + (i % 2) * 3, hb + 3 + i * 3, 2, 1); },
    tete(P, st, bx, by, a) {
      capuche(bx, by, a, PO, PO1, PO2);
      r('#e8393b', bx - 3, by - 6, 2, 2); r('#e8393b', bx - 1, by - 7, 2, 3); r('#e8393b', bx + 1, by - 6, 2, 2); d('#ff6a6a', bx - 1, by - 7, 1, 1);
      if (a >= .5) { r(BE, bx + 4, by - 3, 5, 2); d(BE1, bx + 4, by - 2, 5, 1); d(K, bx + 2, by - 4, 1, 1); r('#e8393b', bx + 6, by - 1, 2, 1); }
      else { r(BE, bx - 1, by - 3, 3, 3); d(BE1, bx - 1, by - 1, 3, 1); d(K, bx - 3, by - 4, 1, 1); d(K, bx + 2, by - 4, 1, 1); }
    },
    pied: (P, x, fy, lg) => { r(BE, x, fy + 2, lg, 1); r(BE, x + lg - 1, fy + 1, 2, 1); d(BE1, x, fy + 2, 2, 1); d(BE, x + lg, fy + 2, 1, 1); },
  };

  /* Le Viking : casque a cornes, barbe rousse en tresses, col de fourrure */
  const CO = '#f0e6c8', CO1 = '#c8b890', CO2 = '#8a7a5a', FO = '#a8988a';
  COS.viking = {
    buste(P, st, x0, hb, lg, a, bx) {
      r(FO, x0 - 1, hb - 1, lg + 2, 3); for (let i = 0; i < lg; i += 2) d('#c8bcae', x0 + i, hb - 1, 1, 1); d('#7a6a5a', x0 - 1, hb + 1, lg + 2, 1);
      d('#c8963a', x0 + (lg >> 1) - 1, hb + 10, 4, 3); d('#f0cf7a', x0 + (lg >> 1), hb + 11, 2, 1);
    },
    tete(P, st, bx, by, a) {
      // les tresses de la barbe
      const tx = a >= .5 ? [1, 4] : [-3, 2];
      for (const x of tx) { r(P.h, bx + x, by + 9, 2, 5); d(P.h1, bx + x, by + 11, 2, 1); d('#d9b85a', bx + x, by + 12, 2, 1); }
      for (const s of [-1, 1]) {
        seg(CO, bx + 6 * s, by - 2, bx + 10 * s, by - 6, 3); seg(CO, bx + 10 * s, by - 6, bx + 10 * s, by - 10, 2);
        d(CO2, bx + 10 * s, by - 10, 1, 1); d(CO1, bx + 7 * s, by - 2, 2, 1);
      }
      r(AC, bx - 6, by - 4, 13, 5); r(AC, bx - 4, by - 6, 9, 2);
      d(AC2, bx - 3, by - 6, 5, 1); d(AC2, bx - 5, by - 3, 1, 3); d(AC1, bx - 6, by, 13, 1);
      for (const x of [-4, 0, 4]) d('#d9b85a', bx + x, by - 1, 1, 1);
      r(AC, bx + (a >= .5 ? 5 : 0), by, 2, 5);
    },
    pied: soulier('#7a6a5a', '#4a3a2a', '#a89a8a'),
  };

  /* Le magicien : chapeau pointu etoile dont la pointe flotte, longue barbe blanche, robe qui ondule, babouches rouges */
  const MA = '#2c3a8a', MA1 = '#1c2660', MA2 = '#4a5ab8', ET = '#ffe27a', RO = '#5a3aa8', RO1 = '#3a2478', RO2 = '#7a5ac8';
  COS.magicien = {
    buste(P, st, x0, hb, lg, a, bx) {
      d(ET, x0 + 2, hb + 3, 1, 1); d(ET, x0 + lg - 4, hb + 7, 1, 1); d(ET, x0 + 3, hb + 9, 1, 1);
      d('#f0c93a', x0, hb + 11, lg, 1);
    },
    dessous(P, st, x0, hb, lg, a) {
      // la robe jusqu'aux genoux, son bas qui ondule
      for (let j = 0; j < 9; j++) { const e = j >> 2, o = j > 6 ? Math.round(sin(st.t * 5 + j) * .8) : 0; r(RO, x0 - e + o, hb + 13 + j, lg + 2 * e, 1); }
      d(RO1, x0 - 2, hb + 19, 2, 3); d(RO2, x0 + lg - 2, hb + 13, 1, 6); d(ET, x0 + 3, hb + 16, 1, 1);
    },
    tete(P, st, bx, by, a) {
      // la barbe sur la poitrine
      const bb = a >= .5 ? bx : bx - 3, bw = a >= .5 ? 6 : 7, w = Math.round(sin(st.t * 3) * .8);
      r('#ecebf2', bb, by + 6, bw, 6); r('#ecebf2', bb + 1, by + 12, bw - 2, 5); r('#ecebf2', bb + 2 + w, by + 17, 2, 2);
      d('#b8b8c8', bb + 1, by + 9, 1, 6); d('#ffffff', bb + bw - 2, by + 7, 1, 4); d('#b8b8c8', bb + 3, by + 13, 1, 3);
      // le chapeau
      const t = Math.round(1 + sin(st.t * 4) * 1.2 + (st.meche || 0) * .5);
      r(MA, bx - 9, by - 2, 19, 2); r(MA, bx - 5, by - 5, 10, 3); r(MA, bx - 4, by - 8, 8, 3); r(MA, bx - 3, by - 11, 6, 3);
      seg(MA, bx, by - 11, bx - 2 - t, by - 14, 3); seg(MA, bx - 2 - t, by - 14, bx - 6 - t * 2, by - 16, 2); seg(MA, bx - 6 - t * 2, by - 16, bx - 9 - t * 3, by - 15 + (t >> 1), 1);
      d(MA2, bx - 7, by - 2, 10, 1); d(MA1, bx - 9, by - 1, 19, 1); d('#f0c93a', bx - 5, by - 3, 10, 1);
      d(ET, bx - 1, by - 7, 1, 1); d(ET, bx + 1, by - 10, 1, 1); d(ET, bx - 3, by - 6, 1, 1); d(ET, bx + 2, by - 6, 2, 1); d(ET, bx + 3, by - 7, 1, 1);
    },
    pied: (P, x, fy, lg) => { r(RG, x, fy + 1, lg, 2); r(RG, x + lg, fy, 1, 1); d(RG1, x, fy + 2, lg, 1); d(RG2, x + 1, fy + 1, lg - 3, 1); },
  };

  /* Le cow-boy : chapeau a bords releves, foulard rouge, gilet de cuir et etoile de sherif, bottes a eperons */
  const CH = '#9a6a3a', CH1 = '#6a4420', CH2 = '#c89a5a';
  COS.cowboy = {
    buste(P, st, x0, hb, lg, a, bx) {
      const x = a === 1 ? x0 + lg - 6 : bx - 3;
      r(RG, x, hb - 1, 6, 3); d(RG2, x + 1, hb - 1, 2, 1); d('#fff', x + 3, hb, 1, 1);
      const sx = a === 1 ? x0 + 1 : x0 + 2;
      d('#f0c93a', sx + 1, hb + 4, 1, 3); d('#f0c93a', sx, hb + 5, 3, 1); d('#fff6c0', sx + 1, hb + 5, 1, 1);
    },
    tete(P, st, bx, by, a) {
      r(CH, bx - 9, by - 2, 19, 2); r(CH, bx - 10, by - 4, 2, 2); r(CH, bx + 9, by - 4, 2, 2);
      r(CH, bx - 5, by - 8, 11, 6);
      d(CH2, bx - 8, by - 2, 16, 1); d(CH1, bx - 9, by - 1, 19, 1); d(CH1, bx - 1, by - 8, 3, 1); d(CH2, bx - 4, by - 7, 3, 1);
      d('#3a2a1a', bx - 5, by - 3, 11, 1);
      // la moustache en guidon
      const m = a >= .5 ? bx + 1 : bx - 3;
      d(P.h, m, by + 6, 6, 1); d(P.h, m - 1, by + 5, 1, 1); d(P.h, m + 6, by + 5, 1, 1);
    },
    pied: (P, x, fy, lg) => { r(CH1, x, fy - 1, lg, 4); d(CH, x + 1, fy - 1, lg - 3, 1); d('#3a2a1a', x, fy + 2, lg, 1); d('#f0c93a', x - 1, fy + 1, 1, 1); },
  };

  /* Le cuistot : toque, grosse moustache, veste a boutons, foulard, et la louche qui depasse du sac */
  const TO = '#f8f8f4', TO1 = '#c8c8d0', TO2 = '#ffffff';
  COS.chef = {
    dos(P, st, a, h, hb, bx) {
      if (a === 0) return;
      const x = bx - 9 * a;
      seg('#c6ccd8', x, hb + 3, x - 2, hb - 6, 1); r('#c6ccd8', x - 4, hb - 9, 4, 3); d('#f4f8ff', x - 3, hb - 9, 2, 1);
    },
    buste(P, st, x0, hb, lg, a, bx) {
      const x = a === 1 ? x0 + lg - 4 : bx - 3;
      for (let i = 0; i < 3; i++) { d(TO1, x, hb + 3 + i * 3, 1, 1); if (a < 1) d(TO1, x + 5, hb + 3 + i * 3, 1, 1); }
      r(RG, a === 1 ? x0 + lg - 6 : bx - 2, hb - 1, 5, 2);
    },
    tete(P, st, bx, by, a) {
      r(TO, bx - 5, by - 4, 11, 3); r(TO, bx - 7, by - 10, 15, 6); r(TO, bx - 5, by - 12, 11, 2);
      d(TO2, bx - 4, by - 12, 6, 1); d(TO2, bx - 6, by - 9, 2, 3);
      for (const x of [-3, 1, 4]) d(TO1, bx + x, by - 9, 1, 5);
      d(TO1, bx - 5, by - 2, 11, 1);
      const m = a >= .5 ? bx + 1 : bx - 3;
      d('#2c2833', m, by + 6, 6, 1); d('#2c2833', m - 1, by + 5, 1, 1); d('#2c2833', m + 6, by + 5, 1, 1); d('#4a4458', m + 1, by + 6, 2, 1);
    },
    pied: soulier('#2c2a38', '#17151f', '#4a4c5a'),
  };

  /* L'abeille : rayures, antennes qui dodelinent, ailes transparentes qui battent, dard */
  const AB = '#f4c430', AB1 = '#2c2833';
  COS.abeille = {
    dos(P, st, a, h, hb, bx) {
      r(AB1, bx - 7 * Math.max(a, .3), h - 4, 3, 2); d('#4a4458', bx - 8 * Math.max(a, .3), h - 3, 1, 1);
      if (!p1()) return;
      // les ailes : sans contour, presque transparentes, accrochees a l'epaule, deux poses qui alternent tres vite
      const haut = (st.t * 16 | 0) % 2 === 0, k = Math.max(a, .5), x0 = bx - 4 * k;
      // [haut de l'aile, hauteur, longueur vers l'arriere] : la grande, puis la petite
      const ailes = haut ? [[-11, 13, 8], [1, 7, 6]] : [[-4, 7, 13], [2, 5, 9]];
      for (const [ay, hh, lw] of ailes) {
        for (let j = 0; j < hh; j++) {
          const e = Math.max(1, Math.round(Math.sqrt(Math.max(0, 1 - ((j + .5) / hh * 2 - 1) ** 2)) * lw * k));
          d('rgba(205,238,255,.7)', x0 - e, hb + 2 + ay + j, e, 1);
          d('rgba(255,255,255,.95)', x0 - e, hb + 2 + ay + j, 1, 1);
        }
        d('rgba(60,70,100,.55)', x0 - 1, hb + 2 + ay, 1, hh);
      }
    },
    buste(P, st, x0, hb, lg) { d(AB1, x0, hb + 3, lg, 2); d(AB1, x0, hb + 7, lg, 2); },
    tete(P, st, bx, by, a) {
      const w = sin(st.t * 5) * 1.2;
      d(AB1, bx - 5, by - 2, 11, 1);
      seg(AB1, bx + devant(a, 2), by - 2, bx + devant(a, 4) + w, by - 8, 1); r(AB1, bx + devant(a, 4) + w - 1, by - 10, 2, 2);
      seg(AB1, bx - 2, by - 2, bx - 5 - w, by - 8, 1); r(AB1, bx - 6 - w, by - 10, 2, 2);
    },
    pied: soulier(AB, '#b8861a', '#ffe27a'),
  };

  const PERSOS = [
    { id: 'dino', n: 'Le dino', costume: 'dino', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: V0, sansGilet: true, jean: '#4f9a42' },
    { id: 'super', n: 'Super Cadreur', costume: 'super', anime: true, sansSac: true, cheveux: 0, couleur: 3, barbe: 0, lunettes: 0, peau: 1, tee: 0, teeC: BL, sansGilet: true, sansSangle: true, jean: BL, ceinture: JA, boucle: '#c8961a' },
    { id: 'banane', n: 'Monsieur Banane', costume: 'banane', cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: BA, sansGilet: true, sansSangle: true, jean: '#2c2833' },
    { id: 'licorne', n: 'La licorne', costume: 'licorne', anime: true, cheveux: 3, couleur: 2, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: LI, sansGilet: true, jean: '#f0eaf4' },
    { id: 'chevalier', n: 'Le chevalier', costume: 'chevalier', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: AC, sansGilet: true, jean: '#9aa2b0', ceinture: '#6a4426' },
    { id: 'fantome', n: 'Le fantôme', costume: 'fantome', anime: true, sansSac: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 0, peauC: DR, tee: 0, teeC: DR, sansGilet: true, sansSangle: true, jean: '#2f3b5e' },
    { id: 'poulet', n: 'Le poulet', costume: 'poulet', anime: true, cheveux: 3, couleur: 0, barbe: 0, lunettes: 0, peau: 1, tee: 0, teeC: PO, sansGilet: true, jean: BE, ceinture: PO1, boucle: PO1 },
    { id: 'viking', n: 'Le Viking', costume: 'viking', cheveux: 2, couleur: 4, barbe: 2, lunettes: 0, peau: 0, tee: 0, teeC: '#7a5232', gilet: '#8a7a6a', jean: '#5a4a3a' },
    { id: 'magicien', n: 'Le magicien', costume: 'magicien', anime: true, cheveux: 2, couleur: 5, barbe: 2, lunettes: 0, peau: 0, tee: 0, teeC: RO, sansGilet: true, jean: RO1, ceinture: '#c8961a' },
    { id: 'cowboy', n: 'Le cow-boy', costume: 'cowboy', cheveux: 0, couleur: 1, barbe: 0, lunettes: 0, peau: 1, tee: 0, teeC: '#e8dcc0', gilet: '#8a5a2a', jean: '#3a5a9a' },
    { id: 'chef', n: 'Le cuistot', costume: 'chef', cheveux: 0, couleur: 3, barbe: 0, lunettes: 0, peau: 2, tee: 0, teeC: TO, sansGilet: true, jean: '#3a3a46', ceinture: TO1, boucle: TO1 },
    { id: 'abeille', n: 'L\'abeille', costume: 'abeille', anime: true, sansSac: true, cheveux: 1, couleur: 2, barbe: 0, lunettes: 0, peau: 0, tee: 0, teeC: AB, sansGilet: true, jean: AB1 },
  ];

  /* ================= LES DRONES ================= */
  const ME = '#b8c0cc', ME1 = '#7a8494', ME2 = '#e8eef6', SOMBRE = '#3a3c4a';
  // un disque plein, ligne par ligne (pour les roues, bobines, nuages)
  const disque = (c, cx, cy, ray) => { for (let j = -ray; j <= ray; j++) { const w = Math.round(Math.sqrt(ray * ray - j * j)); r(c, cx - w, cy + j, 2 * w + 1, 1); } };
  const disqueD = (c, cx, cy, ray) => { for (let j = -ray; j <= ray; j++) { const w = Math.round(Math.sqrt(ray * ray - j * j)); d(c, cx - w, cy + j, 2 * w + 1, 1); } };

  /* La soucoupe volante : coupole sous les pieds, hublots qui tournent, faisceau vert */
  DRO.soucoupe = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort && p1()) for (let j = 0; j < 26; j++) d(`rgba(150,255,180,${(.2 - j * .007 + sin(st.t * 12) * .03).toFixed(3)})`, -7 - Math.round(j * .45), 3 + j, 15 + Math.round(j * .9), 1);
      // une coupole de verre derriere les jambes, le plateau ou il se tient, le grand disque, le ventre et sa lumiere
      r('#7fb8e0', -12, -20, 25, 8); r('#7fb8e0', -9, -23, 19, 3); d('#a8d8f8', -10, -22, 8, 2); d('#d8f0ff', -8, -22, 3, 1); d('#5a90c0', -12, -14, 25, 2);
      r(ME, -14, -12, 29, 3); r(ME, -24, -9, 49, 3); r(ME, -31, -6, 63, 4); r(ME1, -25, -2, 51, 3); r(SOMBRE, -15, 1, 31, 3);
      d(ME2, -12, -12, 22, 1); d(ME2, -22, -9, 40, 1); d(ME2, -29, -6, 34, 1); d(ME1, -31, -3, 63, 1); d('#5a6272', -25, 0, 51, 1); d('#23242e', -15, 3, 31, 1);
      d(st.mort ? '#2c4a34' : '#8affb0', -7, 2, 15, 1);
      const k = st.mort ? -1 : (st.t * 8 | 0) % 6, C = ['#ff5a5a', '#ffd54a', '#5aff8a', '#5ab4ff', '#ff7ae0', '#ffb43a'];
      for (let i = 0; i < 6; i++) { const x = -27 + i * 10.4; d(i === k ? '#ffffff' : st.mort ? '#4a4c5a' : C[i], x, -5, 3, 2); if (i === k) d('#ffffff', x - 1, -6, 5, 1); }
    },
  };

  /* Le canard de bain : il vole en battant de ses petites ailes */
  const CA = '#ffd23a', CA1 = '#e0a21a', CA2 = '#fff09a', CAB = '#ff8a2a', CAB1 = '#d8601a';
  DRO.canard = {
    rotors: [],
    dessin(P, st) {
      r(CA, -29, -19, 4, 3); r(CA, -27, -16, 7, 5);
      r(CA, -22, -12, 36, 10); r(CA, -20, -3, 32, 4); r(CA, -16, 1, 24, 2);
      r(CA, 10, -15, 10, 4); r(CA, 9, -27, 14, 13); r(CA, 11, -29, 10, 2);
      r(CAB, 22, -21, 7, 4);
      d(CA2, -18, -12, 24, 1); d(CA2, 12, -29, 6, 1); d(CA2, 10, -26, 1, 6); d(CA1, -20, -2, 30, 2); d(CA1, -16, 1, 24, 2); d(CA1, 19, -18, 4, 3);
      d(CAB1, 22, -19, 7, 1); d('#ffb46a', 23, -21, 4, 1);
      d('#fff', 15, -25, 4, 4); d(K, 16, -24, 3, 3); d('#fff', 17, -24, 1, 1);
      // l'aile : elle bat, la pointe passe au-dessus du dos
      const f = st.mort ? 0 : sin(st.t * 14);
      const up = Math.round(Math.max(0, f) * 6), dn = Math.round(Math.max(0, -f) * 2);
      r(CA1, -12, -9 - up, 14, 4 + dn); r(CA1, -15, -10 - up - 2, 5, 3);
      d('#c88a10', -12, -6 - up + dn, 14, 1); d(CA, -10, -9 - up, 9, 1);
    },
  };

  /* La pizza volante : elle tourne sur elle-meme, le fromage coule du bord */
  DRO.pizza = {
    rotors: [],
    dessin(P, st) {
      for (let j = 0; j < 9; j++) { const hw = Math.round(28 * Math.sqrt(Math.max(0, 1 - ((j - 4) / 4.6) ** 2))); r('#d89a4a', -hw, -14 + j, 2 * hw + 1, 1); }
      r('#a86a2a', -26, -5, 53, 2);
      for (let j = 1; j < 8; j++) { const hw = Math.round(25 * Math.sqrt(Math.max(0, 1 - ((j - 4) / 4) ** 2))); d('#d8442a', -hw, -14 + j, 2 * hw + 1, 1); d('#ffd860', -hw + 2, -14 + j, Math.max(0, 2 * hw - 3), 1); }
      d('#f0b45a', -20, -14, 40, 1);
      // les garnitures tournent avec la pizza
      const rot = st.mort ? 0 : st.t * 1.6;
      for (let i = 0; i < 9; i++) {
        const an = rot + i * 2.4, rr = .35 + (i % 3) * .25, x = Math.round(cos(an) * rr * 22), y = Math.round(-10 + sin(an) * rr * 3);
        if (i % 3 === 2) d('#4a9a3a', x, y, 2, 1); else { d('#a8282e', x - 1, y, 3, 2); d('#d8584e', x - 1, y, 1, 1); }
      }
      for (let i = 0; i < 3; i++) { const l = Math.round(3 + sin(st.t * 3 + i * 2) * 2); r('#ffd860', -16 + i * 14, -4, 2, l); d('#fff0a0', -16 + i * 14, -4, 1, 1); }
    },
  };

  /* La fusee : hublot, ailerons rouges, flamme qui crache et fumee */
  const FB = '#eef0f4', FB1 = '#b8bcc8', FB2 = '#ffffff', FR = '#d8393b', FR1 = '#9a2228';
  DRO.fusee = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort && p1()) {
        const L = 11 + sin(st.t * 31) * 3 + ((st.t * 23 | 0) % 2) * 2;
        for (let i = 0; i < L; i++) { const h = Math.max(1, Math.round(7 * (1 - i / L))); d('#ff8a2a', -27 - i, -7 - (h >> 1), 1, h); if (i < L * .6) d('#ffe24a', -27 - i, -7 - (h >> 2), 1, Math.max(1, h >> 1)); }
        d('#fff8d0', -28, -8, 3, 2);
        for (let k = 0; k < 3; k++) { const ph = (st.t * .9 + k / 3) % 1, x = -40 - ph * 18, y = -7 - ph * 4, a = (.5 * (1 - ph)).toFixed(2); d(`rgba(200,200,210,${a})`, x, y - 2, 4 + Math.round(ph * 4), 3 + Math.round(ph * 3)); }
      }
      r(FR, -22, -19, 4, 7); r(FR, -20, -16, 5, 4);
      r(FR, -22, -1, 4, 7); r(FR, -20, -1, 5, 4);
      r('#5a5c6a', -26, -10, 4, 7); d('#7a7c8a', -26, -10, 4, 1);
      r(FB, -22, -12, 42, 11);
      for (let i = 0; i < 11; i++) r(FR, 20 + i, -12 + Math.round(i * .5), 1, 11 - i);
      d(FB2, -20, -12, 38, 1); d(FB1, -22, -3, 42, 2); d(FR, -16, -12, 3, 11); d(FR1, -16, -3, 3, 2); d('#ff6a5a', 20, -11, 4, 1);
      r(SOMBRE, 4, -10, 7, 7); d('#5ab4ff', 5, -9, 5, 5); d('#fff', 5, -9, 2, 2); d('#2f6fb5', 8, -6, 2, 2);
      d(FR1, -22, -18, 2, 6);
    },
  };

  /* La baignoire : pieds de lion dores, mousse sous les pieds, bulles qui montent, petit canard, deux helices sur des mats */
  const BN = '#f4f4f0', BN1 = '#c8ccd4', BN2 = '#ffffff', OR2 = '#e0b04a';
  DRO.baignoire = {
    rotors: [[-27, -22], [28, -22]],
    dessin(P, st) {
      r('#c6ccd8', -28, -21, 2, 10); r('#c6ccd8', 27, -21, 2, 10); d('#f4f8ff', -28, -21, 1, 10); d('#f4f8ff', 27, -21, 1, 10);
      r(OR2, -20, 1, 4, 5); r(OR2, 16, 1, 4, 5); d('#b8862a', -20, 5, 4, 1); d('#b8862a', 16, 5, 4, 1);
      r(BN, -26, -12, 53, 3); r(BN, -24, -9, 49, 8); r(BN, -21, -1, 43, 3);
      d(BN2, -25, -12, 50, 1); d(BN1, -24, -4, 49, 2); d(BN1, -21, 0, 43, 2); d(BN1, -26, -10, 53, 1);
      // la mousse
      for (const [x, y, w, h] of [[-24, -15, 7, 3], [-18, -17, 6, 5], [-12, -15, 6, 3], [-6, -16, 5, 4], [0, -15, 6, 3], [6, -17, 6, 5], [12, -15, 7, 3], [-27, -14, 4, 2], [21, -14, 5, 2]]) { r(BN2, x, y, w, h); d('#dfe9f4', x, y + h - 1, w, 1); }
      // le petit canard
      r('#ffd23a', 17, -18, 5, 3); r('#ffd23a', 20, -20, 3, 2); d('#ff8a2a', 23, -19, 1, 1); d(K, 21, -20, 1, 1);
      // des bulles qui montent
      if (!st.mort) for (let i = 0; i < 4; i++) { const ph = (st.t * .7 + i * .27) % 1, x = Math.round(-20 + i * 13 + sin(st.t * 3 + i) * 2), y = Math.round(-18 - ph * 22); if (ph < .9) { r('#d8f4ff', x, y, 2, 2); d('#ffffff', x, y, 1, 1); } }
    },
  };

  /* Le grille-pain : les toasts sautent sous ses pieds, le fil et la prise pendouillent */
  DRO.grillepain = {
    rotors: [[-30, -14], [31, -14]],
    dessin(P, st) {
      // les toasts depassent toujours un peu, et sautent toutes les 1,6 s
      const ph = st.mort ? 0 : st.t % 1.6, saut = ph < .9 ? 0 : ph < 1 ? (ph - .9) / .1 : ph < 1.4 ? 1 : (1.6 - ph) / .2, h = 3 + Math.round(saut * 9);
      // le fil et la prise
      const sw = sin(st.t * 3) * 2;
      seg('#2c2a38', -21, 2, -25 + sw * .5, 8, 1); seg('#2c2a38', -25 + sw * .5, 8, -28 + sw, 14, 1);
      r('#e8e6df', -30 + sw, 14, 4, 3); d('#c6ccd8', -29 + sw, 17, 1, 2); d('#c6ccd8', -27 + sw, 17, 1, 2);
      r(ME1, -28, -9, 8, 2); r(ME1, 21, -9, 8, 2); H.moteur(-33); H.moteur(28);
      // un grille-pain quatre tranches : les deux du bout sortent de part et d'autre de ses pieds
      for (const x of [-18, 12]) { r('#e0a860', x, -11 - h, 7, h); d('#a8682a', x, -11 - h, 7, 2); d('#f4d498', x + 1, -9 - h, 4, 1); d('#8a5226', x + 6, -9 - h, 1, h - 2); }
      // le corps chrome, arrondi, ses reflets
      r('#d8dee8', -19, -12, 39, 1); r('#d8dee8', -21, -11, 43, 16); r('#d8dee8', -19, 5, 39, 1);
      d('#23242e', -18, -12, 7, 1); d('#23242e', -9, -12, 7, 1); d('#23242e', 3, -12, 7, 1); d('#23242e', 12, -12, 7, 1);
      d('#ffffff', -19, -10, 2, 13); d('#f4f8ff', -16, -10, 1, 13); d('#a8b0c0', 6, -10, 4, 14); d('#7a8494', 16, -10, 3, 14); d('#8a92a2', -19, 4, 39, 1);
      d('#b8c0cc', -21, -1, 43, 1); d('#f4f8ff', -21, -2, 43, 1);
      r(SOMBRE, 22, saut > .5 ? -9 : -3, 4, 2); d('#4a4c5a', -17, 1, 3, 3); d('#ff5a3a', -16, 2, 1, 1);
      r(SOMBRE, -18, 6, 4, 2); r(SOMBRE, 15, 6, 4, 2);
      if (ph > .9 && ph < 1.1) { d('#fff', -15, -27, 1, 3); d('#fff', 15, -27, 1, 3); d('#fff', -17, -25, 1, 1); d('#fff', 17, -25, 1, 1); }
    },
  };

  /* Le clap : il pend sous le cadre et claque en mesure */
  DRO.clap = {
    rotors: [[-24, -14], [25, -14]],
    dessin(P, st) {
      r('#23242e', -26, -9, 53, 2); d('#3f414f', -25, -9, 51, 1); H.moteur(-27); H.moteur(22);
      r('#2c2e3a', -14, -11, 29, 3); d('#4a4c5a', -13, -11, 27, 1);
      r('#8a8c9c', -17, -8, 1, 9); r('#8a8c9c', 16, -8, 1, 9);
      // l'ardoise et ses lignes a la craie
      r('#23242e', -18, 1, 37, 16);
      d('#e8e6df', -16, 5, 33, 1); d('#e8e6df', -16, 10, 33, 1); d('#e8e6df', -5, 5, 1, 11); d('#e8e6df', 6, 10, 1, 6);
      d('#a8a6a0', -14, 7, 6, 1); d('#a8a6a0', -2, 7, 5, 1); d('#a8a6a0', 9, 12, 6, 1); d('#a8a6a0', -14, 13, 5, 1);
      // la barre : elle s'ouvre lentement puis claque
      const ph = st.mort ? 0 : st.t % 1.8, al = ph < 1.4 ? ph / 1.4 * .17 : ph < 1.47 ? .17 * (1 - (ph - 1.4) / .07) : 0;
      const ca = cos(al), sa = sin(al);
      for (let i = 0; i < 37; i++) r('#e8e6df', -18 + i * ca, -3 - i * sa, 1, 4);
      if (p1()) for (let i = 0; i < 37; i++) for (let j = 0; j < 4; j++) if ((i + j) % 8 < 4) d('#23242e', -18 + i * ca, -3 - i * sa + j, 1, 1);
      if (ph > 1.47 && ph < 1.6) { d('#fff', 21, -4, 3, 1); d('#fff', 21, -7, 2, 1); d('#fff', 21, -1, 2, 1); }
    },
  };

  /* Le canape : on vole debout sur les coussins, deux helices sur les accoudoirs */
  const CN = '#c8393b', CN1 = '#8e2329', CN2 = '#e8615a', BO = '#6a4426';
  DRO.canape = {
    rotors: [[-24, -29], [24, -29]],
    dessin(P, st) {
      r('#8a8c9c', -25, -28, 2, 9); r('#8a8c9c', 23, -28, 2, 9);
      r(CN, -22, -25, 45, 13);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) d(CN1, -18 + i * 7 + j * 3, -22 + j * 5, 1, 1);
      d(CN2, -21, -25, 43, 1); d(CN1, -22, -14, 45, 2);
      r(CN, -28, -19, 8, 14); r(CN, 21, -19, 8, 14); r(CN, -29, -21, 10, 3); r(CN, 20, -21, 10, 3);
      d(CN2, -28, -21, 8, 1); d(CN2, 21, -21, 8, 1); d(CN1, -29, -19, 10, 1); d(CN1, 20, -19, 10, 1);
      r(CN, -20, -13, 41, 6); d(CN2, -19, -13, 39, 1); d(CN1, 0, -13, 1, 6);
      r(CN1, -27, -7, 55, 5); d('#b02a30', -26, -7, 53, 1);
      r(BO, -25, -2, 3, 4); r(BO, 23, -2, 3, 4); d('#8e6238', -25, -2, 1, 4); d('#8e6238', 23, -2, 1, 4);
    },
  };

  /* Le balai magique : la paille bat, des etincelles derriere */
  const BAL = '#9a6a3a', BAL1 = '#6a4420', BAL2 = '#c89a5a', PA = '#e0b84a', PA1 = '#b8862a', PA2 = '#f8e08a';
  DRO.balai = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort && p1()) for (let i = 0; i < 6; i++) {
        const ph = (st.t * 1.3 + i / 6) % 1, x = Math.round(-48 - ph * 13), y = Math.round(-11 + sin(i * 2.3) * 6 + ph * 2), c = i % 2 ? '#fff8b0' : '#ffd23a';
        if (ph < .85) { d(c, x, y - 1, 1, 3); d(c, x - 1, y, 3, 1); }
      }
      for (let i = 0; i < 16; i++) {
        const hh = Math.round(6 + i * .45 + (i > 11 && !st.mort ? sin(st.t * 18 + i) : 0)), y0 = Math.round(-11.5 - hh / 2);
        r(PA, -31 - i, y0, 1, hh);
        if (i % 3 === 0) d(PA1, -31 - i, y0 + 1, 1, hh - 2); if (i % 4 === 1) d(PA2, -31 - i, y0, 1, 2);
      }
      r(BAL, -30, -12, 61, 2); d(BAL2, -29, -12, 59, 1); d(BAL1, -30, -11, 61, 1); r(BAL1, 30, -13, 3, 3);
      r(RG, -32, -15, 3, 7); d(RG2, -32, -15, 1, 7);
    },
  };

  /* Le nuage : il a une frimousse, cligne des yeux, et il pleut dessous (un petit eclair de temps en temps) */
  const NU = '#f4f6fa', NU1 = '#c4cce0', NU2 = '#ffffff';
  DRO.nuage = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort && p1()) {
        for (let i = 0; i < 5; i++) { const y = Math.round(5 + ((st.t * 38 + i * 11) % 26)), x = -16 + i * 8; d('#8ac4ff', x, y, 1, 3); }
        if (st.t % 4.2 < .14) { const Z = [[2, 4], [0, 8], [3, 8], [0, 14]]; for (let k = 0; k < 3; k++) seg('#ffe24a', Z[k][0] + 6, Z[k][1], Z[k + 1][0] + 6, Z[k + 1][1], 1); }
      }
      const B = [[-19, -5, 8], [-8, -9, 9], [5, -9, 8], [17, -5, 7], [0, -3, 9], [-14, -1, 6], [12, -1, 6]];
      for (const [x, y, ra] of B) disque(NU, x, y, ra);
      for (const [x, y, ra] of B) { d(NU2, x - ra + 3, y - ra + 1, ra, 1); }
      d(NU1, -18, 4, 36, 1); d(NU1, -22, 1, 6, 2); d(NU1, 16, 1, 6, 2);
      const cligne = st.mort || st.t % 3.3 < .13;
      for (const x of [-6, 4]) { if (cligne) d(K, x, -4, 3, 1); else { d(K, x, -6, 2, 3); d('#fff', x, -6, 1, 1); } }
      d('#ffb0c8', -11, -2, 3, 1); d('#ffb0c8', 8, -2, 3, 1);
      d(K, -2, -2, 1, 1); d(K, -1, -1, 3, 1); d(K, 2, -2, 1, 1);
    },
  };

  /* La bobine de film : elle roule sous ses pieds, la pellicule se deroule derriere */
  DRO.bobine = {
    rotors: [],
    dessin(P, st) {
      const ro = st.mort ? 0 : st.t * 5;
      // la pellicule qui se deroule et ondule
      for (let i = 0; i < 26; i++) {
        const x = -9 - i, y = Math.round(10 + sin(ro * 1.4 - i * .35) * 3 * (i / 26) + i * .15);
        r('#3a2a22', x, y - 2, 1, 4);
        d(i % 3 ? '#6a4a32' : '#d8c8a0', x, y - 2, 1, 1); d(i % 3 ? '#6a4a32' : '#d8c8a0', x, y + 1, 1, 1);
      }
      // la bobine de cinema : un flasque d'alu perce de cinq grands trous ronds qui tournent, le moyeu, la pellicule enroulee au bord
      disque('#3a2a22', 0, 1, 13);
      disqueD('#c6ccd8', 0, 1, 12);
      d('#e8eef6', -7, -9, 8, 1); d('#e8eef6', -10, -6, 2, 4); d('#9aa2b0', 4, 11, 6, 1); d('#9aa2b0', 9, 6, 2, 4);
      for (let k = 0; k < 5; k++) { const a = ro + k * Math.PI * 2 / 5, x = Math.round(cos(a) * 7), y = Math.round(1 + sin(a) * 7); disqueD('#2c2e3a', x, y, 3); d('#5a4232', x - 1, y + 1, 3, 1); }
      disqueD('#8a92a2', 0, 1, 2); d('#2c2e3a', 0, 1, 1, 1); d('#f4f8ff', -1, 0, 1, 1);
    },
  };

  /* Le pedalo cygne : long cou, ailes qui battent, gouttes d'eau qui tombent */
  const CY = '#f6f6f2', CY1 = '#c8ccd4', CY2 = '#ffffff';
  DRO.cygne = {
    rotors: [],
    dessin(P, st) {
      if (!st.mort && p1()) for (let i = 0; i < 2; i++) { const ph = (st.t * .9 + i * .5) % 1; d('#8ac4ff', -8 + i * 14, Math.round(4 + ph * 24), 1, 2); }
      r(CY, -31, -21, 4, 4); r(CY, -29, -17, 7, 6);
      r(CY, -24, -12, 44, 8); r(CY, -22, -4, 40, 4); r(CY, -18, 0, 32, 2);
      seg(CY, 15, -12, 19, -16, 5); seg(CY, 19, -16, 19, -20, 4);
      r(CY, 17, -25, 7, 5); r('#ff8a2a', 24, -23, 4, 2); d('#c8601a', 24, -22, 4, 1);
      d('#2c2a38', 23, -24, 2, 2); d('#2c2a38', 21, -24, 1, 1);
      d(CY2, -22, -12, 36, 1); d(CY1, -22, -3, 40, 2); d(CY1, -18, 0, 32, 2); d(CY2, 18, -25, 4, 1); d(CY1, 16, -12, 3, 3);
      // l'aile : elle se souleve et retombe
      const f = st.mort ? 0 : sin(st.t * 6), up = Math.round(Math.max(0, f) * 6);
      r(CY, -16, -9 - up, 18, 4); r(CY, -20, -11 - up, 6, 3);
      for (let i = 0; i < 4; i++) d(CY1, -14 + i * 4, -7 - up, 2, 1);
    },
  };

  const MODELES = [
    { id: 'soucoupe', n: 'Soucoupe', anime: true }, { id: 'canard', n: 'Canard', anime: true }, { id: 'pizza', n: 'Pizza', anime: true },
    { id: 'fusee', n: 'Fusée', anime: true }, { id: 'baignoire', n: 'Baignoire', anime: true }, { id: 'grillepain', n: 'Grille-pain', anime: true },
    { id: 'clap', n: 'Clap', anime: true }, { id: 'canape', n: 'Canapé' }, { id: 'balai', n: 'Balai', anime: true },
    { id: 'nuage', n: 'Nuage', anime: true }, { id: 'bobine', n: 'Bobine', anime: true }, { id: 'cygne', n: 'Cygne', anime: true },
  ];
  G.PERSOS.push(...PERSOS);
  G.MODELES.push(...MODELES);
  // les memes pinceaux pour la deuxieme fournee (deguisements2.js)
  G.DEG = { capuche, fen, devant, soulier };
})();
