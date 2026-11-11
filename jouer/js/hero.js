/* Le heros : un cadreur debout sur son drone, camera Super 8 au poing.
   Il est redessine a chaque image : jambes qui amortissent, buste qui penche, cheveux et sac qui suivent le mouvement,
   drone qui s'incline, helices qui tournent. C'est ce mouvement continu qui lui donne vie.
   Toutes les mesures sont en pixels de la haute definition (800 x 360). */
'use strict';
(function () {
  const OPT = G.HERO_OPT = {
    cheveux: ['Courts', 'Bouclés', 'Longs', 'Crâne rasé', 'Casquette', 'Bob'],
    couleur: [['Brun', '#5a3a24'], ['Châtain', '#8a5e36'], ['Blond', '#d3aa52'], ['Noir', '#2c2833'], ['Roux', '#bb5a2c'], ['Gris', '#a2a2aa']],
    barbe: ['Sans', 'De 3 jours', 'Pleine', 'Moustache'],
    lunettes: ['Sans', 'Lunettes', 'Solaires'],
    peau: [['Claire', '#f4cdaa'], ['Dorée', '#e0b083'], ['Mate', '#ba8358'], ['Foncée', '#7f5232']],
    tee: [['Noir', '#34364a'], ['Rouge', '#c8393b'], ['Bleu', '#2f6fb5'], ['Vert', '#3f8f4f'], ['Blanc', '#e8e6df'], ['Moutarde', '#d29a2c']],
    drone: [['Blanc', '#f6f6f2', '#c9a13a'], ['Noir', '#44465a', '#e0562e'], ['Jaune', '#f4cf42', '#2b2d3c'], ['Corail', '#f4886f', '#f6f6f2']],
  };
  const K = '#15131d';
  const L = 124, A = { x: 62, y: 88 };
  const hx = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const css = v => '#' + v.map(a => Math.round(Math.max(0, Math.min(255, a))).toString(16).padStart(2, '0')).join('');
  const om = (c, k = .3) => { const v = hx(c); return css([v[0] * (1 - k) + 30 * k, v[1] * (1 - k) + 26 * k, v[2] * (1 - k) + 72 * k]); };
  const lu = (c, k = .28) => { const v = hx(c); return css([v[0] * (1 - k) + 255 * k, v[1] * (1 - k) + 240 * k, v[2] * (1 - k) + 200 * k]); };
  G.tonOmbre = om; G.tonLumiere = lu;
  /* Ceux qu'on debloque au cumul de bobines */
  const PERSOS = G.PERSOS = [
    { id: 'moi', n: 'Toi' },
    { id: 'realisatrice', n: 'La réalisatrice', cheveux: 2, couleur: 3, barbe: 0, lunettes: 2, peau: 1, tee: 1, gilet: '#2c2a38', jean: '#23242e', coiffe: 'beret' },
    { id: 'perchman', n: 'Le perchman', cheveux: 0, couleur: 1, barbe: 2, lunettes: 0, peau: 2, tee: 5, gilet: '#d9622c', jean: '#46503a', coiffe: 'casquette' },
    { id: 'mamie', n: 'Mamie cascade', cheveux: 3, couleur: 5, barbe: 0, lunettes: 1, peau: 0, tee: 4, gilet: '#b65a9a', jean: '#6a5a8c', coiffe: 'chignon' },
    { id: 'astro', n: 'L\'astronaute', cheveux: 3, couleur: 3, barbe: 0, lunettes: 0, peau: 0, tee: 4, gilet: '#e8e6df', jean: '#d8d6cf', coiffe: 'astro' },
    { id: 'pirate', n: 'Le pirate', cheveux: 2, couleur: 3, barbe: 2, lunettes: 0, peau: 1, tee: 4, gilet: '#6a2a2a', jean: '#2c2a38', coiffe: 'bandana' },
  ];
  G.MODELES = [
    { id: 'phantom', n: 'Le fidèle' }, { id: 'course', n: 'Course' }, { id: 'carton', n: 'Carton' },
    { id: 'hexa', n: 'Hexa' }, { id: 'laiton', n: 'Vapeur' }, { id: 'tapis', n: 'Tapis' },
  ];
  const actif = () => {
    const h = PERSOS.find(q => q.id === G.sav.heros);
    return h && h.id !== 'moi' && G.debloque('perso', h.id) ? h : G.sav.perso;
  };
  const modele = () => (G.debloque('drone', G.sav.modele) ? G.sav.modele : 'phantom');
  /* Les deguisements et les drones farfelus (deguisements.js) : chacun s'inscrit ici.
     Costume : { dos (ce qui est derriere lui : cape, queue, ailes), buste, tete, pied }. Drone : { dessin, rotors: [[x, y]...] }. */
  const COS = G.HERO_COSTUMES = {}, DRO = G.HERO_DRONES = {};
  const costume = () => COS[actif().costume] || null;
  let palette = null;
  G.heroReset = () => { palette = null; };

  function pal() {
    if (palette) return palette;
    const p = actif(), dr = G.sav.perso;
    const h = OPT.couleur[p.couleur][1], s = p.peauC || OPT.peau[p.peau][1], t = p.teeC || OPT.tee[p.tee][1], d = OPT.drone[dr.drone][1], d3 = OPT.drone[dr.drone][2];
    palette = { h, h1: om(h, .35), h2: lu(h, .3), s, s1: om(s, .28), s2: lu(s, .3), t, t1: om(t, .35), t2: lu(t, .22), d, d1: om(d, .22), d0: om(d, .46), d2: lu(d, .5), d3, d31: om(d3, .3), jean: p.jean || '#2f3b5e', jean1: om(p.jean || '#2f3b5e', .3), jean2: lu(p.jean || '#2f3b5e', .16), gilet: p.gilet || '#7a6a4a', gilet1: om(p.gilet || '#7a6a4a', .3), gilet2: lu(p.gilet || '#7a6a4a', .2), cuir: '#8a6236', cuir1: '#604220', cuir2: '#c9a26a' };
    return palette;
  }

  /* Dessin en deux passes : un seul contour sombre d'abord, les couleurs ensuite */
  let buf = null, bufD = null, bufC = null, c, pass = 0, CONT = K, MIR = 1;
  const r = (col, a, b, w, h) => {
    a = Math.round(a); b = Math.round(b);
    if (MIR < 0) a = -a - w;
    if (pass === 0) { c.fillStyle = CONT; c.fillRect(A.x + a - 1, A.y + b - 1, w + 2, h + 2); } else { c.fillStyle = col; c.fillRect(A.x + a, A.y + b, w, h); }
  };
  const d = (col, a, b, w, h) => { if (pass === 1) { c.fillStyle = col; let q = Math.round(a); if (MIR < 0) q = -q - w; c.fillRect(A.x + q, A.y + Math.round(b), w, h); } };
  const seg = (col, x0, y0, x1, y1, w) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) r(col, x0 + (x1 - x0) * i / n - w / 2, y0 + (y1 - y0) * i / n - w / 2, w, w);
  };
  /* Le tour sur soi-meme. k va de 1 (profil, regarde a droite) a -1 (profil, regarde a gauche) en passant par 0 (de face).
     On dessine de vraies poses : profil, trois-quarts, trois-quarts ouvert, face. */
  const vue = k => { const v = Math.abs(k === undefined ? 1 : k); return { m: k < 0 ? -1 : 1, a: v > .84 ? 1 : v > .5 ? .66 : v > .17 ? .33 : 0 }; };
  /* Genou ou coude : on calcule l'articulation entre deux points */
  const ik = (x0, y0, x1, y1, l, sens) => {
    const dx = x1 - x0, dy = y1 - y0, dd = Math.min(Math.hypot(dx, dy), l * 2 - .01);
    const h = Math.sqrt(Math.max(0, l * l - dd * dd / 4));
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, n = Math.hypot(dx, dy) || 1;
    return [mx - dy / n * h * sens, my + dx / n * h * sens];
  };

  const moteur = mx => { r('#3a3c4a', mx, -12, 6, 6); d('#5f6172', mx + 1, -12, 4, 1); d('#23242e', mx, -7, 6, 1); d('#8a8c9c', mx + 2, -11, 1, 3); };
  function droneCourse(P, st) {
    // carbone, tout en bras, une batterie sanglee sur le dessus
    r('#23242e', -27, -6, 55, 2); d('#3f414f', -26, -6, 53, 1);
    moteur(-27); moteur(22);
    r('#23242e', -13, -5, 27, 4); d('#44465a', -12, -5, 25, 1);
    r(P.d3, -9, -11, 19, 6); d(lu(P.d3, .4), -8, -11, 17, 1); d(om(P.d3, .3), -9, -7, 19, 2);
    r('#17151f', -2, -11, 4, 6); d('#ff3b3b', -12, -4, 2, 1); d('#3bff6e', 12, -4, 2, 1);
    r('#2c2e3a', 12, -9, 5, 4); d('#7fd0ff', 16, -8, 1, 2);
    r('#8a8c9c', -12, -18, 1, 8); d('#ff3b3b', -12, -18, 1, 2);
  }
  function droneCarton(P, st) {
    // une boite de demenagement, deux tasseaux, et ca vole quand meme
    r('#a87c4a', -26, -5, 53, 2); d('#c9a26a', -25, -5, 51, 1);
    moteur(-27); moteur(22);
    r('#c49a62', -15, -11, 31, 16);
    d('#d8b47e', -14, -11, 29, 1); d('#a07a48', -15, 3, 31, 2); d('#a07a48', -15, -11, 1, 16);
    d('#e8d9b0', -3, -11, 6, 16); d('#cfbf94', -3, -11, 1, 16);
    for (let i = 0; i < 3; i++) d('#6a4a2a', -12 + i * 4, -6 + (i % 2), 2, 1);
    d('#c8393b', 7, -6, 5, 1); d('#c8393b', 9, -8, 1, 5); d('#c8393b', 8, -7, 3, 1);
    r('#9aa2b0', -9, 5, 1, 6); r('#9aa2b0', 9, 5, 1, 6); r('#9aa2b0', -14, 10, 28, 1);
  }
  function droneHexa(P, st, ar) {
    r(P.d1, -39, -7, 79, 2); d(P.d2, -38, -7, 77, 1);
    moteur(-39); moteur(34);
    drone0(P, st, ar);
  }
  function droneLaiton(P, st) {
    // laiton, bois verni, rivets et cheminee
    const b = '#c9963a', b1 = '#8a6220', b2 = '#f0cf7a';
    r('#6a4426', -26, -7, 53, 3); d('#8e6238', -25, -7, 51, 1);
    moteur(-27); moteur(22);
    r(b, -13, -11, 27, 3); r(b, -16, -8, 33, 9); r(b1, -12, 1, 25, 3);
    d(b2, -11, -11, 20, 1); d(b2, -15, -8, 24, 1); d(b1, -16, -1, 33, 2);
    for (let i = 0; i < 7; i++) d(b1, -13 + i * 5, -5, 1, 1);
    r('#7fd0ff', 7, -7, 6, 5); d('#fff', 8, -6, 2, 2); d(b1, 7, -7, 6, 1);
    r('#3a3c4a', -13, -17, 4, 6); d('#5f6172', -12, -17, 2, 1);
    const sm = (st.t * 5 | 0) % 3;
    if (pass === 1) { c.fillStyle = 'rgba(235,235,235,.8)'; c.fillRect(A.x - 13 - sm, A.y - 20 - sm, 3, 2); c.fillRect(A.x - 15 - sm * 2, A.y - 24 - sm, 2, 2); }
    r('#6a4426', -10, 4, 2, 6); r('#6a4426', 9, 4, 2, 6); r(b, -15, 9, 12, 2); r(b, 4, 9, 12, 2);
  }
  function droneTapis(P, st) {
    // pas d'helice : il ondule
    for (let i = 0; i < 27; i++) {
      const a = -27 + i * 2, y = -9 + Math.round(Math.sin(st.t * 7 + i * .55) * 1.6);
      r('#a8282e', a, y, 2, 5);
      d(i % 3 ? '#d9483e' : '#f0c93a', a, y + 1, 2, 1);
      d(i % 4 ? '#7c1c24' : '#f0c93a', a, y + 3, 2, 1);
      d('#f4e8c8', a, y + 5, 1, 2);
    }
  }
  function drone(P, st, ar) {
    const m = modele();
    if (DRO[m]) return DRO[m].dessin(P, st, ar);
    switch (m) {
      case 'course': return droneCourse(P, st);
      case 'carton': return droneCarton(P, st);
      case 'hexa': return droneHexa(P, st, ar);
      case 'laiton': return droneLaiton(P, st);
      case 'tapis': return droneTapis(P, st);
      default: return drone0(P, st, ar);
    }
  }
  function drone0(P, st, ar) {
    const n = st.rot % 4;
    // bras
    r(P.d, -26, -7, 53, 3);
    d(P.d2, -25, -7, 18, 1); d(P.d2, 8, -7, 18, 1); d(P.d1, -26, -5, 53, 1);
    d(P.d3, -20, -7, 4, 3); d(P.d3, 17, -7, 4, 3);
    // moteurs
    for (const mx of [-27, 22]) {
      r('#3a3c4a', mx, -12, 6, 6);
      d('#5f6172', mx + 1, -12, 4, 1); d('#23242e', mx, -7, 6, 1); d('#8a8c9c', mx + 2, -11, 1, 3);
    }
    // train d'atterrissage
    r(P.d1, -11, 3, 2, 8); r(P.d1, 10, 3, 2, 8);
    r(P.d, -17, 10, 13, 2); r(P.d, 5, 10, 13, 2);
    d(P.d0, -17, 11, 13, 1); d(P.d0, 5, 11, 13, 1); d(P.d2, -16, 10, 5, 1); d(P.d2, 6, 10, 5, 1);
    // coque
    r(P.d, -11, -11, 23, 3);
    r(P.d, -15, -8, 31, 8);
    r(P.d1, -12, 0, 25, 3);
    d(P.d2, -10, -11, 16, 1); d(lu(P.d, .3), -14, -8, 20, 1);
    d(P.d1, -15, -2, 31, 2); d(P.d0, -12, 2, 25, 1);
    d(P.d3, -14, -5, 29, 1); d(P.d31, -14, -4, 29, 1);
    for (let i = 0; i < 5; i++) d(P.d0, -9 + i * 2, -1, 1, 2);
    d('#d8dbe2', 6, -10, 6, 2); d((st.t * 3 | 0) % 2 ? '#3bff6e' : '#1f9c44', 7, -10, 1, 1); d('#3bff6e', 9, -10, 1, 1);
    d((st.t * 2 | 0) % 2 ? '#ff3b3b' : '#a01f1f', 15, -4, 1, 1); d('#3bff6e', -15, -4, 1, 1);
    // nacelle
    r('#2c2e3a', 1, 3, 8, 6); d('#4a4c5a', 2, 3, 6, 1); d('#7fd0ff', 8, 5, 1, 3); d('#fff', 8, 5, 1, 1); d('#6a6c7a', 3, 9, 4, 1);
    if (ar >= 4) for (const cx of [-24, 25]) { r('#9aa2b0', cx - 15, -10, 2, 3); r('#9aa2b0', cx + 13, -10, 2, 3); r('#b8c0cc', cx - 15, -8, 30, 1); d('#e4e9f0', cx - 12, -8, 8, 1); }
  }

  function helices(st) {
    const n = st.rot, mo = modele();
    if (mo === 'tapis') return;
    const ROT = DRO[mo] ? DRO[mo].rotors : (mo === 'hexa' ? [-36, -24, 25, 37] : [-24, 25]).map(cx => [cx, -14]);
    for (const [cx, cy] of ROT) {
      const px = A.x + cx, py = A.y + cy;
      // moteur coupe : les pales s'arretent, on les voit
      if (st.mort) { c.fillStyle = '#2c2e3a'; c.fillRect(px - 10, py + (cx % 2 ? 0 : 1), 20, 1); c.fillRect(px, py, 1, 3); continue; }
      c.fillStyle = 'rgba(225,235,250,.3)'; c.fillRect(px - 15, py, 30, 2);
      c.fillStyle = 'rgba(245,250,255,.6)'; c.fillRect(px - 11, py, 22, 1);
      // la pale passe : deux reflets opposes qui glissent le long du disque
      const k = Math.sin(n * 1.7), k2 = Math.cos(n * 1.7);
      c.fillStyle = '#fff'; c.fillRect(px + k * 13 - 3, py, 6, 1);
      c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(px - k2 * 13 - 2, py + 1, 4, 1);
      c.fillStyle = '#2c2e3a'; c.fillRect(px, py, 1, 3);
    }
  }

  function jambes(P, st, ar) {
    const V = vue(st.faceP); MIR = V.m;
    const f = st.flex;           // 0 : debout ; 1 : accroupi, il pousse
    const air = st.air;          // il decolle des pieds quand il tombe vite
    // il pietine pendant qu'il tourne : un pied, puis l'autre
    const pas = st.tourne > .02 ? Math.sin(st.t * 24) : 0;
    const hanche = -28 + f * 5 - air * 2 - Math.abs(pas) * st.tourne * 1.5;
    const lean = st.lean * 2 * V.a;
    const ecart = V.a === 1 ? [-7, 6] : V.a === .66 ? [-6, 6] : V.a === .33 ? [-5, 6] : [-5, 5];
    ecart.forEach((fx, i) => {
      const col = i ? P.jean : P.jean1;
      const leve = st.tourne > .02 ? Math.max(0, i ? pas : -pas) * 3 : 0;
      const fy = -13 - air * (i ? 2 : 4) - leve;
      const hx0 = (i ? 2 : -3) + lean;
      const [gx, gy] = ik(hx0, hanche, fx, fy, 9.2, -1);
      // de face, les genoux ne partent plus sur le cote
      const kx = gx * V.a + (hx0 + fx) / 2 * (1 - V.a);
      seg(col, hx0, hanche, kx, gy, 4);
      seg(col, kx, gy, fx, fy, 3);
      d(i ? P.jean2 : P.jean1, kx + 1, gy - 1, 2, 1);
      // la chaussure raccourcit quand le pied tourne vers nous
      const lg = V.a === 1 ? 8 : V.a === .66 ? 7 : V.a === .33 ? 6 : 5;
      const dep = V.a === 1 ? -3 : V.a === .66 ? -3 : -2;
      const co = costume();
      if (co && co.pied) co.pied(P, fx + dep, fy, lg, i, V.a, st);
      else {
        r('#e9e4d8', fx + dep, fy + 1, lg, 2);
        d('#c8393b', fx + dep + 1, fy + 1, Math.max(1, lg - 5), 1); d('#fff', fx + dep + lg - 3, fy + 1, 3, 1); d('#9a958a', fx + dep, fy + 2, lg, 1);
      }
      if (ar >= 3 || (co && co.genou)) { r('#8f97a6', kx - 2, gy - 2, 4, 4); d('#c6ccd8', kx - 1, gy - 2, 2, 1); }
    });
    return hanche;
  }

  function buste(P, st, hanche, ar) {
    const V = vue(st.faceB); MIR = V.m;
    const a = V.a, lean = st.lean * 2 * a, hb = hanche - 12;
    const bx = lean;
    // le sac de camera, dans le dos : il passe derriere lui quand il tourne
    const sac = st.sac * 2, sacX = a === 1 ? -11 : a === .66 ? -10 : a === .33 ? -8 : -3;
    const co = costume(), pr = actif();
    if (a > 0 && !pr.sansSac) {
      r(P.cuir, bx + sacX + sac, hb + 2, 6, 9);
      d(P.cuir1, bx + sacX + sac, hb + 2, 2, 9); d(P.cuir2, bx + sacX + 1 + sac, hb + 2, 5, 1); d('#d9b85a', bx + sacX + 4 + sac, hb + 6, 1, 2);
    }
    const lg = a === 1 ? 11 : a === .66 ? 12 : 13, x0 = bx - (a === 1 ? 5 : a === .66 ? 6 : 6);
    r(P.t, x0, hb, lg, 13);
    d(P.t1, x0, hb, a === 0 ? 2 : 3, 13); d(P.t2, x0 + lg - 3, hb, 2, 7);
    // le gilet s'ouvre sur le t-shirt quand il est de face (un deguisement peut ne pas en avoir)
    if (!pr.sansGilet) {
      const pan = a === 1 ? 4 : 5;
      d(P.gilet, x0, hb + 1, pan, 11); d(P.gilet, x0 + lg - (a === 1 ? 3 : pan), hb + 1, a === 1 ? 3 : pan, 11);
      d(P.gilet1, x0, hb + 1, 2, 11); d(P.gilet2, x0 + lg - 2, hb + 1, 2, 3);
      d(P.gilet1, x0 + 1, hb + 6, 3, 1); d(P.gilet2, x0 + 1, hb + 7, 3, 2); d(P.gilet1, x0 + lg - 4, hb + 6, 3, 1); d(P.gilet2, x0 + lg - 4, hb + 7, 3, 2);
    } else { d(P.t1, x0, hb + 6, 2, 6); d(P.t2, x0 + lg - 3, hb + 1, 2, 4); }
    if (co && co.buste) co.buste(P, st, x0, hb, lg, a, bx);
    // la bandouliere du sac
    if (!pr.sansSangle) for (let i = 0; i < 6; i++) d(P.cuir1, x0 + lg - 2 - i * 1.5 * (a === 0 ? .9 : 1), hb + i * 2, 2, 2);
    d(pr.ceinture || '#2c2233', x0, hb + 11, lg, 2); d(pr.boucle || '#d9b85a', x0 + (lg >> 1), hb + 11, 2, 2);
    if (co && co.dessous) co.dessous(P, st, x0, hb, lg, a, bx);
    if (ar >= 2) { r('#8f97a6', x0 + 1, hb + 1, lg - 2, 8); d('#c6ccd8', x0 + 3, hb + 1, lg - 5, 2); d('#6a7180', x0 + 1, hb + 7, lg - 2, 2); d('#ffd54a', x0 + (lg >> 1), hb + 3, 2, 2); }
    return hb;
  }

  function tete(P, st, hb, ar) {
    const p = actif();
    const V = vue(st.faceH); MIR = V.m;
    const lean = st.lean * 3 * V.a;
    // il est fier quand il brandit sa statuette (oscarPhase)
    const look = st.look, phO = oscarPhase(st), mood = phO > .6 && phO < 2.1 && V.a === 1 ? 'joie' : st.mood;
    const ly = look === 'haut' ? -1 : look === 'bas' ? 1 : 0;
    const by = hb - 11 + (look === 'bas' ? 1 : 0), bx = lean;
    r(P.s1, bx - 1, by + 9, 4, 3);
    r(P.s, bx - 5, by + 1, 11, 8);
    r(P.s, bx - 4, by, 9, 10);
    d(P.s2, bx + 1, by + 1, 3, 1); d(P.s1, bx - 5, by + 6, 2, 3); d(P.s1, bx - 3, by + 9, 6, 1);
    if (V.a < 1) {
      // trois-quarts et face : deux yeux, le nez et la bouche glissent vers le milieu
      const a = V.a, e1 = a === .66 ? -1 : a === .33 ? -2 : -3, e2 = a === .66 ? 3 : a === .33 ? 2 : 2, n = a === .66 ? 4 : a === .33 ? 2 : 0;
      if (a < .5) { d(P.s1, bx - 5, by + 3, 1, 3); }
      d(P.s1, bx + 5, by + 3, 1, 3);
      r(P.s, bx + (a === .66 ? 6 : 5), by + 3, 1, 2);
      if (a === .66) { r(P.s, bx + 6, by + 3 + ly, 1, 3); }
      const yy = by + 3 + ly;
      if (st.cligne > 0 || mood === 'ko') { d(K, bx + e1, yy + 1, 2, 1); d(K, bx + e2, yy + 1, 2, 1); }
      else {
        d('#fff', bx + e1, yy, 2, 2); d('#fff', bx + e2, yy, 2, 2);
        d('#2c2233', bx + e1 + (a === 0 ? 0 : 1), yy, 1, 2); d('#2c2233', bx + e2 + (a === 0 ? 1 : 1), yy, 1, 2);
        d(P.h1, bx + e1, yy - 1, 2, 1); d(P.h1, bx + e2, yy - 1, 2, 1);
      }
      d(P.s1, bx + n, by + 5 + ly, 1, 2);
      d('#e89a86', bx + e1, by + 6 + ly, 1, 1); d('#e89a86', bx + e2 + 1, by + 6 + ly, 1, 1);
      if (p.barbe === 1) { d(P.s1, bx - 3, by + 7, 8, 2); for (let i = 0; i < 8; i += 2) { d(P.h1, bx - 3 + i, by + 7, 1, 1); d(P.h1, bx - 2 + i, by + 8, 1, 1); } }
      if (p.barbe === 2) { d(P.h, bx - 4, by + 6, 9, 4); d(P.h1, bx - 4, by + 9, 9, 1); d(P.h2, bx - 1, by + 7, 2, 1); }
      if (p.barbe === 3) { d(P.h, bx + n - 2, by + 6, 5, 1); }
      d(K, bx + n - 1, by + 7, mood === 'peur' ? 3 : 3, mood === 'peur' ? 2 : 1);
      if (p.lunettes) { d(K, bx + e1 - 1, yy, 4, 1); d(K, bx + e2 - 1, yy, 4, 1); d(K, bx + e1 + 3, yy, e2 - e1 - 4, 1); }
    } else {
    r(P.s, bx + 6, by + 3 + ly, 1, 3); d(P.s1, bx + 6, by + 5 + ly, 1, 1);
    d('#e89a86', bx + 2, by + 6 + ly, 2, 1);
    d(P.s1, bx - 3, by + 3, 2, 3); d(P.s, bx - 2, by + 4, 1, 1);
    // yeux : ils clignent
    if (mood === 'ko') { for (const ox of [2, 4]) { d(K, bx + ox, by + 3 + ly, 1, 1); d(K, bx + ox + 1, by + 4 + ly, 1, 1); d(K, bx + ox + 1, by + 3 + ly, 0, 0); } d(K, bx + 2, by + 7, 4, 1); }
    else if (mood === 'joie') { d(K, bx + 2, by + 3 + ly, 4, 1); d(K, bx + 2, by + 2 + ly, 1, 1); d(K, bx + 5, by + 2 + ly, 1, 1); }
    else if (st.cligne > 0) { d(P.s1, bx + 2, by + 3 + ly, 4, 2); d(K, bx + 2, by + 4 + ly, 4, 1); }
    else {
      const ha = mood === 'peur' ? 3 : 2;
      d('#fff', bx + 2, by + 3 + ly, 4, ha);
      d('#2c2233', bx + 3 + (look === 'dos' ? -1 : 1), by + 3 + ly + (look === 'bas' ? ha - 2 : 0), 2, mood === 'peur' ? 1 : 2);
      if (mood !== 'peur') d(P.h1, bx + 2, by + 3 + ly, 4, 1);
    }
    d(P.h1, bx + 2, by + 2 + ly - (mood === 'peur' ? 1 : 0), 4, 1);
    if (p.barbe === 1) { d(P.s1, bx - 1, by + 7, 6, 2); for (let i = 0; i < 6; i += 2) { d(P.h1, bx - 1 + i, by + 7, 1, 1); d(P.h1, bx + i, by + 8, 1, 1); } }
    if (p.barbe === 2) { d(P.h, bx - 2, by + 6, 8, 4); d(P.h1, bx - 2, by + 9, 8, 1); d(P.h2, bx + 1, by + 7, 2, 1); }
    if (p.barbe === 3) { d(P.h, bx + 2, by + 6, 4, 1); }
    if (mood === 'peur') { d(K, bx + 2, by + 7, 3, 2); }
    else if (mood === 'joie') { d(K, bx + 2, by + 6, 4, 1); d('#fff', bx + 3, by + 6, 2, 1); d(K, bx + 3, by + 7, 2, 1); }
    else d(K, bx + 2, by + 7, 3, 1);
    if (p.lunettes) {
      d(K, bx + 1, by + 3 + ly, 6, 1); d(K, bx - 2, by + 3 + ly, 3, 1); d(K, bx + 1, by + 3 + ly, 1, 3); d(K, bx + 6, by + 3 + ly, 1, 3); d(K, bx + 1, by + 5 + ly, 6, 1);
      if (p.lunettes === 2) { d('#14121a', bx + 2, by + 4 + ly, 4, 1); d('#5fb7ff', bx + 2, by + 4 + ly, 1, 1); }
    }
    }
    // cheveux : les meches suivent le vent
    const h = P.h, h1 = P.h1, h2 = P.h2, w = st.meche;
    // de face, la meche et le cote se retrouvent des deux cotes de la tete
    if (ar < 1 && V.a < .5 && (p.cheveux === 0 || p.cheveux === 2 || p.cheveux === 1)) { r(h, bx + 3, by + 1, 3, p.cheveux === 2 ? 9 : 4); d(h1, bx + 4, by + 3, 2, 2); }
    if (ar < 1) switch (p.cheveux) {
      case 0:
        r(h, bx - 5, by - 2, 11, 3); r(h, bx - 5, by + 1, 3, 4); r(h, bx - 6 - w, by - 1, 2, 3);
        d(h2, bx - 3, by - 2, 4, 1); d(h2, bx + 2, by - 1, 2, 1); d(h1, bx - 5, by + 3, 2, 2); d(h1, bx + 3, by, 2, 1);
        break;
      case 1:
        r(h, bx - 6, by - 3, 13, 5); r(h, bx - 7 - w, by, 4, 6);
        for (const [a, b] of [[-5, -3], [-2, -2], [1, -3], [4, -2], [-6, 1], [-6, 4]]) { d(h2, bx + a, by + b, 2, 1); d(h1, bx + a + 1, by + b + 1, 1, 1); }
        break;
      case 2:
        r(h, bx - 5, by - 2, 11, 3); r(h, bx - 6 - w, by, 4, 11 - w);
        d(h1, bx - 6 - w, by + 6, 2, 5 - w); d(h2, bx - 3, by - 2, 4, 1); d(h2, bx - 5 - w, by + 2, 1, 4);
        break;
      case 3: d(h1, bx - 4, by + 1, 3, 2); break;
      case 4:
        r('#c8393b', bx - 5, by - 3, 11, 4); r('#8e2329', bx + 4, by, 6, 2);
        d(lu('#c8393b'), bx - 3, by - 3, 5, 1); d('#fff', bx - 1, by - 1, 2, 1); d('#6e1a1f', bx - 5, by - 1, 2, 2); r(h, bx - 5, by + 1, 2, 3);
        break;
      default:
        r('#d9c79a', bx - 8, by, 17, 2); r('#d9c79a', bx - 5, by - 4, 11, 4);
        d('#b49f6d', bx - 8, by + 1, 17, 1); d('#efe2bc', bx - 3, by - 4, 5, 1); d('#8a6a3c', bx - 5, by - 1, 11, 1); r(h, bx - 5, by + 2, 2, 2);
    }
    if (ar < 1 && p.coiffe) switch (p.coiffe) {
      case 'beret': r('#c8393b', bx - 6, by - 3, 12, 3); r('#c8393b', bx - 2, by - 5, 3, 2); d('#e8615a', bx - 3, by - 3, 5, 1); d('#8e2329', bx - 6, by - 1, 12, 1); break;
      case 'casquette': r('#3a5a8c', bx - 5, by - 3, 11, 4); r('#2a4268', bx + 4, by, 6, 2); d('#5a80b8', bx - 3, by - 3, 5, 1); break;
      case 'chignon': r('#c6c6ce', bx - 5, by - 2, 11, 3); r('#c6c6ce', bx - 8, by - 4, 5, 5); d('#e8e8ee', bx - 7, by - 4, 3, 1); d('#9a9aa4', bx - 8, by, 5, 1); d('#c6c6ce', bx - 5, by + 1, 2, 3); break;
      case 'bandana': r('#c8393b', bx - 5, by - 2, 11, 3); r('#c8393b', bx - 8 - st.meche, by, 4, 2); d('#fff', bx - 2, by - 1, 1, 1); d('#fff', bx + 2, by - 1, 1, 1); d(K, bx + 1, by + 3 + ly, 6, 2); d(K, bx + 1, by + 1, 1, 2); break;
      case 'astro': r('#e8e6df', bx - 7, by - 4, 15, 15); d('#fff', bx - 5, by - 4, 9, 1); d('#b6b4ac', bx - 7, by + 8, 15, 3); r('#2c3a5e', bx - 2, by, 10, 8); d('#7fd0ff', bx - 1, by + 1, 3, 2); d('#fff', bx, by + 1, 1, 1); break;
    }
    const co = costume();
    if (ar < 1 && co && co.tete) co.tete(P, st, bx, by, V.a, ly);
    if (ar >= 1) {
      r('#8f97a6', bx - 5, by - 3, 11, 6); r('#8f97a6', bx - 5, by + 2, 3, 5);
      d('#c6ccd8', bx - 2, by - 3, 6, 1); d('#6a7180', bx - 5, by + 2, 11, 1); d('#ffd54a', bx, by - 1, 2, 2);
    }
    if (st.masque) {
      r('#23242e', bx, by + 2, 7, 4); d('#7fe0ff', bx + 1, by + 3, 5, 2); d('#fff', bx + 2, by + 3, 1, 1);
      r('#f0c93a', bx - 5, by + 3, 5, 1); r('#f0c93a', bx - 7, by - 5, 2, 9); d('#ff6b4a', bx - 7, by - 5, 2, 2);
    }
    // la lampe frontale : un bandeau, et le phare sur le front
    if (st.frontale && !st.masque) {
      const lx = V.a === 1 ? 4 : V.a === .66 ? 3 : V.a === .33 ? 1 : -2;
      r('#2c2a38', bx - 5, by + 1, 11, 2);
      r('#c6ccd8', bx + lx, by, 4, 3);
      d('#fff8d8', bx + lx + (V.a === 0 ? 1 : 2), by + 1, 2, 2);
    }
    return [bx, by];
  }

  /* La camera Super 8 : poignee pistolet, corps creme strie, zoom a bagues, cartouche noire, viseur. */
  const cam = (function () {
    const cn = G.mk(26, 18), x = cn.x;
    let ps = 0;
    const r2 = (col, a, b, w, h) => { if (ps === 0) { x.fillStyle = K; x.fillRect(a - 1, b - 1, w + 2, h + 2); } else { x.fillStyle = col; x.fillRect(a, b, w, h); } };
    const d2 = (col, a, b, w, h) => { if (ps === 1) { x.fillStyle = col; x.fillRect(a, b, w, h); } };
    for (ps = 0; ps < 2; ps++) {
      r2('#6a4a2a', 6, 10, 4, 6); d2('#4a321c', 6, 10, 1, 6); d2('#8a6a42', 9, 11, 1, 4);
      r2('#e8dfc4', 3, 2, 10, 8); d2('#c2b794', 3, 8, 10, 2); d2('#fff6da', 4, 2, 7, 1);
      for (let i = 0; i < 3; i++) d2('#c2b794', 5 + i * 2, 4, 1, 3);
      r2('#2c2e3a', 4, 0, 7, 2); d2('#4a4c5a', 5, 0, 5, 1);
      r2('#3f414f', 13, 3, 3, 6); d2('#6a6c7c', 13, 3, 3, 1); d2('#23242e', 14, 3, 1, 6);
      r2('#23242e', 16, 2, 2, 8); d2('#7fd0ff', 17, 3, 1, 6); d2('#fff', 17, 3, 1, 2);
      r2('#23242e', 0, 3, 3, 3); d2('#4a4c5a', 1, 3, 2, 1);
    }
    return cn;
  })();

  // le bazooka : il range sa camera et sort ca
  const baz = (function () {
    const cn = G.mk(38, 14), x = cn.x;
    let ps = 0;
    const r2 = (col, a, b, w, h) => { if (ps === 0) { x.fillStyle = K; x.fillRect(a - 1, b - 1, w + 2, h + 2); } else { x.fillStyle = col; x.fillRect(a, b, w, h); } };
    const d2 = (col, a, b, w, h) => { if (ps === 1) { x.fillStyle = col; x.fillRect(a, b, w, h); } };
    for (ps = 0; ps < 2; ps++) {
      r2('#5a6a3a', 3, 4, 30, 6); d2('#8a9a5a', 3, 4, 30, 2); d2('#3f4c28', 3, 8, 30, 2);
      r2('#3f4c28', 0, 2, 4, 10); d2('#6a7a48', 0, 2, 4, 2);
      r2('#2c3420', 32, 3, 5, 8); d2('#4a5636', 32, 3, 5, 2); d2('#d63a2a', 35, 5, 2, 4);
      r2('#23242e', 14, 1, 6, 3); d2('#7fd0ff', 18, 2, 2, 1);
      r2('#6a4a2a', 10, 10, 4, 3); r2('#6a4a2a', 20, 10, 3, 3);
      d2('#ffd23c', 7, 4, 2, 6); d2('#ffd23c', 26, 4, 2, 6);
    }
    return cn;
  })();

  // la meme camera vue de face : l'objectif nous regarde
  const camFace = (function () {
    const cn = G.mk(18, 16), x = cn.x;
    let ps = 0;
    const r2 = (col, a, b, w, h) => { if (ps === 0) { x.fillStyle = K; x.fillRect(a - 1, b - 1, w + 2, h + 2); } else { x.fillStyle = col; x.fillRect(a, b, w, h); } };
    const d2 = (col, a, b, w, h) => { if (ps === 1) { x.fillStyle = col; x.fillRect(a, b, w, h); } };
    for (ps = 0; ps < 2; ps++) {
      r2('#2c2e3a', 5, 1, 7, 2);
      r2('#e8dfc4', 3, 3, 11, 8); d2('#c2b794', 3, 9, 11, 2); d2('#fff6da', 4, 3, 9, 1);
      r2('#23242e', 5, 4, 7, 7); d2('#3f414f', 6, 5, 5, 5); d2('#7fd0ff', 7, 6, 3, 3); d2('#fff', 7, 6, 1, 1);
      r2('#6a4a2a', 7, 11, 3, 4); d2('#8a6a42', 9, 12, 1, 2);
    }
    return cn;
  })();
  function camera(P, st, hb, ar) {
    const V = vue(st.faceB), a = V.a;
    const lean = st.lean * 2 * a;
    c.save();
    // tout le geste est pose de l'autre cote au pixel pres, sans rien etirer
    if (V.m < 0) { c.translate(A.x * 2, 0); c.scale(-1, 1); }
    const sx = A.x + 3 * a + lean, sy = A.y + hb + 3;
    const ang = st.ang * (a === 1 ? 1 : a === .66 ? .6 : .2);
    const lb = a === 1 ? 11 : a === .66 ? 9.5 : a === .33 ? 8 : 6.5;
    // la main decrit un arc autour du corps : elle passe devant lui, elle ne glisse pas a plat
    const hxp = sx + Math.cos(ang) * lb * Math.max(a, .08), hyp = sy + Math.sin(ang) * lb + (1 - a) * 4;
    const trait = (col, x0, y0, x1, y1, w) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
      c.fillStyle = col;
      for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n - w / 2), Math.round(y0 + (y1 - y0) * i / n - w / 2), w, w);
    };
    const [ex, ey] = ik(sx, sy, hxp, hyp, 6.2, 1);
    if (a === 1) {
      trait(K, sx, sy, ex, ey, 5); trait(K, ex, ey, hxp, hyp, 5);
      // manches : la couleur du poignet de chemise d'un personnage en veste (la star) ; sinon l'avant-bras nu
      const man = actif().manches;
      trait(P.t, sx, sy, ex, ey, 3); trait(man ? P.t : P.s, ex, ey, hxp, hyp, 3);
      trait(P.t2, sx, sy - 1, ex, ey - 1, 1); trait(man ? P.t2 : P.s2, ex, ey - 1, hxp, hyp - 1, 1);
      if (man) { const mx = Math.round(ex + (hxp - ex) * .8), my = Math.round(ey + (hyp - ey) * .8); c.fillStyle = man; c.fillRect(mx - 1, my - 1, 2, 3); }
      c.translate(Math.round(hxp), Math.round(hyp));
      c.rotate(Math.round(ang / .17) * .17);
      if (st.bazooka > 0) c.drawImage(baz, -13, -9);
      else c.drawImage(cam, -8, -12);
      if (!(st.bazooka > 0) && st.rec && (st.t * 2.5 | 0) % 2) { c.fillStyle = '#ff2d2d'; c.fillRect(-8 + 10, -12 + 3, 2, 2); }
      c.fillStyle = K; c.fillRect(-3, -2, 5, 4); c.fillStyle = P.s; c.fillRect(-2, -2, 3, 3); c.fillStyle = P.s1; c.fillRect(-2, 0, 3, 1);
      if (ar >= 5) { c.fillStyle = K; c.fillRect(15, -16, 4, 22); c.fillStyle = '#c6ccd8'; c.fillRect(16, -15, 2, 20); c.fillStyle = '#ffd54a'; c.fillRect(16, -7, 2, 4); }
    } else {
      // les deux bras tiennent la camera devant lui
      const cx = Math.round(hxp), cy = Math.round(hyp);
      for (const dx of [-7, 7]) { const ex2 = sx + dx; trait(K, ex2, sy, cx + dx * .6, cy + 2, 5); trait(P.t, ex2, sy, cx + dx * .6, cy + 2, 3); }
      if (a === .66) {
        // de trois-quarts, l'objectif pointe en biais : un corps plus court, une lentille qui se montre
        c.drawImage(cam, 0, 0, 16, 18, cx - 7, cy - 12, 12, 18);
        c.drawImage(cam, 16, 0, 10, 18, cx + 5, cy - 12, 5, 18);
      } else c.drawImage(camFace, cx - 9 + (a === .33 ? 3 : 0), cy - 12);
      c.fillStyle = K; for (const dx of [-6, 5]) c.fillRect(cx + dx - 1, cy, 4, 4);
      c.fillStyle = P.s; for (const dx of [-6, 5]) c.fillRect(cx + dx, cy, 2, 3);
    }
    c.restore();
  }

  /* Compose le personnage sur sa vignette : le drone d'un cote, le corps de l'autre, pour qu'il puisse se retourner dessus */
  function composer(st) {
    if (!buf) { buf = G.mk(L, L); bufD = G.mk(L, L); bufC = G.mk(L, L); }
    const P = pal(), ar = st.armure || 0;
    CONT = st.nuit ? '#7a8cc0' : K;
    let hb = 0, hanche = 0;
    MIR = 1;
    if (st.faceP === undefined) st.faceP = st.faceB = st.faceH = st.faceK === undefined ? 1 : st.faceK;
    c = bufD.x; c.clearRect(0, 0, L, L);
    for (pass = 0; pass < 2; pass++) drone(P, st, ar);
    helices(st);
    c = bufC.x; c.clearRect(0, 0, L, L);
    const co = costume(), VB = vue(st.faceB);
    // la statuette d'or : seulement de profil (de face, ses deux mains tiennent la camera), jamais dans une case du hangar
    const phO = VB.a === 1 && st.seul !== 'drone' ? oscarPhase(st) : -1, geste = phO >= 0 ? oscarGeste(phO) : null;
    for (pass = 0; pass < 2; pass++) {
      // ce qui est dans son dos (cape, queue, ailes) passe derriere lui
      if (co && co.dos) { MIR = VB.m; const h0 = -28 + st.flex * 5 - st.air * 2; co.dos(P, st, VB.a, h0, h0 - 12, st.lean * 2 * VB.a); }
      hanche = jambes(P, st, ar);
      hb = buste(P, st, hanche, ar);
      // le bras libre passe derriere la tete : dessine avant elle
      if (geste) brasOscar(P, st, hb, geste);
      // en montant, la statuette passe derriere sa tete ; une fois au-dessus, elle est dessinee par-dessus tout
      if (geste && geste.statuette && geste.u < .85 && pass === 1) dessinerStatuette(P, st, hb, geste);
      tete(P, st, hb, ar);
    }
    MIR = 1;
    camera(P, st, hb, ar);
    if (geste && geste.statuette && geste.u >= .85) dessinerStatuette(P, st, hb, geste);
    // un personnage d'exception brille : son aura se calcule sur son dessin (la star, speciaux.js)
    if (co && co.aura) aura(st);
    // le hangar montre ce qu'il vend, et seulement cela (Max, 07/11/2026) : le cadreur seul, ou le drone seul
    if (st.seul === 'perso') return bufC;
    if (st.seul === 'drone') return bufD;
    const X = buf.x;
    X.clearRect(0, 0, L, L);
    X.drawImage(bufD, 0, 0);
    X.drawImage(bufC, 0, 0);
    return buf;
  }

  /* L'aura (Max, 08/11/2026 : « il doit briller ; trouve le moyen de faire comme s'il avait une aura animee autour de lui pour
     signifier le cote exceptionnel du personnage »). Elle se calcule a chaque image sur le dessin du personnage (bufC), au pixel :
     la distance de chaque pixel vide a son dessin donne un liseré d'or (1), une lueur qui frissonne (2), une trame qui monte (3), et
     au-dessus de la tete et des epaules des flammes qui dansent ; puis des paillettes s'elevent autour de lui. Rien sous ses semelles :
     le drone reste net. Dessinee derriere lui (destination-over), elle suit chaque pose, chaque vue et le miroir. */
  let bufA = null, imA = null, distA = null, hautA = null;
  function aura(st) {
    const w = L, h = L, q = bufC.x, s = q.getImageData(0, 0, w, h).data, n = w * h;
    if (!bufA) { bufA = G.mk(w, h); imA = bufA.x.createImageData(w, h); distA = new Uint8Array(n); hautA = new Int16Array(w); }
    const di = distA, o = imA.data, T = st.t || 0, pied = A.y - 12;
    for (let i = 0; i < n; i++) di[i] = s[i * 4 + 3] ? 0 : 9;
    // la distance au dessin (8 voisins), en deux passes
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let v = di[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, di[i - 1] + 1);
      if (y > 0) { v = Math.min(v, di[i - w] + 1); if (x > 0) v = Math.min(v, di[i - w - 1] + 1); if (x < w - 1) v = Math.min(v, di[i - w + 1] + 1); }
      di[i] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; let v = di[i]; if (!v) continue;
      if (x < w - 1) v = Math.min(v, di[i + 1] + 1);
      if (y < h - 1) { v = Math.min(v, di[i + w] + 1); if (x < w - 1) v = Math.min(v, di[i + w + 1] + 1); if (x > 0) v = Math.min(v, di[i + w - 1] + 1); }
      di[i] = v;
    }
    // le haut du dessin, colonne par colonne : les flammes partent de la
    for (let x = 0; x < w; x++) { hautA[x] = -1; for (let y = 0; y < pied; y++) if (s[(y * w + x) * 4 + 3]) { hautA[x] = y; break; } }
    o.fill(0);
    const met = (i, r, g, b, a) => { if (a <= 0) return; const k = i * 4; o[k] = r; o[k + 1] = g; o[k + 2] = b; o[k + 3] = Math.round(Math.min(1, a) * 4) / 4 * 255; };
    for (let y = 0; y < pied; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, v = di[i];
      if (!v || v > 7) continue;
      if (v === 1) met(i, 255, 236, 140, .8 + .2 * Math.sin(T * 6 + x * .5 + y * .3));
      else if (v === 2) met(i, 255, 200, 70, .5 + .25 * Math.sin(T * 7 - y * .6 + x * .2));
      else if (v === 3) met(i, 255, 176, 52, .3 + .15 * Math.sin(T * 5 + x * .4 - y * .5));
      else if (v === 4 && ((x + y + (T * 14 | 0)) & 1)) met(i, 255, 160, 44, .25);
      // les flammes : au-dessus du dessin seulement, chaque colonne a sa hauteur qui danse
      const top = hautA[x];
      if (top >= 0 && y < top && v >= 2) {
        const fh = 3 + Math.round(2.4 + 2.4 * Math.sin(x * 1.1 + T * 9) * Math.sin(x * .43 - T * 4)), dy = top - y;
        if (dy <= fh && v <= fh) met(i, 255, dy < fh / 2 ? 226 : 186, dy < fh / 2 ? 120 : 60, .75 * (1 - dy / (fh + 1)));
      }
    }
    bufA.x.putImageData(imA, 0, 0);
    q.globalCompositeOperation = 'destination-over'; q.drawImage(bufA, 0, 0); q.globalCompositeOperation = 'source-over';
    // les paillettes : elles montent le long de lui et s'eteignent en haut
    for (let k = 0; k < 7; k++) {
      const ph = (T * .55 + k / 7) % 1, sx = A.x + Math.round(Math.sin(k * 2.4 + T * 1.7) * (11 + (k % 3) * 3)), sy = Math.round(pied - 4 - ph * 46);
      const al = ph < .1 ? ph * 10 : 1 - ph;
      q.fillStyle = `rgba(255,255,255,${al.toFixed(2)})`; q.fillRect(sx, sy, 1, 1);
      if (k % 2 && ph > .2 && ph < .75) { q.fillStyle = `rgba(255,226,122,${(al * .8).toFixed(2)})`; q.fillRect(sx - 1, sy, 1, 1); q.fillRect(sx + 1, sy, 1, 1); q.fillRect(sx, sy - 1, 1, 1); q.fillRect(sx, sy + 1, 1, 1); }
    }
  }
  // ce que porte le heros d'exceptionnel : l'aura (render.js l'eclaire), la trainee arc-en-ciel (render.js la tire dans le ciel)
  G.heroAura = () => { const co = costume(); return !!(co && co.aura); };

  /* La statuette d'or (Max, 08/11/2026 : « le personnage (peu importe le costume choisi) sort son Oscar regulierement de sa chemise
     pour le montrer avec une main, avant de le recacher. Il faut une animation de scintillement sur l'Oscar quand il est brandi »).
     Gagnee au bout de la jauge de l'Oscar (300 000 xp, game.js). Toutes les 9,5 s, et a chaque explosion de son bonus : la main
     libre va a la poitrine, dans le gilet (0,3 s), en sort la statuette et la leve au-dessus de sa tete (0,45 s), la tient en l'air
     1,3 s pendant qu'elle scintille (un reflet la parcourt de bas en haut, des etoiles s'allument autour, un eclat sur la tete),
     puis la redescend et la rentre. Le bras passe derriere la tete ; la statuette et les doigts sont par-dessus tout. Elle est
     dessinee au pixel par le code, a chaque taille (statuette(h)) : celle du cadreur fait 17 pixels, celle des menus 30. */
  const OSC_DUREE = 2.6, OSC_PERIODE = 9.5, OSC_DECALE = 3;
  function oscarPhase(st) {
    if (!st || !st.oscarOn || st.mort || st.bazooka > 0) return -1;
    const d = st.t - (st.oscarDebut === undefined ? -99 : st.oscarDebut);
    if (d >= 0 && d < OSC_DUREE) return d;
    const q = (st.t + OSC_DECALE) % OSC_PERIODE;
    return q < OSC_DUREE ? q : -1;
  }
  G.heroOscarPhase = oscarPhase;
  const lisse = q => q * q * (3 - 2 * q);
  function oscarGeste(ph) {
    if (ph < .3) return { u: 0, statuette: false };
    if (ph < .75) return { u: lisse((ph - .3) / .45), statuette: true };
    if (ph < 2.05) return { u: 1, statuette: true, brille: ph - .75 };
    if (ph < 2.45) return { u: 1 - lisse((ph - 2.05) / .4), statuette: true };
    return { u: 0, statuette: false };
  }
  // la main : de la poitrine (dans le gilet), elle passe derriere sa tete et monte a bout de bras, en arriere et en haut, la ou
  // ni la tete ni la camera ne cachent le bras (de face, sur la tete, on aurait cru la statuette posee sur son crane) ;
  // elle bat la mesure en la tenant
  function mainOscar(st, hb, g) {
    const bx = st.lean * 2, C = [bx + 5, hb + 6], H = [bx - 8, hb - 15];
    const b = g.brille !== undefined && Math.sin(st.t * 5) > .3 ? -1 : 0;
    return [Math.round(C[0] + (H[0] - C[0]) * g.u), Math.round(C[1] + (H[1] - C[1]) * g.u) + b];
  }
  // le bras libre, du cote de l'ombre : un ton plus sombre que le buste, il s'en detache
  function brasOscar(P, st, hb, g) {
    MIR = vue(st.faceB).m;
    const sx = st.lean * 2 + 1, sy = hb + 2, [hx, hy] = mainOscar(st, hb, g), man = actif().manches;
    // le coude part en arriere, comme un bras qu'on leve derriere soi
    const [ex, ey] = ik(sx, sy, hx, hy, 10, -1);
    seg(P.t1, sx, sy, ex, ey, 3);
    seg(man ? P.t1 : P.s1, ex, ey, hx, hy, 3);
    r(P.s1, hx - 1, hy - 1, 3, 3);
  }
  // la statuette, pixel par pixel : un profil (tete ronde, cou, epaules, corps qui s'affine, pieds, socle), l'or eclaire a gauche
  const statuettes = new Map();
  function statuette(h, sil) {
    const cle = h + (sil ? 's' : '');
    let cn = statuettes.get(cle);
    if (cn) return cn;
    const wm = Math.max(7, Math.round(h * .52) | 1), cx = (wm - 1) / 2;
    // tete ronde, cou fin, epaules larges, corps et jambes qui s'affinent, pieds, puis un socle large (la bobine)
    const demi = y => {
      const f = (y + .5) / h;
      if (f < .2) { const q = (f - .1) / .1; return Math.sqrt(Math.max(0, 1 - q * q)) * .1 * h * 1.1; }
      if (f < .24) return .035 * h;
      if (f < .4) return (.19 - (f - .24) * .25) * h;
      if (f < .78) return (.13 - (f - .4) * .15) * h;
      if (f < .83) return .1 * h;
      return .25 * h;
    };
    const OR = ['#fff3b4', '#ffd64c', '#e2a12c', '#a8661a'];
    cn = G.mk(wm + 2, h + 2);
    const q = cn.x, masque = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < wm; i++) if (Math.abs(i - cx) <= demi(j) + .05) masque.push([i, j, (i - cx) / Math.max(1, demi(j))]);
    const dedans = new Set(masque.map(([i, j]) => i + ',' + j));
    q.fillStyle = sil ? '#c8d4f0' : K;
    for (const [i, j] of masque) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!dedans.has((i + a) + ',' + (j + b))) q.fillRect(i + a + 1, j + b + 1, 1, 1);
    for (const [i, j, u] of masque) {
      const f = (j + .5) / h;
      let col;
      if (sil) col = '#22304e';
      else if (f >= .83) col = f < .83 + 1 / h ? '#ffd64c' : u < -.55 ? '#6e6680' : '#2c2733';
      else col = OR[u < -.5 ? 0 : u < 0 ? 1 : u < .5 ? 2 : 3];
      // l'epee tenue devant lui (des 20 pixels) : un trait plus sombre au milieu du corps
      if (!sil && h >= 20 && f > .28 && f < .7 && Math.abs(i - cx) < .5) col = '#c47e1e';
      q.fillStyle = col; q.fillRect(i + 1, j + 1, 1, 1);
    }
    cn.masque = masque; cn.wm = wm; cn.hm = h;
    statuettes.set(cle, cn);
    return cn;
  }
  G.statuette = statuette;
  function dessinerStatuette(P, st, hb, g) {
    const m = vue(st.faceB).m, [hx, hy] = mainOscar(st, hb, g), S = statuette(17), h = S.hm, cx = (S.wm - 1) / 2;
    const X = A.x + (m < 0 ? -hx - 1 : hx), Y = A.y + hy, x0 = X - cx - 1, y0 = Y - h;
    c.drawImage(S, x0, y0);
    if (g.brille !== undefined) {
      const bt = g.brille;
      // un reflet blanc qui la parcourt de bas en haut
      const pr = Math.round((1 - (bt % .9) / .9) * (h + 4)) - 2;
      c.fillStyle = '#ffffff';
      for (const [i, j, u] of S.masque) if ((j === pr || j === pr + 1) && u < .4 && (j + .5) / h < .83) c.fillRect(x0 + 1 + i, y0 + 1 + j, 1, 1);
      // des etoiles qui s'allument autour, et un eclat sur la tete
      const ET = [[-5, 1], [6, 4], [-5, 9], [6, 12]];
      ET.forEach(([ex, ey], k) => {
        const s = Math.sin(bt * 8 + k * 2.1);
        if (s < .2) return;
        const n = s > .75 ? 2 : 1, px = X + ex, py = y0 + ey;
        c.fillStyle = '#ffe27a'; c.fillRect(px - n, py, n * 2 + 1, 1); c.fillRect(px, py - n, 1, n * 2 + 1);
        c.fillStyle = '#ffffff'; c.fillRect(px, py, 1, 1);
      });
      if ((bt * 5 | 0) % 2) { c.fillStyle = '#ffffff'; c.fillRect(X, y0, 1, 1); c.fillRect(X - 1, y0 + 1, 1, 1); }
    }
    // les doigts serrent le socle
    c.fillStyle = K; c.fillRect(X - 2, Y - 2, 5, 4);
    c.fillStyle = P.s; c.fillRect(X - 1, Y - 1, 3, 2);
    c.fillStyle = P.s1; c.fillRect(X - 1, Y, 3, 1);
  }
  G.heroArc = () => { const m = modele(); return !!(DRO[m] && DRO[m].arc); };

  /* Ou est le front, en unites de jeu, par rapport au drone ; et ou regarde la lampe */
  G.heroFront = st => {
    const S = G.S, k = st.faceH === undefined ? 1 : st.faceH, V = vue(k);
    const hanche = -28 + st.flex * 5 - st.air * 2, by = hanche - 12 - 11;
    const nx = (st.lean * 3 * V.a + (V.a === 1 ? 7 : V.a === .66 ? 5 : V.a === .33 ? 3 : 0)) * V.m;
    const sens = V.m;
    return { dx: nx / S, dy: (by + 1) / S, ang: sens > 0 ? st.ang : Math.PI - st.ang };
  };

  /* La chute : d'abord le drone et son cadreur ensemble, puis chacun de son cote apres le choc */
  G.heroMort = (x, st, M) => {
    composer(st);
    const S = G.S, w = L / S;
    if (M.lie) {
      x.save(); x.translate(M.h.x, M.h.y); x.rotate(M.h.r);
      x.drawImage(buf, -A.x / S, -(A.y - 20) / S, w, w);
      x.restore();
      return;
    }
    x.save(); x.translate(M.d.x, M.d.y); x.rotate(M.d.r);
    x.drawImage(bufD, -A.x / S, -(A.y + 2) / S, w, w);
    x.restore();
    x.save(); x.translate(M.h.x, M.h.y); x.rotate(M.h.r);
    x.drawImage(bufC, -A.x / S, -(A.y - 30) / S, w, w);
    x.restore();
  };

  /* Dessine le heros sur l'ecran (coordonnees de jeu). X, Y : centre du drone. */
  G.heroDessiner = (x, st, X, Y) => {
    const v = composer(st);
    const S = G.S;
    x.save();
    x.translate(X, Y - 4);
    x.rotate(st.tilt);
    x.drawImage(v, -A.x / S, -A.y / S + 4, L / S, L / S);
    x.restore();
  };
  /* Pour les ecrans fixes (Personnage, icone) */
  G.heroVignette = st => composer(Object.assign(G.heroState(), st));
  /* Une vignette figee d'un personnage ou d'un drone precis (galerie des gains) */
  G.heroEssai = (st, heros, mod) => {
    const h0 = G.sav.heros, m0 = G.sav.modele, t0 = G.toutVoir;
    if (heros) G.sav.heros = heros; if (mod) G.sav.modele = mod;
    G.toutVoir = true; palette = null;
    let v;
    try { v = composer(Object.assign(G.heroState(), st)); }
    finally { G.sav.heros = h0; G.sav.modele = m0; G.toutVoir = t0; palette = null; }
    return v;
  };
  G.HERO_A = A; G.HERO_L = L;
  /* Les pinceaux du heros, pour deguisements.js : r (avec contour), d (couleur seule), seg, le moteur, et l'etat du dessin */
  G.HeroPinceau = { r: (...a) => r(...a), d: (...a) => d(...a), seg: (...a) => seg(...a), moteur: mx => moteur(mx), vue, K, A, passe: () => pass, ctx: () => c, mir: () => MIR };

  G.heroState = () => ({
    faceC: 1, faceK: 1, faceH: 1, faceB: 1, faceP: 1, tourne: 0, t: 0, rot: 0, flex: .2, air: 0, lean: 0, tilt: 0, sac: 0, sacV: 0, meche: 0, cligne: 0, cligneT: 2,
    leg: 0, look: 'avant', mood: 'neutre', ang: -0.15, angC: -0.15, rec: true, masque: false, armure: 0, moodT: 0,
  });
  /* Le corps suit le mouvement avec un peu de retard : c'est ca, l'impression de poids */
  G.heroMaj = (st, dt, hold, vy) => {
    st.t += dt;
    // la statuette d'or, gagnee a 300 000 xp : il la sort de temps en temps (oscarPhase)
    st.oscarOn = !!(G.Jeu && G.Jeu.final && G.Jeu.final());
    if (!st.mort) st.rot += dt * (hold ? 34 : 24);
    // le tour se fait du haut vers le bas : la tete part, les epaules suivent, les pieds finissent
    const vers = (q, vit) => q + G.clamp(st.faceC - q, -dt * vit, dt * vit);
    st.faceH = vers(st.faceH, 7.5);
    if (Math.abs(st.faceH - st.faceC) < 1.5) st.faceB = vers(st.faceB, 5.5);
    if (Math.abs(st.faceB - st.faceC) < 1.2) st.faceP = vers(st.faceP, 4.6);
    st.faceK = st.faceB;
    st.tourne = Math.min(1, Math.abs(st.faceP - st.faceC) * 1.5);
    const cFlex = hold ? .85 : vy > 120 ? 0 : .28;
    st.flex += (cFlex - st.flex) * Math.min(1, dt * 11);
    const cAir = vy > 140 ? Math.min(1, (vy - 140) / 90) : 0;
    st.air += (cAir - st.air) * Math.min(1, dt * 9);
    const cTilt = G.clamp(vy * .0011, -.2, .22) + (hold ? -.07 : .03);
    st.tilt += (cTilt - st.tilt) * Math.min(1, dt * 7);
    const cLean = G.clamp(-vy * .004, -1, 1) + Math.sin(st.t * 2.1) * .12;
    st.lean += (cLean - st.lean) * Math.min(1, dt * 6);
    // le sac est un petit pendule
    const a = (-st.tilt * 34 - st.sac * 90 - st.sacV * 9);
    st.sacV += a * dt; st.sac += st.sacV * dt;
    st.sac = G.clamp(st.sac, -1.2, 1.2);
    st.meche = Math.round(G.clamp(1 + Math.sin(st.t * 15) * .7 + vy * .004, 0, 3));
    st.cligneT -= dt;
    if (st.cligneT <= 0) { st.cligne = .13; st.cligneT = G.rnd(1.6, 4.5); }
    if (st.cligne > 0) st.cligne -= dt;
  };
  /* Il regarde ce qu'il filme ; si la chose passe derriere lui, il se retourne sur son drone pour la garder dans le cadre */
  G.heroViser = (st, cible, dt) => {
    let a = -0.12;
    if (cible) {
      if (cible.dx < -14) st.faceC = -1; else if (cible.dx > 14) st.faceC = 1;
      a = G.clamp(Math.atan2(cible.dy, Math.max(Math.abs(cible.dx), 14)), -1.35, 1.2);
    } else st.faceC = 1;
    st.angC += (a - st.angC) * Math.min(1, dt * 8);
    st.ang = st.angC;
    st.look = st.ang < -0.5 ? 'haut' : st.ang > 0.45 ? 'bas' : 'avant';
  };
})();
