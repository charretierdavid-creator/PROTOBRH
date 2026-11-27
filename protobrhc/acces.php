<?php
/* Version C 3.0 — 26/11/2026 · accès ouvert sans identifiant ni mot de passe (protobrhc seulement)
   ============================================================================
   Accès OUVERT, sans identifiant ni mot de passe
   ----------------------------------------------------------------------------
   Remplace, pour protobrhc seulement, la porte d'accès du socle (protobrh/acces.php),
   qui reste en place sur les sites S, A et B et sur le cahier des charges.
   Demande de David CHARRETIER du 26/11/2026 : ouvrir le prototype au maximum.
   - Le .htaccess du socle est inchangé : il fait toujours passer les pages par ce fichier,
     qui les sert désormais à tout le monde, sans écran d'identification.
   - brh_acces_api() ne bloque plus : ia.php (Julia, Mistral), entreprise.php (SIRET réel)
     et lead.php (demandes) répondent à tout visiteur. Leurs propres garde-fous restent :
     limite d'appels par adresse IP et par heure dans ia.php, consentement obligatoire dans lead.php.
   - Toujours protégés : config.php (refusé par le .htaccess et ici), les fichiers commençant
     par un point, les dossiers data/ et _source/, et les documents internes (.md, .sql, .csv, .zip).
   - admin-leads.php garde son propre accès (ADMIN_LOGIN et ADMIN_PASSWORD de config.php).
   - Le site reste hors des moteurs de recherche (en-tête X-Robots-Tag « noindex »), choix du 26/11.
   - Interrupteur de pause du DPO (V2.19) conservé : pause.flag dans le dossier du site → 503 partout
     (fonction brh_pause_verifier() reprise à l'identique de protobrh/acces.php).
   Pour revenir à l'accès protégé : supprimer ce fichier de protobrhc/ (le socle reprend la main).
   ============================================================================ */

/* Interrupteur de pause (V2.19, demande du DPO) : identique à protobrh/acces.php. */
function brh_pause_verifier(): void {
  if (PHP_SAPI === 'cli' || !is_file(__DIR__ . '/pause.flag')) return;
  $note = trim(mb_substr(strip_tags((string) @file_get_contents(__DIR__ . '/pause.flag', false, null, 0, 2000)), 0, 300));
  while (ob_get_level() > 0) ob_end_clean();
  http_response_code(503);
  header('Retry-After: 86400');
  header('Cache-Control: no-store');
  header('X-Robots-Tag: noindex, nofollow');
  $page = realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__ || stripos((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'text/html') !== false;
  if (!$page) {   // appel d'un script par une page (fetch) : réponse JSON lisible par les formulaires
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'pause' => true, 'error' => 'Ce prototype est temporairement suspendu : aucune information n\'a été enregistrée.'], JSON_UNESCAPED_UNICODE);
    exit;
  }
  header('Content-Type: text/html; charset=utf-8');
  header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
  $n = $note !== '' ? '<p class="n">' . htmlspecialchars($note, ENT_QUOTES, 'UTF-8') . '</p>' : '';
  echo '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow"><title>Prototype temporairement suspendu — Banque des RH</title><style>',
    '*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f5;color:#1d2b28;',
    'font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px 16px}',
    'main{max-width:560px;background:#fff;border:1px solid #dfe6e2;border-radius:20px;padding:36px 32px;text-align:center}',
    '.logo{display:inline-grid;place-items:center;width:52px;height:52px;border-radius:14px;background:#8FB822;color:#065145;font-weight:800;font-size:14px;margin-bottom:18px}',
    'h1{font-size:1.45rem;line-height:1.25;color:#065145;margin:0 0 12px}p{margin:0 0 12px;color:#5c6b64}.n{color:#1d2b28;font-weight:600}',
    '</style></head><body><main><div class="logo" aria-hidden="true">BRH</div><h1>Ce prototype est temporairement suspendu</h1>',
    '<p>Le prototype exploratoire Banque des RH est fermé pour le moment. Aucune information n\'est recueillie pendant cette pause.</p>',
    $n, '<p>Pour toute question, contactez l\'équipe projet Banque des RH.</p></main></body></html>';
  exit;
}
brh_pause_verifier();

const BRH_ACCES_OUVERT = true;
const BRH_ACCES_DUREE   = 36000;  // gardées pour compatibilité, sans effet
const BRH_ACCES_ESSAIS  = 8;
const BRH_ACCES_BLOCAGE = 300;

/** Gardée pour compatibilité : identifiants éventuels de config.php, inutilisés en accès ouvert. */
function brh_acces_config(): array { return ['', '']; }

/** Gardée pour les scripts qui l'appellent : session PHP simple, sans identification. */
function brh_acces_session(): void {
  if (session_status() === PHP_SESSION_ACTIVE || PHP_SAPI === 'cli') return;
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
  session_name('BRHACCES');
  session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
  session_start();
}

/** Accès ouvert : tout visiteur est accepté. */
function brh_acces_ok(): bool { return true; }

/** Appelée en première ligne des scripts PHP (ia.php, entreprise.php, lead.php…) : ne bloque plus. */
function brh_acces_api(): void { }

function brh_acces_cible(string $f): string {
  $f = ltrim(str_replace(['\\', "\0"], ['/', ''], $f), '/');
  if ($f === '' || str_contains($f, '..')) return 'index.html';
  return $f;
}

function brh_acces_introuvable(): void {
  http_response_code(404); header('Content-Type: text/plain; charset=utf-8'); header('X-Robots-Tag: noindex, nofollow'); echo 'Page introuvable'; exit;
}

function brh_acces_servir(string $f): void {
  $chemin = realpath(__DIR__ . '/' . $f);
  $base = realpath(__DIR__);
  $nom = basename((string) $chemin);
  $ext = strtolower(pathinfo((string) $chemin, PATHINFO_EXTENSION));
  $types = ['html' => 'text/html; charset=utf-8', 'htm' => 'text/html; charset=utf-8',
            'json' => 'application/json; charset=utf-8', 'txt' => 'text/plain; charset=utf-8'];
  if (!$chemin || !$base || !str_starts_with($chemin, $base . DIRECTORY_SEPARATOR) || !is_file($chemin)
      || str_starts_with($nom, 'config') || str_starts_with($nom, '.') || !isset($types[$ext])
      || str_contains($chemin, DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR)
      || str_contains($chemin, DIRECTORY_SEPARATOR . '_source' . DIRECTORY_SEPARATOR)) {
    brh_acces_introuvable();
  }
  header('Content-Type: ' . $types[$ext]);
  header('Cache-Control: public, max-age=300');
  header('X-Robots-Tag: noindex, nofollow');
  header('Content-Length: ' . filesize($chemin));
  readfile($chemin);
  exit;
}

/* ------------------------- Appel direct : sert la page demandée ------------------------- */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') !== __FILE__) return;

$action = (string) ($_GET['action'] ?? '');
if ($action === 'logout' || $action === 'login') { header('Location: ./', true, 303); exit; }   // anciens liens « se connecter / se déconnecter »
brh_acces_servir(brh_acces_cible((string) ($_GET['f'] ?? 'index.html')));
