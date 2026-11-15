/* Version C 2.6 — 15/11/2026 · étape « 5. Votre estimation » du devis (piste A « le chemin est tracé ») : bouton « Construire ma proposition » juste sous les montants, envoi par e-mail replié, proposé aussi à la sortie de page · historique : VERSIONS.md */
/* ==============================================================
   ESTIMATION — piste A validée par David CHARRETIER le 15/11/2026.
   Un seul geste attendu après les chiffres :
     1. les montants (bandeau vert du socle, #dvSynth) en tête, suivis de « Estimation indicative et non contractuelle. » ;
     2. « Prochaine étape : votre proposition personnalisée » — 2 étapes, environ 2 minutes, sans engagement,
        barre d'avancement (5 étapes sur 7 faites) et bouton « Construire ma proposition → » (même fonction next(5) du socle) ;
     3. « Pas le temps maintenant ? Recevoir mon estimation par e-mail » replié sur une ligne : il s'ouvre à la demande
        et contient le formulaire de la couche parcours (lm-parcours.js : e-mail, « déjà client ? », consentement) ;
     4. le détail par solution du socle (#dvEst) reste accessible, replié ;
     5. en bas, « Modifier mes réponses » seulement.
   Sortie de page : si le dirigeant quitte l'estimation sans avoir demandé l'envoi (souris vers le haut de la fenêtre,
   ou clic sur un lien qui quitte le devis), la même proposition d'envoi par e-mail lui est faite, une fois par session.
   Aucune fonction ni aucun identifiant du socle n'est renommé : seules la disposition et la présentation changent.
   ============================================================== */
(function () {
  'use strict';
  if (window.__BRH_ESTIMATION_C) return;
  window.__BRH_ESTIMATION_C = true;
  var D = document, $ = function (id) { return D.getElementById(id); };
  var etape = D.querySelector ? D.querySelector('.dv-step[data-step="5"]') : null;
  if (!etape || !$('dvSynth')) return;
  function memo(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  var FLECHE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var st = D.createElement('style'); st.id = 'estimationC';
  st.textContent =
    '.c-est-note{margin:12px 0 0;font-size:.84rem;color:var(--slate,#5c6b64)}' +
    '.c-next{margin-top:22px;background:var(--mint-2,#eef4ef);border-radius:20px;padding:22px 26px;display:flex;align-items:center;gap:24px;flex-wrap:wrap}' +
    '.c-next-t{flex:1 1 380px;min-width:0}.c-next-t b{display:block;font-family:var(--fh,inherit);font-size:1.12rem;line-height:1.25;color:var(--green,#065145)}' +
    '.c-next-t span{display:block;margin-top:6px;font-size:.92rem;color:var(--slate,#5c6b64)}' +
    '.c-next-bar{display:flex;gap:6px;margin-top:14px}.c-next-bar i{width:30px;height:5px;border-radius:3px;background:var(--line-2,#dfe6e2)}.c-next-bar i.on{background:var(--lime,#8fb822)}' +
    '.c-next .btn{flex:0 0 auto;justify-content:center;padding:1rem 1.6rem;font-size:1rem}' +
    '.c-fold{margin-top:14px;border:1.5px dashed var(--line-2,#dfe6e2);border-radius:16px;background:#fff}' +
    '.c-fold-h{display:flex;width:100%;align-items:center;gap:12px;background:none;border:0;padding:15px 22px;cursor:pointer;text-align:left;font:inherit;font-size:.95rem;color:var(--slate,#5c6b64)}' +
    '.c-fold-h b{color:var(--green,#065145);font-family:var(--fh,inherit);font-weight:600}.c-fold-h em{margin-left:auto;font-style:normal;font-family:var(--fh,inherit);font-weight:600;color:var(--green,#065145);white-space:nowrap}' +
    '.c-fold-b{padding:0 22px 18px}.c-fold-b[hidden]{display:none}.c-fold-b .lm-est-t b{display:none}.c-fold-b .lm-est{margin-top:0;border:0;padding:0}' +
    '.c-detail{margin-top:10px}.c-detail-h{background:none;border:0;padding:4px 0;cursor:pointer;font:inherit;font-size:.86rem;color:var(--green,#065145);text-decoration:underline}' +
    '.c-detail .dv-est{margin-top:12px}' +
    'html[data-variante="C"] .dv-step[data-step="5"] .dv-nav .btn-primary{display:none}' +
    '.c-quitter{position:fixed;inset:0;z-index:1200;background:rgba(15,30,26,.45);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.c-quitter-d{background:#fff;border-radius:20px;max-width:560px;width:100%;padding:24px 26px 20px;box-shadow:0 18px 50px rgba(0,0,0,.25);max-height:92vh;overflow:auto}' +
    '.c-quitter-d h3{margin:0 0 6px;font-family:var(--fh,inherit);font-size:1.15rem;color:var(--green,#065145)}.c-quitter-d p{margin:0 0 14px;font-size:.92rem;color:var(--slate,#5c6b64)}' +
    '.c-quitter-d .lm-est{margin-top:0;border:0;padding:0}.c-quitter-a{display:flex;justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap}' +
    '@media(max-width:640px){.c-next{padding:18px}.c-next .btn{width:100%}.c-fold-h{padding:13px 16px;flex-wrap:wrap}.c-fold-h em{margin-left:0}.c-fold-b{padding:0 16px 16px}}';
  (D.head || D.documentElement).appendChild(st);

  /* 1. les montants en tête, la mention courte dessous */
  var synth = $('dvSynth'), est = $('dvEst'), note = etape.querySelector('.dv-note'), nav = etape.querySelector('.dv-nav');
  var tete = etape.querySelector('.dv-head');
  if (tete && tete.nextSibling !== synth) etape.insertBefore(synth, tete.nextSibling);
  var court = D.createElement('p'); court.className = 'c-est-note'; court.id = 'cEstNote'; court.textContent = 'Estimation indicative et non contractuelle.';
  etape.insertBefore(court, synth.nextSibling);
  if (note) note.style.display = 'none';
  /* 2. prochaine étape */
  var suite = D.createElement('div'); suite.className = 'c-next'; suite.id = 'cNext';
  suite.innerHTML = '<div class="c-next-t"><b>Prochaine étape : votre proposition personnalisée</b><span>2 étapes, environ 2 minutes. Sans engagement : votre expert BRH vous recontacte.</span>' +
    '<div class="c-next-bar" role="img" aria-label="Étape 5 sur 7">' + [1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<i class="' + (i <= 5 ? 'on' : '') + '"></i>'; }).join('') + '</div></div>' +
    '<button type="button" class="btn btn-primary" id="cNextBtn">Construire ma proposition ' + FLECHE + '</button>';
  etape.insertBefore(suite, court.nextSibling);
  var bt = $('cNextBtn'); if (bt) bt.addEventListener('click', function () { if (typeof next === 'function') next(5); });
  /* 3. e-mail replié (formulaire de lm-parcours.js) */
  var form = $('lmEst'), pli = null;
  function ouvrirPli(ouvrir) {
    if (!pli) return; var b = $('cFoldB'), h = $('cFoldH');
    var o = ouvrir == null ? b.hidden : ouvrir; b.hidden = !o; h.setAttribute('aria-expanded', String(o)); h.querySelector('em').textContent = o ? 'Fermer ▴' : 'Ouvrir ▾';
    if (o) { var em = $('lmEm'); if (em && em.focus) try { em.focus(); } catch (e) {} }
  }
  if (form) {
    pli = D.createElement('div'); pli.className = 'c-fold'; pli.id = 'cFold';
    pli.innerHTML = '<button type="button" class="c-fold-h" id="cFoldH" aria-expanded="false" aria-controls="cFoldB"><span>Pas le temps maintenant ? <b>Recevoir mon estimation par e-mail</b></span><em>Ouvrir ▾</em></button><div class="c-fold-b" id="cFoldB" hidden></div>';
    etape.insertBefore(pli, suite.nextSibling);
    $('cFoldB').appendChild(form);
    $('cFoldH').addEventListener('click', function () { ouvrirPli(); });
  }
  /* 4. détail par solution, replié */
  if (est) {
    var det = D.createElement('div'); det.className = 'c-detail'; det.id = 'cDetail';
    det.innerHTML = '<button type="button" class="c-detail-h" id="cDetailH" aria-expanded="false" aria-controls="dvEst">Voir le détail par solution et les hypothèses ▾</button>';
    etape.insertBefore(det, (pli || suite).nextSibling);
    det.appendChild(est); est.style.display = 'none';   /* .dv-est est une grille : l'attribut hidden ne suffit pas */
    var dh = $('cDetailH');
    dh.addEventListener('click', function () { var o = est.style.display === 'none'; est.style.display = o ? '' : 'none'; dh.setAttribute('aria-expanded', String(o));
      dh.textContent = o ? 'Masquer le détail par solution ▴' : 'Voir le détail par solution et les hypothèses ▾'; });
  }
  if (nav) etape.appendChild(nav);   // « Modifier mes réponses » en bas (le bouton du socle est masqué, remplacé par celui de la prochaine étape)

  /* 5. sortie de page : la proposition d'envoi par e-mail, une fois par session */
  function dejaEnvoye() { return !!memo('brhLmSuivi') || /est envoyée|a déjà été envoyée/.test((($('lmEstMsg') || {}).textContent) || ''); }
  function surEstimation() { return !!(etape.classList && etape.classList.contains('active')); }
  function proposer(suiteFn) {
    if (!form || memo('brhEstSortie') || dejaEnvoye() || !surEstimation() || $('cQuitter')) return false;
    memo('brhEstSortie', 1);
    var m = D.createElement('div'); m.className = 'c-quitter'; m.id = 'cQuitter';
    m.innerHTML = '<div class="c-quitter-d" role="dialog" aria-modal="true" aria-labelledby="cQuitterT"><h3 id="cQuitterT">Gardez votre estimation</h3><p>Recevez vos montants par e-mail pour y revenir quand vous voulez, même sans terminer votre devis maintenant.</p>' +
      '<div id="cQuitterF"></div><div class="c-quitter-a"><button type="button" class="btn btn-outline" id="cQuitterNon">' + (suiteFn ? 'Quitter sans l’envoyer' : 'Plus tard') + '</button></div></div>';
    D.body.appendChild(m);
    $('cQuitterF').appendChild(form);
    var fermer = function (partir) { var b = $('cFoldB'); if (b) b.appendChild(form); if (m.parentNode) m.parentNode.removeChild(m); if (partir && suiteFn) suiteFn(); };
    $('cQuitterNon').addEventListener('click', function () { fermer(true); });
    m.addEventListener('click', function (e) { if (e.target === m) fermer(false); });
    D.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && $('cQuitter')) { fermer(false); D.removeEventListener('keydown', esc); } });
    var em = $('lmEm'); if (em && em.focus) try { em.focus(); } catch (e) {}
    return true;
  }
  D.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) proposer(null); });
  D.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
    var h = a.getAttribute('href') || '';
    if (!h || h.charAt(0) === '#' || /^(javascript|mailto|tel):/i.test(h) || /(^|\/)devis\.html(\?|#|$)/.test(h) || a.target === '_blank') return;
    if (proposer(function () { location.href = h; })) e.preventDefault();
  }, true);
  window.BRH_ESTIMATION_C = { ouvrirPli: ouvrirPli, proposer: proposer, version: '2.6' };
})();
