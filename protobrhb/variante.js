/* Version B — protobrhb.monsitedetest.com : parcours complet, design institutionnel.
   Identifie la version dans chaque événement de mesure et chaque demande transmise, puis ajoute
   le bandeau institutionnel, le repère d'étape et la réassurance. Le reste du site est le socle commun (protobrh/). */
(function(){
  var V = 'B';
  window.BRH_VARIANTE = V;
  /* options du socle activées pour la version B (retours CAA du 20/10/2026) */
  window.BRH_OPTIONS = { auditSiret:true, partMin50:true, prevCadres:true };
  document.documentElement.setAttribute('data-variante', V);
  var f = document.createElement('link'); f.rel = 'stylesheet';   // police des titres, chargée sans bloquer la page
  f.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap';
  document.head.appendChild(f);
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
      nav.innerHTML = '<div class="vb-steps-in"><span class="vb-n">Votre parcours en ' + STEPS.length + ' étapes<em>· étape ' + (cur + 1) + ' sur ' + STEPS.length + '</em></span><ol>' +
        STEPS.map(function(s, i){ return '<li class="' + (i < cur ? 'done' : (i === cur ? 'on' : '')) + '"' + (i === cur ? ' aria-current="step"' : '') + '><a href="' + s[0] + '"><span>' + s[1] + '</span></a></li>'; }).join('') + '</ol></div>';
      header.parentNode.insertBefore(nav, header.nextSibling);
    }
    var foot = document.querySelector('footer.footer') || document.querySelector('footer');
    var trust = document.createElement('section'); trust.className = 'vb-trust'; trust.setAttribute('aria-label', 'Nos engagements');
    trust.innerHTML = '<div class="wrap"><div><b>Un expert dans votre Caisse régionale</b>Rappel sous 24 h ouvrées, conseil personnalisé.</div><div><b>Des offres du groupe Crédit Agricole</b>Crédit Agricole Assurances, Amundi, CA Titres, Worklife.</div><div><b>Vos données protégées</b>Utilisées uniquement pour votre demande, avec votre accord.</div></div>';
    if (foot) foot.parentNode.insertBefore(trust, foot); else document.body.appendChild(trust);
    patrimoine(page); mentionsPriorites(); termeSante();
  });

  /* Accompagnement patrimonial du dirigeant (idée du 19/10/2026) : carte du « Bon à savoir » du diagnostic (version B) */
  var PAT_URL = 'https://www.credit-agricole.fr/entreprise/transmission-reprise/accompagnement-dirigeant.html';
  function patrimoine(page){
    var lien = '<a class="btn btn-outline" href="' + PAT_URL + '" target="_blank" rel="noopener" onclick="window.dataLayer.push({event:\'patrimoine_click\'})">Découvrir l’accompagnement du dirigeant</a>';
    // le bloc de l'accueil est dans le socle (index.html, sites S, A et B) ; ici seulement la carte du « Bon à savoir »
    var bas = document.getElementById('bon-a-savoir');
    if (bas && !document.getElementById('basPat')) {
      var c = document.createElement('div'); c.id = 'basPat'; c.className = 'bas-card vb-bas-pat';
      c.innerHTML = '<h3>Pensez aussi à votre patrimoine de dirigeant</h3><p>Transmission, cession de parts, protection de votre famille, fonds propres de l’entreprise : un accompagnement global, réservé aux dirigeants.</p>' + lien;
      bas.appendChild(c);
    }
  }
  /* Priorités du diagnostic : benchmark mis en avant */
  function mentionsPriorites(){
    // obligations santé / prévoyance : fenêtre « i » à côté de « Protéger vos salariés » (socle, sites S, A et B)
    var radar = document.querySelector('#block2 .radar-col');
    if (radar && !document.querySelector('.vb-bench')) {
      var h = document.createElement('p'); h.className = 'vb-bench'; h.textContent = 'Comparez-vous aux entreprises similaires (benchmark)';
      radar.insertBefore(h, radar.firstChild);
    }
  }
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
