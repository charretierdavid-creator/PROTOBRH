/* Module LM 2.0 — 15/11/2026 · démonstration sans serveur de la console (console.html?demo=1, S9) : données fictives en mémoire, mêmes règles que lm2-api.php · historique : VERSIONS.md */
/* ==============================================================
   console-demo.js — remplace lm2-api.php pour les ateliers (Caisses régionales, PU Distribution) :
     - 22 Caisses régionales du référentiel, annuaire fictif généré pour les CR en démonstration (1 expert BRH,
       1 expert BRH PRO par département, 2 conseillers pro par agence) ; Touraine Poitou en PILOTE avec un annuaire
       d'illustration ; les 4 autres CR pilotes « à saisir » ;
     - leads fictifs de Val de France et de Touraine Poitou, dont au moins un hors délai quel que soit le jour ;
     - points de vue : expert BRH, conseiller pro (accès ponctuel), administrateur.
   Aucun e-mail n'est envoyé, rien n'est enregistré : tout est perdu au rechargement de la page.
   ============================================================== */
(function (racine) {
  'use strict';
  var L = racine.LM2, REF = racine.LM2_REFERENTIEL || [];
  var J = function (x) { return JSON.parse(JSON.stringify(x)); };
  var NOW = function () { return new Date(); };
  var iso = function (d) { d = new Date(d); var p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':00'; };
  var ilya = function (h) { return iso(Date.now() - h * 3600e3); };
  var ouvresAvant = function (n) { var d = new Date(); d.setHours(10, 0, 0, 0); var k = 0; while (k < n) { d.setDate(d.getDate() - 1); if (d.getDay() % 6 !== 0) k++; } return iso(d); };
  var nom = L.nomComplet;

  /* ---------------- référentiel et annuaire ---------------- */
  var DB = { cr: [], agences: [], its: [], dossiers: [], demandes: [], journal: [], emails: [], transferts: [], acces: [], crs_: [], adminJ: [], meta: { envoi: { reel: false, interlocuteurs: true, filiales: true, dirigeants: false }, modeles: {}, parametres: { seuil_pro: 20, jours: { devis: 1, ultra: 2, qualifie: 5, rappel: 2 }, acces_jours: 14, transfert_alerte_jours: 2 } } };
  var seq = { it: 1, ag: 1, d: 1, t: 1, j: 1, e: 1 };
  var P = ['Céline', 'Julien', 'Camille', 'Nadia', 'Pierre', 'Émilie', 'Hugo', 'Marion', 'Bastien', 'Sophie', 'Karim', 'Lucie', 'Antoine', 'Claire', 'Yanis', 'Inès', 'Thomas', 'Sarah', 'Léa', 'Mathieu', 'Chloé', 'Nicolas', 'Manon', 'Romain'];
  var N = ['Martin', 'Roux', 'Besnard', 'Haddad', 'Lambert', 'Caron', 'Petit', 'Leroy', 'Royer', 'Garnier', 'Benali', 'Fabre', 'Mercier', 'Dumas', 'Ferreira', 'Vidal', 'Guillot', 'Meunier', 'Morel', 'Fontaine', 'Chevalier', 'Robin', 'Masson', 'Blanc'];
  function ascii(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase(); }
  function nomAgence(v) { return (/^[AEIOUYÉÈÊÂÎÔ]/.test(v) ? 'Agence d’' : 'Agence de ') + v; }
  function ajoutIt(o) { var i = Object.assign({ id: seq.it++, telephone: '', departements: '', agence_id: null, ville_agence: '', perimetre: '', filiale: null, principal: 0, donnees: 'fictif', actif: 1, masque: 0, mot_de_passe: null, maj_le: iso(NOW()) }, o); DB.its.push(i); return i; }
  REF.forEach(function (c) {
    DB.cr.push({ code: c.code, nom: c.nom, departements: c.departements.slice(), mode: c.mode, envoi: 0 });
    c.agences.forEach(function (a) { DB.agences.push({ id: seq.ag++, cr_code: c.code, nom: nomAgence(a.ville), ville: a.ville, cp: a.cp, departement: a.departement }); });
  });
  function annuaireFictif(cr) {
    var c = DB.cr.filter(function (x) { return x.code === cr; })[0], k = 0, n = 0, h = 0;
    for (var i = 0; i < cr.length; i++) h = (h * 31 + cr.charCodeAt(i)) >>> 0;
    var gen = function (role, ag, deps, ville, per, pr) { var p = P[(h + n * 7) % P.length], no = N[(h + n * 11) % N.length]; n++;
      return ajoutIt({ cr_code: cr, role: role, prenom: p, nom: no, email: ascii(p[0]) + '.' + ascii(no) + n + '@' + cr + '.demo-brh.invalid', telephone: '01 00 00 ' + ('0' + (n % 100)).slice(-2) + ' ' + ('0' + ((h + n) % 100)).slice(-2),
        departements: deps, agence_id: ag, ville_agence: ville, perimetre: per, principal: pr, donnees: 'fictif' }); };
    var ags = DB.agences.filter(function (a) { return a.cr_code === cr; });
    gen('expert_brh', null, c.departements.join(','), ags[0] ? ags[0].ville : '', '', 1);
    c.departements.forEach(function (d, i) { var a = ags.filter(function (x) { return x.departement === d; })[0]; gen('expert_brh_pro', null, d, a ? a.ville : '', d, i === 0 ? 1 : 0); });
    ags.forEach(function (a) { gen('conseiller_pro', a.id, a.departement, a.nom, a.ville, 0); gen('conseiller_pro', a.id, a.departement, a.nom, a.ville, 0); k++; });
  }
  DB.cr.forEach(function (c) { if (c.mode === 'demo') annuaireFictif(c.code); });
  /* Touraine Poitou : annuaire d'illustration (sigle Réel, noms et adresses d'exemple) */
  (function () {
    var ag = function (v) { return DB.agences.filter(function (a) { return a.cr_code === 'touraine-poitou' && a.ville === v; })[0]; };
    var r = function (o) { return ajoutIt(Object.assign({ cr_code: 'touraine-poitou', donnees: 'reel' }, o)); };
    r({ role: 'expert_brh', prenom: 'Sophie', nom: 'Martin', email: 's.martin@exemple-ca-tp.fr', telephone: '02 47 00 00 10', departements: '37,86', ville_agence: 'Tours', principal: 1 });
    r({ role: 'expert_brh_pro', prenom: 'Karim', nom: 'Benali', email: 'k.benali@exemple-ca-tp.fr', telephone: '02 47 00 00 20', departements: '37', perimetre: '37', principal: 1 });
    r({ role: 'expert_brh_pro', prenom: 'Claire', nom: 'Dumas', email: 'c.dumas@exemple-ca-tp.fr', telephone: '05 49 00 00 30', departements: '86', perimetre: '86' });
    [['Tours', 'Julie', 'Blanc'], ['Tours', 'Hugo', 'Petit'], ['Amboise', 'Marion', 'Leroy'], ['Chinon', 'Antoine', 'Royer'], ['Poitiers', 'Lucie', 'Fabre'], ['Poitiers', 'Thomas', 'Morel'], ['Châtellerault', 'Inès', 'Vidal']].forEach(function (x) {
      var a = ag(x[0]); r({ role: 'conseiller_pro', prenom: x[1], nom: x[2], email: ascii(x[1][0]) + '.' + ascii(x[2]) + '@exemple-ca-tp.fr', telephone: '02 47 00 01 ' + (10 + DB.its.length % 80), departements: a.departement, agence_id: a.id, ville_agence: a.nom });
    });
  })();
  Object.keys(L.FILIALES).forEach(function (f) { ajoutIt({ cr_code: null, role: 'filiale', prenom: 'Boîte', nom: L.FILIALES[f].lib, email: f + '-leads@filiales.demo-brh.invalid', filiale: f, donnees: 'fictif' }); });
  function it(id) { return DB.its.filter(function (i) { return i.id === id; })[0] || null; }
  function cr(code) { return DB.cr.filter(function (c) { return c.code === code; })[0] || null; }
  function expertsCr(code) { return DB.its.filter(function (i) { return i.cr_code === code && i.role === 'expert_brh' && i.actif && !i.masque; }).sort(function (a, b) { return b.principal - a.principal; }); }
  function crDuDep(dep) { return DB.cr.filter(function (c) { return c.departements.indexOf(dep) >= 0; })[0] || null; }

  /* ---------------- leads fictifs ---------------- */
  var BRH_TYPES = { devis: 'Devis en ligne', devis_en_cours: 'Devis commencé (e-mail laissé)', diagnostic_estimation: 'Estimation demandée par e-mail', diagnostic_contact: 'Contact — diagnostic RH', label_contact: 'Contact — Label BRH', audit_mutuelle_prevoyance: 'Audit mutuelle', rappel_expert: 'Rappel expert (devis)' };
  function journal(d, qui, a, txt) { DB.journal.push({ id: seq.j++, dossier_id: d.id, cree_le: iso(NOW()), acteur: qui, action: a, detail: txt }); }
  function mail(d, modele, cat, dest, objet) {
    var env = DB.meta.envoi, motif = 'Démonstration : aucun envoi';
    if (dest && dest.donnees === 'fictif') motif = 'Interlocuteur fictif';
    DB.emails.push({ id: seq.e++, dossier_id: d ? d.id : null, cree_le: iso(NOW()), modele: modele, categorie: cat, destinataire: dest ? dest.email : (d && d.email), destinataire_nom: dest ? nom(dest) : (d ? [d.prenom, d.nom].join(' ') : ''), objet: objet, statut: dest && dest.donnees === 'fictif' ? 'non_envoye' : 'journal', motif: env.reel ? motif : 'Envoi réel désactivé (démonstration)', envoye_a: dest ? dest.email : '' });
  }
  function creer(o) {
    var dep = o.departement || (o.code_postal ? o.code_postal.slice(0, 2) : ''), c = o.cr === null ? null : crDuDep(dep), ex = c ? expertsCr(c.code)[0] : null;
    var d = Object.assign({ id: seq.d, reference: 'BRH-26-' + ('00000' + (120 + seq.d)).slice(-6), version: 'S', email: null, prenom: '', nom: '', telephone: '', fonction: '', raison_sociale: '', siret: '', code_postal: '', ville: '', departement: dep,
      effectif: null, secteur: '', idcc: '', type: 'qualifie', rappel: 0, statut: 'nouveau', issue: null, cr_code: c ? c.code : null, expert_id: ex ? ex.id : null, assigne_id: null, transfert_id: null, client_statut: 'inconnu', client_declare: null,
      client_agence: null, client_conseiller: null, client_conseiller_email: null, client_verifie_par: null, client_verifie_le: null, pris_le: null, relances: 0, consent_relance: 1, montant: null, solutions: [], parcours: {}, argumentaire: null,
      rdv_le: null, rdv_note: null, universels_le: null }, o);
    seq.d++; delete d.cr; delete d.demandes_;
    d.cree_le = d.cree_le || ilya(2); d.type_le = d.cree_le; d.statut_le = d.statut_le || d.cree_le; d.maj_le = d.cree_le;
    d.echeance = d.echeance || iso(L.plusOuvres(new Date(d.cree_le.replace(' ', 'T')), L.joursDelai(d.type, d.rappel)));
    DB.dossiers.push(d);
    (o.demandes_ || [[d.type === 'devis' ? 'devis' : (d.type === 'ultra' ? 'devis_en_cours' : (d.rappel ? 'diagnostic_contact' : 'diagnostic_estimation')), d.cree_le]]).forEach(function (x) {
      var t = { devis: 'devis', devis_en_cours: 'ultra' }[x[0]] || 'qualifie'; DB.demandes.push({ dossier_id: d.id, type: t, type_demande: x[0], lib: BRH_TYPES[x[0]] || x[0], cree_le: x[1] });
      DB.journal.push({ id: seq.j++, dossier_id: d.id, cree_le: x[1], acteur: 'Portail (automatique)', action: 'demande', detail: (BRH_TYPES[x[0]] || x[0]) + ' (site ' + d.version + ')' });
    });
    DB.emails.push({ id: seq.e++, dossier_id: d.id, cree_le: d.cree_le, modele: 'E1', categorie: 'dirigeant', destinataire: d.email, destinataire_nom: [d.prenom, d.nom].join(' '), objet: 'Votre demande ' + d.reference + ' est bien reçue', statut: 'journal', motif: 'Démonstration : aucun envoi' });
    if (ex && d.type !== 'qualifie') DB.emails.push({ id: seq.e++, dossier_id: d.id, cree_le: d.cree_le, modele: 'E2', categorie: 'interlocuteur', destinataire: ex.email, destinataire_nom: nom(ex), objet: 'Nouvelle ' + L.TYPES[d.type].lib.toLowerCase() + ' : ' + d.raison_sociale + ' (' + d.ville + ')', statut: 'journal', motif: 'Interlocuteur fictif' });
    return d;
  }
  var pr = function (a, b, c, e) { return { protection: a, partageValeur: b, pouvoirAchat: c, retraite: e }; };
  var arg = { source: 'devis', le: ilya(3), contenu: { titre: 'Boulangerie de 9 salariés, convention de la boulangerie artisanale', synthese: ['Priorité : protéger les salariés (4/4) et partager la valeur (3/4)', 'Santé : convention avec régime obligatoire, vérifier le contrat actuel'], questions: ['Le contrat santé actuel respecte-t-il le panier de la convention ?', 'Quelle part employeur souhaitez-vous ?'], pieces: ['Contrat santé en cours', 'Liste des salariés par catégorie'], angle: 'Mise en conformité santé puis épargne salariale' } };
  function seed() {
    var vf = 'Val de France';
    creer({ raison_sociale: 'Boulangerie Lefort', prenom: 'Martine', nom: 'Lefort', email: 'martine.lefort@exemple.invalid', telephone: '06 12 34 56 78', fonction: 'Gérante', siret: '81234567800012', code_postal: '28000', ville: 'Chartres', effectif: 9, secteur: 'Boulangerie-pâtisserie',
      idcc: '0843 Boulangerie-pâtisserie artisanale', type: 'devis', client_statut: 'declare', client_declare: 'oui', solutions: ['sante', 'epargne'], montant: 6840, cree_le: ilya(3), version: 'B', argumentaire: arg,
      parcours: { priorites: pr(4, 3, 1, 1), offres_preconisees: ['sante', 'epargne'], offres_consultees: ['Prime de partage de la valeur', 'Audit mutuelle'], pages: ['Accueil', 'Diagnostic RH', 'Devis en ligne'], reference_devis: 'DV-26-4412', salaries: 9,
        configuration: [{ solution: 'sante', libelle: 'Santé collective', formule: 'Formule Confort', cout: 4920, hypotheses: ['part employeur 50 %'] }, { solution: 'epargne', libelle: 'Épargne salariale', formule: 'Formule Découverte', cout: 1920, hypotheses: [] }],
        sante_ccn: { statut: 'Régime santé obligatoire', exigences: 'panier conventionnel, 50 % employeur minimum' }, gain_fiscal: 3200 },
      demandes_: [['diagnostic_estimation', ilya(30)], ['devis_en_cours', ilya(8)], ['devis', ilya(3)]] });
    creer({ raison_sociale: 'Transports Beauce Logistique', prenom: 'Olivier', nom: 'Marchand', email: 'o.marchand@exemple.invalid', telephone: '02 37 00 11 22', fonction: 'Directeur', siret: '52233445500021', code_postal: '28200', ville: 'Châteaudun', effectif: 48, secteur: 'Transport routier',
      idcc: '0016 Transports routiers', type: 'devis', client_statut: 'non_declare', client_declare: 'non', solutions: ['sante', 'retraite', 'avantages'], montant: 21400, cree_le: ouvresAvant(2), version: 'A',
      parcours: { priorites: pr(3, 2, 4, 3), offres_preconisees: ['avantages', 'retraite'], offres_consultees: ['Titres-restaurant', 'Retraite collective'], configuration: [{ solution: 'avantages', libelle: 'Avantages salariés', formule: 'Titres-restaurant', cout: 9600, hypotheses: [] }] } });
    var t1 = creer({ raison_sociale: 'Atelier Menuiserie Roy', prenom: 'Bruno', nom: 'Roy', email: 'bruno.roy@exemple.invalid', telephone: '06 22 33 44 55', siret: '79988776600014', code_postal: '28100', ville: 'Dreux', effectif: 6, secteur: 'Menuiserie', type: 'ultra',
      client_statut: 'verifie', client_declare: 'oui', client_agence: 'Agence de Dreux', client_verifie_par: 'Expert BRH', client_verifie_le: ilya(20), solutions: ['epargne'], montant: 1450, cree_le: ilya(26), version: 'S',
      parcours: { priorites: pr(2, 4, 2, 1), offres_preconisees: ['epargne'], offres_consultees: ['Prime de partage de la valeur'], etape: 'Recevez votre devis' } });
    creer({ raison_sociale: 'Cabinet Infirmier du Perche', prenom: 'Aurélie', nom: 'Gautier', email: 'a.gautier@exemple.invalid', code_postal: '28400', ville: 'Nogent-le-Rotrou', effectif: 4, secteur: 'Santé', type: 'qualifie', cree_le: ouvresAvant(8), version: 'C',
      parcours: { priorites: pr(4, 1, 2, 1), offres_preconisees: ['sante'], offres_consultees: ['Santé et prévoyance'], gain_fiscal: 900 } });
    creer({ raison_sociale: 'Garage des Vallées', prenom: 'Samir', nom: 'Haddou', email: 'samir.haddou@exemple.invalid', telephone: '06 45 45 45 45', code_postal: '41000', ville: 'Blois', effectif: 14, secteur: 'Réparation automobile', type: 'qualifie', rappel: 1, cree_le: ilya(5), version: 'S', client_statut: 'declare', client_declare: 'oui',
      parcours: { priorites: pr(3, 3, 2, 2), offres_preconisees: ['sante', 'epargne'], gain_fiscal: 2100 }, demandes_: [['diagnostic_contact', ilya(5)]] });
    creer({ raison_sociale: 'SCI Les Tilleuls', prenom: 'Jean', nom: 'Dupuis', email: 'j.dupuis@exemple.invalid', code_postal: '41100', ville: 'Vendôme', effectif: 2, secteur: 'Immobilier', type: 'qualifie', cree_le: ilya(30), version: 'B', parcours: { priorites: pr(1, 3, 1, 4), offres_preconisees: ['epargne', 'retraite'] } });
    var p1 = creer({ raison_sociale: 'Domaine du Cher', prenom: 'Hélène', nom: 'Vasseur', email: 'h.vasseur@exemple.invalid', telephone: '06 77 88 99 00', code_postal: '41200', ville: 'Romorantin', effectif: 23, secteur: 'Viticulture', type: 'ultra', statut: 'pris_en_charge', cree_le: ilya(80), version: 'A', solutions: ['sante', 'retraite'], montant: 9800,
      client_statut: 'prospect', parcours: { priorites: pr(4, 2, 1, 3), offres_preconisees: ['sante', 'retraite'] } });
    p1.assigne_id = p1.expert_id; p1.pris_le = ilya(70); p1.rdv_le = iso(L.plusOuvres(new Date(), 2)); p1.rdv_note = 'En agence de Romorantin';
    creer({ raison_sociale: 'Imprimerie Chartraine', prenom: 'Marc', nom: 'Olivier', email: 'marc.olivier@exemple.invalid', code_postal: '28000', ville: 'Chartres', effectif: 31, type: 'devis', statut: 'proposition', cree_le: ilya(200), version: 'S', solutions: ['epargne', 'retraite'], montant: 12500,
      client_statut: 'verifie', client_agence: 'Agence de Chartres', parcours: { priorites: pr(2, 4, 2, 3), offres_preconisees: ['epargne', 'retraite'] } }).assigne_id = expertsCr('val-de-france')[0].id;
    var c1 = creer({ raison_sociale: 'Fleurs & Saisons', prenom: 'Nathalie', nom: 'Perrin', email: 'n.perrin@exemple.invalid', code_postal: '28100', ville: 'Dreux', effectif: 3, type: 'qualifie', statut: 'cloture', issue: 'sans_suite', cree_le: ilya(400), version: 'C' });
    c1.statut_le = ilya(300);
    /* transfert en attente vers un conseiller pro de l'agence de Dreux (point de vue « conseiller pro ») */
    var agD = DB.agences.filter(function (a) { return a.cr_code === 'val-de-france' && a.ville === 'Dreux'; })[0];
    var cp = DB.its.filter(function (i) { return i.agence_id === agD.id; })[0];
    transfertDemo(t1, cp, 'Client de l’agence de Dreux : merci de le rappeler pour finaliser son épargne salariale. Il a parlé d’un rendez-vous en fin de mois.', ilya(30));
    var t2 = creer({ raison_sociale: 'Pressing Éclat', prenom: 'Lina', nom: 'Moreau', email: 'l.moreau@exemple.invalid', telephone: '06 98 76 54 32', code_postal: '28100', ville: 'Dreux', effectif: 5, type: 'qualifie', rappel: 1, cree_le: ilya(52), version: 'S', parcours: { priorites: pr(3, 2, 3, 1), offres_preconisees: ['sante'] } });
    transfertDemo(t2, cp, 'Petite entreprise : à rappeler en priorité.', ilya(40)); var tr2 = DB.transferts[DB.transferts.length - 1]; tr2.pris_le = ilya(20); t2.statut = 'pris_en_charge'; t2.pris_le = ilya(20);
    /* Touraine Poitou (CR pilote, annuaire d'illustration) */
    creer({ raison_sociale: 'Charcuterie Tourangelle', prenom: 'Paul', nom: 'Renard', email: 'p.renard@exemple.invalid', telephone: '06 11 22 33 44', code_postal: '37000', ville: 'Tours', effectif: 12, type: 'devis', cree_le: ilya(4), version: 'C', solutions: ['sante'], montant: 5100, idcc: '1505 Commerce de détail alimentaire', client_statut: 'declare', client_declare: 'oui', argumentaire: arg,
      parcours: { priorites: pr(4, 1, 2, 1), offres_preconisees: ['sante'], sante_ccn: { statut: 'Régime santé obligatoire', exigences: 'panier conventionnel' } } });
    creer({ raison_sociale: 'Bureau d’études Vienne', prenom: 'Sarah', nom: 'Klein', email: 's.klein@exemple.invalid', code_postal: '86100', ville: 'Châtellerault', effectif: 27, type: 'ultra', cree_le: ilya(30), version: 'A', solutions: ['epargne', 'retraite'], montant: 7300, parcours: { priorites: pr(2, 4, 1, 3), offres_preconisees: ['epargne', 'retraite'] } });
    creer({ raison_sociale: 'Camping du Val d’Amboise', prenom: 'Éric', nom: 'Lemaire', email: 'e.lemaire@exemple.invalid', code_postal: '37400', ville: 'Amboise', effectif: 8, type: 'qualifie', cree_le: ilya(6), version: 'B', parcours: { priorites: pr(2, 2, 4, 1), offres_preconisees: ['avantages'] } });
    /* sans Caisse régionale identifiable : file « à attribuer » */
    creer({ raison_sociale: 'Start-up Nomade', prenom: 'Léo', nom: 'Bernard', email: 'leo.bernard@exemple.invalid', effectif: 7, type: 'qualifie', cr: null, departement: '', cree_le: ilya(10), version: 'C', parcours: { priorites: pr(1, 4, 3, 1) } });
  }
  function transfertDemo(d, vers, msg, le) {
    var t = { id: seq.t++, dossier_id: d.id, de_id: d.expert_id, de_nom: nom(it(d.expert_id)), vers_id: vers.id, motif: null, message: msg, informer: 1, cree_le: le, pris_le: null, rendu_le: null, actif: 1 };
    DB.transferts.push(t); DB.acces.push({ transfert_id: t.id, interlocuteur_id: vers.id, dossier_id: d.id, cree_le: le, expire_le: iso(new Date(le.replace(' ', 'T')).getTime() + 14 * 864e5), revoque_le: null, ouvert_le: null });
    d.statut = 'transfere'; d.transfert_id = t.id; d.assigne_id = vers.id; d.echeance = iso(L.plusOuvres(new Date(le.replace(' ', 'T')), 2));
    DB.journal.push({ id: seq.j++, dossier_id: d.id, cree_le: le, acteur: t.de_nom, action: 'transfert', detail: 'Transféré à ' + nom(vers) + ' (Conseiller pro, ' + vers.ville_agence + ') ; lien d’accès ponctuel valable 14 jours' });
    DB.emails.push({ id: seq.e++, dossier_id: d.id, cree_le: le, modele: 'E4', categorie: 'interlocuteur', destinataire: vers.email, destinataire_nom: nom(vers), objet: 'Lead transféré : ' + d.raison_sociale + ' (' + d.ville + ', ' + d.effectif + ' salariés) – ' + L.TYPES[d.type].lib.toLowerCase(), statut: 'non_envoye', motif: 'Interlocuteur fictif' });
  }
  seed();

  /* ---------------- point de vue et session ---------------- */
  var PV = 'expert', VUE = null;
  function session() {
    if (PV === 'admin' && !VUE) return { role: 'admin', moi: null, cr: null };
    if (PV === 'acces') { var c = DB.transferts[0] ? it(DB.transferts[0].vers_id) : null; return { role: 'acces', moi: c, cr: cr(c.cr_code) }; }
    var code = VUE || (PV === 'expert_pilote' ? 'touraine-poitou' : 'val-de-france');
    return { role: 'expert', moi: expertsCr(code)[0] || null, cr: cr(code), vue: VUE };
  }
  function carte(i) { return i ? { id: i.id, role: i.role, prenom: i.prenom, nom: i.nom, email: i.email, telephone: i.telephone, departements: i.departements, agence_id: i.agence_id, ville_agence: i.ville_agence, perimetre: i.perimetre, filiale: i.filiale, principal: i.principal, donnees: i.donnees, actif: i.actif, cr_code: i.cr_code } : null; }
  function charge(i) { return DB.dossiers.filter(function (d) { return d.assigne_id === i.id && d.statut !== 'cloture'; }).length; }
  function accesValide(d, iid) { return DB.acces.filter(function (a) { var t = DB.transferts.filter(function (x) { return x.id === a.transfert_id; })[0];
    return a.dossier_id === d.id && a.interlocuteur_id === iid && a.transfert_id === d.transfert_id && t && t.actif && !a.revoque_le && new Date(a.expire_le.replace(' ', 'T')) > NOW(); })[0]; }
  function resume(d) {
    var t = d.transfert_id ? DB.transferts.filter(function (x) { return x.id === d.transfert_id; })[0] : null;
    return { id: d.id, reference: d.reference, cree_le: d.cree_le, maj_le: d.maj_le, version: d.version, raison_sociale: d.raison_sociale, prenom: d.prenom, nom: d.nom, ville: d.ville, departement: d.departement, code_postal: d.code_postal, effectif: d.effectif,
      secteur: d.secteur, type: d.type, rappel: d.rappel, statut: d.statut, issue: d.issue, client_statut: d.client_statut, solutions: d.solutions.slice(), echeance: d.echeance, rdv_le: d.rdv_le, cr_code: d.cr_code, montant: d.montant,
      expert_id: d.expert_id, assigne_id: d.assigne_id, assigne: carte(it(d.assigne_id)), transfert: t ? { id: t.id, cree_le: t.cree_le, pris_le: t.pris_le, motif: t.motif } : null, idcc: d.idcc, client_conseiller_email: d.client_conseiller_email };
  }
  function detail(d, S) {
    var r = resume(d);
    ['email', 'telephone', 'fonction', 'siret', 'client_declare', 'client_agence', 'client_conseiller', 'client_conseiller_email', 'client_verifie_par', 'client_verifie_le', 'rdv_note', 'pris_le', 'statut_le', 'type_le', 'relances', 'universels_le', 'consent_relance'].forEach(function (k) { r[k] = d[k]; });
    r.parcours = J(d.parcours); r.argumentaire = d.argumentaire ? J(d.argumentaire) : null; r.filiales_permises = L.filialesPermises(d);
    var c = cr(d.cr_code); r.cr = c ? { code: c.code, nom: c.nom, mode: c.mode } : null; r.expert = carte(it(d.expert_id));
    r.demandes = DB.demandes.filter(function (x) { return x.dossier_id === d.id; }).map(J);
    r.journal = DB.journal.filter(function (x) { return x.dossier_id === d.id; }).sort(function (x, y) { return x.cree_le < y.cree_le ? 1 : (x.cree_le > y.cree_le ? -1 : y.id - x.id); })
      .map(function (x) { return { cree_le: x.cree_le, acteur: x.acteur, action: x.action, detail: x.detail }; });
    r.emails = DB.emails.filter(function (x) { return x.dossier_id === d.id; }).slice().reverse().map(J);
    r.comptes_rendus = [];
    r.transferts = DB.transferts.filter(function (t) { return t.dossier_id === d.id && (S.role !== 'acces' || t.vers_id === S.moi.id); }).slice().reverse().map(function (t) {
      var a = DB.acces.filter(function (x) { return x.transfert_id === t.id; })[0] || {};
      return { id: t.id, vers: carte(it(t.vers_id)), de_nom: t.de_nom, motif: t.motif, message: t.message, informer: t.informer, cree_le: t.cree_le, pris_le: t.pris_le, rendu_le: t.rendu_le, actif: t.actif, acces: { expire_le: a.expire_le, revoque_le: a.revoque_le, ouvert_le: a.ouvert_le } };
    });
    return r;
  }
  function annuaire(code) {
    var c = cr(code);
    return { cr: c ? { code: c.code, nom: c.nom, mode: c.mode, departements: c.departements.slice() } : null,
      interlocuteurs: DB.its.filter(function (i) { return i.cr_code === code && !i.masque && ['expert_brh', 'expert_brh_pro', 'conseiller_pro'].indexOf(i.role) >= 0; }).map(function (i) { return Object.assign(carte(i), { charge: charge(i) }); }),
      agences: DB.agences.filter(function (a) { return a.cr_code === code; }).map(J),
      filiales: DB.its.filter(function (i) { return i.role === 'filiale' && i.actif; }).map(function (i) { return Object.assign(carte(i), { lib: L.FILIALES[i.filiale].lib, outil: L.FILIALES[i.filiale].outil }); }) };
  }
  function clore(t) { if (!t) return; t.actif = 0; t.rendu_le = t.rendu_le || iso(NOW()); DB.acces.forEach(function (a) { if (a.transfert_id === t.id && !a.revoque_le) a.revoque_le = iso(NOW()); }); }
  function tr(d) { return DB.transferts.filter(function (t) { return t.id === d.transfert_id; })[0]; }
  function E(m) { return Promise.resolve({ ok: false, error: m }); }
  function OK(x) { return Promise.resolve(Object.assign({ ok: true }, x || {})); }

  /* ---------------- même contrat que lm2-api.php ---------------- */
  function appel(a, b) {
    var S = session(), me = S.moi, acteur = S.role === 'admin' ? 'Administrateur' : nom(me) + (VUE ? ' (démonstration)' : '');
    var charger = function () { var d = DB.dossiers.filter(function (x) { return x.id === +b.id; })[0]; if (!d) return null;
      if (S.role === 'admin') return d; if (S.role === 'acces') return accesValide(d, me.id) ? d : null; return d.cr_code === S.cr.code ? d : null; };
    var lead = function (d) { d.maj_le = iso(NOW()); return OK({ lead: detail(d, S) }); };
    var prendre = function (d) {
      if (S.role === 'acces') { var t = tr(d); if (t) t.pris_le = t.pris_le || iso(NOW()); d.statut = 'pris_en_charge'; d.statut_le = iso(NOW()); d.pris_le = d.pris_le || iso(NOW()); journal(d, acteur, 'pris_en_charge', 'Pris en charge par ' + nom(me) + ' (' + L.ROLES[me.role] + ')'); if (!(t && t.informer)) mail(d, 'E3', 'dirigeant', null, 'Votre demande ' + d.reference + ' est prise en charge'); return; }
      var rep = !!d.transfert_id; if (rep) { clore(tr(d)); d.transfert_id = null; }
      var qui = S.role === 'admin' ? it(d.expert_id) : me, premier = !d.pris_le;
      d.statut = 'pris_en_charge'; d.statut_le = iso(NOW()); d.pris_le = d.pris_le || iso(NOW()); d.assigne_id = qui ? qui.id : null;
      journal(d, acteur, 'pris_en_charge', rep ? 'Lead repris par l’expert BRH (transfert clos, accès révoqué)' : 'Lead pris en charge');
      if (premier) mail(d, 'E3', 'dirigeant', null, 'Votre demande ' + d.reference + ' est prise en charge');
    };
    var d;
    switch (a) {
      case 'session': return OK({ connecte: true, csrf: 'demo', role: S.role, version: '2.0', moi: carte(me), cr: S.cr ? { code: S.cr.code, nom: S.cr.nom, mode: S.cr.mode } : null, vue: S.vue || null, ia: false, parametres: J(DB.meta.parametres), envoi_reel: DB.meta.envoi.reel,
        crs: S.role === 'admin' ? DB.cr.map(function (c) { return { code: c.code, nom: c.nom, mode: c.mode }; }) : null });
      case 'connexion': case 'deconnexion': return OK();
      case 'leads': {
        var ls = S.role === 'admin' ? DB.dossiers.filter(function (x) { return b.cr === '_a_attribuer' ? !x.cr_code : (!b.cr || x.cr_code === b.cr); })
          : (S.role === 'acces' ? DB.dossiers.filter(function (x) { return accesValide(x, me.id); }) : DB.dossiers.filter(function (x) { return x.cr_code === S.cr.code; }));
        var acc = null; if (S.role === 'acces') { var t0 = DB.transferts.filter(function (t) { return t.vers_id === me.id && t.actif; })[0]; acc = { expire_le: t0 ? DB.acces.filter(function (x) { return x.transfert_id === t0.id; })[0].expire_le : null, de_nom: t0 ? t0.de_nom : '' }; }
        return OK({ leads: ls.map(resume), acces: acc });
      }
      case 'lead': d = charger(); if (!d) return E('Lead introuvable ou non transmis.'); if (S.role === 'acces') { var ac = accesValide(d, me.id); if (ac && !ac.ouvert_le) { ac.ouvert_le = iso(NOW()); journal(d, nom(me), 'acces', 'Accès ponctuel ouvert (démonstration)'); } } return lead(d);
      case 'annuaire': if (S.role === 'acces') return E('Annuaire réservé à l’expert BRH.'); return cr(b.cr || (S.cr && S.cr.code)) ? OK(annuaire(b.cr || S.cr.code)) : E('Caisse régionale inconnue.');
      case 'traiter': d = charger(); if (!d) return E('Lead introuvable.'); if (d.statut === 'cloture') return E('Ce lead est clôturé.'); prendre(d); return lead(d);
      case 'proposition': d = charger(); if (!d || d.statut !== 'pris_en_charge') return E('Prenez d’abord le lead en charge.'); d.statut = 'proposition'; d.statut_le = iso(NOW()); journal(d, acteur, 'proposition', 'Proposition ou devis remis au dirigeant'); return lead(d);
      case 'transferer': {
        if (S.role === 'acces') return E('Action réservée à l’expert BRH.');
        d = charger(); if (!d) return E('Lead introuvable.'); if (d.statut === 'cloture') return E('Ce lead est clôturé.');
        var v;
        if (b.hors_annuaire) { var h = b.hors_annuaire, m = String(h.email || '').toLowerCase();
          var dom = m.split('@')[1] || '';
          if (!(['credit-agricole.fr', 'credit-agricole.com', 'ca-tourainepoitou.fr', 'ca-pyrenees-gascogne.fr', 'ca-centreloire.fr', 'ca-franchecomte.fr', 'ca-paris.fr'].some(function (x) { return dom === x || dom.slice(-x.length - 1) === '.' + x; }) || /^exemple-ca-[a-z0-9-]+\.fr$/.test(dom))) return E('Adresse professionnelle du Crédit Agricole attendue (par exemple prenom.nom@ca-…fr).');
          if (!h.prenom || !h.nom) return E('Prénom et nom du destinataire requis.');
          v = DB.its.filter(function (i) { return i.email === m; })[0] || ajoutIt({ cr_code: d.cr_code, role: 'hors_annuaire', prenom: h.prenom, nom: h.nom, email: m, ville_agence: h.agence || '', donnees: 'reel' });
        } else v = it(+b.vers_id);
        if (!v) return E('Destinataire inconnu.');
        if (v.role === 'filiale') { if (L.filialesPermises(d).indexOf(v.filiale) < 0) return E('Filiale réservée aux demandes de devis, selon les offres choisies (RG-22)'); if (!String(b.motif || '').trim()) return E('Motif obligatoire pour un transfert à une filiale'); }
        else if (v.role !== 'hors_annuaire' && v.cr_code !== d.cr_code) return E('Destinataire hors de la Caisse régionale du lead');
        if (!v.actif || v.masque) return E('Destinataire inactif');
        DB.transferts.filter(function (t) { return t.dossier_id === d.id && t.actif; }).forEach(clore);
        var de = S.role === 'admin' ? it(d.expert_id) : me;
        var t = { id: seq.t++, dossier_id: d.id, de_id: de ? de.id : null, de_nom: de ? nom(de) : acteur, vers_id: v.id, motif: b.motif || null, message: b.message || null, informer: b.informer ? 1 : 0, cree_le: iso(NOW()), pris_le: null, rendu_le: null, actif: 1 };
        DB.transferts.push(t); DB.acces.push({ transfert_id: t.id, interlocuteur_id: v.id, dossier_id: d.id, cree_le: t.cree_le, expire_le: iso(Date.now() + DB.meta.parametres.acces_jours * 864e5), revoque_le: null, ouvert_le: null });
        d.statut = 'transfere'; d.statut_le = iso(NOW()); d.transfert_id = t.id; d.assigne_id = v.id; d.echeance = iso(L.plusOuvres(new Date(), DB.meta.parametres.transfert_alerte_jours));
        journal(d, acteur, 'transfert', 'Transféré à ' + nom(v) + ' (' + (v.role === 'filiale' ? L.FILIALES[v.filiale].lib : L.ROLES[v.role]) + (v.ville_agence ? ', ' + v.ville_agence : '') + ')' + (b.motif ? ' — motif : ' + b.motif : '') + ' ; lien d’accès ponctuel valable ' + DB.meta.parametres.acces_jours + ' jours');
        mail(d, 'E4', v.role === 'filiale' ? 'filiale' : 'interlocuteur', v, 'Lead transféré : ' + d.raison_sociale + ' (' + d.ville + ', ' + (d.effectif || '?') + ' salariés) – ' + L.TYPES[d.type].lib.toLowerCase());
        if (b.informer && v.role !== 'filiale') mail(d, 'E5', 'dirigeant', null, 'Votre demande ' + d.reference + ' : votre interlocuteur');
        return OK({ email: 'journal', lien: 'https://cockpitbrh.monsitedetest.com/console.html?acces=' + '0'.repeat(48) + '#lead=' + d.id + ' (lien de démonstration)', lead: detail(d, S) });
      }
      case 'acces_prolonger': case 'acces_revoquer': {
        d = charger(); var t2 = d && DB.transferts.filter(function (x) { return x.id === +b.transfert_id && x.dossier_id === d.id; })[0]; if (!t2) return E('Transfert inconnu.');
        DB.acces.forEach(function (x) { if (x.transfert_id === t2.id && !x.revoque_le) { if (a === 'acces_prolonger') x.expire_le = iso(Date.now() + DB.meta.parametres.acces_jours * 864e5); else x.revoque_le = iso(NOW()); } });
        journal(d, acteur, 'acces', 'Accès ponctuel de ' + nom(it(t2.vers_id)) + (a === 'acces_prolonger' ? ' prolongé de ' + DB.meta.parametres.acces_jours + ' jours' : ' révoqué'));
        if (a === 'acces_revoquer' && t2.actif && d.transfert_id === t2.id && d.statut !== 'cloture') { clore(t2); d.statut = 'nouveau'; d.transfert_id = null; d.assigne_id = null; d.echeance = iso(L.plusOuvres(new Date(), 1)); journal(d, acteur, 'rendu', 'Lead rendu à l’expert BRH : accès révoqué par l’expert'); }
        return lead(d);
      }
      case 'rendre': if (S.role !== 'acces') return E('Action réservée au destinataire du transfert.'); d = charger(); if (!d) return E('Lead introuvable.');
        clore(tr(d)); d.statut = 'nouveau'; d.transfert_id = null; d.assigne_id = null; d.echeance = iso(L.plusOuvres(new Date(), 1)); journal(d, acteur, 'rendu', 'Lead rendu à l’expert BRH' + (b.raison ? ' : ' + b.raison : '')); return OK();
      case 'cloturer': d = charger(); if (!d) return E('Lead introuvable.'); if (!L.ISSUES[b.issue]) return E('Choisissez l’issue du lead (obligatoire).');
        if (d.transfert_id && S.role !== 'acces') clore(tr(d)); d.statut = 'cloture'; d.statut_le = iso(NOW()); d.issue = b.issue; journal(d, acteur, 'cloture', 'Lead clôturé : ' + L.ISSUES[b.issue] + (b.note ? ' — ' + b.note : '')); return lead(d);
      case 'rdv': { d = charger(); var dt = new Date(b.date); if (!d || isNaN(dt) || dt < Date.now() - 3600e3) return E('Date de rendez-vous invalide.');
        d.rdv_le = iso(dt); d.rdv_note = b.note || null; journal(d, acteur, 'rdv', 'Rendez-vous planifié le ' + L.dateFr(dt) + (b.note ? ' (' + b.note + ')' : ''));
        if (d.statut === 'nouveau' || (d.statut === 'transfere' && S.role === 'acces')) prendre(d); mail(d, 'E8', 'dirigeant', null, 'Votre rendez-vous Banque des RH le ' + L.dateFr(dt)); return lead(d); }
      case 'note': d = charger(); if (!d) return E('Lead introuvable.'); if (!String(b.texte || '').trim()) return E('Note vide.'); journal(d, acteur, 'note', b.texte); return lead(d);
      case 'telephone': d = charger(); if (!d) return E('Lead introuvable.'); d.telephone = b.telephone || null; journal(d, acteur, 'coordonnees', 'Téléphone du dirigeant modifié par l’expert'); return lead(d);
      case 'client': d = charger(); if (!d || ['verifie', 'prospect'].indexOf(b.statut) < 0) return E('Statut client invalide.');
        d.client_statut = b.statut; d.client_agence = b.statut === 'verifie' ? b.agence || null : null; d.client_conseiller = b.statut === 'verifie' ? b.conseiller || null : null; d.client_conseiller_email = b.statut === 'verifie' ? (b.email || '').toLowerCase() || null : null;
        d.client_verifie_par = acteur; d.client_verifie_le = iso(NOW()); journal(d, acteur, 'client', 'Statut client : ' + L.CLIENT[b.statut].lib + (b.agence ? ' (' + b.agence + ')' : '') + ' — vérifié dans la base clients de la CR'); return lead(d);
      case 'compte_rendu': {
        d = charger(); if (!d) return E('Lead introuvable.'); if (['joint', 'messagerie', 'injoignable'].indexOf(b.resultat) < 0) return E('Résultat de l’appel attendu.');
        var lib = { joint: 'Joint', messagerie: 'Messagerie', injoignable: 'Injoignable' }[b.resultat], pl = { rdv: 'Rendez-vous', devis: 'Devis ou proposition', relance: 'Relance', cloture: 'Clôture' }[b.prochaine];
        journal(d, acteur, 'appel', 'Compte rendu d’appel : ' + lib + (pl ? ' ; prochaine étape : ' + pl : '') + (b.note ? ' — ' + b.note : ''));
        if (b.client_statut === 'verifie' || b.client_statut === 'prospect') { d.client_statut = b.client_statut; d.client_verifie_par = acteur; d.client_verifie_le = iso(NOW()); }
        if (d.statut !== 'cloture') { if (b.resultat === 'joint' && (d.statut === 'nouveau' || (d.statut === 'transfere' && S.role === 'acces'))) prendre(d);
          if (b.prochaine === 'devis' && d.statut === 'pris_en_charge') { d.statut = 'proposition'; journal(d, acteur, 'proposition', 'Proposition ou devis à remettre (compte rendu d’appel)'); } }
        return lead(d);
      }
      case 'script': case 'emails_ia': return OK({ repli: true });
      case 'email_note': d = charger(); if (!d) return E('Lead introuvable.'); journal(d, acteur, 'email_perso', 'E-mail personnalisé envoyé depuis la messagerie' + (b.objet ? ' : « ' + b.objet + ' »' : '')); return lead(d);
      case 'export': { var rows = [['Référence', 'Reçu le', 'Site', 'Type de lead', 'Statut', 'Raison sociale', 'Ville', 'Département', 'Effectif', 'Solutions', 'Estimation annuelle', 'Échéance']];
        DB.dossiers.filter(function (x) { return S.role === 'admin' ? (!b.cr || x.cr_code === b.cr) : x.cr_code === S.cr.code; }).forEach(function (x) { rows.push([x.reference, x.cree_le, x.version, L.TYPES[x.type].lib, L.STATUTS[x.statut], x.raison_sociale, x.ville, x.departement, x.effectif || '', x.solutions.map(function (s) { return L.SOLUTIONS[s]; }).join(', '), x.montant || '', x.echeance]); });
        return OK({ csv: rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\n') + '\n', nombre: rows.length - 1 }); }
      case 'admin_quitter_vue': VUE = null; PV = 'admin'; return OK();
    }
    if (S.role !== 'admin') return E('Action réservée à l’administrateur.');
    return admin(a, b, acteur);
  }

  /* ---------------- administration (démonstration) ---------------- */
  var MODELES = {
    E1: ['Accusé de réception', 'dirigeant', 'Votre demande {reference} est bien reçue', 'Bonjour {prenom},\n\nVotre demande est bien reçue (référence {reference}). Un expert Banque des Ressources Humaines de {caisse} l’étudie et revient vers vous.\n{resultat}\nVous pouvez suivre votre dossier à tout moment avec le lien ci-dessous.'],
    E2: ['Nouvelle demande', 'interlocuteur', 'Nouvelle {type} : {entreprise} ({ville})', 'Bonjour {destinataire},\n\nUne nouvelle demande arrive dans votre file : {type} de {entreprise}. À prendre en charge avant le {echeance}.'],
    E3: ['Prise en charge', 'dirigeant', 'Votre demande {reference} est prise en charge', 'Bonjour {prenom},\n\n{interlocuteur}, {role} de {caisse}, prend en charge votre demande et vous contacte prochainement.'],
    E4: ['Lead transféré', 'interlocuteur', 'Lead transféré : {entreprise} ({ville}, {effectif}) – {type}', 'Bonjour {destinataire},\n\n{expert} ({caisse}) vous transmet ce lead. Merci de le prendre en charge avant le {echeance}.'],
    E5: ['Votre interlocuteur', 'dirigeant', 'Votre demande {reference} : votre interlocuteur', 'Bonjour {prenom},\n\nVotre demande est suivie par {interlocuteur}, {role}{agence}. Il vous contacte prochainement.'],
    E6: ['Relance', 'dirigeant', 'Votre diagnostic RH : et maintenant ?', 'Bonjour {prenom},\n\nVous avez fait votre diagnostic RH sur le portail Banque des Ressources Humaines.\n{resultat}\nUn expert peut vous accompagner : suivez votre dossier ou demandez à être rappelé avec le lien ci-dessous.'],
    E7: ['Alerte délai', 'interlocuteur', 'Lead en attente : {entreprise}', 'Bonjour {destinataire},\n\nCe lead n’est pas encore pris en charge : {raison}.'],
    E8: ['Rendez-vous', 'dirigeant', 'Votre rendez-vous Banque des RH le {date_rdv}', 'Bonjour {prenom},\n\nVotre rendez-vous avec {interlocuteur} ({caisse}) est prévu le {date_rdv}.{note}'],
    R: ['Récapitulatif quotidien', 'interlocuteur', 'Vos leads qualifiés du jour ({nombre})', 'Bonjour {destinataire},\n\nVoici les nouveaux leads qualifiés de {caisse} :\n{liste}'],
    A: ['Code d’accès', 'interlocuteur', 'Votre code d’accès au lead management', 'Bonjour {destinataire},\n\nVotre code d’accès à usage unique est {code}. Il est valable 10 minutes.'],
    T: ['E-mail de test', 'test', 'E-mail de test du lead management', 'Bonjour,\n\nCet e-mail de test confirme que l’envoi depuis {expediteur} fonctionne.']
  };
  var EX = { prenom: 'Claire', reference: 'BRH-26-000123', entreprise: 'Atelier Exemple', ville: 'Tours', effectif: '12 salariés', type: 'demande de devis', echeance: 'demain à 10h00', caisse: 'Crédit Agricole Touraine Poitou', destinataire: 'Julie', expert: 'Sophie Martin',
    interlocuteur: 'Julie Blanc', role: 'conseillère pro', agence: ', agence de Tours', raison: 'échéance dépassée', date_rdv: 'jeudi à 10h00', note: '', resultat: '\nVotre estimation : 4 200 € par an (estimation indicative et non contractuelle).\n', code: '123456', liste: '• Atelier Exemple (Tours, 12 salariés)', nombre: '1', expediteur: 'contact@monsitedetest.com' };
  function remplir(t) { return String(t).replace(/\{([a-z_]+)\}/g, function (m, k) { return EX[k] != null ? EX[k] : ''; }); }
  function modele(k) { var m = MODELES[k], o = DB.meta.modeles[k] || {}; return { code: k, lib: m[0], cat: m[1], objet: o.objet || m[2], texte: o.texte || m[3], modifie: !!(o.objet || o.texte) }; }
  function htmlMail(m, inter) {
    var e = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var p = remplir(m.texte).split(/\n{2,}/).map(function (b) { return '<p style="margin:0 0 12px;font:15px/1.5 Arial;color:#233029">' + e(b).replace(/\n/g, '<br>') + '</p>'; }).join('');
    var f = inter ? '<table width="100%" style="background:#F1F6F4;border:1px solid #C9D8D3;border-radius:8px;margin:6px 0 16px"><tr><td style="padding:14px 16px;font:14px/1.6 Arial;color:#233029"><b style="color:#344C4D">Entreprise</b> Tours (37) · 12 salariés · Artisanat<br><b style="color:#344C4D">Type de lead</b> Demande de devis · à prendre en charge avant demain 10h00<br><b style="color:#344C4D">Statut client</b> Client déclaré, à vérifier<br><b style="color:#344C4D">Solutions</b> Santé et prévoyance, Épargne salariale<br><b style="color:#344C4D">Estimation</b> 4 200 € / an (indicative et non contractuelle)<br><b style="color:#344C4D">Contact</b> Claire — coordonnées dans la plateforme</td></tr></table>'
      + '<a href="#" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:6px;font:bold 15px Arial;text-decoration:none;background:#004A4B;color:#fff">Ouvrir la fiche du lead</a><a href="#" style="display:inline-block;padding:11px 18px;border-radius:6px;font:bold 15px Arial;text-decoration:none;border:1px solid #C9D8D3;color:#004A4B">Voir le script d’appel</a>' : (m.cat === 'dirigeant' ? '<a href="#" style="display:inline-block;padding:11px 18px;border-radius:6px;font:bold 15px Arial;text-decoration:none;background:#004A4B;color:#fff">Suivre mon dossier</a>' : '');
    return '<!doctype html><html lang="fr"><body style="margin:0"><div style="max-width:600px;margin:0 auto;padding:18px"><div style="background:#065145;border-radius:6px;padding:14px 18px;font:bold 17px Arial;color:#fff">Banque des Ressources Humaines<span style="float:right;font:14px Arial;color:#c7dd8a">' + e(m.lib) + '</span></div><div style="padding:18px 4px">' + p + f +
      '<p style="font:12px/1.5 Arial;color:#707173;margin-top:14px">' + (m.cat === 'dirigeant' ? 'Message automatique de la Banque des Ressources Humaines du Crédit Agricole.' : 'Lien personnel valable 14 jours. E-mail interne Crédit Agricole : ne pas transférer.') + '</p></div></div></body></html>';
  }
  function validerIt(x, id) {
    var err = [], c = cr(x.cr_code || x.caisse_regionale), mail = String(x.email || x.email_pro || '').trim().toLowerCase(), role = String(x.role || '').trim();
    if (!c) err.push('Caisse régionale inconnue');
    if (['expert_brh', 'expert_brh_pro', 'conseiller_pro'].indexOf(role) < 0) err.push('Rôle attendu : expert_brh, expert_brh_pro ou conseiller_pro');
    if (!String(x.prenom || '').trim() || !String(x.nom || '').trim()) err.push('Prénom et nom obligatoires');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) err.push('E-mail professionnel invalide'); else if (DB.its.some(function (i) { return i.email === mail && i.id !== id; })) err.push('E-mail déjà présent dans l’annuaire (doublon refusé)');
    var tel = String(x.telephone || x.telephone_pro || '').trim(); if (tel && tel.replace(/\D/g, '').length !== 10) err.push('Téléphone : 10 chiffres attendus');
    var don = String(x.donnees || 'reel').toLowerCase(); if (['reel', 'fictif'].indexOf(don) < 0) err.push('Données : reel ou fictif');
    var deps = L.liste(x.departements).map(function (s) { return s.toUpperCase(); }), ag = null, va = String(x.ville_agence || '').trim();
    if (c) { if (!deps.length) err.push('Département obligatoire'); deps.forEach(function (dp) { if (c.departements.indexOf(dp) < 0) err.push('Département ' + dp + ' hors de la Caisse régionale (' + c.departements.join(', ') + ')'); });
      if (role === 'conseiller_pro') { if (!va) err.push('Agence de rattachement obligatoire pour un conseiller pro'); else ag = DB.agences.filter(function (a) { return a.cr_code === c.code && (L.norm(a.nom) === L.norm(va) || L.norm(a.ville) === L.norm(va)); })[0]; } }
    if (err.length) return { err: err };
    if (role === 'conseiller_pro' && !ag) { var v0 = va.replace(/^agence\s+(de\s+|d[’']\s*)/i, ''); ag = { id: seq.ag++, cr_code: c.code, nom: nomAgence(v0), ville: v0, cp: null, departement: deps[0] }; DB.agences.push(ag); }
    var actif = ['0', 'non', 'false'].indexOf(String(x.actif == null ? 'oui' : x.actif).toLowerCase()) < 0;
    return { v: { cr_code: c.code, role: role, prenom: String(x.prenom).trim(), nom: String(x.nom).trim(), email: mail, telephone: tel, departements: deps.join(','), agence_id: ag ? ag.id : null, ville_agence: ag ? ag.nom : va, perimetre: L.liste(x.perimetre).join(', '),
      donnees: don, principal: x.principal ? 1 : 0, actif: actif ? 1 : 0, masque: (c.mode === 'pilote' && don === 'fictif') || (c.mode === 'demo' && don === 'reel') ? 1 : 0 } };
  }
  function desactiver(i, acteur) { var n = 0; DB.dossiers.forEach(function (d) { if (d.assigne_id === i.id && d.statut !== 'cloture') { clore(tr(d)); d.statut = 'nouveau'; d.transfert_id = null; d.assigne_id = null; journal(d, acteur, 'rendu', 'Lead rendu à l’expert BRH : interlocuteur désactivé'); n++; } });
    DB.acces.forEach(function (a) { if (a.interlocuteur_id === i.id && !a.revoque_le) a.revoque_le = iso(NOW()); }); i.actif = 0; return n; }
  function ajJ(auteur, objet, avant, apres) { DB.adminJ.unshift({ cree_le: iso(NOW()), auteur: auteur, objet: objet, avant: avant == null ? null : JSON.stringify(avant), apres: apres == null ? null : JSON.stringify(apres) }); }
  function admin(a, b, acteur) {
    var c, i, r;
    switch (a) {
      case 'admin_cr': return OK({ crs: DB.cr.slice().sort(function (x, y) { return x.mode === y.mode ? x.nom.localeCompare(y.nom) : (x.mode === 'pilote' ? -1 : 1); }).map(function (x) {
        var I = DB.its.filter(function (i2) { return i2.cr_code === x.code; });
        return { code: x.code, nom: x.nom, mode: x.mode, envoi: x.envoi, departements: x.departements.slice(), reels: I.filter(function (i2) { return !i2.masque && i2.donnees === 'reel' && i2.role !== 'hors_annuaire'; }).length, fictifs: I.filter(function (i2) { return !i2.masque && i2.donnees === 'fictif'; }).length,
          masques: I.filter(function (i2) { return i2.masque; }).length, leads: DB.dossiers.filter(function (d) { return d.cr_code === x.code && d.statut !== 'cloture'; }).length }; }), a_attribuer: DB.dossiers.filter(function (d) { return !d.cr_code && d.statut !== 'cloture'; }).length });
      case 'admin_cr_mode': c = cr(b.cr); if (!c || ['pilote', 'demo'].indexOf(b.mode) < 0) return E('Paramètres invalides.'); ajJ(acteur, 'Mode de la Caisse régionale ' + c.nom, { mode: c.mode }, { mode: b.mode });
        c.mode = b.mode; if (b.mode === 'demo') c.envoi = 0; DB.its.forEach(function (x) { if (x.cr_code === c.code) x.masque = x.donnees === (b.mode === 'pilote' ? 'fictif' : 'reel') ? 1 : 0; });
        if (b.mode === 'demo' && !DB.its.some(function (x) { return x.cr_code === c.code && x.donnees === 'fictif'; })) annuaireFictif(c.code); return OK();
      case 'admin_cr_envoi': c = cr(b.cr); if (!c) return E('Caisse régionale inconnue.'); if (c.mode !== 'pilote' && b.envoi) return E('L’envoi réel n’est possible que pour une CR pilote (RG-62).'); ajJ(acteur, 'Envoi réel pour ' + c.nom, { envoi: c.envoi }, { envoi: b.envoi ? 1 : 0 }); c.envoi = b.envoi ? 1 : 0; return OK();
      case 'admin_interlocuteurs': {
        var I = b.cr === '_filiales' ? DB.its.filter(function (x) { return x.role === 'filiale'; }) : DB.its.filter(function (x) { return x.cr_code === b.cr; });
        var pros = I.filter(function (x) { return x.role === 'expert_brh_pro' && x.actif && !x.masque; }), al = [];
        for (var p = 0; p < pros.length; p++) for (var q = p + 1; q < pros.length; q++) { var pa = L.liste(pros[p].perimetre || pros[p].departements).map(L.norm), pb = L.liste(pros[q].perimetre || pros[q].departements).map(L.norm), cc = pa.filter(function (x) { return pb.indexOf(x) >= 0; });
          if (cc.length) al.push('Périmètres qui se recouvrent (' + cc.join(', ') + ') : ' + nom(pros[p]) + ' et ' + nom(pros[q])); }
        return OK({ interlocuteurs: I.map(function (x) { return Object.assign(carte(x), { masque: x.masque, charge: charge(x), compte: x.role === 'expert_brh' ? 1 : 0, maj_le: x.maj_le }); }), agences: b.cr === '_filiales' ? [] : DB.agences.filter(function (x) { return x.cr_code === b.cr; }).map(J), alertes: al });
      }
      case 'admin_interlocuteur': {
        i = b.id ? it(+b.id) : null;
        if (i && i.role === 'filiale') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email || '')) return E('E-mail ou sigle invalide.'); ajJ(acteur, 'Boîte filiale modifiée : ' + i.nom, carte(i), null); i.email = String(b.email).toLowerCase(); i.donnees = b.donnees; return OK({ id: i.id }); }
        r = validerIt(b, i ? i.id : 0); if (b.mot_de_passe && String(b.mot_de_passe).length < 10) (r.err = r.err || []).push('Mot de passe : 10 caractères au moins');
        if (r.err) return E(r.err.join(' ; '));
        var av = i ? carte(i) : null; if (i) { var wasActif = i.actif; Object.assign(i, r.v, { actif: i.actif, maj_le: iso(NOW()) }); if (!r.v.actif && wasActif) desactiver(i, acteur); else if (r.v.actif) i.actif = 1; } else i = ajoutIt(r.v);
        if (i.principal) DB.its.forEach(function (x) { if (x.cr_code === i.cr_code && x.role === i.role && x.id !== i.id) x.principal = 0; });
        ajJ(acteur, (av ? 'Interlocuteur modifié : ' : 'Interlocuteur ajouté : ') + nom(i) + ' (' + i.cr_code + ')', av, carte(i)); return OK({ id: i.id });
      }
      case 'admin_interlocuteur_actif': i = it(+b.id); if (!i) return E('Interlocuteur inconnu.');
        if (!b.actif) { var n = desactiver(i, acteur); ajJ(acteur, 'Interlocuteur désactivé : ' + nom(i) + ' (' + n + ' lead(s) rendu(s) à l’expert BRH)', { actif: 1 }, { actif: 0 }); return OK({ rendus: n }); }
        i.actif = 1; ajJ(acteur, 'Interlocuteur réactivé : ' + nom(i), { actif: 0 }, { actif: 1 }); return OK();
      case 'admin_import': {
        var lignes = String(b.csv || '').replace(/^﻿/, '').trim().split(/\r\n|\n|\r/); if (lignes.length < 2) return E('Fichier vide : une ligne d’en-tête et au moins une ligne attendues.');
        var sep = (lignes[0].split(';').length >= lignes[0].split(',').length) ? ';' : ',', tete = lignes[0].split(sep).map(function (h) { return h.replace(/\*/g, '').trim().toLowerCase(); });
        var manque = ['caisse_regionale', 'role', 'prenom', 'nom', 'email_pro', 'departements', 'donnees'].filter(function (k) { return tete.indexOf(k) < 0; });
        if (manque.length) return E('Colonnes obligatoires absentes : ' + manque.join(', ') + ' (modèle en annexe D).');
        var rap = [], vus = {}, ok = 0, aj = 0, agAvant = seq.ag;
        lignes.slice(1).forEach(function (l, k) { if (!l.trim()) return; var val = l.split(sep), x = {}; tete.forEach(function (h, j) { x[h] = (val[j] || '').replace(/^"|"$/g, '').trim(); });
          var rr = validerIt(x, 0), err = rr.err || [], m = x.email_pro.toLowerCase(); if (vus[m]) err.push('E-mail en double dans le fichier (ligne ' + vus[m] + ')'); vus[m] = k + 2;
          rap.push({ ligne: k + 2, ok: !err.length, erreurs: err, resume: x.prenom + ' ' + x.nom + ' · ' + x.role + ' · ' + x.caisse_regionale });
          if (!err.length) { ok++; if (!b.simuler) { ajoutIt(rr.v); aj++; } } });
        if (b.simuler) { DB.agences = DB.agences.filter(function (x) { return x.id < agAvant; }); seq.ag = agAvant; }
        if (aj) ajJ(acteur + ' (import CSV)', 'Import de ' + aj + ' interlocuteur(s)', null, null);
        return OK({ simulation: !!b.simuler, valides: ok, refuses: rap.length - ok, ajoutes: aj, rapport: rap });
      }
      case 'admin_export': { var rows = [['caisse_regionale', 'role', 'prenom', 'nom', 'email_pro', 'telephone_pro', 'departements', 'ville_agence', 'perimetre', 'donnees', 'actif']];
        DB.its.filter(function (x) { return x.cr_code === b.cr && ['expert_brh', 'expert_brh_pro', 'conseiller_pro'].indexOf(x.role) >= 0; }).forEach(function (x) { rows.push([x.cr_code, x.role, x.prenom, x.nom, x.email, x.telephone, x.departements, x.ville_agence, x.perimetre, x.donnees, x.actif ? 'oui' : 'non']); });
        return OK({ csv: rows.map(function (r2) { return r2.join(';'); }).join('\n') + '\n' }); }
      case 'admin_journal': return OK({ journal: DB.adminJ.slice(0, 200) });
      case 'admin_envoi': return OK({ reglages: J(DB.meta.envoi), expediteur: 'contact@monsitedetest.com', nom: 'Banque des RH – Lead management', smtp: { configure: false, hote: '', port: 465, securite: 'ssl', utilisateur: '' }, test_dirigeants: '',
        dns: { domaine: 'monsitedetest.com', verifiable: false }, crs: DB.cr.filter(function (x) { return x.mode === 'pilote'; }).map(function (x) { return { code: x.code, nom: x.nom, envoi: x.envoi, reels: DB.its.filter(function (i2) { return i2.cr_code === x.code && i2.donnees === 'reel' && i2.actif && !i2.masque; }).length }; }),
        journal: DB.emails.slice().reverse().slice(0, 60).map(function (e) { var d = DB.dossiers.filter(function (x) { return x.id === e.dossier_id; })[0]; return Object.assign(J(e), { reference: d ? d.reference : null, essais: 0 }); }) });
      case 'admin_envoi_enregistrer': { var av2 = J(DB.meta.envoi); ['reel', 'interlocuteurs', 'filiales', 'dirigeants'].forEach(function (k) { DB.meta.envoi[k] = !!b[k]; }); ajJ(acteur, 'Réglages de l’envoi des e-mails', av2, DB.meta.envoi); return OK({ reglages: J(DB.meta.envoi) }); }
      case 'admin_email_test': return E('Démonstration : aucun e-mail n’est envoyé. Sur le serveur, ce bouton envoie un vrai e-mail depuis contact@monsitedetest.com.');
      case 'admin_modeles': return OK({ modeles: Object.keys(MODELES).map(modele), champs: ['{prenom}', '{reference}', '{entreprise}', '{ville}', '{effectif}', '{type}', '{echeance}', '{caisse}', '{destinataire}', '{expert}', '{interlocuteur}', '{role}', '{raison}', '{date_rdv}'] });
      case 'admin_modele_enregistrer': if (!MODELES[b.code]) return E('Modèle inconnu.'); if (b.reinitialiser) delete DB.meta.modeles[b.code]; else { if (!String(b.objet || '').trim() || !String(b.texte || '').trim()) return E('Objet et texte obligatoires.'); DB.meta.modeles[b.code] = { objet: b.objet, texte: b.texte }; }
        ajJ(acteur, 'Modèle d’e-mail ' + b.code, null, DB.meta.modeles[b.code] || { reinitialise: true }); return OK();
      case 'admin_modele_apercu': { if (!MODELES[b.code]) return E('Modèle inconnu.'); var m = modele(b.code); if (b.objet) m.objet = b.objet; if (b.texte) m.texte = b.texte; return OK({ objet: remplir(m.objet), html: htmlMail(m, ['E2', 'E4', 'E7'].indexOf(b.code) >= 0) }); }
      case 'admin_parametres': return OK({ parametres: J(DB.meta.parametres) });
      case 'admin_parametres_enregistrer': { var bo = function (x, mi, ma, de) { x = parseInt(x, 10); return isNaN(x) ? de : Math.max(mi, Math.min(ma, x)); }, jj = b.jours || {};
        var pp = { seuil_pro: bo(b.seuil_pro, 1, 500, 20), acces_jours: bo(b.acces_jours, 1, 60, 14), transfert_alerte_jours: bo(b.transfert_alerte_jours, 1, 10, 2), jours: { devis: bo(jj.devis, 1, 20, 1), ultra: bo(jj.ultra, 1, 20, 2), qualifie: bo(jj.qualifie, 1, 20, 5), rappel: bo(jj.rappel, 1, 20, 2) } };
        ajJ(acteur, 'Délais et paramètres', DB.meta.parametres, pp); DB.meta.parametres = pp; return OK({ parametres: J(pp) }); }
      case 'admin_attribuer': { var d = DB.dossiers.filter(function (x) { return x.id === +b.id; })[0]; c = cr(b.cr); if (!d || !c) return E('Lead ou Caisse régionale inconnu.');
        d.cr_code = c.code; d.expert_id = (expertsCr(c.code)[0] || {}).id || null; journal(d, acteur, 'attribution', 'Lead attribué à la Caisse régionale ' + c.nom); return OK(); }
      case 'admin_voir_comme': c = cr(b.cr); if (!c || c.mode !== 'demo') return E('« Voir la console comme l’expert » est réservé aux CR en démonstration.'); if (!expertsCr(c.code).length) return E('Aucun expert BRH dans l’annuaire de cette CR.'); VUE = c.code; return OK();
      case 'admin_reprise': return OK({ integrees: 0 });
      case 'admin_taches': return OK({ fait: true, integres: 0, relances: 0, alertes: 0, recap: 0, renvois: 0 });
    }
    return E('Action inconnue.');
  }

  racine.LM2_DEMO = { appel: appel, perspective: function (p) { PV = p; VUE = null; }, perspectiveCourante: function () { return VUE ? 'admin' : PV; }, _db: DB, version: '2.0' };
})(typeof window !== 'undefined' ? window : globalThis);
