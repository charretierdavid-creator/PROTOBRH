<?php
/* ============================================================================
   leads-base.php — connexion MySQL et création de la table « leads ».
   Inclus par lead.php (enregistrement) et admin-leads.php (consultation).
   Ne s'exécute pas seul.
   ============================================================================ */
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

const BRH_LEADS_CONSERVATION_MOIS = 12;   // durée de conservation des demandes des dirigeants

function brh_leads_db(): ?mysqli {
  if (!defined('DB_HOST')) return null;
  mysqli_report(MYSQLI_REPORT_OFF);
  $db = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
  if ($db->connect_errno) return null;
  $db->set_charset('utf8mb4');
  $db->query(
    "CREATE TABLE IF NOT EXISTS leads (
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
  $c = $db->query("SHOW COLUMNS FROM leads LIKE 'etape'");
  if ($c && $c->num_rows === 0) $db->query('ALTER TABLE leads ADD COLUMN etape VARCHAR(60) NULL AFTER statut, ADD COLUMN jeton CHAR(32) NULL AFTER etape');
  /* durée de conservation : 12 mois (décision du 13/11/2026), purge à chaque connexion à la base */
  $db->query('DELETE FROM leads WHERE cree_le < (NOW() - INTERVAL ' . BRH_LEADS_CONSERVATION_MOIS . ' MONTH)');
  return $db;
}

/* libellés des types de demande */
const BRH_LEAD_TYPES = [
  'devis' => 'Devis en ligne', 'rappel_expert' => 'Rappel expert (devis)', 'diagnostic_contact' => 'Contact — diagnostic RH',
  'devis_en_cours' => 'Devis commencé (e-mail laissé)', 'diagnostic_estimation' => 'Estimation demandée par e-mail',
  'label_resultats' => 'Label BRH — résultats', 'label_contact' => 'Contact — Label BRH', 'audit_mutuelle_prevoyance' => 'Audit mutuelle',
  'newsletter' => 'Inscription newsletter', 'contact' => 'Contact',
];
