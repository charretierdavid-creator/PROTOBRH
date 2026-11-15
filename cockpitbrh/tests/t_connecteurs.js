/* Module LM 2.0 — 15/11/2026 · tests de non-régression du branchement des sites : lm-hub.js, couche parcours 2.0 sur le socle S (offres consultées, « déjà client ? »), « Mon dossier » · historique : VERSIONS.md
   Usage : node t_connecteurs.js <dossier module> <dossier du socle protobrh>
   1. lm-hub.js : modes relais / navigateur / base, couche parcours chargée une fois, après les scripts de la page ;
   2. couche parcours sur les pages du SOCLE (site S, sans fichier de la version C) : coordonnées reportées, demandes complétées,
      offres consultées et pages vues seulement avec une demande consentie (Q13), « déjà client ? » facultatif (Q16), devis ;
   3. suivi-dossier.html : frise en 5 étapes, jamais le type de lead ; accès Universels par code SMS (RG-43). */
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const { page, scriptPage, verifier, bilan } = require('./lib/dom');
const M = process.argv[2], SOCLE = process.argv[3];
const HUB = 'https://cockpitbrh.monsitedetest.com/';
const HUBJS = path.join(M, 'connecteurs', 'lm-hub.js'), PARC = path.join(M, 'connecteurs', 'lm-parcours.js');
const VER = (fs.readFileSync(HUBJS, 'utf8').match(/var VERSION = '([\d.]+)'/) || [])[1];

/* ---------- 1. lm-hub.js seul ---------- */
function hubSeul(attrs, cfg, etat) {
  const ajoutes = [], appels = [], ev = {};
  const el = () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const ctx = { console: { info() {}, log() {} }, location: { origin: 'https://protobrh.monsitedetest.com' }, Object, String, RegExp,
    document: { readyState: etat || 'complete', addEventListener: (t, f) => { ev[t] = f; }, currentScript: { src: HUB + 'connecteurs/lm-hub.js?v=' + VER, getAttribute: k => (k in attrs ? attrs[k] : null) }, createElement: el, body: { appendChild: s => ajoutes.push(s) } },
    fetch: (u, o) => { appels.push({ u: String(u), o }); return Promise.resolve({}); } };
  ctx.window = ctx; if (cfg) ctx.BRH_LM_HUB_CONFIG = cfg;
  vm.createContext(ctx); const code = fs.readFileSync(HUBJS, 'utf8');
  vm.runInContext(code, ctx); vm.runInContext(code, ctx);
  return { ctx, ajoutes, appels, ev, f: (u, o) => vm.runInContext('fetch', ctx)(u, o || { method: 'POST', body: '{}' }) };
}
verifier('lm-hub : version 2.0', VER === '2.0', VER);
let h = hubSeul({ 'data-mode': 'navigateur', 'data-parcours': 'oui' });
verifier('lm-hub : adresse du module déduite du script', h.ctx.BRH_LM_HUB.url === HUB, h.ctx.BRH_LM_HUB);
verifier('lm-hub : couche parcours 2.0 chargée une seule fois depuis le module', h.ajoutes.length === 1 && h.ajoutes[0].src === HUB + 'connecteurs/lm-parcours.js?v=2.0', h.ajoutes.map(s => s.src));
h.f('lead.php'); h.f('./lead.php'); h.f('ia.php'); h.f('https://protobrh.monsitedetest.com/lead.php'); h.f('https://autre.exemple.fr/lead.php');
verifier('lm-hub navigateur : lead.php → collecte.php du module', h.appels[0].u === HUB + 'collecte.php' && h.appels[1].u === HUB + 'collecte.php' && h.appels[3].u === HUB + 'collecte.php', h.appels.map(a => a.u));
verifier('lm-hub navigateur : autres appels inchangés', h.appels[2].u === 'ia.php' && h.appels[4].u === 'https://autre.exemple.fr/lead.php');
verifier('lm-hub navigateur : sans cookie, corps transmis', h.appels[0].o.credentials === 'omit' && h.appels[0].o.body === '{}');
h = hubSeul({ 'data-mode': 'relais', 'data-parcours': 'non' }); h.f('lead.php');
verifier('lm-hub relais : lead.php du site inchangé, pas de couche parcours', h.appels[0].u === 'lead.php' && h.ajoutes.length === 0);
h = hubSeul({}, { url: 'https://leads2.exemple.fr', mode: 'base', parcours: true }); h.f('lead.php');
verifier('lm-hub : réglage par BRH_LM_HUB_CONFIG (adresse, mode base)', h.ctx.BRH_LM_HUB.url === 'https://leads2.exemple.fr/' && h.appels[0].u === 'lead.php' && h.ajoutes[0].src.indexOf('https://leads2.exemple.fr/connecteurs/') === 0);
h = hubSeul({ 'data-mode': 'relais', 'data-parcours': 'oui' }, null, 'loading');
verifier('lm-hub 2.0 : page en cours de chargement → couche parcours après DOMContentLoaded', h.ajoutes.length === 0 && typeof h.ev.DOMContentLoaded === 'function');
h.ev.DOMContentLoaded(); verifier('lm-hub 2.0 : couche parcours chargée au DOMContentLoaded', h.ajoutes.length === 1);

/* ---------- 2. couche parcours sur le socle (site S) ---------- */
const CT = JSON.stringify({ prenom: 'Claire', nom: 'Lemoine', email: 'c.lemoine@exemple.fr', telephone: '06 12 34 56 78', fonction: 'Dirigeante' });
const PF = JSON.stringify({ departement: '85', entreprise: { nom: 'BRIAND', siret: '89033175400014', cp: '85500', ville: 'Les Herbiers' } });
const REP = { ok: true, id: 7, jeton: 'a'.repeat(32), dossier: 'BRH-26-000007', caisse: 'Crédit Agricole Atlantique Vendée', suivi: HUB + 'suivi-dossier.html?d=BRH-26-000007&j=' + 'b'.repeat(32) };
function ouvrir(html, store, mode, o) {
  o = o || {};
  const p = page({ html: path.join(SOCLE, html), selects: o.selects || [], store, repondre: async (u, b) => {
    if (u.indexOf('lead.php') === 0 || u === HUB + 'collecte.php') return b && b.action ? { ok: true } : REP;
    if (u.indexOf('entreprise.php') === 0) return o.entreprise;
    return undefined; } });
  p.run(path.join(SOCLE, 'variante.js'));
  (o.avant || []).forEach(f => p.run(path.join(SOCLE, f)));
  if (o.page) p.run(html + ' (script)', scriptPage(path.join(SOCLE, html)));
  if (o.code) p.g(o.code);
  p.ctx.BRH_LM_HUB_CONFIG = { url: HUB, mode: mode, parcours: true };
  p.run(HUBJS);
  const s = p.document.body.children.filter(c => c.tagName === 'SCRIPT' && /lm-parcours\.js/.test(c.src || ''));
  verifier(html + ' : lm-hub.js demande la couche parcours au module', s.length === 1 && s[0].src.indexOf(HUB) === 0);
  p.run(PARC); p.run(PARC);
  const styles = [].concat(p.document.head.children, p.document.body.children).filter(c => c.tagName === 'STYLE' && /\.lm-opt/.test(c.textContent || ''));
  verifier(html + ' : couche parcours installée une seule fois (double chargement sans effet)', styles.length === 1, styles.length);
  return p;
}
const envoyer = (p, corps) => p.g('fetch("lead.php",{method:"POST",headers:{"Content-Type":"application/json"},body:' + JSON.stringify(JSON.stringify(corps)) + '})');
/* fonctions du diagnostic du socle : submitLead repris tel quel de diagnostic.html, le reste simulé */
const DIAG = fs.readFileSync(path.join(SOCLE, 'diagnostic.html'), 'utf8');
const SUBMIT = (DIAG.match(/function submitLead\(\)\{[\s\S]*?\n\}/) || [''])[0];
const SOCLE_DIAG = `var state = { effectif:12, priorities:{ protection:4, partageValeur:3, pouvoirAchat:1, retraite:2 }, resultsUnlocked:false, contrats:{} };
function val(id){ return String(document.getElementById(id).value || '').trim(); }
function depValide(){ return '85'; } function track(){} function fmtEur(n){ return n + ' €'; } function showErr(){ window.__err = true; }
function calculateFiscalGain(){ return { total:4800, details:{ partageValeur:3000 } }; }
function unlockResults(){ state.resultsUnlocked = true; }
var SOLUTIONS = [{ id:'partage', title:'Prime de partage de la valeur' }, { id:'proteger', title:'Santé et prévoyance' }];
function openSol(id){ window.__ouvert = id; }
${SUBMIT}`;
(async () => {
  verifier('socle : submitLead de diagnostic.html trouvé', /type:'diagnostic_contact'/.test(SUBMIT));
  let p = ouvrir('label-brh.html', { brhContact: CT, brhProfil: PF }, 'relais');
  verifier('S label : variante du socle (REF), sans fichier de la version C', p.ctx.BRH_VARIANTE === 'REF' && !p.ctx.BRH_C_MODULES);
  verifier('S label : coordonnées préremplies depuis la session', ['gate-prenom', 'gate-nom', 'gate-email'].map(i => p.document.getElementById(i).value).join('|') === 'Claire|Lemoine|c.lemoine@exemple.fr');
  await envoyer(p, { type: 'label_resultats', variante: 'REF', contact: { prenom: 'Claire', nom: 'Lemoine', email: 'c.lemoine@exemple.fr', consentement: true }, entreprise: { secteur: 'BTP', effectif: 23 } });
  let e = p.envois.filter(x => x.body && x.body.type === 'label_resultats');
  verifier('S relais : demande envoyée une seule fois, au lead.php du site', e.length === 1 && e[0].url === 'lead.php', e.map(x => x.url));
  verifier('S relais : demande complétée (département, entreprise), saisie conservée', e[0].body.entreprise.departement === '85' && e[0].body.entreprise.raison_sociale === 'BRIAND' && e[0].body.entreprise.secteur === 'BTP', e[0].body.entreprise);
  verifier('Q13 : pages vues de la session transmises avec la demande consentie', e[0].body.parcours && e[0].body.parcours.pages.indexOf('Label BRH') >= 0 && e[0].body.parcours.offres_consultees.indexOf('Label BRH') >= 0, e[0].body.parcours);
  await envoyer(p, { type: 'label_resultats', contact: { email: 'x@exemple.fr' }, entreprise: {} });
  e = p.envois.filter(x => x.body && x.body.type === 'label_resultats').pop();
  verifier('Q13 : sans consentement, rien n’est ajouté (ni entreprise, ni parcours)', !e.body.entreprise.departement && !e.body.complete_par_session && !e.body.parcours);

  p = ouvrir('label-brh.html', { brhContact: CT, brhProfil: PF }, 'navigateur');
  await envoyer(p, { type: 'label_contact', contact: { name: 'Claire Lemoine', email: 'c.lemoine@exemple.fr', consent: true }, company: {} });
  e = p.envois.filter(x => x.body && x.body.type === 'label_contact');
  verifier('S navigateur : demande envoyée directement à collecte.php du module', e.length === 1 && e[0].url === HUB + 'collecte.php', e.map(x => x.url));
  verifier('S navigateur : demande complétée avant l’envoi', e[0] && e[0].body.company.departement === '85' && e[0].body.company.siret === '89033175400014', e[0] && e[0].body.company);

  /* diagnostic du socle : offres consultées, « déjà client ? » au « Nous contacter » (lead qualifié) */
  p = ouvrir('diagnostic.html', { brhContact: CT, brhProfil: PF }, 'relais', { selects: ['secteur'], code: SOCLE_DIAG });
  verifier('Q16 : « déjà client ? » facultatif ajouté au « Nous contacter » du diagnostic', !!p.els.lmClientD && /facultatif/.test(p.els.lmClientD.innerHTML) && /name="lmClD" value="oui"/.test(p.els.lmClientD.innerHTML));
  p.g("openSol('partage'); openSol('proteger')");
  verifier('Q13 : fiche solution ouverte → offre consultée (fonction de la page conservée)', p.ctx.__ouvert === 'proteger' && JSON.parse(p.store.brhLmParcours).offres_consultees.join('|') === 'Prime de partage de la valeur|Santé et prévoyance', p.store.brhLmParcours);
  p.store.brhLmClient = JSON.stringify('oui');
  ['c-nom', 'c-ent', 'c-email', 'c-tel'].forEach((id, i) => { p.document.getElementById(id).value = ['Claire Lemoine', 'BRIAND', 'c.lemoine@exemple.fr', '0612345678'][i]; });
  p.document.getElementById('c-consent').checked = true;
  p.g('submitLead()'); await p.attendre(40);
  e = p.envois.filter(x => x.body && x.body.type === 'diagnostic_contact');
  verifier('S diagnostic : « Nous contacter » envoyé (lead qualifié, rappel demandé côté module)', e.length === 1 && e[0].url === 'lead.php', e.map(x => x.url));
  verifier('Q16 : déclaratif « déjà client » transmis dans company.client_declare', e[0] && e[0].body.company.client_declare === 'oui', e[0] && e[0].body.company);
  verifier('Q13 : offres consultées et pages vues transmises', e[0] && e[0].body.parcours.offres_consultees.length === 2 && e[0].body.parcours.pages.indexOf('Diagnostic RH') >= 0, e[0] && e[0].body.parcours);
  verifier('S diagnostic : priorités et gain transmis tels quels (socle intact)', e[0] && e[0].body.priorities.protection === 4 && e[0].body.fiscalGain.total === 4800);

  p = ouvrir('newsletter.html', { brhContact: CT, brhProfil: PF }, 'relais');
  verifier('S newsletter : prénom, nom, e-mail, entreprise préremplis', ['nf-prenom', 'nf-nom', 'nf-email', 'nf-entreprise'].map(i => p.document.getElementById(i).value).join('|') === 'Claire|Lemoine|c.lemoine@exemple.fr|BRIAND');

  /* devis du socle : estimation par e-mail (ultra-qualifié) avec « déjà client ? », demande de devis, encart de suivi */
  const BRIAND = { source: 'API Recherche d’entreprises', siren: '890331754', siret: '89033175400014', nom: 'BRIAND', ville: 'Les Herbiers', cp: '85500', naf: '70.22Z', tranche: '20 à 49 salariés', idcc: '2609' };
  p = ouvrir('devis.html', { brhLmParcours: JSON.stringify({ offres_consultees: ['Formule Découverte (épargne salariale)'], pages: ['Accueil'] }) }, 'navigateur', { selects: ['e-ccn', 'e-sec', 'h-sal', 'c-fct', 'h-anc'], avant: ['formules-amundi.js', 'conventions.js', 'prevoyance-ccn.js'], page: true, entreprise: BRIAND });
  p.document.getElementById('dvFound')['__q.dv-grid'] = p.document.getElementById('e-eff').parentNode.parentNode;
  p.g("S.sol=['sante']; S.maxStep=2; S.step=2"); p.document.getElementById('siret').value = '89033175400014';
  await p.g('lookupSiret()'); await p.attendre(60);
  verifier('S devis : bloc « Recevoir mon estimation » après l’estimation', !!p.els.lmEst && p.els.lmEst.parentNode === p.document.getElementById('dvSynth').parentNode);
  verifier('Q16 : « déjà client ? » dans le bloc de l’estimation', !!p.els.lmClientE && p.els.lmClientE.parentNode === p.els.lmEst);
  verifier('S devis : « déjà client ? » après l’e-mail de contact', !!p.els.lmClient && p.els.lmClient.parentNode === p.document.getElementById('c-email').parentNode.parentNode);
  p.store.brhLmClient = JSON.stringify('nsp');
  p.els.lmEm.value = 'dirigeant@exemple.fr'; p.els.lmEmOk.checked = true; p.els.lmEstBtn.emettre('click'); await p.attendre(40);
  const dc = p.envois.filter(x => x.body && x.body.type === 'devis_en_cours')[0];
  verifier('S devis : « Recevoir mon estimation » envoyé au module (ultra-qualifié)', dc && dc.url === HUB + 'collecte.php' && dc.body.envoyer_estimation === true && dc.body.contact.consentement === true, dc && [dc.url, dc.body.etape]);
  verifier('Q16 : déclaratif transmis avec l’estimation', dc && dc.body.entreprise.client_declare === 'nsp', dc && dc.body.entreprise);
  verifier('Q13 : offres consultées avant le devis transmises avec l’estimation', dc && dc.body.parcours && dc.body.parcours.offres_consultees[0] === 'Formule Découverte (épargne salariale)' && dc.body.parcours.pages.indexOf('Devis en ligne') >= 0, dc && dc.body.parcours);
  p.g('S.maxStep=6; go(6)'); await p.attendre(30);
  const et = p.envois.filter(x => x.body && x.body.action === 'etape')[0];
  verifier('S devis : étape suivie, avec l’id et le jeton remis par le module', et && et.url === HUB + 'collecte.php' && et.body.id === 7 && et.body.jeton === 'a'.repeat(32), et && et.body);
  verifier('S devis : l’action « etape » n’emporte pas le parcours', et && !et.body.parcours);
  ['c-prenom', 'c-nom', 'c-email', 'c-tel'].forEach((id, i) => p.document.getElementById(id).value = ['Jean', 'Dupont', 'dirigeant@exemple.fr', '0601020304'][i]);
  ['e-nom', 'e-ville', 'e-cp', 'e-eff'].forEach((id, i) => p.document.getElementById(id).value = ['BRIAND', 'Les Herbiers', '85500', '20'][i]);
  p.document.getElementById('c-consent').checked = true; p.g('S.ent.effectif=20');
  await p.g('submitDevis()'); await p.attendre(80);
  const dv = p.envois.filter(x => x.body && x.body.type === 'devis')[0];
  verifier('S devis : demande de devis envoyée au module', dv && dv.url === HUB + 'collecte.php', dv && dv.url);
  verifier('Sécurité : la demande de devis prouve la demande précédente (suite : id + jeton de l’estimation)', dv && dv.body.suite && dv.body.suite.id === 7 && dv.body.suite.jeton === 'a'.repeat(32), dv && dv.body.suite);
  verifier('S devis : déclaratif repris de la session pour le devis', dv && JSON.stringify(dv.body).indexOf('"client_declare":"nsp"') >= 0);
  verifier('S devis : encart « Suivre mon dossier » avec le lien du module', !!p.els.lmSuiviBox && p.els.lmSuiviBox.innerHTML.indexOf(HUB + 'suivi-dossier.html') >= 0, p.els.lmSuiviBox && p.els.lmSuiviBox.innerHTML.slice(0, 200));
  /* réponse sans lien (dossier existant, suite non prouvée) : le lien part par e-mail */
  p.els.lmSuiviBox.remove(); delete p.els.lmSuiviBox;
  const REP2 = { ok: true, id: 8, jeton: 'c'.repeat(32), dossier: 'BRH-26-000007', suivi_email: true };
  const p2 = ouvrir('devis.html', {}, 'relais', { selects: ['e-ccn', 'e-sec', 'h-sal', 'c-fct', 'h-anc'], avant: ['formules-amundi.js', 'conventions.js', 'prevoyance-ccn.js'], page: true, entreprise: BRIAND });
  p2.ctx.fetch = async (u, o) => ({ ok: true, status: 200, json: async () => REP2, clone() { return { json: async () => REP2 }; } });
  vm.runInContext(fs.readFileSync(PARC, 'utf8').replace("if (window.__BRH_LM_PARCOURS) return;", ''), p2.ctx);
  await p2.g('fetch("lead.php",{method:"POST",body:JSON.stringify({type:"devis",contact:{email:"a@exemple.fr",consentement:true}})})'); await p2.attendre(40);
  verifier('Dossier existant sans preuve : « lien envoyé par e-mail », aucun lien affiché', !p2.els.lmSuiviBox || /envoyé par e-mail/.test(p2.els.lmSuiviBox.innerHTML), p2.els.lmSuiviBox && p2.els.lmSuiviBox.innerHTML);
  verifier('RG-06 : type de lead jamais affiché au dirigeant', !/ultra|qualifi|abandonniste|niveau/i.test((p.els.lmSuiviBox || {}).innerHTML || ''));

  /* ---------- 3. « Mon dossier » ---------- */
  async function suivi(dossier, reponses) {
    const html = fs.readFileSync(path.join(M, 'suivi-dossier.html'), 'utf8');
    const js = [...html.matchAll(/<script>\n?([\s\S]*?)<\/script>/g)].map(x => x[1]).pop();
    const els = {}; const appels = [];
    const mk = id => (els[id] = els[id] || { id, innerHTML: '', textContent: '', value: '', className: '', disabled: false, l: {}, classList: { add() {}, remove() {}, contains() { return false; } }, addEventListener(t, f) { this.l[t] = f; } });
    const app = mk('app'); mk('bandeDemo');
    const document = { getElementById: id => { if (els[id]) return els[id]; if (new RegExp('id="' + id + '"').test(Object.values(els).map(e => e.innerHTML).join(''))) return mk(id); return null; } };
    const ctx = { URLSearchParams, Promise, JSON, String, Date, Object, Math, setInterval: f => { ctx.__tick = f; return 1; }, clearInterval() {}, setTimeout: () => 1, console: { log() {}, error() {} },
      location: { search: '?d=BRH-26-004801&j=' + 'c'.repeat(32), href: '' }, document,
      fetch: async (u, o) => { const b = o && o.body ? JSON.parse(o.body) : null; appels.push({ u: String(u), b }); const r = b && reponses[b.action] ? reponses[b.action](b) : { ok: true, dossier }; return { json: async () => r }; } };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(js, ctx);
    await new Promise(r => setTimeout(r, 20));
    return { els, app, appels, ctx, clic: async id => { els[id] && els[id].l.click && els[id].l.click(); await new Promise(r => setTimeout(r, 20)); } };
  }
  const D = { reference: 'BRH-26-004801', cree_le: '2026-11-14 10:00:00', entreprise: 'BRIAND', prenom: 'Claire', etape: 2, etapes: ['Demande reçue', 'Prise en charge', 'Étude', 'Proposition', 'Finalisé'],
    caisse: 'Crédit Agricole Atlantique Vendée', interlocuteur: { nom: 'Pierre Lambert', role: 'Expert Banque des Ressources Humaines', agence: null }, rdv: null, solutions: ['Épargne salariale'],
    emails: [{ le: '2026-11-14 10:00:00', objet: 'Votre demande BRH-26-004801 est bien reçue', envoye: true }], relances: true, rappel: false, telephone_connu: true, clos: false,
    universels: { propose: true, ouvert: true, mobile: '06 •• •• •• 78', simule: true } };
  let s = await suivi(D, { universels_code: () => ({ ok: true, masque: '06 •• •• •• 78', code_demo: '123456' }), universels_verifier: b => (b.code === '123456' ? { ok: true, url: 'universels-demo.html?d=x' } : { ok: false, error: 'Code incorrect (2 essai(s) restant(s)).' }) });
  let a = s.app.innerHTML;
  verifier('RG-41 : frise en 5 étapes (Demande reçue … Finalisé)', (a.match(/<div class="[^"]*">(Demande reçue|Prise en charge|Étude|Proposition|Finalisé)<\/div>/g) || []).length === 5);
  verifier('RG-41 : interlocuteur, Caisse régionale, e-mails reçus', a.includes('Pierre Lambert') && a.includes('Crédit Agricole Atlantique Vendée') && a.includes('est bien reçue'));
  verifier('RG-41 : « Demander à être rappelé » et « Ne plus recevoir les relances »', a.includes('Demander à être rappelé') && a.includes('Ne plus recevoir les relances'));
  verifier('RG-42 : jamais le type de lead, le délai ni le statut client', !/qualifi|ultra|délai interne|client déclaré|vérifié|segment/i.test(a));
  verifier('RG-44 : le téléphone ne se modifie pas depuis la page', a.includes('il ne se modifie pas depuis cette page') && !/id="(tel|telephone)"/.test(a));
  verifier('RG-43 : bouton « Accéder à mon espace Universels » (épargne salariale)', a.includes('Accéder à mon espace Universels'));
  await s.clic('uniBtn');
  verifier('RG-43 : code à 6 chiffres envoyé au mobile du dossier, renvoi après 30 s', /Code envoyé par SMS au 06 •• •• •• 78/.test(s.els.uniZone.innerHTML) && /Renvoyer le code \(30 s\)/.test(s.els.uniZone.innerHTML) && /maxlength="6"/.test(s.els.uniZone.innerHTML));
  verifier('RG-43 : prototype, SMS simulé (code affiché)', /SMS simulé/.test(s.els.uniZone.innerHTML));
  s.ctx.__tick && s.ctx.__tick();
  verifier('RG-43 : compte à rebours de 30 s avant un nouveau code', (s.els.uniRenvoi || {}).textContent === 'Renvoyer le code (29 s)', (s.els.uniRenvoi || {}).textContent);
  s.els.uniCode = s.els.uniCode || { value: '' }; s.ctx.document.getElementById('uniCode').value = '000000'; await s.clic('uniOk');
  verifier('RG-43 : code incorrect refusé, essais restants', /Code incorrect/.test((s.els.uniErr || {}).textContent || ''));
  s.ctx.document.getElementById('uniCode').value = '123456'; await s.clic('uniOk');
  verifier('RG-43 : code validé → espace Universels', /universels-demo\.html/.test(s.ctx.location.href), s.ctx.location.href);
  s = await suivi(Object.assign({}, D, { etape: 1, interlocuteur: null, universels: { propose: true, ouvert: false } }), {});
  verifier('Q10 : Universels ouvert seulement après la prise en charge', /s’ouvre dès que votre expert a pris en charge/.test(s.app.innerHTML) && !s.app.innerHTML.includes('id="uniBtn"'));
  verifier('RG-41 : sans interlocuteur, message d’attente', /Son nom apparaîtra ici/.test(s.app.innerHTML));

  process.exit(bilan('Branchement des sites (lm-hub 2.0, couche parcours sur le socle S, « Mon dossier »)') ? 1 : 0);
})().catch(e => { console.log('✗ Connecteurs : erreur ' + (e && e.stack || e)); process.exit(1); });
