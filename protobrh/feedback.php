<?php
/* ============================================================================
   feedback.php — enregistre les avis du widget de feedback dans MySQL.
   À placer dans le dossier du site (à côté de feedback-widget.js).
   Renseigne les 4 lignes de CONFIG (identifiants MySQL Hostinger).
   La table « feedback » est créée automatiquement au premier envoi.
   Test A/B : les sites A (protobrha) et B (protobrhb) utilisent le même config.php, donc la même
   base que protobrh ; la colonne « version » indique d'où vient l'avis : S (standard), A ou B.
   ============================================================================ */

declare(strict_types=1);
require_once __DIR__ . '/acces.php'; brh_acces_api();   // accès réservé aux personnes connectées (porte d'accès)
header('Content-Type: application/json; charset=utf-8');

/* ===================== CONFIG MySQL (à renseigner) =====================
   Dans hPanel Hostinger → Bases de données → MySQL :
   crée une base + un utilisateur, puis recopie les valeurs ci-dessous. */
require_once __DIR__ . '/config.php';   // identifiants MySQL (fichier présent uniquement sur Hostinger)
$DB_HOST = DB_HOST;
$DB_NAME = DB_NAME;
$DB_USER = DB_USER;
$DB_PASS = DB_PASS;

/* ===================== Lecture de la requête ===================== */
$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Requête invalide']); exit; }

$prenom = mb_substr(trim((string)($in['prenom'] ?? '')), 0, 100);
$nom    = mb_substr(trim((string)($in['nom'] ?? '')), 0, 100);
$email  = mb_substr(trim((string)($in['email'] ?? '')), 0, 190);
$comm   = mb_substr(trim((string)($in['commentaires'] ?? '')), 0, 4000);
$page   = mb_substr(preg_replace('/^\[(REF|A|B)\]\s*/', '', trim((string)($in['page'] ?? ''))), 0, 255);   // ancien widget en cache : préfixe retiré
$notes  = is_array($in['notes'] ?? null) ? $in['notes'] : [];

if ($prenom === '' || $nom === '') { echo json_encode(['ok'=>false,'error'=>'Prénom et nom requis']); exit; }
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) { echo json_encode(['ok'=>false,'error'=>'E-mail non valide']); exit; }

/* note 0..5 (0 = non renseignée) */
$note = function($k) use ($notes) { $v=(int)($notes[$k] ?? 0); return ($v>=0 && $v<=5) ? $v : 0; };
$n_infos=$note('infos'); $n_diag=$note('diagnostic'); $n_news=$note('newsletter'); $n_chat=$note('chatbot');
$n_pert=$note('pertinence'); $n_faci=$note('facilite'); $n_val=$note('valeur');

$ip = mb_substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);

/* version du prototype déduite de l'adresse du site (et non de la requête) : S standard, A ou B */
$version = preg_match('/^protobrh([ab])\./i', (string)($_SERVER['HTTP_HOST'] ?? ''), $m) ? strtoupper($m[1]) : 'S';

/* ===================== Connexion + insertion ===================== */
mysqli_report(MYSQLI_REPORT_OFF);
$db = @new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($db->connect_errno) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'Connexion base impossible']); exit; }
$db->set_charset('utf8mb4');

$db->query(
  "CREATE TABLE IF NOT EXISTS feedback (
     id INT AUTO_INCREMENT PRIMARY KEY,
     cree_le DATETIME NOT NULL,
     version CHAR(1) NOT NULL DEFAULT 'S',
     prenom VARCHAR(100), nom VARCHAR(100), email VARCHAR(190),
     note_infos TINYINT, note_diagnostic TINYINT, note_newsletter TINYINT, note_chatbot TINYINT,
     note_pertinence TINYINT, note_facilite TINYINT, note_valeur TINYINT,
     commentaires TEXT, page VARCHAR(255), ip VARCHAR(64)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
);
/* table créée avant le test A/B : ajout de la colonne « version » (une seule fois) ;
   les avis déjà envoyés par A ou B portaient la version en tête de « page » ([A] /index.html) */
$col = $db->query("SHOW COLUMNS FROM feedback LIKE 'version'");
if ($col && $col->num_rows === 0) {
  $db->query("ALTER TABLE feedback ADD COLUMN version CHAR(1) NOT NULL DEFAULT 'S' AFTER cree_le");
  $db->query("UPDATE feedback SET version = IF(page LIKE '[REF] %', 'S', SUBSTRING(page, 2, 1)), page = TRIM(SUBSTRING(page, LOCATE(']', page) + 1))
               WHERE page LIKE '[REF] %' OR page LIKE '[A] %' OR page LIKE '[B] %'");
}

$sql = "INSERT INTO feedback
   (cree_le, version, prenom, nom, email, note_infos, note_diagnostic, note_newsletter, note_chatbot,
    note_pertinence, note_facilite, note_valeur, commentaires, page, ip)
   VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $db->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'Préparation impossible']); exit; }
$stmt->bind_param(
  'ssssiiiiiiisss',
  $version, $prenom, $nom, $email,
  $n_infos, $n_diag, $n_news, $n_chat, $n_pert, $n_faci, $n_val,
  $comm, $page, $ip
);
$ok = $stmt->execute();
$stmt->close(); $db->close();

echo json_encode($ok ? ['ok'=>true] : ['ok'=>false,'error'=>'Enregistrement impossible']);
