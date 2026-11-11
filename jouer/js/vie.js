/* Ce qui vit dans les decors : des acteurs animes, peints au pixel a chaque image, poses a la bonne profondeur.
   Un acteur est un effet : FX.nom = (sc, arg) => ({ plan: i, maj(dt, d) {}, draw(x, d, camY, T) {} }), declare dans le fx: [...] du decor (scenes.js).
   plan = l'indice du plan juste derriere lequel il se dessine : le plan suivant lui passe devant. Tout est en unites de jeu (480 x 216). */
'use strict';
(function () {
  const V = G.Vie = {};
  // l'indice du n-ieme plan d'une sorte ('mer', 'dun', 'pla', 'peint'...), en partant du fond
  V.plan = (sc, kind, n = 0) => { let k = 0; for (let i = 0; i < sc.plans.length; i++) if (sc.plans[i].k === kind && k++ === n) return i; return -1; };
  // a quelle vitesse ce plan defile a l'ecran, en unites par seconde
  V.defile = (sc, i) => { const W = G.Jeu.w(); return (W ? W.v * W.ech : 120) * sc.plans[i].f; };
  V.R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  // ou est le drone, a l'ecran
  V.drone = () => { const W = G.Jeu.w(); return W && W.vivant ? { x: G.Jeu.HX, y: W.y - 14, proche: W.y > G.SOL - 40 } : null; };
})();
