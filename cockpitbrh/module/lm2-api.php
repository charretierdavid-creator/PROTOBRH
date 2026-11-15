<?php
/* Module LM 2.0 — 15/11/2026 · API de la console : expert BRH, accès ponctuel des destinataires de transfert, administration (annuaire, envoi des e-mails, modèles, paramètres) · historique : VERSIONS.md */
/* ============================================================================
   lm2-api.php?a=<action> — appelé par console.html (JSON, POST sauf « session »).
   Trois façons d'entrer :
     - administrateur : LM_ADMIN_LOGIN / LM_ADMIN_PASSWORD de config.php (Business Owner, Q5, Q19) ;
     - expert BRH : e-mail professionnel + mot de passe défini par l'administrateur dans l'annuaire ;
     - destinataire d'un transfert : lien personnel d'accès ponctuel (RG-23, RG-64) ; un code à usage unique
       est envoyé par e-mail à la première ouverture quand l'envoi réel est actif pour lui (S5).
   Sécurité : session propre (cookie BRHLM2, HttpOnly, SameSite=Strict), jeton anti-falsification X-LM-CSRF,
   8 essais erronés = blocage 15 minutes, requêtes préparées, droits vérifiés à chaque action.
   ============================================================================ */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
ob_start();
if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $e) {} ob_end_clean(); }
require_once __DIR__ . '/lm2-base.php';

const LM2_SESSION_DUREE = 28800, LM2_ESSAIS = 8, LM2_BLOCAGE = 900;
function lm2_sortir(array $r, int $code = 200): void { while (ob_get_level() > 0) ob_end_clean(); http_response_code($code); echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR); exit; }
function lm2_erreur(string $m, int $code = 400): void { lm2_sortir(['ok' => false, 'error' => $m], $code); }

/* ---------- session ---------- */
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('BRHLM2');
$sid = (string) ($_COOKIE['BRHLM2'] ?? '');
session_id(preg_match('/^[A-Za-z0-9,-]{22,256}$/', $sid) ? $sid : session_create_id());
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
$A = (string) ($_GET['a'] ?? '');
$POST = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
$IN = [];
if ($POST) { $raw = (string) file_get_contents('php://input'); if (strlen($raw) > 2000000) lm2_erreur('Requête trop volumineuse', 413); $IN = json_decode($raw, true); if (!is_array($IN)) $IN = []; }
$adminLogin = defined('LM_ADMIN_LOGIN') ? (string) constant('LM_ADMIN_LOGIN') : '';
$adminMdp   = defined('LM_ADMIN_PASSWORD') ? (string) constant('LM_ADMIN_PASSWORD') : '';

$db = lm2_db();
if (!$db) lm2_erreur('Base MySQL indisponible : vérifiez DB_HOST, DB_NAME, DB_USER et DB_PASS dans config.php.', 500);

/* ---------- essais de connexion (identifiant et code d'accès) ---------- */
$fic = sys_get_temp_dir() . '/brh_lm2_' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __DIR__) . '.json';
$essais = is_file($fic) ? (json_decode((string) @file_get_contents($fic), true) ?: []) : [];
$bloque = ($essais['n'] ?? 0) >= LM2_ESSAIS && (time() - ($essais['t'] ?? 0)) < LM2_BLOCAGE;
$echec = static function (string $msg) use ($fic, &$essais): void {
  $essais = ['n' => (($essais['n'] ?? 0) >= LM2_ESSAIS ? 0 : ($essais['n'] ?? 0)) + 1, 't' => time()];
  @file_put_contents($fic, json_encode($essais), LOCK_EX); usleep(600000);
  lm2_erreur(($essais['n'] >= LM2_ESSAIS) ? 'Trop d’essais : accès bloqué 15 minutes.' : $msg, 401);
};
$ouvrir = static function (array $s): void {
  session_regenerate_id(true);   /* le compteur d'essais erronés n'est pas remis à zéro par une connexion réussie */
  $_SESSION['lm2'] = $s + ['t' => time(), 'csrf' => bin2hex(random_bytes(16))];
};

if ($A === 'connexion' && $POST) {
  if ($bloque) lm2_erreur('Trop d’essais : accès bloqué 15 minutes.', 429);
  $lg = trim((string) ($IN['login'] ?? '')); $pw = (string) ($IN['mdp'] ?? '');
  if ($adminLogin !== '' && strlen($adminMdp) >= 10 && hash_equals($adminLogin, $lg) && hash_equals($adminMdp, $pw)) { $ouvrir(['role' => 'admin', 'id' => 0]); lm2_sortir(['ok' => true]); }
  $r = filter_var($lg, FILTER_VALIDATE_EMAIL) ? lm2_ligne($db, "SELECT * FROM lm2_interlocuteurs WHERE email = ? AND role = 'expert_brh' AND actif = 1 AND masque = 0", 's', [strtolower($lg)]) : null;
  if ($r && $r['mot_de_passe'] && password_verify($pw, (string) $r['mot_de_passe'])) { $ouvrir(['role' => 'expert', 'id' => (int) $r['id']]); lm2_sortir(['ok' => true]); }
  $echec('Identifiant ou mot de passe incorrect.');
}
/* ---------- accès ponctuel : lien personnel (RG-23, RG-64), code à usage unique par e-mail (S5) ---------- */
if (($A === 'acces_ouvrir' || $A === 'acces_code') && $POST) {
  if ($bloque) lm2_erreur('Trop d’essais : accès bloqué 15 minutes.', 429);
  $jt = (string) ($IN['jeton'] ?? '');
  $ac = preg_match('/^[0-9a-f]{48}$/', $jt) ? lm2_ligne($db, 'SELECT * FROM lm2_acces WHERE jeton_hash = ?', 's', [hash('sha256', $jt)]) : null;
  if (!$ac) $echec('Lien d’accès inconnu.');
  if ($ac['revoque_le']) lm2_erreur('Ce lien a été révoqué par l’expert BRH : demandez-lui un nouveau lien.', 403);
  if (strtotime((string) $ac['expire_le']) < time()) lm2_erreur('Ce lien a expiré le ' . lm2_date_fr($ac['expire_le']) . ' : demandez à l’expert BRH de le prolonger.', 403);
  $it = lm2_interlocuteur($db, (int) $ac['interlocuteur_id']); $d = lm2_dossier($db, (int) $ac['dossier_id']);
  if (!$it || !(int) $it['actif'] || !$d) lm2_erreur('Accès désactivé.', 403);
  $S0 = $_SESSION['lm2'] ?? null;
  $dejaOuvert = $S0 && ($S0['role'] ?? '') === 'acces' && (int) $S0['id'] === (int) $it['id'];
  $codeRequis = !$dejaOuvert && lm2_decider_envoi($db, $it['role'] === 'filiale' ? 'filiale' : 'interlocuteur', $it, $d)['statut'] === 'attente';
  $entrer = static function (string $comment) use ($db, $ac, $it, $d, $ouvrir, $dejaOuvert): void {
    if (!$dejaOuvert) $ouvrir(['role' => 'acces', 'id' => (int) $it['id']]);
    lm2_q($db, 'UPDATE lm2_acces SET ouvert_le = NOW(), code_hash = NULL WHERE id = ?', 'i', [(int) $ac['id']]);
    lm2_journal($db, (int) $d['id'], lm2_nom($it), 'acces', 'Accès ponctuel ouvert' . $comment);
    lm2_sortir(['ok' => true, 'ouvert' => true, 'lead' => (int) $d['id']]);
  };
  $e = (string) $it['email']; $p = strpos($e, '@'); $masque = substr($e, 0, 1) . str_repeat('•', max(1, (int) $p - 1)) . substr($e, (int) $p);
  if ($A === 'acces_ouvrir') {
    if (!$codeRequis) $entrer($dejaOuvert ? '' : ' (envoi réel inactif : sans code)');
    if ($ac['code_hash'] && strtotime((string) $ac['code_expire']) > time() + 570) lm2_sortir(['ok' => true, 'code_requis' => true, 'masque' => $masque, 'attente' => true]);
    $code = sprintf('%06d', random_int(0, 999999));
    lm2_q($db, 'UPDATE lm2_acces SET code_hash = ?, code_expire = NOW() + INTERVAL 10 MINUTE, code_essais = 0 WHERE id = ?', 'si', [hash('sha256', $jt . $code), (int) $ac['id']]);
    $m = lm2_modeles($db)['A']; $v = ['destinataire' => $it['prenom'], 'code' => $code];
    $t = lm2_remplir($m['texte'], $v); $pied = 'Si vous n’avez pas demandé ce code, ignorez ce message. E-mail interne Crédit Agricole : ne pas transférer.';
    lm2_email($db, $d, 'A', $it['role'] === 'filiale' ? 'filiale' : 'interlocuteur', (string) $it['email'], lm2_nom($it), lm2_remplir($m['objet'], $v), $t . "\n\n" . $pied, lm2_html($m['lib'], $t, [], [], $pied), '', $it);
    lm2_sortir(['ok' => true, 'code_requis' => true, 'masque' => $masque]);
  }
  if (!$ac['code_hash'] || strtotime((string) $ac['code_expire']) < time()) lm2_erreur('Code expiré : demandez un nouveau code.', 401);
  if ((int) $ac['code_essais'] >= 3) lm2_erreur('Trois essais au plus : demandez un nouveau code.', 401);
  if (!hash_equals((string) $ac['code_hash'], hash('sha256', $jt . preg_replace('/\D/', '', (string) ($IN['code'] ?? ''))))) {
    lm2_q($db, 'UPDATE lm2_acces SET code_essais = code_essais + 1 WHERE id = ?', 'i', [(int) $ac['id']]);
    $echec('Code incorrect.');
  }
  $entrer(' (code vérifié)');
}
if ($A === 'deconnexion') { $_SESSION = []; session_destroy(); setcookie('BRHLM2', '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']); lm2_sortir(['ok' => true]); }

$S = $_SESSION['lm2'] ?? null;
if ($S && (time() - (int) $S['t']) > LM2_SESSION_DUREE) { unset($_SESSION['lm2']); $S = null; }
if ($A === 'session' && !$S) lm2_sortir(['ok' => true, 'connecte' => false, 'configure' => $adminLogin !== '' && strlen($adminMdp) >= 10, 'version' => '2.0']);
if (!$S) lm2_erreur('Session expirée : reconnectez-vous.', 401);
$_SESSION['lm2']['t'] = time();
if ($A !== 'session' && !$POST) lm2_erreur('POST attendu', 405);
if ($POST && !hash_equals((string) $S['csrf'], (string) ($_SERVER['HTTP_X_LM_CSRF'] ?? ''))) lm2_erreur('Jeton de sécurité invalide : rechargez la page.', 403);

/* ---------- identité de l'utilisateur ---------- */
$ROLE = (string) $S['role'];
$MOI = null; $VUE = null;
if ($ROLE === 'expert' || $ROLE === 'acces') {
  $MOI = lm2_interlocuteur($db, (int) $S['id']);
  if (!$MOI || !(int) $MOI['actif'] || (int) $MOI['masque'] || ($ROLE === 'expert' && $MOI['role'] !== 'expert_brh')) { unset($_SESSION['lm2']); lm2_erreur('Compte désactivé.', 401); }
}
if ($ROLE === 'admin' && !empty($S['vue'])) {   /* S12 : « Voir la console comme l'expert » (CR en démonstration) */
  $VUE = lm2_cr($db, (string) $S['vue']);
  if (!$VUE || $VUE['mode'] !== 'demo') { unset($_SESSION['lm2']['vue']); $VUE = null; }
  else $MOI = lm2_experts_cr($db, (string) $VUE['code'])[0] ?? null;
  if ($VUE && !$MOI) { unset($_SESSION['lm2']['vue']); $VUE = null; }
}
$ADMIN = $ROLE === 'admin' && !$VUE;
if ($A === 'admin_quitter_vue' && $ROLE === 'admin') { unset($_SESSION['lm2']['vue']); lm2_sortir(['ok' => true]); }
$ACTEUR = $ADMIN ? 'Administrateur' : ($VUE ? lm2_nom($MOI) . ' (démonstration)' : lm2_nom($MOI));
$CR = $ROLE === 'expert' ? (string) $MOI['cr_code'] : ($VUE ? (string) $VUE['code'] : null);
function lm2_admin(): void { global $ADMIN; if (!$ADMIN) lm2_erreur('Action réservée à l’administrateur.', 403); }
function lm2_expert(): void { global $ROLE; if ($ROLE === 'acces') lm2_erreur('Action réservée à l’expert BRH.', 403); }

/* ---------- droits sur un dossier ---------- */
function lm2_acces_valide(mysqli $db, int $dossier, int $interloc): ?array {
  return lm2_ligne($db, 'SELECT a.* FROM lm2_acces a JOIN lm2_transferts t ON t.id = a.transfert_id JOIN lm2_dossiers d ON d.id = a.dossier_id AND d.transfert_id = a.transfert_id
    WHERE a.dossier_id = ? AND a.interlocuteur_id = ? AND t.actif = 1 AND a.revoque_le IS NULL AND a.expire_le > NOW() ORDER BY a.id DESC LIMIT 1', 'ii', [$dossier, $interloc]);
}
function lm2_charger(int $id): array {
  global $db, $ROLE, $CR, $ADMIN, $MOI;
  $d = $id > 0 ? lm2_dossier($db, $id) : null;
  if (!$d) lm2_erreur('Lead introuvable.', 404);
  if ($ADMIN) return $d;
  if ($ROLE === 'acces') { if (!lm2_acces_valide($db, (int) $d['id'], (int) $MOI['id'])) lm2_erreur('Ce lead ne vous est pas (ou plus) transmis.', 403); return $d; }
  if ((string) $d['cr_code'] !== (string) $CR) lm2_erreur('Lead d’une autre Caisse régionale.', 403);
  return $d;
}
function lm2_ouvert(array $d): void { if ($d['statut'] === 'cloture') lm2_erreur('Ce lead est clôturé.'); }

/* ---------- présentation ---------- */
function lm2_carte_interloc(?array $i): ?array {
  if (!$i) return null;
  return ['id' => (int) $i['id'], 'role' => $i['role'], 'prenom' => $i['prenom'], 'nom' => $i['nom'], 'email' => $i['email'], 'telephone' => $i['telephone'],
    'departements' => $i['departements'], 'agence_id' => $i['agence_id'] ? (int) $i['agence_id'] : null, 'ville_agence' => $i['ville_agence'], 'perimetre' => $i['perimetre'],
    'filiale' => $i['filiale'], 'principal' => (int) $i['principal'], 'donnees' => $i['donnees'], 'actif' => (int) $i['actif'], 'cr_code' => $i['cr_code']];
}
function lm2_resume(mysqli $db, array $d): array {
  static $cache = [];
  $it = static function (?int $id) use ($db, &$cache): ?array { if (!$id) return null; if (!array_key_exists($id, $cache)) $cache[$id] = lm2_carte_interloc(lm2_interlocuteur($db, $id)); return $cache[$id]; };
  $t = $d['transfert_id'] ? lm2_ligne($db, 'SELECT id, vers_id, cree_le, pris_le, motif FROM lm2_transferts WHERE id = ?', 'i', [(int) $d['transfert_id']]) : null;
  return ['id' => (int) $d['id'], 'reference' => $d['reference'], 'cree_le' => $d['cree_le'], 'maj_le' => $d['maj_le'], 'version' => $d['version'], 'raison_sociale' => $d['raison_sociale'],
    'prenom' => $d['prenom'], 'nom' => $d['nom'], 'ville' => $d['ville'], 'departement' => $d['departement'], 'code_postal' => $d['code_postal'], 'effectif' => $d['effectif'] ? (int) $d['effectif'] : null,
    'secteur' => $d['secteur'], 'type' => $d['type'], 'rappel' => (int) $d['rappel'], 'statut' => $d['statut'], 'issue' => $d['issue'], 'client_statut' => $d['client_statut'],
    'solutions' => lm2_liste($d['solutions']), 'echeance' => $d['echeance'], 'rdv_le' => $d['rdv_le'], 'cr_code' => $d['cr_code'], 'montant' => $d['montant'] ? (int) $d['montant'] : null,
    'expert_id' => $d['expert_id'] ? (int) $d['expert_id'] : null, 'assigne_id' => $d['assigne_id'] ? (int) $d['assigne_id'] : null, 'assigne' => $it($d['assigne_id'] ? (int) $d['assigne_id'] : null),
    'transfert' => $t ? ['id' => (int) $t['id'], 'cree_le' => $t['cree_le'], 'pris_le' => $t['pris_le'], 'motif' => $t['motif']] : null, 'idcc' => $d['idcc'], 'client_conseiller_email' => $d['client_conseiller_email']];
}
function lm2_detail(mysqli $db, array $d): array {
  global $ROLE, $MOI;
  $r = lm2_resume($db, $d);
  foreach (['email', 'telephone', 'fonction', 'siret', 'idcc', 'client_declare', 'client_agence', 'client_conseiller', 'client_conseiller_email', 'client_verifie_par', 'client_verifie_le',
            'rdv_note', 'pris_le', 'statut_le', 'type_le', 'relances', 'universels_le'] as $k) $r[$k] = $d[$k];
  $r['consent_relance'] = (int) $d['consent_relance'];
  $r['parcours'] = lm2_json($d['parcours']); $r['argumentaire'] = $d['argumentaire'] ? lm2_json($d['argumentaire']) : null;
  $r['filiales_permises'] = lm2_filiales_permises($d);
  $cr = lm2_cr($db, $d['cr_code']); $r['cr'] = $cr ? ['code' => $cr['code'], 'nom' => $cr['nom'], 'mode' => $cr['mode']] : null;
  $r['expert'] = lm2_carte_interloc(lm2_interlocuteur($db, $d['expert_id'] ? (int) $d['expert_id'] : null));
  $r['demandes'] = array_map(static fn($x) => ['type' => $x['type'], 'type_demande' => $x['type_demande'], 'lib' => BRH_LEAD_TYPES[$x['type_demande']] ?? $x['type_demande'], 'cree_le' => $x['cree_le']],
    lm2_lignes($db, 'SELECT * FROM lm2_demandes WHERE dossier_id = ? ORDER BY id', 'i', [(int) $d['id']]));
  $r['journal'] = lm2_lignes($db, 'SELECT cree_le, acteur, action, detail FROM lm2_journal WHERE dossier_id = ? ORDER BY id DESC LIMIT 200', 'i', [(int) $d['id']]);
  $r['emails'] = array_map(static fn($e) => ['id' => (int) $e['id'], 'cree_le' => $e['cree_le'], 'modele' => $e['modele'], 'categorie' => $e['categorie'], 'destinataire' => $e['destinataire'],
    'destinataire_nom' => $e['destinataire_nom'], 'objet' => $e['objet'], 'statut' => $e['statut'], 'motif' => $e['motif'], 'envoye_le' => $e['envoye_le']],
    lm2_lignes($db, 'SELECT * FROM lm2_emails WHERE dossier_id = ? ORDER BY id DESC LIMIT 100', 'i', [(int) $d['id']]));
  $r['comptes_rendus'] = lm2_lignes($db, 'SELECT cree_le, auteur, resultat, client_statut, prochaine, note FROM lm2_comptes_rendus WHERE dossier_id = ? ORDER BY id DESC', 'i', [(int) $d['id']]);
  $tr = lm2_lignes($db, 'SELECT t.*, a.expire_le, a.revoque_le, a.ouvert_le FROM lm2_transferts t LEFT JOIN lm2_acces a ON a.transfert_id = t.id WHERE t.dossier_id = ? ORDER BY t.id DESC', 'i', [(int) $d['id']]);
  $r['transferts'] = [];
  foreach ($tr as $t) {
    if ($ROLE === 'acces' && (int) $t['vers_id'] !== (int) $MOI['id']) continue;
    $r['transferts'][] = ['id' => (int) $t['id'], 'vers' => lm2_carte_interloc(lm2_interlocuteur($db, (int) $t['vers_id'])), 'de_nom' => $t['de_nom'], 'motif' => $t['motif'], 'message' => $t['message'],
      'informer' => (int) $t['informer'], 'cree_le' => $t['cree_le'], 'pris_le' => $t['pris_le'], 'rendu_le' => $t['rendu_le'], 'actif' => (int) $t['actif'],
      'acces' => ['expire_le' => $t['expire_le'], 'revoque_le' => $t['revoque_le'], 'ouvert_le' => $t['ouvert_le']]];
  }
  return $r;
}
function lm2_annuaire(mysqli $db, string $cr): array {
  $c = lm2_cr($db, $cr);
  $its = lm2_lignes($db, "SELECT i.*, (SELECT COUNT(*) FROM lm2_dossiers d WHERE d.assigne_id = i.id AND d.statut <> 'cloture') AS charge FROM lm2_interlocuteurs i
    WHERE i.cr_code = ? AND i.masque = 0 AND i.role IN ('expert_brh', 'expert_brh_pro', 'conseiller_pro') ORDER BY FIELD(i.role, 'expert_brh', 'expert_brh_pro', 'conseiller_pro'), i.principal DESC, i.nom", 's', [$cr]);
  $fil = lm2_lignes($db, "SELECT * FROM lm2_interlocuteurs WHERE role = 'filiale' AND actif = 1 AND masque = 0 ORDER BY filiale");
  return ['cr' => $c ? ['code' => $c['code'], 'nom' => $c['nom'], 'mode' => $c['mode'], 'departements' => lm2_liste($c['departements'])] : null,
    'interlocuteurs' => array_map(static fn($i) => lm2_carte_interloc($i) + ['charge' => (int) $i['charge']], $its),
    'agences' => array_map(static fn($a) => ['id' => (int) $a['id'], 'nom' => $a['nom'], 'ville' => $a['ville'], 'cp' => $a['cp'], 'departement' => $a['departement']],
      lm2_lignes($db, 'SELECT * FROM lm2_agences WHERE cr_code = ? ORDER BY departement, ville', 's', [$cr])),
    'filiales' => array_map(static fn($i) => lm2_carte_interloc($i) + ['lib' => LM2_FILIALES[$i['filiale']]['lib'] ?? '', 'outil' => LM2_FILIALES[$i['filiale']]['outil'] ?? ''], $fil)];
}
/* prise en charge (expert ou destinataire d'un transfert) — RG-20 : arrête les relances (statut ≠ nouveau) */
function lm2_prendre(mysqli $db, array $d): array {
  global $ROLE, $MOI, $ACTEUR, $ADMIN;
  $premier = !$d['pris_le'];
  if ($ROLE === 'acces') {
    if ($d['statut'] !== 'transfere' && (int) $d['assigne_id'] === (int) $MOI['id']) return $d;
    lm2_q($db, 'UPDATE lm2_transferts SET pris_le = IFNULL(pris_le, NOW()) WHERE id = ?', 'i', [(int) $d['transfert_id']]);
    lm2_maj($db, (int) $d['id'], ['statut' => 'pris_en_charge', 'statut_le' => lm2_maintenant(), 'pris_le' => $d['pris_le'] ?: lm2_maintenant()]);
    lm2_journal($db, (int) $d['id'], $ACTEUR, 'pris_en_charge', 'Pris en charge par ' . lm2_nom($MOI) . ' (' . (LM2_ROLES[$MOI['role']] ?? '') . ')');
    $t = lm2_ligne($db, 'SELECT informer FROM lm2_transferts WHERE id = ?', 'i', [(int) $d['transfert_id']]);
    $qui = $MOI;
    $envoyer = $MOI['role'] !== 'filiale' && !($t && (int) $t['informer']);
  } else {
    if ($d['transfert_id']) lm2_clore_transfert($db, (int) $d['transfert_id']);
    $qui = $ADMIN ? lm2_interlocuteur($db, $d['expert_id'] ? (int) $d['expert_id'] : null) : $MOI;
    lm2_maj($db, (int) $d['id'], ['statut' => 'pris_en_charge', 'statut_le' => lm2_maintenant(), 'pris_le' => $d['pris_le'] ?: lm2_maintenant(), 'transfert_id' => null,
      'assigne_id' => $qui ? (int) $qui['id'] : null, 'expert_id' => $d['expert_id'] ?: ($qui && $qui['role'] === 'expert_brh' ? (int) $qui['id'] : null)]);
    lm2_journal($db, (int) $d['id'], $ACTEUR, 'pris_en_charge', $d['transfert_id'] ? 'Lead repris par l’expert BRH (transfert clos, accès révoqué)' : 'Lead pris en charge');
    $envoyer = $premier;
  }
  $d2 = lm2_dossier($db, (int) $d['id']);
  if ($envoyer && $qui) { $cr = lm2_cr($db, $d2['cr_code']);
    lm2_email_dirigeant($db, 'E3', $d2, ['interlocuteur' => lm2_nom($qui), 'role' => mb_strtolower(LM2_ROLES[$qui['role']] ?? 'expert'), 'caisse' => $cr ? 'Crédit Agricole ' . $cr['nom'] : 'votre Caisse régionale']); }
  return $d2;
}
function lm2_csv(array $lignes): string {
  $f = fopen('php://temp', 'r+');
  foreach ($lignes as $l) fputcsv($f, array_map(static fn($c) => is_string($c) && preg_match('/^[=+\-@\t\r]/', $c) ? "'" . $c : $c, $l), ';', '"', '');
  rewind($f); $t = (string) stream_get_contents($f); fclose($f); return $t;
}

/* ============================== ACTIONS ============================== */
$id = (int) ($IN['id'] ?? 0);
switch ($A) {

case 'session':
  $cr = $CR ? lm2_cr($db, $CR) : null;
  lm2_sortir(['ok' => true, 'connecte' => true, 'csrf' => $S['csrf'], 'role' => $ADMIN ? 'admin' : ($ROLE === 'acces' ? 'acces' : 'expert'), 'version' => '2.0',
    'moi' => lm2_carte_interloc($MOI), 'cr' => $cr ? ['code' => $cr['code'], 'nom' => $cr['nom'], 'mode' => $cr['mode']] : null, 'vue' => $VUE ? $VUE['code'] : null,
    'ia' => MISTRAL_API_KEY !== '', 'parametres' => lm2_parametres($db), 'envoi_reel' => (bool) lm2_reglages_envoi($db)['reel'],
    'crs' => $ADMIN ? array_map(static fn($c) => ['code' => $c['code'], 'nom' => $c['nom'], 'mode' => $c['mode']], lm2_lignes($db, 'SELECT * FROM lm2_cr ORDER BY nom')) : null]);

case 'leads':
  if ($ADMIN) {
    lm2_taches($db);
    $c = (string) ($IN['cr'] ?? '');
    $ls = $c === '_a_attribuer' ? lm2_lignes($db, 'SELECT * FROM lm2_dossiers WHERE cr_code IS NULL ORDER BY id DESC LIMIT 2000')
        : ($c !== '' ? lm2_lignes($db, 'SELECT * FROM lm2_dossiers WHERE cr_code = ? ORDER BY id DESC LIMIT 2000', 's', [$c]) : lm2_lignes($db, 'SELECT * FROM lm2_dossiers ORDER BY id DESC LIMIT 2000'));
  } elseif ($ROLE === 'acces') {
    $ls = lm2_lignes($db, 'SELECT DISTINCT d.* FROM lm2_dossiers d JOIN lm2_acces a ON a.dossier_id = d.id AND a.transfert_id = d.transfert_id JOIN lm2_transferts t ON t.id = a.transfert_id
      WHERE a.interlocuteur_id = ? AND t.actif = 1 AND a.revoque_le IS NULL AND a.expire_le > NOW() ORDER BY d.id DESC', 'i', [(int) $MOI['id']]);
  } else {
    lm2_taches($db);
    $ls = lm2_lignes($db, 'SELECT * FROM lm2_dossiers WHERE cr_code = ? ORDER BY id DESC LIMIT 2000', 's', [$CR]);
  }
  $acc = null;
  if ($ROLE === 'acces') {
    $acc = lm2_ligne($db, 'SELECT MAX(a.expire_le) expire_le, MAX(t.de_nom) de_nom FROM lm2_acces a JOIN lm2_transferts t ON t.id = a.transfert_id WHERE a.interlocuteur_id = ? AND t.actif = 1 AND a.revoque_le IS NULL AND a.expire_le > NOW()', 'i', [(int) $MOI['id']]);
  }
  lm2_sortir(['ok' => true, 'leads' => array_map(static fn($d) => lm2_resume($db, $d), $ls), 'acces' => $acc]);

case 'lead':
  $d = lm2_charger($id);
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, $d)]);

case 'annuaire':
  $c = $ADMIN ? (string) ($IN['cr'] ?? '') : (string) ($CR ?? '');
  if ($ROLE === 'acces') lm2_erreur('Annuaire réservé à l’expert BRH.', 403);
  if ($c === '' || !lm2_cr($db, $c)) lm2_erreur('Caisse régionale inconnue.');
  lm2_sortir(['ok' => true] + lm2_annuaire($db, $c));

case 'traiter':
  $d = lm2_charger($id); lm2_ouvert($d);
  $d = lm2_prendre($db, $d);
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, $d)]);

case 'proposition':
  $d = lm2_charger($id); lm2_ouvert($d);
  if ($d['statut'] !== 'pris_en_charge') lm2_erreur('Prenez d’abord le lead en charge.');
  lm2_maj($db, $id, ['statut' => 'proposition', 'statut_le' => lm2_maintenant()]);
  lm2_journal($db, $id, $ACTEUR, 'proposition', 'Proposition ou devis remis au dirigeant');
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'transferer':
  lm2_expert();
  $d = lm2_charger($id); lm2_ouvert($d);
  if (!$d['cr_code']) lm2_erreur('Attribuez d’abord le lead à une Caisse régionale.');
  $h = is_array($IN['hors_annuaire'] ?? null) ? $IN['hors_annuaire'] : null;
  if ($h) {   /* Q17 : conseiller titulaire hors annuaire, adresse professionnelle du Crédit Agricole */
    $mail = strtolower(lm2_txt($h['email'] ?? '', 190));
    if (!lm2_adresse_ca($mail)) lm2_erreur('Adresse professionnelle du Crédit Agricole attendue (par exemple prenom.nom@ca-…fr).');
    $vers = lm2_ligne($db, 'SELECT * FROM lm2_interlocuteurs WHERE email = ?', 's', [$mail]);
    if ($vers && $vers['role'] === 'hors_annuaire' && (!(int) $vers['actif'] || $vers['cr_code'] !== $d['cr_code'])) {   /* même adresse saisie à nouveau : fiche réactivée pour la CR du lead */
      lm2_q($db, 'UPDATE lm2_interlocuteurs SET actif = 1, masque = 0, cr_code = ?, maj_le = NOW() WHERE id = ?', 'si', [$d['cr_code'], (int) $vers['id']]); $vers = lm2_interlocuteur($db, (int) $vers['id']);
    }
    if (!$vers) {
      $pr = lm2_txt($h['prenom'] ?? '', 100); $no = lm2_txt($h['nom'] ?? '', 120);
      if ($pr === '' || $no === '') lm2_erreur('Prénom et nom du destinataire requis.');
      $nid = lm2_insert($db, "INSERT INTO lm2_interlocuteurs (cr_code, role, prenom, nom, email, ville_agence, donnees, actif, cree_le, maj_le) VALUES (?, 'hors_annuaire', ?, ?, ?, ?, 'reel', 1, NOW(), NOW())", 'sssss',
        [$d['cr_code'], $pr, $no, $mail, lm2_txt($h['agence'] ?? '', 160)]);
      $vers = $nid > 0 ? lm2_interlocuteur($db, $nid) : null;
      if (!$vers) lm2_erreur('Enregistrement du destinataire impossible.');
      lm2_admin_journal($db, $ACTEUR, 'Interlocuteur hors annuaire ajouté par un transfert : ' . $mail, null, ['cr' => $d['cr_code'], 'prenom' => $pr, 'nom' => $no]);
    }
  } else $vers = lm2_interlocuteur($db, (int) ($IN['vers_id'] ?? 0));
  if (!$vers) lm2_erreur('Destinataire inconnu.');
  $de = $ADMIN ? (lm2_interlocuteur($db, $d['expert_id'] ? (int) $d['expert_id'] : null) ?? []) : ($MOI ?? []);
  $r = lm2_transferer($db, $d, $vers, $de, (string) ($IN['message'] ?? ''), (string) ($IN['motif'] ?? ''), !empty($IN['informer']), $ACTEUR);
  if (!$r['ok']) lm2_erreur($r['error']);
  lm2_sortir(['ok' => true, 'email' => $r['email'], 'lien' => $r['email'] === 'envoye' ? null : $r['lien'], 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'acces_prolonger':
case 'acces_revoquer':
  lm2_expert();
  $d = lm2_charger($id);
  $t = lm2_ligne($db, 'SELECT * FROM lm2_transferts WHERE id = ? AND dossier_id = ?', 'ii', [(int) ($IN['transfert_id'] ?? 0), $id]);
  if (!$t) lm2_erreur('Transfert inconnu.');
  $v = lm2_interlocuteur($db, (int) $t['vers_id']);
  if ($A === 'acces_prolonger') {
    $j = lm2_parametres($db)['acces_jours'];
    lm2_q($db, 'UPDATE lm2_acces SET expire_le = NOW() + INTERVAL ' . (int) $j . ' DAY WHERE transfert_id = ? AND revoque_le IS NULL', 'i', [(int) $t['id']]);
    lm2_journal($db, $id, $ACTEUR, 'acces', 'Accès ponctuel de ' . lm2_nom($v) . ' prolongé de ' . $j . ' jours');
  } else {
    lm2_q($db, 'UPDATE lm2_acces SET revoque_le = NOW() WHERE transfert_id = ? AND revoque_le IS NULL', 'i', [(int) $t['id']]);
    lm2_journal($db, $id, $ACTEUR, 'acces', 'Accès ponctuel de ' . lm2_nom($v) . ' révoqué');
    if ((int) $t['actif'] && (int) $d['transfert_id'] === (int) $t['id'] && $d['statut'] !== 'cloture') lm2_rendre($db, $d, 'accès révoqué par l’expert', $ACTEUR);   /* le lead revient à l'expert */
  }
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'rendre':
  if ($ROLE !== 'acces') lm2_erreur('Action réservée au destinataire du transfert.', 403);
  $d = lm2_charger($id); lm2_ouvert($d);
  lm2_rendre($db, $d, lm2_txt($IN['raison'] ?? '', 255), $ACTEUR);
  lm2_sortir(['ok' => true]);

case 'cloturer':
  $d = lm2_charger($id); lm2_ouvert($d);
  $issue = (string) ($IN['issue'] ?? '');
  if (!isset(LM2_ISSUES[$issue])) lm2_erreur('Choisissez l’issue du lead (obligatoire).');
  if ($d['transfert_id'] && $ROLE !== 'acces') lm2_clore_transfert($db, (int) $d['transfert_id']);
  lm2_maj($db, $id, ['statut' => 'cloture', 'statut_le' => lm2_maintenant(), 'issue' => $issue]);
  $note = lm2_txt($IN['note'] ?? '', 1000);
  lm2_journal($db, $id, $ACTEUR, 'cloture', 'Lead clôturé : ' . LM2_ISSUES[$issue] . ($note !== '' ? ' — ' . $note : ''));
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'rdv':
  $d = lm2_charger($id); lm2_ouvert($d);
  $t = strtotime((string) ($IN['date'] ?? ''));
  if (!$t || $t < time() - 3600) lm2_erreur('Date de rendez-vous invalide.');
  $note = lm2_txt($IN['note'] ?? '', 255);
  lm2_maj($db, $id, ['rdv_le' => date('Y-m-d H:i:s', $t), 'rdv_note' => $note !== '' ? $note : null]);
  lm2_journal($db, $id, $ACTEUR, 'rdv', 'Rendez-vous planifié le ' . lm2_date_fr(date('Y-m-d H:i:s', $t)) . ($note !== '' ? ' (' . $note . ')' : ''), false);
  if ($d['statut'] === 'nouveau' || ($d['statut'] === 'transfere' && $ROLE === 'acces')) $d = lm2_prendre($db, $d);
  $qui = $ROLE === 'acces' || !$ADMIN ? $MOI : lm2_interlocuteur($db, $d['expert_id'] ? (int) $d['expert_id'] : null);
  $d2 = lm2_dossier($db, $id); $cr = lm2_cr($db, $d2['cr_code']);
  $mail = lm2_email_dirigeant($db, 'E8', $d2, ['date_rdv' => lm2_date_fr($d2['rdv_le']), 'interlocuteur' => lm2_nom($qui) ?: 'votre expert', 'caisse' => $cr ? 'Crédit Agricole ' . $cr['nom'] : '', 'note' => $note !== '' ? "\n" . $note : '']);
  lm2_sortir(['ok' => true, 'email' => $mail, 'lead' => lm2_detail($db, $d2)]);

case 'note':
  $d = lm2_charger($id);
  $t = lm2_txt($IN['texte'] ?? '', 2000);
  if ($t === '') lm2_erreur('Note vide.');
  lm2_journal($db, $id, $ACTEUR, 'note', $t);
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'telephone':   /* RG-44 : le numéro du dirigeant ne change que par l'expert */
  lm2_expert();
  $d = lm2_charger($id);
  $tel = lm2_txt($IN['telephone'] ?? '', 40);
  if ($tel !== '' && strlen(preg_replace('/\D/', '', $tel)) < 10) lm2_erreur('Numéro de téléphone invalide.');
  lm2_maj($db, $id, ['telephone' => $tel !== '' ? $tel : null]);
  lm2_journal($db, $id, $ACTEUR, 'coordonnees', 'Téléphone du dirigeant modifié par l’expert');
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'client':
  $d = lm2_charger($id);
  if (!lm2_verifier_client($db, $d, (string) ($IN['statut'] ?? ''), (string) ($IN['agence'] ?? ''), (string) ($IN['conseiller'] ?? ''), strtolower(trim((string) ($IN['email'] ?? ''))), $ACTEUR))
    lm2_erreur('Statut client invalide (client vérifié ou prospect vérifié ; e-mail du conseiller valide).');
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'compte_rendu':   /* RG-37, Q18 */
  $d = lm2_charger($id);
  $res = (string) ($IN['resultat'] ?? ''); $pro = (string) ($IN['prochaine'] ?? ''); $cs = (string) ($IN['client_statut'] ?? '');
  if (!isset(LM2_RESULTATS_APPEL[$res])) lm2_erreur('Résultat de l’appel attendu.');
  if ($pro !== '' && !isset(LM2_PROCHAINES[$pro])) lm2_erreur('Prochaine étape inconnue.');
  $note = lm2_txt($IN['note'] ?? '', 2000);
  lm2_q($db, 'INSERT INTO lm2_comptes_rendus (dossier_id, cree_le, auteur, resultat, client_statut, prochaine, note) VALUES (?, NOW(), ?, ?, ?, ?, ?)', 'isssss',
    [$id, $ACTEUR, $res, in_array($cs, ['verifie', 'prospect'], true) ? $cs : null, $pro !== '' ? $pro : null, $note !== '' ? $note : null]);
  lm2_journal($db, $id, $ACTEUR, 'appel', 'Compte rendu d’appel : ' . LM2_RESULTATS_APPEL[$res] . ($pro !== '' ? ' ; prochaine étape : ' . LM2_PROCHAINES[$pro] : '') . ($note !== '' ? ' — ' . $note : ''));
  if (in_array($cs, ['verifie', 'prospect'], true)) lm2_verifier_client($db, $d, $cs, (string) ($IN['agence'] ?? ''), (string) ($IN['conseiller'] ?? ''), strtolower(trim((string) ($IN['email'] ?? ''))), $ACTEUR);
  if ($d['statut'] !== 'cloture') {
    if ($res === 'joint' && ($d['statut'] === 'nouveau' || ($d['statut'] === 'transfere' && $ROLE === 'acces'))) $d = lm2_prendre($db, lm2_dossier($db, $id));
    $d = lm2_dossier($db, $id);
    if ($pro === 'devis' && $d['statut'] === 'pris_en_charge') { lm2_maj($db, $id, ['statut' => 'proposition', 'statut_le' => lm2_maintenant()]); lm2_journal($db, $id, $ACTEUR, 'proposition', 'Proposition ou devis à remettre (compte rendu d’appel)'); }
  }
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'script':   /* RG-34 à RG-38 : généré à la demande, non conservé */
  $d = lm2_charger($id);
  $r = lm2_ia_script($d);
  lm2_sortir($r ? ['ok' => true] + $r : ['ok' => true, 'repli' => true]);

case 'emails_ia':   /* RG-30 à RG-33 */
  $d = lm2_charger($id);
  $obj = (string) ($IN['objectif'] ?? 'rdv'); $ton = (string) ($IN['ton'] ?? 'cordial');
  $r = lm2_ia_emails($d, $obj, $ton);
  lm2_sortir($r ? ['ok' => true] + $r : ['ok' => true, 'repli' => true]);

case 'email_note':   /* Q9 : objet et date seulement */
  $d = lm2_charger($id);
  $o = lm2_txt($IN['objet'] ?? '', 200);
  lm2_journal($db, $id, $ACTEUR, 'email_perso', 'E-mail personnalisé envoyé depuis la messagerie' . ($o !== '' ? ' : « ' . $o . ' »' : ''));
  lm2_sortir(['ok' => true, 'lead' => lm2_detail($db, lm2_dossier($db, $id))]);

case 'export':   /* S8 : export CSV pour SOLEAD ou le CRM */
  lm2_expert();
  $c = $ADMIN ? (string) ($IN['cr'] ?? '') : (string) $CR;
  $ls = $c !== '' ? lm2_lignes($db, 'SELECT * FROM lm2_dossiers WHERE cr_code = ? ORDER BY id DESC', 's', [$c]) : lm2_lignes($db, 'SELECT * FROM lm2_dossiers ORDER BY id DESC');
  $ids = array_flip(array_map('intval', (array) ($IN['ids'] ?? [])));
  $rows = [['Référence', 'Reçu le', 'Site', 'Type de lead', 'Statut', 'Issue', 'Statut client', 'Raison sociale', 'SIRET', 'Prénom', 'Nom', 'E-mail', 'Téléphone', 'Ville', 'Code postal',
    'Département', 'Effectif', 'Secteur', 'Convention', 'Solutions', 'Estimation annuelle', 'Échéance', 'Assigné à', 'Caisse régionale']];
  foreach ($ls as $d) {
    if ($ids && !isset($ids[(int) $d['id']])) continue;
    $as = lm2_interlocuteur($db, $d['assigne_id'] ? (int) $d['assigne_id'] : null);
    $rows[] = [$d['reference'], $d['cree_le'], $d['version'], LM2_TYPES[$d['type']]['lib'] ?? $d['type'], LM2_STATUTS[$d['statut']] ?? $d['statut'], LM2_ISSUES[$d['issue'] ?? ''] ?? '',
      LM2_CLIENT[$d['client_statut']] ?? '', $d['raison_sociale'], $d['siret'], $d['prenom'], $d['nom'], $d['email'], $d['telephone'], $d['ville'], $d['code_postal'], $d['departement'],
      $d['effectif'], $d['secteur'], $d['idcc'], implode(', ', array_map(static fn($s) => LM2_SOLUTIONS[$s] ?? $s, lm2_liste($d['solutions']))), $d['montant'], $d['echeance'], lm2_nom($as), $d['cr_code']];
  }
  lm2_sortir(['ok' => true, 'csv' => lm2_csv($rows), 'nombre' => count($rows) - 1]);
}

/* ============================== ADMINISTRATION (E8, E9) ============================== */
const LM2_ROLES_ANNUAIRE = ['expert_brh', 'expert_brh_pro', 'conseiller_pro'];
function lm2_valider_interloc(mysqli $db, array $x, ?int $id, array &$err): ?array {
  $cr = lm2_cr($db, lm2_txt($x['cr_code'] ?? ($x['caisse_regionale'] ?? ''), 40));
  $role = lm2_txt($x['role'] ?? '', 20);
  $v = ['cr_code' => $cr['code'] ?? null, 'role' => $role, 'prenom' => lm2_txt($x['prenom'] ?? '', 100), 'nom' => lm2_txt($x['nom'] ?? '', 120),
    'email' => strtolower(lm2_txt($x['email'] ?? ($x['email_pro'] ?? ''), 190)), 'telephone' => lm2_txt($x['telephone'] ?? ($x['telephone_pro'] ?? ''), 40),
    'departements' => implode(',', array_map('strtoupper', lm2_liste($x['departements'] ?? ''))), 'ville_agence' => lm2_txt($x['ville_agence'] ?? '', 160),
    'perimetre' => mb_substr(implode(', ', lm2_liste($x['perimetre'] ?? '')), 0, 255), 'donnees' => strtolower(lm2_txt($x['donnees'] ?? 'reel', 8)), 'principal' => ($x['principal'] ?? false) === true || in_array(strtolower(trim((string) ($x['principal'] ?? ''))), ['1', 'oui', 'true'], true) ? 1 : 0,
    'actif' => in_array(strtolower(trim((string) ($x['actif'] ?? 'oui'))), ['0', 'non', 'false', ''], true) && ($x['actif'] ?? 'oui') !== true ? 0 : 1, 'agence_id' => null];
  if (!$cr) $err[] = 'Caisse régionale inconnue';
  if (!in_array($role, LM2_ROLES_ANNUAIRE, true)) $err[] = 'Rôle attendu : expert_brh, expert_brh_pro ou conseiller_pro';
  if ($v['prenom'] === '' || $v['nom'] === '') $err[] = 'Prénom et nom obligatoires';
  if (!filter_var($v['email'], FILTER_VALIDATE_EMAIL)) $err[] = 'E-mail professionnel invalide';
  elseif (($o = lm2_ligne($db, 'SELECT id FROM lm2_interlocuteurs WHERE email = ?', 's', [$v['email']])) && (int) $o['id'] !== (int) $id) $err[] = 'E-mail déjà présent dans l’annuaire (doublon refusé)';
  if ($v['telephone'] !== '' && strlen(preg_replace('/\D/', '', $v['telephone'])) !== 10) $err[] = 'Téléphone : 10 chiffres attendus';
  if (!in_array($v['donnees'], ['reel', 'fictif'], true)) $err[] = 'Données : reel ou fictif';
  if ($cr) {
    $deps = lm2_liste($cr['departements']);
    if ($v['departements'] === '') $err[] = 'Département obligatoire';
    foreach (lm2_liste($v['departements']) as $dp) if (!in_array($dp, $deps, true)) $err[] = 'Département ' . $dp . ' hors de la Caisse régionale (' . implode(', ', $deps) . ')';
    if ($role === 'conseiller_pro') {
      if ($v['ville_agence'] === '') $err[] = 'Agence de rattachement obligatoire pour un conseiller pro';
      else {
        foreach (lm2_lignes($db, 'SELECT * FROM lm2_agences WHERE cr_code = ?', 's', [$cr['code']]) as $a)
          if (lm2_norm((string) $a['nom']) === lm2_norm($v['ville_agence']) || lm2_norm((string) $a['ville']) === lm2_norm($v['ville_agence'])) { $v['agence_id'] = (int) $a['id']; $v['ville_agence'] = (string) $a['nom']; break; }
        if (!$v['agence_id']) $v['nouvelle_agence'] = trim(preg_replace('/^agence\s+(de\s+|d[’\']\s*)/iu', '', $v['ville_agence']));
      }
    }
  }
  return $err ? null : $v;
}
function lm2_enregistrer_interloc(mysqli $db, array $v, ?int $id, string $acteur, string $mdp = ''): int {
  if (!empty($v['nouvelle_agence'])) {   /* agence de la CR pilote absente du référentiel : créée dans le premier département */
    $dp = lm2_liste($v['departements'])[0];
    lm2_q($db, 'INSERT IGNORE INTO lm2_agences (cr_code, nom, ville, cp, departement) VALUES (?, ?, ?, NULL, ?)', 'ssss', [$v['cr_code'], lm2_nom_agence($v['nouvelle_agence']), $v['nouvelle_agence'], $dp]);
    $a = lm2_ligne($db, 'SELECT * FROM lm2_agences WHERE cr_code = ? AND ville = ?', 'ss', [$v['cr_code'], $v['nouvelle_agence']]);
    $v['agence_id'] = $a ? (int) $a['id'] : null; $v['ville_agence'] = $a ? (string) $a['nom'] : $v['ville_agence'];
  }
  $avant = $id ? lm2_carte_interloc(lm2_interlocuteur($db, $id)) : null;
  $cr = lm2_cr($db, $v['cr_code']);
  $masque = $cr && (($cr['mode'] === 'pilote' && $v['donnees'] === 'fictif') || ($cr['mode'] === 'demo' && $v['donnees'] === 'reel')) ? 1 : 0;
  if ($id) {
    lm2_q($db, 'UPDATE lm2_interlocuteurs SET cr_code = ?, role = ?, prenom = ?, nom = ?, email = ?, telephone = ?, departements = ?, agence_id = ?, ville_agence = ?, perimetre = ?, principal = ?, donnees = ?, masque = ?, maj_le = NOW() WHERE id = ?',
      'sssssssissisii', [$v['cr_code'], $v['role'], $v['prenom'], $v['nom'], $v['email'], $v['telephone'] ?: null, $v['departements'], $v['agence_id'], $v['ville_agence'] ?: null, $v['perimetre'] ?: null, $v['principal'], $v['donnees'], $masque, $id]);
    if ((int) $v['actif'] === 0 && $avant && $avant['actif']) lm2_desactiver($db, $id, $acteur);
    elseif ((int) $v['actif'] === 1) lm2_q($db, 'UPDATE lm2_interlocuteurs SET actif = 1 WHERE id = ?', 'i', [$id]);
  } else {
    lm2_q($db, 'INSERT INTO lm2_interlocuteurs (cr_code, role, prenom, nom, email, telephone, departements, agence_id, ville_agence, perimetre, principal, donnees, actif, masque, cree_le, maj_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      'sssssssissisii', [$v['cr_code'], $v['role'], $v['prenom'], $v['nom'], $v['email'], $v['telephone'] ?: null, $v['departements'], $v['agence_id'], $v['ville_agence'] ?: null, $v['perimetre'] ?: null, $v['principal'], $v['donnees'], $v['actif'], $masque]);
    $id = (int) $db->insert_id;
    if ($id < 1 || $db->affected_rows < 1) lm2_erreur('Enregistrement impossible (base de données).', 500);
  }
  if ($v['principal']) lm2_q($db, 'UPDATE lm2_interlocuteurs SET principal = 0 WHERE cr_code = ? AND role = ? AND id <> ?', 'ssi', [$v['cr_code'], $v['role'], $id]);
  if ($mdp !== '' && $v['role'] === 'expert_brh') lm2_q($db, 'UPDATE lm2_interlocuteurs SET mot_de_passe = ? WHERE id = ?', 'si', [password_hash($mdp, PASSWORD_DEFAULT), $id]);
  lm2_admin_journal($db, $acteur, ($avant ? 'Interlocuteur modifié : ' : 'Interlocuteur ajouté : ') . $v['prenom'] . ' ' . $v['nom'] . ' (' . $v['cr_code'] . ')', $avant, lm2_carte_interloc(lm2_interlocuteur($db, $id)) + ($mdp !== '' ? ['mot_de_passe' => 'modifié'] : []));
  return $id;
}
/* RG-51 : périmètres d'experts BRH PRO qui se recouvrent */
function lm2_recouvrements(array $its): array {
  $pros = array_values(array_filter($its, static fn($i) => $i['role'] === 'expert_brh_pro' && (int) $i['actif'] && !(int) $i['masque']));
  $al = [];
  for ($a = 0; $a < count($pros); $a++) for ($b = $a + 1; $b < count($pros); $b++) {
    $pa = array_map('lm2_norm', lm2_liste($pros[$a]['perimetre'] ?: $pros[$a]['departements'])); $pb = array_map('lm2_norm', lm2_liste($pros[$b]['perimetre'] ?: $pros[$b]['departements']));
    $c = array_intersect($pa, $pb);
    if ($c) $al[] = 'Périmètres qui se recouvrent (' . implode(', ', $c) . ') : ' . lm2_nom($pros[$a]) . ' et ' . lm2_nom($pros[$b]);
  }
  return $al;
}
function lm2_dns(): array {
  $dom = substr((string) strrchr(LM2_EMAIL_FROM, '@'), 1);
  $txt = static function (string $h): array { if (!function_exists('dns_get_record')) return []; $r = @dns_get_record($h, DNS_TXT); return is_array($r) ? array_map(static fn($x) => (string) ($x['txt'] ?? ''), $r) : []; };
  $spf = (bool) array_filter($txt($dom), static fn($t) => stripos($t, 'v=spf1') === 0);
  $dmarc = (bool) array_filter($txt('_dmarc.' . $dom), static fn($t) => stripos($t, 'v=DMARC1') === 0);
  $dkim = false;
  foreach (['hostingermail1', 'hostingermail-a', 'default', 'dkim', 'mail', 's1'] as $sel) if (array_filter($txt($sel . '._domainkey.' . $dom), static fn($t) => stripos($t, 'p=') !== false)) { $dkim = true; break; }
  return ['domaine' => $dom, 'spf' => $spf, 'dkim' => $dkim, 'dmarc' => $dmarc, 'verifiable' => function_exists('dns_get_record')];
}
function lm2_dossier_exemple(): array {
  return ['id' => 0, 'reference' => 'BRH-26-000123', 'prenom' => 'Claire', 'nom' => 'Exemple', 'email' => 'dirigeant@exemple.invalid', 'raison_sociale' => 'Atelier Exemple', 'ville' => 'Tours',
    'departement' => '37', 'effectif' => 12, 'secteur' => 'Artisanat', 'type' => 'devis', 'statut' => 'nouveau', 'echeance' => date('Y-m-d H:i:s', time() + 86400), 'client_statut' => 'declare',
    'solutions' => 'sante,epargne', 'parcours' => lm2_enc(['priorites' => ['protection' => 4, 'partageValeur' => 3]]), 'montant' => 4200, 'idcc' => '1486 Bureaux d’études techniques', 'cr_code' => null, 'jeton' => str_repeat('0', 32)];
}

lm2_admin();
switch ($A) {
case 'admin_cr':
  $ls = lm2_lignes($db, "SELECT c.*, (SELECT COUNT(*) FROM lm2_interlocuteurs i WHERE i.cr_code = c.code AND i.masque = 0 AND i.donnees = 'reel' AND i.role IN ('expert_brh','expert_brh_pro','conseiller_pro')) AS reels,
    (SELECT COUNT(*) FROM lm2_interlocuteurs i WHERE i.cr_code = c.code AND i.masque = 0 AND i.donnees = 'fictif') AS fictifs,
    (SELECT COUNT(*) FROM lm2_interlocuteurs i WHERE i.cr_code = c.code AND i.masque = 1) AS masques,
    (SELECT COUNT(*) FROM lm2_dossiers d WHERE d.cr_code = c.code AND d.statut <> 'cloture') AS leads FROM lm2_cr c ORDER BY c.mode DESC, c.nom");
  $na = lm2_ligne($db, 'SELECT COUNT(*) n FROM lm2_dossiers WHERE cr_code IS NULL AND statut <> \'cloture\'');
  lm2_sortir(['ok' => true, 'crs' => array_map(static fn($c) => ['code' => $c['code'], 'nom' => $c['nom'], 'mode' => $c['mode'], 'envoi' => (int) $c['envoi'], 'departements' => lm2_liste($c['departements']),
    'reels' => (int) $c['reels'], 'fictifs' => (int) $c['fictifs'], 'masques' => (int) $c['masques'], 'leads' => (int) $c['leads']], $ls), 'a_attribuer' => (int) ($na['n'] ?? 0)]);

case 'admin_cr_mode':
  $c = lm2_cr($db, (string) ($IN['cr'] ?? '')); $m = (string) ($IN['mode'] ?? '');
  if (!$c || !in_array($m, ['pilote', 'demo'], true)) lm2_erreur('Paramètres invalides.');
  lm2_cr_mode($db, (string) $c['code'], $m);
  lm2_admin_journal($db, $ACTEUR, 'Mode de la Caisse régionale ' . $c['nom'], ['mode' => $c['mode']], ['mode' => $m]);
  lm2_sortir(['ok' => true]);

case 'admin_cr_envoi':
  $c = lm2_cr($db, (string) ($IN['cr'] ?? ''));
  if (!$c) lm2_erreur('Caisse régionale inconnue.');
  if ($c['mode'] !== 'pilote' && !empty($IN['envoi'])) lm2_erreur('L’envoi réel n’est possible que pour une CR pilote (RG-62).');
  lm2_q($db, 'UPDATE lm2_cr SET envoi = ? WHERE code = ?', 'is', [!empty($IN['envoi']) ? 1 : 0, $c['code']]);
  lm2_admin_journal($db, $ACTEUR, 'Envoi réel pour ' . $c['nom'], ['envoi' => (int) $c['envoi']], ['envoi' => !empty($IN['envoi']) ? 1 : 0]);
  lm2_sortir(['ok' => true]);

case 'admin_interlocuteurs':
  $c = (string) ($IN['cr'] ?? '');
  $its = $c === '_filiales' ? lm2_lignes($db, "SELECT * FROM lm2_interlocuteurs WHERE role = 'filiale' ORDER BY filiale")
       : lm2_lignes($db, "SELECT i.*, (SELECT COUNT(*) FROM lm2_dossiers d WHERE d.assigne_id = i.id AND d.statut <> 'cloture') AS charge FROM lm2_interlocuteurs i WHERE i.cr_code = ? ORDER BY i.masque, FIELD(i.role, 'expert_brh', 'expert_brh_pro', 'conseiller_pro', 'hors_annuaire'), i.nom", 's', [$c]);
  lm2_sortir(['ok' => true, 'interlocuteurs' => array_map(static fn($i) => lm2_carte_interloc($i) + ['masque' => (int) $i['masque'], 'charge' => (int) ($i['charge'] ?? 0), 'compte' => $i['mot_de_passe'] ? 1 : 0, 'maj_le' => $i['maj_le']], $its),
    'agences' => $c === '_filiales' ? [] : lm2_annuaire($db, $c)['agences'], 'alertes' => $c === '_filiales' ? [] : lm2_recouvrements($its)]);

case 'admin_interlocuteur':
  $iid = (int) ($IN['id'] ?? 0) ?: null;
  if ($iid && ($o = lm2_interlocuteur($db, $iid)) && $o['role'] === 'filiale') {   /* boîte générique d'une filiale (Q11) */
    $mail = strtolower(lm2_txt($IN['email'] ?? '', 190)); $don = (string) ($IN['donnees'] ?? 'fictif');
    if (!filter_var($mail, FILTER_VALIDATE_EMAIL) || !in_array($don, ['reel', 'fictif'], true)) lm2_erreur('E-mail ou sigle invalide.');
    if (($x = lm2_ligne($db, 'SELECT id FROM lm2_interlocuteurs WHERE email = ? AND id <> ?', 'si', [$mail, $iid]))) lm2_erreur('E-mail déjà présent dans l’annuaire.');
    lm2_q($db, 'UPDATE lm2_interlocuteurs SET email = ?, donnees = ?, prenom = ?, maj_le = NOW() WHERE id = ?', 'sssi', [$mail, $don, lm2_txt($IN['prenom'] ?? 'Boîte', 100) ?: 'Boîte', $iid]);
    lm2_admin_journal($db, $ACTEUR, 'Boîte filiale modifiée : ' . $o['nom'], lm2_carte_interloc($o), lm2_carte_interloc(lm2_interlocuteur($db, $iid)));
    lm2_sortir(['ok' => true, 'id' => $iid]);
  }
  $err = [];
  $v = lm2_valider_interloc($db, $IN, $iid, $err);
  $mdp = (string) ($IN['mot_de_passe'] ?? '');
  if ($mdp !== '' && strlen($mdp) < 10) $err[] = 'Mot de passe : 10 caractères au moins';
  if (!$v || $err) lm2_erreur(implode(' ; ', $err));
  lm2_sortir(['ok' => true, 'id' => lm2_enregistrer_interloc($db, $v, $iid, $ACTEUR, $mdp)]);

case 'admin_interlocuteur_actif':
  $iid = (int) ($IN['id'] ?? 0); $o = lm2_interlocuteur($db, $iid);
  if (!$o) lm2_erreur('Interlocuteur inconnu.');
  if (empty($IN['actif'])) { $n = lm2_desactiver($db, $iid, $ACTEUR); lm2_admin_journal($db, $ACTEUR, 'Interlocuteur désactivé : ' . lm2_nom($o) . ' (' . $n . ' lead(s) rendu(s) à l’expert BRH)', ['actif' => 1], ['actif' => 0]); lm2_sortir(['ok' => true, 'rendus' => $n]); }
  lm2_q($db, 'UPDATE lm2_interlocuteurs SET actif = 1, maj_le = NOW() WHERE id = ?', 'i', [$iid]);
  lm2_admin_journal($db, $ACTEUR, 'Interlocuteur réactivé : ' . lm2_nom($o), ['actif' => 0], ['actif' => 1]);
  lm2_sortir(['ok' => true]);

case 'admin_import':   /* RG-55 : annexe D, aperçu puis enregistrement */
  $csv = (string) ($IN['csv'] ?? ''); $simuler = !empty($IN['simuler']);
  $csv = preg_replace('/^\xEF\xBB\xBF/', '', $csv);
  $lignes = preg_split('/\r\n|\n|\r/', trim($csv));
  if (count($lignes) < 2) lm2_erreur('Fichier vide : une ligne d’en-tête et au moins une ligne attendues.');
  $sep = substr_count($lignes[0], ';') >= substr_count($lignes[0], ',') ? ';' : ',';
  $tete = array_map(static fn($h) => strtolower(trim(str_replace('*', '', $h))), str_getcsv($lignes[0], $sep, '"', ''));
  $oblig = ['caisse_regionale', 'role', 'prenom', 'nom', 'email_pro', 'departements', 'donnees'];
  $manque = array_diff($oblig, $tete);
  if ($manque) lm2_erreur('Colonnes obligatoires absentes : ' . implode(', ', $manque) . ' (modèle en annexe D).');
  $rapport = []; $vus = []; $ok = 0; $ajouts = 0;
  foreach (array_slice($lignes, 1) as $n => $l) {
    if (trim($l) === '') continue;
    $val = str_getcsv($l, $sep, '"', ''); $x = [];
    foreach ($tete as $k => $h) $x[$h] = $val[$k] ?? '';
    $err = []; $v = lm2_valider_interloc($db, $x, null, $err);
    $mail = strtolower(trim((string) $x['email_pro']));
    if (isset($vus[$mail])) $err[] = 'E-mail en double dans le fichier (ligne ' . $vus[$mail] . ')';
    $vus[$mail] = $n + 2;
    $rapport[] = ['ligne' => $n + 2, 'ok' => !$err, 'erreurs' => $err, 'resume' => trim($x['prenom'] . ' ' . $x['nom']) . ' · ' . $x['role'] . ' · ' . $x['caisse_regionale']];
    if (!$err) { $ok++; if (!$simuler && $v) { lm2_enregistrer_interloc($db, $v, null, $ACTEUR . ' (import CSV)'); $ajouts++; } }
  }
  lm2_sortir(['ok' => true, 'simulation' => $simuler, 'valides' => $ok, 'refuses' => count($rapport) - $ok, 'ajoutes' => $ajouts, 'rapport' => $rapport]);

case 'admin_export':
  $c = (string) ($IN['cr'] ?? '');
  $rows = [['caisse_regionale', 'role', 'prenom', 'nom', 'email_pro', 'telephone_pro', 'departements', 'ville_agence', 'perimetre', 'donnees', 'actif']];
  foreach (lm2_lignes($db, "SELECT * FROM lm2_interlocuteurs WHERE cr_code = ? AND role IN ('expert_brh','expert_brh_pro','conseiller_pro') ORDER BY role, nom", 's', [$c]) as $i)
    $rows[] = [$i['cr_code'], $i['role'], $i['prenom'], $i['nom'], $i['email'], $i['telephone'], $i['departements'], $i['ville_agence'], $i['perimetre'], $i['donnees'], (int) $i['actif'] ? 'oui' : 'non'];
  lm2_sortir(['ok' => true, 'csv' => lm2_csv($rows)]);

case 'admin_journal':
  lm2_sortir(['ok' => true, 'journal' => lm2_lignes($db, 'SELECT cree_le, auteur, objet, avant, apres FROM lm2_admin_journal ORDER BY id DESC LIMIT 200')]);

case 'admin_envoi':
  $dns = lm2_json(lm2_meta($db, 'dns', ''));
  if (!$dns || ($dns['le'] ?? 0) < time() - 3600 || !empty($IN['dns'])) { $dns = lm2_dns() + ['le' => time()]; lm2_meta_ecrire($db, 'dns', lm2_enc($dns)); }
  $u = LM_SMTP_USER;
  lm2_sortir(['ok' => true, 'reglages' => lm2_reglages_envoi($db), 'expediteur' => LM2_EMAIL_FROM, 'nom' => LM2_EMAIL_NOM,
    'smtp' => ['configure' => LM_SMTP_HOST !== '', 'hote' => LM_SMTP_HOST, 'port' => (int) LM_SMTP_PORT, 'securite' => LM_SMTP_SECURE, 'utilisateur' => $u !== '' ? substr($u, 0, 2) . '•••' . substr((string) strrchr($u, '@'), 0) : ''],
    'test_dirigeants' => LM2_TEST_DIRIGEANTS !== '' ? preg_replace('/^(.).*(@.*)$/', '$1•••$2', LM2_TEST_DIRIGEANTS) : '', 'dns' => $dns,
    'crs' => array_map(static fn($c) => ['code' => $c['code'], 'nom' => $c['nom'], 'envoi' => (int) $c['envoi'], 'reels' => (int) $c['reels']],
      lm2_lignes($db, "SELECT c.*, (SELECT COUNT(*) FROM lm2_interlocuteurs i WHERE i.cr_code = c.code AND i.donnees = 'reel' AND i.actif = 1 AND i.masque = 0) reels FROM lm2_cr c WHERE c.mode = 'pilote' ORDER BY c.nom")),
    'journal' => lm2_lignes($db, 'SELECT e.id, e.cree_le, e.modele, e.categorie, e.destinataire, e.destinataire_nom, e.envoye_a, e.objet, e.statut, e.motif, e.essais, d.reference FROM lm2_emails e LEFT JOIN lm2_dossiers d ON d.id = e.dossier_id ORDER BY e.id DESC LIMIT 60')]);

case 'admin_envoi_enregistrer':
  $avant = lm2_reglages_envoi($db); $apres = [];
  foreach (LM2_ENVOI_DEFAUT as $k => $x) $apres[$k] = !empty($IN[$k]);
  lm2_meta_ecrire($db, 'envoi', lm2_enc($apres));
  lm2_admin_journal($db, $ACTEUR, 'Réglages de l’envoi des e-mails', $avant, $apres);
  lm2_sortir(['ok' => true, 'reglages' => $apres]);

case 'admin_email_test':   /* RG-67 */
  $a = strtolower(trim((string) ($IN['email'] ?? '')));
  if (!filter_var($a, FILTER_VALIDATE_EMAIL)) lm2_erreur('Adresse de test invalide.');
  $m = lm2_modeles($db)['T']; $v = ['expediteur' => LM2_EMAIL_FROM];
  $t = lm2_remplir($m['texte'], $v); $pied = 'E-mail de test envoyé depuis l’administration du lead management.';
  $st = lm2_email($db, null, 'T', 'test', $a, '', lm2_remplir($m['objet'], $v), $t . "\n\n" . $pied, lm2_html($m['lib'], $t, [], [['Ouvrir la console', lm2_url('console.html')]], $pied));
  $e = lm2_ligne($db, 'SELECT statut, motif FROM lm2_emails ORDER BY id DESC LIMIT 1');
  lm2_admin_journal($db, $ACTEUR, 'E-mail de test vers ' . $a, null, ['statut' => $st]);
  lm2_sortir(['ok' => $st === 'envoye', 'statut' => $st, 'error' => $st === 'envoye' ? '' : ('Échec de l’envoi : ' . ($e['motif'] ?? 'motif inconnu'))]);

case 'admin_modeles':
  $def = lm2_modeles_defaut(); $cur = lm2_modeles($db); $r = [];
  foreach ($cur as $k => $m) $r[] = ['code' => $k, 'lib' => $m['lib'], 'cat' => $m['cat'], 'objet' => $m['objet'], 'texte' => $m['texte'], 'modifie' => $m['objet'] !== $def[$k]['objet'] || $m['texte'] !== $def[$k]['texte']];
  lm2_sortir(['ok' => true, 'modeles' => $r, 'champs' => ['{prenom}', '{reference}', '{entreprise}', '{ville}', '{effectif}', '{type}', '{echeance}', '{caisse}', '{destinataire}', '{expert}', '{interlocuteur}', '{role}', '{raison}', '{date_rdv}']]);

case 'admin_modele_enregistrer':
  $k = (string) ($IN['code'] ?? ''); $def = lm2_modeles_defaut();
  if (!isset($def[$k])) lm2_erreur('Modèle inconnu.');
  $o = lm2_json(lm2_meta($db, 'modeles', '')); $avant = lm2_modeles($db)[$k];
  if (!empty($IN['reinitialiser'])) unset($o[$k]);
  else { $ob = lm2_txt($IN['objet'] ?? '', 200); $tx = mb_substr(trim((string) ($IN['texte'] ?? '')), 0, 4000);
    if ($ob === '' || $tx === '') lm2_erreur('Objet et texte obligatoires.'); $o[$k] = ['objet' => $ob, 'texte' => $tx]; }
  lm2_meta_ecrire($db, 'modeles', lm2_enc($o));
  lm2_admin_journal($db, $ACTEUR, 'Modèle d’e-mail ' . $k, ['objet' => $avant['objet'], 'texte' => $avant['texte']], $o[$k] ?? ['reinitialise' => true]);
  lm2_sortir(['ok' => true]);

case 'admin_modele_apercu':   /* RG-67 : aperçu avec un dossier d'exemple fictif */
  $k = (string) ($IN['code'] ?? ''); $ms = lm2_modeles($db);
  if (!isset($ms[$k])) lm2_erreur('Modèle inconnu.');
  $m = $ms[$k]; if (isset($IN['objet'])) $m['objet'] = (string) $IN['objet']; if (isset($IN['texte'])) $m['texte'] = (string) $IN['texte'];
  $d = lm2_dossier_exemple();
  $v = lm2_variables($db, $d, ['destinataire' => 'Julie', 'expert' => 'Sophie Martin', 'interlocuteur' => 'Julie Blanc', 'role' => 'conseillère pro', 'agence' => ', agence de Tours', 'raison' => 'échéance dépassée',
    'date_rdv' => lm2_date_fr(date('Y-m-d 10:00:00', strtotime('+3 days'))), 'note' => '', 'resultat' => "\nVotre estimation : 4 200 € par an (estimation indicative et non contractuelle).\n", 'code' => '123456', 'liste' => '• Atelier Exemple (Tours, 12 salariés)', 'nombre' => 1, 'caisse' => 'Crédit Agricole Touraine Poitou']);
  $t = lm2_remplir($m['texte'], $v);
  $inter = $m['cat'] === 'interlocuteur' && in_array($k, ['E2', 'E4', 'E7'], true);
  $html = lm2_html($m['lib'], $t, $inter ? lm2_fiche_client($db, $d, $k === 'E4' ? 'Client déclaré, à vérifier avant le premier appel.' : '') : [],
    $inter ? [['Ouvrir la fiche du lead', '#'], ['Voir le script d’appel', '#']] : ($m['cat'] === 'dirigeant' ? [['Suivre mon dossier', '#']] : []),
    $m['cat'] === 'dirigeant' ? 'Message automatique de la Banque des Ressources Humaines du Crédit Agricole.' : 'Lien personnel valable 14 jours. E-mail interne Crédit Agricole : ne pas transférer.');
  lm2_sortir(['ok' => true, 'objet' => lm2_remplir($m['objet'], $v), 'html' => $html]);

case 'admin_parametres':
  lm2_sortir(['ok' => true, 'parametres' => lm2_parametres($db)]);

case 'admin_parametres_enregistrer':
  $avant = lm2_parametres($db); $j = (array) ($IN['jours'] ?? []);
  $b = static fn($x, int $min, int $max, int $def): int => is_numeric($x) ? max($min, min($max, (int) $x)) : $def;
  $p = ['seuil_pro' => $b($IN['seuil_pro'] ?? null, 1, 500, 20), 'acces_jours' => $b($IN['acces_jours'] ?? null, 1, 60, 14), 'transfert_alerte_jours' => $b($IN['transfert_alerte_jours'] ?? null, 1, 10, 2),
    'jours' => ['devis' => $b($j['devis'] ?? null, 1, 20, 1), 'ultra' => $b($j['ultra'] ?? null, 1, 20, 2), 'qualifie' => $b($j['qualifie'] ?? null, 1, 20, 5), 'rappel' => $b($j['rappel'] ?? null, 1, 20, 2)]];
  lm2_meta_ecrire($db, 'parametres', lm2_enc($p));
  lm2_admin_journal($db, $ACTEUR, 'Délais et paramètres', $avant, $p);
  lm2_sortir(['ok' => true, 'parametres' => $p]);

case 'admin_attribuer':   /* RG-12 : file « à attribuer » */
  $d = lm2_dossier($db, $id); $c = lm2_cr($db, (string) ($IN['cr'] ?? ''));
  if (!$d || !$c) lm2_erreur('Lead ou Caisse régionale inconnu.');
  $ex = lm2_expert_du_siege($db, (string) $c['code'], (string) $d['departement'], (string) $d['ville']);
  lm2_maj($db, $id, ['cr_code' => $c['code'], 'expert_id' => $ex ? (int) $ex['id'] : null]);
  lm2_journal($db, $id, $ACTEUR, 'attribution', 'Lead attribué à la Caisse régionale ' . $c['nom']);
  $d2 = lm2_dossier($db, $id);
  if (in_array($d2['type'], ['devis', 'ultra'], true) && $d2['statut'] === 'nouveau') foreach ($ex ? [$ex] : lm2_experts_cr($db, (string) $c['code']) as $x) lm2_email_interlocuteur($db, 'E2', $d2, $x);
  lm2_sortir(['ok' => true]);

case 'admin_voir_comme':   /* S12 */
  $c = lm2_cr($db, (string) ($IN['cr'] ?? ''));
  if (!$c || $c['mode'] !== 'demo') lm2_erreur('« Voir la console comme l’expert » est réservé aux CR en démonstration.');
  if (!lm2_experts_cr($db, (string) $c['code'])) lm2_erreur('Aucun expert BRH dans l’annuaire de cette CR.');
  $_SESSION['lm2']['vue'] = $c['code'];
  lm2_sortir(['ok' => true]);

case 'admin_reprise':   /* reprise des demandes existantes de la table leads */
  $j = max(1, min(366, (int) ($IN['jours'] ?? 60))); $n = 0;
  foreach (lm2_lignes($db, 'SELECT l.id FROM ' . LM_TABLE_LEADS . ' l LEFT JOIN lm2_demandes d ON d.lead_id = l.id WHERE d.id IS NULL AND l.consentement = 1 AND ' . lm2_filtre_leads('l') . ' AND l.cree_le >= (NOW() - INTERVAL ' . $j . ' DAY) ORDER BY l.id LIMIT 3000') as $l)
    if (lm2_integrer($db, (int) $l['id'], false)) $n++;   /* reprise : aucun e-mail pour des demandes anciennes */
  lm2_admin_journal($db, $ACTEUR, 'Reprise des demandes des ' . $j . ' derniers jours', null, ['integrees' => $n]);
  lm2_sortir(['ok' => true, 'integrees' => $n]);

case 'admin_taches':
  lm2_sortir(['ok' => true] + lm2_taches($db, true));
}
lm2_erreur('Action inconnue.', 404);
