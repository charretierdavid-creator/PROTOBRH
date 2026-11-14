<?php
/* ============================================================================
   Cockpit BRH — https://cockpitbrh.monsitedetest.com
   Console de gestion des demandes des dirigeants (leads) laissées sur les trois versions du prototype
   (S, A, B) et des avis des testeurs. Même base MySQL que protobrh (tables « leads » et « feedback »).

   Fichiers sur le serveur : index.php, cockpit.css, .htaccess, robots.txt, leads-base.php (copié du socle
   protobrh/ à chaque mise en ligne) et config.php, créé à la main sur Hostinger (jamais sur GitHub) à partir
   de config.example.php : DB_HOST, DB_NAME, DB_USER, DB_PASS, ADMIN_LOGIN, ADMIN_PASSWORD.

   Sécurité : HTTPS imposé (.htaccess), session dédiée (1 h d'inactivité, 8 h au plus), cookie HttpOnly,
   Secure et SameSite Strict, 5 essais erronés = blocage 15 minutes, jeton anti-falsification sur chaque action,
   aucune ligne de JavaScript (politique de sécurité stricte), pages non indexées, journal des connexions,
   exports et suppressions (adresse IP tronquée).
   Données : 12 mois de conservation (purge automatique, leads-base.php), suppression sur demande (RGPD).
   ============================================================================ */
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
if ($https) header('Strict-Transport-Security: max-age=31536000');

if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $x) {} ob_end_clean(); }
require_once is_file(__DIR__ . '/leads-base.php') ? __DIR__ . '/leads-base.php' : __DIR__ . '/../protobrh/leads-base.php';

const CK_INACTIF = 3600, CK_MAX = 28800, CK_ESSAIS = 5, CK_BLOCAGE = 900, CK_PAGE = 50, CK_MDP_MIN = 12;
const CK_MOTIFS = ['hors_cible' => 'Hors cible', 'deja_equipe' => 'Déjà équipé', 'prix' => 'Prix', 'pas_de_besoin' => 'Pas de besoin',
                   'injoignable' => 'Injoignable', 'concurrent' => 'Concurrent retenu', 'autre' => 'Autre'];
const CK_VERSIONS = ['S' => 'Standard', 'A' => 'Version A', 'B' => 'Version B'];

function h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function ck_date($s, bool $heure = true): string { if (!$s) return ''; $t = strtotime((string) $s); return $t ? date($heure ? 'd/m/Y H:i' : 'd/m/Y', $t) : ''; }
function ck_duree(?float $h): string { if ($h === null) return '—'; $n = static fn(float $x) => str_replace('.', ',', (string) round($x, 1)); return $h < 48 ? $n($h) . ' h' : $n($h / 24) . ' j'; }
/* export CSV : une valeur commençant par = + - @ n'est jamais interprétée comme une formule par le tableur */
function ck_cell($v): string { $v = (string) $v; return preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v; }
function ck_qs(array $x): string { return h('?' . http_build_query(array_filter($x, static fn($v) => $v !== '' && $v !== null))); }
function ck_options(array $o, string $cur, ?string $tous = null): string {
  $r = $tous !== null ? '<option value="">' . h($tous) . '</option>' : '';
  foreach ($o as $k => $l) $r .= '<option value="' . h($k) . '"' . ((string) $k === $cur ? ' selected' : '') . '>' . h($l) . '</option>';
  return $r;
}
function ck_pill(string $st): string { return '<span class="pill s-' . h($st) . '">' . h(BRH_LEAD_STATUTS[$st] ?? $st) . '</span>'; }
function ck_barre(int $n, int $max): string {
  $w = $max > 0 ? round(100 * $n / $max, 1) : 0;
  return '<svg class="hb" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect width="' . $w . '" height="10" rx="2"></rect></svg>';
}

/* ---------- base : tables du cockpit (suivi, notes, journal) ajoutées à la base des leads ---------- */
function ck_db(): ?mysqli {
  static $db = false;
  if ($db !== false) return $db;
  $db = brh_leads_db();
  if (!$db) return $db = null;
  $c = $db->query("SHOW COLUMNS FROM leads LIKE 'relance_le'");
  if ($c && $c->num_rows === 0) {
    $db->query('ALTER TABLE leads ADD COLUMN premier_contact_le DATETIME NULL, ADD COLUMN relance_le DATE NULL,
      ADD COLUMN attribue_a VARCHAR(120) NULL, ADD COLUMN motif_perte VARCHAR(40) NULL, ADD COLUMN maj_le DATETIME NULL, ADD INDEX (statut)');
  }
  $db->query('CREATE TABLE IF NOT EXISTS leads_suivi (id INT AUTO_INCREMENT PRIMARY KEY, lead_id INT NOT NULL, le DATETIME NOT NULL,
      nature VARCHAR(20) NOT NULL, texte TEXT, INDEX (lead_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  $db->query('CREATE TABLE IF NOT EXISTS cockpit_journal (id INT AUTO_INCREMENT PRIMARY KEY, le DATETIME NOT NULL, action VARCHAR(60) NOT NULL,
      detail VARCHAR(255), ip VARCHAR(64), INDEX (le)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  /* même durée de conservation que les demandes : l'historique d'une demande purgée part avec elle */
  $db->query('DELETE s FROM leads_suivi s LEFT JOIN leads l ON l.id = s.lead_id WHERE l.id IS NULL');
  $db->query('DELETE FROM cockpit_journal WHERE le < (NOW() - INTERVAL ' . BRH_LEADS_CONSERVATION_MOIS . ' MONTH)');
  return $db;
}
function ck_journal(string $action, string $detail = ''): void {
  $db = ck_db(); if (!$db) return;
  $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
  $ip = str_contains($ip, ':') ? implode(':', array_slice(explode(':', $ip), 0, 3)) . '::' : (string) preg_replace('/\.\d+$/', '.0', $ip);   // IP tronquée
  $detail = mb_substr($detail, 0, 255);
  $s = $db->prepare('INSERT INTO cockpit_journal (le, action, detail, ip) VALUES (NOW(), ?, ?, ?)');
  if ($s) { $s->bind_param('sss', $action, $detail, $ip); $s->execute(); }
}
function ck_suivi(int $id, string $nature, string $texte): void {
  $s = ck_db()->prepare('INSERT INTO leads_suivi (lead_id, le, nature, texte) VALUES (?, NOW(), ?, ?)');
  $s->bind_param('iss', $id, $nature, $texte); $s->execute();
}

/* ---------- page ---------- */
function ck_page(string $titre, string $corps, string $vue = ''): void {
  $nav = '';
  if ($vue !== '') {
    $n = 0; $db = ck_db();
    if ($db && ($r = $db->query("SELECT COUNT(*) n FROM leads WHERE statut='nouveau'"))) $n = (int) $r->fetch_assoc()['n'];
    $l = static fn($v, $t) => '<a href="?vue=' . $v . '"' . ($vue === $v ? ' class="on" aria-current="page"' : '') . '>' . $t . '</a>';
    $nav = '<nav>' . $l('bord', 'Tableau de bord') . $l('demandes', 'Demandes' . ($n ? ' <span class="bd">' . $n . '</span>' : '')) .
      $l('avis', 'Avis des testeurs') . $l('journal', 'Journal') . '<a href="?sortir=1" class="out">Se déconnecter</a></nav>';
  }
  echo '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow"><title>', h($titre), ' — Cockpit BRH</title><link rel="stylesheet" href="cockpit.css?v=20261114"></head><body>',
    '<header><a class="brand" href="?vue=bord"><span class="logo">BRH</span><span>Cockpit<small>Gestion des demandes · prototype exploratoire</small></span></a>', $nav, '</header>',
    $corps, '</body></html>';
}

/* ---------- session et identification ---------- */
session_name('COCKPITBRH');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
$login = defined('ADMIN_LOGIN') ? trim((string) constant('ADMIN_LOGIN')) : '';
$mdp   = defined('ADMIN_PASSWORD') ? (string) constant('ADMIN_PASSWORD') : '';
$configure = defined('DB_HOST') && $login !== '' && strlen($mdp) >= CK_MDP_MIN && !str_starts_with($mdp, 'REMPLACER');

/* blocage après plusieurs essais : compté par adresse IP, hors session (fichier temporaire du serveur) */
$fic = sys_get_temp_dir() . '/brh_cockpit_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __DIR__) . '.json';
$essais = is_file($fic) ? (json_decode((string) @file_get_contents($fic), true) ?: []) : [];
$bloque = ($essais['n'] ?? 0) >= CK_ESSAIS && (time() - ($essais['t'] ?? 0)) < CK_BLOCAGE;

if (isset($_GET['sortir'])) { if (isset($_SESSION['ck'])) ck_journal('Déconnexion'); $_SESSION = []; session_destroy(); header('Location: ./'); exit; }
$msg = '';
if ($configure && !$bloque && ($_POST['action'] ?? '') === 'connexion') {
  if (hash_equals($login, (string) ($_POST['login'] ?? '')) & hash_equals($mdp, (string) ($_POST['mdp'] ?? ''))) {
    session_regenerate_id(true);
    $_SESSION['ck'] = ['t' => time(), 'd' => time(), 'csrf' => bin2hex(random_bytes(16))];
    @unlink($fic);
    ck_journal('Connexion');
    header('Location: ./'); exit;
  }
  $essais = ['n' => (($essais['n'] ?? 0) >= CK_ESSAIS ? 0 : ($essais['n'] ?? 0)) + 1, 't' => time()];
  @file_put_contents($fic, json_encode($essais), LOCK_EX);
  $bloque = $essais['n'] >= CK_ESSAIS;
  ck_journal('Échec de connexion', $bloque ? 'accès bloqué 15 minutes' : 'essai ' . $essais['n'] . '/' . CK_ESSAIS);
  usleep(600000);
  $msg = $bloque ? 'Trop d\'essais : accès bloqué 15 minutes.' : 'Identifiant ou mot de passe incorrect.';
}
$connecte = $configure && isset($_SESSION['ck']) && (time() - (int) $_SESSION['ck']['t']) < CK_INACTIF && (time() - (int) $_SESSION['ck']['d']) < CK_MAX;
if ($connecte) $_SESSION['ck']['t'] = time(); elseif (isset($_SESSION['ck'])) unset($_SESSION['ck']);

if (!$connecte) {
  $c = '<main class="login"><h1>Cockpit BRH</h1><p class="note">Suivi des demandes laissées par les dirigeants sur le prototype exploratoire.</p>';
  if (!$configure) {
    $c .= '<div class="msg">Le cockpit n\'est pas encore activé.</div><p class="note">Créez <b>config.php</b> dans le dossier du sous-domaine sur Hostinger (modèle : config.example.php) avec les accès MySQL de protobrh (<code>DB_HOST</code>, <code>DB_NAME</code>, <code>DB_USER</code>, <code>DB_PASS</code>) et un identifiant d\'administration (<code>ADMIN_LOGIN</code>, <code>ADMIN_PASSWORD</code> d\'au moins ' . CK_MDP_MIN . ' caractères).</p>';
  } elseif ($bloque) {
    $c .= '<div class="msg">' . h($msg ?: 'Trop d\'essais.') . ' Réessayez dans 15 minutes.</div>';
  } else {
    if ($msg) $c .= '<div class="msg">' . h($msg) . '</div>';
    if (!$https) $c .= '<div class="msg">Connexion non chiffrée : utilisez https://cockpitbrh.monsitedetest.com</div>';
    $c .= '<form method="post" autocomplete="off"><input type="hidden" name="action" value="connexion">' .
      '<label>Identifiant<input name="login" required autofocus></label><label>Mot de passe<input name="mdp" type="password" required></label>' .
      '<button class="btn" type="submit">Se connecter</button></form>';
  }
  ck_page('Connexion', $c . '<p class="note">Accès réservé à l\'équipe projet. Données personnelles (RGPD) : ne pas les diffuser, ne pas conserver d\'export hors d\'un espace sécurisé.</p></main>'); exit;
}

/* ---------- connecté ---------- */
$db = ck_db();
if (!$db) { ck_page('Erreur', '<main><div class="msg">Connexion à la base MySQL impossible : vérifiez DB_HOST, DB_NAME, DB_USER et DB_PASS dans config.php (mêmes valeurs que protobrh).</div></main>'); exit; }
$csrf = $_SESSION['ck']['csrf'];
$jeton = '<input type="hidden" name="csrf" value="' . h($csrf) . '">';
$vue = (string) ($_GET['vue'] ?? 'bord');
if (isset($_GET['id'])) $vue = 'fiche';
if (!in_array($vue, ['bord', 'demandes', 'fiche', 'avis', 'journal'], true)) $vue = 'bord';
$CLOS = "'" . implode("','", BRH_LEAD_STATUTS_CLOS) . "'";

/* ============================== ACTIONS (POST + jeton) ============================== */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) { http_response_code(400); ck_page('Erreur', '<main><div class="msg">Formulaire expiré : rechargez la page.</div></main>', 'bord'); exit; }
  $act = (string) ($_POST['action'] ?? ''); $id = (int) ($_POST['id'] ?? 0);
  $s = $db->prepare('SELECT * FROM leads WHERE id=?'); $s->bind_param('i', $id); $s->execute(); $lead = $s->get_result()->fetch_assoc();

  if ($act === 'suivi' && $lead) {
    $st = (string) ($_POST['statut'] ?? '');
    if (!isset(BRH_LEAD_STATUTS[$st]) || ($st === 'traite' && $lead['statut'] !== 'traite')) $st = $lead['statut'];
    $rel = (string) ($_POST['relance_le'] ?? ''); if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $rel)) $rel = '';
    $att = mb_substr(trim((string) ($_POST['attribue_a'] ?? '')), 0, 120);
    $mot = (string) ($_POST['motif_perte'] ?? ''); if ($st !== 'perdu' || !isset(CK_MOTIFS[$mot])) $mot = '';
    $relN = $rel ?: null; $attN = $att ?: null; $motN = $mot ?: null;
    $u = $db->prepare("UPDATE leads SET statut=?, relance_le=?, attribue_a=?, motif_perte=?, maj_le=NOW(),
        premier_contact_le = COALESCE(premier_contact_le, IF(? <> 'nouveau', NOW(), NULL)) WHERE id=?");
    $u->bind_param('sssssi', $st, $relN, $attN, $motN, $st, $id); $u->execute();
    if ($st !== $lead['statut']) ck_suivi($id, 'statut', (BRH_LEAD_STATUTS[$lead['statut']] ?? $lead['statut']) . ' → ' . BRH_LEAD_STATUTS[$st] . ($mot ? ' (' . CK_MOTIFS[$mot] . ')' : ''));
    elseif ($mot !== (string) $lead['motif_perte'] && $mot) ck_suivi($id, 'statut', 'Motif de perte : ' . CK_MOTIFS[$mot]);
    if ($rel !== (string) $lead['relance_le']) ck_suivi($id, 'relance', $rel ? 'Relance prévue le ' . ck_date($rel, false) : 'Relance retirée');
    if ($att !== (string) $lead['attribue_a']) ck_suivi($id, 'attribution', $att ? 'Attribuée à : ' . $att : 'Attribution retirée');
    header('Location: ?id=' . $id . '&ok=suivi'); exit;
  }
  if ($act === 'note' && $lead) {
    $t = mb_substr(trim((string) ($_POST['texte'] ?? '')), 0, 2000);
    if ($t !== '') { ck_suivi($id, 'note', $t); $db->query('UPDATE leads SET maj_le=NOW() WHERE id=' . $id); }
    header('Location: ?id=' . $id . '&ok=note'); exit;
  }
  if ($act === 'supprimer' && $lead && !empty($_POST['ok'])) {
    $d = $db->prepare('DELETE FROM leads WHERE id=?'); $d->bind_param('i', $id); $d->execute();
    $d = $db->prepare('DELETE FROM leads_suivi WHERE lead_id=?'); $d->bind_param('i', $id); $d->execute();
    ck_journal('Suppression d\'une demande', 'n° ' . $id . ' (' . ($lead['version'] ?? '') . ', ' . (BRH_LEAD_TYPES[$lead['type']] ?? $lead['type']) . ')');
    header('Location: ?vue=demandes&ok=suppr'); exit;
  }
  if ($act === 'supprimer_avis' && $id > 0 && !empty($_POST['ok'])) {
    $d = $db->prepare('DELETE FROM feedback WHERE id=?'); $d->bind_param('i', $id); $d->execute();
    ck_journal('Suppression d\'un avis', 'n° ' . $id);
    header('Location: ?vue=avis&ok=suppr'); exit;
  }
  header('Location: ?vue=' . $vue); exit;
}
$OK = ['suivi' => 'Suivi enregistré.', 'note' => 'Note ajoutée.', 'suppr' => 'Enregistrement supprimé définitivement.'];
$info = isset($OK[$_GET['ok'] ?? '']) ? '<div class="msg ok">' . $OK[$_GET['ok']] . '</div>' : '';

/* ---------- filtres communs (liste, export, avis) ---------- */
$f = []; foreach (['v', 'type', 'statut', 'q', 'du', 'au', 'rappel', 'relance', 'att'] as $k) $f[$k] = trim((string) ($_GET[$k] ?? ''));
$where = []; $types = ''; $args = [];
$add = static function (string $sql, string $t = '', ...$v) use (&$where, &$types, &$args) { $where[] = $sql; $types .= $t; array_push($args, ...$v); };
if (isset(CK_VERSIONS[$f['v']])) $add('version=?', 's', $f['v']);
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $f['du'])) $add('cree_le>=?', 's', $f['du'] . ' 00:00:00');
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $f['au'])) $add('cree_le<=?', 's', $f['au'] . ' 23:59:59');
$run = static function (string $sql) use ($db, &$types, &$args): array { $s = $db->prepare($sql); if ($types) $s->bind_param($types, ...$args); $s->execute(); return $s->get_result()->fetch_all(MYSQLI_ASSOC); };

/* ============================== AVIS ============================== */
if ($vue === 'avis') {
  if ($f['q'] !== '') { $l = '%' . $f['q'] . '%'; $add('(nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR commentaires LIKE ?)', 'ssss', $l, $l, $l, $l); }
  $w = $where ? ' WHERE ' . implode(' AND ', $where) : '';
  $t = $db->query("SHOW TABLES LIKE 'feedback'");
  $rows = ($t && $t->num_rows) ? $run("SELECT * FROM feedback$w ORDER BY cree_le DESC LIMIT 2000") : [];
  $NOTES = ['note_pertinence' => 'Pertinence', 'note_facilite' => 'Facilité', 'note_valeur' => 'Valeur', 'note_infos' => 'Infos', 'note_diagnostic' => 'Diagnostic', 'note_newsletter' => 'Newsletter', 'note_chatbot' => 'Assistant'];
  if (isset($_GET['csv'])) {
    ck_journal('Export CSV des avis', count($rows) . ' avis');
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="avis-brh-' . date('Ymd') . '.csv"');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
    fputcsv($o, array_merge(['Date', 'Version', 'Prénom', 'Nom', 'E-mail'], array_values($NOTES), ['Commentaires', 'Page']), ';');
    foreach ($rows as $r) fputcsv($o, array_map('ck_cell', array_merge([$r['cree_le'], $r['version'] ?? 'S', $r['prenom'], $r['nom'], $r['email']], array_map(static fn($k) => ($r[$k] ?? '') ?: '', array_keys($NOTES)), [$r['commentaires'], $r['page']])), ';');
    exit;
  }
  $moy = []; foreach ($NOTES as $k => $l) { $v = array_filter(array_map(static fn($r) => (int) ($r[$k] ?? 0), $rows)); $moy[$k] = $v ? round(array_sum($v) / count($v), 1) : null; }
  $c = '<main><h1>Avis des testeurs</h1>' . $info .
    '<div class="kpis">' . implode('', array_map(static fn($k) => '<div><b>' . ($moy[$k] !== null ? str_replace('.', ',', (string) $moy[$k]) . '<small>/5</small>' : '—') . '</b>' . $NOTES[$k] . '</div>', array_keys($NOTES))) . '</div>' .
    '<form class="card filtres" method="get"><input type="hidden" name="vue" value="avis"><label>Version<select name="v">' . ck_options(CK_VERSIONS, $f['v'], 'Toutes') . '</select></label>' .
    '<label>Du<input type="date" name="du" value="' . h($f['du']) . '"></label><label>Au<input type="date" name="au" value="' . h($f['au']) . '"></label>' .
    '<label class="grow">Recherche<input name="q" value="' . h($f['q']) . '" placeholder="nom, e-mail, commentaire"></label><button class="btn">Filtrer</button>' .
    '<a class="btn o" href="' . ck_qs(['vue' => 'avis', 'v' => $f['v'], 'du' => $f['du'], 'au' => $f['au'], 'q' => $f['q'], 'csv' => '1']) . '">Exporter (CSV)</a></form>' .
    '<p class="note">' . count($rows) . ' avis</p><div class="tw"><table><thead><tr><th>Date</th><th>Version</th><th>Testeur</th>' . implode('', array_map(static fn($l) => '<th>' . $l . '</th>', $NOTES)) . '<th>Commentaires</th><th></th></tr></thead><tbody>';
  foreach ($rows as $r) {
    $c .= '<tr><td>' . h(ck_date($r['cree_le'])) . '</td><td>' . h($r['version'] ?? 'S') . '</td><td>' . h(trim($r['prenom'] . ' ' . $r['nom'])) . '<br><span class="note">' . h($r['email']) . '</span></td>' .
      implode('', array_map(static fn($k) => '<td>' . (!empty($r[$k]) ? (int) $r[$k] . '/5' : '—') . '</td>', array_keys($NOTES))) . '<td class="wrap">' . nl2br(h($r['commentaires'])) . '<br><span class="note">' . h($r['page']) . '</span></td>' .
      '<td><form method="post" class="suppr">' . $jeton . '<input type="hidden" name="action" value="supprimer_avis"><input type="hidden" name="id" value="' . (int) $r['id'] . '"><label class="note"><input type="checkbox" name="ok" value="1" required> confirmer</label><button class="btn d sm" title="Supprimer cet avis">Supprimer</button></form></td></tr>';
  }
  if (!$rows) $c .= '<tr><td colspan="' . (count($NOTES) + 5) . '">Aucun avis pour ces critères.</td></tr>';
  ck_page('Avis', $c . '</tbody></table></div></main>', 'avis'); exit;
}

/* ============================== JOURNAL ============================== */
if ($vue === 'journal') {
  $rows = $db->query('SELECT * FROM cockpit_journal ORDER BY id DESC LIMIT 300')->fetch_all(MYSQLI_ASSOC);
  $c = '<main><h1>Journal du cockpit</h1><p class="note">Connexions, échecs de connexion, exports et suppressions (300 derniers événements, conservés 12 mois). Adresse IP tronquée.</p><div class="tw"><table><thead><tr><th>Date</th><th>Événement</th><th>Détail</th><th>Adresse IP</th></tr></thead><tbody>';
  foreach ($rows as $r) $c .= '<tr><td>' . h(ck_date($r['le'])) . '</td><td>' . h($r['action']) . '</td><td>' . h($r['detail']) . '</td><td>' . h($r['ip']) . '</td></tr>';
  if (!$rows) $c .= '<tr><td colspan="4">Aucun événement.</td></tr>';
  ck_page('Journal', $c . '</tbody></table></div></main>', 'journal'); exit;
}

/* ============================== FICHE ============================== */
if ($vue === 'fiche') {
  $id = (int) ($_GET['id'] ?? 0);
  $s = $db->prepare('SELECT * FROM leads WHERE id=?'); $s->bind_param('i', $id); $s->execute(); $r = $s->get_result()->fetch_assoc();
  if (!$r) { header('Location: ?vue=demandes'); exit; }
  $s = $db->prepare('SELECT * FROM leads_suivi WHERE lead_id=? ORDER BY le DESC, id DESC'); $s->bind_param('i', $id); $s->execute(); $hist = $s->get_result()->fetch_all(MYSQLI_ASSOC);
  $L = ['cree_le' => 'Reçue le', 'version' => 'Version du prototype', 'type' => 'Origine', 'reference' => 'Référence', 'fonction' => 'Fonction', 'rappel_expert' => 'Rappel expert demandé',
        'consentement_le' => 'Consentement recueilli le', 'siret' => 'SIRET', 'code_postal' => 'Code postal', 'ville' => 'Ville', 'departement' => 'Département', 'effectif' => 'Effectif',
        'secteur' => 'Secteur', 'idcc' => 'Convention collective', 'montant_estime' => 'Montant estimé (€/an)', 'score_label' => 'Score Label BRH', 'etape' => 'Dernière étape atteinte',
        'premier_contact_le' => 'Première prise en charge', 'page' => 'Page'];
  $dl = '';
  foreach ($L as $k => $l) {
    $v = $r[$k] ?? null;
    if ($k === 'type') $v = BRH_LEAD_TYPES[$v] ?? $v;
    if ($k === 'version') $v = CK_VERSIONS[$v] ?? $v;
    if ($k === 'rappel_expert') $v = $v ? 'Oui' : 'Non';
    if ($k === 'cree_le' || $k === 'premier_contact_le') $v = ck_date($v);
    if ($k === 'montant_estime' && $v !== null) $v = number_format((int) $v, 0, ',', ' ') . ' €';
    if ($v === null || $v === '') continue;
    $dl .= '<dt>' . $l . '</dt><dd>' . h($v) . '</dd>';
  }
  if ($r['premier_contact_le']) $dl .= '<dt>Délai de prise en charge</dt><dd>' . ck_duree((strtotime($r['premier_contact_le']) - strtotime($r['cree_le'])) / 3600) . '</dd>';
  $json = json_decode((string) $r['donnees'], true);
  $nom = trim($r['prenom'] . ' ' . $r['nom']);
  $contact = '<p class="contact">' . ($r['email'] ? '<a class="btn o sm" href="mailto:' . h($r['email']) . '">Écrire : ' . h($r['email']) . '</a> ' : '') .
    ($r['telephone'] ? '<a class="btn o sm" href="tel:' . h(preg_replace('/[^\d+]/', '', $r['telephone'])) . '">Appeler : ' . h($r['telephone']) . '</a>' : '') . '</p>';
  $stOpts = BRH_LEAD_STATUTS; if ($r['statut'] !== 'traite') unset($stOpts['traite']);
  $suivi = '<form class="card" method="post">' . $jeton . '<input type="hidden" name="action" value="suivi"><input type="hidden" name="id" value="' . $id . '"><h2>Suivi commercial</h2><div class="grid2">' .
    '<label>Étape<select name="statut">' . ck_options($stOpts, (string) $r['statut']) . '</select></label>' .
    '<label>Motif si perdu<select name="motif_perte">' . ck_options(CK_MOTIFS, (string) $r['motif_perte'], '—') . '</select></label>' .
    '<label>Prochaine relance<input type="date" name="relance_le" value="' . h($r['relance_le']) . '"></label>' .
    '<label>Attribuée à<input name="attribue_a" maxlength="120" value="' . h($r['attribue_a']) . '" placeholder="expert, Caisse régionale…"></label></div>' .
    '<button class="btn">Enregistrer le suivi</button></form>';
  $notes = '<form class="card" method="post">' . $jeton . '<input type="hidden" name="action" value="note"><input type="hidden" name="id" value="' . $id . '"><h2>Notes et historique</h2>' .
    '<label class="full">Nouvelle note interne<textarea name="texte" rows="3" maxlength="2000" required placeholder="Compte rendu d\'appel, besoin exprimé, prochaine action…"></textarea></label><button class="btn o">Ajouter la note</button>' .
    '<ol class="hist">';
  $NAT = ['note' => 'Note', 'statut' => 'Étape', 'relance' => 'Relance', 'attribution' => 'Attribution'];
  foreach ($hist as $x) $notes .= '<li class="n-' . h($x['nature']) . '"><span class="note">' . h(ck_date($x['le'])) . ' · ' . h($NAT[$x['nature']] ?? $x['nature']) . '</span><div>' . nl2br(h($x['texte'])) . '</div></li>';
  $notes .= '<li class="n-statut"><span class="note">' . h(ck_date($r['cree_le'])) . ' · Réception</span><div>' . h(BRH_LEAD_TYPES[$r['type']] ?? $r['type']) . ' — ' . h(CK_VERSIONS[$r['version']] ?? $r['version']) . '</div></li></ol></form>';
  $c = '<main><p><a href="?vue=demandes">← Toutes les demandes</a></p><div class="titre"><h1>' . h($nom ?: ($r['email'] ?: 'Demande n° ' . $id)) . ' <span class="soft">— ' . h($r['raison_sociale'] ?: 'entreprise non renseignée') . '</span></h1>' . ck_pill((string) $r['statut']) . '</div>' .
    $info . $contact . '<div class="cols"><div>' . $suivi . $notes . '</div><div><div class="card"><h2>Informations transmises</h2><dl>' . $dl . '</dl></div>' .
    '<details class="card"><summary>Toutes les données transmises (brutes)</summary><pre>' . h(json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . '</pre></details>' .
    '<form class="card danger" method="post">' . $jeton . '<input type="hidden" name="action" value="supprimer"><input type="hidden" name="id" value="' . $id . '"><h2>Droit à l\'effacement (RGPD)</h2>' .
    '<label class="chk"><input type="checkbox" name="ok" value="1" required> Je confirme la suppression définitive de cette demande et de son historique</label><button class="btn d">Supprimer définitivement</button></form></div></div></main>';
  ck_page('Demande ' . $id, $c, 'demandes'); exit;
}

/* ============================== DEMANDES ============================== */
if ($vue === 'demandes') {
  if (isset(BRH_LEAD_TYPES[$f['type']])) $add('type=?', 's', $f['type']);
  if (isset(BRH_LEAD_STATUTS[$f['statut']])) $add('statut=?', 's', $f['statut']);
  if ($f['statut'] === 'ouverts') $add("statut NOT IN ($CLOS)");
  if ($f['rappel'] === '1') $add('rappel_expert=1');
  if ($f['relance'] === 'echue') $add("relance_le IS NOT NULL AND relance_le<=CURDATE() AND statut NOT IN ($CLOS)");
  if ($f['relance'] === 'prevue') $add('relance_le>CURDATE()');
  if ($f['att'] !== '') { $l = '%' . $f['att'] . '%'; $add('attribue_a LIKE ?', 's', $l); }
  if ($f['q'] !== '') { $l = '%' . $f['q'] . '%'; $add('(nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR raison_sociale LIKE ? OR siret LIKE ? OR telephone LIKE ? OR ville LIKE ?)', 'sssssss', $l, $l, $l, $l, $l, $l, $l); }
  $w = $where ? ' WHERE ' . implode(' AND ', $where) : '';
  $tri = ($_GET['tri'] ?? '') === 'relance' ? 'relance_le IS NULL, relance_le ASC, cree_le DESC' : 'cree_le DESC';
  $COLS = ['id' => 'N°', 'cree_le' => 'Date', 'version' => 'Version', 'type' => 'Origine', 'statut' => 'Étape de suivi', 'premier_contact_le' => 'Prise en charge le', 'relance_le' => 'Relance prévue',
           'attribue_a' => 'Attribuée à', 'motif_perte' => 'Motif de perte', 'prenom' => 'Prénom', 'nom' => 'Nom', 'email' => 'E-mail', 'telephone' => 'Téléphone', 'fonction' => 'Fonction',
           'rappel_expert' => 'Rappel', 'raison_sociale' => 'Entreprise', 'siret' => 'SIRET', 'code_postal' => 'Code postal', 'ville' => 'Ville', 'effectif' => 'Effectif', 'secteur' => 'Secteur',
           'idcc' => 'Convention', 'montant_estime' => 'Montant estimé', 'score_label' => 'Score Label', 'reference' => 'Référence', 'etape' => 'Dernière étape (devis)', 'consentement_le' => 'Consentement le'];
  if (isset($_GET['csv'])) {
    $rows = $run('SELECT * FROM leads' . $w . ' ORDER BY ' . $tri);
    ck_journal('Export CSV des demandes', count($rows) . ' demandes' . ($where ? ' (filtrées)' : ''));
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="demandes-brh-' . date('Ymd') . '.csv"');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF"); fputcsv($o, array_values($COLS), ';');
    foreach ($rows as $r) {
      $r['type'] = BRH_LEAD_TYPES[$r['type']] ?? $r['type']; $r['statut'] = BRH_LEAD_STATUTS[$r['statut']] ?? $r['statut'];
      $r['motif_perte'] = CK_MOTIFS[$r['motif_perte'] ?? ''] ?? ''; $r['rappel_expert'] = $r['rappel_expert'] ? 'oui' : 'non';
      fputcsv($o, array_map(static fn($k) => ck_cell($r[$k] ?? ''), array_keys($COLS)), ';');
    }
    exit;
  }
  $p = max(1, (int) ($_GET['p'] ?? 1));
  $n = (int) ($run('SELECT COUNT(*) n FROM leads' . $w)[0]['n'] ?? 0);
  $rows = $run('SELECT * FROM leads' . $w . ' ORDER BY ' . $tri . ' LIMIT ' . CK_PAGE . ' OFFSET ' . (($p - 1) * CK_PAGE));
  $base = $f + ['vue' => 'demandes', 'tri' => (string) ($_GET['tri'] ?? '')];
  $stF = ['ouverts' => 'En cours (non clos)'] + BRH_LEAD_STATUTS;
  $c = '<main><h1>Demandes des dirigeants</h1>' . $info .
    '<form class="card filtres" method="get"><input type="hidden" name="vue" value="demandes">' .
    '<label>Version<select name="v">' . ck_options(CK_VERSIONS, $f['v'], 'Toutes') . '</select></label>' .
    '<label>Origine<select name="type">' . ck_options(BRH_LEAD_TYPES, $f['type'], 'Toutes') . '</select></label>' .
    '<label>Étape de suivi<select name="statut">' . ck_options($stF, $f['statut'], 'Toutes') . '</select></label>' .
    '<label>Relance<select name="relance">' . ck_options(['echue' => 'À faire (échue)', 'prevue' => 'Prévue'], $f['relance'], 'Toutes') . '</select></label>' .
    '<label>Rappel expert<select name="rappel">' . ck_options(['1' => 'Demandé'], $f['rappel'], 'Indifférent') . '</select></label>' .
    '<label>Du<input type="date" name="du" value="' . h($f['du']) . '"></label><label>Au<input type="date" name="au" value="' . h($f['au']) . '"></label>' .
    '<label>Attribuée à<input name="att" value="' . h($f['att']) . '"></label>' .
    '<label class="grow">Recherche<input name="q" value="' . h($f['q']) . '" placeholder="nom, e-mail, entreprise, SIRET, ville"></label>' .
    '<label>Tri<select name="tri">' . ck_options(['relance' => 'Par date de relance'], (string) ($_GET['tri'] ?? ''), 'Plus récentes') . '</select></label>' .
    '<button class="btn">Filtrer</button><a class="btn o" href="?vue=demandes">Effacer</a><a class="btn o" href="' . ck_qs($base + ['csv' => '1']) . '">Exporter (CSV)</a></form>' .
    '<p class="note">' . $n . ' demande' . ($n > 1 ? 's' : '') . '</p>' .
    '<div class="tw"><table><thead><tr><th>Reçue le</th><th>Version</th><th>Origine</th><th>Suivi</th><th>Contact</th><th>Entreprise</th><th>Effectif</th><th>Montant / score</th><th>Attribuée à</th></tr></thead><tbody>';
  foreach ($rows as $r) {
    $u = '?id=' . (int) $r['id'];
    $echue = $r['relance_le'] && $r['relance_le'] <= date('Y-m-d') && !in_array($r['statut'], BRH_LEAD_STATUTS_CLOS, true);
    $c .= '<tr><td><a href="' . $u . '">' . h(ck_date($r['cree_le'])) . '</a></td><td>' . h($r['version']) . '</td>' .
      '<td>' . h(BRH_LEAD_TYPES[$r['type']] ?? $r['type']) . ($r['rappel_expert'] ? ' <span class="tag">rappel</span>' : '') . (!empty($r['etape']) ? '<br><span class="note">Étape : ' . h($r['etape']) . '</span>' : '') . '</td>' .
      '<td>' . ck_pill((string) $r['statut']) . ($r['relance_le'] ? '<br><span class="note' . ($echue ? ' late' : '') . '">Relance ' . h(ck_date($r['relance_le'], false)) . '</span>' : '') . '</td>' .
      '<td><a href="' . $u . '">' . h(trim($r['prenom'] . ' ' . $r['nom']) ?: '—') . '</a><br>' . h($r['email']) . '<br><span class="note">' . h($r['telephone']) . '</span></td>' .
      '<td>' . h($r['raison_sociale'] ?: '—') . '<br><span class="note">' . h(implode(' · ', array_filter([trim($r['code_postal'] . ' ' . $r['ville']), (string) $r['siret']]))) . '</span></td>' .
      '<td>' . ($r['effectif'] ? (int) $r['effectif'] : '—') . '</td>' .
      '<td>' . ($r['montant_estime'] !== null ? number_format((int) $r['montant_estime'], 0, ',', ' ') . ' €/an' : '') . ($r['score_label'] !== null ? ' Score ' . (int) $r['score_label'] . '/100' : '') . '</td>' .
      '<td>' . h($r['attribue_a']) . '</td></tr>';
  }
  if (!$rows) $c .= '<tr><td colspan="9">Aucune demande pour ces critères.</td></tr>';
  $pages = max(1, (int) ceil($n / CK_PAGE));
  $c .= '</tbody></table></div><div class="pg">' . ($p > 1 ? '<a class="btn o sm" href="' . ck_qs($base + ['p' => (string) ($p - 1)]) . '">← Précédentes</a>' : '') .
    '<span class="note">Page ' . $p . ' sur ' . $pages . '</span>' . ($p < $pages ? '<a class="btn o sm" href="' . ck_qs($base + ['p' => (string) ($p + 1)]) . '">Suivantes →</a>' : '') . '</div>' .
    '<p class="note">Données personnelles recueillies avec le consentement des dirigeants : conservées 12 mois puis supprimées automatiquement ; usage réservé au projet ; exports à conserver dans un espace sécurisé ; suppression sur demande (fiche → « Supprimer définitivement »).</p></main>';
  ck_page('Demandes', $c, 'demandes'); exit;
}

/* ============================== TABLEAU DE BORD ============================== */
$q1 = static fn(string $sql) => ($x = $db->query($sql)) ? $x->fetch_assoc() : [];
$qa = static fn(string $sql) => ($x = $db->query($sql)) ? $x->fetch_all(MYSQLI_ASSOC) : [];
$k = $q1("SELECT COUNT(*) total,
    SUM(cree_le >= NOW() - INTERVAL 30 DAY) n30, SUM(cree_le < NOW() - INTERVAL 30 DAY AND cree_le >= NOW() - INTERVAL 60 DAY) n30p,
    SUM(statut='nouveau') nouveaux, SUM(statut='nouveau' AND rappel_expert=1) rappels,
    SUM(relance_le IS NOT NULL AND relance_le <= CURDATE() AND statut NOT IN ($CLOS)) echues,
    SUM(statut='signe') signes, SUM(statut='perdu') perdus,
    AVG(TIMESTAMPDIFF(MINUTE, cree_le, premier_contact_le)) / 60 delai,
    SUM(TIMESTAMPDIFF(HOUR, cree_le, premier_contact_le) <= 48) sous48, COUNT(premier_contact_le) pris
  FROM leads");
$tot = (int) ($k['total'] ?? 0);
$tend = (int) $k['n30p'] > 0 ? round(100 * ((int) $k['n30'] - (int) $k['n30p']) / (int) $k['n30p']) : null;
$clos = (int) $k['signes'] + (int) $k['perdus'];
$tuiles = [
  ['?vue=demandes&du=' . date('Y-m-d', strtotime('-30 days')), (int) $k['n30'], 'demandes sur 30 jours', $tend === null ? '' : ($tend >= 0 ? '+' : '') . $tend . ' % vs 30 j précédents'],
  ['?vue=demandes&statut=nouveau', (int) $k['nouveaux'], 'à prendre en charge', (int) $k['rappels'] . ' avec rappel expert demandé'],
  ['?vue=demandes&relance=echue&tri=relance', (int) $k['echues'], 'relances à faire', 'date de relance atteinte'],
  ['?vue=demandes&statut=contacte', ck_duree($k['delai'] !== null ? (float) $k['delai'] : null), 'délai moyen de prise en charge', (int) $k['pris'] ? round(100 * (int) $k['sous48'] / (int) $k['pris']) . ' % sous 48 h' : 'aucune prise en charge'],
  ['?vue=demandes&statut=signe', $clos ? round(100 * (int) $k['signes'] / $clos) . ' %' : '—', 'taux de transformation', (int) $k['signes'] . ' signé' . ((int) $k['signes'] > 1 ? 's' : '') . ' / ' . $clos . ' clos'],
];
$c = '<main><div class="titre"><h1>Tableau de bord</h1><span class="note">' . $tot . ' demande' . ($tot > 1 ? 's' : '') . ' conservée' . ($tot > 1 ? 's' : '') . ' (12 mois glissants) · ' . date('d/m/Y H:i') . '</span></div>' . $info . '<div class="kpis big">';
foreach ($tuiles as [$u, $v, $l, $s]) $c .= '<a href="' . h($u) . '"><b>' . h($v) . '</b>' . h($l) . '<small>' . h($s) . '</small></a>';
$c .= '</div>';

/* priorités : nouvelles demandes (rappel demandé d'abord, les plus anciennes en tête) et relances échues */
$prio = $qa("SELECT id, cree_le, version, type, prenom, nom, raison_sociale, rappel_expert, statut, relance_le FROM leads
  WHERE statut='nouveau' OR (relance_le IS NOT NULL AND relance_le <= CURDATE() AND statut NOT IN ($CLOS))
  ORDER BY (statut='nouveau' AND rappel_expert=1) DESC, COALESCE(relance_le, DATE(cree_le)) ASC LIMIT 10");
$c .= '<div class="cols"><section class="card"><h2>À traiter en priorité</h2>';
if ($prio) {
  $c .= '<ul class="prio">';
  foreach ($prio as $r) {
    $age = (int) floor((time() - strtotime($r['cree_le'])) / 3600);
    $c .= '<li><a href="?id=' . (int) $r['id'] . '"><b>' . h(trim($r['prenom'] . ' ' . $r['nom']) ?: 'Sans nom') . '</b> · ' . h($r['raison_sociale'] ?: 'entreprise non renseignée') . '</a>' .
      '<span class="note">' . h(BRH_LEAD_TYPES[$r['type']] ?? $r['type']) . ' · ' . h($r['version']) . ' · ' .
      ($r['statut'] === 'nouveau' ? 'reçue il y a ' . ($age < 48 ? $age . ' h' : floor($age / 24) . ' j') : 'relance du ' . h(ck_date($r['relance_le'], false))) . '</span>' .
      ($r['rappel_expert'] && $r['statut'] === 'nouveau' ? '<span class="tag">rappel</span>' : '') . ($r['statut'] === 'nouveau' && $age >= 48 ? '<span class="tag late">+48 h</span>' : '') . '</li>';
  }
  $c .= '</ul>';
} else $c .= '<p class="note">Rien en attente : toutes les demandes sont prises en charge.</p>';
$c .= '</section>';

/* entonnoir de suivi commercial */
$pipe = []; foreach ($qa('SELECT statut, COUNT(*) n FROM leads GROUP BY statut') as $x) $pipe[$x['statut']] = (int) $x['n'];
$mx = $pipe ? max($pipe) : 0;
$c .= '<section class="card"><h2>Suivi commercial</h2><table class="mini"><tbody>';
foreach (BRH_LEAD_STATUTS as $st => $l) { if ($st === 'traite' && empty($pipe[$st])) continue; $n = $pipe[$st] ?? 0;
  $c .= '<tr><td><a href="?vue=demandes&statut=' . $st . '">' . ck_pill($st) . '</a></td><td class="num">' . $n . '</td><td class="bar">' . ck_barre($n, $mx) . '</td></tr>'; }
$mot = $qa("SELECT motif_perte m, COUNT(*) n FROM leads WHERE statut='perdu' AND motif_perte IS NOT NULL GROUP BY motif_perte ORDER BY n DESC");
$c .= '</tbody></table>' . ($mot ? '<p class="note">Motifs de perte : ' . h(implode(' · ', array_map(static fn($x) => (CK_MOTIFS[$x['m']] ?? $x['m']) . ' ' . $x['n'], $mot))) . '</p>' : '') . '</section></div>';

/* demandes par semaine (12 dernières semaines) */
$sem = []; foreach ($qa('SELECT YEARWEEK(cree_le, 3) yw, COUNT(*) n FROM leads WHERE cree_le >= CURDATE() - INTERVAL 12 WEEK GROUP BY yw') as $x) $sem[(string) $x['yw']] = (int) $x['n'];
$lundi = strtotime('monday this week'); $pts = [];
for ($i = 11; $i >= 0; $i--) { $t = strtotime("-$i week", $lundi); $pts[] = [date('d/m', $t), $sem[date('oW', $t)] ?? 0]; }
$mxw = max(1, max(array_column($pts, 1)));
$svg = '<svg class="chart" viewBox="0 0 720 190" role="img" aria-label="Demandes par semaine sur 12 semaines">';
foreach ($pts as $i => [$d, $n]) {
  $hh = round(130 * $n / $mxw, 1); $x = $i * 60 + 12; $y = 150 - $hh;
  $svg .= '<rect x="' . $x . '" y="' . $y . '" width="36" height="' . max($hh, 1) . '" rx="4"></rect>' .
    '<text class="v" x="' . ($x + 18) . '" y="' . ($y - 6) . '">' . $n . '</text><text x="' . ($x + 18) . '" y="172">' . $d . '</text>';
}
$c .= '<section class="card"><h2>Demandes reçues par semaine</h2>' . $svg . '<line x1="0" y1="150" x2="720" y2="150"></line></svg><p class="note">Semaines commençant le lundi indiqué.</p></section>';

/* test A/B : par version */
$ver = $qa("SELECT version, COUNT(*) n, SUM(type='devis') devis, SUM(rappel_expert=1) rappels, SUM(type='devis_en_cours') commences,
    SUM(type='devis_en_cours' AND etape='Devis envoyé') aboutis, SUM(statut NOT IN ('nouveau')) pris, SUM(statut='signe') signes,
    AVG(TIMESTAMPDIFF(MINUTE, cree_le, premier_contact_le)) / 60 delai FROM leads GROUP BY version ORDER BY FIELD(version,'S','A','B')");
$ab = []; foreach ($qa("SELECT version, COALESCE(etape,'—') etape, COUNT(*) n FROM leads WHERE type='devis_en_cours' AND (etape IS NULL OR etape<>'Devis envoyé') GROUP BY version, etape ORDER BY version, n DESC") as $x) $ab[$x['version']][] = $x['etape'] . ' : ' . $x['n'];
$c .= '<section class="card"><h2>Test A/B : résultats par version</h2><div class="tw"><table><thead><tr><th>Version</th><th>Demandes</th><th>Devis envoyés</th><th>Rappels demandés</th><th>Devis commencés (e-mail)</th><th>dont allés au bout</th><th>Abandons par étape</th><th>Prises en charge</th><th>Délai moyen</th><th>Signés</th></tr></thead><tbody>';
foreach ($ver as $x) $c .= '<tr><td><a href="?vue=demandes&v=' . h($x['version']) . '">' . h(CK_VERSIONS[$x['version']] ?? $x['version']) . '</a></td><td class="num">' . (int) $x['n'] . '</td><td class="num">' . (int) $x['devis'] . '</td><td class="num">' . (int) $x['rappels'] . '</td><td class="num">' . (int) $x['commences'] . '</td><td class="num">' . (int) $x['aboutis'] . '</td><td class="wrap">' . h(implode(' · ', $ab[$x['version']] ?? [])) . '</td><td class="num">' . (int) $x['pris'] . '</td><td class="num">' . ck_duree($x['delai'] !== null ? (float) $x['delai'] : null) . '</td><td class="num">' . (int) $x['signes'] . '</td></tr>';
if (!$ver) $c .= '<tr><td colspan="10">Aucune demande pour l\'instant.</td></tr>';
$c .= '</tbody></table></div><p class="note">Les devis commencés ne sont suivis que si le dirigeant a laissé son e-mail avec son accord (version A). Comparer les versions sur la même période : ' .
  'les volumes dépendent aussi du nombre de testeurs envoyés sur chaque site.</p></section>';

/* par origine */
$ori = $qa('SELECT type, COUNT(*) n FROM leads GROUP BY type ORDER BY n DESC'); $mo = $ori ? (int) $ori[0]['n'] : 0;
$c .= '<section class="card"><h2>Origine des demandes</h2><table class="mini"><tbody>';
foreach ($ori as $x) $c .= '<tr><td><a href="?vue=demandes&type=' . h($x['type']) . '">' . h(BRH_LEAD_TYPES[$x['type']] ?? $x['type']) . '</a></td><td class="num">' . (int) $x['n'] . '</td><td class="bar">' . ck_barre((int) $x['n'], $mo) . '</td></tr>';
if (!$ori) $c .= '<tr><td>Aucune demande pour l\'instant.</td></tr>';
$c .= '</tbody></table></section></main>';
ck_page('Tableau de bord', $c, 'bord');
