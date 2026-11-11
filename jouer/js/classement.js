/* Le classement Google Play Jeux (Max, 07/11/2026 : « ajoute le fait de pouvoir se connecter à Play Jeux comme le jeu Delta pour
   avoir un classement général »).
   Seulement dans l'appli Android : la coque dit AndroidBridge.jeux() (MainActivity, PlayGames). Un seul classement, « distance » :
   le record en metres (projet Play Jeux 89533030630, classement CgkI5sHWxM0CEAIQAQ, android/app/src/main/res/values/jeux.xml).
   - au lancement, le record garde sur le telephone part, sans rien demander (la coque n'envoie que si le joueur est deja connecte
     a Play Jeux ; Google ne garde que le meilleur) ;
   - a chaque fin de partie, la distance part ;
   - l'icone du classement (accueil, « COUPEZ ! ») ouvre l'ecran de Google ; c'est la seulement que la connexion est demandee.
   Un pont absent ou en panne ne casse rien. Controle : tests/classement.js (pont simule). */
'use strict';
(function () {
  const C = G.Classement = {};
  const pont = () => window.AndroidBridge;
  C.dispo = () => { try { return !!(pont() && pont().jeux && pont().jeux()); } catch (e) { return false; } };
  const appel = (f, ...a) => {
    try { if (C.dispo() && typeof pont()[f] === 'function') pont()[f](...a); }
    catch (e) { console.warn('classement : ' + f + ' ' + (e && e.message)); }
  };
  C.sync = () => { const r = Math.floor(G.sav.record || 0); if (r > 0) appel('envoyerRecords', JSON.stringify({ distance: r })); };
  C.envoyer = d => { const m = Math.floor(d || 0); if (m > 0) appel('envoyerScore', 'distance', m); };
  C.ouvrir = () => appel('ouvrirClassement', 'distance');

  /* Un mot de la coque (« connexion impossible »...) : en haut de l'ecran, 2,5 s, par-dessus tout ; appele par la coque */
  let msg = null;
  C.message = t => { msg = { t: String(t), d: 2.5, a: 0 }; };
  C.messageVisible = () => !!msg;
  C.dessiner = (x, dt) => {
    if (!msg) return;
    msg.d -= dt; msg.a += dt;
    if (msg.d <= 0) { msg = null; return; }
    const K = '#17151f', w = G.txtW(msg.t) + 16, cx = G.VW / 2, y = Math.round(28 - 10 * Math.max(0, 1 - msg.a / .18));
    x.fillStyle = K; x.fillRect(Math.round(cx - w / 2) - 1, y - 1, w + 2, 18);
    x.fillStyle = '#2b2d3c'; x.fillRect(Math.round(cx - w / 2), y, w, 16);
    x.fillStyle = '#ffd54a'; x.fillRect(Math.round(cx - w / 2), y, w, 1);
    G.txt(x, msg.t, cx, y + 5, '#fff', { al: .5 });
  };
})();
