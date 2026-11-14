/* ==============================================================
   COCKPIT BRH — MODE DÉMONSTRATION (cockpit-brh.html?demo=1)
   Remplace lm-api.php par des données FICTIVES en mémoire, avec les mêmes
   règles de gestion que lm-base.php (niveaux, délais en jours ouvrés, routage A / B,
   workflow en 6 statuts, volets filiales, e-mails journalisés). Rien n'est enregistré
   ni envoyé : un rechargement de la page remet la démonstration à zéro.
   ============================================================== */
(function(){
  'use strict';
  /* ---------------- référentiels (copie de lm-base.php) ---------------- */
  var NIV = {
    ultra_chaud:{ lib:'Ultra-chaud', prio:1, delai:'Sous 24 h ouvrées', jours:1, declencheur:'Offre configurée avec ses options, coordonnées données pour finaliser', traitement:'Rappel prioritaire pour finaliser le devis ; données pré-alimentant Prévis, Universels, Worklife', message:'Votre expert vous rappelle pour finaliser' },
    chaud:{ lib:'Chaud', prio:2, delai:'Sous 48 h ouvrées', jours:2, declencheur:'Offre choisie en début de devis, parcours interrompu avant la fin (ou demande de contact)', traitement:'Appel de l’expert ou du conseiller pour lever le blocage ; e-mail de reprise du devis', message:'Reprenez votre devis là où vous l’avez laissé' },
    abandonniste:{ lib:'Abandonniste', prio:3, delai:'Relance J+1 et J+7', jours:0, declencheur:'Simulation ou label RH terminé, e-mail laissé, sans entrer dans le devis', traitement:'Relance e-mail automatique avec le résultat et un lien de reprise ; appel si l’effectif le justifie', message:'Retrouvez le résultat de votre simulation' }
  };
  var REF = {
    niveaux:NIV,
    statuts:{ depose:'Déposé', attribue:'Attribué', pris_en_charge:'Pris en charge', qualifie:'Qualifié', propose:'Proposé', cloture:'Clôturé' },
    issues:{ signe:'Signé', perdu:'Perdu', sans_suite:'Sans suite', injoignable:'Injoignable', doublon:'Doublon' },
    client:{ verifie:'Client vérifié', declare:'Client déclaré', prospect:'Prospect · KYC', inconnu:'À vérifier' },
    destinataires:{ expert_brh:'Expert BRH', expert_brh_pro:'Expert BRH PRO', conseiller_pro:'Conseiller pro', national:'File nationale' },
    canaux:{ solead:'SOLEAD', cockpit:'Cockpit BRH', crm:'CRM + alerte PUC' },
    filiales:{ caa:{ lib:'CA Assurances', outil:'Prévis', solutions:['sante'] }, amundi:{ lib:'Amundi / CA Titres', outil:'Universels', solutions:['epargne', 'retraite'] }, worklife:{ lib:'Worklife', outil:'devis e-mail', solutions:['avantages'] } },
    volet_statuts:{ a_qualifier:'En attente de qualification', en_cours:'Étude en cours', propose:'Proposition envoyée', signe:'Signé', sans_suite:'Sans suite' },
    solutions:{ epargne:'Épargne salariale', sante:'Santé & prévoyance', retraite:'Retraite collective', avantages:'Avantages salariés' },
    marches:{ pro:'Pro / entrepreneur', entreprise:'Entreprise', a_qualifier:'À qualifier' },
    roles:{ national:'National (console)', expert:'Expert BRH (CR)', filiale:'Filiale' },
    types:{ devis:'Devis en ligne', rappel_expert:'Rappel expert (devis)', diagnostic_contact:'Contact — diagnostic RH', devis_en_cours:'Devis commencé (e-mail laissé)', diagnostic_estimation:'Estimation demandée par e-mail',
            label_resultats:'Label BRH — résultats', label_contact:'Contact — Label BRH', audit_mutuelle_prevoyance:'Audit mutuelle', newsletter:'Inscription newsletter', contact:'Contact' },
    seuils:{ pro_effectif:50, pro_ca:3000000, appel_abandon:20, fusion_jours:60 }
  };
  var CRT = [['touraine-poitou', 'Touraine Poitou', '37,86', 'cockpit', 'B'], ['pyrenees-gascogne', 'Pyrénées Gascogne', '64,65,32', 'solead', 'A'], ['centre-loire', 'Centre Loire', '18,45,58', 'cockpit', 'A'],
    ['val-de-france', 'Val de France', '28,41', 'cockpit', 'A'], ['anjou-maine', 'Anjou Maine', '49,53,72', 'solead', 'A'], ['atlantique-vendee', 'Atlantique Vendée', '44,85', 'cockpit', 'A'],
    ['paris-idf', 'Paris et Île-de-France', '75,78,91,92,93,94,95', 'cockpit', 'A'], ['brie-picardie', 'Brie Picardie', '60,77,80', 'cockpit', 'A'], ['cmds', 'Charente-Maritime Deux-Sèvres', '17,79', 'solead', 'A'],
    ['centre-ouest', 'Centre Ouest', '36,87', 'cockpit', 'A'], ['aquitaine', 'Aquitaine', '33,40,47', 'cockpit', 'A'], ['nord-de-france', 'Nord de France', '59,62', 'cockpit', 'A'], ['normandie', 'Normandie', '14,50,61', 'cockpit', 'A'],
    ['normandie-seine', 'Normandie-Seine', '27,76', 'cockpit', 'A'], ['alpes-provence', 'Alpes Provence', '05,13,84', 'cockpit', 'A'], ['centre-est', 'Centre-Est', '01,69,71', 'cockpit', 'A'], ['sud-rhone-alpes', 'Sud Rhône Alpes', '07,26,38', 'cockpit', 'A'],
    ['ille-et-vilaine', 'Ille-et-Vilaine', '35', 'cockpit', 'A'], ['cotes-d-armor', 'Côtes d’Armor', '22', 'cockpit', 'A'], ['finistere', 'Finistère', '29', 'cockpit', 'A'], ['morbihan', 'Morbihan', '56', 'cockpit', 'A']];
  var CR = CRT.map(function(c){ return { code:c[0], nom:c[1], departements:c[2], canal:c[3], scenario:c[4], solead_email:c[3] === 'solead' ? 'solead.brh@' + c[0] + '.exemple.fr' : '', actif:1 }; });
  var USERS = [
    { id:1, login:'tp.expert', nom:'J. Marchand', email:'j.marchand@exemple.fr', role:'expert', cr_code:'touraine-poitou', filiale:null, referent:1, actif:1, vu_le:null },
    { id:2, login:'tp.expert2', nom:'P. Roussel', email:'p.roussel@exemple.fr', role:'expert', cr_code:'touraine-poitou', filiale:null, referent:0, actif:1, vu_le:null },
    { id:3, login:'av.expert', nom:'L. Garnier', email:'l.garnier@exemple.fr', role:'expert', cr_code:'atlantique-vendee', filiale:null, referent:1, actif:1, vu_le:null },
    { id:4, login:'pg.expert', nom:'C. Lafitte', email:'c.lafitte@exemple.fr', role:'expert', cr_code:'pyrenees-gascogne', filiale:null, referent:1, actif:1, vu_le:null },
    { id:5, login:'aq.expert', nom:'M. Darrieux', email:'m.darrieux@exemple.fr', role:'expert', cr_code:'aquitaine', filiale:null, referent:1, actif:1, vu_le:null },
    { id:6, login:'caa.prevoyance', nom:'CA Assurances — Prévis', email:'', role:'filiale', cr_code:null, filiale:'caa', referent:0, actif:1, vu_le:null },
    { id:7, login:'amundi.universels', nom:'Amundi / CA Titres — Universels', email:'', role:'filiale', cr_code:null, filiale:'amundi', referent:0, actif:1, vu_le:null },
    { id:8, login:'worklife', nom:'Worklife', email:'', role:'filiale', cr_code:null, filiale:'worklife', referent:0, actif:1, vu_le:null }
  ];
  var CLIENTS = [
    { siren:'512345678', raison_sociale:'Boulangerie Lemoine SAS', cr_code:'touraine-poitou', marche:'pro', portefeuille:'portefeuille pro, agence Tours Nord', conseiller:'A. Petit', conseiller_email:'a.petit@exemple.fr' },
    { siren:'524681357', raison_sociale:'Studio Kéa', cr_code:'touraine-poitou', marche:'pro', portefeuille:'portefeuille pro, Poitiers', conseiller:'S. Michaud', conseiller_email:'' },
    { siren:'533197428', raison_sociale:'Pharmacie des Halles', cr_code:'touraine-poitou', marche:'entreprise', portefeuille:'centre d’affaires Touraine', conseiller:'', conseiller_email:'' },
    { siren:'541278963', raison_sociale:'Cabinet Arvel Avocats', cr_code:'touraine-poitou', marche:'pro', portefeuille:'portefeuille professions libérales', conseiller:'', conseiller_email:'' }
  ];

  /* ---------------- dates et jours ouvrés ---------------- */
  var H = 3600e3, NOW = Date.now();
  function iso(t){ var d = new Date(t), p = function(n){ return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':00'; }
  function ts(s){ return s ? new Date(String(s).replace(' ', 'T')).getTime() : null; }
  function paques(a){ var b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * (a % 19) + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor(((a % 19) + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), j = ((h + l - 7 * m + 114) % 31) + 1; return new Date(a, mo - 1, j); }
  function ferie(d){ var a = d.getFullYear(), k = (d.getMonth() + 1) + '-' + d.getDate(); if (['1-1', '5-1', '5-8', '7-14', '8-15', '11-1', '11-11', '12-25'].indexOf(k) >= 0) return true;
    var p = paques(a); return [1, 39, 50].some(function(n){ var x = new Date(p.getTime()); x.setDate(x.getDate() + n); return x.toDateString() === d.toDateString(); }); }
  function ouvre(d){ var w = d.getDay(); return w !== 0 && w !== 6 && !ferie(d); }
  function plusOuvres(t, n){ var d = new Date(t); if (!ouvre(d)) { do { d.setDate(d.getDate() + 1); } while (!ouvre(d)); d.setHours(9, 0, 0, 0); }
    for (var i = 0; i < n; i++) { do { d.setDate(d.getDate() + 1); } while (!ouvre(d)); } return d.getTime(); }
  function plusJours(t, n, h){ var d = new Date(t); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d.getTime(); }
  function echeance(niv, t, rappel){ if (rappel && niv !== 'abandonniste') return plusOuvres(t, 1); if (niv === 'abandonniste') return plusJours(t, 7, 18); return plusOuvres(t, NIV[niv].jours); }
  function dfr(t){ var d = new Date(t); return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }).replace(':', 'h'); }

  /* ---------------- jeu de données fictif ---------------- */
  var D = [], J = [], E = [], seq = 4800, eseq = 1;
  function crDe(dep){ for (var i = 0; i < CR.length; i++) if (CR[i].departements.split(',').indexOf(dep) >= 0) return CR[i]; return null; }
  function referent(cr){ return USERS.filter(function(u){ return u.role === 'expert' && u.actif && u.cr_code === cr; }).sort(function(a, b){ return b.referent - a.referent; })[0] || null; }
  function journal(d, t, action, detail, u){ J.push({ dossier_id:d.id, cree_le:iso(t), acteur:u ? u.nom + ' · ' + REF.roles[u.role] : 'Portail (automatique)', action:action, detail:detail }); }
  function email(d, t, modele, a, objet, corps){ E.push({ id:eseq++, dossier_id:d ? d.id : null, reference:d ? d.reference : null, cree_le:iso(t), modele:modele, destinataire:a || '', envoye_a:null, objet:objet, corps:corps, statut:a ? 'journal' : 'sans_adresse' }); }
  function bonjour(d){ return 'Bonjour' + (d.prenom ? ' ' + d.prenom : '') + ',\n\n'; }
  function suivi(d){ return 'suivi-dossier.html?d=' + d.reference + '&j=' + d.jeton; }
  function resume(d){ var cr = CR.filter(function(c){ return c.code === d.cr_code; })[0];
    return 'Dossier ' + d.reference + ' · lead ' + NIV[d.niveau].lib + ' (' + NIV[d.niveau].delai + ')\nEntreprise : ' + (d.raison_sociale || '—') + (d.siret ? ' · SIRET ' + d.siret : '') + ' · ' + d.code_postal + ' ' + d.ville + '\nEffectif : ' + (d.effectif || '—') + ' · ' + REF.client[d.client_statut] + '\nContact : ' + d.prenom + ' ' + d.nom + ' · ' + (d.telephone || 'tél. non renseigné') + ' · ' + d.email + '\nSynthèse : ' + (d.synthese || '—') + (cr ? '\nCaisse régionale : ' + cr.nom : '') + '\n\nOuvrir le dossier dans le cockpit BRH : cockpit-brh.html#d=' + d.id; }
  function marche(eff, ca){ if (eff == null && ca == null) return 'a_qualifier'; return (eff != null && eff < 50) || (ca && ca < 3e6) ? 'pro' : 'entreprise'; }
  function volets(sol, niv, ex){ var v = ex || {}; Object.keys(REF.filiales).forEach(function(f){ if (v[f] || !REF.filiales[f].solutions.some(function(s){ return sol.indexOf(s) >= 0; })) return;
    v[f] = { statut:(f === 'worklife' && niv === 'ultra_chaud') ? 'propose' : 'a_qualifier', maj:iso(NOW), note:(f === 'worklife' && niv === 'ultra_chaud') ? 'Devis Worklife envoyé par e-mail au dirigeant' : '' }; }); return v; }
  function setStatut(d, st, t){ d.statut = st; d.statut_le = iso(t); d.jalons = d.jalons || {}; if (!d.jalons[st]) d.jalons[st] = iso(t); }
  function router(d, t, u){
    var cr = crDe(d.departement), cl = CLIENTS.filter(function(c){ return c.siren === String(d.siret || '').slice(0, 9); })[0];
    d.marche = marche(d.effectif, d.ca); d.scenario = 'A';
    var crCl = cl ? CR.filter(function(c){ return c.code === cl.cr_code; })[0] : null;
    if (cl && ((cr && cr.scenario === 'B') || (crCl && crCl.scenario === 'B'))) {
      var m = cl.marche === 'pro' ? 'pro' : 'entreprise', dest = m === 'pro' ? (cl.conseiller ? 'conseiller_pro' : 'expert_brh_pro') : 'expert_brh', ex = referent(cl.cr_code);
      Object.assign(d, { scenario:'B', client_statut:'verifie', cr_code:cl.cr_code, marche:m, destinataire:dest, canal:'crm', portefeuille:cl.portefeuille + (cl.conseiller ? ' · ' + cl.conseiller : ''), conseiller_pro:dest === 'conseiller_pro' ? cl.conseiller : null, user_id:ex ? ex.id : null });
      setStatut(d, 'attribue', t);
      var crm = m === 'pro' ? 'CRM PART/PRO' : 'CRM ENTREPRISE';
      journal(d, t, 'routage', 'Scénario B (simulé) : SIRET rapproché de la base clients — client vérifié, ' + crCl.nom + ', ' + REF.marches[m] + ' (' + d.portefeuille + '). Lead poussé dans le ' + crm + ', alerte PUC « un lead est arrivé » → ' + REF.destinataires[dest] + '.', u);
      email(d, t, 'interne_crm', dest === 'conseiller_pro' ? cl.conseiller_email : (ex && ex.email), '[' + crm + ' · alerte PUC] Un lead est arrivé : ' + d.raison_sociale, resume(d) + '\n(Scénario B simulé.)');
      return;
    }
    d.client_statut = d.client_declare === 'oui' ? 'declare' : (d.client_declare === 'non' ? 'prospect' : 'inconnu');
    if (!cr) { Object.assign(d, { cr_code:null, destinataire:'national', canal:'cockpit', user_id:null }); setStatut(d, 'depose', t);
      journal(d, t, 'routage', 'Scénario A : ' + (d.departement ? 'département ' + d.departement + ' absent de la table des CR' : 'département inconnu') + ' — dossier placé dans la file nationale, à attribuer.', u); return; }
    var e = referent(cr.code);
    Object.assign(d, { cr_code:cr.code, destinataire:'expert_brh', canal:cr.canal, user_id:e ? e.id : null }); setStatut(d, e ? 'attribue' : 'depose', t);
    journal(d, t, 'routage', 'Scénario A : département ' + d.departement + ' → ' + cr.nom + ' → ' + (e ? 'expert BRH ' + e.nom : 'experts BRH de la CR (pas de référent)') + ' via ' + REF.canaux[d.canal] + (d.marche === 'pro' ? ' — pro / entrepreneur : à confier au conseiller pro' : '') + (cl === undefined && cr.scenario === 'B' && d.siret ? ' (SIRET non trouvé : prospect, routage par département)' : '') + '.', u);
    if (d.canal === 'solead') email(d, t, 'interne_solead', cr.solead_email, '[SOLEAD] Lead ' + NIV[d.niveau].lib + ' ' + d.reference + ' — ' + d.raison_sociale, resume(d));
    else email(d, t, 'interne_nouveau', e && e.email, 'Cockpit BRH : un lead ' + NIV[d.niveau].lib.toLowerCase() + ' est arrivé — ' + d.raison_sociale, resume(d));
  }
  /* un dossier = un dirigeant ; « leads » = demandes successives du portail */
  function creer(o){
    var t = NOW - o.h * H, id = ++seq, niv = o.leads[o.leads.length - 1].niveau;
    var d = { id:id, reference:'BRH-26-00' + id, cree_le:iso(t), maj_le:iso(t), version:'C', jeton:'demo' + id, raison_sociale:o.rs, prenom:o.pr, nom:o.nm, fonction:o.fn || 'Gérant', telephone:o.tel || '', email:o.mail,
      siret:o.siret || '', code_postal:o.cp, ville:o.ville, departement:o.cp.slice(0, 2), effectif:o.eff, ca:o.ca || null, secteur:o.sect, idcc:o.idcc || '', niveau:niv, niveau_le:iso(t), rappel:!!o.rappel,
      statut:'depose', statut_le:iso(t), issue:null, scenario:'A', client_statut:'inconnu', client_declare:o.decl || null, portefeuille:null, marche:null, cr_code:null, destinataire:null, canal:null, user_id:null, conseiller_pro:null,
      echeance:null, pris_le:null, rdv_le:null, relances:0, prochaine_relance:null, consent_relance:true, montant:o.mt == null ? null : o.mt, solutions:o.sol || [], volets:{}, synthese:o.syn, resultat:o.res || '', origine:o.leads[0].type, jalons:{ depose:iso(t) }, leads:[] };
    o.leads.forEach(function(l, i){ var tl = t + (l.dh || 0) * H; d.leads.push({ id:9000 + id * 10 + i, cree_le:iso(tl), type:l.type, type_lib:REF.types[l.type], etape:l.etape || null, reference:l.type === 'devis' ? 'DEV-2026-' + (id * 7).toString(36).toUpperCase() : null, niveau:l.niveau,
      panier:l.panier || null, rh:l.rh || null, estimation:l.estimation == null ? null : l.estimation, priorites:null, gain:l.gain == null ? null : l.gain, label:l.label || null }); });
    d.volets = volets(d.solutions, niv, {});
    var te = t + ((o.leads[o.leads.length - 1].dh) || 0) * H;
    d.echeance = iso(echeance(niv, te, d.rappel));
    if (niv === 'abandonniste') d.prochaine_relance = iso(plusJours(t, 1, 10));
    D.push(d);
    journal(d, t, 'creation', 'Dossier ' + d.reference + ' créé : ' + REF.types[o.leads[0].type] + ' — lead ' + NIV[o.leads[0].niveau].lib + ' (' + NIV[o.leads[0].niveau].delai + ')');
    router(d, t + 60e3);
    o.leads.slice(1).forEach(function(l){ journal(d, t + (l.dh || 0) * H, 'fusion', REF.types[l.type] + ' rattaché au dossier — niveau relevé : ' + NIV[o.leads[0].niveau].lib + ' → ' + NIV[l.niveau].lib + ' (' + NIV[l.niveau].delai + ')'); });
    if (niv === 'ultra_chaud') email(d, te, 'dirigeant_ultra', d.email, 'Votre demande ' + d.reference + ' : votre expert vous rappelle pour finaliser', bonjour(d) + 'Votre demande de devis est bien reçue (référence ' + d.reference + ').\nVotre expert Banque des Ressources Humaines vous rappelle pour finaliser votre devis, avec votre dossier sous les yeux : vous n’aurez rien à ressaisir.\n\nSuivre votre dossier : ' + suivi(d));
    (o.suite || []).forEach(function(s){ var u = USERS.filter(function(x){ return x.id === d.user_id; })[0] || USERS[0], tt = t + s[1] * H;
      if (s[0] === 'pec') { d.pris_le = iso(tt); setStatut(d, 'pris_en_charge', tt); journal(d, tt, 'statut', 'Attribué → Pris en charge — pris en charge par ' + u.nom, u);
        email(d, tt, 'dirigeant_prise_en_charge', d.email, 'Votre demande ' + d.reference + ' est prise en charge', bonjour(d) + 'Votre demande est prise en charge par ' + u.nom + ', expert Banque des Ressources Humaines.\n\nSuivre votre dossier : ' + suivi(d)); }
      if (s[0] === 'rdv') { d.rdv_le = iso(NOW + s[2] * H); setStatut(d, 'qualifie', tt); journal(d, tt, 'statut', 'Pris en charge → Qualifié — Rendez-vous planifié le ' + dfr(NOW + s[2] * H) + ' (visio)', u); }
      if (s[0] === 'prop') { setStatut(d, 'propose', tt); journal(d, tt, 'statut', 'Qualifié → Proposé — Proposition remise au dirigeant', u); }
      if (s[0] === 'volet') { d.volets[s[2]] = { statut:s[3], maj:iso(tt), note:s[4] || '' }; journal(d, tt, 'volet', REF.filiales[s[2]].lib + ' (' + REF.filiales[s[2]].outil + ') : ' + REF.volet_statuts[s[3]], USERS.filter(function(x){ return x.filiale === s[2]; })[0]); }
      if (s[0] === 'clos') { d.issue = s[2]; setStatut(d, 'cloture', tt); d.prochaine_relance = null; journal(d, tt, 'statut', 'Proposé → Clôturé — issue : ' + REF.issues[s[2]], u); }
      if (s[0] === 'relance') { d.relances = s[2]; d.prochaine_relance = s[2] === 1 ? iso(plusJours(t, 7, 10)) : null; journal(d, tt, 'relance', 'Relance J+' + (s[2] === 1 ? '1' : '7') + ' « Retrouvez le résultat de votre simulation » (journalisé, envoi désactivé)');
        email(d, tt, 'dirigeant_abandon_j' + (s[2] === 1 ? '1' : '7'), d.email, 'Retrouvez le résultat de votre simulation', bonjour(d) + 'Merci d’avoir réalisé votre simulation sur le portail Banque des Ressources Humaines.\n\nVotre résultat :\n' + d.resultat + '\n\nReprendre : diagnostic.html\nObtenir votre devis en ligne : devis.html'); }
      if (s[0] === 'pro') { d.conseiller_pro = s[2]; d.destinataire = 'conseiller_pro'; journal(d, tt, 'dispatch', 'Confié au conseiller pro ' + s[2] + ' par l’expert BRH (pro / entrepreneur)', u); }
      if (s[0] === 'alerte') { journal(d, tt, 'alerte', 'Délai cible dépassé (' + NIV[d.niveau].delai + ') : alerte envoyée à ' + (u ? u.nom : 'la CR') + ' et signalée à la console nationale'); email(d, tt, 'interne_alerte', u && u.email, 'Délai dépassé : dossier ' + d.reference, resume(d)); }
      d.maj_le = iso(tt);
    });
    return d;
  }
  var PS = function(f){ return { solution:'sante', libelle:'Santé & prévoyance', formule:f || 'Confort', hypotheses:['Mutuelle conforme à la convention', 'Part employeur 60 %', 'Prévoyance socle non-cadres'] }; };
  var PE = function(f){ return { solution:'epargne', libelle:'Épargne salariale', formule:f || 'Découverte', hypotheses:['PEE + intéressement', 'Abondement 300 € / salarié'] }; };
  var PA = { solution:'avantages', libelle:'Avantages salariés', formule:null, hypotheses:['Titres-restaurant à 10 €', 'Part employeur 60 %'] };
  var PR = { solution:'retraite', libelle:'Retraite collective', formule:'Intégrale', hypotheses:['PERCOL', 'Abondement 2 % du salaire'] };
  var RH = function(n, c){ return { salaries_concernes:n, cadres:c, non_cadres:n - c, tranche_salaire:'25_35' }; };
  [
    { h:20, rs:'Boulangerie Lemoine SAS', pr:'Claire', nm:'Lemoine', mail:'c.lemoine@exemple.fr', tel:'06 12 34 56 78', siret:'51234567800021', cp:'37000', ville:'Tours', eff:18, sect:'Artisanat alimentaire', idcc:'843 — Boulangerie-pâtisserie artisanale', decl:'oui', sol:['sante', 'epargne', 'avantages'], mt:21400,
      syn:'boulangerie de 18 salariés ; mutuelle conforme à la convention (60 % employeur), épargne salariale (Découverte), titres-restaurant à 10 €.', leads:[{ type:'devis_en_cours', niveau:'chaud', etape:'Votre entreprise' }, { type:'devis', niveau:'ultra_chaud', dh:0.4, estimation:21400, panier:[PS(), PE(), PA], rh:RH(18, 2) }] },
    { h:30, rs:'Transports Valmy', pr:'Karim', nm:'Benali', mail:'k.benali@exemple.fr', tel:'06 22 41 18 90', siret:'80214365700017', cp:'86000', ville:'Poitiers', eff:42, sect:'Transport et logistique', idcc:'16 — Transports routiers', decl:'non', sol:['sante', 'retraite'], mt:48200,
      syn:'transporteur de 42 salariés ; santé et prévoyance (Renfort), retraite collective (PERCOL).', leads:[{ type:'devis', niveau:'ultra_chaud', estimation:48200, panier:[PS('Renfort'), PR], rh:RH(42, 6) }], suite:[['pec', 3], ['rdv', 5, 30], ['prop', 22], ['volet', 23, 'caa', 'propose', 'Proposition Prévis envoyée']] },
    { h:26, rs:'Cabinet Arvel Avocats', pr:'Sophie', nm:'Arvel', mail:'s.arvel@exemple.fr', tel:'06 31 52 77 04', siret:'54127896300012', cp:'37100', ville:'Tours', eff:7, sect:'Services aux entreprises', idcc:'1000 — Cabinets d’avocats', decl:'oui', sol:['epargne'],
      syn:'cabinet de 7 salariés ; épargne salariale choisie, devis interrompu à la configuration.', leads:[{ type:'devis_en_cours', niveau:'chaud', etape:'Configuration' }], suite:[['pec', 4], ['rdv', 6, 50]] },
    { h:44, rs:'Studio Kéa', pr:'Hugo', nm:'Kéa', mail:'h.kea@exemple.fr', tel:'07 61 22 90 13', siret:'52468135700034', cp:'86100', ville:'Châtellerault', eff:12, sect:'Services aux entreprises', decl:'oui', sol:['avantages', 'epargne'],
      syn:'studio de 12 salariés ; avantages salariés et épargne choisis, parcours interrompu.', leads:[{ type:'devis_en_cours', niveau:'chaud', etape:'Vos salariés' }], suite:[['pec', 20], ['pro', 21, 'S. Michaud, agence Poitiers']] },
    { h:150, rs:'Garage Morel', pr:'Denis', nm:'Morel', mail:'d.morel@exemple.fr', cp:'37200', ville:'Tours', eff:9, sect:'Commerce', decl:'oui', res:'Gain fiscal estimé : 5 400 € / an\nPriorités : pouvoir d’achat, protection sociale',
      syn:'garage de 9 salariés ; simulation faite (gain fiscal estimé 5 400 € / an), sans entrer dans le devis.', leads:[{ type:'diagnostic_estimation', niveau:'abandonniste', gain:5400 }], suite:[['relance', 24, 1]] },
    { h:200, rs:'Pharmacie des Halles', pr:'Inès', nm:'Garnier', mail:'i.garnier@exemple.fr', tel:'06 44 18 27 65', siret:'53319742800019', cp:'37000', ville:'Tours', eff:24, sect:'Santé et social', idcc:'1996 — Pharmacie d’officine', sol:['sante', 'avantages'], mt:30900,
      syn:'officine de 24 salariés ; santé et prévoyance conformes à la branche, titres-restaurant.', leads:[{ type:'devis', niveau:'ultra_chaud', estimation:30900, panier:[PS(), PA], rh:RH(24, 3) }],
      suite:[['pec', 2], ['rdv', 4, -100], ['prop', 50], ['volet', 60, 'caa', 'signe', 'Contrat Prévis signé'], ['volet', 61, 'worklife', 'signe', ''], ['clos', 62, 'signe']] },
    { h:5, rs:'Menuiserie Doré', pr:'Julien', nm:'Doré', mail:'j.dore@exemple.fr', tel:'06 70 55 31 08', siret:'83355120400015', cp:'85500', ville:'Les Herbiers', eff:23, sect:'BTP', idcc:'2609 — ETAM du bâtiment (+ IDCC 2420)', decl:'nsp', sol:['sante', 'epargne'], mt:26100,
      syn:'menuiserie de 23 salariés ; deux conventions déclarées (ETAM 2609, cadres 2420) ; santé et prévoyance, épargne salariale.', leads:[{ type:'devis', niveau:'ultra_chaud', estimation:26100, panier:[PS(), PE('Intégrale')], rh:RH(23, 3) }] },
    { h:52, rs:'Clinique vétérinaire des Pins', pr:'Nathalie', nm:'Brun', mail:'n.brun@exemple.fr', tel:'06 18 92 44 70', cp:'33600', ville:'Pessac', eff:16, sect:'Santé et social', decl:'non', sol:['sante'], rappel:true,
      syn:'clinique de 16 salariés ; rappel demandé pendant le devis santé et prévoyance.', leads:[{ type:'rappel_expert', niveau:'chaud' }], suite:[['alerte', 30]] },
    { h:70, rs:'Atelier Numérique Sorel', pr:'Lucas', nm:'Sorel', mail:'l.sorel@exemple.fr', cp:'64100', ville:'Bayonne', eff:31, sect:'Services aux entreprises', res:'Score Label BRH : 62/100 (Engagé)', decl:'non',
      syn:'agence numérique de 31 salariés ; diagnostic Label RH terminé (62/100), sans devis.', leads:[{ type:'label_resultats', niveau:'abandonniste', label:{ score:62, level:'Engagé' } }], suite:[['relance', 24, 1]] },
    { h:3, rs:'Domaine Laborde', pr:'Marie', nm:'Laborde', mail:'m.laborde@exemple.fr', tel:'06 09 87 12 33', cp:'32000', ville:'Auch', eff:8, sect:'Agriculture et paysage', decl:'oui', sol:['epargne', 'avantages'], mt:7800,
      syn:'domaine viticole de 8 salariés ; épargne salariale et avantages salariés configurés.', leads:[{ type:'devis', niveau:'ultra_chaud', estimation:7800, panier:[PE(), PA], rh:RH(8, 1) }] },
    { h:9, rs:'Agence Cap Ouest', pr:'Thomas', nm:'Le Goff', mail:'t.legoff@exemple.fr', cp:'44000', ville:'Nantes', eff:14, sect:'Services aux entreprises', decl:'non', res:'Gain fiscal estimé : 8 400 € / an\nPriorités : partage de la valeur',
      syn:'agence de 14 salariés ; simulation faite (gain fiscal estimé 8 400 € / an).', leads:[{ type:'diagnostic_estimation', niveau:'abandonniste', gain:8400 }] },
    { h:28, rs:'Imprimerie Martel', pr:'Éric', nm:'Martel', mail:'e.martel@exemple.fr', tel:'05 49 21 33 10', cp:'86000', ville:'Poitiers', eff:19, sect:'Industrie', decl:'non', sol:['sante'],
      syn:'imprimerie de 19 salariés ; demande de contact après le diagnostic RH (priorité protection sociale).', leads:[{ type:'diagnostic_contact', niveau:'chaud' }] },
    { h:6, rs:'Hôtel du Port', pr:'Anne', nm:'Rivière', mail:'a.riviere@exemple.fr', tel:'06 55 44 33 22', cp:'17000', ville:'La Rochelle', eff:27, sect:'Hôtellerie-restauration', idcc:'1979 — HCR', decl:'oui', sol:['sante', 'avantages'], mt:29800,
      syn:'hôtel de 27 salariés ; santé et prévoyance HCR, titres-restaurant.', leads:[{ type:'devis', niveau:'ultra_chaud', estimation:29800, panier:[PS(), PA], rh:RH(27, 2) }] },
    { h:30, rs:'Sarl Bati-Loire', pr:'Paul', nm:'Chevalier', mail:'p.chevalier@exemple.fr', cp:'49000', ville:'Angers', eff:36, sect:'BTP', decl:'nsp', sol:['sante'],
      syn:'entreprise du bâtiment de 36 salariés ; devis santé et prévoyance commencé, arrêté à la convention collective.', leads:[{ type:'devis_en_cours', niveau:'chaud', etape:'Votre entreprise' }] },
    { h:12, rs:'Crèche Les Lutins', pr:'Fatou', nm:'Diallo', mail:'f.diallo@exemple.fr', tel:'06 77 66 55 44', cp:'20000', ville:'Ajaccio', eff:11, sect:'Santé et social', decl:'non', sol:['sante'],
      syn:'crèche de 11 salariés ; département 2A absent de la table de démonstration.', leads:[{ type:'audit_mutuelle_prevoyance', niveau:'chaud' }] }
  ].forEach(creer);

  /* ---------------- vues ---------------- */
  var SES = null;
  function nomCr(c){ var x = CR.filter(function(r){ return r.code === c; })[0]; return x ? x.nom : null; }
  function nomU(id){ var u = USERS.filter(function(x){ return x.id === id; })[0]; return u ? u.nom : null; }
  function sla(d){
    var e = ts(d.echeance), p = ts(d.pris_le), now = Date.now(), dur = function(s){ var h = Math.floor(s / H); return h >= 48 ? Math.floor(h / 24) + ' j' : (h >= 1 ? h + ' h' : Math.max(1, Math.floor(s / 60e3)) + ' min'); };
    if (d.statut === 'cloture' && !p) return { etat:'clos', lib:'Clôturé' };
    if (p) return e && p > e ? { etat:'hors_delai', lib:'Pris en charge hors délai' } : { etat:'tenu', lib:'Pris en charge dans le délai' };
    if (!e) return { etat:'ok', lib:'' };
    if (d.niveau === 'abandonniste') return { etat:'relance', lib:['Relance J+1 à venir', 'Relance J+7 à venir', 'Relances faites'][Math.min(2, d.relances)] };
    if (e < now) return { etat:'retard', lib:'En retard de ' + dur(now - e) };
    if (e - now < 4 * H) return { etat:'proche', lib:'Échéance dans ' + dur(e - now) };
    return { etat:'ok', lib:'avant le ' + new Date(e).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }) + ' à ' + new Date(e).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }).replace(':', 'h') };
  }
  function item(d){ return { id:d.id, reference:d.reference, cree_le:d.cree_le, maj_le:d.maj_le, raison_sociale:d.raison_sociale, contact:d.prenom + ' ' + d.nom, effectif:d.effectif, ville:d.ville, departement:d.departement,
    niveau:d.niveau, statut:d.statut, issue:d.issue, client_statut:d.client_statut, scenario:d.scenario, marche:d.marche, cr_code:d.cr_code, cr_nom:nomCr(d.cr_code), user_id:d.user_id, expert:nomU(d.user_id),
    destinataire:d.destinataire, canal:d.canal, echeance:d.echeance, pris_le:d.pris_le, rdv_le:d.rdv_le, montant:d.montant, solutions:d.solutions, volets:d.volets, origine:d.origine, rappel:d.rappel, sla:sla(d) }; }
  function voit(u, d){ if (u.role === 'national') return true; if (u.role === 'expert') return d.cr_code === u.cr_code; return !!d.volets[u.filiale]; }
  var ORD = { ultra_chaud:0, chaud:1, abandonniste:2 }, SO = { depose:0, attribue:1, pris_en_charge:2, qualifie:3, propose:4, cloture:5 };
  function ok(o){ return Promise.resolve(Object.assign({ ok:true }, o || {})); }
  function ko(m){ return Promise.resolve({ ok:false, error:m }); }
  function trouver(id){ return D.filter(function(d){ return d.id === +id; })[0]; }
  function statut(d, st, detail, u){ var av = REF.statuts[d.statut]; if (st !== 'cloture' && ['pris_en_charge', 'qualifie', 'propose'].indexOf(st) >= 0 && !d.pris_le) d.pris_le = iso(Date.now()); setStatut(d, st, Date.now()); d.maj_le = iso(Date.now()); journal(d, Date.now(), 'statut', av + ' → ' + REF.statuts[st] + (detail ? ' — ' + detail : ''), u); }
  function avancer(d, st, detail, u){ if (SO[st] > SO[d.statut]) statut(d, st, detail, u); else if (detail) { journal(d, Date.now(), 'action', detail, u); d.maj_le = iso(Date.now()); } }

  var API = {
    moi:function(){ if (!SES) return ok({ connecte:false, configure:true }); return ok({ connecte:true, csrf:'demo', user:SES, envoi:false, redirection:false, scenario_b:true, ref:REF, cr:CR.filter(function(c){ return c.actif; }).map(function(c){ return { code:c.code, nom:c.nom, departements:c.departements, canal:c.canal, scenario:c.scenario }; }) }); },
    connexion:function(p, b){ if (b.login === 'national') SES = { id:0, login:'national', nom:'Équipe nationale', email:'', role:'national', cr_code:null, filiale:null };
      else { var u = USERS.filter(function(x){ return x.login === b.login && x.actif; })[0]; if (!u) return ko('Profil de démonstration inconnu.'); u.vu_le = iso(Date.now()); SES = { id:u.id, login:u.login, nom:u.nom, email:u.email, role:u.role, cr_code:u.cr_code, filiale:u.filiale }; }
      return ok(); },
    deconnexion:function(){ SES = null; return ok(); },
    dossiers:function(p){
      var L = D.filter(function(d){ return voit(SES, d); }), all = L.slice(), q = (p.q || '').toLowerCase();
      if ((p.vue || 'actifs') === 'actifs') L = L.filter(function(d){ return d.statut !== 'cloture'; }); else if (p.vue === 'clotures') L = L.filter(function(d){ return d.statut === 'cloture'; });
      ['niveau', 'statut', 'client_statut'].forEach(function(k){ if (p[k]) L = L.filter(function(d){ return d[k] === p[k]; }); });
      if (p.cr === '_aucune') L = L.filter(function(d){ return !d.cr_code; }); else if (p.cr) L = L.filter(function(d){ return d.cr_code === p.cr; });
      if (p.sla === 'retard') L = L.filter(function(d){ return ['depose', 'attribue'].indexOf(d.statut) >= 0 && d.niveau !== 'abandonniste' && ts(d.echeance) < Date.now(); });
      if (p.moi === '1') L = L.filter(function(d){ return d.user_id === SES.id; });
      if (q) L = L.filter(function(d){ return [d.reference, d.raison_sociale, d.nom, d.email, d.siret, d.ville].join(' ').toLowerCase().indexOf(q) >= 0; });
      L.sort(function(a, b){ return ((a.statut === 'cloture') - (b.statut === 'cloture')) || (ORD[a.niveau] - ORD[b.niveau]) || ((ts(a.echeance) || 9e15) - (ts(b.echeance) || 9e15)) || (b.id - a.id); });
      var k = { ultra_chaud:0, chaud:0, abandonniste:0, retard:0, a_attribuer:0, volets_proposition:0, volets_signes:0, clotures:0, signes:0 };
      all.forEach(function(d){ Object.keys(d.volets).forEach(function(f){ if (SES.role === 'filiale' && f !== SES.filiale) return; if (d.volets[f].statut === 'propose') k.volets_proposition++; if (d.volets[f].statut === 'signe') k.volets_signes++; });
        if (d.statut === 'cloture') { k.clotures++; return; } k[d.niveau]++;
        if (['depose', 'attribue'].indexOf(d.statut) >= 0 && d.niveau !== 'abandonniste' && ts(d.echeance) < Date.now()) k.retard++;
        if (d.statut === 'depose' && !d.user_id) k.a_attribuer++; });
      return ok({ dossiers:L.map(item), kpi:k });
    },
    dossier:function(p){
      var d = trouver(p.id); if (!d || !voit(SES, d)) return ko('Dossier introuvable.');
      var x = Object.assign(item(d), { email:d.email, prenom:d.prenom, nom:d.nom, telephone:d.telephone, fonction:d.fonction, siret:d.siret, code_postal:d.code_postal, secteur:d.secteur, idcc:d.idcc, ca:d.ca,
        client_declare:d.client_declare, portefeuille:d.portefeuille, conseiller_pro:d.conseiller_pro, synthese:d.synthese, resultat:d.resultat, niveau_le:d.niveau_le, statut_le:d.statut_le, relances:d.relances,
        prochaine_relance:d.prochaine_relance, consent_relance:d.consent_relance, version:'C', jalons:d.jalons, lien_suivi:'suivi-dossier.html?demo=1&d=' + d.reference + '&j=' + d.jeton });
      var em = E.filter(function(e){ return e.dossier_id === d.id; }).reverse(); if (SES.role === 'filiale') em = em.filter(function(e){ return e.modele.indexOf('dirigeant_') === 0; });
      return ok({ dossier:x, leads:d.leads, journal:J.filter(function(j){ return j.dossier_id === d.id; }).slice().reverse(), emails:em,
        experts:USERS.filter(function(u){ return u.role === 'expert' && u.actif && u.cr_code === d.cr_code; }).map(function(u){ return { id:u.id, nom:u.nom, referent:u.referent }; }) });
    },
    action:function(p, b){
      var d = trouver(b.id); if (!d || !voit(SES, d)) return ko('Dossier introuvable.');
      var u = SES, t = b.type, note = (b.note || '').trim(), now = Date.now(), NAT = u.role === 'national';
      if (u.role === 'filiale' && ['volet', 'note'].indexOf(t) < 0) return ko('Une filiale fait avancer son volet ; l’expert BRH reste maître du dossier.');
      if (d.statut === 'cloture' && ['rouvrir', 'note', 'supprimer', 'volet'].indexOf(t) < 0) return ko('Dossier clôturé : rouvrez-le d’abord.');
      switch (t) {
        case 'prendre_en_charge': if (u.id) d.user_id = u.id; avancer(d, 'pris_en_charge', 'pris en charge par ' + u.nom, u);
          if (!E.some(function(e){ return e.dossier_id === d.id && e.modele === 'dirigeant_prise_en_charge'; })) { email(d, now, 'dirigeant_prise_en_charge', d.email, 'Votre demande ' + d.reference + ' est prise en charge', bonjour(d) + 'Votre demande est prise en charge par ' + u.nom + ', expert Banque des Ressources Humaines' + (nomCr(d.cr_code) ? ' du Crédit Agricole ' + nomCr(d.cr_code) : '') + '.\nVotre expert vous contacte pour faire le point avec vous.\n\nSuivre votre dossier : ' + suivi(d));
            journal(d, now, 'email', 'E-mail au dirigeant « Votre demande est prise en charge par ' + u.nom + ' » (journalisé, envoi désactivé)', u); } break;
        case 'appel': var R = { joint:'dirigeant joint', messagerie:'messagerie, message laissé', injoignable:'injoignable', rappeler:'à rappeler', faux_numero:'numéro erroné' }; avancer(d, 'pris_en_charge', 'Appel : ' + R[b.resultat] + (note ? ' — ' + note : ''), u); if (!d.pris_le) d.pris_le = iso(now); break;
        case 'rdv': if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) return ko('Date du rendez-vous invalide.'); var M = { telephone:'téléphone', visio:'visio', agence:'agence', sur_site:'dans l’entreprise' };
          d.rdv_le = b.date + ' ' + (b.heure || '10:00') + ':00'; if (!d.pris_le) d.pris_le = iso(now); avancer(d, 'qualifie', 'Rendez-vous planifié le ' + dfr(ts(d.rdv_le)) + ' (' + M[b.mode] + ')' + (note ? ' — ' + note : ''), u);
          email(d, now, 'dirigeant_rdv', d.email, 'Votre rendez-vous Banque des RH du ' + dfr(ts(d.rdv_le)), bonjour(d) + 'Votre rendez-vous avec ' + u.nom + ' est confirmé le ' + dfr(ts(d.rdv_le)) + ' (' + M[b.mode] + ').\n\nSuivre votre dossier : ' + suivi(d)); journal(d, now, 'email', 'Confirmation de rendez-vous au dirigeant (journalisé, envoi désactivé)', u); break;
        case 'qualifier': if (REF.marches[b.marche]) d.marche = b.marche; if (REF.client[b.client_statut]) d.client_statut = b.client_statut; if (b.effectif !== '' && b.effectif != null) d.effectif = +b.effectif; if (b.ca) d.ca = +b.ca; if (!d.pris_le) d.pris_le = iso(now);
          avancer(d, 'qualifie', 'Besoin qualifié : marché ' + REF.marches[d.marche] + ', ' + REF.client[d.client_statut] + (d.effectif ? ', ' + d.effectif + ' salariés' : '') + (note ? ' — ' + note : ''), u); break;
        case 'confier_pro': if (!b.conseiller) return ko('Indiquez le conseiller pro.'); d.conseiller_pro = b.conseiller; d.destinataire = 'conseiller_pro'; d.marche = 'pro'; journal(d, now, 'dispatch', 'Confié au conseiller pro ' + b.conseiller + ' par l’expert BRH (pro / entrepreneur)' + (note ? ' — ' + note : ''), u);
          if (b.email) { email(d, now, 'interne_conseiller_pro', b.email, 'Lead pro confié par l’expert BRH : ' + d.raison_sociale, 'Bonjour ' + b.conseiller + ',\n\n' + u.nom + ' vous confie ce lead pro.\n\n' + resume(d)); journal(d, now, 'email', 'Lead transmis par e-mail au conseiller pro (journalisé, envoi désactivé)', u); } break;
        case 'proposer': avancer(d, 'propose', 'Proposition remise au dirigeant' + (note ? ' — ' + note : ''), u); break;
        case 'cloturer': if (!REF.issues[b.issue]) return ko('Choisissez l’issue du dossier.'); d.issue = b.issue; d.prochaine_relance = null; statut(d, 'cloture', 'issue : ' + REF.issues[b.issue] + (note ? ' — ' + note : ''), u); break;
        case 'rouvrir': d.issue = null; setStatut(d, d.user_id ? 'pris_en_charge' : 'depose', now); journal(d, now, 'statut', 'Dossier rouvert' + (note ? ' — ' + note : ''), u); break;
        case 'note': if (!note) return ko('Note vide.'); journal(d, now, 'note', note, u); break;
        case 'attribuer': var x = USERS.filter(function(y){ return y.id === +b.user_id; })[0]; if (!x) return ko('Expert inconnu.'); if (!NAT && x.cr_code !== u.cr_code) return ko('Vous ne pouvez attribuer qu’à un expert de votre CR.');
          d.user_id = x.id; d.cr_code = x.cr_code; if (!d.destinataire || d.destinataire === 'national') d.destinataire = 'expert_brh';
          if (d.statut === 'depose') statut(d, 'attribue', 'attribué à ' + x.nom, u); else journal(d, now, 'attribution', 'Dossier réattribué à ' + x.nom, u);
          email(d, now, 'interne_attribution', x.email, 'Cockpit BRH : le dossier ' + d.reference + ' vous est attribué', resume(d)); break;
        case 'transferer': if (!NAT) { Object.assign(d, { cr_code:null, user_id:null, destinataire:'national' }); setStatut(d, 'depose', now); journal(d, now, 'transfert', 'Renvoyé à la file nationale par ' + u.nom + (note ? ' — ' + note : ''), u); break; }
          var cr = CR.filter(function(c){ return c.code === b.cr_code; })[0]; if (!cr) return ko('Caisse régionale inconnue.'); var ex = referent(cr.code);
          Object.assign(d, { cr_code:cr.code, user_id:ex ? ex.id : null, destinataire:'expert_brh', canal:cr.canal }); setStatut(d, ex ? 'attribue' : 'depose', now); journal(d, now, 'transfert', 'Transféré à ' + cr.nom + (ex ? ', attribué à ' + ex.nom : '') + (note ? ' — ' + note : ''), u); break;
        case 'router': if (!NAT) return ko('Action réservée à la console nationale.'); router(d, now, u); break;
        case 'niveau': if (!NAT) return ko('Action réservée à la console nationale.'); var av = d.niveau; d.niveau = b.niveau; d.niveau_le = iso(now); d.echeance = iso(echeance(d.niveau, now, d.rappel)); journal(d, now, 'niveau', 'Niveau corrigé : ' + NIV[av].lib + ' → ' + NIV[d.niveau].lib + (note ? ' — ' + note : ''), u); break;
        case 'volet': if (u.role === 'filiale' && b.filiale !== u.filiale) return ko('Vous ne pouvez faire avancer que le volet de votre filiale.');
          d.volets[b.filiale] = { statut:b.statut, maj:iso(now), note:note || (d.volets[b.filiale] || {}).note || '' }; journal(d, now, 'volet', REF.filiales[b.filiale].lib + ' (' + REF.filiales[b.filiale].outil + ') : ' + REF.volet_statuts[b.statut] + (note ? ' — ' + note : ''), u); break;
        case 'email': var MO = { reprise:['dirigeant_chaud', 'Reprenez votre devis là où vous l’avez laissé'], relance:['dirigeant_abandon_j1', 'Retrouvez le résultat de votre simulation'], prise_en_charge:['dirigeant_prise_en_charge', 'Votre demande ' + d.reference + ' est prise en charge'] }[b.modele];
          email(d, now, MO[0], d.email, MO[1], bonjour(d) + MO[1] + '.\n\nSuivre votre dossier : ' + suivi(d)); journal(d, now, 'email', 'E-mail « ' + MO[1] + ' » envoyé manuellement (journalisé, envoi désactivé)', u); break;
        case 'stop_relances': d.consent_relance = false; d.prochaine_relance = null; journal(d, now, 'relance', 'Relances automatiques arrêtées', u); break;
        case 'supprimer': if (!NAT) return ko('Action réservée à la console nationale.'); D.splice(D.indexOf(d), 1); return ok({ supprime:true });
        default: return ko('Action inconnue.');
      }
      d.maj_le = iso(now); return ok();
    },
    stats:function(){
      var z = function(){ return { n:0, ultra_chaud:0, chaud:0, abandonniste:0, pris:0, tenus:0, hors_delai:0, retard:0, dt:0, signes:0, clotures:0 }; }, T = z(), C = {}, st = {}, is = {}, cl = {}, sc = { A:0, B:0 }, or = {}, vo = {}, sem = {};
      Object.keys(REF.statuts).forEach(function(k){ st[k] = 0; }); Object.keys(REF.issues).forEach(function(k){ is[k] = 0; }); Object.keys(REF.client).forEach(function(k){ cl[k] = 0; });
      Object.keys(REF.filiales).forEach(function(f){ vo[f] = {}; Object.keys(REF.volet_statuts).forEach(function(s){ vo[f][s] = 0; }); });
      D.forEach(function(d){ var k = d.cr_code || '_aucune'; C[k] = C[k] || Object.assign(z(), { nom:nomCr(d.cr_code) || 'File nationale (à attribuer)' });
        [T, C[k]].forEach(function(b){ b.n++; b[d.niveau]++; if (d.pris_le) { b.pris++; b.dt += ts(d.pris_le) - ts(d.cree_le); if (d.niveau !== 'abandonniste') { if (ts(d.pris_le) > ts(d.echeance)) b.hors_delai++; else b.tenus++; } }
          else if (d.niveau !== 'abandonniste' && ['depose', 'attribue'].indexOf(d.statut) >= 0 && ts(d.echeance) < Date.now()) b.retard++;
          if (d.statut === 'cloture') { b.clotures++; if (d.issue === 'signe') b.signes++; } });
        st[d.statut]++; if (d.issue) is[d.issue]++; cl[d.client_statut]++; sc[d.scenario]++; or[d.origine] = (or[d.origine] || 0) + 1;
        Object.keys(d.volets).forEach(function(f){ vo[f][d.volets[f].statut]++; });
        var dd = new Date(ts(d.cree_le)), j = new Date(Date.UTC(dd.getFullYear(), dd.getMonth(), dd.getDate())); j.setUTCDate(j.getUTCDate() + 4 - (j.getUTCDay() || 7));
        var y = j.getUTCFullYear(), w = Math.ceil(((j - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7), s = y + '-S' + (w < 10 ? '0' : '') + w; sem[s] = sem[s] || {}; sem[s][d.niveau] = (sem[s][d.niveau] || 0) + 1; });
      var fin = function(b){ b.delai_moyen_h = b.pris ? Math.round(b.dt / b.pris / H * 10) / 10 : null; delete b.dt; b.taux_sla = (b.tenus + b.hors_delai) ? Math.round(100 * b.tenus / (b.tenus + b.hors_delai)) : null; return b; };
      Object.keys(C).forEach(function(k){ fin(C[k]); });
      var em = {}; E.forEach(function(e){ var key = e.modele + '|' + e.statut; em[key] = (em[key] || 0) + 1; });
      var semaines = []; Object.keys(sem).sort().forEach(function(s){ Object.keys(sem[s]).forEach(function(n){ semaines.push({ s:s, niveau:n, n:sem[s][n] }); }); });
      var du = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), au = new Date().toISOString().slice(0, 10);
      var pc = {}; Object.keys(C).sort(function(a, b){ return C[b].n - C[a].n; }).forEach(function(k){ pc[k] = C[k]; });
      return ok({ du:du, au:au, total:fin(T), par_cr:pc, statuts:st, issues:is, client:cl, scenarios:sc, origines:or, volets:vo, semaines:semaines,
        emails:Object.keys(em).map(function(k){ var x = k.split('|'); return { modele:x[0], statut:x[1], n:em[k] }; }) });
    },
    distribution:function(){ return ok({ dossiers:D.slice().sort(function(a, b){ return b.id - a.id; }).map(function(d){ var pec = E.filter(function(e){ return e.dossier_id === d.id && e.modele === 'dirigeant_prise_en_charge'; })[0];
      return Object.assign(item(d), { conseiller_pro:d.conseiller_pro, portefeuille:d.portefeuille, email_pec:pec ? pec.cree_le : null }); }) }); },
    cr:function(){ return ok({ cr:CR.map(function(c){ return Object.assign({}, c, { experts:USERS.filter(function(u){ return u.role === 'expert' && u.actif && u.cr_code === c.code; }).length }); }) }); },
    users:function(){ return ok({ users:USERS.slice() }); },
    clients:function(){ return ok({ clients:CLIENTS.slice() }); },
    emails:function(){ return ok({ emails:E.slice().reverse() }); },
    cr_save:function(p, b){ if (!b.code || !b.nom) return ko('Code et nom de la Caisse régionale requis.'); var c = CR.filter(function(x){ return x.code === b.code; })[0];
      var v = { code:b.code, nom:b.nom, departements:String(b.departements || '').split(/[\s,;]+/).filter(Boolean).join(','), canal:b.canal, scenario:b.scenario, solead_email:b.solead_email, actif:b.actif ? 1 : 0 };
      if (c) Object.assign(c, v); else CR.push(v); return ok(); },
    user_save:function(p, b){ if (!b.login || !b.nom) return ko('Identifiant et nom requis.'); if (b.role === 'expert' && !b.cr_code) return ko('Choisissez la Caisse régionale de l’expert.');
      var u = USERS.filter(function(x){ return x.id === +b.id; })[0], nouveau = !u;
      if (b.referent && b.role === 'expert') USERS.forEach(function(x){ if (x.role === 'expert' && x.cr_code === b.cr_code) x.referent = 0; });
      u = u || { id:USERS.length + 1, vu_le:null }; Object.assign(u, { login:b.login, nom:b.nom, email:b.email, role:b.role, cr_code:b.role === 'expert' ? b.cr_code : null, filiale:b.role === 'filiale' ? b.filiale : null, referent:b.referent ? 1 : 0, actif:b.actif ? 1 : 0 });
      if (nouveau) USERS.push(u); return ok({ id:u.id, mdp:nouveau && !b.mdp ? 'Demo' + Math.random().toString(36).slice(2, 10) : null }); },
    user_mdp:function(){ return ok({ mdp:'Demo' + Math.random().toString(36).slice(2, 10) }); },
    client_save:function(p, b){ var s = String(b.siren || '').replace(/\D/g, '').slice(0, 9); if (s.length !== 9) return ko('SIREN ou SIRET invalide.'); var c = CLIENTS.filter(function(x){ return x.siren === s; })[0];
      var v = { siren:s, raison_sociale:b.raison_sociale, cr_code:b.cr_code, marche:b.marche, portefeuille:b.portefeuille, conseiller:b.conseiller, conseiller_email:b.conseiller_email }; if (c) Object.assign(c, v); else CLIENTS.push(v); return ok(); },
    client_suppr:function(p, b){ var i = CLIENTS.map(function(c){ return c.siren; }).indexOf(b.siren); if (i >= 0) CLIENTS.splice(i, 1); return ok(); },
    taches:function(){ var r = { integres:0, relances:0, reprises:0, alertes:0 };
      D.forEach(function(d){ if (d.statut === 'cloture') return;
        if (d.prochaine_relance && ts(d.prochaine_relance) <= Date.now() && d.consent_relance && d.niveau === 'abandonniste') { var n = d.relances + 1; d.relances = n; d.prochaine_relance = n === 1 ? iso(plusJours(ts(d.cree_le), 7, 10)) : null;
          email(d, Date.now(), 'dirigeant_abandon_j' + (n === 1 ? '1' : '7'), d.email, 'Retrouvez le résultat de votre simulation', bonjour(d) + 'Votre résultat :\n' + d.resultat); journal(d, Date.now(), 'relance', 'Relance J+' + (n === 1 ? '1' : '7') + ' (journalisé, envoi désactivé)'); r.relances++; }
        if (d.niveau !== 'abandonniste' && ['depose', 'attribue'].indexOf(d.statut) >= 0 && ts(d.echeance) < Date.now() && !d.alerte) { d.alerte = true; journal(d, Date.now(), 'alerte', 'Délai cible dépassé (' + NIV[d.niveau].delai + ') : alerte envoyée et signalée à la console nationale'); email(d, Date.now(), 'interne_alerte', '', 'Délai dépassé : dossier ' + d.reference, resume(d)); r.alertes++; } });
      return ok({ resultat:r }); },
    demo_comptes:function(){ return ok({ comptes:USERS.map(function(u){ return { login:u.login, nom:u.nom, mdp:null }; }) }); }
  };
  window.LM_DEMO = {
    api:function(a, p, b){ if (a !== 'moi' && a !== 'connexion' && !SES) return Promise.resolve({ ok:false, error:'Session expirée.' }); return (API[a] || function(){ return ko('Requête inconnue.'); })(p || {}, b || {}); },
    exporter:function(){ var rows = [['Référence', 'Déposé le', 'Niveau', 'Statut', 'Entreprise', 'Effectif', 'Caisse régionale', 'Scénario', 'Client', 'Expert', 'Échéance', 'Estimation']].concat(D.map(function(d){ return [d.reference, d.cree_le, NIV[d.niveau].lib, REF.statuts[d.statut], d.raison_sociale, d.effectif, nomCr(d.cr_code) || '', d.scenario, REF.client[d.client_statut], nomU(d.user_id) || '', d.echeance, d.montant || '']; }));
      var csv = '﻿' + rows.map(function(r){ return r.map(function(v){ v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' })); a.download = 'dossiers-brh-demo.csv'; document.body.appendChild(a); a.click(); a.remove(); },
    donnees:{ D:D, J:J, E:E, USERS:USERS, CR:CR, CLIENTS:CLIENTS }
  };
  /* profil choisi d'avance : cockpit-brh.html?demo=1#profil=tp.expert (ou window.LM_DEMO_PROFIL) */
  var pf = window.LM_DEMO_PROFIL || ((typeof location !== 'undefined' && location.hash.match(/profil=([\w.]+)/)) || [])[1];
  if (pf) API.connexion({}, { login:pf });
})();
