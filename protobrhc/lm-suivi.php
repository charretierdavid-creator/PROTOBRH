<?php
/* Version C 1.3 — 14/11/2026 · suivi du dossier par le dirigeant · historique : VERSIONS.md */
/* ============================================================================
   lm-suivi.php — suivi du Dossier BRH par le dirigeant (version C)
   Appelé par suivi-dossier.html?d=BRH-26-000123&j=<jeton> (lien des e-mails et de la fin de devis).
   Le dirigeant voit les 6 statuts du workflow commun, son interlocuteur et son rendez-vous ;
   jamais le niveau du lead ni le statut client vérifié (règle du deck du 14/11/2026).
   POST action=stop    : arrêt des relances e-mail ;
   POST action=rappel  : « Être rappelé par un expert » (téléphone + consentement) → lead chaud, 48 h ouvrées.
   ============================================================================ */
declare(strict_types=1);
require_once __DIR__ . '/acces.php'; brh_acces_api();   // prototype : derrière la porte d'accès, comme tout le site
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
if (is_file(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lm-base.php';
$sortir = static function (array $r, int $c = 200): void { http_response_code($c); echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; };

$post = $_SERVER['REQUEST_METHOD'] === 'POST';
$in = $post ? json_decode((string) file_get_contents('php://input'), true) : $_GET;
if (!is_array($in)) $in = [];
$ref = lm_txt($in['d'] ?? '', 20); $jeton = (string) ($in['j'] ?? '');
if (!preg_match('/^BRH-\d{2}-\d{6}$/', $ref) || !preg_match('/^[0-9a-f]{32}$/', $jeton)) $sortir(['ok' => false, 'error' => 'Lien de suivi incomplet.'], 400);
$db = lm_db(); if (!$db) $sortir(['ok' => false, 'error' => 'Service momentanément indisponible.'], 500);
$d = lm_ligne($db, 'SELECT * FROM lm_dossiers WHERE reference = ?', 's', [$ref]);
if (!$d || !hash_equals((string) $d['jeton'], $jeton)) { usleep(400000); $sortir(['ok' => false, 'error' => 'Dossier introuvable : vérifiez le lien reçu par e-mail.'], 404); }
$id = (int) $d['id'];

if ($post) {
  $a = (string) ($in['action'] ?? '');
  if ($a === 'stop') {
    lm_maj($db, $id, ['consent_relance' => 0, 'prochaine_relance' => null]);
    lm_journal($db, $id, 'relance', 'Le dirigeant a demandé à ne plus recevoir de relances (lien de suivi)');
    $sortir(['ok' => true, 'message' => 'C’est noté : vous ne recevrez plus de relances. Votre dossier reste consultable ici.']);
  }
  if ($a === 'rappel') {
    $tel = lm_txt($in['telephone'] ?? '', 40); $cr = lm_txt($in['creneau'] ?? '', 40);
    if (strlen(preg_replace('/\D/', '', $tel)) < 10) $sortir(['ok' => false, 'error' => 'Indiquez un numéro de téléphone (10 chiffres).'], 400);
    if (empty($in['consentement'])) $sortir(['ok' => false, 'error' => 'Votre accord est nécessaire pour être rappelé.'], 400);
    if ($d['statut'] === 'cloture') $sortir(['ok' => false, 'error' => 'Ce dossier est clôturé : faites une nouvelle demande depuis le portail.'], 400);
    if ((int) $d['rappel_demande'] === 1) $sortir(['ok' => true, 'message' => 'Votre demande de rappel est déjà enregistrée.']);
    /* règle : un rappel demandé fixe l'échéance à 24 h ouvrées ; un abandonniste devient chaud */
    $niv = $d['niveau'] === 'abandonniste' ? 'chaud' : (string) $d['niveau'];
    $maj = ['telephone' => $tel, 'rappel_demande' => 1, 'maj_le' => lm_maintenant(), 'niveau' => $niv, 'echeance' => lm_echeance($niv, lm_maintenant(), true), 'alerte_sla_le' => null, 'prochaine_relance' => null];
    if ($niv !== $d['niveau']) $maj['niveau_le'] = lm_maintenant();
    lm_maj($db, $id, $maj);
    lm_journal($db, $id, 'rappel', 'Le dirigeant demande à être rappelé' . ($cr !== '' ? ' (' . $cr . ')' : '') . ' depuis son suivi' . ($d['niveau'] === 'abandonniste' ? ' — niveau relevé : Abandonniste → Chaud' : '') . ' ; rappel sous 24 h ouvrées');
    $u = lm_user($db, $d['user_id'] ? (int) $d['user_id'] : null);
    lm_email($db, $id, 'interne_rappel', (string) ($u['email'] ?? ''), 'Demande de rappel : ' . ($d['raison_sociale'] ?: $d['reference']), "Le dirigeant demande à être rappelé au " . $tel . ($cr !== '' ? ' (' . $cr . ')' : '') . ".\n\n" . lm_resume_interne($db, lm_dossier($db, $id) ?? $d));
    $sortir(['ok' => true, 'message' => 'Merci. Un expert Banque des Ressources Humaines vous rappelle sous 24 heures ouvrées.']);
  }
  $sortir(['ok' => false, 'error' => 'Action inconnue.'], 400);
}

$cr = lm_cr($db, $d['cr_code']); $u = lm_user($db, $d['user_id'] ? (int) $d['user_id'] : null);
$j = json_decode((string) $d['jalons'], true) ?: ['depose' => $d['cree_le']];
$etapes = [];
foreach (LM_STATUTS as $k => $lib) $etapes[] = ['code' => $k, 'lib' => $lib, 'date' => $j[$k] ?? null, 'courant' => $d['statut'] === $k];
$vol = [];
foreach ((json_decode((string) $d['volets'], true) ?: []) as $f => $x) if (isset(LM_FILIALES[$f])) $vol[] = ['lib' => LM_FILIALES[$f]['lib'], 'statut' => LM_VOLET_STATUTS[$x['statut'] ?? ''] ?? ''];
$interloc = in_array($d['statut'], ['depose', 'attribue'], true) ? null : ($d['conseiller_pro'] ? ['nom' => $d['conseiller_pro'], 'role' => 'Conseiller professionnel'] : ($u ? ['nom' => $u['nom'], 'role' => 'Expert Banque des Ressources Humaines'] : null));
$MSG = ['ultra_chaud' => 'Votre expert vous rappelle pour finaliser votre devis.', 'chaud' => 'Reprenez votre devis là où vous l’avez laissé, ou demandez à être rappelé.', 'abandonniste' => 'Retrouvez le résultat de votre simulation et passez à l’étape suivante quand vous le souhaitez.'];
$sortir(['ok' => true, 'dossier' => [
  'reference' => $d['reference'], 'cree_le' => $d['cree_le'], 'raison_sociale' => $d['raison_sociale'], 'prenom' => $d['prenom'], 'statut' => $d['statut'], 'statut_lib' => LM_STATUTS[$d['statut']],
  'issue' => $d['issue'] ? (LM_ISSUES[$d['issue']] ?? '') : null, 'etapes' => $etapes, 'caisse' => $cr ? 'Crédit Agricole ' . $cr['nom'] : null, 'interlocuteur' => $interloc,
  'rdv_le' => $d['rdv_le'], 'solutions' => array_values(array_map(static fn($s) => LM_SOLUTIONS[$s] ?? $s, array_filter(explode(',', (string) $d['solutions'])))), 'volets' => $vol,
  'message' => $d['statut'] === 'cloture' ? 'Votre dossier est clôturé. Merci de votre confiance.' : $MSG[$d['niveau']], 'resultat' => $d['niveau'] === 'abandonniste' ? $d['resultat'] : null,
  'peut_rappel' => $d['statut'] !== 'cloture' && !(int) $d['rappel_demande'] && $d['niveau'] !== 'ultra_chaud', 'relances' => (int) $d['consent_relance'] === 1,
  'reprise' => $d['niveau'] === 'chaud' ? 'devis.html' : ($d['niveau'] === 'abandonniste' ? ($d['origine'] === 'label_resultats' ? 'label-brh.html' : 'diagnostic.html') : null)]]);
