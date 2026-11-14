<?php
/* ============================================================================
   lm-base.php — LEAD MANAGEMENT du Portail BRH, version C (protobrhc)
   ----------------------------------------------------------------------------
   Règles de gestion : deck « Scénarios de distribution et niveaux de lead » du 14/11/2026.
     - Trois niveaux de lead selon l'avancée dans le parcours :
         abandonniste (priorité 3, relance J+1 et J+7), chaud (priorité 2, sous 48 h ouvrées),
         ultra-chaud (priorité 1, sous 24 h ouvrées) = Dossier BRH transmis.
     - Un dossier par dirigeant : les leads successifs (simulation, début de devis, devis) sont
       fusionnés et le niveau ne fait que monter.
     - Routage au national :
         scénario A (V0.0, pilote) : département de l'entreprise → Caisse régionale → expert BRH,
           canal SOLEAD ou cockpit selon la CR ; l'expert confie les pros au conseiller pro ;
         scénario B (V0.1, cible, SIMULÉ) : SIRET rapproché d'une base clients de démonstration ;
           client vérifié → sa CR, son marché et son portefeuille (CRM + alerte PUC) ;
           prospect → scénario A. Rien n'est affiché au visiteur.
     - Workflow commun en 6 statuts : Déposé → Attribué → Pris en charge → Qualifié → Proposé → Clôturé.
     - Un volet par filiale : CA Assurances (Prévis), Amundi / CA Titres (Universels), Worklife.
     - E-mails générés et journalisés ; envoi réel seulement si LM_EMAIL_ENVOI = true (config.php).
   Données : même base MySQL que lead.php (table « leads ») ; tables lm_* créées au premier appel.
   Inclus par lm-api.php, lead.php (version C), lm-cron.php et lm-suivi.php. Ne s'exécute pas seul.
   ============================================================================ */
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
date_default_timezone_set('Europe/Paris');   // délais, jours fériés et heures de relance en heure de Paris
require_once __DIR__ . '/leads-base.php';

/* ---------------- paramètres (surchargeables dans config.php) ---------------- */
if (!defined('LM_VERSIONS'))            define('LM_VERSIONS', ['C']);   // versions du prototype prises en charge
if (!defined('LM_EMAIL_ENVOI'))         define('LM_EMAIL_ENVOI', false); // false = e-mails journalisés, jamais envoyés
if (!defined('LM_EMAIL_FROM'))          define('LM_EMAIL_FROM', 'Banque des RH <ne-pas-repondre@monsitedetest.com>');
if (!defined('LM_EMAIL_REDIRECTION'))   define('LM_EMAIL_REDIRECTION', ''); // prototype : tous les e-mails envoyés à cette adresse
if (!defined('LM_SITE_URL'))            define('LM_SITE_URL', '');       // ex. https://protobrhc.monsitedetest.com (sinon déduit de la requête)
if (!defined('LM_CRON_TOKEN'))          define('LM_CRON_TOKEN', '');     // jeton d'appel HTTP de lm-cron.php
if (!defined('LM_SCENARIO_B'))          define('LM_SCENARIO_B', true);   // rapprochement SIRET simulé pour les CR en scénario B
if (!defined('LM_SEUIL_PRO_EFFECTIF'))  define('LM_SEUIL_PRO_EFFECTIF', 50);       // pro / entrepreneur : moins de 50 salariés…
if (!defined('LM_SEUIL_PRO_CA'))        define('LM_SEUIL_PRO_CA', 3000000);         // … ou moins de 3 M€ de CA (règle ET / OU à trancher)
if (!defined('LM_SEUIL_APPEL_ABANDON')) define('LM_SEUIL_APPEL_ABANDON', 20);       // abandonniste : appel conseillé à partir de 20 salariés
if (!defined('LM_FUSION_JOURS'))        define('LM_FUSION_JOURS', 60);  // fusion des leads d'un même dirigeant dans un dossier ouvert

/* ---------------- référentiels ---------------- */
const LM_NIVEAUX = [
  'ultra_chaud'  => ['lib' => 'Ultra-chaud',  'prio' => 1, 'delai' => 'Sous 24 h ouvrées', 'jours' => 1,
                     'declencheur' => 'Offre configurée avec ses options, coordonnées données pour finaliser',
                     'traitement' => 'Rappel prioritaire pour finaliser le devis ; données pré-alimentant Prévis, Universels, Worklife',
                     'message' => 'Votre expert vous rappelle pour finaliser'],
  'chaud'        => ['lib' => 'Chaud',        'prio' => 2, 'delai' => 'Sous 48 h ouvrées', 'jours' => 2,
                     'declencheur' => 'Offre choisie en début de devis, parcours interrompu avant la fin (ou demande de contact)',
                     'traitement' => 'Appel de l’expert ou du conseiller pour lever le blocage ; e-mail de reprise du devis',
                     'message' => 'Reprenez votre devis là où vous l’avez laissé'],
  'abandonniste' => ['lib' => 'Abandonniste', 'prio' => 3, 'delai' => 'Relance J+1 et J+7', 'jours' => 0,
                     'declencheur' => 'Simulation ou label RH terminé, e-mail laissé, sans entrer dans le devis',
                     'traitement' => 'Relance e-mail automatique avec le résultat et un lien de reprise ; appel si l’effectif le justifie',
                     'message' => 'Retrouvez le résultat de votre simulation'],
];
/* type de demande envoyé par le portail → niveau ; null = pas un lead commercial */
const LM_TYPE_NIVEAU = [
  'devis' => 'ultra_chaud', 'devis_en_cours' => 'chaud', 'rappel_expert' => 'chaud',
  'diagnostic_contact' => 'chaud', 'label_contact' => 'chaud', 'audit_mutuelle_prevoyance' => 'chaud', 'contact' => 'chaud',
  'diagnostic_estimation' => 'abandonniste', 'label_resultats' => 'abandonniste',
  'newsletter' => null,
];
const LM_STATUTS = ['depose' => 'Déposé', 'attribue' => 'Attribué', 'pris_en_charge' => 'Pris en charge',
                    'qualifie' => 'Qualifié', 'propose' => 'Proposé', 'cloture' => 'Clôturé'];
const LM_ISSUES = ['signe' => 'Signé', 'perdu' => 'Perdu', 'sans_suite' => 'Sans suite', 'injoignable' => 'Injoignable', 'doublon' => 'Doublon'];
const LM_CLIENT = ['verifie' => 'Client vérifié', 'declare' => 'Client déclaré', 'prospect' => 'Prospect · KYC', 'inconnu' => 'À vérifier'];
const LM_DESTINATAIRES = ['expert_brh' => 'Expert BRH', 'expert_brh_pro' => 'Expert BRH PRO', 'conseiller_pro' => 'Conseiller pro', 'national' => 'File nationale'];
const LM_CANAUX = ['solead' => 'SOLEAD', 'cockpit' => 'Cockpit BRH', 'crm' => 'CRM + alerte PUC'];
const LM_FILIALES = [
  'caa'      => ['lib' => 'CA Assurances',      'outil' => 'Prévis',      'solutions' => ['sante']],
  'amundi'   => ['lib' => 'Amundi / CA Titres', 'outil' => 'Universels',  'solutions' => ['epargne', 'retraite']],
  'worklife' => ['lib' => 'Worklife',           'outil' => 'devis e-mail','solutions' => ['avantages']],
];
const LM_VOLET_STATUTS = ['a_qualifier' => 'En attente de qualification', 'en_cours' => 'Étude en cours',
                          'propose' => 'Proposition envoyée', 'signe' => 'Signé', 'sans_suite' => 'Sans suite'];
const LM_SOLUTIONS = ['epargne' => 'Épargne salariale', 'sante' => 'Santé & prévoyance', 'retraite' => 'Retraite collective', 'avantages' => 'Avantages salariés'];
const LM_ROLES = ['national' => 'National (console)', 'expert' => 'Expert BRH (CR)', 'filiale' => 'Filiale'];

/* table de démonstration département → Caisse régionale (identique à ia-assist.js) — À REMPLACER par la table validée */
const LM_CR_DEMO = [
  'touraine-poitou' => ['Touraine Poitou', '37,86'], 'pyrenees-gascogne' => ['Pyrénées Gascogne', '64,65,32'], 'centre-loire' => ['Centre Loire', '18,45,58'],
  'val-de-france' => ['Val de France', '28,41'], 'anjou-maine' => ['Anjou Maine', '49,53,72'], 'atlantique-vendee' => ['Atlantique Vendée', '44,85'],
  'paris-idf' => ['Paris et Île-de-France', '75,78,91,92,93,94,95'], 'brie-picardie' => ['Brie Picardie', '60,77,80'],
  'cmds' => ['Charente-Maritime Deux-Sèvres', '17,79'], 'centre-ouest' => ['Centre Ouest', '36,87'], 'aquitaine' => ['Aquitaine', '33,40,47'],
  'nord-de-france' => ['Nord de France', '59,62'], 'normandie' => ['Normandie', '14,50,61'], 'normandie-seine' => ['Normandie-Seine', '27,76'],
  'alpes-provence' => ['Alpes Provence', '05,13,84'], 'centre-est' => ['Centre-Est', '01,69,71'], 'sud-rhone-alpes' => ['Sud Rhône Alpes', '07,26,38'],
  'ille-et-vilaine' => ['Ille-et-Vilaine', '35'], 'cotes-d-armor' => ['Côtes d’Armor', '22'], 'finistere' => ['Finistère', '29'], 'morbihan' => ['Morbihan', '56'],
];

/* ---------------- base ---------------- */
function lm_db(): ?mysqli {
  static $db = null, $fait = false;
  if ($fait) return $db;
  $fait = true;
  $db = brh_leads_db();
  if (!$db) return null;
  $db->query("SET time_zone = '" . date('P') . "'");   // NOW() de MySQL aligné sur l'heure PHP (Europe/Paris)
  $T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
  $db->query("CREATE TABLE IF NOT EXISTS lm_dossiers (
    id INT AUTO_INCREMENT PRIMARY KEY, reference VARCHAR(20) NULL, cree_le DATETIME NOT NULL, maj_le DATETIME NOT NULL, version CHAR(1) NOT NULL DEFAULT 'C',
    cle VARCHAR(192) NOT NULL, email VARCHAR(190), prenom VARCHAR(100), nom VARCHAR(120), telephone VARCHAR(40), fonction VARCHAR(120),
    raison_sociale VARCHAR(190), siret VARCHAR(14), code_postal VARCHAR(10), ville VARCHAR(120), departement VARCHAR(3), effectif INT NULL, ca BIGINT NULL,
    secteur VARCHAR(120), idcc VARCHAR(160),
    niveau VARCHAR(16) NOT NULL, niveau_le DATETIME NOT NULL, rappel_demande TINYINT NOT NULL DEFAULT 0,
    statut VARCHAR(20) NOT NULL DEFAULT 'depose', statut_le DATETIME NOT NULL, issue VARCHAR(20) NULL,
    scenario CHAR(1) NOT NULL DEFAULT 'A', client_statut VARCHAR(12) NOT NULL DEFAULT 'inconnu', client_declare VARCHAR(8) NULL, portefeuille VARCHAR(190) NULL,
    marche VARCHAR(12) NULL, cr_code VARCHAR(40) NULL, destinataire VARCHAR(20) NULL, canal VARCHAR(12) NULL, user_id INT NULL, conseiller_pro VARCHAR(190) NULL,
    echeance DATETIME NULL, pris_le DATETIME NULL, alerte_sla_le DATETIME NULL, rdv_le DATETIME NULL,
    relances TINYINT NOT NULL DEFAULT 0, prochaine_relance DATETIME NULL, consent_relance TINYINT NOT NULL DEFAULT 1,
    montant INT NULL, solutions VARCHAR(120) NULL, volets TEXT NULL, synthese TEXT NULL, resultat TEXT NULL,
    origine VARCHAR(40) NULL, dernier_type VARCHAR(40) NULL, dernier_lead_id INT NULL, jeton CHAR(32) NOT NULL, jalons TEXT NULL,
    UNIQUE KEY (reference), INDEX (cle), INDEX (statut), INDEX (niveau), INDEX (cr_code), INDEX (user_id), INDEX (echeance), INDEX (prochaine_relance)
  ) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm_dossier_leads (lead_id INT PRIMARY KEY, dossier_id INT NOT NULL, type VARCHAR(40), niveau VARCHAR(16), cree_le DATETIME NOT NULL, INDEX (dossier_id)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm_journal (id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, cree_le DATETIME NOT NULL, user_id INT NULL,
    acteur VARCHAR(160), action VARCHAR(30) NOT NULL, detail TEXT, INDEX (dossier_id), INDEX (cree_le)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm_emails (id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NULL, cree_le DATETIME NOT NULL, modele VARCHAR(40) NOT NULL,
    destinataire VARCHAR(190), envoye_a VARCHAR(190), objet VARCHAR(255), corps TEXT, statut VARCHAR(12) NOT NULL, envoye_le DATETIME NULL, INDEX (dossier_id), INDEX (cree_le)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm_users (id INT AUTO_INCREMENT PRIMARY KEY, login VARCHAR(80) NOT NULL, nom VARCHAR(120) NOT NULL, email VARCHAR(190),
    role VARCHAR(12) NOT NULL, cr_code VARCHAR(40) NULL, filiale VARCHAR(12) NULL, referent TINYINT NOT NULL DEFAULT 0, hash VARCHAR(255) NOT NULL,
    actif TINYINT NOT NULL DEFAULT 1, cree_le DATETIME NOT NULL, vu_le DATETIME NULL, UNIQUE KEY (login)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm_cr (code VARCHAR(40) PRIMARY KEY, nom VARCHAR(120) NOT NULL, departements VARCHAR(255) NOT NULL DEFAULT '',
    canal VARCHAR(12) NOT NULL DEFAULT 'cockpit', scenario CHAR(1) NOT NULL DEFAULT 'A', solead_email VARCHAR(190) NULL, actif TINYINT NOT NULL DEFAULT 1) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm_clients (siren CHAR(9) PRIMARY KEY, raison_sociale VARCHAR(190), cr_code VARCHAR(40) NOT NULL, marche VARCHAR(12) NOT NULL,
    portefeuille VARCHAR(190), conseiller VARCHAR(190), conseiller_email VARCHAR(190)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm_meta (k VARCHAR(40) PRIMARY KEY, v TEXT) $T");
  /* première installation : table des Caisses régionales de démonstration */
  $r = $db->query('SELECT COUNT(*) n FROM lm_cr');
  if ($r && (int) $r->fetch_assoc()['n'] === 0) {
    $s = $db->prepare("INSERT INTO lm_cr (code, nom, departements, canal, scenario) VALUES (?, ?, ?, 'cockpit', 'A')");
    foreach (LM_CR_DEMO as $code => [$nom, $deps]) { $s->bind_param('sss', $code, $nom, $deps); $s->execute(); }
  }
  return $db;
}
/* conservation : 12 mois après la dernière mise à jour, comme les demandes (leads-base.php) — appelée par lm_taches */
function lm_purger(mysqli $db): void {
  $m = (int) BRH_LEADS_CONSERVATION_MOIS;
  $db->query("DELETE j FROM lm_journal j JOIN lm_dossiers d ON d.id = j.dossier_id WHERE d.maj_le < (NOW() - INTERVAL $m MONTH)");
  $db->query("DELETE e FROM lm_emails e JOIN lm_dossiers d ON d.id = e.dossier_id WHERE d.maj_le < (NOW() - INTERVAL $m MONTH)");
  $db->query("DELETE l FROM lm_dossier_leads l JOIN lm_dossiers d ON d.id = l.dossier_id WHERE d.maj_le < (NOW() - INTERVAL $m MONTH)");
  $db->query("DELETE FROM lm_dossiers WHERE maj_le < (NOW() - INTERVAL $m MONTH)");
}

/* petites fonctions d'accès */
function lm_q(mysqli $db, string $sql, string $types = '', array $args = []): ?mysqli_stmt {
  $s = $db->prepare($sql);
  if (!$s) return null;
  if ($types !== '') $s->bind_param($types, ...$args);
  return $s->execute() ? $s : null;
}
function lm_ligne(mysqli $db, string $sql, string $types = '', array $args = []): ?array {
  $s = lm_q($db, $sql, $types, $args); if (!$s) return null;
  $r = $s->get_result(); if (!$r) return null;
  $l = $r->fetch_assoc(); return $l ?: null;
}
function lm_lignes(mysqli $db, string $sql, string $types = '', array $args = []): array {
  $s = lm_q($db, $sql, $types, $args); if (!$s) return [];
  $r = $s->get_result(); return $r ? $r->fetch_all(MYSQLI_ASSOC) : [];
}
function lm_maintenant(): string { return date('Y-m-d H:i:s'); }
function lm_txt($v, int $n = 190): string { return mb_substr(trim(is_scalar($v) ? (string) $v : ''), 0, $n); }

/* ---------------- jours ouvrés (week-ends et jours fériés français) ---------------- */
function lm_paques(int $a): DateTimeImmutable {
  $b = intdiv($a, 100); $c = $a % 100; $d = intdiv($b, 4); $e = $b % 4; $f = intdiv($b + 8, 25); $g = intdiv($b - $f + 1, 3);
  $h = (19 * ($a % 19) + $b - $d - $g + 15) % 30; $i = intdiv($c, 4); $k = $c % 4; $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
  $m = intdiv(($a % 19) + 11 * $h + 22 * $l, 451); $mois = intdiv($h + $l - 7 * $m + 114, 31); $jour = (($h + $l - 7 * $m + 114) % 31) + 1;
  return new DateTimeImmutable(sprintf('%04d-%02d-%02d', $a, $mois, $jour));
}
function lm_ferie(DateTimeImmutable $d): bool {
  static $cache = [];
  $a = (int) $d->format('Y');
  if (!isset($cache[$a])) {
    $p = lm_paques($a);
    $cache[$a] = array_merge(["$a-01-01", "$a-05-01", "$a-05-08", "$a-07-14", "$a-08-15", "$a-11-01", "$a-11-11", "$a-12-25"],
      [$p->modify('+1 day')->format('Y-m-d'), $p->modify('+39 days')->format('Y-m-d'), $p->modify('+50 days')->format('Y-m-d')]);
  }
  return in_array($d->format('Y-m-d'), $cache[$a], true);
}
function lm_ouvre(DateTimeImmutable $d): bool { return (int) $d->format('N') <= 5 && !lm_ferie($d); }
/* N jours ouvrés plus tard (24 h ouvrées = 1 jour ouvré) ; un dépôt hors jour ouvré part du jour ouvré suivant à 9 h */
function lm_plus_ouvres(string $depuis, int $jours): string {
  $d = new DateTimeImmutable($depuis);
  if (!lm_ouvre($d)) { do { $d = $d->modify('+1 day'); } while (!lm_ouvre($d)); $d = $d->setTime(9, 0); }
  for ($i = 0; $i < $jours; $i++) { do { $d = $d->modify('+1 day'); } while (!lm_ouvre($d)); }
  return $d->format('Y-m-d H:i:s');
}
function lm_plus_jours(string $depuis, int $jours, int $heure = 9): string {
  return (new DateTimeImmutable($depuis))->modify("+$jours day")->setTime($heure, 0)->format('Y-m-d H:i:s');
}
/* échéance de traitement selon le niveau ; rappel demandé = promesse de 24 h ouvrées affichée au dirigeant */
function lm_echeance(string $niveau, string $depuis, bool $rappel): string {
  if ($rappel && $niveau !== 'abandonniste') return lm_plus_ouvres($depuis, 1);
  if ($niveau === 'abandonniste') return lm_plus_jours($depuis, 7, 18);
  return lm_plus_ouvres($depuis, LM_NIVEAUX[$niveau]['jours']);
}
function lm_niveau_rang(string $n): int { return isset(LM_NIVEAUX[$n]) ? 4 - LM_NIVEAUX[$n]['prio'] : 0; }

/* ---------------- adresse du site (liens dans les e-mails) ---------------- */
function lm_url(string $chemin): string {
  $base = LM_SITE_URL;
  if ($base === '' && !empty($_SERVER['HTTP_HOST'])) {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $dir = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
    $base = ($https ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . $dir;
  }
  return rtrim($base, '/') . '/' . ltrim($chemin, '/');
}

/* ---------------- journal et e-mails ---------------- */
function lm_journal(mysqli $db, int $dossier, string $action, string $detail, ?array $user = null): void {
  $uid = $user['id'] ?? null; $act = $user ? ($user['nom'] . ' · ' . (LM_ROLES[$user['role']] ?? $user['role'])) : 'Portail (automatique)';
  lm_q($db, 'INSERT INTO lm_journal (dossier_id, cree_le, user_id, acteur, action, detail) VALUES (?, NOW(), ?, ?, ?, ?)', 'iisss', [$dossier, $uid, $act, $action, $detail]);
}
function lm_email(mysqli $db, ?int $dossier, string $modele, string $a, string $objet, string $corps): string {
  $a = trim($a);
  if ($a === '' || !filter_var($a, FILTER_VALIDATE_EMAIL)) $a = '';
  $reel = LM_EMAIL_REDIRECTION !== '' ? LM_EMAIL_REDIRECTION : $a;
  $statut = 'journal';
  if (LM_EMAIL_ENVOI && $reel !== '' && function_exists('mail')) {
    $entetes = "From: " . LM_EMAIL_FROM . "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
    $txt = LM_EMAIL_REDIRECTION !== '' ? "[Prototype — destinataire prévu : " . ($a ?: 'non renseigné') . "]\n\n" . $corps : $corps;
    $statut = @mail($reel, mb_encode_mimeheader($objet, 'UTF-8'), $txt, $entetes) ? 'envoye' : 'echec';
  }
  if ($a === '' && $statut === 'journal') $statut = 'sans_adresse';
  lm_q($db, 'INSERT INTO lm_emails (dossier_id, cree_le, modele, destinataire, envoye_a, objet, corps, statut, envoye_le) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, IF(?=\'envoye\', NOW(), NULL))',
    'isssssss', [$dossier, $modele, $a, $statut === 'envoye' ? $reel : null, $objet, $corps, $statut, $statut]);
  return $statut;
}

/* ---------------- Caisses régionales, experts, base clients ---------------- */
function lm_departement(string $cp, string $dep = ''): string {
  /* le code postal d'abord : il distingue la Corse (2A / 2B) et les DOM (971…976) */
  $cp = preg_replace('/\D/', '', $cp);
  if (strlen($cp) === 5) {
    if (str_starts_with($cp, '97')) return substr($cp, 0, 3);
    if (str_starts_with($cp, '20')) return ((int) $cp < 20200) ? '2A' : '2B';
    return substr($cp, 0, 2);
  }
  $dep = strtoupper(trim($dep));
  return (preg_match('/^(\d{2}|2[AB]|97\d)$/', $dep) && $dep !== '20' && $dep !== '97') ? $dep : '';
}
function lm_cr_du_departement(mysqli $db, string $dep): ?array {
  if ($dep === '') return null;
  foreach (lm_lignes($db, 'SELECT * FROM lm_cr WHERE actif = 1') as $cr) {
    $l = array_map('trim', explode(',', (string) $cr['departements']));
    if (in_array($dep, $l, true)) return $cr;
  }
  return null;
}
function lm_cr(mysqli $db, ?string $code): ?array { return $code ? lm_ligne($db, 'SELECT * FROM lm_cr WHERE code = ?', 's', [$code]) : null; }
function lm_expert_referent(mysqli $db, string $cr): ?array {
  return lm_ligne($db, "SELECT id, nom, email FROM lm_users WHERE role = 'expert' AND actif = 1 AND cr_code = ? ORDER BY referent DESC, id LIMIT 1", 's', [$cr]);
}
function lm_user(mysqli $db, ?int $id): ?array { return $id ? lm_ligne($db, 'SELECT id, login, nom, email, role, cr_code, filiale, referent, actif FROM lm_users WHERE id = ?', 'i', [$id]) : null; }
function lm_marche(?int $effectif, ?int $ca): string {
  if ($effectif === null && $ca === null) return 'a_qualifier';
  if (($effectif !== null && $effectif < LM_SEUIL_PRO_EFFECTIF) || ($ca !== null && $ca > 0 && $ca < LM_SEUIL_PRO_CA)) return 'pro';
  return 'entreprise';
}
const LM_MARCHES = ['pro' => 'Pro / entrepreneur', 'entreprise' => 'Entreprise', 'a_qualifier' => 'À qualifier'];

/* ---------------- lecture d'un lead du portail ---------------- */
function lm_lire_lead(array $l): array {
  $j = json_decode((string) ($l['donnees'] ?? ''), true); if (!is_array($j)) $j = [];
  $e = is_array($j['entreprise'] ?? null) ? $j['entreprise'] : (is_array($j['company'] ?? null) ? $j['company'] : []);
  $c = is_array($j['contact'] ?? null) ? $j['contact'] : [];
  $sol = [];
  foreach ((array) ($j['panier'] ?? []) as $p) if (is_array($p) && is_string($p['solution'] ?? null) && isset(LM_SOLUTIONS[$p['solution']])) $sol[] = $p['solution'];
  foreach ((array) ($j['solutions'] ?? []) as $p) if (is_string($p) && isset(LM_SOLUTIONS[$p])) $sol[] = $p;
  $sol = array_values(array_unique($sol));
  $decl = strtolower(lm_txt($e['client_declare'] ?? ($e['source_donnees']['client_declare'] ?? ($c['client_declare'] ?? '')), 8));
  $ca = isset($e['chiffre_affaires']) && is_numeric($e['chiffre_affaires']) ? (int) $e['chiffre_affaires'] : null;
  /* résultat de la simulation ou du label, pour la relance */
  $res = [];
  if (isset($j['fiscalGain']['total'])) $res[] = 'Gain fiscal estimé : ' . number_format((int) $j['fiscalGain']['total'], 0, ',', ' ') . ' € / an';
  if (isset($j['labelBrh']['score'])) $res[] = 'Score Label BRH : ' . (int) $j['labelBrh']['score'] . '/100' . (!empty($j['labelBrh']['level']) ? ' (' . lm_txt($j['labelBrh']['level'], 40) . ')' : '');
  if (isset($j['estimation_totale'])) $res[] = 'Estimation du devis : ' . number_format((int) $j['estimation_totale'], 0, ',', ' ') . ' € / an';
  $pr = is_array($j['priorities'] ?? null) ? $j['priorities'] : [];
  $LP = ['partageValeur' => 'partage de la valeur', 'protection' => 'protection sociale', 'retraite' => 'retraite', 'pouvoirAchat' => 'pouvoir d’achat'];
  $prios = []; foreach ($LP as $k => $lib) if ((int) ($pr[$k] ?? 0) >= 3) $prios[] = $lib;
  if ($prios) $res[] = 'Priorités : ' . implode(', ', $prios);
  return ['solutions' => $sol, 'client_declare' => in_array($decl, ['oui', 'non', 'nsp'], true) ? $decl : null, 'ca' => $ca,
          'conventions' => (array) ($e['source_donnees']['conventions'] ?? []), 'resultat' => implode("\n", $res),
          'rh' => is_array($j['rh'] ?? null) ? $j['rh'] : [], 'panier' => (array) ($j['panier'] ?? []), 'brut' => $j];
}

/* volets filiales à partir des solutions choisies (Worklife : devis envoyé par e-mail dès le dépôt du devis) */
function lm_volets(array $sol, array $existants, string $niveau): array {
  $v = $existants;
  foreach (LM_FILIALES as $f => $def) {
    if (isset($v[$f]) && $f === 'worklife' && $niveau === 'ultra_chaud' && ($v[$f]['statut'] ?? '') === 'a_qualifier') {
      $v[$f] = ['statut' => 'propose', 'maj' => lm_maintenant(), 'note' => 'Devis Worklife envoyé par e-mail au dirigeant']; continue; }
    if (isset($v[$f]) || !array_intersect($def['solutions'], $sol)) continue;
    $v[$f] = ['statut' => ($f === 'worklife' && $niveau === 'ultra_chaud') ? 'propose' : 'a_qualifier', 'maj' => lm_maintenant(),
              'note' => ($f === 'worklife' && $niveau === 'ultra_chaud') ? 'Devis Worklife envoyé par e-mail au dirigeant' : ''];
  }
  return $v;
}
function lm_synthese(array $d, array $lu): string {
  $p = [];
  $p[] = trim(($d['secteur'] ? $d['secteur'] . ', ' : '') . ($d['effectif'] ? $d['effectif'] . ' salariés' : 'effectif non renseigné') . ($d['ville'] ? ', ' . $d['ville'] : ''));
  if ($d['idcc']) $p[] = 'convention ' . $d['idcc'];
  if ($lu['solutions']) $p[] = 'panier : ' . implode(', ', array_map(static fn($s) => LM_SOLUTIONS[$s], $lu['solutions']));
  foreach ($lu['panier'] as $x) if (is_array($x) && !empty($x['formule'])) $p[] = (LM_SOLUTIONS[$x['solution'] ?? ''] ?? '') . ' (formule ' . lm_txt($x['formule'], 40) . ')';
  if ($lu['resultat'] !== '') $p[] = str_replace("\n", ' ; ', $lu['resultat']);
  return mb_substr(implode(' ; ', array_filter($p)), 0, 1500);
}

/* ---------------- intégration d'un lead dans un dossier ---------------- */
/* idempotent : appelé par lead.php juste après l'enregistrement, et en rattrapage par lm-cron.php */
function lm_integrer(mysqli $db, int $leadId): ?int {
  $deja = lm_ligne($db, 'SELECT dossier_id FROM lm_dossier_leads WHERE lead_id = ?', 'i', [$leadId]);
  if ($deja) return (int) $deja['dossier_id'];
  $l = lm_ligne($db, 'SELECT * FROM leads WHERE id = ?', 'i', [$leadId]);
  if (!$l || !in_array($l['version'], LM_VERSIONS, true)) return null;
  $niveau = array_key_exists((string) $l['type'], LM_TYPE_NIVEAU) ? LM_TYPE_NIVEAU[$l['type']] : 'chaud';
  if ($niveau === null) return null;   // inscription newsletter : pas un lead commercial
  $lu = lm_lire_lead($l);
  $email = strtolower(trim((string) $l['email'])); $siret = preg_replace('/\D/', '', (string) $l['siret']);
  $cle = $email !== '' ? 'm:' . $email : ($siret !== '' ? 's:' . substr($siret, 0, 9) : 't:' . preg_replace('/\D/', '', (string) $l['telephone']));
  $maintenant = lm_maintenant(); $rappel = (int) $l['rappel_expert'] === 1;
  $d = lm_ligne($db, "SELECT * FROM lm_dossiers WHERE cle = ? AND statut <> 'cloture' AND version = ? AND maj_le >= (NOW() - INTERVAL " . LM_FUSION_JOURS . " DAY) ORDER BY id DESC LIMIT 1",
    'ss', [$cle, $l['version']]);
  $dep = lm_departement((string) $l['code_postal'], (string) $l['departement']);

  if (!$d) {
    /* ---- nouveau dossier ---- */
    $jeton = bin2hex(random_bytes(16));
    $vol = json_encode(lm_volets($lu['solutions'], [], $niveau), JSON_UNESCAPED_UNICODE);
    $base = ['secteur' => (string) $l['secteur'], 'effectif' => (int) $l['effectif'] ?: null, 'ville' => (string) $l['ville'], 'idcc' => (string) $l['idcc']];
    $syn = lm_synthese($base, $lu); $ech = lm_echeance($niveau, $maintenant, $rappel);
    $rel = $niveau === 'abandonniste' ? lm_plus_jours($maintenant, 1, 10) : ($niveau === 'chaud' && $l['type'] === 'devis_en_cours' ? date('Y-m-d H:i:s', time() + 2 * 3600) : null);
    $eff = (int) $l['effectif'] ?: null; $sol = implode(',', $lu['solutions']); $mt = ($l['montant_estime'] !== null && $l['type'] === 'devis') ? (int) $l['montant_estime'] : null;
    $s = lm_q($db, 'INSERT INTO lm_dossiers (cree_le, maj_le, version, cle, email, prenom, nom, telephone, fonction, raison_sociale, siret, code_postal, ville, departement,
        effectif, ca, secteur, idcc, niveau, niveau_le, rappel_demande, statut, statut_le, client_declare, echeance, prochaine_relance, montant, solutions, volets, synthese, resultat,
        origine, dernier_type, dernier_lead_id, jeton)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'depose\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      'ssssssssssssssiissssissssissssssis',
      [$maintenant, $maintenant, $l['version'], $cle, $email, $l['prenom'], $l['nom'], $l['telephone'], $l['fonction'], $l['raison_sociale'], $siret, $l['code_postal'], $l['ville'], $dep,
       $eff, $lu['ca'], $l['secteur'], $l['idcc'], $niveau, $maintenant, (int) $rappel, $maintenant, $lu['client_declare'], $ech, $rel, $mt, $sol, $vol, $syn, $lu['resultat'],
       $l['type'], $l['type'], $leadId, $jeton]);
    if (!$s) return null;
    $id = (int) $db->insert_id;
    $ref = 'BRH-' . date('y') . '-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    lm_q($db, 'UPDATE lm_dossiers SET reference = ?, jalons = ? WHERE id = ?', 'ssi', [$ref, json_encode(['depose' => $maintenant]), $id]);
    lm_q($db, 'INSERT INTO lm_dossier_leads (lead_id, dossier_id, type, niveau, cree_le) VALUES (?, ?, ?, ?, NOW())', 'iiss', [$leadId, $id, $l['type'], $niveau]);
    lm_journal($db, $id, 'creation', 'Dossier ' . $ref . ' créé : ' . (BRH_LEAD_TYPES[$l['type']] ?? $l['type']) . ' — lead ' . LM_NIVEAUX[$niveau]['lib'] . ' (' . LM_NIVEAUX[$niveau]['delai'] . ')'
      . ($niveau === 'abandonniste' && $eff !== null && $eff >= LM_SEUIL_APPEL_ABANDON ? ' — ' . $eff . ' salariés : appel conseillé en plus des relances' : ''));
    lm_router($db, $id);
    lm_emails_depot($db, $id);
    return $id;
  }

  /* ---- lead suivant du même dirigeant : fusion, le niveau ne fait que monter ---- */
  $id = (int) $d['id']; $monte = lm_niveau_rang($niveau) > lm_niveau_rang((string) $d['niveau']);
  lm_q($db, 'INSERT INTO lm_dossier_leads (lead_id, dossier_id, type, niveau, cree_le) VALUES (?, ?, ?, ?, NOW())', 'iiss', [$leadId, $id, $l['type'], $niveau]);
  $maj = ['maj_le' => $maintenant, 'dernier_type' => $l['type'], 'dernier_lead_id' => $leadId];
  foreach (['prenom', 'nom', 'telephone', 'fonction', 'raison_sociale', 'code_postal', 'ville', 'secteur', 'idcc'] as $k) if (trim((string) $l[$k]) !== '') $maj[$k] = (string) $l[$k];
  if ($siret !== '') $maj['siret'] = $siret;
  if ((int) $l['effectif'] > 0) $maj['effectif'] = (int) $l['effectif'];
  if ($dep !== '') $maj['departement'] = $dep;
  if ($lu['client_declare']) $maj['client_declare'] = $lu['client_declare'];
  if ($lu['ca'] !== null) $maj['ca'] = $lu['ca'];
  if ($l['montant_estime'] !== null && $l['type'] === 'devis') $maj['montant'] = (int) $l['montant_estime'];
  if ($lu['resultat'] !== '') $maj['resultat'] = $lu['resultat'];
  $sol = array_values(array_unique(array_merge(array_filter(explode(',', (string) $d['solutions'])), $lu['solutions'])));
  $maj['solutions'] = implode(',', $sol);
  $vol = json_decode((string) $d['volets'], true) ?: [];
  $maj['volets'] = json_encode(lm_volets($sol, $vol, $monte ? $niveau : (string) $d['niveau']), JSON_UNESCAPED_UNICODE);
  if ($rappel) $maj['rappel_demande'] = 1;
  if ($rappel && !$monte && (int) $d['rappel_demande'] !== 1 && $d['niveau'] !== 'abandonniste') { $maj['echeance'] = lm_echeance((string) $d['niveau'], $maintenant, true); $maj['alerte_sla_le'] = null; }
  if ($monte) {
    $maj['niveau'] = $niveau; $maj['niveau_le'] = $maintenant;
    $maj['echeance'] = lm_echeance($niveau, $maintenant, $rappel || (int) $d['rappel_demande'] === 1);
    $maj['alerte_sla_le'] = null;
    $maj['prochaine_relance'] = $niveau === 'chaud' && $l['type'] === 'devis_en_cours' ? date('Y-m-d H:i:s', time() + 2 * 3600) : null;
  }
  $fusion = array_merge($d, $maj);
  $maj['synthese'] = lm_synthese(['secteur' => (string) $fusion['secteur'], 'effectif' => $fusion['effectif'] ? (int) $fusion['effectif'] : null, 'ville' => (string) $fusion['ville'], 'idcc' => (string) $fusion['idcc']],
                                 array_merge($lu, ['solutions' => $sol, 'resultat' => (string) ($fusion['resultat'] ?? '')]));
  lm_maj($db, $id, $maj);
  lm_journal($db, $id, 'fusion', (BRH_LEAD_TYPES[$l['type']] ?? $l['type']) . ' rattaché au dossier' . ($monte ? ' — niveau relevé : ' . LM_NIVEAUX[$d['niveau']]['lib'] . ' → ' . LM_NIVEAUX[$niveau]['lib'] . ' (' . LM_NIVEAUX[$niveau]['delai'] . ')' : ''));
  if ($monte) {
    if (!$d['cr_code'] || ($dep !== '' && $dep !== $d['departement'] && $d['statut'] === 'depose')) lm_router($db, $id);
    lm_emails_depot($db, $id);
    $d2 = lm_dossier($db, $id);
    if ($d2 && $d2['user_id'] && $niveau === 'ultra_chaud') {
      $u = lm_user($db, (int) $d2['user_id']);
      if ($u) lm_email($db, $id, 'interne_ultra', (string) $u['email'], 'Dossier ' . $d2['reference'] . ' passé ultra-chaud — rappel sous 24 h ouvrées',
        "Bonjour,\n\nLe dirigeant de " . ($d2['raison_sociale'] ?: 'l’entreprise') . " a terminé son devis : le dossier " . $d2['reference'] . " est ultra-chaud.\nÀ rappeler avant le " . lm_date_fr((string) $d2['echeance']) . ".\n\nOuvrir le dossier : " . lm_url('cockpit-brh.html#d=' . $id) . "\n");
    }
  }
  return $id;
}
function lm_maj(mysqli $db, int $id, array $champs): void {
  if (!$champs) return;
  /* jalons : date de premier passage à chaque statut (frise du suivi dirigeant) */
  if (isset($champs['statut']) && isset(LM_STATUTS[$champs['statut']])) {
    $r = lm_ligne($db, 'SELECT jalons FROM lm_dossiers WHERE id = ?', 'i', [$id]);
    $j = json_decode((string) ($r['jalons'] ?? ''), true) ?: [];
    if (empty($j[$champs['statut']])) $j[$champs['statut']] = lm_maintenant();
    $champs['jalons'] = json_encode($j);
  }
  $set = []; $types = ''; $args = [];
  foreach ($champs as $k => $v) {
    if (!preg_match('/^[a-z_]+$/', (string) $k)) continue;
    $set[] = "`$k` = ?"; $types .= is_int($v) ? 'i' : 's'; $args[] = $v;
  }
  $types .= 'i'; $args[] = $id;
  lm_q($db, 'UPDATE lm_dossiers SET ' . implode(', ', $set) . ' WHERE id = ?', $types, $args);
}
function lm_dossier(mysqli $db, int $id): ?array { return lm_ligne($db, 'SELECT * FROM lm_dossiers WHERE id = ?', 'i', [$id]); }
function lm_date_fr(string $dt): string { if ($dt === '') return ''; $t = strtotime($dt); return $t ? date('d/m/Y à H\hi', $t) : $dt; }

/* ---------------- routage : scénario A (département) ou B simulé (SIRET) ---------------- */
function lm_router(mysqli $db, int $id, ?array $par = null): void {
  $d = lm_dossier($db, $id); if (!$d) return;
  $cr = lm_cr_du_departement($db, (string) $d['departement']);
  $maj = ['scenario' => 'A', 'marche' => lm_marche($d['effectif'] !== null ? (int) $d['effectif'] : null, $d['ca'] !== null ? (int) $d['ca'] : null)];
  $client = null; $siren = substr((string) $d['siret'], 0, 9);
  /* ---- scénario B simulé : rapprochement SIRET ↔ base clients centralisée (démonstration) ---- */
  if (LM_SCENARIO_B && strlen($siren) === 9) {
    $crB = $cr && $cr['scenario'] === 'B';
    $client = lm_ligne($db, 'SELECT * FROM lm_clients WHERE siren = ?', 's', [$siren]);
    if ($client) { $crClient = lm_cr($db, (string) $client['cr_code']); if ($crClient && $crClient['scenario'] === 'B') $crB = true; else if (!$crB) $client = null; }
    if ($crB && $client) {
      $crClient = lm_cr($db, (string) $client['cr_code']) ?: $cr;
      $marche = $client['marche'] === 'pro' ? 'pro' : 'entreprise';
      $dest = $marche === 'pro' ? ($client['conseiller'] ? 'conseiller_pro' : 'expert_brh_pro') : 'expert_brh';
      $maj = array_merge($maj, ['scenario' => 'B', 'client_statut' => 'verifie', 'cr_code' => $crClient['code'] ?? $client['cr_code'], 'marche' => $marche,
        'destinataire' => $dest, 'canal' => 'crm', 'portefeuille' => mb_substr(trim(($client['portefeuille'] ?: '') . ($client['conseiller'] ? ' · ' . $client['conseiller'] : ''), ' ·'), 0, 190),
        'conseiller_pro' => $dest === 'conseiller_pro' ? $client['conseiller'] : null]);
      $exp = lm_expert_referent($db, (string) $maj['cr_code']);
      $maj['user_id'] = $exp ? (int) $exp['id'] : null; $maj['statut'] = $exp ? 'attribue' : 'depose'; $maj['statut_le'] = lm_maintenant();
      lm_maj($db, $id, lm_sans_recul($d, $maj));
      $crm = $marche === 'pro' ? 'CRM PART/PRO' : 'CRM ENTREPRISE';
      lm_journal($db, $id, 'routage', 'Scénario B (simulé) : SIRET rapproché de la base clients — client vérifié, ' . ($crClient['nom'] ?? $client['cr_code']) . ', ' . LM_MARCHES[$marche]
        . ($maj['portefeuille'] ? ' (' . $maj['portefeuille'] . ')' : '') . '. Lead poussé dans le ' . $crm . ', alerte PUC « un lead est arrivé » → ' . LM_DESTINATAIRES[$dest] . '.', $par);
      $a = $dest === 'conseiller_pro' ? (string) $client['conseiller_email'] : (string) ($exp['email'] ?? '');
      lm_email($db, $id, 'interne_crm', $a, '[' . $crm . ' · alerte PUC] Un lead est arrivé : ' . ($d['raison_sociale'] ?: $d['reference']),
        lm_resume_interne($db, lm_dossier($db, $id) ?? $d) . "\n(Scénario B simulé : dans la cible, le lead est créé dans le " . $crm . " et l'alerte s'affiche dans le PUC.)\n");
      return;
    }
  }
  /* ---- scénario A : département → CR → expert BRH ---- */
  $decl = (string) ($d['client_declare'] ?? '');
  $maj['client_statut'] = $decl === 'oui' ? 'declare' : ($decl === 'non' ? 'prospect' : 'inconnu');
  if (!$cr) {
    $maj = array_merge($maj, ['cr_code' => null, 'destinataire' => 'national', 'canal' => 'cockpit', 'user_id' => null, 'statut' => 'depose', 'statut_le' => lm_maintenant()]);
    lm_maj($db, $id, lm_sans_recul($d, $maj));
    lm_journal($db, $id, 'routage', 'Scénario A : ' . ($d['departement'] ? 'département ' . $d['departement'] . ' absent de la table des CR' : 'département inconnu') . ' — dossier placé dans la file nationale, à attribuer.', $par);
    return;
  }
  $exp = lm_expert_referent($db, (string) $cr['code']);
  $maj = array_merge($maj, ['cr_code' => $cr['code'], 'destinataire' => 'expert_brh', 'canal' => $cr['canal'] === 'solead' ? 'solead' : 'cockpit',
                            'user_id' => $exp ? (int) $exp['id'] : null, 'statut' => $exp ? 'attribue' : 'depose', 'statut_le' => lm_maintenant()]);
  lm_maj($db, $id, lm_sans_recul($d, $maj));
  lm_journal($db, $id, 'routage', 'Scénario A : département ' . $d['departement'] . ' → ' . $cr['nom'] . ' → ' . ($exp ? 'expert BRH ' . $exp['nom'] : 'experts BRH de la CR (pas de référent)')
    . ' via ' . LM_CANAUX[$maj['canal']] . ($maj['marche'] === 'pro' ? ' — pro / entrepreneur : à confier au conseiller pro' : '') . ($client === null && strlen($siren) === 9 && $cr['scenario'] === 'B' ? ' (SIRET non trouvé : prospect, routage par département)' : '') . '.', $par);
  $dd = lm_dossier($db, $id) ?? $d;
  if ($maj['canal'] === 'solead') {
    lm_email($db, $id, 'interne_solead', (string) ($cr['solead_email'] ?? ''), '[SOLEAD] Lead ' . LM_NIVEAUX[$dd['niveau']]['lib'] . ' ' . $dd['reference'] . ' — ' . ($dd['raison_sociale'] ?: 'entreprise non renseignée'),
      lm_resume_interne($db, $dd));
  } else {
    lm_email($db, $id, 'interne_nouveau', (string) ($exp['email'] ?? ''), 'Cockpit BRH : un lead ' . strtolower(LM_NIVEAUX[$dd['niveau']]['lib']) . ' est arrivé — ' . ($dd['raison_sociale'] ?: $dd['reference']),
      lm_resume_interne($db, $dd));
  }
}
/* un nouveau routage ne fait jamais reculer un dossier déjà pris en charge, ni ne change son expert */
function lm_sans_recul(array $d, array $maj): array {
  if (in_array($d['statut'], ['pris_en_charge', 'qualifie', 'propose', 'cloture'], true)) { unset($maj['statut'], $maj['statut_le']); if ($d['user_id']) unset($maj['user_id']); }
  return $maj;
}
function lm_resume_interne(mysqli $db, array $d): string {
  $cr = lm_cr($db, $d['cr_code'] ?? null);
  return "Dossier " . $d['reference'] . " · lead " . LM_NIVEAUX[$d['niveau']]['lib'] . " (" . LM_NIVEAUX[$d['niveau']]['delai'] . ", échéance " . lm_date_fr((string) $d['echeance']) . ")\n"
    . "Entreprise : " . ($d['raison_sociale'] ?: '—') . ($d['siret'] ? " · SIRET " . $d['siret'] : '') . " · " . trim($d['code_postal'] . ' ' . $d['ville']) . "\n"
    . "Effectif : " . ($d['effectif'] ?: '—') . " · marché : " . (LM_MARCHES[$d['marche'] ?? ''] ?? '—') . " · " . (LM_CLIENT[$d['client_statut']] ?? '') . "\n"
    . "Contact : " . trim($d['prenom'] . ' ' . $d['nom']) . ($d['fonction'] ? ' (' . $d['fonction'] . ')' : '') . " · " . ($d['telephone'] ?: 'tél. non renseigné') . " · " . $d['email'] . "\n"
    . "Synthèse : " . ($d['synthese'] ?: '—') . "\n" . ($cr ? "Caisse régionale : " . $cr['nom'] . "\n" : '')
    . "\nOuvrir le dossier dans le cockpit BRH : " . lm_url('cockpit-brh.html#d=' . $d['id']) . "\n";
}

/* ---------------- e-mails au dirigeant ---------------- */
function lm_lien_suivi(array $d): string { return lm_url('suivi-dossier.html?d=' . rawurlencode((string) $d['reference']) . '&j=' . $d['jeton']); }
function lm_signature(): string { return "\n\nBanque des Ressources Humaines — Crédit Agricole\nMessage automatique, merci de ne pas y répondre."; }
function lm_bonjour(array $d): string { return 'Bonjour' . ($d['prenom'] ? ' ' . $d['prenom'] : '') . ",\n\n"; }
/* au dépôt (ou quand le niveau monte) : message du niveau */
function lm_emails_depot(mysqli $db, int $id): void {
  $d = lm_dossier($db, $id); if (!$d || !$d['email']) return;
  if ($d['niveau'] === 'ultra_chaud') {
    $cr = lm_cr($db, $d['cr_code']);
    lm_email($db, $id, 'dirigeant_ultra', (string) $d['email'], 'Votre demande ' . $d['reference'] . ' : votre expert vous rappelle pour finaliser',
      lm_bonjour($d) . "Votre demande de devis est bien reçue (référence " . $d['reference'] . ").\nVotre expert Banque des Ressources Humaines" . ($cr ? " du Crédit Agricole " . $cr['nom'] : '') . " vous rappelle pour finaliser votre devis, avec votre dossier sous les yeux : vous n’aurez rien à ressaisir.\n\nSuivre votre dossier : " . lm_lien_suivi($d) . lm_signature());
  }
}
function lm_email_relance(mysqli $db, array $d, int $n): string {
  $page = $d['origine'] === 'label_resultats' ? 'label-brh.html' : (str_starts_with((string) $d['origine'], 'devis') ? 'devis.html' : 'diagnostic.html');
  $quoi = $page === 'label-brh.html' ? 'votre diagnostic Label RH' : 'votre simulation';
  return lm_email($db, (int) $d['id'], 'dirigeant_abandon_j' . ($n === 1 ? '1' : '7'), (string) $d['email'],
    ($n === 1 ? 'Retrouvez le résultat de ' : 'Votre résultat vous attend : ') . $quoi,
    lm_bonjour($d) . ($n === 1 ? "Merci d’avoir réalisé " . $quoi . " sur le portail Banque des Ressources Humaines.\n" : "Il y a une semaine, vous avez réalisé " . $quoi . ".\n")
    . ($d['resultat'] ? "\nVotre résultat :\n" . $d['resultat'] . "\n" : '')
    . "\nReprendre là où vous vous étiez arrêté : " . lm_url($page) . "\nObtenir votre devis en ligne : " . lm_url('devis.html')
    . "\nÊtre rappelé par un expert : répondez à cette question depuis votre suivi : " . lm_lien_suivi($d)
    . "\n\nVous ne souhaitez plus recevoir ces messages ? " . lm_lien_suivi($d) . "&stop=1" . lm_signature());
}
function lm_email_reprise(mysqli $db, array $d): string {
  return lm_email($db, (int) $d['id'], 'dirigeant_chaud', (string) $d['email'], 'Reprenez votre devis là où vous l’avez laissé',
    lm_bonjour($d) . "Vous avez commencé un devis sur le portail Banque des Ressources Humaines" . ($d['raison_sociale'] ? " pour " . $d['raison_sociale'] : '') . ".\n"
    . "Vos réponses sont conservées : reprenez votre devis là où vous l’avez laissé : " . lm_url('devis.html') . "\n"
    . "Un expert peut aussi vous aider à le terminer : il vous contacte dans les 48 heures ouvrées.\n\nSuivre votre dossier : " . lm_lien_suivi($d)
    . "\n\nVous ne souhaitez plus recevoir ces messages ? " . lm_lien_suivi($d) . "&stop=1" . lm_signature());
}
function lm_email_prise_en_charge(mysqli $db, array $d, array $u): string {
  $cr = lm_cr($db, $d['cr_code']);
  return lm_email($db, (int) $d['id'], 'dirigeant_prise_en_charge', (string) $d['email'], 'Votre demande ' . $d['reference'] . ' est prise en charge',
    lm_bonjour($d) . "Votre demande est prise en charge par " . $u['nom'] . ", expert Banque des Ressources Humaines" . ($cr ? " du Crédit Agricole " . $cr['nom'] : '') . ".\n"
    . "Votre expert vous contacte" . ($d['niveau'] === 'ultra_chaud' ? ' sous 24 heures ouvrées' : '') . " pour faire le point avec vous.\n\nSuivre votre dossier : " . lm_lien_suivi($d) . lm_signature());
}

/* ---------------- tâches planifiées (lm-cron.php, ou au passage dans la console) ---------------- */
function lm_taches(mysqli $db, bool $force = false): array {
  $m = lm_ligne($db, "SELECT v FROM lm_meta WHERE k = 'taches'");
  if (!$force && $m && (time() - (int) $m['v']) < 600) return ['ignore' => true];
  $verrou = lm_ligne($db, "SELECT GET_LOCK('brh_lm_taches', 0) ok");   /* une seule exécution à la fois (pas de relance en double) */
  if (!$verrou || (int) $verrou['ok'] !== 1) return ['ignore' => true, 'raison' => 'tâches déjà en cours'];
  $t = (string) time();
  lm_q($db, "INSERT INTO lm_meta (k, v) VALUES ('taches', ?) ON DUPLICATE KEY UPDATE v = VALUES(v)", 's', [$t]);
  lm_purger($db);
  $out = ['integres' => 0, 'relances' => 0, 'reprises' => 0, 'alertes' => 0];
  try { lm_taches_faire($db, $out); } finally { $db->query("SELECT RELEASE_LOCK('brh_lm_taches')"); }
  return $out;
}
function lm_taches_faire(mysqli $db, array &$out): void {
  /* 1. rattrapage : leads des versions suivies pas encore rattachés à un dossier (7 derniers jours) */
  $vs = implode(',', array_map(static fn($v) => "'" . preg_replace('/[^A-Z]/', '', $v) . "'", LM_VERSIONS));
  foreach (lm_lignes($db, "SELECT l.id FROM leads l LEFT JOIN lm_dossier_leads x ON x.lead_id = l.id WHERE x.lead_id IS NULL AND l.type <> 'newsletter' AND l.version IN ($vs) AND l.cree_le >= (NOW() - INTERVAL 7 DAY) AND l.cree_le < (NOW() - INTERVAL 2 MINUTE) ORDER BY l.id LIMIT 200") as $r) {
    try { if (lm_integrer($db, (int) $r['id'])) $out['integres']++; } catch (\Throwable $e) { error_log('lm_integrer ' . $r['id'] . ' : ' . $e->getMessage()); }
  }
  /* 2. relances programmées */
  foreach (lm_lignes($db, "SELECT * FROM lm_dossiers WHERE prochaine_relance IS NOT NULL AND prochaine_relance <= NOW() AND statut <> 'cloture' LIMIT 200") as $d) {
    $id = (int) $d['id'];
    if (!(int) $d['consent_relance'] || !$d['email']) { lm_maj($db, $id, ['prochaine_relance' => null]); continue; }
    if ($d['niveau'] === 'abandonniste') {
      $n = (int) $d['relances'] + 1;
      $st = lm_email_relance($db, $d, $n);
      lm_maj($db, $id, ['relances' => $n, 'prochaine_relance' => $n === 1 ? lm_plus_jours((string) $d['cree_le'], 7, 10) : null, 'maj_le' => lm_maintenant()]);
      lm_journal($db, $id, 'relance', 'Relance J+' . ($n === 1 ? '1' : '7') . ' « Retrouvez le résultat de votre simulation » (' . lm_statut_email($st) . ')');
      $out['relances']++;
    } elseif ($d['niveau'] === 'chaud' && $d['dernier_type'] === 'devis_en_cours') {
      $st = lm_email_reprise($db, $d);
      lm_maj($db, $id, ['prochaine_relance' => null, 'relances' => (int) $d['relances'] + 1]);
      lm_journal($db, $id, 'relance', 'E-mail de reprise « Reprenez votre devis là où vous l’avez laissé » (' . lm_statut_email($st) . ')');
      $out['reprises']++;
    } else lm_maj($db, $id, ['prochaine_relance' => null]);
  }
  /* 3. alertes de délai : dossiers chauds et ultra-chauds non pris en charge à l'échéance */
  foreach (lm_lignes($db, "SELECT * FROM lm_dossiers WHERE niveau IN ('ultra_chaud','chaud') AND statut IN ('depose','attribue') AND echeance IS NOT NULL AND echeance <= NOW() AND alerte_sla_le IS NULL LIMIT 200") as $d) {
    $u = lm_user($db, $d['user_id'] ? (int) $d['user_id'] : null);
    lm_email($db, (int) $d['id'], 'interne_alerte', (string) ($u['email'] ?? ''), 'Délai dépassé : dossier ' . $d['reference'] . ' (' . LM_NIVEAUX[$d['niveau']]['lib'] . ')',
      "Le dossier " . $d['reference'] . " n’a pas été pris en charge dans le délai cible (" . LM_NIVEAUX[$d['niveau']]['delai'] . ").\n\n" . lm_resume_interne($db, $d));
    lm_maj($db, (int) $d['id'], ['alerte_sla_le' => lm_maintenant()]);
    lm_journal($db, (int) $d['id'], 'alerte', 'Délai cible dépassé (' . LM_NIVEAUX[$d['niveau']]['delai'] . ') : alerte envoyée à ' . ($u['nom'] ?? 'la CR') . ' et signalée à la console nationale');
    $out['alertes']++;
  }
}
function lm_statut_email(string $s): string { return ['envoye' => 'envoyé', 'journal' => 'journalisé, envoi désactivé', 'echec' => 'échec d’envoi', 'sans_adresse' => 'sans adresse'][$s] ?? $s; }

/* ---------------- étape atteinte d'un devis en cours (lead.php, action « etape ») ---------------- */
function lm_etape(mysqli $db, int $leadId, string $etape): void {
  $x = lm_ligne($db, 'SELECT dossier_id FROM lm_dossier_leads WHERE lead_id = ?', 'i', [$leadId]);
  if (!$x) return;
  $id = (int) $x['dossier_id'];
  $der = lm_ligne($db, "SELECT detail FROM lm_journal WHERE dossier_id = ? AND action = 'etape' ORDER BY id DESC LIMIT 1", 'i', [$id]);
  $txt = 'Étape atteinte dans le devis : ' . $etape;
  if ($der && $der['detail'] === $txt) return;
  lm_journal($db, $id, 'etape', $txt);
  lm_maj($db, $id, ['maj_le' => lm_maintenant()]);
}

/* ---------------- droits ---------------- */
function lm_peut_voir(array $u, array $d): bool {
  if ($u['role'] === 'national') return true;
  if ($u['role'] === 'expert') return $d['cr_code'] !== null && $d['cr_code'] === $u['cr_code'];
  if ($u['role'] === 'filiale') { $v = json_decode((string) $d['volets'], true) ?: []; return isset($v[$u['filiale']]); }
  return false;
}
