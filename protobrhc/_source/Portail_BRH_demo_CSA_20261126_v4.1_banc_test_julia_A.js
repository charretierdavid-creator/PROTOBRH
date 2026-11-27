/* V4.1 : site A seulement (le site B a Julia en fenêtre flottante, voir _v4.1_banc_test_julia_B.js).
   Banc de test automatique (version _test uniquement) : enchaîne les pages, clique comme un utilisateur
   et affiche le rapport par-dessus la démo. */
(function(){
  const R=[]; let n=0;
  const box=document.createElement('div');
  box.style.cssText='position:fixed;z-index:99;left:8px;right:8px;top:8px;max-height:96vh;overflow:auto;background:#fff;border:3px solid #065145;border-radius:10px;padding:10px 12px;font:12px/1.35 system-ui;color:#233029;box-shadow:0 10px 30px rgba(0,0,0,.3)';
  box.innerHTML='<b>Banc de test Julia — en cours…</b>';
  document.body.appendChild(box);
  const errs=[];
  function ok(nom,c,det){ R.push([nom,!!c,det||'']); peindre(); }
  function peindre(){ const ko=R.filter(r=>!r[1]).length;
    box.innerHTML='<b>Banc de test Julia : '+R.length+' contrôles, '+(R.length-ko)+' OK, '+ko+' KO'+(fini?' — terminé':' — en cours…')+'</b>'+
    (errs.length?'<div style="color:#b00020">Erreurs JS : '+errs.slice(0,4).join(' | ')+'</div>':'<div>Erreurs JS : aucune</div>')+
    (()=>{ const pg={}; R.forEach(r=>{ const k=r[0].split(' : ')[0]; pg[k]=pg[k]||[0,0]; pg[k][r[1]?0:1]++; }); return '<div>'+Object.keys(pg).map(k=>k+' '+pg[k][0]+'/'+(pg[k][0]+pg[k][1])).join(' · ')+'</div>'; })()+
    '<ol style="margin:4px 0 0 18px;padding:0">'+R.filter(r=>!r[1]).map(r=>'<li style="color:#b00020">KO '+r[0]+(r[2]?' <i>('+r[2]+')</i>':'')+'</li>').join('')+'</ol>'; }
  let fini=false;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const fr=document.getElementById('app');
  function ouvrir(h){ return new Promise(res=>{ const f=()=>{ fr.removeEventListener('load',f); const w=fr.contentWindow; try{ w.addEventListener('error',e=>errs.push(h+' : '+e.message)); }catch(e){} setTimeout(res,1600); }; fr.addEventListener('load',f); if(location.hash==='#/'+h) load(); else location.hash='#/'+h; }); }
  const W=()=>fr.contentWindow, Dc=()=>fr.contentWindow.document;
  const vis=el=>!!el && W().getComputedStyle(el).display!=='none' && el.getClientRects().length>0;
  const clic=el=>el && el.dispatchEvent(new (W().MouseEvent)('click',{bubbles:true,cancelable:true}));
  async function rubrique(p){
    const j=Dc().getElementById('julia'); ok(p+' : rubrique Julia présente',!!j);
    const x=j && j.querySelector('.jf-x[data-jf="rubrique"]'); ok(p+' : bouton « Fermer » en haut à droite de la rubrique',!!x && vis(x), x?('à '+Math.round(j.getBoundingClientRect().right-x.getBoundingClientRect().right)+' px du bord droit'):'');
    clic(x); await wait(300);
    ok(p+' : rubrique fermée après clic',!vis(j));
    const fab=Dc().getElementById('julia-fab'); ok(p+' : bouton flottant « Julia » visible pour la rouvrir',vis(fab));
    clic(fab); await wait(500); ok(p+' : rubrique rouverte par le bouton « Julia »',vis(Dc().getElementById('julia')));
  }
  async function reponse(p){
    const chip=Dc().querySelector('#julia-ex .julia-chip'); clic(chip); await wait(2200);
    const rep=Dc().querySelector('#julia-fil .julia-rep'); ok(p+' : réponse de Julia affichée',!!rep, chip?chip.textContent.slice(0,40):'pas d’exemple');
    const e=rep && rep.querySelector('.julia-q [data-fermer]'); ok(p+' : « Effacer » sur la réponse',!!e && vis(e));
    if(e && rep){ const q=rep.querySelector('.julia-q').getBoundingClientRect(), b=e.getBoundingClientRect(); ok(p+' : « Effacer » en haut à droite de la réponse', b.right>q.right-40 && b.top<q.bottom); }
    const avant=Dc().querySelectorAll('#julia-fil .julia-rep').length; clic(e); await wait(300);
    ok(p+' : réponse effacée',Dc().querySelectorAll('#julia-fil .julia-rep').length===avant-1);
  }
  async function encart(p){
    let st=null, why='';
    try{ const sc=Dc().createElement('script'); sc.text='try{ window.__st = (typeof state!=="undefined") ? state : null; }catch(e){ window.__st=null; window.__stErr=String(e); }'; Dc().body.appendChild(sc); st=W().__st; why=W().__stErr||''; }catch(e){ why=String(e); }
    if(!st){ ok(p+' : encart sous les résultats (état de la page introuvable)',false,why); return; }
    const res=Dc().getElementById('results'), cache=res && res.classList.contains('hidden'); if(cache) res.classList.remove('hidden');   /* Label RH : bloc des résultats visible comme en fin d'évaluation */
    st.resultsUnlocked=true; await wait(1500);
    const jr=Dc().querySelector('.jr'); ok(p+' : encart Julia sous les résultats affiché',vis(jr));
    const x=jr && jr.querySelector('.jf-x'); ok(p+' : « × » en haut à droite de l’encart',!!x && vis(x));
    clic(x); await wait(1500); ok(p+' : encart fermé et resté fermé (1,5 s après)',!vis(Dc().querySelector('.jr')));
    st.resultsUnlocked=false; if(cache) res.classList.add('hidden');
  }
  (async()=>{
    try{
      await ouvrir('A/accueil-4-besoins.html'); await rubrique('Home A'); await reponse('Home A');
      await ouvrir('A/diagnostic.html'); await rubrique('Diagnostic'); await reponse('Diagnostic'); await encart('Diagnostic');
      await ouvrir('A/devis.html'); await rubrique('Devis'); await reponse('Devis');
      await ouvrir('A/ressources.html'); await rubrique('Ressources'); await reponse('Ressources');
      await ouvrir('A/newsletter-edition.html'); await rubrique('Newsletter');
      await ouvrir('A/avantages-fiscaux.html'); await rubrique('Avantages fiscaux');
      await ouvrir('A/audit-mutuelle.html'); await rubrique('Audit mutuelle');
      /* fermeture gardée de page en page, puis rouverture */
      clic(Dc().querySelector('.jf-x[data-jf="rubrique"]')); await wait(300);
      await ouvrir('A/accueil-4-besoins.html');
      ok('Home A (retour) : Julia reste fermée après changement de page',!vis(Dc().getElementById('julia')));
      ok('Home A (retour) : bouton « Julia » visible',vis(Dc().getElementById('julia-fab')));
      clic(Dc().getElementById('julia-fab')); await wait(500); ok('Home A (retour) : rouverte',vis(Dc().getElementById('julia')));
      await ouvrir('A/ressources.html'); ok('Ressources : Julia de nouveau ouverte de page en page',vis(Dc().getElementById('julia')));
    }catch(e){ ok('exception du banc : '+e.message,false); }
    fini=true; peindre(); document.title='TEST FINI';
    /* vue finale pour la capture : Label RH, une réponse de Julia et l'encart sous les résultats */
    try{ await ouvrir('A/diagnostic.html'); clic(Dc().querySelector('#julia-ex .julia-chip')); await wait(1800);
      const res=Dc().getElementById('results'); if(res) res.classList.remove('hidden');
      const sc=Dc().createElement('script'); sc.text='state.resultsUnlocked=true;'; Dc().body.appendChild(sc); await wait(1400);
      Dc().getElementById('julia').scrollIntoView({block:'start'}); box.style.top='auto'; box.style.bottom='8px'; box.style.maxHeight='90px'; }catch(e){}
  })();
})();
