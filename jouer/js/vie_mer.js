/* Les acteurs animes du groupe mer : voir vie.js.
   Tout ce qui est dessine ici est peint une fois au pixel dans de petites toiles, puis pose a chaque image : pas de calcul de pixels pendant le jeu. */
'use strict';
(function () {
  const FX = G.Decor.FX, D = G.Decor, V = G.Vie;
  const S = G.S, { rnd, irnd, pick, clamp, lerp } = G;
  const VW = () => G.VW;
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const hexRgb = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const lisse = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  // Une toile en vrais pixels, pour peindre franc : rectangles, polygones et disques sans antialias
  const toile = (w, h) => {
    const c = G.mk(Math.ceil(w), Math.ceil(h)), x = c.x;
    c.r = (a, b, l, t, col) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), Math.max(1, Math.round(l)), Math.max(1, Math.round(t))); };
    c.disque = (a, b, r, col) => { x.fillStyle = col; for (let j = -Math.ceil(r); j <= r; j++) { const l = Math.sqrt(Math.max(0, r * r - j * j)); x.fillRect(Math.round(a - l), Math.round(b + j), Math.max(1, Math.round(l * 2)), 1); } };
    c.poly = (pts, col) => {
      x.fillStyle = col;
      let y0 = 1e9, y1 = -1e9;
      for (const q of pts) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      for (let y = Math.floor(y0); y <= y1; y++) {
        const X = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= y + .5) !== (b[1] <= y + .5)) X.push(a[0] + (y + .5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        X.sort((p, q) => p - q);
        for (let i = 0; i + 1 < X.length; i += 2) x.fillRect(Math.round(X[i]), y, Math.max(1, Math.round(X[i + 1] - X[i])), 1);
      }
    };
    return c;
  };
  const cache = new Map();
  const garde = (k, fn) => { let v = cache.get(k); if (!v) { v = fn(); cache.set(k, v); } return v; };
  // pose une image en pixels, centree sur (a, b) en unites de jeu
  const pose = (x, im, a, b) => x.drawImage(im, a - im.width / S / 2, b - im.height / S / 2);
  const poseR = (x, im, a, b, ang, sx = 1) => { x.save(); x.translate(a, b); if (ang) x.rotate(ang); if (sx !== 1) x.scale(sx, 1); x.drawImage(im, -im.width / S / 2, -im.height / S / 2); x.restore(); };

  /* ---- L'ecume : des paquets blancs ombres de bleu, a bords mordus ---- */
  const paquet = (r, tons = ['#ffffff', '#d8f2f4', '#a8dce6']) => garde('ec' + r + tons[0], () => {
    const t = toile(r * 2 + 3, r * 2 + 3), c = r + 1;
    t.disque(c, c + Math.max(1, r * .18), r, tons[2]);
    t.disque(c - r * .08, c, r * .92, tons[1]);
    t.disque(c - r * .22, c - r * .24, r * .66, tons[0]);
    if (r >= 4) { t.x.clearRect(c + r * .5, c - r * .9, 2, 2); t.x.clearRect(c - r * .9, c + r * .3, 2, 2); }
    return t;
  });
  const disqueP = (r, col) => garde('d' + r + col, () => { const t = toile(r * 2 + 3, r * 2 + 3); t.disque(r + 1, r + 1, r, col); return t; });

  /* ---- L'eau en texture : du clair (haut) au sombre (bas), tramee, avec des filets d'ecume ---- */
  const texEau = (cle, w, h, tons, n = 60, filet = '#ffffff', hautFilets = .4) => garde('tex' + cle, () => {
    const W2 = w + 8, c = G.mk(W2, h), im = c.x.createImageData(W2, h), d = im.data, T = tons.map(hexRgb), m = T.length - 1;
    c.per = w;
    for (let j = 0; j < h; j++) {
      const v = j / (h - 1) * m, a = Math.min(m, v | 0), t = v - a;
      for (let i = 0; i < W2; i++) {
        const k = BAYER[j & 3][i & 3] / 16 < t ? Math.min(m, a + 1) : a, o = (j * W2 + i) * 4;
        d[o] = T[k][0]; d[o + 1] = T[k][1]; d[o + 2] = T[k][2]; d[o + 3] = 255;
      }
    }
    c.x.putImageData(im, 0, 0);
    // des veines sur la face : elles disent le mouvement de l'eau
    for (let q = 0; q < n; q++) {
      const y = Math.pow(Math.random(), 1.6) * h, l = rnd(8, 54), X = rnd(w), ep = Math.random() < .25 ? 2 : 1, kk = clamp(y / h * m | 0, 0, m), clair = Math.random() < .6;
      const col = T[clair ? Math.max(0, kk - 1) : Math.min(m, kk + 1)];
      c.x.fillStyle = y < h * hautFilets && Math.random() < .35 ? filet : G.rgb(col);
      for (const dx of [0, -w, w]) c.x.fillRect(X + dx | 0, y | 0, l | 0, ep);
    }
    return c;
  });

  /* ---- Un windsurfeur, peint en quatre poses. e = son echelle ; ancre : le milieu de la planche ---- */
  const VOILES = [['#ffd23c', '#2f6fd0', '#17151f'], ['#7fe04a', '#ffffff', '#1f7a4f'], ['#ff6a3c', '#ffe08a', '#7a1f3f'], ['#39d0e8', '#ff4f8a', '#143a70']];
  const peintSurf = (e, c, pose_) => garde(['ws', e, c, pose_] + '', () => {
    const W = Math.ceil(66 * e) + 6, H = Math.ceil(70 * e) + 6, t = toile(W, H), ox = W / 2, oy = H - 4;
    const [v1, v2, v3] = VOILES[c];
    const K = '#17151f', flot = pose_ === 1 ? 1.5 : 0, tuck = pose_ === 3;
    const P_ = (a, b) => [ox + a * e, oy - b * e];
    // la voile : mat penche vers l'arriere, wishbone, chute qui bat
    const pied = P_(-1, 3), tete = P_(-9, 62), wb = P_(24 + flot, 26), bas = P_(19 - flot, 10), col = P_(4, 40);
    t.poly([[tete[0] - 1, tete[1] - 1], [wb[0] + 1, wb[1]], [bas[0] + 1, bas[1] + 1], [pied[0] - 1, pied[1] + 1]], K);
    t.poly([tete, wb, bas, pied], v1);
    t.poly([P_(-5, 42), P_(13 + flot, 34), P_(14 + flot, 26), P_(-3, 30)], v2);
    t.poly([tete, P_(2, 46), P_(-6, 46)], v3);
    t.poly([P_(-2, 16), bas, P_(14 - flot, 7), P_(-1, 8)], v3);
    for (let i = 0; i <= 9; i++) { const q = lerp(pied[0], tete[0], i / 9), r = lerp(pied[1], tete[1], i / 9); t.r(q, r, 1, Math.ceil((tete[1] - pied[1]) / -9) + 1, '#2a2a33'); }
    // le bonhomme, penche en arriere, suspendu au wishbone
    const peau = ['#e8b48a', '#c98a5e', '#8a5a3c', '#f0c8a0'][c], combi = ['#17151f', '#2a3f6a', '#3a2030', '#1f4a3a'][c], cale = Math.max(1, 3 * e);
    if (e > .3) {
      if (tuck) {
        t.r(ox - 13 * e, oy - 16 * e, 9 * e, 5 * e, combi);
        t.r(ox - 17 * e, oy - 24 * e, 7 * e, 11 * e, combi);
      } else {
        t.poly([P_(-16, 3), P_(-13, 3), P_(-20, 24), P_(-24, 22)], combi);
        t.poly([P_(-8, 3), P_(-5, 3), P_(-19, 24), P_(-22, 20)], combi);
        t.poly([P_(-27, 34), P_(-21, 37), P_(-14, 22), P_(-23, 19)], combi);
      }
      const th = tuck ? -24 : -25, tv = tuck ? 32 : 40;
      t.disque(ox + th * e, oy - tv * e, Math.max(1, 3.4 * e), peau);
      t.r(ox + (th - 3.5) * e, oy - (tv + 3.8) * e, 7 * e, 2 * e, '#3a2418');
      t.poly(pose_ === 2 ? [P_(-22, 34), P_(-19, 34), P_(-30, 52), P_(-33, 50)] : [P_(-22, 33), P_(-20, 30), P_(0, 27), P_(0, 30)], peau);
      t.poly([P_(-21, 26), P_(-19, 23), P_(1, 25), P_(0, 28)], peau);
    }
    t.r(ox - 2 * e, oy - 30 * e, 28 * e, 1, '#e8e6df');
    // la planche
    t.poly([P_(-30, 3), P_(22, 3), P_(32, 6), P_(22, 0), P_(-30, 0)], K);
    t.poly([P_(-29, 2.4), P_(22, 2.4), P_(29, 5), P_(21, .7), P_(-29, .7)], '#ffffff');
    t.r(ox + 6 * e, oy - 2.2 * e, 13 * e, Math.max(1, cale * .4), v2);
    return t;
  });

  /* ---- Un windsurfeur en mouvement. mer : { haut(x), f, c (camera), e } ---- */
  const nouveauRider = (o) => Object.assign({ x: rnd(VW()), y: 0, vy: 0, etat: 'route', ang: 0, tour: 0, couleur: irnd(0, 3), vitesse: rnd(50, 80), sens: 1, T: rnd(9), proche: 0, dep: rnd(3, 9), sillage: [] }, o);
  function majRider(r, row, dt, cam) {
    const W = G.Jeu.w(), def = V.defile({ plans: [{ f: row.f }] }, 0);
    r.T += dt;
    const dr = V.drone();
    r.proche = dr && Math.abs(r.x - dr.x) < 54 && dr.y < r.y - 6 ? 1 : 0;
    if (r.etat === 'route') {
      r.x += (r.vitesse * r.sens - def) * dt;
      const h = row.haut(r.x), h2 = row.haut(r.x + 4 * r.sens);
      r.y = h; r.pente = clamp((h2 - h) / 4, -.9, .9);
      r.ang = lerp(r.ang, Math.atan(r.pente) * r.sens * .8, Math.min(1, dt * 8));
      r.dep -= dt;
      const montee = row.montee ? row.montee(r.x, r.sens) : 0;
      if (r.dep <= 0 && (montee > .25 || r.sautLibre)) {
        // l'appel : plus la pente est forte, plus il monte. Il tourne parfois sur lui-meme.
        const force = r.sautLibre ? r.sautLibre : clamp(60 + montee * 110, 70, 165);
        r.etat = 'air'; r.vy = -force * row.e; r.g = 150 * row.e; r.tEnAir = 0;
        r.Tair = 2 * force * row.e / r.g;
        r.tour = Math.random() < .55 ? (Math.PI * 2) * r.sens : 0;
        r.angLance = r.ang;
        r.dep = rnd(3.5, 9);
        row.gerbe && row.gerbe(r.x, r.y, 6);
      }
    } else if (r.etat === 'surf') {
      // il file sur la face de la vague, sous la levre, puis saute quand elle casse
      const w = r.w;
      const cible = w.fw * (.42 + .3 * Math.sin(r.T * .8));
      r.dxw = lerp(r.dxw, cible, Math.min(1, dt * 1.6));
      r.x = w.c + r.dxw;
      r.y = row.haut(r.x);
      r.ang = lerp(r.ang, Math.atan(clamp((row.haut(r.x + 4) - r.y) / 4, -.9, .9)) * .85, Math.min(1, dt * 7));
      if (w.chute > .45 || w.T >= w.dur) {
        r.w = null; r.etat = 'air'; r.vy = -150 * row.e; r.g = 150 * row.e; r.tEnAir = 0; r.Tair = 2; r.tour = Math.random() < .7 ? Math.PI * 2 : 0; r.angLance = r.ang; r.dep = rnd(3, 7);
        row.gerbe && row.gerbe(r.x, r.y, 10);
      }
    } else if (r.etat === 'air') {
      r.tEnAir += dt;
      r.x += (r.vitesse * 1.25 * r.sens - def) * dt;
      r.vy += r.g * dt; r.y += r.vy * dt;
      const k = clamp(r.tEnAir / r.Tair, 0, 1);
      r.ang = r.tour ? r.angLance + r.tour * lisse(k) : lerp(-.55 * r.sens, .4 * r.sens, k);
      const h = row.haut(r.x);
      if (r.vy > 0 && r.y >= h) { r.y = h; r.etat = 'route'; r.ang = 0; if (row.gerbe) { row.gerbe(r.x, h, 20); if (row.spray) for (let q = 0; q < 4; q++) row.spray.push({ x: r.x + rnd(-12, 12) * row.e, y: h, vx: rnd(-26, 26) * row.e, vy: rnd(-70, -30) * row.e, T: rnd(.35, .6), g: 170 * row.e, r: irnd(1, 2 + 4 * row.e | 0) }); } }
    }
    if (r.x < -60 || r.x > VW() + 60) { r.x = r.sens > 0 ? -50 : VW() + 50; if (Math.random() < .5) { r.couleur = irnd(0, 3); } r.etat = 'route'; r.w = null; r.ang = 0; }
  }
  function dessineRider(x, r, row, cam, T) {
    const air = r.etat === 'air';
    const pose_ = air ? (r.tour ? 3 : 0) : r.proche ? 2 : (T * 7 + r.T | 0) % 2;
    const im = peintSurf(row.e, r.couleur, pose_);
    const y = r.y + cam;
    // l'image a son ancre pres du bas
    x.save();
    // il tourne autour de son centre, pas autour de la planche
    const cg = 24 * row.e;
    x.translate(r.x, y - (air ? cg : 0));
    if (r.ang) x.rotate(r.ang);
    if (r.sens < 0) x.scale(-1, 1);
    x.drawImage(im, -im.width / S / 2, -(im.height - 4) / S + (air ? cg : 0));
    x.restore();
    if (!air) {
      // l'etrave et le sillage
      const q = T * 10 + r.T;
      const eS = row.e;
      x.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) x.fillRect(r.x - r.sens * (10 + i * 6 + (q % 1) * 4) * eS, y + .4 + Math.sin(q + i) * .4, (4 - i) * eS * 1.2 + .6, .6);
      pose(x, paquet(Math.max(2, 3 * eS | 0)), r.x + r.sens * 14 * eS, y);
    }
  }

  /* ---- La grosse mer : des rangees de vagues, chacune un relief qui vit, peint par tranches ---- */
  const RANGS = [
    { yb: 114, A: 24, e: .3, f: .08, pas: 4, nb: 3, bw: 38, tons: ['#a8ece4', '#6fd0d4', '#42b0cc', '#2c98c0', '#2388b4', '#1f7cac'], riders: 1 },
    { yb: 140, A: 44, e: .46, f: .15, pas: 3, nb: 3, bw: 62, tons: ['#c8f8e8', '#7ce8d4', '#3cc4c8', '#1fa0bc', '#1788b0', '#1272a2', '#0f6496'], riders: 1 },
    { yb: 178, A: 78, e: .68, f: .28, pas: 3, nb: 2, bw: 100, tons: ['#d8fff0', '#90f0d8', '#4cd4cc', '#20b0c0', '#1490b4', '#0f7cab', '#0c669c', '#0a568e', '#084a82', '#07427a'], riders: 2 },
  ];
  // Une vague : c position a l'ecran, A hauteur, T age, dur sa vie. Sa forme depend de son age.
  function etatVague(w) {
    const k = w.T / w.dur;
    const monte = lisse(k / .3), tombe = 1 - lisse((k - .64) / .36);
    w.a = w.Amax * monte * (.05 + .95 * tombe);
    w.creux = lisse((k - .2) / .24) * (1 - lisse((k - .66) / .2));   // le front se creuse, puis s'ecroule
    w.lip = lisse((k - .28) / .24);                         // la levre sort
    w.chute = lisse((k - .48) / .14);                       // elle retombe
    w.lipFin = 1 - lisse((k - .6) / .07);                   // et se perd dans l'ecume
    w.soupe = lisse((k - .5) / .12) * (1 - lisse((k - .86) / .14));   // le mur blanc devant
    w.fw = w.bw * lerp(.8, .3, w.creux);
    return k;
  }
  const profil = (w, dx) => {
    if (dx <= 0) return w.a * Math.exp(-Math.pow(dx / w.bw, 2));
    const g = Math.exp(-Math.pow(dx / w.fw, 2)), e = Math.exp(-2.1 * dx / w.fw);
    return w.a * (g * (1 - w.creux) + e * w.creux);
  };
  // ou tombe la levre, par rapport a la crete
  const rayonLevre = w => w.a * .34 * (1 + w.chute * .5);
  const angleLevre = w => lerp(.1, 2.5, w.lip) + w.chute * .55;
  const bout = w => { const R0 = rayonLevre(w), th = angleLevre(w); return [R0 * Math.sin(th) * 1.15, R0 * (1 - Math.cos(th))]; };

  FX.grosse_mer = sc => {
    const fin = sc.plans.length - 1;
    function nouvelleVague(row, age, xx) {
      const R = row.R, Amax = R.A * rnd(.68, 1);
      const w = { c: xx === undefined ? rnd(VW() * .3, VW() + 40) : xx, Amax, bw: R.bw * rnd(.85, 1.2), T: 0, dur: rnd(9, 12.5), ph: rnd(100), cassee: false, mousses: [] };
      w.T = w.dur * age;
      w.sv = rnd(.5, .78);
      const nb = Math.round((16 + R.e * 44) * (G.PERF_BAS ? .6 : 1));
      for (let i = 0; i < nb; i++) w.mousses.push({ u: rnd(-.9, 1), v: Math.pow(Math.random(), 1.4), ph: rnd(6), r: Math.random(), w: rnd(1.5, 4) });
      etatVague(w);
      return w;
    }
    const rows = RANGS.map((R, n) => {
      const yHaut = R.yb - R.A - 6, hp = Math.ceil((232 - yHaut) * S), l = 240;
      const row = { R, n, f: R.f, e: R.e, vagues: [], spray: [], riders: [], yHaut, face: texEau('m_f' + n, l, hp, R.tons, 40 + n * 30, '#ffffff', .25), pas: R.pas * (G.PERF_BAS ? 2 : 1), dSc: 0, Tl: 0 };
      const nSl = Math.ceil((VW() * S) / row.pas) + 2;
      row.top = new Float32Array(nSl); row.om = new Float32Array(nSl);
      row.haut = xx => row.top[clamp(Math.round(xx * S / row.pas), 0, nSl - 1)];
      row.montee = (xx, sens) => (row.haut(xx - 3) - row.haut(xx + 3)) / 6 * sens;
      row.gerbe = (xx, yy, nb) => { for (let i = 0; i < nb; i++) row.spray.push({ x: xx + rnd(-8, 8) * R.e, y: yy, vx: rnd(-40, 40) * R.e, vy: rnd(-90, -24) * R.e, T: rnd(.35, .8), g: 180 * R.e }); };
      for (let i = 0; i < R.nb; i++) row.vagues.push(nouvelleVague(row, i / R.nb, (i + .5) / R.nb * (VW() + 60)));
      for (let i = 0; i < R.riders; i++) row.riders.push(nouveauRider({ x: rnd(VW()), vitesse: rnd(60, 95) * (R.e + .3) }));
      return row;
    });
    function majRow(row, d, dt, T) {
      const def = V.defile({ plans: [{ f: row.f }] }, 0), R = row.R, ps = row.pas / S;
      row.dSc = d * row.f;
      for (let i = 0; i < row.vagues.length; i++) {
        const w = row.vagues[i];
        w.T += dt;
        const k = etatVague(w);
        // la vague court dans le sens du drone : elle derive lentement a l'ecran, on a le temps de la voir vivre
        w.c -= def * (1 - w.sv) * dt;
        if (w.chute > .8 && !w.cassee) {
          w.cassee = true;
          // l'impact : une gerbe et de gros paquets projetes
          const ix = w.c + bout(w)[0], iy = R.yb - w.a * .12;
          row.gerbe(ix, iy, 30);
          for (let q = 0; q < 9; q++) row.spray.push({ x: ix + rnd(-10, 12) * R.e, y: iy, vx: rnd(-20, 60) * R.e, vy: rnd(-130, -50) * R.e, T: rnd(.5, 1), g: 170 * R.e, r: irnd(2, 3 + 7 * R.e | 0) });
        }
        // les embruns que le vent arrache a la crete
        if (w.lip > .05 && w.soupe < .9 && Math.random() < dt * 40 * R.e * w.lip) row.spray.push({ x: w.c + rnd(-8, 12) * R.e, y: R.yb - w.a - rnd(1, 4), vx: rnd(-46, -12) * R.e * 1.4, vy: rnd(-34, -6) * R.e, T: rnd(.5, 1.1), g: 90 * R.e });
        if (k >= 1 || w.c < -w.bw * 1.6) row.vagues[i] = nouvelleVague(row, 0);
      }
      for (let i = row.top.length - 1; i >= 0; i--) {
        const X = i * ps, Xm = X + row.dSc;
        let h = Math.sin(Xm * .021 + T * .55 + row.n) * 1.5 * (R.e + .4) + Math.sin(Xm * .057 - T * .9 + row.n * 2) * .9 * (R.e + .3) + Math.sin(Xm * .17 + T * 1.8) * .35, om = 0;
        for (const w of row.vagues) {
          const dx = X - w.c;
          h += profil(w, dx);
          // le front prend la lumiere, le dos reste sombre
          const q = w.a / R.A * (dx > 0 ? Math.exp(-Math.pow(dx / (w.fw * 2.2), 2)) : Math.exp(-Math.pow(dx / (w.bw * .1), 2)) * .45 + Math.exp(-Math.pow(dx / (w.bw * .42), 2)) * .55);
          if (q > om) om = q;
        }
        row.top[i] = R.yb - h;
        row.om[i] = om;
      }
      for (const r of row.riders) {
        if (r.etat === 'route' && !r.w) for (const w of row.vagues) if (w.T / w.dur > .16 && w.T / w.dur < .36 && Math.abs(r.x - w.c - w.fw) < w.fw * 2.2 && Math.random() < dt * .8) { r.w = w; r.etat = 'surf'; r.dxw = r.x - w.c; break; }
        majRider(r, row, dt);
      }
      for (const s of row.spray) { s.T -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += s.g * dt; }
      if (row.spray.length > 80) row.spray.splice(0, row.spray.length - 80);
      row.spray = row.spray.filter(s => s.T > 0);
    }
    function drawRow(x, row, cam, T) {
      const R = row.R, pas = row.pas, ps = pas / S, top = row.top, sc0 = Math.round(row.dSc * S);
      const tex = row.face, hF = tex.height, l = tex.per, dec = R.A * S * .62, yH = Math.round((row.yHaut + cam) * S);
      // l'eau par tranches : le dessus suit le relief, la couleur vient de la hauteur et de la lumiere du front
      for (let i = 0; i < top.length; i++) {
        // le decalage reste un multiple de 4 : la trame ne se decale pas d'une tranche a l'autre
        const yp = Math.round((top[i] + cam) * S), sy = clamp(yp - yH - (Math.round(row.om[i] * dec / 4) * 4), 0, hF - 1);
        x.drawImage(tex, (i * pas + sc0) % l, sy, pas, hF - sy, i * ps, yp / S, ps, (hF - sy) / S);
      }
      // le lisere de la crete, puis les filets qui remontent la face : c'est eux qui donnent le volume
      x.fillStyle = R.tons[0];
      for (let i = 0; i < top.length; i++) if (row.om[i] > .22) x.fillRect(i * ps, top[i] + cam, ps, .6);
      x.fillStyle = R.tons[2];
      for (let i = 0; i < top.length; i++) if (row.om[i] <= .22 && i % 3) x.fillRect(i * ps, top[i] + cam, ps, .6);
      for (const w of row.vagues) {
        if (w.a < 5 || R.e < .4) continue;
        const a = Math.floor((w.c - w.bw * .55) * S / pas), b = Math.ceil((w.c + w.fw * 2.1) * S / pas);
        for (let j = 0; j < 3; j++) {
          const q = (T * .16 + j / 3 + w.ph) % 1, off = (1 - q) * w.a * .8 + 2 * R.e;
          x.fillStyle = j % 2 ? R.tons[2] : R.tons[0];
          for (let i = Math.max(0, a); i <= Math.min(top.length - 1, b); i++) {
            const dx = i * ps - w.c, yy = top[i] + off * (dx > 0 ? 1 : .55) * (1 + (dx > 0 ? dx / (w.fw * 3) : 0));
            if (yy > R.yb + 4 || Math.sin(i * .37 + j * 2.1 + w.ph) + Math.sin(i * .11 + j) < -.2 - q) continue;
            x.fillRect(i * ps, yy + cam, ps, .6);
          }
        }
      }
      for (const w of row.vagues) dessineVague(x, row, w, cam, T);
      for (const r of row.riders) dessineRider(x, r, row, cam, T);
      for (const s of row.spray) {
        if (s.r) { pose(x, paquet(Math.max(1, Math.round(s.r * Math.min(1, s.T * 2.2)))), s.x, s.y + cam); continue; }
        const t = R.e > .5 ? 1.2 : .7;
        x.fillStyle = s.T > .3 ? '#fff' : 'rgba(255,255,255,.65)';
        x.fillRect(s.x, s.y + cam, t, t);
      }
    }
    function dessineVague(x, row, w, cam, T) {
      const R = row.R, E = R.e, tons = R.tons, n = tons.length;
      if (w.a < 1.4) return;
      const yc = R.yb - w.a + cam, cx = w.c;
      if (w.lip > .04 && w.lipFin > 0) {
        const R0 = rayonLevre(w), th = angleLevre(w), fin = w.lipFin;
        // sous la levre : le creux sombre du rouleau, du dessous de la levre jusqu'a la face
        const xMax = R0 * 1.15 * (th > Math.PI / 2 ? 1 : Math.sin(th)), ps = row.pas / S;
        if (xMax > 2) for (let X = 0; X < xMax; X += ps) {
          const a = Math.asin(clamp(X / (R0 * 1.15), 0, 1)), y1 = yc + R0 * (1 - Math.cos(a)), y2 = row.haut(cx + X) + cam;
          if (y2 <= y1) continue;
          const c = X / xMax;
          x.fillStyle = tons[n - 4]; x.fillRect(cx + X, y1, ps, y2 - y1);
          x.fillStyle = tons[n - 2]; x.fillRect(cx + X, y1 + (y2 - y1) * (.12 + c * .1), ps, (y2 - y1) * .62);
          x.fillStyle = tons[n - 1]; x.fillRect(cx + X, y1 + (y2 - y1) * (.3 + c * .1), ps, (y2 - y1) * .3);
        }
        // la levre : une langue d'eau claire qui s'allonge et s'enroule, bordee d'ecume
        const N = Math.max(7, Math.round(R0 * th * S / 4.5));
        for (let i = 0; i <= N; i++) {
          const t = i / N, a = t * th, px = cx + R0 * Math.sin(a) * 1.15, py = yc + R0 * (1 - Math.cos(a));
          const r = Math.max(1, Math.round(lerp(w.a * .12, w.a * .03, t) * S * fin));
          pose(x, disqueP(r, t < .3 ? tons[3] : t < .65 ? tons[2] : tons[1]), px, py);
        }
        for (let i = 0; i <= N; i++) {
          const t = i / N, a = t * th, px = cx + R0 * Math.sin(a) * 1.15, py = yc + R0 * (1 - Math.cos(a));
          const r = Math.max(1, Math.round(lerp(w.a * .1, w.a * .024, t) * S * fin));
          const ox = Math.sin(a) * r / S * .75, oy = -Math.cos(a) * r / S * .75;
          pose(x, disqueP(Math.max(1, Math.round(r * .62)), '#ffffff'), px + ox, py + oy);
          if (i % 3 === 0) pose(x, paquet(Math.max(1, Math.round(r * .4 + 1))), px + ox * 1.4 + Math.sin(T * 5 + i) * .5, py + oy * 1.4);
        }
        // l'eau qui tombe en rideau du bout de la levre
        if (w.lip > .75 && w.chute < .9) {
          const [bx, by] = bout(w);
          x.fillStyle = '#fff';
          for (let i = 0; i < 7; i++) { const q = (T * 1.5 + i * .14 + w.ph) % 1; x.fillRect(cx + bx * (.7 + i * .05), yc + by + q * (R.yb + cam - (yc + by)), .8, 1.6); }
        }
      }
      // l'ecume sur la crete, puis le mur blanc qui devale : une masse pleine, bosselee par-dessus
      const mur = Math.max(w.soupe, w.lip * .2);
      if (mur > .03) {
        const ps = row.pas / S, av = w.soupe * w.fw * 1.1;
        const x0 = cx - w.fw * (.25 + mur * .7), x1 = cx + w.fw * (.25 + w.soupe * 1.7) + av;
        const haut = (w.a * .17 + 5 * E) * mur, prof = (w.a * .42 + 7 * E) * w.soupe;
        const a = Math.max(0, Math.floor(x0 / ps)), b = Math.min(row.top.length - 1, Math.ceil(x1 / ps));
        for (let i = a; i <= b; i++) {
          const X = i * ps, u = (X - x0) / (x1 - x0), e = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .55);
          // le bord du bas ondule lentement : c'est une nappe, pas des stalactites
          const br = Math.sin(i * .13 + w.ph) * .6 + Math.sin(i * .05 + T * .9 + w.ph) * .8;
          const y0 = row.top[i] + cam - haut * e * (.7 + br * .2), h = (haut + prof) * e * (.74 + Math.sin(i * .045 + T * .7) * .14 + Math.sin(i * .17 + w.ph * 2) * .1) + .6;
          x.fillStyle = '#ffffff'; x.fillRect(X, y0, ps, h * .7);
          x.fillStyle = '#b8e4ea'; x.fillRect(X, y0 + h * .7, ps, h * .3 + .4);
        }
        const rMax = (2 + 11 * E) * (.5 + w.soupe * .7);
        for (const m of w.mousses) {
          if (m.r > mur + .08) continue;
          const u = (m.u + 1) / 2, X = x0 + u * (x1 - x0), e = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .55);
          // les paquets bossellent le dessus de la nappe, quelques-uns descendent sur son bord du bas
          const Y = row.haut(X) + cam - haut * e * .75 + (m.v > .55 ? prof * .78 + haut * .3 : m.v * prof * .45) * e - Math.sin(T * m.w + m.ph) * 1.5 * E;
          const rr = Math.max(1, Math.round(rMax * (.3 + .7 * (1 - m.v)) * e * (.72 + .28 * Math.sin(T * 1.3 + m.ph * 2))));
          pose(x, paquet(rr), X + Math.sin(T * m.w + m.ph) * 1.2 * E, Y);
        }
      }
    }
    let Tl = 0;
    return {
      plan: fin, rows,
      maj(dt, d) { Tl += dt; for (const r of rows) majRow(r, d, dt, Tl); },
      draw(x, d, cam, T) { for (const r of rows) drawRow(x, r, cam * Math.max(.1, Math.min(1, r.f * 1.1)), Tl); },
    };
  };

  /* ---- La houle : une bande d'eau par tranches, dessus qui roule : plus de bord droit entre deux plans ---- */
  const bandeEau = (cle, yb, A, tons, f, pas) => {
    const yH = yb - A - 3, hp = Math.ceil((232 - yH) * S), tex = texEau('h' + cle, 256, hp, tons, 34, tons[0], .3), P = pas * (G.PERF_BAS ? 2 : 1), ps = P / S;
    const n = Math.ceil(VW() * S / P) + 2, top = new Float32Array(n);
    const gl = [];
    for (let i = 0; i < 14; i++) gl.push({ x: rnd(VW()), y: rnd(yb + 2, Math.min(216, yb + 40)), ph: rnd(6), w: rnd(2, 8) });
    let dS = 0;
    return {
      f,
      haut: xx => top[clamp(Math.round(xx * S / P), 0, n - 1)],
      maj(d, T) {
        dS = d * f;
        for (let i = 0; i < n; i++) { const X = i * ps + dS; top[i] = yb - A * (.55 * Math.sin(X * .024 + T * .7) + .3 * Math.sin(X * .061 - T * 1.1) + .15 * Math.sin(X * .15 + T * 1.9)); }
      },
      draw(x, cam, T) {
        const yp0 = Math.round((yH + cam) * S), sc0 = Math.round(dS * S), c0 = tons[0], c1 = tons[1];
        for (let i = 0; i < n; i++) {
          const yp = Math.round((top[i] + cam) * S), sy = clamp(yp - yp0, 0, hp - 1), sx = (i * P + sc0) % 256;
          x.drawImage(tex, sx, sy, P, hp - sy, i * ps, yp / S, ps, (hp - sy) / S);
        }
        x.fillStyle = c1;
        for (let i = 0; i < n; i += 1) if (top[i] < yb + A * .3) x.fillRect(i * ps, top[i] + cam, ps, .6);
        x.fillStyle = c0;
        for (let i = 0; i < n; i += 1) if (top[i] < yb - A * .45) x.fillRect(i * ps, top[i] + cam, ps, .6);
        x.fillStyle = '#ffffff';
        for (const g of gl) if (Math.sin(T * 2.4 + g.ph) > .55) x.fillRect(((g.x - dS) % VW() + VW()) % VW(), g.y + cam, g.w, .6);
      },
    };
  };
  FX.houle = (sc, arg) => {
    const a = arg.split(','), n = +a[0], i = V.plan(sc, 'mer', n), yb = +a[1], A = +a[2], tons = a.slice(3), f = sc.plans[i].f;
    const b = bandeEau(sc.id + n, yb, A, tons, f, 4);
    let Tl = rnd(9);
    return { plan: i, maj(dt, d) { Tl += dt; b.maj(d, Tl); }, draw(x, d, cam, T) { b.draw(x, cam, Tl); } };
  };

  /* ---- Le van sur la route de la cote de lave : la route suit la crete, il y roule et souleve un peu de poussiere ---- */
  FX.van_route = sc => {
    const i = V.plan(sc, 'roc', 0), f = sc.plans[i].f;
    let X = VW() + 80, att = rnd(1, 3);
    const po = [], YR = 158;
    return {
      plan: i,
      maj(dt) {
        const dep = V.defile(sc, i);
        if (att > 0) { att -= dt; if (att <= 0) X = VW() + 70; return; }
        X += (dep * .68 - dep) * dt;
        if (Math.random() < dt * 22) po.push({ x: X - 30, y: 0, vx: rnd(-20, -6), T: rnd(.4, .8), D: .8 });
        for (const p of po) { p.T -= dt; p.x += (p.vx - dep) * dt; p.y -= 7 * dt; }
        for (let q = po.length - 1; q >= 0; q--) if (po[q].T <= 0) po.splice(q, 1);
        if (X < -70) { att = rnd(5, 10); }
      },
      draw(x, d, cam, T) {
        // la route : droite et plate, juste en dessous de la crete de la roche
        const yR = YR + cam, off = (d * f) % 40;
        x.fillStyle = '#17151f'; x.fillRect(0, yR - .8, VW(), 12.4);
        x.fillStyle = '#2f2c34'; x.fillRect(0, yR, VW(), 10.6);
        x.fillStyle = '#4a4650'; x.fillRect(0, yR, VW(), 1);
        x.fillStyle = '#e8e0c8';
        for (let a = -off; a < VW(); a += 40) x.fillRect(a, yR + 5, 18, .8);
        if (att > 0) return;
        const sp = D.spr('van', 'l');
        if (!sp.ok) return;
        const y0 = yR + 6.5;
        // la poussiere, puis le van : il tressaute un peu
        x.fillStyle = 'rgba(190,176,160,.5)';
        for (const p of po) x.fillRect(p.x, y0 - 2 + p.y, 1.8 + (1 - p.T) * 3, 1.2 + (1 - p.T) * 2);
        x.drawImage(sp.img, X - sp.w / 2, y0 - sp.h + (Math.sin(T * 13) > .7 ? -.6 : 0));
      },
    };
  };

  /* ---- Des windsurfeurs au loin, qui sautent : ha_plage. arg = la profondeur du premier, ils se repartissent sur la mer ---- */
  FX.surf_loin = sc => {
    const i = V.plan(sc, 'mer', 0), p = sc.plans[i], y0 = p.y + 4, rows = [];
    for (const [dy, e, nb] of [[3, .26, 1], [10, .34, 2], [19, .46, 2]]) {
      const row = { f: p.f * (1 + dy * .06), e, spray: [], riders: [], yb: y0 + dy, dSc: 0, Tl: 0 };
      row.haut = xx => row.yb + Math.sin((xx + row.dSc) * .05 + row.Tl * 1.3) * .7 * e * 2;
      row.gerbe = (xx, yy, n) => { for (let q = 0; q < n; q++) row.spray.push({ x: xx + rnd(-6, 6) * e, y: yy, vx: rnd(-34, 34) * e, vy: rnd(-90, -24) * e, T: rnd(.3, .7), g: 180 * e }); };
      for (let q = 0; q < nb; q++) row.riders.push(nouveauRider({ x: rnd(VW()), vitesse: rnd(26, 46), sens: Math.random() < .3 ? -1 : 1, dep: rnd(.4, 3.5) }));
      rows.push(row);
    }
    return {
      plan: i, rows,
      maj(dt, d) {
        for (const row of rows) {
          row.Tl += dt; row.dSc = d * row.f;
          for (const r of row.riders) { if (r.etat === 'route') r.sautLibre = rnd(120, 190); majRider(r, row, dt); }
          for (const s of row.spray) { s.T -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += s.g * dt; }
          row.spray = row.spray.filter(s => s.T > 0);
        }
      },
      draw(x, d, cam, T) {
        for (const row of rows) {
          for (const r of row.riders) dessineRider(x, r, row, cam, T);
          x.fillStyle = '#fff';
          for (const s of row.spray) x.fillRect(s.x, s.y + cam, .7, .7);
        }
      },
    };
  };

  /* ---- Une baleine : un corps en arc peint une fois, qui tourne autour d'un centre sous l'eau et que la surface coupe ---- */
  const CORPS = {
    rorqual: { dos: [34, 52, 72], haut: [96, 122, 146], ventre: [150, 164, 176], flanc: [58, 80, 102], ep: .1, nag: .3 },
    bosse: { dos: [28, 36, 52], haut: [84, 98, 118], ventre: [190, 196, 200], flanc: [46, 58, 76], ep: .11, nag: .34 },
  };
  const ARC = .72, DC = .9;
  const peintCorps = (e, sorte) => garde('corps' + e + sorte, () => {
    const Rb = 210 * e, C = CORPS[sorte], ep = Rb * C.ep * 2.4, pad = 6;
    const w = Math.ceil(2 * (Rb + ep) * Math.sin(ARC)) + pad * 2, h = Math.ceil((Rb + ep) * (1 - Math.cos(ARC))) + Math.ceil(ep * 2) + pad * 2;
    const t = G.mk(w, h), im = t.x.createImageData(w, h), d = im.data, cx = w / 2, cy = Rb + ep + pad;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = i - cx, dy = cy - j, r = Math.sqrt(dx * dx + dy * dy), th = Math.atan2(dx, dy), u = (th + ARC) / (2 * ARC);
      if (u < 0 || u > 1) continue;
      // son epaisseur : fine vers la queue, pleine au milieu, tete arrondie
      const ten = Math.pow(Math.sin(Math.PI * Math.pow(u, 1.25)), .62) * ep * .5 * (.4 + u * .6);
      // l'aileron dorsal, petit et loin en arriere
      const fin = Math.max(0, 1 - Math.abs(u - C.nag) / .028);
      const off = r - Rb;
      const hautMax = ten + (fin > 0 ? fin * fin * ep * .36 : 0);
      if (off > hautMax || off < -ten) continue;
      const k = (off + ten) / (2 * ten + .01), o = (j * w + i) * 4;
      const tr = BAYER[j & 3][i & 3] / 16;
      let c = C.flanc;
      if (off > ten) c = C.dos;
      else if (k > .86) c = C.haut;
      else if (k > .56 + tr * .08) c = C.dos;
      else if (k < .2 + tr * .08) c = C.ventre;
      // des taches pales et le sillon du rostre
      if ((i * 13 + j * 7) % 97 < 2 && k > .4) c = C.haut;
      if (u > .94 && k < .46) c = C.ventre;
      if (off > hautMax - 1.2 || off < -ten + 1) c = [23, 21, 31];
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    t.x.putImageData(im, 0, 0);
    t.cx = cx; t.cy = cy; t.Rb = Rb;
    const o = G.mk(w, h);
    o.x.drawImage(t, 0, 0); o.x.globalCompositeOperation = 'source-atop'; o.x.fillStyle = '#0a2448'; o.x.fillRect(0, 0, w, h);
    t.ombre = o;
    return t;
  });
  const peintQueue = (e, plie) => garde('queue' + e + plie, () => {
    const W_ = Math.ceil(190 * e), H_ = Math.ceil(150 * e), t = toile(W_, H_), m = W_ / 2, P_ = (a, b) => [m + a * e, H_ - 2 - b * e];
    const K = '#17151f', pli = plie * 9;
    const forme = [P_(-13, 0), P_(-8, 44), P_(-13, 62), P_(-44, 88 + pli * .2), P_(-90, 96 - pli), P_(-82, 112 - pli), P_(-46, 122 - pli * .3), P_(-16, 124), P_(0, 112), P_(16, 124), P_(46, 122 - pli * .3), P_(82, 112 - pli), P_(90, 96 - pli), P_(44, 88 + pli * .2), P_(13, 62), P_(8, 44), P_(13, 0)];
    t.poly(forme.map(q => [q[0] + (q[0] > m ? 1 : -1), q[1] - 1]), K);
    t.poly(forme.map(q => [q[0], q[1] + 1]), K);
    t.poly(forme, '#33404f');
    // le dessous de la nageoire, blanc tache : c'est lui qu'on voit
    t.poly([P_(-12, 66), P_(-44, 92 + pli * .2), P_(-80, 99 - pli), P_(-74, 110 - pli), P_(-44, 116 - pli * .3), P_(-16, 116), P_(-2, 106), P_(-2, 74)], '#d4dade');
    t.poly([P_(12, 66), P_(44, 92 + pli * .2), P_(80, 99 - pli), P_(74, 110 - pli), P_(44, 116 - pli * .3), P_(16, 116), P_(2, 106), P_(2, 74)], '#c4ccd2');
    for (let i = 0; i < 26; i++) { const a = (i * 37 % 150) - 75, b = 72 + (i * 53 % 42); if (Math.abs(a) > 4 && Math.abs(a) < 74 - (b - 72) * .2) t.r(m + a * e, H_ - b * e, Math.max(1, 5 * e), Math.max(1, 2 * e), i % 3 ? '#4a5868' : '#7a8896'); }
    t.r(m - 2 * e, H_ - 112 * e, 3 * e, 44 * e, '#26303e');
    // la tige : sombre, avec un reflet et des bernacles
    t.poly([P_(-9, 0), P_(-5, 44), P_(-9, 62), P_(0, 70), P_(-1, 0)], '#222c3a');
    t.poly([P_(8, 0), P_(5, 44), P_(9, 62), P_(3, 66), P_(3, 0)], '#4a5868');
    for (let i = 0; i < 6; i++) t.r(m + ((i * 7) % 12 - 6) * e, H_ - (8 + i * 8) * e, Math.max(1, 2 * e), Math.max(1, 2 * e), '#a8b0b8');
    return t;
  });

  // Une sortie de baleine. e : taille ; yEau : niveau de l'eau. La suite : la tete sort, elle souffle, le dos roule, puis parfois la queue
  function nouvelleSortie(o) { return Object.assign({ X: 240, e: .5, yEau: 150, T: 0, dur: 7.5, sorte: 'rorqual', queue: Math.random() < .55, puffs: [], ph: rnd(9), etat: 'dos' }, o); }
  function majSortie(b, dt, depl) {
    b.X += depl;
    // le souffle deja parti suit la baleine : il reste colle a elle (Max, 03/11/2026)
    for (const p of b.puffs) p.x += depl;
    b.T += dt;
    const k = b.T / b.dur;
    // elle souffle quand l'event est au plus haut
    if (b.etat === 'dos' && k > .2 && k < .36) {
      const hole = trouSortie(b);
      for (let i = 0; i < 2; i++) if (Math.random() < dt * 60) b.puffs.push({ x: hole[0] + rnd(-1, 1) * b.e, y: hole[1], x0: hole[0], y0: hole[1], bx: b.X, vx: rnd(-7, 7) * b.e, vy: rnd(-145, -95) * b.e * (1.3 - (k - .2) * 2), T: 0, D: rnd(.7, 1.3), r: rnd(1.5, 3.5) * (b.e + .35) });
    }
    for (const p of b.puffs) { p.T += dt; p.x += (p.vx - 5 * b.e) * dt; p.y += p.vy * dt; p.vy *= 1 - dt * 2.5; p.vx *= 1 + dt * .8; }
    b.puffs = b.puffs.filter(p => p.T < p.D);
    if (b.etat === 'dos' && k >= 1) {
      if (b.queue) { b.etat = 'queue'; b.T = 0; b.dur = rnd(4, 5); b.X += 0; } else b.fin = true;
    } else if (b.etat === 'queue' && k >= 1) b.fin = true;
  }
  const phiSortie = k => lerp(-1.42, 1.42, k < .3 ? lisse(k / .3) * .42 : k < .46 ? .42 + (k - .3) * .35 : .476 + lisse((k - .46) / .54) * .524);
  // ou est le corps : le centre de son arc (sous l'eau) et sa rotation, en unites de jeu. Le meme calcul sert au dessin et a l'event.
  const poseCorps = b => {
    const k = b.T / b.dur, c = peintCorps(b.e, b.sorte), R = c.Rb / S;
    return { c, R, phi: phiSortie(b.coule ? Math.min(k, .5) : k), Yc: b.yEau + R * DC + (b.coule && k > .5 ? lisse((k - .5) / .5) * R * .9 : 0) };
  };
  // l'event, lu dans l'image du corps : sur le rayon de la tete (78 % de l'arc), le dernier pixel peint, c'est-a-dire le dos.
  // (l'ancien calcul prenait le rayon en pixels pour des unites de jeu : l'event tournait 1,7 fois trop loin, hors du corps)
  const EVENT_ARC = ARC * .78;
  const rayonEvent = c => {
    if (c.rEvent === undefined) {
      const w = c.width, h = c.height, a = c.x.getImageData(0, 0, w, h).data, sn = Math.sin(EVENT_ARC), cs = Math.cos(EVENT_ARC);
      let r = c.Rb;
      for (let q = Math.round(c.Rb); q < c.Rb * 1.5; q++) {
        const i = Math.round(c.cx + q * sn), j = Math.round(c.cy - q * cs);
        if (i < 0 || j < 0 || i >= w || j >= h || a[(j * w + i) * 4 + 3] < 128) break;
        r = q;
      }
      c.rEvent = r;
    }
    return c.rEvent;
  };
  const trouSortie = b => {
    const p = poseCorps(b), r = rayonEvent(p.c) / S, th = p.phi + EVENT_ARC;
    return [b.X + r * Math.sin(th), p.Yc - r * Math.cos(th)];
  };
  function dessineSortie(x, b, cam, T, couleurs) {
    const k = b.T / b.dur, Y = b.yEau + cam, e = b.e;
    if (b.etat === 'dos') {
      const pc = poseCorps(b), c = pc.c, phi = pc.phi, R = pc.R, dcU = R * DC, Yc = pc.Yc + cam;
      const poser = im => { x.save(); x.translate(b.X, Yc); x.rotate(phi); x.drawImage(im || c, -c.cx / S, -c.cy / S); x.restore(); };
      // sa forme sous l'eau, sombre
      x.save(); x.globalAlpha = .34; x.beginPath(); x.rect(0, Y, VW(), 60); x.clip(); poser(c.ombre); x.restore();
      x.save(); x.beginPath(); x.rect(-10, Y - 90, VW() + 20, 90); x.clip(); poser(); x.restore();
      // l'eau qui s'ouvre et se referme la ou elle passe la surface
      const th0 = Math.acos(clamp(dcU / R, -1, 1));
      for (const sg of [-1, 1]) {
        const th = sg * th0;
        if (th > phi - ARC && th < phi + ARC) {
          const fx = b.X + R * Math.sin(th);
          for (let i = 0; i < 4; i++) pose(x, paquet(Math.max(1, Math.round((1.5 + i * .3 + 2 * e) * (1.1 + .5 * Math.sin(T * 5 + i))))), fx + (i - 1.5) * 4 * e + Math.sin(T * 3 + i) * e, Y + Math.sin(T * 4 + i * 2) * .5);
          x.fillStyle = '#fff';
          for (let i = 0; i < 3; i++) x.fillRect(fx + (i * 6 - 6) * e - sg * 3, Y + 1 + i, (14 - i * 3) * e + 1, .6);
        }
      }
    } else {
      // la queue qui monte, se dresse, ruisselle et replonge sans bruit
      const monte = lisse(k / .34), sort = k < .34 ? monte : k < .62 ? 1 : 1 - lisse((k - .62) / .34) * 1.02;
      const plie = k < .3 ? 2 : k < .4 ? 1 : k < .62 ? 0 : k < .8 ? 1 : 2;
      const q = peintQueue(e, plie), hq = q.height / S;
      const py = Y - hq * sort, tilt = lerp(-.2, .1, k) + Math.sin(T * 1.2 + b.ph) * .012;
      x.save(); x.beginPath(); x.rect(-10, Y - 110, VW() + 20, 110); x.clip();
      x.translate(b.X, Y); x.rotate(tilt); x.translate(0, py - Y);
      x.drawImage(q, -q.width / S / 2, 0);
      x.restore();
      if (sort > .3) {
        // l'eau qui coule des nageoires en filets
        x.fillStyle = 'rgba(235,248,252,.92)';
        const n = Math.round(8 + e * 12);
        for (let i = 0; i < n; i++) {
          const u = (i + .5) / n * 2 - 1, q2 = (T * (1.7 + (i % 3) * .3) + i * .37) % 1, bx = b.X + u * 80 * e / S * 1.0, by = py + hq * (.27 + Math.abs(u) * .08);
          if (by + q2 * (Y - by) < Y) { x.fillRect(bx, by + q2 * (Y - by), .7, Math.max(1, 1.8 + e)); x.fillRect(bx, by + q2 * (Y - by) - 3, .5, 1); }
        }
      }
      const large = (8 + 18 * e) * (sort > .05 ? 1 : .6);
      for (let i = 0; i < 7; i++) pose(x, paquet(Math.max(1, Math.round((1.2 + 3.2 * e) * (1 + .4 * Math.sin(T * 4 + i * 2))))), b.X + (i / 3 - 1) * large + Math.sin(T * 2 + i) * e, Y + Math.sin(T * 3 + i) * .6);
    }
    // le souffle : une colonne de brume qui monte et s'ouvre dans le vent
    for (const p of b.puffs) {
      const v = p.T / p.D, r = Math.max(1, Math.round(p.r * (1 + v * 1.4) * S));
      x.globalAlpha = (1 - v) * .85;
      pose(x, disqueP(Math.min(r, 14), v < .45 ? '#ffffff' : '#dcecf4'), p.x, p.y + cam);
    }
    x.globalAlpha = 1;
    if (b.etat === 'dos' && k < .5) { x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) x.fillRect(trouSortie(b)[0] + Math.sin(T * 12 + i) * e * 2, trouSortie(b)[1] + cam - i * 2, .7, .7); }
  }

  /* ---- Des baleines qui sortent au large : plusieurs rangees, de temps en temps. arg : plan de mer, taille, y, attente ---- */
  FX.souffles = (sc, arg) => {
    const [n = 0, e = .4, yE = 140, att = 5, coule = 0] = (arg || '').split(',').map(Number);
    const i = V.plan(sc, 'mer', n), f = sc.plans[i].f;
    let b = null, attente = rnd(.5, 2);
    // la place du bateau (FX.catamaran_large la tient a jour) : on n'y fait pas sortir de baleine
    const libre = X => !sc.bateau || Math.abs(X - sc.bateau.x) > sc.bateau.l / 2 + 70 * e + 30;
    return {
      plan: i,
      maj(dt) {
        const dep = -V.defile(sc, i) * dt;
        if (!b) {
          attente -= dt;
          if (attente <= 0) {
            let X = rnd(70, VW() - 40);
            for (let q = 0; q < 6 && !libre(X); q++) X = rnd(70, VW() - 40);
            if (!libre(X)) { attente = .5; return; }
            b = nouvelleSortie({ X, e: e * rnd(.9, 1.1), yEau: yE + rnd(-3, 3), dur: rnd(6.5, 8.5), queue: false, coule: !!coule });
          }
          return;
        }
        majSortie(b, dt, dep);
        if (b.fin || b.X < -100) { b = null; attente = rnd(att * .6, att * 1.5); }
      },
      draw(x, d, cam, T) { if (b) dessineSortie(x, b, cam, T); },
      get sortie() { return b; },   // lu par tests/souffle.js
    };
  };
  /* Le sujet qu'on filme est une baleine dessinee ici : le sprite du jeu ne donne que le cadre. mode : 'dos' ou 'queue' */
  FX.sujet_baleine = (sc, arg) => {
    const [sorte, e = 1, coule = 0] = (arg || 'dos,1').split(',');
    let b = null;
    const lance = () => nouvelleSortie({ X: 0, e: +e, yEau: 194, sorte: sorte === 'queue' ? 'bosse' : 'rorqual', queue: sorte !== 'dos', etat: sorte === 'queue' ? 'queue' : 'dos', dur: sorte === 'queue' ? 5 : 7.5, coule: +coule > 0 });
    return {
      couche: 'sol',
      maj(dt) {
        const w = G.Jeu.w(), s = w && w.sujet;
        if (!s) { b = null; return; }
        if (!b || b.fin) b = lance();
        // la baleine suit le sujet AVANT de souffler, et son souffle la suit : il part de l'event et reste colle a elle
        const dx = s.x - b.X, dy = s.y - 6 - b.yEau;
        b.X = s.x;
        b.yEau = s.y - 6;
        for (const p of b.puffs) { p.x += dx; p.y += dy; }
        majSortie(b, dt, 0);
      },
      draw(x, d, cam, T) { if (b) dessineSortie(x, b, cam, T); },
      get sortie() { return b; },   // lu par tests/souffle.js
    };
  };

  /* ---- La queue qui sort : re_baleine2, aux deuxieme et troisieme plans ---- */
  FX.queues = (sc, arg) => {
    const [n = 0, e = .4, y0 = 140, y1 = 150, att = 6] = (arg || '').split(',').map(Number);
    const i = V.plan(sc, 'mer', n);
    let b = null, attente = rnd(.2, 2.5);
    return {
      plan: i,
      maj(dt) {
        if (!b) { attente -= dt; if (attente <= 0) b = nouvelleSortie({ X: rnd(60, VW() - 30), e: e * rnd(.88, 1.12), yEau: rnd(y0, y1), etat: 'queue', dur: rnd(4.2, 5.4), sorte: 'bosse', queue: false }); return; }
        majSortie(b, dt, -V.defile(sc, i) * dt);
        if (b.fin || b.X < -80) { b = null; attente = rnd(att * .5, att * 1.4); }
      },
      draw(x, d, cam, T) { if (b) dessineSortie(x, b, cam, T); },
    };
  };

  /* ---- Le catamaran au large : il tangue, sa vague d'etrave vit, ses passagers saluent le drone ---- */
  FX.catamaran_large = (sc, arg) => {
    const [n = 0, yE = 158, att = 10] = (arg || '').split(',').map(Number);
    const i = V.plan(sc, 'mer', n);
    let X = 390, attente = 0;
    const v0 = 12;
    return {
      plan: i,
      maj(dt) {
        const sp = D.spr('catamaran_panda', 'l'), w = G.Jeu.w();
        sc.bateau = attente > 0 ? null : { x: X, l: sp.w };
        if (attente > 0) { attente -= dt; if (attente <= 0) X = VW() + sp.w / 2 + 40; return; }
        // la baleine qu'on filme passe devant : le bateau ne rentre pas dans l'image tant qu'elle est la
        if (w && w.sujet && X > VW() + sp.w / 2 - 10) return;
        X += (v0 - V.defile(sc, i)) * dt;
        if (X < -sp.w / 2 - 50) attente = att;
      },
      draw(x, d, cam, T) {
        if (attente > 0) return;
        const sp = D.spr('catamaran_panda', 'l');
        if (!sp.ok) return;
        const Y = yE + cam + Math.sin(T * 1.1) * .9;
        // son reflet, sombre et tremble
        x.globalAlpha = .24;
        for (let q = 0; q < 10; q++) { x.fillStyle = '#0a2e58'; x.fillRect(X - sp.w * .42 + Math.sin(T * 2 + q) * 1.5, Y + 1 + q * 1.2, sp.w * .84 - q * 4, .8); }
        x.globalAlpha = 1;
        x.drawImage(sp.img, X - sp.w / 2, Y - sp.h + 5);
        // l'etrave ouvre l'eau, le sillage s'en va derriere
        // l'etrave de chaque coque ouvre l'eau, le sillage s'en va derriere les deux poupes
        const av = X + sp.w * .34, ar = X - sp.w * .42;
        for (let q = 0; q < 4; q++) pose(x, paquet(1 + (q % 2)), X + sp.w * .41 - q * 3 + Math.sin(T * 3 + q), Y - 33 + Math.sin(T * 5 + q) * .3);
        for (let q = 0; q < 6; q++) pose(x, paquet(1 + (q % 3) + (Math.sin(T * 5 + q) > 0 ? 1 : 0)), av - q * 4 + Math.sin(T * 3 + q), Y + .6 + q * .1);
        x.fillStyle = '#fff';
        for (let q = 0; q < 9; q++) { const yy = Y + 1 + (q % 3), l = 10 - q * .8; x.fillRect(ar - q * 8 - (T * 12 % 8), yy, l, .6); }
        for (let q = 0; q < 5; q++) pose(x, paquet(1 + (q + (T * 3 | 0)) % 2), ar - q * 3, Y + .5);
        // ils saluent le drone quand il passe
        const dr = V.drone();
        if (dr && Math.abs(dr.x - X) < 110) { const up = Math.sin(T * 9) > 0 ? 0 : 1; x.fillStyle = '#e8b48a'; for (const px of [172, 188]) x.fillRect(X + (px - 225) / S, Y - 42 - up, .8, 4 + up); }
      },
    };
  };

  /* ---- Sous l'eau, la surface en haut de l'image : un miroir qui ondule ; le rorqual monte respirer, le zodiac tente de l'approcher ---- */
  const peintZodiac = e => garde('zod' + e, () => {
    const W_ = Math.ceil(100 * e), H_ = Math.ceil(46 * e), t = toile(W_, H_), P_ = (a, b) => [a * e, H_ - b * e], K = '#17151f';
    // moteur a gauche (il va vers la gauche, le nez a droite est retourne a la pose)
    t.r(2 * e, H_ - 26 * e, 8 * e, 10 * e, '#23252e'); t.r(5 * e, H_ - 16 * e, 3 * e, 12 * e, '#3a3f4a');
    // le monde a bord
    const gens = [[26, '#ff8a2e', '#e8b48a'], [44, '#2f6fd0', '#c98a5e'], [60, '#ff8a2e', '#8a5a3c']];
    for (const [a, c, p] of gens) { t.r(a * e, H_ - 28 * e, 9 * e, 13 * e, c); t.disque((a + 4.5) * e, H_ - 32 * e, 3.6 * e, p); t.r((a + 1) * e, H_ - 36.6 * e, 7 * e, 2 * e, '#2a2018'); }
    t.r(70 * e, H_ - 26 * e, 4 * e, 10 * e, '#a8b0b8'); t.r(68 * e, H_ - 28 * e, 9 * e, 3 * e, '#a8d8e8');
    // le boudin blanc, relevé a l'avant
    t.poly([P_(8, 8), P_(80, 8), P_(98, 20), P_(92, 25), P_(70, 18), P_(10, 18), P_(6, 14)].map(q => [q[0] - 1, q[1] + 1]), K);
    t.poly([P_(8, 7), P_(80, 7), P_(97, 20), P_(92, 24), P_(70, 18), P_(10, 18), P_(6, 14)], '#f4f6f4');
    t.poly([P_(10, 15), P_(70, 15), P_(90, 22), P_(92, 24), P_(70, 18), P_(10, 18)], '#ffffff');
    t.poly([P_(8, 7), P_(80, 7), P_(88, 12), P_(10, 11)], '#c8d4dc');
    for (let i = 0; i < 4; i++) t.r((20 + i * 18) * e, H_ - 18 * e, 1, 11 * e, '#b0bcc6');
    // la coque rigide, dessous
    t.poly([P_(10, 7), P_(82, 7), P_(66, 1), P_(14, 1)], '#3a4a5e');
    return t;
  });
  const ligneSurface = 21, ZL = 36, PERCHE = 20, PERCHE_X = 7, PERCHE_Y = 11, ZENFONCE = 2;
  /* L'event d'un rorqual dessine en sprite, lu dans l'image d'animation du moment (pas de coordonnees en dur : le sprite peut etre
     redessine, agrandi, retourne). La tete est le bout le plus epais ; l'event est sur le dos, a un quart de la longueur derriere
     le museau. Rend [u, v] : sa place en fractions de l'image. */
  const EVENTS = new WeakMap();
  const eventDe = img => {
    let r = EVENTS.get(img);
    if (r) return r;
    const w = img.width, h = img.height, c = G.mk(w, h);
    c.x.drawImage(img, 0, 0);
    const a = c.x.getImageData(0, 0, w, h).data, haut = new Int32Array(w).fill(-1), ep = new Int32Array(w);
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (a[(j * w + i) * 4 + 3] > 127) { if (haut[i] < 0) haut[i] = j; ep[i]++; }
    let x0 = 0, x1 = w - 1;
    while (x0 < w - 1 && haut[x0] < 0) x0++;
    while (x1 > x0 && haut[x1] < 0) x1--;
    const L = x1 - x0 + 1, bout = Math.max(2, L * .12 | 0);
    let g = 0, d = 0;
    for (let q = 0; q < bout; q++) { g += ep[x0 + q]; d += ep[x1 - q]; }
    let ix = Math.round(d >= g ? x1 - L * .24 : x0 + L * .24);
    while (haut[ix] < 0 && ix > x0) ix--;
    r = [(ix + .5) / w, Math.max(0, haut[ix]) / h];
    EVENTS.set(img, r);
    return r;
  };
  FX.surface_rorqual = sc => {
    const i = Math.max(1, V.plan(sc, 'recif', 0)), l = 256, f = .2;
    const NS = Math.ceil(VW() * S / 4) + 1;
    const toitTex = garde('toit_eau', () => {
      const c = G.mk(l, 56), im = c.x.createImageData(l, 56), d = im.data;
      const T = [[230, 250, 255], [176, 226, 246], [120, 190, 232], [84, 158, 214], [58, 128, 192]];
      for (let j = 0; j < 56; j++) for (let k = 0; k < l; k++) {
        const v = j / 55, n = Math.sin(k * .1 + Math.sin(j * .3 + k * .03) * 2.4) * .5 + Math.sin(k * .037 + j * .11) * .5;
        const q = clamp(v * 4.2 + n * .55 + BAYER[j & 3][k & 3] / 16 * .6 - .2, 0, 4.2);
        const o = (j * l + k) * 4;
        if (q >= 4) { d[o + 3] = 0; continue; }
        const c0 = T[q | 0]; d[o] = c0[0]; d[o + 1] = c0[1]; d[o + 2] = c0[2]; d[o + 3] = 255;
        // le bas du miroir se defait en trame : on ne voit plus de bord
        if (j > 34 && BAYER[j & 3][k & 3] / 16 < (j - 34) / 22) d[o + 3] = 0;
      }
      c.x.putImageData(im, 0, 0);
      return c;
    });
    const haut = new Float32Array(NS);
    let dSc = 0, Tl = 0;
    const baleine = { actif: false, x: 0, t: 0, attente: rnd(.5, 2.5), puffs: [], bulles: [] };
    const zod = { x: -120, v: 0, on: true };
    const nivSurface = xx => haut[clamp(Math.round(xx * S / 4), 0, NS - 1)];
    return {
      plan: i,
      baleine, zod,   // lus par tests/souffle.js et tests/zodiac.js
      maj(dt, d) {
        Tl += dt; dSc = d * f;
        for (let q = 0; q < NS; q++) { const X = q * 4 / S + dSc; haut[q] = ligneSurface + Math.sin(X * .05 + Tl * 1.2) * 1.3 + Math.sin(X * .13 - Tl * 1.9) * .6; }
        const b = baleine, dep = V.defile({ plans: [{ f }] }, 0);
        const w = G.Jeu.w();
        if (!b.actif) {
          b.attente -= dt;
          if (b.attente <= 0 && !(w && w.sujet)) { b.actif = true; b.x = -110; b.t = 0; b.souffle = 0; }
        } else {
          // elle traverse l'image : elle remonte, reste un peu en surface, souffle, puis replonge
          const milieu = VW() * .56, sv = Math.abs(b.x - milieu) < 24 ? 12 : 44, ax = b.x, ay = b.y;
          b.x += sv * dt;
          const u = (b.x - milieu) / (VW() * .55);
          const prof = Math.pow(Math.abs(u), 1.5) * 122;
          b.y = ligneSurface + 9 + clamp(prof, 0, 150);
          b.ang = clamp((u >= 0 ? 1 : -1) * Math.sqrt(Math.abs(u)) * .35, -.32, .32);
          // le souffle deja parti suit la baleine : il reste colle a elle (Max, 03/11/2026)
          if (ay !== undefined) for (const p of b.puffs) { p.x += b.x - ax; p.y += b.y - ay; }
          const pres = Math.abs(b.x - milieu);
          // l'event : lu dans l'image du sprite du moment, puis tourne avec le corps (dessin : translate, rotate, drawImage centre)
          const spE = D.spr('rorqual', 'l'), ev = spE.ok ? eventDe(spE.img) : [.76, .18], lx = (ev[0] - .5) * (spE.w || 150), ly = (ev[1] - .5) * (spE.h || 36);
          if (pres < 34 && b.souffle < 1) { b.souffle += dt / 1.3; const hx = b.x + lx * Math.cos(b.ang) - ly * Math.sin(b.ang), hy = b.y + lx * Math.sin(b.ang) + ly * Math.cos(b.ang); for (let q = 0; q < 3; q++) if (Math.random() < dt * 70) b.puffs.push({ x: hx + rnd(-1.4, 1.4), y: hy, x0: hx, y0: hy, bx: b.x, vx: rnd(-8, 6), vy: rnd(-120, -70), T: 0, D: rnd(.4, .8), r: rnd(1.2, 3) }); for (let q = 0; q < 1; q++) if (Math.random() < dt * 30) b.bulles.push({ x: b.x + 40 + rnd(-50, 30), y: ligneSurface + 10, v: rnd(10, 24), T: rnd(.6, 1.3) }); }
          if (b.x > VW() + 130) { b.actif = false; b.attente = rnd(7, 13); }
        }
        for (const p of b.puffs) { p.T += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 1 - dt * 2; }
        b.puffs = b.puffs.filter(p => p.T < p.D);
        for (const p of b.bulles) { p.T -= dt; p.y -= p.v * dt; }
        b.bulles = b.bulles.filter(p => p.T > 0 && p.y > ligneSurface);
        // le zodiac file vers la baleine des qu'elle monte, perche tendue, et ne la touche jamais
        const queue = b.x - (D.spr('rorqual', 'l').w || 170) / 2, garde_ = ZL / 2 + PERCHE + 8;
        const cible = b.actif && b.y < 110 ? Math.min(queue - garde_ + 4, VW() - 40) : zod.x + (b.actif ? 0 : -8);
        const dv = clamp(cible - zod.x, -72, 72);
        zod.v = lerp(zod.v, dv, Math.min(1, dt * 1.1));
        zod.x += zod.v * dt;
        // devant la queue (une baleine qui arrive par la gauche, ou qui le rattrape) : il recule a pleine vitesse, sans jamais
        // sauter. L'ancien « zod.x = min(zod.x, queue - garde) » le teleportait hors de l'image (Max, 03/11/2026 : « le zodiac
        // disparait d'un coup parfois »). Il recule pendant que la baleine est encore au fond : il ne la touche toujours pas.
        if (b.actif && zod.x > queue - garde_) { const rec = Math.min(zod.x - (queue - garde_), 120 * dt); zod.x -= rec; zod.v = Math.min(zod.v, -rec / dt); }
        else if (!b.actif) zod.x -= dep * .4 * dt;
        if (zod.x < -120) { zod.x = -120; zod.v = 0; }
      },
      draw(x, d, cam, T) {
        const c = cam * .6, b = baleine;
        // au-dessus : l'air, tres clair
        x.fillStyle = '#8fc8ea'; x.fillRect(0, -14, VW(), ligneSurface + 16 + c);
        x.fillStyle = '#6fb4e0'; x.fillRect(0, -14, VW(), 14 + ligneSurface * .45 + c);
        x.fillStyle = '#b8e0f2'; x.fillRect(0, ligneSurface - 5 + c, VW(), 1.6);
        // le miroir de la surface, vu de dessous, tranche par tranche
        const off = Math.round(dSc * S + T * 9);
        for (let q = 0; q < NS; q++) {
          const sx = Math.min((((q * 4 + off) % l) + l) % l, l - 4), yp = Math.round((haut[q] + c) * S);
          x.drawImage(toitTex, sx, 0, 4, 56, q * 4 / S, yp / S, 4 / S, 56 / S);
        }
        // le trait de la surface, brillant
        x.fillStyle = '#ffffff';
        for (let q = 0; q < NS; q++) if ((q * 5 + (T * 3 | 0)) % 9 < 7) x.fillRect(q * 4 / S, haut[q] + c - .6, 4 / S, .7);
        // le rorqual
        if (b.actif) {
          const sp = D.spr('rorqual', 'l');
          if (sp.ok) {
            x.save(); x.imageSmoothingEnabled = false; x.translate(Math.round(b.x * S) / S, Math.round((b.y + c) * S) / S); x.rotate(b.ang);
            // le rorqual redessine (03/11/2026) regarde vers la droite, ou il nage : plus de miroir (l'ancien regardait a gauche)
            x.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
            x.restore();
          }
          x.fillStyle = 'rgba(230,250,255,.8)';
          for (const p of b.bulles) x.fillRect(p.x, p.y + c, 1.2, 1.2);
          if (b.y < ligneSurface + 16) for (let q = 0; q < 6; q++) pose(x, paquet(1 + ((q + (T * 4 | 0)) % 2)), b.x - 52 + q * 18, ligneSurface + c + Math.sin(T * 3 + q) * .6);
        }
        for (const p of b.puffs) { x.globalAlpha = 1 - p.T / p.D; pose(x, disqueP(Math.max(1, Math.round(p.r * S * (1 + p.T))), '#ffffff'), p.x, p.y + c); }
        x.globalAlpha = 1;
        // le zodiac, pose sur la surface, le nez vers la baleine
        if (zod.x > -110 && zod.x < VW() + 60) {
          const sp = D.spr('zodiac_blanc', 's'), Y = nivSurface(clamp(zod.x, 0, VW())) + c, vite = Math.abs(zod.v) > 18, gx = Math.round(zod.x * S / 2) * 2 / S, gy = Math.round((Y + Math.sin(T * 1.6) * .5) * S / 2) * 2 / S;
          for (const [dx, nom] of [[-3, 'biologiste2'], [5, 'biologiste']]) { x.save(); x.translate(gx + dx, gy - sp.h * .32 + ZENFONCE); x.scale(.4, .4); G.dollDraw(x, nom, 'neutre', T, 0, 0, false); x.restore(); }
          if (sp.ok) x.drawImage(sp.img, gx - sp.w / 2, gy - sp.h + ZENFONCE);
          // la perche et sa petite balise : le biologiste la tend vers le dos du rorqual
          const tend = b.actif && b.y < 70 ? 1 : 0, mx = gx + PERCHE_X, my = gy - PERCHE_Y, ang = (tend ? -.1 : -.5) + Math.sin(T * 2.2) * .02, GR = 2 / S;
          const lx = Math.cos(ang) * PERCHE, ly = Math.sin(ang) * PERCHE;
          for (let q = 0; q <= PERCHE; q += 1.2) { const a_ = Math.round((mx + lx * q / PERCHE) / GR) * GR, b_ = Math.round((my + ly * q / PERCHE) / GR) * GR; x.fillStyle = '#23252e'; x.fillRect(a_, b_ - GR * .5, GR, GR * 1.5); x.fillStyle = '#c8ccd0'; x.fillRect(a_, b_ - GR * .5, GR, GR * .5); }
          const tx = Math.round((mx + lx) / GR) * GR, ty = Math.round((my + ly) / GR) * GR;
          x.fillStyle = '#0c0c12'; x.fillRect(tx, ty - GR * 1.5, GR * 4, GR * 3); x.fillRect(tx + GR, ty - GR * 3.5, GR * .5, GR * 2);
          x.fillStyle = '#ff3b3b'; if (T % 1 < .15) x.fillRect(tx + GR * 2.5, ty - GR, GR, GR);
          if (vite) {
            for (let q = 0; q < 6; q++) pose(x, paquet(1 + (q % 2)), gx - sp.w * .5 - q * 7, Y + .6 + Math.sin(T * 7 + q) * .5);
            x.fillStyle = '#fff';
            for (let q = 0; q < 3; q++) x.fillRect(gx - sp.w * .5 - 8 - q * 11 - 9, Y + 1, 9 - q * 2, .6);
            pose(x, paquet(2), gx + sp.w * .42, Y + .4);
          }
        }
      },
    };
  };

  /* ---- Le baleineau : il nage colle a sa mere (le sujet du decor), et une mere et son petit passent au loin ---- */
  const nageSprite = (x, sp, X, Y, T, ampl, inverse) => {
    if (sp.anime) { x.save(); x.translate(X, Y); if (inverse) x.scale(-1, 1); x.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h); x.restore(); return; }
    const nw = sp.img.width, pas = 3;
    x.save(); x.translate(X, Y); if (inverse) x.scale(-1, 1);
    for (let q = 0; q < nw; q += pas) {
      const kq = 1 - q / nw, dy = Math.sin(q / S * .05 - T * 3.4) * ampl * (kq * kq * .9 + .1);
      x.drawImage(sp.img, q, 0, pas, sp.img.height, -sp.w / 2 + q / S, -sp.h / 2 + dy, pas / S, sp.h);
    }
    x.restore();
  };
  FX.baleineau = sc => {
    const i = Math.max(1, V.plan(sc, 'recif', 1));
    let fond = { x: VW() + 130, attente: rnd(2, 5), y: 96 };
    return {
      couche: 'sol',
      maj(dt) {
        if (fond.attente > 0) { fond.attente -= dt; if (fond.attente <= 0) { fond.x = VW() + 110; fond.y = rnd(70, 128); } return; }
        fond.x -= (V.defile(sc, i) + 14) * dt;
        if (fond.x < -130) fond.attente = rnd(9, 16);
      },
      draw(x, d, cam, T) {
        const w = G.Jeu.w(), s = w && w.sujet;
        if (s && s.s === 'baleine') {
          const sm = D.spr('baleine', 'l'), sp = D.spr('baleine', 's');
          if (sm.ok && sp.ok) {
            // il se tient contre le flanc, sous le ventre, et bat un peu plus vite que sa mere
            const X = s.x + sm.w * .16 + Math.sin(T * .7) * 7, Y = s.y + cam + sm.h * .46 + Math.sin(T * 1.1) * 2.5;
            nageSprite(x, sp, X, Y, T * 1.35, 2.2);
          }
        }
        if (fond.attente <= 0) {
          const sm = D.spr('baleine', 's'), sp = D.spr('baleine', 's');
          if (sm.ok) {
            x.globalAlpha = .62;
            nageSprite(x, sm, fond.x, fond.y + cam * .4, T, 2);
            x.save(); x.translate(fond.x + 22, fond.y + cam * .4 + 18); x.scale(.42, .42); nageSprite(x, sm, 0, 0, T * 1.4, 2); x.restore();
            x.globalAlpha = 1;
          }
        }
      },
    };
  };

  /* ---- Les speedboats : coque rouge a boudins, passagers en gilets, sillage qui vit, sauts sur la houle ---- */
  const peintBoat = (e, ton) => garde('boat' + e + ton, () => {
    // une vedette vue de profil : coque en lame, proue haute, pare-brise couche, un ou deux pilotes, hors-bord a l'arriere
    const W_ = Math.ceil(176 * e), H_ = Math.ceil(66 * e), t = toile(W_, H_), P_ = (a, b) => [a * e, H_ - b * e], K = '#17151f';
    const [coque, ligne, bas, veste] = [['#f6f6f0', '#d8342a', '#3a2a30', '#ff7a1e'], ['#1f3a6a', '#f2f2ec', '#10203e', '#ffd23c'], ['#f6f6f0', '#ff8a1e', '#1f3a5a', '#2f6fd0']][ton];
    const creux = [P_(14, 22), P_(98, 25), P_(140, 30), P_(100, 22), P_(14, 20)];
    // les pilotes, assis derriere le pare-brise : le second seulement sur les bateaux 0 et 2
    const pilote = (a) => {
      t.r((a - 2) * e, H_ - 38 * e, 4 * e, 16 * e, '#23252e');
      t.poly([P_(a, 24), P_(a + 11, 24), P_(a + 10, 39), P_(a + 1, 39)], veste);
      t.poly([P_(a + 8, 36), P_(a + 18, 33), P_(a + 18, 31), P_(a + 8, 32)], veste);
      t.disque((a + 5.5) * e, H_ - 44 * e, Math.max(1, 4.4 * e), '#e0a878');
      t.poly([P_(a + .5, 45), P_(a + 3, 49.5), P_(a + 9, 49.5), P_(a + 11, 46), P_(a + 14, 45)], ton === 1 ? '#f2f2ec' : '#23252e');
    };
    if (ton !== 1) pilote(46);
    pilote(68);
    // le hors-bord
    t.poly([P_(0, 22), P_(13, 24), P_(13, 42), P_(3, 42), P_(0, 36)], K);
    t.poly([P_(1.5, 26), P_(11.5, 27), P_(11.5, 40), P_(4, 40), P_(1.5, 35)], '#2c2e38');
    t.poly([P_(4, 38), P_(11, 38), P_(11, 40), P_(4, 40)], '#8a94a0');
    t.poly([P_(5, 1), P_(9, 1), P_(11, 24), P_(6, 24)], '#3a3f4a');
    // le pare-brise, couche vers l'arriere
    t.poly([P_(104, 25), P_(86, 46), P_(80, 46), P_(92, 25)].map(q => [q[0] + 1, q[1] - 1]), K);
    t.poly([P_(103, 26), P_(85, 45), P_(81, 45), P_(93, 26)], '#3f7a9c');
    t.poly([P_(98, 26), P_(92, 34), P_(88, 34), P_(94, 26)], '#b8e4f2');
    // la coque : du tableau a l'arriere jusqu'a la proue en lame, relevee
    const forme = [P_(12, 25), P_(98, 27), P_(174, 44), P_(150, 28), P_(112, 8), P_(92, 3), P_(14, 3)];
    t.poly(forme.map(q => [q[0], q[1] - 1]), K); t.poly(forme.map(q => [q[0] - 1, q[1] + 1]), K); t.poly(forme.map(q => [q[0] + 1, q[1] + 1]), K);
    t.poly(forme, coque);
    // l'oeuvre vive, sombre, qui remonte vers l'avant
    t.poly([P_(14, 3), P_(92, 3), P_(112, 8), P_(128, 17), P_(106, 12), P_(90, 9), P_(14, 9)], bas);
    // la bande de course
    t.poly(creux, ligne);
    // le pont avant, clair, et le lisere de la coque
    t.poly([P_(98, 27), P_(174, 44), P_(160, 36), P_(100, 25)], ton === 1 ? '#3f5f94' : '#ffffff');
    t.poly([P_(14, 18), P_(96, 18), P_(96, 16), P_(14, 16)], ton === 1 ? '#2f5288' : '#c8ccd0');
    return t;
  });
  FX.speedboats = (sc, arg) => {
    const i = V.plan(sc, 'mer', 0);
    const B = [[122, .34, 0, 34], [130, .42, 2, 44], [142, .58, 1, 58], [166, .84, 0, 82]].map(([y, e, ton, v]) => ({ y, e, ton, v, x: rnd(VW()), saut: 0, vy: 0, h: 0, ang: 0, dep: rnd(1, 6), ph: rnd(9), gerbes: [] }));
    const T1 = ['#7fb4d8', '#5a9cc8', '#3f84bc', '#2f70ac', '#245ea0'], T2 = ['#6ea8d0', '#4a8cc0', '#2f76b0', '#2464a4', '#1c5496'];
    const rows = [bandeEau('spd1', 136, 3.4, T1, .1, 4), bandeEau('spd2', 158, 6.5, T2, .17, 4)];
    let Tl = 0;
    return {
      plan: i,
      maj(dt, d) {
        const dep = V.defile(sc, i);
        Tl += dt; for (const r of rows) r.maj(d, Tl);
        for (const b of B) {
          // le bateau suit le relief de sa rangee
          const ro = b.y > 152 ? rows[1] : b.y > 134 ? rows[0] : null;
          b.yH = ro ? ro.haut(b.x) - (b.y > 152 ? 158 : 136) : 0;
          b.pente = ro ? (ro.haut(b.x + 16) - ro.haut(b.x - 16)) / 32 : 0;
          b.x += (b.v * (1 + b.e * .2) - dep * (b.e * 2.2)) * dt;
          if (b.x > VW() + 90) { b.x = -90 - rnd(0, 200); b.dep = rnd(1, 5); }
          if (b.x < -300) b.x = VW() + 80;
          b.dep -= dt;
          if (b.dep <= 0 && !b.saut && b.x > 0) { b.saut = 1; b.vy = -rnd(62, 104) * b.e; b.dep = rnd(2.5, 6); }
          if (b.saut) {
            b.vy += 165 * b.e * dt; b.h += -b.vy * dt;
            b.ang = lerp(b.ang, b.vy < 0 ? -.3 : .16, Math.min(1, dt * 4));
            if (b.h <= 0 && b.vy > 0) { b.h = 0; b.saut = 0; for (let q = 0; q < 22; q++) b.gerbes.push({ x: b.x + rnd(-40, 40) * b.e, y: 0, vx: rnd(-40, 30) * b.e, vy: rnd(-95, -24) * b.e, T: rnd(.3, .7), r: q < 5 ? irnd(1, 3) : 0 }); }
          } else b.ang = Math.abs(b.ang) < .02 ? 0 : lerp(b.ang, 0, Math.min(1, dt * 5));
          for (const g of b.gerbes) { g.T -= dt; g.x += (g.vx - b.v * .5) * dt; g.y += g.vy * dt; g.vy += 180 * b.e * dt; }
          b.gerbes = b.gerbes.filter(g => g.T > 0);
        }
      },
      draw(x, d, cam, T) {
        let nr = 0;
        for (const b of B) {
          // les rangees d'eau passent devant ce qui est plus loin
          if (nr === 0 && b.y > 134) { rows[0].draw(x, cam * .3, Tl); nr = 1; }
          if (nr === 1 && b.y > 152) { rows[1].draw(x, cam * .3, Tl); nr = 2; }
          const e = b.e, houle = (b.yH || 0) + Math.sin(T * 1.7 + b.ph) * .5 * e, Y = b.y + cam + houle;
          if (b.x > VW() + 70 || b.x < -120) continue;
          // le sillage : deux bandes qui s'ouvrent derriere, de l'ecume qui bouillonne au moteur
          const dH = b.saut ? 1 - Math.min(1, b.h / (18 * e)) : 1, lS = 170 * e, Lb = 176 * e / S;
          const poupe = b.x - Lb / 2, proue = b.x + Lb * .2, ph = T * 3.2 + b.ph;
          const gerbeV = (cote) => {
            // un bras du V : l'eau part de l'etrave, monte, puis retombe en arriere
            const n = 11;
            for (let q = 0; q < n; q++) {
              const u = ((q / n + ph) % 1), xx = proue + (cote < 0 ? 3 : 0) * e - u * 36 * e, yy = Y + cote * u * 8 * e - Math.sin(Math.PI * Math.min(1, u * 1.2)) * (cote < 0 ? 19 : 9) * e;
              const r = Math.max(1, Math.round((1 - u * .75) * (1.2 + 3.8 * e)));
              pose(x, paquet(r), xx, yy);
            }
            x.fillStyle = '#ffffff';
            for (let q = 0; q < 7; q++) { const u = ((q / 7 + ph * 1.4 + .3) % 1); x.fillRect(proue - u * 42 * e, Y + cote * u * 9 * e - Math.sin(Math.PI * u) * (cote < 0 ? 28 : 15) * e, .8, .8); }
          };
          if (dH > .02) {
            x.fillStyle = '#ffffff';
            for (let q = 0; q < 12; q++) {
              const u = q / 12, xx = poupe - u * lS, ww = (6 + u * 12) * e + .6, yo = u * 9 * e;
              if (((q * 3 + (T * 12 | 0)) % 4) === 3) continue;
              x.fillRect(xx - ww, Y + yo * .4 + 1, ww, .7);
              x.fillRect(xx - ww * .7, Y - yo * .3, ww * .7, .6);
            }
            for (let q = 0; q < 8; q++) pose(x, paquet(Math.max(1, Math.round((3.6 - q * .32) * (e * 1.3 + .2) * (1 + .3 * Math.sin(T * 9 + q))))), poupe - q * 8 * e, Y + 1 + Math.sin(T * 6 + q * 2) * .5);
            gerbeV(-1);
          } else {
            // en l'air : son ombre passe sur l'eau
            x.fillStyle = 'rgba(16,40,80,.28)'; x.fillRect(b.x - 44 * e, Y + 1, 88 * e, 1.2);
          }
          const im = peintBoat(Math.round(e * 100) / 100, b.ton);
          x.save(); x.translate(b.x, Y - b.h); if (b.ang) x.rotate(b.ang); x.drawImage(im, -im.width / S / 2, -im.height / S + 1.6 * e); x.restore();
          if (dH > .02) gerbeV(1);
          for (const g of b.gerbes) {
            if (g.r) pose(x, paquet(g.r), g.x, Y + g.y);
            else { x.fillStyle = '#fff'; x.fillRect(g.x, Y + g.y, .8, .8); }
          }
        }
      },
    };
  };

  /* ---- Les barques de Djerba au deuxieme plan : elles bercent, leur toile bat, le reflet tremble ---- */
  FX.barques = (sc, arg) => {
    const i = V.plan(sc, 'mer', 1);
    const per = 960;
    // jamais deux fois le meme bateau cote a cote : les bateaux a toit des touristes, et trois barques de peche
    const L = [[60, 138, 'barque_djerba1'], [250, 150, 'barque_a'], [430, 144, 'barque_djerba2'], [610, 152, 'barque_b'], [760, 142, 'barque_c'], [900, 148, 'barque_djerba1']].map(b => D.existe(b[2]) ? b : [b[0], b[1], 'barque_djerba1']);
    return {
      plan: i,
      draw(x, d, cam, T) {
        const f = .13;
        for (let n = 0; n < L.length; n++) {
          const [X0, Y0, s] = L[n], sp = D.spr(s, 'l');
          if (!sp.ok) continue;
          const X = (((X0 - d * f) % per) + per) % per - 110;
          if (X > VW() + 110) continue;
          const Y = Y0 + cam + Math.sin(T * 1.2 + n * 2) * 1.1;
          // le reflet
          x.fillStyle = 'rgba(10,70,90,.26)';
          for (let q = 0; q < 7; q++) x.fillRect(X - sp.w * .46 + Math.sin(T * 2 + q + n) * 1.2, Y + .5 + q * 1.4, sp.w * .92 - q * 3, .9);
          x.fillStyle = 'rgba(255,255,255,.5)';
          for (let q = 0; q < 3; q++) x.fillRect(X - sp.w * .3 + q * 22 + Math.sin(T * 2 + q) * 2, Y + 2 + q, 14, .6);
          x.save(); x.translate(X, Y); x.drawImage(sp.img, -sp.w / 2, -sp.h + 4);
          x.restore();
          // le clapot au bord de la coque
          x.fillStyle = '#ffffff';
          for (let q = 0; q < 6; q++) x.fillRect(X - sp.w * .4 + q * 16 + Math.sin(T * 3 + q) * 2, Y + .3 + Math.sin(T * 4 + q) * .3, 7, .6);
        }
      },
    };
  };

  /* ---- Les serpents tricot : un tube rond et luisant, anneaux orange et blancs, l'onde court le long du corps, sur une grille de gros pixels ---- */
  // un segment du corps : un rond ombre, clair sur le dessus, cerne de sombre, en gros pixels
  const anneau = (r, tons) => garde('ann' + r + tons[0], () => {
    const A = 2, n = r * 2 + 3, t = toile(n, n), c = r + 1;
    t.disque(c, c, r + 1, '#2a1620');
    t.disque(c, c, r, tons[2]);
    t.disque(c, c - r * .22, r * .8, tons[1]);
    t.disque(c - r * .1, c - r * .5, Math.max(1, r * .34), tons[0]);
    const o = G.mk(n * A, n * A);
    o.x.imageSmoothingEnabled = false; o.x.drawImage(t, 0, 0, n * A, n * A);
    return o;
  });
  const ORANGE = ['#ffc070', '#f07a20', '#a84410'], BLANC = ['#ffffff', '#f4ead4', '#b8a68c'], SOMBRE = ['#6a3a30', '#3a1c20', '#24121a'];
  const peintTete = (r, sens) => garde('ttricot' + r + sens, () => {
    const A = 2, w = r * 5 + 4, h = r * 3 + 4, t = toile(w, h), cy = h / 2;
    const f = [[1, cy - r * .7], [r * 1.6, cy - r * 1.05], [r * 3.2, cy - r * .85], [r * 4.6, cy - r * .1], [r * 4.4, cy + r * .5], [r * 2.6, cy + r * .95], [1, cy + r * .75]];
    t.poly(f.map(q => [q[0], q[1] - 1]), '#2a1620'); t.poly(f.map(q => [q[0] + 1, q[1] + 1]), '#2a1620');
    t.poly(f, '#c85a16');
    t.poly([[1, cy - r * .7], [r * 1.6, cy - r * 1.05], [r * 3.2, cy - r * .85], [r * 4.2, cy - r * .25], [1, cy - r * .1]], '#f07a20');
    t.poly([[r * .8, cy - r * .85], [r * 2.8, cy - r * .85], [r * 2.8, cy - r * .55], [r * .8, cy - r * .5]], '#ffc070');
    // l'oeil, la bouche
    t.r(r * 2.8, cy - r * .55, Math.max(2, r * .6), Math.max(2, r * .6), '#17151f');
    t.r(r * 2.8, cy - r * .55, 1, 1, '#ffffff');
    t.r(r * 1.6, cy + r * .42, r * 2.6, 1, '#6a2a10');
    const o = G.mk(w * A, h * A);
    o.x.imageSmoothingEnabled = false;
    if (sens < 0) { o.x.translate(w * A, 0); o.x.scale(-1, 1); }
    o.x.drawImage(t, 0, 0, w * A, h * A);
    return o;
  });
  const w_ = r => (r * 2 + 3) * 2 / S;
  FX.tricots = (sc, arg) => {
    const i = V.plan(sc, 'pla', +(arg || 0)), L = [];
    const e = +(arg || 0) === 0 ? 'm' : 'l';
    for (let n = 0; n < 3; n++) L.push({ x: rnd(VW()), dy: rnd(2, 14), v: rnd(14, 24), sens: Math.random() < .5 ? 1 : -1 });
    return {
      plan: i,
      maj(dt) {
        const dep = V.defile(sc, i);
        for (const q of L) { q.x += (q.v * q.sens - dep) * dt; if (q.x < -40) { q.x = VW() + rnd(20, 240); q.sens = Math.random() < .5 ? 1 : -1; } if (q.x > VW() + 280) q.x = -30; }
      },
      // le tricot redessine en pixels fins (« pas jolis, animation pas geniale », Max, 03/11/2026) : une vague court le long
      // du corps (sprite tricot, integrer.onduler) ; il glisse sur le sable dans le sens ou il regarde
      draw(x, d, cam) {
        const sp = D.spr('tricot', e);
        if (!sp.ok) return;
        for (const q of L) {
          if (q.x < -60 || q.x > VW() + 60) continue;
          const sol = D.crete(sc, i, q.x, d) + q.dy + cam * .3;
          const X = Math.round((q.x - sp.w / 2) * S) / S, Y = Math.round((sol - sp.h * .85) * S) / S;
          if (q.sens < 0) { x.save(); x.scale(-1, 1); x.drawImage(sp.img, -X - sp.w, Y, sp.w, sp.h); x.restore(); } else x.drawImage(sp.img, X, Y, sp.w, sp.h);
        }
      },
    };
  };
  /* La tortue qui pond : sa nageoire jette du sable de temps en temps */
  FX.ponte = (sc, arg) => {
    const i = V.plan(sc, 'peint', 0), p = sc.plans[i];
    const X0 = +(arg || 250), L = [];
    let t = 1;
    return {
      plan: i,
      maj(dt, d) {
        t -= dt;
        const X = X0 - d * p.f;
        if (t < 0 && X > -80 && X < VW() + 80) { t = rnd(1.1, 2.6); for (let q = 0; q < 12; q++) L.push({ x: X + 12, y: 168, vx: rnd(-46, -12), vy: rnd(-46, -18), T: rnd(.35, .7) }); }
        for (const q of L) { q.T -= dt; q.x += (q.vx - V.defile(sc, i)) * dt; q.y += q.vy * dt; q.vy += 150 * dt; }
        for (let n = L.length - 1; n >= 0; n--) if (L[n].T <= 0) L.splice(n, 1);
      },
      draw(x, d, cam, T) { x.fillStyle = '#a08a74'; for (const q of L) x.fillRect(q.x, q.y + cam, 1.2, 1.2); },
    };
  };

  /* ---- Les nageoires : peintes au code en gros pixels, dans la palette de l'animal. Douze images par battement ---- */
  const PALMES = { verte: ['#a8c88a', '#5f8a54', '#2f5238', '#14241c'], sombre: ['#6a6a78', '#3a3a46', '#1f1f28', '#0e0e14'] };
  const palme = (L_, Wd, a, b, cle) => garde(['pal', L_, Wd, a.toFixed(2), b.toFixed(2), cle] + '', () => {
    const A = 2, n = Math.ceil((L_ * 2 + Wd * 2) / A) + 4, t = toile(n, n), cx = n / 2, cy = n / 2, tons = PALMES[cle], l = L_ / A, w = Wd / A;
    const P_ = (s, cote) => { const th = a + b * s, r = l * s; const x0 = cx + Math.cos(a + b * s * .5) * r, y0 = cy + Math.sin(a + b * s * .5) * r; const dem = w * Math.pow(Math.sin(Math.PI * Math.min(1, s * .92 + .08)), .75) * (1 - s * .35); return [x0 - Math.sin(th) * dem * cote, y0 + Math.cos(th) * dem * cote]; };
    const NS = 12, bord1 = [], bord2 = [];
    for (let i = 0; i <= NS; i++) { bord1.push(P_(i / NS, -1)); bord2.push(P_(i / NS, 1)); }
    const forme = bord1.concat(bord2.slice().reverse());
    t.poly(forme.map(q => [q[0] - 1, q[1]]), tons[3]); t.poly(forme.map(q => [q[0] + 1, q[1]]), tons[3]); t.poly(forme.map(q => [q[0], q[1] - 1]), tons[3]); t.poly(forme.map(q => [q[0], q[1] + 1]), tons[3]);
    t.poly(forme, tons[1]);
    // le bord d'attaque, clair ; l'ombre du bord de fuite ; des ecailles en taches
    const mi = []; for (let i = 0; i <= NS; i++) mi.push(P_(i / NS, -.2));
    t.poly(bord1.concat(mi.slice().reverse()), tons[0]);
    const mi2 = []; for (let i = 0; i <= NS; i++) mi2.push(P_(i / NS, .55));
    t.poly(mi2.concat(bord2.slice().reverse()), tons[2]);
    for (let i = 2; i < NS - 1; i += 2) { const q = P_(i / NS, .1); t.r(q[0], q[1], 1, 1, tons[2]); }
    const o = G.mk(n * A, n * A);
    o.x.imageSmoothingEnabled = false; o.x.drawImage(t, 0, 0, n * A, n * A);
    return o;
  });
  // ou s'accrochent les nageoires, en fraction de la taille du corps peint par Qwen (a regler d'apres l'image)
  const ANCRES = { tortue_corps: { av: [.66, .66], ar: [.2, .62], cle: 'verte', lav: .62, lar: .22, wav: .13, war: .1 }, bebe_corps: { av: [.62, .72], ar: [.22, .72], cle: 'sombre', lav: .55, lar: .3, wav: .13, war: .1 } };
  function dessineTortue(x, id, tag, X, Y, T, e, balise) {
    const sp = D.spr('tortue', tag === 's' ? 'm' : 'l');
    if (!sp.ok) return;
    x.imageSmoothingEnabled = false;
    x.drawImage(sp.img, Math.round((X - sp.w / 2) * S) / S, Math.round((Y - sp.h / 2) * S) / S, sp.w, sp.h);
    // la balise noire, collee sur la carapace, son antenne
    if (balise) { const bx = Math.round((X - sp.w * .06) * S) / S, by = Math.round((Y - sp.h * .42) * S) / S; V.R(x, '#0c0c12', bx, by, 3.6, 2.4); V.R(x, '#0c0c12', bx + 2.8, by - 2.4, .6, 2.4); }
  }
  /* Un poisson : le corps fixe, la queue qui bat de gauche a droite (elle se raccourcit a l'image), un petit sursaut a chaque coup */
  function dessinePoisson(x, id, tag, X, Y, T, ph) {
    const sp = D.spr(id, tag);
    if (!sp.ok) return;
    const nw = sp.nw, nh = sp.nh, cq = Math.floor(nw * .34), w = T * 11 + ph;
    const k = .45 + .55 * Math.abs(Math.cos(w)), dx = sp.w / 2;
    const gx = Math.round(X * S) / S, gy = Math.round((Y + Math.sin(w * .5) * .5) * S) / S - sp.h / 2;
    // la queue : on la pose comprimee contre le corps
    const qw = cq * k / S;
    x.drawImage(sp.img, 0, 0, cq, nh, gx - dx + (cq / S - qw), gy + Math.sin(w) * .8, qw, sp.h);
    x.drawImage(sp.img, cq, 0, nw - cq, nh, gx - dx + cq / S, gy, (nw - cq) / S, sp.h);
  }
  /* La raie vole : ses ailes montent et descendent depuis son axe, plus fort au bout */
  function dessineRaie(x, id, tag, X, Y, T, ph) {
    const sp = D.spr('raie', 'l');
    if (sp.ok) { x.imageSmoothingEnabled = false; x.drawImage(sp.img, Math.round((X - sp.w / 2) * S) / S, Math.round((Y - sp.h / 2) * S) / S, sp.w, sp.h); }
  }
  /* Le dauphin nage de haut en bas : seule la queue monte et descend, le corps roule */
  function dessineDauphin(x, id, tag, X, Y, T, ph) {
    const sp = D.spr(id === 'requin' ? 'requin' : 'dauphin', 'm');
    if (sp.ok) { x.imageSmoothingEnabled = false; x.drawImage(sp.img, Math.round((X - sp.w / 2) * S) / S, Math.round((Y - sp.h / 2) * S) / S, sp.w, sp.h); }
  }
  /* La vie sous l'eau de ha_tortue et nc_tortue_eau : des tortues qui rament, des poissons, une raie, un dauphin, a plusieurs profondeurs.
     Ils s'ecartent quand le drone arrive. arg 'balise' : les tortues portent leur balise. */
  FX.vie_marine = (sc, arg) => {
    const balise = arg === 'balise', i = Math.max(1, V.plan(sc, 'recif', 1));
    const faire = (genre, id, tag, y, v, f) => ({ genre, id, tag, y, y0: y, v, f, x: rnd(VW()) + 40, ph: rnd(9), dy: 0, ex: 0 });
    const L = [
      faire('tortue', 'tortue_corps', 's', 92, 9, .1), faire('tortue', 'tortue_corps', 'm', 64, 14, .2),
      faire('raie', 'raie', 'm', 44, 8, .14), faire('dauphin', 'dauphin', 's', 30, 26, .1), faire('dauphin', 'requin', 's', 56, 18, .12),
      faire('poisson', 'poisson_jaune', 's', 118, 16, .2), faire('poisson', 'poisson_jaune', 's', 126, 12, .22), faire('poisson', 'poisson_bleu', 's', 84, 20, .2),
      faire('poisson', 'poisson_jaune', 'm', 138, 24, .34), faire('poisson', 'poisson_bleu', 'm', 104, 30, .34),
    ];
    let Tl = rnd(9);
    return {
      plan: i, L,
      maj(dt) {
        Tl += dt;
        const dr = V.drone();
        for (const a of L) {
          a.x += (a.v - V.defile({ plans: [{ f: a.f }] }, 0)) * dt;
          if (a.x < -70) { a.x = VW() + rnd(30, 260); a.y0 = clamp(a.y0 + rnd(-24, 24), 28, 148); }
          if (a.x > VW() + 300) a.x = -60;
          let cible = Math.sin(Tl * .4 + a.ph) * 7;
          if (dr) { const ax = a.x - dr.x, ay = a.y - dr.y; if (ax * ax + ay * ay < 2800) { cible += (ay >= 0 ? 1 : -1) * 34; } }
          a.dy = lerp(a.dy, cible, Math.min(1, dt * 1.4));
          a.y = a.y0 + a.dy;
        }
      },
      draw(x, d, cam, T) {
        const c = cam * .3;
        for (const a of L) {
          if (a.x < -70 || a.x > VW() + 70) continue;
          if (a.genre === 'tortue') dessineTortue(x, a.id, a.tag, a.x, a.y + c, Tl + a.ph * .3, 1, balise);
          else if (a.genre === 'poisson') dessinePoisson(x, a.id, a.tag, a.x, a.y + c, Tl, a.ph);
          else if (a.genre === 'raie') dessineRaie(x, a.id, a.tag, a.x, a.y + c, Tl, a.ph);
          else dessineDauphin(x, a.id, a.tag, a.x, a.y + c, Tl, a.ph);
        }
      },
    };
  };
  /* ---- Nuweiba sous l'eau : des bancs de poissons exotiques a trois profondeurs (Max, 03/11/2026 : « mets plus de poissons
     exotiques »). Un banc = une espece. Chaque poisson joue ses vraies images d'animation, decalees d'un poisson a l'autre (ils ne
     battent pas de la queue ensemble) ; le banc ondule, monte et descend doucement, et ceux d'assez pres s'ecartent quand le drone
     les traverse puis se reforment. arg : 'loin' (petits, voiles de bleu), 'milieu' ou 'pres' (grands, devant le fond). ---- */
  // [nombre min, max, ecart entre deux poissons, vitesse min, max] : les papillons et les chirurgiens en bancs serres, la rascasse seule
  const ESPECES_RECIF = {
    poisson_papillon: [5, 9, 7, 14, 24], poisson_jaune: [6, 11, 7, 18, 30], poisson_bleu: [5, 10, 7, 20, 32],
    poisson_clown: [2, 4, 7, 10, 18], poisson_perroquet: [2, 4, 12, 14, 24], poisson_lion: [1, 2, 16, 5, 10], poisson_globe: [1, 1, 0, 4, 8],
  };
  const PROFONDEURS = {
    loin: { tag: 's', f: .05, y: [34, 118], bancs: 5, voile: .3, k: .6, apres: ['recif', 1], ecarte: 0 },
    milieu: { tag: 'm', f: .13, y: [46, 146], bancs: 3, voile: .16, k: 1, apres: ['peint', 0], ecarte: 1 },
    pres: { tag: 'l', f: .3, y: [92, 166], bancs: 3, voile: 0, k: 1.5, apres: ['pla', 0], ecarte: 1 },
  };
  const NB_IMAGES = {};
  // l'image d'animation d'un poisson : la cadence du sprite (ips de _meta.json), decalee de ph (0..1) pour chacun
  const imagePoisson = (id, tag, ph) => {
    const m = D.SPR && D.SPR[id + '_f0'];
    if (!m) return { sp: D.spr(id, tag), n: 0 };
    let nb = NB_IMAGES[id];
    if (nb === undefined) { nb = 0; while (D.SPR[id + '_f' + nb]) nb++; NB_IMAGES[id] = nb; }
    const n = Math.floor(G.t * (m.ips || 8) + ph * nb) % nb;
    return { sp: D.spr(id + '_f' + n, tag), n };
  };
  FX.recif_exotique = (sc, arg) => {
    const R = PROFONDEURS[arg] || PROFONDEURS.milieu, ids = Object.keys(ESPECES_RECIF);
    const ip = V.plan(sc, R.apres[0], R.apres[1]), plan = ip >= 0 ? ip : Math.max(1, sc.plans.length - 3);
    const hz = sc.m.c_hz || [40, 140, 180];
    // les images se chargent des maintenant : pas un poisson qui apparait d'un coup
    for (const id of ids) { D.spr(id, R.tag); for (let n = 0; D.SPR && D.SPR[id + '_f' + n]; n++) D.spr(id + '_f' + n, R.tag); }
    const nouveau = premier => {
      // la largeur d'un poisson a cette profondeur (en unites) : le banc s'etale assez pour qu'ils ne s'empilent pas
      const id = pick(ids), [n0, n1, ec, v0, v1] = ESPECES_RECIF[id], n = irnd(n0, n1), lp = ((D.SPR[id] && D.SPR[id].l) || [30])[0] * { s: .46, m: .68, l: 1 }[R.tag] / S;
      const e = Math.max(ec * R.k, lp * .9) * Math.sqrt(n);
      let sens = Math.random() < .5 ? 1 : -1;
      const v = rnd(v0, v1) * (R.tag === 's' ? .7 : R.tag === 'l' ? 1.2 : 1), def = V.defile({ plans: [{ f: R.f }] }, 0);
      // un banc qui remonterait le defilement a sa vitesse resterait cache hors de l'image : il nage alors dans l'autre sens
      if (Math.abs(sens * v - def) < 8) sens = -1;
      const net = sens * v - def, larg = e + 30 * R.k;
      const X = premier ? rnd(0, VW()) : net < 0 ? VW() + larg + rnd(5, 70) : -larg - rnd(5, 70);
      const f = [];
      for (let i = 0; i < n; i++) {
        // une place libre dans le banc : a une longueur de poisson au moins des autres (douze essais)
        let dx = 0, dy = 0;
        for (let t = 0; t < 12; t++) { dx = rnd(-1, 1) * e; dy = rnd(-.5, .5) * e * .7; if (f.every(o => Math.abs(o.dx - dx) > lp * .85 || Math.abs(o.dy - dy) > lp * .5)) break; }
        f.push({ dx, dy, ph: rnd(1), ond: rnd(6), ex: 0, ey: 0 });
      }
      return { id, sens, v, X, Y: rnd(R.y[0], R.y[1]), f, larg, T: rnd(9) };
    };
    const L = [];
    for (let b = 0; b < R.bancs; b++) L.push(nouveau(true));
    const ou = (B, q) => [B.X + q.dx + q.ex, B.Y + q.dy + q.ey];
    return {
      plan,
      // lu par tests/poissons.js : chaque poisson, son espece, sa taille, son sens et son image d'animation du moment
      poissons: () => L.flatMap(B => B.f.map(q => { const [x, y] = ou(B, q); return { id: B.id, tag: R.tag, x, y, sens: B.sens, image: imagePoisson(B.id, R.tag, q.ph).n }; })),
      maj(dt) {
        const dr = R.ecarte ? V.drone() : null, def = V.defile({ plans: [{ f: R.f }] }, 0);
        for (let b = 0; b < L.length; b++) {
          const B = L[b];
          B.T += dt;
          B.X += (B.sens * B.v - def) * dt;
          B.Y = clamp(B.Y + Math.sin(B.T * .45) * 4 * dt, R.y[0], R.y[1]);
          // hors de l'image depuis trop longtemps (le drone accelere, un banc peut ne plus avancer a l'ecran) : un autre arrive
          B.hors = B.X < -B.larg || B.X > VW() + B.larg ? (B.hors || 0) + dt : 0;
          if (B.hors > 4 || B.X < -B.larg - 260 || B.X > VW() + B.larg + 260) { L[b] = nouveau(false); continue; }
          for (const q of B.f) {
            if (dr) {
              const [x, y] = ou(B, q), ax = x - dr.x, ay = y - dr.y, d2 = ax * ax + ay * ay;
              if (d2 < 1500) { const d = Math.sqrt(d2) + 1; q.ex += ax / d * 140 * dt; q.ey += ay / d * 140 * dt; }
            }
            q.ex *= 1 - dt * 1.2; q.ey *= 1 - dt * 1.2;
          }
        }
      },
      draw(x, d, cam, T) {
        for (const B of L) {
          if (B.X < -B.larg - 40 || B.X > VW() + B.larg + 40) continue;
          for (const q of B.f) {
            const { sp } = imagePoisson(B.id, R.tag, q.ph);
            if (!sp.ok) continue;
            const im = R.voile ? D.teinte(sp, hz, R.voile) : sp.img;
            if (!im) continue;
            const [X0, Y0] = ou(B, q), X = X0 + Math.sin(T * .9 + q.ond) * 1.5, Y = Y0 + Math.sin(T * 1.7 + q.ond) * 1.2 + cam;
            const gx = Math.round(X * S) / S, gy = Math.round((Y - sp.h / 2) * S) / S;
            x.imageSmoothingEnabled = false;
            // les sprites regardent a droite : ceux qui vont a gauche sont retournes
            if (B.sens < 0) { x.save(); x.translate(gx, 0); x.scale(-1, 1); x.drawImage(im, -sp.w / 2, gy, sp.w, sp.h); x.restore(); }
            else x.drawImage(im, gx - sp.w / 2, gy, sp.w, sp.h);
          }
        }
      },
    };
  };
  /* La tortue qu'on filme : le sprite du jeu ne donne que le cadre, c'est elle qui rame ici */
  FX.sujet_tortue = (sc, arg) => {
    const balise = arg === 'balise';
    return {
      couche: 'sol',
      draw(x, d, cam, T) {
        const w = G.Jeu.w(), s = w && w.sujet;
        if (s) dessineTortue(x, 'tortue_corps', 'l', s.x, s.y + cam, T, 1, balise);
      },
    };
  };

  /* ---- Les bebes tortues de Bundaberg : au second plan, ils marchent vers la droite et vers la mer ---- */
  const palmeBebe = (L_, a, cle) => palme(L_, Math.max(4, Math.round(L_ * .32)), a, 0, cle);
  function dessineBebe(x, sp0, X, Y, T, ph) {
    const sp = D.spr('bebe_q', 'l');
    if (sp.ok) { x.imageSmoothingEnabled = false; x.drawImage(sp.img, Math.round((X - sp.w / 2) * S) / S, Math.round((Y - sp.h) * S) / S, sp.w, sp.h); }
  }
  FX.bebes_tortues = sc => {
    const i = V.plan(sc, 'pla', 1), BB = [];
    const nouveau = (x) => { const y = rnd(152, 172); return { x: x === undefined ? VW() + rnd(10, 260) : x, y, v: rnd(9, 15), ph: rnd(9), tag: y > 164 ? 'l' : 'm', traces: [] }; };
    for (let q = 0; q < 11; q++) BB.push(nouveau(rnd(-20, VW() + 200)));
    BB.sort((a, b) => a.y - b.y);
    let Tl = 0;
    return {
      plan: i,
      maj(dt) {
        Tl += dt;
        const dr = V.drone(), dep = V.defile(sc, i);
        for (let q = 0; q < BB.length; q++) {
          const b = BB[q];
          // le drone passe bas : ils pressent le pas
          const vite = dr && dr.proche && Math.abs(b.x - dr.x) < 50 ? 2.2 : 1;
          b.x += (b.v * vite - dep) * dt;
          if (b.x < -24) { const n = nouveau(); b.x = n.x; b.v = n.v; }
        }
      },
      draw(x, d, cam, T) {
        const c = cam * .3;
        for (const b of BB) {
          if (b.x < -20 || b.x > VW() + 20) continue;
          // la trace de ses nageoires dans le sable, derriere lui
          x.fillStyle = 'rgba(120,88,70,.34)';
          for (let q = 1; q < 6; q++) x.fillRect(b.x - q * 3.2 - 5, b.y + c - (q % 2 ? 2 : .6), 1.2, .8);
          const sp = D.spr('bebe_q', 'l');
          if (sp.ok) { x.imageSmoothingEnabled = false; x.drawImage(sp.img, Math.round((b.x - sp.w / 2) * S) / S, Math.round((b.y + c - sp.h) * S) / S, sp.w, sp.h); }
        }
      },
    };
  };
  FX.sujet_bebe = sc => ({
    couche: 'sol',
    draw(x, d, cam, T) { const w = G.Jeu.w(), s = w && w.sujet; if (s) dessineBebe(x, D.spr('bebe_corps', 'l'), s.x, s.y + cam, T, 0); },
  });

  /* ---- Les gens en maillot de ha_plage. Le moteur tire une variante de chaque figurant : on les prepare nous-memes pour que la peau du torse suive ---- */
  (function maillots() {
    if (!G.DOLLS) return;
    const PEAUX = ['#f7d7bc', '#f2c9a4', '#e0b083', '#c68f5e', '#9a6a42', '#7f5232', '#5a3a26'], CHEV = ['#3a2518', '#6a4426', '#c8a040', '#c86a2c', '#17151f', '#2c2233', '#222'];
    const SHORTS = ['#e0405a', '#2f6fd0', '#f4c84a', '#1f9a7a', '#ff7a2e', '#8a4ac8', '#39c0e8', '#e8e4d8', '#c8393b', '#2a3350', '#ff5fa8'];
    const faire = (nom, n, h) => {
      const p = PEAUX[n], c = CHEV[(n * 3 + h) % 7], sh = SHORTS[h];
      return nom === 'baigneur' ? { haut: p, bas: sh, jupe: true, peau: p, chaus: p, chapeau: h % 3 ? 'nu' : 'casquette', chapC: SHORTS[(h + 4) % 11], cheveux: c } : { haut: p, motif: sh, bas: sh, jupe: true, peau: p, chaus: p, chapeau: 'longs', cheveux: c };
    };
    for (const nom of ['baigneur', 'baigneuse']) {
      G.DOLLS[nom] = faire(nom, 1, 0);
      for (let n = 0; n < 7; n++) for (let h = 0; h < 11; h++) G.DOLLS[nom + '~' + n + '_' + h] = faire(nom, n, h);
    }
  })();
  /* Sur le sable du second plan : des gens en maillot qui se promenent ou restent la, a l'echelle du plan */
  FX.plagistes = sc => {
    const i = Math.max(V.plan(sc, 'pla', 1), 0), e = .72, L = [];
    const noms = ['baigneur', 'baigneuse'];
    for (let q = 0; q < 9; q++) {
      const v = pick([0, 0, 0, 10, -12, 16]);
      L.push({ d: G.varier ? G.varier(pick(noms)) : pick(noms), x: rnd(VW() + 300), dy: rnd(1, 12), v, pose: v ? 'marche' : pick(['neutre', 'salut', 'applaudit']), t: rnd(9) });
    }
    L.sort((a, b) => a.dy - b.dy);
    return {
      plan: i,
      maj(dt) {
        const dep = V.defile(sc, i);
        for (const g of L) { g.t += dt; g.x += (g.v - dep) * dt; if (g.x < -20) g.x = VW() + rnd(10, 300); if (g.x > VW() + 320) g.x = -10; }
      },
      draw(x, d, cam, T) {
        for (const g of L) {
          if (g.x < -14 || g.x > VW() + 14) continue;
          x.save(); x.translate(g.x, D.crete(sc, i, g.x, d) + g.dy + cam * .3); x.scale(e, e);
          G.dollDraw(x, g.d, g.pose, g.t, 0, 0, g.v < 0);
          x.restore();
        }
      },
    };
  };

  /* Ce decor ne veut d'aucun kangourou : les petits gags du moteur en amenent, on les retire */
  FX.sans_kangourou = sc => ({
    plan: -9,
    maj() { if (sc.lum && sc.lum.vignettes.length) sc.lum.vignettes = sc.lum.vignettes.filter(v => !v.v.a.some(q => q.s === 'kangourou')); },
    draw() { },
  });

  /* ---- Les guifettes moustac de la Brenne : calotte noire, joue blanche, ventre sombre, bec rouge. Elles volent, et couvent sur des nids flottants ---- */
  const peintGuifette = (e, ph) => garde('gui' + e + ph, () => {
    const W_ = Math.ceil(44 * e) + 2, H_ = Math.ceil(30 * e) + 2, t = toile(W_, H_), P_ = (a, b) => [W_ / 2 + a * e, H_ / 2 + b * e];
    const ail = [-12, -8, -2, 4, 9, 2][ph];
    // l'aile lointaine
    t.poly([P_(-2, -1), P_(4, -1), P_(-6, ail - 2), P_(-14, ail - 3)], '#7f8a96');
    // la queue fourchue
    t.poly([P_(-8, 0), P_(-18, -3), P_(-13, 0), P_(-18, 3), P_(-8, 2)], '#c8d0d8');
    // le corps : dos gris, ventre sombre
    t.poly([P_(-9, -1), P_(0, -3), P_(8, -2), P_(11, 0), P_(6, 3), P_(-5, 3)], '#3f4650');
    t.poly([P_(-9, -1), P_(0, -3), P_(8, -2), P_(9, 0), P_(-6, 1)], '#aeb8c2');
    // la tete
    t.disque(W_ / 2 + 10 * e, H_ / 2 - 1.6 * e, Math.max(1, 3.1 * e), '#f4f6f8');
    t.poly([P_(7, -2.4), P_(10, -5), P_(13.6, -3.6), P_(13.6, -2.2), P_(9, -2.2)], '#14151a');
    t.poly([P_(13, -2.4), P_(18, -1.3), P_(13, -.6)], '#e0402e');
    // l'aile proche
    t.poly([P_(-3, -1), P_(5, -1), P_(0, ail + 1), P_(-11, ail - 1)], '#c8d2dc');
    t.poly([P_(-1, -1), P_(5, -1), P_(1, ail * .6), P_(-4, ail * .6)], '#eef2f6');
    return t;
  });
  const peintNid = e => garde('nid' + e, () => {
    const W_ = Math.ceil(58 * e), H_ = Math.ceil(24 * e), t = toile(W_, H_), r = (a, b) => a + Math.random() * (b - a);
    // l'amas de roseaux et de feuilles, a plat sur l'eau
    t.x.fillStyle = '#1a2a24'; t.x.fillRect(W_ * .08, H_ * .6, W_ * .84, H_ * .3);
    t.disque(W_ * .5, H_ * .62, Math.min(W_ * .46, H_ * .34), '#3a3a24');
    for (let i = 0; i < 46; i++) {
      const a = r(0, 6.28), ra = r(.2, 1), X = W_ * .5 + Math.cos(a) * W_ * .44 * ra, Y = H_ * .64 + Math.sin(a) * H_ * .28 * ra, l = r(4, 12) * e, ang = r(-.5, .5);
      t.x.fillStyle = ['#7a6a3a', '#5a5230', '#a08c50', '#4a4a28'][i % 4];
      for (let q = 0; q < l; q++) t.x.fillRect(Math.round(X + q * Math.cos(ang) - l / 2), Math.round(Y + q * Math.sin(ang) * .4), 1, 1);
    }
    // le creux au milieu
    t.disque(W_ * .5, H_ * .55, Math.min(W_ * .22, H_ * .22), '#26261a');
    return t;
  });
  const peintCouve = (e, f) => garde('couve' + e + f, () => {
    const W_ = Math.ceil(34 * e), H_ = Math.ceil(22 * e), t = toile(W_, H_), P_ = (a, b) => [a * e, H_ - b * e];
    t.poly([P_(1, 7), P_(4, 3), P_(22, 3), P_(23, 10), P_(13, 13), P_(5, 10)], '#3f4650');
    t.poly([P_(0, 8), P_(5, 11), P_(14, 13), P_(23, 11), P_(20, 6), P_(5, 6)], '#aeb8c2');
    t.poly([P_(1, 8), P_(10, 9), P_(19, 7), P_(6, 6)], '#c8d2dc');
    const hb = f ? 2 : 0, hx = f === 2 ? 0 : 0;
    t.disque((22 + hx) * e, H_ - (13 + hb) * e, Math.max(1, 3.4 * e), '#f4f6f8');
    t.poly([P_(19 + hx, 14 + hb), P_(22 + hx, 17 + hb), P_(26 + hx, 15.6 + hb), P_(26 + hx, 14 + hb)], '#14151a');
    t.poly([P_(25.6 + hx, 14.2 + hb), P_(31 + hx, 12.8 + hb), P_(25.6 + hx, 12.2 + hb)], '#e0402e');
    return t;
  });
  FX.guifettes = sc => {
    const iN = V.plan(sc, 'nenu', 0), ip = sc.plans[iN >= 0 ? iN : 1], f = ip.f, per = 880;
    // les nids flottent au milieu des nenuphars
    const NIDS = [[50, 140, 1.5], [240, 124, 1.05], [410, 144, 1.7], [600, 130, 1.25], [770, 136, 1.4]].map(([X, Y, e]) => ({ X, Y, e, oiseau: 'couve', t: 0, x: 0, y: 0, vx: 0, ph: rnd(9), revient: 0 }));
    const VOL = [];
    for (let i = 0; i < 5; i++) VOL.push({ x: rnd(VW()), y: rnd(44, 106), vx: rnd(-34, -16), ph: rnd(9), e: rnd(.8, 1.15), alarme: 0 });
    const flap = (T, ph, k = 1) => (((T * 10 * k + ph) | 0) % 6 + 6) % 6;
    let dLoc = 0;
    return {
      plan: iN >= 0 ? iN : 1,
      maj(dt, d) {
        dLoc = d;
        const dr = V.drone(), dep = V.defile({ plans: [{ f: .12 }] }, 0);
        for (const v of VOL) {
          // vol papillonnant : la guifette plonge et remonte
          let vx = v.vx, dy = Math.cos(G.t * 1.7 + v.ph) * 16;
          if (dr) { const ax = v.x - dr.x, ay = v.y - dr.y, q = ax * ax + ay * ay; if (q < 3000) { const rr = Math.sqrt(q) + 1; vx += ax / rr * 90; dy += ay / rr * 90; } }
          v.x += (vx - dep) * dt; v.y += dy * dt;
          v.y = clamp(v.y, 26, 124);
          if (v.x < -30) { v.x = VW() + rnd(10, 110); v.y = rnd(40, 110); }
        }
        for (const n of NIDS) {
          const X = (((n.X - d * f) % per) + per) % per - 60;
          n.ecr = X;
          if (n.oiseau === 'couve') {
            // le drone passe tout pres : elle s'envole
            if (dr && Math.abs(dr.x - X) < 56 && dr.y > n.Y - 70) { n.oiseau = 'vol'; n.t = 0; n.x = X; n.y = n.Y - 6 * n.e; n.vx = rnd(-40, 18); n.vy = -74; n.revient = rnd(5, 8); }
          } else {
            n.t += dt;
            n.vy = lerp(n.vy, n.t > n.revient * .6 ? clamp((n.Y - 8 - n.y) * 1.1, -40, 40) : -12 + Math.cos(G.t * 2 + n.ph) * 14, Math.min(1, dt * 1.6));
            const vise = n.t > n.revient * .6 ? (X - n.x) * 1.2 : n.vx;
            n.x += clamp(vise, -70, 70) * dt; n.y += n.vy * dt;
            if (n.t > n.revient && Math.abs(n.x - X) < 12 && Math.abs(n.y - n.Y) < 16) n.oiseau = 'couve';
            if (n.t > 30) n.oiseau = 'couve';
          }
        }
      },
      draw(x, d, cam, T) {
        // l'eau tremble autour : un cercle lent sous chaque nid
        for (const n of NIDS) {
          const X = n.ecr;
          if (X === undefined || X < -60 || X > VW() + 60) continue;
          const Y = n.Y + cam * .3 + Math.sin(T * .9 + n.ph) * .5;
          x.fillStyle = 'rgba(160,190,230,.3)';
          x.fillRect(X - 26 * n.e, Y + 1.5, 52 * n.e, .6); x.fillRect(X - 20 * n.e + Math.sin(T + n.ph) * 2, Y + 3, 40 * n.e, .6);
          const ni = D.spr('nid_flottant', n.e > 1.3 ? 'l' : 'm');
          if (ni.ok) x.drawImage(ni.img, X - ni.w / 2, Y + 1.5 - ni.h);
          if (n.oiseau === 'couve') {
            const im = peintCouve(Math.round(n.e * 6.5) / 10, Math.sin(T * .9 + n.ph) > .5 ? 1 : 0);
            x.drawImage(im, X - im.width / S / 2, Y - (ni.ok ? ni.h * .62 : 3) - im.height / S + 2);
          } else {
            // l'oeuf reste dans le nid
            x.fillStyle = '#d8d0b0'; x.fillRect(X - 1.2 * n.e, Y - 4 * n.e, 2.4 * n.e, 1.6 * n.e);
          }
        }
        const voler = (X, Y, e, ph, sens) => {
          const im = peintGuifette(Math.round(e * 10) / 10, ph);
          x.save(); x.translate(X, Y); if (sens < 0) x.scale(-1, 1); x.drawImage(im, -im.width / S / 2, -im.height / S / 2); x.restore();
        };
        for (const v of VOL) voler(v.x, v.y + cam * .2, v.e, flap(T, v.ph), v.vx > 0 ? 1 : -1);
        for (const n of NIDS) if (n.oiseau === 'vol') voler(n.x, n.y + cam * .3, n.e * .65, flap(T, n.ph, 1.6), n.vx > 0 ? 1 : -1);
      },
    };
  };

  V.mer = { toile, paquet, disqueP, pose, poseR, garde, texEau, lisse, peintSurf, nouveauRider, majRider, dessineRider };
  /* ---- Re_seor : des soigneurs relachent des petrels recueillis. Ils ouvrent la caisse, un oiseau apres l'autre s'envole vers le large ---- */
  const PETREL = { a: '#23262e', b: '#59606e', c: '#f2f0ea', d: '#14161c' };
  const petrelH = ['a.........a', 'ba.......ab', '.bba...abb.', '..bbaaabb..', '....ccd....', '.....cc....'];
  const petrelM = ['...........', '...........', 'abbbaaabbba', '...bbcbb...', '....ccd....', '.....cc....'];
  const petrelB = ['...........', '....aaa....', '...bbcbb...', '..bb.c.bb..', '.bb.ccd.bb.', 'ba........b'];
  const peindrePetrel = l => { const c = G.mk(l[0].length, l.length); l.forEach((q, y) => { for (let n = 0; n < q.length; n++) { const k = PETREL[q[n]]; if (k) { c.x.fillStyle = k; c.x.fillRect(n, y, 1, 1); } } }); return c; };
  let imgPetrel = null;
  FX.petrels = sc => {
    if (!imgPetrel) imgPetrel = [peindrePetrel(petrelH), peindrePetrel(petrelM), peindrePetrel(petrelB), peindrePetrel(petrelM)];
    const i = Math.max(V.plan(sc, 'peint', 1), 0), e = .66, vols = [];
    let X = G.VW + 60, reste = 0, att = 0, ouverte = 0;
    const gens = [{ d: 'guide', dx: -11, pose: 'neutre' }, { d: 'rando2', dx: 13, pose: 'salut' }];
    return {
      plan: i,
      maj(dt) {
        X -= V.defile(sc, i) * dt;
        if (X < -50) { X = G.VW + G.rnd(180, 620); reste = 0; ouverte = 0; }
        if (!ouverte && X < G.VW * .82) { ouverte = 1; reste = 5; att = .1; }
        if (reste > 0 && X > -20) {
          att -= dt;
          if (att <= 0) { reste--; att = G.rnd(.3, .75); vols.push({ x: X, y: -6, vx: G.rnd(18, 60), vy: G.rnd(-46, -30), t: G.rnd(9) }); }
        }
        for (const o of vols) { o.t += dt * 14; o.x += o.vx * dt; o.y += o.vy * dt; o.vy *= 1 - dt * .1; }
        while (vols.length && vols[0].y < -240) vols.shift();
      },
      draw(x, d, cam) {
        x.imageSmoothingEnabled = false;
        const sol = D.crete(sc, i, X, d) + cam * sc.plans[i].f * .3;
        if (X > -40 && X < G.VW + 40) {
          // la caisse de transport, couvercle ouvert
          V.R(x, '#3a2814', X - 7, sol - 8, 14, 8); V.R(x, '#8a6436', X - 6, sol - 7, 12, 6); V.R(x, '#a97e48', X - 6, sol - 7, 12, 1.2); V.R(x, '#14100c', X - 3, sol - 5.4, 6, 2.4);
          V.R(x, '#3a2814', X - 7, sol - 14, 1.6, 6); V.R(x, '#8a6436', X - 5.8, sol - 14, 11, 1.4);
          for (const g of gens) { x.save(); x.translate(X + g.dx, sol); x.scale(e, e); G.dollDraw(x, g.d, ouverte && reste > 0 ? 'applaudit' : g.pose, X * .03, 0, 0, g.dx > 0); x.restore(); }
        }
        for (const o of vols) {
          const im = imgPetrel[o.t & 3], w = 11 * 1.2 * .8, h = 6 * 1.2 * .8;
          x.drawImage(im, Math.round(o.x - w / 2), Math.round(sol + o.y - h / 2), w, h);
        }
      },
    };
  };

})();
