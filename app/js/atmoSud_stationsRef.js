/**
 * Module de gestion des stations de référence AtmoSud
 * Ce module gère l'affichage et l'interaction avec les stations de référence AtmoSud
 */

import {
    getArrayFromLocalStorage,
    pasDeTempsLocal,
    mesuresLocal,
    getColorCodeForValue,
    map,
    openSidePanelGeneric,
    atmoRefLayer,
} from '../app.js';
import { isSourceActive } from './dataSourceManager.js';

// Variables locales au module
const state = {
    pasDeTempsChart: '1h',
    pasDeTempsAtmo: '',
    pasDeTemps: '',
    historiqueChart: '7d',
    mesuresArray: [],
    globalSelectedDeviceId: null,
    customDateRange: {
        start: null,
        end: null,
    },
};

// Déclaration des variables pour les boutons
const buttons = {
    historique: {
        custom: null,
        startDate: null,
        endDate: null,
        '1h': null,
        '3h': null,
        '24h': null,
        '7d': null,
        '30d': null,
        '365d': null,
    },
    pasDeTemps: {
        '2min': null,
        qh: null,
        h: null,
        d: null,
    },
    polluants: {
        pm1: null,
        pm25: null,
        pm10: null,
        no2: null,
        o3: null,
        so2: null,
    },
};

/**
 * Fonction principale pour charger les stations de référence AtmoSud
 * Récupère les données des stations et les affiche sur la carte
 */
export function loadAtmoSudStationsRef() {
    console.log(
        '%cloadAtmoSudStationsRef',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now();
    const today = new Date();

    // Initialisation de la couche si elle n'existe pas
    if (!window.atmoRefLayer) {
        window.atmoRefLayer = atmoRefLayer;
    }

    console.log('Nettoyage de la couche...');
    window.atmoRefLayer.clearLayers();

    // S'assurer que la couche est sur la carte
    if (!map.hasLayer(window.atmoRefLayer)) {
        console.log('Ajout de la couche atmoRefLayer à la carte...');
        map.addLayer(window.atmoRefLayer);
        console.log('Couche atmoRefLayer ajoutée à la carte');
    }

    state.pasDeTemps = getArrayFromLocalStorage(pasDeTempsLocal);

    // Conversion du pas de temps pour l'API AtmoSud
    switch (state.pasDeTemps[0]) {
        case '2min':
            state.pasDeTempsAtmo = 'brute';
            break;
        case 'qh':
            state.pasDeTempsAtmo = 'quart-horaire';
            break;
        case 'h':
            state.pasDeTempsAtmo = 'horaire';
            break;
        case 'd':
            state.pasDeTempsAtmo = 'journalière';
            break;
    }

    // Récupération et conversion des mesures
    const mesure = getArrayFromLocalStorage(mesuresLocal);
    let mesureAtmo = mesure[0];
    if (mesure[0] === 'pm25') {
        mesureAtmo = 'pm2.5';
    }

    // Vérification de la disponibilité des données
    if (state.pasDeTemps[0] === '2min') {
        console.warn(
            'Pas de données pour le pas de temps ' + state.pasDeTemps[0]
        );
        return;
    }

    console.log('Pas de temps : ' + state.pasDeTemps);
    console.log('Pas de temps Atmo: ' + state.pasDeTempsAtmo);
    console.log('Mesure : ' + mesure);

    // Initialisation de l'objet global pour les stations
    if (!window.stationMarkers) {
        window.stationMarkers = {};
    }

    // Construction de l'URL pour la première requête API
    const fullUrlStations = `
        https://api.atmosud.org/observations/stations?
        format=json&
        nom_polluant=${mesureAtmo}&
        delais=${'64'}&
        download=false&
        metadata=true
    `.replace(/\s+/g, '');

    // Premier appel API pour obtenir les informations des stations
    fetch(fullUrlStations)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log('Call API get all stations:');
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log('full_url_stations', fullUrlStations);
            console.log('Nombre de stations trouvées:', data.stations.length);
            console.log('Données des stations:', data.stations);

            // Traitement des stations actives
            let stationsActives = 0;
            window.stationsRef = []; // Initialisation de window.stationsRef
            data.stations.forEach((item) => {
                const dateFinStation = new Date(item.date_fin_mesure);
                if (today < dateFinStation || item.date_fin_mesure === null) {
                    window.stationMarkers[item.id_station] = {
                        data: item,
                        hasValue: false,
                    };
                    window.stationsRef.push(item); // Ajout de la station active à window.stationsRef
                    stationsActives++;
                }
            });
            console.log('Nombre de stations actives:', stationsActives);

            // Création des marqueurs par défaut pour toutes les stations actives
            createDefaultMarkers();

            // Construction de l'URL pour la deuxième requête API
            const fullUrlDerniere = `
                https://api.atmosud.org/observations/stations/mesures/derniere?
                format=json&
                nom_polluant=${mesureAtmo}&
                temporalite=${state.pasDeTempsAtmo}&
                download=false
            `.replace(/\s+/g, '');

            return fetch(fullUrlDerniere)
                .then((response) => {
                    if (!response.ok) {
                        console.warn(
                            `Erreur lors de la récupération des mesures: ${response.status}`
                        );
                        return { mesures: [] }; // Retourne un tableau vide en cas d'erreur
                    }
                    return response.json();
                })
                .then((data) => ({ data, url: fullUrlDerniere }));
        })
        .then((result) => {
            const { data, url: fullUrlDerniere } = result;

            console.log('Call API get dernière mesure stations:');
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log('full url derniere: ' + fullUrlDerniere);
            console.log(data);

            // Traitement des données de mesure
            if (data.mesures && data.mesures.length > 0) {
                data.mesures.forEach((value) => {
                    const stationData =
                        window.stationMarkers[value.id_station]?.data;
                    if (!stationData) return;

                    const valeurPolluant = value.valeur;

                    const iconParam = {
                        iconUrl:
                            'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                        iconSize: [50, 50],
                        iconAnchor: [25, 25],
                        popupAnchor: [0, -10],
                        tooltipAnchor: [-50, -10],
                        className: value.id_station,
                    };

                    const colorCode = getColorCodeForValue(
                        valeurPolluant,
                        mesure[0]
                    );
                    if (colorCode !== 'default') {
                        iconParam.iconUrl = `img/stationsRefAtmoSud/refStationAtmoSud_${colorCode}.png`;
                    }

                    createStationMarker(value, iconParam, stationData, mesure);
                });
            }

            // S'assurer que la couche est sur la carte
            if (!map.hasLayer(window.atmoRefLayer)) {
                console.log('Ajout de la couche atmoRefLayer à la carte...');
                map.addLayer(window.atmoRefLayer);
                console.log('Couche atmoRefLayer ajoutée à la carte');
            }
        })
        .catch((error) => {
            console.error('Error fetching data:', error);
            // En cas d'erreur, on s'assure que les marqueurs par défaut sont affichés
            if (
                window.stationMarkers &&
                Object.keys(window.stationMarkers).length > 0
            ) {
                createDefaultMarkers();
                // S'assurer que la couche est sur la carte
                if (!map.hasLayer(window.atmoRefLayer)) {
                    console.log(
                        'Ajout de la couche atmoRefLayer à la carte...'
                    );
                    map.addLayer(window.atmoRefLayer);
                    console.log('Couche atmoRefLayer ajoutée à la carte');
                }
            }
        });
}

/**
 * Crée un marqueur pour une station avec des données
 * @param {Object} value - Données de la station
 * @param {Object} iconParam - Paramètres de l'icône
 * @param {Object} stationData - Données de la station
 * @param {Array} mesure - Mesures sélectionnées
 */
function createStationMarker(value, iconParam, stationData, mesure) {
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

    const textSize = getTextSize(value.valeur);
    const textPosition = getTextPosition(value.valeur);

    const textParam = L.divIcon({
        className: 'my-div-icon',
        html: `<div id="textDiv" style="font-size: ${textSize}px; text-align: center; width: 50px; margin-left: -25px;">${Math.round(value.valeur)}</div>`,
        iconAnchor: textPosition,
        popupAnchor: [30, -60],
    });

    const textMarker = L.marker([stationData.latitude, stationData.longitude], {
        icon: textParam,
    });

    // Ajout des fonctions de survol
    function highlightMarker() {
        stationMarker.setZIndexOffset(1000);
        textMarker.setZIndexOffset(1000);

        // Création d'un tooltip personnalisé avec Bootstrap
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';

        // Récupération des polluants actifs
        const polluantsActifs = [];
        if (stationData.variables) {
            Object.values(stationData.variables).forEach((variable) => {
                if (variable.en_service) {
                    polluantsActifs.push(variable.label);
                }
            });
        }

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
                            Dernière mise à jour: ${new Date(value.date_debut).toLocaleString()}
                        </small>
                        <small class="text-muted">
                            Polluants mesurés:
                            <ul class="list-unstyled ms-3 mb-0">
                                ${polluantsActifs
                                    .map(
                                        (polluant) =>
                                            `<li><span class="text-success">●</span> ${polluant}</li>`
                                    )
                                    .join('')}
                            </ul>
                        </small>
                    </div>
                </div>
            </div>
        `;

        // Style du tooltip
        tooltip.style.cssText = `
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

        // Ajout du tooltip directement au body pour éviter les problèmes de z-index
        document.body.appendChild(tooltip);

        // Stockage de la référence du tooltip
        stationMarker.tooltip = tooltip;
        textMarker.tooltip = tooltip;
    }

    function resetMarker() {
        // Ne pas réinitialiser si c'est le marqueur sélectionné
        if (state.globalSelectedMarker !== stationMarker) {
            stationMarker.setZIndexOffset(0);
            textMarker.setZIndexOffset(0);
        }

        // Suppression du tooltip
        if (stationMarker.tooltip) {
            stationMarker.tooltip.remove();
            stationMarker.tooltip = null;
            textMarker.tooltip = null;
        }
    }

    // Application des effets de survol aux deux marqueurs
    stationMarker.on('mouseover', highlightMarker).on('mouseout', resetMarker);
    textMarker.on('mouseover', highlightMarker).on('mouseout', resetMarker);

    setupMarkerEvents(stationMarker, textMarker, value, mesure);
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
 * Configure les événements pour les marqueurs
 * @param {Object} stationMarker - Marqueur de la station
 * @param {Object} textMarker - Marqueur de texte
 * @param {Object} value - Données de la station
 * @param {Array} mesure - Mesures sélectionnées
 */
function setupMarkerEvents(stationMarker, textMarker, value, mesure) {
    const clickHandler = () => {
        if (
            state.globalSelectedMarker &&
            state.globalSelectedMarker !== stationMarker
        ) {
            state.globalSelectedMarker.setZIndexOffset(0);
            state.globalSelectedMarker._icon.classList.remove(
                'marker-selected'
            );
        }

        if (
            state.globalSelectedText &&
            state.globalSelectedText !== textMarker
        ) {
            state.globalSelectedText.setZIndexOffset(0);
            state.globalSelectedText._icon.classList.remove('marker-selected');
        }

        stationMarker.setZIndexOffset(1000);
        textMarker.setZIndexOffset(1000);
        stationMarker._icon.classList.add('marker-selected');
        textMarker._icon.classList.add('marker-selected');

        state.globalSelectedMarker = stationMarker;
        state.globalSelectedText = textMarker;
        window.globalSelectedDeviceId = value.id_station;
        state.lastSelectedStationData = value;

        console.log('Click on station: ' + value.id_station);
        openSidePanel_stationRef(
            value.id_station,
            value.nom_station,
            getArrayFromLocalStorage(mesuresLocal)
        );
    };

    stationMarker.on('click', clickHandler);
    textMarker.on('click', clickHandler);
}

/**
 * Détermine la taille du texte en fonction de la valeur
 * @param {number} valeur - Valeur du polluant
 * @returns {number} Taille du texte
 */
function getTextSize(valeur) {
    if (valeur >= 100) return 20;
    if (valeur >= 10) return 25;
    return 32;
}

/**
 * Détermine la position du texte en fonction de la valeur
 * @param {number} valeur - Valeur du polluant
 * @returns {Array} Position [x, y]
 */
function getTextPosition(valeur) {
    if (valeur >= 100) return [0, 25]; // Centré pour 3 chiffres
    if (valeur >= 10) return [0, 25]; // Centré pour 2 chiffres
    return [0, 25]; // Centré pour 1 chiffre
}

/**
 * Crée les marqueurs par défaut pour les stations sans données
 */
function createDefaultMarkers() {
    // Vérifier si window.stationsRef existe, sinon l'initialiser
    if (!window.stationsRef) {
        window.stationsRef = [];
    }

    // Créer des marqueurs par défaut pour toutes les stations actives
    window.stationsRef.forEach((station) => {
        // Ne pas créer de marqueur par défaut si la station a déjà des données
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

            // Ajout du marqueur à la couche
            window.atmoRefLayer.addLayer(defaultMarker);

            defaultMarker.on('click', () => {
                if (
                    state.globalSelectedMarker &&
                    state.globalSelectedMarker !== defaultMarker
                ) {
                    state.globalSelectedMarker.setZIndexOffset(0);
                    state.globalSelectedMarker._icon.classList.remove(
                        'marker-selected'
                    );
                }

                if (state.globalSelectedText) {
                    state.globalSelectedText.setZIndexOffset(0);
                    state.globalSelectedText._icon.classList.remove(
                        'marker-selected'
                    );
                }

                state.globalSelectedMarker = defaultMarker;
                state.globalSelectedText = null;
                window.globalSelectedDeviceId = station.id_station;
                state.lastSelectedStationData = station;

                console.log('Click on station: ' + station.id_station);
                openSidePanel_stationRef(
                    station.id_station,
                    station.nom_station,
                    getArrayFromLocalStorage(mesuresLocal)
                );
            });

            window.stationMarkers[station.id_station].marker = defaultMarker;
        }
    });
}

/**
 * Ouvre le panneau latéral pour une station
 * @param {string} stationID - ID de la station
 * @param {string} station_name - Nom de la station
 * @param {Array} mesure - Mesures sélectionnées
 */
export function openSidePanel_stationRef(stationID, station_name, mesure) {
    const closeButton = document
        .getElementById('toggleSidePanel')
        .querySelector('i');
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');

    // Définition de l'historique par défaut en fonction du pas de temps
    if (state.pasDeTempsAtmo === 'horaire') {
        state.historiqueChart = '24h';
    } else if (state.pasDeTempsAtmo === 'journalière') {
        state.historiqueChart = '30d';
    } else {
        state.historiqueChart = '3h';
    }

    state.pasDeTempsChart = state.pasDeTempsAtmo;

    // Initialisation de state.mesuresArray uniquement s'il est vide
    if (state.mesuresArray.length === 0) {
        // Conversion du polluant pour l'API
        let polluantAPI = mesure[0];
        if (polluantAPI === 'pm25') {
            polluantAPI = 'pm2.5';
        }
        state.mesuresArray.push(polluantAPI);
    }

    // Réinitialisation des boutons
    Object.values(buttons.historique).forEach((btn) => {
        if (btn) {
            btn.checked = false;
            btn.disabled = false;
        }
    });
    Object.values(buttons.pasDeTemps).forEach((btn) => {
        if (btn) {
            btn.checked = false;
            btn.disabled = false;
        }
    });
    Object.values(buttons.polluants).forEach((btn) => {
        if (btn) {
            btn.checked = false;
            btn.disabled = false;
        }
    });

    // Mise à jour des boutons des filtres
    const btnHistorique = buttons.historique[state.historiqueChart];
    if (btnHistorique) {
        btnHistorique.checked = true;
    }

    // Désactivation du bouton 2min
    buttons.pasDeTemps['2min'].disabled = true;

    // Conversion du pas de temps pour l'interface et sélection du bouton correspondant
    let btnPasDeTempsId;
    switch (state.pasDeTempsAtmo) {
        case 'brute':
            btnPasDeTempsId = 'btn_pas_de_temps_2min';
            break;
        case 'quart-horaire':
            btnPasDeTempsId = 'btn_pas_de_temps_qh';
            break;
        case 'horaire':
            btnPasDeTempsId = 'btn_pas_de_temps_h';
            break;
        case 'journalière':
            btnPasDeTempsId = 'btn_pas_de_temps_d';
            break;
        default:
            btnPasDeTempsId = 'btn_pas_de_temps_h';
    }

    const btnPasDeTemps = document.getElementById(btnPasDeTempsId);
    if (btnPasDeTemps) {
        btnPasDeTemps.checked = true;
    }

    // Sélection des boutons des polluants actifs
    state.mesuresArray.forEach((polluant) => {
        let buttonId = polluant;
        if (polluant === 'pm2.5') {
            buttonId = 'pm25';
        }
        const btn = buttons.polluants[buttonId];
        if (btn) {
            btn.checked = true;
        }
    });

    // Récupération des données historiques
    retreiveHistoriqueDataStationRef(
        stationID,
        state.pasDeTempsAtmo,
        state.historiqueChart,
        state.mesuresArray
    );

    // Mise à jour des informations de la carte
    card1_img.src = 'img/stationsRefAtmoSud/refStationAtmoSud_default.png';
    card1_title.innerHTML = station_name;
    card1_subtitle.innerHTML = 'Station de référence AtmoSud';
    card1_text.innerHTML = '';

    card2_text.innerHTML =
        "Les stations de référence sont des stations de mesure de la qualité de l'air déployées par AtmoSud pour mesurer précisément la qualité de l'air.";
    card2_link.innerHTML = 'AtmoSud.org';
    card2_link.href = 'https://www.atmosud.org';

    setupButtonHandlers(stationID);
    openSidePanelGeneric();
}

/**
 * Configure les gestionnaires d'événements pour les boutons
 * @param {string} stationID - ID de la station
 */
function setupButtonHandlers(stationID) {
    // Vérifier si la source stationRef est active
    if (!isSourceActive('atmo_ref')) {
        return;
    }

    setupHistoriqueButtonHandlers(stationID);
    setupPasDeTempsButtonHandlers(stationID);
    setupPollutantButtonHandlers(stationID);
}

/**
 * Configure les gestionnaires d'événements pour les boutons d'historique
 * @param {string} stationID - ID de la station
 */
function setupHistoriqueButtonHandlers(stationID) {
    // Vérifier si la source stationRef est active
    if (!isSourceActive('atmo_ref')) {
        return;
    }

    const btnHistoriqueCustom = buttons.historique.custom;
    const btnHistoriqueStartDate = buttons.historique.startDate;
    const btnHistoriqueEndDate = buttons.historique.endDate;

    if (btnHistoriqueCustom) {
        btnHistoriqueCustom.onclick = (event) => {
            event.preventDefault();
            const startDate = btnHistoriqueStartDate.value;
            const endDate = btnHistoriqueEndDate.value;
            const startTime = '00:00';
            const endTime = '23:59';

            if (startDate && startTime && endDate && endTime) {
                Object.values(buttons.historique).forEach(
                    (btn) => (btn.checked = false)
                );
                btnHistoriqueCustom.checked = true;

                const startDateTime = new Date(
                    `${startDate}T${startTime}`
                ).toISOString();
                const endDateTime = new Date(
                    `${endDate}T${endTime}`
                ).toISOString();

                retreiveHistoriqueDataStationRef(
                    stationID,
                    state.pasDeTempsChart,
                    null,
                    state.mesuresArray,
                    false,
                    startDateTime,
                    endDateTime
                );
            } else {
                alert(
                    'Veuillez sélectionner une date et une heure de début et de fin.'
                );
            }
        };
    }

    setupHistoriqueButton('1h', stationID);
    setupHistoriqueButton('3h', stationID);
    setupHistoriqueButton('24h', stationID);
    setupHistoriqueButton('7d', stationID);
    setupHistoriqueButton('30d', stationID);
    setupHistoriqueButton('365d', stationID);
}

/**
 * Configure un bouton d'historique spécifique
 * @param {string} periode - Période de l'historique
 * @param {string} stationID - ID de la station
 */
function setupHistoriqueButton(periode, stationID) {
    const btn = buttons.historique[periode];
    if (btn) {
        btn.onclick = () => {
            state.historiqueChart = periode;
            // Réinitialiser la plage de dates personnalisée
            state.customDateRange.start = null;
            state.customDateRange.end = null;
            Object.values(buttons.historique).forEach((b) => {
                if (b) {
                    b.checked = false;
                }
            });
            if (btn) {
                btn.checked = true;
            }
            retreiveHistoriqueDataStationRef(
                stationID,
                state.pasDeTempsChart,
                state.historiqueChart,
                state.mesuresArray
            );
        };
    }
}

/**
 * Configure les gestionnaires d'événements pour les boutons de pas de temps
 * @param {string} stationID - ID de la station
 */
function setupPasDeTempsButtonHandlers(stationID) {
    // Vérifier si la source stationRef est active
    if (!isSourceActive('atmo_ref')) {
        return;
    }

    setupPasDeTempsButton('2min', 'brute', stationID);
    setupPasDeTempsButton('qh', 'quart-horaire', stationID);
    setupPasDeTempsButton('h', 'horaire', stationID);
    setupPasDeTempsButton('d', 'journalière', stationID);
}

/**
 * Configure un bouton de pas de temps spécifique
 * @param {string} id - ID du bouton
 * @param {string} pasDeTemps - Pas de temps correspondant
 * @param {string} stationID - ID de la station
 */
function setupPasDeTempsButton(id, pasDeTemps, stationID) {
    const btn = buttons.pasDeTemps[id];
    if (btn) {
        btn.onclick = () => {
            state.pasDeTempsChart = pasDeTemps;
            Object.values(buttons.pasDeTemps).forEach(
                (b) => (b.checked = false)
            );
            btn.checked = true;
            retreiveHistoriqueDataStationRef(
                stationID,
                state.pasDeTempsChart,
                state.historiqueChart,
                state.mesuresArray
            );
        };
    }
}

/**
 * Configure les gestionnaires d'événements pour les boutons de polluants
 * @param {string} stationID - ID de la station
 */
function setupPollutantButtonHandlers(stationID) {
    console.log('Configuration des boutons de polluants');

    const polluants = {
        pm1: 'pm1',
        pm25: 'pm2.5',
        pm10: 'pm10',
        no2: 'no2',
        o3: 'o3',
        so2: 'so2',
    };

    Object.entries(polluants).forEach(([buttonId, pollutant]) => {
        const button = document.getElementById(`btn_poluant_${buttonId}`);
        if (button) {
            console.log(`Configuration du bouton ${buttonId}`);

            // Changer le type en checkbox
            button.type = 'checkbox';

            // Supprimer l'attribut name pour éviter le comportement radio
            button.removeAttribute('name');

            // Gestionnaire pour les changements
            button.addEventListener('change', function (e) {
                console.log(`Événement change détecté pour ${buttonId}`);
                console.log(`État du bouton: ${this.checked}`);

                // Vérifier si la source stationRef est active
                if (!isSourceActive('atmo_ref')) {
                    return;
                }

                // Mise à jour du tableau des mesures
                if (this.checked) {
                    if (!state.mesuresArray.includes(pollutant)) {
                        state.mesuresArray.push(pollutant);
                    }
                } else {
                    state.mesuresArray = state.mesuresArray.filter(
                        (item) => item !== pollutant
                    );
                }

                console.log('Mesures après mise à jour:', state.mesuresArray);

                // Mise à jour des données uniquement si une station est sélectionnée
                if (window.globalSelectedDeviceId) {
                    // Nettoyage complet du graphique avant la mise à jour
                    if (window.amchart_root_station) {
                        window.amchart_root_station.dispose();
                        window.amchart_root_station = undefined;
                    }
                    document.getElementById('chartdiv_sensor').innerHTML = '';

                    retreiveHistoriqueDataStationRef(
                        window.globalSelectedDeviceId,
                        state.pasDeTempsChart,
                        state.historiqueChart,
                        state.mesuresArray
                    );
                }
            });
        } else {
            console.warn(`Bouton ${buttonId} non trouvé`);
        }
    });
}

/**
 * Récupère les données historiques d'une station
 * @param {string} stationId - ID de la station
 * @param {string} pasDeTemps - Pas de temps
 * @param {string} historique - Période historique
 * @param {Array} mesuresArray - Tableau des mesures
 * @param {boolean} addMesure - Ajouter une mesure
 * @param {string} customStart - Date de début personnalisée
 * @param {string} customEnd - Date de fin personnalisée
 */
export function retreiveHistoriqueDataStationRef(
    stationId,
    pasDeTemps,
    historique,
    mesuresArray,
    addMesure = false,
    customStart = null,
    customEnd = null
) {
    // Vérification que la station sélectionnée est toujours la même
    if (stationId !== window.globalSelectedDeviceId) {
        console.log(
            'La station sélectionnée a changé, annulation de la requête'
        );
        return;
    }

    console.log(
        '%cretreiveHistoriqueDataStationRef',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now();

    // Nettoyage complet du graphique précédent
    const chartDiv = document.getElementById('chartdiv_sensor');
    if (chartDiv) {
        chartDiv.innerHTML = '';
    }

    // Nettoyage de toutes les instances amCharts existantes
    if (window.amchart_root) {
        try {
            window.amchart_root.dispose();
        } catch (e) {
            console.warn("Erreur lors du nettoyage de l'instance amCharts:", e);
        }
        window.amchart_root = undefined;
    }

    // Réinitialisation des données
    state.mesuresArray = [...mesuresArray];
    state.pasDeTempsChart = pasDeTemps;
    state.historiqueChart = historique;

    // Conversion du pas de temps pour l'API
    let pasDeTempsAPI;
    switch (pasDeTemps) {
        case 'brute':
        case '2min':
            pasDeTempsAPI = 'brute';
            break;
        case 'quart-horaire':
        case 'qh':
            pasDeTempsAPI = 'quart-horaire';
            break;
        case 'horaire':
        case 'h':
            pasDeTempsAPI = 'horaire';
            break;
        case 'journalière':
        case 'd':
            pasDeTempsAPI = 'journalière';
            break;
        default:
            pasDeTempsAPI = pasDeTemps;
    }

    // Construction de l'URL avec les paramètres
    let fullUrl = `https://api.atmosud.org/observations/stations/mesures?
        format=json&
        station_id=${stationId}&
        nom_polluant=${state.mesuresArray.join(',')}&
        temporalite=${pasDeTempsAPI}&
        download=false&
        metadata=true`.replace(/\s+/g, '');

    // Ajout des paramètres de date
    if (customStart && customEnd) {
        fullUrl += `&date_debut=${customStart}&date_fin=${customEnd}`;
    } else if (state.customDateRange.start && state.customDateRange.end) {
        fullUrl += `&date_debut=${state.customDateRange.start}&date_fin=${state.customDateRange.end}`;
    } else if (historique) {
        const endDate = new Date();
        const startDate = new Date();

        switch (historique) {
            case '1h':
                startDate.setHours(startDate.getHours() - 1);
                break;
            case '3h':
                startDate.setHours(startDate.getHours() - 3);
                break;
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '365d':
                startDate.setDate(startDate.getDate() - 365);
                break;
        }

        fullUrl += `&date_debut=${startDate.toISOString()}&date_fin=${endDate.toISOString()}`;
    }

    // Appel API
    fetch(fullUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log('Données reçues:', data);

            if (!data.mesures || data.mesures.length === 0) {
                console.warn('Aucune donnée disponible');
                return;
            }

            // Initialisation des données pour le graphique
            let seriesData = {};

            // Traitement des données
            data.mesures.forEach((item) => {
                let nomPolluant;
                const labelLower = item.label_polluant.toLowerCase();

                if (
                    labelLower.includes('pm10') ||
                    labelLower.includes('particules en suspension <10 µm')
                ) {
                    nomPolluant = 'pm10';
                } else if (
                    labelLower.includes('pm2.5') ||
                    labelLower.includes('particules en suspension <2.5 µm')
                ) {
                    nomPolluant = 'pm2.5';
                } else if (
                    labelLower.includes('pm1') ||
                    labelLower.includes('particules en suspension <1 µm')
                ) {
                    nomPolluant = 'pm1';
                } else if (
                    labelLower.includes('no2') ||
                    labelLower.includes("dioxyde d'azote")
                ) {
                    nomPolluant = 'no2';
                } else if (
                    labelLower.includes('o3') ||
                    labelLower.includes('ozone')
                ) {
                    nomPolluant = 'o3';
                } else if (
                    labelLower.includes('so2') ||
                    labelLower.includes('dioxyde de soufre')
                ) {
                    nomPolluant = 'so2';
                }

                if (nomPolluant && state.mesuresArray.includes(nomPolluant)) {
                    if (!seriesData[nomPolluant]) {
                        seriesData[nomPolluant] = {
                            data: [],
                            label: item.label_polluant,
                        };
                    }
                    if (item.valeur !== null) {
                        seriesData[nomPolluant].data.push({
                            value: item.valeur,
                            date: new Date(item.date_debut).getTime(),
                        });
                    }
                } else {
                    console.log('Polluant non traité:', {
                        label: item.label_polluant,
                        labelLower: labelLower,
                        mesuresArray: state.mesuresArray,
                        nomPolluant: nomPolluant,
                    });
                }
            });

            // Tri des données par date pour chaque polluant
            Object.keys(seriesData).forEach((polluant) => {
                seriesData[polluant].data.sort((a, b) => a.date - b.date);
            });

            // Création du graphique
            am5.ready(function () {
                // Vérification que l'élément existe toujours
                const chartDiv = document.getElementById('chartdiv_sensor');
                if (!chartDiv) {
                    console.error("L'élément chartdiv_sensor n'existe plus");
                    return;
                }

                // Nettoyage supplémentaire pour s'assurer qu'il n'y a pas d'instances résiduelles
                if (window.amchart_root) {
                    try {
                        window.amchart_root.dispose();
                    } catch (e) {
                        console.warn(
                            "Erreur lors du nettoyage de l'instance amCharts:",
                            e
                        );
                    }
                }

                // Création du root element
                window.amchart_root = am5.Root.new('chartdiv_sensor');

                // Création du graphique
                let chart = window.amchart_root.container.children.push(
                    am5xy.XYChart.new(window.amchart_root, {
                        panX: false,
                        panY: false,
                        wheelX: 'panX',
                        wheelY: 'zoomX',
                        paddingLeft: 0,
                        paddingBottom: 100,
                    })
                );

                // Ajout du curseur
                let cursor = chart.set(
                    'cursor',
                    am5xy.XYCursor.new(amchart_root, {
                        behavior: 'zoomX',
                    })
                );
                cursor.lineY.set('visible', false);

                // Configuration de l'axe X avec gestion flexible des pas de temps
                let baseIntervalConfig = {
                    timeUnit: 'minute',
                    count: 1,
                };

                // Ajustement de l'intervalle en fonction du pas de temps
                if (state.pasDeTempsChart === '2min') {
                    baseIntervalConfig = {
                        timeUnit: 'minute',
                        count: 2,
                    };
                } else if (state.pasDeTempsChart === 'quart-horaire') {
                    baseIntervalConfig = {
                        timeUnit: 'minute',
                        count: 15,
                    };
                } else if (state.pasDeTempsChart === 'horaire') {
                    baseIntervalConfig = {
                        timeUnit: 'hour',
                        count: 1,
                    };
                } else if (state.pasDeTempsChart === 'journalière') {
                    baseIntervalConfig = {
                        timeUnit: 'day',
                        count: 1,
                    };
                }

                let xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(amchart_root, {
                        maxDeviation: 0.2,
                        baseInterval: baseIntervalConfig,
                        renderer: am5xy.AxisRendererX.new(amchart_root, {
                            minorGridEnabled: true,
                        }),
                        tooltip: am5.Tooltip.new(amchart_root, {}),
                        dateFormats: {
                            minute: 'HH:mm',
                            hour: 'HH:mm',
                            day: 'dd/MM HH:mm',
                        },
                        periodChangeDateFormats: {
                            minute: 'HH:mm',
                            hour: 'HH:mm',
                            day: 'dd/MM HH:mm',
                        },
                    })
                );

                // Configuration de l'axe Y
                let yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(amchart_root, {
                        renderer: am5xy.AxisRendererY.new(amchart_root, {}),
                        min: 0,
                    })
                );

                // Création des séries pour chaque polluant
                Object.keys(seriesData).forEach((polluant) => {
                    let series = chart.series.push(
                        am5xy.SmoothedXLineSeries.new(amchart_root, {
                            name: seriesData[polluant].label,
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: 'value',
                            valueXField: 'date',
                            tooltip: am5.Tooltip.new(amchart_root, {
                                labelText: '{name}: {valueY} µg/m³',
                            }),
                        })
                    );
                    series.data.setAll(seriesData[polluant].data);
                });

                // Ajout de la légende
                let legend = chart.children.push(
                    am5.Legend.new(amchart_root, {
                        centerX: am5.percent(50),
                        x: am5.percent(50),
                        y: am5.percent(95),
                        layout: am5.GridLayout.new(amchart_root, {
                            maxColumns: 2,
                            fixedWidthGrid: true,
                        }),
                    })
                );
                legend.data.setAll(chart.series.values);

                // Animation
                chart.appear(1000, 100);
            });
        })
        .catch((error) => {
            console.error('Erreur lors de la récupération des données:', error);
            // Nettoyage en cas d'erreur
            if (window.amchart_root) {
                try {
                    window.amchart_root.dispose();
                } catch (e) {
                    console.warn(
                        "Erreur lors du nettoyage de l'instance amCharts:",
                        e
                    );
                }
                window.amchart_root = undefined;
            }
        });
}

// Initialisation des boutons au chargement du DOM
document.addEventListener('DOMContentLoaded', function () {
    // Initialisation des boutons d'historique
    Object.keys(buttons.historique).forEach((key) => {
        buttons.historique[key] = document.getElementById(
            `btn_historique_${key}`
        );
    });

    // Initialisation des boutons de pas de temps
    Object.keys(buttons.pasDeTemps).forEach((key) => {
        buttons.pasDeTemps[key] = document.getElementById(
            `btn_pas_de_temps_${key}`
        );
    });

    // Initialisation des boutons de polluants
    Object.keys(buttons.polluants).forEach((key) => {
        buttons.polluants[key] = document.getElementById(`btn_poluant_${key}`);
    });

    // Configuration des gestionnaires d'événements
    setupButtonHandlers();
});
