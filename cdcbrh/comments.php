<?php
/**
 * Portail BRH — cahier des charges interactif
 * API de commentaires partagés (sans mot de passe).
 * GET  comments.php?action=list            -> liste des commentaires
 * POST action=add    page, author, text, rating (0 à 5) -> ajoute un avis (renvoie un jeton de suppression)
 * POST action=delete id, token | key        -> supprime un commentaire (auteur, ou Business Owner avec la clé)
 * POST action=check_admin key               -> vérifie la clé d'administration
 * POST action=set_status id, status, version, key -> nouveau | valide | rejete | integre (Business Owner)
 * GET  comments.php?action=backlog          -> commentaires au statut « valide » (backlog à intégrer)
 * Les données sont stockées dans data/comments.json (dossier fermé au web).
 */
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const DATA_DIR     = __DIR__ . '/data';
const DATA_FILE    = DATA_DIR . '/comments.json';
const RATE_FILE    = DATA_DIR . '/rate.json';
const MAX_TEXT     = 2000;   // caractères par commentaire
const MAX_AUTHOR   = 60;
const RATE_MAX     = 20;     // commentaires max par adresse...
const RATE_WINDOW  = 600;    // ...sur 10 minutes
const MAX_COMMENTS = 5000;   // plafond de sécurité
const STATUSES     = ['nouveau', 'valide', 'rejete', 'integre'];
if (is_file(__DIR__ . '/config.php')) require __DIR__ . '/config.php';
if (!defined('ADMIN_KEY')) define('ADMIN_KEY', '');

function out(array $data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400): void { out(['ok' => false, 'error' => $msg], $code); }

if (!is_dir(DATA_DIR) && !@mkdir(DATA_DIR, 0750, true)) fail('Stockage indisponible', 500);
if (!file_exists(DATA_DIR . '/.htaccess')) @file_put_contents(DATA_DIR . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");

/** Lecture / écriture d'un fichier JSON sous verrou exclusif. */
function with_file(string $path, callable $fn) {
    $fh = @fopen($path, 'c+');
    if (!$fh) fail('Stockage indisponible', 500);
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $data = $raw ? json_decode($raw, true) : [];
    if (!is_array($data)) $data = [];
    $res = $fn($data);
    if (!empty($res['write'])) {
        ftruncate($fh, 0); rewind($fh);
        fwrite($fh, json_encode($res['data'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        fflush($fh);
    }
    flock($fh, LOCK_UN); fclose($fh);
    return $res['return'] ?? null;
}
function clean(string $s, int $max): string {
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    return mb_substr(trim($s), 0, $max);
}
function public_view(array $c): array { unset($c['th']); $c['status'] = $c['status'] ?? 'nouveau'; return $c; }
function is_admin(string $key): bool { return ADMIN_KEY !== '' && $key !== '' && hash_equals(ADMIN_KEY, $key); }
/** Vérifie la clé d'administration ; bloque 10 minutes après 10 essais erronés depuis la même adresse. */
function require_admin(string $key): void {
    $who = 'adm|' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . __FILE__);
    $valid = is_admin($key);
    $ok = with_file(RATE_FILE, function (array $d) use ($who, $valid) {
        $now = time();
        $ts = array_values(array_filter((array)($d[$who] ?? []), function ($t) use ($now) { return $t > $now - 600; }));
        if (count($ts) >= 10) { $d[$who] = $ts; return ['return' => 'blocked', 'write' => true, 'data' => $d]; }
        if (!$valid) { $ts[] = $now; }
        if ($ts) $d[$who] = $ts; else unset($d[$who]);
        return ['return' => $valid ? 'ok' : 'bad', 'write' => true, 'data' => $d];
    });
    if ($ok === 'blocked') fail('Trop de tentatives : réessayez dans 10 minutes', 429);
    if ($ok !== 'ok') fail('Clé d\'administration invalide', 403);
}

if ($method === 'GET' && $action === 'backlog') {
    $list = with_file(DATA_FILE, function (array $d) { return ['return' => $d]; });
    $b = array_values(array_filter(array_map('public_view', $list ?? []), function ($c) { return $c['status'] === 'valide'; }));
    out(['ok' => true, 'generated' => date('c'), 'count' => count($b), 'backlog' => $b]);
}
if ($method === 'GET' && $action === 'list') {
    $list = with_file(DATA_FILE, function (array $d) { return ['return' => $d]; });
    out(['ok' => true, 'comments' => array_values(array_map('public_view', $list ?? []))]);
}
if ($method !== 'POST') fail('Méthode non autorisée', 405);

// Refuse les envois provenant d'un autre site
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '')) fail('Origine refusée', 403);
// Piège à robots : champ invisible rempli = envoi ignoré
if (($_POST['website'] ?? '') !== '') out(['ok' => true, 'comment' => null]);

if ($action === 'add') {
    $page = (string)($_POST['page'] ?? '');
    if (!preg_match('/^(É\d{2}|P1|P2|H)$/u', $page)) fail('Page inconnue');
    $author = clean((string)($_POST['author'] ?? ''), MAX_AUTHOR);
    $text   = clean((string)($_POST['text'] ?? ''), MAX_TEXT);
    $rating = (int)($_POST['rating'] ?? 0);
    if ($rating < 0 || $rating > 5) fail('Note invalide : entre 1 et 5');
    if ($author === '') fail('Nom obligatoire');
    if ($text === '' && $rating === 0) fail('Ajoutez une note ou un commentaire');

    $who = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . __FILE__);
    $allowed = with_file(RATE_FILE, function (array $d) use ($who) {
        $now = time();
        foreach ($d as $k => $ts) {
            $d[$k] = array_values(array_filter((array)$ts, function ($t) use ($now) { return $t > $now - RATE_WINDOW; }));
            if (!$d[$k]) unset($d[$k]);
        }
        if (count($d[$who] ?? []) >= RATE_MAX) return ['return' => false, 'write' => true, 'data' => $d];
        $d[$who][] = $now;
        return ['return' => true, 'write' => true, 'data' => $d];
    });
    if (!$allowed) fail('Trop de commentaires en peu de temps : réessayez dans quelques minutes', 429);

    $token = bin2hex(random_bytes(16));
    $c = ['id' => bin2hex(random_bytes(6)), 'page' => $page, 'author' => $author, 'text' => $text, 'rating' => $rating, 'status' => 'nouveau', 'date' => date('c'), 'th' => hash('sha256', $token)];
    $saved = with_file(DATA_FILE, function (array $d) use ($c) {
        if (count($d) >= MAX_COMMENTS) return ['return' => false];
        $d[] = $c;
        return ['return' => true, 'write' => true, 'data' => $d];
    });
    if (!$saved) fail('Capacité maximale atteinte', 507);
    out(['ok' => true, 'comment' => public_view($c), 'token' => $token]);
}

if ($action === 'delete') {
    $id = (string)($_POST['id'] ?? '');
    $th = hash('sha256', (string)($_POST['token'] ?? ''));
    $key = (string)($_POST['key'] ?? '');
    if ($key !== '') require_admin($key);
    $adm = $key !== '';
    $done = with_file(DATA_FILE, function (array $d) use ($id, $th, $adm) {
        foreach ($d as $i => $c) {
            if (($c['id'] ?? '') === $id && ($adm || (isset($c['th']) && hash_equals($c['th'], $th)))) {
                array_splice($d, $i, 1);
                return ['return' => true, 'write' => true, 'data' => $d];
            }
        }
        return ['return' => false];
    });
    if (!$done) fail('Suppression refusée : seul l\'auteur peut supprimer son commentaire', 403);
    out(['ok' => true]);
}

if ($action === 'check_admin') {
    require_admin((string)($_POST['key'] ?? ''));
    out(['ok' => true]);
}

if ($action === 'set_status') {
    require_admin((string)($_POST['key'] ?? ''));
    $id = (string)($_POST['id'] ?? '');
    $st = (string)($_POST['status'] ?? '');
    if (!in_array($st, STATUSES, true)) fail('Statut inconnu');
    $version = clean((string)($_POST['version'] ?? ''), 30);
    $res = with_file(DATA_FILE, function (array $d) use ($id, $st, $version) {
        foreach ($d as $i => $c) {
            if (($c['id'] ?? '') === $id) {
                $d[$i]['status'] = $st;
                $d[$i]['version'] = $st === 'integre' ? $version : '';
                $d[$i]['sdate'] = date('c');
                return ['return' => $d[$i], 'write' => true, 'data' => $d];
            }
        }
        return ['return' => null];
    });
    if (!$res) fail('Commentaire introuvable', 404);
    out(['ok' => true, 'comment' => public_view($res)]);
}

fail('Action inconnue');
