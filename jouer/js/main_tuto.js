/* La main du tuto, sur l'accueil (Max, 05/11/2026 : « rajoute en pixel art une main qui vient cliquer sur la droite pour faire comme
   un tuto : quand ca clique le drone monte et quand ca lache le drone descend. Ne la laisse pas toujours afficher. Elle doit arriver
   rapidement pour montrer comment ca fonctionne quelques fois puis repartir » ; puis « plus grosse, un peu comme une main de Mickey » ;
   puis « garde l'idee du gant blanc et la grosseur mais rends-le plus joli et surtout anime-le »).
   Un gant blanc de dessin anime, dessine au pixel par le code, chaque pose a sa taille d'affichage (jamais tourne ni agrandi a
   l'affichage : la forme est tournee et ecrasee AVANT le passage au pixel). Trait plus epais du cote de l'ombre, reflet sur l'index,
   ombre portee, coutures, manchette roulee.
   Ce qu'il fait : il arrive vite du bas a gauche en se balancant, appuie juste a gauche du cadreur, se pose ; a chaque appui il prend son elan, s'ecrase sur la vitre
   (un eclat part du doigt) et le drone de la demonstration monte (W.tutoMain = true) ; il lache en rebondissant, se balance en
   attendant que le drone soit redescendu ; apres trois appuis il fait au revoir et repart. Il revient une vingtaine de secondes plus
   tard. Rien ne s'ecrit.
   Controle : tests/main_tuto.js. */
'use strict';
(function () {
  const M = G.MainTuto = {};
  const K = '#1b1828', BLANC = '#fbf8ef', PUR = '#ffffff', OMBRE = '#dcd3c3', OMBRE2 = '#b6a994', COUTURE = '#8d8297', LIGNE = '#3b3448';
  const PORTEE = 'rgba(23,21,40,.30)';
  // la forme est decrite sur une grille de 32 x 42 (le bout de l'index en BX, BY) ; E l'agrandit AVANT le passage au pixel
  const E = 2.2, BX = 11, BY = 3.6;
  // la toile de chaque pose : de la marge pour les rotations ; le bout de l'index y est toujours au meme pixel (TIP)
  const LW = Math.ceil(56 * E), LH = Math.ceil(50 * E), TIP = [Math.round(24 * E), Math.round(5 * E)];
  const APPUIS = 3;
  // Max, 06/11/2026 : « fais arriver la main tuto en page d'accueil des le lancement du jeu, et fais-la revenir regulierement
  // ensuite » (avant : 1,2 s apres l'accueil, puis au hasard entre 20 et 26 s ; sur le telephone, 2,1 s apres le lancement et un
  // retour toutes les 22 a 29 s), puis « fais-le apparaitre toutes les 5 ou 10 secondes » : un passage dure environ 6 s, elle
  // attend 4 s et revient, une arrivee toutes les 10 s environ.
  M.ARRIVEE = .15;                              // apres l'arrivee sur l'accueil
  M.RETOUR = [4, 4];                            // puis elle revient a intervalle fixe
  // le point ou elle appuie, en unites de jeu : juste a gauche du cadreur (Max, 06/11/2026 : « mets-le du cote du personnage
  // principal, sans qu'il lui passe par-dessus, pour que l'explication soit plus parlante »). Le cadreur et sa camera occupent
  // x 88 a 136 sur toute sa course ; la main, ombre et balancement compris, va de 12 unites a gauche du doigt a 35 a droite :
  // 32 a 79, loin aussi des boutons, de la jauge, du score et de la camera frontale (13,6 ; 108).
  M.POINT = [44, 112];

  /* ---- Le dessin d'une pose : rot (degres), sx, sy (ecrasement autour du bout du doigt) ---- */
  function dessiner(rot, sx, sy) {
    const S = 4, W2 = LW * S, H2 = LH * S;
    const toile = () => { const c = document.createElement('canvas'); c.width = W2; c.height = H2; const g = c.getContext('2d');
      g.setTransform(S * E, 0, 0, S * E, TIP[0] * S, TIP[1] * S); g.rotate(rot * Math.PI / 180); g.scale(sx, sy); g.translate(-BX, -BY); return [c, g]; };
    // 1. les volumes : la main (rouge), la manchette (bleu), le reflet (vert)
    const [c1, g] = toile();
    const capsule = (x1, y1, x2, y2, r) => { g.lineCap = 'round'; g.lineWidth = r * 2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const disque = (x0, y0, r, ry) => { g.beginPath(); g.ellipse(x0, y0, r, ry || r, 0, 0, 6.2832); g.fill(); };
    g.fillStyle = g.strokeStyle = '#ff0000';
    capsule(11, 4.1, 11, 21, 4.1);                          // l'index, gros et rond
    g.beginPath(); g.roundRect(6.4, 16.4, 20.4, 18, 7); g.fill();   // le dos de la main, rebondi
    disque(17, 18.3, 3.8); disque(21.8, 19.4, 3.7); disque(25.4, 22, 3.3);   // les doigts replies
    capsule(8.4, 27.4, 3.4, 21.2, 3.5);                      // le pouce
    g.fillStyle = '#0000ff';
    g.beginPath(); g.roundRect(4.6, 32.2, 24.2, 9, 4.2); g.fill();  // la manchette roulee, plus large que le poignet
    g.fillStyle = '#00ff00';
    disque(8.7, 9.2, .95, 2.6); disque(4.9, 22.6, .7, 1.2);   // le reflet sur l'index et sur le pouce
    // 2. les traits fins : separations des doigts (rouge), coutures (vert), pli de la manchette (bleu)
    const [c2, h] = toile();
    const trait = (col, w, l) => { h.strokeStyle = col; h.lineWidth = w; h.lineCap = 'round'; h.beginPath(); h.moveTo(l[0], l[1]); for (let i = 2; i < l.length; i += 2) h.lineTo(l[i], l[i + 1]); h.stroke(); };
    for (const l of [[15, 17.6, 15.1, 22.6], [19.6, 17.7, 19.7, 22.4], [23.8, 19.8, 23.7, 23.8], [15.6, 23.9, 20, 24.5, 25.4, 24.6]]) trait('#ff0000', .62, l);
    for (const l of [[13.4, 31, 13.7, 28.6, 14.3, 26.8], [17.5, 31, 17.6, 28.2, 17.9, 26.4], [21.4, 31, 21.3, 28.6, 21.1, 27]]) trait('#00ff00', .5, l);
    trait('#0000ff', .55, [6.6, 36.6, 16.7, 37.1, 26.8, 36.6]);
    const d1 = g.getImageData(0, 0, W2, H2).data, d2 = h.getImageData(0, 0, W2, H2).data;
    // vote : un pixel est plein si la moitie de ses 16 sous-pixels l'est ; un trait fin, des 4 sur 16 (il reste continu)
    const q = new Uint8Array(LW * LH), ln = new Uint8Array(LW * LH);
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
      let r = 0, b = 0, v = 0, lr = 0, lv = 0, lb = 0;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const k = ((y * S + j) * W2 + x * S + i) * 4;
        if (d1[k + 3] > 127) { if (d1[k + 1] > 127) v++; else if (d1[k + 2] > d1[k]) b++; else r++; }
        if (d2[k + 3] > 100) { if (d2[k + 1] > 127) lv++; else if (d2[k + 2] > d2[k]) lb++; else lr++; }
      }
      const tout = r + b + v;
      q[y * LW + x] = tout < 8 ? 0 : v >= 6 ? 3 : b > r ? 2 : 1;     // 0 vide, 1 main, 2 manchette, 3 reflet (dans la main)
      ln[y * LW + x] = lr >= 4 ? 1 : lv >= 4 ? 2 : lb >= 4 ? 3 : 0;
    }
    const plein = (x, y) => x >= 0 && y >= 0 && x < LW && y < LH && q[y * LW + x] > 0;
    const zone = (x, y) => !plein(x, y) ? 0 : q[y * LW + x] === 2 ? 2 : 1;
    const o = G.mk(LW, LH), x = o.x;
    const px = (xx, yy, col) => { x.fillStyle = col; x.fillRect(xx, yy, 1, 1); };
    // 3. l'ombre portee, decalee en bas a droite
    x.fillStyle = PORTEE;
    for (let y = 0; y < LH; y++) for (let xx = 0; xx < LW; xx++) if (plein(xx - 4, y - 5)) x.fillRect(xx, y, 1, 1);
    // 4. le dedans : blanc, une ombre douce en bas a droite, un liseré de lumiere en haut a gauche (la lumiere vient de la)
    const dist = (xx, yy, dx, dy, n) => { const z = zone(xx, yy); for (let k = 1; k <= n; k++) if (zone(xx + dx * k, yy + dy * k) !== z) return k; return 99; };
    let x0 = LW, y0 = LH, x1 = 0, y1 = 0;
    for (let y = 0; y < LH; y++) for (let xx = 0; xx < LW; xx++) {
      if (!plein(xx, y)) continue;
      x0 = Math.min(x0, xx); y0 = Math.min(y0, y); x1 = Math.max(x1, xx); y1 = Math.max(y1, y);
      if (q[y * LW + xx] === 3) { px(xx, y, PUR); continue; }
      const e = Math.min(dist(xx, y, 1, 0, 5), dist(xx, y, 0, 1, 5), dist(xx, y, 1, 1, 5));
      const l = Math.min(dist(xx, y, -1, 0, 2), dist(xx, y, 0, -1, 2), dist(xx, y, -1, -1, 2));
      px(xx, y, e <= 1 ? OMBRE2 : e <= 3 ? OMBRE : e <= 5 && (xx + y) % 2 ? OMBRE : l <= 2 ? PUR : BLANC);
    }
    // 5. les traits fins, par-dessus
    for (let y = 0; y < LH; y++) for (let xx = 0; xx < LW; xx++) {
      const t = ln[y * LW + xx];
      if (!t || !plein(xx, y)) continue;
      px(xx, y, t === 1 ? LIGNE : t === 2 ? COUTURE : OMBRE2);
    }
    // 6. le gros trait : 2 pixels du cote de la lumiere, 3 du cote de l'ombre (en bas a droite), et un entre la main et la manchette
    for (let y = 0; y < LH; y++) for (let xx = 0; xx < LW; xx++) {
      if (plein(xx, y)) { if (zone(xx, y) === 1 && zone(xx, y + 1) === 2) px(xx, y, K); continue; }
      let pres = false;
      for (let j = -3; j <= 3 && !pres; j++) for (let i = -3; i <= 3; i++) {
        if (!plein(xx + i, y + j)) continue;
        const d2_ = i * i + j * j;
        if (d2_ <= 5 || (i <= 0 && j <= 0 && d2_ <= 10)) { pres = true; break; }
      }
      if (pres) { px(xx, y, K); x0 = Math.min(x0, xx); y0 = Math.min(y0, y); x1 = Math.max(x1, xx); y1 = Math.max(y1, y); }
    }
    o.bb = [x0, y0, x1 + 5, y1 + 6];          // (l'ombre portee comprise)
    return o;
  }

  /* ---- Les poses : quelques angles, et l'ecrasement de l'appui. Dessinees une par une, a l'avance, pendant l'attente ---- */
  const ROTS = []; for (let a = -14; a <= 14; a += 2) ROTS.push(a);
  const FORMES = { n: [1, 1], ecrase: [1.09, .85], ecrase2: [1.04, .93], etire: [.95, 1.08], etire2: [.98, 1.03] };
  const cles = ROTS.map(a => a + ':n').concat(Object.keys(FORMES).filter(f => f !== 'n').map(f => '0:' + f));
  const poses = new Map();
  const pose = (rot, forme) => {
    const k = rot + ':' + forme;
    let p = poses.get(k);
    if (!p) { const f = FORMES[forme]; p = dessiner(rot, f[0], f[1]); poses.set(k, p); }
    return p;
  };
  M.preparer = n => { for (const k of cles) { if (poses.has(k)) continue; const [a, f] = k.split(':'); pose(+a, f); if (--n <= 0) return false; } return true; };
  M.nbPoses = () => poses.size;
  // une pose demande quelques dizaines de millisecondes : elles se dessinent une a une des le chargement du jeu, dans les temps morts
  const fond = () => { if (M.preparer(1)) return; (window.requestIdleCallback || (f => setTimeout(f, 30)))(fond); };
  setTimeout(fond, 400);

  /* ---- Le deroule ---- */
  const m = M.etat = { phase: 'attente', T: M.ARRIVEE, t: 0, n: 0, x: 0, y: 0, vis: false, eclat: -1, ecran: null };
  M.reinit = () => { m.phase = 'attente'; m.T = M.ARRIVEE; m.t = 0; m.n = 0; m.vis = false; m.eclat = -1; };
  // d'ou elle arrive, ou elle repart : sous son point d'appui, un peu a gauche, hors de l'image. Presque a la verticale, son petit
  // depassement a l'arrivee ne la porte pas vers le cadreur (en biais depuis le coin, elle mordait sur lui 9 images)
  const DEP = [M.POINT[0] - 30, G.VH + 50];
  const rebond = u => { u = G.clamp(u, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };   // depasse un peu, revient
  const angle = a => G.clamp(Math.round(a / 2) * 2, -14, 14);
  // en attendant : elle flotte et se balance doucement
  const flotte = () => [Math.sin(m.vie * 5.2) * 1.2, angle(Math.sin(m.vie * 2.6) * 4)];

  // appelee a chaque image de l'accueil, apres les boutons : avance la main, commande le drone, la dessine
  M.maj = (x, W, dt) => {
    if (!W || !W.demo || W.vue || !W.vivant) { m.vis = false; return; }
    // on revient sur l'accueil (d'une partie, d'un menu) : elle reviendra vite
    const maint = performance.now();
    if (maint - (m.dernier || 0) > 500 || m.monde !== W) { M.reinit(); m.monde = W; }
    m.dernier = maint;
    m.T -= dt; m.t += dt; m.vie = (m.vie || 0) + dt;
    const bas = (W.sous ? 128 : 140);           // le drone est redescendu
    const p = M.POINT;
    let tx = p[0], ty = p[1] - 5, rot = 0, forme = 'n';
    switch (m.phase) {
      case 'attente':
        W.tutoMain = null; W.tutoCible = null; m.vis = false;
        M.preparer(1);                            // (si le chargement ne les a pas toutes dessinees)
        if (m.T <= 0 && M.preparer(99)) { m.phase = 'entre'; m.T = .5; m.t = 0; m.n = 0; }
        break;
      case 'entre': {
        // elle arrive vite en se balancant, depasse un peu sa place et revient ; le drone descend se placer bas
        W.tutoCible = bas + 8;
        const u = G.clamp(1 - m.T / .5, 0, 1), r = rebond(u);
        tx = DEP[0] + (p[0] - DEP[0]) * r; ty = DEP[1] + (p[1] - 5 - DEP[1]) * r;
        rot = angle(14 * (1 - u) - 10 * Math.sin(u * Math.PI));
        if (m.T <= 0) { const [b, a] = flotte(); ty += b; rot = a; }
        if (m.T <= 0 && ((W.y >= bas - 4 && Math.abs(W.vy) < 60) || m.t > 2.2)) { m.phase = 'appui'; m.T = .34; m.t = 0; m.n++; }
        break;
      }
      case 'appui':
        // l'elan (elle se leve un peu, s'etire), puis elle s'ecrase sur la vitre : c'est la que le drone monte
        if (m.t < .07) { ty = p[1] - 8; forme = 'etire'; W.tutoMain = null; W.tutoCible = bas; }
        else {
          if (m.eclat < 0 && !m.contact) { m.eclat = 0; m.contact = true; }
          W.tutoMain = true; W.tutoCible = null;
          ty = p[1] + 1; forme = m.t < .16 ? 'ecrase' : 'ecrase2';
        }
        if (m.T <= 0) { m.phase = 'lache'; m.T = 2.4; m.t = 0; m.bas = false; m.contact = false; }
        break;
      case 'lache': {
        // elle rebondit en lachant, puis flotte en attendant que le drone soit redescendu et se tienne la
        const u = G.clamp(m.t / .22, 0, 1);
        ty = p[1] + 1 - 6 * rebond(u);
        forme = m.t < .07 ? 'etire' : m.t < .15 ? 'etire2' : 'n';
        if (m.t > .22) { const [b, a] = flotte(); ty += b; rot = a; }
        if (W.y >= bas - 4) m.bas = true;
        W.tutoMain = m.bas ? null : false; W.tutoCible = m.bas ? bas : null;
        if ((m.t > .9 && m.bas && Math.abs(W.vy) < 60) || m.T <= 0) {
          m.bas = false;
          if (m.n < APPUIS) { m.phase = 'appui'; m.T = .34; m.t = 0; m.n++; }
          else { m.phase = 'sort'; m.T = .75; m.t = 0; }
        }
        break;
      }
      case 'sort': {
        // au revoir : elle s'agite deux fois, puis file en bas a gauche
        W.tutoMain = null; W.tutoCible = null;
        if (m.t < .4) rot = angle(Math.sin(m.t * 31) * 13 * (1 - m.t / .5));
        else {
          const u = G.clamp((m.t - .4) / .35, 0, 1), e = u * u;
          tx = p[0] + (DEP[0] - p[0]) * e; ty = p[1] - 5 + (DEP[1] - p[1] + 5) * e; rot = angle(12 * u);
        }
        if (m.T <= 0) { m.phase = 'attente'; m.T = G.rnd(M.RETOUR[0], M.RETOUR[1]); m.vis = false; }
        break;
      }
    }
    if (m.phase === 'attente') return;
    m.x = tx; m.y = ty; m.vis = true; m.rot = rot; m.forme = forme;
    const im = pose(rot, forme);
    const ix = Math.round(tx * G.S - TIP[0]), iy = Math.round(ty * G.S - TIP[1]);
    m.bb = [(ix + im.bb[0]) / G.S, (iy + im.bb[1]) / G.S, (im.bb[2] - im.bb[0]) / G.S, (im.bb[3] - im.bb[1]) / G.S];
    // l'eclat de l'appui : des traits qui jaillissent du bout du doigt, et un rond qui s'ouvre
    if (m.eclat >= 0) {
      m.eclat += dt;
      const u = m.eclat / .32;
      if (u < 1) {
        const cxp = Math.round(p[0] * G.S), cyp = Math.round((p[1] - 1) * G.S), pt = (X, Y, col) => { x.fillStyle = col; x.fillRect(Math.round(X) / G.S, Math.round(Y) / G.S, 2 / G.S, 2 / G.S); };
        x.globalAlpha = 1 - u * u;
        for (const a of [-160, -125, -90, -55, -20]) {
          const ra = a * Math.PI / 180, r0 = 9 + u * 16, r1 = 15 + u * 24;
          for (let r = r0; r <= r1; r += 1.5) pt(cxp + Math.cos(ra) * r, cyp + Math.sin(ra) * r, r > r1 - 3 ? '#ffe27a' : PUR);
        }
        const R = 5 + u * 30, n = Math.round(R * 4);
        x.fillStyle = PUR;
        for (let i = 0; i < n; i++) { const t = i / n * 6.2832; x.fillRect(Math.round(cxp + Math.cos(t) * R) / G.S, Math.round(cyp + Math.sin(t) * R * .45 + 6) / G.S, 1 / G.S, 1 / G.S); }
        x.globalAlpha = 1;
      } else m.eclat = -1;
    }
    x.drawImage(im, ix / G.S, iy / G.S);
  };
  // la boite de la main dessinee (ombre comprise), en unites de jeu (pour les controles)
  M.boite = () => m.vis && m.bb ? m.bb.slice() : null;
})();
