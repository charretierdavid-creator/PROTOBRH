/* Module LM 3.0 — 16/11/2026 · tests des règles de gestion de la console simplifiée (lm3-regles.js) et des données de démonstration (lm3-demo.js) · historique : VERSIONS.md
   Usage : node t_lm3.js <dossier module> */
'use strict';
const path = require('path');
const M = path.resolve(process.argv[2] || path.join(__dirname, '..', 'module'));
const L = require(path.join(M, 'lm3-regles.js')), DEMO = require(path.join(M, 'lm3-demo.js'));
let ok = 0, ko = 0;
function verifier(nom, cond) { if (cond) ok++; else { ko++; console.log('  ÉCHEC : ' + nom); } }
const D = '@exemple-ca-anjoumaine.fr', C = 'claire.dubois' + D, T = 'thomas.bernard' + D, MA = 'manon.morel' + D, H = 'hugo.petit' + D, AD = 'sophie.lambert' + D;
const LUNDI = '2026-11-16 10:00:00';
const ymd = d => L.isoComplet(d).slice(0, 16);

/* ---------- dates : jours ouvrés ---------- */
verifier('vendredi + 1 jour ouvré = lundi', ymd(L.plusOuvres('2026-11-13 10:00:00', 1)) === '2026-11-16 10:00');
verifier('11 novembre exclu', ymd(L.plusOuvres('2026-11-10 10:00:00', 1)) === '2026-11-12 10:00');
verifier('demande du samedi : lundi 9 h + délai', ymd(L.plusOuvres('2026-11-14 15:00:00', 1)) === '2026-11-17 09:00');
verifier('lundi de Pâques 2027 exclu', ymd(L.plusOuvres('2027-03-26 10:00:00', 1)) === '2027-03-30 10:00');
verifier('moinsOuvres : lundi - 1 = vendredi', L.iso(L.moinsOuvres('2026-11-16 10:00:00', 1)) === '2026-11-13');

/* ---------- types, délais, segment ---------- */
verifier('trois types de lead', Object.keys(L.TYPES).join() === 'devis,simulation,rappel');
verifier('trois statuts de traitement, pas de statut Transmis', Object.keys(L.STATUTS).join() === 'nouveau,en_cours,cloture');
verifier('devis : 24 h ouvrées', L.echeanceOrigine('devis', '2026-11-13 10:00:00') === '2026-11-16 10:00:00');
verifier('être rappelé : 24 h ouvrées', L.echeanceOrigine('rappel', '2026-11-16 08:00:00') === '2026-11-17 08:00:00');
verifier('simulation : 48 h ouvrées', L.echeanceOrigine('simulation', '2026-11-16 08:00:00') === '2026-11-18 08:00:00');
verifier('segment Entreprise a priori à 50 salariés (inclus)', L.segmentSuggere(50) === 'entreprise' && L.segmentSuggere(49) === '' && L.segmentSuggere(120) === 'entreprise');
verifier('fusion : devis l’emporte sur simulation', L.fusionnerType('simulation', 'devis').type === 'devis');
verifier('fusion : simulation reste simulation après un rappel, mention Rappel demandé', L.fusionnerType('simulation', 'rappel').type === 'simulation' && L.fusionnerType('simulation', 'rappel').rappel === true);
verifier('fusion : rappel devient simulation, mention Rappel demandé', L.fusionnerType('rappel', 'simulation').type === 'simulation' && L.fusionnerType('rappel', 'simulation').rappel === true);
verifier('fusion : rappel seul reste Être rappelé, sans mention', L.fusionnerType('rappel', 'rappel').type === 'rappel' && L.fusionnerType('rappel', 'rappel').rappel === false);

/* ---------- jeu de démonstration ---------- */
const e0 = DEMO.genererDemo(L, LUNDI);
const cpt = em => L.compter(e0.leads, L.trouver(e0, em));
verifier('démo : 17 leads, 7 comptes', e0.leads.length === 17 && e0.users.length === 7);
verifier('démo : identifiants = e-mails pro fictifs, dirigeants en .invalid', e0.users.every(u => /@exemple-ca-anjoumaine\.fr$/.test(u.email)) && e0.leads.every(l => /\.invalid$/.test(l.contact.email)));
verifier('démo Claire : 5 nouveaux, 3 en cours, 2 clôturés, 3 transmis', JSON.stringify([cpt(C).nouveau, cpt(C).en_cours, cpt(C).cloture, cpt(C).transmis]) === '[5,3,2,3]');
verifier('démo Manon : 1 nouveau reçu, 1 en cours', cpt(MA).nouveau === 1 && cpt(MA).en_cours === 1);
verifier('démo admin : voit tous les leads', cpt(AD).nouveau + cpt(AD).en_cours + cpt(AD).cloture === 17);
const ate = e0.leads.find(l => l.entreprise === 'Atelier Démo 0047');
verifier('démo : Atelier Démo 0047 reste un devis avec Rappel demandé (fusion)', ate.type === 'devis' && ate.rappel === true);
const gar = e0.leads.find(l => l.entreprise === 'Garage Moreau');
verifier('démo : Garage Moreau renvoyé à Claire, segment remis à décider', gar.proprietaire === C && L.situation(gar, C) === 'renvoye' && gar.segment === null);
verifier('démo : chaque lead a un historique et un e-mail', e0.leads.every(l => l.historique.length > 0 && l.emails.length > 0));

/* ---------- parcours complet sur une copie ---------- */
const e = JSON.parse(JSON.stringify(e0));
const t1 = '2026-11-16 11:00:00', t2 = '2026-11-16 12:00:00', t3 = '2026-11-16 14:00:00';
const tll = e.leads.find(l => l.entreprise === 'Transports Loire Logistique');
verifier('Claire : Transports Loire Logistique à qualifier', L.situation(tll, C) === 'a_qualifier');
verifier('refus : prise en charge sans segment', !L.prendreEnCharge(e, tll.id, C, '', t1).ok);
verifier('refus : Thomas ne peut pas prendre le lead de Claire', !L.prendreEnCharge(e, tll.id, T, 'entreprise', t1).ok);
verifier('Claire prend en charge (Entreprise)', L.prendreEnCharge(e, tll.id, C, 'entreprise', t1).ok && tll.statut === 'en_cours' && tll.segment === 'entreprise');
verifier('prise en charge : e-mail au dirigeant journalisé', tll.emails.some(m => m.a === 'dirigeant' && /prise en charge/.test(m.objet)));
verifier('refus : deuxième prise en charge', !L.prendreEnCharge(e, tll.id, C, 'entreprise', t1).ok);
verifier('prochaine étape : refus sans date', !L.planifier(e, tll.id, C, 'rappeler', '', '', t1).ok);
verifier('prochaine étape enregistrée', L.planifier(e, tll.id, C, 'rdv', '2026-11-19', 'En agence', t1).ok && tll.prochaine.action === 'rdv');
verifier('échéance affichée = prochaine étape quand le lead est en cours', L.echeanceAffichee(tll, t1).jour === '19/11' && L.echeanceAffichee(tll, t1).etat === 'a_venir');
verifier('téléphone : refus si incomplet', !L.changerTelephone(e, tll.id, C, '06 12', t1).ok);
verifier('téléphone modifié et formaté', L.changerTelephone(e, tll.id, C, '+33612345678', t1).ok && tll.contact.tel === '06 12 34 56 78');
verifier('note : refus si vide', !L.noter(e, tll.id, C, '  ', t1).ok);
verifier('note ajoutée à l’historique', L.noter(e, tll.id, C, 'Appel fait', t1).ok && tll.historique.some(h => h.texte === 'Note : Appel fait'));
verifier('clôture : refus sans motif', !L.cloturer(e, tll.id, C, '', '', t2).ok);
verifier('clôture : contrat signé', L.cloturer(e, tll.id, C, 'signe', '', t2).ok && tll.statut === 'cloture');
verifier('clôturé : échéance affichée = motif', L.echeanceAffichee(tll, t2).lib === 'Contrat signé');
verifier('refus : transmettre un lead clôturé', !L.transmettre(e, tll.id, C, MA, '', 'pro', t2).ok);
verifier('rouvrir : revient en cours', L.rouvrir(e, tll.id, C, t2).ok && tll.statut === 'en_cours' && tll.cloture === null);

/* transmission et prise en charge par le collègue Pro */
const ch = e.leads.find(l => l.entreprise === 'Charcuterie Angevine');
verifier('collègues proposés pour un Pro du 49 : Manon puis Hugo en tête', (() => { const c = L.collegues(e, ch, C, 'pro').map(u => u.email); return c[0] === MA && c[1] === H; })());
verifier('collègues : jamais soi-même ni l’administrateur', L.collegues(e, ch, C, 'pro').every(u => u.email !== C && u.role !== 'admin'));
verifier('refus : transmettre à soi-même', !L.transmettre(e, ch.id, C, C, '', 'pro', t1).ok);
verifier('refus : transmettre à l’administrateur', !L.transmettre(e, ch.id, C, AD, '', 'pro', t1).ok);
verifier('Claire transmet à Hugo', L.transmettre(e, ch.id, C, H, 'Petite structure', 'pro', t1).ok);
verifier('transmis : propriétaire change, statut reste Nouveau', ch.proprietaire === H && ch.statut === 'nouveau');
verifier('transmis : échéance d’origine conservée', ch.echeance === e0.leads.find(l => l.entreprise === 'Charcuterie Angevine').echeance);
verifier('transmis : disparaît des leads de Claire, apparaît dans Transmis par moi', !L.filtrer(e.leads, L.trouver(e, C), 'nouveau', '').some(l => l.id === ch.id) && L.filtrer(e.leads, L.trouver(e, C), 'transmis', '').some(l => l.id === ch.id));
verifier('transmis : dans les Nouveaux de Hugo, situation reçu', L.filtrer(e.leads, L.trouver(e, H), 'nouveau', '').some(l => l.id === ch.id) && L.situation(ch, H) === 'recu');
verifier('transmis : e-mails au collègue et au dirigeant', ch.emails.some(m => m.a === 'Hugo Petit') && ch.emails.some(m => m.a === 'dirigeant' && /Hugo Petit/.test(m.objet)));
verifier('refus : Claire ne peut plus agir sur le lead transmis', !L.noter(e, ch.id, C, 'x', t1).ok);
verifier('Hugo prend en charge : segment Pro conservé', L.prendreEnCharge(e, ch.id, H, 'entreprise', t3).ok && ch.segment === 'pro' && ch.statut === 'en_cours');

/* renvoi */
const fro = e.leads.find(l => l.entreprise === 'Fromagerie de la Mayenne');
verifier('Thomas transmet à Julien', L.transmettre(e, fro.id, T, 'julien.robin' + D, '', 'pro', t1).ok);
verifier('renvoi : mot obligatoire', !L.renvoyer(e, fro.id, 'julien.robin' + D, '', t2).ok);
verifier('renvoi : retourne à Thomas, segment à redécider', L.renvoyer(e, fro.id, 'julien.robin' + D, '41 salariés, relève de l’Entreprise', t2).ok && fro.proprietaire === T && fro.segment === null && L.situation(fro, T) === 'renvoye');
verifier('renvoi : Julien suit le lead dans Transmis par moi', L.transmisParMoi(fro, L.trouver(e, 'julien.robin' + D)));
verifier('refus : renvoyer un lead qu’on n’a pas reçu', !L.renvoyer(e, fro.id, T, 'x', t2).ok);
verifier('transmettre un lead en cours : redevient Nouveau chez le collègue', (() => { const s = e.leads.find(l => l.entreprise === 'Imprimerie Angevine'); return L.transmettre(e, s.id, C, MA, '', 'pro', t2).ok && s.statut === 'nouveau' && s.prochaine === null; })());

/* arrivée de demandes du portail */
const r1 = L.recevoir(e, { cle: 'x1', site: 'A', type: 'simulation', origine: 'label', entreprise: 'Test Laval', effectif: 10, ville: 'Laval', dep: '53', solutions: ['epargne'], contact: { nom: 'X', fonction: 'g', tel: '', email: 'x@x.invalid' } }, t3);
verifier('portail : lead du 53 attribué à Thomas', r1.ok && !r1.fusion && r1.lead.proprietaire === T && r1.lead.statut === 'nouveau');
verifier('portail : échéance calculée (simulation 48 h ouvrées)', r1.lead.echeance === '2026-11-18 14:00:00');
verifier('portail : site d’origine gardé', r1.lead.site === 'A');
const r2 = L.recevoir(e, { cle: 'x1', site: 'C', type: 'devis', solutions: ['sante'] }, t3);
verifier('portail : même entreprise → fusion, le lead passe en devis', r2.fusion && r2.lead.id === r1.lead.id && r2.lead.type === 'devis' && r2.lead.solutions.join() === 'epargne,sante');
const r3 = L.recevoir(e, { cle: 'x1', site: 'B', type: 'rappel' }, t3);
verifier('portail : rappel sur un devis → mention Rappel demandé, type inchangé', r3.lead.type === 'devis' && r3.lead.rappel === true);
const r4 = L.recevoir(e, { cle: 'x2', site: 'S', type: 'rappel', entreprise: 'Test Angers', effectif: 3, ville: 'Angers', dep: '49', contact: { nom: 'Y', fonction: 'g', tel: '', email: 'y@y.invalid' } }, t3);
verifier('portail : Être rappelé seul = troisième type, attribué à Claire (49)', r4.lead.type === 'rappel' && r4.lead.proprietaire === C && !r4.lead.rappel);

/* recherche, tri, compteurs */
const cl = L.trouver(e, C);
verifier('recherche sans accents (« angevine »)', L.filtrer(e.leads, cl, 'cloture', '').length >= 0 && L.filtrer(e0.leads, L.trouver(e0, C), 'nouveau', 'angevine').length === 1);
verifier('recherche par ville', L.filtrer(e0.leads, L.trouver(e0, C), 'nouveau', 'trelaze').length === 1);
const tri = L.trier(L.filtrer(e0.leads, L.trouver(e0, C), 'nouveau', ''), 'nouveau', LUNDI);
verifier('tri : échéance la plus ancienne en tête', tri.every((l, i) => !i || L.dt(L.echeanceAffichee(tri[i - 1], LUNDI).date) <= L.dt(L.echeanceAffichee(l, LUNDI).date)));
verifier('compteurs par type (vue administrateur) : leads ouverts', (() => { const c = L.compter(e0.leads, L.trouver(e0, AD)); return c.types.devis + c.types.simulation + c.types.rappel === 15; })());

console.log('Console LM 3.0 — règles : ' + ok + ' contrôles réussis, ' + ko + ' en échec.');
process.exit(ko ? 1 : 0);
