/* Les acteurs animes du groupe desert : voir vie.js. */
'use strict';
(function () {
  const FX = G.Decor.FX, D = G.Decor, V = G.Vie, S = G.S;
  const R = V.R;
  // le plan peint n dans l'ordre de la recette
  const peint = (sc, n) => V.plan(sc, 'peint', n);
  const CAM = f => Math.max(.1, Math.min(1, f * 1.1));

  /* ---- Le Caire : les taxis noirs et blancs roulent dans la rue de la rangee la plus proche ---- */
  function taxi(x, X, Y, dir, T) {
    // Y : 7 unites au-dessus de la chaussee ; le sprite pose ses roues dessus et regarde ou il va
    const sp = D.spr('taxi_caire', 'l');
    if (!sp.ok) return;
    const b = Y + 7 + (T * 9 % 1 > .5 ? .3 : 0);
    x.save(); x.imageSmoothingEnabled = false; x.translate(Math.round(X * S) / S, 0);
    if (dir < 0) x.scale(-1, 1);
    x.drawImage(sp.img, -sp.w / 2, b - sp.h, sp.w, sp.h);
    x.restore();
  }
  FX.taxis_caire = sc => {
    const i = peint(sc, 4), l = [];
    const voie = dir => sc.plans[i].y + sc.plans[i].h - (dir > 0 ? 6.5 : 2.5);
    for (let n = 0; n < 6; n++) { const dir = n % 2 ? 1 : -1; l.push({ dir, x: G.rnd(-40, G.VW + 40), v: dir * G.rnd(16, 34), att: 0 }); }
    return {
      plan: i,
      maj(dt) {
        const f = V.defile(sc, i);
        for (const c of l) {
          if (c.att > 0) { c.att -= dt; if (c.att <= 0) c.x = c.v > f ? -22 : G.VW + 22; continue; }
          c.x += (c.v - f) * dt;
          if (c.x < -26 || c.x > G.VW + 26) c.att = G.rnd(.3, 3.5);
        }
      },
      draw(x, d, camY, T) {
        for (const c of l) if (c.att <= 0 && c.dir > 0) taxi(x, c.x, voie(c.dir) + camY - 7, c.dir, T);
        for (const c of l) if (c.att <= 0 && c.dir < 0) taxi(x, c.x, voie(c.dir) + camY - 7, c.dir, T);
      },
    };
  };

  /* ---- Un sprite de vehicule qui suit la crete de son plan, sa poussiere derriere lui ---- */
  FX.buggys = (sc, arg) => {
    const i = V.plan(sc, 'dun', +(arg || 2)), sp = D.spr('buggy', 'm'), l = [], pp = [], amb = sc.m.amb;
    for (let n = 0; n < 3; n++) l.push({ x: G.rnd(-80, G.VW), v: G.rnd(52, 84), ph: G.rnd(6), att: 0, em: 0 });
    return {
      plan: i,
      maj(dt) {
        const f = V.defile(sc, i);
        for (const c of l) {
          if (c.att > 0) { c.att -= dt; if (c.att <= 0) { c.x = -sp.w - 10; c.v = G.rnd(52, 84); } continue; }
          c.x += (c.v - f) * dt;
          if (c.x > G.VW + 40 || c.x < -sp.w - 60) c.att = G.rnd(.4, 4);
          c.em -= dt;
          if (c.em <= 0 && pp.length < 46) { c.em = .05; pp.push({ x: c.x + 2, y: 0, b: c.x + 2, t: 0, d: G.rnd(.5, 1), s: G.rnd(1.5, 4) }); }
        }
        for (const p of pp) { p.t += dt; p.x -= (f + 10) * dt; p.y -= 7 * dt; }
        while (pp.length && pp[0].t > pp[0].d) pp.shift();
      },
      draw(x, d, camY, T) {
        for (const p of pp) {
          const a = 1 - p.t / p.d, s = p.s + p.t * 9;
          x.fillStyle = `rgba(226,196,150,${.5 * a})`;
          const Y = D.crete(sc, i, p.b, d) + camY - 1 + p.y;
          x.fillRect(p.x - s / 2, Y - s, s, s * .8);
        }
        if (!sp.ok) return;
        for (const c of l) {
          if (c.att > 0) continue;
          // les deux roues se posent chacune sur le sable, la caisse prend la pente
          const a = D.crete(sc, i, c.x + sp.w * .16, d), b = D.crete(sc, i, c.x + sp.w * .84, d);
          const ang = Math.max(-.32, Math.min(.32, Math.atan2(b - a, sp.w * .68)));
          x.save();
          x.translate(c.x + sp.w / 2, (a + b) / 2 + camY + 1);
          x.rotate(ang);
          D.ombreSol(x, 0, -1, sp.w * .9, amb);
          x.drawImage(sp.img, -sp.w / 2, -sp.h, sp.w, sp.h);
          x.restore();
        }
      },
    };
  };

  /* ---- Le feu de camp : pose par terre, au milieu du cercle de pierres, avec ceux qui le veillent ---- */
  FX.feu_camp = sc => {
    const i = peint(sc, 0), p = sc.plans[i], PAS = 620 / S, TOUR = p.nw / S, tic = [];
    for (let n = 0; n < 18; n++) tic.push({ t: G.rnd(), v: G.rnd(.5, 1.1), dx: G.rnd(-4, 4), ph: G.rnd(6) });
    return {
      plan: i,
      draw(x, d, camY, T) {
        const off = d * p.f, Y = p.y + p.h - 6 / S + camY - .6, dr = V.drone();
        for (let k = 0; k < TOUR / PAS - .01; k++) {
          const X = (((292 / S + k * PAS - off) % TOUR) + TOUR) % TOUR;
          for (const A of [X, X - TOUR]) {
            if (A < -60 || A > G.VW + 60) continue;
            // la lueur qui respire
            const v = Math.sin(T * 9) * .03 + Math.sin(T * 23) * .02;
            x.fillStyle = `rgba(255,150,60,${.05 + v * .6})`; x.beginPath(); x.arc(A, Y - 6, 42, 0, 7); x.fill();
            x.fillStyle = `rgba(255,180,90,${.07 + v * .6})`; x.beginPath(); x.arc(A, Y - 5, 24, 0, 7); x.fill();
            // les buches
            R(x, '#2a1a18', A - 6, Y - 1, 12, 1.2); R(x, '#3e241c', A - 4, Y - 2, 8, 1.2);
            // les flammes, de la plus large a la plus chaude
            const H = [[5, 9, '#d8391f'], [3.6, 7, '#ff8a2a'], [2.2, 5, '#ffd24a'], [1, 3, '#fff6c8']];
            for (const [l, h, c] of H) for (let j = 0; j < 7; j++) {
              const q = j / 7, w = l * (1 - q) * (1 + .2 * Math.sin(T * 13 + j * 1.7));
              R(x, c, A - w + Math.sin(T * 11 + j) * q * 1.3, Y - 1.5 - q * h * (1 + .16 * Math.sin(T * 8 + l)), w * 2, h / 7 + .5);
            }
            // les etincelles ; le drone qui passe au ras les attise
            const fort = dr && Math.abs(dr.x - A) < 46 && dr.proche ? 1.8 : 1;
            for (const s of tic) {
              const q = (T * s.v + s.t) % 1;
              x.fillStyle = q < .5 ? '#ffe9a0' : q < .8 ? '#ff9a2e' : 'rgba(216,57,31,.6)';
              x.fillRect(A + s.dx * (1 + q * fort) + Math.sin(T * 3 + s.ph) * 2, Y - 3 - q * 28 * fort, .9, .9);
            }
            // deux veilleurs assis, a contre-jour : l'un tend les mains
            const m = Math.sin(T * 1.3) * .5;
            R(x, '#15101a', A - 19, Y - 8, 4.2, 7); R(x, '#15101a', A - 18.4, Y - 11, 3, 3); R(x, '#15101a', A - 15.4, Y - 5.5 + m, 3.6, 1);
            R(x, '#15101a', A - 19, Y - 1.4, 7, 1.4);
            R(x, '#15101a', A + 15, Y - 7, 4.2, 6); R(x, '#a03a34', A + 15, Y - 7, .8, 6); R(x, '#15101a', A + 15.4, Y - 10, 3, 3);
            R(x, '#15101a', A + 13, Y - 1.4, 7, 1.4);
          }
        }
      },
    };
  };

  /* ---- La course de modules : deux reacteurs tirent une nacelle, au ras du sol, dans la poussiere ---- */
  const COUL = [['#d94a2e', '#ff8a5a', '#7a2418'], ['#f0b53a', '#ffe08a', '#8a5c1c'], ['#3a7fd0', '#8fc4f0', '#1f4070'], ['#d8d8d0', '#ffffff', '#6a6a72'], ['#7a54c0', '#b49af0', '#3a2a70']];
  function module(x, X, Y, e, c, T, ph) {
    const r = (col, u, v, w, h) => R(x, col, X + u * e, Y + v * e, w * e, h * e);
    const [mi, cl, om] = c, fl = T * 40 % 1 > .5;
    // les deux cables tendus entre les reacteurs et la nacelle
    for (let k = 0; k < 7; k++) { const q = k / 7; r('#ffe9a0', -13 - q * 11, -2.4 + q * 2, 1.7, .55); r('#ffe9a0', -11 - q * 13, -6.6 + q * 6, 1.8, .55); }
    // la nacelle : une baignoire de couleur, le pilote casque, derriere les reacteurs
    r(om, -34, -.2, 11, 3.6); r(mi, -35, -1, 11, 3.4); r(cl, -34, -1.2, 7, .7); r('#17151c', -35, 2.2, 8, .7);
    r('#2a3f6a', -31, -3.4, 2.6, 2.6); r('#f4f1e6', -31.2, -5.2, 3, 2.2); r('#23303c', -29.4, -4.6, 1.4, 1);
    r(om, -24.4, -1, 1.4, 2.6);
    // le faisceau d'energie entre les deux reacteurs : il claque
    if (fl) { const u = Math.sin(T * 50) * 6; r('rgba(160,230,255,.95)', u, -3.8, .6, 3.2); r('rgba(255,255,255,.9)', u * .4 + 2, -3.2, .5, 2.4); }
    const eng = (u, v, a, b, d_) => {
      const h = 4.4;
      r(a, u - 13, v, 26, h); r(a, u - 15, v + .7, 2, h - 1.4);
      r(b, u - 11, v, 20, 1.1); r(d_, u - 13, v + h - .9, 26, .9);
      r('#17151c', u - 4, v + 1.3, 9, .5);
      // la bouche d'entree, le nez
      r('#17151c', u + 12, v + .4, 3, h - .8); r(b, u + 13, v - .4, 3.4, .7); r(d_, u + 13, v + h - .3, 3.4, .7);
      // les ailerons
      r(d_, u - 12, v - 2, 4.4, 2); r(b, u - 12, v - 2, 1.4, 2);
      // la flamme
      const fx = 4 + Math.sin(T * 60 + ph) * 2;
      r('#ff7a24', u - 15 - fx, v + .6, fx, h - 1.2); r('#ffd24a', u - 15 - fx * .7, v + 1.1, fx * .7, h - 2.2); r('#fff6c8', u - 15 - fx * .3, v + 1.6, fx * .3, 1.2);
    };
    eng(4, -8.2, om, mi, melange_(om));
    eng(0, -3.8, mi, cl, om);
  }
  const melange_ = c => '#1f1a24';
  FX.pods = (sc, arg) => {
    const [ni, e, vmin] = (arg || '2,.8,150').split(',').map(Number);
    const i = peint(sc, ni), l = [], pp = [];
    let attente = G.rnd(.2, 2);
    const groupe = () => {
      const n = G.irnd(2, 3);
      for (let k = 0; k < n; k++) l.push({ x: -60 - k * G.rnd(36, 70), v: vmin * G.rnd(1, 1.45), c: COUL[G.irnd(0, COUL.length - 1)], ph: G.rnd(6), em: 0, h: G.rnd(5, 8) });
    };
    return {
      plan: i,
      maj(dt, d) {
        const f = V.defile(sc, i);
        attente -= dt;
        if (attente <= 0 && !l.length) { groupe(); attente = G.rnd(2, 6); }
        for (let k = l.length - 1; k >= 0; k--) {
          const c = l[k];
          c.x += (c.v - f) * dt;
          if (c.x > G.VW + 90) { l.splice(k, 1); continue; }
          c.em -= dt;
          if (c.em <= 0 && pp.length < 50 && c.x > -30) { c.em = .035; pp.push({ x: c.x - 24 * e, b: c.x - 24 * e, t: 0, d: G.rnd(.35, .8), s: G.rnd(1.5, 3.5), y: 0 }); }
        }
        for (const p of pp) { p.t += dt; p.x -= f * dt * .9; p.y -= 8 * dt; }
        while (pp.length && pp[0].t > pp[0].d) pp.shift();
      },
      draw(x, d, camY, T) {
        for (const p of pp) {
          const a = 1 - p.t / p.d, s = (p.s + p.t * 4) * (.35 + e * .3);
          x.fillStyle = `rgba(244,226,190,${.6 * a})`;
          x.fillRect(p.x - s / 2, D.crete(sc, i, Math.max(0, Math.min(G.VW, p.x)), d) + camY + p.y - s, s, s);
        }
        for (const c of l) {
          if (c.x < -60) continue;
          const sol = D.crete(sc, i, Math.max(0, Math.min(G.VW, c.x)), d) + camY;
          // l'ombre au sol
          x.fillStyle = 'rgba(70,40,30,.35)';
          x.fillRect(c.x - 36 * e, sol + .5, 54 * e, 1.6 * e);
          const sp = D.spr('module_course', e < 1 ? 'm' : 'l');
          if (sp.ok) x.drawImage(sp.img, c.x - sp.w * .7, sol - (c.h + 3) * e + Math.sin(T * 7 + c.ph) * .9 * e - sp.h, sp.w, sp.h);
        }
      },
    };
  };

  /* ---- Les dromadaires : ils marchent vraiment, pattes l'une apres l'autre, chacune posee sur la dune ---- */
  const BAT = [['#2f3f6a', '#c9455a'], ['#3a2a30', '#c9a040'], ['#6a2f3a', '#3f7a8a'], ['#2a2a38', '#d8d0b8']];
  function guide(x, sc, i, d, camY, X, e, ph, salue) {
    x.save(); x.translate(X, D.crete(sc, i, X, d) + camY); x.scale(.42 * e, .42 * e);
    G.dollDraw(x, 'berbere', salue ? 'salut' : 'marche', ph / 3, 0, 0, false);
    x.restore();
  }
  FX.caravane = (sc, arg) => {
    const [ni, e, n, dep] = (arg || '2,1,4,0').split(',').map(Number);
    const i = V.plan(sc, 'dun', ni), PAS = 36 * e, NI = D.nbImages('dromadaire') || 6, amb = sc.m.amb;
    let tete = G.VW * (dep || .9), ph = 0;
    return {
      plan: i,
      maj(dt) {
        const v = 15 * e;  // son allure
        tete -= (V.defile(sc, i) - v) * dt;
        ph += dt * 3.4;
        if (tete < -PAS * (n + 1) - 30) { tete = G.VW + G.rnd(60, 420); }
      },
      draw(x, d, camY, T) {
        const dr = V.drone();
        if (tete + 30 < 0 && tete < -PAS * (n + 2)) return;
        for (let k = n - 1; k >= 0; k--) {
          const X = tete - 18 * e - k * PAS;
          if (X < -40 || X > G.VW + 40) continue;
          // les images de marche, posees sur la dune, chacun a son pas, avec son ombre
          const sp = D.spr('dromadaire_f' + (((ph + k * 1.3) / (2 * Math.PI) * NI | 0) % NI), e < 1.2 ? 'm' : 'l', amb);
          const yS = D.crete(sc, i, X, d) + camY + .6;
          if (sp.ok) { D.ombreSol(x, Math.round(X * S) / S, yS - .6, sp.w * .7, amb); x.drawImage(sp.img, Math.round(X * S) / S - sp.w / 2, Math.round((yS - sp.h) * S) / S, sp.w, sp.h); }
        }
        if (tete > -10 && tete < G.VW + 20) guide(x, sc, i, d, camY, tete + 8 * e, e, ph * 1.5, dr && Math.abs(dr.x - tete) < 60);
      },
    };
  };

  /* ---- L'ULM : une aile delta, un chariot, une helice. Le pilote salue ; il s'ecarte si le drone arrive ---- */
  FX.ulm = (sc, arg) => {
    const i = V.plan(sc, 'dun', +(arg || 2)), e = 1.9;
    let X = -60, Y = 30, att = 1, dy = 0, base = 34, s = 1, vit = 34;
    return {
      plan: i,
      maj(dt) {
        const f = V.defile(sc, i);
        if (att > 0) { att -= dt; if (att <= 0) { s = 1; X = -70; base = G.rnd(40, 66); vit = f + G.rnd(30, 48); } return; }
        X += (vit - f) * dt;
        const dr = V.drone();
        const voulu = dr && Math.abs(dr.x - X) < 90 && Math.abs(dr.y - (base + dy)) < 34 ? (dr.y > base ? -26 : 26) : 0;
        dy += (voulu - dy) * Math.min(1, dt * 1.4);
        if (X > G.VW + 70) att = G.rnd(3, 9);
      },
      draw(x, d, camY, T) {
        if (att > 0) return;
        const Yb = base + dy + Math.sin(T * .9) * 2.5 + camY;
        const r = (c, u, v, w, h) => R(x, c, X + u * e, Yb + v * e, w * e, h * e);
        // l'ombre sur la dune, a sa place
        const sy = D.crete(sc, i, Math.max(0, Math.min(G.VW, X)), d) + camY;
        if (X > -20 && X < G.VW + 20) { x.fillStyle = 'rgba(90,60,40,.22)'; x.fillRect(X - 13, sy + 5, 26, 1.4); }
        const sp = D.spr('ulm', 'l');
        if (sp.ok) {
          x.save(); x.imageSmoothingEnabled = false; x.translate(X, Yb); x.rotate(-dy * .004);
          x.drawImage(sp.img, -sp.w / 2, -sp.h * .75, sp.w, sp.h);
          // l'helice tourne
          const hl = Math.abs(Math.sin(T * 44)) * 5 + 1;
          R(x, 'rgba(40,40,50,.55)', -sp.w * .11, -sp.h * .75 + sp.h * .62 - hl, 1.2, hl * 2);
          x.restore();
        }
      },
    };
  };

  /* ---- Siwa : une source chaude passe de temps en temps ; elle fume, et jaillit quand le drone arrive ---- */
  /* La source de Siwa : une mare naturelle dans un creux de terre rouge, peinte au pixel comme les mares du plan
     (mare_nuit, outils/monuments_desert.py) ; l'eau garde le bleu du ciel de nuit, des bulles remontent et font des ronds,
     un peu de vapeur dans l'air frais. Plus de geyser ni de bleu turquoise lumineux (Max, 02/11/2026). */
  function mareSource(w, h) {
    const c = G.mk(w + 8, h + 8), x = c.x, cx = (w + 8) / 2, cy = (h + 8) / 2;
    const lobes = [[-w * .18, 0, w * .36, h * .45], [w * .16, -h * .06, w * .32, h * .4], [0, h * .08, w * .42, h * .38]];
    const dedans = (px, py, m = 0) => lobes.some(([ox, oy, rx, ry]) => ((px - ox) / (rx + m)) ** 2 + ((py - oy) / (ry + m * .5)) ** 2 <= 1);
    for (let py = -cy; py < cy; py++) for (let px = -cx; px < cx; px++) {
      let col = null;
      if (dedans(px, py)) col = !dedans(px, py - 1) ? '#121c38' : py < -h * .18 ? '#2f4a7a' : py < h * .1 ? '#22386a' : '#18294e';
      else if (dedans(px, py, 2.5)) col = py > -h * .12 ? '#5a2420' : '#6e2c22';
      if (col) { x.fillStyle = col; x.fillRect(px + cx, py + cy, 1, 1); }
    }
    x.fillStyle = '#4a6aa0'; x.fillRect(cx - w * .22, cy - 1, 6, 1); x.fillRect(cx + w * .05, cy + 2, 4, 1);
    x.fillStyle = '#cfe0ff'; x.fillRect(cx + 2, cy - 2, 2, 1);
    x.fillStyle = '#1f3a2a'; for (let k = 0; k < 4; k++) x.fillRect(cx + w * .4 + k * 2, cy - 5 - (k % 2) * 3, 1, 6 + (k % 2) * 3);
    return c;
  }
  FX.sources = (sc, arg) => {
    const i = peint(sc, +(arg || 0)), bu = [];
    let X = G.VW + 80, att = 0;
    const W_ = 64, H_ = 10, im = mareSource(W_, H_);
    for (let n = 0; n < 8; n++) bu.push({ a: G.rnd(), dx: G.rnd(-14, 14), v: G.rnd(.12, .26), s: G.rnd(3, 6) });
    return {
      plan: i,
      maj(dt) {
        if (att > 0) { att -= dt; if (att <= 0) X = G.VW + 40; return; }
        X -= V.defile(sc, i) * dt;
        if (X < -60) att = G.rnd(5, 12);
      },
      draw(x, d, camY, T) {
        if (att > 0 || X > G.VW + 50 || X < -50) return;
        const Y = D.crete(sc, i, X, d) + camY + 9;
        const u = 1 / S, Xp = Math.round(X * S) / S, Yp = Math.round(Y * S) / S;
        x.drawImage(im, Xp - im.width / 2 * u, Yp - im.height / 2 * u, im.width * u, im.height * u);
        // les bulles qui remontent : des ronds qui s'elargissent sur l'eau, en pixels francs
        for (let k = 0; k < 3; k++) {
          const q = (T * .5 + k / 3) % 1, w = Math.round(2 + q * 14), ox = [-8, 5, -1][k];
          x.fillStyle = q < .5 ? '#6a8ac0' : '#4a6aa0';
          x.fillRect(Xp + (ox - w / 2) * u, Yp + (k - 1) * u, w * u, u);
        }
        // un peu de vapeur dans l'air frais de la nuit
        for (const b of bu) {
          const q = (T * b.v + b.a) % 1, s = b.s * (.5 + q * 1.2);
          x.fillStyle = `rgba(200,212,232,${.16 * (1 - q)})`;
          x.fillRect(X + b.dx + Math.sin(T + b.a * 6) * 3 - s / 2, Y - 3 - q * 26 - s / 2, s, s);
        }
      },
    };
  };

  /* ---- La mine : les tombereaux montent et descendent les pistes en lacets ; les mêmes tracés que outils/monuments_desert.py ---- */
  const MINE_ROUTES = [
    [[48, 196], [474, 152], [196, 116], [511, 88], [363, 68]],
    [[810, 196], [1282, 152], [974, 116], [1323, 88], [1159, 68]],
    [[1667, 196], [2070, 152], [1807, 116], [2105, 88], [1965, 68]],
  ];
  function tombereau(x, X, Y, e, dir, T, plein) {
    // X : le milieu, Y : le sol. Benne, cabine jaune en porte-a-faux, roues enormes
    const r = (c, u, v, w, h) => R(x, c, dir > 0 ? X + u * e : X - (u + w) * e, Y + v * e, w * e, h * e);
    r('rgba(40,15,10,.35)', -13, -.3, 27, 1);
    r('#e8b830', -13, -11, 18, 6.5); r('#ffd85a', -13, -11, 18, 1.2); r('#a87c1c', -13, -5.5, 18, 1.2);
    for (let u = -11; u < 4; u += 4) r('#a87c1c', u, -10, .8, 4.6);
    r('#e8b830', -14.5, -12.5, 2, 2.6);
    if (plein) { r('#b8552e', -12, -13, 16, 2.2); r('#d67a3e', -9, -14.2, 8, 1.4); }
    r('#2a2a30', -13, -4.6, 26, 1.6);
    r('#e8b830', 6, -11, 7, 6.4); r('#ffd85a', 6, -11, 7, 1); r('#23303c', 8.6, -9.6, 3.4, 2.8); r('#8fb4cc', 9, -9.2, 1.4, 1.4);
    r('#a87c1c', 5, -6, 8.6, 1.2); r('#fff6c8', 13, -6, .9, 1.2);
    const k = T * 9 % 1 > .5;
    for (const u of [-8.5, 7.5]) {
      r('#17151c', u - 3.2, -5, 6.4, 5); r('#17151c', u - 2.4, -5.6, 4.8, 6);
      r('#5a5a60', u - 1.2, -3.6, 2.4, 2.4); r(k ? '#a0a0a6' : '#3a3a42', u - .4, -2.8, .8, .8);
    }
  }
  FX.engins = sc => {
    const i = peint(sc, 0), p = sc.plans[i], l = [];
    // chaque tombereau monte son lacet, verse au sommet, redescend
    MINE_ROUTES.forEach((rt, n) => {
      const seg = []; let tot = 0;
      for (let k = 0; k < rt.length - 1; k++) { const dx = rt[k + 1][0] - rt[k][0], dy = rt[k + 1][1] - rt[k][1], lg = Math.hypot(dx, dy); seg.push({ a: rt[k], dx, dy, lg }); tot += lg; }
      for (let c = 0; c < 2; c++) l.push({ seg, tot, s: G.rnd(tot), dir: c % 2 ? 1 : -1, v: G.rnd(22, 34), n });
    });
    const place = c => { let s = c.s; for (const g of c.seg) { if (s <= g.lg) return { x: g.a[0] + g.dx * s / g.lg, y: g.a[1] + g.dy * s / g.lg, sens: g.dx * c.dir >= 0 ? 1 : -1 }; s -= g.lg; } const g = c.seg[c.seg.length - 1]; return { x: g.a[0] + g.dx, y: g.a[1] + g.dy, sens: 1 }; };
    return {
      plan: i,
      maj(dt) { for (const c of l) { c.s += c.dir * c.v * dt; if (c.s > c.tot) { c.s = c.tot; c.dir = -1; } if (c.s < 0) { c.s = 0; c.dir = 1; } } },
      draw(x, d, camY, T) {
        const TOUR = p.nw / S;
        for (const c of l) {
          const q = place(c), X = (((q.x / S - d * p.f) % TOUR) + TOUR) % TOUR;
          if (X > G.VW + 20 && X - TOUR < -20) continue;
          const A = X > G.VW + 20 ? X - TOUR : X;
          tombereau(x, A, p.y + q.y / S + camY, .5, q.sens, T, c.dir < 0);
          // un filet de poussiere
          x.fillStyle = 'rgba(232,170,120,.4)';
          for (let k = 1; k < 4; k++) x.fillRect(A - q.sens * (k * 4 + 5), p.y + q.y / S + camY - 1 - k * .8 + Math.sin(T * 4 + k) * .4, 1 + k * .9, 1 + k * .5);
        }
      },
    };
  };
  FX.tombereaux = sc => {
    // les gros, sur la piste du carreau : ils se croisent, roulent dans leur poussiere
    const i = peint(sc, 1), p = sc.plans[i], l = [], pp = [];
    for (let n = 0; n < 3; n++) { const dir = n % 2 ? -1 : 1; l.push({ x: G.rnd(G.VW), dir, v: dir * G.rnd(20, 30), att: 0, em: 0, plein: Math.random() < .5 }); }
    const piste = dir => p.y + (dir > 0 ? 40 : 43) / S;
    return {
      plan: i,
      maj(dt) {
        const f = V.defile(sc, i);
        for (const c of l) {
          if (c.att > 0) { c.att -= dt; if (c.att <= 0) c.x = c.v > f ? -34 : G.VW + 34; continue; }
          c.x += (c.v - f) * dt;
          if (c.x < -40 || c.x > G.VW + 40) c.att = G.rnd(.6, 4);
          c.em -= dt;
          if (c.em <= 0 && pp.length < 40) { c.em = .07; pp.push({ x: c.x - c.dir * 14, y: piste(c.dir), t: 0, d: G.rnd(.6, 1.2), s: G.rnd(2, 4) }); }
        }
        for (const q of pp) { q.t += dt; q.x -= f * dt; q.y -= 5 * dt; }
        while (pp.length && pp[0].t > pp[0].d) pp.shift();
      },
      draw(x, d, camY, T) {
        for (const q of pp) { const a = 1 - q.t / q.d, s = q.s + q.t * 9; x.fillStyle = `rgba(226,150,100,${.45 * a})`; x.fillRect(q.x - s / 2, q.y + camY - s, s, s * .9); }
        for (const c of l) if (c.att <= 0 && c.dir > 0) tombereau(x, c.x, piste(c.dir) + camY, 1.1, c.dir, T, c.plein);
        for (const c of l) if (c.att <= 0 && c.dir < 0) tombereau(x, c.x, piste(c.dir) + camY, 1.15, c.dir, T, c.plein);
      },
    };
  };

  /* ---- Soweto : le saut a l'elastique depuis la tour peinte ---- */
  FX.elastique = sc => {
    const i = peint(sc, 2), p = sc.plans[i];
    let t = -2;
    return {
      plan: i,
      maj(dt) { t += dt; if (t > 7) t = -G.rnd(2, 6); },
      draw(x, d, camY) {
        const TOUR = p.nw / S, X0 = ((323 - d * p.f) % TOUR + TOUR) % TOUR;
        const A = X0 > G.VW + 40 ? X0 - TOUR : X0;
        if (A < -30 || A > G.VW + 30) return;
        const top = p.y + 12 + camY;
        const k = t < 0 ? 0 : t < .9 ? (t / .9) ** 2 : 1 - .22 * Math.cos((t - .9) * 3.2) * Math.exp(-(t - .9) * .3) - .22;
        const Y = top + k * 66;
        // l'elastique se tend
        for (let q = 0; q < Y - top; q += 2) R(x, '#f0d83a', A + Math.sin(q * .4 + t * 3) * .3 * (1 - k), top + q, .7, 1.2);
        if (t < 0) { R(x, '#e04a3a', A - 1, top - 5, 2.4, 3.6); R(x, '#e0b080', A - .8, top - 6.4, 1.8, 1.6); return; }
        R(x, '#e04a3a', A - 1.2, Y, 2.4, 3.8); R(x, '#2a3f6a', A - 1.2, Y - 2.6, 1, 2.6); R(x, '#2a3f6a', A + .2, Y - 2.6, 1, 2.6); R(x, '#e0b080', A - .9, Y + 3.6, 1.8, 1.8);
        R(x, '#e04a3a', A - 3.4, Y + 2, 2.4, .9); R(x, '#e04a3a', A + 1.2, Y + 2, 2.4, .9);
      },
    };
  };

  /* ---- Des vehicules qui roulent sur la route du decor, dans les deux sens, a la taille de la route.
     arg : sprite,taille,nombre[,plan,voie1/voie2] ; plan = 'mer' pour des bateaux sur un fleuve (la Tamise, 03/11/2026) ---- */
  FX.route_vehicules = (sc, arg) => {
    const [id = 'minibus', t = 'm', n = 3, kind = 'route', voies = '7.5/12.5'] = (arg || '').split(',');
    const [vAr, vAv] = voies.split('/').map(Number);
    const i = V.plan(sc, kind, 0), p = sc.plans[i], l = [], amb = sc.m.amb;
    if (!p) return { draw() { } };
    for (let q = 0; q < +n; q++) { const dir = q % 2 ? -1 : 1; l.push({ dir, x: G.rnd(G.VW), v: dir * G.rnd(30, 52), att: q ? G.rnd(1, 6) : 0 }); }
    return {
      plan: i,
      maj(dt) {
        const f = V.defile(sc, i), sp = D.spr(id, t);
        for (const c of l) {
          if (c.att > 0) { c.att -= dt; if (c.att <= 0) c.x = c.v > f ? -sp.w : G.VW + sp.w; continue; }
          c.x += (c.v - f) * dt;
          if (c.x < -sp.w - 20 || c.x > G.VW + sp.w + 20) c.att = G.rnd(1.5, 6);
        }
      },
      draw(x, d, camY) {
        const sp = D.spr(id, t, amb);
        if (!sp.ok) return;
        for (const c of l) {
          if (c.att > 0) continue;
          // voie du fond vers la gauche, voie de devant vers la droite
          const Y = Math.round((p.y + (c.dir > 0 ? vAv : vAr) + camY) * S) / S;
          x.save(); x.translate(Math.round(c.x * S) / S, Y);
          D.ombreSol(x, 0, -.4, sp.w * .9, amb);
          if (c.dir < 0) x.scale(-1, 1);
          x.drawImage(sp.img, -sp.w / 2, -sp.h, sp.w, sp.h);
          x.restore();
        }
      },
    };
  };

  /* ---- Soweto : des voitures sur la voie rapide, jamais au-dessus des maisons ---- */
  FX.voitures = sc => {
    const i = peint(sc, 3), p = sc.plans[i], l = [];
    const COUL = ['#d94a3a', '#f4f0e0', '#3a6fb0', '#2a2a38', '#c8c4b8', '#e8b830'];
    for (let n = 0; n < 7; n++) { const dir = n % 2 ? 1 : -1; l.push({ dir, x: G.rnd(G.VW), v: dir * G.rnd(26, 44), c: COUL[n % COUL.length], att: 0 }); }
    return {
      plan: i,
      maj(dt) {
        const f = V.defile(sc, i);
        for (const c of l) {
          if (c.att > 0) { c.att -= dt; if (c.att <= 0) c.x = c.v > f ? -14 : G.VW + 14; continue; }
          c.x += (c.v - f) * dt;
          if (c.x < -16 || c.x > G.VW + 16) c.att = G.rnd(.2, 3);
        }
      },
      draw(x, d, camY) {
        for (const c of l) {
          if (c.att > 0) continue;
          const Y = p.y + (c.dir > 0 ? 15 : 21) / S + camY;
          R(x, c.c, c.x, Y - 2.4, 8, 2.2); R(x, c.c, c.x + 1.6, Y - 4, 4.6, 1.8);
          R(x, '#9dc0d0', c.x + (c.dir > 0 ? 3.8 : 2), Y - 3.7, 2, 1.2);
          R(x, '#17151c', c.x + .9, Y - .6, 1.6, 1); R(x, '#17151c', c.x + 5.4, Y - .6, 1.6, 1);
        }
      },
    };
  };

  /* ---- Le campement de Johannesburg : la fumee des feux de camp, que le drone disperse quand il passe au ras ---- */
  FX.fumee_camp = sc => {
    const i = peint(sc, 2), p = sc.plans[i], FEUX = [[470, 92], [1270, 84], [2010, 96]], pf = [];
    for (let n = 0; n < 14; n++) pf.push({ a: G.rnd(), v: G.rnd(.16, .3), s: G.rnd(2.5, 5), ph: G.rnd(6) });
    return {
      plan: i,
      draw(x, d, camY, T) {
        const TOUR = p.nw / S, dr = V.drone();
        for (const [fx, fy] of FEUX) {
          const X = (((fx / S - d * p.f) % TOUR) + TOUR) % TOUR, A = X > G.VW + 40 ? X - TOUR : X;
          if (A < -40 || A > G.VW + 40) continue;
          const Y = p.y + fy / S + camY - 3;
          const ecarte = dr && Math.abs(dr.x - A) < 40 ? (dr.x < A ? 1 : -1) * 16 : 0;
          for (const b of pf) {
            const q = (T * b.v + b.a) % 1, s = b.s * (.5 + q * 1.8);
            x.fillStyle = `rgba(226,222,212,${.42 * (1 - q)})`;
            x.fillRect(A + Math.sin(T * .8 + b.ph) * 3 * q + q * q * (10 + ecarte) - s / 2, Y - q * 46 - s / 2, s, s);
          }
        }
      },
    };
  };
})();
