<?php
/* ============================================================================
   admin-leads.php — administration des demandes des dirigeants (leads) et des avis.
   Adresse : https://protobrh.monsitedetest.com/admin-leads.php (même base pour S, A et B).
   Accès séparé de la porte d'accès des testeurs : ADMIN_LOGIN et ADMIN_PASSWORD dans config.php
   (sur Hostinger uniquement, jamais sur GitHub). Sans ces deux lignes, la page reste fermée.
   Sécurité : session dédiée (2 h d'inactivité), cookie HttpOnly / SameSite Strict, 5 essais erronés
   = blocage 15 minutes, jeton anti-falsification sur chaque action, page non indexée.
   Fonctions : liste filtrable, fiche détaillée, suivi, export CSV, suppression (RGPD).
   Le Cockpit BRH (cockpitbrh/) reprend ces fonctions avec tableau de bord, relances, notes et journal ; cette page sera retirée une fois le cockpit en service.
   ============================================================================ */
declare(strict_types=1);
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $e) {} ob_end_clean(); }
require_once __DIR__ . '/leads-base.php';

const ADM_DUREE = 7200, ADM_ESSAIS = 5, ADM_BLOCAGE = 900, ADM_PAGE = 50;
const ADM_STATUTS = BRH_LEAD_STATUTS;   // suivi commun avec le Cockpit BRH (cockpitbrh.monsitedetest.com)
$e = static fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
/* export CSV : une valeur commençant par = + - @ n'est jamais interprétée comme une formule par le tableur */
$cell = static fn($v) => preg_match('/^[=+\-@\t\r]/', (string) $v) ? "'" . $v : (string) $v;

/* ---------- session et identification ---------- */
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('BRHADMIN');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
$login = defined('ADMIN_LOGIN') ? trim((string) constant('ADMIN_LOGIN')) : '';
$mdp   = defined('ADMIN_PASSWORD') ? (string) constant('ADMIN_PASSWORD') : '';
$configure = $login !== '' && strlen($mdp) >= 10;

/* blocage après plusieurs essais : compté par adresse IP, hors session (fichier temporaire du serveur) */
$fic = sys_get_temp_dir() . '/brh_admin_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __DIR__) . '.json';
$essais = is_file($fic) ? (json_decode((string) @file_get_contents($fic), true) ?: []) : [];
$bloque = ($essais['n'] ?? 0) >= ADM_ESSAIS && (time() - ($essais['t'] ?? 0)) < ADM_BLOCAGE;

if (isset($_GET['sortir'])) { $_SESSION = []; session_destroy(); header('Location: admin-leads.php'); exit; }
$msg = '';
if ($configure && !$bloque && ($_POST['action'] ?? '') === 'connexion') {
  if (hash_equals($login, (string) ($_POST['login'] ?? '')) & hash_equals($mdp, (string) ($_POST['mdp'] ?? ''))) {
    session_regenerate_id(true);
    $_SESSION['adm'] = ['t' => time(), 'csrf' => bin2hex(random_bytes(16))];
    @unlink($fic);
    header('Location: admin-leads.php'); exit;
  }
  $essais = ['n' => (($essais['n'] ?? 0) >= ADM_ESSAIS ? 0 : ($essais['n'] ?? 0)) + 1, 't' => time()];
  @file_put_contents($fic, json_encode($essais), LOCK_EX);
  $bloque = $essais['n'] >= ADM_ESSAIS;
  usleep(600000);
  $msg = $bloque ? 'Trop d\'essais : accès bloqué 15 minutes.' : 'Identifiant ou mot de passe incorrect.';
}
$connecte = $configure && isset($_SESSION['adm']) && (time() - (int) $_SESSION['adm']['t']) < ADM_DUREE;
if ($connecte) $_SESSION['adm']['t'] = time(); elseif (isset($_SESSION['adm'])) unset($_SESSION['adm']);

function adm_page(string $titre, string $corps): void { ?>
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title><?= htmlspecialchars($titre) ?> — Administration Banque des RH</title>
<style>
:root{--g:#065145;--t:#016265;--l:#8FB822;--m:#E3EFEA;--ink:#1d2b28;--sl:#5c6b64;--ln:#dfe6e2;--bg:#f5f8f6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
header{background:var(--g);color:#fff;padding:14px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}header b{font-size:16px}header nav{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}
header a{color:#fff;text-decoration:none;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.12)}header a.on{background:var(--l);color:#14301f;font-weight:700}
main{max-width:1320px;margin:0 auto;padding:22px 24px 60px}h1{font-size:20px;color:var(--g);margin:0 0 14px}h2{font-size:16px;color:var(--g);margin:22px 0 8px}
.card{background:#fff;border:1px solid var(--ln);border-radius:14px;padding:16px 18px;margin-bottom:16px}
form.f{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}form.f label{display:flex;flex-direction:column;font-size:12px;color:var(--sl);gap:3px}
input,select{font:inherit;padding:7px 9px;border:1px solid var(--ln);border-radius:8px;background:#fff}
.btn{display:inline-block;font:600 13px system-ui;padding:8px 14px;border-radius:8px;border:1px solid var(--g);background:var(--g);color:#fff;text-decoration:none;cursor:pointer}
.btn.o{background:#fff;color:var(--g)}.btn.d{background:#a3262a;border-color:#a3262a}
table{width:100%;border-collapse:collapse;background:#fff}th{background:var(--m);color:var(--g);text-align:left;font-size:12px;padding:8px;position:sticky;top:0}
td{border-top:1px solid var(--ln);padding:8px;vertical-align:top;font-size:13px}tr:hover td{background:#fafcfb}td a{color:var(--t);font-weight:600}
.tw{overflow-x:auto;border:1px solid var(--ln);border-radius:12px}.k{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px}.k div{background:#fff;border:1px solid var(--ln);border-radius:12px;padding:10px 14px;min-width:130px}.k b{display:block;font-size:20px;color:var(--g)}
.pill{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--m);color:var(--g)}.pill.nouveau{background:#fff3d6;color:#8a6d00}.pill.traite{background:#e6efe0;color:#3e6b13}
dl{display:grid;grid-template-columns:200px 1fr;gap:6px 14px;margin:0}dt{color:var(--sl)}dd{margin:0}pre{white-space:pre-wrap;word-break:break-word;background:var(--bg);border:1px solid var(--ln);border-radius:10px;padding:12px;font-size:12px;max-height:520px;overflow:auto}
.msg{background:#fdecec;color:#8a1f1f;border-radius:8px;padding:8px 12px;margin-bottom:12px}.ok{background:#e9f4e3;color:#2f5c0f}
.login{max-width:380px;margin:9vh auto;background:#fff;border:1px solid var(--ln);border-radius:16px;padding:28px}.login label{display:block;margin-top:12px;font-size:13px;color:var(--sl)}.login input{width:100%;margin-top:4px}
.pg{display:flex;gap:8px;align-items:center;margin-top:12px}.note{font-size:12px;color:var(--sl)}
</style></head><body><?= $corps ?></body></html>
<?php }

/* ---------- écran d'identification ---------- */
if (!$connecte) {
  $c = '<div class="login"><h1>Administration — Banque des RH</h1>';
  if (!$configure) {
    $c .= '<p>L\'administration n\'est pas encore activée.</p><p class="note">Ajoutez dans <b>config.php</b> (sur Hostinger, dossier du site) :<br><code>const ADMIN_LOGIN = \'votre-identifiant\';</code><br><code>const ADMIN_PASSWORD = \'un mot de passe d\'au moins 10 caractères\';</code></p>';
  } else {
    if ($msg) $c .= '<div class="msg">' . $e($msg) . '</div>';
    if ($bloque) $c .= '<p class="msg">Accès temporairement bloqué. Réessayez dans 15 minutes.</p>';
    else $c .= '<form method="post" autocomplete="off"><input type="hidden" name="action" value="connexion">'.
      '<label>Identifiant<input name="login" required autofocus></label><label>Mot de passe<input name="mdp" type="password" required></label>'.
      '<p><button class="btn" type="submit">Se connecter</button></p></form><p class="note">Accès réservé à l\'équipe projet. Les données affichées sont personnelles (RGPD) : ne pas les diffuser.</p>';
  }
  adm_page('Connexion', $c . '</div>'); exit;
}

/* ---------- base ---------- */
$db = brh_leads_db();
if (!$db) { adm_page('Erreur', '<main><div class="msg">Connexion à la base MySQL impossible : vérifiez DB_HOST, DB_NAME, DB_USER et DB_PASS dans config.php.</div></main>'); exit; }
$csrf = $_SESSION['adm']['csrf'];
$vue = ($_GET['vue'] ?? 'leads') === 'avis' ? 'avis' : 'leads';

/* ---------- actions (POST + jeton) ---------- */
$info = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
  $id = (int) ($_POST['id'] ?? 0);
  if (($_POST['action'] ?? '') === 'statut' && isset(ADM_STATUTS[$_POST['statut'] ?? ''])) {
    $s = $db->prepare('UPDATE leads SET statut=? WHERE id=?'); $st = (string) $_POST['statut']; $s->bind_param('si', $st, $id); $s->execute();
    header('Location: admin-leads.php?id=' . $id . '&maj=1'); exit;
  }
  if (($_POST['action'] ?? '') === 'supprimer' && $id > 0) {
    $s = $db->prepare('DELETE FROM leads WHERE id=?'); $s->bind_param('i', $id); $s->execute();
    header('Location: admin-leads.php?suppr=1'); exit;
  }
  if (($_POST['action'] ?? '') === 'supprimer_avis' && $id > 0) {
    $s = $db->prepare('DELETE FROM feedback WHERE id=?'); $s->bind_param('i', $id); $s->execute();
    header('Location: admin-leads.php?vue=avis&suppr=1'); exit;
  }
}
if (isset($_GET['suppr'])) $info = 'Enregistrement supprimé.';
if (isset($_GET['maj'])) $info = 'Statut mis à jour.';

$nav = '<header><b>Banque des RH — administration</b><nav><a href="admin-leads.php"' . ($vue === 'leads' ? ' class="on"' : '') . '>Demandes des dirigeants</a>'.
  '<a href="admin-leads.php?vue=avis"' . ($vue === 'avis' ? ' class="on"' : '') . '>Avis des testeurs</a><a href="admin-leads.php?sortir=1">Se déconnecter</a></nav></header>';

/* ---------- filtres communs ---------- */
$f = ['v' => (string) ($_GET['v'] ?? ''), 'type' => (string) ($_GET['type'] ?? ''), 'q' => trim((string) ($_GET['q'] ?? '')),
      'du' => (string) ($_GET['du'] ?? ''), 'au' => (string) ($_GET['au'] ?? ''), 'statut' => (string) ($_GET['statut'] ?? '')];
$where = []; $types = ''; $args = [];
$add = static function (string $sql, string $t, $v) use (&$where, &$types, &$args) { $where[] = $sql; $types .= $t; $args[] = $v; };
if (in_array($f['v'], ['S', 'A', 'B'], true)) $add('version=?', 's', $f['v']);
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $f['du'])) $add('cree_le>=?', 's', $f['du'] . ' 00:00:00');
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $f['au'])) $add('cree_le<=?', 's', $f['au'] . ' 23:59:59');
$sel = static fn(array $o, string $cur, string $tous) => '<option value="">' . $tous . '</option>' . implode('', array_map(static fn($k) => '<option value="' . htmlspecialchars((string) $k) . '"' . ((string) $k === $cur ? ' selected' : '') . '>' . htmlspecialchars((string) $o[$k]) . '</option>', array_keys($o)));
$qs = static fn(array $x) => http_build_query(array_filter($x, static fn($v) => $v !== ''));

/* ============================== AVIS ============================== */
if ($vue === 'avis') {
  if ($f['q'] !== '') { $like = '%' . $f['q'] . '%'; $where[] = '(nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR commentaires LIKE ?)'; $types .= 'ssss'; array_push($args, $like, $like, $like, $like); }
  $w = $where ? ' WHERE ' . implode(' AND ', $where) : '';
  $tab = $db->query("SHOW TABLES LIKE 'feedback'");
  $rows = [];
  if ($tab && $tab->num_rows) { $s = $db->prepare("SELECT * FROM feedback$w ORDER BY cree_le DESC LIMIT 2000"); if ($types) $s->bind_param($types, ...$args); $s->execute(); $rows = $s->get_result()->fetch_all(MYSQLI_ASSOC); }
  $NOTES = ['note_pertinence' => 'Pertinence', 'note_facilite' => 'Facilité', 'note_valeur' => 'Valeur', 'note_infos' => 'Infos', 'note_diagnostic' => 'Diagnostic', 'note_newsletter' => 'Newsletter', 'note_chatbot' => 'Assistant'];
  if (isset($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="avis-brh-' . date('Ymd') . '.csv"');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
    fputcsv($o, array_merge(['Date', 'Version', 'Prénom', 'Nom', 'E-mail'], array_values($NOTES), ['Commentaires', 'Page']), ';');
    foreach ($rows as $r) fputcsv($o, array_map($cell, array_merge([$r['cree_le'], $r['version'] ?? 'S', $r['prenom'], $r['nom'], $r['email']], array_map(static fn($k) => $r[$k] ?: '', array_keys($NOTES)), [$r['commentaires'], $r['page']])), ';');
    exit;
  }
  $c = $nav . '<main><h1>Avis des testeurs (« Votre avis »)</h1>' . ($info ? '<div class="msg ok">' . $e($info) . '</div>' : '') .
    '<div class="card"><form class="f" method="get"><input type="hidden" name="vue" value="avis"><label>Version<select name="v">' . $sel(['S' => 'Standard', 'A' => 'A', 'B' => 'B'], $f['v'], 'Toutes') . '</select></label>' .
    '<label>Du<input type="date" name="du" value="' . $e($f['du']) . '"></label><label>Au<input type="date" name="au" value="' . $e($f['au']) . '"></label>' .
    '<label>Recherche<input name="q" value="' . $e($f['q']) . '" placeholder="nom, e-mail, commentaire"></label><button class="btn">Filtrer</button>' .
    '<a class="btn o" href="admin-leads.php?' . $e($qs(['vue' => 'avis', 'v' => $f['v'], 'du' => $f['du'], 'au' => $f['au'], 'q' => $f['q'], 'csv' => '1'])) . '">Exporter (CSV)</a></form></div>' .
    '<p class="note">' . count($rows) . ' avis</p><div class="tw"><table><tr><th>Date</th><th>Version</th><th>Testeur</th>' . implode('', array_map(static fn($l) => '<th>' . $l . '</th>', $NOTES)) . '<th>Commentaires</th><th></th></tr>';
  foreach ($rows as $r) {
    $c .= '<tr><td>' . $e(substr((string) $r['cree_le'], 0, 16)) . '</td><td>' . $e($r['version'] ?? 'S') . '</td><td>' . $e(trim($r['prenom'] . ' ' . $r['nom'])) . '<br><span class="note">' . $e($r['email']) . '</span></td>' .
      implode('', array_map(static fn($k) => '<td>' . ($r[$k] ? (int) $r[$k] . '/5' : '—') . '</td>', array_keys($NOTES))) . '<td>' . nl2br($e($r['commentaires'])) . '<br><span class="note">' . $e($r['page']) . '</span></td>' .
      '<td><form method="post"><input type="hidden" name="csrf" value="' . $e($csrf) . '"><input type="hidden" name="action" value="supprimer_avis"><input type="hidden" name="id" value="' . (int) $r['id'] . '"><label class="note" title="Cocher pour confirmer"><input type="checkbox" name="ok" required> confirmer</label> <button class="btn d" title="Supprimer cet avis">×</button></form></td></tr>';
  }
  adm_page('Avis', $c . '</table></div></main>'); exit;
}

/* ============================== FICHE ============================== */
if (isset($_GET['id'])) {
  $id = (int) $_GET['id'];
  $s = $db->prepare('SELECT * FROM leads WHERE id=?'); $s->bind_param('i', $id); $s->execute(); $r = $s->get_result()->fetch_assoc();
  if (!$r) { header('Location: admin-leads.php'); exit; }
  $L = ['cree_le' => 'Date', 'version' => 'Version du prototype', 'type' => 'Origine', 'reference' => 'Référence', 'prenom' => 'Prénom', 'nom' => 'Nom', 'email' => 'E-mail',
        'telephone' => 'Téléphone', 'fonction' => 'Fonction', 'rappel_expert' => 'Rappel expert demandé', 'consentement_le' => 'Consentement recueilli le', 'raison_sociale' => 'Entreprise',
        'siret' => 'SIRET', 'code_postal' => 'Code postal', 'ville' => 'Ville', 'departement' => 'Département', 'effectif' => 'Effectif', 'secteur' => 'Secteur', 'idcc' => 'Convention collective',
        'montant_estime' => 'Montant estimé (€/an)', 'score_label' => 'Score Label BRH', 'etape' => 'Dernière étape atteinte', 'page' => 'Page'];
  $dl = '';
  foreach ($L as $k => $l) { $v = $r[$k]; if ($k === 'type') $v = BRH_LEAD_TYPES[$v] ?? $v; if ($k === 'rappel_expert') $v = $v ? 'Oui' : 'Non'; if ($v === null || $v === '') continue; $dl .= '<dt>' . $l . '</dt><dd>' . $e($v) . '</dd>'; }
  $json = json_decode((string) $r['donnees'], true);
  $c = $nav . '<main><p><a href="admin-leads.php">← Retour à la liste</a></p><h1>' . $e(trim($r['prenom'] . ' ' . $r['nom']) ?: $r['email']) . ' — ' . $e($r['raison_sociale'] ?: 'entreprise non renseignée') . '</h1>' .
    ($info ? '<div class="msg ok">' . $e($info) . '</div>' : '') .
    '<div class="card"><form class="f" method="post"><input type="hidden" name="csrf" value="' . $e($csrf) . '"><input type="hidden" name="action" value="statut"><input type="hidden" name="id" value="' . $id . '">' .
    '<label>Suivi<select name="statut">' . implode('', array_map(static fn($k) => '<option value="' . $k . '"' . ($r['statut'] === $k ? ' selected' : '') . '>' . ADM_STATUTS[$k] . '</option>', array_keys(ADM_STATUTS))) . '</select></label><button class="btn">Enregistrer</button></form></div>' .
    '<div class="card"><dl>' . $dl . '</dl></div><h2>Toutes les données transmises</h2><pre>' . $e(json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . '</pre>' .
    '<h2>Droit à l\'effacement (RGPD)</h2><form method="post"><input type="hidden" name="csrf" value="' . $e($csrf) . '"><input type="hidden" name="action" value="supprimer"><input type="hidden" name="id" value="' . $id . '"><label><input type="checkbox" name="ok" required> Je confirme la suppression définitive de cette demande</label> <button class="btn d">Supprimer définitivement</button></form></main>';
  adm_page('Demande ' . $id, $c); exit;
}

/* ============================== LISTE ============================== */
if (isset(BRH_LEAD_TYPES[$f['type']])) $add('type=?', 's', $f['type']);
if (isset(ADM_STATUTS[$f['statut']])) $add('statut=?', 's', $f['statut']);
if ($f['q'] !== '') { $like = '%' . $f['q'] . '%'; $where[] = '(nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR raison_sociale LIKE ? OR siret LIKE ? OR telephone LIKE ?)'; $types .= 'ssssss'; array_push($args, $like, $like, $like, $like, $like, $like); }
$w = $where ? ' WHERE ' . implode(' AND ', $where) : '';
$COLS = ['cree_le' => 'Date', 'version' => 'Version', 'type' => 'Origine', 'statut' => 'Suivi', 'prenom' => 'Prénom', 'nom' => 'Nom', 'email' => 'E-mail', 'telephone' => 'Téléphone',
         'fonction' => 'Fonction', 'rappel_expert' => 'Rappel', 'raison_sociale' => 'Entreprise', 'siret' => 'SIRET', 'code_postal' => 'Code postal', 'ville' => 'Ville',
         'effectif' => 'Effectif', 'secteur' => 'Secteur', 'idcc' => 'Convention', 'montant_estime' => 'Montant estimé', 'score_label' => 'Score Label', 'reference' => 'Référence', 'etape' => 'Dernière étape', 'consentement_le' => 'Consentement le'];

if (isset($_GET['csv'])) {
  $s = $db->prepare('SELECT * FROM leads' . $w . ' ORDER BY cree_le DESC'); if ($types) $s->bind_param($types, ...$args); $s->execute(); $res = $s->get_result();
  header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="demandes-brh-' . date('Ymd') . '.csv"');
  $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF"); fputcsv($o, array_values($COLS), ';');
  while ($r = $res->fetch_assoc()) { $r['type'] = BRH_LEAD_TYPES[$r['type']] ?? $r['type']; $r['statut'] = ADM_STATUTS[$r['statut']] ?? $r['statut']; $r['rappel_expert'] = $r['rappel_expert'] ? 'oui' : 'non';
    fputcsv($o, array_map(static fn($k) => $cell($r[$k] ?? ''), array_keys($COLS)), ';'); }
  exit;
}

$p = max(1, (int) ($_GET['p'] ?? 1));
$s = $db->prepare('SELECT COUNT(*) n, SUM(statut=\'nouveau\') nv, COUNT(DISTINCT NULLIF(email,\'\')) em, SUM(type=\'devis\') dv FROM leads' . $w); if ($types) $s->bind_param($types, ...$args); $s->execute();
$k = $s->get_result()->fetch_assoc();
$s = $db->prepare('SELECT * FROM leads' . $w . ' ORDER BY cree_le DESC LIMIT ' . ADM_PAGE . ' OFFSET ' . (($p - 1) * ADM_PAGE)); if ($types) $s->bind_param($types, ...$args); $s->execute();
$rows = $s->get_result()->fetch_all(MYSQLI_ASSOC);
/* parcours du devis par version : devis envoyés, devis commencés (e-mail laissé), étape d'abandon */
$fun = $db->query("SELECT version, SUM(type='devis_en_cours') commences, SUM(type='devis_en_cours' AND etape='Devis envoyé') aboutis, SUM(type='devis') envoyes FROM leads GROUP BY version ORDER BY version");
$aband = $db->query("SELECT version, COALESCE(etape,'—') etape, COUNT(*) n FROM leads WHERE type='devis_en_cours' AND (etape IS NULL OR etape<>'Devis envoyé') GROUP BY version, etape ORDER BY version, n DESC");
$ab = []; if ($aband) while ($x = $aband->fetch_assoc()) $ab[$x['version']][] = $x['etape'] . ' : ' . $x['n'];
$funHtml = '';
if ($fun && $fun->num_rows) { $funHtml = '<h2>Parcours du devis par version (test A/B)</h2><div class="tw" style="margin-bottom:6px"><table><tr><th>Version</th><th>Devis envoyés</th><th>Devis commencés avec e-mail</th><th>dont allés au bout</th><th>Abandons, par dernière étape atteinte</th></tr>';
  while ($x = $fun->fetch_assoc()) $funHtml .= '<tr><td>' . $e($x['version']) . '</td><td>' . (int) $x['envoyes'] . '</td><td>' . (int) $x['commences'] . '</td><td>' . (int) $x['aboutis'] . '</td><td>' . $e(implode(' · ', $ab[$x['version']] ?? [])) . '</td></tr>';
  $funHtml .= '</table></div><p class="note">Les devis commencés ne sont suivis que si le dirigeant a laissé son e-mail avec son accord (version A).</p>'; }
$base = ['v' => $f['v'], 'type' => $f['type'], 'statut' => $f['statut'], 'q' => $f['q'], 'du' => $f['du'], 'au' => $f['au']];

$c = $nav . '<main><h1>Demandes des dirigeants</h1>' . ($info ? '<div class="msg ok">' . $e($info) . '</div>' : '') .
  '<div class="k"><div><b>' . (int) $k['n'] . '</b>demandes</div><div><b>' . (int) $k['nv'] . '</b>à traiter</div><div><b>' . (int) $k['dv'] . '</b>devis</div><div><b>' . (int) $k['em'] . '</b>e-mails distincts</div></div>' .
  '<div class="card"><form class="f" method="get"><label>Version<select name="v">' . $sel(['S' => 'Standard', 'A' => 'A', 'B' => 'B'], $f['v'], 'Toutes') . '</select></label>' .
  '<label>Origine<select name="type">' . $sel(BRH_LEAD_TYPES, $f['type'], 'Toutes') . '</select></label><label>Suivi<select name="statut">' . $sel(ADM_STATUTS, $f['statut'], 'Tous') . '</select></label>' .
  '<label>Du<input type="date" name="du" value="' . $e($f['du']) . '"></label><label>Au<input type="date" name="au" value="' . $e($f['au']) . '"></label>' .
  '<label>Recherche<input name="q" value="' . $e($f['q']) . '" placeholder="nom, e-mail, entreprise, SIRET"></label><button class="btn">Filtrer</button>' .
  '<a class="btn o" href="admin-leads.php?' . $e($qs($base + ['csv' => '1'])) . '">Exporter (CSV)</a></form></div>' .
  $funHtml . '<h2>Toutes les demandes</h2><div class="tw"><table><tr><th>Date</th><th>Version</th><th>Origine</th><th>Suivi</th><th>Contact</th><th>Entreprise</th><th>Effectif</th><th>Montant / score</th><th>Rappel</th></tr>';
foreach ($rows as $r) {
  $c .= '<tr><td><a href="admin-leads.php?id=' . (int) $r['id'] . '">' . $e(substr((string) $r['cree_le'], 0, 16)) . '</a></td><td>' . $e($r['version']) . '</td><td>' . $e(BRH_LEAD_TYPES[$r['type']] ?? $r['type']) . (!empty($r['etape']) ? '<br><span class="note">Étape : ' . $e($r['etape']) . '</span>' : '') . '</td>' .
    '<td><span class="pill ' . $e($r['statut']) . '">' . $e(ADM_STATUTS[$r['statut']] ?? $r['statut']) . '</span></td>' .
    '<td><a href="admin-leads.php?id=' . (int) $r['id'] . '">' . $e(trim($r['prenom'] . ' ' . $r['nom']) ?: '—') . '</a><br>' . $e($r['email']) . '<br><span class="note">' . $e($r['telephone']) . '</span></td>' .
    '<td>' . $e($r['raison_sociale'] ?: '—') . '<br><span class="note">' . $e(implode(' · ', array_filter([trim($r['code_postal'] . ' ' . $r['ville']), (string) $r['siret']]))) . '</span></td>' .
    '<td>' . ($r['effectif'] ? (int) $r['effectif'] : '—') . '</td><td>' . ($r['montant_estime'] !== null ? number_format((int) $r['montant_estime'], 0, ',', ' ') . ' €/an' : '') . ($r['score_label'] !== null ? ' Score ' . (int) $r['score_label'] . '/100' : '') . '</td>' .
    '<td>' . ($r['rappel_expert'] ? 'Oui' : '') . '</td></tr>';
}
if (!$rows) $c .= '<tr><td colspan="9">Aucune demande pour ces critères.</td></tr>';
$pages = max(1, (int) ceil(((int) $k['n']) / ADM_PAGE));
$c .= '</table></div><div class="pg">' . ($p > 1 ? '<a class="btn o" href="admin-leads.php?' . $e($qs($base + ['p' => (string) ($p - 1)])) . '">← Précédentes</a>' : '') .
  '<span class="note">Page ' . $p . ' sur ' . $pages . '</span>' . ($p < $pages ? '<a class="btn o" href="admin-leads.php?' . $e($qs($base + ['p' => (string) ($p + 1)])) . '">Suivantes →</a>' : '') . '</div>' .
  '<p class="note">Données personnelles recueillies avec le consentement des dirigeants : conservées 12 mois puis supprimées automatiquement ; usage réservé au projet, export à conserver de façon sécurisée, suppression sur demande (fiche → « Supprimer définitivement »).</p></main>';
adm_page('Demandes', $c);
