/* Les acteurs animes du groupe nature : voir vie.js.
   Ils sont peints une fois, image par image, dans de petites toiles (feuille), puis poses a la bonne profondeur : c'est leger et ca reste en vrai pixel.
   Tout ce qui court suit le sol en coordonnees du monde : X = sx + d * f, et D.crete(sc, i, X, 0) donne le terrain.
   Un sujet a filmer peut etre un acteur : son sprite (vise_*) est un cadre vide, l'acteur s'y accroche et lui donne sa position. */
'use strict';
(function () {
  const FX = G.Decor.FX, D = G.Decor, V = G.Vie, S = G.S, K = '#17151f', TAU = Math.PI * 2;
  const { rnd, irnd, pick } = G;

  /* ---- La peinture ---- */
  const feuilles = new Map();
  // l'alpha devient franc et chaque image recoit un cerne d'un pixel : plus aucun flou, de vrais pixels
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
  function feuille(cle, w, h, n, peint, cerne = K, apres = null) {
    let f = feuilles.get(cle);
    if (f) return f;
    f = [];
    for (let k = 0; k < n; k++) { const c = G.mk(Math.ceil(w), Math.ceil(h)); peint(c.x, k / n, k); durcir(c, cerne); if (apres) apres(c.x, k / n, k); f.push(c); }
    feuilles.set(cle, f);
    return f;
  }
  function feuilleG(cle, w, h, n, peint, cerne = K, art = 2, ech = 1) {
    let f = feuilles.get(cle);
    if (f) return f;
    f = [];
    const W_ = Math.ceil(w * ech / art), H_ = Math.ceil(h * ech / art);
    for (let k = 0; k < n; k++) {
      const c = G.mk(W_, H_);
      c.x.scale(ech / art, ech / art); peint(c.x, k / n, k); c.x.setTransform(1, 0, 0, 1, 0, 0); durcir(c, cerne);
      const g = G.mk(W_ * art, H_ * art); g.x.imageSmoothingEnabled = false; g.x.drawImage(c, 0, 0, W_ * art, H_ * art); f.push(g);
    }
    feuilles.set(cle, f);
    return f;
  }
  // une planche faite d'avance (outils/monuments_nature.py) : n images cote a cote dans un sprite. null tant qu'elle n'est pas chargee
  const planches = new Map();
  function planche(id, n, t = 'l') {
    const k = id + t;
    if (planches.has(k)) return planches.get(k);
    const sp = D.spr(id, t);
    if (!sp.ok) return null;
    const w = sp.img.width / n, h = sp.img.height, f = [];
    for (let i = 0; i < n; i++) { const c = G.mk(w, h); c.x.imageSmoothingEnabled = false; c.x.drawImage(sp.img, -i * w, 0); f.push(c); }
    planches.set(k, f);
    return f;
  }
  const ligne = (x, c, a, b, e, f, l = 1) => { x.strokeStyle = c; x.lineWidth = l; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(e, f); x.stroke(); };
  const disc = (x, c, a, b, r) => { x.fillStyle = c; x.beginPath(); x.arc(a, b, Math.max(.5, r), 0, 7); x.fill(); };
  const ell = (x, c, a, b, rx, ry, rot = 0) => { x.fillStyle = c; x.beginPath(); x.ellipse(a, b, Math.max(.5, rx), Math.max(.5, ry), rot, 0, 7); x.fill(); };
  const poly = (x, c, ...p) => { x.fillStyle = c; x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.closePath(); x.fill(); };
  const rect = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  // la jambe : hanche, pied, genou pousse d'un cote
  const jambe = (x, c, hx, hy, px, py, gen, l1, l2) => {
    const mx = (hx + px) / 2, my = (hy + py) / 2, dx = px - hx, dy = py - hy, n = Math.hypot(dx, dy) || 1;
    const kx = mx - dy / n * gen, ky = my + dx / n * gen;
    ligne(x, c, hx, hy, kx, ky, l1); ligne(x, c, kx, ky, px, py, l2);
  };
  // pose une image : (X, Y) = le point d'ancrage (ax, ay) de l'image, en unites de jeu
  function pose(x, im, X, Y, rot = 0, flip = false, ax = .5, ay = 1) {
    const w = im.width / S, h = im.height / S, px = Math.round(X * S) / S, py = Math.round(Y * S) / S;
    if (!rot && !flip) { x.drawImage(im, px - w * ax, py - h * ay); return; }
    x.save(); x.translate(px, py); if (rot) x.rotate(rot); if (flip) x.scale(-1, 1); x.drawImage(im, -w * ax, -h * ay); x.restore();
  }
  const sol = (sc, i, X) => D.crete(sc, i, X, 0);
  const solDoux = (sc, i, X) => (sol(sc, i, X - 2.4) + sol(sc, i, X) + sol(sc, i, X + 2.4)) / 3;
  const pente = (sc, i, X) => Math.atan2(solDoux(sc, i, X + 6) - solDoux(sc, i, X - 6), 12);
  const sujetDe = nom => { const w = G.Jeu.w(); return w && w.sujet && w.sujet.s === nom ? w.sujet : null; };
  const f_ = (sc, i) => sc.plans[i] ? sc.plans[i].f : .1;

  // poussiere, neige, eclaboussures : des grains en coordonnees du monde
  function grains(max) {
    const p = [];
    return {
      add(X, Y, vx, vy, t, c, s = 1) { if (p.length < max) p.push({ X, Y, vx, vy, t, T: t, c, s }); },
      maj(dt, g = 0) { for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; q.t -= dt; if (q.t <= 0) { p[i] = p[p.length - 1]; p.pop(); continue; } q.X += q.vx * dt; q.Y += q.vy * dt; q.vy += g * dt; } },
      draw(x, d, f, camY) { for (const q of p) { x.globalAlpha = Math.min(1, q.t / q.T * 1.6); V.R(x, q.c, q.X - d * f, q.Y + camY, q.s, q.s); } x.globalAlpha = 1; },
    };
  }

  /* ==== VARS : les vetetistes a fond sur la crete ==== */
  const COUL_VTT = [['#e8452c', '#22242e', '#ffd23c', '#e8e4d8'], ['#2c8ae8', '#20242e', '#ffffff', '#ff7a2c'], ['#40b85a', '#1c2430', '#e8e4d8', '#e8452c'], ['#f0b020', '#2a2230', '#e8452c', '#2c8ae8']];
  const vttFeuille = (n, e = 1) => {
    const [maillot, short, casque, cadre] = COUL_VTT[n];
    return feuilleG('vtt' + n + '_' + e, 40, 31, 8, (x, k) => {
      const a = k * TAU, rg = [9, 23], rd = [31, 23], R_ = 6.4, cr = [18, 23.5];
      for (const [cx, cy] of [rg, rd]) {
        disc(x, '#1a1a22', cx, cy, R_ + .6); x.clearRect(0, 0, 0, 0);
        disc(x, '#8a8c94', cx, cy, R_ - 1.5); disc(x, '#23232c', cx, cy, R_ - 2.6);
        for (let i = 0; i < 3; i++) { const b = a * .5 + i * Math.PI / 3 * 2; ligne(x, '#c8cad2', cx, cy, cx + Math.cos(b) * (R_ - 2), cy + Math.sin(b) * (R_ - 2), 1); }
      }
      const piedA = [cr[0] + Math.cos(a) * 3.6, cr[1] + Math.sin(a) * 3.6], piedB = [cr[0] - Math.cos(a) * 3.6, cr[1] - Math.sin(a) * 3.6], han = [14, 11.5], ep = [24, 5.5], main = [28, 10];
      jambe(x, '#3a2e30', han[0], han[1], piedB[0], piedB[1], 3.4, 2.6, 1.6);
      ligne(x, cadre, cr[0], cr[1], rg[0], rg[1], 1.5); ligne(x, cadre, cr[0], cr[1], 15, 14, 1.8); ligne(x, cadre, 15, 14, 27, 12, 1.8); ligne(x, cadre, cr[0], cr[1], 27, 13, 2); ligne(x, cadre, 27, 11, rd[0], rd[1], 2); ligne(x, cadre, 15, 14, rg[0], rg[1], 1);
      rect(x, '#1a1a22', 12, 12.5, 5, 1.5); rect(x, '#2a2a32', 26.5, 9.5, 2, 2); ligne(x, '#2a2a32', 28, 10, 30, 8.5, 1.2);
      jambe(x, short, han[0], han[1], piedA[0], piedA[1], 3.4, 3, 1.8);
      const genX = (han[0] + piedA[0]) / 2 + 2.6;
      rect(x, '#e8b896', genX, (han[1] + piedA[1]) / 2 + 1, 1.5, 3);
      rect(x, '#101018', piedA[0] - 2, piedA[1] - .5, 4, 1.6);
      ligne(x, maillot, han[0], han[1], ep[0], ep[1], 4.6);
      rect(x, '#ffffff', 19, 6, 2, 3);
      ligne(x, maillot, ep[0], ep[1], (ep[0] + main[0]) / 2 + 1.2, (ep[1] + main[1]) / 2 + 1, 2); ligne(x, '#e8b896', (ep[0] + main[0]) / 2 + 1.2, (ep[1] + main[1]) / 2 + 1, main[0], main[1], 1.5);
      disc(x, '#e8b896', 27.2, 3.6, 2.4); ell(x, casque, 26.8, 2.5, 3.2, 2); rect(x, '#101018', 28, 3.2, 2, 1.1);
      rect(x, casque, 28.8, 1.8, 2, 1);
    }, K, 2, e);
  };
  FX.vtt = (sc, arg) => {
    const [ip, ech, rare] = (arg || '0,1').split(','), e = +(ech || 1);
    const i = V.plan(sc, 'col', +ip), f = f_(sc, i), l = [], gr = grains(70);
    const F = [0, 1, 2, 3].map(n => vttFeuille(n, e));
    let attente = rnd(.4, 3);
    const groupe = d => {
      const n = irnd(2, 4), sens = Math.random() < .72 ? 1 : -1, v = rnd(118, 150) * (.75 + e * .25);
      for (let k = 0; k < n; k++) {
        const sx = sens > 0 ? -24 - k * rnd(24, 40) * e : G.VW + 24 + k * rnd(24, 40) * e, X = sx + d * f, y = solDoux(sc, i, X);
        l.push({ X, y, vy: 0, air: false, sens, v: v * rnd(.94, 1.05), c: irnd(0, 3), ph: rnd(1), rot: 0, poudre: 0, bond: rnd(.4, 2.2) });
      }
    };
    return {
      plan: i,
      maj(dt, d) {
        attente -= dt;
        if (attente <= 0 && l.length < 6) { groupe(d); attente = rare ? rnd(18, 34) : rnd(4, 9); }
        for (const r of l) {
          r.X += r.sens * r.v * dt; r.ph += dt * r.v / 34;
          const yg = solDoux(sc, i, r.X), tgt = pente(sc, i, r.X) * (r.sens > 0 ? 1 : -1) * 1;
          r.bond -= dt;
          if (r.air) {
            r.vy += 300 * dt; r.y += r.vy * dt;
            r.rot += ((r.vy / 300) * .6 * 1 - r.rot) * Math.min(1, dt * 6);
            if (r.y >= yg) { r.air = false; r.y = yg; r.poudre = 7; }
          } else {
            const vg = (yg - r.y) / Math.max(dt, .001);
            // le terrain se derobe, ou une bosse : il decolle
            if (vg > r.vy + 60 && r.vy < -6 || r.bond <= 0) { r.air = true; r.vy = r.bond <= 0 ? -rnd(55, 85) : Math.min(r.vy, -22) * 1.1; r.bond = rnd(.9, 2.6); }
            else { r.vy += (vg - r.vy) * Math.min(1, dt * 18); r.y = yg; r.rot += (tgt - r.rot) * Math.min(1, dt * 12); }
          }
          if (!r.air && Math.random() < dt * 34) r.poudre = Math.max(r.poudre, 1);
          for (; r.poudre > 0; r.poudre--) gr.add(r.X - r.sens * rnd(7, 12), r.y - rnd(0, 2), -r.sens * rnd(10, 40), -rnd(6, 26), rnd(.25, .6), Math.random() < .5 ? '#e0d4a8' : '#c8b888', Math.random() < .3 ? 2 : 1);
        }
        gr.maj(dt, 40);
        for (let k = l.length - 1; k >= 0; k--) { const sx = l[k].X - d * f; if (l[k].sens > 0 ? sx > G.VW + 50 : sx < -50) l.splice(k, 1); }
      },
      draw(x, d, camY) {
        gr.draw(x, d, f, camY);
        for (const r of l) {
          const sx = r.X - d * f;
          if (sx < -30 || sx > G.VW + 30) continue;
          // le vetetiste v4 (Qwen, roues redessinees, 4 poses de pedalage) des qu'il existe, en quatre maillots ; chacun pedale a son rythme
          const nom = ['vtt', 'vtt_b', 'vtt_v', 'vtt_j'][r.c], n = D.existe(nom) ? D.nbImages(nom) : 0;
          const sp = n ? D.spr(nom + '_f' + (r.air ? 0 : (r.ph * 4 | 0) % n), e < .75 ? 'm' : 'l') : null;
          if (sp && sp.ok) pose(x, sp.img, sx, r.y + camY + 1, r.rot, r.sens < 0, .5, .96);
          else pose(x, F[r.c][r.air ? 2 : (r.ph * 8 & 7)], sx, r.y + camY + 1, r.rot, r.sens < 0, .5, .92);
        }
      },
    };
  };

  /* ==== VARS SOUS LA NEIGE ==== */
  const COUL_SKI = [['#e8452c', '#23242e', '#ffd23c'], ['#2c8ae8', '#f0f0e8', '#e8452c'], ['#7a3cd8', '#ffd23c', '#ffffff'], ['#18b090', '#23242e', '#ff7a2c']];
  // 0 glisse, 1 accroupi, 2 groupe en l'air, 3 grab (la main sur la spatule), 4 reception
  const skiFeuille = n => {
    const [veste, pant, bonnet] = COUL_SKI[n];
    return feuille('ski' + n, 42, 34, 5, (x, kk, k) => {
      const cx = 21, py = 29;
      const sk = (a, b, c, e) => { ligne(x, '#20222c', a, b, c, e, 1.6); ligne(x, '#ff5a3c', a + 3, b - .4, c - 3, e - .4, 1); };
      let han, ep, tete, pied = [cx, py - 1];
      if (k === 0) { han = [cx - 1, py - 11]; ep = [cx + 2, py - 19]; tete = [cx + 4, py - 23]; }
      else if (k === 1) { han = [cx - 3, py - 8]; ep = [cx + 4, py - 14]; tete = [cx + 7, py - 17]; }
      else if (k === 2) { han = [cx - 3, py - 11]; ep = [cx + 3, py - 18]; tete = [cx + 5, py - 22]; pied = [cx + 1, py - 4]; }
      else if (k === 3) { han = [cx - 3, py - 12]; ep = [cx + 3, py - 17]; tete = [cx + 4, py - 21]; pied = [cx + 1, py - 5]; }
      else { han = [cx - 4, py - 6]; ep = [cx + 3, py - 12]; tete = [cx + 6, py - 15]; }
      sk(pied[0] - 13, pied[1] + .5, pied[0] + 13, pied[1] - (k === 2 || k === 3 ? 1 : 0) + .5);
      rect(x, '#20222c', pied[0] - 2.5, pied[1] - 3, 5, 3);
      jambe(x, pant, han[0], han[1], pied[0], pied[1] - 2, k === 0 ? 1.4 : 4, 3.2, 2.4);
      ligne(x, veste, han[0], han[1], ep[0], ep[1], 5.2);
      ligne(x, '#ffffff', han[0] + .6, han[1] - 3, han[0] + 1.6, han[1] - 5, 1.2);
      const main = k === 3 ? [pied[0] + 9, pied[1] - 2] : k === 2 ? [ep[0] + 7, ep[1] - 1] : k === 4 ? [ep[0] + 8, ep[1] + 1] : [ep[0] + 5, ep[1] + 5];
      ligne(x, veste, ep[0], ep[1], main[0], main[1], 2);
      if (k < 3 || k === 4) ligne(x, '#3a3c48', main[0], main[1], main[0] - 5, main[1] + 7, 1);
      disc(x, '#e8b896', tete[0], tete[1], 2.6);
      ell(x, bonnet, tete[0] - .3, tete[1] - 1, 3.2, 2.3);
      rect(x, '#10101a', tete[0] + .6, tete[1] - .8, 2.6, 1.5); rect(x, '#ffa040', tete[0] + 1.4, tete[1] - .5, 1.2, .9);
    });
  };
  const TREMPLINS = [260, 860, 1420, 2010].map(v => v / S), L_PARC = 2500 / S;
  const levreSuivante = X => { const n = Math.floor(X / L_PARC); let b = Infinity; for (const c of [n, n + 1]) for (const t of TREMPLINS) { const u = c * L_PARC + t; if (u > X && u < b) b = u; } return b; };
  FX.freestyle = sc => {
    const i = V.plan(sc, 'peint', 3), f = f_(sc, i), l = [], gr = grains(110);
    const F = [0, 1, 2, 3].map(skiFeuille);
    let attente = rnd(.2, 1.4), lie = null;
    const nouveau = d => {
      const X = -26 + d * f, o = { X, y: solDoux(sc, i, X), v: rnd(108, 124), c: irnd(0, 3), air: false, vy: 0, T: 0, tf: 1, tours: 1, sens: 1, grab: false, rot: 0, fige: 0 };
      l.push(o);
      return o;
    };
    return {
      plan: i,
      maj(dt, d) {
        attente -= dt;
        const su = sujetDe('vise_ski');
        if (su && (!lie || l.indexOf(lie) < 0) && !su.fin) { lie = nouveau(d); }
        if (attente <= 0 && l.length < 2) { nouveau(d); attente = rnd(3, 7); }
        for (const s of l) {
          const X0 = s.X;
          s.X += s.v * dt; s.fige = Math.max(0, s.fige - dt);
          if (s.air) {
            s.T += dt; s.vy += 300 * dt; s.y += s.vy * dt;
            const k = Math.min(1, s.T / s.tf), e = k * k * (3 - 2 * k);
            s.rot = -s.sens * s.tours * TAU * e;
            const yg = solDoux(sc, i, s.X);
            if (s.y >= yg && s.vy > 0) {
              s.air = false; s.y = yg; s.rot = 0; s.fige = .32;
              // la gerbe de neige
              for (let q = 0; q < 26; q++) gr.add(s.X + rnd(-10, 6), yg - rnd(0, 2), rnd(-30, 75), -rnd(18, 95), rnd(.35, .85), q % 3 ? '#ffffff' : '#cfe0ee', q % 4 ? 1 : 2);
            }
          } else {
            const yg = solDoux(sc, i, s.X);
            s.y = yg;
            s.rot += (pente(sc, i, s.X) - s.rot) * Math.min(1, dt * 16);
            const lev = levreSuivante(X0);
            if (lev <= s.X && lev > X0) {
              s.air = true; s.vy = -rnd(128, 150); s.T = 0;
              // on calcule le temps de vol : il retombe pile sur ses skis, apres un ou deux tours
              let t = 0, y = s.y;
              while (t < 3) { t += .02; y = s.y + s.vy * t + 150 * t * t; if (t > .3 && y >= sol(sc, i, s.X + s.v * t)) break; }
              s.tf = t; s.tours = t > 1.05 && Math.random() < .6 ? 2 : 1; s.sens = Math.random() < .5 ? 1 : -1; s.grab = Math.random() < .6;
              for (let q = 0; q < 8; q++) gr.add(s.X - rnd(2, 8), s.y - rnd(0, 2), -rnd(0, 40), -rnd(10, 40), rnd(.2, .45), '#ffffff', 1);
            } else if (Math.random() < dt * 22) gr.add(s.X - rnd(8, 13), s.y - rnd(0, 1), -rnd(4, 26), -rnd(2, 12), rnd(.2, .4), Math.random() < .5 ? '#ffffff' : '#d6e4f0', 1);
          }
        }
        gr.maj(dt, 170);
        for (let k = l.length - 1; k >= 0; k--) if (l[k].X - d * f > G.VW + 50) { if (l[k] === lie) { lie = null; if (su) { su.x = -9999; su.fin = true; } } l.splice(k, 1); }
        if (su && lie) { su.x = lie.X - d * f; su.y = lie.y + (G.Jeu.w().camY * .26 - G.Jeu.w().camY); }
      },
      draw(x, d, camY, T) {
        // les fanions de chaque tremplin, dans le vent
        const off = d * f, n = Math.floor(off / L_PARC);
        for (const c of [n, n + 1]) for (const t of TREMPLINS) {
          const X = c * L_PARC + t, sx = X - off;
          if (sx < -8 || sx > G.VW + 8) continue;
          const y = sol(sc, i, X - 1) + camY, b = Math.sin(T * 9 + X) > 0 ? 1 : 0;
          V.R(x, '#3a3c48', sx - .6, y - 15, 1, 15);
          V.R(x, '#e8452c', sx + .4, y - 15, 5, 2); V.R(x, '#e8452c', sx + .4, y - 13, 3 + b, 1);
          V.R(x, '#3a3c48', sx - 16, y + 5.5, 1, 11); V.R(x, '#ffd23c', sx - 15, y + 5.5, 4, 2);
        }
        gr.draw(x, d, f, camY);
        for (const s of l) {
          const sx = s.X - off;
          if (sx < -30 || sx > G.VW + 30) continue;
          if (s.air) {
            const k = s.T / s.tf;
            const fr = k < .1 ? 2 : k > .86 ? 2 : s.grab ? 3 : 2;
            pose(x, F[s.c][fr], sx, s.y + camY - 8, s.rot, false, .5, .62);
          } else pose(x, F[s.c][s.fige > 0 ? 4 : 0], sx, s.y + camY + 2.6, s.rot, false, .5, .88);
        }
      },
    };
  };
  /* La piste de vitesse au fond : une position de recherche de vitesse, un trait dans la pente */
  const PISTES_KL = [[330, 730, 40], [1520, 1900, 26]];
  FX.ski_vitesse = sc => {
    const i = V.plan(sc, 'peint', 1), p = sc.plans[i], f = f_(sc, i), l = [], gr = grains(60);
    const fr = feuille('ski_oeuf', 25, 14, 2, (x, kk, k) => {
      ligne(x, '#20222c', 1, 12.5, 24, 12.5, 1.2);
      ligne(x, '#e8452c', 6, 10, 14, 10, 3); ligne(x, '#23242e', 6, 11, 11, 11, 2);
      ell(x, '#e8452c', 14, 7, 6, 3, -.12);
      ligne(x, '#ffffff', 10, 6, 15, 5.5, 1);
      ell(x, '#ffd23c', 20, 5.5, 3.6, 2.8 + k * .1);
      rect(x, '#101018', 21.4, 5, 2, 1.2);
      ligne(x, '#3a3c48', 9, 9, 3, 6, 1);
    }, '#1a1a26');
    let attente = rnd(.5, 3);
    return {
      plan: i,
      maj(dt, d) {
        attente -= dt;
        if (attente <= 0 && l.length < 2) {
          attente = rnd(2.5, 6);
          const off = d * f, per = p.nw / S, n = Math.floor(off / per);
          const vis = [];
          for (const c of [n, n + 1]) for (const q of PISTES_KL) { const a = (c * per * S + q[0]) / S - off, b = (c * per * S + q[1]) / S - off; if (b > 60 && a < G.VW - 50) vis.push([a + off, b + off, q]); }
          if (vis.length) { const [a, b, q] = pick(vis); const pt = (p.nh - 12 - q[2]) / (q[1] - q[0]) * .92; l.push({ X: a, Xf: b, Y0: p.y + q[2] / S - 1, A: a, pt, v: rnd(165, 205) }); }
        }
        for (const s of l) {
          s.X += s.v * dt; s.Y = s.Y0 + (s.X - s.A) * s.pt;
          if (Math.random() < dt * 70) gr.add(s.X - 6, s.Y - rnd(0, 3), -s.v * rnd(.05, .2), -rnd(2, 10), rnd(.3, .7), Math.random() < .5 ? '#ffffff' : '#a8c0dc', 1);
        }
        gr.maj(dt, 20);
        for (let k = l.length - 1; k >= 0; k--) if (l[k].X > l[k].Xf) l.splice(k, 1);
      },
      draw(x, d, camY, T) {
        gr.draw(x, d, f, camY);
        for (const s of l) pose(x, fr[0], s.X - d * f, s.Y + camY, Math.atan(s.pt), false, .5, .92);
      },
    };
  };

  /* ==== LA GRANDE ODYSSEE : les mushers et leurs attelages ==== */
  const COUL_CHIEN = [['#8e98aa', '#3e4656', '#f0f2f6'], ['#6e6660', '#2e2a28', '#e8e4dc'], ['#b07a3c', '#5a3c20', '#f0e0c0'], ['#3a3e4c', '#17181f', '#d8dce4']];
  const chienFeuille = n => {
    const [dessus, dos, ventre] = COUL_CHIEN[n];
    return feuille('chien' + n, 21, 15, 6, (x, k) => {
      const a = k * TAU, by = Math.sin(a * 2) * .6, G_ = 13;
      const patte = (rx, ph, c) => { const q = a + ph, px = rx + Math.sin(q) * 3.6, py = G_ - Math.max(0, Math.cos(q)) * 2.6; ligne(x, c, rx, 7.5 + by, px, py, 1.4); };
      patte(5.5, 2.6, dos); patte(14, .4, dos);
      ell(x, dessus, 9.6, 6.5 + by, 5.6, 2.7);
      ell(x, dos, 9, 5.2 + by, 5, 1.3);
      ell(x, ventre, 10, 8 + by, 4, 1.2);
      patte(4.5, 3.2, dessus); patte(13, 0, dessus);
      ligne(x, dos, 4.5, 5.6 + by, 2, 3.2 + by + Math.sin(a) * .5, 2);
      disc(x, '#f4f6fa', 1.8, 3 + by + Math.sin(a) * .5, .8);
      ell(x, dessus, 16.4, 4.2 + by * 1.2, 2.6, 2.1);
      rect(x, ventre, 17.6, 4.6 + by * 1.2, 2.2, 1.2);
      rect(x, K, 19.2, 4.4 + by * 1.2, 1, 1); rect(x, K, 17, 3.4 + by * 1.2, 1, 1);
      poly(x, dos, 14.6, 2.8 + by, 15.6, .8 + by, 16.4, 2.8 + by);
      rect(x, '#e8452c', 13, 5.5 + by * 1.1, 1.6, 2.6);
    }, '#1c2030');
  };
  const COUL_MUSHER = ['#e8452c', '#2c6ae8', '#f0b020', '#20a070'];
  const traineauFeuille = n => feuille('traineau' + n, 34, 30, 6, (x, kk, k) => {
    const pk = Math.sin(k / 6 * TAU), parka = COUL_MUSHER[n], sal = k >= 4;
    // les patins, le panier
    ligne(x, '#3a2a22', 2, 27.5, 28, 27.5, 1.6); ligne(x, '#3a2a22', 28, 27.5, 32, 24.5, 1.4);
    ligne(x, '#6a4a30', 11, 26, 11, 20, 1.4); ligne(x, '#6a4a30', 24, 26, 24, 20, 1.4);
    poly(x, '#8a6238', 10, 22, 28, 22, 31, 18, 25, 18.5, 11, 18.5);
    rect(x, '#2a5a8a', 12, 16, 12, 3); rect(x, '#1c3e60', 12, 18, 12, 1);
    ligne(x, '#6a4a30', 9, 11, 10, 25, 1.4);
    // le musher debout sur les patins, penche sur son guidon
    jambe(x, '#23242e', 6, 16, 5, 26.5, 1.2, 3, 2.4);
    ligne(x, parka, 6, 15.5 + pk * .3, 9.5, 8 + pk * .3, 5);
    rect(x, '#ffffff', 6.4, 9.6 + pk * .3, 3.4, 3.4);
    rect(x, K, 7.4, 10.4 + pk * .3, 1.4, 1.8);
    if (sal) { ligne(x, parka, 10, 8.5, 12.5, 3.5, 2); disc(x, '#e8b896', 13, 2.8, 1.2); }
    else ligne(x, parka, 9.5, 9 + pk * .3, 10.5, 12.5, 2);
    disc(x, '#e8b896', 11.2, 4.8 + pk * .3, 2.5);
    ell(x, '#4a5060', 10.6, 3.6 + pk * .3, 3, 2);
    rect(x, '#fff4c8', 13, 3.8 + pk * .3, 1.6, 1.3);
  }, '#1c2030');
  FX.mushers = (sc, arg) => {
    const i = V.plan(sc, 'peint', +(arg || 2)), f = f_(sc, i), l = [], gr = grains(90), PAS = 13;
    const CH = [0, 1, 2, 3].map(chienFeuille), TR = [0, 1, 2, 3].map(traineauFeuille);
    let attente = rnd(.3, 1.6), lie = null;
    const lance = (d, dx = 0, v = rnd(92, 112), rang = 0) => {
      const n = 2 * irnd(2, 4), X = -68 - dx + d * f;
      const o = { X, v, n, c: irnd(0, 3), t: irnd(0, 3), ph: rnd(1), rang, y: solDoux(sc, i, X), chiens: [] };
      for (let k = 0; k < n; k++) o.chiens.push({ c: k % 3 === 2 ? irnd(0, 3) : o.t, ph: rnd(1) });
      l.push(o);
      return o;
    };
    return {
      plan: i,
      maj(dt, d) {
        const W = G.Jeu.w(), dr = V.drone(), sombre = G.Lumiere.sombre(sc), su = sujetDe('vise_char');
        attente -= dt;
        if (su && !su.fin && (!lie || l.indexOf(lie) < 0)) lie = lance(d);
        if (attente <= 0 && l.length < 3) { lance(d); if (Math.random() < .55) lance(d, rnd(30, 90), rnd(100, 118), 1); attente = rnd(6, 12); }
        for (const o of l) {
          // la course : chacun relance a son tour
          o.X += (o.v + Math.sin(d * .01 + o.c * 2) * 7) * dt; o.ph += dt * 2.7;
          o.y = solDoux(sc, i, o.X) - o.rang * 1.2;
          o.sx = o.X - d * f;
          o.salue = dr && Math.abs(o.sx + 20 - dr.x) < 38 && dr.y > 60;
          if (Math.random() < dt * 30) gr.add(o.X + rnd(0, 18), o.y - rnd(0, 1), -rnd(6, 32), -rnd(4, 22), rnd(.25, .55), Math.random() < .6 ? '#ffffff' : '#c8d8e8', 1);
          if (sombre && W) G.FX.lueur(W, o.sx + 14, o.y - 12, 22, '#fff0c0', .2);
        }
        gr.maj(dt, 80);
        for (let k = l.length - 1; k >= 0; k--) if (l[k].X - d * f > G.VW + 70) { if (l[k] === lie) { lie = null; if (su) { su.x = -9999; su.fin = true; } } l.splice(k, 1); }
        if (su && lie) { su.x = lie.sx + 22; su.y = lie.y + 1; }
      },
      draw(x, d, camY, T) {
        const sombre = G.Lumiere.sombre(sc);
        gr.draw(x, d, f, camY);
        for (const o of l) {
          const sx = o.X - d * f;
          if (sx < -130 || sx > G.VW + 60) continue;
          const pr = Math.ceil(o.n / 2), XT = o.X + 11;
          // la ligne de trait, sous les chiens
          let pre = null;
          for (let k = 0; k <= pr; k++) {
            const Xk = XT + k * PAS, yk = sol(sc, i, Xk) - 4 - o.rang * 1.2;
            if (pre) { V.R(x, '#20222e', pre[0] - d * f, Math.min(pre[1], yk) + camY, PAS, .7); }
            pre = [Xk, yk];
          }
          for (let k = o.n - 1; k >= 0; k--) {
            const rg = k >> 1, loin = k & 1, Xc = XT + (rg + .5) * PAS + (loin ? 3.4 : 0), y = solDoux(sc, i, Xc) + (loin ? -2.6 : .6) - o.rang * 1.2, ch = o.chiens[k], im = CH[ch.c][((o.ph * 3.2 + ch.ph) * 6 | 0) % 6];
            pose(x, im, Xc - d * f, y + camY + .6);
          }
          const fr = o.salue ? 4 + ((T * 6 | 0) & 1) : (o.ph * 2 * 4 | 0) % 4;
          pose(x, TR[o.c][fr], sx, o.y + camY + .8, pente(sc, i, o.X) * .8);
          if (sombre) {
            // la lampe frontale
            const hx = sx - 3, hy = o.y + camY - 14.5, po = x.globalCompositeOperation;
            x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,240,190,.22)'; x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx + 62, hy + 3); x.lineTo(hx + 62, hy + 17); x.closePath(); x.fill();
            x.fillStyle = 'rgba(255,240,190,.2)'; x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx + 34, hy + 6); x.lineTo(hx + 34, hy + 13); x.closePath(); x.fill();
            x.globalCompositeOperation = po;
            V.R(x, '#fffbe0', hx - .6, hy - .6, 1.4, 1.4);
          }
        }
      },
    };
  };

  /* Le Pere Noel : une fois de temps en temps, et seulement ici. Le compte a rebours ne compte que le temps passe dans ce decor. */
  V.noelDans = rnd(120, 240);
  const renneFeuille = () => feuille('renne', 25, 22, 6, (x, kk, k) => {
    const a = k / 6 * TAU, by = Math.sin(a) * 1;
    const patte = (rx, ph, c) => { const q = a + ph, b = rx + Math.sin(q) * 4, e = 17 + by - Math.max(0, Math.cos(q)) * 3; ligne(x, c, rx, 12 + by, b, e, 1.5); };
    patte(6, 3, '#4a3020'); patte(16, .6, '#4a3020');
    ell(x, '#8a5a34', 11, 10.5 + by, 7.5, 3.4);
    ell(x, '#e8d8b8', 11.5, 12.6 + by, 5, 1.2);
    patte(5, 3.6, '#7a4c2c'); patte(15, 0, '#7a4c2c');
    ligne(x, '#8a5a34', 16.5, 9 + by, 19.5, 5.5 + by, 3);
    ell(x, '#8a5a34', 21, 5.5 + by, 2.8, 1.9);
    disc(x, '#ff2a20', 23.5, 5.6 + by, .9);
    ligne(x, '#c8a878', 19.5, 4.5 + by, 18, 1 + by, 1); ligne(x, '#c8a878', 18.8, 2.8 + by, 16.5, 2 + by, 1); ligne(x, '#c8a878', 18.2, 1.4 + by, 20, .4 + by, 1);
    rect(x, '#e8452c', 14, 9 + by, 1.4, 4);
  }, '#2a1c1c');
  const luge = () => feuille('luge_noel', 40, 28, 2, (x, kk, k) => {
    ligne(x, '#ffd23c', 2, 25, 33, 25, 1.4); ligne(x, '#ffd23c', 33, 25, 38, 20, 1.4); ligne(x, '#ffd23c', 8, 25, 8, 21, 1.2); ligne(x, '#ffd23c', 28, 25, 28, 21, 1.2);
    poly(x, '#c8201c', 3, 13, 5, 22, 31, 22, 35, 15, 30, 16, 12, 16, 8, 11);
    rect(x, '#ffd23c', 5, 19.6, 26, 1);
    ell(x, '#7a5a3a', 8, 9, 6.4, 6.4); ligne(x, '#5a4228', 5, 3.6, 8, 5, 1);
    ligne(x, '#d8281c', 18, 15, 20, 7, 7);
    ell(x, '#ffffff', 21, 11, 2.4, 3.6);
    if (k) { ligne(x, '#d8281c', 22, 8, 26, 3, 2); disc(x, '#f4e4d0', 26.6, 2.2, 1.2); } else ligne(x, '#d8281c', 22, 9, 27, 11, 2);
    disc(x, '#f0c8a0', 21.2, 4.8, 2.6);
    ell(x, '#ffffff', 22, 7, 3, 1.8);
    poly(x, '#d8281c', 18, 4.4, 24, 3.4, 18, .2, 14.6, 3);
    disc(x, '#ffffff', 14.4, 3, 1.1); rect(x, '#ffffff', 18, 3.6, 6.4, 1.3);
  }, '#2a1c1c');
  FX.noel = sc => {
    const gr = grains(70);
    let o = null;
    const REN = renneFeuille(), LU = luge();
    return {
      plan: Math.min(1, sc.plans.length - 1),
      maj(dt, d) {
        V.noelDans -= dt;
        if (V.noelDans <= 0 && !o) { V.noelDans = rnd(120, 240); o = { x: G.VW + 110, y: rnd(26, 46), v: rnd(68, 84), T: 0, parle: rnd(1.5, 3) }; }
        if (!o) return;
        o.x -= o.v * dt; o.T += dt;
        if (Math.random() < dt * 28) gr.add(o.x + 22 + d * .018, o.y + rnd(-8, 4), rnd(6, 26), rnd(4, 18), rnd(.5, 1.2), pick(['#ffe88a', '#ffffff', '#ffc84a']), 1);
        if (o.x < -110) o = null;
        gr.maj(dt, 10);
      },
      draw(x, d, camY, T) {
        gr.draw(x, d, .018, 0);
        if (!o) return;
        const y = o.y + Math.sin(o.T * 1.3) * 4;
        // deux paires de rennes devant le traineau, le harnais, tout tangue un peu
        for (let k = 0; k < 4; k++) {
          const rg = k >> 1, X = o.x - 26 - rg * 15 + (k & 1 ? 2 : 0), Y = y - 5 - rg * 1.5 + Math.sin(o.T * 3 + rg) * 1 + (k & 1 ? -2 : 0);
          pose(x, REN[((T * 11 + rg * 2 + (k & 1)) | 0) % 6], X, Y, 0, true, .5, .5);
          if (k === 0 || k === 2) V.R(x, '#6a3a20', X + 6, Y + 1, 10, .7);
        }
        pose(x, LU[(T * 4 | 0) & 1], o.x, y + 3, 0, true, .5, .8);
        if (o.T > o.parle && o.T < o.parle + 2.2 && o.x > 30 && o.x < G.VW - 20) G.Lumiere.bulle(x, 'Oh oh oh !', o.x, y - 14);
      },
    };
  };

  /* ==== CHEVAUX : Camargue et chars du Puy du Fou ==== */
  const ROBES = { blanc: ['#f0ece0', '#b8b4aa', '#d8d4c8', '#3a3430'], gris: ['#c8c8cc', '#8a8a92', '#e0e0e4', '#3a3a40'], bai: ['#9a5a30', '#6a3a20', '#231a18', '#231a18'], noir: ['#3a3640', '#23202a', '#17151f', '#17151f'], alezan: ['#c0783c', '#8a5228', '#e0a860', '#3a2418'] };
  // au galop : 8 images, chaque jambe a sa phase, le corps et l'encolure basculent
  const chevalFeuille = (robe, e = 1, n = 8) => {
    const [cp, om, cr, sb] = ROBES[robe];
    return feuille('cheval' + robe + e, 43 * e + 2, 33 * e + 2, n, (x, k) => {
      const a = k * TAU, bo = Math.sin(a) * .9 * e, sol_ = 32 * e, P_ = (...v) => v.map((q, i) => q * e + (i % 2 ? bo : 0));
      const pat = (rx, ry, ph, c, av) => {
        const q = a + ph * TAU, px = rx + Math.sin(q) * 8 * e, lift = Math.max(0, Math.cos(q)) * 5.2 * e, py = sol_ - lift;
        jambe(x, c, rx, ry + bo, px, py, (av ? -1 : 1) * (1.2 * e + lift * .34), Math.max(1.4, 3 * e), Math.max(1, 1.5 * e));
        rect(x, sb, px - 1.2 * e, py - 1.2 * e, 2.6 * e, 1.4 * e);
      };
      pat(10 * e, 19 * e, .12, om, false); pat(28 * e, 19 * e, .62, om, true);
      // la queue, qui flotte derriere lui
      x.strokeStyle = cr; x.lineCap = 'round'; x.lineWidth = Math.max(1.5, 2.8 * e); x.beginPath(); x.moveTo(6.4 * e, 13 * e + bo); x.quadraticCurveTo(1.5 * e, 12.5 * e + bo, .8 * e, (19 + Math.sin(a + 1) * 2) * e + bo); x.stroke();
      // le corps : l'epaule, le dos creuse, la croupe ronde
      poly(x, cp, ...P_(7, 12, 12, 10.5, 20, 11.8, 27, 10.4, 31, 14, 30.4, 20, 22, 21.4, 13, 21, 7, 18.6, 5.6, 15));
      ell(x, om, 18 * e, 20.2 * e + bo, 10 * e, 1.5 * e);
      // l'encolure arquee et la tete longue
      const no = Math.sin(a + .6) * 1.2 * e, Ne = (...v) => v.map((q, i) => (i % 2 ? q * e + bo + no * (v[i] < 10 ? 1 : .4) : q * e));
      poly(x, cp, ...Ne(26, 11, 30, 5.2, 33.6, 2.6, 35.6, 8.6, 31.8, 13, 31, 18));
      poly(x, cp, ...Ne(33, 2.2, 36, 3, 41, 8.6, 40.4, 11, 37.8, 11, 34.6, 8.6));
      poly(x, om, ...Ne(39, 9.6, 41, 8.6, 40.4, 11, 37.8, 11));
      poly(x, cp, ...Ne(33.4, 2.8, 33.8, 0, 35.4, 2.8));
      rect(x, sb, 36.2 * e, 5 * e + bo + no, Math.max(1, 1 * e), Math.max(1, 1 * e));
      // la criniere au vent
      x.strokeStyle = cr; x.lineWidth = Math.max(1.2, 1.8 * e); x.beginPath(); x.moveTo(33.4 * e, 2.4 * e + bo + no); x.quadraticCurveTo(29 * e, (3.6 + Math.sin(a * 2) * .6) * e + bo, 25.4 * e, 10.4 * e + bo); x.stroke();
      pat(8 * e, 20 * e, 0, cp, false); pat(26 * e, 20 * e, .5, cp, true);
    });
  };

  /* La manade : une petite troupe de chevaux blancs qui suit le terrain, a sa taille, au trot ou au galop */
  FX.chevaux = (sc, arg) => {
    const i = V.plan(sc, 'col', +(arg || 0)), f = f_(sc, i), l = [], gr = grains(40);
    const ad = chevalFeuille('blanc', .9), pou = chevalFeuille('gris', .6), bru = chevalFeuille('noir', .56);
    let attente = rnd(.2, 2.5);
    return {
      plan: i,
      maj(dt, d) {
        attente -= dt;
        if (attente <= 0 && l.length < 8 && !sc.courseVue && !sc.courseVeut) {
          attente = rnd(7, 15);
          const n = irnd(3, 6), v = rnd(78, 100), x0 = -30 + d * f;
          for (let k = 0; k < n; k++) l.push({ X: x0 - k * rnd(13, 24), v: v * rnd(.97, 1.03), p: k && Math.random() < .3 ? (Math.random() < .5 ? pou : bru) : ad, ph: rnd(1), dy: rnd(-.5, 2) });
        }
        for (const c of l) {
          c.X += c.v * dt; c.ph += dt * c.v / 46;
          if (Math.random() < dt * 8) gr.add(c.X - 8, sol(sc, i, c.X), -rnd(4, 18), -rnd(3, 14), rnd(.25, .5), '#e0d4b0', 1);
        }
        gr.maj(dt, 30);
        for (let k = l.length - 1; k >= 0; k--) if (l[k].X - d * f > G.VW + 40) l.splice(k, 1);
        sc.chevauxVus = l.length > 0;
      },
      draw(x, d, camY) {
        gr.draw(x, d, f, camY);
        for (const c of l) {
          const sx = c.X - d * f;
          if (sx < -24 || sx > G.VW + 24) continue;
          pose(x, c.p[(c.ph * 8 | 0) % 8], sx, solDoux(sc, i, c.X) + camY + c.dy, pente(sc, i, c.X) * .7);
        }
      },
    };
  };

  /* ==== CAMARGUE : la course de drones FPV ====
     Un parcours plante dans le sable (portiques gonflables, anneaux lumineux, fanions de slalom, le stand des pilotes) arrive avec le defilement, puis repart.
     Tant qu'il est a l'ecran, des vagues de 4 a 6 drones le traversent a toute vitesse. Certains ratent : ils touchent, partent en vrille, se plantent dans le sable. */
  const COUL_FPV = ['#ff3b30', '#ffd21e', '#25c4ff', '#ff4fc0', '#42e05a', '#ff8a1e'];
  const fpvFeuille = n => feuille('fpv' + n, 36, 20, 4, (x, kk, k) => {
    const c = COUL_FPV[n], o = G.rgb(G.mix(G.hex(c), [20, 18, 40], .5));
    // de fins bras en carbone, deux moteurs dresses, une petite coque, la camera a l'avant, l'antenne a l'arriere : un quadri, pas un jouet a roues
    ligne(x, '#17151f', 6, 11, 14, 13, 1.4); ligne(x, '#17151f', 30, 11, 22, 13, 1.4);
    rect(x, '#17151f', 5, 7, 2, 4); rect(x, '#17151f', 29, 7, 2, 4); rect(x, c, 5, 9, 2, 1); rect(x, c, 29, 9, 2, 1);
    poly(x, '#17151f', 12, 15, 11, 10, 14, 7, 22, 7, 25, 11, 24, 15);
    poly(x, c, 13, 14, 12.4, 10.4, 14.6, 8, 21.6, 8, 23.6, 11, 23, 14);
    rect(x, o, 13, 12.4, 10, 1.6); rect(x, '#ffffff', 15, 9, 4, 1);
    poly(x, '#17151f', 23, 8, 27, 7, 28, 10.4, 24, 11.4); rect(x, '#8fe0ff', 26, 8.2, 1.4, 1.6);
    ligne(x, '#17151f', 14, 8, 10, 2.6, 1); rect(x, c, 9, 1.4, 2, 2);
    rect(x, c, 15, 15, 6, 1);
  }, null, (x, kk, k) => {
    // les helices : deux grands disques vus de chant, flous, qui scintillent
    const cote = (cx, l, a) => { x.fillStyle = `rgba(36,40,56,${a})`; x.fillRect(cx - l, 6, l * 2, 1); x.fillStyle = `rgba(255,255,255,${a})`; x.fillRect(cx - l + 2, 5, l * 2 - 4, 1); };
    cote(6, [6, 4, 5, 3][k], [.9, .55, .75, .45][k]); cote(30, [3, 6, 4, 5][k], [.5, .9, .55, .75][k]);
  });
  // un portique gonflable : deux moities, celle du fond passe derriere le drone, celle de devant passe devant. Vu de trois quarts.
  const COUL_PORT = [['#ff6a1e', '#fff4e0'], ['#2a7cff', '#ffe23c'], ['#e8308a', '#ffffff'], ['#17151f', '#ffffff']];
  const porteFeuille = (n, devant) => feuille('porte' + n + devant, 41, 47, 1, x => {
    const [a, b] = COUL_PORT[n], cx = 20.5, cy = 45, rx = 15, ry = 41;
    const arc = (c, e, dash) => { x.strokeStyle = c; x.lineWidth = e; x.lineCap = 'butt'; x.setLineDash(dash || []); x.beginPath(); if (devant) x.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, 0); else x.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 1.5); x.stroke(); x.setLineDash([]); };
    arc(devant ? a : G.rgb(G.mix(G.hex(a), [20, 18, 40], .32), 1), 6.5);
    arc(devant ? b : G.rgb(G.mix(G.hex(b), [20, 18, 40], .32), 1), 6.5, [7, 7]);
    if (devant) { x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(cx, cy, rx - 1.6, ry - 1.6, 0, -Math.PI / 2 + .1, -.1); x.stroke(); }
    const bx = devant ? cx + rx - 3.5 : cx - rx - 3.5;
    rect(x, '#3a3c48', bx, 43.5, 7, 3);
  });
  // un anneau lumineux sur son mat : la lumiere pulse
  const anneauFeuille = (n, devant) => feuille('anneau' + n + devant, 21, 40, 3, (x, kk, k) => {
    const c = ['#22e0ff', '#ff3fd0', '#b4ff3c'][n], cx = 10.5, cy = 15, rx = 6, ry = 12.5, m = [1, .72, .5][k];
    const arc = (cl, e) => { x.strokeStyle = cl; x.lineWidth = e; x.beginPath(); if (devant) x.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, Math.PI / 2); else x.ellipse(cx, cy, rx, ry, 0, Math.PI / 2, Math.PI * 1.5); x.stroke(); };
    if (!devant) { ligne(x, '#30323e', cx - .4, cy + ry, cx - .4, 39, 2); rect(x, '#30323e', cx - 4, 37.5, 7.5, 2); }
    arc('#22242e', 4);
    arc(G.rgb(G.mix(G.hex(c), [40, 40, 60], devant ? 1 - m : (1 - m) + .22), 1), 2.4);
    arc(G.rgb(G.mix(G.hex(c), [255, 255, 255], .7 * m), 1), 1);
  }, '#17151f');
  const fanionFeuille = n => feuille('fanion' + n, 15, 36, 4, (x, kk) => {
    const a = kk * TAU, c = COUL_PORT[n][0];
    ligne(x, '#3a3c48', 3, 35, 3, 3, 1.4);
    x.fillStyle = c; x.beginPath(); x.moveTo(3, 2); x.quadraticCurveTo(10 + Math.sin(a) * 1.4, 3, 12 + Math.sin(a) * 1.4, 10 + Math.cos(a)); x.quadraticCurveTo(8 + Math.sin(a + 1), 18, 3, 22); x.closePath(); x.fill();
    x.fillStyle = COUL_PORT[n][1]; x.beginPath(); x.moveTo(3, 8); x.quadraticCurveTo(7, 9, 9 + Math.sin(a) * 1.4, 12); x.quadraticCurveTo(6, 15, 3, 16); x.closePath(); x.fill();
  });
  // le stand : une tente, une table, les pilotes en lunettes, l'un d'eux s'agite
  const standFeuille = () => feuille('stand_fpv', 58, 36, 2, (x, kk, k) => {
    ligne(x, '#3a3c48', 4, 12, 4, 35, 1.4); ligne(x, '#3a3c48', 44, 12, 44, 35, 1.4);
    poly(x, '#e8452c', 1, 12, 8, 3, 40, 3, 47, 12);
    for (let i = 0; i < 4; i++) poly(x, '#fff4e0', 5 + i * 10.5 + 1, 12, 10 + i * 8.4, 3, 14 + i * 8.4, 3, 10 + i * 10.5 + 1.6, 12);
    rect(x, '#b03020', 1, 12, 46, 2);
    rect(x, '#6a4a30', 8, 27, 18, 2); ligne(x, '#6a4a30', 10, 29, 10, 35, 1); ligne(x, '#6a4a30', 24, 29, 24, 35, 1);
    rect(x, '#20222c', 13, 24, 6, 3); ligne(x, '#20222c', 15, 24, 18, 18, 1);
    const pil = (cx, chemise, peau, bras) => {
      ligne(x, '#23242e', cx - 1.2, 28, cx - 1.6, 35, 1.8); ligne(x, '#23242e', cx + 1.2, 28, cx + 1.6, 35, 1.8);
      ligne(x, chemise, cx, 21, cx, 28, 4.4);
      if (bras) { ligne(x, chemise, cx + 1.6, 21, cx + 5, 15, 1.6); ligne(x, chemise, cx - 1.6, 21, cx - 5, 15, 1.6); }
      else { ligne(x, chemise, cx + 1.6, 22, cx + 4, 25, 1.6); rect(x, '#17151f', cx + 3, 24, 3, 2); }
      disc(x, peau, cx, 17.4, 2.5); rect(x, '#17151f', cx - 2.4, 16.2, 5, 2);
    };
    pil(34, '#2c6ae8', '#e8b896', false); pil(40, '#f0b020', '#8a5a3a', k === 1); pil(52, '#40b85a', '#e8c8a0', k === 0);
  });
  FX.course_drones = (sc, arg) => {
    const i = V.plan(sc, 'col', +(arg || 0)), f = f_(sc, i), l = [], gr = grains(150), plantes = [];
    const FP = [0, 1, 2, 3, 4, 5].map(fpvFeuille), ST = standFeuille();
    const PO = [0, 1, 2, 3].map(n => [porteFeuille(n, 0)[0], porteFeuille(n, 1)[0]]), AN = [0, 1, 2].map(n => [anneauFeuille(n, 0), anneauFeuille(n, 1)]), FA = [0, 1, 2].map(fanionFeuille);
    let zones = [], attente = rnd(2, 7), repos = rnd(1, 2.5);
    const creeZone = X0 => {
      const n = irnd(4, 5), g = []; let X = X0;
      for (let k = 0; k < n; k++) {
        const anneau = k && k < n - 1 && Math.random() < .5, fin = k === n - 1;
        const yr = anneau ? 15 : rnd(9, 13);
        g.push({ X, anneau, c: fin ? 3 : irnd(0, anneau ? 2 : 2), yr, wob: 0, fl: 0, h: rnd(-1, 1) });
        X += rnd(100, 135);
      }
      const py = [];
      for (let k = 0; k < n - 1; k++) if (Math.random() < .65) py.push({ X: (g[k].X + g[k + 1].X) / 2 + rnd(-8, 8), c: irnd(0, 2), ph: rnd(1), s: k });
      zones.push({ g, py, A: X0, B: g[n - 1].X, st: X0 + rnd(30, 90), qui: {} });
    };
    // l'altitude de la trajectoire : elle passe au centre de chaque portique, plonge ou remonte entre deux
    const seg = (z, X) => { const g = z.g; for (let k = 0; k < g.length - 1; k++) if (X < g[k + 1].X) return k; return g.length - 1; };
    const haut = (z, X) => {
      const g = z.g, n = g.length;
      if (X <= g[0].X) { const k = G.clamp((g[0].X - X) / 90, 0, 1); return G.lerp(g[0].yr, 22, k * k); }
      if (X >= g[n - 1].X) { const k = G.clamp((X - g[n - 1].X) / 90, 0, 1); return G.lerp(g[n - 1].yr, 30, k); }
      const s = seg(z, X), a = g[s], b = g[s + 1], t_ = (X - a.X) / (b.X - a.X), u = t_ * t_ * (3 - 2 * t_), bosse = Math.sin(t_ * Math.PI);
      return G.lerp(a.yr, b.yr, u) + a.h * bosse * (a.h > 0 ? 18 : 6);
    };
    const profond = (z, X) => {
      const g = z.g, n = g.length;
      if (X <= g[0].X || X >= g[n - 1].X) return 0;
      const s = seg(z, X), t_ = (X - g[s].X) / (g[s + 1].X - g[s].X);
      return (s % 2 ? 1 : -1) * Math.sin(t_ * Math.PI);
    };
    const zoneDe = X => zones.find(z => X < z.B + 120) || zones[zones.length - 1];
    const trajY = (o, X) => {
      const z = o.z, dist = Math.min(...z.g.map(q => Math.abs(q.X - X)));
      return solDoux(sc, i, X) - haut(z, X) + o.oy * G.clamp(dist / 34, 0, 1);
    };
    const nuage = (X, y, n, c1, c2) => { for (let q = 0; q < n; q++) gr.add(X + rnd(-5, 5), y - rnd(0, 3), rnd(-20, 16), -rnd(4, 26), rnd(.5, 1.2), q % 2 ? c1 : c2, q % 3 ? 2 : 3); };
    const lanceVague = (z, d) => {
      const n = irnd(4, 6), x0 = d * f - 24, base = rnd(205, 240), cols = G.shuffle([0, 1, 2, 3, 4, 5]);
      const rate = Math.random() < .55 ? irnd(0, n - 1) : -1;
      for (let k = 0; k < n; k++) {
        const X = x0 - k * rnd(24, 46);
        const o = { z, X, y: 0, v: base * rnd(.9, 1.1), ph: rnd(6), fq: rnd(1.2, 2.4), c: cols[k], oy: rnd(-9, 9), st: 'vol', rot: 0, vy: 0, tour: 0, rate: k === rate ? irnd(1, z.g.length - 2) : -1, passe: 0 };
        o.y = trajY(o, X);
        l.push(o);
      }
    };
    return {
      plan: i, l,
      maj(dt, d) {
        const off = d * f;
        attente -= dt;
        if (attente <= 0 && !zones.length && !sc.chevauxVus) creeZone(off + G.VW + 50);
        sc.courseVeut = attente <= 0;
        for (let k = zones.length - 1; k >= 0; k--) if (zones[k].B - off < -40) { zones.splice(k, 1); attente = rnd(12, 22); }
        const z = zones[0];
        sc.courseVue = !!z && z.A - off < G.VW + 30;
        if (z) {
          const nv = z.g.filter(q => q.X - off > 0 && q.X - off < G.VW + 20).length;
          repos -= dt;
          if (repos <= 0 && nv >= 2 && z.B - off > 90) { lanceVague(z, d); repos = rnd(4, 6.5); }
          for (const q of z.g) { q.wob = Math.max(0, q.wob - dt * 1.3); q.fl = Math.max(0, q.fl - dt * 4); }
          for (const q of z.py) q.ph += dt * 1.6;
        }
        for (const o of l) {
          const X0 = o.X;
          if (o.st === 'vol') {
            // ils relancent et s'effacent a tour de role : ca double
            o.X += o.v * (1 + .13 * Math.sin(o.ph + d * .012 * o.fq)) * dt;
            const yc = trajY(o, o.X);
            const dz = profond(o.z, o.X); o.dz = dz;
            const y1 = yc - dz * 3;
            const pt = Math.atan2(y1 - o.y, Math.max(1, o.X - X0));
            o.y = y1;
            // un drone FPV vole nez en avant ; il s'incline dans ses virages
            const cible = G.clamp(.2 + pt * .55 + Math.cos((o.X - o.z.A) * .028) * .07, -.45, .6);
            o.rot += (cible - o.rot) * Math.min(1, dt * 14);
            if (o.tour > 0) { o.tour -= dt * 2.6; }
            if (Math.random() < dt * 8) gr.add(o.X - 6, o.y + 2, -rnd(10, 30), rnd(-4, 8), rnd(.15, .3), '#fff8e0', 1);
            for (const [ng, q] of o.z.g.entries()) if (q.X > X0 && q.X <= o.X) {
              q.fl = 1; o.passe = ng;
              if (Math.random() < .2 && !o.tour) o.tour = 1;
              if (ng === o.rate && q.X - off > 30 && q.X - off < G.VW - 30) {
                // il accroche : le portique tremble, le drone part en vrille
                q.wob = 1; o.st = 'chute'; o.vy = -rnd(40, 70); o.vx = o.v * rnd(.28, .42); o.sp = rnd(10, 15);
                for (let c = 0; c < 8; c++) gr.add(o.X, o.y, rnd(-30, 50), rnd(-50, 10), rnd(.25, .5), pick(['#ffffff', COUL_FPV[o.c], '#20222c']), 1);
              }
            }
          } else if (o.st === 'chute') {
            o.X += o.vx * dt; o.vx *= 1 - dt * .3; o.vy += 240 * dt; o.y += o.vy * dt; o.rot += o.sp * dt; o.dz = 0;
            const yg = solDoux(sc, i, o.X);
            if (Math.random() < dt * 30) gr.add(o.X, o.y, rnd(-10, 6), rnd(-14, 2), rnd(.3, .6), '#6a6470', 1);
            if (o.y >= yg - 1) {
              // le nez dans le sable, un petit nuage
              o.st = 'plante'; o.y = yg + 1.5; o.rot = rnd(1.05, 1.3); o.T = 0; o.dire = o.z.st - off > 0 && o.z.st - off < G.VW;
              nuage(o.X, yg, 30, '#f0e4bc', '#b49c6c');
            }
          } else {
            o.T += dt;
            if (o.T < 3 && Math.random() < dt * 5) gr.add(o.X + rnd(-1, 1), o.y - 6, rnd(-3, 3), -rnd(6, 14), rnd(.5, 1), Math.random() < .5 ? '#8a8690' : '#b4b0b4', 1);
          }
        }
        gr.maj(dt, 26);
        for (let k = l.length - 1; k >= 0; k--) { const sx = l[k].X - off; if (l[k].st === 'plante' ? sx < -30 : sx > G.VW + 50) l.splice(k, 1); }
      },
      draw(x, d, camY, T) {
        const off = d * f, z = zones[0];
        const sprite = o => {
          const sx = o.X - off;
          if (sx < -30 || sx > G.VW + 30) return;
          // la trainee : un fil de lumiere qui suit exactement sa trajectoire
          if (o.st === 'vol') {
            const c = COUL_FPV[o.c];
            for (let q = 1; q < 8; q++) { const Xq = o.X - q * 7, yq = trajY(o, Xq) - profond(o.z, Xq) * 3; x.globalAlpha = .5 * (1 - q / 8); V.R(x, c, Xq - off, yq + camY + 1, 7, q < 3 ? 1.2 : .7); }
            x.globalAlpha = 1;
          }
          const fr = FP[o.c][o.st === 'plante' ? 0 : (T * 40 | 0) & 3];
          pose(x, fr, sx, o.y + camY, o.rot + (o.tour > 0 ? (1 - o.tour) * TAU : 0), false, .5, .55);
        };
        if (z) {
          const q = z.st - off;
          if (q > -60 && q < G.VW + 60) pose(x, ST[(T * 3 | 0) & 1], q, sol(sc, i, z.st) + camY + 1.5);
        }
        gr.draw(x, d, f, camY);
        for (const o of l) if (o.st === 'vol' && o.dz < -.2) sprite(o);
        if (z) {
          for (const q of z.py) { const X = q.X - off; if (X > -14 && X < G.VW + 14) pose(x, FA[q.c][(q.ph * 4 | 0) % 4], X + 3, sol(sc, i, q.X) + camY + 1); }
          for (const q of z.g) {
            const X = q.X - off;
            if (X < -24 || X > G.VW + 24) continue;
            const y = solDoux(sc, i, q.X) + camY + 1.2, r = q.wob ? Math.sin(q.wob * 26) * q.wob * .14 : 0;
            if (q.anneau) pose(x, AN[q.c][0][q.fl > .2 ? 0 : ((T * 5 + q.X) | 0) % 3], X, y, r);
            else pose(x, PO[q.c][0], X, y, r);
          }
        }
        for (const o of l) if (o.st !== 'vol' || o.dz >= -.2) sprite(o);
        if (z) for (const q of z.g) {
          const X = q.X - off;
          if (X < -24 || X > G.VW + 24) continue;
          const y = solDoux(sc, i, q.X) + camY + 1.2, r = q.wob ? Math.sin(q.wob * 26) * q.wob * .14 : 0;
          if (q.anneau) { pose(x, AN[q.c][1][q.fl > .2 ? 0 : ((T * 5 + q.X) | 0) % 3], X, y, r); if (q.fl > .2) { x.globalAlpha = q.fl * .5; V.R(x, '#ffffff', X - 4, y - 24 * .9, 8, 16); x.globalAlpha = 1; } }
          else pose(x, PO[q.c][1], X, y, r);
        }
        // les pilotes reagissent quand l'un d'eux se plante
        for (const o of l) if (o.st === 'plante' && o.T < 1.4 && o.dire && z) G.Lumiere.bulle(x, o.c & 1 ? 'Fada !' : 'Oh peuchère !', z.st - off + 6, sol(sc, i, z.st) + camY - 22, 0, z.qui);
      },
    };
  };

  /* ==== PUY DU FOU : la course de chars, sur le sable de l'arene, loin des gradins ==== */
  const CHARS = [['#c8281c', '#ffd23c', '#e8452c'], ['#2a58c0', '#f0e0a0', '#70c0ff'], ['#2a8a4a', '#ffd23c', '#a8e080'], ['#7a2ab0', '#ffd23c', '#e0a0ff']];
  const charFeuille = n => {
    const [caisse, or_, cape] = CHARS[n];
    return feuille('char' + n, 46, 46, 8, (x, kk, k) => {
      x.scale(1.25, 1.25);
      const a = k / 8 * TAU, fou = (k / 8 * 4) % 1 * 3.6, cy = 27, cx = 15;
      // la roue
      disc(x, '#3a2a22', cx, cy, 8); disc(x, '#a07a44', cx, cy, 7); disc(x, '#23202a', cx, cy, 5.8);
      for (let i = 0; i < 4; i++) { const b = a * .5 + i * Math.PI / 2; ligne(x, '#c89a58', cx - Math.cos(b) * 5.6, cy - Math.sin(b) * 5.6, cx + Math.cos(b) * 5.6, cy + Math.sin(b) * 5.6, 1.1); }
      disc(x, or_, cx, cy, 1.8);
      // le conducteur, sa cape qui claque, le fouet
      const b2 = Math.sin(a * 2) * .6;
      const cap = Math.sin(a * 2);
      poly(x, cape, 13, 8 + b2, 15, 16, 7 - cap, 18 + cap * 1.5, 4 + cap, 12 + cap);
      ligne(x, '#e8c8a0', 16, 25, 17, 19, 2.4);
      ligne(x, '#e8e0d0', 15.5, 19, 17.5, 10 + b2, 5);
      ligne(x, or_, 15, 16, 19, 16, 1);
      disc(x, '#e8b896', 19, 6.6 + b2, 2.8);
      ell(x, or_, 18.6, 5.2 + b2, 3.2, 2.2);
      ligne(x, cape, 15.6, 4.4 + b2, 21, 2.6 + b2, 1.6);
      ligne(x, '#e8b896', 18, 11 + b2, 28, 14, 1.6);
      const u = k < 4 ? k / 4 : (8 - k) / 4;
      ligne(x, '#e8b896', 17, 11 + b2, 13 - u * 2, 5.4 - u * 3, 1.5);
      ligne(x, '#2a1c14', 13 - u * 2, 5.4 - u * 3, 4 + u * 12, 1 + u * 1 , 1);
      // la caisse doree par-dessus la roue
      poly(x, caisse, 10, 28, 12, 15, 28, 15.5, 32, 21, 29, 28);
      rect(x, or_, 11.4, 15.4, 17, 1.4);
      poly(x, or_, 29, 16, 32.4, 21, 29.6, 28.2, 28, 28, 30, 21);
      rect(x, or_, 16, 21, 8, 1); disc(x, or_, 20, 24, 1.4);
      ligne(x, '#6a4628', 30, 25, 36, 26, 1.6);
    }, '#21171a');
  };
  FX.chars = (sc, arg) => {
    const i = V.plan(sc, 'pla', 0), f = f_(sc, i), l = [], gr = grains(110);
    const CH = [0, 1, 2, 3].map(charFeuille), HO = { bai: chevalFeuille('bai', .8), noir: chevalFeuille('noir', .8), blanc: chevalFeuille('blanc', .8), alezan: chevalFeuille('alezan', .8) };
    const nomsH = Object.keys(HO);
    let attente = rnd(.2, 1.2), lie = null, piste = 0;
    const lance = (d, x0, v) => {
      piste = (piste + 1) % 3;
      const o = { X: x0 + d * f, Y: 146 + piste * 7.5 + rnd(-1, 1), v: v || rnd(92, 118), c: irnd(0, 3), nh: Math.random() < .5 ? 3 : 2, hs: G.shuffle(nomsH.slice()), ph: rnd(1), rel: rnd(6) };
      l.push(o); l.sort((a, b) => a.Y - b.Y);
      return o;
    };
    return {
      plan: i,
      maj(dt, d) {
        attente -= dt;
        const su = sujetDe('vise_char');
        if (su && !su.fin && (!lie || l.indexOf(lie) < 0)) lie = lance(d, -60, 110);
        if (attente <= 0 && l.length < 5) {
          const n = Math.random() < .6 ? irnd(2, 3) : 1;
          for (let k = 0; k < n; k++) lance(d, -60 - k * rnd(36, 76));
          attente = rnd(5, 10);
        }
        for (const o of l) {
          // chacun pousse a son tour : ils se doublent
          o.rel -= dt;
          if (o.rel < 0) { o.rel = rnd(2, 4); o.vc = o.v + rnd(-14, 18); }
          o.X += (o.vc || o.v) * dt; o.ph += dt * 2.5;
          if (Math.random() < dt * 40) gr.add(o.X + rnd(-14, 4), o.Y - rnd(0, 2), -rnd(6, 36), -rnd(4, 24), rnd(.3, .7), Math.random() < .5 ? '#f0dcae' : '#d8bc88', Math.random() < .3 ? 2 : 1);
          if (Math.random() < dt * 30) gr.add(o.X + rnd(14, 56), o.Y - rnd(0, 1), -rnd(4, 20), -rnd(2, 10), rnd(.2, .4), '#f0dcae', 1);
        }
        gr.maj(dt, 34);
        for (let k = l.length - 1; k >= 0; k--) if (l[k].X - d * f > G.VW + 90) { if (l[k] === lie) { lie = null; if (su) { su.x = -9999; su.fin = true; } } l.splice(k, 1); }
        if (su && lie) { su.x = lie.X - d * f + 15; su.y = lie.Y + 4; }
      },
      draw(x, d, camY, T) {
        for (const o of l) {
          const sx = o.X - d * f, y = o.Y + camY;
          if (sx < -90 || sx > G.VW + 40) continue;
          const fr = (n, ph) => HO[o.hs[n]][((o.ph * 3.1 + ph) * 8 | 0) % 8];
          // l'attelage de front, en echelon : le plus loin d'abord, chacun bien visible, deux timons jusqu'au char
          if (o.nh === 3) { pose(x, fr(2, .5), sx + 42, y - 11); V.R(x, '#4a3020', sx + 13, y - 11, 18, .8); }
          pose(x, fr(1, .25), sx + 36, y - 5.6);
          V.R(x, '#4a3020', sx + 11, y - 7, 15, .8);
          pose(x, fr(0, 0), sx + 30, y);
          pose(x, CH[o.c][(o.ph * 8 | 0) % 8], sx, y + 3);
        }
        gr.draw(x, d, f, camY);
      },
    };
  };

  /* ==== LES FLAMANTS ==== */
  const fla = (cle, e, cerne, f) => feuille('fl' + cle + e, 24 * e + 2, 28 * e + 2, 8, f, cerne);
  const ROSE = ['#f49ab0', '#e0708c', '#ffd0d8'];
  // debout : il avance a pas lents, les jambes en echasses, le cou en S qui ondule
  const flamMarche = e => fla('m', e, '#7a3a50', (x, k) => {
    const a = k * TAU, sy = 28 * e, by = Math.sin(a * 2) * .3 * e;
    const pa = (rx, ph, c) => { const q = a + ph, px = rx + Math.sin(q) * 2.6 * e, py = sy - Math.max(0, Math.cos(q)) * 1.6 * e; jambe(x, c, rx, 16 * e + by, px, py, -.8 * e, Math.max(1, .9 * e), Math.max(1, .8 * e)); };
    pa(10 * e, 3.14, '#c86880');
    pa(10 * e, 0, '#e88aa0');
    ell(x, ROSE[0], 9.5 * e, 12.5 * e + by, 6.4 * e, 3.8 * e, -.1);
    ell(x, ROSE[1], 7 * e, 13.5 * e + by, 3.6 * e, 2 * e);
    rect(x, '#2a1a22', 3 * e, 12.5 * e + by, 2 * e, Math.max(1, 1.2 * e));
    const co = Math.sin(a) * .8 * e;
    x.strokeStyle = ROSE[2]; x.lineWidth = Math.max(1, 1.5 * e); x.lineCap = 'round'; x.beginPath(); x.moveTo(14 * e, 11 * e + by); x.bezierCurveTo(19 * e, 9 * e + by, 13.5 * e + co, 6 * e, 16 * e + co, 2.8 * e); x.stroke();
    ell(x, ROSE[2], 17 * e + co, 2.4 * e, 2 * e, 1.4 * e);
    ligne(x, '#2a1a22', 18.4 * e + co, 2.6 * e, 20 * e + co, 4.2 * e, Math.max(1, 1 * e));
  });
  // il fouille la vase, tete en bas
  const flamFouille = e => fla('f', e, '#7a3a50', (x, k) => {
    const a = k * TAU, sy = 28 * e;
    ligne(x, '#c86880', 8 * e, 15 * e, 7.4 * e, sy, Math.max(1, .8 * e)); ligne(x, '#e88aa0', 9.6 * e, 15 * e, 10 * e, sy, Math.max(1, .8 * e));
    ell(x, ROSE[0], 10 * e, 12.5 * e, 6.4 * e, 3.8 * e, .12);
    ell(x, ROSE[1], 7.4 * e, 12.5 * e, 3.6 * e, 2 * e);
    rect(x, '#2a1a22', 3.4 * e, 11.6 * e, 2 * e, Math.max(1, 1.2 * e));
    const b = Math.sin(a * 2) * .9 * e;
    x.strokeStyle = ROSE[2]; x.lineWidth = Math.max(1, 1.5 * e); x.lineCap = 'round'; x.beginPath(); x.moveTo(15 * e, 12 * e); x.bezierCurveTo(22 * e, 10 * e, 19 * e, 20 * e, 20 * e, 25 * e + b); x.stroke();
    ell(x, ROSE[2], 20 * e, 26 * e + b, 1.8 * e, 1.3 * e);
  });
  // en vol : cou et jambes tendus, grandes ailes roses a bout noir
  const flamVol = e => feuille('flv' + e, 46 * e + 2, 40 * e + 2, 8, (x, k) => {
    const a = k * TAU, cy = 20 * e, h = Math.sin(a), up = Math.cos(a) * 1.4 * e;
    const aile = (rx, c1, c2) => {
      const ty = cy - h * 17 * e, tx = rx - 9 * e, m = .62, ax = rx + 6 * e + (tx + 3 * e - rx - 6 * e) * m, ay = cy + (ty - cy) * m, bx = rx - 6 * e + (tx - 3 * e - rx + 6 * e) * m;
      poly(x, c1, rx + 6 * e, cy, rx - 6 * e, cy + 1 * e, bx, ay, ax, ay);
      poly(x, c2, ax, ay, bx, ay, tx - 3 * e, ty, tx + 3 * e, ty - h * 1 * e);
    };
    aile(23 * e, ROSE[1], '#23182a');
    ligne(x, '#e88aa0', 16 * e, cy + up * .2, 1 * e, cy + 1 * e + up * .2, Math.max(1, 1 * e));
    ell(x, ROSE[0], 22 * e, cy + up * .2, 6.6 * e, 3 * e);
    ligne(x, ROSE[2], 27 * e, cy - .6 * e + up * .3, 41 * e, cy - 2 * e + up * .4, Math.max(1, 1.5 * e));
    ell(x, ROSE[2], 41.6 * e, cy - 2.2 * e + up * .4, 1.9 * e, 1.3 * e);
    ligne(x, '#2a1a22', 43 * e, cy - 2 * e + up * .4, 45 * e, cy - .5 * e + up * .4, Math.max(1, 1 * e));
    aile(21 * e, ROSE[0], '#17151f');
  }, '#7a3a50');

  /* Petit troupeau sur la terre de Camargue : ils marchent et fouillent en suivant le terrain, a leur taille. Ils s'envolent si le drone descend sur eux. */
  FX.flamants = (sc, arg) => {
    const i = V.plan(sc, 'col', +(arg || 0)), f = f_(sc, i), e = .46, l = [];
    const M = flamMarche(e), FO = flamFouille(e), VO = flamVol(e);
    let attente = 0;
    const troupe = (X0) => { const n = irnd(4, 9); for (let k = 0; k < n; k++) l.push({ X: X0 + rnd(-30, 30), v: rnd(3, 8), fou: Math.random() < .12, ph: rnd(1), T: rnd(1, 4), vol: 0, y: 0, sens: 1 }); };
    return {
      plan: i, l,
      maj(dt, d) {
        const off = d * f, dr = V.drone();
        attente -= dt;
        if (attente <= 0) { attente = rnd(8, 18); if (l.length < 18) troupe(off + G.VW + rnd(40, 200)); }
        for (const o of l) {
          o.ph += dt * 1.1; o.T -= dt;
          if (o.vol) {
            o.X += 62 * dt; o.y -= 26 * o.vol * dt; o.vol = Math.min(1.5, o.vol + dt);
          } else {
            if (o.T < 0) { o.T = rnd(2, 5); o.fou = Math.random() < .15; }
            if (!o.fou) o.X += o.v * dt;
            if (dr && dr.y > 110 && Math.abs(o.X - off - dr.x) < 46 && Math.random() < dt * 5) { o.vol = .4; o.bas = sol(sc, i, o.X); }
          }
        }
        for (let k = l.length - 1; k >= 0; k--) { const q = l[k]; if (q.X - off < -30 || q.y < -180) l.splice(k, 1); }
      },
      draw(x, d, camY, T) {
        for (const o of l) {
          const sx = o.X - d * f;
          if (sx < -14 || sx > G.VW + 14) continue;
          if (o.vol) { pose(x, VO[(T * 14 + o.ph * 4 | 0) & 7], sx, o.bas + o.y + camY - 4, -.12, false, .5, .5); continue; }
          const fr = o.fou ? FO : M;
          pose(x, fr[(o.ph * (o.fou ? 3 : 8) | 0) % 8], sx, solDoux(sc, i, o.X) + camY + .6);
        }
      },
    };
  };

  /* Sur la lagune : des rangs a plusieurs distances, leur reflet dans l'eau. A l'approche du drone, ils courent sur l'eau et s'envolent. */
  FX.flamants_eau = sc => {
    const i = sc.plans.findIndex(p => p.wob >= 1), RANGS = [{ y: 119, e: .4, f: .08 }, { y: 134, e: .62, f: .13 }, { y: 153, e: .9, f: .2 }], l = [], gr = grains(100);
    for (const r of RANGS) { r.M = flamMarche(r.e); r.FO = flamFouille(r.e); r.VO = flamVol(r.e); }
    let attente = 0;
    const troupe = (r, X0) => { const n = irnd(3, 7); for (let k = 0; k < n; k++) l.push({ r, X: X0 + rnd(-34, 34) * (.6 + r.e), v: rnd(2, 5), fou: Math.random() < .28, ph: rnd(1), T: rnd(1, 4), st: 0, y: r.y + rnd(-1.4, 1.4), vy: 0, tp: 0 }); };
    for (const r of RANGS) for (let k = 0; k < 2; k++) troupe(r, rnd(160, 480));
    return {
      plan: i, l,
      maj(dt, d) {
        const dr = V.drone();
        attente -= dt;
        if (attente <= 0 && l.length < 30) { attente = rnd(3, 7); const r = pick(RANGS); troupe(r, d * r.f + G.VW + rnd(30, 110)); }
        for (const o of l) {
          const sx = o.X - d * o.r.f;
          o.ph += dt * 1.1; o.T -= dt;
          if (o.st === 0) {
            if (o.T < 0) { o.T = rnd(2, 5); o.fou = Math.random() < .3; }
            if (!o.fou) o.X += o.v * dt;
            if (dr && sx - dr.x < 44 + o.r.e * 40 && sx - dr.x > -30 && Math.random() < dt * 7) { o.st = 1; o.tp = 0; o.ph = 0; }
          } else if (o.st === 1) {
            // il court sur l'eau en battant des ailes, puis decolle
            o.tp += dt; o.X += 54 * dt * o.r.e;
            if (Math.random() < dt * 40) gr.add(o.X - 3, o.y, -rnd(2, 16), -rnd(6, 26), rnd(.2, .4), '#ffffff', 1);
            if (o.tp > .42) { o.st = 2; o.vy = -6; o.vx = rnd(50, 80); }
          } else { o.vy = Math.max(-46, o.vy - 34 * dt); o.y += o.vy * dt; o.X += o.vx * dt; o.tp += dt; }
        }
        gr.maj(dt, 90);
        for (let k = l.length - 1; k >= 0; k--) { const q = l[k], sx = q.X - d * q.r.f; if (sx < -30 || q.y < -14 || sx > G.VW + 70 && q.st) l.splice(k, 1); }
      },
      draw(x, d, camY, T) {
        const f = RANGS[0].f;
        for (const o of l) {
          const r = o.r, sx = o.X - d * r.f, y = o.y + camY;
          if (sx < -18 || sx > G.VW + 18) continue;
          let im;
          if (o.st === 2) { const j = (T * 14 + o.ph * 4 | 0) & 7; pose(x, r.VO[j], sx, y - 8 * r.e, -.15, false, .5, .5); if (o.y > r.y - 22) { x.globalAlpha = .26; pose(x, r.VO[j], sx, r.y + camY + (r.y - o.y) + 8 * r.e, 0, false, .5, .5); x.globalAlpha = 1; } continue; }
          if (o.st === 1) { pose(x, r.VO[(T * 16 | 0) & 7], sx, y - 7 * r.e, 0, false, .5, .5); continue; }
          im = (o.fou ? r.FO : r.M)[(o.ph * (o.fou ? 3 : 8) | 0) % 8];
          // le reflet, tremble et pale
          x.save(); x.translate(Math.round(sx * S) / S + Math.sin(T * 3 + o.X) * .4, Math.round(y * S) / S); x.scale(1, -1); x.globalAlpha = .28; x.drawImage(im, -im.width / S / 2, -im.height / S); x.restore();
          pose(x, im, sx, y);
          V.R(x, 'rgba(255,255,255,.5)', sx - 2 - r.e * 2, y, 4 + r.e * 4, .7);
        }
        gr.draw(x, d, f, camY);
      },
    };
  };
  /* Une escadre au loin dans le ciel : le long cou tendu, l'aile qui bat. Elle peut etre le sujet a filmer. */
  FX.vol_flamants = sc => {
    const i = Math.min(1, sc.plans.length - 1), l = [], E = flamVol(.5), G1 = flamVol(.82);
    let attente = rnd(1, 6), T0 = 0;
    return {
      plan: i,
      maj(dt) {
        attente -= dt; T0 += dt;
        const su = sujetDe('vise_flamants');
        if (attente <= 0) {
          attente = rnd(9, 20);
          const n = irnd(5, 11), y0 = rnd(18, Math.max(30, sc.hy - 40)), v = rnd(30, 42);
          for (let k = 0; k < n; k++) { const q = (k + 1) >> 1, c = k & 1 ? 1 : -1; l.push({ x: G.VW + 20 + q * 15, y: y0 + c * q * 5, v, ph: rnd(.3) }); }
        }
        for (const o of l) o.x -= o.v * dt;
        for (let k = l.length - 1; k >= 0; k--) if (l[k].x < -30) l.splice(k, 1);
      },
      draw(x, d, camY, T) {
        for (const o of l) pose(x, E[(T * 8 + o.ph * 8 | 0) & 7], o.x, o.y, 0, true, .5, .5);
        // le sujet : trois flamants plus proches, peints a la place du sprite vide
        const su = sujetDe('vise_flamants');
        if (su) for (let k = 0; k < 3; k++) pose(x, G1[(T * 9 + k * 2.6 | 0) & 7], su.x - 6 + k * 15, su.y - 18 + (k === 1 ? -9 : k * 3) + Math.sin(T * 2 + k) * 1.5, 0, true, .5, .5);
      },
    };
  };

  /* ==== LA REUNION : le gecko vert a points rouges, sur les tiges de bambou ==== */
  const TIGES = [[90, 19], [340, 17], [560, 20], [880, 18], [1120, 21], [1400, 18], [1650, 20], [1960, 17], [2190, 19], [2480, 18], [2700, 20]].map(t => [t[0] / S, t[1] / S]);
  const geckoFeuille = () => feuille('gecko', 19, 34, 6, (x, kk, k) => {
    const a = k / 6 * TAU, s = Math.sin(a), cx = 9.5;
    const q = s * 2.4;
    // la queue qui ondule, sa pointe bleue
    x.strokeStyle = '#3ab84a'; x.lineCap = 'round'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, 19); x.bezierCurveTo(cx - q, 23, cx + q, 26, cx - q * .6, 30); x.stroke();
    x.strokeStyle = '#3aa0e8'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - q * .3, 28); x.lineTo(cx - q * .6, 32); x.stroke();
    // les pattes a doigts plats, en alternance
    const pat = (bx, by, sg, ph) => { const u = Math.sin(a + ph); const pxe = bx + sg * 4.6, pye = by + u * 2.6; ligne(x, '#2f9a44', bx, by, pxe, pye, 1.6); rect(x, '#8fe05a', pxe - 1, pye - 1, 2, 2); };
    pat(cx - 2, 8.5, -1, 0); pat(cx + 2, 8.5, 1, 3.14); pat(cx - 2, 16.5, -1, 3.14); pat(cx + 2, 16.5, 1, 0);
    ell(x, '#46c84e', cx, 12.5 - s * .2, 3.6, 7.6);
    ell(x, '#2f9a44', cx + 1.8, 13, 1.4, 6);
    ell(x, '#7fe85c', cx - 1.2, 11, 1, 4.6);
    ell(x, '#46c84e', cx + s * .4, 3.8, 3, 3.4);
    rect(x, '#3aa0e8', cx - .6 + s * .4, 1.4, 1.4, 2);
    rect(x, K, cx - 2.6 + s * .4, 3, 1.3, 1.5); rect(x, K, cx + 1.6 + s * .4, 3, 1.3, 1.5);
    rect(x, '#ffd23c', cx - 2.6 + s * .4, 3, .7, .7); rect(x, '#ffd23c', cx + 1.6 + s * .4, 3, .7, .7);
    // les points rouges
    for (const [u, v] of [[-1.4, 7.4], [1.2, 9], [-.6, 11.6], [1.4, 13.6], [-1.2, 15.4], [.6, 17.6]]) rect(x, '#ff2a24', cx + u - .7, v - .7, 1.5, 1.5);
  }, '#14401f');
  FX.geckos = sc => {
    const i = V.plan(sc, 'peint', 2), p = sc.plans[i], f = f_(sc, i), per = p.nw / S, l = [], FR = geckoFeuille();
    let c = 0, n = 0, lie = null;
    const stemX = (cc, k) => cc * per + TIGES[k][0] + TIGES[k][1] / 2;
    const place = (X, star) => { const o = { X, y: rnd(46, 158), st: 'calme', T: rnd(.5, 3), v: 0, sc: 1, ph: rnd(6), star }; l.push(o); return o; };
    return {
      plan: i, l,
      maj(dt, d) {
        const off = d * f, dr = V.drone(), su = sujetDe('vise_gecko');
        // chaque tige qui entre a droite peut porter un ou deux geckos
        while (stemX(c, n) < off + G.VW + 30) { const X = stemX(c, n); if (Math.random() < .9) { place(X); if (Math.random() < .5) place(X); } n++; if (n >= TIGES.length) { n = 0; c++; } }
        if (su && !su.fin && (!lie || l.indexOf(lie) < 0)) {
          const cands = l.filter(o => o.X - off > 170 && o.X - off < G.VW + 40 && o.st !== 'fuit' && o.st !== 'cache');
          lie = cands.length ? cands[0] : place(off + G.VW + 8);
          lie.star = true; lie.y = rnd(90, 140);
        }
        for (const o of l) {
          const sx = o.X - off;
          o.T -= dt;
          const proche = dr && (sx - dr.x) ** 2 + (o.y - 8 - dr.y) ** 2 < 62 * 62 && !(o.star && su && !su.ok);
          if (proche && o.st !== 'fuit' && o.st !== 'cache') {
            if (Math.random() < .55) { o.st = 'fuit'; o.v = o.y < dr.y + 4 ? -128 : 128; }
            else { o.st = 'cache'; o.T = rnd(1, 1.8); }
          }
          if (o.st === 'calme') {
            o.ph += dt * .8;
            if (o.T < 0) { o.st = 'monte'; o.v = rnd(-30, 30) || 16; o.T = rnd(.4, 1.1); }
          } else if (o.st === 'monte') {
            o.y += o.v * dt; o.ph += dt * Math.abs(o.v) * .4;
            if (o.T < 0 || o.y < 26 || o.y > 170) { o.st = 'calme'; o.T = rnd(.6, 3.4); o.y = G.clamp(o.y, 26, 170); }
          } else if (o.st === 'fuit') {
            o.y += o.v * dt; o.ph += dt * 22;
          } else if (o.st === 'cache') {
            // il se faufile derriere la tige, puis revient jeter un oeil
            o.sc = Math.max(0, o.sc - dt * 5);
            if (o.T < 0) { if (proche) o.T = .4; else { o.st = 'revient'; } }
          } else if (o.st === 'revient') {
            o.sc = Math.min(1, o.sc + dt * 3);
            if (o.sc >= 1) { o.st = 'calme'; o.T = rnd(.5, 2); }
          }
        }
        for (let k = l.length - 1; k >= 0; k--) { const q = l[k]; if (q.X - off < -24 || q.y < -30 || q.y > 240) { if (q === lie) { lie = null; if (su) { su.x = -9999; su.fin = true; } } l.splice(k, 1); } }
        if (su && lie) { su.x = lie.X - off; su.y = lie.y + 12; }
      },
      draw(x, d, camY) {
        for (const o of l) {
          const sx = o.X - d * f;
          if (sx < -14 || sx > G.VW + 14 || o.sc < .08) continue;
          const y = o.y + camY, rot = o.v > 0 && (o.st === 'fuit' || o.st === 'monte') ? Math.PI : 0, im = FR[(o.ph * 1 | 0) % 6];
          if (o.sc >= 1) pose(x, im, sx, y, rot, false, .5, .5);
          else { x.save(); x.translate(Math.round(sx * S) / S + (1 - o.sc) * 3, y); x.scale(o.sc, 1); x.drawImage(im, -im.width / S / 2, -im.height / S / 2); x.restore(); }
        }
      },
    };
  };

  /* Le paille-en-queue : il bat des ailes, plane, ses deux longs brins de queue ondulent. Il vole pour de vrai, et il est le sujet a filmer. */
  const pailleFeuille = (e, n = 12) => feuille('paille' + e, 46 * e, 52 * e, n, (x, kk, k) => {
    const a = kk * TAU, h = Math.sin(a), cy = 26 * e, cx = 24 * e, W_ = 22 * e;
    const aile = (rx, cl, om, bar, loin) => {
      // large et souple a la racine, la pointe effilee, le bout noir et un trait noir sur le bras
      const ty = cy - h * W_, tx = rx + 7 * e - Math.abs(h) * 3 * e, c = Math.cos(a) * 3.4 * e;
      const mx = rx + (tx - rx) * .5 + c * .3, my = cy + (ty - cy) * .5 - c * .5, qx = rx + (tx - rx) * .74 + c * .1, qy = cy + (ty - cy) * .74 - c * .2;
      poly(x, cl, rx - 5 * e, cy + .6 * e, rx + 4.6 * e, cy - 1 * e, mx + 4.2 * e, my, qx + 2.6 * e, qy, tx, ty, qx - 2.2 * e, qy, mx - 3.8 * e, my);
      if (!loin) poly(x, om, rx - 5 * e, cy + .6 * e, rx - 1 * e, cy + .2 * e, mx - 1.2 * e, my, mx - 3.8 * e, my);
      poly(x, bar, qx + 2.6 * e, qy, tx, ty, qx - 2.2 * e, qy);
      ligne(x, bar, rx + 2.8 * e, cy - 1 * e, mx + 1.6 * e, my, Math.max(1, 1.4 * e));
    };
    aile(cx + 1 * e, '#cfd8e6', '#b4c0d2', '#34384a', true);
    ligne(x, '#ffffff', cx - 6 * e, cy + .4 * e, cx - 10 * e, cy + 1.4 * e, Math.max(1, 2.8 * e));
    ell(x, '#ffffff', cx, cy, 8.4 * e, 3.6 * e);
    ell(x, '#dfe6f0', cx - 1 * e, cy + 1.8 * e, 6 * e, 1.6 * e);
    disc(x, '#ffffff', cx + 8.2 * e, cy - 1.2 * e, 3 * e);
    rect(x, '#17151f', cx + 6.4 * e, cy - 2.2 * e, 4.6 * e, Math.max(1, 1 * e));
    poly(x, '#ff8a24', cx + 10.6 * e, cy - 2.2 * e, cx + 15.2 * e, cy - .2 * e, cx + 10.2 * e, cy + .2 * e);
    aile(cx - 1 * e, '#ffffff', '#dfe6f0', '#23263a', false);
  }, '#3a4258');
  const BRINS = 18;
  function dessinePaille(x, o, FR, T) {
    // le battement a l'air libre : plusieurs coups, puis un long plane, l'aile legerement relevee
    const n = FR.length;
    pose(x, FR[Math.floor(o.bat * n) % n], o.x, o.y, o.rot, o.dir < 0, .52, .5);
    // les deux longs brins de la queue : la vague court vers le bout
    const e = o.e, c = Math.cos(o.rot), s_ = Math.sin(o.rot), pas = 1.5 * e;
    for (let b = 0; b < 2; b++) {
      let y0 = null;
      for (let i = 0; i < BRINS; i++) {
        const k = i / BRINS, dist = 7 * e + i * pas, tx = o.x - o.dir * dist * c, ty = o.y + 1.4 * e + o.dir * dist * s_ + (b ? 1 * e : 0) + Math.sin(T * 5 - i * .34 + b * .7 + o.ph) * (.4 + k * 3) * e;
        const h = y0 === null ? 1 : Math.max(.7, Math.abs(ty - y0) + .4);
        V.R(x, '#ffffff', tx, Math.min(ty, y0 === null ? ty : y0), pas + .3, h);
        y0 = ty;
      }
    }
  }
  FX.pailles = sc => {
    // le dernier plan avant le sol : l'oiseau passe devant la foret, derriere le premier plan et le drone
    let dern = 0;
    sc.plans.forEach((p, n) => { if (!p.devant && p.f < 1) dern = n; });
    const SU = pailleFeuille(2.4), FR = pailleFeuille(1.5), PE = pailleFeuille(1), l = [];
    let attente = rnd(.6, 3), lie = null;
    const nouveau = (x, y, e, dir, v) => { const o = { x, y0: y, y, e, dir, v, bat: rnd(1), rot: 0, ph: rnd(6), cycle: rnd(1), fl: 0, FR: e > 2 ? SU : e > 1.2 ? FR : PE, vire: 0 }; l.push(o); return o; };
    return {
      plan: dern,
      maj(dt, d) {
        const dr = V.drone(), su = sujetDe('vise_oiseau');
        attente -= dt;
        if (su && !su.fin && !lie) { lie = nouveau(su.x, su.y, 2.4, -1, 0); lie.sujet = true; }
        if (attente <= 0 && l.length < 4) {
          attente = rnd(3.5, 8);
          const n = Math.random() < .45 ? irnd(2, 3) : 1, e = Math.random() < .6 ? 1 : 1.5, dir = Math.random() < .75 ? -1 : 1, y = rnd(24, 92);
          for (let k = 0; k < n; k++) nouveau(dir < 0 ? G.VW + 30 + k * rnd(22, 40) : -30 - k * rnd(22, 40), y + k * rnd(-14, 16), e, dir, rnd(44, 66) * (e > 1.2 ? 1 : .8));
        }
        for (const o of l) {
          o.cycle = (o.cycle + dt / 3.2) % 1;
          // quatre battements, puis il plane
          const bat = o.cycle < .42 || o.fl > 0;
          if (bat) o.bat = (o.bat + dt * (o.fl > 0 ? 4.6 : 3.2)) % 1;
          else o.bat += (((.8 - o.bat + 1.5) % 1) - .5) * Math.min(1, dt * 7);
          o.bat = (o.bat + 1) % 1;
          o.fl = Math.max(0, o.fl - dt);
          if (o.sujet && su) { o.x = su.x; }
          else o.x += o.dir * o.v * dt;
          const yb = o.y0 + Math.sin(o.ph + o.x * .018) * 9;
          let cible = yb;
          // le drone arrive : il s'ecarte d'un coup d'ailes
          if (dr && Math.abs(o.x - dr.x) < 66 && Math.abs(o.y - dr.y) < 42 && !(o.sujet && su && !su.ok)) { o.vire = 1; o.fl = .8; }
          if (o.vire) { o.y0 += (dr && o.y < dr.y ? -60 : 60) * dt; o.vire = Math.max(0, o.vire - dt); }
          const y1 = o.y;
          o.y += (cible - o.y) * Math.min(1, dt * 2.4);
          o.y = G.clamp(o.y, 12, 150);
          o.rot += ((o.y - y1) / Math.max(dt, .01) * .008 * -o.dir - o.rot) * Math.min(1, dt * 5);
          if (o.sujet && su) su.y = o.y + D.spr('vise_oiseau', 'l').h / 2 * 0;
        }
        for (let k = l.length - 1; k >= 0; k--) {
          const q = l[k];
          if (q.sujet) { if (!su) { lie = null; l.splice(k, 1); } continue; }
          if (q.x < -70 || q.x > G.VW + 70) l.splice(k, 1);
        }
      },
      draw(x, d, camY, T) {
        for (const o of l) if (o.e < 1.2) dessinePaille(x, o, o.FR, T);
        for (const o of l) if (o.e >= 1.2 && o.e < 2) dessinePaille(x, o, o.FR, T);
        for (const o of l) if (o.e >= 2) dessinePaille(x, o, o.FR, T);
      },
    };
  };

  /* Des nappes de nuages qui trainent dans la vallee, sous la crete : on est au-dessus d'elles */
  FX.nuages_bas = (sc, arg) => {
    const i = V.plan(sc, 'peint', +(arg || 0)), f = f_(sc, i), l = [];
    const nappe = (w, h, gr) => feuille('nuage_bas' + w + gr, w, h, 1, x => {
      for (let q = 0; q < 16; q++) { const k = q / 16, a = (k + rnd(-.04, .04)) * w, r = (Math.sin(k * Math.PI) * .5 + .25) * h * rnd(.6, 1); ell(x, q % 3 ? '#f4f8fa' : '#dfeaf0', a, h * .62 - r * .16, r * 2, r * .55); }
          }, null)[0];
    for (let k = 0; k < 9; k++) { const w = irnd(170, 320); l.push({ im: nappe(w, irnd(22, 38), k), x: rnd(0, 900), y: rnd(104, 172), v: rnd(3, 8) }); }
    const per = 840;
    return {
      plan: i,
      maj(dt) { for (const n of l) n.x -= n.v * dt; },
      draw(x, d, camY) {
        x.globalAlpha = .86;
        for (const n of l) { const X = ((n.x - d * f * 1.1) % per + per) % per - 300; if (X < G.VW) x.drawImage(n.im, Math.round(X * S) / S, Math.round((n.y + camY) * S) / S); }
        x.globalAlpha = 1;
      },
    };
  };

  /* ==== LE CAR REGIE ==== */
  /* Les ecrans et les vumetres, accroches au vrai plan de la regie (peintre.regie) : memes positions, meme defilement.
     Les vumetres sont encastres dans le plan incline du pupitre, a cote des curseurs, jamais derriere un technicien. */
  FX.regie = sc => {
    const i = V.plan(sc, 'regie', 0), p = sc.plans[i], f = f_(sc, i), TOUR = 2448 / S, l = [], vu = [];
    for (let m = 0; m < 4; m++) {
      for (const col of [0, 1, 4, 5]) for (let r = 0; r < 2; r++) l.push({ x: (m * 612 + 22 + col * 92 + (col >= 4) * 40) / S, y: (40 + r * 68) / S, w: 80 / S, h: 52 / S, t: rnd(4) });
      l.push({ x: (m * 612 + 214) / S, y: 44 / S, w: 164 / S, h: 112 / S, t: rnd(4), grand: true });
    }
    for (let k = 0; k < 26; k++) {
      const X = k * 96 + 12, c = X + 22;
      let libre = true;
      for (let q = 150; q < 2448 + 306; q += 306) if (Math.abs(c - q) < 46) libre = false;
      if (libre) vu.push({ x: X / S, b: [0, 1, 2, 3, 4].map(() => ({ a: rnd(3, 7), b: rnd(6), v: 0 })) });
    }
    const Y = 191 / S, H_ = 31 / S, L_ = 44 / S, SEG = 3 / S;
    return {
      plan: i,
      maj(dt) { for (const q of l) { q.t -= dt; if (q.t < 0) q.t = rnd(.8, 5); } },
      draw(x, d, camY, T) {
        const off = d * f, dy = p.y + camY;
        for (const q of l) {
          const X = ((q.x - off) % TOUR + TOUR) % TOUR;
          for (const A of [X, X - TOUR]) {
            if (A > G.VW || A + q.w < 0) continue;
            // on change de source, et le balayage descend
            if (q.t < .07) V.R(x, 'rgba(255,255,255,.3)', A, q.y + dy, q.w, q.h);
            const b = (T * 12 + q.x) % q.h;
            V.R(x, 'rgba(255,255,255,.1)', A, q.y + dy + b, q.w, 1);
            if (q.grand) V.R(x, (T * 3 % 1) > .2 ? '#ff3b30' : '#a81e18', A + q.w / 2 - 6, q.y + dy - 3, 12, 2);
          }
        }
        for (const v of vu) {
          const X = ((v.x - off) % TOUR + TOUR) % TOUR;
          for (const A of [X, X - TOUR]) {
            if (A > G.VW || A + L_ < 0) continue;
            const y0 = Y + dy;
            // le logement, creuse dans le pupitre
            V.R(x, '#0c0c12', A - 1 / S, y0 - 1 / S, L_ + 2 / S, H_ + 2 / S);
            V.R(x, '#6c6e80', A - 1 / S, y0 + H_ + 1 / S, L_ + 2 / S, 1 / S);
            V.R(x, '#14141c', A, y0, L_, H_);
            for (let c = 0; c < 5; c++) {
              const q = v.b[c], k = .5 + .5 * Math.sin(T * q.a + q.b) * Math.abs(Math.sin(T * q.a * .37 + q.b * 2)), n = Math.round((.2 + k * .8) * 10);
              const bx = A + (3 + c * 8) / S, gw = 6 / S, h = i_ => (n >= i_ ? i_ : n) * SEG;
              V.R(x, '#2a3a2e', bx, y0 + 1 / S, gw, H_ - 2 / S);
              const hv = Math.min(n, 6) * SEG, hj = Math.max(0, Math.min(n, 8) - 6) * SEG, hr = Math.max(0, n - 8) * SEG, ba = y0 + H_ - 1 / S;
              V.R(x, '#4cff7a', bx, ba - hv, gw, hv);
              if (hj) V.R(x, '#ffd23c', bx, ba - hv - hj, gw, hj);
              if (hr) V.R(x, '#ff4a3a', bx, ba - hv - hj - hr, gw, hr);
            }
            for (let s = 1; s < 10; s++) V.R(x, '#14141c', A, y0 + H_ - 1 / S - s * SEG, L_, 1 / S);
          }
        }
      },
    };
  };
  /* ---- Les marmottes des alpages : la sentinelle se dresse, elles trottent d'un terrier a l'autre, et filent sous terre quand le drone arrive ---- */
  const bitmap = (lignes, pal) => {
    const c = G.mk(lignes[0].length, lignes.length);
    lignes.forEach((l, y) => { for (let n = 0; n < l.length; n++) { const q = pal[l[n]]; if (q) { c.x.fillStyle = q; c.x.fillRect(n, y, 1, 1); } } });
    return c;
  };
  const MARM = { a: '#33241a', b: '#7c5a38', c: '#a98452', d: '#dcc398', e: '#120c0a' };
  const marmDebout = ['...aaaa...', '..abbbba..', '..abbbeba.', '..abccddd.', '...abcda..', '..abbcdda.', '.abbbcdda.', '.abbbcddba', '.abbbcdda.', '.abbbcdda.', '.abbbbdda.', '.aabbbdda.', 'aaaabbbaa.', '....aa.aa.'];
  const marmHaut = ['...........aaa..', '....aaaaaaabbba.', '..aabbbbbbbbbeba', '.abbbcccbbbbcddd', 'aabbbbccbbbbddda', 'a.abbbbbbbbbaaa.'];
  const marmC1 = [...marmHaut, '...abbaa.aabba..', '...aba.....aba..', '...aa......aa...'];
  const marmC2 = [...marmHaut, '..abba...aabba..', '.aba.......aba..', '.aa.........aa..'];
  let imgMarm = null;
  FX.marmottes = sc => {
    if (!imgMarm) imgMarm = { d: bitmap(marmDebout, MARM), c1: bitmap(marmC1, MARM), c2: bitmap(marmC2, MARM) };
    const i = Math.max(V.plan(sc, 'col', 1), 0), L = [];
    const neuve = (m, x) => { m.x = x; m.terrier = x + G.rnd(-14, 14); m.etat = 'guet'; m.t = G.rnd(.6, 2.6); m.v = 0; m.dir = Math.random() < .5 ? 1 : -1; m.dy = 0; return m; };
    // moins de marmottes (Max, 02/11/2026) : quatre a la fois, bien espacees
    for (let n = 0; n < 4; n++) L.push(neuve({}, G.rnd(0, G.VW + 260)));
    return {
      plan: i,
      maj(dt, d) {
        const dep = V.defile(sc, i), dr = V.drone();
        for (const m of L) {
          m.x -= dep * dt; m.terrier -= dep * dt; m.t -= dt; m.ph = (m.ph || 0) + dt;
          if (m.x < -24) neuve(m, G.VW + G.rnd(120, 520));
          const proche = dr && dr.proche && Math.abs(dr.x - m.x) < 90;
          if (proche && m.etat !== 'cache' && m.etat !== 'fuit') { m.etat = 'fuit'; m.dir = m.terrier > m.x ? 1 : -1; }
          if (m.etat === 'fuit') {
            m.x += m.dir * 74 * dt;
            if ((m.terrier - m.x) * m.dir <= 0) { m.etat = 'cache'; m.t = G.rnd(2, 4); }
          } else if (m.etat === 'cache') {
            m.dy = Math.min(1, m.dy + dt * 7);
            if (m.t <= 0 && !proche) { m.etat = 'guet'; m.t = G.rnd(1, 2.4); }
          } else {
            m.dy = Math.max(0, m.dy - dt * 4);
            if (m.t <= 0) {
              if (m.etat === 'guet') { m.etat = 'trot'; m.dir = Math.random() < .5 ? 1 : -1; m.t = G.rnd(.5, 1.3); } else { m.etat = 'guet'; m.t = G.rnd(.8, 3); }
            }
            if (m.etat === 'trot') { m.x += m.dir * 26 * dt; if (Math.abs(m.x - m.terrier) > 34) m.dir = m.terrier > m.x ? 1 : -1; }
          }
        }
      },
      draw(x, d, cam) {
        x.imageSmoothingEnabled = false;
        for (const m of L) {
          if (m.x < -16 || m.x > G.VW + 16) continue;
          // pas de trou dessine a cote d'elles (demande de Max) : elles s'enfoncent derriere la crete
          // la sentinelle dressee : le sprite v4 (Qwen, detoure sur sa grille, eclaire par le decor) ; au trot, le petit dessin au pixel
          // au trot : la marmotte v4 a quatre pattes, chacune a son rythme (5 images)
          const nt = m.etat !== 'guet' && D.existe('marmotte_trot') ? D.nbImages('marmotte_trot') : 0;
          const sp = m.etat === 'guet' ? D.spr('marmotte', 'm') : nt ? D.spr('marmotte_trot_f' + ((m.ph * 10 | 0) % nt), 'm') : null, dresse = sp && sp.ok;
          const img = dresse ? sp.img : m.etat === 'guet' ? imgMarm.d : (m.ph * 10 | 0) % 2 ? imgMarm.c1 : imgMarm.c2;
          const u = 1.2 * .72, w = dresse ? sp.w : img.width * u, h = dresse ? sp.h : img.height * u, y = D.crete(sc, i, m.x, d) + cam * sc.plans[i].f * .3;
          const baisse = m.dy * h;
          if (baisse >= h) continue;
          x.save(); x.beginPath(); x.rect(m.x - w, y - h - 2, w * 2, h + 2); x.clip();
          x.translate(Math.round(m.x), y + baisse);
          if (m.dir < 0) x.scale(-1, 1);
          x.drawImage(img, -w / 2, -h, w, h);
          x.restore();
        }
      },
    };
  };

})();
