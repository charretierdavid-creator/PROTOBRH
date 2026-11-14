<?php
/* ============================================================
   IDENTIFICATION ENTREPRISE — proxy côté serveur
   ------------------------------------------------------------
   Appelé par le devis (devis.html), le diagnostic et l'audit mutuelle
   (entreprise-lookup.js) : ?siret=14 chiffres, ?siren=9 chiffres ou ?q=nom.

   Source par défaut : API publique « Recherche d'entreprises » de l'État
   (recherche-entreprises.api.gouv.fr, DINUM — INSEE Sirene + RNE) :
   gratuite, sans clé, limitée à 7 requêtes par seconde.
   Source alternative : Pappers (payante), si config.php définit
     const ENTREPRISE_SOURCE = 'pappers';  et  const PAPPERS_API_KEY = '…';

   En cas d'échec, la réponse contient { error, detail:{source, http, message, cause} } ;
   les pages basculent alors en mode démonstration (données fictives).
   ============================================================ */
declare(strict_types=1);
require_once __DIR__ . '/acces.php'; brh_acces_api();   // accès réservé aux personnes connectées (porte d'accès)
header('Content-Type: application/json; charset=utf-8');

if (is_file(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
if (!defined('ENTREPRISE_SOURCE')) define('ENTREPRISE_SOURCE', 'api_gouv');
if (!defined('PAPPERS_API_KEY')) define('PAPPERS_API_KEY', '');
$SOURCE = (ENTREPRISE_SOURCE === 'pappers' && PAPPERS_API_KEY !== '') ? 'pappers' : 'api_gouv';

$ECHEC = null;
function appel(string $url, string $secret = ''): ?array {
  global $ECHEC, $SOURCE;
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => ['Accept: application/json'], CURLOPT_USERAGENT => 'Portail-BRH-prototype/1.0']);
  $r = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
  if ($r === false || $code >= 400) {
    $j = is_string($r) ? json_decode($r, true) : null;
    $msg = $r === false ? $err : (string) (is_array($j) ? ($j['error'] ?? $j['erreur'] ?? $j['message'] ?? '') : mb_substr((string) $r, 0, 200));
    if ($secret !== '') $msg = str_replace($secret, '***', $msg);
    $ECHEC = ['source' => $SOURCE, 'http' => $code, 'message' => $msg, 'cause' => cause($code, $msg)];
    return null;
  }
  return json_decode((string) $r, true);
}
function cause(int $code, string $msg): string {
  if ($code === 0) return 'Appel sortant impossible depuis le serveur (réseau, pare-feu ou cURL).';
  if (stripos($msg, 'crédit') !== false || stripos($msg, 'credit') !== false || $code === 402) return 'Crédits épuisés chez le fournisseur.';
  if ($code === 429) return 'Trop de requêtes : quota ou limite de débit atteint, réessayer dans un instant.';
  if ($code === 401 || $code === 403) return 'Accès refusé par le fournisseur (clé à vérifier dans config.php).';
  if ($code === 404) return 'Entreprise introuvable (SIRET ou SIREN à vérifier).';
  return 'Réponse inattendue du fournisseur.';
}
function echec(string $code): void {
  global $ECHEC;
  echo json_encode(array_merge(['error' => $code], $ECHEC ? ['detail' => $ECHEC] : []), JSON_UNESCAPED_UNICODE); exit;
}

/* Tranches d'effectif INSEE */
function tranche(?string $c): string {
  $t = ['NN' => 'Non employeur', '00' => '0 salarié', '01' => '1 ou 2 salariés', '02' => '3 à 5 salariés', '03' => '6 à 9 salariés',
        '11' => '10 à 19 salariés', '12' => '20 à 49 salariés', '21' => '50 à 99 salariés', '22' => '100 à 199 salariés',
        '31' => '200 à 249 salariés', '32' => '250 à 499 salariés', '41' => '500 à 999 salariés', '42' => '1 000 à 1 999 salariés',
        '51' => '2 000 à 4 999 salariés', '52' => '5 000 à 9 999 salariés', '53' => '10 000 salariés et plus'];
  return $t[(string) $c] ?? '';
}
/* Première convention collective déclarée (9999 = « sans convention » dans Sirene) */
function idcc($liste): string {
  foreach ((array) $liste as $c) { $c = trim((string) $c); if ($c !== '' && $c !== '9999') return $c; }
  return '';
}

$q     = isset($_GET['q']) ? mb_substr(trim((string) $_GET['q']), 0, 80) : null;
$siret = preg_replace('/\D/', '', (string) ($_GET['siret'] ?? ''));
$siren = preg_replace('/\D/', '', (string) ($_GET['siren'] ?? ''));

/* ---------------- API publique Recherche d'entreprises ---------------- */
if ($SOURCE === 'api_gouv') {
  $API = 'https://recherche-entreprises.api.gouv.fr/search?';
  if ($q !== null) {
    $d = appel($API . http_build_query(['q' => $q, 'per_page' => 5, 'etat_administratif' => 'A']));
    if (!$d) echec('unavailable');
    $out = [];
    foreach (($d['results'] ?? []) as $e) {
      $s = $e['siege'] ?? [];
      $out[] = ['nom' => $e['nom_complet'] ?? $e['nom_raison_sociale'] ?? '', 'ville' => $s['libelle_commune'] ?? '', 'siret' => $s['siret'] ?? ''];
    }
    echo json_encode(['resultats' => $out], JSON_UNESCAPED_UNICODE); exit;
  }
  if (strlen($siret) !== 14 && strlen($siren) !== 9) echec('siret_invalide');
  $id = strlen($siret) === 14 ? $siret : $siren;
  $d = appel($API . http_build_query(['q' => $id, 'per_page' => 1, 'limite_matching_etablissements' => 10]));
  if (!$d) echec('not_found');
  $e = ($d['results'] ?? [])[0] ?? null;
  if (!$e || ($e['siren'] ?? '') !== substr($id, 0, 9)) { $ECHEC = ['source' => 'api_gouv', 'http' => 404, 'message' => 'Aucun résultat', 'cause' => cause(404, '')]; echec('not_found'); }
  /* établissement demandé (SIRET) sinon siège */
  $et = $e['siege'] ?? [];
  if (strlen($siret) === 14) foreach (($e['matching_etablissements'] ?? []) as $m) if (($m['siret'] ?? '') === $siret) { $et = array_merge($et, $m); break; }
  echo json_encode([
    'source'        => 'API Recherche d’entreprises',
    'siren'         => $e['siren'],
    'siret'         => $et['siret'] ?? $siret,
    'date'          => date('d/m/Y'),
    'nom'           => $e['nom_complet'] ?? $e['nom_raison_sociale'] ?? '',
    'ville'         => mb_convert_case(mb_strtolower((string) ($et['libelle_commune'] ?? '')), MB_CASE_TITLE),
    'cp'            => $et['code_postal'] ?? '',
    'naf'           => $et['activite_principale'] ?? $e['activite_principale'] ?? '',
    'tranche'       => tranche($e['tranche_effectif_salarie'] ?? null),
    'idcc'          => idcc($et['liste_idcc'] ?? ($e['complements']['liste_idcc'] ?? [])),
    'idcc_confirme' => false,
  ], JSON_UNESCAPED_UNICODE); exit;
}

/* ---------------- Pappers (option payante) ---------------- */
function pappers(string $path, array $p): ?array {
  $p['api_token'] = PAPPERS_API_KEY;
  return appel('https://api.pappers.fr/v2/' . $path . '?' . http_build_query($p), PAPPERS_API_KEY);
}
if ($q !== null) {
  $d = pappers('recherche', ['q' => $q, 'par_page' => 5]);
  if (!$d) echec('unavailable');
  $out = [];
  foreach (($d['resultats'] ?? []) as $e) {
    $out[] = ['nom' => $e['nom_entreprise'] ?? '', 'ville' => $e['siege']['ville'] ?? '', 'siret' => $e['siege']['siret'] ?? ''];
  }
  echo json_encode(['resultats' => $out], JSON_UNESCAPED_UNICODE); exit;
}
if (strlen($siret) === 14)     $e = pappers('entreprise', ['siret' => $siret]);
elseif (strlen($siren) === 9)  $e = pappers('entreprise', ['siren' => $siren]);
else echec('siret_invalide');
if (!$e) echec('not_found');
$cc = $e['conventions_collectives'][0] ?? null;
echo json_encode([
  'source'        => 'Pappers',
  'siren'         => $e['siren'] ?? substr($siret, 0, 9),
  'siret'         => $e['siege']['siret'] ?? $siret,
  'date'          => date('d/m/Y'),
  'nom'           => $e['nom_entreprise'] ?? '',
  'ville'         => $e['siege']['ville'] ?? '',
  'cp'            => $e['siege']['code_postal'] ?? '',
  'naf'           => trim(($e['code_naf'] ?? '') . ' — ' . ($e['libelle_code_naf'] ?? ''), ' —'),
  'tranche'       => $e['effectif'] ?? '',
  'idcc'          => $cc ? trim(($cc['idcc'] ?? '') . ' — ' . ($cc['nom'] ?? ''), ' —') : '',
  'idcc_confirme' => (bool) ($cc['confirmee'] ?? false),
], JSON_UNESCAPED_UNICODE);
