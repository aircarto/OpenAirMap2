// Import des modules nécessaires pour l'application
import { config } from './js/config.js';
import { loadNebuleAir, openSidePanelNebuleAir } from './js/NebuleAir.js';
import {
    loadAtmoSudMicroStation,
    openSidePanelMicroStation,
} from './js/atmoSud_microStations.js';
import { loadAtmoSudStationsRef } from './js/atmoSud_stationsRef.js';
import { loadModPM, loadModIcair } from './js/atmoSud_mod.js';
import { loadSignalAir } from './js/SignalAir.js';
import { toastManager, createCustomToast } from './js/toaster.js';

// Affichage de la version de l'application dans la console
console.log('OpenAirMap V2');

// Récupération de la date et l'heure actuelle côté client
var now = new Date();
var year = now.getFullYear();
var month = (now.getMonth() + 1).toString().padStart(2, '0'); // Les mois commencent à 0
var day = now.getDate().toString().padStart(2, '0');

var hours = now.getHours().toString().padStart(2, '0');
var minutes = now.getMinutes().toString().padStart(2, '0');
var seconds = now.getSeconds().toString().padStart(2, '0');

// Formatage de la date et de l'heure
var dateYMD = year + '-' + month + '-' + day;
var formattedTime = hours + ':' + minutes + ':' + seconds;

// Affichage de la date et de l'heure dans la console
console.log('Date: ' + dateYMD);
console.log('Time: ' + formattedTime);

// Initialisation de la carte Leaflet avec les paramètres de configuration
export const map = L.map('map', {
    center: config.coordsCenter, // Centre de la carte défini dans config.js
    zoom: config.zoomLevel, // Niveau de zoom initial
    minZoom: config.minZoom, // Zoom minimum autorisé
    maxZoom: config.maxZoom, // Zoom maximum autorisé
    renderer: L.canvas(), // Utilisation du moteur de rendu Canvas
    // Suppression des limites de déplacement pour permettre un déplacement libre
});

// Définition des différents fonds de carte disponibles
const baseLayers = {
    'Carte standard': L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            pane: 'tilePane', // Utilisation du pane par défaut pour le fond de carte
        }
    ),
    Satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
            pane: 'tilePane',
        }
    ),
    Terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution:
            '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
        pane: 'tilePane',
    }),
    Rues: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        pane: 'tilePane',
    }),
    'Noir et blanc': L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            pane: 'tilePane',
        }
    ),
};

// Création d'un groupe pour les fonds de carte
const baseLayerGroup = L.layerGroup();

// Ajout de la couche par défaut (Carte standard)
baseLayers['Carte standard'].addTo(baseLayerGroup);
baseLayerGroup.addTo(map);

// Fonction pour changer le fond de carte
function changeBaseLayer(layerName) {
    baseLayerGroup.clearLayers();
    baseLayers[layerName].addTo(baseLayerGroup);
}

// Création d'un contrôle personnalisé pour les fonds de carte
const baseLayerControl = L.control({ position: 'bottomleft' });

baseLayerControl.onAdd = function (map) {
    const div = L.DomUtil.create(
        'div',
        'leaflet-control-layers leaflet-control-layers-collapsed'
    );
    const toggleButton = L.DomUtil.create(
        'a',
        'leaflet-control-layers-toggle',
        div
    );
    toggleButton.href = '#';
    toggleButton.title = 'Changer le fond de carte';
    toggleButton.innerHTML = '<i class="bi bi-layers"></i>';

    const container = L.DomUtil.create(
        'div',
        'leaflet-control-layers-base',
        div
    );
    container.style.display = 'none';

    // Création des boutons radio pour chaque fond de carte
    Object.keys(baseLayers).forEach((layerName) => {
        const label = L.DomUtil.create(
            'label',
            'leaflet-control-layers-base',
            container
        );
        const input = L.DomUtil.create('input', '', label);
        input.type = 'radio';
        input.name = 'baseLayer';
        input.value = layerName;
        if (layerName === 'Carte standard') {
            input.checked = true;
        }
        label.appendChild(document.createTextNode(' ' + layerName));

        // Gestion du changement de fond de carte
        input.onchange = function () {
            changeBaseLayer(layerName);
        };
    });

    // Gestion du clic sur le bouton de basculement
    L.DomEvent.on(toggleButton, 'click', function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);

        if (container.style.display === 'none') {
            container.style.display = 'block';
            div.classList.remove('leaflet-control-layers-collapsed');
        } else {
            container.style.display = 'none';
            div.classList.add('leaflet-control-layers-collapsed');
        }
    });

    return div;
};

baseLayerControl.addTo(map);

// Variables globales pour la gestion des marqueurs et de l'interface
window.globalSelectedMarker = null; // Stocke le marqueur actuellement sélectionné
window.globalSelectedText = null; // Stocke le texte associé au marqueur sélectionné
window.globalSelectedDeviceId = null; // Stocke l'ID de l'appareil sélectionné
export const deviceInfo = L.control({ position: 'bottomright' }); // Contrôle pour afficher les informations de l'appareil

// Création des groupes de couches pour les différentes sources de données
export const nebuleairLayer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
); // Couche pour les capteurs NebuleAir
export const sensorCommmunityLayer = new L.layerGroup({
    pane: 'overlayPane',
}).addTo(map); // Couche pour les capteurs Sensor.Community
export const purpleair_layer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
); // Couche pour les capteurs PurpleAir
export const atmoMicroLayer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
); // Couche pour les micro-stations AtmoSud
export const atmoRefLayer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
); // Couche pour les stations de référence AtmoSud
export const modelisationPMAtmoSud_layer = new L.layerGroup({
    pane: 'overlayPane',
}).addTo(map); // Couche pour la modélisation PM AtmoSud
export const modelisationICAIRAtmoSud_layer = new L.layerGroup({
    pane: 'overlayPane',
}).addTo(map); // Couche pour la modélisation ICAIR AtmoSud
export const signalair_layer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
); // Couche pour les capteurs SignalAir
export const mobileair_layer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
); // Couche pour les capteurs MobileAir

// Rendre la couche atmoRefLayer disponible globalement pour d'autres modules
window.atmoRefLayer = atmoRefLayer;

// Configuration des seuils pour les particules fines PM1 et PM2.5
export const seuils_PM1_PM25 = {
    bon: { code: 'bon', min: 0, max: 10 }, // Qualité de l'air bonne (0-10 µg/m³)
    moyen: { code: 'moyen', min: 11, max: 20 }, // Qualité de l'air moyenne (11-20 µg/m³)
    degrade: { code: 'degrade', min: 21, max: 25 }, // Qualité de l'air dégradée (21-25 µg/m³)
    mauvais: { code: 'mauvais', min: 26, max: 50 }, // Qualité de l'air mauvaise (26-50 µg/m³)
    tres_mauvais: { code: 'tres_mauvais', min: 51, max: 75 }, // Qualité de l'air très mauvaise (51-75 µg/m³)
    extr_mauvais: { code: 'extr_mauvais', min: 76, max: 999 }, // Qualité de l'air extrêmement mauvaise (>75 µg/m³)
};

// Configuration des seuils pour les particules fines PM10
export const seuils_PM10 = {
    bon: { code: 'bon', min: 0, max: 20 }, // Qualité de l'air bonne (0-20 µg/m³)
    moyen: { code: 'moyen', min: 21, max: 40 }, // Qualité de l'air moyenne (21-40 µg/m³)
    degrade: { code: 'degrade', min: 41, max: 50 }, // Qualité de l'air dégradée (41-50 µg/m³)
    mauvais: { code: 'mauvais', min: 51, max: 100 }, // Qualité de l'air mauvaise (51-100 µg/m³)
    tres_mauvais: { code: 'tres_mauvais', min: 101, max: 150 }, // Qualité de l'air très mauvaise (101-150 µg/m³)
    extr_mauvais: { code: 'extr_mauvais', min: 151, max: 999 }, // Qualité de l'air extrêmement mauvaise (>150 µg/m³)
};

// Configuration des seuils pour le dioxyde d'azote (NO2) sur 24h
export const seuils_NO2_24h = {
    bon: { code: 'bon', min: 0, max: 40 }, // Qualité de l'air bonne (0-40 µg/m³)
    moyen: { code: 'moyen', min: 41, max: 90 }, // Qualité de l'air moyenne (41-90 µg/m³)
    degrade: { code: 'degrade', min: 91, max: 120 }, // Qualité de l'air dégradée (91-120 µg/m³)
    mauvais: { code: 'mauvais', min: 121, max: 230 }, // Qualité de l'air mauvaise (121-230 µg/m³)
    tres_mauvais: { code: 'tres_mauvais', min: 231, max: 340 }, // Qualité de l'air très mauvaise (231-340 µg/m³)
    extr_mauvais: { code: 'extr_mauvais', min: 341, max: 999 }, // Qualité de l'air extrêmement mauvaise (>340 µg/m³)
};

export const seuilsO3_24h = {
    bon: { code: 'bon', min: 0, max: 100 },
    moyen: { code: 'moyen', min: 101, max: 120 },
    degrade: { code: 'degrade', min: 121, max: 140 },
    mauvais: { code: 'mauvais', min: 141, max: 160 },
    tres_mauvais: { code: 'tres_mauvais', min: 161, max: 180 },
    extr_mauvais: { code: 'extr_mauvais', min: 181, max: 999 },
};

export const seuilsSO2_24h = {
    bon: { code: 'bon', min: 0, max: 40 },
    moyen: { code: 'moyen', min: 41, max: 80 },
    degrade: { code: 'degrade', min: 81, max: 120 },
    mauvais: { code: 'mauvais', min: 121, max: 160 },
    tres_mauvais: { code: 'tres_mauvais', min: 161, max: 200 },
    extr_mauvais: { code: 'extr_mauvais', min: 201, max: 999 },
};

// Configuration des mesures de polluants disponibles dans l'application
export const mesures = {
    pm1: { name: 'PM1', code: 'pm1', activated: true }, // Particules fines de diamètre inférieur à 1 µm
    pm25: { name: 'PM2.5', code: 'pm25', activated: false }, // Particules fines de diamètre inférieur à 2.5 µm
    pm10: { name: 'PM10', code: 'pm10', activated: false }, // Particules fines de diamètre inférieur à 10 µm
    no2: { name: 'NO2', code: 'no2', activated: false }, // Dioxyde d'azote
    so2: { name: 'SO2', code: 'so2', activated: false }, // Dioxyde de soufre
    o3: { name: 'O3', code: 'o3', activated: false }, // Ozone
    h2s: { name: 'H2S', code: 'h2s', activated: false }, // Sulfure d'hydrogène
    nh3: { name: 'NH3', code: 'nh3', activated: false }, // Ammoniac
};

// Configuration des différentes sources de données disponibles
export const sources = {
    nebuleair: { name: 'NebuleAir', code: 'nebuleair', activated: true }, // Capteurs citoyens NebuleAir
    sensor_community: {
        name: 'Sensor.Community',
        code: 'sensor_commmunity',
        activated: false,
    }, // Réseau de capteurs Sensor.Community
    purpleair: { name: 'PurpleAir', code: 'purpleair', activated: false }, // Capteurs PurpleAir
    atmo_micro: {
        name: 'AtmoSud µStations',
        code: 'atmo_micro',
        activated: true,
    }, // Micro-stations AtmoSud
    atmo_ref: {
        name: 'AtmoSud Stations Ref',
        code: 'atmo_ref',
        activated: true,
    }, // Stations de référence AtmoSud
    mod_pm: { name: 'Modélisation', code: 'mod_pm', activated: true }, // Modélisation des particules fines
    icairh: { name: 'ICAIR', code: 'icairh', activated: false }, // Modélisation ICAIR'H
    signalair: { name: 'SignalAir', code: 'signalair', activated: false }, // Capteurs SignalAir
    mobileair: { name: 'MobileAir', code: 'mobileair', activated: false }, // Capteurs mobiles
};

// Configuration des pas de temps disponibles pour l'affichage des données
export const pas_de_temps = {
    instantane: { name: 'Instantané', code: 'instantane', activated: false }, // Valeurs instantanées
    deux_min: { name: '2 minutes', code: '2min', activated: true }, // Moyenne sur 2 minutes
    quart_heure: { name: '15 minutes', code: 'qh', activated: false }, // Moyenne sur 15 minutes
    heure: { name: 'Heure', code: 'h', activated: false }, // Moyenne horaire
    jour: { name: 'Jour', code: 'd', activated: false }, // Moyenne journalière
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
export var card2_link = document.getElementById('card2_link');

export var mapContainer = document.getElementById('map-container');
export var dropdown_mesures = document.getElementById('dropdown_mesures');
export var dropdown_sources = document.getElementById('dropdown_sources');
export var dropdown_pas_de_temps = document.getElementById(
    'dropdown_pas_de_temps'
);

// Constantes pour les clés de stockage local
export const mesuresLocal = 'mesuresLocal'; // Clé pour stocker les mesures sélectionnées
export const sources_local = 'sources_local'; // Clé pour stocker les sources sélectionnées
export const pasDeTempsLocal = 'pasDeTempsLocal'; // Clé pour stocker le pas de temps sélectionné

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

    // Remplacement des formules chimiques par leur version HTML avec indices
    return name
        .replace(/NO2/g, 'NO<sub>2</sub>') // Dioxyde d'azote
        .replace(/NOx/g, 'NO<sub>x</sub>') // Oxydes d'azote
        .replace(/SO2/g, 'SO<sub>2</sub>') // Dioxyde de soufre
        .replace(/O3/g, 'O<sub>3</sub>') // Ozone
        .replace(/CO2/g, 'CO<sub>2</sub>') // Dioxyde de carbone
        .replace(/H2S/g, 'H<sub>2</sub>S') // Sulfure d'hydrogène
        .replace(/NH3/g, 'NH<sub>3</sub>'); // Ammoniac
}

// Fonction pour mettre à jour l'affichage de l'heure en fonction du pas de temps sélectionné
function updateTimeDisplay() {
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
function setupAutoRefresh() {
    // Nettoyage de tout intervalle de rafraîchissement existant
    if (window.refreshInterval) {
        clearInterval(window.refreshInterval);
    }

    // Récupération du pas de temps actuel
    const selectedTimeStep = getArrayFromLocalStorage(pasDeTempsLocal)[0];

    // Détermination de l'intervalle de rafraîchissement en millisecondes
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

    // Configuration de l'intervalle de rafraîchissement
    window.refreshInterval = setInterval(() => {
        // Vérification si un rafraîchissement est déjà en cours
        if (window.isRefreshing) {
            console.log('Un rafraîchissement est déjà en cours, attente...');
            return;
        }
        window.isRefreshing = true;

        console.log(
            '⏰ Rafraîchissement automatique des données selon le pas de temps'
        );

        // Sauvegarde de l'état actuel avant le rafraîchissement
        const currentDeviceId = globalSelectedDeviceId;
        const sidePanelOpen =
            document.getElementById('side-panel').style.display !== 'none';

        // Sauvegarde des données actuelles de l'appareil si disponible
        if (
            currentDeviceId &&
            window.deviceMarkers &&
            window.deviceMarkers[currentDeviceId]
        ) {
            window.lastSelectedDeviceData =
                window.deviceMarkers[currentDeviceId].data;
        }

        // Réinitialisation des marqueurs
        window.deviceMarkers = {};
        globalSelectedMarker = null;
        globalSelectedText = null;

        // Récupération et rafraîchissement des sources actives
        const activeSources = getArrayFromLocalStorage(sources_local);
        const refreshPromises = activeSources.map((source) => {
            clearLayer(source);
            return loadSource(source);
        });

        // Attente de la fin de tous les rafraîchissements
        Promise.all(refreshPromises)
            .then(() => {
                // Mise à jour de l'affichage
                updateTimeDisplay();
                updateButtonDisplay();

                // Restauration de l'état précédent si nécessaire
                if (currentDeviceId && sidePanelOpen) {
                    setTimeout(() => {
                        findAndHighlightMarker(currentDeviceId);
                    }, 1000);
                }
            })
            .catch((error) => {
                console.error('Erreur lors du rafraîchissement:', error);
            })
            .finally(() => {
                window.isRefreshing = false;
            });
    }, refreshIntervalMs);
}

// Fonction pour trouver et mettre en évidence un marqueur sur la carte
function findAndHighlightMarker(deviceId) {
    console.log(`Tentative de remise en évidence de l'appareil: ${deviceId}`);

    // Nettoyage des références globales des marqueurs
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

    // Attente du chargement complet des couches
    setTimeout(() => {
        let found = false;
        console.log('Recherche du marqueur avec deviceId:', deviceId);

        // Conversion de l'ID en chaîne de caractères
        const deviceIdStr = String(deviceId || '');

        // Recherche dans la couche NebuleAir
        if (deviceIdStr.indexOf('nebuleair') >= 0) {
            nebuleairLayer.eachLayer(function (layer) {
                if (!layer._icon) return;

                const layerDeviceId =
                    (layer.options && layer.options.deviceId) || layer.deviceId;

                if (layerDeviceId == deviceId) {
                    console.log('Marqueur NebuleAir trouvé:', layer);
                    toastManager.sensorSelected(
                        layer.options.name || 'Capteur NebuleAir'
                    );

                    // Recherche du marqueur de texte correspondant
                    let textMarker = null;
                    nebuleairLayer.eachLayer(function (textLayer) {
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

                    // Mise en évidence du marqueur
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

                    // Réouverture du panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        openSidePanelNebuleAir(
                            layer.deviceData,
                            getArrayFromLocalStorage(pasDeTempsLocal)[0],
                            '24h',
                            getArrayFromLocalStorage(mesuresLocal)[0]
                        );
                    }

                    return false;
                }
            });
        }
        // Recherche dans la couche AtmoSud
        else {
            atmoMicroLayer.eachLayer(function (layer) {
                if (!layer._icon) return;

                const layerDeviceId =
                    (layer.options && layer.options.deviceId) || layer.deviceId;

                if (layerDeviceId == deviceId) {
                    console.log('Marqueur AtmoSud trouvé:', layer);
                    toastManager.sensorSelected(
                        layer.options.name || 'Station AtmoSud'
                    );

                    // Recherche du marqueur de texte correspondant
                    let textMarker = null;
                    atmoMicroLayer.eachLayer(function (textLayer) {
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

                    // Mise en évidence du marqueur
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

                    // Réouverture du panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        var pas_de_temps =
                            getArrayFromLocalStorage(pasDeTempsLocal)[0];
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

                        var mesures = getArrayFromLocalStorage(mesuresLocal)[0];
                        var mesures_atmo = mesures;
                        if (mesures === 'pm25') {
                            mesures_atmo = 'pm2.5';
                        }

                        openSidePanelMicroStation(
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

        // Si le marqueur n'est pas trouvé, tentative de restauration avec les données stockées
        if (!found) {
            console.warn(
                `Impossible de trouver le marqueur pour l'appareil: ${deviceId}`
            );

            if (window.lastSelectedDeviceData) {
                console.log(
                    'Réouverture du panneau latéral avec les données stockées'
                );

                if (deviceIdStr.indexOf('nebuleair') >= 0) {
                    openSidePanelNebuleAir(
                        window.lastSelectedDeviceData,
                        getArrayFromLocalStorage(pasDeTempsLocal)[0],
                        '24h',
                        getArrayFromLocalStorage(mesuresLocal)[0]
                    );
                } else {
                    var pas_de_temps =
                        getArrayFromLocalStorage(pasDeTempsLocal)[0];
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

                    var mesures = getArrayFromLocalStorage(mesuresLocal)[0];
                    var mesures_atmo = mesures;
                    if (mesures === 'pm25') {
                        mesures_atmo = 'pm2.5';
                    }

                    openSidePanelMicroStation(
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
    // Récupération du polluant actuellement sélectionné
    const selectedPollutant = getArrayFromLocalStorage(mesuresLocal)[0];

    // Détermination des seuils à utiliser
    const thresholds = getThresholdsForPollutant(selectedPollutant);

    // Mise à jour des info-bulles des boutons
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

    // Réinitialisation des info-bulles
    const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
    );
    [...tooltipTriggerList].map((tooltipTriggerEl) => {
        const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (tooltip) {
            tooltip.dispose();
        }
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Fonction pour obtenir les seuils appropriés pour un polluant donné
export function getThresholdsForPollutant(pollutant) {
    if (pollutant === 'pm10') {
        return seuils_PM10;
    } else if (pollutant === 'no2') {
        return seuils_NO2_24h;
    } else if (pollutant === 'o3') {
        return seuilsO3_24h;
    } else if (pollutant === 'so2') {
        return seuilsSO2_24h;
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

// Fonction pour charger les sources initiales au démarrage
function loadInitialSources() {
    const activeSources = getArrayFromLocalStorage(sources_local);
    console.log('Sources actives au démarrage:', activeSources);

    // Mise à jour de l'affichage des boutons
    updateButtonDisplay();

    // Chargement de chaque source active
    const loadPromises = activeSources.map((source) => {
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

        return new Promise((resolve, reject) => {
            try {
                loadSource(source, true);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
    // Mise à jour finale de l'affichage
    setTimeout(() => {
        updateButtonDisplay();
    }, 1000);
}

// Fonction pour mettre à jour l'affichage des boutons
function updateButtonDisplay() {
    // Mise à jour du bouton des mesures
    const selectedMesure = getArrayFromLocalStorage(mesuresLocal)[0];

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
    const selectedTimeStep = getArrayFromLocalStorage(pasDeTempsLocal)[0];

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

        if (buttonCode) {
            const sourceCode = sources[buttonCode].code;

            // Vérification des cas particuliers
            if (activeSources.includes(sourceCode)) {
                if (sourceCode === 'atmo_micro' && selectedTimeStep === 'd') {
                    button.classList.remove('active');
                    // Afficher la notification
                    toastManager.atmoMicroTimeStepDailyWarning();
                } else if (
                    sourceCode === 'atmo_ref' &&
                    (selectedTimeStep === '2min' ||
                        selectedTimeStep === 'instantane')
                ) {
                    button.classList.remove('active');
                    // Afficher la notification
                    toastManager.atmoRefTimeStepWarning();
                } else if (
                    sourceCode === 'nebuleair' &&
                    !['pm1', 'pm25', 'pm10'].includes(selectedMesure)
                ) {
                    console.log(
                        'Désactivation de NebuleAir pour le polluant non supporté'
                    );
                    removeItemFromLocalStorageArray(sources_local, sourceCode);
                    createCustomToast({
                        message: `La mesure ${formatPollutantName(selectedMesure)} n'est pas disponible pour NebuleAir`,
                        type: 'warning',
                        title: 'Attention',
                        icon: 'exclamation-triangle',
                        timer: 5000,
                    });
                } else {
                    button.classList.add('active');
                }
            }
        }
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function () {
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 60000); // Mise à jour de l'horloge toutes les minutes

    setupAutoRefresh(); // Configuration du rafraîchissement automatique
    updateThresholdButtons(); // Mise à jour des boutons de seuil
    updateButtonDisplay(); // Mise à jour de l'affichage des boutons
    resetLocalStorage(); // Réinitialisation du localStorage
    // loadInitialSources(); // Chargement des sources initiales

    // Initialisation des boutons d'agrandissement/réduction du panneau latéral
    const expandButton = document.getElementById('expandSidePanel');
    const collapseButton = document.getElementById('collapseSidePanel');

    if (expandButton && collapseButton) {
        expandButton.addEventListener('click', function () {
            const sidePanel = document.getElementById('side-panel');
            const mapContainer = document.getElementById('map-container');

            sidePanel.classList.add('expanded');
            mapContainer.classList.add('map-collapsed');
            sidePanel.style.display = 'block';
            mapContainer.style.display = 'none';

            expandButton.style.display = 'none';
            collapseButton.style.display = 'block';

            if (map) {
                map.invalidateSize();
            }
        });

        collapseButton.addEventListener('click', function () {
            const sidePanel = document.getElementById('side-panel');
            const mapContainer = document.getElementById('map-container');

            sidePanel.classList.remove('expanded');
            mapContainer.classList.remove('map-collapsed');
            sidePanel.style.display = 'block';
            mapContainer.style.display = 'block';

            collapseButton.style.display = 'none';
            expandButton.style.display = 'block';

            if (map) {
                map.invalidateSize();
            }
        });
    }
});

// Fonction pour vérifier si une valeur est présente dans un objet
function isValueInObject(obj, value) {
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
function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}

//MESURES dropdown list (attention seul un élément peut etre coché)
// Boucle pour créer les boutons de mesures dans le menu déroulant
for (let key in mesures) {
    if (mesures.hasOwnProperty(key)) {
        let button = document.createElement('button');
        let name = formatPollutantName(mesures[key].name);
        let code = mesures[key].code;
        let activated = mesures[key].activated;
        button.innerHTML = name;
        button.classList.add('dropdown-item');
        // Si le stockage local est vide, on sauvegarde la configuration initiale
        if (isEmptyObject(getArrayFromLocalStorage(mesuresLocal))) {
            if (activated) {
                addItemToLocalStorageArray(mesuresLocal, code);
            }
        }
        // On vérifie si le code est déjà dans le stockage local
        let check_array = getArrayFromLocalStorage(mesuresLocal);
        if (isValueInObject(check_array, code)) {
            button.classList.add('active');
        }
        // Action quand on clique sur un polluant
        button.onclick = function () {
            let check_array = getArrayFromLocalStorage(mesuresLocal);
            if (isValueInObject(check_array, code)) {
                console.warn('on ne peut pas decocher');
            } else {
                // On supprime les autres sélections
                localStorage.removeItem(mesuresLocal);
                let listItems = document.querySelectorAll(
                    '#dropdown_mesures li'
                );
                listItems.forEach((li) => {
                    let buttons = li.querySelectorAll('button');
                    buttons.forEach((button) => {
                        button.classList.remove('active');
                    });
                });

                if (
                    code === 'nebuleair' &&
                    getArrayFromLocalStorage(mesuresLocal).includes('no2')
                ) {
                    console.log('#########################');
                    console.log('mesure :' + code);
                    console.log(
                        'source :' + getArrayFromLocalStorage(sources_local)
                    );
                    console.log('#########################');
                }
                // On active le nouveau choix
                addItemToLocalStorageArray(mesuresLocal, code);
                button.classList.add('active');
                // Mise à jour du texte du bouton principal
                document
                    .querySelector('#dropdown_mesures')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML = name;

                updateThresholdButtons();
                toastManager.pollutantChanged(name);

                // Rechargement des données
                console.log(
                    'Changement du type de mesure: ' +
                        getArrayFromLocalStorage(mesuresLocal)
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
        let selectedMesure = getArrayFromLocalStorage(mesuresLocal)[0];
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
                toastManager.sourceChanged(`Désactivation de ${name}`);
            } else {
                // Vérification des conditions pour afficher l'avertissement spécifique
                const selectedTimeStep =
                    getArrayFromLocalStorage(pasDeTempsLocal)[0];

                // Vérification pour AtmoSud Micro-stations
                if (code === 'atmo_micro' && selectedTimeStep === '2min') {
                    try {
                        toastManager.atmoMicroTimeStepWarning();
                        // Activer la source malgré l'avertissement
                        button.classList.add('active');
                        addItemToLocalStorageArray(sources_local, code);
                        loadSource(code);
                    } catch (error) {
                        console.error(
                            "Erreur lors de l'affichage de la notification:",
                            error
                        );
                    }
                }
                // Vérification pour AtmoSud Stations de référence
                else if (
                    code === 'atmo_ref' &&
                    (selectedTimeStep === '2min' ||
                        selectedTimeStep === 'instantane')
                ) {
                    try {
                        // Ne pas activer la source dans ce cas
                        removeItemFromLocalStorageArray(sources_local, code);
                        console.log(
                            'AtmoSud Stations Ref ne sera pas activée pour ce pas de temps'
                        );
                    } catch (error) {
                        console.error(
                            "Erreur lors de l'affichage de la notification:",
                            error
                        );
                    }
                } else if (
                    code === 'nebuleair' &&
                    !['pm1', 'pm25', 'pm10'].includes(selectedMesure)
                ) {
                    console.log(
                        'Désactivation de NebuleAir pour le polluant non supporté'
                    );
                    removeItemFromLocalStorageArray(sources_local, code);
                    createCustomToast({
                        message: `La mesure ${formatPollutantName(selectedMesure)} n'est pas disponible pour NebuleAir`,
                        type: 'warning',
                        title: 'Attention',
                        icon: 'exclamation-triangle',
                        timer: 5000,
                    });
                } else {
                    // Activer la source normalement pour les autres cas
                    button.classList.add('active');
                    addItemToLocalStorageArray(sources_local, code);
                    toastManager.sourceChanged(`Activation de ${name}`);
                    loadSource(code);
                }
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
        if (isEmptyObject(getArrayFromLocalStorage(pasDeTempsLocal))) {
            if (activated) {
                addItemToLocalStorageArray(pasDeTempsLocal, code);
            }
        }
        // Vérification si le pas de temps est déjà actif
        let check_array = getArrayFromLocalStorage(pasDeTempsLocal);
        if (isValueInObject(check_array, code)) {
            button.classList.add('active');
        }
        // action lors du clic sur un pas de temps
        button.onclick = function () {
            let check_array = getArrayFromLocalStorage(pasDeTempsLocal);
            if (isValueInObject(check_array, code)) {
                console.warn('on ne peut pas decocher');
            } else {
                // Suppression des autres sélections
                localStorage.removeItem(pasDeTempsLocal);
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
                addItemToLocalStorageArray(pasDeTempsLocal, code);
                button.classList.add('active');
                // Mise à jour du texte du bouton principal
                document
                    .querySelector('#dropdown_pas_de_temps')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML = name;

                // Vérification des conditions pour afficher l'avertissement spécifique
                const activeSources = getArrayFromLocalStorage(sources_local);

                // Vérification pour AtmoSud Micro-stations
                if (code === '2min' && activeSources.includes('atmo_micro')) {
                    try {
                        const result = toastManager.atmoMicroTimeStepWarning();
                    } catch (error) {
                        console.error(
                            "Debug - TimeStep change - Erreur lors de l'affichage de la notification:",
                            error
                        );
                    }
                }

                // Vérification pour AtmoSud Micro-stations
                if (code === 'd' && activeSources.includes('atmo_micro')) {
                    console.log(
                        "Debug - TimeStep change - Conditions remplies pour afficher l'avertissement AtmoSud Micro journalier"
                    );
                    try {
                        const result =
                            toastManager.atmoMicroTimeStepDailyWarning();
                        console.log(
                            'Debug - TimeStep change - Résultat de la notification:',
                            result
                        );

                        // Désactiver la source dans ce cas
                        removeItemFromLocalStorageArray(
                            sources_local,
                            'atmo_micro'
                        );
                        clearLayer('atmo_micro');

                        // Mettre à jour l'affichage du bouton
                        const atmoMicroButton = Array.from(
                            document.querySelectorAll(
                                '#dropdown_sources button'
                            )
                        ).find(
                            (btn) =>
                                btn.textContent.trim() ===
                                'AtmoSud Micro-stations'
                        );
                        if (atmoMicroButton) {
                            atmoMicroButton.classList.remove('active');
                        }

                        // Mettre à jour la liste des sources actives
                        let updatedActiveSources =
                            getArrayFromLocalStorage(sources_local);

                        // Mettre à jour l'affichage des boutons
                        updateButtonDisplay();
                    } catch (error) {
                        console.error(
                            "Debug - TimeStep change - Erreur lors de l'affichage de la notification:",
                            error
                        );
                    }
                }

                // Vérification pour AtmoSud Stations de référence
                if (
                    (code === '2min' || code === 'instantane') &&
                    activeSources.includes('atmo_ref')
                ) {
                    console.log(
                        "Debug - TimeStep change - Conditions remplies pour afficher l'avertissement AtmoSud Ref"
                    );
                    try {
                        const result = toastManager.atmoRefTimeStepWarning();
                        console.log(
                            'Debug - TimeStep change - Résultat de la notification:',
                            result
                        );
                        // Désactiver la source dans ce cas
                        removeItemFromLocalStorageArray(
                            sources_local,
                            'atmo_ref'
                        );
                        clearLayer('atmo_ref');
                        // Mettre à jour l'affichage du bouton
                        const atmoRefButton = Array.from(
                            document.querySelectorAll(
                                '#dropdown_sources button'
                            )
                        ).find(
                            (btn) =>
                                btn.textContent.trim() ===
                                'AtmoSud Stations Ref'
                        );
                        if (atmoRefButton) {
                            atmoRefButton.classList.remove('active');
                        }
                    } catch (error) {
                        console.error(
                            "Debug - TimeStep change - Erreur lors de l'affichage de la notification:",
                            error
                        );
                    }
                }

                // Mise à jour des données
                console.log(
                    'Changement du pas de temps: ' +
                        getArrayFromLocalStorage(pasDeTempsLocal)
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

//chargement des sources depuis la mémoire locale (au démarrage de l'appli)
document.addEventListener('DOMContentLoaded', function () {
    // Initialiser le localStorage
    resetLocalStorage();

    // Charger les sources initiales
    const activeSources = getArrayFromLocalStorage(sources_local);
    console.log('Sources actives au démarrage:', activeSources);

    // Mise à jour de l'affichage des boutons
    updateButtonDisplay();

    // Chargement de chaque source active
    activeSources.forEach((source) => {
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

        try {
            loadSource(source, true);
        } catch (error) {
            console.error(
                `Erreur lors du chargement de la source ${source}:`,
                error
            );
            toastManager.dataError(source, error.message);
        }
    });

    // Mise à jour finale de l'affichage
    setTimeout(() => {
        updateButtonDisplay();
    }, 1000);
});

//Enlever les layers lorsque l'on change de pas de temps ou de source
function clearLayer(source) {
    console.log('Clearing layer for ' + source);
    switch (source) {
        case 'nebuleair':
            nebuleairLayer.clearLayers();
            break;
        case 'sensor_commmunity':
            sensorCommmunityLayer.clearLayers();
            break;
        case 'purpleair':
            purpleair_layer.clearLayers();
            break;
        case 'atmo_micro':
            atmoMicroLayer.clearLayers();
            break;
        case 'atmo_ref':
            console.log('Nettoyage de la couche atmoRefLayer...');
            atmoRefLayer.clearLayers();
            break;
        case 'mod_pm':
            console.log(
                'Nettoyage de la couche modelisationPMAtmoSud_layer...'
            );
            modelisationPMAtmoSud_layer.clearLayers();
            break;
        case 'icairh':
            modelisationICAIRAtmoSud_layer.clearLayers();
            break;
        case 'signalair':
            signalair_layer.clearLayers();
            break;
        case 'mobileair':
            mobileair_layer.clearLayers();
            break;
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
export function openSidePanelGeneric() {
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
    console.log('data', data);
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
    // Vérifier si le localStorage est vide pour les sources
    if (!localStorage.getItem(sources_local)) {
        localStorage.removeItem(sources_local);
        // Réinitialiser avec les valeurs par défaut
        saveArrayToLocalStorage(sources_local, [
            'nebuleair',
            'atmo_micro',
            'atmo_ref',
        ]);
    }

    // Vérifier si le localStorage est vide pour les mesures
    if (!localStorage.getItem(mesuresLocal)) {
        localStorage.removeItem(mesuresLocal);
        saveArrayToLocalStorage(mesuresLocal, ['pm1']);
    }

    // Vérifier si le localStorage est vide pour les pas de temps
    if (!localStorage.getItem(pasDeTempsLocal)) {
        localStorage.removeItem(pasDeTempsLocal);
        saveArrayToLocalStorage(pasDeTempsLocal, ['2min']);
    }
}

// Fonction pour gérer les notifications spéciales liées aux pas de temps
function handleTimeStepNotifications(selectedTimeStep, activeSources) {
    // Vérification pour AtmoSud Micro-stations
    if (activeSources.includes('atmo_micro')) {
        if (selectedTimeStep === '2min') {
            // Afficher la notification immédiatement
            toastManager.atmoMicroTimeStepWarning();
            // On ne désactive pas la source, on laisse le chargement se faire
            // Les données seront filtrées pour n'afficher que les capteurs NebuleAir
        } else if (selectedTimeStep === 'd') {
            // Afficher la notification immédiatement
            toastManager.atmoMicroTimeStepDailyWarning();
            // Désactiver la source dans ce cas car pas de données journalières
            removeItemFromLocalStorageArray(sources_local, 'atmo_micro');
            clearLayer('atmo_micro');
            // Mettre à jour l'affichage du bouton
            const atmoMicroButton = Array.from(
                document.querySelectorAll('#dropdown_sources button')
            ).find(
                (btn) => btn.textContent.trim() === 'AtmoSud Micro-stations'
            );
            if (atmoMicroButton) {
                atmoMicroButton.classList.remove('active');
            }
        }
    }

    // Vérification pour AtmoSud Stations de référence
    if (
        activeSources.includes('atmo_ref') &&
        (selectedTimeStep === '2min' || selectedTimeStep === 'instantane')
    ) {
        // Afficher la notification immédiatement
        toastManager.atmoRefTimeStepWarning();
        // Désactiver la source dans ce cas
        removeItemFromLocalStorageArray(sources_local, 'atmo_ref');
        clearLayer('atmo_ref');
        // Mettre à jour l'affichage du bouton
        const atmoRefButton = Array.from(
            document.querySelectorAll('#dropdown_sources button')
        ).find((btn) => btn.textContent.trim() === 'AtmoSud Stations Ref');
        if (atmoRefButton) {
            atmoRefButton.classList.remove('active');
        }
    }
}

// Dans la fonction checkInitialConditions
function checkInitialConditions() {
    const activeSources = getArrayFromLocalStorage(sources_local);
    const selectedTimeStep = getArrayFromLocalStorage(pasDeTempsLocal)[0];
    handleTimeStepNotifications(selectedTimeStep, activeSources);
}

// Appel de la vérification au chargement initial
document.addEventListener('DOMContentLoaded', function () {
    checkInitialConditions();
});

//Chargement des sources depuis un bouton
function loadSource(source, isInitialLoad = false) {
    console.log('Loading data for ' + source);
    try {
        // Gestion de la désactivation automatique des sources mod_pm et icairh
        if (source === 'mod_pm' || source === 'icairh') {
            const activeSources = getArrayFromLocalStorage(sources_local);
            if (source === 'mod_pm' && activeSources.includes('icairh')) {
                removeItemFromLocalStorageArray(sources_local, 'icairh');
                clearLayer('icairh');
                // Mettre à jour l'affichage du bouton icairh
                const icairButton = Array.from(
                    document.querySelectorAll('#dropdown_sources button')
                ).find((btn) => btn.textContent.trim() === 'ICAIR');
                if (icairButton) {
                    icairButton.classList.remove('active');
                }
            } else if (
                source === 'icairh' &&
                activeSources.includes('mod_pm')
            ) {
                removeItemFromLocalStorageArray(sources_local, 'mod_pm');
                clearLayer('mod_pm');
                // Mettre à jour l'affichage du bouton mod_pm
                const modButton = Array.from(
                    document.querySelectorAll('#dropdown_sources button')
                ).find((btn) => btn.textContent.trim() === 'Modélisation');
                if (modButton) {
                    modButton.classList.remove('active');
                }
            }
        }

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
                loadAtmoSudMicroStation();
                break;
            case 'atmo_ref':
                loadAtmoSudStationsRef();
                break;
            case 'mod_pm':
                loadModPM(getArrayFromLocalStorage(mesuresLocal)[0]);
                break;
            case 'icairh':
                loadModIcair();
                break;
            case 'signalair':
                loadSignalAir();
                break;
            case 'mobileair':
                loadMobileAir();
                break;
        }
        // On affiche la notification de succès pour les changements manuels
        // if (!isInitialLoad) {
        //     toastManager.dataLoaded(source);
        // }
    } catch (error) {
        console.error(
            `Erreur lors du chargement de la source ${source}:`,
            error
        );
        toastManager.dataError(source, error.message);
    }

    // Mettre à jour l'affichage des boutons après le chargement d'une source
    setTimeout(() => {
        updateButtonDisplay();
    }, 500);
}
