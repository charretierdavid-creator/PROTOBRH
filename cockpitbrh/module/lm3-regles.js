/* Module LM 3.0 — 16/11/2026 · règles de gestion de la console simplifiée (cahier des charges V2.13, page P4) · historique : VERSIONS.md */
/* ==============================================================
   lm3-regles.js — RÈGLES DE GESTION DE LA CONSOLE LM 3.0 (démonstration et tests)
   Cahier des charges cdcbrh, pages P1 et P4 (V2.13 du 16/11/2026) :
     - trois types de lead fixés à la création (D81) : Simulation réalisée, Devis en cours ou réalisé, Être rappelé ;
       le type reflète l'étape la plus avancée ; un rappel joint devient la mention « Rappel demandé » ;
     - trois statuts de traitement (D115) : Nouveau, En cours, Clôturé ; « Transmis » est un changement de propriétaire ;
     - une console pour l'expert BRH, l'expert BRH Pro et le conseiller Pro (compte permanent, identifiant = e-mail pro) ;
     - segment « Entreprise a priori » à partir de 50 salariés (50 inclus), décision de l'expert ;
     - échéance d'origine calculée depuis la visite du portail, en jours ouvrés, conservée en cas de transmission.
   Aucune donnée personnelle ici : les données de démonstration sont dans console3.js (fictives).
   ============================================================== */
(function (racine) {
  'use strict';
  var TYPES = {
    devis:      { lib: 'Devis en cours ou réalisé', rang: 3, jours: 1, delai: '24 h ouvrées', ton: 'devis' },
    simulation: { lib: 'Simulation réalisée',       rang: 2, jours: 2, delai: '48 h ouvrées', ton: 'simu' },
    rappel:     { lib: 'Être rappelé',              rang: 1, jours: 1, delai: '24 h ouvrées', ton: 'rappel' }
  };
  var STATUTS = { nouveau: 'Nouveau', en_cours: 'En cours', cloture: 'Clôturé' };
  var ROLES = { expert_brh: 'Expert BRH', expert_brh_pro: 'Expert BRH Pro', conseiller_pro: 'Conseiller Pro', admin: 'Administrateur' };
  var ROLES_F = { expert_brh: 'Experte BRH', expert_brh_pro: 'Experte BRH Pro', conseiller_pro: 'Conseillère Pro', admin: 'Administratrice' };
  var SOLUTIONS = { sante: 'Santé', retraite: 'Retraite', epargne: 'Épargne', avantages: 'Avantages' };
  var ORIGINES = { diagnostic: 'diagnostic', label: 'Label BRH', devis: 'devis en ligne', rappel: 'demande de rappel' };
  var ACTIONS = { rappeler: 'Rappeler le dirigeant', rdv: 'Tenir un rendez-vous', devis: 'Remettre le devis', reponse: 'Attendre sa réponse' };
  var MOTIFS = { signe: 'Contrat signé', perdu: 'Perdu', sans_suite: 'Sans suite', injoignable: 'Injoignable', doublon: 'Doublon' };
  var SEUIL_ENTREPRISE = 50;

  /* ---------------- dates : jours ouvrés (week-ends et fériés français), même calcul que la LM 2.0 ---------------- */
  function paques(a) {
    var b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * (a % 19) + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a % 19 + 11 * h + 22 * l) / 451),
      mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(a, mois - 1, jour);
  }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function isoComplet(d) { d = dt(d); return iso(d) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':00'; }
  function ferie(d) {
    var a = d.getFullYear(), p = paques(a), j = function (n) { var x = new Date(p); x.setDate(x.getDate() + n); return iso(x); };
    return [a + '-01-01', a + '-05-01', a + '-05-08', a + '-07-14', a + '-08-15', a + '-11-01', a + '-11-11', a + '-12-25', j(1), j(39), j(50)].indexOf(iso(d)) >= 0;
  }
  function dt(x) {
    if (x instanceof Date) return new Date(x.getTime());
    if (typeof x === 'number') return new Date(x);
    var m = String(x || '').match(/^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d)(?::(\d\d))?)?/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : new Date(x);
  }
  function ouvre(d) { var w = d.getDay(); return w !== 0 && w !== 6 && !ferie(d); }
  function plusOuvres(depuis, jours) {
    var d = dt(depuis);
    if (!ouvre(d)) { do { d.setDate(d.getDate() + 1); } while (!ouvre(d)); d.setHours(9, 0, 0, 0); }
    for (var i = 0; i < jours; i++) { do { d.setDate(d.getDate() + 1); } while (!ouvre(d)); }
    return d;
  }
  function moinsOuvres(depuis, jours, h, mn) {
    var d = dt(depuis);
    for (var i = 0; i < jours; i++) { do { d.setDate(d.getDate() - 1); } while (!ouvre(d)); }
    if (h != null) d.setHours(h, mn || 0, 0, 0);
    return d;
  }
  function dateCourte(d) { d = dt(d); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function dateLongue(d) { d = dt(d); return dateCourte(d) + '/' + d.getFullYear(); }

  /* ---------------- règles du lead ---------------- */
  function echeanceOrigine(type, visite) { return isoComplet(plusOuvres(visite, (TYPES[type] || TYPES.devis).jours)); }
  /* Échéance affichée : prochaine étape si le lead est en cours, sinon échéance d'origine ; dépassée = avant maintenant */
  function echeanceAffichee(l, maintenant) {
    var now = maintenant ? dt(maintenant) : new Date();
    if (l.statut === 'cloture') return { etat: 'clos', date: l.cloture ? l.cloture.date : null, lib: l.cloture ? (MOTIFS[l.cloture.motif] || 'Clôturé') : 'Clôturé' };
    var base = (l.statut === 'en_cours' && l.prochaine && l.prochaine.date) ? l.prochaine.date + ' 23:59:00' : l.echeance;
    var e = dt(base);
    return { etat: e < now ? 'depassee' : 'a_venir', date: base, jour: dateCourte(e), action: (l.statut === 'en_cours' && l.prochaine) ? (ACTIONS[l.prochaine.action] || '') : '' };
  }
  function segmentSuggere(effectif) { var n = parseInt(effectif, 10); return n >= SEUIL_ENTREPRISE ? 'entreprise' : ''; }
  /* P1 : le type reflète l'étape la plus avancée ; une demande de rappel jointe devient la mention « Rappel demandé » */
  function fusionnerType(actuel, nouveau) {
    if (!actuel) return { type: nouveau, rappel: false };
    var ta = TYPES[actuel], tn = TYPES[nouveau];
    var type = tn.rang > ta.rang ? nouveau : actuel;
    return { type: type, rappel: (nouveau === 'rappel' || actuel === 'rappel') && type !== 'rappel' };
  }
  function derniereTransmission(l) { return (l.transmissions && l.transmissions.length) ? l.transmissions[l.transmissions.length - 1] : null; }
  /* Situation de la fiche pour l'utilisateur : décide du bloc affiché */
  function situation(l, moi) {
    if (l.statut === 'cloture') return 'cloture';
    if (l.statut === 'en_cours') return 'en_cours';
    var t = derniereTransmission(l);
    if (t && t.a === moi) return t.renvoi ? 'renvoye' : 'recu';
    return 'a_qualifier';
  }
  function visible(l, user) { return user.role === 'admin' || l.proprietaire === user.email; }
  function transmisParMoi(l, user) {
    if (l.proprietaire === user.email) return false;
    return (l.transmissions || []).some(function (t) { return t.de === user.email; });
  }
  function filtrer(leads, user, vue, recherche) {
    var q = norm(recherche);
    return leads.filter(function (l) {
      if (vue === 'transmis') { if (!transmisParMoi(l, user)) return false; }
      else { if (!visible(l, user)) return false; if (l.statut !== vue) return false; }
      if (!q) return true;
      return [l.entreprise, l.contact && l.contact.nom, l.ville].some(function (x) { return norm(x).indexOf(q) >= 0; });
    });
  }
  function compter(leads, user) {
    var c = { nouveau: 0, en_cours: 0, cloture: 0, transmis: 0, types: { devis: 0, simulation: 0, rappel: 0 } };
    leads.forEach(function (l) {
      if (visible(l, user)) { c[l.statut]++; if (l.statut !== 'cloture') c.types[l.type]++; }
      if (transmisParMoi(l, user)) c.transmis++;
    });
    return c;
  }
  /* tri : échéance la plus proche d'abord (les dépassées remontent) ; clôturés : plus récents d'abord */
  function trier(liste, vue, maintenant) {
    return liste.slice().sort(function (a, b) {
      if (vue === 'cloture') return dt(b.cloture ? b.cloture.date : 0) - dt(a.cloture ? a.cloture.date : 0);
      if (vue === 'transmis') { var ta = derniereTransmission(a), tb = derniereTransmission(b); return dt(tb ? tb.date : 0) - dt(ta ? ta.date : 0); }
      return dt(echeanceAffichee(a, maintenant).date) - dt(echeanceAffichee(b, maintenant).date);
    });
  }
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function nomComplet(u) { return u ? (u.prenom + ' ' + u.nom) : ''; }
  function libRole(u) { return u ? ((u.genre === 'f' ? ROLES_F : ROLES)[u.role] || '') : ''; }
  function trouver(etat, email) { for (var i = 0; i < etat.users.length; i++) if (etat.users[i].email === email) return etat.users[i]; return null; }
  function lead(etat, id) { for (var i = 0; i < etat.leads.length; i++) if (etat.leads[i].id === id) return etat.leads[i]; return null; }

  /* collègues proposés pour une transmission : Pros dont le périmètre couvre le département, puis les autres ; jamais soi-même ni l'administrateur */
  function collegues(etat, l, moi, cible) {
    var dep = l.dep;
    var tous = etat.users.filter(function (u) { return u.actif !== false && u.email !== moi && u.role !== 'admin'; });
    var pros = tous.filter(function (u) { return cible === 'entreprise' ? u.role === 'expert_brh' : (u.role === 'expert_brh_pro' || u.role === 'conseiller_pro'); });
    pros.sort(function (a, b) {
      var ca = (a.deps || []).indexOf(dep) >= 0 ? 0 : 1, cb = (b.deps || []).indexOf(dep) >= 0 ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return (a.role === 'expert_brh_pro' ? 0 : 1) - (b.role === 'expert_brh_pro' ? 0 : 1);
    });
    return pros;
  }

  /* ---------------- actions : chacune vérifie les droits, modifie l'état, trace l'historique et les e-mails ---------------- */
  function trace(l, now, par, texte) { l.historique.push({ date: isoComplet(now), par: par, texte: texte }); }
  function mail(l, now, a, objet) { l.emails.push({ date: isoComplet(now), a: a, objet: objet }); }
  function refus(m) { return { ok: false, erreur: m }; }
  function proprio(l, moi) { return l.proprietaire === moi; }

  function prendreEnCharge(etat, id, moi, segment, now) {
    var l = lead(etat, id), u = trouver(etat, moi); if (!l || !u) return refus('Lead introuvable.');
    if (!proprio(l, moi)) return refus('Ce lead ne vous est pas attribué.');
    if (l.statut !== 'nouveau') return refus('Ce lead est déjà ' + STATUTS[l.statut].toLowerCase() + '.');
    var sit = situation(l, moi);
    if (sit === 'recu') segment = l.segment || segment;
    if (segment !== 'entreprise' && segment !== 'pro') return refus('Indiquez si le lead relève de l’Entreprise ou des Pros.');
    l.segment = segment; l.statut = 'en_cours'; l.pris_le = isoComplet(now);
    trace(l, now, moi, 'Lead pris en charge par ' + nomComplet(u) + ', segment ' + (segment === 'entreprise' ? 'Entreprise' : 'Pro') + '.');
    mail(l, now, 'dirigeant', 'Votre demande est prise en charge par ' + nomComplet(u) + ' (' + libRole(u) + ')');
    return { ok: true, message: 'Lead pris en charge. Le dirigeant a reçu votre nom par e-mail.' };
  }
  function transmettre(etat, id, moi, vers, mot, segment, now) {
    var l = lead(etat, id), u = trouver(etat, moi), c = trouver(etat, vers); if (!l || !u) return refus('Lead introuvable.');
    if (!proprio(l, moi)) return refus('Ce lead ne vous est pas attribué.');
    if (l.statut === 'cloture') return refus('Un lead clôturé ne se transmet pas.');
    if (!c || c.role === 'admin' || c.actif === false) return refus('Choisissez un collègue de l’annuaire.');
    if (vers === moi) return refus('Vous ne pouvez pas vous transmettre un lead.');
    if (segment) l.segment = segment;
    var avant = STATUTS[l.statut];
    l.transmissions.push({ de: moi, a: vers, date: isoComplet(now), mot: String(mot || '').trim(), renvoi: false });
    l.proprietaire = vers; l.statut = 'nouveau'; l.prochaine = null;
    trace(l, now, moi, 'Transmis par ' + nomComplet(u) + ' à ' + nomComplet(c) + ' (' + libRole(c) + ')' + (l.segment ? ', segment ' + (l.segment === 'entreprise' ? 'Entreprise' : 'Pro') : '') + (avant === 'En cours' ? ', alors qu’il était en cours' : '') + '.');
    mail(l, now, nomComplet(c), 'Lead transmis par ' + nomComplet(u) + ' : ' + l.entreprise);
    mail(l, now, 'dirigeant', 'Votre interlocuteur sera ' + nomComplet(c) + ' (' + libRole(c) + ')');
    return { ok: true, message: 'Lead transmis à ' + nomComplet(c) + '. Vous le suivez dans « Transmis par moi ».' };
  }
  function renvoyer(etat, id, moi, mot, now) {
    var l = lead(etat, id), u = trouver(etat, moi); if (!l || !u) return refus('Lead introuvable.');
    var t = derniereTransmission(l);
    if (!proprio(l, moi) || l.statut !== 'nouveau' || !t || t.a !== moi || t.renvoi) return refus('Seul un lead reçu d’un collègue, pas encore pris en charge, peut être renvoyé.');
    var exp = trouver(etat, t.de);
    if (!String(mot || '').trim()) return refus('Expliquez en un mot pourquoi vous renvoyez ce lead.');
    l.transmissions.push({ de: moi, a: t.de, date: isoComplet(now), mot: String(mot).trim(), renvoi: true });
    l.proprietaire = t.de; l.segment = null;
    trace(l, now, moi, 'Renvoyé par ' + nomComplet(u) + ' à ' + nomComplet(exp) + ' : classement contesté.');
    mail(l, now, nomComplet(exp), 'Lead renvoyé par ' + nomComplet(u) + ' : ' + l.entreprise);
    return { ok: true, message: 'Lead renvoyé à ' + nomComplet(exp) + '.' };
  }
  function planifier(etat, id, moi, action, date, note, now) {
    var l = lead(etat, id); if (!l) return refus('Lead introuvable.');
    if (!proprio(l, moi) || l.statut !== 'en_cours') return refus('Prenez d’abord le lead en charge.');
    if (!ACTIONS[action]) return refus('Choisissez une action.');
    if (!/^\d{4}-\d\d-\d\d$/.test(String(date || ''))) return refus('Indiquez une date.');
    l.prochaine = { action: action, date: date, note: String(note || '').trim() };
    trace(l, now, moi, 'Prochaine étape : ' + ACTIONS[action].toLowerCase() + ' avant le ' + dateLongue(date + ' 00:00:00') + (l.prochaine.note ? ' (' + l.prochaine.note + ')' : '') + '.');
    return { ok: true, message: 'Prochaine étape enregistrée.' };
  }
  function noter(etat, id, moi, texte, now) {
    var l = lead(etat, id); if (!l) return refus('Lead introuvable.');
    if (!proprio(l, moi)) return refus('Ce lead ne vous est pas attribué.');
    if (!String(texte || '').trim()) return refus('La note est vide.');
    trace(l, now, moi, 'Note : ' + String(texte).trim());
    return { ok: true, message: 'Note ajoutée.' };
  }
  function changerTelephone(etat, id, moi, tel, now) {
    var l = lead(etat, id); if (!l) return refus('Lead introuvable.');
    if (!proprio(l, moi) || l.statut !== 'en_cours') return refus('Prenez d’abord le lead en charge.');
    var t = String(tel || '').replace(/[^\d+]/g, '');
    if (!/^(\+33|0)\d{9}$/.test(t)) return refus('Numéro de téléphone incomplet.');
    l.contact.tel = t.replace(/^\+33/, '0').replace(/(\d{2})(?=\d)/g, '$1 ');
    trace(l, now, moi, 'Téléphone du dirigeant modifié.');
    return { ok: true, message: 'Téléphone modifié.' };
  }
  function cloturer(etat, id, moi, motif, note, now) {
    var l = lead(etat, id), u = trouver(etat, moi); if (!l || !u) return refus('Lead introuvable.');
    if (!proprio(l, moi)) return refus('Ce lead ne vous est pas attribué.');
    if (l.statut === 'cloture') return refus('Ce lead est déjà clôturé.');
    if (!MOTIFS[motif]) return refus('Choisissez un motif de clôture.');
    l.statut = 'cloture'; l.cloture = { motif: motif, note: String(note || '').trim(), date: isoComplet(now) };
    trace(l, now, moi, 'Clôturé par ' + nomComplet(u) + ' : ' + MOTIFS[motif] + (l.cloture.note ? ' (' + l.cloture.note + ')' : '') + '.');
    return { ok: true, message: 'Lead clôturé : ' + MOTIFS[motif] + '.' };
  }
  function rouvrir(etat, id, moi, now) {
    var l = lead(etat, id), u = trouver(etat, moi); if (!l || !u) return refus('Lead introuvable.');
    if (!proprio(l, moi) || l.statut !== 'cloture') return refus('Seul un lead clôturé que vous suivez peut être rouvert.');
    l.statut = 'en_cours'; l.cloture = null;
    trace(l, now, moi, 'Rouvert par ' + nomComplet(u) + '.');
    return { ok: true, message: 'Lead rouvert : il revient dans « En cours ».' };
  }
  /* arrivée d'une demande du portail (S, A, B ou C) : fusion avec un lead ouvert de la même entreprise, sinon création et attribution */
  function recevoir(etat, d, now) {
    var ouvert = etat.leads.filter(function (l) { return l.statut !== 'cloture' && d.cle && l.cle === d.cle; })[0];
    if (ouvert) {
      var f = fusionnerType(ouvert.type, d.type);
      var change = f.type !== ouvert.type;
      ouvert.type = f.type; ouvert.rappel = ouvert.rappel || f.rappel;
      if (d.origine && change) ouvert.origine = d.origine;
      (d.solutions || []).forEach(function (s) { if (ouvert.solutions.indexOf(s) < 0) ouvert.solutions.push(s); });
      trace(ouvert, now, 'portail', 'Nouvelle visite du portail (site ' + d.site + ') : ' + TYPES[d.type].lib.toLowerCase() + (change ? ' ; le lead passe en « ' + TYPES[f.type].lib + ' »' : ' ; type inchangé') + (f.rappel && d.type === 'rappel' ? ', mention « Rappel demandé »' : '') + '.');
      return { ok: true, lead: ouvert, fusion: true, message: 'Demande rattachée au lead existant ' + ouvert.entreprise + (change ? ' (type mis à jour)' : '') + '.' };
    }
    var expert = etat.users.filter(function (u) { return u.role === 'expert_brh' && u.actif !== false && (u.deps || []).indexOf(d.dep) >= 0; })[0]
      || etat.users.filter(function (u) { return u.role === 'expert_brh' && u.actif !== false; })[0];
    etat.seq = (etat.seq || 200) + 1;
    var l = {
      id: 'BRH-26-' + ('000000' + etat.seq).slice(-6), cle: d.cle || ('auto-' + etat.seq), site: d.site, type: d.type, origine: d.origine || (d.type === 'devis' ? 'devis' : d.type === 'rappel' ? 'rappel' : 'diagnostic'),
      rappel: false, entreprise: d.entreprise, effectif: d.effectif, ville: d.ville, dep: d.dep, convention: d.convention || '', estimation: d.estimation || null,
      solutions: d.solutions || [], contact: d.contact, client: d.client || 'non_declare', visite: isoComplet(now), echeance: echeanceOrigine(d.type, now),
      statut: 'nouveau', segment: null, proprietaire: expert.email, transmissions: [], prochaine: null, cloture: null, historique: [], emails: []
    };
    trace(l, now, 'portail', 'Visite du portail (site ' + d.site + ') : ' + TYPES[d.type].lib.toLowerCase() + ' ; lead attribué à ' + nomComplet(expert) + '.');
    mail(l, now, 'dirigeant', 'Accusé de réception de votre demande');
    mail(l, now, nomComplet(expert), 'Nouveau lead : ' + l.entreprise + ' (' + TYPES[d.type].lib + ')');
    etat.leads.push(l);
    return { ok: true, lead: l, fusion: false, message: 'Nouveau lead ' + l.entreprise + ' attribué à ' + nomComplet(expert) + '.' };
  }

  var LM3 = {
    TYPES: TYPES, STATUTS: STATUTS, ROLES: ROLES, SOLUTIONS: SOLUTIONS, ORIGINES: ORIGINES, ACTIONS: ACTIONS, MOTIFS: MOTIFS, SEUIL_ENTREPRISE: SEUIL_ENTREPRISE,
    dt: dt, iso: iso, isoComplet: isoComplet, ferie: ferie, ouvre: ouvre, plusOuvres: plusOuvres, moinsOuvres: moinsOuvres, dateCourte: dateCourte, dateLongue: dateLongue,
    echeanceOrigine: echeanceOrigine, echeanceAffichee: echeanceAffichee, segmentSuggere: segmentSuggere, fusionnerType: fusionnerType,
    derniereTransmission: derniereTransmission, situation: situation, visible: visible, transmisParMoi: transmisParMoi, filtrer: filtrer, compter: compter, trier: trier,
    nomComplet: nomComplet, libRole: libRole, trouver: trouver, lead: lead, collegues: collegues, norm: norm,
    prendreEnCharge: prendreEnCharge, transmettre: transmettre, renvoyer: renvoyer, planifier: planifier, noter: noter, changerTelephone: changerTelephone,
    cloturer: cloturer, rouvrir: rouvrir, recevoir: recevoir
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = LM3; else racine.LM3 = LM3;
})(typeof window !== 'undefined' ? window : this);
