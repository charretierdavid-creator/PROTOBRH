/* Version C 2.7 — 16/11/2026 · diagnostic : nombre de salariés à 0 par défaut, message d'erreur quand le gain calculé serait de 0 €, case d'accord obligatoire pour voir les résultats · historique : VERSIONS.md */
/* ==============================================================
   NOMBRE DE SALARIÉS ET GAIN À 0 € (version C, protobrhc) — demande de David CHARRETIER du 16/11/2026
   Surcouche du diagnostic du socle (diagnostic.html), sans modifier la page.
     1. Le champ « Nombre de salariés » part de 0 (le socle affichait 50) : le dirigeant indique son effectif réel.
        Il n'est pas remis à 0 si l'effectif est déjà connu (saisi ailleurs dans le parcours, ou prérempli depuis
        le SIREN / SIRET par diag-entreprise.js). Le 0 est sélectionné quand on clique dans le champ, pour le remplacer.
     2. « Afficher mes résultats » : si le gain calculé serait de 0 €, les résultats ne s'affichent pas
        (aucune demande n'est transmise) et un message explique quoi corriger :
          - nombre de salariés à 0 ou vide → « 1. Votre entreprise » (le champ est signalé) ;
          - aucune priorité au-dessus de 1 → « 2. Vos priorités » (un dispositif n'est retenu qu'à partir du niveau 2) ;
          - les deux à la fois → les deux rubriques.
        Un bouton du message mène à la rubrique à corriger.
     3. Résultats déjà affichés : si le dirigeant ramène son gain à 0 € (effectif effacé, priorités remises à 1),
        le même message apparaît sous les montants, et disparaît dès que le gain redevient positif.
     4. Case d'accord sous « Afficher mes résultats » (ajoutée par lm-parcours.js, fichier identique au module LM 2.0,
        donc adaptée ici) : le mot « Facultatif » est retiré, la phrase raccourcie, et la case devient obligatoire :
        sans elle, les résultats ne s'affichent pas (« Cochez la case ci-dessous pour afficher vos résultats. »).
        Chaque résultat affiché donne donc une demande transmise par la couche parcours (diagnostic_estimation).
        Décision de David CHARRETIER du 16/11/2026 ; conformité (consentement « libre ») : arbitrage COPIL.
     5. Conventions collectives proposées : tant que l'effectif n'est pas indiqué, la liste est celle du socle pour
        une entreprise de plus de 10 salariés (comportement inchangé par rapport au 50 par défaut).
   Fonctions du socle utilisées (ne pas les renommer) : state, calculateFiscalGain, unlockResults, refresh,
   onEffectif, fillCcn, track, CONFIG.activationThreshold ; identifiants : effectif, eff-warn, gate-err, gate-email,
   gains, block1, block2, results-gate ; lmGateOk (lm-parcours.js).
   ============================================================== */
(function () {
  'use strict';
  if (window.__BRH_DIAG_EFFECTIF) return;
  var page = String(window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (page !== 'diagnostic.html') return;
  var D = document, $ = function (id) { return D.getElementById(id); };
  var eff = $('effectif');
  if (!eff || typeof state !== 'object' || !state || typeof calculateFiscalGain !== 'function' || typeof unlockResults !== 'function') return;
  window.__BRH_DIAG_EFFECTIF = true;

  var st = D.createElement('style'); st.id = 'diagEffectifC';
  st.textContent =
    '#gate-err .c-zero-go,#cGainZero .c-zero-go{display:inline;margin-left:6px;background:none;border:0;padding:0;font:inherit;font-weight:600;color:inherit;text-decoration:underline;cursor:pointer}' +
    '#cGainZero{margin:12px 0 0;padding:12px 16px;border-radius:12px;background:#fdf3e7;border:1px solid #f0c48a;color:#7a4a00;font-size:.92rem;line-height:1.45}' +
    '#cGainZero[hidden]{display:none}' +
    '.lm-ck.c-ok-manque{outline:2px solid #f0c48a;outline-offset:4px;border-radius:6px}' +
    '#effectif.c-zero{border-color:#d9822b;border-width:2px;box-shadow:0 0 0 3px rgba(217,130,43,.25)}';
  (D.head || D.documentElement).appendChild(st);

  /* ---------- 1. nombre de salariés à 0 par défaut ---------- */
  if (!state.effSaisi) {
    eff.value = '0';
    state.effectif = 0;
  }
  if (eff.setAttribute) eff.setAttribute('min', '0');   // 0 = pas encore indiqué (évite le champ « invalide » du navigateur)
  if (eff.addEventListener) eff.addEventListener('focus', function () { if (String(eff.value) === '0' && eff.select) try { eff.select(); } catch (e) {} });

  /* conventions collectives : effectif non indiqué → liste « plus de 10 salariés », comme avec l'ancien 50 par défaut */
  if (window.BRH_CCN && !BRH_CCN.__c27) {
    var sansEff = function (e) { return (parseInt(e, 10) || 0) > 0 ? e : 50; };
    ['list', 'options', 'courante'].forEach(function (k) {
      var f = BRH_CCN[k]; if (typeof f !== 'function') return;
      BRH_CCN[k] = function (s, e) { var a = [].slice.call(arguments); a[1] = sansEff(e); return f.apply(this, a); };
    });
    BRH_CCN.__c27 = true;
  }

  /* ---------- 2. motif d'un gain à 0 € ---------- */
  function seuil() { return (typeof CONFIG === 'object' && CONFIG && CONFIG.activationThreshold != null) ? +CONFIG.activationThreshold : 1; }
  function motif() {
    var g = calculateFiscalGain(state.effectif, state.priorities) || {};
    if ((+g.total || 0) > 0) return null;
    var pr = state.priorities || {}, s = seuil();
    var sansSal = !((parseInt(g.n != null ? g.n : state.effectif, 10) || 0) > 0);
    var sansPrio = !Object.keys(pr).some(function (k) { return Number(pr[k]) > s; });
    if (!sansSal && !sansPrio) return null;
    return sansSal && sansPrio ? 'les_deux' : sansSal ? 'effectif' : 'priorites';
  }
  var TXT = {
    effectif: 'Votre gain serait de 0 € : indiquez d’abord le nombre de salariés de votre entreprise, dans « 1. Votre entreprise ».',
    priorites: 'Votre gain serait de 0 € : placez au moins une priorité au-dessus de 1, dans « 2. Vos priorités ». Un dispositif n’est retenu qu’à partir du niveau 2.',
    les_deux: 'Votre gain serait de 0 € : indiquez le nombre de salariés de votre entreprise (« 1. Votre entreprise ») et placez au moins une priorité au-dessus de 1 (« 2. Vos priorités »).'
  };
  var BOUTON = { effectif: 'Indiquer le nombre de salariés ↑', priorites: 'Choisir mes priorités ↑', les_deux: 'Indiquer le nombre de salariés ↑' };
  function aller(m) {
    if (m === 'priorites') { var b2 = $('block2'); if (b2 && b2.scrollIntoView) b2.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (eff.scrollIntoView) eff.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { eff.focus(); } catch (e) {}
  }
  function ecrire(box, m) {
    var idb = box.id === 'gate-err' ? 'cZeroGo' : 'cGainZeroGo';
    box.innerHTML = TXT[m] + ' <button type="button" class="c-zero-go" id="' + idb + '" data-zero="' + m + '">' + BOUTON[m] + '</button>';
    var b = $(idb);
    if (b && b.addEventListener) b.addEventListener('click', function () { aller(m); });
    box.setAttribute('data-c-zero', m);
  }
  function oter(el) { if (!el) return; if (el.removeAttribute) el.removeAttribute('data-c-zero'); else if (el.setAttribute) el.setAttribute('data-c-zero', ''); }
  function signalerChamp(m) {
    var w = $('eff-warn'), on = m === 'effectif' || m === 'les_deux';
    if (eff.classList) eff.classList.toggle('c-zero', on);
    if (w && on) { w.textContent = 'Indiquez le nombre de salariés pour calculer votre gain.'; if (w.classList) w.classList.add('show'); }
  }

  /* ---------- case d'accord : texte raccourci, sans « Facultatif », et obligatoire ---------- */
  var ACCORD = 'J’accepte que le Crédit Agricole et ma Caisse régionale utilisent mon e-mail et mon résultat pour me l’envoyer et me recontacter.';
  var MSG_ACCORD = 'Cochez la case ci-dessous pour afficher vos résultats.';
  var MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   // même contrôle que le socle
  var ck = $('lmGateOk'), lab = ck ? ck.parentNode : null;
  if (lab) {
    var sp = lab.querySelector ? lab.querySelector('span') : null;
    if (sp) sp.textContent = ACCORD;
    if (ck.setAttribute) { ck.setAttribute('required', ''); ck.setAttribute('aria-required', 'true'); }
    if (ck.addEventListener) ck.addEventListener('change', function () {
      var e = $('gate-err');
      if (ck.checked) { if (lab.classList) lab.classList.remove('c-ok-manque'); if (e && e.getAttribute && e.getAttribute('data-c-ok')) { e.textContent = ''; oterOk(e); } }
    });
  }
  function oterOk(el) { if (!el) return; if (el.removeAttribute) el.removeAttribute('data-c-ok'); else if (el.setAttribute) el.setAttribute('data-c-ok', ''); }

  /* « Afficher mes résultats » : bloqué si le gain serait de 0 € ou si la case d'accord n'est pas cochée
     (avant la couche parcours : aucune demande transmise) */
  var _unlock = unlockResults;
  unlockResults = function () {
    var m = motif(), err = $('gate-err');
    if (m) {
      if (err) { oterOk(err); ecrire(err, m); }
      signalerChamp(m);
      if (typeof track === 'function') track('gain_zero_bloque', { motif: m, effectif: +state.effectif || 0 });
      return false;
    }
    var mail = (($('gate-email') || {}).value || '').trim(), c = $('lmGateOk');
    if (c && !c.checked && MAIL.test(mail)) {   // e-mail invalide : le socle affiche son propre message d'abord
      if (err) { err.textContent = MSG_ACCORD; err.setAttribute('data-c-ok', '1'); oter(err); }
      var lb = c.parentNode; if (lb && lb.classList) lb.classList.add('c-ok-manque');
      try { c.focus(); } catch (e) {}
      if (typeof track === 'function') track('accord_manquant', { source: 'diagnostic' });
      return false;
    }
    oterOk(err);
    oter(err);   // le socle réécrit le message (e-mail) : ce n'est plus le nôtre
    var r = _unlock.apply(this, arguments);   // e-mail vérifié par le socle (même message qu'avant)
    majZero();
    return r;
  };

  /* ---------- 3. résultats affichés puis gain ramené à 0 € ---------- */
  function boite() {
    var b = $('cGainZero'); if (b) return b;
    var g = $('gains'); if (!g || !g.parentNode) return null;
    b = D.createElement('p'); b.id = 'cGainZero'; b.setAttribute('role', 'alert'); b.hidden = true;
    g.parentNode.insertBefore(b, g.nextSibling);
    return b;
  }
  function majZero() {
    var m = motif(), err = $('gate-err');
    /* le message de la porte disparaît dès que le gain redevient positif */
    if (!m && err && err.getAttribute && err.getAttribute('data-c-zero')) { err.textContent = ''; oter(err); }
    if (eff.classList && m !== 'effectif' && m !== 'les_deux') eff.classList.remove('c-zero');   // effectif corrigé : le champ n'est plus signalé
    if (err && m && err.getAttribute && err.getAttribute('data-c-zero') && err.getAttribute('data-c-zero') !== m) ecrire(err, m);
    var b = state.resultsUnlocked ? boite() : $('cGainZero');
    if (!b) return;
    if (state.resultsUnlocked && m) { if (b.hidden || b.getAttribute('data-c-zero') !== m) ecrire(b, m); b.hidden = false; }   // réécrit seulement si le motif change (lecteurs d'écran)
    else { b.hidden = true; b.textContent = ''; oter(b); }
  }
  if (typeof refresh === 'function') { var _r = refresh; refresh = function () { var x = _r.apply(this, arguments); majZero(); return x; }; }

  /* mise à jour de la page avec l'effectif à 0 (radar, montants masqués, synthèse, accès au devis, profil de session) */
  if (typeof refresh === 'function') try { refresh(); } catch (e) {}
  if (typeof fillCcn === 'function') try { fillCcn(); } catch (e) {}
  window.BRH_DIAG_EFFECTIF = { motif: motif, texte: TXT, accord: ACCORD, version: '2.7' };
})();
