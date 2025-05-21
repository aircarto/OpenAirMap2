import { atmoMicroLayer } from './layers.js';
import { getColorCodeForValue, getArrayFromLocalStorage } from './utils.js';
import { state, openSidePanelMicroStation } from './atmoSud_microStations.js';
import { openSidePanel_stationRef } from './atmoSud_stationsRef.js';
import { formatPollutantName } from './utils.js';
import { mesures as supportedMesures } from './appConfig.js';

// État global pour les marqueurs
const markerState = {
    markers: {},
};

// État global pour les marqueurs de référence
const refMarkerState = {
    markers: {},
    selectedMarker: null,
    selectedText: null,
    selectedDeviceId: null,
};

/**
 * Initialise les marqueurs pour les micro-stations
 * @param {Array} dataCapteurSite - Données des capteurs
 */
export function initializeMicroStationMarkers(dataCapteurSite) {
    if (!window.microStationMarkers) {
        window.microStationMarkers = {};
    }
    window.microStationMarkers = {};

    dataCapteurSite.forEach((capteur) => {
        window.microStationMarkers[capteur.id_site] = {
            data: capteur,
            hasValue: false,
            marker: null,
            textMarker: null,
        };
    });
}

/**
 * Traite et affiche les stations sur la carte
 * @param {Array} filteredData - Données filtrées des stations
 * @param {Array} dataCapteurSite - Données des capteurs
 * @param {string} pas_de_temps_atmo - Pas de temps Atmo
 */
export async function processAndDisplayStations(
    filteredData,
    dataCapteurSite,
    pas_de_temps_atmo
) {
    for (const value of filteredData) {
        if (!validateStationData(value)) continue;

        updateStationMarker(value);
        const { microStationMarker, textMarker } = createStationMarkers(value);
        setupMarkerEvents(
            microStationMarker,
            textMarker,
            value,
            dataCapteurSite,
            pas_de_temps_atmo
        );
    }

    createDefaultMarkers(dataCapteurSite, pas_de_temps_atmo);
}

/**
 * Valide les données d'une station
 * @param {Object} value - Données de la station
 * @returns {boolean}
 */
function validateStationData(value) {
    if (!value || !value.id_site || !value.lat || !value.lon) {
        console.warn('Données incomplètes pour un capteur:', value);
        return false;
    }
    return true;
}

/**
 * Met à jour les données d'un marqueur de station
 * @param {Object} value - Données de la station
 */
function updateStationMarker(value) {
    if (!window.microStationMarkers[value.id_site]) {
        window.microStationMarkers[value.id_site] = {
            data: value,
            hasValue: false,
            marker: null,
            textMarker: null,
        };
    }
    window.microStationMarkers[value.id_site].data = value;
    window.microStationMarkers[value.id_site].hasValue = true;
}

/**
 * Crée les marqueurs pour une station
 * @param {Object} value - Données de la station
 * @returns {Object} - Marqueurs créés
 */
function createStationMarkers(value) {
    const icon_param = createMarkerIcon(value);
    const microStationMarker = L.marker([value.lat, value.lon], {
        icon: L.icon(icon_param),
        zIndexOffset: 1000,
    }).addTo(atmoMicroLayer);

    microStationMarker.deviceId = value.id_site;
    microStationMarker.deviceData = value;

    const textMarker = createTextMarker(value);
    textMarker.addTo(atmoMicroLayer);

    microStationMarker.on('add', () => {
        const zIndex = microStationMarker.getZIndex();
        textMarker.setZIndexOffset(zIndex);
    });

    window.microStationMarkers[value.id_site].marker = microStationMarker;
    window.microStationMarkers[value.id_site].textMarker = textMarker;

    return { microStationMarker, textMarker };
}

/**
 * Crée l'icône pour un marqueur
 * @param {Object} value - Données de la station
 * @returns {Object} - Paramètres de l'icône
 */
function createMarkerIcon(value) {
    const icon_param = {
        iconUrl: 'img/microStationsAtmoSud/microStationAtmoSud_default.png',
        iconSize: [50, 50],
        iconAnchor: [5, 40],
        popupAnchor: [0, -10],
        tooltipAnchor: [-50, -10],
    };

    const valueToCheck = value.valeur_ref;
    const colorCode = getColorCodeForValue(valueToCheck, state.mesuresArray[0]);

    if (colorCode !== 'default') {
        const iconColorCode =
            colorCode === 'tres_mauvais'
                ? 'tresMauvais'
                : colorCode === 'extr_mauvais'
                  ? 'ExtrMauvais'
                  : colorCode;
        icon_param.iconUrl = `img/microStationsAtmoSud/microStationAtmoSud_${iconColorCode}.png`;
    }

    return icon_param;
}

/**
 * Calcule les paramètres de texte pour un marqueur
 * @param {number} value - Valeur à afficher
 * @returns {Object} - Paramètres de texte
 */
function calculateTextParameters(value) {
    let textSize = 32;
    let x_position = 5;
    let y_position = 42;
    let checkPosition = 'right: 0px;';

    if (value >= 1000) {
        textSize = 16;
        x_position = 8;
        y_position = 42;
    } else if (value >= 100) {
        textSize = 20;
        x_position = 6;
        y_position = 42;
    } else if (value >= 10) {
        textSize = 26;
        x_position = 8;
        y_position = 42;
    }

    return { textSize, x_position, y_position, checkPosition };
}

/**
 * Crée le HTML pour un marqueur de texte
 * @param {number} value - Valeur à afficher
 * @param {number} textSize - Taille du texte
 * @param {string} checkPosition - Position de l'icône de vérification
 * @param {Object} stationData - Données de la station
 * @returns {string} - HTML du marqueur
 */
function createTextMarkerHTML(value, textSize, checkPosition, stationData) {
    const hasValue = stationData.valeur !== null;
    const checkIcon = hasValue
        ? `<i class="bi bi-check-circle-fill" style="position: absolute; top: -10px; ${checkPosition} font-size: 14px; color: #28a745;"></i>`
        : '';

    return `<div id="textDiv" style="font-size: ${textSize}px; position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #333; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">
        ${value}
        ${checkIcon}
    </div>`;
}

/**
 * Crée un marqueur de texte
 * @param {Object} value - Données de la station
 * @returns {L.Marker} - Marqueur de texte
 */
function createTextMarker(value) {
    const roundedvalue = Math.round(parseFloat(value.valeur_ref));
    const { textSize, x_position, y_position, checkPosition } =
        calculateTextParameters(roundedvalue);

    const text_param = L.divIcon({
        className: 'my-div-icon',
        html: createTextMarkerHTML(
            roundedvalue,
            textSize,
            checkPosition,
            value
        ),
        iconAnchor: [x_position, y_position],
        popupAnchor: [30, -60],
        iconSize: [50, 50],
    });

    const textMarker = L.marker([value.lat, value.lon], {
        icon: text_param,
        zIndexOffset: 1000,
    });
    textMarker.deviceId = value.id_site;
    textMarker.deviceData = value;

    return textMarker;
}

/**
 * Configure les événements pour les marqueurs
 * @param {L.Marker} microStationMarker - Marqueur principal
 * @param {L.Marker} textMarker - Marqueur de texte
 * @param {Object} value - Données de la station
 * @param {Array} dataCapteurSite - Données des capteurs
 * @param {string} pas_de_temps_atmo - Pas de temps Atmo
 */
function setupMarkerEvents(
    microStationMarker,
    textMarker,
    value,
    dataCapteurSite,
    pas_de_temps_atmo
) {
    const highlightMarker = () => {
        const zIndex = 2000;
        microStationMarker.setZIndexOffset(zIndex);
        textMarker.setZIndexOffset(zIndex);
        const tooltip = createTooltip(value, dataCapteurSite);
        document.body.appendChild(tooltip);
        microStationMarker.tooltip = tooltip;
        textMarker.tooltip = tooltip;
    };

    const resetMarker = () => {
        if (state.selectedMarker !== microStationMarker) {
            const zIndex = 1000;
            microStationMarker.setZIndexOffset(zIndex);
            textMarker.setZIndexOffset(zIndex);
        }
        if (microStationMarker.tooltip) {
            microStationMarker.tooltip.remove();
            microStationMarker.tooltip = null;
            textMarker.tooltip = null;
        }
    };

    microStationMarker
        .on('mouseover', highlightMarker)
        .on('mouseout', resetMarker);
    textMarker
        .on('mouseover', highlightMarker)
        .on('mouseout', resetMarker)
        .on('click', () =>
            handleMarkerClick(
                microStationMarker,
                textMarker,
                value,
                pas_de_temps_atmo
            )
        );
}

/**
 * Crée les marqueurs par défaut
 * @param {Array} dataCapteurSite - Données des capteurs
 * @param {string} pas_de_temps_atmo - Pas de temps Atmo
 */
function createDefaultMarkers(dataCapteurSite, pas_de_temps_atmo) {
    const pas_de_temps = getArrayFromLocalStorage('pasDeTempsLocal');

    Object.values(window.microStationMarkers).forEach((station) => {
        if (!station.hasValue) {
            if (pas_de_temps[0] === '2min') {
                if (station.data.modele_capteur === 'NebuleAir') {
                    const defaultMarker = createDefaultMarker(
                        station.data,
                        dataCapteurSite,
                        pas_de_temps_atmo
                    );
                    station.marker = defaultMarker;
                }
            } else {
                const defaultMarker = createDefaultMarker(
                    station.data,
                    dataCapteurSite,
                    pas_de_temps_atmo
                );
                station.marker = defaultMarker;
            }
        }
    });
}

/**
 * Crée un marqueur par défaut
 * @param {Object} stationData - Données de la station
 * @param {Array} dataCapteurSite - Données des capteurs
 * @param {string} pas_de_temps_atmo - Pas de temps Atmo
 * @returns {L.Marker} - Marqueur créé
 */
function createDefaultMarker(stationData, dataCapteurSite, pas_de_temps_atmo) {
    const defaultMarker = L.marker([stationData.lat, stationData.lon], {
        icon: L.icon({
            iconUrl: 'img/microStationsAtmoSud/microStationAtmoSud_default.png',
            iconSize: [50, 50],
            iconAnchor: [5, 40],
            popupAnchor: [0, -10],
            tooltipAnchor: [-50, -10],
        }),
    }).addTo(atmoMicroLayer);

    defaultMarker.deviceId = stationData.id_site;
    defaultMarker.deviceData = stationData;

    defaultMarker
        .on('click', () =>
            handleMarkerClick(
                defaultMarker,
                null,
                stationData,
                pas_de_temps_atmo
            )
        )
        .on('mouseover', () => {
            defaultMarker.setZIndexOffset(1000);
            const tooltip = createTooltip(stationData, dataCapteurSite);
            document.body.appendChild(tooltip);
            defaultMarker.tooltip = tooltip;
        })
        .on('mouseout', () => {
            if (state.selectedMarker !== defaultMarker) {
                defaultMarker.setZIndexOffset(0);
            }
            if (defaultMarker.tooltip) {
                defaultMarker.tooltip.remove();
                defaultMarker.tooltip = null;
            }
        });

    return defaultMarker;
}

/**
 * Gère le clic sur un marqueur
 * @param {L.Marker} marker - Marqueur cliqué
 * @param {L.Marker} textMarker - Marqueur de texte
 * @param {Object} stationData - Données de la station
 * @param {string} pas_de_temps_atmo - Pas de temps Atmo
 */
function handleMarkerClick(marker, textMarker, stationData, pas_de_temps_atmo) {
    console.log('click on micro station:', stationData.nom_site);

    resetPreviousMarker();
    highlightNewMarker(marker, textMarker);
    updateGlobalState(marker, textMarker, stationData);
    openSidePanelMicroStation(
        stationData,
        pas_de_temps_atmo,
        state.historiqueChart,
        state.mesuresArray
    );
}

/**
 * Réinitialise le marqueur précédemment sélectionné
 */
function resetPreviousMarker() {
    if (state.selectedMarker && state.selectedMarker._icon) {
        state.selectedMarker.setZIndexOffset(0);
        state.selectedMarker._icon.classList.remove('marker-selected');
    }

    if (state.selectedText && state.selectedText._icon) {
        state.selectedText.setZIndexOffset(0);
        state.selectedText._icon.classList.remove('marker-selected');
    }
}

/**
 * Met en évidence un nouveau marqueur
 * @param {L.Marker} marker - Marqueur à mettre en évidence
 * @param {L.Marker} textMarker - Marqueur de texte à mettre en évidence
 */
function highlightNewMarker(marker, textMarker) {
    marker.setZIndexOffset(1000);
    if (marker._icon) {
        marker._icon.classList.add('marker-selected');
    }

    if (textMarker) {
        textMarker.setZIndexOffset(1000);
        if (textMarker._icon) {
            textMarker._icon.classList.add('marker-selected');
        }
    }
}

/**
 * Met à jour l'état global
 * @param {L.Marker} marker - Marqueur sélectionné
 * @param {L.Marker} textMarker - Marqueur de texte sélectionné
 * @param {Object} stationData - Données de la station
 */
function updateGlobalState(marker, textMarker, stationData) {
    state.selectedMarker = marker;
    state.selectedText = textMarker;
    state.selectedDeviceId = stationData.id_site;
    window.lastSelectedDeviceData = stationData;
}

/**
 * Crée un tooltip pour une station
 * @param {Object} stationData - Données de la station
 * @param {Array} dataCapteurSite - Données des capteurs
 * @returns {HTMLElement} - Élément tooltip
 */
function createTooltip(stationData, dataCapteurSite) {
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';

    const polluantsActifs = getActivePollutants(stationData, dataCapteurSite);
    const formattedPollutants = formatPollutantsList(
        polluantsActifs,
        stationData
    );

    tooltip.innerHTML = createTooltipHTML(stationData, formattedPollutants);
    tooltip.style.cssText = getTooltipStyles();

    return tooltip;
}

/**
 * Récupère les polluants actifs pour une station
 * @param {Object} stationData - Données de la station
 * @param {Array} dataCapteurSite - Données des capteurs
 * @returns {Array} - Liste des polluants actifs
 */
function getActivePollutants(stationData, dataCapteurSite) {
    const capteurInfo = dataCapteurSite?.find(
        (capteur) => capteur.id_site === stationData.id_site
    );

    if (capteurInfo?.variables) {
        return Array.isArray(capteurInfo.variables)
            ? capteurInfo.variables
            : capteurInfo.variables.split(',').map((v) => v.trim());
    }

    if (stationData.variables) {
        return Array.isArray(stationData.variables)
            ? stationData.variables
            : stationData.variables.split(',').map((v) => v.trim());
    }

    return [];
}

/**
 * Formate la liste des polluants
 * @param {Array} polluantsActifs - Liste des polluants actifs
 * @param {Object} stationData - Données de la station
 * @returns {Array} - Liste des polluants formatés
 */
function formatPollutantsList(polluantsActifs, stationData) {
    const processedPollutants = new Set();

    const formattedPollutants = polluantsActifs
        .filter((polluant) => {
            const normalizedPolluant = normalizePollutantName(polluant);
            if (
                !normalizedPolluant ||
                processedPollutants.has(normalizedPolluant)
            ) {
                return false;
            }

            const isSupported = Object.values(supportedMesures).some(
                (mesure) => mesure.code === normalizedPolluant
            );

            if (isSupported) {
                processedPollutants.add(normalizedPolluant);
            }

            return isSupported;
        })
        .map((polluant) => formatPollutantDisplay(polluant));

    stationData.polluantMesure = Array.from(processedPollutants).map((p) =>
        p.toUpperCase()
    );
    return formattedPollutants;
}

/**
 * Normalise le nom d'un polluant
 * @param {string} polluant - Nom du polluant
 * @returns {string} - Nom normalisé
 */
function normalizePollutantName(polluant) {
    return polluant
        .toLowerCase()
        .replace('pm2.5', 'pm25')
        .replace('pm1.0', 'pm1')
        .replace('pm10.0', 'pm10')
        .replace('air pres.', '')
        .replace('air temp.', '')
        .replace('air hum.', '')
        .replace(' nombre', '')
        .trim();
}

/**
 * Formate l'affichage d'un polluant
 * @param {string} polluant - Nom du polluant
 * @returns {string} - HTML formaté
 */
function formatPollutantDisplay(polluant) {
    const normalizedPolluant = normalizePollutantName(polluant);

    const pollutantFormats = {
        pm1: '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>1</sub></span>',
        pm25: '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>2.5</sub></span>',
        pm10: '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>10</sub></span>',
        no2: '<span class="text-muted">●</span> <span class="fw-semibold">NO<sub>2</sub></span>',
        so2: '<span class="text-muted">●</span> <span class="fw-semibold">SO<sub>2</sub></span>',
        o3: '<span class="text-muted">●</span> <span class="fw-semibold">O<sub>3</sub></span>',
        h2s: '<span class="text-muted">●</span> <span class="fw-semibold">H<sub>2</sub>S</span>',
        nh3: '<span class="text-muted">●</span> <span class="fw-semibold">NH<sub>3</sub></span>',
    };

    return (
        pollutantFormats[normalizedPolluant] ||
        `<span class="text-muted">●</span> <span class="fw-semibold">${formatPollutantName(polluant)}</span>`
    );
}

/**
 * Crée le HTML pour un tooltip
 * @param {Object} stationData - Données de la station
 * @param {Array} formattedPollutants - Liste des polluants formatés
 * @returns {string} - HTML du tooltip
 */
function createTooltipHTML(stationData, formattedPollutants) {
    return `
        <div class="card border-0 shadow-sm">
            <div class="card-body p-2">
                <h6 class="card-title mb-1">${stationData.nom_site}</h6>
                <div class="d-flex flex-column">
                    ${
                        stationData.time
                            ? `
                        <small class="text-muted mb-1">
                            <i class="bi bi-clock me-1"></i>
                            Dernière mise à jour: ${new Date(stationData.time).toLocaleString()}
                        </small>
                    `
                            : ''
                    }
                    <small class="text-muted mb-1">
                        <i class="bi bi-info-circle me-1"></i>
                        ${stationData.modele_capteur || ''} - ${stationData.marque_capteur || ''}
                    </small>
                    <small class="text-muted">
                        Polluants mesurés:<br>
                        ${formattedPollutants.join('<br>')}
                    </small>
                </div>
            </div>
        </div>
    `;
}

/**
 * Récupère les styles CSS pour un tooltip
 * @returns {string} - Styles CSS
 */
function getTooltipStyles() {
    return `
        position: fixed;
        z-index: 10000;
        pointer-events: none;
        bottom: 20px;
        right: 20px;
        background-color: white;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: opacity 0.2s;
        opacity: 1;
    `;
}

/**
 * Crée un marqueur pour une station de référence
 * @param {Object} value - Données de la station
 * @param {Object} iconParam - Paramètres de l'icône
 * @param {Object} stationData - Données de la station
 * @param {Array} mesure - Mesures sélectionnées
 */
export function createRefStationMarker(value, iconParam, stationData, mesure) {
    // Supprimer le marqueur par défaut s'il existe
    if (window.stationMarkers[value.id_station]?.marker) {
        window.atmoRefLayer.removeLayer(
            window.stationMarkers[value.id_station].marker
        );
    }

    const stationMarker = L.marker(
        [stationData.latitude, stationData.longitude],
        {
            icon: L.icon(iconParam),
        }
    );

    const textSize = getRefTextSize(value.valeur);
    const textPosition = getRefTextPosition(value.valeur);

    const textParam = L.divIcon({
        className: 'my-div-icon',
        html: `<div id="textDiv" style="font-size: ${textSize}px; text-align: center; width: 50px; margin-left: -25px;">${Math.round(value.valeur)}</div>`,
        iconAnchor: textPosition,
        popupAnchor: [30, -60],
    });

    const textMarker = L.marker([stationData.latitude, stationData.longitude], {
        icon: textParam,
    });

    setupRefMarkerEvents(stationMarker, textMarker, value, mesure);
    window.stationMarkers[value.id_station] = {
        marker: stationMarker,
        textMarker: textMarker,
        data: stationData,
        hasValue: true,
    };

    window.atmoRefLayer.addLayer(stationMarker);
    window.atmoRefLayer.addLayer(textMarker);
}

/**
 * Configure les événements pour les marqueurs de référence
 * @param {Object} stationMarker - Marqueur de la station
 * @param {Object} textMarker - Marqueur de texte
 * @param {Object} value - Données de la station
 * @param {Array} mesure - Mesures sélectionnées
 */
function setupRefMarkerEvents(stationMarker, textMarker, value, mesure) {
    const clickHandler = () => {
        if (
            refMarkerState.selectedMarker &&
            refMarkerState.selectedMarker !== stationMarker
        ) {
            refMarkerState.selectedMarker.setZIndexOffset(0);
            if (refMarkerState.selectedMarker._icon) {
                refMarkerState.selectedMarker._icon.classList.remove(
                    'marker-selected'
                );
            }
        }

        if (
            refMarkerState.selectedText &&
            refMarkerState.selectedText !== textMarker
        ) {
            refMarkerState.selectedText.setZIndexOffset(0);
            if (refMarkerState.selectedText._icon) {
                refMarkerState.selectedText._icon.classList.remove(
                    'marker-selected'
                );
            }
        }

        stationMarker.setZIndexOffset(1000);
        textMarker.setZIndexOffset(1000);
        if (stationMarker._icon) {
            stationMarker._icon.classList.add('marker-selected');
        }
        if (textMarker._icon) {
            textMarker._icon.classList.add('marker-selected');
        }

        refMarkerState.selectedMarker = stationMarker;
        refMarkerState.selectedText = textMarker;
        window.globalSelectedDeviceId = value.id_station;
        window.lastSelectedDeviceData = value;
        refMarkerState.lastSelectedStationData = value;

        console.log('Click on station: ' + value.id_station);
        openSidePanel_stationRef(
            value.id_station,
            value.nom_station,
            getArrayFromLocalStorage('mesuresLocal')
        );
    };

    stationMarker.on('click', clickHandler);
    textMarker.on('click', clickHandler);
}

/**
 * Détermine la taille du texte pour les marqueurs de référence
 * @param {number} valeur - Valeur du polluant
 * @returns {number} Taille du texte
 */
function getRefTextSize(valeur) {
    if (valeur > 99.4) return 24;
    if (valeur > 9.4) return 28;
    return 32;
}

/**
 * Détermine la position du texte pour les marqueurs de référence
 * @param {number} valeur - Valeur du polluant
 * @returns {Array} Position [x, y]
 */
function getRefTextPosition(valeur) {
    if (valeur > 99.4) return [-17, 37];
    if (valeur > 9.4) return [-17, 37];
    return [-20, 37];
}

/**
 * Crée les marqueurs par défaut pour les stations de référence
 */
export function createRefDefaultMarkers() {
    if (!window.stationsRef) {
        window.stationsRef = [];
    }

    window.stationsRef.forEach((station) => {
        if (!window.stationMarkers[station.id_station]?.marker) {
            const defaultMarker = L.marker(
                [station.latitude, station.longitude],
                {
                    icon: L.icon({
                        iconUrl:
                            'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                        iconSize: [50, 50],
                        iconAnchor: [25, 25],
                        popupAnchor: [0, -10],
                        tooltipAnchor: [-50, -10],
                        className: station.id_station,
                    }),
                }
            );

            window.atmoRefLayer.addLayer(defaultMarker);

            defaultMarker.on('click', () => {
                if (
                    refMarkerState.selectedMarker &&
                    refMarkerState.selectedMarker !== defaultMarker
                ) {
                    refMarkerState.selectedMarker.setZIndexOffset(0);
                    if (refMarkerState.selectedMarker._icon) {
                        refMarkerState.selectedMarker._icon.classList.remove(
                            'marker-selected'
                        );
                    }
                }

                if (refMarkerState.selectedText) {
                    refMarkerState.selectedText.setZIndexOffset(0);
                    if (refMarkerState.selectedText._icon) {
                        refMarkerState.selectedText._icon.classList.remove(
                            'marker-selected'
                        );
                    }
                }

                refMarkerState.selectedMarker = defaultMarker;
                refMarkerState.selectedText = null;
                window.globalSelectedDeviceId = station.id_station;
                refMarkerState.lastSelectedStationData = station;

                console.log('Click on station: ' + station.id_station);
                openSidePanel_stationRef(
                    station.id_station,
                    station.nom_station,
                    getArrayFromLocalStorage('mesuresLocal')
                );
            });

            window.stationMarkers[station.id_station].marker = defaultMarker;
        }
    });
}

// Export des variables d'état
export { refMarkerState };
