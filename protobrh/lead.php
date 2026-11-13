<?php
/* ============================================================================
   lead.php — enregistre les demandes des dirigeants (leads) dans MySQL.
   Appelé par : devis en ligne (devis, rappel expert), diagnostic RH (contact),
   Label BRH (résultats, contact) et audit mutuelle. Sites S, A et B.
   - Même base que feedback.php (identifiants dans config.php, jamais sur GitHub).
   - La table « leads » est créée automatiquement au premier envoi.
   - Aucune donnée n'est enregistrée sans le consentement explicite du dirigeant.
   - La version du prototype (S, A, B) est déduite de l'adresse du site.
   - Consultation et export : admin-leads.php (accès séparé, mot de passe d'administration).
   ============================================================================ */

declare(strict_types=1);
require_once __DIR__ . '/acces.php'; brh_acces_api();   // accès réservé aux personnes connectées (porte d'accès)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/config.php';                   // identifiants MySQL (fichier présent uniquement sur Hostinger)
require_once __DIR__ . '/leads-base.php';

$raw = (string) file_get_contents('php://input');
if (strlen($raw) > 200000) { http_response_code(413); echo json_encode(['ok' => false, 'error' => 'Demande trop volumineuse']); exit; }
$in = json_decode($raw, true);
if (!is_array($in)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'Requête invalide']); exit; }

/* ---------- lecture tolérante : les formulaires du portail n'utilisent pas tous les mêmes noms ---------- */
$t = static fn($v, int $n = 190): string => mb_substr(trim(is_scalar($v) ? (string) $v : ''), 0, $n);
$c = is_array($in['contact'] ?? null) ? $in['contact'] : (is_array($in['contexte'] ?? null) ? $in['contexte'] : []);
$e = is_array($in['entreprise'] ?? null) ? $in['entreprise'] : (is_array($in['company'] ?? null) ? $in['company'] : []);
if (!$e && is_array($c['entreprise'] ?? null)) $e = $c['entreprise'];
$prem = static function (array $a, array $cles) { foreach ($cles as $k) if (isset($a[$k]) && $a[$k] !== '' && $a[$k] !== null) return $a[$k]; return null; };

$prenom = $t($prem($c, ['prenom']), 100);
$nom    = $t($prem($c, ['nom', 'name']), 120);
if ($prenom === '' && $nom !== '' && !isset($c['prenom']) && str_contains($nom, ' ')) { [$prenom, $nom] = explode(' ', $nom, 2); }   // « Prénom Nom » saisi d'un bloc
$email  = $t($prem($c, ['email', 'mail']));
$tel    = $t($prem($c, ['telephone', 'tel', 'phone']), 40);
$fonct  = $t($prem($c, ['fonction', 'poste']), 120);
$consent = (bool) ($prem($c, ['consentement', 'consent']) ?? ($in['consentement'] ?? $in['consent'] ?? false));
$consentLe = $t($prem($c, ['consentement_date', 'consentDate']) ?? '', 40);
$rappel = (int) (bool) ($prem($c, ['rappel_expert', 'rappel']) ?? (($in['type'] ?? '') === 'rappel_expert'));

$raison = $t($prem($e, ['raison_sociale', 'nom', 'raison', 'companyName']) ?? $prem($c, ['companyName', 'entreprise']), 190);
$siret  = preg_replace('/\D/', '', (string) ($prem($e, ['siret', 'siren']) ?? ''));
$cp     = $t($prem($e, ['code_postal', 'cp']), 10);
$ville  = $t($prem($e, ['ville']), 120);
$dep    = $t($prem($e, ['departement']) ?? ($cp !== '' ? substr($cp, 0, 2) : ''), 3);
$eff    = (int) ($prem($e, ['effectif', 'employeeCount']) ?? ($in['rh']['salaries_concernes'] ?? 0));
$secteur = $t($prem($e, ['secteur', 'sector']), 120);
$idcc   = $t($prem($e, ['idcc']), 120);

$type = $t($in['type'] ?? '', 40);
if ($type === '') $type = isset($in['panier']) ? 'devis' : (isset($in['labelBrh']) ? 'label_contact' : (isset($in['fiscalGain']) ? 'diagnostic_contact' : 'contact'));
$type = preg_replace('/[^a-z0-9_]/', '', strtolower($type));
$ref     = $t($in['reference'] ?? '', 40);
$montant = isset($in['estimation_totale']) ? (int) $in['estimation_totale'] : (isset($in['fiscalGain']['total']) ? (int) $in['fiscalGain']['total'] : null);
$score   = isset($in['labelBrh']['score']) ? (int) $in['labelBrh']['score'] : (isset($in['score']) ? (int) $in['score'] : null);
$page    = $t($in['page'] ?? ($_SERVER['HTTP_REFERER'] ?? ''), 255);

/* ---------- contrôles ---------- */
if (!$consent) { echo json_encode(['ok' => false, 'error' => 'Consentement requis : rien n\'a été enregistré.']); exit; }
if ($email === '' && $tel === '') { echo json_encode(['ok' => false, 'error' => 'E-mail ou téléphone requis']); exit; }
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) { echo json_encode(['ok' => false, 'error' => 'E-mail non valide']); exit; }

$version = preg_match('/^protobrh([ab])\./i', (string) ($_SERVER['HTTP_HOST'] ?? ''), $m) ? strtoupper($m[1]) : 'S';
$ip = mb_substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
$donnees = json_encode($in, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);

/* ---------- enregistrement ---------- */
$db = brh_leads_db();
if (!$db) { http_response_code(500); echo json_encode(['ok' => false, 'error' => 'Connexion base impossible']); exit; }
$stmt = $db->prepare('INSERT INTO leads (cree_le, version, type, reference, prenom, nom, email, telephone, fonction, rappel_expert,
    consentement, consentement_le, raison_sociale, siret, code_postal, ville, departement, effectif, secteur, idcc, montant_estime, score_label,
    donnees, page, ip) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
if (!$stmt) { http_response_code(500); echo json_encode(['ok' => false, 'error' => 'Préparation impossible']); exit; }
$stmt->bind_param('ssssssssissssssissiisss', $version, $type, $ref, $prenom, $nom, $email, $tel, $fonct, $rappel,
  $consentLe, $raison, $siret, $cp, $ville, $dep, $eff, $secteur, $idcc, $montant, $score, $donnees, $page, $ip);
$ok = $stmt->execute();
echo json_encode($ok ? ['ok' => true, 'id' => $db->insert_id] : ['ok' => false, 'error' => 'Enregistrement impossible']);
