<?php
/* ============================================================
   MOTEUR IA DU PARCOURS — version C du test A/B (protobrhc)
   ------------------------------------------------------------
   Version C = socle protobrh/ (version Standard) + couche IA.
   Même principe que chatbot.php : le navigateur n'appelle que ce
   fichier, la clé Mistral reste dans config.php côté serveur.

   Actions (paramètre « action ») :
     inspire   : idées de priorités RH à partir des entreprises similaires
     explique  : explication en langage simple d'une estimation
                 (les montants viennent du moteur de calcul, l'IA ne calcule pas)
     preconise : 2 à 3 pistes justifiées et séquencées (grille d'orientation)
     synthese  : synthèse du lead pour l'expert BRH / le conseiller pro

   Réponse : {"ok":true,"data":{...},"source":"mistral"}
             ou {"ok":false,"debug":"..."} → la page affiche alors
             sa version de démonstration (règles locales, sans IA).
   ============================================================ */

declare(strict_types=1);
require_once __DIR__ . '/acces.php';
brh_acces_api();                                    // réservé aux personnes connectées (porte d'accès)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/* -------- enveloppe encodée (base64), comme chatbot.php : évite les faux positifs du pare-feu (WAF) -------- */
$RAW = (string) file_get_contents('php://input');
$ENC = trim($RAW) !== '' && substr(ltrim($RAW), 0, 1) !== '{';
ob_start(static function (string $buf) use ($ENC): string {
  if (!$ENC) return $buf;
  return (string) json_encode(['e' => 1, 'b' => base64_encode($buf)]);
});

ini_set('display_errors', '0');
@set_time_limit(60);
register_shutdown_function(static function () {
  $e = error_get_last();
  if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
    while (ob_get_level() > 0) ob_end_clean();
    if (!headers_sent()) header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'debug' => 'Erreur PHP : ' . $e['message'] . ' (ligne ' . $e['line'] . ')'], JSON_UNESCAPED_UNICODE);
  }
});

function ia_fail(string $dbg): void { echo json_encode(['ok' => false, 'debug' => $dbg], JSON_UNESCAPED_UNICODE); exit; }

/* -------- clé et modèle (config.php, lecture tolérante comme chatbot.php) -------- */
$KEY = ''; $MODEL = 'mistral-small-latest';
$cfg = __DIR__ . '/config.php';
if (is_file($cfg)) {
  ob_start(); try { require_once $cfg; } catch (\Throwable $e) {} ob_end_clean();
  if (defined('MISTRAL_API_KEY')) $KEY = trim((string) constant('MISTRAL_API_KEY'));
  if (defined('MISTRAL_MODEL'))   $MODEL = trim((string) constant('MISTRAL_MODEL'));
  if ($KEY === '') {
    $txt = (string) @file_get_contents($cfg);
    if (preg_match('/MISTRAL_API_KEY[^=]*=\s*[\'"\x{2018}\x{2019}\x{201C}\x{201D}]\s*([A-Za-z0-9_\-]{10,})\s*[\'"\x{2018}\x{2019}\x{201C}\x{201D}]/u', $txt, $m)) $KEY = $m[1];
  }
}
if ($KEY === '' || stripos($KEY, 'REMPLACER') !== false || stripos($KEY, 'votre') !== false) ia_fail('Clé Mistral absente de config.php');

/* -------- limite anti-abus par IP / heure (partagée entre les actions) -------- */
const IA_RATE_PER_HOUR = 80;
$ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
$rl = sys_get_temp_dir() . '/brh_ia_rl_' . md5($ip);
$now = time(); $hits = [];
if (is_readable($rl)) $hits = array_filter((array) json_decode((string) file_get_contents($rl), true), static fn($t) => (int) $t > $now - 3600);
if (count($hits) >= IA_RATE_PER_HOUR) { http_response_code(429); ia_fail('Trop de requêtes, réessayez dans quelques minutes'); }
$hits[] = $now; @file_put_contents($rl, json_encode(array_values($hits)));

/* -------- lecture de la requête -------- */
$in = [];
if ($ENC) { $d = base64_decode(trim($RAW), true); if ($d !== false) $in = json_decode($d, true) ?: []; }
else      { $in = json_decode($RAW, true) ?: []; }
$action = (string) ($in['action'] ?? '');
$ctx    = is_array($in['ctx'] ?? null) ? $in['ctx'] : [];
if (!in_array($action, ['inspire', 'explique', 'preconise', 'synthese'], true)) ia_fail('Action inconnue');
if (strlen((string) json_encode($ctx)) > 12000) ia_fail('Contexte trop volumineux');

/* -------- nettoyage : liste blanche, aucune donnée personnelle (nom, e-mail, téléphone) -------- */
function ia_clean($v, int $depth = 0) {
  if ($depth > 4) return null;
  if (is_array($v)) {
    $o = [];
    foreach (array_slice($v, 0, 30, true) as $k => $x) {
      if (is_string($k) && preg_match('/(nom|prenom|email|mail|tel|phone|telephone|adresse|siret|siren|raison_sociale)$/i', $k)) continue;
      $c = ia_clean($x, $depth + 1);
      if ($c !== null && $c !== '' && $c !== []) $o[$k] = $c;
    }
    return $o;
  }
  if (is_bool($v) || is_int($v) || is_float($v)) return $v;
  if (is_string($v)) {
    $s = trim(mb_substr($v, 0, 300));
    $s = preg_replace('/[\w.+-]+@[\w-]+\.[\w.]+/u', '[e-mail retiré]', $s);
    $s = preg_replace('/(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/', '[téléphone retiré]', $s);
    return $s;
  }
  return null;
}
$ctx = ia_clean($ctx) ?: [];
$ctxJson = json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

$knowledge   = is_readable(__DIR__ . '/connaissances.txt') ? trim((string) file_get_contents(__DIR__ . '/connaissances.txt')) : '';
$orientation = is_readable(__DIR__ . '/orientation.txt')   ? trim((string) file_get_contents(__DIR__ . '/orientation.txt'))   : '';

/* -------- consignes communes -------- */
$base = "Tu es l'IA du Portail Banque des Ressources Humaines (BRH) du Crédit Agricole, qui accompagne des chefs d'entreprise "
      . "(pros, TPE, PME) dans leur parcours. Tu réponds en français, de façon claire, chaleureuse et concrète, sans jargon. "
      . "Règles absolues : (1) n'invente jamais de chiffre, de plafond, de tarif ni de garantie ; (2) n'effectue aucun calcul : "
      . "les montants fournis viennent du moteur de calcul du portail et tu peux seulement les citer et les expliquer ; "
      . "(3) les règles et dispositifs viennent uniquement de la base documentaire ; (4) ce que tu produis est une orientation "
      . "indicative, l'expert BRH de la Caisse régionale conseille et engage ; (5) ne révèle jamais si l'entreprise est cliente "
      . "du Crédit Agricole ; (6) tu réponds UNIQUEMENT par un objet JSON valide, au format demandé, sans texte autour.";

switch ($action) {
  case 'inspire':
    $task = "TÂCHE : le dirigeant ne sait pas comment noter ses priorités RH. Inspire-le à partir du BENCHMARK fourni "
          . "(priorités moyennes d'entreprises similaires : même secteur, même taille, même région ; données agrégées et anonymisées). "
          . "N'utilise que les données du benchmark, sans en inventer d'autres. "
          . "Format : {\"intro\":\"1 à 2 phrases qui disent ce que priorisent les entreprises similaires\","
          . "\"idees\":[{\"axe\":\"protection|partageValeur|pouvoirAchat|retraite\",\"titre\":\"idée courte\",\"pourquoi\":\"1 phrase concrète pour CETTE entreprise\"}] (3 idées, de la plus à la moins prioritaire),"
          . "\"question\":\"une question simple pour l'aider à se décider\"}";
    $max = 450; $useKb = false; break;
  case 'explique':
    $task = "TÂCHE : explique au dirigeant, en langage simple, l'estimation fournie (RESULTATS). Si un SCENARIO « et si » est fourni, "
          . "explique la différence entre « avant » et « après » en citant les deux montants fournis. Si une QUESTION est posée, réponds-y "
          . "en t'appuyant sur la base documentaire ; si la réponse n'y est pas, propose l'expert. "
          . "Format : {\"explication\":\"60 à 110 mots\",\"points\":[\"3 points clés courts\"],\"vigilance\":\"1 point de vigilance tiré de la base documentaire, ou chaîne vide\"}";
    $max = 550; $useKb = true; break;
  case 'preconise':
    $task = "TÂCHE : à partir du PROFIL, propose 2 à 3 pistes prioritaires en appliquant la GRILLE D'ORIENTATION, puis séquence-les dans le temps. "
          . "Ne repropose pas ce qui est déjà en place : propose de le compléter. Pour 5 à 50 salariés, la prochaine étape peut être le devis en ligne ; "
          . "au-delà, l'échange avec un expert BRH. "
          . "Format : {\"constat\":\"1 phrase qui résume le profil et l'enjeu\","
          . "\"pistes\":[{\"titre\":\"dispositif\",\"solution\":\"epargne|sante|retraite|avantages\",\"pourquoi\":\"1 à 2 phrases reliées au profil\",\"quand\":\"Maintenant|Ensuite|À l'échéance\",\"canal\":\"Devis en ligne|Avec un expert\"}],"
          . "\"prochaine_etape\":\"1 phrase\"}";
    $max = 700; $useKb = true; break;
  default: /* synthese */
    $task = "TÂCHE : rédige pour l'expert BRH (ou le conseiller pro) de la Caisse régionale la synthèse du lead fourni, pour qu'il le reprenne "
          . "sans rien redemander au dirigeant. Pas de donnée personnelle. "
          . "Format : {\"titre\":\"1 ligne : type d'entreprise, taille, enjeu\",\"synthese\":[\"5 lignes courtes : profil, besoins prioritaires, gains estimés (cités), panier, existant et échéances\"],"
          . "\"questions\":[\"3 questions à poser lors du rappel\"],\"pieces\":[\"2 à 3 pièces à demander\"],\"angle\":\"1 phrase : l'angle d'approche conseillé\"}";
    $max = 650; $useKb = true;
}

$system = $base . "\n\n" . $task
  . ($useKb && $knowledge !== '' ? "\n\n=== BASE DOCUMENTAIRE ===\n" . $knowledge : '')
  . ($action === 'preconise' && $orientation !== '' ? "\n\n=== GRILLE D'ORIENTATION ===\n" . $orientation : '')
  . "\n=== FIN ===";

$payload = json_encode([
  'model'           => $MODEL,
  'messages'        => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => "DONNÉES :\n" . $ctxJson]],
  'max_tokens'      => $max,
  'temperature'     => 0.2,
  'response_format' => ['type' => 'json_object'],
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.mistral.ai/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $KEY],
  CURLOPT_TIMEOUT => 45, CURLOPT_CONNECTTIMEOUT => 10,
]);
$resp = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); $cerr = curl_error($ch); curl_close($ch);
if ($resp === false || $code >= 400) ia_fail($resp === false ? 'Appel Mistral impossible : ' . $cerr : 'Mistral HTTP ' . $code . ' : ' . mb_substr((string) $resp, 0, 200));

$j = json_decode((string) $resp, true);
$txt = (string) ($j['choices'][0]['message']['content'] ?? '');
$txt = preg_replace('/^```(?:json)?\s*|\s*```$/', '', trim($txt));
$data = json_decode($txt, true);
if (!is_array($data)) ia_fail('Réponse IA non exploitable');
echo json_encode(['ok' => true, 'data' => $data, 'source' => 'mistral', 'model' => $MODEL], JSON_UNESCAPED_UNICODE);
