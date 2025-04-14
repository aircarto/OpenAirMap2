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

// Variables globales du module
let pasDeTempsChart = '1h';
let pasDeTempsAtmo = '';
let pasDeTemps = '';
let historiqueChart = '7d';
let mesuresArray = [];
let globalSelectedStationId = null;

// Déclaration des variables pour les boutons
let btnHistoriqueCustom;
let btnHistoriqueStartDate;
let btnHistoriqueEndDate;
let btnHistorique1h;
let btnHistorique3h;
let btnHistorique24h;
let btnHistorique7d;
let btnHistorique30d;
let btnHistorique365d;
let btnPasDeTemps2min;
let btnPasDeTempsQh;
let btnPasDeTempsH;
let btnPasDeTempsD;
let btnPolutantPm1;
let btnPolutantPm25;
let btnPolutantPm10;
let btnPolutantNo2;

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

    pasDeTemps = getArrayFromLocalStorage(pasDeTempsLocal);

    // Conversion du pas de temps pour l'API AtmoSud
    switch (pasDeTemps[0]) {
        case '2min':
            pasDeTempsAtmo = 'brute';
            break;
        case 'qh':
            pasDeTempsAtmo = 'quart-horaire';
            break;
        case 'h':
            pasDeTempsAtmo = 'horaire';
            break;
        case 'd':
            pasDeTempsAtmo = 'journalière';
            break;
    }

    // Récupération et conversion des mesures
    const mesure = getArrayFromLocalStorage(mesuresLocal);
    let mesureAtmo = mesure[0];
    if (mesure[0] === 'pm25') {
        mesureAtmo = 'pm2.5';
    }

    // Vérification de la disponibilité des données
    if (pasDeTemps[0] === '2min') {
        console.warn('Pas de données pour le pas de temps ' + pasDeTemps[0]);
        return;
    }

    console.log('Pas de temps : ' + pasDeTemps);
    console.log('Pas de temps Atmo: ' + pasDeTempsAtmo);
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
            data.stations.forEach((item) => {
                const dateFinStation = new Date(item.date_fin_mesure);
                if (today < dateFinStation || item.date_fin_mesure === null) {
                    window.stationMarkers[item.id_station] = {
                        data: item,
                        hasValue: false,
                    };
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
                temporalite=${pasDeTempsAtmo}&
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
        if (globalSelectedMarker !== stationMarker) {
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
            window.globalSelectedMarker &&
            window.globalSelectedMarker !== stationMarker
        ) {
            window.globalSelectedMarker.setZIndexOffset(0);
            window.globalSelectedMarker._icon.classList.remove(
                'marker-selected'
            );
        }

        if (
            window.globalSelectedText &&
            window.globalSelectedText !== textMarker
        ) {
            window.globalSelectedText.setZIndexOffset(0);
            window.globalSelectedText._icon.classList.remove('marker-selected');
        }

        stationMarker.setZIndexOffset(1000);
        textMarker.setZIndexOffset(1000);
        stationMarker._icon.classList.add('marker-selected');
        textMarker._icon.classList.add('marker-selected');

        window.globalSelectedMarker = stationMarker;
        window.globalSelectedText = textMarker;
        window.globalSelectedStationId = value.id_station;
        window.lastSelectedStationData = value;

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
    Object.entries(window.stationMarkers).forEach(([stationId, stationObj]) => {
        if (!stationObj.hasValue && stationObj.data) {
            const item = stationObj.data;
            const iconParam = {
                iconUrl: 'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                iconSize: [50, 50],
                iconAnchor: [25, 25],
                popupAnchor: [0, -10],
                tooltipAnchor: [-50, -10],
                className: item.id_station,
            };

            const stationMarker = L.marker([item.latitude, item.longitude], {
                icon: L.icon(iconParam),
            });

            // Ajout du marqueur à la couche

            window.atmoRefLayer.addLayer(stationMarker);

            stationMarker.on('click', () => {
                if (
                    window.globalSelectedMarker &&
                    window.globalSelectedMarker !== stationMarker
                ) {
                    window.globalSelectedMarker.setZIndexOffset(0);
                    window.globalSelectedMarker._icon.classList.remove(
                        'marker-selected'
                    );
                }

                if (window.globalSelectedText) {
                    window.globalSelectedText.setZIndexOffset(0);
                    window.globalSelectedText._icon.classList.remove(
                        'marker-selected'
                    );
                }

                stationMarker.setZIndexOffset(1000);
                stationMarker._icon.classList.add('marker-selected');

                window.globalSelectedMarker = stationMarker;
                window.globalSelectedText = null;
                window.globalSelectedStationId = item.id_station;
                window.lastSelectedStationData = item;

                console.log('Click on station: ' + item.id_station);
                openSidePanel_stationRef(
                    item.id_station,
                    item.nom_station,
                    getArrayFromLocalStorage(mesuresLocal)
                );
            });

            window.stationMarkers[stationId].marker = stationMarker;
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
    if (pasDeTempsAtmo === 'horaire') {
        historiqueChart = '24h';
    } else if (pasDeTempsAtmo === 'journalière') {
        historiqueChart = '30d';
    } else {
        historiqueChart = '3h';
    }

    pasDeTempsChart = pasDeTempsAtmo;
    mesuresArray.length = 0;

    // Conversion du polluant pour l'API
    let polluantAPI = mesure[0];
    if (polluantAPI === 'pm25') {
        polluantAPI = 'pm2.5';
    }
    mesuresArray.push(polluantAPI);

    // Réinitialisation des boutons
    const historiqueButtons = document.querySelectorAll(
        '[id^="btn_historique_"]'
    );
    const pasDeTempsButtons = document.querySelectorAll(
        '[id^="btn_pas_de_temps_"]'
    );
    const polluantsButtons = document.querySelectorAll('[id^="btn_poluant_"]');

    historiqueButtons.forEach((btn) => (btn.checked = false));
    pasDeTempsButtons.forEach((btn) => (btn.checked = false));
    polluantsButtons.forEach((btn) => (btn.checked = false));

    // Mise à jour des boutons des filtres
    const btnHistorique = document.getElementById(
        'btn_historique_' + historiqueChart
    );
    if (btnHistorique) {
        btnHistorique.checked = true;
    }

    // Conversion du pas de temps pour l'interface
    let btnPasDeTempsId = 'btn_pas_de_temps_h';
    switch (pasDeTempsAtmo) {
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
    }

    const btnPasDeTemps = document.getElementById(btnPasDeTempsId);
    if (btnPasDeTemps) {
        btnPasDeTemps.checked = true;
    }

    // Sélection du bouton du polluant actif
    let activeMeasure = mesure[0];
    if (activeMeasure === 'pm25') {
        activeMeasure = 'pm2.5';
    }

    const btnPoluantPm1 = document.getElementById('btn_poluant_pm1');
    const btnPoluantPm25 = document.getElementById('btn_poluant_pm25');
    const btnPoluantPm10 = document.getElementById('btn_poluant_pm10');
    const btnPoluantNo2 = document.getElementById('btn_poluant_no2');

    if (activeMeasure === 'pm1' && btnPoluantPm1) {
        btnPoluantPm1.checked = true;
    } else if (activeMeasure === 'pm2.5' && btnPoluantPm25) {
        btnPoluantPm25.checked = true;
    } else if (activeMeasure === 'pm10' && btnPoluantPm10) {
        btnPoluantPm10.checked = true;
    } else if (activeMeasure === 'no2' && btnPoluantNo2) {
        btnPoluantNo2.checked = true;
    }

    // Récupération des données historiques
    retreiveHistoriqueDataStationRef(
        stationID,
        pasDeTempsAtmo,
        historiqueChart,
        mesuresArray
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
    setupHistoriqueButtonHandlers(stationID);
    setupPasDeTempsButtonHandlers(stationID);
    setupPollutantButtonHandlers(stationID);
}

/**
 * Configure les gestionnaires d'événements pour les boutons d'historique
 * @param {string} stationID - ID de la station
 */
function setupHistoriqueButtonHandlers(stationID) {
    const btnHistoriqueCustom = document.getElementById(
        'btn_historique_custom'
    );
    const btnHistoriqueStartDate = document.getElementById(
        'btn_historique_start_date'
    );
    const btnHistoriqueEndDate = document.getElementById(
        'btn_historique_end_date'
    );

    if (btnHistoriqueCustom) {
        btnHistoriqueCustom.onclick = (event) => {
            event.preventDefault();
            const startDate = btnHistoriqueStartDate.value;
            const endDate = btnHistoriqueEndDate.value;
            const startTime = '00:00';
            const endTime = '23:59';

            if (startDate && startTime && endDate && endTime) {
                document
                    .querySelectorAll('[id^="btn_historique_"]')
                    .forEach((btn) => (btn.checked = false));
                btnHistoriqueCustom.checked = true;

                const startDateTime = new Date(
                    `${startDate}T${startTime}`
                ).toISOString();
                const endDateTime = new Date(
                    `${endDate}T${endTime}`
                ).toISOString();

                retreiveHistoriqueDataStationRef(
                    stationID,
                    pasDeTempsChart,
                    null,
                    mesuresArray,
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
    const btn = document.getElementById(`btn_historique_${periode}`);
    if (btn) {
        btn.onclick = () => {
            historiqueChart = periode;
            document
                .querySelectorAll('[id^="btn_historique_"]')
                .forEach((b) => (b.checked = false));
            btn.checked = true;
            retreiveHistoriqueDataStationRef(
                stationID,
                pasDeTempsChart,
                historiqueChart,
                mesuresArray
            );
        };
    }
}

/**
 * Configure les gestionnaires d'événements pour les boutons de pas de temps
 * @param {string} stationID - ID de la station
 */
function setupPasDeTempsButtonHandlers(stationID) {
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
    const btn = document.getElementById(`btn_pas_de_temps_${id}`);
    if (btn) {
        btn.onclick = () => {
            pasDeTempsChart = pasDeTemps;
            document
                .querySelectorAll('[id^="btn_pas_de_temps_"]')
                .forEach((b) => (b.checked = false));
            btn.checked = true;
            retreiveHistoriqueDataStationRef(
                stationID,
                pasDeTempsChart,
                historiqueChart,
                mesuresArray
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

    const buttons = {
        pm1: 'pm1',
        pm25: 'pm2.5',
        pm10: 'pm10',
        no2: 'no2',
    };

    Object.entries(buttons).forEach(([buttonId, pollutant]) => {
        const button = document.getElementById(`btn_poluant_${buttonId}`);
        if (button) {
            console.log(`Configuration du bouton ${buttonId}`);

            // Supprimer tous les écouteurs d'événements existants
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            // Changer le type en checkbox
            newButton.type = 'checkbox';

            // Gestionnaire pour les changements
            newButton.addEventListener('change', function (e) {
                console.log(`Événement change détecté pour ${buttonId}`);
                console.log(`État du bouton: ${this.checked}`);

                // Vérifier si la source stationRef est active
                if (!isSourceActive('atmo_ref')) {
                    return;
                }

                // Mise à jour du tableau des mesures
                if (this.checked) {
                    if (!mesuresArray.includes(pollutant)) {
                        mesuresArray.push(pollutant);
                    }
                } else {
                    mesuresArray = mesuresArray.filter(
                        (item) => item !== pollutant
                    );
                }

                console.log('Mesures après mise à jour:', mesuresArray);

                // Mise à jour des données uniquement si une station est sélectionnée
                if (window.globalSelectedStationId) {
                    retreiveHistoriqueDataStationRef(
                        window.globalSelectedStationId,
                        pasDeTempsChart,
                        historiqueChart,
                        mesuresArray
                    );
                }
            });

            // Gestionnaire pour le clic
            newButton.addEventListener('click', function (e) {
                // Permettre la désélection
                if (this.checked && mesuresArray.includes(pollutant)) {
                    this.checked = false;
                    this.dispatchEvent(new Event('change'));
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
    console.log(
        '%cretreiveHistoriqueDataStationRef',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now();

    // Nettoyage du graphique précédent
    if (amchart_root) {
        amchart_root.dispose();
        amchart_root = undefined;
    }
    document.getElementById('chartdiv_sensor').innerHTML = '';

    // Récupération des mesures
    const mesure = getArrayFromLocalStorage(mesuresLocal);

    // Transformation des mesures pour l'API
    const mesuresStringComma = mesuresArray
        .map((value) => (value === 'pm25' ? 'pm2.5' : value))
        .join(',');

    let fullUrl = `https://api.atmosud.org/observations/stations/mesures?
        format=json&
        station_id=${stationId}&
        nom_polluant=${mesuresStringComma}&
        temporalite=${pasDeTemps}&
        download=false&
        metadata=true`.replace(/\s+/g, '');

    // Ajout des paramètres de date
    if (customStart && customEnd) {
        fullUrl += `&date_debut=${customStart}&date_fin=${customEnd}`;
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

    // Premier appel API pour obtenir les données historiques
    fetch(fullUrl)
        .then((response) => {
            if (!response.ok) {
                console.warn(
                    `Erreur lors de la récupération des données historiques: ${response.status}`
                );
                return { mesures: [] }; // Retourne un tableau vide en cas d'erreur
            }
            return response.json();
        })
        .then((data) => {
            console.log('Call API get historique stations:');
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log('full url historique: ' + fullUrl);
            console.log(data);

            // Traitement des données historiques
            if (data.mesures && data.mesures.length > 0) {
                // Initialisation de seriesData
                let seriesData = {};

                data.mesures.forEach((item) => {
                    const stationData =
                        window.stationMarkers[item.id_station]?.data;
                    if (!stationData) return;

                    // Déterminer le nom du polluant en fonction du label_polluant
                    let nomPolluant;
                    const labelLower = item.label_polluant.toLowerCase();

                    if (
                        labelLower.includes('pm10') ||
                        labelLower.includes(
                            'particules en suspension <10 µm'
                        ) ||
                        labelLower.includes(
                            'particules en suspension <10 µm (masses)'
                        ) ||
                        labelLower.includes('(pm10)')
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
                    }

                    if (nomPolluant && mesuresArray.includes(nomPolluant)) {
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
                    }
                });

                // Tri des données par date pour s'assurer qu'elles sont dans le bon ordre
                Object.keys(seriesData).forEach((variable) => {
                    seriesData[variable].data.sort((a, b) => a.date - b.date);
                });

                // Création du graphique
                if (amchart_root != undefined) {
                    amchart_root.dispose();
                }

                // Vider le conteneur du graphique
                document.getElementById('chartdiv_sensor').innerHTML = '';

                am5.ready(function () {
                    // Création du root element
                    amchart_root = am5.Root.new('chartdiv_sensor');

                    // Création du graphique
                    let chart = amchart_root.container.children.push(
                        am5xy.XYChart.new(amchart_root, {
                            panX: false,
                            panY: false,
                            wheelX: 'panX',
                            wheelY: 'zoomX',
                            paddingLeft: 0,
                            paddingBottom: 100, // Ajout d'espace pour la légende
                            layout: am5.GridLayout.new(amchart_root, {
                                maxColumns: 1,
                                fixedWidthGrid: true,
                            }),
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

                    // Configuration du pas de temps en fonction de temporalite
                    let baseInterval = {
                        timeUnit: 'minute',
                        count: 15,
                    };
                    let dateFormat = 'HH:mm';

                    switch (pasDeTempsAtmo) {
                        case 'brute':
                            baseInterval = { timeUnit: 'minute', count: 2 };
                            dateFormat = 'HH:mm:ss';
                            break;
                        case 'quart-horaire':
                            baseInterval = { timeUnit: 'minute', count: 15 };
                            dateFormat = 'HH:mm';
                            break;
                        case 'horaire':
                            baseInterval = { timeUnit: 'hour', count: 1 };
                            dateFormat = 'HH:mm';
                            break;
                        case 'journalière':
                            baseInterval = { timeUnit: 'day', count: 1 };
                            dateFormat = 'dd/MM';
                            break;
                    }

                    // Ajout de l'axe X
                    let xAxis = chart.xAxes.push(
                        am5xy.DateAxis.new(amchart_root, {
                            maxDeviation: 0.2,
                            baseInterval: baseInterval,
                            renderer: am5xy.AxisRendererX.new(amchart_root, {
                                minorGridEnabled: true,
                            }),
                            tooltip: am5.Tooltip.new(amchart_root, {}),
                            dateFormats: {
                                minute: dateFormat,
                                hour: dateFormat,
                                day: 'dd/MM',
                                month: 'MMM',
                                year: 'yyyy',
                            },
                            periodChangeDateFormats: {
                                minute: dateFormat,
                                hour: dateFormat,
                                day: 'dd/MM',
                                month: 'MMM',
                                year: 'yyyy',
                            },
                        })
                    );

                    // Ajout de l'axe Y
                    let yAxis = chart.yAxes.push(
                        am5xy.ValueAxis.new(amchart_root, {
                            renderer: am5xy.AxisRendererY.new(amchart_root, {}),
                        })
                    );

                    // Préparation des données pour la série
                    data.mesures.forEach((item) => {
                        // Log détaillé pour comprendre le problème

                        // Déterminer le nom du polluant en fonction du label_polluant
                        let nomPolluant;
                        const labelLower = item.label_polluant.toLowerCase();

                        if (
                            labelLower.includes('pm10') ||
                            labelLower.includes(
                                'particules en suspension <10 µm'
                            ) ||
                            labelLower.includes(
                                'particules en suspension <10 µm (masses)'
                            ) ||
                            labelLower.includes('(pm10)')
                        ) {
                            nomPolluant = 'pm10';
                        } else if (
                            labelLower.includes('pm2.5') ||
                            labelLower.includes(
                                'particules en suspension <2.5 µm'
                            )
                        ) {
                            nomPolluant = 'pm2.5';
                        } else if (
                            labelLower.includes('pm1') ||
                            labelLower.includes(
                                'particules en suspension <1 µm'
                            )
                        ) {
                            nomPolluant = 'pm1';
                        } else if (
                            labelLower.includes('no2') ||
                            labelLower.includes("dioxyde d'azote")
                        ) {
                            nomPolluant = 'no2';
                        }

                        if (nomPolluant && mesuresArray.includes(nomPolluant)) {
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
                                mesuresArray: mesuresArray,
                                nomPolluant: nomPolluant,
                            });
                        }
                    });

                    // Log des données préparées

                    // Tri des données par date pour s'assurer qu'elles sont dans le bon ordre
                    Object.keys(seriesData).forEach((variable) => {
                        seriesData[variable].data.sort(
                            (a, b) => a.date - b.date
                        );
                    });

                    // Création de la série
                    Object.keys(seriesData).forEach((variable) => {
                        let series = chart.series.push(
                            am5xy.SmoothedXLineSeries.new(amchart_root, {
                                name: seriesData[variable].label,
                                xAxis: xAxis,
                                yAxis: yAxis,
                                valueYField: 'value',
                                valueXField: 'date',
                                tooltip: am5.Tooltip.new(amchart_root, {
                                    labelText: '{name}: {valueY} µg/m³',
                                }),
                            })
                        );
                        series.data.setAll(seriesData[variable].data);
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
                            paddingTop: 10,
                            paddingBottom: 10,
                            marginTop: 10,
                            marginBottom: 10,
                        })
                    );
                    legend.data.setAll(chart.series.values);

                    // Animation
                    chart.appear(1000, 100);
                });
            }

            // S'assurer que la couche est sur la carte
            if (!map.hasLayer(window.atmoRefLayer)) {
                map.addLayer(window.atmoRefLayer);
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
                    map.addLayer(window.atmoRefLayer);
                }
            }
        });
}

// Initialisation des boutons au chargement du DOM
document.addEventListener('DOMContentLoaded', function () {
    btnHistoriqueCustom = document.getElementById('apply_date_range');
    btnHistoriqueStartDate = document.getElementById('start_date');
    btnHistoriqueEndDate = document.getElementById('end_date');
    btnHistorique1h = document.getElementById('btn_historique_1h');
    btnHistorique3h = document.getElementById('btn_historique_3h');
    btnHistorique24h = document.getElementById('btn_historique_24h');
    btnHistorique7d = document.getElementById('btn_historique_7d');
    btnHistorique30d = document.getElementById('btn_historique_30d');
    btnHistorique365d = document.getElementById('btn_historique_365d');
    btnPasDeTemps2min = document.getElementById('btn_pas_de_temps_2min');
    btnPasDeTempsQh = document.getElementById('btn_pas_de_temps_qh');
    btnPasDeTempsH = document.getElementById('btn_pas_de_temps_h');
    btnPasDeTempsD = document.getElementById('btn_pas_de_temps_d');
    btnPolutantPm1 = document.getElementById('btn_poluant_pm1');
    btnPolutantPm25 = document.getElementById('btn_poluant_pm25');
    btnPolutantPm10 = document.getElementById('btn_poluant_pm10');
    btnPolutantNo2 = document.getElementById('btn_poluant_no2');
});

// Configuration des gestionnaires d'événements pour les boutons de polluants
if (btn_poluant_pm1) {
    btn_poluant_pm1.addEventListener('change', function () {
        // Vérifier si la source stationRef est active
        const activeSources = getArrayFromLocalStorage('sources_local');
        if (!activeSources.includes('atmo_ref')) {
            return;
        }

        if (this.checked) {
            if (!mesuresArray.includes('pm1')) {
                mesuresArray.push('pm1');
            }
        } else {
            mesuresArray = mesuresArray.filter((item) => item !== 'pm1');
        }
        retreiveHistoriqueDataStationRef(
            window.globalSelectedStationId,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray
        );
    });
}

if (btn_poluant_pm25) {
    btn_poluant_pm25.addEventListener('change', function () {
        // Vérifier si la source stationRef est active
        const activeSources = getArrayFromLocalStorage('sources_local');
        if (!activeSources.includes('atmo_ref')) {
            return;
        }

        if (this.checked) {
            if (!mesuresArray.includes('pm2.5')) {
                mesuresArray.push('pm2.5');
            }
        } else {
            mesuresArray = mesuresArray.filter((item) => item !== 'pm2.5');
        }
        retreiveHistoriqueDataStationRef(
            window.globalSelectedStationId,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray
        );
    });
}

if (btn_poluant_pm10) {
    btn_poluant_pm10.addEventListener('change', function () {
        // Vérifier si la source stationRef est active
        const activeSources = getArrayFromLocalStorage('sources_local');
        if (!activeSources.includes('atmo_ref')) {
            return;
        }

        if (this.checked) {
            if (!mesuresArray.includes('pm10')) {
                mesuresArray.push('pm10');
            }
        } else {
            mesuresArray = mesuresArray.filter((item) => item !== 'pm10');
        }
        retreiveHistoriqueDataStationRef(
            window.globalSelectedStationId,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray
        );
    });
}

if (btn_poluant_no2) {
    btn_poluant_no2.addEventListener('change', function () {
        // Vérifier si la source stationRef est active
        const activeSources = getArrayFromLocalStorage('sources_local');
        if (!activeSources.includes('atmo_ref')) {
            return;
        }

        if (this.checked) {
            if (!mesuresArray.includes('no2')) {
                mesuresArray.push('no2');
            }
        } else {
            mesuresArray = mesuresArray.filter((item) => item !== 'no2');
        }
        retreiveHistoriqueDataStationRef(
            window.globalSelectedStationId,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray
        );
    });
}
