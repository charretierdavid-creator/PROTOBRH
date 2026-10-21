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
    // diagnostic : une seule question sur l'entreprise, le nombre de salariés, posée après les curseurs
    var eff = document.getElementById('effectif'), prio = document.querySelector('#block2 .prio-body');
    if (eff && prio && !document.querySelector('.va-eff')) {
      var box = document.createElement('div'); box.className = 'va-eff';
      var fld = eff.closest('.field'); var lab = fld.querySelector('label'); if (lab) lab.innerHTML = 'Combien de salariés compte votre entreprise ? <span class="req">*</span>';
      box.appendChild(fld); prio.parentNode.insertBefore(box, prio.nextSibling);
      ['block2', 'block3', 'contact'].forEach(function(id, i){   // blocs renumérotés : 1. Vos priorités, 2. Nos solutions, 3. Nous contacter
        var n = document.querySelector('#' + id + ' h2 b'); if (n) n.textContent = (i + 1) + '.'; });
      var go = document.querySelector('button[onclick*="block1"]');   // « Commencer le diagnostic » mène aux priorités
      if (go) go.onclick = function(){ document.getElementById('block2').scrollIntoView({ behavior: 'smooth' }); };
    }
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
