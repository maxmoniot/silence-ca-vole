/* Socle : constantes, hasard, police pixel, sauvegarde. */
'use strict';
const G = window.G = {
  S: 5 / 3,                       // l'image fait 360 lignes pour 216 unites de jeu : des pixels 3 fois plus fins a l'ecran
  VH: 216, VW: 480, PW: 640, PH: 244, MARGE: 14,
  PLAFOND: 12, SOL: 192,          // limites de vol du drone
  SOLF: 206,                      // rangee ou marchent les figurants
  t: 0, dt: 1 / 60,
};

G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
// roundRect (la main du tuto) n'existe que depuis Chrome 99 : un WebView jamais mis a jour (Android 8) ferait planter l'accueil
if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(+r || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}
/* Les vieux WebView (Max, 10/11/2026 : « assure-toi que le jeu tournera sans souci meme sur des appareils Android peu recents ») :
   un telephone qui ne met plus son WebView a jour garde celui de sa sortie (58 a 69 pour Android 8 et 9). La syntaxe du jeu se
   contente de Chrome 55 (async/await) ; ces fonctions plus recentes ont ici leur version de secours (tests/vieux_webview.js). */
const secours = (o, nom, f) => { if (o && !o[nom]) Object.defineProperty(o, nom, { value: f, configurable: true, writable: true }); };
secours(Array.prototype, 'flatMap', function (f, t) { return [].concat.apply([], this.map(f, t)); });                        // Chrome 69
secours(Array.prototype, 'flat', function (n = 1) { return n < 1 ? this.slice() : [].concat.apply([], this.map(v => Array.isArray(v) ? v.flat(n - 1) : v)); }); // 69
secours(String.prototype, 'trimEnd', function () { return this.replace(/\s+$/, ''); });                                       // Chrome 66
secours(String.prototype, 'trimStart', function () { return this.replace(/^\s+/, ''); });                                     // Chrome 66
const bourrer = (s, n, c, fin) => { s = String(s); c = c === undefined ? ' ' : String(c); if (s.length >= n || !c) return s; let b = ''; while (b.length < n - s.length) b += c; b = b.slice(0, n - s.length); return fin ? s + b : b + s; };
secours(String.prototype, 'padStart', function (n, c) { return bourrer(this, n, c, false); });                                // Chrome 57
secours(String.prototype, 'padEnd', function (n, c) { return bourrer(this, n, c, true); });                                   // Chrome 57
secours(Promise.prototype, 'finally', function (f) { return this.then(v => Promise.resolve(f()).then(() => v), e => Promise.resolve(f()).then(() => { throw e; })); }); // Chrome 63

/* Les petits travaux de fond (eclairer un sprite qui arrive...) : une seule file, au plus 3 ms par image, juste apres l'image du jeu
   (10/11/2026 : faits chacun de son cote, plusieurs sprites eclaires en meme temps figeaient une image plus de 100 ms sur un telephone
   lent). G.travail(etape) : etape() fait un petit morceau et rend undefined tant que ce n'est pas fini, puis le resultat. */
const travaux = [];
let pompeLancee = false;
const pompe = () => {
  const t0 = performance.now();
  while (travaux.length && performance.now() - t0 < 3) {
    const t = travaux[0];
    let r;
    try { r = t.etape(); } catch (e) { travaux.shift(); t.rej(e); continue; }
    if (r !== undefined) { travaux.shift(); t.res(r); }
  }
  if (travaux.length) requestAnimationFrame(pompe); else pompeLancee = false;
};
G.travail = etape => new Promise((res, rej) => { travaux.push({ etape, res, rej }); if (!pompeLancee) { pompeLancee = true; requestAnimationFrame(pompe); } });

/* Les encoches et trous de camera de l'ecran (Max, 09/11/2026 : « verifie que le jeu va s'adapter a tout type de smartphone ») :
   l'image passe dessous (elle remplit l'ecran), mais ce qu'on lit ou qu'on touche s'en ecarte. G.ENC : leurs rectangles en unites
   de jeu [x0, y0, x1, y1], donnes par Android (AndroidBridge.encoches, ui.js) ; vide dans un navigateur ou sans encoche, et alors
   rien ne bouge. G.libre : la place la plus proche, vers l'interieur, d'une boite (x, y, w, h) collee au bord gauche (sens 1) ou
   droit (sens -1) qui tomberait sous une encoche ; G.bordLibre : la profondeur des encoches d'un bord sur une bande de hauteur.
   Controles : tests/ecrans_telephones.js (encoches de vrais telephones), tests/encoches.js (emulateur). */
G.ENC = [];
G.libre = (x, y, w, h, sens = 1, marge = 2) => {
  for (let n = 0; n < 4; n++) {
    const c = G.ENC.find(e => x < e[2] + marge && x + w > e[0] - marge && y < e[3] + marge && y + h > e[1] - marge);
    if (!c) break;
    x = sens > 0 ? c[2] + marge : c[0] - marge - w;
  }
  return x;
};
G.bordLibre = (y0, y1, sens = 1) => {
  let d = 0;
  // un trou rond ne touche pas le bord : compte tout ce qui est dans le quart de l'ecran de ce cote
  for (const e of G.ENC) if (e[1] < y1 && e[3] > y0) {
    if (sens > 0 && e[0] < G.VW * .25) d = Math.max(d, e[2] + 2);
    if (sens < 0 && e[2] > G.VW * .75) d = Math.max(d, G.VW - e[0] + 2);
  }
  return d;
};
G.lerp = (a, b, t) => a + (b - a) * t;
G.rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
G.irnd = (a, b) => Math.floor(G.rnd(a, b + 1));
G.pick = arr => arr[Math.floor(Math.random() * arr.length)];
G.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
G.mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; c.x = x; return c; };
/* Une toile en coordonnees de jeu : on y dessine en unites de jeu, les bords tombent toujours sur des pixels entiers,
   et une image posee sans taille garde sa definition d'origine. */
G.ecran = ctx => {
  // deja traduite : un redimensionnement n'a remis a zero que la transformation
  if (ctx._S) { ctx.setTransform(ctx._S, 0, 0, ctx._S, 0, 0); ctx.imageSmoothingEnabled = false; return ctx; }
  const S = G.S, fr = ctx.fillRect.bind(ctx), di = ctx.drawImage.bind(ctx), N = v => Math.round(v * S) / S;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx._S = S; ctx._fill = fr; ctx._draw = di;
  ctx.fillRect = (a, b, w, h) => { const A = Math.round(a * S), B = Math.round(b * S); fr(A / S, B / S, Math.max(1, Math.round((a + w) * S) - A) / S, Math.max(1, Math.round((b + h) * S) - B) / S); };
  // arguments nommes plutot qu'un tableau de reste : un objet de moins par image posee (11/11/2026, moins de dechets)
  ctx.drawImage = function (im, a, b, c, d, e, f, g, h) {
    const n = arguments.length;
    if (n === 3) di(im, N(a), N(b), im.width / S, im.height / S);
    else if (n === 5) di(im, N(a), N(b), c, d);
    else di(im, a, b, c, d, N(e), N(f), g, h);
  };
  return ctx;
};
G.mkE = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * G.S); c.height = Math.ceil(h * G.S); c.x = G.ecran(c.getContext('2d')); c.lw = w; c.lh = h; return c; };
G.rgb = (c, a) => a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
G.mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t | 0, a[1] + (b[1] - a[1]) * t | 0, a[2] + (b[2] - a[2]) * t | 0];
G.hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/* ---- Police 5x7 : colonnes de bits, bit 0 en haut ---- */
const F = {};
(function () {
  const t = {
    ' ': [0, 0, 0], '!': [0x5F], '"': [7, 0, 7], '#': [0x14, 0x7F, 0x14, 0x7F, 0x14], '%': [0x23, 0x13, 8, 0x64, 0x62], '&': [0x36, 0x49, 0x56, 0x20, 0x50],
    "'": [3], '(': [0x1C, 0x22, 0x41], ')': [0x41, 0x22, 0x1C], '*': [0x2A, 0x1C, 0x7F, 0x1C, 0x2A], '+': [8, 8, 0x3E, 8, 8], ',': [0x80, 0x60], '-': [8, 8, 8, 8], '.': [0x60, 0x60], '/': [0x20, 0x10, 8, 4, 2],
    '0': [0x3E, 0x51, 0x49, 0x45, 0x3E], '1': [0x42, 0x7F, 0x40], '2': [0x72, 0x49, 0x49, 0x49, 0x46], '3': [0x21, 0x41, 0x49, 0x4D, 0x33], '4': [0x18, 0x14, 0x12, 0x7F, 0x10], '5': [0x27, 0x45, 0x45, 0x45, 0x39], '6': [0x3C, 0x4A, 0x49, 0x49, 0x31], '7': [0x41, 0x21, 0x11, 9, 7], '8': [0x36, 0x49, 0x49, 0x49, 0x36], '9': [0x46, 0x49, 0x49, 0x29, 0x1E],
    ':': [0x36], ';': [0x80, 0x76], '<': [8, 0x14, 0x22], '=': [0x14, 0x14, 0x14, 0x14], '>': [0x22, 0x14, 8], '?': [2, 1, 0x59, 9, 6], '×': [0x22, 0x14, 8, 0x14, 0x22], '★': [0x08, 0x18, 0x7C, 0x3E, 0x7C, 0x18, 0x08],
    A: [0x7C, 0x12, 0x11, 0x12, 0x7C], B: [0x7F, 0x49, 0x49, 0x49, 0x36], C: [0x3E, 0x41, 0x41, 0x41, 0x22], D: [0x7F, 0x41, 0x41, 0x41, 0x3E], E: [0x7F, 0x49, 0x49, 0x49, 0x41], F: [0x7F, 9, 9, 9, 1], G: [0x3E, 0x41, 0x41, 0x51, 0x73], H: [0x7F, 8, 8, 8, 0x7F], I: [0x41, 0x7F, 0x41], J: [0x20, 0x40, 0x41, 0x3F, 1], K: [0x7F, 8, 0x14, 0x22, 0x41], L: [0x7F, 0x40, 0x40, 0x40, 0x40], M: [0x7F, 2, 0x1C, 2, 0x7F], N: [0x7F, 4, 8, 0x10, 0x7F], O: [0x3E, 0x41, 0x41, 0x41, 0x3E], P: [0x7F, 9, 9, 9, 6], Q: [0x3E, 0x41, 0x51, 0x21, 0x5E], R: [0x7F, 9, 0x19, 0x29, 0x46], S: [0x26, 0x49, 0x49, 0x49, 0x32], T: [3, 1, 0x7F, 1, 3], U: [0x3F, 0x40, 0x40, 0x40, 0x3F], V: [0x1F, 0x20, 0x40, 0x20, 0x1F], W: [0x3F, 0x40, 0x38, 0x40, 0x3F], X: [0x63, 0x14, 8, 0x14, 0x63], Y: [3, 4, 0x78, 4, 3], Z: [0x61, 0x59, 0x49, 0x4D, 0x43],
    // la capitale Œ (« UN CŒUR DE PLUS » s'affichait « UN C?UR DE PLUS », 07/11/2026) : un O ouvert colle a un E
    'Œ': [0x3E, 0x41, 0x41, 0x7F, 0x49, 0x49, 0x41], 'œ': [0x38, 0x44, 0x38, 0x54, 0x58], a: [0x20, 0x54, 0x54, 0x78, 0x40], b: [0x7F, 0x28, 0x44, 0x44, 0x38], c: [0x38, 0x44, 0x44, 0x28], d: [0x38, 0x44, 0x44, 0x28, 0x7F], e: [0x38, 0x54, 0x54, 0x54, 0x18], f: [8, 0x7E, 9, 2], g: [0x18, 0xA4, 0xA4, 0x9C, 0x78], h: [0x7F, 8, 4, 4, 0x78], i: [0x44, 0x7D, 0x40], j: [0x20, 0x40, 0x40, 0x3D], k: [0x7F, 0x10, 0x28, 0x44], l: [0x41, 0x7F, 0x40], m: [0x7C, 4, 0x78, 4, 0x78], n: [0x7C, 8, 4, 4, 0x78], o: [0x38, 0x44, 0x44, 0x44, 0x38], p: [0xFC, 0x18, 0x24, 0x24, 0x18], q: [0x18, 0x24, 0x24, 0x18, 0xFC], r: [0x7C, 8, 4, 4, 8], s: [0x48, 0x54, 0x54, 0x54, 0x24], t: [4, 0x3F, 0x44, 0x24], u: [0x3C, 0x40, 0x40, 0x20, 0x7C], v: [0x1C, 0x20, 0x40, 0x20, 0x1C], w: [0x3C, 0x40, 0x30, 0x40, 0x3C], x: [0x44, 0x28, 0x10, 0x28, 0x44], y: [0x4C, 0x90, 0x90, 0x90, 0x7C], z: [0x44, 0x64, 0x54, 0x4C, 0x44],
  };
  const acc = {
    'Ï': ['I', 'trema'], 'Û': ['U', 'circ'], 'Ù': ['U', 'grave'], 'Â': ['A', 'circ'], 'Ë': ['E', 'trema'], 'á': ['a', [0, 0, 2, 1, 0]], 'Á': ['A', 'aigu'], 'é': ['e', [0, 0, 2, 1, 0]], 'è': ['e', [0, 1, 2, 0, 0]], 'ê': ['e', [0, 2, 1, 2, 0]], 'ë': ['e', [0, 1, 0, 1, 0]], 'à': ['a', [0, 1, 2, 0, 0]], 'â': ['a', [0, 2, 1, 2, 0]], 'î': ['i', [2, 1, 2]], 'ï': ['i', [1, 0, 1]], 'ô': ['o', [0, 2, 1, 2, 0]], 'û': ['u', [0, 2, 1, 2, 0]], 'ù': ['u', [0, 1, 2, 0, 0]],
    'ç': ['c', null], 'É': ['E', 'aigu'], 'È': ['E', 'grave'], 'À': ['A', 'grave'], 'Ç': ['C', null], 'Ê': ['E', 'circ'], 'Ô': ['O', 'circ'], 'Î': ['I', 'circ'],
  };
  for (const k in t) F[k] = { c: t[k], top: 0 };
  for (const k in acc) {
    const [b, m] = acc[k];
    const c = t[b].slice();
    if (Array.isArray(m)) { for (let i = 0; i < c.length; i++) c[i] = (c[i] & ~3) | (m[i] || 0); }
    if (m === null) { const mid = c.length >> 1; c[mid] |= 0x80; }
    // l'accent d'une capitale, sur la rangee du dessus : un vrai trema (deux points), aigu, grave ou circonflexe
    const n = c.length, mid = n >> 1;
    const up = { trema: [0, n - 1], aigu: [Math.min(n - 1, mid + 1)], grave: [Math.max(0, mid - 1)], circ: [Math.max(0, mid - 1), mid, Math.min(n - 1, mid + 1)] }[m];
    F[k] = { c, up };
  }
})();

const glyphCache = new Map();
/* Le texte reste net : sur une toile de jeu, chaque point de la police fait un nombre entier de pixels */
const PT = { 1: 2, 2: 3, 3: 5, 4: 7 };
G.aGlyphe = ch => !!F[ch];
/* Les textes modifies par Max sur la page des messages (outils/visualiseur, textes.html) : { original: nouveau },
   charges par js/textes_modifies.js. Tout texte dessine passe par la, les bulles prennent la largeur du nouveau texte. */
G.TM = G.TM || {};
G.trad = s => Object.prototype.hasOwnProperty.call(G.TM, s) ? G.TM[s] : s;
G.txtW = (s, sc = 1, brut = false) => {
  let w = 0;
  for (const ch of brut ? String(s) : G.trad(String(s))) { const g = F[ch] || F['?']; w += g.c.length + 1; }
  return (w - 1) * (PT[sc] || sc * 2) / G.S;
};
function glyphs(color) {
  let e = glyphCache.get(color);
  if (e) return e;
  // planche de glyphes teintee : un seul drawImage par lettre
  const keys = Object.keys(F);
  const c = G.mk(8 * keys.length, 10);
  c.x.fillStyle = color;
  const map = {};
  keys.forEach((k, i) => {
    const g = F[k];
    g.c.forEach((col, x) => { for (let b = 0; b < 8; b++) if (col >> b & 1) c.x.fillRect(i * 8 + x, b + 1, 1, 1); });
    if (g.up) for (const ux of g.up) c.x.fillRect(i * 8 + ux, 0, 1, 1);
    map[k] = i * 8;
  });
  e = { c, map };
  glyphCache.set(color, e);
  return e;
}
/* align : 0 gauche, .5 centre, 1 droite. ombre : couleur de l'ombre portee */
G.txt = (x, s, px, py, color = '#fff', o = {}) => {
  // brut : un morceau de texte deja traduit (une ligne de pancarte), qu'on ne retraduit pas
  s = o.brut ? String(s) : G.trad(String(s));
  const sc = o.sc || 1, al = o.al || 0;
  // deux cas : toile de jeu (unites de jeu) ou image brute (pixels)
  const S = x._S || 1;
  const pt = x._S ? (PT[sc] || sc * 2) : sc;
  let w = 0;
  for (const ch of s) { const g = F[ch] || F['?']; w += g.c.length + 1; }
  w = (w - 1) * pt;
  let cx = Math.round(px * S - w * al);
  const cy = Math.round(py * S);
  const dessin = x._draw || x.drawImage.bind(x);
  if (x._S) { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); }
  const passe = (col, ox, oy) => {
    const g = glyphs(col);
    let qx = cx + ox;
    for (const ch of s) {
      const gl = F[ch] || F['?'];
      const n = gl.c.length;
      dessin(g.c, g.map[ch] !== undefined ? g.map[ch] : g.map['?'], 0, n, 10, qx, cy + oy - pt, n * pt, 10 * pt);
      qx += (n + 1) * pt;
    }
  };
  if (o.contour) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) passe(o.contour, dx * Math.max(1, pt >> 1 || 1), dy * Math.max(1, pt >> 1 || 1));
  if (o.ombre) passe(o.ombre, Math.max(1, pt >> 1), Math.max(1, pt >> 1));
  passe(color, 0, 0);
  if (x._S) x.restore();
};

/* Une pancarte : son texte (celui de Max s'il l'a change) sur une ligne, ou sur deux s'il est long, coupe a l'espace qui
   equilibre le mieux les deux lignes. Les lignes sont deja traduites : on les dessine avec { brut: true }. */
const PANC_MAX = 46;
G.lignesPancarte = s => {
  const t = G.trad(String(s));
  if (G.txtW(t, 1, true) <= PANC_MAX) return [t];
  const m = t.split(' ');
  let best = null;
  for (let i = 1; i < m.length; i++) {
    const a = m.slice(0, i).join(' '), b = m.slice(i).join(' ');
    const w = Math.max(G.txtW(a, 1, true), G.txtW(b, 1, true));
    if (!best || w < best[0]) best = [w, a, b];
  }
  return best ? [best[1], best[2]] : [t];
};
G.pancarteW = s => Math.max(...G.lignesPancarte(s).map(l => G.txtW(l, 1, true))) + 6;
/* Une pancarte tenue par deux porteurs, un baton dans la main de chacun, a 3 unites devant ses pieds (Max, 04/11/2026 : « il
   faudrait avoir un personnage qui les tient de chaque cote »). Sans second porteur (il est tombe), un seul baton, au milieu. */
G.pancarteBornes = f => {
  const w = G.pancarteW(f.pancarte), xa = f.x + 3, p = f.pancarteAvec;
  // une taille fixe (Max, 04/11/2026 : « certaines pancartes s'allongent ») : l'ecart entre les deux batons est fixe des que la
  // pancarte est donnee, le second porteur le suit (majFoules) ; on ne lit plus sa position du moment
  const ec = f.pancarteEcart !== undefined ? f.pancarteEcart : (p ? p.x - f.x : 0);
  if (p && !p.tombe && ec > 6) {
    const xb = xa + ec, x0 = Math.min(xa - 2, (xa + xb) / 2 - w / 2), x1 = Math.max(xb + 2, (xa + xb) / 2 + w / 2);
    return { xa, xb, x0, x1, cx: (x0 + x1) / 2, w: x1 - x0 };
  }
  return { xa: f.x + 3, x0: f.x + 4 - w / 2, x1: f.x + 4 + w / 2, cx: f.x + 4, w };
};
/* La banderole va de son premier porteur a son second, qui se tient sous le baton de droite */
G.banderoleFin = f => f.banderoleEcart !== undefined ? f.x + f.banderoleEcart : Math.max(f.banderole.avec.x + 2, f.x + G.txtW(f.banderole.t) + 14);

/* ---- Sauvegarde ---- */
const CLE = 'silencecavole.v1';
G.sav = {
  bobines: 0, record: 0, totalDist: 0, parties: 0,
  vus: {}, plans: {},              // decors decouverts / plans reussis
  atelier: {},                     // ameliorations
  perso: { cheveux: 0, couleur: 0, barbe: 1, lunettes: 0, peau: 0, tee: 0, drone: 0 },
  son: 1, musique: 1, vibre: 1,
  missions: null, rang: 0, tuto: 0, xp: 0, cumul: 0, heros: 'moi', modele: 'phantom', photoI: 0,
};
G.charger = () => {
  try {
    const s = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (s) { Object.assign(G.sav, s); G.sav.perso = Object.assign({ cheveux: 0, couleur: 0, barbe: 1, lunettes: 0, peau: 0, tee: 0, drone: 0 }, s.perso); }
  } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
};
G.sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(G.sav)); } catch (e) { /* idem */ } };

G.vibre = kind => {
  if (!G.sav.vibre) return;
  try {
    if (window.AndroidBridge && AndroidBridge.haptic) AndroidBridge.haptic(kind);
    else if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 60 : 12);
  } catch (e) { /* pas de vibreur */ }
};

/* ---- Chargement d'images ---- */
const imgCache = new Map();
G.img = src => {
  let e = imgCache.get(src);
  if (e) return e;
  // deux nouveaux essais, et un echec n'est pas garde : le prochain appel retentera
  const essai = n => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => { if (n > 0) setTimeout(() => essai(n - 1).then(res, rej), 400); else rej(new Error('image ' + src)); }; i.src = src; });
  e = essai(2);
  imgCache.set(src, e);
  e.catch(() => imgCache.delete(src));
  return e;
};
G.oublier = src => imgCache.delete(src);
