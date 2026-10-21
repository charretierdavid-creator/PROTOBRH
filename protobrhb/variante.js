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
  f.href = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap';
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
      nav.innerHTML = '<ol><li class="vb-n">Votre parcours en ' + STEPS.length + ' étapes</li>' + STEPS.map(function(s, i){ return '<li' + (i === cur ? ' class="on" aria-current="step"' : '') + '><a href="' + s[0] + '">' + s[1] + '</a></li>'; }).join('') + '</ol>';
      header.parentNode.insertBefore(nav, header.nextSibling);
    }
    var foot = document.querySelector('footer.footer') || document.querySelector('footer');
    var trust = document.createElement('section'); trust.className = 'vb-trust'; trust.setAttribute('aria-label', 'Nos engagements');
    trust.innerHTML = '<div class="wrap"><div><b>Un expert dans votre Caisse régionale</b>Rappel sous 24 h ouvrées, conseil personnalisé.</div><div><b>Des offres du groupe Crédit Agricole</b>Crédit Agricole Assurances, Amundi, CA Titres, Worklife.</div><div><b>Vos données protégées</b>Utilisées uniquement pour votre demande, avec votre accord.</div></div>';
    if (foot) foot.parentNode.insertBefore(trust, foot); else document.body.appendChild(trust);
    patrimoine(page); mentionsPriorites(); termeSante();
  });

  /* Accompagnement patrimonial du dirigeant (idée du 19/10/2026) : accueil, en second plan, et « Bon à savoir » du diagnostic */
  var PAT_URL = 'https://www.credit-agricole.fr/entreprise/transmission-reprise/accompagnement-dirigeant.html';
  function patrimoine(page){
    var lien = '<a class="btn btn-outline" href="' + PAT_URL + '" target="_blank" rel="noopener" onclick="window.dataLayer.push({event:\'patrimoine_click\'})">Découvrir l’accompagnement du dirigeant</a>';
    var offres = (page === 'index.html' || page === '') && document.getElementById('offres');
    if (offres && !document.getElementById('vb-pat')) {
      var s = document.createElement('section'); s.id = 'vb-pat'; s.className = 'vb-pat';
      s.innerHTML = '<div class="wrap"><div class="vb-pat-in"><div><span class="vb-kick">Pensez aussi à votre patrimoine</span>' +
        '<h2>Votre entreprise et votre patrimoine, un même projet</h2>' +
        '<p>Protéger votre famille, transmettre ou céder vos parts aux meilleures conditions, renforcer les fonds propres de votre entreprise : le Crédit Agricole accompagne les dirigeants dans toutes les dimensions de leur patrimoine, avec les experts de votre région.</p>' +
        '<div class="vb-pat-cta">' + lien + '<a class="btn btn-primary" href="diagnostic.html#contact">En parler à un expert</a></div></div>' +
        '<ul><li>Financement d’acquisition et ingénierie financière sur cession</li><li>Structuration du patrimoine pour une cession ou une transmission</li><li>Transmission et fusion d’entreprise</li><li>Capital-investissement et introduction en bourse</li></ul></div></div>';
      offres.parentNode.insertBefore(s, offres.nextSibling);
    }
    var bas = document.getElementById('bon-a-savoir');
    if (bas && !document.getElementById('basPat')) {
      var c = document.createElement('div'); c.id = 'basPat'; c.className = 'bas-card vb-bas-pat';
      c.innerHTML = '<h3>Pensez aussi à votre patrimoine de dirigeant</h3><p>Transmission, cession de parts, protection de votre famille, fonds propres de l’entreprise : un accompagnement global, réservé aux dirigeants.</p>' + lien;
      bas.appendChild(c);
    }
  }
  /* Priorités du diagnostic : obligations santé et prévoyance, benchmark mis en avant */
  function mentionsPriorites(){
    var intro = document.querySelector('#block2 .prio-intro');
    if (intro && !document.querySelector('.vb-oblig')) {
      var n = document.createElement('p'); n.className = 'vb-oblig';
      n.innerHTML = '<b>Bon à savoir :</b> la <b>complémentaire santé</b> est obligatoire pour tous les salariés (accord national interprofessionnel, ANI) ; la <b>prévoyance</b> l’est pour les cadres et souvent selon votre convention collective.';
      intro.appendChild(n);
    }
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
