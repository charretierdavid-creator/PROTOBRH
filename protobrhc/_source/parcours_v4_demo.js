/* ==============================================================
   DÉMO HORS LIGNE V4 — parcours simplifiés (26/11/2026, demande de David CHARRETIER)
   Injecté par le shell dans chaque page, après precautions_demo_v4.js. Aucune page ni aucun module du socle
   n'est modifié : ce script se greffe sur les fonctions existantes (même principe que la version C).
   Diagnostic RH (diagnostic.html)
     - question SIREN / SIRET retirée de « 1. Votre entreprise » (masquée, le code du socle reste intact) ;
     - « 3. Nos solutions pour vos besoins prioritaires » ;
     - « 4. Allons plus loin : notre proposition en ligne en 5 minutes » (passerelle vers le devis) ;
     - « 5. Demandez une démo ou contactez un expert » (ancien « 4. Nous contacter »).
   Label RH (label-brh.html) : mêmes intitulés, et la passerelle vers le devis passe après « Nos solutions »,
     comme dans le diagnostic.
   Devis en ligne (devis.html)
     - Avantages salariés (Worklife) : seulement titres-restaurant et cartes cadeaux (forfait mobilités retiré) ;
     - si le dirigeant ne choisit QUE les avantages salariés, le minimum est demandé :
         « Votre entreprise » : nom, code postal, nombre de salariés (SIRET facultatif) ;
         « Vos salariés » : nombre de salariés concernés, avec un (i) sur les contrats à compter ;
     - « 6. Votre proposition » : colonne Estimation (montant / an) et ligne « Total estimé » retirées
       (l'étape 5 « Votre estimation » et le devis final restent chiffrés).
   ============================================================== */
(function () {
  var W = window, D = document;
  var PAGE = W.__REAL_PAGE || W.__PAGE || '';
  var $ = function (id) { return D.getElementById(id); };
  function css(t) { var s = D.createElement('style'); s.setAttribute('data-v4', '1'); s.textContent = t; (D.head || D.documentElement).appendChild(s); }

  var T = {
    sol: 'Nos solutions pour vos besoins prioritaires',
    plus: 'Allons plus loin : notre proposition en ligne en 5 minutes',
    contact: 'Demandez une démo ou contactez un expert',
    contactP: 'Un expert de votre Caisse régionale vous présente nos solutions en démonstration, ou échange avec vous sur vos résultats et vos prochaines étapes.'
  };
  function h2Texte(el, num, txt) { if (!el) return; var h = (num ? '<b>' + num + '.</b> ' : '') + txt; if (el.innerHTML !== h) el.innerHTML = h; }

  /* ======================= DIAGNOSTIC ======================= */
  if (PAGE === 'diagnostic.html') {
    css('#block1 .field.ent-id,#block1 .ent-or{display:none!important}');
    D.addEventListener('DOMContentLoaded', function () {   /* avant les modules de la version C : acces-devis.js reprend ces textes */
      h2Texte(D.querySelector('#block3 .block-head h2'), 3, T.sol);
      var dc = D.querySelector('#devisCta .dc-txt h2'); if (dc) dc.textContent = '4. ' + T.plus;
      var dp = D.querySelector('#devisCta .dc-txt p'); if (dp) dp.textContent = 'Vos priorités sont reprises automatiquement : vérifiez quelques hypothèses et recevez votre proposition, à votre rythme.';
      h2Texte(D.querySelector('#contact .block-head h2'), 5, T.contact);
      var cp = D.querySelector('#contact .contact-lead p'); if (cp) cp.textContent = T.contactP;
      var sn = $('siren'); if (sn) { sn.value = ''; sn.setAttribute('tabindex', '-1'); sn.setAttribute('aria-hidden', 'true'); }
    });
  }

  /* ======================= LABEL RH ======================= */
  if (PAGE === 'label-brh.html') {
    css('#devis-cta.brhd-band{margin-top:18px}');
    function label() {
      D.querySelectorAll('#results .block-head h2').forEach(function (h) { if (/leviers prioritaires/i.test(h.textContent)) h.textContent = T.sol; });
      h2Texte(D.querySelector('#contact .block-head h2'), 0, T.contact);
      var cp = D.querySelector('#contact .contact-lead p'); if (cp && cp.textContent !== T.contactP) cp.textContent = T.contactP;
      var b = $('devis-cta'), r = $('results');
      if (b && r) {
        var fisc = r.querySelector('#avantages-fiscaux'), ref = fisc || r.lastElementChild;
        if (ref && ref !== b && ref.nextElementSibling !== b) ref.insertAdjacentElement('afterend', b);   /* après « Nos solutions » et les avantages fiscaux */
        var h = b.querySelector('h3'); if (h && h.textContent !== T.plus) h.textContent = T.plus;
        var tg = b.querySelector('.brhd-tag'); if (tg && tg.textContent !== 'Étape suivante · environ 5 minutes') tg.textContent = 'Étape suivante · environ 5 minutes';
      }
    }
    var lp = false;
    function bientotL() { if (lp) return; lp = true; setTimeout(function () { lp = false; try { label(); } catch (e) {} }, 0); }
    D.addEventListener('DOMContentLoaded', function () { label(); try { new MutationObserver(bientotL).observe(D.body, { childList: true, subtree: true }); } catch (e) {} });
  }

  /* ======================= DEVIS ======================= */
  if (PAGE === 'devis.html') {
    css(''
      /* étape 6 : sans colonne Estimation ni total */
      + '#dvCart .dv-line{grid-template-columns:1.5fr 1.9fr .9fr auto}'
      + '#dvCart .dv-line>:nth-child(3){display:none!important}#dvCart .dv-line.total{display:none!important}'
      + '@media(max-width:1000px){#dvCart .dv-line{grid-template-columns:1fr 1fr}}'
      /* avantages salariés : titres-restaurant et cartes cadeaux seulement */
      + '.v4-mob{display:none!important}'
      /* parcours « avantages salariés seuls » : le minimum */
      + 'html.v4-w .v4-wx{display:none!important}html.v4-w label[for="siret"] .req{display:none}html:not(.v4-w) .v4-wo{display:none}'
      + 'html.v4-w #dvFound .dv-src,html.v4-w #dvFound .dv-status{display:none}'
      + '.v4-opt{font-weight:500;font-size:.74rem;color:var(--slate,#5b6b66);background:var(--mint-2,#eef4ef);border-radius:999px;padding:1px 8px;margin-left:4px}'
      + '.v4-i{display:inline-grid;place-items:center;width:20px;height:20px;margin-left:6px;border-radius:50%;border:1.5px solid var(--green,#065145);background:#fff;color:var(--green,#065145);font:700 .72rem/1 Georgia,serif;font-style:italic;cursor:pointer;vertical-align:middle;padding:0}'
      + '.v4-i[aria-expanded="true"]{background:var(--green,#065145);color:#fff}.v4-i:focus-visible{outline:3px solid var(--lime,#8FB822);outline-offset:2px}'
      + '.v4-info{margin:10px 0 0;padding:12px 14px;border:1px solid var(--line,#e7ece9);border-left:3px solid var(--green,#065145);border-radius:10px;background:var(--mint-2,#f3f8f5);font-size:.82rem;line-height:1.5;color:var(--ink,#1d2b26)}'
      + '.v4-info[hidden]{display:none}.v4-info b{color:var(--green,#065145)}.v4-info ul{margin:6px 0 8px 18px;padding:0}.v4-info li{margin:2px 0}.v4-info p{margin:0 0 6px}.v4-info .v4-src{font-size:.74rem;color:var(--slate,#5b6b66);margin:0}'
      + 'html.v4-w .dv-step[data-step="3"] .dv-grid{grid-template-columns:minmax(0,520px)}');

    var INFO = '<p><b>Qui compter ?</b> Les salariés qui recevront les titres-restaurant et les cartes cadeaux.</p><ul>'
      + '<li><b>CDI et CDD</b>, à temps plein ou à temps partiel : mêmes droits, un avantage ne peut pas être réservé à un type de contrat.</li>'
      + '<li><b>Apprentis et contrats de professionnalisation</b> : ce sont des salariés, comptez-les.</li>'
      + '<li><b>Intérimaires</b> : ils reçoivent leurs titres-restaurant de leur agence d’intérim, ne les comptez pas.</li>'
      + '<li><b>Stagiaires</b> : ils peuvent en bénéficier si vous le décidez.</li></ul>'
      + '<p><b>Titres-restaurant</b> : un titre par jour travaillé comprenant un repas, part employeur entre 50 % et 60 % pour l’exonération de charges.</p>'
      + '<p><b>Cartes cadeaux</b> : exonérées de charges dans la limite de 5 % du plafond mensuel de la Sécurité sociale par salarié et par an (au-delà, selon l’événement : Noël, naissance, rentrée…).</p>'
      + '<p class="v4-src">Repères indicatifs, à confirmer avec votre expert Banque des RH.</p>';
    var TXT_W = {
      t2: 'Trois informations suffisent : le nom de votre entreprise, son code postal et votre nombre de salariés. Le SIRET est facultatif.',
      t3: 'Une seule question : combien de salariés recevront vos titres-restaurant et vos cartes cadeaux ?'
    };
    var ORIG = {};
    var auto = false;   /* fiche « entreprise » ouverte par ce script en mode avantages seuls */

    function isW() { try { return typeof S === 'object' && S && S.sol && S.sol.length === 1 && S.sol[0] === 'avantages'; } catch (e) { return false; } }
    function aAv() { try { return typeof S === 'object' && S && S.sol && S.sol.indexOf('avantages') >= 0; } catch (e) { return false; } }
    function marquer(id) { var el = $(id), f = el && el.closest('.field'); if (f) f.classList.add('v4-wx'); }
    function texteTete(id, w) {
      var h = $(id), p = h && h.nextElementSibling; if (!p) return;
      if (!(id in ORIG)) ORIG[id] = p.textContent;
      var t = w ? TXT_W[id] : ORIG[id]; if (p.textContent !== t) p.textContent = t;
    }
    function appliquerW() {
      var w = isW(), avant = D.documentElement.classList.contains('v4-w');
      D.documentElement.classList.toggle('v4-w', w);
      if (w !== avant) { try { hideErr('err2'); hideErr('err3'); } catch (e) {} }   /* message d'un autre parcours effacé */
      texteTete('t2', w); texteTete('t3', w);
      var ib = $('v4iBtn'); if (ib) { ib.style.display = aAv() ? '' : 'none'; if (!aAv()) { ib.setAttribute('aria-expanded', 'false'); $('v4Info').hidden = true; } }
    }
    /* étape 2 en mode avantages seuls : les champs s'affichent tout de suite, sans recherche SIRET */
    function ouvrirFiche() {
      var f = $('dvFound'); if (!f || f.classList.contains('show') || typeof fillEntreprise !== 'function') return;
      auto = true;
      try { fillEntreprise({ source: 'manuel', siret: ($('siret') && $('siret').value || '').replace(/\D/g, '') }, true); } catch (e) {}
    }

    function brancherDevis() {
      if (W.__v4Devis) return; W.__v4Devis = true;
      /* 1. avantages salariés : titres-restaurant et cartes cadeaux */
      try { if (typeof DV_SOL === 'object' && DV_SOL.avantages) DV_SOL.avantages.d = 'Titres-restaurant et cartes cadeaux : du pouvoir d’achat au quotidien.'; } catch (e) {}
      var mob = D.querySelector('#devis input[name="av_type"][value="mob"]');
      if (mob) {
        var lb = mob.closest('label'); if (lb) lb.classList.add('v4-mob');
        var sub = D.querySelector('#devis [data-show="av_type:mob"]'); if (sub) sub.classList.add('v4-mob');
        if (mob.checked) { mob.checked = false; try { if (typeof applyShow === 'function') applyShow(); if (typeof save === 'function') save(); } catch (e) {} }
      }
      try { if (typeof renderChoices === 'function') renderChoices(); } catch (e) {}

      /* 2. champs masqués en mode avantages seuls */
      ['e-ville', 'e-naf', 'e-sec', 'e-ccn', 'h-cad', 'h-sal', 'h-etab', 'h-loc', 'h-anc'].forEach(marquer);
      var ls = D.querySelector('label[for="siret"]');
      if (ls && !ls.querySelector('.v4-wo')) ls.insertAdjacentHTML('beforeend', '<span class="v4-opt v4-wo">facultatif</span>');
      var lc = D.querySelector('label[for="h-couv"]');
      if (lc && !$('v4iBtn')) {
        lc.innerHTML = 'Nombre de salariés concernés <span class="req">*</span>';
        lc.insertAdjacentHTML('beforeend', '<button type="button" class="v4-i" id="v4iBtn" aria-expanded="false" aria-controls="v4Info" aria-label="Qui compter parmi les salariés concernés ? (CDI, CDD, apprentis…)">i</button>');
        var fld = lc.closest('.field');
        if (fld) fld.insertAdjacentHTML('beforeend', '<div class="v4-info" id="v4Info" role="region" aria-label="Salariés à compter" hidden>' + INFO + '</div>');
        $('v4iBtn').addEventListener('click', function (e) { e.preventDefault(); var o = this.getAttribute('aria-expanded') !== 'true'; this.setAttribute('aria-expanded', String(o)); $('v4Info').hidden = !o; });
      }

      /* 3. navigation et validations */
      if (typeof go === 'function') {
        var _go = go;
        go = function (n) { var r = _go.apply(this, arguments); try { appliquerW(); if (+n === 2 && isW()) ouvrirFiche(); } catch (e) {} return r; };
      }
      if (typeof toggleSol === 'function') {
        var _ts = toggleSol;
        toggleSol = function () { var r = _ts.apply(this, arguments); try { appliquerW(); } catch (e) {} return r; };
      }
      if (typeof validateEntreprise === 'function') {
        var _ve = validateEntreprise;
        validateEntreprise = function () {
          if (!isW()) return _ve.apply(this, arguments);
          ouvrirFiche();
          var v = $('e-ville'), vide = v && !v.value.trim();
          if (vide) v.value = '—';                 /* ville non demandée : le contrôle du socle reste en place */
          var ok = _ve.apply(this, arguments);
          if (vide) { v.value = ''; try { if (S.ent) S.ent.ville = ''; if (typeof save === 'function') save(); } catch (e) {} }
          return ok;
        };
      }
      if (typeof validateRH === 'function') {
        var _vr = validateRH;
        validateRH = function () {
          if (!isW()) return _vr.apply(this, arguments);
          /* avantages seuls : seul le nombre de salariés concernés est demandé (pas de tranche de salaire) */
          try { hideErr('err3'); } catch (e) {}
          var n = S.ent && +S.ent.effectif, c = +$('h-couv').value;
          if (!c || c < 1) { showErr('err3', 'Indiquez le nombre de salariés concernés.'); return false; }
          if (n && c > n) { showErr('err3', 'Le nombre de salariés concernés ne peut pas dépasser l’effectif de l’entreprise (' + n + ').'); return false; }
          try { if (typeof save === 'function') save(); } catch (e) {}
          return true;
        };
      }
      appliquerW();
      try { if (typeof S === 'object' && S.step === 2 && isW()) ouvrirFiche(); } catch (e) {}
      W.BRH_V4 = { isW: isW, appliquerW: appliquerW };
    }
    D.addEventListener('DOMContentLoaded', function () { setTimeout(brancherDevis, 0); });   /* après les modules de la version C */
    W.addEventListener('load', brancherDevis);
  }
})();
