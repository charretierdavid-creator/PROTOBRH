/* ==============================================================
   FORMULES AMUNDI — offre « ESR Entreprises » (code OM050)
   Contenu commun aux pages Accueil, Diagnostic et Devis en ligne.
   Modifiez ici les textes et les tarifs : ils s'appliquent partout.
   Tarifs issus de la grille Amundi transmise le 08/10/2026 — à confirmer
   par Amundi (HT / TTC, validité). Exemples fictifs.
   Après modification : changer le numéro ?v=AAAAMMJJ dans les 3 pages.
   ============================================================== */
(function(){
var IC = {
  epargne:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 20a5 5 0 0 1 6.5-4.8"/>',
  retraite:'<path d="M5 5v14M5 9h9a3 3 0 0 1 0 6H5M14 19v2M5 21v-2"/>',
  deux:'<path d="M7 7h10v10H7z"/><path d="M3 12h4M17 12h4M12 3v4M12 17v4"/>'
};

var FORMULES = {
  decouverte:{
    nom:'Formule Découverte', bandeau:'Amundi · CA Titres · Partager la valeur', icon:IC.epargne, sol:'epargne',
    accroche:'Un PEI (Plan d’Épargne Interentreprises) 100 % en ligne. Intéressement et abondement en option.',
    prix:'dès 99 €/an',
    qui:'Les petites entreprises qui veulent un premier dispositif d’épargne pour leurs salariés, simple et sans paperasse.',
    place:['Un PEI (Plan d’Épargne Interentreprises).',
      'Vos salariés y placent leurs primes et leurs versements personnels.',
      'En option : un intéressement et un abondement, le complément versé par l’entreprise.',
      'Tout se fait en ligne ; les frais sont prélevés une fois par an.'],
    exemple:'La boulangerie Martin (8 salariés) verse une prime de partage de la valeur de 500 € à chacun. Chaque salarié choisit en ligne de la placer sur son PEI : son argent est investi et fructifie, dans un cadre fiscal avantageux.',
    cout:[['99 € / an','forfait'],['4 € / an','par salarié qui a de l’épargne'],['49 €','chaque fois que vos salariés choisissent où placer une prime']],
    calcul:'Exemple Martin : 99 + 8 × 4 + 49 = 180 € pour l’année.'
  },
  integrale_epargne:{
    nom:'Formule Intégrale', bandeau:'Amundi · CA Titres · Partager la valeur', icon:IC.epargne, sol:'epargne',
    accroche:'PEI, intéressement et abondement, avec la consultation de chaque salarié gérée pour vous.',
    prix:'dès 170 €/an',
    qui:'Les entreprises qui veulent un dispositif complet pour récompenser leurs salariés, sans rien gérer elles-mêmes.',
    place:['Un PEI (Plan d’Épargne Interentreprises).',
      'Intéressement et abondement possibles, avec un taux fixe ou variable.',
      'Amundi consulte chaque salarié : toucher sa prime tout de suite ou l’épargner, et où la placer.',
      'Un accompagnement et des conseils pour votre entreprise.'],
    exemple:'L’atelier Durand (20 salariés) verse 1 000 € d’intéressement à chacun. Amundi demande à chaque salarié s’il veut l’épargner. L’entreprise ajoute 50 % sur les sommes épargnées : pour 1 000 € placés, le salarié reçoit 500 € de plus sur son PEI.',
    cout:[['170 € / an','forfait (199 € avec la retraite)'],['8 € / an','par salarié qui a de l’épargne'],['2 € + 2 €','par consultation d’un salarié et par relevé de placement']],
    calcul:'Exemple Durand, une prime par an : 170 + 20 × 8 + 20 × 2 + 20 × 2 = 410 € pour l’année.'
  },
  integrale_retraite:{
    nom:'Formule Intégrale — retraite', bandeau:'Amundi · Préparer la retraite', icon:IC.retraite, sol:'retraite',
    accroche:'Un PER COL-I (Plan d’Épargne Retraite Collectif Interentreprises) seul. Abondement fixe, variable ou de départ.',
    prix:'dès 170 €/an',
    qui:'Les entreprises qui veulent aider leurs salariés à se constituer un complément de retraite.',
    place:['Un PER COL-I (Plan d’Épargne Retraite Collectif Interentreprises).',
      'Abondement fixe ou variable, ou versement de départ offert par l’entreprise, même si le salarié n’a encore rien versé.',
      'Les salariés peuvent y placer leurs jours de congé ou de repos non pris.',
      'Par défaut, l’épargne est sécurisée progressivement à l’approche de la retraite.'],
    exemple:'Le garage Petit (12 salariés) verse 300 € à chaque salarié à l’ouverture du plan. Un salarié y ajoute 3 jours de congé non pris : ils deviennent de l’épargne retraite, dans un cadre fiscal avantageux.',
    cout:[['170 € / an','forfait (199 € avec l’épargne)'],['8 € / an','par salarié qui a de l’épargne'],['2 € + 2 €','par consultation d’un salarié et par relevé de placement']],
    calcul:'Exemple Petit : 170 + 12 × 8 + 12 × 2 + 12 × 2 = 314 € pour l’année.'
  },
  convergence:{
    nom:'Formule Convergence', bandeau:'Amundi · CA Titres · Partager la valeur et préparer la retraite', icon:IC.deux, sol:'epargne,retraite',
    accroche:'PEI + PER COL-I réunis : un seul contrat, un seul tarif.',
    prix:'199 € HT/an',
    qui:'Les entreprises qui veulent à la fois partager la valeur et préparer la retraite de leurs salariés.',
    place:['Les deux plans ensemble : un PEI (Plan d’Épargne Interentreprises) et un PER COL-I (Plan d’Épargne Retraite Collectif Interentreprises).',
      'Toutes les sources d’épargne : versements personnels, intéressement, participation, prime de partage de la valeur, jours non pris (retraite).',
      'Abondement à taux fixe, réglable différemment pour chaque plan.',
      'Votre entreprise recueille les choix de placement de ses salariés et les transmet à Amundi.'],
    exemple:'La SAS Martin Industrie (25 salariés) met en place l’intéressement et un abondement de 500 € par salarié sur le PEI, puis de 300 € sur le PER COL-I. Un seul contrat, un seul tarif.',
    cout:[['199 € HT / an','pour les deux plans'],['8 € / an','par salarié à partir du 11ᵉ'],['Inclus','consultations et relevés de placement']],
    calcul:'Exemple Martin : 199 + 15 × 8 = 319 € HT pour l’année.'
  }
};

/* Frais annuels de la formule (grille OM050). n = salariés avec épargne, ops = opérations par an. */
function frais(k, o){
  o=o||{}; var n=Math.max(0,o.n||0), ops=Math.max(0,o.ops||0), r=Math.max(0,o.nRet||0);
  if(k==='decouverte'){ var m=99+4*n+49*ops; return {montant:m, ht:false, detail:'99 € + '+n+' × 4 €'+(ops?' + '+ops+' × 49 €':'')}; }
  if(k==='convergence'){ var c=Math.max(0,n-10); return {montant:199+8*c, ht:true, detail:'199 € HT'+(c?' + '+c+' × 8 €':'')}; }
  if(k==='integrale_epargne'||k==='integrale_retraite'||k==='integrale_deux'){
    var deux=k==='integrale_deux', ne=k==='integrale_retraite'?0:n, nr=k==='integrale_epargne'?0:(deux?r:n), oe=Math.max(1,ops);
    var forfait=deux?199:170, comptes=ne+nr, bo=ne*oe+nr;
    return {montant:forfait+8*comptes+4*bo, ht:false, detail:forfait+' € + '+comptes+' × 8 € + '+bo+' × (2 € + 2 €)'};
  }
  return null;
}

/* ---------- fenêtre « fiche formule » ---------- */
var css='.fa-modal[hidden]{display:none}.fa-modal{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:20px}'+
'.fa-modal .fa-bd{position:absolute;inset:0;background:rgba(6,42,35,.55)}'+
'.fa-modal .fa-p{position:relative;z-index:1;background:#fff;border-radius:18px;max-width:620px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 30px 80px rgba(6,81,69,.35);padding:28px}'+
'.fa-modal .fa-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border:none;background:var(--mint,#e9f1ea);color:var(--green,#065145);border-radius:10px;font-size:1.4rem;line-height:1;cursor:pointer}'+
'.fa-modal .fa-h{display:flex;align-items:center;gap:14px;padding:0 44px 14px 0;border-bottom:1px solid var(--line,#e7ece9)}'+
'.fa-modal .fa-ic{width:50px;height:50px;border-radius:12px;background:var(--mint,#e9f1ea);display:grid;place-items:center;flex:0 0 auto}.fa-modal .fa-ic svg{width:26px;height:26px;color:var(--green,#065145)}'+
'.fa-modal .fa-b{display:block;font-family:var(--fh,inherit);font-weight:700;font-size:.64rem;text-transform:uppercase;letter-spacing:.04em;color:var(--green,#065145);margin-bottom:2px}'+
'.fa-modal h3{font-family:var(--fh,inherit);font-weight:700;font-size:1.3rem;color:var(--green,#065145);line-height:1.2;margin:0}'+
'.fa-modal h4{font-family:var(--fh,inherit);font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--green,#065145);margin:16px 0 6px}'+
'.fa-modal ul{margin:0;padding-left:18px;font-size:.88rem;line-height:1.55;color:var(--ink,#233029)}.fa-modal p{font-size:.88rem;line-height:1.55;margin:0;color:var(--ink,#233029)}'+
'.fa-modal .fa-ex{background:var(--gray-bg,#f6f8f7);border-left:4px solid var(--lime,#8fb822);border-radius:10px;padding:12px 14px}'+
'.fa-modal .fa-c{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.fa-modal .fa-c div{border:1.5px solid var(--line,#e7ece9);border-radius:12px;padding:10px 12px;font-size:.76rem;color:var(--slate,#5c6b64);line-height:1.35}'+
'.fa-modal .fa-c b{display:block;font-family:var(--fh,inherit);font-size:1.02rem;color:var(--green,#065145)}'+
'.fa-modal .fa-calc{font-size:.78rem;color:var(--slate,#5c6b64);margin-top:8px}.fa-modal .fa-legal{font-size:.72rem;color:var(--slate,#5c6b64);margin-top:12px}'+
'.fa-modal .fa-cta{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}'+
'@media(max-width:560px){.fa-modal .fa-c{grid-template-columns:1fr}}'+
'.fa-zone{margin-top:16px}.fa-zone>.fa-k{display:block;font-family:var(--fh,inherit);font-weight:700;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--green,#065145)}'+
'.fa-card{display:flex;justify-content:space-between;align-items:center;gap:14px;background:var(--mint-2,#eef4ef);border:1.5px solid var(--lime-soft,#c7dd8a);border-radius:14px;padding:12px 14px;margin-top:10px}'+
'.fa-card b{display:block;font-family:var(--fh,inherit);font-size:.95rem;color:var(--ink,#233029)}.fa-card span{font-size:.82rem;color:var(--slate,#5c6b64);line-height:1.45}'+
'.fa-more{white-space:nowrap;font-family:var(--fh,inherit);font-weight:700;font-size:.8rem;color:var(--green,#065145);background:#fff;border:1.5px solid var(--green,#065145);border-radius:10px;padding:.5rem .8rem;cursor:pointer}';

function injectCss(){ if(document.getElementById('faCss')) return;
  var st=document.createElement('style'); st.id='faCss'; st.textContent=css; document.head.appendChild(st); }
injectCss();
function ensure(){
  injectCss(); if(document.getElementById('faModal')) return;
  var m=document.createElement('div'); m.className='fa-modal'; m.id='faModal'; m.hidden=true;
  m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','faTitle');
  m.innerHTML='<div class="fa-bd"></div><div class="fa-p" role="document"><button class="fa-x" aria-label="Fermer">&times;</button><div id="faBody"></div></div>';
  m.querySelector('.fa-bd').onclick=close; m.querySelector('.fa-x').onclick=close;
  document.body.appendChild(m);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !m.hidden){ e.stopPropagation(); close(); } },true);
}
var svg=function(p){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; };
var chooseCb=null;
function open(k, opts){
  var f=FORMULES[k]; if(!f) return; ensure(); opts=opts||{}; chooseCb=opts.onChoose||null;
  var cta = chooseCb
    ? '<button class="btn btn-primary" id="faChoose">Choisir cette formule</button>'
    : '<a class="btn btn-primary" href="devis.html?sol='+f.sol+'&formule='+k+'">Obtenir mon devis</a>';
  document.getElementById('faBody').innerHTML=
    '<div class="fa-h"><span class="fa-ic">'+svg(f.icon)+'</span><div><span class="fa-b">'+f.bandeau+'</span><h3 id="faTitle">'+f.nom+'</h3></div></div>'+
    '<h4>Pour qui ?</h4><p>'+f.qui+'</p>'+
    '<h4>Ce que vous mettez en place</h4><ul>'+f.place.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>'+
    '<h4>Un exemple</h4><p class="fa-ex">'+f.exemple+'</p>'+
    '<h4>Ce que ça coûte</h4><div class="fa-c">'+f.cout.map(function(c){return '<div><b>'+c[0]+'</b>'+c[1]+'</div>';}).join('')+'</div>'+
    '<p class="fa-calc">'+f.calcul+'</p>'+
    '<p class="fa-legal">Frais de gestion annuels facturés à l’entreprise. Frais d’entrée : 2 % des sommes versées. Montants indicatifs et non contractuels, à confirmer avec votre expert.</p>'+
    '<div class="fa-cta">'+cta+'<button class="btn btn-outline" id="faExpert">Parler à un expert</button></div>';
  var ch=document.getElementById('faChoose'); if(ch) ch.onclick=function(){ var cb=chooseCb; close(); cb(k); };
  document.getElementById('faExpert').onclick=function(){ close();
    if(typeof window.closeSol==='function') window.closeSol();
    if(typeof window.openExpert==='function') window.openExpert();
    else if(typeof window.goToContact==='function') window.goToContact();
    else location.href='diagnostic.html#contact'; };
  var m=document.getElementById('faModal'); m.hidden=false; document.body.style.overflow='hidden';
  m.querySelector('.fa-x').focus();
  if(typeof window.track==='function') window.track('formule_amundi_open',{formule:k});
}
function close(){ var m=document.getElementById('faModal'); if(!m) return; m.hidden=true;
  var sol=document.getElementById('solModal'); document.body.style.overflow = sol && !sol.hidden ? 'hidden' : ''; }

/* Zone « Nos formules clés en main » insérée dans les fenêtres Solutions */
function cartes(keys){
  if(!keys||!keys.length) return '';
  return '<div class="fa-zone"><span class="fa-k">Nos formules clés en main</span>'+keys.map(function(k){ var f=FORMULES[k];
    return '<div class="fa-card"><div><b>'+f.nom+'</b><span>'+f.accroche+'</span></div><button type="button" class="fa-more" onclick="openFormule(\''+k+'\')">En savoir plus →</button></div>'; }).join('')+'</div>';
}

window.FORMULES_AMUNDI=FORMULES;
window.fraisFormuleAmundi=frais;
window.openFormule=open;
window.closeFormule=close;
window.cartesFormules=cartes;
})();
