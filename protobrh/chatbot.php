<?php
/* ============================================================
   ASSISTANT BRH — proxy Mistral (route B) — V2 01/10/2026 : conseil personnalisé
   ------------------------------------------------------------
   À placer sur Hostinger, à côté de chatbot.html + connaissances.txt
   (+ newsletter-savoir.txt, généré par generer-newsletter.php).
   Le navigateur n'appelle QUE ce fichier : la clé API reste
   côté serveur (le PHP s'exécute, son code n'est jamais envoyé
   au visiteur). C'est ce qui rend la clé invisible.
   ============================================================ */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

/* -------- enveloppe encodée (base64) : la question, le profil ET la réponse circulent encodés,
   pour éviter les faux positifs 403 du pare-feu de l'hébergeur (WAF), qui inspecte les contenus. -------- */
$BRH_RAW = (string) file_get_contents('php://input');
$BRH_ENC = trim($BRH_RAW) !== '' && substr(ltrim($BRH_RAW), 0, 1) !== '{';
ob_start(static function (string $buf) use ($BRH_ENC): string {
  if (!$BRH_ENC) return $buf;
  $j = json_decode($buf, true);
  if (!is_array($j)) return $buf;
  $o = ['e' => 1, 'm' => $j['mode'] ?? null];
  if (isset($j['answer'])) $o['a'] = base64_encode((string) $j['answer']);
  if (isset($j['debug']))  $o['d'] = base64_encode((string) $j['debug']);
  return (string) json_encode($o);
});

/* -------- filet de sécurité : toute erreur PHP renvoie une réponse JSON lisible (diagnostic) -------- */
ini_set('display_errors', '0');
@set_time_limit(60);
register_shutdown_function(static function () {
  $e = error_get_last();
  if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
    while (ob_get_level() > 0) ob_end_clean();
    if (!headers_sent()) header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['answer' => "L'assistant a rencontré une erreur technique. Un expert peut vous recontacter.",
                      'debug'  => 'Erreur PHP : ' . $e['message'] . ' (ligne ' . $e['line'] . ')'], JSON_UNESCAPED_UNICODE);
  }
});

/* -------- CONFIG : la clé n'est plus écrite ici --------
   Elle se trouve dans config.php (même dossier), jamais publié sur GitHub :
     <?php
     const MISTRAL_API_KEY = 'votre-cle';
   Lecture tolérante : si config.php contient des guillemets typographiques (saisie sur iPad)
   ou une erreur de syntaxe, la clé est quand même retrouvée.                               */
$BRH_KEY = ''; $BRH_MODEL = 'mistral-small-latest'; $BRH_CFG_ERR = '';
$cfgFile = __DIR__ . '/config.php';
if (is_file($cfgFile)) {
  ob_start();
  try { require $cfgFile; } catch (\Throwable $e) { $BRH_CFG_ERR = 'config.php illisible : ' . $e->getMessage(); }
  ob_end_clean();
  if (defined('MISTRAL_API_KEY')) $BRH_KEY = trim((string) constant('MISTRAL_API_KEY'));
  if (defined('MISTRAL_MODEL'))   $BRH_MODEL = trim((string) constant('MISTRAL_MODEL'));
  if ($BRH_KEY === '') {
    $txt = (string) @file_get_contents($cfgFile);
    if (preg_match('/MISTRAL_API_KEY[^=]*=\s*[\'"\x{2018}\x{2019}\x{201C}\x{201D}]\s*([A-Za-z0-9_\-]{10,})\s*[\'"\x{2018}\x{2019}\x{201C}\x{201D}]/u', $txt, $m)) $BRH_KEY = $m[1];
  }
} else {
  $BRH_CFG_ERR = 'config.php introuvable dans le dossier de chatbot.php';
}
if ($BRH_KEY === '' || stripos($BRH_KEY, 'COLLER') !== false || stripos($BRH_KEY, 'votre') !== false) {
  echo json_encode(['answer' => "L'assistant n'est pas encore configuré. Un expert peut vous recontacter.",
                    'debug'  => $BRH_CFG_ERR !== '' ? $BRH_CFG_ERR : 'Clé Mistral absente ou non remplacée dans config.php'], JSON_UNESCAPED_UNICODE);
  exit;
}

/* -------- garde-fous (coût + abus) -------- */
const MAX_OUTPUT    = 400;   // longueur max d'une réponse (limite le coût de sortie)
const MAX_OUTPUT_PERSO = 650; // réponses de conseil personnalisé (pistes structurées)
const MAX_QUESTION  = 600;   // caractères max acceptés en entrée
const RATE_PER_HOUR = 60;    // requêtes max par adresse IP et par heure
const KNOWLEDGE_FILE  = __DIR__ . '/connaissances.txt';
const NEWSLETTER_FILE = __DIR__ . '/newsletter-savoir.txt';  // veille produite par generer-newsletter.php (peut ne pas exister encore)
const ORIENTATION_FILE = __DIR__ . '/orientation.txt';       // grille d'orientation (conseil personnalisé) — à valider par les filiales

/* -------- limite anti-abus par IP / heure -------- */
$ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
$rlFile = sys_get_temp_dir() . '/cbot_rl_' . md5($ip);
$now = time();
$hits = [];
if (is_readable($rlFile)) {
  $hits = array_filter((array) json_decode((string) file_get_contents($rlFile), true),
                       static fn($t) => (int) $t > $now - 3600);
}
if (count($hits) >= RATE_PER_HOUR) {
  http_response_code(429);
  echo json_encode(['answer' => "Trop de questions en peu de temps. Merci de réessayer dans quelques minutes."], JSON_UNESCAPED_UNICODE);
  exit;
}
$hits[] = $now;
@file_put_contents($rlFile, json_encode(array_values($hits)));

/* -------- lecture de la requête -------- */
$in = [];
if ($BRH_ENC) { $dec = base64_decode(trim($BRH_RAW), true); if ($dec !== false) $in = json_decode($dec, true) ?: []; }
else          { $in = json_decode($BRH_RAW, true) ?: []; }
$question = trim((string) ($in['question'] ?? ''));
$history  = is_array($in['history'] ?? null) ? $in['history'] : [];
if ($question === '') { echo json_encode(['answer' => "Posez votre question, je vous répondrai."], JSON_UNESCAPED_UNICODE); exit; }
if (mb_strlen($question) > MAX_QUESTION) $question = mb_substr($question, 0, MAX_QUESTION);

/* -------- profil de l'entreprise (conseil personnalisé, envoyé seulement après accord du dirigeant) --------
   Liste blanche de champs : uniquement des données d'entreprise, jamais de nom, e-mail ou téléphone. */
function brh_profile($p): ?array {
  if (!is_array($p)) return null;
  $o = [];
  $eff = (int) ($p['effectif'] ?? 0);
  if ($eff > 0 && $eff < 100000) $o['effectif'] = $eff;
  foreach (['secteur', 'typeEntreprise', 'region', 'naf', 'idcc', 'enjeu'] as $k) {
    if (isset($p[$k]) && is_string($p[$k]) && trim($p[$k]) !== '') $o[$k] = mb_substr(trim($p[$k]), 0, 60);
  }
  if (is_array($p['priorites'] ?? null)) {
    foreach (['protection', 'partageValeur', 'pouvoirAchat', 'retraite'] as $k) {
      $v = (int) ($p['priorites'][$k] ?? 0);
      if ($v >= 1 && $v <= 4) $o['priorites'][$k] = $v;
    }
  }
  if (is_array($p['deja'] ?? null)) {
    $o['deja'] = array_values(array_filter(array_map(static fn($x) => mb_substr(trim((string) $x), 0, 40), array_slice($p['deja'], 0, 8))));
  }
  if (is_array($p['solutionsDevis'] ?? null)) {
    $o['solutionsDevis'] = array_values(array_intersect(['epargne', 'sante', 'retraite', 'avantages'], $p['solutionsDevis']));
  }
  if (is_array($p['gains'] ?? null)) {
    $f = (int) ($p['gains']['fiscalAnnuel'] ?? 0); $s = (int) ($p['gains']['parSalarie'] ?? 0);
    if ($f > 0) $o['gains'] = ['fiscalAnnuel' => $f, 'parSalarie' => $s];
  }
  return $o ?: null;
}
function brh_profile_text(array $o): string {
  $axes = ['protection' => 'Protéger vos salariés (santé / prévoyance)', 'partageValeur' => 'Partager la valeur (épargne salariale)',
           'pouvoirAchat' => "Donner du pouvoir d'achat (avantages salariés)", 'retraite' => 'Préparer la retraite (retraite entreprise)'];
  $sol  = ['epargne' => 'épargne salariale', 'sante' => 'santé & prévoyance', 'retraite' => 'retraite collective', 'avantages' => 'avantages salariés'];
  $nf = static fn($n) => number_format((float) $n, 0, ',', ' ');
  $l = [];
  if (isset($o['effectif'])) $l[] = '- Effectif : ' . $o['effectif'] . ' salarié' . ($o['effectif'] > 1 ? 's' : '');
  $id = array_filter([$o['typeEntreprise'] ?? '', isset($o['secteur']) ? 'secteur ' . $o['secteur'] : '', isset($o['region']) ? 'région ' . $o['region'] : '']);
  if ($id) $l[] = '- Entreprise : ' . implode(' ; ', $id);
  if (isset($o['naf'])) $l[] = '- Code NAF : ' . $o['naf'];
  if (isset($o['idcc'])) $l[] = '- Convention collective (IDCC, à confirmer) : ' . $o['idcc'];
  if (!empty($o['priorites'])) {
    $pr = [];
    foreach ($o['priorites'] as $k => $v) $pr[] = $axes[$k] . ' : ' . $v . '/4';
    $l[] = '- Priorités RH notées par le dirigeant (1 = faible, 4 = forte) : ' . implode(' ; ', $pr);
  }
  if (isset($o['enjeu'])) $l[] = '- Enjeu RH n°1 déclaré : ' . $o['enjeu'];
  if (isset($o['deja'])) $l[] = '- Déjà en place dans l\'entreprise : ' . ($o['deja'] ? implode(', ', $o['deja']) : 'rien de tout cela (aucun dispositif déclaré)');
  if (!empty($o['solutionsDevis'])) $l[] = '- Solutions sélectionnées dans le devis en ligne : ' . implode(', ', array_map(static fn($k) => $sol[$k], $o['solutionsDevis']));
  if (isset($o['gains'])) $l[] = '- Gains estimés par le simulateur du portail (indicatifs, non contractuels) : ' . $nf($o['gains']['fiscalAnnuel']) . ' € / an pour l\'entreprise ; ' . $nf($o['gains']['parSalarie']) . ' € / salarié / an';
  return implode("\n", $l);
}
$rawProfile = $in['profile'] ?? null;
if (isset($in['p']) && is_string($in['p']) && strlen($in['p']) < 6000) {   // profil encodé en base64 (contourne les faux positifs du pare-feu)
  $dec = base64_decode($in['p'], true);
  if ($dec !== false) { $j = json_decode($dec, true); if (is_array($j)) $rawProfile = $j; }
}
$profile = brh_profile($rawProfile);

/* -------- base de connaissances (PDF) + veille newsletter -------- */
$knowledge = is_readable(KNOWLEDGE_FILE)  ? trim((string) file_get_contents(KNOWLEDGE_FILE))  : '';
$veille    = is_readable(NEWSLETTER_FILE) ? trim((string) file_get_contents(NEWSLETTER_FILE)) : '';

/* -------- consigne système (ancrage anti-invention) -------- */
$system =
  "Tu es l'assistant de la Banque des Ressources Humaines (BRH), le portail RH du Crédit Agricole pour les chefs d'entreprise. " .
  "Réponds en français, de façon claire, concise et cordiale (2 à 5 phrases). " .
  "Utilise UNIQUEMENT les informations de référence ci-dessous : la base documentaire ET la veille d'actualité (newsletter « Banque des RH info »). " .
  "Pour une question d'actualité récente (épargne salariale, santé/prévoyance, retraite, NAO, avantages salariés…), appuie-toi sur la veille et cite la source et la date. " .
  "Si la réponse ne s'y trouve pas, dis-le simplement et propose d'être recontacté par un expert. " .
  "N'invente jamais de chiffres, de garanties, de tarifs ou de conditions.\n\n" .
  "=== BASE DOCUMENTAIRE ===\n" . $knowledge . "\n\n" .
  "=== VEILLE D'ACTUALITÉ (newsletter Banque des RH info) ===\n" . ($veille !== '' ? $veille : "(aucune édition disponible pour l'instant)") . "\n" .
  "=== FIN ===";

/* -------- mode conseil personnalisé (pré-orientation) -------- */
if ($profile) {
  $orientation = is_readable(ORIENTATION_FILE) ? trim((string) file_get_contents(ORIENTATION_FILE)) : '';
  $eff = $profile['effectif'] ?? 0;
  $next = ($eff >= 5 && $eff <= 50)
    ? "obtenir un devis en ligne sur le portail, ou être recontacté par un expert BRH de sa Caisse régionale"
    : "être recontacté par un expert BRH de sa Caisse régionale";
  $system .= "\n\n=== MODE CONSEIL PERSONNALISÉ (pré-orientation) ===\n" .
    "Le dirigeant a accepté que tu utilises le profil de son entreprise ci-dessous (données déclarées dans le diagnostic du portail). " .
    "Ton rôle est d'ÉCLAIRER et de PRIORISER, pas de conclure : l'expert BRH de la Caisse régionale conseille et engage.\n" .
    "Règles :\n" .
    "1. Adapte chaque réponse à ce profil : relie chaque piste à une priorité notée, à l'enjeu RH déclaré ou à la taille de l'entreprise.\n" .
    "2. Ne propose pas ce qui est déjà en place : propose de le compléter ou de le faire évoluer.\n" .
    "3. Quand on te demande des pistes, structure ainsi : une phrase de constat ; 2 à 3 pistes prioritaires numérotées (dispositif, bénéfice pour l'entreprise et les salariés, pourquoi pour CETTE entreprise) ; puis la prochaine étape : " . $next . ".\n" .
    "4. N'effectue aucun calcul nouveau. Tu peux citer les gains estimés du profil en rappelant qu'ils sont indicatifs. Les plafonds et règles viennent uniquement de la base documentaire.\n" .
    "5. Ne présente jamais une piste comme une recommandation définitive ni comme un conseil fiscal, juridique ou d'investissement. Quand tu proposes des pistes, termine par : « Orientation indicative — un expert BRH valide avec vous la solution adaptée. »\n" .
    "6. Ne demande et n'utilise aucune donnée personnelle (nom, e-mail, téléphone).\n" .
    "7. Réponds en 120 à 220 mots maximum, avec du gras pour les noms de dispositifs.\n\n" .
    "=== PROFIL DE L'ENTREPRISE ===\n" . brh_profile_text($profile) . "\n" .
    ($orientation !== '' ? "\n=== GRILLE D'ORIENTATION (logique de priorisation) ===\n" . $orientation . "\n" : '') .
    "=== FIN DU PROFIL ===";
}

/* -------- construction des messages -------- */
$messages = [['role' => 'system', 'content' => $system]];
foreach (array_slice($history, -6) as $m) {
  $role = $m['role'] ?? '';
  $content = mb_substr((string) ($m['content'] ?? ''), 0, 1000);
  if (($role === 'user' || $role === 'assistant') && $content !== '') {
    $messages[] = ['role' => $role, 'content' => $content];
  }
}
$messages[] = ['role' => 'user', 'content' => $question];

/* -------- appel à l'API Mistral -------- */
$payload = json_encode([
  'model'       => $BRH_MODEL,
  'messages'    => $messages,
  'max_tokens'  => $profile ? MAX_OUTPUT_PERSO : MAX_OUTPUT,
  'temperature' => 0.2,
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.mistral.ai/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $payload,
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Authorization: Bearer ' . $BRH_KEY],
  CURLOPT_TIMEOUT        => 45,
  CURLOPT_CONNECTTIMEOUT => 10,
]);
$resp = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$cerr = curl_error($ch);
curl_close($ch);

if ($resp === false || $code >= 400) {
  $dbg = $resp === false ? 'Appel Mistral impossible : ' . $cerr : 'Mistral a répondu HTTP ' . $code . ' : ' . mb_substr((string) $resp, 0, 240);
  echo json_encode(['answer' => "Je ne parviens pas à répondre pour le moment. Souhaitez-vous être recontacté par un expert ?", 'debug' => $dbg], JSON_UNESCAPED_UNICODE);
  exit;
}

$data   = json_decode((string) $resp, true);
$answer = $data['choices'][0]['message']['content'] ?? "Je n'ai pas de réponse précise à cette question. Un expert peut vous recontacter.";
echo json_encode(['answer' => $answer, 'mode' => $profile ? 'perso' : 'standard'], JSON_UNESCAPED_UNICODE);
