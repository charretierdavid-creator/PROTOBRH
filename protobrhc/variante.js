/* Version C — protobrhc.monsitedetest.com : troisième version du test A/B (contenu à définir).
   Identifie la version dans chaque événement de mesure et chaque demande transmise.
   Le reste du site est le socle commun (dossier protobrh/). */
(function(){
  var V = 'C';
  window.BRH_VARIANTE = V;
  document.documentElement.setAttribute('data-variante', V);
  var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
  dl.push = function(o){ if (o && typeof o === 'object' && !o.variante) o.variante = V; return push.apply(dl, arguments); };
})();
