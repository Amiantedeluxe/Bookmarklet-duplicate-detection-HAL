# Bookmarklet-duplicate-detection-HAL

Installation :
 
	1. Créer un nouveau favori dans le navigateur (ou marque-page sur Firefox)
	2. Sur le favori, faire clic droit > "modifier…" (ou "modifier le marque-page" sur Firefox)
	3. Dans la case "URL", coller le script puis enregistrer
	4. Une fois sur la page d'un dépôt HAL, cliquer sur le favori pour exécuter le script

Fonctionnement :

	1. Le script récupère les métadonnées de la notice HAL ouverte (doi + titre)
	2. Fait une requête API sur le doi et sur les 12 premiers mots du titre
	3. Exclut la notice courante et les notices avec un doi strictement différent des résultats
	4. Affiche les doublons potentiels dans une fenêtre flottante, avec liens cliquables, titre et doi

