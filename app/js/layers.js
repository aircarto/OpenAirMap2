// Declaration des différentes couches de la carte

import { map } from './mapConfig.js';
import { getArrayFromLocalStorage } from './utils.js';
import { openSidePanelNebuleAir } from './NebuleAir.js';
import { openSidePanelMicroStation } from './atmoSud_microStations.js';
import { toastManager } from './toaster.js';
import {
    resetAllMarkers,
    state,
    refMarkerState,
    nebuleAirMarkerState,
    sensorCommunityMarkerState,
} from './markerManager.js';

/**
 * Variables globales pour la gestion des marqueurs et de l'interface
 */
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
export const sensorCommunityLayer = new L.layerGroup({
    pane: 'overlayPane',
}).addTo(map);
export const purpleairLayer = new L.layerGroup({ pane: 'overlayPane' }).addTo(
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
export const modelisationVentLayer = new L.layerGroup({
    pane: 'overlayPane',
}).addTo(map);

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
            purpleairLayer.clearLayers();
            window.deviceMarkers = {};
            break;
        case 'atmo_micro':
            atmoMicroLayer.clearLayers();
            window.deviceMarkers = {};
            break;
        case 'atmo_ref':
            atmoRefLayer.clearLayers();
            window.stationMarkers = {};
            window.stationsRef = [];
            break;
        case 'mod_pm':
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
        case 'vent':
            modelisationVentLayer.clearLayers();
            break;
    }
    // Réinitialiser les marqueurs sélectionnés
    resetAllMarkers();
    // Ne pas réinitialiser window.globalSelectedDeviceId ici
    window.lastSelectedDeviceData = null;
}

/**
 * Trouve et met en évidence un marqueur sur la carte
 * @param {string} deviceId - L'identifiant de l'appareil à mettre en évidence
 */
export function findAndHighlightMarker(deviceId) {
    console.log(
        '%c[findAndHighlightMarker] Début de la fonction',
        'color: blue; font-weight: bold'
    );
    console.log('DeviceId reçu:', deviceId);

    // Conversion de l'ID en chaîne de caractères
    const deviceIdStr = String(deviceId || '');
    console.log('DeviceId converti en string:', deviceIdStr);

    // Réinitialiser tous les marqueurs
    resetAllMarkers();

    let found = false;
    console.log(
        '%c[findAndHighlightMarker] Recherche du marqueur',
        'color: green; font-weight: bold'
    );

    // Log des marqueurs disponibles dans chaque couche
    console.log('Nombre de marqueurs par couche:', {
        atmoRef: atmoRefLayer.getLayers().length,
        atmoMicro: atmoMicroLayer.getLayers().length,
        nebuleair: nebuleairLayer.getLayers().length,
        sensorCommunity: sensorCommunityLayer.getLayers().length,
    });

    // Fonction pour vérifier si un marqueur correspond
    const checkMarker = (layer, layerType) => {
        if (!layer._icon) return false;

        const layerDeviceId = String(
            (layer.options && layer.options.deviceId) || layer.deviceId
        );

        if (layerDeviceId === deviceIdStr) {
            console.log(
                `%cMarqueur ${layerType} trouvé !`,
                'color: green; font-weight: bold'
            );
            console.log('Détails du marqueur:', layer);
            toastManager.sensorSelected(
                layer.options.name || `Capteur ${layerType}`
            );

            // Mise en évidence du marqueur
            layer.setZIndexOffset(1000);
            if (layer._icon) layer._icon.classList.add('marker-selected');

            // Mise à jour de l'état approprié
            switch (layerType) {
                case 'NebuleAir':
                    nebuleAirMarkerState.selectedMarker = layer;
                    break;
                case 'MicroStation':
                    state.selectedMarker = layer;
                    break;
                case 'StationRef':
                    refMarkerState.selectedMarker = layer;
                    break;
                case 'SensorCommunity':
                    sensorCommunityMarkerState.selectedMarker = layer;
                    break;
            }

            // Recherche du marqueur de texte correspondant
            const layerGroup = layer._map
                ? layer._map.getPane(layer._pane)
                : null;
            if (layerGroup) {
                layerGroup.eachLayer((textLayer) => {
                    if (!textLayer._icon || textLayer === layer) return;

                    const textLayerDeviceId = String(
                        (textLayer.options && textLayer.options.deviceId) ||
                            textLayer.deviceId
                    );
                    if (textLayerDeviceId === deviceIdStr) {
                        console.log('Marqueur de texte trouvé');
                        textLayer.setZIndexOffset(1000);
                        if (textLayer._icon)
                            textLayer._icon.classList.add('marker-selected');

                        // Mise à jour de l'état approprié
                        switch (layerType) {
                            case 'NebuleAir':
                                nebuleAirMarkerState.selectedText = textLayer;
                                break;
                            case 'MicroStation':
                                state.selectedText = textLayer;
                                break;
                            case 'StationRef':
                                refMarkerState.selectedText = textLayer;
                                break;
                            case 'SensorCommunity':
                                sensorCommunityMarkerState.selectedText =
                                    textLayer;
                                break;
                        }
                    }
                });
            }

            // Réouverture du panneau latéral si nécessaire
            if (
                document.getElementById('side-panel').style.display ===
                    'none' &&
                layer.deviceData
            ) {
                console.log(`Réouverture du panneau ${layerType}`);
                // La logique d'ouverture du panneau sera gérée par le gestionnaire d'événements du marqueur
            }

            return true;
        }
        return false;
    };

    // Recherche dans chaque couche
    nebuleairLayer.eachLayer((layer) => {
        if (checkMarker(layer, 'NebuleAir')) found = true;
    });

    if (!found) {
        atmoMicroLayer.eachLayer((layer) => {
            if (checkMarker(layer, 'MicroStation')) found = true;
        });
    }

    if (!found) {
        atmoRefLayer.eachLayer((layer) => {
            if (checkMarker(layer, 'StationRef')) found = true;
        });
    }

    if (!found) {
        sensorCommunityLayer.eachLayer((layer) => {
            if (checkMarker(layer, 'SensorCommunity')) found = true;
        });
    }

    // Si le marqueur n'est pas trouvé
    if (!found) {
        console.warn(
            '%c[findAndHighlightMarker] Marqueur non trouvé',
            'color: red; font-weight: bold'
        );
        console.log('DeviceId non trouvé:', deviceIdStr);
        console.log(
            'Données stockées disponibles:',
            window.lastSelectedDeviceData
        );
    }
}
