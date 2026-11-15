<?php
/* Module LM 2.0 — 15/11/2026 · modèle de configuration du lead management simplifié (cockpitbrh.monsitedetest.com) : base, administrateur, sites, envoi des e-mails (SMTP), IA, SMS simulé · historique : VERSIONS.md */
/* ============================================================================
   config.example.php → à copier en  config.php  sur le serveur du module, puis à compléter.
   NE JAMAIS COMMITTER config.php (identifiants, mots de passe, clés) : il est exclu par .gitignore et bloqué par .htaccess.
   Obligatoires : DB_*, LM_ADMIN_*, LM_SITE_URL. Tout le reste est facultatif.
   ============================================================================ */

/* ---------- base MySQL (la même que celle des sites en mode « base partagée ») ---------- */
const DB_HOST = 'localhost';
const DB_NAME = 'u000000000_brh';
const DB_USER = 'u000000000_brh';
const DB_PASS = '';                       // à renseigner sur le serveur uniquement

/* ---------- administrateur (Business Owner) : 10 caractères au moins ----------
   Les experts BRH se connectent avec leur e-mail professionnel et le mot de passe que vous leur donnez dans
   Administration → Annuaire (fiche de l'expert, champ « Mot de passe de la console »). */
const LM_ADMIN_LOGIN    = 'admin-brh';
const LM_ADMIN_PASSWORD = '';             // à renseigner

/* ---------- adresses ---------- */
const LM_SITE_URL = 'https://cockpitbrh.monsitedetest.com';     // liens des e-mails : fiche du lead, accès ponctuel, « Mon dossier »
const LM_SITES = [                                              // sites branchés (mode navigateur)
  'S' => 'https://protobrh.monsitedetest.com',
  'A' => 'https://protobrha.monsitedetest.com',
  'B' => 'https://protobrhb.monsitedetest.com',
  'C' => 'https://protobrhc.monsitedetest.com',
];
const LM_VERSIONS = ['S', 'A', 'B', 'C'];

/* ---------- mode relais : une clé secrète par site (48 caractères conseillés ; 24 au moins) ----------
   Générer : php -r "echo bin2hex(random_bytes(24)), PHP_EOL;" — la même clé va dans le config.php du site (LM_HUB_CLE). */
const LM_CLES = [
  // 'clé-du-site-S' => 'S',
  // 'clé-du-site-A' => 'A',
  // 'clé-du-site-B' => 'B',
  // 'clé-du-site-C' => 'C',
];

/* ---------- envoi réel des e-mails (§ 7.4 du cahier des charges) ----------
   L'envoi se pilote dans la console : Administration → Envoi des e-mails (désactivé par défaut).
   Ici seulement les identifiants techniques de la boîte contact@monsitedetest.com (hPanel → E-mails) :
   Hostinger : smtp.hostinger.com, port 465 (ssl) ou 587 (tls). Laisser LM_SMTP_HOST vide = fonction mail() de PHP. */
const LM2_EMAIL_FROM = 'contact@monsitedetest.com';
const LM2_EMAIL_NOM  = 'Banque des RH – Lead management';
const LM_SMTP_HOST   = '';                // ex. 'smtp.hostinger.com'
const LM_SMTP_PORT   = 465;
const LM_SMTP_SECURE = 'ssl';             // 'ssl' (465) ou 'tls' (587)
const LM_SMTP_USER   = '';                // ex. 'contact@monsitedetest.com'
const LM_SMTP_PASS   = '';                // mot de passe de la boîte, sur le serveur uniquement
const LM2_TEST_DIRIGEANTS = '';           // RG-62 : adresse de test qui reçoit les e-mails destinés aux dirigeants des CR pilotes

/* ---------- IA : script d'appel et e-mail personnalisé (Mistral) ----------
   Sans clé, la console propose un script et des e-mails types (même structure, sans IA). */
const MISTRAL_API_KEY = '';
const MISTRAL_MODEL   = 'mistral-small-latest';

/* ---------- suivi du dirigeant et Universels ---------- */
const LM2_SMS_SIMULE     = true;          // prototype : aucun SMS envoyé, le code figure dans l'historique du dossier
const LM2_UNIVERSELS_URL = '';            // vide = espace Universels de démonstration du module

/* ---------- tâches planifiées ---------- */
const LM_CRON_TOKEN     = '';             // appel par adresse : https://…/lm-cron.php?jeton=…
const LM_TACHES_MINUTES = 10;             // tâches lancées au passage dans la console au plus toutes les N minutes

/* ---------- facultatif ----------
const LM_TABLE_LEADS        = 'leads';   // table des demandes écrite par les sites
const LM_FUSION_JOURS       = 60;        // RG-02 : regroupement des demandes d'un même dirigeant
const LM_RATTRAPAGE_JOURS   = 7;         // demandes non intégrées reprises par la tâche planifiée
const LM_ENVOIS_PAR_IP      = 30;        // mode navigateur : demandes par adresse IP et par heure
const BRH_LEADS_CONSERVATION_MOIS = 12;  // durée de conservation
*/
