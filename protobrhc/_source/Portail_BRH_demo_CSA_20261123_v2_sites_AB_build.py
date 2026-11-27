#!/usr/bin/env python3
"""Démo hors ligne Portail BRH — sous-sites A (Priorité 4 besoins) et B (Label RH).

Usage : python3 build_demo_ab.py <demo_source.html> <sortie.html> [hash_de_depart]

Les pages (PAGES), les modules (window.__BRH_MOD) et le SHIM d'origine sont repris tels quels.
Seuls le bandeau de démo (header #bar) et le script du shell sont réécrits :
  - plus de portail générique : la démo s'ouvre sur la home du site A, on est toujours dans le site A ou le site B ;
  - deux « homes » de sous-site, rendues à partir de index.html : accueil-4-besoins.html (A), accueil-label-rh.html (B) ;
  - header dédié au sous-site sur toutes les pages du sous-site (logo → home du sous-site, badge, menu) ;
  - « Mon dossier BRH » (mon-dossier.html) et aperçu des e-mails reçus : dossier_brh_demo.js, boite_mail_demo.js ;
  - fenêtres de Julia refermables partout (julia_fermer_demo.js, à côté de ce script) ;
  - le sous-site est mémorisé dans l'adresse (#/A/devis.html), il résiste au rechargement et au bouton Retour ;
  - liens internes gardés dans le sous-site : Accueil → home du sous-site ; en A le Label RH mène au diagnostic,
    en B le diagnostic mène au Label RH.
hash_de_depart (facultatif, pour les tests) : page ouverte si l'adresse n'en indique pas.
"""
import sys, json, base64, re

src_path, out_path = sys.argv[1], sys.argv[2]
start_hash = sys.argv[3] if len(sys.argv) > 3 else ''
s = open(src_path, encoding='utf-8').read()
L = s.split('\n')

# ---------- repérage des lignes à conserver ----------
i_pages = next(i for i, l in enumerate(L) if l.startswith('const PAGES='))
i_mod = next(i for i, l in enumerate(L) if l.startswith('window.__BRH_MOD='))
i_shim = next(i for i, l in enumerate(L) if l.startswith('const SHIM='))
i_hdr0 = next(i for i, l in enumerate(L) if l.startswith('<header id="bar">'))
i_hdr1 = next(i for i in range(i_hdr0, len(L)) if L[i].startswith('</header>'))
i_end = next(i for i in range(i_shim, len(L)) if L[i].startswith('</script>'))

# contrôle : textes de index.html sur lesquels s'appuient les homes A et B
P = json.loads(L[i_pages][len('const PAGES='):].rstrip(';'))
idx = base64.b64decode(P['index.html']['h']).decode('utf-8')
main = idx[idx.index('<main id="page-home">'):idx.index('</main>')]
NEED = ["onclick=\"__go('diagnostic.html')\">Faire mon diagnostic RH",
        "<h2>Faites votre diagnostic RH en ligne</h2>",
        "<p>Répondez à quelques questions en quelques minutes pour identifier vos priorités : protection des salariés, pouvoir d'achat, partage de la valeur, retraite et avantages.</p>",
        "<p>Obtenez une première estimation des avantages fiscaux et sociaux associés.</p>",
        "<span>Je décris mon entreprise</span>", "<span>J'identifie mes enjeux</span>",
        "onclick=\"__go('diagnostic.html')\">Lancer le diagnostic",
        ">Diagnostic RH en ligne</a>",
        "titre:'Le Label RH : situez votre politique RH'",
        "texte:'Répondez à une dizaine de questions et comparez votre score à celui des autres entreprises répondantes.'",
        "bouton:'Passer le Label RH', lien:'label-brh.html'",
        '<div class="d-cta">']
for n in NEED:
    assert n in main, 'texte introuvable dans index.html : ' + n
assert re.search(r'<button class="btn btn-outline btn-lg" onclick="__go\(\'diagnostic\.html#contact\'\)">Être recontacté[\s\S]*?</button>', main)
assert 'window.BRH_ACCUEIL_C = ACCUEIL;' in idx

HEADER = r'''<header id="bar">
  <button class="brand" id="home" type="button" aria-label="Retour à l'accueil du site en cours">
    <span class="logo">BRH</span>
    <span class="bt"><b>Portail Banque des RH</b><span>Démo du parcours dirigeant</span></span>
  </button>
  <nav id="choix" aria-label="Choix de l'approche">
    <span class="lib">Choisissez votre approche</span>
    <div class="seg" role="group">
      <button type="button" data-s="A" aria-pressed="false">Priorité 4 besoins <i>site A</i></button>
      <button type="button" data-s="B" aria-pressed="false">Label RH <i>site B</i></button>
    </div>
    <button type="button" id="dosBtn" aria-pressed="false" title="Mon dossier BRH : retrouver mes réponses et reprendre mon parcours"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg><span class="dl1">Mon dossier</span><span class="dl2">&nbsp;BRH</span></button>
  </nav>
  <div id="droite">
    <span id="etape" aria-live="polite"></span>
    <button id="mail" type="button" hidden><span aria-hidden="true">✉</span> <span class="ml-lib">E-mail reçu</span> <i>1</i></button>
    <span id="tag" title="Démonstration hors ligne : données fictives, aucun envoi, réponses de Julia simulées">Démo · données fictives</span>
    <button id="reset" type="button">Recommencer</button>
  </div>
</header>
<div id="boite" hidden role="dialog" aria-modal="true" aria-label="Aperçu de l'e-mail reçu (démo)">
  <div class="ml-p">
    <div class="ml-top"><b>Boîte de réception du dirigeant</b> <span>· aperçu de démonstration, aucun e-mail n'est envoyé</span><button class="ml-x" type="button" aria-label="Fermer">×</button></div>
    <div class="ml-in"><div class="ml-l"></div><div class="ml-m"><div class="ml-h"></div><div class="ml-c"></div></div></div>
  </div>
</div>
<style>
#dosBtn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:999px;font-size:14px;font-weight:600;color:#fff;border:1px solid rgba(255,255,255,.35);white-space:nowrap;transition:background .15s,color .15s}
#dosBtn svg{width:16px;height:16px;flex:0 0 auto}#dosBtn:hover{background:rgba(255,255,255,.14)}#dosBtn:focus-visible{outline:3px solid var(--lime);outline-offset:2px}
#dosBtn.on{background:#fff;color:var(--pin);box-shadow:0 2px 8px rgba(0,0,0,.15)}
@media(max-width:1180px){#dosBtn .dl2{display:none}}@media(max-width:520px){#dosBtn{padding:8px 11px;font-size:13px}}@media(max-width:430px){#dosBtn .dl1{display:none}}
#mail{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:6px 12px;white-space:nowrap}
#mail[hidden]{display:none}#mail:hover{background:rgba(255,255,255,.12)}#mail:focus-visible{outline:3px solid var(--lime);outline-offset:2px}
#mail i{font-style:normal;font-size:11px;font-weight:700;background:rgba(255,255,255,.2);border-radius:999px;padding:1px 7px}
#mail.neuf{background:#fff;color:var(--pin)}#mail.neuf i{background:var(--lime);color:#0d3a2f}
#mail.pulse{animation:mlp 1.2s ease 2}@keyframes mlp{50%{box-shadow:0 0 0 6px rgba(143,184,34,.45)}}
#boite{position:fixed;inset:0;z-index:50;background:rgba(6,40,34,.45);display:flex;align-items:flex-start;justify-content:center;padding:calc(var(--hb) + 14px) 14px 14px;overflow:auto}
#boite[hidden]{display:none}
#boite .ml-p{background:#fff;border-radius:14px;max-width:860px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.3);overflow:hidden;font-size:14px;color:#233029}
#boite .ml-top{display:flex;align-items:center;gap:6px;padding:10px 14px;background:#f6f8f7;border-bottom:1px solid #e7ece9;font-size:13px}
#boite .ml-top span{color:#5c6b64}#boite .ml-x{all:unset;cursor:pointer;margin-left:auto;font-size:22px;line-height:1;color:#5c6b64;padding:0 6px}
#boite .ml-in{display:grid;grid-template-columns:220px 1fr}
#boite .ml-l{border-right:1px solid #e7ece9;display:flex;flex-direction:column}
#boite .ml-it{all:unset;cursor:pointer;padding:10px 12px;border-bottom:1px solid #e7ece9;font-size:12px;line-height:1.35}#boite .ml-it b{display:block;font-weight:600}
#boite .ml-it span{color:#5c6b64}#boite .ml-it.on{background:#eef4ef}
#boite .ml-h{padding:14px 20px;border-bottom:1px solid #e7ece9;font-size:12.5px;color:#5c6b64;display:grid;gap:3px}#boite .ml-h span{display:inline-block;width:24px}
#boite .ml-o{font-size:17px;font-weight:700;color:#065145;margin-top:6px}
#boite .ml-c{padding:18px 20px 22px;line-height:1.55;max-width:600px}#boite .ml-c p{margin:0 0 12px}
#boite .ml-res{background:#eef4ef;border-radius:10px;padding:10px 14px 10px 30px;margin:0 0 14px}
#boite .ml-cta a{display:inline-block;background:#065145;color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:11px 20px}
#boite .ml-pt{font-size:12px;color:#5c6b64}
@media(max-width:640px){#boite .ml-in{grid-template-columns:1fr}#boite .ml-l{border-right:0;border-bottom:1px solid #e7ece9}#mail .ml-lib{display:none}}
</style>'''

SHELL = r'''const STAMP="23/11/2026 · sous-sites A et B";
/* ====== SOUS-SITES (modifiable ici) ======
   home  : page d'accueil du sous-site (rendue à partir de index.html, textes ci-dessous)
   nav   : menu du header, sur toutes les pages du sous-site (« Audit mutuelle » reste hors du menu : décision du 15/11)
   remap : liens internes ramenés dans le sous-site */
const SITES={
  A:{ nom:'Priorité 4 besoins', badge:'Priorité 4 besoins', home:'accueil-4-besoins.html', entree:'diagnostic.html',
      nav:[['Nos offres','#offres',''],['Diagnostic RH','diagnostic.html','diagnostic.html'],['Devis en ligne','devis.html','devis.html'],
           ['Avantages fiscaux','avantages-fiscaux.html','avantages-fiscaux.html'],['Ressources','ressources.html','ressources.html'],
           ['Newsletter','newsletter-edition.html','newsletter-edition.html']],
      expert:'diagnostic.html#contact', remap:{'label-brh.html':'diagnostic.html'},
      /* accroche et texte du dessous : ceux de l'accueil de la version C (variante.js), identiques en A et en B (demande de David du 23/11) */
      accueil:{
        note:'Diagnostic en 3 étapes, puis devis en ligne. Un expert du Crédit Agricole vous accompagne.',
        besoins:'Nos offres, besoin par besoin' } },
  B:{ nom:'Label RH', badge:'Label RH', home:'accueil-label-rh.html', entree:'label-brh.html',
      nav:[['Nos offres','#offres',''],['Label RH','label-brh.html','label-brh.html'],['Devis en ligne','devis.html','devis.html'],
           ['Avantages fiscaux','avantages-fiscaux.html','avantages-fiscaux.html'],['Ressources','ressources.html','ressources.html'],
           ['Newsletter','newsletter-edition.html','newsletter-edition.html']],
      expert:'label-brh.html#contact', remap:{'diagnostic.html':'label-brh.html'},
      accueil:{
        note:'Un expert du Crédit Agricole vous accompagne à chaque étape.',
        besoins:'Nos offres' } }
};
const HOMES={}; Object.keys(SITES).forEach(k=>HOMES[SITES[k].home]=k);
const ICO_DEVIS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';
const BTN_DEVIS='<button class="btn btn-outline btn-lg" onclick="__go(\'devis.html\')">Devis en ligne '+ICO_DEVIS+'</button>';
const BAND_DEVIS='<button class="btn btn-lg ss-devis" onclick="__go(\'devis.html\')">Accéder au devis en ligne</button>';
/* textes de la home de chaque sous-site : [ancien, nouveau] ou [expression, nouveau] dans <main id="page-home"> */
const HOME_REPL={
  A:[ ["onclick=\"__go('diagnostic.html')\">Faire mon diagnostic RH","onclick=\"__go('diagnostic.html')\">Évaluer mes 4 besoins"],
      [/<button class="btn btn-outline btn-lg" onclick="__go\('diagnostic\.html#contact'\)">Être recontacté[\s\S]*?<\/button>/,BTN_DEVIS],
      ["<h2>Faites votre diagnostic RH en ligne</h2>","<h2>Vos 4 besoins RH, en 3 étapes</h2>"],
      ["<span>J'identifie mes enjeux</span>","<span>Je règle mes 4 priorités</span>"],
      ["titre:'Le Label RH : situez votre politique RH'","titre:'Vos 4 priorités RH en 3 étapes'"],
      ["texte:'Répondez à une dizaine de questions et comparez votre score à celui des autres entreprises répondantes.'","texte:'Indiquez l\\'importance de vos 4 besoins et découvrez les offres et les gains associés.'"],
      ["bouton:'Passer le Label RH', lien:'label-brh.html'","bouton:'Faire mon diagnostic', lien:'diagnostic.html'"],
      [/(<div class="d-cta">[\s\S]*?<\/button>)/,'$1'+BAND_DEVIS],
      ['label-brh.html','diagnostic.html'] ],
  B:[ ["onclick=\"__go('diagnostic.html')\">Faire mon diagnostic RH","onclick=\"__go('label-brh.html')\">Passer le Label RH"],
      [/<button class="btn btn-outline btn-lg" onclick="__go\('diagnostic\.html#contact'\)">Être recontacté[\s\S]*?<\/button>/,BTN_DEVIS],
      ["<h2>Faites votre diagnostic RH en ligne</h2>","<h2>Passez le Label RH</h2>"],
      ["<p>Répondez à quelques questions en quelques minutes pour identifier vos priorités : protection des salariés, pouvoir d'achat, partage de la valeur, retraite et avantages.</p>",
       "<p>Répondez à une dizaine de questions sur votre politique RH : partage de la valeur, protection sociale, retraite et avantages salariés.</p>"],
      ["<p>Obtenez une première estimation des avantages fiscaux et sociaux associés.</p>","<p>Obtenez votre score sur 100 et comparez-le à celui des autres entreprises répondantes.</p>"],
      ["<span>Je décris mon entreprise</span>","<span>Je réponds aux questions</span>"],
      ["<span>J'identifie mes enjeux</span>","<span>J'obtiens mon score sur 100</span>"],
      ["onclick=\"__go('diagnostic.html')\">Lancer le diagnostic","onclick=\"__go('label-brh.html')\">Passer le Label RH"],
      [">Diagnostic RH en ligne</a>",">Label RH</a>"],
      [/(<div class="d-cta">[\s\S]*?<\/button>)/,'$1'+BAND_DEVIS],
      ['diagnostic.html','label-brh.html'] ]
};
/* script ajouté dans chaque page d'un sous-site : header dédié (menu, logo → home du sous-site, badge) et textes de la home */
const SITE_JS="<script>\n(function(){\n var S=window.__SITE; if(!S) return;\n var P=window.__REAL_PAGE, H=window.__IS_HOME;\n"+
"  if(H){ var ac=function(){ if(window.BRH_ACCUEIL_C) Object.assign(window.BRH_ACCUEIL_C,S.accueil); }; ac(); document.addEventListener('DOMContentLoaded',ac); }\n"+
"  function lien(l,mob){ var h=l[1]; if(h==='#offres' && !H) h='index.html#offres'; var on=l[2] && l[2]===P;\n"+
"    return '<a href=\"'+h+'\"'+(on?' class=\"active\" aria-current=\"page\"':'')+(mob?' onclick=\"if(window.closeMenu)closeMenu()\"':'')+'>'+l[0]+'</a>'; }\n"+
"  function poser(){ var hd=document.querySelector('header.header'); if(!hd) return;\n"+
"    var nav=hd.querySelector('.nav'); if(nav) nav.innerHTML=S.nav.map(function(l){ return lien(l,false); }).join('');\n"+
"    var mm=hd.querySelector('.mobile-menu .wrap'); if(mm){ var cta=mm.querySelector('a.btn');   /* bouton « Parler à un expert » de la page conservé (le devis ouvre sa fenêtre expert) */\n"+
"      mm.innerHTML=S.nav.map(function(l){ return lien(l,true); }).join(''); if(cta) mm.appendChild(cta); else mm.insertAdjacentHTML('beforeend','<a class=\"btn btn-primary\" href=\"'+S.expert+'\">Parler à un expert</a>'); }\n"+
"    var br=hd.querySelector('a.brand'); if(br){ br.setAttribute('href',H?'#':'index.html'); if(H) br.onclick=function(e){ e.preventDefault(); scrollTo({top:0,behavior:'smooth'}); };\n"+
"      if(!hd.querySelector('.ss-badge')){ var b=document.createElement('span'); b.className='ss-badge'; b.textContent=S.badge; br.insertAdjacentElement('afterend',b); } }\n"+
"    hd.setAttribute('data-sous-site',S.id); }\n"+
"  var st=document.createElement('style'); st.textContent='.ss-badge{flex:0 0 auto;align-self:center;font-family:var(--fh,inherit);font-size:.72rem;font-weight:600;letter-spacing:.02em;color:var(--green,#065145);background:#fff;border:1px solid var(--line,#d9e4df);border-radius:999px;padding:.22rem .7rem;white-space:nowrap;margin-left:-.4rem}'+\n"+
"   '.diag .d-cta .btn.ss-devis{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.75);margin-top:10px;justify-content:center}.diag .d-cta .btn.ss-devis:hover{background:rgba(255,255,255,.12)}.diag .d-cta{display:flex;flex-direction:column;align-items:stretch}'+\n"+
"   '.mobile-menu a.btn-primary{color:#fff}.mobile-menu a.active{color:var(--green,#065145);font-weight:600}@media(max-width:600px){.ss-badge{display:none}}'+\n"+
"   /* header des sous-sites : 7 entrées + bouton tiennent sur une ligne de 1 241 px à 1 920 px (mesuré), menu burger en dessous ; badge seulement en mode burger */\n"+
"   '@media(min-width:1241px){.ss-badge{display:none}}header.header[data-sous-site] .nav{flex-wrap:nowrap}header.header[data-sous-site] .nav a{padding:.5rem .42rem;font-size:.86rem;white-space:nowrap}header.header[data-sous-site] .header-in{gap:1rem}header.header[data-sous-site] .header-in>.btn{padding:.7rem .95rem;font-size:.88rem;white-space:nowrap}@media(max-width:1240px){header.header[data-sous-site] .nav,header.header[data-sous-site] .header-in>.btn{display:none!important}header.header[data-sous-site] .burger{display:inline-flex!important}}';\n"+
"  document.head.appendChild(st);\n"+
"  document.addEventListener('DOMContentLoaded',poser); window.addEventListener('load',poser);\n})();\n<\/script>";

const JULIA_TAG='<script>'+%JULIA%+'<\/script>';
const DOSSIER_TAG='<script>'+%DOSSIER%+'<\/script>';   /* Mon dossier BRH : dossier_brh_demo.js */   /* fermer Julia partout : julia_fermer_demo.js */
const dosBtn=document.getElementById('dosBtn');   /* « Mon dossier BRH » dans le bandeau de démo, à droite du choix du site */
const frame=document.getElementById('app'), seg=document.querySelectorAll('.seg button'), etape=document.getElementById('etape');
const DEFAUT='A';   /* site ouvert par défaut : A, Priorité 4 besoins (demande de David du 23/11/2026) */
let site=DEFAUT;   /* sous-site en cours : 'A' ou 'B' — porté par l'adresse : #/A/devis.html */
function dec(b){ return new TextDecoder('utf-8').decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0))); }
function existe(p){ return !!(PAGES[p]||HOMES[p]||p==='mon-dossier.html'); }
function parse(h){ h=(h||'').replace(/^#\/?/,''); try{ h=decodeURIComponent(h); }catch(e){}
  let s=''; const m=/^([AB])\//.exec(h); if(m){ s=m[1]; h=h.slice(2); }
  let anchor='', qs=''; const ia=h.indexOf('#'); if(ia>=0){ anchor=h.slice(ia); h=h.slice(0,ia); }
  const iq=h.indexOf('?'); if(iq>=0){ qs=h.slice(iq); h=h.slice(0,iq); }
  h=h.replace(/^\.\//,'').split('/').pop(); if(!existe(h)) h='index.html';
  if(HOMES[h]) s=HOMES[h];
  return {site:s, page:h, qs, anchor}; }
const cache={};
const ETAPES={'mon-dossier.html':'Mon dossier BRH','index.html':'Découvrir','accueil-4-besoins.html':'Découvrir','accueil-label-rh.html':'Découvrir','diagnostic.html':'Évaluer · résultats · Julia','label-brh.html':'Évaluer · score · Julia','devis.html':'Devis en ligne'};
/* « Mon dossier BRH » : gabarit de l'accueil (header, styles, fenêtre « En savoir plus » des offres), contenu remplacé */
function dossierSrc(src){
  const i=src.indexOf('<main id="page-home">'), j=src.indexOf('</main>',i); if(i<0||j<0) return src;
  const m=src.slice(i,j), f=m.indexOf('<footer'), pied=f>=0?m.slice(f):'';
  return src.slice(0,i)+'<main id="page-dossier"><section class="sec dos-sec"><div class="wrap"><h1 class="dos-h1">Mon dossier Banque des RH</h1>'
    +'<p class="dos-sub">Retrouvez ce que vous avez déjà fait, comprenez les offres qui vous correspondent et reprenez votre parcours là où vous l’avez laissé.</p>'
    +'<div id="dossier" aria-live="polite"></div></div></section>'+pied+src.slice(j); }
function homeSrc(src,k){
  const i=src.indexOf('<main id="page-home">'), j=src.indexOf('</main>',i); if(i<0||j<0) return src;
  let m=src.slice(i,j);
  HOME_REPL[k].forEach(([a,b])=>{ if(typeof a==='string'){ if(m.indexOf(a)<0) console.warn('Démo : texte introuvable sur la home',k,a); m=m.split(a).join(b); }
    else { if(!a.test(m)) console.warn('Démo : bloc introuvable sur la home',k,String(a)); m=m.replace(a,b); } });
  return src.slice(0,i)+m+src.slice(j); }
function load(){
  const r=parse(location.hash);
  if(!r.site && r.page==='diagnostic.html') r.site='A';
  if(!r.site && (r.page==='label-brh.html' || (r.page==='devis.html' && /from=label/.test(r.qs)))) r.site='B';
  if(!r.site) r.site=DEFAUT;   /* plus de portail générique : on est toujours dans le site A ou le site B (A par défaut) */
  if(r.site && r.page==='index.html') r.page=SITES[r.site].home;   /* #/A/index.html : home du sous-site */
  site=r.site;
  const S=site?Object.assign({id:site},SITES[site]):null, home=!!HOMES[r.page];
  const dos=r.page==='mon-dossier.html', key=(home||dos)?'index.html':r.page;
  let src=cache[key]||(cache[key]=dec(PAGES[key].h));
  if(home) src=homeSrc(src,site);
  if(dos) src=dossierSrc(src);
  const shim=SHIM.replace('%QS%',JSON.stringify(r.qs)).replace('%HASH%',JSON.stringify(r.anchor)).replace('%PAGE%',JSON.stringify(key));
  const ctx='<script>window.__SITE='+JSON.stringify(S)+';window.__REAL_PAGE='+JSON.stringify(r.page)+';window.__IS_HOME='+home+';<\/script>';
  frame.srcdoc=src.replace('<head>',()=>'<head>'+shim+JULIA_TAG+(S?ctx+SITE_JS:'')+DOSSIER_TAG);
  document.title=(home?'Accueil · '+S.nom:dos?'Mon dossier BRH · '+S.nom:PAGES[r.page].t+(S && S.nom!==PAGES[r.page].t?' · '+S.nom:''))+' — Portail Banque des RH (démo)';
  seg.forEach(b=>{ const on=b.dataset.s===site; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  dosBtn.classList.toggle('on',dos); dosBtn.setAttribute('aria-pressed',dos);
  etape.innerHTML=(S?'Site '+site+' · ':'')+(ETAPES[r.page]?'Étape : <b>'+ETAPES[r.page]+'</b>':'');
}
/* navigation demandée par une page (lien, bouton) : on reste dans le sous-site en cours */
function cible(h){
  h=String(h).replace(/^[a-z]+:\/\/[^?#]*\/(?=[^\/?#]+\.html)/i,'');
  const r=parse('#/'+h); let s=site, p=r.page;
  if(s && p==='index.html') p=SITES[s].home;
  else if(s && SITES[s].remap[p]) p=SITES[s].remap[p];
  if(!s) s=DEFAUT;
  if(p==='index.html') p=SITES[s].home;
  if(HOMES[p]) s=HOMES[p];
  else if(p==='diagnostic.html') s='A';
  else if(p==='label-brh.html') s='B';
  return (s?s+'/':'')+p+r.qs+r.anchor; }
function go(h){ const t='#/'+h; if(location.hash===t) load(); else location.hash=t; }
window.addEventListener('message',e=>{ if(e.data && e.data.brhGo) go(cible(e.data.brhGo)); });
window.addEventListener('hashchange',load);
seg.forEach(b=>b.addEventListener('click',()=>go(b.dataset.s+'/'+SITES[b.dataset.s].home)));
dosBtn.addEventListener('click',()=>go((site||DEFAUT)+'/mon-dossier.html'));
document.getElementById('home').addEventListener('click',()=>go((site||DEFAUT)+'/'+SITES[site||DEFAUT].home));   /* logo du bandeau : home du site en cours */
document.getElementById('reset').addEventListener('click',()=>{
  if(!confirm('Recommencer la démo ? Les réponses saisies seront effacées.')) return;
  window.__brhStore={};
  try{ frame.contentWindow.sessionStorage.clear(); frame.contentWindow.localStorage.clear(); }catch(e){}
  try{ sessionStorage.clear(); localStorage.clear(); }catch(e){}
  site=DEFAUT; go(DEFAUT+'/'+SITES[DEFAUT].home); load();
});
frame.addEventListener('load',()=>{ const b=document.getElementById('boot'); if(b) b.remove(); });
%BOITE%
%START%if(!location.hash) history.replaceState(null,'','#/'+DEFAUT+'/'+SITES[DEFAUT].home);
load();'''

start = ("if(!location.hash) history.replaceState(null,'','#/'+%s);\n" % json.dumps(start_hash)) if start_hash else ''
SHELL = SHELL.replace('%START%', start)
import os
JF = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'julia_fermer_demo.js'), encoding='utf-8').read()
assert '</script' not in JF.lower()
SHELL = SHELL.replace('%JULIA%', json.dumps(JF))
DOS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dossier_brh_demo.js'), encoding='utf-8').read()
assert '</script' not in DOS.lower()
SHELL = SHELL.replace('%DOSSIER%', json.dumps(DOS))
BOITE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'boite_mail_demo.js'), encoding='utf-8').read()
assert '</script' not in BOITE.lower()
SHELL = SHELL.replace('%BOITE%', BOITE)

out = L[:i_hdr0] + HEADER.split('\n') + L[i_hdr1 + 1:i_shim + 1] + SHELL.split('\n') + L[i_end:]
html = '\n'.join(out)
html = html.replace('<title>Portail Banque des RH — démo</title>', '<title>Portail Banque des RH — démo (sites A et B)</title>')
open(out_path, 'w', encoding='utf-8').write(html)
print('écrit', out_path, len(html), 'octets')
