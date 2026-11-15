/* Version C 2.0 — 15/11/2026 · lead management sorti de C : couche parcours seule (identique au module LM), encart de suivi laissé à fin-parcours.js ; argumentaire (1.13) · historique : VERSIONS.md */
/* ==============================================================
   PARCOURS — remontée des demandes depuis le parcours (version C, protobrhc)
   Depuis la C 2.0, le lead management lui-même (niveaux, dossiers, cockpit) est dans le module commun
   (cockpitbrh.monsitedetest.com) ; ce fichier n'en garde que la couche parcours, la même que
   connecteurs/lm-parcours.js du module (C la charge elle-même : data-parcours="non" côté module).
   Surcouche du socle, sans modifier les pages. Niveaux du deck du 14/11/2026 :
     Diagnostic RH (diagnostic.html)
       - à l'affichage des résultats, case FACULTATIVE « recevoir mon résultat et être recontacté » :
         si elle est cochée, l'e-mail et le résultat partent (lead ABANDONNISTE, relances J+1 et J+7).
     Devis en ligne (devis.html)
       - étape « Votre estimation » : « Recevoir mon estimation par e-mail » (e-mail + accord) → lead CHAUD
         (offre choisie, devis non terminé), estimation envoyée au dirigeant, étape suivie ensuite ;
       - étape « Recevez votre devis » : « Votre entreprise est-elle déjà cliente du Crédit Agricole ? »
         (déclaratif du dirigeant, scénario A), avec les coordonnées ;
       - envoi du devis → lead ULTRA-CHAUD rattaché au même dossier ; lien « Suivre mon dossier ».
   Le niveau est calculé côté serveur (lm-base.php) ; rien n'est affiché au visiteur sur son niveau.
   ============================================================== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var MAILRE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var V = window.BRH_VARIANTE || 'C';
  function poster(corps) {
    return fetch('lead.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
      .then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function memo(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  var st = document.createElement('style');
  /* styles alignés sur la charte du socle (champs .field, consentement .consent, options .dv-opt) */
  st.textContent = '.lm-opt{font-weight:400;color:var(--slate,#5b6b66);font-size:.78rem;margin-left:6px}' +
    '.lm-est{margin-top:18px;border:1px solid var(--line,#e7ece9);border-radius:16px;padding:18px 20px;background:#fff;display:grid;gap:12px}' +
    '.lm-est-t b{display:block;font-family:var(--fh,inherit);font-size:1rem;color:var(--green,#065145)}.lm-est-t span{font-size:.86rem;color:var(--slate,#5b6b66)}' +
    '.lm-est-f{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}.lm-est-f .field{flex:1 1 280px;margin:0}' +
    '.lm-est .consent{grid-column:auto}.lm-est-m{margin:0;font-size:.86rem}.lm-est-m.ok{color:var(--green,#065145);font-weight:600}.lm-est-m.err{color:#b3261e}' +
    '.lm-q{grid-column:1/-1;margin:2px 0}' +
    '.lm-q .q-t{display:block;font-family:var(--fb,inherit);font-weight:600;font-size:.86rem;color:var(--ink,#1d2b28);margin-bottom:8px}' +
    '.lm-q .dv-opt span{padding:.5rem 1rem}' +
    '.lm-q .hint{display:block;font-size:.76rem;color:var(--slate,#5b6b66);margin-top:6px}' +
    /* case du déverrouillage des résultats du diagnostic (bandeau vert) */
    '.results-gate .lm-ck{display:flex;gap:8px;align-items:flex-start;font-size:.76rem;line-height:1.4;color:#fff;opacity:.92;cursor:pointer;margin:0}' +
    '.results-gate .lm-ck input{flex:0 0 auto;width:16px;height:16px;min-width:0;margin:2px 0 0;padding:0;border:0;accent-color:var(--lime,#8fb822)}' +
    '.lm-suivi{margin:20px auto 0;max-width:560px;text-align:left;background:var(--mint-2,#f3f8f5);border:1px solid var(--line,#e7ece9);border-radius:16px;padding:16px 18px;font-size:.9rem;line-height:1.5}' +
    '.lm-suivi b{font-family:var(--fh,inherit);color:var(--green,#065145)}.lm-suivi .btn{margin-top:10px}';
  document.head.appendChild(st);
  var page = (window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();   // BRH_PAGE : pages de test

  /* ============================== CONTACT PARTAGÉ ENTRE LES ÉCRANS ==============================
     « Une information, une fois » : les coordonnées tapées sur un écran (diagnostic, label RH, audit
     mutuelle, devis, demande de rappel) préremplissent les champs VIDES des autres écrans.
     Stockage : sessionStorage « brhContact » (cet onglet du navigateur seulement, effacé à sa fermeture ;
     rien n'est transmis sans une demande du dirigeant). */
  var CHAMPS = {   // id du champ → rôle : prenom, nom, complet (« Prénom Nom »), email, telephone, fonction, entreprise
    'diagnostic.html': { 'gate-email':'email', 'c-nom':'complet', 'c-ent':'entreprise', 'c-tel':'telephone', 'c-email':'email' },
    'label-brh.html': { 'gate-prenom':'prenom', 'gate-nom':'nom', 'gate-email':'email', 'gate-poste':'fonction', 'c-nom':'complet', 'c-ent':'entreprise', 'c-tel':'telephone', 'c-email':'email' },
    'audit-mutuelle.html': { 'au-nom':'complet', 'au-ent':'entreprise', 'au-tel':'telephone', 'au-mail':'email' },
    'devis.html': { 'c-prenom':'prenom', 'c-nom':'nom', 'c-fct':'fonction', 'c-tel':'telephone', 'c-email':'email', 'x-nom':'complet', 'x-tel':'telephone', 'lmEm':'email' },
    'newsletter.html': { 'nf-prenom':'prenom', 'nf-nom':'nom', 'nf-email':'email', 'nf-entreprise':'entreprise' }
  }[page] || {};
  function contact() { return memo('brhContact') || {}; }
  function noter(role, v) {
    v = String(v || '').trim(); if (!v) return;
    var c = contact();
    if (role === 'email' && !MAILRE.test(v)) return;
    if (role === 'complet') { var i = v.indexOf(' '); if (i > 0) { c.prenom = v.slice(0, i); c.nom = v.slice(i + 1); } else c.nom = v; }
    else c[role] = v;
    c.maj = new Date().toISOString(); memo('brhContact', c);
  }
  function valeur(role, c) { return role === 'complet' ? [c.prenom, c.nom].filter(Boolean).join(' ') : (c[role] || ''); }
  /* nom de l'entreprise : celui de la fiche publique (SIRET) l'emporte sur un nom tapé ailleurs */
  function nomEntreprise(c) { var pe = (memo('brhProfil') || {}).entreprise || {}; return pe.nom || c.entreprise || ''; }
  function preremplir() {
    var c = contact(), n = 0;
    Object.keys(CHAMPS).forEach(function (id) {
      var el = $(id), role = CHAMPS[id], v = role === 'entreprise' ? nomEntreprise(c) : valeur(role, c); if (!el || !v) return;
      var cur = String(el.value || '').trim();
      /* champ vide, ou déjà prérempli par ce module avec une valeur devenue ancienne (nouveau SIRET) */
      if (cur && !(el.getAttribute && el.getAttribute('data-lm-auto') === cur && cur !== v)) return;
      if (el.tagName === 'SELECT') { if (![].some.call(el.options || [], function (o) { return o.value === v || o.textContent === v; })) return; }
      el.value = v; if (el.setAttribute) el.setAttribute('data-lm-auto', v); n++;
    });
    return n;
  }
  /* entreprise reconnue par SIRET sur cette page (diagnostic, audit mutuelle) : gardée pour toute la session
     et reportée aussitôt dans les formulaires de contact de la page et des écrans suivants */
  function retenirEntreprise(d) {
    if (!d || d.source === 'demo' || !d.nom) return;
    try {
      var p = memo('brhProfil') || {};
      p.entreprise = Object.assign({}, p.entreprise || {}, { source: d.source || '', siren: d.siren || String(d.siret || '').slice(0, 9), siret: d.siret || (p.entreprise || {}).siret || '',
        nom: d.nom, ville: d.ville || '', cp: d.cp || '', naf: d.naf || '', idcc: d.idcc || '' });
      if (d.cp && !p.departement) p.departement = (window.BRH_ENT && BRH_ENT.departement) ? BRH_ENT.departement(d.cp) : String(d.cp).slice(0, 2);
      memo('brhProfil', p);
    } catch (e) {}
    preremplir();
  }
  if (window.BRH_ENT && typeof BRH_ENT.chercher === 'function' && !BRH_ENT.__lm) {
    var _ch = BRH_ENT.chercher; BRH_ENT.__lm = true;
    BRH_ENT.chercher = function () { return _ch.apply(this, arguments).then(function (d) { setTimeout(function () { retenirEntreprise(d); }, 0); return d; }); };
  }
  /* formulaires affichés plus tard (contact du diagnostic, dernier écran de l'audit) : préremplis à l'entrée dans un champ */
  document.addEventListener('focusin', function (e) { if (e.target && e.target.id && CHAMPS[e.target.id]) preremplir(); }, true);
  document.addEventListener('change', function (e) { var t = e.target; if (t && t.id && CHAMPS[t.id]) noter(CHAMPS[t.id], t.value); }, true);
  preremplir();
  /* l'audit mutuelle redessine son écran à chaque étape : préremplissage après chaque rendu */
  if (page === 'audit-mutuelle.html' && typeof render === 'function') { var _render = render; render = function () { var r = _render.apply(this, arguments); preremplir(); return r; }; }
  window.BRH_CONTACT = { lire: contact, noter: noter, preremplir: preremplir, retenirEntreprise: retenirEntreprise };

  /* ============================== ARGUMENTAIRE DE VENTE POUR L'EXPERT ==============================
     La synthèse préparée par l'IA (profil, questions à poser, pièces à demander, angle d'approche) n'est plus
     affichée au dirigeant : elle est rattachée à son dossier et apparaît dans le cockpit BRH, rubrique
     « Argumentaire de vente ». Décision du 15/11/2026. */
  window.BRH_LM = window.BRH_LM || {};
  window.BRH_LM.argumentaire = function (s, source) {
    if (!s || typeof s !== 'object' || !window.BRH_LM_DERNIER) return Promise.resolve(false);
    return Promise.race([window.BRH_LM_DERNIER, new Promise(function (r) { setTimeout(function () { r(null); }, 3000); })]).then(function (j) {
      if (!j || !j.ok || !j.id || !j.jeton) return false;
      return poster({ action: 'argumentaire', id: j.id, jeton: j.jeton, source: source || page,
        argumentaire: { titre: s.titre || '', synthese: s.synthese || [], questions: s.questions || [], pieces: s.pieces || [], angle: s.angle || '' } })
        .then(function (r) { return !!(r && r.ok); });
    });
  };

  /* ============================== DEMANDES ENVOYÉES À lead.php ==============================
     Chaque demande est complétée avec ce que le dirigeant a déjà donné dans la session, sans jamais
     remplacer une valeur saisie : entreprise reconnue (raison sociale, SIRET, code postal, ville),
     département, e-mail (une demande de rappel sans e-mail rejoint ainsi le dossier du devis).
     Les coordonnées envoyées sont aussi gardées pour les écrans suivants. */
  function completer(b) {
    if (!b || b.action || !(b.contact || b.contexte)) return b;
    var c = b.contact || b.contexte, consent = c.consentement || c.consent || b.consentement || b.consent;
    if (!consent) return b;
    var pf = memo('brhProfil') || {}, pe = pf.entreprise || {}, ct = contact(), ajout = [];
    /* même objet entreprise que celui lu par lead.php : entreprise, company, ou contexte.entreprise (demande de rappel) */
    var e = b.entreprise || b.company || (c.entreprise && typeof c.entreprise === 'object' ? c.entreprise : (b.entreprise = {}));
    var met = function (cles, v, lib) { if (!v) return; for (var i = 0; i < cles.length; i++) if (e[cles[i]] != null && String(e[cles[i]]).trim() !== '') return; e[cles[0]] = v; ajout.push(lib); };
    if (!c.companyName) met(['raison_sociale', 'nom', 'companyName'], pe.nom, 'raison sociale');
    met(['siret', 'siren'], pe.siret || pe.siren, 'SIRET');
    met(['code_postal', 'cp'], pe.cp, 'code postal'); met(['ville'], pe.ville, 'ville');
    met(['departement'], pf.departement || (pe.cp ? String(pe.cp).slice(0, 2) : ''), 'département');
    if (!(c.email || c.mail) && ct.email) { c.email = ct.email; ajout.push('e-mail'); }
    if (ajout.length) b.complete_par_session = ajout;
    /* coordonnées de cette demande, gardées pour la suite du parcours */
    if (c.email || c.mail) noter('email', c.email || c.mail);
    if (c.prenom) noter('prenom', c.prenom); if (c.nom && c.prenom) noter('nom', c.nom); else if (c.nom || c.name) noter('complet', c.nom || c.name);
    if (c.telephone || c.tel || c.phone) noter('telephone', c.telephone || c.tel || c.phone);
    if (c.fonction || c.poste) noter('fonction', c.fonction || c.poste);
    return b;
  }
  if (window.fetch && !window.__lmLeadFetch) {
    window.__lmLeadFetch = true;
    var _f0 = window.fetch;
    window.fetch = function (u, o) {
      try {
        if (String(u).indexOf('lead.php') === 0 && o && typeof o.body === 'string') {
          var b = completer(JSON.parse(o.body)); o = Object.assign({}, o, { body: JSON.stringify(b) });
          var p = _f0.call(this, u, o);
          if (b && !b.action) {
            var rep = p.then(function (r) { return r.clone().json(); }).catch(function () { return null; });
            window.BRH_LM_DERNIER = rep;                     // dernière demande : identifiant et jeton du lead
            if (b.type === 'devis') window.BRH_LM_REPONSE = rep;
          }
          return p;
        }
      } catch (e) {}
      return _f0.apply(this, arguments);
    };
  }

  /* ============================== DIAGNOSTIC RH ============================== */
  if (page === 'diagnostic.html' && typeof unlockResults === 'function') {
    var gate = document.querySelector('#results-gate .rg-form');
    if (gate && !$('lmGateOk')) {
      var l = document.createElement('label'); l.className = 'lm-ck'; l.style.color = '#fff';
      l.innerHTML = '<input type="checkbox" id="lmGateOk"><span>Facultatif : j’accepte que mon e-mail et mon résultat soient utilisés par le Crédit Agricole et sa Caisse régionale pour me l’adresser et me recontacter à ce sujet.</span>';
      var note = gate.querySelector('.rg-note'); gate.insertBefore(l, note || null);
    }
    var _unlock = unlockResults;
    unlockResults = function () {
      var r = _unlock.apply(this, arguments);
      try {
        var ok = $('lmGateOk') && $('lmGateOk').checked, em = (($('gate-email') || {}).value || '').trim();
        if (ok && MAILRE.test(em) && typeof state === 'object' && state.resultsUnlocked && !memo('brhLmDiag')) {
          var g = typeof calculateFiscalGain === 'function' ? calculateFiscalGain(state.effectif, state.priorities) : {};
          var sect = $('secteur') ? $('secteur').value : '', dep = typeof depValide === 'function' ? depValide() : '';
          poster({ type: 'diagnostic_estimation', variante: V, contact: { email: em, consentement: true, consentement_date: new Date().toISOString() },
            entreprise: { effectif: state.effectif, secteur: sect, departement: dep }, priorities: state.priorities, fiscalGain: { total: g.total || 0, details: g.details || {} } })
            .then(function (j) { if (j && j.ok) memo('brhLmDiag', { email: em, dossier: j.dossier || null }); });
          memo('brhLmContact', { email: em });
          if (typeof track === 'function') track('lm_lead_abandonniste', { source: 'diagnostic' });
        }
      } catch (e) {}
      return r;
    };
  }

  /* ============================== DEVIS EN LIGNE ============================== */
  if (page === 'devis.html' && typeof S !== 'undefined' && typeof next === 'function') {
    /* ---- étape « Votre estimation » : recevoir son estimation par e-mail et reprendre plus tard (lead CHAUD) ----
       Placé après les montants (échange clair : le dirigeant reçoit son estimation) et non plus à l'étape
       « Votre entreprise », déjà la plus chargée (SIRET, convention collective). Décision du 15/11/2026. */
    var ancre = $('ia-dv-explique') || $('dvSynth');
    if (ancre && ancre.parentNode && !$('lmEst')) {
      var bx = document.createElement('div'); bx.className = 'lm-est'; bx.id = 'lmEst';
      bx.innerHTML = '<div class="lm-est-t"><b>Recevoir mon estimation par e-mail</b><span>Gardez vos montants sous la main, même si vous ne terminez pas votre devis maintenant.</span></div>' +
        '<div class="lm-est-f"><div class="field"><label for="lmEm">Votre e-mail</label><input id="lmEm" type="email" autocomplete="email" placeholder="prenom.nom@entreprise.fr" value="' + esc(contact().email || (memo('brhLmContact') || {}).email || '') + '"></div>' +
        '<button type="button" class="btn btn-outline" id="lmEstBtn">M’envoyer mon estimation</button></div>' +
        '<div class="consent"><input type="checkbox" id="lmEmOk"><label for="lmEmOk">J’accepte que mon e-mail et les réponses de ce devis soient utilisées par le Crédit Agricole et sa Caisse régionale pour m’adresser mon estimation et me recontacter à ce sujet, même si je ne vais pas jusqu’au bout.</label></div>' +
        '<p class="lm-est-m" id="lmEstMsg" role="status"></p>';
      ancre.parentNode.insertBefore(bx, ancre.nextSibling);
    }
    /* ---- fin du devis : « Votre entreprise est-elle déjà cliente ? » avec les coordonnées ---- */
    var ce0 = $('c-email'), cf0 = ce0 && ce0.closest ? ce0.closest('.field') : null;
    if (cf0 && cf0.parentNode && !$('lmClient')) {
      var f2 = document.createElement('div'); f2.className = 'lm-q'; f2.id = 'lmClient';
      f2.innerHTML = '<span class="q-t" id="lmClT">Votre entreprise est-elle déjà cliente du Crédit Agricole ? <span class="lm-opt">facultatif</span></span>' +
        '<div class="dv-opts" role="radiogroup" aria-labelledby="lmClT">' +
        [['oui', 'Oui'], ['non', 'Non'], ['nsp', 'Je ne sais pas']].map(function (x) { return '<label class="dv-opt"><input type="radio" name="lmCl" value="' + x[0] + '"><span>' + x[1] + '</span></label>'; }).join('') + '</div>' +
        '<span class="hint">Votre demande arrive ainsi directement à la bonne Caisse régionale.</span>';
      cf0.parentNode.insertBefore(f2, cf0.nextSibling);
    }
    var suivi = memo('brhLmSuivi');
    var declare = function () { var x = document.querySelector('input[name="lmCl"]:checked'); return x ? x.value : ''; };
    var majDeclare = function () { if (S.entSrc) S.entSrc.client_declare = declare(); if (S.ent) S.ent.client_declare = declare(); };
    document.addEventListener('change', function (e) { if (e.target && e.target.name === 'lmCl') majDeclare(); });
    function etape(lib) { if (suivi && suivi.id && suivi.jeton) poster({ action: 'etape', id: suivi.id, jeton: suivi.jeton, etape: lib }); }
    function estimationTotale() {
      try { var o = S.est || (typeof compute === 'function' ? compute() : {}); return Math.round(S.sol.reduce(function (a, k) { return a + ((o[k] && o[k].cout) || 0); }, 0)); } catch (x) { return null; }
    }
    function ouvrir() {
      var em = (($('lmEm') || {}).value || '').trim(), msg = $('lmEstMsg') || {};
      if (!MAILRE.test(em)) { msg.textContent = 'Indiquez une adresse e-mail valide.'; msg.className = 'lm-est-m err'; return; }
      if (!$('lmEmOk') || !$('lmEmOk').checked) { msg.textContent = 'Cochez la case pour accepter l’envoi de votre estimation.'; msg.className = 'lm-est-m err'; return; }
      if (suivi) { msg.textContent = 'Votre estimation a déjà été envoyée à ' + em + '.'; msg.className = 'lm-est-m ok'; return; }
      var e = S.ent || {};
      suivi = { attente: true };
      poster({ type: 'devis_en_cours', variante: V, etape: 'Votre estimation', envoyer_estimation: true,
        contact: { email: em, consentement: true, consentement_date: new Date().toISOString() },
        entreprise: { raison_sociale: e.nom, siret: e.siret, code_postal: e.cp, ville: e.ville, effectif: e.effectif, secteur: e.secteur, idcc: e.idcc },
        solutions: S.sol, estimation_totale: estimationTotale() })
        .then(function (j) { if (j && j.ok && j.jeton) { suivi = { id: j.id, jeton: j.jeton, dossier: j.dossier || null }; memo('brhLmSuivi', suivi); } else suivi = null; });
      var ce = $('c-email'); if (ce && !ce.value) ce.value = em;
      noter('email', em); memo('brhLmContact', { email: em });
      msg.textContent = 'C’est noté : votre estimation est envoyée à ' + em + '. Poursuivez votre devis pour recevoir votre proposition.'; msg.className = 'lm-est-m ok';
      if (typeof track === 'function') track('lm_lead_chaud', { source: 'devis_estimation' });
    }
    var bE = $('lmEstBtn'); if (bE) bE.addEventListener('click', ouvrir);
    window.BRH_LM_ESTIMATION = ouvrir;
    /* changements d'étape : étape tracée dans le dossier (une fois l'estimation envoyée) */
    var _go = go;
    go = function (n) { var r = _go.apply(this, arguments); if (typeof STEPS !== 'undefined' && S.step > 2) etape(STEPS[S.step - 1]); return r; };
    /* réponse de lead.php à l'envoi du devis : référence du dossier et lien de suivi du dirigeant */
    var _fetch = window.fetch;
    window.fetch = function (u, o) {
      var p = _fetch.apply(this, arguments);
      try {
        if (String(u).indexOf('lead.php') === 0 && o && typeof o.body === 'string' && /"type":"devis"/.test(o.body)) {
          p.then(function (r) { return r.clone().json(); }).then(function (j) { if (j && j.ok && j.suivi) afficherSuivi(j); }).catch(function () {});
        }
      } catch (e) {}
      return p;
    };
    function afficherSuivi(j) {
      /* version C : le récapitulatif court de fin-parcours.js porte déjà « Suivre mon dossier » */
      if (window.BRH_FIN_PARCOURS) return;
      var done = $('dvDone'); if (!done || $('lmSuiviBox')) return;
      var b = document.createElement('div'); b.className = 'lm-suivi'; b.id = 'lmSuiviBox';
      b.innerHTML = '<b>Votre dossier ' + esc(j.dossier) + '</b><br>Suivez son avancement, du dépôt à la clôture, et retrouvez le nom de votre expert dès qu’il le prend en charge.' + (j.caisse ? ' Caisse régionale : ' + esc(j.caisse) + '.' : '') + '<br><a class="btn btn-outline" href="' + esc(j.suivi) + '">Suivre mon dossier</a>';
      var cta = done.querySelector('.r-cta'); done.insertBefore(b, cta || null);
      try { sessionStorage.removeItem('brhLmSuivi'); } catch (e) {}
    }
    /* la déclaration « déjà client » part avec le devis (lead.entreprise.source_donnees.client_declare) */
    if (typeof submitDevis === 'function') {
      var _sd = submitDevis;
      submitDevis = function () { majDeclare(); return _sd.apply(this, arguments); };
    }
  }
})();
