/* Les boss : un animal exceptionnel du lieu (refonte demandee par Max, 03/11/2026). On ne le combat pas, on le FILME :
   la barre REC se remplit tant qu'il est dans le viseur et qu'on ne le touche pas, plus vite quand on ose s'approcher ;
   le toucher coute un coeur et une partie de la prise. Lui fond sur le heros par vagues, chaque coup annonce, et de temps en temps
   deux longues poutres resserrent le passage (l'etau) : on ne peut plus fuir tout en haut ou tout en bas.
   La camera du heros est toujours tournee vers lui (game.js, trouverCible). S'il n'est pas filme a temps, il s'en va. */
'use strict';
(function () {
  const B = G.Boss = {};
  const { rnd, pick, clamp } = G;
  const K = '#17151f', D = G.Decor;
  // vol : 'air' ou 'eau' ; vit : sa vitesse de croisiere ; coups : sa facon de fondre sur le heros
  const TYPES = {
    faucon: { s: 'boss_faucon', nom: 'LE FAUCON PÈLERIN', vit: 120, bat: 14, coups: ['pique', 'pique', 'rase'] },
    pygargue: { s: 'boss_pygargue', nom: 'LE PYGARGUE À TÊTE BLANCHE', vit: 95, bat: 10, coups: ['pique', 'rase', 'serres'] },
    aigle: { s: 'boss_aigle', nom: 'L\'AIGLE ROYAL', vit: 100, bat: 10, coups: ['pique', 'serres', 'rase'] },
    grandduc: { s: 'boss_grand_duc', nom: 'LE GRAND-DUC', vit: 90, bat: 11, coups: ['serres', 'pique', 'rase'] },
    flamant: { s: 'boss_flamant', nom: 'LE FLAMANT ROSE', vit: 95, bat: 12, coups: ['rase', 'rase', 'vague'] },
    fou: { s: 'boss_fou', nom: 'LE FOU DE BASSAN', vit: 110, bat: 12, coups: ['pique', 'pique', 'rase'] },
    fregate: { s: 'boss_fregate', nom: 'LA FRÉGATE', vit: 105, bat: 9, coups: ['rase', 'vague', 'pique'] },
    vautour: { s: 'boss_vautour', nom: 'LE VAUTOUR ORICOU', vit: 80, bat: 8, coups: ['vague', 'serres', 'rase'] },
    albatros: { s: 'boss_albatros', nom: 'L\'ALBATROS HURLEUR', vit: 100, bat: 8, coups: ['rase', 'vague', 'rase'] },
    renard: { s: 'boss_renard_volant', nom: 'LE RENARD VOLANT', vit: 105, bat: 13, coups: ['zigzag', 'rase', 'zigzag'] },
    balbuzard: { s: 'boss_balbuzard', nom: 'LE BALBUZARD', vit: 110, bat: 12, coups: ['pique', 'serres', 'rase'] },
    manta: { s: 'boss_manta', nom: 'LA RAIE MANTA', vit: 75, bat: 7, eau: 1, coups: ['vague', 'rase', 'vague'] },
    espadon: { s: 'boss_espadon', nom: 'L\'ESPADON', vit: 115, eau: 1, coups: ['charge', 'charge', 'vague'] },
    requin: { s: 'boss_requin_tigre', nom: 'LE REQUIN-TIGRE', vit: 95, eau: 1, coups: ['charge', 'vague', 'charge'] },
    baleine: { s: 'boss_requin_baleine', nom: 'LE REQUIN-BALEINE', vit: 60, eau: 1, coups: ['vague', 'rase', 'vague'] },
    napoleon: { s: 'boss_napoleon', nom: 'LE NAPOLÉON', vit: 80, eau: 1, coups: ['charge', 'vague', 'rase'] },
  };
  // l'animal de chaque lieu ; sous l'eau, celui de chaque decor ; sous un toit, le renard volant
  const PAR_REGION = {
    paris: 'faucon', berlin: 'faucon', londres: 'faucon', stade: 'faucon', newyork: 'pygargue', canada: 'pygargue',
    alpes: 'aigle', puy: 'aigle', russie: 'grandduc', camargue: 'flamant', normandie: 'fou', deauville: 'fou', irlande: 'fou',
    hawaii: 'fregate', caledonie: 'fregate', reunion: 'fregate', egypte: 'vautour', tunisie: 'vautour', tatooine: 'vautour',
    caravane: 'vautour', maroc: 'vautour', niger: 'vautour', joburg: 'vautour', afriquesud: 'albatros',
    australie: 'renard', madagascar: 'renard', mediterranee: 'balbuzard',
  };
  const PAR_DECOR = { ha_tortue: 'manta', med_rorqual: 'espadon', nc_tortue_eau: 'requin', nc_corail: 'requin', re_eau: 'baleine', nuweiba_eau: 'napoleon' };
  B.TYPES = TYPES;
  B.typeDe = W => {
    const def = W.sc.def;
    if (W.sc.type === 'eau') return PAR_DECOR[def.id] || 'manta';
    if (W.sc.type === 'int' && !def.pleinAir) return 'renard';
    return PAR_REGION[def.r] || 'faucon';
  };
  const ailes = q => !TYPES[q].eau || q === 'manta';
  // le haut et le bas de son terrain de jeu
  const yHaut = W => G.PLAFOND + 26 + (W.sc.def.plafond ? W.sc.def.plafond * .5 : 0);
  const yBas = () => G.SOL - 16;
  const yHeros = W => W.y - 13;
  // l'etau est la quand ses poutres arrivent sur le heros ou l'entourent
  const etauActif = B.etauActif = W => W.etau && W.etau.obs.some(o => W.obs.includes(o) && o.x - o.w / 2 < G.Jeu.HX + 260 && o.x + o.w / 2 > G.Jeu.HX - 30) ? W.etau : null;
  // l'etau en vue : de son arrivee dans l'image jusqu'a ce qu'il soit passe derriere le heros. Aucun coup ne part pendant ce temps
  // (Max, 07/11/2026 : « entre les obstacles qui prennent toute la largeur de l'ecran, et le boss au milieu a l'endroit ou je suis,
  // impossible de l'eviter » : un coup lance juste avant que les poutres arrivent sur le drone traversait le couloir ;
  // tests/boss_etau.js : 3 214 images avec un coup dans l'etau et 66 touches sur 128 combats, avant)
  const etauEnVue = B.etauEnVue = W => W.etau && W.etau.obs.some(o => W.obs.includes(o) && o.x + o.w / 2 > G.Jeu.HX - 30) ? W.etau : null;
  // un coup peut quand meme partir pendant que l'etau approche s'il aura fini (annonce et trajet) 0,6 s avant que les poutres
  // arrivent sur le drone : le boss garde son rythme (tests/boss_rythme.js), le couloir reste libre (tests/boss_etau.js)
  B.coupPossible = (W, c) => {
    const ev = etauEnVue(W);
    if (!ev) return true;
    const l = ev.obs.filter(o => W.obs.includes(o));
    const bord = Math.min(...l.map(o => o.x - o.w / 2)), v = Math.max(1, W.v * (W.ech || 1));
    const arrivee = (bord - (G.Jeu.HX + 30)) / v, duree = c.warn + longueur(c) / c.v;
    return duree + .6 < arrivee;
  };

  /* Le decor change en plein tournage : un oiseau ne plonge pas sous la mer, un poisson ne sort pas de l'eau ; il s'en va,
     le suivant sera celui du nouveau decor (03/11/2026 : l'helico volait sous l'eau). */
  B.changeDecor = W => {
    const b = W.boss;
    if (!b || b.phase === 'fuite') return;
    if ((W.sc.type === 'eau') === !!TYPES[b.q].eau) return;
    b.phase = 'fuite'; b.vise = false; b.coup = null;
  };

  B.lancer = W => {
    const q = B.typeDe(W), t = TYPES[q];
    const n = W.bossN || 0;
    W.boss = {
      q, nom: t.nom, s: t.s, x: G.VW + 120, y: 90, vx: 0, vy: 0, dir: -1, T: 0, phase: 'entree', prog: 0, vise: false, flash: 0,
      // la difficulte monte d'un boss a l'autre : plus vif, plus souvent sur nous, l'etau plus tot
      vit: t.vit * (1 + Math.min(.45, n * .09)), duree: 34, coupT: 1.6, i: 0, etauT: n ? rnd(5, 9) : rnd(10, 14), aile: 0, plane: 0, dist: 0, peur: 0,
    };
    W.textes = W.textes.filter(q => !/FILMER/.test(q.t));
    W.textes.push({ t: '! ' + G.trad(t.nom) + ' !', c: '#ffe27a', y: 58, T: 2.6, big: 0 });
    W.secousse = Math.max(W.secousse, 2);
    G.Audio && G.Audio.sfx('siffle');
    G.vibre('double');
    // ses images se chargent pendant son entree
    for (let k = 0; k < Math.max(1, D.nbImages(t.s)); k++) D.spr(D.nbImages(t.s) ? t.s + '_f' + k : t.s, 'l');
  };

  /* Une roquette ne blesse pas un animal qu'on filme : elle l'effraie, il recule et nous laisse respirer.
     Elle eclate sur lui a toutes les phases (Max, 06/11/2026 : « elle ne doit pas lui passer au travers ») ; il ne recule qu'en combat. */
  B.blesser = W => {
    const b = W.boss;
    if (!b) return;
    // il garde la pose qu'il avait quand elle l'a touche : en plein coup il battait des ailes, il continue (sinon, son coup annule, il passait
    // au vol plane dans la meme image et l'eclat restait a cote de l'aile touchee) ; en vol plane, il reste en vol plane
    b.flash = .25;
    if (b.coup && b.coup.warn <= 0) b.plane = Math.min(b.plane || 0, 0);
    if (b.phase !== 'combat') return;
    b.coup = null; b.peur = 2.2;
  };
  // dans l'image : la roquette peut le viser
  B.visible = W => { const b = W.boss; return !!b && b.x > -10 && b.x < G.VW + 10 && b.y + W.camY > -10 && b.y + W.camY < G.VH + 10; };
  /* Ou la roquette le touche : le premier point de son trajet de cette image qui arrive sur un pixel de l'animal tel qu'il est dessine
     (a 3 unites pres, l'epaisseur de la roquette). Le trajet est suivi dans le repere de l'animal, qui bouge aussi : une roquette rapide
     ne peut plus sauter par-dessus une aile entre deux images. Rend [x, y] (le point touche, sur le dessin de l animal) ou null. */
  const masques = new WeakMap();
  function masque(img) {
    let m = masques.get(img);
    if (m) return m;
    const c = G.mk(img.width, img.height); c.x.drawImage(img, 0, 0);
    const d = c.x.getImageData(0, 0, img.width, img.height).data, a = new Uint8Array(img.width * img.height);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 40 ? 1 : 0;
    m = { w: img.width, h: img.height, a };
    masques.set(img, m);
    return m;
  }
  const PROCHE = 3;
  B.contact = (W, x0, y0, x1, y1, ang) => {
    const b = W.boss;
    if (!b) return null;
    const sp = image(b);
    // l'animal a bondi (il revient par l'autre bord) : on ne balaie pas le chemin du saut
    const bx0 = Math.hypot(b.x - b.ox, b.y - b.oy) > 80 || b.ox === undefined ? b.x : b.ox, by0 = Math.hypot(b.x - b.ox, b.y - b.oy) > 80 || b.oy === undefined ? b.y : b.oy;
    const m = sp.ok && sp.img ? masque(sp.img) : null, S = G.S, r = Math.ceil(PROCHE * S), cam = W.camY;
    const c = Math.cos(ang || 0), s = Math.sin(ang || 0), corps = [-8, -4, 0, 4, 7];
    // la longueur du trajet relatif : un pas d'une unite au plus
    const L = Math.hypot((x1 - b.x) - (x0 - bx0), (y1 - b.y) - (y0 - by0)), n = Math.max(1, Math.ceil(L));
    for (let i = 0; i <= n; i++) {
      const k = i / n, ax = bx0 + (b.x - bx0) * k, ay = by0 + (b.y - by0) * k, rx = x0 + (x1 - x0) * k, ry = y0 + (y1 - y0) * k;
      if (!m) { if (Math.hypot(rx - ax, ry - ay) < 16) return [rx, ry]; continue; }
      const dx = Math.round(ax - sp.w / 2), dy = Math.round(ay - sp.h / 2 + cam);
      for (const t of corps) {
        let u = Math.floor((rx + c * t - dx) * S), v = Math.floor((ry + s * t - dy) * S);
        if (b.dir < 0) u = m.w - 1 - u;
        if (u < -r || v < -r || u >= m.w + r || v >= m.h + r) continue;
        for (let j = -r; j <= r; j++) for (let q = -r; q <= r; q++) {
          if (q * q + j * j > r * r) continue;
          const X = u + q, Y = v + j;
          // le point touche, la ou l'animal est dessine a la fin de l'image : l'eclat part de son corps
          if (X >= 0 && Y >= 0 && X < m.w && Y < m.h && m.a[Y * m.w + X]) return [rx + c * t + (b.x - ax), ry + s * t + (b.y - ay)];
        }
      }
    }
    return null;
  };

  // ses coups : toujours annonces (une ligne qui clignote sur sa trajectoire), puis il fonce
  const COUPS = {
    // il prend de la hauteur, plonge sur le heros, ressort en remontant par la gauche (une courbe : on voit ou il passera)
    pique(W, b) { const y = yHeros(W); return { k: 'pique', ax: b.x, ay: yHaut(W), cx: G.Jeu.HX + 70, cy: clamp(y + 64, yHaut(W), yBas() + 40), bx: -130, by: yHaut(W) + 20, warn: 1.35, v: b.vit * 2.6, sortie: true }; },
    // il rase a la hauteur du heros, de droite a gauche
    rase(W, b) { const y = clamp(yHeros(W), yHaut(W) + 10, yBas() - 6); return { k: 'rase', ax: G.VW + 40, ay: y, bx: -120, by: y, warn: 1.3, v: b.vit * 2.5, sortie: true }; },
    // les serres en avant : il arrive d'en bas, remonte vers le heros et ressort par la gauche
    serres(W, b) { const y = yHeros(W); return { k: 'serres', ax: b.x, ay: yBas(), cx: G.Jeu.HX + 70, cy: clamp(y - 64, yHaut(W) - 40, yBas()), bx: -130, by: yBas() - 20, warn: 1.35, v: b.vit * 2.5, sortie: true }; },
    // une grande ondulation qui balaie l'ecran : il faut passer dans le creux
    vague(W, b) { const y = clamp(yHeros(W), yHaut(W) + 26, yBas() - 26); return { k: 'vague', ax: G.VW + 40, ay: y, bx: -140, by: y, amp: rnd(24, 36), warn: 1.3, v: b.vit * 1.9, sortie: true }; },
    // en zigzag, a la chauve-souris
    zigzag(W, b) { const y = clamp(yHeros(W), yHaut(W) + 20, yBas() - 20); return { k: 'zigzag', ax: G.VW + 40, ay: y, bx: -140, by: y, amp: rnd(22, 32), warn: 1.3, v: b.vit * 2.2, sortie: true }; },
    // sous l'eau : il fonce tout droit a notre profondeur
    charge(W, b) { const y = clamp(yHeros(W), yHaut(W) + 8, yBas() - 6); return { k: 'charge', ax: G.VW + 60, ay: y, bx: -160, by: y, warn: 1.3, v: b.vit * 2.9, sortie: true }; },
    /* Hors de l'ecran (Max, 05/11/2026) : il s'en va d'un coup d'aile, on voit l'axe de son attaque, droit ou en courbe, avec une
       fleche la ou il va rentrer, et il revient dessus directement, parfois par derriere. Tout le trajet est hors de l'image au
       depart : on ne le voit pas pendant l'annonce (cache). */
    // en ligne droite, par derriere, a la hauteur du heros
    revers(W, b) { const y = clamp(yHeros(W), yHaut(W) + 10, yBas() - 6); return { k: 'revers', ax: -150, ay: y, bx: G.VW + 150, by: y, warn: 1.5, v: b.vit * 2.6, sortie: true, cache: true }; },
    // en courbe : du haut de l'ecran, ou de derriere, en haut ou en bas ; la courbe passe par le heros
    boucle(W, b) {
      const HX = G.Jeu.HX, P = [HX + rnd(-6, 18), clamp(yHeros(W), yHaut(W) + 10, yBas() - 6)];
      const f = pick([0, 1, 2]);
      // (le depart est toujours hors de l'image : au-dessus du bord, meme sous un plafond bas)
      const A = f === 0 ? [HX + rnd(230, 290), Math.min(yHaut(W) - 110, -70)] : f === 1 ? [-150, yHaut(W) - 30] : [-150, yBas() + 30];
      const B = f === 0 ? [-150, yBas() - rnd(10, 50)] : f === 1 ? [G.VW + 150, yBas() + 10] : [G.VW + 150, yHaut(W) - 40];
      // le point de controle qui fait passer la courbe par le heros a mi-chemin
      const cx = 2 * P[0] - (A[0] + B[0]) / 2, cy = clamp(2 * P[1] - (A[1] + B[1]) / 2, -120, G.VH + 120);
      return { k: 'boucle', ax: A[0], ay: A[1], cx, cy, bx: B[0], by: B[1], warn: 1.5, v: b.vit * 2.5, sortie: true, cache: true };
    },
  };
  // une attaque cachee : il s'en va pendant SORTIE secondes, puis l'axe s'affiche pendant le reste de l'annonce
  const SORTIE = .45;
  B.SORTIE = SORTIE;
  /* Un peu plus souvent, un peu plus varie (Max, 04/11/2026) : chaque animal a un coup de plus, voisin des siens ; les coups sont tires
     au hasard (jamais deux fois de suite le meme), de temps en temps un second suit vite (un double, toujours annonce), et leur vitesse
     varie un peu. Le repos entre deux coups passe de 2,2-3,4 s a 1-1,8 s ; l'annonce (1,3 s) ne change pas : on peut toujours esquiver. */
  const PLUS = { faucon: 'serres', pygargue: 'vague', aigle: 'vague', grandduc: 'vague', flamant: 'pique', fou: 'serres', fregate: 'serres',
    vautour: 'pique', albatros: 'pique', renard: 'vague', balbuzard: 'vague', manta: 'charge', espadon: 'zigzag', requin: 'rase', baleine: 'charge', napoleon: 'zigzag' };
  /* Plus souvent et plus vite (Max, 05/11/2026 : « la c'est un peu trop facile ») : repos de 0,6 a 1,1 s (1 a 1,8 avant), doubles plus
     frequents, coups 22 % plus rapides, annonce de 1,15 s (1,3 avant), et chaque animal attaque aussi depuis hors de l'ecran
     (revers, boucle). La justice des coups reste prouvee par tests/boss_animaux.js et tests/boss_page.js. */
  // (0,6 a 1,1 s jusqu'au 07/11/2026 : depuis qu'aucun coup ne traverse l'etau, le repos est plus court ailleurs pour garder le rythme)
  const repos = W => rnd(.4, .75) * G.lerp(1, .8, clamp((W.bossN || 0) / 4, 0, 1));
  const ANNONCE = 1.15;
  // sous l'eau, ou le drone est lent, l'annonce reste a 1,3 s
  const annonce = (W, b) => TYPES[b.q].eau ? 1.3 : ANNONCE;
  function coupSuivant(W, b) {
    const t = TYPES[b.q], l = t.coups.concat(PLUS[b.q] ? [PLUS[b.q]] : [], ['revers', 'boucle']);
    let k = l[Math.floor(Math.random() * l.length)];
    for (let i = 0; i < 4 && k === b.dernierCoup && new Set(l).size > 1; i++) k = l[Math.floor(Math.random() * l.length)];
    b.dernierCoup = k;
    const c = COUPS[k](W, b);
    c.v *= rnd(.92, 1.08) * 1.22;
    // l'annonce : plus courte ; une attaque cachee garde le temps de s'en aller avant que son axe s'affiche
    // (sous l'eau, le drone remonte lentement : l'annonce y reste de 1,3 s)
    const an = annonce(W, b);
    c.warn = c.cache ? SORTIE + an - .1 : Math.min(c.warn, an);
    return c;
  }
  // la position d'un coup a l'avancement u (0 au depart, 1 a l'arrivee)
  const surCoup = B.surCoup = (c, u) => {
    // une courbe (piqué, serres) passe par son point de controle ; sinon une ligne, ondulee ou en zigzag
    if (c.cx !== undefined) { const v = 1 - u; return [v * v * c.ax + 2 * v * u * c.cx + u * u * c.bx, v * v * c.ay + 2 * v * u * c.cy + u * u * c.by]; }
    const x = c.ax + (c.bx - c.ax) * u, y = c.ay + (c.by - c.ay) * u;
    if (c.k === 'vague') return [x, y + Math.sin(u * Math.PI * 2.2) * c.amp];
    if (c.k === 'zigzag') return [x, y + (Math.abs((u * 5) % 2 - 1) * 2 - 1) * c.amp];
    return [x, y];
  };
  const longueur = c => { let l = 0, p = surCoup(c, 0); for (let i = 1; i <= 20; i++) { const q = surCoup(c, i / 20); l += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return l; };

  // ce qui blesse : le corps et la tete, pas le bout des ailes (on doit pouvoir le frôler pour le filmer de pres)
  function zones(b) {
    const sp = D.spr(b.s, 'l'), w = sp.ok ? sp.w : 90, h = sp.ok ? sp.h : 50;
    const t = TYPES[b.q], r = Math.max(6, Math.min(w, h) * (t.eau && b.q !== 'manta' ? .26 : .19));
    if (t.eau && b.q !== 'manta') return [-.32, 0, .3].map(f => [b.x + f * w * -b.dir, b.y, r]);
    return [[b.x, b.y + h * .05, r], [b.x + w * .3 * b.dir, b.y - h * .02, r * .7]];
  }
  B.zones = b => zones(b);
  function touche(W, b) {
    if (!W.vivant || W.fantome) return false;
    return zones(b).some(([x, y, r]) => G.Jeu.touche(x, y, r));
  }

  B.maj = (W, dt) => {
    const b = W.boss, J = G.Jeu, HX = J.HX;
    b.T += dt; b.flash = Math.max(0, b.flash - dt); b.peur = Math.max(0, b.peur - dt);
    const x0 = b.x, y0 = b.y;
    // sa place au debut de l'image : une roquette suit son trajet dans le repere de l'animal (B.contact)
    b.ox = b.x; b.oy = b.y;
    if (b.phase === 'entree') {
      b.x += (330 - b.x) * Math.min(1, dt * 1.5);
      b.y += (clamp(yHeros(W) - 30, yHaut(W) + 10, yBas() - 20) - b.y) * Math.min(1, dt * 1.2);
      b.vise = b.x < G.VW - 20;
      if (b.T > 2.2) b.phase = 'combat';
    } else if (b.phase === 'combat') {
      b.vise = W.vivant;
      if (b.coup) {
        const c = b.coup;
        if (c.warn > 0) {
          // il se ramasse avant de partir : on voit d'ou il vient et ou il va
          c.warn -= dt;
          const [px, py] = surCoup(c, 0);
          if (c.cache) {
            // il s'en va d'un coup d'aile (en haut a droite ; un poisson file a droite), puis attend hors de l'image, au depart de son axe
            if (!c.parti) {
              const eau = TYPES[b.q].eau, ex = eau ? G.VW + 140 : b.x + 120, ey = eau ? b.y : -130, d = Math.hypot(ex - b.x, ey - b.y) || 1, s = Math.max(b.vit * 4.2, 600) * dt;
              b.x += (ex - b.x) / d * s; b.y += (ey - b.y) / d * s;
              const dehors = b.x > G.VW + 50 || b.y < -50;
              if (dehors || c.warn <= annonce(W, b) - .1) { c.parti = true; b.x = px; b.y = py; }
            } else { b.x = px; b.y = py; }
          } else { b.x += (px - b.x) * Math.min(1, dt * 4); b.y += (py - b.y) * Math.min(1, dt * 4); }
          if (c.warn <= 0) { c.u = 0; c.L = longueur(c); G.Audio && G.Audio.sfx('siffle'); }
        } else {
          c.u += c.v * dt / c.L;
          const [px, py] = surCoup(c, Math.min(1, c.u));
          b.x = px; b.y = py;
          if (touche(W, b)) prendre(W, b);
          if (c.u >= 1) {
            // sorti par la gauche : il revient par la droite ; sinon il remonte a sa place
            if (c.sortie) { b.x = G.VW + 110; b.y = clamp(yHeros(W) + rnd(-50, 50), yHaut(W) + 10, yBas() - 10); }
            // de temps en temps, un second coup suit vite (plus souvent d'un boss a l'autre)
            b.coup = null; b.coupT = Math.random() < Math.min(.55, .38 + .05 * (W.bossN || 0)) ? rnd(.35, .6) : repos(W);
          }
        }
      } else {
        // entre deux coups : il s'approche du heros en le suivant, avec de l'inertie ; effraye, il recule ;
        // dans l'etau, il tourne devant nous a l'interieur du passage, sans fondre dessus (on ne pourrait pas l'eviter)
        const e = etauActif(W);
        const cx = b.peur > 0 ? G.VW - 60 : e ? HX + 190 + Math.sin(b.T * .9) * 40 : clamp(HX + 150 + Math.sin(b.T * .7) * 50, HX + 110, G.VW - 40);
        const cy = b.peur > 0 ? yHaut(W) + 20 : e ? e.yc + Math.sin(b.T * 1.6) * e.g * .28 : clamp(yHeros(W) + Math.sin(b.T * 1.3) * 34, yHaut(W) + 8, yBas() - 8);
        const ax = clamp((cx - b.x) * 2.2 - b.vx * 1.6, -260, 260), ay = clamp((cy - b.y) * 2.4 - b.vy * 1.8, -260, 260);
        b.vx = clamp(b.vx + ax * dt, -b.vit, b.vit); b.vy = clamp(b.vy + ay * dt, -b.vit * .8, b.vit * .8);
        b.x += b.vx * dt; b.y += b.vy * dt;
        // entre deux coups il ne vient jamais sur le heros : c'est le coup annonce qui menace
        if (b.x < HX + 100) { b.x = HX + 100; b.vx = Math.max(0, b.vx); }
        if (touche(W, b)) prendre(W, b);
        b.coupT -= dt;
        if (b.coupT <= 0 && !b.peur && b.x > HX + 90) { const c = coupSuivant(W, b); if (B.coupPossible(W, c)) b.coup = c; else b.coupT = .2; }
      }
      // (une attaque cachee part de hors de l'image et y passe : on ne la ramene pas dans le terrain de jeu)
      if (!(b.coup && b.coup.cache)) b.y = clamp(b.y, yHaut(W) - 30, yBas() + 20);
      // l'etau : deux longues poutres qui prennent tout l'ecran en largeur, le passage se resserre ; toutes les 14 a 20 s (11 a 16
      // jusqu'au 07/11/2026 : aucun coup ne le traverse plus, le boss frappe d'autant plus entre deux)
      b.etauT -= dt;
      if (b.etauT <= 0 && J.MOTIFS && J.MOTIFS.etau && !b.coup && !etauActif(W)) { const n0 = W.obs.length; J.MOTIFS.etau(G.VW + 110, yHeros(W)); for (let i = n0; i < W.obs.length; i++) W.obs[i].bande = 900 + (W.T | 0); b.etauT = rnd(14, 20); }
      // la prise : on le filme tant qu'il est dans l'image ; de pres, ca va plus vite
      const dans = b.x > -20 && b.x < G.VW + 20;
      if (b.vise && dans) {
        const pres = clamp(1 - (Math.hypot(b.x - HX, b.y - yHeros(W)) - 50) / 200, 0, 1);
        b.prog = Math.min(1, b.prog + dt / 15 * (.75 + 1.25 * pres));
        b.pres = pres;
      }
      // des bobines a aller chercher pendant le tournage
      b.bobT = (b.bobT === undefined ? 1.5 : b.bobT) - dt;
      if (b.bobT <= 0) { b.bobT = rnd(2, 3.2); const y = rnd(yHaut(W) + 10, yBas() - 10); for (let i = 0; i < 6; i++) W.items.push({ k: 'bob', x: G.VW + 30 + i * 13, y }); }
      if (b.prog >= 1) { victoire(W, b); return; }
      if (b.T > b.duree) { b.phase = 'fuite'; b.vise = false; b.coup = null; W.textes.push({ t: 'IL S\'ÉCHAPPE...', c: '#ffb0a0', y: 58, T: 1.6 }); }
    } else {
      b.vise = false;
      b.x += 170 * dt; b.y -= (TYPES[b.q].eau ? 10 : 50) * dt;
      if (b.x > G.VW + 160) fin(W);
    }
    // le sens et le battement d'ailes suivent son mouvement
    const vx = (b.x - x0) / Math.max(dt, 1e-3), vy = (b.y - y0) / Math.max(dt, 1e-3);
    // sa vitesse, pour qu'une roquette vise la ou il sera (un saut d'un bord a l'autre ne compte pas)
    if (Math.hypot(b.x - x0, b.y - y0) < 80) { b.mvx = vx; b.mvy = vy; }
    if (Math.abs(vx) > 25) b.dir = vx < 0 ? -1 : 1;
    if (b.phase === 'entree') b.dir = -1;
    b.dist += Math.hypot(vx, vy) * dt;
    // un grand oiseau alterne battements et vol plane ; il bat plus vite quand il monte ou qu'il fonce
    b.plane -= dt;
    if (b.plane < -rnd(1.6, 2.6) && ailes(b.q) && !(b.coup && b.coup.warn <= 0)) b.plane = rnd(.7, 1.3);
    // sa cadence (images par seconde) : un faucon bat vite, un vautour ou un albatros lentement ; plus vite quand il monte ou fonce
    const bat = TYPES[b.q].bat || 9;
    b.aile += dt * (b.plane > 0 && vy > -20 ? 0 : bat * (vy < -30 || (b.coup && b.coup.warn <= 0) ? 1.35 : 1));
  };

  function prendre(W, b) {
    const avant = W.invinc;
    G.Jeu.toucher({ k: 'boss' });
    if (W.invinc > avant || !W.vivant) {
      // la prise est gachee en partie, et il s'eloigne un peu
      b.prog = Math.max(0, b.prog - .22); b.peur = 1.2; b.coup = null; b.coupT = rnd(2, 3);
      W.textes.push({ t: 'COUPEZ ! ON LA REFAIT', c: '#ff8a7a', y: 60, T: 1.2 });
    }
  }
  // le suivant arrive un peu plus tot (05/11/2026 : 28 a 40 s au lieu de 34 a 52)
  function fin(W) { W.boss = null; W.bossN = (W.bossN || 0) + 1; W.bossT = rnd(28, 40); W.finBande = 0; W.prochain = .3; }
  function victoire(W, b) {
    const g = 80 + 30 * (W.bossN || 0);
    G.gagne(g); W.bob += g;
    W.flash = .3;
    W.textes.push({ t: 'COUPEZ ! DANS LA BOÎTE !', c: '#ffe27a', y: 60, T: 2.4, big: 0 });
    W.textes.push({ t: '+' + g + ' bobines', c: '#fff', y: 74, T: 2.2 });
    G.Audio && G.Audio.sfx('clap'); G.vibre('heavy');
    // la pluie de bobines, et l'animal s'en va tranquillement : on ne lui fait aucun mal
    for (let i = 0; i < 26; i++) W.items.push({ k: 'bob', x: b.x + rnd(-50, 50), y: b.y + rnd(-30, 30), vx: rnd(-70, 50), vy: rnd(-120, -10), libre: true });
    W.st.mood = 'joie'; W.st.moodT = 1.5;
    b.phase = 'fuite'; b.vise = false; b.coup = null; b.gagne = true;
    // l'objectif « Filmer un animal rare » (game.js, POOL)
    G.Jeu.mission && G.Jeu.mission('boss', 1);
  }

  /* Le dessin */
  function image(b) {
    const n = D.nbImages(b.s);
    if (!n) return D.spr(b.s, 'l');
    let k;
    if (ailes(b.q)) {
      // les images : la cle, puis les poses a (ailes hautes), b (a plat), c (basses), d (a demi) ; le battement joue a-b-c-d,
      // le vol plane garde les ailes a plat (b)
      // un battement calcule (integrer.battre) donne ses 8 images dans l'ordre et sa pose de vol plane ; sinon les poses de Qwen
      const m = D.SPR && D.SPR[b.s + '_f0'], calc = m && m.plane !== undefined;
      const cycle = calc || n < 5 ? [...Array(n).keys()] : [1, 2, 3, 4], plat = calc ? m.plane : n >= 5 ? 2 : 0;
      k = b.plane > 0 && !(b.coup && b.coup.warn <= 0) ? plat : cycle[(b.aile | 0) % cycle.length];
    } else k = (b.T * 9 | 0) % n;
    const sp = D.spr(b.s + '_f' + k, 'l');
    return sp.ok ? sp : D.spr(b.s, 'l');
  }
  B.image = image;
  // la fleche d'entree : au bord de l'image, la ou la trajectoire y entre, pointee dans le sens de l'attaque
  function fleche(x, c, cam, col) {
    let u = 0;
    for (let i = 0; i <= 200; i++) { const [px, py] = surCoup(c, i / 200); if (px > 6 && px < G.VW - 6 && py > 6 && py < G.VH - 6) { u = i / 200; break; } }
    const [ax, ay] = surCoup(c, u), [bx, by] = surCoup(c, Math.min(1, u + .02)), a = Math.atan2(by - ay, bx - ax);
    const X = clamp(ax, 10, G.VW - 10), Y = clamp(ay + cam, 10, G.VH - 10);
    x.save(); x.translate(Math.round(X), Math.round(Y)); x.rotate(a);
    // un chevron double, cerne de sombre, coeur corail ou blanc : lisible sur tout decor
    const chevron = (o, e, f) => { x.fillStyle = f; for (let i = 0; i < 8; i++) { x.fillRect(o - i - e, -i - 1 - e, 4 + 2 * e, 2 + 2 * e); x.fillRect(o - i - e, i - 1 - e, 4 + 2 * e, 2 + 2 * e); } };
    for (let k = 0; k < 2; k++) chevron(k * 9, 1, K);
    for (let k = 0; k < 2; k++) chevron(k * 9, 0, col);
    x.restore();
  }
  B.dessiner = (x, W) => {
    const b = W.boss, cam = W.camY;
    // l'annonce d'un coup : sa trajectoire clignote
    // (une attaque cachee : son axe ne s'affiche qu'une fois l'animal sorti de l'image, avec une fleche la ou il va rentrer)
    if (b.coup && b.coup.warn > 0 && (!b.coup.cache || b.coup.parti)) {
      // des points corail a coeur blanc, cernes de sombre (05/11/2026 : les petits points se perdaient sur les facades) ; ils clignotent
      const c = b.coup, fort = (W.T * 10 | 0) % 2, col = fort ? '#ff5a40' : '#ffd6c8';
      for (let i = 0; i <= 44; i += 2) {
        const [px, py] = surCoup(c, i / 44);
        if (px < -4 || px > G.VW + 4) continue;
        const X = Math.round(px), Y = Math.round(py + cam);
        x.fillStyle = K; x.fillRect(X - 2.5, Y - 2.5, 5, 5);
        x.fillStyle = col; x.fillRect(X - 1.5, Y - 1.5, 3, 3);
        x.fillStyle = '#fff'; x.fillRect(X - .5, Y - .5, 1, 1);
      }
      const [ex, ey] = surCoup(c, Math.min(1, .55));
      x.fillStyle = K; x.fillRect(ex - 2, ey + cam - 9, 4, 8); x.fillRect(ex - 2, ey + cam + 1, 4, 4);
      x.fillStyle = col; x.fillRect(ex - 1, ey + cam - 8, 2, 6); x.fillRect(ex - 1, ey + cam + 2, 2, 2);
      if (c.cache) fleche(x, c, cam, col);
    }
    const sp = image(b);
    if (!sp.ok) return;
    const dx = Math.round(b.x - sp.w / 2), dy = Math.round(b.y - sp.h / 2 + cam);
    // les sprites regardent a droite : face au heros, il est retourne
    const dessine = img => { if (b.dir < 0) { x.save(); x.scale(-1, 1); x.drawImage(img, -dx - sp.w, dy); x.restore(); } else x.drawImage(img, dx, dy); };
    dessine(sp.img);
    if (b.flash > 0 && (W.T * 30 | 0) % 2) { const c = D.teinte(sp, [255, 255, 255], .7); if (c) dessine(c); }
    // ce que le heros voit dans son viseur
    if (b.vise) {
      const c = (W.T * 4 | 0) % 2 ? '#ff3b3b' : '#fff', a = dx - 4, h = dy - 4, ww = sp.w + 8, hh = sp.h + 8;
      x.fillStyle = c;
      for (const [cx, cy, sx, sy] of [[a, h, 1, 1], [a + ww, h, -1, 1], [a, h + hh, 1, -1], [a + ww, h + hh, -1, -1]]) { x.fillRect(sx > 0 ? cx : cx - 8, cy, 8, 1); x.fillRect(cx, sy > 0 ? cy : cy - 8, 1, 8); }
    }
  };
  B.hud = (x, W) => {
    const b = W.boss;
    if (b.phase === 'fuite') return;
    // sous les lettres ACTION, descendues avec le haut de l'ecran (G.Rendu.HAUT_HUD)
    const L = 170, X = (G.VW - L) / 2, Y = 18 + G.Rendu.HAUT_HUD;
    x.fillStyle = K; x.fillRect(X - 2, Y - 2, L + 4, 10);
    x.fillStyle = '#3a1a20'; x.fillRect(X, Y, L, 6);
    // la barre bat plus vite quand on filme de pres
    x.fillStyle = b.vise && (W.T * (4 + 8 * (b.pres || 0)) | 0) % 2 ? '#ff7a6a' : '#ff3b3b'; x.fillRect(X, Y, L * b.prog, 6);
    x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(X, Y, L * b.prog, 1.5);
    x.fillStyle = (W.T * 2 | 0) % 2 ? '#ff3b3b' : '#7a1a1a'; x.beginPath(); x.arc(X - 20, Y + 3, 2.6, 0, 7); x.fill();
    G.txt(x, 'REC', X - 5, Y - 1, '#ff3b3b', { al: 1, contour: K });
    G.txt(x, b.nom, G.VW / 2, Y + 9, '#fff', { al: .5, contour: K });
  };
})();
