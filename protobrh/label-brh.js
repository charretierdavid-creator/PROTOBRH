/* ==============================================================
   LABEL BRH ET PAGES DU SITE B — navigation, passerelle Label BRH → devis, devis consultable
   Chargé en fin de page par label-brh.html (sites S, A et B) et par les pages propres à la version B (protobrhb/).
   Le devis ouvert depuis le Label BRH est la simulation sur B (window.BRH_CBOT_DEVIS = 'simulation.html',
   résultats repris par la session), et devis.html ailleurs (solutions, effectif et secteur passés dans l'adresse).
   L'assistant est le widget commun du socle (chatbot-widget.js), relié à Mistral par chatbot.php.
   Après modification : changer le numéro ?v=AAAAMMJJ dans les pages qui le chargent.
   ============================================================== */
/* ===== 1. Navigation et contexte de page ===== */
(function(){
  var page = window.__PAGE || location.pathname.split('/').pop() || 'index.html';   /* __PAGE : version hors ligne */
  var handoff = null; try{ handoff = JSON.parse(sessionStorage.getItem('brhLabel') || 'null'); }catch(e){}
  window.__BRH_CTX = { page:page, anchor:location.hash.slice(1), handoff:handoff };
  window.BRH = {
    page: page,
    /* lien interne : même page = défilement vers l'ancre, autre page = navigation */
    go: function(url){
      url = String(url || ''); var p = url.split('#'), file = p[0], anchor = p[1] || '';
      if (!file || file === page) { var el = anchor && document.getElementById(anchor); if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); else window.scrollTo({top:0, behavior:'smooth'}); return; }
      if (typeof window.__go === 'function') { window.__go(url); return; }   /* version hors ligne */
      location.href = url;
    },
    /* résultats du Label BRH repris par la simulation (conservés le temps de la session) */
    handoff: function(d){ try{ sessionStorage.setItem('brhLabel', JSON.stringify(d || null)); }catch(e){} }
  };
  /* la version du prototype (D104) est jointe à chaque demande transmise */
  var natif = window.fetch;
  if (natif) window.fetch = function(input, init){
    try{
      if (typeof input === 'string' && /traitement_\w+\.php/.test(input) && init && typeof init.body === 'string') {
        var b = JSON.parse(init.body); if (b && typeof b === 'object' && !b.variante) { b.variante = window.BRH_VARIANTE || 'B'; init.body = JSON.stringify(b); }
      }
    }catch(e){}
    return natif.apply(this, arguments);
  };
})();

/* ===== 2. Simulation du site B : devis consultable et imprimable ===== */
(function(){
  /* ---------- 2. Simulation : devis consultable et imprimable ---------- */
  if(window.BRH && window.BRH.page === 'simulation.html' && typeof window.submitDevis === 'function'){
    var css = document.createElement('style');
    css.textContent =
      '.brhq-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:22px}'+
      '.brhq-ov{position:fixed;inset:0;z-index:200;background:rgba(18,32,27,.55);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:32px 16px}'+
      '.brhq-ov.open{display:flex}'+
      '.brhq{background:#fff;width:100%;max-width:820px;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.25);padding:40px 44px;color:var(--ink);font-family:var(--fb);position:relative}'+
      '.brhq-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid var(--green);padding-bottom:18px;margin-bottom:22px}'+
      '.brhq-top img{height:46px;width:auto}'+
      '.brhq-ref{text-align:right;font-size:.82rem;color:var(--slate);line-height:1.6}'+
      '.brhq-ref b{display:block;font-family:var(--fh);font-size:1.3rem;color:var(--green);letter-spacing:.02em}'+
      '.brhq h2{font-family:var(--fh);font-size:1.05rem;color:var(--green);margin:24px 0 10px;text-transform:uppercase;letter-spacing:.05em}'+
      '.brhq-parties{display:grid;grid-template-columns:1fr 1fr;gap:18px}'+
      '.brhq-box{background:var(--mint-2);border-radius:12px;padding:14px 16px;font-size:.88rem;line-height:1.6}'+
      '.brhq-box .l{font-family:var(--fh);font-weight:600;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--slate);display:block;margin-bottom:4px}'+
      '.brhq table{width:100%;border-collapse:collapse;font-size:.88rem}'+
      '.brhq th{text-align:left;font-family:var(--fh);font-weight:600;font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:#fff;background:var(--green);padding:10px 12px}'+
      '.brhq th:last-child,.brhq td:last-child{text-align:right;white-space:nowrap}'+
      '.brhq td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}'+
      '.brhq td small{display:block;color:var(--slate);font-size:.78rem;margin-top:2px}'+
      '.brhq tfoot td{font-family:var(--fh);font-weight:700;color:var(--green);font-size:1rem;border-bottom:none;background:var(--mint)}'+
      '.brhq-tw{overflow-x:auto;-webkit-overflow-scrolling:touch}.brhq .st{white-space:nowrap;display:inline-block;font-family:var(--fh);font-weight:700;font-size:.64rem;letter-spacing:.04em;border-radius:999px;padding:.2rem .55rem}'+
      '.brhq .st.on{background:var(--mint);color:var(--green)}.brhq .st.ex{background:#fdf1e4;color:#9a5a12}'+
      '.brhq-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}'+
      '.brhq-kpi{border:1px solid var(--line-2);border-radius:12px;padding:12px 14px}'+
      '.brhq-kpi b{display:block;font-family:var(--fh);font-size:1.15rem;color:var(--green)}.brhq-kpi span{font-size:.78rem;color:var(--slate)}'+
      '.brhq-legal{font-size:.74rem;color:var(--slate);line-height:1.55;margin-top:22px;border-top:1px solid var(--line);padding-top:14px}'+
      '.brhq-bar{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-bottom:18px;padding-right:46px}'+
      '.brhq-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;border:1px solid var(--line-2);background:#fff;cursor:pointer;font-size:20px;line-height:1;color:var(--slate)}'+
      '@media(max-width:640px){.brhq{padding:26px 20px}.brhq table{font-size:.8rem}.brhq th,.brhq td{padding:9px 8px}.brhq table{min-width:560px}.brhq-parties,.brhq-kpis{grid-template-columns:1fr}.brhq-top{flex-direction:column}.brhq-ref{text-align:left}}'+
      '@media print{body>*:not(.brhq-ov){display:none!important}.brhq-ov{position:static;display:block!important;background:none;padding:0;overflow:visible}'+
      '.brhq{box-shadow:none;border-radius:0;max-width:none;padding:0}.brhq-bar,.brhq-x{display:none!important}'+
      '.brhq th,.brhq tfoot td,.brhq-box,.brhq .st{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:16mm}}';
    document.head.appendChild(css);

    var ov = document.createElement('div');
    ov.className = 'brhq-ov'; ov.id = 'brhQuote';
    ov.addEventListener('click', function(e){ if(e.target === ov) closeQ(); });
    document.body.appendChild(ov);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeQ(); });

    var lastDevis = null;
    function esc2(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function eur(v){ try{ return fmtEur(v); }catch(e){ return Math.round(v)+' €'; } }
    function closeQ(){ ov.classList.remove('open'); }
    function openQ(){
      if(!lastDevis) return;
      var d = lastDevis, logo = document.querySelector('img[alt^="Banque des Ressources"]');
      var rows = '', total = 0;
      d.needs.forEach(function(id){
        var need = (NEEDS.filter(function(x){return x.id===id;})[0])||{title:id};
        var e = d.estimations[id] || {cout:0, detail:[]};
        var online = !(id==='sante'||id==='retraite');
        total += e.cout||0;
        rows += '<tr><td><b>'+esc2(need.title)+'</b>'+(need.partners?'<small>'+esc2(need.partners.join(' · '))+'</small>':'')+'</td>'+
                '<td>'+(e.detail||[]).slice(0,2).map(esc2).join('<br>')+'</td>'+
                '<td><span class="st '+(online?'on':'ex')+'">'+(online?'DEVIS EN LIGNE':'SUR DEVIS')+'</span></td>'+
                '<td>'+eur(e.cout||0)+' / an</td></tr>';
      });
      var n = d.concernes || 0;
      var gain = n ? d.totalGainTotal / n : 0;
      var econ = 0; try{ econ = Math.max(0, Math.round(d.totalGainTotal*ECONOMY_MULTIPLIER) - d.totalCout); }catch(e){}
      var c = d.company, p = d.contact;
      ov.innerHTML =
        '<div class="brhq" role="dialog" aria-label="Votre devis">'+
        '<button class="brhq-x" aria-label="Fermer" onclick="document.getElementById(\'brhQuote\').classList.remove(\'open\')">×</button>'+
        '<div class="brhq-bar"><button class="btn btn-outline" onclick="document.getElementById(\'brhQuote\').classList.remove(\'open\')">Fermer</button>'+
        '<button class="btn btn-primary" onclick="window.print()">Imprimer / enregistrer en PDF</button></div>'+
        '<div class="brhq-top">'+(logo?'<img src="'+logo.src+'" alt="Banque des Ressources Humaines">':'<b>Banque des Ressources Humaines</b>')+
        '<div class="brhq-ref"><b>DEVIS</b>Réf. '+esc2(d.ref)+'<br>Émis le '+esc2(d.date)+'<br>Valable 30 jours, jusqu\'au '+esc2(d.validite)+'</div></div>'+
        '<div class="brhq-parties">'+
          '<div class="brhq-box"><span class="l">Entreprise</span><b>'+esc2(c.raison||'—')+'</b><br>'+(c.siret?'SIRET '+esc2(c.siret)+'<br>':'')+esc2((c.ville||'')+(c.cp?' ('+c.cp+')':''))+(c.naf?'<br>NAF '+esc2(c.naf):'')+'<br>'+n+' salarié'+(n>1?'s':'')+' concerné'+(n>1?'s':'')+'</div>'+
          '<div class="brhq-box"><span class="l">Interlocuteur</span><b>'+esc2(((p.prenom||'')+' '+(p.nom||'')).trim()||'—')+'</b><br>'+esc2(p.fonction||'')+'<br>'+esc2(p.email)+'<br>'+esc2(p.tel)+(p.rappel?'<br>Rappel expert demandé':'')+'</div>'+
        '</div>'+
        '<h2>Solutions retenues</h2>'+
        '<div class="brhq-tw"><table><thead><tr><th>Solution</th><th>Hypothèses</th><th>Statut</th><th>Coût employeur</th></tr></thead><tbody>'+rows+'</tbody>'+
        '<tfoot><tr><td colspan="3">Total estimé</td><td>'+eur(total)+' / an</td></tr></tfoot></table></div>'+
        '<div class="brhq-kpis">'+
          '<div class="brhq-kpi"><b>'+eur(total)+'</b><span>coût employeur total estimé / an</span></div>'+
          '<div class="brhq-kpi"><b>'+eur(gain)+'</b><span>gain net moyen par salarié / an</span></div>'+
          '<div class="brhq-kpi"><b>'+eur(econ)+'</b><span>économisés vs hausse de salaire équivalente</span></div>'+
        '</div>'+
        '<h2>Prochaines étapes</h2>'+
        '<div class="brhq-box">Un expert de votre Caisse régionale vous recontacte sous 24 h ouvrées pour valider ces hypothèses et finaliser votre devis. Les solutions marquées « sur devis » (santé-prévoyance, retraite collective) font l\'objet d\'une étude personnalisée.</div>'+
        '<div class="brhq-legal">Estimation indicative et non contractuelle, établie à partir des informations déclarées et des plafonds en vigueur (guide « Avantages salariés — Édition 2026 »). Les montants sont à confirmer avec un expert Banque des Ressources Humaines. Solutions distribuées par les Caisses régionales de Crédit Agricole et leurs filiales. Document généré localement — démonstration hors ligne.</div>'+
        '</div>';
      ov.classList.add('open'); ov.scrollTop = 0;
    }

    var origSubmit = window.submitDevis;
    window.submitDevis = function(){
      origSubmit.apply(this, arguments);
      var ok = document.getElementById('devisSuccess');
      if(!ok || ok.classList.contains('hidden')) return;
      var now = new Date(), val = new Date(now.getTime()+30*864e5);
      var pad = function(x){ return (x<10?'0':'')+x; };
      lastDevis = {
        ref: 'BRH-'+now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate())+'-'+String(Math.floor(1000+Math.random()*9000)),
        date: now.toLocaleDateString('fr-FR'), validite: val.toLocaleDateString('fr-FR'),
        company: JSON.parse(JSON.stringify(state.company)), needs: state.needs.slice(),
        estimations: JSON.parse(JSON.stringify(state.estimations)), totalCout: state.totalCout, totalGainTotal: state.totalGainTotal,
        concernes: parseInt((document.getElementById('s3-concernes')||{}).value||'0',10)||0,
        contact: {prenom:val2('d-prenom'), nom:val2('d-nom'), fonction:val2('d-fonction'), tel:val2('d-tel'), email:val2('d-email'), rappel:!!(document.getElementById('d-rappel')||{}).checked}
      };
      var h = ok.querySelector('h3'); if(h) h.textContent = 'Votre devis est prêt';
      if(!document.getElementById('brhqActions')){
        var act = document.createElement('div'); act.className = 'brhq-actions'; act.id = 'brhqActions';
        act.innerHTML = '<button class="btn btn-primary btn-lg" id="brhqOpen">Consulter mon devis</button>'+
                        '<a class="btn btn-outline btn-lg" href="index.html">Retour à l\'accueil</a>';
        ok.appendChild(act);
        document.getElementById('brhqOpen').addEventListener('click', openQ);
      }
      setTimeout(openQ, 700);
    };
    function val2(id){ var el = document.getElementById(id); return el ? String(el.value||'').trim() : ''; }
  }
})();

/* ===== 3. Passerelle Label BRH → simulation / devis ===== */
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
      var devis = window.BRH_CBOT_DEVIS || 'devis.html', d = handoffData(needs);
      if (devis === 'simulation.html') { BRH.handoff(d); BRH.go(devis); return; }   /* site B : simulation préremplie */
      BRH.go(devis + '?from=label&sol=' + encodeURIComponent(needs.join(',')) + (d.effectif ? '&eff=' + d.effectif : '') + (d.secteur ? '&secteur=' + encodeURIComponent(d.secteur) : ''));
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

  /* =================== 2. Simulation pré-remplie depuis le Label =================== */
  var H = (window.__BRH_CTX || {}).handoff;
  if(BRH.page === 'simulation.html' && H && typeof window.renderNeeds === 'function'){
    css('.brhs-note{display:flex;gap:14px;align-items:flex-start;background:var(--mint);border:1px solid #cfe3da;border-radius:14px;padding:14px 18px;margin:0 0 20px;font-size:.9rem;color:var(--ink);line-height:1.45}'+
        '.brhs-note .i{flex:0 0 auto;width:34px;height:34px;border-radius:50%;background:var(--green);display:grid;place-items:center}.brhs-note .i svg{width:18px;height:18px;color:#fff}'+
        '.brhs-note b{color:var(--green);font-family:var(--fh)}'+
        '.brhs-hint{color:var(--green)!important;font-weight:600}');
    var valid = (H.needs||[]).filter(function(id){ return NEEDS.some(function(n){ return n.id === id; }); });
    if(valid.length){ state.needs = valid.slice(); renderNeeds(); }
    var s1 = document.querySelector('#step-1 .block-head');
    if(s1){
      var note = document.createElement('div'); note.className = 'brhs-note';
      note.innerHTML = '<span class="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'+
        '<div><b>Repris de votre Label BRH'+(H.score!=null?' — score '+H.score+'/100'+(H.level?' · '+H.level:''):'')+'</b><br>'+
        'Nous avons présélectionné '+valid.length+' solution'+(valid.length>1?'s':'')+' correspondant à vos leviers prioritaires'+(H.effectif?' et repris votre effectif ('+H.effectif+' salariés)':'')+'. Vous pouvez ajuster la sélection puis continuer.</div>';
      s1.parentNode.insertBefore(note, s1.nextSibling);
    }
    /* effectif repris après la recherche SIRET ou la saisie manuelle */
    if(H.effectif && typeof window.fillCompanyCard === 'function'){
      var origFill = window.fillCompanyCard;
      window.fillCompanyCard = function(){
        state.company.effectif = H.effectif;
        origFill.apply(this, arguments);
        var hint = document.getElementById('ccEffHint');
        if(hint){ hint.textContent = 'Repris de votre Label BRH : '+H.effectif+' salariés. Modifiez si besoin.'; hint.classList.add('brhs-hint'); }
      };
      var conc = document.getElementById('s3-concernes');
      if(conc){ conc.value = Math.max(1, Math.min(H.effectif, (typeof SELF_SERVE_CAP!=='undefined'?SELF_SERVE_CAP:50))); }
    }
    /* coordonnées du devis reprises du Label */
    var L = H.lead;
    if(L){
      var set = function(id, v){ var el = document.getElementById(id); if(el && v && !el.value) el.value = v; };
      set('d-prenom', L.prenom); set('d-nom', L.nom); set('d-email', L.email);
      var f = document.getElementById('d-fonction'), p = String(L.poste||'').toLowerCase();
      if(f && p){
        var pick = /drh|ressources humaines|rh\b/.test(p) ? 'DRH' : /raf|financ|administratif|daf/.test(p) ? 'Responsable administratif et financier' : /dirig|g[ée]rant|pdg|ceo|pr[ée]sident|fondat|directeur g/.test(p) ? 'Dirigeant(e)' : 'Autre';
        Array.prototype.forEach.call(f.options, function(o){ if(o.text === pick) f.value = o.value || o.text; });
      }
    }
  }
})();

/* ===== 4. Assistant : profil d'entreprise issu du Label BRH (conseil personnalisé) =====
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
