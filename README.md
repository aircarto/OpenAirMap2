# OpenAirMap2

Deuxième version de l'application web openairmap. Projet open source de visualisation de capteurs et de station de mesure de la qualité de l'air dans la région SUD. Développé par AirCarto et AtmoSud.

## Objectifs

Faire apparaître sur la carte des points de mesure ou des points d'intéret lié à la qualité de l'air avec la possibilité pour l'utilisateur d'intéragir en cliquant sur les points pour avoir plus d'information ou comparer les données. L'application utilise pour cela des appels vers des API ouvertes afin de récupérer de la donnée en direct.

## API

Liste non exhaustive des API utilisées:
* AirCarto: [api.aircarto.fr](https://api.aircarto.fr/)
* AtmoSud: [api.atmosud.org](https://api.atmosud.org/)
* Sensor Community
* Purple Air
* Signal'Air

## Code, frameworks et bliothèques 

L'application tourne essentiellement avec des scripts JavaScript et les extensions suivantes:
* Leaflet.js pour toute la partie cartographique
* Bootstrap (v5) pour une partie des éléments graphiques (boutons, menus déroulant)
* AMcharts pour les graphiques
* Ajax et jQuery pour les appels vers les API

## Data

L'application a pour but de tourner  uniquement coté client. De ce fait il n'y a pas de base de donnée associée à OpenAirMap. Cependant pour faciliter le fonctionnement de l'appli nous utilison ici les fonctionnalités offertes par "local storage" pour enregistrer certains élèments sur le navigateur (lat, long, zoom, pas de temps, polluant, type de donnée, etc).

## Bonnes pratiques

Pour participer au projet merci de bien respecter ces bonnes pratiques:
* Ajouter un maximum de commentaires dans le code pour bien expliquer la démarche: un commentaire général en début de page et sur chaqu'une des fonctions importantes. Les commentaires se feront en francais dans un permier temps.
* Assurer le debug à l'aide de logs dans la console. Attention de bien structurer les logs et de ne pas trop en ajouter au risque de rentre la lecture de la console impossible.
* Créer des objets, des listes et des tableaux qui prennent en compte toutes les parametres possible. Les fonctions pourront ainsi utiliser les listes afin de réduire la taille du code. Exemple: 
```
var seuils_PM10 = {
    "bon": {"code":"bon", "color_hex":"#79c5cc","min": 0, "max": 20},
    "moyen": {"code":"moyen", "color_hex":"#64bca6","min": 21, "max": 40},
    "degrade": {"code":"degrade", "color_hex":"#ebe95f","min": 41, "max": 50},
    "mauvais": {"code":"mauvais", "color_hex":"#e85957","min": 51, "max": 100},
    "tres_mauvais": {"code":"tres_mauvais", "color_hex":"#941f36","min": 101, "max": 150},
    "extr_mauvais": {"code":"extr_mauvais", "color_hex":"#89207d","min": 151, "max": 99999}
}

for (let key in seuils_PM10) {
                            let code = seuils_PM10[key].code
                            let min = seuils_PM10[key].min
                            let max = seuils_PM10[key].max
                            let value_rounded = Math.round(value[mesure_maj_pas_de_temps]);
                            //si la valeur est entre le max et le min
                            if (value_rounded >= min & value_rounded <= max) {
                                icon_param.iconUrl = 'img/nebuleair/nebuleAir_'+code+'.png';
                            }
                        }
```
* Ajouter des "issues" sur le git du projet pour un bon suivi des bloquages et des développement à faire.
* Logger à chaque fois le temps d'exécution des requetes AJAX (penser à un message utilisateur et debug en cas de temps d'attente trop long de l'API).
