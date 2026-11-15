<?php
/* Version C 1.13 — 15/11/2026 · fiche : argumentaire de vente ; sessions séparées (1.8) · historique : VERSIONS.md */
/* ============================================================================
   lm-api.php — API JSON du cockpit BRH (lead management, version C)
   Appelée par cockpit-brh.html. Double contrôle : porte d'accès du prototype (brh_acces_api), puis connexion propre au cockpit :
     - compte national d'amorçage : LM_ADMIN_LOGIN / LM_ADMIN_PASSWORD dans config.php
       (à défaut ADMIN_LOGIN / ADMIN_PASSWORD, ceux de admin-leads.php) ;
     - autres comptes (national, expert BRH d'une CR, filiale) créés dans le cockpit,
       mots de passe hachés (password_hash) dans la table lm_users.
   Sécurité : session dédiée BRHLM (8 h d'inactivité), cookie HttpOnly / SameSite Strict,
   8 essais erronés = blocage 15 minutes, jeton anti-falsification (en-tête X-LM-CSRF) sur
   chaque écriture, contrôle des droits sur chaque dossier, requêtes préparées.
   ============================================================================ */
declare(strict_types=1);
require_once __DIR__ . '/acces.php'; brh_acces_api();   // règle du prototype : porte d'accès d'abord, puis la connexion propre au cockpit
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $e) {} ob_end_clean(); }
require_once __DIR__ . '/lm-base.php';

const LM_SESSION_DUREE = 28800, LM_ESSAIS = 8, LM_BLOCAGE = 900;
function lm_sortir(array $r, int $code = 200): void { http_response_code($code); echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function lm_erreur(string $m, int $code = 400): void { lm_sortir(['ok' => false, 'error' => $m], $code); }

/* ---------- session ---------- */
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
/* Deux sessions distinctes : la porte d'accès (BRHACCES, déjà ouverte puis fermée par brh_acces_api) et le cockpit (BRHLM).
   Après la porte, PHP garde l'identifiant BRHACCES en mémoire : sans le remplacer ici, le cockpit écrirait dans la session
   de la porte et la détruirait à la connexion (session_regenerate_id) ou à la déconnexion (session_destroy). */
session_name('BRHLM');
$sidLm = (string) ($_COOKIE['BRHLM'] ?? '');
session_id(preg_match('/^[A-Za-z0-9,-]{22,256}$/', $sidLm) ? $sidLm : session_create_id());
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
$A = (string) ($_GET['a'] ?? '');
$POST = $_SERVER['REQUEST_METHOD'] === 'POST';
$IN = [];
if ($POST) { $raw = (string) file_get_contents('php://input'); if (strlen($raw) > 300000) lm_erreur('Requête trop volumineuse', 413); $IN = json_decode($raw, true); if (!is_array($IN)) $IN = []; }
$adminLogin = defined('LM_ADMIN_LOGIN') ? (string) constant('LM_ADMIN_LOGIN') : (defined('ADMIN_LOGIN') ? (string) constant('ADMIN_LOGIN') : '');
$adminMdp   = defined('LM_ADMIN_PASSWORD') ? (string) constant('LM_ADMIN_PASSWORD') : (defined('ADMIN_PASSWORD') ? (string) constant('ADMIN_PASSWORD') : '');

$db = lm_db();
if (!$db) lm_erreur('Base MySQL indisponible : vérifiez DB_HOST, DB_NAME, DB_USER et DB_PASS dans config.php.', 500);

/* ---------- connexion ---------- */
$fic = sys_get_temp_dir() . '/brh_lm_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __DIR__) . '.json';
$essais = is_file($fic) ? (json_decode((string) @file_get_contents($fic), true) ?: []) : [];
$bloque = ($essais['n'] ?? 0) >= LM_ESSAIS && (time() - ($essais['t'] ?? 0)) < LM_BLOCAGE;
if ($A === 'connexion' && $POST) {
  if ($bloque) lm_erreur('Trop d’essais : accès bloqué 15 minutes.', 429);
  $lg = trim((string) ($IN['login'] ?? '')); $pw = (string) ($IN['mdp'] ?? ''); $u = null;
  if ($adminLogin !== '' && strlen($adminMdp) >= 10 && hash_equals($adminLogin, $lg) && hash_equals($adminMdp, $pw)) {
    $u = ['id' => 0, 'login' => $lg, 'nom' => 'Équipe nationale', 'email' => '', 'role' => 'national', 'cr_code' => null, 'filiale' => null];
  } else {
    $r = lm_ligne($db, 'SELECT * FROM lm_users WHERE login = ? AND actif = 1', 's', [$lg]);
    if ($r && password_verify($pw, (string) $r['hash'])) {
      $u = ['id' => (int) $r['id'], 'login' => $r['login'], 'nom' => $r['nom'], 'email' => $r['email'], 'role' => $r['role'], 'cr_code' => $r['cr_code'], 'filiale' => $r['filiale']];
      lm_q($db, 'UPDATE lm_users SET vu_le = NOW() WHERE id = ?', 'i', [(int) $r['id']]);
    }
  }
  if (!$u) {
    $essais = ['n' => (($essais['n'] ?? 0) >= LM_ESSAIS ? 0 : ($essais['n'] ?? 0)) + 1, 't' => time()];
    @file_put_contents($fic, json_encode($essais), LOCK_EX); usleep(600000);
    lm_erreur(($essais['n'] >= LM_ESSAIS) ? 'Trop d’essais : accès bloqué 15 minutes.' : 'Identifiant ou mot de passe incorrect.', 401);
  }
  @unlink($fic);
  session_regenerate_id(true);
  $_SESSION['lm'] = ['u' => $u, 't' => time(), 'csrf' => bin2hex(random_bytes(16))];
  lm_sortir(['ok' => true]);
}
if ($A === 'deconnexion') { $_SESSION = []; session_destroy(); setcookie('BRHLM', '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']); lm_sortir(['ok' => true]); }

$S = $_SESSION['lm'] ?? null;
if ($S && (time() - (int) $S['t']) > LM_SESSION_DUREE) { unset($_SESSION['lm']); $S = null; }
if ($A === 'moi' && !$S) lm_sortir(['ok' => true, 'connecte' => false, 'configure' => $adminLogin !== '' && strlen($adminMdp) >= 10]);
if (!$S) lm_erreur('Session expirée : reconnectez-vous.', 401);
$_SESSION['lm']['t'] = time();
$U = $S['u'];
if ($U['id']) {   /* compte désactivé ou modifié depuis la connexion */
  $r = lm_user($db, (int) $U['id']);
  if (!$r || !(int) $r['actif']) { unset($_SESSION['lm']); lm_erreur('Compte désactivé.', 401); }
  $U = array_merge($U, ['nom' => $r['nom'], 'email' => $r['email'], 'role' => $r['role'], 'cr_code' => $r['cr_code'], 'filiale' => $r['filiale']]);
}
if ($POST && !hash_equals((string) $S['csrf'], (string) ($_SERVER['HTTP_X_LM_CSRF'] ?? ''))) lm_erreur('Jeton de sécurité invalide : rechargez la page.', 403);
$NAT = $U['role'] === 'national';
function lm_national(): void { global $NAT; if (!$NAT) lm_erreur('Action réservée à la console nationale.', 403); }

/* ---------- présentation d'un dossier ---------- */
function lm_sla(array $d): array {
  $now = time(); $e = $d['echeance'] ? strtotime((string) $d['echeance']) : null; $p = $d['pris_le'] ? strtotime((string) $d['pris_le']) : null;
  if ($d['statut'] === 'cloture' && !$p) return ['etat' => 'clos', 'lib' => 'Clôturé'];
  if ($p) return $e && $p > $e ? ['etat' => 'hors_delai', 'lib' => 'Pris en charge hors délai'] : ['etat' => 'tenu', 'lib' => 'Pris en charge dans le délai'];
  if (!$e) return ['etat' => 'ok', 'lib' => ''];
  if ($d['niveau'] === 'abandonniste') return ['etat' => 'relance', 'lib' => ['Relance J+1 à venir', 'Relance J+7 à venir', 'Relances faites'][min(2, (int) $d['relances'])]];
  if ($e < $now) return ['etat' => 'retard', 'lib' => 'En retard de ' . lm_duree($now - $e)];
  if ($e - $now < 4 * 3600) return ['etat' => 'proche', 'lib' => 'Échéance dans ' . lm_duree($e - $now)];
  return ['etat' => 'ok', 'lib' => 'avant le ' . date('d/m à H\\hi', (int) $e)];
}
function lm_duree(int $s): string { $h = intdiv($s, 3600); return $h >= 48 ? intdiv($h, 24) . ' j' : ($h >= 1 ? $h . ' h' : max(1, intdiv($s, 60)) . ' min'); }
function lm_item(array $d): array {
  $v = json_decode((string) $d['volets'], true) ?: [];
  return ['id' => (int) $d['id'], 'reference' => $d['reference'], 'cree_le' => $d['cree_le'], 'maj_le' => $d['maj_le'], 'raison_sociale' => $d['raison_sociale'],
    'contact' => trim($d['prenom'] . ' ' . $d['nom']), 'effectif' => $d['effectif'] !== null ? (int) $d['effectif'] : null, 'ville' => $d['ville'], 'departement' => $d['departement'],
    'niveau' => $d['niveau'], 'statut' => $d['statut'], 'issue' => $d['issue'], 'client_statut' => $d['client_statut'], 'scenario' => $d['scenario'], 'marche' => $d['marche'],
    'cr_code' => $d['cr_code'], 'cr_nom' => $d['cr_nom'] ?? null, 'user_id' => $d['user_id'] !== null ? (int) $d['user_id'] : null, 'expert' => $d['expert_nom'] ?? null,
    'destinataire' => $d['destinataire'], 'canal' => $d['canal'], 'echeance' => $d['echeance'], 'pris_le' => $d['pris_le'], 'rdv_le' => $d['rdv_le'],
    'montant' => $d['montant'] !== null ? (int) $d['montant'] : null, 'solutions' => array_values(array_filter(explode(',', (string) $d['solutions']))), 'volets' => $v,
    'origine' => $d['origine'], 'rappel' => (int) $d['rappel_demande'] === 1, 'sla' => lm_sla($d)];
}
function lm_charger(int $id): array {
  global $db, $U;
  $d = lm_ligne($db, 'SELECT d.*, u.nom expert_nom, c.nom cr_nom FROM lm_dossiers d LEFT JOIN lm_users u ON u.id = d.user_id LEFT JOIN lm_cr c ON c.code = d.cr_code WHERE d.id = ?', 'i', [$id]);
  if (!$d) lm_erreur('Dossier introuvable.', 404);
  if (!lm_peut_voir($U, $d)) lm_erreur('Ce dossier n’est pas dans votre périmètre.', 403);
  return $d;
}
function lm_statut(int $id, array $d, string $st, string $detail): void {
  global $db, $U;
  $maj = ['statut' => $st, 'statut_le' => lm_maintenant(), 'maj_le' => lm_maintenant()];
  if (in_array($st, ['pris_en_charge', 'qualifie', 'propose', 'cloture'], true) && !$d['pris_le'] && $st !== 'cloture') $maj['pris_le'] = lm_maintenant();
  lm_maj($db, $id, $maj);
  lm_journal($db, $id, 'statut', LM_STATUTS[$d['statut']] . ' → ' . LM_STATUTS[$st] . ($detail !== '' ? ' — ' . $detail : ''), $U);
}
const LM_ORDRE = ['depose' => 0, 'attribue' => 1, 'pris_en_charge' => 2, 'qualifie' => 3, 'propose' => 4, 'cloture' => 5];
/* le statut avance, jamais ne recule (sauf « Rouvrir ») */
function lm_avancer(int $id, array $d, string $st, string $detail): void {
  if (LM_ORDRE[$st] > LM_ORDRE[$d['statut']]) lm_statut($id, $d, $st, $detail);
  elseif ($detail !== '') { global $db, $U; lm_journal($db, $id, 'action', $detail, $U); lm_maj($db, $id, ['maj_le' => lm_maintenant()]); }
}

/* ---------- périmètre de la liste ---------- */
function lm_perimetre(array &$w, string &$t, array &$a): void {
  global $U;
  if ($U['role'] === 'expert') { $w[] = 'd.cr_code = ?'; $t .= 's'; $a[] = (string) $U['cr_code']; }
  if ($U['role'] === 'filiale') { $w[] = 'd.volets LIKE ?'; $t .= 's'; $a[] = '%"' . $U['filiale'] . '":%'; }
}

/* ============================== LECTURES ============================== */
if ($A === 'moi') {
  $crs = lm_lignes($db, 'SELECT code, nom, departements, canal, scenario FROM lm_cr WHERE actif = 1 ORDER BY nom');
  lm_sortir(['ok' => true, 'connecte' => true, 'csrf' => $S['csrf'], 'user' => $U, 'envoi' => LM_EMAIL_ENVOI, 'redirection' => LM_EMAIL_REDIRECTION !== '', 'scenario_b' => LM_SCENARIO_B,
    'ref' => ['niveaux' => LM_NIVEAUX, 'statuts' => LM_STATUTS, 'issues' => LM_ISSUES, 'client' => LM_CLIENT, 'destinataires' => LM_DESTINATAIRES, 'canaux' => LM_CANAUX,
              'filiales' => LM_FILIALES, 'volet_statuts' => LM_VOLET_STATUTS, 'solutions' => LM_SOLUTIONS, 'marches' => LM_MARCHES, 'roles' => LM_ROLES, 'types' => BRH_LEAD_TYPES,
              'seuils' => ['pro_effectif' => LM_SEUIL_PRO_EFFECTIF, 'pro_ca' => LM_SEUIL_PRO_CA, 'appel_abandon' => LM_SEUIL_APPEL_ABANDON, 'fusion_jours' => LM_FUSION_JOURS]],
    'cr' => $crs]);
}

if ($A === 'dossiers') {
  lm_taches($db);   /* tâches planifiées au passage, au plus toutes les 10 minutes */
  $w = []; $t = ''; $a = [];
  lm_perimetre($w, $t, $a);
  $vue = (string) ($_GET['vue'] ?? 'actifs');
  if ($vue === 'actifs') $w[] = "d.statut <> 'cloture'"; elseif ($vue === 'clotures') $w[] = "d.statut = 'cloture'";
  foreach (['niveau' => LM_NIVEAUX, 'statut' => LM_STATUTS, 'client_statut' => LM_CLIENT] as $k => $ref) { $v = (string) ($_GET[$k] ?? ''); if (isset($ref[$v])) { $w[] = "d.$k = ?"; $t .= 's'; $a[] = $v; } }
  $cr = (string) ($_GET['cr'] ?? ''); if ($cr === '_aucune') $w[] = 'd.cr_code IS NULL'; elseif ($cr !== '') { $w[] = 'd.cr_code = ?'; $t .= 's'; $a[] = $cr; }
  if (($_GET['sla'] ?? '') === 'retard') $w[] = "d.statut IN ('depose','attribue') AND d.niveau <> 'abandonniste' AND d.echeance < NOW()";
  if (($_GET['moi'] ?? '') === '1' && $U['id']) { $w[] = 'd.user_id = ?'; $t .= 'i'; $a[] = (int) $U['id']; }
  $q = trim((string) ($_GET['q'] ?? ''));
  if ($q !== '') { $l = '%' . $q . '%'; $w[] = '(d.reference LIKE ? OR d.raison_sociale LIKE ? OR d.nom LIKE ? OR d.email LIKE ? OR d.siret LIKE ? OR d.ville LIKE ?)'; $t .= 'ssssss'; array_push($a, $l, $l, $l, $l, $l, $l); }
  $sql = 'SELECT d.*, u.nom expert_nom, c.nom cr_nom FROM lm_dossiers d LEFT JOIN lm_users u ON u.id = d.user_id LEFT JOIN lm_cr c ON c.code = d.cr_code'
    . ($w ? ' WHERE ' . implode(' AND ', $w) : '') . " ORDER BY (d.statut = 'cloture'), FIELD(d.niveau, 'ultra_chaud', 'chaud', 'abandonniste'), (d.echeance IS NULL), d.echeance, d.id DESC LIMIT 500";
  $rows = array_map('lm_item', lm_lignes($db, $sql, $t, $a));
  /* indicateurs du périmètre (dossiers ouverts) */
  $w2 = []; $t2 = ''; $a2 = []; lm_perimetre($w2, $t2, $a2);
  $all = lm_lignes($db, 'SELECT d.niveau, d.statut, d.issue, d.echeance, d.pris_le, d.relances, d.volets, d.user_id, d.cr_code FROM lm_dossiers d' . ($w2 ? ' WHERE ' . implode(' AND ', $w2) : ''), $t2, $a2);
  $k = ['ultra_chaud' => 0, 'chaud' => 0, 'abandonniste' => 0, 'retard' => 0, 'a_attribuer' => 0, 'volets_proposition' => 0, 'volets_signes' => 0, 'clotures' => 0, 'signes' => 0];
  foreach ($all as $d) {
    $v = json_decode((string) $d['volets'], true) ?: [];
    foreach ($v as $f => $x) { if ($U['role'] === 'filiale' && $f !== $U['filiale']) continue; if (($x['statut'] ?? '') === 'propose') $k['volets_proposition']++; if (($x['statut'] ?? '') === 'signe') $k['volets_signes']++; }
    if ($d['statut'] === 'cloture') { $k['clotures']++; if ($d['issue'] === 'signe') $k['signes']++; continue; }
    $k[$d['niveau']]++;
    if (in_array($d['statut'], ['depose', 'attribue'], true) && $d['niveau'] !== 'abandonniste' && $d['echeance'] && strtotime((string) $d['echeance']) < time()) $k['retard']++;
    if ($d['statut'] === 'depose' && !$d['user_id']) $k['a_attribuer']++;
  }
  lm_sortir(['ok' => true, 'dossiers' => $rows, 'kpi' => $k]);
}

if ($A === 'dossier') {
  $id = (int) ($_GET['id'] ?? 0); $d = lm_charger($id);
  $item = lm_item($d);
  $leads = [];
  foreach (lm_lignes($db, 'SELECT l.id, l.cree_le, l.type, l.etape, l.reference, l.donnees, x.niveau FROM lm_dossier_leads x JOIN leads l ON l.id = x.lead_id WHERE x.dossier_id = ? ORDER BY l.id', 'i', [$id]) as $l) {
    $j = json_decode((string) $l['donnees'], true) ?: [];
    $leads[] = ['id' => (int) $l['id'], 'cree_le' => $l['cree_le'], 'type' => $l['type'], 'type_lib' => BRH_LEAD_TYPES[$l['type']] ?? $l['type'], 'etape' => $l['etape'], 'reference' => $l['reference'],
      'niveau' => $l['niveau'], 'panier' => $j['panier'] ?? null, 'rh' => $j['rh'] ?? null, 'estimation' => $j['estimation_totale'] ?? null, 'priorites' => $j['priorities'] ?? null,
      'gain' => $j['fiscalGain']['total'] ?? null, 'label' => $j['labelBrh'] ?? null, 'conventions' => $j['entreprise']['source_donnees']['conventions'] ?? null];
  }
  $journal = lm_lignes($db, 'SELECT cree_le, acteur, action, detail FROM lm_journal WHERE dossier_id = ? ORDER BY id DESC LIMIT 300', 'i', [$id]);
  $emails = lm_lignes($db, 'SELECT id, cree_le, modele, destinataire, envoye_a, objet, corps, statut FROM lm_emails WHERE dossier_id = ? ORDER BY id DESC LIMIT 100', 'i', [$id]);
  if ($U['role'] === 'filiale') $emails = array_values(array_filter($emails, static fn($e) => str_starts_with((string) $e['modele'], 'dirigeant_')));
  $experts = $d['cr_code'] ? lm_lignes($db, "SELECT id, nom, referent FROM lm_users WHERE role = 'expert' AND actif = 1 AND cr_code = ? ORDER BY referent DESC, nom", 's', [$d['cr_code']]) : [];
  lm_sortir(['ok' => true, 'dossier' => $item + [
    'email' => $d['email'], 'prenom' => $d['prenom'], 'nom' => $d['nom'], 'telephone' => $d['telephone'], 'fonction' => $d['fonction'], 'siret' => $d['siret'], 'code_postal' => $d['code_postal'],
    'secteur' => $d['secteur'], 'idcc' => $d['idcc'], 'ca' => $d['ca'] !== null ? (int) $d['ca'] : null, 'client_declare' => $d['client_declare'], 'portefeuille' => $d['portefeuille'],
    'conseiller_pro' => $d['conseiller_pro'], 'synthese' => $d['synthese'], 'resultat' => $d['resultat'], 'niveau_le' => $d['niveau_le'], 'statut_le' => $d['statut_le'],
    'relances' => (int) $d['relances'], 'prochaine_relance' => $d['prochaine_relance'], 'consent_relance' => (int) $d['consent_relance'] === 1, 'version' => $d['version'],
    'lien_suivi' => lm_lien_suivi($d), 'jalons' => json_decode((string) $d['jalons'], true) ?: ['depose' => $d['cree_le']], 'argumentaire' => json_decode((string) ($d['argumentaire'] ?? ''), true) ?: null], 'leads' => $leads, 'journal' => $journal, 'emails' => $emails, 'experts' => $experts]);
}

if ($A === 'stats') {
  lm_national();
  $du = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($_GET['du'] ?? '')) ? $_GET['du'] . ' 00:00:00' : date('Y-m-d H:i:s', strtotime('-90 days'));
  $au = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($_GET['au'] ?? '')) ? $_GET['au'] . ' 23:59:59' : date('Y-m-d H:i:s');
  $rows = lm_lignes($db, 'SELECT d.*, c.nom cr_nom FROM lm_dossiers d LEFT JOIN lm_cr c ON c.code = d.cr_code WHERE d.cree_le BETWEEN ? AND ?', 'ss', [$du, $au]);
  $z = static fn() => ['n' => 0, 'ultra_chaud' => 0, 'chaud' => 0, 'abandonniste' => 0, 'pris' => 0, 'tenus' => 0, 'hors_delai' => 0, 'retard' => 0, 'delai_total' => 0, 'signes' => 0, 'clotures' => 0];
  $tot = $z(); $parCr = []; $statuts = array_fill_keys(array_keys(LM_STATUTS), 0); $issues = array_fill_keys(array_keys(LM_ISSUES), 0);
  $client = array_fill_keys(array_keys(LM_CLIENT), 0); $scen = ['A' => 0, 'B' => 0]; $origine = []; $volets = [];
  foreach (LM_FILIALES as $f => $x) $volets[$f] = array_fill_keys(array_keys(LM_VOLET_STATUTS), 0);
  foreach ($rows as $d) {
    $k = $d['cr_code'] ?: '_aucune';
    if (!isset($parCr[$k])) $parCr[$k] = $z() + ['nom' => $d['cr_nom'] ?: 'File nationale (à attribuer)'];
    $cumul = static function (array &$b) use ($d): void {
      $b['n']++; $b[$d['niveau']]++;
      if ($d['pris_le']) { $b['pris']++; $b['delai_total'] += max(0, strtotime((string) $d['pris_le']) - strtotime((string) $d['cree_le']));
        if ($d['niveau'] !== 'abandonniste') { if ($d['echeance'] && strtotime((string) $d['pris_le']) > strtotime((string) $d['echeance'])) $b['hors_delai']++; else $b['tenus']++; } }
      elseif ($d['niveau'] !== 'abandonniste' && in_array($d['statut'], ['depose', 'attribue'], true) && $d['echeance'] && strtotime((string) $d['echeance']) < time()) $b['retard']++;
      if ($d['statut'] === 'cloture') { $b['clotures']++; if ($d['issue'] === 'signe') $b['signes']++; }
    };
    $cumul($tot); $cumul($parCr[$k]);
    $statuts[$d['statut']]++; if ($d['issue'] && isset($issues[$d['issue']])) $issues[$d['issue']]++;
    $client[$d['client_statut']] = ($client[$d['client_statut']] ?? 0) + 1; $scen[$d['scenario']] = ($scen[$d['scenario']] ?? 0) + 1;
    $o = (string) $d['origine']; $origine[$o] = ($origine[$o] ?? 0) + 1;
    foreach ((json_decode((string) $d['volets'], true) ?: []) as $f => $x) if (isset($volets[$f][$x['statut'] ?? ''])) $volets[$f][$x['statut']]++;
  }
  $fin = static function (array $b): array { $b['delai_moyen_h'] = $b['pris'] ? round($b['delai_total'] / $b['pris'] / 3600, 1) : null; unset($b['delai_total']);
    $b['taux_sla'] = ($b['tenus'] + $b['hors_delai']) ? round(100 * $b['tenus'] / ($b['tenus'] + $b['hors_delai'])) : null; return $b; };
  $parCr = array_map($fin, $parCr); uasort($parCr, static fn($x, $y) => $y['n'] <=> $x['n']);
  $em = lm_lignes($db, 'SELECT modele, statut, COUNT(*) n FROM lm_emails WHERE cree_le BETWEEN ? AND ? GROUP BY modele, statut', 'ss', [$du, $au]);
  $semaines = lm_lignes($db, "SELECT DATE_FORMAT(cree_le, '%x-S%v') s, niveau, COUNT(*) n FROM lm_dossiers WHERE cree_le BETWEEN ? AND ? GROUP BY s, niveau ORDER BY s", 'ss', [$du, $au]);
  lm_sortir(['ok' => true, 'du' => substr($du, 0, 10), 'au' => substr($au, 0, 10), 'total' => $fin($tot), 'par_cr' => $parCr, 'statuts' => $statuts, 'issues' => $issues,
    'client' => $client, 'scenarios' => $scen, 'origines' => $origine, 'volets' => $volets, 'emails' => $em, 'semaines' => $semaines]);
}

if ($A === 'distribution') {
  lm_national();
  $rows = lm_lignes($db, 'SELECT d.*, u.nom expert_nom, c.nom cr_nom FROM lm_dossiers d LEFT JOIN lm_users u ON u.id = d.user_id LEFT JOIN lm_cr c ON c.code = d.cr_code ORDER BY d.id DESC LIMIT 300');
  $pec = [];
  foreach (lm_lignes($db, "SELECT dossier_id, MIN(cree_le) t FROM lm_emails WHERE modele = 'dirigeant_prise_en_charge' GROUP BY dossier_id") as $r) $pec[(int) $r['dossier_id']] = $r['t'];
  lm_sortir(['ok' => true, 'dossiers' => array_map(static fn($d) => lm_item($d) + ['conseiller_pro' => $d['conseiller_pro'], 'portefeuille' => $d['portefeuille'], 'email_pec' => $pec[(int) $d['id']] ?? null], $rows)]);
}

if ($A === 'cr' && !$POST) { lm_national(); lm_sortir(['ok' => true, 'cr' => lm_lignes($db, 'SELECT c.*, (SELECT COUNT(*) FROM lm_users u WHERE u.cr_code = c.code AND u.role = \'expert\' AND u.actif = 1) experts FROM lm_cr c ORDER BY c.nom')]); }
if ($A === 'users' && !$POST) { lm_national(); lm_sortir(['ok' => true, 'users' => lm_lignes($db, 'SELECT id, login, nom, email, role, cr_code, filiale, referent, actif, cree_le, vu_le FROM lm_users ORDER BY role, cr_code, nom')]); }
if ($A === 'clients' && !$POST) { lm_national(); lm_sortir(['ok' => true, 'clients' => lm_lignes($db, 'SELECT * FROM lm_clients ORDER BY raison_sociale LIMIT 2000')]); }
if ($A === 'emails' && !$POST) {
  lm_national();
  lm_sortir(['ok' => true, 'emails' => lm_lignes($db, 'SELECT e.id, e.dossier_id, d.reference, e.cree_le, e.modele, e.destinataire, e.envoye_a, e.objet, e.corps, e.statut FROM lm_emails e LEFT JOIN lm_dossiers d ON d.id = e.dossier_id ORDER BY e.id DESC LIMIT 300')]);
}
if ($A === 'export') {
  lm_national();
  $cell = static fn($v) => preg_match('/^[=+\-@\t\r]/', (string) $v) ? "'" . $v : (string) $v;
  header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="dossiers-brh-' . date('Ymd') . '.csv"');
  $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
  $C = ['reference' => 'Référence', 'cree_le' => 'Déposé le', 'niveau' => 'Niveau', 'statut' => 'Statut', 'issue' => 'Issue', 'raison_sociale' => 'Entreprise', 'siret' => 'SIRET', 'effectif' => 'Effectif',
        'departement' => 'Département', 'cr_nom' => 'Caisse régionale', 'scenario' => 'Scénario', 'client_statut' => 'Client', 'marche' => 'Marché', 'destinataire' => 'Destinataire', 'expert_nom' => 'Expert',
        'conseiller_pro' => 'Conseiller pro', 'canal' => 'Canal', 'echeance' => 'Échéance', 'pris_le' => 'Pris en charge le', 'montant' => 'Estimation €/an', 'solutions' => 'Solutions', 'origine' => 'Origine'];
  fputcsv($o, array_values($C), ';');
  foreach (lm_lignes($db, 'SELECT d.*, u.nom expert_nom, c.nom cr_nom FROM lm_dossiers d LEFT JOIN lm_users u ON u.id = d.user_id LEFT JOIN lm_cr c ON c.code = d.cr_code ORDER BY d.id DESC') as $d) {
    $d['niveau'] = LM_NIVEAUX[$d['niveau']]['lib'] ?? $d['niveau']; $d['statut'] = LM_STATUTS[$d['statut']] ?? $d['statut']; $d['issue'] = LM_ISSUES[$d['issue'] ?? ''] ?? '';
    $d['client_statut'] = LM_CLIENT[$d['client_statut']] ?? ''; $d['marche'] = LM_MARCHES[$d['marche'] ?? ''] ?? ''; $d['destinataire'] = LM_DESTINATAIRES[$d['destinataire'] ?? ''] ?? ''; $d['canal'] = LM_CANAUX[$d['canal'] ?? ''] ?? '';
    fputcsv($o, array_map(static fn($k) => $cell($d[$k] ?? ''), array_keys($C)), ';');
  }
  exit;
}

/* ============================== ACTIONS SUR UN DOSSIER ============================== */
if ($A === 'action' && $POST) {
  $id = (int) ($IN['id'] ?? 0); $d = lm_charger($id); $t = (string) ($IN['type'] ?? ''); $note = lm_txt($IN['note'] ?? '', 1000);
  $FIL = $U['role'] === 'filiale';
  if ($FIL && !in_array($t, ['volet', 'note'], true)) lm_erreur('Une filiale fait avancer son volet ; l’expert BRH reste maître du dossier.', 403);
  if ($d['statut'] === 'cloture' && !in_array($t, ['rouvrir', 'note', 'supprimer', 'volet'], true)) lm_erreur('Dossier clôturé : rouvrez-le d’abord.');
  switch ($t) {
    case 'prendre_en_charge':
      $uid = $U['id'] ?: null;
      lm_maj($db, $id, array_filter(['user_id' => $uid], static fn($v) => $v !== null));
      lm_avancer($id, $d, 'pris_en_charge', 'pris en charge par ' . $U['nom']);
      if ($d['email'] && !lm_ligne($db, "SELECT id FROM lm_emails WHERE dossier_id = ? AND modele = 'dirigeant_prise_en_charge'", 'i', [$id])) {
        $st = lm_email_prise_en_charge($db, lm_dossier($db, $id) ?? $d, $U);
        lm_journal($db, $id, 'email', 'E-mail au dirigeant « Votre demande est prise en charge par ' . $U['nom'] . ' » (' . lm_statut_email($st) . ')', $U);
      }
      break;
    case 'appel':
      $R = ['joint' => 'dirigeant joint', 'messagerie' => 'messagerie, message laissé', 'injoignable' => 'injoignable', 'rappeler' => 'à rappeler', 'faux_numero' => 'numéro erroné'];
      $r = (string) ($IN['resultat'] ?? ''); if (!isset($R[$r])) lm_erreur('Résultat d’appel inconnu.');
      lm_avancer($id, $d, 'pris_en_charge', 'Appel : ' . $R[$r] . ($note !== '' ? ' — ' . $note : ''));
      if (!$d['pris_le']) lm_maj($db, $id, ['pris_le' => lm_maintenant()]);
      break;
    case 'rdv':
      $dt = (string) ($IN['date'] ?? ''); $h = (string) ($IN['heure'] ?? '09:00'); $M = ['telephone' => 'téléphone', 'visio' => 'visio', 'agence' => 'agence', 'sur_site' => 'dans l’entreprise'];
      $o = DateTime::createFromFormat('!Y-m-d H:i', $dt . ' ' . $h);
      if (!$o || $o->format('Y-m-d H:i') !== $dt . ' ' . $h) lm_erreur('Date ou heure du rendez-vous invalide.');
      $mode = $M[(string) ($IN['mode'] ?? 'telephone')] ?? 'téléphone';
      lm_maj($db, $id, ['rdv_le' => $dt . ' ' . $h . ':00'] + ($d['pris_le'] ? [] : ['pris_le' => lm_maintenant()]));
      lm_avancer($id, lm_dossier($db, $id) ?? $d, 'qualifie', 'Rendez-vous planifié le ' . lm_date_fr($dt . ' ' . $h . ':00') . ' (' . $mode . ')' . ($note !== '' ? ' — ' . $note : ''));
      if ($d['email']) {
        $st = lm_email($db, $id, 'dirigeant_rdv', (string) $d['email'], 'Votre rendez-vous Banque des RH du ' . lm_date_fr($dt . ' ' . $h . ':00'),
          lm_bonjour($d) . "Votre rendez-vous avec " . $U['nom'] . ", expert Banque des Ressources Humaines, est confirmé le " . lm_date_fr($dt . ' ' . $h . ':00') . " (" . $mode . ").\n\nSuivre votre dossier : " . lm_lien_suivi($d) . lm_signature());
        lm_journal($db, $id, 'email', 'Confirmation de rendez-vous au dirigeant (' . lm_statut_email($st) . ')', $U);
      }
      break;
    case 'qualifier':
      $maj = [];
      if (isset(LM_MARCHES[$IN['marche'] ?? ''])) $maj['marche'] = (string) $IN['marche'];
      if (isset(LM_CLIENT[$IN['client_statut'] ?? ''])) $maj['client_statut'] = (string) $IN['client_statut'];
      if (isset($IN['effectif']) && $IN['effectif'] !== '' && is_numeric($IN['effectif'])) $maj['effectif'] = max(0, (int) $IN['effectif']);
      if (isset($IN['ca']) && $IN['ca'] !== '' && is_numeric($IN['ca'])) $maj['ca'] = max(0, (int) $IN['ca']);
      if ($maj) lm_maj($db, $id, $maj + ['maj_le' => lm_maintenant()] + ($d['pris_le'] ? [] : ['pris_le' => lm_maintenant()]));
      $txt = implode(', ', array_filter([isset($maj['marche']) ? 'marché ' . LM_MARCHES[$maj['marche']] : '', isset($maj['client_statut']) ? LM_CLIENT[$maj['client_statut']] : '',
        isset($maj['effectif']) ? $maj['effectif'] . ' salariés' : '', isset($maj['ca']) ? 'CA ' . number_format($maj['ca'], 0, ',', ' ') . ' €' : '']));
      lm_avancer($id, lm_dossier($db, $id) ?? $d, 'qualifie', 'Besoin qualifié' . ($txt ? ' : ' . $txt : '') . ($note !== '' ? ' — ' . $note : ''));
      break;
    case 'confier_pro':
      $nom = lm_txt($IN['conseiller'] ?? '', 190); $mail = lm_txt($IN['email'] ?? '', 190);
      if ($nom === '') lm_erreur('Indiquez le conseiller pro.');
      lm_maj($db, $id, ['conseiller_pro' => $nom, 'destinataire' => 'conseiller_pro', 'marche' => 'pro', 'maj_le' => lm_maintenant()]);
      lm_journal($db, $id, 'dispatch', 'Confié au conseiller pro ' . $nom . ' par l’expert BRH (pro / entrepreneur)' . ($note !== '' ? ' — ' . $note : ''), $U);
      if ($mail !== '') { $st = lm_email($db, $id, 'interne_conseiller_pro', $mail, 'Lead pro confié par l’expert BRH : ' . ($d['raison_sociale'] ?: $d['reference']), "Bonjour " . $nom . ",\n\n" . $U['nom'] . " vous confie ce lead pro.\n" . ($note !== '' ? "Message : " . $note . "\n" : '') . "\n" . lm_resume_interne($db, $d));
        lm_journal($db, $id, 'email', 'Lead transmis par e-mail au conseiller pro (' . lm_statut_email($st) . ')', $U); }
      break;
    case 'proposer':
      lm_avancer($id, $d, 'propose', 'Proposition remise au dirigeant' . ($note !== '' ? ' — ' . $note : ''));
      break;
    case 'cloturer':
      $is = (string) ($IN['issue'] ?? ''); if (!isset(LM_ISSUES[$is])) lm_erreur('Choisissez l’issue du dossier.');
      lm_maj($db, $id, ['issue' => $is, 'prochaine_relance' => null]);
      lm_statut($id, $d, 'cloture', 'issue : ' . LM_ISSUES[$is] . ($note !== '' ? ' — ' . $note : ''));
      break;
    case 'rouvrir':
      if ($d['statut'] !== 'cloture') lm_erreur('Le dossier n’est pas clôturé.');
      lm_maj($db, $id, ['issue' => null, 'statut' => $d['user_id'] ? 'pris_en_charge' : 'depose', 'statut_le' => lm_maintenant(), 'maj_le' => lm_maintenant()]);
      lm_journal($db, $id, 'statut', 'Dossier rouvert' . ($note !== '' ? ' — ' . $note : ''), $U);
      break;
    case 'note':
      if ($note === '') lm_erreur('Note vide.');
      lm_journal($db, $id, 'note', $note, $U); lm_maj($db, $id, ['maj_le' => lm_maintenant()]);
      break;
    case 'attribuer':
      $uid = (int) ($IN['user_id'] ?? 0); $x = lm_user($db, $uid);
      if (!$x || $x['role'] !== 'expert' || !(int) $x['actif']) lm_erreur('Expert inconnu ou inactif.');
      if (!$NAT && $x['cr_code'] !== $U['cr_code']) lm_erreur('Vous ne pouvez attribuer qu’à un expert de votre Caisse régionale.', 403);
      lm_maj($db, $id, ['user_id' => $uid, 'cr_code' => $x['cr_code'], 'destinataire' => $d['destinataire'] === 'national' || !$d['destinataire'] ? 'expert_brh' : $d['destinataire'], 'maj_le' => lm_maintenant()]);
      if ($d['statut'] === 'depose') lm_statut($id, $d, 'attribue', 'attribué à ' . $x['nom']); else lm_journal($db, $id, 'attribution', 'Dossier réattribué à ' . $x['nom'], $U);
      lm_email($db, $id, 'interne_attribution', (string) $x['email'], 'Cockpit BRH : le dossier ' . $d['reference'] . ' vous est attribué', lm_resume_interne($db, lm_dossier($db, $id) ?? $d));
      break;
    case 'transferer':
      /* national : vers une autre CR ; expert : « pas pour ma CR » → file nationale */
      $code = (string) ($IN['cr_code'] ?? '');
      if (!$NAT) { lm_maj($db, $id, ['cr_code' => null, 'user_id' => null, 'destinataire' => 'national', 'statut' => 'depose', 'statut_le' => lm_maintenant(), 'maj_le' => lm_maintenant()]);
        lm_journal($db, $id, 'transfert', 'Renvoyé à la file nationale par ' . $U['nom'] . ($note !== '' ? ' — ' . $note : ''), $U); break; }
      $cr = lm_cr($db, $code); if (!$cr) lm_erreur('Caisse régionale inconnue.');
      $exp = lm_expert_referent($db, $code);
      lm_maj($db, $id, ['cr_code' => $code, 'user_id' => $exp ? (int) $exp['id'] : null, 'destinataire' => 'expert_brh', 'canal' => $cr['canal'] === 'solead' ? 'solead' : 'cockpit',
        'statut' => $exp ? 'attribue' : 'depose', 'statut_le' => lm_maintenant(), 'maj_le' => lm_maintenant()]);
      lm_journal($db, $id, 'transfert', 'Transféré à ' . $cr['nom'] . ($exp ? ', attribué à ' . $exp['nom'] : '') . ($note !== '' ? ' — ' . $note : ''), $U);
      lm_email($db, $id, $cr['canal'] === 'solead' ? 'interne_solead' : 'interne_attribution', (string) ($cr['canal'] === 'solead' ? ($cr['solead_email'] ?? '') : ($exp['email'] ?? '')),
        'Cockpit BRH : dossier ' . $d['reference'] . ' transféré à ' . $cr['nom'], lm_resume_interne($db, lm_dossier($db, $id) ?? $d));
      break;
    case 'router':
      lm_national(); lm_router($db, $id, $U);
      break;
    case 'niveau':
      lm_national(); $n = (string) ($IN['niveau'] ?? ''); if (!isset(LM_NIVEAUX[$n])) lm_erreur('Niveau inconnu.');
      lm_maj($db, $id, ['niveau' => $n, 'niveau_le' => lm_maintenant(), 'echeance' => lm_echeance($n, lm_maintenant(), (int) $d['rappel_demande'] === 1), 'alerte_sla_le' => null, 'maj_le' => lm_maintenant()]);
      lm_journal($db, $id, 'niveau', 'Niveau corrigé : ' . LM_NIVEAUX[$d['niveau']]['lib'] . ' → ' . LM_NIVEAUX[$n]['lib'] . ($note !== '' ? ' — ' . $note : ''), $U);
      break;
    case 'volet':
      $f = (string) ($IN['filiale'] ?? ''); $vs = (string) ($IN['statut'] ?? '');
      if (!isset(LM_FILIALES[$f]) || !isset(LM_VOLET_STATUTS[$vs])) lm_erreur('Volet ou statut inconnu.');
      if ($FIL && $f !== $U['filiale']) lm_erreur('Vous ne pouvez faire avancer que le volet de votre filiale.', 403);
      $v = json_decode((string) $d['volets'], true) ?: [];
      $v[$f] = ['statut' => $vs, 'maj' => lm_maintenant(), 'note' => $note !== '' ? $note : ($v[$f]['note'] ?? '')];
      lm_maj($db, $id, ['volets' => json_encode($v, JSON_UNESCAPED_UNICODE), 'maj_le' => lm_maintenant()]);
      lm_journal($db, $id, 'volet', LM_FILIALES[$f]['lib'] . ' (' . LM_FILIALES[$f]['outil'] . ') : ' . LM_VOLET_STATUTS[$vs] . ($note !== '' ? ' — ' . $note : ''), $U);
      break;
    case 'email':
      $m = (string) ($IN['modele'] ?? ''); if (!$d['email']) lm_erreur('Pas d’e-mail pour ce dirigeant.');
      if (!(int) $d['consent_relance'] && $m !== 'prise_en_charge') lm_erreur('Le dirigeant a demandé à ne plus recevoir de relances.');
      $st = $m === 'reprise' ? lm_email_reprise($db, $d) : ($m === 'relance' ? lm_email_relance($db, $d, max(1, (int) $d['relances'] + 1)) : ($m === 'prise_en_charge' ? lm_email_prise_en_charge($db, $d, $U) : ''));
      if ($st === '') lm_erreur('Modèle inconnu.');
      lm_journal($db, $id, 'email', 'E-mail « ' . ['reprise' => 'Reprenez votre devis', 'relance' => 'Retrouvez le résultat de votre simulation', 'prise_en_charge' => 'Prise en charge'][$m] . ' » envoyé manuellement (' . lm_statut_email($st) . ')', $U);
      break;
    case 'stop_relances':
      lm_maj($db, $id, ['consent_relance' => 0, 'prochaine_relance' => null]); lm_journal($db, $id, 'relance', 'Relances automatiques arrêtées', $U);
      break;
    case 'supprimer':
      lm_national();
      if (empty($IN['confirme'])) lm_erreur('Confirmez la suppression.');
      $ids = array_map(static fn($r) => (int) $r['lead_id'], lm_lignes($db, 'SELECT lead_id FROM lm_dossier_leads WHERE dossier_id = ?', 'i', [$id]));
      foreach ($ids as $lid) lm_q($db, 'DELETE FROM leads WHERE id = ?', 'i', [$lid]);
      foreach (['lm_dossier_leads', 'lm_journal', 'lm_emails'] as $tb) lm_q($db, "DELETE FROM $tb WHERE dossier_id = ?", 'i', [$id]);
      lm_q($db, 'DELETE FROM lm_dossiers WHERE id = ?', 'i', [$id]);
      lm_sortir(['ok' => true, 'supprime' => true]);
    default:
      lm_erreur('Action inconnue.');
  }
  lm_sortir(['ok' => true]);
}

/* ============================== PARAMÉTRAGE (national) ============================== */
if ($A === 'cr_save' && $POST) {
  lm_national();
  $code = strtolower(preg_replace('/[^a-z0-9-]/i', '-', lm_txt($IN['code'] ?? '', 40))); $nom = lm_txt($IN['nom'] ?? '', 120);
  $deps = implode(',', array_filter(array_map(static fn($x) => strtoupper(trim($x)), preg_split('/[\s,;]+/', (string) ($IN['departements'] ?? ''))), static fn($x) => preg_match('/^(\d{2}|2[AB]|97\d)$/', $x)));
  $canal = ($IN['canal'] ?? '') === 'solead' ? 'solead' : 'cockpit'; $sc = ($IN['scenario'] ?? '') === 'B' ? 'B' : 'A';
  $sol = lm_txt($IN['solead_email'] ?? '', 190); $actif = empty($IN['actif']) ? 0 : 1;
  if ($code === '' || $nom === '') lm_erreur('Code et nom de la Caisse régionale requis.');
  if ($sol !== '' && !filter_var($sol, FILTER_VALIDATE_EMAIL)) lm_erreur('Adresse SOLEAD invalide.');
  foreach (explode(',', $deps) as $dp) if ($dp !== '') { $x = lm_ligne($db, 'SELECT code, nom FROM lm_cr WHERE code <> ? AND actif = 1 AND FIND_IN_SET(?, REPLACE(departements, \' \', \'\'))', 'ss', [$code, $dp]); if ($x && $actif) lm_erreur('Le département ' . $dp . ' est déjà rattaché à ' . $x['nom'] . '.'); }
  lm_q($db, 'INSERT INTO lm_cr (code, nom, departements, canal, scenario, solead_email, actif) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nom = VALUES(nom), departements = VALUES(departements), canal = VALUES(canal), scenario = VALUES(scenario), solead_email = VALUES(solead_email), actif = VALUES(actif)',
    'ssssssi', [$code, $nom, $deps, $canal, $sc, $sol !== '' ? $sol : null, $actif]);
  lm_sortir(['ok' => true]);
}
function lm_mdp(): string { $c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $p = ''; for ($i = 0; $i < 14; $i++) $p .= $c[random_int(0, strlen($c) - 1)]; return $p; }
if ($A === 'user_save' && $POST) {
  lm_national();
  $id = (int) ($IN['id'] ?? 0); $login = lm_txt($IN['login'] ?? '', 80); $nom = lm_txt($IN['nom'] ?? '', 120); $mail = lm_txt($IN['email'] ?? '', 190);
  $role = (string) ($IN['role'] ?? ''); if (!isset(LM_ROLES[$role])) lm_erreur('Rôle inconnu.');
  $cr = $role === 'expert' ? lm_txt($IN['cr_code'] ?? '', 40) : null; $fil = $role === 'filiale' ? (string) ($IN['filiale'] ?? '') : null;
  if ($role === 'expert' && !lm_cr($db, $cr)) lm_erreur('Choisissez la Caisse régionale de l’expert.');
  if ($role === 'filiale' && !isset(LM_FILIALES[$fil])) lm_erreur('Choisissez la filiale.');
  if ($login === '' || $nom === '' || !preg_match('/^[a-z0-9._@-]{3,80}$/i', $login)) lm_erreur('Identifiant (3 caractères au moins, sans espace) et nom requis.');
  if ($mail !== '' && !filter_var($mail, FILTER_VALIDATE_EMAIL)) lm_erreur('E-mail invalide.');
  if ($login === $adminLogin) lm_erreur('Cet identifiant est réservé au compte d’amorçage.');
  $ref = empty($IN['referent']) ? 0 : 1; $actif = !isset($IN['actif']) || !empty($IN['actif']) ? 1 : 0;
  $mdp = (string) ($IN['mdp'] ?? ''); if ($mdp !== '' && strlen($mdp) < 10) lm_erreur('Mot de passe : 10 caractères au moins.');
  $genere = null;
  $dup = lm_ligne($db, 'SELECT id FROM lm_users WHERE login = ? AND id <> ?', 'si', [$login, $id]); if ($dup) lm_erreur('Identifiant déjà utilisé.');
  if ($ref && $role === 'expert') lm_q($db, "UPDATE lm_users SET referent = 0 WHERE role = 'expert' AND cr_code = ? AND id <> ?", 'si', [$cr, $id]);
  if ($id) {
    lm_q($db, 'UPDATE lm_users SET login = ?, nom = ?, email = ?, role = ?, cr_code = ?, filiale = ?, referent = ?, actif = ? WHERE id = ?', 'ssssssiii', [$login, $nom, $mail, $role, $cr, $fil, $ref, $actif, $id]);
    if ($mdp !== '') lm_q($db, 'UPDATE lm_users SET hash = ? WHERE id = ?', 'si', [password_hash($mdp, PASSWORD_DEFAULT), $id]);
  } else {
    if ($mdp === '') $mdp = $genere = lm_mdp();
    lm_q($db, 'INSERT INTO lm_users (login, nom, email, role, cr_code, filiale, referent, hash, actif, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', 'ssssssisi',
      [$login, $nom, $mail, $role, $cr, $fil, $ref, password_hash($mdp, PASSWORD_DEFAULT), $actif]);
    $id = (int) $db->insert_id;
  }
  lm_sortir(['ok' => true, 'id' => $id, 'mdp' => $genere]);
}
if ($A === 'user_mdp' && $POST) {
  lm_national(); $id = (int) ($IN['id'] ?? 0); if (!lm_user($db, $id)) lm_erreur('Compte inconnu.');
  $p = lm_mdp(); lm_q($db, 'UPDATE lm_users SET hash = ? WHERE id = ?', 'si', [password_hash($p, PASSWORD_DEFAULT), $id]);
  lm_sortir(['ok' => true, 'mdp' => $p]);
}
if ($A === 'client_save' && $POST) {
  lm_national();
  $si = substr(preg_replace('/\D/', '', (string) ($IN['siren'] ?? '')), 0, 9); if (strlen($si) !== 9) lm_erreur('SIREN ou SIRET invalide.');
  $cr = lm_txt($IN['cr_code'] ?? '', 40); if (!lm_cr($db, $cr)) lm_erreur('Caisse régionale inconnue.');
  $m = ($IN['marche'] ?? '') === 'pro' ? 'pro' : 'entreprise';
  lm_q($db, 'INSERT INTO lm_clients (siren, raison_sociale, cr_code, marche, portefeuille, conseiller, conseiller_email) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE raison_sociale = VALUES(raison_sociale), cr_code = VALUES(cr_code), marche = VALUES(marche), portefeuille = VALUES(portefeuille), conseiller = VALUES(conseiller), conseiller_email = VALUES(conseiller_email)',
    'sssssss', [$si, lm_txt($IN['raison_sociale'] ?? ''), $cr, $m, lm_txt($IN['portefeuille'] ?? ''), lm_txt($IN['conseiller'] ?? ''), lm_txt($IN['conseiller_email'] ?? '')]);
  lm_sortir(['ok' => true]);
}
if ($A === 'client_suppr' && $POST) { lm_national(); $si = preg_replace('/\D/', '', (string) ($IN['siren'] ?? '')); lm_q($db, 'DELETE FROM lm_clients WHERE siren = ?', 's', [$si]); lm_sortir(['ok' => true]); }
if ($A === 'taches' && $POST) { lm_national(); lm_sortir(['ok' => true, 'resultat' => lm_taches($db, true)]); }
if ($A === 'demo_comptes' && $POST) {
  /* comptes de démonstration : 1 expert référent par CR pilote + 1 compte par filiale ; mots de passe affichés une seule fois */
  lm_national();
  $P = [['tp.expert', 'J. Marchand', 'expert', 'touraine-poitou', null], ['av.expert', 'L. Garnier', 'expert', 'atlantique-vendee', null], ['pg.expert', 'C. Lafitte', 'expert', 'pyrenees-gascogne', null],
        ['caa.prevoyance', 'CA Assurances — Prévis', 'filiale', null, 'caa'], ['amundi.universels', 'Amundi / CA Titres — Universels', 'filiale', null, 'amundi'], ['worklife', 'Worklife', 'filiale', null, 'worklife']];
  $out = [];
  foreach ($P as [$lg, $nom, $role, $cr, $fil]) {
    if (lm_ligne($db, 'SELECT id FROM lm_users WHERE login = ?', 's', [$lg])) { $out[] = ['login' => $lg, 'nom' => $nom, 'mdp' => null]; continue; }
    if ($role === 'expert') lm_q($db, "UPDATE lm_users SET referent = 0 WHERE role = 'expert' AND cr_code = ?", 's', [$cr]);
    $p = lm_mdp(); $ref = $role === 'expert' ? 1 : 0;
    lm_q($db, 'INSERT INTO lm_users (login, nom, email, role, cr_code, filiale, referent, hash, actif, cree_le) VALUES (?, ?, \'\', ?, ?, ?, ?, ?, 1, NOW())', 'sssssis', [$lg, $nom, $role, $cr, $fil, $ref, password_hash($p, PASSWORD_DEFAULT)]);
    $out[] = ['login' => $lg, 'nom' => $nom, 'mdp' => $p];
  }
  lm_sortir(['ok' => true, 'comptes' => $out]);
}
lm_erreur('Requête inconnue.', 404);
