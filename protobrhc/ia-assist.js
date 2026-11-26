/* Version C 1.0 — 14/11/2026 · module IA commun · historique : VERSIONS.md */
/* ==============================================================
   IA DU PARCOURS — module partagé (version C du test A/B, protobrhc)
   Chargé par variante.js, avant ia-accueil.js, ia-diagnostic.js et ia-devis.js.
   - BRH_IA.run(action, ctx, repli) : appelle ia.php (Mistral) ; si l'IA
     n'est pas joignable (clé absente, hors ligne…), applique la règle
     locale « repli » : la page reste démontrable, avec la mention
     « Mode démonstration ».
   - Benchmark « entreprises similaires » et table département → CR :
     DONNÉES DE DÉMONSTRATION, à remplacer par l'étude client (400
     dirigeants), les données d'équipement agrégées et la table officielle.
   Principe : l'IA explique, inspire et prépare ; le moteur calcule ;
   l'humain conseille et signe.
   ============================================================== */
(function () {
  'use strict';
  if (window.BRH_IA) return;
  var ENDPOINT = 'ia.php';
  var AX = {
    protection:    { court: 'Protéger',        long: 'Protéger vos salariés',          sol: 'sante' },
    partageValeur: { court: 'Partager',        long: 'Partager la valeur',             sol: 'epargne' },
    pouvoirAchat:  { court: "Pouvoir d'achat", long: "Donner du pouvoir d'achat",      sol: 'avantages' },
    retraite:      { court: 'Retraite',        long: 'Préparer la retraite',           sol: 'retraite' }
  };
  var SOL = { epargne: 'Épargne salariale', sante: 'Santé & prévoyance', retraite: 'Retraite collective', avantages: 'Avantages salariés' };

  /* ---------- benchmark de démonstration : priorités moyennes (1 à 4) par secteur ---------- */
  var BENCH = {
    'Industrie':                     [3.4, 3.3, 2.8, 2.9, 'attirer et fidéliser des profils techniques'],
    'BTP':                           [3.6, 2.6, 3.1, 2.5, 'protéger des métiers exposés et fidéliser les compagnons'],
    'Commerce':                      [2.9, 2.7, 3.5, 2.3, 'fidéliser les équipes en magasin'],
    'Hôtellerie-restauration':       [2.8, 2.4, 3.7, 2.1, 'attirer et retenir dans un secteur en tension'],
    'Transport et logistique':       [3.5, 2.6, 3.3, 2.6, 'fidéliser les conducteurs'],
    'Services aux entreprises':      [3.0, 3.4, 3.0, 2.9, 'attirer des talents qualifiés'],
    'Santé et social':               [3.2, 2.7, 3.4, 2.6, 'fidéliser des équipes rares (soignants, préparateurs)'],
    'Services à la personne':        [3.1, 2.2, 3.5, 2.0, 'fidéliser des intervenants très mobiles'],
    'Artisanat alimentaire':         [2.9, 2.4, 3.4, 2.2, 'attirer des apprentis et fidéliser les équipes'],
    'Agriculture et paysage':        [3.3, 2.3, 3.1, 2.4, 'fidéliser des saisonniers et des permanents'],
    'Banque, assurance, immobilier': [3.0, 3.5, 2.8, 3.2, 'associer les équipes aux résultats'],
    'Association':                   [3.0, 1.8, 3.2, 2.2, 'reconnaître l’engagement des salariés'],
    'Autre':                         [3.1, 2.8, 3.1, 2.5, 'fidéliser les salariés']
  };
  function tranche(n) { n = +n || 0; return n < 11 ? 'moins de 11 salariés' : n < 50 ? '11 à 49 salariés' : n < 250 ? '50 à 249 salariés' : '250 salariés et plus'; }
  function bench(secteur, effectif, departement) {
    var b = BENCH[secteur] || BENCH['Autre'], n = +effectif || 0;
    var adj = n < 11 ? [0, -0.3, 0.2, -0.2] : n < 50 ? [0, 0.1, 0, 0] : n < 250 ? [0.1, 0.5, -0.1, 0.3] : [0.1, 0.6, -0.2, 0.5];
    var keys = ['protection', 'partageValeur', 'pouvoirAchat', 'retraite'], pr = {};
    keys.forEach(function (k, i) { pr[k] = Math.round(Math.max(1, Math.min(4, b[i] + adj[i])) * 10) / 10; });
    return { secteur: secteur || 'tous secteurs', taille: tranche(n), region: departement ? 'département ' + departement + ' et voisins' : 'France',
             enjeu_frequent: b[4], priorites: pr, source: 'panel de démonstration (à remplacer par l’étude client et les données agrégées)' };
  }

  /* ---------- table de démonstration département → Caisse régionale ---------- */
  var CR = {
    'Touraine Poitou': ['37', '86'], 'Pyrénées Gascogne': ['64', '65', '32'], 'Centre Loire': ['18', '45', '58'],
    'Val de France': ['28', '41'], 'Anjou Maine': ['49', '53', '72'], 'Atlantique Vendée': ['44', '85'],
    'Paris et Île-de-France': ['75', '78', '91', '92', '93', '94', '95'], 'Brie Picardie': ['60', '77', '80'],
    'Charente-Maritime Deux-Sèvres': ['17', '79'], 'Centre Ouest': ['36', '87'], 'Aquitaine': ['33', '40', '47'],
    'Nord de France': ['59', '62'], 'Normandie': ['14', '50', '61'], 'Normandie-Seine': ['27', '76'],
    'Alpes Provence': ['05', '13', '84'], 'Centre-Est': ['01', '69', '71'], 'Sud Rhône Alpes': ['07', '26', '38'],
    'Ille-et-Vilaine': ['35'], 'Côtes d’Armor': ['22'], 'Finistère': ['29'], 'Morbihan': ['56']
  };
  function caisse(dep) {
    dep = String(dep || '').toUpperCase().slice(0, 2);
    for (var k in CR) if (CR[k].indexOf(dep) >= 0) return { nom: 'Crédit Agricole ' + k, connue: true, dep: dep };
    return { nom: dep ? 'la Caisse régionale du département ' + dep : 'votre Caisse régionale', connue: false, dep: dep };
  }

  /* ---------- appel du moteur IA ---------- */
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function unb64(s) { return decodeURIComponent(escape(atob(s))); }
  function call(action, ctx) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    return fetch(ENDPOINT, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                             body: b64(JSON.stringify({ action: action, ctx: ctx })), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { clearTimeout(t); if (j && j.e && j.b) j = JSON.parse(unb64(j.b)); return j && j.ok && j.data ? j : null; })
      .catch(function () { clearTimeout(t); return null; });
  }
  function run(action, ctx, repli) {
    track('ia_' + action, {});
    return call(action, ctx).then(function (j) {
      if (j) return { data: j.data, source: 'mistral' };
      if (window.console) console.info('IA BRH : mode démonstration pour « ' + action + ' » (ia.php indisponible ou clé absente).');
      return { data: typeof repli === 'function' ? repli(ctx) : null, source: 'demo' };
    });
  }
  function track(e, p) { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: e }, p || {})); }

  /* ---------- règles de repli (sans IA) ---------- */
  var IDEES = {
    pouvoirAchat:  ['Titres-restaurant et avantages du quotidien', 'Visibles dès le premier mois, ils renforcent l’attractivité sans alourdir vos charges.'],
    protection:    ['Mutuelle et prévoyance de qualité', 'Une bonne couverture rassure vos salariés et leur famille, et pèse dans la décision de rester.'],
    partageValeur: ['Prime de partage de la valeur ou intéressement', 'Associer les salariés aux résultats motive et fidélise.'],
    retraite:      ['Plan d’épargne retraite d’entreprise', 'Un avantage différenciant pour fidéliser les profils expérimentés.']
  };
  var R = {
    inspire: function (c) {
      var p = c.benchmark.priorites, ks = Object.keys(p).sort(function (a, b) { return p[b] - p[a]; });
      return { intro: 'Les entreprises qui vous ressemblent (' + c.benchmark.secteur.toLowerCase() + ', ' + c.benchmark.taille + ') priorisent d’abord « ' + AX[ks[0]].long.toLowerCase() + ' » et « ' + AX[ks[1]].long.toLowerCase() + ' ». Leur enjeu le plus fréquent : ' + c.benchmark.enjeu_frequent + '.',
               idees: ks.slice(0, 3).map(function (k) { return { axe: k, titre: IDEES[k][0], pourquoi: IDEES[k][1] }; }),
               question: 'Votre premier souhait : attirer de nouveaux talents, ou garder ceux que vous avez ?' };
    },
    explique: function (c) {
      var r = c.resultats || {}, s = c.scenario, nf = function (n) { return eur(n); };
      var t;
      if (c.page === 'devis') {
        t = 'Pour ' + r.salaries + ' salarié' + (r.salaries > 1 ? 's' : '') + ', vos solutions coûtent environ ' + nf(r.cout_total) + ' par an à l’entreprise. '
          + (r.gain_net_moyen_par_salarie ? 'Chaque salarié en retire en moyenne ' + nf(r.gain_net_moyen_par_salarie) + ' nets par an. ' : '')
          + (r.economie_vs_hausse_salaire > 0 ? 'Obtenir le même gain net par une hausse de salaire coûterait ' + nf(r.economie_vs_hausse_salaire) + ' de plus, car un euro net de salaire coûte environ 1,81 € à l’employeur.' : '');
      } else {
        t = 'Avec ' + r.effectif + ' salariés et ' + (r.dispositifs_actifs || []).length + ' dispositif(s) prioritaire(s), le portail estime un gain d’environ ' + nf(r.gain_fiscal_annuel) + ' par an pour l’entreprise et ' + nf(r.gain_pouvoir_achat_par_salarie) + ' de pouvoir d’achat par salarié. Ces avantages sont en grande partie exonérés de charges, contrairement à une hausse de salaire.';
      }
      if (s) t = s.libelle + ' : l’estimation passe de ' + nf(s.avant) + ' à ' + nf(s.apres) + ' par an (' + (s.apres - s.avant >= 0 ? '+' : '') + nf(s.apres - s.avant) + '). ' + t;
      if (c.question) t += ' Pour votre question précise, un expert BRH vous répond avec les règles applicables à votre entreprise.';
      return { explication: t, points: ['Montants calculés par le moteur du portail, à partir de vos réponses', 'Estimation indicative et non contractuelle', 'Un expert BRH confirme les hypothèses avec vous'], vigilance: '' };
    },
    preconise: function (c) {
      var pr = c.priorites || {}, n = +c.effectif || 0, deja = (c.deja || []).join(' ').toLowerCase(), panier = c.panier || null;
      var ks = Object.keys(AX).filter(function (k) { return (pr[k] || 1) > 1; }).sort(function (a, b) { return (pr[b] || 0) - (pr[a] || 0); });
      if (panier && panier.length) ks = panier.map(function (s) { for (var k in AX) if (AX[k].sol === s) return k; }).filter(Boolean);
      if (!ks.length) ks = ['pouvoirAchat', 'protection'];
      var simple = n >= 5 && n <= 50;
      var pistes = ks.slice(0, 3).map(function (k, i) {
        var sol = AX[k].sol, mut = sol === 'sante' && deja.indexOf('mutuelle') >= 0;
        return { titre: mut ? 'Compléter votre mutuelle par la prévoyance' : IDEES[k][0], solution: sol,
                 pourquoi: IDEES[k][1] + (pr[k] ? ' Vous l’avez noté ' + pr[k] + '/4.' : ''),
                 quand: mut && /échéance/.test(deja) ? 'À l\'échéance' : (i === 0 ? 'Maintenant' : 'Ensuite'),
                 canal: (simple && (sol === 'avantages' || sol === 'epargne')) ? 'Devis en ligne' : 'Avec un expert' };
      });
      return { constat: 'Entreprise de ' + (n || '?') + ' salariés' + (c.secteur ? ' (' + String(c.secteur).toLowerCase() + ')' : '') + ' : on commence par ce que vous avez noté comme le plus prioritaire.',
               pistes: pistes, prochaine_etape: simple ? 'Obtenez votre devis en ligne pour la première piste ; un expert BRH vous accompagne pour les suivantes.' : 'Un expert BRH de votre Caisse régionale construit la proposition avec vous.' };
    },
    synthese: function (c) {
      var e = c.entreprise || {}, l = [];
      l.push((e.secteur || 'Entreprise') + ', ' + (e.effectif || '?') + ' salariés' + (e.departement ? ', département ' + e.departement : '') + (e.idcc ? ', convention ' + e.idcc : ''));
      if (c.priorites) l.push('Priorités : ' + Object.keys(c.priorites).filter(function (k) { return c.priorites[k] >= 3 && AX[k]; }).map(function (k) { return AX[k].court; }).join(', '));
      if (c.gains && c.gains.fiscalAnnuel) l.push('Gains estimés par le portail : ' + eur(c.gains.fiscalAnnuel) + ' / an');
      if (c.panier && c.panier.length) l.push('Panier : ' + c.panier.map(function (p) { return p.libelle || SOL[p] || p; }).join(', '));
      if (c.deja && c.deja.length) l.push('Déjà en place : ' + c.deja.join(', '));
      if (c.estimation_totale) l.push('Coût employeur estimé : ' + eur(c.estimation_totale) + ' / an');
      return { titre: (e.secteur || 'Entreprise') + ' · ' + (e.effectif || '?') + ' salariés · ' + (c.score ? 'lead ' + c.score : 'lead qualifié'),
               synthese: l.slice(0, 5), questions: ['Quel est votre premier enjeu : attirer ou fidéliser ?', 'Quels dispositifs avez-vous déjà, et à quelle échéance ?', 'Qui décide avec vous (associé, expert-comptable) ?'],
               pieces: ['Contrat de mutuelle et de prévoyance en cours', 'Dernier bilan ou chiffre d’affaires', 'Convention collective appliquée'],
               angle: 'Partir de l’enjeu déclaré et des gains estimés, puis proposer un plan en étapes.' };
    }
  };

  /* ---------- affichage ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function eur(n) { return Math.round(+n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €'; }
  var SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>';
  function badge() { return '<span class="ia-badge">' + SPARK + 'IA</span>'; }
  function source(src) {
    return '<p class="ia-src">' + (src === 'mistral' ? 'Généré par l’IA (Mistral) à partir de vos réponses et de la base documentaire validée. Orientation indicative : un expert BRH valide avec vous.'
                                                     : 'Mode démonstration : règles du portail, sans appel à l’IA. Orientation indicative.') + '</p>';
  }
  function loading(el, txt) { el.innerHTML = '<div class="ia-load"><span class="ia-dot"></span><span class="ia-dot"></span><span class="ia-dot"></span>' + esc(txt || 'L’IA prépare sa réponse…') + '</div>'; }
  function list(a) { return '<ul class="ia-list">' + (a || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  var CSS = '.ia-box{margin:18px 0 6px;border:1.5px solid var(--lime-soft,#c7dd8a);background:#fbfdf7;border-radius:16px;padding:16px 18px;font-size:.9rem;color:var(--ink,#233029)}'
    + '.ia-box.ia-compact{padding:12px 14px}.ia-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}'
    + '.ia-head h3,.ia-head h4{margin:0;font-family:var(--fh,inherit);font-size:1rem;color:var(--green,#065145)}'
    + '.ia-badge{display:inline-flex;align-items:center;gap:4px;background:var(--green,#065145);color:#fff;border-radius:999px;padding:2px 9px 2px 7px;font-size:.72rem;font-weight:700;letter-spacing:.03em}'
    + '.ia-badge svg{width:13px;height:13px}.ia-lede{color:var(--slate,#5c6b64);margin:2px 0 10px;font-size:.86rem}'
    + '.ia-btn{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--green,#065145);background:#fff;color:var(--green,#065145);border-radius:999px;padding:.5rem 1rem;font-family:var(--fh,inherit);font-weight:600;font-size:.86rem;cursor:pointer;text-decoration:none}'
    + '.ia-btn:hover{background:var(--mint-2,#eef4ef)}.ia-btn.pri{background:var(--green,#065145);color:#fff}.ia-btn.pri:hover{background:var(--green-hover,#02392f)}.ia-btn svg{width:15px;height:15px}'
    + '.ia-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}.ia-chip{border:1px solid var(--line-2,#dfe6e2);background:#fff;border-radius:999px;padding:.35rem .8rem;font-size:.8rem;cursor:pointer;color:var(--ink,#233029)}.ia-chip:hover{border-color:var(--green,#065145)}'
    + '.ia-out{margin-top:12px}.ia-out p{margin:0 0 8px;line-height:1.5}.ia-src{font-size:.74rem!important;color:var(--slate,#5c6b64);margin-top:10px!important;font-style:italic}'
    + '.ia-list{margin:6px 0 8px 18px;padding:0}.ia-list li{margin:3px 0}'
    + '.ia-bars{display:grid;grid-template-columns:auto 1fr auto;gap:6px 10px;align-items:center;margin:10px 0;font-size:.8rem}.ia-bar{height:8px;border-radius:6px;background:var(--line,#e7ece9);position:relative;overflow:hidden}.ia-bar i{position:absolute;left:0;top:0;bottom:0;background:var(--lime,#8fb822);border-radius:6px}'
    + '.ia-ideas{display:grid;gap:8px;margin:8px 0}.ia-idea{background:#fff;border:1px solid var(--line,#e7ece9);border-radius:12px;padding:9px 12px}.ia-idea b{color:var(--green,#065145)}'
    + '.ia-pistes{display:grid;gap:10px;margin:10px 0}.ia-piste{display:grid;grid-template-columns:32px 1fr;gap:10px;background:#fff;border:1px solid var(--line,#e7ece9);border-radius:12px;padding:10px 12px}'
    + '.ia-n{width:28px;height:28px;border-radius:50%;background:var(--green,#065145);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem}'
    + '.ia-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}.ia-tag{font-size:.7rem;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--mint,#e9f1ea);color:var(--green,#065145)}.ia-tag.when{background:#fdf1d6;color:#8a5a00}'
    + '.ia-ask{display:flex;gap:8px;margin-top:10px}.ia-ask input{flex:1;min-width:0;border:1.5px solid var(--line-2,#dfe6e2);border-radius:999px;padding:.5rem .9rem;font-size:16px}'
    + '.ia-load{display:flex;align-items:center;gap:5px;color:var(--slate,#5c6b64);font-size:.84rem}.ia-dot{width:7px;height:7px;border-radius:50%;background:var(--lime,#8fb822);animation:iaP 1s infinite}.ia-dot:nth-child(2){animation-delay:.15s}.ia-dot:nth-child(3){animation-delay:.3s}@keyframes iaP{0%,100%{opacity:.25}50%{opacity:1}}'
    + '.ia-mail{background:#fff;border:1px solid var(--line-2,#dfe6e2);border-radius:12px;padding:12px 14px;margin:10px 0;text-align:left;font-size:.85rem}.ia-mail .h{font-size:.76rem;color:var(--slate,#5c6b64);border-bottom:1px solid var(--line,#e7ece9);padding-bottom:6px;margin-bottom:8px}'
    + '.ia-expert{background:#26343a;color:#fff;border-radius:14px;padding:14px 16px;margin:10px 0;text-align:left;font-size:.84rem}.ia-expert h4{margin:0 0 6px;font-size:.95rem;color:#c7dd8a}.ia-expert .k{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#9fc7c0;margin-top:8px}.ia-expert ul{margin:4px 0 0 18px;padding:0}'
    + '.ia-route{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.8rem;margin:6px 0}.ia-route span{background:var(--mint,#e9f1ea);color:var(--green,#065145);border-radius:999px;padding:3px 10px;font-weight:600}'
    + '.ia-ai-note{font-size:.72rem;color:var(--slate,#5c6b64);margin-top:6px}.ia-hidden{display:none!important}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  window.BRH_IA = { repli: R, run: run, bench: bench, caisse: caisse, AX: AX, SOL: SOL, esc: esc, eur: eur, md: md, list: list, badge: badge, source: source, loading: loading, track: track, SPARK: SPARK };
})();
