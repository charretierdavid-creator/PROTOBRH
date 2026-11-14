/* Version C 1.4 — 14/11/2026 · fiche publique lue dans le navigateur · historique : VERSIONS.md */
/* ==============================================================
   FICHE PUBLIQUE DE L'ENTREPRISE — complément côté navigateur (version C, protobrhc)
   Si le serveur n'a pas renvoyé la liste des conventions collectives (entreprise.php du socle,
   ou serveur injoignable), la fiche publique est lue directement dans l'API ouverte
   « Recherche d'entreprises » (recherche-entreprises.api.gouv.fr, sans clé, celle du site
   annuaire-entreprises.data.gouv.fr) : conventions collectives déclarées (DSN), tranche
   d'effectif INSEE, code postal et commune du siège ou de l'établissement.
   Utilisé par idcc-devis.js (devis) et diag-entreprise.js (diagnostic).
   ============================================================== */
(function () {
  'use strict';
  var API = 'https://recherche-entreprises.api.gouv.fr/search?';
  var TRANCHES = { NN: 'Non employeur', '00': '0 salarié', '01': '1 ou 2 salariés', '02': '3 à 5 salariés', '03': '6 à 9 salariés',
    '11': '10 à 19 salariés', '12': '20 à 49 salariés', '21': '50 à 99 salariés', '22': '100 à 199 salariés', '31': '200 à 249 salariés',
    '32': '250 à 499 salariés', '41': '500 à 999 salariés', '42': '1 000 à 1 999 salariés', '51': '2 000 à 4 999 salariés',
    '52': '5 000 à 9 999 salariés', '53': '10 000 salariés et plus' };
  var cache = {};
  function code(c) { c = String(c || '').replace(/\D/g, '').replace(/^0+/, ''); return c && c.length <= 4 ? c : ''; }
  /* « 20 à 49 salariés » → { min:20, max:49 } ; « 10 000 salariés et plus » → { min:10000, max:null } */
  function bornes(t) {
    var n = String(t || '').replace(/[\s\u00a0\u202f](?=\d{3}\b)/g, '').match(/\d+/g);
    if (!n || /non employeur/i.test(t)) return null;
    var a = +n[0], b = n[1] != null ? +n[1] : (/et plus/i.test(t) ? null : a);
    return a > 0 || b ? { min: Math.max(1, a), max: b } : null;
  }
  /* SIREN (9) ou SIRET (14) → Promise<{ idcc_liste:[{code, niveau}], sans_convention, tranche, cp, ville, siren } | null> */
  function fiche(id) {
    id = String(id || '').replace(/\D/g, '');
    if (id.length !== 9 && id.length !== 14) return Promise.resolve(null);
    if (cache[id]) return cache[id];
    if (!window.fetch) return Promise.resolve(null);
    var ctrl = window.AbortController ? new AbortController() : null, t = ctrl ? setTimeout(function () { ctrl.abort(); }, 6000) : null;
    cache[id] = fetch(API + 'q=' + id + '&per_page=1&limite_matching_etablissements=10', { headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (t) clearTimeout(t);
        var e = j && j.results && j.results[0];
        if (!e || e.siren !== id.slice(0, 9)) return null;
        var et = e.siege || {};
        if (id.length === 14) (e.matching_etablissements || []).forEach(function (m) { if (m.siret === id) et = Object.assign({}, et, m); });
        var vus = {}, liste = [], sans = false;
        [[et.liste_idcc, 'etablissement'], [(e.complements || {}).liste_idcc, 'entreprise']].forEach(function (x) {
          (x[0] || []).forEach(function (c) { c = code(c); if (!c) return; if (c === '9999' || c === '9998') { if (c === '9999') sans = true; return; }
            if (!vus[c]) { vus[c] = 1; liste.push({ code: c, niveau: x[1], source: 'Déclarations sociales (DSN) — Annuaire des entreprises' }); } });
        });
        return { siren: e.siren, idcc_liste: liste, sans_convention: sans && !liste.length, tranche: TRANCHES[e.tranche_effectif_salarie] || '',
                 annee_tranche: e.annee_tranche_effectif_salarie || '', cp: et.code_postal || '', ville: et.libelle_commune || '', naf: et.activite_principale || e.activite_principale || '',
                 verifier: { annuaire: 'https://annuaire-entreprises.data.gouv.fr/entreprise/' + e.siren } };
      })
      .catch(function () { if (t) clearTimeout(t); delete cache[id]; return null; });
    return cache[id];
  }
  window.BRH_FICHE = { fiche: fiche, bornes: bornes, TRANCHES: TRANCHES };
})();
