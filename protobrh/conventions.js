/* ==============================================================
   CONVENTIONS COLLECTIVES PAR SECTEUR — MODIFIABLE ICI
   Fichier partagé par diagnostic.html, audit-mutuelle.html et devis.html.
   Après modification : changer le numéro ?v=AAAAMMJJ dans ces 3 pages.
   Format : [code IDCC, libellé, la plus courante (1), condition d'effectif ('<=10' ou '>10')]
   Liste de travail du 09/10/2026 — À VALIDER par CAA et le service juridique.
   ============================================================== */
(function(){
  var S = {
    "Industrie": [["3248","Métallurgie",1],["44","Industries chimiques"],["292","Plasturgie"],["3109","Industries alimentaires diverses"]],
    "BTP": [["1596","Bâtiment, ouvriers (jusqu’à 10 salariés)",1,"<=10"],["1597","Bâtiment, ouvriers (plus de 10 salariés)",1,">10"],["2609","Bâtiment, ETAM"],["2420","Bâtiment, cadres"],["1702","Travaux publics, ouvriers"]],
    "Commerce": [["573","Commerces de gros",1],["2216","Commerce à prédominance alimentaire"],["1517","Commerce de détail non alimentaire"],["675","Habillement, commerce de détail"],["1090","Services de l’automobile"],["1606","Bricolage"]],
    "Hôtellerie-restauration": [["1979","Hôtels, cafés, restaurants (HCR)",1],["1501","Restauration rapide"],["1266","Restauration de collectivités"]],
    "Transport et logistique": [["16","Transports routiers et activités auxiliaires",1]],
    "Services aux entreprises": [["1486","Bureaux d’études techniques (Syntec)",1],["2098","Prestataires de services du tertiaire"],["787","Cabinets d’experts-comptables"],["1000","Cabinets d’avocats (personnel salarié)"],["86","Publicité"],["3043","Propreté"],["1351","Prévention et sécurité"]],
    "Santé et social": [["1996","Pharmacie d’officine",1],["2264","Hospitalisation privée"],["29","Établissements privés non lucratifs (FEHAP)"],["413","Établissements pour personnes inadaptées (CCN 66)"]],
    "Services à la personne": [["3127","Entreprises de services à la personne",1],["2941","Aide à domicile"],["2596","Coiffure"],["3032","Esthétique"]],
    "Artisanat alimentaire": [["843","Boulangerie-pâtisserie artisanale",1],["992","Boucherie"]],
    "Agriculture et paysage": [["7024","Production agricole et CUMA",1],["7018","Entreprises du paysage"]],
    "Banque, assurance, immobilier": [["1527","Immobilier",1],["2120","Banque"],["1672","Sociétés d’assurances"],["478","Sociétés financières"]],
    "Association": [["1518","Animation (ÉCLAT)",1],["413","Établissements pour personnes inadaptées (CCN 66)"],["2941","Aide à domicile"]],
    "Autre": []
  };
  function list(secteur, effectif){
    var n = parseInt(effectif,10) || 0;
    return (S[secteur] || []).filter(function(c){
      if (c[3] === "<=10") return n <= 10;
      if (c[3] === ">10") return n > 10;
      return true;
    });
  }
  function label(code){
    for (var k in S) for (var i=0;i<S[k].length;i++) if (S[k][i][0]===code) return S[k][i][1];
    return "";
  }
  /* options HTML d'un <select> : conventions du secteur + 3 issues sans blocage */
  function options(secteur, effectif, selected){
    var l = list(secteur, effectif), h = '<option value="">Sélectionner (facultatif)</option>';
    if (l.length) h += '<optgroup label="Les plus fréquentes dans votre secteur">' + l.map(function(c){
      return '<option value="'+c[0]+'"'+(c[0]===selected?' selected':'')+'>'+c[1]+' — IDCC '+c[0]+(c[2]?' ★':'')+'</option>'; }).join('') + '</optgroup>';
    h += '<optgroup label="Autres choix">'+
      '<option value="autre"'+(selected==='autre'?' selected':'')+'>Une autre convention (saisir le code IDCC)</option>'+
      '<option value="nsp"'+(selected==='nsp'?' selected':'')+'>Je ne sais pas</option>'+
      '<option value="aucune"'+(selected==='aucune'?' selected':'')+'>Aucune convention collective</option></optgroup>';
    return h;
  }
  /* la plus courante du secteur (pour une présélection éventuelle) */
  function courante(secteur, effectif){ var l=list(secteur,effectif); for(var i=0;i<l.length;i++) if(l[i][2]) return l[i][0]; return ""; }
  window.BRH_CCN = { secteurs:Object.keys(S), list:list, label:label, options:options, courante:courante };
})();
