/* ==============================================================
   IDENTIFICATION DE L'ENTREPRISE PAR SIREN OU SIRET — partagé
   Utilisé par diagnostic.html (champ facultatif) et audit-mutuelle.html (version B).
   Appelle entreprise.php (proxy Pappers, clé côté serveur) ; sans clé ou sans réseau,
   renvoie des données fictives de démonstration (source « demo »).
   Après modification : changer le numéro ?v=AAAAMMJJ dans les pages qui le chargent.
   ============================================================== */
(function(){
  function luhn(s){ var t=0; for(var i=0;i<s.length;i++){ var d=+s[s.length-1-i]; if(i%2){ d*=2; if(d>9) d-=9; } t+=d; } return t%10===0; }
  function propre(v){ return String(v||'').replace(/\D/g,''); }
  /* SIREN (9 chiffres) ou SIRET (14 chiffres) valide ; La Poste (356000000) fait exception à la clé de Luhn */
  function valide(v){ var s=propre(v); return (s.length===9||s.length===14) && (luhn(s) || s.indexOf('356000000')===0); }
  /* code NAF -> secteur de la liste partagée (conventions.js) */
  function secteur(naf){
    var m=String(naf||'').match(/^(\d{2})\.?(\d{2})/); if(!m) return '';
    var d=+m[1], c=m[1]+'.'+m[2];
    if(c==='10.71'||c==='10.13') return 'Artisanat alimentaire';
    if(c==='81.30') return 'Agriculture et paysage';
    if(d<=3) return 'Agriculture et paysage';
    if(d<=39) return 'Industrie';
    if(d<=43) return 'BTP';
    if(d<=47) return 'Commerce';
    if(d<=53) return 'Transport et logistique';
    if(d<=56) return 'Hôtellerie-restauration';
    if(d===64||d===65||d===66||d===68) return 'Banque, assurance, immobilier';
    if(d<=82) return 'Services aux entreprises';
    if(d>=86&&d<=88) return 'Santé et social';
    if(d===94) return 'Association';
    if(d===96||d===97) return 'Services à la personne';
    return 'Autre';
  }
  function departement(cp){ var s=propre(cp); if(s.length!==5) return ''; if(s.slice(0,2)==='20') return (+s<20200)?'2A':'2B'; return s.slice(0,2); }
  function demo(s){
    var v=[['Tours','37000'],['Orléans','45000'],['Angers','49000'],['Poitiers','86000'],['Blois','41000']][+s.slice(-3)%5];
    return {source:'demo', siren:s.slice(0,9), siret:s.length===14?s:'', nom:'Entreprise Démo '+s.slice(-4), ville:v[0], cp:v[1],
            naf:'47.11F — Hypermarchés', tranche:'20 à 49 salariés', idcc:'2216 — Commerce à prédominance alimentaire', idcc_confirme:false};
  }
  /* renvoie {source, siren, siret, nom, ville, cp, naf, tranche, idcc, idcc_confirme, secteur, departement} */
  function chercher(v){
    var s=propre(v), q=(s.length===9?'siren=':'siret=')+s;
    var fin=function(d){ d=d||demo(s); d.secteur=secteur(d.naf); d.departement=departement(d.cp); d.siren=d.siren||s.slice(0,9); return d; };
    if(!window.fetch) return Promise.resolve(fin(null));
    return fetch('entreprise.php?'+q,{headers:{'Accept':'application/json'}})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){ return fin(j && !j.error ? j : null); })
      .catch(function(){ return fin(null); });
  }
  window.BRH_ENT = { valide:valide, chercher:chercher, secteur:secteur, departement:departement };
})();
