/* Module LM 3.0 — 16/11/2026 · interface de la console simplifiée (démonstration, données fictives) · historique : VERSIONS.md */
/* ==============================================================
   console3.js — CONSOLE DE L'EXPERT BRH, DE L'EXPERT BRH PRO ET DU CONSEILLER PRO
   Cahier des charges cdcbrh V2.13, page P4. Toutes les règles passent par lm3-regles.js (LM3).
   Démonstration : état gardé dans ce navigateur (localStorage, clé lm3-demo-1), réinitialisable.
   ============================================================== */
(function () {
  'use strict';
  var L = window.LM3, DEMO = window.LM3_DEMO;
  var CLE = 'lm3-demo-1';
  var etat = null;
  var ui = { moi: '', onglet: 'leads', vue: 'nouveau', recherche: '', sel: null, panneau: null, cible: 'pro', choix: null, rechAnn: '', rechCol: '', erreur: '' };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function eur(n) { return Math.round(+n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €'; }
  function now() { return new Date(); }
  function roleMin(u) { var r = L.libRole(u); return r.charAt(0).toLowerCase() + r.slice(1); }

  /* ---------------- état de démonstration ---------------- */
  function charger() {
    try { var s = localStorage.getItem(CLE); if (s) { var e = JSON.parse(s); if (e && e.version === 'LM3-demo-1') return e; } } catch (x) { /* navigation privée : état en mémoire */ }
    return DEMO.genererDemo(L, now());
  }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(etat)); localStorage.setItem(CLE + '-moi', ui.moi); } catch (x) { /* rien */ } }
  function moi() { return L.trouver(etat, ui.moi); }
  function toast(m, erreur) {
    var t = $('toast'); t.textContent = m; t.className = erreur ? 'e' : ''; clearTimeout(toast.h);
    toast.h = setTimeout(function () { t.className = 'hidden'; }, 4200);
  }
  function agir(r) {
    if (!r.ok) { ui.erreur = r.erreur; rendre(); toast(r.erreur, true); return false; }
    ui.erreur = ''; ui.panneau = null; sauver(); rendre(); toast(r.message); return true;
  }

  /* ---------------- vignettes ---------------- */
  function vg(txt, cls, big) { return '<span class="vg' + (cls ? ' ' + cls : '') + (big ? ' big' : '') + '">' + esc(txt) + '</span>'; }
  function vType(l, big, avecDelai) {
    var T = L.TYPES[l.type];
    return vg(T.lib + (avecDelai ? ' · ' + T.delai : ''), T.ton, big);
  }
  function vSolutions(l, big) { return l.solutions.map(function (s) { return vg(L.SOLUTIONS[s] || s, '', big); }).join(' '); }
  function vEcheance(l, big, prefixe) {
    var e = L.echeanceAffichee(l, now());
    if (e.etat === 'clos') return vg(e.lib, 'clos', big);
    return vg((prefixe || '') + e.jour, e.etat === 'depassee' ? 'late' : 'ok', big);
  }
  function libSegment(l) {
    if (l.segment === 'entreprise') return 'Segment Entreprise';
    if (l.segment === 'pro') return 'Segment Pro';
    return L.segmentSuggere(l.effectif) ? 'Segment Entreprise a priori' : '';
  }

  /* ---------------- rendu général ---------------- */
  function rendre() {
    var u = moi();
    document.querySelectorAll('nav.top button').forEach(function (b) { if (b.getAttribute('data-v') === ui.onglet) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (ui.onglet === 'annuaire') { $('app').innerHTML = annuaire(); return; }
    var c = L.compter(etat.leads, u);
    var liste = L.trier(L.filtrer(etat.leads, u, ui.vue, ui.recherche), ui.vue, now());
    if (!ui.sel || !liste.some(function (l) { return l.id === ui.sel; })) { ui.sel = liste.length ? liste[0].id : null; ui.panneau = null; }
    var admin = u.role === 'admin';
    var h = '<div class="card">';
    h += '<div class="band"><h1>Console de l\'expert BRH' + (admin ? ' · vue administrateur' : '') + '</h1><div class="who">Crédit Agricole Anjou Maine · ' + esc(L.nomComplet(u)) + ', ' + esc(roleMin(u)) + '</div></div>';
    if (admin) {
      h += '<div class="kpis" aria-label="Leads ouverts par type">' + ['devis', 'simulation', 'rappel'].map(function (t) {
        return '<div class="kpi"><b>' + c.types[t] + '</b><span>Leads ouverts · ' + esc(L.TYPES[t].lib) + '</span></div>';
      }).join('') + '</div>';
    }
    h += '<div class="tools"><div class="seg" role="group" aria-label="Statut de traitement">';
    [['nouveau', 'Nouveaux'], ['en_cours', 'En cours'], ['cloture', 'Clôturés']].forEach(function (x) {
      h += '<button type="button" data-a="vue" data-v="' + x[0] + '" aria-pressed="' + (ui.vue === x[0]) + '">' + x[1] + (x[0] !== 'cloture' ? ' · ' + c[x[0]] : '') + '</button>';
    });
    h += '</div>';
    if (!admin) h += '<button type="button" class="btn" data-a="vue" data-v="transmis" aria-pressed="' + (ui.vue === 'transmis') + '">Transmis par moi · ' + c.transmis + '</button>';
    h += '<label class="search">Rechercher une entreprise, un nom, une ville<input type="search" id="q" value="' + esc(ui.recherche) + '" autocomplete="off"></label></div>';
    h += '<div class="split">' + listeHtml(liste, u) + ficheHtml(L.lead(etat, ui.sel), u) + '</div></div>';
    $('app').innerHTML = h;
  }

  function listeHtml(liste, u) {
    var col3 = ui.vue === 'en_cours' ? 'Prochaine étape' : ui.vue === 'cloture' ? 'Clôture' : ui.vue === 'transmis' ? 'Suivi' : 'Échéance';
    var h = '<section class="list" aria-label="Liste des leads"><div class="grid lh"><div>Date visite portail</div><div>Lead et demande</div><div>' + col3 + '</div></div>';
    if (!liste.length) {
      var vide = { nouveau: 'Aucun nouveau lead.', en_cours: 'Aucun lead en cours.', cloture: 'Aucun lead clôturé.', transmis: 'Vous n\'avez transmis aucun lead.' }[ui.vue];
      return h + '<p class="empty">' + (ui.recherche ? 'Aucun lead ne correspond à « ' + esc(ui.recherche) + ' ».' : vide) + '</p></section>';
    }
    liste.forEach(function (l) {
      var t = L.derniereTransmission(l), recuParMoi = t && t.a === l.proprietaire;
      var c1 = '<span style="grid-column:1;grid-row:1">' + vg(L.dateCourte(l.visite)) + '</span>';
      if (recuParMoi && ui.vue !== 'transmis') c1 += '<span style="grid-column:1;grid-row:2">' + vg((t.renvoi ? 'Renvoyé ' : 'Transmis ') + L.dateCourte(t.date), 'trans') + '</span>';
      if (ui.vue === 'transmis') { var tm = dernierePar(l, u.email); c1 += '<span style="grid-column:1;grid-row:2">' + vg((tm.renvoi ? 'Renvoyé ' : 'Transmis ') + L.dateCourte(tm.date), 'trans') + '</span>'; }
      var ligne2 = esc(l.contact.nom) + ' · ' + esc(l.ville) + ' (' + l.dep + ') · ' + l.effectif + ' sal.';
      if (u.role === 'admin') ligne2 += ' · chez ' + esc(L.nomComplet(L.trouver(etat, l.proprietaire)));
      var c3a = '', c3b = '';
      if (ui.vue === 'transmis') {
        var p = L.trouver(etat, l.proprietaire);
        c3a = l.statut === 'nouveau' ? vEcheance(l) : vg(l.statut === 'en_cours' ? 'Pris en charge' : 'Clôturé', 'clos');
        c3b = (l.statut === 'nouveau' ? 'Chez ' : 'Par ') + esc(L.nomComplet(p));
      } else if (ui.vue === 'cloture') {
        c3a = vEcheance(l); c3b = l.cloture ? 'le ' + L.dateCourte(l.cloture.date) : '';
      } else {
        var e = L.echeanceAffichee(l, now());
        c3a = vEcheance(l);
        c3b = e.action ? esc(e.action) : (l.rappel ? 'Rappel demandé' : '');
      }
      h += '<button type="button" class="grid row" data-a="sel" data-v="' + l.id + '"' + (l.id === ui.sel ? ' aria-current="true"' : '') + '>' + c1
        + '<span style="grid-column:2;grid-row:1" class="n">' + esc(l.entreprise) + '</span>'
        + '<span style="grid-column:2;grid-row:2" class="c2">' + ligne2 + '</span>'
        + '<span style="grid-column:2;grid-row:3" class="tags">' + vType(l) + ' ' + vSolutions(l) + '</span>'
        + '<span style="grid-column:3;grid-row:1">' + c3a + '</span>'
        + (c3b ? '<span style="grid-column:3;grid-row:2" class="c2">' + c3b + '</span>' : '')
        + '</button>';
    });
    return h + '</section>';
  }
  function dernierePar(l, email) { var r = null; (l.transmissions || []).forEach(function (t) { if (t.de === email) r = t; }); return r; }

  /* ---------------- fiche du lead ---------------- */
  function ficheHtml(l, u) {
    if (!l) return '<section class="fiche" aria-label="Fiche du lead"><p class="empty">Sélectionnez un lead dans la liste.</p></section>';
    var proprio = l.proprietaire === u.email, admin = u.role === 'admin';
    var sit = L.situation(l, u.email);
    var h = '<section class="fiche" aria-label="Fiche du lead">';
    h += '<div><div class="ref">' + l.id + ' · visite du portail le ' + L.dateLongue(l.visite) + ' · site ' + l.site + ' · ' + esc(L.ORIGINES[l.origine] || '') + '</div>';
    h += '<h2 class="t">' + esc(l.entreprise) + '</h2><div class="tagrow">' + vType(l, true, true) + ' ' + vEcheance(l, true, l.statut === 'en_cours' && l.prochaine ? 'Prochaine étape ' : 'Échéance ')
      + ' ' + vg(l.effectif + ' salariés', '', true) + ' ' + vg(l.ville + ' (' + l.dep + ')', '', true)
      + (libSegment(l) ? ' ' + vg(libSegment(l), 'seg', true) : '') + (l.rappel ? ' ' + vg('Rappel demandé', '', true) : '') + '</div></div>';
    if (ui.erreur) h += '<p class="err" role="alert">' + esc(ui.erreur) + '</p>';
    if (admin) h += '<p class="note">Vue administrateur, en lecture seule. Propriétaire : <b>' + esc(L.nomComplet(L.trouver(etat, l.proprietaire))) + '</b> (' + esc(roleMin(L.trouver(etat, l.proprietaire))) + ').</p>';
    else if (!proprio) h += suiviTransmis(l, u);
    else h += blocDecision(l, u, sit);
    h += preparer(l) + contact(l, proprio && (l.statut !== 'nouveau'));
    if (proprio && !admin) h += actions(l);
    h += historique(l) + emails(l);
    return h + '</section>';
  }
  function suiviTransmis(l, u) {
    var t = dernierePar(l, u.email), p = L.trouver(etat, l.proprietaire);
    var etatTxt = l.statut === 'nouveau' ? 'pas encore pris en charge' : l.statut === 'en_cours' ? 'pris en charge le ' + L.dateCourte(l.pris_le) : 'clôturé (' + (L.MOTIFS[l.cloture.motif] || '') + ')';
    return '<p class="note">' + (t.renvoi ? 'Renvoyé' : 'Transmis') + ' le ' + L.dateCourte(t.date) + ' à <b>' + esc(L.nomComplet(p)) + '</b> (' + esc(roleMin(p)) + ') : ' + etatTxt + '. Suivi en lecture seule.</p>';
  }
  function blocDecision(l, u, sit) {
    var h = '', t = L.derniereTransmission(l), exp = t ? L.trouver(etat, t.de) : null;
    if (sit === 'recu') {
      h += '<div class="box"><h3>Transmis par ' + esc(L.nomComplet(exp)) + '</h3><p class="hint">' + esc(L.libRole(exp)) + ' · le ' + L.dateLongue(t.date)
        + (l.segment ? ' · classé ' + (l.segment === 'pro' ? 'Pro' : 'Entreprise') : '') + ' · l\'échéance d\'origine (' + L.dateCourte(l.echeance) + ') est conservée</p>';
      if (t.mot) h += '<p class="quote">« ' + esc(t.mot) + ' »</p>';
      if (ui.panneau === 'renvoyer') {
        h += '<label class="fld">Pourquoi le renvoyez-vous ? (obligatoire)<textarea id="mot-renvoi" rows="2"></textarea></label>'
          + '<div class="btns"><button type="button" class="btn p" data-a="renvoyer-ok">Renvoyer à ' + esc(L.nomComplet(exp)) + '</button><button type="button" class="btn" data-a="fermer">Annuler</button></div>';
      } else {
        h += '<div class="btns"><button type="button" class="btn p big" data-a="prendre" data-v="' + (l.segment || 'pro') + '">Je prends en charge</button>'
          + '<button type="button" class="btn s big" data-a="panneau" data-v="renvoyer">Renvoyer à ' + esc(L.nomComplet(exp)) + '</button></div>'
          + '<p class="hint" style="margin:0">Renvoyez-le si le classement ne vous semble pas juste : il retourne dans ses Nouveaux, avec votre mot.</p>';
      }
      return h + '</div>' + (ui.panneau === 'transmettre' ? panneauTransmettre(l, u) : '');
    }
    if (sit === 'a_qualifier' || sit === 'renvoye') {
      if (sit === 'renvoye') h += '<p class="note"><b>Renvoyé par ' + esc(L.nomComplet(exp)) + '</b> (' + esc(roleMin(exp)) + ') le ' + L.dateCourte(t.date) + ' : « ' + esc(t.mot) + ' »</p>';
      var sug = L.segmentSuggere(l.effectif);
      if (ui.panneau === 'transmettre') return h + panneauTransmettre(l, u);
      h += '<div class="box"><h3>Entreprise ou Pro ?</h3><p class="hint">' + (sug
        ? 'Segment Entreprise a priori : ' + l.effectif + ' salariés (50 et plus). Confirmez, ou corrigez si l\'échange avec le dirigeant montre qu\'il relève du marché des Pros.'
        : 'Pas de suggestion pour ce lead (moins de 50 salariés) : c\'est vous qui tranchez.') + ' Autre repère : plus de 3 M€ de chiffre d\'affaires, à vérifier à l\'appel.</p>';
      if (u.role === 'expert_brh') {
        h += '<div class="btns"><button type="button" class="btn p big" data-a="prendre" data-v="entreprise">Entreprise : je traite le lead</button>'
          + '<button type="button" class="btn s big" data-a="transmettre" data-v="pro">Pro : je transmets à un collègue</button></div>';
      } else {
        h += '<div class="btns"><button type="button" class="btn p big" data-a="prendre" data-v="pro">Pro : je traite le lead</button>'
          + '<button type="button" class="btn s big" data-a="transmettre" data-v="entreprise">Entreprise : je transmets à un expert BRH</button></div>';
      }
      return h + '</div>';
    }
    if (sit === 'en_cours') {
      var autre = l.segment === 'pro' ? 'entreprise' : 'pro';
      h += '<p class="note">Vous avez pris ce lead en charge le ' + L.dateCourte(l.pris_le) + '. Le dirigeant a reçu votre nom par e-mail. '
        + '<a href="#" data-a="transmettre" data-v="' + autre + '">' + (autre === 'pro' ? 'Finalement un Pro ? Le transmettre' : 'Finalement une Entreprise ? La transmettre à un expert BRH') + '</a></p>';
      if (ui.panneau === 'transmettre') return h + panneauTransmettre(l, u);
      var p = l.prochaine || { action: 'rappeler', date: L.iso(L.plusOuvres(now(), 1)), note: '' };
      h += '<div class="box"><h3>Prochaine étape</h3><div class="frow">'
        + '<label class="fld" style="flex:2 1 220px">Action<select id="pe-action">' + Object.keys(L.ACTIONS).map(function (k) { return '<option value="' + k + '"' + (k === p.action ? ' selected' : '') + '>' + L.ACTIONS[k] + '</option>'; }).join('') + '</select></label>'
        + '<label class="fld" style="flex:1 1 160px">Avant le<input type="date" id="pe-date" value="' + esc(p.date) + '"></label>'
        + '<button type="button" class="btn p" data-a="planifier">Enregistrer</button></div>'
        + '<label class="fld">Note (facultatif)<textarea id="pe-note" rows="2">' + esc(p.note) + '</textarea></label></div>';
      return h;
    }
    if (sit === 'cloture') {
      return '<div class="box"><h3>Clôturé le ' + L.dateCourte(l.cloture.date) + ' : ' + esc(L.MOTIFS[l.cloture.motif]) + '</h3>'
        + (l.cloture.note ? '<p class="hint">' + esc(l.cloture.note) + '</p>' : '')
        + '<div class="btns"><button type="button" class="btn s" data-a="rouvrir">Rouvrir le lead</button></div></div>';
    }
    return h;
  }
  function panneauTransmettre(l, u) {
    var cible = ui.cible;
    var props = L.collegues(etat, l, u.email, cible).slice(0, 4);
    var q = L.norm(ui.rechCol);
    var autres = q ? etat.users.filter(function (x) {
      return x.email !== u.email && x.role !== 'admin' && props.indexOf(x) < 0 && [x.prenom + ' ' + x.nom, x.agence, x.email].some(function (s) { return L.norm(s).indexOf(q) >= 0; });
    }) : [];
    if (!ui.choix || !L.trouver(etat, ui.choix) || ui.choix === u.email) ui.choix = props.length ? props[0].email : null;
    var radio = function (x) {
      var but = x.role === 'conseiller_pro' ? 'Pour réaliser le devis avec le dirigeant' : x.role === 'expert_brh_pro' ? 'Pour analyser le dossier' : 'Pour traiter le lead Entreprise';
      return '<label class="opt"><input type="radio" name="collegue" value="' + esc(x.email) + '"' + (ui.choix === x.email ? ' checked' : '') + '><span><b>' + esc(L.nomComplet(x)) + '</b> · '
        + esc(roleMin(x)) + ', ' + esc(x.agence) + '<small>' + but + ' · ' + esc(x.email) + '</small></span></label>';
    };
    var h = '<div class="box"><h3>' + (cible === 'pro' ? 'Transmettre à un collègue Pro' : 'Transmettre à un expert BRH') + '</h3>'
      + '<fieldset><legend>À qui le transmettre ?</legend>' + (props.length ? props.map(radio).join('') : '<p class="small">Aucun collègue proposé.</p>')
      + '<label class="fld" style="margin-top:4px">Chercher un autre collègue dans l\'annuaire<input type="search" id="rech-col" value="' + esc(ui.rechCol) + '" placeholder="Nom, agence ou e-mail"></label>'
      + autres.map(radio).join('') + (q && !autres.length ? '<p class="small">Aucun autre collègue ne correspond.</p>' : '') + '</fieldset>'
      + '<label class="fld">Un mot pour votre collègue (facultatif)<textarea id="mot-trans" rows="2"></textarea></label>'
      + '<p class="quote small">Le lead passe dans les <b>Nouveaux</b> de votre collègue, qui retrouve la même console. Vous le suivez dans <b>Transmis par moi</b>. Le dirigeant est prévenu par e-mail du nom de son interlocuteur.</p>'
      + '<div class="btns"><button type="button" class="btn p" data-a="transmettre-ok">Transmettre le lead</button><button type="button" class="btn" data-a="fermer">Annuler</button></div></div>';
    return h;
  }
  function preparer(l) {
    var lignes = [];
    lignes.push(l.estimation ? eur(l.estimation) + ' par an <span class="small">· estimation indicative et non contractuelle</span>' : 'Estimation à établir avec le dirigeant <span class="small">· estimation indicative et non contractuelle</span>');
    if (l.convention) lignes.push(esc(l.convention) + '.');
    lignes.push(l.type === 'simulation' ? 'Priorités issues du ' + esc(L.ORIGINES[l.origine] || 'diagnostic') + ' : à reprendre pendant l\'appel.' : 'Priorités à découvrir pendant l\'appel (diagnostic non fait).');
    return '<div class="sec"><h4>Pour préparer l\'appel</h4><div class="box w"><div class="tagrow" style="align-items:center"><b style="font-weight:600">Solutions choisies</b> ' + vSolutions(l, true) + '</div>'
      + '<ul>' + lignes.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div></div>';
  }
  function contact(l, visible) {
    var cli = { declare: 'client déclaré', non_declare: 'non client déclaré', verifie: 'client vérifié' }[l.client] || 'statut client à vérifier';
    return '<div class="sec"><h4>Contact</h4><p>' + esc(l.contact.nom) + ' · ' + esc(l.contact.fonction) + ' · ' + cli + ' · <a href="#" data-a="info" data-v="Vérification du statut client : dans la base clients de la Caisse régionale (hors démonstration).">Vérifier le statut client</a><br>'
      + (visible ? esc(l.contact.tel) + ' · ' + esc(l.contact.email) : '<span class="small">Téléphone et e-mail affichés après la prise en charge.</span>') + '</p></div>';
  }
  function actions(l) {
    if (l.statut === 'cloture') return '';
    var p = ui.panneau, h = '<div class="acts">'
      + '<button type="button" class="btn ia" data-a="panneau" data-v="script" aria-pressed="' + (p === 'script') + '">Script d\'appel IA</button>'
      + '<button type="button" class="btn ia" data-a="panneau" data-v="email" aria-pressed="' + (p === 'email') + '">E-mail IA</button>'
      + '<button type="button" class="btn" data-a="panneau" data-v="plus" aria-pressed="' + (p === 'plus' || p === 'note' || p === 'tel' || p === 'rdv') + '">Plus d\'actions</button>'
      + '<button type="button" class="btn d end" data-a="panneau" data-v="cloturer" aria-pressed="' + (p === 'cloturer') + '">Clôturer</button></div>';
    var enCours = l.statut === 'en_cours';
    if (p === 'plus' || p === 'note' || p === 'tel' || p === 'rdv') {
      h += '<div class="menu"><button type="button" class="btn" data-a="panneau" data-v="rdv"' + (enCours ? '' : ' disabled title="Prenez d\'abord le lead en charge"') + '>Planifier un rendez-vous</button>'
        + '<button type="button" class="btn" data-a="panneau" data-v="note">Ajouter une note</button>'
        + '<button type="button" class="btn" data-a="panneau" data-v="tel"' + (enCours ? '' : ' disabled title="Prenez d\'abord le lead en charge"') + '>Modifier le téléphone</button></div>';
    }
    if (p === 'note') h += '<div class="box w"><label class="fld">Note<textarea id="note-txt" rows="3"></textarea></label><div class="btns"><button type="button" class="btn p" data-a="noter">Ajouter la note</button><button type="button" class="btn" data-a="fermer">Annuler</button></div></div>';
    if (p === 'tel') h += '<div class="box w"><label class="fld">Nouveau téléphone du dirigeant<input type="tel" id="tel-txt" value="' + esc(l.contact.tel) + '"></label><div class="btns"><button type="button" class="btn p" data-a="tel">Enregistrer</button><button type="button" class="btn" data-a="fermer">Annuler</button></div></div>';
    if (p === 'rdv') h += '<div class="box w"><label class="fld">Date du rendez-vous<input type="date" id="rdv-date" value="' + L.iso(L.plusOuvres(now(), 2)) + '"></label><label class="fld">Lieu ou précision (facultatif)<input type="text" id="rdv-note"></label><div class="btns"><button type="button" class="btn p" data-a="rdv">Planifier</button><button type="button" class="btn" data-a="fermer">Annuler</button></div></div>';
    if (p === 'script') h += '<div class="sec"><h4>Script d\'appel (démonstration : texte type, sans IA)</h4><p class="txt">' + esc(script(l)) + '</p></div>';
    if (p === 'email') h += '<div class="sec"><h4>Proposition d\'e-mail (démonstration : texte type, sans IA)</h4><p class="txt">' + esc(courriel(l)) + '</p></div>';
    if (p === 'cloturer') {
      h += '<div class="box w"><fieldset><legend>Motif de clôture</legend>' + Object.keys(L.MOTIFS).map(function (k, i) {
        return '<label class="opt" style="min-height:44px"><input type="radio" name="motif" value="' + k + '"' + (i === 0 ? ' checked' : '') + '><span>' + L.MOTIFS[k] + '</span></label>';
      }).join('') + '</fieldset><label class="fld">Précision (facultatif)<input type="text" id="clo-note"></label>'
        + '<div class="btns"><button type="button" class="btn d" data-a="cloturer">Clôturer le lead</button><button type="button" class="btn" data-a="fermer">Annuler</button></div></div>';
    }
    return h;
  }
  function historique(l) {
    return '<div class="sec"><h4>Historique</h4><ul class="small">' + l.historique.slice().reverse().map(function (x) {
      return '<li>' + L.dateCourte(x.date) + ' · ' + esc(x.texte) + '</li>';
    }).join('') + '</ul></div>';
  }
  function emails(l) {
    return '<div class="sec"><h4>E-mails automatiques</h4><ul class="small mails">' + l.emails.slice().reverse().map(function (m) {
      return '<li>' + L.dateCourte(m.date) + ' · à ' + esc(m.a === 'dirigeant' ? l.contact.nom + ' (dirigeant)' : m.a) + ' : ' + esc(m.objet) + ' · <i>journalisé, envoi réel désactivé</i></li>';
    }).join('') + '</ul></div>';
  }
  function script(l) {
    var u = moi();
    return 'Bonjour ' + l.contact.nom + ', ' + L.nomComplet(u) + ', ' + roleMin(u) + ' au Crédit Agricole Anjou Maine.\n'
      + 'Vous avez ' + ({ devis: 'commencé un devis', simulation: 'réalisé une simulation (' + (L.ORIGINES[l.origine] || 'diagnostic') + ')', rappel: 'demandé à être rappelé' }[l.type]) + ' sur notre portail Banque des RH le ' + L.dateLongue(l.visite) + '.\n\n'
      + '1. Valider le besoin : ' + l.solutions.map(function (s) { return L.SOLUTIONS[s]; }).join(', ') + ' pour vos ' + l.effectif + ' salariés.\n'
      + '2. Découvrir : chiffre d\'affaires, organisation, contrats en place, échéances.\n'
      + '3. Proposer : un rendez-vous ou l\'envoi d\'une proposition chiffrée.\n\n'
      + (l.estimation ? 'Repère : ' + eur(l.estimation) + ' par an, estimation indicative et non contractuelle.' : 'Aucune estimation n\'a encore été faite : elle sera établie avec vous.');
  }
  function courriel(l) {
    var u = moi();
    return 'Objet : votre demande sur le portail Banque des RH\n\nBonjour ' + l.contact.nom + ',\n\n'
      + 'Suite à votre visite du ' + L.dateLongue(l.visite) + ', je serai votre interlocuteur pour ' + l.solutions.map(function (s) { return L.SOLUTIONS[s].toLowerCase(); }).join(', ') + '.\n'
      + 'Je vous propose un échange de 20 minutes cette semaine. Quel créneau vous conviendrait ?\n\n'
      + 'Bien cordialement,\n' + L.nomComplet(u) + '\n' + L.libRole(u) + ', Crédit Agricole Anjou Maine\n' + u.email;
  }

  /* ---------------- annuaire ---------------- */
  function annuaire() {
    var q = L.norm(ui.rechAnn);
    var us = etat.users.filter(function (x) { return x.role !== 'admin' && (!q || [x.prenom + ' ' + x.nom, x.agence, x.email, L.libRole(x)].some(function (s) { return L.norm(s).indexOf(q) >= 0; })); });
    return '<div class="card"><div class="band"><h1>Annuaire pro et filiales</h1><div class="who">Crédit Agricole Anjou Maine · comptes permanents, identifiant = e-mail professionnel</div></div>'
      + '<div class="tools"><label class="search">Rechercher un nom, une agence, un rôle<input type="search" id="q-ann" value="' + esc(ui.rechAnn) + '"></label></div>'
      + '<div style="overflow-x:auto"><table><thead><tr><th>Nom</th><th>Rôle</th><th>Agence</th><th>Départements</th><th>Identifiant (e-mail)</th></tr></thead><tbody>'
      + us.map(function (x) { return '<tr><td><b>' + esc(L.nomComplet(x)) + '</b></td><td>' + esc(L.libRole(x)) + '</td><td>' + esc(x.agence) + '</td><td>' + esc((x.deps || []).join(', ')) + '</td><td>' + esc(x.email) + '</td></tr>'; }).join('')
      + '</tbody></table></div></div>';
  }

  /* ---------------- événements ---------------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v'), u = moi(), t = now();
    if (b.tagName === 'A') ev.preventDefault();
    if (a === 'onglet') { ui.onglet = v; rendre(); return; }
    if (a === 'vue') { ui.vue = (ui.vue === v && v === 'transmis') ? 'nouveau' : v; ui.sel = null; ui.panneau = null; ui.erreur = ''; rendre(); return; }
    if (a === 'sel') { ui.sel = v; ui.panneau = null; ui.erreur = ''; ui.rechCol = ''; ui.choix = null; rendre(); var f = document.querySelector('.fiche'); if (f && window.innerWidth < 1100) f.scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'fermer') { ui.panneau = null; ui.erreur = ''; rendre(); return; }
    if (a === 'panneau') { ui.panneau = (ui.panneau === v) ? null : v; ui.erreur = ''; rendre(); return; }
    if (a === 'info') { toast(v); return; }
    if (a === 'transmettre') { ui.panneau = 'transmettre'; ui.cible = v; ui.choix = null; ui.rechCol = ''; ui.erreur = ''; rendre(); return; }
    if (a === 'prendre') { var id = ui.sel; if (agir(L.prendreEnCharge(etat, id, u.email, v, t))) { ui.vue = 'en_cours'; ui.sel = id; rendre(); } return; }
    if (a === 'transmettre-ok') {
      var r = document.querySelector('input[name=collegue]:checked');
      if (!r) { agir({ ok: false, erreur: 'Choisissez un collègue.' }); return; }
      agir(L.transmettre(etat, ui.sel, u.email, r.value, $('mot-trans').value, ui.cible, t)); return;
    }
    if (a === 'renvoyer-ok') { agir(L.renvoyer(etat, ui.sel, u.email, $('mot-renvoi').value, t)); return; }
    if (a === 'planifier') { agir(L.planifier(etat, ui.sel, u.email, $('pe-action').value, $('pe-date').value, $('pe-note').value, t)); return; }
    if (a === 'rdv') { var n = $('rdv-note').value; agir(L.planifier(etat, ui.sel, u.email, 'rdv', $('rdv-date').value, n, t)); return; }
    if (a === 'noter') { agir(L.noter(etat, ui.sel, u.email, $('note-txt').value, t)); return; }
    if (a === 'tel') { agir(L.changerTelephone(etat, ui.sel, u.email, $('tel-txt').value, t)); return; }
    if (a === 'cloturer') { var m = document.querySelector('input[name=motif]:checked'); if (agir(L.cloturer(etat, ui.sel, u.email, m ? m.value : '', $('clo-note').value, t))) { ui.vue = 'cloture'; rendre(); } return; }
    if (a === 'rouvrir') { if (agir(L.rouvrir(etat, ui.sel, u.email, t))) { ui.vue = 'en_cours'; rendre(); } return; }
  });
  document.addEventListener('input', function (ev) {
    var id = ev.target.id;
    if (id === 'q') { ui.recherche = ev.target.value; garderFocus('q', function () { rendre(); }); }
    else if (id === 'q-ann') { ui.rechAnn = ev.target.value; garderFocus('q-ann', function () { rendre(); }); }
    else if (id === 'rech-col') {
      ui.rechCol = ev.target.value;
      var mot = $('mot-trans') ? $('mot-trans').value : '';
      garderFocus('rech-col', function () { rendre(); if ($('mot-trans')) $('mot-trans').value = mot; });
    }
  });
  document.addEventListener('change', function (ev) { if (ev.target.name === 'collegue') ui.choix = ev.target.value; });
  function garderFocus(id, f) {
    var el = $(id), pos = el ? el.selectionStart : 0; f();
    var n = $(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* rien */ } }
  }

  /* ---------------- barre de démonstration ---------------- */
  function remplirPersonas() {
    $('persona').innerHTML = etat.users.map(function (x) { return '<option value="' + esc(x.email) + '"' + (x.email === ui.moi ? ' selected' : '') + '>' + esc(L.nomComplet(x) + ' — ' + L.libRole(x)) + '</option>'; }).join('');
  }
  $('persona').addEventListener('change', function () { ui.moi = this.value; ui.vue = 'nouveau'; ui.sel = null; ui.panneau = null; ui.erreur = ''; sauver(); rendre(); toast('Connecté en tant que ' + L.nomComplet(moi()) + '.'); });
  $('b-reset').addEventListener('click', function () {
    etat = DEMO.genererDemo(L, now()); ui.vue = 'nouveau'; ui.sel = null; ui.panneau = null; ui.erreur = '';
    if (!L.trouver(etat, ui.moi)) ui.moi = etat.users[0].email;
    sauver(); remplirPersonas(); rendre(); toast('Démonstration réinitialisée : données fictives de départ.');
  });
  $('b-simuler').addEventListener('click', function () {
    var opts = '<option value="nouvelle">Nouvelle entreprise (tirée au hasard)</option>' + etat.leads.filter(function (l) { return l.statut !== 'cloture'; })
      .map(function (l) { return '<option value="' + l.id + '">Même entreprise que : ' + esc(l.entreprise) + ' (' + esc(L.TYPES[l.type].lib) + ')</option>'; }).join('');
    $('s-ent').innerHTML = opts;
    var d = $('d-simuler'); if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  });
  $('f-simuler').addEventListener('submit', function (ev) {
    var d = $('d-simuler');
    if (ev.submitter && ev.submitter.value !== 'ok') return;
    var tv = $('s-type').value.split('|'), site = $('s-site').value, ent = $('s-ent').value, r;
    if (ent === 'nouvelle') {
      etat.n = (etat.n || 0) + 1;
      var p = DEMO.PIOCHE[(etat.n - 1) % DEMO.PIOCHE.length];
      var sols = tv[0] === 'rappel' ? ['sante'] : [['sante', 'epargne'], ['retraite', 'avantages'], ['epargne'], ['sante', 'avantages', 'retraite']][etat.n % 4];
      var slug = p.entreprise.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
      r = L.recevoir(etat, { cle: 'sim-' + etat.n, site: site, type: tv[0], origine: tv[1], entreprise: p.entreprise + (etat.n > DEMO.PIOCHE.length ? ' ' + etat.n : ''), effectif: p.effectif, ville: p.ville, dep: p.dep,
        solutions: sols, estimation: tv[0] === 'devis' ? p.effectif * 600 * sols.length : null,
        contact: { nom: p.contact[0], fonction: p.contact[1], tel: '06 ' + (10 + etat.n) + ' 40 52 6' + (etat.n % 10), email: 'contact@' + slug + '.invalid' } }, now());
    } else {
      var src = L.lead(etat, ent);
      r = L.recevoir(etat, { cle: src.cle, site: site, type: tv[0], origine: tv[1], solutions: [] }, now());
    }
    if (d.close) d.close(); else d.removeAttribute('open');
    ev.preventDefault();
    sauver();
    if (r.lead.proprietaire === ui.moi && r.lead.statut === 'nouveau') { ui.vue = 'nouveau'; ui.sel = r.lead.id; }
    rendre(); toast(r.message + (r.lead.proprietaire !== ui.moi ? ' Changez de personne pour le voir.' : ''));
  });

  /* ---------------- démarrage ---------------- */
  etat = charger();
  try { ui.moi = localStorage.getItem(CLE + '-moi') || ''; } catch (x) { ui.moi = ''; }
  if (!L.trouver(etat, ui.moi)) ui.moi = etat.users[0].email;
  var m = /[?&]persona=([^&]+)/.exec(location.search); if (m && L.trouver(etat, decodeURIComponent(m[1]))) ui.moi = decodeURIComponent(m[1]);
  remplirPersonas(); sauver(); rendre();
})();
