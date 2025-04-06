/*
Récupération des données des micro stations
-> API ATMOSUD "OBSERVATIONS/CAPTEURS/DERNIERES"
-> Ou plutot "OBSERVATIONS/CAPTEURS/SITES"

En réponse on a:

valeur          valeur corrigée
valeur_brute    valeur brute
valeur_ref      valeur corrigée si existe sinon valeur brute

*/

// Récupération des données des micro-stations AtmoSud
// Cette fonction charge les données des micro-stations AtmoSud et les affiche sur la carte

import {
    getArrayFromLocalStorage,
    pas_de_temps_local,
    mesures_local,
    getColorCodeForValue,
    map,
    deviceInfo,
    openSidePanel_generic,
    formatString,
    card1_img,
    card1_title,
    card1_text,
    atmo_micro_layer,
    seuils_PM1_PM25,
    seuils_PM10,
} from '../app.js';

// Variables locales au module
var pas_de_temps_chart = '1h';
var historique_chart = '24h';
var mesures_array = [];

// Fonction principale exportée
export function load_atmoSud_microStations() {
    console.log(
        '%cload_atmoSud_microStations',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now();
    atmo_micro_layer.clearLayers();

    //need to switch pas de temps: d->journalier h->horaire qh -> quart horaire
    var pas_de_temps = getArrayFromLocalStorage(pas_de_temps_local); //attention revoie un objet !!
    var pas_de_temps_atmo = '';
    switch (pas_de_temps[0]) {
        case '2min':
            var pas_de_temps_atmo = 'brute';
            break;
        case 'qh':
            var pas_de_temps_atmo = 'quart-horaire';
            break;
        case 'h':
            var pas_de_temps_atmo = 'horaire';
            break;
        case 'd':
            var pas_de_temps_atmo = 'journalier';
            break;
    }
    //on récupère le type de mesure (+ conversion pm25 vers pm2.5)
    var mesures = getArrayFromLocalStorage(mesures_local);
    var mesures_atmo = mesures;
    switch (mesures[0]) {
        case 'pm25':
            var mesures_atmo = ['pm2.5'];
            break;
    }

    //ATTENTION pas de donnée dispo pour les micro-stations au pas de temps 2min ou journalier
    if (pas_de_temps[0] === 'd') {
        alert('Pas de données pour le pas de temps ' + pas_de_temps);
        return;
    }

    console.log('Pas de temps : ' + pas_de_temps);
    console.log('Pas de temps Atmo: ' + pas_de_temps_atmo);
    console.log('Mesures : ' + mesures);

    let full_url_derniere = `
    https://api.atmosud.org/observations/capteurs/mesures/dernieres?
    format=json
    &download=false
    &valeur_brute=true
    &type_capteur=true
    &variable=${mesures_atmo}
    &aggregation=${pas_de_temps_atmo}
    &nb_dec=1
    `.replace(/\s+/g, '');

    $.ajax({
        method: 'GET',
        url: full_url_derniere,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log(full_url_derniere);
            console.log(data);
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );

            // Vérifier si les données sont valides
            if (!data || data.length === 0) {
                console.warn(
                    'Aucune donnée disponible pour les micro-stations AtmoSud'
                );
                // Afficher un message dans l'interface utilisateur
                const infoDiv = document.createElement('div');
                infoDiv.className = 'alert alert-warning';
                infoDiv.innerHTML =
                    'Aucune donnée disponible pour les micro-stations AtmoSud pour le pas de temps sélectionné.';
                infoDiv.style.position = 'absolute';
                infoDiv.style.top = '10px';
                infoDiv.style.left = '50%';
                infoDiv.style.transform = 'translateX(-50%)';
                infoDiv.style.zIndex = '1000';
                document.body.appendChild(infoDiv);

                // Supprimer le message après 5 secondes
                setTimeout(() => {
                    infoDiv.remove();
                }, 5000);
                return;
            }

            let filteredData = data;
            if (pas_de_temps[0] === '2min') {
                // Filtrer uniquement les capteurs de type NebuleAir pour éviter la confusion avec la source nebuleair
                filteredData = data.filter(
                    (item) => item.modele_capteur === 'NebuleAir'
                );
                console.log(filteredData);
                console.warn(
                    'Uniquement micro-stations NebuleAir pour le pas de temps ' +
                        pas_de_temps
                );

                // Si aucun capteur NebuleAir n'est trouvé, afficher un message
                if (filteredData.length === 0) {
                    console.warn(
                        'Aucun capteur NebuleAir trouvé dans les micro-stations AtmoSud'
                    );
                    // Ajouter un message dans l'interface utilisateur
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'alert alert-info';
                    infoDiv.innerHTML =
                        'Aucun capteur NebuleAir disponible pour le pas de temps 2min dans les micro-stations AtmoSud.';
                    infoDiv.style.position = 'absolute';
                    infoDiv.style.top = '10px';
                    infoDiv.style.left = '50%';
                    infoDiv.style.transform = 'translateX(-50%)';
                    infoDiv.style.zIndex = '1000';
                    document.body.appendChild(infoDiv);

                    // Supprimer le message après 5 secondes
                    setTimeout(() => {
                        infoDiv.remove();
                    }, 5000);
                }
            }

            // Stocker les IDs des capteurs disponibles pour vérification ultérieure
            const availableSensorIds = filteredData.map((item) => item.id_site);
            console.log('Capteurs disponibles:', availableSensorIds);

            $.each(filteredData, function (key, value) {
                // Vérifier si les données du capteur sont valides
                if (!value || !value.id_site || !value.lat || !value.lon) {
                    console.warn('Données de capteur invalides:', value);
                    return; // Ignorer ce capteur
                }

                // ICONE
                var icon_param = {
                    iconUrl:
                        'img/microStationsAtmoSud/microStationAtmoSud_default.png',
                    iconSize: [50, 50],
                    iconAnchor: [5, 40],
                    popupAnchor: [0, -10],
                    tooltipAnchor: [-50, -10],
                };

                // Use the helper functions from app.js instead of duplicating the logic
                let valueToCheck = value['valeur_brute'];
                let colorCode = getColorCodeForValue(valueToCheck, mesures[0]);

                // Set the icon URL based on the color code
                if (colorCode !== 'default') {
                    // Convertir le code de couleur pour correspondre au nom du fichier
                    let iconColorCode = colorCode;
                    if (colorCode === 'tres_mauvais') {
                        iconColorCode = 'tresMauvais';
                    } else if (colorCode === 'extr_mauvais') {
                        iconColorCode = 'ExtrMauvais';
                    }

                    icon_param.iconUrl =
                        'img/microStationsAtmoSud/microStationAtmoSud_' +
                        iconColorCode +
                        '.png';
                }

                // Tooltip
                var microStation_icon = L.icon(icon_param);

                // Création du marqueur principal (point de mesure)
                let microStationMarker = L.marker(
                    [value['lat'], value['lon']],
                    {
                        icon: microStation_icon,
                    }
                ).addTo(atmo_micro_layer);

                // Store device data with the marker
                microStationMarker.deviceId = value['id_site'];
                microStationMarker.deviceData = value;

                // Store a reference to this marker in a global object for easy access
                if (!window.deviceMarkers) window.deviceMarkers = {};
                window.deviceMarkers[value['id_site']] = {
                    marker: microStationMarker,
                    data: value,
                };

                // TEXTE
                let roundedvalue = Math.round(
                    parseFloat(value['valeur_brute'])
                );
                var textSize = 32;
                var x_position = -10;
                var y_position = 41;

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

                var text_param = L.divIcon({
                    className: 'my-div-icon',
                    html:
                        '<div id="textDiv" style="font-size: ' +
                        textSize +
                        'px;">' +
                        roundedvalue +
                        '</div>',
                    iconAnchor: [x_position, y_position],
                    popupAnchor: [30, -60],
                });

                let textMarker = L.marker([value['lat'], value['lon']], {
                    icon: text_param,
                })
                    .on('click', function () {
                        // Si un marker est déjà sélectionné, on enlève l'animation
                        if (
                            globalSelectedMarker &&
                            globalSelectedMarker !== microStationMarker
                        ) {
                            globalSelectedMarker.setZIndexOffset(0);
                            globalSelectedMarker._icon.classList.remove(
                                'marker-selected'
                            );
                        }

                        if (
                            globalSelectedText &&
                            globalSelectedText !== textMarker
                        ) {
                            globalSelectedText.setZIndexOffset(0);
                            globalSelectedText._icon.classList.remove(
                                'marker-selected'
                            );
                        }

                        // Appliquer l'animation uniquement au nouveau marker sélectionné
                        microStationMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        microStationMarker._icon.classList.add(
                            'marker-selected'
                        );
                        textMarker._icon.classList.add('marker-selected');

                        // Mettre à jour le marker sélectionné
                        globalSelectedMarker = microStationMarker;
                        globalSelectedText = textMarker;
                        globalSelectedDeviceId = value['id_site']; // Store the selected device ID
                        window.lastSelectedDeviceData = value; // Store the full device data

                        console.log('Click on device: ' + value['id_site']);
                        openSidePanel_microStation(
                            value,
                            pas_de_temps_atmo,
                            '24h',
                            mesures_atmo
                        );
                    })
                    .addTo(atmo_micro_layer);

                // Also store the text marker reference
                textMarker.deviceId = value['id_site'];
                textMarker.deviceData = value;

                if (window.deviceMarkers[value['id_site']]) {
                    window.deviceMarkers[value['id_site']].textMarker =
                        textMarker;
                }

                // Effet hover : mise en avant du point et du texte
                function highlightMarker() {
                    microStationMarker.setZIndexOffset(1000);
                    textMarker.setZIndexOffset(1000);

                    // Show device info
                    deviceInfo._div.querySelector('#device-name').textContent =
                        formatString(value['nom_site']);
                    deviceInfo._div.querySelector(
                        '#device-details'
                    ).textContent = `Type: ${value['modele_capteur']}`;
                    deviceInfo._div.style.display = 'block';
                }

                function resetMarker() {
                    // Don't reset if this is the selected marker
                    if (globalSelectedMarker !== microStationMarker) {
                        microStationMarker.setZIndexOffset(0);
                        textMarker.setZIndexOffset(0);
                    }
                    deviceInfo._div.style.display = 'none';
                }

                microStationMarker
                    .on('mouseover', highlightMarker)
                    .on('mouseout', resetMarker);
                textMarker
                    .on('mouseover', highlightMarker)
                    .on('mouseout', resetMarker);
            });
            //end $each
        }, //end ajax sucess
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);

            // Afficher un message d'erreur dans l'interface utilisateur
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.innerHTML = `
                <h5>Erreur lors de la récupération des données</h5>
                <p>Impossible de récupérer les données des micro-stations AtmoSud.</p>
                <p>Erreur: ${error}</p>
                <p>Veuillez réessayer plus tard ou contacter l'administrateur.</p>
            `;
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '10px';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translateX(-50%)';
            errorDiv.style.zIndex = '1000';
            document.body.appendChild(errorDiv);

            // Supprimer le message après 10 secondes
            setTimeout(() => {
                errorDiv.remove();
            }, 10000);
        },
    }); //end ajax
}

// Fonction pour mettre en évidence un marqueur
export function highlightMarker() {
    // ... existing code ...
}

// Fonction pour réinitialiser un marqueur
export function resetMarker() {
    // ... existing code ...
}

// Fonction pour ouvrir le panneau latéral
export function openSidePanel_microStation(
    data,
    pas_de_temps_atmo,
    historique,
    mesures_atmo
) {
    console.log('openSidePanel_microStation');

    try {
        // Vérifier si les données sont valides
        if (!data || !data.id_site) {
            throw new Error('Données du capteur invalides ou incomplètes');
        }

        // Mettre à jour les variables locales
        historique_chart = historique;
        pas_de_temps_chart = pas_de_temps_atmo;

        // Mettre à jour le contenu du panneau latéral
        card1_img.src =
            'img/microStationsAtmoSud/microStationAtmoSud_default.png';
        card1_title.innerHTML = data.nom_site || 'Capteur inconnu';

        // Vérifier si les données nécessaires sont présentes
        const valeur =
            data.valeur_brute !== undefined
                ? `${data.valeur_brute} µg/m³`
                : 'Non disponible';
        const type = data.modele_capteur || 'Non spécifié';
        const date = data.date_mesure
            ? new Date(data.date_mesure).toLocaleString()
            : 'Non disponible';

        card1_text.innerHTML = `
            <p>Type: ${type}</p>
            <p>Valeur: ${valeur}</p>
            <p>Dernière mise à jour: ${date}</p>
            <div id="loading-indicator" class="text-center mt-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement des données historiques...</p>
            </div>
        `;

        // Ouvrir le panneau latéral
        openSidePanel_generic();

        // Vérifier si le capteur est toujours disponible dans l'API
        // Nous allons d'abord faire une requête pour vérifier si le capteur existe
        let check_url = `
        https://api.atmosud.org/observations/capteurs/mesures/dernieres?
        format=json
        &download=false
        &valeur_brute=true
        &type_capteur=true
        &variable=${mesures_atmo}
        &aggregation=${pas_de_temps_atmo}
        &nb_dec=1
        &id_site=${data.id_site}
        `.replace(/\s+/g, '');

        console.log('Vérification de la disponibilité du capteur:', check_url);

        $.ajax({
            method: 'GET',
            url: check_url,
            timeout: 10000, // Timeout après 10 secondes
            success: function (checkData) {
                console.log('Données de vérification reçues:', checkData);

                // Vérifier si le capteur est toujours disponible
                if (!checkData || checkData.length === 0) {
                    console.warn(
                        `Le capteur ${data.id_site} n'est plus disponible dans l'API`
                    );
                    updateChartWithError(
                        `Le capteur ${data.id_site} n'est plus disponible dans l'API AtmoSud. Il est possible qu'il ait été retiré ou que son ID ait changé.`
                    );
                    return;
                }

                // Le capteur est disponible, récupérer les données historiques
                retreive_historiqueData_microStation(
                    data.id_site,
                    pas_de_temps_atmo,
                    historique,
                    mesures_atmo
                );
            },
            error: function (xhr, status, error) {
                console.error(
                    'Erreur lors de la vérification du capteur:',
                    error
                );

                // En cas d'erreur, on essaie quand même de récupérer les données historiques
                // car il est possible que le capteur existe mais que la requête de vérification ait échoué
                retreive_historiqueData_microStation(
                    data.id_site,
                    pas_de_temps_atmo,
                    historique,
                    mesures_atmo
                );
            },
        });
    } catch (error) {
        console.error("Erreur lors de l'ouverture du panneau latéral:", error);

        // Afficher un message d'erreur dans le panneau latéral
        card1_title.innerHTML = 'Erreur';
        card1_text.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Erreur lors du chargement des données</h4>
                <p>${error.message}</p>
                <hr>
                <p class="mb-0">Veuillez réessayer plus tard ou contacter l'administrateur.</p>
            </div>
        `;

        // Ouvrir le panneau latéral même en cas d'erreur
        openSidePanel_generic();
    }
}

// Fonction pour récupérer les données historiques
export function retreive_historiqueData_microStation(
    sensorId,
    pas_de_temps,
    historique,
    mesures_array,
    add_mesure = false,
    custom_start = null,
    custom_end = null
) {
    console.log('retreive_historiqueData_microStation');

    // Vérifier si les paramètres sont valides
    if (!sensorId) {
        console.error('ID du capteur manquant');
        updateChartWithError('ID du capteur manquant');
        return;
    }

    // Définir les dates de début et de fin
    let startDate, endDate;

    try {
        if (custom_start && custom_end) {
            startDate = custom_start;
            endDate = custom_end;
        } else {
            const now = new Date();
            endDate = now.toISOString();

            // Calculer la date de début en fonction de l'historique
            startDate = new Date(now);
            switch (historique) {
                case '1h':
                    startDate.setHours(now.getHours() - 1);
                    break;
                case '3h':
                    startDate.setHours(now.getHours() - 3);
                    break;
                case '6h':
                    startDate.setHours(now.getHours() - 6);
                    break;
                case '12h':
                    startDate.setHours(now.getHours() - 12);
                    break;
                case '24h':
                    startDate.setHours(now.getHours() - 24);
                    break;
                case '7d':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(now.getDate() - 30);
                    break;
                case '365d':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate.setHours(now.getHours() - 24); // Par défaut, 24h
            }
            startDate = startDate.toISOString();
        }

        // Vérifier d'abord si le capteur est toujours disponible dans l'API
        let check_url = `
        https://api.atmosud.org/observations/capteurs/mesures/dernieres?
        format=json
        &download=false
        &valeur_brute=true
        &type_capteur=true
        &variable=${mesures_array}
        &aggregation=${pas_de_temps}
        &nb_dec=1
        &id_site=${sensorId}
        `.replace(/\s+/g, '');

        console.log('Vérification de la disponibilité du capteur:', check_url);

        // Afficher un indicateur de chargement
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Vérification de la disponibilité du capteur...</p>
            `;
        }

        // Faire la requête AJAX pour vérifier la disponibilité
        $.ajax({
            method: 'GET',
            url: check_url,
            timeout: 10000, // Timeout après 10 secondes
            success: function (checkData) {
                console.log('Données de vérification reçues:', checkData);

                // Vérifier si le capteur est toujours disponible
                if (!checkData || checkData.length === 0) {
                    console.warn(
                        `Le capteur ${sensorId} n'est plus disponible dans l'API`
                    );
                    updateChartWithError(
                        `Le capteur ${sensorId} n'est plus disponible dans l'API AtmoSud. Il est possible qu'il ait été retiré ou que son ID ait changé.`
                    );
                    return;
                }

                // Le capteur est disponible, récupérer les données historiques
                fetchHistoricalData();
            },
            error: function (xhr, status, error) {
                console.error(
                    'Erreur lors de la vérification du capteur:',
                    error
                );

                // En cas d'erreur, on essaie quand même de récupérer les données historiques
                // car il est possible que le capteur existe mais que la requête de vérification ait échoué
                fetchHistoricalData();
            },
        });

        // Fonction pour récupérer les données historiques
        function fetchHistoricalData() {
            // Mettre à jour l'indicateur de chargement
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                    </div>
                    <p class="mt-2">Chargement des données historiques...</p>
                `;
            }

            // Construire l'URL de l'API
            let full_url_historique = `
            https://api.atmosud.org/observations/capteurs/mesures/historique?
            format=json
            &download=false
            &valeur_brute=true
            &type_capteur=true
            &variable=${mesures_array}
            &aggregation=${pas_de_temps}
            &date_debut=${startDate}
            &date_fin=${endDate}
            &id_site=${sensorId}
            `.replace(/\s+/g, '');

            console.log('URL historique:', full_url_historique);

            // Faire la requête AJAX
            $.ajax({
                method: 'GET',
                url: full_url_historique,
                timeout: 30000, // Timeout après 30 secondes
                success: function (data) {
                    console.log('Données historiques reçues:', data);

                    // Vérifier si les données sont valides
                    if (!data || data.length === 0) {
                        console.warn('Aucune donnée historique disponible');
                        updateChartWithError(
                            'Aucune donnée historique disponible pour cette période'
                        );
                        return;
                    }

                    // Traiter les données et mettre à jour le graphique
                    updateChartWithData(data);
                },
                error: function (xhr, status, error) {
                    console.error(
                        'Erreur lors de la récupération des données historiques:',
                        error
                    );
                    console.error('Status:', status);
                    console.error('Réponse:', xhr.responseText);

                    let errorMessage =
                        'Erreur lors de la récupération des données';

                    if (status === 'timeout') {
                        errorMessage =
                            'La requête a pris trop de temps. Veuillez réessayer.';
                    } else if (xhr.status === 404) {
                        errorMessage = `Le capteur avec l'ID ${sensorId} n'est pas trouvé ou n'est plus disponible sur l'API AtmoSud.`;
                        console.warn(
                            `Capteur ${sensorId} non trouvé sur l'API AtmoSud`
                        );

                        // Ajouter un message plus détaillé dans le panneau latéral
                        card1_text.innerHTML += `
                            <div class="alert alert-warning mt-3" role="alert">
                                <h5>Capteur non disponible</h5>
                                <p>Le capteur avec l'ID ${sensorId} n'est pas trouvé ou n'est plus disponible sur l'API AtmoSud.</p>
                                <p>Il est possible que ce capteur ait été retiré ou que son ID ait changé.</p>
                                <p>Veuillez essayer de recharger la page pour obtenir les données les plus récentes.</p>
                            </div>
                        `;
                    } else if (xhr.status === 500) {
                        errorMessage =
                            'Erreur serveur. Veuillez réessayer plus tard.';
                    }

                    updateChartWithError(errorMessage);
                },
            });
        }
    } catch (error) {
        console.error(
            'Erreur lors de la récupération des données historiques:',
            error
        );
        updateChartWithError('Erreur inattendue: ' + error.message);
    }
}

// Fonction pour mettre à jour le graphique avec les données
function updateChartWithData(data) {
    try {
        // Supprimer l'indicateur de chargement
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        // Vérifier si les données sont valides
        if (!data || data.length === 0) {
            updateChartWithError('Aucune donnée disponible pour cette période');
            return;
        }

        // Trier les données par date
        data.sort((a, b) => new Date(a.time) - new Date(b.time));

        // Préparer les données pour le graphique
        const chartData = data.map((item) => {
            return {
                date: new Date(item.time),
                value: parseFloat(item.valeur_brute) || 0,
            };
        });

        // Créer le contenu HTML pour le graphique
        let chartHtml = `
            <div class="mt-3">
                <h5>Données historiques</h5>
                <p>${data.length} points de données disponibles</p>
                <div class="chart-container" style="position: relative; height: 300px; width: 100%;">
                    <canvas id="microStationChart"></canvas>
                </div>
            </div>
        `;

        // Ajouter le contenu HTML au panneau latéral
        card1_text.innerHTML += chartHtml;

        // Créer le graphique avec Chart.js
        const ctx = document
            .getElementById('microStationChart')
            .getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map((item) => item.date.toLocaleTimeString()),
                datasets: [
                    {
                        label: 'Valeur (µg/m³)',
                        data: chartData.map((item) => item.value),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Heure',
                        },
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Valeur (µg/m³)',
                        },
                        beginAtZero: true,
                    },
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `Valeur: ${context.parsed.y} µg/m³`;
                            },
                        },
                    },
                },
            },
        });

        // Ajouter un tableau de données sous le graphique
        let tableHtml = `
            <div class="mt-3">
                <h5>Tableau des données</h5>
                <div class="table-responsive">
                    <table class="table table-striped table-sm">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Heure</th>
                                <th>Valeur (µg/m³)</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Ajouter les lignes du tableau
        data.forEach((item) => {
            const date = new Date(item.time);
            tableHtml += `
                <tr>
                    <td>${date.toLocaleDateString()}</td>
                    <td>${date.toLocaleTimeString()}</td>
                    <td>${parseFloat(item.valeur_brute).toFixed(1)}</td>
                </tr>
            `;
        });

        tableHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Ajouter le tableau au panneau latéral
        card1_text.innerHTML += tableHtml;
    } catch (error) {
        console.error('Erreur lors de la mise à jour du graphique:', error);
        updateChartWithError(
            "Erreur lors de l'affichage des données: " + error.message
        );
    }
}

// Fonction pour afficher une erreur dans le panneau latéral
function updateChartWithError(errorMessage) {
    // Supprimer l'indicateur de chargement
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }

    // Afficher le message d'erreur
    card1_text.innerHTML += `
        <div class="alert alert-warning mt-3" role="alert">
            <h5>Attention</h5>
            <p>${errorMessage}</p>
            <hr>
            <p class="mb-0">Vous pouvez essayer de recharger la page pour obtenir les données les plus récentes.</p>
            <p class="mb-0">Si le problème persiste, il est possible que le capteur ne soit plus disponible dans l'API AtmoSud.</p>
        </div>
    `;
}

// Exporter les variables qui pourraient être nécessaires ailleurs
export { pas_de_temps_chart, historique_chart, mesures_array };
