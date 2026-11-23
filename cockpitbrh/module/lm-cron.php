<?php
/* Module LM 2.0.4 — 23/11/2026 · aucune tâche tant que le fichier « pause.flag » est présent (demande du DPO) · historique : VERSIONS.md */
/* Module LM 2.0 — 15/11/2026 · tâches planifiées : intégration des demandes, relances J+1 et J+7, alertes de délai, récapitulatif quotidien de 8 h, nouvel essai des e-mails en échec · historique : VERSIONS.md */
/* ============================================================================
   lm-cron.php — tâches planifiées du lead management simplifié (LM 2.0)
   - demandes des sites pas encore rattachées à un dossier lm2_* (mode « base partagée », ou rattrapage) ;
   - relances E6 des leads qualifiés non pris en charge (J+1, J+7), si le dirigeant ne les a pas refusées ;
   - alertes E7 : échéance dépassée, transfert non pris en charge sous 48 h ouvrées (RG-25) ;
   - récapitulatif quotidien des leads qualifiés aux experts BRH, à partir de 8 h les jours ouvrés (S2) ;
   - file d'attente des e-mails : nouvel essai des envois en échec (3 essais au plus, RG-66) ; conservation 12 mois.
   Hostinger : hPanel → Avancé → Tâches Cron, toutes les 15 minutes :
       php /home/…/domains/cockpitbrh.monsitedetest.com/public_html/lm-cron.php
   ou par adresse : https://cockpitbrh.monsitedetest.com/lm-cron.php?jeton=LM_CRON_TOKEN (constante de config.php).
   Sans tâche cron, ces traitements tournent aussi à l'ouverture de la console (au plus toutes les LM_TACHES_MINUTES minutes).
   ============================================================================ */
declare(strict_types=1);
$cli = PHP_SAPI === 'cli';
/* PAUSE (demande du DPO) : tant qu'un fichier « pause.flag » est dans le dossier du module, aucune tâche ne tourne,
   même lancée par la tâche cron de Hostinger (ni intégration, ni relance, ni alerte, ni e-mail). */
if (is_file(__DIR__ . '/pause.flag')) {
  if (!$cli) { http_response_code(503); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); }
  echo json_encode(['ok' => true, 'pause' => true, 'message' => 'Module en pause (demande du DPO) : aucune tâche exécutée.'], JSON_UNESCAPED_UNICODE), "\n";
  exit(0);
}
if (!$cli) { header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); header('X-Robots-Tag: noindex, nofollow'); }
if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $e) {} ob_end_clean(); }
require_once __DIR__ . '/lm2-base.php';
if (!$cli && (LM_CRON_TOKEN === '' || !hash_equals(LM_CRON_TOKEN, (string) ($_GET['jeton'] ?? '')))) { http_response_code(403); echo json_encode(['ok' => false, 'error' => 'Jeton requis']); exit; }
if ($cli && LM_SITE_URL === '') { echo json_encode(['ok' => false, 'error' => 'LM_SITE_URL à renseigner dans config.php (liens des e-mails)']), "\n"; exit(1); }
$db = lm2_db();
if (!$db) { if (!$cli) http_response_code(500); echo json_encode(['ok' => false, 'error' => 'Base indisponible']), "\n"; exit(1); }
$r = lm2_taches($db, true);
echo json_encode(['ok' => true, 'date' => date('c')] + $r, JSON_UNESCAPED_UNICODE), "\n";
