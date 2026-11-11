/* Les acteurs animes du groupe ouest : voir vie.js.
   Le CSO sur la plage de Saint-Jean-de-Monts, les voiliers ecole des Glenan, la basse-cour de la maison.
   Chaque bete et chaque cheval est peint une fois, image par image, dans de petites toiles, puis pose a sa profondeur. */
'use strict';
(function () {
  const FX = G.Decor.FX, D = G.Decor, V = G.Vie, S = G.S, K = '#17151f', TAU = Math.PI * 2;
  const { rnd, irnd, pick } = G;

  /* ---- La peinture ---- */
  const feuilles = V.feuillesOuest = new Map();
  function durcir(c, cerne) {
    const w = c.width, h = c.height, im = c.x.getImageData(0, 0, w, h), a = im.data, m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) { m[i] = a[i * 4 + 3] > 110 ? 1 : 0; a[i * 4 + 3] = m[i] ? 255 : 0; }
    if (cerne) {
      const [r, g, b] = G.hex(cerne);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (m[i]) continue;
        if ((x > 0 && m[i - 1]) || (x < w - 1 && m[i + 1]) || (y > 0 && m[i - w]) || (y < h - 1 && m[i + w])) { a[i * 4] = r; a[i * 4 + 1] = g; a[i * 4 + 2] = b; a[i * 4 + 3] = 255; }
      }
    }
    c.x.putImageData(im, 0, 0);
  }
  /* Une feuille d'images (cheval, poule, oie...) : chaque image n'est peinte que la premiere fois qu'on la demande (10/11/2026 : peintes
     toutes d'un coup, les feuilles du concours de saut figeaient la preparation du decor 220 ms sur un telephone lent ; elles se
     peignent maintenant au fil des images du jeu, quelques millisecondes a la fois). Rien ne change pour qui s'en sert : f[k], f.length. */
  function feuille(cle, w, h, n, peint, cerne = K) {
    let f = feuilles.get(cle);
    if (f) return f;
    f = new Array(n);
    for (let k = 0; k < n; k++) {
      Object.defineProperty(f, k, {
        configurable: true, enumerable: true,
        get() { const c = G.mk(Math.ceil(w), Math.ceil(h)); peint(c.x, k / n, k); durcir(c, cerne); Object.defineProperty(f, k, { value: c, writable: true, configurable: true, enumerable: true }); return c; },
      });
    }
    feuilles.set(cle, f);
    return f;
  }
  const ligne = (x, c, a, b, e, f, l = 1) => { x.strokeStyle = c; x.lineWidth = l; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(e, f); x.stroke(); };
  const disc = (x, c, a, b, r) => { x.fillStyle = c; x.beginPath(); x.arc(a, b, Math.max(.5, r), 0, 7); x.fill(); };
  const ell = (x, c, a, b, rx, ry, rot = 0) => { x.fillStyle = c; x.beginPath(); x.ellipse(a, b, Math.max(.5, rx), Math.max(.5, ry), rot, 0, 7); x.fill(); };
  const poly = (x, c, ...p) => { x.fillStyle = c; x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.closePath(); x.fill(); };
  const rect = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const courbe = (x, c, l, a, b, q1, q2, e, f) => { x.strokeStyle = c; x.lineWidth = l; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(q1, q2, e, f); x.stroke(); };
  // pose une image : (X, Y) = le point d'ancrage (ax, ay) de l'image, en unites de jeu
  function pose(x, im, X, Y, rot = 0, flip = false, ax = .5, ay = 1, ex = 1) {
    const w = im.width / S, h = im.height / S, px = Math.round(X * S) / S, py = Math.round(Y * S) / S;
    if (!rot && !flip && ex === 1) { x.drawImage(im, px - w * ax, py - h * ay); return; }
    x.save(); x.translate(px, py); if (rot) x.rotate(rot); if (flip || ex !== 1) x.scale((flip ? -1 : 1) * ex, 1); x.drawImage(im, -w * ax, -h * ay); x.restore();
  }
  const sol = (sc, i, X) => D.crete(sc, i, X, 0);
  const solDoux = (sc, i, X) => (sol(sc, i, X - 3) + sol(sc, i, X) + sol(sc, i, X + 3)) / 3;
  const sujetDe = nom => { const w = G.Jeu.w(); return w && w.sujet && w.sujet.s === nom ? w.sujet : null; };
  const f_ = (sc, i) => sc.plans[i] ? sc.plans[i].f : .1;
  function grains(max) {
    const p = [];
    return {
      add(X, Y, vx, vy, t, c, s = 1) { if (p.length < max) p.push({ X, Y, vx, vy, t, T: t, c, s }); },
      maj(dt, g = 0) { for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; q.t -= dt; if (q.t <= 0) { p[i] = p[p.length - 1]; p.pop(); continue; } q.X += q.vx * dt; q.Y += q.vy * dt; q.vy += g * dt; } },
      draw(x, d, f, camY) { for (const q of p) { x.globalAlpha = Math.min(1, q.t / q.T * 1.6); V.R(x, q.c, q.X - d * f, q.Y + camY, q.s, q.s); } x.globalAlpha = 1; },
    };
  }

  /* ==================== SAINT-JEAN-DE-MONTS ==================== */
  /* ---- La vague qui meurt sur le sable mouille, le soleil qui y scintille ---- */
  FX.sjdm_ressac = (sc, arg) => {
    const i = V.plan(sc, 'peint', +(arg || 1)), f = f_(sc, i), p = sc.plans[i];
    const L = 34, per = p.nw / S, l = [];
    for (let k = 0; k < L; k++) l.push({ X: rnd(0, per), lo: rnd(14, 56), ph: rnd(TAU), v: rnd(.5, .95), dy: rnd(0, 7) });
    const gl = [];
    for (let k = 0; k < 40; k++) gl.push({ X: rnd(0, per), y: rnd(10, 30), ph: rnd(TAU) });
    return {
      plan: i,
      draw(x, d, camY, T) {
        const off = d * f, Y0 = p.y + 6 / S + camY;
        for (const q of l) {
          const sx = ((q.X - off) % per + per) % per;
          if (sx > G.VW + 60) continue;
          const v = Math.sin(T * q.v + q.ph), yy = Y0 + q.dy + v * 3.5;
          V.R(x, '#ffffff', sx - q.lo / 2, yy, q.lo * (.6 + .4 * Math.max(0, v)), .7);
          V.R(x, '#eaf6f6', sx - q.lo * .3, yy + 1.2, q.lo * .5, .6);
        }
        for (const q of gl) {
          const sx = ((q.X - off) % per + per) % per;
          if (sx > G.VW || Math.sin(T * 3 + q.ph) < .72) continue;
          V.R(x, '#ffffff', sx, Y0 + q.y, 1.2, .6);
        }
      },
    };
  };

  /* ---- Les promeneurs de l'estacade, les pecheurs au bout, l'ecume au pied des pieux ---- */
  const EST = { x0: 600 / S, x1: 1640 / S, t0: 1510 / S, deck: 24 / S };
  FX.sjdm_estacade = (sc, arg) => {
    const i = V.plan(sc, 'peint', +(arg || 2)), f = f_(sc, i), p = sc.plans[i], l = [], per = p.nw / S;
    const COUL = ['#e0503c', '#3a84d0', '#f4f0e0', '#f0c040', '#2c3e60', '#40a878', '#e878a0'];
    for (let k = 0; k < 11; k++) l.push({ X: rnd(EST.x0 + 8, EST.t0), v: pick([-5, -4, 4, 5, 6]), c: pick(COUL), ph: rnd(TAU) });
    const pech = [[EST.t0 + 12, '#3a5a8a'], [EST.t0 + 30, '#a8452c'], [EST.t0 + 54, '#3a6a4a']];
    return {
      plan: i,
      maj(dt) { for (const q of l) { q.X += q.v * dt; if (q.X < EST.x0 + 4 || q.X > EST.x1 - 4) { q.v = -q.v; q.X = G.clamp(q.X, EST.x0 + 4, EST.x1 - 4); } } },
      draw(x, d, camY, T) {
        const off = d * f, yd = p.y + EST.deck + camY, n = Math.floor(off / per);
        for (const c of [n, n + 1]) {
          const dx = c * per - off;
          if (dx + EST.x0 > G.VW + 10 || dx + EST.x1 < -10) continue;
          for (const q of l) {
            const sx = q.X + dx;
            if (sx < -4 || sx > G.VW + 4) continue;
            const b = Math.sin(T * 7 + q.ph) > 0 ? .3 : 0;
            V.R(x, '#2c2a30', sx - 1, yd - 6 - b, 2, 5.4);
            V.R(x, q.c, sx - .7, yd - 5.2 - b, 1.4, 2.8);
            V.R(x, '#e8b48a', sx - .6, yd - 6.6 - b, 1.2, 1.2);
          }
          for (const [X, c2] of pech) {
            const sx = X + dx;
            if (sx < -4 || sx > G.VW + 30) continue;
            V.R(x, '#2c2a30', sx - 1, yd - 5.6, 2, 5);
            V.R(x, c2, sx - .7, yd - 5, 1.4, 2.8);
            V.R(x, '#e8b48a', sx - .6, yd - 6.4, 1.2, 1.2);
            // la canne et son fil, qui part loin dans l'eau
            const hx = sx + 8, hy = yd - 11 + Math.sin(T * 1.3 + X) * .6;
            x.strokeStyle = '#2c2a30'; x.lineWidth = .5; x.beginPath(); x.moveTo(sx + .6, yd - 4); x.lineTo(hx, hy); x.lineTo(hx + 9, yd + 22); x.stroke();
          }
        }
      },
    };
  };

  /* ---- Le CSO : des cavaliers qui enchainent les barres sur le sable ---- */
  const CAVALIERS = [
    { robe: ['#9a5a30', '#6a3a20', '#2a1c18', '#2a1c18'], veste: '#1f2f5c', col: '#e8e4d8', casque: '#17202e', tapis: '#3a84d0', guetre: '#f4f0e4' },
    { robe: ['#c0783c', '#8a5228', '#e8b470', '#3a2418'], veste: '#b02a2a', col: '#f4f0e4', casque: '#1a1a22', tapis: '#f4f0e4', guetre: '#2a2a32' },
    { robe: ['#d8d8dc', '#9a9aa4', '#f4f4f4', '#4a4a54'], veste: '#20252e', col: '#e8e4d8', casque: '#2a3a5a', tapis: '#c8362a', guetre: '#20252e' },
  ];
  const CHX = 44, CHY = 62, CHW = 96, CHH = 106;
  // jambe a deux segments de meme longueur : l'articulation se place d'elle-meme
  function membre(x, c, hx, hy, px, py, L, sens, l1, l2) {
    const dx = px - hx, dy = py - hy, dd = Math.min(Math.hypot(dx, dy), 2 * L - .01) || .01, h = Math.sqrt(Math.max(0, L * L - dd * dd / 4)) * sens;
    const n = Math.hypot(dx, dy) || 1, kx = hx + dx / 2 - dy / n * h, ky = hy + dy / 2 + dx / n * h;
    ligne(x, c, hx, hy, kx, ky, l1); ligne(x, c, kx, ky, px, py, l2);
    return [kx, ky];
  }
  function pattePaint(x, jx, jy, hx, hy, L, sens, c, sabot, gue, l1, l2) {
    const fx = jx + hx, fy = jy + hy, [kx, ky] = membre(x, c, jx, jy, fx, fy, L, sens, l1, l2);
    // la guetre au-dessus du sabot, le sabot
    if (gue) ligne(x, gue, lerp(kx, fx, .35), lerp(ky, fy, .35), lerp(kx, fx, .92), lerp(ky, fy, .92), l2 + .9);
    rect(x, sabot, fx - 1.6, fy - .6, 3.6, 2.4);
  }
  function chevalPaint(x, o, c) {
    const [cp, om, cr, sb] = c.robe;
    x.save();
    x.translate(CHX, CHY);
    x.rotate(o.p);
    const FJ = [13, 6], HJ = [-20, 4];
    // jambes du fond, plus sombres
    pattePaint(x, FJ[0] + 2, FJ[1], o.f2[0], o.f2[1], 10.5, -1, om, sb, null, 3.2, 1.9);
    pattePaint(x, HJ[0] + 2, HJ[1], o.h2[0], o.h2[1], 12.5, 1, om, sb, null, 4.2, 2);
    // la queue, tressee au depart puis au vent
    const qb = o.q || 0;
    courbe(x, cr, 3, -27, -7, -34, -6 + qb, -35 - qb * .4, 4 + qb * 1.4);
    courbe(x, cr, 2, -28, -6, -36, -3 + qb, -38 - qb * .3, 7 + qb);
    // le corps : la croupe ronde, le rein, le ventre qui remonte, l'epaule
    ell(x, cp, -18.5, -2.5, 10, 9);
    ell(x, cp, 11.5, -1, 10.5, 9.5);
    poly(x, cp, -20, -11.5, -8, -9, 3, -8.5, 13, -11, 21, -4, 20, 7, 9, 8.6, -6, 7.4, -18, 5.4);
    // l'ombre sous le ventre, le pli du flanc
    ell(x, om, -2, 7, 13, 1.6);
    ligne(x, om, -11.5, -3, -13, 4, 1);
    // jambes de devant : l'avant-bras, le canon
    pattePaint(x, FJ[0], FJ[1], o.f1[0], o.f1[1], 10.5, -1, cp, sb, c.guetre, 3.8, 2);
    // la cuisse, posee sur le corps
    ell(x, cp, -20, 1, 7, 7.5, .3);
    pattePaint(x, HJ[0], HJ[1], o.h1[0], o.h1[1], 12.5, 1, cp, sb, c.guetre, 4.6, 2.1);
    // l'encolure, plus ou moins tendue
    const n = o.n || 0, px = 30 + n * 6, py = -33 + n * 10, mx = px + 11 + n * 3, my = py + 14 - n * 2;
    const crX = 18 + n * 8, crY = -26 + n * 12;
    x.fillStyle = cp; x.beginPath(); x.moveTo(8, -10.5); x.quadraticCurveTo(crX, crY, px - 3, py - 1); x.lineTo(px + 2, py + 5); x.quadraticCurveTo(21 + n * 5, -11 + n * 5, 21.5, -1); x.lineTo(14, 2); x.closePath(); x.fill();
    // la crete tressee : de petites nattes regulieres, le long de l'arc
    for (let k = 0; k <= 5; k++) { const t = k / 5, u = 1 - t; ell(x, cr, u * u * 9 + 2 * u * t * crX + t * t * (px - 3), u * u * -11 + 2 * u * t * crY + t * t * (py - 1) - .3, 1.5, 1.2); }
    ell(x, cp, px + 1.4, py + 3, 3.2, 2.8);
    // la tete longue et le bout du nez
    poly(x, cp, px - 2.5, py - 2, px + 2.6, py - 1.8, mx + 1.4, my - 1.4, mx + 1.6, my + 1.2, mx - 1.2, my + 2, px, py + 5.6);
    poly(x, om, mx + 1.6, my - .6, mx + 1.6, my + 1.4, mx - 1.4, my + 2.2, mx - 1.6, my - .2);
    poly(x, cp, px - 2, py - 1.5, px - 1, py - 5, px + 1, py - 1.5);
    rect(x, sb, px + 2.1, py + 2.6, 1.2, 1.2);
    // le filet : les cuirs de la tete, le mors
    ligne(x, '#2a1c14', px + .4, py - .2, mx - 3.2, my + .4, .8);
    ligne(x, '#2a1c14', px + 3.4, py + 2, mx - 3, my - 1, .7);
    rect(x, '#d8d8d8', mx - 2.2, my + .6, 1, 1);
    // le tapis et la selle
    poly(x, c.tapis, -11, -10.5, 7, -11, 9, -1.5, -10, -1.5);
    ligne(x, '#ffffff', -10, -2, 9, -2, .8);
    poly(x, '#3a2418', -9, -12, -6, -14.5, -3, -11.5, 4, -11.5, 7, -14, 8, -10.6, -9, -10);
    // la sangle
    ligne(x, '#3a2418', 3, -9, 3.5, 7, 1.2);
    // le cavalier
    const l = o.lean, hipY = -14.5 - (o.dresse || 0), hipX = -2.2 + (o.dresse || 0) * .6;
    const ep = [hipX + Math.sin(l) * 12.5, hipY - Math.cos(l) * 12.5], te = [ep[0] + Math.sin(l * .8) * 5, ep[1] - Math.cos(l * .8) * 5];
    const main = o.main || [11, -16.5];
    // la jambe, la botte, l'etrier
    const gen = [hipX + 6.4, hipY + 6.5], che = [hipX + 3.8, hipY + 14.4];
    ligne(x, c.col, hipX, hipY, gen[0], gen[1], 4);
    ligne(x, '#17151f', gen[0], gen[1], che[0], che[1], 3);
    rect(x, '#17151f', che[0] - 1, che[1] - .5, 5, 2);
    // le buste, les pans de la veste
    ligne(x, c.veste, hipX - .6, hipY + .8, ep[0] - .4, ep[1], 5.6);
    poly(x, c.veste, hipX - 3.4, hipY - 1, hipX + 2, hipY - .6, hipX - .4, hipY + 3.6, hipX - 4.4, hipY + 3);
    rect(x, c.col, ep[0] + .8 + Math.sin(l) * 1.4, ep[1] + .6, 1.6, 2);
    // la tete, le casque et sa visiere
    disc(x, '#e8b896', te[0], te[1], 2.7);
    ell(x, c.casque, te[0] - .2, te[1] - 1, 3.2, 2.5, l * .6);
    ligne(x, c.casque, te[0] + 1.6, te[1] - 1.2, te[0] + 4.2, te[1] - .4 + l, 1);
    // le bras et les rennes
    const cou = [lerp(ep[0], main[0], .5) + .4, lerp(ep[1], main[1], .5) + 2.4];
    ligne(x, c.veste, ep[0] + .2, ep[1] + 1, cou[0], cou[1], 2.8);
    ligne(x, c.veste, cou[0], cou[1], main[0], main[1], 2.3);
    rect(x, '#e8b896', main[0] - .4, main[1] - .8, 2, 2);
    ligne(x, '#2a1c14', main[0] + 1, main[1], mx - 2, my + .8, .7);
    x.restore();
  }
  // la phase d'une jambe au galop : appui puis lever
  const phJambe = (k, R, lift, y0) => {
    k = ((k % 1) + 1) % 1;
    if (k < .34) { const t = k / .34; return [R * (1 - 2 * t), y0]; }
    const t = (k - .34) / .66, e = t * t * (3 - 2 * t);
    return [R * (-1 + 2 * e) - Math.sin(t * Math.PI) * 2.4, y0 - Math.sin(t * Math.PI) * lift];
  };
  const SAUT_K = [
    { p: -.38, f1: [9, -1], f2: [11, 1], h1: [-8, 21], h2: [-5, 21], n: -.2, lean: .3, q: 3, dresse: 0 },
    { p: -.34, f1: [11, -1], f2: [12, 0], h1: [-13, 16], h2: [-10, 17], n: 0, lean: .78, q: 3, dresse: 2.4, main: [17, -19] },
    { p: -.03, f1: [12, 1], f2: [13, 2], h1: [-13, 10], h2: [-11, 12], n: .75, lean: .95, q: 2, dresse: 3.2, main: [20, -14] },
    { p: .24, f1: [8, 8], f2: [11, 6], h1: [-10, 3], h2: [-7, 6], n: .55, lean: .8, q: 0, dresse: 2.6, main: [19, -13] },
    { p: .46, f1: [6, 19], f2: [9, 17], h1: [-11, 1], h2: [-8, 2], n: .1, lean: .3, q: -2, dresse: 1, main: [14, -15] },
  ];
  const ATTERRIR = [
    { p: .28, f1: [2, 19], f2: [-4, 19], h1: [-6, 10], h2: [-3, 10], n: 0, lean: .15, q: -2 },
    { p: .12, f1: [-6, 17], f2: [-8, 13], h1: [0, 16], h2: [5, 14], n: -.1, lean: .2, q: 0 },
    { p: .02, f1: [-4, 9], f2: [-6, 12], h1: [-2, 21], h2: [3, 21], n: 0, lean: .25, q: 1 },
  ];
  const mixPose = (a, b, k) => {
    const lp = (u, v) => [lerp(u[0], v[0], k), lerp(u[1], v[1], k)];
    const ma = a.main || [11, -16.5], mb = b.main || [11, -16.5];
    return { p: lerp(a.p, b.p, k), f1: lp(a.f1, b.f1), f2: lp(a.f2, b.f2), h1: lp(a.h1, b.h1), h2: lp(a.h2, b.h2), n: lerp(a.n, b.n, k), lean: lerp(a.lean, b.lean, k), q: lerp(a.q, b.q, k), dresse: lerp(a.dresse || 0, b.dresse || 0, k), main: lp(ma, mb) };
  };
  // 0-7 galop, 8-17 saut, 18-20 reception, 21-24 cabre
  const chevalFeuille = n => {
    const c = CAVALIERS[n];
    return feuille('cso' + n, CHW, CHH, 25, (x, kk, k) => {
      let o;
      if (k < 8) {
        const a = k / 8, s = Math.sin(a * TAU);
        o = { p: Math.sin((a + .1) * TAU) * .09, f1: phJambe(a + .43, 9.5, 8, 16), f2: phJambe(a + .3, 9.5, 8, 16), h1: phJambe(a + .13, 10.5, 7, 21), h2: phJambe(a, 10.5, 7, 21), n: -.05 + Math.sin(a * TAU + 1) * .14, lean: .24 - s * .05, q: Math.sin(a * TAU * 2) * 2, dresse: 1.4 + s * .6 };
      } else if (k < 18) {
        const t = (k - 8) / 9 * 4, a = Math.min(3, t | 0);
        o = mixPose(SAUT_K[a], SAUT_K[a + 1], t - a);
      } else if (k < 21) {
        o = ATTERRIR[k - 18];
      } else {
        // il se cabre : l'avant monte, les antérieurs battent, le cavalier se plie sur l'encolure
        const a = (k - 21) / 4, s = Math.sin(a * TAU);
        o = { p: -.82 - s * .05, f1: [8 + s * 3, 4 + s * 4], f2: [11 - s * 3, 7 - s * 4], h1: [-2, 23], h2: [3, 23], n: -.5, lean: .95, q: -1, dresse: .5, main: [14, -21] };
      }
      chevalPaint(x, o, c);
    });
  };
  // l'obstacle, vu de trois quarts : 0 chandelier et barres du fond, 1 la barre du haut, 2 le chandelier de devant
  const OBST = {
    rouge: { b: ['#d8362a', '#ffffff'], w: '#f4f0e4', w2: '#d8362a', n: 3 },
    bleu: { b: ['#2a6ad0', '#ffffff'], w: '#f4f0e4', w2: '#2a6ad0', n: 3, oxer: true },
    jaune: { b: ['#f0b820', '#23242e'], w: '#f0b820', w2: '#f4f0e4', n: 3 },
    vert: { b: ['#2a9a5a', '#ffffff'], w: '#f4f0e4', w2: '#2a9a5a', n: 3, oxer: true },
    mur: { b: ['#d8362a', '#f4f0e4'], w: '#f4f0e4', w2: '#8a4a30', n: 1, mur: true },
  };
  const OW = 88, OH = 62, OX = 44, OY = 46;
  const obstFeuille = nom => {
    const t = OBST[nom];
    const barre = (x, dx, h) => {
      const ax = OX - 19 + dx, ay = OY + 9.5, bx = OX + 19 + dx, by = OY - 9.5, n = 9;
      for (let i = 0; i < n; i++) ligne(x, t.b[i % 2], lerp(ax, bx, i / n), lerp(ay, by, i / n) - h, lerp(ax, bx, (i + 1) / n), lerp(ay, by, (i + 1) / n) - h, 2.6);
    };
    const aile = (x, a, b) => {
      // un chandelier : un montant, un panneau de lattes, le pied dans le sable
      rect(x, t.w, a, b - 31, 2.6, 31); rect(x, '#b8b4a8', a + 1.8, b - 31, .9, 31);
      rect(x, t.w, a + 9.6, b - 25, 2.2, 25);
      poly(x, t.w2, a + 2, b - 28, a + 10, b - 24, a + 10, b - 21, a + 2, b - 25);
      poly(x, t.w, a + 2, b - 22, a + 10, b - 18, a + 10, b - 15, a + 2, b - 19);
      poly(x, t.w2, a + 2, b - 16, a + 10, b - 12, a + 10, b - 9, a + 2, b - 13);
      poly(x, t.w, a + 2, b - 10, a + 10, b - 6, a + 10, b - 3, a + 2, b - 7);
      rect(x, '#8a8478', a - 2, b - 1, 16, 1.6);
    };
    return feuille('obst' + nom, OW, OH, 3, (x, kk, k) => {
      if (k === 0) {
        aile(x, OX + 12, OY - 7);
        if (t.mur) {
          // le petit mur de briques peintes
          poly(x, '#b85a3c', OX - 18, OY + 9, OX + 20, OY - 9, OX + 20, OY - 24, OX - 18, OY - 6);
          for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const a = (i + (j % 2) * .5) / 6.4, xx = lerp(OX - 18, OX + 20, a), yy = lerp(OY + 9, OY - 9, a) - 3.6 * j - 2; ligne(x, j % 2 ? '#d87a54' : '#a84e34', xx, yy, xx + 4.6, yy - 2.2, 2.4); }
          poly(x, '#f4f0e4', OX - 18, OY - 6, OX + 20, OY - 24, OX + 20, OY - 26, OX - 18, OY - 8);
        } else {
          if (t.oxer) { barre(x, 13, 11); barre(x, 13, 19); }
          barre(x, 0, 6); barre(x, 0, 13);
        }
      } else if (k === 1) { barre(x, 0, 21); }
      else {
        aile(x, OX - 26, OY + 11);
        // la jardiniere de fleurs au pied
        rect(x, '#7a5a3a', OX - 40, OY + 9, 13, 3);
        for (let i = 0; i < 6; i++) disc(x, ['#e0503c', '#f0c040', '#f4f0e4'][i % 3], OX - 39 + i * 2.2, OY + 8, 1.2);
      }
    }, '#4a4650');
  };
  const PARCOURS = [[260, 'rouge'], [460, 'bleu'], [640, 'jaune'], [880, 'mur'], [1060, 'vert'], [1250, 'rouge'], [1450, 'jaune']];
  const LARG_CARR = 2600 / S;
  const obstEnSuite = X => { const n = Math.floor(X / LARG_CARR); for (const c of [n, n + 1]) for (const q of PARCOURS) { const u = c * LARG_CARR + q[0]; if (u > X) return u; } return Infinity; };
  const DITS_CSO = { refus: ['Holà ! Holà !', 'Ton drone !', 'Il a eu peur !', 'Ah non, pas ça...', 'Refus ! Zut.'], faute: ['Quatre points...', 'Et la barre !', 'Zut, la barre !', 'Ma mère regarde...'], pur: ['Hop !', 'Sans faute !', 'Allez, allez !', 'Bien, ma belle !', 'Hop, hop, hop !', 'Regarde-moi ça !'] };
  FX.cso = (sc, arg) => {
    const i = V.plan(sc, 'peint', +(arg || 4)), f = f_(sc, i), p = sc.plans[i], l = [], gr = grains(140);
    const CH = [0, 1, 2].map(chevalFeuille);
    const OB = {}; for (const k in OBST) OB[k] = obstFeuille(k);
    const Y = p.y + (p.nh - 46) / S, E0 = 25 / S, TAKE = 30, SAUT = 62, ES = {};
    let attente = 0, lie = null, dernier = -1;
    const lance = (d, X) => {
      dernier = (dernier + 1) % 3;
      const o = { X: X === undefined ? -60 + d * f : X, v: rnd(90, 104), c: dernier, ph: rnd(1), st: 'g', t: 0, H: E0, Hv: E0, fini: 0, cab: 0, dire: null, direT: 0, peur: 0, fin: 0 };
      l.push(o);
      return o;
    };
    const parle = (o, cat) => { o.dire = pick(DITS_CSO[cat]); o.direT = 1.5; };
    const fe = X => ES[X] || (ES[X] = { tombe: -1, a: 0 });
    return {
      plan: i,
      maj(dt, d) {
        const dr = V.drone(), su = sujetDe('vise_cso');
        attente -= dt;
        if (su && !su.fin && (!lie || l.indexOf(lie) < 0)) lie = lance(d, -30 + d * f);
        if (attente <= 0 && l.length < 3) { lance(d); attente = rnd(2.4, 5); }
        for (const o of l) {
          o.direT -= dt;
          const sx = o.X - d * f;
          if (o.st === 'g') {
            o.X += o.v * dt; o.ph += dt * o.v / 58;
            o.H = E0 + Math.sin(o.ph * TAU + 1) * .5;
            const u = obstEnSuite(o.X - 1), dist = u - o.X;
            // le drone rase le sable tout pres : le cheval prend peur et se cabre, une seule fois par obstacle
            if (dr && dr.proche && Math.abs(sx - dr.x) < 60 && dist > 34 && o.peur <= 0) { o.st = 'c'; o.t = 0; o.peur = 7; o.cab = rnd(1.2, 1.7); parle(o, 'refus'); for (let q = 0; q < 12; q++) gr.add(o.X + rnd(-6, 12), Y, rnd(-30, 30), -rnd(8, 40), rnd(.3, .7), '#e8d8a8', 1); }
            else if (dist <= TAKE) { o.st = 's'; o.t = 0; o.ob = u; o.touche = Math.random() < .2; o.dep = o.X; for (let q = 0; q < 9; q++) gr.add(o.X - rnd(4, 14), Y, -rnd(8, 40), -rnd(10, 46), rnd(.25, .55), Math.random() < .5 ? '#f4e4ba' : '#c8ae7c', Math.random() < .3 ? 2 : 1); }
            if (Math.random() < dt * 24) gr.add(o.X - rnd(10, 18), Y - rnd(0, 1), -rnd(6, 30), -rnd(4, 22), rnd(.2, .5), Math.random() < .5 ? '#f4e4ba' : '#d8c08c', 1);
          } else if (o.st === 's') {
            o.t += dt * o.v / SAUT;
            o.X = o.dep + SAUT * Math.min(1, o.t);
            const k = Math.min(1, o.t);
            o.H = lerp(32, 31, k) / S + 20 / S * 4 * k * (1 - k);
            if (o.touche && k > .58 && !o.fait) { o.fait = true; const e = fe(o.ob); if (e.tombe < 0) e.tombe = 0; parle(o, 'faute'); }
            if (k > .4 && !o.fait && !o.pur && Math.random() < .5) { o.pur = true; if (Math.random() < .5) parle(o, 'pur'); }
            if (k >= 1) { o.st = 'r'; o.t = 0; o.fait = o.pur = false; for (let q = 0; q < 20; q++) gr.add(o.X + rnd(2, 20), Y - rnd(0, 1), rnd(-20, 70), -rnd(14, 70), rnd(.3, .7), q % 3 ? '#f4e4ba' : '#c8ae7c', q % 4 ? 1 : 2); }
          } else if (o.st === 'r') {
            o.t += dt * 5.4;
            o.X += o.v * dt * .86; o.ph += dt * o.v / 58;
            o.H = lerp(28, 25, Math.min(1, o.t / 3)) / S;
            if (o.t >= 3) { o.st = 'g'; o.ph = .2; }
          } else if (o.st === 'c') {
            o.t += dt;
            o.X += 4 * dt;
            o.H = 37 / S;
            if (o.t >= o.cab) { o.st = 'g'; o.ph = .1; }
          }
          o.peur = Math.max(0, o.peur - dt);
          // on lisse la hauteur : aucun saut d'une image a l'autre
          o.Hv += (o.H - o.Hv) * Math.min(1, dt * 26);
        }
        for (const k in ES) if (ES[k].tombe >= 0) ES[k].tombe += dt;
        gr.maj(dt, 120);
        for (let k = l.length - 1; k >= 0; k--) if (l[k].X - d * f > G.VW + 70) { if (l[k] === lie) { lie = null; if (su) { su.x = -9999; su.fin = true; } } l.splice(k, 1); }
        if (su && lie) { su.x = lie.X - d * f + 4; const w = G.Jeu.w(); su.y = Y + w.camY * (Math.max(.1, Math.min(1, f * 1.1)) - 1); }
      },
      draw(x, d, camY, T) {
        const off = d * f, n = Math.floor(off / LARG_CARR), yy = Y + camY;
        const vus = [];
        for (const c of [n, n + 1]) for (const q of PARCOURS) { const X = c * LARG_CARR + q[0], sx = X - off; if (sx > -50 && sx < G.VW + 50) vus.push([X, sx, q[1]]); }
        for (const [X, sx, nom] of vus) {
          const F = OB[nom], e = ES[X];
          // l'ombre au sol
          V.R(x, '#cdb486', sx - 15, yy + 2, 30, 1);
          pose(x, F[0], sx, yy + (OH - OY) / S, 0, false, OX / OW, 1);
          if (e && e.tombe >= 0) {
            const k = Math.min(1, e.tombe / .34), kk = k * k;
            pose(x, F[1], sx - 3 * kk, yy + (OH - OY) / S + kk * 13, kk * .22, false, OX / OW, 1);
          } else pose(x, F[1], sx, yy + (OH - OY) / S, 0, false, OX / OW, 1);
        }
        gr.draw(x, d, f, camY);
        for (const o of l) {
          const sx = o.X - off;
          if (sx < -60 || sx > G.VW + 60) continue;
          const air = Math.max(0, o.Hv - E0);
          // l'ombre sur le sable : elle se detache quand il saute
          x.fillStyle = '#c8ae7c';
          const lo = 25 - air * .5;
          x.fillRect(sx - lo / 2 - 2, yy - .4, lo, 1.2);
          x.fillRect(sx - lo / 2 + 3, yy + .6, lo - 8, .7);
          let fr;
          if (o.st === 's') fr = 8 + Math.min(9, Math.max(0, Math.floor(Math.min(1, o.t) * 9.99)));
          else if (o.st === 'r') fr = 18 + Math.min(2, o.t | 0);
          else if (o.st === 'c') fr = 21 + ((T * 7 | 0) & 3);
          else fr = (((o.ph % 1) + 1) % 1 * 8) | 0;
          pose(x, CH[o.c][fr], sx, yy - o.Hv, 0, false, CHX / CHW, CHY / CHH);
          if (o.direT > 0 && o.dire && sx > 10 && sx < G.VW - 10) G.Lumiere.bulle(x, o.dire, sx + 4, yy - o.Hv - 28, 0, o);
        }
        for (const [X, sx, nom] of vus) pose(x, OB[nom][2], sx, yy + (OH - OY) / S, 0, false, OX / OW, 1);
      },
    };
  };

  /* ==================== LES GLENAN ==================== */
  const VOILES = {
    caravelle: { coque: '#f4f0e4', bande: '#2a5a9a', gv: '#f8f6ee', ligne: '#d8362a', foc: '#f0ece0', lo: 32, mat: 42, crew: 3 },
    vaurien: { coque: '#e0663c', bande: '#f4f0e4', gv: '#3a7ad0', ligne: '#f4f0e4', foc: '#3a7ad0', lo: 25, mat: 34, crew: 2 },
    ecole: { coque: '#f4f4f0', bande: '#c8362a', gv: '#faf8f2', ligne: '#20345a', foc: '#faf8f2', lo: 46, mat: 62, crew: 4 },
  };
  const VW_ = 90, VH_ = 96, VOX = 42, VOY = 80;
  // 3 gites x 2 battements de voile ; le bateau va vers la droite, le vent vient de la gauche
  const voileFeuille = (nom, e) => feuille('voile' + nom + e, VW_ * e, VH_ * e, 6, (x, kk, k) => {
    const t = VOILES[nom], g = k >> 1, bat = k & 1;
    x.save();
    x.translate(VOX * e, VOY * e);
    x.scale(e, e);
    const gite = [.08, .2, .34][g];
    const lo = t.lo, mat = t.mat;
    // la coque, qui s'enfonce un peu a la gite
    poly(x, t.coque, -lo * .46, -3.6, lo * .5, -5.2, lo * .56, -2.2, lo * .4, 2, -lo * .4, 2);
    poly(x, t.bande, -lo * .46, -1.4, lo * .53, -2.8, lo * .56, -2.2, lo * .4, 2, -lo * .4, 2);
    ligne(x, '#ffffff', -lo * .44, -3.6, lo * .48, -5, .8);
    // le gréement penche a la gite
    x.save();
    x.translate(lo * .08, -3);
    x.rotate(gite);
    const mx = 0, hm = -mat;
    // le foc, a l'avant
    poly(x, t.foc, mx + 1, hm * .78, lo * .44, -1, mx + 3 + bat * .6, -2.6 - bat * .4);
    // la grand-voile : le guindant au mat, la chute courbe, la bome
    x.fillStyle = t.gv; x.beginPath(); x.moveTo(mx - 1, hm); x.quadraticCurveTo(-lo * .34 - bat, hm * .44, -lo * .56, -4.2); x.lineTo(mx - 1, -4.2); x.closePath(); x.fill();
    // les laizes et la bande de couleur
    for (let i = 1; i < 4; i++) { const yy = hm + (-4.2 - hm) * i / 4, wid = lerp(1, lo * .52, i / 4); ligne(x, i === 2 ? t.ligne : '#c8ccd4', mx - 1.2, yy, mx - wid, yy + 1.4, i === 2 ? 1.4 : .5); }
    // l'ombre dans le creux de la voile
    x.fillStyle = 'rgba(70,90,130,.22)'; x.beginPath(); x.moveTo(mx - 1, hm * .76); x.quadraticCurveTo(-lo * .24 - bat, hm * .36, -lo * .3, -5); x.lineTo(mx - 1, -5); x.closePath(); x.fill();
    ligne(x, '#4a4a54', mx, hm - 2, mx, -2, 1.1);
    ligne(x, '#4a4a54', mx, -4.4, -lo * .57, -3.8, 1);
    x.restore();
    // l'equipage : gilets orange ; a la gite ils se penchent au rappel, du cote du vent
    const pen = -[.05, .3, .6][g];
    for (let c = 0; c < t.crew - 1; c++) {
      const cx = -lo * .3 + c * lo * .17, hy = -4;
      const ep = [cx + Math.sin(pen) * 5.4, hy - Math.cos(pen) * 5.4];
      ligne(x, '#f07a20', cx, hy, ep[0], ep[1], 3.4);
      disc(x, '#e8b896', ep[0] + Math.sin(pen) * 2.4, ep[1] - Math.cos(pen) * 2.4, 1.7);
      ell(x, c % 2 ? '#3a2a20' : '#c8a050', ep[0] + Math.sin(pen) * 2.4 - .2, ep[1] - Math.cos(pen) * 2.4 - .7, 1.7, 1.1);
    }
    x.restore();
  }, '#2a3a54');
  const DITS_VOILE = ['Paré à virer ?', 'Envoyez !', 'Borde ta voile !', 'Attention, la bôme !', 'Choque un peu !', 'On est au lof !', 'Au rappel, tout le monde !', 'Ça gîte !', 'Le moniteur regarde...', 'Pas le drone, pas le drone !'];
  FX.glenan_voiles = (sc, arg) => {
    const [n = 3, y0 = 170, y1 = 180, e = 1, max = 3] = (arg || '').split(',').map(Number);
    const i = V.plan(sc, 'mer', n), f = f_(sc, i), l = [], gr = grains(70), devant = sc.plans[i + 1] && sc.plans[i + 1].k === 'peint' ? i + 1 : i;
    const F = { caravelle: voileFeuille('caravelle', e), vaurien: voileFeuille('vaurien', e), ecole: voileFeuille('ecole', e) };
    const noms = ['caravelle', 'vaurien', 'caravelle', 'ecole', 'vaurien'];
    let attente = 0, lie = null, tour_ = irnd(0, 4);
    const lance = (d, sx) => {
      const nom = noms[tour_++ % 5], sens = Math.random() < .5 ? 1 : -1;
      const o = { nom, X: (sx === undefined ? (sens > 0 ? -40 : G.VW + 40) : sx) + d * f, Y: rnd(y0, y1), sens, cap: sens, v: rnd(22, 34) * e + 8, g: irnd(0, 2), T: rnd(0, 6), bord: rnd(3.5, 8), vir: 0, dess: 0, ph: rnd(6), dire: null, direT: 0, deja: false };
      l.push(o); l.sort((a, b) => a.Y - b.Y);
      return o;
    };
    for (let k = 0; k < Math.min(2, max); k++) lance(0, rnd(40, G.VW - 40));
    return {
      plan: devant,
      bateaux: l, f, e,   // lus par tests/glenan.js
      maj(dt, d) {
        const dr = V.drone(), su = e > 1 ? sujetDe('vise_voile') : null;
        attente -= dt;
        if (su && !su.fin && (!lie || l.indexOf(lie) < 0)) lie = lance(d, G.VW + 30);
        if (attente <= 0 && l.length < max) { lance(d); attente = rnd(2, 5); }
        for (const o of l) {
          o.T += dt; o.direT -= dt;
          const sx = o.X - d * f;
          o.bord -= dt;
          if (o.vir > 0) {
            // le virement : l'etrave passe dans le vent, la voile bat, tout le monde change de bord
            o.vir -= dt;
            const k = 1 - Math.max(0, o.vir) / .9;
            o.cap = lerp(-o.sens, o.sens, k * k * (3 - 2 * k));
            if (o.vir <= 0) { o.cap = o.sens; }
            if (Math.random() < .4 * dt) { o.dire = 'Paré à virer ?'; o.direT = 1; }
          } else if (o.bord <= 0 && sx > -20 && sx < G.VW + 20) {
            o.sens = -o.sens; o.vir = .9; o.bord = rnd(4, 9); o.g = irnd(0, 2);
          }
          o.X += o.cap * o.v * dt;
          if (Math.random() < dt * .08) { o.dire = pick(DITS_VOILE); o.direT = 1.6; }
          if (Math.random() < dt * 12 * e) gr.add(o.X - o.cap * VOILES[o.nom].lo * .42 * e, o.Y + .4, -o.cap * rnd(2, 10), -rnd(0, 5), rnd(.25, .55), '#ffffff', 1);
          // le drone passe tout pres : l'equipage le salue, le bateau reste debout (Max, 03/11/2026 : « ne fais pas tomber les bateaux »)
          if (e > 1 && dr && !o.deja && Math.abs(sx - dr.x) < 38 && Math.abs(dr.y - (o.Y - 26)) < 42) {
            o.deja = true;
            o.dire = pick(['Coucou le drone !', 'Pas le drone, pas le drone !', 'Le drone !']); o.direT = 1.4;
          }
        }
        gr.maj(dt, 90);
        for (let k = l.length - 1; k >= 0; k--) { const sx = l[k].X - d * f; if (sx < -70 || sx > G.VW + 70) { if (l[k] === lie) { lie = null; if (su) { su.x = -9999; su.fin = true; } } l.splice(k, 1); } }
        if (su && lie) { su.x = lie.X - d * f; const w = G.Jeu.w(); su.y = lie.Y + w.camY * (Math.max(.1, Math.min(1, f * 1.1)) - 1) + 2; }
      },
      draw(x, d, camY, T) {
        const off = d * f;
        for (const o of l) {
          const sx = o.X - off, y = o.Y + camY + Math.sin(T * 1.6 + o.ph) * .5;
          if (sx < -60 || sx > G.VW + 60) continue;
          const t = VOILES[o.nom], lo = t.lo * e / S;
          // le reflet, la voile dans l'eau claire : quelques traits
          x.globalAlpha = .28;
          for (let q = 0; q < 6; q++) { const yy = y + 1.4 + q * 1.8 * e, l2 = (lo * .7 - q * .9 * e) * (.5 + .5 * Math.abs(o.cap)); if (l2 > .4) V.R(x, q < 2 ? '#20506a' : '#ffffff', sx - l2 / 2 + Math.sin(T * 2.2 + q + o.ph) * .9, yy, l2, .7); }
          x.globalAlpha = 1;
          // le sillage
          for (let q = 0; q < 5; q++) { const dec = -o.cap * (lo * .5 + q * 4.6 * e + (T * 8 % 4.6)); V.R(x, '#ffffff', sx + dec, y + .5 + (q % 2) * .6, (5 - q * .7) * e, .7); }
          const fr = o.vir > 0 ? (T * 12 | 0) & 1 : (o.g << 1) | ((T * 3 + o.ph | 0) & 1);
          const ex = Math.max(.12, Math.abs(o.cap));
          pose(x, F[o.nom][fr], sx, y, 0, o.cap < 0, VOX / VW_, VOY / VH_, ex);
          if (o.direT > 0 && o.dire && sx > 12 && sx < G.VW - 12) G.Lumiere.bulle(x, o.dire, sx, y - 36 * e, 0, o);
        }
        gr.draw(x, d, f, camY);
      },
    };
  };
  /* Le scintillement de l'eau tres claire : les mailles de lumiere sur le fond de sable */
  FX.glenan_eau = (sc, arg) => {
    const [n = 3, y0 = 156, y1 = 200, nb = 70] = (arg || '').split(',').map(Number);
    const i = V.plan(sc, 'mer', n), f = f_(sc, i), l = [];
    for (let k = 0; k < nb; k++) l.push({ X: rnd(0, 700), y: rnd(y0, y1), ph: rnd(TAU), v: rnd(1.2, 2.6), lo: rnd(2, 8) });
    return {
      plan: sc.plans[i + 1] && sc.plans[i + 1].k === 'peint' ? i + 1 : i,
      draw(x, d, camY, T) {
        const off = d * f;
        for (const q of l) {
          const a = Math.sin(T * q.v + q.ph);
          if (a < .1) continue;
          const sx = ((q.X - off) % 700 + 700) % 700;
          if (sx > G.VW) continue;
          V.R(x, a > .7 ? '#ffffff' : '#d8faf0', sx + Math.sin(T + q.ph) * 2, q.y + camY, q.lo * (.5 + (q.y - y0) / (y1 - y0)), .7);
        }
      },
    };
  };

  /* ==================== LA MAISON ==================== */
  /* ---- La fumee de la grande cheminee ---- */
  FX.fumee_maison = (sc, arg) => {
    const i = V.plan(sc, 'peint', +(arg || 1)), f = f_(sc, i), p = sc.plans[i], l = [], per = p.nw / S;
    // le haut de la cheminee de la maison : voir sgr_maison dans monuments_ouest.py
    const X0 = (60 + 36) / S, Y0 = p.y + (p.nh - 8 + 2 - 151) / S;
    let att = 0;
    return {
      plan: i,
      maj(dt, d) {
        att -= dt;
        if (att <= 0) { att = rnd(.18, .4); l.push({ dx: 0, y: 0, t: 0, T: rnd(2, 3.4), r: rnd(1, 1.8), ph: rnd(6) }); }
        for (let k = l.length - 1; k >= 0; k--) { const q = l[k]; q.t += dt; q.y -= dt * 7; q.dx += dt * 3.2; if (q.t > q.T) l.splice(k, 1); }
      },
      draw(x, d, camY) {
        const off = d * f, sx = ((X0 - off) % per + per) % per;
        if (sx > G.VW + 40) return;
        for (const q of l) { x.globalAlpha = (1 - q.t / q.T) * .55; const r = q.r + q.t * 1.6; V.R(x, '#f0ece4', sx + q.dx + Math.sin(q.t * 2 + q.ph) * 1.5 - r, Y0 + q.y + camY - r * .6, r * 2, r * 1.2); }
        x.globalAlpha = 1;
      },
    };
  };

  /* ---- Les oies : cou tendu, elles se dandinent, cacardent, et poursuivent le drone en sifflant ---- */
  const COUL_OIE = [['#f6f4ea', '#c8c6c0', '#e0ded4'], ['#8c8c8a', '#5e5e62', '#f0eee4']];
  const OIW = 56, OIH = 40, OIX = 20, OIY = 38;
  // 0-5 marche, 6-9 broute, 10-13 cacarde, 14-19 charge
  const oieFeuille = n => {
    const [cp, om, cl] = COUL_OIE[n];
    return feuille('oie' + n, OIW, OIH, 20, (x, kk, k) => {
      x.translate(OIX, OIY);
      let a, bx = 0, by = 0, rot = 0, tete, cou, ouvre = 0, aile = 0, pat;
      if (k < 6) { a = k / 6 * TAU; by = -Math.abs(Math.sin(a)) * .8; rot = Math.sin(a) * .07; tete = [11 + Math.sin(a) * .7, -23.5 + by]; cou = [9.5, -18]; pat = [Math.sin(a) * 3.4, -Math.sin(a) * 3.4]; }
      else if (k < 10) { a = (k - 6) / 4 * TAU; rot = .16; by = -.5; tete = [13.5, -3 - Math.max(0, Math.sin(a)) * 2]; cou = [16, -11]; pat = [-1.5, 1.5]; }
      else if (k < 14) { a = (k - 10) / 4 * TAU; by = -.4; rot = -.1; tete = [10.5 + Math.sin(a) * 1, -25.5]; cou = [8.5, -21]; ouvre = (k % 2) * 1.8; pat = [-1.5, 1.5]; aile = (k % 2) * .4; }
      else { a = (k - 14) / 6 * TAU; by = -Math.abs(Math.sin(a)) * 1.2; rot = .1; tete = [24, -13.5 + by + Math.sin(a * 2) * .5]; cou = [16.5, -14]; ouvre = 2.2; aile = .6 + Math.sin(a * 2) * .4; pat = [Math.sin(a) * 5, -Math.sin(a) * 5]; }
      // les pattes
      for (const [px, c] of [[pat[1], '#c8641c'], [pat[0], '#ee8428']]) {
        const le = Math.max(0, -px * (k >= 14 ? .35 : .3));
        ligne(x, c, 1.5 + (c === '#ee8428' ? 0 : 1.5), -6 + by, 1.5 + (c === '#ee8428' ? 0 : 1.5) + px, -1.6 - le, 1.6);
        rect(x, c, 1.5 + (c === '#ee8428' ? 0 : 1.5) + px - .8, -1.8 - le, 4, 1.8);
      }
      x.save(); x.translate(bx + 2, by - 11); x.rotate(rot);
      // le corps lourd, la queue relevee, le ventre qui balaie le sol
      ell(x, cp, -1, 0, 12, 7.6);
      poly(x, cp, -11, -2, -18, -6, -15, 1, -9, 4);
      ell(x, om, 0, 4.6, 8.6, 2.6);
      ell(x, cl, 7, -.5, 4.6, 5);
      if (aile > 0) {
        // l'aile a demi ouverte, menacante
        poly(x, cl, 3, -3, -12, -9 - aile * 8, -16, -2 - aile * 3, -7, 2);
        for (let q = 0; q < 3; q++) ligne(x, om, -3 - q * 4, -2 - q, -8 - q * 3, -6 - aile * 5, .8);
      } else {
        poly(x, cl, 4, -3.2, -9, -4, -14, -1, -7, 3, 3, 2.6);
        ligne(x, om, -12, -1, -2, 2.5, .8); ligne(x, om, -9, -3, 1, .3, .8);
      }
      x.restore();
      // le cou long, la tete, le bec orange
      const base = [10, by - 13];
      x.strokeStyle = cp; x.lineCap = 'round'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(base[0], base[1]); x.quadraticCurveTo(cou[0] + 2.2, cou[1] + by + 1, tete[0] - 1, tete[1] + 1); x.stroke();
      x.strokeStyle = om; x.lineWidth = .8; x.beginPath(); x.moveTo(base[0] + 1.4, base[1] + 1); x.quadraticCurveTo(cou[0] + 3.4, cou[1] + by + 1.5, tete[0] + .2, tete[1] + 2); x.stroke();
      ell(x, cp, tete[0], tete[1], 2.8, 2.4);
      const bas = k >= 6 && k < 10;
      if (bas) { poly(x, '#ee8428', tete[0] + 1, tete[1] + .6, tete[0] + 4.4, tete[1] + 3.4, tete[0] + .4, tete[1] + 2.4); rect(x, K, tete[0] + .4, tete[1] - 1, 1, 1); }
      else {
        poly(x, '#ee8428', tete[0] + 1.8, tete[1] - 1, tete[0] + 6.4, tete[1] - .2 - ouvre * .4, tete[0] + 2, tete[1] + .2);
        poly(x, '#d8701c', tete[0] + 1.8, tete[1] + .4, tete[0] + 5.6, tete[1] + 1 + ouvre, tete[0] + 1.6, tete[1] + 1.4);
        if (ouvre) rect(x, '#b03020', tete[0] + 2.6, tete[1] + .2, 1.8, Math.max(.6, ouvre * .4));
        rect(x, K, tete[0] + .4, tete[1] - 1.2, 1, 1);
      }
    }, '#3a3a3a');
  };

  /* ---- Les poules ---- */
  // la cinquieme : la coucou de Rennes du jardin des oiseaux, grise mouchetee de noir (5e couleur : ses taches)
  const COUL_POULE = [['#b0562c', '#7a3a20', '#d88a48', '#3a2a20'], ['#23232c', '#14141c', '#4a4a5a', '#2a5a50'], ['#f0ece0', '#c8c4b8', '#ffffff', '#c8c4b8'], ['#a8804c', '#7a5a34', '#d8c090', '#4a3a28'],
    ['#9a9ca6', '#6c6e78', '#c2c4cc', '#3a3c46', '#26262e']];
  // ses taches, dans le repere du corps (elles suivent le corps quand elle picore ou s'envole) : dos, flanc, aile, queue, poitrail
  const MOUCHETURES = [[-4, -2], [-1, -3], [2, -2.5], [-3, 1], [0, 0], [3, .5], [-5.5, -.5], [1, 2.5], [-2, 3], [4, -1.5], [5, 1.5], [-7.5, -2.5], [-6.6, -.4], [4, -2.5], [-1.5, -.5]];
  const POW = 30, POH = 28, POX = 13, POY = 26;
  // 0-3 marche, 4-7 picore, 8-11 panique
  const pouleFeuille = (n, coq) => {
    const [cp, om, cl, q] = COUL_POULE[n];
    return feuille('poule' + n + (coq ? 'c' : ''), POW, POH, 12, (x, kk, k) => {
      x.translate(POX, POY);
      let a, by = 0, rot = 0, tete, cou = [5, -9], pat = [0, 0], aile = 0, bec = 0;
      if (k < 4) { a = k / 4 * TAU; by = -Math.abs(Math.sin(a)) * .5; tete = [7.5 + Math.sin(a) * 1.2, -13.5]; pat = [Math.sin(a) * 2.2, -Math.sin(a) * 2.2]; }
      else if (k < 8) { a = (k - 4) / 4; rot = .34; by = -.3; const d_ = k === 5 || k === 6; tete = [9.5, d_ ? -1.5 : -5]; pat = [-1, 1]; bec = d_; }
      else { a = (k - 8) / 4 * TAU; rot = .16; by = -1 - Math.abs(Math.sin(a)) * 1.5; tete = [11, -11.5 + by]; aile = .3 + Math.abs(Math.sin(a * 2)) * .8; pat = [Math.sin(a) * 3.4, -Math.sin(a) * 3.4]; }
      for (const [px, c, d2] of [[pat[1], '#c8a030', 1], [pat[0], '#e8c040', 0]]) {
        ligne(x, c, .4 + d2 * 1.6, -5 + by, .4 + d2 * 1.6 + px, -1.2 - Math.max(0, -px) * .3, 1.1);
        rect(x, c, .4 + d2 * 1.6 + px - .6, -1.4 - Math.max(0, -px) * .3, 3, 1.3);
      }
      x.save(); x.translate(0, by - 7.5); x.rotate(rot);
      ell(x, cp, 0, 0, 6.4, 4.8);
      // la queue
      if (coq) { for (let i = 0; i < 4; i++) courbe(x, i % 2 ? q : '#2a7a5a', 1.5, -5, -1, -12, -8 + i * 2, -11 - i * .6, 1 + i); }
      else poly(x, om, -5, -2, -10, -7, -9, -1, -5, 2);
      ell(x, cl, 4, -.4, 3, 3.2);
      if (aile > 0) { poly(x, cl, 2, -2, -7, -3 - aile * 7, -9, 0 - aile * 2, -3, 2.4); ligne(x, om, -4, -1 - aile * 2, -7, -2 - aile * 5, .7); }
      else { poly(x, om, 2, -1.6, -5, -1.4, -4, 2.2, 1, 2.2); ligne(x, cl, -3, 0, 1, .4, .6); }
      if (COUL_POULE[n][4]) for (const [a_, b_] of MOUCHETURES) rect(x, COUL_POULE[n][4], a_ - .8, b_ - .8, 1.6, 1.6);
      x.restore();
      x.strokeStyle = coq ? '#e8a030' : cl; x.lineWidth = 2.8; x.lineCap = 'round'; x.beginPath(); x.moveTo(4.5, by - 9); x.quadraticCurveTo(cou[0] + 1, cou[1] + by, tete[0] - .4, tete[1] + .4); x.stroke();
      ell(x, coq ? '#e8a030' : cp, tete[0], tete[1], 2.1, 1.9);
      // la crete, les barbillons, le bec
      for (let i = -1; i < (coq ? 3 : 2); i++) disc(x, '#d8281c', tete[0] - .5 + i * 1.1, tete[1] - 2 - (coq ? (i === 0 ? .8 : .3) : 0), coq ? 1.1 : .8);
      rect(x, '#d8281c', tete[0] + .4, tete[1] + 1.2, 1.1, coq ? 2.2 : 1.4);
      rect(x, '#e8b820', tete[0] + 1.6, tete[1] + (bec ? .8 : -.4), 2.2, 1);
      rect(x, K, tete[0] + .3, tete[1] - .8, .9, .9);
    }, '#2e2a26');
  };

  /* ---- Les canards coureurs indiens : droits comme des bouteilles, ils courent en troupe ---- */
  const COUL_CAN = [['#f6f4ea', '#d8d4c8', '#f0a030'], ['#b8986c', '#8a7048', '#3a4a4a'], ['#5a5048', '#2a2a30', '#2f5a48'], ['#f0ece0', '#b8986c', '#e8a030']];
  const CAW = 22, CAH = 34, CAX = 9, CAY = 32;
  // 0-5 course, 6-7 s'arrete et regarde, 8-11 panique, le cou encore plus haut
  const canardFeuille = n => {
    const [cp, om, bc] = COUL_CAN[n];
    return feuille('canard' + n, CAW, CAH, 12, (x, kk, k) => {
      x.translate(CAX, CAY);
      const a = (k < 6 ? k / 6 : k < 8 ? 0 : (k - 8) / 4) * TAU, by = k < 6 ? -Math.abs(Math.sin(a)) * 1.2 : k < 8 ? 0 : -Math.abs(Math.sin(a)) * 1.8;
      const l = k < 6 ? .2 + Math.sin(a * 2) * .05 : k < 8 ? .05 : .3 + Math.sin(a * 2) * .06;
      const ps = k < 8 && k >= 6 ? [1, -1] : [Math.sin(a) * (k < 6 ? 3 : 4), -Math.sin(a) * (k < 6 ? 3 : 4)];
      for (const [px, c, d2] of [[ps[1], '#c86c1c', 1.4], [ps[0], '#ee8428', 0]]) {
        ligne(x, c, d2, -6 + by, d2 + px, -1.4 - Math.max(0, -px) * .4, 1.2);
        rect(x, c, d2 + px - .4, -1.6 - Math.max(0, -px) * .4, 3, 1.3);
      }
      x.save(); x.translate(0, by - 5); x.rotate(l);
      // le corps en bouteille : tres droit, tout en longueur
      ell(x, cp, 0, -6.4, 3.6, 7.6);
      ell(x, om, -1.2, -5, 2, 5.2);
      poly(x, cp, -2.4, -.8, -5.4, 2, -1.2, 1.2);
      // le cou fin, la petite tete, le bec plat
      const dt = k === 7 ? .8 : 0;
      ligne(x, n === 3 ? '#f0ece0' : cp, .4, -13, 1 + dt, -19 - (k >= 8 ? 1.2 : 0), 2);
      ell(x, n === 2 ? bc : cp, 1.2 + dt, -20.4 - (k >= 8 ? 1.2 : 0), 2.3, 1.9);
      poly(x, '#e8a030', 2.8 + dt, -21 - (k >= 8 ? 1.2 : 0), 6.8 + dt, -19.6 - (k >= 8 ? 1.2 : 0), 2.8 + dt, -19.2 - (k >= 8 ? 1.2 : 0));
      rect(x, K, 1.6 + dt, -21 - (k >= 8 ? 1.2 : 0), .9, .9);
      x.restore();
    }, '#3a3a34');
  };

  /* ---- Les brebis d'Ouessant : minuscules, noires, le belier a de grandes cornes ---- */
  const BRW = 36, BRH = 32, BRX = 16, BRY = 30;
  // 0-3 broute, 4-7 marche, 8-11 bond
  const brebisFeuille = (cornes, agneau) => {
    const e = agneau ? .6 : .84;
    return feuille('ouessant' + (cornes ? 'b' : '') + (agneau ? 'a' : ''), BRW, BRH, 12, (x, kk, k) => {
      x.translate(BRX, BRY);
      x.scale(e, e);
      const a = (k < 4 ? k / 4 : k < 8 ? (k - 4) / 4 : (k - 8) / 4) * TAU, bond = k >= 8 ? Math.abs(Math.sin(a)) * 5.4 : 0, by = -bond - (k >= 4 && k < 8 ? Math.abs(Math.sin(a)) * .6 : 0);
      const pas = k >= 4 && k < 8 ? 2.2 : k >= 8 ? 3 : 0;
      const pa = [[-6, Math.sin(a) * pas], [-3.4, -Math.sin(a) * pas], [5, -Math.sin(a) * pas], [7.6, Math.sin(a) * pas]];
      for (let i = 0; i < 4; i++) { const c = i % 2 ? '#23202a' : '#3a3640'; ligne(x, c, pa[i][0], -8 + by, pa[i][0] + pa[i][1], -.8 + (k >= 8 ? by * .5 : 0), 1.2); rect(x, '#6a6676', pa[i][0] + pa[i][1] - .7, -1.2 + (k >= 8 ? by * .5 : 0), 1.6, 1.2); }
      // la laine : des boucles sombres, un reflet bleute sur le dos
      const lain = [[-7, -11, 3.1], [-4, -13, 3.4], [0, -13.6, 3.6], [4, -13, 3.4], [7, -11.2, 3.1], [-6.4, -9, 3], [-1.6, -9.2, 3.6], [3, -9, 3.6], [7, -9, 2.6]];
      for (const [a_, b_, r] of lain) disc(x, '#2a2630', a_, b_ + by, r);
      for (const [a_, b_, r] of lain.slice(0, 5)) { disc(x, '#47434f', a_ - .6, b_ + by - 1, r * .56); rect(x, '#79758a', a_ - 1.2, b_ + by - 2.2, 1.2, .8); }
      for (const [a_, b_] of [[-3, -9], [1.4, -10], [5, -9.4], [-6, -8.4]]) rect(x, '#47434f', a_, b_ + by, 1.4, 1);
      // la tete : baissee si elle broute, haute sinon
      const bas = k < 4, ch = bas ? (k % 2) * .8 : 0, tx = 12, ty = bas ? -3.4 + ch : -16.5 + by;
      if (bas) ligne(x, '#2a2630', 8.5, -9, tx - 1, ty - 1, 2.8);
      else ligne(x, '#2a2630', 8, -12 + by, tx - 1, ty + 1, 2.8);
      ell(x, '#1e1c24', tx, ty, 3, 2.3, bas ? .8 : .24);
      rect(x, '#57525e', tx + 2, ty + (bas ? 1.4 : .4), 1.2, 1);
      ell(x, '#3a3640', tx - 1.6, ty - 1, 1.6, .8, -.3);
      rect(x, '#e8c850', tx + .4, ty - .7, .9, .9);
      if (cornes) {
        // la grande corne, en spirale
        x.strokeStyle = '#d4b078'; x.lineWidth = 1.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(tx - .8, ty - 2); x.bezierCurveTo(tx - 6, ty - 7, tx - 8, ty + 2, tx - 3.2, ty + 2.2); x.stroke();
        x.strokeStyle = '#a88858'; x.lineWidth = .7; x.beginPath(); x.moveTo(tx - 3.6, ty - 3.6); x.lineTo(tx - 5, ty - 1.4); x.stroke();
      }
      poly(x, '#2a2630', -9.5, -11 + by, -12, -8 + by, -9, -7.4 + by);
    }, '#17151f');
  };

  const DITS_OIE = ['Ssssss !', 'Sssss !', 'Couac !', 'Dehors !', 'Ma pelouse !', 'Pas chez nous !', 'Sssssss !!'];
  const DITS_POULE = ['Cot cot cot !', 'Codêêt !', 'Au secours !', 'Mes œufs !'];
  const DITS_CANARD = ['Coin coin coin !', 'On court !', 'Par là !', 'Non, par là !', 'Coin !'];
  FX.basse_cour = (sc, arg) => {
    const i = V.plan(sc, 'col', +(arg || 2)), f = f_(sc, i), a = [], gr = grains(60);
    const OI = [oieFeuille(0), oieFeuille(1)], PO = [0, 1, 2, 3].map(n => pouleFeuille(n, false)), COQ = pouleFeuille(0, true), CAN = [0, 1, 2, 3].map(canardFeuille);
    let attente = 0, tour_ = irnd(0, 2), lie = null, troupes = [], dBulle = 0;
    const planer = (d, sx) => sx + d * f;
    const oies = (d, sx) => { const n = irnd(4, 6), g = { oies: [] }; for (let k = 0; k < n; k++) { const o = { g: 'oie', X: planer(d, sx + k * rnd(14, 20)), c: Math.random() < .75 ? 0 : 1, st: 'marche', t: rnd(0, 3), ph: rnd(1), flip: Math.random() < .5, v: rnd(4, 8), dy: rnd(-1, 1.4), chas: 0, las: rnd(3, 5), bulle: null, bulleT: 0 }; a.push(o); g.oies.push(o); } return g.oies[0]; };
    const poules = (d, sx) => { const n = irnd(3, 5); for (let k = 0; k < n; k++) a.push({ g: 'poule', X: planer(d, sx + rnd(0, 92)), c: irnd(0, 3), coq: k === 0, st: 'picore', t: rnd(0, 2), ph: rnd(1), flip: Math.random() < .5, v: 0, dy: rnd(-1, 2), bulle: null, bulleT: 0 }); };
    const canards = (d, sx) => {
      const n = irnd(5, 8), T_ = { sens: Math.random() < .5 ? -1 : 1, v: rnd(40, 50), attT: rnd(3, 7), peur: 0, l: [] };
      for (let k = 0; k < n; k++) { const o = { g: 'canard', X: planer(d, sx + k * 11 * (T_.sens > 0 ? -1 : 1)), c: k % 4, ph: rnd(1), dy: rnd(-.6, .8), vit: 0, t: 0, flip: T_.sens < 0, bulle: null, bulleT: 0 }; a.push(o); T_.l.push(o); }
      troupes.push(T_);
    };
    const groupes = [poules, oies, canards];
    groupes[0](0, 50); groupes[1](0, 250); canards(0, 420);
    const dire = (o, t, T = 1.2) => { if (dBulle > 0) return; o.bulle = t; o.bulleT = T; dBulle = 1.3; };
    return {
      plan: i,
      maj(dt, d) {
        const dr = V.drone(), su = sujetDe('vise_oies'), off = d * f;
        attente -= dt; dBulle -= dt;
        if (attente <= 0 && a.length < 18) { groupes[tour_++ % 3](d, G.VW + 26); attente = rnd(3.6, 5.8); }
        const pres = (sx, R) => dr && dr.proche && Math.abs(sx - dr.x) < R;
        // les troupes de canards : le premier decide, les autres suivent
        for (const T_ of troupes) {
          if (!T_.l.length) continue;
          const c0 = T_.l[0], sx0 = c0.X - off;
          T_.attT -= dt; T_.peur = Math.max(0, T_.peur - dt);
          T_.calme = (T_.calme || 0) - dt;
          if (pres(sx0, 62) && T_.calme <= 0) { T_.peur = 1.6; T_.calme = 9; T_.sens = -1; c0.bulle = null; dire(c0, pick(DITS_CANARD)); }
          else if (T_.attT < 0) { T_.attT = rnd(3, 7); if (Math.random() < .45) { T_.sens = -T_.sens; if (Math.random() < .5) dire(c0, pick(DITS_CANARD)); } }
          const vt = T_.v * (T_.peur > 0 ? 2.1 : 1);
          c0.X += T_.sens * vt * dt; c0.vit = T_.sens * vt;
          for (let k = 1; k < T_.l.length; k++) {
            const q = T_.l[k], cib = T_.l[k - 1].X - T_.sens * 10.5, e = cib - q.X;
            const vm = vt * 1.25;
            const mv = G.clamp(e * 6, -vm, vm);
            q.X += mv * dt; q.vit = mv;
          }
        }
        for (const o of a) {
          o.t -= dt; o.bulleT = (o.bulleT || 0) - dt; const sx = o.X - off;
          if (o.g === 'canard') { o.ph += dt * (2.4 + Math.abs(o.vit) * .05); if (Math.abs(o.vit) > 3) o.flip = o.vit < 0; continue; }
          if (o.g === 'poule') {
            if (o.st === 'fuit') {
              o.X += o.v * dt; o.ph += dt * 5; if (Math.random() < dt * 10) gr.add(o.X + rnd(-3, 3), sol(sc, i, o.X) + o.dy - rnd(4, 11), rnd(-16, 16), -rnd(8, 22), rnd(.4, .9), pick(['#ffffff', COUL_POULE[o.c][2], COUL_POULE[o.c][0]]), 1);
              if (o.t <= 0) { o.st = 'picore'; o.t = rnd(.6, 2); }
            } else {
              o.calme = (o.calme || 0) - dt;
              if (pres(sx, 54) && o.calme <= 0) { o.calme = 8; o.st = 'fuit'; o.t = rnd(.7, 1.1); o.v = (sx < dr.x ? -1 : 1) * rnd(64, 92); o.flip = o.v < 0; dire(o, pick(DITS_POULE)); continue; }
              if (o.t <= 0) { const m = Math.random(); if (o.st === 'picore' && m < .55) { o.st = 'marche'; o.t = rnd(.4, 1.1); o.v = rnd(5, 11) * (Math.random() < .5 ? 1 : -1); o.flip = o.v < 0; } else { o.st = 'picore'; o.t = rnd(.8, 2.4); o.v = 0; } }
              if (o.st === 'marche') { o.X += o.v * dt; o.ph += dt * 3; } else o.ph += dt * 2.2;
            }
            continue;
          }
          // l'oie
          if (o.st === 'chasse') {
            // elle veut le drone : elle court pour rester dessous, le cou tendu
            const dx = dr ? dr.x - 16 - sx : 80;
            o.chas += dt;
            const vitS = G.clamp(dx * 3, -18, 44), vd = V.defile(sc, i);
            o.X += (vd + vitS) * dt; o.ph += dt * 5.4; o.flip = false;
            if (Math.random() < dt * 7) gr.add(o.X - 6, sol(sc, i, o.X) + o.dy - rnd(6, 16), -rnd(6, 26), -rnd(4, 18), rnd(.4, .9), '#ffffff', 1);
            if (Math.random() < dt * .9) dire(o, pick(DITS_OIE));
            if (o.chas > o.las || !dr || !dr.proche && o.chas > 1.6) { o.st = 'fier'; o.t = rnd(1, 1.8); dire(o, pick(['Et reviens pas !', 'Couac !', 'Ça lui apprendra !']), 1.3); o.v = 0; }
          } else if (o.st === 'fier') { o.ph += dt * 3.2; if (o.t <= 0) { o.st = 'broute'; o.t = rnd(1, 3); } }
          else {
            if (pres(sx, 72) && (!o.fini || o.fini < d)) { o.st = 'chasse'; o.chas = 0; o.las = rnd(2.8, 5.5); o.fini = d + 600; dire(o, 'Ssssss !', 1); continue; }
            if (o.t <= 0) { const m = Math.random(); if (m < .34) { o.st = 'cacarde'; o.t = rnd(.7, 1.5); if (sx > 30 && sx < G.VW - 30 && Math.random() < .3) dire(o, pick(['Couac !', 'Coin... non, couac !', 'Cacaca !'])); } else if (m < .67) { o.st = 'broute'; o.t = rnd(1.2, 3); } else { o.st = 'marche'; o.t = rnd(.8, 2.2); o.v = rnd(4, 9) * (Math.random() < .5 ? 1 : -1); o.flip = o.v < 0; } }
            if (o.st === 'marche') { o.X += o.v * dt; o.ph += dt * 2.6; } else o.ph += dt * 2.4;
          }
        }
        gr.maj(dt, 60);
        for (let k = a.length - 1; k >= 0; k--) { const sx = a[k].X - off; if (sx < -60 && a[k].st !== 'chasse') { if (a[k] === lie) { lie = null; if (su) { su.x = -9999; su.fin = true; } } a.splice(k, 1); } }
        troupes = troupes.filter(T_ => { T_.l = T_.l.filter(o => a.indexOf(o) >= 0); return T_.l.length > 0; });
        if (su && !su.fin && (!lie || a.indexOf(lie) < 0)) { lie = oies(d, G.VW + 30); }
        if (su && lie) { su.x = lie.X - off + 4; const w = G.Jeu.w(); su.y = sol(sc, i, lie.X) + w.camY * (Math.max(.1, Math.min(1, f * 1.1)) - 1) + 2; }
        a.sort((p, q) => p.dy - q.dy);
      },
      draw(x, d, camY, T) {
        const off = d * f;
        for (const o of a) {
          const sx = o.X - off;
          if (sx < -30 || sx > G.VW + 30) continue;
          const y = solDoux(sc, i, o.X) + o.dy + camY + 1;
          let im, ax, ay, w, h;
          if (o.g === 'oie') {
            const F = OI[o.c], ph = ((o.ph % 1) + 1) % 1;
            const fr = o.st === 'chasse' ? 14 + (ph * 6 | 0) : o.st === 'marche' ? (ph * 6 | 0) : o.st === 'broute' ? 6 + (ph * 4 | 0) : 10 + (ph * 4 | 0);
            im = F[fr]; ax = OIX / OIW; ay = OIY / OIH;
          } else if (o.g === 'poule') {
            const F = o.coq ? COQ : PO[o.c], ph = ((o.ph % 1) + 1) % 1;
            const fr = o.st === 'fuit' ? 8 + (ph * 4 | 0) : o.st === 'marche' ? (ph * 4 | 0) : 4 + (ph * 4 | 0);
            im = F[fr]; ax = POX / POW; ay = POY / POH;
          } else {
            const F = CAN[o.c], ph = ((o.ph % 1) + 1) % 1, vit = Math.abs(o.vit);
            const fr = vit > 62 ? 8 + (ph * 4 | 0) : vit < 3 ? 6 + ((T * 1.4 + o.dy | 0) & 1) : (ph * 6 | 0);
            im = F[fr]; ax = CAX / CAW; ay = CAY / CAH;
          }
          V.R(x, '#4f7a38', sx - im.width / S * .24, y - .5, im.width / S * .5, 1);
          pose(x, im, sx, y, 0, o.flip, ax, ay);
          if (o.bulleT > 0 && o.bulle && sx > 14 && sx < G.VW - 14) G.Lumiere.bulle(x, o.bulle, sx, y - im.height / S - 2, 0, o);
        }
        gr.draw(x, d, f, camY);
      },
    };
  };

  /* ==================== LE JARDIN DES OISEAUX ====================
     Max, 10/11/2026 : « sur le decor de Saint-Georges-de-Reintembault, le jardin des oiseaux, tu peux rajouter un enfant blond qui court
     apres une poule noire ou grise tachetee de noir, et une dame blonde, cheveux au carre avec un chapeau de paille, avec des fleurs
     dans la main et qui dit « bienvenue au jardin des oiseaux » ». Les deux sont des figurants de people.js (dame_jardin, enfant_blond),
     poses a leur taille, une ombre sous les pieds. Controle : tests/jardin_oiseaux.js ; regarder : tests/planche_jardin.js.
     Puis (10/11/2026 au soir) : « change la bulle par « bienvenue », et fais-la apparaitre une fois que le titre a disparu ». */
  const BIENVENUE = G.JARDIN_BIENVENUE = 'Bienvenue !';
  const CRIS_ENFANT = G.JARDIN_CRIS = ['Reviens, cocotte !', 'Je vais t\'attraper !', 'Presque !', 'Attends-moi !', 'Elle triche !'];
  const pxl = v => Math.round(v * S) / S, u = 1 / S;
  // l'ombre au sol : deux lignes de pixels, la seconde plus courte (comme au hall du CID)
  function ombreSol(x, X, Y, w) {
    const a = Math.round(w * S / 2) * 2 / S, b = Math.round(w * .6 * S / 2) * 2 / S;
    x.fillStyle = 'rgba(20,18,28,.26)'; x.fillRect(pxl(X - a / 2), Y, a, u);
    x.fillStyle = 'rgba(20,18,28,.16)'; x.fillRect(pxl(X - b / 2), Y + u, b, u);
  }

  /* ---- La dame du jardin : sur le pre, derriere la basse-cour, son bouquet a la main. Elle est la des l'arrivee, revient quelques
     secondes apres etre sortie de l'image, et dit « Bienvenue ! » a chaque passage, en levant son bouquet (sa bulle passe avant
     celles des figurants : priorite 2) ; elle regarde le drone et lui fait signe quand il passe bas devant elle.
     Jamais de bulle pendant le titre du lieu : quand on arrive au jardin avec le titre, elle n'entre dans l'image que pour le dire
     juste apres lui (au rythme du defilement de son pre, elle atteint l'endroit ou elle parle quand le titre s'efface). ---- */
  // ce qui reste du titre du lieu, en secondes (celui qui attend la percee du mur au depart compte pour tout son temps)
  const titreReste = () => { const W = G.Jeu.w(); if (!W) return 0; if (W.percee && W.percee.titre) return 99; return W.titre ? Math.max(0, W.titre.T) : 0; };
  FX.jardin_dame = (sc, arg) => {
    const i = V.plan(sc, 'col', +(arg || 1)), f = f_(sc, i);
    let attente = 0, premier = true;
    const o = { plan: i, dame: null, d: 0, passages: 0 };
    const venir = (d, sx) => { o.dame = { X: sx + d * f, sx, y: 0, dy: 4, T: 0, ph: rnd(0, 6), dit: null, ditT: 0, aParle: false, qui: {}, salue: 0, pose: 'bouquet', flip: true, etat: '' }; o.passages++; };
    const ENTREE = G.VW + 24, PAROLE = G.VW - 60;
    o.maj = (dt, d) => {
      o.d = d;
      // a l'arrivee : la, sauf si le titre du lieu est a l'ecran
      if (premier) { premier = false; if (titreReste() <= 0) venir(d, 330); }
      if (!o.dame) {
        attente -= dt;
        // elle entre de facon a atteindre l'endroit ou elle parle au moment ou le titre s'efface
        if (attente <= 0 && titreReste() <= (ENTREE - PAROLE) / Math.max(20, V.defile(sc, i))) venir(d, ENTREE);
        return;
      }
      const m = o.dame, dr = V.drone();
      m.T += dt; m.sx = m.X - d * f; m.y = solDoux(sc, i, m.X) + m.dy;
      // une fois par passage, quand on a le temps de la lire, et jamais par-dessus le titre
      m.ditT = Math.max(0, m.ditT - dt);
      if (!m.aParle && m.sx < PAROLE && m.sx > 110 && titreReste() <= 0) { m.aParle = true; m.dit = BIENVENUE; m.ditT = 3.4; }
      const pres = dr && dr.proche && Math.abs(m.sx - dr.x) < 50;
      m.salue = pres ? Math.min(1, m.salue + dt * 4) : Math.max(0, m.salue - dt * 2);
      m.pose = m.ditT > 0 || m.salue > .3 ? 'bienvenue' : 'bouquet';
      m.flip = dr ? dr.x < m.sx : true;
      m.t = m.T * (m.pose === 'bienvenue' ? 4 : 2.2) + m.ph;
      m.etat = Math.floor(m.t * 2.4) % 12 + ':' + m.pose + ':' + m.sx.toFixed(1);
      if (m.sx < -30) { o.dame = null; attente = rnd(5, 10); }
    };
    o.draw = (x, d, camY) => {
      const m = o.dame;
      if (!m || m.sx < -30 || m.sx > G.VW + 30) return;
      x.imageSmoothingEnabled = false;
      const X = pxl(m.sx), Y = pxl(m.y + camY);
      ombreSol(x, X, Y, 12);
      G.dollDraw(x, 'dame_jardin', m.pose, m.t, X, Y, m.flip);
      if (m.ditT > 0 && m.sx > 16 && m.sx < G.VW - 16) G.Lumiere.bulle(x, m.dit, X, Y - 30, 0, m.qui, 2);
    };
    return o;
  };

  /* ---- L'enfant et la coucou de Rennes, dans la basse-cour. Comme les coureurs du hall du CID, ils doublent la camera (sur l'herbe
     qui defile vite, une course a l'envers filerait en une seconde) : la poule detale, l'enfant la suit de pres les bras tendus ; elle
     ralentit pour regarder derriere elle, il plonge... elle s'envole dans ses plumes, il glisse sur le ventre en gigotant, se releve
     et repart en criant apres elle. Un passage toutes les 10 a 15 s. ---- */
  FX.jardin_poule = (sc, arg) => {
    const i = V.plan(sc, 'col', +(arg || 2)), f = f_(sc, i);
    const IM = pouleFeuille(4, false);
    const o = { plan: i, course: null, d: 0, images: IM, passes: 0 };
    let attente = 1.2, criN = irnd(0, CRIS_ENFANT.length - 1);
    // il plonge dans la moitie droite de l'image (sous le drone, a gauche, on ne le voyait pas)
    const nouvelle = () => ({ T: 0, sens: 1, n: o.passes++, plongeA: rnd(3.5, 4.4), apres: false,
      poule: { X: -16, y: 0, dy: 5, haut: 0, envol: 0, ph: rnd(0, 1), fr: 8, etat: '' },
      enfant: { X: -46, y: 0, dy: 7, haut: 0, st: 'court', t: 0, pas: rnd(0, 5), etat: '', dit: null, ditT: 0, qui: {} },
      plumes: [], poussiere: [] });
    o.maj = (dt, d) => {
      o.d = d;
      if (!o.course) { attente -= dt; if (attente <= 0) o.course = nouvelle(); return; }
      const c = o.course, P = c.poule, E = c.enfant, sol = V.defile(sc, i), ecr = X => solDoux(sc, i, X + d * f);
      c.T += dt;
      // la poule : elle detale, ralentit pour regarder derriere elle, s'envole quand il plonge, puis file pour de bon
      let vP;
      if (P.envol > 0) {
        P.envol += dt; const k = Math.min(1, P.envol / .6);
        vP = 150 - 70 * k; P.haut = Math.sin(k * Math.PI) * 8;
        if (k >= 1) { P.envol = -1; P.haut = 0; }
      } else if (P.envol < 0) vP = 98;
      else vP = c.T < c.plongeA - .7 ? 74 + 12 * Math.sin(c.T * 3.1) : 30;
      P.X += vP * dt;
      const ralentie = P.envol === 0 && c.T >= c.plongeA - .7;
      P.ph += dt * (P.envol > 0 ? 9 : ralentie ? 3 : Math.min(8, 2.5 + (vP + sol) / 30));
      P.fr = ralentie ? ((P.ph % 1) * 4 | 0) : 8 + ((P.ph % 1) * 4 | 0);
      P.y = ecr(P.X) + P.dy;
      // l'enfant
      E.ditT = Math.max(0, E.ditT - dt);
      if (E.st === 'court') {
        let vE;
        if (c.apres) vE = 96;
        else { vE = vP + G.clamp((P.X - 15 - E.X) * 2.2, -25, 45); if (c.T >= c.plongeA) { E.st = 'plonge'; E.t = 0; } }
        E.X += vE * dt; E.pas += Math.min(vE + sol, 200) * dt;
      } else if (E.st === 'plonge') {
        E.t += dt; const k = Math.min(1, E.t / .4);
        E.X += (130 - 70 * k) * dt; E.haut = Math.sin(k * Math.PI) * 6;
        if (!P.envol && E.t > .12) {
          P.envol = 1e-3;
          for (let q = 0; q < 10; q++) c.plumes.push({ x: P.X + rnd(-4, 4), y: P.y - 7 + rnd(-3, 3), vx: rnd(-30, 45), vy: rnd(-45, -10), t: 0, T: rnd(.8, 1.4), ph: rnd(0, 6), c: pick(['#c2c4cc', '#26262e', '#f4f4f0', '#9a9ca6']) });
        }
        if (k >= 1) { E.st = 'glisse'; E.t = 0; E.haut = 0; for (let q = 0; q < 7; q++) c.poussiere.push({ x: E.X + rnd(-8, 10), y: E.y - rnd(0, 2), vx: rnd(-20, 25), t: 0, T: rnd(.35, .6) }); }
      } else if (E.st === 'glisse') {
        // il glisse sur le ventre dans l'herbe mouillee, de moins en moins vite
        E.t += dt; E.X += (70 - 130 * E.t) * dt;
        if (E.t > .6) { E.st = 'releve'; E.t = 0; }
      } else if (E.st === 'releve') {
        E.t += dt; E.X += 20 * dt;
        if (E.t > .2) { E.st = 'court'; c.apres = true; E.dit = CRIS_ENFANT[criN++ % CRIS_ENFANT.length]; E.ditT = 1.9; }
      }
      E.y = ecr(E.X) + E.dy;
      for (const q of c.plumes) { q.t += dt; q.vx *= 1 - dt * 2; q.vy = Math.min(q.vy + 70 * dt, 12); q.x += (q.vx + Math.sin(q.t * 7 + q.ph) * 14 - sol * .3) * dt; q.y += q.vy * dt; }
      c.plumes = c.plumes.filter(q => q.t < q.T);
      for (const q of c.poussiere) { q.t += dt; q.x += (q.vx - sol * .5) * dt; }
      c.poussiere = c.poussiere.filter(q => q.t < q.T);
      const tE = E.st === 'court' ? E.pas * .083 : E.t * 10;
      E.pose = E.st === 'plonge' ? 'superman' : E.st === 'glisse' ? 'gigote' : E.st === 'releve' ? 'accroupi' : c.apres ? 'course' : 'attrape';
      E.tA = tE;
      E.etat = E.pose + ':' + (Math.floor(tE * 2.4) % 12) + ':' + E.X.toFixed(1);
      P.etat = P.fr + ':' + P.X.toFixed(1) + ':' + P.haut.toFixed(1);
      if (P.X > G.VW + 40 && E.X > G.VW + 40) { o.course = null; attente = rnd(3.5, 7); }
    };
    o.draw = (x, d, camY) => {
      const c = o.course;
      if (!c) return;
      x.imageSmoothingEnabled = false;
      const P = c.poule, E = c.enfant;
      // la poussiere de l'atterrissage, sous eux
      for (const q of c.poussiere) {
        const a = 1 - q.t / q.T, s_ = Math.round(1 + q.t * 5) * 2 * u;
        x.fillStyle = `rgba(200,192,150,${(a * .6).toFixed(2)})`; x.fillRect(pxl(q.x) - s_ / 2, pxl(q.y + camY - q.t * 6) - s_ / 2, s_, s_);
      }
      // la poule
      if (P.X > -30 && P.X < G.VW + 30) {
        const Y = pxl(P.y + camY);
        ombreSol(x, pxl(P.X), Y, 10 - P.haut * .4);
        pose(x, IM[P.fr], P.X, P.y + camY - P.haut, 0, false, POX / POW, POY / POH);
      }
      // l'enfant : debout, ou couche a l'horizontale (plongeon, glissade) ; tourne d'un quart de tour exactement, sur la grille
      if (E.X > -40 && E.X < G.VW + 40) {
        const X = pxl(E.X), Y = pxl(E.y + camY);
        ombreSol(x, X, Y, E.st === 'plonge' || E.st === 'glisse' ? 18 : 10);
        if (E.st === 'plonge' || E.st === 'glisse') {
          x.save(); x.translate(pxl(E.X - 9), pxl(E.y + camY - 2.4 - E.haut)); x.rotate(Math.PI / 2);
          G.dollDraw(x, 'enfant_blond', E.pose, E.tA, 0, 0, false);
          x.restore();
        } else G.dollDraw(x, 'enfant_blond', E.pose, E.tA, X, Y, false);
        if (E.ditT > 0 && E.dit && E.X > 16 && E.X < G.VW - 16) G.Lumiere.bulle(x, E.dit, X, Y - 19, 0, E.qui, 1);
      }
      // les plumes qui retombent en se balancant
      for (const q of c.plumes) {
        x.globalAlpha = Math.min(1, (1 - q.t / q.T) * 2);
        // une plume : trois pixels, le dessous un ton plus fonce
        x.fillStyle = q.c; x.fillRect(pxl(q.x), pxl(q.y + camY), 3 * u, u);
        x.fillStyle = G.tonOmbre(q.c, .3); x.fillRect(pxl(q.x) + u, pxl(q.y + camY) + u, 2 * u, u);
      }
      x.globalAlpha = 1;
    };
    return o;
  };

  /* ---- Le troupeau d'Ouessant : il broute, le belier veille ; il detale en petits bonds quand le drone descend ---- */
  FX.ouessant = (sc, arg) => {
    const i = V.plan(sc, 'col', +(arg || 1)), f = f_(sc, i), a = [];
    const BR = brebisFeuille(false), BE = brebisFeuille(true), AG = brebisFeuille(false, true);
    let attente = 0;
    const troupeau = (d, sx) => {
      const n = irnd(4, 7);
      for (let k = 0; k < n; k++) {
        const ag = k > 1 && Math.random() < .3;
        a.push({ F: k === 0 ? BE : ag ? AG : BR, X: sx + d * f + rnd(0, 120), st: 'broute', t: rnd(0, 3), ph: rnd(1), flip: Math.random() < .35, v: 0, dy: rnd(2, 10) });
      }
    };
    troupeau(0, 60);
    return {
      plan: i,
      maj(dt, d) {
        const dr = V.drone(), off = d * f;
        attente -= dt;
        if (attente <= 0 && a.length < 14) { troupeau(d, G.VW + 30); attente = rnd(11, 18); }
        for (const o of a) {
          o.t -= dt;
          const sx = o.X - off;
          if (o.st === 'bond') { o.X += o.v * dt; o.ph += dt * 2.6; if (o.t <= 0) { o.st = 'broute'; o.t = rnd(.8, 3); o.v = 0; } }
          else {
            o.calme = (o.calme || 0) - dt;
            if (dr && dr.proche && Math.abs(sx - dr.x) < 46 && o.calme <= 0) { o.calme = 10; o.st = 'bond'; o.t = rnd(.9, 1.5); o.v = -rnd(34, 54); o.flip = o.v < 0; continue; }
            if (o.t <= 0) { if (o.st === 'broute' && Math.random() < .4) { o.st = 'marche'; o.t = rnd(.8, 2); o.v = rnd(3, 6) * (Math.random() < .5 ? 1 : -1); o.flip = o.v < 0; } else { o.st = 'broute'; o.t = rnd(1, 4); o.v = 0; } }
            if (o.st === 'marche') { o.X += o.v * dt; o.ph += dt * 1.8; } else o.ph += dt * 1.1;
          }
        }
        for (let k = a.length - 1; k >= 0; k--) if (a[k].X - off < -40) a.splice(k, 1);
        a.sort((p, q) => p.dy - q.dy);
      },
      draw(x, d, camY) {
        const off = d * f;
        for (const o of a) {
          const sx = o.X - off;
          if (sx < -20 || sx > G.VW + 20) continue;
          const ph = ((o.ph % 1) + 1) % 1, fr = o.st === 'bond' ? 8 + (ph * 4 | 0) : o.st === 'marche' ? 4 + (ph * 4 | 0) : (ph * 4 | 0);
          pose(x, o.F[fr], sx, solDoux(sc, i, o.X) + o.dy + camY + 1, 0, o.flip, BRX / BRW, BRY / BRH);
        }
      },
    };
  };
})();
