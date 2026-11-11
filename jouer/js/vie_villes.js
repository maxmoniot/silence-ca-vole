/* Les acteurs animes du groupe villes : voir vie.js.
   Manhattan (taxis, vapeur, fenetres), Caen (bateaux), Sevran (canoes), les studios, le Champ-de-Mars, le tram de Lyon. */
'use strict';
(function () {
  const FX = G.Decor.FX, D = G.Decor, V = G.Vie;
  const R = V.R, S = G.S, K = '#17151f', { rnd, pick } = G;
  // ou tombe, a l'ecran, un point du plan i donne en pixels de son image
  const surPlan = (sc, i, px, d) => { const p = sc.plans[i], W = p.nw / S; let X = ((px / S - d * p.f) % W + W) % W; return X > W - 90 ? X - W : X; };
  const horsChamp = (X, m = 80) => X < -m || X > G.VW + m;
  const planFn = (sc, n) => V.plan(sc, 'peint', n);

  /* Les figurants des villes : ils s'ajoutent a la table commune, chacun a son allure */
  Object.assign(G.DOLLS, {
    yankee: { haut: '#22344f', bas: '#2a3350', chapeau: 'casquette', chapC: '#1a2a4a', cheveux: '#222' },
    yankee2: { haut: '#b8352c', bas: '#1f2937', chapeau: 'bonnet', chapC: '#2c2c34', peau: '#7a4d2e', cheveux: '#111' },
    coursier: { haut: '#f28c28', bas: '#22293a', chapeau: 'casque', chapC: '#f4f4f0', peau: '#b57f54' },
    livreuse: { haut: '#3a9a8a', bas: '#2a3350', chapeau: 'chignon', cheveux: '#222', peau: '#e8b98f' },
    plaisancier: { haut: '#f4f4f0', motif: '#2f6fb5', bas: '#e8e0c8', chapeau: 'casquette', chapC: '#22334a', barbe: true, cheveux: '#888' },
    pagayeur: { haut: '#d9334b', bas: '#22293a', chapeau: 'casque', chapC: '#f0c93a' },
    pagayeuse: { haut: '#2f8fd0', bas: '#22293a', chapeau: 'casque', chapC: '#ff7a2e', peau: '#b57f54' },
    machino: { haut: '#17151f', bas: '#3a3f4c', chapeau: 'casquette', chapC: '#17151f', cheveux: '#222', peau: '#b57f54' },
    regisseuse: { haut: '#f4c84a', bas: '#2a3350', chapeau: 'chignon', cheveux: '#3a2518' },
    chanteuse_rouge: { haut: '#d9264b', bas: '#d9264b', jupe: true, longue: true, chapeau: 'longs', cheveux: '#17151f', peau: '#7a4d2e' },
    chanteuse_or: { haut: '#f4c84a', bas: '#f4c84a', jupe: true, chapeau: 'chignon', cheveux: '#c9a24a' },
    chanteuse_bleue: { haut: '#2f8fd0', bas: '#2f8fd0', jupe: true, longue: true, chapeau: 'longs', cheveux: '#3a2518', peau: '#e8b98f' },
    danseur_rose: { haut: '#e262b5', bas: '#f4f4f0', cheveux: '#222', peau: '#b57f54' },
    danseur_blanc: { haut: '#f4f4f0', bas: '#22293a', col: '#d9264b', cheveux: '#3a2518' },
    gone: { haut: '#c8393b', bas: '#2a3350', chapeau: 'casquette', chapC: '#c8393b', cheveux: '#222' },
  });
  Object.assign(G.ALLURE, { coursier: ['velo', 90, 150], chanteuse_rouge: ['danse', 4, 9], chanteuse_or: ['danse', 4, 9], chanteuse_bleue: ['danse', 4, 9], danseur_rose: ['danse', 4, 9], danseur_blanc: ['danse', 4, 9] });

  /* ---- Le reflet d'un plan dans l'eau : ses rangees de pixels renversees, qui ondulent, une sur deux ---- */
  FX.reflet = (sc, arg) => {
    // arg : plan source (n-ieme 'peint'), plan d'eau (n-ieme 'mer'), ligne d'eau dans la source en pixels depuis le bas, hauteur, opacite
    const [a, b, bas, haut, al] = arg.split(',').map(Number);
    const si = planFn(sc, a), ei = V.plan(sc, 'mer', b);
    return { plan: ei, draw(x, d, camY, T) {
      const s = sc.plans[si], e = sc.plans[ei], W = G.VW, N = Math.ceil(W * S) + 1, y0 = e.y + camY, H = s.img.height - bas;
      for (let q = 0; q < haut; q += G.PERF_BAS ? 4 : 2) {
        if (q % 8 === 6) continue;
        const sy = H - 1 - Math.round(q * 1.3);
        if (sy < 0) break;
        const onde = Math.sin(q * .19 + T * 1.9) * (1.2 + q * .05);
        let o = (((d * s.f * S + onde) % s.nw) + s.nw) % s.nw | 0, dx = 0;
        x.globalAlpha = al * (1 - q / haut * .7);
        while (dx < N) { const n = Math.min(N - dx, s.nw - o); x.drawImage(s.img, o, sy, n, 2, dx / S, y0 + q / S, n / S, 2 / S); dx += n; o = 0; }
      }
      x.globalAlpha = 1;
    } };
  };

  /* ---- Les peintures faites une fois, image par image ---- */
  const feuilles = new Map();
  function feuille(cle, w, h, n, peint) {
    let f = feuilles.get(cle);
    if (f) return f;
    f = [];
    for (let k = 0; k < n; k++) {
      const c = G.mk(Math.ceil(w), Math.ceil(h));
      peint(c.x, k / n, k);
      const im = c.x.getImageData(0, 0, c.width, c.height), a = im.data, m = new Uint8Array(c.width * c.height);
      for (let i = 0; i < m.length; i++) { m[i] = a[i * 4 + 3] > 110 ? 1 : 0; a[i * 4 + 3] = m[i] ? 255 : 0; }
      for (let y = 0; y < c.height; y++) for (let X = 0; X < c.width; X++) {
        const i = y * c.width + X;
        if (m[i]) continue;
        if ((X > 0 && m[i - 1]) || (X < c.width - 1 && m[i + 1]) || (y > 0 && m[i - c.width]) || (y < c.height - 1 && m[i + c.width])) { a[i * 4] = 23; a[i * 4 + 1] = 21; a[i * 4 + 2] = 31; a[i * 4 + 3] = 255; }
      }
      c.x.putImageData(im, 0, 0);
      f.push(c);
    }
    feuilles.set(cle, f);
    return f;
  }
  const rc = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const trait = (x, c, a, b, e, f, l = 1) => { x.strokeStyle = c; x.lineWidth = l; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(e, f); x.stroke(); };
  // une bouffee, en blocs francs qui s'effilochent
  const bouffee = (x, X, Y, r, c, a) => {
    x.fillStyle = `rgba(${c},${a.toFixed(2)})`;
    x.fillRect(X - r, Y - r * .6, r * 2, r * 1.2); x.fillRect(X - r * .6, Y - r, r * 1.2, r * 2);
  };

  /* ---- Manhattan : les taxis, en deux files. Ils klaxonnent des phares quand le drone descend ---- */
  FX.taxis = sc => {
    const i = planFn(sc, 4), v = [];
    let att = .2, n = 0;
    return { plan: i,
      maj(dt) {
        const vit = V.defile(sc, i);
        att -= dt;
        if (att <= 0 && v.length < 6) {
          att = rnd(.8, 2.6); n++;
          const sens = Math.random() < .55 ? 1 : -1, s = n % 9 === 8 ? 'voiture_ny' : 'taxi_jaune';
          v.push({ s, sens, x: sens > 0 ? -60 : G.VW + 30, v: rnd(26, 62), y: sens > 0 ? 14 : 25, roue: 0 });
          v.sort((a, b) => a.y - b.y);
        }
        for (const q of v) { q.x += (q.sens * q.v - vit) * dt; q.roue += q.v * dt; }
        for (let k = v.length - 1; k >= 0; k--) if (v[k].x < -120 || v[k].x > G.VW + 120) v.splice(k, 1);
      },
      draw(x, d, camY, T) {
        const py = sc.plans[i].y + camY, dr = V.drone();
        for (const q of v) {
          const sp = D.spr(q.s, 'm');
          if (!sp.ok) continue;
          const b = py + q.y + 1, bas = Math.sin(T * 13 + q.x) > .8 ? .4 : 0, Y = b - sp.h + bas;
          x.save(); x.translate(q.x + sp.w / 2, 0); x.scale(q.sens, 1);
          x.drawImage(sp.img, -sp.w / 2, Y, sp.w, sp.h);
          // les roues : les rayons tournent
          for (const a of [28 / 132, 104 / 132]) {
            const cx = -sp.w / 2 + sp.w * a, cy = b - sp.h * 8 / 46, an = q.roue * .55;
            rc(x, K, cx + Math.cos(an) * 1.6 - .5, cy + Math.sin(an) * 1.6 - .5, 1, 1);
            rc(x, K, cx - Math.cos(an) * 1.6 - .5, cy - Math.sin(an) * 1.6 - .5, 1, 1);
          }
          if (q.s === 'voiture_ny') { const fl = (T * 7 | 0) % 2; rc(x, fl ? '#ff5a4a' : '#7fa4ff', -sp.w * (fl ? .08 : -.03), Y + .6, 5, 1.6); }
          // appel de phares quand le drone passe bas au-dessus
          if (dr && dr.y > 140 && Math.abs(dr.x - q.x - sp.w / 2) < 60 && (T * 6 | 0) % 2) rc(x, 'rgba(255,246,200,.8)', sp.w / 2 - 1, Y + sp.h * .5, 5, 2);
          x.restore();
        }
      } };
  };

  /* ---- La vapeur : elle monte des plaques d'egout et des cheminees rayees ; le souffle du drone la chasse ---- */
  FX.vapeur = sc => {
    const i = planFn(sc, 4), PX = [92, 411, 760, 1123, 1490, 1871];
    const b = PX.map((px, k) => ({ px, y: k % 2 ? 0 : 1, cone: k % 3 === 1, ex: 0, ph: rnd(6) }));
    return { plan: i,
      maj(dt, d) {
        const dr = V.drone();
        for (const q of b) {
          const X = surPlan(sc, i, q.px, d);
          if (dr && Math.abs(dr.x - X) < 46 && dr.y > 90) q.ex += (X > dr.x ? 1 : -1) * 90 * dt;
          q.ex *= 1 - dt * 1.2;
        }
      },
      draw(x, d, camY, T) {
        const p = sc.plans[i], py = p.y + camY;
        for (const q of b) {
          const X = surPlan(sc, i, q.px, d);
          if (horsChamp(X, 60)) continue;
          const y0 = py + (q.y ? p.h * .76 : p.h * .32);
          if (q.cone) {
            // la cheminee de chantier, orange a bandes blanches
            rc(x, K, X - 3.2, y0 - 15, 6.4, 15.6);
            for (let k = 0; k < 4; k++) rc(x, k % 2 ? '#f4f0e6' : '#f26a1e', X - 2.6, y0 - 14.6 + k * 3.7, 5.2, 3.7);
            rc(x, '#fff', X - 2.6, y0 - 14.6, 1, 14.6);
          }
          const top = y0 - (q.cone ? 15 : 0);
          for (let k = 0; k < 9; k++) {
            const u = ((T * .3 + k / 9 + q.ph) % 1), r = 2.4 + u * 11;
            bouffee(x, X + Math.sin(u * 7 + k * 2 + q.ph) * (1.5 + u * 6) + u * 10 + q.ex * u, top - u * 74, r, '250,248,244', .8 * (1 - u) * (1 - u * .6));
          }
        }
      } };
  };

  /* ---- Les fenetres de la rue : quelqu'un se penche et fait signe au drone ---- */
  FX.fenetresNy = sc => {
    const i = planFn(sc, 3), PX = [188, 610, 1042, 1530, 1990, 2410];
    const g = PX.map((px, k) => ({ px, s: 0, peau: ['#e8b98f', '#7a4d2e', '#c98f62'][k % 3], c: ['#c8393b', '#f4c84a', '#3a9a8a'][k % 3], ph: rnd(6), y: 48 + (k % 2) * 18 }));
    return { plan: i,
      maj(dt, d) { const dr = V.drone(); for (const q of g) { const X = surPlan(sc, i, q.px, d), pres = dr && Math.abs(X - dr.x) < 70; q.s = Math.max(0, Math.min(1, q.s + (pres ? 3 : -1.2) * dt)); } },
      draw(x, d, camY, T) {
        const py = sc.plans[i].y + camY;
        for (const q of g) {
          if (q.s <= 0) continue;
          const X = surPlan(sc, i, q.px, d);
          if (horsChamp(X, 20)) continue;
          const Y = py + q.y + (1 - q.s) * 4;
          rc(x, K, X - 2.6, Y - 3, 5.2, 7); rc(x, q.c, X - 2, Y + 1, 4, 3); rc(x, q.peau, X - 1.6, Y - 2.4, 3.2, 3.2);
          const b = Math.sin(T * 11 + q.ph) * 2;
          rc(x, K, X + 2, Y - 5 + b, 1.8, 7); rc(x, q.peau, X + 2.3, Y - 4.7 + b, 1.2, 3);
        }
      } };
  };

  /* ---- Ceux qui passent sur un trottoir ou un chemin du decor, petits comme il faut : chemin:plan,y,echelle,nombre,nom|nom|nom ---- */
  FX.chemin = (sc, arg) => {
    const [a, yy, ec, n, noms] = arg.split(',');
    const i = planFn(sc, +a), Y = +yy, e = +ec, N = +n, liste = noms.split('|'), g = [];
    let att = .1;
    const naitre = (dedans) => {
      const nom = pick(liste), al = G.ALLURE[nom], sens = Math.random() < .5 ? 1 : -1;
      const pose = al ? al[0] : (nom === 'machino' ? 'marche' : pick(['marche', 'marche', 'marche', 'course']));
      const v = (al ? rnd(al[1], al[2]) : pose === 'course' ? rnd(55, 80) : rnd(22, 34)) * e * 1.4;
      g.push({ nom: G.varier(nom), base: nom, pose, sens, v, x: dedans ? rnd(0, G.VW) : sens > 0 ? -20 : G.VW + 20, y: Y + rnd(-.6, .6), t: rnd(6) });
    };
    for (let k = 0; k < N >> 1; k++) naitre(true);
    return { plan: i,
      maj(dt) {
        const vit = V.defile(sc, i);
        att -= dt;
        if (att <= 0 && g.length < N) { att = rnd(.5, 2); naitre(false); }
        for (const q of g) { q.x += (q.sens * q.v - vit) * dt; q.t += dt * (q.pose === 'course' ? 7 : 4.6); }
        for (let k = g.length - 1; k >= 0; k--) if (g[k].x < -30 || g[k].x > G.VW + 30) g.splice(k, 1);
      },
      draw(x, d, camY) {
        for (const q of g) {
          x.save(); x.translate(q.x, q.y + camY); x.scale(e, e);
          G.dollDraw(x, q.nom, q.pose, q.t, 0, 0, q.sens < 0);
          // le machino pousse sa malle a roulettes
          if (q.base === 'machino') { const c = q.sens * 9; rc(x, K, c - 7, -14, 14, 14.6); rc(x, '#34343e', c - 6.2, -13.4, 12.4, 12.6); rc(x, '#a8acb4', c - 6.2, -13.4, 12.4, 1.6); rc(x, '#a8acb4', c - 6.2, -8, 12.4, 1); }
          x.restore();
        }
      } };
  };

  /* ---- Caen : les bateaux amarres : ils dansent sur l'eau, s'y refletent, et le souffle du drone les secoue ---- */
  const FLOTTE = ['voilier_caen', 'vedette_caen', 'voilier_bleu', 'barque_caen', 'voilier_caen', 'voilier_bleu', 'vedette_caen'];
  const RANGS = [{ k: 'mer', n: 0, y: 149, tag: 's', pas: 150, d: 0 }, { k: 'peint', n: 3, y: 164, tag: 'm', pas: 214, d: 40 }, { k: 'peint', n: 4, y: 185, tag: 'l', pas: 360, d: 170 }];
  FX.bateaux = (sc, arg) => {
    const r = RANGS[+arg], i = r.k === 'mer' ? V.plan(sc, 'mer', 0) : planFn(sc, r.n), W = sc.plans[i].nw, nb = Math.floor(W / r.pas);
    const b = [];
    for (let k = 0; k < nb; k++) b.push({ px: r.d + k * W / nb, s: FLOTTE[(k * 3 + +arg) % FLOTTE.length], ph: k * 1.7, sec: 0, gars: +arg === 2 && k % 2 === 0 });
    return { plan: i,
      maj(dt, d) {
        const dr = V.drone();
        for (const q of b) {
          const X = surPlan(sc, i, q.px, d);
          if (dr && Math.abs(dr.x - X) < 64 && dr.y > r.y - 80) q.sec = Math.min(1, q.sec + dt * 2.4); else q.sec = Math.max(0, q.sec - dt * .5);
        }
      },
      draw(x, d, camY, T) {
        for (const q of b) {
          const sp = D.spr(q.s, r.tag);
          if (!sp.ok) continue;
          const X = surPlan(sc, i, q.px, d) - sp.w / 2;
          if (horsChamp(X + sp.w / 2, sp.w)) continue;
          const am = .5 + q.sec * 1.6, Y = r.y + camY + Math.sin(T * 1.1 + q.ph) * am, haut = Math.min(sp.nh, r.tag === 's' ? 24 : r.tag === 'm' ? 36 : 54), pasR = G.PERF_BAS ? 6 : 3;
          // le reflet : la coque renversee, en tranches qui ondulent
          for (let k = 0; k < haut; k += pasR) {
            x.globalAlpha = .34 * (1 - k / haut);
            x.drawImage(sp.img, 0, sp.nh - 2 - k, sp.nw, 2, X + Math.sin(k * .3 + T * 2.2 + q.ph) * (.4 + k * .018), Y + k / S, sp.w, 2 / S);
          }
          x.globalAlpha = 1;
          x.drawImage(sp.img, X, Y - sp.h, sp.w, sp.h);
          // le fanion en tete de mat
          if (q.s !== 'vedette_caen') {
            const mx = X + sp.w * (q.s === 'barque_caen' ? .26 : .45), my = Y - sp.h + (q.s === 'barque_caen' ? sp.h * .08 : 1), l = sp.w * .07;
            const fl = Math.sin(T * 7 + q.ph) > 0 ? .4 : -.4;
            rc(x, '#d9334b', mx + 1, my + fl, l, 1); rc(x, '#d9334b', mx + 1, my + 1, l * .6, 1 + fl);
          }
          // le clapotis contre la coque
          const pc = (T * .8 + q.ph) % 1;
          x.fillStyle = `rgba(255,255,255,${(.5 - pc * .4).toFixed(2)})`;
          x.fillRect(X + sp.w * .08 - pc * 2, Y + .4, sp.w * .84 + pc * 4, .8);
          // le plaisancier sur le pont fait signe au drone
          if (q.gars) {
            x.save(); x.translate(X + sp.w * .22, Y - sp.h * (q.s === 'barque_caen' ? .34 : q.s === 'vedette_caen' ? .34 : .14)); x.scale(.62, .62);
            G.dollDraw(x, 'plaisancier', q.sec > .1 ? 'salut' : 'neutre', T * 3 + q.ph, 0, 0, false);
            x.restore();
          }
        }
      } };
  };

  /* ---- Caen : les rollers de la promenade. Ils roulent, sautent sur les petites barrieres, y glissent dans une gerbe d'etincelles, et retombent ---- */
  const BARRES_CAEN = [260, 760, 1260, 1760], LBARRE = 96 / S;
  FX.rollers = sc => {
    const i = planFn(sc, 5), Y0 = () => sc.plans[i].y + 12.6, HR = 8.4, E = .84, g = [];
    let att = 0;
    const naitre = () => {
      const sens = Math.random() < .68 ? 1 : -1, v = sens > 0 ? rnd(100, 140) : rnd(55, 90), net = sens * v - V.defile(sc, i);
      g.push({ nom: G.varier(pick(['roller1', 'roller2', 'roller3', 'roller4'])), sens, v, x: net < 0 ? G.VW + 26 : -26, t: rnd(6), etat: 'roule', h: 0, u: 0, du: 0, barre: -1, bulleT: 0, gerbe: rnd(6) });
    };
    return { plan: i,
      maj(dt, d) {
        att -= dt;
        if (att <= 0 && g.length < 4) { att = rnd(1, 3); naitre(); }
        const vit = V.defile(sc, i), dr = V.drone();
        for (const q of g) {
          // sur le tube, ca freine : on a le temps de voir la glissade
          q.x += (q.sens * q.v * (q.etat === 'glisse' ? .5 : 1) - vit) * dt;
          q.t += dt * (q.etat === 'roule' ? q.v / 15 : 4);
          q.bulleT = Math.max(0, q.bulleT - dt);
          if (q.etat === 'roule') {
            BARRES_CAEN.forEach((px, k) => {
              const bx = surPlan(sc, i, px, d), entree = q.sens > 0 ? bx : bx + LBARRE, dist = (entree - q.x) * q.sens;
              if (q.barre !== k && dist > 0 && dist < q.v * .3) { q.etat = 'monte'; q.barre = k; q.u = 0; q.du = dist / q.v; }
            });
          } else if (q.etat === 'monte') {
            q.u += dt / q.du;
            q.h = HR * Math.min(1, q.u) + Math.sin(Math.min(1, q.u) * Math.PI) * 9;
            if (q.u >= 1) { q.etat = 'glisse'; q.h = HR; q.bulleT = 2.2; }
          } else if (q.etat === 'glisse') {
            const bx = surPlan(sc, i, BARRES_CAEN[q.barre], d), sortie = q.sens > 0 ? bx + LBARRE : bx;
            if ((q.x - sortie) * q.sens >= 0) { q.etat = 'saute'; q.u = 0; }
          } else if (q.etat === 'saute') {
            q.u += dt / .42;
            q.h = Math.max(0, HR * (1 - q.u) + Math.sin(Math.min(1, q.u) * Math.PI) * 8);
            if (q.u >= 1) { q.etat = 'pose'; q.h = 0; q.u = 0; }
          } else { q.u += dt / .22; if (q.u >= 1) q.etat = 'roule'; }
          // quand le drone passe bas, il fait un saut de joie sur place
          if (q.etat === 'roule' && dr && dr.y > 130 && Math.abs(dr.x - q.x) < 22 && q.bulleT <= 0) q.bulleT = 2.2;
        }
        for (let k = g.length - 1; k >= 0; k--) if (g[k].x < -40 || g[k].x > G.VW + 40) g.splice(k, 1);
      },
      draw(x, d, camY, T) {
        const y0 = Y0() + camY;
        for (const q of g) {
          // l'ombre reste au sol
          const lo = 9 - q.h * .35;
          rc(x, 'rgba(50,40,30,.34)', q.x - lo, y0 - .4, lo * 2, 1.6);
          const glisse = q.etat === 'glisse', air = q.etat === 'monte' || q.etat === 'saute';
          const pose = glisse || q.etat === 'pose' ? 'ski' : air ? 'saute' : 'roller';
          x.save(); x.translate(q.x, y0 - q.h);
          if (glisse) x.rotate(q.sens * -.14); else if (air) x.rotate(q.sens * Math.sin(q.u * Math.PI) * .22);
          x.scale(E, E);
          G.dollDraw(x, q.nom, pose, q.t, 0, 0, q.sens < 0);
          x.restore();
          if (glisse) {
            // les etincelles qui partent en arriere, le long du tube
            for (let k = 0; k < 7; k++) {
              const u = ((T * 3.4 + k / 7 + q.gerbe) % 1), bx = q.x - q.sens * (2 + u * 15), by = y0 - q.h + u * u * 7 + Math.sin(k * 2.1) * u * 2;
              rc(x, u < .35 ? '#fff6c8' : u < .7 ? '#ffc23c' : '#f0702a', bx, by, 1.2, 1.2);
            }
          }
          if (q.bulleT > 0 && q.x > 6 && q.x < G.VW - 6) G.Lumiere.bulle(x, 'Boioz !!!!!', q.x, y0 - q.h - 27, 0, q, q.etat === 'glisse');
        }
      } };
  };

  /* ---- Sevran : canoes et kayaks. Les pagaies battent, le sillage s'ouvre, on leve la pagaie au passage du drone ---- */
  const COUL_KAYAK = [['#e0483a', '#ffb09a', '#f2bc1e'], ['#f2bc1e', '#fff0a8', '#2f6fb5'], ['#3fae49', '#b8f0a8', '#e0483a'], ['#2f8fd0', '#b4e0ff', '#ff7a2e']];
  function peintKayak(x, u, k, co) {
    const cx = 55, wy = 56, sal = k === 8, a = sal ? 0 : Math.sin(u * 6.283) * .8, ax = Math.cos(a), ay = Math.sin(a);
    x.fillStyle = co[0]; x.beginPath(); x.moveTo(cx - 48, wy - 3); x.lineTo(cx - 10, wy - 7); x.lineTo(cx + 12, wy - 7); x.lineTo(cx + 48, wy - 4); x.lineTo(cx + 36, wy + 3); x.lineTo(cx - 36, wy + 3); x.closePath(); x.fill();
    rc(x, co[1], cx - 40, wy - 4, 80, 1); rc(x, '#17151f', cx - 8, wy - 8, 18, 3);
    const lean = sal ? 0 : Math.cos(u * 6.283) * 1.4, tx = cx + 1 + lean;
    rc(x, co[2], tx - 5, wy - 22, 10, 16); rc(x, '#22293a', tx - 5, wy - 11, 10, 5);
    rc(x, '#e8b98f', tx - 3, wy - 29, 7, 7); rc(x, '#f4f4f0', tx - 4, wy - 31, 9, 4);
    const pcx = cx + 8 + lean, pcy = sal ? wy - 42 : wy - 24 + ay * 2, L = 28;
    trait(x, '#e8b98f', tx + 1, wy - 20, pcx - (sal ? 8 : 3), pcy, 3); trait(x, '#e8b98f', tx + 2, wy - 18, pcx + (sal ? 8 : 5), pcy + 1, 3);
    trait(x, '#3a3a44', pcx - ax * L, pcy - ay * L, pcx + ax * L, pcy + ay * L, 2);
    for (const q of [-1, 1]) { const bx = pcx + q * ax * L, by = pcy + q * ay * L; if (by < wy + 2) trait(x, co[0], bx, by, bx + q * ax * 7, Math.min(wy + 2, by + q * ay * 7), 5); }
  }
  function peintCanoe(x, u, k, co) {
    const cx = 55, wy = 56, sal = k === 8;
    const coque = () => { x.fillStyle = co[0]; x.beginPath(); x.moveTo(cx - 50, wy - 15); x.lineTo(cx - 40, wy - 7); x.lineTo(cx + 40, wy - 7); x.lineTo(cx + 50, wy - 15); x.lineTo(cx + 38, wy + 3); x.lineTo(cx - 38, wy + 3); x.closePath(); x.fill(); rc(x, co[1], cx - 42, wy - 8, 84, 2); };
    for (const [p, c] of [[-18, co[2]], [18, '#f4f4f0']]) {
      const sw = sal ? 0 : Math.sin(u * 6.283 + (p > 0 ? .3 : 0)), tx = cx + p + sw * .8;
      rc(x, c, tx - 5, wy - 24, 10, 19); rc(x, '#e8b98f', tx - 3, wy - 31, 7, 7); rc(x, p > 0 ? '#3a2518' : '#f4c84a', tx - 4, wy - 33, 9, 3);
      if (sal) { trait(x, '#e8b98f', tx + 5, wy - 22, tx + 8, wy - 40, 3); trait(x, '#6a5238', tx + 8, wy - 50, tx + 8, wy - 32, 2); rc(x, co[0], tx + 5, wy - 54, 6, 8); }
      else { const hx = tx + 7 + sw * 11, hy = wy - 21, bx = tx + 9 + sw * 19; trait(x, '#e8b98f', tx + 1, wy - 21, hx, hy, 3); trait(x, '#6a5238', hx - 1, hy - 7, bx, wy + 1, 2); trait(x, co[0], bx, wy - 5, bx, wy + 2, 5); }
    }
    coque();
  }
  const LIGNES = [{ y: 151, f: .14, e: .58 }, { y: 163, f: .2, e: .78 }, { y: 178, f: .32, e: 1 }];
  FX.canoes = sc => {
    const i = V.plan(sc, 'mer', 0), c = [], ronds = [];
    let att = 0, nv = 0, sujetC = null;
    const mk = (l, dedans) => {
      const li = LIGNES[l], cano = Math.random() < .42, co = COUL_KAYAK[Math.floor(Math.random() * 4)], sens = Math.random() < .55 ? 1 : -1, v = rnd(14, 34) * (cano ? .8 : 1.15);
      const w = G.Jeu.w(), vit = (w ? w.v * w.ech : 120) * li.f, net = sens * v - vit;
      return { l, cano, co, sens, v, x: dedans ? rnd(40, G.VW) : net < 0 ? G.VW + 50 : -50, t: rnd(1), sal: 0, ph: rnd(6) };
    };
    for (let k = 0; k < 4; k++) c.push(mk(k % 3, true));
    const feuilleDe = q => feuille((q.cano ? 'can' : 'kay') + q.co[0], 110, 72, 9, (x, u, k) => (q.cano ? peintCanoe : peintKayak)(x, k < 8 ? k / 8 : 0, k, q.co));
    const peindre = (x, q, T, camY) => {
      const li = LIGNES[q.l], e = li.e, Y = li.y + camY + Math.sin(T * 1.4 + q.ph) * .5, f = feuilleDe(q), w = 110 / S * e, h = 72 / S * e;
      const fr = q.sal > .3 ? f[8] : f[(q.t * 8 | 0) % 8];
      // le sillage : deux lignes qui s'ouvrent derriere
      for (let k = 1; k <= 7; k++) {
        const b = q.x - q.sens * (w * .38 + k * 6 * e), o = k * .75 * e;
        x.fillStyle = `rgba(255,255,255,${(.62 - k * .07).toFixed(2)})`;
        x.fillRect(b - 3 * e, Y + .4 + o, 6 * e, .8); x.fillRect(b - 3 * e, Y + .4 - o * .55, 6 * e, .8);
      }
      x.fillStyle = 'rgba(255,255,255,.8)'; x.fillRect(q.x + q.sens * w * .36 - 2, Y, 4 * e, .9);
      rc(x, 'rgba(20,60,60,.32)', q.x - w * .36, Y + 1, w * .72, 2.4 * e);
      x.save(); x.translate(q.x, 0); x.scale(q.sens, 1); x.drawImage(fr, -w / 2, Y - 56 / S * e, w, h); x.restore();
      // la pagaie frappe l'eau : des gouttes
      if (q.sal < .3) {
        const u = (q.t * 2) % 1, c2 = q.t * 2 % 2 < 1 ? 1 : -1;
        for (let k = 0; k < 4; k++) rc(x, '#fff', q.x + c2 * 20 * e + (k - 1.5) * 2.4 * e, Y - Math.sin(u * 3.14) * (2 + k) * e, 1, 1);
      }
    };
    return { plan: i,
      maj(dt) {
        const dr = V.drone(), W = G.Jeu.w(), vit = W ? W.v * W.ech : 120;
        att -= dt;
        if (att <= 0 && c.length < 5) { att = rnd(1.5, 4); c.push(mk(Math.floor(rnd(3)), false)); }
        for (const q of c) {
          q.x += (q.sens * q.v - vit * LIGNES[q.l].f) * dt; q.t += dt * (.5 + q.v / 40);
          const pres = dr && Math.abs(dr.x - q.x) < 56 && dr.y > 76;
          q.sal = Math.max(0, Math.min(1, q.sal + (pres ? 4 : -1.6) * dt));
        }
        for (let k = c.length - 1; k >= 0; k--) if (c[k].x < -70 || c[k].x > G.VW + 70) c.splice(k, 1);
        c.sort((a, b) => a.l - b.l);
        // le souffle du drone rid l'eau
        nv -= dt;
        if (dr && dr.y > 100 && dr.y < 176 && nv <= 0) { nv = .16; ronds.push({ x: dr.x, y: Math.min(182, dr.y + 26), T: 0 }); }
        for (const r of ronds) { r.T += dt; r.x -= vit * .2 * dt; }
        while (ronds.length && ronds[0].T > 1) ronds.shift();
      },
      draw(x, d, camY, T) {
        for (const r of ronds) { const w = 3 + r.T * 20; x.fillStyle = `rgba(240,255,250,${(.6 * (1 - r.T)).toFixed(2)})`; x.fillRect(r.x - w, r.y + camY, w * 2, .8); x.fillRect(r.x - w * .6, r.y + camY + 1.6 + r.T * 2, w * 1.2, .7); }
        for (const q of c) peindre(x, q, T, camY);
        // le canoe a filmer
        const w = G.Jeu.w(), su = w && w.sujet && w.sujet.s === 'vise_canoe' ? w.sujet : null;
        if (su) {
          if (!sujetC) sujetC = { l: 2, cano: true, co: COUL_KAYAK[3], sens: 1, v: 20, x: su.x, t: 0, sal: 0, ph: 1 };
          sujetC.x = su.x; sujetC.t = T * .9; sujetC.sal = su.vise ? 1 : 0; su.y = LIGNES[2].y + 6;
          peindre(x, sujetC, T, camY);
        }
      } };
  };

  /* ---- Les studios : les projecteurs de la cour balaient les facades et suivent le drone comme une star ---- */
  FX.projos = sc => {
    const i = planFn(sc, 3), PX = [250, 690, 1160, 1630, 2070];
    const l = PX.map((px, k) => ({ px, an: -2.2 - k * .2, ph: k * 1.9 }));
    let t0 = 0;
    return { plan: i,
      maj(dt, d) {
        const dr = V.drone(), Y = sc.plans[i].y + 32;
        t0 += dt;
        for (const q of l) {
          const X = surPlan(sc, i, q.px, d) + .6, pres = dr && Math.abs(dr.x - X) < 150;
          const but = pres ? Math.atan2(dr.y - Y, dr.x - X) : -1.9 + Math.sin(t0 * .5 + q.ph) * .55;
          q.pres = pres; q.an += (but - q.an) * Math.min(1, dt * (pres ? 6 : 1.4));
        }
      },
      draw(x, d, camY, T) {
        const Y = sc.plans[i].y + 32 + camY;
        for (const q of l) {
          const X = surPlan(sc, i, q.px, d) + .6;
          if (horsChamp(X, 170)) continue;
          const ca = Math.cos(q.an), sa = Math.sin(q.an), L = 130, w = q.pres ? 13 : 20, ex = X + ca * L, ey = Y + sa * L, nx = -sa, ny = ca, a = q.pres ? .3 : .2 + Math.sin(T * 13 + q.ph) * .012;
          x.fillStyle = `rgba(255,242,190,${a.toFixed(3)})`;
          x.beginPath(); x.moveTo(X + nx * 2, Y + ny * 2); x.lineTo(ex + nx * w, ey + ny * w); x.lineTo(ex - nx * w, ey - ny * w); x.lineTo(X - nx * 2, Y - ny * 2); x.fill();
          x.save(); x.translate(X, Y); x.rotate(q.an);
          rc(x, K, -5, -3.4, 9.4, 6.8); rc(x, '#34363f', -4.4, -2.8, 7.8, 5.6); rc(x, '#fff6c8', 2.6, -2.6, 1.6, 5.2); rc(x, '#55586a', -4.4, -2.8, 7.8, 1);
          x.restore();
        }
      } };
  };
  /* ---- Les portails des plateaux : un voyant rouge, et de temps en temps le grand portail coulisse sur la lumiere ---- */
  FX.plateaux = sc => {
    const i = planFn(sc, 2), p = sc.plans[i], D_ = [[0, 1, .62], [0, 6, .62], [600, 3, .7], [600, 8, .7], [1200, 2, .6], [1200, 7, .6], [1800, 0, .68], [1800, 5, .68]];
    const po = D_.map(([x, b, hf]) => ({ px: x + b * 44 + 25, ph: Math.round(p.nh * hf * .7), op: 0, but: 0, t: rnd(2, 14) }));
    return { plan: i,
      maj(dt) { for (const q of po) { q.t -= dt; if (q.t < 0) { q.but = q.but ? 0 : 1; q.t = q.but ? rnd(3, 6) : rnd(6, 18); } q.op += (q.but - q.op) * Math.min(1, dt * 1.6); } },
      draw(x, d, camY, T) {
        const bas = p.y + p.h - 1 / S + camY, W = 28 / S;
        for (const q of po) {
          const X = surPlan(sc, i, q.px, d);
          if (horsChamp(X, 30)) continue;
          const H = q.ph / S, Y = bas - H;
          if (q.op > .02) {
            const o = W * q.op;
            rc(x, '#ffe2a0', X - W / 2, Y, o, H); rc(x, '#fff6d0', X - W / 2, Y, o, 1.4);
            // le plateau : un pont de lumiere, un decor, une silhouette
            if (o > 6) { rc(x, '#34343e', X - W / 2, Y + 2.4, o, 1); for (let k = 0; k < o - 2; k += 4) rc(x, '#fffbe8', X - W / 2 + 1 + k, Y + 3.4, 2, 1); rc(x, '#2c2a36', X - W / 2 + 3, bas - 9, 3.4, 9); rc(x, '#c98f62', X - W / 2 + 3.5, bas - 11, 2.4, 2.4); }
          }
          // le voyant rouge
          const on = (T * 1.7 + q.px) % 2 < 1.3;
          rc(x, K, X - 2.2, Y - 5.4, 4.4, 3.4); rc(x, on ? '#ff3b30' : '#6a1e1a', X - 1.6, Y - 4.8, 3.2, 2.2);
          if (on) rc(x, 'rgba(255,80,60,.22)', X - 4, Y - 7, 8, 7);
        }
      } };
  };

  /* ---- Le Champ-de-Mars : on danse et on chante sur la pelouse ; a l'approche du drone, tout le groupe saute ---- */
  const GROUPES = [
    { px: 110, g: [['chanteuse_rouge', 0, 12], ['danseur_rose', 13, 16], ['chanteuse_or', 27, 11], ['danseur_blanc', 41, 18], ['chanteuse_bleue', 54, 13]] },
    { px: 560, g: [['guitariste', 0, 15], ['chanteuse_or', 15, 12], ['danseuse_noire', 28, 17]] },
    { px: 980, g: [['danseur_blanc', 0, 14], ['chanteuse_bleue', 13, 18], ['danseur_rose', 26, 12], ['chanteuse_rouge', 39, 16], ['accordeoniste', 54, 11], ['chanteuse_or', 66, 17]] },
    { px: 1460, g: [['danseuse_noire', 0, 15], ['danseuse_noire', 15, 12], ['danseur_rose', 29, 18]] },
    { px: 1900, g: [['chanteuse_rouge', 0, 13], ['guitariste', 15, 17], ['chanteuse_bleue', 30, 12], ['danseur_blanc', 44, 15]] },
    { px: 340, g: [['danseur_rose', 0, 16], ['chanteuse_bleue', 14, 12], ['touriste', 34, 17]] },
    { px: 770, g: [['chanteuse_rouge', 0, 13], ['danseur_blanc', 16, 18], ['chanteuse_or', 30, 12], ['danseuse_noire', 46, 16]] },
    { px: 1240, g: [['chanteuse_or', 0, 17], ['danseur_rose', 16, 12], ['guitariste', 34, 15]] },
    { px: 1720, g: [['danseur_blanc', 0, 12], ['chanteuse_rouge', 14, 17]] },
    { px: 2190, g: [['chanteuse_bleue', 0, 15], ['danseuse_noire', 16, 12], ['danseur_rose', 30, 18], ['chanteuse_or', 46, 13]] },
  ];
  const CHANTS = ['I want to break free', 'I want to break free !'];
  FX.danseurs = sc => {
    const i = planFn(sc, 3), p = sc.plans[i];
    const gr = GROUPES.map((g, k) => ({ px: g.px, g: g.g.slice().sort((a, b) => a[2] - b[2]), ph: k * 1.3, joie: 0, ch: rnd(0, 3), mot: '', mt: 0 }));
    return { plan: i,
      maj(dt, d) {
        const dr = V.drone();
        for (const q of gr) {
          const X = surPlan(sc, i, q.px, d) + 30, pres = dr && Math.abs(dr.x - X) < 75;
          q.joie = Math.max(0, Math.min(1, q.joie + (pres ? 4 : -1) * dt));
          q.ch -= dt; q.mt = Math.max(0, q.mt - dt);
          if (q.ch < 0) { q.ch = rnd(3, 6); q.mot = pick(CHANTS); q.mt = 2.6; }
        }
      },
      draw(x, d, camY, T) {
        for (const q of gr) {
          const X = surPlan(sc, i, q.px, d);
          if (horsChamp(X + 30, 100)) continue;
          for (const [n, dx, dy] of q.g) {
            const e = .66 + dy * .012, pose = n === 'guitariste' || n === 'accordeoniste' ? 'neutre' : q.joie > .3 ? 'saute' : 'danse';
            x.save(); x.translate(X + dx, p.y + 6 + dy + camY + (pose === 'saute' ? -Math.abs(Math.sin(T * 5 + dx)) * 4 : 0)); x.scale(e, e);
            G.dollDraw(x, n, pose, T * 5 + dx * .3 + q.ph, 0, 0, dx % 2 === 0);
            x.restore();
          }
          if (q.mt > 0) G.Lumiere.bulle(x, q.mot, X + 30, p.y + 2 + camY, 0, q, q.joie > .3);
        }
      } };
  };
  /* La limousine blanche : elle roule sur l'allee, s'arrete, ses passagers en descendent pour danser, puis elle repart */
  FX.limo = sc => {
    const i = planFn(sc, 4);
    let x_ = G.VW + 30, sens = -1, v = 44, etat = 'roule', tmp = 0, roue = 0, sortie = 0, att = 0;
    const E = .72;
    return { plan: i,
      maj(dt) {
        const vit = V.defile(sc, i);
        if (att > 0) { att -= dt; if (att <= 0) { sens = Math.random() < .6 ? -1 : 1; x_ = sens < 0 ? G.VW + 30 : -160; v = 44; etat = 'roule'; sortie = 0; tmp = 0; } return; }
        if (etat === 'roule') { x_ += (sens * v - vit) * dt; roue += v * dt; if (x_ > 90 && x_ < 220 && tmp === 0) { etat = 'freine'; tmp = 1; } }
        else if (etat === 'freine') { v = Math.max(0, v - 34 * dt); x_ += (sens * v - vit) * dt; roue += v * dt; if (v <= 0) { etat = 'arret'; tmp = rnd(5, 8); } }
        else if (etat === 'arret') { x_ -= vit * dt; tmp -= dt; sortie = Math.min(1, sortie + dt * 1.3); if (tmp <= 0) etat = 'rentre'; }
        else if (etat === 'rentre') { x_ -= vit * dt; sortie = Math.max(0, sortie - dt * 1.6); if (sortie <= 0) { etat = 'repart'; v = 0; } }
        else { v = Math.min(70, v + 22 * dt); x_ += (sens * v - vit) * dt; roue += v * dt; }
        if ((x_ < -190 || x_ > G.VW + 60) && etat !== 'freine' && etat !== 'arret' && etat !== 'rentre') att = rnd(2, 5);
      },
      draw(x, d, camY, T) {
        if (att > 0) return;
        const sp = D.spr('hummer_blanc', 'l');
        if (!sp.ok) return;
        const w = sp.w * E, h = sp.h * E, b = sc.plans[i].y + 15 + camY, Y = b - h + (v > 1 && Math.sin(T * 15) > .75 ? .4 : 0);
        // l'ombre, la poussiere de l'allee
        rc(x, 'rgba(70,50,30,.32)', x_ + 2, b - .5, w - 4, 2);
        if (v > 8) for (let k = 0; k < 5; k++) { const u = (T * 1.2 + k / 5) % 1, r = 1.5 + u * 4; x.fillStyle = `rgba(226,206,160,${(.5 * (1 - u)).toFixed(2)})`; x.fillRect((sens < 0 ? x_ + w + u * 18 : x_ - u * 18) - r, b - 1 - u * 5 - r / 2, r * 2, r); }
        // celle qui danse dans le toit ouvrant
        const tx = x_ + w * (sens < 0 ? .54 : .46);
        x.save(); x.beginPath(); x.rect(tx - 12, Y - 20, 24, 20 + 3); x.clip(); x.translate(tx, Y + 14); x.scale(.72, .72);
        G.dollDraw(x, 'chanteuse_or', 'danse', T * 5, 0, 0, sens < 0);
        x.restore();
        x.save(); x.translate(x_ + w / 2, 0); x.scale(-sens, 1);
        x.drawImage(sp.img, -w / 2, Y, w, h);
        // les roues : les rayons tournent
        for (const a of [42 / 252, 208 / 252]) {
          const cx = -w / 2 + w * a, cy = Y + h * 59 / 74, an = roue * .4;
          for (let k = 0; k < 3; k++) { const c = Math.cos(an + k * 2.09), s = Math.sin(an + k * 2.09); rc(x, '#7f8290', cx + c * 2.6 - .4, cy + s * 2.6 - .4, .9, .9); }
          rc(x, '#3a3a44', cx - .7, cy - .7, 1.4, 1.4);
        }
        // le clignotant de l'arret
        if (etat === 'arret' && (T * 3 | 0) % 2) rc(x, '#ffb030', w / 2 - 2, Y + h * .4, 1.6, 1.6);
        x.restore();
        // les passagers descendus dansent devant la portiere
        if (sortie > 0) {
          const doors = [['danseur_rose', -26], ['chanteuse_rouge', -6], ['danseur_blanc', 14], ['chanteuse_bleue', 32]];
          for (const [n, o] of doors) {
            x.save(); x.translate(tx + o * sortie, b + 2.4 * sortie); x.scale(.62, .62);
            G.dollDraw(x, n, 'danse', T * 5 + o, 0, 0, o < 0);
            x.restore();
          }
        }
      } };
  };
  // les roues de la limousine et du taxi, quand ils sont le sujet a filmer
  FX.rouesSujet = (sc, arg) => {
    const [nom, a, b, hy] = arg.split(',');
    return { couche: 'avant', draw(x, d, camY, T) {
      const w = G.Jeu.w(), su = w && w.sujet && w.sujet.s === nom ? w.sujet : null;
      if (!su) return;
      const sp = D.spr(nom, 'l');
      for (const q of [+a, +b]) {
        const cx = su.x - sp.w / 2 + sp.w * q, cy = su.y - sp.h + sp.h * +hy + camY, an = T * 9;
        for (let k = 0; k < 3; k++) rc(x, '#55586a', cx + Math.cos(an + k * 2.09) * 2.6 - .5, cy + Math.sin(an + k * 2.09) * 2.6 - .5, 1, 1);
      }
    } };
  };

  /* ---- Le tram de Lyon : il glisse sur son gazon, marque l'arret, son pantographe crache une etincelle, et il sonne au drone ---- */
  FX.tram = sc => {
    const i = planFn(sc, 5);
    let x_ = G.VW + 60, sens = -1, v = 60, arret = 0, deja = false, att = .5, son = 0;
    return { plan: i,
      maj(dt) {
        const vit = V.defile(sc, i), sp = D.spr('tram_lyon', 'm'), w = sp.w || 156, dr = V.drone();
        if (att > 0) { att -= dt; if (att <= 0) { sens = Math.random() < .5 ? -1 : 1; x_ = sens < 0 ? G.VW + 40 : -w - 40; v = 60; deja = false; arret = 0; } return; }
        if (arret > 0) { arret -= dt; x_ -= vit * dt; if (arret <= 0) { v = 1; } }
        else {
          if (!deja && x_ > 40 && x_ < 200) { v = Math.max(0, v - 44 * dt); if (v === 0) { arret = rnd(2.5, 4); deja = true; } }
          else v = Math.min(70, v + 24 * dt);
          x_ += (sens * v - vit) * dt;
        }
        son = Math.max(0, son - dt);
        if (dr && son === 0 && dr.y > 120 && dr.x > x_ && dr.x < x_ + w) son = 1.6;
        if (x_ < -w - 60 || x_ > G.VW + 60) att = rnd(1.5, 5);
      },
      draw(x, d, camY, T) {
        if (att > 0) return;
        const sp = D.spr('tram_lyon', 'm');
        if (!sp.ok) return;
        const b = sc.plans[i].y + 41 + camY, Y = b - sp.h, fil = sc.plans[i].y + 4.4 + camY, px = x_ + sp.w * .49;
        rc(x, 'rgba(20,40,20,.34)', x_ + 2, b - .4, sp.w - 4, 2);
        // le pantographe deploye jusqu'au fil
        const mi = (fil + Y + 1) / 2;
        trait(x, K, px - 3, Y + 1, px + 2, mi, 1.2); trait(x, K, px + 2, mi, px - 2, fil + 1, 1.2);
        trait(x, '#55586a', px + 3, Y + 1, px - 2, mi, .8); trait(x, '#55586a', px - 2, mi, px + 2, fil + 1, .8);
        rc(x, K, px - 5, fil, 10, 1.2);
        if (Math.sin(T * 3.1) * Math.sin(T * 7.7) > .78) { rc(x, '#dff4ff', px - 1, fil - 1.4, 2, 2); rc(x, '#8fd0ff', px - 3 + Math.sin(T * 40) * 2, fil - 3, 1, 1); rc(x, '#8fd0ff', px + 2 - Math.sin(T * 33) * 2, fil + 1, 1, 1); }
        x.save(); x.translate(x_ + sp.w / 2, 0); x.scale(sens < 0 ? -1 : 1, 1);
        x.drawImage(sp.img, -sp.w / 2, Y, sp.w, sp.h);
        // a l'arret, les portes s'ouvrent sur la lumiere
        if (arret > 0) for (const a of [70, 170, 270, 350]) { const q = -sp.w / 2 + a * sp.w / 420; rc(x, '#ffe6ae', q + 1.4, Y + sp.h * 18 / 74, 16 * sp.w / 420 * 1.2, sp.h * 36 / 74); }
        x.restore();
        if (son > 0 && (son * 3 | 0) % 2 === 0) { G.txt(x, 'Ding ding !', x_ + sp.w / 2 + 1, Y - 7, K, { al: .5 }); G.txt(x, 'Ding ding !', x_ + sp.w / 2, Y - 8, '#fff', { al: .5 }); }
      } };
  };
  /* ---- Berlin, la foret de Grunewald et ses petits lacs (Max, 07/11/2026 : « de la foret a la place du mur, quelques bouts de
     mur avec des graffeurs de temps en temps ; au second plan des petits lacs avec des personnages qui se baignent ou qui se
     prelassent au soleil, tout nus, des petites feuilles a la place du maillot »). Les plans sont peints par
     outils/monuments_berlin.py, qui note dans leur fiche ou sont les murs (zones.murs) et les lacs (zones.lacs, plages, ponton). */
  const pxl = v => Math.round(v * S) / S;
  // la position a l'ecran d'un point d'un plan qui boucle, donne en pixels de son image
  const ecranPlan = (p, px, d) => { const Lg = p.nw / S; let X = ((px / S - d * p.f) % Lg + Lg) % Lg; if (X > G.VW + 140) X -= Lg; return X; };

  /* Les graffeurs : chacun devant la dalle laissee nue d'un bout de Mur, sa fresque pousse sous la bombe, il salue le drone */
  const COUL_GRAF = [['#ff4a7a', '#ffd23a', '#2ad0c8'], ['#3a8cff', '#ff8a2a', '#f4f0e0'], ['#7ad83a', '#c04ae0', '#ffe94a'], ['#ff5a3a', '#3ac8ff', '#101018']];
  const peindreFresque = (n, W_, H_) => {
    // des blocs penches qui s'emboitent, comme les pieces du mur, jamais de lettres
    const c = G.mk(W_, H_), x = c.x, pal = COUL_GRAF[n % COUL_GRAF.length];
    let bx = 1, k = 0;
    while (bx < W_ - 3) {
      const bw = Math.min(W_ - bx - 1, G.irnd(4, 7)), pen = G.irnd(1, 3), yb = G.irnd(2, 5), hb = H_ - yb - G.irnd(2, 5);
      if (bw < 2) break;
      for (let y = 0; y < hb; y++) {
        const dx = Math.round(pen * (1 - y / hb));
        x.fillStyle = '#14121c'; x.fillRect(bx + dx - 1, yb + y, bw + 2, 1);
        x.fillStyle = pal[(y > hb * .6 ? k + 1 : k) % 3]; x.fillRect(bx + dx, yb + y, bw, 1);
      }
      x.fillStyle = '#14121c'; x.fillRect(bx + pen, yb - 1, bw, 1); x.fillRect(bx, yb + hb, bw, 1);
      x.fillStyle = '#fff'; x.fillRect(bx + pen, yb, Math.max(1, bw >> 1), 1);
      if (k % 2) { x.fillStyle = '#14121c'; x.fillRect(bx + pen + (bw >> 1) - 1, yb + (hb >> 2), 2, hb >> 2); }
      bx += bw + 1; k++;
    }
    return c;
  };
  FX.graffeurs = (sc, arg) => {
    const i = V.plan(sc, 'peint', +(arg || 1)), p = sc.plans[i], e = D.echPlan(p.f), k = e / .92;
    const noms = ['graffeur', 'graffeuse', 'graffeur2', 'graffeuse'];
    // zones.murs : [x0, x1, haut, pied, dalle libre x0, x1, haut, bas], en pixels du plan
    const L_ = ((p.zones && p.zones.murs) || []).map((m, n) => ({ m, d: noms[n % noms.length], fw: m[5] - m[4], fh: m[7] - m[6], img: peindreFresque(n, m[5] - m[4], m[7] - m[6]), prog: G.rnd(.15, .6), v: G.rnd(.05, .09), ph: G.rnd(7), salue: 0, X: undefined }));
    const bombe = [];
    return {
      plan: i, gens: L_, echelle: e,
      maj(dt, d) {
        const dr = V.drone();
        L_.forEach((g, n) => {
          const X = ecranPlan(p, g.m[4], d);
          g.X = X;
          // la fresque repart a zero quand le mur est hors de l'image, sinon elle pousse
          if (X < -60 || X > G.VW + 60) { if (g.prog >= 1) g.prog = G.rnd(.05, .3); return; }
          g.salue = Math.max(0, g.salue - dt);
          if (dr && Math.abs(X - dr.x) < 46 && dr.proche) g.salue = 1.2;
          if (g.salue <= 0) {
            g.prog = Math.min(1, g.prog + g.v * dt);
            if (g.prog < 1 && bombe.length < 40 && Math.random() < .5) bombe.push({ g, dx: G.rnd(-.5, 1.5), dy: G.rnd(-1.5, 1.5), t: 0, d: G.rnd(.25, .5), c: COUL_GRAF[n % 4][G.irnd(0, 2)] });
          }
        });
        for (const q of bombe) { q.t += dt; q.dy -= 3 * dt; q.dx += 5 * dt; }
        while (bombe.length && bombe[0].t > bombe[0].d) bombe.shift();
      },
      draw(x, d, camY, T) {
        x.imageSmoothingEnabled = false;
        for (const g of L_) {
          const X = g.X;
          if (X === undefined || X < -60 || X > G.VW + 60) continue;
          const fx = pxl(X), fy = pxl(p.y + g.m[6] / S + camY), sol = pxl(p.y + g.m[3] / S + camY);
          const part = Math.ceil(g.prog * g.fw);
          if (part > 0) x.drawImage(g.img, 0, 0, part, g.fh, fx, fy, part / S, g.fh / S);
          // il se tient devant la dalle, au bout de sa peinture, la bombe levee
          const gx = pxl(fx + part / S - 2 * k), bras = Math.sin(T * 7 + g.ph);
          x.save(); x.translate(gx, sol); x.scale(e, e);
          G.dollDraw(x, g.d, g.salue > 0 ? 'salut' : 'neutre', T + g.ph, 0, 0, false);
          x.restore();
          if (g.salue <= 0) {
            const c0 = COUL_GRAF[L_.indexOf(g) % 4], bx = gx + 3.4 * k, by = sol - 15 * k + bras * 2 * k;
            V.R(x, '#14121c', bx - .6 * k, by - 1.8 * k, 2.4 * k, 4.2 * k); V.R(x, c0[0], bx, by - 1.2 * k, 1.2 * k, 3 * k);
            V.R(x, '#e0c8a0', gx + .8 * k, by, 2.6 * k, 1.2 * k);
            for (const q of bombe) if (q.g === g) { x.globalAlpha = 1 - q.t / q.d; V.R(x, q.c, pxl(bx + 2 + q.dx * 3), pxl(by - 1 + q.dy * 2), 1 / S, 1 / S); x.globalAlpha = 1; }
          }
        }
      },
    };
  };

  /* Les baigneurs : dessines au pixel par le code, a la taille ou ils s'affichent (1 pixel dessine = 1 pixel affiche), cernes,
     eclaires par l'ambiance du decor ; une feuille de vigne cache ce que cachait le maillot. Les nageurs dans l'eau, les bronzeurs
     sur le sable, un plongeur sur le ponton ; tous saluent le drone qui passe pres d'eux. */
  const PEAUX = [['#f8d8bc', '#ecbe9c', '#cc9876'], ['#f0c6a0', '#dca880', '#b8845e'], ['#d8a274', '#bc8658', '#946240'], ['#a8714a', '#8c5a38', '#6a4028'], ['#7a4e34', '#623c26', '#46291a']];
  const CHEV = ['#2a1c14', '#5a3a22', '#a8743a', '#e6c878', '#cfcfd4', '#9a3a1c', '#16141a'];
  const SERV = [['#e8505e', '#f6f0e2'], ['#3a8cd8', '#f6f0e2'], ['#f2c440', '#e8702c'], ['#38b08a', '#f6f0e2'], ['#a464d4', '#f4c8e6'], ['#ff8c3c', '#3a5ab4']];
  const FEU = ['#245019', '#3f7f27', '#62a83a', '#94cc54'];
  G.FEUILLE_VIGNE = FEU;
  const NOIR = '#141218';
  // une feuille de vigne : trois lobes, sa nervure, un reflet, sa queue
  const vigne = (P, x, y, petite) => {
    if (petite) { P(x, y, 3, 2, FEU[1]); P(x + 1, y + 2, 1, 1, FEU[1]); P(x, y, 1, 1, FEU[3]); P(x + 2, y + 1, 1, 1, FEU[0]); return; }
    P(x, y + 1, 4, 2, FEU[1]); P(x + 1, y, 2, 4, FEU[1]);
    P(x, y, 1, 1, FEU[2]); P(x + 3, y, 1, 1, FEU[2]);
    P(x + 1, y + 1, 1, 1, FEU[3]); P(x + 2, y + 1, 1, 2, FEU[0]);
  };
  const tirerAllure = () => {
    const femme = Math.random() < .5;
    return { pe: G.pick(PEAUX), ch: G.pick(CHEV), femme, coiffe: femme ? G.pick(['long', 'long', 'chignon', 'court', 'frise']) : G.pick(['court', 'court', 'chauve', 'frise']),
      rond: Math.random() < .35, barbe: !femme && Math.random() < .3, lunettes: Math.random() < .3, serv: G.pick(SERV), id: Math.random().toString(36).slice(2, 8) };
  };
  // la tete, de face : 6 pixels de large, le haut en (x, y)
  const teteFace = (P, q, x, y) => {
    const [cl, ba, om] = q.pe;
    P(x, y + 1, 6, 5, ba); P(x + 1, y, 4, 1, ba); P(x + 1, y + 6, 4, 1, ba);
    P(x, y + 2, 1, 3, cl); P(x + 5, y + 2, 1, 3, om);
    if (q.lunettes) { P(x, y + 3, 6, 1, NOIR); P(x + 1, y + 3, 1, 1, '#4a5a6a'); }
    else { P(x + 1, y + 3, 1, 1, NOIR); P(x + 4, y + 3, 1, 1, NOIR); }
    P(x + 2, y + 5, 2, 1, om);
    const c = q.ch;
    if (q.coiffe === 'court') { P(x, y - 1, 6, 2, c); P(x, y + 1, 1, 1, c); P(x + 5, y + 1, 1, 1, c); }
    else if (q.coiffe === 'long') { P(x, y - 1, 6, 2, c); P(x - 1, y + 1, 1, 6, c); P(x + 6, y + 1, 1, 6, c); P(x, y + 1, 1, 1, c); P(x + 5, y + 1, 1, 1, c); }
    else if (q.coiffe === 'chignon') { P(x, y - 1, 6, 2, c); P(x + 2, y - 2, 2, 1, c); }
    else if (q.coiffe === 'frise') { P(x - 1, y - 2, 8, 3, c); P(x - 1, y + 1, 1, 2, c); P(x + 6, y + 1, 1, 2, c); }
    else { P(x, y + 1, 1, 2, '#cfcfd4'); P(x + 5, y + 1, 1, 2, '#cfcfd4'); P(x + 1, y, 1, 1, cl); }
    if (q.barbe) P(x + 1, y + 4, 4, 3, c);
  };
  // la tete de profil, couchee le visage vers le ciel : le haut du crane en (x, y), le nez en l'air
  const teteCouchee = (P, q, x, y) => {
    const [cl, ba, om] = q.pe;
    P(x, y + 1, 6, 4, ba); P(x + 1, y, 4, 1, ba); P(x + 1, y + 5, 4, 1, om);
    P(x + 3, y - 1, 1, 1, ba); P(x + 1, y, 3, 1, cl);
    if (q.lunettes) P(x + 1, y + 1, 3, 1, NOIR); else P(x + 2, y + 1, 1, 1, om);
    const c = q.ch;
    if (q.coiffe === 'chauve') P(x - 1, y + 2, 1, 2, '#cfcfd4');
    else { P(x - 1, y + 1, 2, 4, c); if (q.coiffe === 'long') P(x - 4, y + 3, 4, 2, c); if (q.coiffe === 'frise') P(x - 2, y, 2, 5, c); if (q.coiffe === 'chignon') P(x - 2, y + 2, 1, 2, c); }
    if (q.barbe) P(x + 4, y + 1, 2, 3, c);
  };

  /* Les poses. Chaque peintre recoit P (un rectangle plein), l'allure q et le numero de l'image ; il dessine sur sa toile
     (largeur, hauteur) les pieds (ou la ligne d'eau) sur la derniere rangee utile. */
  const POSES = {
    // debout, de face : 0-1 repos (il respire), 2-3 il salue, 4-5 il s'etire
    debout: { w: 16, h: 34, n: 6, peindre(P, q, f) {
      const [cl, ba, om] = q.pe, b = f === 1 ? 1 : 0;
      teteFace(P, q, 5, 2 + b);
      P(7, 9 + b, 2, 1, om);
      P(3, 10 + b, 10, 2, ba); P(4, 12 + b, 8, 7 - b, ba); P(4, 11 + b, 1, 7, cl); P(11, 11 + b, 1, 8 - b, om);
      if (q.rond) { P(3, 14, 10, 4, ba); P(3, 15, 1, 2, cl); P(12, 14, 1, 4, om); P(8, 16, 1, 1, om); }
      if (q.femme) { P(4, 17, 8, 2, ba); }
      P(4, 19, 3, 13, ba); P(9, 19, 3, 13, ba); P(4, 19, 1, 12, cl); P(11, 19, 1, 13, om); P(7, 19, 2, 2, ba);
      P(3, 32, 4, 1, om); P(9, 32, 4, 1, om);
      const brasG = () => { P(2, 11 + b, 2, 8, ba); P(2, 11 + b, 1, 7, cl); P(2, 19 + b, 2, 1, cl); };
      const brasD = () => { P(12, 11 + b, 2, 8, ba); P(13, 11 + b, 1, 8, om); P(12, 19 + b, 2, 1, ba); };
      if (f <= 1) { brasG(); brasD(); }
      else if (f <= 3) { brasG(); const h = f === 2 ? 13 : 11; P(12, 4, 2, 7, ba); P(13, 4, 1, 7, om); P(h, 2, 2, 2, ba); }
      else { const h = f === 4 ? 0 : 1; P(2, 2 + h, 2, 9 - h, ba); P(2, 2 + h, 1, 8 - h, cl); P(12, 2 + h, 2, 9 - h, ba); P(13, 2 + h, 1, 9 - h, om); }
      if (q.femme) { vigne(P, 5, 12 + b, true); vigne(P, 8, 12 + b, true); }
      vigne(P, 6, 18, false);
    } },
    // couche sur le dos, la tete a gauche, sur sa serviette : 0-1 il respire, 2 un genou leve, 3-4 il salue
    dos: { w: 36, h: 12, n: 5, peindre(P, q, f) {
      const [cl, ba, om] = q.pe, [s0, s1] = q.serv;
      P(0, 10, 36, 2, s0); for (let k = 2; k < 36; k += 5) P(k, 10, 2, 2, s1);
      teteCouchee(P, q, 2, 4);
      P(8, 7, 1, 2, om);
      const r = f === 1 ? 1 : 0;
      P(9, 6 - r, 12, 4 + r, ba); P(9, 6 - r, 12, 1, cl); P(9, 9, 12, 1, om);
      if (q.rond) { P(13, 5 - r, 6, 1, ba); P(14, 4 - r, 4, 1, cl); }
      if (f === 2) { P(21, 7, 5, 3, ba); P(24, 4, 3, 3, ba); P(26, 2, 2, 3, ba); P(27, 4, 2, 4, ba); P(28, 7, 4, 3, ba); P(26, 2, 2, 1, cl); P(31, 6, 2, 4, ba); }
      else { P(21, 7, 12, 3, ba); P(21, 7, 12, 1, cl); P(21, 9, 12, 1, om); }
      P(33, 4, 2, 6, ba); P(33, 4, 1, 1, cl);
      if (f >= 3) { const h = f === 3 ? 11 : 13; P(11, 0, 2, 6, ba); P(h, 0, 2, 1, cl); }
      else { P(10, 9, 9, 1, om); }
      if (q.femme) { P(11, 5 - r, 2, 1, ba); P(14, 5 - r, 2, 1, ba); vigne(P, 10, 3 - r, true); vigne(P, 14, 3 - r, true); }
      vigne(P, 19, 3, false);
    } },
    // couche sur le ventre, appuye sur les coudes, il lit ; ses pieds battent l'air en alternance (4 images), 4-5 il salue
    ventre: { w: 36, h: 12, n: 6, peindre(P, q, f) {
      const [cl, ba, om] = q.pe, [s0, s1] = q.serv;
      P(0, 10, 36, 2, s0); for (let k = 2; k < 36; k += 5) P(k, 10, 2, 2, s1);
      teteFace(P, q, 4, 1);
      if (f < 4) { P(0, 6, 5, 1, '#c84a3a'); P(0, 7, 5, 2, '#f4f0e0'); P(2, 7, 1, 2, '#c8c0b0'); }
      P(5, 8, 6, 2, ba); P(5, 8, 6, 1, cl);
      P(10, 7, 10, 3, ba); P(10, 7, 10, 1, cl); P(10, 9, 10, 1, om);
      P(20, 6, 4, 4, ba); P(21, 5, 2, 1, ba);
      vigne(P, 19, 4, false);
      P(24, 7, 5, 3, ba); P(24, 7, 5, 1, cl);
      const jambe = (a, dy) => {
        // le bas de la jambe depuis le genou (29, 8) : a = 0 couche, 1 a moitie leve, 2 dresse
        if (a === 0) { P(29, 7 + dy, 5, 2, ba); P(34, 6 + dy, 1, 3, ba); }
        else if (a === 1) { P(29, 6, 2, 2, ba); P(30, 4, 2, 2, ba); P(31, 2, 2, 2, ba); P(32, 1, 2, 1, ba); }
        else { P(28, 2, 2, 6, ba); P(29, 1, 2, 1, ba); }
      };
      const a = [[0, 2], [1, 1], [2, 0], [1, 1], [0, 0], [0, 0]][f];
      jambe(a[0], 0); jambe(a[1], 0);
      if (f >= 4) { const h = f === 4 ? 2 : 4; P(3, 0, 2, 6, ba); P(h, 0, 2, 1, cl); }
    } },
    // assis sur sa serviette, appuye en arriere sur une main, les jambes allongees : 0-1 repos, 2-3 il salue
    assis: { w: 28, h: 18, n: 4, peindre(P, q, f) {
      const [cl, ba, om] = q.pe, [s0, s1] = q.serv;
      P(0, 16, 28, 2, s0); for (let k = 1; k < 28; k += 5) P(k, 16, 2, 2, s1);
      teteFace(P, q, 4, 1 + (f === 1 ? 1 : 0));
      P(6, 8, 2, 1, om);
      P(4, 9, 7, 7, ba); P(4, 9, 1, 6, cl); P(10, 10, 1, 6, om);
      if (q.rond) { P(9, 11, 3, 4, ba); }
      P(2, 9, 2, 7, ba); P(2, 9, 1, 6, cl);
      P(11, 13, 13, 3, ba); P(11, 13, 13, 1, cl); P(11, 15, 13, 1, om); P(24, 11, 2, 5, ba);
      if (f >= 2) { const h = f === 2 ? 11 : 13; P(11, 2, 2, 8, ba); P(h, 1, 2, 1, cl); }
      else { P(10, 10, 2, 5, ba); }
      if (q.femme) { vigne(P, 5, 10, true); }
      vigne(P, 9, 12, false);
    } },
    // dans l'eau jusqu'aux epaules, la brasse (4 images), 4-5 il salue ; la derniere rangee est la ligne d'eau
    nage: { w: 18, h: 11, n: 6, eau: true, peindre(P, q, f) {
      const [cl, ba, om] = q.pe, b = f === 1 || f === 2 ? 1 : 0;
      teteFace(P, q, 6, 1 + b);
      P(4, 9, 10, 2, ba); P(4, 9, 10, 1, cl);
      const mains = [[7, 9], [4, 2], [1, 15], [4, 10]][f % 4];
      if (f < 4) { P(mains[0], 9, 2, 1, cl); P(18 - mains[0] - 2, 9, 2, 1, ba); }
      else { const h = f === 4 ? 15 : 13; P(13, 2, 2, 8, ba); P(h, 1, 2, 2, cl); }
    } },
    // la planche : le visage tourne vers le ciel, les cheveux etales sur l'eau, les mains, le ventre et les orteils qui depassent
    planche: { w: 30, h: 7, n: 2, eau: true, peindre(P, q, f) {
      const [cl, ba, om] = q.pe, b = f, c = q.coiffe === 'chauve' ? '#cfcfd4' : q.ch;
      P(0, 6, 4, 1, c); P(1, 5, 2, 1, c); if (q.coiffe === 'long' || q.coiffe === 'frise') P(0, 5, 1, 2, c);
      P(2, 4 + b, 6, 3 - b, ba); P(3, 3 + b, 4, 1, ba); P(3, 3 + b, 2, 1, cl); P(6, 2 + b, 1, 1, ba);
      if (q.lunettes) P(4, 3 + b, 2, 1, NOIR); else P(4, 3 + b, 1, 1, om);
      P(8, 6, 1, 1, ba);
      P(9, 5 + b, 11, 2 - b, ba); P(12, 4 + b, 6, 1, ba); P(13, 4 + b, 3, 1, cl);
      if (q.rond) { P(12, 3 + b, 5, 1, ba); P(13, 3 + b, 2, 1, cl); }
      if (q.femme) { vigne(P, 9, 3 + b, true); vigne(P, 13, 2 + b, true); }
      vigne(P, 18, 3 + b, false);
      P(11, 6, 1, 1, cl); P(21, 6, 1, 1, cl);
      P(25, 4 + b, 1, 3 - b, ba); P(27, 4 + b, 1, 3 - b, ba); P(25, 4 + b, 1, 1, cl); P(27, 4 + b, 1, 1, cl);
    } },
    // le plongeur en boule : il fait un saut perilleux, un quart de tour par image (tourner de 90 degres ne perd aucun pixel)
    bombe: { w: 14, h: 14, n: 4, peindre(P0, q, f) {
      const [cl, ba, om] = q.pe;
      const P = f === 0 ? P0 : f === 1 ? (a, b, w, h, c) => P0(14 - b - h, a, h, w, c) : f === 2 ? (a, b, w, h, c) => P0(14 - a - w, 14 - b - h, w, h, c) : (a, b, w, h, c) => P0(b, 14 - a - w, h, w, c);
      P(3, 4, 9, 8, ba); P(4, 3, 7, 10, ba); P(3, 5, 1, 5, cl); P(11, 5, 1, 6, om);
      teteFace(P, q, 4, 0);
      P(8, 8, 4, 4, cl); P(11, 9, 1, 3, om);
      P(2, 8, 3, 2, ba); P(2, 8, 1, 1, cl);
      vigne(P, 4, 9, false);
    } },
  };
  const cacheBaigneurs = new Map();
  // une image d'une pose : peinte, cernee de sombre (pas sur la ligne d'eau), eclairee par l'ambiance du decor
  const imageBaigneur = (pose, q, f, amb) => {
    const k = pose + q.id + f + amb;
    let c = cacheBaigneurs.get(k);
    if (c) return c;
    const PO = POSES[pose], m = G.mk(PO.w + 2, PO.h + 2), x = m.x;
    const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a + 1, b + 1, w, h); };
    PO.peindre(P, q, f);
    const im = x.getImageData(0, 0, m.width, m.height), a = im.data, W = m.width, H = m.height, plein = new Uint8Array(W * H);
    for (let i = 0; i < plein.length; i++) { plein[i] = a[i * 4 + 3] > 100 ? 1 : 0; a[i * 4 + 3] = plein[i] ? 255 : 0; }
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) {
      const i = y * W + X;
      if (plein[i] || (PO.eau && y >= PO.h)) continue;
      if ((X > 0 && plein[i - 1]) || (X < W - 1 && plein[i + 1]) || (y > 0 && plein[i - W]) || (y < H - 1 && plein[i + W])) { a[i * 4] = 23; a[i * 4 + 1] = 21; a[i * 4 + 2] = 31; a[i * 4 + 3] = 255; }
    }
    x.putImageData(im, 0, 0);
    c = amb && G.AMB && G.AMB[amb] ? D.eclairer(m, amb) : m;
    c.pose = pose;
    if (cacheBaigneurs.size > 1500) cacheBaigneurs.clear();
    cacheBaigneurs.set(k, c);
    return c;
  };
  G.imageBaigneur = imageBaigneur;
  G.POSES_BAIGNEURS = POSES;

  FX.baigneurs = (sc, arg) => {
    const i = V.plan(sc, 'peint', +(arg || 2)), p = sc.plans[i], z = p.zones || {}, amb = sc.m.amb, Lg = p.nw / S;
    const lacs = z.lacs || [], plages = z.plages || [], gens = [], reflets = [], gouttes = [];
    // l'eau libre d'un lac a une abscisse donnee : [haut, bas] en pixels du plan, ou null (la fiche saute les roseaux et le ponton)
    const eauA = (l, px) => {
      for (let k = 0; k + 1 < l.length; k++) if (l[k][0] <= px && px <= l[k + 1][0] && l[k + 1][0] - l[k][0] <= 9) { const t = (px - l[k][0]) / (l[k + 1][0] - l[k][0]); return [l[k][1] + (l[k + 1][1] - l[k][1]) * t, l[k][2] + (l[k + 1][2] - l[k][2]) * t]; }
      return null;
    };
    // on peut nager a cette abscisse, sur cette rangee : de l'eau libre au-dessus (la tete) et dessous (la ligne d'eau)
    const libreA = (l, px, rang) => { const e = eauA(l, px); return e && e[0] <= rang - 8 && e[1] >= rang + 1; };
    // la bande ou l'on nage : sous la rive d'en face, au-dessus du sol du premier plan qui cache le bas du lac
    const VISIBLE = 42;
    lacs.forEach((l, n) => {
      if (l.length < 4) return;
      const x0 = l[0][0] + 26, x1 = l[l.length - 1][0] - 26;
      const nb = 2 + (n % 2);
      for (let k = 0; k < nb; k++) {
        const planche = k === 2, w = POSES[planche ? 'planche' : 'nage'].w;
        let px = 0, rang = 0, essai = 0;
        for (; essai < 40; essai++) {
          px = G.rnd(x0, x1 - w); const c = px + 1 + w / 2, e = eauA(l, c);
          if (!e) continue;
          rang = Math.round(Math.min(VISIBLE, e[0] + G.rnd(8, 18)));
          if (libreA(l, c, rang) && libreA(l, c - w / 2 - 3, rang) && libreA(l, c + w / 2 + 3, rang)) break;
        }
        if (essai >= 40) continue;
        gens.push({ pose: planche ? 'planche' : 'nage', q: tirerAllure(), lac: l, px, rang, v: planche ? G.rnd(.6, 1.4) * (Math.random() < .5 ? 1 : -1) : G.rnd(5, 9) * (Math.random() < .5 ? 1 : -1), t: G.rnd(4), salue: 0, ph: G.rnd(6) });
      }
    });
    const PLAT = ['dos', 'dos', 'ventre', 'assis', 'dos', 'ventre', 'assis', 'debout'];
    plages.forEach(([a, b, y], n) => {
      const pose = PLAT[n % PLAT.length], w = POSES[pose].w;
      if (b - a < w + 4) return;
      gens.push({ pose, q: tirerAllure(), px: Math.round(G.rnd(a, b - w)), rang: y, flip: Math.random() < .5, t: G.rnd(10), salue: 0, ph: G.rnd(6), repos: G.rnd(2, 6) });
    });
    // le plongeur du ponton : debout, il s'elance, fait la bombe, nage jusqu'a l'echelle et remonte
    const po = z.ponton;
    const plongeur = po ? { pose: 'debout', q: tirerAllure(), etat: 'attend', T: G.rnd(1, 3), px: po[0] - 10, rang: po[1], salue: 0, ph: 0, t: 0 } : null;
    if (plongeur) { plongeur.q.rond = false; gens.push(plongeur); }
    const quelImage = (g, T) => {
      const s = g.salue > 0;
      if (g.pose === 'nage') return s ? 4 + ((T * 4) | 0) % 2 : ((g.t * 2.2) | 0) % 4;
      if (g.pose === 'planche') return ((T * 1.2 + g.ph) | 0) % 2;
      if (g.pose === 'debout') return g.etat === 'elan' ? 4 + (((T * 6) | 0) % 2) : s ? 2 + ((T * 4) | 0) % 2 : ((T * .8 + g.ph) | 0) % 2;
      if (g.pose === 'dos') return s ? 3 + ((T * 4) | 0) % 2 : (g.t % 9 > 7 ? 2 : ((T * .7 + g.ph) | 0) % 2);
      if (g.pose === 'ventre') return s ? 4 + ((T * 4) | 0) % 2 : ((T * 3 + g.ph) | 0) % 4;
      if (g.pose === 'assis') return s ? 2 + ((T * 4) | 0) % 2 : ((T * .5 + g.ph) | 0) % 2;
      if (g.pose === 'bombe') return ((T * 7) | 0) % 4;
      return 0;
    };
    let dCour = 0;
    return {
      plan: i, gens,
      maj(dt, d) {
        dCour = d;
        const dr = V.drone();
        for (const g of gens) {
          g.t += dt;
          g.salue = Math.max(0, g.salue - dt);
          if (g.pose === 'nage' || g.pose === 'planche') {
            // il nage dans son lac, fait demi-tour pres de la rive
            if (g.lac) {
              g.px += g.v * dt;
              if (!libreA(g.lac, g.px + 1 + POSES[g.pose].w / 2 + Math.sign(g.v) * (POSES[g.pose].w / 2 + 3), g.rang)) g.v = -g.v;
            }
          }
          if (g === plongeur) {
            g.T -= dt;
            if (g.etat === 'attend' && g.T <= 0) { g.etat = 'elan'; g.T = .9; }
            else if (g.etat === 'elan' && g.T <= 0) { g.etat = 'saut'; g.T = .8; g.pose = 'bombe'; g.x0 = g.px; }
            else if (g.etat === 'saut') {
              const u = 1 - g.T / .8;
              g.px = g.x0 + 4 + u * 22; g.saut = Math.sin(u * Math.PI) * 18 - u * 10;
              if (g.T <= 0) {
                g.etat = 'dessous'; g.T = 1.1; g.saut = 0;
                for (let k = 0; k < 16; k++) gouttes.push({ px: g.px + 7, rang: po[1] + 8, vx: G.rnd(-14, 14), vy: G.rnd(-46, -18), t: 0 });
              }
            }
            else if (g.etat === 'dessous' && g.T <= 0) { g.etat = 'retour'; g.pose = 'nage'; g.rang = po[1] + 9; g.v = -7; }
            else if (g.etat === 'retour' && g.px <= po[2] - 2) { g.etat = 'monte'; g.T = .8; }
            else if (g.etat === 'retour') g.px += g.v * dt;
            else if (g.etat === 'monte' && g.T <= 0) { g.etat = 'attend'; g.T = G.rnd(3, 7); g.pose = 'debout'; g.rang = po[1]; g.px = po[0] - 10; }
          }
          // il salue le drone qui passe pres de lui, pas trop haut
          if (dr && g.salue <= 0 && g.etat !== 'saut' && g.etat !== 'dessous') {
            const X = ecranPlan(p, g.px, d);
            if (Math.abs(X - dr.x) < 40 && dr.y > 70 && Math.random() < dt * 3) g.salue = G.rnd(1.2, 2);
          }
        }
        for (const q of gouttes) { q.t += dt; q.px += q.vx * dt; q.vy += 120 * dt; q.rang += q.vy * dt; }
        while (gouttes.length && gouttes[0].t > .7) gouttes.shift();
        // des eclats de soleil qui scintillent sur l'eau
        if (lacs.length && reflets.length < 26 && Math.random() < dt * 14) {
          const l = G.pick(lacs);
          if (l.length > 2) {
            const px = G.rnd(l[0][0] + 8, l[l.length - 1][0] - 8), e = eauA(l, px);
            if (e && e[0] + 4 < Math.min(e[1], VISIBLE)) reflets.push({ px, rang: Math.round(G.rnd(e[0] + 4, Math.min(e[1], VISIBLE))), t: 0, d: G.rnd(.4, 1.1), w: G.irnd(1, 3) });
          }
        }
        for (const r of reflets) r.t += dt;
        for (let k = reflets.length - 1; k >= 0; k--) if (reflets[k].t > reflets[k].d) reflets.splice(k, 1);
      },
      draw(x, d, camY, T) {
        x.imageSmoothingEnabled = false;
        const Y = rang => p.y + rang / S + camY;
        for (const r of reflets) {
          const X = ecranPlan(p, r.px, d);
          if (X < -4 || X > G.VW + 4) continue;
          x.globalAlpha = Math.sin(r.t / r.d * Math.PI) * .9;
          V.R(x, '#f4fcff', pxl(X), pxl(Y(r.rang)), r.w / S, 1 / S);
          x.globalAlpha = 1;
        }
        const tri = gens.slice().sort((a, b) => a.rang - b.rang);
        for (const g of tri) {
          if (g === plongeur && (g.etat === 'dessous' || g.etat === 'monte')) {
            if (g.etat === 'dessous') {
              const X = ecranPlan(p, g.px + 7, d);
              for (let k = 0; k < 3; k++) { x.globalAlpha = .7; V.R(x, '#e8f8ff', pxl(X + Math.sin(T * 5 + k * 2) * 2), pxl(Y(po[1] + 9) - ((T * 12 + k * 3) % 5) / S), 1 / S, 1 / S); x.globalAlpha = 1; }
            }
            continue;
          }
          const img = imageBaigneur(g.pose, g.q, quelImage(g, T), amb), PO = POSES[g.pose];
          const X = ecranPlan(p, g.px, d), w = img.width / S, h = img.height / S;
          if (X < -w - 4 || X > G.VW + 4) continue;
          const bas = Y(g.rang) - (g.saut || 0) / S;
          const yy = pxl(bas - (PO.h + 1) / S), xx = pxl(X);
          const flip = g.pose === 'nage' || g.pose === 'planche' ? g.v < 0 : g.flip;
          if (flip) { x.save(); x.translate(xx + w, yy); x.scale(-1, 1); x.drawImage(img, 0, 0, w, h); x.restore(); }
          else x.drawImage(img, xx, yy, w, h);
          // les rides autour de qui est dans l'eau, qui s'ouvrent au rythme de la brasse
          if (PO.eau) {
            const u = (g.t * 1.1) % 1, l = (PO.w * .5 + 2 + u * 6) / S, cx = xx + w / 2, ly = pxl(bas);
            x.globalAlpha = .75 * (1 - u);
            V.R(x, '#eafaff', pxl(cx - l), ly, 3 / S, 1 / S); V.R(x, '#eafaff', pxl(cx + l - 3 / S), ly, 3 / S, 1 / S);
            x.globalAlpha = .55;
            V.R(x, '#d8f0f8', pxl(cx - PO.w * .4 / S), ly, PO.w * .8 / S, 1 / S);
            x.globalAlpha = 1;
          }
        }
        for (const q of gouttes) {
          const X = ecranPlan(p, q.px, d);
          x.globalAlpha = 1 - q.t / .7;
          V.R(x, '#f0fbff', pxl(X), pxl(Y(q.rang)), 1 / S, 2 / S);
          x.globalAlpha = 1;
        }
      },
    };
  };

})();
