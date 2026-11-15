/* Version C 1.9 — 15/11/2026 · reprise de l’effectif, du secteur, du département et de l’entreprise déjà indiqués ailleurs · historique : VERSIONS.md */
/* ==============================================================
   DIAGNOSTIC RH — préremplissage par SIREN / SIRET (version C, protobrhc)
   Surcouche de diagnostic.html (chercherEntreprise, BRH_ENT.chercher, state, onSecteur,
   onDepartement, onEffectif), sans modifier la page. À la recherche du SIREN ou du SIRET :
     - Secteur d'activité : déduit de la convention collective déclarée, puis du code NAF
       (BRIAND, NAF 70.22Z « conseil » mais IDCC 2420 / 2609 du bâtiment → BTP) ;
     - Nombre de salariés : la tranche d'effectif de la fiche publique (INSEE) est affichée
       sous le champ ; si l'effectif n'a pas encore été saisi, il est prérempli avec le bas
       de la tranche, à ajuster ; s'il sort de la tranche, un rappel propose de la reprendre ;
     - Département : celui du siège (ou de l'établissement du SIRET), avec la commune ;
     - Convention collective : plusieurs conventions déclarées → aucune n'est présélectionnée,
       le visiteur choisira dans le devis (rappel affiché).
   Données : entreprise.php (version C) puis, à défaut, la fiche publique lue par entreprise-public.js.
   ============================================================== */
(function () {
  'use strict';
  if (!window.BRH_ENT || typeof BRH_ENT.chercher !== 'function' || !document.getElementById('effectif')) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var codeDe = function (t) { var m = String(t || '').match(/^\s*(\d{1,4})\b/); return m ? String(parseInt(m[1], 10)) : ''; };
  var st = document.createElement('style');
  st.textContent = '.dg-pub{display:block;margin-top:6px;font-size:.8rem;line-height:1.4;color:var(--slate,#5b6b66)}.dg-pub b{color:var(--green,#065145)}' +
    '.dg-pub button{margin-left:6px;border:1px solid var(--line-2,#dfe6e2);background:#fff;border-radius:999px;padding:2px 10px;font:600 .76rem inherit;color:var(--green,#065145);cursor:pointer}' +
    '.dg-pub.hors{color:#8a5d0e}';
  document.head.appendChild(st);

  /* secteur : la convention collective déclarée l'emporte sur le code NAF */
  function secteurIdcc(liste) {
    if (!window.BRH_CCN) return '';
    for (var i = 0; i < liste.length; i++) for (var j = 0; j < BRH_CCN.secteurs.length; j++) {
      var s = BRH_CCN.secteurs[j], cs = BRH_CCN.list(s, 5).concat(BRH_CCN.list(s, 50));
      if (cs.some(function (c) { return c[0] === liste[i]; })) return s;
    }
    return '';
  }
  function completer(d) {
    if (!d || d.source === 'demo' || Array.isArray(d.idcc_liste) || !window.BRH_FICHE) return Promise.resolve(d);
    return BRH_FICHE.fiche(d.siret || d.siren).then(function (f) {
      if (!f) return d;
      return Object.assign({}, d, { idcc_liste: f.idcc_liste, sans_convention: f.sans_convention, tranche: d.tranche || f.tranche,
        cp: d.cp || f.cp, ville: d.ville || f.ville, annee_tranche: f.annee_tranche, departement: d.departement || BRH_ENT.departement(f.cp) });
    });
  }
  function ameliorer(d) {
    var liste = (d.idcc_liste || []).map(function (c) { return codeDe(c && typeof c === 'object' ? (c.code || c.idcc) : c); }).filter(Boolean);
    d.codesIdcc = liste;
    var s = secteurIdcc(liste); if (s) d.secteur = s;
    if (liste.length > 1) d.idcc = '';                 // choix fait dans le devis
    else if (liste.length === 1 && !codeDe(d.idcc)) d.idcc = liste[0];
    if (!d.departement && d.cp) d.departement = BRH_ENT.departement(d.cp);
    return d;
  }
  function ligne(id, apres) {
    var el = $(id); if (el) return el;
    el = document.createElement('span'); el.id = id; el.className = 'dg-pub';
    apres.parentNode.insertBefore(el, apres.nextSibling); return el;
  }
  function apres(d) {
    /* effectif : tranche publique, préremplissage si rien n'a été saisi */
    var eff = $('effectif'), b = window.BRH_FICHE ? BRH_FICHE.bornes(d.tranche) : null, l = ligne('dgEff', eff.parentNode.querySelector('.hint') || eff);
    if (d.tranche && b) {
      var dejaSaisi = typeof state === 'object' && state.effSaisi;
      if (!dejaSaisi) { eff.value = b.min; if (typeof onEffectif === 'function') onEffectif(); }
      var majEff = function () {
        var n = +eff.value || 0, hors = n && (n < b.min || (b.max && n > b.max));
        l.className = 'dg-pub' + (hors ? ' hors' : '');
        l.innerHTML = 'Fiche publique (INSEE' + (d.annee_tranche ? ' ' + esc(d.annee_tranche) : '') + ') : <b>' + esc(d.tranche) + '</b>' +
          (hors ? '. Votre saisie sort de cette tranche : gardez-la si elle est plus récente.<button type="button" data-eff="' + b.min + '">Reprendre ' + b.min + '</button>'
                : (!dejaSaisi ? '. Prérempli avec ' + b.min + ', ajustez si besoin.' : ''));
      };
      majEff(); dejaSaisi = true;
      eff.addEventListener('input', majEff);
      l.onclick = function (e) { var x = e.target.getAttribute && e.target.getAttribute('data-eff'); if (x) { eff.value = x; if (typeof onEffectif === 'function') onEffectif(); majEff(); } };
    } else if (d.tranche) { l.innerHTML = 'Fiche publique (INSEE) : <b>' + esc(d.tranche) + '</b>.'; }
    else l.textContent = '';
    /* département : celui du siège ou de l'établissement */
    var dep = $('departement');
    if (dep && d.departement) {
      if (dep.value !== d.departement && d.departement.length <= 2) { dep.value = d.departement; if (typeof onDepartement === 'function') onDepartement(); }
      ligne('dgDep', $('dep-warn') || dep).innerHTML = 'Repris de la fiche publique : <b>' + esc(d.departement) + '</b>' + (d.ville ? ' (' + esc(d.ville) + ')' : '') + '.';
    }
    /* secteur : rappel de l'origine */
    var sel = $('secteur');
    if (sel && d.secteur && sel.value === d.secteur) {
      var src = d.codesIdcc && d.codesIdcc.length && secteurIdcc(d.codesIdcc) === d.secteur ? 'd’après la convention collective déclarée (IDCC ' + d.codesIdcc.join(', ') + ')' : 'd’après le code NAF ' + esc(d.naf || '');
      ligne('dgSec', sel).innerHTML = 'Prérempli ' + src + '.';
    }
    /* conventions multiples : choix dans le devis */
    var msg = $('siren-msg');
    if (msg && d.codesIdcc && d.codesIdcc.length > 1) {
      msg.className = 'hint ok';
      msg.textContent = '✓ ' + [d.nom, d.naf].filter(Boolean).join(' · ') + ' · ' + d.codesIdcc.length + ' conventions collectives déclarées (IDCC ' + d.codesIdcc.join(', ') + ') : vous choisirez celle de votre devis.';
    }
    try { var p = JSON.parse(sessionStorage.getItem('brhProfil') || '{}');
      if (p.entreprise) { p.entreprise.idcc_liste = d.idcc_liste || []; p.entreprise.tranche = d.tranche || p.entreprise.tranche; sessionStorage.setItem('brhProfil', JSON.stringify(p)); } } catch (e) {}
    if (typeof track === 'function') track('diagnostic_fiche_publique', { tranche: d.tranche || '', idcc: (d.codesIdcc || []).join(','), secteur: d.secteur || '' });
  }

  /* reprise de ce que le dirigeant a déjà indiqué ailleurs (label RH, audit mutuelle, devis), lu par variante.js
     avant que le diagnostic ne réécrive le profil : effectif saisi, secteur, département, puis entreprise (SIRET) */
  function reprendre() {
    var a = window.BRH_PROFIL_AVANT || {}, faits = [];
    if (a.effectifSaisi && +a.effectif > 0 && !(typeof state === 'object' && state.effSaisi)) { $('effectif').value = a.effectif; if (typeof onEffectif === 'function') onEffectif(); faits.push(a.effectif + ' salariés'); }
    var sel = $('secteur');
    if (sel && a.secteur && !sel.value) { sel.value = a.secteur; if (sel.value === a.secteur) { if (typeof onSecteur === 'function') onSecteur(); faits.push(a.secteur); } }
    var dep = $('departement');
    if (dep && a.departement && !dep.value && String(a.departement).length <= 2) { dep.value = a.departement; if (typeof onDepartement === 'function') onDepartement(); faits.push('département ' + a.departement); }
    var pe = a.entreprise || {}, sir = $('siren'), id = String(pe.siret || pe.siren || '').replace(/\D/g, '');
    if (sir && !sir.value && (id.length === 14 || id.length === 9)) { sir.value = id; if (typeof chercherEntreprise === 'function') chercherEntreprise(); return; }
    var msg = $('siren-msg'); if (msg && faits.length) { msg.className = 'hint ok'; msg.textContent = 'Repris de votre parcours : ' + faits.join(', ') + '. Vous pouvez les modifier.'; }
  }

  var _chercher = BRH_ENT.chercher;
  BRH_ENT.chercher = function (v) {
    return _chercher.apply(this, arguments).then(completer).then(function (d) {
      if (!d) return d;
      ameliorer(d);
      setTimeout(function () { apres(d); }, 0);   // après le préremplissage du socle (chercherEntreprise)
      return d;
    });
  };
  reprendre();
})();
