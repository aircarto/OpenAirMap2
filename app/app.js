// Import des modules
import { config } from './js/config.js';
import {
    loadNebuleAir,
    openSidePanel_nebuleAir,
    retreive_historiqueData_nebuleAir,
} from './js/NebuleAir.js';
import {
    load_atmoSud_microStations,
    openSidePanel_microStation,
    retreive_historiqueData_microStation,
} from './js/atmoSud_microStations.js';
import {
    load_atmoSud_stationsRef,
    openSidePanel_stationRef,
    retreive_historiqueData_stationRef,
} from './js/atmoSud_stationsRef.js';

console.log('OpenAirMap V2');

//récupérer la date et l'heure (client side!)
var now = new Date();
var year = now.getFullYear();
var month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
var day = now.getDate().toString().padStart(2, '0');

var hours = now.getHours().toString().padStart(2, '0');
var minutes = now.getMinutes().toString().padStart(2, '0');
var seconds = now.getSeconds().toString().padStart(2, '0');

var date_YMD = year + '-' + month + '-' + day;
var date_YDM = year + '-' + day + '-' + month;
var formattedTime = hours + ':' + minutes + ':' + seconds;

console.log('Date: ' + date_YMD);
console.log('Time: ' + formattedTime);

// Initialisation de la carte Leaflet
export const map = L.map('map', {
    center: config.coordsCenter,
    zoom: config.zoomLevel,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    renderer: L.canvas(),
    maxBounds: L.latLngBounds(
        L.latLng(config.boundSW[0], config.boundSW[1]),
        L.latLng(config.boundNE[0], config.boundNE[1])
    ),
    maxBoundsViscosity: 1.0,
});

// Ajout de la couche de tuiles OpenStreetMap
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

// Variables globales pour les marqueurs et l'interface
window.globalSelectedMarker = null;
window.globalSelectedText = null;
window.globalSelectedDeviceId = null;
export const deviceInfo = L.control({ position: 'bottomright' });

//variable pour les layers leaflet
export const nebuleair_layer = new L.layerGroup().addTo(map);
export const sensor_commmunity_layer = new L.layerGroup().addTo(map);
export const purpleair_layer = new L.layerGroup().addTo(map);
export const atmo_micro_layer = new L.layerGroup().addTo(map);
export const atmo_ref_layer = new L.layerGroup().addTo(map);
export const modelisationPMAtmoSud_layer = new L.layerGroup().addTo(map);
export const modelisationICAIRAtmoSud_layer = new L.layerGroup().addTo(map);
export const signalair_layer = new L.layerGroup().addTo(map);
export const mobileair_layer = new L.layerGroup().addTo(map);

// Configuration des seuils pour les différents polluants
export const seuils_PM1_PM25 = {
    bon: { code: 'bon', min: 0, max: 10 },
    moyen: { code: 'moyen', min: 11, max: 20 },
    degrade: { code: 'degrade', min: 21, max: 25 },
    mauvais: { code: 'mauvais', min: 26, max: 50 },
    tres_mauvais: { code: 'tres_mauvais', min: 51, max: 75 },
    extr_mauvais: { code: 'extr_mauvais', min: 76, max: 999 },
};

export const seuils_PM10 = {
    bon: { code: 'bon', min: 0, max: 20 },
    moyen: { code: 'moyen', min: 21, max: 40 },
    degrade: { code: 'degrade', min: 41, max: 50 },
    mauvais: { code: 'mauvais', min: 51, max: 100 },
    tres_mauvais: { code: 'tres_mauvais', min: 101, max: 150 },
    extr_mauvais: { code: 'extr_mauvais', min: 151, max: 999 },
};

export const seuils_NO2_24h = {
    bon: { code: 'bon', min: 0, max: 40 },
    moyen: { code: 'moyen', min: 41, max: 90 },
    degrade: { code: 'degrade', min: 91, max: 120 },
    mauvais: { code: 'mauvais', min: 121, max: 230 },
    tres_mauvais: { code: 'tres_mauvais', min: 231, max: 340 },
    extr_mauvais: { code: 'extr_mauvais', min: 341, max: 999 },
};

// Configuration des mesures disponibles
window.mesures = {
    pm1: { name: 'PM1', code: 'pm1', activated: true },
    pm25: { name: 'PM2.5', code: 'pm25', activated: false },
    pm10: { name: 'PM10', code: 'pm10', activated: false },
    no2: { name: 'NO2', code: 'no2', activated: false },
};

// Configuration des sources de données
window.sources = {
    nebuleair: { name: 'NebuleAir', code: 'nebuleair', activated: false },
    sensor_community: {
        name: 'Sensor.Community',
        code: 'sensor_commmunity',
        activated: false,
    },
    purpleair: { name: 'PurpleAir', code: 'purpleair', activated: false },
    atmo_micro: {
        name: 'AtmoSud µStations',
        code: 'atmo_micro',
        activated: true,
    },
    atmo_ref: {
        name: 'AtmoSud Stations Ref',
        code: 'atmo_ref',
        activated: false,
    },
    mod_pm: { name: 'Modélisation PM', code: 'mod_pm', activated: false },
    icairh: { name: "ICAIR'H", code: 'icairh', activated: false },
    signalair: { name: 'SignalAir', code: 'signalair', activated: false },
    mobileair: { name: 'MobileAir', code: 'mobileair', activated: false },
};

// Configuration des pas de temps
window.pas_de_temps = {
    instantane: { name: 'Instantané', code: 'instantane', activated: false },
    deux_min: { name: '2 minutes', code: '2min', activated: true },
    quart_heure: { name: '15 minutes', code: 'qh', activated: false },
    heure: { name: 'Heure', code: 'h', activated: false },
    jour: { name: 'Jour', code: 'd', activated: false },
};

//Amcharts chart
window.amchart_root = null;

//variable pour le DOM
export var sidePanel = document.getElementById('side-panel');
export var card1 = document.getElementById('card1');
export var card1_body = document.getElementById('card1_body');
export var card1_img = document.getElementById('card1_img');
export var card1_title = document.getElementById('card1_title');
export var card1_text = document.getElementById('card1_text');
export var card1_button = document.getElementById('card1_button');
export var card2 = document.getElementById('card2');
export var card2_title = document.getElementById('card2_title');
export var card2_text = document.getElementById('card2_text');
export var card2_button = document.getElementById('card2_button');

export var mapContainer = document.getElementById('map-container');
export var dropdown_mesures = document.getElementById('dropdown_mesures');
export var dropdown_sources = document.getElementById('dropdown_sources');
export var dropdown_pas_de_temps = document.getElementById(
    'dropdown_pas_de_temps'
);

// Export des constantes de stockage local
export const mesures_local = 'mesures_local';
export const sources_local = 'sources_local';
export const pas_de_temps_local = 'pas_de_temps_local';

// Export des fonctions de stockage local
export function saveArrayToLocalStorage(key, array) {
    localStorage.setItem(key, JSON.stringify(array));
}

export function getArrayFromLocalStorage(key) {
    const storedArray = localStorage.getItem(key);
    return storedArray ? JSON.parse(storedArray) : [];
}

export function addItemToLocalStorageArray(key, item) {
    const array = getArrayFromLocalStorage(key);
    array.push(item);
    saveArrayToLocalStorage(key, array);
}

export function removeItemFromLocalStorageArray(key, item) {
    const array = getArrayFromLocalStorage(key);
    const index = array.indexOf(item);
    if (index > -1) {
        array.splice(index, 1);
        saveArrayToLocalStorage(key, array);
    }
}

// fonction permettant de mettre en forme les lieux
export function formatString(str) {
    // On remplace les underscores par des espaces
    let formattedStr = str.replace(/_/g, ' ');

    // les consonnes
    const consonants = 'bcdfghjklmnpqrstvwxz';

    // les voyelles en majuscules
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

    formattedStr.trim();
    return formattedStr;
}

// Fonction pour formater les noms du polluants
export function formatPollutantName(name) {
    if (!name || typeof name !== 'string') {
        console.warn('formatPollutantName received non-string value:', name);
        return String(name || '');
    }

    return name
        .replace(/NO2/g, 'NO<sub>2</sub>')
        .replace(/NOx/g, 'NO<sub>x</sub>')
        .replace(/SO2/g, 'SO<sub>2</sub>')
        .replace(/O3/g, 'O<sub>3</sub>')
        .replace(/CO2/g, 'CO<sub>2</sub>')
        .replace(/H2S/g, 'H<sub>2</sub>S')
        .replace(/NH3/g, 'NH<sub>3</sub>');
}

// Fonction pour mettre à jour l'affichage de l'heure en fonction du pas de temps sélectionné
function updateTimeDisplay() {
    const now = new Date();
    const horlogeButton = document.getElementById('button_horloge');

    // Récupère le pas de temps actuellement sélectionné depuis le localStorage
    const selectedTimeStep = getArrayFromLocalStorage(pas_de_temps_local)[0];

    let displayText = '';

    switch (selectedTimeStep) {
        case 'instantane':
        case '2min':
            // Affiche l'heure actuelle pour le pas de temps de 2 minutes
            displayText = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
            break;

        case 'qh':
            // Affiche le dernier quart d'heure terminé
            const currentMinutes = now.getMinutes();
            const lastQuarterHour = new Date(now);

            // Trouve le dernier quart d'heure complet
            if (currentMinutes < 15) {
                // Si on est dans le premier quart, retourne au dernier quart de l'heure précédente
                lastQuarterHour.setHours(
                    lastQuarterHour.getHours() - 1,
                    45,
                    0,
                    0
                );
            } else if (currentMinutes < 30) {
                // Entre 15-29 minutes, le dernier quart était 0-15
                lastQuarterHour.setMinutes(0, 0, 0);
            } else if (currentMinutes < 45) {
                // Entre 30-44 minutes, le dernier quart était 15-30
                lastQuarterHour.setMinutes(15, 0, 0);
            } else {
                // Entre 45-59 minutes, le dernier quart était 30-45
                lastQuarterHour.setMinutes(30, 0, 0);
            }

            const endOfLastQuarter = new Date(lastQuarterHour);
            endOfLastQuarter.setMinutes(lastQuarterHour.getMinutes() + 15);

            displayText = `${lastQuarterHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endOfLastQuarter.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            break;

        case 'h':
            // Affiche la dernière heure complète
            const lastHour = new Date(now);
            lastHour.setHours(lastHour.getHours() - 1, 0, 0, 0);
            const nextHour = new Date(lastHour);
            nextHour.setHours(lastHour.getHours() + 1);

            displayText = `${lastHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${nextHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            break;

        case 'd':
            // Affiche uniquement la date d'hier
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            // Formate avec juste JJ/MM
            displayText = yesterday.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
            });
            break;

        default:
            displayText = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
    }

    horlogeButton.innerHTML = displayText;
}
// Fonction pour actualiser automatiquement les données en fonction du pas de temps sélectionné
function setupAutoRefresh() {
    // Efface tout intervalle de rafraîchissement existant
    if (window.refreshInterval) {
        clearInterval(window.refreshInterval);
    }

    // Récupère le pas de temps actuel depuis le localStorage
    const selectedTimeStep = getArrayFromLocalStorage(pas_de_temps_local)[0];

    // Détermine l'intervalle de rafraîchissement en millisecondes selon le pas de temps
    let refreshIntervalMs;
    switch (selectedTimeStep) {
        case 'instantane':
        case '2min':
            refreshIntervalMs = 2 * 60 * 1000; // 2 minutes
            break;
        case 'qh':
            refreshIntervalMs = 15 * 60 * 1000; // 15 minutes
            break;
        case 'h':
            refreshIntervalMs = 60 * 60 * 1000; // 1 heure
            break;
        case 'd':
            refreshIntervalMs = 24 * 60 * 60 * 1000; // 1 jour
            break;
        default:
            refreshIntervalMs = 5 * 60 * 1000; // Par défaut 5 minutes
    }

    console.log(
        `Rafraîchissement automatique réglé sur ${refreshIntervalMs / 1000} secondes basé sur le pas de temps '${selectedTimeStep}'`
    );

    // Configure l'intervalle pour rafraîchir toutes les sources de données actives
    window.refreshInterval = setInterval(() => {
        console.log(
            '⏰ Rafraîchissement automatique des données selon le pas de temps'
        );

        // Stocke l'ID de l'appareil actuellement sélectionné et l'état du panneau avant le rafraîchissement
        const currentDeviceId = globalSelectedDeviceId;
        const sidePanelOpen =
            document.getElementById('side-panel').style.display !== 'none';

        console.log(
            'Appareil sélectionné avant rafraîchissement:',
            currentDeviceId
        );
        console.log('Panneau latéral ouvert:', sidePanelOpen);

        // Stocke les données actuelles de l'appareil si disponibles
        if (
            currentDeviceId &&
            window.deviceMarkers &&
            window.deviceMarkers[currentDeviceId]
        ) {
            window.lastSelectedDeviceData =
                window.deviceMarkers[currentDeviceId].data;
        }

        // Réinitialise l'objet des marqueurs d'appareils
        window.deviceMarkers = {};

        // Réinitialise les références des marqueurs sélectionnés mais garde l'ID de l'appareil
        globalSelectedMarker = null;
        globalSelectedText = null;

        // Récupère toutes les sources actives depuis le localStorage
        const activeSources = getArrayFromLocalStorage(sources_local);
        console.log('Sources actives à rafraîchir:', activeSources);

        // Rafraîchit chaque source active
        activeSources.forEach((source) => {
            clearLayer(source);
            loadSource(source);
        });

        // Met à jour l'affichage de l'heure
        updateTimeDisplay();

        // Met à jour l'affichage des boutons
        updateButtonDisplay();

        // Si un appareil était sélectionné et le panneau latéral ouvert, essaie de le restaurer
        if (currentDeviceId && sidePanelOpen) {
            console.log(
                "Tentative de restauration de l'appareil sélectionné:",
                currentDeviceId
            );
            // Utilise un délai pour s'assurer que les couches sont chargées
            setTimeout(() => {
                findAndHighlightMarker(currentDeviceId);
            }, 1000); // Délai de 1 seconde pour s'assurer que les couches sont complètement chargées
        }
    }, refreshIntervalMs);
}

// Fonction pour trouver et mettre en évidence un marqueur sur la carte
function findAndHighlightMarker(deviceId) {
    console.log(`Tentative de remise en évidence de l'appareil: ${deviceId}`);

    // On efface d'abord les références globales des marqueurs pour éviter les conflits
    if (globalSelectedMarker) {
        if (globalSelectedMarker._icon) {
            globalSelectedMarker._icon.classList.remove('marker-selected');
        }
        globalSelectedMarker.setZIndexOffset(0);
        globalSelectedMarker = null;
    }

    if (globalSelectedText) {
        if (globalSelectedText._icon) {
            globalSelectedText._icon.classList.remove('marker-selected');
        }
        globalSelectedText.setZIndexOffset(0);
        globalSelectedText = null;
    }

    // On attend que les couches soient complètement chargées
    setTimeout(() => {
        let found = false;
        console.log('Recherche du marqueur avec deviceId:', deviceId);

        // On convertit deviceId en chaîne de caractères si ce n'est pas déjà fait
        const deviceIdStr = String(deviceId || '');

        // On essaie plusieurs méthodes de recherche

        // Méthode 1: Vérifier si le marqueur est dans la couche nebuleair
        if (deviceIdStr.indexOf('nebuleair') >= 0) {
            nebuleair_layer.eachLayer(function (layer) {
                // On ignore si ce n'est pas un marqueur ou s'il n'a pas d'icône
                if (!layer._icon) return;

                // On essaie les deux options pour trouver l'ID de l'appareil
                const layerDeviceId =
                    (layer.options && layer.options.deviceId) || layer.deviceId;

                if (layerDeviceId == deviceId) {
                    console.log('Marqueur NebuleAir trouvé:', layer);

                    // On cherche le marqueur de texte correspondant
                    let textMarker = null;
                    nebuleair_layer.eachLayer(function (textLayer) {
                        if (!textLayer._icon) return;

                        const textLayerDeviceId =
                            (textLayer.options && textLayer.options.deviceId) ||
                            textLayer.deviceId;

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            textMarker = textLayer;
                        }
                    });

                    // On applique la mise en évidence
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    globalSelectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        globalSelectedText = textMarker;
                    }

                    found = true;

                    // On réouvre le panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        openSidePanel_nebuleAir(
                            layer.deviceData,
                            getArrayFromLocalStorage(pas_de_temps_local)[0],
                            '24h',
                            getArrayFromLocalStorage(mesures_local)[0]
                        );
                    }

                    return false;
                }
            });
        }
        // Méthode 2: Vérifier si le marqueur est dans la couche atmo_micro
        else {
            atmo_micro_layer.eachLayer(function (layer) {
                // On ignore si ce n'est pas un marqueur ou s'il n'a pas d'icône
                if (!layer._icon) return;

                // On essaie les deux options pour trouver l'ID de l'appareil
                const layerDeviceId =
                    (layer.options && layer.options.deviceId) || layer.deviceId;

                if (layerDeviceId == deviceId) {
                    console.log('Marqueur AtmoSud trouvé:', layer);

                    // On cherche le marqueur de texte correspondant
                    let textMarker = null;
                    atmo_micro_layer.eachLayer(function (textLayer) {
                        if (!textLayer._icon) return;

                        const textLayerDeviceId =
                            (textLayer.options && textLayer.options.deviceId) ||
                            textLayer.deviceId;

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            textMarker = textLayer;
                        }
                    });

                    // On applique la mise en évidence
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    globalSelectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        globalSelectedText = textMarker;
                    }

                    found = true;

                    // On réouvre le panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        // On récupère le pas de temps actuel et on le convertit pour AtmoSud
                        var pas_de_temps =
                            getArrayFromLocalStorage(pas_de_temps_local)[0];
                        var pas_de_temps_atmo = '';
                        switch (pas_de_temps) {
                            case '2min':
                                pas_de_temps_atmo = 'brute';
                                break;
                            case 'qh':
                                pas_de_temps_atmo = 'quart-horaire';
                                break;
                            case 'h':
                                pas_de_temps_atmo = 'horaire';
                                break;
                            case 'd':
                                pas_de_temps_atmo = 'journalier';
                                break;
                        }

                        // On récupère les mesures actuelles et on les convertit pour AtmoSud si nécessaire
                        var mesures =
                            getArrayFromLocalStorage(mesures_local)[0];
                        var mesures_atmo = mesures;
                        if (mesures === 'pm25') {
                            mesures_atmo = 'pm2.5';
                        }

                        openSidePanel_microStation(
                            layer.deviceData,
                            '24h',
                            pas_de_temps_atmo,
                            mesures_atmo
                        );
                    }

                    return false;
                }
            });
        }

        // Si on n'a pas trouvé le marqueur, on essaie d'autres méthodes
        if (!found) {
            console.warn(
                `Impossible de trouver le marqueur pour l'appareil: ${deviceId}`
            );

            // Méthode 3: On essaie d'utiliser les données stockées de l'appareil
            if (window.lastSelectedDeviceData) {
                console.log(
                    'Réouverture du panneau latéral avec les données stockées'
                );

                if (deviceIdStr.indexOf('nebuleair') >= 0) {
                    openSidePanel_nebuleAir(
                        window.lastSelectedDeviceData,
                        getArrayFromLocalStorage(pas_de_temps_local)[0],
                        '24h',
                        getArrayFromLocalStorage(mesures_local)[0]
                    );
                } else {
                    // Pour les microStations AtmoSud
                    var pas_de_temps =
                        getArrayFromLocalStorage(pas_de_temps_local)[0];
                    var pas_de_temps_atmo = '';
                    switch (pas_de_temps) {
                        case '2min':
                            pas_de_temps_atmo = 'brute';
                            break;
                        case 'qh':
                            pas_de_temps_atmo = 'quart-horaire';
                            break;
                        case 'h':
                            pas_de_temps_atmo = 'horaire';
                            break;
                        case 'd':
                            pas_de_temps_atmo = 'journalier';
                            break;
                    }

                    // On récupère les mesures et on les convertit pour AtmoSud si nécessaire
                    var mesures = getArrayFromLocalStorage(mesures_local)[0];
                    var mesures_atmo = mesures;
                    if (mesures === 'pm25') {
                        mesures_atmo = 'pm2.5';
                    }

                    openSidePanel_microStation(
                        window.lastSelectedDeviceData,
                        '24h',
                        pas_de_temps_atmo,
                        mesures_atmo
                    );
                }
            }
        }
    }, 1000);
}

// Fonction pour mettre à jour les boutons de seuil en fonction du polluant sélectionné
function updateThresholdButtons() {
    // On récupère le polluant actuellement sélectionné
    const selectedPollutant = getArrayFromLocalStorage(mesures_local)[0];

    // On détermine quel ensemble de seuils utiliser
    const thresholds = getThresholdsForPollutant(selectedPollutant);

    // On met à jour l'info-bulle de chaque bouton avec la plage appropriée
    document
        .getElementById('btn_bon')
        .setAttribute(
            'data-bs-title',
            `${thresholds.bon.min} à ${thresholds.bon.max} µg/m³`
        );

    document
        .getElementById('btn_moyen')
        .setAttribute(
            'data-bs-title',
            `${thresholds.moyen.min} à ${thresholds.moyen.max} µg/m³`
        );

    document
        .getElementById('btn_degrade')
        .setAttribute(
            'data-bs-title',
            `${thresholds.degrade.min} à ${thresholds.degrade.max} µg/m³`
        );

    document
        .getElementById('btn_mauvais')
        .setAttribute(
            'data-bs-title',
            `${thresholds.mauvais.min} à ${thresholds.mauvais.max} µg/m³`
        );

    document
        .getElementById('btn_tres_mauvais')
        .setAttribute(
            'data-bs-title',
            `${thresholds.tres_mauvais.min} à ${thresholds.tres_mauvais.max} µg/m³`
        );

    document
        .getElementById('btn_extr_mauvais')
        .setAttribute('data-bs-title', `>${thresholds.extr_mauvais.min} µg/m³`);

    // On réinitialise les info-bulles pour les mettre à jour
    const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
    );
    [...tooltipTriggerList].map((tooltipTriggerEl) => {
        // On supprime toute info-bulle existante
        const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (tooltip) {
            tooltip.dispose();
        }
        // On crée une nouvelle info-bulle
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Fonction auxiliaire pour obtenir l'ensemble de seuils approprié pour un polluant
export function getThresholdsForPollutant(pollutant) {
    if (pollutant === 'pm10') {
        return seuils_PM10;
    } else if (pollutant === 'no2') {
        return seuils_NO2_24h;
    } else {
        // Par défaut pour PM1 et PM2.5
        return seuils_PM1_PM25;
    }
}

// Fonction pour obtenir le code couleur en fonction de la valeur et du polluant
export function getColorCodeForValue(value, pollutant) {
    const thresholds = getThresholdsForPollutant(pollutant);

    let colorCode = 'default';

    // On arrondit la valeur pour assurer une comparaison cohérente
    const roundedValue = Math.round(parseFloat(value));

    // On vérifie chaque plage de seuils
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

// Fonction pour charger les sources initiales
function loadInitialSources() {
    const activeSources = getArrayFromLocalStorage(sources_local);
    console.log('Sources actives au démarrage:', activeSources);

    // Mettre à jour l'affichage des boutons avant de charger les sources
    updateButtonDisplay();

    // Charger chaque source active
    activeSources.forEach((source) => {
        // Ajouter la classe active au bouton correspondant
        const sourceKey = Object.keys(sources).find(
            (key) => sources[key].code === source
        );
        if (sourceKey) {
            const button = Array.from(
                document.querySelectorAll('#dropdown_sources button')
            ).find((btn) => btn.textContent.trim() === sources[sourceKey].name);
            if (button) {
                button.classList.add('active');
            }
        }

        loadSource(source);
    });

    // Mettre à jour l'affichage des boutons après le chargement des sources
    setTimeout(() => {
        updateButtonDisplay();
    }, 1000); // Attendre un peu pour s'assurer que le chargement est terminé
}

// Fonction pour mettre à jour l'affichage des boutons
function updateButtonDisplay() {
    // Mise à jour du bouton des mesures
    const selectedMesure = getArrayFromLocalStorage(mesures_local)[0];
    const mesureName =
        mesures[
            Object.keys(mesures).find(
                (key) => mesures[key].code === selectedMesure
            )
        ].name;
    document
        .querySelector('#dropdown_mesures')
        .closest('.dropdown')
        .querySelector('.selected-option').innerHTML = mesureName;

    // Mise à jour du bouton des pas de temps
    const selectedTimeStep = getArrayFromLocalStorage(pas_de_temps_local)[0];
    const timeStepName =
        pas_de_temps[
            Object.keys(pas_de_temps).find(
                (key) => pas_de_temps[key].code === selectedTimeStep
            )
        ].name;
    document
        .querySelector('#dropdown_pas_de_temps')
        .closest('.dropdown')
        .querySelector('.selected-option').innerHTML = timeStepName;

    // Mise à jour des classes active des boutons de mesures
    document.querySelectorAll('#dropdown_mesures button').forEach((button) => {
        button.classList.remove('active');
        if (button.textContent === mesureName) {
            button.classList.add('active');
        }
    });

    // Mise à jour des classes active des boutons de pas de temps
    document
        .querySelectorAll('#dropdown_pas_de_temps button')
        .forEach((button) => {
            button.classList.remove('active');
            if (button.textContent === timeStepName) {
                button.classList.add('active');
            }
        });

    // Mise à jour des classes active des boutons de sources
    const activeSources = getArrayFromLocalStorage(sources_local);
    document.querySelectorAll('#dropdown_sources button').forEach((button) => {
        button.classList.remove('active');
        const buttonCode = Object.keys(sources).find(
            (key) => sources[key].name === button.textContent.trim()
        );
        if (buttonCode && activeSources.includes(sources[buttonCode].code)) {
            button.classList.add('active');
        }
    });
}

// On initialise l'horloge au chargement de la page
document.addEventListener('DOMContentLoaded', function () {
    updateTimeDisplay();
    // On met à jour l'horloge toutes les minutes
    setInterval(updateTimeDisplay, 60000);

    // On configure le rafraîchissement automatique des données
    setupAutoRefresh();

    // On initialise les boutons de seuil en fonction du polluant sélectionné
    updateThresholdButtons();

    // Mise à jour de l'affichage des boutons
    updateButtonDisplay();

    // Réinitialiser le localStorage
    resetLocalStorage();

    // Chargement des sources initiales
    loadInitialSources();
});

//vérifier si un élément est dans un js object
function isValueInObject(obj, value) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] === value) {
                //console.log(`Value "${value}" is present in the object.`);
                return true;
            }
        }
    }
    //console.log(`Value "${value}" is not present in the object.`);
    return false;
}

function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}

//MESURES dropdown list (attention seul un élément peut etre coché)
// Boucle pour créer les boutons de mesures dans le menu déroulant
for (let key in mesures) {
    if (mesures.hasOwnProperty(key)) {
        let button = document.createElement('button');
        let name = mesures[key].name;
        let code = mesures[key].code;
        let activated = mesures[key].activated;
        button.innerHTML = name;
        button.classList.add('dropdown-item');
        // Si le stockage local est vide, on sauvegarde la configuration initiale
        if (isEmptyObject(getArrayFromLocalStorage(mesures_local))) {
            if (activated) {
                addItemToLocalStorageArray(mesures_local, code);
            }
        }
        // On vérifie si le code est déjà dans le stockage local
        let check_array = getArrayFromLocalStorage(mesures_local);
        if (isValueInObject(check_array, code)) {
            button.classList.add('active');
        }
        // Action quand on clique sur le bouton
        button.onclick = function () {
            let check_array = getArrayFromLocalStorage(mesures_local);
            if (isValueInObject(check_array, code)) {
                console.warn('on ne peut pas decocher');
            } else {
                // On supprime les autres sélections
                localStorage.removeItem(mesures_local);
                let listItems = document.querySelectorAll(
                    '#dropdown_mesures li'
                );
                listItems.forEach((li) => {
                    let buttons = li.querySelectorAll('button');
                    buttons.forEach((button) => {
                        button.classList.remove('active');
                    });
                });
                // On active le nouveau choix
                addItemToLocalStorageArray(mesures_local, code);
                button.classList.add('active');
                // Mise à jour du texte du bouton principal
                document
                    .querySelector('#dropdown_mesures')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML = name;

                updateThresholdButtons();

                // Rechargement des données
                console.log(
                    'Changement du type de mesure: ' +
                        getArrayFromLocalStorage(mesures_local)
                );
                console.log(
                    'Necessite le renouvellement de: ' +
                        getArrayFromLocalStorage(sources_local)
                );
                // On met à jour chaque source active
                for (let item of getArrayFromLocalStorage(sources_local)) {
                    clearLayer(item);
                    loadSource(item);
                }
            }
        };
        let li = document.createElement('li');
        li.appendChild(button);
        dropdown_mesures.appendChild(li);
    }
}

// Boucle pour créer les boutons des sources de données
for (let key in sources) {
    if (sources.hasOwnProperty(key)) {
        let button = document.createElement('button');
        let name = sources[key].name;
        let code = sources[key].code;
        let activated = sources[key].activated;
        button.innerHTML = name;
        button.classList.add('dropdown-item');
        // Configuration initiale du stockage local
        if (isEmptyObject(getArrayFromLocalStorage(sources_local))) {
            if (activated) {
                addItemToLocalStorageArray(sources_local, code);
            }
        }
        // Vérification si la source est déjà active
        let check_array = getArrayFromLocalStorage(sources_local);
        if (isValueInObject(check_array, code)) {
            button.classList.add('active');
        }
        // Action lors du clic sur une source
        button.onclick = function () {
            let check_array = getArrayFromLocalStorage(sources_local);
            if (isValueInObject(check_array, code)) {
                // Désactiver la source
                button.classList.remove('active');
                removeItemFromLocalStorageArray(sources_local, code);
                clearLayer(code);
            } else {
                // Activer la source
                button.classList.add('active');
                addItemToLocalStorageArray(sources_local, code);
                loadSource(code);
            }

            // Mettre à jour l'affichage des boutons après chaque changement
            updateButtonDisplay();
        };
        let li = document.createElement('li');
        li.appendChild(button);
        dropdown_sources.appendChild(li);
    }
}

// Boucle pour créer les boutons des pas de temps
for (let key in pas_de_temps) {
    if (pas_de_temps.hasOwnProperty(key)) {
        let button = document.createElement('button');
        let name = pas_de_temps[key].name;
        let code = pas_de_temps[key].code;
        let activated = pas_de_temps[key].activated;
        button.innerHTML = name;
        button.classList.add('dropdown-item');
        // Configuration initiale du stockage local
        if (isEmptyObject(getArrayFromLocalStorage(pas_de_temps_local))) {
            if (activated) {
                addItemToLocalStorageArray(pas_de_temps_local, code);
            }
        }
        // Vérification si le pas de temps est déjà actif
        let check_array = getArrayFromLocalStorage(pas_de_temps_local);
        if (isValueInObject(check_array, code)) {
            button.classList.add('active');
        }

        button.onclick = function () {
            let check_array = getArrayFromLocalStorage(pas_de_temps_local);
            if (isValueInObject(check_array, code)) {
                console.warn('on ne peut pas decocher');
            } else {
                // Suppression des autres sélections
                localStorage.removeItem(pas_de_temps_local);
                let listItems = document.querySelectorAll(
                    '#dropdown_pas_de_temps li'
                );
                listItems.forEach((li) => {
                    let buttons = li.querySelectorAll('button');
                    buttons.forEach((button) => {
                        button.classList.remove('active');
                    });
                });
                // Activation du nouveau pas de temps
                addItemToLocalStorageArray(pas_de_temps_local, code);
                button.classList.add('active');
                // Mise à jour du texte du bouton principal
                document
                    .querySelector('#dropdown_pas_de_temps')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML = name;

                // Mise à jour des données
                console.log(
                    'Changement du pas de temps: ' +
                        getArrayFromLocalStorage(pas_de_temps_local)
                );
                console.log(
                    'Necessite le renouvellement de: ' +
                        getArrayFromLocalStorage(sources_local)
                );
                // Actualisation de chaque source active
                for (let item of getArrayFromLocalStorage(sources_local)) {
                    clearLayer(item);
                    loadSource(item);
                }
                updateTimeDisplay();
                setupAutoRefresh();
            }
        };

        let li = document.createElement('li');
        li.appendChild(button);
        dropdown_pas_de_temps.appendChild(li);
    }
}
//Chargement des sources depuis un bouton
function loadSource(source) {
    console.log('Loading data for ' + source);
    switch (source) {
        case 'nebuleair':
            loadNebuleAir();
            break;
        case 'sensor_commmunity':
            loadSensorCommunity();
            break;
        case 'purpleair':
            loadSensorCommunity();
            break;
        case 'atmo_micro':
            load_atmoSud_microStations();
            break;
        case 'atmo_ref':
            load_atmoSud_stationsRef();
            break;
        case 'mod_pm':
            loadModPM();
            break;
        case 'icairh':
            loadicairh();
            break;
        case 'vents':
            loadVents();
            break;
        case 'signalair':
            loadSignalAir();
            break;
        case 'mobileair':
            loadMobileAir();
            break;
    }

    // Mettre à jour l'affichage des boutons après le chargement d'une source
    setTimeout(() => {
        updateButtonDisplay();
    }, 500); // Attendre un peu pour s'assurer que le chargement est terminé
}

//Enlever les layers lorsque l'on change de pas de temps ou de source
function clearLayer(source) {
    console.log('Clearing layer  for ' + source);
    switch (source) {
        case 'nebuleair':
            nebuleair_layer.clearLayers();
            break;
        case 'sensor_commmunity':
            sensor_commmunity_layer.clearLayers();
            break;
        case 'purpleair':
            purpleair_layer.clearLayers();
            break;
        case 'atmo_micro':
            atmo_micro_layer.clearLayers();
            break;
        case 'atmo_ref':
            atmo_ref_layer.clearLayers();
            break;
        case 'mod_pm':
            modelisationPMAtmoSud_layer.clearLayers();
            break;
        case 'icairh':
            modelisationICAIRAtmoSud_layer.clearLayers();
            break;
        case 'vents':
            map.clearLayers();
            break;
        case 'signalair':
            signalair_layer.clearLayers();
            break;
        case 'mobileair':
            mobileair_layer.clearLayers();
            break;
    }
}

//chargement des sources depuis la mémoire locale (au démarrage de l'appli)
for (let key in sources) {
    let code = sources[key].code;
    //on vérifie le local storage (object) pour voir si l'élément est déjà présent
    let check_array = getArrayFromLocalStorage(sources_local);
    if (isValueInObject(check_array, code)) {
        loadSource(code);
    }
}

//actualisation des sources toutes les minutes
//TEST AVEC MOBILEAIR
function reload_layers(source) {
    console.log('⏰ Reloading layers');
    clearLayer('mobileair');
    //get the new data
    loadSource('mobileair');
}

setInterval(reload_layers, 9990000); //60000 -> 1min

//OPEN SIDE PANEL
/*
Sur un grand écran on veut un side panel moins large (col-lg) 
que sur un petit écran (col) sinon il est trop fin
*/
export function openSidePanel_generic() {
    //console.log("openSidePane_generic");
    //side panel
    // sur smartphone -> toute la place (col-12)
    // sur ordi petit (sm) -> 6 colonnes
    // sur grand écran (lg) -> 5 colonnes
    sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
    sidePanel.style.display = 'block';
    //map
    // sur smartphone -> disparait (col-0)
    // sur ordi petit (sm) -> 6 colonnes
    // sur grand écran (lg) -> 7 colonnes
    mapContainer.classList.remove('col-12');
    mapContainer.classList.add('d-none', 'd-sm-block', 'col-sm-6', 'col-lg-7');
    mapContainer.style.paddingLeft = '10px';
}

export function openSidePanel_signalair(data, nuisance_type) {
    console.log('Opening side panel for SignalAir');
    card1_img.src = 'img/signalair/logoSignalAir.png';
    card1_title.innerHTML = 'Nuisance: ' + nuisance_type;
    card1_text.innerHTML = `
    Ville:   ${data['city']} </br>
    <table class="table">
      <tbody>
        <tr>
          <td>Niveau de gêne</td>
          <td>${data['niveau-de-gene']}</td>
        </tr>
        <tr>
          <td>Symptômes déclarés</td>
          <td>${data['si-oui-quels-symptomes']}</td>
        </tr>
        <tr>
          <td>Origine de la nuisance</td>
          <td>${data['origine-de-la-nuisance']} ${data['description-de-lorigine-de-la-nuisance']}</td>
        </tr>
        <tr>
          <td>Durée de la nuisance</td>
          <td>${data['duree-de-la-nuisance']}</td>
        </tr>
        <tr>
        <td>Commentaires</td>
        <td>${data['remarque-commentaire']}</td>
      </tr>
      </tbody>
    </table>
    <a href="https://www.signalair.eu/fr/" target="_blank" class="btn btn-primary" id="card1_button">Faire un signalement</a>
     `;

    openSidePanel_generic();
}

//CLOSE SIDE PANEL
export function closeSidePanel() {
    console.log('Closing side panel');
    sidePanel.classList.remove('col-2', 'col-sm-4', 'col-lg-3');
    sidePanel.style.display = 'none';
    mapContainer.classList.remove('col-8', 'col-lg-9');
    mapContainer.classList.add('col-12');
    mapContainer.style.paddingLeft = '30px';
}

// Initialisation du conteneur device-info
deviceInfo.onAdd = function () {
    this._div = L.DomUtil.create('div', 'device-info');
    this._div.innerHTML = `
        <div id="device-name"></div>
        <div id="device-details"></div>
    `;
    this._div.style.display = 'none';
    return this._div;
};

deviceInfo.addTo(map);

//Location et Zoom par défaut récupéré dans config.js
//si existe dans Local Storage alors prends les variables en local
if ('Lat' in localStorage) {
    let coordsCenter_local_lat = localStorage.getItem('Lat');
    let coordsCenter_local_long = localStorage.getItem('Long');
    let zoomLevel_local = localStorage.getItem('Zoom');
    map.setView(
        [coordsCenter_local_lat, coordsCenter_local_long],
        zoomLevel_local
    );
} else {
    map.setView(config.coordsCenter, config.zoomLevel);
}

// Dès que l'on bouge la cart on enregistre LAT/LONG/ZOOM
map.on('moveend', function () {
    // Get the map's center coordinates
    var center = map.getCenter();
    var currentZoom = map.getZoom();
    var lat = center.lat;
    var lng = center.lng;
    saveArrayToLocalStorage('Lat', lat);
    saveArrayToLocalStorage('Long', lng);
    saveArrayToLocalStorage('Zoom', currentZoom);
});

// Exporter les variables globales pour qu'elles soient accessibles aux modules
window.amchart_root = amchart_root;
window.sidePanel = sidePanel;
window.card1 = card1;
window.card1_body = card1_body;

// Ajout d'un écouteur d'événement sur le bouton pour ouvrir/fermer le panneau latéral
document
    .getElementById('toggleSidePanel')
    .addEventListener('click', function () {
        const sidePanel = document.getElementById('side-panel');
        const mapContainer = document.getElementById('map-container');
        const icon = this.querySelector('i');

        if (sidePanel.style.display === 'none') {
            // Ouverture du panneau latéral : on ajoute les classes nécessaires pour l'affichage
            sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
            sidePanel.style.display = 'block';
            document.body.classList.add('side-panel-open');
            mapContainer.classList.remove('col-12');
            mapContainer.classList.add(
                'd-none',
                'd-sm-block',
                'col-sm-6',
                'col-lg-7'
            );
            icon.classList.replace('bi-chevron-right', 'bi-chevron-left');
        } else {
            // Fermeture du panneau latéral : on retire les classes et on cache le panneau
            sidePanel.classList.remove('col-12', 'col-sm-6', 'col-lg-5');
            sidePanel.style.display = 'none';
            document.body.classList.remove('side-panel-open');
            mapContainer.classList.remove(
                'd-none',
                'd-sm-block',
                'col-sm-6',
                'col-lg-7'
            );
            mapContainer.classList.add('col-12');
            icon.classList.replace('bi-chevron-left', 'bi-chevron-right');
        }

        // On force la mise à jour de la taille de la carte
        map.invalidateSize();
    });

// Ajout d'un écouteur d'événement sur le bouton de fermeture mobile
document
    .getElementById('closeSidePanelMobile')
    .addEventListener('click', function () {
        const sidePanel = document.getElementById('side-panel');
        const mapContainer = document.getElementById('map-container');
        const toggleButton = document.getElementById('toggleSidePanel');
        const toggleIcon = toggleButton.querySelector('i');

        // Fermeture du panneau latéral sur mobile : même logique que la fermeture normale
        sidePanel.classList.remove('col-12', 'col-sm-6', 'col-lg-5');
        sidePanel.style.display = 'none';
        document.body.classList.remove('side-panel-open');
        mapContainer.classList.remove(
            'd-none',
            'd-sm-block',
            'col-sm-6',
            'col-lg-7'
        );
        mapContainer.classList.add('col-12');
        toggleIcon.classList.replace('bi-chevron-left', 'bi-chevron-right');

        // On force la mise à jour de la taille de la carte
        map.invalidateSize();
    });

// Fonction pour réinitialiser le localStorage
function resetLocalStorage() {
    localStorage.removeItem(sources_local);
    localStorage.removeItem(mesures_local);
    localStorage.removeItem(pas_de_temps_local);

    // Réinitialiser avec les valeurs par défaut
    saveArrayToLocalStorage(sources_local, ['nebuleair']);
    saveArrayToLocalStorage(mesures_local, ['pm1']);
    saveArrayToLocalStorage(pas_de_temps_local, ['2min']);
}
