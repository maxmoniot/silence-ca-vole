/* Ce qu'on gagne et ce qu'on achete.
   - Au cumul de bobines (G.sav.cumul, jamais diminue) : la galerie s'ouvre, puis chaque lot de bobines ajoute des photos.
   - Avec la cagnotte (G.sav.bobines) : personnages, drones et bonus s'achetent d'un appui (Max, 06/11/2026 au soir : « les
     personnages et les drones ne s'achetent pas, ils se debloquent en fonction des pieces recoltees cumulees. C'est confusant. Je
     prefere que les personnages, les drones et les bonus soient tous des elements qu'on peut acheter en cliquant dessus »). */
'use strict';
(function () {
  if (!G.sav.cumul) G.sav.cumul = G.sav.bobines || 0;
  if (!G.sav.bonus4) {
    G.sav.bonus4 = 1;
    const a = G.sav.atelier || {}, prix = { projo: 120, aimant: 120, timelapse: 120, valeur: 120, prise2: 600, departBouclier: 900 };
    for (const k in prix) { for (let i = 0; i < (a[k] || 0); i++) G.sav.bobines += Math.round(prix[k] * Math.pow(1.8, i)); delete a[k]; }
  }
  G.gagne = n => { G.sav.bobines += n; G.sav.cumul += n; };

  const GAL = G.SEUIL_GALERIE = 250;
  // une photo a la fois, et chacune demande un peu plus que la precedente
  const COUT_PHOTO = k => 200 + 4 * k;
  const seuils = n => { const l = [GAL]; for (let k = 1; k < n; k++) l.push(l[k - 1] + COUT_PHOTO(k)); return l; };

  /* ---- Le prix d'un personnage ou d'un drone ----
     Il monte avec sa place dans le hangar (page apres page), un drone puis un personnage, comme les anciens paliers :
     400 + 60 r + 0,35 r² pieces au rang r (0 a 69), arrondi a 50 sous 1 000 et a 100 au-dessus. Le premier coute 400 (une bonne
     partie en rapporte environ 340), le 35e environ 3 000, le dernier 6 200 (18 bonnes parties). Tout le hangar : environ 212 000 ;
     avec l'atelier (26 000), 238 000, autant qu'il fallait ramasser avant pour tout debloquer au cumul : environ 700 bonnes parties. */
  const GRATUITS = { perso: 'moi', drone: 'phantom' };
  const liste = k => (k === 'perso' ? G.PERSOS : G.MODELES) || [];
  const arrondi = v => v < 1000 ? Math.round(v / 50) * 50 : Math.round(v / 100) * 100;
  G.prixRang = r => arrondi(400 + 60 * r + .35 * r * r);
  /* Le drone et le personnage des deux derniers rangs (speciaux.js, Max, 08/11/2026) ne s'achetent pas : on les a au rang qui les
     donne (J.RANGS : drone, perso). Ils ne comptent ni dans les prix des autres, ni dans ce qu'on peut s'offrir. */
  G.special = (k, id) => { const e = liste(k).find(q => q.id === id); return e && e.special ? e : null; };
  G.prix = (k, id) => {
    if (id === GRATUITS[k] || G.special(k, id)) return 0;
    const i = liste(k).filter(e => e.id !== GRATUITS[k] && !e.special).findIndex(e => e.id === id);
    return i < 0 ? 0 : G.prixRang(2 * i + (k === 'perso' ? 1 : 0));
  };
  // ce qu'on a : achete, ou garde d'avant la boutique ; le personnage « toi » et le drone fidele sont la des le debut
  G.possede = (k, id) => {
    // un special : au rang qui le donne, ou deja gagne (note dans les achats, J.garderSpeciaux et la fin de partie)
    if (G.special(k, id)) { if (G.sav.achats && G.sav.achats[k] && G.sav.achats[k][id]) return true; const r = G.Jeu && G.Jeu.rangDe ? G.Jeu.rangDe(k, id) : -1; return r >= 0 && G.Jeu.rangIndex() >= r; }
    return id === GRATUITS[k] || !!(G.sav.achats && G.sav.achats[k] && G.sav.achats[k][id]);
  };
  // pour dessiner un apercu (G.heroEssai), tout est permis le temps d'une image
  G.toutVoir = false;
  G.debloque = (k, id) => G.toutVoir || G.possede(k, id);
  // l'acheter avec la cagnotte : paye, garde, sauvegarde ; le cumul (les photos) ne bouge pas
  G.acheterObjet = (k, id) => {
    const px = G.prix(k, id);
    if (G.special(k, id) || G.possede(k, id) || G.sav.bobines < px) return false;
    G.sav.bobines -= px;
    const a = G.sav.achats = G.sav.achats || { perso: {}, drone: {} };
    (a[k] = a[k] || {})[id] = 1;
    G.sauver();
    return true;
  };
  // ce qui ne nous appartient pas encore et qu'on peut s'offrir avec la cagnotte
  G.abordables = () => ['perso', 'drone'].flatMap(k => liste(k).filter(e => !e.special && !G.possede(k, e.id) && G.sav.bobines >= G.prix(k, e.id)).map(e => k + ':' + e.id));

  /* Une sauvegarde d'avant la boutique garde tout ce que son cumul avait debloque, et rien de plus (les paliers d'avant) */
  const ANCIENS = {
    drone: { course: 600, carton: 1500, hexa: 3000, laiton: 5200, tapis: 8000, soucoupe: 11500, canard: 14500, pizza: 18000, fusee: 22000, baignoire: 26500, grillepain: 31500, clap: 37000, canape: 43000, balai: 49500, nuage: 56500, bobine: 64000, cygne: 72000, avion: 80000, popcorn: 88000, tortue: 96000, donut: 104000, cassette: 112000, poele: 120000, bocal: 128500, hamburger: 137500, chariot: 146500, pasteque: 155500, theiere: 164500, aspirateur: 173500, escargot: 183000, cervolant: 193000, chaudron: 203000, traineau: 213000, dirigeable: 223000, dragon: 233000 },
    perso: { realisatrice: 1000, perchman: 2200, mamie: 4000, astro: 6500, pirate: 10000, dino: 13000, super: 16000, banane: 20000, licorne: 24000, chevalier: 29000, fantome: 34000, poulet: 40000, viking: 46000, magicien: 53000, cowboy: 60000, chef: 68000, abeille: 76000, requin: 84000, clown: 92000, ninja: 100000, pompier: 108000, grenouille: 116000, robot: 124000, hotdog: 133000, lion: 142000, momie: 151000, vampire: 160000, pieuvre: 169000, citrouille: 178000, scaphandrier: 188000, bebe: 198000, martien: 208000, pharaon: 218000, perenoel: 228000, roi: 238000 },
  };
  G.migrerAchats = () => {
    if (G.sav.achats) return;
    const a = G.sav.achats = { perso: {}, drone: {} }, c = G.sav.cumul || 0;
    for (const k in ANCIENS) for (const id in ANCIENS[k]) if (c >= ANCIENS[k][id]) a[k][id] = 1;
    // ce qu'on montait garde sa place s'il est a nous, sinon le heros et le drone du debut
    if (!G.possede('perso', G.sav.heros)) G.sav.heros = 'moi';
    if (!G.possede('drone', G.sav.modele)) G.sav.modele = 'phantom';
    G.sauver();
  };

  /* ---- Les cadeaux du cumul : la galerie, puis les photos ---- */
  G.PALIERS = [{ a: GAL, k: 'galerie', n: 'Galerie' }];
  G.galerieOuverte = () => G.sav.cumul >= GAL;
  const SEUILS = seuils(G.PHOTOS.length);
  G.nbPhotos = (c = G.sav.cumul) => { let n = 0; while (n < SEUILS.length && c >= SEUILS[n]) n++; return n; };
  G.seuilPhoto = () => { const n = G.nbPhotos(); return n >= SEUILS.length ? null : SEUILS[n]; };
  /* Les photos qu'on voit : seulement celles des decors deja decouverts en jeu (Max, 04/11/2026), dans l'ordre de G.PHOTOS, autant
     que le cumul en donne. Un credit de plus qu'il n'y a de decors decouverts attend : la photo arrive avec le prochain decor decouvert. */
  G.photosVisibles = () => G.PHOTOS.filter(ph => G.sav.vus && G.sav.vus[ph[0]]).slice(0, G.nbPhotos());
  // le prochain cadeau : la galerie, puis la prochaine photo
  G.prochain = () => {
    if (!G.galerieOuverte()) return { a: GAL, k: 'galerie', n: 'Galerie' };
    const sp = G.seuilPhoto();
    return sp ? { a: sp, k: 'photo', n: 'Photo de tournage' } : null;
  };
  // le cadeau precedent, pour remplir la barre
  G.avant = a => { let v = 0; for (const q of G.PALIERS) if (q.a < a) v = Math.max(v, q.a); for (const s of SEUILS) if (s < a) v = Math.max(v, s); return Math.min(v, G.sav.cumul); };
  // p0 : les photos visibles au debut de la partie (G.photosVisibles), pour compter celles qu'elle a debloquees
  G.gainsEntre = (c0, c1, p0) => {
    const l = G.PALIERS.filter(q => q.a > c0 && q.a <= c1).map(q => Object.assign({}, q));
    const n = p0 !== undefined ? G.photosVisibles().length - p0 : G.nbPhotos(c1) - G.nbPhotos(c0);
    // le moins de texte possible, et il tient dans son cadre (« le texte deborde » : Max, 04/11/2026)
    if (n > 0) l.unshift({ k: 'photo', n: '+' + n + (n > 1 ? ' photos' : ' photo'), nb: n });
    return l;
  };
})();
