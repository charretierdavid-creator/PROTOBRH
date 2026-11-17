/* Module LM 3.0.2 — 17/11/2026 · interface de la console simplifiée (démonstration, données fictives), graphisme de la console d'origine · historique : VERSIONS.md */
/* ==============================================================
   console3.js — CONSOLE DE L'EXPERT BRH, DE L'EXPERT BRH PRO ET DU CONSEILLER PRO
   Cahier des charges cdcbrh, pages P1 et P4. Toutes les règles passent par lm3-regles.js (LM3).
   Démonstration : état gardé dans ce navigateur (localStorage, clé lm3-demo-2), réinitialisable.
   Fenêtres flottantes (#fen) : e-mails au dirigeant, script et e-mail types, rendez-vous, note, téléphone,
   clôture et simulation d'une visite du portail. Aucune boîte de dialogue du navigateur (alert, confirm).
   ============================================================== */
(function () {
  'use strict';
  var L = window.LM3, DEMO = window.LM3_DEMO;
  var CLE = 'lm3-demo-2', VERSION = 'LM3-demo-2', EXP = 'Banque des RH · Crédit Agricole Anjou Maine';
  var etat = null;
  var ui = { moi: '', onglet: 'leads', vue: 'nouveau', recherche: '', sel: null, panneau: null, plus: false, cible: 'pro', choix: null, rechAnn: '', rechCol: '', erreur: '' };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function eur(n) { return Math.round(+n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €'; }
  function now() { return new Date(); }
  function roleMin(u) { var r = L.libRole(u); return r.charAt(0).toLowerCase() + r.slice(1); }
  var ICO = {
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>'
  };

  /* ---------------- état de démonstration ---------------- */
  function charger() {
    try { var s = localStorage.getItem(CLE); if (s) { var e = JSON.parse(s); if (e && e.version === VERSION) return e; } } catch (x) { /* navigation privée : état en mémoire */ }
    return DEMO.genererDemo(L, now());
  }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(etat)); localStorage.setItem(CLE + '-moi', ui.moi); } catch (x) { /* rien */ } }
  function moi() { return L.trouver(etat, ui.moi); }
  function toast(m, erreur) {
    var t = $('toast'); t.textContent = m; t.className = erreur ? 'e' : ''; clearTimeout(toast.h);
    toast.h = setTimeout(function () { t.className = 'hidden'; }, 4200);
  }
  function agir(r) {
    if (!r.ok) { ui.erreur = r.erreur; toast(r.erreur, true); if (!$('fen').innerHTML) rendre(); else { var e = document.querySelector('.dlg .alert.e'); if (e) e.textContent = r.erreur; } return false; }
    ui.erreur = ''; ui.panneau = null; ui.plus = false; fermerFen(); sauver(); rendre(); toast(r.message); return true;
  }

  /* ---------------- fenêtres flottantes ---------------- */
  var retourFocus = null;
  function fenetre(titre, corps, pied) {
    retourFocus = document.activeElement;
    $('fen').innerHTML = '<div class="mask" data-fermer="1"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="fen-t">'
      + '<div class="dh"><h2 id="fen-t">' + esc(titre) + '</h2><button type="button" data-a="fermer-fen" aria-label="Fermer">×</button></div>'
      + '<div class="db"><p class="alert e hidden" role="alert"></p>' + corps + '</div>'
      + '<div class="df">' + (pied || '') + '<button type="button" class="btn" data-a="fermer-fen">Fermer</button></div></div></div>';
    var f = $('fen').querySelector('.db input, .db select, .db textarea, .df .btn.p') || $('fen').querySelector('.dh button');
    if (f) f.focus();
  }
  function fermerFen() { if (!$('fen').innerHTML) return; $('fen').innerHTML = ''; if (retourFocus && document.contains(retourFocus)) retourFocus.focus(); }
  $('fen').addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { fermerFen(); return; }
    if (ev.key === 'Tab') {
      var f = Array.prototype.slice.call($('fen').querySelectorAll('button, input, select, textarea, a[href]')).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); }
      else if (!ev.shiftKey && document.activeElement === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
    }
  });
  $('fen').addEventListener('mousedown', function (ev) { if (ev.target.getAttribute && ev.target.getAttribute('data-fermer')) fermerFen(); });
  function erreurFen(m) { var e = document.querySelector('.dlg .alert.e'); if (e) { e.textContent = m; e.classList.remove('hidden'); } toast(m, true); }

  /* ---------------- vignettes ---------------- */
  function vg(txt, cls, big) { return '<span class="vg' + (cls ? ' ' + cls : '') + (big ? ' big' : '') + '">' + esc(txt) + '</span>'; }
  function vType(l, big, avecDelai) { var T = L.TYPES[l.type]; return vg(T.lib + (avecDelai ? ' · ' + T.delai : ''), T.ton, big); }
  function vSolutions(l, big) { return l.solutions.map(function (s) { return vg(L.SOLUTIONS[s] || s, '', big); }).join(''); }
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
    document.querySelectorAll('nav.tabs button').forEach(function (b) { if (b.getAttribute('data-v') === ui.onglet) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (ui.onglet === 'annuaire') { $('app').innerHTML = annuaire(); return; }
    var c = L.compter(etat.leads, u);
    var liste = L.trier(L.filtrer(etat.leads, u, ui.vue, ui.recherche), ui.vue, now());
    if (!ui.sel || !liste.some(function (l) { return l.id === ui.sel; })) { ui.sel = liste.length ? liste[0].id : null; ui.panneau = null; ui.plus = false; }
    var admin = u.role === 'admin';
    var h = '<div class="cx"><div class="ctop"><h1>Console de l\'expert BRH' + (admin ? ' · vue administrateur' : '') + '<span class="sig">DÉMO</span></h1>'
      + '<div class="r">Crédit Agricole Anjou Maine · ' + esc(L.nomComplet(u)) + ', ' + esc(roleMin(u)) + '</div></div>';
    if (admin) {
      h += '<div class="kp" aria-label="Leads ouverts par type">' + ['devis', 'simulation', 'rappel'].map(function (t) {
        return '<div class="' + t + '"><b>' + c.types[t] + '</b>Leads ouverts · ' + esc(L.TYPES[t].lib) + '</div>';
      }).join('') + '</div>';
    }
    h += '<div class="filters"><div class="seg" role="group" aria-label="Statut de traitement">';
    [['nouveau', 'Nouveaux'], ['en_cours', 'En cours'], ['cloture', 'Clôturés']].forEach(function (x) {
      h += '<button type="button" data-a="vue" data-v="' + x[0] + '" aria-pressed="' + (ui.vue === x[0]) + '">' + x[1] + (x[0] !== 'cloture' ? ' · ' + c[x[0]] : '') + '</button>';
    });
    h += '</div>';
    if (!admin) h += '<button type="button" class="btn" data-a="vue" data-v="transmis" aria-pressed="' + (ui.vue === 'transmis') + '">Transmis par moi · ' + c.transmis + '</button>';
    h += '<input type="search" id="q" value="' + esc(ui.recherche) + '" placeholder="Rechercher une entreprise, un nom, une ville" aria-label="Rechercher une entreprise, un nom, une ville" autocomplete="off"></div>';
    h += '<div class="split">' + listeHtml(liste, u) + ficheHtml(L.lead(etat, ui.sel), u) + '</div></div>';
    $('app').innerHTML = h;
  }

  function listeHtml(liste, u) {
    var col3 = ui.vue === 'en_cours' ? 'Prochaine étape' : ui.vue === 'cloture' ? 'Clôture' : ui.vue === 'transmis' ? 'Suivi' : 'Échéance';
    var h = '<section class="ls" aria-label="Liste des leads"><div class="lg lh"><div>Visite portail</div><div>Lead et demande</div><div>' + col3 + '</div></div>';
    if (!liste.length) {
      var vide = { nouveau: 'Aucun nouveau lead.', en_cours: 'Aucun lead en cours.', cloture: 'Aucun lead clôturé.', transmis: 'Vous n\'avez transmis aucun lead.' }[ui.vue];
      return h + '<p class="empty">' + (ui.recherche ? 'Aucun lead ne correspond à « ' + esc(ui.recherche) + ' ».' : vide) + '</p></section>';
    }
    liste.forEach(function (l) {
      var t = L.derniereTransmission(l), recu = t && t.a === l.proprietaire;
      var c1 = '<span style="grid-column:1;grid-row:1">' + vg(L.dateCourte(l.visite)) + '</span>';
      if (ui.vue === 'transmis') { var tm = dernierePar(l, u.email); c1 += '<span style="grid-column:1;grid-row:2">' + vg((tm.renvoi ? 'Renvoyé ' : 'Transmis ') + L.dateCourte(tm.date), 'trans') + '</span>'; }
      else if (recu) c1 += '<span style="grid-column:1;grid-row:2">' + vg((t.renvoi ? 'Renvoyé ' : 'Transmis ') + L.dateCourte(t.date), 'trans') + '</span>';
      var ligne2 = esc(l.contact.nom) + ' · ' + esc(l.ville) + ' (' + l.dep + ') · ' + l.effectif + ' sal.';
      if (u.role === 'admin') ligne2 += ' · chez ' + esc(L.nomComplet(L.trouver(etat, l.proprietaire)));
      var c3a, c3b = '';
      if (ui.vue === 'transmis') {
        c3a = l.statut === 'nouveau' ? vEcheance(l) : vg(l.statut === 'en_cours' ? 'Pris en charge' : 'Clôturé', 'clos');
        c3b = (l.statut === 'nouveau' ? 'Chez ' : 'Par ') + esc(L.nomComplet(L.trouver(etat, l.proprietaire)));
      } else if (ui.vue === 'cloture') {
        c3a = vEcheance(l); c3b = l.cloture ? 'le ' + L.dateCourte(l.cloture.date) : '';
      } else {
        var e = L.echeanceAffichee(l, now());
        c3a = vEcheance(l); c3b = e.action ? esc(e.action) : (l.rappel ? 'Rappel demandé' : '');
      }
      h += '<button type="button" class="lg row" data-a="sel" data-v="' + l.id + '"' + (l.id === ui.sel ? ' aria-current="true"' : '') + '>' + c1
        + '<span style="grid-column:2;grid-row:1" class="n">' + esc(l.entreprise) + '</span>'
        + '<span style="grid-column:2;grid-row:2" class="c2">' + ligne2 + '</span>'
        + '<span style="grid-column:2;grid-row:3" class="tags">' + vType(l) + vSolutions(l) + '</span>'
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
    var proprio = l.proprietaire === u.email, admin = u.role === 'admin', sit = L.situation(l, u.email);
    var h = '<section class="fiche" aria-label="Fiche du lead">';
    h += '<div><div class="ref">' + l.id + ' · visite du portail le ' + L.dateLongue(l.visite) + ' · site ' + l.site + ' · ' + esc(L.ORIGINES[l.origine] || '') + '</div>'
      + '<h2 class="nom">' + esc(l.entreprise) + '</h2><div class="chips">' + vType(l, true, true)
      + vEcheance(l, true, l.statut === 'en_cours' && l.prochaine ? 'Prochaine étape ' : 'Échéance ')
      + vg(l.effectif + ' salariés', '', true) + vg(l.ville + ' (' + l.dep + ')', '', true)
      + (libSegment(l) ? vg(libSegment(l), 'seg', true) : '') + (l.rappel ? vg('Rappel demandé', '', true) : '') + '</div></div>';
    if (ui.erreur) h += '<p class="alert e" role="alert">' + esc(ui.erreur) + '</p>';
    h += carteContact(l, proprio && !admin && l.statut === 'en_cours');
    if (admin) h += '<p class="alert">Vue administrateur, en lecture seule. Propriétaire : <b>' + esc(L.nomComplet(L.trouver(etat, l.proprietaire))) + '</b> (' + esc(roleMin(L.trouver(etat, l.proprietaire))) + ').</p>';
    else if (!proprio) h += suiviTransmis(l, u);
    else h += blocDecision(l, u, sit) + actions(l);
    h += preparer(l) + historique(l) + emails(l);
    return h + '</section>';
  }
  /* Contact dans l'entreprise : coordonnées toujours visibles ; statut client tel que déclaré par le dirigeant sur le portail */
  function libClient(c) { return { declare: 'Se déclare client', non_declare: 'Se déclare prospect', verifie: 'Client vérifié' }[c] || 'Statut client à vérifier'; }
  function carteContact(l, actif) {
    return '<div class="sec"><h3>Contact dans l\'entreprise</h3><div class="contact">'
      + '<div class="who">' + esc(l.contact.nom) + '<small>' + esc(l.contact.fonction) + '</small></div>'
      + '<div class="meta">' + vg(libClient(l.client), l.client === 'non_declare' ? '' : 'trans') + '<a href="#" data-a="info" data-v="Vérification dans la base clients de la Caisse régionale (hors démonstration).">Vérifier le statut client</a></div>'
      + '<div class="go"><a class="btn' + (actif ? ' p' : '') + '" href="tel:' + esc(l.contact.tel.replace(/\s/g, '')) + '" data-a="info" data-v="Démonstration : l\'appel n\'est pas passé (' + esc(l.contact.tel) + ').">' + ICO.tel + esc(l.contact.tel) + '</a>'
      + '<a class="btn" href="mailto:' + esc(l.contact.email) + '" data-a="info" data-v="Démonstration : aucun e-mail n\'est envoyé (' + esc(l.contact.email) + ').">' + ICO.mail + esc(l.contact.email) + '</a></div>'
      + '</div></div>';
  }
  function suiviTransmis(l, u) {
    var t = dernierePar(l, u.email), p = L.trouver(etat, l.proprietaire);
    var etatTxt = l.statut === 'nouveau' ? 'pas encore pris en charge' : l.statut === 'en_cours' ? 'pris en charge le ' + L.dateCourte(l.pris_le) : 'clôturé (' + (L.MOTIFS[l.cloture.motif] || '') + ')';
    return '<p class="alert">' + (t.renvoi ? 'Renvoyé' : 'Transmis') + ' le ' + L.dateCourte(t.date) + ' à <b>' + esc(L.nomComplet(p)) + '</b> (' + esc(roleMin(p)) + ') : ' + etatTxt + '. Suivi en lecture seule.</p>';
  }
  function blocDecision(l, u, sit) {
    var h = '', t = L.derniereTransmission(l), exp = t ? L.trouver(etat, t.de) : null;
    if (sit === 'recu') {
      if (ui.panneau === 'transmettre') return panneauTransmettre(l, u);
      h += '<div class="dec"><h4>Transmis par ' + esc(L.nomComplet(exp)) + '</h4><p class="hint">' + esc(L.libRole(exp)) + ' · le ' + L.dateLongue(t.date)
        + (l.segment ? ' · classé ' + (l.segment === 'pro' ? 'Pro' : 'Entreprise') : '') + ' · l\'échéance d\'origine (' + L.dateCourte(l.echeance) + ') est conservée</p>';
      if (t.mot) h += '<p class="quote">« ' + esc(t.mot) + ' »</p>';
      if (ui.panneau === 'renvoyer') {
        h += '<label class="fld">Pourquoi le renvoyez-vous ? (obligatoire)<textarea id="mot-renvoi" rows="2"></textarea></label>'
          + '<div class="btns"><button type="button" class="btn p" data-a="renvoyer-ok">Renvoyer à ' + esc(L.nomComplet(exp)) + '</button><button type="button" class="btn" data-a="fermer">Annuler</button></div>';
      } else {
        h += '<div class="btns"><button type="button" class="btn p w" data-a="prendre" data-v="' + (l.segment || 'pro') + '">Je prends en charge</button>'
          + '<button type="button" class="btn s w" data-a="panneau" data-v="renvoyer">Renvoyer à ' + esc(L.nomComplet(exp)) + '</button></div>'
          + '<p class="small" style="margin:0">Renvoyez-le si le classement ne vous semble pas juste : il retourne dans ses Nouveaux, avec votre mot.</p>';
      }
      return h + '</div>';
    }
    if (sit === 'a_qualifier' || sit === 'renvoye') {
      if (sit === 'renvoye') h += '<p class="alert warn"><b>Renvoyé par ' + esc(L.nomComplet(exp)) + '</b> (' + esc(roleMin(exp)) + ') le ' + L.dateCourte(t.date) + ' : « ' + esc(t.mot) + ' »</p>';
      if (ui.panneau === 'transmettre') return h + panneauTransmettre(l, u);
      var sug = L.segmentSuggere(l.effectif);
      h += '<div class="dec"><h4>Entreprise ou Pro ?</h4><p class="hint">' + (sug
        ? 'Segment Entreprise a priori : ' + l.effectif + ' salariés (50 et plus). Confirmez, ou corrigez si l\'échange avec le dirigeant montre qu\'il relève du marché des Pros.'
        : 'Pas de suggestion pour ce lead (moins de 50 salariés) : c\'est vous qui tranchez.') + ' Autre repère : plus de 3 M€ de chiffre d\'affaires, à vérifier à l\'appel.</p>';
      h += u.role === 'expert_brh'
        ? '<div class="btns"><button type="button" class="btn p w" data-a="prendre" data-v="entreprise">Entreprise : je traite le lead</button><button type="button" class="btn s w" data-a="transmettre" data-v="pro">Pro : je transmets à un collègue</button></div>'
        : '<div class="btns"><button type="button" class="btn p w" data-a="prendre" data-v="pro">Pro : je traite le lead</button><button type="button" class="btn s w" data-a="transmettre" data-v="entreprise">Entreprise : je transmets à un expert BRH</button></div>';
      return h + '</div>';
    }
    if (sit === 'en_cours') {
      var autre = l.segment === 'pro' ? 'entreprise' : 'pro';
      h += '<p class="alert">Pris en charge le ' + L.dateCourte(l.pris_le) + ' ; le dirigeant a reçu votre nom par e-mail. '
        + '<a href="#" data-a="transmettre" data-v="' + autre + '">' + (autre === 'pro' ? 'Finalement un Pro ? Le transmettre' : 'Finalement une Entreprise ? La transmettre à un expert BRH') + '</a></p>';
      if (ui.panneau === 'transmettre') return h + panneauTransmettre(l, u);
      var p = l.prochaine || { action: 'rappeler', date: L.iso(L.plusOuvres(now(), 1)), note: '' };
      h += '<div class="dec"><h4>Prochaine étape</h4><div class="frow">'
        + '<label class="fld" style="flex:2 1 220px">Action<select id="pe-action">' + Object.keys(L.ACTIONS).map(function (k) { return '<option value="' + k + '"' + (k === p.action ? ' selected' : '') + '>' + L.ACTIONS[k] + '</option>'; }).join('') + '</select></label>'
        + '<label class="fld">Avant le<input type="date" id="pe-date" value="' + esc(p.date) + '"></label>'
        + '<button type="button" class="btn p" data-a="planifier">Enregistrer</button></div>'
        + '<label class="fld">Note (facultatif)<textarea id="pe-note" rows="2">' + esc(p.note) + '</textarea></label></div>';
      return h;
    }
    if (sit === 'cloture') {
      return '<div class="dec"><h4>Clôturé le ' + L.dateCourte(l.cloture.date) + ' : ' + esc(L.MOTIFS[l.cloture.motif]) + '</h4>'
        + (l.cloture.note ? '<p class="hint">' + esc(l.cloture.note) + '</p>' : '')
        + '<div class="btns"><button type="button" class="btn s" data-a="rouvrir">Rouvrir le lead</button></div></div>';
    }
    return h;
  }
  function panneauTransmettre(l, u) {
    var cible = ui.cible, props = L.collegues(etat, l, u.email, cible).slice(0, 4), q = L.norm(ui.rechCol);
    var autres = q ? etat.users.filter(function (x) {
      return x.email !== u.email && x.role !== 'admin' && props.indexOf(x) < 0 && [x.prenom + ' ' + x.nom, x.agence, x.email].some(function (s) { return L.norm(s).indexOf(q) >= 0; });
    }) : [];
    if (!ui.choix || !L.trouver(etat, ui.choix) || ui.choix === u.email) ui.choix = props.length ? props[0].email : null;
    var radio = function (x) {
      var but = x.role === 'conseiller_pro' ? 'Pour réaliser le devis avec le dirigeant' : x.role === 'expert_brh_pro' ? 'Pour analyser le dossier' : 'Pour traiter le lead Entreprise';
      return '<label class="opt"><input type="radio" name="collegue" value="' + esc(x.email) + '"' + (ui.choix === x.email ? ' checked' : '') + '><span><b>' + esc(L.nomComplet(x)) + '</b> · '
        + esc(roleMin(x)) + ', ' + esc(x.agence) + '<small>' + but + ' · ' + esc(x.email) + '</small></span></label>';
    };
    return '<div class="dec"><h4>' + (cible === 'pro' ? 'Transmettre à un collègue Pro' : 'Transmettre à un expert BRH') + '</h4>'
      + '<fieldset><legend>À qui le transmettre ?</legend>' + (props.length ? props.map(radio).join('') : '<p class="small">Aucun collègue proposé.</p>')
      + '<label class="fld" style="margin-top:4px">Chercher un autre collègue dans l\'annuaire<input type="search" id="rech-col" value="' + esc(ui.rechCol) + '" placeholder="Nom, agence ou e-mail"></label>'
      + autres.map(radio).join('') + (q && !autres.length ? '<p class="small">Aucun autre collègue ne correspond.</p>' : '') + '</fieldset>'
      + '<label class="fld">Un mot pour votre collègue (facultatif)<textarea id="mot-trans" rows="2"></textarea></label>'
      + '<p class="small" style="margin:0">Le lead passe dans les <b>Nouveaux</b> de votre collègue, qui retrouve la même console. Vous le suivez dans <b>Transmis par moi</b>. Le dirigeant est prévenu par e-mail du nom de son interlocuteur.</p>'
      + '<div class="btns"><button type="button" class="btn p" data-a="transmettre-ok">Transmettre le lead</button><button type="button" class="btn" data-a="fermer">Annuler</button></div></div>';
  }
  function actions(l) {
    if (l.statut === 'cloture') return '';
    var enCours = l.statut === 'en_cours', bloque = enCours ? '' : ' disabled title="Prenez d\'abord le lead en charge"';
    var h = '<div class="acts"><button type="button" class="btn ia" data-a="script">Script d\'appel IA</button>'
      + '<button type="button" class="btn ia" data-a="email-ia">E-mail IA</button>'
      + '<button type="button" class="btn" data-a="plus" aria-expanded="' + ui.plus + '">Plus d\'actions</button>'
      + '<button type="button" class="btn d end" data-a="f-cloturer">Clôturer</button></div>';
    if (ui.plus) h += '<div class="acts"><button type="button" class="btn" data-a="f-rdv"' + bloque + '>Planifier un rendez-vous</button><button type="button" class="btn" data-a="f-note">Ajouter une note</button><button type="button" class="btn" data-a="f-tel"' + bloque + '>Modifier le téléphone</button></div>';
    return h;
  }
  function preparer(l) {
    var est = l.estimation ? '<b>' + eur(l.estimation) + ' par an</b>' : 'À établir avec le dirigeant';
    return '<div class="sec"><h3>Pour préparer l\'appel</h3><div class="prep"><dl class="kv">'
      + '<dt>Solutions choisies</dt><dd><span class="chips">' + vSolutions(l) + '</span></dd>'
      + '<dt>Estimation</dt><dd>' + est + '<br><span class="small">estimation indicative et non contractuelle</span></dd>'
      + (l.convention ? '<dt>Convention collective</dt><dd>' + esc(l.convention) + '</dd>' : '')
      + '<dt>Origine</dt><dd>' + esc(L.TYPES[l.type].lib) + ' · ' + esc(L.ORIGINES[l.origine] || '') + ' · site ' + l.site + '</dd>'
      + '<dt>Priorités</dt><dd>' + (l.type === 'simulation' ? 'Issues du ' + esc(L.ORIGINES[l.origine] || 'diagnostic') + ' : à reprendre pendant l\'appel.' : 'À découvrir pendant l\'appel (diagnostic non fait).') + '</dd>'
      + '</dl></div></div>';
  }
  function historique(l) {
    return '<div class="sec"><h3>Historique</h3><ul class="hist">' + l.historique.slice().reverse().map(function (x) {
      return '<li><time>' + L.dateCourte(x.date) + '</time><span>' + esc(x.texte) + '</span></li>';
    }).join('') + '</ul></div>';
  }
  /* ---------------- e-mails envoyés au dirigeant (les messages internes restent dans l'historique) ---------------- */
  function mailsDirigeant(l) { return l.emails.map(function (m, i) { return { m: m, i: i }; }).filter(function (x) { return x.m.a === 'dirigeant'; }); }
  function emails(l) {
    var ms = mailsDirigeant(l);
    return '<div class="sec"><h3>E-mails envoyés au dirigeant · ' + ms.length + '</h3><div class="mails">' + ms.reverse().map(function (x) {
      return '<button type="button" data-a="voir-mail" data-v="' + x.i + '"><time>' + L.dateCourte(x.m.date) + '</time><span><b>' + esc(x.m.objet) + '</b></span><span class="open">Lire</span></button>';
    }).join('') + '</div></div>';
  }
  function modele(m) {
    if (m.modele) return m.modele;
    return /^Accusé/.test(m.objet) ? 'accuse' : /prise en charge/.test(m.objet) ? 'prise' : /interlocuteur/.test(m.objet) ? 'interlocuteur' : 'interne';
  }
  function corpsMail(l, m) {
    var mod = modele(m), p = m.par ? L.trouver(etat, m.par) : null, T = L.TYPES[l.type];
    var sign = '\n\nBien cordialement,\n' + EXP;
    if (mod === 'accuse') return 'Bonjour ' + l.contact.nom + ',\n\nNous avons bien reçu votre demande du ' + L.dateLongue(l.visite) + ' sur le portail Banque des RH (' + T.lib.toLowerCase() + ').\n'
      + 'Un expert de votre Caisse régionale vous contactera sous ' + T.delai + '.\n\nVotre référence : ' + l.id + sign;
    var qui = p ? L.nomComplet(p) + ', ' + roleMin(p) + ' (' + p.agence + ')' : 'votre interlocuteur';
    if (mod === 'prise') return 'Bonjour ' + l.contact.nom + ',\n\n' + qui + ', prend en charge votre demande ' + l.id + '.\n'
      + 'Votre interlocuteur vous contactera très prochainement. Vous pouvez aussi lui écrire directement : ' + (p ? p.email : '') + '.' + sign;
    if (mod === 'interlocuteur') return 'Bonjour ' + l.contact.nom + ',\n\nPour répondre au mieux à votre demande ' + l.id + ', elle est confiée à ' + qui + '.\n'
      + 'Votre nouvel interlocuteur vous contactera très prochainement. Vous pouvez aussi lui écrire : ' + (p ? p.email : '') + '.' + sign;
    return m.objet;
  }
  function ouvrirMail(l, i) {
    var m = l.emails[i]; if (!m) return;
    fenetre('E-mail envoyé au dirigeant',
      '<dl class="kv"><dt>Date</dt><dd>' + L.dateLongue(m.date) + '</dd><dt>De</dt><dd>' + esc(EXP) + '</dd><dt>À</dt><dd>' + esc(l.contact.nom) + ' &lt;' + esc(l.contact.email) + '&gt;' + '</dd><dt>Objet</dt><dd><b>' + esc(m.objet) + '</b></dd></dl>'
      + '<pre class="mailbody">' + esc(corpsMail(l, m)) + '</pre>',
      '<span class="small">Démonstration : e-mail journalisé, envoi réel désactivé.</span>');
  }

  /* ---------------- fenêtres d'action ---------------- */
  function script(l) {
    var u = moi(), fait = { devis: 'commencé un devis', simulation: 'réalisé une simulation (' + (L.ORIGINES[l.origine] || 'diagnostic') + ')', rappel: 'demandé à être rappelé' }[l.type];
    var bl = function (t, p) { return '<div class="bl"><h5>' + t + '</h5><p>' + p + '</p></div>'; };
    fenetre('Script d\'appel · ' + l.entreprise, '<div class="script">'
      + bl('1. Ouverture', 'Bonjour ' + esc(l.contact.nom) + ', ' + esc(L.nomComplet(u)) + ', ' + esc(roleMin(u)) + ' au Crédit Agricole Anjou Maine. Vous avez ' + fait + ' sur notre portail Banque des RH le ' + L.dateLongue(l.visite) + '.')
      + bl('2. Valider le besoin', esc(l.solutions.map(function (s) { return L.SOLUTIONS[s]; }).join(', ')) + ' pour vos ' + l.effectif + ' salariés.')
      + bl('3. Découvrir', 'Chiffre d\'affaires, organisation, contrats en place, échéances, attentes des salariés.')
      + bl('4. Proposer', 'Un rendez-vous ou l\'envoi d\'une proposition chiffrée.')
      + bl('Repère', l.estimation ? eur(l.estimation) + ' par an, estimation indicative et non contractuelle.' : 'Aucune estimation n\'a encore été faite : elle sera établie avec le dirigeant.')
      + '</div>', '<span class="small">Démonstration : texte type, sans IA.</span>');
  }
  function emailIA(l) {
    var u = moi();
    fenetre('Proposition d\'e-mail · ' + l.entreprise, '<pre class="mailbody">' + esc('Objet : votre demande sur le portail Banque des RH\n\nBonjour ' + l.contact.nom + ',\n\n'
      + 'Suite à votre visite du ' + L.dateLongue(l.visite) + ', je serai votre interlocuteur pour ' + l.solutions.map(function (s) { return L.SOLUTIONS[s].toLowerCase(); }).join(', ') + '.\n'
      + 'Je vous propose un échange de 20 minutes cette semaine. Quel créneau vous conviendrait ?\n\nBien cordialement,\n' + L.nomComplet(u) + '\n' + L.libRole(u) + ', Crédit Agricole Anjou Maine\n' + u.email) + '</pre>',
      '<span class="small">Démonstration : texte type, sans IA, non envoyé.</span>');
  }
  function fRdv() { fenetre('Planifier un rendez-vous', '<div class="frow"><label class="fld">Date du rendez-vous<input type="date" id="rdv-date" value="' + L.iso(L.plusOuvres(now(), 2)) + '"></label><label class="fld" style="flex:2 1 240px">Lieu ou précision (facultatif)<input type="text" id="rdv-note"></label></div>', '<button type="button" class="btn p" data-a="rdv">Planifier</button>'); }
  function fNote() { fenetre('Ajouter une note', '<label class="fld">Note<textarea id="note-txt" rows="4"></textarea></label>', '<button type="button" class="btn p" data-a="noter">Ajouter la note</button>'); }
  function fTel(l) { fenetre('Modifier le téléphone', '<label class="fld">Nouveau téléphone du dirigeant<input type="tel" id="tel-txt" value="' + esc(l.contact.tel) + '"></label>', '<button type="button" class="btn p" data-a="tel">Enregistrer</button>'); }
  function fCloturer() {
    fenetre('Clôturer le lead', '<fieldset><legend>Motif de clôture</legend>' + Object.keys(L.MOTIFS).map(function (k, i) {
      return '<label class="opt"><input type="radio" name="motif" value="' + k + '"' + (i === 0 ? ' checked' : '') + '><span>' + L.MOTIFS[k] + '</span></label>';
    }).join('') + '</fieldset><label class="fld">Précision (facultatif)<input type="text" id="clo-note"></label>', '<button type="button" class="btn d" data-a="cloturer">Clôturer le lead</button>');
  }
  function fSimuler() {
    var opts = '<option value="nouvelle">Nouvelle entreprise (tirée au hasard)</option>' + etat.leads.filter(function (l) { return l.statut !== 'cloture'; })
      .map(function (l) { return '<option value="' + l.id + '">Même entreprise que : ' + esc(l.entreprise) + ' (' + esc(L.TYPES[l.type].lib) + ')</option>'; }).join('');
    fenetre('Simuler une visite du portail', '<p class="small" style="margin:0">Une demande fictive arrive du portail, comme depuis les sites S, A, B ou C. Elle est attribuée à l\'expert BRH du département, ou rattachée au lead ouvert de la même entreprise.</p>'
      + '<label class="fld">Site d\'origine<select id="s-site"><option value="S">S — version Standard</option><option value="A">A</option><option value="B">B</option><option value="C">C — version avec Julia</option></select></label>'
      + '<label class="fld">Ce que fait le dirigeant<select id="s-type"><option value="simulation|diagnostic">Simulation réalisée — diagnostic</option><option value="simulation|label">Simulation réalisée — Label BRH</option><option value="devis|devis">Devis en cours ou réalisé</option><option value="rappel|rappel">Être rappelé</option></select></label>'
      + '<label class="fld">Entreprise<select id="s-ent">' + opts + '</select></label>', '<button type="button" class="btn p" data-a="simuler-ok" id="s-ok">Envoyer la demande</button>');
  }
  function simuler() {
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
      r = L.recevoir(etat, { cle: L.lead(etat, ent).cle, site: site, type: tv[0], origine: tv[1], solutions: [] }, now());
    }
    fermerFen(); sauver();
    if (r.lead.proprietaire === ui.moi && r.lead.statut === 'nouveau') { ui.vue = 'nouveau'; ui.sel = r.lead.id; }
    rendre(); toast(r.message + (r.lead.proprietaire !== ui.moi ? ' Changez de personne pour le voir.' : ''));
  }

  /* ---------------- annuaire ---------------- */
  function annuaire() {
    var q = L.norm(ui.rechAnn);
    var us = etat.users.filter(function (x) { return x.role !== 'admin' && (!q || [x.prenom + ' ' + x.nom, x.agence, x.email, L.libRole(x)].some(function (s) { return L.norm(s).indexOf(q) >= 0; })); });
    return '<div class="cx"><div class="ctop"><h1>Annuaire pro et filiales<span class="sig">DÉMO</span></h1><div class="r">Comptes permanents · identifiant = e-mail professionnel</div></div>'
      + '<div class="filters"><input type="search" id="q-ann" value="' + esc(ui.rechAnn) + '" placeholder="Rechercher un nom, une agence, un rôle" aria-label="Rechercher un nom, une agence, un rôle"></div>'
      + '<div style="overflow-x:auto"><table><thead><tr><th>Nom</th><th>Rôle</th><th>Agence</th><th>Départements</th><th>Identifiant (e-mail)</th></tr></thead><tbody>'
      + us.map(function (x) { return '<tr><td><b>' + esc(L.nomComplet(x)) + '</b></td><td>' + esc(L.libRole(x)) + '</td><td>' + esc(x.agence) + '</td><td>' + esc((x.deps || []).join(', ')) + '</td><td>' + esc(x.email) + '</td></tr>'; }).join('')
      + '</tbody></table></div></div>';
  }

  /* ---------------- événements ---------------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v'), u = moi(), t = now(), l = L.lead(etat, ui.sel);
    if (b.tagName === 'A') ev.preventDefault();
    if (a === 'fermer-fen') { fermerFen(); return; }
    if (a === 'onglet') { ui.onglet = v; rendre(); return; }
    if (a === 'vue') { ui.vue = (ui.vue === v && v === 'transmis') ? 'nouveau' : v; ui.sel = null; ui.panneau = null; ui.erreur = ''; rendre(); return; }
    if (a === 'sel') { ui.sel = v; ui.panneau = null; ui.plus = false; ui.erreur = ''; ui.rechCol = ''; ui.choix = null; rendre(); var f = document.querySelector('.fiche'); if (f && window.innerWidth < 1150) f.scrollIntoView({ behavior: 'smooth' }); return; }
    if (a === 'fermer') { ui.panneau = null; ui.erreur = ''; rendre(); return; }
    if (a === 'panneau') { ui.panneau = (ui.panneau === v) ? null : v; ui.erreur = ''; rendre(); return; }
    if (a === 'plus') { ui.plus = !ui.plus; rendre(); return; }
    if (a === 'info') { toast(v); return; }
    if (a === 'voir-mail') { ouvrirMail(l, +v); return; }
    if (a === 'script') { script(l); return; }
    if (a === 'email-ia') { emailIA(l); return; }
    if (a === 'f-rdv') { fRdv(); return; }
    if (a === 'f-note') { fNote(); return; }
    if (a === 'f-tel') { fTel(l); return; }
    if (a === 'f-cloturer') { fCloturer(); return; }
    if (a === 'simuler-ok') { simuler(); return; }
    if (a === 'transmettre') { ui.panneau = 'transmettre'; ui.cible = v; ui.choix = null; ui.rechCol = ''; ui.erreur = ''; rendre(); return; }
    if (a === 'prendre') { var id = ui.sel; if (agir(L.prendreEnCharge(etat, id, u.email, v, t))) { ui.vue = 'en_cours'; ui.sel = id; rendre(); } return; }
    if (a === 'transmettre-ok') {
      var r = document.querySelector('input[name=collegue]:checked');
      if (!r) { agir({ ok: false, erreur: 'Choisissez un collègue.' }); return; }
      agir(L.transmettre(etat, ui.sel, u.email, r.value, $('mot-trans').value, ui.cible, t)); return;
    }
    if (a === 'renvoyer-ok') { agir(L.renvoyer(etat, ui.sel, u.email, $('mot-renvoi').value, t)); return; }
    if (a === 'planifier') { agir(L.planifier(etat, ui.sel, u.email, $('pe-action').value, $('pe-date').value, $('pe-note').value, t)); return; }
    if (a === 'rdv') { var r1 = L.planifier(etat, ui.sel, u.email, 'rdv', $('rdv-date').value, $('rdv-note').value, t); if (!r1.ok) erreurFen(r1.erreur); else agir(r1); return; }
    if (a === 'noter') { var r2 = L.noter(etat, ui.sel, u.email, $('note-txt').value, t); if (!r2.ok) erreurFen(r2.erreur); else agir(r2); return; }
    if (a === 'tel') { var r3 = L.changerTelephone(etat, ui.sel, u.email, $('tel-txt').value, t); if (!r3.ok) erreurFen(r3.erreur); else agir(r3); return; }
    if (a === 'cloturer') {
      var m = document.querySelector('input[name=motif]:checked'), r4 = L.cloturer(etat, ui.sel, u.email, m ? m.value : '', $('clo-note').value, t);
      if (!r4.ok) { erreurFen(r4.erreur); return; } if (agir(r4)) { ui.vue = 'cloture'; rendre(); } return;
    }
    if (a === 'rouvrir') { if (agir(L.rouvrir(etat, ui.sel, u.email, t))) { ui.vue = 'en_cours'; rendre(); } return; }
  });
  document.addEventListener('input', function (ev) {
    var id = ev.target.id;
    if (id === 'q') { ui.recherche = ev.target.value; garderFocus('q', rendre); }
    else if (id === 'q-ann') { ui.rechAnn = ev.target.value; garderFocus('q-ann', rendre); }
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
  $('persona').addEventListener('change', function () { ui.moi = this.value; ui.vue = 'nouveau'; ui.sel = null; ui.panneau = null; ui.plus = false; ui.erreur = ''; sauver(); rendre(); toast('Connecté en tant que ' + L.nomComplet(moi()) + '.'); });
  $('b-reset').addEventListener('click', function () {
    etat = DEMO.genererDemo(L, now()); ui.vue = 'nouveau'; ui.sel = null; ui.panneau = null; ui.plus = false; ui.erreur = '';
    if (!L.trouver(etat, ui.moi)) ui.moi = etat.users[0].email;
    sauver(); remplirPersonas(); rendre(); toast('Démonstration réinitialisée : données fictives de départ.');
  });
  $('b-simuler').addEventListener('click', fSimuler);

  /* ---------------- démarrage ---------------- */
  etat = charger();
  try { ui.moi = localStorage.getItem(CLE + '-moi') || localStorage.getItem('lm3-demo-1-moi') || ''; } catch (x) { ui.moi = ''; }
  if (!L.trouver(etat, ui.moi)) ui.moi = etat.users[0].email;
  var mp = /[?&]persona=([^&]+)/.exec(location.search); if (mp && L.trouver(etat, decodeURIComponent(mp[1]))) ui.moi = decodeURIComponent(mp[1]);
  remplirPersonas(); sauver(); rendre();
})();
