<?php
/* ============================================================
   DEVIS EN LIGNE — proxy d'identification entreprise (Pappers)
   ------------------------------------------------------------
   À placer à côté de devis.html sur Hostinger.
   Le navigateur appelle ce fichier ; la clé Pappers reste
   côté serveur et n'est jamais visible par le visiteur.
   Tant que PAPPERS_API_KEY est vide, le module fonctionne en
   mode démonstration (données fictives).
   Noms de champs à vérifier sur la documentation Pappers v2 :
   https://www.pappers.fr/api/documentation
   ============================================================ */
declare(strict_types=1);
require_once __DIR__ . '/acces.php'; brh_acces_api();   // accès réservé aux personnes connectées (porte d'accès)
header('Content-Type: application/json; charset=utf-8');

if (is_file(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';   // PAPPERS_API_KEY (optionnelle)
if (!defined('PAPPERS_API_KEY')) define('PAPPERS_API_KEY', '');

if (PAPPERS_API_KEY === '') { echo json_encode(['error' => 'not_configured']); exit; }

function pappers(string $path, array $q): ?array {
  $q['api_token'] = PAPPERS_API_KEY;
  $ch = curl_init('https://api.pappers.fr/v2/' . $path . '?' . http_build_query($q));
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
  $r = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  return ($r === false || $code >= 400) ? null : json_decode((string) $r, true);
}

/* Recherche par nom : ?q=... */
if (isset($_GET['q'])) {
  $q = mb_substr(trim((string) $_GET['q']), 0, 80);
  $d = pappers('recherche', ['q' => $q, 'par_page' => 5]);
  if (!$d) { echo json_encode(['error' => 'unavailable']); exit; }
  $out = [];
  foreach (($d['resultats'] ?? []) as $e) {
    $out[] = ['nom' => $e['nom_entreprise'] ?? '', 'ville' => $e['siege']['ville'] ?? '', 'siret' => $e['siege']['siret'] ?? ''];
  }
  echo json_encode(['resultats' => $out], JSON_UNESCAPED_UNICODE); exit;
}

/* Fiche entreprise : ?siret=14 chiffres */
$siret = preg_replace('/\D/', '', (string) ($_GET['siret'] ?? ''));
if (strlen($siret) !== 14) { echo json_encode(['error' => 'siret_invalide']); exit; }
$e = pappers('entreprise', ['siret' => $siret]);
if (!$e) { echo json_encode(['error' => 'not_found']); exit; }

$cc = $e['conventions_collectives'][0] ?? null;
echo json_encode([
  'source'        => 'Pappers',
  'date'          => date('d/m/Y'),
  'nom'           => $e['nom_entreprise'] ?? '',
  'ville'         => $e['siege']['ville'] ?? '',
  'cp'            => $e['siege']['code_postal'] ?? '',
  'naf'           => trim(($e['code_naf'] ?? '') . ' — ' . ($e['libelle_code_naf'] ?? ''), ' —'),
  'tranche'       => $e['effectif'] ?? '',
  'idcc'          => $cc ? trim(($cc['idcc'] ?? '') . ' — ' . ($cc['nom'] ?? ''), ' —') : '',
  'idcc_confirme' => (bool) ($cc['confirmee'] ?? false),
], JSON_UNESCAPED_UNICODE);
