<?php
/* ============================================================
   ASSISTANT BRH — proxy Mistral (route B)
   ------------------------------------------------------------
   À placer sur Hostinger, à côté de chatbot.html + connaissances.txt
   (+ newsletter-savoir.txt, généré par generer-newsletter.php).
   Le navigateur n'appelle QUE ce fichier : la clé API reste
   côté serveur (le PHP s'exécute, son code n'est jamais envoyé
   au visiteur). C'est ce qui rend la clé invisible.
   ============================================================ */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

/* -------- CONFIG (les 2 seules lignes à renseigner) -------- */
require_once __DIR__ . '/config.php';                          // MISTRAL_API_KEY (fichier présent uniquement sur Hostinger)
const MISTRAL_MODEL   = 'mistral-small-latest';               // proto = le moins cher ; 'mistral-large-latest' si besoin

/* -------- garde-fous (coût + abus) -------- */
const MAX_OUTPUT    = 400;   // longueur max d'une réponse (limite le coût de sortie)
const MAX_QUESTION  = 600;   // caractères max acceptés en entrée
const RATE_PER_HOUR = 60;    // requêtes max par adresse IP et par heure
const KNOWLEDGE_FILE  = __DIR__ . '/connaissances.txt';
const NEWSLETTER_FILE = __DIR__ . '/newsletter-savoir.txt';  // veille produite par generer-newsletter.php (peut ne pas exister encore)

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
$in = json_decode((string) file_get_contents('php://input'), true) ?: [];
$question = trim((string) ($in['question'] ?? ''));
$history  = is_array($in['history'] ?? null) ? $in['history'] : [];
if ($question === '') { echo json_encode(['answer' => "Posez votre question, je vous répondrai."], JSON_UNESCAPED_UNICODE); exit; }
if (mb_strlen($question) > MAX_QUESTION) $question = mb_substr($question, 0, MAX_QUESTION);

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
  'model'       => MISTRAL_MODEL,
  'messages'    => $messages,
  'max_tokens'  => MAX_OUTPUT,
  'temperature' => 0.2,
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.mistral.ai/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $payload,
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Authorization: Bearer ' . MISTRAL_API_KEY],
  CURLOPT_TIMEOUT        => 30,
]);
$resp = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($resp === false || $code >= 400) {
  echo json_encode(['answer' => "Je ne parviens pas à répondre pour le moment. Souhaitez-vous être recontacté par un expert ?"], JSON_UNESCAPED_UNICODE);
  exit;
}

$data   = json_decode((string) $resp, true);
$answer = $data['choices'][0]['message']['content'] ?? "Je n'ai pas de réponse précise à cette question. Un expert peut vous recontacter.";
echo json_encode(['answer' => $answer], JSON_UNESCAPED_UNICODE);
