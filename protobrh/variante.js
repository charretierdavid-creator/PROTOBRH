/* Version de référence (protobrh.monsitedetest.com).
   Chaque version (REF, A, B) a son propre variante.js : il identifie la version et l'ajoute
   à chaque événement de mesure et à chaque demande transmise (lead, devis, audit, avis). */
(function(){
  var V = 'REF';
  window.BRH_VARIANTE = V;
  document.documentElement.setAttribute('data-variante', V);
  var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
  dl.push = function(o){ if (o && typeof o === 'object' && !o.variante) o.variante = V; return push.apply(dl, arguments); };
})();
