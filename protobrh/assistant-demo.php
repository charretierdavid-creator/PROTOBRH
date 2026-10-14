<?php
/* ============================================================
   ASSISTANT BRH — relais pour la VERSION HORS LIGNE du prototype
   ------------------------------------------------------------
   Le fichier index.html hors ligne (ouvert depuis l'iPad ou un poste,
   sans passer par le site) n'a pas de session : il ne peut pas appeler
   chatbot.php, protégé par la porte d'accès. Ce relais l'autorise
   UNIQUEMENT avec le jeton de démonstration défini dans config.php :
       const ASSISTANT_DEMO_TOKEN = '…';
   - La clé Mistral reste sur le serveur (jamais dans le fichier hors ligne).
   - Jeton absent ou vide dans config.php : relais désactivé.
   - Pour couper l'accès : changer ou vider le jeton dans config.php.
   - Plafond : DEMO_PAR_JOUR questions par jour (toutes origines), en plus
     de la limite par adresse IP de chatbot.php.
   ============================================================ */
declare(strict_types=1);

const DEMO_PAR_JOUR = 300;

header('Access-Control-Allow-Origin: *');            // fichier local : origine « null »
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 86400');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');

function demo_refus(int $code, string $msg): void {
  http_response_code($code);
  echo json_encode(['answer' => $msg, 'mode' => 'demo'], JSON_UNESCAPED_UNICODE);
  exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') demo_refus(405, 'Méthode non autorisée.');

/* jeton attendu : lu dans config.php sans l'exécuter une seconde fois (chatbot.php le charge ensuite) */
$attendu = '';
$cfg = (string) @file_get_contents(__DIR__ . '/config.php');
if (preg_match('/ASSISTANT_DEMO_TOKEN[^=]*=\s*[\'"]([A-Za-z0-9_\-]{12,})[\'"]/', $cfg, $m)) $attendu = $m[1];
$recu = (string) ($_GET['t'] ?? '');
if ($attendu === '' || !hash_equals($attendu, $recu)) {
  demo_refus(403, "L'assistant en ligne n'est pas disponible pour cette version hors ligne. Un expert peut vous recontacter.");
}

/* plafond quotidien (toutes origines confondues) */
$jour = sys_get_temp_dir() . '/brh_demo_' . date('Ymd');
$n = (int) @file_get_contents($jour);
if ($n >= DEMO_PAR_JOUR) demo_refus(429, "L'assistant de démonstration a atteint sa limite du jour. Un expert peut vous recontacter.");
@file_put_contents($jour, (string) ($n + 1), LOCK_EX);

/* même cerveau que le site : chatbot.php, sans la porte d'accès */
define('BRH_ASSISTANT_DEMO', true);
require __DIR__ . '/chatbot.php';
