/* ==============================================================
   CARROUSEL DE L'ACCUEIL — MODIFIABLE ICI (sites S, A et B)
   4 actualités : étiquette, titre, texte, bouton et photo (dossier img/, 1 000 × 560 px).
   La page déclare <div class="hero-carousel" id="heroCarousel"></div> puis charge ce script.
   Photos libres de droits (licence Unsplash) : à remplacer par des visuels validés avant tout test externe.
   Après modification : changer le numéro ?v=AAAAMMJJ dans les pages qui le chargent.
   ============================================================== */
(function(){
  var ICON = {
    euro:'<path d="M12 2v20M17 5.5c0-2-2.2-3.5-5-3.5s-5 1.5-5 3.5 2.2 3 5 3.5 5 1.5 5 3.5-2.2 3.5-5 3.5-5-1.5-5-3.5"/>',
    label:'<path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z"/>',
    livre:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z"/>',
    agenda:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>'
  };
  var SLIDES = [
    { icone:'euro', tag:'Offre du moment', titre:'Prime de Partage de la Valeur 2026',
      texte:'Jusqu\'à 6 000 € exonérés par salarié et par an, avec un accord d\'intéressement ou de participation.',
      bouton:'Évaluer mon éligibilité', lien:'label-brh.html', img:'img/carrousel-ppv.jpg', alt:'Deux collègues se félicitent autour d’un bureau' },
    { icone:'label', tag:'Nouveau', titre:'Le Label BRH : situez votre politique RH',
      texte:'Répondez à une dizaine de questions et comparez votre score à celui des autres entreprises répondantes.',
      bouton:'Passer le Label BRH', lien:'label-brh.html', img:'img/carrousel-label.jpg', alt:'Deux responsables échangent devant un ordinateur portable' },
    { icone:'livre', tag:'Ressource', titre:'Guide des avantages salariés — édition 2026',
      texte:'Le panorama complet des dispositifs exonérés de charges, à jour des derniers plafonds réglementaires.',
      bouton:'Télécharger le guide', lien:'ressources.html', img:'img/carrousel-guide.jpg', alt:'Lecture d’un document de travail à côté d’un ordinateur' },
    { icone:'agenda', tag:'À venir', titre:'Rendez-vous Banque des Ressources Humaines',
      texte:'Un webinaire pour échanger avec nos experts sur vos priorités RH et les dispositifs 2026.',
      bouton:'M\'inscrire', lien:'label-brh.html#contact', img:'img/carrousel-webinaire.jpg', alt:'Visioconférence à plusieurs sur un ordinateur portable' }
  ];
  var CSS = '.hero-carousel{position:relative;border-radius:var(--radius-lg,22px);overflow:hidden;box-shadow:var(--shadow-sm);aspect-ratio:4/4.1;min-height:340px;background:var(--mint)}'+
    '.car-slide{display:none;flex-direction:column;height:100%}.car-slide.active{display:flex;animation:carfade .45s ease}@keyframes carfade{from{opacity:0}to{opacity:1}}'+
    '.car-art{order:-1;flex:1 1 auto;height:150px;position:relative;overflow:hidden;min-height:0;background:var(--mint)}'+
    '.car-art img{width:100%;height:100%;object-fit:cover;display:block}'+
    '.car-txt{padding:26px 26px 54px;flex:0 0 auto}'+
    '.car-tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--fh);font-weight:700;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--green);background:#fff;border-radius:999px;padding:.3rem .7rem;margin-bottom:12px}'+
    '.car-tag svg{width:13px;height:13px}'+
    '.car-txt h3{font-family:var(--fh);font-weight:700;font-size:1.18rem;color:var(--green);margin:0 0 7px;max-width:22ch;line-height:1.28}'+
    '.car-txt p{color:var(--ink);font-size:.86rem;max-width:34ch;opacity:.82;line-height:1.4;margin:0}'+
    '.car-txt .btn{margin-top:14px;padding:.68rem 1rem;font-size:.84rem}'+
    '.car-dots{position:absolute;left:26px;bottom:20px;display:flex;gap:8px;z-index:2}'+
    '.car-dots button{width:8px;height:8px;border-radius:50%;border:none;background:rgba(6,81,69,.25);cursor:pointer;padding:0}'+
    '.car-dots button.active{background:var(--green);width:22px;border-radius:5px;transition:width .2s ease}'+
    '.car-arrow{position:absolute;top:36%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:#fff;border:1px solid var(--line);display:grid;place-items:center;cursor:pointer;z-index:2;box-shadow:var(--shadow-sm)}'+
    '.car-arrow:hover{border-color:var(--lime)}.car-arrow.prev{left:12px}.car-arrow.next{right:12px}.car-arrow svg{width:16px;height:16px;color:var(--green)}'+
    '@media(max-width:960px){.hero-carousel{aspect-ratio:auto;min-height:360px}}';
  var SVG = function(d, w){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2.2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var box = document.getElementById('heroCarousel'); if (!box) return;
  var st = document.createElement('style'); st.id = 'carCss'; st.textContent = CSS; document.head.appendChild(st);
  box.innerHTML =
    '<button class="car-arrow prev" type="button" aria-label="Diapositive précédente">' + SVG('<path d="M15 18l-6-6 6-6"/>', 2.4) + '</button>' +
    '<button class="car-arrow next" type="button" aria-label="Diapositive suivante">' + SVG('<path d="M9 6l6 6-6 6"/>', 2.4) + '</button>' +
    SLIDES.map(function(s, i){
      return '<div class="car-slide' + (i ? '' : ' active') + '" data-i="' + i + '"><div class="car-txt">' +
        '<span class="car-tag">' + SVG(ICON[s.icone]) + s.tag + '</span><h3>' + s.titre + '</h3><p>' + s.texte + '</p>' +
        '<a class="btn btn-primary" href="' + s.lien + '">' + s.bouton + ' ' + SVG('<path d="M5 12h14M13 6l6 6-6 6"/>') + '</a></div>' +
        '<div class="car-art"><img src="' + s.img + '" alt="' + s.alt + '" width="1000" height="560"' + (i ? ' loading="lazy"' : '') + '></div></div>';
    }).join('') +
    '<div class="car-dots" role="tablist" aria-label="Navigation du carrousel">' + SLIDES.map(function(s, i){
      return '<button type="button"' + (i ? '' : ' class="active"') + ' aria-label="Diapositive ' + (i + 1) + ' sur ' + SLIDES.length + '"></button>'; }).join('') + '</div>';
  var cur = 0, timer = null, slides = box.querySelectorAll('.car-slide'), dots = box.querySelectorAll('.car-dots button');
  function go(i){
    cur = (i + slides.length) % slides.length;
    slides.forEach(function(s, k){ s.classList.toggle('active', k === cur); });
    dots.forEach(function(d, k){ d.classList.toggle('active', k === cur); });
  }
  function pause(){ if (timer) clearInterval(timer); timer = null; }
  function resume(){ pause(); timer = setInterval(function(){ go(cur + 1); }, 6000); }
  box.querySelector('.prev').onclick = function(){ go(cur - 1); };
  box.querySelector('.next').onclick = function(){ go(cur + 1); };
  dots.forEach(function(d, k){ d.onclick = function(){ go(k); }; });
  box.addEventListener('mouseenter', pause); box.addEventListener('mouseleave', resume);
  window.carGo = go;
  /* mesure des clics, par diapositive (D107) */
  box.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('.car-slide a') : null; if (!a) return;
    var s = a.closest('.car-slide');
    (window.dataLayer = window.dataLayer || []).push({ event:'carrousel_click', diapositive:(+s.getAttribute('data-i') || 0) + 1, titre:SLIDES[+s.getAttribute('data-i') || 0].titre });
  });
  resume();
})();
