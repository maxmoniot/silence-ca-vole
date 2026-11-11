/* Le decor : c'est le coeur du jeu.
   Chaque rangee de pixels du sol defile a sa propre vitesse (vraie perspective au sol, comme une camera qui passe),
   le relief glisse tres lentement derriere, et des objets sont poses a differentes distances, leur taille et leur
   vitesse dependant de la rangee ou ils touchent le sol. */
'use strict';
(function () {
  const D = G.Decor = {};
  const { PW, PH, MARGE } = G;
  const PER = PW * 2;
  let META = null, SPR = null;

  D.init = async () => {
    META = await fetch('assets/plans/_meta.json').then(r => r.json());
    SPR = await fetch('assets/sprites/_meta.json').then(r => r.json()).catch(() => ({}));
    D.META = META; D.SPR = SPR;
  };

  /* ---- Sprites : 3 tailles, teinte de brume en cache ---- */
  const sprites = new Map();
  // la lumiere du decor qu'on prepare ou qu'on joue : un sprite refait (ecl dans _meta.json) la prend en se chargeant
  D.ambActive = null;
  D.spr = (id, t = 'l', amb = D.ambActive) => {
    const ecl = !!(SPR && SPR[id] && SPR[id].ecl && G.AMB && G.AMB[amb]);
    const k = id + t + (ecl ? '|' + amb : '');
    let s = sprites.get(k);
    if (s) return s;
    s = { img: null, w: 0, h: 0, ok: false, cle: k };
    sprites.set(k, s);
    // un sprite anime : ses images <nom>_f0, _f1... se jouent seules ; tant qu'elles ne sont pas la, on garde l'image de base
    if (SPR && SPR[id + '_f0']) {
      const fr = [];
      for (let n = 0; SPR[id + '_f' + n]; n++) fr.push(D.spr(id + '_f' + n, t, amb));
      let base = null;
      s.anime = true;
      // sa cadence (ips dans _meta.json) : un dromadaire marche plus lentement que tournent les roues d'un buggy
      const ips = SPR[id + '_f0'].ips || 12;
      Object.defineProperty(s, 'img', { get() { const f = fr[(G.t * ips | 0) % fr.length]; return f.ok ? f.img : base; }, set(v) { base = v; }, configurable: true });
    }
    const file = id + (t === 'l' ? '' : '_' + t);
    const dim = SPR && SPR[id] && SPR[id][t];
    if (dim) { s.w = dim[0] / G.S; s.h = dim[1] / G.S; }
    G.img('assets/sprites/' + file + '.png').then(async i => { s.img = ecl ? await D.eclairerPas(i, amb) : i; s.nw = i.width; s.nh = i.height; s.w = i.width / G.S; s.h = i.height / G.S; s.ok = true; }).catch(() => { });
    return s;
  };

  /* ---- La lumiere du lieu sur un sprite refait, comme sur les plans : les clairs prennent la couleur du soleil, les sombres celle de l'ombre,
     le trait noir devient un trait colore, le bord tourne vers le soleil recoit un liseret, l'autre bord s'assombrit. Pixel par pixel, sans lissage. */
  const melange = (p, i, c, k) => { p[i] += (c[0] - p[i]) * k; p[i + 1] += (c[1] - p[i + 1]) * k; p[i + 2] += (c[2] - p[i + 2]) * k; };
  /* Le travail est fait ligne par ligne (eclairage) : D.eclairer d'un seul tenant, D.eclairerPas par petits morceaux, quelques
     millisecondes par image (10/11/2026 : un grand sprite eclaire en chargeant figeait le jeu 55 ms sur un telephone lent). Memes
     pixels a l'arrivee (tests/telephone_lent.js). */
  function eclairage(img, amb) {
    const A = G.AMB[amb], w = img.width, h = img.height, c = G.mk(w, h);
    c.x.drawImage(img, 0, 0);
    const id = c.x.getImageData(0, 0, w, h), src = id.data, p = new Float32Array(src);
    const lum = G.hex(A.lum), omb = G.hex(A.ombre), lis = G.hex(A.lisere || A.lum), nuit = A.nuit ? 1 : 0;
    // l'ombre du lieu, assombrie : le trait et les noirs gardent leur force meme sous une ombre claire de midi
    const lo = (omb[0] * .3 + omb[1] * .59 + omb[2] * .11) / 255, k = Math.min(1, .32 / Math.max(lo, .01)), noir = omb.map(v => v * k);
    const Lx = .6 * (A.sens || 1), Ly = -.8;
    const plein = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
    let y = 0;
    return {
      // n lignes de plus ; rend vrai quand toutes sont faites
      lignes(n) {
        const fin = Math.min(h, y + n);
        for (; y < fin; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (!src[i + 3]) continue;
          const l = (src[i] * .3 + src[i + 1] * .59 + src[i + 2] * .11) / 255;
          // la normale du bord : la direction du vide le plus proche
          let nx = 0, ny = 0, bord = 9;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            if ((dx || dy) && !plein(x + dx, y + dy)) { const d2 = dx * dx + dy * dy; nx += dx / d2; ny += dy / d2; bord = Math.min(bord, Math.sqrt(d2)); }
          }
          // la teinte du lieu : la lumiere dans les clairs, l'ombre dans les sombres
          p[i] = p[i] * (1 - .26 * l) + p[i] * lum[0] / 255 * .26 * l;
          p[i + 1] = p[i + 1] * (1 - .26 * l) + p[i + 1] * lum[1] / 255 * .26 * l;
          p[i + 2] = p[i + 2] * (1 - .26 * l) + p[i + 2] * lum[2] / 255 * .26 * l;
          melange(p, i, noir, .2 * (1 - l) + nuit * .3);
          if (l < .2) { melange(p, i, noir, .3); continue; }
          if (bord <= 2.3) {
            const n = Math.hypot(nx, ny) || 1, dot = (nx * Lx + ny * Ly) / n;
            if (dot > .3) melange(p, i, lis, nuit ? .25 : .42);
            else if (dot < -.3) melange(p, i, noir, .22);
          }
        }
        return y >= h;
      },
      finir() {
        for (let i = 0; i < p.length; i++) src[i] = p[i];
        c.x.putImageData(id, 0, 0);
        return c;
      },
    };
  }
  D.eclairer = (img, amb) => { const e = eclairage(img, amb); e.lignes(img.height); return e.finir(); };
  // dans la file des travaux de fond (G.travail, base.js) : la preparation, puis 6 lignes a la fois, puis l'image
  D.eclairerPas = (img, amb) => {
    let e = null;
    return G.travail(() => { if (!e) { e = eclairage(img, amb); return; } if (e.lignes(6)) return e.finir(); });
  };

  /* ---- L'ombre au sol d'un objet pose : une tache plate et pleine, en pixels, de la couleur de l'ombre du lieu ---- */
  D.ombreSol = (x, cx, y, w, amb = D.ambActive) => {
    const A = G.AMB && G.AMB[amb], c = A ? G.hex(A.ombre) : [40, 30, 40];
    x.fillStyle = G.rgb(c, .34);
    const u = 1 / G.S, l0 = Math.round(w * G.S);
    x.fillRect(Math.round((cx - w / 2) * G.S) * u, Math.round(y * G.S) * u, l0 * u, u);
    const l1 = Math.round(l0 * .82);
    x.fillRect(Math.round((cx - l1 / G.S / 2) * G.S) * u, Math.round(y * G.S + 1) * u, l1 * u, u);
  };
  D.existe = id => !!(SPR && SPR[id]);
  // le nombre d'images d'animation d'un sprite (0 s'il est fixe)
  D.nbImages = id => { let n = 0; while (SPR && SPR[id + '_f' + n]) n++; return n; };
  /* La foulee d'un animal dessine par le code (le cheval au galop, 04/11/2026) : la distance qu'il parcourt au sol pendant un cycle
     de ses images, en unites de jeu, a la taille t. Ses images avancent avec la distance parcourue : un sabot pose ne glisse pas. */
  D.foulee = (id, t = 'l') => {
    const m = SPR && SPR[id];
    if (!m || !m.foulee) return 0;
    const dl = m.l, dt = t === 'l' ? m.l : m['_' + t];
    return m.foulee * (dt && dl ? dt[0] / dl[0] : 1) / G.S;
  };
  /* L'image d'un animal qui marche ou galope, pour un figurant ou un passant (05/11/2026 : le cheval de la saynete d'Irlande, immobile,
     galopait sur place) : un galopeur dessine par le code (D.foulee) change d'image avec la distance qu'il parcourt au sol ; s'il ne se
     deplace pas et qu'il a une pose debout (<id>_debout), il la prend. Les autres sprites gardent leur cadence propre. Rend un sprite. */
  D.sprAllure = (id, t, dist, immobile) => {
    const fo = D.foulee(id, t);
    if (!fo) return D.spr(id, t);
    if (immobile && SPR[id + '_debout']) return D.spr(id + '_debout', t);
    const n = D.nbImages(id);
    if (!n) return D.spr(id, t);
    const k = ((Math.floor((dist || 0) / (fo / n)) % n) + n) % n;
    return D.spr(id + '_f' + k, t);
  };
  D.prechargerSprites = ids => Promise.all(ids.filter(D.existe).flatMap(id => ['l', 'm', 's'].map(t => {
    D.spr(id, t);
    return G.img('assets/sprites/' + id + (t === 'l' ? '' : '_' + t) + '.png').catch(() => null);
  })));
  // une copie par image source : un sprite anime et eclaire (son image est une toile, sans adresse) gardait sa premiere image,
  // et le cheval au loin, dans la brume, restait fige (Max, 03/11/2026 : « le cheval noir »)
  let teintes = new WeakMap(), nbTeintes = 0;
  D.teinte = (sp, col, a) => {
    if (!sp.ok) return null;
    const src = sp.img;
    if (!src) return null;
    let m = teintes.get(src);
    if (!m) teintes.set(src, m = new Map());
    const k = col + '|' + a;
    let c = m.get(k);
    if (c) return c;
    c = G.mk(src.width, src.height);
    c.x.drawImage(src, 0, 0);
    c.x.globalCompositeOperation = 'source-atop';
    c.x.fillStyle = G.rgb(col, a);
    c.x.fillRect(0, 0, src.width, src.height);
    if (++nbTeintes > 1200) { teintes = new WeakMap(); nbTeintes = 0; }
    m.set(k, c);
    return c;
  };

  /* ---- Preparation d'un decor : chaque plan est une image qui boucle sur sa largeur ----
     Chaque plan est decode d'avance, en arriere-plan (createImageBitmap) : sinon Chrome le decode a sa premiere apparition, au milieu
     d'une image du jeu (10/11/2026 : 80 a 140 ms d'a-coup a chaque nouveau decor sur un telephone lent ; 18 plans dessines pour la
     premiere fois en 12 ms au lieu de 143). Un decor oublie (D.liberer) rend aussitot cette memoire. */
  D.DECODE_AVANCE = true;
  D.charger = async (id, longueur) => {
    const def = G.SCENES[id];
    const pl = (def && def.plaque) || id;
    const m = META[pl];
    if (!m) throw new Error('decor absent ' + id);
    const type = (def && def.type) || m.type;
    const sc = { id, m, def, pl, type, x0: 0, len: longueur || 5000, hy: m.hy, props: [], fg: [], fx: [], plans: [] };
    for (let i = 0; i < m.plans.length; i++) {
      let img = await G.img('assets/plans/' + pl + '/' + i + '.png');
      if (D.DECODE_AVANCE && typeof createImageBitmap === 'function') { try { img = await createImageBitmap(img); } catch (e) { /* l'image telle quelle */ } }
      const mp = m.plans[i];
      // nw : largeur en pixels (bouclage) ; y et h : en unites de jeu
      sc.plans.push(Object.assign({ img, n: i, nw: mp.w, nh: mp.h }, mp, { y: mp.y / G.S, h: mp.h / G.S }));
      if (i % 2) await new Promise(r => setTimeout(r, 0));
    }
    if (def && def.enseignes && sc.plans[def.enseignesPlan]) {
      // panneaux ecrits au pixel, pour avoir un vrai texte
      const pm = sc.plans[def.enseignesPlan];
      const c = G.mk(pm.nw, pm.nh);
      c.x.drawImage(pm.img, 0, 0);
      for (const [ex, ey, t] of def.enseignes) G.txt(c.x, t, ex * G.S, ey * G.S, '#fff', { al: .5, sc: 2 });
      pm.img = c;
    }
    D.loi(sc);
    await D.peupler(sc);
    G.Lumiere.preparer(sc);
    return sc;
  };

  /* Le dessus du terrain d'un plan, lu dans son image et garde : ce qui marche au loin suit le relief, rien ne flotte.
     D.crete(sc, i, sx) : l'ordonnee du sol du plan i a l'abscisse sx de l'ecran (en unites de jeu). */
  const PAS_CRETE = 4;
  function creteDe(p) {
    if (p.crete) return p.crete;
    const w = p.img.width, h = p.img.height, c = G.mk(w, h);
    c.x.drawImage(p.img, 0, 0);
    let px = null;
    try { px = c.x.getImageData(0, 0, w, h).data; } catch (e) { /* illisible : pas de relief */ }
    const n = Math.ceil(w / PAS_CRETE), t = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const X = i * PAS_CRETE;
      let y = 0;
      if (px) while (y < h && px[(y * w + X) * 4 + 3] < 128) y++;
      t[i] = y;
    }
    p.crete = t;
    return t;
  }
  D.crete = (sc, i, sx, d) => {
    const p = sc.plans[i];
    if (!p) return G.SOLF;
    const dd = d === undefined ? G.Jeu.w().x - sc.x0 : d;
    const X = (((sx + dd * p.f) * G.S % p.nw) + p.nw) % p.nw;
    // le plan garde le relief de son terrain seul, sans ses arbres ni ses rochers
    if (p.solc) return p.y + p.solc[Math.min(p.solc.length - 1, X / 16 | 0)] / G.S;
    const t = creteDe(p);
    return p.y + t[Math.min(t.length - 1, X / PAS_CRETE | 0)] / G.S;
  };
  /* Le plan de terrain le plus proche derriere la profondeur voulue : pour y poser un acteur */
  D.planTerre = (sc, fMin = .07, fMax = .7) => {
    let best = -1;
    sc.plans.forEach((p, i) => { if (i > 0 && !p.devant && !p.pasTerre && !p.wob && p.k && p.f >= fMin && p.f <= fMax) best = best < 0 ? i : best; });
    return best;
  };
  D.planMer = sc => sc.plans.findIndex(p => p.wob >= 1);
  /* La taille d'un acteur selon la profondeur de son plan : une seule regle, plus de geants au loin */
  D.echPlan = f => f >= .6 ? 1 : f >= .4 ? .92 : f >= .2 ? .68 : f >= .1 ? .5 : f >= .05 ? .38 : .28;

  /* Un decor qu'on quitte : on oublie ses images pour ne pas remplir la memoire */
  D.liberer = sc => {
    if (!sc || !sc.pl) return;
    sc.m.plans.forEach((_, i) => G.oublier('assets/plans/' + sc.pl + '/' + i + '.png'));
    // les plans decodes d'avance sont a ce decor seul : leur memoire est rendue tout de suite
    for (const p of sc.plans || []) if (p.img && typeof p.img.close === 'function' && typeof ImageBitmap !== 'undefined' && p.img instanceof ImageBitmap) p.img.close();
    sc.plans = [];
  };

  D.loi = sc => {
    const { type, def, m } = sc;
    // vitesse du sol a chaque rangee, pour les effets et le jeu
    const rf = sc.rf = new Float32Array(PH);
    for (const p of m.plans) {
      for (let r = Math.max(0, Math.round(p.y / G.S) + MARGE); r < PH; r++) rf[r] = p.f;
    }
    sc.lf = 0.03; sc.fh = 0.03;
  };

  /* Objets du decor a differentes profondeurs */
  D.peupler = async sc => {
    const def = sc.def || {};
    const hy = sc.hy, bas = PH - MARGE;
    const ids = new Set();
    const hz = sc.m.c_hz || [150, 170, 190];
    const liste = [];
    for (const pr of liste) {
      if (!D.existe(pr.s)) continue;
      ids.add(pr.s);
      const n = Math.round((pr.n || 8) * sc.len / 5000);
      const [a, b] = pr.b || [0.15, 0.85];
      for (let i = 0; i < n; i++) {
        const t = G.rnd(a, b);
        const r = Math.floor(hy + (bas - hy) * t);
        const f = sc.rf[Math.min(r, PH - 1)];
        const tag = t > 0.62 ? 'l' : t > 0.3 ? 'm' : 's';
        // etale la position pour qu'il y en ait tout au long du decor, a n'importe quelle profondeur
        const X = G.rnd(-40, sc.len * f + G.VW + 80);
        sc.props.push({ s: pr.s, tag, r: r - MARGE, f, X, flip: !pr.noflip && Math.random() < 0.3, haze: pr.h !== undefined ? pr.h : (1 - t) * 0.62, sw: pr.sw || 0, ph: G.rnd(6), base: pr.dy || 0 });
      }
    }
    sc.props.sort((a, b) => a.r - b.r);
    for (const pr of []) {
      if (!D.existe(pr.s)) continue;
      ids.add(pr.s);
      const n = Math.round((pr.n || 4) * sc.len / 5000);
      for (let i = 0; i < n; i++) {
        sc.fg.push({ s: pr.s, X: G.rnd(G.VW, sc.len * 1.4 + G.VW), f: pr.f || 1.45, zoom: pr.z || 1, sombre: pr.c || 0.55, up: pr.up || 0, dy: pr.dy || 0, flip: Math.random() < 0.5 });
      }
    }
    sc.fxs = await D.creerFxPas(sc);
    await D.prechargerSprites([...ids]);
    sc.teinte = sc.m.c_hz;
  };

  /* ---- Rendu ---- */
  /* Le ressac : une langue d'ecume qui monte et descend sur le sable */
  function ressac(x, p, dy, off, T) {
    const k = Math.sin(T * .9) * .5 + .5;
    const W = G.VW;
    for (let i = 0; i < W; i += 2) {
      const X = i + off;
      const b = Math.sin(X * .021) * 2.4 + Math.sin(X * .07 + T * .6) * 1.4;
      const yy = dy + b + 3 + k * 6;
      x.fillStyle = 'rgba(255,255,255,.92)'; x.fillRect(i, yy | 0, 2, 1);
      x.fillStyle = 'rgba(190,240,250,.4)'; x.fillRect(i, (yy | 0) - 3, 2, 3);
      if (Math.sin(X * .13 + T) > .2) { x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(i, (yy | 0) + 1 + (k * 2 | 0), 2, 1); }
    }
  }

  /* Pose une bande d'un plan qui boucle. off, sy, sh : en pixels de l'image ; dy : en unites de jeu */
  function tranche(x, img, per, off, sy, sh, dy, W) {
    off = ((off % per) + per) % per;
    const S = G.S, WN = Math.ceil(W * S) + 1;
    let dx = 0, o = off;
    while (dx < WN) {
      const n = Math.min(WN - dx, per - o);
      x.drawImage(img, o, sy, n, sh, dx / S, dy, n / S, sh / S);
      dx += n; o = 0;
    }
  }

  /* Les vivants d'un plan (betes, algues, drapeaux) : construire_plans les note au lieu de les peindre dans l'image, ils se dessinent
     ici avec leurs images d'animation. Ceux qui marchent avancent vraiment, leurs pattes au rythme de leurs pas (jamais sur place),
     en suivant le relief de leur plan ; les algues et les drapeaux ondulent sur place (Max, 03/11/2026 : « des sprites encore figes »). */
  const VIT_VIF = { cheval: 7, ane: 3.5, vache: 2.5, mouton: 2.5, oie: 2.5, manchot: 2, bouquetin: 3.5, dromadaire: 4, kangourou: 7, marmotte: 3, babouin: 3.5 };
  const PAS_VIF = { cheval: .26, kangourou: .3 };
  function solImage(p, X) {
    // le haut du terrain, en pixels depuis le haut de l'image du plan
    if (p.solc) return p.solc[Math.min(p.solc.length - 1, Math.max(0, X / 16 | 0))];
    const t = creteDe(p);
    return t[Math.min(t.length - 1, Math.max(0, X / PAS_CRETE | 0))];
  }
  function tagVif(id, h) {
    let best = 'l', e = 1e9;
    for (const t of ['l', 'm', 's']) {
      const dim = SPR && SPR[id] && SPR[id][t === 'l' ? 'l' : '_' + t];
      if (dim && Math.abs(dim[1] / G.S - h) < e) { e = Math.abs(dim[1] / G.S - h); best = t; }
    }
    return best;
  }
  function vifs(x, sc, p, d, decale) {
    if (!p.vifs || !p.vifs.length) return;
    const per = p.nw / G.S;
    if (!p._vifs) p._vifs = p.vifs.map(([s, X, yb, h, place], k) => {
      const v = { s, X: X / G.S, h: h / G.S, place, tag: tagVif(s, h / G.S), sens: k % 3 ? 1 : -1, dist: k * 7.3, vit: place ? 0 : (VIT_VIF[s] || 2.5) * (.8 + (k * 13 % 7) / 15) };
      // un galopeur dessine par le code : sa vitesse vient de sa foulee (1,7 a 2,3 foulees par seconde, Max 04/11/2026 : « celui
      // au second plan est au ralenti »), et ses images changent tous les huitiemes de foulee
      const fo = place ? 0 : D.foulee(s, v.tag);
      if (fo) { const nb = D.nbImages(s) || 8; v.pas = fo / nb; v.vit = fo * (1.7 + (k * 13 % 7) / 10); }
      // sa hauteur sous la crete (les betes eparpillees dans un pre) : gardee en marchant
      v.sous = yb - p.y * G.S - solImage(p, X);
      return v;
    });
    const dt = Math.min(.05, G.dt || 0), hz = sc.m.c_hz, brume = Math.round(Math.max(0, .34 * (1 - p.f)) * 10) / 10;
    for (const v of p._vifs) {
      v.X = (((v.X + v.vit * v.sens * dt) % per) + per) % per;
      v.dist += v.vit * dt;
      const n = D.nbImages(v.s);
      const k = !n ? -1 : v.place ? (G.t * ((SPR[v.s + '_f0'] && SPR[v.s + '_f0'].ips) || 8) | 0) % n : (v.dist / (v.pas || Math.max(1, v.h * (PAS_VIF[v.s] || .17))) | 0) % n;
      const sp = D.spr(k < 0 ? v.s : v.s + '_f' + k, v.tag);
      if (!sp.ok) continue;
      const img = hz && brume > 0 ? D.teinte(sp, hz, brume) : sp.img;
      if (!img) continue;
      const Xp = ((v.X * G.S) % p.nw + p.nw) % p.nw;
      const pied = p.y + (solImage(p, Xp + sp.w * G.S / 2) + v.sous) / G.S + decale;
      let sx = (((v.X - d * p.f) % per) + per) % per;
      for (const ox of [sx, sx - per]) {
        if (ox > G.VW + 4 || ox < -sp.w - 4) continue;
        const ix = Math.round(ox), iy = Math.round(pied - sp.h);
        if (v.sens < 0) { x.save(); x.scale(-1, 1); x.drawImage(img, -ix - sp.w, iy); x.restore(); } else x.drawImage(img, ix, iy);
      }
    }
  }

  D.fond = (x, sc, wx, camY, T) => {
    const W = G.VW;
    const d = wx - sc.x0;
    let n = 0;
    for (const p of sc.plans) {
      if (p.devant) continue;
      const f = p.f;
      const decale = camY * Math.max(.1, Math.min(1, f * 1.1));
      const dy = p.y + decale;
      let off = d * f + (p.v ? T * p.v : 0);
      const offN = off * G.S;
      if (p.wob && !(G.PERF_BAS && p.wob < 1)) {
        // l'eau ondule en fines tranches ; la vegetation frissonne ; l'air chaud tremble
        const ampl = (p.wob >= 1 ? 0.5 + 2.2 * Math.min(1, f * 2.5) : p.wob * (1.6 + 2 * f)) * G.S;
        const vitesse = p.wob >= 1 ? 2.1 : 1.3, pas = p.wob >= 1 ? 3 : 4;
        const nh = Math.min(p.nh, Math.ceil((G.VH + 8 - dy) * G.S));
        for (let q = 0; q < nh; q += pas) {
          const o2 = Math.floor(offN + Math.sin((p.y + q / G.S) * (p.wob >= 1 ? .42 : .16) + T * vitesse) * ampl);
          tranche(x, p.img, p.nw, o2, q, pas, dy + q / G.S, W);
        }
      } else {
        tranche(x, p.img, p.nw, Math.floor(offN), 0, p.nh, dy, W);
      }
      if (n === 1 || (n === 0 && sc.plans.length < 2)) { D.fxDessine(x, sc, 'ciel', d, camY, T); G.Lumiere.dansLeCiel(x, sc, d); }
      if (p.ressac) ressac(x, p, dy, off, T);
      vifs(x, sc, p, d, decale);
      G.Lumiere.passants(x, sc, n, camY, T);
      if (sc.def.quai === n && G.Rendu.rameQuai) G.Rendu.rameQuai(x, sc, camY);
      if (sc.def.sujet && sc.def.sujet.mode === 'plan' && sc.def.sujet.plan === n && G.Rendu.sujetPlan) G.Rendu.sujetPlan(x, sc, camY);
      // ce qui vit a cette profondeur : le plan suivant passera devant
      for (const e of sc.fxs) if (e.plan === n) e.draw(x, d, camY * Math.max(.1, Math.min(1, f * 1.1)), T);
      n++;
    }
    G.Lumiere.ombresNuages(x, sc);
    G.Lumiere.voileMeteo(x, sc);
    D.fxDessine(x, sc, 'sol', d, camY, T);
    // objets du decor, du plus loin au plus pres
    const hz = sc.teinte;
    for (const p of sc.props) {
      const sx = p.X - d * p.f;
      const sp = D.spr(p.s, p.tag);
      if (!sp.ok || sx < -sp.w - 4 || sx > W + 4) continue;
      const img = p.haze > 0.02 ? D.teinte(sp, hz, Math.round(p.haze * 10) / 10) : sp.img;
      if (!img) continue;
      const py = p.r - sp.h + p.base + Math.round(camY * Math.max(.18, p.f));
      const ix = Math.round(sx);
      if (p.flip) { x.save(); x.scale(-1, 1); x.drawImage(img, -ix - sp.w, py); x.restore(); } else x.drawImage(img, ix, py);
    }
  };

  /* Premier plan : tout pres de la camera, sombre, il file devant tout le monde */
  D.devant = (x, sc, wx, camY, T) => {
    const d = wx - sc.x0;
    for (const p of sc.plans) {
      if (!p.devant) continue;
      tranche(x, p.img, p.nw, Math.floor(d * p.f * G.S), 0, p.nh, p.y + camY * 1.5, G.VW);
    }
  };

  /* ---- Effets animes des decors ---- */
  const FX = D.FX = {};
  D.creerFx = sc => {
    const out = [], avant = D.ambActive;
    // les sprites des effets prennent la lumiere de leur decor, meme prepare pendant qu'on en joue un autre
    D.ambActive = sc.m.amb;
    for (const nom of (sc.def && sc.def.fx) || []) {
      const [n, arg] = nom.split(':');
      if (FX[n]) { const e = FX[n](sc, arg); e.nom = n; out.push(e); }
    }
    D.ambActive = avant;
    // le decor reagit au drone, partout
    for (const e of G.Interact(sc)) out.push(e);
    return out;
  };
  /* La meme chose quand le decor se prepare pendant qu'on joue : on rend la main au jeu des qu'on a travaille 6 ms d'affilee (10/11/2026 :
     d'un seul tenant, les acteurs d'un decor figeaient l'image jusqu'a 180 ms sur un telephone lent). La lumiere du decor qu'on joue est
     remise pendant chaque pause : ses sprites ne doivent pas prendre celle du decor qu'on prepare. */
  D.creerFxPas = async sc => {
    const out = [], avant = D.ambActive;
    let t0 = performance.now();
    D.ambActive = sc.m.amb;
    for (const nom of (sc.def && sc.def.fx) || []) {
      const [n, arg] = nom.split(':');
      if (FX[n]) { const e = FX[n](sc, arg); e.nom = n; out.push(e); }
      if (performance.now() - t0 > 6) { D.ambActive = avant; await new Promise(r => setTimeout(r, 0)); D.ambActive = sc.m.amb; t0 = performance.now(); }
    }
    D.ambActive = avant;
    for (const e of G.Interact(sc)) out.push(e);
    return out;
  };
  D.fxDessine = (x, sc, couche, d, camY, T) => {
    for (const e of sc.fxs) if (e.couche === couche) e.draw(x, d, camY, T);
  };
  D.fxMaj = (sc, dt, d) => { for (const e of sc.fxs) if (e.maj) e.maj(dt, d); G.Lumiere.maj(sc, dt, d, G.Jeu.w()); };

  const W = () => G.VW;
  FX.etoiles = sc => {
    const n = 90, st = [];
    const hy = sc.hy || 120;
    for (let i = 0; i < n; i++) st.push({ x: G.rnd(PW), y: G.rnd(Math.max(10, hy - 16)), p: G.rnd(6), s: G.rnd(.6, 1) });
    return {
      couche: 'ciel', draw(x, d, c, T) {
        for (const s of st) {
          const a = .35 + .65 * Math.abs(Math.sin(T * s.s + s.p));
          x.fillStyle = a > .85 ? '#fff' : `rgba(220,230,255,${a})`;
          x.fillRect(((s.x - d * .004) % W() + W()) % W() | 0, s.y - MARGE | 0, 1, 1);
        }
      },
    };
  };
  FX.filante = () => {
    let t = 2, X = 0, Y = 0;
    return {
      couche: 'ciel', maj(dt) { t -= dt; if (t < -0.6) { t = G.rnd(3, 7); X = G.rnd(W()); Y = G.rnd(50); } },
      draw(x) {
        if (t > 0) return;
        const k = -t / .6;
        for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(255,255,255,${(1 - i / 10) * (1 - k)})`; x.fillRect(X + k * 90 - i * 2 | 0, Y + k * 34 - i | 0, 1, 1); }
      },
    };
  };
  FX.soleil = () => ({ couche: 'ciel', draw() { } });
  FX.soleilAncien = (sc, arg) => {
    const [fx, fy] = (arg || '.3,.3').split(',').map(Number);
    return {
      couche: 'ciel', draw(x, d, c, T) {
        const X = fx * PW - d * sc.lf * 0.6, Y = fy * Math.max(sc.hy, 60) - MARGE;
        const r = 16 + Math.sin(T * 1.3) * 1;
        x.fillStyle = 'rgba(255,240,190,.13)'; x.beginPath(); x.arc(X, Y, r * 3, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,240,190,.18)'; x.beginPath(); x.arc(X, Y, r * 2, 0, 7); x.fill();
        x.fillStyle = 'rgba(255,250,225,.55)'; x.beginPath(); x.arc(X, Y, r, 0, 7); x.fill();
      },
    };
  };
  FX.lune = (sc, arg) => {
    const [fx, fy] = (arg || '.5,.25').split(',').map(Number);
    return {
      couche: 'ciel', draw(x, d, c, T) {
        const X = fx * PW - d * .01, Y = fy * Math.max(sc.hy, 60) - MARGE;
        x.fillStyle = 'rgba(200,215,255,.10)'; x.beginPath(); x.arc(X, Y, 26, 0, 7); x.fill();
        x.fillStyle = 'rgba(240,245,255,.9)'; x.beginPath(); x.arc(X, Y, 8, 0, 7); x.fill();
        x.fillStyle = 'rgba(200,205,225,.8)'; x.fillRect(X - 3 | 0, Y - 2 | 0, 2, 2); x.fillRect(X + 2 | 0, Y + 1 | 0, 3, 2);
      },
    };
  };
  /* L'ecume et les eclats ne se posent que sur l'eau : un plan plus proche que la mer (plage, rive, ile, monument) les cache
     (Max, 03/11/2026 : des traits blancs couraient sur le sable et la terre) */
  function surTerre(sc, sx, y, d) {
    if (!sc._devantMer) {
      const fm = Math.max(0, ...sc.plans.filter(p => p.k === 'mer').map(p => p.f));
      sc._devantMer = sc.plans.map((p, i) => (p.k && p.k !== 'mer' && p.f > fm && !p.devant ? i : -1)).filter(i => i >= 0);
    }
    for (const i of sc._devantMer) if (y >= D.crete(sc, i, sx, d) - 1) return true;
    return false;
  }
  FX.reflets = (sc, arg) => {
    // eclats de lumiere sur l'eau ; arg = jusqu'ou descend la mer (0..1)
    const hy = sc.hy, bas = PH - MARGE, p = [], mx = parseFloat(arg || '1');
    for (let i = 0; i < 70; i++) { const t = Math.pow(Math.random(), 1.4) * mx; p.push({ t, x: G.rnd(PER), ph: G.rnd(6), r: hy + (bas - hy) * t }); }
    return {
      couche: 'sol', draw(x, d, c, T) {
        for (const s of p) {
          const a = Math.sin(T * 3 + s.ph);
          if (a < .5) continue;
          const sx = ((s.x - d * (sc.rf[s.r | 0] || .2)) % W() + W()) % W();
          if (surTerre(sc, sx, s.r - MARGE, d)) continue;
          x.fillStyle = a > .85 ? '#fff' : 'rgba(255,255,255,.55)';
          x.fillRect(sx | 0, s.r - MARGE + c * s.t | 0, 1 + (s.t * 3 | 0), 1);
        }
      },
    };
  };
  FX.vagues = (sc, arg) => {
    // lignes d'ecume qui roulent, plus grosses vers le bas ; arg = jusqu'ou descend la mer (0..1)
    const hy = sc.hy, bas = PH - MARGE, p = [], mx = parseFloat(arg || '1');
    for (let i = 0; i < 16; i++) p.push({ t: Math.pow((i + 1) / 16, 1.5) * mx, x: G.rnd(PER), w: G.rnd(16, 70), ph: G.rnd(6) });
    return {
      couche: 'sol', draw(x, d, c, T) {
        for (const s of p) {
          const r = hy + (bas - hy) * s.t;
          const ww = s.w * (.3 + s.t);
          const sx = ((s.x - d * (sc.rf[r | 0] || .2) - T * 8 * s.t) % (W() + ww) + (W() + ww)) % (W() + ww) - ww;
          const a = .45 + .4 * Math.sin(T * 1.4 + s.ph);
          if (surTerre(sc, sx, r - MARGE, d) || surTerre(sc, sx + ww, r - MARGE, d)) continue;
          x.fillStyle = `rgba(255,255,255,${a})`;
          x.fillRect(sx | 0, r - MARGE + c * s.t | 0, ww | 0, s.t > .6 ? 2 : 1);
        }
      },
    };
  };
  // une nappe de brume ou de poussiere : trois fuseaux emboites, en rangees decalees, pour des bouts effiles et sans bord droit
  const nappe = (w, h, couleur, pas = 3) => {
    const L = Math.ceil(w * G.S), H = Math.ceil(h * G.S), t = G.mk(L, H);
    t.x.fillStyle = couleur;
    for (const ech of [.88, .64, .4]) {
      let pg = -1, pd = -1;
      for (let y = 0; y < H; y += pas) {
        const v = (y + pas / 2) / H * 2 - 1, demi = L / 2 * ech * Math.sqrt(Math.max(0, 1 - v * v)) * (1 - G.rnd(.08));
        const dec = G.rnd(-L * .06, L * .06);
        let g = Math.round(L / 2 - demi + dec), d = Math.round(L / 2 + demi + dec);
        // deux rangees voisines n'ont jamais le meme bord
        if (g === pg) g++;
        if (d === pd) d--;
        pg = g; pd = d;
        if (d > g) t.x.fillRect(g, y, d - g, pas);
      }
    }
    return t;
  };
  FX.brume = (sc, arg) => {
    const a = parseFloat(arg || '.35');
    const col = G.rgb(sc.m.c_hz || [200, 200, 200], a * .2);
    const b = [];
    for (let i = 0; i < 9; i++) { const w = G.rnd(100, 240), h = G.rnd(12, 30); b.push({ x: G.rnd(W() * 1.6), y: G.rnd(30, 190), w, t: nappe(w, h, col), v: G.rnd(.45, 1.1) }); }
    return {
      couche: 'avant', maj(dt, d) {
        // le drone ouvre la brume : la nappe s'ecarte sur son passage
        for (const s of b) { const sx = ((s.x - d * s.v) % (W() + s.w) + (W() + s.w)) % (W() + s.w) - s.w; G.Interact.pousse(s, sx + s.w / 2, s.y + 10 + (s.ey || 0), dt, s.w * .36, 90); }
      },
      draw(x, d, c, T) {
        for (const s of b) {
          const sx = ((s.x - d * s.v) % (W() + s.w) + (W() + s.w)) % (W() + s.w) - s.w;
          x.drawImage(s.t, sx + (s.ex || 0) | 0, s.y + (s.ey || 0) | 0);
        }
      },
    };
  };
  FX.neige = () => {
    const p = [];
    for (let i = 0; i < 70; i++) p.push({ x: G.rnd(W()), y: G.rnd(216), v: G.rnd(14, 40), z: G.rnd(.3, 1.1), ph: G.rnd(6) });
    return {
      couche: 'avant', maj(dt, d) { for (const s of p) { s.y += s.v * dt; if (s.y > 216) s.y = -2; G.Interact.pousse(s, ((s.x - d * s.z) % W() + W()) % W() + (s.ex || 0), s.y + (s.ey || 0), dt, 30, 220); } },
      draw(x, d, c, T) { x.fillStyle = 'rgba(255,255,255,.85)'; for (const s of p) x.fillRect((((s.x - d * s.z + Math.sin(T + s.ph) * 6) % W() + W()) % W() + (s.ex || 0)) | 0, s.y + (s.ey || 0) | 0, s.z > .8 ? 2 : 1, s.z > .8 ? 2 : 1); },
    };
  };
  FX.pluie = () => {
    const p = [];
    for (let i = 0; i < 80; i++) p.push({ x: G.rnd(W()), y: G.rnd(216), v: G.rnd(220, 340) });
    return {
      couche: 'avant', maj(dt) { for (const s of p) { s.y += s.v * dt; if (s.y > 216) s.y = -6; } },
      draw(x, d) { x.fillStyle = 'rgba(200,220,240,.5)'; for (const s of p) { const X = ((s.x - d * 1.2 - s.y * .3) % W() + W()) % W() | 0; x.fillRect(X, s.y | 0, 1, 4); } },
    };
  };
  FX.sable = () => {
    const p = [];
    for (let i = 0; i < 60; i++) p.push({ x: G.rnd(W()), y: G.rnd(60, 212), v: G.rnd(1.2, 2.2), ph: G.rnd(6) });
    return {
      couche: 'avant', draw(x, d, c, T) { x.fillStyle = 'rgba(235,205,150,.55)'; for (const s of p) x.fillRect(((s.x - d * s.v) % W() + W()) % W() | 0, s.y + Math.sin(T * 2 + s.ph) * 3 | 0, 3, 1); },
    };
  };
  FX.lucioles = () => {
    const p = [];
    for (let i = 0; i < 26; i++) p.push({ x: G.rnd(W()), y: G.rnd(90, 210), ph: G.rnd(6), v: G.rnd(.3, .9) });
    return {
      couche: 'avant', maj(dt, d) { for (const s of p) G.Interact.pousse(s, ((s.x - d * s.v) % W() + W()) % W() + (s.ex || 0), s.y + (s.ey || 0), dt, 40, 170); },
      draw(x, d, c, T) {
        for (const s of p) {
          const a = Math.sin(T * 2 + s.ph);
          if (a < 0) continue;
          x.fillStyle = `rgba(230,255,140,${a})`;
          x.fillRect((((s.x - d * s.v + Math.sin(T + s.ph) * 8) % W() + W()) % W() + (s.ex || 0)) | 0, s.y + (s.ey || 0) + Math.cos(T * .7 + s.ph) * 6 | 0, 1, 1);
        }
      },
    };
  };
  FX.rayons = () => ({
    // rayons de soleil sous l'eau
    couche: 'avant', draw(x, d, c, T) {
      for (let i = 0; i < 6; i++) {
        const X = ((i * 97 - d * .05 + Math.sin(T * .4 + i) * 16) % (W() + 90) + W() + 90) % (W() + 90) - 40;
        x.fillStyle = `rgba(200,240,255,${.05 + .03 * Math.sin(T + i * 2)})`;
        x.beginPath(); x.moveTo(X, 0); x.lineTo(X + 18, 0); x.lineTo(X - 34, 216); x.lineTo(X - 76, 216); x.fill();
      }
    },
  });
  FX.bulles = () => {
    const p = [];
    for (let i = 0; i < 26; i++) p.push({ x: G.rnd(W()), y: G.rnd(216), v: G.rnd(10, 34), ph: G.rnd(6), s: G.rnd(1) > .75 ? 2 : 1 });
    return {
      couche: 'avant', maj(dt, d) { for (const s of p) { s.y -= s.v * dt; if (s.y < -3) s.y = 218; G.Interact.pousse(s, ((s.x - d * .5) % W() + W()) % W() + (s.ex || 0), s.y + (s.ey || 0), dt, 28, 170); } },
      draw(x, d, c, T) {
        for (const s of p) {
          const X = (((s.x - d * .5 + Math.sin(T * 2 + s.ph) * 2) % W() + W()) % W() + (s.ex || 0)) | 0, Y = s.y + (s.ey || 0) | 0;
          x.fillStyle = 'rgba(220,250,255,.7)';
          x.fillRect(X, Y, s.s, s.s);
          if (s.s > 1) { x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(X, Y, 1, 1); }
        }
      },
    };
  };
  FX.banc = () => {
    // banc de poissons : il s'ecarte quand le drone le traverse, et se reforme derriere lui
    const n = 46, p = [];
    let cx = W() + 120, cy = G.rnd(60, 150);
    const pal = [['#ffd54a', '#ff9f2e'], ['#7fe0ff', '#2f8fd0'], ['#ff8fb0', '#e0506a']][G.irnd(0, 2)];
    for (let i = 0; i < n; i++) p.push({ dx: G.rnd(-46, 46), dy: G.rnd(-24, 24), ex: 0, ey: 0, ph: G.rnd(6), c: pal[i % 2] });
    return {
      couche: 'avant', maj(dt) {
        const w = G.Jeu.w();
        cx -= (w ? w.v * .3 : 50) * dt;
        if (cx < -90) { cx = W() + G.rnd(160, 520); cy = G.rnd(50, 160); }
        if (!w) return;
        for (const f of p) {
          const X = cx + f.dx + f.ex, Y = cy + f.dy + f.ey;
          const ax = X - G.Jeu.HX, ay = Y - (w.y - 14), d2 = ax * ax + ay * ay;
          if (d2 < 1800) { const d = Math.sqrt(d2) + 1; f.ex += ax / d * 150 * dt; f.ey += ay / d * 150 * dt; }
          f.ex *= 1 - dt * 1.3; f.ey *= 1 - dt * 1.3;
        }
      },
      draw(x, d, c, T) {
        for (const f of p) {
          const X = cx + f.dx + f.ex + Math.sin(T * 2 + f.ph) * 2, Y = cy + f.dy + f.ey + Math.sin(T * 3 + f.ph) * 1.5;
          x.fillStyle = f.c; x.fillRect(X | 0, Y | 0, 3, 2);
          x.fillStyle = '#17151f'; x.fillRect(X | 0, Y | 0, 1, 1);
        }
      },
    };
  };
  FX.feuilles = (sc, arg) => {
    const cols = (arg || '#7fb04f,#a8c85a,#e0a03a').split(',');
    const p = [];
    for (let i = 0; i < 22; i++) p.push({ x: G.rnd(W()), y: G.rnd(216), v: G.rnd(12, 30), z: G.rnd(.7, 1.4), ph: G.rnd(6), c: G.pick(cols) });
    return {
      couche: 'avant', maj(dt, d) { for (const s of p) { s.y += s.v * dt; if (s.y > 216) s.y = -3; G.Interact.pousse(s, ((s.x - d * s.z) % W() + W()) % W() + (s.ex || 0), s.y + (s.ey || 0), dt, 36, 240); } },
      draw(x, d, c, T) { for (const s of p) { x.fillStyle = s.c; const X = ((s.x - d * s.z + Math.sin(T * 1.6 + s.ph) * 9) % W() + W()) % W() + (s.ex || 0); x.fillRect(X | 0, s.y + (s.ey || 0) | 0, Math.sin(T * 3 + s.ph) > 0 ? 2 : 1, 1); } },
    };
  };
  FX.flashs = sc => {
    // photographes dans la foule
    const p = [];
    for (let i = 0; i < 16; i++) p.push({ x: G.rnd(W()), y: G.rnd(10, 180), t: G.rnd(4) });
    return {
      couche: 'sol', maj(dt) { for (const s of p) { s.t -= dt; if (s.t < 0) { s.t = G.rnd(.5, 4); s.x = G.rnd(W()); s.y = G.rnd(10, 180); } } },
      draw(x) {
        for (const s of p) if (s.t < .08) { x.fillStyle = '#fff'; x.fillRect(s.x | 0, s.y | 0, 2, 2); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(s.x - 2 | 0, s.y - 2 | 0, 6, 6); }
      },
    };
  };
  FX.feu = (sc, arg) => {
    const [fx, fy] = (arg || '.5,.7').split(',').map(Number);
    const p = [];
    for (let i = 0; i < 36; i++) p.push({ a: G.rnd(), s: G.rnd(.6, 1.4), dx: G.rnd(-5, 5) });
    return {
      couche: 'sol', draw(x, d, c, T) {
        const X = fx * PW - d * (sc.rf[Math.min(PH - 1, Math.floor(fy * PH))] || .3), Y = fy * PH - MARGE;
        for (const s of p) {
          const k = (T * s.s + s.a) % 1;
          const yy = Y - k * 24, xx = X + s.dx * (1 - k) + Math.sin(T * 6 + s.a * 20) * 1.5;
          x.fillStyle = k < .35 ? '#fff2a0' : k < .7 ? '#ff9a2e' : '#d8391f';
          x.fillRect(xx | 0, yy | 0, k < .5 ? 2 : 1, k < .5 ? 2 : 1);
        }
        x.fillStyle = `rgba(255,150,50,${.1 + .04 * Math.sin(T * 9)})`;
        x.beginPath(); x.arc(X, Y - 6, 34, 0, 7); x.fill();
      },
    };
  };
  FX.poussiere = sc => {
    // poussiere qui file au ras du sol
    const col = G.rgb(G.mix(sc.m.c_hz, [255, 244, 220], .6), .14);
    const p = [];
    for (let i = 0; i < 24; i++) { const r = G.rnd(4, 11); p.push({ x: G.rnd(W()), y: G.rnd(150, 210), t: nappe(r * 3.2, r, col, 2), v: G.rnd(.8, 1.3), ph: G.rnd(6) }); }
    return { couche: 'sol', draw(x, d, c, T) { for (const s of p) x.drawImage(s.t, ((s.x - d * s.v) % (W() + 40) + W() + 40) % (W() + 40) - 20 | 0, s.y + Math.sin(T + s.ph) * 2 | 0); } };
  };
  FX.lustres = () => ({
    // lumieres de plafond qui passent
    couche: 'sol', draw(x, d) {
      for (let i = 0; i < 7; i++) {
        const X = ((i * 90 - d * .55) % (W() + 90) + W() + 90) % (W() + 90) - 30;
        x.fillStyle = 'rgba(255,240,200,.85)'; x.fillRect(X | 0, 4, 22, 2);
        x.fillStyle = 'rgba(255,240,200,.08)'; x.beginPath(); x.moveTo(X, 6); x.lineTo(X + 22, 6); x.lineTo(X + 54, 90); x.lineTo(X - 32, 90); x.fill();
      }
    },
  });
  FX.oiseaux = sc => {
    // petit vol lointain
    const v = [];
    for (let i = 0; i < 5; i++) v.push({ x: G.rnd(W() * 2), y: G.rnd(14, Math.max(30, sc.hy - 22)), ph: G.rnd(6), v: G.rnd(5, 12) });
    return {
      couche: 'ciel', maj(dt) { for (const s of v) { s.x -= s.v * dt; if (s.x < -10) s.x = W() + G.rnd(120); } },
      draw(x, d, c, T) {
        x.fillStyle = '#23262f';
        for (const s of v) {
          const up = Math.sin(T * 7 + s.ph) > 0 ? 1 : 0;
          x.fillRect(s.x | 0, s.y | 0, 1, 1);
          x.fillRect(s.x - 2 | 0, s.y - up | 0, 2, 1);
          x.fillRect(s.x + 1 | 0, s.y - up | 0, 2, 1);
        }
      },
    };
  };
})();
