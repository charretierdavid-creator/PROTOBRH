/* Module LM 2.0 — 15/11/2026 · règles partagées de la console (types, statuts, statut client, suggestion du destinataire, scripts et e-mails de repli) · historique : VERSIONS.md */
/* ==============================================================
   lm2-regles.js — RÈGLES DE GESTION PARTAGÉES (console, démonstration, tests)
   Cahier des charges « Lead management simplifié » v0.3 du 15/11/2026, réponses par défaut Q1 à Q22.
   Ce fichier ne contient aucune donnée personnelle. Il sert :
     - à la console (console.html) : libellés, suggestion du destinataire (§ 4.3), script d'appel et
       e-mails de repli quand l'IA n'est pas joignable (§ 7.2, 7.3), noms ajoutés dans le navigateur (RG-31, RG-34) ;
     - à la démonstration sans serveur (console-demo.js) et aux tests de non-régression.
   Les règles côté serveur (types, fusion, échéances, droits, envois) sont dans lm2-base.php, avec les mêmes valeurs.
   ============================================================== */
(function (racine) {
  'use strict';
  var TYPES = {
    devis:    { lib: 'Demande de devis', court: 'Devis', prio: 1, jours: 1, delai: '24 h ouvrées' },
    ultra:    { lib: 'Ultra-qualifié', court: 'Ultra-qualifié', prio: 2, jours: 2, delai: '48 h ouvrées' },
    qualifie: { lib: 'Qualifié', court: 'Qualifié', prio: 3, jours: 5, delai: '5 jours ouvrés' }
  };
  var STATUTS = { nouveau: 'Nouveau', pris_en_charge: 'Pris en charge', transfere: 'Transféré', proposition: 'Proposition', cloture: 'Clôturé' };
  var ORDRE_STATUTS = ['nouveau', 'pris_en_charge', 'transfere', 'proposition', 'cloture'];
  var ISSUES = { signe: 'Signé', perdu: 'Perdu', sans_suite: 'Sans suite', injoignable: 'Injoignable', doublon: 'Doublon' };
  var CLIENT = {
    declare: { lib: 'Client déclaré · à vérifier', court: 'Client déclaré', ton: 'a' },
    non_declare: { lib: 'Non client déclaré · à vérifier', court: 'Non client déclaré', ton: 'a' },
    inconnu: { lib: 'Statut client à vérifier', court: 'Client : à vérifier', ton: 'g' },
    verifie: { lib: 'Client vérifié', court: 'Client vérifié', ton: 'v' },
    prospect: { lib: 'Prospect vérifié', court: 'Prospect vérifié', ton: 'b' }
  };
  var ROLES = { expert_brh: 'Expert BRH', expert_brh_pro: 'Expert BRH PRO', conseiller_pro: 'Conseiller pro', filiale: 'Filiale', hors_annuaire: 'Hors annuaire' };
  var SOLUTIONS = { sante: 'Santé et prévoyance', epargne: 'Épargne salariale', retraite: 'Retraite collective', avantages: 'Avantages salariés' };
  var FILIALES = {
    caa: { lib: 'CA Assurances', outil: 'Prévis', solutions: ['sante'] },
    amundi: { lib: 'Amundi / CA Titres', outil: 'Universels', solutions: ['epargne', 'retraite'] },
    worklife: { lib: 'Worklife', outil: 'devis par e-mail', solutions: ['avantages'] }
  };
  var PRIORITES = { protection: 'Protéger vos salariés', partageValeur: 'Partager la valeur', pouvoirAchat: 'Pouvoir d’achat', retraite: 'Préparer la retraite' };
  var DEPARTEMENTS = { '01': 'Ain', '05': 'Hautes-Alpes', '07': 'Ardèche', '13': 'Bouches-du-Rhône', '14': 'Calvados', '17': 'Charente-Maritime', '18': 'Cher',
    '22': 'Côtes-d’Armor', '25': 'Doubs', '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère', '32': 'Gers', '33': 'Gironde', '35': 'Ille-et-Vilaine',
    '36': 'Indre', '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura', '40': 'Landes', '41': 'Loir-et-Cher', '44': 'Loire-Atlantique', '45': 'Loiret', '47': 'Lot-et-Garonne',
    '49': 'Maine-et-Loire', '50': 'Manche', '53': 'Mayenne', '56': 'Morbihan', '58': 'Nièvre', '59': 'Nord', '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais',
    '64': 'Pyrénées-Atlantiques', '65': 'Hautes-Pyrénées', '69': 'Rhône', '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe', '75': 'Paris', '76': 'Seine-Maritime',
    '77': 'Seine-et-Marne', '78': 'Yvelines', '79': 'Deux-Sèvres', '80': 'Somme', '84': 'Vaucluse', '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '90': 'Territoire de Belfort',
    '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne', '95': 'Val-d’Oise' };
  var SEUIL_PRO = 20;   // Q1 : 20 salariés, simple suggestion

  /* ---------------- outils ---------------- */
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^agence\s+(de\s+|d['’]\s*)?/, '').replace(/[’'`-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function liste(s) { return (Array.isArray(s) ? s : String(s == null ? '' : s).split(',')).map(function (x) { return String(x).trim(); }).filter(Boolean); }
  function eur(n) { return Math.round(+n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €'; }
  function nomDep(d) { return DEPARTEMENTS[d] ? DEPARTEMENTS[d] + ' (' + d + ')' : (d ? 'département ' + d : ''); }
  function nomComplet(i) { return i ? ((i.prenom || '') + ' ' + (i.nom || '')).trim() : ''; }
  function segment(effectif, seuil) {
    var n = parseInt(effectif, 10); if (!(n > 0)) return '';
    return n >= (seuil || SEUIL_PRO) ? 'entreprise' : 'pro';
  }

  /* ---------------- jours ouvrés (week-ends et fériés français) — même calcul que lm2-base.php ---------------- */
  function paques(a) {
    var b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * (a % 19) + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a % 19 + 11 * h + 22 * l) / 451),
      mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(a, mois - 1, jour);
  }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function ferie(d) {
    var a = d.getFullYear(), p = paques(a), j = function (n) { var x = new Date(p); x.setDate(x.getDate() + n); return iso(x); };
    return [a + '-01-01', a + '-05-01', a + '-05-08', a + '-07-14', a + '-08-15', a + '-11-01', a + '-11-11', a + '-12-25', j(1), j(39), j(50)].indexOf(iso(d)) >= 0;
  }
  /* dates du serveur « AAAA-MM-JJ HH:MM:SS » : lues en heure locale par tous les navigateurs (Safari compris) */
  function dt(x) { if (x instanceof Date) return new Date(x.getTime()); if (typeof x === 'number') return new Date(x); var m = String(x || '').match(/^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d)(?::(\d\d))?)?/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : new Date(x); }
  function ouvre(d) { var w = d.getDay(); return w !== 0 && w !== 6 && !ferie(d); }
  function plusOuvres(depuis, jours) {
    var d = dt(depuis);
    if (!ouvre(d)) { do { d.setDate(d.getDate() + 1); } while (!ouvre(d)); d.setHours(9, 0, 0, 0); }
    for (var i = 0; i < jours; i++) { do { d.setDate(d.getDate() + 1); } while (!ouvre(d)); }
    return d;
  }
  /* RG-05 et Q3 : échéance de prise en charge selon le type ; Q2 : rappel demandé sur un lead qualifié = 48 h ouvrées */
  function joursDelai(type, rappel) { return (type === 'qualifie' && rappel) ? 2 : ((TYPES[type] || TYPES.qualifie).jours); }
  function echeance(type, depuis, rappel) { return plusOuvres(depuis, joursDelai(type, rappel)); }
  /* S7 : retard signalé dans la colonne Échéance */
  function etatEcheance(l, maintenant) {
    var now = maintenant ? dt(maintenant) : new Date();
    if (l.statut === 'cloture') return { etat: 'clos', lib: l.issue ? ISSUES[l.issue] || 'Clôturé' : 'Clôturé' };
    if (l.rdv_le && dt(l.rdv_le) > now) return { etat: 'rdv', lib: 'RDV ' + dateCourte(l.rdv_le) };
    if (l.statut !== 'nouveau' && l.statut !== 'transfere') return { etat: 'ok', lib: l.statut === 'proposition' ? 'Proposition remise' : 'En cours' };
    if (!l.echeance) return { etat: 'ok', lib: '—' };
    var e = dt(l.echeance), dh = (e - now) / 3600000;
    if (dh < 0) return { etat: 'retard', lib: 'Hors délai' };
    var memeJour = iso(e) === iso(now);
    return { etat: dh <= 6 ? 'proche' : 'ok', lib: memeJour ? 'Auj. ' + heure(e) : dateCourte(e) + ' ' + heure(e) };
  }
  function heure(d) { d = dt(d); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function dateCourte(d) { d = dt(d); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function dateFr(d) { if (!d) return ''; d = dt(d); return dateCourte(d) + '/' + d.getFullYear() + ' à ' + heure(d); }
  /* RG-04 : devis, puis ultra-qualifiés, puis qualifiés ; à type égal, échéance la plus proche (leads à prendre en charge d'abord) */
  function trier(liste_) {
    return liste_.slice().sort(function (a, b) {
      var ca = a.statut === 'cloture' ? 1 : 0, cb = b.statut === 'cloture' ? 1 : 0; if (ca !== cb) return ca - cb;
      var pa = (TYPES[a.type] || TYPES.qualifie).prio, pb = (TYPES[b.type] || TYPES.qualifie).prio; if (pa !== pb) return pa - pb;
      var ea = cle(a), eb = cle(b); return ea - eb;
    });
  }
  /* échéance de prise en charge pour un lead à prendre (nouveau, transféré) ; sinon rendez-vous à venir, puis le reste */
  function cle(l) {
    if ((l.statut === 'nouveau' || l.statut === 'transfere') && l.echeance) return dt(l.echeance).getTime();
    if (l.rdv_le) return 8e15 + dt(l.rdv_le).getTime() / 1e3;
    return 9e15;
  }
  function kpis(liste_) {
    var k = { devis: 0, ultra: 0, qualifie: 0 };
    liste_.forEach(function (l) { if (l.statut !== 'cloture' && k[l.type] != null) k[l.type]++; });
    return k;
  }

  /* ---------------- § 4.3 : aide au choix du destinataire (S1 : suggestion expliquée, jamais de transfert automatique) ---------------- */
  function couvreDep(i, dep) { return liste(i.perimetre).concat(liste(i.departements)).some(function (x) { return x === dep; }) && !liste(i.perimetre).some(function (x) { return !/^\d{2,3}$|^2[AB]$/.test(x); }); }
  function couvreVille(i, ville) { var v = norm(ville); return !!v && liste(i.perimetre).some(function (x) { return !/^\d{2,3}$|^2[AB]$/.test(x) && norm(x) === v; }); }
  function prefixeCommun(a, b) { a = String(a || ''); b = String(b || ''); var n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; }
  /* lead : { effectif, ville, code_postal, departement, client_statut, client_conseiller_email, type, solutions }
     annuaire : { interlocuteurs:[{id, role, prenom, nom, email, departements, perimetre, agence_id, principal, charge, actif, donnees}], agences:[{id, nom, ville, cp, departement}] } */
  function suggerer(lead, annuaire, opts) {
    opts = opts || {};
    var I = (annuaire.interlocuteurs || []).filter(function (i) { return i.actif !== false && i.actif !== 0; });
    var A = annuaire.agences || [];
    var dep = String(lead.departement || '').toUpperCase(), ville = lead.ville || '', cp = String(lead.code_postal || '');
    var seg = segment(lead.effectif, opts.seuil);
    var r = { segment: seg, expertPro: null, agence: null, conseiller: null, titulaire: null, raisons: [], critere: 0 };
    /* 1. client vérifié : conseiller titulaire du compte, s'il figure dans l'annuaire */
    if (lead.client_statut === 'verifie' && lead.client_conseiller_email) {
      var t = I.filter(function (i) { return String(i.email || '').toLowerCase() === String(lead.client_conseiller_email).toLowerCase(); })[0];
      if (t) { r.titulaire = t; r.conseiller = t; r.critere = 1; r.agence = A.filter(function (a) { return a.id === t.agence_id; })[0] || null;
        r.raisons.push('Client vérifié : conseiller titulaire ' + nomComplet(t) + (r.agence ? ' (' + r.agence.nom.toLowerCase() + ')' : '')); }
    }
    /* 2 et 3. expert BRH PRO : périmètre par villes (plus précis), sinon par département ; 6. sinon expert principal de la CR */
    var pros = I.filter(function (i) { return i.role === 'expert_brh_pro'; });
    var parVille = pros.filter(function (i) { return couvreVille(i, ville); });
    var parDep = pros.filter(function (i) { return dep && couvreDep(i, dep); });
    if (parVille.length) { r.expertPro = parVille[0]; r.critere = r.critere || 3; r.raisons.push('Siège à ' + ville + (cp ? ' (' + cp + ')' : '') + ' → expert BRH PRO des villes ' + liste(parVille[0].perimetre).join(', ') + ' : ' + nomComplet(parVille[0])); }
    else if (parDep.length) { r.expertPro = parDep[0]; r.critere = r.critere || 2; r.raisons.push('Siège à ' + (ville || 'adresse non précisée') + (cp ? ' (' + cp + ')' : '') + ' → ' + nomDep(dep) + ' → expert BRH PRO du ' + dep + ' : ' + nomComplet(parDep[0])); }
    else if (pros.length) { r.expertPro = pros.filter(function (i) { return +i.principal; })[0] || pros[0]; r.critere = r.critere || 6; r.raisons.push('Aucun périmètre ne couvre ' + (nomDep(dep) || 'ce siège') + ' → expert BRH PRO principal de la CR : ' + nomComplet(r.expertPro)); }
    /* 4. agence : ville du siège, sinon la plus proche dans le même département (code postal le plus voisin) */
    if (!r.agence) {
      var memeVille = A.filter(function (a) { return norm(a.ville) === norm(ville) && norm(ville); });
      if (memeVille.length) { r.agence = memeVille[0]; r.raisons.push('Agence de la commune du siège : ' + r.agence.nom); }
      else {
        var memeDep = A.filter(function (a) { return a.departement === dep; });
        memeDep.sort(function (a, b) { var d = prefixeCommun(b.cp, cp) - prefixeCommun(a.cp, cp); return d || Math.abs((+a.cp || 0) - (+cp || 0)) - Math.abs((+b.cp || 0) - (+cp || 0)); });
        if (memeDep.length) { r.agence = memeDep[0]; r.raisons.push('Agence la plus proche dans le ' + dep + ' (d’après le code postal) : ' + r.agence.nom); }
      }
    }
    /* 5. deux conseillers pro dans l'agence : le moins chargé */
    if (!r.conseiller && r.agence) {
      var cs = I.filter(function (i) { return i.role === 'conseiller_pro' && i.agence_id === r.agence.id; });
      cs.sort(function (a, b) { return ((+a.charge || 0) - (+b.charge || 0)) || nomComplet(a).localeCompare(nomComplet(b)); });
      if (cs.length) { r.conseiller = cs[0]; r.raisons.push('Conseiller le moins chargé de l’agence : ' + nomComplet(cs[0]) + ' (' + (+cs[0].charge || 0) + ' lead' + ((+cs[0].charge || 0) > 1 ? 's' : '') + ' en cours)'); }
    }
    r.conseillersAgence = r.agence ? I.filter(function (i) { return i.role === 'conseiller_pro' && i.agence_id === r.agence.id; }) : [];
    r.autresPros = pros.filter(function (i) { return !r.expertPro || i.id !== r.expertPro.id; });
    r.filiales = filialesPermises(lead);
    r.conseilSegment = seg === 'entreprise' ? 'Segment Entreprise (' + lead.effectif + ' salariés) : traitement conseillé par vous-même. Transfert possible si besoin.'
      : (seg === 'pro' ? 'Segment Pro (' + lead.effectif + ' salarié' + (+lead.effectif > 1 ? 's' : '') + ') : transfert suggéré à l’expert BRH PRO ou au conseiller pro.' : 'Effectif non renseigné : à qualifier avant tout transfert.');
    r.pourquoi = r.raisons.join(' ; ');
    return r;
  }
  /* RG-22 : filiale seulement pour une demande de devis, selon les offres choisies */
  function filialesPermises(lead) {
    if (lead.type !== 'devis') return [];
    var sol = liste(lead.solutions);
    return Object.keys(FILIALES).filter(function (f) { return FILIALES[f].solutions.some(function (s) { return sol.indexOf(s) >= 0; }); });
  }

  /* ---------------- contexte envoyé à l'IA : jamais de nom, d'e-mail, de téléphone ni de SIRET (RG-31, RG-34, S4) ---------------- */
  function contexteIA(l) {
    var p = l.parcours || {};
    return { type_lead: (TYPES[l.type] || {}).lib, statut_client: (CLIENT[l.client_statut] || {}).lib, rappel_demande: !!+l.rappel, secteur: l.secteur || '',
             effectif: +l.effectif || null, departement: l.departement || '', priorites: p.priorites || {}, offres_preconisees: p.offres_preconisees || [],
             offres_consultees: p.offres_consultees || [], solutions: liste(l.solutions).map(function (s) { return SOLUTIONS[s] || s; }),
             estimation_annuelle: +l.montant || null, convention: l.idcc || '', convention_sante: p.sante_ccn ? { statut: p.sante_ccn.statut, exigences: p.sante_ccn.exigences } : null };
  }
  /* noms ajoutés dans le navigateur, après la réponse de l'IA */
  function injecter(txt, n) {
    n = n || {};
    return String(txt || '').replace(/\[Prénom\]/g, n.prenom || 'Madame, Monsieur').replace(/\[Nom du dirigeant\]/g, n.dirigeant || '').replace(/\[Entreprise\]/g, n.entreprise || 'votre entreprise')
      .replace(/\[Votre nom\]/g, n.moi || '').replace(/\[Signature\]/g, n.signature || '').replace(/\[Caisse régionale\]/g, n.caisse || 'votre Caisse régionale');
  }

  /* ---------------- § 7.3 : script d'appel de repli (sans IA), adapté au type de lead et au statut client ---------------- */
  function scriptRepli(l) {
    var t = l.type || 'qualifie', c = l.client_statut || 'inconnu', p = l.parcours || {}, pr = p.priorites || {};
    var top = Object.keys(pr).sort(function (a, b) { return (+pr[b] || 0) - (+pr[a] || 0); })[0], prio = top && PRIORITES[top] ? PRIORITES[top].toLowerCase() : 'vos priorités RH';
    var sol = liste(l.solutions).map(function (s) { return (SOLUTIONS[s] || s).toLowerCase(); });
    var montant = +l.montant ? eur(l.montant) + ' par an (estimation indicative et non contractuelle)' : '';
    var ouverture = {
      qualifie: '« Bonjour [Prénom], [Votre nom], de la Banque des Ressources Humaines du Crédit Agricole. Vous avez fait votre diagnostic RH sur notre portail' + (top ? ' et noté en premier : ' + prio : '') + '. Avez-vous quelques minutes ? »',
      ultra: '« Bonjour [Prénom], [Votre nom], de la Banque des Ressources Humaines du Crédit Agricole. Vous avez reçu votre estimation' + (sol.length ? ' pour ' + sol.join(', ') : '') + (montant ? ' : ' + montant : '') + '. Je vous appelle pour vous aider à aller plus loin. Avez-vous quelques minutes ? »',
      devis: '« Bonjour [Prénom], [Votre nom], de la Banque des Ressources Humaines du Crédit Agricole. Je vous appelle suite à votre demande de devis' + (l.reference ? ' (référence ' + l.reference + ')' : '') + '. Avez-vous quelques minutes ? »'
    }[t];
    var verif = c === 'verifie' ? ['« Votre compte est suivi par ' + (l.client_agence || 'votre agence') + ' : je travaille avec votre conseiller habituel. »']
      : (c === 'prospect' ? ['« Le Crédit Agricole accompagne les entreprises de votre région, et la Banque des RH réunit nos solutions pour vos salariés : épargne salariale, santé et prévoyance, retraite, avantages. »']
      : ['« ' + (c === 'declare' ? 'Vous nous avez indiqué être déjà client : votre compte professionnel est-il suivi par l’une de nos agences ?' : (c === 'non_declare' ? 'Vous nous avez indiqué ne pas être client : travaillez-vous avec une autre banque pour votre entreprise ?' : 'Votre compte professionnel est-il suivi par l’une de nos agences ?')) + ' » → à confirmer dans la base clients de la CR.']);
    verif.push({ qualifie: 'Effectif : ' + (l.effectif || '?') + ' salariés ; existant : mutuelle, épargne salariale, avantages ?', ultra: 'Salariés concernés, cadres et non-cadres ; convention collective' + (l.idcc ? ' (' + l.idcc + ')' : '') + ' ?',
      devis: 'Convention collective' + (l.idcc ? ' ' + l.idcc : '') + ' et obligations santé ; contrats en cours et échéances ?' }[t]);
    var decouvrir = {
      qualifie: ['« Votre priorité : attirer de nouveaux talents, ou garder ceux que vous avez ? »', '« Qui décide avec vous : un associé, votre expert-comptable ? »'],
      ultra: ['« Qu’est-ce qui vous a arrêté avant d’envoyer votre demande de devis ? »', '« L’estimation correspond-elle à ce que vous imaginiez ? »'],
      devis: ['« Quelles options souhaitez-vous retenir, et pour quelle date de mise en place ? »', '« Quelle part de la cotisation santé l’entreprise prendra-t-elle en charge ? »']
    }[t];
    var objections = {
      qualifie: ['« Pas le temps » → proposer un rendez-vous de 30 minutes à la date de son choix.', '« C’est trop tôt » → envoyer le résultat du diagnostic et convenir d’un rappel.'],
      ultra: ['« C’est trop cher » → rappeler qu’un euro d’avantage exonéré coûte moins qu’un euro de salaire ; estimation indicative et non contractuelle.', '« Je dois réfléchir » → reprendre le devis ensemble en rendez-vous.'],
      devis: ['« J’ai déjà une mutuelle » → vérifier sa conformité à la convention collective et proposer la prévoyance.', '« Je compare » → proposer une comparaison à garanties égales.']
    }[t];
    var conclure = {
      qualifie: ['« Je vous propose un rendez-vous de 30 minutes, ou je vous envoie le lien vers le devis en ligne ? »'],
      ultra: ['« Je vous propose un rendez-vous de 30 minutes pour finaliser votre devis, ou de le reprendre en ligne là où vous l’avez laissé. »'],
      devis: ['« Je vous propose un rendez-vous de finalisation : plutôt en début ou en fin de semaine prochaine ? »', 'Pièces à préparer : contrat santé actuel, liste des salariés par catégorie.']
    }[t];
    var adapte = [(TYPES[t] || {}).lib, (CLIENT[c] || {}).lib]; if (+l.rappel) adapte.push('Rappel demandé'); if (l.idcc) adapte.push('Convention ' + String(l.idcc).split(' ')[0]);
    return { source: 'repli', adapte: adapte, blocs: [
      { titre: 'Ouverture', duree: '20 s', lignes: [ouverture] }, { titre: 'Vérifier', duree: '1 min', lignes: verif },
      { titre: 'Découvrir', duree: '3 min', lignes: decouvrir }, { titre: 'Répondre aux objections', duree: 'si besoin', lignes: objections },
      { titre: 'Conclure', duree: '30 s', lignes: conclure }] };
  }

  /* ---------------- § 7.2 : e-mails de repli (3 propositions) ---------------- */
  var OBJECTIFS = { rdv: 'Proposer un rendez-vous', estimation: 'Envoyer la première estimation', relance: 'Relancer', convention: 'Répondre sur la convention santé' };
  function emailsRepli(l, objectif, ton) {
    var f = ton === 'formel', b = f ? 'Madame, Monsieur [Prénom],' : 'Bonjour [Prénom],', fin = f ? 'Je vous prie d’agréer mes salutations distinguées,' : 'Bien cordialement,';
    var sol = liste(l.solutions).map(function (s) { return (SOLUTIONS[s] || s).toLowerCase(); }).join(', ');
    var m = +l.montant ? 'Votre estimation s’élève à environ ' + eur(l.montant) + ' par an (estimation indicative et non contractuelle).' : '';
    var corps = {
      rdv: ['Merci pour votre demande. ' + (sol ? 'J’ai bien noté votre intérêt pour : ' + sol + '. ' : '') + m, 'Je vous propose un échange de 30 minutes, au téléphone ou en agence, pour faire le point sur vos besoins. Quel moment vous conviendrait le mieux ?'],
      estimation: [m || 'Comme convenu, voici les éléments de votre première estimation.', 'Ces montants reposent sur les informations que vous avez renseignées sur le portail ; je les confirme avec vous lors d’un échange.'],
      relance: ['Je reviens vers vous suite à votre visite sur le portail de la Banque des Ressources Humaines.', 'Souhaitez-vous que nous en parlions ? Je reste à votre disposition pour un échange à la date de votre choix.'],
      convention: ['Votre convention collective' + (l.idcc ? ' (' + l.idcc + ')' : '') + ' peut prévoir des obligations en santé et en prévoyance.', 'Je vous propose de les vérifier ensemble pour que votre contrat soit conforme, puis d’ajuster votre devis.']
    }[objectif || 'rdv'];
    var objets = { rdv: ['Votre demande Banque des RH — proposition de rendez-vous', 'Faisons le point sur vos avantages salariés', 'Un échange de 30 minutes ?'],
      estimation: ['Votre première estimation Banque des RH', 'Vos avantages salariés : votre estimation', 'Suite à votre estimation'],
      relance: ['Suite à votre visite sur le portail Banque des RH', 'Avez-vous pu avancer sur votre projet ?', 'Je reste à votre disposition'],
      convention: ['Votre convention collective et votre contrat santé', 'Santé et prévoyance : ce que prévoit votre convention', 'Vérifions ensemble votre convention'] }[objectif || 'rdv'];
    return objets.map(function (o, i) {
      var c = corps.slice(); if (i === 1) c.reverse(); if (i === 2) c = [c.join(' ')];
      return { objet: o, corps: [b, ''].concat(c.filter(Boolean)).concat(['', fin, '[Signature]']).join('\n') };
    });
  }

  racine.LM2 = { TYPES: TYPES, STATUTS: STATUTS, ORDRE_STATUTS: ORDRE_STATUTS, ISSUES: ISSUES, CLIENT: CLIENT, ROLES: ROLES, SOLUTIONS: SOLUTIONS, FILIALES: FILIALES,
    PRIORITES: PRIORITES, DEPARTEMENTS: DEPARTEMENTS, OBJECTIFS: OBJECTIFS, SEUIL_PRO: SEUIL_PRO, norm: norm, liste: liste, eur: eur, nomDep: nomDep, nomComplet: nomComplet,
    segment: segment, dt: dt, plusOuvres: plusOuvres, joursDelai: joursDelai, echeance: echeance, etatEcheance: etatEcheance, dateFr: dateFr, dateCourte: dateCourte, heure: heure, trier: trier, kpis: kpis,
    suggerer: suggerer, filialesPermises: filialesPermises, contexteIA: contexteIA, injecter: injecter, scriptRepli: scriptRepli, emailsRepli: emailsRepli, version: '2.0' };
})(typeof window !== 'undefined' ? window : globalThis);
