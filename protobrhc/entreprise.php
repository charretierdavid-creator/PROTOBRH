<?php
/* Version C 1.1 — 14/11/2026 · toutes les conventions collectives déclarées (idcc_liste) · historique : VERSIONS.md */
/* ============================================================
   IDENTIFICATION ENTREPRISE — proxy côté serveur (VERSION C, protobrhc)
   ------------------------------------------------------------
   Surcouche de protobrh/entreprise.php : même contrat de réponse, plus la liste
   COMPLÈTE des conventions collectives déclarées (le socle n'en gardait qu'une).
   Exemple : BRIAND (SIREN 890 331 754) déclare l'IDCC 2420 (cadres du bâtiment)
   et l'IDCC 2609 (ETAM du bâtiment), comme l'affichent l'Annuaire des entreprises et Pappers.

   Sources des conventions collectives, toutes SANS CLÉ et SANS CONTRAT :
     1. API publique « Recherche d'entreprises » (DINUM) : c'est la source du site public
        annuaire-entreprises.data.gouv.fr. Champs liste_idcc de l'établissement (SIRET demandé
        ou siège) et de l'unité légale (complements.liste_idcc). Origine : déclarations
        sociales nominatives (DSN), liste publiée par le ministère du Travail.
        C'est aussi la source de Pappers pour les conventions collectives.
     2. siret2idcc (Fabrique numérique des ministères sociaux, utilisé par le Code du travail
        numérique) : intitulés officiels et lien Légifrance par SIRET. Facultatif : en cas
        d'échec ou de lenteur (4 s), la réponse part sans les intitulés.
   Le site Pappers n'est PAS interrogé page par page : ses conditions d'utilisation
   interdisent l'extraction automatisée et ses pages sont protégées contre les robots.
   L'API Pappers (payante) reste disponible en option, comme dans le socle :
     const ENTREPRISE_SOURCE = 'pappers';  const PAPPERS_API_KEY = '…';
   Désactiver l'enrichissement siret2idcc :  const IDCC_SIRET2IDCC = false;

   Réponse (champs ajoutés au socle) :
     idcc            : code de la convention principale (compatibilité avec le socle)
     idcc_liste      : [{code, libelle, niveau:'etablissement'|'entreprise', source, legifrance, active}]
     idcc_declaree   : true si au moins une convention est déclarée
     sans_convention : true si l'entreprise déclare « sans convention collective » (IDCC 9999)
     verifier        : liens de vérification publics (Annuaire des entreprises, Pappers)
   En cas d'échec, { error, detail:{source, http, message, cause} } : le devis passe en démonstration.
   ============================================================ */
declare(strict_types=1);
require_once __DIR__ . '/acces.php'; brh_acces_api();   // accès réservé aux personnes connectées (porte d'accès)
header('Content-Type: application/json; charset=utf-8');

if (is_file(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
if (!defined('ENTREPRISE_SOURCE')) define('ENTREPRISE_SOURCE', 'api_gouv');
if (!defined('PAPPERS_API_KEY')) define('PAPPERS_API_KEY', '');
if (!defined('IDCC_SIRET2IDCC')) define('IDCC_SIRET2IDCC', true);
$SOURCE = (ENTREPRISE_SOURCE === 'pappers' && PAPPERS_API_KEY !== '') ? 'pappers' : 'api_gouv';

$ECHEC = null;
/* $doux = true : appel complémentaire, son échec ne bloque pas la réponse */
function appel(string $url, string $secret = '', bool $doux = false, int $delai = 10): ?array {
  global $ECHEC, $SOURCE;
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $delai, CURLOPT_CONNECTTIMEOUT => min($delai, 5),
    CURLOPT_HTTPHEADER => ['Accept: application/json'], CURLOPT_USERAGENT => 'Portail-BRH-prototype/1.0']);
  $r = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
  if ($r === false || $code >= 400) {
    if ($doux) return null;
    $j = is_string($r) ? json_decode($r, true) : null;
    $msg = $r === false ? $err : (string) (is_array($j) ? ($j['error'] ?? $j['erreur'] ?? $j['message'] ?? '') : mb_substr((string) $r, 0, 200));
    if ($secret !== '') $msg = str_replace($secret, '***', $msg);
    $ECHEC = ['source' => $SOURCE, 'http' => $code, 'message' => $msg, 'cause' => cause($code, $msg)];
    return null;
  }
  $d = json_decode((string) $r, true);
  return is_array($d) ? $d : null;
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

/* ---------------- conventions collectives ---------------- */
/* code IDCC normalisé : chiffres sans zéros de tête (« 0016 » → « 16 ») */
function code_idcc($c): string {
  $c = preg_replace('/\D/', '', (string) $c);
  $c = ltrim((string) $c, '0');
  return ($c === '' || strlen($c) > 4) ? '' : $c;
}
/* 9999 = « sans convention collective », 9998 = « convention non encore en vigueur » (codes techniques DSN) */
function idcc_technique(string $c): bool { return $c === '9999' || $c === '9998'; }
/* ajoute des codes à la liste, sans doublon, en gardant l'ordre (établissement avant entreprise) */
function ajouter_idcc(array &$liste, $codes, string $niveau, string $source, bool &$sans): void {
  foreach ((array) $codes as $c) {
    $c = code_idcc($c);
    if ($c === '') continue;
    if (idcc_technique($c)) { if ($c === '9999') $sans = true; continue; }
    if (isset($liste[$c])) continue;
    $liste[$c] = ['code' => $c, 'libelle' => '', 'niveau' => $niveau, 'source' => $source, 'legifrance' => '', 'active' => null];
  }
}
/* intitulés officiels et liens Légifrance (siret2idcc) ; ajoute les codes éventuellement absents */
function enrichir_siret2idcc(array &$liste, string $siret, bool &$sans): void {
  if (!IDCC_SIRET2IDCC || strlen($siret) !== 14) return;
  $d = appel('https://siret2idcc.fabrique.social.gouv.fr/api/v2/' . $siret, '', true, 4);
  if (!$d) return;
  foreach ($d as $et) {
    if (!is_array($et) || (string) ($et['siret'] ?? $siret) !== $siret) continue;
    foreach ((array) ($et['conventions'] ?? []) as $cv) {
      if (!is_array($cv)) continue;
      $c = code_idcc($cv['num'] ?? '');
      if ($c === '') continue;
      if (idcc_technique($c)) { if ($c === '9999') $sans = true; continue; }
      if (!isset($liste[$c])) $liste[$c] = ['code' => $c, 'libelle' => '', 'niveau' => 'etablissement', 'source' => 'siret2idcc (ministères sociaux)', 'legifrance' => '', 'active' => null];
      $titre = trim((string) ($cv['shortTitle'] ?? $cv['title'] ?? ''));
      if ($titre !== '') $liste[$c]['libelle'] = mb_substr($titre, 0, 160);
      $url = (string) ($cv['url'] ?? '');
      if (preg_match('#^https://www\.legifrance\.gouv\.fr/#', $url)) $liste[$c]['legifrance'] = $url;
      if (array_key_exists('active', $cv)) $liste[$c]['active'] = (bool) $cv['active'];
    }
  }
}
function verifier(string $siren): array {
  return ['annuaire' => 'https://annuaire-entreprises.data.gouv.fr/entreprise/' . $siren,
          'pappers'  => 'https://www.pappers.fr/recherche?q=' . $siren];
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

  /* toutes les conventions : d'abord celles de l'établissement, puis celles de l'entreprise */
  $liste = []; $sans = false; $src = 'Déclarations sociales (DSN) — Annuaire des entreprises';
  ajouter_idcc($liste, $et['liste_idcc'] ?? [], 'etablissement', $src, $sans);
  ajouter_idcc($liste, $e['complements']['liste_idcc'] ?? [], 'entreprise', $src, $sans);
  enrichir_siret2idcc($liste, (string) ($et['siret'] ?? $siret), $sans);
  $liste = array_values($liste);

  echo json_encode([
    'source'          => 'API Recherche d’entreprises',
    'siren'           => $e['siren'],
    'siret'           => $et['siret'] ?? $siret,
    'date'            => date('d/m/Y'),
    'nom'             => $e['nom_complet'] ?? $e['nom_raison_sociale'] ?? '',
    'ville'           => mb_convert_case(mb_strtolower((string) ($et['libelle_commune'] ?? '')), MB_CASE_TITLE),
    'cp'              => $et['code_postal'] ?? '',
    'naf'             => $et['activite_principale'] ?? $e['activite_principale'] ?? '',
    'tranche'         => tranche($e['tranche_effectif_salarie'] ?? null),
    'idcc'            => $liste ? $liste[0]['code'] : '',
    'idcc_confirme'   => false,
    'idcc_liste'      => $liste,
    'idcc_declaree'   => count($liste) > 0,
    'sans_convention' => $sans && !$liste,
    'verifier'        => verifier((string) $e['siren']),
  ], JSON_UNESCAPED_UNICODE); exit;
}

/* ---------------- Pappers (option payante, avec clé) ---------------- */
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
$liste = []; $sans = false; $conf = false;
foreach ((array) ($e['conventions_collectives'] ?? []) as $cc) {
  if (!is_array($cc)) continue;
  $c = code_idcc($cc['idcc'] ?? '');
  if ($c === '') continue;
  if (idcc_technique($c)) { if ($c === '9999') $sans = true; continue; }
  if (isset($liste[$c])) continue;
  $liste[$c] = ['code' => $c, 'libelle' => trim((string) ($cc['nom'] ?? '')), 'niveau' => 'entreprise', 'source' => 'Pappers',
                'legifrance' => '', 'active' => null, 'confirmee' => (bool) ($cc['confirmee'] ?? false)];
  if (!empty($cc['confirmee'])) $conf = true;
}
$liste = array_values($liste);
$first = $liste[0] ?? null;
$sir = (string) ($e['siren'] ?? substr($siret, 0, 9));
echo json_encode([
  'source'          => 'Pappers',
  'siren'           => $sir,
  'siret'           => $e['siege']['siret'] ?? $siret,
  'date'            => date('d/m/Y'),
  'nom'             => $e['nom_entreprise'] ?? '',
  'ville'           => $e['siege']['ville'] ?? '',
  'cp'              => $e['siege']['code_postal'] ?? '',
  'naf'             => trim(($e['code_naf'] ?? '') . ' — ' . ($e['libelle_code_naf'] ?? ''), ' —'),
  'tranche'         => $e['effectif'] ?? '',
  'idcc'            => $first ? trim($first['code'] . ' — ' . $first['libelle'], ' —') : '',
  'idcc_confirme'   => $conf,
  'idcc_liste'      => $liste,
  'idcc_declaree'   => count($liste) > 0,
  'sans_convention' => $sans && !$liste,
  'verifier'        => verifier($sir),
], JSON_UNESCAPED_UNICODE);
