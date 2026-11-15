<?php
/* Module LM 2.0 — 15/11/2026 · règles de gestion du lead management simplifié : tables lm2_*, 3 types de leads, annuaire pilote / démo, transferts, e-mails réels, IA, Universels · historique : VERSIONS.md */
/* ============================================================================
   lm2-base.php — CŒUR DU MODULE LEAD MANAGEMENT SIMPLIFIÉ (LM 2.0)
   Cahier des charges « Lead management simplifié » v0.3 du 15/11/2026, propositions par défaut Q1 à Q22 retenues.
     - Tables lm2_* créées automatiquement (les tables lm_* du module 1.x restent intactes) ;
     - 3 types de leads (qualifié, ultra-qualifié, demande de devis), un dossier par dirigeant (RG-01 à RG-07) ;
     - routage département → Caisse régionale → expert BRH (RG-10 à RG-12), statut client déclaratif puis vérifié (RG-13 à RG-16) ;
     - annuaire : 5 CR pilotes en données réelles, les autres en démonstration (RG-50 à RG-57) ;
     - transferts et accès ponctuels (RG-21 à RG-26), e-mails automatiques et envoi réel (RG-27, RG-28, RG-60 à RG-68) ;
     - IA (Mistral) pour le script d'appel et l'e-mail personnalisé, sans aucune donnée personnelle (RG-30 à RG-38) ;
     - suivi du dirigeant et espace Universels avec code SMS (RG-40 à RG-44).
   Ne s'exécute pas seul. Configuration : config.php (voir config.example.php).
   ============================================================================ */
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
require_once __DIR__ . '/lm-db.php';
require_once __DIR__ . '/lm2-referentiel.php';

/* ---------------- configuration (config.php ; valeurs par défaut ci-dessous) ---------------- */
if (!defined('LM_VERSIONS'))          define('LM_VERSIONS', ['S', 'A', 'B', 'C']);
if (!defined('LM_SITES'))             define('LM_SITES', []);
if (!defined('LM_SITE_URL'))          define('LM_SITE_URL', '');
if (!defined('LM_CRON_TOKEN'))        define('LM_CRON_TOKEN', '');
if (!defined('LM_TACHES_MINUTES'))    define('LM_TACHES_MINUTES', 10);
if (!defined('LM_RATTRAPAGE_JOURS'))  define('LM_RATTRAPAGE_JOURS', 7);
if (!defined('LM_FUSION_JOURS'))      define('LM_FUSION_JOURS', 60);
if (!defined('LM2_EMAIL_FROM'))       define('LM2_EMAIL_FROM', 'contact@monsitedetest.com');          // RG-61
if (!defined('LM2_EMAIL_NOM'))        define('LM2_EMAIL_NOM', 'Banque des RH – Lead management');
if (!defined('LM2_TEST_DIRIGEANTS'))  define('LM2_TEST_DIRIGEANTS', '');   // RG-62 : adresse de test des e-mails aux dirigeants
if (!defined('LM_SMTP_HOST'))         define('LM_SMTP_HOST', '');          // RG-66 : vide = fonction mail() de PHP
if (!defined('LM_SMTP_PORT'))         define('LM_SMTP_PORT', 587);
if (!defined('LM_SMTP_SECURE'))       define('LM_SMTP_SECURE', 'tls');     // 'tls' (STARTTLS, port 587) ou 'ssl' (port 465)
if (!defined('LM_SMTP_USER'))         define('LM_SMTP_USER', '');
if (!defined('LM_SMTP_PASS'))         define('LM_SMTP_PASS', '');
if (!defined('LM2_SMS_SIMULE'))       define('LM2_SMS_SIMULE', true);      // RG-43 : prototype, aucun SMS réel
if (!defined('LM2_UNIVERSELS_URL'))   define('LM2_UNIVERSELS_URL', '');    // vide = espace de démonstration du module
/* Q17 : domaines des adresses professionnelles du Crédit Agricole acceptées hors annuaire (et leurs sous-domaines), à compléter dans config.php */
if (!defined('LM2_DOMAINES_CA'))      define('LM2_DOMAINES_CA', ['credit-agricole.fr', 'credit-agricole.com', 'ca-tourainepoitou.fr', 'ca-pyrenees-gascogne.fr', 'ca-centreloire.fr', 'ca-franchecomte.fr', 'ca-paris.fr']);
if (!defined('MISTRAL_API_KEY'))      define('MISTRAL_API_KEY', '');
if (!defined('MISTRAL_MODEL'))        define('MISTRAL_MODEL', 'mistral-small-latest');

/* ---------------- référentiels (mêmes valeurs que lm2-regles.js) ---------------- */
const LM2_TYPES = ['devis' => ['lib' => 'Demande de devis', 'prio' => 1], 'ultra' => ['lib' => 'Ultra-qualifié', 'prio' => 2], 'qualifie' => ['lib' => 'Qualifié', 'prio' => 3]];
const LM2_RANG = ['qualifie' => 1, 'ultra' => 2, 'devis' => 3];
/* type de demande envoyé par les sites → [type de lead, rappel demandé] ; absent = pas un lead (RG-07) */
const LM2_TYPE_DEMANDE = [
  'devis' => ['devis', false], 'devis_en_cours' => ['ultra', false],
  'diagnostic_estimation' => ['qualifie', false], 'label_resultats' => ['qualifie', false],
  'diagnostic_contact' => ['qualifie', true], 'label_contact' => ['qualifie', true], 'audit_mutuelle_prevoyance' => ['qualifie', true],
  'rappel_expert' => ['qualifie', true], 'contact' => ['qualifie', true],
];
const LM2_STATUTS = ['nouveau' => 'Nouveau', 'pris_en_charge' => 'Pris en charge', 'transfere' => 'Transféré', 'proposition' => 'Proposition', 'cloture' => 'Clôturé'];
const LM2_ISSUES = ['signe' => 'Signé', 'perdu' => 'Perdu', 'sans_suite' => 'Sans suite', 'injoignable' => 'Injoignable', 'doublon' => 'Doublon'];
const LM2_CLIENT = ['declare' => 'Client déclaré, à vérifier', 'non_declare' => 'Non client déclaré, à vérifier', 'inconnu' => 'À vérifier',
                    'verifie' => 'Client vérifié', 'prospect' => 'Prospect vérifié'];
const LM2_ROLES = ['expert_brh' => 'Expert BRH', 'expert_brh_pro' => 'Expert BRH PRO', 'conseiller_pro' => 'Conseiller pro', 'filiale' => 'Filiale', 'hors_annuaire' => 'Hors annuaire'];
const LM2_SOLUTIONS = ['sante' => 'Santé et prévoyance', 'epargne' => 'Épargne salariale', 'retraite' => 'Retraite collective', 'avantages' => 'Avantages salariés'];
const LM2_FILIALES = ['caa' => ['lib' => 'CA Assurances', 'outil' => 'Prévis', 'solutions' => ['sante']],
                      'amundi' => ['lib' => 'Amundi / CA Titres', 'outil' => 'Universels', 'solutions' => ['epargne', 'retraite']],
                      'worklife' => ['lib' => 'Worklife', 'outil' => 'devis par e-mail', 'solutions' => ['avantages']]];
const LM2_PRIORITES = ['protection' => ['Protéger vos salariés', 'sante'], 'partageValeur' => ['Partager la valeur', 'epargne'],
                       'pouvoirAchat' => ['Pouvoir d’achat', 'avantages'], 'retraite' => ['Préparer la retraite', 'retraite']];
const LM2_RESULTATS_APPEL = ['joint' => 'Joint', 'messagerie' => 'Messagerie', 'injoignable' => 'Injoignable'];
const LM2_PROCHAINES = ['rdv' => 'Rendez-vous', 'devis' => 'Devis ou proposition', 'relance' => 'Relance', 'cloture' => 'Clôture'];
const LM2_PARAMETRES_DEFAUT = ['seuil_pro' => 20, 'jours' => ['devis' => 1, 'ultra' => 2, 'qualifie' => 5, 'rappel' => 2], 'acces_jours' => 14, 'transfert_alerte_jours' => 2];
const LM2_ENVOI_DEFAUT = ['reel' => false, 'interlocuteurs' => true, 'filiales' => true, 'dirigeants' => false];

/* ---------------- petites fonctions d'accès ---------------- */
function lm2_q(mysqli $db, string $sql, string $types = '', array $args = []): ?mysqli_stmt {
  $s = $db->prepare($sql);
  if (!$s) return null;
  if ($types !== '') $s->bind_param($types, ...$args);
  return $s->execute() ? $s : null;
}
function lm2_ligne(mysqli $db, string $sql, string $types = '', array $args = []): ?array {
  $s = lm2_q($db, $sql, $types, $args); if (!$s) return null;
  $r = $s->get_result(); if (!$r) return null;
  $l = $r->fetch_assoc(); return $l ?: null;
}
function lm2_lignes(mysqli $db, string $sql, string $types = '', array $args = []): array {
  $s = lm2_q($db, $sql, $types, $args); if (!$s) return [];
  $r = $s->get_result(); return $r ? $r->fetch_all(MYSQLI_ASSOC) : [];
}
/* dernier événement de lm2_integrer : 'nouveau' (dossier créé), 'monte', 'rouvert' ou '' */
function lm2_evenement(?string $e = null): string { static $v = ''; if ($e !== null) $v = $e; return $v; }
/* INSERT : identifiant de la ligne créée, 0 si l'insertion a échoué */
function lm2_insert(mysqli $db, string $sql, string $types, array $args): int {
  $s = lm2_q($db, $sql, $types, $args); return $s ? (int) $s->insert_id : 0;
}
function lm2_maintenant(): string { return date('Y-m-d H:i:s'); }
function lm2_txt($v, int $n = 190): string { return mb_substr(trim(is_scalar($v) ? (string) $v : ''), 0, $n); }
function lm2_liste($v): array { return array_values(array_filter(array_map('trim', is_array($v) ? array_map('strval', $v) : explode(',', (string) $v)), static fn($x) => $x !== '')); }
function lm2_json($v): array { $j = json_decode((string) $v, true); return is_array($j) ? $j : []; }
function lm2_enc($v): string { return (string) json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR); }
function lm2_eur($n): string { return number_format((float) $n, 0, ',', ' ') . ' €'; }
function lm2_date_fr(?string $dt): string { if (!$dt) return ''; $t = strtotime($dt); return $t ? date('d/m/Y à H\hi', $t) : (string) $dt; }
function lm2_jeton(): string { return bin2hex(random_bytes(16)); }
function lm2_e(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/* ---------------- base : tables lm2_* créées automatiquement ---------------- */
function lm2_db(): ?mysqli {
  static $db = null, $fait = false;
  if ($fait) return $db;
  $fait = true;
  $db = brh_leads_db();
  if (!$db) return null;
  $db->query("SET time_zone = '" . date('P') . "'");
  $T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
  $db->query("CREATE TABLE IF NOT EXISTS lm2_cr (code VARCHAR(40) PRIMARY KEY, nom VARCHAR(120) NOT NULL, departements VARCHAR(160) NOT NULL,
    mode VARCHAR(8) NOT NULL DEFAULT 'demo', envoi TINYINT NOT NULL DEFAULT 0, pilote_depuis DATETIME NULL, actif TINYINT NOT NULL DEFAULT 1) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_agences (id INT AUTO_INCREMENT PRIMARY KEY, cr_code VARCHAR(40) NOT NULL, nom VARCHAR(160) NOT NULL, ville VARCHAR(120) NOT NULL,
    cp VARCHAR(10) NULL, departement VARCHAR(3) NOT NULL, UNIQUE KEY (cr_code, ville), INDEX (departement)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_interlocuteurs (id INT AUTO_INCREMENT PRIMARY KEY, cr_code VARCHAR(40) NULL, role VARCHAR(20) NOT NULL,
    prenom VARCHAR(100) NOT NULL, nom VARCHAR(120) NOT NULL, email VARCHAR(190) NOT NULL, telephone VARCHAR(40) NULL, departements VARCHAR(160) NULL,
    agence_id INT NULL, ville_agence VARCHAR(160) NULL, perimetre VARCHAR(255) NULL, filiale VARCHAR(12) NULL, principal TINYINT NOT NULL DEFAULT 0,
    donnees VARCHAR(8) NOT NULL DEFAULT 'fictif', actif TINYINT NOT NULL DEFAULT 1, masque TINYINT NOT NULL DEFAULT 0, mot_de_passe VARCHAR(255) NULL,
    cree_le DATETIME NOT NULL, maj_le DATETIME NOT NULL, UNIQUE KEY (email), INDEX (cr_code), INDEX (role)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_dossiers (id INT AUTO_INCREMENT PRIMARY KEY, reference VARCHAR(20) NULL, cree_le DATETIME NOT NULL, maj_le DATETIME NOT NULL,
    version CHAR(1) NOT NULL DEFAULT 'S', cle VARCHAR(192) NOT NULL, email VARCHAR(190) NULL, prenom VARCHAR(100) NULL, nom VARCHAR(120) NULL, telephone VARCHAR(40) NULL,
    fonction VARCHAR(120) NULL, raison_sociale VARCHAR(190) NULL, siret VARCHAR(14) NULL, code_postal VARCHAR(10) NULL, ville VARCHAR(120) NULL, departement VARCHAR(3) NULL,
    effectif INT NULL, secteur VARCHAR(120) NULL, idcc VARCHAR(190) NULL, type VARCHAR(10) NOT NULL, type_le DATETIME NOT NULL, rappel TINYINT NOT NULL DEFAULT 0,
    statut VARCHAR(16) NOT NULL DEFAULT 'nouveau', statut_le DATETIME NOT NULL, issue VARCHAR(16) NULL, cr_code VARCHAR(40) NULL, expert_id INT NULL, assigne_id INT NULL,
    transfert_id INT NULL, client_statut VARCHAR(12) NOT NULL DEFAULT 'inconnu', client_declare VARCHAR(4) NULL, client_agence VARCHAR(160) NULL,
    client_conseiller VARCHAR(190) NULL, client_conseiller_email VARCHAR(190) NULL, client_verifie_par VARCHAR(190) NULL, client_verifie_le DATETIME NULL,
    echeance DATETIME NULL, pris_le DATETIME NULL, alerte_le DATETIME NULL, relances TINYINT NOT NULL DEFAULT 0, prochaine_relance DATETIME NULL,
    consent_relance TINYINT NOT NULL DEFAULT 1, montant INT NULL, solutions VARCHAR(120) NULL, parcours MEDIUMTEXT NULL, argumentaire TEXT NULL,
    rdv_le DATETIME NULL, rdv_note VARCHAR(255) NULL, jeton CHAR(32) NOT NULL, universels_le DATETIME NULL,
    UNIQUE KEY (reference), INDEX (cle), INDEX (cr_code), INDEX (statut), INDEX (type), INDEX (assigne_id)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_demandes (id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, lead_id INT NOT NULL, type VARCHAR(10) NOT NULL,
    type_demande VARCHAR(40) NOT NULL, cree_le DATETIME NOT NULL, UNIQUE KEY (lead_id), INDEX (dossier_id)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_transferts (id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, de_id INT NULL, de_nom VARCHAR(190) NULL, vers_id INT NOT NULL,
    motif VARCHAR(255) NULL, message TEXT NULL, informer TINYINT NOT NULL DEFAULT 0, cree_le DATETIME NOT NULL, pris_le DATETIME NULL, rendu_le DATETIME NULL,
    alerte_le DATETIME NULL, actif TINYINT NOT NULL DEFAULT 1, INDEX (dossier_id), INDEX (vers_id)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_acces (id INT AUTO_INCREMENT PRIMARY KEY, transfert_id INT NOT NULL, interlocuteur_id INT NOT NULL, dossier_id INT NOT NULL,
    jeton_hash CHAR(64) NOT NULL, cree_le DATETIME NOT NULL, expire_le DATETIME NOT NULL, revoque_le DATETIME NULL, ouvert_le DATETIME NULL,
    code_hash CHAR(64) NULL, code_expire DATETIME NULL, code_essais TINYINT NOT NULL DEFAULT 0, UNIQUE KEY (jeton_hash), INDEX (interlocuteur_id)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_journal (id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, cree_le DATETIME NOT NULL, acteur VARCHAR(190) NOT NULL,
    action VARCHAR(60) NOT NULL, detail TEXT NULL, interne TINYINT NOT NULL DEFAULT 1, INDEX (dossier_id)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_emails (id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NULL, cree_le DATETIME NOT NULL, modele VARCHAR(12) NOT NULL,
    categorie VARCHAR(16) NOT NULL, destinataire VARCHAR(190) NULL, destinataire_nom VARCHAR(190) NULL, envoye_a VARCHAR(190) NULL, reply_to VARCHAR(190) NULL,
    objet VARCHAR(255) NOT NULL, texte MEDIUMTEXT NULL, html MEDIUMTEXT NULL, statut VARCHAR(12) NOT NULL, motif VARCHAR(190) NULL, essais TINYINT NOT NULL DEFAULT 0,
    envoye_le DATETIME NULL, INDEX (dossier_id), INDEX (statut), INDEX (cree_le)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_comptes_rendus (id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, cree_le DATETIME NOT NULL, auteur VARCHAR(190) NOT NULL,
    resultat VARCHAR(16) NOT NULL, client_statut VARCHAR(12) NULL, prochaine VARCHAR(16) NULL, note TEXT NULL, INDEX (dossier_id)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_otp (id INT AUTO_INCREMENT PRIMARY KEY, dossier_id INT NOT NULL, code_hash CHAR(64) NOT NULL, cree_le DATETIME NOT NULL,
    expire_le DATETIME NOT NULL, essais TINYINT NOT NULL DEFAULT 0, valide_le DATETIME NULL, INDEX (dossier_id)) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_meta (cle VARCHAR(40) PRIMARY KEY, valeur MEDIUMTEXT NULL) $T");
  $db->query("CREATE TABLE IF NOT EXISTS lm2_admin_journal (id INT AUTO_INCREMENT PRIMARY KEY, cree_le DATETIME NOT NULL, auteur VARCHAR(190) NOT NULL, objet VARCHAR(190) NOT NULL,
    avant TEXT NULL, apres TEXT NULL, INDEX (cree_le)) $T");
  lm2_amorcer($db);
  return $db;
}

/* ---------------- réglages (lm2_meta) ---------------- */
function lm2_meta(mysqli $db, string $cle, $defaut = null) { $l = lm2_ligne($db, 'SELECT valeur FROM lm2_meta WHERE cle = ?', 's', [$cle]); return $l ? $l['valeur'] : $defaut; }
function lm2_meta_ecrire(mysqli $db, string $cle, string $valeur): void { lm2_q($db, 'INSERT INTO lm2_meta (cle, valeur) VALUES (?, ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)', 'ss', [$cle, $valeur]); }
function lm2_parametres(mysqli $db): array {
  $p = array_replace_recursive(LM2_PARAMETRES_DEFAUT, lm2_json(lm2_meta($db, 'parametres', '')));
  $p['seuil_pro'] = max(1, (int) $p['seuil_pro']); $p['acces_jours'] = max(1, min(60, (int) $p['acces_jours']));
  return $p;
}
function lm2_reglages_envoi(mysqli $db): array { return array_replace(LM2_ENVOI_DEFAUT, array_intersect_key(lm2_json(lm2_meta($db, 'envoi', '')), LM2_ENVOI_DEFAUT)); }

/* ---------------- amorçage : Caisses régionales, agences, annuaire de démonstration, boîtes des filiales ---------------- */
function lm2_amorcer(mysqli $db): void {
  if (lm2_meta($db, 'amorce', '') === '2.0') return;
  foreach (LM2_REFERENTIEL as $cr) {
    lm2_q($db, 'INSERT IGNORE INTO lm2_cr (code, nom, departements, mode, envoi, pilote_depuis, actif) VALUES (?, ?, ?, ?, 0, ?, 1)', 'sssss',
      [$cr['code'], $cr['nom'], implode(',', $cr['departements']), $cr['mode'], $cr['mode'] === 'pilote' ? lm2_maintenant() : null]);
    foreach ($cr['agences'] as $a) lm2_q($db, 'INSERT IGNORE INTO lm2_agences (cr_code, nom, ville, cp, departement) VALUES (?, ?, ?, ?, ?)', 'sssss',
      [$cr['code'], lm2_nom_agence($a['ville']), $a['ville'], $a['cp'], $a['departement']]);
  }
  foreach (lm2_lignes($db, "SELECT code FROM lm2_cr WHERE mode = 'demo'") as $c) lm2_annuaire_demo($db, (string) $c['code']);
  foreach (LM2_FILIALES as $f => $def) {
    $mail = $f . '-leads@filiales.demo-brh.invalid';
    if (!lm2_ligne($db, "SELECT id FROM lm2_interlocuteurs WHERE role = 'filiale' AND filiale = ?", 's', [$f]))
      lm2_q($db, "INSERT IGNORE INTO lm2_interlocuteurs (cr_code, role, prenom, nom, email, filiale, donnees, actif, cree_le, maj_le) VALUES (NULL, 'filiale', ?, ?, ?, ?, 'fictif', 1, NOW(), NOW())", 'ssss',
        ['Boîte', $def['lib'], $mail, $f]);
  }
  lm2_meta_ecrire($db, 'amorce', '2.0');
}
function lm2_nom_agence(string $ville): string { return (preg_match('/^[AEIOUYÉÈÊÂÎÔ]/u', $ville) ? 'Agence d’' : 'Agence de ') . $ville; }
/* RG-52 : annuaire fictif d'une CR de démonstration — 1 expert BRH, 1 expert BRH PRO par département, 2 conseillers pro par agence */
function lm2_annuaire_demo(mysqli $db, string $cr): void {
  if (lm2_ligne($db, "SELECT id FROM lm2_interlocuteurs WHERE cr_code = ? AND donnees = 'fictif' LIMIT 1", 's', [$cr])) {
    lm2_q($db, "UPDATE lm2_interlocuteurs SET masque = 0 WHERE cr_code = ? AND donnees = 'fictif'", 's', [$cr]); return;
  }
  $c = lm2_ligne($db, 'SELECT * FROM lm2_cr WHERE code = ?', 's', [$cr]); if (!$c) return;
  static $P = ['Céline', 'Julien', 'Camille', 'Nadia', 'Pierre', 'Émilie', 'Hugo', 'Marion', 'Bastien', 'Sophie', 'Karim', 'Lucie', 'Antoine', 'Claire', 'Yanis', 'Inès', 'Thomas', 'Sarah', 'Léa', 'Mathieu', 'Chloé', 'Nicolas', 'Manon', 'Romain'];
  static $N = ['Martin', 'Roux', 'Besnard', 'Haddad', 'Lambert', 'Caron', 'Petit', 'Leroy', 'Royer', 'Garnier', 'Benali', 'Fabre', 'Mercier', 'Dumas', 'Ferreira', 'Vidal', 'Guillot', 'Meunier', 'Morel', 'Fontaine', 'Chevalier', 'Robin', 'Masson', 'Blanc'];
  $k = crc32($cr); $n = 0;
  $ajout = static function (string $role, ?int $agence, string $deps, string $ville, string $per, int $principal) use ($db, $cr, $P, $N, &$k, &$n): void {
    $pr = $P[($k + $n * 7) % count($P)]; $no = $N[($k + $n * 11) % count($N)]; $n++;
    $mail = strtolower(lm2_ascii(mb_substr($pr, 0, 1)) . '.' . lm2_ascii($no)) . $n . '@' . $cr . '.demo-brh.invalid';
    $tel = '01 00 00 ' . sprintf('%02d %02d', $n % 100, ($k + $n) % 100);
    lm2_q($db, "INSERT IGNORE INTO lm2_interlocuteurs (cr_code, role, prenom, nom, email, telephone, departements, agence_id, ville_agence, perimetre, principal, donnees, actif, cree_le, maj_le)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fictif', 1, NOW(), NOW())", 'sssssssissi', [$cr, $role, $pr, mb_strtoupper(mb_substr($no, 0, 1)) . mb_substr($no, 1), $mail, $tel, $deps, $agence, $ville, $per, $principal]);
  };
  $deps = lm2_liste($c['departements']);
  $ag1 = lm2_ligne($db, 'SELECT * FROM lm2_agences WHERE cr_code = ? ORDER BY id LIMIT 1', 's', [$cr]);
  $ajout('expert_brh', null, implode(',', $deps), $ag1 ? (string) $ag1['ville'] : '', '', 1);
  foreach ($deps as $i => $d) {
    $ag = lm2_ligne($db, 'SELECT * FROM lm2_agences WHERE cr_code = ? AND departement = ? ORDER BY id LIMIT 1', 'ss', [$cr, $d]);
    $ajout('expert_brh_pro', null, $d, $ag ? (string) $ag['ville'] : '', $d, $i === 0 ? 1 : 0);
  }
  foreach (lm2_lignes($db, 'SELECT * FROM lm2_agences WHERE cr_code = ? ORDER BY id', 's', [$cr]) as $a)
    for ($j = 0; $j < 2; $j++) $ajout('conseiller_pro', (int) $a['id'], (string) $a['departement'], (string) $a['nom'], (string) $a['ville'], 0);
}
function lm2_ascii(string $s): string { $t = @iconv('UTF-8', 'ASCII//TRANSLIT', $s); return preg_replace('/[^a-z0-9]/i', '', $t !== false ? $t : $s); }
/* RG-52, RG-57 : changement de mode ; les données de l'autre mode sont masquées, jamais supprimées */
function lm2_cr_mode(mysqli $db, string $cr, string $mode): void {
  if (!in_array($mode, ['pilote', 'demo'], true)) return;
  lm2_q($db, 'UPDATE lm2_cr SET mode = ?, pilote_depuis = IF(? = \'pilote\', NOW(), pilote_depuis), envoi = IF(? = \'demo\', 0, envoi) WHERE code = ?', 'ssss', [$mode, $mode, $mode, $cr]);
  lm2_q($db, "UPDATE lm2_interlocuteurs SET masque = IF(donnees = ?, 1, 0) WHERE cr_code = ?", 'ss', [$mode === 'pilote' ? 'fictif' : 'reel', $cr]);
  if ($mode === 'demo') lm2_annuaire_demo($db, $cr);
}

/* ---------------- jours ouvrés (week-ends et jours fériés français) ---------------- */
function lm2_paques(int $a): DateTimeImmutable {
  $b = intdiv($a, 100); $c = $a % 100; $d = intdiv($b, 4); $e = $b % 4; $f = intdiv($b + 8, 25); $g = intdiv($b - $f + 1, 3);
  $h = (19 * ($a % 19) + $b - $d - $g + 15) % 30; $i = intdiv($c, 4); $k = $c % 4; $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
  $m = intdiv(($a % 19) + 11 * $h + 22 * $l, 451); $mois = intdiv($h + $l - 7 * $m + 114, 31); $jour = (($h + $l - 7 * $m + 114) % 31) + 1;
  return new DateTimeImmutable(sprintf('%04d-%02d-%02d', $a, $mois, $jour));
}
function lm2_ferie(DateTimeImmutable $d): bool {
  static $cache = [];
  $a = (int) $d->format('Y');
  if (!isset($cache[$a])) {
    $p = lm2_paques($a);
    $cache[$a] = ["$a-01-01", "$a-05-01", "$a-05-08", "$a-07-14", "$a-08-15", "$a-11-01", "$a-11-11", "$a-12-25",
                  $p->modify('+1 day')->format('Y-m-d'), $p->modify('+39 days')->format('Y-m-d'), $p->modify('+50 days')->format('Y-m-d')];
  }
  return in_array($d->format('Y-m-d'), $cache[$a], true);
}
function lm2_ouvre(DateTimeImmutable $d): bool { return (int) $d->format('N') <= 5 && !lm2_ferie($d); }
function lm2_plus_ouvres(string $depuis, int $jours): string {
  $d = new DateTimeImmutable($depuis);
  if (!lm2_ouvre($d)) { do { $d = $d->modify('+1 day'); } while (!lm2_ouvre($d)); $d = $d->setTime(9, 0); }
  for ($i = 0; $i < $jours; $i++) { do { $d = $d->modify('+1 day'); } while (!lm2_ouvre($d)); }
  return $d->format('Y-m-d H:i:s');
}
/* RG-05, Q2, Q3 : échéance de prise en charge */
function lm2_echeance(mysqli $db, string $type, string $depuis, bool $rappel): string {
  $j = lm2_parametres($db)['jours'];
  $n = ($type === 'qualifie' && $rappel) ? (int) $j['rappel'] : (int) ($j[$type] ?? 5);
  return lm2_plus_ouvres($depuis, max(1, $n));
}

/* ---------------- adresses ---------------- */
function lm2_url(string $chemin): string {
  $base = LM_SITE_URL;
  if ($base === '' && !empty($_SERVER['HTTP_HOST'])) {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $dir = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
    $base = ($https ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . $dir;
  }
  return rtrim($base, '/') . '/' . ltrim($chemin, '/');
}
function lm2_lien_suivi(array $d): string { return lm2_url('suivi-dossier.html?d=' . rawurlencode((string) $d['reference']) . '&j=' . $d['jeton']); }
function lm2_lien_fiche(int $dossier, string $vue = ''): string { return lm2_url('console.html#lead=' . $dossier . ($vue !== '' ? '&vue=' . $vue : '')); }
function lm2_lien_acces(string $jeton, int $dossier, string $vue = ''): string { return lm2_url('console.html?acces=' . $jeton . '#lead=' . $dossier . ($vue !== '' ? '&vue=' . $vue : '')); }

/* ---------------- Caisses régionales, départements, annuaire ---------------- */
function lm2_departement(string $cp, string $dep = ''): string {
  $cp = preg_replace('/\D/', '', $cp);
  if (strlen($cp) === 5) {
    if (str_starts_with($cp, '97')) return substr($cp, 0, 3);
    if (str_starts_with($cp, '20')) return ((int) $cp < 20200) ? '2A' : '2B';
    return substr($cp, 0, 2);
  }
  $dep = strtoupper(trim($dep));
  return (preg_match('/^(\d{2}|2[AB]|97\d)$/', $dep) && $dep !== '20' && $dep !== '97') ? $dep : '';
}
function lm2_cr(mysqli $db, ?string $code): ?array { return $code ? lm2_ligne($db, 'SELECT * FROM lm2_cr WHERE code = ?', 's', [$code]) : null; }
function lm2_cr_du_departement(mysqli $db, string $dep): ?array {
  if ($dep === '') return null;
  foreach (lm2_lignes($db, 'SELECT * FROM lm2_cr WHERE actif = 1') as $cr) if (in_array($dep, lm2_liste($cr['departements']), true)) return $cr;
  return null;
}
function lm2_interlocuteur(mysqli $db, ?int $id): ?array { return $id ? lm2_ligne($db, 'SELECT * FROM lm2_interlocuteurs WHERE id = ?', 'i', [$id]) : null; }
function lm2_nom(?array $i): string { return $i ? trim($i['prenom'] . ' ' . $i['nom']) : ''; }
function lm2_norm(string $s): string {
  $t = @iconv('UTF-8', 'ASCII//TRANSLIT', $s); $t = strtolower($t !== false ? $t : $s);
  $t = preg_replace('/^agence\s+(de\s+|d\W*)/', '', $t); return trim(preg_replace('/[^a-z0-9]+/', ' ', $t));
}
/* RG-11 : expert BRH du périmètre du siège ; sans périmètre, file commune de la CR (expert_id vide) */
function lm2_expert_du_siege(mysqli $db, string $cr, string $dep, string $ville): ?array {
  $ex = lm2_lignes($db, "SELECT * FROM lm2_interlocuteurs WHERE cr_code = ? AND role = 'expert_brh' AND actif = 1 AND masque = 0 ORDER BY principal DESC, id", 's', [$cr]);
  if (count($ex) <= 1) return $ex[0] ?? null;
  foreach ($ex as $e) foreach (lm2_liste($e['perimetre']) as $p) if (lm2_norm($p) === lm2_norm($ville) && $ville !== '') return $e;
  foreach ($ex as $e) if (in_array($dep, lm2_liste((string) ($e['perimetre'] ?: $e['departements'])), true)) return $e;
  return null;
}
function lm2_experts_cr(mysqli $db, ?string $cr): array {
  return $cr ? lm2_lignes($db, "SELECT * FROM lm2_interlocuteurs WHERE cr_code = ? AND role = 'expert_brh' AND actif = 1 AND masque = 0 ORDER BY principal DESC, id", 's', [$cr]) : [];
}

/* ---------------- lecture d'une demande des sites ---------------- */
function lm2_lire_demande(array $l): array {
  $j = lm2_json($l['donnees'] ?? '');
  $e = is_array($j['entreprise'] ?? null) ? $j['entreprise'] : (is_array($j['company'] ?? null) ? $j['company'] : []);
  $c = is_array($j['contact'] ?? null) ? $j['contact'] : (is_array($j['contexte'] ?? null) ? $j['contexte'] : []);
  $src = is_array($e['source_donnees'] ?? null) ? $e['source_donnees'] : [];
  $sol = [];
  foreach ((array) ($j['panier'] ?? []) as $p) if (is_array($p) && isset(LM2_SOLUTIONS[(string) ($p['solution'] ?? '')])) $sol[] = (string) $p['solution'];
  foreach ((array) ($j['solutions'] ?? []) as $p) if (is_string($p) && isset(LM2_SOLUTIONS[$p])) $sol[] = $p;
  $pr = [];
  foreach ((array) ($j['priorities'] ?? ($j['priorites'] ?? [])) as $k => $v) if (isset(LM2_PRIORITES[(string) $k])) $pr[(string) $k] = max(0, min(4, (int) $v));
  $preco = [];
  foreach ($pr as $k => $v) if ($v >= 3) $preco[] = LM2_PRIORITES[$k][1];
  $parc = is_array($j['parcours'] ?? null) ? $j['parcours'] : [];
  $decl = strtolower(lm2_txt($e['client_declare'] ?? ($src['client_declare'] ?? ($c['client_declare'] ?? ($j['client_declare'] ?? ''))), 4));
  $config = [];
  foreach ((array) ($j['panier'] ?? []) as $p) if (is_array($p)) $config[] = ['solution' => lm2_txt($p['solution'] ?? '', 20), 'libelle' => lm2_txt($p['libelle'] ?? '', 80),
    'formule' => lm2_txt($p['formule'] ?? '', 60), 'cout' => isset($p['cout_employeur_annuel']) && is_numeric($p['cout_employeur_annuel']) ? (int) $p['cout_employeur_annuel'] : null,
    'hypotheses' => array_slice(array_map(static fn($h) => lm2_txt($h, 160), (array) ($p['hypotheses'] ?? [])), 0, 4)];
  $parcours = array_filter([
    'priorites' => $pr, 'offres_preconisees' => array_values(array_unique($preco)),
    'offres_consultees' => array_values(array_unique(array_map(static fn($x) => lm2_txt($x, 60), (array) ($parc['offres_consultees'] ?? [])))),
    'pages' => array_slice(array_values(array_unique(array_map(static fn($x) => lm2_txt($x, 60), (array) ($parc['pages'] ?? [])))), 0, 20),
    'gain_fiscal' => isset($j['fiscalGain']['total']) ? (int) $j['fiscalGain']['total'] : null,
    'score_label' => isset($j['labelBrh']['score']) ? (int) $j['labelBrh']['score'] : null,
    'configuration' => $config, 'salaries' => isset($j['rh']['salaries_concernes']) ? (int) $j['rh']['salaries_concernes'] : null,
    'reference_devis' => lm2_txt($j['reference'] ?? '', 40), 'etape' => lm2_txt($j['etape'] ?? ($l['etape'] ?? ''), 60),
    'conventions' => array_slice((array) ($src['conventions'] ?? []), 0, 6), 'sante_ccn' => is_array($src['sante_ccn'] ?? null) ? $src['sante_ccn'] : null,
  ], static fn($v) => $v !== null && $v !== '' && $v !== []);
  $montant = isset($j['estimation_totale']) && is_numeric($j['estimation_totale']) ? (int) $j['estimation_totale'] : null;
  return ['solutions' => array_values(array_unique($sol)), 'parcours' => $parcours, 'montant' => $montant,
          'client_declare' => in_array($decl, ['oui', 'non', 'nsp'], true) ? $decl : null,
          'mobile' => lm2_txt($c['telephone'] ?? ($c['tel'] ?? ''), 40)];
}

/* ---------------- intégration d'une demande dans un dossier (idempotente) ---------------- */
function lm2_integrer(mysqli $db, int $leadId, bool $emails = true): ?int {
  $deja = lm2_ligne($db, 'SELECT dossier_id FROM lm2_demandes WHERE lead_id = ?', 'i', [$leadId]);
  if ($deja) return (int) $deja['dossier_id'];
  /* une seule intégration à la fois (tâche planifiée et collecte simultanées : pas de dossier en double) */
  $verrou = lm2_ligne($db, "SELECT GET_LOCK('lm2_integrer', 5) AS v");
  try { return lm2_integrer_($db, $leadId, $emails); }
  finally { if ($verrou && (int) $verrou['v'] === 1) $db->query("SELECT RELEASE_LOCK('lm2_integrer')"); }
}
function lm2_integrer_(mysqli $db, int $leadId, bool $emails): ?int {
  $deja = lm2_ligne($db, 'SELECT dossier_id FROM lm2_demandes WHERE lead_id = ?', 'i', [$leadId]);
  if ($deja) return (int) $deja['dossier_id'];
  $l = lm2_ligne($db, 'SELECT * FROM ' . LM_TABLE_LEADS . ' WHERE id = ?', 'i', [$leadId]);
  if (!$l || !in_array((string) $l['version'], LM_VERSIONS, true)) return null;
  if (!(int) $l['consentement']) return null;                                   // RG-01
  $map = LM2_TYPE_DEMANDE[(string) $l['type']] ?? null;
  if (!$map) return null;                                                       // RG-07 : la newsletter n'est pas un lead
  [$type, $rappel] = $map;
  $rappel = $rappel || (int) $l['rappel_expert'] === 1;
  $lu = lm2_lire_demande($l);
  $email = strtolower(trim((string) $l['email'])); $siren = substr(preg_replace('/\D/', '', (string) $l['siret']), 0, 9);
  $cle = $email !== '' ? 'e:' . $email : ($siren !== '' ? 's:' . $siren : 'l:' . $leadId);
  $now = lm2_maintenant();
  /* RG-02 : un dossier par dirigeant sur 60 jours (RG-29 : un dossier clôturé se rouvre) */
  $d = lm2_ligne($db, 'SELECT * FROM lm2_dossiers WHERE cle = ? AND maj_le >= (NOW() - INTERVAL ' . (int) LM_FUSION_JOURS . ' DAY) ORDER BY id DESC LIMIT 1', 's', [$cle]);
  if (!$d && $siren !== '' && $email === '') $d = lm2_ligne($db, 'SELECT * FROM lm2_dossiers WHERE siret LIKE ? AND maj_le >= (NOW() - INTERVAL ' . (int) LM_FUSION_JOURS . ' DAY) ORDER BY id DESC LIMIT 1', 's', [$siren . '%']);
  $dep = lm2_departement((string) $l['code_postal'], (string) $l['departement']);
  $champs = ['email' => $email ?: null, 'prenom' => $l['prenom'], 'nom' => $l['nom'], 'telephone' => $l['telephone'], 'fonction' => $l['fonction'],
             'raison_sociale' => $l['raison_sociale'], 'siret' => $l['siret'], 'code_postal' => $l['code_postal'], 'ville' => $l['ville'], 'departement' => $dep ?: null,
             'effectif' => (int) $l['effectif'] > 0 ? (int) $l['effectif'] : null, 'secteur' => $l['secteur'], 'idcc' => $l['idcc']];
  $evenement = '';
  if ($d) {
    $id = (int) $d['id']; $maj = [];
    /* sécurité : une nouvelle demande complète le dossier sans jamais écraser une coordonnée déjà connue (téléphone du code SMS, RG-44) */
    foreach ($champs as $k => $v) if ($v !== null && $v !== '' && ($d[$k] === null || (string) $d[$k] === '')) $maj[$k] = $v;
    if ($champs['effectif'] !== null && (int) $champs['effectif'] !== (int) $d['effectif']) $maj['effectif'] = $champs['effectif'];
    $monte = LM2_RANG[$type] > (LM2_RANG[$d['type']] ?? 0);                       // RG-03 : le type ne fait que monter
    if ($monte) { $maj['type'] = $type; $maj['type_le'] = $now; $evenement = 'monte'; }
    if ($rappel && !(int) $d['rappel']) $maj['rappel'] = 1;
    if ($d['statut'] === 'cloture') {   /* RG-29 : réouverture, transferts précédents clos et accès révoqués */
      foreach (lm2_lignes($db, 'SELECT id FROM lm2_transferts WHERE dossier_id = ? AND actif = 1', 'i', [$id]) as $t) lm2_clore_transfert($db, (int) $t['id']);
      $maj += ['statut' => 'nouveau', 'statut_le' => $now, 'issue' => null, 'assigne_id' => null, 'transfert_id' => null, 'pris_le' => null, 'relances' => 0, 'rdv_le' => null, 'rdv_note' => null];
      $evenement = 'rouvert';
    }
    if ($evenement !== '' && in_array(($maj['statut'] ?? $d['statut']), ['nouveau', 'transfere'], true)) {
      $maj['echeance'] = lm2_echeance($db, $maj['type'] ?? $d['type'], $now, (bool) ($maj['rappel'] ?? $d['rappel'])); $maj['alerte_le'] = null;
    }
    $sol = array_values(array_unique(array_merge(lm2_liste($d['solutions']), $lu['solutions'])));
    if ($sol !== lm2_liste($d['solutions'])) $maj['solutions'] = implode(',', $sol);
    $parc = lm2_fusion_parcours(lm2_json($d['parcours']), $lu['parcours']); $maj['parcours'] = lm2_enc($parc);
    if ($lu['montant'] !== null) $maj['montant'] = $lu['montant'];
    if ($lu['client_declare'] !== null) { $maj['client_declare'] = $lu['client_declare'];
      if (!in_array($d['client_statut'], ['verifie', 'prospect'], true)) $maj['client_statut'] = lm2_statut_declaratif($lu['client_declare']); }
    if (!$d['cr_code'] && $dep !== '') { $cr = lm2_cr_du_departement($db, $dep); if ($cr) { $maj['cr_code'] = $cr['code']; $ex = lm2_expert_du_siege($db, $cr['code'], $dep, (string) $l['ville']); if ($ex) $maj['expert_id'] = (int) $ex['id']; } }
    lm2_maj($db, $id, $maj);
    lm2_journal($db, $id, 'Portail (automatique)', 'demande', (BRH_LEAD_TYPES[$l['type']] ?? $l['type']) . ' (site ' . $l['version'] . ')' . ($evenement === 'monte' ? ' — type relevé : ' . LM2_TYPES[$type]['lib'] : '') . ($evenement === 'rouvert' ? ' — dossier rouvert' : ''));
  } else {
    $cr = lm2_cr_du_departement($db, $dep);
    $ex = $cr ? lm2_expert_du_siege($db, (string) $cr['code'], $dep, (string) $l['ville']) : null;
    $jeton = lm2_jeton();
    lm2_q($db, 'INSERT INTO lm2_dossiers (cree_le, maj_le, version, cle, email, prenom, nom, telephone, fonction, raison_sociale, siret, code_postal, ville, departement,
      effectif, secteur, idcc, type, type_le, rappel, statut, statut_le, cr_code, expert_id, client_statut, client_declare, echeance, montant, solutions, parcours, jeton)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'nouveau\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      'ssssssssssssssissssississsisss',
      [$now, $now, $l['version'], $cle, $champs['email'], $champs['prenom'], $champs['nom'], $champs['telephone'], $champs['fonction'], $champs['raison_sociale'],
       $champs['siret'], $champs['code_postal'], $champs['ville'], $champs['departement'], $champs['effectif'], $champs['secteur'], $champs['idcc'], $type, $now,
       $rappel ? 1 : 0, $now, $cr['code'] ?? null, $ex ? (int) $ex['id'] : null, lm2_statut_declaratif($lu['client_declare']), $lu['client_declare'],
       lm2_echeance($db, $type, $now, $rappel), $lu['montant'], implode(',', $lu['solutions']), lm2_enc($lu['parcours']), $jeton]);
    $id = (int) $db->insert_id;
    if ($id < 1 || $db->affected_rows < 1) return null;
    lm2_q($db, 'UPDATE lm2_dossiers SET reference = ? WHERE id = ?', 'si', [sprintf('BRH-%s-%06d', date('y'), $id), $id]);
    lm2_journal($db, $id, 'Portail (automatique)', 'creation', 'Dossier créé : ' . LM2_TYPES[$type]['lib'] . ($rappel ? ' (rappel demandé)' : '') . ' — ' . (BRH_LEAD_TYPES[$l['type']] ?? $l['type']) . ' (site ' . $l['version'] . ')'
      . ($cr ? ' ; Caisse régionale ' . $cr['nom'] : ' ; Caisse régionale non identifiée : file « à attribuer »'));
    $evenement = 'nouveau';
  }
  lm2_q($db, 'INSERT IGNORE INTO lm2_demandes (dossier_id, lead_id, type, type_demande, cree_le) VALUES (?, ?, ?, ?, ?)', 'iisss', [$id, $leadId, $type, (string) $l['type'], $now]);
  $d = lm2_dossier($db, $id);
  lm2_evenement($evenement);   // collecte.php : dossier créé par cette demande, ou demande ajoutée à un dossier existant
  if ($d && $evenement !== '' && $emails) lm2_emails_arrivee($db, $d, $evenement, (string) $l['type'], (bool) (lm2_json($l['donnees'])['envoyer_estimation'] ?? false));
  return $id;
}
/* étape atteinte d'un devis en cours (action « etape » des sites) : frise du parcours */
function lm2_etape(mysqli $db, int $leadId, string $etape): void {
  $l = lm2_ligne($db, 'SELECT dossier_id FROM lm2_demandes WHERE lead_id = ?', 'i', [$leadId]);
  $id = $l ? (int) $l['dossier_id'] : (int) lm2_integrer($db, $leadId);
  if ($id < 1 || !($d = lm2_dossier($db, $id))) return;
  $p = lm2_json($d['parcours']);
  if (($p['etape'] ?? '') === $etape) return;
  $p['etape'] = $etape;
  lm2_maj($db, $id, ['parcours' => lm2_enc($p)]);
  lm2_journal($db, $id, 'Portail (automatique)', 'etape', 'Devis en cours : étape « ' . $etape . ' » atteinte');
}
/* argumentaire de l'IA du site C : rubrique « Pour préparer l'appel » (S3) */
function lm2_argumentaire(mysqli $db, int $leadId, array $arg, string $source): bool {
  $l = lm2_ligne($db, 'SELECT dossier_id FROM lm2_demandes WHERE lead_id = ?', 'i', [$leadId]);
  $id = $l ? (int) $l['dossier_id'] : (int) lm2_integrer($db, $leadId);
  if ($id < 1) return false;
  $propre = static function ($v, int $prof) use (&$propre) {
    if ($prof > 4) return null;
    if (is_array($v)) { $r = []; foreach (array_slice($v, 0, 12, true) as $k => $x) $r[is_int($k) ? $k : lm2_txt($k, 40)] = $propre($x, $prof + 1); return $r; }
    return is_scalar($v) ? lm2_txt($v, 600) : null;
  };
  $j = lm2_enc(['source' => lm2_txt($source, 20), 'le' => lm2_maintenant(), 'contenu' => $propre($arg, 0)]);
  if (strlen($j) > 20000) return false;
  lm2_maj($db, $id, ['argumentaire' => $j]);
  lm2_journal($db, $id, 'Portail (automatique)', 'argumentaire', 'Argumentaire préparé par l’IA du site (rubrique « Pour préparer l’appel »)');
  return true;
}
function lm2_statut_declaratif(?string $decl): string { return $decl === 'oui' ? 'declare' : ($decl === 'non' ? 'non_declare' : 'inconnu'); }
function lm2_fusion_parcours(array $a, array $b): array {
  foreach ($b as $k => $v) {
    if (in_array($k, ['offres_preconisees', 'offres_consultees', 'pages'], true)) $a[$k] = array_values(array_unique(array_merge((array) ($a[$k] ?? []), (array) $v)));
    elseif ($v !== null && $v !== [] && $v !== '') $a[$k] = $v;
  }
  return $a;
}
function lm2_maj(mysqli $db, int $id, array $champs): void {
  static $ok = ['email', 'prenom', 'nom', 'telephone', 'fonction', 'raison_sociale', 'siret', 'code_postal', 'ville', 'departement', 'effectif', 'secteur', 'idcc', 'type', 'type_le',
    'rappel', 'statut', 'statut_le', 'issue', 'cr_code', 'expert_id', 'assigne_id', 'transfert_id', 'client_statut', 'client_declare', 'client_agence', 'client_conseiller',
    'client_conseiller_email', 'client_verifie_par', 'client_verifie_le', 'echeance', 'pris_le', 'alerte_le', 'relances', 'prochaine_relance', 'consent_relance', 'montant',
    'solutions', 'parcours', 'argumentaire', 'rdv_le', 'rdv_note', 'universels_le'];
  $set = []; $types = ''; $vals = [];
  foreach ($champs as $k => $v) {
    if (!in_array($k, $ok, true)) continue;
    $set[] = "$k = ?"; $types .= is_int($v) ? 'i' : 's'; $vals[] = $v === null ? null : (is_int($v) ? $v : (string) $v);
  }
  if (!$set) return;
  $set[] = 'maj_le = NOW()'; $types .= 'i'; $vals[] = $id;
  lm2_q($db, 'UPDATE lm2_dossiers SET ' . implode(', ', $set) . ' WHERE id = ?', $types, $vals);
}
function lm2_dossier(mysqli $db, int $id): ?array { return lm2_ligne($db, 'SELECT * FROM lm2_dossiers WHERE id = ?', 'i', [$id]); }
function lm2_journal(mysqli $db, int $dossier, string $acteur, string $action, string $detail, bool $interne = true): void {
  lm2_q($db, 'INSERT INTO lm2_journal (dossier_id, cree_le, acteur, action, detail, interne) VALUES (?, NOW(), ?, ?, ?, ?)', 'isssi', [$dossier, mb_substr($acteur, 0, 190), $action, $detail, $interne ? 1 : 0]);
}
function lm2_admin_journal(mysqli $db, string $auteur, string $objet, $avant, $apres): void {
  lm2_q($db, 'INSERT INTO lm2_admin_journal (cree_le, auteur, objet, avant, apres) VALUES (NOW(), ?, ?, ?, ?)', 'ssss', [$auteur, mb_substr($objet, 0, 190), $avant === null ? null : lm2_enc($avant), $apres === null ? null : lm2_enc($apres)]);
}

/* ---------------- fiche client des e-mails (RG-63, Q20 : entreprise et prénom seulement) ---------------- */
function lm2_fiche_client(mysqli $db, array $d, string $message = ''): array {
  $p = lm2_json($d['parcours']);
  $besoins = [];
  foreach ((array) ($p['priorites'] ?? []) as $k => $v) if (isset(LM2_PRIORITES[$k]) && (int) $v >= 2) $besoins[] = LM2_PRIORITES[$k][0] . ' ' . (int) $v . '/4';
  $ent = preg_replace('/^(\s|·)+|(\s|·)+$/u', '', ($d['ville'] ? $d['ville'] : '') . ($d['departement'] ? ' (' . $d['departement'] . ')' : '') . ($d['effectif'] ? ' · ' . $d['effectif'] . ' salariés' : '') . ($d['secteur'] ? ' · ' . $d['secteur'] : ''));
  $l = [
    'Entreprise' => $ent ?: 'à compléter',
    'Type de lead' => LM2_TYPES[$d['type']]['lib'] . ($d['echeance'] && in_array($d['statut'], ['nouveau', 'transfere'], true) ? ' · à prendre en charge avant le ' . lm2_date_fr($d['echeance']) : ''),
    'Statut client' => LM2_CLIENT[$d['client_statut']] ?? 'À vérifier',
    'Solutions' => implode(', ', array_map(static fn($s) => LM2_SOLUTIONS[$s] ?? $s, lm2_liste($d['solutions']))) ?: 'à préciser',
    'Besoins' => implode(' · ', $besoins) ?: 'à préciser',
  ];
  if ($d['montant']) $l['Estimation'] = lm2_eur($d['montant']) . ' / an (indicative et non contractuelle)';
  if ($d['idcc']) $l['Convention'] = (string) $d['idcc'] . (isset($p['sante_ccn']['statut']) ? ' · ' . $p['sante_ccn']['statut'] : '');
  $l['Contact'] = ($d['prenom'] ? $d['prenom'] : 'Dirigeant') . ' — coordonnées dans la plateforme';
  if ($message !== '') $l['Message'] = $message;
  return $l;
}

/* ---------------- modèles d'e-mails (RG-65 : objet et texte modifiables dans l'administration) ---------------- */
function lm2_modeles_defaut(): array {
  return [
    'E1' => ['lib' => 'Accusé de réception', 'cat' => 'dirigeant', 'objet' => 'Votre demande {reference} est bien reçue',
             'texte' => "Bonjour {prenom},\n\nVotre demande est bien reçue (référence {reference}). Un expert Banque des Ressources Humaines de {caisse} l’étudie et revient vers vous.\n{resultat}\nVous pouvez suivre votre dossier à tout moment avec le lien ci-dessous."],
    'E2' => ['lib' => 'Nouvelle demande', 'cat' => 'interlocuteur', 'objet' => 'Nouvelle {type} : {entreprise} ({ville})',
             'texte' => "Bonjour {destinataire},\n\nUne nouvelle demande arrive dans votre file : {type} de {entreprise}. À prendre en charge avant le {echeance}."],
    'E3' => ['lib' => 'Prise en charge', 'cat' => 'dirigeant', 'objet' => 'Votre demande {reference} est prise en charge',
             'texte' => "Bonjour {prenom},\n\n{interlocuteur}, {role} de {caisse}, prend en charge votre demande et vous contacte prochainement."],
    'E4' => ['lib' => 'Lead transféré', 'cat' => 'interlocuteur', 'objet' => 'Lead transféré : {entreprise} ({ville}, {effectif}) – {type}',
             'texte' => "Bonjour {destinataire},\n\n{expert} ({caisse}) vous transmet ce lead. Merci de le prendre en charge avant le {echeance}."],
    'E5' => ['lib' => 'Votre interlocuteur', 'cat' => 'dirigeant', 'objet' => 'Votre demande {reference} : votre interlocuteur',
             'texte' => "Bonjour {prenom},\n\nVotre demande est suivie par {interlocuteur}, {role}{agence}. Il vous contacte prochainement."],
    'E6' => ['lib' => 'Relance', 'cat' => 'dirigeant', 'objet' => 'Votre diagnostic RH : et maintenant ?',
             'texte' => "Bonjour {prenom},\n\nVous avez fait votre diagnostic RH sur le portail Banque des Ressources Humaines.\n{resultat}\nUn expert peut vous accompagner : suivez votre dossier ou demandez à être rappelé avec le lien ci-dessous."],
    'E7' => ['lib' => 'Alerte délai', 'cat' => 'interlocuteur', 'objet' => 'Lead en attente : {entreprise}',
             'texte' => "Bonjour {destinataire},\n\nCe lead n’est pas encore pris en charge : {raison}."],
    'E8' => ['lib' => 'Rendez-vous', 'cat' => 'dirigeant', 'objet' => 'Votre rendez-vous Banque des RH le {date_rdv}',
             'texte' => "Bonjour {prenom},\n\nVotre rendez-vous avec {interlocuteur} ({caisse}) est prévu le {date_rdv}.{note}"],
    'R'  => ['lib' => 'Récapitulatif quotidien', 'cat' => 'interlocuteur', 'objet' => 'Vos leads qualifiés du jour ({nombre})',
             'texte' => "Bonjour {destinataire},\n\nVoici les nouveaux leads qualifiés de {caisse} :\n{liste}"],
    'A'  => ['lib' => 'Code d’accès', 'cat' => 'interlocuteur', 'objet' => 'Votre code d’accès au lead management',
             'texte' => "Bonjour {destinataire},\n\nVotre code d’accès à usage unique est {code}. Il est valable 10 minutes."],
    'T'  => ['lib' => 'E-mail de test', 'cat' => 'test', 'objet' => 'E-mail de test du lead management',
             'texte' => "Bonjour,\n\nCet e-mail de test confirme que l’envoi depuis {expediteur} fonctionne."],
  ];
}
function lm2_modeles(mysqli $db): array {
  $m = lm2_modeles_defaut(); $o = lm2_json(lm2_meta($db, 'modeles', ''));
  foreach ($m as $k => $v) foreach (['objet', 'texte'] as $c) if (isset($o[$k][$c]) && is_string($o[$k][$c]) && trim($o[$k][$c]) !== '') $m[$k][$c] = $o[$k][$c];
  return $m;
}
function lm2_remplir(string $t, array $v): string { return preg_replace_callback('/\{([a-z_]+)\}/', static fn($m) => (string) ($v[$m[1]] ?? ''), $t); }

/* gabarit HTML (RG-63, RG-68) : fiche client et boutons pour les interlocuteurs, lien de suivi pour le dirigeant */
function lm2_html(string $titre, string $texte, array $fiche, array $boutons, string $pied): string {
  $p = '';
  foreach (preg_split('/\n{2,}/', trim($texte)) as $bloc) $p .= '<p style="margin:0 0 12px;font:15px/1.5 Arial,sans-serif;color:#233029">' . nl2br(lm2_e($bloc)) . '</p>';
  $f = '';
  if ($fiche) {
    $f = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F6F4;border:1px solid #C9D8D3;border-radius:8px;margin:6px 0 16px"><tr><td style="padding:14px 16px">';
    foreach ($fiche as $k => $v) $f .= '<div style="font:14px/1.5 Arial,sans-serif;color:#233029;margin:2px 0"><b style="display:inline-block;min-width:110px;color:#344C4D">' . lm2_e((string) $k) . '</b> ' . lm2_e((string) $v) . '</div>';
    $f .= '</td></tr></table>';
  }
  $b = '';
  foreach ($boutons as $i => $bt) $b .= '<a href="' . lm2_e($bt[1]) . '" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:6px;font:bold 15px Arial,sans-serif;text-decoration:none;'
    . ($i === 0 ? 'background:#004A4B;color:#ffffff' : 'background:#ffffff;color:#004A4B;border:1px solid #C9D8D3') . '">' . lm2_e($bt[0]) . '</a>';
  return '<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:18px">'
    . '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%"><tr><td style="background:#065145;border-radius:6px;padding:14px 18px;font:bold 17px Arial,sans-serif;color:#ffffff">Banque des Ressources Humaines'
    . '<span style="float:right;font:14px Arial,sans-serif;color:#c7dd8a">' . lm2_e($titre) . '</span></td></tr><tr><td style="padding:18px 4px 4px">' . $p . $f . $b
    . '<p style="margin:14px 0 0;font:12px/1.5 Arial,sans-serif;color:#707173">' . lm2_e($pied) . '</p></td></tr></table></td></tr></table></body></html>';
}

/* ---------------- RG-60 à RG-62, RG-54 : décision d'envoi réel ---------------- */
function lm2_decider_envoi(mysqli $db, string $cat, ?array $interloc, ?array $dossier): array {
  $env = lm2_reglages_envoi($db);
  if ($cat === 'test') return ['statut' => 'attente', 'motif' => ''];
  if (!$env['reel']) return ['statut' => 'journal', 'motif' => 'Envoi réel désactivé'];
  if (LM_SITE_URL === '') return ['statut' => 'journal', 'motif' => 'LM_SITE_URL à renseigner dans config.php (liens des e-mails)'];
  $cr = $dossier ? lm2_cr($db, $dossier['cr_code']) : ($interloc ? lm2_cr($db, $interloc['cr_code']) : null);
  if ($cat === 'dirigeant') {
    if (!$cr || $cr['mode'] !== 'pilote') return ['statut' => 'journal', 'motif' => 'CR en démonstration ou non identifiée'];
    if (!(int) $cr['envoi']) return ['statut' => 'journal', 'motif' => 'Envoi coupé pour cette CR'];
    if ($env['dirigeants']) return ['statut' => 'attente', 'motif' => ''];
    if (LM2_TEST_DIRIGEANTS !== '' && filter_var(LM2_TEST_DIRIGEANTS, FILTER_VALIDATE_EMAIL)) return ['statut' => 'attente', 'motif' => 'Redirigé vers l’adresse de test', 'redirige' => LM2_TEST_DIRIGEANTS];
    return ['statut' => 'journal', 'motif' => 'E-mails aux dirigeants non activés'];
  }
  if (!$interloc) return ['statut' => 'non_envoye', 'motif' => 'Destinataire inconnu'];
  $filiale = $interloc['role'] === 'filiale';
  if ($filiale ? !$env['filiales'] : !$env['interlocuteurs']) return ['statut' => 'journal', 'motif' => 'Catégorie de destinataires désactivée'];
  if ($interloc['donnees'] !== 'reel') return ['statut' => 'non_envoye', 'motif' => 'Interlocuteur fictif'];
  if (!(int) $interloc['actif'] || (int) $interloc['masque']) return ['statut' => 'non_envoye', 'motif' => 'Interlocuteur inactif'];
  if (!$cr || $cr['mode'] !== 'pilote') return ['statut' => 'non_envoye', 'motif' => 'CR en démonstration'];
  if (!(int) $cr['envoi']) return ['statut' => 'journal', 'motif' => 'Envoi coupé pour cette CR'];
  return ['statut' => 'attente', 'motif' => ''];
}
/* enregistre puis envoie (file d'attente : 3 essais au plus, RG-66) */
function lm2_email(mysqli $db, ?array $dossier, string $modele, string $cat, string $a, string $aNom, string $objet, string $texte, string $html, string $replyTo = '', ?array $interloc = null): string {
  $a = trim($a); if (!filter_var($a, FILTER_VALIDATE_EMAIL)) $a = '';
  $dec = $a === '' ? ['statut' => 'non_envoye', 'motif' => 'Adresse absente ou invalide'] : lm2_decider_envoi($db, $cat, $interloc, $dossier);
  $vers = $dec['redirige'] ?? $a;
  if (isset($dec['redirige'])) $objet = '[Test – destinataire prévu : ' . $a . '] ' . $objet;
  $garder = $dec['statut'] === 'attente';   /* un e-mail non envoyé est gardé sans lien d'accès ni code */
  $id = lm2_insert($db, 'INSERT INTO lm2_emails (dossier_id, cree_le, modele, categorie, destinataire, destinataire_nom, envoye_a, reply_to, objet, texte, html, statut, motif) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    'isssssssssss', [$dossier ? (int) $dossier['id'] : null, $modele, $cat, $a, mb_substr($aNom, 0, 190), $vers, $replyTo ?: null, mb_substr($objet, 0, 255), $garder ? $texte : lm2_masquer($texte), $garder ? $html : lm2_masquer($html), $dec['statut'], $dec['motif']]);
  if ($id < 1) return 'echec';
  if ($garder) return lm2_envoyer_file($db, $id);
  return $dec['statut'];
}
function lm2_masquer(string $t): string { return (string) preg_replace(['/(acces=)[0-9a-f]{48}/', '/(code d’accès à usage unique est )\d{6}/u'], ['$1••••••', '$1••••••'], $t); }
function lm2_envoyer_file(mysqli $db, int $id): string {
  $e = lm2_ligne($db, "SELECT * FROM lm2_emails WHERE id = ? AND statut IN ('attente', 'echec') AND essais < 3", 'i', [$id]);
  if (!$e) return 'ignore';
  if ((int) $e['essais'] > 0 && $e['categorie'] !== 'test') {   /* un nouvel essai respecte les réglages du moment */
    $it = $e['categorie'] === 'dirigeant' ? null : lm2_ligne($db, 'SELECT * FROM lm2_interlocuteurs WHERE email = ?', 's', [(string) $e['destinataire']]);
    $dec = lm2_decider_envoi($db, (string) $e['categorie'], $it, $e['dossier_id'] ? lm2_dossier($db, (int) $e['dossier_id']) : null);
    if ($dec['statut'] !== 'attente') {
      lm2_q($db, 'UPDATE lm2_emails SET statut = ?, motif = ?, texte = ?, html = ? WHERE id = ?', 'ssssi', [$dec['statut'], $dec['motif'], lm2_masquer((string) $e['texte']), lm2_masquer((string) $e['html']), $id]);
      return $dec['statut'];
    }
  }
  [$ok, $err] = lm2_transport((string) $e['envoye_a'], (string) $e['destinataire_nom'], (string) $e['objet'], (string) $e['html'], (string) $e['texte'], (string) $e['reply_to']);
  lm2_q($db, 'UPDATE lm2_emails SET statut = ?, motif = ?, essais = essais + 1, envoye_le = IF(? = \'envoye\', NOW(), envoye_le) WHERE id = ?', 'sssi',
    [$ok ? 'envoye' : 'echec', $ok ? '' : mb_substr($err, 0, 190), $ok ? 'envoye' : 'echec', $id]);
  if ($ok || (int) $e['essais'] >= 2) lm2_q($db, 'UPDATE lm2_emails SET texte = ?, html = ? WHERE id = ?', 'ssi', [lm2_masquer((string) $e['texte']), lm2_masquer((string) $e['html']), $id]);
  return $ok ? 'envoye' : 'echec';
}
function lm2_entete(string $nom, string $adresse): string { return ($nom !== '' ? '=?UTF-8?B?' . base64_encode($nom) . '?= ' : '') . '<' . $adresse . '>'; }
/* transport : SMTP authentifié (config.php) ou, à défaut, mail() de PHP */
function lm2_transport(string $a, string $aNom, string $objet, string $html, string $texte, string $replyTo): array {
  if (!filter_var($a, FILTER_VALIDATE_EMAIL)) return [false, 'Adresse invalide'];
  $limite = 'lm2-' . bin2hex(random_bytes(8));
  $h = ['Date: ' . date('r'), 'From: ' . lm2_entete(LM2_EMAIL_NOM, LM2_EMAIL_FROM), 'To: ' . lm2_entete($aNom, $a), 'Subject: =?UTF-8?B?' . base64_encode($objet) . '?=',
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . (substr(strrchr(LM2_EMAIL_FROM, '@') ?: '@localhost', 1)) . '>', 'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $limite . '"', 'X-Auto-Response-Suppress: All'];
  if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $h[] = 'Reply-To: ' . $replyTo;
  $corps = "--$limite\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($texte))
         . "--$limite\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$limite--\r\n";
  if (LM_SMTP_HOST === '') {
    if (!function_exists('mail')) return [false, 'Fonction mail() indisponible'];
    $sans = array_values(array_filter($h, static fn($x) => !preg_match('/^(To|Subject|Date):/', $x)));
    return @mail($a, '=?UTF-8?B?' . base64_encode($objet) . '?=', $corps, implode("\r\n", $sans), '-f' . LM2_EMAIL_FROM) ? [true, ''] : [false, 'mail() a refusé l’envoi'];
  }
  return lm2_smtp($a, implode("\r\n", $h) . "\r\n\r\n" . $corps);
}
function lm2_smtp(string $a, string $message): array {
  $hote = LM_SMTP_SECURE === 'ssl' ? 'ssl://' . LM_SMTP_HOST : 'tcp://' . LM_SMTP_HOST;
  $s = @stream_socket_client($hote . ':' . (int) LM_SMTP_PORT, $no, $err, 15, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]));
  if (!$s) return [false, 'Connexion SMTP impossible : ' . $err];
  stream_set_timeout($s, 20);
  $lire = static function () use ($s): array { $txt = ''; $code = 0;
    while (($l = fgets($s, 2048)) !== false) { $txt .= $l; $code = (int) substr($l, 0, 3); if (strlen($l) < 4 || $l[3] !== '-') break; }
    return [$code, trim($txt)]; };
  $cmd = static function (string $c, array $attendu) use ($s, $lire): ?string { fwrite($s, $c . "\r\n"); [$code, $t] = $lire(); return in_array($code, $attendu, true) ? null : ($t ?: 'pas de réponse'); };
  [$code] = $lire(); if ($code !== 220) { fclose($s); return [false, 'Serveur SMTP indisponible']; }
  $nom = 'lm2.' . (substr(strrchr(LM2_EMAIL_FROM, '@') ?: '@localhost', 1));
  if ($e = $cmd('EHLO ' . $nom, [250])) { fclose($s); return [false, 'EHLO : ' . $e]; }
  if (LM_SMTP_SECURE === 'tls') {
    if ($e = $cmd('STARTTLS', [220])) { fclose($s); return [false, 'STARTTLS : ' . $e]; }
    if (!@stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) { fclose($s); return [false, 'Chiffrement TLS impossible']; }
    if ($e = $cmd('EHLO ' . $nom, [250])) { fclose($s); return [false, 'EHLO : ' . $e]; }
  }
  if (LM_SMTP_USER !== '') {
    if ($e = $cmd('AUTH LOGIN', [334])) { fclose($s); return [false, 'AUTH : ' . $e]; }
    if ($e = $cmd(base64_encode(LM_SMTP_USER), [334])) { fclose($s); return [false, 'AUTH : ' . $e]; }
    if ($e = $cmd(base64_encode(LM_SMTP_PASS), [235])) { fclose($s); return [false, 'Identifiants SMTP refusés']; }
  }
  if ($e = $cmd('MAIL FROM:<' . LM2_EMAIL_FROM . '>', [250])) { fclose($s); return [false, 'MAIL FROM : ' . $e]; }
  if ($e = $cmd('RCPT TO:<' . $a . '>', [250, 251])) { fclose($s); return [false, 'RCPT TO : ' . $e]; }
  if ($e = $cmd('DATA', [354])) { fclose($s); return [false, 'DATA : ' . $e]; }
  $m = preg_replace('/^\./m', '..', str_replace(["\r\n", "\r"], ["\n", "\n"], $message));
  if ($e = $cmd(str_replace("\n", "\r\n", $m) . "\r\n.", [250])) { fclose($s); return [false, 'Envoi refusé : ' . $e]; }
  $cmd('QUIT', [221]); fclose($s);
  return [true, ''];
}

/* ---------------- e-mails métier ---------------- */
function lm2_variables(mysqli $db, array $d, array $extra = []): array {
  $cr = lm2_cr($db, $d['cr_code']);
  return array_merge(['prenom' => $d['prenom'] ?: '', 'reference' => (string) $d['reference'], 'entreprise' => $d['raison_sociale'] ?: 'Entreprise non renseignée', 'ville' => $d['ville'] ?: 'ville à préciser',
    'effectif' => $d['effectif'] ? $d['effectif'] . ' salariés' : 'effectif à préciser', 'type' => mb_strtolower(LM2_TYPES[$d['type']]['lib']), 'echeance' => lm2_date_fr($d['echeance']),
    'caisse' => $cr ? 'Crédit Agricole ' . $cr['nom'] : 'votre Caisse régionale', 'expediteur' => LM2_EMAIL_FROM], $extra);
}
/* e-mail à un interlocuteur : fiche client + liens vers la fiche (RG-63, RG-64) */
function lm2_email_interlocuteur(mysqli $db, string $modele, array $d, array $dest, array $extra = [], string $message = '', string $jetonAcces = '', string $replyTo = ''): string {
  $m = lm2_modeles($db)[$modele];
  $v = lm2_variables($db, $d, array_merge(['destinataire' => $dest['prenom'] ?? ''], $extra));
  $objet = lm2_remplir($m['objet'], $v); $texte = lm2_remplir($m['texte'], $v);
  $fiche = lm2_fiche_client($db, $d, $message);
  if ($jetonAcces === '' && $dest['role'] !== 'expert_brh' && $d['transfert_id']) $jetonAcces = lm2_nouvel_acces($db, $d, $dest);   /* destinataire sans compte : lien personnel */
  $acces = $jetonAcces !== '';
  $liens = $acces ? [['Ouvrir la fiche du lead', lm2_lien_acces($jetonAcces, (int) $d['id'])], ['Voir le script d’appel', lm2_lien_acces($jetonAcces, (int) $d['id'], 'script')]]
                  : [['Ouvrir la fiche du lead', lm2_lien_fiche((int) $d['id'])], ['Voir le script d’appel', lm2_lien_fiche((int) $d['id'], 'script')]];
  $exp = $acces ? lm2_ligne($db, 'SELECT expire_le FROM lm2_acces WHERE jeton_hash = ?', 's', [hash('sha256', $jetonAcces)]) : null;
  $pied = ($exp ? 'Lien personnel, valable jusqu’au ' . date('d/m/Y', strtotime((string) $exp['expire_le'])) . ', qui ouvre directement cette fiche. ' : 'Le lien ouvre la fiche après connexion à votre compte. ')
        . 'Les coordonnées du dirigeant sont dans la plateforme. E-mail interne Crédit Agricole : ne pas transférer.';
  $txt = $texte . "\n\n" . implode("\n", array_map(static fn($k, $x) => $k . ' : ' . $x, array_keys($fiche), $fiche)) . "\n\n" . implode("\n", array_map(static fn($b) => $b[0] . ' : ' . $b[1], $liens)) . "\n\n" . $pied;
  $html = lm2_html($m['lib'], $texte, $fiche, $liens, $pied);
  return lm2_email($db, $d, $modele, $dest['role'] === 'filiale' ? 'filiale' : 'interlocuteur', (string) $dest['email'], lm2_nom($dest), $objet, $txt, $html, $replyTo, $dest);
}
function lm2_email_dirigeant(mysqli $db, string $modele, array $d, array $extra = []): string {
  if (!$d['email']) return 'non_envoye';
  $m = lm2_modeles($db)[$modele];
  $v = lm2_variables($db, $d, $extra);
  unset($v['type'], $v['echeance']);   /* RG-06 : jamais le type de lead ni le délai interne, même dans un modèle modifié */
  $objet = lm2_remplir($m['objet'], $v); $texte = preg_replace("/\n{3,}/", "\n\n", lm2_remplir($m['texte'], $v));
  $lien = lm2_lien_suivi($d);
  $pied = 'Message automatique de la Banque des Ressources Humaines du Crédit Agricole. Ce lien est personnel : ne le transférez pas.';
  return lm2_email($db, $d, $modele, 'dirigeant', (string) $d['email'], trim($d['prenom'] . ' ' . $d['nom']), $objet, $texte . "\n\nSuivre mon dossier : " . $lien . "\n\n" . $pied,
    lm2_html($m['lib'], $texte, [], [['Suivre mon dossier', $lien]], $pied));
}
/* arrivée d'une demande : E1 au dirigeant ; E2 immédiat aux experts pour devis et ultra-qualifiés (S2 : qualifiés dans le récapitulatif) */
function lm2_emails_arrivee(mysqli $db, array $d, string $evenement, string $typeDemande, bool $estimation): void {
  $p = lm2_json($d['parcours']); $res = [];
  if ($d['type'] === 'qualifie' && isset($p['gain_fiscal'])) $res[] = 'Gain estimé par votre diagnostic : ' . lm2_eur($p['gain_fiscal']) . ' par an (estimation indicative et non contractuelle).';
  if (in_array($d['type'], ['ultra', 'devis'], true) && $d['montant']) $res[] = 'Votre estimation : ' . lm2_eur($d['montant']) . ' par an (estimation indicative et non contractuelle).';
  if (in_array($evenement, ['nouveau', 'monte', 'rouvert'], true) || $estimation) lm2_email_dirigeant($db, 'E1', $d, ['resultat' => $res ? "\n" . implode("\n", $res) . "\n" : '']);
  if (in_array($d['type'], ['devis', 'ultra'], true) && in_array($evenement, ['nouveau', 'monte', 'rouvert'], true)) {
    $dest = $d['expert_id'] ? array_filter([lm2_interlocuteur($db, (int) $d['expert_id'])]) : lm2_experts_cr($db, $d['cr_code']);
    foreach ($dest as $x) lm2_email_interlocuteur($db, 'E2', $d, $x);
  }
}

/* ---------------- statut client (RG-13 à RG-16) ---------------- */
function lm2_verifier_client(mysqli $db, array $d, string $statut, string $agence, string $conseiller, string $mail, string $acteur): bool {
  if (!in_array($statut, ['verifie', 'prospect'], true)) return false;
  if ($mail !== '' && !filter_var($mail, FILTER_VALIDATE_EMAIL)) return false;
  lm2_maj($db, (int) $d['id'], ['client_statut' => $statut, 'client_agence' => $statut === 'verifie' ? lm2_txt($agence, 160) : null, 'client_conseiller' => $statut === 'verifie' ? lm2_txt($conseiller, 190) : null,
    'client_conseiller_email' => $statut === 'verifie' ? strtolower(lm2_txt($mail, 190)) : null, 'client_verifie_par' => $acteur, 'client_verifie_le' => lm2_maintenant()]);
  lm2_journal($db, (int) $d['id'], $acteur, 'client', 'Statut client : ' . LM2_CLIENT[$statut] . ($statut === 'verifie' && $agence !== '' ? ' (' . $agence . ($conseiller !== '' ? ', conseiller titulaire ' . $conseiller : '') . ')' : '') . ' — vérifié dans la base clients de la CR');
  return true;
}

/* ---------------- transferts et accès ponctuels (RG-21 à RG-26) ---------------- */
function lm2_charge(mysqli $db, int $interloc): int {
  $l = lm2_ligne($db, "SELECT COUNT(*) n FROM lm2_dossiers WHERE assigne_id = ? AND statut <> 'cloture'", 'i', [$interloc]); return (int) ($l['n'] ?? 0);
}
/* RG-22 : filiales permises pour ce dossier */
function lm2_filiales_permises(array $d): array {
  if ($d['type'] !== 'devis') return [];
  $sol = lm2_liste($d['solutions']); $r = [];
  foreach (LM2_FILIALES as $f => $def) if (array_intersect($def['solutions'], $sol)) $r[] = $f;
  return $r;
}
/* Q17 : adresse professionnelle du Crédit Agricole hors annuaire */
function lm2_adresse_ca(string $mail): bool {
  if (!filter_var($mail, FILTER_VALIDATE_EMAIL)) return false;
  $dom = strtolower((string) substr((string) strrchr($mail, '@'), 1));
  foreach (LM2_DOMAINES_CA as $x) { $x = strtolower((string) $x); if ($dom === $x || str_ends_with($dom, '.' . $x)) return true; }
  return (bool) preg_match('/^exemple-ca-[a-z0-9-]+\.fr$/', $dom);   // adresses d'illustration de la démonstration et des tests
}
function lm2_transferer(mysqli $db, array $d, array $vers, array $de, string $message, string $motif, bool $informer, string $acteur): array {
  if ($d['statut'] === 'cloture') return ['ok' => false, 'error' => 'Dossier clôturé'];
  if ($vers['role'] === 'filiale') {
    if (!in_array((string) $vers['filiale'], lm2_filiales_permises($d), true)) return ['ok' => false, 'error' => 'Filiale réservée aux demandes de devis, selon les offres choisies (RG-22)'];
    if (trim($motif) === '') return ['ok' => false, 'error' => 'Motif obligatoire pour un transfert à une filiale'];
  } elseif ($vers['role'] === 'hors_annuaire') {
    if (!lm2_adresse_ca((string) $vers['email'])) return ['ok' => false, 'error' => 'Adresse professionnelle du Crédit Agricole attendue'];
    if ($vers['cr_code'] !== $d['cr_code']) return ['ok' => false, 'error' => 'Destinataire hors de la Caisse régionale du lead'];
  } else {
    if (!in_array($vers['role'], ['expert_brh_pro', 'conseiller_pro', 'expert_brh'], true) || $vers['cr_code'] !== $d['cr_code']) return ['ok' => false, 'error' => 'Destinataire hors de la Caisse régionale du lead'];
  }
  if (!(int) $vers['actif'] || (int) $vers['masque']) return ['ok' => false, 'error' => 'Destinataire inactif'];
  /* un seul transfert actif : le précédent est clos, son accès révoqué */
  foreach (lm2_lignes($db, 'SELECT id FROM lm2_transferts WHERE dossier_id = ? AND actif = 1', 'i', [(int) $d['id']]) as $t) lm2_clore_transfert($db, (int) $t['id']);
  $tid = lm2_insert($db, 'INSERT INTO lm2_transferts (dossier_id, de_id, de_nom, vers_id, motif, message, informer, cree_le, actif) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)', 'iisissi',
    [(int) $d['id'], isset($de['id']) ? (int) $de['id'] : null, mb_substr(lm2_nom($de) ?: $acteur, 0, 190), (int) $vers['id'], lm2_txt($motif, 255) ?: null, lm2_txt($message, 1000) ?: null, $informer ? 1 : 0]);
  if ($tid < 1) return ['ok' => false, 'error' => 'Transfert impossible (base de données)'];
  $jeton = bin2hex(random_bytes(24));
  $jours = lm2_parametres($db)['acces_jours'];
  lm2_q($db, 'INSERT INTO lm2_acces (transfert_id, interlocuteur_id, dossier_id, jeton_hash, cree_le, expire_le) VALUES (?, ?, ?, ?, NOW(), NOW() + INTERVAL ' . (int) $jours . ' DAY)', 'iiis',
    [$tid, (int) $vers['id'], (int) $d['id'], hash('sha256', $jeton)]);
  lm2_maj($db, (int) $d['id'], ['statut' => 'transfere', 'statut_le' => lm2_maintenant(), 'transfert_id' => $tid, 'assigne_id' => (int) $vers['id'],
    'echeance' => lm2_plus_ouvres(lm2_maintenant(), (int) lm2_parametres($db)['transfert_alerte_jours']), 'alerte_le' => null]);
  lm2_journal($db, (int) $d['id'], $acteur, 'transfert', 'Transféré à ' . lm2_nom($vers) . ' (' . (LM2_ROLES[$vers['role']] ?? $vers['role']) . ($vers['role'] === 'filiale' ? ' ' . (LM2_FILIALES[$vers['filiale']]['lib'] ?? '') : '')
    . ($vers['ville_agence'] ? ', ' . $vers['ville_agence'] : '') . ')' . ($motif !== '' ? ' — motif : ' . $motif : '') . ' ; lien d’accès ponctuel valable ' . $jours . ' jours');
  $d2 = lm2_dossier($db, (int) $d['id']);
  $exp = $de && isset($de['email']) ? (string) $de['email'] : '';
  $st = lm2_email_interlocuteur($db, 'E4', $d2, $vers, ['expert' => lm2_nom($de) ?: $acteur], $message, $jeton, $exp);
  if ($informer && $vers['role'] !== 'filiale')
    lm2_email_dirigeant($db, 'E5', $d2, ['interlocuteur' => lm2_nom($vers), 'role' => mb_strtolower(LM2_ROLES[$vers['role']] ?? ''), 'agence' => $vers['ville_agence'] ? ', ' . $vers['ville_agence'] : '']);
  return ['ok' => true, 'transfert' => $tid, 'email' => $st, 'lien' => lm2_lien_acces($jeton, (int) $d['id'])];
}
/* lien personnel supplémentaire pour le destinataire du transfert actif (alertes, rappel demandé) : même échéance */
function lm2_nouvel_acces(mysqli $db, array $d, array $dest): string {
  $a = lm2_ligne($db, 'SELECT a.* FROM lm2_acces a JOIN lm2_transferts t ON t.id = a.transfert_id WHERE a.transfert_id = ? AND a.interlocuteur_id = ? AND t.actif = 1 AND a.revoque_le IS NULL AND a.expire_le > NOW() ORDER BY a.id DESC LIMIT 1',
    'ii', [(int) $d['transfert_id'], (int) $dest['id']]);
  if (!$a) return '';
  $jeton = bin2hex(random_bytes(24));
  lm2_q($db, 'INSERT INTO lm2_acces (transfert_id, interlocuteur_id, dossier_id, jeton_hash, cree_le, expire_le) VALUES (?, ?, ?, ?, NOW(), ?)', 'iiiss', [(int) $a['transfert_id'], (int) $dest['id'], (int) $d['id'], hash('sha256', $jeton), (string) $a['expire_le']]);
  return $jeton;
}
function lm2_clore_transfert(mysqli $db, int $tid): void {
  lm2_q($db, 'UPDATE lm2_transferts SET actif = 0, rendu_le = IFNULL(rendu_le, NOW()) WHERE id = ?', 'i', [$tid]);
  lm2_q($db, 'UPDATE lm2_acces SET revoque_le = IFNULL(revoque_le, NOW()) WHERE transfert_id = ?', 'i', [$tid]);
}
/* RG-24 : le destinataire rend le lead ; RG-19 : l'expert peut le réaffecter */
function lm2_rendre(mysqli $db, array $d, string $raison, string $acteur): void {
  if ($d['transfert_id']) lm2_clore_transfert($db, (int) $d['transfert_id']);
  lm2_maj($db, (int) $d['id'], ['statut' => 'nouveau', 'statut_le' => lm2_maintenant(), 'transfert_id' => null, 'assigne_id' => null,
    'echeance' => lm2_plus_ouvres(lm2_maintenant(), 1), 'alerte_le' => null]);
  lm2_journal($db, (int) $d['id'], $acteur, 'rendu', 'Lead rendu à l’expert BRH' . ($raison !== '' ? ' : ' . $raison : ''));
}
/* RG-56 : désactivation d'un interlocuteur */
function lm2_desactiver(mysqli $db, int $id, string $acteur): int {
  $n = 0;
  foreach (lm2_lignes($db, "SELECT * FROM lm2_dossiers WHERE assigne_id = ? AND statut <> 'cloture'", 'i', [$id]) as $d) { lm2_rendre($db, $d, 'interlocuteur désactivé', $acteur); $n++; }
  lm2_q($db, 'UPDATE lm2_acces SET revoque_le = IFNULL(revoque_le, NOW()) WHERE interlocuteur_id = ?', 'i', [$id]);
  lm2_q($db, "UPDATE lm2_dossiers SET expert_id = NULL WHERE expert_id = ? AND statut <> 'cloture'", 'i', [$id]);   /* les autres experts de la CR prennent le relais */
  lm2_q($db, 'UPDATE lm2_interlocuteurs SET actif = 0, maj_le = NOW() WHERE id = ?', 'i', [$id]);
  return $n;
}

/* ---------------- IA : script d'appel et e-mail personnalisé (Mistral, contexte anonymisé) ---------------- */
function lm2_contexte_ia(array $d): array {
  $p = lm2_json($d['parcours']);
  return array_filter(['type_lead' => LM2_TYPES[$d['type']]['lib'], 'statut_client' => LM2_CLIENT[$d['client_statut']] ?? '', 'rappel_demande' => (bool) (int) $d['rappel'],
    'secteur' => (string) $d['secteur'], 'effectif' => $d['effectif'] ? (int) $d['effectif'] : null, 'departement' => (string) $d['departement'],
    'priorites' => $p['priorites'] ?? [], 'offres_preconisees' => $p['offres_preconisees'] ?? [], 'offres_consultees' => $p['offres_consultees'] ?? [],
    'solutions' => array_map(static fn($s) => LM2_SOLUTIONS[$s] ?? $s, lm2_liste($d['solutions'])), 'estimation_annuelle' => $d['montant'] ? (int) $d['montant'] : null,
    'convention' => (string) $d['idcc'], 'convention_sante' => isset($p['sante_ccn']) ? ['statut' => $p['sante_ccn']['statut'] ?? '', 'exigences' => $p['sante_ccn']['exigences'] ?? ''] : null,
    'agence_client' => $d['client_statut'] === 'verifie' ? (string) $d['client_agence'] : ''], static fn($v) => $v !== null && $v !== '' && $v !== []);
}
function lm2_mistral(string $systeme, array $donnees, int $max = 900): ?array {
  if (MISTRAL_API_KEY === '' || !function_exists('curl_init')) return null;
  $ch = curl_init('https://api.mistral.ai/v1/chat/completions');
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 40, CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . MISTRAL_API_KEY],
    CURLOPT_POSTFIELDS => lm2_enc(['model' => MISTRAL_MODEL, 'temperature' => 0.4, 'max_tokens' => $max, 'response_format' => ['type' => 'json_object'],
      'messages' => [['role' => 'system', 'content' => $systeme], ['role' => 'user', 'content' => 'DONNÉES (anonymes) : ' . lm2_enc($donnees)]]])]);
  $r = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  if ($r === false || $code >= 400) return null;
  $t = (string) (lm2_json($r)['choices'][0]['message']['content'] ?? '');
  $j = json_decode(preg_replace('/^```(?:json)?\s*|\s*```$/', '', trim($t)), true);
  return is_array($j) ? $j : null;
}
const LM2_IA_REGLES = "Tu aides un expert de la Banque des Ressources Humaines du Crédit Agricole à contacter un dirigeant d'entreprise. Règles absolues : "
  . "(1) n'invente aucun chiffre, tarif, plafond ni garantie ; ne cite que les montants fournis, toujours suivis de « estimation indicative et non contractuelle » ; "
  . "(2) aucune promesse de délai ni de tarif définitif ; (3) ne mentionne jamais le type de lead, un score ni une note interne ; "
  . "(4) n'écris aucun nom propre : utilise exactement les repères [Prénom], [Votre nom] et [Signature] ; (5) français professionnel et chaleureux ; "
  . "(6) réponds uniquement par un objet JSON valide.";
function lm2_ia_script(array $d): ?array {
  $j = lm2_mistral(LM2_IA_REGLES . " TÂCHE : script d'appel téléphonique en cinq temps adapté au type de lead et au statut client (à vérifier : la vérification ouvre le script ; "
    . "client vérifié : rappeler l'agence ; prospect : présenter brièvement le Crédit Agricole et la Banque des RH). Format : {\"blocs\":[{\"titre\":\"Ouverture|Vérifier|Découvrir|Répondre aux objections|Conclure\","
    . "\"duree\":\"20 s\",\"lignes\":[\"phrases d'exemple entre guillemets « » ou consignes courtes\"]}]} — exactement 5 blocs dans cet ordre, 1 à 3 lignes chacun.", lm2_contexte_ia($d), 1100);
  if (!$j || !is_array($j['blocs'] ?? null) || count($j['blocs']) < 5) return null;
  $b = [];
  foreach (array_slice($j['blocs'], 0, 5) as $x) if (is_array($x)) $b[] = ['titre' => lm2_txt($x['titre'] ?? '', 40), 'duree' => lm2_txt($x['duree'] ?? '', 20),
    'lignes' => array_slice(array_values(array_filter(array_map(static fn($l) => lm2_txt($l, 400), (array) ($x['lignes'] ?? [])))), 0, 4)];
  return ['source' => 'mistral', 'blocs' => $b];
}
function lm2_ia_emails(array $d, string $objectif, string $ton): ?array {
  static $obj = ['rdv' => 'proposer un rendez-vous', 'estimation' => 'envoyer la première estimation', 'relance' => 'relancer avec tact', 'convention' => 'répondre sur la convention collective et la santé'];
  $j = lm2_mistral(LM2_IA_REGLES . ' TÂCHE : rédige 3 propositions d’e-mail pour ' . ($obj[$objectif] ?? $obj['rdv']) . ', ton ' . ($ton === 'formel' ? 'formel' : 'cordial')
    . '. Commence par une formule d’appel avec [Prénom], termine par [Signature]. Format : {"propositions":[{"objet":"…","corps":"… (paragraphes séparés par \\n)"}]} — 3 propositions de 80 à 140 mots.', lm2_contexte_ia($d), 1300);
  if (!$j || !is_array($j['propositions'] ?? null)) return null;
  $r = [];
  foreach (array_slice($j['propositions'], 0, 3) as $p) if (is_array($p) && trim((string) ($p['corps'] ?? '')) !== '') $r[] = ['objet' => lm2_txt($p['objet'] ?? '', 160), 'corps' => mb_substr((string) $p['corps'], 0, 3000)];
  return count($r) ? ['source' => 'mistral', 'propositions' => $r] : null;
}

/* ---------------- suivi du dirigeant et Universels (RG-40 à RG-44) ---------------- */
function lm2_mobile(string $t): string { $n = preg_replace('/\D/', '', $t); if (str_starts_with($n, '33')) $n = '0' . substr($n, 2); return preg_match('/^0[67]\d{8}$/', $n) ? $n : ''; }
function lm2_universels_possible(array $d): bool {
  return (bool) array_intersect(['epargne', 'retraite'], lm2_liste($d['solutions'])) && in_array($d['statut'], ['pris_en_charge', 'proposition', 'cloture'], true);   // Q10
}
function lm2_otp_envoyer(mysqli $db, array $d): array {
  if (!lm2_universels_possible($d)) return ['ok' => false, 'error' => 'Accès à l’espace Universels non disponible pour ce dossier'];
  $mob = lm2_mobile((string) $d['telephone']);
  if ($mob === '') return ['ok' => false, 'error' => 'Aucun numéro de mobile dans votre dossier : votre expert vous aide à accéder à votre espace.'];
  $der = lm2_ligne($db, 'SELECT cree_le FROM lm2_otp WHERE dossier_id = ? ORDER BY id DESC LIMIT 1', 'i', [(int) $d['id']]);
  if ($der && strtotime((string) $der['cree_le']) > time() - 30) return ['ok' => false, 'error' => 'Patientez 30 secondes avant de demander un nouveau code.'];
  $n = lm2_ligne($db, 'SELECT COUNT(*) n FROM lm2_otp WHERE dossier_id = ? AND cree_le > NOW() - INTERVAL 1 HOUR', 'i', [(int) $d['id']]);
  if ($n && (int) $n['n'] >= 5) return ['ok' => false, 'error' => 'Trop de codes demandés : réessayez dans une heure ou contactez votre expert.'];
  $code = sprintf('%06d', random_int(0, 999999));
  lm2_q($db, 'INSERT INTO lm2_otp (dossier_id, code_hash, cree_le, expire_le) VALUES (?, ?, NOW(), NOW() + INTERVAL 10 MINUTE)', 'is', [(int) $d['id'], hash('sha256', $d['jeton'] . $code)]);
  $masque = substr($mob, 0, 2) . ' •• •• •• ' . substr($mob, -2);
  lm2_journal($db, (int) $d['id'], 'Portail (automatique)', 'sms', (LM2_SMS_SIMULE ? 'SMS simulé (prototype) au ' : 'SMS envoyé au ') . $masque . ' : code de vérification Universels' . (LM2_SMS_SIMULE ? ' ' . $code : ''));
  return ['ok' => true, 'masque' => $masque] + (LM2_SMS_SIMULE ? ['code_demo' => $code] : []);
}
function lm2_otp_verifier(mysqli $db, array $d, string $code): array {
  $o = lm2_ligne($db, 'SELECT * FROM lm2_otp WHERE dossier_id = ? AND valide_le IS NULL ORDER BY id DESC LIMIT 1', 'i', [(int) $d['id']]);
  if (!$o || strtotime((string) $o['expire_le']) < time()) return ['ok' => false, 'error' => 'Code expiré : demandez un nouveau code.'];
  if ((int) $o['essais'] >= 3) return ['ok' => false, 'error' => 'Trois essais au plus : demandez un nouveau code.'];
  if (!hash_equals((string) $o['code_hash'], hash('sha256', $d['jeton'] . preg_replace('/\D/', '', $code)))) {
    lm2_q($db, 'UPDATE lm2_otp SET essais = essais + 1 WHERE id = ?', 'i', [(int) $o['id']]);
    return ['ok' => false, 'error' => 'Code incorrect (' . (2 - (int) $o['essais']) . ' essai(s) restant(s)).'];
  }
  lm2_q($db, 'UPDATE lm2_otp SET valide_le = NOW() WHERE id = ?', 'i', [(int) $o['id']]);
  lm2_maj($db, (int) $d['id'], ['universels_le' => lm2_maintenant()]);
  lm2_journal($db, (int) $d['id'], 'Dirigeant', 'universels', 'Accès à l’espace Universels après vérification par SMS', false);
  $url = LM2_UNIVERSELS_URL !== '' ? LM2_UNIVERSELS_URL : lm2_url('universels-demo.html?d=' . rawurlencode((string) $d['reference']) . '&j=' . $d['jeton']);
  return ['ok' => true, 'url' => $url];
}

/* ---------------- tâches planifiées (lm-cron.php, et au passage dans la console) ---------------- */
function lm2_taches(mysqli $db, bool $force = false): array {
  $der = (int) lm2_meta($db, 'taches_le', '0');
  if (!$force && $der > time() - 60 * (int) LM_TACHES_MINUTES) return ['fait' => false];
  $verrou = lm2_ligne($db, "SELECT GET_LOCK('lm2_taches', 0) AS v");   /* jamais deux passages simultanés (tâche cron et console) */
  if (!$verrou || (int) $verrou['v'] !== 1) return ['fait' => false];
  try { return lm2_taches_($db); } finally { $db->query("SELECT RELEASE_LOCK('lm2_taches')"); }
}
/* demandes des sites qui deviennent des leads : types connus, sites suivis (requête sans variable externe) */
function lm2_filtre_leads(string $a): string {
  $q = static fn(array $xs): string => implode(', ', array_map(static fn($x) => "'" . preg_replace('/[^a-z0-9_]/i', '', (string) $x) . "'", $xs));
  return $a . '.type IN (' . $q(array_keys(LM2_TYPE_DEMANDE)) . ') AND ' . $a . '.version IN (' . $q(LM_VERSIONS) . ')';
}
function lm2_taches_(mysqli $db): array {
  lm2_meta_ecrire($db, 'taches_le', (string) time());
  $out = ['fait' => true, 'integres' => 0, 'relances' => 0, 'alertes' => 0, 'recap' => 0, 'renvois' => 0];
  /* demandes des sites pas encore intégrées (mode base partagée et rattrapage) ; une demande en erreur ne bloque pas les suivantes */
  foreach (lm2_lignes($db, 'SELECT l.id FROM ' . LM_TABLE_LEADS . ' l LEFT JOIN lm2_demandes d ON d.lead_id = l.id WHERE d.id IS NULL AND l.consentement = 1 AND ' . lm2_filtre_leads('l') . ' AND l.cree_le >= (NOW() - INTERVAL ' . (int) LM_RATTRAPAGE_JOURS . ' DAY) ORDER BY l.id LIMIT 200') as $l) {
    try { if (lm2_integrer($db, (int) $l['id'])) $out['integres']++; } catch (\Throwable $x) { error_log('LM2 : demande ' . (int) $l['id'] . ' non intégrée : ' . $x->getMessage()); }
  }
  /* relances J+1 et J+7 des leads qualifiés non pris en charge (E6), avec consentement */
  foreach (lm2_lignes($db, "SELECT * FROM lm2_dossiers WHERE type = 'qualifie' AND statut = 'nouveau' AND consent_relance = 1 AND relances < 2 AND email IS NOT NULL
      AND ((relances = 0 AND cree_le <= NOW() - INTERVAL 1 DAY) OR (relances = 1 AND cree_le <= NOW() - INTERVAL 7 DAY))") as $d) {
    $p = lm2_json($d['parcours']);
    lm2_email_dirigeant($db, 'E6', $d, ['resultat' => isset($p['gain_fiscal']) ? "\nGain estimé par votre diagnostic : " . lm2_eur($p['gain_fiscal']) . " par an (estimation indicative et non contractuelle).\n" : '']);
    lm2_maj($db, (int) $d['id'], ['relances' => (int) $d['relances'] + 1]);
    lm2_journal($db, (int) $d['id'], 'Tâche planifiée', 'relance', 'Relance ' . ((int) $d['relances'] === 0 ? 'J+1' : 'J+7') . ' envoyée au dirigeant');
    $out['relances']++;
  }
  /* RG-05 et RG-25 : échéance dépassée (E7 à l'expert, et au destinataire d'un transfert) */
  foreach (lm2_lignes($db, "SELECT * FROM lm2_dossiers WHERE statut IN ('nouveau', 'transfere') AND echeance IS NOT NULL AND echeance < NOW() AND alerte_le IS NULL") as $d) {
    $raison = $d['statut'] === 'transfere' ? 'transfert non pris en charge depuis ' . (int) lm2_parametres($db)['transfert_alerte_jours'] . ' jours ouvrés' : 'échéance du ' . lm2_date_fr($d['echeance']) . ' dépassée';
    $dest = $d['expert_id'] ? array_filter([lm2_interlocuteur($db, (int) $d['expert_id'])]) : lm2_experts_cr($db, $d['cr_code']);
    if ($d['statut'] === 'transfere' && $d['assigne_id']) { $x = lm2_interlocuteur($db, (int) $d['assigne_id']); if ($x) $dest[] = $x; }
    foreach ($dest as $x) lm2_email_interlocuteur($db, 'E7', $d, $x, ['raison' => $raison]);
    lm2_maj($db, (int) $d['id'], ['alerte_le' => lm2_maintenant()]);
    lm2_journal($db, (int) $d['id'], 'Tâche planifiée', 'alerte', 'Alerte délai : ' . $raison . ($dest ? '' : ' (aucun expert BRH actif dans l’annuaire de la CR)'));
    $out['alertes']++;
  }
  /* S2 : récapitulatif quotidien des leads qualifiés, à partir de 8 h */
  if ((int) date('G') >= 8 && lm2_meta($db, 'recap_le', '') !== date('Y-m-d') && lm2_ouvre(new DateTimeImmutable())) {
    /* depuis le dernier récapitulatif : les leads du week-end et des jours fériés ne sont pas oubliés */
    $depuis = (string) lm2_meta($db, 'recap_depuis', date('Y-m-d H:i:s', time() - 86400)); $jusque = lm2_maintenant();
    lm2_meta_ecrire($db, 'recap_le', date('Y-m-d')); lm2_meta_ecrire($db, 'recap_depuis', $jusque);
    foreach (lm2_lignes($db, "SELECT DISTINCT cr_code FROM lm2_dossiers WHERE type = 'qualifie' AND statut = 'nouveau' AND cree_le > ? AND cree_le <= ? AND cr_code IS NOT NULL", 'ss', [$depuis, $jusque]) as $c) {
      $ls = lm2_lignes($db, "SELECT * FROM lm2_dossiers WHERE cr_code = ? AND type = 'qualifie' AND statut = 'nouveau' AND cree_le > ? AND cree_le <= ? ORDER BY echeance", 'sss', [$c['cr_code'], $depuis, $jusque]);
      $txt = implode("\n", array_map(static fn($d) => '• ' . ($d['raison_sociale'] ?: 'Entreprise') . ' (' . ($d['ville'] ?: '?') . ($d['effectif'] ? ', ' . $d['effectif'] . ' salariés' : '') . ') — ' . lm2_lien_fiche((int) $d['id']), $ls));
      foreach (lm2_experts_cr($db, (string) $c['cr_code']) as $x) {
        $m = lm2_modeles($db)['R']; $cr = lm2_cr($db, (string) $c['cr_code']);
        $v = ['destinataire' => $x['prenom'], 'caisse' => 'Crédit Agricole ' . ($cr['nom'] ?? ''), 'liste' => $txt, 'nombre' => count($ls)];
        $t = lm2_remplir($m['texte'], $v); $pied = 'Les liens ouvrent les fiches après connexion à votre compte. E-mail interne Crédit Agricole : ne pas transférer.';
        lm2_email($db, null, 'R', 'interlocuteur', (string) $x['email'], lm2_nom($x), lm2_remplir($m['objet'], $v), $t . "\n\n" . $pied, lm2_html($m['lib'], $t, [], [['Ouvrir ma console', lm2_url('console.html')]], $pied), '', $x);
        $out['recap']++;
      }
    }
  }
  /* file d'attente : nouvel essai des envois en échec (3 essais au plus) */
  foreach (lm2_lignes($db, "SELECT id FROM lm2_emails WHERE statut = 'echec' AND essais < 3 AND cree_le >= NOW() - INTERVAL 2 DAY LIMIT 50") as $e) { lm2_envoyer_file($db, (int) $e['id']); $out['renvois']++; }
  /* conservation : 12 mois */
  $mois = (int) BRH_LEADS_CONSERVATION_MOIS;
  foreach (['lm2_journal', 'lm2_emails', 'lm2_comptes_rendus'] as $t) $db->query("DELETE FROM $t WHERE cree_le < (NOW() - INTERVAL $mois MONTH)");
  $db->query("DELETE FROM lm2_dossiers WHERE maj_le < (NOW() - INTERVAL $mois MONTH)");
  foreach (['lm2_demandes', 'lm2_transferts', 'lm2_acces', 'lm2_comptes_rendus', 'lm2_otp', 'lm2_journal'] as $t) $db->query("DELETE FROM $t WHERE dossier_id NOT IN (SELECT id FROM lm2_dossiers)");
  $db->query("DELETE FROM lm2_otp WHERE cree_le < (NOW() - INTERVAL 2 DAY)");
  return $out;
}
