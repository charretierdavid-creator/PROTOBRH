/* Module LM 2.0 — 15/11/2026 · tests des règles de gestion partagées (lm2-regles.js) et de leur concordance avec lm2-base.php et la démonstration · historique : VERSIONS.md
   Usage : node t_regles.js <dossier module> */
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const { verifier, bilan } = require('./lib/dom2');
const M = process.argv[2];
const ctx = { console, Date, Math, JSON, Promise }; ctx.window = ctx; vm.createContext(ctx);
['lm2-referentiel.js', 'lm2-regles.js', 'console-demo.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(M, f), 'utf8'), ctx, { filename: f }));
const L = ctx.LM2, REF = ctx.LM2_REFERENTIEL;
const PHP = fs.readFileSync(path.join(M, 'lm2-base.php'), 'utf8'), REFPHP = fs.readFileSync(path.join(M, 'lm2-referentiel.php'), 'utf8');
const ymd = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);

/* ---------- RG-05 : jours ouvrés, fériés exclus ---------- */
verifier('RG-05 : vendredi + 1 jour ouvré = lundi', ymd(L.plusOuvres('2026-11-13 10:00:00', 1)) === '2026-11-16 10:00');
verifier('RG-05 : 11 novembre exclu (mardi + 1 = jeudi)', ymd(L.plusOuvres('2026-11-10 10:00:00', 1)) === '2026-11-12 10:00');
verifier('RG-05 : demande du samedi → lundi 9 h + délai', ymd(L.plusOuvres('2026-11-14 15:00:00', 1)) === '2026-11-17 09:00');
verifier('RG-05 : lundi de Pâques 2027 exclu', ymd(L.plusOuvres('2027-03-26 10:00:00', 1)) === '2027-03-30 10:00');
verifier('RG-05 : Ascension 2027 exclue', ymd(L.plusOuvres('2027-05-05 10:00:00', 1)) === '2027-05-07 10:00');
verifier('RG-05 : lundi de Pentecôte 2027 exclu', ymd(L.plusOuvres('2027-05-14 10:00:00', 1)) === '2027-05-18 10:00');
verifier('RG-05 : 25 décembre et 1er janvier exclus', ymd(L.plusOuvres('2026-12-24 10:00:00', 1)) === '2026-12-28 10:00' && ymd(L.plusOuvres('2026-12-31 10:00:00', 1)) === '2027-01-04 10:00');
verifier('Dates du serveur lues en heure locale (Safari compris)', L.dt('2026-11-17 09:05:00').getHours() === 9 && L.dateFr('2026-11-17 09:05:00') === '17/11/2026 à 09:05');
/* ---------- Q2, Q3 : délais par type ---------- */
verifier('Q3 : demande de devis 24 h, ultra-qualifié 48 h, qualifié 5 jours ouvrés', L.joursDelai('devis') === 1 && L.joursDelai('ultra') === 2 && L.joursDelai('qualifie') === 5);
verifier('Q2 : qualifié avec rappel demandé = 48 h ouvrées', L.joursDelai('qualifie', 1) === 2 && L.joursDelai('devis', 1) === 1);
verifier('Concordance PHP : délais par défaut identiques', /'jours' => \['devis' => 1, 'ultra' => 2, 'qualifie' => 5, 'rappel' => 2\]/.test(PHP));
verifier('Concordance PHP : seuil Pro / Entreprise 20 salariés (Q1)', /'seuil_pro' => 20/.test(PHP) && L.SEUIL_PRO === 20);
verifier('Concordance PHP : jours fériés (mêmes 11 jours, algorithme de Pâques)', /\$a-11-11/.test(PHP) && /modify\('\+39 days'\)/.test(PHP) && /modify\('\+50 days'\)/.test(PHP));
/* ---------- types, statuts, référentiels ---------- */
const cles = re => (PHP.match(re) || [''])[0].match(/'([a-z_]+)' =>/g).map(x => x.slice(1, -4));
verifier('3 types de leads (JS = PHP)', Object.keys(L.TYPES).join() === 'devis,ultra,qualifie' && ((PHP.match(/const LM2_TYPES = \[[^\n]*/) || [''])[0].match(/'(\w+)' => \['lib'/g) || []).map(x => x.split("'")[1]).join() === 'devis,ultra,qualifie');
verifier('Q4 : 5 statuts (JS = PHP)', L.ORDRE_STATUTS.join() === 'nouveau,pris_en_charge,transfere,proposition,cloture' && cles(/const LM2_STATUTS = \[[^\n]*/).join() === 'nouveau,pris_en_charge,transfere,proposition,cloture');
verifier('Issues de clôture : signé, perdu, sans suite, injoignable, doublon (JS = PHP)', Object.keys(L.ISSUES).join() === 'signe,perdu,sans_suite,injoignable,doublon' && cles(/const LM2_ISSUES = \[[^\n]*/).join() === Object.keys(L.ISSUES).join());
verifier('RG-14 : 5 statuts client (JS = PHP)', Object.keys(L.CLIENT).join() === 'declare,non_declare,inconnu,verifie,prospect' && /const LM2_CLIENT = \['declare' => [^\n]*'non_declare' => [^\n]*'inconnu' => /.test(PHP) && /'verifie' => 'Client vérifié', 'prospect' => 'Prospect vérifié'/.test(PHP));
verifier('RG-22 : filiales et solutions (JS = PHP)', JSON.stringify(Object.keys(L.FILIALES).map(f => [f, L.FILIALES[f].solutions])) === JSON.stringify([['caa', ['sante']], ['amundi', ['epargne', 'retraite']], ['worklife', ['avantages']]]) &&
  /'caa' => \['lib' => 'CA Assurances', 'outil' => 'Prévis', 'solutions' => \['sante'\]\]/.test(PHP) && /'amundi' => \['lib' => 'Amundi \/ CA Titres', 'outil' => 'Universels', 'solutions' => \['epargne', 'retraite'\]\]/.test(PHP) && /'worklife' => \['lib' => 'Worklife', 'outil' => 'devis par e-mail', 'solutions' => \['avantages'\]\]/.test(PHP));
verifier('Amundi / CA Titres : une seule entité', L.FILIALES.amundi.lib === 'Amundi / CA Titres' && !/'CA Titres'|"CA Titres"/.test(fs.readFileSync(path.join(M, 'console.js'), 'utf8')));
/* déclencheurs → types (§ 3, Q2, RG-07) */
const map = {}; (PHP.match(/const LM2_TYPE_DEMANDE = \[[\s\S]*?\];/) || [''])[0].replace(/'(\w+)' => \['(\w+)', (true|false)\]/g, (m, a, b, c) => { map[a] = [b, c === 'true']; return m; });
verifier('§ 3 : « Recevoir mon devis » = demande de devis', JSON.stringify(map.devis) === '["devis",false]');
verifier('§ 3 : « Recevoir mon estimation » = ultra-qualifié', JSON.stringify(map.devis_en_cours) === '["ultra",false]');
verifier('§ 3 : résultats du diagnostic par e-mail = qualifié', JSON.stringify(map.diagnostic_estimation) === '["qualifie",false]' && JSON.stringify(map.label_resultats) === '["qualifie",false]');
verifier('Q2 : « Nous contacter », Label BRH, audit, « Parler à un expert » = qualifié avec rappel demandé', ['diagnostic_contact', 'label_contact', 'audit_mutuelle_prevoyance', 'rappel_expert', 'contact'].every(k => JSON.stringify(map[k]) === '["qualifie",true]'), map);
verifier('RG-07 : la newsletter n’est pas un lead', !('newsletter' in map) && /\$map = LM2_TYPE_DEMANDE\[\(string\) \$l\['type'\]\] \?\? null;\n  if \(!\$map\) return null;/.test(PHP));
verifier('RG-03 : le type ne fait que monter (rang qualifié < ultra < devis)', /const LM2_RANG = \['qualifie' => 1, 'ultra' => 2, 'devis' => 3\]/.test(PHP) && /\$monte = LM2_RANG\[\$type\] > \(LM2_RANG\[\$d\['type'\]\] \?\? 0\)/.test(PHP));
verifier('RG-01 : pas de lead sans consentement', /if \(!\(int\) \$l\['consentement'\]\) return null;/.test(PHP));
verifier('RG-02 : un dossier par dirigeant (e-mail, sinon SIREN, 60 jours)', /'e:' \. \$email : \(\$siren !== '' \? 's:' \. \$siren/.test(PHP) && /LM_FUSION_JOURS', 60/.test(PHP));
verifier('RG-29 : un dossier clôturé se rouvre à une nouvelle demande, transferts précédents clos', /if \(\$d\['statut'\] === 'cloture'\) \{[\s\S]{0,200}lm2_clore_transfert[\s\S]{0,200}'statut' => 'nouveau'/.test(PHP));
/* ---------- corrections de la relecture indépendante ---------- */
const API = fs.readFileSync(path.join(M, 'lm2-api.php'), 'utf8'), COL = fs.readFileSync(path.join(M, 'collecte.php'), 'utf8'), SUI = fs.readFileSync(path.join(M, 'lm2-suivi.php'), 'utf8');
verifier('Sécurité : une nouvelle demande n’écrase jamais une coordonnée connue du dossier', /\(\$d\[\$k\] === null \|\| \(string\) \$d\[\$k\] === ''\)\) \$maj\[\$k\] = \$v;/.test(PHP));
verifier('Sécurité : lien de suivi renvoyé au navigateur seulement pour un dossier créé ou une suite prouvée (id + jeton)', /if \(lm2_evenement\(\) === 'nouveau' \|\| \$prouve\) \$rep\['suivi'\] = lm2_lien_suivi\(\$d\); else \$rep\['suivi_email'\] = true;/.test(COL));
verifier('RG-02 : regroupement par SIREN seulement sans e-mail', /if \(!\$d && \$siren !== '' && \$email === ''\)/.test(PHP));
verifier('RG-23 : accès ponctuel valable seulement pour le transfert en cours du dossier', /JOIN lm2_dossiers d ON d\.id = a\.dossier_id AND d\.transfert_id = a\.transfert_id[\s\S]{0,120}t\.actif = 1/.test(API));
verifier('RG-25 : alerte rendue possible à chaque nouvelle échéance (alerte_le remis à zéro)', (PHP.match(/'alerte_le'\]? (=>|=) null/g) || []).length >= 3);
verifier('Tâches : seules les demandes des types connus et des sites suivis, une erreur ne bloque pas', /lm2_filtre_leads\('l'\)/.test(PHP) && /catch \(\\Throwable \$x\) \{ error_log/.test(PHP) && /GET_LOCK\('lm2_taches', 0\)/.test(PHP));
verifier('S2 : récapitulatif depuis le dernier envoi (week-ends et fériés compris)', /recap_depuis/.test(PHP));
verifier('RG-56 : un expert BRH désactivé est retiré de ses dossiers', /UPDATE lm2_dossiers SET expert_id = NULL WHERE expert_id = \?/.test(PHP));
verifier('Reprise des demandes existantes : sans e-mail', /lm2_integrer\(\$db, \(int\) \$l\['id'\], false\)/.test(API));
verifier('RG-23 : révoquer l’accès d’un transfert en cours rend le lead à l’expert', /lm2_rendre\(\$db, \$d, 'accès révoqué par l’expert'/.test(API));
verifier('Envoi : rien sans LM_SITE_URL ; CR pilote coupée = aucun e-mail aux dirigeants', /LM_SITE_URL === ''\) return \['statut' => 'journal'/.test(PHP) && /if \(!\(int\) \$cr\['envoi'\]\) return \['statut' => 'journal', 'motif' => 'Envoi coupé pour cette CR'\];\n    if \(\$env\['dirigeants'\]\)/.test(PHP));
verifier('Sécurité : liens d’accès et codes masqués dans le journal des e-mails', /function lm2_masquer/.test(PHP) && !/\{code\}', 'objet'|'objet' => 'Votre code d’accès au lead management : \{code\}'/.test(PHP));
verifier('Sécurité : codes SMS limités à 5 par heure, code d’accès renvoyé au plus toutes les 30 s', /\(int\) \$n\['n'\] >= 5/.test(PHP) && /time\(\) \+ 570/.test(API));
verifier('Q17 : domaines du Crédit Agricole sur liste (LM2_DOMAINES_CA)', /define\('LM2_DOMAINES_CA', \['credit-agricole\.fr'/.test(PHP) && !/\|ca-\[a-z0-9-\]\+/.test(PHP));
verifier('RG-06 : jamais de {type} ni d’{echeance} dans un e-mail au dirigeant', /unset\(\$v\['type'\], \$v\['echeance'\]\);/.test(PHP));
verifier('Export CSV protégé contre les formules', /preg_match\('\/\^\[=\+\\-@\\t\\r\]\/', \$c\)/.test(API));
verifier('« Mon dossier » : transfert pas encore accepté → l’expert BRH reste affiché', /transfert pas encore accepté/.test(SUI));

/* ---------- référentiel (annexe A, Q15) ---------- */
const pil = REF.filter(c => c.mode === 'pilote').map(c => c.nom).sort();
verifier('Q15 : 5 CR pilotes', pil.join('|') === ['Centre Loire', 'Franche-Comté', 'Paris et Île-de-France', 'Pyrénées Gascogne', 'Touraine Poitou'].join('|'), pil);
verifier('Annexe A : 22 CR, Val de France 28 et 41 avec 6 agences', REF.length === 22 && REF[0].code === 'val-de-france' && REF[0].departements.join() === '28,41' && REF[0].agences.length === 6);
const deps = {}; let doublon = false; REF.forEach(c => c.departements.forEach(d => { if (deps[d]) doublon = true; deps[d] = c.code; }));
verifier('Annexe A : un département dans une seule CR', !doublon);
verifier('Référentiel PHP = référentiel JS (même source)', REF.every(c => REFPHP.includes('"code" => "' + c.code + '"') && REFPHP.includes('"mode" => "' + c.mode + '"')) && (REFPHP.match(/"ville" => /g) || []).length === REF.reduce((n, c) => n + c.agences.length, 0));

/* ---------- RG-17, § 4.3 : aide au choix du destinataire ---------- */
const A = { agences: [{ id: 1, nom: 'Agence de Chartres', ville: 'Chartres', cp: '28000', departement: '28' }, { id: 2, nom: 'Agence de Châteaudun', ville: 'Châteaudun', cp: '28200', departement: '28' }, { id: 3, nom: 'Agence de Dreux', ville: 'Dreux', cp: '28100', departement: '28' }, { id: 4, nom: 'Agence de Blois', ville: 'Blois', cp: '41000', departement: '41' }],
  interlocuteurs: [{ id: 10, role: 'expert_brh_pro', prenom: 'Ana', nom: 'Vingt-huit', perimetre: '28', departements: '28', principal: 1, actif: 1 }, { id: 11, role: 'expert_brh_pro', prenom: 'Bob', nom: 'Villes', perimetre: 'Blois, Vendôme', departements: '41', actif: 1 },
    { id: 20, role: 'conseiller_pro', prenom: 'Cléo', nom: 'Un', agence_id: 1, charge: 3, actif: 1, email: 'c.un@exemple-ca-vf.fr' }, { id: 21, role: 'conseiller_pro', prenom: 'Dan', nom: 'Deux', agence_id: 1, charge: 1, actif: 1, email: 'd.deux@exemple-ca-vf.fr' },
    { id: 22, role: 'conseiller_pro', prenom: 'Éva', nom: 'Trois', agence_id: 2, charge: 0, actif: 1 }, { id: 23, role: 'conseiller_pro', prenom: 'Fred', nom: 'Inactif', agence_id: 2, charge: 0, actif: 0 }] };
let s = L.suggerer({ effectif: 9, ville: 'Chartres', code_postal: '28000', departement: '28', type: 'devis', solutions: ['sante'] }, A);
verifier('§ 4.3-2 : département du siège → expert BRH PRO du département', s.expertPro.id === 10 && s.critere === 2 && /Chartres \(28000\) → Eure-et-Loir \(28\) → expert BRH PRO du 28/.test(s.pourquoi), s.pourquoi);
verifier('§ 4.3-4 : agence de la commune du siège', s.agence.id === 1);
verifier('§ 4.3-5 : conseiller le moins chargé de l’agence', s.conseiller.id === 21 && /moins chargé.*Dan Deux \(1 lead en cours\)/.test(s.pourquoi));
verifier('RG-17 : segment Pro sous 20 salariés, suggestion seulement', s.segment === 'pro' && /transfert suggéré/.test(s.conseilSegment));
s = L.suggerer({ effectif: 30, ville: 'Blois', code_postal: '41000', departement: '41' }, A);
verifier('§ 4.3-3 : périmètre par villes → expert BRH PRO des villes', s.expertPro.id === 11 && s.critere === 3);
verifier('RG-17 : segment Entreprise à partir de 20 salariés (l’expert traite)', s.segment === 'entreprise' && /traitement conseillé par vous-même/.test(s.conseilSegment) && L.segment(20) === 'entreprise' && L.segment(19) === 'pro' && L.segment(null) === '');
s = L.suggerer({ effectif: 5, ville: 'Nogent-le-Rotrou', code_postal: '28400', departement: '28' }, A);
verifier('§ 4.3-4 : sinon agence la plus proche dans le département (code postal)', s.agence.id === 2 && /plus proche/.test(s.pourquoi), s.agence);
verifier('§ 4.3-5 : conseiller inactif jamais suggéré', s.conseiller.id === 22 && !s.conseillersAgence.some(i => i.id === 23));
s = L.suggerer({ effectif: 5, ville: 'Vendôme', code_postal: '41100', departement: '41', client_statut: 'verifie', client_conseiller_email: 'C.UN@exemple-ca-vf.fr' }, A);
verifier('§ 4.3-1 : client vérifié → conseiller titulaire en premier', s.titulaire && s.titulaire.id === 20 && s.critere === 1 && /conseiller titulaire Cléo Un/.test(s.pourquoi));
s = L.suggerer({ effectif: 5, ville: 'Tours', code_postal: '37000', departement: '37' }, A);
verifier('§ 4.3-6 : aucun périmètre → expert BRH PRO principal', s.expertPro.id === 10 && s.critere === 6 && /principal/.test(s.pourquoi));
s = L.suggerer({ effectif: 5, ville: 'Chartres', departement: '28' }, { agences: A.agences, interlocuteurs: A.interlocuteurs.filter(i => i.role !== 'expert_brh_pro') });
verifier('Q7 : sans expert BRH PRO dans la CR, conseiller pro seulement', !s.expertPro && s.conseiller && s.autresPros.length === 0);
verifier('RG-22 : filiales seulement pour une demande de devis, selon les offres', L.filialesPermises({ type: 'devis', solutions: ['sante', 'epargne'] }).join() === 'caa,amundi' && L.filialesPermises({ type: 'ultra', solutions: ['sante'] }).length === 0 && L.filialesPermises({ type: 'devis', solutions: ['retraite', 'avantages'] }).join() === 'amundi,worklife');
verifier('Concordance PHP : RG-22 appliquée côté serveur', /if \(\$d\['type'\] !== 'devis'\) return \[\];/.test(PHP) && /Motif obligatoire pour un transfert à une filiale/.test(PHP));

/* ---------- RG-04, S7 : liste et échéance ---------- */
const maint = new Date(2026, 10, 18, 10, 0);
const e = (o) => L.etatEcheance(Object.assign({ statut: 'nouveau' }, o), maint);
verifier('S7 : hors délai', e({ echeance: '2026-11-18 09:00:00' }).etat === 'retard' && e({ echeance: '2026-11-18 09:00:00' }).lib === 'Hors délai');
verifier('S7 : échéance proche (moins de 6 h)', e({ echeance: '2026-11-18 14:00:00' }).etat === 'proche' && /^Auj\. 14:00$/.test(e({ echeance: '2026-11-18 14:00:00' }).lib));
verifier('Échéance : rendez-vous à venir, lead clôturé', e({ statut: 'pris_en_charge', rdv_le: '2026-11-20 10:00:00' }).lib === 'RDV 20/11' && e({ statut: 'cloture', issue: 'signe' }).lib === 'Signé');
const t = L.trier([{ id: 1, type: 'qualifie', statut: 'nouveau', echeance: '2026-11-18 09:00:00' }, { id: 2, type: 'devis', statut: 'proposition', echeance: '2026-11-01 09:00:00' }, { id: 3, type: 'devis', statut: 'nouveau', echeance: '2026-11-19 09:00:00' },
  { id: 4, type: 'ultra', statut: 'nouveau', echeance: '2026-11-20 09:00:00' }, { id: 5, type: 'devis', statut: 'cloture' }, { id: 6, type: 'devis', statut: 'nouveau', echeance: '2026-11-18 12:00:00' }]).map(x => x.id).join();
verifier('RG-04 : devis, ultra, qualifiés ; à type égal échéance la plus proche (leads à prendre d’abord) ; clôturés à la fin', t === '6,3,2,4,1,5', t);
verifier('KPI : 3 compteurs, clôturés exclus', JSON.stringify(L.kpis([{ type: 'devis', statut: 'nouveau' }, { type: 'devis', statut: 'cloture' }, { type: 'ultra', statut: 'transfere' }])) === '{"devis":1,"ultra":1,"qualifie":0}');

/* ---------- RG-31, RG-34 : contexte de l'IA sans données personnelles ---------- */
const lead = { prenom: 'Martine', nom: 'Lefort', email: 'martine@exemple.fr', telephone: '0612345678', siret: '81234567800012', raison_sociale: 'Boulangerie Lefort', type: 'devis', client_statut: 'declare', rappel: 1,
  secteur: 'Boulangerie', effectif: 9, departement: '28', solutions: ['sante'], montant: 6840, idcc: '0843', parcours: { priorites: { protection: 4 }, sante_ccn: { statut: 'Régime obligatoire', exigences: 'panier' } } };
const cx = JSON.stringify(L.contexteIA(lead));
verifier('RG-31 : contexte IA sans nom, e-mail, téléphone, SIRET ni raison sociale', !/Martine|Lefort|martine@|0612345678|81234567800012|Boulangerie Lefort/.test(cx) && /Boulangerie/.test(cx), cx);
const ctxPhp = (PHP.match(/function lm2_contexte_ia[\s\S]*?\n\}/) || [''])[0];
verifier('RG-31 : contexte IA côté serveur sans nom, e-mail, téléphone ni SIRET', ctxPhp && !/'(prenom|nom|email|telephone|siret|raison_sociale)'\]/.test(ctxPhp) && /'secteur' =>/.test(ctxPhp));
verifier('RG-34 : noms ajoutés dans le navigateur ([Prénom], [Votre nom], [Signature])', L.injecter('Bonjour [Prénom], [Votre nom]\n[Signature]', { prenom: 'Martine', moi: 'Sophie Martin', signature: 'Sophie Martin\nBRH' }) === 'Bonjour Martine, Sophie Martin\nSophie Martin\nBRH');
verifier('RG-33 / RG-36 : règles imposées à l’IA (montants, délais, type de lead, noms)', /estimation indicative et non contractuelle/.test(PHP) && /aucune promesse de délai/.test(PHP) && /ne mentionne jamais le type de lead/.test(PHP) && /n'écris aucun nom propre/.test(PHP));
/* repli sans IA */
['qualifie', 'ultra', 'devis'].forEach(ty => ['declare', 'inconnu', 'verifie', 'prospect'].forEach(cs => {
  const sc = L.scriptRepli(Object.assign({}, lead, { type: ty, client_statut: cs, client_agence: 'Agence de Chartres' })), txt = JSON.stringify(sc);
  if (!(sc.blocs.length === 5 && sc.blocs.map(b => b.titre).join() === 'Ouverture,Vérifier,Découvrir,Répondre aux objections,Conclure')) verifier('RG-35 : script en 5 temps (' + ty + ', ' + cs + ')', false);
  if (/dès que possible|sous 24 ?h|sous 48 ?h|délai garanti|nous garantissons/i.test(txt)) verifier('RG-36 : aucune promesse de délai (' + ty + ')', false, txt);
  if (/Ultra|Qualifié|Demande de devis/.test(sc.blocs.map(b => b.lignes.join(' ')).join(' '))) verifier('RG-36 : jamais le type de lead dans le script (' + ty + ')', false);
}));
verifier('RG-35 : script en 5 temps pour les 3 types et les statuts client', true);
let sc = L.scriptRepli(Object.assign({}, lead, { type: 'ultra' }));
verifier('RG-36 : montant cité avec « estimation indicative et non contractuelle »', /6 840 € par an \(estimation indicative et non contractuelle\)/.test(JSON.stringify(sc)));
verifier('§ 7.3 : statut à vérifier → la question ouvre le script', /compte professionnel est-il suivi/.test(JSON.stringify(L.scriptRepli(Object.assign({}, lead, { client_statut: 'inconnu' })))));
verifier('§ 7.3 : client vérifié → rappel de l’agence', /Agence de Chartres/.test(JSON.stringify(L.scriptRepli(Object.assign({}, lead, { client_statut: 'verifie', client_agence: 'Agence de Chartres' })))));
verifier('§ 7.3 : prospect → présentation du Crédit Agricole et de la Banque des RH', /Le Crédit Agricole accompagne/.test(JSON.stringify(L.scriptRepli(Object.assign({}, lead, { client_statut: 'prospect' })))));
const em = L.emailsRepli(lead, 'estimation', 'formel');
verifier('RG-30 : 3 propositions d’e-mail', em.length === 3 && em.every(x => x.objet && /\[Prénom\]/.test(x.corps) && /\[Signature\]/.test(x.corps)));
verifier('RG-33 : montant avec « estimation indicative et non contractuelle »', em.every(x => /indicative et non contractuelle/.test(x.corps)));
verifier('RG-30 : 4 objectifs', Object.keys(L.OBJECTIFS).join() === 'rdv,estimation,relance,convention');

/* ---------- modèles d'e-mails : serveur = démonstration (RG-65) ---------- */
const mphp = {}; (PHP.match(/function lm2_modeles_defaut[\s\S]*?\n\}/) || [''])[0].replace(/'(\w+)'\s*=> \['lib' => '([^']*)', 'cat' => '(\w+)', 'objet' => '([^']*)',\s*'texte' => "((?:[^"\\]|\\.)*)"\]/g, (m, k, lib, cat, ob, tx) => { mphp[k] = [lib, cat, ob, tx.replace(/\\n/g, '\n')]; return m; });
const mdemo = (fs.readFileSync(path.join(M, 'console-demo.js'), 'utf8').match(/var MODELES = \{[\s\S]*?\n  \};/) || [''])[0];
verifier('RG-65 : 11 modèles côté serveur (E1 à E8, récapitulatif, code d’accès, test)', Object.keys(mphp).join() === 'E1,E2,E3,E4,E5,E6,E7,E8,R,A,T', Object.keys(mphp));
verifier('RG-65 : modèles de la démonstration identiques au serveur', Object.keys(mphp).every(k => mdemo.includes(k + ": ['" + mphp[k][0] + "', '" + mphp[k][1] + "', '" + mphp[k][2] + "', '" + mphp[k][3].replace(/\n/g, '\\n') + "']")), Object.keys(mphp).filter(k => !mdemo.includes(k + ": ['" + mphp[k][0] + "', '" + mphp[k][1] + "', '" + mphp[k][2] + "', '" + mphp[k][3].replace(/\n/g, '\\n') + "']")));
verifier('E1 : référence et lien « Mon dossier »', /\{reference\}/.test(mphp.E1[3]) && /suivre votre dossier/.test(mphp.E1[3]));
verifier('Atelier 13/11 : aucune promesse « rappel dès que possible »', !Object.values(mphp).some(m => /dès que possible/i.test(m[3])));

/* ---------- RG-60 à RG-62, RG-54 : décision d'envoi réel ---------- */
const dec = (PHP.match(/function lm2_decider_envoi[\s\S]*?\n\}/) || [''])[0];
verifier('RG-60 : envoi réel coupé = journal seulement', /if \(!\$env\['reel'\]\) return \['statut' => 'journal'/.test(dec));
verifier('RG-54 / RG-62 : jamais d’envoi à un interlocuteur fictif', /if \(\$interloc\['donnees'\] !== 'reel'\) return \['statut' => 'non_envoye', 'motif' => 'Interlocuteur fictif'\]/.test(dec));
verifier('RG-62 : jamais d’envoi dans une CR en démonstration', /if \(!\$cr \|\| \$cr\['mode'\] !== 'pilote'\) return \['statut' => 'non_envoye', 'motif' => 'CR en démonstration'\]/.test(dec));
verifier('RG-60 : interrupteur par CR pilote et par catégorie', /if \(!\(int\) \$cr\['envoi'\]\) return \['statut' => 'journal'/.test(dec) && /\$filiale \? !\$env\['filiales'\] : !\$env\['interlocuteurs'\]/.test(dec));
verifier('RG-62 : dirigeants redirigés vers l’adresse de test tant que non levé', /'redirige' => LM2_TEST_DIRIGEANTS/.test(dec) && /'dirigeants' => false/.test(PHP));
verifier('RG-61 : expéditeur contact@monsitedetest.com, nom affiché, Reply-To', /define\('LM2_EMAIL_FROM', 'contact@monsitedetest\.com'\)/.test(PHP) && /define\('LM2_EMAIL_NOM', 'Banque des RH – Lead management'\)/.test(PHP) && /'Reply-To: ' \. \$replyTo/.test(PHP));
verifier('RG-66 : 3 essais au plus, SMTP authentifié', /essais < 3/.test(PHP) && /AUTH LOGIN/.test(PHP) && /STARTTLS/.test(PHP));
verifier('RG-63 / Q20 : fiche client sans e-mail ni téléphone du dirigeant', (() => { const f = (PHP.match(/function lm2_fiche_client[\s\S]*?\n\}/) || [''])[0]; return f && !/\$d\['(email|telephone|nom)'\]/.test(f) && /coordonnées dans la plateforme/.test(f); })());
verifier('RG-68 : pied « E-mail interne Crédit Agricole : ne pas transférer » et validité du lien', /E-mail interne Crédit Agricole : ne pas transférer/.test(PHP) && /Lien personnel, valable jusqu’au/.test(PHP));
verifier('RG-64 : liens profonds vers la fiche et le script (#lead=…&vue=script)', /console\.html#lead=' \. \$dossier/.test(PHP) && /'script'\)\]/.test(PHP) && /console\.html\?acces=' \. \$jeton/.test(PHP));
verifier('Domaine des adresses fictives non routable (.invalid)', /\.demo-brh\.invalid/.test(PHP) && !/@[a-z0-9-]+\.demo-brh\.(fr|com)/.test(PHP));

/* ---------- démonstration : annuaire fictif (RG-52) ---------- */
const DB = ctx.LM2_DEMO._db;
const vf = DB.its.filter(i => i.cr_code === 'val-de-france');
verifier('RG-52 : CR en démo : 1 expert BRH, 1 expert BRH PRO par département, 2 conseillers pro par agence', vf.filter(i => i.role === 'expert_brh').length === 1 && vf.filter(i => i.role === 'expert_brh_pro').length === 2 && vf.filter(i => i.role === 'conseiller_pro').length === 12);
verifier('RG-52 : CR pilote sans annuaire fictif (à saisir), sauf l’illustration de Touraine Poitou', DB.its.filter(i => i.cr_code === 'centre-loire').length === 0 && DB.its.filter(i => i.cr_code === 'touraine-poitou' && i.donnees === 'reel').length >= 5);
verifier('Démo : adresses fictives non routables', vf.every(i => /\.demo-brh\.invalid$/.test(i.email)));
bilan('Règles de gestion LM 2.0 (lm2-regles.js, concordance avec lm2-base.php)');
