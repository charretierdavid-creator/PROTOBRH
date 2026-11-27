/* ==============================================================
   DÉMO HORS LIGNE (sites A et B) — « Mon dossier BRH » (demande de David du 24/11/2026)
   Couche ajoutée par le shell dans chaque page, sans modifier les pages ni les modules de la version C.
   1. CAPTURE (toutes les pages) : chaque demande envoyée à lead.php qui contient une adresse e-mail
      (diagnostic, Label RH, estimation, devis, rappel, sauvegarde du dossier) crée ou met à jour le dossier
      (sessionStorage « brhDossier ») et prévient le shell, qui affiche l'e-mail reçu avec son lien.
      La newsletter seule ne crée pas de dossier.
   2. PAGE « Mon dossier BRH » (mon-dossier.html) : ce que le dirigeant a fait (diagnostic 4 besoins ou
      Label RH, estimation), offres recommandées et offres de son devis, chacune avec un « i » qui
      l'explique, ses demandes, et un bouton pour reprendre le parcours au point le plus avancé :
        devis commencé      → reprise du devis à l'étape atteinte (réponses gardées par le devis)
        devis non commencé  → devis prérempli avec les offres recommandées, l'effectif et le secteur
        devis envoyé        → échange avec l'expert, ou nouveau devis
        rien de fait        → diagnostic (site A) ou Label RH (site B)
   En production : jeton personnel dans le lien de l'e-mail, dossier lu côté serveur (lead.php / module LM),
   type « dossier_sauvegarde » à ajouter à BRH_LEAD_TYPES, durée de conservation à valider (conformité).
   ============================================================== */
(function () {
  'use strict';
  var D = document, W = window;
  var PAGE = String(W.__REAL_PAGE || W.__PAGE || ''), SITE = W.__SITE || null;
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function eur(n) { return Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, '\u00a0') + '\u00a0€'; }
  function dateFr(iso) { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }

  /* ---------- offres : textes courts du « i » (modifiables ici) ---------- */
  var OFFRES = {
    epargne: { titre: 'Épargne salariale', partenaires: 'Amundi / CA Titres', besoin: 'partageValeur', detail: 'partage', statut: 'Devis en ligne',
      quoi: 'Intéressement, participation et plan d’épargne salariale, avec un abondement de l’entreprise.',
      apport: 'Vos salariés sont associés aux résultats, dans un cadre social et fiscal avantageux, dans la limite des plafonds légaux.' },
    sante: { titre: 'Santé & prévoyance', partenaires: 'Crédit Agricole Assurances', besoin: 'protection', detail: 'proteger', statut: 'Devis à confirmer avec un expert',
      quoi: 'Complémentaire santé collective (obligatoire dans le privé, financée au moins à 50 % par l’employeur) et prévoyance : arrêt de travail, invalidité, décès.',
      apport: 'Vos salariés et leurs proches sont protégés ; votre convention collective peut imposer certaines garanties, que l’expert vérifie avec vous.' },
    retraite: { titre: 'Retraite collective', partenaires: 'Crédit Agricole Assurances · Amundi', besoin: 'retraite', detail: 'retraite', statut: 'Simulation',
      quoi: 'Plan d’épargne retraite d’entreprise : vos salariés se constituent un complément de retraite, alimenté par leurs versements et par l’entreprise.',
      apport: 'Un levier de fidélisation durable, dans un cadre social et fiscal avantageux.' },
    avantages: { titre: 'Avantages salariés', partenaires: 'Worklife', besoin: 'pouvoirAchat', detail: 'pouvoir', statut: 'Devis en ligne',
      quoi: 'Titres-restaurant, forfait mobilités durables, cartes cadeaux : des avantages du quotidien.',
      apport: 'Du pouvoir d’achat pour vos salariés, exonéré de charges dans la limite des plafonds ; gestion en ligne (console pour vous, application pour vos salariés).' }
  };
  var ORDRE = ['epargne', 'sante', 'retraite', 'avantages'];
  var BESOINS = { protection: 'Protéger mes salariés', partageValeur: 'Partager la valeur', pouvoirAchat: 'Pouvoir d’achat et bien-être', retraite: 'Préparer la retraite' };
  var MAP = { partageValeur: 'epargne', protection: 'sante', retraite: 'retraite', pouvoirAchat: 'avantages' };
  var ETAPES_DEVIS = ['Vos besoins', 'Votre entreprise', 'Vos salariés', 'Configuration', 'Estimation', 'Proposition', 'Votre devis'];
  var DEMANDES = { diagnostic_contact: 'Demande de rappel par un expert (diagnostic)', diagnostic_estimation: 'Résultat du diagnostic envoyé par e-mail',
    label_resultats: 'Résultats du Label RH', label_contact: 'Demande de rappel par un expert (Label RH)', devis_en_cours: 'Estimation envoyée par e-mail',
    devis: 'Devis envoyé', rappel_expert: 'Demande de rappel par un expert', dossier_sauvegarde: 'Dossier sauvegardé', audit_mutuelle: 'Audit mutuelle' };
  var RAPPEL = /contact|rappel/;
  function niveau(s) { return s >= 80 ? 'Exemplaire' : s >= 60 ? 'Confirmé' : s >= 40 ? 'Engagé' : 'À engager'; }

  /* ---------- 1. capture des demandes envoyées avec une adresse e-mail ---------- */
  function trouver(o, cle, prof) {
    if (!o || typeof o !== 'object' || (prof || 0) > 4) return '';
    if (typeof o[cle] === 'string' && o[cle].trim()) return o[cle].trim();
    for (var k in o) if (o[k] && typeof o[k] === 'object') { var r = trouver(o[k], cle, (prof || 0) + 1); if (r) return r; }
    return '';
  }
  function capter(b) {
    var type = String(b.type || b.action || '');
    if (!type || type === 'newsletter' || type === 'etape') return;
    var dos = ss('brhDossier'), ct = ss('brhContact') || {};
    var email = trouver(b, 'email') || (dos && dos.email) || ct.email || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    var nouveau = !dos, maint = new Date().toISOString();
    dos = dos || { ref: 'BRH-' + maint.slice(2, 4) + maint.slice(5, 7) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(), cree: maint, demandes: [] };
    dos.email = email; dos.maj = maint; dos.site = (SITE && SITE.id) || dos.site || 'A';
    var pr = trouver(b, 'prenom') || String(trouver(b, 'name') || trouver(b, 'nom') || '').split(' ')[0];
    if (pr && !dos.prenom) dos.prenom = pr;
    if (!dos.demandes.some(function (d) { return d.type === type; })) dos.demandes.push({ type: type, date: maint });
    if (type === 'devis') dos.devis = { reference: b.reference || '', panier: (b.panier || []).map(function (x) { return x.solution; }), total: b.estimation_totale || null,
      rappel: !!(b.contact && b.contact.rappel_expert), date: maint };
    ss('brhDossier', dos);
    /* un e-mail à la création du dossier, puis à l'envoi du devis */
    if (nouveau || type === 'devis') try { parent.postMessage({ brhMail: { genre: nouveau ? 'creation' : 'devis', resume: resume() } }, '*'); } catch (e) {}
    if (PAGE === 'mon-dossier.html') rendre();
  }
  var natif = W.fetch;
  W.fetch = function (u, o) {
    try { var url = String(u && u.url || u || ''); if (/(^|\/)lead\.php/.test(url) && o && o.body) { var b = JSON.parse(o.body); setTimeout(function () { capter(b); }, 400); } } catch (e) {}
    return natif.apply(this, arguments);
  };

  /* ---------- état du dossier, lu dans la session du navigateur ---------- */
  function etat() {
    var p = ss('brhProfil') || {}, dv = ss('brhDevis'), dos = ss('brhDossier'), ct = ss('brhContact') || {};
    var pr = p.priorites || null, src = p.source === 'label' ? 'label' : (p.source === 'diagnostic' ? 'diagnostic' : (pr ? 'diagnostic' : ''));
    var recos = [];
    if (pr) {
      var cles = Object.keys(MAP).filter(function (k) { return (pr[k] || 0) >= 3; });
      var expl = false;
      if (!cles.length) { cles = Object.keys(MAP).filter(function (k) { return (pr[k] || 0) >= 2; }); expl = true; }
      cles.sort(function (a, b) { return (pr[b] || 0) - (pr[a] || 0); });
      recos = cles.map(function (k) { return { cle: MAP[k], prio: pr[k] || 0, explorer: expl }; });
    }
    var devis = { etat: 'aucun', sol: [], etape: 0 };
    if (dos && dos.devis) devis = { etat: 'envoye', sol: dos.devis.panier || [], ref: dos.devis.reference, total: dos.devis.total, rappel: dos.devis.rappel, etape: 7 };
    else if (dv && dv.S && (dv.S.sol || []).length) devis = { etat: 'en_cours', sol: dv.S.sol.slice(), etape: Math.max(1, Math.min(dv.S.step || 1, dv.S.maxStep || 1)) };
    var eff = p.effectif || (dv && dv.S && dv.S.ent && dv.S.ent.effectif) || null;
    return { p: p, src: src, pr: pr, recos: recos, devis: devis, dos: dos, email: (dos && dos.email) || ct.email || '', eff: eff,
      secteur: p.secteur || (dv && dv.S && dv.S.ent && dv.S.ent.secteur) || '', dep: p.departement || '',
      score: p.labelBrh && p.labelBrh.score != null ? p.labelBrh.score : null, gains: p.gains || null,
      demandes: (dos && dos.demandes) || [] };
  }
  function resume() {
    var e = etat();
    return { email: e.email, prenom: e.dos && e.dos.prenom || '', ref: e.dos && e.dos.ref || '', src: e.src, score: e.score, niveau: e.score != null ? niveau(e.score) : '',
      gain: e.gains && e.gains.fiscalAnnuel || null, priorites: e.recos.map(function (r) { return OFFRES[r.cle].titre; }),
      devis: e.devis.etat, devisRef: e.devis.ref || '', site: (SITE && SITE.id) || 'A' };
  }
  /* point de reprise : le plus avancé, toujours « engageant » */
  function reprise(e) {
    var expert = (SITE && SITE.expert) || 'diagnostic.html#contact';
    if (e.devis.etat === 'envoye') return { titre: 'Votre devis est envoyé' + (e.devis.ref ? ' (référence ' + e.devis.ref + ')' : ''),
      texte: e.devis.rappel ? 'Un expert de votre Caisse régionale vous contacte pour le finaliser avec vous.' : 'Un expert de votre Caisse régionale peut le finaliser avec vous : demandez-lui de vous rappeler.',
      cta: [['Être rappelé par un expert', expert, 1], ['Faire un nouveau devis', lienDevis(e, e.devis.sol), 0]] };
    if (e.devis.etat === 'en_cours') return { titre: 'Vous en étiez à votre devis : étape ' + e.devis.etape + ' sur 7, « ' + ETAPES_DEVIS[e.devis.etape - 1] + ' »',
      texte: 'Vos réponses sont gardées : reprenez exactement là où vous vous êtes arrêté.',
      cta: [['Reprendre mon devis', 'devis.html', 1], ['Être rappelé par un expert', expert, 0]] };
    if (e.pr) return { titre: 'Prochaine étape : votre devis en ligne',
      texte: 'Votre devis démarre avec ' + (e.recos.length ? 'les offres recommandées déjà cochées' : 'vos priorités') + (e.eff ? ', vos ' + e.eff + ' salariés' : '') + (e.secteur ? ' et votre secteur' : '') + ' : il reste à vérifier et à compléter.',
      cta: [['Construire mon devis', lienDevis(e, e.recos.map(function (r) { return r.cle; })), 1], ['Être rappelé par un expert', expert, 0]] };
    var B = SITE && SITE.id === 'B';
    return { titre: 'Votre dossier est vide pour l’instant',
      texte: (B ? 'Passez le Label RH' : 'Faites le diagnostic de vos 4 besoins') + ', puis laissez votre e-mail : vous recevrez le lien de votre dossier pour reprendre à tout moment.',
      cta: [[B ? 'Passer le Label RH' : 'Faire mon diagnostic', B ? 'label-brh.html' : 'diagnostic.html', 1]] };
  }
  function lienDevis(e, sol) {
    var q = [];
    if (sol && sol.length) q.push('sol=' + sol.join(','));
    if (e.eff) q.push('eff=' + encodeURIComponent(e.eff));
    if (e.secteur) q.push('secteur=' + encodeURIComponent(e.secteur));
    return 'devis.html' + (q.length ? '?' + q.join('&') : '');
  }

  /* ---------- 2. page « Mon dossier BRH » ---------- */
  var CSS = ''
    + '#page-dossier .dos-sec{padding:36px 0 56px;background:var(--gray-bg,#f6f8f7)}'
    + '.dos-h1{font-family:var(--fh,inherit);color:var(--green,#065145);font-size:clamp(1.7rem,3.4vw,2.4rem);font-weight:700;margin:0;line-height:1.15}'
    + '.dos-sub{color:var(--slate,#5c6b64);margin:.6rem 0 0;max-width:62ch;font-size:1rem}'
    + '#dossier{display:grid;gap:18px;margin-top:20px}'
    + '.dos-card{background:#fff;border:1px solid var(--line,#e7ece9);border-radius:16px;padding:20px 22px}'
    + '.dos-card h2{font-family:var(--fh,inherit);font-size:1.06rem;font-weight:600;color:var(--green,#065145);margin:0 0 12px}'
    + '.dos-card h3{font-family:var(--fh,inherit);font-size:.86rem;font-weight:600;color:var(--slate,#5c6b64);margin:14px 0 4px;text-transform:uppercase;letter-spacing:.04em}'
    + '.dos-id{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;font-size:.86rem;color:var(--slate,#5c6b64)}.dos-id b{color:var(--ink,#233029);font-weight:600}'
    + '.dos-b{display:inline-block;font-size:.72rem;font-weight:600;line-height:1.5;border:1px solid var(--line-2,#dfe6e2);border-radius:999px;padding:0 .6rem;color:var(--green,#065145);background:#fff;white-space:nowrap}'
    + '.dos-b.ok{border-color:#cfe3da;background:var(--mint-2,#eef4ef)}.dos-b.vif{border-color:var(--lime,#8fb822)}'
    + '.dos-rep{border-left:4px solid var(--lime,#8fb822)}.dos-rep p{margin:.2rem 0 14px;color:var(--slate,#5c6b64);max-width:70ch}'
    + '.dos-rep .dos-rt{font-family:var(--fh,inherit);font-weight:600;color:var(--ink,#233029);font-size:1.02rem}'
    + '.dos-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:4px 0 16px;padding:0;list-style:none;counter-reset:e}'
    + '.dos-steps li{counter-increment:e;font-size:.78rem;line-height:1.3;color:var(--slate,#5c6b64);border-top:3px solid var(--line,#e7ece9);padding-top:7px}'
    + '.dos-steps li::before{content:counter(e) ". "}.dos-steps li.ok{border-color:var(--green,#065145);color:var(--green,#065145)}.dos-steps li.ok::before{content:"✓ "}'
    + '.dos-steps li.cur{border-color:var(--lime,#8fb822);color:var(--ink,#233029);font-weight:600}'
    + '.dos-cta{display:flex;flex-wrap:wrap;gap:10px}'
    + '.dos-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}'
    + '.dos-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0;font-size:.9rem}.dos-kv dt{color:var(--slate,#5c6b64)}.dos-kv dd{margin:0;font-weight:600;color:var(--ink,#233029)}'
    + '.dos-bars{display:grid;grid-template-columns:auto 1fr auto;gap:7px 10px;align-items:center;font-size:.84rem}'
    + '.dos-bar{height:8px;border-radius:6px;background:var(--line,#e7ece9);position:relative;overflow:hidden}.dos-bar i{position:absolute;inset:0 auto 0 0;background:var(--lime,#8fb822);border-radius:6px}'
    + '.dos-big{font-family:var(--fh,inherit);font-size:1.6rem;font-weight:700;color:var(--green,#065145);line-height:1.1}.dos-big small{font-size:.85rem;font-weight:500;color:var(--slate,#5c6b64)}'
    + '.dos-n{font-size:.76rem;color:var(--slate,#5c6b64);margin:10px 0 0}'
    + '.dos-off{padding:12px 0;border-top:1px solid var(--line,#e7ece9)}.dos-off:first-of-type{border-top:0}'
    + '.dos-ol{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.dos-ol b{font-family:var(--fh,inherit);font-weight:600;color:var(--ink,#233029)}.dos-ol .dos-pa{font-size:.8rem;color:var(--slate,#5c6b64)}'
    + '.dos-i{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--green,#065145);background:#fff;color:var(--green,#065145);font:italic 700 .8rem/1 Georgia,serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}'
    + '.dos-i[aria-expanded="true"]{background:var(--green,#065145);color:#fff}.dos-i:focus-visible{outline:2px solid var(--lime,#8fb822);outline-offset:2px}'
    + '.dos-info{margin:8px 0 0 32px;background:var(--mint-2,#eef4ef);border-radius:10px;padding:10px 14px;font-size:.86rem;line-height:1.5;max-width:72ch}'
    + '.dos-info p{margin:0 0 6px}.dos-info a{font-weight:600;color:var(--green,#065145);margin-right:14px;cursor:pointer}'
    + '.dos-vide{color:var(--slate,#5c6b64);font-size:.9rem;margin:4px 0}'
    + '.dos-dem{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:.88rem}.dos-dem li{display:flex;gap:10px;justify-content:space-between;border-bottom:1px dashed var(--line,#e7ece9);padding-bottom:6px}.dos-dem span{color:var(--slate,#5c6b64);white-space:nowrap}'
    + '.dos-sv{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-top:6px}.dos-sv input[type=email]{flex:1 1 260px;font:inherit;font-size:16px;border:1px solid var(--line-2,#dfe6e2);border-radius:10px;padding:.65rem .8rem}'
    + '.dos-sv label.c{flex:1 1 100%;font-size:.8rem;color:var(--slate,#5c6b64);display:flex;gap:8px;align-items:flex-start}.dos-err{color:#b00020;font-size:.82rem;flex:1 1 100%}'
    + '.dos-pied{font-size:.78rem;color:var(--slate,#5c6b64)}.dos-pied a{color:var(--green,#065145);cursor:pointer;text-decoration:underline}'
    + '@media(max-width:820px){.dos-2{grid-template-columns:1fr}.dos-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.dos-info{margin-left:0}}';

  function offre(k, badges, pourquoi) {
    var o = OFFRES[k]; if (!o) return '';
    return '<div class="dos-off" data-k="' + k + '"><div class="dos-ol"><button type="button" class="dos-i" aria-expanded="false" aria-label="Qu’est-ce que « ' + esc(o.titre) + ' » ?" data-i="' + k + '">i</button>'
      + '<b>' + esc(o.titre) + '</b><span class="dos-pa">' + esc(o.partenaires) + '</span>' + badges.join('') + '</div>'
      + '<div class="dos-info" hidden><p><b>Ce que c’est :</b> ' + esc(o.quoi) + '</p><p><b>Ce que ça vous apporte :</b> ' + esc(o.apport) + '</p>'
      + (pourquoi ? '<p><b>Pourquoi pour vous :</b> ' + esc(pourquoi) + '</p>' : '')
      + '<p><a data-plus="' + o.detail + '">En savoir plus</a><a href="devis.html?sol=' + k + '">Chiffrer cette offre</a></p></div></div>';
  }
  function rendre() {
    var box = D.getElementById('dossier'); if (!box) return;
    var e = etat(), r = reprise(e), dejaOuvert = {};
    Array.prototype.forEach.call(box.querySelectorAll('.dos-i[aria-expanded="true"]'), function (b) { dejaOuvert[b.getAttribute('data-i') + b.closest('[data-l]').getAttribute('data-l')] = 1; });
    var srcLib = e.src === 'label' ? 'Label RH' : (e.src === 'diagnostic' ? 'Diagnostic 4 besoins' : '');
    var h = [];
    /* identité du dossier, ou sauvegarde par e-mail */
    if (e.dos) h.push('<div class="dos-card"><div class="dos-id"><span>Dossier <b>' + esc(e.dos.ref) + '</b></span><span>Créé le <b>' + dateFr(e.dos.cree) + '</b></span><span>Lien envoyé à <b>' + esc(e.dos.email) + '</b></span>'
      + (srcLib ? '<span class="dos-b">' + srcLib + '</span>' : '') + '</div></div>');
    else if (e.pr) h.push('<div class="dos-card"><h2>Sauvegardez votre dossier</h2><p class="dos-vide">Laissez votre e-mail : vous recevrez un lien pour retrouver vos réponses et reprendre votre parcours plus tard, sur cet appareil ou un autre.</p>'
      + '<form class="dos-sv" id="dosSv" novalidate><input type="email" id="dosEm" placeholder="votre.email@entreprise.fr" autocomplete="email" aria-label="Votre adresse e-mail" value="' + esc(e.email) + '">'
      + '<button class="btn btn-primary" type="submit">Recevoir mon lien</button>'
      + '<label class="c"><input type="checkbox" id="dosOk"> J’accepte que la Banque des RH du Crédit Agricole conserve mes réponses dans mon dossier et m’envoie ce lien par e-mail.</label><span class="dos-err" id="dosErr"></span></form></div>');
    /* reprise */
    var st = [
      [srcLib || 'Diagnostic ou Label RH', e.pr ? 'ok' : 'cur'],
      [e.src === 'label' ? 'Mon score' : 'Mes gains estimés', (e.gains || e.score != null) ? 'ok' : (e.pr ? 'cur' : '')],
      ['Mes offres', (e.devis.sol.length || e.recos.length) ? 'ok' : ''],
      ['Mon devis' + (e.devis.etat === 'en_cours' ? ' (' + e.devis.etape + '/7)' : ''), e.devis.etat === 'envoye' ? 'ok' : (e.pr ? 'cur' : '')],
      ['Mon expert', e.demandes.some(function (d) { return RAPPEL.test(d.type); }) || (e.devis.etat === 'envoye' && e.devis.rappel) ? 'ok' : (e.devis.etat === 'envoye' ? 'cur' : '')]
    ];
    var cur = false; st.forEach(function (s) { if (s[1] === 'cur') { if (cur) s[1] = ''; cur = true; } });
    h.push('<div class="dos-card dos-rep"><h2>Reprendre mon parcours</h2><ol class="dos-steps">' + st.map(function (s) { return '<li class="' + s[1] + '">' + esc(s[0]) + '</li>'; }).join('') + '</ol>'
      + '<div class="dos-rt">' + esc(r.titre) + '</div><p>' + esc(r.texte) + '</p><div class="dos-cta">'
      + r.cta.map(function (c) { return '<a class="btn ' + (c[2] ? 'btn-primary' : 'btn-outline') + '" href="' + esc(c[1]) + '" data-reprise="' + (c[2] ? 1 : 0) + '">' + esc(c[0]) + '</a>'; }).join('') + '</div></div>');
    if (e.pr) {
      /* ce que vous nous avez dit / votre résultat */
      var kv = [['Parcours', srcLib], ['Salariés', e.eff ? String(e.eff) : 'non renseigné'], ['Secteur', e.secteur || 'non renseigné']];
      if (e.dep) kv.push(['Département', e.dep]);
      if (e.p.entreprise && e.p.entreprise.nom) kv.unshift(['Entreprise', e.p.entreprise.nom]);
      if (e.p.maj) kv.push(['Mis à jour le', dateFr(e.p.maj)]);
      var res = '';
      if (e.src === 'label' && e.score != null) res = '<div class="dos-big">' + e.score + '<small> / 100</small></div><p class="dos-n" style="margin-top:4px">Niveau <b>' + niveau(e.score) + '</b> · comparé aux entreprises qui ont passé le Label RH.</p>';
      else if (e.gains && e.gains.fiscalAnnuel) res = '<div class="dos-big">' + eur(e.gains.fiscalAnnuel) + '<small> par an</small></div><p class="dos-n" style="margin-top:4px">Gain fiscal et social estimé' + (e.gains.parSalarie ? ', soit ' + eur(e.gains.parSalarie) + ' de pouvoir d’achat par salarié et par an' : '') + '. Estimation indicative et non contractuelle.</p>';
      var bars = Object.keys(BESOINS).map(function (k) { var v = e.pr[k] || 0; return '<span>' + BESOINS[k] + '</span><span class="dos-bar"><i style="width:' + (v / 4 * 100) + '%"></i></span><b>' + v + '/4</b>'; }).join('');
      h.push('<div class="dos-2"><div class="dos-card"><h2>Ce que vous nous avez dit</h2><dl class="dos-kv">' + kv.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl></div>'
        + '<div class="dos-card"><h2>' + (e.src === 'label' ? 'Votre score Label RH' : 'Votre résultat') + '</h2>' + res
        + '<h3>' + (e.src === 'label' ? 'Vos besoins, déduits de vos réponses' : 'Vos 4 priorités') + '</h3><div class="dos-bars">' + bars + '</div></div></div>');
      /* offres */
      var reco = e.recos.map(function (x) {
        var b = ['<span class="dos-b' + (x.explorer ? '' : ' vif') + '">' + (x.explorer ? 'À explorer' : 'Priorité ' + (x.prio >= 4 ? 'forte' : 'importante')) + '</span>'];
        if (e.devis.sol.indexOf(x.cle) >= 0) b.push('<span class="dos-b ok">Dans votre devis</span>');
        return offre(x.cle, b, 'vous avez indiqué « ' + BESOINS[OFFRES[x.cle].besoin] + ' » comme ' + (x.prio >= 4 ? 'priorité forte' : 'priorité') + ' (' + x.prio + '/4).');
      }).join('');
      var dv = e.devis.sol.filter(function (k) { return OFFRES[k]; }).sort(function (a, b) { return ORDRE.indexOf(a) - ORDRE.indexOf(b); }).map(function (k) {
        return offre(k, ['<span class="dos-b">' + esc(OFFRES[k].statut) + '</span>'], '');
      }).join('');
      h.push('<div class="dos-card"><h2>Les offres pour vous</h2><p class="dos-vide" style="margin-top:-6px">Cliquez sur <b>i</b> pour comprendre chaque offre en quelques lignes.</p>'
        + '<h3>Recommandées pour vous</h3><div data-l="r">' + (reco || '<p class="dos-vide">Aucune priorité forte : un expert peut vous aider à choisir.</p>') + '</div>'
        + '<h3>Sélectionnées dans votre devis</h3><div data-l="d">' + (dv || '<p class="dos-vide">Pas encore de devis : « Construire mon devis » reprend les offres recommandées.</p>') + '</div></div>');
    }
    /* demandes */
    if (e.demandes.length) h.push('<div class="dos-card"><h2>Vos demandes</h2><ul class="dos-dem">' + e.demandes.slice().reverse().map(function (d) {
      return '<li>' + esc(DEMANDES[d.type] || d.type) + '<span>' + dateFr(d.date) + '</span></li>'; }).join('') + '</ul>'
      + (e.demandes.some(function (d) { return RAPPEL.test(d.type); }) || (e.devis.etat === 'envoye' && e.devis.rappel) ? '<p class="dos-n">Un expert Banque des RH de votre Caisse régionale vous rappelle.</p>' : '') + '</div>');
    h.push('<p class="dos-pied">Vos réponses restent dans votre dossier pour vous permettre de reprendre votre parcours ; elles ne sont transmises à un expert que si vous le demandez. '
      + (e.dos || e.pr ? '<a id="dosEff">Effacer mon dossier</a>' : '') + '<br><i>Démonstration : aucune donnée ne quitte ce navigateur, aucun e-mail n’est envoyé.</i></p>');
    box.innerHTML = h.join('');
    Array.prototype.forEach.call(box.querySelectorAll('.dos-i'), function (b) { if (dejaOuvert[b.getAttribute('data-i') + b.closest('[data-l]').getAttribute('data-l')]) basculer(b, true); });
  }
  function basculer(b, ouvrir) {
    var inf = b.closest('.dos-off').querySelector('.dos-info'), o = ouvrir != null ? ouvrir : b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', o ? 'true' : 'false'); inf.hidden = !o;
  }
  function brancherPage() {
    var st = D.createElement('style'); st.textContent = CSS; D.head.appendChild(st);
    rendre();
    /* Julia (ajoutée sous le titre par ia-julia.js) passe sous le dossier : le dossier d'abord, l'aide ensuite */
    var n = 0; (function caler() { var j = D.getElementById('julia'), d = D.getElementById('dossier');
      if (j && d && d.parentNode) { j.style.marginTop = '22px'; d.parentNode.appendChild(j); } else if (n++ < 30) setTimeout(caler, 100); })();
    var box = D.getElementById('dossier');
    box.addEventListener('click', function (ev) {
      var t = ev.target;
      var i = t.closest && t.closest('.dos-i'); if (i) { basculer(i); return; }
      var plus = t.closest && t.closest('[data-plus]'); if (plus) { ev.preventDefault(); if (typeof W.openSol === 'function') W.openSol(plus.getAttribute('data-plus')); return; }
      if (t.id === 'dosEff') { ev.preventDefault(); if (!W.confirm('Effacer votre dossier ? Vos réponses, votre estimation et votre devis en cours seront supprimés de ce navigateur.')) return;
        ['brhDossier', 'brhProfil', 'brhDevis', 'brhContact', 'brhLmSuivi', 'brhAudit', 'brhProfilChat'].forEach(function (k) { ss(k, null); });
        try { parent.postMessage({ brhMailEffacer: 1 }, '*'); } catch (e) {} rendre(); }
    });
    box.addEventListener('submit', function (ev) {
      if (!ev.target || ev.target.id !== 'dosSv') return; ev.preventDefault();
      var em = D.getElementById('dosEm').value.trim(), ok = D.getElementById('dosOk').checked, er = D.getElementById('dosErr');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { er.textContent = 'L’adresse e-mail ne semble pas valide.'; return; }
      if (!ok) { er.textContent = 'Votre accord est nécessaire pour conserver votre dossier et vous envoyer le lien.'; return; }
      var p = ss('brhProfil') || {};
      fetch('lead.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'dossier_sauvegarde', variante: W.BRH_VARIANTE || '',
        contact: { email: em, consentement: true, consentement_date: new Date().toISOString() }, profil: { source: p.source || '', effectif: p.effectif || null, secteur: p.secteur || '', priorites: p.priorites || null } }) }).catch(function () {});
      er.textContent = '';
    });
  }
  if (PAGE === 'mon-dossier.html') { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', brancherPage); else brancherPage(); }
  W.BRH_DOSSIER = { etat: etat, resume: resume, rendre: rendre, version: '1.0' };
})();
