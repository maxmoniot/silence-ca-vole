/* Version iPhone et iPad (appli web de l'écran d'accueil, 11/11/2026) : ce que la coque Android fait pour le jeu, ici pour Safari.
   Chargé avant le jeu (iphone/construire.js) ; web/js n'est pas modifié.
   1. Encoches, île dynamique et coins arrondis : Safari ne donne que la profondeur des bords à éviter (env(safe-area-inset-*), lue
      sur #sonde), sur toute la hauteur : l'encoche ou l'île au milieu, les coins très arrondis de l'iPhone en haut et en bas (un
      record posé à 10 pixels du coin y serait rogné). Cette bande est passée au jeu comme le fait la coque Android
      (window.AndroidBridge.encoches, pixels de l'écran ; ui.js ne lit que cette fonction : sans les autres, le jeu fait comme dans un
      navigateur), coupée en trois morceaux (haut, milieu, bas) : ui.js ignore une bande qui longe tout un bord (écran incurvé
      d'Android). Un bord sans marge (iPad, iPhone à bouton) : rien.
   2. Le son : Safari ne démarre le son que sur un geste qui se termine (doigt levé, clic), et le coupe quand l'appli passe en arrière-
      plan. Chaque contexte audio créé par le jeu est noté et repris au toucher suivant.
   3. Les gestes de Safari : pas de zoom à deux doigts ni au double appui, pas de loupe ni de menu à l'appui long.
   4. L'écran reste allumé pendant qu'on joue (verrou d'écran, repris au retour dans l'appli).
   5. Hors ligne : le service sw.js garde tout le jeu sur le téléphone (d'abord les scripts, puis toutes les images en arrière-plan).
   6. Dans Safari (pas encore sur l'écran d'accueil) : une fenêtre montre les trois gestes pour l'installer, ou « Jouer ici ».
   Contrôle : tests/iphone.js. */
(function () {
  'use strict';
  const I = window.SCV_IPHONE = { contextes: [], encoches: [], garde: null };
  const ua = navigator.userAgent || '';
  // l'iPad se présente comme un Mac depuis iPadOS 13 : un « Mac » tactile est un iPad
  I.ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  I.dansAppli = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|musical_ly|Bytedance|TikTok|Line\/|LinkedInApp|Pinterest|GSA\//.test(ua);
  I.installe = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);

  /* 1. Encoches */
  const px = v => parseFloat(v) || 0;
  I.mesurer = () => {
    const s = document.getElementById('sonde');
    const w = window.innerWidth, h = window.innerHeight, d = window.devicePixelRatio || 1, r = [];
    if (s && w > h) {
      const cs = getComputedStyle(s), g = px(cs.paddingLeft), dr = px(cs.paddingRight);
      const coupes = [0, .22, .78, 1].map(k => Math.round(h * k * d));
      for (let i = 0; i < 3; i++) {
        if (g > 0) r.push([0, coupes[i], Math.round(g * d), coupes[i + 1]]);
        if (dr > 0) r.push([Math.round((w - dr) * d), coupes[i], Math.round(w * d), coupes[i + 1]]);
      }
    }
    I.encoches = r;
    return r;
  };
  window.AndroidBridge = { encoches: () => JSON.stringify(I.mesurer()) };
  const majEncoches = () => { if (window.G && G.UI && G.UI.encoches) G.UI.encoches(); };
  // Safari donne les nouvelles marges un peu après le demi-tour de l'écran
  const apresRotation = () => { majEncoches(); setTimeout(majEncoches, 250); setTimeout(majEncoches, 700); };
  window.addEventListener('resize', apresRotation);
  window.addEventListener('orientationchange', apresRotation);

  /* 2. Le son */
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const Note = function (o) { const c = o ? new AC(o) : new AC(); I.contextes.push(c); return c; };
    Note.prototype = AC.prototype;
    window.AudioContext = Note;
    if (window.webkitAudioContext) window.webkitAudioContext = Note;
  }
  let debloque = false;
  const reprendre = () => {
    if (window.G && G.Audio && G.Audio.init) { try { G.Audio.init(); } catch (e) { /* pas encore pret */ } }
    for (const c of I.contextes) {
      if (c.state !== 'running' && c.state !== 'closed') { try { c.resume(); } catch (e) { /* refuse */ } }
      // la première fois, un silence joué dans le geste ouvre la sortie du son (vieux iOS)
      if (!debloque) {
        try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); debloque = true; } catch (e) { /* rien */ }
      }
    }
    garderEcran();
  };
  for (const ev of ['touchend', 'click', 'keydown']) window.addEventListener(ev, reprendre, true);

  /* 3. Les gestes de Safari */
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
  // l'écran du jeu ne défile jamais (dans Safari, un glissé ferait bouger la page et ses barres) ; la fenêtre d'installation, si
  document.addEventListener('touchmove', e => { if (!e.target.closest || !e.target.closest('#installer')) e.preventDefault(); }, { passive: false });
  // un doigt sur la fenêtre d'installation n'arrive pas au jeu : le jeu écoute les appuis sur toute la page et, en paysage, les
  // annule (preventDefault), et Safari ne fait alors plus de clic : « Jouer ici » ne répondait pas au doigt, et l'appui touchait
  // le jeu caché dessous. Arrêté à la fenêtre (window, phase de capture), avant l'écoute du jeu sur document.
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    window.addEventListener(ev, e => { if (e.target.closest && e.target.closest('#installer')) e.stopPropagation(); }, true);
  }

  /* 4. L'écran allumé */
  function garderEcran() {
    if (I.garde || !navigator.wakeLock || document.hidden) return;
    navigator.wakeLock.request('screen').then(v => { I.garde = v; v.addEventListener('release', () => { I.garde = null; }); }).catch(() => { });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { garderEcran(); majEncoches(); } });

  /* 5. Hors ligne */
  I.hors = { fait: 0, total: 0, fini: false };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.addEventListener('message', e => {
        const m = e.data || {};
        if (m.type === 'avance') { I.hors.fait = m.fait; I.hors.total = m.total; I.hors.fini = m.fait >= m.total; }
      });
      navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(r => {
        // toutes les images, en arrière-plan, sans gêner le chargement du jeu
        setTimeout(() => { if (r.active) r.active.postMessage({ type: 'tout' }); }, 4000);
      }).catch(() => { });
      // le stockage ne doit pas être vidé par le système
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    });
  }

  /* 6. La fenêtre d'installation, dans Safari seulement */
  const ouvrirInstallation = () => {
    const f = document.getElementById('installer');
    if (!f) return;
    let vu = false;
    try { vu = sessionStorage.getItem('scv.jouerIci') === '1'; } catch (e) { /* navigation privée */ }
    if (I.ios && !I.installe && !vu) f.classList.add('ouvert');
    // le navigateur d'une appli (Instagram, Facebook, TikTok, Snapchat, Google…) n'a pas « Sur l'écran d'accueil » : d'abord Safari
    if (I.dansAppli) f.classList.add('dans-appli');
    document.getElementById('jouer-ici').addEventListener('click', () => {
      f.classList.remove('ouvert');
      try { sessionStorage.setItem('scv.jouerIci', '1'); } catch (e) { /* rien */ }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ouvrirInstallation); else ouvrirInstallation();
})();
