/* ==============================================================
   IA DU PARCOURS — page d'accueil (version C du test A/B, protobrhc)
   Étape 1 « Découvrir » :
     - encadré « Expliquez votre situation » sous le bandeau d'accueil : la question
       du dirigeant est confiée à l'Assistant BRH (chatbot-widget.js, Mistral),
       qui pré-oriente vers le diagnostic, le devis ou un expert ;
     - questions fréquentes en données structurées (schema.org FAQPage)
       et résumé llms.txt pour les IA tierces (GEO). Le prototype reste en
       noindex et derrière la porte d'accès.
   ============================================================== */
(function () {
  'use strict';
  var IA = window.BRH_IA; if (!IA) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = IA.esc;

  /* ---------- encadré juste sous le bandeau d'accueil (pleine largeur, sans déformer l'accroche) ---------- */
  var hero = document.querySelector('section.hero');
  if (hero && !$('ia-accueil')) {
    var EX = ['J’ai 12 salariés et je veux les fidéliser', 'Comment donner du pouvoir d’achat sans charges ?', 'Ma mutuelle d’entreprise est-elle adaptée ?'];
    var box = document.createElement('div'); box.className = 'ia-box ia-compact'; box.id = 'ia-accueil'; box.style.margin = '0 auto';
    box.innerHTML = '<div class="ia-head">' + IA.badge() + '<h4>Expliquez votre situation, l’IA vous oriente</h4></div>'
      + '<p class="ia-lede">En une phrase : l’Assistant BRH vous indique par où commencer (diagnostic, devis en ligne ou expert de votre Caisse régionale).</p>'
      + '<form class="ia-ask" id="ia-acc-form" style="margin-top:0"><input type="text" id="ia-acc-q" maxlength="300" placeholder="Ex. : je veux fidéliser mes 15 salariés" aria-label="Votre situation en une phrase">'
      + '<button type="submit" class="ia-btn pri">' + IA.SPARK + 'M’orienter</button></form>'
      + '<div class="ia-chips">' + EX.map(function (q) { return '<button type="button" class="ia-chip" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>'
      + '<p class="ia-ai-note">Orientation indicative par l’IA ; un expert BRH conseille et engage. N’indiquez pas de nom ni de coordonnées.</p>';
    var band = document.createElement('div'); band.className = 'wrap'; band.style.cssText = 'max-width:860px;margin:8px auto 28px';
    band.appendChild(box); hero.parentNode.insertBefore(band, hero.nextSibling);
    $('ia-acc-form').addEventListener('submit', function (e) { e.preventDefault(); envoyer($('ia-acc-q').value); });
    box.addEventListener('click', function (e) { var c = e.target.closest('[data-q]'); if (c) envoyer(c.getAttribute('data-q')); });
  }
  function envoyer(q) {
    q = String(q || '').trim(); if (!q) { $('ia-acc-q').focus(); return; }
    IA.track('ia_accueil_question', {});
    var input = $('cbotInput');
    if (typeof window.cbotOpen === 'function' && typeof window.cbotSend === 'function' && input) {
      window.cbotOpen(); input.value = q; window.cbotSend(); $('ia-acc-q').value = '';
    } else {
      location.href = 'diagnostic.html';   // assistant indisponible : on passe directement au diagnostic
    }
  }

  /* ---------- questions fréquentes en données structurées (GEO) ---------- */
  var FAQ = [
    ['Comment donner du pouvoir d’achat à mes salariés sans alourdir mes charges ?',
     'Titres-restaurant, forfait mobilités durables, cartes cadeaux, prime de partage de la valeur et épargne salariale bénéficient de régimes sociaux et fiscaux spécifiques, selon les conditions et plafonds en vigueur. Un expert Banque des RH de la Caisse régionale précise ce qui s’applique à votre entreprise.'],
    ['La complémentaire santé est-elle obligatoire ?',
     'Oui, pour les salariés du secteur privé ; l’employeur finance au moins 50 % de la cotisation. La prévoyance dépend notamment de la convention collective.'],
    ['Puis-je mettre en place l’intéressement ou la prime de partage de la valeur dans une petite entreprise ?',
     'Oui, ces dispositifs sont facultatifs et accessibles aux petites entreprises, selon des conditions précisées par un expert.']
  ];
  if (!document.querySelector('script[data-ia-faq]')) {
    var ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.setAttribute('data-ia-faq', '1');
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQ.map(function (f) { return { '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } }; }) });
    document.head.appendChild(ld);
  }
})();
