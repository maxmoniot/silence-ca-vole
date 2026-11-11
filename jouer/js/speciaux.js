/* Les recompenses des deux derniers rangs de la carriere (Max, 08/11/2026 : « le dernier palier doit etre un personnage special
   qu'on ne peut pas acheter, et l'avant-dernier un drone special qu'on ne peut pas acheter. Le personnage doit etre en costard et il
   doit briller (une aura animee autour de lui pour signifier le cote exceptionnel du personnage). Le drone doit produire un
   arc-en-ciel derriere lui, il doit briller aussi »).
   - La star (rang Oscar) : smoking noir, chemise blanche, noeud papillon, pochette doree, cheveux gomines, lunettes noires, souliers
     vernis. Son aura est calculee sur son dessin a chaque image (hero.js, aura) : liseré d'or, flammes qui montent au-dessus de la tete
     et des epaules, paillettes qui s'elevent.
   - Le drone arc-en-ciel (rang Palme d'or) : coque nacree rayee des six couleurs, moteurs dores, dome de cristal, un reflet qui balaie
     la coque et des eclats qui scintillent. Son arc-en-ciel n'est jamais attache a son dessin (Max, 08/11/2026 : « je veux que
     l'arc-en-ciel reste a l'ecran comme une trainee derriere le drone, je ne veux pas qu'il soit attache au drone ») : en partie et
     sur l'accueil, render.js le tire dans le decor (trainee) ; dans la vitrine du hangar, ui.js le tire derriere le drone qui flotte.
   Ni l'un ni l'autre ne s'achete (gains.js : special) : on les a en atteignant leur rang (J.RANGS : drone, perso).
   Memes reperes que deguisements.js : tete x -5..5, y by..by+9 ; buste x0..x0+lg, hb..hb+12 ; pieds y -13 ; dessus du drone y -12. */
'use strict';
(function () {
  const H = G.HeroPinceau, { r, d, K } = H;
  const COS = G.HERO_COSTUMES, DRO = G.HERO_DRONES;
  const { soulier } = G.DEG;
  const sin = Math.sin;

  /* ================= LA STAR ================= */
  const VESTE = '#1f1e2b', SATIN = '#3e3c52', SATIN2 = '#5a5874', CHEMISE = '#f6f4ee', CHEMISE1 = '#d8d6e0', NOEUD = '#121018', NOEUD2 = '#34303f', ORP = '#ffd54a', ORP1 = '#c8961a';
  COS.star = {
    aura: true,
    buste(P, st, x0, hb, lg, a, bx) {
      if (a === 1) {
        // de profil : le plastron dans l'echancrure du revers, le noeud au col, deux boutons
        // (le bras qui tient la camera passe devant le bas du plastron : le blanc est au col, au-dessus de l'epaule)
        const fx = x0 + lg - 4;
        d(SATIN, fx - 3, hb, 1, 7); d(SATIN2, fx - 3, hb, 1, 2);
        d(CHEMISE, fx - 2, hb, 3, 4); d(CHEMISE1, fx - 2, hb + 3, 1, 1);
        d(NOEUD, fx + 2, hb + 7, 1, 1); d(NOEUD, fx + 2, hb + 9, 1, 1);
        d(ORP, x0 + 2, hb + 4, 2, 1);
      } else {
        // de trois-quarts ou de face : le V du plastron, les revers de satin, le noeud papillon, la pochette doree
        const c = bx + (a === .66 ? 2 : a === .33 ? 1 : 0);
        for (let j = 0; j < 7; j++) {
          const w = Math.max(1, 5 - Math.round(j * .7)), xa = c - (w >> 1);
          d(CHEMISE, xa, hb + j, w, 1);
          d(SATIN, xa - 1, hb + j, 1, 1); d(SATIN, xa + w, hb + j, 1, 1);
          if (j < 3) { d(SATIN2, xa - 2, hb + j, 1, 1); d(SATIN2, xa + w + 1, hb + j, 1, 1); }
        }
        d(CHEMISE1, c, hb + 3, 1, 3);
        for (const yb of [7, 9]) d(NOEUD, c, hb + yb, 1, 1);
        d(ORP, c + 4, hb + 3, 2, 2); d(ORP1, c + 4, hb + 4, 2, 1);
      }
    },
    tete(P, st, bx, by, a) {
      // le col blanc et le noeud papillon, au cou : au-dessus du bras qui tient la camera, ils se voient dans toutes les vues
      if (a === 1) { d(CHEMISE, bx - 2, by + 10, 5, 2); d(CHEMISE1, bx - 2, by + 11, 1, 1); d(NOEUD, bx + 2, by + 10, 3, 2); d(NOEUD2, bx + 3, by + 10, 1, 1); }
      else {
        const c = bx + (a === .66 ? 2 : a === .33 ? 1 : 0);
        d(CHEMISE, c - 3, by + 10, 7, 2);
        d(NOEUD, c - 3, by + 10, 2, 2); d(NOEUD, c + 2, by + 10, 2, 2); d(NOEUD2, c - 1, by + 10, 3, 2); d(NOEUD, c, by + 10, 1, 2);
      }
      // les cheveux gomines : deux reflets qui suivent la coiffure
      d('#6c6a84', bx - 3, by - 2, 3, 1); d('#a6a4be', bx - 2, by - 2, 1, 1); d('#6c6a84', bx + 2, by - 1, 2, 1);
      // un eclat traverse les lunettes de temps en temps
      const ph = (st.t || 0) % 2.6;
      if (ph < .24) { const k = Math.round(ph / .24 * 4); d('#ffffff', bx + (a === 1 ? 2 : -2) + k, by + 3 + (st.look === 'haut' ? -1 : st.look === 'bas' ? 1 : 0), 1, 1); }
    },
    pied: soulier('#1a1924', '#0b0a10', '#b8bccc'),
  };

  /* ================= LE DRONE ARC-EN-CIEL ================= */
  const ARC = G.ARC_EN_CIEL = ['#ff4a5a', '#ff9a3a', '#ffe14a', '#4ad86a', '#3aa0ff', '#9a5aff'];
  const rgba = (c, al) => `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},${al})`;
  const NAC = '#f4f5fb', NAC1 = '#c9cfe2', NAC2 = '#ffffff', MOT = '#ffd54a', MOT1 = '#c8961a', MOT2 = '#fff3b0';
  // une etincelle au pixel : un point blanc, et quatre branches qui s'allongent quand elle brille fort
  function eclat(x0, y0, k) {
    if (k <= 0) return;
    d('#ffffff', x0, y0, 1, 1);
    const al = Math.min(1, k * 1.4).toFixed(2), n = k > .6 ? 2 : 1;
    for (let i = 1; i <= n; i++) { const c = rgba('#fff3b0', i === 1 ? al : (al * .5).toFixed(2)); d(c, x0 - i, y0, 1, 1); d(c, x0 + i, y0, 1, 1); d(c, x0, y0 - i, 1, 1); d(c, x0, y0 + i, 1, 1); }
  }
  DRO.arcenciel = {
    arc: true,
    rotors: [[-24, -14], [25, -14]],
    dessin(P, st) {
      // les bras nacres, les moteurs dores
      r(NAC, -26, -7, 53, 3); d(NAC2, -25, -7, 51, 1); d(NAC1, -26, -5, 53, 1);
      for (const mx of [-27, 22]) { r(MOT, mx, -12, 6, 6); d(MOT2, mx + 1, -12, 4, 1); d(MOT1, mx, -7, 6, 1); d('#ffffff', mx + 2, -11, 1, 2); }
      // le train d'atterrissage, en or fin
      r(MOT1, -11, 3, 1, 7); r(MOT1, 10, 3, 1, 7); r(MOT, -16, 9, 12, 1); r(MOT, 5, 9, 12, 1);
      // la coque : une capsule nacree rayee des six couleurs
      r(NAC, -12, -12, 25, 3); r(NAC, -15, -9, 31, 9); r(NAC1, -12, 0, 25, 3);
      d(NAC2, -10, -12, 18, 1); d(NAC2, -14, -9, 24, 1);
      for (let i = 0; i < 6; i++) d(ARC[i], -15, -8 + i, 31, 1);
      d(rgba('#ffffff', .35), -14, -8, 28, 1);
      d(NAC1, -12, 0, 25, 1); d('#a9b0c8', -12, 2, 25, 1);
      // le dome de cristal, une etoile dedans
      r('#bfe8ff', -4, -16, 9, 4); d('#ffffff', -3, -16, 3, 1); d('#8fd0ff', -4, -13, 9, 1);
      d((st.t * 3 | 0) % 2 ? '#ffffff' : '#ffe14a', 0, -15, 1, 1);
      // le reflet qui balaie la coque, de gauche a droite
      const ph = ((st.t || 0) % 1.9) / 1.9, gx = Math.round(-20 + ph * 44);
      if (gx < 18) for (let k = 0; k < 9; k++) { const xx = gx + (k >> 1), yy = -11 + k; if (xx >= -15 && xx <= 15 && yy <= 1) d(rgba('#ffffff', .8), xx, yy, 1, 1); }
      // des eclats qui scintillent autour de lui
      const S = [[-21, -19], [19, -21], [2, 13], [-8, -20], [27, -2]];
      S.forEach(([sx, sy], i) => eclat(sx, sy, sin((st.t || 0) * 5.2 + i * 2.1) - .3));
    },
  };

  /* Les fiches : a la fin du hangar, chacune seule sur sa page ; special = ne s'achete pas */
  G.PERSOS.push({ id: 'star', n: 'La star', costume: 'star', anime: true, special: true, manches: CHEMISE, sansSac: true, sansGilet: true, sansSangle: true, cheveux: 0, couleur: 3, barbe: 0, lunettes: 2, peau: 1, tee: 0, teeC: VESTE, jean: VESTE, ceinture: VESTE, boucle: VESTE });
  G.MODELES.push({ id: 'arcenciel', n: 'Arc-en-ciel', anime: true, special: true });
})();
