<?php
// Cockpit BRH — modèle de configuration.
// Copier ce fichier en config.php directement sur Hostinger, dans le dossier du sous-domaine
// (public_html/cockpitbrh), jamais sur GitHub, puis remplacer les valeurs.
// Ce fichier ne contient que ce dont le cockpit a besoin : ni clé Mistral, ni clé Pappers.

// Base MySQL : les mêmes valeurs que dans le config.php de protobrh (les demandes y sont enregistrées).
const DB_HOST = 'localhost';
const DB_NAME = 'REMPLACER-NOM-DE-LA-BASE';
const DB_USER = 'REMPLACER-UTILISATEUR';
const DB_PASS = 'REMPLACER-MOT-DE-PASSE';

// Accès au cockpit : identifiant et mot de passe propres à l'équipe projet (au moins 12 caractères),
// différents de la porte d'accès des testeurs (ACCES_*).
const ADMIN_LOGIN    = 'REMPLACER-IDENTIFIANT-ADMIN';
const ADMIN_PASSWORD = 'REMPLACER-MOT-DE-PASSE-ADMIN';
