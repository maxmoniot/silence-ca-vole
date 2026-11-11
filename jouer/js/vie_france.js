/* Les acteurs animes du groupe france : voir vie.js. */
'use strict';
(function () {
  const FX = G.Decor.FX, D = G.Decor, V = G.Vie;
  const R = V.R, S = G.S, rnd = G.rnd;
  const K = '#17151f';
  // ou tombe, a l'ecran, un point du plan i donne en pixels de son image
  const surPlan = (sc, i, px, d) => { const p = sc.plans[i], W = p.nw / S; let X = ((px / S - d * p.f) % W + W) % W; return X > W - 70 ? X - W : X; };
  const horsChamp = (X, m = 80) => X < -m || X > G.VW + m;

  /* ---- Les fumees : des bouffees qui montent et se dissipent, peu de rectangles ---- */
  function bouffees(x, X, Y, T, c, n = 5, taille = 1) {
    for (let k = 0; k < n; k++) {
      const u = ((T * .28 + k / n) % 1);
      const r = (1.4 + u * 4) * taille;
      x.fillStyle = `rgba(${c},${(.5 * (1 - u)).toFixed(2)})`;
      x.fillRect(X + Math.sin(u * 7 + k) * 2.4 * u - r / 2 + u * 7, Y - u * 30 * taille - r / 2, r, r);
    }
  }
  FX.fumeeDucey = sc => {
    const i = V.plan(sc, 'peint', 0);
    return { plan: i, draw(x, d, camY, T) {
      const X = surPlan(sc, i, 802, d);
      if (!horsChamp(X)) bouffees(x, X, 65 + camY, T, '236,232,224', 6);
    } };
  };

  /* ---- Avranches : les longues-vues suivent le drone ---- */
  FX.longuesVues = sc => {
    const i = V.plan(sc, 'peint', 2), PX = [100, 500, 900, 1200];
    return { plan: i, draw(x, d, camY, T) {
      const y0 = sc.plans[i].y + 3 + camY, dr = V.drone();
      PX.forEach((px, k) => {
        const X = surPlan(sc, i, px, d) + .8;
        if (horsChamp(X)) return;
        let ax = Math.sin(T * .35 + k) * .5 - .3;       // au repos, elle balaie la baie
        if (dr && Math.abs(dr.x - X) < 170) ax = Math.atan2(dr.y - y0, dr.x - X);
        const cs = Math.cos(ax), sn = Math.sin(ax);
        R(x, K, X - 2.6, y0 - 2.6, 5.2, 5.2);
        R(x, '#3f5a4a', X - 1.9, y0 - 1.9, 3.8, 3.8);
        for (let q = 1; q <= 4; q++) {
          const a = X + cs * q * 1.3, b = y0 + sn * q * 1.3;
          R(x, K, a - 1.5, b - 1.5, 3, 3);
          R(x, q === 4 ? '#bfe0ec' : '#55806a', a - 1, b - 1, 2, 2);
        }
      });
    } };
  };

  /* ---- Clairefontaine : l'arrosage de la pelouse ---- */
  FX.arrosage = sc => {
    const i = V.plan(sc, 'cha', 0), PX = [260, 980, 1700];
    return { plan: i, draw(x, d, camY, T) {
      const y0 = sc.plans[i].y + 9 + camY;
      PX.forEach((px, k) => {
        const X = surPlan(sc, i, px, d);
        if (horsChamp(X)) return;
        R(x, K, X - 1, y0 - 2, 2, 3);
        const dir = Math.sin(T * .8 + k * 2);
        for (let q = 0; q < 12; q++) {
          const u = ((T * 1.3 + q / 12) % 1), a = X + dir * u * 34, b = y0 - 2 - Math.sin(u * Math.PI) * 15;
          R(x, q % 3 ? 'rgba(220,240,255,.75)' : '#fff', a, b, 1.2, 1.2);
        }
      });
    } };
  };

  /* ---- Le circuit : la rouge passe en trombe, le drone ne fait pas le poids ---- */
  FX.bolide = sc => {
    const i = V.plan(sc, 'peint', 1);
    let x_ = -300, att = 2;
    return { plan: i,
      maj(dt) { if (att > 0) { att -= dt; return; } x_ += 300 * dt; if (x_ > G.VW + 60) { x_ = -110; att = rnd(4, 9); } },
      draw(x, d, camY, T) {
        if (att > 0) return;
        const sp = D.spr('ferrari', 'l');
        if (!sp.ok) return;
        const y = 192 + camY;
        // la gomme et la fumee derriere elle
        for (let k = 0; k < 7; k++) { const r = 3 + k * 1.5; x.fillStyle = `rgba(230,230,235,${(.34 - k * .045).toFixed(2)})`; x.fillRect(x_ - 4 - k * 11, y - 5 - r / 2 + Math.sin(T * 9 + k) , r * 1.5, r); }
        x.drawImage(sp.img, x_, y - sp.h, sp.w, sp.h);
      } };
  };

  /* ---- La moisson : la machine avance, le rabatteur tourne, la poussiere monte ---- */
  FX.moisson = sc => {
    const i = V.plan(sc, 'cha', 1);
    let X = 250;
    const paille = [];
    for (let k = 0; k < 20; k++) paille.push({ a: rnd(), v: rnd(.5, 1.2), dx: rnd(-6, 6) });
    return { plan: i,
      maj(dt) { X -= 12 * dt; if (X < -160) X = G.VW + rnd(60, 240); },
      draw(x, d, camY, T) {
        const sp = D.spr('moissonneuse_grand', 'l');
        if (!sp.ok || horsChamp(X, 180)) return;
        const base = 152 + camY, y = base - sp.h + Math.sin(T * 5) * .4;
        // la poussiere de paille qui sort de l'arriere et part au vent
        for (let k = 0; k < 8; k++) {
          const u = (T * .36 + k / 8) % 1, r = 5 + u * 16;
          x.fillStyle = `rgba(246,222,160,${(.42 * (1 - u)).toFixed(2)})`;
          x.fillRect(X + 6 - u * 74 + Math.sin(k * 3) * 6, base - 24 - u * 24 - r / 2, r * 1.5, r);
        }
        x.drawImage(sp.img, X, y, sp.w, sp.h);
        // le ble qui saute devant la barre de coupe
        for (const p of paille) {
          const u = (T * p.v + p.a) % 1;
          R(x, '#ffe08a', X + sp.w * .97 + p.dx - u * 16, base - 8 - Math.sin(u * 3.14) * 14, 1.2, 1.2);
        }
      } };
  };

  /* ---- Le barrage : de temps en temps, on ouvre une vanne ---- */
  FX.vannes = sc => {
    const i = V.plan(sc, 'peint', 1), PX = [778, 1008];
    let t = 1.5, n = 0;
    return { plan: i,
      maj(dt) { t -= dt; if (t < -7) { t = rnd(3, 7); n = 1 - n; } },
      draw(x, d, camY, T) {
        if (t > 0) return;
        const X = surPlan(sc, i, PX[n], d);
        if (horsChamp(X)) return;
        const k = Math.min(1, -t / 1, (t + 7) / 1), y0 = sc.plans[i].y + 34 / S + 4 + camY, y1 = sc.plans[i].y + sc.plans[i].h - 5 + camY;
        const w = 12 * k;
        R(x, 'rgba(236,248,250,.9)', X - w / 2, y0, w, y1 - y0);
        for (let q = 0; q < 12; q++) {
          const u = (T * 1.6 + q / 12) % 1, a = X - w / 2 + (q * 3.7 % w);
          R(x, q % 2 ? '#8fc4d8' : '#fff', a, y0 + u * (y1 - y0), 1.4, 5);
        }
        // l'embrun au pied
        for (let q = 0; q < 8; q++) {
          const u = (T * .9 + q / 8) % 1, r = 3 + u * 8;
          x.fillStyle = `rgba(240,250,250,${(.6 * (1 - u) * k).toFixed(2)})`;
          x.fillRect(X - r + Math.sin(q * 2.4) * 12 * u, y1 - 2 - u * 10, r * 2, r * .7);
        }
      } };
  };

  /* ---- Le colza : abeilles et papillons, ils s'ecartent quand le drone passe dans les fleurs ---- */
  FX.pollen = () => {
    const p = [];
    for (let i = 0; i < 34; i++) p.push({ x: rnd(G.VW), y: rnd(112, 176), ex: 0, ey: 0, ph: rnd(6), pap: i % 6 === 0, c: ['#fff', '#ff9a3c', '#f4f4ff'][i % 3] });
    return { couche: 'avant',
      maj(dt) {
        const w = G.Jeu.w(), vit = w ? w.v * w.ech : 120, dr = V.drone();
        for (const s of p) {
          s.x -= vit * .3 * dt;
          if (s.x < -6) { s.x = G.VW + rnd(30); s.y = rnd(112, 176); s.ex = s.ey = 0; }
          if (dr) { const ax = s.x + s.ex - dr.x, ay = s.y + s.ey - dr.y, q = ax * ax + ay * ay; if (q < 2400) { const m = Math.sqrt(q) + 1; s.ex += ax / m * 130 * dt; s.ey += ay / m * 130 * dt; } }
          s.ex *= 1 - dt * .9; s.ey *= 1 - dt * .9;
        }
      },
      draw(x, d, c, T) {
        for (const s of p) {
          const X = s.x + s.ex + Math.sin(T * 2 + s.ph) * 3, Y = s.y + s.ey + Math.sin(T * 3.2 + s.ph) * 2 + c * .6;
          if (s.pap) { const f = Math.sin(T * 13 + s.ph) > 0 ? 2 : 1; R(x, s.c, X - f, Y, f, 1.6); R(x, s.c, X + 1, Y, f, 1.6); R(x, K, X, Y - .4, 1, 2); }
          else { R(x, K, X, Y, 1.6, 1); R(x, '#ffcf3c', X + .6, Y, .6, 1); R(x, 'rgba(255,255,255,.7)', X, Y - 1, 1, .8); }
        }
      } };
  };

  /* ---- Les Champs Jouault : camions, pelleteuse au tas de compost, echappements et torchere ---- */
  FX.lcj = sc => {
    const iB = V.plan(sc, 'peint', 0), iR = V.plan(sc, 'route', 0);
    const yp = () => sc.plans[iB].y;
    const SOURCES = [1389, 1479], TORCHE = 1510, TAS = 2030;
    return { plan: iB,
      draw(x, d, camY, T) {
        const y0 = yp() + camY;
        for (const px of SOURCES) { const X = surPlan(sc, iB, px, d); if (!horsChamp(X)) bouffees(x, X, y0 + 36, T + px, '240,240,236', 5, .9); }
        const Xt = surPlan(sc, iB, TORCHE, d);
        if (!horsChamp(Xt)) {
          const yt = y0 + 27;
          // la flamme de biogaz
          const h = 4 + Math.abs(Math.sin(T * 9)) * 2 + Math.abs(Math.sin(T * 23)) * 1.4;
          R(x, K, Xt - 2.4, yt - h - .6, 4.8, h + 1);
          R(x, '#f07a1e', Xt - 1.8, yt - h, 3.6, h);
          R(x, '#ffd23c', Xt - 1, yt - h * .6, 2, h * .6);
        }
        // la pelleteuse au travail
        const Xp = surPlan(sc, iB, TAS, d);
        if (!horsChamp(Xp)) {
          const b = y0 + 141 / S, ang = Math.sin(T * 1.1) * .55 + .35, ang2 = Math.sin(T * 1.1 + .9) * .45 + .7;
          R(x, K, Xp - 1, b - 5, 22, 5); R(x, '#3a3a44', Xp, b - 4, 20, 3);
          R(x, K, Xp + 1, b - 15, 17, 11); R(x, '#f2a81e', Xp + 2, b - 14, 15, 9); R(x, '#ffd25a', Xp + 2, b - 14, 15, 2);
          R(x, K, Xp + 10, b - 21, 8, 8); R(x, '#6a8ca6', Xp + 11, b - 20, 6, 6);
          const a0 = Xp + 17, b0 = b - 12;
          const a1 = a0 + Math.cos(-ang) * 16, b1 = b0 + Math.sin(-ang) * 16;
          const a2 = a1 + Math.cos(ang2) * 13, b2 = b1 + Math.sin(ang2) * 13;
          for (let q = 0; q <= 6; q++) { const u = q / 6; R(x, K, a0 + (a1 - a0) * u - 1.5, b0 + (b1 - b0) * u - 1.5, 3, 3); R(x, '#f2a81e', a0 + (a1 - a0) * u - 1, b0 + (b1 - b0) * u - 1, 2, 2); }
          for (let q = 0; q <= 5; q++) { const u = q / 5; R(x, K, a1 + (a2 - a1) * u - 1.2, b1 + (b2 - b1) * u - 1.2, 2.4, 2.4); R(x, '#f2a81e', a1 + (a2 - a1) * u - .7, b1 + (b2 - b1) * u - .7, 1.4, 1.4); }
          R(x, K, a2 - 2.4, b2 - 1, 5, 4); R(x, '#55586a', a2 - 1.8, b2 - .4, 3.8, 3);
          if (ang < .1) R(x, '#6a4e38', a2 - 1, b2 + 3 + (T * 6 % 3), 2, 1.4);
        }
      } };
  };
  // les camions roulent sur la route de devant : un effet a part, car ils sont dessines juste apres elle
  FX.camionsLcj = sc => {
    const i = V.plan(sc, 'route', 0), c = [];
    let att = .5;
    return { plan: i,
      maj(dt) {
        const vit = V.defile(sc, i);
        att -= dt;
        if (att <= 0 && c.length < 2) { att = rnd(4, 9); const v = rnd(50, 80); c.push({ x: G.VW + 40, v, sp: Math.random() < .8 ? 'camion_benne' : 'pelleteuse' }); }
        for (const q of c) q.x -= (vit - q.v) * dt;
        for (let k = c.length - 1; k >= 0; k--) if (c[k].x < -110) c.splice(k, 1);
      },
      draw(x, d, camY, T) {
        for (const q of c) {
          const sp = D.spr(q.sp, 'l');
          if (!sp.ok) continue;
          const b = 180 + camY, Y = b - sp.h + (Math.sin(T * 14 + q.x) > .7 ? .5 : 0);
          x.drawImage(sp.img, q.x, Y, sp.w, sp.h);
          bouffees(x, q.x - 2, b - 6, T + q.v, '120,120,126', 4, .5);
        }
      } };
  };

  /* ---- Dans la serre : les roues a aubes brassent l'eau, le courant file, le drone trouble l'eau ---- */
  FX.spiruline = sc => {
    const i = V.plan(sc, 'peint', 2), W = sc.plans[i].nw / S;
    const pas = sc.plans[i].nw / 3;
    const reflets = [];
    for (let k = 0; k < 40; k++) reflets.push({ x: rnd(W), l: rnd(.05, .9), w: rnd(3, 10), v: rnd(10, 24), h: k % 2 });
    let rond = [];
    let nv = 0;
    return { plan: i,
      maj(dt) {
        for (const q of reflets) q.x += q.v * (q.h ? 1 : -1) * dt;
        const dr = V.drone();
        nv -= dt;
        if (dr && dr.y > 86 && nv <= 0) { nv = .22; rond.push({ x: dr.x, y: sc.plans[i].y + 10 + rnd(0, 44), T: 0 }); }
        const vit = V.defile(sc, i);
        for (const r of rond) { r.T += dt; r.x -= vit * dt; }
        rond = rond.filter(r => r.T < 1);
      },
      draw(x, d, camY, T) {
        const py = sc.plans[i].y + camY, hb = 100 / S, yb = py + 8 / S;
        for (const q of reflets) {
          const X = ((q.x - d * sc.plans[i].f) % W + W) % W;
          if (X > G.VW) continue;
          const y = yb + (q.h ? q.l * hb * .46 : hb * .54 + q.l * hb * .44);
          R(x, Math.sin(T * 2 + q.x) > 0 ? '#58c49c' : '#2a9470', X, y, q.w, 1);
        }
        for (let b = 0; b < 3; b++) {
          const X = surPlan(sc, i, b * pas + 90, d);
          if (horsChamp(X, 40)) continue;
          const c = yb + hb * .34, ray = 19, nv = yb + hb * .5;
          // le portique bleu qui porte l'axe
          R(x, K, X - 24, c - 3, 48, 3.4); R(x, '#2f6fb8', X - 23.4, c - 2.6, 46.8, 2.4);
          for (const a of [-23, 20]) { R(x, K, X + a, c - 3, 3.4, hb * .56); R(x, '#2f6fb8', X + a + .6, c - 2.6, 2.2, hb * .56 - .6); }
          // les pales : huit rayons, une latte au bout de chacun
          for (let k = 0; k < 8; k++) {
            const a = T * 1.6 + k / 8 * 6.283, ca = Math.cos(a), sa = Math.sin(a);
            for (let q = 2; q <= ray; q += 1.6) { const py2 = c + sa * q; if (py2 < nv + 2) R(x, '#e8eeea', X + ca * q - .7, py2 - .7, 1.4, 1.4); }
            const a0 = X + ca * ray, b0 = c + sa * ray;
            if (b0 < nv + 2) { R(x, K, a0 - 2.6 * Math.abs(sa) - .8, b0 - 2.6 * Math.abs(ca) - .8, 5.2 * Math.abs(sa) + 1.6, 5.2 * Math.abs(ca) + 1.6); R(x, '#ffffff', a0 - 2.6 * Math.abs(sa) - .3, b0 - 2.6 * Math.abs(ca) - .3, 5.2 * Math.abs(sa) + .6, 5.2 * Math.abs(ca) + .6); }
          }
          R(x, K, X - 3, c - 3, 6, 6); R(x, '#8a9490', X - 2.2, c - 2.2, 4.4, 4.4);
          // l'eau brassee, l'ecume qui part dans le courant
          for (let k = 0; k < 9; k++) { const u = (T * 1.1 + k / 9) % 1; R(x, `rgba(220,255,240,${(.9 * (1 - u)).toFixed(2)})`, X + 12 + u * 44, nv + Math.sin(k * 2.2) * 5, 4 - u * 3, 1); }
          for (let k = 0; k < 5; k++) { const u = (T * 3 + k / 5) % 1; R(x, '#eafff4', X - 14 + k * 7, nv - 1 - Math.sin(u * 3.14) * 3, 1.6, 1.6); }
        }
        for (const r of rond) {
          const k = r.T, w = 4 + k * 26;
          x.fillStyle = `rgba(190,255,225,${(.55 * (1 - k)).toFixed(2)})`;
          x.fillRect(r.x - w, r.y, w * 2, .8);
          x.fillRect(r.x - w * .6, r.y - 2 - k * 2, w * 1.2, .7);
          x.fillRect(r.x - w * .6, r.y + 2 + k * 2, w * 1.2, .7);
        }
      } };
  };

  /* ---- Le skatepark du Prado : chacun fait des allers-retours dans son half-pipe, collé à la courbe peinte
     (PIPES et PIPE_PLAT de outils/monuments_qwen.py : milieu, demi-largeur, hauteur en pixels du plan), penché comme la paroi,
     et sort un saut au-dessus du rebord ; plus haut quand le drone passe ---- */
  const PIPES = [[240, 54, 34], [760, 46, 30], [1240, 60, 36]], PIPE_PLAT = .3;
  const pipeH = (u, hp) => { const a = Math.abs(u); if (a <= PIPE_PLAT) return 0; const v = Math.min(1, (a - PIPE_PLAT) / (1 - PIPE_PLAT)); return hp * (1 - Math.sqrt(Math.max(0, 1 - v * v))); };
  /* Des kitesurfeurs au large (Marseille, Max 03/11/2026) : l'aile en arc decrit des huit dans le vent, ses quatre lignes,
     le rider penche en arriere sur sa planche, l'ecume derriere lui ; de temps en temps un saut. */
  FX.kitesurfs = sc => {
    const i = V.plan(sc, 'mer', 0), p = sc.plans[i >= 0 ? i : 0];
    const AILES = [['#e0483a', '#f2bc1e'], ['#2f8fd0', '#f4f4ec'], ['#7a3ad0', '#3ad0a0'], ['#f27a1e', '#2a2a38']];
    const l = [0, 1, 2, 3].map(k => ({ x: rnd(G.VW), v: rnd(14, 26) * (k % 2 ? -1 : 1), ph: rnd(6), prof: rnd(.15, .8), c: AILES[k], saut: 0, sautT: rnd(4, 12) }));
    return { plan: i >= 0 ? i : 0,
      maj(dt) {
        const f = V.defile(sc, i >= 0 ? i : 0);
        for (const q of l) {
          q.x += (q.v - f) * dt; q.sautT -= dt;
          if (q.sautT <= 0) { q.saut = 1; q.sautT = rnd(6, 14); }
          q.saut = Math.max(0, q.saut - dt * .55);
          if (q.x < -60) q.x = G.VW + rnd(20, 160); if (q.x > G.VW + 60) q.x = -rnd(20, 160);
        }
      },
      draw(x, d, camY, T) {
        for (const q of l) {
          const e = .55 + q.prof * .6, sens = q.v > 0 ? 1 : -1;
          const yEau = p.y + 2 + q.prof * 9 + camY * Math.max(.1, p.f);
          const air = Math.sin(q.saut * Math.PI) * 9 * e;
          const X = Math.round(q.x), Y = Math.round(yEau - air);
          // l'aile : en avant du rider, haute, elle trace un huit
          const a = T * 1.1 + q.ph, kx = X + sens * (10 + Math.sin(a) * 5) * e, ky = Y - (26 + Math.sin(a * 2) * 4 + air * .4) * e, inc = Math.cos(a) * .5;
          x.fillStyle = 'rgba(30,30,40,.55)';
          for (let k = 0; k <= 8; k++) { const u = k / 8; x.fillRect(Math.round(X + (kx - X) * u), Math.round(Y - 6 * e + (ky - Y + 6 * e) * u + Math.sin(u * 3.1) * 1.2), 1, 1); }
          x.save(); x.translate(kx, ky); x.rotate(inc);
          for (let k = -5; k <= 5; k++) {
            const h = Math.round((2.6 - Math.abs(k) * .18) * e), yk = Math.round((k * k) * .16 * e);
            x.fillStyle = k % 2 ? q.c[0] : q.c[1]; x.fillRect(Math.round(k * 1.6 * e), yk - h, Math.ceil(1.6 * e), h);
          }
          x.fillStyle = K; x.fillRect(Math.round(-8.6 * e), Math.round(4 * e), 1, 1); x.fillRect(Math.round(8 * e), Math.round(4 * e), 1, 1);
          x.restore();
          // l'ecume et la planche
          if (!air) { x.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 1; k < 7; k++) x.fillRect(X - sens * k * 2, Y + (k % 2), 2, 1); }
          x.fillStyle = '#f4f0e0'; x.fillRect(X - 3, Y, 6, 1);
          // le rider, penche en arriere contre la traction
          x.save(); x.translate(X, Y); x.rotate(-sens * .35); x.scale(e, e);
          R(x, '#23242e', -1, -5, 2, 4); R(x, q.c[0], -1, -9, 2.2, 4); R(x, '#e0b083', -1, -11, 2, 2); R(x, '#23242e', -1, -11.6, 2, .8);
          R(x, '#e0b083', sens > 0 ? 1 : -2, -8.6, 1.6, 1);
          x.restore();
        }
      } };
  };

  FX.skateurs = sc => {
    const i = V.plan(sc, 'peint', 0), p = sc.plans[i];
    const s = PIPES.map((b, k) => ({ ph: k * 1.7, v: rnd(1.1, 1.5), saut: 0, c: ['#e0483a', '#2f8fd0', '#f2bc1e'][k] }));
    return { plan: i,
      maj(dt) { const dr = V.drone(); for (const q of s) { q.saut = Math.max(0, q.saut - dt * 1.4); if (dr && Math.random() < dt * 2) q.saut = 1; } },
      draw(x, d, camY, T) {
        const sol = p.y + (p.nh - 6) / S + camY;
        PIPES.forEach(([bx, brx, hp], k) => {
          const q = s[k], cx = surPlan(sc, i, bx, d);
          if (horsChamp(cx, 160)) return;
          // u va de -1 a 1 et revient : lent en haut des parois, rapide au fond, comme un vrai aller-retour
          const a = T * q.v + q.ph, u = Math.sin(a) * .985, sens = Math.cos(a) > 0 ? 1 : -1;
          const h = pipeH(u, hp) / S, e = .01, pente = (pipeH(u + e, hp) - pipeH(u - e, hp)) / (2 * e * brx);
          const pres = Math.abs(u) > .9 ? (Math.abs(u) - .9) / .085 : 0, air = pres * pres * (6 + q.saut * 12);
          const X = cx + u * brx / S, Y = sol - h - air;
          // la planche suit la paroi : penchee de la pente, a la verticale tout en haut
          // les vrais skateurs du jeu (casquette, bonnet, planche), a l'echelle du plan (Max, 03/11/2026 : « ameliore leur design »)
          x.save(); x.translate(X, Y); x.rotate(Math.max(-1.45, Math.min(1.45, -Math.atan(pente)))); x.scale(.62, .62);
          G.dollDraw(x, ['skate1', 'skate2', 'skate1'][k], 'skate', T * .9 + k, 0, 0, sens < 0);
          x.restore();
        });
      } };
  };

  /* ---- Les pigeons : ils attendent sur le toit ou sur les dalles, et s'envolent quand le drone arrive ---- */
  FX.pigeons = (sc, arg) => {
    const i = V.plan(sc, 'peint', arg === 'dalles' ? 2 : 3), dalles = arg === 'dalles';
    const p = [], W = sc.plans[i].nw;
    for (let k = 0; k < 9; k++) p.push({ px: (k + rnd(.1, .9)) * W / 9, off: rnd(8, 18), vol: 0, ex: 0, ey: 0, vx: 0, vy: 0, ph: rnd(6), c: ['#8a8f9e', '#6f7484', '#a8acb8'][k % 3] });
    return { plan: i,
      maj(dt, d) {
        const dr = V.drone();
        for (const q of p) {
          const X = surPlan(sc, i, q.px, d);
          if (!q.vol && dr && Math.abs(X - dr.x) < 66 && Math.abs((dalles ? 170 : 130) - dr.y) < 90) { q.vol = 1; q.vx = rnd(10, 60) * (X > dr.x ? 1 : -.5); q.vy = -rnd(40, 80); }
          if (q.vol) { q.ex += q.vx * dt; q.ey += q.vy * dt; q.vy -= 8 * dt; }
          // reposes hors champ, ils reviendront au tour suivant
          if (X > G.VW + 40 && q.vol) { q.vol = 0; q.ex = q.ey = 0; }
        }
      },
      draw(x, d, camY, T) {
        for (const q of p) {
          const X = surPlan(sc, i, q.px, d);
          if (horsChamp(X, 40) && !q.vol) continue;
          const yb = dalles ? sc.plans[i].y + q.off : D.crete(sc, i, X, d) - .5;
          const A = X + q.ex, B = yb + q.ey + camY;
          if (B < -10) continue;
          if (q.vol) {
            const up = Math.sin(T * 26 + q.ph) > 0;
            R(x, K, A - 2.4, B - 2, 4.8, 2.2); R(x, q.c, A - 2, B - 1.7, 4, 1.5);
            R(x, q.c, A - 3.4, up ? B - 4 : B - 1, 2.6, up ? 2.6 : 2); R(x, q.c, A + .8, up ? B - 4 : B - 1, 2.6, up ? 2.6 : 2);
          } else {
            const pique = Math.sin(T * 3 + q.ph) > .75 ? 1 : 0;
            R(x, K, A - 2.6, B - 3.2, 5, 3.2); R(x, q.c, A - 2.2, B - 2.8, 4.2, 2.4);
            R(x, K, A + 1.2, B - 4.6 + pique, 2, 2); R(x, '#4f6a7a', A + 1.5, B - 4.3 + pique, 1.4, 1.4);
            R(x, '#e07a50', A + 3.1, B - 3.8 + pique, .8, .6);
          }
        }
      } };
  };

  /* ---- Le tapis rouge : les faisceaux balaient la foule, et l'un d'eux suit le drone comme une star ---- */
  FX.projosCid = sc => {
    const i = V.plan(sc, 'peint', 0), W = sc.plans[i].nw;
    return { plan: i, draw(x, d, camY, T) {
      const dr = V.drone(), y0 = sc.plans[i].y + 26 + camY;
      let proche = null, dm = 1e9;
      const faisceaux = [];
      for (let k = 0; k < W / 250; k++) {
        const X = surPlan(sc, i, 40 + k * 250, d);
        if (horsChamp(X, 110)) continue;
        faisceaux.push({ X, k });
        if (dr && Math.abs(X - dr.x) < dm) { dm = Math.abs(X - dr.x); proche = faisceaux[faisceaux.length - 1]; }
      }
      for (const f of faisceaux) {
        let bx = f.X + Math.sin(T * .7 + f.k * 1.3) * 62, by = 170;
        const suit = f === proche && dr && dm < 120;
        if (suit) { bx = dr.x; by = dr.y + 6; }
        const w = suit ? 16 : 22, c = suit ? 'rgba(255,250,210,.26)' : f.k % 2 ? 'rgba(255,240,190,.09)' : 'rgba(170,215,255,.09)';
        x.fillStyle = c;
        x.beginPath(); x.moveTo(f.X - 2, y0); x.lineTo(f.X + 2, y0); x.lineTo(bx + w, by); x.lineTo(bx - w, by); x.fill();
      }
    } };
  };

  /* ---- La grande salle : des spectateurs, de dos ; ils se levent et rouspetent quand le drone leur passe devant ---- */
  /* La grande salle du CID : les spectateurs du premier rang sont peints dans le plan, assis a l'echelle de leur fauteuil
     (sieges_pres, outils/monuments_qwen.py). Les memes fauteuils occupes (occupe_premier_rang : (k * 7 + 3) % 5 < 2) levent
     les bras quand le drone passe au-dessus d'eux. Derniere rangee de SALLE_PRES : bas 1, largeur 14, dossier 13, demi-definition. */
  FX.spectateurs = sc => {
    const i = V.plan(sc, 'peint', 3), p = sc.plans[i];
    const W_ = Math.floor(p.nw / 2), H_ = Math.floor(p.nh / 2), n = Math.max(2, Math.round(W_ / 14)), w = W_ / n, l_ = Math.floor(w) - 1, hd = 13;
    const u = 2 / S, tete = Math.round(hd * .36), ep = Math.floor(l_ * .74);
    const PEAU = ['#e8b98f', '#c98f62', '#8a5a3a'];
    const gens = [];
    for (let k = 0; k < n; k++) if ((k * 7 + 3) % 5 < 2) gens.push({ cx: Math.floor(k * w) + (l_ >> 1), peau: PEAU[k % 3], lev: 0, ph: rnd(6) });
    return { plan: i,
      maj(dt, d) {
        const dr = V.drone();
        for (const q of gens) {
          const X = surPlan(sc, i, q.cx * 2 + 1, d), g = dr && Math.abs(X - dr.x) < 38 && dr.y > 74;
          q.lev = Math.max(0, Math.min(1, q.lev + (g ? 4 : -2) * dt));
        }
      },
      draw(x, d, camY, T) {
        const y = p.y + (H_ - hd) * u + camY;
        for (const q of gens) {
          if (q.lev < .5) continue;
          // sur la grille des gros pixels du plan : les bras ne glissent pas d'un demi-pixel
          const X = Math.round(surPlan(sc, i, q.cx * 2, d) / u) * u;
          if (horsChamp(X, 20)) continue;
          const b = Math.round(Math.sin(T * 12 + q.ph)) * u, h = (tete + 4) * u;
          R(x, q.peau, X - (Math.floor(ep / 2) + 1) * u, y - h + b, u, h - u);
          R(x, q.peau, X + Math.ceil(ep / 2) * u, y - h - b, u, h - u);
        }
      } };
  };

  /* ---- Le hall du CID (Max, 08/11/2026 : « au second plan il ne se passe rien actuellement. Ajoute des choses qui se passent comme
     des gens qui mangent des petits fours, des gens qui se prennent en photo, des stars qui passent avec des gardes du corps etc
     (trouve d'autres idees). Ajoute par moment 3 personnages avec des sacs a dos qui font la course sur des chaises a roulettes et qui
     disent des trucs du genre « Bruno va regarder le montage », « J'espere qu'il reste du champagne » ou « Tu filmes flou Michel » »).
     Sur le sol carrele du second plan (Max, 08/11/2026, apres la 1.16 : « les personnages donnent l'impression de voler au-dessus du
     sol. Descends-les pour qu'ils soient sur le sol, pas la peine qu'ils soient sur la ligne de crete, ils peuvent etre repartis ou tu
     veux sur le sol du second plan » ; avant, ils se tenaient tous sur le bord haut du carrelage) : chacun a sa profondeur (prof, en
     unites sous le bord haut), ils defilent avec le carrelage (pas de patinage), une petite ombre les pose au sol, et tout est dessine
     du plus loin au plus pres ; a la taille des figurants (la moitie des portes vitrees du hall) : le buffet et ses mangeurs de petits fours, un serveur et son plateau de coupes,
     deux amies qui font un selfie (flash), un couple qui danse, un laureat qui saute avec son trophee, une interview au micro, des
     paparazzis qui mitraillent, et une star qui traverse le hall entre ses deux gardes du corps. Ceux qui sont arretes saluent le
     drone quand il passe bas devant eux.
     La course de chaises a roulettes (Max, 08/11/2026, apres la 1.15 : « il faut bien que les 3 personnages avec des chaises roulantes
     fassent une course. Tu peux les refaire passer plusieurs fois. C'est eux qui doivent parler. Anime-les de facon rigolote sur leurs
     chaises en train de faire la course ») : un passage toutes les 4 a 7 s, une fois vers la gauche, une fois vers la droite. Ils
     poussent comme des fous (les pieds moulinent au rythme de leur vitesse), chacun a ses coups d'elan ; celui qui mene part en toupie
     au milieu de l'image (il tourne sur lui-meme, bras ecartes, des etoiles autour de lui) et se fait doubler, puis pousse deux fois
     plus fort pour rattraper ; un autre saute sur une bosse ; celui qui mene a la fin leve les bras. Traits de vitesse et poussiere
     derriere eux. Ce sont eux qui parlent, et eux seuls dans le hall : trois repliques par passage, une phrase de Max d'abord, le cri
     de la toupie, puis une autre ; leurs bulles passent devant celles des figurants (render.js : priorite 2). Controle : tests/cid_hall.js. */
  const CID_COURSE = G.CID_COURSE_PHRASES = ['Bruno va regarder le montage !', 'J\'espère qu\'il reste du champagne !', 'Tu filmes flou, Michel !',
    'Le dernier paie les petits fours !', 'Plus vite, la projection commence !', 'Michel, ton objectif est sale !', 'On est en retard au photocall !',
    'Qui a pris ma carte presse ?', 'Bruno a encore perdu les rushes !', 'Garez-vous, la star arrive !', 'Poussez-vous, ça passe !',
    'Je te double, Michel !', 'Freine, freine !', 'C\'est moi qui monte le film !', 'Premier au buffet !', 'Ouaaah, je tourne !'];
  const TOUPIE = 'Ouaaah, je tourne !';
  // l'informaticien (Max, 08/11/2026 : « un informaticien qui dit des phrases du genre « Un RJ45 ? » ou « Qui veut un pass gratis ? » »,
  // « il doit avoir un beret ») : il parle une fois a chaque passage dans l'image, sauf quand un coureur parle
  const INFO = G.CID_INFO_PHRASES = ['Un RJ45 ?', 'Qui veut un pass gratis ?', 'Vous avez essayé d\'éteindre et de rallumer ?', 'Le wifi, c\'est CID-invités !',
    'Quelqu\'un a vu mon câble ?', 'Ça marche chez moi !', 'Le serveur redémarre, deux minutes !', 'Un RJ45, quelqu\'un ?'];
  FX.cidHall = sc => {
    const i = V.plan(sc, 'carrelage', 0), p = sc.plans[i], u = 1 / S, LW = p.nw;
    // les couloirs des coureurs, a l'avant du carrelage (profondeur sous son bord haut)
    const COULOIRS = [16, 19, 22], BUFFET = { px: 165, prof: 10 };
    const pxl = v => Math.round(v * S) / S;
    // pose : ce qu'il fait ; px : sa place sur le plan (pixels) ; g : regarde a gauche ; v : vitesse (pixels du plan par seconde)
    // px : sa place sur le carrelage (pixels du plan) ; prof : la profondeur de ses pieds ; g : regarde a gauche ; v : vitesse (pixels du plan par seconde)
    const gens = [
      { sorte: 'buffet', d: 'smoking', px: 120, prof: 6, pose: 'mange', g: false, ph: 0 },
      { sorte: 'buffet', d: 'invitee', px: 205, prof: 6, pose: 'mange', g: true, ph: 1.7 },
      { sorte: 'buffet', d: 'smoking2', px: 230, prof: 14, pose: 'neutre', g: true, ph: .6 },
      { sorte: 'serveur', d: 'serveur', px: 400, prof: 12, pose: 'plateau', g: false, v: 15, min: 300, max: 700, ph: 0 },
      { sorte: 'selfie', d: 'invitee2', px: 860, prof: 9, pose: 'selfie', g: false, ph: .3 },
      { sorte: 'selfie', d: 'invitee3', px: 874, prof: 10, pose: 'neutre', g: false, ph: 1.1 },
      { sorte: 'danse', d: 'invitee', px: 1060, prof: 16, pose: 'danse', g: false, ph: 0 },
      { sorte: 'danse', d: 'smoking', px: 1076, prof: 16, pose: 'danse', g: true, ph: .9 },
      { sorte: 'interview', d: 'journaliste', px: 1290, prof: 8, pose: 'micro', g: false, ph: .4 },
      { sorte: 'interview', d: 'star', px: 1306, prof: 8, pose: 'neutre', g: true, ph: 1.4 },
      { sorte: 'paparazzi', d: 'paparazzi', px: 1470, prof: 18, pose: 'filme', g: false, ph: .2, flashT: 1 },
      { sorte: 'laureat', d: 'laureat', px: 1650, prof: 11, pose: 'trophee', g: false, ph: 0 },
      // l'informaticien, son ordinateur ouvert et son beret : il fait l'aller-retour, s'arrete pour proposer un cable ou un pass
      { sorte: 'informaticien', d: 'informaticien', px: 1400, prof: 13, pose: 'ordi', g: false, v: 9, min: 1180, max: 1560, ph: .5 },
      { sorte: 'paparazzi', d: 'paparazzi', px: 1880, prof: 7, pose: 'filme', g: true, ph: .7, flashT: 2 },
      // la star et ses deux gardes du corps traversent le hall, de droite a gauche, et recommencent un tour plus loin
      { sorte: 'garde', d: 'garde_corps', px: 2050, prof: 12, pose: 'marche', g: true, v: -13, cortege: -20, ph: 0 },
      { sorte: 'star', d: 'star', px: 2050, prof: 15, pose: 'defile', g: true, v: -13, cortege: 0, ph: .4 },
      { sorte: 'garde', d: 'garde_corps2', px: 2050, prof: 18, pose: 'marche', g: true, v: -13, cortege: 22, ph: .8 },
    ];
    const selfieFlash = { t: 2.5 };
    const flashs = [];
    let fx = null, course = null, courseT = G.rnd(2, 4), sens = 1, passes = 0, infoN = 0;
    const ecran = q => surPlan(sc, i, q, fx || 0);
    // un flash : un eclat blanc, un halo, et la lumiere qui touche ce qu'il y a autour
    const flasher = (X, Y) => { flashs.push({ X, Y, t: 0 }); const W = G.Jeu.w(); if (W && W.fx) G.FX.lueur(W, X, Y, 46, '#ffffff', .55); };
    const obj = { plan: i, gens, course: null,
      maj(dt, d) {
        fx = d; obj.d = d;
        const dr = V.drone();
        for (const g of gens) {
          g.T = (g.T || 0) + dt;
          // l'informaticien s'arrete le temps de parler
          if (g.v && !(g.sorte === 'informaticien' && g.ditT > 0)) {
            if (g.cortege !== undefined) {
              // le cortege avance ensemble ; le tour du plan fini, il repart de l'autre bout
              g.px += g.v * dt; if (g.px < -60) g.px += LW;
              g.pas = (g.pas || 0) + Math.abs(g.v) * dt;
            } else {
              // le serveur fait l'aller-retour entre le buffet et l'escalier
              g.px += (g.g ? -1 : 1) * g.v * dt; g.pas = (g.pas || 0) + g.v * dt;
              if (g.px > g.max) g.g = true; if (g.px < g.min) g.g = false;
            }
          }
          g.X = ecran(g.px + (g.cortege || 0)); g.y = p.y + g.prof;
          // il salue le drone qui passe bas devant lui (ceux qui marchent et la star continuent leur chemin)
          const pres = dr && Math.abs(g.X - dr.x) < 40 && dr.y > 92;
          g.salue = !g.v && pres ? Math.min(1.2, (g.salue || 0) + dt * 4) : Math.max(0, (g.salue || 0) - dt);
          g.ditT = Math.max(0, (g.ditT || 0) - dt);
          if (g.sorte === 'informaticien') {
            const dedans = g.X > 60 && g.X < G.VW - 60, coureurParle = course && course.coureurs.some(c => c.dit);
            if (!dedans) g.aParle = false;
            else if (!g.aParle && !coureurParle && !(g.ditT > 0)) { g.aParle = true; g.dit = INFO[infoN++ % INFO.length]; g.ditT = 2.6; }
          }
          // les paparazzis mitraillent, plus fort quand la star passe devant eux
          if (g.sorte === 'paparazzi') {
            const st = gens.find(q => q.sorte === 'star'), proche = st && Math.abs(st.X - g.X) < 70;
            g.flashT -= dt * (proche ? 4 : 1);
            if (g.flashT <= 0) { g.flashT = G.rnd(1.2, 2.6); if (g.X > -20 && g.X < G.VW + 20) flasher(g.X + (g.g ? -6 : 6), g.y - 22); }
          }
          // l'etat, pour savoir s'il bouge : son image d'animation et sa place
          g.etat = Math.floor(temps(g) * 2.4) % 12 + ':' + g.X.toFixed(1);
        }
        // le selfie : un flash de temps en temps
        selfieFlash.t -= dt;
        if (selfieFlash.t <= 0) { selfieFlash.t = G.rnd(2.2, 4); const s = gens.find(q => q.pose === 'selfie'); if (s.X > -20 && s.X < G.VW + 20) flasher(s.X + 6, s.y - 34); }
        for (const f of flashs) f.t += dt;
        while (flashs.length && flashs[0].t > .25) flashs.shift();
        // la course de chaises a roulettes : un passage, puis un autre dans l'autre sens
        courseT -= dt;
        if (!course && courseT <= 0) course = nouvelleCourse();
        if (course) {
          majCourse(course, dt);
          const fini = course.coureurs.every(c => course.sens < 0 ? c.X < -50 : c.X > G.VW + 50);
          if (fini && course.T > 1) { course = null; courseT = G.rnd(4, 7); }
        }
        obj.course = course;
      },
      draw(x, d, camY, T) {
        x.imageSmoothingEnabled = false;
        // du plus loin au plus pres : les invites, le buffet a sa profondeur, les coureurs dans leurs couloirs
        const l = [];
        for (const g of gens) if (g.X > -30 && g.X < G.VW + 30) l.push([g.y, () => dessiner(x, g, camY)]);
        const bX = pxl(ecran(BUFFET.px));
        if (bX > -40 && bX < G.VW + 40) l.push([p.y + BUFFET.prof, () => { ombre(x, bX, pxl(p.y + BUFFET.prof + camY), 30); buffet(x, bX, pxl(p.y + BUFFET.prof + camY), T); }]);
        if (course) for (const r of course.coureurs) if (r.X > -40 && r.X < G.VW + 40) l.push([r.y, () => coureur(x, course, r, camY, T)]);
        l.sort((m, n) => m[0] - n[0]);
        for (const q of l) q[1]();
        // les flashs
        for (const f of flashs) {
          const a = 1 - f.t / .25, X = pxl(f.X), Y = pxl(f.Y + camY);
          x.fillStyle = `rgba(255,255,255,${(a * .35).toFixed(2)})`; x.fillRect(X - 5, Y - 5, 10, 10);
          x.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; x.fillRect(X - 3, Y - u, 6, 2 * u); x.fillRect(X - u, Y - 3, 2 * u, 6);
        }
      },
    };
    /* ---- La course ---- */
    function nouvelleCourse() {
      // toujours dans le sens du drone : sur le carrelage, qui defile vite, une course vers la gauche filerait en une seconde
      sens = 1;
      const noms = ['coureur1', 'coureur2', 'coureur3']; G.shuffle(noms);
      // ils entrent par le bord, en file : le premier mene
      const X0 = sens < 0 ? G.VW + 30 : -30;
      const c = { T: 0, sens, n: passes++, coureurs: noms.map((d, k) => ({ d, k, X: X0 - sens * k * 24, pas: G.rnd(5), ph: G.rnd(6), ph2: G.rnd(6),
        pose: 'chaise', saut: 0, toupie: 0, elan: 0, v: 0, flip: sens < 0, dit: null, qui: {}, poussiere: [], pT: 0 })) };
      // celui qui mene part en toupie au milieu de l'image ; un des deux autres saute sur une bosse
      c.coureurs[0].toupieA = 2.2;
      c.coureurs[Math.random() < .5 ? 1 : 2].sautA = G.rnd(1, 3.6);
      // trois repliques : une phrase de Max, le cri de celui qui tourne, puis une autre
      const autres = CID_COURSE.slice(3).filter(t => t !== TOUPIE), q = Math.random() < .5 ? [1, 2] : [2, 1];
      c.dits = [{ k: q[0], t: CID_COURSE[c.n % 3], a: .35 }, { k: 0, t: TOUPIE, a: 2.2 }, { k: q[1], t: autres[Math.floor(Math.random() * autres.length)], a: 3.7 }];
      return c;
    }
    function majCourse(c, dt) {
      c.T += dt;
      const sol = V.defile(sc, i);
      for (const r of c.coureurs) {
        // l'elan : chacun ses coups de pied et ses coups de mou ; en toupie il n'avance presque plus, apres il pousse comme un fou
        let v = 104 * (1 + .22 * Math.sin(c.T * 1.5 + r.ph) + .1 * Math.sin(c.T * 3.3 + r.ph2));
        if (r.toupieA !== undefined && c.T > r.toupieA && c.T < r.toupieA + .9) { r.toupie = c.T - r.toupieA; v *= .22; }
        else { if (r.toupie > 0) r.elan = 1.4; r.toupie = 0; }
        if (r.elan > 0) { v *= 1 + .5 * Math.min(1, r.elan); r.elan -= dt; }
        r.saut = r.sautA !== undefined && c.T > r.sautA && c.T < r.sautA + .42 ? Math.sin((c.T - r.sautA) / .42 * Math.PI) : 0;
        // a l'ecran, il double la camera ; sur le sol, il va plus vite encore (le carrelage defile sous lui) : ses pieds moulinent d'autant
        r.X += c.sens * v * dt; r.v = v; r.pas += Math.min(v + sol, 240) * dt * .15; r.y = p.y + COULOIRS[r.k];
        // la poussiere sous les roulettes
        r.pT -= dt;
        if (r.pT <= 0 && r.saut === 0) { r.pT = .07; r.poussiere.push({ x: r.X - c.sens * 5, y: r.y - 1, t: 0 }); }
        for (const q of r.poussiere) q.t += dt;
        while (r.poussiere.length && r.poussiere[0].t > .5) r.poussiere.shift();
      }
      // qui mene, qui parle, et la pose de chacun
      const tete = c.coureurs.slice().sort((a, b) => (b.X - a.X) * c.sens)[0];
      for (const r of c.coureurs) {
        const d = c.dits.find(q => q.k === r.k && c.T > q.a && c.T < q.a + 1.6);
        r.dit = d ? d.t : null;
        r.pose = r.toupie > 0 ? 'chaise_toupie' : r.saut > 0 ? 'chaise_bras' : r.dit ? (r.k === 1 ? 'chaise_vroum' : 'chaise_bras') : r === tete && c.T > 3 ? 'chaise_bras' : r.elan > 0 ? 'chaise_vroum' : 'chaise';
        // il regarde ou il va ; en toupie, il tourne sur lui-meme
        r.flip = r.toupie > 0 ? ((r.toupie * 14) | 0) % 2 === 0 : c.sens < 0;
      }
    }
    // un coureur, sa chaise, sa poussiere, ses traits de vitesse ; une ombre au sol, qui reste au sol quand il saute
    function coureur(x, c, r, camY, T) {
      const X = pxl(r.X), sol = pxl(r.y + camY), yy = pxl(r.y + camY - r.saut * 6);
      ombre(x, X, sol, 16 - r.saut * 5);
      for (const q of r.poussiere) {
        const a = 1 - q.t / .5, s_ = Math.round(1 + q.t * 4) * 2 * u;
        x.fillStyle = `rgba(214,208,200,${(a * .55).toFixed(2)})`; x.fillRect(pxl(q.x - c.sens * q.t * 8) - s_ / 2, pxl(q.y + camY - q.t * 7) - s_ / 2, s_, s_);
      }
      // les traits de vitesse : plus longs quand il fonce
      if (r.toupie <= 0) for (let k = 0; k < 3; k++) {
        const l = pxl(4 + r.v * .05 + ((T * 18 + k * 2) | 0) % 3), x0 = X - c.sens * (11 + k * 2);
        x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(c.sens < 0 ? x0 : x0 - l, pxl(yy - 8 - k * 8), l, u);
      }
      G.dollDraw(x, r.d, r.pose, r.pas + r.ph, X, yy, r.flip);
      // en toupie, des etoiles lui tournent autour de la tete
      if (r.toupie > 0) for (let k = 0; k < 3; k++) {
        const a = T * 12 + k * 2.1, ex = pxl(X + Math.cos(a) * 9), ey = pxl(yy - 40 + Math.sin(a) * 2.4);
        x.fillStyle = '#17151f'; x.fillRect(ex - u, ey - u, 4 * u, 4 * u); x.fillStyle = '#fff4b0'; x.fillRect(ex, ey, 2 * u, 2 * u);
      }
      // ce sont eux qui parlent : leurs bulles passent devant celles des figurants (priorite 2)
      if (r.dit && r.X > 16 && r.X < G.VW - 16) G.Lumiere.bulle(x, r.dit, X, yy - 44, 0, r.qui, 2);
    }
    // l'ombre au sol : deux lignes de pixels, la seconde plus courte
    function ombre(x, X, Y, w) {
      const a = Math.round(w * S / 2) * 2 / S, b = Math.round(w * .6 * S / 2) * 2 / S;
      x.fillStyle = 'rgba(20,18,28,.26)'; x.fillRect(pxl(X - a / 2), Y, a, u);
      x.fillStyle = 'rgba(20,18,28,.16)'; x.fillRect(pxl(X - b / 2), Y + u, b, u);
    }
    // le temps d'animation : ceux qui marchent avancent au rythme de leurs pas, les autres a leur cadence
    function temps(g) { return g.v && !(g.sorte === 'informaticien' && g.ditT > 0) ? (g.pas || 0) * .28 + g.ph : (g.T || 0) * (g.pose === 'danse' ? 3.4 : g.pose === 'trophee' ? 3 : 2.2) + g.ph * 5; }
    function dessiner(x, g, camY) {
      if (g.X < -30 || g.X > G.VW + 30) return;
      // l'informaticien qui parle brandit le cable ou le badge dont il parle
      const parle = g.sorte === 'informaticien' && g.ditT > 0 && g.dit;
      const y = pxl(g.y + camY), pose = parle ? (/RJ45|câble/.test(g.dit) ? 'rj45' : /pass/.test(g.dit) ? 'pass' : 'ordi') : g.salue > .3 ? 'salut' : g.pose;
      ombre(x, pxl(g.X), y, 13);
      G.dollDraw(x, g.d, pose, temps(g), pxl(g.X), y, g.g);
      if (g.ditT > 0 && g.dit && g.X > 16 && g.X < G.VW - 16) G.Lumiere.bulle(x, g.dit, pxl(g.X), y - 40, 0, g.qui || (g.qui = {}), true);
    }
    // la table du buffet : nappe, plateaux, petits fours de couleur et coupes qui brillent
    function buffet(x, X, y, T) {
      const l = 46, h = 9, x0 = X - l / 2 * u * 2 / 2, top = y - h * u * 2;
      const P = (c, a, b, w, hh) => { x.fillStyle = c; x.fillRect(pxl(x0 + a * u), pxl(top + b * u), w * u, hh * u); };
      P(K, -1, -1, l + 2, h * 2 + 1);
      P('#f6f4ee', 0, 0, l, h * 2); P('#ffffff', 0, 0, l, 2); P('#d8d6e0', 0, h * 2 - 4, l, 4);
      for (let k = 0; k < 6; k++) P('#e6e4ee', 3 + k * 7, 4, 1, h * 2 - 8);
      // deux plateaux d'argent et leurs petits fours, des coupes de champagne entre eux
      const FOURS = ['#e8708e', '#7fd07a', '#f4c84a', '#c88a5a', '#ffffff'];
      for (const t0 of [4, 26]) {
        P(K, t0 - 1, -3, 16, 3); P('#c6ccd8', t0, -2, 14, 1);
        for (let k = 0; k < 5; k++) { P(K, t0 + 1 + k * 3 - 1, -6, 3, 3); P(FOURS[(k + t0) % 5], t0 + 1 + k * 3, -5, 2, 2); }
      }
      for (const cx of [21, 23]) { P('#f8e7a8', cx, -7, 1, 5); P('#ffd54a', cx, -5, 1, 2); if (Math.sin(T * 3 + cx) > .9) P('#ffffff', cx, -7, 1, 1); }
    }
    return obj;
  };

  /* ---- Palais de Tokyo : la video change sur les deux faces du cube ---- */
  FX.eclatsTokyo = sc => {
    const i = V.plan(sc, 'peint', 2), OX = 200, N = 6;
    const FG = [[92, 58], [300, 8], [300, 214], [80, 186]], FD = [[300, 8], [660, 44], [686, 190], [300, 214]];
    const pt = (q, u, v) => { const hx = q[0][0] + (q[1][0] - q[0][0]) * u, hy = q[0][1] + (q[1][1] - q[0][1]) * u, bx = q[3][0] + (q[2][0] - q[3][0]) * u, by = q[3][1] + (q[2][1] - q[3][1]) * u; return [hx + (bx - hx) * v, hy + (by - hy) * v]; };
    const tri = (x, a, b, c, col) => {
      const P = [a, b, c].sort((m, n) => m[1] - n[1]);
      x.fillStyle = col;
      for (let y = Math.ceil(P[0][1]); y < P[2][1]; y++) {
        const t1 = (y - P[0][1]) / (P[2][1] - P[0][1] || 1), xa = P[0][0] + (P[2][0] - P[0][0]) * t1;
        const bas = y < P[1][1], t2 = bas ? (y - P[0][1]) / (P[1][1] - P[0][1] || 1) : (y - P[1][1]) / (P[2][1] - P[1][1] || 1);
        const xb = bas ? P[0][0] + (P[1][0] - P[0][0]) * t2 : P[1][0] + (P[2][0] - P[1][0]) * t2;
        x.fillRect(Math.round(Math.min(xa, xb)), y, Math.max(1, Math.round(Math.abs(xb - xa))), 1);
      }
    };
    const images = [];
    for (let n = 0; n < N; n++) {
      const c = G.mk(700, 220);
      for (const [q, m] of [[FG, 12], [FD, 18]]) {
        for (let k = 0; k < m; k++) {
          const u = rnd(0, 1), v = rnd(0, 1), cl = (a) => Math.max(0, Math.min(1, a));
          const a = pt(q, u, v), b = pt(q, cl(u + rnd(-.34, .34)), cl(v + rnd(-.5, .5))), e = pt(q, cl(u + rnd(-.06, .06)), cl(v + rnd(-.1, .1)));
          tri(c.x, a, b, e, k % 4 === 0 ? '#ffffff' : k % 4 === 1 ? '#e8fff4' : k % 4 === 2 ? '#7fe8c0' : '#ff6a5a');
        }
      }
      images.push(c);
    }
    return { plan: i, draw(x, d, camY, T) {
      const X = surPlan(sc, i, OX, d);
      if (X > G.VW + 10 || X < -440) return;
      const k = (T * 5 | 0) % N;
      x.globalAlpha = .55 + .3 * Math.sin(T * 7);
      x.drawImage(images[k], X, sc.plans[i].y + camY, 700 / S, 220 / S);
      x.globalAlpha = 1;
    } };
  };

  /* ---- La grande salle : un film noir et blanc, en gros pixels, avec grain, rayures et sautes de lumiere ---- */
  FX.filmCine = sc => {
    const i = V.plan(sc, 'peint', 1), LW = 190, LH = 81;
    const c = G.mk(LW, LH), f = c.x;
    const g = (v) => `rgb(${v},${v},${v})`, r = (a, v, b, q, w, h) => { f.fillStyle = g(v); f.fillRect(Math.round(b), Math.round(q), w, h); };
    let t = 0, acc = 0, scene = 0, tS = 0;
    const DUREES = [6, 6.5, 6, 2.6];
    const bonhomme = (x, y, h, v, pas, chapeau) => {
      r(0, v, x - 2, y - h + 3, 4, h - 8);                               // le corps
      r(0, v, x - 2 + (pas ? 1 : 0), y - 5, 2, 5); r(0, v, x + (pas ? -1 : 1), y - 5, 2, 5);
      r(0, v, x - 1, y - h, 3, 3);
      if (chapeau) { r(0, v, x - 3, y - h, 6, 1); r(0, v, x - 1, y - h - 2, 3, 2); }
    };
    function image(T) {
      if (scene === 0) {
        // le train entre en gare, bien sur
        for (let k = 0; k < 7; k++) r(0, 190 - k * 16, 0, k * 8, LW, 8);
        r(0, 70, 0, 56, LW, 25); r(0, 110, 0, 56, LW, 2);
        for (let k = 0; k < LW; k += 7) r(0, 40, k, 62, 4, 2);
        r(0, 20, 0, 66, LW, 2);
        const X = -70 + T * 44;
        r(0, 28, X, 34, 58, 26); r(0, 44, X, 34, 58, 3); r(0, 28, X + 58, 42, 14, 18); r(0, 44, X + 46, 26, 12, 10);
        r(0, 28, X + 62, 30, 6, 12); r(0, 10, X + 61, 28, 8, 3); r(0, 200, X + 8, 38, 8, 6); r(0, 200, X + 20, 38, 8, 6);
        for (let k = 0; k < 4; k++) { const a = T * 9 + k * 1.57; r(0, 8, X + 8 + k * 16, 56, 11, 11); r(0, 120, X + 12 + k * 16 + Math.cos(a) * 3, 60 + Math.sin(a) * 3, 3, 3); }
        for (let k = 0; k < 9; k++) { const u = ((T * .9 + k / 9) % 1); const R_ = 3 + u * 11; r(0, 215 - u * 90, X + 64 - u * 66 + Math.sin(k) * 4, 26 - u * 22 + Math.cos(k * 2) * 3 , R_ * 1.4, R_); }
      } else if (scene === 1) {
        // la rue la nuit : l'homme au chapeau passe sous le reverbere
        r(0, 22, 0, 0, LW, LH);
        r(0, 210, 150, 8, 14, 14); r(0, 22, 158, 8, 8, 10);
        for (const [a, b, q] of [[0, 34, 30], [36, 28, 46], [66, 46, 24], [116, 30, 40], [150, 40, 28]]) { r(0, 40, a, q, b, 70); for (let w = a + 3; w < a + b - 4; w += 7) for (let e = q + 4; e < 60; e += 9) r(0, (w * e) % 5 === 0 ? 180 : 28, w, e, 3, 4); }
        r(0, 56, 0, 66, LW, 15); r(0, 76, 0, 66, LW, 1);
        // le cone de lumiere
        for (let k = 0; k < 26; k++) r(0, 120 - k * 2, 96 - k * .9, 24 + k * 1.6, 1 + k * 1.8, 2);
        r(0, 12, 95, 20, 2, 46); r(0, 240, 93, 19, 6, 4);
        const X = T * 30 - 10;
        bonhomme(X, 72, 22, X > 74 && X < 118 ? 96 : 10, (T * 6 | 0) % 2, true);
      } else if (scene === 2) {
        // le baiser sous la lune
        for (let k = 0; k < 6; k++) r(0, 60 + k * 14, 0, k * 10, LW, 10);
        r(0, 235, 86, 6, 22, 22); r(0, 200, 90, 12, 5, 4); r(0, 200, 98, 20, 4, 3);
        r(0, 16, 0, 62, LW, 19);
        const k = Math.min(1, T / 4);
        bonhomme(62 + k * 27, 66, 28, 8, !(k >= 1) && (T * 5 | 0) % 2, true);
        bonhomme(126 - k * 26, 66, 25, 16, !(k >= 1) && (T * 5 | 0) % 2, false);
        r(0, 16, 126 - k * 26 + 2, 66 - 19, 5, 14);                       // la robe, les cheveux
      } else {
        r(0, 14, 0, 0, LW, LH);
        G.txt(f, 'FIN', LW / 2, 32, '#e8e8e8', { al: .5, sc: 2 });
        r(0, 180, 30, 14, LW - 60, 1); r(0, 180, 30, 66, LW - 60, 1);
      }
      // ouverture et fermeture a l'iris
      const D_ = DUREES[scene], o = Math.min(T / .5, (D_ - T) / .5, 1);
      if (o < 1) { const bande = (1 - Math.max(0, o)) * LH / 2; r(0, 0, 0, 0, LW, bande); r(0, 0, 0, LH - bande, LW, bande); }
      // le grain, les rayures, les poussieres : c'est un vieux film
      for (let k = 0; k < 18; k++) r(0, rnd() < .5 ? 12 : 235, rnd(LW), rnd(LH), 1, 1);
      if (rnd() < .5) r(0, 225, rnd(LW), 0, 1, LH);
      if (rnd() < .15) r(0, 20, rnd(LW), rnd(LH), 3, 2);
      if (rnd() < .3) { f.fillStyle = 'rgba(255,255,255,.07)'; f.fillRect(0, 0, LW, LH); }
    }
    image(0);
    return { plan: i,
      maj(dt) {
        t += dt; acc += dt; tS += dt;
        if (tS > DUREES[scene]) { tS = 0; scene = (scene + 1) % 4; }
        if (acc > .1) { acc = 0; image(tS); }     // 10 images par seconde, comme un vieux projecteur
      },
      draw(x, d, camY) {
        const p = sc.plans[i], X = surPlan(sc, i, 167, d);
        const A = X + 42 / S, B = p.y + (10 + 12) / S + camY, w = 380 / S, h = 162 / S;
        if (horsChamp(A, 240)) return;
        x.drawImage(c, A, B, w, h);
        // le faisceau du projecteur, qui passe au-dessus de la salle
        x.fillStyle = 'rgba(235,235,255,.05)';
        x.beginPath(); x.moveTo(A + w * .1, B + h); x.lineTo(A + w * .9, B + h); x.lineTo(A + w * .55, 216); x.lineTo(A + w * .45, 216); x.fill();
      } };
  };

  /* ---- Un ballon de foot rond, en pixels : contour sombre, cuir blanc, ombre en bas a droite, pastilles noires qui tournent ---- */
  const BALLONS = {};
  const ballonPixels = d => {
    if (BALLONS[d]) return BALLONS[d];
    const fr = [], r = d / 2;
    for (let k = 0; k < 3; k++) {
      const c = G.mk(d, d), x = c.x;
      for (let j = 0; j < d; j++) for (let i = 0; i < d; i++) {
        const dx = i + .5 - r, dy = j + .5 - r, q = Math.hypot(dx, dy);
        if (q > r) continue;
        let col = q > r - 1 ? '#17151f' : (dx + dy > r * .55 ? '#c9ccd6' : '#ffffff');
        // les pastilles : un motif qui tourne d'un tiers de tour a chaque image
        const a = Math.atan2(dy, dx) + k * 2.094, rr = q / r;
        if (q <= r - 1 && ((rr < .34) || (rr > .58 && rr < .9 && Math.cos(a * 2.5) > .72))) col = '#2a2c38';
        x.fillStyle = col; x.fillRect(i, j, 1, 1);
      }
      fr.push(c);
    }
    return (BALLONS[d] = fr);
  };

  /* ---- Le stade : on joue au second plan. Le ballon reste toujours a l'image : ils courent apres, l'un tire, puis tous ralentissent ---- */
  FX.footballeurs = sc => {
    const i = V.plan(sc, 'peint', 0), A = .72, FW = 20, FH = 28;
    const EQ = [{ m: '#2a4fb0', ms: '#1c357c', sh: '#f0f0f0', ch: '#d8383a' }, { m: '#f0f0ec', ms: '#c0c4cc', sh: '#2a2c38', ch: '#f0f0ec' }];
    const PEAU = ['#e8b98f', '#a8724a', '#6a4630'], CHEV = ['#2a1c14', '#17151f', '#6a4a24'];
    // une figurine en gros pixels, contour sombre autour, 8 images : 6 de course, 1 de tir, 1 au repos
    function figurine(eq, n, peau, chev, tir, repos) {
      const c = G.mk(FW, FH), x = c.x, p = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a | 0, b | 0, w, h); };
      const ph = n / 6 * 6.283, s1 = repos ? .1 : Math.sin(ph), s2 = -s1;
      const jambe = (hx, a, col) => {
        const kx = hx + Math.round(a * 3), ky = 19 + (a > 0 ? 0 : 1), fx = kx + Math.round((a - .7) * 3), fy = 25 - (a < -.3 ? 2 : 0);
        p(col, hx, 17, 2, 3); p(eq.ch, kx, ky, 2, 2);
        const n_ = 3; for (let q = 0; q < n_; q++) p(eq.ch, kx + (fx - kx) * q / n_, ky + (fy - ky) * q / n_, 2, 2);
        p('#17151f', fx, fy, 3, 2);
      };
      if (tir) { jambe(8, -.5, eq.sh); const hx = 10; p(eq.sh, hx, 17, 2, 3); p(eq.ch, hx + 2, 18, 3, 2); p(eq.ch, hx + 5, 16, 2, 2); p('#17151f', hx + 7, 14, 3, 2); }
      else { jambe(8, s2, eq.sh); }
      // le buste, leger en avant quand on court
      const dx = repos ? 0 : 1;
      p(eq.m, 7 + dx, 7, 6, 8); p(eq.ms, 11 + dx, 7, 2, 8); p(eq.sh, 7, 14, 6, 4);
      if (!tir) jambe(10, s1, eq.sh);
      // les bras
      const b1 = tir ? -1 : s2, b2 = tir ? 1 : s1;
      p(eq.ms, 6 + dx + Math.round(b1 * 2), 8, 2, 3); p(peau, 6 + dx + Math.round(b1 * 3), 11, 2, 3);
      p(eq.m, 12 + dx + Math.round(b2 * 2), 8, 2, 3); p(peau, 12 + dx + Math.round(b2 * 3), 11, 2, 3);
      // la tete
      p(peau, 8 + dx, 2, 5, 5); p(chev, 8 + dx, 1, 5, 2); p(chev, 8 + dx, 3, 1, 2); p('#17151f', 11 + dx, 4, 1, 1);
      // le contour sombre, une fois pour toutes
      const im = x.getImageData(0, 0, FW, FH), a = im.data, o = new Uint8ClampedArray(a);
      for (let q = 0; q < FH; q++) for (let w = 0; w < FW; w++) {
        if (a[(q * FW + w) * 4 + 3]) continue;
        const v = (m, n2) => m >= 0 && m < FW && n2 >= 0 && n2 < FH && a[(n2 * FW + m) * 4 + 3];
        if (v(w - 1, q) || v(w + 1, q) || v(w, q - 1) || v(w, q + 1)) { const k = (q * FW + w) * 4; o[k] = 23; o[k + 1] = 21; o[k + 2] = 31; o[k + 3] = 255; }
      }
      im.data.set(o); x.putImageData(im, 0, 0);
      return c;
    }
    const miroir = c => { const m = G.mk(FW, FH); m.x.translate(FW, 0); m.x.scale(-1, 1); m.x.drawImage(c, 0, 0); return m; };
    const J = [];
    for (let k = 0; k < 6; k++) {
      const e = EQ[k % 2], pe = PEAU[k % 3], ch = CHEV[k % 3], fr = [];
      for (let n = 0; n < 6; n++) fr.push(figurine(e, n, pe, ch));
      fr.push(figurine(e, 0, pe, ch, true)); fr.push(figurine(e, 0, pe, ch, false, true));
      J.push({ x: rnd(40, G.VW - 40), y: rnd(176, 192), v: rnd(60, 86), cad: rnd(11, 15), ph: rnd(6), fr, frM: fr.map(miroir), dir: 1, tir: 0, cool: 0 });
    }
    const b = { x: G.VW * .55, y: 184, h: 0, vx: 0, vh: 0, rot: 0 };
    let calme = 0;
    return { plan: Math.max(V.plan(sc, 'cha', 0), i),
      maj(dt) {
        const vit = V.defile(sc, i);
        // le ballon : il roule, freine, rebondit, et le sol defile sous lui
        b.x += (b.vx - vit) * dt; b.vx *= 1 - dt * .9; b.rot += b.vx * dt * .4;
        if (b.h > 0 || b.vh > 0) { b.vh -= 240 * dt; b.h += b.vh * dt; if (b.h < 0) { b.h = 0; b.vh = Math.abs(b.vh) > 40 ? -b.vh * .5 : 0; } }
        // il reste toujours a l'image
        if (b.x < 36) { b.x = 36; b.vx = Math.max(b.vx, vit); }
        if (b.x > G.VW - 30) { b.x = G.VW - 30; b.vx = Math.min(b.vx, 0); }
        calme = Math.max(0, calme - dt);
        const allure = calme > 0 ? .28 + .3 * (1 - calme / 1.6) : 1;
        for (const j of J) {
          j.cool = Math.max(0, j.cool - dt); j.tir = Math.max(0, j.tir - dt);
          const cx = b.x + (j.x < b.x ? -6 : 6), dx = cx - j.x;
          const v = j.tir > 0 ? 0 : j.v * allure;
          if (j.tir <= 0 && Math.abs(dx) > 2) { j.dir = dx > 0 ? 1 : -1; j.x += j.dir * v * dt; }
          j.x -= vit * dt;
          j.ph += dt * j.cad * (j.tir > 0 ? 0 : Math.max(.4, allure));
          j.y += (b.y + (j.y > b.y ? 3 : -3) - j.y) * dt * .3;
          j.x = Math.max(-14, Math.min(G.VW + 14, j.x));
          // arrive au ballon : il tire vers l'autre bout de l'image, et tout le monde souffle
          if (Math.abs(b.x - j.x) < 9 && b.h < 3 && j.cool <= 0 && calme <= 0) {
            const vise = b.x < G.VW * .5 ? rnd(.62, .86) : rnd(.14, .4);
            b.vx = (G.VW * vise - b.x) * .9 + vit; b.vh = rnd(50, 120); b.h = 1;
            j.dir = b.vx > vit ? 1 : -1; j.tir = .3; j.cool = 2.5; calme = 1.6;
          }
        }
      },
      draw(x, d, camY, T) {
        // l'ombre du ballon et les joueurs, du plus loin au plus pres
        const l = J.slice().sort((a, c) => a.y - c.y);
        let pose = false;
        const ballon = () => {
          pose = true;
          const X = b.x, Y = b.y + camY;
          R(x, 'rgba(10,50,20,.5)', X - 3.6, Y - .4, 7.2, 1.4);
          const yb = Y - 6 - b.h, k = ((b.rot | 0) % 3 + 3) % 3, d = 11, im = ballonPixels(d)[k];
          // le ballon rond, pose sur la grille des pixels
          x.drawImage(im, Math.round(X * S - d / 2) / S, Math.round(yb * S - d / 2) / S, d / S, d / S);
        };
        for (const j of l) {
          if (!pose && j.y > b.y) ballon();
          const n = j.tir > 0 ? 6 : ((j.ph | 0) % 6 + 6) % 6;
          const img = (j.dir > 0 ? j.fr : j.frM)[n];
          const w = FW * A, h = FH * A;
          x.drawImage(img, Math.round((j.x - w / 2) / A) * A, Math.round((j.y + camY - h + .6) / A) * A, w, h);
        }
        if (!pose) ballon();
      } };
  };
  /* ---- Les tribunes du stade : chaque spectateur vit (il bouge, se leve quand le drone passe), et de temps en temps une ola fait le tour ---- */
  const MAILLOTS = ['#2a4a9a', '#f0ece4', '#c8393b', '#1f3470', '#2a4a9a', '#3a3f4c', '#f0ece4', '#c8393b'], PEAUX = ['#e8b98f', '#c98f62', '#8a5a3a', '#f0c8a0'];
  let figSpect = null;
  const peindreSpect = () => {
    // assis, on les devine dans la penombre de la tribune ; debout, ils sortent dans la lumiere
    const f = [], teinte = (c, k) => '#' + G.hex(c).map(v => Math.round(v * k).toString(16).padStart(2, '0')).join('');
    for (const m of MAILLOTS) for (const p of PEAUX) {
      const fig = k => {
        const c = G.mk(4, 11), x = c.x;
        x.fillStyle = teinte(p, k); x.fillRect(1, 0, 2, 2);
        x.fillStyle = teinte(m, k); x.fillRect(0, 2, 4, 9);
        return c;
      };
      f.push([fig(.5), fig(.82)]);
    }
    return f;
  };
  FX.tribunes = sc => {
    if (!figSpect) figSpect = peindreSpect();
    const i = V.plan(sc, 'peint', 0), p = sc.plans[i], Lg = p.nw / S, u = 1 / S, gens = [];
    // les rangees, en fraction de la hauteur du plan : les trois etages de la photo
    const RANGS = [.46, .52, .58, .64, .75, .81, .87];
    RANGS.forEach((v, r) => {
      for (let a = 0; a < Lg; a += G.rnd(5.5, 9)) {
        gens.push({ a, v, r, f: figSpect[G.irnd(0, figSpect.length - 1)], ph: G.rnd(7), vit: G.rnd(1.5, 5), fou: Math.random() < .14, echarpe: Math.random() < .3 });
      }
    });
    const ola = { x: -1e4, att: G.rnd(3, 7), v: 150 };
    const fx = {
      maj(dt) {
        if (ola.x > -1e3) { ola.x += ola.v * dt; if (ola.x > G.VW + 60) { ola.x = -1e4; ola.att = G.rnd(9, 17); } } else { ola.att -= dt; if (ola.att <= 0) ola.x = -50; }
      },
      draw(x, d, camY, T) {
        const dr = V.drone(), off = d * p.f;
        x.imageSmoothingEnabled = false;
        for (const g of gens) {
          let X = (g.a - off) % Lg; if (X < 0) X += Lg;
          if (X > G.VW + 4) continue;
          // k : de 0 (assis) a 1 (debout, bras en l'air). La vague passe les etages en biais, comme une vraie ola
          let k = g.fou ? Math.max(0, Math.sin(T * g.vit + g.ph)) * .5 : Math.max(0, Math.sin(T * g.vit * .35 + g.ph) - .85) * 2.4;
          if (Math.abs(X - ola.x + g.r * 9) < 34) continue;
          if (dr && Math.abs(X - dr.x) < 28 && Math.abs(p.y + g.v * p.h + camY - dr.y) < 36) k = Math.max(k, .55 + .15 * Math.sin(T * 14 + g.ph));
          // les pieds restent derriere la rangee de devant : seul le haut du corps sort, pixel par pixel
          const leve = Math.round(Math.min(1, k) * 6), haut = 5 + leve, X0 = Math.round(X * S) / S;
          const Y = Math.round((p.y + g.v * p.h + camY) * S - leve) / S;
          x.drawImage(g.f[leve >= 3 ? 1 : 0], 0, 0, 4, haut, X0, Y, 4 * u, haut * u);
          if (k > .55) {
            // les bras levent, les mains au-dessus de la tete ; certains agitent leur echarpe
            const bras = Math.round((k - .55) / .45 * 3) + 1, peau = '#d9b48c';
            x.fillStyle = peau; x.fillRect(X0 - u, Y - (bras - 1) * u, u, (bras + 1) * u); x.fillRect(X0 + 4 * u, Y - (bras - 1) * u, u, (bras + 1) * u);
            if (g.echarpe && bras >= 3) { const c = ['#2a4a9a', '#f0ece4', '#c8393b']; for (let q = 0; q < 3; q++) { x.fillStyle = c[q]; x.fillRect(X0 + (q - 1) * u + Math.round(Math.sin(T * 9 + g.ph)) * u, Y - (bras + 1) * u, 2 * u, u); } }
          }
        }
        if (ola.x > -1e3) olaDense(x, camY, off, T);
      },
    };
    function olaDense(x, camY, off, T) {
      const pas = 5;   // une place tous les 5 pixels, comme la foule peinte
      for (let r = 0; r < RANGS.length; r++) {
        const c0 = ola.x - r * 9, yb = Math.round((p.y + RANGS[r] * p.h + camY) * S);
        const a0 = Math.floor(((c0 - 46) + off) * S / pas), a1 = Math.ceil(((c0 + 46) + off) * S / pas);
        for (let a = a0; a <= a1; a++) {
          const X0 = (a * pas) / S - off, de = X0 - c0, k = Math.exp(-de * de / 420);
          if (k < .2 || X0 < -4 || X0 > G.VW + 4) continue;
          const h = (a * 2654435761 + r * 40503) >>> 0, fig = figSpect[h % figSpect.length];
          const leve = Math.round(k * 6), haut = 5 + leve, Y = (yb - leve) / S, Xp = Math.round(X0 * S) / S;
          x.drawImage(fig[leve >= 3 ? 1 : 0], 0, 0, 4, haut, Xp, Y, 4 * u, haut * u);
          if (k > .5) {
            const bras = Math.round((k - .5) / .5 * 3) + 1;
            x.fillStyle = '#d9b48c'; x.fillRect(Xp - u, Y - (bras - 1) * u, u, (bras + 1) * u); x.fillRect(Xp + 4 * u, Y - (bras - 1) * u, u, (bras + 1) * u);
            if (h % 5 === 0 && bras >= 3) { const cc = ['#2a4a9a', '#f0ece4', '#c8393b']; for (let q = 0; q < 3; q++) { x.fillStyle = cc[q]; x.fillRect(Xp + (q - 1) * u + Math.round(Math.sin(T * 9 + h)) * u, Y - (bras + 1) * u, 2 * u, u); } }
          }
        }
      }
    }
    return {
      plan: i, ola,
      maj: fx.maj,
      draw: fx.draw,
    };
  };

  /* ---- Avranches : le guitariste sur son banc, au 3e plan, de temps en temps. Ses notes montent ---- */
  FX.banc_guitariste = sc => {
    const i = Math.max(V.plan(sc, 'col', 0), V.plan(sc, 'cha', 1), 0), notes = [];
    let X = G.VW * .8, em = 0;
    return { plan: i,
      maj(dt) {
        X -= V.defile(sc, i) * dt;
        if (X < -60) X = G.VW + rnd(260, 900);
        em -= dt;
        if (em <= 0 && X > -30 && X < G.VW + 30) { em = rnd(.5, 1.1); notes.push({ x: X + 4, y: 0, t: 0, c: ['#fff', '#ffe27a'][Math.random() * 2 | 0] }); }
        for (const n of notes) { n.t += dt; n.y -= 9 * dt; n.x += Math.sin(n.t * 3) * 6 * dt - V.defile(sc, i) * dt; }
        while (notes.length && notes[0].t > 2) notes.shift();
      },
      draw(x, d, camY) {
        const sp = D.spr('banc_guitare', 'l');
        if (!sp.ok || X < -60 || X > G.VW + 60) return;
        x.imageSmoothingEnabled = false;
        // dans l'herbe, pas sur l'arete de la pelouse au ras de la balustrade (Max, 02/11/2026 : « il vole un peu »)
        const sol = D.crete(sc, i, X, d) + 12 + camY;
        x.drawImage(sp.img, Math.round((X - sp.w / 2) * S) / S, Math.round((sol - sp.h + 1) * S) / S, sp.w, sp.h);
        R(x, 'rgba(20,40,20,.35)', X - sp.w / 2 + 2, sol, sp.w - 4, 1.2);
        for (const n of notes) { x.globalAlpha = Math.max(0, 1 - n.t / 2); R(x, n.c, n.x, sol - sp.h + n.y, 1.2, 3); R(x, n.c, n.x - 1.2, sol - sp.h + n.y + 2.4, 1.8, 1.2); R(x, n.c, n.x + 1.2, sol - sp.h + n.y, 1.2, .8); x.globalAlpha = 1; }
      } };
  };

  /* ---- Clairefontaine : des petits joueurs a l'entrainement, au second plan, qui courent apres leur ballon ---- */
  FX.petits_joueurs = sc => {
    const i = Math.max(V.plan(sc, 'cha', 0), 0), e = .46, L_ = [];
    // le ballon ne bouge que quand un joueur le frappe : il roule, ralentit sur la pelouse, rebondit s'il a ete leve
    const b = { x: G.VW * .5, y: 0, vx: 0, h: 0, vh: 0, rot: 0 };
    // chaque joueur tient sa place dans le jeu (un ecart au ballon) : un seul va au ballon, les autres suivent de loin
    const PLACES = [-170, -110, -55, 50, 105, 165];
    PLACES.forEach((pl, n) => L_.push({ x: b.x + pl, dy: rnd(0, 9), d: 'joueur', v: rnd(46, 58), t: rnd(9), place: pl + rnd(-14, 14), regard: pl < 0 ? 1 : -1, vv: 0, repos: 0, tr: 0 }));
    return { plan: i, etat: { joueurs: L_, ballon: b },
      maj(dt) {
        const dep = V.defile(sc, i);
        b.vx *= Math.exp(-.8 * dt);
        b.vh -= 260 * dt; b.h += b.vh * dt;
        if (b.h <= 0) { b.h = 0; b.vh = b.vh < -60 ? -b.vh * .3 : 0; }
        b.x += (b.vx - dep) * dt;
        b.rot += b.vx * dt * .3;
        // sorti de l'image a gauche avec la pelouse qui defile : un autre ballon arrive de droite, joue par l'equipe d'en face
        if (b.x < -10) { b.x = G.VW + 8; b.vx = -rnd(40, 60); b.h = 0; b.vh = 0; }
        // va au ballon le plus proche de ceux qui ne viennent pas de frapper
        let ch = null, dmin = 1e9;
        for (const j of L_) { j.repos -= dt; const dd = Math.abs(j.x - b.x); if (j.repos <= 0 && dd < dmin) { dmin = dd; ch = j; } }
        for (const j of L_) {
          const cible = j === ch ? b.x : b.x + j.place;
          const dx = cible - j.x;
          // on ne se retourne que si la cible est franchement de l'autre cote : plus de va-et-vient sur le ballon
          // et jamais deux demi-tours en moins de 0,6 s : il regarde passer le ballon, puis se retourne
          j.tr -= dt;
          const veut = dx > 10 ? 1 : dx < -10 ? -1 : j.regard;
          if (veut !== j.regard && j.tr <= 0) { j.regard = veut; j.tr = .6; }
          const vit = Math.abs(dx) < 4 ? 0 : j === ch ? j.v : Math.min(j.v * .8, Math.abs(dx) * 1.2);
          j.vv = Math.sign(dx) === j.regard ? j.regard * vit : 0;
          // la cadence d'une vraie course, en proportion de la vitesse ; a l'arret, les jambes ne s'agitent pas
          if (j.vv) j.t += dt * 10 * Math.abs(j.vv) / j.v;
          j.x += (j.vv - dep) * dt;
          if (j.x < -20) { j.x = G.VW + rnd(10, 80); j.regard = -1; }
        }
        // la frappe : au contact du ballon au sol, on joue vers le milieu de l'image
        if (ch && Math.abs(ch.x - b.x) < 4 && b.h < 2) {
          const droite = Math.random() < (b.x < G.VW * .5 ? .8 : .25);
          b.vx = (droite ? 1 : -1) * rnd(55, 95) + dep;
          b.vh = Math.random() < .35 ? rnd(70, 115) : 0;
          ch.repos = rnd(.9, 1.6);
        }
      },
      draw(x, d, camY, T) {
        const solY = q => D.crete(sc, i, q, d) + camY;
        for (const j of L_) {
          if (j.x < -14 || j.x > G.VW + 14) continue;
          x.save(); x.translate(j.x, solY(j.x) + j.dy); x.scale(e, e); G.dollDraw(x, j.d, j.vv ? 'course' : 'debout', j.vv ? j.t : 0, 0, 0, j.regard < 0); x.restore();
        }
        if (b.x > 0 && b.x < G.VW) {
          const y = solY(b.x) + 5 - b.h, d = 5, im = ballonPixels(d)[((b.rot | 0) % 3 + 3) % 3];
          x.drawImage(im, Math.round(b.x * S - d / 2) / S, Math.round(y * S - d) / S, d / S, d / S);
        }
      } };
  };

})();
