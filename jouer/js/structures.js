/* Les structures : des blocages horizontaux, verticaux ou en diagonale, faits de la matiere du lieu
   (marches d'escalator a Paris, pierres jaunes en Egypte, barrieres de champ en Irlande...).
   Tout est peint ici au pixel : une matiere = une petite peinture qui se repete le long de la barre.
   bande : la peinture suit la barre et tourne avec elle. empile : des blocs droits, poses les uns sur les autres. */
'use strict';
(function () {
  const St = G.Structures = {};
  const K = '#17151f';
  const { rnd } = G;
  const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  // un petit hasard fixe, pour que la meme matiere soit toujours la meme
  const alea = g => { let s = g * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

  /* ---- Les peintures ---- */
  const P = {
    // un bloc de pierre taillee : arete claire, joint sombre, quelques eclats
    pierre(c, g) {
      return (x, w, h) => {
        const r = alea(g || 3);
        R(x, K, 0, 0, w, h);
        R(x, c[1], 1, 1, w - 2, h - 2);
        R(x, c[0], 1, 1, w - 2, 2); R(x, c[0], 1, 1, 2, h - 2);
        R(x, c[2], 1, h - 3, w - 2, 2); R(x, c[2], w - 3, 1, 2, h - 2);
        for (let i = 0; i < 14; i++) { const a = 3 + r() * (w - 7) | 0, b = 3 + r() * (h - 7) | 0; R(x, r() < .5 ? c[2] : c[0], a, b, 1 + (r() * 3 | 0), 1); }
        for (let i = 0; i < 2; i++) { let a = 4 + r() * (w - 9) | 0, b = 3; while (b < h - 5) { R(x, c[3], a, b, 1, 2); a += r() < .5 ? 1 : -1; b += 2; } if (r() < .5) break; }
      };
    },
    // des briques ou des carreaux, en quinconce
    briques(c, bw, bh) {
      return (x, w, h) => {
        const r = alea(7);
        R(x, K, 0, 0, w, h);
        R(x, c[3], 1, 1, w - 2, h - 2);
        for (let l = 0, y = 1; y < h - 1; l++, y += bh + 1) {
          for (let a = 1 - (l % 2 ? bw >> 1 : 0); a < w - 1; a += bw + 1) {
            const A = Math.max(1, a), B = Math.min(w - 1, a + bw), H = Math.min(bh, h - 1 - y);
            if (B <= A) continue;
            R(x, r() < .3 ? c[2] : c[1], A, y, B - A, H);
            R(x, c[0], A, y, B - A, 1); R(x, c[0], A, y, 1, H);
            R(x, c[2], A, y + H - 1, B - A, 1);
          }
        }
      };
    },
    // l'escalator vu de profil : la meme coupe que St.escalierProfil, pour ses debris
    escalator(x, w, h) {
      const a = h * .08 | 0, b = h * .42 | 0, c = h * .54 | 0;
      R(x, K, 0, a - 1, w, 4); R(x, '#23232b', 0, a, w, 2);
      R(x, 'rgba(170,215,235,.5)', 0, a + 3, w, b - a - 3);
      for (let i = 0; i < w; i += 7) { R(x, '#c8ced8', i, b, 6, c - b); R(x, '#ffd23c', i + 5, b, 1, c - b); }
      R(x, K, 0, c, w, h - c); R(x, '#4e525e', 0, c + 1, w, h - c - 2); R(x, '#7d828f', 0, c + 1, w, 1);
      for (let i = 3; i < w; i += 10) R(x, '#7d828f', i, c + 4, 2, 2);
    },
    // une poutre rivetee ajouree, comme le metro aerien ou la tour
    treillis(c) {
      return (x, w, h) => {
        const e = 4;
        for (let i = 0; i < w; i++) {
          const k = i / w, y1 = 2 + (h - 4) * Math.abs(1 - 2 * k), y2 = 2 + (h - 4) * (1 - Math.abs(1 - 2 * k));
          R(x, K, i, y1 - 2, 1, 5); R(x, K, i, y2 - 2, 1, 5);
        }
        for (let i = 0; i < w; i++) {
          const k = i / w, y1 = 2 + (h - 4) * Math.abs(1 - 2 * k), y2 = 2 + (h - 4) * (1 - Math.abs(1 - 2 * k));
          R(x, c[1], i, y1 - 1, 1, 3); R(x, c[1], i, y2 - 1, 1, 3);
        }
        R(x, K, 0, 0, w, e + 2); R(x, K, 0, h - e - 2, w, e + 2);
        R(x, c[1], 0, 1, w, e); R(x, c[1], 0, h - e - 1, w, e);
        R(x, c[0], 0, 1, w, 1); R(x, c[0], 0, h - e - 1, w, 1);
        R(x, c[2], 0, e, w, 1); R(x, c[2], 0, h - 2, w, 1);
        for (let i = 3; i < w; i += 8) { R(x, c[0], i, 2, 2, 2); R(x, c[0], i, h - e, 2, 2); }
      };
    },
    // des planches en travers, sur deux longerons
    planches(c, pas) {
      return (x, w, h) => {
        const r = alea(5);
        R(x, K, 0, 0, w, h);
        for (let a = 0; a < w; a += pas) {
          R(x, r() < .3 ? c[2] : c[1], a + 1, 1, pas - 2, h - 2);
          R(x, c[0], a + 1, 1, pas - 2, 1); R(x, c[0], a + 1, 1, 1, h - 2);
          R(x, c[3], a + (pas >> 1), 2 + r() * (h - 8) | 0, 1, 3);
          R(x, c[3], a + 2, 4, 1, 1); R(x, c[3], a + 2, h - 5, 1, 1);
        }
      };
    },
    // la barriere de champ : piquets et trois lisses, on voit a travers
    barriere(c) {
      return (x, w, h) => {
        for (const y of [3, (h >> 1) - 1, h - 7]) { R(x, K, 0, y - 1, w, 6); R(x, c[1], 0, y, w, 4); R(x, c[0], 0, y, w, 1); R(x, c[2], 0, y + 3, w, 1); }
        for (const a of [3, (w >> 1) + 3]) { R(x, K, a - 1, 0, 8, h); R(x, c[1], a, 1, 6, h - 2); R(x, c[0], a, 1, 2, h - 2); R(x, c[2], a + 5, 1, 1, h - 2); R(x, c[3], a + 2, 8, 2, 1); R(x, c[3], a + 3, h - 9, 2, 1); }
      };
    },
    // le muret irlandais : pierres seches irregulieres, mousse dessus
    muret(x, w, h) {
      const r = alea(11), c = ['#b6b6ac', '#92938a', '#6f7069', '#4e4f4a'];
      R(x, K, 0, 0, w, h);
      for (let y = 1; y < h - 1;) {
        const ht = 4 + r() * 4 | 0, H = Math.min(ht, h - 1 - y);
        for (let a = 1; a < w - 1;) {
          const l = 5 + r() * 9 | 0, L = Math.min(l, w - 1 - a), t = r() < .4 ? c[0] : r() < .6 ? c[1] : c[2];
          R(x, t, a, y, L - 1, H - 1); R(x, '#d6d6cc', a, y, L - 1, 1);
          a += l;
        }
        y += ht;
      }
      R(x, '#4f7a3a', 1, 1, w - 2, 2);
      for (let a = 2; a < w - 2; a += 3) R(x, r() < .5 ? '#6f9f4e' : '#3f6a30', a, 2 + r() * 3 | 0, 2, 1);
    },
    // du velours : plis rouges et frange doree
    velours(x, w, h) {
      R(x, K, 0, 0, w, h);
      for (let a = 0; a < w; a++) { const k = Math.sin(a / w * Math.PI * 2); R(x, k > .35 ? '#c8283c' : k > -.3 ? '#a01a2e' : '#70101f', a, 1, 1, h - 6); }
      R(x, '#ffd86a', 0, h - 5, w, 1); R(x, '#c89a30', 0, h - 4, w, 2);
      for (let a = 1; a < w; a += 3) R(x, '#ffd86a', a, h - 3, 1, 2);
    },
    // le pont de lumiere des plateaux : tubes noirs, projecteurs
    truss(x, w, h) {
      for (let i = 0; i < w; i++) { const k = i / w, y = 3 + (h - 7) * Math.abs(1 - 2 * k); R(x, K, i, y - 1, 1, 3); R(x, '#6c7080', i, y, 1, 1); }
      for (const y of [1, h - 5]) { R(x, K, 0, y - 1, w, 5); R(x, '#4a4d5a', 0, y, w, 3); R(x, '#a4a9b8', 0, y, w, 1); }
      R(x, K, (w >> 1) - 5, (h >> 1) - 4, 10, 8); R(x, '#2c2d36', (w >> 1) - 4, (h >> 1) - 3, 8, 6); R(x, '#ffe9a0', (w >> 1) - 2, (h >> 1) - 1, 4, 3);
    },
    // le tapis a bagages, valises comprises
    bagages(x, w, h) {
      R(x, K, 0, 0, w, h);
      R(x, '#2c2c34', 0, h - 8, w, 7);
      for (let a = 2; a < w; a += 8) { R(x, '#494954', a, h - 7, 4, 2); R(x, '#14141a', a + 1, h - 4, 3, 2); }
      R(x, '#54545f', 0, h - 9, w, 1);
      R(x, '#1e1d28', 0, 1, w, h - 10);
      const v = [[3, 18, 13, '#c43c32', '#ff7a66'], [25, 14, 9, '#2f68b4', '#6fa4e8'], [44, 22, 14, '#b58a42', '#e4bd76'], [70, 15, 11, '#3c8a56', '#74c490']];
      for (const [a, l, H, c, q] of v) {
        const y = h - 9 - H;
        R(x, K, a - 1, y - 1, l + 2, H + 1); R(x, c, a, y, l, H); R(x, q, a, y, l, 1); R(x, q, a, y, 1, H);
        R(x, K, a + 3, y + 2, 1, H - 2); R(x, K, a + l - 4, y + 2, 1, H - 2);
        R(x, K, a + (l >> 1) - 2, y - 3, 5, 3); R(x, '#1e1d28', a + (l >> 1) - 1, y - 2, 3, 2);
      }
    },
    // la bande de la mine, chargee de minerai
    convoyeur(x, w, h) {
      const r = alea(23);
      R(x, K, 0, 0, w, h);
      R(x, '#3a3a40', 0, h - 9, w, 8);
      for (let a = 3; a < w; a += 10) { R(x, K, a, h - 8, 6, 6); R(x, '#8a8c94', a + 1, h - 7, 4, 4); R(x, K, a + 2, h - 6, 2, 2); }
      R(x, '#1b1b20', 0, h - 11, w, 2);
      for (let a = 0; a < w; a += 3) { const H = 3 + r() * 8 | 0; R(x, r() < .3 ? '#7d9f5a' : r() < .6 ? '#a8553a' : '#7c3f2c', a, h - 11 - H, 3, H); R(x, '#c9825a', a, h - 11 - H, 2, 1); }
    },
    // des pneus de circuit, peints un sur deux
    pneus(x, w, h) {
      R(x, K, 0, 0, w, h);
      for (let l = 0, y = 1; l < 2; l++, y += (h >> 1)) {
        const H = (h >> 1) - 1;
        R(x, '#26262c', 1, y, w - 2, H);
        R(x, l ? '#f0efe8' : '#d62c26', 4, y, w - 8, 3);
        for (let a = 2; a < w - 2; a += 3) R(x, '#3e3e46', a, y + 4, 1, H - 5);
        R(x, '#0c0c10', 1, y + H - 1, w - 2, 1);
      }
    },
    // le ballot de foin
    ballot(x, w, h) {
      const r = alea(31);
      R(x, K, 0, 0, w, h);
      R(x, '#d6b552', 1, 1, w - 2, h - 2);
      for (let i = 0; i < 90; i++) { R(x, r() < .5 ? '#f0d478' : '#a88a34', 1 + r() * (w - 4) | 0, 1 + r() * (h - 3) | 0, 2 + r() * 3 | 0, 1); }
      for (const a of [(w * .28) | 0, (w * .72) | 0]) { R(x, '#6a4a22', a, 1, 2, h - 2); }
      R(x, '#fff0a8', 1, 1, w - 2, 1); R(x, '#8a6e28', 1, h - 2, w - 2, 1);
    },
    // des rondins couverts de neige
    rondins(x, w, h) {
      R(x, K, 0, 0, w, h);
      const n = 3, H = (h - 2) / n | 0;
      for (let i = 0; i < n; i++) {
        const y = 1 + i * H;
        R(x, i % 2 ? '#6a4a2e' : '#7c5836', 1 - 1, y, w, H - 1);
        R(x, '#9a7648', 0, y, w, 1); R(x, '#3f2c1c', 0, y + H - 2, w, 1);
        for (let a = (i * 7) % 11; a < w; a += 11) R(x, '#553a24', a, y + 2, 5, 1);
      }
      R(x, '#f2f7fd', 0, 1, w, 4); R(x, '#ffffff', 0, 1, w, 1); R(x, '#bcd0e4', 0, 5, w, 1);
      for (let a = 2; a < w; a += 7) R(x, '#f2f7fd', a, 5, 3, 2);
    },
    // un filet de securite orange
    filet(x, w, h) {
      for (const y of [0, h - 3]) { R(x, K, 0, y, w, 3); R(x, '#3a3c48', 0, y + 1, w, 1); }
      for (let i = 0; i < w; i++) for (let j = -h; j < w; j += 8) { const y = (i - j) % 16, q = y < 0 ? y + 16 : y, Y = q <= 8 ? q : 16 - q; if (j === -h) R(x, '#ff7a22', i, 2 + ((Y * (h - 4)) / 8 | 0), 1, 2); }
      for (let i = 0; i < w; i++) { const y = i % 16, Y = y <= 8 ? 8 - y : y - 8; R(x, '#e05a10', i, 2 + ((Y * (h - 4)) / 8 | 0), 1, 2); }
    },
    // des bottes de roseaux liees
    sagne(x, w, h) {
      const r = alea(13);
      R(x, K, 0, 0, w, h);
      for (let a = 0; a < w; a++) R(x, r() < .3 ? '#ecd898' : r() < .6 ? '#c9b06a' : '#9c8446', a, 1, 1, h - 2);
      for (const a of [6, 24]) { R(x, '#3e2e1c', a, 1, 3, h - 2); R(x, '#6a5030', a, 1, 1, h - 2); }
    },
    // la palissade du kraal : poteaux bruts et une traverse
    kraal(x, w, h) {
      const r = alea(17);
      for (let a = 0; a < w; a += 7) { const t = r() * 4 | 0; R(x, K, a, t, 7, h - t); R(x, r() < .5 ? '#8a6238' : '#6f4c2a', a + 1, t + 1, 5, h - t - 2); R(x, '#b08a58', a + 1, t + 1, 1, h - t - 2); }
      R(x, K, 0, 6, w, 5); R(x, '#4a3420', 0, 7, w, 3); R(x, '#7a5a38', 0, 7, w, 1);
      R(x, K, 0, h - 10, w, 5); R(x, '#4a3420', 0, h - 9, w, 3); R(x, '#7a5a38', 0, h - 9, w, 1);
    },
    // les barreaux de la prison
    barreaux(x, w, h) {
      for (let a = 2; a < w; a += 8) { R(x, K, a - 1, 0, 5, h); R(x, '#4a4d56', a, 1, 3, h - 2); R(x, '#9499a6', a, 1, 1, h - 2); }
      for (const y of [0, h - 5]) { R(x, K, 0, y, w, 5); R(x, '#3e4048', 0, y + 1, w, 3); R(x, '#878c98', 0, y + 1, w, 1); }
    },
    // la lave : basalte et fissures qui rougeoient
    lave(f) {
      return (x, w, h) => {
        const r = alea(19);
        R(x, K, 0, 0, w, h);
        R(x, '#2b2930', 1, 1, w - 2, h - 2);
        for (let i = 0; i < 30; i++) R(x, r() < .5 ? '#46434c' : '#1c1a20', 1 + r() * (w - 5) | 0, 1 + r() * (h - 3) | 0, 2 + r() * 4 | 0, 1);
        R(x, '#5c5862', 1, 1, w - 2, 1);
        const c = f ? ['#ffe07a', '#ff8a2a'] : ['#ff7a22', '#b8341c'];
        for (let n = 0; n < 3; n++) {
          let a = r() * w | 0, b = 3 + r() * (h - 8) | 0;
          for (let i = 0; i < 12; i++) { R(x, c[1], a, b, 2, 2); R(x, c[0], a, b, 1, 1); a = (a + 2) % w; b = Math.max(3, Math.min(h - 5, b + (r() < .5 ? 1 : -1))); }
        }
      };
    },
    // des bambous lies
    bambou(x, w, h) {
      R(x, K, 0, 0, w, h);
      const n = 3, H = (h - 2) / n | 0;
      for (let i = 0; i < n; i++) {
        const y = 1 + i * H;
        R(x, '#9db84e', 0, y, w, H - 1); R(x, '#d4e27c', 0, y, w, 1); R(x, '#6c8a30', 0, y + H - 2, w, 1);
        for (let a = (i * 9) % 18; a < w; a += 18) { R(x, '#4f6a22', a, y, 2, H - 1); R(x, '#e4ec96', a + 2, y, 1, H - 1); }
      }
      R(x, '#5a4326', (w >> 1) - 2, 0, 4, h);
    },
    // un rack de planches de surf
    surf(x, w, h) {
      const c = [['#ff6a4a', '#ffd0b8'], ['#2fb8c8', '#c0f4f4'], ['#ffd23c', '#fff4b8']];
      c.forEach((q, i) => {
        const a = 3 + i * (w / 3 | 0), L = (w / 3 | 0) - 5;
        R(x, K, a - 1, 1, L + 2, h - 2);
        R(x, K, a, 0, L, 1); R(x, K, a, h - 1, L, 1);
        R(x, q[0], a, 2, L, h - 4); R(x, q[1], a + (L >> 1) - 1, 2, 2, h - 4); R(x, q[1], a, 2, 1, h - 4);
      });
    },
    // une natte tressee
    natte(x, w, h) {
      R(x, K, 0, 0, w, h);
      for (let a = 0; a < w; a += 4) for (let b = 1; b < h - 1; b += 4) { const d = ((a / 4 + (b - 1) / 4) % 2) === 0; R(x, d ? '#d4b078' : '#94683a', a, b, 4, 4); R(x, d ? '#ecd09c' : '#b08850', a, b, 3, 1); }
    },
    // les panneaux lumineux du stade : du mouvement, pas de marque
    led(x, w, h) {
      R(x, K, 0, 0, w, h);
      R(x, '#07070c', 1, 2, w - 2, h - 4);
      R(x, '#5a5c68', 0, 1, w, 1); R(x, '#5a5c68', 0, h - 2, w, 1);
      const c = ['#2ff0a8', '#ffd23c', '#ff4a78', '#42b8ff'];
      for (let i = 0; i < 4; i++) {
        const a = i * (w / 4), m = h >> 1;
        for (let k = 0; k < 7; k++) { R(x, c[i], a + 3 + k, m - 7 + k, 3, 2); R(x, c[i], a + 3 + k, m + 6 - k, 3, 2); }
      }
      for (let a = 0; a < w; a += 2) R(x, 'rgba(0,0,0,.34)', a, 2, 1, h - 4);
    },
    // des colonnes romaines, cannelees, couchees ou debout
    romain(x, w, h) {
      R(x, K, 0, 0, w, h);
      const tons = ['#f0e8d4', '#d8cfb8', '#efe6d0', '#bcb29a', '#e8dfc8', '#a89e86'];
      for (let y = 1; y < h - 1; y++) R(x, tons[(y >> 1) % tons.length], 0, y, w, 1);
      R(x, '#c89a30', 0, 1, w, 1); R(x, '#c89a30', 0, h - 2, w, 1);
      R(x, '#fff6dc', w - 6, 1, 4, h - 2); R(x, '#8a8068', w - 2, 1, 2, h - 2);
    },
    // le tapis de laine berbere
    tapis(x, w, h) {
      R(x, K, 0, 0, w, h);
      R(x, '#a82a2a', 1, 1, w - 2, h - 2);
      R(x, '#f0e2c0', 0, 1, w, 2); R(x, '#f0e2c0', 0, h - 3, w, 2);
      for (let a = 1; a < w; a += 2) { R(x, '#1f1a2a', a, 3, 1, 1); R(x, '#1f1a2a', a, h - 4, 1, 1); }
      const m = h >> 1;
      for (let k = 0; k < 7; k++) { R(x, '#f0e2c0', (w >> 1) - k, m - 6 + k, 2 * k + 1, 1); R(x, '#f0e2c0', (w >> 1) - k, m + 6 - k, 2 * k + 1, 1); }
      for (let k = 0; k < 4; k++) { R(x, '#1f1a2a', (w >> 1) - k, m - 3 + k, 2 * k + 1, 1); R(x, '#1f1a2a', (w >> 1) - k, m + 3 - k, 2 * k + 1, 1); }
    },
    // les tuyaux rouilles du film
    tuyau(f) {
      return (x, w, h) => {
        R(x, K, 0, 0, w, h);
        for (let y = 1; y < h - 1; y++) { const k = (y - 1) / (h - 3); R(x, k < .2 ? '#d2a074' : k < .55 ? '#9a6c48' : k < .85 ? '#6e4a32' : '#44301f', 0, y, w, 1); }
        for (const a of [6, 30]) { R(x, K, a - 1, 0, 8, h); R(x, '#7f8088', a, 1, 6, h - 2); R(x, '#c4c6cc', a, 1, 2, h - 2); }
        R(x, K, 16, (h >> 1) - 2, 7, 4); R(x, f ? '#ff4a3a' : '#5a1a14', 17, (h >> 1) - 1, 2, 2); R(x, f ? '#2a4a2a' : '#4cff7a', 20, (h >> 1) - 1, 2, 2);
      };
    },
    // le recif
    corail(x, w, h) {
      const r = alea(29), c = ['#ff7a8a', '#ffb25a', '#c86ae0', '#ff5a6a', '#fff0b0'];
      R(x, K, 0, 0, w, h);
      R(x, '#7c3f58', 1, 1, w - 2, h - 2);
      for (let i = 0; i < 22; i++) { const a = 1 + r() * (w - 7) | 0, b = 1 + r() * (h - 7) | 0, q = c[r() * c.length | 0], n = 3 + r() * 3 | 0; R(x, q, a, b, n, n); R(x, '#ffffff', a, b, 1, 1); }
    },
    // la poutre d'epave, rouillee, ou poussent les algues
    epave(x, w, h) {
      R(x, K, 0, 0, w, h);
      R(x, '#7c4e34', 0, 1, w, h - 2); R(x, '#a86c44', 0, 1, w, 2); R(x, '#4e3020', 0, h - 3, w, 2);
      R(x, '#5c3a26', 0, 6, w, h - 12);
      for (let a = 3; a < w; a += 9) { R(x, '#c68a5c', a, 3, 2, 2); R(x, '#c68a5c', a, h - 5, 2, 2); }
      for (let a = 5; a < w; a += 13) { R(x, '#3e8a58', a, h - 7, 3, 6); R(x, '#62b47a', a + 1, h - 7, 1, 5); }
    },
    // les baies de la regie : voyants qui clignotent
    rack(f) {
      return (x, w, h) => {
        const r = alea(f ? 41 : 37);
        R(x, K, 0, 0, w, h);
        R(x, '#c8ccd8', 1, 1, w - 2, h - 2);
        R(x, '#eef0f6', 1, 1, w - 2, 1);
        for (let y = 3; y < h - 3; y += 6) {
          R(x, '#3e414c', 2, y, w - 4, 5); R(x, '#14141a', 2, y + 4, w - 4, 1);
          for (let a = 4; a < w - 4; a += 3) if (r() < .55) R(x, ['#4cff7a', '#ffd23c', '#ff4a3a', '#42b8ff'][r() * 4 | 0], a, y + 1, 2, 2);
        }
      };
    },
    // les chemins de cables
    cables(x, w, h) {
      R(x, K, 0, 0, w, h);
      const c = ['#d62c26', '#2f68b4', '#ffd23c', '#2ca858', '#e8e8ee'];
      const H = (h - 2) / c.length;
      c.forEach((q, i) => { const y = 1 + i * H | 0; R(x, q, 0, y, w, Math.ceil(H)); R(x, 'rgba(255,255,255,.4)', 0, y, w, 1); R(x, 'rgba(0,0,0,.34)', 0, y + Math.ceil(H) - 1, w, 1); });
      for (const a of [8, 40]) { R(x, K, a, 0, 6, h); R(x, '#6c7080', a + 1, 1, 4, h - 2); }
    },
    // le zinc des toits, ses joints debout
    zinc(x, w, h) {
      R(x, K, 0, 0, w, h);
      R(x, '#8e9aa8', 1, 1, w - 2, h - 2);
      for (let a = 0; a < w; a += 8) { R(x, '#c2ccd6', a, 1, 2, h - 2); R(x, '#5f6b78', a + 2, 1, 1, h - 2); }
      R(x, '#d8e0e8', 1, 1, w - 2, 1); R(x, '#4e5a66', 1, h - 2, w - 2, 1);
    },
    // une ligne de bouees sur son filin
    bouees(x, w, h) {
      const m = h >> 1;
      R(x, K, 0, m - 2, w, 4); R(x, '#d8c8a0', 0, m - 1, w, 2);
      const c = [['#e8392e', '#ff8a7a'], ['#f4f0e4', '#ffffff']];
      c.forEach((q, i) => {
        const a = 3 + i * (w >> 1), L = (w >> 1) - 6;
        R(x, K, a - 1, 2, L + 2, h - 4); R(x, K, a + 2, 1, L - 4, h - 2);
        R(x, q[0], a, 3, L, h - 6); R(x, q[1], a, 3, L, 2); R(x, q[1], a, 3, 2, h - 6);
      });
    },
  };

  /* ---- Les matieres ---- l : longueur d'un motif en pixels, h : epaisseur, defile : vitesse du motif en unites/s */
  const pierre = (c, g, n) => ({ n, peint: P.pierre(c, g), l: 32, h: 27, empile: true, c: c[1] });
  const M = St.MATIERES = {
    escalator: { n: "Marches d'escalator", peint: P.escalator, l: 28, h: 36, c: '#8d939f' },
    viaduc: { n: 'Métro aérien', peint: P.treillis(['#7fb49a', '#3f7560', '#274a3c']), l: 36, h: 28, ajoure: true, c: '#3f7560' },
    fer: { n: 'Fer de la tour', peint: P.treillis(['#b89a74', '#6f5440', '#47362a']), l: 28, h: 28, ajoure: true, c: '#6f5440' },
    zinc: { n: 'Zinc des toits', peint: P.zinc, l: 24, h: 26, c: '#8e9aa8' },
    carrelage: { n: 'Carreaux de métro', peint: P.briques(['#ffffff', '#ece4cc', '#cfc7ae', '#7a7668'], 14, 7), l: 32, h: 27, empile: true, c: '#ece4cc' },
    pierre_jaune: pierre(['#f4dc98', '#dcb760', '#a98740', '#6f5629'], 3, 'Pierres jaunes'),
    craie: pierre(['#fbf7ea', '#e4decb', '#b8b09a', '#8a8470'], 4, 'Blocs de craie'),
    granit: pierre(['#b9b8b0', '#8f8e86', '#66655f', '#46453f'], 5, 'Granit du Mont'),
    gres: pierre(['#cfc4a8', '#a89c80', '#7a7058', '#544c3a'], 6, 'Grès du Cap'),
    toub: { n: 'Briques de terre', peint: P.briques(['#e0a56a', '#bc8048', '#986234', '#5a3a1e'], 13, 6), l: 32, h: 27, empile: true, c: '#bc8048' },
    romain: { n: 'Colonnes romaines', peint: P.romain, l: 40, h: 28, c: '#d8cfb8' },
    muret: { n: 'Muret de pierres sèches', peint: P.muret, l: 36, h: 27, empile: true, c: '#92938a' },
    barriere: { n: 'Barrière blanche', peint: P.barriere(['#ffffff', '#dcd8cc', '#9a968a', '#7a766a']), l: 44, h: 28, ajoure: true, c: '#dcd8cc' },
    barriere_irl: { n: 'Barrière de champ', peint: P.barriere(['#a89c84', '#7c705a', '#544a38', '#3a3226']), l: 44, h: 28, ajoure: true, c: '#7c705a' },
    planches: { n: 'Les Planches', peint: P.planches(['#d8ae7c', '#b08454', '#8e6a42', '#5e452a'], 9), l: 36, h: 26, c: '#b08454' },
    ponton: { n: 'Ponton', peint: P.planches(['#a8947a', '#7c6a52', '#5c4e3c', '#3a3024'], 9), l: 36, h: 26, c: '#7c6a52' },
    bois_flotte: { n: 'Bois flotté', peint: P.planches(['#d8d0bc', '#ada48e', '#888068', '#5e5846'], 13), l: 39, h: 26, c: '#ada48e' },
    velours: { n: 'Velours rouge', peint: P.velours, l: 14, h: 28, c: '#a01a2e', ondule: 3.2 },
    truss: { n: 'Pont de lumière', peint: P.truss, l: 32, h: 26, ajoure: true, c: '#4a4d5a' },
    bagages: { n: 'Tapis à bagages', peint: P.bagages, l: 92, h: 32, defile: 28, c: '#2c2c34' },
    convoyeur: { n: 'Bande de la mine', peint: P.convoyeur, l: 40, h: 28, defile: 40, c: '#7c3f2c' },
    pneus: { n: 'Pneus de circuit', peint: P.pneus, l: 30, h: 27, empile: true, c: '#26262c' },
    ballot: { n: 'Ballots de foin', peint: P.ballot, l: 34, h: 27, empile: true, c: '#d6b552' },
    rondins: { n: 'Rondins enneigés', peint: P.rondins, l: 44, h: 28, c: '#7c5836', defile: 10 },
    filet: { n: 'Filet de piste', peint: P.filet, l: 32, h: 28, ajoure: true, c: '#ff7a22', ondule: 4 },
    sagne: { n: 'Bottes de roseaux', peint: P.sagne, l: 36, h: 27, c: '#c9b06a' },
    kraal: { n: 'Palissade', peint: P.kraal, l: 35, h: 28, ajoure: true, c: '#8a6238' },
    barreaux: { n: 'Barreaux', peint: P.barreaux, l: 16, h: 30, ajoure: true, c: '#4a4d56' },
    lave: { n: 'Lave', peint: P.lave(0), peint2: P.lave(1), l: 48, h: 28, c: '#2b2930' },
    bambou: { n: 'Bambous', peint: P.bambou, l: 36, h: 27, c: '#9db84e' },
    surf: { n: 'Planches de surf', peint: P.surf, l: 54, h: 28, ajoure: true, c: '#2fb8c8' },
    natte: { n: 'Natte tressée', peint: P.natte, l: 24, h: 26, c: '#94683a', ondule: 2.6 },
    led: { n: 'Panneaux lumineux', peint: P.led, l: 64, h: 28, defile: 46, c: '#2ff0a8' },
    tapis: { n: 'Tapis berbère', peint: P.tapis, l: 26, h: 27, c: '#a82a2a', ondule: 5 },
    tuyau: { n: 'Tuyaux du film', peint: P.tuyau(0), peint2: P.tuyau(1), l: 44, h: 26, c: '#9a6c48' },
    corail: { n: 'Récif', peint: P.corail, l: 32, h: 28, empile: true, c: '#ff7a8a' },
    epave: { n: "Poutre d'épave", peint: P.epave, l: 36, h: 27, c: '#7c4e34' },
    rack: { n: 'Baies de la régie', peint: P.rack(0), peint2: P.rack(1), l: 36, h: 30, c: '#34363f' },
    cables: { n: 'Chemin de câbles', peint: P.cables, l: 64, h: 24, c: '#2f68b4' },
    bouees: { n: 'Ligne de bouées', peint: P.bouees, l: 44, h: 26, ajoure: true, c: '#e8392e', ondule: 2.4 },
    // les villes : poutrelles et escaliers de secours de New York, brique des studios, pierre de Caen, ballast du tram
    poutrelle: { n: 'Poutrelles de chantier', peint: (x, w, h) => {
      R(x, K, 0, 2, w, h - 4); R(x, '#c8462c', 0, 3, w, 5); R(x, '#e8683c', 0, 3, w, 1); R(x, '#c8462c', 0, h - 8, w, 5); R(x, '#8a2c1c', 0, h - 4, w, 1);
      R(x, '#a4351f', 0, 8, w, h - 16); R(x, '#7a2616', 0, 8, w, 2);
      for (let a = 3; a < w; a += 8) { R(x, '#f08a5c', a, 4, 2, 2); R(x, '#f08a5c', a, h - 7, 2, 2); }
    }, l: 32, h: 26, c: '#c8462c' },
    secours: { n: 'Escalier de secours', peint: (x, w, h) => {
      const f = '#22202a', g = '#5a5868', m = h - 7;
      R(x, K, 0, m - 1, w, 6); R(x, f, 0, m, w, 4); R(x, g, 0, m, w, 1);
      R(x, K, 0, 1, w, 3); R(x, g, 0, 2, w, 1);
      for (let a = 0; a < w; a += 6) { R(x, K, a, 2, 3, m - 2); R(x, f, a + 1, 2, 1, m - 2); }
      for (let i = 0; i < 18; i++) { const a = 3 + i * 1.6, b = m - 2 - i * 1.05; R(x, K, a - 1, b - 1, 4, 3); R(x, g, a, b, 2, 1); }
    }, l: 36, h: 28, ajoure: true, c: '#3a3844' },
    brique_rouge: { n: 'Briques rouges', peint: P.briques(['#d8785c', '#a8452f', '#86341f', '#4a2a22'], 13, 6), l: 32, h: 27, empile: true, c: '#a8452f' },
    pierre_caen: pierre(['#f8ecc8', '#e4d0a0', '#b8a274', '#84724e'], 8, 'Pierre de Caen'),
    rail_tram: { n: 'Rails et traverses', peint: (x, w, h) => {
      R(x, K, 0, 0, w, h); R(x, '#5f6b44', 1, 1, w - 2, h - 2);
      for (let a = 2; a < w; a += 11) { R(x, '#6a543c', a, 3, 7, h - 6); R(x, '#8a7050', a, 3, 7, 1); }
      for (const y of [6, h - 9]) { R(x, K, 0, y - 1, w, 5); R(x, '#a4a8b4', 0, y, w, 3); R(x, '#e4e8f0', 0, y, w, 1); }
    }, l: 33, h: 26, c: '#6a543c' },
  };

  /* ---- Qui utilise quoi : la region d'abord, le decor peut preciser ---- */
  St.PAR_REGION = {
    metro: ['escalator', 'carrelage'], paris: ['escalator', 'viaduc'], deauville: ['planches', 'bois_flotte'], normandie: ['barriere', 'ballot'],
    camargue: ['sagne', 'barriere_irl'], alpes: ['rondins', 'filet'], afriquesud: ['kraal', 'gres'], australie: ['bois_flotte', 'ponton'],
    egypte: ['pierre_jaune'], hawaii: ['surf', 'lave'], irlande: ['barriere_irl', 'muret'], mediterranee: ['ponton', 'bouees'],
    caledonie: ['natte', 'bambou'], reunion: ['lave', 'bambou'], puy: ['romain'], stade: ['led'], tunisie: ['toub', 'tapis'], tatooine: ['tuyau', 'toub'],
    sousmarin: ['corail', 'epave'], regie: ['rack', 'cables'], newyork: ['secours', 'poutrelle'], berlin: ['brique_rouge', 'poutrelle'],
    madagascar: ['bambou', 'natte'], niger: ['toub', 'natte'], maroc: ['toub', 'tapis'], russie: ['rondins', 'brique_rouge'], londres: ['brique_rouge', 'fer'], canada: ['rondins', 'brique_rouge'],
    _mer: ['ponton', 'bouees'], _salle: ['truss', 'velours'],
  };
  St.PAR_DECOR = {
    paris_toits: ['zinc', 'fer'], paris_rooftop: ['escalator', 'zinc'], paris_eiffel: ['fer', 'escalator'], paris_aero: ['bagages'], tokyo_expo: ['truss'], circuit: ['pneus'],
    cid_tapis: ['velours'], cid_hall: ['truss', 'velours'], cid_salle: ['velours'],
    sjdm_plage: ['planches', 'bois_flotte'], glenan: ['ponton', 'bouees'], maison: ['barriere', 'muret', 'ballot'],
    msm: ['granit'], msm_moutons: ['granit', 'barriere'], sgr_moisson: ['barriere'], cuves_lcj: ['convoyeur', 'tuyau'], ducey: ['barriere', 'muret'], cuves_serres: ['tuyau'], vars: ['filet', 'pneus'], vars_ski: ['filet', 'rondins'],
    eg_blanc: ['craie'], cap_prison: ['barreaux'], cap_plateau: ['gres'], cap_plateau2: ['gres'], cap_panneau: ['gres', 'kraal'], cap_manchots: ['bois_flotte'], aus_bundaberg: ['bois_flotte'],
    nc_mine: ['convoyeur'], ha_plage: ['surf', 'bambou'], ha_windsurf: ['surf', 'bouees'], ha_paysage: ['lave'], ha_etoiles: ['lave'], re_foret: ['bambou'], re_gecko: ['bambou'], re_parc: ['bambou'], tu_bateaux: ['ponton', 'bouees'],
    ny_manhattan: ['secours', 'poutrelle'], caen_quais: ['pierre_caen', 'ponton'], sevran_canoe: ['ponton', 'bouees'], sd_studios: ['brique_rouge', 'truss'], paris_champs: ['fer', 'barriere'], lyon_oxygene: ['rail_tram', 'viaduc'],
    melbourne: ['rail_tram', 'poutrelle'], chausey: ['granit', 'bois_flotte'], irkoutsk: ['rondins', 'filet'], nuweiba: ['bois_flotte', 'natte'],
    tu_enfant: ['toub', 'tapis'], tu_mosquee: ['toub'], tu_caravane: ['toub', 'tapis'], tu_canyon: ['gres'], jo_tours: ['gres', 'kraal'], jo_campement: ['kraal', 'gres'], clairefontaine: ['barriere', 'led'],
  };
  St.du = id => {
    const def = G.SCENES[id];
    if (St.PAR_DECOR[id]) return St.PAR_DECOR[id];
    if (def.type === 'eau') return St.PAR_REGION.sousmarin;
    if (def.flotte) return St.PAR_REGION._mer;
    if (def.type === 'int' && !def.pleinAir && !St.PAR_REGION[def.r]) return St.PAR_REGION._salle;
    return St.PAR_REGION[def.r] || St.PAR_REGION._salle;
  };

  /* ---- Les peintures en bande, gardees une fois faites ---- */
  const bandes = new Map();
  function bande(id, Lpx, frame) {
    const m = M[id], cle = id + ':' + Lpx + ':' + (frame || 0);
    let c = bandes.get(cle);
    if (c) return c;
    const p = (frame && m.peint2) || m.peint;
    const motif = G.mk(m.l, m.h);
    p(motif.x, m.l, m.h);
    c = G.mk(Lpx + m.l, m.h);
    for (let a = 0; a < c.width; a += m.l) c.x.drawImage(motif, a, 0);
    bandes.set(cle, c);
    return c;
  }
  // un bloc empile : quelques variantes, pour que le mur ne soit pas un papier peint
  const blocs = new Map();
  function bloc(id, v) {
    const m = M[id], cle = id + ':' + v;
    let c = blocs.get(cle);
    if (c) return c;
    c = G.mk(m.l, m.h);
    m.peint(c.x, m.l, m.h);
    if (v) {
      // meme bloc, autre lumiere, et un eclat de plus
      c.x.globalCompositeOperation = 'source-atop';
      c.x.fillStyle = v === 1 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.08)';
      c.x.fillRect(0, 0, m.l, m.h);
      c.x.globalCompositeOperation = 'source-over';
    }
    blocs.set(cle, c);
    return c;
  }
  St.bande = bande; St.bloc = bloc;
  St.epaisseur = id => M[id].h / G.S;
  St.rayon = id => M[id].h / G.S / 2 - .8;

  /* ---- Le dessin ---- */
  St.dessiner = (x, o, W) => {
    const m = M[o.m], cam = W.camY, T = W.T, S = G.S, ech = o.ech || 1;
    // ce qui tient la barre est en retrait, dans l'air du lieu : on passe devant, seule la barre arrete
    if (o.dos) {
      const hz = (W.sc && W.sc.m && W.sc.m.c_hz) || [150, 170, 190], c1 = G.rgb(G.mix(G.hex(m.c), hz, .62)), c2 = G.rgb(G.mix(G.mix(G.hex(m.c), [20, 20, 30], .5), hz, .62));
      for (const d of o.dos) {
        const X = o.x + d.x, a = d.haut ? -4 : d.y + cam, b = d.haut ? d.y + cam : G.SOLF + 2 + cam;
        x.fillStyle = c2; x.fillRect(X - 3.2, a, 6.4, b - a);
        x.fillStyle = c1; x.fillRect(X - 3.2, a, 3.2, b - a);
        if (!d.haut) { x.fillStyle = c2; x.fillRect(X - 7, b - 3, 14, 3); }
      }
    }
    const pulse = .3 + .22 * Math.sin(T * 7 + o.ph);
    // les segments qui se suivent forment une seule piece : on repere ses angles
    const joints = St.joints(o);
    for (let si = 0; si < o.segs.length; si++) {
      const s = o.segs[si];
      const ax = o.x + s.ax, ay = s.ay + cam, bx = o.x + s.bx, by = s.by + cam, L = Math.hypot(bx - ax, by - ay), a = Math.atan2(by - ay, bx - ax);
      if (o.m === 'escalator') { St.escalierProfil(x, s, ax, ay, bx, by, m.h / S * ech, T, pulse); continue; }
      if (m.empile) {
        const lw = m.l / S * ech, lh = m.h / S * ech, dx = bx - ax, dy = by - ay;
        const vert = Math.abs(dy) > Math.abs(dx), n = Math.max(2, Math.ceil(vert ? Math.abs(dy) / lh : Math.abs(dx) / lw) + 1);
        const cases = [];
        for (let i = 0; i < n; i++) { const k = i / (n - 1); cases.push([ax + dx * k, ay + dy * k, i]); }
        // l'aura d'abord, tout d'un bloc : le danger se lit sur tous les decors
        x.fillStyle = `rgba(255,90,72,${pulse})`;
        for (const c of cases) x.fillRect(c[0] - lw / 2 - .8, c[1] - lh / 2 - .8, lw + 1.6, lh + 1.6);
        for (const c of cases) {
          const dec = vert ? (c[2] % 2 ? 1.2 : -1.2) : 0;
          const im = bloc(o.m, (c[2] * 7 + (o.ph * 10 | 0)) % 3);
          x.drawImage(im, c[0] - lw / 2 + dec, c[1] - lh / 2, lw, lh);
        }
        continue;
      }
      const ep = m.h / S * ech;
      const Lpx = Math.ceil((L + ep) * S / ech), f = m.peint2 && Math.sin(T * 5 + o.ph) > 0 ? 1 : 0, str = bande(o.m, Lpx, f);
      const dec = m.defile ? (((T * m.defile * S) % m.l) + m.l) % m.l : 0;
      x.save();
      // a un angle, chaque piece est coupee sur la bissectrice : les motifs se rejoignent au lieu de se chevaucher
      const jA = joints[si], jB = joints[si + 1];
      if (jA || jB) {
        const onx = -Math.sin(a) * ep, ony = Math.cos(a) * ep, ux = Math.cos(a), uy = Math.sin(a);
        const bout = (px, py, j, sens) => {
          if (!j) return [[px - onx - ux * sens * ep * .5, py - ony - uy * sens * ep * .5], [px + onx - ux * sens * ep * .5, py + ony - uy * sens * ep * .5]];
          const tn = Math.tan(j.delta / 2), k = Math.max(-1.6, Math.min(1.6, tn));
          return [[px - onx - ux * k * ep * sens, py - ony - uy * k * ep * sens], [px + onx + ux * k * ep * sens, py + ony + uy * k * ep * sens]];
        };
        const [p1, p2] = bout(ax, ay, jA, jA ? -1 : 1), [p3, p4] = bout(bx, by, jB, jB ? 1 : -1);
        x.beginPath(); x.moveTo(p1[0], p1[1]); x.lineTo(p3[0], p3[1]); x.lineTo(p4[0], p4[1]); x.lineTo(p2[0], p2[1]); x.closePath(); x.clip();
      }
      x.translate(ax, ay); x.rotate(a);
      const prol = ep * 1.4, d0 = s.finA ? -ep / 2 : jA ? -prol : 0, d1 = L + (s.finB ? ep / 2 : jB ? prol : 0), LL = d1 - d0;
      x.fillStyle = `rgba(255,90,72,${pulse})`;
      if (!m.ajoure) x.fillRect(d0 - .8, -ep / 2 - .8, LL + 1.6, ep + 1.6);
      else { x.fillRect(d0, -ep / 2 - .9, LL, .9); x.fillRect(d0, ep / 2, LL, .9); }
      const Lsrc = Math.min(Math.ceil(LL * S / ech), str.width - dec);
      if (m.ondule) {
        // la matiere vit : elle ondule le long de la barre, sans changer de place
        const pas = 6;
        for (let c = 0; c < Lsrc; c += pas) {
          const w = Math.min(pas, Lsrc - c), od = Math.sin(T * m.ondule + c * .05 + o.ph) * ep * .07;
          x._draw(str, dec + c, 0, w, m.h, d0 + c / S * ech, -ep / 2 + od, w / S * ech, ep);
        }
      } else x._draw(str, dec, 0, Lsrc, m.h, d0, -ep / 2, LL, ep);
      // le bout libre s'arrete net sur une piece sombre
      if (s.finB && !jB) { x.fillStyle = K; x.fillRect(d1 - 2.4, -ep / 2 - .6, 2.8, ep + 1.2); x.fillStyle = m.c; x.fillRect(d1 - 1.8, -ep / 2, 1.6, ep); }
      if (s.finA && !jA) { x.fillStyle = K; x.fillRect(d0 - .4, -ep / 2 - .6, 2.8, ep + 1.2); x.fillStyle = m.c; x.fillRect(d0 + .2, -ep / 2, 1.6, ep); }
      x.restore();
    }
    // la piece d'angle, par-dessus : elle raccorde et elle fait joli
    if (o.m !== 'escalator') for (const j of joints) if (j) St.dessinerAngle(x, o, m, j, cam, ech, pulse);
  };
  /* L'escalator de profil, en coupe : le caisson en treillis dessous, les marches qui montent une a une et restent horizontales,
     le garde-corps vitre et la main courante noire au-dessus. Sa forme fixe est peinte une fois, seules les marches bougent. */
  St.escalierProfil = (x, s, A, B, C, D, ep, T, pulse) => {
    const gauche = A <= C, ax = gauche ? A : C, ay = gauche ? B : D, bx = gauche ? C : A, by = gauche ? D : B;
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
    const cle = Math.round(dx) + '_' + Math.round(dy) + '_' + Math.round(ep);
    if (!s._esc || s._esc.cle !== cle) {
      const m = ep + 3, X0 = Math.min(0, dx) - m, Y0 = Math.min(0, dy) - m, c = G.mkE(Math.abs(dx) + 2 * m, Math.abs(dy) + 2 * m), g = c.x;
      const px = 1 / G.S;
      const yL = a => (a - ax0) * (dy / (dx || 1)) - Y0; const ax0 = 0;
      const pt = (t, q) => [ux * t + nx * q - X0, uy * t + ny * q - Y0];
      // le caisson : du bas des marches jusque sous la barre
      for (let t = -2; t < L + 2; t += px * .7) {
        const [a, b] = pt(t, -ep * .02), [e, f] = pt(t, -ep * .5);
        const k = Math.abs(((t % 12) + 12) % 12 - 6) / 6;
        g.fillStyle = K; g.fillRect(a, b, px, px); g.fillRect(e, f, px, px);
        const n = Math.ceil(Math.hypot(e - a, f - b) / px);
        for (let i = 1; i < n; i++) {
          const v = i / n, lat = Math.abs(v - k) < .09;
          g.fillStyle = lat ? '#8a8f9c' : v < .14 ? '#737885' : '#4e525e';
          g.fillRect(a + (e - a) * v, b + (f - b) * v, px, px);
        }
      }
      // le verre et les montants
      for (let t = 0; t < L; t += px * .7) for (let q = ep * .12; q < ep * .42; q += px * .7) { const [a, b] = pt(t, q); g.fillStyle = 'rgba(180,222,240,.34)'; g.fillRect(a, b, px, px); }
      for (let t = 4; t < L; t += 16) for (let q = ep * .1; q < ep * .44; q += px) { const [a, b] = pt(t, q); g.fillStyle = '#9a9faa'; g.fillRect(a, b, px, px); }
      // la main courante, qui s'enroule aux deux bouts
      for (let t = -3; t < L + 3; t += px * .7) { const [a, b] = pt(t, ep * .46); g.fillStyle = K; g.fillRect(a - px, b - px, 3 * px, 4 * px); g.fillStyle = '#2c2c36'; g.fillRect(a, b, px, 2 * px); }
      for (const t of [-3, L + 3]) { const [a, b] = pt(t, ep * .3); g.fillStyle = K; g.beginPath(); g.arc(a, b, ep * .17, 0, 7); g.fill(); g.fillStyle = '#3a3a46'; g.beginPath(); g.arc(a, b, ep * .1, 0, 7); g.fill(); }
      s._esc = { cle, c, ox: X0, oy: Y0 };
    }
    const e = s._esc;
    // l'aura du danger
    x.strokeStyle = `rgba(255,90,72,${pulse})`; x.lineWidth = .9;
    for (const q of [ep / 2 + .5, -ep / 2 - .5]) { x.beginPath(); x.moveTo(ax + nx * q, ay + ny * q); x.lineTo(bx + nx * q, by + ny * q); x.stroke(); }
    // les marches : chacune reste a plat, le nez jaune en avant
    const sl = 7 * ep / 21.6, ph = ((T * 16 * (uy < 0 ? 1 : -1)) % sl + sl) % sl;
    for (let t = ph - sl; t < L; t += sl) {
      const t0 = Math.max(0, t), t1 = Math.min(L, t + sl);
      if (t1 <= t0) continue;
      const x0 = ax + ux * t0 + nx * ep * .07, x1 = ax + ux * t1 + nx * ep * .07, y0 = ay + uy * t0 + ny * ep * .07, y1 = ay + uy * t1 + ny * ep * .07;
      const top = Math.max(y0, y1), H = Math.abs(y1 - y0) + ep * .1, up = uy < 0;
      x.fillStyle = K; x.fillRect(x0 - .4, top - .5, x1 - x0 + .8, H + .5);
      x.fillStyle = '#8d939f'; x.fillRect(x0, top + 1, x1 - x0, H - 1);
      x.fillStyle = '#d4d9e2'; x.fillRect(x0, top, x1 - x0, 1);
      x.fillStyle = '#ffd23c'; x.fillRect(up ? x1 - 1 : x0, top, 1, 1.2);
    }
    x.drawImage(e.c, ax + e.ox, ay + e.oy);
  };
  /* Pour chaque point de passage d'un segment au suivant : l'angle de virage. joints[i] = la jonction avant le segment i */
  St.joints = o => {
    const n = o.segs.length, l = new Array(n + 1).fill(null);
    const lie = (p, q) => {
      if (Math.hypot(p.bx - q.ax, p.by - q.ay) > .6) return null;
      const a1 = Math.atan2(p.by - p.ay, p.bx - p.ax), a2 = Math.atan2(q.by - q.ay, q.bx - q.ax);
      let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      return Math.abs(d) < .05 ? null : { x: q.ax, y: q.ay, a1, a2, delta: d };
    };
    for (let i = 1; i < n; i++) l[i] = lie(o.segs[i - 1], o.segs[i]);
    // une forme fermee se referme sur elle-meme : dernier point et premier point
    if (n > 2) { const j = lie(o.segs[n - 1], o.segs[0]); if (j) { l[0] = j; l[n] = j; } }
    return l;
  };
  /* Chaque matiere a son angle : equerre rivetee pour le metal, ligature pour le bois et le bambou, pierre d'angle, pli de tissu */
  const ANGLES = { treillis: 'equerre', viaduc: 'equerre', fer: 'equerre', truss: 'equerre', escalator: 'equerre', zinc: 'equerre', bagages: 'equerre', convoyeur: 'equerre', rack: 'equerre', cables: 'equerre', tuyau: 'manchon', epave: 'equerre', barreaux: 'equerre', filet: 'noeud', planches: 'ligature', ponton: 'ligature', bois_flotte: 'ligature', barriere: 'ligature', barriere_irl: 'ligature', kraal: 'ligature', bambou: 'ligature', natte: 'ligature', sagne: 'ligature', surf: 'noeud', bouees: 'noeud', rondins: 'ligature', velours: 'pli', tapis: 'pli', romain: 'chapiteau', lave: 'rocher', led: 'equerre' };
  St.dessinerAngle = (x, o, m, j, cam, ech, pulse) => {
    const S = G.S, ep = m.h / S * ech, X = o.x + j.x, Y = j.y + cam, type = ANGLES[o.m] || (m.empile ? 'bloc' : 'equerre');
    const r = ep * .56, bis = (j.a1 + j.a2) / 2;
    const clair = G.rgb(G.mix(G.hex(m.c), [255, 255, 255], .34)), fonce = G.rgb(G.mix(G.hex(m.c), [10, 10, 20], .42));
    x.save(); x.translate(X, Y);
    x.fillStyle = `rgba(255,90,72,${pulse})`; x.beginPath(); x.arc(0, 0, r + .9, 0, 7); x.fill();
    x.rotate(bis);
    const octo = (R, c) => { x.fillStyle = c; x.beginPath(); for (let i = 0; i < 8; i++) { const t = i / 8 * 6.2832 + .3927; x.lineTo(Math.cos(t) * R, Math.sin(t) * R); } x.fill(); };
    if (type === 'bloc') {
      const w = r * 1.5;
      x.rotate(-bis);
      x.fillStyle = K; x.fillRect(-w - .7, -w - .7, 2 * w + 1.4, 2 * w + 1.4);
      x.fillStyle = m.c; x.fillRect(-w, -w, 2 * w, 2 * w);
      x.fillStyle = clair; x.fillRect(-w, -w, 2 * w, 1.2); x.fillRect(-w, -w, 1.2, 2 * w);
      x.fillStyle = fonce; x.fillRect(-w, w - 1.2, 2 * w, 1.2); x.fillRect(w - 1.2, -w, 1.2, 2 * w);
    } else if (type === 'equerre') {
      octo(r + .7, K); octo(r, m.c); octo(r * .62, fonce); octo(r * .48, m.c);
      x.fillStyle = clair;
      for (let i = 0; i < 4; i++) { const t = i / 4 * 6.2832 + .785; x.fillRect(Math.cos(t) * r * .78 - .5, Math.sin(t) * r * .78 - .5, 1, 1); }
    } else if (type === 'manchon') {
      octo(r + .7, K); octo(r, '#7f8088'); octo(r * .55, '#c4c6cc'); octo(r * .3, '#5a5c66');
    } else if (type === 'ligature') {
      octo(r + .7, K); octo(r, m.c);
      x.fillStyle = '#5e452a'; for (let i = -2; i <= 2; i++) x.fillRect(-r, i * r * .36 - .4, 2 * r, .9);
      x.fillStyle = '#d6c08a'; for (let i = -2; i <= 2; i++) x.fillRect(-r, i * r * .36 - .4, 2 * r, .3);
    } else if (type === 'noeud') {
      octo(r * .8 + .7, K); octo(r * .8, m.c); x.fillStyle = clair; x.fillRect(-r * .5, -r * .5, r * .6, 1);
    } else if (type === 'pli') {
      octo(r + .4, K); octo(r, fonce); x.fillStyle = m.c; x.beginPath(); x.moveTo(-r, 0); x.lineTo(0, -r); x.lineTo(r, 0); x.fill(); x.fillStyle = '#ffd86a'; x.fillRect(-r * .8, -.3, r * 1.6, .8);
    } else if (type === 'chapiteau') {
      x.rotate(-bis); x.fillStyle = K; x.fillRect(-r * 1.2 - .6, -r - .6, 2.4 * r + 1.2, 2 * r + 1.2); x.fillStyle = '#f0e8d4'; x.fillRect(-r * 1.2, -r, 2.4 * r, 2 * r); x.fillStyle = '#c89a30'; x.fillRect(-r * 1.2, -r, 2.4 * r, 1); x.fillRect(-r * 1.2, r - 1, 2.4 * r, 1); x.fillStyle = '#bcb29a'; x.fillRect(-r * .5, -r + 1, 1, 2 * r - 2); x.fillRect(r * .4, -r + 1, 1, 2 * r - 2);
    } else {
      octo(r + .7, K); octo(r, '#2b2930'); x.fillStyle = '#ff8a2a'; x.fillRect(-r * .5, -.5, r, 1); x.fillRect(-.5, -r * .4, 1, r * .8);
    }
    x.restore();
  };

  /* Les morceaux qui volent quand on la casse : la vraie peinture, decoupee le long de la barre */
  St.briser = (W, o, vx) => {
    const m = M[o.m], S = G.S;
    for (const s of o.segs) {
      const ax = o.x + s.ax, bx = o.x + s.bx, L = Math.hypot(bx - ax, s.by - s.ay), a = Math.atan2(s.by - s.ay, bx - ax);
      const vus = Math.min(L, 220), n = Math.max(1, Math.round(vus / 46));
      const img = m.empile ? bloc(o.m, 0) : bande(o.m, Math.ceil(L * S));
      for (let i = 0; i < n; i++) {
        const k = (i + .5) / n, cx = ax + (bx - ax) * k, cy = s.ay + (s.by - s.ay) * k;
        if (cx < -30 || cx > G.VW + 30 || cy < -20) continue;
        G.FX.briser(W, img, cx, cy, vus / n, m.h / S, a, { n: 7, vx, force: 160, poids: 1 });
      }
    }
  };
  /* La forme, dans les memes reperes que les chocs */
  St.capsules = o => {
    const r = St.rayon(o.m) * (o.ech || 1), l = [];
    for (const s of o.segs) l.push([o.x + s.ax, s.ay, o.x + s.bx, s.by, r]);
    return l;
  };
  St.rnd = rnd;
})();
