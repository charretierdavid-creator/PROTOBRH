<?php
/* Version C 2.0 — 15/11/2026 · lead management sorti de C : relais vers le module (cockpitbrh.monsitedetest.com), repli sur la table leads du socle · historique : VERSIONS.md */
/* ============================================================================
   lead.php (version C) — reçoit les demandes des dirigeants (devis, rappel, diagnostic, Label BRH,
   audit, newsletter) envoyées par les pages avec  fetch('lead.php', …).

   Depuis la C 2.0, le lead management (niveaux, Dossier BRH, routage, e-mails, cockpit, suivi du
   dirigeant) n'est plus dans la version C : il vit dans le module commun aux sites S, A, B et C,
   hébergé sur cockpitbrh.monsitedetest.com (module LM). Ce fichier choisit tout seul son mode :

   1. MODULE BRANCHÉ — LM_HUB_URL et LM_HUB_CLE présents dans le config.php du site :
        la demande est transmise, de serveur à serveur, à collecte.php du module, qui renvoie
        id, jeton, dossier, caisse, canal et lien de suivi. Le suivi d'étape et l'argumentaire de
        vente passent par le même chemin. Module injoignable : la demande consentie est mise en
        file d'attente (hors du dossier public si possible) et renvoyée aux appels suivants.
          const LM_HUB_URL = 'https://cockpitbrh.monsitedetest.com/';
          const LM_HUB_CLE = '…';   // clé de ce site, la même que dans LM_CLES du module
   2. MODULE NON BRANCHÉ (repli) — ces constantes sont absentes :
        la demande est enregistrée dans la table « leads » du socle, exactement comme sur les sites
        S, A et B (même base, consultation dans admin-leads.php). Rien n'est perdu : le module, en
        mode « base partagée », reprendra ces demandes. L'argumentaire de vente de l'IA est gardé
        dans la colonne « donnees » de la demande (clé argumentaire_ia).

   Dans les deux cas : rien n'est enregistré sans consentement explicite, et le niveau du lead
   (abandonniste, chaud, ultra-chaud) n'est jamais renvoyé au navigateur du dirigeant.
   ============================================================================ */

declare(strict_types=1);
require_once __DIR__ . '/acces.php'; brh_acces_api();   // accès réservé aux personnes connectées (porte d'accès)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (is_file(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';   // fichier présent uniquement sur Hostinger

$raw = (string) file_get_contents('php://input');
if (strlen($raw) > 200000) { http_response_code(413); echo json_encode(['ok' => false, 'error' => 'Demande trop volumineuse']); exit; }
$in = json_decode($raw, true);
if (!is_array($in)) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'Requête invalide']); exit; }

function lead_sortir(array $r, int $code = 200): void {
  unset($r['niveau'], $r['niveau_lead']);                 // jamais le niveau du lead côté dirigeant
  http_response_code($code); echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
$HUB = defined('LM_HUB_URL') && defined('LM_HUB_CLE') && (string) constant('LM_HUB_URL') !== '' && strlen((string) constant('LM_HUB_CLE')) >= 24 && function_exists('curl_init');
/* module déclaré mais mal configuré (clé trop courte, adresse vide, curl absent) : la demande est gardée dans la table
   leads (rien n'est perdu) et l'anomalie est écrite dans le journal d'erreurs du serveur pour être corrigée */
if (!$HUB && (defined('LM_HUB_URL') || defined('LM_HUB_CLE'))) error_log('lead.php (version C) : module lead management déclaré mais mal configuré (LM_HUB_URL, LM_HUB_CLE de 24 caractères au moins, extension curl) — demande enregistrée dans la table leads du socle');

/* =====================================================================================
   1. MODULE BRANCHÉ : relais vers collecte.php (même logique que sites/lead.php du module LM)
   ===================================================================================== */
if ($HUB) {
  /* file d'attente : hors du dossier public si possible (Hostinger : domains/<domaine>/lm-attente-…), sinon lm-attente/ protégé */
  $attenteDossier = static function (): string {
    if (defined('LM_HUB_ATTENTE') && (string) constant('LM_HUB_ATTENTE') !== '') return rtrim((string) constant('LM_HUB_ATTENTE'), '/');
    $hors = dirname(__DIR__) . '/lm-attente-' . substr(hash('sha256', __DIR__), 0, 10);
    if (is_dir($hors) || @mkdir($hors, 0700)) return $hors;
    return __DIR__ . '/lm-attente';
  };
  $proteger = static function (string $dir): void {
    if (!is_dir($dir)) @mkdir($dir, 0700);
    if (strpos($dir, __DIR__) === 0) @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
  };
  /* envoi au module : [code HTTP, réponse décodée] — code 0 = injoignable */
  $envoyer = static function (string $corps, string $ip, string $page): array {
    $ch = curl_init(rtrim((string) constant('LM_HUB_URL'), '/') . '/collecte.php');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $corps, CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 10, CURLOPT_FOLLOWLOCATION => false,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-LM-Cle: ' . (string) constant('LM_HUB_CLE'), 'X-LM-IP: ' . $ip, 'X-LM-Page: ' . mb_substr($page, 0, 255)]]);
    $r = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $j = is_string($r) ? json_decode($r, true) : null;
    return [$r === false ? 0 : $code, is_array($j) ? $j : null];
  };
  /* réponse définitive : reçue (2xx) ou refusée pour son contenu (400, 405, 413) ; le reste se réessaie */
  $definitif = static fn(int $c, ?array $rep): bool => ($c >= 200 && $c < 300) || (in_array($c, [400, 405, 413], true) && $rep !== null);
  $vider = static function (string $dir) use ($envoyer, $definitif): void {
    if (!is_dir($dir)) return;
    foreach (array_slice(glob($dir . '/*.json') ?: [], 0, 10) as $f) {
      $prise = $f . '.envoi';
      if (!@rename($f, $prise)) continue;
      if (filemtime($prise) < time() - 7 * 86400) { @unlink($prise); continue; }
      $x = json_decode((string) @file_get_contents($prise), true);
      if (!is_array($x)) { @unlink($prise); continue; }
      [$c, $r] = $envoyer((string) $x['corps'], (string) $x['ip'], (string) $x['page']);
      if ($definitif($c, $r)) { @unlink($prise); continue; }
      @rename($prise, $f);
      if ($c === 0 || $c >= 500) return;
    }
    foreach (glob($dir . '/*.json.envoi') ?: [] as $f) if (filemtime($f) < time() - 600) @rename($f, substr($f, 0, -6));
  };

  $attente = $attenteDossier();
  $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? ''); $page = (string) ($_SERVER['HTTP_REFERER'] ?? '');
  [$code, $rep] = $envoyer($raw, $ip, $page);
  $joignable = $code >= 200 && $code < 300 && $rep !== null;
  if ($code >= 200 && $code < 300) {
    lead_sortir($rep ?? ['ok' => true]);
  } elseif ($rep !== null && in_array($code, [400, 405, 413, 429], true)) {
    lead_sortir($rep, $code === 429 ? 429 : 200);
  } elseif (empty($in['action'])) {
    $c = is_array($in['contact'] ?? null) ? $in['contact'] : (is_array($in['contexte'] ?? null) ? $in['contexte'] : []);
    $consent = !empty($c['consentement']) || !empty($c['consent']) || !empty($in['consentement']) || !empty($in['consent']);
    if (!$consent) { lead_sortir(['ok' => false, 'error' => 'Consentement requis : rien n\'a été enregistré.']); exit; }
    $proteger($attente);
    $ok = (bool) @file_put_contents($attente . '/' . date('YmdHis') . '-' . bin2hex(random_bytes(6)) . '.json', json_encode(['corps' => $raw, 'ip' => $ip, 'page' => $page]), LOCK_EX);
    if (!$ok) error_log('lead.php (version C, relais) : file d\'attente impossible dans ' . $attente);
    lead_sortir($ok ? ['ok' => true, 'en_attente' => true] : ['ok' => false, 'error' => 'Service momentanément indisponible'], $ok ? 200 : 503);
  } else {
    lead_sortir(['ok' => false, 'error' => 'Service momentanément indisponible'], 503);
  }
  if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
  elseif (function_exists('litespeed_finish_request')) litespeed_finish_request();
  if ($joignable) $vider($attente);
  exit;
}

/* =====================================================================================
   2. MODULE NON BRANCHÉ : enregistrement dans la table « leads » du socle (comme S, A et B)
   ===================================================================================== */
require_once __DIR__ . '/leads-base.php';

/* ---------- suivi d'un devis en cours : étape atteinte (identifiant + jeton remis à la création) ---------- */
if (($in['action'] ?? '') === 'etape') {
  $id = (int) ($in['id'] ?? 0); $jeton = (string) ($in['jeton'] ?? ''); $et = mb_substr(trim((string) ($in['etape'] ?? '')), 0, 60);
  if ($id < 1 || !preg_match('/^[0-9a-f]{32}$/', $jeton) || $et === '') { lead_sortir(['ok' => false, 'error' => 'Requête invalide']); exit; }
  $db = brh_leads_db(); if (!$db) { lead_sortir(['ok' => false], 500); exit; }
  $s = $db->prepare('UPDATE leads SET etape = ? WHERE id = ? AND jeton = ?'); $s->bind_param('sis', $et, $id, $jeton); $s->execute();
  lead_sortir(['ok' => $s->affected_rows >= 0]); exit;
}

/* ---------- argumentaire de vente préparé par l'IA : gardé avec la demande (colonne donnees) ---------- */
if (($in['action'] ?? '') === 'argumentaire') {
  $id = (int) ($in['id'] ?? 0); $jeton = (string) ($in['jeton'] ?? '');
  if ($id < 1 || !preg_match('/^[0-9a-f]{32}$/', $jeton) || !is_array($in['argumentaire'] ?? null)) { lead_sortir(['ok' => false, 'error' => 'Requête invalide']); exit; }
  $db = brh_leads_db(); if (!$db) { lead_sortir(['ok' => false], 500); exit; }
  $s = $db->prepare('SELECT donnees FROM leads WHERE id = ? AND jeton = ?'); $s->bind_param('is', $id, $jeton); $s->execute();
  $row = $s->get_result()->fetch_assoc();
  if (!$row) { lead_sortir(['ok' => false, 'error' => 'Demande inconnue']); exit; }
  $d = json_decode((string) ($row['donnees'] ?? ''), true); if (!is_array($d)) $d = [];
  $a = $in['argumentaire']; $txt = static fn($v): string => mb_substr(trim(is_scalar($v) ? (string) $v : ''), 0, 400);
  $liste = static fn($v): array => array_values(array_filter(array_map($txt, array_slice(is_array($v) ? $v : [], 0, 8))));
  $d['argumentaire_ia'] = ['titre' => $txt($a['titre'] ?? ''), 'synthese' => $liste($a['synthese'] ?? []), 'questions' => $liste($a['questions'] ?? []),
                           'pieces' => $liste($a['pieces'] ?? []), 'angle' => $txt($a['angle'] ?? ''), 'source' => $txt($in['source'] ?? ''), 'le' => date('c')];
  $dj = json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
  $u = $db->prepare('UPDATE leads SET donnees = ? WHERE id = ? AND jeton = ?'); $u->bind_param('sis', $dj, $id, $jeton);
  lead_sortir(['ok' => $u->execute()]); exit;
}

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
$etape   = $t($in['etape'] ?? '', 60);
$jeton   = bin2hex(random_bytes(16));

/* ---------- contrôles ---------- */
if (!$consent) { lead_sortir(['ok' => false, 'error' => 'Consentement requis : rien n\'a été enregistré.']); exit; }
if ($email === '' && $tel === '') { lead_sortir(['ok' => false, 'error' => 'E-mail ou téléphone requis']); exit; }
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) { lead_sortir(['ok' => false, 'error' => 'E-mail non valide']); exit; }

$version = preg_match('/^protobrh([abc])\./i', (string) ($_SERVER['HTTP_HOST'] ?? ''), $m) ? strtoupper($m[1]) : 'S';
$ip = mb_substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
$donnees = json_encode($in, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);

/* ---------- enregistrement ---------- */
$db = brh_leads_db();
if (!$db) { lead_sortir(['ok' => false, 'error' => 'Connexion base impossible'], 500); exit; }
$stmt = $db->prepare('INSERT INTO leads (cree_le, version, type, reference, prenom, nom, email, telephone, fonction, rappel_expert,
    consentement, consentement_le, raison_sociale, siret, code_postal, ville, departement, effectif, secteur, idcc, montant_estime, score_label,
    donnees, page, ip, etape, jeton) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
if (!$stmt) { lead_sortir(['ok' => false, 'error' => 'Préparation impossible'], 500); exit; }
$stmt->bind_param('ssssssssissssssissiisssss', $version, $type, $ref, $prenom, $nom, $email, $tel, $fonct, $rappel,
  $consentLe, $raison, $siret, $cp, $ville, $dep, $eff, $secteur, $idcc, $montant, $score, $donnees, $page, $ip, $etape, $jeton);
$ok = $stmt->execute();
lead_sortir($ok ? ['ok' => true, 'id' => (int) $db->insert_id, 'jeton' => $jeton] : ['ok' => false, 'error' => 'Enregistrement impossible']);
