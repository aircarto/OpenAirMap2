//Gestiond du local storage
// formattage des polluants
// couleurs des points en fonction des seuils

import {
    seuils_PM10,
    seuils_NO2,
    seuilsO3,
    seuilsSO2,
    seuils_PM1_PM25,
    sources,
    mesures,
    pas_de_temps,
} from './appConfig.js';

// Local storage utils

// Fonction pour sauvegarder un tableau dans le stockage local
export function saveArrayToLocalStorage(key, array) {
    localStorage.setItem(key, JSON.stringify(array)); // Convertit le tableau en JSON et le stocke
}

// Fonction pour récupérer un tableau depuis le stockage local
export function getArrayFromLocalStorage(key) {
    const storedArray = localStorage.getItem(key); // Récupère la chaîne JSON
    return storedArray ? JSON.parse(storedArray) : []; // Convertit en tableau ou retourne un tableau vide
}

// Fonction pour ajouter un élément à un tableau dans le stockage local
export function addItemToLocalStorageArray(key, item) {
    const array = getArrayFromLocalStorage(key);
    // Vérifier si l'élément existe déjà dans le tableau
    if (!array.includes(item)) {
        array.push(item);
        saveArrayToLocalStorage(key, array);
        console.log(`Ajout de ${item} au localStorage pour la clé ${key}`);
    } else {
        console.log(
            `${item} existe déjà dans le localStorage pour la clé ${key}`
        );
    }
}

// Fonction pour supprimer un élément d'un tableau dans le stockage local
export function removeItemFromLocalStorageArray(key, item) {
    const array = getArrayFromLocalStorage(key);
    const index = array.indexOf(item);
    if (index > -1) {
        array.splice(index, 1);
        saveArrayToLocalStorage(key, array);
        console.log(
            `Suppression de ${item} du localStorage pour la clé ${key}`
        );
    } else {
        console.log(
            `${item} n'existe pas dans le localStorage pour la clé ${key}`
        );
    }
}

// String Formatting

// Fonction pour formater les noms de lieux
export function formatString(str) {
    // Remplacement des underscores par des espaces
    let formattedStr = str.replace(/_/g, ' ');

    // Définition des consonnes et voyelles pour le traitement
    const consonants = 'bcdfghjklmnpqrstvwxz';
    const uppercaseVowels = 'AEIOUYÀÁÂÄÆÈÉÊËÌÍÎÏÒÓÔÖŒÙÚÛÜÝ';

    // Ajout d'une apostrophe entre une consonne et une voyelle en majuscule
    formattedStr = formattedStr.replace(
        new RegExp(
            `([${consonants}${consonants.toUpperCase()}])([${uppercaseVowels}])`,
            'g'
        ),
        "$1'$2"
    );

    // Ajout d'une apostrophe entre une consonne et une voyelle en minuscule si pas d'apostrophe précédemment ajoutée
    formattedStr = formattedStr.replace(/([^'\s-])([A-Z])/g, '$1 $2');

    // Suppression des espaces superflus en début et fin de chaîne
    formattedStr.trim();
    return formattedStr;
}

// Fonction pour formater les noms des polluants avec les indices en HTML
export function formatPollutantName(name) {
    // Vérification de la validité de l'entrée
    if (!name || typeof name !== 'string') {
        console.warn('formatPollutantName received non-string value:', name);
        return String(name || '');
    }

    // Remplacement des formules chimiques par leur version avec caractères Unicode
    return name
        .replace(/PM10/g, 'PM₁₀') // Doit être avant PM1 pour éviter les conflits
        .replace(/PM2.5/g, 'PM₂.₅')
        .replace(/PM1/g, 'PM₁')
        .replace(/NO2/g, 'NO₂') // Dioxyde d'azote
        .replace(/NOx/g, 'NOₓ') // Oxydes d'azote
        .replace(/SO2/g, 'SO₂') // Dioxyde de soufre
        .replace(/O3/g, 'O₃') // Ozone
        .replace(/CO2/g, 'CO₂') // Dioxyde de carbone
        .replace(/H2S/g, 'H₂S') // Sulfure d'hydrogène
        .replace(/NH3/g, 'NH₃') // Ammoniac
        .replace(/C6H6/g, 'C₆H₆'); // Benzène
}

// Fonction de gestion d'horloge / Autorefresh

export function updateTimeDisplay() {
    const now = new Date(); // Récupération de la date et heure actuelles
    const horlogeButton = document.getElementById('button_horloge'); // Récupération du bouton horloge

    // Récupération du pas de temps actuellement sélectionné
    const selectedTimeStep = getArrayFromLocalStorage(pasDeTempsLocal)[0];

    let displayText = ''; // Texte à afficher

    switch (selectedTimeStep) {
        case 'instantane':
        case '2min':
            // Affichage de l'heure actuelle pour le pas de temps de 2 minutes
            displayText = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
            break;

        case 'qh':
            // Calcul du dernier quart d'heure terminé
            const currentMinutes = now.getMinutes();
            const lastQuarterHour = new Date(now);

            // Détermination du dernier quart d'heure complet
            if (currentMinutes < 15) {
                // Si dans le premier quart, retour au dernier quart de l'heure précédente
                lastQuarterHour.setHours(
                    lastQuarterHour.getHours() - 1,
                    45,
                    0,
                    0
                );
            } else if (currentMinutes < 30) {
                // Entre 15-29 minutes, dernier quart était 0-15
                lastQuarterHour.setMinutes(0, 0, 0);
            } else if (currentMinutes < 45) {
                // Entre 30-44 minutes, dernier quart était 15-30
                lastQuarterHour.setMinutes(15, 0, 0);
            } else {
                // Entre 45-59 minutes, dernier quart était 30-45
                lastQuarterHour.setMinutes(30, 0, 0);
            }

            const endOfLastQuarter = new Date(lastQuarterHour);
            endOfLastQuarter.setMinutes(lastQuarterHour.getMinutes() + 15);

            // Formatage de l'affichage avec l'intervalle de temps
            displayText = `${lastQuarterHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endOfLastQuarter.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            break;

        case 'h':
            // Affichage de la dernière heure complète
            const lastHour = new Date(now);
            lastHour.setHours(lastHour.getHours() - 1, 0, 0, 0);
            const nextHour = new Date(lastHour);
            nextHour.setHours(lastHour.getHours() + 1);

            displayText = `${lastHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${nextHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            break;

        case 'd':
            // Affichage de la date d'hier
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            displayText = yesterday.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
            });
            break;

        default:
            // Par défaut, affichage de l'heure actuelle
            displayText = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
    }

    horlogeButton.innerHTML = displayText; // Mise à jour de l'affichage
}

// Fonction pour configurer le rafraîchissement automatique des données
// export function setupAutoRefresh() {
//     // Nettoyage de tout intervalle de rafraîchissement existant
//     if (window.refreshInterval) {
//         clearInterval(window.refreshInterval);
//     }

//     // Récupération du pas de temps actuel
//     const selectedTimeStep = getArrayFromLocalStorage(pasDeTempsLocal)[0];

//     // Détermination de l'intervalle de rafraîchissement en millisecondes
//     let refreshIntervalMs;
//     switch (selectedTimeStep) {
//         case 'instantane':
//         case '2min':
//             refreshIntervalMs = 2 * 60 * 1000; // 2 minutes
//             break;
//         case 'qh':
//             refreshIntervalMs = 15 * 60 * 1000; // 15 minutes
//             break;
//         case 'h':
//             refreshIntervalMs = 60 * 60 * 1000; // 1 heure
//             break;
//         case 'd':
//             refreshIntervalMs = 24 * 60 * 60 * 1000; // 1 jour
//             break;
//         default:
//             refreshIntervalMs = 5 * 60 * 1000; // Par défaut 5 minutes
//     }

//     console.log(
//         `Rafraîchissement automatique réglé sur ${refreshIntervalMs / 1000} secondes basé sur le pas de temps '${selectedTimeStep}'`
//     );

//     // Configuration de l'intervalle de rafraîchissement
//     window.refreshInterval = setInterval(() => {
//         // Vérification si un rafraîchissement est déjà en cours
//         if (window.isRefreshing) {
//             console.log('Un rafraîchissement est déjà en cours, attente...');
//             return;
//         }
//         window.isRefreshing = true;

//         console.log(
//             '⏰ Rafraîchissement automatique des données selon le pas de temps'
//         );

//         // Sauvegarde de l'état actuel avant le rafraîchissement
//         const currentDeviceId = globalSelectedDeviceId;
//         const sidePanelOpen =
//             document.getElementById('side-panel').style.display !== 'none';

//         // Sauvegarde des données actuelles de l'appareil si disponible
//         if (
//             currentDeviceId &&
//             window.deviceMarkers &&
//             window.deviceMarkers[currentDeviceId]
//         ) {
//             window.lastSelectedDeviceData =
//                 window.deviceMarkers[currentDeviceId].data;
//         }

//         // Réinitialisation des marqueurs
//         window.deviceMarkers = {};
//         globalSelectedMarker = null;
//         globalSelectedText = null;

//         // Récupération et rafraîchissement des sources actives
//         const activeSources = getArrayFromLocalStorage(sources_local);
//         const refreshPromises = activeSources.map((source) => {
//             clearLayer(source);
//             return loadSource(source);
//         });

//         // Attente de la fin de tous les rafraîchissements
//         Promise.all(refreshPromises)
//             .then(() => {
//                 // Mise à jour de l'affichage
//                 updateTimeDisplay();
//                 updateButtonDisplay();

//                 // Restauration de l'état précédent si nécessaire
//                 if (currentDeviceId && sidePanelOpen) {
//                     setTimeout(() => {
//                         findAndHighlightMarker(currentDeviceId);
//                     }, 1000);
//                 }
//             })
//             .catch((error) => {
//                 console.error('Erreur lors du rafraîchissement:', error);
//             })
//             .finally(() => {
//                 window.isRefreshing = false;
//             });
//     }, refreshIntervalMs);
// }

// Fonction pour obtenir les seuils appropriés pour un polluant donné
export function getThresholdsForPollutant(pollutant) {
    if (pollutant === 'pm10') {
        return seuils_PM10;
    } else if (pollutant === 'no2') {
        return seuils_NO2;
    } else if (pollutant === 'o3') {
        return seuilsO3;
    } else if (pollutant === 'so2') {
        return seuilsSO2;
    } else {
        return seuils_PM1_PM25;
    }
}

// Fonction pour obtenir le code couleur en fonction de la valeur et du polluant
export function getColorCodeForValue(value, pollutant) {
    const thresholds = getThresholdsForPollutant(pollutant);
    let colorCode = 'default';
    const roundedValue = Math.round(parseFloat(value));

    for (let key in thresholds) {
        const min = thresholds[key].min;
        const max = thresholds[key].max;

        if (roundedValue >= min && roundedValue <= max) {
            colorCode = thresholds[key].code;
            break;
        }
    }

    return colorCode;
}

// Fonction pour vérifier si une valeur est présente dans un objet
export function isValueInObject(obj, value) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] === value) {
                return true;
            }
        }
    }
    return false;
}

// Fonction pour vérifier si un objet est vide
export function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}

//CLOSE SIDE PANEL
export function closeSidePanel() {
    const sidePanel = document.getElementById('side-panel');
    const mapContainer = document.getElementById('map-container');

    console.log('Closing side panel');
    sidePanel.classList.remove('col-2', 'col-sm-4', 'col-lg-3');
    sidePanel.style.display = 'none';
    mapContainer.classList.remove('col-8', 'col-lg-9');
    mapContainer.classList.add('col-12');
    mapContainer.style.paddingLeft = '30px';
}

/**
 * Initialise les valeurs par défaut dans le localStorage
 */
export function initializeDefaultValues() {
    // Initialiser les sources actives
    if (!localStorage.getItem('sources_local')) {
        const defaultSources = Object.values(sources)
            .filter((source) => source.activated)
            .map((source) => source.code);
        localStorage.setItem('sources_local', JSON.stringify(defaultSources));
    }

    // Initialiser la mesure sélectionnée
    if (!localStorage.getItem('mesuresLocal')) {
        const defaultMeasure =
            Object.values(mesures).find((measure) => measure.activated)?.code ||
            'pm1';
        localStorage.setItem('mesuresLocal', JSON.stringify([defaultMeasure]));
    }

    // Initialiser le pas de temps sélectionné
    if (!localStorage.getItem('pasDeTempsLocal')) {
        const defaultTimeStep =
            Object.values(pas_de_temps).find((timeStep) => timeStep.activated)
                ?.code || '2min';
        localStorage.setItem(
            'pasDeTempsLocal',
            JSON.stringify([defaultTimeStep])
        );
    }
}
