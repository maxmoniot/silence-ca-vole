/* La partie : drone, obstacles, bonus, figurants, tournage, transitions. */
'use strict';
(function () {
  const J = G.Jeu = {};
  const { clamp, rnd, irnd, pick, lerp } = G;
  const HX = 112;              // position du drone a l'ecran
  const D = G.Decor;

  /* ---- Etat ---- */
  let W = null;
  J.w = () => W;

  /* La vitesse du defilement en partie : de V0 a VMAX en V_DUREE secondes de jeu (tests/acceleration.js) */
  J.V0 = 212; J.VMAX = 440; J.V_DUREE = 180;

  /* Le vol du drone, le meme partout : en partie, pour les robots des tests (tests/passage.js) et pour le pilote de la page des boss.
     Max, 05/11/2026 : « quand on touche l'ecran le personnage principal est trop reactif ». Avant : une poussee de 2400 contre un
     poids de 700, 320 de vitesse verticale, et un appui coupait net 70 % de la chute : une touche breve le lancait de 40 unites,
     lache en pleine montee il filait encore 70 unites plus haut. Il repond toujours tout de suite, mais plus calmement
     (tests/commandes.js). Sous l'eau, rien ne change : il y est deja lent.
     g = poids, th = poussee, monte / chute = vitesses verticales maximales, coupe = part de la chute gardee a l'appui. */
  const VOL = J.VOL = {
    air: { g: 620, th: 1560, monte: 250, chute: 270, coupe: .55 },
    eau: { g: 240, th: 950, monte: 170, chute: 161.5, coupe: .3 },
  };
  J.pasVol = (y, vy, hold, dt, eau, haut, a0) => {
    const m = eau ? VOL.eau : VOL.air;
    vy += ((hold ? m.g - m.th : m.g) + (a0 || 0)) * dt;
    vy = clamp(vy, -m.monte, m.chute);
    if (eau) vy *= (1 - dt * 1.6);
    y += vy * dt;
    if (y < haut + 8) { y += (haut + 8 - y) * Math.min(1, dt * 8); vy = Math.max(0, vy); }
    if (y > G.SOL) { y = G.SOL; vy = Math.min(0, vy); }
    return [y, vy];
  };
  // le temps pour descendre (dy > 0) ou monter de dy, en l'air, depuis l'arret, avec les vitesses maximales
  const tVol = (h, a, vm) => { const d0 = vm * vm / (2 * a); return h <= d0 ? Math.sqrt(2 * h / a) : vm / a + (h - d0) / vm; };
  J.tVol = dy => dy > 0 ? tVol(dy, VOL.air.g, VOL.air.chute) : tVol(-dy, VOL.air.th - VOL.air.g, VOL.air.monte);

  const POUVOIRS = {
    ralenti: { n: 'Ralenti', c: '#c79bff' },
    turbo: { n: 'Turbo', c: '#7dff8a' },
    bouclier: { n: 'Bouclier', c: '#6fe6ff' },
    roquette: { n: 'Roquette', c: '#ff8a4a' },
  };
  J.POUVOIRS = POUVOIRS;
  /* La carriere : de stagiaire a l'Oscar. Chaque rang debloque quelque chose qu'on voit et qu'on sent.
     Les seuils (Max, 08/11/2026, apres la 1.16 : « renforce un peu la difficulte pour passer les paliers d'XP, on arrive trop
     facilement au bout du jeu », puis « de plus en plus difficile, il faudrait que pour atteindre le dernier palier il faille faire
     entre 200 et 300 parties moyennes (environ 2 500 m) ») : les missions rapportent 400 a 4 000 xp (1.15) et il y en a douze en cours
     (1.17) ; puis (apres la 1.17) « le nombre d'XP me semble trop grand, le dernier palier doit etre atteint avec 200 000 xp » :
     l'Oscar a 200 000 et tout ce qui rapporte de l'experience divise par dix (J.XP_MISSION, J.calculXP), pour garder la meme duree.
     Une partie moyenne de 2 500 m reussit pres de six missions et rapporte environ 800 xp (simulation de 400 parties avec le vrai jeu,
     tests/paliers_xp.js) ; chaque rang demande plus de parties que le precedent, environ 250 pour l'Oscar (avec les seuils de la 1.16 :
     250, 700, 1 500, 3 000, 5 500, 9 000, 14 000, 21 000, 30 000, 45 000, l'Oscar venait en 6). */
  // c : la recompense en court, pour la liste des rangs de l'ecran de la carriere (ui.js : carriere, Max, 07/11/2026)
  const RANGS = J.RANGS = [
    { n: 'Stagiaire', xp: 0, r: '', c: 'Le début' },
    { n: 'Porteur de café', xp: 650, r: 'Un cœur de plus', c: 'Un cœur de plus', armure: 1 },
    { n: 'Perchman', xp: 2200, r: 'Bobine de départ +50', c: '+50 bobines au départ', bonus: 'depart' },
    { n: 'Assistant caméra', xp: 5000, r: 'Un cœur de plus', c: 'Un cœur de plus', armure: 2 },
    { n: 'Cadreur', xp: 10000, r: 'Le ralenti dure 15 % de plus', c: 'Ralenti 15 % plus long', bonus: 'duree' },
    { n: 'Chef opérateur', xp: 19500, r: 'Un cœur de plus', c: 'Un cœur de plus', armure: 3 },
    { n: 'Monteur de génie', xp: 33000, r: 'Les grosses bobines valent le double', c: 'Grosses bobines ×2', bonus: 'grosses' },
    { n: 'Réalisateur', xp: 52000, r: 'Un cœur de plus', c: 'Un cœur de plus', armure: 4 },
    // (avant le 06/11/2026 : une Prise 2 offerte ; la reprise se paie maintenant 10 000 et seulement apres un record battu, ui.js)
    { n: 'Star de Deauville', xp: 79000, r: 'Bobines de départ +150', c: '+150 bobines au départ', bonus: 'depart2' },
    /* Les deux derniers rangs donnent ce qui ne s'achete pas (Max, 08/11/2026 : « le dernier palier doit etre un personnage special
       qu'on ne peut pas acheter, et l'avant-dernier un drone special ») : le drone arc-en-ciel et la star en smoking (speciaux.js) */
    { n: 'Palme d\'or', xp: 127000, r: 'Le drone Arc-en-ciel et un cœur de plus', c: 'Drone Arc-en-ciel + un cœur', armure: 5, drone: 'arcenciel' },
    { n: 'Oscar', xp: 200000, r: 'La star en smoking, qui brille', c: 'La star en smoking', bonus: 'gloire', perso: 'star' },
  ];
  J.rangIndex = () => { let i = 0; const xp = G.sav.xp || 0; RANGS.forEach((r, k) => { if (xp >= r.xp) i = k; }); return i; };
  /* Ce qu'on gagne en remplissant la jauge de l'Oscar (Max, 08/11/2026, apres la 1.18 : « il ne faut pas de palier supplementaire,
     juste quelque chose a gagner a la fin, par exemple en atteignant 300 000 XP : 1 coeur de plus, du temps de bouclier en plus, un
     bonus inedit qui fait exploser tous les obstacles a l'ecran, et le personnage qui sort son Oscar regulierement ») : pas de rang
     de plus ; la jauge de l'Oscar va de 200 000 a 300 000 (ui.js, carriere) et au bout : un septieme coeur, un bouclier qui encaisse
     deux chocs de plus, le bouton 'oscar' (explosionOscar) et la statuette brandie (hero.js). Controle : tests/oscar_final.js. */
  const XP_FINAL = J.XP_FINAL = 300000;
  J.FINAL = { n: 'La statuette d\'or', c: 'Cœur, bouclier, bonus explosif' };
  J.final = () => (G.sav.xp || 0) >= XP_FINAL;
  /* Ce qu'une sauvegarde avait deja gagne aux deux derniers rangs avec les seuils d'avant le 08/11/2026, elle le garde : une fois,
     au premier lancement de la 1.17, son rang est recompte avec les anciens seuils et le drone ou la star notes dans ses achats. */
  const SEUILS_116 = [0, 250, 700, 1500, 3000, 5500, 9000, 14000, 21000, 30000, 45000];
  J.garderSpeciaux = () => {
    if (G.sav.seuils2) return;
    G.sav.seuils2 = 1;
    let i = 0; SEUILS_116.forEach((s, k) => { if ((G.sav.xp || 0) >= s) i = k; });
    const a = G.sav.achats = G.sav.achats || { perso: {}, drone: {} };
    RANGS.forEach((r, k) => { if (k > i) return; if (r.drone) (a.drone = a.drone || {})[r.drone] = 1; if (r.perso) (a.perso = a.perso || {})[r.perso] = 1; });
    G.sauver();
  };
  // le rang qui donne un drone ou un personnage special (-1 : il s'achete)
  J.rangDe = (k, id) => RANGS.findIndex(r => (k === 'drone' ? r.drone : r.perso) === id);
  J.aBonus = b => RANGS.slice(0, J.rangIndex() + 1).some(r => r.bonus === b);
  J.armureMax = () => RANGS.slice(0, J.rangIndex() + 1).reduce((m, r) => Math.max(m, r.armure || 0), 0);
  const nivAtelier = k => G.sav.atelier[k] || 0;
  /* Ralenti : une duree. Turbo : une jauge, en secondes. Bouclier : un nombre de chocs. Roquette : un nombre de tirs. Tout depend de ce qu'on a achete. */
  J.duree = k => k === 'turbo' ? 1 + .8 * Math.max(1, nivAtelier(k)) : (2.5 + 1.5 * Math.max(1, nivAtelier(k))) * (J.aBonus('duree') ? 1.15 : 1);
  J.coeursMax = () => 1 + J.armureMax() + (J.final() ? 1 : 0);
  // au plus 6 coeurs, deux lignes de 3 en haut a gauche (Max, 08/11/2026 : « laisse le maximum de coeurs a 6 » ; le 07/11 : 8, sur
  // deux lignes de 4) ; la carriere en donne 6, un coeur ramasse en partie rend un coeur perdu (avant le 07/11, chaque coeur ramasse en
  // ajoutait un, sans limite : 26 apres vingt coeurs, tests/coeurs.js)
  const COEURS_MAX = J.COEURS_MAX = 6;
  // la statuette d'or (300 000 xp) en donne un septieme, a droite des autres (render.js, coeurPlace)
  const plafondCoeurs = J.plafondCoeurs = () => COEURS_MAX + (J.final() ? 1 : 0);
  const RECHARGE_RALENTI = 40, RECHARGE_OSCAR = J.RECHARGE_OSCAR = 45;
  const btNeuf = () => ({
    ralenti: { n: nivAtelier('ralenti') ? 1 : 0, rech: 0 },
    turbo: { jauge: nivAtelier('turbo') ? J.duree('turbo') : 0, cap: J.duree('turbo') },
    bouclier: { n: nivAtelier('bouclier') ? 1 : 0 },
    roquette: { n: nivAtelier('roquette') },
    // le bonus de la statuette d'or : une charge au depart, puis 45 s de recharge apres chaque explosion
    oscar: { n: J.final() ? 1 : 0, rech: 0 },
  });
  const dispoBt = (k, b) => k === 'turbo' ? b.jauge > 0 : b.n > 0;
  J.boutons = () => Object.keys(POUVOIRS).filter(k => nivAtelier(k) > 0 || (W && W.bt && (W.bt[k].vu || dispoBt(k, W.bt[k]))))
    .concat(W && W.bt && W.bt.oscar && J.final() ? ['oscar'] : []);
  /* Ce que le bouton doit montrer, sans un mot (medailles.js) : pret ou non, la jauge (couronne d'or), les charges (pastilles),
     en marche ; seg / on : la couronne du bouclier en segments, un par choc qui reste */
  J.etatBouton = k => {
    const b = W && W.bt && W.bt[k];
    if (!b) return { pret: false, jauge: 0, n: 0 };
    if (k === 'turbo') return { pret: b.jauge > .05, jauge: b.jauge / Math.max(b.cap, .1), n: 0, actif: W.turbo };
    if (k === 'ralenti') { const on = W.pouv.ralenti > 0; return { pret: b.n > 0 && !on, jauge: on ? W.pouv.ralenti / J.duree(k) : b.n > 0 ? 1 : 1 - b.rech / RECHARGE_RALENTI, n: b.n, actif: on }; }
    if (k === 'bouclier') { const on = W.bouclierN > 0; return { pret: b.n > 0 && !on, jauge: b.n > 0 || on ? 1 : 0, n: b.n, actif: on, seg: on ? Math.max(W.bouclierMax || 0, W.bouclierN) : 0, on: W.bouclierN }; }
    if (k === 'oscar') return { pret: b.n > 0, jauge: b.n > 0 ? 1 : 1 - b.rech / RECHARGE_OSCAR, n: 0, actif: false };
    return { pret: b.n > 0, jauge: b.n > 0 ? 1 : 0, n: b.n, actif: W.st && W.st.bazooka > 0 };
  };
  const cibleRoquette = () => {
    // un boss dans l'image : c'est lui qu'on vise, a toutes les phases (entree, combat, fuite)
    if (W.boss && G.Boss.visible(W)) return { boss: true };
    let best = null;
    for (const o of W.obs) {
      if (o.mort || !['struct', 'sprite', 'vol', 'veh', 'guide', 'col'].includes(o.k)) continue;
      const x = o.x - (o.w || 0) / 2;
      if (o.x + (o.w || 0) / 2 < HX || x > G.VW + 90) continue;
      if (!best || x < best.x - (best.w || 0) / 2) best = o;
    }
    return best;
  };
  J.activer = k => {
    if (!W || !W.vivant || W.demo || !W.bt) return false;
    const b = W.bt[k];
    if (!b) return false;
    if (k === 'ralenti') { if (b.n <= 0 || W.pouv.ralenti > 0) return false; b.n--; b.rech = RECHARGE_RALENTI; W.pouv.ralenti = J.duree(k); annonce(); mission('ralenti', 1); }
    else if (k === 'oscar') { if (b.n <= 0) return false; b.n--; b.rech = RECHARGE_OSCAR; explosionOscar(); }
    else if (k === 'turbo') { if (b.jauge <= .05) return false; W.turbo = true; G.Audio && G.Audio.sfx('pouvoir'); }
    // la statuette d'or : deux chocs de plus a chaque bouclier (« du temps de bouclier en plus »)
    else if (k === 'bouclier') { if (b.n <= 0 || W.bouclierN > 0) return false; b.n--; W.bouclierMax = W.bouclierN = Math.max(1, nivAtelier(k)) + (J.final() ? 2 : 0); annonce(); }
    else if (k === 'roquette') {
      if (b.n <= 0 || W.feu) return false;
      const c = cibleRoquette();
      // rien a viser : le bouton tremble et rougit, sans un mot
      if (!c) { G.Medailles && G.Medailles.refus(W, k); G.vibre('tick'); return false; }
      b.n--; W.feu = { T: .3, c }; W.st.bazooka = 1.1; W.regardR = null;
      G.Audio && G.Audio.sfx('siffle');
      mission('roquettes', 1);
    }
    mission('pouvoirs', k === 'turbo' ? 0 : 1);
    return true;
  };
  J.relacher = k => { if (W && k === 'turbo') W.turbo = false; };
  // un bonus declenche : le son, la vibration, le heros content ; le bouton s'allume, pas de texte
  function annonce() { G.Audio && G.Audio.sfx('pouvoir'); G.vibre('rise'); W.st.moodT = .8; W.st.mood = 'joie'; }
  /* Les bonus du parcours se font attendre de plus en plus, jusqu'a un plafond (retour de Max du 03/11/2026) :
     le premier peut venir a 12 s de jeu, puis 18, 27, 40 s apres chaque bonus ramasse, et jamais plus de 55 s.
     Un bonus manque revient deux fois plus vite, sans allonger l'attente. */
  const DELAI_BONUS = [12, 18, 27, 40, 55];
  J.delaiBonus = n => DELAI_BONUS[Math.min(n, DELAI_BONUS.length - 1)];
  const bonusPret = () => W.tJeu >= W.bonusT && !W.items.some(i => i.k === 'pouv');
  function poserBonus(x, y) {
    const l = Object.keys(POUVOIRS).filter(k => k !== W.bonusDernier);
    W.bonusDernier = pick(l);
    W.bonusT = W.tJeu + J.delaiBonus(W.bonusN) / 2;
    return { k: 'pouv', p: W.bonusDernier, x, y };
  }
  // ramasse sur le parcours : la medaille file vers son bouton (qui apparait s'il n'y etait pas) et l'allume
  function gagnerBonus(p, px, py) {
    const b = W.bt[p]; b.vu = true;
    if (p === 'turbo') { b.cap = Math.max(b.cap, 1.8); b.jauge = Math.min(b.cap, b.jauge + 1.5); }
    else b.n++;
    W.bonusN++; W.bonusT = W.tJeu + J.delaiBonus(W.bonusN);
    G.Medailles && G.Medailles.gagne(W, p, px, py);
    G.Audio && G.Audio.sfx('pouvoir'); G.vibre('rise');
    if (Math.random() < .5) dire('pouvoir');
  }
  /* La roquette : elle part du bazooka, file sur sa cible, et toute la structure saute */
  function majRoquettes(dt) {
    if (W.feu) {
      W.feu.T -= dt;
      if (W.feu.T <= 0) {
        const c = W.feu.c; W.feu = null;
        W.roquettes = W.roquettes || [];
        W.roquettes.push({ x: HX + 26, y: W.y - 25, vx: 420, vy: 0, c, T: 0 });
        W.secousse = Math.max(W.secousse, 2.5);
        G.Audio && G.Audio.sfx('tir');
        eff(12, HX + 30, W.y - 25, ['#fff4a8', '#ffb545', '#8a8a8a']);
      }
    }
    if (W.st.bazooka > 0) W.st.bazooka -= dt;
    if (!W.roquettes) return;
    for (const r of W.roquettes) {
      r.T += dt; r.ox = r.x; r.oy = r.y;
      const c = r.c, bo = c.boss && W.boss;
      let tx = r.x + 300, ty = r.y;
      if (bo) {
        // la ou il sera quand elle arrivera (il est dessine decale de la camera, la roquette non)
        const b = W.boss, t = Math.min(.4, Math.hypot(b.x - r.x, b.y + W.camY - r.y) / Math.max(400, Math.hypot(r.vx, r.vy)));
        tx = b.x + (b.mvx || 0) * t; ty = b.y + W.camY + (b.mvy || 0) * t;
      }
      if (!bo && !c.mort) {
        let dm = 1e9;
        for (const q of capsules(c)) { const dx = q[2] - q[0], dy = q[3] - q[1], k = clamp(((r.x - q[0]) * dx + (r.y - q[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1), px = q[0] + dx * k, py = q[1] + dy * k, d = Math.hypot(px - r.x, py - r.y); if (d < dm) { dm = d; tx = px; ty = py; } }
        if (!capsules(c).length) { tx = c.x; ty = c.yc !== undefined ? c.yc : c.y; }
      }
      const a = Math.atan2(ty - r.y, tx - r.x), sp = 420 + r.T * 800;
      r.vx += (Math.cos(a) * sp - r.vx) * Math.min(1, dt * 10); r.vy += (Math.sin(a) * sp - r.vy) * Math.min(1, dt * 10);
      r.x += r.vx * dt; r.y += r.vy * dt; r.a = Math.atan2(r.vy, r.vx);
      if (Math.random() < dt * 60) G.FX.fumee(W, r.x - 6, r.y, { ton: 'suie', r0: 0, r1: rnd(1.5, 3), T: rnd(.3, .6), vx: -W.v * .5 });
      // sur un boss, elle eclate des qu'elle touche son dessin (toucherBoss, apres qu'il a bouge) ; sinon, a l'arrivee
      if (!bo && Math.hypot(tx - r.x, ty - r.y) < 16) { r.fin = true; exploser(r, c); }
      else if (r.T > 2.5 || r.x > G.VW + 150 || r.x < -150) r.fin = true;
    }
    W.roquettes = W.roquettes.filter(r => !r.fin);
  }
  /* Une roquette qui arrive sur l'animal eclate sur lui, quelle que soit sa cible (Max, 06/11/2026 : elle lui passait au travers).
     Appele apres le mouvement du boss : son trajet de l'image est suivi dans le repere de l'animal (G.Boss.contact). */
  function toucherBoss() {
    if (!W.boss || !W.roquettes || !W.roquettes.length) return;
    for (const r of W.roquettes) {
      if (r.ox === undefined) continue;
      const p = G.Boss.contact(W, r.ox, r.oy, r.x, r.y, r.a);
      if (p) { r.x = p[0]; r.y = p[1]; r.fin = true; exploser(r, { boss: true }); }
    }
    W.roquettes = W.roquettes.filter(r => !r.fin);
  }
  const pointeX = o => o.k === 'struct' ? o.x + (o.segs[0].ax + o.segs[0].bx) / 2 : o.x;
  const pointeY = o => o.k === 'struct' ? (o.segs[0].ay + o.segs[0].by) / 2 : (o.yc !== undefined ? o.yc : o.y);
  function exploser(r, c) {
    W.secousse = Math.max(W.secousse, 7); W.flash = Math.max(W.flash, .1);
    G.FX.crash && G.FX.crash(W, r.x, r.y);
    G.Audio && G.Audio.sfx('boum'); G.vibre('heavy');
    if (c.boss) { if (W.boss) G.Boss.blesser(W, .34); return; }
    // toute la section saute, d'un coup
    const bande = c.bande;
    for (const o of W.obs) if (o === c || (bande && o.bande === bande)) if (!o.mort && o.k !== 'courant') casser(o);
  }

  function nouveauMonde(demo) {
    return {
      demo, x: 0, v: demo ? 120 : 172, T: 0, tJeu: 0, sc: null, next: null, nextP: null, trans: null,
      y: 100, vy: 0, hold: false, st: G.heroState(), vivant: true, mortT: 0, rot: 0,
      obs: [], items: [], figs: [], parts: [], tirs: [], bulles: [], textes: [],
      spawnX: 500, spawnFig: 1.2, spawnGag: 3, spawnItem: 0, sujet: null, sujetFait: false,
      pouv: {}, invinc: 0, ech: 1, sous: false, lettres: {}, combo: 0, comboT: 0,
      bob: 0, frole: 0, detruit: 0, plansN: 0, nouveaux: [], ras: 0, plongees: 0, tRas: 0,
      prise2: 0, bulleT: 4, camY: 0, secousse: 0, flash: 0, ventF: 0, ventT: 3, vusRun: [],
      hist: [], tStats: { pigeon: 0 }, cible: null, renverses: 0, vies: J.coeursMax(), viesMax: J.coeursMax(), bt: btNeuf(), bouclierN: 0, turbo: false, boutonsT: 7, bonusN: 0, bonusT: DELAI_BONUS[0], bossT: demo ? 1e9 : rnd(20, 28), bossN: 0, barrageT: rnd(16, 22), solT: 0, hautT: 0, missT: rnd(5, 8), palier: 1, recordFait: false, nidT: 7, grossesN: 0,
    };
  }

  /* ---- Choix des decors ---- */
  function listeDecors() {
    const l = Object.keys(G.SCENES).filter(id => (D.META[id] || D.META[(G.SCENES[id].plaque)]) && !G.SCENES[id].debut);
    if (G._force) return [G._force];
    // l'accueil ne montre que les decors deja decouverts en jeu (Max, 04/11/2026) ; avant toute partie, le metro d'ou elle part
    if (W && W.demo) { const vus = l.filter(id => G.sav.vus && G.sav.vus[id]); return vus.length ? vus : ['metro']; }
    return l;
  }
  function choisir(mode) {
    if (G.VISITE) { const t = Object.keys(G.SCENES).filter(id => D.META[id]); G.VISITE.n = t.length; return t[G.VISITE.i++ % t.length]; }
    const l = listeDecors();
    const dernier = W.hist.slice(-1)[0];
    const recents = W.hist.slice(-12);
    let cand = l.filter(id => !recents.includes(id));
    if (mode === 'eau') cand = cand.filter(id => G.SCENES[id].r === 'sousmarin' && (!dernier || lieuDe(id) === lieuDe(dernier) || Math.random() < .15));
    else cand = cand.filter(id => G.SCENES[id].r !== 'sousmarin');
    if (!cand.length) cand = l.filter(id => (mode === 'eau') === (G.SCENES[id].r === 'sousmarin'));
    if (!cand.length) cand = l;
    // priorite aux decors jamais vus : c'est ce qui donne envie de continuer
    const neufs = cand.filter(id => !G.sav.vus[id]);
    if (neufs.length && Math.random() < .75) cand = neufs;
    // on reste dans le meme pays le temps de 2 ou 3 decors, comme un chapitre, puis on change de theme
    const lieuDernier = dernier && lieuDe(dernier);
    const memes = cand.filter(id => lieuDe(id) === lieuDernier);
    if (mode !== 'eau' && dernier !== 'metro' && W.themeReste > 0 && memes.length) {
      W.themeReste--;
      return pick(memes);
    }
    const autres = cand.filter(id => !dernier || lieuDe(id) !== lieuDernier);
    if (autres.length) cand = autres;
    W.themeReste = irnd(1, 2);
    return pick(cand);
  }
  const lieuDe = J.lieuDe = id => (G.SCENES[id] && G.SCENES[id].lieu) || (D.META[id] && D.META[id].lieu) || '';

  async function prepare(mode) {
    const id = choisir(mode);
    // on a le temps de profiter de chaque decor
    const len = G.VISITE ? 2100 : W.demo ? 2400 : (mode === 'eau' ? rnd(24, 32) : rnd(32, 45)) * Math.max(W.v, 170);
    return D.charger(id, len);
  }

  function installer(sc) {
    sc.x0 = W.x;
    W.sc = sc;
    if (G.Boss && G.Boss.changeDecor) G.Boss.changeDecor(W);
    D.ambActive = sc.m.amb;
    W.hist.push(sc.id);
    W.sujet = null; W.sujetFait = false;
    W.sujetX = W.x + sc.len * (sc.type === 'eau' ? rnd(.12, .25) : rnd(.35, .6));
    const reg = G.REGIONS[sc.def.r];
    W.reg = reg;
    const kt = kit();
    for (const n of [].concat(kt.sol || [], kt.arche || [], kt.pend || [], kt.ciel || [])) if (D.existe(n)) D.spr(n, 'l');
    if (!W.demo) { W.figs = W.figs.filter(f => f.x < G.VW * .6); W.groupes = []; for (const f of W.figs) { f.gag = true; f.role = null; if (f.v > 0) f.v = 0; } }
    // ce qui reste a l'image du decor d'avant doit pouvoir vivre ici (Max, 03/11/2026) : pas de nageur a moitie dans la terre ferme,
    // pas de plongeur ni de poisson hors de l'eau, personne qui marche sur la mer ou au fond de l'eau. En jeu comme sur l'ecran d'accueil.
    const surEau = !!sc.def.flotte && sc.type !== 'eau', sousEau = sc.type === 'eau';
    W.figs = W.figs.filter(f => f.nageur ? surEau : f.pose === 'plonge' || f.nage ? sousEau : !(f.d && (surEau || sousEau)));
    W.foules = 0;
    W.spawnFoule = rnd(5, 9);
    // arrivee dans un nouveau pays : le titre du chapitre, comme au cinema
    const lieuNouveau = lieuDe(sc.id);
    if (lieuNouveau !== W.lieuCourant && !W.demo) { W.titre = { t: sc.def.lieuTitre || lieuNouveau, s: (sc.def.sujet && sc.def.sujet.n) || sc.def.sousTitre || '', T: 3.4 }; }
    W.lieuCourant = lieuNouveau;
    if (!W.demo) {
      if (!G.sav.vus[sc.id]) {
        G.sav.vus[sc.id] = 1; W.nouveaux.push(sc.id); G.sauver();
        const n = Object.keys(G.sav.vus).length;
        
      }
      W.bulleT = Math.min(W.bulleT, 1.5);
      W.lieuT = 4;
    }
    G.Audio && G.Audio.region(reg.musique, sc.def.r === 'sousmarin');
  }

  /* Un monde qu'on quitte (nouvelle partie, partie quittee, vue d'un decor, J.allerA) : on oublie les plans de son decor, du decor
     suivant deja prepare et de ceux d'une transition en cours. Avant, seule la fin d'une transition liberait le decor quitte : une
     session de quelques dizaines de parties gardait 13,5 Mo de plans decodes par partie (19 decors apres 8 parties ; la Switch
     montait a 1 Go apres dix minutes d'essais). Controle : tests/memoire_decors.js. */
  function oublierMonde(M, garder) {
    if (!M) return;
    for (const sc of new Set([M.sc, M.next, M.trans && M.trans.a, M.trans && M.trans.b])) if (sc && sc !== garder) D.liberer(sc);
  }

  J.demarrer = async demo => {
    const ancien = W;
    W = nouveauMonde(demo);
    oublierMonde(ancien);
    G.FX.nouveau(W);
    W.cumul0 = G.sav.cumul;
    W.photos0 = G.photosVisibles().length; W.photosIds0 = G.photosVisibles().map(p => p[0]);
    J.pret = false;
    const sc = await D.charger(G.VISITE ? choisir() : demo ? pick(listeDecors()) : 'metro', G.VISITE ? 2100 : demo ? 2600 : 210 * 11);
    installer(sc);
    if (!demo) { G.FX.lancerPercee(W); W.percee.titre = W.titre; W.titre = null; G.sav.parties++; missionsDebut(); if (J.aBonus('depart')) { G.gagne(50); W.bob += 50; } if (J.aBonus('depart2')) { G.gagne(150); W.bob += 150; } }
    J.pret = true;
    W.nextP = null;
  };

  /* Voir un decor depuis le carnet (Max, 04/11/2026 : « le voir avec toutes les animations, comme dans l'app de notation, le titre et
     les sprites, sans le personnage principal, sans les structures, sans les boss, en vitesse lente ») : ce decor seul, jamais de
     changement, a 60 au lieu de 120 ; ses figurants, foules, saynetes et son sujet, qui repasse de temps en temps sans etre filme. */
  J.voirDecor = async id => {
    const ancien = W;
    W = nouveauMonde(true);
    oublierMonde(ancien);
    W.vue = true; W.sansHeros = true; W.v = 60; W.bossT = 1e9;
    G.FX.nouveau(W);
    J.pret = false;
    const sc = await D.charger(id, 1e7);
    installer(sc);
    W.titre = { t: sc.def.lieuTitre || lieuDe(id), s: (sc.def.sujet && sc.def.sujet.n) || sc.def.sousTitre || '', T: 3.4 };
    W.sujetX = W.x + 120;
    J.pret = true;
    W.nextP = null;
  };

  /* Va directement a un decor (tests et carnet) */
  J.allerA = async id => { const sc = await D.charger(id, 7000); const ancien = { sc: W.sc, next: W.next, trans: W.trans }; installer(sc); oublierMonde(ancien, sc); W.titre = null; W.nextP = true; W.percee = null; W.heroDx = 0; W.trans = null; W.next = null; };

  /* ---- Entree ---- */
  // un appui pendant la chute en freine une partie tout de suite (VOL.coupe), le reste vient de la poussee
  J.appui = v => { if (W) { if (v && !W.hold) { W.appuis = (W.appuis || 0) + 1; if (W.vivant && W.vy > 0) W.vy *= (W.sous ? VOL.eau : VOL.air).coupe; } W.hold = v; } };

  /* ---- Bulles et repliques ---- */
  function direH(t, T) { if (!W.bulleH) W.bulleH = { t, T }; }
  function dire(cat) {
    const l = G.REPLIQUES_HEROS[cat];
    if (l) direH(pick(l), 1.8);
  }
  // qui parle deja finit sa phrase
  function bulleFig(f, t) { if (f.bulleT > 0) return; f.bulle = t; f.bulleT = 1.5; }

  /* ---- Tournage ---- */
  const DIST_FILM = 165;
  function majSujet(dt) {
    const sc = W.sc, def = sc.def;
    if (!def.sujet || W.trans) return;
    if (!W.sujet && !W.sujetFait && W.x >= W.sujetX && (!W.demo || W.vue) && !W.boss) {
      const m = def.sujet;
      const iR = m.mode === 'route' ? sc.plans.findIndex(p => p.k === 'route') : -1;
      // mode 'plan' : le sujet vit a une profondeur du decor (la tortue de nuit, Max 04/11/2026 : « mets-la au 3e plan ») ;
      // il est dessine juste apres le plan m.plan, le plan suivant passe devant ses pieds, il defile a la vitesse m.f
      const iP = m.mode === 'plan' ? m.plan : -1;
      const sp = D.spr(m.s, m.t || 'l');
      // un galopeur qui accompagne le drone arrive de derriere, par la gauche (majGalopeur)
      const x0 = m.accompagne && m.mode === 'sol' ? -sp.w / 2 - 6 : G.VW + sp.w / 2 + 30;
      const y = iR >= 0 ? sc.plans[iR].y + 12.5 : iP >= 0 ? (sc.plans[iP + 1] ? D.crete(sc, iP + 1, x0) + 3 : G.SOLF) : m.mode === 'quai' ? 158 : m.mode === 'vol' ? rnd(50, 110) : m.mode === 'eau' ? rnd(70, 140) : m.mode === 'cable' ? 62 : G.SOLF;
      if (!D.existe(m.s)) { W.sujetFait = true; return; }
      W.sujet = { s: m.s, taille: m.t || 'l', x: x0, y, v: Math.min(m.v, .68), mode: m.mode, n: m.n, prog: 0, T: 0, ok: false, plan: iR, planD: iP, f: m.f };
      // accompagne : il nage un moment avec nous, devant le drone, puis se laisse distancer (la tortue a balise du lagon, Max,
      // 04/11/2026 : « qu'elle vienne nager un peu avec nous, comme la baleine et son petit a la Reunion »)
      if (m.accompagne) W.sujet.acc = m.accompagne;
      if (m.mode === 'quai') { W.sujet.quai = true; W.sujet.arrete = true; }
      if (!W.vue) W.textes.push({ t: 'À FILMER : ' + m.n, c: '#ff8a7a', y: 30, T: 2.4 });
    }
    const s = W.sujet;
    if (!s) return;
    s.T += dt;
    const xAv = s.x;
    if (s.quai) majRame(s, dt);
    else if (s.acc !== undefined && s.mode === 'sol') majGalopeur(s, dt);
    else if (s.acc !== undefined) majCompagnon(s, dt);
    else s.x -= W.v * W.ech * (s.f || (s.plan >= 0 ? sc.plans[s.plan].f : 1)) * (1 - s.v) * dt;
    // la distance que le sujet parcourt au sol : au sol, le sol defile a W.v sous lui et il avance de (s.x - xAv) a l'ecran ; un
    // galopeur y cale ses images (le sabot pose ne glisse pas). Ailleurs, il va a v fois la vitesse du sol.
    s.sol = (s.sol || 0) + (s.mode === 'sol' ? W.v * W.ech * dt + (s.x - xAv) : W.v * W.ech * s.v * dt);
    if (s.planD >= 0 && sc.plans[s.planD + 1]) s.y = D.crete(sc, s.planD + 1, s.x) + 3;
    const sp = D.spr(s.s, s.taille || 'l');
    const cx = s.x, cy = s.y - sp.h * .5;
    const dx = cx - HX, dy = cy - (W.y - 14);
    if (!W.vue && !W.sujetFait && dx > -130 && dx < DIST_FILM + 80 && Math.abs(dy) < 92 && W.vivant) {
      s.vise = true;
      s.prog += dt / 0.95;
      if (s.prog >= 1 && !W.sujetFait) {
        W.sujetFait = true;
        W.plansN++;
        const neuf = !G.sav.plans[sc.id];
        if (neuf) { G.sav.plans[sc.id] = 1; }
        const gain = neuf ? 80 : 30;
        G.gagne(gain); W.bob += gain;
        G.sauver();
        W.textes.push({ t: 'PLAN RÉUSSI ! ' + s.n, c: '#7dff8a', y: 44, T: 2.4, big: 0 });
        W.textes.push({ t: (neuf ? '★ ' : '') + '+' + gain + ' bobines', c: '#fff', y: 56, T: 2.2 });
        dire('plan');
        G.Audio && G.Audio.sfx('plan');
        G.vibre('double');
        mission('plans', 1);
        s.ok = true;
      }
    } else s.vise = false;
    if (s.mode === 'eau' && sp.h > 40) surfBaleine(s, sp, dt);
    // un sujet porte par un acteur peut rester longtemps dans l'image : on arrete de le filmer, l'acteur continue sa vie
    if (s.x < -sp.w - 60 || s.T > 20 + (def.sujet.accompagne || 0)) {
      W.sujet = null; W.sujetFait = true;
      // dans la vue du carnet, le sujet repasse un peu plus tard
      if (W.vue) { W.sujetFait = false; W.sujetX = W.x + rnd(300, 500); W.titre = { t: def.lieuTitre || lieuDe(W.sc.id), s: (def.sujet && def.sujet.n) || def.sousTitre || '', T: 3.4 }; }
    }
  }

  /* Un compagnon de nage : il arrive, se place devant le drone et nage a sa vitesse (il suit doucement son altitude, sans jamais
     se mettre dessus), puis ralentit, le drone le depasse et il sort par la gauche. */
  /* Un galopeur au premier plan (le cheval noir d'Irlande, Max, 05/11/2026 : « il court sur place, il est bien anime mais il
     n'avance pas ») : plus lent que le drone, il reculait a l'ecran exactement au rythme de la cloture derriere lui (plan a .48 pour
     un cheval a .5) et semblait galoper sur un tapis. C'est maintenant un travelling : il arrive de derriere par la gauche, double le
     drone, galope a sa hauteur le temps de `accompagne` secondes en avancant sur tout le paysage, puis ralentit jusqu'a son galop de
     croisiere (v) et se laisse distancer. Ses images suivent la distance qu'il parcourt au sol (majSujet). Controle : tests/galop.js. */
  function majGalopeur(s, dt) {
    const v = W.v * W.ech, place = HX + 96;
    if (!s.phase) s.phase = 'arrive';
    if (s.phase === 'arrive') {
      // il remonte le drone, de moins en moins vite en approchant de sa place
      s.x += Math.min(85, 1.4 * Math.max(0, place - s.x) + 12) * dt;
      if (s.x >= place - 3) s.phase = 'avec';
    } else if (s.phase === 'avec') {
      s.acc -= dt;
      s.x += (place + Math.sin(s.T * .9) * 12 - s.x) * Math.min(1, dt * 1.5);
      if (s.acc <= 0) { s.phase = 'part'; s.vr = 0; }
    } else {
      // il ralentit en une seconde environ jusqu'a son galop de croisiere, et sort par la gauche
      s.vr = Math.max((s.vr || 0) - v * .55 * dt, -(1 - s.v) * v);
      s.x += s.vr * dt;
    }
  }

  function majCompagnon(s, dt) {
    const vRel = W.v * W.ech * (1 - s.v), place = HX + 160;
    if (s.acc > 0) {
      if (s.x > place + 2 && !s.cote) s.x -= vRel * dt;
      else {
        s.cote = true;
        s.acc -= dt;
        s.x += (place + Math.sin(s.T * .55) * 18 - s.x) * Math.min(1, dt * 1.2);
        const cible = G.clamp(W.y + 6 + Math.sin(s.T * .8) * 10, 64, 150);
        s.y += (cible - s.y) * Math.min(1, dt * .7);
      }
    } else {
      // elle se laisse distancer en s'ecartant du drone, du cote ou il y a de la place : elle ne lui passe jamais dessus
      // (au depart plus doux du 05/11/2026, le drone la depasse moins vite : elle restait un quart de seconde sur lui)
      // Loin devant, elle suit encore son altitude ; en arrivant pres de lui, elle choisit une fois son cote (celui ou elle est deja,
      // s'il y a la place) et s'y tient le temps de le croiser.
      s.x -= Math.max(vRel * .8, 70) * dt;
      let cible = G.clamp(W.y + 6 + Math.sin(s.T * .8) * 10, 64, 150);
      if (Math.abs(s.x - HX) < 90) {
        if (s.ecart === undefined) s.ecart = s.y >= W.y ? (W.y + 46 <= 165 ? 1 : -1) : (W.y - 46 >= 60 ? -1 : 1);
        cible = G.clamp(W.y + s.ecart * 46, 60, 165);
      }
      s.y += (cible - s.y) * Math.min(1, dt * 2.5);
    }
  }

  /* Se poser sur le dos de la baleine : elle t'emmene, et ca rapporte */
  function surfBaleine(s, sp, dt) {
    if (!W.vivant) return;
    const px = s.x - sp.w / 2, py = s.y - sp.h / 2;
    const dedans = HX > px + sp.w * .1 && HX < px + sp.w * .95 && W.y > py - 8 && W.y < py + sp.h * .55;
    if (!dedans) { W.surf = false; return; }
    if (!W.surf) { W.surf = true; direH(pick(['Elle m\'emmène !', 'Taxi !', 'Hé, doucement !', 'La plus belle prise !']), 2); G.Audio && G.Audio.sfx('baleine'); mission('surf', 1); }
    W.surfT = (W.surfT || 0) - dt;
    W.invinc = Math.max(W.invinc, .25);
    if (W.surfT <= 0) {
      W.surfT = .16;
      G.gagne(1); W.bob += 1;
      G.Audio && G.Audio.sfx('bobine');
      W.parts.push({ x: HX + rnd(-14, 14), y: W.y - 6, vx: -40, vy: rnd(-70, -30), g: 0, T: .7, c: 'rgba(220,250,255,.9)', s: pick([1, 2]) });
    }
  }

  const sous = () => W.sc && W.sc.type === 'eau';
  /* ---- Obstacles ---- */
  function eff(n, x, y, c, f = 1) {
    for (let i = 0; i < n; i++) {
      const a = rnd(6.28), s = rnd(30, 140) * f;
      W.parts.push({ x, y, vx: Math.cos(a) * s - W.v * .3, vy: Math.sin(a) * s - 30, g: 280, T: rnd(.25, .7), c: pick(c), s: pick([1, 1, 2]) });
    }
  }
  const FEU = ['#fff4a8', '#ffb545', '#ff6a2e', '#c8391f', '#555'];

  function casser(o, parTir) {
    o.mort = true;
    W.detruit++;
    G.FX.fracasser(W, o);
    W.secousse = Math.max(W.secousse, 2.5);
    G.Audio && G.Audio.sfx('boum');
    mission('detruit', 1);
    // pluie de bobines
    for (let i = 0; i < 3; i++) W.items.push({ k: 'bob', x: o.x + rnd(-10, 10), y: (o.yc || o.y) + rnd(-10, 10), vx: rnd(-20, 40), vy: rnd(-80, -20), libre: true });
    // la foule adore
    for (const f of W.figs) if (f.x > 0 && f.x < G.VW && !f.tombe && f.d && Math.random() < .5) { f.pose = 'saute'; f.hop = 1; }
  }

  /* Une barre : un objet du lieu (baguette a Paris, planche de surf a Hawai...).
     Rien ne flotte sans raison : une barre pend a une chaine qui sort du cadre, tient sur un poteau,
     est plantee dans le sol, ou deux oiseaux la portent. Seuls volent ce qui vole vraiment. */
  const VOLE_SEUL = { tapis_volant: 1, anguille: 1, tapis_roule: 0 };
  const LARG = () => 5;
  function barre(o) {
    const l = (W.reg.barres || []).filter(D.existe);
    const b = Object.assign({ k: 'cable', c: '#ff3b5c' }, o);
    if (l.length) { b.skin = o.skin || pick(l); D.spr(b.skin, 'l'); }
    geo(b);
    return b;
  }
  function geo(o) {
    if (o.pend) {
      const th = o.pend.A * Math.sin(W.T * o.pend.w + o.pend.ph);
      o.x = o.px + o.pend.L * Math.sin(th); o.y = -14 + o.pend.L * Math.cos(th); o.a = Math.atan2(Math.cos(th), Math.sin(th));
    } else if (o.y0 !== undefined) o.y = o.y0 + Math.sin(W.T * 2 + o.ph) * o.amp;
    const c = Math.cos(o.a) * o.len / 2, s = Math.sin(o.a) * o.len / 2;
    o.ax = o.x - c; o.ay = o.y - s; o.bx = o.x + c; o.by = o.y + s; o.yc = o.y;
  }
  /* La geometrie d'un obstacle, supports compris : la meme pour les chocs, les pieces et les tests */
  const capsules = J.capsules = o => {
    if (o.k === 'cable') {
      if (o.ax === undefined) return [];
      const l = [[o.ax, o.ay, o.bx, o.by, o.skin ? LARG() : 3.5]];
      if (o.sup && (o.sup.t === 'chaine' || o.sup.t === 'poteau')) for (const f of o.sup.f) {
        const px = o.ax + (o.bx - o.ax) * f, py = o.ay + (o.by - o.ay) * f;
        l.push(o.sup.t === 'chaine' ? [px, py, o.pend ? o.px : px, -14, 2] : [px, py, px, G.SOLF + 4, 3]);
      }
      return l;
    }
    if (o.k === 'sprite') return capsSprite(o);
    if (o.k === 'struct') return G.Structures.capsules(o);
    if (o.k === 'col') {
      const sp = D.spr(o.s, 'l');
      if (!sp.ok) return [];
      const ay = o.haut ? G.PLAFOND : o.y - sp.h, by = o.haut ? G.PLAFOND + sp.h : o.y;
      return [[o.x, ay + 6, o.x, by - 6, Math.max(4, sp.w * .28)]];
    }
    if (o.k === 'vol' && o.s) {
      const sp = D.spr(o.s, 'l');
      if (!sp.ok) return [];
      return [[o.x - sp.w * .25, o.y, o.x + sp.w * .25, o.y, Math.min(sp.h, sp.w) * .28 * (o.gonfle || 1)]];
    }
    return [];
  };
  /* La forme d'une structure, lue dans son image : ou elle commence et finit, colonne par colonne */
  const formes = new Map();
  function formeDe(sp) {
    let f = formes.get(sp.img);
    if (f || !sp.ok) return f || null;
    const nw = sp.img.width, nh = sp.img.height, c = G.mk(nw, nh);
    c.x.drawImage(sp.img, 0, 0);
    let px = null;
    try { px = c.x.getImageData(0, 0, nw, nh).data; } catch (e) { /* image illisible : forme simple */ }
    const NB = 9, cols = [];
    let plancher = .38;
    if (px) {
      const op = (x, y) => px[(y * nw + x) * 4 + 3] > 128;
      for (let i = 0; i < NB; i++) {
        const x = Math.min(nw - 1, Math.round((i + .5) / NB * nw));
        let t = -1, b = -1;
        for (let y = 0; y < nh; y++) if (op(x, y)) { if (t < 0) t = y; b = y; }
        if (t >= 0) cols.push({ fx: (i + .5) / NB, t: t / nh, b: (b + 1) / nh });
      }
      // le dessous du tablier d'une arche : au milieu, ou le plein s'arrete. Une ouverture peinte en noir compte comme vide.
      const xm = nw >> 1; let y = 0;
      const plein = (x, q) => { const i = (q * nw + x) * 4; return px[i + 3] > 128 && px[i] + px[i + 1] + px[i + 2] > 130; };
      while (y < nh && !plein(xm, y)) y++;
      while (y < nh && plein(xm, y)) y++;
      if (y < nh * .85 && y > nh * .08) plancher = y / nh;
    } else cols.push({ fx: .5, t: 0, b: 1 });
    f = { cols, plancher };
    formes.set(sp.img, f);
    return f;
  }
  function capsSprite(o) {
    const sp = D.spr(o.s, 'l'), f = formeDe(sp);
    if (o.type === 'arche') {
      // seul le tablier arrete : on passe entre les pieds
      const ep = Math.max(8, o.dh * .5);
      return [[o.x - o.w / 2 + ep * .5, o.yd - ep, o.x + o.w / 2 - ep * .5, o.yd - ep, ep], [o.x - o.w / 2 + ep * .5, o.yd - o.dh + ep * .5, o.x + o.w / 2 - ep * .5, o.yd - o.dh + ep * .5, ep * .5]];
    }
    const l = [];
    const r = Math.max(3, o.w / 9 * .55);
    const cols = f ? f.cols : [{ fx: .5, t: 0, b: 1 }];
    // ce qui pend : sa tige, puis l'objet lui-meme, pas un mur jusqu'au plafond
    if (o.type === 'pend') l.push([o.x, -14, o.x, o.yh + 2, 1.5]);
    for (const c of cols) {
      const x = o.x - o.w / 2 + c.fx * o.w;
      if (o.type === 'pend') { const rp = Math.min(r, (c.b - c.t) * o.h / 2 + 1); l.push([x, o.yh + c.t * o.h + rp, x, o.yh + c.b * o.h - rp, rp]); }
      else l.push([x, o.y - o.h + c.t * o.h + r + 1, x, o.y, r]);
    }
    return l;
  }
  /* Le kit du lieu : ce qui existe vraiment ici */
  // dessine comme un interieur, mais a ciel ouvert : stade, tapis rouge...
  const sousPlafond = () => W.sc.type === 'int' && !W.sc.def.pleinAir;
  function kit() {
    const def = W.sc.def;
    if (def.kit) return def.kit;
    let k = G.KITS[def.r] || G.KITS.paris;
    if (W.sc.type === 'eau') k = G.KITS.sousmarin;
    else if (def.flotte) k = G.KITS._mer;
    else if (sousPlafond() && !k.pend) k = G.KITS._salle;
    return k;
  }
  const dispo = l => (l || []).filter(D.existe);
  /* Ca monte du sol jusqu'a ytop : on passe au-dessus. On l'ajuste a la hauteur voulue, sans jamais trop deformer. */
  function solA(x, ytop) {
    const l = dispo(kit().sol);
    if (!l.length) return null;
    const voulu = G.SOLF - ytop;
    // celui dont la taille naturelle est la plus proche, avec un peu de hasard
    const tri = l.map(s => { const sp = D.spr(s, 'l'); return [Math.abs((sp.h || 90) - voulu) * rnd(.7, 1.3), s]; }).sort((a, b) => a[0] - b[0]);
    const s = tri[0][1], sp = D.spr(s, 'l');
    const ey = voulu / (sp.h || 90), ex = clamp(ey, .78, 1.15);
    const w = Math.min((sp.w || 40) * ex, 230), o = { k: 'sprite', type: 'sol', s, x: x + w / 2, y: G.SOLF, w, h: voulu, yc: ytop + 12, ytop };
    W.obs.push(o);
    return o;
  }
  /* Ca a des pieds et un tablier dont le dessous est a yd : on passe dessous. Sans arche ici, c'est ce qui pend. */
  function archeA(x, yd) {
    const k = kit(), l = dispo(k.arche);
    if (!l.length) return pendA(x, yd);
    const s = pick(l), sp = D.spr(s, 'l');
    const e = rnd(.72, .86), w = (sp.w || 120) * e, f = formeDe(sp);
    const plancher = f ? f.plancher : .38, dh = (sp.h || 120) * e * plancher;
    const o = { k: 'sprite', type: 'arche', s, x: x + w / 2, y: G.SOLF, w, h: (sp.h || 120) * e, dh, yd, plancher, yc: yd - 8 };
    W.obs.push(o);
    return o;
  }
  /* Ca pend d'un plafond, ou de la surface sous l'eau, jusqu'a yb */
  function pendA(x, yb) {
    const l = dispo(kit().pend);
    if (!l.length) return null;
    const s = pick(l), sp = D.spr(s, 'l');
    const w = sp.w || 60, h = sp.h || 50;
    const o = { k: 'sprite', type: 'pend', s, x: x + w / 2, y: yb, yh: yb - h, w, h, yc: yb - 12 };
    W.obs.push(o);
    return o;
  }
  /* La duree que met le drone a passer d'une altitude a une autre : les enchainements restent toujours faisables */
  // en l'air, le temps se calcule sur le moteur de vol (J.tVol, 05/11/2026), avec une petite reserve
  const tempsPour = dy => sous() ? (dy > 0 ? Math.sqrt(2 * dy / 240) + .6 : (-dy) / 130 + .45) : J.tVol(dy) + .12;
  // la pente qu'on peut suivre : unites de hauteur par seconde, avec de la reserve
  const pente = () => sous() ? 80 : Math.min(VOL.air.monte, VOL.air.chute) * .6;
  const vit = () => Math.max(W.v, 190) * 1.08;
  const dif = () => clamp(W.tJeu / 110, 0, 1);
  const ouverture = () => G.lerp(102, 66, dif());
  const ycMin = gap => Math.max(limiteHaut() - 8, 18 + gap / 2 - 10);
  const ycMax = gap => Math.min(176, G.SOLF - 6 - gap * .32);
  function chemin(pts, pas = 14) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = pts[i], [c, d] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(c - a, d - b) / pas));
      for (let k = 0; k < n; k++) W.items.push({ k: 'bob', x: a + (c - a) * k / n, y: b + (d - b) * k / n });
    }
  }
  /* Une piece sur un obstacle, c'est interdit : on retire tout ce qui touche */
  function nettoyerPieces() {
    const dist = (px, py, c) => { const dx = c[2] - c[0], dy = c[3] - c[1], l = dx * dx + dy * dy, t = clamp(((px - c[0]) * dx + (py - c[1]) * dy) / (l || 1), 0, 1); return Math.hypot(c[0] + dx * t - px, c[1] + dy * t - py) - c[4]; };
    const caps = [];
    for (const o of W.obs) if (o.k === 'cable' || o.k === 'col' || o.k === 'vol' || o.k === 'sprite' || o.k === 'struct') for (const c of capsules(o)) caps.push(c);
    W.items = W.items.filter(it => it.k !== 'bob' || it.libre || !caps.some(c => dist(it.x, it.y, c) < 9));
  }
  /* Ce qui traverse l'image : a chaque fois ce qui existe vraiment dans ce lieu */
  const SPAWN = {
    vol() {
      const id = pick(dispo(kit().ciel));
      if (!id) return .8;
      const n = id === 'mouette' || id === 'pigeon' ? irnd(1, 2) : 1;
      const y0 = rnd(34, 150);
      for (let i = 0; i < n; i++) W.obs.push({ k: 'vol', s: id, x: W.spawnX0 + i * 22, y: y0 + (i % 2 ? 12 : -8) * (i > 0), y0: y0 + (i % 2 ? 12 : -8) * (i > 0), v: rnd(1.1, 1.4), amp: rnd(4, 18), ph: rnd(6), tourne: ['boomerang', 'ballon_foot'].includes(id) ? pick([-3, 3, 5]) : 0 });
      return 1.15;
    },
    guide() {
      const id = W.reg.guide;
      if (!D.existe(id)) return SPAWN.vol();
      const n = W.tJeu > 60 && Math.random() < .35 ? 2 : 1;
      for (let i = 0; i < n; i++) W.obs.push({ k: 'guide', s: id, x: G.VW + 16, y: W.y, warn: 1.25 + i * .5, v: 1.9 });
      return 1.0;
    },
    rayons() {
      const n = irnd(2, Math.min(4, 2 + (W.tJeu / 50 | 0)));
      const vides = irnd(0, n);
      const pas = (G.SOL - 30) / n;
      for (let i = 0; i < n + 1; i++) {
        if (i === vides) continue;
        W.obs.push({ k: 'rayon', y: 28 + i * pas, warn: 1.25, on: .75, T: 0 });
      }
      return 2.2;
    },
    jet() {
      const n = irnd(1, 3);
      for (let i = 0; i < n; i++) W.obs.push({ k: 'jet', t: W.reg.jet || 'eau', x: W.spawnX0 + i * 56, warn: rnd(.3, .6) + i * .28, h: rnd(90, 140), on: 1.0, T: 0 });
      return 1.5;
    },
    veh() {
      // sur terre, rien de ce qui navigue
      const id = pick((W.sc.def.flotte ? ['zodiac', 'barque', 'dauphin'] : (W.sc.def.veh || W.reg.veh || []).filter(s => s !== 'zodiac' && s !== 'barque')).filter(D.existe));
      if (!id) return SPAWN.vol();
      const saute = ['buggy', 'moto', 'tout_terrain', 'cheval', 'dauphin', 'zodiac'].includes(id) && Math.random() < .6;
      W.obs.push({ k: 'veh', s: id, x: G.VW + 60, y: G.SOLF, v: 1.32, saute, vy: 0, jy: 0, jx: rnd(240, 340) });
      return 1.1;
    },
    baleine() {
      const id = D.existe('baleine') ? 'baleine' : 'rorqual';
      if (!D.existe(id)) return SPAWN.meduses();
      W.obs.push({ k: 'saut', s: id, x: rnd(G.VW * .75, G.VW * 1.0) + W.v * .7, y: 250, vy: -300, warn: .7, T: 0, big: true });
      return 2.2;
    },
    meduses() {
      const n = irnd(2, 3);
      const id = D.existe('meduse') ? 'meduse' : null;
      if (!id) return .8;
      for (let i = 0; i < n; i++) W.obs.push({ k: 'vol', s: id, x: W.spawnX0 + i * 70, y0: rnd(46, 160), y: 100, v: rnd(1.02, 1.12), amp: rnd(8, 16), ph: rnd(6), pul: 1 });
      return 1.4;
    },
    requin() {
      if (!D.existe('requin')) return SPAWN.meduses();
      W.obs.push({ k: 'guide', s: 'requin', x: G.VW + 16, y: W.y, warn: 1.1, v: 1.7 });
      return 1.2;
    },
    courant() {
      // colonne de bulles : elle aspire vers le haut, on s'en sert ou on la subit
      W.obs.push({ k: 'courant', x: W.spawnX0 + 20, T: 0, y: 120, yc: undefined });
      return 1.0;
    },
    globe() {
      if (!D.existe('poisson_globe')) return SPAWN.meduses();
      W.obs.push({ k: 'vol', s: 'poisson_globe', x: W.spawnX0, y0: rnd(50, 160), y: 100, v: .95, amp: 6, ph: rnd(6), gonfle: 1 });
      return 1.0;
    },
  };

  const fin = o => o ? o.x + o.w / 2 : 0;
  /* ---- Les structures : des blocages horizontaux, verticaux, en diagonale, faits de la matiere du lieu.
     Reperes : le drone occupe de y - 31 a y + 7. Toutes les mesures laissent de la place pour passer, et les chemins sont prouves par tests/passage.js ---- */
  const YSOL = () => G.SOLF + 8, YCIEL = -16;
  const yMinDrone = () => G.PLAFOND + 32 + (W.sc.def.plafond ? W.sc.def.plafond * .5 : 0);
  // ce qui depasse du sol doit laisser le ciel libre au-dessus, ce qui descend doit laisser passer dessous
  const hautMur = y => clamp(y, yMinDrone() + 7 + 10, G.SOLF - 26);
  const basPlafond = y => clamp(y, yMinDrone() - 12, G.SOL - 31 - 10);
  const margeLane = () => G.lerp(30, 12, dif());
  const ouvertureS = () => 38 + 2 * margeLane();
  const matiere = () => W.matForce || pick(G.Structures.du(W.sc.id));
  // chaque bande a sa taille : fine, normale ou massive
  const ray = m => G.Structures.rayon(m) * (W.echS || 1);
  const epais = m => G.Structures.epaisseur(m) * (W.echS || 1);
  function structure(m, segs, dos) {
    if (m === 'escalator' && segs.some(q => Math.abs(q.by - q.ay) > Math.abs(q.bx - q.ax) * 1.5)) m = G.Structures.du(W.sc.id).find(q => q !== 'escalator') || 'viaduc';
    let a = 1e9, b = -1e9, ys = 0, n = 0;
    for (const q of segs) { a = Math.min(a, q.ax, q.bx); b = Math.max(b, q.ax, q.bx); for (const y of [q.ay, q.by]) if (y > 0 && y < G.SOLF) { ys += y; n++; } }
    const r = ray(m), cx = (a + b) / 2;
    const o = { k: 'struct', m, ech: W.echS || 1, x: cx, w: b - a + 2 * r, ph: rnd(6), yc: n ? ys / n : 100, segs: segs.map(q => Object.assign({}, q, { ax: q.ax - cx, bx: q.bx - cx })), dos: dos && dos.map(d => ({ x: d.x - cx, y: d.y, haut: d.haut })) };
    W.obs.push(o);
    return o;
  }
  // un mur qui monte du sol jusqu'a ytop, ou descend du haut de l'image jusqu'a yb
  const murSol = (m, x, ytop) => structure(m, [{ ax: x, ay: YSOL(), bx: x, by: ytop + ray(m), finB: 1 }]);
  const murHaut = (m, x, yb) => structure(m, [{ ax: x, ay: YCIEL, bx: x, by: yb - ray(m), finB: 1 }]);
  // ce qui ne touche ni le sol ni le haut tient sur des appuis en retrait, ou pend, sous un plafond et sous l'eau
  const accroche = (x, y) => ({ x, y, haut: sousPlafond() || sous() });
  const poutre = (m, x, y, L, y2) => {
    const avec = sousPlafond() || Math.random() < .3;
    const o = structure(m, [{ ax: x, ay: y, bx: x + L, by: y2 === undefined ? y : y2, finA: 1, finB: 1 }], !avec ? null : L > 150 ? [accroche(x + L * .2, y), accroche(x + L * .8, y2 === undefined ? y : y2)] : [accroche(x + L / 2, y2 === undefined ? y : (y + y2) / 2)]);
    if (!avec && !sous()) flotter(o);
    return o;
  };
  /* ---- Ce qui bouge : tourner, monter et descendre, glisser, se balancer. La forme de base est gardee, on la replace a chaque image. ---- */
  const ANIMS = { rondins: ['monte'], ballot: ['monte'], pneus: ['monte', 'tourne'], bouees: ['monte'], tapis: ['monte', 'balance'], surf: ['tourne', 'monte'], velours: ['balance'], truss: ['balance', 'tourne', 'monte'], led: ['monte', 'tourne'], escalator: ['monte'], viaduc: ['monte', 'glisse'], fer: ['tourne', 'balance'], zinc: ['monte', 'tourne'], bagages: ['monte'], convoyeur: ['monte'], rack: ['monte'], cables: ['balance', 'monte'], filet: ['balance', 'monte'], planches: ['tourne', 'monte'], ponton: ['monte', 'balance'], bois_flotte: ['tourne', 'monte'], barriere: ['tourne', 'monte'], barriere_irl: ['tourne', 'monte'], kraal: ['monte'], natte: ['monte', 'balance'], bambou: ['tourne', 'monte', 'balance'], sagne: ['monte'], tuyau: ['tourne', 'monte'], epave: ['balance', 'monte'], lave: ['monte'], barreaux: ['monte'], romain: ['monte', 'tourne'] };
  const mvtDe = m => (ANIMS[m] || ['monte']);
  function animer(o, q, ampl, om, pivotY) {
    o.mvt = { q, A: ampl, om, t: rnd(6), base: o.segs.map(s => ({ ax: s.ax, ay: s.ay, bx: s.bx, by: s.by })), py: pivotY };
    return o;
  }
  function flotter(o) {
    // une barre qui flotte tangue a peine, et ses chocs suivent
    const y = (o.segs[0].ay + o.segs[0].by) / 2;
    return animer(o, 'monte', rnd(1.2, 3), rnd(1.1, 2), y);
  }
  const flotter2 = o => animer(o, 'monte', rnd(1.2, 2.6), rnd(1, 1.6), 0);
  function majMvt(o, dt) {
    const m = o.mvt; m.t += dt;
    const th = m.q === 'tourne' ? m.t * m.om : m.q === 'balance' ? m.A * Math.sin(m.t * m.om) : 0;
    const dy = m.q === 'monte' ? m.A * Math.sin(m.t * m.om) : 0, dx = m.q === 'glisse' ? m.A * Math.sin(m.t * m.om) : 0;
    const c = Math.cos(th), s = Math.sin(th);
    m.base.forEach((b, i) => {
      const q = o.segs[i], ay = b.ay - m.py, by = b.by - m.py;
      q.ax = b.ax * c - ay * s + dx; q.ay = m.py + b.ax * s + ay * c + dy;
      q.bx = b.bx * c - by * s + dx; q.by = m.py + b.bx * s + by * c + dy;
    });
  }
  /* ---- Les formes qui flottent : au milieu de l'image, en l'air. Coordonnees de -1 a 1, etirees a la taille voulue ---- */
  const arc = (n, a0, a1) => { const l = []; for (let i = 0; i < n; i++) { const p = a0 + (a1 - a0) * i / n, q = a0 + (a1 - a0) * (i + 1) / n; l.push([Math.cos(p), Math.sin(p), Math.cos(q), Math.sin(q)]); } return l; };
  const FORMES = {
    barre: [[-1, 0, 1, 0]], montee: [[-1, 1, 1, -1]], descente: [[-1, -1, 1, 1]], verticale: [[0, -1, 0, 1]],
    croix: [[-1, 0, 1, 0], [0, -1, 0, 1]], x: [[-1, -1, 1, 1], [-1, 1, 1, -1]], t: [[-1, -1, 1, -1], [0, -1, 0, 1]], tinv: [[0, -1, 0, 1], [-1, 1, 1, 1]],
    l: [[-1, -1, -1, 1], [-1, 1, 1, 1]], lm: [[1, -1, 1, 1], [1, 1, -1, 1]], gamma: [[-1, 1, -1, -1], [-1, -1, 1, -1]], gammam: [[1, 1, 1, -1], [1, -1, -1, -1]],
    v: [[-1, -1, 0, 1], [0, 1, 1, -1]], a: [[-1, 1, 0, -1], [0, -1, 1, 1]], fleche: [[-1, -1, 1, 0], [1, 0, -1, 1]], chevron: [[1, -1, -1, 0], [-1, 0, 1, 1]],
    z: [[-1, -1, 1, -1], [1, -1, -1, 1], [-1, 1, 1, 1]], s: [[-1, -1, 0, -1], [0, -1, 0, 1], [0, 1, 1, 1]], marche: [[-1, 1, 0, 1], [0, 1, 0, -1], [0, -1, 1, -1]],
    zigzag: [[-1, .7, -.33, -.7], [-.33, -.7, .33, .7], [.33, .7, 1, -.7]], u: [[-1, -1, -1, 1], [-1, 1, 1, 1], [1, 1, 1, -1]], n: [[-1, 1, -1, -1], [-1, -1, 1, -1], [1, -1, 1, 1]], crochet: [[1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1]],
    carre: [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]], losange: [[0, -1, 1, 0], [1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1]], triangle: [[0, -1, 1, 1], [1, 1, -1, 1], [-1, 1, 0, -1]],
    etoile: [[-1, 0, 1, 0], [-.5, -.87, .5, .87], [-.5, .87, .5, -.87]], anneau: arc(8, 0, 6.2832), voute: arc(5, 3.1416, 6.2832), cuvette: arc(5, 0, 3.1416),
  };
  // tourne bien : une forme sans trop de vide, autour de son centre
  const TOURNE = ['barre', 'croix', 'x', 'etoile', 'montee', 't'];
  const pose = (m, x, cy, nom, a, b, avecMvt) => {
    const l = (FORMES[nom] || FORMES.barre).map(q => ({ ax: x + a + q[0] * a, ay: cy + q[1] * b, bx: x + a + q[2] * a, by: cy + q[3] * b, finA: 1, finB: 1 }));
    const o = structure(m, l);
    o.forme = nom;
    return o;
  };
  // ou la placer pour qu'il reste un couloir au-dessus, en dessous, ou les deux
  function hauteurForme(H) {
    const mg = margeLane(), haut = yMinDrone() + H + 7 + mg, bas = G.SOL - H - 31 - mg;
    if (haut <= bas) return rnd(haut, bas);
    return Math.random() < .5 ? haut : bas;
  }
  function formeFlottante(x0, nom, a, b, q) {
    const m = matiere(), r = ray(m);
    let om = 0, A = 0, H = b + r, La = a;
    if (q === 'tourne') { om = pick([-1, 1]) * rnd(.8, 1.5) / Math.max(1, Math.hypot(a, b) / 40); H = Math.hypot(a, b) + r; La = Math.hypot(a, b); }
    if (q === 'monte') { A = rnd(14, 30); om = rnd(1, 1.8); H += A; }
    if (q === 'glisse') { A = rnd(16, 30); om = rnd(1, 1.6); La = a + A; }
    if (q === 'balance') { A = rnd(.3, .6); om = rnd(1.1, 1.7); H = Math.hypot(a, b) + r; La = Math.hypot(a, b); }
    const cy = hauteurForme(H), o = pose(m, x0 + (La - a), cy, nom, a, b);
    if (q) animer(o, q, A || om, om, cy);
    else if (!sous() && o.segs.length < 3) flotter(o);
    o.w += 2 * (La - a);
    const au = cy - H - 7 - margeLane() >= yMinDrone() - 2;
    const ly = au ? cy - H - 20 : cy + H + 36;
    chemin([[o.x - La - 40, ly], [o.x + La + 40, ly]]);
    return fin(o);
  }

  const MOTIFS = J.MOTIFS = {
    // un mur, pour passer au-dessus
    murSol(x0) { const m = matiere(), y = hautMur(rnd(G.lerp(150, 96, dif()), 168)), o = murSol(m, x0, y); chemin([[o.x - 60, y - 24], [o.x + 60, y - 24]]); return fin(o); },
    // un mur qui descend, pour passer dessous
    murHaut(x0) { const m = matiere(), y = basPlafond(rnd(52, G.lerp(92, 134, dif()))), o = murHaut(m, x0, y); chemin([[o.x - 60, y + 20], [o.x + 60, y + 20]]); return fin(o); },
    // une poutre : au-dessus ou en dessous, on choisit
    poutre(x0) {
      const m = matiere(), y = rnd(82, 140), L = rnd(90, G.lerp(170, 260, dif())), o = poutre(m, x0, y, L);
      const haut = Math.random() < .5, yp = haut ? y - 26 : y + 26;
      chemin([[x0 - 30, yp], [x0 + L + 30, yp]]);
      return fin(o);
    },
    // une porte : le haut et le bas au meme endroit
    porte(x0) {
      const m = matiere(), g = ouvertureS(), yc = rnd(yMinDrone() + g / 2 - 4, G.SOL - g / 2 + 2);
      const a = murHaut(m, x0, yc - g / 2), b = murSol(m, x0, yc + g / 2);
      chemin([[x0 - 70, yc], [x0 + 70, yc]]);
      return Math.max(fin(a), fin(b));
    },
    // l'etau du boss : deux poutres qui prennent tout l'ecran en largeur, l'entree fermee en haut et en bas ; on ne peut
    // plus fuir tout en haut ni tout en bas pendant que l'animal tourne devant nous (Max, 03/11/2026). Le passage reste large.
    etau(x0, pres) {
      const m = matiere(), r = ray(m), g = Math.min(124, ouvertureS() + 50);
      // le centre : la ou est le heros (on y est deja), jamais contre le plafond ni le sol
      const lo = yMinDrone() + g / 2 + r + 6, hi = G.SOL - g / 2 - r - 2;
      const yc = lo <= hi ? clamp(pres !== undefined ? pres : rnd(lo, hi), lo, hi) : (lo + hi) / 2, L = rnd(1.5, 2) * G.VW;
      // l'entree en entonnoir : les deux poutres viennent du haut et du bas de l'image en pente douce
      const yh = yc - g / 2 - r, yb = yc + g / 2 + r, Lf = Math.max(90, Math.max(yh - YCIEL, YSOL() - yb) * vit() / pente() * .5);
      const h = structure(m, [{ ax: x0, ay: YCIEL, bx: x0 + Lf, by: yh }, { ax: x0 + Lf, ay: yh, bx: x0 + Lf + L, by: yh, finB: 1 }]);
      const o = structure(m, [{ ax: x0, ay: YSOL(), bx: x0 + Lf, by: yb }, { ax: x0 + Lf, ay: yb, bx: x0 + Lf + L, by: yb, finB: 1 }]);
      chemin([[x0 - 70, yc], [x0 + Lf + L + 40, yc]]);
      W.etau = { yc, g, obs: [h, o] };
      return fin(o);
    },
    // le slalom : au-dessus, en dessous, au-dessus... le coeur du jeu
    slalom(x0) {
      const m = matiere(), n = irnd(2, 3 + Math.round(dif() * 3)), amp = G.lerp(.3, 1, dif());
      let x = x0, enHaut = Math.random() < .5, f = x0;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const ytop = hautMur(G.lerp(150, 92, amp) + rnd(-8, 8)), yb = basPlafond(G.lerp(62, 122, amp) + rnd(-8, 8));
        const o = enHaut ? murSol(m, x, ytop) : murHaut(m, x, yb);
        const ici = enHaut ? ytop - 7 - 12 : yb + 31 + 12, apres = enHaut ? yb + 31 + 12 : ytop - 7 - 12;
        pts.push([x, ici - 12]);
        f = fin(o);
        x += epais(m) + 22 + vit() * tempsPour(apres - ici) * G.lerp(1.5, 1.14, dif());
        enHaut = !enHaut;
      }
      chemin(pts);
      return f;
    },
    // un plan incline qui part du sol : il faut monter avant lui
    diagSol(x0) {
      const m = matiere(), y = hautMur(rnd(G.lerp(120, 78, dif()), 130)), dx = (YSOL() - y) * vit() / (pente() * 1.15);
      const montant = Math.random() < .6;
      const o = montant ? structure(m, [{ ax: x0, ay: YSOL(), bx: x0 + dx, by: y + 6, finB: 1 }]) : structure(m, [{ ax: x0, ay: y + 6, bx: x0 + dx, by: YSOL(), finA: 1 }]);
      chemin(montant ? [[x0 + dx * .4, YSOL() - (YSOL() - y) * .4 - 30], [x0 + dx + 50, y - 24]] : [[x0 - 50, y - 24], [x0 + dx * .6, y + (YSOL() - y) * .6 - 30]]);
      return fin(o);
    },
    // le meme, qui descend du haut de l'image
    diagHaut(x0) {
      const m = matiere(), y = basPlafond(rnd(66, G.lerp(100, 136, dif()))), dx = (y - YCIEL) * vit() / (pente() * 1.15);
      const descend = Math.random() < .6;
      const o = descend ? structure(m, [{ ax: x0, ay: YCIEL, bx: x0 + dx, by: y - 6, finB: 1 }]) : structure(m, [{ ax: x0, ay: y - 6, bx: x0 + dx, by: YCIEL, finA: 1 }]);
      chemin(descend ? [[x0 + dx * .5, y * .5 + 26], [x0 + dx + 50, y + 22]] : [[x0 - 50, y + 22], [x0 + dx * .5, y * .5 + 26]]);
      return fin(o);
    },
    // l'entonnoir : tout se resserre sur un col, puis s'ouvre
    entonnoir(x0) {
      const m = matiere(), g = ouvertureS() + 6, yc = rnd(yMinDrone() + g / 2 + 8, G.SOL - g / 2 - 6), a = yc - g / 2, b = yc + g / 2;
      const col = rnd(24, 70), dh = (a - YCIEL) * vit() / (pente() * 1.3), db = (YSOL() - b) * vit() / (pente() * 1.3), d = Math.max(dh, db), r = ray(m);
      structure(m, [{ ax: x0, ay: YCIEL, bx: x0 + d, by: a - r }, { ax: x0 + d, ay: a - r, bx: x0 + d + col, by: a - r }, { ax: x0 + d + col, ay: a - r, bx: x0 + 2 * d + col, by: YCIEL }]);
      const o = structure(m, [{ ax: x0, ay: YSOL(), bx: x0 + d, by: b + r }, { ax: x0 + d, ay: b + r, bx: x0 + d + col, by: b + r }, { ax: x0 + d + col, ay: b + r, bx: x0 + 2 * d + col, by: YSOL() }]);
      chemin([[x0 + d - 30, yc], [x0 + d + col + 30, yc]]);
      return fin(o);
    },
    // un couloir en pente, ferme des deux cotes
    couloir(x0) {
      const m = matiere(), g = ouvertureS() + 12, r = ray(m);
      const y1 = rnd(yMinDrone() + g / 2 + 4, G.SOL - g / 2 - 2), y2 = clamp(y1 + pick([-1, 1]) * rnd(44, 92), yMinDrone() + g / 2 + 4, G.SOL - g / 2 - 2);
      const L = Math.max(90, Math.abs(y2 - y1) * vit() / pente());
      const bas = [{ ax: x0, ay: YSOL(), bx: x0, by: y1 + g / 2 + r }, { ax: x0, ay: y1 + g / 2 + r, bx: x0 + L, by: y2 + g / 2 + r }, { ax: x0 + L, ay: y2 + g / 2 + r, bx: x0 + L, by: YSOL() }];
      const haut = [{ ax: x0, ay: YCIEL, bx: x0, by: y1 - g / 2 - r }, { ax: x0, ay: y1 - g / 2 - r, bx: x0 + L, by: y2 - g / 2 - r }, { ax: x0 + L, ay: y2 - g / 2 - r, bx: x0 + L, by: YCIEL }];
      structure(m, haut);
      const o = structure(m, bas);
      chemin([[x0 - 50, y1], [x0, y1], [x0 + L, y2], [x0 + L + 50, y2]]);
      return fin(o);
    },
    // un Z : sous le surplomb, puis par-dessus le suivant
    chicane(x0) {
      const m = matiere(), r = ray(m), yb = basPlafond(rnd(G.lerp(70, 104, dif()), 120)), ytop = hautMur(rnd(G.lerp(150, 96, dif()), 150)), L1 = rnd(50, 110), L2 = rnd(50, 110);
      structure(m, [{ ax: x0, ay: YCIEL, bx: x0, by: yb - r }, { ax: x0, ay: yb - r, bx: x0 + L1, by: yb - r, finB: 1 }]);
      const ici = yb + 31 + 12, apres = ytop - 7 - 12;
      const x2 = x0 + L1 + epais(m) + 20 + vit() * tempsPour(apres - ici) * G.lerp(1.5, 1.14, dif());
      const o = structure(m, [{ ax: x2, ay: ytop + r, bx: x2 + L2, by: ytop + r, finA: 1 }, { ax: x2 + L2, ay: ytop + r, bx: x2 + L2, by: YSOL() }]);
      chemin([[x0, yb + 20], [x0 + L1, yb + 20], [x2, ytop - 24], [x2 + L2, ytop - 24]]);
      return fin(o);
    },
    // des marches en l'air, qui montent ou qui descendent
    escalier(x0) {
      const m = matiere(), n = irnd(3, 4), sens = pick([-1, 1]), L = rnd(56, 84);
      // chaque marche doit laisser passer au-dessus et en dessous, meme sous un plafond bas
      const r = ray(m), yA = hautMur(0) + r, yB = basPlafond(999) - r, pasY = Math.min(28, (yB - yA) / (n - 1));
      let y = sens < 0 ? yB : yA, x = x0, f = x0;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const o = poutre(m, x, y, L);
        pts.push([x, y - 26], [x + L, y - 26]);
        f = fin(o);
        x += L + Math.max(34, vit() * pasY / pente());
        y += sens * pasY;
      }
      chemin(pts);
      return f;
    },
    // le tunnel : des colonnes en haut et en bas, leur passage ondule
    tunnel(x0) {
      const m = matiere(), g = ouvertureS() + 8, n = irnd(4, 5 + Math.round(dif() * 3)), pas = epais(m) + 22;
      const bas = yMinDrone() + g / 2 - 2, h = G.SOL - g / 2;
      let yc = rnd(bas, h), x = x0, f = x0;
      const dmax = pente() * pas / vit() * .8, pts = [];
      for (let i = 0; i < n; i++) {
        murHaut(m, x, yc - g / 2);
        f = fin(murSol(m, x, yc + g / 2));
        pts.push([x, yc]);
        yc = clamp(yc + rnd(-1, 1) * dmax, bas, h);
        x += pas;
      }
      chemin(pts);
      return f;
    },
    // un vrai escalator : un palier, la montee, un palier
    escalators(x0) {
      const m = 'escalator', r = ray(m), dy = rnd(36, G.lerp(56, 84, dif())), dx = dy * rnd(1.3, 1.7), p1 = rnd(16, 34), p2 = rnd(16, 34), sens = pick([-1, 1]);
      const H = dy / 2 + r, cy = hauteurForme(H), y1 = cy - sens * dy / 2, y2 = cy + sens * dy / 2;
      const o = structure(m, [{ ax: x0, ay: y1, bx: x0 + p1, by: y1, finA: 1 }, { ax: x0 + p1, ay: y1, bx: x0 + p1 + dx, by: y2 }, { ax: x0 + p1 + dx, ay: y2, bx: x0 + p1 + dx + p2, by: y2, finB: 1 }]);
      flotter2(o);
      const au = cy - H - 7 - margeLane() >= yMinDrone() - 2, ly = au ? cy - H - 20 : cy + H + 36;
      chemin([[x0 - 40, ly], [x0 + p1 + dx + p2 + 40, ly]]);
      return fin(o);
    },
    // une forme qui flotte au milieu de l'image, de n'importe quelle taille
    forme(x0) {
      const nom = W.formeForce || pick(Object.keys(FORMES)), plate = ['barre'].includes(nom), haute = nom === 'verticale';
      const a = plate ? rnd(26, G.lerp(70, 120, dif())) : haute ? 3 : rnd(18, G.lerp(44, 66, dif())), b = plate ? 1 : rnd(14, G.lerp(32, 48, dif()));
      return formeFlottante(x0, nom, a, haute ? rnd(22, 52) : b);
    },
    // elle bouge : elle tourne, monte et descend, glisse, se balance, selon ce que c'est
    formeBouge(x0) {
      const m0 = matiere(); W.matForce = m0;
      const q = pick(mvtDe(m0));
      const nom = q === 'tourne' ? pick(TOURNE) : pick(['barre', 'montee', 'descente', 'croix', 't', 'tinv', 'v', 'a', 'l', 'gamma', 'chevron', 'marche', 's']);
      const a = rnd(20, 44), b = nom === 'barre' ? 1 : rnd(12, 30);
      const f = formeFlottante(x0, nom, a, b, q);
      W.matForce = null;
      return f;
    },
    // plusieurs petites formes semees, un couloir qui serpente entre elles
    semis(x0) {
      const m = matiere(), n = irnd(3, 4 + Math.round(dif() * 2));
      let x = x0, f = x0, ly = rnd(70, 140);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const nom = pick(['barre', 'montee', 'descente', 'croix', 'v', 'a', 'chevron', 'fleche', 'l', 'gamma', 'triangle', 'losange']);
        const a = rnd(14, 34), b = nom === 'barre' ? 1 : rnd(10, 22), r = ray(m), H = b + r;
        // elle se place au-dessus ou en dessous du chemin, jamais dessus
        const dessus = (ly - yMinDrone() > H * 2 + 44 && Math.random() < .5) || ly + 50 + H * 2 > G.SOLF;
        const cy = dessus ? ly - 31 - margeLane() - H : ly + 7 + margeLane() + H;
        const o = pose(m, x, clamp(cy, 8, G.SOLF - H), nom, a, b);
        if (o.segs.length < 3 && !sous()) flotter(o);
        pts.push([x + a, ly - 14]);
        f = fin(o);
        const suivant = clamp(ly + rnd(-46, 46), yMinDrone() + 4, G.SOL - 6);
        x += a * 2 + r * 2 + 12 + vit() * tempsPour(suivant - ly) * G.lerp(1.3, 1.04, dif());
        ly = suivant;
      }
      chemin(pts);
      return f;
    },
    // deux formes l'une au-dessus de l'autre, on passe entre elles
    machoire(x0) {
      const m = matiere(), g = ouvertureS() + 10, a = rnd(26, 60), r = ray(m), yc = rnd(yMinDrone() + g / 2, G.SOL - g / 2);
      const dents = pick([['v', 'a'], ['gammam', 'lm'], ['gamma', 'l'], ['barre', 'barre'], ['n', 'u'], ['chevron', 'fleche']]);
      const Hh = Math.min(26, Math.max(8, (yc - g / 2 - r - 8) / 2)), Hb = Math.min(26, Math.max(8, (G.SOLF - (yc + g / 2) - r - 4) / 2));
      const b1 = dents[0] === 'barre' ? 1 : Hh, b2 = dents[1] === 'barre' ? 1 : Hb;
      pose(m, x0, yc - g / 2 - r - b1, dents[0], a, b1);
      const o = pose(m, x0, yc + g / 2 + r + b2, dents[1], a, b2);
      chemin([[x0 - 40, yc], [x0 + 2 * a + 40, yc]]);
      return fin(o);
    },
    // une porte dont l'ouverture monte et descend doucement
    porteMobile(x0) {
      const m = matiere(), g = ouvertureS() + 18, A = rnd(14, 26), yc = rnd(yMinDrone() + g / 2 + A, G.SOL - g / 2 - A), om = rnd(.7, 1.1);
      const a = murHaut(m, x0, yc - g / 2), b = murSol(m, x0, yc + g / 2);
      for (const o of [a, b]) { animer(o, 'monte', A, om, 0); o.mvt.t = 0; o.mvt.base[0].ay += o === a ? -A : A; }
      chemin([[x0 - 70, yc], [x0 + 70, yc]]);
      return Math.max(fin(a), fin(b));
    },
    // un bras qui tourne sur son axe
    bras(x0) {
      const m0 = matiere(), m = m0 === 'escalator' ? 'viaduc' : m0, l = rnd(38, 44), y = 112, o = structure(m, [{ ax: x0 - l, ay: y, bx: x0 + l, by: y, finA: 1, finB: 1 }], [accroche(x0, y)]);
      o.bras = { a: rnd(6.28), v: pick([-1, 1]) * rnd(1, 1.7), l, y };
      return fin(o);
    },
  };

  /* Plus d'obstacles sprites (Max, 03/11/2026 : « c'est trop dur a eviter, type oiseau ou autre ») : ni objet du lieu pose
     sur le parcours, ni ce qui vole, ni attaque qui vise le joueur, ni vehicule. Le parcours n'est fait que de structures
     (et des pieges des gros bonus, et du boss). Les sprites restent dans le decor, inoffensifs. Tout est garde ici, eteint :
     ce drapeau le rallumerait. tests/sans_sprites.js le prouve sur tous les decors. */
  const SPRITES_OBSTACLES = false;
  const SPRITE_K = { sprite: 1, vol: 1, guide: 1, veh: 1, col: 1, cable: 1, saut: 1 };
  /* Ce qui vient en face tient compte de ce qui est deja la : on ne lance un objet rapide que sur un champ libre */
  const devantLibre = () => !W.obs.some(o => o.x + (o.w || 0) / 2 > HX - 24 && o.k !== 'courant');
  /* ---- Les sprites : un objet du lieu, seul, jamais une foule (eteints, voir SPRITES_OBSTACLES) ---- */
  const SECTIONS = {
    sol(x0) { const y = hautMur(rnd(G.lerp(150, 110, dif()), 165)), o = solA(x0, y); if (!o) return SECTIONS.pend(x0); chemin([[o.x - o.w / 2 - 50, y - 26], [o.x + o.w / 2 + 50, y - 26]]); return fin(o); },
    arche(x0) { const y = basPlafond(rnd(58, G.lerp(92, 124, dif()))), o = archeA(x0, y); if (!o) return SECTIONS.sol(x0); chemin([[o.x - o.w / 2 - 50, y + 28], [o.x + o.w / 2 + 50, y + 28]]); return fin(o); },
    pend(x0) { const y = basPlafond(rnd(58, G.lerp(92, 124, dif()))), o = pendA(x0, y); if (!o) return x0; chemin([[o.x - o.w / 2 - 50, y + 28], [o.x + o.w / 2 + 50, y + 28]]); return fin(o); },
    bobines(x0) { return semerBobines(x0, 0); },
    vol(x0) { W.prochain = SPAWN.vol() * .7; return x0; },
    guide(x0) { W.prochain = SPAWN.guide(); return x0; },
    jet(x0) { W.prochain = SPAWN.jet(); return x0 + 110; },
    veh(x0) { W.prochain = SPAWN.veh(); return x0; },
    rayons(x0) { W.prochain = SPAWN.rayons(); return x0; },
    baleine(x0) { W.prochain = SPAWN.baleine(); return x0; },
    meduses(x0) { W.prochain = SPAWN.meduses(); return x0 + 150; },
    requin(x0) { W.prochain = SPAWN.requin(); return x0; },
    courant(x0) { W.prochain = SPAWN.courant(); return x0 + 60; },
    globe(x0) { W.prochain = SPAWN.globe(); return x0 + 40; },
  };
  for (const n in MOTIFS) SECTIONS[n] = MOTIFS[n];
  let derniereSection = null, derniereBande = null, dernierSprite = false;
  const recents = [];
  function choisirSprite() {
    const t = W.tJeu, r = W.sc.def.r, libre = devantLibre(), k = kit();
    let l;
    if (W.sc.type === 'eau') { l = ['sol', 'courant']; if (libre) l.push('meduses', 'requin', 'globe'); }
    else if (sousPlafond()) {
      l = [];
      if (dispo(k.sol).length) l.push('sol');
      if (dispo(k.pend).length) l.push('pend');
      // plus d'arches (Max, 02/11/2026) : ces grands sprites coupes en haut ne disaient pas s'il fallait les eviter
      if (libre && dispo(k.ciel).length) l.push('vol');
    } else {
      l = ['sol', 'sol'];
      if (dispo(k.pend).length) l.push('pend');
      if (libre) {
        l.push('vol', 'vol');
        if (t > 8) l.push('guide');
        if ((W.sc.def.veh || W.reg.veh || []).length && t > 14) l.push('veh');
        if (G.JET_OK[r] && t > 14) l.push('jet');
        if (G.RAYONS_OK[r] && t > 28) l.push('rayons');
        if (W.sc.def.baleine) l.push('baleine', 'baleine');
      }
    }
    return l.length ? pick(l) : null;
  }
  // les motifs qui touchent a coup sur un drone pose au sol, ou colle en haut (mesure le 05/11/2026)
  const DELOGE_SOL = ['murSol', 'diagSol', 'porte', 'slalom', 'entonnoir', 'couloir', 'chicane', 'tunnel', 'machoire', 'porteMobile'];
  const DELOGE_HAUT = ['murHaut', 'diagHaut', 'porte', 'slalom', 'entonnoir', 'couloir', 'chicane', 'tunnel', 'machoire', 'porteMobile'];
  function choisirSection() {
    const t = W.tJeu;
    // une respiration avec un seul objet du lieu, de temps en temps ; l'essentiel du parcours, ce sont les structures.
    // Sprites eteints (Max, 03/11/2026) : une structure prend leur place, le rythme ne faiblit pas.
    if (SPRITES_OBSTACLES && !dernierSprite && Math.random() < .34) {
      const s = choisirSprite();
      if (s) { dernierSprite = true; return s; }
    }
    dernierSprite = false;
    const l = ['murSol', 'murHaut', 'poutre', 'forme', 'forme', 'semis'];
    if (t > 4) l.push('porte', 'slalom', 'diagSol', 'diagHaut', 'forme', 'formeBouge', 'machoire');
    if (t > 14) l.push('slalom', 'entonnoir', 'escalier', 'chicane', 'semis', 'formeBouge', 'porteMobile');
    if (t > 26) l.push('slalom', 'tunnel', 'couloir', 'chicane', 'forme', 'formeBouge', 'machoire');
    if (t > 42) l.push('tunnel', 'couloir', 'slalom', 'porteMobile', 'semis');
    if (t > 20 && !W.sc.def.plafond && !sous()) l.push('bras');
    if (G.Structures.du(W.sc.id).includes('escalator') && !W.matForce) l.push('escalators', 'escalators', 'escalators');
    // On ne s'endort pas (Max, 05/11/2026 : « a Deauville, il m'a suffi de rester a terre ») : qui reste colle au sol, ou tout en
    // haut, depuis 1 s voit arriver un motif qui bouche cet endroit (mesure : 9 motifs sur 19 laissent passer un drone pose au sol).
    const deloge = W.solT > 1 ? DELOGE_SOL : W.hautT > 1 ? DELOGE_HAUT : null;
    if (deloge) {
      const c = l.filter(q => deloge.includes(q) && !recents.includes(q)), c2 = c.length ? c : l.filter(q => deloge.includes(q));
      if (c2.length) { const m = pick(c2); recents.push(m); if (recents.length > 3) recents.shift(); derniereSection = m; return m; }
    }
    // jamais les memes coup sur coup : on veut etre surpris
    let m = pick(l);
    for (let i = 0; i < 6 && recents.includes(m); i++) m = pick(l);
    recents.push(m); if (recents.length > 3) recents.shift();
    derniereSection = m;
    return m;
  }

/* Lignes de bobines : elles dessinent le bon chemin (et parfois le chemin risque) */
  function semerBobines(x0, gap) {
    let fin = x0 + 300;
    const forme = pick(['ligne', 'arc', 'sinus', 'bloc', 'diag', 'coeur', 'ras']);
    const y0 = rnd(50, 160);
    const add = (dx, dy) => W.items.push({ k: 'bob', x: x0 + dx, y: y0 + dy });
    if (forme === 'ligne') for (let i = 0; i < 14; i++) add(i * 14, 0);
    if (forme === 'arc') for (let i = 0; i < 14; i++) add(i * 14, Math.sin(i / 13 * 3.14) * -38 + 18);
    if (forme === 'sinus') for (let i = 0; i < 20; i++) add(i * 13, Math.sin(i * .5) * 22);
    if (forme === 'bloc') for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) add(i * 12, j * 12 - 12);
    if (forme === 'diag') for (let i = 0; i < 12; i++) add(i * 14, (i - 6) * 7 * (y0 > 100 ? -1 : 1));
    if (forme === 'coeur') for (const [a, b] of [[0, 1], [1, 0], [2, 0], [3, 1], [4, 0], [5, 0], [6, 1], [0, 2], [6, 2], [1, 3], [5, 3], [2, 4], [4, 4], [3, 5]]) add(a * 12, b * 11 - 24);
    if (forme === 'ras') for (let i = 0; i < 22; i++) W.items.push({ k: 'bob', x: x0 + i * 13, y: G.SOL - 6 });
    // la bande finit apres sa derniere bobine (avant : toujours 300 unites, meme pour un coeur de 72 ; au depart plus doux du
    // 05/11/2026, cela faisait jusqu'a 2,5 s sans rien devant le drone, tests/rythme.js)
    let der = x0;
    for (const it of W.items) if (it.k === 'bob' && it.x > der && it.x < x0 + 400) der = it.x;
    fin = Math.min(fin, der + 30);
    return fin;
  }

  /* ---- Les pieges : un gros bonus au milieu du danger.
     Reperes : le corps du drone occupe 19 unites au-dessus et au-dessous de son centre (y - 12).
     marge = ce qu'il reste de chaque cote une fois centre sur le bonus : plus la partie avance, plus c'est serre. */
  function tresor(x, y) {
    const t = Math.random();
    const palier = W.palier;
    let it;
    if (t < .1 && W.vies < W.viesMax) it = { k: 'coeur' };   // un coeur seulement s'il en manque un (tests/coeur_plein.js)
    else if (bonusPret()) it = poserBonus(x, y);
    /* Les lettres ACTION ne viennent que des pieges, au milieu du danger (Max, 08/11/2026 : « fais en sorte que les lettres apparaissent
       plus souvent : j'ai fait presque 10 000 m et je n'en ai eu que 2 », puis « qu'elles soient tout de meme difficiles a avoir, ne les
       mets pas dans les lignes de bobines ») : un piege sur deux environ en porte une (avant : un sur cinq). Controle : tests/lettres.js. */
    else if (t < .6) {
      const manque = 'ACTION'.split('').filter(c => !W.lettres[c]);
      it = manque.length ? { k: 'lettre', l: pick(manque) } : { k: 'grosse', val: 25 };
    } else {
      it = { k: 'grosse', val: (20 + palier * 10) * (J.aBonus('grosses') ? 2 : 1) };
    }
    it.x = x; it.y = y; it.piege = true;
    W.items.push(it);
  }
  J.tresor = (x, y) => tresor(x, y);
  const marge =() => clamp(17 - W.palier, 10, 16);
  const limiteHaut = () => G.PLAFOND + 32 + (W.sc.def.plafond ? W.sc.def.plafond * .5 : 0);
  const NIDS = J.NIDS = {
    // un tunnel etroit : le tresor au milieu
    couloir() {
      const cy = rnd(84, 146), e = 19 + 5 + marge(), x0 = W.spawnX0 + 40, m = matiere(), pas = epais(m) + 20;
      let x = x0;
      for (let i = 0; i < 3; i++) { murHaut(m, x, cy - e); murSol(m, x, cy + e); x += pas; }
      tresor(x0 + pas, cy);
      return { d: Math.max(1.9, (x - x0) / W.v + .5), y: cy };
    },
    // une porte : le haut et le bas au meme endroit, le tresor dans l'ouverture
    porte() {
      const cy = rnd(84, 152), e = 19 + 5 + marge() + 2, x0 = W.spawnX0 + 20, m = matiere();
      murHaut(m, x0, cy - e); murSol(m, x0, cy + e);
      tresor(x0, cy);
      return { d: 1.6, y: cy };
    },
    // au ras du sol, sous une poutre basse : il faut oser descendre
    ras() {
      const x0 = W.spawnX0 + 40, yb = G.SOL - 12, m = matiere(), L = rnd(80, 120), r = ray(m);
      poutre(m, x0, yb - 19 - 5 - marge() - r, L);
      tresor(x0 + L / 2, yb);
      return { d: 1.7 + L / W.v, y: yb };
    },
    // tout la-haut, au-dessus d'une poutre
    plafond() {
      const x0 = W.spawnX0 + 40, yb = limiteHaut() - 12, m = matiere(), L = rnd(80, 120), r = ray(m);
      poutre(m, x0, yb + 19 + 5 + marge() + r, L);
      tresor(x0 + L / 2, yb);
      return { d: 1.7 + L / W.v, y: yb };
    },
    // les projecteurs s'allument : le tresor est dans la seule bande eteinte
    rayons() {
      const pas = 46, ligne = irnd(1, 2), cy = 40 + ligne * pas + pas / 2 - 4;
      for (let i = 0; i < 4; i++) {
        const y = 40 + i * pas;
        if (i === ligne || i === ligne + 1) { if (i === ligne) { W.obs.push({ k: 'rayon', y: y - 18, warn: 1.5, on: .85, T: 0 }); } else { W.obs.push({ k: 'rayon', y: y + 18, warn: 1.5, on: .85, T: 0 }); } continue; }
        W.obs.push({ k: 'rayon', y, warn: 1.5, on: .85, T: 0 });
      }
      tresor(G.VW + 40, cy);
      return { d: 2.4, y: cy };
    },
    // au-dessus d'un geyser : il faut y aller entre deux jets
    geyser() {
      const x0 = W.spawnX0 + 70, cy = rnd(106, 128);
      W.obs.push({ k: 'jet', t: W.reg.jet || 'eau', x: x0, warn: rnd(.5, 1.2), h: 116, on: .6, T: 0, cycle: 1 });
      W.obs.push({ k: 'jet', t: W.reg.jet || 'eau', x: x0 + 300 * W.v / 240, warn: rnd(.5, 1.2), h: 116, on: .6, T: 0, cycle: 1 });
      tresor(x0 + 150 * W.v / 240, cy);
      return { d: 2.0, y: cy };
    },
  };
  /* Le grand barrage (Max, 05/11/2026 : « des grosses attaques qui apparaissent et traversent tout l'ecran pour obliger le joueur a se
     positionner et a se stabiliser un moment ; attention a ce que le joueur ne se retrouve pas coince ») : les projecteurs du plateau
     s'allument en rideau, sur toute la largeur et toute la hauteur de l'image, sauf un couloir balise de bobines. Une, deux ou trois
     salves ; la suivante s'annonce pendant que la precedente brille, et son couloir garde toujours au moins 60 % du precedent :
     on y passe sans jamais traverser un rayon. Il ne part que si rien n'est devant le drone, et rien d'autre ne vient
     pendant qu'il dure. Sous l'eau, ou le drone est lent, couloirs plus larges et annonces plus longues.
     Contrôles : tests/ennui.js (sa forme, sa frequence), tests/passage.js (on passe toujours, dans chaque decor), tests/barrage.js
     (un pilote humain, qui voit avec 0,2 s de retard, en traverse au moins 90 % sans un choc ; on ne meurt qu'une fois). */
  // il peut partir quand plus rien ne sera devant le drone au moment ou la premiere salve s'allume (pas d'accalmie inutile)
  const ecranLibre = () => { const v = Math.max(W.v * W.ech, 60), w0 = sous() ? 1.8 : 1.45; return !W.obs.some(o => !o.mort && (o.k === 'rayon' || (o.x !== undefined && o.k !== 'jete' && (o.x + (o.w || 40) / 2 - (HX - 40)) / v > w0 - .3))); };
  function lancerBarrage() {
    const eau = sous(), d = dif(), id = W.nBarrage = (W.nBarrage || 0) + 1;
    const hyMin = G.PLAFOND + 20 + (W.sc.def.plafond ? W.sc.def.plafond * .5 : 0), hyMax = G.SOL - 12;
    // (Max, 05/11/2026 : « trop serres ») couloir de 56 a 48 unites sur terre (avant 46 a 38), 64 sous l'eau (avant 56) ; la salve
    // suivante decale moins le couloir (au plus 40 % de sa largeur : il garde 60 % du precedent) et laisse un peu plus de temps
    // 1, 2 ou 3 salves, jamais plus (Max, 06/11/2026 : « maximum 3 d'affilee, pas 4 ; tu peux en faire 1 ou 2 aussi ») ;
    // les longues un peu plus souvent quand la partie avance
    const tir = Math.random(), n = tir < G.lerp(.3, .18, d) ? 1 : tir < G.lerp(.68, .55, d) ? 2 : 3;
    const larg = eau ? 64 : G.lerp(56, 48, d);
    const on = eau ? .9 : .8, ecart = eau ? .4 : .3, warn0 = eau ? 1.8 : 1.45;
    const v = W.v * W.ech, cmin = hyMin + larg / 2 + 4, cmax = hyMax - larg / 2 - 4;
    // le premier couloir est a l'ecart du drone : il faut aller se placer (pas trop loin : on a le temps de l'annonce)
    const hy = W.y - 12, loin = [];
    for (let y = cmin; y <= cmax; y += 2) { const e = Math.abs(y - hy); if (e >= larg / 2 + 18 && e <= 115) loin.push(y); }
    let c = loin.length ? pick(loin) : rnd(cmin + 2, cmax - 2), t = 0;
    for (let k = 0; k < n; k++) {
      if (k) {
        const s = rnd(10, larg * .4) * (Math.random() < .5 ? -1 : 1);
        c = clamp(c + s >= cmin && c + s <= cmax ? c + s : c - s, cmin, cmax);
      }
      const debut = t, warn = k ? on + ecart : warn0, allume = debut + warn;
      for (let L = c - larg / 2 - 15; L + 15 > hyMin - 2; L -= 28) W.obs.push({ k: 'rayon', y: L, warn, on, T: -debut, barrage: id, salve: k, couloir: c, largeur: larg });
      for (let L = c + larg / 2 + 15; L - 15 < hyMax + 2; L += 28) W.obs.push({ k: 'rayon', y: L, warn, on, T: -debut, barrage: id, salve: k, couloir: c, largeur: larg });
      // des bobines dans le couloir, la ou passera le drone pendant que la salve brille
      for (let q = allume + .08; q < allume + on - .04; q += .13) W.items.push({ k: 'bob', x: HX + v * q, y: c });
      t = allume;
    }
    const fin = t + on;
    // la sortie (Max, 06/11/2026 : « a la fin, j'ai eu le cas ou je n'avais pas le choix de toucher ») : la bande suivante arrivait
    // 0,3 a 0,4 s apres l'extinction, ou que soit son ouverture, alors que le joueur etait tenu dans le dernier couloir. Elle n'arrive
    // plus qu'une fois qu'un joueur qui reagit 0,25 s apres l'extinction a pu rejoindre n'importe quelle altitude depuis ce couloir
    // (bord de l'obstacle compris : on compte 60 unites devant son debut). Controle : tests/barrage_sortie.js
    const tPire = Math.max(tempsPour(hyMax - c), tempsPour(hyMin - c));
    W.barrage = { id, fin: W.T + fin, reprise: W.T + Math.max(.5, fin + .25 + tPire - (W.spawnX0 + 20 - 60 - HX) / Math.max(v, 60)) };
    W.prochain = 0; W.finBande = 0;
    derniereBande = 'barrage';
  }
  J.lancerBarrage = () => { W.barrageT = 0; };
  function lancerNid() {
    const r = W.sc.def.r;
    let l = ['couloir', 'porte', 'ras', 'plafond'];
    if (W.tJeu > 18 && G.JET_OK[r]) l.push('geyser');
    if (W.tJeu > 36 && G.RAYONS_OK[r]) l.push('rayons');
    // qui campe au sol ne trouve pas son tresor au sol, sous une poutre ; qui campe en haut, pas au-dessus d'une poutre (05/11/2026)
    if (W.solT > 1) l = l.filter(q => q !== 'ras');
    if (W.hautT > 1) l = l.filter(q => q !== 'plafond');
    const n = pick(l);
    return NIDS[n]();
  }

  /* ---- Figurants ---- */
  /* Sur l'accueil (120) et dans la vue d'un decor depuis le carnet (60), le decor defile lentement : qui va plus vite que lui
     (rollers, skieurs, cyclistes, poursuites...) partait vers la droite sans jamais entrer dans l'image (Max, 05/11/2026). Il entre
     alors par la gauche et double la camera, et personne ne reste colle au bord : au moins 20 d'ecart avec le defilement.
     En partie (212 et plus), rien ne change : tout le monde est plus lent que le drone. */
  function entree(v) {
    if (!W.demo) return { v, gauche: false };
    const vs = W.v * W.ech;
    if (v > vs - 20 && v < vs + 20) v = v >= vs ? vs + 20 : vs - 20;
    return { v, gauche: v > vs };
  }
  function nouvelleSilhouette() {
    const def = W.sc.def, reg = W.reg;
    const gens = def.gensX || reg.gens;
    if (!gens || !gens.length || def.sobre) return;
    if (def.flotte) {
      // pas de marche sur l'eau : on nage, et on fait coucou
      const f = { d: pick(['plongeur', 'marin', 'surfeur', 'touriste']), x: G.VW + 16, y: G.SOLF, v: 14, pose: pick(['salut', 'neutre']), tp: 0, nageur: true, ph: rnd(6) };
      if (Math.random() < .6) { f.dire = rnd(.2, 1); f.dits = ['L\'eau est bonne !', 'Au secours !', 'Y a des requins ?', 'Mon maillot !', 'Coucou maman !', 'Par ici le drone !']; }
      W.figs.push(f);
      return;
    }
    // qui va vers la gauche y va franchement, sinon il aurait l'air de glisser avec le decor
    const f = { d: pick(gens), x: G.VW + 16, y: G.SOLF, v: pick([0, 0, 18, 30, 34, 75, -32, -46, -110]), pose: 'marche', tp: 0, flip: false, role: pick(['fan', 'fan', 'peureux', 'peureux', 'badaud']) };
    const allure = G.ALLURE[f.d];
    f.d = G.varier(f.d);
    if (allure) { f.v = rnd(allure[1], allure[2]); f.pose = allure[0]; f.role = 'badaud'; }
    else if (f.v === 0) f.pose = pick(['salut', 'filme', 'neutre', 'applaudit']);
    else if (Math.abs(f.v) > 50) f.pose = 'course';
    if (f.v < 0 && !allure) f.flip = true;
    if (Math.random() < .35) bulleLater(f);
    const e = entree(f.v);
    f.v = e.v; if (e.gauche) f.x = -16;
    W.figs.push(f);
  }
  function bulleLater(f) { f.dire = rnd(.25, 1.2); }
  function animauxFoule() {
    const f = W.sc.def.foule;
    if (!f) return;
    const id = pick(f);
    if (!D.existe(id)) return;
    if (W.sc.def.flotte) return;
    const eau = W.sc.type === 'eau';
    const a = { s: id, x: G.VW + 20, y: G.SOLF, h: eau ? rnd(16, 150) : 0, v: eau ? rnd(40, 120) : rnd(0, 26), hop: eau ? 0 : 1, nage: eau, flip: false, tp: rnd(6) };
    const e = entree(a.v); a.v = e.v; if (e.gauche) a.x = -20;
    W.figs.push(a);
    if (eau && (id === 'tortue' || Math.random() < .25) && D.existe('tortue_lunettes')) {
      const t = { s: 'tortue_lunettes', ami: true, x: G.VW + 60, y: G.SOLF, h: rnd(30, 150), v: rnd(70, 120), nage: true, tp: rnd(6) };
      const et = entree(t.v); t.v = et.v; if (et.gauche) t.x = -60;
      W.figs.push(t);
    }
  }
  function lancerGag() {
    const r = W.sc.def.r;
    if (W.sc.def.flotte || W.sc.def.sobre || W.sc.def.sansGag) return;
    let gag = G.gagPour(r, W.sc.def.id);
    if (!gag) return;
    const acteurs = gag.acteurs.filter(a => !a.s || D.existe(a.s));
    if (acteurs.length !== gag.acteurs.length) return;
    const groupe = [];
    const base = G.VW + 44;
    for (const a of gag.acteurs) {
      const f = { d: a.d, s: a.s, i: a.i, x: base + (a.dx || 0), y: G.SOLF, h: a.y || 0, v: a.v || 0, pose: a.pose || 'marche', tp: rnd(4), flip: !!a.flip, hop: a.hop || 0, gag: true, cache: a.cache };
      if (a.s) D.spr(a.s, 'l');
      groupe.push(f);
      W.figs.push(f);
    }
    // une poursuite plus rapide que le defilement (accueil, carnet) entre par la gauche, tout le groupe ensemble
    if (groupe.every(f => entree(f.v).gauche)) {
      const dx = -60 - Math.max(...groupe.map(f => f.x));
      for (const f of groupe) { f.v = entree(f.v).v; f.x += dx; }
    }
    W.gagsEnCours = W.gagsEnCours || [];
    W.gagsEnCours.push({ tl: gag.tl.slice(), t: 0, groupe });
  }
  /* Une grande scene de foule */
  function lancerFoule(force) {
    const def = W.sc.def;
    // une foule a la fois : deux qui se croisent, ca fait des pancartes illisibles
    if (!force && W.figs.some(f => f.foule && f.x > -30 && f.x < G.VW + 60)) { W.spawnFoule = rnd(2, 4); return; }
    const l = G.FOULES_DECOR[def.id] || G.FOULES[def.r];
    if (!l || !l.length || W.sc.type === 'eau' && def.r !== 'sousmarin' || def.flotte || def.sobre || def.sansFoule) return;
    // une manif dans un musee ou des rollers dans un hall : non
    if (sousPlafond() && !G.FOULES_DECOR[def.id] && def.r !== 'metro') return;
    const o = pick(l);
    const grp = { o, membres: [], t: 0, jets: 0, reagi: false };
    const base = G.VW + 30;
    const parlent = [];
    // une scene, pas une maree humaine
    const n = Math.max(5, Math.round(o.n * rnd(.55, .85)));
    for (let i = 0; i < n; i++) {
      const d = G.varier(o.g[i % o.g.length]);
      const f = { d, x: base + i * o.esp * rnd(1, 1.5) + rnd(-3, 3), y: G.SOLF + (i % 3 === 1 ? 1 : 0), v: o.v, pose: o.pose, tp: rnd(4), flip: false, gag: true, foule: true, h: o.flotte ? rnd(30, 130) : 0 };
      if (o.pose === 'saute') f.hop = 1;
      W.figs.push(f);
      grp.membres.push(f);
    }
    // la banderole au milieu du cortege, les pancartes de part et d'autre : une personne sur deux au plus, jamais l'une sur
    // l'autre ni sur la banderole, et pas toujours les memes (avant, une manif a banderole ne montrait aucune pancarte,
    // et les pancartes longues se recouvraient)
    // Chaque pancarte et la banderole ont un porteur a chaque bout (Max, 04/11/2026) : le second porteur se place sous le baton
    // de droite, et ceux qui le suivent reculent d'autant (le cortege s'allonge, personne ne passe sous un baton).
    // (la liste n'est pas rangee de gauche a droite : chacun est tire a i * esp * [1 ; 1,5]) ; on la range, et deux marcheurs
    // ne se tiennent jamais au meme endroit
    const m = grp.membres.slice().sort((a, b) => a.x - b.x);
    for (let q = 1; q < n; q++) if (m[q].x < m[q - 1].x + 7) m[q].x = m[q - 1].x + 7;
    const decaler = (j, d) => { if (d > 0) for (let q = j; q < n; q++) m[q].x += d; };
    const kb = o.banderole ? G.clamp((n >> 1) - 1, 0, n - 3) : -9;
    if (o.banderole) {
      decaler(kb + 2, m[kb].x + G.txtW(o.banderole) + 12 - m[kb + 2].x);
      m[kb + 2].x = m[kb].x + G.txtW(o.banderole) + 12;
      m[kb].banderole = { t: o.banderole, avec: m[kb + 2] };
      m[kb].banderoleEcart = G.txtW(o.banderole) + 14;
      m[kb + 2].porteur = true;
    }
    let fin = -1e9, der = -9, k = o.pancartes ? G.irnd(0, o.pancartes.length - 1) : 0;
    if (o.pancartes) for (let i = 0; i < n - 1; i++) {
      // ni les porteurs de la banderole, ni celui qui la precede (son second porteur serait le premier de la banderole)
      if (i >= kb - 1 && i <= kb + 2) { if (i === kb + 2) fin = G.banderoleFin(m[kb]) + 2; continue; }
      const f = m[i], p = m[i + 1];
      if (i - der < 2) continue;
      const t = o.pancartes[k % o.pancartes.length], w = G.pancarteW(t);
      if (f.x + 1 < fin + 3) continue;
      // le second porteur sous le baton de droite : les batons sont a 3 unites devant les pieds de chacun
      decaler(i + 1, f.x + w - 4 - p.x);
      // le second porteur juste sous le baton de droite : la pancarte a la largeur de son texte, ni plus ni moins
      p.x = f.x + w - 4;
      f.pancarte = t; f.pancarteAvec = p; f.pancarteEcart = w - 4; p.porteur = true;
      fin = G.pancarteBornes(f).x1; der = i + 1; k++;
    }
    // le cortege en place : une pancarte qui toucherait la banderole ou sa voisine n'est pas portee (garde-fou, tests/pancartes.js)
    const pris = [];
    if (o.banderole) pris.push([m[kb].x - 2, G.banderoleFin(m[kb]) + 2]);
    for (const f of m) if (f.pancarte) {
      const B = G.pancarteBornes(f);
      if (pris.some(([a, b]) => B.x1 > a && B.x0 < b)) { f.pancarte = null; f.pancarteAvec = null; continue; }
      pris.push([B.x0, B.x1]);
    }
    // plus rapide que le defilement (accueil, carnet) : tout le cortege entre par la gauche, dans le meme ordre
    const e = entree(o.v);
    if (e.v !== o.v) for (const f of m) f.v = e.v;
    if (e.gauche) { const dx = -30 - Math.max(...m.map(f => f.x)); for (const f of m) f.x += dx; }
    W.groupes = W.groupes || [];
    W.groupes.push(grp);
  }
  function majFoules(dt) {
    if (!W.groupes) return;
    const v = W.v * W.ech;
    for (const g of W.groupes) {
      g.t += dt;
      const o = g.o;
      // les seconds porteurs restent sous leur baton et marchent du meme pas que le premier : une pancarte, une banderole ne
      // s'etirent jamais (Max, 04/11/2026) ; si l'un tombe, l'autre garde la pancarte sur un seul baton
      for (const f of g.membres) {
        const p = f.pancarteAvec || (f.banderole && f.banderole.avec);
        if (!p || f.tombe || p.tombe) continue;
        p.x = f.x + (f.pancarteAvec ? f.pancarteEcart : f.banderoleEcart - 2);
        p.v = f.v; p.pose = f.pose; p.flip = f.flip;
      }
      const sur = g.membres.filter(f => f.x > -10 && f.x < G.VW);
      if (sur.length) {
        // des voix dans la foule
        g.parole = (g.parole === undefined ? .6 : g.parole) - dt;
        if (g.parole <= 0 && o.bulles) { g.parole = rnd(.8, 1.7); const f = pick(sur); if (f.d) bulleFig(f, pick(o.bulles)); }
        // reaction au drone quand il passe
        // (dans la vue du carnet, il n'y a pas de drone : la foule ne reagit a rien)
        const dessous = W.vivant && !W.sansHeros && W.y > G.SOL - 115 && sur.some(f => Math.abs(f.x - HX) < 90);
        if (dessous) {
          if (o.reaction === 'jette' && !W.demo) {
            g.jetT = (g.jetT || .3) - dt;
            if (g.jetT <= 0 && g.jets < 7) {
              g.jetT = rnd(.45, .9); g.jets++;
              const avant = sur.filter(f => f.x > HX + 20);
              if (avant.length) {
                const f = pick(avant), t = rnd(.8, 1.1), G0 = 300;
                f.pose = 'salut'; f.tp = 0;
                const cx = HX + rnd(-20, 30), cy = W.y - 20;
                W.obs.push({ k: 'jete', i: o.i || 'tomate', x: f.x, y: f.y - 30, vx: (cx - f.x) / t, vy: (cy - (f.y - 30) - .5 * G0 * t * t) / t, g: G0, r: 0, gentil: o.gentil });
                if (Math.random() < .4) bulleFig(f, pick(['Tiens !', 'Attrape !', 'Prends ça !', 'Dégage !']));
              }
            }
          }
          // Qui porte une pancarte ou la banderole reste avec son cortege et la brandit : avant (Max, 05/11/2026, Deauville), chaque
          // porteur devenait un fan qui courait sous le drone, et toutes les pancartes finissaient les unes sur les autres.
          // Une foule qui fuit fuit d'un meme pas, sinon ses pancartes se rattrapent (tests/pancartes_vie.js).
          const porte = f => f.pancarte || f.pancarteAvec || f.banderole || f.porteur;
          if (o.reaction === 'fans' && !g.reagi) { g.reagi = true; for (const f of sur) { if (!f.d) continue; if (porte(f)) { f.pose = 'saute'; f.hop = 1; continue; } f.role = 'fan'; f.fanT = 0; f.gag = false; f.textes = o.bulles; } }
          if (o.reaction === 'fuit' && !g.reagi) { g.reagi = true; const vf = v * rnd(.6, .95); for (const f of g.membres) { f.pose = 'panique'; f.v = vf; } }
          if (o.reaction === 'applaudit') { for (const f of sur) { if (!f.tombe) { f.pose = 'applaudit'; } } }
        }
        // la ola : une vague de bras qui parcourt la foule
        if (o.reaction === 'ola') for (const f of g.membres) { const k = Math.sin(W.T * 4 - f.x * .04); f.hop = 0; f.h = k > .55 ? (k - .55) * 18 : 0; f.pose = k > .3 ? 'saute' : 'applaudit'; }
      }
    }
    // un cortege vit tant qu'un de ses membres est encore la (celui qui double la camera part de la gauche de l'image)
    const la = new Set(W.figs);
    W.groupes = W.groupes.filter(g => g.membres.some(f => la.has(f) && (f.x > -60 || f.v > v)));
  }

  function majGags(dt) {
    if (!W.gagsEnCours) return;
    for (const g of W.gagsEnCours) {
      g.t += dt;
      for (const ev of g.tl) {
        if (ev.fait || g.t < ev[0]) continue;
        ev.fait = true;
        const f = g.groupe[ev[1]], c = ev[2];
        if (!f) continue;
        if (c.bulle) bulleFig(f, c.bulle);
        if (c.pose) f.pose = c.pose;
        if (c.v !== undefined) f.v = c.v;
        if (c.tombe) faireTomber(f);
        if (c.etoiles) f.etoiles = 2;
        if (c.saut !== undefined) { f.vh = c.saut; f.enVol = true; f.cache = false; }
        if (c.y !== undefined) f.hCible = c.y;
        if (c.hop !== undefined) f.hop = c.hop;
        if (c.rot !== undefined) f.rot = c.rot;
      }
    }
    // on reinitialise les marqueurs pour pouvoir rejouer la saynete plus tard
    W.gagsEnCours = W.gagsEnCours.filter(g => {
      if (g.t > 6) { g.tl.forEach(e => delete e.fait); return false; }
      return true;
    });
  }
  function majFigs(dt) {
    const v = W.v * W.ech;
    for (const f of W.figs) {
      if (f.quai) { majRame(f, dt); continue; }
      regleFig(f);
      f.x -= (v - f.v) * dt;
      // les jambes vont au rythme de ce qu'il avance vraiment ; un cheval y cale ses images de galop (f.sol, D.sprAllure)
      f.tp += dt * clamp(Math.abs(f.v) * .13, 4, 15);
      if (f.s) f.sol = (f.sol || 0) + Math.abs(f.v) * dt;
      if (f.tombe) {
        const av = f.chuteT || 0;
        f.chuteT = av + dt;
        // le choc au sol : un nuage et des etoiles
        if (av < .55 && f.chuteT >= .55) { f.etoiles = 1.3; if (W.fx) for (let i = 0; i < 5; i++) G.FX.fumee(W, f.x + (f.flip ? -12 : 12) + rnd(-8, 8), f.y - 2, { ton: 'poussiere', r0: 0, r1: rnd(1.5, 3), T: rnd(.3, .6), vy: rnd(-22, -6) }); }
      }
      if (f.bulleT > 0) f.bulleT -= dt;
      if (f.dire !== undefined) {
        f.dire -= dt;
        if (f.dire < 0) { delete f.dire; const l = f.dits || W.sc.def.repliques || G.REPLIQUES[W.sc.def.r]; if (l) bulleFig(f, pick(l)); }
      }
      if (f.etoiles) f.etoiles -= dt;
      if (f.ami && !f.salue && W.vivant && Math.abs(f.x - HX) < 26 && Math.abs((f.y - f.h) - W.y + 6) < 26) {
        f.salue = true;
        bulleFig(f, pick(['Yo !', 'Cool, mec !', 'Tope là !', 'Zen...']));
        const g = 12;
        G.gagne(g); W.bob += g;
        W.pouv.aimant = Math.max(W.pouv.aimant || 0, 2.5);
        W.textes.push({ t: 'COPINE ! +' + g, c: '#7dff8a', x: HX + 40, y: W.y - 34, T: .9, sm: true });
        G.Audio && G.Audio.sfx('mission');
        mission('tortues', 1);
      }
      if (f.hCible !== undefined) f.h += (f.hCible - f.h) * Math.min(1, dt * 7);
      if (f.enVol) {
        f.vh -= 380 * dt;
        f.h = (f.h || 0) + f.vh * dt;
        if (f.h <= 0) { f.h = 0; f.enVol = false; if (f.d || f.s) { f.vh = 0; } }
      }
      // chacun reagit a sa facon quand le drone arrive
      if (f.d && !W.demo && !f.tombe && W.vivant && f.role) {
        const dx = f.x - HX;
        const bas = W.y > G.SOL - 110;
        if (f.role === 'fan') {
          if (!f.fanT && bas && dx > -30 && dx < 170) {
            f.fanT = rnd(3, 6); f.gag = true;
            bulleFig(f, f.textes ? pick(f.textes) : pick(['Attends !', 'Un autographe !', 'Moi aussi je veux voler !', 'Hé, le drone !', 'Filme-moi !', 'Je passe à la télé ?', 'Salut maman !']));
          }
          if (f.fanT > 0) {
            f.fanT -= dt;
            // il court pour rester sous le drone, et finit par lacher
            const cible = HX + (f.placeX || (f.placeX = rnd(-46, 46)));
            f.v = clamp(v + (cible - f.x) * 2.2, 24, v * 1.03);
            f.pose = W.y > G.SOL - 42 ? 'saute' : 'course';
            f.hop = W.y > G.SOL - 42 ? 1 : 0;
            if (f.fanT <= 0) {
              if (Math.random() < .45) { faireTomber(f); bulleFig(f, pick(['Pfff...', 'Mon point de côté !', 'Attendez...', 'Bon, tant pis'])); }
              else { f.v = 10; f.pose = 'salut'; bulleFig(f, pick(['Salut !', 'Reviens !', 'À bientôt !'])); }
            }
          }
        } else if (f.role === 'peureux') {
          if (!f.peur && bas && dx > -10 && dx < 130) {
            f.peur = true; f.gag = true;
            f.pose = 'panique';
            f.v = v * rnd(.55, .92);     // il detale droit devant : on le voit fuir longtemps
            bulleFig(f, pick(['Au secours !', 'Il arrive !', 'Sauve qui peut !', 'C\'est un OVNI !', 'Pas la tête !', 'Aaaah !']));
            if (Math.random() < .3) { f.chute = rnd(1.4, 3); }
          }
          if (f.chute > 0) { f.chute -= dt; if (f.chute <= 0) { faireTomber(f); bulleFig(f, 'Aïe !'); } }
        }
      }
      // le souffle du drone : ca decoiffe (et ca fait rire)
      if (!W.demo && !f.tombe && !f.souffle && !f.nageur && !f.nage && W.vivant && W.y > G.SOL - (f.s ? 52 : 34) && Math.abs(f.x - HX) < (f.s ? 44 : 26) && !f.gag) {
        f.souffle = true;
        W.renverses++;
        if (f.d) {
          if (Math.random() < .6) { faireTomber(f); bulleFig(f, pick(['Hé !', 'Mon chapeau !', 'Aaaah !', 'Ouille !', 'Malotru !', 'Ça va pas ?'])); }
          else { f.pose = 'panique'; f.v = 120; bulleFig(f, pick(['Au secours !', 'Fuyez !', 'Il est fou !'])); }
        } else if (f.s) {
          f.enVol = true; f.vh = 90; f.v = -30; bulleFig(f, f.s === 'mouton' ? 'Bêêê !' : f.s === 'oie' ? 'Coin !' : f.s === 'manchot' ? 'Coin coin !' : '!!');
        }
        if (Math.random() < .35) dire('ras');
      }
      regleFig(f);
    }
    // on garde qui peut encore entrer dans l'image : qui arrive de la droite moins vite que le defilement, ou qui double la camera
    // par la gauche. Avant (05/11/2026), tout ce qui etait a plus de 200 a droite disparaissait aussitot : la queue des longues
    // foules et, avec elle, le second porteur de leurs pancartes.
    W.figs = W.figs.filter(f => {
      if (f.quai) return f.x > -(D.spr(f.s, 'l').w || 300) / 2 - 20 && f.x < G.VW + 600;
      if (f.x <= -80) return f.v > v + 1 && f.x > -1500;
      if (f.x >= G.VW + 200) return f.v < v - 1 && f.x < G.VW + 1500;
      return true;
    });
  }
  /* Ce qui vaut pour tout le monde : a terre on ne bouge plus ; tourne d'un cote, on va de ce cote ; on n'agite pas les jambes sur place */
  const EN_MARCHE = { marche: 1, course: 1, panique: 1, roller: 1, skate: 1, velo: 1, trott: 1, ski: 1, canne: 1, fauteuil: 1 };
  function faireTomber(f) {
    if (f.tombe) return;
    f.tombe = true; f.chuteT = 0; f.tp = 0; f.pose = 'panique';
    // emporte par son elan, il part du cote ou il regarde
    f.elan = (f.flip ? -1 : 1) * clamp(Math.abs(f.v || 0) * .6 + 40, 40, 90);
  }
  J.faireTomber = faireTomber;
  // l'angle de la chute a l'instant t : il trebuche, bascule en avant, reste a plat, puis se releve
  J.angleChute = (f, t) => { const a = t < .25 ? .55 * t / .25 : t < .55 ? .55 + 1.05 * (t - .25) / .3 : t < 1.7 ? 1.6 : t < 2.2 ? 1.6 * (1 - (t - 1.7) / .5) : 0; return f.flip ? -a : a; };
  function regleFig(f) {
    if (f.tombe) {
      const t = f.chuteT || 0;
      f.hop = 0;
      if (!f.enVol) f.v = t < .55 ? f.elan * (1 - t / .55) : 0;
      // il se releve, se frotte, et repart tranquillement
      if (t > 2.2) { f.tombe = false; f.chuteT = 0; f.etoiles = 0; f.role = null; f.gag = true; f.souffle = true; f.pose = 'marche'; f.v = f.flip ? -34 : rnd(18, 34); if (f.d) bulleFig(f, pick(['Ça va, ça va !', 'Personne n\'a rien vu', 'Mon genou !', 'Pfff...', 'Bon, tant pis'])); }
      return;
    }
    if (!f.d || f.nageur) return;
    if (f.v > 1) f.flip = false; else if (f.v < -1) f.flip = true;
    if (f.flip && f.v < -1 && (f.pose === 'course' || f.pose === 'panique') && f.v > -70) f.v = -rnd(90, 130);
    if (Math.abs(f.v) < 1 && EN_MARCHE[f.pose] && !f.hop) f.pose = 'neutre';
    if (Math.abs(f.v) < 1 && !f.gag) {
      f.flip = f.x > HX + (W.heroDx || 0) + 6;
      if (!f.signe && f.pose !== 'jongle' && W.vivant && Math.abs(f.x - HX) < 110 && W.y > G.SOL - 120) { f.signe = true; f.pose = pick(['salut', 'salut', 'filme', 'applaudit']); }
    }
  }
  /* La rame : elle arrive, s'arrete a quai au rythme du mur qui defile, repart, et sort par la gauche */
  function majRame(f, dt) {
    const mur = W.v * W.ech * (W.sc.plans[W.sc.def.quai] ? W.sc.plans[W.sc.def.quai].f : .3);
    f.ph = f.ph || 'entre'; f.t = (f.t || 0) + dt;
    let vx;
    if (f.ph === 'entre') {
      const k = clamp(f.t / 1.9, 0, 1);
      vx = mur + 300 * (f.arrete ? (1 - k) * (1 - k) : 1);
      if (f.arrete && k >= 1) { f.ph = 'arret'; f.t = 0; f.dure = rnd(2.2, 4.2); G.Audio && G.Audio.sfx('siffle'); }
    } else if (f.ph === 'arret') {
      vx = mur;
      if (f.t > f.dure) { f.ph = 'part'; f.t = 0; }
    } else vx = mur + 330 * clamp(f.t / 2.4, 0, 1) * clamp(f.t / 2.4, 0, 1);
    f.x -= vx * dt;
  }

  /* ---- Mise a jour ---- */
  function hitCapsule(px, py, r, ax, ay, bx, by, rr) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / (l || 1), 0, 1);
    const qx = ax + dx * t - px, qy = ay + dy * t - py;
    return Math.sqrt(qx * qx + qy * qy) - r - rr;
  }


  function toucher(src) {
    // on ne meurt qu'une fois (Max, 05/11/2026 : « quand on meurt avec les lasers ca explose pendant longtemps ») : l'epave posee au
    // sol restait dans le rayon le plus bas, et chaque image d'une salve allumee la refaisait mourir (589 explosions pour une mort)
    if (!W.vivant || W.invinc > 0 || W.turbo) return;
    W.choc = src && (src.s || src.t || src.k);
    W.chocM = src && src.m; W.chocBoss = src && src.k === 'boss' && W.boss ? W.boss.nom : null;
    if (W.demo) return;
    W.distChoc = W.dist;
    if (W.bouclierN > 0) {
      W.bouclierN--;
      mission('bouclier', 1);
      W.invinc = 1;
      W.flash = .15;
      W.secousse = 5;
      eff(20, HX, W.y - 14, ['#6fe6ff', '#fff']);
      G.Audio && G.Audio.sfx('bouclier');
      G.vibre('heavy');
      return;
    }
    W.vies--;
    W.coeurT = .7;
    if (W.vies > 0) {
      // un coeur de moins, et on repart
      W.invinc = 1.7;
      W.flash = .12;
      W.secousse = 6;
      eff(26, HX, W.y - 20, ['#ff5a6a', '#ffb0b8', '#ffffff'], 1.3);
      direH(pick(['Ouille, ça passe !', 'Heureusement !', 'L\'assurance paiera', 'C\'était ma dernière ?', 'Même pas mal']), 1.6);
      G.Audio && G.Audio.sfx('bouclier');
      G.vibre('heavy');
      return;
    }
    mourir();
  }
  function mourir() {
    W.vivant = false;
    W.mortT = 0;
    // les salves du barrage pas encore allumees s'eteignent : la partie s'arrete sur le crash, pas sur un feu d'artifice
    // (marquees et non retirees : mourir est appele pendant le tour des obstacles)
    for (const o of W.obs) if (o.k === 'rayon' && o.T < o.warn) o.mort = 'fin';
    W.secousse = 8;
    W.flash = .05;
    W.bulleH = { t: 'COUPEZ !', T: 2.5 };
    G.FX.crash(W, HX, W.y - 10);
    G.Audio && G.Audio.sfx('crash');
    G.vibre('heavy');
    W.vMort = W.v; W.vPrev = W.v;
    // l'equipe accourt
    const gens = ['cadreur', 'assistant', 'perchman'];
    gens.forEach((d, i) => W.figs.push({ d, x: G.VW + 20 + i * 36, y: G.SOLF, v: 200, pose: 'course', tp: i, flip: false, gag: true, bulle: pick(['On la refait !', 'Et la caméra ?', 'Elle a rien, la caméra ?', 'Du maquillage !', 'Tu vas bien ?', 'C\'était bien, ça !']), bulleT: 2.2 }));
  }

  J.maj = dtr => {
    if (!W || !W.sc) return;
    if (W.arret > 0) { W.arret -= dtr; dtr *= .12; }
    const dt = dtr * (W.pouv.ralenti > 0 ? .55 : 1);
    W.T += dtr;
    W.ech = 1;
    if (W.turbo) W.ech = 2.1;
    if (W.vivant && !W.demo) {
      W.tJeu += dt;
      // ca part a 212 et ca accelere doucement jusqu'a 440, atteint apres 3 min de jeu (Max, 05/11/2026 : « la vitesse maximale est
      // bonne mais elle arrive trop vite ») ; avant : 1,9 de plus par seconde, +5 d'un coup a chaque palier, 440 a 1 min 44.
      // Un peu plus doux au debut qu'a la fin, sans a-coup (tests/acceleration.js).
      const u = Math.min(1, W.tJeu / J.V_DUREE);
      W.v = J.V0 + (J.VMAX - J.V0) * (.6 * u + .4 * u * u);
      if (W.percee && !W.percee.casse) W.v = 0;
    }
    if (!W.vivant) { W.vMort = Math.max(0, W.vMort - dtr * 170); W.v = W.vMort; }
    const v = W.v * W.ech;
    W.x += v * dt;
    if (!W.demo) {
      W.dist = W.x / 10;
      if (W.vivant) {
        // les objectifs qui se comptent en metres : sous l'eau, et sans choc (le plus long passage de la partie)
        if (W.sc && W.sc.type === 'eau') mission('sousEau', v * dt / 10);
        missionMax('sansChoc', W.dist - (W.distChoc || 0));
        // paliers : tous les 500 m on fete (la vitesse, elle, monte sans a-coup)
        const pal = 1 + Math.floor(W.dist / 500);
        if (pal > W.palier) {
          W.palier = pal;
          const g = 25 * pal;
          G.gagne(g); W.bob += g;
          W.textes.push({ t: (pal - 1) * 500 + ' m !', c: '#ffe27a', y: 62, T: 2, big: 1 });
          W.textes.push({ t: 'Palier ' + pal + '  +' + g + ' bobines', c: '#fff', y: 92, T: 2 });
          G.Lumiere.confettis(W, 60);
          G.Audio && G.Audio.sfx('plan');
          direH(pick(['Et ça continue !', 'On tourne encore !', 'Quelle journée !', 'Encore une !']), 1.6);
          // la foule applaudit
          for (const f of W.figs) if (f.d && !f.tombe && !f.gag) { f.pose = 'saute'; f.hop = 1; }
        }
        if (!W.recordFait && G.sav.record > 50 && W.dist > G.sav.record) {
          W.recordFait = true;
          W.textes.push({ t: 'NOUVEAU RECORD !', c: '#ff8a7a', y: 74, T: 2.6, big: 1 });
          G.Lumiere.confettis(W, 110);
          G.Audio && G.Audio.sfx('mission');
          G.vibre('double');
          direH('Le film de ma vie !', 2);
        }
      }
    }
    // pouvoirs
    for (const k in W.pouv) if (W.pouv[k] > 0) W.pouv[k] -= dtr;
    if (W.bt && W.vivant) {
      const br = W.bt.ralenti, bt = W.bt.turbo;
      if (br.rech > 0) { br.rech -= dtr; if (br.rech <= 0 && br.n === 0) br.n = 1; }
      const bo = W.bt.oscar;
      if (bo && bo.rech > 0) { bo.rech -= dtr; if (bo.rech <= 0 && bo.n === 0) bo.n = 1; }
      if (W.turbo) { bt.jauge -= dtr; mission('turbo', dtr); if (bt.jauge <= 0) { bt.jauge = 0; W.turbo = false; } }
      else if (nivAtelier('turbo')) bt.jauge = Math.min(bt.cap, bt.jauge + bt.cap / 45 * dtr);
      if (W.turbo && Math.random() < dtr * 40) G.FX.fumee(W, HX - 16, W.y - 8 + rnd(-6, 6), { ton: 'suie', r0: 0, r1: rnd(2, 4), T: rnd(.25, .5), vx: -W.v });
      if (W.boutonsT > 0) W.boutonsT -= dtr;
      if (W.coeurT > 0) W.coeurT -= dtr;
    }
    if (W.st) majRoquettes(dt);
    // un combat de boss ne s'interrompt pas pour changer de decor
    if (W.boss) { W.sc.len += W.v * W.ech * dt; G.Boss.maj(W, dt); toucherBoss(); }
    else if (W.vivant && !W.demo && !W.trans && W.percee == null) { W.bossT -= dt; if (W.bossT <= 0 && !W.barrage) G.Boss.lancer(W); }
    if (W.vivant && !W.demo && !W.boss && !W.barrage && W.percee == null) W.barrageT -= dt;
    if (W.invinc > 0) W.invinc -= dtr;
    if (W.secousse > 0) W.secousse = Math.max(0, W.secousse - dtr * 22);
    if (W.flash > 0) W.flash -= dtr;

    majHeros(dt, dtr);
    if (J.pret) { majScene(dt); majFigs(dt); majGags(dt); majFoules(dt); majSujet(dt); }
    majObstacles(dt);
    majItems(dt);
    majParts(dt);
    G.FX.majPercee(W, dtr);
    G.FX.maj(W, dt);
    // un drone blesse fume ; a terre, il fume encore
    if (!sous() && W.vivant && W.viesMax > 1 && W.vies < W.viesMax && Math.random() < dt * (W.vies === 1 ? 16 : 6)) G.FX.fumee(W, HX - 12 + rnd(-3, 3), W.y - 8, { ton: 'suie', r0: 0, r1: rnd(1, 3), T: rnd(.4, .9), vx: -W.v * .7, vy: rnd(-22, -6) });
    D.fxMaj(W.sc, dt, W.x - W.sc.x0);
    if (W.trans && W.trans.b) D.fxMaj(W.trans.b, dt, W.x - W.trans.b.x0);
    for (const t of W.textes) t.T -= dtr;
    W.textes = W.textes.filter(t => t.T > 0);
    if (W.comboT > 0) { W.comboT -= dtr; if (W.comboT <= 0) W.combo = 0; }
    if (W.bulleH) { W.bulleH.T -= dtr; if (W.bulleH.T <= 0) W.bulleH = null; }
    W.lieuT = Math.max(0, (W.lieuT || 0) - dtr);
    if (W.titre) { W.titre.T -= dtr; if (W.titre.T <= 0) W.titre = null; }
    // repliques au repos
    W.bulleT -= dtr;
    if (W.boutons) for (const k in W.boutons) if (W.boutons[k] > 0) W.boutons[k] -= dtr;
    if (W.bulleT <= 0 && !W.bulleH && W.vivant && !W.demo) { W.bulleT = rnd(9, 16); dire('decor'); }
    // fin de partie, apres la chute
    if (!W.vivant) {
      W.mortT += dtr;
      if (W.mortT > 3.6 && !W.finie) { W.finie = true; J.onFin && J.onFin(W); }
    }
  };

  /* Le pilote du visualiseur : il cherche l'altitude la plus sure pour ce qui arrive */
  function altitudeSure() {
    const caps = [];
    for (const o of W.obs) if (['struct', 'sprite', 'vol', 'col'].includes(o.k) && o.x - (o.w || 40) / 2 < HX + 230 && o.x + (o.w || 40) / 2 > HX - 30) caps.push(...capsules(o));
    let best = W.y, bs = 1e9;
    for (let y = yMinDrone(); y <= G.SOL; y += 7) {
      let s = Math.abs(y - W.y) * .04;
      for (let dx = 0; dx <= 190; dx += 16) {
        const X = HX + dx, Y = y - 12;
        for (const c of caps) {
          const ex = c[2] - c[0], ey = c[3] - c[1], l = ex * ex + ey * ey, t = clamp(((X - c[0]) * ex + (Y - c[1]) * ey) / (l || 1), 0, 1);
          if (Math.hypot(c[0] + ex * t - X, c[1] + ey * t - Y) - c[4] < 26) s += 60 / (1 + dx * .018);
        }
      }
      if (s < bs) { bs = s; best = y; }
    }
    return best;
  }

  function majHeros(dt, dtr) {
    const eau = W.sc.type === 'eau' && (!W.trans || W.trans.prog > .5);
    W.sous = eau;
    if (W.vivant) {
      // la poussee repond tout de suite, sans brutalite : le doigt commande, le poids ne vient qu'apres (J.pasVol)
      let a = 0;
      if (W.vitrineJeu) W.hold = W.y + W.vy * .12 > altitudeSure();
      else if (W.vue) { W.y = 96; W.vy = 0; W.hold = false; }
      else if (W.demo) {
        // en demonstration il vole seul ; la main du tuto de l'accueil le commande quand elle appuie ou lache (main_tuto.js)
        if (W.tutoMain === true || W.tutoMain === false) W.hold = W.tutoMain;
        else { const cible = W.tutoCible || 80 + Math.sin(W.T * .7) * 40; W.hold = W.y > cible; }
      }
      // vent et rafales
      const mod = W.sc.def.mod;
      if (mod === 'vent' || mod === 'tempete') {
        W.ventT -= dtr;
        if (W.ventT < 0) { W.ventT = rnd(2.5, 5); W.ventF = rnd(-1, 1) * 200; W.ventD = 1.2; }
        if (W.ventD > 0) { W.ventD -= dtr; a += W.ventF; }
      }
      const haut = G.PLAFOND + 24 + (W.sc.def.plafond ? W.sc.def.plafond * .5 : 0);
      [W.y, W.vy] = J.pasVol(W.y, W.vy, W.hold, dt, eau, haut, a);
      // qui reste colle au sol, ou tout en haut : le choix des obstacles s'en souvient (choisirSection)
      if (!W.demo) {
        W.solT = W.y > G.SOL - 24 ? (W.solT || 0) + dt : Math.max(0, (W.solT || 0) - dt * 3);
        W.hautT = W.y < haut + 34 ? (W.hautT || 0) + dt : Math.max(0, (W.hautT || 0) - dt * 3);
      }
      // le souffle des helices : plus on est bas, plus il souleve la poussiere
      const hauteurSol = G.SOLF - W.y;
      if (!eau && hauteurSol < 70 && Math.random() < dt * (46 - hauteurSol * .6)) {
        const cote = Math.random() < .5 ? -1 : 1;
        W.parts.push({ x: HX + cote * rnd(2, 20), y: G.SOLF - rnd(0, 2), vx: cote * rnd(20, 70) - W.v * .55, vy: rnd(-34, -6), g: 26, T: rnd(.25, .6), c: pick(['rgba(240,232,214,.75)', 'rgba(214,204,186,.6)', 'rgba(255,250,235,.55)']), s: pick([.6, 1.2, 1.2]) });
      }
      // l'air chasse sous le drone quand il pousse
      if (!eau && W.hold && Math.random() < dt * 26) W.parts.push({ x: HX + pick([-14, 15]) + rnd(-3, 3), y: W.y - 6, vx: -W.v * .25 + rnd(-8, 8), vy: rnd(50, 110), g: 0, T: rnd(.1, .22), c: 'rgba(255,255,255,.5)', s: .6 });
      if (W.y > G.SOL - 2) { W.tRas += dt; mission('ras', dt); }
      // etat du personnage : il joue la comedie, sans effet sur le jeu
      const st = W.st;
      G.heroMaj(st, dtr, W.hold, W.vy);
      st.masque = eau;
      if (st.moodT > 0) { st.moodT -= dtr; } else st.mood = 'neutre';
      const c = trouverCible();
      W.cible = c;
      G.heroViser(st, c, dtr);
      // en plongee : bulles
      if (eau && Math.random() < dt * 8) W.parts.push({ x: HX + rnd(-8, 8), y: W.y - 30, vx: -W.v * .25, vy: rnd(-50, -30), g: 0, T: rnd(.5, 1), c: 'rgba(220,250,255,.8)', s: 1 });
    } else {
      majChute(dtr);
    }
    const cible = (96 - W.y) * .075;
    W.camY += (cible - W.camY) * Math.min(1, dtr * 5);
  }

  /* La chute : moteur coupe, le drone part en vrille avec son cadreur qui s'agite ; au sol, le choc les separe.
     Le drone racle et fume, le cadreur rebondit, roule, et finit sur le dos, camera levee : il filme toujours. */
  function majChute(dtr) {
    const st = W.st, eau = W.sous;
    if (!W.mort) {
      const c = { x: HX + (W.heroDx || 0), y: W.y - 12 };
      W.mort = { T: 0, lie: true, fin: false, h: { x: c.x, y: c.y, vx: 26, vy: Math.min(W.vy, -60) - 130, r: st.tilt || 0, vr: rnd(3.4, 5) * (Math.random() < .5 ? -1 : 1) }, d: { x: c.x, y: c.y, vx: 0, vy: 0, r: 0, vr: 0 } };
    }
    const M = W.mort, g = eau ? 130 : 760, solH = G.SOLF - 7, solD = G.SOLF - 8;
    M.T += dtr;
    st.mort = true;
    st.air = 1; st.flex = 0;
    if (M.lie) {
      // il se debat : les jambes battent, la camera part dans tous les sens
      st.lean = Math.sin(M.T * 15);
      st.ang = st.angC = Math.sin(M.T * 11) * 1.1 - .2;
      st.mood = 'peur';
      M.h.vy += g * dtr; M.h.y += M.h.vy * dtr; M.h.x += M.h.vx * dtr; M.h.r += M.h.vr * dtr;
      if (Math.random() < dtr * 34) G.FX.fumee(W, M.h.x + rnd(-8, 8), M.h.y + rnd(-6, 6), eau ? { ton: 'bulle', r0: 0, r1: 1, T: .7, vy: -40 } : { ton: 'suie', r0: 0, r1: rnd(2, 4), T: rnd(.5, 1), vx: -W.v * .6, vy: rnd(-34, -10) });
      if (!eau && Math.random() < dtr * 20) G.FX.etincelles(W, 2, M.h.x, M.h.y, { force: 110, T: .4 });
      if (M.h.y >= G.SOLF - 14) {
        M.lie = false;
        const x0 = M.h.x, y0 = M.h.y;
        if (eau) { for (let i = 0; i < 18; i++) G.FX.fumee(W, x0 + rnd(-14, 14), y0, { ton: 'bulle', r0: 0, r1: 2, T: 1, vy: rnd(-70, -30), monte: -40, freine: 1 }); W.secousse = 3; }
        else G.FX.impact(W, x0, G.SOLF - 2);
        G.Audio && G.Audio.sfx('boum');
        G.vibre('heavy');
        M.d = { x: x0 - 3, y: y0 + 4, vx: -rnd(24, 46), vy: -rnd(90, 130), r: M.h.r, vr: -rnd(4, 7), repos: 0 };
        M.h = { x: x0 + 4, y: y0 - 8, vx: rnd(66, 96), vy: -rnd(210, 260), r: M.h.r, vr: rnd(9, 12), repos: Math.PI * 1.5 };
        W.vMort = Math.min(W.vMort || 0, 60);
      }
    } else {
      for (const [q, sol, reb] of [[M.h, solH, .42], [M.d, solD, .3]]) {
        q.vy += g * dtr; q.y += q.vy * dtr; q.x += (q.vx - W.v) * dtr;
        if (q.y >= sol) {
          q.y = sol;
          if (Math.abs(q.vy) > 70) {
            q.vy *= -reb; q.vx *= .62; q.vr *= .55;
            if (!eau) { G.FX.pouf(W, q.x, G.SOLF - 1, 6); if (q === M.d) G.FX.etincelles(W, 8, q.x, G.SOLF - 1, { a: -2.6, ouv: .7, force: 170, T: .4 }); }
            W.secousse = Math.max(W.secousse, 2.5);
            G.Audio && G.Audio.sfx('choc');
          } else {
            q.vy = 0; q.vx *= 1 - Math.min(1, dtr * 3.4);
            // il raque le sol avant de s'arreter
            if (q === M.d && !eau && Math.abs(q.vx) > 12 && Math.random() < dtr * 40) G.FX.etincelles(W, 2, q.x - 8, G.SOLF - 1, { a: -2.8, ouv: .4, force: 120, T: .25, g: 240 });
          }
        }
        // en l'air il tourne ; pose, il se couche sur le cote le plus proche
        if (q.y < sol - .5) q.r += q.vr * dtr;
        else { const tour = Math.PI * 2, cible = q.repos + Math.round((q.r - q.repos) / tour) * tour; q.r += (cible - q.r) * Math.min(1, dtr * 9); }
      }
      const pose = M.h.y >= solH - .5 && Math.abs(M.h.vx) < 14 && Math.abs(M.h.vy) < 1;
      if (pose) { M.fin = true; st.mood = 'ko'; st.ang = st.angC = -.9; st.lean = 0; }
      else { st.mood = 'peur'; st.lean = Math.sin(M.T * 13) * .8; st.ang = st.angC = Math.sin(M.T * 9) - .2; }
      if (!eau && Math.random() < dtr * 18) G.FX.fumee(W, M.d.x + rnd(-6, 6), M.d.y - 6, { ton: 'suie', r0: 0, r1: rnd(2, 4), T: rnd(.7, 1.3), vx: rnd(-10, 10) - W.v * .6, vy: rnd(-40, -16) });
      if (!eau && Math.random() < dtr * 5) G.FX.lueur(W, M.d.x, M.d.y - 6, 60, '#ff9a3c', .5);
    }
    W.y = M.h.y + 12; W.vy = 0;
    G.heroMaj(st, dtr, false, 200);
  }

  /* Le cadreur cherche quelque chose a filmer. Il choisit, il suit des yeux et de la camera,
     et quand la chose passe derriere lui il se retourne sur son drone pour ne pas la perdre. */
  function posRegard(r) {
    const o = r.o;
    if (r.k === 'sujet') { const sp = D.spr(o.s, 'l'); return { x: o.x, y: o.y - (o.mode === 'vol' || o.mode === 'eau' ? 0 : sp.h / 2), w: sp.w, h: sp.h }; }
    if (r.k === 'fig') return { x: o.x, y: o.y - 12 - (o.h || 0), w: 16, h: 25 };
    const sp = D.spr(o.s, 'l');
    return { x: o.x, y: o.y, w: sp.w || 20, h: sp.h || 20 };
  }
  function vivantEncore(r) {
    const o = r.o;
    if (r.k === 'sujet') return W.sujet === o;
    if (r.k === 'fig') return W.figs.includes(o) && !o.quai;
    if (r.k === 'ciel') return W.volants === o;
    return W.obs.includes(o);
  }
  function choisirRegard() {
    const l = [];
    if (W.sujet && W.sujet.x > HX + 30 && W.sujet.x < G.VW + 40) l.push({ k: 'sujet', o: W.sujet, p: 20 });
    if (W.volants && W.volants.x > HX) l.push({ k: 'ciel', o: W.volants, p: 8 });
    for (const f of W.figs) if (f.d && f.x > HX + 40 && f.x < G.VW - 10) l.push({ k: 'fig', o: f, p: f.bulle ? 6 : 1 });
    for (const o of W.obs) if ((o.k === 'vol' || o.k === 'veh') && o.s && o.x > HX + 90 && o.x < G.VW) l.push({ k: 'obs', o, p: 2 });
    if (!l.length) return null;
    let t = l.reduce((a, q) => a + q.p, 0) * Math.random();
    for (const q of l) { t -= q.p; if (t <= 0) return q; }
    return l[0];
  }
  function trouverCible() {
    const s = W.sujet, yCam = W.y - 26, st = W.st;
    W.regard = null;
    if (st.bazooka > 0) { const c = W.feu && W.feu.c; if (c && c.boss && W.boss) return { dx: W.boss.x - HX, dy: W.boss.y - yCam }; return c && !c.boss ? { dx: Math.max(60, pointeX(c) - HX), dy: pointeY(c) - yCam } : { dx: 120, dy: 0 }; }
    if (W.boss) { const q = { x: W.boss.x, y: W.boss.y, w: 60, h: 40 }; if (W.boss.vise) W.regard = q; return { dx: q.x - HX, dy: q.y - yCam }; }
    // 1) un danger tout pres : il oublie tout, il regarde devant, il a peur
    let best = null, bd = 1e9;
    for (const o of W.obs) {
      if (o.mort || o.k === 'rayon' || o.k === 'courant' || o.k === 'jete' || o.yc === undefined) continue;
      const dx = o.x - HX;
      if (dx < 0 || dx > 80) continue;
      const d = dx + Math.abs(o.yc - yCam) * .5;
      if (d < bd) { bd = d; best = { dx, dy: o.yc - yCam }; }
    }
    if (best && bd < 62) { if (st.moodT <= 0) { st.mood = 'peur'; st.moodT = .25; } W.regardR = null; return best; }
    // 2) la chose qu'il suit
    let r = W.regardR;
    if (r && (!vivantEncore(r) || posRegard(r).x < -8)) {
      r = W.regardR = null;
      // il regarde encore un instant derriere lui, puis se remet dans le sens de la marche
      W.regardApres = rnd(.3, .7); W.regardT = rnd(.25, .8);
    }
    if (s && !W.sujetFait && s.vise && (!r || r.k !== 'sujet')) r = W.regardR = { k: 'sujet', o: s };
    if (!r) {
      if (W.regardApres > 0) { W.regardApres -= G.dt || .016; return { dx: -60, dy: 16 }; }
      W.regardT = (W.regardT || 0) - (G.dt || .016);
      if (W.regardT <= 0) { r = W.regardR = choisirRegard(); W.regardT = rnd(.4, 1.4); }
      // rien a filmer : de temps en temps il jette un oeil en arriere
      // (la chance est pour une image a 60 images/s : rapportee a la duree de l'image, la meme sur un ecran a 120)
      if (!r) { if (Math.random() < .004 * Math.min(3, (G.dt || 1 / 60) * 60)) W.regardApres = rnd(.5, 1); return null; }
    }
    const q = posRegard(r);
    W.regard = q;
    if (r.k === 'fig' && r.o.bulle && st.moodT <= 0) { st.mood = 'joie'; st.moodT = .5; }
    return { dx: q.x - HX, dy: q.y - yCam };
  }

  function majObstacles(dt) {
    const v = W.v * W.ech;
    const hy = W.y - 12, hr = 12;
    for (const o of W.obs) {
      if (o.mort) continue;
      switch (o.k) {
        case 'cable': {
          if (o.pend) o.px -= v * dt; else { o.x -= v * dt; o.a += (o.w || 0) * dt; }
          geo(o);
          for (const c of capsules(o)) testCaps(o, c[0], c[1], c[2], c[3], c[4]);
          break;
        }
        case 'sprite': {
          o.x -= v * dt;
          for (const c of capsSprite(o)) testCaps(o, c[0], c[1], c[2], c[3], c[4]);
          break;
        }
        case 'struct': {
          o.x -= v * dt;
          if (o.mvt) majMvt(o, dt);
          if (o.bras) { o.bras.a += o.bras.v * dt; const c = Math.cos(o.bras.a) * o.bras.l, n = Math.sin(o.bras.a) * o.bras.l, q = o.segs[0]; q.ax = -c; q.ay = o.bras.y - n; q.bx = c; q.by = o.bras.y + n; }
          for (const c of G.Structures.capsules(o)) testCaps(o, c[0], c[1], c[2], c[3], c[4]);
          break;
        }
        case 'col': {
          o.x -= v * dt;
          const sp = D.spr(o.s, 'l');
          if (!sp.ok) break;
          const w = sp.w, h = sp.h;
          o.yc = o.haut ? G.PLAFOND + h / 2 : o.y - h / 2;
          // hitbox reduite : on prefere un jeu genereux
          const ax = o.x, ay = o.haut ? G.PLAFOND : o.y - h, by = o.haut ? G.PLAFOND + h : o.y;
          testCaps(o, ax, ay + 6, ax, by - 6, Math.max(4, w * .28));
          break;
        }
        case 'vol': {
          o.x -= v * o.v * dt;
          o.y = o.y0 + Math.sin(W.T * 2.2 + o.ph) * o.amp;
          o.yc = o.y;
          const sp = D.spr(o.s, 'l');
          // le poisson-globe se gonfle, vexe, quand on approche
          if (o.gonfle && Math.abs(o.x - HX) < 150) {
            if (o.gonfle < 1.9) o.gonfle += dt * 2.2;
            if (!o.dit) { o.dit = true; bulleFig(o, pick(['Pfff !', 'Vexé !', 'Recule !'])); }
          }
          if (o.bulleT > 0) o.bulleT -= dt;
          if (sp.ok) testCaps(o, o.x - sp.w * .25, o.y, o.x + sp.w * .25, o.y, Math.min(sp.h, sp.w) * .28 * (o.gonfle || 1));
          break;
        }
        case 'guide': {
          if (o.warn > 0) {
            o.warn -= dt;
            o.y += clamp(W.y - 14 - o.y, -90 * dt, 90 * dt);
            if (o.warn <= 0) G.Audio && G.Audio.sfx('siffle');
          } else {
            o.x -= v * o.v * dt;
            const sp = D.spr(o.s, 'l');
            if (sp.ok) testCaps(o, o.x - sp.w * .3, o.y, o.x + sp.w * .3, o.y, sp.h * .28);
          }
          o.yc = o.y;
          break;
        }
        case 'rayon': {
          o.T += dt;
          if (o.T > o.warn && o.T < o.warn + o.on) {
            // (le drone fantome des robots et du visualiseur traverse tout, rayons compris, comme les structures : testCaps)
            if (W.vivant && !W.fantome && Math.abs(hy - o.y) < hr + 3) toucher(o);
            if (!o.son) { o.son = true; G.Audio && G.Audio.sfx('rayon'); }
          }
          if (o.T > o.warn + o.on + .1) o.mort = 'fin';
          break;
        }
        case 'jete': {
          o.x += (o.vx - v * .25) * dt; o.vy += o.g * dt; o.y += o.vy * dt; o.yc = o.y; o.r += dt * 9;
          // ce que la foule jette ne blesse plus (sprites eteints, Max 03/11/2026) : ca s'ecrase sur le drone, sans plus
          if (!o.gentil && SPRITES_OBSTACLES) testCaps(o, o.x, o.y, o.x, o.y, 5);
          else if (!o.gentil && W.vivant && !W.fantome && J.touche(o.x, o.y, 5)) { o.mort = 'fin'; eff(8, o.x, o.y, o.i === 'tomate' ? ['#e0392f', '#ff7a5e'] : ['#ccc']); }
          if (o.gentil && W.vivant && Math.abs(o.x - HX) < 18 && Math.abs(o.y - (W.y - 16)) < 26) {
            o.mort = 'fin'; G.gagne(10); W.bob += 10;
            W.textes.push({ t: 'Attrapé ! +10', c: '#ffe27a', x: HX + 30, y: W.y - 40, T: 1, sm: true });
          }
          if (o.y > G.SOLF) { o.mort = 'fin'; eff(8, o.x, G.SOLF, o.i === 'tomate' ? ['#e0392f', '#ff7a5e'] : ['#ccc']); }
          break;
        }
        case 'courant': {
          o.x -= v * dt; o.T += dt;
          if (Math.abs(o.x - HX) < 18 && W.vivant) {
            W.vy -= 980 * dt;
            if (!o.vu) { o.vu = true; direH(pick(['Waaah !', 'Ça aspire !', 'Blub blub !']), 1); G.Audio && G.Audio.sfx('bulles'); mission('ras', 0); }
            if (Math.random() < dt * 12) { G.gagne(1); W.bob += 1; }
          }
          break;
        }
        case 'jet': {
          o.x -= v * dt; o.T += dt;
          o.yc = 150;
          if (o.T > o.warn) {
            const k = clamp((o.T - o.warn) / .2, 0, 1) * clamp((o.warn + o.on + .2 - o.T) / .2, 0, 1);
            o.hNow = o.h * k;
            if (k > .6) testCaps(o, o.x, G.SOLF, o.x, G.SOLF - o.hNow, 6);
            if (!o.son) { o.son = true; G.Audio && G.Audio.sfx('jet'); }
          }
          if (o.T > o.warn + o.on + .2) {
            if (o.cycle) { o.T = 0; o.warn = .8; o.hNow = 0; o.son = false; } else o.mort = 'fin';
          }
          break;
        }
        case 'veh': {
          o.x -= v * o.v * dt;
          const sp = D.spr(o.s, 'l');
          if (o.saute && !o.enl && o.x < o.jx) { o.enl = true; o.vy = 340; G.Audio && G.Audio.sfx('siffle'); }
          if (o.enl) { o.vy -= 560 * dt; o.jy += o.vy * dt; if (o.jy < 0) { o.jy = 0; o.vy = 0; o.enl = false; o.saute = false; eff(6, o.x, G.SOLF, ['#ccc']); } }
          o.yc = o.y - o.jy - sp.h / 2;
          if (sp.ok) testCaps(o, o.x - sp.w * .32, o.yc, o.x + sp.w * .32, o.yc, sp.h * .34);
          break;
        }
        case 'saut': {
          o.T += dt;
          if (o.ami) { if (o.T < o.warn) break; o.x -= v * dt * .5; o.vy += 300 * dt; o.y += o.vy * dt; o.yc = undefined; if (o.y > 290 && o.vy > 0) o.mort = 'fin'; break; }
          if (o.T < o.warn) { o.x -= v * dt; break; }
          o.x -= v * dt * .7;
          o.vy += 300 * dt;
          o.y += o.vy * dt;
          o.yc = o.y - 30;
          const sp = D.spr(o.s, 'l');
          if (sp.ok) testCaps(o, o.x - sp.w * .3, o.y - sp.h * .55, o.x + sp.w * .3, o.y - sp.h * .55, sp.h * .3);
          if (!o.sp1 && o.y < 200) { o.sp1 = true; eff(40, o.x, 205, ['#fff', '#bfe4ff', '#6fb5e0'], 1.6); G.Audio && G.Audio.sfx('splash'); }
          if (o.y > 280 && o.vy > 0) o.mort = 'fin';
          break;
        }
      }
      if (o.x !== undefined && o.x < -160 - (o.w || 0) / 2) o.mort = 'fin';
    }
    W.obs = W.obs.filter(o => !o.mort);
    // tirs
    for (const t of W.tirs) {
      t.x += t.vx * dt; t.y += t.vy * dt; t.T -= dt;
      for (const o of W.obs) {
        if (o.mort || o.k === 'rayon' || o.k === 'jet' || o.k === 'courant' || o.x > G.VW + 10) continue;
        const dy = Math.abs((o.yc !== undefined ? o.yc : o.y) - t.y);
        if (o.k === 'struct') {
          // le tir arrete sur la barre elle-meme, pas sur le vide autour
          if (G.Structures.capsules(o).some(c => hitCapsule(t.x, t.y, 3, c[0], c[1], c[2], c[3], c[4]) < 0)) { casser(o, true); t.T = 0; break; }
          continue;
        }
        const lim = o.k === 'cable' || o.k === 'sprite' ? 60 : o.k === 'col' ? 40 : 18;
        if (Math.abs(o.x - t.x) < 18 && dy < lim) { casser(o, true); t.T = 0; break; }
      }
    }
    W.tirs = W.tirs.filter(t => t.T > 0 && t.x < G.VW + 20);
    // timelapse : on traverse tout
    if (W.turbo) for (const o of W.obs) {
      if (o.mort || o.k === 'rayon' || o.k === 'courant') continue;
      if (Math.abs(o.x - HX) < 26 + (o.k === 'struct' ? o.w / 2 : 0)) casser(o);
    }
  }
  function testCaps(o, ax, ay, bx, by, rr) {
    if (!W.vivant || o.mort || W.turbo || W.fantome) return;
    // un sprite ne blesse plus personne (Max, 03/11/2026), meme s'il en reste un (vitrine du visualiseur)
    if (!SPRITES_OBSTACLES && SPRITE_K[o.k]) return;
    if (o.x > HX + 90 + (o.w || 0) / 2 || o.x < HX - 90 - (o.w || 0) / 2) return;
    // deux cercles : le bonhomme et le drone
    const d1 = hitCapsule(HX, W.y - 25, 6, ax, ay, bx, by, rr);
    const d2 = hitCapsule(HX, W.y - 2, 9, ax, ay, bx, by, rr);
    const d = Math.min(d1, d2);
    if (d < 0) { toucher(o); return; }
    // frole : passage tres pres sans toucher
    if (d < 10) o.pres = true;
    else if (o.pres && !o.froleOk && o.x < HX - 10) {
      o.froleOk = true;
      froler();
    }
  }
  // un frolement reussi : le combo monte, quelques bobines, et les objectifs « frôler » et « combo »
  function froler() {
    W.frole++; W.combo++; W.comboT = 3.5;
    eff(10, HX + 6, W.y - 12, ['#ffe27a', '#ffb545', '#ffffff'], .9);
    const gain = Math.min(W.combo, 8);
    G.gagne(gain); W.bob += gain;
    W.textes.push({ t: 'FRÔLÉ ! +' + gain, c: '#ffb545', x: HX + 40, y: W.y - 34, T: .8, sm: true });
    if (W.combo >= 3) W.textes.push({ t: 'COMBO ×' + W.combo, c: '#ff6b6b', x: HX + 40, y: W.y - 44, T: .8, sm: true });
    G.Audio && G.Audio.sfx('frole');
    G.vibre('tick');
    mission('frole', 1);
    if (Math.random() < .25) dire('frole');
    missionMax('combo', W.combo);
  }
  J.froler = () => froler();

  function majItems(dt) {
    const v = W.v * W.ech;
    const aim = W.pouv.aimant > 0;
    const hy = W.y - 12;
    for (const it of W.items) {
      it.x -= v * dt;
      if (it.libre) { it.vy += 240 * dt; it.y += it.vy * dt; it.x += it.vx * dt; if (it.y > G.SOL) { it.y = G.SOL; it.vy = -it.vy * .4; } }
      if (aim && it.k === 'bob' && Math.abs(it.x - HX) < 150) { it.x += (HX - it.x) * dt * 7; it.y += (hy - it.y) * dt * 7; }
      if (!W.vivant) continue;
      const dx = it.x - HX, dy = it.y - hy;
      if (dx * dx + dy * dy < (it.k === 'bob' ? 24 * 24 : 26 * 26)) {
        /* Coeurs pleins : un coeur touche ne fait rien, il continue sa route (Max, 08/11/2026 : « si on a tous nos coeurs pleins, si on
           ramasse un bonus coeur, ca n'en rajoute pas un en plus, ca ne fait rien » ; avant, il en ajoutait un, jusqu'a 6).
           Controle : tests/coeur_plein.js. */
        if (it.k === 'coeur' && W.vies >= W.viesMax) continue;
        it.pris = true;
        if (it.k === 'bob') {
          const val = 1;
          G.gagne(val); W.bob += val;
          G.Audio && G.Audio.sfx('bobine');
          // petite gerbe d'etincelles, et la bobine file vers le compteur
          for (let q = 0; q < 5; q++) { const a = rnd(6.28); W.parts.push({ x: it.x, y: it.y, vx: Math.cos(a) * rnd(30, 80) - W.v * .3, vy: Math.sin(a) * rnd(30, 80), g: 60, T: rnd(.15, .35), c: pick(['#fff4a8', '#ffd54a', '#ffffff']), s: .6 }); }
          W.volees = W.volees || [];
          if (W.volees.length < 14) W.volees.push({ x: it.x, y: it.y, t: 0 });
          mission('bobines', val);
        } else if (it.k === 'grosse') {
          G.gagne(it.val); W.bob += it.val; W.grossesN++;
          W.textes.push({ t: '+' + it.val + ' !', c: '#ffe27a', x: it.x, y: it.y - 12, T: 1, sm: true });
          eff(24, it.x, it.y, ['#ffe27a', '#fff4a8', '#ffffff'], 1.1);
          G.Audio && G.Audio.sfx('plan');
          G.vibre('double');
          direH(pick(['Jackpot !', 'Pour le budget !', 'Ça, c\'est du cinéma !', 'Le producteur sera content']), 1.4);
          W.st.mood = 'joie'; W.st.moodT = 1;
          mission('grosses', 1);
        } else if (it.k === 'coeur') {
          W.vies = Math.min(W.vies + 1, W.viesMax);
          W.coeurT = .7;
          mission('coeurs', 1);
          W.textes.push({ t: 'UN CŒUR DE PLUS', c: '#ff8a9a', y: 34, T: 1.6 });
          eff(20, it.x, it.y, ['#ff5a6a', '#ffffff'], 1.1);
          G.Audio && G.Audio.sfx('pouvoir');
          G.vibre('rise');
          direH('Merci la prod !', 1.2);
        } else if (it.k === 'pouv') {
          gagnerBonus(it.p, it.x, it.y);
        } else if (it.k === 'lettre') {
          W.lettres[it.l] = true;
          mission('lettres', 1);
          G.Audio && G.Audio.sfx('lettre');
          W.textes.push({ t: it.l, c: '#ffe27a', x: it.x, y: it.y - 10, T: .8, sm: true });
          if ('ACTION'.split('').every(c => W.lettres[c])) action();
        }
      }
    }
    W.items = W.items.filter(it => !it.pris && it.x > -30);
    if (W.volees) { for (const q of W.volees) q.t += dt * 2.4; W.volees = W.volees.filter(q => q.t < 1); }
  }
  function action() {
    W.lettres = {};
    W.flash = .35;
    W.secousse = 8;
    for (const o of W.obs) if (o.x !== undefined && o.x < G.VW + 40 && o.k !== 'courant') casser(o);
    W.obs = W.obs.filter(o => o.k !== 'rayon');
    W.textes.push({ t: 'ACTION !', c: '#ffe27a', y: 70, T: 1.8, big: 1 });
    gagnerBonus('roquette');
    W.pouv.aimant = 8;
    G.gagne(50); W.bob += 50;
    G.Audio && G.Audio.sfx('clap');
    G.vibre('heavy');
    mission('action', 1);
  }

  /* Le bonus de la statuette d'or (Max, 08/11/2026 : « un bonus inedit : quand on clique dessus ca fait exploser tous les obstacles
     a l'ecran ») : tout ce qui est dans l'image saute, chacun a sa facon (casser : la matiere, les bobines, la foule qui saute) ; les
     rayons s'eteignent ; l'animal qu'on filme n'a rien. Une onde d'or part du cadreur (render.js), qui brandit sa statuette. */
  function explosionOscar() {
    let n = 0;
    for (const o of W.obs) {
      if (o.mort || o.x === undefined || o.k === 'courant' || o.k === 'rayon') continue;
      const w = (o.w || 0) / 2;
      if (o.x - w > G.VW + 10 || o.x + w < -10) continue;
      casser(o); n++;
    }
    W.obs = W.obs.filter(o => o.k !== 'rayon');
    W.flash = .45; W.secousse = Math.max(W.secousse, 9); W.ondeOscar = W.T;
    W.st.oscarDebut = W.st.t; W.st.mood = 'joie'; W.st.moodT = 1.6;
    G.Lumiere && G.Lumiere.confettis(W, 60);
    G.Audio && G.Audio.sfx('crash'); G.Audio && G.Audio.sfx('mission');
    G.vibre('heavy');
    return n;
  }

  function majParts(dt) {
    for (const p of W.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.T -= dt; }

    W.parts = W.parts.filter(p => p.T > 0);
  }

  /* ---- Enchainement des decors ---- */
  function typeTransition(a, b) {
    const eauA = a.type === 'eau', eauB = b.type === 'eau';
    if (a.id === 'metro') return 'metro';
    if (!eauA && eauB) return 'plonge';
    if (eauA && !eauB) return 'surface';
    if (lieuDe(a.id) === lieuDe(b.id)) return G.pick(['fondu', 'fondu', 'nuages']);
    return pick(['nuages', 'pellicule', 'iris', 'fondu', 'nuages', 'pellicule']);
  }
  function majScene(dt) {
    const sc = W.sc;
    const reste = sc.x0 + sc.len - W.x;
    // on charge le suivant a l'avance
    if (!W.nextP && reste < sc.len * .7) {
      let mode = 'terre';
      // apres un decor de mer, une chance de plonger ; sous l'eau on remonte toujours
      if (sc.type !== 'eau' && sc.def.plonge && Math.random() < .7) mode = 'eau';
      const pr = prepare(mode), Wp = W;
      W.nextP = pr;
      // le decor prepare ne va qu'au monde qui l'a demande : si la partie a ete quittee entre-temps, il est oublie (avant, il arrivait
      // dans la partie suivante ou sur l'accueil)
      pr.then(b => { if (W === Wp && Wp.nextP === pr) Wp.next = b; else D.liberer(b); }).catch(e => { console.error(e); if (Wp.nextP === pr) Wp.nextP = null; });
    }
    if (W.next && reste <= 0 && !W.trans) {
      const b = W.next;
      W.next = null; W.nextP = null;
      b.x0 = W.x;
      const kind = typeTransition(sc, b);
      W.trans = { kind, b, prog: 0, dur: { nuages: 1.5, pellicule: 1.5, iris: 1.5, fondu: 1.3, plonge: 1.3, surface: 1.2, metro: 1.6 }[kind], swap: false, mur: creerMur(kind, sc, b) };
      if (kind === 'plonge') { W.plongees++; mission('plonge', 1); dire('eau'); G.Audio && G.Audio.sfx('splash'); }
      if (kind === 'surface') {
        dire('surface'); G.Audio && G.Audio.sfx('splash');
        // on jaillit de l'eau, entoure de dauphins
        W.vy = -300;
        eff(40, HX, W.y, ['#fff', '#bfe4ff', '#6fb5e0'], 1.4);
        if (D.existe('dauphin')) for (let i = 0; i < 3; i++) W.obs.push({ k: 'saut', s: 'dauphin', ami: true, x: G.VW * .5 + i * 90, y: 250 + i * 18, vy: -260, warn: .2 + i * .2, T: 0 });
      }
    }
    if (W.trans) {
      const tr = W.trans;
      tr.prog += dt / tr.dur;
      const mi = (tr.kind === 'fondu') ? 1 : .5;
      if (!tr.swap && tr.prog >= mi) {
        tr.swap = true;
        tr.a = W.sc;
        const x0 = tr.b.x0;
        installer(tr.b);
        tr.b.x0 = x0; // le decor d'arrivee defile depuis le debut de la transition
      }
      if (tr.prog >= 1) { if (tr.a) D.liberer(tr.a); W.trans = null; }
    }
    // obstacles : on laisse respirer pendant les transitions et au tout debut
    W.spawnX0 = G.VW + 40;
    if (!W.trans && W.vivant && !W.demo) {
      W.prochain = (W.prochain === undefined ? 1.8 : W.prochain) - dt;
      // le grand barrage : quand il est du, plus de nouvelle bande ; il part des que rien n'est plus devant le drone, et les bandes
      // reprennent pour arriver sur le drone juste apres sa derniere salve
      if (W.barrage && W.T >= W.barrage.reprise) { W.barrage = null; W.barrageT = rnd(24, 34); W.finBande = 0; if (W.vivant) mission('barrage', 1); }
      const barrageDu = !W.barrage && !W.boss && W.barrageT <= 0 && W.tJeu > 12 && reste > W.v * 8;
      if (barrageDu && ecranLibre()) lancerBarrage();
      // une bande apres l'autre : tant que la precedente n'est pas entree dans le champ, on attend
      if (!W.boss && !W.barrage && !barrageDu && W.prochain <= 0 && reste > 200 && W.x + W.spawnX0 >= (W.finBande || 0)) {
        W.nidT -= 1;
        // le bonus attendu est pret : son nid ne tarde pas
        if (bonusPret()) W.nidT = Math.min(W.nidT, 0);
        const d = dif();
        if (W.nidT <= 0 && W.tJeu > 8 && W.sc.type !== 'eau') {
          // un gros bonus, seul avec son piege : on doit pouvoir le lire et le tenter
          W.nidT = irnd(4, 6);
          const r = lancerNid();
          nettoyerPieces();
          W.prochain = r.d * rnd(1, 1.15);
          let xn = 0;
          for (const o of W.obs) if (o.k === 'struct' || o.k === 'sprite') xn = Math.max(xn, o.x + o.w / 2);
          W.finBande = W.x + xn + 60 + vit() * tempsPour(100) * .75;
          derniereBande = 'nid';
        } else {
          // entre deux dangers, parfois un cadeau facile : les petites bobines ne coutent rien
          // (sous l'eau, ou il n'y a pas de nid, le bonus attendu arrive au bout d'une ligne de bobines)
          // Jamais juste apres un nid (04/11/2026) : le nid laisse deja la place de tenter son tresor, et les deux respirations
          // collees faisaient 2,4 a 2,75 s sans rien devant le drone (tests/rythme.js)
          const cadeau = bonusPret() && W.sc.type === 'eau' && W.tJeu > 8;
          // (ni apres un grand barrage, qui a ses propres bobines, 05/11/2026)
          const m = cadeau || (derniereBande !== 'bobines' && derniereBande !== 'nid' && derniereBande !== 'barrage' && W.tJeu > 3 && Math.random() < .07) ? 'bobines' : choisirSection();
          derniereBande = m;
          W.prochain = 0;
          W.nBande = (W.nBande || 0) + 1;
          const n0 = W.obs.length;
          W.echS = pick([.58, .72, .85, 1, 1, 1.18, 1.36]);
          let x1 = SECTIONS[m](W.spawnX0 + 20);
          if (cadeau) { const der = W.items[W.items.length - 1]; W.items.push(poserBonus(x1 + 10, clamp(der ? der.y : 110, 60, 160))); }
          for (let i = n0; i < W.obs.length; i++) { W.obs[i].mo = m; W.obs[i].bande = W.nBande; }
          // un gros rocher deborde de sa bande : on compte toute sa largeur
          for (const o of W.obs) if (o.k === 'struct' || o.k === 'sprite') x1 = Math.max(x1, o.x + o.w / 2);
          nettoyerPieces();
          // la section suivante commence apres celle-ci, ses pieces d'approche comprises, et on a le temps de changer d'altitude
          W.finBande = W.x + x1 + 40 + vit() * tempsPour(100) * G.lerp(1.05, .75, d);
        }
      }
    }
    // les attaques qui visent le joueur : un avertissement sur le bord, puis ca file, de plus en plus souvent (eteintes avec les sprites)
    if (SPRITES_OBSTACLES && W.vivant && !W.demo && !W.trans && !W.boss && !W.percee && W.tJeu > 4 && !sousPlafond()) {
      W.missT -= dt;
      if (W.missT <= 0) {
        const id = W.reg.guide, d = dif();
        W.missT = rnd(G.lerp(6, 3, d), G.lerp(9.5, 5.5, d));
        if (D.existe(id) && !W.obs.some(o => o.k === 'guide')) {
          const n = W.tJeu > 70 && Math.random() < .35 ? 3 : W.tJeu > 30 && Math.random() < .4 ? 2 : 1;
          for (let i = 0; i < n; i++) W.obs.push({ k: 'guide', s: id, x: G.VW + 16, y: W.y, warn: 1 + i * .45, v: 1.9 });
        }
      }
    }
    // figurants
    if (W.sc.type !== 'eau' || W.sc.def.foule) {
      W.spawnFig -= dt;
      if (W.spawnFig <= 0) {
        W.spawnFig = rnd(.6, 1.6);
        if (W.sc.type !== 'eau') nouvelleSilhouette();
        if (Math.random() < .5) animauxFoule();
      }
    }
    W.spawnGag -= dt;
    if (W.spawnGag <= 0) { W.spawnGag = rnd(3.5, 7); lancerGag(); }
    // une grande scene de temps en temps : c'est la vie du lieu
    W.spawnFoule = (W.spawnFoule === undefined ? 6 : W.spawnFoule) - dt;
    if (W.spawnFoule <= 0) { W.spawnFoule = rnd(12, 20); lancerFoule(); }
    // de temps en temps, quelque chose d'absurde traverse le ciel
    W.spawnCiel = (W.spawnCiel === undefined ? rnd(8, 16) : W.spawnCiel) - dt;
    if (W.spawnCiel <= 0) {
      W.spawnCiel = rnd(14, 26);
      const l = G.CIEL_RIGOLO[W.sc.def.r];
      if (l && W.sc.hy > 60 && !sousPlafond()) {
        const [id, txt] = pick(l);
        if (D.existe(id)) W.volants = { s: id, x: G.VW + 20, y: rnd(16, Math.max(30, W.sc.hy - 40)), rot: 0, txt };
      }
    }
    if (W.volants) { const a = W.volants; a.x -= (40 + W.v * .08) * dt; if (a.x < -40) W.volants = null; }
    // decors specifiques : la rame de metro passe, etc.
    if (W.sc.def.train && D.existe('rame_metro') && !W.sujet) {
      W.trainT = (W.trainT === undefined ? 4 : W.trainT) - dt;
      if (W.trainT <= 0 && !W.figs.some(f => f.quai)) {
        W.trainT = rnd(9, 18);
        // parfois elle passe sans s'arreter, parfois elle prend des voyageurs
        W.figs.push({ s: 'rame_metro', x: G.VW + D.spr('rame_metro', 'l').w / 2 + 20, y: 158, v: 0, tp: 0, deco: true, quai: true, arrete: Math.random() < .6 });
        G.Audio && G.Audio.sfx('siffle');
      }
    }
  }

  /* ---- Mur de transition : couvre l'ecran pendant qu'on change de decor ---- */
  function creerMur(kind, a, b) {
    const VW = G.VW;
    if (kind === 'nuages') {
      const c = G.mkE(VW * 2 + 200, 216);
      const col = G.mix(a.m.c_ciel || [220, 230, 240], [255, 255, 255], .6);
      const col2 = G.mix(b.m.c_ciel || [220, 230, 240], [255, 255, 255], .4);
      const x = c.x;
      const puff = (px, py, r, co) => { x.fillStyle = G.rgb(co); x.beginPath(); x.arc(px | 0, py | 0, r | 0, 0, 7); x.fill(); };
      const w = c.lw;
      // bord d'attaque, plein centre, bord de fuite
      for (let i = 0; i < 170; i++) {
        const px = rnd(70, w - 70), py = rnd(-10, 226), r = rnd(22, 60);
        puff(px, py, r, G.mix(col2, col, px / w));
      }
      x.fillStyle = G.rgb(G.mix(col2, col, .5));
      x.fillRect(120, 0, w - 240, 216);
      for (let i = 0; i < 70; i++) { const px = rnd(90, w - 90), py = rnd(0, 216), r = rnd(8, 26); puff(px, py, r, G.mix([255, 255, 255], col, rnd(.2, .9))); }
      return c;
    }
    if (kind === 'pellicule') {
      // une bande de film traverse l'ecran : ses images montrent le decor suivant
      const c = G.mkE(VW * 2 + 120, 216), x = c.x;
      x.fillStyle = '#12110f'; x.fillRect(0, 0, c.lw, 216);
      const fw = 208, fh = 162;
      // chaque image de la bande montre le decor d'arrivee, tous ses plans superposes
      const vue = G.mkE(fw, fh);
      for (const p of b.plans) if (!p.devant) vue.x.drawImage(p.img, 0, 0, Math.min(p.nw, 800), p.nh, 0, p.y * fh / 216, fw, p.h * fh / 216);
      for (let px = 16; px < c.lw; px += fw + 10) x.drawImage(vue, px, 27);
      x.fillStyle = '#f2ecd8';
      for (let px = 6; px < c.lw; px += 20) { x.fillRect(px, 7, 11, 12); x.fillRect(px, 197, 11, 12); }
      return c;
    }
    if (kind === 'metro') {
      const c = G.mkE(VW * 2 + 200, 216), x = c.x;
      // sortie du metro : tunnel noir puis marches qui montent vers la lumiere
      x.fillStyle = '#0c0b10'; x.fillRect(60, 0, c.lw - 120, 216);
      x.fillStyle = '#2a4a3a'; x.fillRect(60, 0, 8, 216); x.fillRect(c.lw - 68, 0, 8, 216);
      x.fillStyle = '#d8b54a'; for (let y = 8; y < 216; y += 24) { x.fillRect(58, y, 12, 4); x.fillRect(c.lw - 70, y, 12, 4); }
      x.fillStyle = '#ffe9a8'; x.fillRect(c.lw / 2 - 90, 0, 180, 216);
      x.fillStyle = '#fff'; x.fillRect(c.lw / 2 - 66, 0, 132, 216);
      for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#3a3a42' : '#55555e'; x.fillRect(c.lw / 2 - 100 - i * 14, 200 - i * 12, 200 + i * 28, 12); }
      return c;
    }
    return null;
  }

  /* ---- Pause / reprise / continuer ---- */
  /* Pour le visualiseur : un decor qui reste, sa foule a la demande, et ses obstacles sans danger */
  J.vitrineFoule = i => { const l = G.FOULES_DECOR[W.sc.def.id] || G.FOULES[W.sc.def.r]; if (!l || !l[i]) return; const sauve = l.slice(); const o = l[i]; l.length = 0; l.push(o); lancerFoule(true); l.length = 0; l.push(...sauve); };
  J.vitrineMotif = (nom, m) => { W.matForce = m || null; W.obs.length = 0; W.items.length = 0; W.prochain = 99; if (W.sc) W.spawnX0 = G.VW + 40; const f = (MOTIFS[nom] || SECTIONS[nom]); if (f) { W.tJeu = Math.max(W.tJeu, 50); f(G.VW + 40); nettoyerPieces(); } };
  J.vitrineSprite = nom => { W.matForce = null; W.obs.length = 0; W.items.length = 0; W.prochain = 99; const k = kit(), x = G.VW + 40; if ((k.sol || []).includes(nom)) { const y = hautMur(130); const sv = k.sol; k.sol = [nom]; solA(x, y); k.sol = sv; } else if ((k.arche || []).includes(nom)) { const sv = k.arche; k.arche = [nom]; archeA(x, 96); k.arche = sv; } else if ((k.pend || []).includes(nom)) { const sv = k.pend; k.pend = [nom]; pendA(x, 96); k.pend = sv; } else W.obs.push({ k: 'vol', s: nom, x, y: 90, y0: 90, v: 1.15, amp: 10, ph: rnd(6) }); };
  J.kit = () => kit();
  J.vitrineLibre = () => { W.matForce = null; W.prochain = 0; W.finBande = 0; };
  J.vitrineJeu = on => { W.bossT = 1e9; W.demo = !on; W.fantome = on; W.vitrineJeu = on; W.prochain = 0; W.tJeu = on ? 45 : 0; if (!on) { W.obs.length = 0; W.items.length = 0; } };
  J.tuerTest = () => { W.invinc = 0; W.pouv = {}; W.vies = 0; W.bouclierN = 0; W.vMort = W.v; mourir(); };
  J.toucher = s => toucher(s);
  J.casser = o => casser(o);
  J.touche = (px, py, r) => hitCapsule(HX, W.y - 25, 6, px, py, px, py, r) < 0 || hitCapsule(HX, W.y - 2, 9, px, py, px, py, r) < 0;
  J.lancerBoss = () => { if (!W.boss) { W.obs.length = 0; G.Boss.lancer(W); } };
  J.reprendreApresMort = () => {
    W.vivant = true; W.finie = false; W.invinc = 2.5; W.rot = 0; W.y = 90; W.vy = -50; W.v = W.vMort || 200;
    W.mort = null; W.st.mort = false; W.st.air = 0; W.st.mood = 'neutre'; W.st.tilt = 0;
    W.v = Math.max(190, W.vPrev || 200); W.pouv = {}; W.turbo = false; W.vies = 1; W.coeurT = .7;
    W.prise2++;
    W.obs = W.obs.filter(o => o.x > G.VW);
    direH('Prise ' + (W.prise2 + 1) + ' !', 1.6);
    G.Audio && G.Audio.sfx('clap');
  };

  /* ---- Missions (la feuille de service) ---- */
  const POOL = [
    { k: 'frole', n: 'Frôler {n} obstacles', v: [5, 10, 20] },
    { k: 'plans', n: 'Réussir {n} plans', v: [1, 2, 4] },
    { k: 'detruit', n: 'Détruire {n} obstacles', v: [5, 15, 30] },
    { k: 'bobines', n: 'Ramasser {n} bobines', v: [60, 150, 300] },
    { k: 'ras', n: 'Voler {n} s au ras du sol', v: [4, 8, 14] },
    { k: 'surf', n: 'Surfer sur {n} baleines', v: [1, 1, 2] },
    { k: 'grosses', n: 'Prendre {n} grosses bobines', v: [1, 3, 5] },
    { k: 'tortues', n: 'Saluer {n} tortues copines', v: [1, 3, 5] },
    { k: 'plonge', n: 'Plonger {n} fois', v: [1, 2, 3] },
    { k: 'pouvoirs', n: 'Prendre {n} bonus', v: [2, 4, 7] },
    { k: 'action', n: 'Écrire ACTION {n} fois', v: [1, 1, 2] },
    { k: 'dist', n: 'Parcourir {n} m', v: [400, 900, 1600] },
    { k: 'decors', n: 'Découvrir {n} décors', v: [2, 3, 5] },
    { k: 'renverses', n: 'Décoiffer {n} figurants', v: [3, 6, 12] },
    // la deuxieme liste (Max, 08/11/2026 : « double la liste (mets 24 objectifs) ») : chacune avance par un geste du jeu
    { k: 'lettres', n: 'Ramasser {n} lettres', v: [2, 4, 7] },
    { k: 'coeurs', n: 'Ramasser {n} cœurs', v: [1, 2, 3] },
    { k: 'roquettes', n: 'Tirer {n} roquettes', v: [1, 3, 6] },
    { k: 'ralenti', n: 'Déclencher {n} ralentis', v: [1, 2, 3] },
    { k: 'turbo', n: 'Foncer {n} s en turbo', v: [2, 4, 7] },
    { k: 'bouclier', n: 'Parer {n} chocs au bouclier', v: [1, 2, 4] },
    { k: 'combo', n: 'Faire un combo de {n}', v: [3, 5, 8] },
    { k: 'boss', n: 'Filmer {n} animaux rares', v: [1, 2, 3] },
    { k: 'barrage', n: 'Survivre à {n} barrages', v: [1, 2, 4] },
    { k: 'sousEau', n: 'Parcourir {n} m sous l\'eau', v: [150, 400, 800] },
    { k: 'sansChoc', n: 'Parcourir {n} m sans choc', v: [400, 900, 1600] },
  ];
  /* Ce que rapporte une mission, en bobines : 40, 80 ou 120 selon le niveau. « Ecrire ACTION » est presque impossible (Max,
     07/11/2026 : « il faut que la recompense soit forte ») : 400, 600 ou 800, plus qu'une bonne partie (340). */
  const recompenseMission = J.recompenseMission = (k, niv) => k === 'action' ? 400 + niv * 200 : 40 + niv * 40;
  /* Et en experience (Max, 08/11/2026 : « fais en sorte que les missions a accomplir fassent gagner beaucoup plus d'XP (par exemple
     2000 pour ACTION, 1000 pour 2 plongeons, etc.) », puis, apres la 1.17, « le nombre d'XP me semble trop grand ») : selon ce
     qu'elle demande, aux trois niveaux, divise par dix depuis la 1.18 (ACTION 200, deux plongeons 100 : les proportions de Max). */
  /* x 10 depuis la 1.19 (Max, 08/11/2026 : « multiplie par 10 les xp gagnes a chaque fois, il faut que ce soit interessant de remplir
     les objectifs ») : ACTION 2 000, deux plongeons 1 000, ses exemples du debut. */
  const XP_MISSION = J.XP_MISSION = {
    frole: [500, 800, 1200], plans: [500, 900, 1400], detruit: [500, 800, 1200], bobines: [400, 700, 1100], ras: [500, 800, 1200],
    surf: [800, 1000, 1600], grosses: [500, 900, 1300], tortues: [700, 1100, 1600], plonge: [600, 1000, 1400], pouvoirs: [500, 800, 1200],
    action: [2000, 2500, 4000], dist: [400, 900, 1500], decors: [500, 800, 1300], renverses: [400, 700, 1100],
    lettres: [500, 800, 1300], coeurs: [500, 800, 1200], roquettes: [400, 800, 1300], ralenti: [400, 700, 1100], turbo: [400, 700, 1100],
    bouclier: [500, 800, 1300], combo: [600, 1000, 1600], boss: [800, 1300, 2000], barrage: [600, 1000, 1600], sousEau: [600, 1000, 1500],
    sansChoc: [600, 1000, 1600],
  };
  const xpMission = J.xpMission = (k, niv) => (XP_MISSION[k] || XP_MISSION.frole)[clamp(niv | 0, 0, 2)];
  // une mission deja tiree dans une sauvegarde prend la recompense d'aujourd'hui (son niveau se lit dans l'ancienne : 40 + niv x 40)
  J.normaliserMissions = () => {
    for (const m of G.sav.missions || []) {
      const niv = m.niv !== undefined ? m.niv : clamp(Math.round(((m.k === 'action' && m.r >= 400 ? (m.r - 400) / 5 : m.r) - 40) / 40), 0, 2);
      m.niv = niv; m.r = recompenseMission(m.k, niv); m.xp = xpMission(m.k, niv); if (m.txt) m.txt = accorder(m.txt);
    }
  };
  // au singulier quand il n'en faut qu'un (« Surfer sur 1 baleine », pas « 1 baleines »)
  const SING = [['plans', 'plan'], ['baleines', 'baleine'], ['grosses bobines', 'grosse bobine'], ['tortues copines', 'tortue copine'],
    ['lettres', 'lettre'], ['cœurs', 'cœur'], ['roquettes', 'roquette'], ['ralentis', 'ralenti'], ['chocs', 'choc'],
    ['animaux rares', 'animal rare'], ['barrages', 'barrage'], ['obstacles', 'obstacle'], ['figurants', 'figurant'], ['décors', 'décor']];
  const accorder = t => SING.reduce((s, [a, b]) => s.replace(new RegExp('(^|\\s)1 ' + a + '(?=\\s|$)'), (_, d) => d + '1 ' + b), t);
  // un objectif d'une sorte, a un niveau (n : un autre but, pour les controles)
  const missionDe = J.missionDe = (k, niv, n) => {
    const p = POOL.find(q => q.k === k);
    if (!p) return null;
    n = n || p.v[niv];
    return { k: p.k, txt: accorder(p.n.replace('{n}', n)), but: n, p: 0, niv, r: recompenseMission(p.k, niv), xp: xpMission(p.k, niv) };
  };
  function nouvelleMission() {
    const deja = (G.sav.missions || []).map(m => m.k);
    return missionDe(pick(POOL.filter(p => !deja.includes(p.k))).k, Math.min(2, (G.sav.rang / 4) | 0));
  }
  /* Douze missions en meme temps (Max, 08/11/2026 : « fais en sorte que les actions qui font gagner des XP soient une liste qu'on peut
     faire defiler (pour le moment il n'y en a que 3). Il faudrait qu'il y en ait au moins 12 ») : douze sortes differentes sur les
     quatorze ; une mission reussie est remplacee par une autre. */
  // vingt-quatre depuis la 1.19 (« double la liste »), sur vingt-cinq sortes
  const NB_MISSIONS = J.NB_MISSIONS = 24;
  J.completerMissions = () => {
    if (!G.sav.missions) G.sav.missions = [];
    J.normaliserMissions();
    let n = 0;
    while (G.sav.missions.length < NB_MISSIONS && n++ < 40) G.sav.missions.push(nouvelleMission());
  };
  function missionsDebut() {
    J.completerMissions();
    G.sauver();
  }
  function mission(k, d) {
    if (W.demo || !G.sav.missions) return;
    for (const m of G.sav.missions) {
      if (m.k !== k || m.fait) continue;
      m.p += d;
      if (m.p >= m.but) {
        m.fait = true;
        annonceMission(m);
        G.Audio && G.Audio.sfx('mission');
      }
    }
  }
  J.mission = (k, d) => mission(k, d);
  J.missionMax = (k, v) => missionMax(k, v);
  // deux objectifs reussis au meme moment s'empilent (avec vingt-quatre en cours, ca arrive) au lieu de s'ecrire l'un sur l'autre
  function annonceMission(m) {
    const n = W.textes.filter(q => q.mission && q.T > .3).length;
    W.textes.push({ t: 'MISSION : ' + m.txt, c: '#7fd0ff', y: 20 + Math.min(n, 3) * 10, T: 2.2, mission: true });
  }
  // ce qui se mesure d'un trait dans la partie (le plus long combo, le plus long passage sans choc) : on garde le meilleur
  function missionMax(k, v) {
    if (W.demo || !G.sav.missions) return;
    for (const m of G.sav.missions) {
      if (m.k !== k || m.fait || v <= m.p) continue;
      m.p = v;
      if (m.p >= m.but) { m.fait = true; annonceMission(m); G.Audio && G.Audio.sfx('mission'); }
    }
  }
  J.finMissions = () => {
    // verifie ce qui se mesure a la fin de la partie
    if (!G.sav.missions) return [];
    mission('dist', 0);
    for (const m of G.sav.missions) {
      if (m.fait) continue;
      if (m.k === 'dist' && W.dist >= m.but) m.fait = true;
      if (m.k === 'decors' && W.nouveaux.length >= m.but) m.fait = true;
      if (m.k === 'renverses' && W.renverses >= m.but) m.fait = true;
    }
    const finies = G.sav.missions.filter(m => m.fait);
    for (const m of finies) { G.gagne(m.r); G.sav.rang++; W.xpMissions = (W.xpMissions || 0) + (m.xp || xpMission(m.k, m.niv)); }
    G.sav.missions = G.sav.missions.filter(m => !m.fait);
    J.completerMissions();
    G.sauver();
    return finies;
  };
  /* L'experience d'une partie : aller loin d'abord, filmer ensuite, oser enfin (divisee par dix avec les missions depuis la 1.18) */
  J.calculXP = () => Math.round(W.dist * .05 + W.plansN * 6 + W.nouveaux.length * 3 + W.grossesN * 2 + W.frole * .2 + (W.xpMissions || 0));
  J.HX = HX;
})();
