/*
Récupération des données des stations de Référence
->mesure/dernière: problème ne renvoie pas d'infos si pas de mesure
-> Pour la localisation : OBSERVATIONS/STATIONS
DONC
On charge d'abord toutes les stations puis on vient chercher la dernière donnée
*/
// Récupération des données des stations de référence AtmoSud
// Cette fonction charge les données des stations de référence AtmoSud et les affiche sur la carte

import {
    getArrayFromLocalStorage,
    pas_de_temps_local,
    mesures_local,
    getColorCodeForValue,
    map,
    formatPollutantName,
} from '../app.js';

// Variables locales au module
var pas_de_temps_chart = '1h';
var pas_de_temps_atmo = '';
var pas_de_temps_ = '';
var historique_chart = '7d';
var mesures_array = [];

// Fonction principale exportée
export function load_atmoSud_stationsRef() {
    console.log(
        '%cload_atmoSud_stationsRef',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now(); //actual timestamp to measure response time
    // Current date
    const today = new Date();
    window.atmo_ref_layer.clearLayers();
    pas_de_temps_ = getArrayFromLocalStorage(pas_de_temps_local); //attention revoie un objet !!
    switch (pas_de_temps_[0]) {
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
            pas_de_temps_atmo = 'journalière';
            break;
    }
    //on récupère le type de mesure (+ conversion pm25 vers pm2.5, pour api atmosud)
    var mesure = getArrayFromLocalStorage(mesures_local);

    var mesure_atmo = mesure[0];
    switch (mesure[0]) {
        case 'pm25':
            var mesure_atmo = 'pm2.5';
            break;
    }
    //ATTENTION pas de donnée dispo pour les Stations de Référence au pas de temps 2min
    // TODO : desactivé pas de temps 2min pour station de référence
    if (pas_de_temps_[0] === '2min') {
        console.warn('Pas de données pour le pas de temps ' + pas_de_temps_[0]);
        return;
    }

    console.log('Pas de temps : ' + pas_de_temps_);
    console.log('Pas de temps Atmo: ' + pas_de_temps_atmo);
    console.log('Mesure : ' + mesure);

    // Initialisation d'un objet global pour suivre toutes les stations
    if (!window.stationMarkers) window.stationMarkers = {};

    // Construction de l'URL pour la première requête API - récupération des métadonnées des stations
    let full_url_stations = `
        https://api.atmosud.org/observations/stations?
        format=json&
        nom_polluant=${mesure_atmo}&
        download=false&
        metadata=true
    `.replace(/\s+/g, '');

    // Premier appel API pour obtenir les informations des stations
    fetch(full_url_stations)
        .then((response) => {
            // Vérification si la réponse est valide
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            // Traitement de la réponse de l'API
            console.log('Call API get all stations:');
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log('full_url_stations', full_url_stations);
            console.log(data);

            // Parcours des stations et stockage des données
            data.stations.forEach((item) => {
                // Vérification si la station est toujours active
                var date_fin_Station = new Date(item.date_fin_mesure);
                if (today < date_fin_Station || item.date_fin_mesure === null) {
                    // Stockage des données de la station dans l'objet global
                    window.stationMarkers[item.id_station] = {
                        data: item,
                        hasValue: false, // Indicateur pour suivre si la station a des mesures, on initialise à false
                    };
                }
            });

            // Construction de l'URL pour la deuxième requête API - récupération des dernières mesures
            let full_url_derniere = `
              https://api.atmosud.org/observations/stations/mesures/derniere?
              format=json&
              nom_polluant=${mesure_atmo}&
              temporalite=${pas_de_temps_atmo}&
              download=false
            `.replace(/\s+/g, '');

            // Deuxième appel API pour obtenir les dernières mesures disponibles à afficher sur la carte
            return fetch(full_url_derniere).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json().then((data) => {
                    // Retourne les données et l'URL pour utilisation ultérieure
                    return { data, url: full_url_derniere };
                });
            });
        })
        .then((result) => {
            // Traitement des données
            const data = result.data;
            const full_url_derniere = result.url;

            console.log('Call API get dernière mesure stations:');
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log('full url derniere: ' + full_url_derniere);
            console.log(data);

            // Traitement des données de mesure pour chaque station
            data.mesures.forEach((value) => {
                // Récupération des données de la station depuis la variable globale
                const stationData =
                    window.stationMarkers[value.id_station]?.data;
                if (!stationData) return; // On ignore si pas de données station

                //Préparation de la valeur du polluant pour l'affichage
                var valeur_polluant = value['valeur'];

                // Configuration de base de l'icône du marqueur
                var icon_param = {
                    iconUrl:
                        'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                    iconSize: [50, 50],
                    iconAnchor: [5, 50],
                    popupAnchor: [0, -10],
                    tooltipAnchor: [-50, -10],
                    className: value.id_station,
                };

                // Détermination de la couleur du marqueur selon la valeur du polluant
                let colorCode = getColorCodeForValue(
                    valeur_polluant,
                    mesure[0]
                );

                // Mise à jour de l'URL de l'icône si un code couleur spécifique est trouvé
                if (colorCode !== 'default') {
                    icon_param.iconUrl =
                        'img/stationsRefAtmoSud/refStationAtmoSud_' +
                        colorCode +
                        '.png';
                }

                // Création du marqueur principal sur la carte
                let stationMarker = L.marker([value['lat'], value['lon']], {
                    icon: L.icon(icon_param),
                })
                    .on('click', function () {
                        // Gestion du marqueur précédemment sélectionné
                        if (
                            globalSelectedMarker &&
                            globalSelectedMarker !== stationMarker
                        ) {
                            globalSelectedMarker.setZIndexOffset(0);
                            globalSelectedMarker._icon.classList.remove(
                                'marker-selected'
                            );
                        }

                        // Gestion du texte précédemment sélectionné
                        if (
                            globalSelectedText &&
                            globalSelectedText !== textMarker
                        ) {
                            globalSelectedText.setZIndexOffset(0);
                            globalSelectedText._icon.classList.remove(
                                'marker-selected'
                            );
                        }

                        // Mise en évidence du marqueur et du texte sélectionnés
                        stationMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        stationMarker._icon.classList.add('marker-selected');
                        textMarker._icon.classList.add('marker-selected');

                        // Mise à jour des variables globales
                        globalSelectedMarker = stationMarker;
                        globalSelectedText = textMarker;
                        globalSelectedStationId = value.id_station;
                        window.lastSelectedStationData = value;

                        // Ouverture du panneau latéral avec les informations de la station
                        console.log('Click on station: ' + value.id_station);
                        openSidePanel_stationRef(
                            value.id_station,
                            value.nom_station,
                            mesure
                        );
                    })
                    .addTo(window.atmo_ref_layer);

                // Définition de la taille du texte et de sa position en fonction de la valeur du polluant
                var textSize = 32;
                var x_position = -12;
                var y_position = 48;
                if (valeur_polluant >= 10) {
                    textSize = 25;
                    x_position = -5;
                    y_position = 43;
                }
                if (valeur_polluant >= 100) {
                    textSize = 20;
                    x_position = -4;
                    y_position = 26;
                }

                // Création d'une icône personnalisée pour afficher la valeur du polluant
                var text_param = L.divIcon({
                    className: 'my-div-icon',
                    html:
                        '<div id="textDiv" style="font-size: ' +
                        textSize +
                        'px;">' +
                        Math.round(valeur_polluant) +
                        '</div>',
                    iconAnchor: [x_position, y_position],
                    popupAnchor: [30, -60],
                });

                // Création du marqueur de texte sur la carte
                let textMarker = L.marker([value['lat'], value['lon']], {
                    icon: text_param,
                })
                    .on('click', function () {
                        // Gestion du marqueur précédemment sélectionné
                        if (
                            globalSelectedMarker &&
                            globalSelectedMarker !== stationMarker
                        ) {
                            globalSelectedMarker.setZIndexOffset(0);
                            globalSelectedMarker._icon.classList.remove(
                                'marker-selected'
                            );
                        }

                        // Gestion du texte précédemment sélectionné
                        if (
                            globalSelectedText &&
                            globalSelectedText !== textMarker
                        ) {
                            globalSelectedText.setZIndexOffset(0);
                            globalSelectedText._icon.classList.remove(
                                'marker-selected'
                            );
                        }

                        // Mise en évidence du marqueur et du texte sélectionnés
                        stationMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        stationMarker._icon.classList.add('marker-selected');
                        textMarker._icon.classList.add('marker-selected');

                        // Mise à jour des variables globales
                        globalSelectedMarker = stationMarker;
                        globalSelectedText = textMarker;
                        globalSelectedStationId = value.id_station;
                        window.lastSelectedStationData = value;

                        // Ouverture du panneau latéral avec les informations de la station
                        console.log('Click on station: ' + value.id_station);
                        openSidePanel_stationRef(
                            value.id_station,
                            value.nom_station,
                            mesure
                        );
                    })
                    .addTo(window.atmo_ref_layer);

                // Stockage des références des marqueurs pour un usage ultérieur
                window.stationMarkers[value.id_station] = {
                    marker: stationMarker,
                    textMarker: textMarker,
                    data: stationData,
                    hasValue: true,
                };

                // Définition de la fonction qui gère le survol de la souris sur le marqueur
                function hoverMarker() {
                    // Ajustement de la position Z des marqueurs pour les mettre au premier plan
                    stationMarker.setZIndexOffset(1000);
                    textMarker.setZIndexOffset(1000);

                    // Initialisation de la variable pour stocker le HTML des polluants
                    let pollutantsHTML = '';
                    if (stationData.variables) {
                        // Création de l'en-tête de la liste des polluants
                        pollutantsHTML =
                            '<div class="mt-2"><strong>Polluants mesurés:</strong>';
                        pollutantsHTML +=
                            '<ul class="list-unstyled mb-0 ps-2">';

                        // Parcours de tous les polluants de la station
                        Object.entries(stationData.variables || {}).forEach(
                            ([id, pollutantData]) => {
                                // On ignore les polluants sans données
                                if (!pollutantData) {
                                    return;
                                }

                                // Formatage du nom du polluant avec gestion des erreurs
                                let formattedName = '';
                                if (
                                    pollutantData.label &&
                                    typeof pollutantData.label === 'string'
                                ) {
                                    formattedName = formatPollutantName(
                                        pollutantData.label
                                    );
                                } else {
                                    formattedName = `Polluant ${id}`;
                                }

                                // Vérification si le polluant est toujours mesuré
                                let isActive = Boolean(
                                    pollutantData.en_service
                                );
                                let statusHTML = '';

                                // Gestion de l'affichage de la date d'arrêt si le polluant n'est plus mesuré
                                if (!isActive && pollutantData.date_fin) {
                                    try {
                                        const endDate = new Date(
                                            pollutantData.date_fin
                                        );
                                        if (!isNaN(endDate.getTime())) {
                                            const formattedDate =
                                                endDate.toLocaleDateString();
                                            statusHTML = `<span class="badge bg-secondary ms-2">Arrêté le ${formattedDate}</span>`;
                                        } else {
                                            statusHTML = `<span class="badge bg-secondary ms-2">Date d'arrêt inconnue</span>`;
                                        }
                                    } catch (e) {
                                        console.warn(
                                            'Error formatting date:',
                                            e
                                        );
                                        statusHTML = `<span class="badge bg-secondary ms-2">Date d'arrêt inconnue</span>`;
                                    }
                                }

                                // Création de l'indicateur visuel de statut
                                const statusIndicator = isActive
                                    ? '<i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>'
                                    : '<i class="bi bi-circle-fill text-secondary me-1" style="font-size: 0.6rem;"></i>';

                                // Ajout du polluant à la liste HTML
                                pollutantsHTML += `<li>${statusIndicator}${formattedName}${statusHTML}</li>`;
                            }
                        );

                        pollutantsHTML += '</ul></div>';
                    }

                    // Vérification et affichage du statut global de la station
                    let stationStatusHTML = '';
                    if (stationData.en_service === false) {
                        stationStatusHTML =
                            '<div class="alert alert-warning py-1 mt-2 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i>Station hors service</div>';
                    } else {
                        stationStatusHTML =
                            '<div class="badge bg-success mt-2"><i class="bi bi-broadcast-pin me-1"></i>Station active</div>';
                    }

                    // Construction et affichage final de la carte d'information
                    deviceInfo._div.innerHTML = `
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-3">
                                <h5 class="card-title mb-1">${stationData.nom_station}</h5>
                                <p class="card-text text-muted mb-2">Type: Station de référence</p>
                                ${pollutantsHTML}
                                ${stationStatusHTML}
                            </div>
                        </div>
                    `;

                    // Affichage de la carte d'information
                    deviceInfo._div.style.display = 'block';
                }

                function resetMarker() {
                    // Pas de reset si c'est le marker sélectionné
                    if (globalSelectedMarker !== stationMarker) {
                        stationMarker.setZIndexOffset(0);
                        textMarker.setZIndexOffset(0);
                    }
                    deviceInfo._div.style.display = 'none';
                }
                // Ajout des événements de souris aux marqueurs
                stationMarker
                    .on('mouseover', hoverMarker)
                    .on('mouseout', resetMarker);
                textMarker
                    .on('mouseover', hoverMarker)
                    .on('mouseout', resetMarker);
            });

            // Création des marqueurs par défaut pour les stations sans données de mesure
            Object.entries(window.stationMarkers).forEach(
                ([stationId, stationObj]) => {
                    if (!stationObj.hasValue) {
                        const item = stationObj.data;

                        // Configuration des paramètres de l'icône du marqueur
                        var icon_param = {
                            iconUrl:
                                'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                            iconSize: [50, 50],
                            iconAnchor: [5, 40],
                            popupAnchor: [0, -10],
                            tooltipAnchor: [-50, -10],
                            className: item.id_station,
                        };

                        // Création du marqueur sur la carte avec les paramètres définis
                        let stationMarker = L.marker(
                            [item.latitude, item.longitude],
                            {
                                icon: L.icon(icon_param),
                            }
                        )
                            .on('click', function () {
                                // Gestion du clic sur le marqueur
                                // Si un marqueur était déjà sélectionné, on retire sa mise en évidence
                                if (
                                    globalSelectedMarker &&
                                    globalSelectedMarker !== stationMarker
                                ) {
                                    globalSelectedMarker.setZIndexOffset(0);
                                    globalSelectedMarker._icon.classList.remove(
                                        'marker-selected'
                                    );
                                }

                                // Gestion du texte associé au marqueur précédent
                                if (globalSelectedText) {
                                    globalSelectedText.setZIndexOffset(0);
                                    globalSelectedText._icon.classList.remove(
                                        'marker-selected'
                                    );
                                }

                                // Mise en évidence du marqueur sélectionné
                                stationMarker.setZIndexOffset(1000);
                                stationMarker._icon.classList.add(
                                    'marker-selected'
                                );

                                // Mise à jour des variables globales
                                globalSelectedMarker = stationMarker;
                                globalSelectedText = null;
                                globalSelectedStationId = item.id_station;
                                window.lastSelectedStationData = item;

                                // Ouverture du panneau latéral avec les informations de la station
                                console.log(
                                    'Click on station: ' + item.id_station
                                );
                                openSidePanel_stationRef(
                                    item.id_station,
                                    item.nom_station,
                                    mesure
                                );
                            })
                            .addTo(window.atmo_ref_layer);

                        // Stockage de la référence du marqueur
                        window.stationMarkers[stationId].marker = stationMarker;

                        // Définition de la fonction pour l'effet de survol
                        function hoverMarker() {
                            stationMarker.setZIndexOffset(1000);

                            // Création de la liste des polluants
                            let pollutantsHTML = '';
                            if (item.variables) {
                                pollutantsHTML =
                                    '<div class="mt-2"><strong>Polluants mesurés:</strong>';
                                pollutantsHTML +=
                                    '<ul class="list-unstyled mb-0 ps-2">';

                                // Traitement de chaque polluant
                                Object.entries(item.variables || {}).forEach(
                                    ([id, pollutantData]) => {
                                        if (!pollutantData) {
                                            return;
                                        }

                                        // Formatage du nom du polluant
                                        let formattedName = '';
                                        if (
                                            pollutantData.label &&
                                            typeof pollutantData.label ===
                                                'string'
                                        ) {
                                            formattedName = formatPollutantName(
                                                pollutantData.label
                                            );
                                        } else {
                                            formattedName = `Polluant ${id}`;
                                        }

                                        // Vérification du statut actif du polluant
                                        let isActive = Boolean(
                                            pollutantData.en_service
                                        );
                                        let statusHTML = '';

                                        // Gestion de la date d'arrêt si le polluant n'est plus actif
                                        if (
                                            !isActive &&
                                            pollutantData.date_fin
                                        ) {
                                            try {
                                                const endDate = new Date(
                                                    pollutantData.date_fin
                                                );
                                                if (!isNaN(endDate.getTime())) {
                                                    const formattedDate =
                                                        endDate.toLocaleDateString();
                                                    statusHTML = `<span class="badge bg-secondary ms-2">Arrêté le ${formattedDate}</span>`;
                                                } else {
                                                    statusHTML = `<span class="badge bg-secondary ms-2">Date d'arrêt inconnue</span>`;
                                                }
                                            } catch (e) {
                                                console.warn(
                                                    'Error formatting date:',
                                                    e
                                                );
                                                statusHTML = `<span class="badge bg-secondary ms-2">Date d'arrêt inconnue</span>`;
                                            }
                                        }

                                        //Ajout de l'indicateur de statut
                                        const statusIndicator = isActive
                                            ? '<i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>'
                                            : '<i class="bi bi-circle-fill text-secondary me-1" style="font-size: 0.6rem;"></i>';

                                        pollutantsHTML += `<li>${statusIndicator}${formattedName}${statusHTML}</li>`;
                                    }
                                );

                                pollutantsHTML += '</ul></div>';
                            }

                            // Vérification du statut global de la station
                            let stationStatusHTML = '';
                            if (item.en_service === false) {
                                stationStatusHTML =
                                    '<div class="alert alert-warning py-1 mt-2 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i>Station hors service</div>';
                            } else {
                                stationStatusHTML =
                                    '<div class="badge bg-success mt-2"><i class="bi bi-broadcast-pin me-1"></i>Station active</div>';
                            }

                            // Affichage des informations dans une carte
                            deviceInfo._div.innerHTML = `
                            <div class="card border-0 shadow-sm">
                                <div class="card-body p-3">
                                    <h5 class="card-title mb-1" id="device-name">${item.nom_station}</h5>
                                    <p class="card-text text-muted mb-2" id="device-details">Type: Station de référence</p>
                                    ${pollutantsHTML}
                                    ${stationStatusHTML}
                                </div>
                            </div>
                        `;

                            deviceInfo._div.style.display = 'block';
                        }

                        // Fonction pour réinitialiser l'affichae du marqueur
                        function resetMarker() {
                            if (globalSelectedMarker !== stationMarker) {
                                stationMarker.setZIndexOffset(0);
                            }
                            deviceInfo._div.style.display = 'none';
                        }

                        // Ajout des événements de survol sur le marqueur
                        stationMarker
                            .on('mouseover', hoverMarker)
                            .on('mouseout', resetMarker);
                    }
                }
            );

            // Ajout de la couche à la carte
            map.addLayer(window.atmo_ref_layer);
        })
        .catch((error) => {
            // Afficher l'erreur dans la console pour le débogage
            console.error('Error fetching data:', error);

            // Vérifier si l'objet window.stationMarkers existe
            // Vérifier si l'objet contient des données (n'est pas vide)
            if (
                window.stationMarkers &&
                Object.keys(window.stationMarkers).length > 0
            ) {
                // Si nous avons des données, créer des marqueurs par défaut
                // pour afficher au moins quelque chose sur la carte
                createDefaultMarkers();
            }
        });

    // Fonction pour assigner des markers par defaut à des stations sans données
    function createDefaultMarkers() {
        // Parcourir tous les marqueurs de stations stocés dans l'objet window.stationMarkers
        Object.entries(window.stationMarkers).forEach(
            ([stationId, stationObj]) => {
                // Vérifier si la station n'a pas de valeur mais possède des données
                if (!stationObj.hasValue && stationObj.data) {
                    const item = stationObj.data;

                    // Définir les paramètres de l'icône par défaut (grise)
                    var icon_param = {
                        iconUrl:
                            'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                        iconSize: [50, 50],
                        iconAnchor: [5, 40],
                        popupAnchor: [0, -10],
                        tooltipAnchor: [-50, -10],
                        className: item.id_station,
                    };

                    // Créer un nouveau marqueur Leaflet avec les coordonnées de la station
                    let stationMarker = L.marker(
                        [item.latitude, item.longitude],
                        {
                            icon: L.icon(icon_param),
                        }
                    )
                        // Ajouter un gestionnaire d'événement pour le clic sur le marqueur
                        .on('click', function () {
                            // Étape 6: Gérer la sélection du marqueur précédent
                            if (
                                globalSelectedMarker &&
                                globalSelectedMarker !== stationMarker
                            ) {
                                globalSelectedMarker.setZIndexOffset(0);
                                globalSelectedMarker._icon.classList.remove(
                                    'marker-selected'
                                );
                            }

                            // Mettre en évidence le marqueur sélectionné
                            stationMarker.setZIndexOffset(1000);
                            stationMarker._icon.classList.add(
                                'marker-selected'
                            );

                            // Mettre à jour les variables globales
                            globalSelectedMarker = stationMarker;
                            globalSelectedText = null;
                            globalSelectedStationId = item.id_station;
                            window.lastSelectedStationData = item;

                            // Ouvrir le panneau latéral avec les informations de la station
                            openSidePanel_stationRef(
                                item.id_station,
                                item.nom_station,
                                mesure
                            );
                        })
                        .addTo(window.atmo_ref_layer);

                    // Sauvegarder la référence du marqueur dans l'objet global
                    window.stationMarkers[stationId].marker = stationMarker;

                    // Configurer les effets de survol
                    stationMarker
                        .on('mouseover', function () {
                            // Mettre le marqueur au premier plan
                            stationMarker.setZIndexOffset(1000);
                            // Afficher une carte d'information au survol
                            deviceInfo._div.innerHTML = `
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-3">
                                <h5 class="card-title mb-1">${item.nom_station}</h5>
                                <p class="card-text text-muted">Type: Station de référence</p>
                                <div class="badge bg-secondary">Pas de données récentes</div>
                            </div>
                        </div>
                    `;
                            deviceInfo._div.style.display = 'block';
                        })
                        // Gérer la sortie du survol
                        .on('mouseout', function () {
                            if (globalSelectedMarker !== stationMarker) {
                                stationMarker.setZIndexOffset(0);
                            }
                            deviceInfo._div.style.display = 'none';
                        });
                }
            }
        );

        // Ajouter la couche des marqueurs à la carte
        map.addLayer(window.atmo_ref_layer);
    }
}

// Fonction pour mettre en évidence un marqueur
export function hoverMarker() {
    // ... existing code ...
}

// Fonction pour réinitialiser un marqueur
export function resetMarker() {
    // ... existing code ...
}

// Fonction pour créer les marqueurs par défaut
export function createDefaultMarkers() {
    // ... existing code ...
}

// Fonction pour ouvrir le panneau latéral
export function openSidePanel_stationRef(stationID, station_name, mesure) {
    // ... existing code ...
}

// Fonction pour récupérer les données historiques
export function retreive_historiqueData_stationRef(
    stationId,
    pas_de_temps,
    historique,
    mesures_array,
    add_mesure = false,
    custom_start = null,
    custom_end = null
) {
    // ... existing code ...
}

// Exporter les variables qui pourraient être nécessaires ailleurs
export {
    pas_de_temps_chart,
    pas_de_temps_atmo,
    pas_de_temps_,
    historique_chart,
    mesures_array,
};
