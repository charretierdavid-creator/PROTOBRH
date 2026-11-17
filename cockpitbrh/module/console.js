/* Module LM 2.0.2 — 17/11/2026 · application de la console (expert BRH, accès ponctuel, administration) · historique : VERSIONS.md */
/* ==============================================================
   console.js — console du lead management simplifié (cahier des charges v0.3, réponses par défaut Q1 à Q22)
   Écrans : E1 file et fiche, E2 transfert, E3 e-mail IA, E4 accès ponctuel, E6 annuaire, E7 script d'appel,
            E8 administration de l'annuaire, E9 envoi des e-mails (+ modèles, délais, file « à attribuer », journal).
   Données : lm2-api.php, ou console-demo.js (?demo=1, données fictives en mémoire, mêmes règles : lm2-regles.js).
   Rendu par chaînes HTML et délégation d'événements (attribut data-a) : testable sans navigateur (window.LM2_CONSOLE).
   ============================================================== */
(function () {
  'use strict';
  var L = window.LM2;
  var DEMO = !!window.LM2_DEMO;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ST = { s: null, leads: [], f: { q: '', type: '', statut: '', assigne: '', etat: 'cours' }, sel: null, det: null, ann: null, tab: 'leads', crAdmin: '', acces: null,
    adm: { sub: 'annuaire', cr: null, crs: [], its: null, envoi: null, modeles: null, modele: null, journal: null, params: null }, ia: {}, vueAOuvrir: '' };

  /* ---------------- échanges avec le serveur ---------------- */
  function api(a, corps) {
    if (DEMO) return window.LM2_DEMO.appel(a, corps || {}).then(verif);
    var o = a === 'session' ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-LM-CSRF': (ST.s && ST.s.csrf) || '' }, body: JSON.stringify(corps || {}) };
    return fetch('lm2-api.php?a=' + encodeURIComponent(a), o).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'Réponse illisible du serveur (' + r.status + ')' }; }).then(function (j) { if (r.status === 401 && a !== 'connexion' && a.indexOf('acces_') !== 0) j.session = false; return j; });
    }, function () { return { ok: false, error: 'Serveur injoignable : vérifiez votre connexion.' }; }).then(verif);
  }
  function verif(j) { if (!j || !j.ok) { var e = new Error((j && j.error) || 'Erreur inattendue'); e.j = j || {}; throw e; } return j; }
  function erreur(e) { if (e && e.j && e.j.session === false) { ST.s = null; return ecranConnexion({}); } toast((e && e.message) || 'Erreur', true); }
  var tt = null;
  function toast(m, err) { var t = $('lm2Toast'); if (!t) { t = document.createElement('div'); t.id = 'lm2Toast'; document.body.appendChild(t); }
    t.className = 'toast' + (err ? ' e' : ''); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, err ? 6000 : 3500); }

  /* ---------------- outils d'affichage ---------------- */
  function nomI(i) { return L.nomComplet(i); }
  /* RG-53 : sigles PILOTE / DÉMO (Caisse régionale) et Réel / Fictif (interlocuteur), visibles partout */
  function sig(mode) { return mode ? '<span class="sig ' + (mode === 'pilote' ? 'pilote' : 'demo') + '">' + (mode === 'pilote' ? 'PILOTE' : 'DÉMO') + '</span>' : ''; }
  function rf(d) { return d ? '<span class="rf ' + d + '">' + (d === 'reel' ? 'Réel' : 'Fictif') + '</span>' : ''; }
  function badgeType(t) { return '<span class="bd t-' + esc(t) + '">' + esc((L.TYPES[t] || {}).lib || t) + '</span>'; }
  function badgeStatut(l) { return '<span class="bd s-' + esc(l.statut) + '">' + esc(L.STATUTS[l.statut] || l.statut) + (l.statut === 'cloture' && l.issue ? ' · ' + esc(L.ISSUES[l.issue] || '') : '') + '</span>'; }
  function mini(l) { var i = L.ORDRE_STATUTS.indexOf(l.statut), h = '<div class="mini" aria-hidden="true">';
    for (var k = 0; k < 5; k++) h += '<i class="' + (k < i || l.statut === 'cloture' ? 'ok' : (k === i ? 'now' : '')) + '"></i>'; return h + '</div>'; }
  function pastilles(sol) { var F = { sante: ['caa', 'Santé'], epargne: ['amundi', 'Épargne'], retraite: ['amundi', 'Retraite'], avantages: ['worklife', 'Avantages'] };
    return L.liste(sol).map(function (s) { var f = F[s]; return f ? '<span class="ch ' + f[0] + '" title="' + esc(L.SOLUTIONS[s]) + '">' + f[1] + '</span>' : ''; }).join('') || '<span class="sm">à préciser</span>'; }
  function clientLib(c, court) { var x = L.CLIENT[c] || L.CLIENT.inconnu; return '<span class="cl ' + esc(c || 'inconnu') + '">' + esc(court ? x.court : x.lib) + '</span>'; }
  function roleLib(i) { return i ? (i.role === 'filiale' ? (L.FILIALES[i.filiale] || {}).lib || 'Filiale' : L.ROLES[i.role] || i.role) : ''; }
  function dateFr(d) { return d ? L.dateFr(d).replace(' à ', ' à ') : ''; }
  function seuil() { return (ST.s && ST.s.parametres && ST.s.parametres.seuil_pro) || L.SEUIL_PRO; }
  function moi() { return (ST.s && ST.s.moi) || null; }
  function role() { return ST.s ? ST.s.role : ''; }
  function estAcces() { return role() === 'acces'; }
  function estAdmin() { return role() === 'admin'; }
  function signature() { var m = moi(); if (!m) return 'L’équipe Banque des Ressources Humaines'; var c = ST.s.cr;
    return [nomI(m), roleLib(m) + ' – Banque des Ressources Humaines', c ? 'Crédit Agricole ' + c.nom : '', m.telephone || ''].filter(Boolean).join('\n'); }
  function noms(d) { var m = moi(); return { prenom: d.prenom || '', dirigeant: [d.prenom, d.nom].filter(Boolean).join(' '), entreprise: d.raison_sociale || '', moi: m ? nomI(m) : '', signature: signature(),
    caisse: d.cr ? 'Crédit Agricole ' + d.cr.nom : '' }; }
  function copier(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(function () { toast('Texte copié : collez-le dans votre messagerie.'); }, function () { copier2(txt); });
    copier2(txt);
  }
  function copier2(txt) { var t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast('Texte copié.'); } catch (e) { toast('Copie impossible : sélectionnez le texte.', true); } t.remove(); }
  function telecharger(nom, contenu) {
    var b = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function aujourdhui() { var d = new Date(); return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }

  /* ---------------- démarrage ---------------- */
  function hashParams() { var h = {}; String(location.hash || '').replace(/^#/, '').split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) h[kv[0]] = decodeURIComponent(kv[1] || ''); }); return h; }
  function demarrer() {
    var q = String(location.search || ''), m = q.match(/[?&]acces=([0-9a-f]{48})/);
    var h = hashParams(); if (h.lead) { ST.sel = +h.lead || null; ST.vueAOuvrir = h.vue || ''; }
    if (m && !DEMO) return accesOuvrir(m[1]);
    session();
  }
  function session() {
    return api('session').then(function (s) {
      if (!s.connecte) return ecranConnexion(s);
      ST.s = s; ST.tab = s.role === 'admin' ? (ST.tab === 'admin' ? 'admin' : 'leads') : 'leads';
      coque(); return chargerLeads();
    }).catch(erreur);
  }
  function ecranConnexion(s) {
    $('tabs').classList.add('hidden'); $('who').innerHTML = ''; $('bands').innerHTML = '';
    $('app').innerHTML = '<div class="login cx"><div class="ctop"><b>Connexion à la console</b></div><div class="db">' +
      (s && s.configure === false ? '<div class="alert e">Console non configurée : renseignez LM_ADMIN_LOGIN et LM_ADMIN_PASSWORD (10 caractères au moins) dans config.php.</div>' : '') +
      '<div class="fld"><label for="lgId">E-mail professionnel ou identifiant administrateur</label><input id="lgId" autocomplete="username"></div>' +
      '<div class="fld"><label for="lgMdp">Mot de passe</label><input id="lgMdp" type="password" autocomplete="current-password"></div>' +
      '<p class="alert e hidden" id="lgErr" role="alert"></p><button class="btn p" data-a="connexion">Se connecter</button>' +
      '<p class="note">Destinataire d’un transfert : ouvrez le lien personnel reçu par e-mail.</p></div></div>';
  }
  function connexion() {
    var e = $('lgErr');
    api('connexion', { login: $('lgId').value, mdp: $('lgMdp').value }).then(session).catch(function (x) { e.textContent = x.message; e.classList.remove('hidden'); });
  }
  /* E4 — lien d'accès ponctuel, code à usage unique par e-mail si l'envoi réel est actif (S5) */
  function accesOuvrir(jeton) {
    ST.acces = { jeton: jeton };
    api('acces_ouvrir', { jeton: jeton }).then(function (r) {
      if (r.ouvert) return accesEntrer(r);
      $('app').innerHTML = '<div class="login cx"><div class="ctop"><b>Accès ponctuel au lead transmis</b></div><div class="db">' +
        '<p>Pour votre sécurité, un code à 6 chiffres vient d’être envoyé à <b>' + esc(r.masque) + '</b>. Il est valable 10 minutes.</p>' +
        '<div class="fld"><label for="acCode">Code reçu par e-mail</label><input id="acCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div>' +
        '<p class="alert e hidden" id="acErr" role="alert"></p><button class="btn p" data-a="accesCode">Ouvrir le lead</button> <button class="btn" data-a="accesRenvoi">Recevoir un nouveau code</button></div></div>';
    }).catch(function (e) { $('app').innerHTML = '<div class="login cx"><div class="ctop"><b>Accès ponctuel</b></div><div class="db"><div class="alert e">' + esc(e.message) + '</div></div></div>'; });
  }
  function accesEntrer(r) {
    try { history.replaceState(null, '', location.pathname + '#lead=' + (r.lead || ST.sel || '') + (ST.vueAOuvrir ? '&vue=' + ST.vueAOuvrir : '')); } catch (e) {}
    if (r.lead) ST.sel = r.lead;
    session();
  }

  /* ---------------- coque : barre, onglets, bandeaux ---------------- */
  function coque() {
    var s = ST.s, m = moi();
    $('who').innerHTML = '<span>' + esc(estAdmin() ? 'Administrateur' : (m ? nomI(m) + ' · ' + roleLib(m) : '')) + '</span>' + (DEMO ? '' : '<button data-a="deconnexion">Se déconnecter</button>');
    var t = estAcces() ? [['leads', 'Leads transmis']] : [['leads', 'Mes leads'], ['annuaire', 'Annuaire pro et filiales']];
    if (estAdmin()) t.push(['admin', 'Administration']);
    $('tabsIn').innerHTML = t.map(function (x) { return '<button data-a="onglet" data-v="' + x[0] + '" aria-selected="' + (ST.tab === x[0]) + '">' + x[1] + '</button>'; }).join('');
    $('tabs').classList.remove('hidden');
    var b = '';
    if (DEMO) b += '<div class="band"><div class="wrap"><span><b>Démonstration</b> — données fictives en mémoire, aucun e-mail envoyé, rien n’est enregistré. Changez de point de vue avec le sélecteur de la console.</span></div></div>';
    if (s.vue) b += '<div class="band warn"><div class="wrap"><span>Vous voyez la console comme l’expert BRH de la Caisse régionale ' + esc(s.cr ? s.cr.nom : '') + ' ' + sig('demo') + ' (données fictives).</span><button class="btn s" data-a="quitterVue">Revenir à l’administration</button></div></div>';
    $('bands').innerHTML = b;
  }
  function onglet(v) { ST.tab = v; if (v === 'annuaire' && !ST.ann) ST.annErr = ''; coque(); rendre(); if (v === 'annuaire' && !ST.ann) chargerAnnuaire().then(rendre); if (v === 'admin') admCharger(); }
  function rendre() { if (ST.tab === 'annuaire') return vueAnnuaire(); if (ST.tab === 'admin') return vueAdmin(); vueLeads(); }

  /* ================= E1 — liste et fiche ================= */
  function chargerLeads() {
    return api('leads', estAdmin() ? { cr: ST.crAdmin } : {}).then(function (r) {
      ST.leads = r.leads || []; ST.acces = r.acces || ST.acces;
      if (ST.sel && !ST.leads.some(function (l) { return l.id === ST.sel; })) ST.sel = null;
      if (!ST.sel) { var v = visibles(); if (v.length && !(window.matchMedia && window.matchMedia('(max-width:1150px)').matches)) ST.sel = v[0].id; }
      var p = (!estAcces() && !ST.ann && ST.s.cr) ? chargerAnnuaire() : Promise.resolve();
      return p.then(function () { rendre(); if (ST.sel) return ouvrir(ST.sel, ST.vueAOuvrir); });
    }).catch(erreur);
  }
  function chargerAnnuaire(cr) {
    var c = cr || (ST.s.cr && ST.s.cr.code); if (!c) return Promise.resolve(null);
    return api('annuaire', { cr: c }).then(function (r) { if (!cr || (ST.s.cr && cr === ST.s.cr.code)) { ST.ann = r; ST.annErr = ''; } return r; })
      .catch(function (e) { if (!cr) ST.annErr = (e && e.message) || 'Erreur inattendue'; return null; });   // LM 2.0.1 : l'erreur est affichée dans l'onglet
  }
  function visibles() {
    var f = ST.f, q = L.norm(f.q), me = moi();
    return L.trier(ST.leads.filter(function (l) {
      if (f.etat === 'cours' && l.statut === 'cloture') return false;
      if (f.etat === 'clos' && l.statut !== 'cloture') return false;
      if (f.type && l.type !== f.type) return false;
      if (f.statut && l.statut !== f.statut) return false;
      if (f.assigne === 'moi' && !(me && (l.assigne_id === me.id || (!l.assigne_id && l.expert_id === me.id)))) return false;
      if (f.assigne === 'libre' && l.assigne_id) return false;
      if (f.assigne === 'transferes' && !l.transfert) return false;
      if (/^\d+$/.test(f.assigne) && l.assigne_id !== +f.assigne) return false;
      if (q && L.norm([l.raison_sociale, l.prenom, l.nom, l.ville, l.reference].join(' ')).indexOf(q) < 0) return false;
      return true;
    }));
  }
  function vueLeads() {
    var s = ST.s, cr = s.cr, acc = estAcces(), k = L.kpis(ST.leads.filter(function (l) { return l.statut !== 'cloture'; }));
    var titre = acc ? 'Leads qui vous sont transmis' : 'Mes leads';
    var lede = acc ? 'Accès ponctuel : vous ne voyez que les leads que l’expert BRH vous a transmis. Prenez-les en charge, planifiez un rendez-vous, clôturez-les ou rendez-les à l’expert.'
      : 'Les demandes des dirigeants de votre Caisse régionale, classées par type puis par échéance. Traitez le lead vous-même ou transférez-le ; il reste dans votre liste jusqu’à sa clôture.';
    var crSel = '';
    if (estAdmin()) crSel = '<select data-c="crAdmin" aria-label="Caisse régionale"><option value="">Toutes les Caisses régionales</option><option value="_a_attribuer"' + (ST.crAdmin === '_a_attribuer' ? ' selected' : '') + '>À attribuer (CR non identifiée)</option>' +
      (s.crs || []).map(function (c) { return '<option value="' + esc(c.code) + '"' + (ST.crAdmin === c.code ? ' selected' : '') + '>' + esc(c.nom) + (c.mode === 'pilote' ? ' · PILOTE' : ' · DÉMO') + '</option>'; }).join('') + '</select>';
    var persp = DEMO ? '<select data-c="perspective" aria-label="Point de vue de la démonstration">' + [['expert', 'Vue : expert BRH (Val de France)'], ['expert_pilote', 'Vue : expert BRH (Touraine Poitou)'], ['acces', 'Vue : conseiller pro (accès ponctuel)'], ['admin', 'Vue : administrateur']]
      .map(function (p) { return '<option value="' + p[0] + '"' + (window.LM2_DEMO.perspectiveCourante() === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select>' : '';
    var h = '<h1>' + titre + '</h1><p class="lede">' + lede + '</p>';
    if (acc && ST.acces && ST.acces.expire_le) h += '<div class="alert i">Accès ouvert par <b>' + esc(ST.acces.de_nom || 'l’expert BRH') + '</b>, valable jusqu’au <b>' + esc(L.dateFr(ST.acces.expire_le).split(' à ')[0]) + '</b> ; périmètre : seulement les leads transmis. Chaque ouverture est enregistrée.</div>';
    h += '<div class="cx"><div class="ctop"><b>' + (acc ? 'Leads transmis' : 'Console de l’expert BRH') + (cr ? ' · Crédit Agricole ' + esc(cr.nom) : (estAdmin() ? ' · vue administrateur' : '')) + '</b>' + (cr ? sig(cr.mode) : '') +
      '<span class="r">' + crSel + persp + (acc ? '' : '<button class="btn s" data-a="exporter" title="Export CSV pour SOLEAD ou le CRM (S8)">Exporter CSV</button>') + '</span></div>';
    if (!acc) h += '<div class="kp" role="group" aria-label="Indicateurs">' + ['devis', 'ultra', 'qualifie'].map(function (t) {
      return '<button class="k ' + t + '" data-a="kpi" data-v="' + t + '" aria-pressed="' + (ST.f.type === t) + '"><b>' + k[t] + '</b>' + esc(t === 'qualifie' ? 'Qualifiés' : (t === 'ultra' ? 'Ultra-qualifiés' : 'Demandes de devis')) + ' en cours</button>'; }).join('') + '</div>';
    var as = {}; ST.leads.forEach(function (l) { if (l.assigne) as[l.assigne.id] = l.assigne; });
    h += '<div class="filters"><input type="search" data-c="q" placeholder="Rechercher une entreprise, un nom, une ville" value="' + esc(ST.f.q) + '" aria-label="Rechercher">' +
      '<select data-c="type" aria-label="Type"><option value="">Tous les types</option>' + Object.keys(L.TYPES).map(function (t) { return '<option value="' + t + '"' + (ST.f.type === t ? ' selected' : '') + '>' + L.TYPES[t].lib + '</option>'; }).join('') + '</select>' +
      '<select data-c="statut" aria-label="Statut"><option value="">Tous les statuts</option>' + L.ORDRE_STATUTS.map(function (t) { return '<option value="' + t + '"' + (ST.f.statut === t ? ' selected' : '') + '>' + L.STATUTS[t] + '</option>'; }).join('') + '</select>' +
      (acc ? '' : '<select data-c="assigne" aria-label="Assigné à"><option value="">Assigné à : tous</option><option value="moi"' + (ST.f.assigne === 'moi' ? ' selected' : '') + '>Mes leads</option><option value="libre"' + (ST.f.assigne === 'libre' ? ' selected' : '') + '>Non assignés</option><option value="transferes"' + (ST.f.assigne === 'transferes' ? ' selected' : '') + '>Transférés</option>' +
        Object.keys(as).map(function (i) { return '<option value="' + i + '"' + (ST.f.assigne === String(i) ? ' selected' : '') + '>' + esc(nomI(as[i])) + '</option>'; }).join('') + '</select>') +
      '<span class="seg" role="group" aria-label="État">' + [['cours', 'En cours'], ['clos', 'Clôturés'], ['tous', 'Tous']].map(function (x) { return '<button data-a="etat" data-v="' + x[0] + '" aria-pressed="' + (ST.f.etat === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</span></div>';
    h += '<div class="grid"><div class="ls" id="lsLeads">' + liste() + '</div><div class="fiche" id="fiche">' + (ST.det ? fiche(ST.det) : '<p class="empty">Sélectionnez un lead dans la liste.</p>') + '</div></div></div>';
    $('app').innerHTML = h;
  }
  function liste() {
    var v = visibles();
    if (!v.length) return '<p class="empty">' + (ST.leads.length ? 'Aucun lead ne correspond aux filtres.' : (estAcces() ? 'Aucun lead ne vous est transmis actuellement.' : 'Aucun lead pour le moment.')) + '</p>';
    return '<table class="tbl sel cards"><thead><tr><th>Lead</th><th>Type</th><th>Solutions</th><th>Statut</th><th>Échéance</th></tr></thead><tbody>' + v.map(function (l) {
      var e = L.etatEcheance(l), a = l.assigne, tr = l.transfert && a ? '<span class="to">→ ' + esc(nomI(a)) + (a.role === 'conseiller_pro' && a.ville_agence ? ', ' + esc(String(a.ville_agence).replace(/^Agence (de |d’)/, 'ag. ')) : (a.role === 'filiale' ? ' (' + esc(roleLib(a)) + ')' : (a.role === 'expert_brh_pro' ? ' (expert BRH PRO)' : ''))) + (l.transfert.pris_le ? '' : ' · en attente') + '</span>' : '';
      return '<tr data-a="choisir" data-id="' + l.id + '" aria-selected="' + (ST.sel === l.id) + '"><td class="c-lead nm"><b>' + esc(l.raison_sociale || 'Entreprise non renseignée') + '</b><span class="sm"><span class="ver" title="Site d’origine">' + esc(l.version) + '</span>' +
        esc([[l.prenom, l.nom].filter(Boolean).join(' '), l.ville ? l.ville + (l.departement ? ' (' + l.departement + ')' : '') : (l.departement ? 'dép. ' + l.departement : ''), l.effectif ? l.effectif + ' sal.' : ''].filter(Boolean).join(' · ')) + '</span>' + tr + '</td>' +
        '<td>' + badgeType(l.type) + clientLib(l.client_statut, true) + '</td><td>' + pastilles(l.solutions) + '</td><td>' + badgeStatut(l) + mini(l) + '</td>' +
        '<td><span class="ech ' + e.etat + '">' + esc(e.lib) + '</span>' + (+l.rappel && l.statut !== 'cloture' ? '<span class="sm">Rappel demandé</span>' : '') + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function majListe() { var x = $('lsLeads'); if (x) x.innerHTML = liste(); }
  function ouvrir(id, vue) {
    ST.sel = id; ST.vueAOuvrir = '';
    return api('lead', { id: id }).then(function (r) {
      ST.det = r.lead; majFiche(); majListe();
      try { history.replaceState(null, '', location.pathname + location.search.replace(/[?&]acces=[0-9a-f]+/, '') + '#lead=' + id); } catch (e) {}
      if (vue === 'script') dlgScript(); else if (vue === 'email') dlgEmail(); else if (vue === 'transfert') dlgTransfert();
    }).catch(erreur);
  }
  function majFiche() { var f = $('fiche'); if (f) f.innerHTML = ST.det ? fiche(ST.det) : ''; }
  function apres(r, msg) {   /* réponse d'une action : fiche et liste à jour */
    if (r && r.lead) { ST.det = r.lead; var i = ST.leads.findIndex(function (l) { return l.id === r.lead.id; }); if (i >= 0) ST.leads[i] = Object.assign({}, ST.leads[i], r.lead); }
    fermer(); if (msg) toast(msg);
    return chargerLeads();
  }

  /* ---------------- fiche du lead ---------------- */
  function fiche(d) {
    var acc = estAcces(), clos = d.statut === 'cloture', p = d.parcours || {}, seg = L.segment(d.effectif, seuil()), me = moi();
    var trActif = (d.transferts || []).filter(function (t) { return t.actif; })[0];
    var h = '<div class="ref">' + esc(d.reference) + ' · reçu le ' + esc(dateFr(d.cree_le)) + ' · site ' + esc(d.version) + (d.cr ? ' · Crédit Agricole ' + esc(d.cr.nom) + sig(d.cr.mode) : ' · <b>Caisse régionale à attribuer</b>') + '</div>';
    h += '<h3 class="nom">' + esc(d.raison_sociale || 'Entreprise non renseignée') + '</h3>';
    h += '<div class="chips"><span class="chip t-' + esc(d.type) + '">' + esc(L.TYPES[d.type].lib) + ' · ' + esc(+d.rappel && d.type === 'qualifie' ? '48 h ouvrées (rappel demandé)' : L.TYPES[d.type].delai) + '</span>' +
      (d.effectif ? '<span class="chip o">' + d.effectif + ' salarié' + (d.effectif > 1 ? 's' : '') + '</span>' : '<span class="chip o">Effectif à préciser</span>') +
      (seg ? '<span class="chip o" title="Suggestion, jamais automatique (RG-17)">Segment ' + (seg === 'pro' ? 'Pro' : 'Entreprise') + ' suggéré</span>' : '') +
      '<span class="chip o">' + esc((L.CLIENT[d.client_statut] || L.CLIENT.inconnu).lib) + '</span>' + (+d.rappel ? '<span class="chip o">Rappel demandé</span>' : '') + '</div>';
    if (acc && trActif && trActif.message) h += '<div class="alert i"><b>Message de ' + esc(trActif.de_nom || 'l’expert BRH') + '</b><br>' + esc(trActif.message) + '</div>';
    if (!clos && ['declare', 'non_declare', 'inconnu'].indexOf(d.client_statut) >= 0) h += '<div class="alert">Statut client à vérifier dans la base clients de la Caisse régionale' + (acc ? '' : ', de préférence avant tout transfert') + '. <button class="btn l" data-a="dlgClient">Vérifier le statut client</button></div>';
    /* actions */
    if (clos) h += '<div class="alert i">Lead clôturé le ' + esc(dateFr(d.statut_le)) + ' : ' + esc(L.ISSUES[d.issue] || '') + '. Une nouvelle demande du dirigeant rouvre le dossier.</div>';
    else if (acc) {
      var aPrendre = d.statut === 'transfere';
      h += '<div class="acts">' + (aPrendre ? '<button class="btn p" data-a="traiter">Prendre en charge</button>' : '') + '<button class="btn ia" data-a="dlgScript">Script d’appel IA</button><button class="btn ia" data-a="dlgEmail">E-mail IA</button>' +
        (d.statut === 'pris_en_charge' ? '<button class="btn" data-a="proposition">Proposition remise</button>' : '') + '<button class="btn d" data-a="dlgCloture">Clôturer</button></div>' +
        '<div class="acts sec"><button class="btn s" data-a="dlgClient">Vérifier le statut client</button><button class="btn s" data-a="dlgRdv">Planifier un rendez-vous</button><button class="btn s" data-a="dlgNote">Ajouter une note</button><button class="btn s d" data-a="dlgRendre">Rendre le lead à l’expert</button></div>';
    } else {
      var miens = d.statut === 'pris_en_charge' && me && d.assigne_id === me.id;
      h += '<div class="acts"><button class="btn p" data-a="traiter"' + (miens ? ' disabled' : '') + '>' + (d.statut === 'transfere' ? 'Reprendre le lead' : (miens ? 'Pris en charge' : 'Traiter le lead')) + '</button>' +
        '<button class="btn" data-a="dlgTransfert"' + (d.cr ? '' : ' disabled') + '>Transférer</button><button class="btn ia" data-a="dlgScript">Script d’appel IA</button><button class="btn ia" data-a="dlgEmail">E-mail IA</button><button class="btn d" data-a="dlgCloture">Clôturer</button></div>' +
        '<div class="acts sec"><button class="btn s" data-a="dlgClient">Vérifier le statut client</button><button class="btn s" data-a="dlgRdv">Planifier un rendez-vous</button><button class="btn s" data-a="dlgNote">Ajouter une note</button>' +
        (d.statut === 'pris_en_charge' ? '<button class="btn s" data-a="proposition">Proposition remise</button>' : '') + '<button class="btn s" data-a="dlgTel">Modifier le téléphone</button></div>';
    }
    if (d.rdv_le) h += '<div class="alert i">Rendez-vous le <b>' + esc(dateFr(d.rdv_le)) + '</b>' + (d.rdv_note ? ' · ' + esc(d.rdv_note) : '') + ' (visible dans « Mon dossier » du dirigeant).</div>';
    /* transferts (RG-26) */
    if ((d.transferts || []).length) h += '<div class="sec"><h4>Transferts</h4>' + d.transferts.map(function (t) {
      var v = t.vers || {}, ac = t.acces || {}, exp = ac.expire_le && !ac.revoque_le;
      return '<div class="tr"><div class="h"><b>' + esc(nomI(v)) + '</b>' + rf(v.donnees) + '<span class="sm" style="display:inline">' + esc(roleLib(v)) + (v.ville_agence ? ' · ' + esc(v.ville_agence) : '') + '</span>' +
        (t.actif ? (t.pris_le ? '<span class="bd s-pris_en_charge">Pris en charge le ' + esc(L.dateCourte(t.pris_le)) + '</span>' : '<span class="bd s-nouveau">En attente de prise en charge</span>') : '<span class="bd s-cloture">Terminé</span>') + '</div>' +
        '<span class="sm">Transféré le ' + esc(dateFr(t.cree_le)) + ' par ' + esc(t.de_nom || '') + (t.motif ? ' · motif : ' + esc(t.motif) : '') + '</span>' +
        (t.message && !acc ? '<span class="sm">Message : ' + esc(t.message) + '</span>' : '') +
        '<span class="sm">Accès ponctuel : ' + (ac.revoque_le ? 'révoqué le ' + esc(L.dateCourte(ac.revoque_le)) : (exp ? 'valable jusqu’au ' + esc(L.dateFr(ac.expire_le).split(' à ')[0]) : '—')) + (ac.ouvert_le ? ' · ouvert le ' + esc(dateFr(ac.ouvert_le)) : ' · pas encore ouvert') + '</span>' +
        (!acc && t.actif && !clos ? '<div class="acts" style="margin:6px 0 0"><button class="btn s" data-a="accesProlonger" data-v="' + t.id + '">Prolonger l’accès</button><button class="btn s d" data-a="accesRevoquer" data-v="' + t.id + '">Révoquer l’accès</button><button class="btn s" data-a="traiter">Reprendre le lead</button></div>' : '') + '</div>';
    }).join('') + '</div>';
    /* S3 — pour préparer l'appel */
    h += '<div class="sec"><h4>Pour préparer l’appel</h4>' + preparer(d) + '</div>';
    /* coordonnées */
    h += '<div class="sec"><h4>Contact et entreprise</h4><dl class="kv">' +
      kv('Contact', [[d.prenom, d.nom].filter(Boolean).join(' '), d.fonction].filter(Boolean).join(' · ') || 'à compléter') +
      kv('E-mail', d.email ? '<a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a>' : '—', true) + kv('Téléphone', d.telephone ? '<a href="tel:' + esc(String(d.telephone).replace(/\s/g, '')) + '">' + esc(d.telephone) + '</a>' : '—', true) +
      kv('SIRET', d.siret || '—') + kv('Siège', [d.code_postal, d.ville].filter(Boolean).join(' ') + (d.departement ? ' · ' + L.nomDep(d.departement) : '') || '—') + kv('Secteur', d.secteur || '—') +
      kv('Statut client', clientLib(d.client_statut) + (d.client_verifie_par ? '<span class="sm">Vérifié par ' + esc(d.client_verifie_par) + ' le ' + esc(dateFr(d.client_verifie_le)) + (d.client_agence ? ' · ' + esc(d.client_agence) : '') + (d.client_conseiller ? ' · titulaire : ' + esc(d.client_conseiller) : '') + '</span>' : (d.client_declare ? '<span class="sm">Déclaratif du dirigeant : « ' + esc({ oui: 'oui', non: 'non', nsp: 'je ne sais pas' }[d.client_declare] || d.client_declare) + ' »</span>' : '')), true) +
      kv('Relances', +d.consent_relance ? (d.type === 'qualifie' && d.statut === 'nouveau' ? (+d.relances || 0) + ' sur 2 envoyée(s) (J+1, J+7)' : 'arrêtées (lead pris en charge)') : 'refusées par le dirigeant') + '</dl></div>';
    /* parcours */
    h += '<div class="sec"><h4>Parcours sur le portail</h4><div class="frise">' + (d.demandes || []).map(function (x) {
      return '<div><b>' + esc(L.dateFr(x.cree_le)) + '</b>' + esc(x.lib) + '<span class="sm">' + esc((L.TYPES[x.type] || {}).lib || '') + '</span></div>'; }).join('') +
      (p.etape && d.type !== 'devis' ? '<div class="off"><b>Devis en cours</b>Étape « ' + esc(p.etape) + ' »</div>' : '') + '</div></div>';
    /* besoins et offres */
    var pr = p.priorites || {};
    h += '<div class="sec"><h4>Besoins et offres</h4>' + (Object.keys(pr).length ? '<div class="bars">' + Object.keys(L.PRIORITES).filter(function (k) { return pr[k] != null; }).map(function (k) {
      return '<div><span>' + esc(L.PRIORITES[k]) + '</span><i><s style="width:' + (Math.max(0, Math.min(4, +pr[k])) * 25) + '%"></s></i><b>' + (+pr[k]) + '/4</b></div>'; }).join('') + '</div>' : '<p class="sm">Priorités non renseignées (diagnostic non fait).</p>') +
      '<dl class="kv" style="margin-top:8px">' + kv('Offres préconisées', (p.offres_preconisees || []).map(function (s) { return '<span class="chip o">' + esc(L.SOLUTIONS[s] || s) + '</span>'; }).join('') || '—', true) +
      kv('Offres consultées', (p.offres_consultees || []).map(function (s) { return '<span class="chip o">' + esc(s) + '</span>'; }).join('') || '—', true) +
      (p.pages && p.pages.length ? kv('Pages vues', esc(p.pages.join(' · '))) : '') + (p.gain_fiscal ? kv('Gain estimé (diagnostic)', esc(L.eur(p.gain_fiscal)) + ' / an <span class="sm">estimation indicative et non contractuelle</span>', true) : '') +
      (p.score_label != null ? kv('Score Label BRH', esc(p.score_label) + ' / 100') : '') + '</dl></div>';
    /* devis et estimation */
    if (d.montant || (p.configuration || []).length || d.idcc || p.reference_devis) {
      h += '<div class="sec"><h4>Devis et estimation</h4><dl class="kv">' + (d.montant ? kv('Estimation', '<b>' + esc(L.eur(d.montant)) + ' / an</b> <span class="sm">estimation indicative et non contractuelle</span>', true) : '') +
        (p.reference_devis ? kv('Référence du devis', p.reference_devis) : '') + (p.salaries ? kv('Salariés concernés', p.salaries) : '') +
        (p.configuration || []).map(function (c) { return kv(L.SOLUTIONS[c.solution] || c.solution || 'Solution', esc([c.libelle, c.formule].filter(Boolean).join(' · ')) + (c.cout != null ? ' · <b>' + esc(L.eur(c.cout)) + '</b> / an' : '') + (c.hypotheses && c.hypotheses.length ? '<span class="sm">' + esc(c.hypotheses.join(' ; ')) + '</span>' : ''), true); }).join('') +
        (d.idcc ? kv('Convention collective', esc(d.idcc) + (p.sante_ccn ? '<span class="sm">Santé : ' + esc(p.sante_ccn.statut || '') + (p.sante_ccn.exigences ? ' — ' + esc(p.sante_ccn.exigences) : '') + '</span>' : ''), true) : '') +
        (p.conventions && p.conventions.length ? kv('Conventions déclarées', esc(p.conventions.map(function (c) { return typeof c === 'object' ? [c.idcc, c.libelle].filter(Boolean).join(' ') : c; }).join(' · '))) : '') + '</dl></div>';
    }
    /* e-mails automatiques */
    h += '<div class="sec"><h4>E-mails automatiques de ce client</h4>' + ((d.emails || []).length ? '<ul class="hist">' + d.emails.map(function (e) {
      return '<li><span>' + esc(dateFr(e.cree_le)) + '</span><div>' + esc(e.modele) + ' · ' + esc(e.objet) + '<span class="sm">À ' + esc(e.destinataire_nom || e.destinataire || '—') + ' · <span class="bd e-' + esc(e.statut) + '">' + esc({ envoye: 'Envoyé', journal: 'Journalisé', non_envoye: 'Non envoyé', echec: 'Échec', attente: 'En attente' }[e.statut] || e.statut) + '</span>' + (e.motif ? ' ' + esc(e.motif) : '') + '</span></div></li>'; }).join('') + '</ul>' : '<p class="sm">Aucun e-mail pour ce client.</p>') + '</div>';
    /* historique */
    var ev = (d.journal || []).map(function (j) { return { le: j.cree_le, qui: j.acteur, txt: j.detail, a: j.action }; });
    h += '<div class="sec"><h4>Historique</h4><ul class="hist">' + ev.map(function (x) { return '<li><span>' + esc(dateFr(x.le)) + '</span><div>' + esc(x.txt) + ' <em>— ' + esc(x.qui) + '</em></div></li>'; }).join('') + '</ul></div>';
    return h;
  }
  function kv(k, v, html) { return '<dt>' + esc(k) + '</dt><dd>' + (html ? v : esc(v)) + '</dd>'; }
  /* S3 : argumentaire du site (IA) ou, à défaut, trois repères tirés du dossier */
  function preparer(d) {
    var a = d.argumentaire && d.argumentaire.contenu, p = d.parcours || {}, pr = p.priorites || {};
    if (a && (a.synthese || a.questions)) {
      var lst = function (t, x) { x = [].concat(x || []).filter(Boolean); return x.length ? '<b>' + t + '</b><ul>' + x.map(function (i) { return '<li>' + esc(typeof i === 'object' ? (i.texte || i.titre || JSON.stringify(i)) : i) + '</li>'; }).join('') + '</ul>' : ''; };
      return '<div class="prep">' + (a.titre ? '<b>' + esc(a.titre) + '</b>' : '') + lst('Synthèse', a.synthese) + lst('Questions à poser', a.questions) + lst('Pièces à demander', a.pieces) + (a.angle ? '<b>Angle d’approche</b><p style="margin:2px 0">' + esc(a.angle) + '</p>' : '') +
        '<span class="sm">Préparé par l’IA du portail' + (d.argumentaire.le ? ' le ' + esc(dateFr(d.argumentaire.le)) : '') + ' · aide à la préparation, à vérifier avec le dirigeant.</span></div>';
    }
    var top = Object.keys(pr).sort(function (x, y) { return (+pr[y] || 0) - (+pr[x] || 0); })[0];
    var pts = [];
    pts.push(top ? 'Priorité n° 1 notée par le dirigeant : ' + L.PRIORITES[top].toLowerCase() + ' (' + pr[top] + '/4).' : 'Priorités à découvrir pendant l’appel (diagnostic non fait).');
    pts.push(L.liste(d.solutions).length ? 'Solutions choisies : ' + L.liste(d.solutions).map(function (s) { return L.SOLUTIONS[s].toLowerCase(); }).join(', ') + (d.montant ? ' ; estimation ' + L.eur(d.montant) + ' / an (indicative et non contractuelle).' : '.') : 'Aucune solution choisie : partir du besoin.');
    pts.push(d.idcc ? 'Convention ' + d.idcc + ' : vérifier les obligations santé et prévoyance.' : 'Convention collective à demander (obligations santé et prévoyance).');
    return '<div class="prep"><ul style="margin:0">' + pts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><span class="sm">Pour aller plus loin : « Script d’appel IA ».</span></div>';
  }

  /* ================= fenêtres ================= */
  function dlg(titre, corps, pied, large) {
    $('dlgs').innerHTML = '<div class="mask" data-a="masque"><div class="dlg" role="dialog" aria-modal="true" aria-label="' + esc(titre) + '"' + (large ? ' style="max-width:980px"' : '') + '><div class="dh"><b>' + esc(titre) + '</b><button data-a="fermer" aria-label="Fermer">×</button></div><div class="db" id="dlgCorps">' + corps + '</div>' + (pied ? '<div class="df" id="dlgPied">' + pied + '</div>' : '') + '</div></div>';
  }
  function fermer() { if (ST.ia.script && ST.ia.script.ouvert && !ST.ia.script.cr) toast('Pensez au compte rendu d’appel : il met à jour le statut client et le statut du lead.'); ST.ia = {}; $('dlgs').innerHTML = ''; }
  function v(id) { var e = $(id); return e ? String(e.value == null ? '' : e.value).trim() : ''; }
  function coche(id) { var e = $(id); return !!(e && e.checked); }
  function radio(nom) { var e = document.querySelector('input[name="' + nom + '"]:checked'); return e ? e.value : ''; }
  function act(a, corps, msg) { return api(a, Object.assign({ id: ST.det.id }, corps || {})).then(function (r) { return apres(r, msg); }).catch(erreur); }

  /* E2 — transférer le lead */
  function annuaireDuLead() {
    var c = ST.det && ST.det.cr && ST.det.cr.code; if (!c) return Promise.resolve(null);
    if (ST.ann && ST.ann.cr && ST.ann.cr.code === c) return Promise.resolve(ST.ann);
    ST.annCache = ST.annCache || {}; if (ST.annCache[c]) return Promise.resolve(ST.annCache[c]);
    return chargerAnnuaire(c).then(function (r) { if (r) ST.annCache[c] = r; return r; });
  }
  function dlgTransfert() { return annuaireDuLead().then(function (A) { dlgTransfert2(A); }); }
  function dlgTransfert2(A0) {
    var d = ST.det, A = A0 || { interlocuteurs: [], agences: [], filiales: [] }; ST.annT = A;
    var sg = L.suggerer(d, A, { seuil: seuil() });
    var pros = [sg.expertPro].concat(sg.autresPros).filter(Boolean);
    ST.ia.tr = { sg: sg, agence: sg.agence ? sg.agence.id : (A.agences[0] || {}).id };
    var h = '<p class="sm" style="margin:0 0 6px">' + esc(sg.conseilSegment) + '</p>' + (sg.pourquoi ? '<div class="why"><b>Pourquoi cette suggestion ?</b> ' + esc(sg.pourquoi) + '</div>' : '');
    if (['declare', 'non_declare', 'inconnu'].indexOf(d.client_statut) >= 0) h += '<div class="alert">Statut client à vérifier avant le transfert (non bloquant). <button class="btn l" data-a="dlgClient">Vérifier maintenant</button></div>';
    h += '<div class="fld"><span class="lb">1. Expert BRH PRO</span>' + (pros.length ? pros.map(function (i, k) {
      return opt('trVers', i.id, k === 0 && sg.segment === 'pro' && !sg.titulaire, '<b>' + esc(nomI(i)) + '</b>' + rf(i.donnees) + (k === 0 ? ' <span class="chip o">suggéré</span>' : '') + '<span class="sm">Périmètre : ' + esc(i.perimetre || i.departements || '—') + ' · ' + (i.charge || 0) + ' lead(s) en cours</span>'); }).join('')
      : '<p class="sm">Pas d’expert BRH PRO dans l’annuaire de cette Caisse régionale : transfert au conseiller pro (Q7).</p>') + '</div>';
    h += '<div class="fld"><span class="lb">2. Conseiller pro d’une agence</span><select id="trAgence" data-c="trAgence" aria-label="Agence">' + A.agences.map(function (a) {
      return '<option value="' + a.id + '"' + (a.id === ST.ia.tr.agence ? ' selected' : '') + '>' + esc(a.nom) + ' (' + esc(a.departement) + ')' + (sg.agence && a.id === sg.agence.id ? ' — suggérée' : '') + '</option>'; }).join('') + '</select><div id="trConseillers">' + conseillers(A, sg) + '</div></div>';
    if (sg.filiales.length) h += '<div class="fld"><span class="lb">3. Filiale (demande de devis, offres choisies)</span>' + A.filiales.filter(function (f) { return sg.filiales.indexOf(f.filiale) >= 0; }).map(function (f) {
      return opt('trVers', f.id, false, '<b>' + esc(f.lib) + '</b>' + rf(f.donnees) + '<span class="sm">' + esc(f.email) + ' · outil : ' + esc(f.outil) + ' · l’expert reste responsable du dossier</span>'); }).join('') +
      '<input id="trMotif" placeholder="Motif du transfert à la filiale (obligatoire)" aria-label="Motif"></div>';
    else h += '<p class="sm">Filiales : transfert réservé aux demandes de devis, vers la filiale des offres choisies (RG-22).</p>';
    h += '<div class="fld"><label class="opt" style="margin:0"><input type="radio" name="trVers" value="hors" data-c="trHors"><span><b>Autre adresse du Crédit Agricole (hors annuaire)</b><span class="sm">Conseiller titulaire d’un client vérifié absent de l’annuaire (Q17)</span></span></label>' +
      '<div class="row hidden" id="trHorsF"><input id="trHE" placeholder="prenom.nom@ca-…fr" aria-label="E-mail"><input id="trHP" placeholder="Prénom" aria-label="Prénom"><input id="trHN" placeholder="Nom" aria-label="Nom"><input id="trHA" placeholder="Agence" aria-label="Agence"></div></div>';
    h += '<div class="fld"><label for="trMsg">Message au destinataire (joint à l’e-mail et visible dans sa fiche)</label><textarea id="trMsg" placeholder="Contexte, points d’attention, rendez-vous déjà évoqué…"></textarea></div>' +
      '<label class="sw" style="border:0"><input type="checkbox" id="trInf" checked><span>Informer le dirigeant de son nouvel interlocuteur (e-mail E5)</span></label>' +
      '<p class="note">Le destinataire reçoit un lien d’accès ponctuel personnel, valable ' + ((ST.s.parametres || {}).acces_jours || 14) + ' jours et limité à ce lead (E4). ' + (ST.s.envoi_reel ? '' : 'Envoi réel des e-mails désactivé : l’e-mail est journalisé et le lien vous est affiché pour le transmettre vous-même.') + '</p>';
    dlg('Transférer le lead — ' + (d.raison_sociale || ''), h, '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="transferer">Transférer</button>', true);
  }
  function opt(nom, val, on, html) { return '<label class="opt' + (on ? ' on' : '') + '"><input type="radio" name="' + nom + '" value="' + esc(val) + '"' + (on ? ' checked' : '') + '><span>' + html + '</span></label>'; }
  function conseillers(A, sg) {
    var ag = +ST.ia.tr.agence, cs = A.interlocuteurs.filter(function (i) { return i.role === 'conseiller_pro' && i.agence_id === ag && i.actif; });
    if (!cs.length) return '<p class="sm">Aucun conseiller pro dans cette agence.</p>';
    var choix = sg.titulaire ? sg.titulaire.id : (sg.segment === 'pro' && !sg.expertPro && sg.conseiller ? sg.conseiller.id : null);
    return cs.map(function (i) { var tit = sg.titulaire && sg.titulaire.id === i.id;
      return opt('trVers', i.id, choix === i.id, '<b>' + esc(nomI(i)) + '</b>' + rf(i.donnees) + (tit ? ' <span class="chip o">conseiller titulaire du client</span>' : (sg.conseiller && sg.conseiller.id === i.id ? ' <span class="chip o">le moins chargé</span>' : '')) + '<span class="sm">' + (i.charge || 0) + ' lead(s) en cours' + (i.telephone ? ' · ' + esc(i.telephone) : '') + '</span>'); }).join('');
  }
  function transferer() {
    var vers = radio('trVers'), c = { message: v('trMsg'), informer: coche('trInf'), motif: v('trMotif') };
    if (!vers) return toast('Choisissez le destinataire du transfert.', true);
    if (vers === 'hors') c.hors_annuaire = { email: v('trHE'), prenom: v('trHP'), nom: v('trHN'), agence: v('trHA') }; else c.vers_id = +vers;
    api('transferer', Object.assign({ id: ST.det.id }, c)).then(function (r) {
      if (r.lien) { ST.det = r.lead; dlg('Lead transféré', '<p>Le lead est transféré. L’envoi réel des e-mails est désactivé : transmettez vous-même ce lien personnel au destinataire.</p><div class="ctx">' + esc(r.lien) + '</div>', '<button class="btn" data-a="copierLien" data-v="' + esc(r.lien) + '">Copier le lien</button><button class="btn p" data-a="fermer">Fermer</button>'); return chargerLeads(); }
      return apres(r, r.email === 'envoye' ? 'Lead transféré : e-mail envoyé au destinataire.' : 'Lead transféré (e-mail journalisé).');
    }).catch(erreur);
  }

  /* E3 — e-mail personnalisé proposé par l'IA */
  function dlgEmail() {
    var d = ST.det, cx = L.contexteIA(d);
    ST.ia.mail = { objectif: d.type === 'qualifie' ? 'rdv' : (d.type === 'ultra' ? 'estimation' : 'rdv'), ton: 'cordial', props: [] };
    var h = '<div class="row"><div class="fld"><label for="mObj">Objectif de l’e-mail</label><select id="mObj" data-c="mObj">' + Object.keys(L.OBJECTIFS).map(function (k) { return '<option value="' + k + '"' + (ST.ia.mail.objectif === k ? ' selected' : '') + '>' + L.OBJECTIFS[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><span class="lb">Ton</span><span class="seg"><button data-a="ton" data-v="cordial" aria-pressed="true">Cordial</button><button data-a="ton" data-v="formel" aria-pressed="false">Formel</button></span></div></div>' +
      '<div class="ctx"><b>Contexte envoyé à l’IA (sans nom ni coordonnées) :</b> ' + esc(resumeContexte(cx)) + '</div><div id="mProps"><p class="empty">Génération des propositions…</p></div>';
    dlg('E-mail personnalisé proposé par l’IA', h, '<span class="note" style="margin-right:auto">Vous relisez, copiez et envoyez depuis votre messagerie : la plateforme n’envoie pas cet e-mail.</span><button class="btn" data-a="mGenerer">Régénérer</button><button class="btn p" data-a="fermer">Fermer</button>', true);
    mGenerer();
  }
  function resumeContexte(cx) {
    var p = []; if (cx.type_lead) p.push(cx.type_lead); if (cx.statut_client) p.push(cx.statut_client); if (cx.secteur) p.push(cx.secteur); if (cx.effectif) p.push(cx.effectif + ' salariés'); if (cx.departement) p.push('département ' + cx.departement);
    var pr = Object.keys(cx.priorites || {}).map(function (k) { return (L.PRIORITES[k] || k) + ' ' + cx.priorites[k] + '/4'; }); if (pr.length) p.push('priorités : ' + pr.join(', '));
    if ((cx.solutions || []).length) p.push('solutions : ' + cx.solutions.join(', ')); if (cx.estimation_annuelle) p.push('estimation ' + L.eur(cx.estimation_annuelle) + '/an'); if (cx.convention) p.push('convention ' + cx.convention);
    return p.join(' · ');
  }
  function mention(t) { return /\d[\d\s  .]*\s?€/.test(t) && !/indicative et non contractuelle/i.test(t) ? t + '\n\n(Estimation indicative et non contractuelle.)' : t; }
  function mGenerer() {
    var m = ST.ia.mail, d = ST.det; if (!m) return;
    var o = $('mObj'); if (o && o.value) m.objectif = o.value;
    $('mProps').innerHTML = '<p class="empty">Génération des propositions…</p>';
    var fin = function (props, src) { m.props = props.map(function (p) { return { objet: p.objet, corps: mention(L.injecter(p.corps, noms(d))) }; });
      $('mProps').innerHTML = '<p class="sm">' + (src === 'mistral' ? 'Propositions de Mistral' : 'Propositions types (IA indisponible)') + ' — [Prénom] et votre signature sont complétés dans votre navigateur.</p>' +
        m.props.map(function (p, i) { return '<div class="prop"><b>Objet : ' + esc(p.objet) + '</b><pre>' + esc(p.corps) + '</pre><button class="btn s p" data-a="mCopier" data-v="' + i + '">Copier le texte</button> <button class="btn s" data-a="mNoter" data-v="' + i + '">Noter « e-mail envoyé »</button></div>'; }).join(''); };
    api('emails_ia', { id: d.id, objectif: m.objectif, ton: m.ton }).then(function (r) { if (r.repli || !r.propositions) fin(L.emailsRepli(d, m.objectif, m.ton), 'repli'); else fin(r.propositions, 'mistral'); })
      .catch(function () { fin(L.emailsRepli(d, m.objectif, m.ton), 'repli'); });
  }

  /* E7 — script d'appel proposé par l'IA, compte rendu d'appel en quelques clics (S11) */
  function dlgScript() {
    var d = ST.det; ST.ia.script = { ouvert: true, cr: false, blocs: [] };
    var ad = [(L.TYPES[d.type] || {}).lib, (L.CLIENT[d.client_statut] || {}).lib]; if (+d.rappel) ad.push('Rappel demandé'); if (d.idcc) ad.push('Convention ' + String(d.idcc).split(' ')[0]);
    var h = '<p class="sm" style="margin:0 0 8px">Adapté à : ' + ad.map(function (x) { return '<span class="chip o">' + esc(x) + '</span>'; }).join('') + '</p>' +
      '<div class="ctx"><b>Contexte envoyé à l’IA (sans nom ni coordonnées) :</b> ' + esc(resumeContexte(L.contexteIA(d))) + '</div><div class="script" id="scBlocs"><p class="empty">Préparation du script…</p></div>' +
      '<div class="cr" id="scCr"><h3>Compte rendu d’appel</h3><div class="row"><div class="fld"><span class="lb">Résultat</span><span class="seg" id="crRes">' + [['joint', 'Joint'], ['messagerie', 'Messagerie'], ['injoignable', 'Injoignable']].map(function (x) { return '<button data-a="crRes" data-v="' + x[0] + '" aria-pressed="false">' + x[1] + '</button>'; }).join('') + '</span></div>' +
      '<div class="fld"><label for="crCl">Statut client vérifié</label><select id="crCl"><option value="">Inchangé (' + esc((L.CLIENT[d.client_statut] || {}).court || '') + ')</option><option value="verifie">Client vérifié</option><option value="prospect">Prospect vérifié</option></select></div>' +
      '<div class="fld"><label for="crPro">Prochaine étape</label><select id="crPro"><option value="">—</option><option value="rdv">Rendez-vous</option><option value="devis">Devis ou proposition</option><option value="relance">Relance</option><option value="cloture">Clôture</option></select></div></div>' +
      '<div class="fld"><label for="crNote">Note</label><textarea id="crNote" placeholder="Ce qui a été dit, ce qui reste à faire"></textarea></div><button class="btn p" data-a="crEnregistrer">Enregistrer le compte rendu</button> <span class="note">Fortement conseillé, jamais bloquant (Q18).</span></div>';
    dlg('Script d’appel — ' + (d.raison_sociale || ''), h, '<span class="note" style="margin-right:auto">Une aide : adaptez-la, ne la lisez pas mot pour mot. Le script n’est pas conservé.</span><button class="btn" data-a="scGenerer">Régénérer</button><button class="btn" data-a="scCopier">Copier</button><button class="btn" data-a="scImprimer">Imprimer</button><button class="btn p" data-a="fermer">Fermer</button>', true);
    scGenerer();
  }
  function scGenerer() {
    var d = ST.det, s = ST.ia.script; if (!s) return;
    var fin = function (r, src) { s.blocs = (r.blocs || []).map(function (b) { return { titre: b.titre, duree: b.duree, lignes: (b.lignes || []).map(function (l) { return mention(L.injecter(l, noms(d))); }) }; });
      var x = $('scBlocs'); if (x) x.innerHTML = '<p class="sm">' + (src === 'mistral' ? 'Script préparé par Mistral' : 'Script type (IA indisponible), adapté au type de lead et au statut client') + '.</p>' + s.blocs.map(function (b, i) {
        return '<div class="bl"><h5>' + (i + 1) + '. ' + esc(b.titre) + '<small>' + esc(b.duree || '') + '</small></h5>' + b.lignes.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>'; }).join(''); };
    api('script', { id: d.id }).then(function (r) { if (r.repli || !r.blocs) fin(L.scriptRepli(d), 'repli'); else fin(r, 'mistral'); }).catch(function () { fin(L.scriptRepli(d), 'repli'); });
  }
  function scTexte() { return (ST.ia.script.blocs || []).map(function (b, i) { return (i + 1) + '. ' + b.titre + ' (' + (b.duree || '') + ')\n' + b.lignes.map(function (l) { return '   ' + l; }).join('\n'); }).join('\n\n'); }
  function crEnregistrer() {
    var res = (ST.ia.script || {}).res, cs = v('crCl');
    if (!res) return toast('Indiquez le résultat de l’appel.', true);
    var c = { resultat: res, client_statut: cs, prochaine: v('crPro'), note: v('crNote') };
    var pro = c.prochaine;
    api('compte_rendu', Object.assign({ id: ST.det.id }, c)).then(function (r) {
      ST.ia.script.cr = true; ST.det = r.lead;
      if (cs === 'verifie') { apres(r).then(function () { dlgClient('verifie'); }); return; }
      if (pro === 'cloture') { apres(r).then(function () { dlgCloture(res === 'injoignable' ? 'injoignable' : ''); }); return; }
      if (pro === 'rdv') { apres(r).then(function () { dlgRdv(); }); return; }
      apres(r, 'Compte rendu enregistré.');
    }).catch(erreur);
  }

  /* clôture, rendez-vous, note, statut client, téléphone, rendre */
  function dlgCloture(issue) {
    dlg('Clôturer le lead', '<div class="fld"><span class="lb">Issue (obligatoire)</span>' + Object.keys(L.ISSUES).map(function (k) { return opt('clIssue', k, issue === k, esc(L.ISSUES[k])); }).join('') + '</div><div class="fld"><label for="clNote">Commentaire</label><textarea id="clNote"></textarea></div><p class="note">Un dossier clôturé se rouvre si le dirigeant fait une nouvelle demande (RG-29).</p>',
      '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="cloturer">Clôturer</button>');
  }
  function dlgRdv() {
    var d0 = new Date(Date.now() + 2 * 864e5); d0.setHours(10, 0, 0, 0);
    var iso = d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '-' + ('0' + d0.getDate()).slice(-2) + 'T10:00';
    dlg('Planifier un rendez-vous', '<div class="row"><div class="fld"><label for="rdvD">Date et heure</label><input id="rdvD" type="datetime-local" value="' + iso + '"></div><div class="fld"><label for="rdvN">Lieu ou modalité (visible par le dirigeant)</label><input id="rdvN" placeholder="Au téléphone, en agence de…, visio"></div></div><p class="note">Le dirigeant reçoit l’e-mail E8 et voit le rendez-vous dans « Mon dossier » (S10).</p>',
      '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="rdv">Planifier</button>');
  }
  function dlgNote() { dlg('Ajouter une note interne', '<div class="fld"><label for="ntT">Note (jamais visible par le dirigeant)</label><textarea id="ntT"></textarea></div>', '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="note">Ajouter</button>'); }
  function dlgTel() { dlg('Modifier le téléphone du dirigeant', '<div class="fld"><label for="telV">Téléphone</label><input id="telV" value="' + esc(ST.det.telephone || '') + '"></div><p class="note">Le numéro ne se modifie jamais depuis la page de suivi du dirigeant (RG-44) : il sert au code SMS de l’espace Universels.</p>',
    '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="telephone">Enregistrer</button>'); }
  function dlgRendre() { dlg('Rendre le lead à l’expert BRH', '<div class="fld"><label for="rdR">Raison (mauvais périmètre, autre département, absence…)</label><textarea id="rdR"></textarea></div><p class="note">Le lead revient à l’expert BRH, qui le réaffecte (RG-19, RG-24). Votre accès à ce lead est révoqué.</p>',
    '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="rendre">Rendre le lead</button>'); }
  function dlgClient(pre) {
    var d = ST.det, A = (ST.ann && ST.ann.cr && d.cr && ST.ann.cr.code === d.cr.code ? ST.ann : (ST.annCache || {})[d.cr && d.cr.code]) || { agences: [] };
    dlg('Vérifier le statut client', '<p class="note" style="margin-top:0">Vérifiez dans la base clients de la Caisse régionale, avec vos outils habituels : la plateforme ne consulte jamais cette base (secret bancaire, RG-15).</p>' +
      (d.client_declare ? '<p class="sm">Déclaratif du dirigeant : « ' + esc({ oui: 'oui, déjà client', non: 'non', nsp: 'je ne sais pas' }[d.client_declare] || '') + ' ».</p>' : '') +
      '<div class="fld">' + opt('vcSt', 'verifie', pre === 'verifie' || d.client_statut === 'verifie', '<b>Client vérifié</b><span class="sm">Avec l’agence et le conseiller titulaire du compte</span>') + opt('vcSt', 'prospect', d.client_statut === 'prospect', '<b>Prospect vérifié</b><span class="sm">Pas de compte professionnel au Crédit Agricole</span>') + '</div>' +
      '<div class="row"><div class="fld"><label for="vcAg">Agence du client</label><input id="vcAg" list="vcAgL" value="' + esc(d.client_agence || '') + '"><datalist id="vcAgL">' + (A.agences || []).map(function (a) { return '<option value="' + esc(a.nom) + '">'; }).join('') + '</datalist></div>' +
      '<div class="fld"><label for="vcCo">Conseiller titulaire</label><input id="vcCo" value="' + esc(d.client_conseiller || '') + '"></div><div class="fld"><label for="vcEm">E-mail du conseiller (facultatif)</label><input id="vcEm" value="' + esc(d.client_conseiller_email || '') + '"></div></div>',
      '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="client">Enregistrer</button>');
  }

  /* ================= E6 — annuaire pro et filiales (lecture seule) ================= */
  function vueAnnuaire() {
    var A = ST.ann;
    var h = '<h1>Annuaire pro et filiales</h1><p class="lede">Les destinataires possibles de vos transferts et leur périmètre. Lecture seule : l’annuaire est tenu par l’administrateur. Sigle « Réel » pour les CR pilotes, « Fictif » pour la démonstration.</p>';
    /* LM 2.0.1 : sans Caisse régionale (administrateur) ou en cas d'erreur, un message remplace « Chargement… » */
    if (!A && !(ST.s && ST.s.cr)) {
      $('app').innerHTML = h + (estAdmin()
        ? '<div class="alert i">L’administrateur n’est rattaché à aucune Caisse régionale : l’annuaire de chaque CR se consulte et se met à jour dans <b>Administration → Caisses régionales et annuaire</b>.</div><p><button class="btn p" data-a="onglet" data-v="admin">Ouvrir l’administration</button></p>'
        : '<div class="alert">Aucune Caisse régionale n’est rattachée à votre compte : demandez à l’administrateur de compléter votre fiche dans l’annuaire.</div>');
      return;
    }
    if (!A && ST.annErr) { $('app').innerHTML = h + '<div class="alert e">L’annuaire n’a pas pu être chargé : ' + esc(ST.annErr) + '</div><p><button class="btn" data-a="onglet" data-v="annuaire">Réessayer</button></p>'; return; }
    if (!A) { $('app').innerHTML = h + '<p class="empty">Chargement…</p>'; return; }
    var I = A.interlocuteurs || [], ex = I.filter(function (i) { return i.role === 'expert_brh'; }), pros = I.filter(function (i) { return i.role === 'expert_brh_pro'; });
    var pers = function (i, extra) { return '<div class="p"><b>' + esc(nomI(i)) + '</b>' + rf(i.donnees) + (i.principal ? ' <span class="chip o">principal</span>' : '') + (i.actif ? '' : ' <span class="chip o">inactif</span>') + '<span class="sm">' + esc([i.email, i.telephone].filter(Boolean).join(' · ')) + '</span>' + (extra || '') + '</div>'; };
    h += '<div class="cx"><div class="ctop"><b>Crédit Agricole ' + esc(A.cr ? A.cr.nom : '') + '</b>' + sig(A.cr && A.cr.mode) + '<span class="r">Départements : ' + esc((A.cr && A.cr.departements || []).join(', ')) + '</span></div><div style="padding:14px">';
    h += '<h2 style="margin-top:0">Experts BRH</h2><div class="ann"><div class="card">' + (ex.map(function (i) { return pers(i, i.perimetre ? '<span class="sm">Périmètre : ' + esc(i.perimetre) + '</span>' : ''); }).join('') || '<p class="sm">À saisir.</p>') + '</div></div>';
    h += '<h2>Experts BRH PRO et périmètre</h2><div class="ann">' + (pros.map(function (i) { return '<div class="card"><h5>' + esc(i.perimetre ? 'Périmètre : ' + i.perimetre.split(',').map(function (x) { x = x.trim(); return /^\d/.test(x) ? L.nomDep(x) : x; }).join(', ') : 'Départements ' + i.departements) + '</h5>' + pers(i, '<span class="sm">' + (i.charge || 0) + ' lead(s) en cours</span>') + '</div>'; }).join('') || '<div class="card"><p class="sm">Pas d’expert BRH PRO : transfert au conseiller pro (Q7).</p></div>') + '</div>';
    h += '<h2>Agences et conseillers pro</h2><div class="ann">' + (A.agences || []).map(function (a) {
      var cs = I.filter(function (i) { return i.role === 'conseiller_pro' && i.agence_id === a.id; });
      return '<div class="card"><h5>' + esc(a.nom) + ' <span class="sm" style="display:inline">' + esc((a.cp || '') + ' · ' + L.nomDep(a.departement)) + '</span></h5>' + (cs.map(function (i) { return pers(i, '<span class="sm">' + (i.charge || 0) + ' lead(s) en cours</span>'); }).join('') || '<p class="sm">Aucun conseiller saisi.</p>') + '</div>'; }).join('') + '</div>';
    h += '<h2>Filiales <span class="note">(transferts exceptionnels de demandes de devis, RG-22)</span></h2><div class="ann">' + (A.filiales || []).map(function (f) {
      return '<div class="card"><h5>' + esc(f.lib) + '</h5>' + pers(f, '<span class="sm">Outil : ' + esc(f.outil) + ' · solutions : ' + esc((L.FILIALES[f.filiale] || { solutions: [] }).solutions.map(function (s) { return L.SOLUTIONS[s]; }).join(', ')) + '</span>') + '</div>'; }).join('') + '</div>';
    $('app').innerHTML = h + '</div></div>';
  }

  /* ================= E8, E9 — administration ================= */
  var SUBS = [['annuaire', 'Caisses régionales et annuaire'], ['envoi', 'Envoi des e-mails'], ['modeles', 'Modèles d’e-mails'], ['parametres', 'Délais et paramètres'], ['attribuer', 'Leads à attribuer'], ['journal', 'Journal des modifications']];
  function admCharger() {
    var s = ST.adm.sub, p;
    if (s === 'annuaire') p = api('admin_cr').then(function (r) { ST.adm.crs = r.crs; ST.adm.aAttribuer = r.a_attribuer; if (!ST.adm.cr) ST.adm.cr = (r.crs.filter(function (c) { return c.mode === 'pilote'; })[0] || r.crs[0] || {}).code; return admIts(); });
    else if (s === 'envoi') p = api('admin_envoi').then(function (r) { ST.adm.envoi = r; });
    else if (s === 'modeles') p = api('admin_modeles').then(function (r) { ST.adm.modeles = r; if (!ST.adm.modele) ST.adm.modele = 'E4'; });
    else if (s === 'parametres') p = api('admin_parametres').then(function (r) { ST.adm.params = r.parametres; });
    else if (s === 'attribuer') p = api('leads', { cr: '_a_attribuer' }).then(function (r) { ST.adm.aAttr = r.leads; return api('admin_cr').then(function (x) { ST.adm.crs = x.crs; }); });
    else p = api('admin_journal').then(function (r) { ST.adm.journal = r.journal; });
    return p.then(vueAdmin).catch(erreur);
  }
  function admIts() { return api('admin_interlocuteurs', { cr: ST.adm.cr }).then(function (r) { ST.adm.its = r; }); }
  function vueAdmin() {
    if (ST.tab !== 'admin') return;
    var h = '<h1>Administration</h1><p class="lede">Réservée à l’administrateur : annuaire réel des Caisses régionales pilotes, démonstration pour les autres, envoi réel des e-mails, modèles, délais et file « à attribuer ».</p>' +
      '<div class="sub" role="group">' + SUBS.map(function (x) { return '<button data-a="admSub" data-v="' + x[0] + '" aria-pressed="' + (ST.adm.sub === x[0]) + '">' + x[1] + (x[0] === 'attribuer' && ST.adm.aAttribuer ? ' (' + ST.adm.aAttribuer + ')' : '') + '</button>'; }).join('') + '</div><div id="admC">';
    var s = ST.adm.sub;
    h += s === 'annuaire' ? admAnnuaire() : s === 'envoi' ? admEnvoi() : s === 'modeles' ? admModeles() : s === 'parametres' ? admParams() : s === 'attribuer' ? admAttribuer() : admJournal();
    $('app').innerHTML = h + '</div>';
    if (s === 'modeles') admApercu();
  }
  function admAnnuaire() {
    var crs = ST.adm.crs || [], c = crs.filter(function (x) { return x.code === ST.adm.cr; })[0], I = ST.adm.its || { interlocuteurs: [], alertes: [] };
    var h = '<div class="cols"><div class="crl" role="group" aria-label="Caisses régionales">' + crs.map(function (x) {
      return '<button data-a="admCr" data-v="' + esc(x.code) + '" aria-pressed="' + (x.code === ST.adm.cr) + '">' + esc(x.nom) + sig(x.mode) + '<span class="n">' + (x.mode === 'pilote' ? (x.reels ? x.reels + ' réel(s)' : 'à saisir') : x.fictifs + ' fictif(s)') + ' · ' + x.leads + ' lead(s)</span></button>'; }).join('') +
      '<button data-a="admCr" data-v="_filiales" aria-pressed="' + (ST.adm.cr === '_filiales') + '">Boîtes des filiales<span class="n">3 boîtes</span></button></div><div>';
    if (ST.adm.cr === '_filiales') {
      h += '<h2 style="margin-top:0">Boîtes génériques des filiales</h2><p class="note">Une boîte par filiale, avec accès ponctuel comme pour un conseiller pro (Q11). Seules les boîtes « Réel » reçoivent de vrais e-mails.</p><table class="tbl"><thead><tr><th>Filiale</th><th>E-mail</th><th>Sigle</th><th></th></tr></thead><tbody>' +
        I.interlocuteurs.map(function (i) { return '<tr><td><b>' + esc((L.FILIALES[i.filiale] || {}).lib) + '</b></td><td>' + esc(i.email) + '</td><td>' + rf(i.donnees) + '</td><td><button class="btn s" data-a="admFiliale" data-v="' + i.id + '">Modifier</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
      return h;
    }
    if (!c) return h + '<p class="empty">Choisissez une Caisse régionale.</p></div></div>';
    h += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h2 style="margin:0">Crédit Agricole ' + esc(c.nom) + sig(c.mode) + '</h2><span class="sm" style="display:inline">Départements ' + esc(c.departements.join(', ')) + '</span></div>' +
      '<div class="acts"><button class="btn p" data-a="admAjout">Ajouter un interlocuteur</button><button class="btn" data-a="admImport">Importer un fichier CSV</button><button class="btn" data-a="admExport">Exporter</button>' +
      (c.mode === 'pilote' ? '<button class="btn d" data-a="admMode" data-v="demo">Repasser en démonstration</button>' : '<button class="btn" data-a="admMode" data-v="pilote">Passer en PILOTE (données réelles)</button><button class="btn" data-a="admVoir">Voir la console comme l’expert</button>') + '</div>' +
      (c.mode === 'pilote' && !c.reels ? '<div class="alert">CR pilote sans interlocuteur réel : saisissez ou importez l’annuaire (annexe D). Les données fictives sont masquées, jamais supprimées.</div>' : '') +
      (c.masques ? '<p class="note">' + c.masques + ' interlocuteur(s) ' + (c.mode === 'pilote' ? 'fictif(s)' : 'réel(s)') + ' masqué(s) dans ce mode, restaurables en changeant de mode (RG-57).</p>' : '') +
      (I.alertes || []).map(function (a) { return '<div class="alert">' + esc(a) + '</div>'; }).join('');
    h += '<div style="overflow:auto"><table class="tbl"><thead><tr><th>Rôle</th><th>Interlocuteur</th><th>Contact</th><th>Département(s)</th><th>Ville ou agence</th><th>Périmètre</th><th>Charge</th><th></th></tr></thead><tbody>' +
      (I.interlocuteurs.map(function (i) {
        return '<tr' + (i.masque || !i.actif ? ' style="opacity:.5"' : '') + '><td>' + esc(L.ROLES[i.role] || i.role) + (i.principal ? '<span class="sm">principal</span>' : '') + '</td><td class="nm"><b>' + esc(nomI(i)) + rf(i.donnees) + '</b>' + (i.masque ? '<span class="sm">masqué (mode ' + (c.mode === 'pilote' ? 'pilote' : 'démo') + ')</span>' : '') + (!i.actif ? '<span class="sm">inactif</span>' : '') + (i.role === 'expert_brh' ? '<span class="sm">' + (i.compte ? 'compte console actif' : 'sans mot de passe') + '</span>' : '') + '</td>' +
          '<td>' + esc(i.email) + '<span class="sm">' + esc(i.telephone || '') + '</span></td><td>' + esc(i.departements || '') + '</td><td>' + esc(i.ville_agence || '') + '</td><td>' + esc(i.perimetre || '') + '</td><td>' + (i.charge || 0) + '</td>' +
          '<td style="white-space:nowrap">' + (i.role === 'hors_annuaire' ? '' : '<button class="btn s" data-a="admModif" data-v="' + i.id + '">Modifier</button> ') + '<button class="btn s' + (i.actif ? ' d' : '') + '" data-a="admActif" data-v="' + i.id + '" data-on="' + (i.actif ? 0 : 1) + '">' + (i.actif ? 'Désactiver' : 'Réactiver') + '</button></td></tr>'; }).join('') || '<tr><td colspan="8" class="empty">Aucun interlocuteur.</td></tr>') + '</tbody></table></div></div></div>';
    return h;
  }
  function admForm(i) {
    var c = (ST.adm.crs || []).filter(function (x) { return x.code === ST.adm.cr; })[0] || { departements: [] }, ags = (ST.adm.its || {}).agences || [];
    i = i || { role: 'conseiller_pro', donnees: c.mode === 'pilote' ? 'reel' : 'fictif', actif: 1, departements: c.departements[0] || '' };
    var sel = function (id, opts, val) { return '<select id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
    dlg(i.id ? 'Modifier l’interlocuteur' : 'Ajouter un interlocuteur — ' + c.nom,
      '<div class="row"><div class="fld"><label for="fRole">Rôle</label>' + sel('fRole', [['expert_brh', 'Expert BRH'], ['expert_brh_pro', 'Expert BRH PRO'], ['conseiller_pro', 'Conseiller pro']], i.role) + '</div>' +
      '<div class="fld"><label for="fDon">Sigle</label>' + sel('fDon', [['reel', 'Réel (CR pilote)'], ['fictif', 'Fictif (démonstration)']], i.donnees) + '</div></div>' +
      '<div class="row"><div class="fld"><label for="fPre">Prénom</label><input id="fPre" value="' + esc(i.prenom || '') + '"></div><div class="fld"><label for="fNom">Nom</label><input id="fNom" value="' + esc(i.nom || '') + '"></div></div>' +
      '<div class="row"><div class="fld"><label for="fMail">E-mail professionnel</label><input id="fMail" type="email" value="' + esc(i.email || '') + '"></div><div class="fld"><label for="fTel">Téléphone professionnel</label><input id="fTel" value="' + esc(i.telephone || '') + '" placeholder="02 47 00 00 60"></div></div>' +
      '<div class="row"><div class="fld"><label for="fDep">Département(s) (' + esc(c.departements.join(', ')) + ')</label><input id="fDep" value="' + esc(i.departements || '') + '"></div>' +
      '<div class="fld"><label for="fAg">Ville ou agence (conseiller pro : agence)</label><input id="fAg" list="fAgL" value="' + esc(i.ville_agence || '') + '"><datalist id="fAgL">' + ags.map(function (a) { return '<option value="' + esc(a.nom) + '">'; }).join('') + '</datalist></div></div>' +
      '<div class="fld"><label for="fPer">Périmètre (expert BRH PRO : départements ou villes, séparés par une virgule)</label><input id="fPer" value="' + esc(i.perimetre || '') + '" placeholder="28 — ou — Tours, Amboise"></div>' +
      '<label class="sw"><input type="checkbox" id="fPri"' + (i.principal ? ' checked' : '') + '><span>Interlocuteur principal de la CR pour ce rôle (suggestion par défaut)</span></label>' +
      '<div class="fld" style="margin-top:8px"><label for="fMdp">Mot de passe de la console (expert BRH seulement, 10 caractères au moins' + (i.id ? ', laisser vide pour ne pas changer' : '') + ')</label><input id="fMdp" type="password" autocomplete="new-password"></div>',
      '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="admEnregistrer" data-v="' + (i.id || '') + '">Enregistrer</button>');
  }
  function admEnregistrer(id) {
    var c = { id: id ? +id : 0, cr_code: ST.adm.cr, role: v('fRole'), donnees: v('fDon'), prenom: v('fPre'), nom: v('fNom'), email: v('fMail'), telephone: v('fTel'), departements: v('fDep'), ville_agence: v('fAg'), perimetre: v('fPer'), principal: coche('fPri'), mot_de_passe: v('fMdp'), actif: 'oui' };
    var old = id ? (ST.adm.its.interlocuteurs || []).filter(function (i) { return i.id === +id; })[0] : null; if (old && !old.actif) c.actif = 'non';
    api('admin_interlocuteur', c).then(function () { fermer(); toast('Annuaire enregistré.'); ST.ann = null; return admCharger(); }).catch(erreur);
  }
  var MODELE_CSV = 'caisse_regionale;role;prenom;nom;email_pro;telephone_pro;departements;ville_agence;perimetre;donnees;actif\ntouraine-poitou;conseiller_pro;Julie;BLANC;j.blanc@exemple-ca-tp.fr;02 47 00 00 60;37;Agence de Tours;;reel;oui\n';
  function admImport() {
    dlg('Importer l’annuaire (fichier CSV, annexe D)', '<p class="note" style="margin-top:0">Une ligne par interlocuteur, séparateur point-virgule, UTF-8. Colonnes obligatoires : caisse_regionale, role, prenom, nom, email_pro, departements, donnees. Contrôle des colonnes, des e-mails, des téléphones, des départements et des doublons ; aperçu avant enregistrement.</p>' +
      '<div class="fld"><label for="imF">Fichier</label><input id="imF" type="file" accept=".csv,text/csv" data-c="imF"></div><div class="fld"><label for="imT">Ou collez le contenu</label><textarea id="imT" style="min-height:140px;font-family:ui-monospace,Menlo,monospace;font-size:.78rem"></textarea></div><div id="imR"></div>',
      '<button class="btn" data-a="imModele">Télécharger le modèle</button><button class="btn" data-a="fermer">Annuler</button><button class="btn" data-a="imControler">Contrôler (aperçu)</button><button class="btn p" data-a="imEnregistrer" disabled id="imOk">Enregistrer les lignes valides</button>', true);
  }
  function imAppel(simuler) {
    api('admin_import', { csv: v('imT'), simuler: simuler }).then(function (r) {
      if (!simuler) { fermer(); toast(r.ajoutes + ' interlocuteur(s) ajouté(s), ' + r.refuses + ' ligne(s) refusée(s).'); ST.ann = null; return admCharger(); }
      $('imR').innerHTML = '<div class="alert ' + (r.refuses ? '' : 'i') + '">' + r.valides + ' ligne(s) valide(s), ' + r.refuses + ' refusée(s).</div><table class="tbl"><tbody>' + r.rapport.map(function (x) {
        return '<tr><td>Ligne ' + x.ligne + '</td><td>' + esc(x.resume) + '</td><td>' + (x.ok ? '<span class="bd e-envoye">valide</span>' : '<span class="bd e-echec">refusée</span><span class="sm">' + esc(x.erreurs.join(' ; ')) + '</span>') + '</td></tr>'; }).join('') + '</tbody></table>';
      var b = $('imOk'); if (b) b.disabled = !r.valides;
    }).catch(erreur);
  }
  function admEnvoi() {
    var e = ST.adm.envoi; if (!e) return '<p class="empty">Chargement…</p>';
    var g = e.reglages, dot = function (ok, na) { return '<span class="ok-dot' + (na ? ' na' : (ok ? '' : ' ko')) + '"></span>'; };
    var sw = function (k, lib, aide, dis) { return '<label class="sw"><input type="checkbox" data-a="envoiSw" data-v="' + k + '"' + (g[k] ? ' checked' : '') + (dis ? ' disabled' : '') + '><span><b>' + lib + '</b><span class="sm">' + aide + '</span></span></label>'; };
    var h = '<div class="cols"><div><h2 style="margin-top:0">Envoi réel</h2>' + sw('reel', 'Envoi réel des e-mails', g.reel ? 'Activé : les e-mails partent selon les réglages ci-dessous.' : 'Désactivé (par défaut) : les e-mails sont seulement journalisés.') +
      sw('interlocuteurs', 'Interlocuteurs', 'Experts BRH, experts BRH PRO, conseillers pro « Réel » des CR pilotes', !g.reel) + sw('filiales', 'Filiales', 'Boîtes génériques « Réel » des filiales', !g.reel) +
      sw('dirigeants', 'Dirigeants', 'Coupé : redirigés vers l’adresse de test' + (e.test_dirigeants ? ' (' + esc(e.test_dirigeants) + ')' : ' (LM2_TEST_DIRIGEANTS, non renseignée : journal seulement)') + ' tant que la Conformité ne l’a pas levé', !g.reel) +
      '<h2>Par Caisse régionale pilote</h2>' + (e.crs || []).map(function (c) { return '<label class="sw"><input type="checkbox" data-a="envoiCr" data-v="' + esc(c.code) + '"' + (c.envoi ? ' checked' : '') + '><span>' + esc(c.nom) + sig('pilote') + '</span><span class="sm">' + c.reels + ' interlocuteur(s) réel(s)</span></label>'; }).join('') +
      '<p class="note">Jamais d’envoi à un interlocuteur Fictif ni dans une CR en démonstration (RG-54, RG-62).</p></div>' +
      '<div><h2 style="margin-top:0">Expéditeur et serveur d’envoi</h2><dl class="kv">' + kv('Expéditeur', esc(e.nom) + ' &lt;' + esc(e.expediteur) + '&gt;', true) + kv('Réponses', 'adressées à l’expert BRH à l’origine du lead ou du transfert (Reply-To)') +
      kv('Serveur SMTP', dot(e.smtp.configure) + (e.smtp.configure ? esc(e.smtp.hote + ':' + e.smtp.port + ' (' + e.smtp.securite + ')' + (e.smtp.utilisateur ? ', ' + e.smtp.utilisateur : '')) : 'non configuré : fonction mail() de PHP (config.php : LM_SMTP_*)'), true) +
      kv('Domaine', esc(e.dns.domaine || '')) + kv('SPF / DKIM / DMARC', e.dns.verifiable === false ? dot(0, 1) + 'vérification DNS indisponible sur ce serveur' : dot(e.dns.spf) + 'SPF ' + dot(e.dns.dkim) + 'DKIM ' + dot(e.dns.dmarc) + 'DMARC <button class="btn l" data-a="envoiDns">vérifier</button>', true) + '</dl>' +
      '<h2>E-mail de test</h2><div class="row"><input id="tMail" type="email" placeholder="votre.adresse@exemple.fr" aria-label="Adresse de test"><button class="btn p" data-a="envoiTest">Envoyer un e-mail de test</button></div></div></div>';
    h += '<h2>Journal des derniers envois</h2><div style="overflow:auto"><table class="tbl"><thead><tr><th>Date</th><th>Modèle</th><th>Destinataire</th><th>Lead</th><th>Statut</th></tr></thead><tbody>' + ((e.journal || []).map(function (j) {
      return '<tr><td>' + esc(dateFr(j.cree_le)) + '</td><td>' + esc(j.modele) + '<span class="sm">' + esc(j.objet) + '</span></td><td>' + esc(j.destinataire_nom || '') + '<span class="sm">' + esc(j.destinataire || '') + (j.envoye_a && j.envoye_a !== j.destinataire ? ' → ' + esc(j.envoye_a) : '') + '</span></td><td>' + esc(j.reference || '—') + '</td>' +
        '<td><span class="bd e-' + esc(j.statut) + '">' + esc({ envoye: 'Envoyé', journal: 'Journalisé', non_envoye: 'Non envoyé', echec: 'Échec', attente: 'En attente' }[j.statut] || j.statut) + '</span><span class="sm">' + esc(j.motif || '') + (j.essais > 1 ? ' · ' + j.essais + ' essais' : '') + '</span></td></tr>'; }).join('') || '<tr><td colspan="5" class="empty">Aucun e-mail.</td></tr>') + '</tbody></table></div>';
    return h;
  }
  function admModeles() {
    var M = ST.adm.modeles; if (!M) return '<p class="empty">Chargement…</p>';
    var m = M.modeles.filter(function (x) { return x.code === ST.adm.modele; })[0] || M.modeles[0];
    return '<div class="cols"><div class="crl">' + M.modeles.map(function (x) { return '<button data-a="modChoix" data-v="' + x.code + '" aria-pressed="' + (x.code === m.code) + '"><b>' + x.code + '</b> ' + esc(x.lib) + '<span class="n">' + esc({ dirigeant: 'dirigeant', interlocuteur: 'interlocuteur', test: 'test' }[x.cat]) + (x.modifie ? ' · modifié' : '') + '</span></button>'; }).join('') + '</div>' +
      '<div><div class="fld"><label for="modObj">Objet</label><input id="modObj" value="' + esc(m.objet) + '"></div><div class="fld"><label for="modTxt">Texte</label><textarea id="modTxt" style="min-height:150px">' + esc(m.texte) + '</textarea></div>' +
      '<p class="note">Champs automatiques : ' + esc(M.champs.join(' ')) + '. La fiche client et les boutons « Ouvrir la fiche du lead » et « Voir le script d’appel » sont ajoutés automatiquement aux e-mails des interlocuteurs (RG-63).</p>' +
      '<div class="acts"><button class="btn p" data-a="modEnregistrer">Enregistrer</button><button class="btn" data-a="modApercu">Aperçu</button><button class="btn d" data-a="modReinit">Revenir au texte d’origine</button></div>' +
      '<div class="mail-prev"><div class="ctx" id="modApObj" style="margin:0;border-radius:0"></div><iframe id="modAp" title="Aperçu de l’e-mail" sandbox=""></iframe></div></div></div>';
  }
  function admApercu() {
    api('admin_modele_apercu', { code: ST.adm.modele, objet: v('modObj'), texte: v('modTxt') }).then(function (r) { var f = $('modAp'); if (f) f.srcdoc = r.html; var o = $('modApObj'); if (o) o.textContent = 'Objet : ' + r.objet; }).catch(function () {});
  }
  function admParams() {
    var p = ST.adm.params; if (!p) return '<p class="empty">Chargement…</p>';
    var n = function (id, lib, val, aide) { return '<div class="fld"><label for="' + id + '">' + lib + '</label><input id="' + id + '" type="number" min="1" value="' + esc(val) + '">' + (aide ? '<span class="sm">' + aide + '</span>' : '') + '</div>'; };
    return '<div class="row" style="max-width:900px">' + n('pSeuil', 'Seuil Pro / Entreprise (salariés)', p.seuil_pro, 'Q1 : simple suggestion à l’expert') + n('pDevis', 'Délai — demande de devis (jours ouvrés)', p.jours.devis, '1 = 24 h ouvrées') +
      n('pUltra', 'Délai — ultra-qualifié (jours ouvrés)', p.jours.ultra, '2 = 48 h ouvrées') + n('pQual', 'Délai — qualifié (jours ouvrés)', p.jours.qualifie) + n('pRappel', 'Délai — qualifié avec rappel demandé', p.jours.rappel, 'Q2') +
      n('pAcces', 'Validité d’un accès ponctuel (jours)', p.acces_jours, 'RG-23') + n('pAlerte', 'Alerte transfert non pris en charge (jours ouvrés)', p.transfert_alerte_jours, 'RG-25') + '</div>' +
      '<div class="acts"><button class="btn p" data-a="paramEnregistrer">Enregistrer</button></div>' +
      '<h2>Reprise et tâches</h2><div class="row" style="max-width:900px"><div class="fld"><label for="pRep">Reprendre les demandes existantes des … derniers jours</label><input id="pRep" type="number" min="1" max="366" value="60"><span class="sm">Demandes de la table « leads » pas encore rattachées à un dossier LM 2.0</span></div></div>' +
      '<div class="acts"><button class="btn" data-a="reprise">Lancer la reprise</button><button class="btn" data-a="taches">Lancer les tâches planifiées maintenant</button></div>';
  }
  function admAttribuer() {
    var ls = ST.adm.aAttr || [];
    return '<p class="note" style="margin-top:0">Leads sans Caisse régionale identifiable (département absent ou hors table, RG-12) : choisissez la CR.</p><table class="tbl"><thead><tr><th>Lead</th><th>Type</th><th>Reçu le</th><th>Caisse régionale</th></tr></thead><tbody>' + (ls.map(function (l) {
      return '<tr><td class="nm"><b>' + esc(l.raison_sociale || 'Entreprise non renseignée') + '</b><span class="sm">' + esc([l.prenom, l.nom, l.ville, l.code_postal].filter(Boolean).join(' · ')) + '</span></td><td>' + badgeType(l.type) + '</td><td>' + esc(dateFr(l.cree_le)) + '</td>' +
        '<td><select id="att' + l.id + '">' + (ST.adm.crs || []).map(function (c) { return '<option value="' + esc(c.code) + '">' + esc(c.nom) + '</option>'; }).join('') + '</select> <button class="btn s p" data-a="attribuer" data-v="' + l.id + '">Attribuer</button></td></tr>'; }).join('') || '<tr><td colspan="4" class="empty">Aucun lead à attribuer.</td></tr>') + '</tbody></table>';
  }
  function admJournal() {
    return '<table class="tbl"><thead><tr><th>Date</th><th>Auteur</th><th>Modification</th><th>Avant → après</th></tr></thead><tbody>' + ((ST.adm.journal || []).map(function (j) {
      return '<tr><td>' + esc(dateFr(j.cree_le)) + '</td><td>' + esc(j.auteur) + '</td><td>' + esc(j.objet) + '</td><td><span class="sm" style="max-width:520px;overflow-wrap:anywhere">' + esc(j.avant || '—') + ' → ' + esc(j.apres || '—') + '</span></td></tr>'; }).join('') || '<tr><td colspan="4" class="empty">Aucune modification.</td></tr>') + '</tbody></table>';
  }

  /* ================= événements (délégation) ================= */
  var ACTIONS = {
    connexion: connexion, deconnexion: function () { api('deconnexion').then(function () { location.href = 'console.html'; }).catch(function () { location.href = 'console.html'; }); },
    accesCode: function () { api('acces_code', { jeton: ST.acces.jeton, code: v('acCode') }).then(accesEntrer).catch(function (e) { var x = $('acErr'); x.textContent = e.message; x.classList.remove('hidden'); }); },
    accesRenvoi: function () { accesOuvrir(ST.acces.jeton); },
    onglet: function (b) { onglet(b.getAttribute('data-v')); },
    quitterVue: function () { api('admin_quitter_vue').then(function () { ST.ann = null; ST.det = null; ST.sel = null; ST.tab = 'admin'; return session(); }).catch(erreur); },
    kpi: function (b) { var t = b.getAttribute('data-v'); ST.f.type = ST.f.type === t ? '' : t; vueLeads(); },
    etat: function (b) { ST.f.etat = b.getAttribute('data-v'); vueLeads(); },
    choisir: function (b) { ouvrir(+b.getAttribute('data-id')); var f = $('fiche'); if (f && f.scrollIntoView && window.matchMedia && window.matchMedia('(max-width:1150px)').matches) f.scrollIntoView({ behavior: 'smooth' }); },
    exporter: function () { api('export', estAdmin() ? { cr: ST.crAdmin === '_a_attribuer' ? '' : ST.crAdmin } : {}).then(function (r) { telecharger('leads-BRH-' + aujourdhui() + '.csv', r.csv); toast(r.nombre + ' lead(s) exporté(s).'); }).catch(erreur); },
    traiter: function () { act('traiter', {}, estAcces() ? 'Lead pris en charge.' : (ST.det.statut === 'transfere' ? 'Lead repris : transfert clos, accès révoqué.' : 'Lead pris en charge : le dirigeant est informé (E3).')); },
    proposition: function () { act('proposition', {}, 'Statut « Proposition ».'); },
    dlgTransfert: dlgTransfert, transferer: transferer, dlgEmail: dlgEmail, dlgScript: dlgScript, dlgCloture: function () { dlgCloture(''); }, dlgRdv: dlgRdv, dlgNote: dlgNote, dlgTel: dlgTel, dlgRendre: dlgRendre,
    dlgClient: function () { dlgClient(''); },
    cloturer: function () { var i = radio('clIssue'); if (!i) return toast('Choisissez l’issue du lead.', true); act('cloturer', { issue: i, note: v('clNote') }, 'Lead clôturé.'); },
    rdv: function () { act('rdv', { date: v('rdvD'), note: v('rdvN') }, 'Rendez-vous planifié : e-mail E8 au dirigeant.'); },
    note: function () { act('note', { texte: v('ntT') }, 'Note ajoutée.'); },
    telephone: function () { act('telephone', { telephone: v('telV') }, 'Téléphone modifié.'); },
    rendre: function () { api('rendre', { id: ST.det.id, raison: v('rdR') }).then(function () { fermer(); toast('Lead rendu à l’expert BRH.'); ST.det = null; ST.sel = null; return chargerLeads(); }).catch(erreur); },
    client: function () { var s = radio('vcSt'); if (!s) return toast('Choisissez « client vérifié » ou « prospect vérifié ».', true); act('client', { statut: s, agence: v('vcAg'), conseiller: v('vcCo'), email: v('vcEm') }, 'Statut client vérifié.'); },
    accesProlonger: function (b) { act('acces_prolonger', { transfert_id: +b.getAttribute('data-v') }, 'Accès prolongé.'); },
    accesRevoquer: function (b) { if (!window.confirm('Révoquer l’accès ? Le lead revient dans votre file.')) return; act('acces_revoquer', { transfert_id: +b.getAttribute('data-v') }, 'Accès révoqué : le lead revient dans votre file.'); },
    copierLien: function (b) { copier(b.getAttribute('data-v')); },
    ton: function (b) { ST.ia.mail.ton = b.getAttribute('data-v'); [].forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); mGenerer(); },
    mGenerer: mGenerer,
    mCopier: function (b) { var p = ST.ia.mail.props[+b.getAttribute('data-v')]; copier('Objet : ' + p.objet + '\n\n' + p.corps); },
    mNoter: function (b) { var p = ST.ia.mail.props[+b.getAttribute('data-v')]; api('email_note', { id: ST.det.id, objet: p.objet }).then(function (r) { ST.det = r.lead; majFiche(); toast('Noté dans l’historique (objet et date).'); }).catch(erreur); },
    scGenerer: scGenerer, scCopier: function () { copier(scTexte()); },
    scImprimer: function () { var w = window.open('', '_blank'); if (!w) return toast('Fenêtre bloquée par le navigateur.', true); w.document.write('<title>Script d’appel</title><pre style="font:14px/1.5 Arial;white-space:pre-wrap">' + esc(ST.det.raison_sociale + '\n\n' + scTexte()) + '</pre>'); w.document.close(); w.print(); },
    crRes: function (b) { ST.ia.script.res = b.getAttribute('data-v'); [].forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); },
    crEnregistrer: crEnregistrer,
    fermer: fermer, masque: function (b, e) { if (e.target === b) fermer(); },
    admSub: function (b) { ST.adm.sub = b.getAttribute('data-v'); vueAdmin(); admCharger(); },
    admCr: function (b) { ST.adm.cr = b.getAttribute('data-v'); admIts().then(vueAdmin).catch(erreur); },
    admAjout: function () { admForm(null); }, admModif: function (b) { admForm((ST.adm.its.interlocuteurs || []).filter(function (i) { return i.id === +b.getAttribute('data-v'); })[0]); },
    admEnregistrer: function (b) { admEnregistrer(b.getAttribute('data-v')); },
    admActif: function (b) { var on = b.getAttribute('data-on') === '1'; api('admin_interlocuteur_actif', { id: +b.getAttribute('data-v'), actif: on }).then(function (r) { toast(on ? 'Interlocuteur réactivé.' : 'Interlocuteur désactivé' + (r.rendus ? ' : ' + r.rendus + ' lead(s) rendu(s) à l’expert BRH.' : '.')); ST.ann = null; return admCharger(); }).catch(erreur); },
    admFiliale: function (b) { var i = (ST.adm.its.interlocuteurs || []).filter(function (x) { return x.id === +b.getAttribute('data-v'); })[0];
      dlg('Boîte ' + ((L.FILIALES[i.filiale] || {}).lib || ''), '<div class="fld"><label for="fiMail">E-mail de la boîte</label><input id="fiMail" value="' + esc(i.email) + '"></div><div class="fld"><label for="fiDon">Sigle</label><select id="fiDon"><option value="fictif"' + (i.donnees === 'fictif' ? ' selected' : '') + '>Fictif</option><option value="reel"' + (i.donnees === 'reel' ? ' selected' : '') + '>Réel</option></select></div>',
        '<button class="btn" data-a="fermer">Annuler</button><button class="btn p" data-a="admFilialeOk" data-v="' + i.id + '">Enregistrer</button>'); },
    admFilialeOk: function (b) { api('admin_interlocuteur', { id: +b.getAttribute('data-v'), email: v('fiMail'), donnees: v('fiDon') }).then(function () { fermer(); ST.ann = null; return admCharger(); }).catch(erreur); },
    admImport: admImport, imControler: function () { imAppel(true); }, imEnregistrer: function () { imAppel(false); }, imModele: function () { telecharger('modele-annuaire-BRH.csv', MODELE_CSV); },
    admExport: function () { api('admin_export', { cr: ST.adm.cr }).then(function (r) { telecharger('annuaire-' + ST.adm.cr + '-' + aujourdhui() + '.csv', r.csv); }).catch(erreur); },
    admMode: function (b) { var m = b.getAttribute('data-v');
      if (!window.confirm(m === 'demo' ? 'Repasser cette CR en démonstration ? Les interlocuteurs réels sont masqués (pas supprimés) et l’envoi réel est coupé pour cette CR.' : 'Passer cette CR en PILOTE ? L’annuaire fictif est masqué : saisissez ou importez les interlocuteurs réels.')) return;
      api('admin_cr_mode', { cr: ST.adm.cr, mode: m }).then(function () { toast('Mode modifié.'); return admCharger(); }).catch(erreur); },
    admVoir: function () { api('admin_voir_comme', { cr: ST.adm.cr }).then(function () { ST.ann = null; ST.det = null; ST.sel = null; ST.tab = 'leads'; return session(); }).catch(erreur); },
    envoiSw: function (b) { var g = Object.assign({}, ST.adm.envoi.reglages); g[b.getAttribute('data-v')] = !!b.checked; api('admin_envoi_enregistrer', g).then(function () { toast('Réglage enregistré.'); return admCharger(); }).catch(erreur); },
    envoiCr: function (b) { api('admin_cr_envoi', { cr: b.getAttribute('data-v'), envoi: !!b.checked }).then(function () { toast('Réglage enregistré.'); return admCharger(); }).catch(erreur); },
    envoiDns: function () { api('admin_envoi', { dns: true }).then(function (r) { ST.adm.envoi = r; vueAdmin(); }).catch(erreur); },
    envoiTest: function () { api('admin_email_test', { email: v('tMail') }).then(function () { toast('E-mail de test envoyé.'); return admCharger(); }).catch(function (e) { erreur(e); admCharger(); }); },
    modChoix: function (b) { ST.adm.modele = b.getAttribute('data-v'); vueAdmin(); },
    modApercu: admApercu,
    modEnregistrer: function () { api('admin_modele_enregistrer', { code: ST.adm.modele, objet: v('modObj'), texte: v('modTxt') }).then(function () { toast('Modèle enregistré.'); return admCharger(); }).catch(erreur); },
    modReinit: function () { api('admin_modele_enregistrer', { code: ST.adm.modele, reinitialiser: true }).then(function () { toast('Texte d’origine rétabli.'); return admCharger(); }).catch(erreur); },
    paramEnregistrer: function () { api('admin_parametres_enregistrer', { seuil_pro: v('pSeuil'), acces_jours: v('pAcces'), transfert_alerte_jours: v('pAlerte'), jours: { devis: v('pDevis'), ultra: v('pUltra'), qualifie: v('pQual'), rappel: v('pRappel') } })
      .then(function (r) { ST.s.parametres = r.parametres; ST.adm.params = r.parametres; toast('Paramètres enregistrés (nouveaux leads).'); vueAdmin(); }).catch(erreur); },
    reprise: function () { api('admin_reprise', { jours: v('pRep') }).then(function (r) { toast(r.integrees + ' demande(s) reprise(s).'); }).catch(erreur); },
    taches: function () { api('admin_taches').then(function (r) { toast('Tâches : ' + r.integres + ' intégrée(s), ' + r.relances + ' relance(s), ' + r.alertes + ' alerte(s), ' + r.recap + ' récapitulatif(s).'); }).catch(erreur); },
    attribuer: function (b) { var id = +b.getAttribute('data-v'); api('admin_attribuer', { id: id, cr: v('att' + id) }).then(function () { toast('Lead attribué.'); return admCharger(); }).catch(erreur); }
  };
  var CHANGES = {
    q: function (e) { ST.f.q = e.value; majListe(); }, type: function (e) { ST.f.type = e.value; vueLeads(); }, statut: function (e) { ST.f.statut = e.value; vueLeads(); }, assigne: function (e) { ST.f.assigne = e.value; vueLeads(); },
    crAdmin: function (e) { ST.crAdmin = e.value; ST.sel = null; ST.det = null; chargerLeads(); },
    perspective: function (e) { window.LM2_DEMO.perspective(e.value); ST.ann = null; ST.det = null; ST.sel = null; ST.tab = 'leads'; ST.f.assigne = ''; session(); },
    trAgence: function (e) { ST.ia.tr.agence = +e.value; $('trConseillers').innerHTML = conseillers(ST.annT || { interlocuteurs: [] }, ST.ia.tr.sg); },
    trHors: function () {}, mObj: function () { mGenerer(); },
    imF: function (e) { var f = e.files && e.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { $('imT').value = String(r.result || ''); imAppel(true); }; r.readAsText(f, 'utf-8'); }
  };
  function cible(e) { var t = e.target; while (t && t !== document && !(t.getAttribute && t.getAttribute('data-a'))) t = t.parentNode; return t && t !== document ? t : null; }
  document.addEventListener('click', function (e) {
    var b = cible(e); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'envoiSw' || a === 'envoiCr') return;   // traités au changement de la case
    if (b.tagName === 'INPUT' && b.type !== 'button') return;
    if (b.disabled) return;
    if (ACTIONS[a]) { if (a !== 'masque') e.preventDefault && e.preventDefault(); ACTIONS[a](b, e); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var a = t.getAttribute('data-a'); if (a === 'envoiSw' || a === 'envoiCr') return ACTIONS[a](t, e);
    if (t.name === 'trVers') { var h = $('trHorsF'); if (h) h.classList.toggle('hidden', t.value !== 'hors');
      [].forEach.call(document.querySelectorAll('.opt'), function (o) { var i = o.querySelector('input'); o.classList.toggle('on', !!(i && i.checked)); }); }
    var c = t.getAttribute('data-c'); if (c && CHANGES[c]) CHANGES[c](t, e);
  });
  document.addEventListener('input', function (e) { var t = e.target; if (t && t.getAttribute && t.getAttribute('data-c') === 'q') CHANGES.q(t); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('dlgs') && $('dlgs').innerHTML) fermer();
    if (e.key === 'Enter' && e.target && (e.target.id === 'lgMdp' || e.target.id === 'lgId')) connexion();
    if (e.key === 'Enter' && e.target && e.target.id === 'acCode') ACTIONS.accesCode();
  });

  /* accès pour les tests de non-régression */
  window.LM2_CONSOLE = { ST: ST, ACTIONS: ACTIONS, CHANGES: CHANGES, api: api, session: session, ouvrir: ouvrir, fiche: fiche, liste: liste, visibles: visibles, rendre: rendre, onglet: onglet,
    dlgTransfert: dlgTransfert, dlgEmail: dlgEmail, dlgScript: dlgScript, admCharger: admCharger, version: '2.0' };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
