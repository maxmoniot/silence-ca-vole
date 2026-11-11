/* Les figurants : petites poupees au pixel, dessinees a la volee selon le lieu. */
'use strict';
(function () {
  const K = '#17151f';
  const CW = 56, CH = 62, AX = 26, AY = 56;   // vignette et point d'ancrage (entre les pieds), en haute definition
  const om = (c, k) => G.tonOmbre(c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c, k);
  const lu = (c, k) => G.tonLumiere(c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c, k);
  const NB = 12; // images par cycle
  // le jardin des oiseaux (10/11/2026) : les fleurs du bouquet de la dame, la paille de sa capeline (claire, foncee, reflet, ombre)
  const FLEURS_BOUQUET = G.FLEURS_BOUQUET = ['#e8402c', '#f4c430', '#f8f4ea', '#ff8ab0', '#5a8ad8'];
  const PAILLE = G.PAILLE = ['#e2c47a', '#c9a654', '#f4e2a8', '#a8843c'];
  // la tete de mascotte du coureur deguise en panda, tournee vers la droite (K noir, k reflet sur le noir, W blanc, g blanc a l'ombre,
  // E le blanc de l'oeil, N la truffe)
  const TETE_PANDA = [
    '..KKK....KKK...',
    '.KkkK...KKkkK..',
    '.KKWWWWWWWKKK..',
    '..WWWWWWWWWWW..',
    '.WWWWWWWWWWWWW.',
    'gWWWWWWWKKKWWW.',
    'gWWWWWWKKEKKWW.',
    'gWWWWWWKKKKWWWW',
    'ggWWWWWWKKWWWNN',
    'ggWWWWWWWWWWWW.',
    '.ggWWWWWWWKWW..',
    '..gggWWWWWW....',
    '....ggggg......',
  ];
  const PANDA_C = { K: '#17151f', k: '#3a3848', W: '#f4f4f0', g: '#c3c6d0', E: '#ffffff', N: '#17151f' };
  const TAU = Math.PI * 2;

  /* La pose : ou sont les pieds et les mains a l'instant p (0..1) du cycle. Reperes : hanche en (0,-15), epaule en (0,-25). */
  function pose(nom, p) {
    const a = p * TAU, s = Math.sin(a), c = Math.cos(a);
    const R = { bob: 0, lean: 0, mood: 'n', pG: [-2, 0], pD: [2, 0], mG: [-4, -15], mD: [4, -15], tete: 0 };
    switch (nom) {
      case 'marche':
        R.bob = Math.abs(s) * 1; R.pG = [s * 4.5, -Math.max(0, c) * 2.4]; R.pD = [-s * 4.5, -Math.max(0, -c) * 2.4];
        R.mG = [-s * 3.5, -16]; R.mD = [s * 3.5, -16]; R.tete = Math.abs(c) * .7; break;
      case 'course':
        R.bob = Math.abs(s) * 2.2; R.lean = 2; R.pG = [s * 8, -Math.max(0, c) * 5.5]; R.pD = [-s * 8, -Math.max(0, -c) * 5.5];
        R.mG = [-s * 6, -18 + c * 2]; R.mD = [s * 6, -18 - c * 2]; R.tete = Math.abs(c); break;
      case 'panique':
        R.bob = Math.abs(s) * 2.6; R.lean = 1; R.pG = [s * 7, -Math.max(0, c) * 6.5]; R.pD = [-s * 7, -Math.max(0, -c) * 6.5];
        R.mG = [-7 + s * 2, -33 + c * 3]; R.mD = [7 - s * 2, -33 - c * 3]; R.mood = 'peur'; R.tete = c; break;
      case 'salut':
        R.bob = (c + 1) * .3; R.mD = [7 + s * 3, -32 + Math.abs(c)]; R.mG = [-4, -15]; R.mood = 'joie'; R.tete = c * .4; break;
      case 'filme':
        R.bob = (c + 1) * .3; R.mG = [6, -25 + s * .6]; R.mD = [8, -26 + s * .6]; R.tete = s * .4; break;
      case 'applaudit':
        R.bob = Math.abs(s) * .7; R.mG = [3 - Math.abs(s) * 3, -22]; R.mD = [4 + Math.abs(s) * 3, -23]; R.mood = 'joie'; break;
      case 'saute': {
        const h = Math.sin(p * Math.PI);
        R.bob = -1 + (1 - h) * -1; R.pG = [-3 - h, -h * 3]; R.pD = [3 + h, -h * 3];
        R.mG = [-7, -22 - h * 12]; R.mD = [7, -22 - h * 12]; R.mood = 'joie'; break;
      }
      case 'canne':
        // il avance a petits pas, un peu voute, la canne touche le sol avant le pied
        R.bob = Math.abs(s) * .4 - .6; R.lean = 2.6; R.pG = [s * 2.6, -Math.max(0, c) * 1]; R.pD = [-s * 2.6, -Math.max(0, -c) * 1];
        R.mG = [-3, -14]; R.mD = [7 + s * 1.5, -12]; R.tete = 1; break;
      case 'fauteuil':
        // assis, il pousse ses roues a deux mains
        R.bob = 4; R.lean = 1; R.pG = [8, -3]; R.pD = [10, -3];
        R.mG = [-1 + s * 3, -9 + c]; R.mD = [1 + s * 3, -9 + c]; break;
      case 'skate': {
        // une poussee, puis il glisse, jambes flechies
        const pousse = p < .34, k = Math.sin(p / .34 * Math.PI);
        R.bob = -1.8; R.lean = 1.4; R.pD = [5, -3];
        R.pG = pousse ? [-4 - k * 5, -k * 1.2] : [-5, -3];
        R.mG = [-8, -19 + c]; R.mD = [8, -20 - c]; R.tete = c * .3; break;
      }
      case 'velo':
        // assis, les pieds tournent, les mains au guidon
        R.bob = -3; R.lean = 3.4; R.pG = [2 + c * 3, -6 + s * 3]; R.pD = [2 - c * 3, -6 - s * 3];
        R.mG = [9, -21]; R.mD = [10, -21]; R.tete = Math.abs(s) * .3; break;
      case 'trott':
        R.bob = -1; R.lean = 1.2; R.pD = [2, -2.6]; R.pG = [-2 - Math.max(0, s) * 7, -Math.max(0, -s) * 2];
        R.mG = [9, -24]; R.mD = [10, -24]; break;
      case 'ski':
        R.bob = -1.4 + Math.abs(s) * .5; R.lean = 3; R.pG = [-4, -1.6]; R.pD = [4, -1.6];
        R.mG = [-3 + c * 3, -14]; R.mD = [7 + c * 3, -14]; break;
      case 'roller':
        // grande poussee sur le cote, bras qui balancent : ca glisse
        R.bob = Math.abs(s) * .6 - 1.4; R.lean = 2.4; R.pG = [s * 7, -1.4 - Math.max(0, c) * 1.6]; R.pD = [-s * 7, -1.4 - Math.max(0, -c) * 1.6];
        R.mG = [-s * 6 - 1, -18]; R.mD = [s * 6 + 1, -18]; R.tete = Math.abs(c) * .4; break;
      case 'danse':
        // bras en couronne qui tournent, la robe suit
        R.bob = Math.abs(s) * 1.2 - .4; R.lean = s * 1.4; R.pG = [-3 + s * 2, -Math.max(0, c) * 1.4]; R.pD = [3 + s * 2, -Math.max(0, -c) * 1.4];
        R.mG = [-8 + c * 3, -30 + s * 3]; R.mD = [8 + c * 3, -32 - s * 3]; R.mood = 'joie'; break;
      case 'perche':
        R.bob = (c + 1) * .3; R.mG = [3, -31 + s]; R.mD = [8, -30 + s]; break;
      case 'jongle': {
        // les mains montent l'une apres l'autre : il lance, il rattrape ; la tete suit les balles
        const g = Math.max(0, s), dd = Math.max(0, -s);
        R.bob = Math.abs(Math.sin(a * 2)) * .4; R.mG = [6 + g, -22 - g * 5]; R.mD = [10 + dd, -22 - dd * 5]; R.tete = -1; R.mood = 'joie'; break;
      }
      case 'assis':
        R.bob = 5; R.pG = [7, -2]; R.pD = [9, -2]; R.mG = [-3, -11]; R.mD = [5, -11]; break;
      /* Le hall du CID (Max, 08/11/2026 : « des gens qui mangent des petits fours, des gens qui se prennent en photo, des stars qui
         passent avec des gardes du corps... ») : chaque pose a son geste, l'objet tenu est dessine dans la main (dessine) */
      case 'mange': {
        // la main porte le petit four a la bouche, s'y arrete, redescend
        const k = Math.max(0, Math.sin(a)) ** .6;
        R.bob = (c + 1) * .3; R.mG = [-4, -15]; R.mD = [5 - k * 1, -16 - k * 12]; R.tete = -k * .4; R.mood = k > .9 ? 'joie' : 'n'; break;
      }
      case 'selfie':
        // le bras tendu devant lui, en haut ; un sourire, la tete qui penche un peu
        R.bob = (c + 1) * .25; R.mG = [-4, -16]; R.mD = [10, -34 + s * .6]; R.mood = 'joie'; R.tete = -.6 + s * .3; break;
      case 'micro':
        R.bob = (c + 1) * .3; R.mG = [-4, -15]; R.mD = [9, -24 + s * .8]; R.tete = s * .4; break;
      case 'plateau':
        // il marche, le plateau a hauteur d'epaule
        R.bob = Math.abs(s) * .8; R.pG = [s * 4, -Math.max(0, c) * 2]; R.pD = [-s * 4, -Math.max(0, -c) * 2];
        R.mG = [-s * 3, -16]; R.mD = [7, -25]; R.tete = Math.abs(c) * .5; break;
      case 'trophee': {
        // il saute de joie, le trophee a deux mains au-dessus de la tete
        const h = Math.max(0, Math.sin(a));
        R.bob = -h * 3; R.pG = [-3, -h * 2]; R.pD = [3, -h * 2]; R.mG = [0, -36 - h]; R.mD = [3, -37 - h]; R.mood = 'joie'; R.tete = -1; break;
      }
      case 'defile':
        // la star avance a petits pas et salue la foule
        R.bob = Math.abs(s) * .7; R.pG = [s * 3.5, -Math.max(0, c) * 1.8]; R.pD = [-s * 3.5, -Math.max(0, -c) * 1.8];
        R.mG = [-3, -15]; R.mD = [7 + Math.sin(a * 2) * 2, -33]; R.mood = 'joie'; break;
      /* l'informaticien du hall du CID (Max, 08/11/2026) : il marche son ordinateur ouvert dans les bras ; quand il parle, il s'arrete et
         brandit un cable reseau (« Un RJ45 ? ») ou un badge (« Qui veut un pass gratis ? »), l'ordinateur sous l'autre bras */
      case 'ordi':
        R.bob = Math.abs(s) * .7; R.pG = [s * 3.5, -Math.max(0, c) * 1.8]; R.pD = [-s * 3.5, -Math.max(0, -c) * 1.8];
        R.mG = [5, -20]; R.mD = [7, -21]; R.tete = 1; break;
      case 'rj45':
        R.bob = (c + 1) * .3; R.mG = [5, -20]; R.mD = [8, -34 + s]; R.mood = 'joie'; R.tete = -.5; break;
      case 'pass':
        R.bob = (c + 1) * .3; R.mG = [5, -20]; R.mD = [9, -32 + s]; R.mood = 'joie'; R.tete = -.5; break;
      case 'chaise_bras':
        // il leve les deux bras : il double, il crie, il gagne ; les pieds poussent encore
        R.bob = 6 + Math.abs(s) * .5; R.lean = 1; R.pG = [5 + s * 3, -1 - Math.max(0, -c) * 1.5]; R.pD = [6 - s * 3, -1 - Math.max(0, c) * 1.5];
        R.mG = [-3 - c * 2, -33 + s * 2]; R.mD = [5 + c * 2, -33 - s * 2]; R.mood = 'joie'; R.tete = -.6; break;
      case 'chaise_vroum':
        // couche vers l'avant, un bras tendu vers l'arrivee, les pieds qui moulinent
        R.bob = 6; R.lean = 3; R.pG = [5 + s * 6, -1 - Math.max(0, -c) * 2.5]; R.pD = [6 - s * 6, -1 - Math.max(0, c) * 2.5];
        R.mG = [-3, -14]; R.mD = [13, -25 + s]; R.mood = 'joie'; break;
      case 'chaise_toupie':
        // il tourne sur lui-meme : bras ecartes, pieds en l'air, la bouche ouverte
        R.bob = 6; R.lean = 0; R.pG = [8, -6 + s * 2]; R.pD = [10, -5 - s * 2]; R.mG = [-9, -24 + c * 2]; R.mD = [9, -26 - c * 2]; R.mood = 'peur'; R.tete = s; break;
      case 'chaise':
        // assis sur une chaise a roulettes, il pousse des deux pieds et leve le poing
        R.bob = 6; R.lean = 1.6; R.pG = [5 + s * 5, -1 - Math.max(0, -c) * 2]; R.pD = [6 - s * 5, -1 - Math.max(0, c) * 2];
        R.mG = [-3, -13]; R.mD = [6 + c, -31 + s * 2]; R.mood = 'joie'; R.tete = s * .5; break;
      /* Le jardin des oiseaux de Saint-Georges (Max, 10/11/2026 : « un enfant blond qui court apres une poule [...] et une dame blonde,
         cheveux au carre avec un chapeau de paille, avec des fleurs dans la main et qui dit « bienvenue au jardin des oiseaux » ») */
      case 'attrape':
        // il court penche en avant, les deux bras tendus vers la poule, les mains qui s'ouvrent et se ferment
        R.bob = Math.abs(s) * 2; R.lean = 2.6; R.pG = [s * 8, -Math.max(0, c) * 5.5]; R.pD = [-s * 8, -Math.max(0, -c) * 5.5];
        R.mG = [9 + c * 1.5, -21 + s * 1.5]; R.mD = [11 - c * 1.5, -22 - s * 1.5]; R.mood = 'joie'; R.tete = Math.abs(c) * .6; break;
      case 'superman':
        // le plongeon : tout droit, bras tendus au-dessus de la tete, jambes serrees (le jeu le couche a l'horizontale)
        R.bob = 0; R.pG = [-1, -1.5 - Math.max(0, s) * 1.5]; R.pD = [1, -1.5 - Math.max(0, -s) * 1.5]; R.mG = [2, -44]; R.mD = [4, -44]; R.mood = 'peur'; R.tete = -1; break;
      case 'gigote':
        // a plat ventre, il gigote : les pieds battent vers le ciel (vers l'arriere, debout), les bras restent tendus
        R.bob = 0; R.pG = [-2 - Math.max(0, s) * 5, -1 + Math.max(0, s) * 1.5]; R.pD = [-2 - Math.max(0, -s) * 5, -1 + Math.max(0, -s) * 1.5];
        R.mG = [3, -42]; R.mD = [5 + s, -41]; R.mood = 'peur'; R.tete = -1; break;
      case 'accroupi':
        // il se releve : a genoux, les mains au sol devant lui
        R.bob = 6; R.lean = 3; R.pG = [-4, 0]; R.pD = [3, -1]; R.mG = [8, -4]; R.mD = [10, -3]; R.tete = 1; break;
      case 'bouquet':
        // elle tient son bouquet contre elle, des deux mains
        R.bob = (c + 1) * .3; R.mG = [4, -16]; R.mD = [6, -17 + s * .4]; R.tete = s * .3; R.mood = 'joie'; break;
      case 'bienvenue':
        // elle leve son bouquet et le balance pour accueillir, l'autre main ouverte
        R.bob = (c + 1) * .35; R.mD = [7 + s * 2.2, -33 + Math.abs(c) * 1.2]; R.mG = [-6, -19 + c * .6]; R.mood = 'joie'; R.tete = -.6 + c * .3; break;
      default:
        R.bob = (c + 1) * .35; R.mG = [-4, -14 + c * .4]; R.mD = [4, -14 + c * .4];
    }
    return R;
  }

  function dessine(x, nomPose, f, d) {
    const R = pose(nomPose, f / NB);
    /* Un enfant (petit) : le meme squelette, plus court (hanche a 8 au lieu de 15, epaule a 15 au lieu de 25), la meme grosse tete ;
       la pose est ramenee a sa taille. Dessine a sa taille, rien de reduit. Les adultes ne passent jamais par ici. */
    const P = !!d.petit;
    if (P) {
      const e = (q, kx, ky) => [q[0] * kx, q[1] * ky];
      R.pG = e(R.pG, .75, .6); R.pD = e(R.pD, .75, .6); R.mG = e(R.mG, .75, .6); R.mD = e(R.mD, .75, .6); R.bob *= .6; R.lean *= .75;
    }
    const LJ = P ? 4 : 7.5, LB = P ? 3.6 : 5.8, TH = P ? 7 : 11;
    const s = d.peau || '#f2c9a4', s1 = om(s, .28), s2 = lu(s, .3);
    const t = d.haut || '#c8393b', t1 = om(d.haut2 || t, .34), t2 = lu(t, .24);
    const bs = d.bas || '#2a3350', bs1 = om(bs, .36), bs2 = lu(bs, .2);
    const sh = d.chaus || '#2a2630', sh2 = lu(sh, .3);
    const c = d.cheveux || '#3a2518', c1 = om(c, .35), c2 = lu(c, .3);
    const chC = d.chapC || '#2f6fb5', ch1 = om(chC, .32), ch2 = lu(chC, .3);
    const bob = R.bob, lean = R.lean;
    const hy = (P ? -8 : -15) + bob, sy = (P ? -15 : -25) + bob, tey = sy - (P ? 9 : 10) + (R.tete || 0) * .5;
    const tx = lean, thx = lean * 1.4;
    for (let pass = 0; pass < 2; pass++) {
      const r = (col, a, b, w, h) => {
        a = Math.round(a); b = Math.round(b);
        if (pass === 0) { x.fillStyle = K; x.fillRect(AX + a - 1, AY + b - 1, w + 2, h + 2); } else { x.fillStyle = col; x.fillRect(AX + a, AY + b, w, h); }
      };
      const q = (col, a, b, w, h) => { if (pass === 1) { x.fillStyle = col; x.fillRect(AX + Math.round(a), AY + Math.round(b), w, h); } };
      const seg = (col, x0, y0, x1, y1, w) => {
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
        for (let i = 0; i <= n; i++) r(col, x0 + (x1 - x0) * i / n - w / 2, y0 + (y1 - y0) * i / n - w / 2, w, w);
      };
      const ik = (x0, y0, x1, y1, l, sens) => {
        const dx = x1 - x0, dy = y1 - y0, dd = Math.min(Math.hypot(dx, dy), l * 2 - .01);
        const h = Math.sqrt(Math.max(0, l * l - dd * dd / 4)), n = Math.hypot(dx, dy) || 1;
        return [(x0 + x1) / 2 - dy / n * h * sens, (y0 + y1) / 2 + dx / n * h * sens];
      };
      // ce qui le porte : dessine avant lui, il est dessus
      if (nomPose === 'fauteuil') {
        const nb = 12, ro = 7, ra = f * .52;
        for (let i = 0; i < nb; i++) { const an = i / nb * 6.283; r('#3a3c48', -2 + Math.cos(an) * ro, -7 + Math.sin(an) * ro, 1, 1); }
        q('#c6ccd8', -2 + Math.cos(ra) * 4, -7 + Math.sin(ra) * 4, 1, 1); q('#c6ccd8', -2 - Math.cos(ra) * 4, -7 - Math.sin(ra) * 4, 1, 1);
        r('#3a3c48', 8, -2, 3, 2);
        seg('#5a6a8c', -5, -18, -5, -9, 1); seg('#5a6a8c', -5, -9, 8, -9, 1); seg('#5a6a8c', 8, -9, 9, -2, 1); r('#23242e', -8, -19, 3, 1);
      } else if (nomPose.startsWith('chaise')) {
        // la chaise de bureau : dossier, assise, pied, etoile a cinq branches et ses roulettes
        r('#2c2e3a', -9, -24, 3, 14); q('#4a4c5a', -9, -24, 3, 1);
        r('#2c2e3a', -7, -10, 14, 3); q('#4a4c5a', -7, -10, 14, 1);
        r('#8a8c9c', -1, -7, 2, 4);
        r('#3a3c48', -8, -3, 16, 1);
        const rr = f % 3;
        for (const wx of [-8, -1, 6]) { r('#17151f', wx, -2, 2, 2); q(rr === 0 ? '#6a6c7a' : '#17151f', wx, -2, 1, 1); }
      } else if (nomPose === 'skate') {
        r('#c84a3a', -9, -2, 18, 1); q('#e8735e', -8, -2, 8, 1);
        r('#23242e', -7, -1, 2, 1); r('#23242e', 5, -1, 2, 1);
      } else if (nomPose === 'trott') {
        r('#8f97a6', -5, -2, 13, 1); r('#23242e', -6, -1, 2, 1); r('#23242e', 7, -1, 2, 1);
        seg('#c6ccd8', 7, -2, 10, -25, 1); r('#23242e', 8, -26, 5, 1);
      } else if (nomPose === 'ski') {
        r('#f0c93a', -10, 0, 21, 1); q('#fff', 7, 0, 3, 1); q('#c8393b', -6, 0, 4, 1);
      } else if (nomPose === 'velo') {
        for (const cx of [-9, 10]) {
          const nb = 10, ro = 6.5;
          for (let i = 0; i < nb; i++) { const an = i / nb * 6.283; r('#23242e', cx + Math.cos(an) * ro, -7 + Math.sin(an) * ro, 1, 1); }
          const ra = f * .5; q('#c6ccd8', cx + Math.cos(ra) * 3, -7 + Math.sin(ra) * 3, 1, 1); q('#c6ccd8', cx - Math.cos(ra) * 3, -7 - Math.sin(ra) * 3, 1, 1);
        }
        seg(d.cadre || '#3a9ac8', -9, -7, 2, -7, 1); seg(d.cadre || '#3a9ac8', 2, -7, 8, -18, 1); seg(d.cadre || '#3a9ac8', -5, -15, 8, -16, 1); seg(d.cadre || '#3a9ac8', -9, -7, -5, -15, 1);
        seg(d.cadre || '#3a9ac8', 8, -18, 10, -7, 1); r('#23242e', 7, -21, 5, 1); r('#23242e', -8, -16, 6, 1);
      }
      // jambe arriere, bras arriere
      const jambe = (pied, hanx, col, fonce) => {
        if (d.jupe) { seg(fonce ? s1 : s, hanx, hy + 5, pied[0], pied[1] - 1, 2); }
        else {
          const [gx, gy] = ik(hanx, hy, pied[0], pied[1] - 1, LJ, -1);
          seg(col, hanx, hy, gx, gy, 3); seg(col, gx, gy, pied[0], pied[1] - 1, 3);
          if (!fonce) q(bs2, gx + 1, gy - 1, 1, 2);
        }
        r(sh, pied[0] - 2, pied[1] - 1, 5, 2);
        q(sh2, pied[0], pied[1] - 1, 2, 1);
        if (d.objet === 'rollers') {
          r('#c6ccd8', pied[0] - 2, pied[1] + 1, 5, 1);
          q('#23242e', pied[0] - 2, pied[1] + 1, 1, 1); q('#23242e', pied[0], pied[1] + 1, 1, 1); q('#23242e', pied[0] + 2, pied[1] + 1, 1, 1);
        }
      };
      jambe(R.pG, tx - 1.5, bs1, true);
      const bras = (main, epx, col, col2) => {
        // un costume (le panda) a ses bras et ses mains de sa couleur
        if (d.bras) { col = col === t1 ? om(d.bras, .2) : d.bras; col2 = col; }
        const [ex, ey] = ik(epx, sy + 1, main[0], main[1] + bob, LB, 1);
        seg(col, epx, sy + 1, ex, ey, 3); seg(col2 || col, ex, ey, main[0], main[1] + bob, 2);
        r(d.bras ? col : s, main[0] - 1, main[1] + bob - 1, 2, 2);
      };
      if (d.objet === 'sac') { r(d.sacC || '#c8593b', tx - 8, sy, 4, 9); q(lu(d.sacC || '#c8593b', .3), tx - 8, sy, 4, 1); q(om(d.sacC || '#c8593b', .3), tx - 8, sy + 6, 4, 3); r('#d9c79a', tx - 8, sy - 2, 4, 2); }
      bras(R.mG, tx - 3, t1, t1);
      jambe(R.pD, tx + 1.5, bs, false);
      // torse
      r(t, tx - 4, sy, 8, TH);
      q(t1, tx - 4, sy, 2, TH); q(t2, tx + 2, sy, 1, TH - 5); q(t1, tx - 4, sy + TH - 2, 8, 2);
      if (d.motif) { q(d.motif, tx - 4, sy + 3, 8, 2); q(om(d.motif, .25), tx - 4, sy + 3, 2, 2); }
      // la femme enceinte : un ventre rond sous la robe
      if (d.ventre) { r(t, tx + 3, sy + 4, 4, 9); r(t, tx + 7, sy + 6, 2, 6); q(t2, tx + 5, sy + 4, 2, 1); q(t2, tx + 7, sy + 6, 1, 3); q(t1, tx + 4, sy + 12, 4, 1); }
      if (d.col) { q(d.col, tx - 1, sy, 4, 2); }
      if (d.cravate) { q(d.cravate, tx, sy, 2, 6); }
      if (d.ceinture !== false && !d.jupe) { q('#2c2233', tx - 4, sy + TH - 2, 8, 1); q('#d9b85a', tx, sy + TH - 2, 2, 1); }
      if (d.jupe) { r(t, tx - 5, sy + 8, 10, 4); r(t, tx - 6, sy + 11, 12, 3); q(t1, tx - 6, sy + 11, 3, 3); q(t2, tx + 2, sy + 9, 2, 4); }
      // la longue robe descend jusqu'au sol et balaie en suivant le pas
      if (d.longue) { const b = Math.round(R.pG[0] * .4); r(t, tx - 6, sy + 13, 12, 6); r(t, tx - 7 + b, sy + 18, 14, 7); q('#3a3648', tx - 3, sy + 13, 1, 11); q('#3a3648', tx + 3 + b, sy + 18, 1, 7); }
      if (d.tete === 'panda') { q('#17151f', tx - 4, sy, 8, 3); q('#2c2a36', tx - 1, sy, 3, 1); q(om(t, .12), tx - 4, sy + 3, 2, 6); }
      if (d.objet === 'dossard') { q('#fff', tx - 2, sy + 2, 5, 5); q('#17151f', tx, sy + 3, 1, 3); }
      // sur le costume blanc, le dossard se voit a ses deux bandes rouges
      if (d.tete === 'panda') { q('#c8393b', tx - 2, sy + 3, 5, 1); q('#c8393b', tx - 2, sy + 7, 5, 1); q('#17151f', tx, sy + 4, 1, 3); q('#b8bcc6', tx - 2, sy + 8, 6, 1); }
      if (d.objet === 'accordeon') { r('#a03030', tx, sy + 1, 7, 8); for (let i = 0; i < 3; i++) q('#f4e8d8', tx + 1 + i * 2, sy + 1, 1, 8); q('#d9b85a', tx, sy + 1, 7, 1); }
      // tete
      const bx = thx;
      if (d.tete === 'panda') {
        // une grosse tete de mascotte, dessinee pixel par pixel (TETE_PANDA) : oreilles noires, tache autour de l'oeil, museau et truffe
        TETE_PANDA.forEach((ligne, cy) => { for (let cx = 0; cx < ligne.length; cx++) { const k = PANDA_C[ligne[cx]]; if (k) r(k, bx - 6 + cx, tey - 5 + cy, 1, 1); } });
        r('#17151f', bx - 2, tey + 8, 4, 2);
      } else if (d.boite) {
        r(d.boite, bx - 6, tey - 3, 12, 11);
        q(lu(d.boite, .3), bx - 6, tey - 3, 12, 1); q(om(d.boite, .3), bx - 6, tey + 6, 12, 2); q(om(d.boite, .3), bx - 6, tey - 3, 1, 11);
      } else {
        r(s1, bx - 1, tey + 7, 3, 2);
        r(s, bx - 4, tey, 9, 8);
        r(s, bx + 5, tey + 3, 1, 2);
        q(s1, bx - 4, tey + 6, 2, 2); q(s1, bx - 2, tey + 7, 6, 1); q(s2, bx + 1, tey + 1, 3, 1); q(s1, bx - 2, tey + 3, 1, 2);
      }
      // coiffes
      if (!d.boite && d.tete !== 'panda') switch (d.chapeau) {
        case 'beret': r('#28283a', bx - 5, tey - 2, 10, 3); r('#28283a', bx, tey - 4, 2, 2); q('#3f3f54', bx - 3, tey - 2, 5, 1); break;
        case 'casquette': r(chC, bx - 4, tey - 2, 9, 3); r(ch1, bx + 3, tey, 5, 1); q(ch2, bx - 2, tey - 2, 4, 1); break;
        case 'chech': r(chC, bx - 5, tey - 3, 10, 5); r(chC, bx - 5, tey + 1, 3, 6); q(ch1, bx - 5, tey + 3, 2, 4); q(ch2, bx - 3, tey - 3, 5, 1); q(ch1, bx - 4, tey, 8, 1); break;
        case 'paille': r('#d9c079', bx - 7, tey, 15, 1); r('#c9ad5e', bx - 4, tey - 3, 9, 3); q('#c8393b', bx - 4, tey - 1, 9, 1); q('#efdc9c', bx - 2, tey - 3, 4, 1); break;
        case 'bonnet': r(chC, bx - 4, tey - 2, 9, 4); r('#fff', bx - 1, tey - 4, 2, 2); q(ch2, bx - 2, tey - 2, 4, 1); q(ch1, bx - 4, tey + 1, 9, 1); break;
        case 'casque': r(chC, bx - 5, tey - 2, 11, 7); q(ch2, bx - 2, tey - 2, 5, 1); q(ch1, bx - 5, tey + 3, 11, 2); q('#17151f', bx, tey + 1, 5, 2); q('#7fd0ff', bx + 1, tey + 1, 3, 1); break;
        case 'romain': r('#d6b65b', bx - 5, tey - 2, 10, 4); r('#c8393b', bx - 2, tey - 6, 5, 4); q('#f0d98a', bx - 2, tey - 2, 4, 1); q('#8e2329', bx - 2, tey - 4, 5, 1); break;
        case 'chignon': r(c, bx - 5, tey - 1, 10, 3); r(c, bx - 2, tey - 4, 4, 3); q(c2, bx - 1, tey - 4, 2, 1); q(c2, bx - 2, tey - 1, 4, 1); break;
        case 'longs': r(c, bx - 5, tey - 1, 10, 3); r(c, bx - 6, tey, 3, 10); q(c2, bx - 2, tey - 1, 5, 1); q(c1, bx - 6, tey + 5, 2, 5); break;
        case 'chapka': r(chC, bx - 5, tey - 4, 11, 5); r(chC, bx - 6, tey + 1, 3, 5); q(ch2, bx - 3, tey - 4, 6, 1); q(ch1, bx - 5, tey, 11, 1); q(ch1, bx - 6, tey + 4, 2, 2); break;
        case 'fichu': r(chC, bx - 5, tey - 1, 10, 3); r(chC, bx - 6, tey, 3, 8); r(chC, bx - 3, tey + 7, 3, 2); q(ch2, bx - 2, tey - 1, 4, 1); q('#fff', bx - 5, tey + 2, 1, 1); q('#fff', bx - 1, tey, 1, 1); q(ch1, bx - 6, tey + 5, 2, 3); break;
        case 'melon': r('#1f1f28', bx - 6, tey, 13, 1); r('#1f1f28', bx - 4, tey - 4, 9, 4); q('#3a3a48', bx - 2, tey - 4, 4, 1); break;
        case 'oursin': r('#141418', bx - 5, tey - 11, 10, 13); q('#2a2a34', bx - 3, tey - 10, 3, 8); q('#2a2a34', bx + 1, tey - 8, 2, 4); r('#d8b030', bx + 4, tey + 3, 1, 5); break;
        case 'capuche': r(chC, bx - 5, tey - 3, 10, 5); r(chC, bx - 6, tey, 3, 9); r(chC, bx - 4, tey - 5, 3, 2); q(ch2, bx - 3, tey - 3, 4, 1); q(ch1, bx - 6, tey + 5, 2, 4); break;
        case 'criniere':
          // comedie musicale de la savane : une grande criniere de lion en couronne, le visage reste libre
          r(chC, bx - 8, tey - 6, 15, 6); r(chC, bx - 10, tey - 2, 7, 13); r(chC, bx - 6, tey + 8, 5, 3);
          q(ch2, bx - 6, tey - 6, 10, 1); q(ch2, bx - 9, tey + 1, 1, 6); q(ch1, bx - 9, tey + 8, 5, 3); q('#f0c040', bx - 1, tey - 8, 5, 2); break;
        case 'girafe':
          // une haute coiffe de girafe portee au-dessus de la tete : long cou tachete, petite tete, deux cornes
          r('#f0c060', bx - 1, tey - 20, 4, 20); q('#8a5a2a', bx, tey - 17, 2, 2); q('#8a5a2a', bx + 1, tey - 11, 2, 2); q('#8a5a2a', bx, tey - 6, 2, 2);
          r('#f0c060', bx - 1, tey - 24, 8, 5); q('#17151f', bx + 4, tey - 23, 1, 1); r('#8a5a2a', bx, tey - 27, 1, 3); r('#8a5a2a', bx + 3, tey - 27, 1, 3); q('#c89a40', bx - 1, tey - 20, 1, 20); break;
        case 'oiseau':
          // un masque d'oiseau et son grand bec jaune, porte sur le front
          r(chC, bx - 4, tey - 7, 9, 7); r('#f0c030', bx + 5, tey - 5, 6, 2); q(om('#f0c030', .3), bx + 5, tey - 4, 6, 1); q('#fff', bx + 1, tey - 6, 2, 2); q('#17151f', bx + 2, tey - 6, 1, 1); q(ch2, bx - 3, tey - 7, 4, 1); break;
        case 'bob': r('#d9c79a', bx - 6, tey, 13, 1); r('#c9b78a', bx - 4, tey - 3, 9, 3); q('#efe2bc', bx - 2, tey - 3, 4, 1); break;
        case 'paille_carre': {
          // la dame du jardin des oiseaux : un carre blond, coupe net a la machoire, sous une capeline de paille a ruban bleu
          r(c, bx - 6, tey - 1, 5, 9); r(c, bx - 2, tey - 1, 5, 2); r(c, bx + 2, tey, 2, 1);
          q(c2, bx - 5, tey, 2, 5); q(c1, bx - 2, tey + 1, 1, 6); q(c1, bx - 6, tey + 7, 5, 1);
          const [pa, pf, pc, po] = PAILLE;
          r(pa, bx - 9, tey - 2, 19, 2); q(po, bx - 9, tey - 1, 19, 1); q(pc, bx - 7, tey - 2, 6, 1);
          r(pf, bx - 4, tey - 6, 9, 4); q(pc, bx - 2, tey - 6, 4, 1);
          for (let k = 0; k < 4; k++) q(po, bx - 3 + k * 2, tey - 5 + (k & 1), 1, 1);
          q('#4f8ad0', bx - 4, tey - 3, 9, 1); q('#ff8ab0', bx + 3, tey - 4, 1, 1);
          break;
        }
        case 'blondinet':
          // l'enfant : des cheveux courts en bataille, deux epis sur le dessus
          r(c, bx - 5, tey - 1, 10, 3); r(c, bx - 5, tey, 3, 4); r(c, bx - 1, tey - 2, 2, 1); r(c, bx + 2, tey - 2, 2, 1);
          q(c2, bx - 2, tey - 1, 4, 1); q(c2, bx - 1, tey - 2, 1, 1); q(c1, bx - 5, tey + 2, 2, 2); q(c1, bx + 3, tey + 1, 2, 1);
          break;
        default: r(c, bx - 4, tey - 1, 9, 3); r(c, bx - 5, tey, 2, 3); q(c2, bx - 2, tey - 1, 4, 1); q(c1, bx - 5, tey + 2, 2, 1);
      }
      // bras avant et accessoires
      bras(R.mD, tx + 3, t, t);
      const ax = R.mD[0], ay = R.mD[1] + bob;
      if (nomPose === 'filme' && !d.objet) { r('#2c2e3a', ax + 1, ay - 3, 2, 5); q('#7fd0ff', ax + 1, ay - 2, 1, 3); }
      // le petit four, le telephone du selfie, le micro, le plateau et ses coupes, le trophee
      if (nomPose === 'mange') { r('#f6dce6', ax - 1, ay - 3, 3, 2); q('#e8708e', ax - 1, ay - 3, 3, 1); }
      if (nomPose === 'selfie') { r('#23242e', ax - 1, ay - 5, 3, 5); q('#7fd0ff', ax, ay - 4, 1, 2); }
      if (nomPose === 'micro') { r('#2c2e3a', ax, ay - 1, 4, 1); r('#6a6c7a', ax + 4, ay - 2, 2, 3); q('#9a9cac', ax + 4, ay - 2, 2, 1); }
      if (nomPose === 'plateau') { r('#c6ccd8', ax - 5, ay - 1, 11, 1); for (const fx of [-3, 0, 3]) { r('#f8e7a8', fx + ax, ay - 5, 1, 4); q('#ffd54a', fx + ax, ay - 3, 1, 2); } }
      // l'ordinateur ouvert (l'ecran vers lui, qui luit), le cable reseau et sa prise, le badge du festival
      if (nomPose === 'ordi') { r('#8a8c9c', ax - 7, ay - 1, 9, 2); q('#c6ccd8', ax - 7, ay - 1, 9, 1); r('#2c2e3a', ax + 1, ay - 9, 2, 8); q('#7fd0ff', ax, ay - 8, 1, 6); }
      if (nomPose === 'rj45' || nomPose === 'pass') { const lx = R.mG[0], ly = R.mG[1] + bob; r('#8a8c9c', lx - 6, ly - 1, 9, 2); q('#c6ccd8', lx - 6, ly - 1, 9, 1); r('#2c2e3a', lx + 2, ly - 9, 2, 8); q('#7fd0ff', lx + 1, ly - 8, 1, 6); }
      if (nomPose === 'rj45') { r('#3a8cd8', ax, ay - 1, 1, 8); q('#6ab0f0', ax, ay - 1, 1, 3); r('#e8e8f0', ax - 1, ay + 6, 3, 3); q('#c8a040', ax, ay + 7, 1, 1); }
      if (nomPose === 'pass') { r('#f6f4ee', ax - 2, ay - 7, 5, 6); q('#c8393b', ax - 2, ay - 7, 5, 2); q('#3a3c48', ax - 1, ay - 3, 3, 1); q('#3a8cd8', ax, ay - 1, 1, 2); }
      if (nomPose === 'trophee') { r('#ffd54a', ax - 1, ay - 9, 3, 8); q('#fff3b0', ax - 1, ay - 9, 1, 6); r('#c8961a', ax - 2, ay - 1, 5, 2); }
      if (d.objet === 'perche' && nomPose === 'perche') { r('#8a8a92', ax - 6, ay - 2, 20, 1); r('#3a3c48', ax + 13, ay - 5, 6, 4); q('#6a6c7c', ax + 14, ay - 5, 4, 1); }
      if (d.objet === 'clap') { r('#23242e', ax, ay - 4, 7, 5); r('#f4f0e0', ax, ay - 6, 7, 2); for (let i = 0; i < 3; i++) q('#23242e', ax + i * 2, ay - 6, 1, 2); q('#fff', ax + 1, ay - 2, 5, 1); }
      if (d.objet === 'lance') { r('#a8a8b0', ax, ay - 16, 1, 28); r('#e0e0e8', ax - 1, ay - 19, 3, 3); }
      if (d.objet === 'parapluie') { r('#4a4c5a', ax, ay - 9, 1, 10); r('#3a6fb0', ax - 6, ay - 12, 13, 2); r('#3a6fb0', ax - 3, ay - 14, 7, 2); q('#6a9fd8', ax - 2, ay - 14, 4, 1); }
      if (d.objet === 'camera') { r('#2c2e3a', ax + 1, ay - 5, 8, 6); q('#4a4c5a', ax + 2, ay - 5, 6, 1); r('#3a3c48', ax + 9, ay - 4, 3, 4); q('#7fd0ff', ax + 11, ay - 3, 1, 2); q('#ff3b3b', ax + 2, ay - 3, 1, 1); }
      if (d.objet === 'palmes') { r('#f0c93a', R.pG[0] - 3, R.pG[1], 7, 1); r('#f0c93a', R.pD[0] - 3, R.pD[1], 7, 1); q('#17151f', bx + 1, tey + 2, 4, 2); q('#7fe0ff', bx + 1, tey + 2, 3, 1); r('#f0c93a', bx - 6, tey - 4, 1, 10); }
      if (d.objet === 'drapeau') { r('#6a6c7a', ax, ay - 15, 1, 17); }
      if (d.objet === 'voile') { r('#fff', bx - 7, tey - 2, 4, 15); q('#e6e6ee', bx - 7, tey + 7, 4, 6); }
      if (nomPose === 'canne') {
        const hx = R.mD[0], hy = R.mD[1] + bob;
        seg('#6a4a2a', hx, hy, hx + 1 + Math.sin(f / NB * 6.283) * 1, -1, 1); r('#8a6a42', hx - 1, hy - 1, 3, 1);
      }
      if (d.objet === 'poussette') {
        // on pousse le landau : ses roues tournent, sa capote ballotte
        const b0 = 13, sa = f % 4 < 2 ? 0 : 1;
        seg('#3a3c48', 8, -17 + bob, b0 + 1, -7, 1);
        r(d.landau || '#3a7ab8', b0, -12 + sa * 0, 11, 6); q(lu(d.landau || '#3a7ab8', .3), b0 + 1, -12, 6, 1);
        r(om(d.landau || '#3a7ab8', .25), b0 + 5, -17, 6, 5);
        q('#f2c9a4', b0 + 2, -13, 3, 2);
        for (const rx of [b0 + 2, b0 + 8]) { r('#23242e', rx, -4, 2, 3); q('#c6ccd8', rx, -3 + sa, 1, 1); }
      }
      if (d.objet === 'canes') {
        // la cane et ses canetons, a la queue leu leu derriere elle
        const w = i => (f + i * 3) % 4 < 2 ? 0 : 1;
        r('#f4f0e4', -18, -6 - w(0), 6, 4); r('#f4f0e4', -13, -9 - w(0), 3, 3); q('#ff9a3c', -10, -8 - w(0), 2, 1); q(K, -12, -8 - w(0), 1, 1); r('#ff9a3c', -16 + w(0), -2, 1, 2);
        for (let i = 0; i < 3; i++) { const dx = -22 - i * 4 + (i ? 0 : 1); r('#f4d94a', dx, -4 - w(i + 1), 3, 2); r('#f4d94a', dx + 2, -6 - w(i + 1), 2, 2); q('#ff9a3c', dx + 4, -5 - w(i + 1), 1, 1); }
      }
      if (d.objet === 'chien') {
        // le chien marche devant lui, au bout de sa laisse
        const cc = d.chienC || '#b07a3a', cf = om(cc, .34), pat = f % 4 < 2 ? 1 : 0, dx0 = 17;
        r(cc, dx0 - 3, -7, 8, 4); q(cf, dx0 - 3, -4, 8, 1);
        r(cc, dx0 + 4, -10, 4, 4); q(K, dx0 + 6, -9, 1, 1); q('#2c2233', dx0 + 8, -8, 1, 1); r(cf, dx0 + 4, -11, 1, 2);
        r(cc, dx0 - 5, -8 - pat, 2, 2);
        r(cf, dx0 - 2 + pat, -3, 1, 3); r(cf, dx0 + 3 - pat, -3, 1, 3);
        if (pass === 1) { const hx = R.mD[0], hy = R.mD[1] + bob; for (let i = 0; i < 12; i++) { const t = i / 12; x.fillStyle = '#c8393b'; x.fillRect(AX + Math.round(hx + (dx0 + 4 - hx) * t), AY + Math.round(hy + (-7 - hy) * t + Math.sin(t * 3.14) * 3), 1, 1); } }
      }
      if (d.objet === 'balles' && nomPose === 'jongle' && pass === 1) {
        // trois balles en arc d'une main a l'autre, chacune decalee d'un tiers de tour
        for (let k = 0; k < 3; k++) {
          const u = (f / NB) * 1.5 + k / 3, p = u % 1, sens = Math.floor(u) % 2 ? -1 : 1;
          const xb = sens > 0 ? 6 + p * 5 : 11 - p * 5, yb = -25 - Math.sin(p * Math.PI) * 22 + bob;
          x.fillStyle = K; x.fillRect(AX + Math.round(xb) - 1, AY + Math.round(yb) - 1, 4, 4);
          x.fillStyle = ['#e8452c', '#ffd23c', '#2f8ad0'][k]; x.fillRect(AX + Math.round(xb), AY + Math.round(yb), 2, 2);
        }
      }
      if (d.objet === 'bouquet') { r('#5a9a4a', ax, ay - 2, 1, 4); r('#ff8ab0', ax - 1, ay - 4, 3, 2); }
      if (d.objet === 'fleurs') {
        // le bouquet de la dame du jardin : un cornet de papier kraft dans la main, le feuillage, cinq fleurs de couleurs differentes
        const [fr, fj, fb, fo, fe] = FLEURS_BOUQUET;
        r('#c89a5a', ax - 1, ay - 1, 3, 4); q('#e0b878', ax - 1, ay - 1, 1, 4); q('#a87a40', ax + 1, ay + 1, 1, 2);
        r('#4a8a3a', ax - 4, ay - 5, 9, 3); q('#6aaa4a', ax - 4, ay - 5, 2, 1); q('#3a6a2c', ax + 2, ay - 3, 3, 1);
        r(fr, ax - 4, ay - 7, 2, 2); r(fb, ax - 1, ay - 7, 2, 2); r(fe, ax + 2, ay - 7, 2, 2);
        r(fj, ax - 2, ay - 9, 2, 2); r(fo, ax + 1, ay - 9, 2, 2);
        q('#ffd23c', ax - 1, ay - 7, 1, 1); q(lu(fr, .35), ax - 4, ay - 7, 1, 1); q(lu(fo, .3), ax + 1, ay - 9, 1, 1);
      }
    }
    const q = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(AX + Math.round(a), AY + Math.round(b), w, h); };
    const bx = thx, peur = R.mood === 'peur', joie = R.mood === 'joie';
    if (d.tete === 'panda') {
      // le visage est dans TETE_PANDA
    } else if (d.boite) {
      q('#fff', bx - 4, tey, 4, 3); q('#fff', bx + 1, tey, 4, 3);
      q(K, bx - 2, tey + 1, 2, 2); q(K, bx + 3, tey + 1, 2, 2);
      q(K, bx - 2, tey + 5, 5, peur ? 2 : 1);
    } else if (d.objet !== 'palmes') {
      if (d.barbe) { q(c, bx - 1, tey + 5, 6, 3); q(c1, bx - 1, tey + 7, 6, 1); q(c2, bx + 1, tey + 5, 2, 1); }
      if (peur) {
        q('#fff', bx, tey + 2, 2, 3); q('#fff', bx + 3, tey + 2, 2, 3); q(K, bx + 1, tey + 3, 1, 1); q(K, bx + 4, tey + 3, 1, 1);
        q(K, bx + 1, tey + 5, 3, 2); q('#c8393b', bx + 2, tey + 6, 1, 1);
      } else if (joie) {
        q(K, bx, tey + 3, 2, 1); q(K, bx + 3, tey + 3, 2, 1);
        q(K, bx + 1, tey + 5, 3, 1); if (!d.barbe) q('#fff', bx + 2, tey + 5, 1, 1);
      } else {
        q('#fff', bx, tey + 2, 2, 2); q(K, bx + 1, tey + 2, 1, 2);
        q('#fff', bx + 3, tey + 2, 2, 2); q(K, bx + 4, tey + 2, 1, 2);
        q(d.barbe ? c1 : K, bx + 1, tey + 5, 3, 1);
      }
      q(c1, bx, tey + 1, 2, 1); q(c1, bx + 3, tey + 1, 2, 1);
    }
    if (d.objet === 'drapeau') { const ax = R.mD[0], ay = R.mD[1] + bob; q('#2f6fb5', ax + 1, ay - 15, 3, 6); q('#fff', ax + 4, ay - 15, 3, 6); q('#c8393b', ax + 7, ay - 15, 3, 6); }
  }

  /* La facon d'avancer de chacun : pose et vitesse (les autres marchent, courent, flanent) */
  G.ALLURE = { jongleur: ['jongle', 0, 0], jongleuse: ['jongle', 0, 0], enceinte: ['marche', 9, 14], enceinte2: ['marche', 9, 14], babouchka: ['canne', 9, 14], garde_royal: ['marche', 16, 20],
    comedien_lion: ['danse', 4, 9], comedienne_girafe: ['marche', 12, 18], comedien_oiseau: ['danse', 4, 9], danseuse_noire: ['danse', 4, 9], roller1: ['roller', 85, 145], roller2: ['roller', 85, 145], roller3: ['roller', 85, 145], roller4: ['roller', 85, 145], skate1: ['skate', 70, 130], skate2: ['skate', 70, 130], cycliste1: ['velo', 90, 150], cycliste2: ['velo', 90, 150], trott1: ['trott', 70, 110], skieur: ['ski', 90, 150], promeneur1: ['marche', 22, 34], promeneur2: ['marche', 22, 34], promeneur3: ['marche', 22, 34], promeneur4: ['marche', 22, 34], mamie1: ['canne', 9, 15], mamie2: ['canne', 9, 15], papy1: ['canne', 9, 15], papy2: ['canne', 9, 15], parent1: ['marche', 18, 28], parent2: ['marche', 18, 28], fauteuil1: ['fauteuil', 28, 60], fauteuil2: ['fauteuil', 28, 60], canards1: ['marche', 12, 18] };
  /* Tout le monde ne se ressemble pas : un figurant tire au sort a sa couleur de peau, ses cheveux, son haut.
     Les costumes tres reconnaissables (tetes-boites, plongeurs, gladiateurs...) gardent leur allure, pas leurs origines. */
  const PEAUX = ['#f7d7bc', '#f2c9a4', '#e0b083', '#c68f5e', '#9a6a42', '#7f5232', '#5a3a26'];
  const CHEVEUX_CLAIRS = ['#3a2518', '#6a4426', '#c8a040', '#c86a2c', '#222', '#a2a2aa'];
  const CHEVEUX_FONCES = ['#17151f', '#2c2233', '#222', '#3a2518', '#6a6a72'];
  const HAUTS = ['#c8393b', '#2f6fb5', '#3f8f4f', '#d29a2c', '#8a4ac8', '#e76f51', '#3a9a8a', '#c86a8a', '#f4c84a', '#56647a', '#e8e4d8'];
  const COSTUMES = { panda_coureur: 1, jawa: 1, plongeur: 1, moine: 1, moine1: 1, garde_royal: 1, comedien_lion: 1, comedienne_girafe: 1, comedien_oiseau: 1 };
  G.varier = nom => {
    const d = G.DOLLS[nom];
    if (!d || d.boite || COSTUMES[nom]) return nom;
    const n = Math.floor(Math.random() * 7), h = Math.floor(Math.random() * 11), v = nom + '~' + n + '_' + h;
    if (!G.DOLLS[v]) {
      const fonce = n >= 4, l = fonce ? CHEVEUX_FONCES : CHEVEUX_CLAIRS, q = Object.assign({}, d, { peau: PEAUX[n], cheveux: l[(n * 3 + h) % l.length] });
      // un sur deux change aussi de haut ; un uniforme garde le sien
      if (h % 2 && !d.motif && !d.cravate) { q.haut = HAUTS[h]; q.haut2 = undefined; }
      G.DOLLS[v] = q;
    }
    return v;
  };
  const cache = new Map();
  function image(nom, nomPose, f) {
    const k = nom + '|' + nomPose + '|' + f;
    let c = cache.get(k);
    if (c) return c;
    c = G.mk(CW, CH);
    dessine(c.x, nomPose, f, G.DOLLS[nom] || G.DOLLS.touriste);
    // plein : les 250 plus anciens partent (avant, tout le cache d'un coup, et tous les figurants a l'ecran etaient redessines)
    if (cache.size > 2500) { let n = 0; for (const q of cache.keys()) { cache.delete(q); if (++n >= 250) break; } }
    cache.set(k, c);
    return c;
  }
  /* t : temps d'animation ; px, py : pied du personnage, en coordonnees de jeu */
  G.dollDraw = (x, nom, nomPose, t, px, py, flip) => {
    const S = G.S;
    const f = Math.floor(t * 2.4) % NB;
    const c = image(nom, nomPose, f < 0 ? 0 : f);
    const w = CW / S, h = CH / S, ax = AX / S, ay = AY / S;
    if (flip) { x.save(); x.translate(px, py); x.scale(-1, 1); x.drawImage(c, -ax, -ay, w, h); x.restore(); }
    else x.drawImage(c, px - ax, py - ay, w, h);
  };

  G.DOLLS = {
    biologiste: { haut: '#f28c28', bas: '#2a3a5a', chapeau: 'casquette', chapC: '#f0ece0', peau: '#e8b98f' },
    biologiste2: { haut: '#e8c040', bas: '#2a3a5a', chapeau: 'longs', cheveux: '#5a3a24', peau: '#c98f62' },
    graffeur: { haut: '#2a2a34', motif: '#ff4a7a', bas: '#4a5266', chapeau: 'bonnet', chapC: '#ffd23a', peau: '#e8b98f' },
    graffeur2: { haut: '#3a6a4a', bas: '#2a2a34', chapeau: 'casquette', chapC: '#ff5a3a', peau: '#8a5a3a' },
    graffeuse: { haut: '#c04ae0', bas: '#2a2a34', chapeau: 'longs', cheveux: '#2a1a14', peau: '#e0b083' },
    policier_ete: { haut: '#f4f1e6', bas: '#f4f1e6', chapeau: 'casquette', chapC: '#f4f1e6', cheveux: '#221a14', peau: '#b57f54' },
    rando1: { haut: '#e76f51', bas: '#5a5f4c', chapeau: 'bob', objet: 'sac', sacC: '#2f6fb5' },
    rando2: { haut: '#2a9d8f', bas: '#4d5566', chapeau: 'casquette', chapC: '#e9c46a', objet: 'sac', sacC: '#c8393b', peau: '#e8b98f' },
    rando3: { haut: '#e9c46a', bas: '#6b4f3a', chapeau: 'longs', cheveux: '#7a5230', objet: 'sac', sacC: '#3f8f4f' },
    rando4: { haut: '#8a6bb5', bas: '#3a3f4c', chapeau: 'bonnet', chapC: '#e76f51', objet: 'sac', sacC: '#e9c46a', peau: '#b57f54' },
    guide: { haut: '#f28c28', bas: '#3a3f4c', chapeau: 'casquette', chapC: '#f28c28', objet: 'parapluie', col: '#fff' },
    skate1: { haut: '#3a3c48', motif: '#f0c93a', bas: '#5a6a8c', chapeau: 'casquette', chapC: '#c8393b', cheveux: '#222', peau: '#e0b083' },
    skate2: { haut: '#4a9a6a', bas: '#2c2233', chapeau: 'bonnet', chapC: '#2f6fb5', peau: '#7f5232' },
    cycliste1: { haut: '#f4c84a', bas: '#2a3350', chapeau: 'casque', chapC: '#fff', cadre: '#c8393b', peau: '#f2c9a4' },
    cycliste2: { haut: '#e76f51', bas: '#2c2233', chapeau: 'longs', cheveux: '#5a3a24', cadre: '#3a9ac8', peau: '#ba8358' },
    trott1: { haut: '#6a5ac8', bas: '#3a3f4c', cravate: '#c8393b', chapeau: 'nu', cheveux: '#3a2518', col: '#fff' },
    promeneur1: { haut: '#7a8a5a', bas: '#3a3f4c', objet: 'chien', chapeau: 'casquette', chapC: '#5a6a4a', chienC: '#b07a3a' },
    promeneur2: { haut: '#c86a8a', bas: '#2a3350', objet: 'chien', chapeau: 'longs', cheveux: '#c8a040', chienC: '#ece4d4' },
    mamie1: { haut: '#9a6ab0', haut2: '#7a4f90', bas: '#5a5a66', jupe: true, chapeau: 'chignon', cheveux: '#d0d0d8', peau: '#c68f5e' },
    papy1: { haut: '#6a7a5a', bas: '#3f4450', chapeau: 'beret', cheveux: '#bdbdc4', barbe: true, peau: '#f2c9a4' },
    mamie2: { haut: '#d4685a', bas: '#3a3a48', chapeau: 'chech', chapC: '#2f8f8a', peau: '#6f4a2e' },
    papy2: { haut: '#3f4a6a', bas: '#2c2c38', chapeau: 'casquette', chapC: '#8a6a42', cheveux: '#bdbdc4', peau: '#9a6a42' },
    parent1: { haut: '#3a9a8a', bas: '#2a3350', objet: 'poussette', landau: '#c8593b', chapeau: 'longs', cheveux: '#2c1c14', peau: '#9a6a42' },
    parent2: { haut: '#e8e4d8', bas: '#3f5a7a', objet: 'poussette', landau: '#3a7ab8', chapeau: 'nu', cheveux: '#c86a2c', barbe: true, peau: '#f7d7bc' },
    fauteuil1: { haut: '#c8393b', bas: '#2a3350', chapeau: 'nu', cheveux: '#222', peau: '#7f5232' },
    fauteuil2: { haut: '#3a7ab8', bas: '#3a3f4c', chapeau: 'longs', cheveux: '#c8a040', peau: '#f2c9a4' },
    promeneur3: { haut: '#d2a23a', bas: '#3a3a48', objet: 'chien', chapeau: 'nu', cheveux: '#17151f', chienC: '#2c2a33', peau: '#4f3424' },
    promeneur4: { haut: '#5a7ac8', bas: '#44404c', objet: 'chien', chapeau: 'chech', chapC: '#c86a8a', chienC: '#d8b080', peau: '#c68f5e' },
    canards1: { haut: '#e7c94a', bas: '#5a6a4a', objet: 'canes', chapeau: 'paille', peau: '#e0b083', jupe: true },
    roller1: { haut: '#e8513a', haut2: '#b83a28', bas: '#2a3350', chapeau: 'casque', chapC: '#f0c93a', objet: 'rollers', motif: '#fff', peau: '#f2c9a4' },
    roller2: { haut: '#3a9ac8', bas: '#1f3a5a', chapeau: 'bonnet', chapC: '#ff7a5e', objet: 'rollers', peau: '#ba8358', cheveux: '#222' },
    roller3: { haut: '#8a4ac8', bas: '#2c2233', chapeau: 'longs', cheveux: '#c86a2c', objet: 'rollers' },
    roller4: { haut: '#f4c84a', bas: '#3a4a2a', chapeau: 'casquette', chapC: '#2f6fb5', objet: 'rollers', cheveux: '#3a2518', peau: '#e0b083' },
    manif1: { haut: '#c8393b', bas: '#2a3350', cheveux: '#3a2518' },
    manif2: { haut: '#2f6fb5', bas: '#3a3f4c', chapeau: 'beret', barbe: true, cheveux: '#555' },
    manif3: { haut: '#f4c430', bas: '#4d5566', chapeau: 'longs', cheveux: '#222', peau: '#e8b98f' },
    manif4: { haut: '#3f8f4f', bas: '#2a3350', peau: '#7a4d2e', cheveux: '#111' },
    manif5: { haut: '#e76f51', bas: '#22293a', chapeau: 'chignon', cheveux: '#c9a24a' },
    marathon1: { haut: '#3fae49', bas: '#111', chapeau: 'casquette', chapC: '#fff', objet: 'dossard', peau: '#b57f54' },
    marathon2: { haut: '#e76f51', bas: '#22293a', objet: 'dossard', chapeau: 'chignon', cheveux: '#7a5230' },
    marathon3: { haut: '#2f6fb5', bas: '#111', objet: 'dossard', cheveux: '#222' },
    mariee: { haut: '#fbfaf2', bas: '#fbfaf2', jupe: true, objet: 'voile', chapeau: 'chignon', cheveux: '#7a5230' },
    marie: { haut: '#2a3146', bas: '#22293a', col: '#fff', cravate: '#c8393b', cheveux: '#3a2518' },
    invite1: { haut: '#d98fb0', bas: '#d98fb0', jupe: true, chapeau: 'paille' },
    invite2: { haut: '#566478', bas: '#3a3f4c', col: '#fff', cravate: '#2f6fb5', cheveux: '#555' },
    enfant1: { haut: '#f4c430', bas: '#2f6fb5', chapeau: 'casquette', chapC: '#c8393b', objet: 'sac', sacC: '#e262b5' },
    enfant2: { haut: '#e262b5', bas: '#3a3f4c', chapeau: 'chignon', cheveux: '#222', objet: 'sac', sacC: '#2a9d8f', peau: '#b57f54' },
    moine1: { haut: '#6b4a2c', bas: '#6b4a2c', jupe: true, chapeau: 'chech', chapC: '#6b4a2c', peau: '#f2c9a4' },
    hula: { haut: '#e262b5', motif: '#f4c430', bas: '#3fae49', jupe: true, peau: '#b57f54', chapeau: 'longs', cheveux: '#111' },
    piper: { haut: '#2f7a4a', motif: '#f4c430', bas: '#2f7a4a', jupe: true, chapeau: 'casquette', chapC: '#2f7a4a', barbe: true, cheveux: '#b5562a' },
    yogi: { haut: '#c79bff', bas: '#3a3f4c', chapeau: 'chignon', cheveux: '#222', peau: '#e8b98f' },
    touriste: { haut: '#e76f51', bas: '#4d5566', chapeau: 'casquette', chapC: '#f4a261' },
    touriste2: { haut: '#2a9d8f', bas: '#3a3f4c', chapeau: 'paille', peau: '#e8b98f' },
    touriste3: { haut: '#e9c46a', bas: '#6b4f3a', chapeau: 'longs', cheveux: '#b5562a' },
    cadreur: { haut: '#2b2d3c', bas: '#3a3f4c', chapeau: 'casquette', chapC: '#2b2d3c', objet: 'camera' },
    perchman: { haut: '#566246', bas: '#2a3350', cheveux: '#222', objet: 'perche' },
    assistant: { haut: '#f4f0e0', bas: '#2a3350', objet: 'clap', chapeau: 'longs', cheveux: '#222' },
    // Metro
    usager: { haut: '#566478', bas: '#2a3444', cheveux: '#222', col: '#dfe6f0' },
    usagere: { haut: '#b91c5c', bas: '#1f2937', chapeau: 'chignon', cheveux: '#7a5230', jupe: true },
    costard: { haut: '#2a3146', bas: '#22293a', col: '#f4f0e0', cravate: '#c8393b', cheveux: '#555' },
    accordeoniste: { haut: '#1e3a5f', motif: '#fff', bas: '#22293a', chapeau: 'beret', objet: 'accordeon', barbe: true, cheveux: '#555' },
    controleur: { haut: '#2c4a7c', bas: '#1a2a4a', chapeau: 'casquette', chapC: '#1a2a4a', col: '#dfe6f0', cravate: '#1a2a4a' },
    // Paris
    danseuse: { haut: '#14121a', bas: '#14121a', jupe: true, chapeau: 'chignon', cheveux: '#222', peau: '#e8b98f' },
    danseuse_noire: { haut: '#14121a', bas: '#14121a', jupe: true, longue: true, chapeau: 'chignon', cheveux: '#17151f', peau: '#e8b98f' },
    pilote: { haut: '#c8393b', bas: '#c8393b', chapeau: 'casque', chapC: '#f4f4f0' },
    parisien: { haut: '#2b2d3c', motif: '#fff', bas: '#3a3f4c', chapeau: 'beret' },
    voyageur: { haut: '#3a3f4c', bas: '#22293a', chapeau: 'casquette', chapC: '#222' },
    // Deauville
    star: { haut: '#c8193b', bas: '#c8193b', jupe: true, chapeau: 'chignon', cheveux: '#c9a24a' },
    // le hall du CID (vie_france.js : cidHall)
    invitee: { haut: '#2a4a8a', bas: '#2a4a8a', jupe: true, longue: true, chapeau: 'chignon', cheveux: '#c9a24a', peau: '#f2c9a4' },
    invitee2: { haut: '#c8a040', bas: '#c8a040', jupe: true, longue: true, chapeau: 'longs', cheveux: '#17151f', peau: '#9a6a42' },
    invitee3: { haut: '#8a2a5a', bas: '#8a2a5a', jupe: true, longue: true, chapeau: 'longs', cheveux: '#b5562a', peau: '#f7d7bc' },
    smoking2: { haut: '#1c1a24', bas: '#14121a', col: '#ffffff', cravate: '#c8393b', cheveux: '#a2a2aa', peau: '#e0b083' },
    serveur: { haut: '#f4f0e8', bas: '#17151f', col: '#ffffff', cravate: '#17151f', chapeau: 'nu', cheveux: '#3a2518', peau: '#c68f5e' },
    garde_corps: { haut: '#18171f', bas: '#18171f', col: '#ffffff', cravate: '#18171f', chapeau: 'nu', cheveux: '#17151f', peau: '#7f5232' },
    garde_corps2: { haut: '#18171f', bas: '#18171f', col: '#ffffff', cravate: '#18171f', chapeau: 'nu', cheveux: '#5a3a24', peau: '#e8b98f', barbe: true },
    journaliste: { haut: '#5a7ac8', bas: '#3a3f4c', chapeau: 'longs', cheveux: '#7a5230', peau: '#e8b98f' },
    laureat: { haut: '#1c1a24', bas: '#14121a', col: '#ffffff', cravate: '#ffd54a', cheveux: '#222', peau: '#c68f5e' },
    informaticien: { haut: '#2c2e3a', motif: '#3fd07a', bas: '#2f3b5e', chapeau: 'beret', cheveux: '#5a3a24', barbe: true, peau: '#e0b083', col: '#3a8cd8' },
    coureur1: { haut: '#3a6a9a', bas: '#3a3f4c', chapeau: 'casquette', chapC: '#e76f51', objet: 'sac', sacC: '#2a2a34', peau: '#e8b98f' },
    coureur2: { haut: '#c86a8a', bas: '#2a3350', chapeau: 'longs', cheveux: '#3a2518', objet: 'sac', sacC: '#3f8f4f', peau: '#f2c9a4' },
    coureur3: { haut: '#f4c430', bas: '#4d5566', chapeau: 'bonnet', chapC: '#2f6fb5', objet: 'sac', sacC: '#c8393b', barbe: true, cheveux: '#5a3a24', peau: '#9a6a42' },
    smoking: { haut: '#1c1a24', bas: '#14121a', col: '#ffffff', cravate: '#14121a', cheveux: '#3a2518' },
    paparazzi: { haut: '#566246', bas: '#3a3f4c', objet: 'camera', chapeau: 'casquette', chapC: '#333' },
    plagiste: { haut: '#f4f4f0', motif: '#2f6fb5', bas: '#e8e0c8', chapeau: 'paille' },
    // Normandie
    // le jardin des oiseaux de Saint-Georges (vie_ouest.js : jardin_dame, jardin_poule) : la dame blonde au carre, chapeau de paille et
    // bouquet ; l'enfant blond (petit : dessine a sa taille d'enfant) en bottes de caoutchouc
    dame_jardin: { haut: '#5f8fd0', bas: '#5f8fd0', jupe: true, col: '#f8f4ea', chapeau: 'paille_carre', cheveux: '#ecc96a', peau: '#f7d7bc', chaus: '#a8683a', objet: 'fleurs' },
    enfant_blond: { petit: true, haut: '#e8452c', bas: '#3a5f9a', chaus: '#3d7a34', chapeau: 'blondinet', cheveux: '#f0d27a', peau: '#f7d7bc', ceinture: false },
    paysan: { haut: '#2f6fb5', bas: '#2f6fb5', chapeau: 'casquette', chapC: '#2a5a2a', chaus: '#3d6b2f', barbe: true, cheveux: '#555' },
    pelerin: { haut: '#7a5230', bas: '#55381f', chapeau: 'bob', objet: 'parapluie' },
    guitariste: { haut: '#7a8a6a', bas: '#3a4258', chapeau: 'longs', cheveux: '#9a6a3a' },
    // Montagne
    skieur: { haut: '#d9334b', bas: '#22293a', chapeau: 'bonnet', chapC: '#f0c93a' },
    randonneur: { haut: '#3f8f4f', bas: '#7a6a4c', chapeau: 'bob' },
    enduro: { haut: '#f28c28', bas: '#22293a', chapeau: 'casque', chapC: '#f28c28' },
    // Afrique du Sud
    ranger: { haut: '#8a7a4c', bas: '#6b5f3c', chapeau: 'bob', peau: '#7a4d2e' },
    capetonien: { haut: '#2a9d8f', bas: '#3a3f4c', peau: '#7a4d2e', cheveux: '#111' },
    capetonienne: { haut: '#e9c46a', motif: '#c8393b', bas: '#c8393b', jupe: true, peau: '#5a361f', chapeau: 'chignon', cheveux: '#111' },
    // Egypte : les heros de la serie Salade Loukoum
    salade: { boite: '#3fae49', haut: '#f4f4f0', bas: '#1f7a3a', chaus: '#14121a' },
    loukoum: { boite: '#e262b5', haut: '#f4f4f0', bas: '#c2288f', chaus: '#14121a' },
    cairote: { haut: '#d8cfb8', bas: '#d8cfb8', peau: '#b57f54', chapeau: 'chech', chapC: '#b8b09a', jupe: true },
    // Hawaii / Pacifique
    surfeur: { haut: '#f28c6a', motif: '#fff', bas: '#2a7ab5', peau: '#b57f54', chapeau: 'longs', cheveux: '#c9a24a' },
    hawaienne: { haut: '#e262b5', bas: '#3fae49', jupe: true, peau: '#b57f54', chapeau: 'longs', cheveux: '#111' },
    plongeur: { haut: '#1f6f8c', bas: '#1a4a66', chapeau: 'casque', chapC: '#1a4a66', objet: 'palmes', motif: '#ff8a3c' },
    caledonien: { haut: '#3f8f4f', motif: '#f0c93a', bas: '#3a3f4c', peau: '#5a361f', cheveux: '#111' },
    caledonienne: { haut: '#e76f51', motif: '#fff', bas: '#e76f51', jupe: true, peau: '#5a361f', chapeau: 'chignon', cheveux: '#111' },
    // Irlande
    irlandais: { haut: '#2f7a4a', bas: '#55381f', chapeau: 'casquette', chapC: '#55381f', cheveux: '#b5562a', barbe: true },
    // Med
    marin: { haut: '#f4f4f0', motif: '#2f6fb5', bas: '#22334a', chapeau: 'bob' },
    biologiste: { haut: '#f28c28', bas: '#22334a', chapeau: 'casquette', chapC: '#2b2d3c', objet: 'camera' },
    // Reunion
    reunionnais: { haut: '#f0c93a', bas: '#3a3f4c', peau: '#b57f54', chapeau: 'paille' },
    coureur: { haut: '#3fae49', motif: '#fff', bas: '#111', chapeau: 'casquette', chapC: '#fff', peau: '#b57f54' },
    // le coureur deguise en panda du Pandathlon (Max, 04/11/2026 : « le panda qui court n'est pas bien anime ») : il court comme les autres
    panda_coureur: { tete: 'panda', haut: '#f4f4f0', bras: '#17151f', bas: '#17151f', chaus: '#17151f', objet: 'dossard', ceinture: false, peau: '#f4f4f0' },
    // Puy du Fou
    gladiateur: { haut: '#b5854a', bas: '#7a2a20', chapeau: 'casque', chapC: '#c0b080', peau: '#dcab7e', objet: 'lance' },
    legionnaire: { haut: '#b22a2a', bas: '#b22a2a', chapeau: 'romain', peau: '#dcab7e', objet: 'lance', jupe: true },
    // Stade
    supporter: { haut: '#1f4fa8', bas: '#f4f4f0', peau: '#e8b98f', chapeau: 'bonnet', chapC: '#c8393b', objet: 'drapeau' },
    joueur: { haut: '#1f4fa8', bas: '#f4f4f0', chaus: '#c8393b', cheveux: '#222' },
    // Tunisie
    // ---- Les nouveaux lieux (02/11/2026) ----
    jongleur: { haut: '#e8452c', bas: '#2a3a8a', motif: '#ffd23c', objet: 'balles', peau: '#7f5232', cheveux: '#17151f' },
    jongleuse: { haut: '#2f8ad0', bas: '#f0c040', jupe: true, objet: 'balles', chapeau: 'longs', peau: '#9a6a42', cheveux: '#17151f' },
    malgache: { haut: '#f0ece0', bas: '#7a5a3a', chapeau: 'paille', peau: '#9a6a42', cheveux: '#17151f' },
    malgache2: { haut: '#e8452c', bas: '#f0ece0', jupe: true, chapeau: 'paille', peau: '#7f5232', cheveux: '#17151f', objet: 'sac', sacC: '#d8b060' },
    bedouin: { haut: '#2a3a7a', bas: '#2a3a7a', longue: true, chapeau: 'chech', chapC: '#1a2458', peau: '#8a5a3a', cheveux: '#17151f', barbe: true },
    bedouine: { haut: '#7a2a3a', bas: '#7a2a3a', longue: true, chapeau: 'chech', chapC: '#c87a2a', peau: '#9a6a42', cheveux: '#17151f' },
    nigerien: { haut: '#e8a33a', bas: '#e8a33a', longue: true, motif: '#2a7a4a', chapeau: 'bonnet', chapC: '#f0ece0', peau: '#5a3a26', cheveux: '#17151f' },
    marocain: { haut: '#8a6a4a', bas: '#8a6a4a', longue: true, chapeau: 'capuche', chapC: '#8a6a4a', peau: '#c68f5e', cheveux: '#222', barbe: true },
    marocaine: { haut: '#c84a6a', bas: '#c84a6a', longue: true, chapeau: 'fichu', chapC: '#e8c040', peau: '#c68f5e', cheveux: '#222' },
    enceinte: { haut: '#3a9a8a', bas: '#3a9a8a', longue: true, ventre: true, chapeau: 'longs', peau: '#e0b083', cheveux: '#3a2518' },
    enceinte2: { haut: '#8a4ac8', bas: '#8a4ac8', longue: true, ventre: true, chapeau: 'fichu', chapC: '#f4c84a', peau: '#c68f5e', cheveux: '#222' },
    russe: { haut: '#3a3a4a', bas: '#2a2a34', chapeau: 'chapka', chapC: '#6a4a32', peau: '#f2c9a4' },
    russe2: { haut: '#c8393b', bas: '#2a3350', chapeau: 'bonnet', chapC: '#2f6fb5', peau: '#f7d7bc' },
    babouchka: { haut: '#6a2a3a', bas: '#4a3a5a', jupe: true, chapeau: 'fichu', chapC: '#e8452c', peau: '#f2c9a4', objet: 'sac', sacC: '#3a2a20' },
    londonien: { haut: '#2a2a34', bas: '#2a2a34', cravate: '#c8393b', col: '#f0ece0', chapeau: 'melon', objet: 'parapluie' },
    londonienne: { haut: '#c8a86a', bas: '#2a3350', chapeau: 'longs', cheveux: '#c86a2c', objet: 'parapluie' },
    garde_royal: { haut: '#c8191f', bas: '#1a1a24', motif: '#f0ece0', chapeau: 'oursin', peau: '#f2c9a4' },
    comedien_lion: { haut: '#d8a030', bas: '#a86a1a', longue: true, motif: '#f0c040', chapeau: 'criniere', chapC: '#b85a1a', peau: '#9a6a42' },
    comedienne_girafe: { haut: '#f0c060', bas: '#8a5a2a', motif: '#8a5a2a', chapeau: 'girafe', peau: '#7f5232', cheveux: '#17151f' },
    comedien_oiseau: { haut: '#2f6fb5', bas: '#f0ece0', chapeau: 'oiseau', chapC: '#2f6fb5', peau: '#9a6a42' },
    montrealais: { haut: '#c8393b', bas: '#2a3350', motif: '#2a2a34', chapeau: 'bonnet', chapC: '#2f6fb5', barbe: true, cheveux: '#6a4426' },
    montrealaise: { haut: '#3a7a5a', bas: '#2a2a34', chapeau: 'bonnet', chapC: '#e8c040', cheveux: '#c8a040' },
    melbournien: { haut: '#2a2a34', bas: '#3a4a6a', chapeau: 'casquette', chapC: '#3f8f4f' },
    campeur: { haut: '#e8b84a', bas: '#3a6a8a', chapeau: 'bob' },
    campeuse: { haut: '#e76f51', bas: '#f0ece0', jupe: true, chapeau: 'longs', cheveux: '#c8a040' },
    berbere: { haut: '#e8dcc0', bas: '#e8dcc0', jupe: true, peau: '#b57f54', chapeau: 'chech', chapC: '#2a5a8a', barbe: true, cheveux: '#222' },
    enfant: { haut: '#2b2d3c', bas: '#3a3f4c', peau: '#b57f54', cheveux: '#111' },
    equipe: { haut: '#d8c9a8', bas: '#8a7a5c', chapeau: 'chech', chapC: '#d8c9a8', objet: 'camera' },
    jawa: { haut: '#6b4a2c', bas: '#6b4a2c', jupe: true, peau: '#14121a', chapeau: 'chech', chapC: '#6b4a2c' },
    moine: { haut: '#d8d8c8', bas: '#d8d8c8', jupe: true, chapeau: 'chech', chapC: '#b5b5a4', peau: '#dcab7e' },
  };
})();
