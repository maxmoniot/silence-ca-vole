/* Dessin d'une image de jeu : decor, acteurs, transitions, ambiance, HUD. */
'use strict';
(function () {
  const R = G.Rendu = {};
  const D = G.Decor;
  const K = '#17151f';
  let bufB = null, masques = null, calque = null;

  function assure() {
    if (!bufB || bufB.lw !== G.VW) bufB = G.mkE(G.VW, G.VH);
    if (!masques) {
      // 17 niveaux de trame de Bayer pour le fondu pixel
      const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      masques = [];
      for (let n = 0; n <= 16; n++) {
        const c = G.mk(4, 4);
        c.x.fillStyle = '#000';
        for (let y = 0; y < 4; y++) for (let a = 0; a < 4; a++) if (B[y][a] < n) c.x.fillRect(a, y, 1, 1);
        masques.push(c);
      }
    }
  }

  /* --- Bobine de pellicule --- */
  const bob = [];
  (function () {
    // une vraie bobine de film, 16 pixels, qui tourne sur 8 images
    for (let f = 0; f < 8; f++) {
      const c = G.mk(17, 17), x = c.x, a0 = f * Math.PI / 12;
      const rond = (r, col) => { x.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); x.fillRect(8 - w, 8 + y, w * 2 + 1, 1); } };
      rond(8, K); rond(7, '#b8821e'); rond(6, '#e8b23a');
      x.fillStyle = '#fff0a8'; x.fillRect(4, 3, 4, 1); x.fillRect(3, 4, 2, 2);
      x.fillStyle = '#a06f14';
      for (let y = -7; y <= 7; y++) for (let a = -7; a <= 7; a++) { const d = Math.hypot(a, y); if (d > 5.6 && d < 6.6 && a + y > 3) x.fillRect(8 + a, 8 + y, 1, 1); }
      for (let i = 0; i < 4; i++) {
        const an = a0 + i * Math.PI / 2, px = 8 + Math.cos(an) * 3.6, py = 8 + Math.sin(an) * 3.6;
        x.fillStyle = K; x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
      }
      x.fillStyle = K; x.fillRect(7, 7, 3, 3); x.fillStyle = '#fff4c8'; x.fillRect(8, 8, 1, 1);
      bob.push(c);
    }
  })();
  R.bob = bob;

  /* Sprite avec ondulation de nage (la queue ondule, la tete reste stable) */
  function nage(x, img, w, h, px, py, T, ampl, flip) {
    const S = G.S, nw = img.width, nh = img.height, pas = 3;
    for (let c = 0; c < nw; c += pas) {
      const k = 1 - c / nw;
      const dy = Math.sin(c / S * .035 - T * 2.6) * ampl * (k * k * .9 + .1);
      x.drawImage(img, c, 0, pas, nh, px + c / S, py + dy, pas / S, h);
    }
  }

  /* Les bulles passent toujours devant et ne sont jamais assombries : elles sont mises de cote, puis dessinees a la fin */
  let bullesAttente = null;
  function bulle(x, txt, px, py, maxx, qui, prioritaire) {
    if (bullesAttente) { bullesAttente.push([txt, px, py, maxx, qui, prioritaire]); return; }
    bulleDessin(x, txt, px, py, maxx);
  }
  /* Qui a la parole : une bulle va au bout de son temps, puis un court silence, puis quelqu'un d'autre parle. Silences raccourcis
     (Max, 07/11/2026 : « trop de moments vides, reduis le temps entre deux affichages de bulles ») : avant, 0,7 a 8 s, 2,7 s en
     moyenne ; maintenant 0,3 a 2,5 s, moins d'une seconde en moyenne (tests/parole.js). */
  let parole = null, silence = 1, tParole = 0;
  const dits = new WeakMap();
  const tirerSilence = () => { const k = Math.random(); return k < .6 ? G.rnd(.3, .8) : k < .95 ? G.rnd(.8, 1.6) : G.rnd(1.6, 2.5); };
  const lecture = t => 1.5 + G.trad(t).length * .045;
  function choisirParole(att, W) {
    const dt = Math.max(0, Math.min(.1, W.T - tParole));
    tParole = W.T;
    const vue = q => q[1] > 4 && q[1] < G.VW - 4;
    if (parole) {
      parole.T -= dt;
      const q = att.find(c => c[0] === parole.t && c[4] === parole.qui);
      // une replique de priorite 2 (les coureurs du hall du CID, qui ne restent que quelques secondes) coupe la parole d'un figurant
      const coupe = att.find(c => c[5] === 2 && vue(c) && c[4] !== parole.qui && !(c[4] && dits.get(c[4]) === c[0]));
      if (coupe && !parole.urgent) parole.T = 0;
      if (!q || !vue(q) || parole.T <= 0) {
        if (parole.qui) dits.set(parole.qui, parole.t);
        parole = null;
        silence = tirerSilence();
      } else return q;
    }
    silence -= dt;
    // qui parle doit avoir le temps de finir avant de sortir de l'image
    const temps = c => { const o = c[4]; if (!o || o.v === undefined) return 9; const vit = W.v * W.ech - o.v; return vit > 0 ? c[1] / vit : 9; };
    const dispo = att.filter(c => vue(c) && temps(c) >= 1.3 && !(c[4] && dits.get(c[4]) === c[0]));
    const urgent = dispo.filter(c => c[5]);
    if (!dispo.length || (silence > 0 && !urgent.length)) return null;
    const q = urgent.length ? urgent[0] : G.pick(dispo);
    parole = { t: q[0], qui: q[4], T: lecture(q[0]), urgent: q[5] === 2 };
    // son auteur la garde jusqu'au bout
    if (q[4]) { if (q[4].bulleT !== undefined) q[4].bulleT = Math.max(q[4].bulleT, parole.T + .1); if (q[4].T !== undefined && q[4].t === q[0]) q[4].T = Math.max(q[4].T, parole.T + .1); }
    return q;
  }
  function bulleDessin(x, txt, px, py, maxx) {
    const w = G.txtW(txt) + 6, h = 12;
    let bx = Math.round(px - w / 2);
    bx = G.clamp(bx, 2, (maxx || G.VW) - w - 2);
    const by = Math.max(2, Math.round(py - h - 4));
    x.fillStyle = K; x.fillRect(bx - 1, by, w + 2, h); x.fillRect(bx, by - 1, w, h + 2);
    x.fillStyle = '#fff'; x.fillRect(bx, by, w, h);
    const qx = G.clamp(Math.round(px), bx + 2, bx + w - 4);
    x.fillStyle = K; x.fillRect(qx - 1, by + h, 4, 2); x.fillRect(qx, by + h + 2, 2, 1);
    x.fillStyle = '#fff'; x.fillRect(qx, by + h - 1, 2, 2);
    G.txt(x, txt, bx + 3, by + 2, K);
  }

  G.Lumiere.bulle = bulle;

  function etoilesTete(x, px, py, T) {
    for (let i = 0; i < 3; i++) {
      const a = T * 5 + i * 2.1;
      x.fillStyle = i ? '#ffe27a' : '#fff';
      x.fillRect(px + Math.cos(a) * 8 | 0, py + Math.sin(a) * 2 | 0, 2, 2);
    }
  }

  function dessinerFig(x, f, W) {
    if (f.quai || f.cache) return;
    const yb = f.y + W.camY - (f.h || 0);
    const hop = f.hop ? Math.abs(Math.sin(f.tp * (f.hop > 1 ? 1.3 : .8))) * (f.hop > 1 ? 7 : 3) : 0;
    const sx = f.x;
    // le corps n'est pas dessine hors de l'image, mais une pancarte ou une banderole qui part de lui peut y entrer
    corps: if (f.d) {
      if (sx < -20 || sx > G.VW + 20) { if (f.pancarte || f.banderole) break corps; return; }
      // l'ombre au sol : pas pour qui est dans l'eau, nageur ou plongeur, elle le suivait en bas (Max, 03/11/2026)
      if (!f.nageur && f.pose !== 'plonge') { x.fillStyle = 'rgba(0,0,0,.26)'; x.fillRect(sx - 6, f.y + W.camY, 11, 1.2); }
      if (f.nageur) {
        // on ne voit que le haut du corps, et des ronds dans l'eau
        // tout est cale sur la meme grille de pixels : le corps et la ligne d'eau ne tremblent pas l'un par rapport a l'autre
        const gx = Math.round(sx * G.S) / G.S, gy = Math.round(yb * G.S) / G.S, flot = Math.round(Math.sin(W.T * 1.6 + (f.ph || 0)) * 1.2 * G.S) / G.S;
        x.save();
        x.beginPath(); x.rect(gx - 16, gy - 34, 32, 26); x.clip();
        G.dollDraw(x, f.d, f.pose, W.T * 1.1 + (f.ph || 0), gx, gy + flot, f.flip);
        x.restore();
        x.fillStyle = 'rgba(255,255,255,.75)';
        const r = 5 + (W.T * 1.5 + (f.ph || 0)) % 3;
        x.fillRect(gx - r, gy - 10, r * 2, 1);
      } else if (f.pose === 'plonge') {
        const gx = Math.round(sx * G.S) / G.S, gy = Math.round(yb * G.S) / G.S;
        x.save(); x.translate(gx, gy + Math.sin(f.tp * .5) * 1.2); x.rotate((f.flip ? -1 : 1) * (1.45 + Math.sin(f.tp * .4) * .06));
        G.dollDraw(x, f.d, 'marche', f.tp * 1.3, 0, 0, f.flip);
        // la bouteille d'air, dans le dos
        x.fillStyle = K; x.fillRect((f.flip ? 3 : -7), -25, 4.6, 10);
        x.fillStyle = '#d8b030'; x.fillRect((f.flip ? 3.8 : -6.2), -24.2, 3, 8.4);
        x.fillStyle = '#fff4b0'; x.fillRect((f.flip ? 3.8 : -6.2), -24.2, .8, 8.4);
        x.restore();
        if (Math.sin(f.tp * 1.1) > .96 && W.fx) G.FX.fumee(W, gx + 12, gy - 6, { ton: 'bulle', r0: 0, r1: 1, T: .8, vy: -30 });
      } else if (f.tombe) {
        // il trebuche les bras en avant, bascule face contre terre, gigote, puis se releve
        const ch = f.chuteT || 0, ang = G.Jeu.angleChute(f, ch), rb = ch > .55 && ch < .85 ? Math.abs(Math.sin((ch - .55) * 10)) * 2 : 0, plat = Math.abs(ang) > 1.2 ? 3 : 0;
        x.save();
        x.translate(sx, yb - rb - plat);
        x.rotate(ang);
        G.dollDraw(x, f.d, ch < .55 ? 'panique' : ch < 1.2 ? 'marche' : ch < 1.7 ? 'neutre' : 'marche', ch < .55 ? ch * 12 : ch * 6, 0, 0, f.flip);
        x.restore();
      } else {
        G.dollDraw(x, f.d, f.pose, f.tp, sx, yb - hop, f.flip);
      }
    } else if (f.s) {
      const tag = f.deco ? 'l' : 'l';
      // un cheval galope au rythme de ce qu'il parcourt au sol, et se tient debout quand il ne bouge pas (D.sprAllure)
      const sp = D.sprAllure(f.s, tag, f.sol, Math.abs(f.v) < 8);
      if (!sp.ok || sx < -sp.w - 10 || sx > G.VW + sp.w + 10) return;
      const px = sx - sp.w / 2, py = yb - sp.h - hop;
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(px + 2 | 0, f.y + W.camY | 0, sp.w - 4, 2);
      if (f.nage && !sp.anime) { nage(x, sp.img, sp.w, sp.h, px, py, W.T + f.x * .01, 2.5, false); }
      else if (f.nage) { x.drawImage(sp.img, px, py, sp.w, sp.h); }
      else if (f.tombe) {
        x.save(); x.translate(Math.round(sx), Math.round(yb - sp.w / 2)); x.rotate(-1.57); x.drawImage(sp.img, Math.round(-sp.w / 2), Math.round(-sp.h / 2)); x.restore();
      } else if (f.rot) {
        x.save(); x.translate(Math.round(sx), Math.round(yb)); x.rotate(-f.rot); x.drawImage(sp.img, Math.round(-sp.w / 2), -sp.h); x.restore();
      } else x.drawImage(sp.img, Math.round(px), Math.round(py));
    } else if (f.i) {
      const c = G.itemCanvas(f.i);
      x.drawImage(c, Math.round(sx), Math.round(yb - 10 - hop));
    }
    if (f.pancarte && !f.tombe) {
      // un texte long passe sur deux lignes (G.lignesPancarte) : la pancarte grandit vers le haut, les batons gardent leur place.
      // Deux porteurs, un baton dans la main de chacun (G.pancarteBornes) ; s'il n'en reste qu'un, un seul baton au milieu.
      const lg = G.lignesPancarte(f.pancarte), h = lg.length > 1 ? 22 : 12, B = G.pancarteBornes(f);
      const py = yb - 26 - h + Math.sin(W.T * 4 + f.x * .1) * 1.5;
      if (B.x1 > -4 && B.x0 < G.VW + 4) {
        x.fillStyle = '#6a4a2a'; x.fillRect(B.xa, py + h, 1.2, 12); if (B.xb !== undefined) x.fillRect(B.xb, py + h, 1.2, 12);
        x.fillStyle = K; x.fillRect(B.x0 - .6, py - .6, B.w + 1.2, h + 1.2);
        x.fillStyle = '#f4f0e0'; x.fillRect(B.x0, py, B.w, h);
        lg.forEach((l, j) => G.txt(x, l, B.cx, py + 3 + j * 9.5, '#c8393b', { al: .5, brut: true }));
      }
    }
    if (f.banderole && !f.tombe) {
      const b = f.banderole.avec, x2 = G.banderoleFin(f);
      const py = yb - 42 + Math.sin(W.T * 3) * 1.5;
      x.fillStyle = '#6a4a2a'; x.fillRect(sx | 0, py, 2, 28); x.fillRect(x2 | 0, py, 2, 28);
      x.fillStyle = K; x.fillRect(sx - 1 | 0, py - 1, x2 - sx + 4 | 0, 15);
      x.fillStyle = '#f4f0e0'; x.fillRect(sx | 0, py, x2 - sx + 2 | 0, 13);
      x.fillStyle = '#c8393b'; x.fillRect(sx | 0, py, x2 - sx + 2 | 0, 1); x.fillRect(sx | 0, py + 12, x2 - sx + 2 | 0, 1);
      G.txt(x, f.banderole.t, (sx + x2) / 2, py + 3, '#14121a', { al: .5 });
    }
    if (f.etoiles > 0) etoilesTete(x, sx, yb - 24, W.T);
    if (f.bulleT > 0 && f.bulle) bulle(x, f.bulle, sx, yb - (f.s ? (D.spr(f.s, 'l').h || 20) : 26), 0, f);
  }

  /* Halo corail : autour de l'objet, il dit "danger" sans enlaidir l'image */
  const halos = new Map();
  function halo(sp) {
    let c = halos.get(sp.img);
    if (c) return c;
    c = G.mk(sp.nw + 2, sp.nh + 2);
    for (const [a, b] of [[0, 1], [2, 1], [1, 0], [1, 2]]) c.x.drawImage(sp.img, a, b);
    c.x.globalCompositeOperation = 'source-in';
    c.x.fillStyle = '#ff4a5e';
    c.x.fillRect(0, 0, c.width, c.height);
    halos.set(sp.img, c);
    return c;
  }
  /* Une barre habillee par un objet du lieu. Si elle est plus longue que l'objet, on en met plusieurs bout a bout. */
  function dessinerBarre(x, o, T) {
    const sp = D.spr(o.skin, 'l');
    if (!sp.ok) return false;
    const n = Math.max(1, Math.round(o.len / (sp.w * 1.35)));
    const lg = o.len / n;
    const h = Math.max(sp.h, 10);
    const h0 = halo(sp);
    x.save();
    x.translate(o.x, o.y);
    x.rotate(o.a);
    const al = .55 + .35 * Math.sin(T * 7);
    for (let i = 0; i < n; i++) {
      const px = -o.len / 2 + i * lg;
      x.globalAlpha = al;
      x.drawImage(h0, px - 1, -h / 2 - 1, lg + 2, h + 2);
      x.globalAlpha = 1;
      x.drawImage(sp.img, px, -h / 2, lg, h);
    }
    x.restore();
    return true;
  }

  /* Ce qui tient l'obstacle : une chaine qui monte hors champ, un poteau, ou deux oiseaux qui le portent */
  function dessinerSupport(x, o, T) {
    const sup = o.sup;
    for (const f of sup.f) {
      const px = o.ax + (o.bx - o.ax) * f, py = o.ay + (o.by - o.ay) * f;
      if (sup.t === 'chaine') {
        const hx = o.pend ? o.px : px, n = Math.max(2, Math.ceil(Math.hypot(hx - px, py + 14) / 4));
        for (let i = 0; i < n; i++) {
          const k = i / n, cx = px + (hx - px) * k, cy = py + (-14 - py) * k;
          x.fillStyle = K; x.fillRect(cx - 1.2, cy - 1.6, 2.4, 3.2);
          x.fillStyle = i % 2 ? '#8f97a6' : '#5e6270'; x.fillRect(cx - .6, cy - 1, 1.2, 2);
        }
      } else if (sup.t === 'poteau') {
        const bas = G.SOLF + W_cam(o) + 1;
        x.fillStyle = K; x.fillRect(px - 2.4, py, 4.8, bas - py);
        x.fillStyle = '#5a5c6a'; x.fillRect(px - 1.8, py, 3.6, bas - py);
        x.fillStyle = '#8a8c9c'; x.fillRect(px - 1.8, py, 1.2, bas - py);
        x.fillStyle = '#ff5a48'; for (let y = py + 3; y < py + 18 && y < bas; y += 6) x.fillRect(px - 1.8, y, 3.6, 2.4);
        x.fillStyle = K; x.fillRect(px - 6, bas - 3, 12, 3);
        x.fillStyle = '#6a6c7a'; x.fillRect(px - 5.4, bas - 2.4, 10.8, 1.8);
      } else if (sup.t === 'oiseaux') {
        const sp = D.spr(sup.s, 'm');
        const yo = py - 11 + Math.sin(T * 9 + f * 7) * 1.5;
        x.fillStyle = 'rgba(245,245,250,.9)'; x.fillRect(px - .3, yo, .6, py - yo);
        if (sp.ok) {
          const k = Math.sin(T * 13 + f * 5) > 0 ? 1 : .72, hh = sp.h * k;
          x.save(); x.scale(-1, 1); x.drawImage(sp.img, -(px + sp.w / 2), yo - hh + 2, sp.w, hh); x.restore();
        }
      }
    }
  }
  const W_cam = () => { const W = G.Jeu.w(); return W ? W.camY : 0; };

  function dessinerObstacle(x, o, W) {
    const T = W.T;
    switch (o.k) {
      case 'cable': {
        if (o.ax === undefined) return;
        if (o.sup) dessinerSupport(x, o, T);
        if (o.skin && dessinerBarre(x, o, T)) break;
        // le danger a toujours le meme code : barre corail a coeur blanc, contour sombre, lisible sur tout decor
        const n = Math.max(8, o.len / 3 | 0);
        const dx = (o.bx - o.ax) / n, dy = (o.by - o.ay) / n;
        const nl = Math.hypot(dx, dy) || 1, nx = -dy / nl, ny = dx / nl;
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const j = (i % n) ? Math.sin(i * 2.3 + T * 30) * 1.4 : 0;
          pts.push([o.ax + dx * i + nx * j, o.ay + dy * i + ny * j]);
        }
        x.fillStyle = K; for (const q of pts) x.fillRect(q[0] - 3 | 0, q[1] - 3 | 0, 6, 6);
        x.fillStyle = o.c; for (const q of pts) x.fillRect(q[0] - 2 | 0, q[1] - 2 | 0, 4, 4);
        x.fillStyle = '#fff'; pts.forEach((q, i) => { if ((i + (T * 24 | 0)) % 4) x.fillRect(q[0] - 1 | 0, q[1] - 1 | 0, 2, 2); });
        const pulse = (T * 6 | 0) % 2;
        for (const [a, b] of [[o.ax, o.ay], [o.bx, o.by]]) {
          x.fillStyle = K; x.fillRect(a - 6 | 0, b - 6 | 0, 12, 12);
          x.fillStyle = '#3a3c48'; x.fillRect(a - 5 | 0, b - 5 | 0, 10, 10);
          x.fillStyle = pulse ? '#fff' : o.c; x.fillRect(a - 3 | 0, b - 3 | 0, 6, 6);
        }
        break;
      }
      case 'struct': G.Structures.dessiner(x, o, W); break;
      case 'sprite': {
        const sp = D.spr(o.s, 'l');
        if (!sp.ok) return;
        const cam = W.camY, X = o.x - o.w / 2, nw = sp.img.width, nh = sp.img.height;
        if (o.type === 'arche') {
          // le tablier garde ses proportions, seuls les pieds s'allongent jusqu'au sol
          const ny = Math.round(nh * o.plancher), hx = o.h * o.plancher;
          // les pieds sont en retrait, dans l'air du lieu : on passe devant eux, seul le tablier arrete
          const hz = W.sc.m.c_hz, loin = hz ? D.teinte(sp, hz, .5) : null;
          x.drawImage(loin || sp.img, 0, ny, nw, nh - ny, X, o.yd + cam, o.w, G.SOLF - o.yd);
          x.drawImage(sp.img, 0, 0, nw, ny, X, o.yd - hx + cam, o.w, hx);
          break;
        }
        const alH = .42 + .28 * Math.sin(T * 7 + o.x * .02), h0 = halo(sp), mg = 1 / G.S;
        if (o.type === 'pend') {
          // ce qui le tient monte jusqu'au plafond
          x.fillStyle = K; x.fillRect(o.x - 1.4, -2, 2.8, o.yh + cam + 6);
          x.fillStyle = '#6a6c7a'; x.fillRect(o.x - .7, -2, 1.4, o.yh + cam + 6);
          x.drawImage(sp.img, 0, 0, nw, nh, X, o.yh + cam, o.w, o.h);
          break;
        }
        x.globalAlpha = alH; x.drawImage(h0, X - mg, o.y - o.h + cam - mg, o.w + 2 * mg, o.h + 2 * mg); x.globalAlpha = 1;
        x.drawImage(sp.img, 0, 0, nw, nh, X, o.y - o.h + cam, o.w, o.h);
        break;
      }
      case 'col': {
        const sp = D.spr(o.s, 'l');
        if (!sp.ok) return;
        const cam = Math.round(W.camY);
        const alH = .5 + .32 * Math.sin(T * 7 + o.x * .02), h0 = halo(sp), mg = 1 / G.S;
        if (o.haut) {
          x.save(); x.translate(Math.round(o.x - sp.w / 2), G.PLAFOND - 8 + sp.h + cam); x.scale(1, -1);
          x.globalAlpha = alH; x.drawImage(h0, -mg, -mg, sp.w + 2 * mg, sp.h + 2 * mg); x.globalAlpha = 1;
          x.drawImage(sp.img, 0, 0); x.restore();
        } else {
          x.globalAlpha = alH; x.drawImage(h0, Math.round(o.x - sp.w / 2) - mg, o.y - sp.h + cam - mg, sp.w + 2 * mg, sp.h + 2 * mg); x.globalAlpha = 1;
          x.drawImage(sp.img, Math.round(o.x - sp.w / 2), o.y - sp.h + cam);
        }
        break;
      }
      case 'vol': {
        const sp = D.spr(o.s, 'l');
        if (!sp.ok) return;
        if (o.gonfle) {
          const k = o.gonfle;
          x.drawImage(sp.img, Math.round(o.x - sp.w * k / 2), Math.round(o.y - sp.h * k / 2), sp.w * k | 0, sp.h * k | 0);
          if (o.bulleT > 0) bulle(x, o.bulle, o.x, o.y - sp.h * k / 2, 0, o);
        } else if (o.tourne) {
          x.save(); x.translate(Math.round(o.x), Math.round(o.y)); x.rotate(T * o.tourne + o.ph); x.drawImage(sp.img, -sp.w / 2 | 0, -sp.h / 2 | 0); x.restore();
        } else if (o.pul) {
          const k = 1 + Math.sin(T * 5 + o.ph) * .12;
          x.drawImage(sp.img, Math.round(o.x - sp.w * k / 2), Math.round(o.y - sp.h / 2), sp.w * k | 0, sp.h / k | 0);
        } else {
          // le battement d'ailes : on ecrase l'image un temps sur deux, ca suffit a donner vie
          const k = Math.sin(T * 13 + o.ph) > 0 ? 1 : .8;
          const hh = sp.h * k | 0;
          x.save(); x.scale(-1, 1);
          x.globalAlpha = .4 + .3 * Math.sin(T * 7 + o.ph); x.drawImage(halo(sp), -Math.round(o.x + sp.w / 2) - .6, Math.round(o.y - hh / 2) - .6, sp.w + 1.2, hh + 1.2); x.globalAlpha = 1;
          x.drawImage(sp.img, -Math.round(o.x + sp.w / 2), Math.round(o.y - hh / 2), sp.w, hh);
          x.restore();
        }
        break;
      }
      case 'guide': {
        const sp = D.spr(o.s, 'l');
        if (o.warn > 0) {
          const blink = (T * 10 | 0) % 2;
          x.fillStyle = blink ? '#ff3b3b' : '#ffe27a';
          x.fillRect(G.VW - 8, o.y - 8 | 0, 4, 11); x.fillRect(G.VW - 8, o.y + 5 | 0, 4, 3);
          if (sp.ok) { const m = D.spr(o.s, 's'); if (m.ok) { x.save(); x.scale(-1, 1); x.drawImage(m.img, -(G.VW - 12), o.y - m.h / 2 | 0); x.restore(); } }
        } else if (sp.ok) {
          x.save(); x.scale(-1, 1); x.drawImage(sp.img, -Math.round(o.x + sp.w / 2), Math.round(o.y - sp.h / 2)); x.restore();
          x.fillStyle = 'rgba(255,255,255,.5)';
          for (let i = 0; i < 4; i++) x.fillRect(o.x + sp.w / 2 + 2 + i * 8 + (T * 80 % 8) | 0, o.y + (i % 2 ? 2 : -2) | 0, 5, 1);
        }
        break;
      }
      case 'rayon': {
        // (une salve du grand barrage qui n'est pas encore annoncee)
        if (o.T < 0) break;
        const y = Math.round(o.y);
        const pr = (x2, flip) => { x.fillStyle = K; x.fillRect(x2 - 5, y - 6, 12, 12); x.fillStyle = '#3a3c48'; x.fillRect(x2 - 4, y - 5, 10, 10); x.fillStyle = o.T > o.warn ? '#fff' : '#ffb545'; x.fillRect(flip ? x2 - 4 : x2 + 4, y - 3, 2, 6); };
        if (o.T < o.warn) {
          const a = (W.T * 12 | 0) % 2;
          x.fillStyle = a ? 'rgba(255,90,60,.8)' : 'rgba(255,220,120,.6)';
          for (let i = (W.T * 90 % 12 | 0); i < G.VW; i += 12) x.fillRect(i, y, 6, 1);
        } else {
          const k = Math.min(1, (o.T - o.warn) / .05) * Math.min(1, (o.warn + o.on + .1 - o.T) / .08);
          const e = 5 * k | 0;
          x.fillStyle = 'rgba(255,240,180,.35)'; x.fillRect(0, y - e - 3, G.VW, e * 2 + 7);
          x.fillStyle = '#ffe9a8'; x.fillRect(0, y - e, G.VW, e * 2 + 1);
          x.fillStyle = '#fff'; x.fillRect(0, y - (e >> 1), G.VW, e + 1);
        }
        pr(4, false); pr(G.VW - 8, true);
        break;
      }
      case 'jete': {
        const c = G.itemCanvas(o.i);
        x.save(); x.translate(Math.round(o.x), Math.round(o.y)); x.rotate(o.r); x.drawImage(c, -7, -7); x.restore();
        break;
      }
      case 'courant': {
        // la colonne de bulles
        for (let i = 0; i < 26; i++) {
          const yy = 216 - ((W.T * (60 + i * 3) + i * 37) % 230);
          const xx = o.x + Math.sin(yy * .06 + i) * (5 + (i % 3) * 4);
          x.fillStyle = i % 3 ? 'rgba(220,250,255,.75)' : '#fff';
          const b = i % 4 === 0 ? 3 : i % 2 ? 2 : 1;
          x.fillRect(xx | 0, yy | 0, b, b);
        }
        x.fillStyle = 'rgba(160,230,255,.12)'; x.fillRect(o.x - 16 | 0, 0, 32, 216);
        break;
      }
      case 'jet': {
        const col = { eau: ['#e8fbff', '#7fd8ff', '#2f8fd0'], sable: ['#fff0c8', '#e8c07a', '#b58a4a'], lave: ['#fff4a8', '#ff9a2e', '#d8391f'], neige: ['#fff', '#dcefff', '#a8c8e8'], vapeur: ['#fff', '#d8dce4', '#a8acb4'], feu: ['#fff4a8', '#ffb545', '#e0401f'], bulles: ['#e8fbff', '#9fe8ff', '#4fb8e0'] }[o.t] || ['#fff', '#ccc', '#888'];
        const cam = Math.round(W.camY);
        if (o.T < o.warn) {
          x.fillStyle = col[1];
          for (let i = 0; i < 6; i++) { const a = T * 22 + i; x.fillRect(o.x + Math.sin(a) * 7 | 0, G.SOLF + cam - (Math.abs(Math.cos(a)) * 9 | 0), 2, 2); }
        } else {
          const h = o.hNow | 0;
          for (let y = 0; y < h; y += 3) {
            const w = 6 + Math.sin(y * .5 + T * 22) * 2 + (y > h - 14 ? (y - (h - 14)) * .5 : 0);
            x.fillStyle = col[(y >> 2) % 3 === 0 ? 1 : (y >> 3) % 2 ? 0 : 2];
            x.fillRect(o.x - w + Math.sin(y * .2 + T * 8) * 2 | 0, G.SOLF + cam - y | 0, w * 2 | 0, 3);
          }
        }
        break;
      }
      case 'veh': {
        const sp = D.spr(o.s, 'l');
        if (!sp.ok) return;
        const cam = Math.round(W.camY);
        // vehicule qui vient vers nous : retourne
        x.save(); x.scale(-1, 1);
        const ang = o.enl ? .2 : 0;
        x.translate(-Math.round(o.x), Math.round(o.y - o.jy + cam));
        if (ang) x.rotate(ang);
        x.drawImage(sp.img, -sp.w / 2 | 0, -sp.h + (Math.sin(T * 30) > 0 ? 0 : -1));
        x.restore();
        break;
      }
      case 'saut': {
        const sp = D.spr(o.s, 'l');
        if (!sp.ok) return;
        if (o.T < o.warn) {
          x.fillStyle = 'rgba(10,30,60,.4)'; x.fillRect(o.x - 40 | 0, 200, 80, 6);
          return;
        }
        x.save();
        x.translate(Math.round(o.x), Math.round(o.y));
        x.rotate(Math.atan2(o.vy, 260) * .6);
        if (!o.ami) x.scale(-1, 1);
        x.drawImage(sp.img, -sp.w / 2 | 0, -sp.h);
        x.restore();
        break;
      }
    }
  }

  function drapeauRecord(x, W) {
    if (W.demo || !G.sav.record || W.recordFait) return;
    const X = G.sav.record * 10 - W.x + G.Jeu.HX;
    if (X < -40 || X > G.VW + 40) return;
    const yb = G.SOLF + Math.round(W.camY);
    x.fillStyle = K; x.fillRect(X - 1 | 0, 20, 3, yb - 20);
    x.fillStyle = '#e8e6df'; x.fillRect(X | 0, 20, 1, yb - 20);
    const f = (W.T * 8 | 0) % 2;
    x.fillStyle = K; x.fillRect(X + 1 | 0, 19, 50, 16);
    x.fillStyle = '#c8393b'; x.fillRect(X + 2 | 0, 20, 48, 14);
    x.fillStyle = '#e8515a'; x.fillRect(X + 2 | 0, 20 + f, 48, 2);
    G.txt(x, 'RECORD', X + 26, 23, '#fff', { al: .5 });
    x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(X - 6 | 0, 0, 13, 216);
  }

  /* L'image du sujet : un galopeur dessine par le code (D.foulee) change d'image avec la distance qu'il parcourt au sol (Max, 04/11/2026 :
     « le cheval au premier plan court un peu sur place ») ; les autres a la cadence de leurs images. */
  R.imageSujet = s => {
    const t = s.taille || 'l', fo = s.mode === 'sol' ? D.foulee(s.s, t) : 0, n = fo ? D.nbImages(s.s) : 0;
    if (!fo || !n) return { id: s.s, k: -1 };
    return { id: s.s + '_f' + ((Math.floor((s.sol || 0) / (fo / n)) % n + n) % n), k: (Math.floor((s.sol || 0) / (fo / n)) % n + n) % n };
  };
  function dessinerSujet(x, s, W) {
    const sp = D.spr(R.imageSujet(s).id, s.taille || 'l');
    if (!sp.ok) return;
    const px = s.x - sp.w / 2, py = s.mode === 'plan' && s.py !== undefined ? s.py : (s.mode === 'vol' || s.mode === 'cable' || s.mode === 'eau' ? s.y - sp.h / 2 : s.y - sp.h) + W.camY;
    if (s.mode === 'cable') { x.fillStyle = '#2a2a33'; x.fillRect(0, py - 1 | 0, G.VW, 1); }
    if (s.mode === 'eau' && sp.anime) x.drawImage(sp.img, px, py, sp.w, sp.h);
    else if (s.mode === 'eau') nage(x, sp.img, sp.w, sp.h, px, py, W.T, sp.h > 40 ? 6 : 3);
    else if (s.mode !== 'quai' && s.mode !== 'plan') x.drawImage(sp.img, Math.round(px), Math.round(py + (s.v > 0 && s.mode === 'mer' ? Math.sin(W.T * 3) * 1.5 : 0)));
    if (s.vise && !s.ok && !W.sujetFait) {
      // viseur : quatre coins et la barre d'enregistrement
      const c = (W.T * 8 | 0) % 2 ? '#ff3b3b' : '#fff';
      const a = px - 4 | 0, b = py - 4 | 0, ww = sp.w + 8 | 0, hh = sp.h + 8 | 0;
      x.fillStyle = c;
      for (const [cx, cy, dx, dy] of [[a, b, 1, 1], [a + ww, b, -1, 1], [a, b + hh, 1, -1], [a + ww, b + hh, -1, -1]]) {
        x.fillRect(cx, cy, 6 * dx, 1); x.fillRect(cx, cy, 1, 6 * dy);
      }
      const wb = 34, bx = G.clamp(px + sp.w / 2 - wb / 2, 2, G.VW - wb - 2) | 0, by = Math.max(4, b - 8);
      x.fillStyle = K; x.fillRect(bx - 1, by - 1, wb + 2, 5);
      x.fillStyle = '#ff3b3b'; x.fillRect(bx, by, wb * Math.min(1, s.prog) | 0, 3);
      G.txt(x, 'REC', bx + wb + 3, by - 2, '#ff3b3b', { ombre: K });
    }
  }

  /* Un sujet pose a une profondeur du decor (mode 'plan') : dessine entre deux plans, le plan suivant cache ses pieds dans le
     sable ; il prend la lumiere du lieu comme tout sprite eclaire (ecl). Le viseur, lui, reste dessine avec les acteurs. */
  R.sujetPlan = (x, sc, camY) => {
    const W = G.Jeu.w();
    if (!W || W.sc !== sc || !W.sujet || W.sujet.mode !== 'plan') return;
    const s = W.sujet, sp = D.spr(s.s, s.taille || 'l');
    if (!sp.ok) return;
    const cam = camY * Math.max(.1, Math.min(1, (s.f || .3) * 1.1));
    s.py = s.y - sp.h + cam;
    x.drawImage(sp.img, Math.round(s.x - sp.w / 2), Math.round(s.py));
  };

  /* La rame de metro roule sur ses rails : derriere le quai, devant le mur. Le bord du quai cache ses roues. */
  R.rameQuai = (x, sc, camY) => {
    const W = G.Jeu.w();
    if (!W || W.sc !== sc) return;
    const pose = (id, cx, yb) => { const sp = D.spr(id, 'l'); if (sp.ok) x.drawImage(sp.img, cx - sp.w / 2, yb - sp.h + camY * .5); };
    if (W.sujet && W.sujet.mode === 'quai') pose(W.sujet.s, W.sujet.x, W.sujet.y);
    for (const f of W.figs) if (f.quai) pose(f.s, f.x, f.y);
  };

  function ombreDrone(x, W) {
    const X = G.Jeu.HX + (W.heroDx || 0), haut = G.SOLF - W.y, k = G.clamp(1 - haut / 170, .12, 1), yS = G.SOLF + W.camY + 1;
    if (W.sc.def.altitude) return;
    if (W.sc.def.flotte) {
      // sur l'eau : un reflet qui tremble, plus net quand on rase
      for (let i = 0; i < 4; i++) { const w = (30 - i * 5) * k, d = Math.sin(W.T * 7 + i * 1.7) * 2; x.fillStyle = `rgba(10,30,60,${.26 * k})`; x.fillRect(X - w / 2 + d, yS + i * 1.6, w, 1.1); }
      return;
    }
    x.fillStyle = `rgba(0,0,0,${.3 * k})`; x.fillRect(X - 15 * k, yS, 30 * k, 1.4);
    x.fillStyle = `rgba(0,0,0,${.16 * k})`; x.fillRect(X - 20 * k, yS + .6, 40 * k, 1);
  }
  /* La trainee du drone arc-en-ciel (Max, 08/11/2026 : « le drone doit produire un arc-en-ciel derriere lui ») : chaque image, la
     place du drone est notee (W.x, sa hauteur) ; ces points glissent vers la gauche avec le decor, et six bandes de deux pixels les
     relient en escalier, depuis l'arriere du drone, jusqu'au bord gauche de l'image : elle reste a l'ecran, pleine, et ne s'efface que
     sur son dernier quart ; des etincelles s'y allument. */
  const ARC = ['#ff4a5a', '#ff9a3a', '#ffe14a', '#4ad86a', '#3aa0ff', '#9a5aff'];
  const ARC_RGB = ARC.map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(','));
  function trainee(x, W, X) {
    if (!G.heroArc || !G.heroArc()) { W.arcT = null; return; }
    const l = W.arcT || (W.arcT = []), dos = X - 17.4, LONG = Math.max(150, dos + 30), px = 1 / G.S;
    if (W.vivant) l.unshift({ x: W.x, y: W.y + Math.sin(W.T * 5.2) * .6 });
    let xb = dos;
    for (let i = 0; i < l.length; i++) {
      const q = l[i], sx = dos - (W.x - q.x), age = dos - sx;
      // trop loin derriere, ou un nouveau monde (W.x repart de zero) : on oublie
      if (age > LONG || age < -1) { l.length = i; break; }
      const u = age / LONG, al = u < .75 ? 1 : u < .87 ? .75 : u < .95 ? .5 : .25;
      const yy = Math.round((q.y - 7.8 + Math.sin(q.x * .05 + W.T * 4) * 1.4 * u) * G.S) * px;
      const xa = Math.round(sx * G.S) * px, xe = Math.round(xb * G.S) * px;
      if (xe > xa) for (let b = 0; b < 6; b++) { x.fillStyle = `rgba(${ARC_RGB[b]},${al})`; x.fillRect(xa, yy + b * 1.2, xe - xa, 1.2); }
      // une etincelle de temps en temps sur la trainee
      if (i % 7 === 3 && Math.sin(W.T * 9 + q.x * .7) > .55) {
        const ex = xa, ey = yy + (i % 2 ? -1.2 : 7.2);
        x.fillStyle = `rgba(255,255,255,${al})`; x.fillRect(ex, ey, px, px);
        x.fillStyle = `rgba(255,243,176,${al * .8})`; x.fillRect(ex - px, ey, px, px); x.fillRect(ex + px, ey, px, px); x.fillRect(ex, ey - px, px, px); x.fillRect(ex, ey + px, px, px);
      }
      xb = sx;
    }
  }
  function dessinerHeros(x, W) {
    const st = W.st;
    const y = W.y;
    trainee(x, W, G.Jeu.HX + (W.heroDx || 0));
    if (W.vivant) ombreDrone(x, W);
    if (!W.vivant && W.mort) {
      const M = W.mort, solY = G.SOLF + W.camY;
      x.fillStyle = 'rgba(0,0,0,.28)';
      for (const q of [M.h, M.d]) { const k = G.clamp(1 - (G.SOLF - q.y) / 170, .2, 1); x.fillRect(q.x - 13 * k, solY, 26 * k, 1.4); if (M.lie) break; }
      G.heroMort(x, st, M);
      if (M.fin) etoilesTete(x, M.h.x, M.h.y - 12, W.T);
      if (W.bulleH) bulle(x, W.bulleH.t, M.h.x + 6, M.h.y - 24, 0, W.bulleH, true);
      return;
    }
    const X = G.Jeu.HX + (W.heroDx || 0);
    if (W.invinc > 0 && (W.T * 16 | 0) % 2) { if (W.bulleH) bulle(x, W.bulleH.t, G.Jeu.HX + (W.heroDx || 0) + 12, y - 36, 0, W.bulleH); return; }
    // ombre projetee au sol : elle se resserre quand on descend
    if (W.vivant && W.sc.type !== 'eau') {
      const k = G.clamp(1 - (G.SOLF - y) / 190, .15, 1);
      x.fillStyle = `rgba(0,0,0,${.3 * k})`;
      x.fillRect(X - 13 * k, G.SOLF + W.camY, 26 * k, 1.4);
    }
    if (W.turbo) {
      x.globalAlpha = .26;
      G.heroDessiner(x, st, X - 12, y); G.heroDessiner(x, st, X - 26, y);
      x.globalAlpha = 1;
    }
    // la star brille : une lueur doree qui respire eclaire ce qui l'entoure
    if (G.heroAura && G.heroAura() && W.fx) G.FX.lueur(W, X, y - 24, 44, '#ffd27a', .34 + .1 * Math.sin(W.T * 4));
    // petit flottement du drone, jamais tout a fait immobile
    G.heroDessiner(x, st, X, y + Math.sin(W.T * 5.2) * .6);
    if (W.bouclierN > 0 || W.invinc > 0) {
      const r = 25 + Math.sin(W.T * 6);
      x.strokeStyle = 'rgba(111,230,255,.7)'; x.lineWidth = .7;
      x.beginPath(); x.arc(X, y - 13, r, 0, 7); x.stroke();
      x.fillStyle = 'rgba(111,230,255,.1)'; x.beginPath(); x.arc(X, y - 13, r, 0, 7); x.fill();
    }
    if (W.bulleH) bulle(x, W.bulleH.t, X + 12, y - 36, 0, W.bulleH);
    for (let i = 0; i < W.bouclierN; i++) { const a = W.T * 3 + i * 6.283 / W.bouclierN; x.fillStyle = '#e8fbff'; x.fillRect(X + Math.cos(a) * 25 - 1.2, y - 13 + Math.sin(a) * 25 - 1.2, 2.4, 2.4); }
  }

  /* --- Ambiances --- */
  function ambiance(x, W) {
    const sc = W.sc, m = sc.def.mod;
    const hx = G.Jeu.HX, hy = W.y - 14;
    if (m === 'nuit') {
      const g = x.createRadialGradient(hx + 24, hy, 16, hx + 24, hy, 220);
      g.addColorStop(0, 'rgba(6,8,26,0)'); g.addColorStop(1, 'rgba(6,8,26,.26)');
      x.fillStyle = g; x.fillRect(0, 0, G.VW, G.VH);
    }
    if (m === 'brouillard') {
      const g = x.createLinearGradient(G.VW * .55, 0, G.VW, 0);
      const c = sc.m.c_hz;
      g.addColorStop(0, G.rgb(c, 0)); g.addColorStop(1, G.rgb(c, .8));
      x.fillStyle = g; x.fillRect(0, 0, G.VW, G.VH);
    }
    if (m === 'tempete') { x.fillStyle = 'rgba(220,180,110,.14)'; x.fillRect(0, 0, G.VW, G.VH); }
    if (m === 'pluie') { x.fillStyle = 'rgba(70,90,120,.12)'; x.fillRect(0, 0, G.VW, G.VH); }
    if (sc.type === 'eau') { x.fillStyle = 'rgba(10,80,140,.10)'; x.fillRect(0, 0, G.VW, G.VH); }
    if (sc.def.teinteAmb) { const a = sc.def.teinteAmb; x.fillStyle = `rgba(${a[0]},${a[1]},${a[2]},${a[3]})`; x.fillRect(0, 0, G.VW, G.VH); }
    if (W.pouv.ralenti > 0) {
      x.fillStyle = 'rgba(120,70,180,.12)'; x.fillRect(0, 0, G.VW, G.VH);
      x.fillStyle = '#000'; x.fillRect(0, 0, G.VW, 12); x.fillRect(0, G.VH - 12, G.VW, 12);
    }
    if (W.turbo) {
      x.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = 0; i < 16; i++) { const y = (i * 37 + (W.T * 400 | 0) * 13) % 216, xx = (i * 91 - W.T * 2000) % G.VW; x.fillRect((xx + G.VW) % G.VW | 0, y, 30, 1); }
    }
    if (W.ventD > 0) {
      x.fillStyle = 'rgba(255,255,255,.65)';
      for (let i = 0; i < 8; i++) { const y = 40 + i * 21; x.fillRect((((i * 70 - W.T * 700) % G.VW) + G.VW) % G.VW | 0, y + (W.ventF > 0 ? W.T * 40 % 20 : -(W.T * 40 % 20)) | 0, 20, 1); }
    }
  }

  /* --- Transition --- */
  function dessinerFonds(x, W) {
    const T = W.T, cam = W.camY;
    const tr = W.trans;
    if (!tr || !['fondu', 'plonge', 'surface'].includes(tr.kind)) { D.fond(x, W.sc, W.x, cam, T); return; }
    assure();
    const a = tr.swap ? tr.a : W.sc, b = tr.b;
    if (tr.kind === 'fondu') {
      D.fond(x, a, W.x, cam, T);
      bufB.x.globalCompositeOperation = 'source-over';
      bufB.x.clearRect(0, 0, G.VW, G.VH);
      D.fond(bufB.x, b, W.x, cam, T);
      bufB.x.globalCompositeOperation = 'destination-in';
      const n = G.clamp(Math.round(tr.prog * 16), 0, 16);
      bufB.x.save(); bufB.x.setTransform(1, 0, 0, 1, 0, 0);
      bufB.x.fillStyle = bufB.x.createPattern(masques[n], 'repeat');
      bufB.x._fill(0, 0, bufB.width, bufB.height);
      bufB.x.restore();
      bufB.x.globalCompositeOperation = 'source-over';
      x.drawImage(bufB, 0, 0);
    } else {
      // la surface de l'eau monte (plongee) ou descend (remontee)
      const eau = tr.kind === 'plonge' ? b : a;
      const terre = tr.kind === 'plonge' ? a : b;
      const lvl = tr.kind === 'plonge' ? G.lerp(230, -24, tr.prog) : G.lerp(-24, 230, tr.prog);
      D.fond(x, terre, W.x, cam, T);
      x.save();
      x.beginPath(); x.rect(0, lvl, G.VW, G.VH - lvl); x.clip();
      D.fond(x, eau, W.x, cam, T);
      x.restore();
      // ecume ondulante
      for (let i = 0; i < G.VW; i += 3) {
        const yy = lvl + Math.sin(i * .05 + T * 7) * 3 + Math.sin(i * .13 - T * 5) * 1.5;
        x.fillStyle = 'rgba(255,255,255,.95)'; x.fillRect(i, yy | 0, 3, 2);
        x.fillStyle = 'rgba(160,220,255,.7)'; x.fillRect(i, yy + 2 | 0, 3, 2);
      }
    }
  }
  function mur(x, W) {
    const tr = W.trans;
    if (!tr || !tr.mur) return;
    const px = G.VW - tr.prog * (G.VW + tr.mur.lw);
    x.drawImage(tr.mur, px, 0);
  }
  function iris(x, W) {
    const tr = W.trans;
    if (!tr || tr.kind !== 'iris') return;
    // l'iris se ferme sur le heros sans jamais l'avaler (Max, 06/11/2026 : « une transition totalement noire ») : le trou faisait
    // 0,0002 rad (trace a rebours de 0 a 6,283, un peu moins d'un tour), rien n'etait decoupe et l'ecran restait noir 1,5 s
    const k = Math.abs(tr.prog - .5) * 2;
    const r = 26 + Math.pow(k, 1.5) * 330;
    x.fillStyle = '#000';
    x.beginPath(); x.rect(0, 0, G.VW, G.VH);
    x.moveTo(G.Jeu.HX + r, W.y - 14);
    x.arc(G.Jeu.HX, W.y - 14, r, 0, Math.PI * 2);
    x.fill('evenodd');
  }

  /* --- Image complete --- */
  R.scene = (x, W, jeu) => {
    assure();
    x.imageSmoothingEnabled = false;
    bullesAttente = [];
    x.save();
    if (W.secousse > 0) x.translate(Math.round(G.rnd(-W.secousse, W.secousse)), Math.round(G.rnd(-W.secousse, W.secousse)));
    dessinerFonds(x, W);
    if (W.volants) {
      const a = W.volants, sp = D.spr(a.s, 'm');
      if (sp.ok) {
        x.save(); x.translate(Math.round(a.x), Math.round(a.y)); x.rotate(a.rot); x.drawImage(sp.img, -sp.w / 2 | 0, -sp.h / 2 | 0); x.restore();
        if (a.x < G.VW - 20) bulle(x, a.txt, a.x, a.y - sp.h / 2, 0, a);
      }
    }
    mur(x, W);
    G.FX.dessinerPercee(x, W);
    // les acteurs sont dessines a part, pour recevoir la lumiere du lieu
    if (!calque || calque.lw !== G.VW) calque = G.mkE(G.VW, G.VH);
    const a = calque.x;
    a.imageSmoothingEnabled = false;
    a.clearRect(0, 0, G.VW, G.VH);
    for (const o of W.obs) if (o.k === 'jet' || o.k === 'col' || o.k === 'sprite' || o.k === 'struct') dessinerObstacle(a, o, W);
    // la nuit, le heros reste visible : une lumiere le suit, un liseré froid le detache, sa frontale s'allume
    if (W.vivant) {
      const nuit = G.Lumiere.sombre(W.sc);
      W.st.nuit = nuit; W.st.frontale = G.Lumiere.torcheAllumee(W.sc);
      if (nuit && W.fx) G.FX.lueur(W, G.Jeu.HX + (W.heroDx || 0), W.y - 16, 46, '#fff0d8', .22);
    }
    G.FX.dessinerFumee(a, W, false);
    for (const f of W.figs) dessinerFig(a, f, W);
    if (W.sujet) dessinerSujet(a, W.sujet, W);
    drapeauRecord(a, W);
    if (W.boss) G.Boss.dessiner(a, W);
    if (W.roquettes) for (const r of W.roquettes) {
      a.save(); a.translate(r.x, r.y); a.rotate(r.a || 0);
      a.fillStyle = (W.T * 30 | 0) % 2 ? '#fff4a8' : '#ff8a2a'; a.fillRect(-13, -1.6, 6, 3.2);
      a.fillStyle = K; a.fillRect(-8, -3, 16, 6);
      a.fillStyle = '#7a8a5a'; a.fillRect(-7, -2.2, 10, 4.4); a.fillStyle = '#a8b880'; a.fillRect(-7, -2.2, 10, 1.2);
      a.fillStyle = '#d63a2a'; a.fillRect(3, -2.2, 4, 4.4);
      a.fillStyle = K; a.fillRect(-9, -5, 3, 2); a.fillRect(-9, 3, 3, 2);
      a.restore();
    }
    for (const o of W.obs) if (o.k !== 'jet' && o.k !== 'col' && o.k !== 'sprite' && o.k !== 'struct' && o.k !== 'rayon') dessinerObstacle(a, o, W);
    G.FX.dessinerEclats(a, W);
    // la vue d'un decor depuis le carnet : sans le heros (W.sansHeros)
    if (!W.sansHeros) dessinerHeros(a, W);
    G.FX.dessinerFumee(a, W, true);
    // une seule liste de lumieres pour toute l'image
    if (W.fx) {
      // ce qui menace brille dans le noir
      const nuit = W.sc.m.nuit || W.sc.type === 'int' || W.sc.type === 'eau';
      if (nuit) for (const o of W.obs) if (o.k === 'struct') for (const q of o.segs) {
        const ax = o.x + q.ax, bx = o.x + q.bx, X = G.clamp((ax + bx) / 2, 16, G.VW - 16);
        if (Math.max(ax, bx) < -10 || Math.min(ax, bx) > G.VW + 10) continue;
        const k = bx === ax ? .5 : G.clamp((X - ax) / (bx - ax), 0, 1);
        G.FX.lueur(W, X, G.clamp(q.ay + (q.by - q.ay) * k, 10, G.SOLF - 6), 62, '#ffbe9a', .34);
      }
      if (nuit) for (const o of W.obs) if (o.k === 'cable' && o.x > -40 && o.x < G.VW + 40) G.FX.lueur(W, o.x, o.y, Math.min(90, o.len * .8), '#ff5a48', .34);
      for (const it of W.items) if ((it.k === 'grosse' || it.k === 'coeur' || it.k === 'pouv') && it.x > -30 && it.x < G.VW + 30) G.FX.lueur(W, it.x, it.y, 56, it.k === 'coeur' ? '#ff8a9a' : '#ffd878', .4);
    }
    const lumieres = G.Lumiere.lumieresDe(W, W.sc);
    G.Lumiere.eclairer(a, W.sc, W, W.T, lumieres, x);
    G.Lumiere.eclairerDecor(x, W, W.sc, lumieres);
    x.drawImage(calque, 0, 0);
    if (W.fx) W.fx.lueurs.length = 0;
    G.FX.dessinerEmissif(x, W);
    // quatre coins autour de ce qu'il filme : on voit ce qu'il regarde
    if (W.regard && W.vivant && !W.demo && W.regard.x > 6 && W.regard.x < G.VW - 6) {
      const q = W.regard, a = q.x - q.w / 2 - 3, b = q.y - q.h / 2 - 3, ww = q.w + 6, hh = q.h + 6;
      x.fillStyle = 'rgba(255,255,255,.8)';
      for (const [cx, cy, dx, dy] of [[a, b, 1, 1], [a + ww, b, -1, 1], [a, b + hh, 1, -1], [a + ww, b + hh, -1, -1]]) {
        x.fillRect(dx > 0 ? cx : cx - 4, cy, 4, .6); x.fillRect(cx, dy > 0 ? cy : cy - 4, .6, 4);
      }
      if ((W.T * 3 | 0) % 2) { x.fillStyle = '#ff3b3b'; x.fillRect(a + 2, b + 2, 1.8, 1.8); }
    }
    // ce qui brille reste lumineux, de jour comme de nuit
    for (const it of W.items) {
      const ix = it.x, iy = it.y;
      if (ix < -14 || ix > G.VW + 14) continue;
      if (it.k === 'bob') {
        x.drawImage(bob[(W.T * 16 + it.x * .03 | 0) & 7], ix - 5, iy - 5);
      } else if (it.k === 'pouv') {
        // une medaille d'or qui flotte et brille (medailles.js)
        G.Medailles.parcours(x, it, W);
      } else if (it.k === 'grosse') {
        // la grosse bobine : elle brille pour qu'on la voie de loin, et on a envie d'aller la chercher
        const by = iy + Math.round(Math.sin(W.T * 4) * 2);
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = 'rgba(255,220,120,.12)'; x.beginPath(); x.moveTo(ix - 10, -6); x.lineTo(ix + 10, -6); x.lineTo(ix + 30, by + 6); x.lineTo(ix - 30, by + 6); x.fill();
        x.fillStyle = 'rgba(255,220,120,.25)'; x.beginPath(); x.arc(ix, by, 16 + Math.sin(W.T * 6) * 2, 0, 7); x.fill();
        x.restore();
        x.drawImage(bob[(W.T * 12 | 0) & 7], ix - 10, by - 10, 20, 20);
        for (let i = 0; i < 3; i++) { const a = W.T * 3 + i * 2.1; x.fillStyle = '#fff'; x.fillRect(ix + Math.cos(a) * 15 | 0, by + Math.sin(a) * 15 | 0, 1, 1); }
        G.txt(x, '+' + it.val, ix, by + 13, '#ffe27a', { al: .5, contour: K });
      } else if (it.k === 'coeur') {
        const by = iy + Math.round(Math.sin(W.T * 4) * 2);
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = 'rgba(255,120,140,.26)'; x.beginPath(); x.arc(ix, by, 16 + Math.sin(W.T * 6) * 2, 0, 7); x.fill();
        x.restore();
        coeur(x, ix - 11, by - 10, 2.4, true);
      } else if (it.k === 'lettre') {
        const by = iy + Math.round(Math.sin(W.T * 5) * 2);
        x.fillStyle = K; x.fillRect(ix - 7, by - 7, 14, 14);
        x.fillStyle = '#fff'; x.fillRect(ix - 6, by - 6, 12, 12);
        x.fillStyle = K; for (let i = 0; i < 4; i++) x.fillRect(ix - 6 + i * 3, by - 6, 2, 2);
        G.txt(x, it.l, ix, by - 3, '#c8393b', { al: .5 });
      }
    }
    if (W.tirs.length) {
      for (const t of W.tirs) {
        x.fillStyle = 'rgba(255,230,120,.6)'; x.fillRect(t.x - 12 | 0, t.y - 1 | 0, 14, 3);
        x.fillStyle = '#fff'; x.fillRect(t.x - 4 | 0, t.y | 0, 8, 1);
      }
    }
    if (W.volees) for (const q of W.volees) {
      const k = q.t * q.t;
      x.drawImage(bob[(W.T * 24 | 0) & 7], G.lerp(q.x, 10, k) - 5 * (1 - k * .4), G.lerp(q.y, 28, k) - 5 * (1 - k * .4), 10 * (1 - k * .4), 10 * (1 - k * .4));
    }
    for (const p of W.parts) {
      x.fillStyle = p.c;
      if (p.conf !== undefined) { const k = Math.sin(W.T * 8 + p.conf); x.fillRect(p.x + Math.sin(W.T * 3 + p.conf) * 4, p.y, k > 0 ? 1.8 : .6, k > 0 ? .6 : 1.8); }
      else x.fillRect(p.x, p.y, p.s, p.s);
    }
    for (const o of W.obs) if (o.k === 'rayon') dessinerObstacle(x, o, W);
    const sc = W.sc;
    D.fxDessine(x, sc, 'avant', W.x - sc.x0, W.camY, W.T);
    D.devant(x, sc, W.x, W.camY, W.T);
    G.Lumiere.meteoDevant(x, sc, W, W.T);
    ambiance(x, W);
    G.Lumiere.devant(x, W.sc, W, W.T);
    iris(x, W);
    // derriere les menus, le decor vit sans bavarder ; dans la vue d'un decor depuis le carnet, on l'ecoute (Max, 05/11/2026)
    const att = W.demo && !W.vitrine && !W.vue ? [] : bullesAttente; bullesAttente = null;
    const qb = choisirParole(att, W);
    if (qb) bulleDessin(x, qb[0], qb[1], qb[2], qb[3]);
    x.restore();
    if (W.flash > 0) { x.fillStyle = `rgba(255,255,255,${Math.min(.45, W.flash * 2.4)})`; x.fillRect(0, 0, G.VW, G.VH); }
    // l'onde d'or du bonus de la statuette (game.js, explosionOscar) : un anneau part du cadreur et balaie tout l'ecran
    if (W.ondeOscar !== undefined && W.T - W.ondeOscar < .7) {
      const k = (W.T - W.ondeOscar) / .7, r = 12 + k * 520, cx = G.Jeu.HX, cy = W.y - 14;
      x.save(); x.globalAlpha = 1 - k;
      x.strokeStyle = '#ffd64c'; x.lineWidth = 6 * (1 - k) + 1; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke();
      x.strokeStyle = '#fff3b4'; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, Math.max(1, r - 4), 0, 7); x.stroke();
      x.restore();
    }
    // lieu de tournage : discret, en bas a droite
    if (!(W.trans && W.trans.kind === 'iris')) {
      const lieu = G.Jeu.lieuDe(W.sc.id);
      // a gauche d'un trou de camera qui serait dans le coin (G.libre)
      if (lieu) { const lw = G.txtW(lieu); G.txt(x, lieu, G.libre(G.VW - 6 - lw, G.VH - 13, lw, 10, -1) + lw, G.VH - 11, 'rgba(255,255,255,.72)', { al: 1, ombre: 'rgba(0,0,0,.45)' }); }
    }
    // le titre du lieu : en partie, dans le visualiseur, et dans la vue d'un decor depuis le carnet
    if (jeu) hud(x, W); else if (W.vitrine || W.vue) dessinerTitre(x, W);
  };

  function dessinerTitre(x, W) {
    if (W.titre) {
      const t = W.titre, k = Math.min(1, Math.min(t.T, 3.4 - t.T) * 2.4);
      const eb = 15 * k;
      x.fillStyle = '#000'; x.fillRect(0, 0, G.VW, eb); x.fillRect(0, G.VH - eb, G.VW, eb);
      x.globalAlpha = k;
      // un nom trop long pour l'ecran passe a la taille du dessous
      const T = t.t.toUpperCase(), sc = G.txtW(T, 3) > G.VW - 8 ? 2 : 3;
      G.txt(x, T, G.VW / 2, sc === 3 ? 78 : 84, '#fff', { al: .5, sc, contour: K });
      x.fillStyle = '#ffe27a'; x.fillRect(G.VW / 2 - 30, 106, 60, 1);
      G.txt(x, t.s, G.VW / 2, 112, '#ffe27a', { al: .5, contour: K });
      x.globalAlpha = 1;
    }
  }

  /* Les pictos : ce qu'ils font doit se voir au premier coup d'oeil */
  const PICTOS = {
    // un sablier
    ralenti: ['########', '.#....#.', '..#..#..', '...##...', '...##...', '..#..#..', '.#.##.#.', '########'],
    // deux fleches qui foncent
    turbo: ['#...#...', '##..##..', '.##..##.', '..##..##', '..##..##', '.##..##.', '##..##..', '#...#...'],
    // un ecusson
    bouclier: ['########', '#.####.#', '#.####.#', '#.####.#', '.#.##.#.', '.#.##.#.', '..#..#..', '...##...'],
    // une roquette
    roquette: ['......##', '....####', '#.#####.', '.#####..', '.####...', '#.###...', '..#.#...', '........'],
  };
  R.picto = (x, k, X, Y, pt, c) => { x.fillStyle = c; PICTOS[k].forEach((l, b) => { for (let a = 0; a < 8; a++) if (l[a] === '#') x.fillRect(X + a * pt, Y + b * pt, pt, pt); }); };
  // un coeur en gros pixels : plein ou vide
  const COEUR = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  function coeur(x, X, Y, pt, plein) {
    COEUR.forEach((l, b) => { for (let a = 0; a < 7; a++) if (l[a] === '#') { x.fillStyle = K; x.fillRect(X + a * pt - .6, Y + b * pt - .6, pt + 1.2, pt + 1.2); } });
    COEUR.forEach((l, b) => { for (let a = 0; a < 7; a++) if (l[a] === '#') { x.fillStyle = plein ? (b === 0 || (b === 1 && a < 3) ? '#ff9aa6' : b > 3 ? '#b81f35' : '#ee3a50') : '#3a3c48'; x.fillRect(X + a * pt, Y + b * pt, pt, pt); } });
  }
  R.coeur = coeur;
  /* Les boutons de bonus : des medailles sans texte, les uns sous les autres a gauche (medailles.js, G.BTN) */
  /* Le haut de l'ecran de jeu et les bandes du titre (Max, 07/11/2026) : « avec les bandes noires quand on change de decors on ne
     les voit plus ». En 1.9, tout le haut etait descendu de 14 unites ; puis « le personnage passe derriere les coeurs, remets-les a
     leur place mais par-dessus les bandes noires » : a gauche, distance, bobines, coeurs et bonus (G.BTN) sont a leur place d'avant,
     et les bandes du titre sont dessinees sous le haut de l'ecran (hud). La pause et les lettres ACTION restent descendues de
     HAUT_HUD. G.Rendu.hudPos dit ou est chaque element (tests/hud_bandes.js). */
  const HAUT_HUD = R.HAUT_HUD = 14;
  /* les coeurs : une ligne jusqu'a 3, puis deux lignes equilibrees (au plus 3 + 3 : J.COEURS_MAX), loin du drone (tests/coeurs.js) ;
     ils commencent a y 41, un peu sous les bobines (Max, 08/11/2026 : « trop colles aux pieces recuperees » ; avant 37) */
  // le septieme (la statuette d'or, 300 000 xp ; Max, 08/11/2026 : « a mettre sur la droite des autres, au milieu des deux lignes »)
  // chacun s'ecarte d'un trou de camera qui serait dans son coin (G.libre ; sans encoche, rien ne bouge)
  const coeurPlace = R.coeurPlace = (i, n) => {
    const dx = G.libre(6, 41, 66, 26, 1) - 6;
    if (n >= 7 && i === 6) return [7 + 3 * 16 + dx, 41 + 6.5];
    const m = Math.min(n, 6), haut = m <= 3 ? m : Math.ceil(m / 2), r = i < haut ? 0 : 1;
    return [7 + (r ? i - haut : i) * 16 + dx, 41 + r * 13];
  };
  R.hudPos = () => ({ distance: [G.libre(8, 6, 70, 14, 1), 6, 70, 14], bobines: [G.libre(8, 22, 60, 14, 1), 22, 60, 14],
    coeurs: [G.libre(6, 41, 66, 26, 1), 41, 52, 26],
    action: [G.VW / 2 - 30, 5 + HAUT_HUD, 60, 11], pause: [G.libre(G.VW - 22, 4 + HAUT_HUD, 18, 18, -1), 4 + HAUT_HUD, 18, 18] });
  function hud(x, W) {
    const Y = HAUT_HUD, P = R.hudPos();
    // le titre d'un nouveau pays et ses bandes noires d'abord : tout le haut de l'ecran se dessine par-dessus
    dessinerTitre(x, W);
    G.txt(x, Math.floor(W.dist || 0) + ' m', P.distance[0], 6, '#fff', { contour: K, sc: 2 });
    x.drawImage(bob[(W.T * 6 | 0) & 7], P.bobines[0], 22);
    G.txt(x, G.sav.bobines, P.bobines[0] + 14, 23, '#ffe27a', { contour: K, sc: 2 });
    // les coeurs : autant de chocs qu'on peut encaisser
    for (let i = 0; i < W.viesMax; i++) {
      const pop = W.coeurT > 0 && i === W.vies ? W.coeurT * 3 : 0, [cx, cy] = coeurPlace(i, W.viesMax);
      coeur(x, cx, cy - pop, 2, i < W.vies);
    }
    // lettres ACTION
    const lx = G.VW / 2 - 30;
    // les lettres ne s'affichent qu'une fois la premiere ramassee
    if (Object.keys(W.lettres).length) 'ACTION'.split('').forEach((c, i) => {
      const on = W.lettres[c];
      x.fillStyle = on ? '#fff' : 'rgba(0,0,0,.35)'; x.fillRect(lx + i * 10, 5 + Y, 9, 11);
      G.txt(x, c, lx + i * 10 + 4.5, 7 + Y, on ? '#c8393b' : 'rgba(255,255,255,.45)', { al: .5 });
    });
    if (W.boss) G.Boss.hud(x, W);
    if (W.vivant) G.Medailles.boutons(x, W);
    // pause
    const px = P.pause[0];
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, 4 + Y, 18, 18);
    x.fillStyle = '#fff'; x.fillRect(px + 5, 8 + Y, 3, 10); x.fillRect(px + 10, 8 + Y, 3, 10);
    // grand message
    for (const t of W.textes) {
      const a = Math.min(1, t.T * 4);
      x.globalAlpha = a;
      if (t.sm) G.txt(x, t.t, t.x, t.y - (1 - Math.min(1, t.T)) * 16, t.c, { al: .5, contour: K });
      else G.txt(x, t.t, G.VW / 2, t.y, t.c, { al: .5, contour: K, sc: t.big ? 3 : 1 });
      x.globalAlpha = 1;
    }
    // (le combo etait sous les coeurs, a la place de leur seconde ligne : il passe au milieu, sous les lettres ACTION)
    if (W.combo >= 2) G.txt(x, 'COMBO ×' + W.combo, G.VW / 2, 33, '#ff6b6b', { al: .5, contour: K });
    // tuto
    if (W.tJeu < 9 && (W.appuis || 0) < 3 && !G.sav.tuto && W.vivant && !(W.percee && !W.percee.casse)) {
      const a = (W.T * 3 | 0) % 2;
      G.txt(x, a ? 'Appuie pour monter' : 'Relâche pour descendre', G.VW / 2, 44, '#fff', { al: .5, contour: K });
    }
  }
})();
