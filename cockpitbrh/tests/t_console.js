/* Module LM 2.0 — 15/11/2026 · tests de la console avec la démonstration (mêmes réponses que lm2-api.php) : E1 à E9, droits par point de vue, règles de gestion · historique : VERSIONS.md
   Usage : node t_console.js <dossier module> */
'use strict';
const path = require('path');
const { console2, attendre, verifier, bilan } = require('./lib/dom2');
const M = process.argv[2];
const bouton = (v, extra) => ({ getAttribute: k => (k === 'data-v' ? v : (extra || {})[k] || null), parentNode: { children: [] }, checked: (extra || {}).checked });

(async () => {
  /* ---------- E1 : expert BRH (Val de France, CR en démonstration) ---------- */
  let T = console2(M); await attendre(30);
  let C = T.C, L = T.ctx.LM2, ST = C.ST, h = T.app();
  verifier('E1 : session expert ouverte en démonstration', ST.s && ST.s.role === 'expert' && ST.s.cr.code === 'val-de-france', ST.s && ST.s.role);
  verifier('E1 : sigle DÉMO de la CR dans le bandeau de la console', /Console de l’expert BRH · Crédit Agricole Val de France<\/b><span class="sig demo">DÉMO/.test(h));
  const kp = (h.match(/<button class="k /g) || []).length;
  verifier('E1 : exactement 3 indicateurs (devis, ultra-qualifiés, qualifiés)', kp === 3, kp);
  const k = L.kpis(ST.leads.filter(l => l.statut !== 'cloture'));
  verifier('E1 : indicateurs = leads en cours par type', h.includes('<b>' + k.devis + '</b>Demandes de devis en cours') && h.includes('<b>' + k.ultra + '</b>Ultra-qualifiés en cours') && h.includes('<b>' + k.qualifie + '</b>Qualifiés en cours'), k);
  const ordre = C.visibles().map(l => l.type);
  verifier('RG-04 : liste triée devis, puis ultra-qualifiés, puis qualifiés', ordre.join(',') === ordre.slice().sort((a, b) => L.TYPES[a].prio - L.TYPES[b].prio).join(','), ordre);
  verifier('RG-05 / S7 : « Hors délai » en rouge dans la colonne Échéance', /<span class="ech retard">Hors délai<\/span>/.test(h));
  verifier('E1 : colonnes Lead, Type, Solutions, Statut, Échéance', /<th>Lead<\/th><th>Type<\/th><th>Solutions<\/th><th>Statut<\/th><th>Échéance<\/th>/.test(h));
  verifier('E1 : destinataire affiché pour un lead transféré (→ …, ag. Dreux)', /<span class="to">→ [^<]+, ag\. Dreux/.test(h));
  verifier('E1 : statut client sous le type', /<span class="cl declare">Client déclaré<\/span>/.test(h));
  verifier('E1 : pastilles par filiale (CA Assurances, Amundi / CA Titres, Worklife)', /class="ch caa"/.test(h) && /class="ch amundi"/.test(h) && /class="ch worklife"/.test(h));
  verifier('E1 : mini-barre d’avancement en 5 segments', (h.match(/<div class="mini" aria-hidden="true">((?:<i[^>]*><\/i>){5})<\/div>/g) || []).length >= 5);
  verifier('E1 : clôturés masqués par défaut (filtre « En cours »)', !C.visibles().some(l => l.statut === 'cloture'));
  C.ACTIONS.etat(bouton('tous')); verifier('E1 : filtre « Tous » montre les clôturés', C.visibles().some(l => l.statut === 'cloture'));
  C.ACTIONS.etat(bouton('cours'));
  C.ACTIONS.kpi(bouton('devis')); verifier('E1 : clic sur un indicateur = filtre du type', C.visibles().every(l => l.type === 'devis') && C.visibles().length === k.devis);
  C.ACTIONS.kpi(bouton('devis')); verifier('E1 : second clic = filtre retiré', C.visibles().length > k.devis);
  ST.f.q = 'lefort'; verifier('E1 : recherche (entreprise, nom)', C.visibles().length === 1 && C.visibles()[0].raison_sociale === 'Boulangerie Lefort'); ST.f.q = '';
  ST.f.assigne = 'transferes'; verifier('E1 : filtre « Transférés »', C.visibles().length >= 1 && C.visibles().every(l => l.transfert)); ST.f.assigne = '';

  /* ---------- fiche du lead (demande de devis) ---------- */
  const lf = ST.leads.find(l => l.raison_sociale === 'Boulangerie Lefort');
  await C.ouvrir(lf.id); await attendre();
  let f = T.dom.ids.fiche.innerHTML, d = ST.det;
  verifier('Fiche : référence, date de réception et site d’origine', f.includes(d.reference) && /reçu le \d\d\/\d\d\/\d{4}/.test(f) && f.includes('site B'));
  verifier('Fiche : pastilles type + délai, effectif, segment suggéré, statut client', f.includes('Demande de devis · 24 h ouvrées') && f.includes('9 salariés') && f.includes('Segment Pro suggéré') && f.includes('Client déclaré · à vérifier'));
  ['Traiter le lead', 'Transférer', 'Script d’appel IA', 'E-mail IA', 'Clôturer'].forEach(a => verifier('Fiche : action « ' + a + ' »', f.includes('>' + a + '</button>')));
  verifier('Fiche : « Vérifier le statut client » et bandeau non bloquant (RG-16)', f.includes('Vérifier le statut client') && f.includes('avant tout transfert'));
  verifier('S3 : « Pour préparer l’appel » avec l’argumentaire de l’IA du site', f.includes('Pour préparer l’appel') && f.includes('Questions à poser') && f.includes('Pièces à demander'));
  verifier('Fiche : parcours daté (diagnostic, estimation, devis)', (f.match(/<div><b>\d\d\/\d\d\/\d{4} à \d\d:\d\d<\/b>/g) || []).length === 3);
  verifier('Fiche : priorités notées sur 4, offres préconisées et consultées', f.includes('4/4') && f.includes('Offres préconisées') && f.includes('Prime de partage de la valeur') && f.includes('Audit mutuelle'));
  verifier('Fiche : estimation « indicative et non contractuelle », configuration, convention et obligations santé', f.includes('6 840 €') && f.includes('estimation indicative et non contractuelle') && f.includes('Formule Confort') && f.includes('0843') && f.includes('Régime santé obligatoire'));
  verifier('Fiche : e-mails automatiques tracés (RG-27)', f.includes('E-mails automatiques de ce client') && /E1 · Votre demande/.test(f) && f.includes('Journalisé'));
  verifier('Fiche : historique', f.includes('Historique') && f.includes('Portail (automatique)'));

  /* ---------- E2 : transfert ---------- */
  await C.dlgTransfert(); await attendre();
  let g = T.dlg();
  verifier('E2 : conseil de segment Pro (< 20 salariés)', g.includes('Segment Pro (9 salariés) : transfert suggéré'));
  verifier('RG-18 : « pourquoi » de la suggestion (Chartres, 28000 → Eure-et-Loir → expert BRH PRO du 28 ; agence)', /Siège à Chartres \(28000\) → Eure-et-Loir \(28\) → expert BRH PRO du 28/.test(g) && g.includes('Agence de la commune du siège : Agence de Chartres'));
  verifier('E2 : l’autre expert BRH PRO de la CR reste proposé', (g.match(/name="trVers"[^>]*><span><b>[^<]+<\/b><span class="rf fictif">Fictif<\/span>(?: <span class="chip o">suggéré<\/span>)?<span class="sm">Périmètre/g) || []).length === 2);
  verifier('E2 : 2 conseillers pro de l’agence avec leur charge', (g.match(/lead\(s\) en cours/g) || []).length >= 4 && g.includes('le moins chargé'));
  verifier('RG-22 : filiales des offres choisies seulement (santé → CA Assurances, épargne → Amundi / CA Titres ; pas Worklife)', g.includes('<b>CA Assurances</b>') && g.includes('<b>Amundi / CA Titres</b>') && !g.includes('<b>Worklife</b>'));
  verifier('E2 : sigle Réel / Fictif de chaque destinataire', g.includes('<span class="rf fictif">Fictif</span>'));
  verifier('E2 : lien d’accès ponctuel 14 jours et e-mail facultatif au dirigeant (E5)', g.includes('valable 14 jours et limité à ce lead') && g.includes('id="trInf" checked'));
  verifier('Q17 : adresse hors annuaire possible', g.includes('Autre adresse du Crédit Agricole (hors annuaire)'));
  /* filiale sans motif : refus */
  const amundi = ST.annT.filiales.find(x => x.filiale === 'amundi');
  T.dom.cocher('trVers', amundi.id); C.ACTIONS.transferer(); await attendre();
  verifier('RG-22 : motif obligatoire pour une filiale', /Motif obligatoire/.test(T.toast()), T.toast());
  /* hors annuaire : adresse non Crédit Agricole refusée */
  T.dom.cocher('trVers', 'hors'); T.dom.ids.trHE.value = 'pirate@gmail.com'; T.dom.ids.trHP.value = 'A'; T.dom.ids.trHN.value = 'B'; C.ACTIONS.transferer(); await attendre();
  verifier('Q17 : adresse hors annuaire limitée au Crédit Agricole', /Adresse professionnelle du Crédit Agricole/.test(T.toast()), T.toast());
  /* transfert au conseiller suggéré */
  const sg = ST.ia.tr.sg; T.dom.cocher('trVers', sg.conseiller.id); T.dom.ids.trMsg.value = 'Merci de rappeler la gérante.'; C.ACTIONS.transferer(); await attendre(30);
  d = ST.det;
  verifier('RG-21 : lead transféré au conseiller pro (statut Transféré)', d.statut === 'transfere' && d.assigne_id === sg.conseiller.id, d.statut);
  verifier('RG-23 : accès ponctuel de 14 jours créé', d.transferts[0].acces.expire_le && Math.round((new T.ctx.Date(d.transferts[0].acces.expire_le.replace(' ', 'T')) - T.ctx.Date.now()) / 864e5) === 14);
  verifier('Envoi réel coupé : lien d’accès affiché à l’expert', /transmettez vous-même ce lien/.test(T.dlg()));
  C.ACTIONS.fermer();
  verifier('RG-26 : le lead transféré reste dans la liste de l’expert', ST.leads.some(l => l.id === lf.id && l.statut === 'transfere'));
  f = T.dom.ids.fiche.innerHTML;
  verifier('RG-26 : état du transfert, prolonger, révoquer, reprendre', f.includes('En attente de prise en charge') && f.includes('Prolonger l’accès') && f.includes('Révoquer l’accès') && f.includes('Reprendre le lead'));
  verifier('E4 : e-mail E4 journalisé (destinataire fictif : non envoyé)', d.emails.some(e => e.modele === 'E4' && e.statut === 'non_envoye'));
  verifier('E5 : e-mail au dirigeant (case cochée)', d.emails.some(e => e.modele === 'E5'));

  /* ---------- E7 : script d'appel (repli sans IA en démonstration) ---------- */
  const garage = ST.leads.find(l => l.raison_sociale === 'Garage des Vallées');
  await C.ouvrir(garage.id); await attendre();
  C.dlgScript(); await attendre();
  g = T.dlg() + T.dom.ids.scBlocs.innerHTML;
  verifier('E7 : 5 temps (ouverture, vérifier, découvrir, objections, conclure)', ['1. Ouverture', '2. Vérifier', '3. Découvrir', '4. Répondre aux objections', '5. Conclure'].every(x => g.includes(x)), g.slice(0, 200));
  verifier('E7 : adapté au type, au statut client, au rappel', g.includes('Qualifié') && g.includes('Client déclaré · à vérifier') && g.includes('Rappel demandé'));
  verifier('RG-16 : statut à vérifier → la vérification ouvre le script', g.includes('Vous nous avez indiqué être déjà client'));
  verifier('RG-34 : prénom ajouté dans le navigateur, aucun repère [Prénom] restant', g.includes('Bonjour Samir') && !g.includes('[Prénom]') && !g.includes('[Votre nom]'));
  verifier('RG-34 : contexte envoyé à l’IA sans nom ni coordonnées', !/Haddou|samir\.haddou|06 45/.test(g.match(/<div class="ctx">[\s\S]*?<\/div>/)[0]));
  C.ACTIONS.crRes(bouton('joint')); T.dom.ids.crPro.value = 'devis'; T.dom.ids.crNote.value = 'Intéressé par la mutuelle.'; C.ACTIONS.crEnregistrer(); await attendre(30);
  d = ST.det;
  verifier('RG-37 / Q18 : compte rendu « joint » → pris en charge, prochaine étape devis → Proposition', d.statut === 'proposition', d.statut);
  verifier('RG-37 : compte rendu dans l’historique', d.journal.some(j => j.action === 'appel' && /Joint ; prochaine étape : Devis ou proposition/.test(j.detail)));
  verifier('RG-20 / E3 : prise en charge → e-mail E3 au dirigeant', d.emails.some(e => e.modele === 'E3'));

  /* ---------- E3 : e-mail IA ---------- */
  C.dlgEmail(); await attendre();
  g = T.dlg() + T.dom.ids.mProps.innerHTML;
  verifier('E3 : 4 objectifs et 2 tons', ['Proposer un rendez-vous', 'Envoyer la première estimation', 'Relancer', 'Répondre sur la convention santé'].every(x => g.includes(x)) && g.includes('Cordial') && g.includes('Formel'));
  verifier('E3 : 3 propositions à copier', (g.match(/Copier le texte/g) || []).length === 3);
  verifier('RG-31 : [Prénom] et signature complétés, contexte sans nom', g.includes('Bonjour Samir') && !g.includes('[Signature]') && !/Haddou/.test(g.match(/<div class="ctx">[\s\S]*?<\/div>/)[0]));
  C.ACTIONS.mCopier(bouton('0')); await attendre();
  verifier('RG-32 : copie du texte pour la messagerie', /^Objet : /.test(T.ctx.__copie || ''));
  C.ACTIONS.mNoter(bouton('0')); await attendre(20);
  verifier('Q9 : « Noter e-mail envoyé » = objet et date dans l’historique', ST.det.journal.some(j => j.action === 'email_perso' && /« .+ »/.test(j.detail)));
  C.ACTIONS.fermer();

  /* ---------- clôture, rendez-vous, statut client ---------- */
  C.ACTIONS.dlgCloture(); C.ACTIONS.cloturer(); await attendre();
  verifier('Clôture : issue obligatoire', /issue/.test(T.toast()));
  const sci = ST.leads.find(l => l.raison_sociale === 'SCI Les Tilleuls');
  await C.ouvrir(sci.id); await attendre();
  C.ACTIONS.dlgRdv(); C.ACTIONS.rdv(); await attendre(30);
  verifier('S10 : rendez-vous planifié, E8 au dirigeant, lead pris en charge', ST.det.rdv_le && ST.det.emails.some(e => e.modele === 'E8') && ST.det.statut === 'pris_en_charge');
  C.ACTIONS.dlgClient(); T.dom.cocher('vcSt', 'prospect'); C.ACTIONS.client(); await attendre(30);
  verifier('RG-15 : statut client vérifié manuellement, auteur et date tracés', ST.det.client_statut === 'prospect' && ST.det.client_verifie_par && ST.det.journal.some(j => j.action === 'client'));
  C.ACTIONS.dlgCloture(); T.dom.cocher('clIssue', 'perdu'); C.ACTIONS.cloturer(); await attendre(30);
  verifier('Clôture avec issue', ST.det.statut === 'cloture' && ST.det.issue === 'perdu');
  verifier('Lead clôturé : actions remplacées par un message (RG-29)', T.dom.ids.fiche.innerHTML.includes('Une nouvelle demande du dirigeant rouvre le dossier') && !T.dom.ids.fiche.innerHTML.includes('>Transférer</button>'));

  /* ---------- E6 : annuaire ---------- */
  C.onglet('annuaire'); await attendre(20); h = T.app();
  verifier('E6 : experts BRH PRO par département avec périmètre', h.includes('Périmètre : Eure-et-Loir (28)') && h.includes('Périmètre : Loir-et-Cher (41)'));
  verifier('E6 : agences des grandes villes, 2 conseillers pro par agence', ['Agence de Chartres', 'Agence de Dreux', 'Agence de Châteaudun', 'Agence de Blois', 'Agence de Vendôme', 'Agence de Romorantin'].every(a => h.includes(a)));
  verifier('E6 : filiales (transferts exceptionnels)', h.includes('CA Assurances') && h.includes('Amundi / CA Titres') && h.includes('Worklife'));
  verifier('E6 : lecture seule (aucun bouton Modifier)', !h.includes('data-a="admModif"'));
  verifier('E6 : sigle Fictif (CR en démonstration)', h.includes('<span class="rf fictif">Fictif</span>'));

  /* ---------- S8 : export CSV ---------- */
  C.onglet('leads'); await attendre(20); C.ACTIONS.exporter(); await attendre();
  verifier('S8 : export CSV des leads de la CR', /^﻿Référence;Reçu le;Site;Type de lead/.test(T.ctx.__blob || ''));

  /* ---------- E4 : point de vue du conseiller pro (accès ponctuel) ---------- */
  T.C.CHANGES.perspective({ value: 'acces' }); await attendre(40);
  h = T.app();
  verifier('E4 : rôle « accès ponctuel »', ST.s.role === 'acces');
  verifier('E4 : bandeau qui, jusqu’à quand, périmètre', /Accès ouvert par <b>[^<]+<\/b>, valable jusqu’au <b>\d\d\/\d\d\/\d{4}<\/b> ; périmètre : seulement les leads transmis/.test(h));
  verifier('E4 : liste réduite aux leads transmis', ST.leads.every(l => l.assigne_id === ST.s.moi.id) && ST.leads.length >= 2, ST.leads.map(l => l.raison_sociale));
  verifier('E4 : pas d’indicateurs ni d’export ni d’annuaire', !h.includes('class="kp"') && !h.includes('Exporter CSV') && !/Annuaire pro/.test(T.dom.ids.tabsIn.innerHTML));
  const at = ST.leads.find(l => l.statut === 'transfere');
  await C.ouvrir(at.id); await attendre(); f = T.dom.ids.fiche.innerHTML;
  verifier('E4 : message de l’expert joint', f.includes('Message de ') && f.includes('rappeler'));
  verifier('RG-24 : prendre en charge, RDV, note, clôturer, rendre ; pas de transfert (Q8)', ['Prendre en charge', 'Planifier un rendez-vous', 'Ajouter une note', 'Clôturer', 'Rendre le lead à l’expert'].every(x => f.includes(x)) && !f.includes('>Transférer</button>'));
  verifier('Q8 : e-mail IA et script d’appel pour le destinataire', f.includes('E-mail IA') && f.includes('Script d’appel IA'));
  C.ACTIONS.traiter(); await attendre(30);
  verifier('E4 : prise en charge par le destinataire', ST.det.statut === 'pris_en_charge' && ST.det.transferts[0].pris_le);
  let r = await C.api('transferer', { id: at.id, vers_id: 1 }).catch(e => e.message);
  verifier('Q8 : le destinataire ne peut pas transférer', /réservée à l’expert/.test(r), r);
  r = await C.api('lead', { id: lf.id }).then(x => x.lead.id).catch(e => e.message);
  const lfAcc = r === lf.id;
  verifier('RG-23 : un autre lead (non transmis) reste inaccessible', !ST.leads.some(l => l.raison_sociale === 'Domaine du Cher') && (await C.api('lead', { id: ST.leads.length + 1000 }).catch(e => 'refus')) === 'refus');
  C.ACTIONS.dlgRendre(); T.dom.ids.rdR.value = 'Siège hors de mon secteur'; C.ACTIONS.rendre(); await attendre(40);
  verifier('RG-19 / RG-24 : lead rendu à l’expert, accès révoqué', !ST.leads.some(l => l.id === at.id));

  /* ---------- E8, E9 : administrateur ---------- */
  T.C.CHANGES.perspective({ value: 'admin' }); await attendre(40);
  verifier('Admin : session administrateur, onglet Administration', ST.s.role === 'admin' && T.dom.ids.tabsIn.innerHTML.includes('Administration'));
  C.onglet('admin'); await attendre(40); h = T.app();
  verifier('E8 : liste des CR avec sigles PILOTE et DÉMO', (h.match(/<span class="sig pilote">PILOTE<\/span>/g) || []).length >= 5 && h.includes('<span class="sig demo">DÉMO</span>'));
  verifier('Q15 : les 5 CR pilotes', ['Touraine Poitou', 'Pyrénées Gascogne', 'Centre Loire', 'Franche-Comté', 'Paris et Île-de-France'].every(n => new RegExp(n + '<span class="sig pilote">').test(h)));
  verifier('E8 : CR pilote vide « à saisir »', /Centre Loire<span class="sig pilote">PILOTE<\/span><span class="n">à saisir/.test(h));
  verifier('E8 : ajouter, importer CSV, exporter', h.includes('Ajouter un interlocuteur') && h.includes('Importer un fichier CSV') && h.includes('>Exporter<'));
  C.ACTIONS.admCr(bouton('val-de-france')); await attendre(30); h = T.app();
  verifier('S12 : « Voir la console comme l’expert » pour une CR en démonstration', h.includes('Voir la console comme l’expert'));
  verifier('E8 : chaque interlocuteur avec rôle, e-mail, département, agence, périmètre, sigle', h.includes('Expert BRH PRO') && h.includes('demo-brh.invalid') && h.includes('Agence de Chartres') && h.includes('<span class="rf fictif">Fictif</span>'));
  /* ajout : contrôles */
  r = await C.api('admin_interlocuteur', { cr_code: 'touraine-poitou', role: 'conseiller_pro', prenom: 'Test', nom: 'Doublon', email: 's.martin@exemple-ca-tp.fr', departements: '37', ville_agence: 'Agence de Tours', donnees: 'reel' }).catch(e => e.message);
  verifier('E8 : doublon d’e-mail refusé', /doublon/.test(r), r);
  r = await C.api('admin_interlocuteur', { cr_code: 'touraine-poitou', role: 'expert_brh_pro', prenom: 'Test', nom: 'Dep', email: 't.dep@exemple-ca-tp.fr', departements: '75', donnees: 'reel', telephone: '123' }).catch(e => e.message);
  verifier('E8 : département hors CR et téléphone invalide refusés', /hors de la Caisse régionale/.test(r) && /10 chiffres/.test(r), r);
  r = await C.api('admin_interlocuteur', { cr_code: 'centre-loire', role: 'conseiller_pro', prenom: 'Anne', nom: 'Réelle', email: 'a.reelle@exemple-ca-cl.fr', departements: '18', ville_agence: 'Agence de Sancerre', donnees: 'reel' }).catch(e => e.message);
  verifier('E8 : ajout dans une CR pilote (agence créée si absente)', r && r.ok && r.id, r);
  /* import CSV */
  const csv = 'caisse_regionale;role;prenom;nom;email_pro;telephone_pro;departements;ville_agence;perimetre;donnees;actif\n' +
    'franche-comte;expert_brh;Paul;Comtois;p.comtois@exemple-ca-fc.fr;03 81 00 00 01;25,39,70,90;;;reel;oui\n' +
    'franche-comte;conseiller_pro;Lise;Doubs;l.doubs@exemple-ca-fc.fr;03 81 00 00 02;25;Agence de Besançon;;reel;oui\n' +
    'franche-comte;conseiller_pro;Lise;Bis;l.doubs@exemple-ca-fc.fr;;25;Agence de Besançon;;reel;oui\n' +
    'franche-comte;directeur;Max;Role;m.role@exemple-ca-fc.fr;;25;;;reel;oui\n';
  r = await C.api('admin_import', { csv, simuler: true });
  verifier('RG-55 : aperçu de l’import (2 valides, 2 refusées : doublon, rôle)', r.valides === 2 && r.refuses === 2 && r.ajoutes === 0 && /double/.test(r.rapport[2].erreurs.join()) && /Rôle/.test(r.rapport[3].erreurs.join()), r);
  r = await C.api('admin_import', { csv, simuler: false });
  verifier('RG-55 : enregistrement des lignes valides seulement', r.ajoutes === 2);
  r = await C.api('admin_import', { csv: 'prenom;nom\nA;B' }).catch(e => e.message);
  verifier('RG-55 : colonnes obligatoires contrôlées', /Colonnes obligatoires absentes/.test(r), r);
  /* RG-57 : changement de mode réversible */
  await C.api('admin_cr_mode', { cr: 'franche-comte', mode: 'demo' });
  let its = (await C.api('admin_interlocuteurs', { cr: 'franche-comte' })).interlocuteurs;
  verifier('RG-57 : PILOTE → DÉMO masque les réels sans les supprimer, annuaire fictif généré', its.filter(i => i.donnees === 'reel').every(i => i.masque) && its.some(i => i.donnees === 'fictif' && !i.masque) && its.some(i => i.email === 'p.comtois@exemple-ca-fc.fr'));
  await C.api('admin_cr_mode', { cr: 'franche-comte', mode: 'pilote' });
  its = (await C.api('admin_interlocuteurs', { cr: 'franche-comte' })).interlocuteurs;
  verifier('RG-57 : retour en PILOTE : réels restaurés, fictifs masqués', its.filter(i => i.donnees === 'reel').every(i => !i.masque) && its.filter(i => i.donnees === 'fictif').every(i => i.masque));
  r = await C.api('admin_cr_envoi', { cr: 'val-de-france', envoi: true }).catch(e => e.message);
  verifier('RG-62 : envoi réel impossible pour une CR en démonstration', /CR pilote/.test(r), r);
  /* RG-51 : recouvrement de périmètres */
  await C.api('admin_interlocuteur', { cr_code: 'touraine-poitou', role: 'expert_brh_pro', prenom: 'Double', nom: 'Périmètre', email: 'd.perimetre@exemple-ca-tp.fr', departements: '37', perimetre: '37', donnees: 'reel' });
  r = await C.api('admin_interlocuteurs', { cr: 'touraine-poitou' });
  verifier('RG-51 : deux périmètres d’experts BRH PRO qui se recouvrent sont signalés', r.alertes.some(a => /recouvrent \(37\)/.test(a)), r.alertes);
  /* RG-56 : désactivation : leads en cours rendus à l'expert BRH, accès révoqués */
  r = await C.api('admin_interlocuteur_actif', { id: sg.conseiller.id, actif: false });
  const lfApres = (await C.api('lead', { id: lf.id })).lead;
  verifier('RG-56 : désactivation → leads en cours rendus à l’expert BRH, accès révoqués', r.rendus >= 1 && lfApres.statut === 'nouveau' && !lfApres.assigne_id && lfApres.transferts.every(t => t.acces.revoque_le), r);
  /* E9 */
  ST.adm.sub = 'envoi'; await C.admCharger(); await attendre(20); h = T.app();
  verifier('E9 : interrupteur général désactivé par défaut', /data-v="reel"><span><b>Envoi réel des e-mails<\/b><span class="sm">Désactivé \(par défaut\)/.test(h));
  verifier('E9 : catégories interlocuteurs, filiales, dirigeants et CR pilotes', h.includes('<b>Interlocuteurs</b>') && h.includes('<b>Filiales</b>') && h.includes('<b>Dirigeants</b>') && h.includes('Par Caisse régionale pilote'));
  verifier('RG-61 : expéditeur contact@monsitedetest.com, nom affiché, réponses à l’expert', h.includes('Banque des RH – Lead management &lt;contact@monsitedetest.com&gt;') && h.includes('Reply-To'));
  verifier('RG-66 / RG-67 : état SMTP et DNS, e-mail de test, journal des envois', h.includes('Serveur SMTP') && h.includes('SPF / DKIM / DMARC') && h.includes('Envoyer un e-mail de test') && h.includes('Journal des derniers envois'));
  ST.adm.sub = 'modeles'; await C.admCharger(); await attendre(20); h = T.app();
  verifier('RG-65 : modèles E1 à E8, récapitulatif et code d’accès modifiables', ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'R', 'A'].every(x => h.includes('data-v="' + x + '"')) && h.includes('id="modObj"') && h.includes('id="modTxt"'));
  verifier('RG-63 : aperçu E4 avec fiche client et deux boutons', /Ouvrir la fiche du lead/.test(T.dom.ids.modAp.srcdoc) && /Voir le script d’appel/.test(T.dom.ids.modAp.srcdoc) && /indicative et non contractuelle/.test(T.dom.ids.modAp.srcdoc));
  verifier('RG-68 : pied « E-mail interne Crédit Agricole, ne pas transférer » et validité du lien', /ne pas transférer/.test(T.dom.ids.modAp.srcdoc) && /valable 14 jours/.test(T.dom.ids.modAp.srcdoc));
  ST.adm.sub = 'parametres'; await C.admCharger(); await attendre(20); h = T.app();
  verifier('Admin : délais par type et seuil Pro / Entreprise', h.includes('id="pSeuil" type="number" min="1" value="20"') && h.includes('id="pDevis" type="number" min="1" value="1"') && h.includes('id="pQual" type="number" min="1" value="5"'));
  ST.adm.sub = 'attribuer'; await C.admCharger(); await attendre(20); h = T.app();
  verifier('RG-12 : file « à attribuer »', h.includes('Start-up Nomade') && h.includes('data-a="attribuer"'));
  ST.adm.sub = 'journal'; await C.admCharger(); await attendre(20); h = T.app();
  verifier('RG-57 : journal des modifications de l’annuaire (avant, après)', h.includes('Interlocuteur ajouté') && h.includes('Mode de la Caisse régionale'));
  /* S12 */
  ST.adm.sub = 'annuaire'; ST.adm.cr = 'val-de-france'; C.ACTIONS.admVoir(); await attendre(40);
  verifier('S12 : vue de l’expert d’une CR en démonstration, bandeau de retour', ST.s.role === 'expert' && ST.s.vue === 'val-de-france' && T.dom.ids.bands.innerHTML.includes('Revenir à l’administration'));
  r = await C.api('admin_voir_comme', { cr: 'touraine-poitou' }).catch(e => e.message);
  C.ACTIONS.quitterVue(); await attendre(40);
  verifier('S12 : retour à l’administration', ST.s.role === 'admin');
  r = await C.api('admin_voir_comme', { cr: 'touraine-poitou' }).catch(e => e.message);
  verifier('S12 : réservé aux CR en démonstration', /réservé aux CR en démonstration/.test(r), r);

  /* ---------- point de vue expert d'une CR pilote ---------- */
  T.C.CHANGES.perspective({ value: 'expert_pilote' }); await attendre(40); h = T.app();
  verifier('CR pilote : sigle PILOTE dans la console', /Touraine Poitou<\/b><span class="sig pilote">PILOTE/.test(h));
  const cha = ST.leads.find(l => l.raison_sociale === 'Charcuterie Tourangelle');
  await C.ouvrir(cha.id); await attendre(); await C.dlgTransfert(); await attendre(); g = T.dlg();
  verifier('CR pilote : destinataires « Réel » et expert BRH PRO du 37 suggéré', g.includes('<span class="rf reel">Réel</span>') && /Indre-et-Loire \(37\) → expert BRH PRO du 37 : Karim Benali/.test(g));
  C.ACTIONS.fermer();

  /* ---------- démonstration ouverte un autre jour : hors délai toujours présent ---------- */
  const jours = [];
  for (let j = 0; j < 7; j++) { const X = console2(M, { jours: j }); await attendre(30); if (!/<span class="ech retard">Hors délai<\/span>/.test(X.app())) jours.push(j); }
  verifier('Démo : au moins un lead hors délai quel que soit le jour de la semaine', jours.length === 0, jours);
  verifier('Aucune erreur JavaScript dans la console', T.ctx.__erreurs.length === 0, T.ctx.__erreurs);
  bilan('Console LM 2.0 (démonstration)');
})().catch(e => { console.log('ERREUR', e && e.stack); process.exitCode = 1; });
