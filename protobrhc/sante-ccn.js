/* Version C 2.4 — 15/11/2026 · obligations santé par convention collective (150 IDCC, étude du 14/11/2026) dans le devis, l’audit mutuelle, le diagnostic, Julia et l’argumentaire · historique : VERSIONS.md */
/* ==============================================================
   COMPLÉMENTAIRE SANTÉ PAR CONVENTION COLLECTIVE (IDCC) — version C (protobrhc). MODIFIABLE ICI.
   Source : « Complémentaire santé : obligations de l'employeur par convention collective (IDCC) »,
   document de travail de David CHARRETIER du 14/11/2026 (150 conventions ; effectifs DARES 2020 ;
   textes lus via fiche-paie.fr, fédérations et assureurs). À FAIRE VALIDER par le juridique ou
   Crédit Agricole Assurances (arbitrage COPIL conformité) avant toute ouverture.
   Règle d'affichage (décision du 15/11/2026) :
     - au dirigeant : seules les conventions au statut « Confirmé », avec la mention « document de travail » ;
       pour les autres, le socle légal et « votre expert vérifie votre convention » ;
     - à l'expert (argumentaire de vente, demande transmise) : toutes les lignes, avec leur statut.
   Effets (lignes confirmées seulement) :
     Devis, étape 4 santé : encadré « Ce que prévoit votre convention », part employeur minimale imposée
       (options inférieures désactivées), famille incluse d'office quand la convention couvre les enfants
       ou les ayants droit ; le moteur du socle recalcule le prix.
     Audit mutuelle : vérifications « Convention », « Financement », « Ayants droit » comparées à la convention.
     Diagnostic : rappel dans la carte « Protéger » des solutions.
   Champs : i IDCC · b branche · n salariés 2020 · r régime santé de branche · e exigences au-delà du socle
            a ayants droit · o organismes · HDS · s statut · l texte de branche · c confirmé (1/0)
            rb régime de branche (1 oui, 0 non, null incertain) · p part employeur minimale en % (lignes confirmées)
            f « enfants » ou « famille » couverts d'office (lignes confirmées) · v points de vigilance
   ============================================================== */
(function () {
  'use strict';
  if (window.BRH_SANTE_CCN) return;
  var DATE = '14/11/2026';
  var CCN = [
    {"i":"3248","b":"Métallurgie","n":"1 553 500","r":"Oui, depuis le 01/01/2023","e":"Socle de l’annexe 9 supérieur au panier ; employeur ≥ 50 % ; tarif labellisé 1,28 % PMSS","a":"Au choix de l’entreprise","o":"Assureurs labellisés (Apicil-Aésio, Malakoff Humanis, AG2R) · HDS 2 %","s":"Confirmé","l":"https://uimm.lafabriquedelavenir.fr/wp-content/uploads/2022/12/2022-02-07_Accord-gouvernance-garanties-contributives-et-non-contributives-regime-protection-sociale-complementaire_consolidee_71.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1486","b":"Syntec (bureaux d’études)","n":"1 122 700","r":"Oui (accord 2015)","e":"Base + options ; employeur ≥ 50 % de la base ; nouvel accord du 27/05/2026 applicable après extension","a":"Enfants obligatoires","o":"Aésio, Harmonie, Malakoff Humanis · HDS 2 %","s":"Confirmé","l":"https://www.syntec-ingenierie.fr/app/uploads/2026/06/Accord-du-27-mai-2026-accord-consolide-Copie-1.pdf","c":1,"rb":1,"p":50,"f":"enfants","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"16","b":"Transports routiers","n":"809 000","r":"Oui, marchandises (TRM) seulement","e":"1,40 % PMSS dont ≥ 0,70 % employeur (avenant 3, 2022) ; 1,60 % dont 0,90 % selon Carcept 2025","a":"Facultatifs","o":"Aucun recommandé (Carcept historique)","s":"Confirmé, taux à vérifier","l":"https://www.matmut.fr/pro/pdf/CCN-TRM-avenant-3-fevrier-2022.pdf","c":1,"rb":1,"p":50,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"2216","b":"Commerce à prédominance alimentaire","n":"747 300","r":"Non (prévoyance seulement)","e":"Socle","a":"—","o":"Offres commerciales seulement","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"1979","b":"Hôtels, cafés, restaurants","n":"646 000","r":"Oui, depuis 2011","e":"50 % d’un forfait mensuel non proratisé ; l’accord du 02/02/2023 (≈ 66 % employeur, HDS 2 %) n’agit qu’après extension","a":"Facultatifs","o":"Libre choix (contrat historique Klesia, Malakoff Humanis)","s":"Confirmé (2010), 2023 à vérifier","l":"https://fiche-paie.fr/convention-collective/hcr-1979/texte/kalitext000023406107","c":1,"rb":1,"p":50,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"3043","b":"Propreté","n":"534 300","r":"Oui, non-cadres","e":"Garanties supérieures au panier ; employeur 50 %","a":"Facultatifs","o":"AG2R · fonds social 2 %","s":"Confirmé (2016), cotisations à vérifier","l":"https://www.monde-proprete.com/sites/default/files/2022-12/circulaire%202015-10-S35%20complementaire%20sant%C3%A9%20-%20nouveaut%C3%A9s%20issues%20du%20contrat%20de%20garanties%20collectives.pdf","c":1,"rb":1,"p":50,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"1597","b":"Bâtiment ouvriers (plus de 10 salariés)","n":"477 600","r":"Non au national (échec de 2015)","e":"Socle ; ne pas confondre avec la prévoyance BTP","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1090","b":"Services de l’automobile","n":"476 000","r":"Oui (RPCS)","e":"Garanties supérieures au panier ; salarié ≤ 50 %","a":"Facultatifs","o":"IRP Auto · solidarité 1 € employeur + 1 € salarié","s":"Confirmé (avenant 74)","l":"https://www.matmut.fr/pro/pdf/CCN-AUTOMOBILE-Avenant-74-7juillet2015.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"413","b":"Établissements pour personnes inadaptées (CCN 66)","n":"475 600","r":"Oui (accord 66- CHRS du 02/10/2024)","e":"Base 1,65 % PMSS ; employeur 50 % de la cotisation isolé","a":"Facultatifs","o":"Aésio, AG2R, Apicil, Ociane Matmut, Harmonie- MGEN · HDS 2 %","s":"Confirmé, agrément à vérifier","l":"https://www.matmut.fr/pro/pdf/CCN-CHRS-Accord-Interbranche-2octobre2024.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"573","b":"Commerces de gros","n":"389 100","r":"Non (offre référencée seulement)","e":"Socle","a":"—","o":"AG2R référencé, pas recommandé","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"1596","b":"Bâtiment ouvriers (jusqu’à 10 salariés)","n":"377 400","r":"Non au national","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"29","b":"Hospitalisation à but non lucratif (CCN 51)","n":"360 400","r":"Oui (avenant 2015-01)","e":"Base 1 obligatoire ; employeur ≥ 50 %","a":"Facultatifs","o":"Harmonie, MGEN, Aésio, Malakoff Humanis, MNH, Ociane Matmut","s":"À vérifier","l":"https://www.matmut.fr/pro/pdf/CCN-1951-CG-obligatoire.pdf","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"2264","b":"Hospitalisation privée","n":"281 500","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1501","b":"Restauration rapide","n":"253 000","r":"Oui (accord du 03/02/2012)","e":"Employeur 50 % ; ancienneté de 6 mois du texte initial à revérifier","a":"Facultatifs","o":"Libre choix","s":"À vérifier","l":"https://www.matmut.fr/pro/pdf/CCN-RESTAURATION-RAPIDE-Accord-3fevrier2012.pdf","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"44","b":"Industries chimiques","n":"225 800","r":"Oui (cotisation plancher)","e":"≥ 1,50 % PMSS pour le salarié seul (0,82 % Alsace-Moselle), employeur ≥ 50 % ; avenant 4 du 02/09/2025","a":"Au choix","o":"Libre (contrat- cadre Malakoff Humanis, Mutex)","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/industries-chimiques-et-connexes-0044/texte/kalitext000053041327","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2120","b":"Banque","n":"220 100","r":"Non","e":"Socle ; accords d’entreprise","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2941","b":"Aide à domicile (BAD)","n":"215 600","r":"Oui (avenant 64/2024, étendu le 05/03/2025)","e":"Base 1,314 % PMSS ; employeur 58 %","a":"Facultatifs","o":"Choix de l’employeur après avis du CSE","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/aide-soins-services-a-domicile-2941/texte/kalitext000051315026","c":1,"rb":1,"p":58,"f":"","v":[]},
    {"i":"2609","b":"Bâtiment ETAM","n":"210 300","r":"Non au national","e":"Socle ; ETAM « article 36 » rattachés aux cadres","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1351","b":"Prévention et sécurité","n":"190 700","r":"Oui, accord non étendu","e":"50 % de 0,84 % PMSS (2013) ; oblige seulement les adhérents des signataires","a":"Facultatifs","o":"AG2R","s":"À vérifier","l":"https://fiche-paie.fr/convention-collective/prevention-et-securite-1351/texte/kalitext000028080396","c":0,"rb":1,"p":null,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire","régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"1518","b":"ÉCLAT (animation)","n":"190 000","r":"Oui (avenant 187, étendu en 2022)","e":"50/50 ; hors recommandés, employeur ≥ 0,47 % PMSS","a":"Facultatifs","o":"Aésio-Malakoff Humanis, Apicil- Mutami, Harmonie- MGEN, Umanens · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/eclat-education-culture-loisirs-animation-1518/texte/kalitext000045130163","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"3127","b":"Entreprises de services à la personne","n":"183 600","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2098","b":"Prestataires du tertiaire","n":"179 100","r":"Oui (accord du 25/09/2015)","e":"Socle R1 ; employeur ≥ 50 %","a":"Facultatifs","o":"Apicil-A2VIP (à vérifier) · HDS 2 %","s":"Confirmé","l":"https://www.matmut.fr/pro/pdf/CCN-prestataires-services-avenant-13-decembre-2021.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1527","b":"Immobilier","n":"175 900","r":"Oui (avenants 91 et 101)","e":"Employeur 55 % ; garanties supérieures au panier","a":"Obligatoires (conjoint sans revenu, enfants)","o":"Libre choix · HDS 2 %","s":"Confirmé","l":"https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000046100348","c":1,"rb":1,"p":55,"f":"famille","v":[]},
    {"i":"1702","b":"Travaux publics ouvriers","n":"174 800","r":"Non (FNTP)","e":"Socle","a":"—","o":"—","s":"Confirmé","l":"https://www.fntp.fr/?p=28575","c":1,"rb":0,"p":null,"f":"","v":[]},
    {"i":"787","b":"Experts- comptables","n":"167 700","r":"Non (accord de méthode 2025)","e":"Socle","a":"—","o":"—","s":"Confirmé (sources non officielles)","l":"","c":1,"rb":0,"p":null,"f":"","v":[]},
    {"i":"843","b":"Boulangerie artisanale","n":"163 400","r":"Oui","e":"1,60 % PMSS (64,08 € en 2026), 50/50 ; avenant 34 du 14/01/2026 non étendu","a":"Facultatifs","o":"Libre (désignation AG2R annulée)","s":"Confirmé, répartition à vérifier","l":"https://fiche-paie.fr/convention-collective/boulangerie-patisserie-artisanale-0843/texte/kalitext000054066517","c":1,"rb":1,"p":50,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"1672","b":"Sociétés d’assurances","n":"145 700","r":"Non (régime RAMA des retraités seulement)","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"1517","b":"Commerce de détail non alimentaire","n":"143 100","r":"Oui (accord du 22/06/2015)","e":"Base supérieure au panier ; employeur ≥ 50 %","a":"Facultatifs","o":"Aucun depuis 2021 · HDS 2 %","s":"Confirmé","l":"https://www.matmut.fr/pro/pdf/CCN-COMMERCES-DETAIL-NON-ALIMENTAIRES-avenant-7-9-juillet-2020.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1996","b":"Pharmacie d’officine","n":"132 000","r":"Oui (RPO)","e":"Garanties supérieures au panier ; employeur ≥ 50 % selon Klesia","a":"Famille à charge couverte (à vérifier)","o":"Klesia · HDS 2 % + forfaits","s":"HDS confirmé, reste à vérifier","l":"https://fiche-paie.fr/convention-collective/pharmacie-d-officine-1996/texte/kalitext000053497442","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"292","b":"Plasturgie","n":"116 800","r":"Non identifié","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2420","b":"Bâtiment cadres","n":"111 300","r":"Non au national","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"675","b":"Succursales d’habillement","n":"109 700","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2596","b":"Coiffure","n":"105 700","r":"Oui (avenant 11 de 2008, avenant 9 du 12/03/2025)","e":"Employeur ≥ 59 % de la cotisation famille","a":"Enfants obligatoires","o":"Incertain · fonds social","s":"Confirmé (part et enfants)","l":"https://adpassurances.fr/fileadmin/user_upload/Avenant_N7_CCN_Coiffure.pdf","c":1,"rb":1,"p":59,"f":"enfants","v":[]},
    {"i":"1266","b":"Restauration de collectivités","n":"96 000","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1606","b":"Bricolage","n":"85 000","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"86","b":"Publicité","n":"74 000","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"3109","b":"Industries alimentaires diverses","n":"70 900","r":"Incertain (accord de 2014 selon AG2R)","e":"Non vérifié","a":"—","o":"AG2R référencé","s":"À vérifier","l":"","c":0,"rb":null,"p":null,"f":"","v":[]},
    {"i":"3032","b":"Esthétique- cosmétique","n":"57 100","r":"Oui (accord du 07/10/2015)","e":"Base 1,28 % PMSS ; employeur 50 %","a":"Facultatifs","o":"Apicil · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/esthetique-cosmetique-3032/texte/kalitext000031915604","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"3254","b":"Boucherie (ex- 992)","n":"50 000","r":"Oui (avenant 61 de 2019)","e":"Garanties nettement supérieures au panier ; 40 € par mois partagés 50/50 (2020)","a":"Facultatifs","o":"Libre choix · HDS 2 %","s":"À vérifier (nouvelle CCN 3254)","l":"https://www.adpassurances.fr/fileadmin/user_upload/Avenant_n61_-_CCN_Boucherie.pdf","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"478","b":"Sociétés financières","n":"46 700","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1000","b":"Cabinets d’avocats","n":"36 100","r":"Oui, accord non étendu","e":"Employeur ≥ 50 % (au-dessus selon FO)","a":"Ayants droit à charge couverts","o":"Kerialis (ex- CREPA, désignée en 2013)","s":"À vérifier","l":"https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000027750882","c":0,"rb":1,"p":null,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"7024","b":"Production agricole et CUMA","n":"non publié","r":"Oui, non-cadres","e":"Employeur ≥ 50 % ; socle 45,30 € par adulte (07/2024)","a":"Au choix de l’entreprise","o":"Agri Prévoyance (Agrica)","s":"Confirmé","l":"https://statics.groupagrica.com/public/fileadmin/mediatheque/documents/Entreprises/Accords/82043_CG_ACCORD_NATIONAL_SANTE_BD.pdf","c":1,"rb":1,"p":50,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"7018","b":"Entreprises du paysage","n":"non publié","r":"Oui, toutes catégories","e":"Ouvriers et employés : 0,85 % + 0,57 % PMSS (≈ 60 % employeur)","a":"Obligatoires sauf dispense","o":"Agrica","s":"Confirmé (ouvriers et employés)","l":"https://statics.groupagrica.com/agriprev/public/2026-04/260414_Agrica_paysage_Offre_ouvriers_employes_2.pdf","c":1,"rb":1,"p":60,"f":"famille","v":[]},
    {"i":"3217","b":"Ferroviaire","n":"154 400","r":"Oui (accord du 23/09/2025, étendu le 16/12/2025)","e":"Employeur 55 % ; garanties supérieures au panier ; mise en conformité au plus tard le 01/01/2027","a":"Facultatifs","o":"—","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/branche-ferroviaire-3217/texte/kalitext000053320843","c":1,"rb":1,"p":55,"f":"","v":[]},
    {"i":"2511","b":"Sport","n":"136 900","r":"Oui (accord du 06/11/2015, étendu)","e":"Employeur ≥ 50 % ; salarié isolé 0,96 % PMSS depuis le 01/07/2025","a":"Facultatifs","o":"Aucun recommandé depuis 2019 · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/sport-2511/texte/kalitext000041686266","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"176","b":"Industrie pharmaceutique","n":"130 700","r":"Oui (accord du 09/07/2015, étendu)","e":"Employeur 60 % ; cotisation unique famille","a":"Obligatoires","o":"APGIS · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/industrie-pharmaceutique-0176/texte/kalitext000031490691","c":1,"rb":1,"p":60,"f":"famille","v":[]},
    {"i":"1505","b":"Commerce de détail fruits, légumes, épicerie","n":"124 900","r":"Oui (accord du 19/05/2021, étendu)","e":"Employeur ≥ 50 % ; base 1,51 % PMSS","a":"Facultatifs","o":"Aucun nommé","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/commerce-de-detail-alimentaire-non-specialise-1505/texte/kalitext000044085780","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1147","b":"Cabinets médicaux","n":"115 500","r":"Non trouvé","e":"Socle (textes de prévoyance seulement)","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"1516","b":"Organismes de formation","n":"102 800","r":"Oui (accord du 19/11/2015, étendu)","e":"Employeur ≥ 50 % ; niveau 1 à 1,49 % PMSS en 2026 (avenant du 24/10/2025 non étendu)","a":"Au choix de l’entreprise","o":"AG2R, Apicil, Malakoff Humanis, Harmonie · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/organismes-de-formation-1516/texte/kalitext000032489240","c":1,"rb":1,"p":50,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"2148","b":"Télécommunications","n":"102 000","r":"Oui (accord du 26/06/2014, étendu)","e":"Employeur ≥ 55 % ; prestations minimales fixées par la branche","a":"Au choix de l’entreprise","o":"Libre choix","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/telecommunications-2148/texte/kalitext000029732125","c":1,"rb":1,"p":55,"f":"","v":[]},
    {"i":"3218","b":"Enseignement privé non lucratif","n":"94 600","r":"Oui (régime EEP Santé, accord du 18/06/2015 révisé en 2022)","e":"Régime de référence opposable ; détail non lu","a":"—","o":"Non lu","s":"À vérifier","l":"","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"2614","b":"Travaux publics ETAM","n":"94 500","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1404","b":"Matériels agricoles, BTP, manutention (SDLM)","n":"89 900","r":"Oui (accord du 02/07/2015, étendu)","e":"Employeur 50 %, y compris sur les extensions rendues obligatoires","a":"Au choix de l’entreprise","o":"Malakoff Humanis, Apicil · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/materiels-agricoles-tp-manutention-sdlm-1404/texte/kalitext000031496566","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"275","b":"Transport aérien, personnel au sol","n":"82 400","r":"Non trouvé","e":"Socle (prévoyance seulement)","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"3216","b":"Négoce des matériaux de construction","n":"75 800","r":"Incertain","e":"Principe posé par la CCN (art. 1.28), aucun accord trouvé","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":null,"p":null,"f":"","v":[]},
    {"i":"1261","b":"ALISFA (lien social et familial)","n":"73 800","r":"Oui (avenant 02-15, étendu)","e":"Employeur 50 % de la cotisation isolé ; 60 % prévu par l’avenant 01-25 non étendu","a":"Facultatifs","o":"Aésio, Apicil, Harmonie, Ociane Matmut, Solimut","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/acteurs-du-lien-social-et-familial-1261/texte/kalitext000053320415","c":1,"rb":1,"p":50,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"1043","b":"Gardiens, concierges, employés d’immeubles","n":"70 900","r":"Oui (accord du 06/12/2013, étendu)","e":"Employeur 55 % de la cotisation isolé","a":"Facultatifs","o":"Humanis (recommandation de 2013, à confirmer)","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/gardiens-concierges-employes-immeubles-1043/texte/kalitext000028900592","c":1,"rb":1,"p":55,"f":"","v":[]},
    {"i":"1557","b":"Articles de sport et équipements de loisirs","n":"70 200","r":"Non trouvé","e":"Socle (prévoyance seulement)","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"1686","b":"Audiovisuel, électronique, équipement ménager","n":"67 300","r":"Oui (accord du 13/04/2017, étendu)","e":"Employeur 50 % ; tableau de prestations de branche","a":"Facultatifs","o":"Aucun","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/commerces-audiovisuel-electronique-equipement-menager-1686/texte/kalitext000036026086","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1880","b":"Négoce de l’ameublement","n":"66 300","r":"Oui (accord du 30/06/2015)","e":"Employeur 60 % ; garanties supérieures au panier","a":"Facultatifs","o":"Libre choix","s":"Confirmé","l":"https://www.ag2rlamondiale.fr/documents/pdf/Conventions-Collectives-Nationales/ameublement-negoce/AG2R-LA-MONDIALE-ameublement-negoce-sante-accord-frais-de-sante.pdf","c":1,"rb":1,"p":60,"f":"","v":[]},
    {"i":"3212","b":"Travaux publics cadres","n":"62 600","r":"Non (FNTP)","e":"Socle","a":"—","o":"—","s":"Confirmé","l":"https://www.fntp.fr/foire-aux-questions-sur-la-complementaire-sante/","c":1,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1483","b":"Commerce de détail habillement et textiles","n":"62 300","r":"Oui (accord du 19/10/2021, étendu)","e":"Employeur ≥ 50 % ; base 1,26 % PMSS (2025)","a":"Facultatifs","o":"Harmonie, Aésio · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/commerce-detail-habillement-textile-1483/texte/kalitext000045177680","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2205","b":"Notariat","n":"61 900","r":"Oui (accord du 09/09/2015, indiqué non étendu)","e":"Employeur 50 % ; 2,27 % PMSS isolé, 3,44 % famille (2026)","a":"Obligatoires","o":"APGIS","s":"Confirmé, extension à vérifier","l":"https://fiche-paie.fr/convention-collective/notariat-2205/texte/kalitext000031522338","c":1,"rb":1,"p":50,"f":"famille","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"2691","b":"Enseignement privé indépendant","n":"59 500","r":"Oui (accord du 27/11/2023, étendu en 2025)","e":"Employeur ≥ 50 % de la cotisation isolé ; niveau A 0,98 % PMSS (2024)","a":"Facultatifs","o":"Malakoff Humanis, Harmonie · HDS 3 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/enseignement-prive-independant-2691/texte/kalitext000050298710","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1424","b":"Transports urbains de voyageurs","n":"59 000","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1555","b":"Produits pharmaceutiques et vétérinaires (fabrication, commerce)","n":"36 700","r":"Oui (accord du 14/12/2016, étendu)","e":"Régime minimum supérieur au panier ; part employeur cadres supérieure à 50 %","a":"Obligatoires","o":"APGIS · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/fabrication-et-du-commerce-des-produits-a-usage-1555/texte/kalitext000034673021","c":1,"rb":1,"p":50,"f":"famille","v":[]},
    {"i":"1586","b":"Salaison, charcuterie en gros","n":"35 800","r":"Incertain (accord de 2014 selon AG2R, absent des textes)","e":"—","a":"—","o":"AG2R","s":"À vérifier","l":"","c":0,"rb":null,"p":null,"f":"","v":[]},
    {"i":"1480","b":"Journalistes","n":"35 300","r":"Oui, pigistes seulement (avenant du 24/09/2015, étendu)","e":"Pigistes : employeur 0,40 % de chaque pige ; permanents : socle","a":"—","o":"Audiens","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/journalistes-1480/texte/kalitext000032080934","c":1,"rb":1,"p":50,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"637","b":"Récupération","n":"34 800","r":"Oui (date de l’accord non trouvée)","e":"Base obligatoire cadres et non- cadres depuis le 01/01/2026","a":"Facultatifs","o":"Malakoff Humanis","s":"À vérifier","l":"https://www.malakoffhumanis.com/solutions/conventions-collectives/recuperation-industries-commerce","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"2156","b":"Grands magasins et magasins populaires","n":"34 300","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1388","b":"Industrie du pétrole","n":"34 200","r":"Non trouvé","e":"Socle (prévoyance seulement)","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"2002","b":"Blanchisserie, teinturerie, nettoyage","n":"33 700","r":"Oui (accord du 23/07/2015, étendu)","e":"Employeur 50 % ; cotisation minimale et garanties de branche","a":"Facultatifs","o":"Non mentionnés","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/blanchisserie-pressing-location-de-linge-2002/texte/kalitext000031490487","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1512","b":"Promotion immobilière","n":"33 000","r":"Oui (accord du 23/10/2024, étendu)","e":"Employeur 55 % ; base 2,60 % PMSS (salarié et enfants)","a":"Enfants obligatoires","o":"Apicil, Malakoff Humanis · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/promotion-immobiliere-1512/texte/kalitext000050792995","c":1,"rb":1,"p":55,"f":"enfants","v":[]},
    {"i":"3210","b":"Banque populaire","n":"33 000","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2528","b":"Maroquinerie","n":"30 900","r":"Oui (accord du 07/04/2015, étendu)","e":"Employeur 50 % ; cotisation minimale","a":"Facultatifs","o":"Libre choix","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/industries-de-la-maroquinerie-articles-de-voyage-chasse-2528/texte/kalitext000031123652","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1487","b":"Horlogerie- bijouterie (détail)","n":"30 100","r":"Oui (accord du 10/07/2025, effet 01/01/2026, étendu)","e":"Employeur 50 % de la base","a":"Facultatifs","o":"Libre choix · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/horlogerie-bijouterie-commerce-de-detail-1487/texte/kalitext000053401705","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1794","b":"Institutions de retraite complémentaire","n":"29 400","r":"Incertain (accord de 2009 plus en vigueur)","e":"—","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":null,"p":null,"f":"","v":[]},
    {"i":"1710","b":"Agences de voyages et de tourisme","n":"28 900","r":"Oui (accord de 2015)","e":"50/50 ; pour la famille, l’employeur verse le même montant en euros","a":"Facultatifs","o":"AG2R · HDS 2 %","s":"Confirmé","l":"https://www.ag2rlamondiale.fr/documents/pdf/Conventions-Collectives-Nationales/Agences-de-voyage/AG2R-LA-MONDIALE-sante-accord-21-octobre-2015.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2335","b":"Agences générales d’assurances","n":"27 700","r":"Oui (accord du 24/06/2015, étendu)","e":"Garanties supérieures au panier ; employeur ≥ 50 %","a":"—","o":"Aucun recommandé","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/agences-generales-assurances-2335/texte/kalitext000031254619","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1412","b":"Aéraulique, frigorifique et thermique","n":"27 300","r":"Oui (accord du 03/07/2025, étendu)","e":"Employeur ≥ 50 % ; tableau de branche + prévention","a":"Au choix de l’entreprise","o":"Libre choix · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/installation-aeraulique-thermique-frigorifique-1412/texte/kalitext000052482993","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1938","b":"Transformation des volailles","n":"27 200","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1285","b":"Entreprises artistiques et culturelles","n":"27 000","r":"Oui (avenant de 2015, étendu ; accord du 30/01/2026 non étendu)","e":"Accord 2026 : 0,81 % PMSS, employeur ≥ 50 % ; intermittents exclus","a":"—","o":"Aucun","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/entreprises-artistiques-et-culturelles-1285/texte/kalitext000054370607","c":1,"rb":1,"p":50,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire","régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"2372","b":"Distribution directe","n":"27 000","r":"Oui (avenant n° 29 de 2014, étendu)","e":"Base ≤ 1,02 % PMSS, 50/50 ; affiliation après 6 mois","a":"Facultatifs","o":"Libre choix","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/distribution-directe-2372/texte/kalitext000029217612","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1978","b":"Fleuristes et animaux familiers","n":"24 900","r":"Oui (accord du 13/06/2022, étendu)","e":"Employeur ≥ 0,755 % PMSS (avenant 2 non étendu) ; assistance et téléconsultation","a":"Facultatifs","o":"Libre choix · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/fleuristes-animaux-familiers-1978/texte/kalitext000046314066","c":1,"rb":1,"p":50,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"759","b":"Pompes funèbres","n":"24 400","r":"Oui (accord du 17/05/2016, étendu)","e":"Cotisation ≥ 1,14 % PMSS, au moins 50/50 ; garanties supérieures au panier","a":"Facultatifs","o":"Libre choix","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/pompes-funebres-0759/texte/kalitext000033136463","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2046","b":"Centres de lutte contre le cancer","n":"23 800","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1383","b":"Quincaillerie, employés (CCN 3243)","n":"22 800","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"669","b":"Fabrication mécanique du verre","n":"22 500","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"783","b":"CHRS (accord 66- CHRS)","n":"22 200","r":"Oui (accord du 02/10/2024, sous agrément)","e":"Isolé 1,65 % PMSS, 50/50 ; garanties supérieures au panier","a":"Facultatifs","o":"Aésio, AG2R, Apicil, Ociane Matmut, Harmonie-MGEN · HDS 2 %","s":"Confirmé","l":"https://www.matmut.fr/pro/pdf/CCN-CHRS-Accord-Interbranche-2octobre2024.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1077","b":"Négoce des produits du sol, engrais","n":"20 200","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1930","b":"Transformation des grains","n":"19 800","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1875","b":"Cabinets et cliniques vétérinaires","n":"19 600","r":"Oui (accord du 14/10/2015, étendu)","e":"1,31 % PMSS, 50/50","a":"Facultatifs","o":"Libre choix · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/cabinets-et-cliniques-veterinaires-1875/texte/kalitext000031874219","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1760","b":"Jardineries et graineteries","n":"19 400","r":"Oui (accord du 01/09/2022, étendu)","e":"Socle de branche + option ; employeur ≥ 50 %","a":"Au choix de l’entreprise","o":"Aucun","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/jardineries-et-graineteries-1760/texte/kalitext000046737551","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1513","b":"Eaux embouteillées, boissons sans alcool, bière","n":"19 200","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"567","b":"Bijouterie, joaillerie, orfèvrerie (CCN 3251)","n":"18 800","r":"Oui (accord du 27/10/2020, étendu)","e":"Base 1,39 % PMSS ; employeur ≥ 50 %","a":"Facultatifs","o":"Harmonie, Aésio, Malakoff Humanis · 2 %","s":"Confirmé","l":"https://www.harmonie-mutuelle.fr/sites/default/files/2021-06/accord.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"897","b":"Services de santé au travail","n":"18 700","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1267","b":"Pâtisserie","n":"18 300","r":"Oui (avenant n° 109, étendu)","e":"1,56 % PMSS en 2026 ; employeur ≥ 50 %","a":"Facultatifs","o":"AG2R (offre)","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/patisserie-1267/texte/kalitext000050792959","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"500","b":"Commerces de gros habillement, chaussure, jouet","n":"17 800","r":"Oui (accord du 23/02/2016, étendu)","e":"1,44 % PMSS, 50/50","a":"Facultatifs","o":"AG2R (2016) · 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/commerces-de-gros-habillement-mercerie-chaussure-jouet-0500/texte/kalitext000032888143","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"953","b":"Charcuterie de détail","n":"17 700","r":"Oui (avenant n° 26 de 2015, étendu)","e":"Forfait 66 € par mois en 2026 ; employeur ≥ 50 %","a":"—","o":"Non nommé","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/charcuterie-de-detail-0953/texte/kalitext000054553948","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1408","b":"Distribution des énergies de proximité","n":"17 300","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2121","b":"Édition","n":"17 200","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"489","b":"Cartonnage","n":"16 100","r":"Oui (avenant n° 152 de 2015, étendu)","e":"Base 1,48 % PMSS, 50/50","a":"Facultatifs","o":"APGIS, Prodigéo · 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/cartonnage-0489/texte/kalitext000031873608","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"3017","b":"Ports et manutention","n":"15 900","r":"Non (accords locaux seulement)","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"1621","b":"Répartition pharmaceutique","n":"14 700","r":"Oui (accord du 12/01/2016, étendu)","e":"Cadres 1,61 %, non-cadres 2,69 % ; employeur ≥ 50 %","a":"Enfants obligatoires","o":"APGIS · 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/repartition-pharmaceutique-1621/texte/kalitext000032594072","c":1,"rb":1,"p":50,"f":"enfants","v":["régime limité à une partie des salariés : vérifier la population couverte"]},
    {"i":"2642","b":"Production audiovisuelle","n":"14 700","r":"Incertain (accord interbranches de 2006)","e":"—","a":"—","o":"Audiens","s":"À vérifier","l":"","c":0,"rb":null,"p":null,"f":"","v":[]},
    {"i":"3222","b":"Menuiseries et charpentes industrialisées","n":"14 400","r":"Non","e":"Socle","a":"—","o":"—","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/menuiseries-charpentes-constructions-industrialisees-3222","c":1,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2257","b":"Casinos","n":"14 300","r":"Oui (avenant n° 14, étendu)","e":"Isolé 50/50 ; ouverture après 3 mois","a":"Facultatifs","o":"Recommandation actuelle non trouvée","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/casinos-2257/texte/kalitext000027206649","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2190","b":"Missions locales","n":"14 000","r":"Oui (avenant n° 74, étendu en 2023)","e":"2,058 % PMSS isolé en 2026 ; employeur ≥ 50 %","a":"Obligatoires","o":"Harmonie (selon l’assureur)","s":"À vérifier","l":"https://fiche-paie.fr/convention-collective/missions-locales-paio-2190/texte/kalitext000048214229","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"1909","b":"Organismes de tourisme","n":"13 800","r":"Oui (accord du 15/09/2015, étendu)","e":"Base 50/50","a":"Facultatifs","o":"Apicil (selon l’assureur) · HDS ≥ 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/organismes-de-tourisme-1909/texte/kalitext000031521998","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1536","b":"Distributeurs conseils hors domicile","n":"13 600","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"454","b":"Remontées mécaniques","n":"13 400","r":"Oui, au niveau du socle légal","e":"Socle","a":"—","o":"—","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/remontees-mecaniques-et-domaines-skiables-0454","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"468","b":"Succursales de chaussure","n":"13 400","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"993","b":"Prothésistes dentaires","n":"13 400","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2272","b":"Assainissement et maintenance industrielle","n":"13 300","r":"Oui (accord du 06/10/2015, étendu)","e":"Employeur ≥ 50 % ; taux figés jusqu’au 31/12/2026","a":"Obligatoires","o":"Assureur référencé non nommé","s":"À vérifier","l":"https://fiche-paie.fr/convention-collective/assainissement-et-de-la-maintenance-industrielle-2272/texte/kalitext000031985083","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"1504","b":"Poissonnerie","n":"13 200","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2583","b":"Sociétés d’autoroutes","n":"13 200","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1631","b":"Hôtellerie de plein air","n":"13 100","r":"Oui (accord du 03/07/2015, étendu)","e":"Employeur ≥ 50 % de la cotisation globale ; base 1,10 % PMSS","a":"Facultatifs","o":"Malakoff Humanis · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/hotellerie-de-plein-air-1631/texte/kalitext000031284609","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2543","b":"Géomètres-experts","n":"12 400","r":"Oui (accord du 03/06/2010, étendu)","e":"Régime minimum ; part employeur actuelle non lue","a":"Enfants obligatoires","o":"Recommandation actuelle non trouvée","s":"À vérifier","l":"https://fiche-paie.fr/convention-collective/geometres-experts-et-topographes-2543/texte/kalitext000038337460","c":0,"rb":1,"p":null,"f":"","v":[]},
    {"i":"2060","b":"Chaînes de cafétérias","n":"12 100","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2683","b":"Portage de presse","n":"12 100","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"3219","b":"Portage salarial","n":"11 800","r":"Oui (accord du 12/11/2020, étendu)","e":"Employeur ≥ 50 % de la cotisation isolé","a":"Facultatifs","o":"Klesia · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/portage-salarial-3219/texte/kalitext000043458253","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"915","b":"Expertises et évaluations","n":"11 700","r":"Non","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"3090","b":"Spectacle vivant privé","n":"11 600","r":"Oui (accord du 19/07/2024, étendu)","e":"1,44 % PMSS en 2026, en hausse jusqu’en 2028 ; employeur ≥ 50 % ; hors intermittents","a":"—","o":"Aucun nommé · HDS ≥ 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/spectacle-vivant-prive-3090/texte/kalitext000050394834","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1286","b":"Confiserie, chocolaterie, biscuiterie (détail)","n":"11 200","r":"Oui (avenant n° 15 de 2008, étendu)","e":"Salarié 1,48 % PMSS ; employeur ≥ 50 %","a":"—","o":"Libre choix","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/detaillants-confiserie-chocolaterie-biscuiterie-1286/texte/kalitext000051367186","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2931","b":"Activités de marchés financiers","n":"10 600","r":"Oui (avenant n° 5 de 2024, étendu)","e":"50/50 y compris la famille ; 1,59 % PMSS isolé","a":"Obligatoires","o":"Apicil · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/activites-de-marches-financiers-2931/texte/kalitext000051019541","c":1,"rb":1,"p":50,"f":"famille","v":[]},
    {"i":"1307","b":"Exploitation cinématographique","n":"8 100","r":"Oui (accord du 16/09/2015, étendu)","e":"Socle ; employeur 50 %","a":"Facultatifs","o":"Libre choix","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/exploitation-cinematographique-1307/texte/kalitext000032073944","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"538","b":"Manutention ferroviaire","n":"8 000","r":"Oui (accord du 29/06/2015)","e":"Non-cadres ; 1,36 % PMSS, 50/50","a":"Facultatifs","o":"Carcept · HDS 2 %","s":"Confirmé","l":"https://www.carcept-prev.fr/sites/carcept/files/media/documents/2019/05/accord-29-juin-2015-manut-ferroviaire.pdf","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1611","b":"Communication écrite directe","n":"7 900","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1316","b":"Tourisme social et familial","n":"7 800","r":"Oui (accord du 22/11/2021, étendu)","e":"Employeur 60 %","a":"Enfants obligatoires","o":"Malakoff Humanis, Harmonie, Umanens · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/tourisme-social-et-familial-1316/texte/kalitext000045204578","c":1,"rb":1,"p":60,"f":"enfants","v":[]},
    {"i":"731","b":"Quincaillerie, cadres","n":"7 700","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1589","b":"Mareyeurs- expéditeurs","n":"7 700","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1605","b":"Désinfection, dératisation (3D)","n":"7 700","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2219","b":"Taxis","n":"7 700","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1947","b":"Négoce de bois d’œuvre","n":"7 400","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2728","b":"Sucreries et raffineries","n":"7 400","r":"Oui (avenant n° 7 de 2014, étendu)","e":"Employeur ≥ 60 %","a":"—","o":"Libre choix","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/sucreries-2728/texte/kalitext000029358770","c":1,"rb":1,"p":60,"f":"","v":[]},
    {"i":"1256","b":"Équipements thermiques, cadres","n":"7 300","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"3233","b":"Fabrication des ciments","n":"7 200","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1558","b":"Industries céramiques","n":"7 100","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1580","b":"Industrie de la chaussure","n":"7 000","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"405","b":"Médico-social UNISSS","n":"6 700","r":"Oui, accord non étendu","e":"Isolé 1,56 % PMSS, 50/50","a":"Facultatifs","o":"Harmonie, Aésio · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/etablissements-medico-sociaux-de-l-union-intersyndicale-des-0405/texte/kalitext000041787482","c":1,"rb":1,"p":50,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"200","b":"Exploitations frigorifiques","n":"6 600","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2564","b":"Vétérinaires praticiens salariés","n":"6 400","r":"Oui (accord du 14/10/2015, étendu)","e":"1,31 % PMSS, 50/50","a":"Facultatifs","o":"AG2R, Uniprévoyance (jusqu’au 31/12/2026) · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/veterinaires-praticiens-salaries-2564/texte/kalitext000031874257","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"1679","b":"Inspection d’assurance","n":"6 300","r":"Oui, accord non étendu (régime RPP)","e":"Financement majoritairement patronal","a":"Obligatoires","o":"—","s":"À vérifier","l":"","c":0,"rb":1,"p":null,"f":"","v":["accord non étendu ou en attente d’extension : il ne s’impose qu’aux entreprises adhérentes d’une organisation signataire"]},
    {"i":"2021","b":"Golf","n":"6 000","r":"Oui (CCN, art. 11.3)","e":"1,20 % PMSS isolé ; employeur 50 %","a":"Au choix de l’entreprise","o":"APGIS référencé","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/golf-2021/texte/kalitext000054303900","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2328","b":"BTP ouvriers Guadeloupe","n":"5 900","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"2336","b":"Habitat et logement accompagnés","n":"5 900","r":"Oui (avenant n° 57, étendu)","e":"Socle familial 2,48 % PMSS ; employeur 50 % de la cotisation famille","a":"Obligatoires","o":"AG2R, Malakoff Humanis, Harmonie · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/habitat-et-du-logement-accompagnes-2336/texte/kalitext000045130020","c":1,"rb":1,"p":50,"f":"famille","v":[]},
    {"i":"3230","b":"Presse d’information spécialisée","n":"5 600","r":"Non trouvé","e":"Socle","a":"—","o":"—","s":"À vérifier","l":"","c":0,"rb":0,"p":null,"f":"","v":[]},
    {"i":"1951","b":"Expertises en automobile","n":"5 500","r":"Oui (avenant n° 56 de 2015, étendu)","e":"Cotisation familiale 2,54 % PMSS (2016), 50/50","a":"Obligatoires","o":"MACIF (2015) · HDS 2 %","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/cabinets-ou-entreprises-d-expertises-en-automobile-1951/texte/kalitext000032073801","c":1,"rb":1,"p":50,"f":"famille","v":[]},
    {"i":"3168","b":"Photographie","n":"5 400","r":"Oui (accord du 20/12/2013, étendu)","e":"Base 1,12 % PMSS, 50/50","a":"Facultatifs","o":"AG2R (2013)","s":"Confirmé","l":"https://fiche-paie.fr/convention-collective/professions-de-la-photographie-3168/texte/kalitext000028967638","c":1,"rb":1,"p":50,"f":"","v":[]},
    {"i":"2089","b":"Panneaux à base de bois","n":"5 000","r":"Non","e":"Socle","a":"—","o":"—","s":"Confirmé","l":"","c":1,"rb":0,"p":null,"f":"","v":[]}
  ];
  /* socle légal commun à tous les employeurs (service-public.fr, Code de la sécurité sociale) */
  var SOCLE = [
    'Tous les salariés couverts par une complémentaire santé collective et obligatoire (art. L. 911-7 du Code de la sécurité sociale)',
    'L’employeur finance au moins 50 % de la cotisation de la couverture minimale',
    'Panier de soins minimal : ticket modérateur, forfait journalier hospitalier, dentaire 125 % de la base, optique 100 € à 200 € tous les 2 ans',
    'Contrat « responsable » (100 % Santé), condition des exonérations sociales et fiscales ; portabilité jusqu’à 12 mois'
  ];
  var NOTE = 'Document de travail (étude du ' + DATE + '), à valider par le service juridique ou Crédit Agricole Assurances : votre expert Banque des RH confirme avec vous.';
  var INDEX = {}; CCN.forEach(function (c) { INDEX[c.i] = c; });
  function code(t) { var m = String(t == null ? '' : t).match(/^\s*(\d{1,4})\b/); return m ? String(+m[1]) : ''; }
  function pour(t) { return INDEX[code(t)] || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function famLib(f) { return f === 'enfants' ? 'enfants couverts d’office' : f === 'famille' ? 'conjoint et enfants (ayants droit) couverts d’office' : ''; }
  /* ce que le dirigeant peut voir : lignes confirmées seulement */
  function public_(c) {
    if (!c) return null;
    if (!c.c) return { idcc: c.i, branche: c.b, statut: 'à vérifier par l’expert BRH' };
    return { idcc: c.i, branche: c.b, statut: 'confirmé (document de travail)', regime_sante_branche: c.r, exigences: c.e,
             ayants_droit: c.a, organismes_hds: c.o, part_employeur_minimale: c.p ? c.p + ' %' : '', couverts_d_office: famLib(c.f), vigilance: c.v };
  }
  /* ce que reçoit l'expert : toute la ligne, statut compris */
  function expert(c) {
    if (!c) return null;
    return { idcc: c.i, branche: c.b, statut: c.s, regime_sante_branche: c.r, exigences: c.e, ayants_droit: c.a, organismes_hds: c.o,
             part_employeur_minimale: c.c && c.p ? c.p + ' %' : 'à vérifier', vigilance: c.v, texte: c.l, source: 'étude du ' + DATE + ' (document de travail)' };
  }
  /* résumé en une phrase (rappels du diagnostic, Julia) */
  function phrase(c) {
    if (!c || !c.c) return '';
    if (c.rb === 0) return 'Votre convention (IDCC ' + c.i + ' — ' + c.b + ') n’impose pas de régime santé de branche : le socle légal s’applique.';
    var l = [];
    if (c.rb === 1) l.push('régime santé de branche');
    if (c.p && c.p > 50) l.push('part employeur d’au moins ' + c.p + ' %');
    if (c.f) l.push(famLib(c.f));
    return l.length ? 'Votre convention (IDCC ' + c.i + ' — ' + c.b + ') : ' + l.join(', ') + '.' : '';
  }
  /* encadré du devis et de l'audit */
  function encadre(c, idTexte) {
    var h = '<b class="sc-t">Ce que prévoit votre convention collective en santé</b>';
    if (c && c.c) {
      h += '<p>IDCC ' + esc(c.i) + ' — ' + esc(c.b) + ' : ' + (c.rb === 1 ? 'régime santé de branche (' + esc(c.r.replace(/^Oui,?\s*/, '')) + ')' : c.rb === 0 ? 'pas de régime santé de branche, le socle légal s’applique' : esc(c.r)) + '.</p><ul>'
        + (c.rb !== 0 ? '<li><b>Au-delà du socle légal :</b> ' + esc(c.e) + '</li>' : '')
        + (c.p && c.p > 50 ? '<li><b>Part employeur :</b> au moins ' + c.p + ' % (appliquée à votre devis)</li>' : '')
        + (c.f ? '<li><b>Ayants droit :</b> ' + famLib(c.f) + ' (famille incluse dans votre devis)</li>' : '')
        + (c.rb !== 0 && c.o && c.o !== '—' ? '<li><b>Organismes :</b> ' + esc(c.o) + ' — vous restez libre de choisir un autre assureur à garanties au moins équivalentes</li>' : '')
        + (c.v || []).map(function (v) { return '<li><b>À vérifier :</b> ' + esc(v) + '</li>'; }).join('')
        + '</ul>' + (c.l ? '<p><a href="' + esc(c.l) + '" target="_blank" rel="noopener">Texte de la branche</a></p>' : '');
    } else {
      h += '<p>' + (c ? 'IDCC ' + esc(c.i) + ' — ' + esc(c.b) + ' : les exigences de votre convention sont vérifiées par votre expert Banque des RH. ' : 'Votre convention collective peut ajouter des exigences : votre expert Banque des RH les vérifie. ')
        + 'Le socle légal s’applique dans tous les cas :</p><ul>' + SOCLE.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
    }
    return h + '<p class="sc-n">' + esc(NOTE) + '</p>';
  }
  var st = document.createElement('style');
  st.textContent = '.sc-box{margin:0 0 16px;background:var(--mint-2,#eef4ef);border:1px solid var(--line,#e7ece9);border-radius:12px;padding:12px 16px;font-size:.86rem;line-height:1.5;color:var(--ink,#233029)}'
    + '.sc-box .sc-t{display:block;font-family:var(--fh,inherit);color:var(--green,#065145);font-size:.92rem;margin-bottom:4px}.sc-box p{margin:0 0 6px}.sc-box ul{margin:4px 0 6px 18px;padding:0}.sc-box li{margin:2px 0}'
    + '.sc-box a{color:var(--green,#065145);font-weight:600}.sc-n{font-size:.74rem;color:var(--slate,#5c6b64);margin:6px 0 0!important}'
    + '.dv-opt.sc-off{opacity:.45;pointer-events:none}.sc-note{margin:8px 0 0;font-size:.8rem;color:var(--green,#065145);background:var(--mint-2,#eef4ef);border-radius:8px;padding:6px 10px}';
  document.head.appendChild(st);
  var $ = function (id) { return document.getElementById(id); };
  var page = String(window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function profil() { try { return JSON.parse(sessionStorage.getItem('brhProfil') || '{}') || {}; } catch (e) { return {}; } }

  /* ============================== DEVIS : ÉTAPE 4, SANTÉ ============================== */
  var devis = { appliquee: '' };
  function idccDevis() { var el = $('e-idcc'); return (el && el.value) || (typeof S !== 'undefined' && S.ent && S.ent.idcc) || ''; }
  function radios(n) { return [].slice.call(document.querySelectorAll('#devis input[name="' + n + '"]') || []); }
  function appliquerDevis() {
    if (page !== 'devis.html' || typeof S === 'undefined') return;
    var c = pour(idccDevis()), panel = $('p-sante'), box = $('dvSanteCcn');
    if (panel && !box) {
      var sub = panel.querySelector('.dv-sub[data-show="sp_cov:sante"]') || panel;
      box = document.createElement('div'); box.className = 'sc-box'; box.id = 'dvSanteCcn'; box.setAttribute('aria-live', 'polite');
      sub.insertBefore(box, sub.firstChild || null);
    }
    if (box) box.innerHTML = encadre(c);
    /* contraintes de la convention confirmée : part employeur minimale, famille incluse */
    var min = c && c.c && c.p > 50 ? c.p / 100 : 0.5, fam = c && c.c ? c.f : '', change = false;
    radios('sp_part').forEach(function (el) {
      var off = (+el.value) < min - 1e-9, lab = el.closest ? el.closest('.dv-opt') : null;
      el.disabled = off; if (lab && lab.classList) lab.classList.toggle('sc-off', off);
    });
    var cur = radios('sp_part').filter(function (el) { return el.checked; })[0];
    if (cur && +cur.value < min - 1e-9) { var ok = radios('sp_part').filter(function (el) { return +el.value >= min - 1e-9; })[0]; if (ok) { radios('sp_part').forEach(function (el) { el.checked = el === ok; }); change = true; } }
    radios('sp_fam').forEach(function (el) {
      var off = !!fam && el.value !== 'famille_obl', lab = el.closest ? el.closest('.dv-opt') : null;
      el.disabled = off; if (lab && lab.classList) lab.classList.toggle('sc-off', off);
    });
    if (fam) { var fo = radios('sp_fam').filter(function (el) { return el.value === 'famille_obl'; })[0]; if (fo && !fo.checked) { radios('sp_fam').forEach(function (el) { el.checked = el === fo; }); change = true; } }
    var hint = panel && panel.querySelector ? panel.querySelector('[data-sc-part]') : null;
    if (!hint && panel) { var q = radios('sp_part')[0]; var dq = q && q.closest ? q.closest('.dv-q') : null; hint = dq ? dq.querySelector('.q-h') : null; if (hint && hint.setAttribute) hint.setAttribute('data-sc-part', '1'); }
    if (hint) hint.textContent = min > 0.5 ? 'Minimum prévu par votre convention collective : ' + Math.round(min * 100) + ' %.' : '50 % minimum.';
    devis.appliquee = c ? c.i : '';
    if (S.entSrc) S.entSrc.sante_ccn = expert(c);
    if (S.ent) S.ent.sante_ccn = expert(c);
    if (change && S.step === 4) { try { if (typeof applyShow === 'function') applyShow(); if (typeof updOutputs === 'function') updOutputs(); } catch (e) {} }
  }
  if (page === 'devis.html' && typeof S !== 'undefined') {
    if (typeof go === 'function') { var _go = go; go = function () { var r = _go.apply(this, arguments); try { appliquerDevis(); } catch (e) {} return r; }; }
    document.addEventListener('input', function (e) { if (e.target && e.target.id === 'e-idcc') appliquerDevis(); });
    document.addEventListener('change', function (e) { if (e.target && (e.target.id === 'e-ccn' || e.target.name === 'sp_cov')) setTimeout(appliquerDevis, 0); });
    /* la demande transmise emporte les obligations de la convention (lead.entreprise.source_donnees.sante_ccn) */
    if (typeof submitDevis === 'function') { var _sd = submitDevis; submitDevis = function () { try { appliquerDevis(); } catch (e) {} return _sd.apply(this, arguments); }; }
    appliquerDevis();
  }

  /* ============================== AUDIT MUTUELLE ============================== */
  if (page === 'audit-mutuelle.html' && typeof checks === 'function' && typeof A === 'object') {
    var _checks = checks;
    checks = function () {
      var L = _checks.apply(this, arguments), c = pour(typeof ccnCode === 'function' ? ccnCode() : '');
      if (!c) return L;
      var i = L.findIndex(function (x) { return x[1] === 'Convention'; });
      var conv = c.c ? ['ok', 'Convention', esc(phrase(c) || ('Votre convention (IDCC ' + c.i + ' — ' + c.b + ')')) + ' <span class="au-note">' + esc(NOTE) + '</span>']
                     : ['warn', 'Convention', 'Votre convention (IDCC ' + esc(c.i) + ' — ' + esc(c.b) + ') : ses exigences en santé sont vérifiées par votre expert Banque des RH ; le socle légal s’applique au minimum.'];
      if (i >= 0) L[i] = conv; else L.unshift(conv);
      if (c.c && typeof hasMut === 'function' && hasMut() && !(typeof souhait === 'function' && souhait())) {
        var part = { moins50: 40, '50': 50, '60': 60, '75': 75, '100': 100 }[A.partEmp];
        var j = L.findIndex(function (x) { return x[1] === 'Financement'; });
        if (part != null && c.p > 50) {
          var f = part < c.p ? ['alert', 'Financement', 'Votre convention impose une part employeur d’au moins ' + c.p + ' % : votre part actuelle (' + (A.partEmp === 'moins50' ? 'moins de 50' : part) + ' %) est en dessous.']
                             : ['ok', 'Financement', 'Part employeur conforme au minimum de votre convention (' + c.p + ' %).'];
          if (j >= 0) L[j] = f; else L.push(f);
        }
        if (c.f && A.famille === 'non') {
          var k = L.findIndex(function (x) { return x[1] === 'Famille'; }), g = ['alert', 'Ayants droit', 'Votre convention impose de couvrir d’office les ' + (c.f === 'enfants' ? 'enfants' : 'ayants droit (conjoint et enfants)') + ' de vos salariés.'];
          if (k >= 0) L[k] = g; else L.push(g);
        }
      }
      return L;
    };
  }

  /* ============================== DIAGNOSTIC : CARTE « PROTÉGER » ============================== */
  function idccDiag() { return (typeof ccnTexte === 'function' ? ccnTexte() : '') || profil().idcc || profil().ccn || ''; }
  function rappelDiag() {
    var host = $('rec-cards'); if (!host || !host.querySelectorAll) return;
    var c = pour(idccDiag()), t = phrase(c);
    [].slice.call(host.querySelectorAll('.rcard')).forEach(function (card) {
      var h = card.querySelector && card.querySelector('h3'); if (!h || !/Protéger/i.test(h.textContent || '')) return;
      var n = card.querySelector('.sc-note');
      if (!t) { if (n) n.remove(); return; }
      if (!n) { n = document.createElement('p'); n.className = 'sc-note'; h.parentNode.insertBefore(n, h.nextSibling); }
      n.textContent = t;
    });
  }
  if (page === 'diagnostic.html' && typeof updateSolutions === 'function') {
    var _us = updateSolutions; updateSolutions = function () { var r = _us.apply(this, arguments); try { rappelDiag(); } catch (e) {} return r; };
    try { rappelDiag(); } catch (e) {}
  }

  /* convention de la page en cours (Julia, fin de parcours) */
  function courante() {
    if (page === 'devis.html') return pour(idccDevis());
    if (page === 'diagnostic.html') return pour(idccDiag());
    if (page === 'audit-mutuelle.html' && typeof ccnCode === 'function') return pour(ccnCode()) || pour(profil().idcc || profil().ccn);
    return pour(profil().idcc || profil().ccn);
  }
  window.BRH_SANTE_CCN = { donnees: CCN, socle: SOCLE, note: NOTE, code: code, pour: pour, public: public_, expert: expert, phrase: phrase, encadre: encadre,
                           courante: courante, appliquerDevis: appliquerDevis, rappelDiag: rappelDiag, date: DATE };
})();
