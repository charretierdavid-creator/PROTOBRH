/* ==============================================================
   CONVENTIONS COLLECTIVES DÉCLARÉES — page Devis en ligne (version C, protobrhc)
   Surcouche de devis.html du socle (S, fillEntreprise, fillDvCcn, onDvCcn,
   renderTabs, submitDevis…), sans modifier la page ni le moteur de calcul.

   Le socle ne gardait qu'une convention collective. Une entreprise peut en déclarer
   plusieurs, une par catégorie de salariés : BRIAND (SIREN 890 331 754) déclare
   l'IDCC 2420 (cadres du bâtiment) et l'IDCC 2609 (ETAM du bâtiment).
   entreprise.php (version C) renvoie toutes les conventions déclarées dans les
   déclarations sociales (DSN), telles que publiées par l'Annuaire des entreprises
   (source également utilisée par Pappers). Ce module :
     - une seule convention déclarée : elle est préremplie (à confirmer par l'expert) ;
     - plusieurs conventions déclarées : elles sont TOUTES affichées et le visiteur CHOISIT
       celle qui sert de base à son devis (aucune présélection ; « Je ne sais pas » reste
       possible, conformément à l'atelier du 13/11) ; sans choix, l'étape 2 ne se valide pas
       quand la santé et la prévoyance sont demandées ;
     - les place en tête de la liste déroulante (« Déclarées par votre entreprise ») ;
     - en déduit le secteur d'activité quand il n'est pas connu (le NAF peut tromper :
       BRIAND est en 70.22Z « conseil » mais relève du bâtiment) ;
     - transmet toutes les conventions à l'expert : demande (lead), devis PDF, synthèse IA.
   ============================================================== */
(function () {
  'use strict';
  if (typeof S === 'undefined' || typeof fillEntreprise !== 'function') { if (window.console) console.warn('idcc-devis.js : fonctions du devis introuvables (S, fillEntreprise), module inactif'); return; }
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var codeDe = function (t) { var m = String(t || '').match(/^\s*(\d{1,4})\b/); return m ? String(parseInt(m[1], 10)) : ''; };
  var MEMO = 'brhDevisIdcc';

  /* intitulés courts des conventions absentes de conventions.js — À VALIDER (CAA, juridique) */
  var LIB = {
    '3212': 'Travaux publics, cadres', '2614': 'Travaux publics, ETAM', '650': 'Métallurgie, ingénieurs et cadres (ancienne convention)',
    '18': 'Industrie textile', '200': 'Exploitations frigorifiques', '1043': 'Gardiens, concierges et employés d’immeubles',
    '1147': 'Cabinets médicaux', '1261': 'Acteurs du lien social et familial (ALISFA)', '1285': 'Entreprises artistiques et culturelles',
    '1404': 'Matériels agricoles, de travaux publics et de manutention (SDLM)', '1413': 'Travail temporaire, salariés permanents',
    '1431': 'Optique-lunetterie de détail', '1480': 'Journalistes', '1483': 'Commerce de détail de l’habillement et du textile',
    '1505': 'Commerce de détail alimentaire non spécialisé', '1516': 'Organismes de formation', '1534': 'Industrie et commerce en gros des viandes',
    '1619': 'Cabinets dentaires', '1631': 'Hôtellerie de plein air', '1794': 'Institutions de retraite complémentaire',
    '1801': 'Sociétés d’assistance', '1880': 'Négoce de l’ameublement', '2060': 'Chaînes de cafétérias', '2128': 'Mutualité',
    '2148': 'Télécommunications', '2156': 'Grands magasins et magasins populaires', '2205': 'Notariat',
    '2247': 'Courtage d’assurances et de réassurances', '2335': 'Agences générales d’assurances', '2378': 'Travail temporaire, intérimaires',
    '2511': 'Sport', '3016': 'Ateliers et chantiers d’insertion', '3218': 'Enseignement privé non lucratif',
    '3239': 'Particuliers employeurs et emploi à domicile'
  };
  /* intitulés complets, prioritaires (mêmes libellés que l'Annuaire des entreprises et Pappers) */
  var LONG = {
    '2420': 'Cadres du bâtiment', '2609': 'Employés, techniciens et agents de maîtrise (ETAM) du bâtiment',
    '1596': 'Ouvriers du bâtiment (entreprises jusqu’à 10 salariés)', '1597': 'Ouvriers du bâtiment (entreprises de plus de 10 salariés)',
    '3212': 'Cadres des travaux publics', '2614': 'Employés, techniciens et agents de maîtrise (ETAM) des travaux publics',
    '1702': 'Ouvriers des travaux publics'
  };
  /* branches qui ont une convention par catégorie de salariés */
  var POP = { '2420': 'Cadres', '3212': 'Cadres', '650': 'Cadres', '2609': 'ETAM', '2614': 'ETAM',
              '1596': 'Ouvriers', '1597': 'Ouvriers', '1702': 'Ouvriers', '2378': 'Intérimaires' };

  function libelle(c, srv) {
    var l = LONG[c] || (window.BRH_CCN && BRH_CCN.label(c)) || LIB[c] || String(srv || '').trim();
    if (!l && window.BRH_PREV) { var f = BRH_PREV.pour(c)[0]; if (f) l = f[1]; }
    return l;
  }
  function prev(c) { return !!(window.BRH_PREV && BRH_PREV.pour(c).length); }
  function texte(c) { return c.code + (c.libelle ? ' — ' + c.libelle : ''); }

  /* liste renvoyée par entreprise.php → liste affichée */
  function normaliser(l) {
    var vus = {}, out = [];
    (Array.isArray(l) ? l : []).forEach(function (x) {
      var c = codeDe(typeof x === 'object' && x ? (x.code || x.idcc) : x);
      if (!c || c === '9999' || c === '9998' || vus[c]) return; vus[c] = 1;
      x = typeof x === 'object' && x ? x : {};
      out.push({ code: c, libelle: libelle(c, x.libelle), population: POP[c] || '', niveau: x.niveau || 'entreprise',
                 source: x.source || 'Déclarations sociales (DSN)', legifrance: /^https:\/\/www\.legifrance\.gouv\.fr\//.test(x.legifrance || '') ? x.legifrance : '',
                 prevoyance: prev(c) });
    });
    return out;
  }
  /* convention principale : celle déjà indiquée (audit, diagnostic), sinon une convention non-cadres, sinon la première */
  function principale(l, pref) {
    var p = codeDe(pref);
    for (var i = 0; i < l.length; i++) if (l[i].code === p) return l[i];
    for (i = 0; i < l.length; i++) if (l[i].population !== 'Cadres') return l[i];
    return l[0];
  }
  /* secteur d'activité déduit des conventions (liste partagée conventions.js), sinon du code NAF */
  function secteurDe(l, naf) {
    if (window.BRH_CCN) for (var i = 0; i < l.length; i++) for (var j = 0; j < BRH_CCN.secteurs.length; j++) {
      var s = BRH_CCN.secteurs[j], cs = BRH_CCN.list(s, 5).concat(BRH_CCN.list(s, 50));
      if (cs.some(function (c) { return c[0] === l[i].code; })) return s;
    }
    return (naf && window.BRH_ENT && BRH_ENT.secteur(naf)) || '';
  }
  function liens(siren, v) {
    siren = String(siren || '').replace(/\D/g, '').slice(0, 9);
    if (v && v.annuaire) return v;
    return siren.length === 9 ? { annuaire: 'https://annuaire-entreprises.data.gouv.fr/entreprise/' + siren, pappers: 'https://www.pappers.fr/recherche?q=' + siren } : null;
  }
  var conv = function () { return (S.ent && S.ent.conventions) || []; };
  /* plusieurs conventions déclarées : le visiteur doit choisir (une convention, une autre saisie, ou « Je ne sais pas ») */
  var aChoisir = function () { return conv().length > 1; };
  var choixFait = function () { var i = $('e-idcc'); return !!((i && i.value.trim()) || (S.ent && S.ent.idccNsp)); };
  function statut() {
    var b = document.querySelector('[data-st="idcc"]'); if (!b || !conv().length) return;
    if (aChoisir() && !choixFait()) { b.className = 'dv-status check'; b.textContent = 'À choisir'; }
    else { b.className = 'dv-status found'; b.textContent = aChoisir() ? 'Choisie' : 'Trouvé'; }
  }

  /* ---------- mémoire de session (la reprise du socle reconstruit S.ent sans ces champs) ---------- */
  function memoSave() {
    try { if (S.ent && S.ent.siret) sessionStorage.setItem(MEMO, JSON.stringify({ siret: S.ent.siret, conventions: conv(), sans: !!S.ent.sansConvention, verifier: S.ent.verifier || null })); } catch (e) {}
  }
  function memoLire(siret) {
    try { var m = JSON.parse(sessionStorage.getItem(MEMO) || 'null'); return m && siret && m.siret === siret ? m : null; } catch (e) { return null; }
  }
  function attacher(l, sans, verifier) {
    if (!S.ent) return;
    S.ent.conventions = l; S.ent.sansConvention = !!sans && !l.length; S.ent.verifier = liens(S.ent.siret, verifier);
    if (S.entSrc) S.entSrc.conventions = l.map(function (c) { return { idcc: c.code, libelle: c.libelle, population: c.population, niveau: c.niveau, source: c.source, prevoyance_branche: c.prevoyance }; });
    if (l.length && S.ent.idcc) S.ent.idccNsp = false;
    memoSave();
  }

  /* ---------- styles ---------- */
  var st = document.createElement('style');
  st.textContent = '.dv-idcc{margin-top:10px;border:1px solid var(--line,#e7ece9);border-radius:12px;padding:10px 12px;background:var(--mint-2,#f3f8f5);font-size:.8rem;line-height:1.45}' +
    '.dv-idcc .t{margin:0 0 6px;color:var(--green,#065145)}.dv-idcc .t small{color:var(--slate,#5b6b66);font-weight:400}' +
    '.dv-idcc ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}' +
    '.dv-idcc li{display:flex;flex-wrap:wrap;align-items:center;gap:6px;background:#fff;border:1px solid var(--line,#e7ece9);border-radius:10px;padding:7px 10px}' +
    '.dv-idcc li.on{border-color:var(--lime,#8FB822);box-shadow:inset 3px 0 0 var(--lime,#8FB822)}' +
    '.dv-idcc .c{font-weight:700;color:var(--green,#065145);white-space:nowrap}.dv-idcc .l{flex:1 1 160px}' +
    '.dv-idcc .tg{font-size:.68rem;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--mint,#E3EFEA);color:var(--green,#065145);white-space:nowrap}' +
    '.dv-idcc .tg.pv{background:#eef6d9;color:#4d6a00}.dv-idcc .tg.ok{background:var(--green,#065145);color:#fff}' +
    '.dv-idcc button{font:600 .74rem var(--fb,sans-serif);color:var(--teal,#016265);background:none;border:1px solid currentColor;border-radius:999px;padding:3px 10px;cursor:pointer}' +
    '.dv-idcc .n{margin:8px 0 0;color:var(--slate,#5b6b66)}.dv-idcc a{color:var(--teal,#016265);font-weight:600}' +
    '.dv-idcc.ask{background:#fff;border:2px solid var(--lime,#8FB822);padding:12px 14px}.dv-idcc.ask.miss{border-color:#d64545;background:#fff7f7}' +
    '.dv-idcc .q{margin:0 0 4px;font:700 .92rem var(--fh,sans-serif);color:var(--green,#065145)}.dv-idcc .sub{margin:0 0 10px;color:var(--slate,#5b6b66)}' +
    '.dv-idcc .opts{display:grid;gap:8px}' +
    '.dv-idcc .opt{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;font:400 .84rem/1.4 var(--fb,sans-serif);color:var(--ink,#1d2b28);background:#fff;border:1.5px solid var(--line-2,#dfe6e2);border-radius:12px;padding:10px 12px;cursor:pointer}' +
    '.dv-idcc .opt:hover{border-color:var(--teal,#016265)}.dv-idcc .opt:focus-visible{outline:2px solid var(--green,#065145);outline-offset:2px}' +
    '.dv-idcc .opt[aria-checked="true"]{border-color:var(--lime,#8FB822);background:var(--mint-2,#f3f8f5);box-shadow:inset 4px 0 0 var(--lime,#8FB822)}' +
    '.dv-idcc .rd{flex:none;width:18px;height:18px;margin-top:1px;border-radius:50%;border:2px solid var(--slate,#5b6b66);background:#fff}' +
    '.dv-idcc .opt[aria-checked="true"] .rd{border-color:var(--green,#065145);background:radial-gradient(circle,var(--green,#065145) 0 45%,#fff 50%)}' +
    '.dv-idcc .opt b{display:block;color:var(--green,#065145)}.dv-idcc .opt .tgs{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}' +
    '.dv-idcc .opt.nsp{border-style:dashed}.dv-idcc .err{display:none;margin:8px 0 0;color:#b42318;font-weight:600}.dv-idcc.miss .err{display:block}';
  document.head.appendChild(st);

  /* ---------- panneau « conventions déclarées » sous le champ convention collective ---------- */
  function paint() {
    var inp = $('e-idcc'); if (!inp) return;
    var box = $('dvIdccDecl');
    if (!box) { box = document.createElement('div'); box.id = 'dvIdccDecl'; box.className = 'dv-idcc'; box.setAttribute('aria-live', 'polite'); inp.parentNode.appendChild(box);
      box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button[data-idcc]'); if (b) retenir(b.getAttribute('data-idcc')); }); }
    var l = conv(), v = S.ent && S.ent.verifier, cur = codeDe(inp.value), lien = v && v.annuaire ? ' <a href="' + esc(v.annuaire) + '" target="_blank" rel="noopener">Vérifier sur l’Annuaire des entreprises</a>' : '';
    if (!l.length) {
      if (S.ent && S.ent.sansConvention) { box.style.display = ''; box.innerHTML = '<p class="t"><b>Votre entreprise déclare ne relever d’aucune convention collective.</b> <small>(déclarations sociales)</small></p><p class="n">Votre devis repose alors sur le socle légal ; votre expert le vérifie avec vous.' + lien + '</p>'; }
      else { box.style.display = 'none'; box.innerHTML = ''; }
      return;
    }
    box.style.display = '';
    statut();
    if (l.length > 1) {
      var nsp = !!(S.ent && S.ent.idccNsp) && !cur, carte = function (val, on, titre, tags, cls) {
        return '<button type="button" role="radio" class="opt' + (cls ? ' ' + cls : '') + '" data-idcc="' + esc(val) + '" aria-checked="' + on + '"><span class="rd"></span><span>' + titre + (tags ? '<span class="tgs">' + tags + '</span>' : '') + '</span></button>'; };
      box.className = 'dv-idcc ask' + (box.classList.contains('miss') && !choixFait() ? ' miss' : '');
      box.innerHTML = '<p class="q">Votre entreprise a déclaré ' + l.length + ' conventions collectives : laquelle retenir pour votre devis ?</p>' +
        '<p class="sub">Chaque convention couvre une catégorie de salariés. Choisissez celle qui couvre la plupart des salariés concernés par votre devis. Votre expert appliquera l’autre aux salariés qu’elle couvre.</p>' +
        '<div class="opts" role="radiogroup" aria-label="Convention collective retenue pour le devis">' +
        l.map(function (c) {
          return carte(c.code, c.code === cur, '<b>IDCC ' + esc(c.code) + ' · ' + esc(c.libelle || 'Intitulé à confirmer') + '</b>',
            (c.population ? '<span class="tg">' + esc(c.population) + '</span>' : '') + (c.prevoyance ? '<span class="tg pv">Prévoyance de branche</span>' : ''));
        }).join('') +
        carte('nsp', nsp, '<b>Je ne sais pas</b>Votre expert détermine la convention avec vous ; votre devis n’est pas bloqué.', '', 'nsp') +
        '</div><p class="err" role="alert">Choisissez la convention collective qui sert de base à votre devis.</p>' +
        '<p class="n">Source : déclarations sociales de votre entreprise.' + lien + '</p>';
      return;
    }
    box.className = 'dv-idcc';
    var plus = false;
    box.innerHTML = '<p class="t"><b>' + (plus ? l.length + ' conventions collectives déclarées par votre entreprise' : 'Convention collective déclarée par votre entreprise') + '</b> <small>(déclarations sociales)</small></p><ul>' +
      l.map(function (c) {
        var on = c.code === cur;
        return '<li class="' + (on ? 'on' : '') + '"><span class="c">IDCC ' + esc(c.code) + '</span><span class="l">' + esc(c.libelle || 'Intitulé à confirmer') + '</span>' +
          (c.population ? '<span class="tg">' + esc(c.population) + '</span>' : '') + (c.prevoyance ? '<span class="tg pv">Prévoyance de branche</span>' : '') +
          (plus ? (on ? '<span class="tg ok">Retenue pour le devis</span>' : '<button type="button" data-idcc="' + esc(c.code) + '">Retenir</button>') : '') + '</li>';
      }).join('') + '</ul>' +
      '<p class="n">' + (plus ? 'Chaque catégorie de salariés relève de sa convention. Votre expert applique la bonne à chacune pour la santé et la prévoyance.' : 'À confirmer avec votre expert.') + lien + '</p>';
  }
  function retenir(code) {
    var box = $('dvIdccDecl'); if (box) box.classList.remove('miss');
    if (code === 'nsp') {
      $('e-idcc').value = ''; if (S.ent) { S.ent.idcc = ''; S.ent.idccNsp = true; }
      if (typeof fillDvCcn === 'function') fillDvCcn();
      if (window.BRH_PREV) BRH_PREV.maj('');
      paint(); if (typeof save === 'function') save();
      if (typeof track === 'function') track('devis_ccn', { choix: 'nsp_parmi_declarees', nombre: conv().length });
      return;
    }
    var c = conv().filter(function (x) { return x.code === code; })[0]; if (!c) return;
    $('e-idcc').value = texte(c);
    if (S.ent) { S.ent.idcc = texte(c); S.ent.idccNsp = false; }
    if (typeof fillDvCcn === 'function') fillDvCcn();
    if (window.BRH_PREV) BRH_PREV.maj(texte(c));
    paint(); if (typeof save === 'function') save();
    if (typeof track === 'function') track('devis_ccn', { choix: 'declaree', idcc: code });
  }

  /* ---------- liste déroulante : conventions déclarées en tête ---------- */
  function optgroup() {
    var sel = $('e-ccn'), l = conv(); if (!sel) return;
    if (!l.length) { if (S.ent && S.ent.sansConvention && $('e-idcc').value === 'Aucune convention collective') sel.value = 'aucune'; return; }
    l.forEach(function (c) { [].slice.call(sel.querySelectorAll('option[value="' + c.code + '"]')).forEach(function (o) { o.parentNode.removeChild(o); }); });
    [].slice.call(sel.querySelectorAll('optgroup')).forEach(function (g) { if (!g.children.length) g.parentNode.removeChild(g); });
    var g = document.createElement('optgroup'); g.label = 'Déclarées par votre entreprise';
    l.forEach(function (c) { var o = document.createElement('option'); o.value = c.code; o.textContent = (c.libelle || 'Convention') + ' — IDCC ' + c.code + (c.population ? ' (' + c.population + ')' : ''); g.appendChild(o); });
    sel.insertBefore(g, sel.children[1] || null);
    var cur = codeDe($('e-idcc').value);
    if (!(S.ent && S.ent.idccNsp) && l.some(function (c) { return c.code === cur; })) sel.value = cur;
  }

  /* ---------- texte « Source » sous la fiche entreprise ---------- */
  function source() {
    var p = $('dvSrc'), src = S.entSrc && S.entSrc.source; if (!p || !conv().length || src === 'demo' || src === 'manuel') return;
    p.textContent = p.textContent.replace(/ ?(L’effectif et la convention collective sont à confirmer\.|Conventions collectives : déclarations sociales .*)$/, '') +
      ' Conventions collectives : déclarations sociales (DSN) publiées sur l’Annuaire des entreprises. L’effectif et la convention retenue sont à confirmer.';
  }

  /* ============ remplissage de la fiche entreprise ============ */
  var _fill = fillEntreprise;
  var vu = { siret: '', t: 0 };
  fillEntreprise = function (d, noFocus) {
    d = Object.assign({}, d || {});
    vu = { siret: String(d.siret || '').replace(/\D/g, ''), t: Date.now(), liste: Array.isArray(d.idcc_liste) };
    var frais = Array.isArray(d.idcc_liste), memo = !frais && d.source !== 'manuel' ? memoLire(d.siret) : null;
    var l = frais ? normaliser(d.idcc_liste) : (Array.isArray(d.conventions) ? d.conventions : (memo ? memo.conventions : []));
    var sans = frais ? !!d.sans_convention : !!(d.sansConvention || (memo && memo.sans));
    if (l.length) {
      var cur = codeDe(d.idcc), garde = !frais && (l.some(function (c) { return c.code === cur; }) || (l.length > 1 && !cur));
      if (!garde) {
        var pref = codeDe(S.prefIdcc), dejaDit = l.filter(function (c) { return c.code === pref; })[0];
        /* une seule convention : préremplie ; plusieurs : le visiteur choisit (sauf s'il l'a déjà indiquée dans l'audit ou le diagnostic) */
        d.idcc = l.length === 1 ? texte(l[0]) : (dejaDit ? texte(dejaDit) : '');
      }
      d.idcc_confirme = true;          // déclarée : statut « Trouvé » (à confirmer par l'expert, comme le rappelle l'aide)
    } else if (sans && !S.prefIdcc && !d.idcc) d.idcc = 'Aucune convention collective';
    if (!d.secteur && !S.prefSecteur && d.source !== 'manuel' && d.source !== 'demo') d.secteur = secteurDe(l, d.naf);
    var r = _fill.call(this, d, noFocus);
    attacher(l, sans, d.verifier || (memo && memo.verifier));
    if (typeof fillDvCcn === 'function') fillDvCcn();
    if (l.length > 1 && !d.idcc && window.BRH_PREV) BRH_PREV.maj('');
    paint(); source();
    if (typeof save === 'function') save();
    if (frais && typeof track === 'function') track('devis_idcc_declarees', { nombre: l.length, codes: l.map(function (c) { return c.code; }).join(','), sans_convention: sans });
    /* serveur sans la liste des conventions (entreprise.php du socle) : fiche publique lue dans le navigateur */
    var id = String(d.siret || d.siren || '').replace(/\D/g, '');
    if (!frais && !l.length && !memo && window.BRH_FICHE && d.source && d.source !== 'demo' && d.source !== 'manuel' && (id.length === 14 || id.length === 9)) {
      BRH_FICHE.fiche(id).then(function (f) {
        if (!f || !S.ent || String(S.ent.siret || '').replace(/\D/g, '').slice(0, 9) !== id.slice(0, 9)) return;
        if (!f.idcc_liste.length && !f.sans_convention) return;
        fillEntreprise(Object.assign({}, d, { idcc_liste: f.idcc_liste, sans_convention: f.sans_convention, idcc: '', tranche: d.tranche || f.tranche, verifier: f.verifier,
          secteur: S.prefSecteur ? d.secteur : '' }), true);
      });
    }
    return r;
  };

  if (typeof fillDvCcn === 'function') {
    var _fdc = fillDvCcn;
    fillDvCcn = function () { var r = _fdc.apply(this, arguments); optgroup(); return r; };
  }
  if (typeof onDvCcn === 'function') {
    var _odc = onDvCcn;
    onDvCcn = function () {
      var r = _odc.apply(this, arguments), v = $('e-ccn').value;
      var c = conv().filter(function (x) { return x.code === v; })[0];
      if (c) { $('e-idcc').value = texte(c); if (S.ent) S.ent.idcc = texte(c); if (window.BRH_PREV) BRH_PREV.maj(texte(c)); if (typeof save === 'function') save(); }
      paint(); return r;
    };
  }
  if ($('e-idcc')) $('e-idcc').addEventListener('input', function () { var b = $('dvIdccDecl'); if (b && choixFait()) b.classList.remove('miss'); paint(); });

  /* ============ étape 2 : choix obligatoire quand plusieurs conventions sont déclarées ============ */
  if (typeof validateEntreprise === 'function') {
    var _ve = validateEntreprise;
    validateEntreprise = function () {
      var ok = _ve.apply(this, arguments); if (!ok) return ok;
      var sante = typeof dvSante !== 'function' || dvSante();
      if (sante && aChoisir() && !choixFait()) {
        var b = $('dvIdccDecl'); if (b) { b.classList.add('miss'); paint(); if (b.scrollIntoView) b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        if (typeof showErr === 'function') showErr('err2', 'Votre entreprise a déclaré plusieurs conventions collectives : choisissez celle qui sert de base à votre devis (ou « Je ne sais pas »).');
        if (typeof track === 'function') track('devis_ccn_a_choisir', { nombre: conv().length });
        return false;
      }
      return ok;
    };
  }

  /* ============ étape 4 (santé et prévoyance) : rappel des autres conventions ============ */
  if (typeof renderTabs === 'function') {
    var _rt = renderTabs;
    renderTabs = function () {
      var r = _rt.apply(this, arguments), t = $('sp_idcc_txt'), cur = codeDe(S.ent && S.ent.idcc);
      var autres = conv().filter(function (c) { return c.code !== cur; });
      if (t && autres.length && cur) t.textContent += ' Autres conventions déclarées : ' + autres.map(function (c) { return 'IDCC ' + c.code + (c.population ? ' (' + c.population.toLowerCase() + ')' : ''); }).join(', ') + ' : votre expert en tient compte pour les salariés concernés.';
      return r;
    };
  }

  /* ============ envoi : toutes les conventions transmises à l'expert ============ */
  /* lead.entreprise.idcc (admin-leads, devis PDF, synthèse IA) : « 2609 — Bâtiment, ETAM (+ IDCC 2420) » ;
     le détail complet part dans lead.entreprise.source_donnees.conventions */
  if (typeof submitDevis === 'function') {
    var _sd = submitDevis;
    submitDevis = function () {
      var garde = S.ent && S.ent.idcc, cur = codeDe(garde), autres = conv().filter(function (c) { return c.code !== cur; });
      if (S.ent && cur && autres.length) S.ent.idcc = garde + ' (+ IDCC ' + autres.map(function (c) { return c.code; }).join(', ') + ')';
      else if (S.ent && !cur && !String(garde || '').trim() && aChoisir()) S.ent.idcc = 'À choisir avec l’expert parmi IDCC ' + conv().map(function (c) { return c.code; }).join(', ');
      var remettre = function () { if (S.ent) S.ent.idcc = garde; };
      try { return Promise.resolve(_sd.apply(this, arguments)).then(function (x) { remettre(); return x; }, function (e) { remettre(); throw e; }); }
      catch (e) { remettre(); throw e; }
    };
  }

  /* ============ reprise d'un devis déjà commencé (rechargement, retour arrière) ============ */
  function reprendre() {
    if (!S.ent) return;
    if (S.ent.conventions && S.ent.conventions.length) { attacher(S.ent.conventions, S.ent.sansConvention, S.ent.verifier); fillDvCcn(); paint(); source(); return; }
    var m = memoLire(S.ent.siret);
    if (m) { attacher(m.conventions || [], m.sans, m.verifier); fillDvCcn(); paint(); source(); return; }
    /* entreprise identifiée dans le diagnostic : liste reprise du profil, sinon redemandée au serveur */
    var pe = null; try { pe = (JSON.parse(sessionStorage.getItem('brhProfil') || '{}')).entreprise || null; } catch (e) {}
    if (pe && Array.isArray(pe.idcc_liste) && (!pe.siret || pe.siret === S.ent.siret)) { attacher(normaliser(pe.idcc_liste), pe.sans_convention, pe.verifier); fillDvCcn(); paint(); source(); return; }
    var src = S.entSrc && S.entSrc.source, s = String(S.ent.siret || '').replace(/\D/g, '');
    if (s.length !== 14 || src === 'demo' || src === 'manuel' || !window.fetch || typeof DEVIS_CONFIG === 'undefined' || !DEVIS_CONFIG.ENTREPRISE_ENDPOINT) return;
    fetch(DEVIS_CONFIG.ENTREPRISE_ENDPOINT + '?siret=' + s, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (!j || j.error || !Array.isArray(j.idcc_liste) || !S.ent || S.ent.siret !== s) return;
        var l = normaliser(j.idcc_liste); attacher(l, j.sans_convention, j.verifier);
        if (l.length === 1 && !codeDe($('e-idcc').value) && !S.ent.idccNsp) { var p = l[0]; $('e-idcc').value = texte(p); S.ent.idcc = texte(p); if (window.BRH_PREV) BRH_PREV.maj(texte(p)); }
        fillDvCcn(); paint(); source(); if (typeof save === 'function') save(); })
      .catch(function () {});
  }
  reprendre();

  /* filet de sécurité : si la page appelle sa propre copie du remplissage (socle plus récent), la réponse
     d'entreprise.php est relue ici et la fiche est complétée avec toutes les conventions déclarées */
  var _fetch = window.fetch;
  if (_fetch) window.fetch = function (u, o) {
    var p = _fetch.apply(this, arguments);
    try {
      if (/(^|\/)entreprise\.php\?(siret|siren)=/.test(String(u))) {
        p.then(function (r) { return r.clone().json(); }).then(function (j) {
          if (!j || j.error || !Array.isArray(j.idcc_liste)) return;
          setTimeout(function () {
            var sj = String(j.siret || '').replace(/\D/g, '');
            if (vu.siret === sj && vu.liste && Date.now() - vu.t < 4000) return;   // déjà traité par le module
            if (window.console) console.info('idcc-devis.js : conventions déclarées appliquées par relecture de la réponse (' + j.idcc_liste.length + ')');
            fillEntreprise(Object.assign({}, j), true);
          }, 120);
        }).catch(function () {});
      }
    } catch (e) {}
    return p;
  };
  if (window.console) console.info('idcc-devis.js chargé : choix des conventions collectives déclarées actif');

  window.BRH_IDCC = { normaliser: normaliser, principale: principale, secteurDe: secteurDe, libelle: libelle, conventions: conv };
})();
