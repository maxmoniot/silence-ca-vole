/* L'humour du jeu : saynetes jouees par les figurants, repliques, et petites betises du decor.
   Une saynete = des acteurs poses au sol + une ligne de temps. Elle ne change jamais le gameplay. */
'use strict';
(function () {
  /* Petits objets dessines a la main */
  const K = '#17151f';
  const ITEMS = G.ITEMS = {
    baguette(x) { x.fillStyle = K; x.fillRect(0, 2, 16, 4); x.fillStyle = '#d99a4a'; x.fillRect(1, 3, 14, 2); x.fillStyle = '#f0c98a'; x.fillRect(3, 3, 2, 1); x.fillRect(7, 3, 2, 1); x.fillRect(11, 3, 2, 1); },
    coco(x) { x.fillStyle = K; x.fillRect(1, 0, 6, 8); x.fillRect(0, 1, 8, 6); x.fillStyle = '#6b4226'; x.fillRect(1, 1, 6, 6); x.fillStyle = '#8f5f3a'; x.fillRect(2, 2, 2, 2); },
    glace(x) { x.fillStyle = K; x.fillRect(1, 0, 6, 6); x.fillRect(2, 5, 4, 5); x.fillStyle = '#f7b5d0'; x.fillRect(2, 1, 4, 4); x.fillStyle = '#d99a4a'; x.fillRect(3, 6, 2, 3); },
    sandwich(x) { x.fillStyle = K; x.fillRect(0, 1, 10, 6); x.fillStyle = '#e8c07a'; x.fillRect(1, 2, 8, 1); x.fillStyle = '#6fbf4a'; x.fillRect(1, 3, 8, 1); x.fillStyle = '#d0524a'; x.fillRect(1, 4, 8, 1); x.fillStyle = '#e8c07a'; x.fillRect(1, 5, 8, 1); },
    rat(x) { x.fillStyle = K; x.fillRect(2, 2, 9, 5); x.fillRect(9, 3, 4, 3); x.fillStyle = '#6a6a74'; x.fillRect(3, 3, 7, 3); x.fillRect(10, 4, 2, 1); x.fillStyle = '#d88a9a'; x.fillRect(0, 5, 3, 1); x.fillRect(12, 4, 1, 1); },
    valise(x) { x.fillStyle = K; x.fillRect(0, 2, 10, 8); x.fillRect(3, 0, 4, 2); x.fillStyle = '#8a5a2c'; x.fillRect(1, 3, 8, 6); x.fillStyle = '#d9b36a'; x.fillRect(1, 5, 8, 1); },
    ballon(x) { x.fillStyle = K; x.fillRect(1, 0, 6, 8); x.fillRect(0, 1, 8, 6); x.fillStyle = '#fff'; x.fillRect(1, 1, 6, 6); x.fillStyle = K; x.fillRect(3, 3, 2, 2); },
    tapis(x) { x.fillStyle = K; x.fillRect(0, 2, 26, 4); x.fillStyle = '#b5302a'; x.fillRect(1, 3, 24, 2); x.fillStyle = '#f0c93a'; for (let i = 2; i < 24; i += 4) x.fillRect(i, 3, 2, 1); x.fillStyle = '#e8dcc0'; x.fillRect(0, 1, 1, 6); x.fillRect(25, 1, 1, 6); },
    pomme(x) { x.fillStyle = K; x.fillRect(0, 1, 7, 6); x.fillStyle = '#d0392f'; x.fillRect(1, 2, 5, 4); x.fillStyle = '#6fbf4a'; x.fillRect(3, 0, 2, 2); },
    carton(x) { x.fillStyle = K; x.fillRect(0, 0, 8, 11); x.fillStyle = '#e02b2b'; x.fillRect(1, 1, 6, 9); },
    pinte(x) { x.fillStyle = K; x.fillRect(0, 0, 7, 10); x.fillStyle = '#2a1a10'; x.fillRect(1, 3, 5, 6); x.fillStyle = '#f4ecd8'; x.fillRect(1, 1, 5, 2); },
    bombe(x) { x.fillStyle = K; x.fillRect(0, 2, 8, 8); x.fillStyle = '#fff'; x.fillRect(5, 0, 2, 2); },
    tomate(x) { x.fillStyle = K; x.fillRect(1, 1, 7, 7); x.fillRect(2, 0, 5, 9); x.fillStyle = '#e0392f'; x.fillRect(2, 2, 5, 5); x.fillStyle = '#ff7a5e'; x.fillRect(3, 2, 2, 1); x.fillStyle = '#5a9a4a'; x.fillRect(4, 0, 2, 2); },
    chaussure(x) { x.fillStyle = K; x.fillRect(0, 2, 12, 6); x.fillStyle = '#8a5a2c'; x.fillRect(1, 3, 10, 3); x.fillStyle = '#e9e4d8'; x.fillRect(1, 6, 10, 1); },
    riz(x) { x.fillStyle = '#fff'; x.fillRect(0, 2, 2, 1); x.fillRect(4, 0, 2, 1); x.fillRect(7, 3, 2, 1); x.fillRect(3, 5, 2, 1); },
    bouquet(x) { x.fillStyle = K; x.fillRect(1, 0, 8, 7); x.fillRect(4, 6, 2, 5); x.fillStyle = '#ff8ab0'; x.fillRect(2, 1, 3, 3); x.fillStyle = '#ffd54a'; x.fillRect(5, 1, 3, 3); x.fillStyle = '#fff'; x.fillRect(3, 4, 4, 2); x.fillStyle = '#5a9a4a'; x.fillRect(4, 7, 2, 3); },
    bouteille_jet(x) { x.fillStyle = K; x.fillRect(3, 0, 3, 3); x.fillRect(2, 3, 5, 9); x.fillStyle = '#5fb7ff'; x.fillRect(3, 4, 3, 7); x.fillStyle = '#fff'; x.fillRect(4, 1, 1, 2); },
    // le kebab de Melbourne : le pain roule, la viande, la salade et la sauce qui deborde
    kebab(x) { x.fillStyle = K; x.fillRect(0, 1, 13, 8); x.fillRect(1, 0, 11, 10); x.fillStyle = '#e8c88a'; x.fillRect(1, 2, 11, 6); x.fillStyle = '#f4dcaa'; x.fillRect(2, 2, 9, 1); x.fillStyle = '#9a5a2a'; x.fillRect(3, 3, 8, 2); x.fillStyle = '#6fbf4a'; x.fillRect(3, 5, 3, 1); x.fillStyle = '#e0392f'; x.fillRect(6, 5, 2, 1); x.fillStyle = '#fff6e8'; x.fillRect(9, 5, 2, 2); },
    crotte(x) { x.fillStyle = '#f4f4f0'; x.fillRect(1, 0, 2, 3); },
  };
  const itemCache = {};
  G.itemCanvas = id => {
    if (!itemCache[id]) { const c = G.mk(28, 14); ITEMS[id](c.x); const c2 = G.mk(40, 20); c2.x.drawImage(c, 0, 0, 28, 14, 0, 0, 40, 20); itemCache[id] = c2; }
    return itemCache[id];
  };

  /* Repliques de chaque region : le decor parle */
  G.REPLIQUES = {
    metro: ['Pardon !', 'Attention à la marche', 'Un ticket ?', 'Y\'a grève ?', 'Le prochain : 12 min', 'Interdit aux drones !', 'Ça sent le fromage', 'Tu descends ?', 'Je vais être en retard', 'Il capte, ici ?', 'Ligne 4, c\'est par où ?', 'Terminus, tout le monde', 'Pas dans le tunnel !', 'Mon sac !', 'C\'est le 14 ?', 'Ça, c\'est nouveau'],
    paris: ['Ô là là !', 'Un drone ? À Paris ?', 'C\'est interdit !', 'Baguette ?', 'Ça tourne ?', 'Coupez !', 'Il est où mon café ?', 'T\'as vu ça ?', 'Encore un tournage...', 'C\'est pour Netflix ?', 'Je suis dans le film ?', 'Il fait quoi, lui ?', 'Mon pigeon !', 'Et la fourrière ?', 'Tu me filmes ?', 'Il a l\'autorisation ?'],
    deauville: ['Sans les flashs !', 'Un autographe !', 'Je suis une star !', 'C\'est qui lui ?', 'Mon brushing !', 'Par ici la photo !', 'Darling !', 'Je suis nominée !', 'Mon agent t\'appelle', 'La mer est froide', 'Le tapis, c\'est par là', 'Il tourne pour qui ?', 'Pas mon mauvais profil', 'Quel chapeau !'],
    normandie: ['T\'as vu l\'drone ?', 'Y\'a pas de réseau ici', 'P\'têt ben qu\'oui', 'Bêêêê', 'Va-t\'en, l\'oiseau !', 'Il va pleuvoir', 'Un p\'tit cidre ?', 'Faudrait pas que ça dure', 'Ça vole bas, ça', 'C\'est pour la météo ?', 'Mes vaches ont peur !', 'Le camembert est prêt', 'Ça sent la pluie', 'Faut voir'],
    camargue: ['Oh peuchère !', 'Tu fais peur aux flamants !', 'Fada, ce drone !', 'Té, regarde !', 'Ça m\'en bouche un coin', 'Y a du mistral', 'Les moustiques !', 'Il vole, le fada !', 'Bonne mère !'],
    alpes: ['Youlou !', 'Pas de neige ici ?', 'Ma raclette !', 'Faut pas voler là', 'Attention, marmotte !', 'Quelle vue !', 'Encore 300 mètres', 'Mes mollets !', 'Le refuge est loin ?', 'T\'as du génépi ?', 'Ça souffle là-haut', 'Il a pris le forfait ?', 'Doucement !'],
    afriquesud: ['Howzit !', 'Lekker !', 'Mon sandwich !', 'Nice drone, bru !', 'Just now !', 'Sharp sharp !', 'Quel vent !', 'La montagne a sa nappe', 'T\'as vu la baleine ?', 'Attention aux mouettes !', 'Ça vole fort', 'Eish !', 'Mon chapeau !'],
    australie: ['G\'day !', 'No worries !', 'Pose ça, mate !', 'Crikey !', 'Too easy !', 'Ça chauffe, mate', 'Où sont les tortues ?', 'Doucement, c\'est la ponte', 'Fair dinkum !', 'Belle journée !'],
    egypte: ['Loukoum, attends !', 'Salade, tu pousses !', 'C\'est loin, le Caire ?', 'On est perdus', 'J\'ai du sable partout', 'Tourne pas ma tête !', 'C\'est quoi la scène ?', 'Je transpire de la tête', 'On tourne ou pas ?', 'Il fait 45 !', 'Où est l\'équipe ?', 'Encore une prise ?', 'Salade, ta feuille !'],
    hawaii: ['Aloha !', 'Mahalo !', 'Cowabunga !', 'Belle vague !', 'Ma planche !', 'Shaka !', 'T\'es trop haut, frère', 'Le vent se lève', 'Hang loose !', 'Tu surfes ?', 'Quel spot !', 'Mon collier !', 'C\'est le paradis'],
    irlande: ['Encore une pinte ?', 'Il pleut pas, ça mouille', 'Sláinte !', 'Beau temps, non ?', 'Grand jour, hein ?', 'Une pinte pour le drone !', 'Il a soif, celui-là', 'Et un de plus au pub', 'Mes moutons !', 'Fais attention, mon gars', 'Quelle lumière !', 'À la tienne !'],
    mediterranee: ['Baleine à tribord !', 'Coupe le moteur !', 'J\'ai le mal de mer', 'Note : drone sauvage', 'Tu l\'as vue souffler ?', 'Elle plonge !', 'Cap au sud !', 'On garde nos distances', 'Mes jumelles !', 'Quel souffle !'],
    caledonie: ['Bonjour !', 'Tata !', 'Ça va ou quoi ?', 'Attention au corail', 'Oh, c\'est bon là', 'T\'as vu le lagon ?', 'Il est chaud, le soleil', 'Au revoir la dame', 'Viens au bord de mer'],
    reunion: ['Oté !', 'Lé la !', 'Ça va marmaille ?', 'Un carry ?', 'Courage, le panda !', 'Encore le volcan ?', 'Kosa i lé ça ?', 'Ça monte fort', 'Mi veut un samoussa', 'Le sentier est par là', 'Quel dénivelé !', 'Allez, allez !'],
    puy: ['Ave, César !', 'Ave Max !', 'Mon oie !', 'Pas dans le Colisée !', 'Tu veux combattre ?', 'Le spectacle est à 15 h', 'Où est mon glaive ?', 'Le public t\'adore', 'Il a pas de casque', 'Pouce levé !', 'Aux chars !'],
    stade: ['Allez les bleus !', 'Hors-jeu !', 'Carton rouge !', 'Arbitre, le drone !', 'Olé !', 'Remboursez !', 'C\'est le ralenti ?', 'Il est où le ballon ?', 'But ! Non...', 'Tu vois le match ?', 'Et un, et deux...', 'La VAR !'],
    tunisie: ['Marhaba !', 'Ça, c\'est du sable', 'Il est où le 4x4 ?', 'Tu as de l\'eau ?', 'Quelle chaleur !', 'C\'est Star Wars ici ?', 'Ma casquette !', 'On tourne quand ?', 'Ça vole bien !', 'Il fait 40 !', 'Bonjour bonjour !', 'Le thé est prêt', 'Tu filmes le désert ?'],
    tatooine: ['Pas le bon décor', 'Ce ne sont pas les drones...', 'Il fait chaud ici', 'Deux soleils, double facture', 'C\'est loin, le vaisseau ?', 'Je n\'ai pas signé pour ça', 'Mon droïde est en panne', 'Silence sur le plateau !', 'J\'ai un mauvais pressentiment'],
    regie: ['Caméra 2, serre !', 'Prends la 4 !', 'Et... antenne !', 'Qui a débranché ?', 'Pas sur mon pupitre !', 'On est en direct !', 'Coupe le son !', 'Le drone, c\'est la 7 ?', 'Pub dans 30 secondes', 'Qui a mis ce café ici ?', 'Reste sur lui !', 'Ça passe à l\'antenne ?'],
    madagascar: ['Manao ahoana !', 'Mora mora !', 'Misaotra !', 'Tu jongles ?', 'Encore une balle !', 'Le zébu est par là'],
    niger: ['Fofo !', 'Il fait 44 !', 'Le thé est prêt', 'Mon chèche !', 'Le fleuve est bas'],
    maroc: ['Marhaba !', 'Un thé à la menthe ?', 'Un tapis ?', 'C\'est pour bientôt !', 'Yallah !'],
    russie: ['Privet !', 'Spassiba !', 'Il fait -20 !', 'Ma chapka !', 'Ça glisse !'],
    londres: ['Cheers, mate !', 'Lovely weather !', 'Mind the gap !', 'Un thé ?', 'Le spectacle est à 19 h !'],
    canada: ['Allô !', 'C\'est le fun !', 'Il fait frette !', 'Tiguidou !', 'Une poutine ?'],
    sousmarin: ['Blub', 'Glou glou', 'Blub blub ?', 'Blub !', 'Mon détendeur !', 'T\'as vu la tortue ?', 'Plus que 50 bars', 'Ok ?', 'Blub blub blub', 'Palier de 3 min !', 'Il est étanche ?', 'Regarde, un requin !'],
  };
  /* Ce que dit le cadreur */
  G.REPLIQUES_HEROS = {
    depart: ['Moteur...', 'Silence, ça vole !', 'Prise 1 !', 'Et... action !'],
    decor: ['Quelle lumière !', 'On a l\'autorisation ?', 'Magnifique !', 'On garde !', 'Ça, c\'est un plan !', 'Regarde-moi ça !', 'Je veux ça au montage'],
    frole: ['Ouf !', 'Même pas peur', 'Je l\'ai eu au zoom', 'Pas loin !', 'Ma caméra !', 'Oups', 'C\'était voulu'],
    ras: ['Pardon !', 'Baissez-vous !', 'Excusez !', 'Ça décoiffe ?'],
    plan: ['Dans la boîte !', 'On la garde !', 'Parfait !', 'Coupez, c\'est bon !', 'Oscar !'],
    eau: ['Glou glou', 'C\'est étanche ?', 'Ça mouille !', 'J\'espère que c\'est étanche'],
    surface: ['Pfiou !', 'Mes piles !', 'Ça sèche vite'],
    ramasse: ['Ah, de la pellicule !', 'Super !', 'Top !'],
    pouvoir: ['Coup de projo !', 'Ouh là !', 'Plein gaz !'],
  };

  /* Saynetes. Acteur : d=poupee, s=sprite, i=objet.
     dx = decalage, v = vitesse propre vers la droite (px/s), pose, flip, y = hauteur au-dessus du sol, hop = sautille
     Ligne de temps : [temps, acteur, changements]. bulle = replique. tombe = a la renverse. saut = impulsion. etoiles = sonne. */
  const g = (r, acteurs, tl) => ({ r, acteurs, tl });
  G.GAGS = [
    // ------- Metro
    g('metro', [{ d: 'costard', pose: 'course', v: 95, flip: 0 }, { i: 'valise', dx: -14, v: 95 }], [[.3, 0, { bulle: 'Attendez-moi !' }], [1.6, 0, { tombe: 1, v: 0, etoiles: 1, bulle: 'Aïe' }], [1.6, 1, { saut: 90, v: 60 }]]),
    g('metro', [{ d: 'controleur', pose: 'course', v: 110 }, { d: 'usager', dx: 34, pose: 'course', v: 110 }], [[.4, 1, { bulle: 'Pas de ticket !' }], [1.2, 0, { bulle: 'Eh ! Vous là !' }]]),
    g('metro', [{ i: 'rat', v: 30, hop: 1 }, { d: 'usagere', dx: 50, pose: 'panique', v: 60 }], [[.3, 2, { bulle: 'UN RAT !' }]]),
    g('metro', [{ d: 'accordeoniste', pose: 'neutre', v: 0 }, { d: 'usager', dx: 28, pose: 'marche', v: 26 }], [[.5, 0, { bulle: 'La vie en rooose' }], [1.5, 1, { pose: 'panique', v: 110, bulle: 'Pitié...' }]]),
    // ------- Paris
    g('paris', [{ d: 'danseuse', pose: 'salut', v: 0, hop: 1 }, { d: 'perchman', dx: -26, pose: 'perche', v: 0 }, { d: 'assistant', dx: 34, pose: 'marche', v: 0 }], [[.5, 2, { bulle: 'Clap ! Prise 42 !' }], [1.5, 0, { tombe: 1, bulle: 'Ma cheville !' }]]),
    g('paris', [{ d: 'touriste', pose: 'filme', v: 0 }, { d: 'touriste2', dx: 22, pose: 'filme', v: 0 }, { d: 'touriste3', dx: 44, pose: 'filme', v: 0 }], [[.4, 1, { bulle: 'C\'est le président ?' }], [1.4, 2, { bulle: 'Non, c\'est un livreur' }]]),
    // ------- Deauville
    g('deauville', [{ d: 'star', pose: 'marche', v: 34 }, { d: 'paparazzi', dx: -24, pose: 'filme', v: 34 }, { d: 'paparazzi', dx: -44, pose: 'filme', v: 34 }, { d: 'paparazzi', dx: 30, pose: 'filme', v: 34 }], [[.4, 0, { bulle: 'Pas mon mauvais profil !' }], [1.7, 0, { tombe: 1, v: 0, etoiles: 1 }], [1.9, 1, { bulle: 'Exclu !' }]]),
    g('deauville', [{ d: 'smoking', pose: 'salut', v: 0 }, { d: 'plagiste', dx: 34, pose: 'marche', v: 0 }], [[.4, 0, { bulle: 'Vous savez qui je suis ?' }], [1.4, 1, { bulle: 'Non.' }]]),
    g('deauville', [{ s: 'mouette', y: 46, dx: 70, v: -30 }, { d: 'plagiste', pose: 'marche', v: 24 }, { i: 'glace', dx: 8, y: 12, v: 24 }], [[1, 0, { v: 24 }], [1.2, 2, { y: 46, v: 90 }], [1.2, 0, { v: 90 }], [1.25, 1, { bulle: 'MA GLACE !', pose: 'course', v: 90 }]]),
    // ------- Normandie
    g('normandie', [{ d: 'paysan', pose: 'marche', v: 20 }, { s: 'mouton', dx: 26, v: 20, hop: 1 }, { s: 'mouton', dx: 52, v: 20, hop: 1 }, { s: 'mouton', dx: 78, v: 60, hop: 2 }], [[.5, 0, { bulle: 'Reviens, Germaine !' }], [1.2, 3, { bulle: 'Bêêê !', v: 120 }]]),
    g('normandie', [{ d: 'touriste', pose: 'filme', v: 0 }, { i: 'pomme', dx: 2, y: 60, v: 0, cache: 1 }], [[.6, 1, { saut: -30 }], [1.2, 0, { etoiles: 1, bulle: 'Newton ?' }]]),
    g('normandie', [{ d: 'pelerin', pose: 'course', v: 100 }, { d: 'touriste3', dx: 26, pose: 'panique', v: 100 }, { d: 'touriste', dx: -30, pose: 'panique', v: 100 }], [[.4, 0, { bulle: 'LA MARÉE !' }], [1.2, 2, { bulle: 'Au grand galop !' }]]),
    g('normandie', [{ s: 'mouton', v: 0 }, { s: 'mouton', dx: 2, y: 13, v: 0, hop: 1 }, { s: 'mouton', dx: 3, y: 26, v: 0 }], [[.6, 2, { bulle: 'Bêê ?' }], [1.5, 2, { saut: 50, v: 40, y: 0 }]]),
    // ------- Camargue
    g('camargue', [{ s: 'flamant', v: 0 }, { s: 'flamant', dx: 30, v: 0, hop: 1 }, { s: 'flamant', dx: 60, v: 0 }], [[.8, 0, { rot: .3 }], [1.5, 2, { bulle: 'Oh, peuchère' }]]),
    g('camargue', [{ d: 'touriste2', pose: 'course', v: 110 }, { s: 'flamant_vol', dx: -36, y: 14, v: 112 }], [[.5, 0, { bulle: 'Il veut mon chapeau !' }]]),
    // ------- Alpes
    g('alpes', [{ d: 'skieur', pose: 'saute', v: 60, hop: 1 }], [[.4, 0, { bulle: 'Y a plus de neige !' }]]),
    g('alpes', [{ d: 'randonneur', pose: 'marche', v: 20 }, { s: 'bouquetin', dx: -60, v: 120 }], [[.9, 1, { v: 50 }], [1, 0, { saut: 150, tombe: 1, bulle: 'Aaaaah !', v: 90 }]]),
    g('alpes', [{ s: 'marmotte', v: 0, hop: 1 }, { d: 'enduro', dx: 90, pose: 'course', v: -30 }], [[.4, 0, { bulle: 'Fuiiiit !' }], [1.2, 1, { tombe: 1, etoiles: 1 }]]),
    // ------- Afrique du Sud
    g('afriquesud', [{ s: 'manchot', v: 28, hop: 1 }, { s: 'manchot', dx: -14, v: 28, hop: 1 }, { s: 'manchot', dx: -28, v: 28, hop: 1 }, { s: 'manchot', dx: -42, v: 28, hop: 1 }], [[1.0, 3, { hop: 2 }], [1.15, 2, { hop: 2 }], [1.3, 1, { hop: 2 }], [1.45, 0, { hop: 2, bulle: 'Coin ?' }]]),
    g('afriquesud', [{ d: 'capetonien', pose: 'saute', v: 0, hop: 1 }, { d: 'capetonienne', dx: 26, pose: 'saute', v: 0, hop: 1 }, { d: 'ranger', dx: 54, pose: 'neutre', v: 0 }], [[.8, 2, { bulle: 'Ils dansent, moi non' }], [1.6, 2, { pose: 'saute', hop: 1 }]]),
    // ------- Australie
    g('australie', [{ d: 'surfeur', pose: 'marche', v: 30 }, { s: 'crabe', dx: -26, v: 70, hop: 1 }], [[.8, 1, { v: 31 }], [1.2, 0, { bulle: 'AÏE ! Mon orteil !', pose: 'saute', hop: 2 }]]),
    // ------- Egypte
    g('egypte', [{ d: 'salade', pose: 'course', v: 112 }, { d: 'policier_ete', dx: -38, pose: 'course', v: 118 }, { d: 'policier_ete', dx: -62, pose: 'course', v: 114 }], [[.4, 1, { bulle: 'Halte !' }], [1.4, 0, { bulle: 'Je ne suis qu\'une salade !' }]]),
    g('egypte', [{ d: 'salade', pose: 'course', v: 120 }, { d: 'policier_ete', dx: -30, pose: 'course', v: 112 }], [[.4, 1, { bulle: 'Vos papiers !' }], [1.3, 1, { tombe: 1 }]]),
    g('egypte', [{ d: 'salade', pose: 'course', v: 100 }, { d: 'loukoum', dx: -34, pose: 'course', v: 110 }], [[.4, 1, { bulle: 'Rends-moi ma tête !' }], [1.4, 0, { bulle: 'C\'est la mienne !' }]]),
    g('egypte', [{ d: 'salade', pose: 'marche', v: 8 }, { s: 'ane', dx: -22, v: 0 }], [[.4, 0, { bulle: 'Avance...' }], [1.2, 1, { bulle: 'Non.' }], [1.9, 0, { tombe: 1, v: 0 }]]),
    g('egypte', [{ d: 'loukoum', pose: 'saute', v: 0, hop: 1 }, { d: 'salade', dx: 24, pose: 'saute', v: 0, hop: 1 }], [[.4, 0, { bulle: 'On a une scène ?' }], [1.3, 1, { bulle: 'Fais comme si !' }]]),
    g('egypte', [{ d: 'salade', pose: 'filme', v: 0 }, { d: 'loukoum', dx: 34, pose: 'salut', v: 0 }, { s: 'dromadaire', dx: 56, v: 0 }], [[.9, 2, { bulle: 'Pffft', }], [1.2, 1, { tombe: 1, bulle: 'Il m\'a craché dessus !' }]]),
    // ------- Hawaii
    g('hawaii', [{ d: 'touriste2', pose: 'filme', v: 0 }, { i: 'coco', dx: 2, y: 80, v: 0, cache: 1 }], [[.5, 1, { saut: -20 }], [1.1, 0, { tombe: 1, etoiles: 1, bulle: 'Aloha...' }]]),
    g('hawaii', [{ d: 'hawaienne', pose: 'salut', v: 0, hop: 1 }, { d: 'touriste', dx: 26, pose: 'salut', v: 0, hop: 1 }, { d: 'touriste3', dx: 52, pose: 'neutre', v: 0 }], [[.5, 2, { bulle: 'Je sais pas danser' }], [1.4, 2, { tombe: 1 }]]),
    g('hawaii', [{ d: 'surfeur', pose: 'course', v: 110 }, { s: 'crabe', dx: -20, v: 112, hop: 2 }], [[.4, 0, { bulle: 'Il me suit !' }]]),
    // ------- Irlande
    g('irlande', [{ d: 'irlandais', pose: 'marche', v: 18 }, { i: 'pinte', dx: 7, y: 11, v: 18 }, { s: 'mouton', dx: -24, v: 18, hop: 1 }], [[.5, 0, { bulle: 'Il fait bon !' }], [1.3, 2, { y: 18 }], [1.3, 0, { bulle: 'Rends ma pinte !' }]]),
    g('irlande', [{ s: 'cheval_noir', v: 0 }, { d: 'randonneur', dx: -40, pose: 'marche', v: 28 }], [[1.2, 1, { saut: 130, tombe: 1, v: -30, bulle: 'Ouille !' }], [1.3, 0, { hop: 1 }]]),
    // ------- Mediterranee
    g('mediterranee', [{ d: 'marin', pose: 'neutre', v: 0 }, { d: 'biologiste', dx: 28, pose: 'filme', v: 0 }], [[.5, 1, { bulle: 'Une baleine !' }], [1.3, 0, { bulle: 'C\'est une bouée.' }]]),
    // ------- Caledonie
    g('caledonie', [{ d: 'caledonien', pose: 'marche', v: 20 }, { i: 'coco', dx: 8, y: 90, v: 20, cache: 1 }], [[.4, 1, { saut: -20 }], [1, 0, { etoiles: 1, bulle: 'Encore !' }]]),
    g('caledonie', [{ d: 'touriste2', pose: 'marche', v: 12 }, { d: 'caledonienne', dx: 40, pose: 'salut', v: 0 }], [[.6, 1, { bulle: 'La mer, c\'est là-bas' }]]),
    // ------- Reunion
    g('reunion', [{ s: 'coureur_panda', v: 80 }, { d: 'coureur', dx: -30, pose: 'course', v: 84 }], [[.5, 1, { bulle: 'Le panda est devant !' }], [1.5, 0, { bulle: 'Roar !' }]]),
    g('reunion', [{ d: 'reunionnais', pose: 'saute', v: 0, hop: 1 }, { d: 'coureur', dx: 30, pose: 'panique', v: 80 }], [[.5, 0, { bulle: 'Oté ! Un carry ?' }], [1.1, 1, { bulle: 'C\'est du piment ?!' }]]),
    // ------- Puy du Fou
    g('puy', [{ d: 'legionnaire', pose: 'panique', v: 110 }, { s: 'oie', dx: -22, v: 118, hop: 2 }, { s: 'oie', dx: -38, v: 112, hop: 2 }, { s: 'oie', dx: -52, v: 116, hop: 2 }], [[.4, 0, { bulle: 'PAS LES OIES !' }], [1.6, 1, { bulle: 'Coin !' }]]),
    g('puy', [{ d: 'gladiateur', pose: 'salut', v: 0 }, { d: 'gladiateur', dx: 32, pose: 'salut', v: 0, flip: 1 }], [[.5, 0, { bulle: 'Tu combats ?' }], [1.3, 1, { bulle: 'J\'ai pause.' }]]),
    // ------- Stade
    g('stade', [{ d: 'joueur', pose: 'course', v: 60 }, { i: 'ballon', dx: 12, v: 60, hop: 1 }, { d: 'joueur', dx: 40, pose: 'course', v: 40 }], [[1.1, 2, { tombe: 1, v: 0, bulle: 'PENALTY !' }]]),
    g('stade', [{ d: 'joueur', pose: 'salut', v: 0 }, { i: 'carton', dx: 8, y: 18, v: 0, hop: 1 }], [[.5, 0, { bulle: 'Carton rouge, le drone !' }]]),
    // ------- Tunisie
    g('tunisie', [{ d: 'touriste3', pose: 'filme', v: 0 }, { s: 'dromadaire', dx: 30, v: 0 }], [[.8, 1, { bulle: 'Pfft !' }], [1.1, 0, { tombe: 1, bulle: 'Berk !' }]]),
    g('tunisie', [{ d: 'equipe', pose: 'filme', v: 0 }, { d: 'enfant', dx: 34, pose: 'salut', v: 0, hop: 1 }], [[.5, 1, { bulle: 'Salut maman !' }], [1.4, 0, { bulle: 'Coupez !' }]]),
    g('tatooine', [{ d: 'jawa', pose: 'course', v: 110 }, { d: 'jawa', dx: -24, pose: 'course', v: 110 }, { d: 'jawa', dx: -48, pose: 'course', v: 110 }], [[.5, 0, { bulle: 'Bazar ! Bazar !' }], [1.4, 2, { tombe: 1, v: 0, bulle: 'Attendez !' }]]),
    g('tatooine', [{ d: 'moine', pose: 'salut', v: 0 }, { d: 'equipe', dx: 30, pose: 'filme', v: 0 }], [[.5, 0, { bulle: 'Ce drone-là...' }], [1.3, 0, { bulle: '...n\'est pas celui que vous cherchez.' }]]),
    // ------- Les lieux du 02/11/2026
    g('madagascar', [{ d: 'jongleur', pose: 'jongle', v: 0 }, { d: 'enfant', dx: 30, pose: 'applaudit', v: 0, hop: 1 }], [[.5, 1, { bulle: 'Encore !' }], [1.3, 0, { bulle: 'Une quatrième !' }], [2, 0, { tombe: 1, etoiles: 1, bulle: 'Oups...' }]]),
    g('madagascar', [{ d: 'jongleuse', pose: 'jongle', v: 0 }, { d: 'jongleur', dx: 26, pose: 'jongle', v: 0 }], [[.5, 0, { bulle: 'Je te les passe !' }], [1.4, 1, { bulle: 'Mora mora !' }]]),
    g('niger', [{ d: 'bedouin', pose: 'marche', v: 18 }, { s: 'dromadaire', dx: -40, v: 18 }], [[.5, 0, { bulle: 'Avance, Baraka !' }], [1.3, 1, { v: 0 }], [1.6, 0, { bulle: 'Il fait la sieste...' }]]),
    g('niger', [{ d: 'bedouine', pose: 'salut', v: 0 }, { d: 'touriste3', dx: 30, pose: 'filme', v: 0 }], [[.5, 1, { bulle: 'C\'est quoi ce turban ?' }], [1.4, 0, { bulle: 'Un chèche. Contre le sable.' }]]),
    g('maroc', [{ d: 'enceinte', pose: 'marche', v: 12 }, { d: 'marocain', dx: 28, pose: 'marche', v: 12 }], [[.5, 0, { bulle: 'Il a bougé !' }], [1.3, 1, { pose: 'saute', hop: 1, bulle: 'Je vais être papa !' }]]),
    g('maroc', [{ d: 'enceinte2', pose: 'marche', v: 10 }, { d: 'marocaine', dx: -26, pose: 'marche', v: 10 }], [[.5, 1, { bulle: 'Tu manges pour deux ?' }], [1.4, 0, { bulle: 'Pour trois. Des jumeaux !' }]]),
    g('maroc', [{ s: 'ane', v: 0 }, { d: 'marocain', dx: -26, pose: 'marche', v: 6 }], [[.5, 1, { bulle: 'Yallah !' }], [1.3, 0, { bulle: 'Hi-han.' }], [1.8, 1, { tombe: 1 }]]),
    g('melbourne', [{ d: 'melbournien', pose: 'marche', v: 20 }, { i: 'kebab', dx: 7, y: 11, v: 20 }], [[.4, 0, { bulle: 'Tiens, un kebab !' }], [1, 1, { saut: 190, v: 130 }], [1, 0, { pose: 'salut', v: 0 }], [1.6, 0, { bulle: 'Il est chaud, mate !' }]]),
    g('melbourne', [{ d: 'melbournien', pose: 'salut', v: 0 }, { i: 'kebab', dx: 6, y: 12, v: 0 }, { s: 'mouette', dx: 90, y: 50, v: -60 }], [[.6, 2, { y: 12, v: -50 }], [.9, 1, { y: 50, v: -60 }], [1, 0, { bulle: 'MON KEBAB !', pose: 'course', v: -90 }]]),
    g('russie', [{ d: 'babouchka', pose: 'canne', v: 10 }, { d: 'russe', dx: 30, pose: 'marche', v: 26 }], [[.5, 0, { bulle: 'Mets ta chapka !' }], [1.3, 1, { tombe: 1, bulle: 'Ça glisse !' }]]),
    g('russie', [{ d: 'russe2', pose: 'saute', v: 0, hop: 1 }, { d: 'russe', dx: 26, pose: 'saute', v: 0, hop: 1 }], [[.5, 0, { bulle: 'Il fait -25 !' }], [1.4, 1, { bulle: 'On danse pour se réchauffer !' }]]),
    g('londres', [{ d: 'garde_royal', pose: 'neutre', v: 0 }, { d: 'touriste', dx: 26, pose: 'salut', v: 0, hop: 1 }], [[.5, 1, { bulle: 'Il bouge jamais ?' }], [1.5, 1, { bulle: 'Hé ho !' }], [2.2, 0, { bulle: '...' }]]),
    g('londres', [{ d: 'comedien_lion', pose: 'danse', v: 0 }, { d: 'comedienne_girafe', dx: 28, pose: 'marche', v: 0 }, { d: 'comedien_oiseau', dx: 54, pose: 'danse', v: 0 }], [[.5, 0, { bulle: 'Le spectacle est à 19 h !' }], [1.4, 1, { bulle: 'Je ne vois rien d\'ici' }], [2.1, 2, { bulle: 'Ma crinière, il pleut !' }]]),
    g('londres', [{ d: 'londonien', pose: 'marche', v: 26 }, { d: 'comedien_lion', dx: -40, pose: 'course', v: 90 }], [[.5, 1, { bulle: 'Je suis en retard !' }], [1.1, 0, { pose: 'panique', v: 100, bulle: 'UN LION !' }]]),
    g('canada', [{ d: 'montrealais', pose: 'marche', v: 20 }, { d: 'montrealaise', dx: 30, pose: 'salut', v: 0 }], [[.5, 1, { bulle: 'Allô !' }], [1.4, 0, { bulle: 'Il fait frette, hein ?' }]]),
    g('canada', [{ d: 'montrealaise', pose: 'filme', v: 0 }, { d: 'montrealais', dx: 30, pose: 'saute', v: 0, hop: 1 }], [[.5, 1, { bulle: 'Une poutine pour le drone !' }]]),
    g('nuweiba', [{ d: 'campeur', pose: 'marche', v: 16 }, { d: 'bedouin', dx: 34, pose: 'salut', v: 0 }], [[.5, 1, { bulle: 'Un thé bédouin ?' }], [1.4, 0, { bulle: 'Avec plaisir !' }]]),
    // ------- Sous l'eau
    g('sousmarin', [{ s: 'crabe', y: 0, v: 0, hop: 2 }, { s: 'crabe', dx: 14, y: 0, v: 0, hop: 2 }, { s: 'crabe', dx: 28, y: 0, v: 0, hop: 2 }], [[.5, 1, { bulle: 'Blub blub, on danse' }]]),
    g('sousmarin', [{ d: 'plongeur', pose: 'plonge', v: 46, y: 62 }, { s: 'poisson_jaune', dx: 34, y: 70, v: 46 }], [[.5, 1, { bulle: 'Blub ?' }], [1.3, 0, { bulle: 'Plus d\'air !' }]]),
    g('sousmarin', [{ d: 'plongeur', pose: 'plonge', v: 38, y: 98 }, { d: 'plongeur', dx: -30, pose: 'plonge', v: 38, y: 86 }], [[.6, 0, { bulle: 'Ok ?' }], [1.6, 1, { bulle: 'Ok !' }]]),
  ];
  /* Les grandes scenes de foule : g = qui, n = combien, esp = espacement, v = vitesse (vers la droite),
     banderole / pancartes = ce qu'ils brandissent, bulles = ce qu'ils crient,
     reaction au passage du drone : jette (lance i), fans (lui courent apres), fuit, ola (saute en vague), applaudit */
  const F = (o) => o;
  G.FOULES = {
    metro: [
      F({ nom: 'heure de pointe', g: ['usager', 'usagere', 'costard', 'manif1', 'usager', 'controleur'], n: 18, esp: 15, v: 120, pose: 'course', bulles: ['Pardon !', 'Je suis en retard !', 'On pousse pas !', 'Mon train !'], reaction: 'fuit' }),
      F({ nom: 'greve', g: ['controleur', 'usager', 'usagere', 'manif2'], n: 12, esp: 15, v: 14, pose: 'marche', banderole: 'GRÈVE DES TICKETS', pancartes: ['GRÈVE', 'NON !'], bulles: ['Solidaires !', 'Y a plus de métro'], reaction: 'jette', i: 'tomate' }),
    ],
    paris: [
      F({ nom: 'rollers', g: ['roller1', 'roller2', 'roller3', 'roller4', 'roller1', 'roller3'], n: 18, esp: 17, v: 135, pose: 'roller', bulles: ['Roule, ma poule !', 'Pas de freins !', 'Attention les pigeons !', 'À gauche ! À gauche !', 'Vendredi soir, Paris !'], reaction: 'fans' }),
      F({ nom: 'manif', g: ['manif1', 'manif2', 'manif3', 'manif4', 'manif5'], n: 22, esp: 13, v: 26, pose: 'marche', banderole: 'NON AU SURVOL DE PARIS', pancartes: ['NON !', 'À BAS', 'STOP', 'DRONE ?!', 'GRÈVE'], bulles: ['Dé-ga-ge !', 'Drone, dégage !', 'On lâche rien !', 'So-so-solidaires !'], reaction: 'jette', i: 'tomate' }),
      F({ nom: 'visite', g: ['guide', 'touriste', 'touriste2', 'touriste3', 'touriste'], n: 14, esp: 16, v: 22, pose: 'filme', bulles: ['Et à droite, un drone', 'C\'est compris dans le billet ?', 'Cheese !'], reaction: 'fans' }),
      F({ nom: 'tournage', g: ['cadreur', 'perchman', 'assistant', 'danseuse', 'danseuse', 'cadreur'], n: 10, esp: 20, v: 0, pose: 'perche', bulles: ['Coupez !', 'On la refait !', 'Qui a loué ce drone ?'], reaction: 'applaudit' }),
    ],
    deauville: [
      F({ nom: 'paparazzi', g: ['star', 'paparazzi', 'paparazzi', 'paparazzi', 'smoking', 'paparazzi'], n: 16, esp: 14, v: 40, pose: 'filme', bulles: ['Par ici !', 'Un sourire !', 'C\'est qui, lui ?', 'Exclu !'], reaction: 'fans' }),
      F({ nom: 'fans', g: ['touriste', 'manif5', 'touriste3', 'enfant1', 'plagiste'], n: 18, esp: 13, v: 70, pose: 'course', pancartes: ['AUTOGRAPHE', 'JE T\'AIME'], bulles: ['Un autographe !', 'Regarde-moi !', 'Tu es trop beau !'], reaction: 'fans' }),
    ],
    normandie: [
      F({ nom: 'rando', g: ['guide', 'rando1', 'rando2', 'rando3', 'rando4'], n: 16, esp: 17, v: 34, pose: 'marche', bulles: ['On y est presque ?', 'Mes ampoules !', 'Quelle vue !', 'Attendez-moi !'], reaction: 'applaudit' }),
      F({ nom: 'mariage', g: ['mariee', 'marie', 'invite1', 'invite2', 'invite1', 'invite2'], n: 14, esp: 16, v: 18, pose: 'applaudit', banderole: 'VIVE LES MARIÉS', bulles: ['Vive les mariés !', 'Tu filmes bien ça ?', 'Le bouquet !'], reaction: 'jette', i: 'bouquet', gentil: true }),
      F({ nom: 'pelerins', g: ['moine1', 'pelerin', 'moine1', 'touriste', 'pelerin'], n: 14, esp: 18, v: 20, pose: 'marche', bulles: ['Amen', 'C\'est encore loin ?', 'Vite, la marée !'], reaction: 'fuit' }),
      F({ nom: 'ecole', g: ['guide', 'enfant1', 'enfant2', 'enfant1', 'enfant2'], n: 14, esp: 13, v: 44, pose: 'course', bulles: ['Un drooone !', 'Maîtresse !', 'Moi aussi !'], reaction: 'fans' }),
    ],
    camargue: [F({ nom: 'gardians', g: ['paysan', 'touriste2', 'paysan'], n: 10, esp: 18, v: 40, pose: 'course', bulles: ['Oh peuchère !', 'Fada !'], reaction: 'fuit' })],
    alpes: [
      F({ nom: 'rando', g: ['guide', 'rando1', 'rando2', 'rando3', 'rando4', 'randonneur'], n: 18, esp: 17, v: 30, pose: 'marche', bulles: ['Encore 8 heures !', 'Youlou !', 'J\'ai plus d\'eau', 'Quelle vue !'], reaction: 'applaudit' }),
      F({ nom: 'ski', g: ['skieur', 'skieur', 'enduro'], n: 10, esp: 20, v: 60, pose: 'saute', bulles: ['Y a plus de neige !', 'Je veux mon forfait !'], reaction: 'fuit' }),
    ],
    afriquesud: [
      F({ nom: 'chorale', g: ['capetonien', 'capetonienne', 'capetonien', 'capetonienne'], n: 16, esp: 14, v: 0, pose: 'saute', bulles: ['Sawubona !', 'Viens danser !', 'Yebo !'], reaction: 'ola' }),
      F({ nom: 'safari', g: ['ranger', 'touriste', 'touriste2', 'touriste3'], n: 10, esp: 18, v: 26, pose: 'filme', bulles: ['Un drone sauvage !', 'Ne bougez pas', 'Il charge !'], reaction: 'fuit' }),
    ],
    australie: [F({ nom: 'surf', g: ['surfeur', 'plongeur', 'surfeur'], n: 10, esp: 20, v: 50, pose: 'course', bulles: ['G\'day !', 'No worries !'], reaction: 'jette', i: 'chaussure', gentil: true })],
    egypte: [
      F({ nom: 'salade', g: ['salade', 'loukoum', 'salade', 'loukoum', 'cairote'], n: 16, esp: 15, v: 60, pose: 'course', bulles: ['Attendez-nous !', 'C\'est par où ?', 'Tourne pas ma tête !', 'On a une scène ?'], reaction: 'fans' }),
      F({ nom: 'souk', g: ['cairote', 'berbere', 'cairote', 'touriste'], n: 12, esp: 18, v: 0, pose: 'salut', bulles: ['Bonjour !', 'Il filme quoi ?', 'Regarde en haut !', 'On passe à la télé ?'], reaction: 'fans' }),
    ],
    hawaii: [
      F({ nom: 'luau', g: ['hula', 'hula', 'surfeur', 'hawaienne'], n: 18, esp: 13, v: 0, pose: 'saute', bulles: ['Aloha !', 'Mahalo !', 'Viens danser !'], reaction: 'ola' }),
      F({ nom: 'surfeurs', g: ['surfeur', 'surfeur', 'touriste2'], n: 10, esp: 18, v: 70, pose: 'course', bulles: ['Belle vague !', 'Cowabunga !'], reaction: 'fuit' }),
    ],
    irlande: [F({ nom: 'parade', g: ['piper', 'irlandais', 'piper', 'irlandais', 'rando1'], n: 16, esp: 15, v: 28, pose: 'marche', banderole: 'SLÁINTE !', bulles: ['Encore une pinte ?', 'Sláinte !', 'Il pleut pas !'], reaction: 'applaudit' })],
    mediterranee: [],
    caledonie: [F({ nom: 'danse', g: ['caledonien', 'caledonienne', 'caledonien'], n: 14, esp: 15, v: 0, pose: 'saute', bulles: ['Bonjour !', 'Tata !'], reaction: 'ola' })],
    reunion: [
      F({ nom: 'pandathlon', g: ['marathon1', 'marathon2', 'marathon3', 'coureur'], n: 24, esp: 12, v: 95, pose: 'course', banderole: 'PANDATHLON', bulles: ['Courage !', 'Encore 40 km !', 'Le panda est devant !', 'Oté !'], reaction: 'applaudit' }),
      F({ nom: 'marche', g: ['reunionnais', 'rando3', 'rando1', 'reunionnais'], n: 14, esp: 17, v: 30, pose: 'marche', bulles: ['Oté !', 'Un carry ?', 'Ça monte !'], reaction: 'applaudit' }),
    ],
    puy: [
      F({ nom: 'legion', g: ['legionnaire'], n: 20, esp: 13, v: 40, pose: 'marche', bulles: ['Une, deux !', 'Ave, César !', 'Halte au drone !', 'Formez la tortue !'], reaction: 'jette', i: 'chaussure' }),
      F({ nom: 'gladiateurs', g: ['gladiateur', 'legionnaire', 'gladiateur'], n: 12, esp: 16, v: 70, pose: 'panique', bulles: ['PAS LES OIES !', 'Fuyez !'], reaction: 'fuit' }),
    ],
    stade: [
      F({ nom: 'supporters', g: ['supporter', 'supporter', 'manif1', 'supporter'], n: 26, esp: 11, v: 0, pose: 'saute', bulles: ['Allez les bleus !', 'Olé !', 'Hors-jeu !'], pancartes: ['ALLEZ !', '3-0'], reaction: 'ola' }),
      F({ nom: 'equipe', g: ['joueur'], n: 11, esp: 20, v: 80, pose: 'course', bulles: ['Passe !', 'Carton rouge, le drone !'], reaction: 'fans' }),
    ],
    tunisie: [
      F({ nom: 'souk', g: ['berbere', 'enfant', 'touriste3', 'berbere'], n: 14, esp: 17, v: 20, pose: 'salut', bulles: ['Marhaba !', 'Bonjour bonjour !', 'Ça vole bien !', 'Regarde en haut !'], reaction: 'fans' }),
      F({ nom: 'equipe', g: ['equipe', 'equipe', 'cadreur', 'perchman', 'assistant'], n: 12, esp: 18, v: 28, pose: 'marche', bulles: ['Il fait 50 !', 'Coupez !', 'Qui a les piles ?'], reaction: 'applaudit' }),
    ],
    tatooine: [F({ nom: 'file', g: ['jawa', 'jawa', 'moine'], n: 14, esp: 14, v: 60, pose: 'course', bulles: ['Bazar ! Bazar !', 'Attendez !'], reaction: 'fuit' })],
    sousmarin: [F({ nom: 'palanquee', g: ['plongeur'], n: 8, esp: 34, v: 40, pose: 'plonge', bulles: ['Blub !', 'Plus d\'air !', 'Ok ?', 'Par ici !'], flotte: 1 })],
  };

  /* Une foule propre a un decor */
  Object.assign(G.FOULES, {
    madagascar: [F({ nom: 'jongleurs', g: ['jongleur', 'jongleuse', 'jongleur', 'malgache', 'enfant'], n: 12, esp: 18, v: 0, pose: 'jongle', bulles: ['Manao ahoana !', 'Regarde !', 'Trois balles !', 'Mora mora !'], reaction: 'applaudit' })],
    niger: [F({ nom: 'caravane', g: ['bedouin', 'bedouine', 'bedouin', 'nigerien'], n: 12, esp: 18, v: 20, pose: 'marche', bulles: ['Fofo !', 'Le fleuve est loin ?', 'Doucement !'], reaction: 'applaudit' })],
    maroc: [F({ nom: 'souk', g: ['marocain', 'marocaine', 'enceinte', 'enceinte2', 'touriste3'], n: 14, esp: 17, v: 0, pose: 'salut', bulles: ['Marhaba !', 'Un tapis ?', 'C\'est pour bientôt !', 'Un thé ?'], reaction: 'fans' })],
    russie: [F({ nom: 'choeur', g: ['russe', 'russe2', 'babouchka', 'russe'], n: 14, esp: 15, v: 0, pose: 'saute', bulles: ['Privet !', 'Kalinka !', 'Il fait -20 !'], reaction: 'ola' })],
    londres: [
      F({ nom: 'comedie musicale', g: ['comedien_lion', 'comedienne_girafe', 'comedien_oiseau', 'comedien_lion', 'comedienne_girafe'], n: 14, esp: 18, v: 0, pose: 'danse', bulles: ['Le cercle de la vie !', 'Tous en scène !', 'Bravo !', 'Plus fort !'], reaction: 'ola' }),
      F({ nom: 'releve', g: ['garde_royal'], n: 10, esp: 16, v: 22, pose: 'marche', bulles: ['Left, right !', '...'], reaction: 'fuit' }),
    ],
    canada: [F({ nom: 'parade', g: ['montrealais', 'montrealaise', 'touriste', 'montrealais'], n: 16, esp: 15, v: 24, pose: 'marche', bulles: ['Allô !', 'C\'est le fun !', 'Tiguidou !'], reaction: 'applaudit' })],
  });

  G.FOULES_DECOR = {
    // l'ete dans les Alpes : des randonneurs, jamais de skieurs (Max, 02/11/2026)
    alpes_panda: [F({ nom: 'rando', g: ['guide', 'rando1', 'rando2', 'rando3', 'rando4', 'randonneur'], n: 16, esp: 17, v: 30, pose: 'marche', bulles: ['Encore 8 heures !', 'Youlou !', 'A boire !', 'Quelle vue !'], reaction: 'applaudit' })],
    alpes_panda2: [F({ nom: 'rando', g: ['guide', 'rando1', 'rando2', 'rando3', 'rando4', 'randonneur'], n: 16, esp: 17, v: 30, pose: 'marche', bulles: ['Youlou !', 'Quelle vue !', 'Le refuge est loin ?'], reaction: 'applaudit' })],
    vars: [F({ nom: 'rando', g: ['guide', 'rando1', 'rando2', 'randonneur', 'enduro'], n: 14, esp: 17, v: 30, pose: 'marche', bulles: ['Attention les motos !', 'Quelle vue !'], reaction: 'applaudit' })],
    melbourne: [F({ nom: 'apres le match', g: ['melbournien', 'melbournien', 'surfeur', 'touriste'], n: 14, esp: 16, v: 30, pose: 'marche', bulles: ['Un kebab, mate ?', 'Attrape !', 'G\'day !'], reaction: 'jette', i: 'kebab', gentil: true })],
    nuweiba: [F({ nom: 'camp', g: ['campeur', 'campeuse', 'bedouin', 'plongeur'], n: 12, esp: 18, v: 0, pose: 'salut', bulles: ['Marhaba !', 'Tu plonges ?', 'Le récif est là !'], reaction: 'fans' })],
    sjdm_plage: [F({ nom: 'public', g: ['plagiste', 'touriste', 'touriste2', 'enfant1', 'touriste3'], n: 14, esp: 16, v: 0, pose: 'applaudit', pancartes: ['BRAVO', '0 FAUTE'], bulles: ['Sans faute !', 'Quelle barre !', 'Allez, ma belle !', 'Il a touché !', 'Beau saut !'], reaction: 'applaudit' })],
    sgr_moisson: [F({ nom: 'manif bio', g: ['manif1', 'manif3', 'paysan', 'manif4', 'manif2', 'manif5'], n: 16, esp: 15, v: 24, pose: 'marche', banderole: 'ON VEUT PLUS DE BIO', pancartes: ['BIO !', 'SOS BLÉ', 'SANS PESTICIDES'], bulles: ['Plus de bio !', 'Merci le pétrole !', 'Du blé aux pesticides, ça !', 'Il fait 40 en juin !', 'Rendez-nous la pluie !'], reaction: 'applaudit' })],
  };

  // une saynete propre a un decor porte son id a la place de la region (le kebab de Melbourne)
  G.gagPour = (r, id) => {
    const def = id && G.SCENES[id];
    // un decor d'ete (ete: true) n'a pas de saynete de skieur
    const l = G.GAGS.filter(g => (g.r === r || (id && g.r === id)) && !(def && def.ete && g.acteurs.some(a => a.d === 'skieur')));
    return l.length ? G.pick(l) : null;
  };
})();
