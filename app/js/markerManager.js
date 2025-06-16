import { atmoMicroLayer } from './layers.js';
import { getColorCodeForValue, getArrayFromLocalStorage } from './utils.js';
import { state, openSidePanelMicroStation } from './atmoSud_microStations.js';
import { openSidePanelStationRef } from './atmoSud_stationsRef.js';
import { formatPollutantName } from './utils.js';
import { mesures as supportedMesures } from './appConfig.js';
import { openSidePanelNebuleAir } from './NebuleAir.js';
import { sensorCommunityLayer } from './layers.js';
import {
    displaySensorCommunityHistoricalData,
    displaySensorCommunityGrafana,
} from './sensorCommunity.js';

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

/**############################################################################
 *                    MARQUEURS MICROSTATIONS ATMOSUD
 * ############################################################################
 */

/**
 * Initialise les marqueurs pour les microstations AtmoSud
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
 * Traite et affiche les stations sur la carte microstation atmosud
 * @param {Array} filteredData - Données filtrées des stations
 * @param {Array} dataCapteurSite - Données des capteurs
 * @param {string} pasDeTempsAtmo - Pas de temps Atmo
 */
export async function processAndDisplayStations(
    filteredData,
    dataCapteurSite,
    pasDeTempsAtmo
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
            pasDeTempsAtmo
        );
    }

    createDefaultMarkers(dataCapteurSite, pasDeTempsAtmo);
}

/**
 * Valide les données d'une station microstation atmosud
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
 * Met à jour les données d'un marqueur de station microstation atmosud
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
 * Crée les marqueurs pour un microcapteur atmosud
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
 * Crée l'icône pour un marqueur microstation atmosud
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
            colorCode === 'tresMauvais'
                ? 'tresMauvais'
                : colorCode === 'extrMauvais'
                  ? 'ExtrMauvais'
                  : colorCode;
        icon_param.iconUrl = `img/microStationsAtmoSud/microStationAtmoSud_${iconColorCode}.png`;
    }

    return icon_param;
}

/**
 * Calcule les paramètres de texte pour un marqueur microstation atmosud
 * @param {number} value - Valeur à afficher
 * @returns {Object} - Paramètres de texte
 */
function calculateTextParameters(value) {
    let textSize = 32;
    let x_position = 5;
    let y_position = 42;
    const checkPosition = 'right: 21px;';

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
        ? `<span style="
            position: absolute; 
            top: -13px; 
            ${checkPosition}; 
            background: white; 
            border-radius: 25px; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center;
            width: 10px;
            height: 15px;
            opacity: 0.6;
            box-shadow: 0 0 4px rgba(0,0,0,0.1); 
            z-index: 10;">
                <i class="bi bi-shield-fill-check" style="font-size: 18px; color: #0074D9; line-height: 1; "></i>
          </span>`
        : '';

    return `<div id="textDiv" style="font-size: ${textSize}px; position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #333; ">
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
 * @param {string} pasDeTempsAtmo - Pas de temps Atmo
 */
function setupMarkerEvents(
    microStationMarker,
    textMarker,
    value,
    dataCapteurSite,
    pasDeTempsAtmo
) {
    const highlightMarker = (e) => {
        const zIndex = 2000;
        microStationMarker.setZIndexOffset(zIndex);
        textMarker.setZIndexOffset(zIndex);
        const tooltip = createTooltip(value, dataCapteurSite);
        document.body.appendChild(tooltip);
        microStationMarker.tooltip = tooltip;
        textMarker.tooltip = tooltip;

        // Ajouter l'événement mousemove pour mettre à jour la position du tooltip
        const mousemoveHandler = (e) => updateTooltipPosition(e, tooltip);
        document.addEventListener('mousemove', mousemoveHandler);
        tooltip.mousemoveHandler = mousemoveHandler;

        // Positionner initialement le tooltip
        updateTooltipPosition(e, tooltip);
    };

    const resetMarker = () => {
        if (state.selectedMarker !== microStationMarker) {
            const zIndex = 1000;
            microStationMarker.setZIndexOffset(zIndex);
            textMarker.setZIndexOffset(zIndex);
        }
        if (microStationMarker.tooltip) {
            // Supprimer l'événement mousemove
            if (microStationMarker.tooltip.mousemoveHandler) {
                document.removeEventListener(
                    'mousemove',
                    microStationMarker.tooltip.mousemoveHandler
                );
            }
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
                pasDeTempsAtmo
            )
        );
}

/**
 * Crée les marqueurs par défaut
 * condition spécifique pour capteur type nebuleair et pas de temps 2min
 * trigger createDefaultMarker function
 * @param {Array} dataCapteurSite - Données des capteurs
 * @param {string} pasDeTempsAtmo - Pas de temps Atmo
 */
function createDefaultMarkers(dataCapteurSite, pasDeTempsAtmo) {
    const pasDeTemps = getArrayFromLocalStorage('pasDeTempsLocal');

    Object.values(window.microStationMarkers).forEach((station) => {
        if (!station.hasValue) {
            if (pasDeTemps[0] === '2min') {
                if (station.data.modele_capteur === 'NebuleAir') {
                    const defaultMarker = createDefaultMarker(
                        station.data,
                        dataCapteurSite,
                        pasDeTempsAtmo
                    );
                    station.marker = defaultMarker;
                }
            } else {
                const defaultMarker = createDefaultMarker(
                    station.data,
                    dataCapteurSite,
                    pasDeTempsAtmo
                );
                station.marker = defaultMarker;
            }
        }
    });
}

/**
 * Crée un marqueur par défaut microstation atmosud
 * @param {Object} stationData - Capteurs pour lequel on crée le marqueur
 * @param {Array} dataCapteurSite - Liste des capteurs
 * @param {string} pasDeTempsAtmo - Pas de temps Atmo
 * @returns {L.Marker} - Marqueur créé
 */
function createDefaultMarker(stationData, dataCapteurSite, pasDeTempsAtmo) {
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
            handleMarkerClick(defaultMarker, null, stationData, pasDeTempsAtmo)
        )
        .on('mouseover', (e) => {
            defaultMarker.setZIndexOffset(1000);
            const tooltip = createTooltip(stationData, dataCapteurSite);
            tooltip.style.cssText = getTooltipStyles();

            // Ajouter l'événement mousemove pour mettre à jour la position du tooltip
            const mousemoveHandler = (e) => updateTooltipPosition(e, tooltip);
            document.addEventListener('mousemove', mousemoveHandler);
            tooltip.mousemoveHandler = mousemoveHandler;

            // Positionner initialement le tooltip
            updateTooltipPosition(e, tooltip);

            document.body.appendChild(tooltip);
            defaultMarker.tooltip = tooltip;
        })
        .on('mouseout', () => {
            if (state.selectedMarker !== defaultMarker) {
                defaultMarker.setZIndexOffset(0);
            }
            if (defaultMarker.tooltip) {
                // Supprimer l'événement mousemove
                if (defaultMarker.tooltip.mousemoveHandler) {
                    document.removeEventListener(
                        'mousemove',
                        defaultMarker.tooltip.mousemoveHandler
                    );
                }
                defaultMarker.tooltip.remove();
                defaultMarker.tooltip = null;
            }
        });

    return defaultMarker;
}

/**
 * Gère le clic sur un marqueur microstation atmosud
 * @param {L.Marker} marker - Marqueur cliqué
 * @param {L.Marker} textMarker - Marqueur de texte
 * @param {Object} stationData - Données de la station
 * @param {string} pasDeTempsAtmo - Pas de temps Atmo
 */
function handleMarkerClick(marker, textMarker, stationData, pasDeTempsAtmo) {
    console.log('click on micro station:', stationData.nom_site);

    // Réinitialiser tous les autres types de marqueurs
    resetAllMarkers();

    // Mise en évidence du nouveau marqueur
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

    // Mise à jour de l'état global
    state.selectedMarker = marker;
    state.selectedText = textMarker;
    state.selectedDeviceId = stationData.id_site;
    window.lastSelectedDeviceData = stationData;

    // Mise à jour de globalSelectedDeviceId en tant que chaîne de caractères
    const deviceId = String(stationData.id_site);
    window.globalSelectedDeviceId = deviceId;
    console.log('Mise à jour de globalSelectedDeviceId:', deviceId);

    // S'assurer que les valeurs sont définies
    const historique = state.historiqueChart || '24h';
    const mesures =
        state.mesuresArray || getArrayFromLocalStorage('mesuresLocal');

    openSidePanelMicroStation(stationData, pasDeTempsAtmo, historique, mesures);
}

/**
 * Crée un tooltip pour un microcapteur atmosud
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
 * Récupère les polluants actifs pour un microcapteur atmosud
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
 * Formate la liste des polluants pour un microcapteur atmosud
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
 * Normalise le nom d'un polluant pour un microcapteur atmosud
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
 * Formate l'affichage d'un polluant pour un microcapteur atmosud
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
 * Crée le HTML pour un tooltip (microstation atmosud)
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
        background-color: white;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: opacity 0.2s;
        opacity: 1;
        transform: translate(-50%, -100%);
        margin-top: -10px;
    `;
}

/**
 * Met à jour la position du tooltip en fonction de la position de la souris
 * @param {MouseEvent} e - Événement de la souris
 * @param {HTMLElement} tooltip - Élément tooltip
 */
function updateTooltipPosition(e, tooltip) {
    if (tooltip) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;

        // Calculer la position horizontale
        let left = mouseX;
        if (mouseX + tooltipWidth / 2 > windowWidth) {
            left = windowWidth - tooltipWidth / 2 - 10;
        } else if (mouseX - tooltipWidth / 2 < 0) {
            left = tooltipWidth / 2 + 10;
        }

        // Calculer la position verticale
        let top = mouseY;
        let transform = '';

        if (mouseY - tooltipHeight - 10 < 0) {
            // Si le tooltip ne rentre pas au-dessus, le mettre en dessous
            top = mouseY + 10;
            transform = 'translate(-50%, 0)';
        } else {
            // Par défaut, mettre le tooltip au-dessus
            top = mouseY - 10;
            transform = 'translate(-50%, -100%)';
        }

        // Appliquer les positions
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.transform = transform;
    }
}

/**############################################################################
 *                    MARQUEURS STATION DE REFERENCE ATMOSUD
 * ############################################################################
 */

/**
 * Crée un marqueur pour une station de référence atmosud
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
        if (window.stationMarkers[value.id_station].textMarker) {
            window.atmoRefLayer.removeLayer(
                window.stationMarkers[value.id_station].textMarker
            );
        }
    }

    const stationMarker = L.marker([value.lat, value.lon], {
        icon: L.icon(iconParam),
        zIndexOffset: 1000,
    });

    stationMarker.deviceId = value.id_station;
    stationMarker.deviceData = value;

    // Restauration de la logique de positionnement et de taille du texte
    const textSize = getRefTextSize(value.valeur);
    const textPosition = getRefTextPosition(value.valeur);

    const textParam = L.divIcon({
        className: 'my-div-icon',
        html: `<div id="textDiv" style="font-size: ${textSize}px; text-align: center; width: 50px; margin-left: -25px;">${Math.round(value.valeur)}</div>`,
        iconAnchor: textPosition,
        popupAnchor: [30, -60],
    });

    const textMarker = L.marker([value.lat, value.lon], {
        icon: textParam,
        zIndexOffset: 1000,
    });

    function highlightMarker(e) {
        stationMarker.setZIndexOffset(3000);
        textMarker.setZIndexOffset(3000);

        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';

        // Récupération des polluants actifs
        const polluantsActifs = [];
        const polluantsDejaVus = new Set();
        if (stationData.variables) {
            Object.values(stationData.variables).forEach((variable) => {
                if (variable.en_service) {
                    let polluant = variable.label;
                    // Normalisation des noms de polluants
                    const labelLower = polluant.toLowerCase();
                    if (
                        labelLower === 'pm1' ||
                        labelLower === 'particules en suspension <1 µm'
                    ) {
                        polluant = 'PM1';
                    } else if (
                        labelLower === 'pm2.5' ||
                        labelLower === 'particules en suspension <2.5 µm'
                    ) {
                        polluant = 'PM2.5';
                    } else if (
                        labelLower === 'pm10' ||
                        labelLower === 'particules en suspension <10 µm'
                    ) {
                        polluant = 'PM10';
                    }
                    // Vérification si le polluant est supporté par l'application
                    const normalizedPolluant = polluant
                        .toLowerCase()
                        .replace('2.5', '25');
                    if (
                        Object.keys(supportedMesures).includes(
                            normalizedPolluant
                        ) &&
                        !polluantsDejaVus.has(polluant)
                    ) {
                        polluantsActifs.push(polluant);
                        polluantsDejaVus.add(polluant);
                    }
                }
            });
        }

        // Formatage des polluants pour l'affichage
        const formattedPollutants = polluantsActifs.map((polluant) => {
            switch (polluant) {
                case 'PM1':
                    return '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>1</sub></span>';
                case 'PM2.5':
                    return '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>2.5</sub></span>';
                case 'PM10':
                    return '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>10</sub></span>';
                case 'NO2':
                    return '<span class="text-muted">●</span> <span class="fw-semibold">NO<sub>2</sub></span>';
                case 'SO2':
                    return '<span class="text-muted">●</span> <span class="fw-semibold">SO<sub>2</sub></span>';
                case 'O3':
                    return '<span class="text-muted">●</span> <span class="fw-semibold">O<sub>3</sub></span>';
                default:
                    return `<span class="text-muted">●</span> <span class="fw-semibold">${polluant}</span>`;
            }
        });

        stationData.polluantMesure = polluantsActifs;

        tooltip.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-body p-2">
                    <h6 class="card-title mb-1">${stationData.nom_station}</h6>
                    <div class="d-flex flex-column">
                        <small class="text-muted mb-1">
                            <i class="bi bi-geo-alt me-1"></i>
                            ${stationData.latitude.toFixed(4)}, ${stationData.longitude.toFixed(4)}
                        </small>
                        <small class="text-muted">
                            Polluants mesurés:
                            <ul class="list-unstyled ms-3 mb-0">
                                ${formattedPollutants.map((polluant) => `<li>${polluant}</li>`).join('')}
                            </ul>
                        </small>
                    </div>
                </div>
            </div>
        `;

        tooltip.style.cssText = getTooltipStyles();

        // Ajouter l'événement mousemove pour mettre à jour la position du tooltip
        const mousemoveHandler = (e) => updateTooltipPosition(e, tooltip);
        document.addEventListener('mousemove', mousemoveHandler);
        tooltip.mousemoveHandler = mousemoveHandler;

        // Positionner initialement le tooltip
        updateTooltipPosition(e, tooltip);

        document.body.appendChild(tooltip);
        stationMarker.tooltip = tooltip;
        textMarker.tooltip = tooltip;
    }

    function resetMarker() {
        // Ne pas réinitialiser si c'est le marqueur sélectionné
        if (refMarkerState.selectedMarker !== stationMarker) {
            stationMarker.setZIndexOffset(0);
            textMarker.setZIndexOffset(0);
        }

        // Suppression du tooltip
        if (stationMarker.tooltip) {
            // Supprimer l'événement mousemove
            if (stationMarker.tooltip.mousemoveHandler) {
                document.removeEventListener(
                    'mousemove',
                    stationMarker.tooltip.mousemoveHandler
                );
            }
            stationMarker.tooltip.remove();
            stationMarker.tooltip = null;
            textMarker.tooltip = null;
        }
    }

    // Application des effets de survol aux deux marqueurs
    stationMarker.on('mouseover', highlightMarker).on('mouseout', resetMarker);
    textMarker
        .on('mouseover', highlightMarker)
        .on('mouseout', resetMarker)
        .on('click', () => {
            // Réinitialiser tous les autres types de marqueurs
            resetNebuleAirMarkers();
            resetMicroStationMarkers();

            // Gestion des stations de référence
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

            stationMarker.setZIndexOffset(3000);
            textMarker.setZIndexOffset(3000);
            if (stationMarker._icon) {
                stationMarker._icon.classList.add('marker-selected');
            }
            if (textMarker._icon) {
                textMarker._icon.classList.add('marker-selected');
            }

            refMarkerState.selectedMarker = stationMarker;
            refMarkerState.selectedText = textMarker;
            window.globalSelectedDeviceId = value.id_station;
            window.lastSelectedDeviceData = stationData;
            refMarkerState.lastSelectedStationData = value;

            console.log('Click on station: ' + value.id_station);
            openSidePanelStationRef(
                value.id_station,
                value.nom_station,
                getArrayFromLocalStorage('mesuresLocal')
            );
        });

    window.stationMarkers[value.id_station] = {
        marker: stationMarker,
        textMarker: textMarker,
        data: stationData,
        hasValue: true,
    };

    // Ajout des marqueurs à la couche
    window.atmoRefLayer.addLayer(stationMarker);
    window.atmoRefLayer.addLayer(textMarker);
}

/**
 * Configure les événements pour les marqueurs de station de référence atmosud
 * @param {Object} stationMarker - Marqueur de la station
 * @param {Object} textMarker - Marqueur de texte
 * @param {Object} value - Données de la station
 * @param {Array} mesure - Mesures sélectionnées
 */
function setupRefMarkerEvents(stationMarker, textMarker, value, mesure) {
    const clickHandler = () => {
        // Réinitialiser tous les autres types de marqueurs
        resetNebuleAirMarkers();
        resetMicroStationMarkers();

        // Gestion des stations de référence
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

        stationMarker.setZIndexOffset(3000);
        textMarker.setZIndexOffset(3000);
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
        openSidePanelStationRef(
            value.id_station,
            value.nom_station,
            getArrayFromLocalStorage('mesuresLocal')
        );
    };

    stationMarker.on('click', clickHandler);
    textMarker.on('click', clickHandler);
}

/**
 * Détermine la taille du texte pour les marqueurs de référence atmosud
 * @param {number} valeur - Valeur du polluant
 * @returns {number} Taille du texte
 */
function getRefTextSize(valeur) {
    if (valeur > 99.4) return 22;
    if (valeur > 9.4) return 28;
    return 32;
}

/**
 * Détermine la position du texte pour les marqueurs de référence atmosud
 * @param {number} valeur - Valeur du polluant
 * @returns {Array} Position [x, y]
 */
function getRefTextPosition(valeur) {
    if (valeur > 99.4) return [-20, 37];
    if (valeur > 9.4) return [-19, 37];
    return [-20, 39];
}

/**
 * Crée les marqueurs par défaut pour les stations de référence atmosud
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

            // Ajout des fonctions de survol
            function highlightMarker(e) {
                defaultMarker.setZIndexOffset(1000);

                // Création d'un tooltip personnalisé avec Bootstrap
                const tooltip = document.createElement('div');
                tooltip.className = 'custom-tooltip';

                // Récupération des polluants actifs
                let polluantsActifs = [];
                const polluantsDejaVus = new Set();
                if (station.variables) {
                    Object.values(station.variables).forEach((variable) => {
                        if (variable.en_service) {
                            polluantsActifs.push(variable.label);
                        }
                    });
                }

                polluantsActifs.forEach((polluant, index) => {
                    if (polluant === 'PM2.5') {
                        polluantsActifs[index] = 'PM25';
                    }
                });

                polluantsActifs = polluantsActifs.filter((polluant) =>
                    Object.keys(supportedMesures).includes(
                        polluant.toLowerCase()
                    )
                );

                polluantsActifs.forEach((polluant, index) => {
                    if (polluant === 'PM25') {
                        polluantsActifs[index] = 'PM2.5';
                    }
                });

                // Format pollutant names with consistent styling
                polluantsActifs = polluantsActifs.map((polluant) => {
                    switch (polluant) {
                        case 'PM1':
                            return '<span class="fw-semibold">PM<sub>1</sub></span>';
                        case 'PM2.5':
                            return '<span class="fw-semibold">PM<sub>2.5</sub></span>';
                        case 'PM10':
                            return '<span class="fw-semibold">PM<sub>10</sub></span>';
                        case 'NO2':
                            return '<span class="fw-semibold">NO<sub>2</sub></span>';
                        case 'SO2':
                            return '<span class="fw-semibold">SO<sub>2</sub></span>';
                        case 'O3':
                            return '<span class="fw-semibold">O<sub>3</sub></span>';
                        case 'H2S':
                            return '<span class="fw-semibold">H<sub>2</sub>S</span>';
                        case 'NH3':
                            return '<span class="fw-semibold">NH<sub>3</sub></span>';
                        default:
                            return `<span class="fw-semibold">${polluant}</span>`;
                    }
                });

                tooltip.innerHTML = `
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-2">
                            <h6 class="card-title mb-1">${station.nom_station}</h6>
                            <div class="d-flex flex-column">
                                <small class="text-muted mb-1">
                                    <i class="bi bi-geo-alt me-1"></i>
                                    ${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}
                                </small>
                                <small class="text-muted">
                                    Polluants mesurés:
                                    <ul class="list-unstyled ms-3 mb-0">
                                        ${polluantsActifs
                                            .map(
                                                (polluant) =>
                                                    `<li><span class="text-muted">●</span> ${polluant}</li>`
                                            )
                                            .join('')}
                                    </ul>
                                </small>
                            </div>
                        </div>
                    </div>
                `;

                tooltip.style.cssText = getTooltipStyles();

                // Ajouter l'événement mousemove pour mettre à jour la position du tooltip
                const mousemoveHandler = (e) =>
                    updateTooltipPosition(e, tooltip);
                document.addEventListener('mousemove', mousemoveHandler);
                tooltip.mousemoveHandler = mousemoveHandler;

                // Positionner initialement le tooltip
                updateTooltipPosition(e, tooltip);

                // Ajout du tooltip directement au body pour éviter les problèmes de z-index
                document.body.appendChild(tooltip);

                // Stockage de la référence du tooltip
                defaultMarker.tooltip = tooltip;
            }

            function resetMarker() {
                // Ne pas réinitialiser si c'est le marqueur sélectionné
                if (refMarkerState.selectedMarker !== defaultMarker) {
                    defaultMarker.setZIndexOffset(0);
                }

                // Suppression du tooltip
                if (defaultMarker.tooltip) {
                    defaultMarker.tooltip.remove();
                    defaultMarker.tooltip = null;
                }
            }

            // Application des effets de survol
            defaultMarker
                .on('mouseover', highlightMarker)
                .on('mouseout', resetMarker);

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
                openSidePanelStationRef(
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

/**############################################################################
 *                    MARQUEURS NEBULEAIR
 * ############################################################################
 */

// État global pour les marqueurs NebuleAir
const nebuleAirMarkerState = {
    markers: {},
    selectedMarker: null,
    selectedText: null,
    selectedDeviceId: null,
};

/**
 * Crée un marqueur pour un capteur NebuleAir
 * @param {Object} value - Données du capteur
 * @param {string} mesure_maj_pasDeTemps - Mesure avec pas de temps
 * @param {Array} mesures - Mesures sélectionnées
 * @returns {Object} - Marqueurs créés
 */
export function createNebuleAirMarker(value, mesure_maj_pasDeTemps, mesures) {
    const icon_param = {
        iconUrl: 'img/nebuleair/nebuleAir_default.png',
        iconSize: [40, 40],
        iconAnchor: [5, 40],
    };

    if (value.connected) {
        icon_param.iconSize = [50, 50];
        const valueToCheck = value[mesure_maj_pasDeTemps];
        const colorCode = getColorCodeForValue(valueToCheck, mesures);
        if (colorCode !== 'default') {
            icon_param.iconUrl =
                'img/nebuleair/nebuleAir_' + colorCode + '.png';
        }
    }

    const nebuleAir_icon = L.icon(icon_param);
    const nebuleAirMarker = L.marker([value['latitude'], value['longitude']], {
        icon: nebuleAir_icon,
        deviceId: value['sensorId'],
    });

    if (!window.deviceMarkers) window.deviceMarkers = {};
    window.deviceMarkers[value['sensorId']] = {
        marker: nebuleAirMarker,
        data: value,
    };

    const textMarker = value.connected
        ? createNebuleAirTextMarker(value, mesure_maj_pasDeTemps)
        : null;
    setupNebuleAirMarkerEvents(nebuleAirMarker, textMarker, value);
    return { nebuleAirMarker, textMarker };
}

/**
 * Crée un marqueur de texte pour un capteur NebuleAir
 * @param {Object} value - Données du capteur
 * @param {string} mesure_maj_pasDeTemps - Mesure avec pas de temps
 * @returns {L.Marker} - Marqueur de texte
 */
function createNebuleAirTextMarker(value, mesure_maj_pasDeTemps) {
    const roundedvalue = Math.round(parseFloat(value[mesure_maj_pasDeTemps]));
    let textSize = 32;
    let x_position = -10;
    let y_position = 38;

    if (roundedvalue >= 10) {
        textSize = 25;
        x_position = -5;
        y_position = 32;
    }

    if (roundedvalue >= 100) {
        textSize = 20;
        x_position = -4;
        y_position = 26;
    }

    const text_param = L.divIcon({
        className: 'my-div-icon',
        html: `<div id="textDiv" style="font-size: ${textSize}px;">${roundedvalue}</div>`,
        iconAnchor: [x_position, y_position],
    });

    const textMarker = L.marker([value['latitude'], value['longitude']], {
        icon: text_param,
        deviceId: value['sensorId'],
    });

    return textMarker;
}

/**
 * Configure les événements pour les marqueurs NebuleAir
 * @param {L.Marker} nebuleAirMarker - Marqueur principal
 * @param {L.Marker} textMarker - Marqueur de texte
 * @param {Object} value - Données du capteur
 */
function setupNebuleAirMarkerEvents(nebuleAirMarker, textMarker, value) {
    const highlightMarker = (e) => {
        nebuleAirMarker.setZIndexOffset(1000);
        if (textMarker) {
            textMarker.setZIndexOffset(1000);
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-body p-2">
                    <h6 class="card-title mb-1">${value['sensorId']}</h6>
                    <div class="d-flex flex-column">
                        <small class="text-muted mb-1">
                            <i class="bi bi-info-circle me-1"></i>
                            NebuleAir - AirCarto
                            ${!value.connected ? '<span class="text-danger">(Déconnecté)</span>' : ''}
                        </small>
                        <small class="text-muted">
                            Polluants mesurés:
                            <ul class="list-unstyled mb-0">
                                ${value.PM1 !== undefined ? '<li><span class="text-muted">●</span><span class="fw-semibold"> PM₁</span></li>' : ''}
                                ${value.PM25 !== undefined ? '<li><span class="text-muted">●</span><span class="fw-semibold"> PM₂.₅</span></li>' : ''}
                                ${value.PM10 !== undefined ? '<li><span class="text-muted">●</span><span class="fw-semibold"> PM₁₀</span></li>' : ''}
                            </ul>
                        </small>
                    </div>
                </div>
            </div>
        `;

        tooltip.style.cssText = getTooltipStyles();

        // Ajouter l'événement mousemove pour mettre à jour la position du tooltip
        const mousemoveHandler = (e) => updateTooltipPosition(e, tooltip);
        document.addEventListener('mousemove', mousemoveHandler);
        tooltip.mousemoveHandler = mousemoveHandler;

        // Positionner initialement le tooltip
        updateTooltipPosition(e, tooltip);

        document.body.appendChild(tooltip);
        nebuleAirMarker.tooltip = tooltip;
        if (textMarker) {
            textMarker.tooltip = tooltip;
        }
    };

    const resetMarker = () => {
        if (nebuleAirMarkerState.selectedMarker !== nebuleAirMarker) {
            nebuleAirMarker.setZIndexOffset(0);
            if (textMarker) {
                textMarker.setZIndexOffset(0);
            }
        }

        if (nebuleAirMarker.tooltip) {
            // Supprimer l'événement mousemove
            if (nebuleAirMarker.tooltip.mousemoveHandler) {
                document.removeEventListener(
                    'mousemove',
                    nebuleAirMarker.tooltip.mousemoveHandler
                );
            }
            nebuleAirMarker.tooltip.remove();
            nebuleAirMarker.tooltip = null;
            if (textMarker) {
                textMarker.tooltip = null;
            }
        }
    };

    const clickHandler = () => {
        // Réinitialiser tous les autres types de marqueurs
        resetMicroStationMarkers();
        resetRefStationMarkers();

        // Mettre à jour l'état des marqueurs NebuleAir
        if (
            nebuleAirMarkerState.selectedMarker &&
            nebuleAirMarkerState.selectedMarker !== nebuleAirMarker &&
            nebuleAirMarkerState.selectedMarker._icon
        ) {
            nebuleAirMarkerState.selectedMarker.setZIndexOffset(0);
            nebuleAirMarkerState.selectedMarker._icon.classList.remove(
                'marker-selected'
            );
        }

        if (
            nebuleAirMarkerState.selectedText &&
            nebuleAirMarkerState.selectedText !== textMarker &&
            nebuleAirMarkerState.selectedText._icon
        ) {
            nebuleAirMarkerState.selectedText.setZIndexOffset(0);
            nebuleAirMarkerState.selectedText._icon.classList.remove(
                'marker-selected'
            );
        }

        nebuleAirMarker.setZIndexOffset(1000);
        if (textMarker) {
            textMarker.setZIndexOffset(1000);
        }

        if (nebuleAirMarker._icon) {
            nebuleAirMarker._icon.classList.add('marker-selected');
        }
        if (textMarker && textMarker._icon) {
            textMarker._icon.classList.add('marker-selected');
        }

        nebuleAirMarkerState.selectedMarker = nebuleAirMarker;
        nebuleAirMarkerState.selectedText = textMarker;
        nebuleAirMarkerState.selectedDeviceId = value['sensorId'];

        // Mise à jour de globalSelectedDeviceId
        window.globalSelectedDeviceId = value['sensorId'];

        console.log('clickHandler NebuleAir');
        console.log('value:', value);

        // Appel de la fonction d'ouverture du panneau latéral
        openSidePanelNebuleAir(
            value,
            value.pasDeTemps || getArrayFromLocalStorage('pasDeTempsLocal')[0],
            value.historiqueChart || '24h',
            value.mesures || getArrayFromLocalStorage('mesuresLocal')
        );
    };

    nebuleAirMarker
        .on('mouseover', highlightMarker)
        .on('mouseout', resetMarker)
        .on('click', clickHandler);

    if (textMarker) {
        textMarker
            .on('mouseover', highlightMarker)
            .on('mouseout', resetMarker)
            .on('click', clickHandler);
    }
}

/**
 * Réinitialise l'état des marqueurs NebuleAir
 */
export function resetNebuleAirMarkers() {
    if (nebuleAirMarkerState.selectedMarker) {
        nebuleAirMarkerState.selectedMarker.setZIndexOffset(0);
        if (nebuleAirMarkerState.selectedMarker._icon) {
            nebuleAirMarkerState.selectedMarker._icon.classList.remove(
                'marker-selected'
            );
        }
    }
    if (nebuleAirMarkerState.selectedText) {
        nebuleAirMarkerState.selectedText.setZIndexOffset(0);
        if (nebuleAirMarkerState.selectedText._icon) {
            nebuleAirMarkerState.selectedText._icon.classList.remove(
                'marker-selected'
            );
        }
    }
    nebuleAirMarkerState.selectedMarker = null;
    nebuleAirMarkerState.selectedText = null;
    nebuleAirMarkerState.selectedDeviceId = null;
}

/**
 * Réinitialise l'état des marqueurs de micro-stations
 */
export function resetMicroStationMarkers() {
    if (state.selectedMarker) {
        state.selectedMarker.setZIndexOffset(0);
        if (state.selectedMarker._icon) {
            state.selectedMarker._icon.classList.remove('marker-selected');
        }
    }
    if (state.selectedText) {
        state.selectedText.setZIndexOffset(0);
        if (state.selectedText._icon) {
            state.selectedText._icon.classList.remove('marker-selected');
        }
    }
    state.selectedMarker = null;
    state.selectedText = null;
    state.selectedDeviceId = null;
}

/**
 * Réinitialise l'état des marqueurs de stations de référence
 */
export function resetRefStationMarkers() {
    if (refMarkerState.selectedMarker) {
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
    refMarkerState.selectedMarker = null;
    refMarkerState.selectedText = null;
    refMarkerState.selectedDeviceId = null;
}

/**
 * Réinitialise tous les types de marqueurs
 */
export function resetAllMarkers() {
    resetNebuleAirMarkers();
    resetMicroStationMarkers();
    resetRefStationMarkers();
    resetSensorCommunityMarkers();
}

// Export des variables d'état
export { nebuleAirMarkerState };

/**############################################################################
 *                    MARQUEURS SENSOR.COMMUNITY
 * ############################################################################
 */

// État global pour les marqueurs Sensor.Community
const sensorCommunityMarkerState = {
    markers: {},
    selectedMarker: null,
    selectedText: null,
    selectedDeviceId: null,
};

/**
 * Crée un marqueur pour un capteur Sensor.Community
 * @param {Object} sensor - Données du capteur
 * @param {string} pasDeTemps - Pas de temps
 * @param {string} mesure - Mesure sélectionnée
 * @returns {Object} - Marqueurs créés
 */
export function createSensorCommunityMarker(sensor, pasDeTemps, mesure) {
    // Vérification si le capteur a des données pour la mesure sélectionnée
    if (!sensor.sensordatavalues || sensor.sensordatavalues.length === 0) {
        return null;
    }

    // Recherche de la valeur pour la mesure sélectionnée
    const sensorValue = sensor.sensordatavalues.find(
        (value) => value.value_type === mesure
    );

    // Si pas de valeur pour la mesure sélectionnée, on ne crée pas de marqueur
    if (!sensorValue) {
        return null;
    }

    const icon_param = {
        iconUrl: 'img/SensorCommunity/SensorCommunity_default.png',
        iconSize: [50, 50],
        iconAnchor: [5, 40],
    };

    const valueToCheck = parseFloat(sensorValue.value);
    const colorCode = getColorCodeForValue(valueToCheck, mesure);

    if (colorCode !== 'default') {
        // Conversion des codes de couleur pour correspondre aux noms de fichiers
        const fileColorCode =
            colorCode === 'tresMauvais'
                ? 'tresMauvais'
                : colorCode === 'extrMauvais'
                  ? 'extMauvais'
                  : colorCode;
        icon_param.iconUrl = `img/SensorCommunity/SensorCommunity_${fileColorCode}.png`;
    }

    const sensorCommunityIcon = L.icon(icon_param);
    const sensorCommunityMarker = L.marker(
        [sensor.location.latitude, sensor.location.longitude],
        {
            icon: sensorCommunityIcon,
            deviceId: sensor.sensor.id,
        }
    ).addTo(sensorCommunityLayer);

    if (!window.sensorCommunityMarkers) {
        window.sensorCommunityMarkers = {};
    }
    window.sensorCommunityMarkers[sensor.sensor.id] = {
        marker: sensorCommunityMarker,
        data: sensor,
    };

    // Création du marqueur de texte
    const textMarker = createSensorCommunityTextMarker(sensor, mesure);
    if (textMarker) {
        textMarker.addTo(sensorCommunityLayer);
    }
    setupSensorCommunityMarkerEvents(sensorCommunityMarker, textMarker, sensor);

    return { sensorCommunityMarker, textMarker };
}

/**
 * Crée un marqueur de texte pour un capteur Sensor.Community
 * @param {Object} sensor - Données du capteur
 * @param {string} mesure - Mesure sélectionnée
 * @returns {L.Marker} - Marqueur de texte
 */
function createSensorCommunityTextMarker(sensor, mesure) {
    // Recherche de la valeur pour la mesure sélectionnée
    const sensorValue = sensor.sensordatavalues.find(
        (value) => value.value_type === mesure
    );

    if (!sensorValue) return null;

    const roundedValue = Math.round(parseFloat(sensorValue.value));
    let textSize = 32;
    let x_position = 6;
    let y_position = 38;

    if (roundedValue >= 10) {
        textSize = 25;
        x_position = 7;
        y_position = 38;
    }

    if (roundedValue >= 100) {
        textSize = 20;
        x_position = 7;
        y_position = 38;
    }

    const text_param = L.divIcon({
        className: 'my-div-icon',
        html: `<div id="textDiv" style="font-size: ${textSize}px; position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #333;">${roundedValue}</div>`,
        iconAnchor: [x_position, y_position],
        popupAnchor: [30, -60],
        iconSize: [50, 50],
    });

    const textMarker = L.marker(
        [sensor.location.latitude, sensor.location.longitude],
        {
            icon: text_param,
            deviceId: sensor.sensor.id,
        }
    );

    return textMarker;
}

/**
 * Configure les événements pour les marqueurs Sensor.Community
 * @param {L.Marker} sensorCommunityMarker - Marqueur principal
 * @param {L.Marker} textMarker - Marqueur de texte
 * @param {Object} sensor - Données du capteur
 */
function setupSensorCommunityMarkerEvents(
    sensorCommunityMarker,
    textMarker,
    sensor
) {
    const highlightMarker = (e) => {
        sensorCommunityMarker.setZIndexOffset(1000);
        if (textMarker) {
            textMarker.setZIndexOffset(1000);
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-body p-2">
                    <h6 class="card-title mb-1">${sensor.sensor.id}</h6>
                    <div class="d-flex flex-column">
                        <small class="text-muted mb-1">
                            <i class="bi bi-info-circle me-1"></i>
                            Sensor.Community
                        </small>
                        <small class="text-muted">
                            Polluants mesurés:
                            <ul class="list-unstyled mb-0">
                                ${sensor.sensordatavalues
                                    .map(
                                        (value) => `
                                    <li>
                                        <span class="text-muted">●</span>
                                        <span class="fw-semibold">${formatPollutantName(value.value_type.toUpperCase())}</span>
                                    </li>
                                `
                                    )
                                    .join('')}
                            </ul>
                        </small>
                    </div>
                </div>
            </div>
        `;

        tooltip.style.cssText = getTooltipStyles();

        // Ajouter l'événement mousemove pour mettre à jour la position du tooltip
        const mousemoveHandler = (e) => updateTooltipPosition(e, tooltip);
        document.addEventListener('mousemove', mousemoveHandler);
        tooltip.mousemoveHandler = mousemoveHandler;

        // Positionner initialement le tooltip
        updateTooltipPosition(e, tooltip);

        document.body.appendChild(tooltip);
        sensorCommunityMarker.tooltip = tooltip;
        if (textMarker) {
            textMarker.tooltip = tooltip;
        }
    };

    const resetMarker = () => {
        if (
            sensorCommunityMarkerState.selectedMarker !== sensorCommunityMarker
        ) {
            sensorCommunityMarker.setZIndexOffset(0);
            if (textMarker) {
                textMarker.setZIndexOffset(0);
            }
        }

        if (sensorCommunityMarker.tooltip) {
            // Supprimer l'événement mousemove
            if (sensorCommunityMarker.tooltip.mousemoveHandler) {
                document.removeEventListener(
                    'mousemove',
                    sensorCommunityMarker.tooltip.mousemoveHandler
                );
            }
            sensorCommunityMarker.tooltip.remove();
            sensorCommunityMarker.tooltip = null;
            if (textMarker) {
                textMarker.tooltip = null;
            }
        }
    };

    const clickHandler = () => {
        // Réinitialiser tous les autres types de marqueurs
        resetNebuleAirMarkers();
        resetMicroStationMarkers();
        resetRefStationMarkers();

        // Mettre à jour l'état des marqueurs Sensor.Community
        if (
            sensorCommunityMarkerState.selectedMarker &&
            sensorCommunityMarkerState.selectedMarker !== sensorCommunityMarker
        ) {
            sensorCommunityMarkerState.selectedMarker.setZIndexOffset(0);
            sensorCommunityMarkerState.selectedMarker._icon.classList.remove(
                'marker-selected'
            );
        }

        if (
            sensorCommunityMarkerState.selectedText &&
            sensorCommunityMarkerState.selectedText !== textMarker
        ) {
            sensorCommunityMarkerState.selectedText.setZIndexOffset(0);
            sensorCommunityMarkerState.selectedText._icon.classList.remove(
                'marker-selected'
            );
        }

        sensorCommunityMarker.setZIndexOffset(1000);
        if (textMarker) {
            textMarker.setZIndexOffset(1000);
        }

        sensorCommunityMarker._icon.classList.add('marker-selected');
        if (textMarker) {
            textMarker._icon.classList.add('marker-selected');
        }

        sensorCommunityMarkerState.selectedMarker = sensorCommunityMarker;
        sensorCommunityMarkerState.selectedText = textMarker;
        sensorCommunityMarkerState.selectedDeviceId = sensor.sensor.id;

        // Mise à jour de globalSelectedDeviceId
        window.globalSelectedDeviceId = sensor.sensor.id;

        // Récupération des paramètres de configuration
        const mesure = getArrayFromLocalStorage('mesuresLocal')[0];

        // Affichage des données historiques
        displaySensorCommunityGrafana(sensor.sensor.id, mesure);
    };

    sensorCommunityMarker
        .on('mouseover', highlightMarker)
        .on('mouseout', resetMarker)
        .on('click', clickHandler);

    if (textMarker) {
        textMarker
            .on('mouseover', highlightMarker)
            .on('mouseout', resetMarker)
            .on('click', clickHandler);
    }
}

/**
 * Réinitialise l'état des marqueurs Sensor.Community
 */
export function resetSensorCommunityMarkers() {
    if (sensorCommunityMarkerState.selectedMarker) {
        sensorCommunityMarkerState.selectedMarker.setZIndexOffset(0);
        if (sensorCommunityMarkerState.selectedMarker._icon) {
            sensorCommunityMarkerState.selectedMarker._icon.classList.remove(
                'marker-selected'
            );
        }
    }
    if (sensorCommunityMarkerState.selectedText) {
        sensorCommunityMarkerState.selectedText.setZIndexOffset(0);
        if (sensorCommunityMarkerState.selectedText._icon) {
            sensorCommunityMarkerState.selectedText._icon.classList.remove(
                'marker-selected'
            );
        }
    }
    sensorCommunityMarkerState.selectedMarker = null;
    sensorCommunityMarkerState.selectedText = null;
    sensorCommunityMarkerState.selectedDeviceId = null;
}

// Export des variables d'état
export { sensorCommunityMarkerState };

// Export des variables d'état
export { state };
