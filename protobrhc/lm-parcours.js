/* ==============================================================
   LEAD MANAGEMENT — remontée des leads depuis le parcours (version C, protobrhc)
   Surcouche du socle, sans modifier les pages. Niveaux du deck du 14/11/2026 :
     Diagnostic RH (diagnostic.html)
       - à l'affichage des résultats, case FACULTATIVE « recevoir mon résultat et être recontacté » :
         si elle est cochée, l'e-mail et le résultat partent (lead ABANDONNISTE, relances J+1 et J+7).
     Devis en ligne (devis.html)
       - étape « Votre entreprise » : e-mail facultatif « pour retrouver votre devis » + « Votre entreprise
         est-elle déjà cliente du Crédit Agricole ? » (déclaratif du dirigeant, scénario A) ;
         e-mail et accord donnés → lead CHAUD (offre choisie, devis non terminé), étape suivie ensuite ;
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
  st.textContent = '.lm-opt{font-weight:400;color:var(--slate,#5b6b66);font-size:.8em;margin-left:6px}' +
    '.lm-ck{display:flex;gap:8px;align-items:flex-start;font-size:.8rem;line-height:1.4;color:inherit;margin-top:8px;cursor:pointer}.lm-ck input{margin-top:2px;flex:none}' +
    '.lm-radios{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.lm-radios label{display:inline-flex;gap:6px;align-items:center;border:1px solid var(--line-2,#dfe6e2);border-radius:999px;padding:6px 12px;font-size:.85rem;cursor:pointer;background:#fff}' +
    '.lm-radios input:checked+span{font-weight:700;color:var(--green,#065145)}' +
    '.lm-suivi{margin:18px auto 0;max-width:560px;text-align:left;background:var(--mint-2,#f3f8f5);border:1px solid var(--line,#e7ece9);border-radius:14px;padding:14px 16px}' +
    '.lm-suivi b{color:var(--green,#065145)}.lm-suivi a{display:inline-block;margin-top:8px}';
  document.head.appendChild(st);
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

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
    var found = $('dvFound'), grid = found && found.querySelector('.dv-grid');
    if (grid && !$('lmMail')) {
      var c = memo('brhLmContact') || {};
      var f1 = document.createElement('div'); f1.className = 'field'; f1.style.gridColumn = '1/-1'; f1.id = 'lmMail';
      f1.innerHTML = '<label for="lmEm">Votre e-mail <span class="lm-opt">facultatif — pour retrouver votre devis</span></label>' +
        '<input id="lmEm" type="email" autocomplete="email" placeholder="prenom.nom@entreprise.fr" value="' + esc(c.email || '') + '">' +
        '<label class="lm-ck"><input type="checkbox" id="lmEmOk"><span>J’accepte que mes réponses soient utilisées par le Crédit Agricole et sa Caisse régionale pour établir mon devis et me recontacter, même si je ne vais pas jusqu’au bout.</span></label>';
      var f2 = document.createElement('div'); f2.className = 'field'; f2.style.gridColumn = '1/-1'; f2.id = 'lmClient';
      f2.innerHTML = '<label>Votre entreprise est-elle déjà cliente du Crédit Agricole ? <span class="lm-opt">facultatif</span></label><div class="lm-radios" role="radiogroup">' +
        [['oui', 'Oui'], ['non', 'Non'], ['nsp', 'Je ne sais pas']].map(function (x) { return '<label><input type="radio" name="lmCl" value="' + x[0] + '"><span>' + x[1] + '</span></label>'; }).join('') + '</div>' +
        '<span class="hint">Votre demande arrive ainsi directement à la bonne Caisse régionale.</span>';
      grid.appendChild(f1); grid.appendChild(f2);
    }
    var suivi = memo('brhLmSuivi');
    var declare = function () { var x = document.querySelector('input[name="lmCl"]:checked'); return x ? x.value : ''; };
    var majDeclare = function () { if (S.entSrc) S.entSrc.client_declare = declare(); if (S.ent) S.ent.client_declare = declare(); };
    document.addEventListener('change', function (e) { if (e.target && e.target.name === 'lmCl') majDeclare(); });
    function etape(lib) { if (suivi && suivi.id && suivi.jeton) poster({ action: 'etape', id: suivi.id, jeton: suivi.jeton, etape: lib }); }
    function ouvrir() {
      var em = (($('lmEm') || {}).value || '').trim();
      if (suivi || !em || !$('lmEmOk') || !$('lmEmOk').checked || !MAILRE.test(em)) return;
      var e = S.ent || {};
      majDeclare();
      suivi = { attente: true };
      poster({ type: 'devis_en_cours', variante: V, etape: 'Votre entreprise', contact: { email: em, consentement: true, consentement_date: new Date().toISOString() },
        entreprise: { raison_sociale: e.nom, siret: e.siret, code_postal: e.cp, ville: e.ville, effectif: e.effectif, secteur: e.secteur, idcc: e.idcc, client_declare: declare() }, solutions: S.sol })
        .then(function (j) { if (j && j.ok && j.jeton) { suivi = { id: j.id, jeton: j.jeton, dossier: j.dossier || null }; memo('brhLmSuivi', suivi); } else suivi = null; });
      var ce = $('c-email'); if (ce && !ce.value) ce.value = em;
      memo('brhLmContact', { email: em });
      if (typeof track === 'function') track('lm_lead_chaud', { source: 'devis' });
    }
    /* étape 2 validée : ouverture du suivi ; changements d'étape : étape tracée dans le dossier */
    var _next = next;
    next = function (n) { var avant = S.step, r = _next.apply(this, arguments); if (n === 2 && S.step > avant) ouvrir(); return r; };
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
      var done = $('dvDone'); if (!done || $('lmSuiviBox')) return;
      var b = document.createElement('div'); b.className = 'lm-suivi'; b.id = 'lmSuiviBox';
      b.innerHTML = '<b>Votre dossier ' + esc(j.dossier) + '</b><br>Suivez son avancement, du dépôt à la clôture, et retrouvez le nom de votre expert dès qu’il le prend en charge.<br><a class="btn btn-outline" href="' + esc(j.suivi) + '">Suivre mon dossier</a>';
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
