<?php
/* Module LM 2.0.4 — 23/11/2026 · interrupteur de pause « pause.flag » (demande du DPO) · historique : VERSIONS.md */
/* Module LM 2.0 — 15/11/2026 · connexion MySQL et table des demandes « leads » (inchangée depuis 1.0, copie autonome de leads-base.php) · historique : VERSIONS.md */
/* ============================================================================
   lm-db.php — MODULE LEAD MANAGEMENT AUTONOME : connexion MySQL et table des demandes « leads ».
   Copie autonome de leads-base.php des sites du portail (même table, mêmes colonnes) :
     - mode « base partagée » : les sites écrivent dans cette table (leur lead.php), le module la lit ;
     - mode « API » : collecte.php écrit dans cette table pour le compte des sites.
   Nom de la table modifiable : const LM_TABLE_LEADS = 'leads'; (config.php). Ne s'exécute pas seul.
   ============================================================================ */
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
/* INTERRUPTEUR DE PAUSE (LM 2.0.4, demande du DPO) : fichier « pause.flag » dans le dossier du module.
   Tous les scripts (collecte, API de la console, « Mon dossier », tâches planifiées) chargent ce fichier en premier :
   aucune donnée n'est reçue, affichée ni envoyée tant que pause.flag existe. */
if (is_file(__DIR__ . '/pause.flag')) {
  $lmPause = ['ok' => false, 'pause' => true, 'error' => 'Module en pause : aucune information n\'est reçue ni affichée.'];
  if (PHP_SAPI === 'cli') { echo json_encode(['ok' => true] + $lmPause, JSON_UNESCAPED_UNICODE), "\n"; exit(0); }
  while (ob_get_level() > 0) ob_end_clean();
  http_response_code(503); header('Retry-After: 86400'); header('Cache-Control: no-store');
  header('Content-Type: application/json; charset=utf-8'); header('X-Robots-Tag: noindex, nofollow');
  echo json_encode($lmPause, JSON_UNESCAPED_UNICODE); exit;
}

if (!defined('LM_TABLE_LEADS')) define('LM_TABLE_LEADS', 'leads');   // table des demandes écrite par les sites (mode base partagée) ou par collecte.php
if (!preg_match('/^[a-z0-9_]{1,40}$/', LM_TABLE_LEADS)) { http_response_code(500); exit('LM_TABLE_LEADS invalide'); }
if (!defined('BRH_LEADS_CONSERVATION_MOIS')) define('BRH_LEADS_CONSERVATION_MOIS', 12);   // durée de conservation des demandes des dirigeants

if (!function_exists('brh_leads_db')) {
function brh_leads_db(): ?mysqli {
  if (!defined('DB_HOST')) return null;
  mysqli_report(MYSQLI_REPORT_OFF);
  $db = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
  if ($db->connect_errno) return null;
  $db->set_charset('utf8mb4');
  $db->query(
    "CREATE TABLE IF NOT EXISTS " . LM_TABLE_LEADS . " (
       id INT AUTO_INCREMENT PRIMARY KEY,
       cree_le DATETIME NOT NULL,
       version CHAR(1) NOT NULL DEFAULT 'S',
       type VARCHAR(40) NOT NULL,
       reference VARCHAR(40),
       prenom VARCHAR(100), nom VARCHAR(120), email VARCHAR(190), telephone VARCHAR(40), fonction VARCHAR(120),
       rappel_expert TINYINT NOT NULL DEFAULT 0,
       consentement TINYINT NOT NULL DEFAULT 0, consentement_le VARCHAR(40),
       raison_sociale VARCHAR(190), siret VARCHAR(14), code_postal VARCHAR(10), ville VARCHAR(120), departement VARCHAR(3),
       effectif INT, secteur VARCHAR(120), idcc VARCHAR(120),
       montant_estime INT NULL, score_label INT NULL,
       statut VARCHAR(20) NOT NULL DEFAULT 'nouveau',
       etape VARCHAR(60), jeton CHAR(32),
       donnees MEDIUMTEXT, page VARCHAR(255), ip VARCHAR(64),
       INDEX (cree_le), INDEX (email), INDEX (type)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  );
  /* colonnes ajoutées en V2.1 (suivi de l'étape atteinte d'un devis en cours) */
  $c = $db->query("SHOW COLUMNS FROM " . LM_TABLE_LEADS . " LIKE 'etape'");
  if ($c && $c->num_rows === 0) $db->query('ALTER TABLE ' . LM_TABLE_LEADS . ' ADD COLUMN etape VARCHAR(60) NULL AFTER statut, ADD COLUMN jeton CHAR(32) NULL AFTER etape');
  /* durée de conservation : 12 mois (décision du 13/11/2026), purge à chaque connexion à la base */
  $db->query('DELETE FROM ' . LM_TABLE_LEADS . ' WHERE cree_le < (NOW() - INTERVAL ' . BRH_LEADS_CONSERVATION_MOIS . ' MONTH)');
  return $db;
}

}
/* libellés des types de demande */
if (!defined('BRH_LEAD_TYPES')) define('BRH_LEAD_TYPES', [
  'devis' => 'Devis en ligne', 'rappel_expert' => 'Rappel expert (devis)', 'diagnostic_contact' => 'Contact — diagnostic RH',
  'devis_en_cours' => 'Devis commencé (e-mail laissé)', 'diagnostic_estimation' => 'Estimation demandée par e-mail',
  'label_resultats' => 'Label BRH — résultats', 'label_contact' => 'Contact — Label BRH', 'audit_mutuelle_prevoyance' => 'Audit mutuelle',
  'newsletter' => 'Inscription newsletter', 'contact' => 'Contact',
]);
