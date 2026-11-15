<?php
/* Module LM 2.0 — 15/11/2026 · connecteur « relais » : remplace lead.php d'un site du portail (S, A, B ou autre) ; transmet aussi le parcours, « déjà client ? » et la preuve de suite (LM 2.0) · historique : VERSIONS.md */
/* ============================================================================
   lead.php (CONNECTEUR) — à copier À LA PLACE du lead.php d'un site, sans toucher aux pages.
   Les pages continuent d'appeler  fetch('lead.php', …)  avec le même JSON ; ce script le transmet,
   de serveur à serveur, au module lead management (collecte.php du sous-domaine) et renvoie sa réponse
   (id, jeton, dossier, caisse, suivi ou suivi_email) : suivi des étapes et argumentaire passent par le même chemin.
   LM 2.0 : le JSON est transmis tel quel (parcours, client_declare, suite) ; rien à changer dans ce fichier pour le nouveau module.
   À renseigner dans le config.php DU SITE (jamais sur GitHub) :
       const LM_HUB_URL = 'https://cockpitbrh.monsitedetest.com/';   // adresse du module
       const LM_HUB_CLE = '…';                                   // clé de ce site (LM_CLES du module)
   La version du site (S, A, B, C) est celle associée à sa clé dans le module : pas de réglage ici.
   Si le module ne répond pas (ou est mal configuré : adresse, clé), la demande consentie est mise en attente
   — hors du dossier public si possible, sinon dans lm-attente/ protégé — et renvoyée automatiquement aux
   appels suivants, dès que le module répond : aucune demande n'est perdue (gardée 7 jours au plus).
   Facultatif : const LM_HUB_ATTENTE = '/home/…/lm-attente';  (dossier de la file d'attente)
   ============================================================================ */
declare(strict_types=1);
if (is_file(__DIR__ . '/acces.php')) { require_once __DIR__ . '/acces.php'; if (function_exists('brh_acces_api')) brh_acces_api(); }   // porte d'accès du prototype, si le site en a une
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (is_file(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';

function lmr_sortir(array $r, int $code = 200): void { http_response_code($code); echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
if (!defined('LM_HUB_URL') || !defined('LM_HUB_CLE') || LM_HUB_URL === '' || strlen((string) LM_HUB_CLE) < 24) { lmr_sortir(['ok' => false, 'error' => 'Module lead management non configuré (LM_HUB_URL, LM_HUB_CLE dans config.php)'], 500); exit; }
if (!function_exists('curl_init')) { lmr_sortir(['ok' => false, 'error' => 'Extension PHP curl requise'], 500); exit; }

$raw = (string) file_get_contents('php://input');
if (strlen($raw) > 200000) { lmr_sortir(['ok' => false, 'error' => 'Demande trop volumineuse'], 413); exit; }
$in = json_decode($raw, true);
if (!is_array($in)) { lmr_sortir(['ok' => false, 'error' => 'Requête invalide'], 400); exit; }

/* file d'attente : hors du dossier public si possible (Hostinger : domains/<domaine>/lm-attente-…), sinon lm-attente/ protégé */
function lmr_attente_dossier(): string {
  if (defined('LM_HUB_ATTENTE') && LM_HUB_ATTENTE !== '') return rtrim((string) LM_HUB_ATTENTE, '/');
  $hors = dirname(__DIR__) . '/lm-attente-' . substr(hash('sha256', __DIR__), 0, 10);
  if (is_dir($hors) || @mkdir($hors, 0700)) return $hors;
  return __DIR__ . '/lm-attente';
}
function lmr_attente_proteger(string $dir): void {
  if (!is_dir($dir)) @mkdir($dir, 0700);
  if (strpos($dir, __DIR__) === 0) @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");   // à chaque écriture
}
/* envoi au module ; renvoie [code HTTP, réponse décodée] — code 0 = injoignable */
function lmr_envoyer(string $corps, string $ip, string $page): array {
  $ch = curl_init(rtrim((string) LM_HUB_URL, '/') . '/collecte.php');
  curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $corps, CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 10, CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-LM-Cle: ' . LM_HUB_CLE, 'X-LM-IP: ' . $ip, 'X-LM-Page: ' . mb_substr($page, 0, 255)]]);
  $r = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  $j = is_string($r) ? json_decode($r, true) : null;
  return [$r === false ? 0 : $code, is_array($j) ? $j : null];
}
/* réponse définitive du module : demande reçue (200), ou refusée pour son contenu (400, 405, 413) ; tout le reste se réessaie
   (module injoignable, erreur serveur, adresse ou clé mal configurée : 3xx, 401, 403, 404, 429) */
function lmr_definitif(int $c, ?array $rep): bool {
  return ($c >= 200 && $c < 300) || (in_array($c, [400, 405, 413], true) && $rep !== null);
}
/* file d'attente : demandes non transmises, renvoyées aux appels suivants, gardées 7 jours */
function lmr_attente_vider(string $dir): void {
  if (!is_dir($dir)) return;
  foreach (array_slice(glob($dir . '/*.json') ?: [], 0, 10) as $f) {
    $prise = $f . '.envoi';
    if (!@rename($f, $prise)) continue;   // déjà pris par une autre requête
    if (filemtime($prise) < time() - 7 * 86400) { @unlink($prise); continue; }
    $x = json_decode((string) @file_get_contents($prise), true);
    if (!is_array($x)) { @unlink($prise); continue; }
    [$c, $r] = lmr_envoyer((string) $x['corps'], (string) $x['ip'], (string) $x['page']);
    if (lmr_definitif($c, $r)) { @unlink($prise); continue; }
    @rename($prise, $f);                  // à réessayer plus tard
    if ($c === 0 || $c >= 500) return;    // module injoignable : inutile d'essayer les suivantes
  }
  /* fichiers « .envoi » abandonnés (requête interrompue) : remis dans la file après 10 minutes */
  foreach (glob($dir . '/*.json.envoi') ?: [] as $f) if (filemtime($f) < time() - 600) @rename($f, substr($f, 0, -6));
}

$attente = lmr_attente_dossier();
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? ''); $page = (string) ($_SERVER['HTTP_REFERER'] ?? '');
[$code, $rep] = lmr_envoyer($raw, $ip, $page);
$joignable = $code >= 200 && $code < 300 && $rep !== null;
if ($code >= 200 && $code < 300) {
  /* demande reçue par le module (réponse illisible : on ne la renvoie pas, elle est enregistrée) */
  lmr_sortir($rep ?? ['ok' => true]);
} elseif ($rep !== null && in_array($code, [400, 405, 413, 429], true)) {
  lmr_sortir($rep, $code === 429 ? 429 : 200);   // refus du module pour cette demande (contenu, limite d'envois)
} elseif (empty($in['action'])) {
  /* module injoignable ou mal configuré : la demande (avec consentement) est gardée et renvoyée plus tard */
  $c = is_array($in['contact'] ?? null) ? $in['contact'] : (is_array($in['contexte'] ?? null) ? $in['contexte'] : []);
  $consent = !empty($c['consentement']) || !empty($c['consent']) || !empty($in['consentement']) || !empty($in['consent']);
  if (!$consent) { lmr_sortir(['ok' => false, 'error' => 'Consentement requis : rien n\'a été enregistré.']); exit; }
  lmr_attente_proteger($attente);
  $ok = (bool) @file_put_contents($attente . '/' . date('YmdHis') . '-' . bin2hex(random_bytes(6)) . '.json', json_encode(['corps' => $raw, 'ip' => $ip, 'page' => $page]), LOCK_EX);
  if (!$ok) error_log('lead.php (connecteur lead management) : file d\'attente impossible dans ' . $attente);
  lmr_sortir($ok ? ['ok' => true, 'en_attente' => true] : ['ok' => false, 'error' => 'Service momentanément indisponible'], $ok ? 200 : 503);
} else {
  lmr_sortir(['ok' => false, 'error' => 'Service momentanément indisponible'], 503);
}
/* après la réponse au visiteur (PHP-FPM ou LiteSpeed) : renvoi des demandes en attente, seulement si le module répond */
if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
elseif (function_exists('litespeed_finish_request')) litespeed_finish_request();
if ($joignable) lmr_attente_vider($attente);
