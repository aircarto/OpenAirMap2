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
            purpleair_layer.clearLayers();
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
    window.globalSelectedDeviceId = null;
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
    console.log('Type de deviceId:', typeof deviceId);

    // Conversion de l'ID en chaîne de caractères dès le début
    const deviceIdStr = String(deviceId || '');
    console.log('DeviceId converti en string:', deviceIdStr);

    // Réinitialiser tous les marqueurs
    resetAllMarkers();

    // Attente du chargement complet des couches
    setTimeout(() => {
        let found = false;
        console.log(
            '%c[findAndHighlightMarker] Recherche du marqueur',
            'color: green; font-weight: bold'
        );
        console.log('DeviceId recherché:', deviceIdStr);

        // Log des marqueurs disponibles dans chaque couche
        console.log(
            'Marqueurs dans atmoRefLayer:',
            atmoRefLayer.getLayers().length
        );
        console.log(
            'Marqueurs dans atmoMicroLayer:',
            atmoMicroLayer.getLayers().length
        );
        console.log(
            'Marqueurs dans nebuleairLayer:',
            nebuleairLayer.getLayers().length
        );
        console.log(
            'Marqueurs dans purpleair_layer:',
            purpleair_layer.getLayers().length
        );
        console.log(
            'Marqueurs dans sensorCommunityLayer:',
            sensorCommunityLayer.getLayers().length
        );

        // Recherche dans la couche NebuleAir
        if (deviceIdStr.indexOf('nebuleair') >= 0) {
            console.log('Recherche dans la couche NebuleAir');
            nebuleairLayer.eachLayer(function (layer) {
                if (!layer._icon) {
                    console.log('Marqueur sans icône ignoré');
                    return;
                }

                const layerDeviceId = String(
                    (layer.options && layer.options.deviceId) || layer.deviceId
                );
                console.log(
                    'Comparaison NebuleAir - Layer ID:',
                    layerDeviceId,
                    'vs DeviceId recherché:',
                    deviceIdStr
                );

                if (layerDeviceId === deviceIdStr) {
                    console.log('Marqueur NebuleAir trouvé !');
                    console.log('Détails du marqueur:', layer);
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
                        console.log(
                            'Recherche texte - Layer ID:',
                            textLayerDeviceId
                        );

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            console.log('Marqueur de texte trouvé');
                            textMarker = textLayer;
                        }
                    });

                    // Mise en évidence du marqueur
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    nebuleAirMarkerState.selectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        nebuleAirMarkerState.selectedText = textMarker;
                    }

                    found = true;

                    // Réouverture du panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        console.log('Réouverture du panneau NebuleAir');
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
        // Recherche dans la couche AtmoSud MicroStations
        else if (deviceIdStr.indexOf('micro') >= 0) {
            console.log('Recherche dans la couche AtmoSud MicroStations');
            atmoMicroLayer.eachLayer(function (layer) {
                if (!layer._icon) {
                    console.log('Marqueur sans icône ignoré');
                    return;
                }

                const layerDeviceId = String(
                    (layer.options && layer.options.deviceId) || layer.deviceId
                );
                console.log(
                    'Comparaison MicroStation - Layer ID:',
                    layerDeviceId,
                    'vs DeviceId recherché:',
                    deviceIdStr
                );

                if (layerDeviceId === deviceIdStr) {
                    console.log('Marqueur MicroStation trouvé !');
                    console.log('Détails du marqueur:', layer);
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
                        console.log(
                            'Recherche texte - Layer ID:',
                            textLayerDeviceId
                        );

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            console.log('Marqueur de texte trouvé');
                            textMarker = textLayer;
                        }
                    });

                    // Mise en évidence du marqueur
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    state.selectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        state.selectedText = textMarker;
                    }

                    found = true;

                    // Réouverture du panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        console.log('Réouverture du panneau MicroStation');
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
        // Recherche dans la couche AtmoSud Stations de Référence
        else if (deviceIdStr.startsWith('FR')) {
            console.log(
                'Recherche dans la couche AtmoSud Stations de Référence'
            );
            atmoRefLayer.eachLayer(function (layer) {
                if (!layer._icon) {
                    console.log('Marqueur sans icône ignoré');
                    return;
                }

                const layerDeviceId = String(
                    (layer.options && layer.options.deviceId) || layer.deviceId
                );
                console.log(
                    'Comparaison Station Ref - Layer ID:',
                    layerDeviceId,
                    'vs DeviceId recherché:',
                    deviceIdStr
                );

                if (layerDeviceId === deviceIdStr) {
                    console.log('Marqueur Station Ref trouvé !');
                    console.log('Détails du marqueur:', layer);
                    toastManager.sensorSelected(
                        layer.options.name || 'Station de Référence AtmoSud'
                    );

                    // Recherche du marqueur de texte correspondant
                    let textMarker = null;
                    atmoRefLayer.eachLayer(function (textLayer) {
                        if (!textLayer._icon) return;

                        const textLayerDeviceId =
                            (textLayer.options && textLayer.options.deviceId) ||
                            textLayer.deviceId;
                        console.log(
                            'Recherche texte - Layer ID:',
                            textLayerDeviceId
                        );

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            console.log('Marqueur de texte trouvé');
                            textMarker = textLayer;
                        }
                    });

                    // Mise en évidence du marqueur
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    refMarkerState.selectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        refMarkerState.selectedText = textMarker;
                    }

                    found = true;

                    // Réouverture du panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        console.log(
                            'Réouverture du panneau Station de Référence'
                        );
                        openSidePanel_stationRef(
                            deviceId,
                            layer.deviceData.nom_station,
                            getArrayFromLocalStorage('mesuresLocal')
                        );
                    }

                    return false;
                }
            });
        }
        // Recherche dans la couche PurpleAir
        else if (deviceIdStr.indexOf('purpleair') >= 0) {
            console.log('Recherche dans la couche PurpleAir');
            purpleair_layer.eachLayer(function (layer) {
                if (!layer._icon) {
                    console.log('Marqueur sans icône ignoré');
                    return;
                }

                const layerDeviceId = String(
                    (layer.options && layer.options.deviceId) || layer.deviceId
                );
                console.log(
                    'Comparaison PurpleAir - Layer ID:',
                    layerDeviceId,
                    'vs DeviceId recherché:',
                    deviceIdStr
                );

                if (layerDeviceId === deviceIdStr) {
                    console.log('Marqueur PurpleAir trouvé !');
                    console.log('Détails du marqueur:', layer);
                    toastManager.sensorSelected(
                        layer.options.name || 'Capteur PurpleAir'
                    );

                    // Recherche du marqueur de texte correspondant
                    let textMarker = null;
                    purpleair_layer.eachLayer(function (textLayer) {
                        if (!textLayer._icon) return;

                        const textLayerDeviceId =
                            (textLayer.options && textLayer.options.deviceId) ||
                            textLayer.deviceId;
                        console.log(
                            'Recherche texte - Layer ID:',
                            textLayerDeviceId
                        );

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            console.log('Marqueur de texte trouvé');
                            textMarker = textLayer;
                        }
                    });

                    // Mise en évidence du marqueur
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    state.selectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        state.selectedText = textMarker;
                    }

                    found = true;

                    // Réouverture du panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        console.log('Réouverture du panneau PurpleAir');
                        openSidePanelPurpleAir(
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
        // Recherche dans la couche Sensor.Community
        else if (deviceIdStr.indexOf('sensor_community') >= 0) {
            console.log('Recherche dans la couche Sensor.Community');
            sensorCommunityLayer.eachLayer(function (layer) {
                if (!layer._icon) {
                    console.log('Marqueur sans icône ignoré');
                    return;
                }

                const layerDeviceId = String(
                    (layer.options && layer.options.deviceId) || layer.deviceId
                );
                console.log(
                    'Comparaison Sensor.Community - Layer ID:',
                    layerDeviceId,
                    'vs DeviceId recherché:',
                    deviceIdStr
                );

                if (layerDeviceId === deviceIdStr) {
                    console.log('Marqueur Sensor.Community trouvé !');
                    console.log('Détails du marqueur:', layer);
                    toastManager.sensorSelected(
                        layer.options.name || 'Capteur Sensor.Community'
                    );

                    // Recherche du marqueur de texte correspondant
                    let textMarker = null;
                    sensorCommunityLayer.eachLayer(function (textLayer) {
                        if (!textLayer._icon) return;

                        const textLayerDeviceId =
                            (textLayer.options && textLayer.options.deviceId) ||
                            textLayer.deviceId;
                        console.log(
                            'Recherche texte - Layer ID:',
                            textLayerDeviceId
                        );

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            console.log('Marqueur de texte trouvé');
                            textMarker = textLayer;
                        }
                    });

                    // Mise en évidence du marqueur
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    sensorCommunityMarkerState.selectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        sensorCommunityMarkerState.selectedText = textMarker;
                    }

                    found = true;

                    // Réouverture du panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        console.log('Réouverture du panneau Sensor.Community');
                        displaySensorCommunityHistoricalData(
                            deviceId,
                            getArrayFromLocalStorage('mesuresLocal')[0],
                            '24h'
                        );
                    }

                    return false;
                }
            });
        }
        // Si aucun préfixe spécifique n'est trouvé, chercher dans toutes les couches
        else {
            console.log(
                'Aucun préfixe spécifique trouvé, recherche dans toutes les couches'
            );

            // Recherche dans atmoRefLayer
            atmoRefLayer.eachLayer(function (layer) {
                if (!layer._icon) return;
                const layerDeviceId = String(
                    (layer.options && layer.options.deviceId) || layer.deviceId
                );
                console.log(
                    'Comparaison Station Ref - Layer ID:',
                    layerDeviceId,
                    'vs DeviceId recherché:',
                    deviceIdStr
                );
                if (layerDeviceId === deviceIdStr) {
                    console.log('Marqueur trouvé dans atmoRefLayer !');
                    found = true;
                    // ... reste du code existant ...
                }
            });

            // Recherche dans atmoMicroLayer
            if (!found) {
                atmoMicroLayer.eachLayer(function (layer) {
                    if (!layer._icon) return;
                    const layerDeviceId = String(
                        (layer.options && layer.options.deviceId) ||
                            layer.deviceId
                    );
                    console.log(
                        'Comparaison MicroStation - Layer ID:',
                        layerDeviceId,
                        'vs DeviceId recherché:',
                        deviceIdStr
                    );
                    if (layerDeviceId === deviceIdStr) {
                        console.log('Marqueur trouvé dans atmoMicroLayer !');
                        console.log('Détails du marqueur:', layer);

                        // Mise en évidence du marqueur
                        layer.setZIndexOffset(1000);
                        if (layer._icon) {
                            layer._icon.classList.add('marker-selected');
                        }
                        state.selectedMarker = layer;

                        // Recherche du marqueur de texte correspondant
                        let textMarker = null;
                        atmoMicroLayer.eachLayer(function (textLayer) {
                            if (!textLayer._icon) return;
                            const textLayerDeviceId = String(
                                (textLayer.options &&
                                    textLayer.options.deviceId) ||
                                    textLayer.deviceId
                            );
                            if (
                                textLayerDeviceId === deviceIdStr &&
                                textLayer !== layer
                            ) {
                                console.log('Marqueur de texte trouvé');
                                textMarker = textLayer;
                            }
                        });

                        if (textMarker) {
                            textMarker.setZIndexOffset(1000);
                            if (textMarker._icon) {
                                textMarker._icon.classList.add(
                                    'marker-selected'
                                );
                            }
                            state.selectedText = textMarker;
                        }

                        found = true;

                        // Réouverture du panneau latéral si nécessaire
                        if (
                            document.getElementById('side-panel').style
                                .display === 'none' &&
                            layer.deviceData
                        ) {
                            console.log('Réouverture du panneau MicroStation');
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
        }

        // Si le marqueur n'est pas trouvé, tentative de restauration avec les données stockées
        if (!found) {
            console.warn(
                '%c[findAndHighlightMarker] Marqueur non trouvé',
                'color: red; font-weight: bold'
            );
            console.log('DeviceId non trouvé:', deviceIdStr);
            console.log('Type de deviceId:', typeof deviceIdStr);
            console.log(
                'Données stockées disponibles:',
                window.lastSelectedDeviceData
            );

            if (window.lastSelectedDeviceData) {
                console.log(
                    'Tentative de restauration avec les données stockées'
                );
                console.log('Données stockées:', window.lastSelectedDeviceData);
                // ... reste du code existant ...
            } else {
                console.log(
                    'Aucune donnée stockée disponible pour la restauration'
                );
            }
        }
    }, 2000);
}
