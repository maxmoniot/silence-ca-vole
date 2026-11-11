/* Le decor reagit au drone : ce que Max prefere. Le souffle soulève ce qu'il y a au sol, les oiseaux posés s'envolent,
   les volees et les papillons s'ecartent, le sillage marque l'eau. Ajoute a chaque decor selon le terrain, sans rien changer au jeu. */
'use strict';
(function () {
  const { rnd, pick, irnd } = G;
  const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const W_ = () => G.Jeu.w();
  const vitesse = () => { const W = W_(); return W ? W.v * W.ech : 120; };
  // a quel point le drone rase le sol : 0 loin, 1 au ras
  // sans heros a l'image (la vue d'un decor depuis le carnet), le decor ne reagit a rien
  const ras = (haut = 46) => { const W = W_(); return W && W.vivant && !W.sansHeros ? Math.max(0, (W.y - (G.SOL - haut)) / haut) : 0; };
  const drone = () => { const W = W_(); return W && W.vivant && !W.sansHeros ? { x: G.Jeu.HX + (W.heroDx || 0), y: W.y - 14 } : null; };

  const SABLE = { egypte: 1, tunisie: 1, tatooine: 1, australie: 1, camargue: 1, puy: 1, niger: 1, maroc: 1 };
  const matiere = sc => {
    const def = sc.def;
    if (sc.type === 'eau') return 'fond';
    if (def.flotte) return 'eau';
    if (sc.type === 'int' && !def.pleinAir) return 'poussiere';
    if (def.r === 'alpes' && sc.m.c_sol[2] > 150) return 'neige';
    if (SABLE[def.r] || /^(cap_manchots|aus_|tu_|eg_|sjdm|deauville|ha_plage|marseille)/.test(def.id)) return 'sable';
    // sinon, c'est la couleur du sol qui le dit
    const c = sc.m.c_sol;
    return c[1] > c[0] + 4 && c[1] >= c[2] ? 'herbe' : 'poussiere';
  };
  const TONS = {
    sable: ['#efdcae', '#d8bd86', '#c4a56e'], neige: ['#ffffff', '#e8f2fb', '#c8dcee'], herbe: ['#6fa84a', '#8fc05a', '#4f8a3c', '#b8cc68'],
    poussiere: ['#cfc8bc', '#a8a298', '#8a857c'], eau: ['#ffffff', '#d8f4ff', '#9fdcf4'], fond: ['#d8e8d0', '#b8d0b8', '#9ab8a8'],
  };

  /* Le souffle : quand le drone rase le sol, ca vole sous lui. Sur l'eau : une gerbe et un sillage. */
  function souffle(sc) {
    const m = matiere(sc), tons = TONS[m], p = [], rides = [];
    let acc = 0, tRide = 0;
    return {
      couche: 'avant',
      maj(dt) {
        const k = ras(m === 'eau' ? 38 : 46), v = vitesse(), d = drone();
        if (d && k > 0) {
          acc += dt * k * (m === 'eau' ? 90 : 60);
          while (acc > 1 && p.length < 70) {
            acc--;
            const fin = m === 'neige' || m === 'sable' || m === 'poussiere';
            p.push({ x: d.x + rnd(-15, 15), y: G.SOLF + rnd(-1, 2), vx: rnd(-90, 20) - v * .3, vy: -rnd(40, m === 'eau' ? 150 : 110) * (.5 + k * .6), T: rnd(.35, .8), t0: 0, c: pick(tons), s: fin ? pick([1, 1, 2]) : m === 'herbe' ? 2 : pick([1, 2]) });
          }
          if (m === 'eau') { tRide -= dt; if (tRide <= 0) { tRide = .11; rides.push({ x: d.x, r: 3, T: .8 }); } }
        }
        for (const q of p) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (m === 'herbe' ? 150 : 240) * dt; q.T -= dt; q.t0 += dt; }
        for (let i = p.length - 1; i >= 0; i--) if (p[i].T <= 0 || p[i].y > G.SOLF + 6) p.splice(i, 1);
        for (const q of rides) { q.x -= v * dt; q.r += 46 * dt; q.T -= dt; }
        for (let i = rides.length - 1; i >= 0; i--) if (rides[i].T <= 0) rides.splice(i, 1);
      },
      draw(x, d, camY) {
        for (const q of rides) {
          const a = Math.min(.7, q.T);
          x.fillStyle = `rgba(255,255,255,${a})`;
          x.fillRect(q.x - q.r, G.SOLF + 2 + camY - q.r * .1, q.r * .55, 1);
          x.fillRect(q.x + q.r * .45, G.SOLF + 2 + camY - q.r * .1, q.r * .55, 1);
        }
        for (const q of p) R(x, q.c, q.x, q.y + camY, q.s, q.s === 2 && m === 'herbe' ? 1 : q.s);
      },
    };
  }

  /* Des oiseaux poses au sol : ils picorent, et s'envolent quand le drone arrive */
  const PLUMES = { paris: ['#7f8592', '#5f6470', '#c8ccd4'], metro: ['#7f8592', '#5f6470', '#c8ccd4'], normandie: ['#8a6a48', '#5f4a34', '#d8c8a8'], irlande: ['#3a3a44', '#22222a', '#6a6a74'], deauville: ['#f4f4f0', '#b8c0c8', '#ffb545'], mediterranee: ['#f4f4f0', '#b8c0c8', '#ffb545'], afriquesud: ['#f4f4f0', '#b8c0c8', '#ffb545'], camargue: ['#8a7a58', '#5f5238', '#d8ccae'], egypte: ['#b89a6a', '#7f6840', '#e8d8b0'], tunisie: ['#b89a6a', '#7f6840', '#e8d8b0'], tatooine: ['#a88a60', '#6f5a3c', '#d8c8a0'], hawaii: ['#d8483a', '#8a2a20', '#f4d060'], caledonie: ['#5a7ac8', '#2f4a8a', '#f4f0d0'], reunion: ['#c8a040', '#7a5a20', '#f4e8b0'], alpes: ['#2c2c34', '#17151f', '#5a5a66'], stade: ['#7f8592', '#5f6470', '#c8ccd4'], puy: ['#7f8592', '#5f6470', '#c8ccd4'], australie: ['#f4f4f0', '#b8c0c8', '#ffb545'], madagascar: ['#c8a040', '#7a5a20', '#f4e8b0'], niger: ['#b89a6a', '#7f6840', '#e8d8b0'], maroc: ['#7f8592', '#5f6470', '#c8ccd4'], russie: ['#7f8592', '#5f6470', '#c8ccd4'], londres: ['#7f8592', '#5f6470', '#c8ccd4'], canada: ['#7f8592', '#5f6470', '#c8ccd4'] };
  function nuee(sc) {
    const c = PLUMES[sc.def.r] || PLUMES.paris;
    let t = rnd(3, 9), b = null;
    return {
      couche: 'sol',
      maj(dt) {
        const v = vitesse(), W = W_();
        t -= dt;
        if (!b && t <= 0) {
          const n = irnd(4, 9);
          b = { x: G.VW + 30, l: [], parti: false };
          for (let i = 0; i < n; i++) b.l.push({ dx: rnd(-26, 26), dy: rnd(-1, 3), ph: rnd(6), x: 0, y: 0, vx: 0, vy: 0 });
          t = rnd(7, 18);
        }
        if (!b) return;
        b.x -= v * dt;
        const d = drone();
        if (!b.parti && d && Math.abs(b.x - d.x) < 86 && W.y > G.SOL - 130) {
          b.parti = true;
          for (const q of b.l) { q.vx = rnd(-30, 80) + (q.dx > 0 ? 30 : -30); q.vy = -rnd(90, 170); }
          G.Audio && G.Audio.sfx && Math.random() < .01 && 0;
        }
        for (const q of b.l) if (b.parti) { q.x += (q.vx + v * .55) * dt; q.y += q.vy * dt; q.vy = Math.max(-130, q.vy - 30 * dt); q.vx += rnd(-40, 40) * dt; }
        if (b.x < -60 && (!b.parti || b.l.every(q => q.y < -G.SOLF))) b = null;
        else if (b.x < -400) b = null;
      },
      draw(x, d, camY, T) {
        if (!b) return;
        for (const q of b.l) {
          const X = b.x + q.dx + q.x, Y = G.SOLF + q.dy + q.y + camY;
          if (X < -6 || X > G.VW + 6) continue;
          if (!b.parti) {
            const pique = Math.sin(T * 3 + q.ph) > .7;
            R(x, 'rgba(0,0,0,.22)', X - 1, Y + .6, 5, 1);
            R(x, c[1], X, Y - 3, 3.4, 3); R(x, c[0], X + .4, Y - 3.4, 2.6, 1.6);
            R(x, c[0], X + 2.6, pique ? Y - 2 : Y - 4.4, 1.8, 1.8); R(x, c[2], X + 4, pique ? Y - 1 : Y - 3.6, .8, .7);
          } else {
            const haut = Math.sin(T * 22 + q.ph) > 0;
            R(x, c[1], X, Y - 1.4, 3.4, 1.6);
            R(x, c[0], X - 2.2, haut ? Y - 3 : Y - .4, 2.4, 1); R(x, c[0], X + 3.2, haut ? Y - 3 : Y - .4, 2.4, 1);
          }
        }
      },
    };
  }

  /* Une volee qui traverse le ciel : elle se fend autour du drone, puis se referme, comme le banc de poissons */
  function volee(sc) {
    const n = 9, p = [], plafond = Math.max(50, Math.min(sc.hy || 110, 130));
    const c = sc.m.nuit ? '#141424' : '#23262f';
    let cx = G.VW + rnd(600, 2400), cy = rnd(26, plafond);
    for (let i = 0; i < n; i++) p.push({ dx: rnd(-40, 40), dy: rnd(-16, 16), ex: 0, ey: 0, ph: rnd(6) });
    return {
      couche: 'avant',
      maj(dt) {
        const d = drone();
        cx -= (vitesse() * .32 + 26) * dt;
        if (cx < -80) { cx = G.VW + rnd(1500, 4000); cy = rnd(26, plafond); }
        if (!d) return;
        for (const f of p) {
          const ax = cx + f.dx + f.ex - d.x, ay = cy + f.dy + f.ey - d.y, q = ax * ax + ay * ay;
          if (q < 2600) { const l = Math.sqrt(q) + 1; f.ex += ax / l * 190 * dt; f.ey += ay / l * 190 * dt; }
          f.ex *= 1 - dt * 1.1; f.ey *= 1 - dt * 1.1;
        }
      },
      draw(x, d, camY, T) {
        for (const f of p) {
          const X = cx + f.dx + f.ex, Y = cy + f.dy + f.ey + Math.sin(T * 2 + f.ph) * 1.5;
          const h = Math.sin(T * 16 + f.ph) > 0 ? 1 : 0;
          R(x, c, X, Y, 1.8, 1.2); R(x, c, X - 2.4, Y - h - .4, 2.6, 1); R(x, c, X + 1.6, Y - h - .4, 2.6, 1); R(x, c, X - 3.6, Y - h * 2 + .2, 1.4, 1); R(x, c, X + 4, Y - h * 2 + .2, 1.4, 1);
        }
      },
    };
  }

  /* Des papillons au ras des fleurs : ils fuient et reviennent */
  function papillons(sc) {
    const p = [], tons = ['#ffd23c', '#ff8a5a', '#f4f0ff', '#7fc8ff', '#ff7ab0'];
    for (let i = 0; i < 4; i++) p.push({ x: rnd(G.VW), y: rnd(150, G.SOLF - 8), ex: 0, ey: 0, ph: rnd(6), c: pick(tons), v: rnd(.86, 1) });
    return {
      couche: 'avant',
      maj(dt) {
        const d = drone(), v = vitesse();
        for (const f of p) {
          f.x -= v * f.v * dt;
          if (f.x + f.ex < -8) { f.x = G.VW + rnd(40, 700); f.ex = 0; f.ey = 0; f.y = rnd(150, G.SOLF - 8); }
          if (d) { const ax = f.x + f.ex - d.x, ay = f.y + f.ey - d.y, q = ax * ax + ay * ay; if (q < 1500) { const l = Math.sqrt(q) + 1; f.ex += ax / l * 170 * dt; f.ey += ay / l * 170 * dt; } }
          f.ex *= 1 - dt * .9; f.ey *= 1 - dt * .9;
        }
      },
      draw(x, d, camY, T) {
        for (const f of p) {
          const X = f.x + f.ex + Math.sin(T * 2.3 + f.ph) * 3, Y = f.y + f.ey + Math.sin(T * 3.4 + f.ph) * 3 + camY * .5, h = Math.sin(T * 24 + f.ph) > 0;
          // deux ailes qui s'ouvrent et se ferment, un corps sombre : un papillon, pas un pixel perdu
          const l = h ? 2.6 : 1.2;
          R(x, '#17151f', X - l - .5, Y - 2.2, 2 * l + 1.8, 3.4);
          R(x, f.c, X - l, Y - 1.8, l, 2.6); R(x, f.c, X + .8, Y - 1.8, l, 2.6); R(x, '#17151f', X, Y - 2, .8, 3);
        }
      },
    };
  }

  /* Ce qui traine par terre : le souffle le souleve, ca tournoie, ca retombe plus loin */
  const DEBRIS = { paris: ['#f4f0e0', '#e8e0c8', '#d0c8b0'], metro: ['#f4f0e0', '#c8d0e0'], stade: ['#ffffff', '#d8dce4'], regie: ['#f4f0e0', '#c8ccd4'] };
  function debris(sc) {
    const tons = DEBRIS[sc.def.r];
    const p = [];
    for (let i = 0; i < 7; i++) p.push({ x: rnd(G.VW * 1.8), h: 0, vh: 0, vx: 0, ph: rnd(6), c: pick(tons), dy: rnd(0, 6) });
    return {
      couche: 'sol',
      maj(dt) {
        const d = drone(), v = vitesse(), k = ras(62);
        for (const f of p) {
          f.x -= (v - f.vx) * dt;
          if (f.x < -8) { f.x = G.VW + rnd(10, 400); f.h = 0; f.vh = 0; f.vx = 0; }
          if (d && k > 0 && Math.abs(f.x - d.x) < 26 && f.h < 8) { f.vh = rnd(70, 150) * (.5 + k); f.vx = rnd(v * .4, v * .9); }
          if (f.h > 0 || f.vh > 0) {
            f.h += f.vh * dt; f.vh -= 150 * dt; f.vx *= 1 - dt * .9;
            if (f.vh < -26) f.vh = -26;
            if (f.h <= 0) { f.h = 0; f.vh = 0; f.vx = 0; }
          }
        }
      },
      draw(x, d, camY, T) {
        for (const f of p) {
          const tourne = f.h > 0 && Math.sin(T * 12 + f.ph) > 0;
          // une feuille de papier : un rectangle clair, ombre dessous quand elle est posee
          const X = f.x + (f.h > 0 ? Math.sin(T * 4 + f.ph) * 3 : 0), Y = G.SOLF + f.dy - f.h + camY;
          if (!f.h) R(x, 'rgba(0,0,0,.25)', X, Y + 1, 4.4, .8);
          R(x, f.c, X, Y, tourne ? 1.2 : 4.4, tourne ? 3.2 : 1.6);
        }
      },
    };
  }

  /* Ce que chaque lieu recoit */
  const AVEC_PAPILLONS = { normandie: 1, reunion: 1, caledonie: 1, hawaii: 1, camargue: 1, irlande: 1, afriquesud: 1 };
  G.Interact = sc => {
    const def = sc.def || {}, out = [];
    if (!def.id) return out;
    const dehors = sc.type === 'ext' || (sc.type === 'int' && def.pleinAir);
    if (!def.altitude) out.push(souffle(sc));
    if (sc.type === 'eau') return out;
    const terre = !def.flotte && !def.altitude;
    if (terre && dehors && !sc.m.nuit && !def.sobre) out.push(nuee(sc));
    if (dehors && !def.sobre && !sc.m.nuit) out.push(volee(sc));
    // a cette taille un papillon generique ne se lit pas : seuls les decors qui en ont besoin peignent les leurs
    if (terre && DEBRIS[def.r]) out.push(debris(sc));
    return out;
  };
  /* Ce qui flotte dans l'air s'ecarte du drone : neige, feuilles, lucioles, bulles, brume */
  G.Interact.pousse = (s, X, Y, dt, rayon = 34, force = 130) => {
    const W = W_();
    s.ex = s.ex || 0; s.ey = s.ey || 0;
    if (W && W.vivant) {
      const ax = X - (G.Jeu.HX + (W.heroDx || 0)), ay = Y - (W.y - 14), q = ax * ax + ay * ay;
      if (q < rayon * rayon) { const l = Math.sqrt(q) + 1; s.ex += ax / l * force * dt; s.ey += ay / l * force * dt; }
    }
    s.ex *= 1 - dt * 1.4; s.ey *= 1 - dt * 1.4;
  };
})();
