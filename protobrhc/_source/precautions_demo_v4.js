/* ==============================================================
   DÉMO HORS LIGNE V4 — précautions d'usage en bas de chaque écran (26/11/2026, demande de David CHARRETIER)
   Remplace precautions_demo.js (V3). Injecté par le shell dans chaque page, après le SHIM.
   - V3 : encadrés dispersés à côté de chaque montant. V4 : UN seul encadré par écran, en bas de la page,
     juste avant le pied de page (ou à la fin du contenu quand la page n'a pas de pied de page).
   - Le bandeau fixe « Démonstration – données fictives… » du shell est conservé (choix de David du 26/11).
   - Fenêtres : « En savoir plus » d'une offre (#smBody) → mention en bas de la fenêtre ;
     document de devis imprimable → mention en bas du document, filigrane DÉMONSTRATION conservé.
   Textes validés par David le 24/11/2026, inchangés.
   ============================================================== */
(function () {
  var W = window, D = document;
  var PAGE = W.__REAL_PAGE || W.__PAGE || '';
  var TITRE = 'Démonstration · données fictives, non contractuelles';
  var TEXTE = 'Montants calculés sur des hypothèses fictives. Ils n’engagent pas le Crédit Agricole et ne valent ni offre ni devis. Seul l’expert de votre Caisse régionale peut établir une proposition.';
  var COURT = 'Démonstration : données fictives, non contractuelles, présentées à titre d’illustration.';
  var SCORE = 'Score et comparaisons calculés sur des données fictives, non contractuelles, présentés à titre d’illustration.';
  var DOC = 'Ce devis est établi à titre de démonstration, sur des hypothèses fictives. Il n’engage pas le Crédit Agricole et ne vaut ni offre ni devis. Seul l’expert de votre Caisse régionale peut établir une proposition.';
  var ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';

  /* type de mention de l'écran : plein (montants), label (score + montants), court (pages sans montant) */
  var PLEIN = { 'diagnostic.html': 1, 'devis.html': 1, 'audit-mutuelle.html': 1, 'avantages-fiscaux.html': 1, 'mon-dossier.html': 1 };
  var TYPE = PAGE === 'label-brh.html' ? 'label' : (PLEIN[PAGE] ? 'plein' : 'court');

  var CSS = ''
    + '.brh-prec-zone{padding:8px 0 26px}'
    + '.brh-prec{display:flex;gap:10px;align-items:flex-start;margin:0;padding:10px 14px;border:1px solid #ecdcc6;border-left:3px solid #b26b14;border-radius:10px;background:#fffaf3;color:#4a3a26;font-size:.84rem;line-height:1.45;text-align:left;font-weight:400;letter-spacing:0;text-transform:none;box-sizing:border-box;width:auto;max-width:100%}'
    + '.brh-prec svg{flex:0 0 16px;width:16px;height:16px;margin-top:2px;color:#9a5a12}'
    + '.brh-prec b{display:block;font-weight:700;font-size:.8rem;color:#7a4510;margin:0 0 2px}'
    + '.brh-prec p{margin:0}'
    + '.brh-prec.c{padding:7px 12px;font-size:.78rem}.brh-prec.c svg{width:14px;height:14px;flex-basis:14px;margin-top:1px}'
    + '#smBody .brh-prec{margin:14px 0 0}'
    + '.brh-prec.doc{border-left-width:4px;margin:22px 0 0;font-size:.82rem}.brh-prec.doc b{text-transform:uppercase;letter-spacing:.05em}'
    + '#devisDoc .brhq{position:relative}'
    + '#devisDoc .brhq::after{content:"DÉMONSTRATION";position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) rotate(-28deg);font-size:88px;font-weight:800;letter-spacing:.08em;color:rgba(154,90,18,.07);pointer-events:none;white-space:nowrap;z-index:0}'
    + '@media print{.brh-prec{-webkit-print-color-adjust:exact;print-color-adjust:exact}#devisDoc .brhq::after{color:rgba(154,90,18,.09)}}'
    + '@media(max-width:640px){#devisDoc .brhq::after{font-size:52px}}';

  function contenu(t) {
    if (t === 'plein') return ICO + '<div><b>' + TITRE + '</b><p>' + TEXTE + '</p></div>';
    if (t === 'label') return ICO + '<div><b>' + TITRE + '</b><p>' + SCORE + ' ' + TEXTE + '</p></div>';
    if (t === 'doc') return ICO + '<div><b>Document de démonstration · données fictives</b><p>' + DOC + '</p></div>';
    return ICO + '<p>' + COURT + '</p>';
  }
  function bloc(id, t) {
    var el = D.createElement('div');
    el.setAttribute('data-prec', id); el.setAttribute('role', 'note');
    el.className = 'brh-prec' + (t === 'court' ? ' c' : t === 'doc' ? ' doc' : '');
    el.innerHTML = contenu(t);
    return el;
  }
  var zone = null, sol = null, doc = null;

  /* bas de l'écran : avant le pied de page de la page, sinon à la fin du contenu principal */
  function placerEcran() {
    if (!D.body) return;
    if (!zone) {
      zone = D.createElement('div'); zone.className = 'brh-prec-zone'; zone.setAttribute('data-prec-zone', PAGE);
      var w = D.createElement('div'); w.className = 'wrap'; w.appendChild(bloc('ecran', TYPE)); zone.appendChild(w);
    }
    var pied = D.querySelector('footer.footer') || D.querySelector('footer');
    if (pied && pied.parentNode) { if (pied.previousElementSibling !== zone) pied.parentNode.insertBefore(zone, pied); return; }
    var m = D.querySelector('main') || D.body;
    if (m.lastElementChild !== zone) m.appendChild(zone);
  }
  function placer() {
    placerEcran();
    var sb = D.getElementById('smBody');
    if (sb) { if (!sol) sol = bloc('sol', 'court'); if (sb.lastElementChild !== sol) sb.appendChild(sol); }
    var q = D.querySelector('#devisDoc .brhq');
    if (q) { if (!doc) doc = bloc('doc', 'doc'); if (q.lastElementChild !== doc) q.appendChild(doc); }
  }
  var prevu = false;
  function bientot() { if (prevu) return; prevu = true; setTimeout(function () { prevu = false; try { placer(); } catch (e) {} }, 0); }
  function brancher() {
    var st = D.createElement('style'); st.id = 'brhPrecCss'; st.textContent = CSS; (D.head || D.documentElement).appendChild(st);
    placer();
    try { new MutationObserver(bientot).observe(D.body, { childList: true, subtree: true }); } catch (e) {}
    W.addEventListener('load', bientot);
  }
  W.BRH_PRECAUTIONS = { version: 'V4', titre: TITRE, texte: TEXTE, court: COURT, type: TYPE, placer: placer };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', brancher); else brancher();
})();
