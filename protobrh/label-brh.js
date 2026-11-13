/* ==============================================================
   LABEL BRH — navigation et passerelle Label BRH → devis en ligne (sites S, A et B)
   Chargé en fin de page par label-brh.html et par les pages propres à la version B (protobrhb/), qui utilisent BRH.go.
   « Obtenir mon devis » / « Chiffrer cette solution » ouvrent le devis en ligne commun (devis.html), prérempli avec
   les solutions, l'effectif et le secteur passés dans l'adresse.
   L'assistant est le widget commun du socle (chatbot-widget.js), relié à Mistral par chatbot.php.
   Après modification : changer le numéro ?v=AAAAMMJJ dans les pages qui le chargent.
   ============================================================== */
/* ===== 1. Navigation et contexte de page ===== */
(function(){
  var page = window.__PAGE || location.pathname.split('/').pop() || 'index.html';   /* __PAGE : version hors ligne */
  window.BRH = {
    page: page,
    /* lien interne : même page = défilement vers l'ancre, autre page = navigation */
    go: function(url){
      url = String(url || ''); var p = url.split('#'), file = p[0], anchor = p[1] || '';
      if (!file || file === page) { var el = anchor && document.getElementById(anchor); if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); else window.scrollTo({top:0, behavior:'smooth'}); return; }
      if (typeof window.__go === 'function') { window.__go(url); return; }   /* version hors ligne */
      location.href = url;
    }
  };
  /* la version du prototype (D104) est jointe à chaque demande transmise */
  var natif = window.fetch;
  if (natif) window.fetch = function(input, init){
    try{
      if (typeof input === 'string' && /(^|\/)lead\.php/.test(input) && init && typeof init.body === 'string') {
        var b = JSON.parse(init.body); if (b && typeof b === 'object' && !b.variante) { b.variante = window.BRH_VARIANTE || ''; init.body = JSON.stringify(b); }
      }
    }catch(e){}
    return natif.apply(this, arguments);
  };
})();

/* ===== 2. Passerelle Label BRH → devis en ligne ===== */
(function(){
  if(!window.BRH) return;
  var NEED_LABEL = {sante:'Santé & prévoyance', retraite:'Retraite collective', epargne:'Épargne salariale', avantages:'Avantages salariés'};
  var AXIS_NEEDS = {attirer:['sante','retraite'], fideliser:['epargne'], pouvoir:['avantages']};
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var CALC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2.5"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/></svg>';
  function css(t){ var s=document.createElement('style'); s.textContent=t; document.head.appendChild(s); }

  /* =================== 1. Page Label BRH (diagnostic) =================== */
  if(BRH.page === 'label-brh.html' && typeof window.renderResults === 'function'){
    css(
      '.brhd-band{position:relative;overflow:hidden;background:linear-gradient(120deg,var(--green) 0%,#0b6b5a 100%);color:#fff;border-radius:var(--radius-lg);padding:30px 34px;margin-bottom:26px;display:grid;grid-template-columns:auto 1fr auto;gap:26px;align-items:center;box-shadow:0 14px 34px rgba(6,81,69,.22);scroll-margin-top:92px}'+
      '.brhd-band::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:rgba(143,184,34,.18);pointer-events:none}'+
      '.brhd-ic{width:64px;height:64px;border-radius:18px;background:rgba(255,255,255,.12);display:grid;place-items:center}.brhd-ic svg{width:32px;height:32px;color:#fff}'+
      '.brhd-tag{display:inline-flex;align-items:center;gap:.4rem;font-family:var(--fh);font-weight:700;font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;background:var(--lime);color:#14301f;border-radius:999px;padding:.28rem .7rem;margin-bottom:10px}'+
      '.brhd-band h3{font-family:var(--fh);font-size:1.35rem;line-height:1.25;color:#fff;margin:0 0 6px}'+
      '.brhd-band p{margin:0;color:rgba(255,255,255,.86);font-size:.95rem;line-height:1.5}'+
      '.brhd-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}'+
      '.brhd-chips span{display:inline-flex;align-items:center;gap:.35rem;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:.32rem .75rem;font-size:.82rem;font-weight:600}'+
      '.brhd-chips span::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--lime)}'+
      '.brhd-cta{display:flex;flex-direction:column;gap:10px;align-items:stretch;position:relative;z-index:1}'+
      '.brhd-cta .btn{justify-content:center;white-space:nowrap}'+
      '.brhd-cta .btn-lime{background:var(--lime);color:#14301f;border:none;box-shadow:0 6px 18px rgba(0,0,0,.18)}.brhd-cta .btn-lime:hover{background:#a3cc2f}'+
      '.brhd-cta .brhd-sec{background:none;border:none;color:#fff;font-family:var(--fh);font-weight:600;font-size:.88rem;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:4px}'+
      '.brhd-meta{font-size:.78rem;color:rgba(255,255,255,.75);text-align:center}'+
      '.rcard .brhd-rc{margin-top:14px;display:inline-flex;align-items:center;justify-content:center;gap:.4rem;font-family:var(--fh);font-weight:600;font-size:.85rem;color:var(--green);background:var(--mint);border:1px solid transparent;border-radius:999px;padding:.6rem 1rem;cursor:pointer;transition:.15s}'+
      '.rcard .brhd-rc:hover{background:var(--green);color:#fff}.rcard .brhd-rc svg{width:15px;height:15px}'+
      '.brhd-intro-cta{margin-top:16px}'+
      '.brhd-sticky{position:fixed;left:24px;bottom:24px;z-index:79;display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--line-2);border-radius:999px;padding:8px 8px 8px 18px;box-shadow:0 12px 30px rgba(20,48,31,.18);transform:translateY(140%);opacity:0;transition:transform .3s ease,opacity .3s ease;max-width:calc(100vw - 48px)}'+
      '.brhd-sticky.show{transform:none;opacity:1}'+
      '.brhd-sticky .s{font-size:.85rem;color:var(--slate);line-height:1.25}.brhd-sticky .s b{display:block;font-family:var(--fh);color:var(--green);font-size:.92rem}'+
      '.brhd-sticky .btn{padding:.75rem 1.2rem;white-space:nowrap}'+
      '@media(max-width:960px){.brhd-band{grid-template-columns:1fr;padding:26px 24px;gap:18px}.brhd-ic{display:none}.brhd-cta{align-items:stretch}}'+
      '@media(max-width:640px){.brhd-sticky{left:12px;bottom:12px;padding:6px 6px 6px 14px}.brhd-sticky .s{display:none}.brhd-sticky{padding:6px}}'
    );

    var ans = function(id){ try{ return state.answers[id]; }catch(e){ return undefined; } };
    function recommendedNeeds(){
      var n = [];
      if((ans('q1')||0) < 2) n.push('sante');
      if((ans('q2')||0) < 2) n.push('retraite');
      if((ans('q3')||0) < 2 || (ans('q4')||0) < 2) n.push('epargne');
      if((ans('q6')||0) < 2 || (ans('q7')||0) < 2 || (ans('q8')||0) < 2) n.push('avantages');
      if(!n.length){ /* politique déjà complète : on propose d'optimiser l'axe le plus faible */
        var ax = ['attirer','fideliser','pouvoir'].sort(function(a,b){ return (state.axisScores[a]||0)-(state.axisScores[b]||0); })[0];
        n = AXIS_NEEDS[ax].slice(0,1);
      }
      return n;
    }
    function handoffData(needs){
      var lvl = {label:''}; try{ lvl = levelFor(state.score); }catch(e){}
      return { needs: needs, effectif: parseInt(ans('effectif')||0,10)||0, secteur: ans('secteur')||'',
               score: state.score, level: lvl.label, lead: state.lead || null };
    }
    window.BRH_goDevis = function(needs){
      needs = (needs && needs.length) ? needs : recommendedNeeds();
      try{ track('cta_devis_from_label',{score:state.score, needs:needs.join(',')}); }catch(e){}
      var d = handoffData(needs);   /* devis en ligne commun (S, A, B) : solutions, effectif et secteur passés dans l'adresse */
      BRH.go('devis.html?from=label&sol=' + encodeURIComponent(needs.join(',')) + (d.effectif ? '&eff=' + d.effectif : '') + (d.secteur ? '&secteur=' + encodeURIComponent(d.secteur) : ''));
    };

    var band = null, sticky = null;
    function ensureBand(){
      var results = document.getElementById('results');
      if(!results) return;
      if(!band){
        band = document.createElement('div');
        band.className = 'brhd-band'; band.id = 'devis-cta';
        var first = results.querySelector('.simcard');
        if(first && first.nextSibling) results.insertBefore(band, first.nextSibling); else results.insertBefore(band, results.firstChild);
      }
      var needs = recommendedNeeds(), eff = parseInt(ans('effectif')||0,10)||0, big = eff > 50;
      band.innerHTML =
        '<span class="brhd-ic">'+CALC+'</span>'+
        '<div style="position:relative;z-index:1">'+
          '<span class="brhd-tag">Étape suivante · 2 minutes</span>'+
          '<h3>'+(big ? 'Recevez votre proposition chiffrée sur mesure' : 'Transformez votre score en devis en ligne')+'</h3>'+
          '<p>'+(big
            ? 'Nous avons présélectionné les solutions qui répondent à vos leviers prioritaires. Au-delà de 50 salariés, un expert de votre Caisse régionale finalise votre proposition.'
            : 'Nous avons présélectionné les solutions qui répondent à vos leviers prioritaires : vérifiez quelques hypothèses et obtenez votre devis immédiatement.')+'</p>'+
          '<div class="brhd-chips">'+needs.map(function(id){ return '<span>'+NEED_LABEL[id]+'</span>'; }).join('')+'</div>'+
        '</div>'+
        '<div class="brhd-cta">'+
          '<button class="btn btn-lime btn-lg" onclick="BRH_goDevis()">'+(big?'Obtenir ma proposition':'Obtenir mon devis')+' '+ARROW+'</button>'+
          '<button class="brhd-sec" onclick="goToContact()">Je préfère échanger avec un expert</button>'+
          '<span class="brhd-meta">Sans engagement · vos réponses sont reprises</span>'+
        '</div>';

      /* CTA sur chaque levier prioritaire */
      var ranked = ['attirer','fideliser','pouvoir'].slice().sort(function(a,b){ return (state.axisScores[a]||0)-(state.axisScores[b]||0); });
      var cards = document.querySelectorAll('#rec-cards .rcard');
      Array.prototype.forEach.call(cards, function(card, i){
        var ax = ranked[i]; if(!ax || card.querySelector('.brhd-rc')) return;
        var nd = AXIS_NEEDS[ax].filter(function(x){ return x !== 'retraite' || (ans('q2')||0) < 2; });
        var b = document.createElement('button');
        b.className = 'brhd-rc'; b.type = 'button';
        b.innerHTML = 'Chiffrer cette solution '+ARROW;
        b.onclick = function(){ BRH_goDevis(nd); };
        card.appendChild(b);
      });
      var intro = document.querySelector('.rec-intro');
      if(intro && !intro.querySelector('.brhd-intro-cta')){
        var ib = document.createElement('button');
        ib.className = 'btn btn-primary brhd-intro-cta'; ib.type = 'button';
        ib.innerHTML = 'Chiffrer mes leviers '+ARROW;
        ib.onclick = function(){ BRH_goDevis(); };
        intro.appendChild(ib);
      }
      /* bouton devis à côté du lien « avantages fiscaux » */
      var fisc = document.querySelector('#avantages-fiscaux .btn-primary');
      if(fisc && !document.getElementById('brhdFiscCta')){
        var fb = document.createElement('button');
        fb.id = 'brhdFiscCta'; fb.type = 'button'; fb.className = 'btn btn-outline';
        fb.style.marginLeft = '10px'; fb.style.marginTop = '2px';
        fb.innerHTML = 'Chiffrer mes avantages '+ARROW;
        fb.onclick = function(){ BRH_goDevis(); };
        fisc.parentNode.insertBefore(fb, fisc.nextSibling);
      }
      ensureSticky(big);
    }
    function ensureSticky(big){
      if(!sticky){
        sticky = document.createElement('div');
        sticky.className = 'brhd-sticky'; sticky.setAttribute('role','region'); sticky.setAttribute('aria-label','Accès rapide au devis');
        document.body.appendChild(sticky);
        var onScroll = function(){
          var r = document.getElementById('results');
          if(!r || r.classList.contains('hidden') || !band){ sticky.classList.remove('show'); return; }
          var b = band.getBoundingClientRect(), rr = r.getBoundingClientRect(), vh = window.innerHeight;
          var bandVisible = b.bottom > 0 && b.top < vh;
          var inResults = rr.top < vh * .6 && rr.bottom > 0;
          var c = document.getElementById('contact'), cr = c ? c.getBoundingClientRect() : null;
          var atContact = cr && cr.top < vh * .7;
          sticky.classList.toggle('show', !bandVisible && (inResults || (!atContact && b.bottom < 0)));
        };
        window.addEventListener('scroll', onScroll, {passive:true});
        window.addEventListener('resize', onScroll);
        setTimeout(onScroll, 50);
      }
      sticky.innerHTML = '<span class="s"><b>Score '+state.score+'/100</b>Votre devis en 2 minutes</span>'+
        '<button class="btn btn-primary" onclick="BRH_goDevis()">'+(big?'Ma proposition':'Obtenir mon devis')+' '+ARROW+'</button>';
    }

    var origRender = window.renderResults;
    window.renderResults = function(){ origRender.apply(this, arguments); try{ ensureBand(); }catch(e){ console.error(e); } };
    /* bouton devis dans le menu du diagnostic, une fois les résultats affichés */
  }
})();

/* ===== 3. Assistant : profil d'entreprise issu du Label BRH (conseil personnalisé) =====
   Uniquement des données d'entreprise (effectif, secteur, priorités déduites des réponses), jamais de coordonnées.
   Une réponse faible au Label donne une priorité forte (échelle 1 à 4 du socle). */
(function(){
  if (BRH.page !== 'label-brh.html' || typeof window.renderResults !== 'function') return;
  var prio = function(pct){ return pct >= 100 ? 1 : pct >= 67 ? 2 : pct >= 34 ? 3 : 4; };
  var rendu = window.renderResults;
  window.renderResults = function(){
    rendu.apply(this, arguments);
    try{
      var a = state.answers || {}, ax = state.axisScores || {};
      var p = JSON.parse(sessionStorage.getItem('brhProfil') || '{}');
      sessionStorage.setItem('brhProfil', JSON.stringify(Object.assign(p, {
        source:'label', effectif:parseInt(a.effectif, 10) || null, effectifSaisi:!!a.effectif, secteur:a.secteur || '',
        priorites:{ protection:prio((a.q1 || 0) * 50), retraite:prio((a.q2 || 0) * 50), partageValeur:prio(ax.fideliser || 0), pouvoirAchat:prio(ax.pouvoir || 0) },
        labelBrh:{ score:state.score }, maj:new Date().toISOString() })));
    }catch(e){}
  };
})();
