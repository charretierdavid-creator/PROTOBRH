/* Version B — protobrhb.monsitedetest.com : accueil propre à B, Label BRH (menu « Diagnostic RH ») et devis en ligne commun.
   Les pages de ce dossier remplacent celles du socle (protobrh/) ; le Label BRH, l'audit mutuelle, le devis en ligne
   (devis.html) et l'assistant (chatbot-widget.js, relié à Mistral) sont ceux du socle.
   Ce fichier identifie la version dans chaque événement de mesure et chaque demande transmise, aligne le menu
   des pages du socle sur celui du site B et remplace « mutuelle » par « complémentaire santé » (retour CAA). */
(function(){
  var V = 'B';
  window.BRH_VARIANTE = V;
  /* options du socle activées pour la version B (retours CAA du 20/10/2026) */
  window.BRH_OPTIONS = { auditSiret:true, partMin50:true, prevCadres:true };
  document.documentElement.setAttribute('data-variante', V);
  var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
  dl.push = function(o){ if (o && typeof o === 'object' && !o.variante) o.variante = V; return push.apply(dl, arguments); };
  function ready(f){ if (document.readyState !== 'loading') f(); else document.addEventListener('DOMContentLoaded', f); }
  /* pages du socle conservées (audit mutuelle, devis santé et prévoyance) : menu aligné sur celui du site B */
  ready(function(){
    document.querySelectorAll('header .nav a, #mobileMenu a').forEach(function(a){
      var h = a.getAttribute('href') || '';
      if (/^newsletter\.html$/.test(h)) a.setAttribute('href', 'newsletter-edition.html');
      else if (/^audit-mutuelle\.html/.test(h)) a.textContent = 'Audit santé';
    });
    /* bandeau du haut simplifié (12/11/2026) : Audit santé et Avantages fiscaux sont en bas de page (sauf sur leur propre page) */
    document.querySelectorAll('header .nav a').forEach(function(a){
      var h = a.getAttribute('href') || '';
      if (/^(audit-mutuelle|avantages-fiscaux)\.html/.test(h) && !a.classList.contains('active')) a.remove();
    });
    termeSante();
  });
  /* « complémentaire santé » plutôt que « mutuelle » (posture d'assureur), y compris dans les contenus affichés ensuite */
  function termeSante(){
    var RE = /\b(mutuelles?)\b/gi;
    function remplace(m){ var pl = /s$/i.test(m), r = pl ? 'complémentaires santé' : 'complémentaire santé';
      return m === m.toUpperCase() ? r.toUpperCase() : (m[0] === 'M' ? r[0].toUpperCase() + r.slice(1) : r); }
    function passe(root){
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function(n){
        var p = n.parentNode && n.parentNode.nodeName; return (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), t;
      while ((t = w.nextNode())) { if (RE.test(t.nodeValue)) { RE.lastIndex = 0; t.nodeValue = t.nodeValue.replace(RE, remplace); } RE.lastIndex = 0; }
    }
    passe(document.body);
    document.title = document.title.replace(RE, remplace);
    new MutationObserver(function(ms){ ms.forEach(function(m){ m.addedNodes.forEach(function(n){ if (n.nodeType === 3) { if (RE.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(RE, remplace); RE.lastIndex = 0; } else if (n.nodeType === 1) passe(n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
})();
