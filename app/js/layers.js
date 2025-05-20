// Declaration des différentes couches de la carte

import { map } from './mapConfig.js';
import { getArrayFromLocalStorage } from './utils.js';
import { openSidePanelNebuleAir } from './NebuleAir.js';
import { openSidePanelMicroStation } from './atmoSud_microStations.js';
import { toastManager } from './toaster.js';

/**
 * Variables globales pour la gestion des marqueurs et de l'interface
 */
window.globalSelectedMarker = null; // Stocke le marqueur actuellement sélectionné
window.globalSelectedText = null; // Stocke le texte associé au marqueur sélectionné
window.globalSelectedDeviceId = null; // Stocke l'ID de l'appareil sélectionné

/**
 * Contrôle pour afficher les informations de l'appareil
 */
export const deviceInfo = L.control({ position: 'bottomright' });

/**
 * Création des groupes de couches pour les différentes sources de données
 */
export const nebuleairLayer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
);
export const sensorCommmunityLayer = new L.layerGroup({
    pane: 'overlayPane',
}).addTo(map);
export const purpleair_layer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
);
export const atmoMicroLayer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
);
export const atmoRefLayer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
);
export const modelisationPMAtmoSud_layer = new L.layerGroup({
    pane: 'overlayPane',
}).addTo(map);
export const modelisationICAIRAtmoSud_layer = new L.layerGroup({
    pane: 'overlayPane',
}).addTo(map);
export const signalair_layer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
);
export const mobileair_layer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
    map
);

/**
 * Initialisation du conteneur device-info
 */
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

/**
 * Nettoie une couche spécifique en fonction de la source
 * @param {string} source - La source de données à nettoyer
 */
export function clearLayer(source) {
    console.log('Clearing layer for ' + source);
    switch (source) {
        case 'nebuleair':
            nebuleairLayer.clearLayers();
            window.deviceMarkers = {};
            break;
        case 'sensor_commmunity':
            sensorCommmunityLayer.clearLayers();
            window.deviceMarkers = {};
            break;
        case 'purpleair':
            purpleair_layer.clearLayers();
            window.deviceMarkers = {};
            break;
        case 'atmo_micro':
            atmoMicroLayer.clearLayers();
            window.deviceMarkers = {};
            break;
        case 'atmo_ref':
            console.log('Nettoyage de la couche atmoRefLayer...');
            atmoRefLayer.clearLayers();
            window.stationMarkers = {};
            window.stationsRef = [];
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
    // Réinitialiser les marqueurs sélectionnés
    window.globalSelectedMarker = null;
    window.globalSelectedText = null;
    window.globalSelectedDeviceId = null;
    window.lastSelectedDeviceData = null;
}

/**
 * Trouve et met en évidence un marqueur sur la carte
 * @param {string} deviceId - L'identifiant de l'appareil à mettre en évidence
 */
export function findAndHighlightMarker(deviceId) {
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
                            getArrayFromLocalStorage('pasDeTempsLocal')[0],
                            '24h',
                            getArrayFromLocalStorage('mesuresLocal')[0]
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
                            getArrayFromLocalStorage('pasDeTempsLocal')[0];
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

                        var mesures =
                            getArrayFromLocalStorage('mesuresLocal')[0];
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
                        getArrayFromLocalStorage('pasDeTempsLocal')[0],
                        '24h',
                        getArrayFromLocalStorage('mesuresLocal')[0]
                    );
                } else {
                    var pas_de_temps =
                        getArrayFromLocalStorage('pasDeTempsLocal')[0];
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

                    var mesures = getArrayFromLocalStorage('mesuresLocal')[0];
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
