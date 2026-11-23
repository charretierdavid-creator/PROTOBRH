<?php
/* Version C 1.3 — 14/11/2026 · tâches planifiées · historique : VERSIONS.md */
/* ============================================================================
   lm-cron.php — tâches planifiées du lead management (version C)
   - rattrapage des demandes pas encore rattachées à un dossier ;
   - relances des abandonnistes (J+1, J+7) et e-mail de reprise des devis commencés ;
   - alertes de délai : chauds (48 h ouvrées) et ultra-chauds (24 h ouvrées) non pris en charge.
   Hostinger : hPanel → Avancé → Tâches Cron, toutes les 15 minutes :
       php /home/…/public_html/lm-cron.php
   ou par adresse : https://…/lm-cron.php?jeton=LM_CRON_TOKEN (constante de config.php).
   Sans tâche cron, ces traitements tournent quand même à l'ouverture du cockpit (au plus toutes les 10 minutes).
   ============================================================================ */
declare(strict_types=1);
$cli = PHP_SAPI === 'cli';
if (!$cli) { header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); header('X-Robots-Tag: noindex, nofollow'); }
if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $e) {} ob_end_clean(); }
require_once __DIR__ . '/lm-base.php';
if (!$cli && (LM_CRON_TOKEN === '' || !hash_equals(LM_CRON_TOKEN, (string) ($_GET['jeton'] ?? '')))) { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'Jeton requis']); exit; }
if ($cli && LM_SITE_URL === '') { echo json_encode(['ok' => false, 'error' => 'LM_SITE_URL à renseigner dans config.php (liens des e-mails)']), "\n"; exit(1); }
$db = lm_db();
if (!$db) { if (!$cli) http_response_code(500); echo json_encode(['ok' => false, 'error' => 'Base indisponible']), "\n"; exit(1); }
$r = lm_taches($db, true);
echo json_encode(['ok' => true, 'date' => date('c')] + $r, JSON_UNESCAPED_UNICODE), "\n";
