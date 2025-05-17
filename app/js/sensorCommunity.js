/**
 * Module de gestion des capteurs Sensor.Community
 * Ce module gère l'affichage et l'interaction avec les capteurs Sensor.Community
 */

import { sensorCommmunityLayer } from './layers.js';
import {
    formatPollutantName,
    getArrayFromLocalStorage,
    getColorCodeForValue,
} from './utils.js';
import { isSourceActive } from './dataSourceManager.js';
import { panelManager } from './panelManager.js';
import { startSpinner, stopSpinner } from './spinnerManager.js';

// Configuration
const CONFIG = {
    API_URL: 'https://api.sensor.community/v1/sensors/',
    ICON_SIZE: [80, 80],
    ICON_ANCHOR: [5, 70],
    SUPPORTED_SENSORS: [
        'SDS011',
        'SDS021',
        'PMS1003',
        'PMS3003',
        'PMS5003',
        'PMS6003',
        'PMS7003',
        'HPM',
        'SPS30',
        'NextPM',
        'IPS-7100',
    ],
    THRESHOLDS: {
        PM1_PM25: {
            BON: { min: 0, max: 10 },
            MOYEN: { min: 10, max: 20 },
            DEGRADE: { min: 20, max: 25 },
            MAUVAIS: { min: 25, max: 50 },
            TRES_MAUVAIS: { min: 50, max: 75 },
            EXT_MAUVAIS: { min: 75, max: Infinity },
        },
        PM10: {
            BON: { min: 0, max: 20 },
            MOYEN: { min: 20, max: 40 },
            DEGRADE: { min: 40, max: 50 },
            MAUVAIS: { min: 50, max: 100 },
            TRES_MAUVAIS: { min: 100, max: 150 },
            EXT_MAUVAIS: { min: 150, max: Infinity },
        },
    },
};

// Variables locales au module
const state = {
    pasDeTempsChart: '1h',
    historiqueChart: '7d',
    mesuresArray: [],
    globalSelectedDeviceId: null,
    customDateRange: {
        start: null,
        end: null,
    },
    apiData: {
        data: null,
        timestamp: null,
        timespan: null,
    },
};

/**
 * Fonction principale pour charger les capteurs Sensor.Community
 * Récupère les données des capteurs et les affiche sur la carte
 */
export async function loadSensorCommunity() {
    console.log(
        '%cSensor.Community',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now();
    sensorCommmunityLayer.clearLayers();

    // Vérification que la source est active
    if (!isSourceActive('sensor_community')) {
        return;
    }

    try {
        startSpinner();

        // Récupération des paramètres de configuration
        state.pasDeTemps = getArrayFromLocalStorage('pasDeTempsLocal');
        const mesure = getArrayFromLocalStorage('mesuresLocal');
        const mesureSensorCommunity = mesure[0];

        // Récupération des données
        const data = await fetchSensorData();

        // Filtrage des capteurs supportés
        const filter_sensors = data.filter((e) =>
            CONFIG.SUPPORTED_SENSORS.includes(e.sensor.sensor_type.name)
        );

        const end = Date.now();
        const requestTimer = (end - start) / 1000;
        console.log(`Data gathered in %c${requestTimer} sec`, 'color: red;');

        // Stockage des données pour utilisation ultérieure
        state.apiData = {
            data: filter_sensors,
            timestamp: end,
            timespan: timespanLower,
        };

        // Traitement des capteurs
        const sensorsList = new Set();
        filter_sensors.forEach((item) => {
            if (!sensorsList.has(item.sensor.id)) {
                sensorsList.add(item.sensor.id);
                createSensorMarker(item, mesureSensorCommunity);
            }
        });
    } catch (error) {
        console.error(
            'Erreur lors du chargement des données Sensor.Community:',
            error
        );
    } finally {
        stopSpinner();
    }
}

/**
 * Récupère les données des capteurs depuis l'API
 * @returns {Promise<Array>} Données des capteurs
 */
async function fetchSensorData() {
    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        throw error;
    }
}

/**
 * Crée un marqueur pour un capteur avec ses données
 * @param {Object} item - Données du capteur
 * @param {string} mesure - Type de mesure sélectionné
 */
function createSensorMarker(item, mesure) {
    const value_compound = getSensorValue(item, mesure);
    if (value_compound === undefined) return;

    const iconParam = createIconParameters(value_compound, mesure);
    const sc_icon = L.icon(iconParam);

    // Création du marqueur principal
    const stationMarker = L.marker(
        [item.location.latitude, item.location.longitude],
        { icon: sc_icon }
    );

    // Création du marqueur de texte
    const textSize = getTextSize(value_compound);
    const textPosition = getTextPosition(value_compound);
    const textParam = L.divIcon({
        className: 'my-div-icon',
        html: `<div id="textDiv" style="font-size: ${textSize}px;">${Math.round(value_compound)}</div>`,
        iconAnchor: textPosition,
        popupAnchor: [30, -60],
    });

    const textMarker = L.marker(
        [item.location.latitude, item.location.longitude],
        { icon: textParam }
    );

    // Configuration des événements
    setupMarkerEvents(stationMarker, textMarker, item, mesure);

    // Ajout des marqueurs à la couche
    sensorCommmunityLayer.addLayer(stationMarker);
    sensorCommmunityLayer.addLayer(textMarker);
}

/**
 * Récupère la valeur du capteur pour le type de mesure spécifié
 * @param {Object} item - Données du capteur
 * @param {string} mesure - Type de mesure
 * @returns {number|undefined} Valeur du capteur
 */
function getSensorValue(item, mesure) {
    const valueTypeMap = {
        PM1: 'P0',
        PM25: 'P2',
        PM10: 'P1',
    };

    const valueType = valueTypeMap[mesure.toUpperCase()];
    if (!valueType) return undefined;

    const filtered = item.sensordatavalues.filter(
        (e) => e.value_type === valueType
    );
    return filtered.length > 0 ? Math.round(filtered[0].value) : undefined;
}

/**
 * Crée les paramètres de l'icône en fonction de la valeur et du type de mesure
 * @param {number} value - Valeur du capteur
 * @param {string} mesure - Type de mesure
 * @returns {Object} Paramètres de l'icône
 */
function createIconParameters(value, mesure) {
    const iconParam = {
        iconUrl: 'img/SensorCommunity/SensorCommunity_default.png',
        iconSize: CONFIG.ICON_SIZE,
        iconAnchor: CONFIG.ICON_ANCHOR,
    };

    const thresholds =
        mesure.toUpperCase() === 'PM10'
            ? CONFIG.THRESHOLDS.PM10
            : CONFIG.THRESHOLDS.PM1_PM25;

    for (const [level, range] of Object.entries(thresholds)) {
        if (value >= range.min && value < range.max) {
            iconParam.iconUrl = `img/SensorCommunity/SensorCommunity_${level.toLowerCase()}.png`;
            break;
        }
    }

    return iconParam;
}

/**
 * Configure les événements pour les marqueurs
 * @param {Object} stationMarker - Marqueur de la station
 * @param {Object} textMarker - Marqueur de texte
 * @param {Object} item - Données du capteur
 * @param {string} mesure - Type de mesure
 */
function setupMarkerEvents(stationMarker, textMarker, item, mesure) {
    const clickHandler = () => {
        // Désélection des marqueurs précédents
        if (
            state.globalSelectedMarker &&
            state.globalSelectedMarker !== stationMarker
        ) {
            state.globalSelectedMarker.setZIndexOffset(0);
            state.globalSelectedMarker._icon?.classList.remove(
                'marker-selected'
            );
        }

        if (
            state.globalSelectedText &&
            state.globalSelectedText !== textMarker
        ) {
            state.globalSelectedText.setZIndexOffset(0);
            state.globalSelectedText._icon?.classList.remove('marker-selected');
        }

        // Sélection des nouveaux marqueurs
        stationMarker.setZIndexOffset(1000);
        textMarker.setZIndexOffset(1000);
        stationMarker._icon?.classList.add('marker-selected');
        textMarker._icon?.classList.add('marker-selected');

        // Mise à jour de l'état
        state.globalSelectedMarker = stationMarker;
        state.globalSelectedText = textMarker;
        window.globalSelectedDeviceId = item.sensor.id;
        window.lastSelectedDeviceData = item;

        console.log('Click on sensor: ' + item.sensor.id);
        openSidePanel_sensorCommunity(
            item.sensor.id,
            item.sensor.id,
            getArrayFromLocalStorage('mesuresLocal')
        );
    };

    stationMarker.on('click', clickHandler);
    textMarker.on('click', clickHandler);
}

/**
 * Détermine la taille du texte en fonction de la valeur
 * @param {number} valeur - Valeur du capteur
 * @returns {number} Taille du texte
 */
function getTextSize(valeur) {
    if (valeur >= 100) return 30;
    if (valeur >= 10) return 38;
    return 45;
}

/**
 * Détermine la position du texte en fonction de la valeur
 * @param {number} valeur - Valeur du capteur
 * @returns {Array} Position [x, y]
 */
function getTextPosition(valeur) {
    if (valeur >= 10) return [-9, 56];
    return [-17, 62];
}
