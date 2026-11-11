/* Les ecrans et la boucle principale. */
'use strict';
(function () {
  const U = G.UI = { ecran: 'charge' };
  const { clamp } = G;
  const J = G.Jeu, D = G.Decor;
  const K = '#17151f';
  let cv, x, boutons = [], scroll = 0, dragY = null, dragX = null, dragS = 0, vueDecor = null, fin = null, tapMoved = false;
  // l'elan de la liste des decors (Max, 04/11/2026 : « si on envoie d'un coup, que ca fasse defiler ») : la vitesse du doigt au
  // moment ou il quitte l'ecran, freinee peu a peu ; un appui pendant la glissade l'arrete sans ouvrir de decor
  let elan = 0, traces = [];
  U.defilement = () => ({ scroll, elan });

  /* La largeur du jeu suit le format de l'ecran, de 360 (16:10) a 560 unites (2,6:1), la hauteur reste 216. Hors de ces
     formats (Max, 09/11/2026 : « verifie que le jeu va s'adapter a tout type de smartphone ») : tablettes 4:3 et 16:10, ecran
     interieur des pliants, couverture tres allongee d'un pliant, l'image etait etiree pour remplir l'ecran (pixels 28 % plus etroits
     que hauts sur un Fold ouvert). Elle garde maintenant des pixels carres et se centre entre deux bandes noires
     (tests/ecrans_telephones.js). */
  function adapte() {
    const w = window.innerWidth, h = window.innerHeight;
    const asp = Math.max(w, h) / Math.min(w, h);
    G.VW = clamp(Math.round(G.VH * asp), 360, 560);
    const nw = Math.round(G.VW * G.S), nh = Math.round(G.VH * G.S);
    if (cv.width !== nw || cv.height !== nh) { cv.width = nw; cv.height = nh; G.ecran(x); x.imageSmoothingEnabled = false; }
    const s = cv.style;
    if (w > h && Math.abs(G.VW / G.VH - asp) > .01) {
      const k = Math.min(w / G.VW, h / G.VH), cw = Math.round(G.VW * k), ch = Math.round(G.VH * k);
      s.width = cw + 'px'; s.height = ch + 'px'; s.left = Math.round((w - cw) / 2) + 'px'; s.top = Math.round((h - ch) / 2) + 'px';
      s.right = s.bottom = 'auto';
    } else s.width = s.height = s.left = s.top = s.right = s.bottom = '';
    // les encoches de l'ecran (pixels de l'ecran, donnes par la coque) en unites de jeu, la ou la toile est vraiment
    const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    G.ENC = encPx.map(e => [(e[0] / d - r.left) * G.VW / r.width, (e[1] / d - r.top) * G.VH / r.height,
      (e[2] / d - r.left) * G.VW / r.width, (e[3] / d - r.top) * G.VH / r.height])
      // une bande qui longe tout un bord (ecran incurve) ne cache rien : on ne s'en ecarte pas
      .filter(e => e[2] > 0 && e[0] < G.VW && e[3] > 0 && e[1] < G.VH && e[2] - e[0] < G.VW * .6 && e[3] - e[1] < G.VH * .6);
  }
  /* Les encoches et trous de camera, tels qu'Android les donne a la coque (MainActivity, a chaque changement : rotation...) */
  let encPx = [];
  U.encoches = () => {
    try { encPx = window.AndroidBridge && AndroidBridge.encoches ? JSON.parse(AndroidBridge.encoches()) || [] : []; } catch (e) { encPx = []; }
    if (cv) adapte();
  };

  function bouton(px, py, w, h, label, cb, o = {}) {
    boutons.push({ px, py, w, h, cb });
    const c = o.c || '#2b2d3c', ct = o.t || '#fff';
    x.fillStyle = K; x.fillRect(px - 1, py, w + 2, h); x.fillRect(px, py - 1, w, h + 2);
    x.fillStyle = c; x.fillRect(px, py, w, h);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(px, py, w, 1);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px, py + h - 1, w, 1);
    if (label) G.txt(x, label, px + w / 2, py + h / 2 - (o.sc === 2 ? 7 : 3), ct, { al: .5, sc: o.sc || 1 });
  }
  /* ---- Icones : pas de mot quand un dessin suffit ---- */
  const ICO = {
    partager: ['.....##.....', '....####....', '...######...', '..##.##.##..', '.....##.....', '.....##.....', '.##..##..##.', '.##..##..##.', '.##......##.', '.##......##.', '.##########.', '.##########.'],
    jouer: ['..#.........', '..###.......', '..#####.....', '..#######...', '..#########.', '..##########', '..##########', '..#########.', '..#######...', '..#####.....', '..###.......', '..#.........'],
    retour: ['.....##.....', '....###.....', '...###......', '..###.......', '.##########.', '###########.', '###########.', '.##########.', '..###.......', '...###......', '....###.....', '.....##.....'],
    galerie: ['############', '#..........#', '#.##.......#', '#.##.......#', '#.......#..#', '#......###.#', '#..#..#####.', '#.###.######', '#.##########', '#..........#', '############', '............'],
    hangar: ['.##......##.', '####....####', '.##......##.', '..#......#..', '..########..', '.##########.', '.##########.', '..########..', '...#....#...', '..##....##..', '.###....###.', '............'],
    atelier: ['.......###..', '.....##.....', '.....#...#..', '.....#..##..', '....#####...', '...#####....', '..#####.....', '.#####......', '#####.......', '####........', '.##.........', '............'],
    carnet: ['#.##.##.##.#', '##.##.##.###', '############', '............', '############', '#..........#', '#.########.#', '#..........#', '#.#####....#', '#..........#', '############', '............'],
    carriere: ['.....##.....', '.....##.....', '....####....', '....####....', '############', '.##########.', '..########..', '...######...', '...######...', '..###..###..', '..##....##..', '.##......##.'],
    reglages: ['.....##.....', '.##..##..##.', '.##########.', '..###..###..', '..##....##..', '####....####', '####....####', '..##....##..', '..###..###..', '.##########.', '.##..##..##.', '.....##.....'],
    son: ['.....#......', '....##...#..', '...###....#.', '#######.#..#', '#######..#.#', '#######..#.#', '#######..#.#', '#######.#..#', '...###....#.', '....##...#..', '.....#......', '............'],
    musique: ['....#######.', '....#######.', '....#.....#.', '....#.....#.', '....#.....#.', '....#.....#.', '....#.....#.', '.####..####.', '#####.#####.', '#####.#####.', '.###...###..', '............'],
    vibre: ['...######...', '...#....#...', '#..#....#..#', '.#.#....#.#.', '#..#....#..#', '.#.#....#.#.', '#..#....#..#', '.#.#....#.#.', '#..#....#..#', '...#.##.#...', '...######...', '............'],
    film: ['############', '#.##.##.##.#', '############', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '############', '#.##.##.##.#', '############', '............'],
    quitter: ['##........##', '###......###', '.###....###.', '..###..###..', '...######...', '....####....', '....####....', '...######...', '..###..###..', '.###....###.', '###......###', '##........##'],
    verrou: ['............', '....####....', '...##..##...', '...#....#...', '...#....#...', '..########..', '..########..', '..###..###..', '..###..###..', '..########..', '..########..', '............'],
    tete: ['....####....', '...######...', '...######...', '...######...', '....####....', '.....##.....', '..########..', '.##########.', '.##########.', '.##########.', '.##########.', '............'],
    valider: ['............', '..........##', '.........###', '........###.', '.......###..', '......###...', '##...###....', '###.###.....', '.#####......', '..###.......', '...#........', '............'],
    classement: ['.....##.....', '....####....', '.....##.....', '............', '....####....', '....####....', '....####....', '###.####....', '###.####.###', '###.####.###', '###.####.###', '............'],
    visage: ['...######...', '..########..', '.##......##.', '.#.##..##.#.', '.#........#.', '.#...##...#.', '.#........#.', '.#..####..#.', '.##......##.', '..########..', '...######...', '............'],
  };
  const icoCache = new Map();
  function dessinIcone(nom, col) {
    const k = nom + col;
    let c = icoCache.get(k);
    if (c) return c;
    const m = ICO[nom];
    c = G.mk(24, 24);
    c.x.fillStyle = col;
    m.forEach((l, j) => { for (let i = 0; i < l.length; i++) if (l[i] === '#') c.x.fillRect(i * 2, j * 2, 2, 2); });
    icoCache.set(k, c);
    return c;
  }
  /* Bouton a icone. nom sert aussi aux tests pour le retrouver */
  function ic(px, py, w, h, nom, cb, o = {}) {
    bouton(px, py, w, h, '', cb, o);
    boutons[boutons.length - 1].nom = o.nom || nom;
    const im = dessinIcone(nom, o.t || '#f4f0e0');
    x.drawImage(im, px + (w - 14.4) / 2, py + (h - 14.4) / 2);
  }
  // le bouton retour, en haut a droite (a gauche d'un trou de camera qui serait dans le coin)
  const retourX = () => G.libre(G.VW - 32, 3, 28, 20, -1);
  const retour = cb => ic(retourX(), 3, 28, 20, 'retour', cb || (() => { U.ecran = 'accueil'; }));
  U.pos = nom => { const b = boutons.find(q => q.nom === nom); return b ? [b.px + b.w / 2, b.py + b.h / 2] : null; };
  U.rects = () => boutons.map(b => ({ px: b.px, py: b.py, w: b.w, h: b.h, nom: b.nom }));
  U.rect = nom => { const b = boutons.find(q => q.nom === nom); return b ? [b.px, b.py, b.w, b.h] : null; };

  function fondMenu(a = .72) {
    const W = J.w();
    if (W && W.sc && !G.VISITE) { J.maj(G.dt); G.Rendu.scene(x, W, false); voile(a); }
    else { x.fillStyle = '#14131c'; x.fillRect(0, 0, G.VW, G.VH); }
  }
  function voile(a = .6) { x.fillStyle = `rgba(8,8,14,${a})`; x.fillRect(0, 0, G.VW, G.VH); }

  /* Le titre */
  function titre(py) {
    G.txt(x, 'SILENCE,', G.VW / 2, py, '#ffe27a', { al: .5, sc: 3, contour: K });
    G.txt(x, 'ÇA VOLE !', G.VW / 2, py + 24, '#fff', { al: .5, sc: 3, contour: K });
  }

  /* ---- Accueil : le decor d'abord, presque pas de mots ---- */
  function accueil() {
    const W = J.w();
    if (W && W.sc) { J.maj(G.dt); G.Rendu.scene(x, W, false); }
    titre(12);
    const cx = G.VW / 2;
    bouton(cx - 62, 88, 124, 30, 'JOUER', () => U.lancer(), { c: '#c8393b', sc: 2 });
    boutons[boutons.length - 1].nom = 'jouer';
    const l = [['carnet', () => { U.ecran = 'carnet'; scroll = 0; }], ['atelier', () => { U.ecran = 'atelier'; }], ['hangar', () => { U.ecran = 'perso'; page.tete = page.hangar = null; }], ['carriere', () => { U.ecran = 'carriere'; rangVu = null; retourCarriere = null; }]];
    if (G.galerieOuverte()) l.push(['galerie', () => U.ouvrirGalerie()]);
    const bw = 32, gap = 8, x0 = cx - (l.length * bw + (l.length - 1) * gap) / 2;
    const nb = U.bulles();
    l.forEach(([n, cb], i) => {
      ic(x0 + i * (bw + gap), 126, bw, 26, n, () => { U.vu(n); cb(); }, n === 'galerie' ? { c: '#b8862a' } : n === 'classement' ? { c: '#2f6fb5' } : {});
      if (nb[n]) bulle(x0 + i * (bw + gap) + bw, 126, nb[n]);
    });
    const rgx = G.libre(G.VW - 32, 3, 28, 20, -1);
    ic(rgx, 3, 28, 20, 'reglages', () => { U.ecran = 'reglages'; });
    // le classement Google Play Jeux, seulement dans l'appli Android (classement.js) : en haut a droite, colle aux reglages (Max,
    // 07/11/2026 : « trop de boutons [...] mets en haut a droite le bouton de classement general » ; avant, dans la rangee sous JOUER)
    if (G.Classement.dispo()) ic(G.libre(rgx - 32, 3, 28, 20, -1), 3, 28, 20, 'classement', () => { U.vu('classement'); G.Classement.ouvrir(); }, { c: '#2f6fb5' });
    /* En haut, en gros, le record ; dessous, plus petite, la cagnotte (Max, 06/11/2026 au soir). Avant : la cagnotte en gros et le
       record en petit dessous. */
    const rec = Math.floor(G.sav.record || 0) + ' m', rx = G.libre(6, 4, G.txtW('★') * 2 + 5 + G.txtW(rec, 2), 15, 1);
    G.txt(x, '★', rx, 6, '#ffd54a', { contour: K, sc: 2 });
    G.txt(x, rec, rx + G.txtW('★') * 2 + 5, 6, '#fff', { contour: K, sc: 2 });
    cagnotte(6, 23, 1);
    // plus de jauge du prochain cadeau ici (Max, 07/11/2026 : « enleve la jauge completement »), ni sur « COUPEZ ! » (08/11/2026)
    // la main du tuto : elle vient de temps en temps montrer qu'un appui fait monter le drone (main_tuto.js)
    if (G.MainTuto && W) G.MainTuto.maj(x, W, G.dt);
  }
  /* ---- Les bulles de notification : ce qu'on peut acheter, ce qu'on vient de debloquer ---- */
  function bulle(px, py, n) {
    const s = n > 9 ? '9+' : n + '', w = Math.max(9, G.txtW(s) + 4), bat = Math.sin(G.t * 5) > .7 ? 1 : 0;
    x.fillStyle = K; x.fillRect(px - w / 2 - 1, py - 5 - bat, w + 2, 10); x.fillRect(px - w / 2, py - 6 - bat, w, 12);
    x.fillStyle = '#ff3b3b'; x.fillRect(px - w / 2, py - 5 - bat, w, 10);
    x.fillStyle = '#ff8a7a'; x.fillRect(px - w / 2, py - 5 - bat, w, 1);
    G.txt(x, s, px, py - 3 - bat, '#fff', { al: .5 });
  }
  /* La cagnotte : la bobine qui tourne et ce qu'on a en poche (G.sav.bobines), ce qui paie personnages, drones, bonus et decors.
     al = 1 : alignee a droite sur px. Rend sa largeur. */
  function cagnotte(px, py, sc = 2, al = 0) {
    const t = milliers(G.sav.bobines), w = 13 + G.txtW(t) * sc;
    // pres d'un bord, elle s'ecarte d'un trou de camera
    const x0 = Math.round(G.libre(px - w * al, py - 3, w, sc === 2 ? 16 : 11, al ? -1 : 1));
    x.drawImage(G.Rendu.bob[(G.t * 10 | 0) & 7], x0, py - (sc === 2 ? 1 : 2));
    G.txt(x, t, x0 + 13 + (sc === 2 ? 1 : 0), py + (sc === 2 ? 0 : 1), '#ffe27a', { contour: K, sc });
    return w;
  }
  U.bulles = () => {
    const vus = G.sav.vus || {}, ach = ATEL.filter(([k, , , max]) => (G.sav.atelier[k] || 0) < max && G.sav.bobines >= coutA(k, G.sav.atelier[k] || 0)).length;
    // le hangar : ce qu'on peut nouvellement s'offrir (ce qui l'etait deja la derniere fois qu'on l'a ouvert ne se signale plus)
    return { atelier: ach, hangar: G.abordables().filter(id => !(vus.abordables || []).includes(id)).length, galerie: G.galerieOuverte() ? Math.max(0, G.photosVisibles().length - (vus.photos || 0)) : 0 };
  };
  // ce qu'on a regarde ne se signale plus ; l'atelier, lui, se signale tant qu'on peut acheter
  U.vu = n => {
    const v = G.sav.vus = G.sav.vus || {};
    if (n === 'hangar') { v.abordables = G.abordables(); delete v.hangar; }
    else if (n === 'galerie') v.photos = G.photosVisibles().length;
    else return;
    G.sauver();
  };
  /* ---- Acheter : une fenetre avec le prix, un bouton pour valider, une croix pour fermer (Max, 06/11/2026) ----
     Tout ce qui s'achete passe par elle, avec la cagnotte (G.sav.bobines ; le cumul, qui donne les photos, ne baisse jamais) : la
     reprise apres un record (10 000), un decor pas encore decouvert (10 000 depuis le 06/11/2026 au soir, d'abord 15 000), un
     personnage, un drone, une evolution de bonus. Tant qu'elle est ouverte, rien d'autre ne repond. */
  const PRIX_REPRISE = U.PRIX_REPRISE = 10000, PRIX_DECOR = U.PRIX_DECOR = 10000;
  const milliers = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  U.milliers = milliers;
  let achat = null;
  U.achat = () => achat;
  // o : { prix, ok, dessin(x, cx, cy), nom, h } ; elle se ferme seule si l'on change d'ecran ; h : plus haute pour un apercu
  const ouvrirAchat = o => { achat = Object.assign({ t: 0, refus: 0, ecran: U.ecran }, o); };
  U.fermerAchat = () => { achat = null; };
  function fenetreAchat() {
    const a = achat, cx = G.VW / 2, w = 176, h = a.h || 104, dh = h - 104;
    a.t += G.dt; a.refus = Math.max(0, a.refus - G.dt);
    // rien de ce qui est dessous ne repond ; un appui a cote ne fait rien
    boutons = [{ px: 0, py: 0, w: G.VW, h: G.VH, cb: () => { } }];
    voile(.6);
    // elle tombe en place et rebondit un peu
    const k = Math.min(1, a.t / .22), y0 = Math.round(G.VH / 2 - h / 2 - 2 - 14 * (1 - k) * (1 - k) + Math.sin(Math.min(1, a.t / .32) * Math.PI) * 2), x0 = Math.round(cx - w / 2);
    x.fillStyle = K; x.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
    x.fillStyle = '#b8862a'; x.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
    x.fillStyle = '#e0a83a'; x.fillRect(x0 - 1, y0 - 1, w + 2, 1);
    x.fillStyle = '#2b2233'; x.fillRect(x0 + 1, y0 + 1, w - 2, h - 2);
    x.fillStyle = '#342a3e'; x.fillRect(x0 + 1, y0 + 1, w - 2, 2);
    // ce qu'on achete
    a.dessin(x, cx, y0 + 26 + dh / 2);
    // le prix : rouge s'il manque des bobines, il tremble si l'on insiste
    const peut = G.sav.bobines >= a.prix, txt = milliers(a.prix), tw = G.txtW(txt) * 2 + 16;
    const dx = a.refus > 0 ? Math.round(Math.sin(a.refus * 60) * 2) : 0, px = Math.round(cx - tw / 2) + dx, py = y0 + 50 + dh;
    x.drawImage(G.Rendu.bob[(G.t * 10 | 0) & 7], px, py - 1);
    G.txt(x, txt, px + 16, py, peut ? '#ffe27a' : '#ff6a5a', { sc: 2, contour: K });
    // valider (vert), ou gris s'il manque des bobines
    ic(cx - 30, y0 + h - 34, 60, 26, 'valider', () => {
      if (G.sav.bobines < a.prix) { a.refus = .45; G.vibre('double'); return; }
      G.sav.bobines -= a.prix; G.sauver();
      G.Audio.sfx('mission'); G.vibre('heavy');
      achat = null;
      a.ok();
    }, peut ? { c: '#2f8f4f', nom: 'acheter' } : { c: '#3a3c48', t: '#777', nom: 'acheter' });
    // la croix, dans le coin
    ic(x0 + w - 24, y0 + 4, 20, 18, 'quitter', () => { achat = null; }, { c: '#4a3a52', nom: 'fermer' });
  }
  /* La reprise, ce qu'on achete (Max, 06/11/2026 : « ce n'est pas clair la a quoi il sert » ; avant, une icone de lecture et un 2) :
     le cadreur repart sur son drone, un coeur de plus, et la partie continue a la distance ou elle s'est arretee. */
  const dessinReprise = (q, cx, cy) => {
    const st = { rot: G.t * 30, t: G.t, flex: .3 + Math.sin(G.t * 2) * .15, mood: 'joie', ang: -.12 }, c = 96 / G.S;
    const v = G.heroVignette(st), hy = cy - c / 2 + Math.sin(G.t * 3) * 1.5;
    q.drawImage(v, 14, 22, 96, 96, Math.round((cx - 48 - c / 2) * G.S) / G.S, Math.round(hy * G.S) / G.S, c, c);
    // un coeur de plus, qui bat
    const bat = Math.sin(G.t * 6) > .6 ? 1 : 0;
    G.Rendu.coeur(q, cx - 12, cy - 22 - bat, 2, true);
    G.txt(q, '+1', cx + 6, cy - 22, '#ff9aa6', { sc: 2, contour: K });
    // la partie repart d'ici
    q.drawImage(dessinIcone('jouer', '#ffe27a'), cx - 14, cy + 2);
    G.txt(q, Math.floor(fin ? fin.dist : J.w().dist || 0) + ' m', cx + 7, cy + 2, '#fff', { sc: 2, contour: K });
  };

  U.lancer = async () => {
    G.Audio.init();
    U.ecran = 'charge';
    // une image qui manque ne doit jamais figer le jeu ici : retour a l'accueil
    try { await J.demarrer(false); } catch (e) { console.error(e); await U.demo(); return; }
    G.sav.tuto = G.sav.tuto || 0;
    U.ecran = 'jeu';
  };
  /* Quitter une partie (pause, ecran de fin, retour d'Android) : le temps que le decor de l'accueil se charge, la partie d'avant n'a
     plus de decor ; les ecrans qui la dessinent ne dessinent rien, l'image d'avant reste a l'ecran, entiere (avant, chaque image
     levait une erreur, « reading 'x0' », et la Switch montrait des images sans decor : tests/abandon.js). Un second appui pendant le
     chargement ne relance rien. */
  let versAccueil = null;
  U.demo = () => versAccueil || (versAccueil = (async () => {
    // le decor de fond est tire au sort : si l'un manque, un autre fera l'affaire
    for (let n = 3; n > 0; n--) {
      try { await J.demarrer(true); break; } catch (e) { console.error(e); }
    }
    U.ecran = 'accueil';
  })().finally(() => { versAccueil = null; }));
  // la partie a-t-elle un decor a dessiner ? (non pendant le chargement de la suivante)
  const aDecor = W => !!(W && W.sc);

  /* ---- Fin de partie : le generique et le betisier ---- */
  /* Les phrases rigolotes (Max, 08/11/2026 : « varie un peu plus les phrases rigolotes ») : une par fin de partie, tiree parmi celles
     qui vont avec ce qui s'est passe (ce qui a mis le drone au tapis, l'eau, la distance, le record, les degats, le lieu) et une
     trentaine de phrases de plateau ; celles vues dans les 14 dernieres parties sont ecartees (G.sav.phrases). Avant : huit phrases,
     souvent la meme. Controle : tests/fin_xp.js. */
  const pl = (n, s, p) => n + ' ' + (n > 1 ? p : s);
  const PHRASES_PLATEAU = [
    'Aucun mouton n\'a été blessé. Vexé, peut-être.', 'Ce drone est une doublure', 'La claquette a claqué. Le drone aussi.',
    'Le réalisateur dit que c\'était voulu', 'Prise 47. Le café est froid.', 'On garde la chute pour la bande-annonce',
    'Le stagiaire ramasse déjà les morceaux', 'Silence... ça ne vole plus', 'La scripte note : « drone au sol »',
    'Le cascadeur demande une augmentation', 'Bon pour le bêtisier, pas pour Cannes', 'L\'ingé son a tout entendu',
    'Vu de loin, c\'était presque élégant', 'Le catering est ouvert, rien n\'est perdu', 'Moteur ! Ah non, plus de moteur.',
    'Les figurants applaudissent. Par politesse.', 'Personne n\'a rien vu. Sauf la caméra.', 'En post-prod, on dira que c\'est un effet',
    'Le drone fait une pause syndicale', 'Le producteur relit son contrat d\'assurance', 'Ça, c\'est du cinéma vérité',
    'Une prise de plus pour le making-of', 'On avait dit « action », pas « crash »', 'La pellicule a survécu, c\'est l\'essentiel',
    'César du meilleur bruitage, au moins', 'Le drone voulait un plan au sol. Il l\'a eu.', 'Atterrissage technique : 2 sur 10',
    'Cinq minutes de pause, et on la refait', 'Le chef op cherche encore son drone', 'Le clap de fin est arrivé un peu tôt',
    'La maquilleuse s\'occupe du drone', 'Le réalisateur a déjà une idée de suite', 'On appelle ça un plan-séquence raté',
  ];
  function phraseDeFin(W, lieu, rec) {
    const c = [], ajoute = (cat, poids, l) => l.forEach((t, i) => c.push([cat + i, t, poids]));
    const L = lieu || 'l\'étranger';
    // ce qui l'a mis au tapis
    const NOM = { pigeon: 'un pigeon', mouette: 'une mouette', vautour: 'un vautour', flamant_vol: 'un flamant rose', paille_en_queue: 'un paille-en-queue', parapente: 'un parapente', helico: 'un hélicoptère', montgolfiere: 'une montgolfière', requin: 'un requin', meduse: 'une méduse', sac_plastique: 'un sac plastique', bouteille: 'une bouteille', poisson_globe: 'un poisson vexé', buggy: 'un buggy', ferrari: 'une voiture de sport', van: 'un van', tracteur: 'un tracteur', ane: 'un âne', cheval: 'un cheval', moto: 'une moto', char_romain: 'un char romain', baleine: 'une baleine', rorqual: 'un rorqual', dauphin: 'un dauphin', cable: 'un câble', lampadaire: 'un lampadaire', planche_voile: 'un windsurf', zodiac: 'un zodiac' };
    const cause = NOM[W.choc];
    if (cause) ajoute('ko', 3, ['Mis K.O. par ' + cause + ' à ' + L, 'Battu aux points par ' + cause, cause.replace(/^./, a => a.toUpperCase()) + ' a gâché la prise']);
    if (W.choc === 'rayon' || W.choc === 'projecteur') ajoute('lum', 3, ['Trop de lumière tue la lumière', 'Ébloui par les projecteurs. Déjà la gloire ?', 'Le chef électro s\'excuse. Un peu.', 'Les projecteurs ont gagné la prise']);
    if (W.chocBoss) {
      const a = G.trad(W.chocBoss).toLowerCase(), A = a.replace(/^./, q => q.toUpperCase());
      ajoute('boss', 3, [A + ' réclame des droits à l\'image', A + ' voulait juste un autographe', A + ' n\'aime pas les paparazzis', 'Filmer ' + a + ' de si près : audacieux']);
    }
    const M = W.choc === 'struct' && W.chocM && G.Structures && G.Structures.MATIERES && G.Structures.MATIERES[W.chocM];
    if (M) { const m = M.n, mm = m.charAt(0).toLowerCase() + m.slice(1); ajoute('mat', 2.5, [m + ' 1, drone 0', 'Collision : ' + mm + '. Effet spécial ?', 'Personne n\'avait prévenu pour : ' + mm]); }
    if (W.sc && W.sc.type === 'eau') ajoute('eau', 2, ['Le drone n\'était pas étanche. Le budget non plus.', 'Glou glou... coupez !', 'Les poissons ont tout filmé', 'Plan sous-marin, un peu trop sous-marin']);
    if (W.dist < 150) ajoute('court', 2, ['Coupez ! Euh... déjà ?', 'La prise la plus courte du festival', 'Même le clap n\'a pas eu le temps de claquer']);
    if (W.dist > 1500) ajoute('long', 1.5, [Math.floor(W.dist) + ' m de rushes : le monteur va adorer', Math.floor(W.dist) + ' m : le plus long travelling de l\'année']);
    if (rec) ajoute('rec', 2, ['Record battu : on parle déjà des César', 'Nouveau record : la prod commande une suite']);
    // ce qu'on a fait en route
    const n1 = W.renverses, n2 = W.frole, n3 = W.detruit, n4 = W.plansN, n5 = W.plongees;
    if (n1) ajoute('dec', 1.2, [pl(n1, 'figurant décoiffé', 'figurants décoiffés') + ', aucune décharge signée', pl(n1, 'figurant', 'figurants') + ' à recoiffer : la maquilleuse démissionne']);
    if (n2) ajoute('fro', 1.2, [pl(n2, 'frôlement', 'frôlements') + ' : l\'assurance préfère ne pas savoir', pl(n2, 'frôlement', 'frôlements') + ' : le cascadeur est jaloux']);
    if (n3) ajoute('cas', 1.2, [pl(n3, 'objet détruit', 'objets détruits') + ' : la facture part chez la prod', pl(n3, 'objet cassé', 'objets cassés') + ' : le décorateur pleure en loge']);
    if (n4) ajoute('pla', 1.2, [pl(n4, 'plan', 'plans') + ' dans la boîte, le reste au bêtisier', pl(n4, 'plan', 'plans') + ' en boîte : le monteur a du travail']);
    if (n5) ajoute('plo', 1.2, [pl(n5, 'plongée', 'plongées') + ' : le drone n\'était pas étanche']);
    if (W.bob > 120) ajoute('bob', 1, [W.bob + ' bobines : de quoi tourner une suite']);
    ajoute('lieu', 1, ['Tourné à ' + L + ' sans autorisation', 'L\'office du tourisme de ' + L + ' n\'a pas aimé', 'Souvenir de ' + L + ' : un drone en miettes']);
    ajoute('pl', 1, PHRASES_PLATEAU);
    // une phrase trop longue pour l'ecran le plus etroit (344 unites utiles) n'est pas tiree
    for (let k = c.length - 1; k >= 0; k--) if (G.txtW(c[k][1]) > 340) c.splice(k, 1);
    // pas une phrase vue dans les 14 dernieres parties
    const vues = G.sav.phrases = (G.sav.phrases || []).slice(-14), libres = c.filter(q => !vues.includes(q[0]));
    const l = libres.length ? libres : c;
    let r = Math.random() * l.reduce((a, q) => a + q[2], 0), choix = l[l.length - 1];
    for (const q of l) { r -= q[2]; if (r <= 0) { choix = q; break; } }
    vues.push(choix[0]);
    if (vues.length > 14) vues.shift();
    return choix[1];
  }
  J.onFin = W => {
    // apres une reprise, la partie continue : on ne compte que ce qui s'est ajoute depuis la premiere fin
    G.sav.totalDist += W.dist - (W.distCompte || 0); W.distCompte = W.dist;
    const rec = W.dist > G.sav.record;
    if (rec) G.sav.record = W.dist;
    // le classement Google Play Jeux : la distance de la partie (Google ne garde que la meilleure)
    G.Classement.envoyer(W.dist);
    G.sav.tuto = 1;
    const fm = J.finMissions();
    const rangAvant = J.rangIndex();
    const xpTotal = J.calculXP(), xpGain = xpTotal - (W.xpCompte || 0);
    W.xpCompte = xpTotal;
    const xpAvant = G.sav.xp || 0;
    G.sav.xp = xpAvant + xpGain;
    const rangApres = J.rangIndex();
    const lieu = J.lieuDe(W.sc.id);
    const blagues = [phraseDeFin(W, lieu, rec)];
    const vues0 = W.photos0 === undefined ? null : W.photos0;
    const gains = G.gainsEntre(W.cumul0 === undefined ? G.sav.cumul : W.cumul0, G.sav.cumul, vues0 === null ? undefined : vues0);
    // les deux derniers rangs donnent un drone et un personnage qu'on ne peut pas acheter : le cadre du cadeau les montre, on les prend
    const offerts = [];
    for (let r = rangAvant + 1; r <= rangApres; r++) {
      const q = J.RANGS[r];
      const a = G.sav.achats = G.sav.achats || { perso: {}, drone: {} };
      if (q.drone) { offerts.push({ k: 'drone', id: q.drone, n: (G.MODELES.find(e => e.id === q.drone) || {}).n || q.drone }); G.sav.modele = q.drone; (a.drone = a.drone || {})[q.drone] = 1; }
      if (q.perso) { offerts.push({ k: 'perso', id: q.perso, n: (G.PERSOS.find(e => e.id === q.perso) || {}).n || q.perso }); G.sav.heros = q.perso; (a.perso = a.perso || {})[q.perso] = 1; }
    }
    // la statuette d'or : la jauge de l'Oscar s'est remplie pendant cette partie
    if (J.XP_FINAL && xpAvant < J.XP_FINAL && G.sav.xp >= J.XP_FINAL) offerts.push({ k: 'final', n: J.FINAL.n });
    if (offerts.length) G.heroReset();
    // les photos gagnees pendant cette partie : la galerie s'ouvrira sur la premiere
    const visibles = G.photosVisibles(), avant = W.photosIds0 || [];
    const k0 = visibles.findIndex(p => !avant.includes(p[0])), photoNeuve = vues0 !== null && k0 >= 0 ? k0 : null;
    W.cumul0 = G.sav.cumul;
    W.photos0 = visibles.length; W.photosIds0 = visibles.map(p => p[0]);
    fin = { gains: offerts.concat(gains), photoNeuve, rec, dist: W.dist, bob: W.bob, plans: W.plansN, nouv: W.nouveaux, missions: fm, blagues, t: 0, prise: rec && W.prise2 === 0, xpGain, xpAvant, rangApres, monte: rangApres > rangAvant };
    G.sauver();
    U.ecran = 'fin';
  };
  /* L'experience de la partie (Max, 08/11/2026 : « ajoute le nombre d'XP gagnes, fais en sorte que ce soit bien presente », puis
     « je veux juste le nombre d'XP gagnes, pas besoin de marquer le palier ou autre. Si on clique dessus, ca ouvre l'onglet XP de la page
     d'accueil ») : un bouton, l'etoile de la carriere et « +1 234 xp » qui se compte depuis 0 ; un rang franchi pendant le compte le
     fait clignoter et lance les confettis, sans un mot. Un appui ouvre la carriere, dont le retour ramene ici. A cote, ce qu'on vient
     de gagner (photo, galerie, drone, personnage). Plus de jauge de la prochaine photo (« enleve la jauge avec la photo de tournage »).
     Controle : tests/fin_xp.js. */
  const ETOILE = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##'];
  const largeurXP = () => 22 + G.txtW('+' + milliers(fin.xpGain) + ' xp', 2) + 10;
  function boutonXP(px, py, pw, ph) {
    const f = fin, R = J.RANGS;
    const k = clamp((f.t - .4) / 1.3, 0, 1), e = 1 - Math.pow(1 - k, 3);
    const gain = Math.round(f.xpGain * e), tot = f.xpAvant + gain;
    let i = 0; R.forEach((q, n) => { if (tot >= q.xp) i = n; });
    if (f.rangAff === undefined) f.rangAff = i;
    if (i > f.rangAff) { f.rangAff = i; f.flash = .7; G.Lumiere.confettis(J.w(), 120); G.Audio.sfx('mission'); G.vibre('heavy'); }
    // la statuette d'or au bout de la jauge de l'Oscar : la meme fete
    if (f.finalVu === undefined) f.finalVu = f.xpAvant >= J.XP_FINAL;
    if (!f.finalVu && tot >= J.XP_FINAL) { f.finalVu = true; f.flash = .7; G.Lumiere.confettis(J.w(), 120); G.Audio.sfx('mission'); G.vibre('heavy'); }
    f.flash = Math.max(0, (f.flash || 0) - G.dt);
    const flash = f.flash > 0 && (G.t * 12 | 0) % 2;
    boutons.push({ px, py, w: pw, h: ph, nom: 'xpFin', cb: () => { rangVu = null; retourCarriere = 'fin'; U.ecran = 'carriere'; G.Audio.sfx('bobine'); } });
    x.fillStyle = K; x.fillRect(px - 1, py - 1, pw + 2, ph + 2);
    x.fillStyle = flash ? '#ffe27a' : '#b8862a'; x.fillRect(px, py, pw, ph);
    x.fillStyle = '#1c1e2b'; x.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    x.fillStyle = '#2b2e42'; x.fillRect(px + 2, py + 2, pw - 4, 1);
    petit(ETOILE, px + 8, py + ph / 2 - 4, '#ffd54a');
    G.txt(x, '+' + milliers(gain) + ' xp', px + 22, py + ph / 2 - 7, '#7dff8a', { sc: 2, contour: K });
  }
  // ce qu'on vient de gagner : une photo (le cadre mene a la galerie), la galerie, un drone ou un personnage des derniers rangs
  function carteGain(px, py, pw, ph) {
    // chacun son tour : un drone ou un personnage gagne reste 3,5 s, une photo 2,2 s
    const g = fin.gains, duree = e => e.k === 'drone' || e.k === 'perso' || e.k === 'final' ? 3.5 : 2.2, cycle = g.reduce((a, e) => a + duree(e), 0);
    let tt = fin.t % cycle, q = g[0];
    for (const e of g) { if (tt < duree(e)) { q = e; break; } tt -= duree(e); }
    const versGalerie = (q.k === 'photo' || q.k === 'galerie') && G.photosVisibles().length > 0;
    if (versGalerie) boutons.push({ px, py, w: pw, h: ph, cb: () => U.ouvrirGalerie(fin.photoNeuve, 'fin'), nom: 'gainGalerie' });
    x.fillStyle = K; x.fillRect(px - 1, py - 1, pw + 2, ph + 2);
    x.fillStyle = versGalerie && Math.sin(G.t * 5) > 0 ? '#e0a83a' : '#b8862a'; x.fillRect(px, py, pw, ph);
    x.fillStyle = '#2b2233'; x.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    let tx;
    if (q.k === 'drone' || q.k === 'perso') {
      const B = cadreSeul(q.k, q.id), iw = (B[2] - B[0]) / G.S;
      poser(x, essai(apercu({}), q.k, q.id), B, px + 6 + iw / 2, py + ph / 2);
      tx = px + 6 + iw + 6;
    } else if (q.k === 'final' && G.statuette) {
      const S = G.statuette(30), w = S.width / G.S, h = S.height / G.S;
      x.drawImage(S, Math.round((px + 7) * G.S) / G.S, Math.round((py + ph / 2 - h / 2) * G.S) / G.S, w, h);
      tx = px + 7 + w + 6;
    } else { x.drawImage(dessinIcone('galerie', '#ffe27a'), px + 7, py + ph / 2 - 7.2); tx = px + 27; }
    if (versGalerie) x.drawImage(dessinIcone('jouer', '#ffe27a'), px + pw - 20, py + ph / 2 - 7.2);
    // le texte tient dans le cadre : sur deux lignes s'il le faut
    const place = px + pw - (versGalerie ? 22 : 6) - tx, mots = q.n.split(' ');
    let l1 = q.n, l2 = '';
    if (G.txtW(q.n) > place && mots.length > 1) {
      let best = 1, ecart = 1e9;
      for (let k = 1; k < mots.length; k++) { const a = G.txtW(mots.slice(0, k).join(' ')), b = G.txtW(mots.slice(k).join(' ')); if (Math.max(a, b) < ecart) { ecart = Math.max(a, b); best = k; } }
      l1 = mots.slice(0, best).join(' '); l2 = mots.slice(best).join(' ');
    }
    if (l2) { G.txt(x, l1, tx, py + ph / 2 - 10, '#ffe27a', { sc: 1 }); G.txt(x, l2, tx, py + ph / 2 + 1, '#ffe27a', { sc: 1 }); }
    else G.txt(x, l1, tx, py + ph / 2 - 5, '#ffe27a', { sc: 1 });
  }
  function ecranFin() {
    const W = J.w();
    if (!aDecor(W)) return;
    J.maj(G.dt);
    G.Rendu.scene(x, W, false);
    voile(.7);
    const cx = G.VW / 2;
    fin.t += G.dt;
    // bandes de film
    x.fillStyle = '#000'; x.fillRect(0, 0, G.VW, 14); x.fillRect(0, G.VH - 14, G.VW, 14);
    x.fillStyle = '#f2ecd8';
    for (let i = -((G.t * 60) % 16); i < G.VW; i += 16) { x.fillRect(i, 3, 9, 8); x.fillRect(i, G.VH - 11, 9, 8); }
    G.txt(x, 'COUPEZ !', cx, 20, '#ff5a4a', { al: .5, sc: 3, contour: K });
    G.txt(x, Math.floor(fin.dist) + ' m', cx - 50, 46, fin.rec ? '#ffe27a' : '#fff', { al: .5, sc: 3, contour: K });
    if (fin.rec) G.txt(x, 'RECORD !', cx - 50, 72, '#ffe27a', { al: .5, contour: K });
    x.drawImage(G.Rendu.bob[(G.t * 10 | 0) & 7], cx + 30, 50);
    G.txt(x, '+' + fin.bob, cx + 46, 52, '#ffe27a', { contour: K, sc: 2 });
    // la phrase rigolote
    if (fin.blagues[0] && fin.t > .3) G.txt(x, fin.blagues[0], cx, 84, '#d8d8e4', { al: .5, contour: K });
    // l'experience de la partie (un bouton vers la carriere), et a cote ce qu'on vient de gagner
    const aG = fin.gains.length > 0, wG = 150, ecart = 8, yP = 112, pw = largeurXP();
    const tot = pw + (aG ? ecart + wG : 0), x0 = Math.round(cx - tot / 2);
    boutonXP(x0, aG ? yP + 5 : yP, pw, 28);
    if (aG) carteGain(x0 + pw + ecart, yP, wG, 38);
    /* La reprise (Max, 06/11/2026) : seulement si l'on vient de battre son record, une seule fois par partie, pour 10 000 bobines ;
       son bouton ouvre la fenetre du prix (valider, ou la croix). Avant : une Prise 2 offerte par la carriere, sans condition. */
    // partager son score (Max, 04/11/2026) : une icone apres « Nouvelle prise », la carte part dans la feuille de partage
    const cl = G.Classement.dispo(), yb = 174, xb = cx - (208 + (cl ? 42 : 0) + (fin.prise ? 108 : 0)) / 2;
    ic(xb, yb, 34, 26, 'quitter', () => { U.demo(); }, { nom: 'accueil' });
    bouton(xb + 42, yb, 124, 26, 'NOUVELLE PRISE', () => U.lancer(), { c: '#c8393b' });
    boutons[boutons.length - 1].nom = 'rejouer';
    ic(xb + 174, yb, 34, 26, 'partager', () => U.partager(), { c: '#2f8a5a' });
    // le classement Google Play Jeux (Max, 07/11/2026), seulement dans l'appli
    if (cl) ic(xb + 216, yb, 34, 26, 'classement', () => G.Classement.ouvrir(), { c: '#2f6fb5' });
    if (fin.prise) {
      /* « CONTINUER » (Max, 06/11/2026 : « ce n'est pas clair la a quoi il sert » ; avant, une icone de lecture et un 2 dore, le prix
         seulement dans la fenetre) : un coeur, le mot, le prix sous le mot (rouge s'il manque des bobines), un cadre dore qui pulse ;
         il ouvre la fenetre d'achat, qui montre le cadreur repartir avec un coeur de plus depuis sa distance. */
      const xp = xb + 216 + (cl ? 42 : 0), wp = 100, peut = G.sav.bobines >= PRIX_REPRISE, pulse = .5 + .5 * Math.sin(G.t * 5);
      x.fillStyle = K; x.fillRect(xp - 4, yb - 4, wp + 8, 34);
      x.fillStyle = `rgba(255,213,74,${.45 + .55 * pulse})`; x.fillRect(xp - 3, yb - 3, wp + 6, 32);
      bouton(xp, yb, wp, 26, '', () => ouvrirAchat({ prix: PRIX_REPRISE, nom: 'reprise', h: 128, dessin: dessinReprise, ok: () => { fin.prise = false; J.reprendreApresMort(); U.ecran = 'jeu'; } }), { c: '#2f8f4f' });
      boutons[boutons.length - 1].nom = 'reprise';
      G.Rendu.coeur(x, xp + 5, yb + 8 - (pulse > .85 ? 1 : 0), 1.6, true);
      const tx = xp + 21 + (wp - 25 - G.txtW('CONTINUER')) / 2;
      G.txt(x, 'CONTINUER', tx, yb + 3, '#fff', { contour: K });
      const pr = milliers(PRIX_REPRISE), pw2 = 11 + G.txtW(pr), px2 = Math.round(xp + 21 + (wp - 25 - pw2) / 2);
      x.drawImage(G.Rendu.bob[(G.t * 10 | 0) & 7], px2, yb + 14, 9, 9);
      G.txt(x, pr, px2 + 11, yb + 14, peut ? '#ffe27a' : '#ff6a5a', { contour: K });
    }
  }

  /* ---- Partager son score (04/11/2026) : une carte en pixel art (le decor ou la partie s'est arretee, la distance, le record, les
     bobines), agrandie deux fois sans flou, puis la feuille de partage d'Android avec un mot et le lien du Play Store.
     Dans un navigateur : le partage du systeme s'il sait envoyer une image, sinon l'image s'ouvre. ---- */
  const LIEN_PLAY = 'https://maxmoniot.github.io/silence-ca-vole/';
  U.carteScore = () => {
    const W = J.w(), f = fin || { dist: W.dist || 0, bob: W.bob || 0, rec: false };
    const c = G.mkE(G.VW, G.VH), q = c.x, cx = G.VW / 2;
    // le decor tel qu'il etait, sans voile
    G.Rendu.scene(q, W, false);
    q.fillStyle = 'rgba(10,8,18,.35)'; q.fillRect(0, 0, G.VW, G.VH);
    // la pellicule en haut et en bas
    q.fillStyle = '#000'; q.fillRect(0, 0, G.VW, 16); q.fillRect(0, G.VH - 16, G.VW, 16);
    q.fillStyle = '#f2ecd8';
    for (let i = 4; i < G.VW; i += 16) { q.fillRect(i, 4, 9, 8); q.fillRect(i, G.VH - 12, 9, 8); }
    G.txt(q, 'SILENCE, ÇA VOLE !', cx, 28, '#ffe27a', { al: .5, sc: 2, contour: K });
    G.txt(q, Math.floor(f.dist) + ' m', cx, 66, '#fff', { al: .5, sc: 5, contour: K });
    if (f.rec) G.txt(q, 'RECORD !', cx, 112, '#ffe27a', { al: .5, sc: 2, contour: K });
    q.drawImage(G.Rendu.bob[0], cx - 30, 136);
    G.txt(q, '+' + (f.bob || 0), cx - 12, 138, '#ffe27a', { sc: 2, contour: K });
    const lieu = W.sc && (W.sc.def.lieuTitre || J.lieuDe(W.sc.id));
    if (lieu) G.txt(q, lieu, cx, 170, '#d8d8e4', { al: .5, contour: K });
    // deux fois plus grande, pixel pour pixel
    const g = G.mk(c.width * 2, c.height * 2);
    g.x.imageSmoothingEnabled = false;
    g.x.drawImage(c, 0, 0, g.width, g.height);
    return g;
  };
  U.partager = () => {
    const f = fin || { dist: 0, rec: false };
    const texte = (f.rec ? 'Nouveau record ! ' : '') + "J'ai filmé " + Math.floor(f.dist) + ' m dans Silence, ça vole ! À toi de faire mieux : ' + LIEN_PLAY;
    const carte = U.carteScore();
    const url = carte.toDataURL('image/png');
    const A = window.AndroidBridge;
    if (A && A.shareImage) { A.shareImage(url.split(',')[1], texte); return 'android'; }
    if (A && A.share) { A.share(texte); return 'texte'; }
    carte.toBlob(b => {
      const fichier = typeof File === 'function' ? new File([b], 'silence-ca-vole.png', { type: 'image/png' }) : null;
      if (fichier && navigator.canShare && navigator.canShare({ files: [fichier] })) navigator.share({ files: [fichier], text: texte }).catch(() => { });
      else window.open(url, '_blank');
    });
    return 'web';
  };

  /* ---- La carriere (le bouton etoile de l'accueil). Max, 07/11/2026 : d'abord « comprendre ce que la jauge en cours va apporter,
     revoir les niveaux precedents » ; puis, devant une liste des onze rangs, « trop complexe : une vue relativement comme avant (mais
     avec les xp visibles et le gain de la jauge en cours visible) + un bouton qui permet de naviguer pour voir les etapes precedentes et
     suivantes (les suivantes grisees), avec les jauges et les gains ».
     Une etape a la fois : son rang en titre, sa jauge, l'experience en chiffres, et au bout de la jauge le rang suivant et ce qu'il
     apporte. Deux fleches (rangPrec, rangSuiv) et une rangee de points pour s'y retrouver ; on s'ouvre sur l'etape en cours. Dessous, les
     trois missions et ce qu'elles rapportent. Controle : tests/carriere.js. ---- */
  // un petit motif au pixel (un point = un pixel double de l'ecran)
  const petit = (motif, X, Y, col) => { x.fillStyle = col; const u = 2 / G.S; motif.forEach((l, j) => { for (let i = 0; i < l.length; i++) if (l[i] === '#') x.fillRect(X + i * u, Y + j * u, u, u); }); };
  const COCHE = ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'];
  const CADENAS = ['.###.', '#...#', '#...#', '#####', '##.##', '#####'];
  const FLECHE = ['...#..', '....#.', '######', '....#.', '...#..'];
  // retourCarriere : ouverte depuis le hangar (le drone ou le personnage special) ou l'ecran de fin (l'experience), elle y ramene
  let rangVu = null, retourCarriere = null;
  // la liste des missions defile au doigt, avec son elan (comme la liste des decors)
  let scrollM = 0, scrollMMax = 0, elanM = 0, dragSM = 0;
  U.defilementMissions = () => ({ scroll: scrollM, max: scrollMMax, elan: elanM });
  // l'ecran de fin, pour les controles (tests/oscar_final.js)
  U.finEtat = () => fin;
  // des morceaux de texte de couleurs differentes, centres ensemble sur cx (un motif au pixel = { motif, col, l })
  function ligne(morceaux, cx, y) {
    const larg = m => m.motif ? m.l : G.txtW(m.t);
    const total = morceaux.reduce((a, m) => a + larg(m), 0) + (morceaux.length - 1) * 5;
    let px = Math.round((cx - total / 2) * G.S) / G.S;
    for (const m of morceaux) {
      if (m.motif) petit(m.motif, px, y + 1, m.col); else G.txt(x, m.t, px, y, m.col, { contour: K });
      px += larg(m) + 5;
    }
  }
  function carriere() {
    fondMenu();
    retour(retourCarriere ? () => { U.ecran = retourCarriere; retourCarriere = null; } : undefined);
    J.completerMissions();
    const R = J.RANGS, i = J.rangIndex(), xp = G.sav.xp || 0, cx = G.VW / 2;
    if (rangVu === null) rangVu = i;
    /* au bout de la jauge de l'Oscar, pas un rang de plus : la statuette d'or (Max, 08/11/2026 : « il ne faut pas de palier
       supplementaire, juste quelque chose a gagner a la fin », J.XP_FINAL) */
    const v = clamp(rangVu, 0, R.length - 1), q = R[v];
    const suiv = R[v + 1] || (J.FINAL ? { n: J.FINAL.n, c: J.FINAL.c, xp: J.XP_FINAL, final: true } : undefined);
    const finalFait = !!(suiv && suiv.final && xp >= suiv.xp);
    const fait = v < i, actuel = v === i, avenir = v > i;
    // le titre : le rang de cette etape (gris si l'on n'y est pas encore)
    // les fleches de part et d'autre du titre ; sur un ecran etroit (16:9, tablette), celle de droite restait sous le bouton
    // retour : elle s'arrete a sa gauche et le titre se fait plus petit s'il le faut (tests/ecrans_telephones.js)
    const dF = Math.min(148, retourX() - 34 - cx);
    const col = actuel ? '#ffe27a' : fait ? '#e8e8f0' : '#8a8ca0', sc = G.txtW(q.n, 3) > Math.min(250, 2 * dF - 8) ? 2 : 3;
    G.txt(x, q.n, cx, sc === 3 ? 14 : 19, col, { al: .5, sc, contour: K });
    // les fleches pour voir les etapes d'avant et d'apres
    if (v > 0) { bouton(cx - dF - 30, 14, 30, 22, '<', () => { rangVu = v - 1; G.Audio.sfx('bobine'); }); boutons[boutons.length - 1].nom = 'rangPrec'; }
    if (v < R.length - 1) { bouton(cx + dF, 14, 30, 22, '>', () => { rangVu = v + 1; G.Audio.sfx('bobine'); }); boutons[boutons.length - 1].nom = 'rangSuiv'; }
    // ou l'on est : un point par etape (or : faite, l'etape en cours plus grosse, gris : a venir), celle qu'on regarde cerclee
    const pas = 9, d0 = cx - (R.length - 1) * pas / 2;
    R.forEach((_, n) => {
      const px = d0 + n * pas, py = 44, r = n === i ? 2.4 : 1.6;
      if (n === v) { x.fillStyle = '#ffffff'; x.fillRect(px - r - 1.2, py - r - 1.2, (r + 1.2) * 2, (r + 1.2) * 2); }
      x.fillStyle = K; x.fillRect(px - r - .6, py - r - .6, (r + .6) * 2, (r + .6) * 2);
      x.fillStyle = n < i ? '#ffd54a' : n === i ? (Math.sin(G.t * 4) > 0 ? '#ffe27a' : '#ffd54a') : '#4a4c58';
      x.fillRect(px - r, py - r, r * 2, r * 2);
    });
    // la jauge de cette etape : pleine si elle est faite, vide (grise) si elle est a venir. Les deux derniers rangs ont un ecrin au
    // bout de la jauge (rec, statuette, plus bas) : sur un ecran etroit il ne tenait plus et disparaissait (tablette) ; la jauge et
    // son ecrin se centrent alors ensemble, la jauge raccourcie s'il le faut
    const rec = suiv && (suiv.drone || suiv.perso) ? suiv : !suiv && (q.drone || q.perso) ? q : null;
    const lE = rec ? (cadreSeul(rec.drone ? 'drone' : 'perso', rec.drone || rec.perso)[2] - cadreSeul(rec.drone ? 'drone' : 'perso', rec.drone || rec.perso)[0]) / G.S
      : suiv && suiv.final && G.statuette ? G.statuette(30, !finalFait).width / G.S : 0;
    let bw = 260, bx = cx - bw / 2;
    if (lE && bx + bw + 14 + lE + 5 > G.VW - 2) {
      bw = Math.min(260, G.VW - 16 - (14 + lE + 5));
      bx = Math.round((G.VW - (bw + 14 + lE + 5)) / 2 * G.S) / G.S;
    }
    const by = 54, gx = bx + bw / 2;
    const k = !suiv ? (avenir ? 0 : 1) : fait ? 1 : actuel ? clamp((xp - q.xp) / (suiv.xp - q.xp), 0, 1) : 0;
    x.fillStyle = K; x.fillRect(bx - 1, by - 1, bw + 2, 8);
    x.fillStyle = avenir ? '#2c2d36' : '#3a3c48'; x.fillRect(bx, by, bw, 6);
    x.fillStyle = '#ffd54a'; x.fillRect(bx, by, bw * k, 6);
    x.fillStyle = '#fff4a8'; x.fillRect(bx, by, bw * k, 1);
    // l'experience en chiffres
    const xpTxt = !suiv ? milliers(q.xp) + ' xp' : finalFait && actuel ? milliers(xp) + ' xp' : actuel ? milliers(xp) + ' / ' + milliers(suiv.xp) + ' xp' : fait ? milliers(suiv.xp) + ' / ' + milliers(suiv.xp) + ' xp' : 'de ' + milliers(q.xp) + ' à ' + milliers(suiv.xp) + ' xp';
    G.txt(x, xpTxt, gx, by + 10, avenir ? '#6a6c7c' : '#aab0c8', { al: .5, contour: K });
    // le gain au bout de la jauge : le rang suivant et ce qu'il apporte
    if (suiv) {
      const marque = fait || finalFait ? { motif: COCHE, col: '#7dff8a', l: 14 * 2 / G.S } : avenir ? { motif: CADENAS, col: '#6a6c7c', l: 10 * 2 / G.S } : { motif: FLECHE, col: '#7dff8a', l: 12 * 2 / G.S };
      ligne([marque, { t: suiv.n, col: avenir ? '#8a8ca0' : finalFait ? '#7dff8a' : '#ffe27a' }, { t: suiv.c || suiv.r, col: avenir ? '#6a6c7c' : '#7dff8a' }], gx, by + 24);
    } else if (q.drone || q.perso) {
      // la derniere etape : ce qu'elle a donne (ou donnera)
      const a = G.possede(q.drone ? 'drone' : 'perso', q.drone || q.perso);
      ligne([a ? { motif: COCHE, col: '#7dff8a', l: 14 * 2 / G.S } : { motif: CADENAS, col: '#6a6c7c', l: 10 * 2 / G.S }, { t: q.c, col: a ? '#7dff8a' : '#8a8ca0' }], gx, by + 24);
    } else ligne([{ t: avenir ? 'Le dernier rang' : 'Tu as atteint le dernier rang', col: avenir ? '#8a8ca0' : '#7dff8a' }], gx, by + 24);
    /* Ce que les deux derniers rangs donnent d'exceptionnel (le drone arc-en-ciel, la star, Max, 08/11/2026) : dessine au bout de la
       jauge, a sa definition, en silhouette tant qu'on ne l'a pas (comme dans le hangar) */
    if (rec) {
      const k2 = rec.drone ? 'drone' : 'perso', id = rec.drone || rec.perso, B = cadreSeul(k2, id), w = (B[2] - B[0]) / G.S;
      const h = (B[3] - B[1]) / G.S, X = bx + bw + 14 + w / 2, fl = Math.round(Math.sin(G.t * 2.4) * 1.5 * G.S) / G.S;
      if (X + w / 2 + 5 <= G.VW - 2) {
        const ex = Math.round((X - w / 2 - 5) * G.S) / G.S, ey = Math.round((by + 3 - h / 2 - 5) * G.S) / G.S, ew = w + 10, eh = h + 10;
        x.fillStyle = K; x.fillRect(ex - 1, ey - 1, ew + 2, eh + 2);
        x.fillStyle = Math.sin(G.t * 3) > 0 ? '#ffd54a' : '#b8862a'; x.fillRect(ex, ey, ew, eh);
        x.fillStyle = '#1b2030'; x.fillRect(ex + 1, ey + 1, ew - 2, eh - 2);
        x.fillStyle = '#232a3d'; x.fillRect(ex + 1, ey + 1, ew - 2, 1);
        poser(x, G.possede(k2, id) ? essai(apercu({}), k2, id) : silhouette({ id }, k2), B, X, by + 3 + fl);
      }
    }
    // la statuette d'or au bout de la jauge de l'Oscar, dans son ecrin, en silhouette tant qu'on ne l'a pas (hero.js, G.statuette)
    if (suiv && suiv.final && G.statuette) {
      const S = G.statuette(30, !finalFait), w = S.width / G.S, h = S.height / G.S, X = bx + bw + 14 + w / 2, fl = Math.round(Math.sin(G.t * 2.4) * 1.5 * G.S) / G.S;
      if (X + w / 2 + 5 <= G.VW - 2) {
        const ex = Math.round((X - w / 2 - 5) * G.S) / G.S, ey = Math.round((by + 3 - h / 2 - 5) * G.S) / G.S, ew = w + 10, eh = h + 10;
        x.fillStyle = K; x.fillRect(ex - 1, ey - 1, ew + 2, eh + 2);
        x.fillStyle = Math.sin(G.t * 3) > 0 ? '#ffd54a' : '#b8862a'; x.fillRect(ex, ey, ew, eh);
        x.fillStyle = '#1b2030'; x.fillRect(ex + 1, ey + 1, ew - 2, eh - 2);
        x.fillStyle = '#232a3d'; x.fillRect(ex + 1, ey + 1, ew - 2, 1);
        x.drawImage(S, Math.round((X - w / 2) * G.S) / G.S, Math.round((by + 3 - h / 2 + fl) * G.S) / G.S, w, h);
      }
    }
    /* les missions : ce qu'il faut faire, ou on en est, ce que ca rapporte ; douze, dans une liste qu'on fait defiler au doigt
       (Max, 08/11/2026), une barre a droite dit ou l'on en est */
    const L = G.sav.missions || [], haut = 100, bas = G.VH - 8, pasM = 24;
    scrollMMax = Math.max(0, L.length * pasM - 4 - (bas - haut));
    if (dragY === null && elanM) { scrollM += elanM * G.dt; elanM *= Math.exp(-G.dt / .35); if (Math.abs(elanM) < 6) elanM = 0; }
    scrollM = clamp(scrollM, 0, scrollMMax);
    if (scrollM <= 0 || scrollM >= scrollMMax) elanM = 0;
    x.save(); x.beginPath(); x.rect(0, haut - 2, G.VW, bas - haut + 2); x.clip();
    L.forEach((m, j) => {
      const mw = 300, mx = cx - mw / 2, my = Math.round((haut + 4 + j * pasM - scrollM) * G.S) / G.S;
      if (my > bas || my + 22 < haut) return;
      x.fillStyle = K; x.fillRect(mx - 1, my - 1, mw + 2, 22);
      x.fillStyle = '#23222e'; x.fillRect(mx, my, mw, 20);
      const p = m.p ? clamp(m.p / m.but, 0, 1) : 0;
      x.fillStyle = '#2f6f4f'; x.fillRect(mx, my, mw * p, 20);
      // une rangee qui passe sous l'en-tete : son fond glisse dessous, ses textes ne s'ecrivent plus (ils seraient coupes)
      if (my + 4 < haut - 2) return;
      G.txt(x, m.txt, mx + 6, my + 6, '#fff', { contour: K });
      // l'experience d'une mission (Max, 08/11/2026 : « beaucoup plus d'XP ») : J.XP_MISSION ; avant, le double des bobines
      const gx = '+' + milliers(m.xp || J.xpMission(m.k, m.niv)) + ' xp', gb = '+' + m.r, wx = G.txtW(gx), wb = G.txtW(gb);
      G.txt(x, gx, mx + mw - 6 - wx, my + 6, '#7dff8a', { contour: K });
      G.txt(x, gb, mx + mw - 6 - wx - 8 - wb, my + 6, '#ffe27a', { contour: K });
      x.drawImage(G.Rendu.bob[0], mx + mw - 6 - wx - 8 - wb - 13, my + 4);
    });
    x.restore();
    // la barre de defilement : ou l'on est dans la liste
    if (scrollMMax > 0) {
      const bx2 = cx + 156, hh = bas - haut, th = Math.max(12, hh * hh / (hh + scrollMMax)), ty = haut + (hh - th) * scrollM / scrollMMax;
      x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(bx2, haut, 3, hh);
      x.fillStyle = '#ffd54a'; x.fillRect(bx2, Math.round(ty * G.S) / G.S, 3, th);
    }
  }

  /* ---- Pause ---- */
  function ecranPause() {
    if (!aDecor(J.w())) return;
    G.Rendu.scene(x, J.w(), true);
    voile(.55);
    const cx = G.VW / 2;
    G.txt(x, 'SILENCE...', cx, 50, '#ffe27a', { al: .5, sc: 3, contour: K });
    ic(cx - 40, 86, 80, 34, 'jouer', () => { U.ecran = 'jeu'; }, { c: '#c8393b', nom: 'reprendre' });
    const eteint = v => v ? {} : { t: '#666' };
    ic(cx - 66, 130, 36, 26, 'quitter', () => { U.demo(); }, { nom: 'abandon' });
    ic(cx - 18, 130, 36, 26, 'son', () => { G.sav.son = !G.sav.son; G.Audio.reglages(); G.sauver(); }, eteint(G.sav.son));
    ic(cx + 30, 130, 36, 26, 'musique', () => { G.sav.musique = !G.sav.musique; G.Audio.reglages(); G.sauver(); }, eteint(G.sav.musique));
  }

  /* ---- Carnet de tournage : tous les lieux ---- */
  const miniatures = new Map();
  function mini(id) {
    let e = miniatures.get(id);
    if (e) return e;
    e = { ok: false };
    miniatures.set(id, e);
    const pl = (G.SCENES[id] && G.SCENES[id].plaque) || id;
    // miniature : on compose tous les plans du lieu
    const m = D.META[pl];
    Promise.all(m.plans.map((_, i) => G.img('assets/plans/' + pl + '/' + i + '.png'))).then(imgs => {
      const c = G.mkE(480, 216);
      imgs.forEach((im, i) => { if (!m.plans[i].devant) c.x.drawImage(im, 70, 0, 800, im.height, 0, m.plans[i].y / G.S, 480, im.height / G.S); });
      const t = G.mk(140, 63);
      t.x.imageSmoothingEnabled = true;
      t.x.drawImage(c, 0, 0, c.width, c.height, 0, 0, 140, 63);
      e.c = t; e.ok = true; e.grand = c;
      m.plans.forEach((_, i) => G.oublier('assets/plans/' + pl + '/' + i + '.png'));
    }).catch(() => { });
    return e;
  }
  function carnet() {
    x.fillStyle = '#14131c'; x.fillRect(0, 0, G.VW, G.VH);
    const ids = Object.keys(G.SCENES).filter(id => D.META[(G.SCENES[id].plaque) || id]);
    // par lieu
    const parLieu = {};
    for (const id of ids) { const l = J.lieuDe(id); (parLieu[l] = parLieu[l] || []).push(id); }
    // la grille s'ecarte d'une encoche au milieu du bord gauche ou droit (G.bordLibre, 0 sans encoche)
    const mg = Math.max(8, G.bordLibre(22, G.VH, 1)), md = Math.max(4, G.bordLibre(22, G.VH, -1));
    const cols = Math.floor((G.VW - mg - md) / 92);
    // la glissade : elle continue sur sa lancee et ralentit (constante de temps 0,35 s), elle s'arrete aux bouts de la liste
    if (dragY === null && elan) {
      const dt = Math.min(.05, G.dt || 1 / 60);
      scroll += elan * dt;
      elan *= Math.exp(-dt / .35);
      const max = U.scrollMax || 0;
      if (scroll <= 0 || scroll >= max) { scroll = clamp(scroll, 0, max); elan = 0; }
      if (Math.abs(elan) < 6) elan = 0;
    }
    // sur la grille des pixels de l'ecran : la liste ne tremble pas en glissant
    let y = 28 - Math.round(scroll * G.S) / G.S;
    const haut = 22;
    for (const l of Object.keys(parLieu).sort((a, b) => a.localeCompare(b))) {
      if (y > haut - 16 && y < G.VH) G.txt(x, l, mg, y, '#ffe27a');
      y += 11;
      parLieu[l].forEach((id, i) => {
        const cx = mg + (i % cols) * 92, cy = y + ((i / cols) | 0) * 50;
        if (cy > G.VH || cy < haut - 44) return;
        const vu = G.sav.vus[id], plan = G.sav.plans[id];
        x.fillStyle = K; x.fillRect(cx - 1, cy - 1, 86, 40);
        if (vu) {
          const m = mini(id);
          if (m.ok) x.drawImage(m.c, cx, cy);
          if (plan) G.txt(x, '★', cx + 2, cy + 2, '#ffe27a', { contour: K });
          // le nom tient dans la largeur de sa vignette (avant, coupe a 16 lettres, il debordait sur sa voisine)
          let n = (G.SCENES[id].sujet && G.SCENES[id].sujet.n) || '';
          // « Irkoutsk - lac Baikal » trop long : la ville seule, sous le nom du pays
          if (G.txtW(n) > 84 && n.includes(' - ')) n = n.split(' - ')[0];
          if (G.txtW(n) > 84) { while (n.length > 1 && G.txtW(n + '.') > 84) n = n.slice(0, -1).trimEnd(); n += '.'; }
          G.txt(x, n, cx, cy + 40, '#aab', {});
          boutons.push({ px: cx, py: Math.max(cy, haut), w: 84, h: 38, cb: () => U.voir(id), nom: 'decor_' + id });
        } else {
          // pas encore decouvert : il s'achete (Max, 06/11/2026), son prix est dore quand on l'a en poche
          x.fillStyle = '#23222e'; x.fillRect(cx, cy, 84, 38);
          G.txt(x, '?', cx + 42, cy + 5, '#555', { al: .5, sc: 2 });
          const peut = G.sav.bobines >= PRIX_DECOR, t = milliers(PRIX_DECOR), tw = G.txtW(t) + 13, px = Math.round(cx + 42 - tw / 2);
          x.drawImage(G.Rendu.bob[0], px, cy + 24);
          G.txt(x, t, px + 13, cy + 26, peut ? '#ffe27a' : '#6a6878');
          boutons.push({ px: cx, py: Math.max(cy, haut), w: 84, h: 38, cb: () => acheterDecor(id), nom: 'decor_' + id });
        }
      });
      y += Math.ceil(parLieu[l].length / cols) * 50 + 4;
    }
    U.scrollMax = Math.max(0, y + scroll - G.VH + 8);
    x.fillStyle = '#14131c'; x.fillRect(0, 0, G.VW, haut);
    const vus = ids.filter(i => G.sav.vus[i]).length;
    const ent = vus + '/' + ids.length + '   ★' + Object.keys(G.sav.plans).length;
    G.txt(x, ent, G.libre(8, 6, G.txtW(ent), 10, 1), 8, '#7fd0ff');
    // la cagnotte : les decors pas encore decouverts s'achetent avec elle
    cagnotte(retourX() - 8, 5, 2, 1);
    retour();
  }
  // la fenetre d'achat d'un decor : son pays, une carte « ? » ; achete, il est decouvert et on le regarde aussitot
  const acheterDecor = id => ouvrirAchat({ prix: PRIX_DECOR, nom: 'decor', ok: () => { G.sav.vus[id] = 1; G.sauver(); U.voir(id); },
    dessin: (q, cx, cy) => {
      const lieu = J.lieuDe(id) || '';
      G.txt(q, lieu, cx, cy - 18, '#ffe27a', { al: .5, contour: K });
      q.fillStyle = K; q.fillRect(cx - 26, cy - 8, 52, 24);
      q.fillStyle = '#23222e'; q.fillRect(cx - 25, cy - 7, 50, 22);
      q.drawImage(dessinIcone('verrou', '#7a7e90'), cx - 7, cy - 3);
    } });
  U.acheterDecor = acheterDecor;
  /* La vue d'un decor (Max, 04/11/2026) : le vrai decor qui tourne, lentement, avec son titre, ses figurants, ses foules, ses saynetes
     et son sujet, sans le heros, sans structures ni boss (J.voirDecor). En attendant qu'il soit charge, sa miniature. */
  U.voir = id => {
    vueDecor = id; U.ecran = 'vue';
    J.voirDecor(id).catch(e => console.error(e));
  };
  const quitterVue = () => { U.ecran = 'carnet'; J.demarrer(true).catch(e => console.error(e)); };
  function vue() {
    x.fillStyle = '#000'; x.fillRect(0, 0, G.VW, G.VH);
    const id = vueDecor, W = J.w();
    if (W && W.vue && J.pret && W.sc && W.sc.id === id) { J.maj(G.dt); G.Rendu.scene(x, W, false); }
    else { const m = mini(id); if (m.ok) x.drawImage(m.grand, 0, 0, G.VW, 216); }
    boutons.push({ px: 0, py: 0, w: G.VW, h: G.VH, cb: quitterVue });
    retour(quitterVue);
  }

  /* ---- Atelier : ameliorations ---- */
  const ATEL = [
    ['ralenti', 'Ralenti', '', 5],
    ['turbo', 'Turbo', '', 5],
    ['bouclier', 'Bouclier', '', 5],
    ['roquette', 'Roquettes', '', 5],
  ];
  /* Chaque evolution coute plus que la precedente, mais la hausse se tasse au sommet, comme dans la plupart des jeux
     (retour de Max du 03/11/2026) : 150, 450, 1100, 2000, 2800 bobines, soit x3, x2,4, x1,8 puis x1,4.
     Une bonne partie en rapporte environ 340 : la premiere evolution tombe des la premiere partie, la derniere en demande 8. */
  const COUTS_ATELIER = [150, 450, 1100, 2000, 2800];
  const coutA = (k, n) => COUTS_ATELIER[Math.min(n, COUTS_ATELIER.length - 1)];
  U.coutAtelier = n => coutA('', n);
  /* La fenetre d'achat d'une evolution : la medaille telle qu'elle sera, la rangee de pastilles avec la prochaine qui clignote */
  const acheterBonus = (k, max) => {
    const niv = G.sav.atelier[k] || 0;
    if (niv >= max) return;
    ouvrirAchat({ prix: coutA(k, niv), nom: 'bonus', ok: () => { G.sav.atelier[k] = niv + 1; G.sauver(); },
      dessin: (q, cx, cy) => {
        G.Medailles.dessiner(q, k, cx, cy - 4, { seg: max, on: niv + 1 });
        const x0 = cx - (max - 1) * 5;
        for (let j = 0; j < max; j++) G.Medailles.pastille(q, x0 + j * 10, cy + 15, j < niv || (j === niv && Math.sin(G.t * 8) > -.2), 2);
      } });
  };
  function atelier() {
    fondMenu();
    cagnotte(6, 6, 2);
    retour();
    // deux colonnes ; sur un ecran etroit (16:9, tablette : moins de 424 unites), la duree passait sous le bouton du prix
    // (« 5,5 s », « 2 chocs ») : une seule colonne, quatre cartes l'une sous l'autre (tests/ecrans_telephones.js)
    const mg = Math.max(8, G.bordLibre(26, G.VH, 1)), md = Math.max(8, G.bordLibre(26, G.VH, -1)), L = G.VW - mg - md;
    const deux = L >= 408, col = deux ? (L - 8) / 2 : L;
    ATEL.forEach(([k, n, d, max], i) => {
      const cx0 = deux ? mg + (i % 2) * (col + 8) : mg, y = deux ? 28 + ((i / 2) | 0) * 45 : 28 + i * 45;
      const niv = G.sav.atelier[k] || 0;
      // toute la carte s'achete d'un appui : la fenetre dit le prix (Max, 06/11/2026 au soir)
      boutons.push({ px: cx0, py: y, w: col, h: 40, nom: 'bonus-' + k, cb: () => acheterBonus(k, max) });
      x.fillStyle = 'rgba(20,19,28,.82)'; x.fillRect(cx0, y, col, 40);
      // la medaille du bonus, telle qu'en jeu : sa couronne d'or en autant de segments que d'evolutions achetees
      G.Medailles.dessiner(x, k, cx0 + 18, y + 20, { seg: max, on: niv });
      G.txt(x, n, cx0 + 38, y + 8, '#ffe27a');
      for (let j = 0; j < max; j++) G.Medailles.pastille(x, cx0 + 43 + j * 10, y + 27, j < niv, 2);
      // ce que ca donne : la duree du bouton
      if (niv) G.txt(x, k === 'bouclier' ? niv + (niv > 1 ? ' chocs' : ' choc') : k === 'roquette' ? '×' + niv : J.duree(k).toFixed(1).replace('.0', '').replace('.', ',') + ' s', cx0 + 40 + max * 10 + 2, y + 24, '#fff');
      const c = coutA(k, niv);
      if (niv < max) {
        const peut = G.sav.bobines >= c;
        bouton(cx0 + col - 62, y + 12, 56, 22, milliers(c), () => acheterBonus(k, max), { c: peut ? '#2f8f4f' : '#3a3c48', t: peut ? '#fff' : '#888' });
      }
    });
  }

  /* ---- Hangar : qui vole, sur quoi ----
     En pages de 6 (Max, 06/11/2026 : « ajoute plusieurs pages de personnages et de drones ») : fleches, points, et le doigt qui
     glisse ; il s'ouvre sur la page de ce qu'on a choisi. Ce qui est verrouille se montre en silhouette avec son prix, pour donner
     envie : le prochain a gagner brille et dit le chemin fait. */
  let onglet = 'tete', cases = [], tremble = null;
  const PAR_PAGE = 6, page = { tete: null, hangar: null };
  const listeHangar = () => onglet === 'tete' ? G.PERSOS : G.MODELES;
  const nPages = () => Math.ceil(listeHangar().length / PAR_PAGE);
  U.page = n => { page[onglet] = clamp(n, 0, nPages() - 1); };
  U.cases = () => cases.slice();
  U.tremble = () => (tremble ? tremble.id : null);
  const tournerPage = s => { const n = nPages(); if (n < 2) return; page[onglet] = ((page[onglet] || 0) + s + n) % n; G.Audio.sfx('bobine'); };
  U.tournerPage = tournerPage;
  /* Chaque page ne montre que ce qu'elle vend (Max, 07/11/2026 : « sur la page de choix du personnage, mets juste les
     personnages, sans le drone en dessous ; sur la page de choix du drone, ne mets QUE les drones ») : le cadreur seul ou le
     drone seul (G.heroEssai, st.seul), et sur le cote la vitrine du personnage complet, cadreur et drone choisis. */
  const seul = () => onglet === 'tete' ? 'perso' : 'drone';
  const essai = (st, k, id) => k === 'perso' ? G.heroEssai(Object.assign(st, { seul: 'perso' }), id, null) : G.heroEssai(Object.assign(st, { seul: 'drone' }), null, id);
  // le cadre des pixels d'un dessin, sur une seconde d'animation (gardé en memoire) : pour le centrer sans rien couper
  const bornes = new Map();
  function cadreDe(cle, faire) {
    let B = bornes.get(cle);
    if (B) return B;
    B = [1e9, 1e9, -1, -1];
    for (let i = 0; i < 8; i++) {
      const t = i * .2, v = faire({ rot: t * 30, t, flex: .3 + Math.sin(t * 2) * .15, mood: i % 2 ? 'joie' : 'neutre', ang: -.12, meche: 1 + i % 2, lean: Math.sin(t * 1.4) * .3 });
      const d = v.x.getImageData(0, 0, v.width, v.height).data;
      for (let j = 3, n = 0; j < d.length; j += 4, n++) if (d[j]) { const px = n % v.width, py = (n / v.width) | 0; if (px < B[0]) B[0] = px; if (px >= B[2]) B[2] = px + 1; if (py < B[1]) B[1] = py; if (py >= B[3]) B[3] = py + 1; }
    }
    // deux pixels de marge : une pose entre deux de celles-ci deborde parfois un peu (un pan de cape, une pale)
    const L = G.HERO_L;
    B = B[2] < 0 ? [0, 0, 1, 1] : [Math.max(0, B[0] - 2), Math.max(0, B[1] - 2), Math.min(L, B[2] + 2), Math.min(L, B[3] + 2)];
    bornes.set(cle, B);
    return B;
  }
  const cadreSeul = (k, id) => cadreDe(k + ':' + id, st => essai(st, k, id));
  // pose le cadre B d'un dessin centre sur (cx, cy), a sa definition (ech = 1 : un pixel dessine, un pixel affiche) ; renvoie son bas
  const poser = (q, img, B, cx, cy, ech = 1) => {
    const w = B[2] - B[0], h = B[3] - B[1], W = w * ech / G.S, H = h * ech / G.S;
    q.drawImage(img, B[0], B[1], w, h, Math.round((cx - W / 2) * G.S) / G.S, Math.round((cy - H / 2) * G.S) / G.S, W, H);
    return cy + H / 2;
  };
  // une ombre au sol, en deux bandes de pixels : le cadreur seul ne flotte pas dans sa case
  const ombre = (cx, y, w, a = .3) => {
    x.fillStyle = `rgba(0,0,0,${a})`; x.fillRect(Math.round(cx - w / 2), y, Math.round(w), 1);
    x.fillStyle = `rgba(0,0,0,${a * .6})`; x.fillRect(Math.round(cx - w * .7 / 2), y + 1, Math.round(w * .7), 1);
  };
  // une ellipse au pixel de l'ecran (une ligne de pixels a la fois) : l'ombre et la flaque de lumiere de la vitrine ; l, h en unites
  const ellipse = (cx, cy, l, h, col) => {
    const R = Math.max(1, Math.round(h * G.S / 2)), Lp = l * G.S;
    x.fillStyle = col;
    for (let i = 0; i < 2 * R; i++) {
      const v = (i + .5 - R) / R, w = Math.round(Lp * Math.sqrt(1 - v * v) / 2) * 2;
      if (w > 0) x.fillRect((Math.round(cx * G.S) - w / 2) / G.S, (Math.round(cy * G.S) - R + i) / G.S, w / G.S, 1 / G.S);
    }
  };
  /* La vitrine : le personnage complet (cadreur et drone choisis), en grand, qui flotte au-dessus de son ombre sous un projecteur ;
     elle change des qu'on choisit autre chose, et cache le decor qui passe derriere */
  function vitrine(X0) {
    const px = 6, py = 30, pw = X0 - 14, ph = 149;
    x.fillStyle = K; x.fillRect(px - 1, py - 1, pw + 2, ph + 2);
    x.fillStyle = '#1b2030'; x.fillRect(px, py, pw, ph);
    x.fillStyle = '#232a3d'; x.fillRect(px, py, pw, 1);
    const cx = px + pw / 2, sol = py + ph - 16;
    // le projecteur : un faisceau qui s'ouvre du haut vers le sol, ses bords en pente de pixels
    x.fillStyle = 'rgba(255,236,190,.05)';
    for (let yy = py + 1; yy < sol; yy++) { const l = 14 + (yy - py) / (sol - py) * (pw - 36); x.fillRect(Math.round(cx - l / 2), yy, Math.round(l), 1); }
    // le sol, et la flaque de lumiere la ou le faisceau le touche
    x.fillStyle = '#232a3c'; x.fillRect(px, sol, pw, py + ph - sol);
    x.fillStyle = '#2f374f'; x.fillRect(px, sol, pw, 1);
    ellipse(cx, sol + 5, pw - 26, 7, 'rgba(255,236,190,.08)');
    const h = G.sav.heros, m = G.sav.modele, B = cadreDe('tout:' + h + '/' + m, st => G.heroEssai(st, h, m));
    // il flotte : plus il descend, plus son ombre s'elargit et fonce
    const fl = Math.sin(G.t * 2.2), ech = 2, H = (B[3] - B[1]) * ech / G.S, Wd = (B[2] - B[0]) * ech / G.S;
    const cy = Math.max(py + 3 + H / 2, sol - 9 - H / 2) + Math.round(fl * 2 * G.S) / G.S;
    ellipse(cx, sol + 5, Wd * (.55 + fl * .04), 4, `rgba(8,8,16,${.5 + fl * .06})`);
    if (G.heroArc && G.heroArc()) traineeVitrine(B, cx, cy, ech, px, py, pw, ph);
    poser(x, G.heroVignette(apercu({ armure: 0 })), B, cx, cy, ech);
  }
  /* La trainee du drone arc-en-ciel dans la vitrine : le drone y flotte sur place, alors on fait comme s'il volait vers la droite a
     60 unites par seconde ; chaque colonne de pixels a gauche de lui reprend la hauteur qu'il avait il y a un instant. Elle part de
     l'arriere du drone et va jusqu'au bord de la vitrine, comme en partie (render.js : trainee). */
  const ARC_V = ['255,74,90', '255,154,58', '255,225,74', '74,216,106', '58,160,255', '154,90,255'];
  function traineeVitrine(B, cx, cy, ech, px, py, pw, ph) {
    const A = G.HERO_A, k = ech / G.S, H = (B[3] - B[1]) * k, Wd = (B[2] - B[0]) * k;
    const pix = 1 / G.S, flotte = t => Math.round(Math.sin(t * 2.2) * 2 * G.S) / G.S;
    const x0 = Math.round((cx - Wd / 2 + (A.x - 29 - B[0]) * k) * G.S) / G.S, y0 = cy - H / 2 + (A.y - 13 - B[1]) * k - flotte(G.t);
    const larg = x0 - px - 1;
    for (let d = 0; d < larg; d += pix) {
      const u = d / larg, al = u < .7 ? 1 : u < .85 ? .75 : .5;
      const yy = Math.round((y0 + flotte(G.t - d / 60)) * G.S) / G.S;
      for (let b = 0; b < 6; b++) { x.fillStyle = `rgba(${ARC_V[b]},${al})`; x.fillRect(x0 - d - pix, yy + b * 2 * k, pix, 2 * k); }
    }
    // des etincelles qui scintillent sur la trainee
    for (let i = 0; i < 4; i++) {
      const d = (i * 23 + 9) % Math.max(10, larg), s = Math.sin(G.t * 6 + i * 2.1);
      if (s < .3) continue;
      const ex = Math.round((x0 - d) * G.S) / G.S, ey = Math.round((y0 + flotte(G.t - d / 60) + (i % 2 ? -2 * pix : 12 * k + pix)) * G.S) / G.S;
      x.fillStyle = '#ffffff'; x.fillRect(ex, ey, pix, pix);
      x.fillStyle = 'rgba(255,243,176,.8)'; x.fillRect(ex - pix, ey, pix, pix); x.fillRect(ex + pix, ey, pix, pix); x.fillRect(ex, ey - pix, pix, pix); x.fillRect(ex, ey + pix, pix, pix);
    }
  }
  const silh = new Map();
  // la silhouette d'un personnage ou d'un drone pas encore gagne : sa forme, d'un bleu nuit, cernee d'un trait plus clair
  function silhouette(e, k = seul()) {
    const cle = k + e.id;
    let s = silh.get(cle);
    if (s) return s;
    const st = { rot: 1, t: .4, flex: .3, mood: 'neutre', ang: -.12, meche: 1 };
    const v = essai(st, k, e.id);
    s = G.mk(v.width, v.height);
    const sx = s.x;
    sx.drawImage(v, 0, 0);
    sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#5a6488'; sx.fillRect(0, 0, s.width, s.height);
    const t = G.mk(v.width, v.height);
    t.x.drawImage(v, 0, 0); t.x.globalCompositeOperation = 'source-in'; t.x.fillStyle = '#121624'; t.x.fillRect(0, 0, s.width, s.height);
    sx.globalCompositeOperation = 'source-over';
    // l'interieur sombre (la forme rongee d'un pixel de chaque cote) : il reste un liseré clair tout autour
    const e2 = G.mk(v.width, v.height);
    e2.x.drawImage(t, 1, 0); e2.x.globalCompositeOperation = 'destination-in';
    e2.x.drawImage(t, -1, 0); e2.x.drawImage(t, 0, 1); e2.x.drawImage(t, 0, -1);
    sx.drawImage(e2, 0, 0);
    silh.set(cle, s);
    return s;
  }
  const apercu = (st) => Object.assign({ rot: G.t * 30, t: G.t, flex: .3 + Math.sin(G.t * 2) * .15, mood: 'joie', ang: -.12, lean: Math.sin(G.t * 1.4) * .3, meche: 1 + (G.t * 6 | 0) % 2 }, st);
  /* Acheter un personnage ou un drone (Max, 06/11/2026 au soir) : la fenetre le montre avec son prix ; achete, il est a nous et on
     le prend aussitot. Tant qu'il n'est pas paye, il reste en silhouette, meme dans la fenetre (Max, 07/11/2026 : « garder en
     silhouette tant que l'achat n'est pas fait » ; avant, la fenetre le devoilait en couleurs) : on le decouvre en l'achetant. */
  const acheterObjet = (k, id) => ouvrirAchat({ prix: G.prix(k, id), nom: k, h: 128,
    ok: () => {
      const a = G.sav.achats = G.sav.achats || { perso: {}, drone: {} };
      (a[k] = a[k] || {})[id] = 1;
      if (k === 'perso') G.sav.heros = id; else G.sav.modele = id;
      G.heroReset(); G.sauver();
      if (U.vu) U.vu('hangar');
    },
    // sa silhouette seule, qui flotte doucement : on devine ce qu'on va decouvrir
    dessin: (q, cx, cy) => {
      const B = cadreSeul(k, id), fl = Math.round(Math.sin(G.t * 2.4) * 1.5 * G.S) / G.S;
      poser(q, silhouette({ id }, k), B, cx, cy + fl);
    } });
  U.acheterObjet = acheterObjet;
  function perso() {
    fondMenu(.78);
    // la grille commence a X0 : la vitrine prend la place a gauche
    const X0 = 158, CW = 64, CH = 58, GAP = 4;
    vitrine(X0);
    retour();
    [['tete', 'heros'], ['hangar', 'drones'], ['visage', 'reglage']].forEach(([n, nom], i) => {
      if (n === 'visage' && G.sav.heros !== 'moi') return;
      ic(G.libre(8, 3, 104, 20, 1) + i * 36, 3, 32, 20, n, () => { onglet = n; }, { c: onglet === n ? '#b8862a' : '#2b2d3c', nom });
    });
    if (onglet === 'visage' && G.sav.heros !== 'moi') onglet = 'tete';
    if (onglet === 'visage') {
      const O = G.HERO_OPT;
      ['cheveux', 'couleur', 'barbe', 'lunettes', 'peau', 'tee'].forEach((k, i) => {
        const y = 30 + i * 29, opts = O[k], v = G.sav.perso[k], nom = Array.isArray(opts[v]) ? opts[v][0] : opts[v];
        bouton(X0, y, 28, 24, '<', () => { G.sav.perso[k] = (v - 1 + opts.length) % opts.length; G.heroReset(); G.sauver(); });
        G.txt(x, nom, X0 + 76, y + 8, '#fff', { al: .5 });
        bouton(X0 + 124, y, 28, 24, '>', () => { G.sav.perso[k] = (v + 1) % opts.length; G.heroReset(); G.sauver(); });
      });
      return;
    }
    const liste = listeHangar(), np = nPages();
    if (page[onglet] === null) { const i = liste.findIndex(e => e.id === (onglet === 'tete' ? G.sav.heros : G.sav.modele)); page[onglet] = Math.max(0, Math.floor(i / PAR_PAGE)); }
    const pg = page[onglet] = clamp(page[onglet], 0, np - 1);
    const k = onglet === 'tete' ? 'perso' : 'drone';
    // la cagnotte, au-dessus de la grille : tout ce qui n'est pas encore a nous s'achete avec elle
    cagnotte(X0, 6, 2);
    if (tremble && (tremble.t -= G.dt) <= 0) tremble = null;
    cases = [];
    liste.slice(pg * PAR_PAGE, pg * PAR_PAGE + PAR_PAGE).forEach((e, i) => {
      cases.push(e.id);
      let cx0 = X0 + (i % 3) * (CW + GAP);
      const y = 30 + ((i / 3) | 0) * (CH + GAP);
      const ok = G.possede(k, e.id), sp = !!e.special;
      const pris = onglet === 'tete' ? G.sav.heros === e.id : G.sav.modele === e.id;
      if (tremble && tremble.id === e.id) cx0 += Math.round(Math.sin(tremble.t * 60) * 2);
      // ce qu'on peut s'offrir avec la cagnotte : un cadre dore qui pulse et un prix dore
      const prix = ok || sp ? 0 : G.prix(k, e.id), suivant = !ok && !sp && G.sav.bobines >= prix;
      // un objet special (le drone arc-en-ciel, la star) : un cadre d'or qui scintille, gagne ou pas
      x.fillStyle = pris ? '#ffd54a' : sp ? (Math.sin(G.t * 3) > 0 ? '#ffd54a' : '#b8862a') : suivant && Math.sin(G.t * 4) > 0 ? '#b8862a' : K; x.fillRect(cx0 - 1, y - 1, CW + 2, CH + 2);
      x.fillStyle = ok ? '#2b3a50' : '#191c26'; x.fillRect(cx0, y, CW, CH);
      // l'objet seul, entier, a sa definition, centre sur ses propres pixels
      const B = cadreSeul(k, e.id), mx = cx0 + CW / 2;
      if (ok) {
        const st = { rot: (pris ? G.t * 30 : 1), t: pris ? G.t : 1, flex: .3, mood: pris ? 'joie' : 'neutre', ang: -.12 };
        const v = essai(st, k, e.id);
        if (k === 'perso') {
          // le cadreur sans son drone se tient sur son ombre
          const cy = y + CH / 2 - 1.5;
          ombre(mx, Math.round(cy + (B[3] - B[1]) / G.S / 2) + 1, (B[2] - B[0]) / G.S * .75);
          poser(x, v, B, mx, cy);
        } else poser(x, v, B, mx, y + CH / 2);
        boutons.push({ px: cx0, py: y, w: CW, h: CH, nom: 'choix-' + e.id, cb: () => { if (onglet === 'tete') G.sav.heros = e.id; else G.sav.modele = e.id; G.heroReset(); G.sauver(); G.Audio.sfx('bobine'); } });
      } else if (sp) {
        /* Le drone et le personnage des deux derniers rangs (Max, 08/11/2026 : « qu'on ne peut pas acheter ») : en silhouette, sans
           prix ; en bas, l'icone de la carriere et le rang qui le donne (s'il tient) ; un appui ouvre la carriere sur ce rang */
        const ri = J.rangDe(k, e.id), rn = J.RANGS[ri].n;
        poser(x, silhouette(e), B, mx, y + (CH - 14) / 2);
        x.drawImage(dessinIcone('verrou', '#ffe27a'), cx0 + CW - 16, y + 1);
        x.fillStyle = 'rgba(10,10,18,.75)'; x.fillRect(cx0, y + CH - 14, CW, 14);
        const tw = G.txtW(rn), lg = 14.4 + (tw <= CW - 22 ? 3 + tw : 0), xi = Math.round((cx0 + (CW - lg) / 2) * G.S) / G.S;
        x.drawImage(dessinIcone('carriere', '#ffe27a'), xi, y + CH - 14);
        if (tw <= CW - 22) G.txt(x, rn, xi + 17.4, y + CH - 11, '#ffe27a');
        boutons.push({ px: cx0, py: y, w: CW, h: CH, nom: 'carriere-' + e.id, cb: () => { rangVu = ri; retourCarriere = 'perso'; U.ecran = 'carriere'; G.Audio.sfx('bobine'); } });
      } else {
        // sa silhouette : on devine ce qu'on va gagner
        poser(x, silhouette(e), B, mx, y + (CH - 14) / 2);
        x.drawImage(dessinIcone('verrou', suivant ? '#ffe27a' : '#8a90a8'), cx0 + CW - 16, y + 1);
        x.fillStyle = 'rgba(10,10,18,.75)'; x.fillRect(cx0, y + CH - 14, CW, 14);
        x.drawImage(G.Rendu.bob[suivant ? (G.t * 10 | 0) & 7 : 0], cx0 + 3, y + CH - 13);
        G.txt(x, milliers(prix), cx0 + 16, y + CH - 11, suivant ? '#ffe27a' : '#9a9cb0');
        if (!suivant) {
          // ce qu'il manque dans la cagnotte : la jauge du chemin fait
          const f = clamp(G.sav.bobines / Math.max(1, prix), 0, 1);
          x.fillStyle = '#3a3c48'; x.fillRect(cx0 + 3, y + CH - 3, CW - 6, 2);
          x.fillStyle = '#ffd54a'; x.fillRect(cx0 + 3, y + CH - 3, Math.round((CW - 6) * f), 2);
        }
        // un appui : la fenetre d'achat, ou il reste en silhouette jusqu'a ce qu'on l'ait paye
        boutons.push({ px: cx0, py: y, w: CW, h: CH, nom: 'achat-' + e.id, cb: () => acheterObjet(k, e.id) });
      }
    });
    // les pages : deux fleches et un point par page
    if (np > 1) {
      const yP = 30 + 2 * (CH + GAP) + 3, larg = 3 * (CW + GAP) - GAP;
      bouton(X0, yP, 30, 22, '<', () => tournerPage(-1)); boutons[boutons.length - 1].nom = 'pagePrec';
      bouton(X0 + larg - 30, yP, 30, 22, '>', () => tournerPage(1)); boutons[boutons.length - 1].nom = 'pageSuiv';
      const ecart = 12, xd = X0 + larg / 2 - (np - 1) * ecart / 2;
      for (let i = 0; i < np; i++) {
        const px = Math.round(xd + i * ecart), cur = i === pg;
        x.fillStyle = K; x.fillRect(px - 4, yP + 7, 8, 8);
        x.fillStyle = cur ? '#ffd54a' : '#4a4c5a'; x.fillRect(px - 3, yP + 8, 6, 6);
        if (cur) { x.fillStyle = '#fff4a8'; x.fillRect(px - 3, yP + 8, 6, 1); }
        boutons.push({ px: px - 6, py: yP, w: 12, h: 22, nom: 'page-' + i, cb: () => { page[onglet] = i; G.Audio.sfx('bobine'); } });
      }
    }
  }

  /* ---- Reglages : des interrupteurs ---- */
  function reglages() {
    fondMenu();
    retour();
    const cx = G.VW / 2, y = 80, w = 52, gap = 12, eteint = v => v ? {} : { t: '#555', c: '#1f1e2a' };
    const vib = typeof navigator.vibrate === 'function', nb = vib ? 4 : 3;
    const x0 = cx - (nb * w + (nb - 1) * gap) / 2;
    ic(x0, y, w, 44, 'son', () => { G.sav.son = !G.sav.son; G.Audio.init(); G.Audio.reglages(); G.sauver(); }, eteint(G.sav.son));
    ic(x0 + w + gap, y, w, 44, 'musique', () => { G.sav.musique = !G.sav.musique; G.Audio.init(); G.Audio.reglages(); G.sauver(); }, eteint(G.sav.musique));
    if (vib) ic(x0 + 2 * (w + gap), y, w, 44, 'vibre', () => { G.sav.vibre = !G.sav.vibre; G.sauver(); G.vibre('click'); }, eteint(G.sav.vibre));
    ic(x0 + (nb - 1) * (w + gap), y, w, 44, 'film', async () => { G.VISITE = { i: 0, n: 0 }; await J.demarrer(true); U.ecran = 'visite'; }, { c: '#2f6fb5', nom: 'visite' });
  }

  /* Tous les decors l'un apres l'autre, sans obstacle : pour les regarder */
  function visite() {
    const W = J.w();
    if (W && W.sc) { J.maj(G.dt); G.Rendu.scene(x, W, false); G.txt(x, G.VISITE.i + ' / ' + G.VISITE.n, 8, 8, '#fff', { contour: K }); }
    retour(() => U.fermerVisite());
  }
  U.fermerVisite = () => { G.VISITE = null; U.ecran = 'accueil'; J.demarrer(true); };

  /* ---- Galerie : la vraie photo dans son cadre, devant le decor qui en est tire ---- */
  const gal = { i: 0, sc: null, wx: 0, charge: null, chemin: null };
  const GAL_BORD = U.GAL_BORD = 28;
  const imgPhoto = () => document.getElementById('photo');
  function photoCourante() { const l = G.photosVisibles(); return l.length ? l[clamp(gal.i, 0, l.length - 1)] : null; }
  async function chargerGal() {
    const ph = photoCourante();
    if (!ph) return;
    const im = imgPhoto();
    im.style.opacity = 0;
    const id = ph[0], ticket = gal.charge = {};
    // sans son decor, la photo s'affiche quand meme sur le decor precedent
    const sc = await D.charger(id, 2000).catch(e => { console.error(e); return null; });
    if (gal.charge !== ticket) { if (sc) D.liberer(sc); return; }
    if (sc) {
      sc.x0 = 0;
      if (gal.sc) D.liberer(gal.sc);
      gal.sc = sc; gal.wx = 0;
    }
    const chemin = 'assets/photos/' + (ph[3] || id) + '.jpg';
    im.onload = () => { im.style.opacity = 1; };
    if (im.getAttribute('src') !== chemin) im.src = chemin; else im.style.opacity = 1;
  }
  // i : la photo a montrer d'abord (une photo qu'on vient de gagner) ; depuis : l'ecran ou revenir en fermant
  U.ouvrirGalerie = (i, depuis) => {
    gal.i = clamp(i !== undefined && i !== null ? i : (G.sav.photoI || 0), 0, Math.max(0, G.photosVisibles().length - 1));
    gal.retour = depuis || 'accueil';
    U.ecran = 'galerie';
    imgPhoto().style.display = 'block';
    chargerGal();
  };
  U.fermerGalerie = () => {
    const im = imgPhoto(); im.style.display = 'none'; im.style.opacity = 0;
    G.sav.photoI = gal.i; G.sauver();
    gal.charge = null;
    if (gal.sc) { D.liberer(gal.sc); gal.sc = null; }
    U.ecran = gal.retour || 'accueil';
    gal.retour = null;
  };
  const changerPhoto = sens => {
    const n = G.photosVisibles().length;
    if (n < 2) return;
    gal.i = (gal.i + sens + n) % n;
    G.Audio.sfx('bobine');
    chargerGal();
  };
  U.gal = gal; U.changerPhoto = changerPhoto;
  U.fin = () => fin;
  function galerie() {
    x.fillStyle = '#14131c'; x.fillRect(0, 0, G.VW, G.VH);
    const ph = photoCourante();
    if (gal.sc) {
      gal.wx += G.dt * 16;
      D.fond(x, gal.sc, gal.wx, 0, G.t);
      D.fxMaj && D.fxMaj(gal.sc, G.dt, gal.wx);
      D.fxDessine && D.fxDessine(x, gal.sc, 'avant', gal.wx, 0, G.t);
      D.devant(x, gal.sc, gal.wx, 0, G.t);
    }
    if (ph) {
      // la photo garde ses proportions ; le cadre l'epouse
      const hMax = 152, wMax = 316, k = Math.min(hMax / ph[2], wMax / ph[1]);
      const w = Math.round(ph[1] * k), h = Math.round(ph[2] * k), px = Math.round(G.VW / 2 - w / 2), py = Math.round(30 + (hMax - h) / 2);
      cadre(px, py, w, h, J.lieuDe(ph[0]));
      const c = cv.getBoundingClientRect(), e = c.width / G.VW, s = imgPhoto().style;
      s.left = (c.left + px * e) + 'px'; s.top = (c.top + py * e) + 'px'; s.width = (w * e) + 'px'; s.height = (h * e) + 'px';
      const n = G.photosVisibles().length;
      if (n > 1) {
        // les fleches a GAL_BORD du bord (Max, 05/11/2026 : « ca tombe sur la camera frontale » : au milieu du bord, en paysage,
        // le trou de la camera du Pixel 6, d'un cote ou de l'autre selon le sens du telephone ; tests/galerie.js)
        ic(G.libre(GAL_BORD, G.VH / 2 - 20, 28, 40, 1), G.VH / 2 - 20, 28, 40, 'retour', () => changerPhoto(-1), { nom: 'avant' });
        // la fleche de droite : l'icone retournee
        const gxD = G.libre(G.VW - GAL_BORD - 28, G.VH / 2 - 20, 28, 40, -1);
        bouton(gxD, G.VH / 2 - 20, 28, 40, '', () => changerPhoto(1));
        boutons[boutons.length - 1].nom = 'apres';
        x.save(); x.translate(gxD + 14, G.VH / 2); x.scale(-1, 1); x.drawImage(dessinIcone('retour', '#f4f0e0'), -7.2, -7.2); x.restore();
      }
      // ce sont les vraies photos des tournages de Max : on le dit (demande de Max, 02/11/2026)
      const tg = 'PHOTOS DE TOURNAGE  ' + (gal.i + 1) + ' / ' + G.PHOTOS.length;
      G.txt(x, tg, G.libre(8, 6, G.txtW(tg), 10, 1), 8, '#fff', { contour: K });
    }
    retour(() => U.fermerGalerie());
    // la prochaine photo : une jauge, sans phrase
    const sp = G.seuilPhoto();
    if (sp) {
      const cx = G.VW / 2, w = 90, py = G.VH - 10, k = clamp(1 - (sp - G.sav.cumul) / 70, 0, 1);
      x.fillStyle = K; x.fillRect(cx - w / 2 - 1, py - 1, w + 2, 5);
      x.fillStyle = '#3a3c48'; x.fillRect(cx - w / 2, py, w, 3);
      x.fillStyle = '#ffd54a'; x.fillRect(cx - w / 2, py, w * k, 3);
      x.drawImage(G.Rendu.bob[(G.t * 8 | 0) & 7], cx - w / 2 - 13, py - 4);
    }
  }
  /* Un cadre de bois dore, d'un seul tenant, avec son clou, sa ficelle et sa petite plaque */
  function cadre(px, py, w, h, lieu) {
    const m = 9, A = px - m, B = py - m, W2 = w + m * 2, H2 = h + m * 2;
    // la ficelle et le clou
    x.fillStyle = '#2a2230';
    for (let i = 0; i < 26; i++) { const k = i / 25; x.fillRect(G.VW / 2 + (A + 20 - G.VW / 2) * k, 8 + (B - 8) * k, 1, 1); x.fillRect(G.VW / 2 + (A + W2 - 20 - G.VW / 2) * k, 8 + (B - 8) * k, 1, 1); }
    x.fillStyle = '#17151f'; x.fillRect(G.VW / 2 - 2, 6, 4, 4); x.fillStyle = '#c6ccd8'; x.fillRect(G.VW / 2 - 1, 6, 2, 1);
    // l'ombre portee
    x.fillStyle = 'rgba(10,8,20,.42)'; x.fillRect(A + 4, B + 5, W2, H2);
    const couche = (d, c) => { x.fillStyle = c; x.fillRect(A + d, B + d, W2 - d * 2, H2 - d * 2); };
    couche(0, K); couche(1, '#7c5222'); couche(2, '#c8933e'); couche(3, '#e2b45c'); couche(4, '#b07c30'); couche(6, '#7c5222'); couche(7, '#ecd9a8'); couche(8, K);
    // lumiere en haut et a gauche, ombre en bas et a droite
    x.fillStyle = '#f6dc94'; x.fillRect(A + 2, B + 2, W2 - 4, 1); x.fillRect(A + 2, B + 2, 1, H2 - 4);
    x.fillStyle = '#6a4418'; x.fillRect(A + 2, B + H2 - 3, W2 - 4, 1); x.fillRect(A + W2 - 3, B + 2, 1, H2 - 4);
    // moulures, et coins ouvrages
    x.fillStyle = 'rgba(106,68,24,.65)';
    for (let i = A + 12; i < A + W2 - 12; i += 6) { x.fillRect(i, B + 4, 2, 1); x.fillRect(i + 3, B + H2 - 5, 2, 1); }
    for (let j = B + 12; j < B + H2 - 12; j += 6) { x.fillRect(A + 4, j, 1, 2); x.fillRect(A + W2 - 5, j + 3, 1, 2); }
    for (const [a, b] of [[A, B], [A + W2 - 10, B], [A, B + H2 - 10], [A + W2 - 10, B + H2 - 10]]) {
      x.fillStyle = K; x.fillRect(a, b, 10, 10);
      x.fillStyle = '#f0cf7a'; x.fillRect(a + 1, b + 1, 8, 8);
      x.fillStyle = '#b07c30'; x.fillRect(a + 3, b + 3, 4, 4);
      x.fillStyle = '#fff4c8'; x.fillRect(a + 4, b + 4, 2, 2);
    }
    // la plaque du lieu
    const l = G.txtW(lieu) + 10, cx = G.VW / 2, y = B + H2 - 3;
    x.fillStyle = K; x.fillRect(cx - l / 2 - 1, y - 1, l + 2, 13);
    x.fillStyle = '#e8c878'; x.fillRect(cx - l / 2, y, l, 11);
    x.fillStyle = '#fff0b8'; x.fillRect(cx - l / 2, y, l, 1);
    G.txt(x, lieu, cx, y + 2, '#3a2a14', { al: .5 });
  }

  /* Le visualiseur des decors pilote le jeu de l'exterieur */
  U.vitrine = async id => {
    await J.demarrer(true);
    await J.allerA(id);
    const W = J.w();
    W.sc.len = 1e9; W.nextP = true; W.vitrine = true; W.spawnFoule = 4;
    U.ecran = 'vitrine';
  };
  U.vitrineFoule = i => J.vitrineFoule(i);
  U.vitrineJeu = on => { J.vitrineJeu(on); };
  U.vitrineTitre = (t, s) => { const W = J.w(); if (W) W.titre = { t, s, T: 3.4 }; };

  function chargement() {
    x.fillStyle = '#0a0a10'; x.fillRect(0, 0, G.VW, G.VH);
    const cx = G.VW / 2;
    G.txt(x, 'MOTEUR...', cx, 90, '#ffe27a', { al: .5, sc: 2 });
    x.drawImage(G.Rendu.bob[(G.t * 12 | 0) & 7], cx - 5, 112);
  }

  /* ---- Entree ---- */
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * G.VW / r.width, (e.clientY - r.top) * G.VH / r.height];
  }
  function clic(px, py) {
    for (let i = boutons.length - 1; i >= 0; i--) {
      const b = boutons[i];
      if (px >= b.px && px <= b.px + b.w && py >= b.py && py <= b.py + b.h) { G.Audio.init(); G.Audio.sfx('clic'); G.vibre('tick'); b.cb(); return true; }
    }
    return false;
  }
  const doigts = new Set();
  let turboDoigt = null;
  function installerEntree() {
    // les appuis s'ecoutent sur toute la page : dans les bandes noires d'une tablette, un appui fait aussi monter le drone
    const surface = document;
    surface.addEventListener('pointerdown', e => {
      if (window.innerWidth < window.innerHeight) return;   // « Tourne ton telephone » est affiche
      e.preventDefault();
      const [px, py] = pos(e);
      G.Audio.init();
      if (U.ecran === 'jeu') {
        const Pz = G.Rendu.hudPos().pause;
        if (px > Pz[0] - 6 && py < Pz[1] + Pz[3] + 6) { U.ecran = 'pause'; J.appui(false); doigts.clear(); return; }
        const B = G.BTN, bt = J.boutons();
        for (let i = 0; i < bt.length; i++) {
          // la zone d'appui est plus large que la medaille : toute la hauteur de sa rangee, pastilles comprises
          const Y = B.y + i * B.pas, m = (B.pas - B.c) / 2;
          if (px < B.x + B.c + 12 && py > Y - m && py < Y + B.c + m) { J.activer(bt[i]); if (bt[i] === 'turbo') turboDoigt = e.pointerId; return; }
        }
        doigts.add(e.pointerId);
        J.appui(true);
        return;
      }
      // un appui pendant la glissade l'arrete : ce n'est pas un choix de decor
      tapMoved = Math.abs(elan) > 40 || Math.abs(elanM) > 40;
      dragY = py; dragX = px; dragS = scroll; dragSM = scrollM; elan = 0; elanM = 0; traces = [[performance.now(), py]];
    });
    surface.addEventListener('pointermove', e => {
      if (dragY === null) return;
      const [px, py] = pos(e);
      if (Math.abs(py - dragY) > 4 || (dragX !== null && Math.abs(px - dragX) > 4)) tapMoved = true;
      if (U.ecran === 'carnet') scroll = clamp(dragS + dragY - py, 0, U.scrollMax || 0);
      if (U.ecran === 'carriere') scrollM = clamp(dragSM + dragY - py, 0, scrollMMax);
      const t = performance.now();
      traces.push([t, py]);
      while (traces.length > 2 && t - traces[0][0] > 90) traces.shift();
    });
    const up = e => {
      if (e.pointerId === turboDoigt) { turboDoigt = null; J.relacher('turbo'); }
      if (U.ecran === 'jeu') { doigts.delete(e.pointerId); if (!doigts.size) J.appui(false); return; }
      if (dragY !== null && !tapMoved) { const [px, py] = pos(e); clic(px, py); }
      // le hangar : un doigt qui glisse de cote tourne la page
      if (dragY !== null && tapMoved && U.ecran === 'perso' && dragX !== null) {
        const [px, py] = pos(e), dx = px - dragX;
        if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(py - dragY)) U.tournerPage(dx < 0 ? 1 : -1);
      }
      // le doigt part : sa vitesse des 90 dernieres millisecondes devient l'elan (s'il etait encore en mouvement)
      if (dragY !== null && tapMoved && (U.ecran === 'carnet' || U.ecran === 'carriere') && traces.length > 1) {
        const [t1, y1] = traces[traces.length - 1], [t0, y0] = traces[0], dtm = t1 - t0;
        const arret = performance.now() - t1 > 80;
        const v = !arret && dtm > 8 ? clamp(-(y1 - y0) / dtm * 1000, -2600, 2600) : 0;
        if (U.ecran === 'carnet') elan = v; else elanM = v;
      }
      dragY = null;
    };
    surface.addEventListener('pointerup', up);
    surface.addEventListener('pointercancel', e => { if (e.pointerId === turboDoigt) { turboDoigt = null; J.relacher('turbo'); } doigts.delete(e.pointerId); if (!doigts.size) J.appui(false); dragY = null; });
    window.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp') { if (U.ecran === 'jeu') J.appui(true); } if (e.code === 'Escape') U.retour(); });
    window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp') { if (U.ecran === 'jeu') J.appui(false); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden && U.ecran === 'jeu') { U.ecran = 'pause'; J.appui(false); } G.sauver(); });
    window.addEventListener('resize', adapte);
  }
  /* Bouton retour d'Android : renvoie 'exit' s'il faut quitter */
  U.retour = () => {
    if (achat) { achat = null; return 'ok'; }
    if (U.ecran === 'visite') { U.fermerVisite(); return true; }
    if (U.ecran === 'galerie') { U.fermerGalerie(); return true; }
    const e = U.ecran;
    if (e === 'jeu') { U.ecran = 'pause'; J.appui(false); return 'ok'; }
    if (e === 'pause') { U.ecran = 'jeu'; return 'ok'; }
    if (e === 'fin') { U.demo(); return 'ok'; }
    if (e === 'vue') { U.ecran = 'carnet'; return 'ok'; }
    if (e === 'carnet' || e === 'atelier' || e === 'perso' || e === 'reglages' || e === 'carriere') { U.ecran = 'accueil'; return 'ok'; }
    return 'exit';
  };

  /* ---- Boucle ---- */
  let tPrec = 0;
  function image(ts) {
    requestAnimationFrame(image);
    const dt = Math.min(.05, (ts - tPrec) / 1000 || .016);
    tPrec = ts;
    U.fpsT = (U.fpsT || 0) + dt; U.fpsN = (U.fpsN || 0) + 1;
    if (U.fpsT > 3) { const fps = U.fpsN / U.fpsT; U.fps = fps; if (fps < 40) G.PERF_BAS = true; else if (fps > 56) G.PERF_BAS = false; U.fpsT = 0; U.fpsN = 0; }
    G.t += dt; G.dt = dt;
    boutons = [];
    x.imageSmoothingEnabled = false;
    try {
      switch (U.ecran) {
        case 'charge': chargement(); G.Audio.moteur(false); break;
        case 'visite': visite(); G.Audio.moteur(false); break;
        case 'vitrine': { const W = J.w(); if (W && W.sc) { J.maj(dt); G.Rendu.scene(x, W, false); } break; }
        case 'galerie': galerie(); G.Audio.moteur(false); break;
        case 'accueil': accueil(); G.Audio.moteur(false); break;
        case 'jeu': { const W = J.w(); if (!aDecor(W)) { G.Audio.moteur(false); break; } J.maj(dt); G.Rendu.scene(x, W, true); G.Audio.moteur(W.vivant, W.hold); break; }
        case 'pause': ecranPause(); G.Audio.moteur(false); break;
        case 'fin': ecranFin(); G.Audio.moteur(false); break;
        case 'carnet': carnet(); break;
        case 'vue': vue(); break;
        case 'atelier': atelier(); break;
        case 'perso': perso(); break;
        case 'reglages': reglages(); break;
        case 'carriere': carriere(); break;
      }
      if (achat) { if (achat.ecran !== U.ecran) achat = null; else fenetreAchat(); }
      G.Classement.dessiner(x, dt);
    } catch (e) { console.error(e); }
  }

  U.init = async () => {
    cv = document.getElementById('jeu');
    x = cv.getContext('2d', { alpha: false });
    G.ecran(x);
    adapte();
    U.encoches();          // les encoches de l'ecran, donnees par la coque Android
    installerEntree();
    G.charger();
    // une sauvegarde d'avant la boutique garde ce que son cumul avait debloque (gains.js)
    G.migrerAchats();
    // les seuils de la carriere ont monte le 08/11/2026 : ce qu'on avait gagne aux derniers rangs reste a nous
    J.garderSpeciaux();
    // le record garde sur le telephone part sur le classement Google Play Jeux (classement.js)
    G.Classement.sync();
    requestAnimationFrame(image);
    await D.init();
    if (window.AndroidBridge && AndroidBridge.setDark) { try { AndroidBridge.setDark(true); } catch (e) { /* absent */ } }
    await U.demo();
  };
})();
