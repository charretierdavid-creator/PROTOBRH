-- ============================================================
-- Table des avis (feedback prototype) — « Banque des RH info »
-- Optionnel : feedback.php crée déjà cette table automatiquement.
-- À exécuter dans phpMyAdmin (Hostinger) si tu préfères la créer à la main.
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  cree_le          DATETIME NOT NULL,
  version          CHAR(1) NOT NULL DEFAULT 'S',   -- version du prototype : S standard, A ou B (test A/B)
  prenom           VARCHAR(100),
  nom              VARCHAR(100),
  email            VARCHAR(190),
  note_infos       TINYINT,   -- Informations & approche besoin (0-5)
  note_diagnostic  TINYINT,   -- Diagnostic / Simulateur (0-5)
  note_newsletter  TINYINT,   -- Newsletter (0-5)
  note_chatbot     TINYINT,   -- Chatbot (0-5)
  note_pertinence  TINYINT,   -- Pertinence (0-5)
  note_facilite    TINYINT,   -- Facilité d'utilisation (0-5)
  note_valeur      TINYINT,   -- Valeur ajoutée (0-5)
  commentaires     TEXT,
  page             VARCHAR(255),
  ip               VARCHAR(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table créée avant le test A/B : feedback.php ajoute la colonne automatiquement, ou à la main :
-- ALTER TABLE feedback ADD COLUMN version CHAR(1) NOT NULL DEFAULT 'S' AFTER cree_le;
