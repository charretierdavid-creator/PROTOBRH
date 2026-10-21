/* Version B — protobrhb.monsitedetest.com : parcours complet, design institutionnel.
   Identifie la version dans chaque événement de mesure et chaque demande transmise, puis ajoute
   le bandeau institutionnel, le repère d'étape et la réassurance. Le reste du site est le socle commun (protobrh/). */
(function(){
  var V = 'B';
  window.BRH_VARIANTE = V;
  document.documentElement.setAttribute('data-variante', V);
  var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
  dl.push = function(o){ if (o && typeof o === 'object' && !o.variante) o.variante = V; return push.apply(dl, arguments); };
  var STEPS = [['index.html#offres', 'Découvrir', ['index.html', '']], ['diagnostic.html', 'Diagnostiquer et simuler', ['diagnostic.html']],
               ['diagnostic.html#block3', 'Choisir', []], ['devis.html', 'Devis en ligne', ['devis.html']], ['diagnostic.html#contact', 'Votre expert BRH', []]];
  function ready(f){ if (document.readyState !== 'loading') f(); else document.addEventListener('DOMContentLoaded', f); }
  ready(function(){
    var page = location.pathname.split('/').pop(), header = document.querySelector('header.header');
    if (!header || document.querySelector('.vb-top')) return;
    var top = document.createElement('div'); top.className = 'vb-top';
    top.innerHTML = '<div class="wrap"><b>Crédit Agricole · Banque des Ressources Humaines — Espace entreprises</b><a href="avantages-fiscaux.html">Avantages fiscaux et sociaux</a><a href="ressources.html">Ressources</a><a href="newsletter-edition.html">Newsletter du mois</a></div>';
    header.insertBefore(top, header.firstChild);
    var cur = -1; STEPS.forEach(function(s, i){ if (cur < 0 && s[2].indexOf(page) >= 0) cur = i; });
    if (cur >= 0) {
      var nav = document.createElement('nav'); nav.className = 'vb-steps'; nav.setAttribute('aria-label', 'Étapes du parcours');
      nav.innerHTML = '<ol>' + STEPS.map(function(s, i){ return '<li' + (i === cur ? ' class="on" aria-current="step"' : '') + '><a href="' + s[0] + '">' + s[1] + '</a></li>'; }).join('') + '</ol>';
      header.parentNode.insertBefore(nav, header.nextSibling);
    }
    var foot = document.querySelector('footer.footer') || document.querySelector('footer');
    var trust = document.createElement('section'); trust.className = 'vb-trust'; trust.setAttribute('aria-label', 'Nos engagements');
    trust.innerHTML = '<div class="wrap"><div><b>Un expert dans votre Caisse régionale</b>Rappel sous 24 h ouvrées, conseil personnalisé.</div><div><b>Des offres du groupe Crédit Agricole</b>Crédit Agricole Assurances, Amundi, CA Titres, Worklife.</div><div><b>Vos données protégées</b>Utilisées uniquement pour votre demande, avec votre accord.</div></div>';
    if (foot) foot.parentNode.insertBefore(trust, foot); else document.body.appendChild(trust);
  });
})();
