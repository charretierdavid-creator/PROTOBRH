<?php
/* ============================================================================
   Porte d'accès — même modèle que « Diagnostic Conseil Banque des RH »
   ----------------------------------------------------------------------------
   - Écran d'identification : identifiant + mot de passe communs.
   - Vérification côté serveur (config.php, jamais publié sur GitHub).
   - Session PHP de 10 heures d'inactivité au plus, cookie HttpOnly.
   - 8 essais erronés : blocage 5 minutes.
   Le fichier .htaccess fait passer les pages (.html, .json, .txt…) par ce fichier ;
   les scripts PHP sensibles appellent brh_acces_api() en première ligne.
   Ce fichier est identique dans protobrh/ et cdcbrh/.
   ============================================================================ */

const BRH_ACCES_DUREE   = 36000;  // 10 heures
const BRH_ACCES_ESSAIS  = 8;
const BRH_ACCES_BLOCAGE = 300;    // 5 minutes

function brh_acces_session(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
  session_name('BRHACCES');
  session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
  session_start();
}

function brh_acces_config(): array {
  if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $e) {} ob_end_clean(); }
  $l = defined('ACCES_LOGIN') ? trim((string) constant('ACCES_LOGIN')) : '';
  $p = defined('ACCES_PASSWORD') ? (string) constant('ACCES_PASSWORD') : '';
  return [$l, $p];
}

function brh_acces_ok(): bool {
  brh_acces_session();
  $u = $_SESSION['brh'] ?? null;
  if (!$u || (time() - (int) $u['t']) > BRH_ACCES_DUREE) { unset($_SESSION['brh']); return false; }
  $_SESSION['brh']['t'] = time();
  return true;
}

/** À appeler en première ligne des scripts PHP appelés par les pages (chatbot, commentaires…). */
function brh_acces_api(): void {
  if (PHP_SAPI === 'cli') return;
  $ok = brh_acces_ok();
  session_write_close();
  if ($ok) return;
  http_response_code(401);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode(['ok' => false, 'auth' => false, 'error' => 'Session expirée : reconnectez-vous.'], JSON_UNESCAPED_UNICODE);
  exit;
}

/* ------------------------- Appel direct : la porte ------------------------- */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') !== __FILE__) return;

$SITE = is_file(__DIR__ . '/comments.php')
  ? ['nom' => 'Cahier des charges interactif', 'sous' => 'Portail Banque des RH', 'lede' => 'La spécification vivante du Portail Banque des RH : écrans, exigences, règles de gestion, commentaires et idées de l’équipe projet.']
  : ['nom' => 'Portail Banque des RH', 'sous' => 'Prototype', 'lede' => 'Le prototype du portail : diagnostic RH, solutions, devis en ligne et Assistant BRH, pour tester le parcours du dirigeant.'];

function brh_acces_cible(string $f): string {
  $f = ltrim(str_replace(['\\', "\0"], ['/', ''], $f), '/');
  if ($f === '' || str_contains($f, '..')) return 'index.html';
  return $f;
}

function brh_acces_servir(string $f): void {
  $chemin = realpath(__DIR__ . '/' . $f);
  $base = realpath(__DIR__);
  $nom = basename((string) $chemin);
  if (!$chemin || !str_starts_with($chemin, $base . DIRECTORY_SEPARATOR) || !is_file($chemin)
      || $nom === 'config.php' || str_starts_with($nom, '.') || str_contains($chemin, DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR)
      || str_contains($chemin, DIRECTORY_SEPARATOR . '_source' . DIRECTORY_SEPARATOR)) {
    http_response_code(404); header('Content-Type: text/plain; charset=utf-8'); echo 'Page introuvable'; exit;
  }
  $types = ['html' => 'text/html; charset=utf-8', 'htm' => 'text/html; charset=utf-8', 'json' => 'application/json; charset=utf-8',
            'txt' => 'text/plain; charset=utf-8', 'md' => 'text/plain; charset=utf-8', 'csv' => 'text/csv; charset=utf-8',
            'sql' => 'text/plain; charset=utf-8', 'zip' => 'application/zip'];
  $ext = strtolower(pathinfo($chemin, PATHINFO_EXTENSION));
  header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
  header('Cache-Control: private, no-cache');
  header('X-Robots-Tag: noindex, nofollow');
  header('Content-Length: ' . filesize($chemin));
  readfile($chemin);
  exit;
}

brh_acces_session();
$action = (string) ($_GET['action'] ?? '');
$cible  = brh_acces_cible((string) ($_GET['f'] ?? ($_POST['f'] ?? '')));

if ($action === 'logout') {
  unset($_SESSION['brh']);
  session_regenerate_id(true);
  header('Location: ./', true, 303); exit;
}

$err = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && $action === 'login') {
  $now = time();
  [$cfgLogin, $cfgPass] = brh_acces_config();
  $login = trim((string) ($_POST['login'] ?? ''));
  $pw    = (string) ($_POST['password'] ?? '');
  if (!empty($_SESSION['bloque']) && $_SESSION['bloque'] > $now) $err = 'Trop d’essais. Réessayez dans quelques minutes.';
  elseif ($cfgLogin === '' || $cfgPass === '') $err = 'Accès non configuré : renseignez ACCES_LOGIN et ACCES_PASSWORD dans config.php.';
  elseif ($login === '' || $pw === '') $err = 'Renseignez l’identifiant et le mot de passe.';
  elseif (!hash_equals($cfgLogin, $login) || !hash_equals($cfgPass, $pw)) {
    $err = 'Identifiant ou mot de passe incorrect.';
    $_SESSION['echecs'] = (int) ($_SESSION['echecs'] ?? 0) + 1;
    if ($_SESSION['echecs'] >= BRH_ACCES_ESSAIS) { $_SESSION['bloque'] = $now + BRH_ACCES_BLOCAGE; $_SESSION['echecs'] = 0; }
  } else {
    session_regenerate_id(true);
    $_SESSION['echecs'] = 0;
    $_SESSION['brh'] = ['t' => $now];
    $r = (string) ($_POST['r'] ?? '');
    $dest = (str_starts_with($r, '/') && !str_starts_with($r, '//') && !str_contains($r, '\\') && !str_contains($r, 'acces.php')) ? $r : './' . $cible;   // adresse d'origine (avec ?paramètres)
    $h = (string) ($_POST['h'] ?? '');
    if (preg_match('/^#[\w\-\/%.]{1,80}$/u', $h)) $dest .= $h;                                          // ancre (#comments…)
    header('Location: ' . $dest, true, 303);
    exit;
  }
}

if (brh_acces_ok()) { session_write_close(); brh_acces_servir($cible); }

/* ----------------------------- Écran d'identification ----------------------------- */
http_response_code($err !== '' ? 401 : 200);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
$e = static fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title><?= $e($SITE['nom']) ?> · Identification</title>
<style>
:root{--pin:#065145;--teal:#016265;--lime:#8FB822;--mint:#E3EFEA;--band:#006A4E;--ink:#16302A;--muted:#5B6F69;--line:#D3E2DB;--warn:#A9471A;--warnbg:#FBEDE5;--r-s:6px;--r-m:12px;
  --font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:var(--font);color:var(--ink);background:#F2F6F4;font-size:15px;line-height:1.45;-webkit-text-size-adjust:100%}
button,input{font:inherit;color:inherit}button{cursor:pointer}:focus-visible{outline:3px solid var(--lime);outline-offset:2px}h1,h2{margin:0;line-height:1.2}
#login{min-height:100%;display:grid;grid-template-columns:1.1fr 1fr}
.lg-art{background:var(--mint);padding:clamp(28px,6vw,72px);display:flex;flex-direction:column;justify-content:space-between;gap:32px}
.lg-brand{font-weight:700;color:var(--pin);letter-spacing:.01em}.lg-brand small{display:block;font-weight:500;color:var(--muted);font-size:13px}
.surl .l1{display:block;color:var(--pin);font-size:clamp(26px,3.4vw,40px);font-weight:600;margin-bottom:10px}
.surl .l2{display:inline;background:var(--band);color:#fff;font-weight:800;font-size:clamp(28px,4vw,48px);line-height:1.32;padding:2px 12px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.lg-lede{max-width:46ch;color:var(--muted);margin-top:22px}
.lg-partners{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;background:#fff;color:var(--pin);border:1px solid var(--line);border-radius:999px;padding:4px 11px;font-size:12.5px;font-weight:600}
.lg-form{display:flex;align-items:center;justify-content:center;padding:32px 20px;background:#fff}
.lg-form form{width:min(380px,100%)}.lg-form h2{font-size:22px;color:var(--pin);margin-bottom:6px}
.hint{font-size:13px;color:var(--muted);margin:0}
.internal{display:flex;gap:10px;align-items:flex-start;background:var(--warnbg);color:var(--warn);border-radius:var(--r-m);padding:12px 14px;font-size:13.5px;margin:18px 0 22px}.internal svg{flex:none;margin-top:1px}
.fld{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}.fld label{font-size:13px;font-weight:600}.fld label .req{color:var(--warn)}
.in{border:1px solid var(--line);background:#fff;border-radius:var(--r-s);padding:10px 12px;min-height:42px;width:100%}
.in:focus{border-color:var(--teal);outline:none;box-shadow:0 0 0 3px rgba(1,98,101,.15)}
.btn{border:1px solid var(--pin);border-radius:999px;padding:9px 18px;font-weight:600;min-height:40px;display:inline-flex;align-items:center;justify-content:center;width:100%;background:var(--pin);color:#fff}
.btn:hover{background:var(--band)}
.lg-err{color:var(--warn);font-size:13.5px;min-height:1.2em;margin:4px 0 12px}
@media (max-width:760px){#login{grid-template-columns:1fr}}
</style>
</head>
<body>
<section id="login" aria-label="Identification">
  <div class="lg-art">
    <div class="lg-brand">Crédit Agricole · Banque des RH<small><?= $e($SITE['sous']) ?></small></div>
    <div>
      <h1 class="surl"><span class="l1">Bienvenue sur le</span><span class="l2"><?= $e($SITE['nom']) ?></span></h1>
      <p class="lg-lede"><?= $e($SITE['lede']) ?></p>
    </div>
    <div class="lg-partners"><span class="chip">Amundi</span><span class="chip">Crédit Agricole Assurances</span><span class="chip">Worklife</span></div>
  </div>
  <div class="lg-form">
    <form method="post" action="acces.php?action=login" novalidate>
      <h2>Identification</h2>
      <p class="hint">Connectez-vous avec les accès communiqués pour le test.</p>
      <div class="internal" role="note">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
        <div><b>Usage interne uniquement.</b><br>Réservé à l’équipe projet et aux testeurs du Portail Banque des RH.</div>
      </div>
      <input type="hidden" name="f" value="<?= $e($cible) ?>">
      <input type="hidden" name="r" value="<?= $e($_POST['r'] ?? (str_contains($_SERVER['REQUEST_URI'] ?? '', 'acces.php') ? '' : ($_SERVER['REQUEST_URI'] ?? ''))) ?>">
      <input type="hidden" name="h" id="lgH" value="<?= $e($_POST['h'] ?? '') ?>">
      <div class="fld"><label for="lgId">Identifiant <span class="req">*</span></label><input class="in" id="lgId" name="login" autocomplete="username" autocapitalize="none" spellcheck="false" value="<?= $e($_POST['login'] ?? '') ?>"></div>
      <div class="fld"><label for="lgPw">Mot de passe <span class="req">*</span></label><input class="in" id="lgPw" name="password" type="password" autocomplete="current-password"></div>
      <p class="lg-err" role="alert"><?= $e($err) ?></p>
      <button class="btn" type="submit">Se connecter</button>
      <p class="hint" style="margin-top:14px">Version de test. Cible : authentification par l’annuaire Crédit Agricole.</p>
    </form>
  </div>
</section>
<script>if(location.hash)document.getElementById('lgH').value=location.hash;</script>
</body>
</html>
