/* Module LM 3.0.1 — 17/11/2026 · données FICTIVES de la démonstration de la console simplifiée (aucune personne ni entreprise réelle) · historique : VERSIONS.md */
/* ==============================================================
   lm3-demo.js — jeu de données de démonstration, construit avec les règles de lm3-regles.js
   Les dates sont calculées à partir du moment de la première ouverture : les échéances dépassées ou à venir
   restent parlantes quel que soit le jour du test. Les adresses e-mail sont en exemple-ca-anjoumaine.fr (comptes) et en .invalid (dirigeants) : jamais délivrables.
   ============================================================== */
(function (racine) {
  'use strict';
  function genererDemo(L, maintenant) {
    var now = L.dt(maintenant || new Date());
    var D = '@exemple-ca-anjoumaine.fr';
    var etat = { version: 'LM3-demo-2', cree: L.isoComplet(now), seq: 200, leads: [], users: [
      { email: 'claire.dubois' + D, prenom: 'Claire', nom: 'Dubois', genre: 'f', role: 'expert_brh', agence: 'Angers, siège', deps: ['49'] },
      { email: 'thomas.bernard' + D, prenom: 'Thomas', nom: 'Bernard', genre: 'm', role: 'expert_brh', agence: 'Le Mans', deps: ['53', '72'] },
      { email: 'manon.morel' + D, prenom: 'Manon', nom: 'Morel', genre: 'f', role: 'expert_brh_pro', agence: 'Angers', deps: ['49'] },
      { email: 'julien.robin' + D, prenom: 'Julien', nom: 'Robin', genre: 'm', role: 'expert_brh_pro', agence: 'Le Mans', deps: ['53', '72'] },
      { email: 'hugo.petit' + D, prenom: 'Hugo', nom: 'Petit', genre: 'm', role: 'conseiller_pro', agence: 'Angers', deps: ['49'] },
      { email: 'lea.garnier' + D, prenom: 'Léa', nom: 'Garnier', genre: 'f', role: 'conseiller_pro', agence: 'Le Mans', deps: ['72'] },
      { email: 'sophie.lambert' + D, prenom: 'Sophie', nom: 'Lambert', genre: 'f', role: 'admin', agence: 'Direction des entreprises', deps: [] }
    ] };
    var U = function (p) { return p + D; };
    /* t(n, h, m) : n jours ouvrés avant maintenant, à h:m ; t(0) = il y a 90 minutes */
    function t(n, h, m) { if (!n) return new Date(now.getTime() - 90 * 60000); return L.moinsOuvres(now, n, h, m); }
    function apres(d, minutes) { return new Date(L.dt(d).getTime() + minutes * 60000); }
    function jour(n) { var d = n >= 0 ? L.plusOuvres(now, n) : L.moinsOuvres(now, -n); return L.iso(d); }
    function recu(visite, d) { var r = L.recevoir(etat, d, visite); return r.lead; }
    function c(nom, fonction, tel, mail) { return { nom: nom, fonction: fonction, tel: tel, email: mail }; }

    /* ---- Claire Dubois (49) : nouveaux ---- */
    recu(t(2, 10, 2), { cle: 'tll', site: 'S', type: 'devis', entreprise: 'Transports Loire Logistique', effectif: 62, ville: 'Saumur', dep: '49',
      solutions: ['sante', 'retraite', 'avantages'], convention: 'Convention 16, Transports routiers', contact: c('Olivier Marchand', 'dirigeant', '06 21 45 78 12', 'o.marchand@transports-loire.invalid') });
    recu(t(0), { cle: 'cha', site: 'B', type: 'rappel', entreprise: 'Charcuterie Angevine', effectif: 12, ville: 'Cholet', dep: '49',
      solutions: ['sante'], contact: c('Paul Renard', 'gérant', '06 33 18 72 40', 'p.renard@charcuterie-angevine.invalid'), client: 'declare' });
    var v047 = t(1, 19, 19);
    recu(v047, { cle: 'ate', site: 'C', type: 'devis', entreprise: 'Atelier Démo 0047', effectif: 20, ville: 'Angers', dep: '49', estimation: 37392,
      solutions: ['sante', 'avantages'], convention: 'Convention 1486, Bureaux d’études techniques (Syntec)', contact: c('Camille Martin', 'dirigeante', '06 47 82 19 33', 'c.martin@atelier-demo.invalid') });
    L.recevoir(etat, { cle: 'ate', site: 'C', type: 'rappel', solutions: [] }, apres(v047, 4));
    recu(t(1, 17, 42), { cle: 'bel', site: 'A', type: 'simulation', origine: 'label', entreprise: 'Bureau d’études Ligérien', effectif: 27, ville: 'Angers', dep: '49',
      solutions: ['epargne', 'retraite'], contact: c('Sarah Klein', 'directrice générale', '06 58 14 26 91', 's.klein@be-ligerien.invalid') });
    var gar = recu(t(3, 9, 30), { cle: 'gar', site: 'S', type: 'devis', entreprise: 'Garage Moreau', effectif: 85, ville: 'Trélazé', dep: '49',
      solutions: ['sante', 'epargne'], convention: 'Convention 1090, Services de l’automobile', contact: c('Luc Moreau', 'dirigeant', '06 12 90 33 54', 'l.moreau@garage-moreau.invalid') });
    L.transmettre(etat, gar.id, U('claire.dubois'), U('hugo.petit'), 'Dirigeant pressé, préfère un rappel en fin de journée.', 'pro', t(2, 11, 5));
    L.renvoyer(etat, gar.id, U('hugo.petit'), '85 salariés et deux établissements : relève de l’Entreprise.', t(1, 9, 40));

    /* ---- Claire : en cours ---- */
    var lab = recu(t(4, 14, 12), { cle: 'lab', site: 'C', type: 'devis', entreprise: 'Laboratoire Lefort', effectif: 34, ville: 'Angers', dep: '49', estimation: 24480,
      solutions: ['sante', 'epargne'], contact: c('Martine Lefort', 'présidente', '06 71 25 48 06', 'm.lefort@labo-lefort.invalid') });
    L.prendreEnCharge(etat, lab.id, U('claire.dubois'), 'entreprise', t(3, 10, 0));
    L.planifier(etat, lab.id, U('claire.dubois'), 'devis', jour(-1), 'Devis santé et épargne promis', t(3, 10, 20));
    var imp = recu(t(5, 11, 5), { cle: 'imp', site: 'S', type: 'devis', entreprise: 'Imprimerie Angevine', effectif: 31, ville: 'Beaucouzé', dep: '49', estimation: 22320,
      solutions: ['epargne', 'retraite'], contact: c('Marc Olivier', 'gérant', '06 84 30 12 57', 'm.olivier@imprimerie-angevine.invalid') });
    L.prendreEnCharge(etat, imp.id, U('claire.dubois'), 'entreprise', t(4, 9, 15));
    L.planifier(etat, imp.id, U('claire.dubois'), 'reponse', jour(3), 'Proposition remise, réponse attendue', t(2, 16, 0));
    var rab = recu(t(2, 15, 30), { cle: 'rab', site: 'A', type: 'simulation', origine: 'diagnostic', entreprise: 'Cabinet d’expertise Rabelais', effectif: 58, ville: 'Angers', dep: '49',
      solutions: ['epargne', 'avantages'], contact: c('Nicolas Faure', 'associé gérant', '06 19 63 74 28', 'n.faure@cabinet-rabelais.invalid') });
    L.prendreEnCharge(etat, rab.id, U('claire.dubois'), 'entreprise', t(1, 9, 5));
    L.planifier(etat, rab.id, U('claire.dubois'), 'rappeler', jour(1), '', t(1, 9, 10));

    /* ---- Claire : clôturés ---- */
    var hot = recu(t(9, 10, 0), { cle: 'hot', site: 'B', type: 'devis', entreprise: 'Hôtel du Château', effectif: 22, ville: 'Saumur', dep: '49',
      solutions: ['sante'], contact: c('Isabelle Royer', 'directrice', '06 25 77 41 09', 'i.royer@hotel-chateau.invalid') });
    L.prendreEnCharge(etat, hot.id, U('claire.dubois'), 'entreprise', t(8, 9, 30));
    L.cloturer(etat, hot.id, U('claire.dubois'), 'signe', 'Contrat santé signé en Caisse régionale', t(5, 17, 0));
    var pep = recu(t(8, 14, 0), { cle: 'pep', site: 'S', type: 'simulation', origine: 'diagnostic', entreprise: 'Pépinières Durand', effectif: 15, ville: 'Doué-en-Anjou', dep: '49',
      solutions: ['avantages'], contact: c('Hervé Durand', 'gérant', '06 92 14 85 36', 'h.durand@pepinieres-durand.invalid') });
    L.prendreEnCharge(etat, pep.id, U('claire.dubois'), 'entreprise', t(7, 10, 0));
    L.cloturer(etat, pep.id, U('claire.dubois'), 'sans_suite', 'Projet reporté à l’an prochain', t(6, 11, 0));

    /* ---- Claire : transmis à des collègues Pro ---- */
    var men = recu(t(2, 16, 20), { cle: 'men', site: 'B', type: 'simulation', origine: 'diagnostic', entreprise: 'Atelier Menuiserie Roy', effectif: 6, ville: 'Segré-en-Anjou Bleu', dep: '49',
      solutions: ['epargne'], contact: c('Bruno Roy', 'artisan', '06 40 55 21 87', 'b.roy@menuiserie-roy.invalid') });
    L.transmettre(etat, men.id, U('claire.dubois'), U('manon.morel'), 'Artisan seul avec 5 compagnons : à analyser côté Pro.', 'pro', t(1, 10, 30));
    var inf = recu(t(3, 8, 50), { cle: 'inf', site: 'C', type: 'devis', entreprise: 'Cabinet Infirmier Loire', effectif: 4, ville: 'Saumur', dep: '49',
      solutions: ['sante'], contact: c('Julie Faure', 'infirmière libérale', '06 30 47 92 15', 'j.faure@cabinet-infirmier.invalid') });
    L.transmettre(etat, inf.id, U('claire.dubois'), U('hugo.petit'), 'Profession libérale : devis à faire avec la dirigeante.', 'pro', t(2, 14, 0));
    L.prendreEnCharge(etat, inf.id, U('hugo.petit'), 'pro', t(1, 11, 0));
    L.planifier(etat, inf.id, U('hugo.petit'), 'rdv', jour(2), 'Rendez-vous en agence de Saumur', t(1, 11, 10));

    /* ---- Manon Morel (experte BRH Pro) : en cours ---- */
    var stu = recu(t(4, 13, 0), { cle: 'stu', site: 'A', type: 'simulation', origine: 'label', entreprise: 'Studio Graphique Nova', effectif: 3, ville: 'Angers', dep: '49',
      solutions: ['epargne', 'retraite'], contact: c('Inès Carpentier', 'fondatrice', '06 77 23 10 48', 'i.carpentier@studio-nova.invalid') });
    L.transmettre(etat, stu.id, U('claire.dubois'), U('manon.morel'), '', 'pro', t(3, 9, 0));
    L.prendreEnCharge(etat, stu.id, U('manon.morel'), 'pro', t(3, 15, 0));
    L.planifier(etat, stu.id, U('manon.morel'), 'rappeler', jour(2), '', t(3, 15, 5));

    /* ---- Thomas Bernard (53, 72) ---- */
    recu(t(0), { cle: 'fro', site: 'C', type: 'devis', entreprise: 'Fromagerie de la Mayenne', effectif: 41, ville: 'Laval', dep: '53', estimation: 29520,
      solutions: ['sante', 'retraite'], contact: c('Pierre Gautier', 'directeur', '06 15 82 46 37', 'p.gautier@fromagerie-mayenne.invalid') });
    recu(t(1, 11, 25), { cle: 'tse', site: 'S', type: 'simulation', origine: 'diagnostic', entreprise: 'Transports Sarthe Express', effectif: 120, ville: 'Le Mans', dep: '72',
      solutions: ['sante', 'epargne', 'retraite'], contact: c('Anne Leroux', 'directrice des ressources humaines', '06 63 29 15 84', 'a.leroux@sarthe-express.invalid') });
    var pha = recu(t(1, 9, 15), { cle: 'pha', site: 'B', type: 'rappel', entreprise: 'Pharmacie du Mail', effectif: 7, ville: 'Le Mans', dep: '72',
      solutions: ['sante'], contact: c('Karim Benali', 'pharmacien titulaire', '06 54 71 30 26', 'k.benali@pharmacie-mail.invalid') });
    L.transmettre(etat, pha.id, U('thomas.bernard'), U('lea.garnier'), 'Officine de 7 salariés : rappel à faire par l’agence du Mans.', 'pro', t(0));
    var bod = recu(t(3, 10, 40), { cle: 'bod', site: 'A', type: 'devis', entreprise: 'Menuiserie Bodin', effectif: 16, ville: 'Château-Gontier-sur-Mayenne', dep: '53',
      solutions: ['epargne'], contact: c('Sylvain Bodin', 'gérant', '06 28 94 51 73', 's.bodin@menuiserie-bodin.invalid') });
    L.transmettre(etat, bod.id, U('thomas.bernard'), U('julien.robin'), '', 'pro', t(2, 9, 0));
    L.prendreEnCharge(etat, bod.id, U('julien.robin'), 'pro', t(2, 14, 30));
    L.planifier(etat, bod.id, U('julien.robin'), 'devis', jour(1), '', t(2, 14, 40));
    return etat;
  }
  /* pioche pour « Simuler une visite du portail » */
  var PIOCHE = [
    { entreprise: 'Boulangerie des Halles', effectif: 9, ville: 'Angers', dep: '49', contact: ['Martine Vasseur', 'gérante'] },
    { entreprise: 'Société Ligérienne de Nettoyage', effectif: 140, ville: 'Cholet', dep: '49', contact: ['Franck Morin', 'directeur général'] },
    { entreprise: 'Cabinet Comptable du Maine', effectif: 23, ville: 'Le Mans', dep: '72', contact: ['Élodie Perrin', 'expert-comptable associée'] },
    { entreprise: 'Garage des Coëvrons', effectif: 11, ville: 'Évron', dep: '53', contact: ['Didier Lemoine', 'garagiste'] },
    { entreprise: 'Clinique Vétérinaire de la Loire', effectif: 52, ville: 'Saumur', dep: '49', contact: ['Aurélie Chevalier', 'vétérinaire associée'] },
    { entreprise: 'Restaurant Le Bistrot Sarthois', effectif: 14, ville: 'Sablé-sur-Sarthe', dep: '72', contact: ['Mehdi Haddad', 'restaurateur'] }
  ];
  var API = { genererDemo: genererDemo, PIOCHE: PIOCHE };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.LM3_DEMO = API;
})(typeof window !== 'undefined' ? window : this);
