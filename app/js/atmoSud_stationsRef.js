/*
Récupération des données des stations de Référence
->mesure/dernière: problème ne renvoie pas d'infos si pas de mesure
-> Pour la localisation : OBSERVATIONS/STATIONS
DONC
On charge d'abord toutes les stations puis on vient chercher la dernière donnée
*/
var pas_de_temps_chart = '1h';
var pas_de_temps_atmo = '';
var pas_de_temps_ = '';
var historique_chart = '7d';
var mesures_array = [];

function load_atmoSud_stationsRef() {
    console.log(
        '%cload_atmoSud_stationsRef',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now(); //actual timestamp to measure response time
    // Current date
    const today = new Date();
    atmo_ref_layer.clearLayers();
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
    //on récupère le type de mesure (+ conversion pm25 vers pm2.5)
    var mesure = getArrayFromLocalStorage(mesures_local);

    var mesure_atmo = mesure[0];
    switch (mesure[0]) {
        case 'pm25':
            var mesure_atmo = 'pm2.5';
            break;
    }
    //ATTENTION pas de donnée dispo pour les Stations de Référence au pas de temps 2min
    if (pas_de_temps_[0] === '2min') {
        console.warn('Pas de données pour le pas de temps ' + pas_de_temps_[0]);
        return;
    }

    console.log('Pas de temps : ' + pas_de_temps_);
    console.log('Pas de temps Atmo: ' + pas_de_temps_atmo);
    console.log('Mesure : ' + mesure);

    //1. Première request pour charger les identifiants et la localisation des STATIONS
    // on ne veut que les stations qui mesurent le polluant choisis
    // on ne veut que les stations actives (where date_fin_mesure est supérieur à la date d'aujourd'hui)
    let full_url_stations = `
        https://api.atmosud.org/observations/stations?
        format=json&
        nom_polluant=${mesure_atmo}&
        download=false
    `.replace(/\s+/g, '');

    $.ajax({
        method: 'GET',
        url: full_url_stations,
        success: function (data) {
            console.log('API stations:');
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log('full_url_stations', full_url_stations);
            console.log(data);

            // Create a global object to store all station markers
            if (!window.stationMarkers) window.stationMarkers = {};

            $.each(data.stations, function (key, item) {
                var date_fin_Station = new Date(item.date_fin_mesure);
                if (today < date_fin_Station || item.date_fin_mesure === null) {
                    //icone gris (par défault lorsque pas de donnée)
                    var icon_param = {
                        iconUrl:
                            'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                        iconSize: [50, 50], // size of the icon
                        iconAnchor: [5, 40], // point of the icon which will correspond to marker's location
                        popupAnchor: [0, -10],
                        tooltipAnchor: [-50, -10],
                        className: item.id_station,
                    };
                    var refStationsAtmoSud_icon = L.icon(icon_param);

                    // Create the main marker
                    let stationMarker = L.marker(
                        [item['latitude'], item['longitude']],
                        {
                            icon: refStationsAtmoSud_icon,
                        }
                    )
                        .on('click', function () {
                            // If a marker is already selected, remove the animation
                            if (
                                globalSelectedMarker &&
                                globalSelectedMarker !== stationMarker
                            ) {
                                globalSelectedMarker.setZIndexOffset(0);
                                globalSelectedMarker._icon.classList.remove(
                                    'marker-selected'
                                );
                            }

                            if (
                                globalSelectedText &&
                                window.stationMarkers[item.id_station]
                                    .textMarker
                            ) {
                                globalSelectedText.setZIndexOffset(0);
                                globalSelectedText._icon.classList.remove(
                                    'marker-selected'
                                );
                            }

                            // Apply animation only to the newly selected marker
                            stationMarker.setZIndexOffset(1000);
                            if (
                                window.stationMarkers[item.id_station]
                                    .textMarker
                            ) {
                                window.stationMarkers[
                                    item.id_station
                                ].textMarker.setZIndexOffset(1000);
                                window.stationMarkers[
                                    item.id_station
                                ].textMarker._icon.classList.add(
                                    'marker-selected'
                                );
                            }
                            stationMarker._icon.classList.add(
                                'marker-selected'
                            );

                            // Update the selected marker
                            globalSelectedMarker = stationMarker;
                            globalSelectedText =
                                window.stationMarkers[item.id_station]
                                    .textMarker;
                            globalSelectedStationId = item.id_station;
                            window.lastSelectedStationData = item;

                            console.log('Click on station: ' + item.id_station);
                            openSidePanel_stationRef(
                                item.id_station,
                                item.nom_station,
                                mesure
                            );
                        })
                        .addTo(atmo_ref_layer);

                    // Store station data with the marker
                    stationMarker.stationId = item.id_station;
                    stationMarker.stationData = item;

                    // Store a reference to this marker in the global object
                    window.stationMarkers[item.id_station] = {
                        marker: stationMarker,
                        data: item,
                    };

                    // Effect hover: highlight the point and text
                    function highlightMarker() {
                        stationMarker.setZIndexOffset(1000);
                        if (window.stationMarkers[item.id_station].textMarker) {
                            window.stationMarkers[
                                item.id_station
                            ].textMarker.setZIndexOffset(1000);
                        }

                        // Create a formatted list of pollutants
                        let pollutantsHTML = '';
                        if (item.variables) {
                            pollutantsHTML =
                                '<div class="mt-2"><strong>Polluants mesurés:</strong>';
                            pollutantsHTML +=
                                '<ul class="list-unstyled mb-0 ps-2">';

                            // Process each pollutant
                            Object.entries(item.variables).forEach(
                                ([id, name]) => {
                                    // Format pollutant name with subscripts
                                    let formattedName =
                                        formatPollutantName(name);

                                    // Check if this pollutant is still being measured
                                    let isActive = true;
                                    let statusHTML = '';

                                    if (
                                        item.date_fin_mesure &&
                                        item.date_fin_mesure[id]
                                    ) {
                                        const endDate = new Date(
                                            item.date_fin_mesure[id]
                                        );
                                        const today = new Date();

                                        if (endDate < today) {
                                            isActive = false;
                                            const formattedDate =
                                                endDate.toLocaleDateString();
                                            statusHTML = `<span class="badge bg-secondary ms-2">Arrêté le ${formattedDate}</span>`;
                                        }
                                    }

                                    // Add status indicator
                                    const statusIndicator = isActive
                                        ? '<i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>'
                                        : '<i class="bi bi-circle-fill text-secondary me-1" style="font-size: 0.6rem;"></i>';

                                    pollutantsHTML += `<li>${statusIndicator}${formattedName}${statusHTML}</li>`;
                                }
                            );

                            pollutantsHTML += '</ul></div>';
                        }

                        // Check overall station status
                        let stationStatusHTML = '';
                        if (item.en_service === false) {
                            stationStatusHTML =
                                '<div class="alert alert-warning py-1 mt-2 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i>Station hors service</div>';
                        } else {
                            stationStatusHTML =
                                '<div class="badge bg-success mt-2"><i class="bi bi-broadcast-pin me-1"></i>Station active</div>';
                        }

                        // Show device info with enhanced details
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

                    // Helper function to format pollutant names with proper subscripts
                    function formatPollutantName(name) {
                        // Replace common pollutant notations with properly formatted versions
                        return name
                            .replace(/NO2/g, 'NO<sub>2</sub>')
                            .replace(/SO2/g, 'SO<sub>2</sub>')
                            .replace(/O3/g, 'O<sub>3</sub>')
                            .replace(/PM2.5/g, 'PM<sub>2.5</sub>')
                            .replace(/PM2,5/g, 'PM<sub>2,5</sub>')
                            .replace(/CO2/g, 'CO<sub>2</sub>')
                            .replace(/H2S/g, 'H<sub>2</sub>S')
                            .replace(/NH3/g, 'NH<sub>3</sub>');
                    }

                    function resetMarker() {
                        // Don't reset if this is the selected marker
                        if (globalSelectedMarker !== stationMarker) {
                            stationMarker.setZIndexOffset(0);
                            if (
                                window.stationMarkers[item.id_station]
                                    .textMarker
                            ) {
                                window.stationMarkers[
                                    item.id_station
                                ].textMarker.setZIndexOffset(0);
                            }
                        }
                        deviceInfo._div.style.display = 'none';
                    }

                    stationMarker
                        .on('mouseover', highlightMarker)
                        .on('mouseout', resetMarker);
                }
            }); //end each

            //ajouter la layer sur la carte
            map.addLayer(atmo_ref_layer);
        }, //end ajax sucess
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    }); //end ajax

    /*
     *************************************************************************
     ************************************************************************
     */

    //2. Deuxime Call pour afficher la dernière mesure dispo pour chaque station (mesure/dernière)
    // en fonction de la mesure sélectionnée et du pas de temps
    // on adapte les icones en fonctions (couleurs) et on affiche la mesure sur l'icone
    let full_url_derniere = `
      https://api.atmosud.org/observations/stations/mesures/derniere?
      format=json&
      nom_polluant=${mesure_atmo}&
      temporalite=${pas_de_temps_atmo}&
      download=false
        `.replace(/\s+/g, '');

    $.ajax({
        method: 'GET',
        url: full_url_derniere,
        success: function (data) {
            console.log('API dernière:');
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log('full url derniere: ' + full_url_derniere);
            console.log(data);

            $.each(data.mesures, function (key, value) {
                // Remove any existing markers for this station to avoid duplicates
                atmo_ref_layer.eachLayer(function (layer) {
                    if (
                        layer._icon &&
                        layer._icon.className.includes(value.id_station) &&
                        value.valeur != null
                    ) {
                        console.log('Removed doublons');
                        atmo_ref_layer.removeLayer(layer);
                    }
                });

                //on récupère la valeur mesurée
                var valeur_polluant = Math.round(value['valeur']);
                var icon_param = {
                    iconUrl:
                        'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                    iconSize: [50, 50], // size of the icon
                    iconAnchor: [5, 50], // point of the icon which will correspond to marker's location
                    popupAnchor: [0, -10],
                    tooltipAnchor: [-50, -10],
                    className: value.id_station,
                };

                //pour les pm1 et les PM25 on change l'icone (la couleurs)
                if (mesure == 'pm1' || mesure == 'pm25') {
                    for (let key in seuils_PM1_PM25) {
                        let code = seuils_PM1_PM25[key].code;
                        let min = seuils_PM1_PM25[key].min;
                        let max = seuils_PM1_PM25[key].max;
                        //si la valeur est entre le max et le min
                        if (
                            (value['valeur'] >= min) &
                            (value['valeur'] <= max)
                        ) {
                            icon_param.iconUrl =
                                'img/stationsRefAtmoSud/refStationAtmoSud_' +
                                code +
                                '.png';
                        }
                    }
                }
                //pour les pm10
                if (mesure == 'pm10') {
                    for (let key in seuils_PM10) {
                        let code = seuils_PM10[key].code;
                        let min = seuils_PM10[key].min;
                        let max = seuils_PM10[key].max;
                        //si la valeur est entre le max et le min
                        if (
                            (value['valeur'] >= min) &
                            (value['valeur'] <= max)
                        ) {
                            icon_param.iconUrl =
                                'img/stationsRefAtmoSud/refStationAtmoSud_' +
                                code +
                                '.png';
                        }
                    }
                }

                //création des icones
                var refStationsAtmoSud_icon = L.icon(icon_param);

                // Create the main marker
                let stationMarker = L.marker([value['lat'], value['lon']], {
                    icon: refStationsAtmoSud_icon,
                })
                    .on('click', function () {
                        // If a marker is already selected, remove the animation
                        if (
                            globalSelectedMarker &&
                            globalSelectedMarker !== stationMarker
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

                        // Apply animation only to the newly selected marker
                        stationMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        stationMarker._icon.classList.add('marker-selected');
                        textMarker._icon.classList.add('marker-selected');

                        // Update the selected marker
                        globalSelectedMarker = stationMarker;
                        globalSelectedText = textMarker;
                        globalSelectedStationId = value.id_station;
                        window.lastSelectedStationData = value;

                        console.log('Click on station: ' + value.id_station);
                        openSidePanel_stationRef(
                            value.id_station,
                            value.nom_station,
                            mesure
                        );
                    })
                    .addTo(atmo_ref_layer);

                // Store station data with the marker
                stationMarker.stationId = value.id_station;
                stationMarker.stationData = value;

                // Store a reference to this marker in the global object
                if (!window.stationMarkers) window.stationMarkers = {};
                window.stationMarkers[value.id_station] = {
                    marker: stationMarker,
                    data: value,
                };

                // TEXTE pour affichage de la mesure
                //textSize (if number under 10)
                var textSize = 32;
                var x_position = -12;
                var y_position = 48;
                //smaller text size if number is greater than 9
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

                var text_param = L.divIcon({
                    className: 'my-div-icon',
                    html:
                        '<div id="textDiv" style="font-size: ' +
                        textSize +
                        'px;">' +
                        valeur_polluant +
                        '</div>',
                    iconAnchor: [x_position, y_position],
                    popupAnchor: [30, -60], // point from which the popup should open relative to the iconAnchor
                });

                let textMarker = L.marker([value['lat'], value['lon']], {
                    icon: text_param,
                })
                    .on('click', function () {
                        // If a marker is already selected, remove the animation
                        if (
                            globalSelectedMarker &&
                            globalSelectedMarker !== stationMarker
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

                        // Apply animation only to the newly selected marker
                        stationMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        stationMarker._icon.classList.add('marker-selected');
                        textMarker._icon.classList.add('marker-selected');

                        // Update the selected marker
                        globalSelectedMarker = stationMarker;
                        globalSelectedText = textMarker;
                        globalSelectedStationId = value.id_station;
                        window.lastSelectedStationData = value;

                        console.log('Click on station: ' + value.id_station);
                        openSidePanel_stationRef(
                            value.id_station,
                            value.nom_station,
                            mesure
                        );
                    })
                    .addTo(atmo_ref_layer);

                // Also store the text marker reference
                textMarker.stationId = value.id_station;
                textMarker.stationData = value;

                if (window.stationMarkers[value.id_station]) {
                    window.stationMarkers[value.id_station].textMarker =
                        textMarker;
                }

                // Effect hover: highlight the point and text
                function highlightMarker() {
                    stationMarker.setZIndexOffset(1000);
                    textMarker.setZIndexOffset(1000);

                    // Get the full station data if available
                    let stationData = null;
                    if (
                        window.stationMarkers &&
                        window.stationMarkers[value.id_station] &&
                        window.stationMarkers[value.id_station].data
                    ) {
                        stationData =
                            window.stationMarkers[value.id_station].data;
                    }

                    // Create a formatted list of pollutants if we have the full station data
                    let pollutantsHTML = '';
                    if (stationData && stationData.variables) {
                        pollutantsHTML =
                            '<div class="mt-2"><strong>Polluants mesurés:</strong>';
                        pollutantsHTML +=
                            '<ul class="list-unstyled mb-0 ps-2">';

                        // Process each pollutant
                        Object.entries(stationData.variables).forEach(
                            ([id, name]) => {
                                // Format pollutant name with subscripts
                                let formattedName = formatPollutantName(name);

                                // Check if this pollutant is still being measured
                                let isActive = true;
                                let statusHTML = '';

                                if (
                                    stationData.date_fin_mesure &&
                                    stationData.date_fin_mesure[id]
                                ) {
                                    const endDate = new Date(
                                        stationData.date_fin_mesure[id]
                                    );
                                    const today = new Date();

                                    if (endDate < today) {
                                        isActive = false;
                                        const formattedDate =
                                            endDate.toLocaleDateString();
                                        statusHTML = `<span class="badge bg-secondary ms-2">Arrêté le ${formattedDate}</span>`;
                                    }
                                }

                                // Add status indicator
                                const statusIndicator = isActive
                                    ? '<i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>'
                                    : '<i class="bi bi-circle-fill text-secondary me-1" style="font-size: 0.6rem;"></i>';

                                pollutantsHTML += `<li>${statusIndicator}${formattedName}${statusHTML}</li>`;
                            }
                        );

                        pollutantsHTML += '</ul></div>';
                    } else {
                        // If we don't have the full data, just show the current pollutant
                        const currentPollutant = formatPollutantName(
                            value.label_polluant || ''
                        );
                        pollutantsHTML = `
                            <div class="mt-2">
                                <strong>Mesure actuelle:</strong>
                                <div class="ps-2">
                                    <i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>
                                    ${currentPollutant}: <strong>${Math.round(value.valeur)} µg/m³</strong>
                                </div>
                            </div>
                        `;
                    }

                    // Check overall station status
                    let stationStatusHTML = '';
                    if (stationData && stationData.en_service === false) {
                        stationStatusHTML =
                            '<div class="alert alert-warning py-1 mt-2 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i>Station hors service</div>';
                    } else {
                        stationStatusHTML =
                            '<div class="badge bg-success mt-2"><i class="bi bi-broadcast-pin me-1"></i>Station active</div>';
                    }

                    // Show device info with enhanced details
                    deviceInfo._div.innerHTML = `
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-3">
                                <h5 class="card-title mb-1" id="device-name">${value.nom_station}</h5>
                                <p class="card-text text-muted mb-2" id="device-details">Type: Station de référence</p>
                                ${pollutantsHTML}
                                ${stationStatusHTML}
                            </div>
                        </div>
                    `;

                    deviceInfo._div.style.display = 'block';
                }

                function resetMarker() {
                    // Don't reset if this is the selected marker
                    if (globalSelectedMarker !== stationMarker) {
                        stationMarker.setZIndexOffset(0);
                        textMarker.setZIndexOffset(0);
                    }
                    deviceInfo._div.style.display = 'none';
                }

                stationMarker
                    .on('mouseover', highlightMarker)
                    .on('mouseout', resetMarker);
                textMarker
                    .on('mouseover', highlightMarker)
                    .on('mouseout', resetMarker);
            }); //end each

            //ajouter la layer sur la carte
            map.addLayer(atmo_ref_layer);
        }, //end ajax sucess
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    }); //end ajax
} //end function load_atmoSud_stationsRef()

/*
Ouverture du Side panel
    stationID -> FR1232
    stationName -> AIX LES MILLES
    pas_de_temps -> horaire, journalier, quart-horaire
    historique -> 24h
    mesures_array -> PM10, PM25
    mesures -> polluant à ajouter à mesure array
*/

// function openSidePanel_stationRef(stationID, station_name, mesure) {
//     console.log('➡️ openSidePanel_stationRef');
//     console.log('Station ID: ' + stationID);
//     console.log('Mesure: ' + mesure);

//     //il faut passer à la fonction un array pour mesures
//     // Clear the array by setting its length to 0
//     mesures_array.length = 0;
//     mesures_array.push(mesure);

//     //on lance la fonction pour récupérer les datas de mesures
//     //mesures_array est vide
//     retreive_historiqueData_stationRef(
//         stationID,
//         pas_de_temps_atmo,
//         '24h',
//         mesures_array,
//         mesure,
//         false
//     );

//     //card 1
//     card1_img.src =
//         'https://www.atmosud.org/sites/sud/files/styles/slider/public/medias/images/2022-04/station_longchamp_1.jpg?itok=y8Oi_LxY';
//     card1_title.innerHTML = station_name;
//     card1_subtitle.innerHTML = 'Station de référence AtmoSud';

//     //card 2
//     card2_text.innerHTML =
//         'Le dispositif de mesure d’AtmoSud est assuré par un réseau de plus de 110 stations permanentes et de stations provisoires, en fonction des besoins des territoires. Chaque station est équipée d’un ou plusieurs appareils de mesure, en fonction des problématiques locales de pollution. Chaque appareil (appelé analyseur) est spécifique à un polluant et il en mesure sa concentration 7 jours/7 et 24 heures/24. Les stations fixes sont implantées afin de mesurer la qualité de l’air dans différents contextes (trafic, urbain, industriel…) sur des territoires à enjeux pour les populations.';
//     card2_link.innerHTML = 'AtmoSud.org'; //empty content from previous opening
//     card2_link.href = 'https://atmosud.org';

//     //on ajoute la fonction onclick sur chaque bouton
//     //1.historique
//     btn_historique_1h.onclick = function () {
//         historique_chart = '1h';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_3h.onclick = function () {
//         historique_chart = '3h';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_24h.onclick = function () {
//         historique_chart = '24h';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_1sem.onclick = function () {
//         historique_chart = '7d';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_1m.onclick = function () {
//         historique_chart = '30d';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_1a.onclick = function () {
//         historique_chart = '365d';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };

//     //2.pas de temps
//     btn_pas_de_temps_2min.onclick = function () {
//         pas_de_temps_chart = '2m';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_pas_de_temps_qh.onclick = function () {
//         pas_de_temps_chart = '15m';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_pas_de_temps_h.onclick = function () {
//         pas_de_temps_chart = '1h';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_pas_de_temps_d.onclick = function () {
//         pas_de_temps_chart = '1d';
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };

//     //3. Mesures (ATTENTION: ici on peut choisir plusieurs polluants -> add_mesure = true)
//     btn_poluant_pm1.onclick = function () {
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array,
//             'pm1',
//             true
//         );
//     };
//     btn_poluant_pm25.onclick = function () {
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array,
//             'pm25',
//             true
//         );
//     };
//     btn_poluant_pm10.onclick = function () {
//         retreive_historiqueData_stationRef(
//             stationID,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array,
//             'pm10',
//             true
//         );
//     };

//     openSidePanel_generic();
// } //end function openSidePanel_stationRef

function openSidePanel_stationRef(stationID, station_name, mesure) {
    console.log('➡️ openSidePanel_stationRef');
    console.log('Station ID: ' + stationID);
    console.log('Mesure: ' + mesure);

    // Gestion icone fermeture sidepanel
    var closeButton = document
        .getElementById('toggleSidePanel')
        .querySelector('i');
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');

    pas_de_temps_chart = pas_de_temps_atmo;
    mesures_array.length = 0;

    // Convert mesure to array if it's not already
    if (Array.isArray(mesure)) {
        mesure.forEach((m) => mesures_array.push(m));
    } else {
        // If it's a single value, push it directly
        mesures_array.push(mesure);
    }

    // Réinitialiser les boutons
    var historique_buttons = document.querySelectorAll(
        '[id^="btn_historique_"]'
    );
    var pas_de_temps_buttons = document.querySelectorAll(
        '[id^="btn_pas_de_temps_"]'
    );
    var polluants_buttons = document.querySelectorAll('[id^="btn_poluant_"]');

    historique_buttons.forEach((btn) => (btn.checked = false));
    pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
    polluants_buttons.forEach((btn) => (btn.checked = false));

    if (btn_poluant_no2.disabled) {
        btn_poluant_no2.disabled = false;
    }

    // Mettre à jour les boutons des filtres
    btn_historique = document.getElementById(
        'btn_historique_' + historique_chart
    );
    btn_historique.checked = true;

    // Déterminer le bon bouton de pas de temps
    var pas_temps_code;
    if (pas_de_temps_atmo == 'quart-horaire') pas_temps_code = 'qh';
    else if (pas_de_temps_atmo == 'horaire') pas_temps_code = 'h';
    else if (pas_de_temps_atmo == 'journalière') pas_temps_code = 'd';
    else if (pas_de_temps_atmo == 'brute') pas_temps_code = '2min';

    btn_pas_de_temps = document.getElementById(
        'btn_pas_de_temps_' + pas_temps_code
    );
    if (btn_pas_de_temps) btn_pas_de_temps.checked = true;

    // Déterminer le bon bouton de mesure
    var mesure_code;
    if (mesure == 'pm1') mesure_code = 'pm1';
    else if (mesure == 'pm25' || mesure == 'pm2.5') mesure_code = 'pm25';
    else if (mesure == 'pm10') mesure_code = 'pm10';
    else if (mesure == 'no2') mesure_code = 'no2';

    btn_mesure = document.getElementById('btn_poluant_' + mesure_code);
    if (btn_mesure) btn_mesure.checked = true;

    // On lance la fonction pour récupérer les données historiques
    retreive_historiqueData_stationRef(
        stationID,
        pas_de_temps_chart,
        historique_chart,
        mesures_array
    );

    // Card 1
    card1_img.src = 'img/stationsRefAtmoSud/refStationAtmoSud_default.png';
    card1_title.innerHTML = station_name;
    card1_subtitle.innerHTML = 'Station de référence AtmoSud';
    card1_text.innerHTML = '';

    // Card 2
    card2_text.innerHTML =
        "Le dispositif de mesure d'AtmoSud est assuré par un réseau de plus de 110 stations permanentes et de stations provisoires, en fonction des besoins des territoires. Chaque station est équipée d'un ou plusieurs appareils de mesure, en fonction des problématiques locales de pollution.";
    card2_link.innerHTML = 'AtmoSud.org';
    card2_link.href = 'https://www.atmosud.org';

    // Historique Button handlers setup

    let using_custom_date_range = false;
    let custom_start_date = null;
    let custom_end_date = null;

    btn_historique_custom.onclick = function (event) {
        event.preventDefault();
        var startDate = btn_historique_start_date.value;
        var endDate = btn_historique_end_date.value;

        console.log('Selected dates:', startDate, endDate);

        if (startDate && endDate) {
            historique_buttons.forEach((btn) => (btn.checked = false));
            btn_historique_custom.checked = true;

            // On garde les dates dans des variables
            using_custom_date_range = true;
            custom_start_date = startDate;
            custom_end_date = endDate;

            // Format dates for API (YYYY-MM-DD)
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                startDate,
                endDate
            );
        } else {
            alert('Veuillez sélectionner une date de début et de fin.');
        }
    };

    btn_historique_1h.onclick = function () {
        historique_chart = '1h';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_1h.checked = true;
        retreive_historiqueData_stationRef(
            stationID,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    btn_historique_3h.onclick = function () {
        historique_chart = '3h';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_3h.checked = true;
        retreive_historiqueData_stationRef(
            stationID,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    btn_historique_24h.onclick = function () {
        historique_chart = '24h';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_24h.checked = true;
        retreive_historiqueData_stationRef(
            stationID,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    btn_historique_1sem.onclick = function () {
        historique_chart = '7d';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_1sem.checked = true;
        retreive_historiqueData_stationRef(
            stationID,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    btn_historique_1m.onclick = function () {
        historique_chart = '30d';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_1m.checked = true;
        retreive_historiqueData_stationRef(
            stationID,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    btn_historique_1a.onclick = function () {
        historique_chart = '365d';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_1a.checked = true;
        // Si Historique 1 an, on désactive les boutons pas de temps 15m et 1h et on set pas de temps à journalier
        btn_pas_de_temps_h.disabled = true;
        btn_pas_de_temps_qh.disabled = true;

        pas_de_temps_chart = 'journalière';

        retreive_historiqueData_stationRef(
            stationID,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    btn_pas_de_temps_2min.disabled = true;

    btn_pas_de_temps_qh.onclick = function () {
        pas_de_temps_chart = 'quart-horaire';
        pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
        btn_pas_de_temps_qh.checked = true;
        if (using_custom_date_range) {
            retreive_historiqueData_stationRef(
                globalSelectedStationId,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                custom_start_date,
                custom_end_date
            );
        } else {
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    btn_pas_de_temps_h.onclick = function () {
        pas_de_temps_chart = 'horaire';
        pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
        btn_pas_de_temps_h.checked = true;
        if (using_custom_date_range) {
            retreive_historiqueData_stationRef(
                globalSelectedStationId,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                custom_start_date,
                custom_end_date
            );
        } else {
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    btn_pas_de_temps_d.onclick = function () {
        pas_de_temps_chart = 'journalière';
        pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
        btn_pas_de_temps_d.checked = true;
        if (using_custom_date_range) {
            retreive_historiqueData_stationRef(
                globalSelectedStationId,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                custom_start_date,
                custom_end_date
            );
        } else {
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    // Polluants Button handlers setup
    btn_poluant_pm1.onclick = function () {
        if (mesures_array.includes('pm1')) {
            // Remove pm1 from array
            mesures_array = mesures_array.filter((item) => item !== 'pm1');
            btn_poluant_pm1.checked = false;
        } else {
            // Add pm1 to array
            mesures_array.push('pm1');
            btn_poluant_pm1.checked = true;
        }

        // Check if custom historical date or not before retrieving data
        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var endDate = btn_historique_end_date.value;
            var startTime = '00:00';
            var endTime = '23:59';
            let startDateTime = new Date(
                `${startDate}T${startTime}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                startDateTime,
                endDateTime
            );
        } else {
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    btn_poluant_pm25.onclick = function () {
        if (mesures_array.includes('pm25')) {
            mesures_array = mesures_array.filter((item) => item !== 'pm25');
            btn_poluant_pm25.checked = false;
        } else {
            mesures_array.push('pm25');
            btn_poluant_pm25.checked = true;
        }

        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var endDate = btn_historique_end_date.value;
            var startTime = '00:00';
            var endTime = '23:59';
            let startDateTime = new Date(
                `${startDate}T${startTime}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                startDateTime,
                endDateTime
            );
        } else {
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    btn_poluant_pm10.onclick = function () {
        if (mesures_array.includes('pm10')) {
            mesures_array = mesures_array.filter((item) => item !== 'pm10');
            btn_poluant_pm10.checked = false;
        } else {
            mesures_array.push('pm10');
            btn_poluant_pm10.checked = true;
        }

        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var endDate = btn_historique_end_date.value;
            var startTime = '00:00';
            var endTime = '23:59';
            let startDateTime = new Date(
                `${startDate}T${startTime}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                startDateTime,
                endDateTime
            );
        } else {
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    btn_poluant_no2.onclick = function () {
        if (mesures_array.includes('no2')) {
            mesures_array = mesures_array.filter((item) => item !== 'no2');
            btn_poluant_no2.checked = false;
        } else {
            mesures_array.push('no2');
            btn_poluant_no2.checked = true;
        }

        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var endDate = btn_historique_end_date.value;
            var startTime = '00:00';
            var endTime = '23:59';
            let startDateTime = new Date(
                `${startDate}T${startTime}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                startDateTime,
                endDateTime
            );
        } else {
            retreive_historiqueData_stationRef(
                stationID,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    openSidePanel_generic();
}

/*
  RECUPERATION DES DONNEE HISTORIQUE D'UNE STATION
*/

function retreive_historiqueData_stationRef(
    stationId,
    pas_de_temps,
    historique,
    mesures_array,
    add_mesure = false,
    custom_start = null,
    custom_end = null
) {
    console.log('retreiving data for:', {
        stationId: stationId,
        pas_de_temps: pas_de_temps,
        historique: historique,
        mesures_array: mesures_array,
        add_mesure: add_mesure,
        custom_start: custom_start,
        custom_end: custom_end,
    });

    const start = Date.now();

    // Clear the chart div and add a Bootstrap spinner
    const chartDiv = document.getElementById('chartdiv_sensor');
    chartDiv.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="height: 300px;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span class="ms-2">Chargement des données...</span>
        </div>`;

    // Determine start and end dates
    let start_date, end_date;

    if (custom_start && custom_end) {
        // Use custom dates directly if provided
        start_date = custom_start.split('T')[0]; // Extract just the date part if it's an ISO string
        end_date = custom_end.split('T')[0];

        console.log('Using custom date range:', start_date, 'to', end_date);
    } else {
        // Calculate dates based on historique parameter
        let hours;
        switch (historique) {
            case '1h':
                hours = 1;
                break;
            case '3h':
                hours = 3;
                break;
            case '24h':
                hours = 24;
                break;
            case '7d':
                hours = 24 * 7;
                break;
            case '30d':
                hours = 24 * 30;
                break;
            case '365d':
                hours = 24 * 365;
                break;
            default:
                hours = 24;
        }

        // Calculate end date (today)
        let endDate = new Date();
        end_date = endDate.toISOString().split('T')[0];

        // Calculate start date based on historique
        let startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);
        start_date = startDate.toISOString().split('T')[0];

        console.log('Calculated date range:', start_date, 'to', end_date);
    }

    // Convert mesures_array to proper format for API
    // ATTENTION! Pour l'API d'AtmoSud il faut écrire pm2.5 et non pm25
    let mesures_string_comma = mesures_array
        .map((value) => (value === 'pm25' ? 'pm2.5' : value))
        .join(',');

    let full_url = `https://api.atmosud.org/observations/stations/mesures?
        format=json&
        station_id=${stationId}&
        nom_polluant=${mesures_string_comma}&
        temporalite=${pas_de_temps}&
        date_debut=${start_date}&
        date_fin=${end_date}&
        download=false`.replace(/\s+/g, '');

    console.log('API URL:', full_url);

    $.ajax({
        method: 'GET',
        url: full_url,
        success: function (data) {
            const requestTimer = (Date.now() - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log(data);

            // Remove the spinner by clearing the chart div
            chartDiv.innerHTML = '';

            if (amchart_root != undefined) {
                amchart_root.dispose();
            }

            // No data case
            if (!data.mesures || data.mesures.length === 0) {
                chartDiv.innerHTML = `
                    <div class="alert alert-warning mt-3">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <strong>Aucune donnée!</strong> Pas de données disponibles pour cette période.
                    </div>`;
                return;
            }

            var baseInterval_timeUnit_local;
            var baseInterval_count;

            if (pas_de_temps == 'brute') {
                baseInterval_timeUnit_local = 'minute';
                baseInterval_count = 2;
            } else if (pas_de_temps == 'quart-horaire') {
                baseInterval_timeUnit_local = 'minute';
                baseInterval_count = 15;
            } else if (pas_de_temps == 'horaire') {
                baseInterval_timeUnit_local = 'hour';
                baseInterval_count = 1;
            } else if (pas_de_temps == 'journalière') {
                baseInterval_timeUnit_local = 'day';
                baseInterval_count = 1;
            }

            am5.ready(function () {
                // Group data by variable/polluant
                let seriesData = {};

                data.mesures.forEach((item) => {
                    // Determine the variable name (polluant)
                    let variable;
                    // Use more specific matching to avoid PM1 matching PM10
                    // Use a fallback identification method based on pollutant ID
                    if (item.polluant_id === '03') {
                        variable = 'no2';
                    } else if (item.polluant_id === '68') {
                        variable = 'pm1';
                    } else if (item.polluant_id === '39') {
                        variable = 'pm2.5';
                    } else if (item.polluant_id === '24') {
                        variable = 'pm10';
                    } else {
                        variable = item.polluant_id || 'unknown';
                    }

                    if (!seriesData[variable]) {
                        seriesData[variable] = [];
                    }

                    // Only add valid data points
                    if (item.valeur !== null && item.date_debut) {
                        seriesData[variable].push({
                            value: item.valeur,
                            date: new Date(item.date_debut).getTime(),
                        });
                    }
                });

                // Create root element
                amchart_root = am5.Root.new('chartdiv_sensor');

                // Create chart
                let chart = amchart_root.container.children.push(
                    am5xy.XYChart.new(amchart_root, {
                        panX: false,
                        panY: false,
                        wheelX: 'panX',
                        wheelY: 'zoomX',
                        paddingLeft: 0,
                    })
                );

                // Add cursor
                let cursor = chart.set(
                    'cursor',
                    am5xy.XYCursor.new(amchart_root, {
                        behavior: 'zoomX',
                    })
                );
                cursor.lineY.set('visible', false);

                // Create axes
                let xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(amchart_root, {
                        maxDeviation: 0.2,
                        baseInterval: {
                            timeUnit: baseInterval_timeUnit_local,
                            count: baseInterval_count,
                        },
                        renderer: am5xy.AxisRendererX.new(amchart_root, {
                            minorGridEnabled: true,
                        }),
                        tooltip: am5.Tooltip.new(amchart_root, {}),
                    })
                );

                let yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(amchart_root, {
                        renderer: am5xy.AxisRendererY.new(amchart_root, {}),
                    })
                );

                // Create a series for each variable in the data
                // Create a series for each variable in the data
                Object.keys(seriesData).forEach((variable) => {
                    // Skip empty series
                    if (seriesData[variable].length === 0) return;

                    // Sort data points by date
                    seriesData[variable].sort((a, b) => a.date - b.date);

                    // Format the display name with subscript for NO2
                    let displayName = variable.toUpperCase();
                    if (variable === 'no2') {
                        displayName = 'NO₂'; // Using Unicode subscript character instead of HTML
                    }

                    let series = chart.series.push(
                        am5xy.SmoothedXLineSeries.new(amchart_root, {
                            name: displayName,
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: 'value',
                            valueXField: 'date',
                            tooltip: am5.Tooltip.new(amchart_root, {
                                labelText:
                                    variable === 'no2'
                                        ? `NO₂: {valueY} µg/m³`
                                        : `${displayName}: {valueY} µg/m³`,
                            }),
                        })
                    );

                    series.strokes.template.setAll({
                        strokeWidth: 2,
                    });

                    series.data.setAll(seriesData[variable]);
                    series.appear(1000);
                });

                // Add legend
                chart.legend = chart.children.push(
                    am5.Legend.new(amchart_root, {
                        centerX: am5.p50,
                        x: am5.p50,
                    })
                );

                chart.appear(1000, 100);
            });
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);

            // Remove spinner and display error message with Bootstrap styling
            chartDiv.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <i class="bi bi-exclamation-circle-fill me-2"></i>
                    <strong>Erreur!</strong> Impossible de récupérer les données pour cette station.
                    <br>Détails: ${error}
                </div>`;
        },
    });
}
