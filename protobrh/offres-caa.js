/* ==============================================================
   OFFRE SANTÉ COLLECTIVE CRÉDIT AGRICOLE ASSURANCES — MODIFIABLE ICI
   Entrepreneurs et petites entreprises (moins de 50 salariés) :
   3 niveaux d'offres simplifiées et lisibles + 2 options individuelles au choix du salarié.
   Source : support CAA / ACO « Santé collective » (retour CAA du 20/10/2026).
   Fichier partagé par index.html et diagnostic.html (fenêtre « Protéger mes salariés ») : affichée si l'entreprise
   déclare moins de 50 salariés ou si l'effectif n'est pas encore connu ; présentation neutre, sans niveau mis en avant.
   Les mêmes libellés sont repris dans audit-mutuelle.html et devis.html.
   Après modification : changer le numéro ?v=AAAAMMJJ dans les pages qui le chargent.
   ============================================================== */
(function(){
  var NIVEAUX = [
    { cle:'essentiel', badge:'Socle légal', nom:'Niveau CCN/ANI', accroche:'Couverture minimale réglementaire',
      points:['100 % Santé', 'Prise en charge du ticket modérateur', 'Services et prévention'],
      rac:'', pied:'Budget maîtrisé pour l’entreprise' },
    { cle:'confort', badge:'Cœur de gamme', nom:'Niveau Optimal', accroche:'L’équilibre idéal entre protection renforcée et coût prédictif',
      points:['Garanties renforcées pour les consultations', 'Forfaits médecine douce et pharmacie non prise en charge', 'Gains de pouvoir d’achat pour les salariés'],
      rac:'1 acte sur 2 sans reste à charge', pied:'Équilibre entre protection et coût' },
    { cle:'renfort', badge:'Haut de gamme', nom:'Niveau Renforcé', accroche:'Protection maximale pour une politique RH très attractive',
      points:['Plafonds de remboursement élevés', 'Prise en charge optimale des dépassements', 'Fidélisation et marque employeur'],
      rac:'2 actes sur 3 sans reste à charge', pied:'Attractivité et rétention des talents' }
  ];
  var OPTIONS = [
    { nom:'Option 1', texte:'Prise en charge des dépassements d’honoraires modérés, avec des forfaits en euros sur l’optique et le dentaire.' },
    { nom:'Option 2', texte:'Une formule qui majore les garanties pour les spécialistes et renforce les forfaits en euros.' }
  ];
  var CSS = '.caa{margin:16px 0 6px}.caa-t{font-family:var(--fh);font-weight:700;font-size:.98rem;color:var(--green);margin:0 0 2px}'+
    '.caa-s{font-size:.8rem;color:var(--slate);margin:0 0 10px}.caa-g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}'+
    '.caa-c{border:1px solid var(--line-2,#dfe6e2);border-radius:12px;padding:12px;background:#fff;display:flex;flex-direction:column;gap:5px}'+
    ''+
    '.caa-b{align-self:flex-start;font:700 .66rem var(--fb);text-transform:uppercase;letter-spacing:.04em;background:var(--mint,#e9f1ea);color:var(--green);border-radius:999px;padding:3px 8px}'+
    '.caa-c b{font-family:var(--fh);color:var(--green);font-size:.95rem}'+
    '.caa-a{font-size:.78rem;color:var(--slate);line-height:1.35}.caa-c ul{margin:2px 0 0;padding-left:16px;font-size:.78rem;line-height:1.4;color:var(--ink)}'+
    '.caa-r{font-size:.76rem;font-weight:700;color:var(--green)}.caa-p{margin-top:auto;padding-top:6px;border-top:1px solid var(--line,#e7ece9);font-size:.74rem;font-weight:600;color:var(--slate)}'+
    '.caa-o{margin-top:10px;display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;align-items:stretch}'+
    '.caa-o>span{font:600 .74rem var(--fb);color:#fff;background:var(--green);border-radius:8px;padding:8px 10px;display:flex;align-items:center;text-align:center}'+
    '.caa-o div{border:1px dashed var(--line-2,#dfe6e2);border-radius:8px;padding:8px 10px;font-size:.76rem;line-height:1.35;color:var(--slate)}.caa-o div b{display:block;color:var(--green);font-size:.82rem}'+
    '@media(max-width:720px){.caa-g,.caa-o{grid-template-columns:1fr}}';
  function css(){ if (document.getElementById('caaCss')) return; var s = document.createElement('style'); s.id = 'caaCss'; s.textContent = CSS; document.head.appendChild(s); }
  /* l'offre s'affiche si l'effectif déclaré est inférieur à 50, ou s'il n'est pas encore connu */
  function pourEffectif(effectif){ var n = parseInt(effectif, 10); return !(n >= 50); }
  /* cartes des 3 niveaux et des 2 options, présentées de façon neutre */
  function cartesCAA(){
    css();
    return '<div class="caa"><p class="caa-t">Santé collective : 3 niveaux d’offres simplifiées et lisibles</p>' +
      '<p class="caa-s">Pour les entrepreneurs et les entreprises de moins de 50 salariés.</p>' +
      '<div class="caa-g">' + NIVEAUX.map(function(v){
        return '<div class="caa-c"><span class="caa-b">' + v.badge + '</span><b>' + v.nom + '</b><span class="caa-a">' + v.accroche + '</span>' +
          '<ul>' + v.points.map(function(p){ return '<li>' + p + '</li>'; }).join('') + '</ul>' + (v.rac ? '<span class="caa-r">' + v.rac + '</span>' : '') + '<span class="caa-p">' + v.pied + '</span></div>';
      }).join('') + '</div>' +
      '<div class="caa-o"><span>Au choix du salarié</span>' + OPTIONS.map(function(o){ return '<div><b>' + o.nom + '</b>' + o.texte + '</div>'; }).join('') + '</div></div>';
  }
  window.BRH_CAA = { niveaux:NIVEAUX, options:OPTIONS, cartes:cartesCAA, pourEffectif:pourEffectif };
  window.cartesCAA = cartesCAA;
})();
