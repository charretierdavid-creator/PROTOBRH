/* Version A — protobrha.monsitedetest.com : parcours simplifié, design épuré et moderne.
   Identifie la version dans chaque événement de mesure et chaque demande transmise, puis applique
   les simplifications du parcours. Le reste du site est le socle commun (dossier protobrh/). */
(function(){
  var V = 'A';
  window.BRH_VARIANTE = V;
  document.documentElement.setAttribute('data-variante', V);
  var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
  dl.push = function(o){ if (o && typeof o === 'object' && !o.variante) o.variante = V; return push.apply(dl, arguments); };
  function ready(f){ if (document.readyState !== 'loading') f(); else document.addEventListener('DOMContentLoaded', f); }
  ready(function(){
    // diagnostic : gains affichés tout de suite, sans demander l'e-mail
    try { if (typeof state !== 'undefined' && document.getElementById('results-gate')) { state.resultsUnlocked = true; updateGain(); if (typeof updateRecap === 'function') updateRecap(); } } catch (e) {}
    // modules complémentaires retirés du menu : accessibles en bas de page
    var foot = document.querySelector('footer');
    if (foot && !document.querySelector('.va-more')) {
      var p = document.createElement('p'); p.className = 'va-more';
      p.innerHTML = 'Aussi sur le portail : <a href="audit-mutuelle.html?from=header">Audit mutuelle</a><a href="ressources.html">Ressources</a><a href="newsletter-edition.html">Newsletter du mois</a>';
      foot.parentNode.insertBefore(p, foot);
    }
  });
})();
