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

// function load_atmoSud_stationsRef() {
//     console.log(
//         '%cload_atmoSud_stationsRef',
//         'color: yellow; font-style: bold; background-color: blue;padding: 2px'
//     );
//     const start = Date.now(); //actual timestamp to measure response time
//     // Current date
//     const today = new Date();
//     atmo_ref_layer.clearLayers();
//     pas_de_temps_ = getArrayFromLocalStorage(pas_de_temps_local); //attention revoie un objet !!
//     switch (pas_de_temps_[0]) {
//         case '2min':
//             pas_de_temps_atmo = 'brute';
//             break;
//         case 'qh':
//             pas_de_temps_atmo = 'quart-horaire';
//             break;
//         case 'h':
//             pas_de_temps_atmo = 'horaire';
//             break;
//         case 'd':
//             pas_de_temps_atmo = 'journalière';
//             break;
//     }
//     //on récupère le type de mesure (+ conversion pm25 vers pm2.5)
//     var mesure = getArrayFromLocalStorage(mesures_local);

//     var mesure_atmo = mesure[0];
//     switch (mesure[0]) {
//         case 'pm25':
//             var mesure_atmo = 'pm2.5';
//             break;
//     }
//     //ATTENTION pas de donnée dispo pour les Stations de Référence au pas de temps 2min
//     if (pas_de_temps_[0] === '2min') {
//         console.warn('Pas de données pour le pas de temps ' + pas_de_temps_[0]);
//         return;
//     }

//     console.log('Pas de temps : ' + pas_de_temps_);
//     console.log('Pas de temps Atmo: ' + pas_de_temps_atmo);
//     console.log('Mesure : ' + mesure);

//     //1. Première request pour charger les identifiants et la localisation des STATIONS
//     // on ne veut que les stations qui mesurent le polluant choisis
//     // on ne veut que les stations actives (where date_fin_mesure est supérieur à la date d'aujourd'hui)
//     let full_url_stations = `
//         https://api.atmosud.org/observations/stations?
//         format=json&
//         nom_polluant=${mesure_atmo}&
//         download=false&
//         metadata=true
//     `.replace(/\s+/g, '');

//     $.ajax({
//         method: 'GET',
//         url: full_url_stations,
//         success: function (data) {
//             console.log('API stations:');
//             const end = Date.now();
//             const requestTimer = (end - start) / 1000;
//             console.log(
//                 `Data gathered in %c${requestTimer} sec`,
//                 'color: red;'
//             );
//             console.log('full_url_stations', full_url_stations);
//             console.log(data);

//             // Objet global pour suivre quel capteur/station est ouvert
//             if (!window.stationMarkers) window.stationMarkers = {};

//             $.each(data.stations, function (key, item) {
//                 var date_fin_Station = new Date(item.date_fin_mesure);
//                 if (today < date_fin_Station || item.date_fin_mesure === null) {
//                     //icone gris (par défault lorsque pas de donnée)
//                     var icon_param = {
//                         iconUrl:
//                             'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
//                         iconSize: [50, 50], // size of the icon
//                         iconAnchor: [5, 40], // point of the icon which will correspond to marker's location
//                         popupAnchor: [0, -10],
//                         tooltipAnchor: [-50, -10],
//                         className: item.id_station,
//                     };
//                     var refStationsAtmoSud_icon = L.icon(icon_param);

//                     // Création du marker clickable
//                     let stationMarker = L.marker(
//                         [item['latitude'], item['longitude']],
//                         {
//                             icon: refStationsAtmoSud_icon,
//                         }
//                     )
//                         .on('click', function () {
//                             // Gestion des markers précédemment sélectionnés
//                             if (
//                                 globalSelectedMarker &&
//                                 globalSelectedMarker !== stationMarker
//                             ) {
//                                 globalSelectedMarker.setZIndexOffset(0);
//                                 globalSelectedMarker._icon.classList.remove(
//                                     'marker-selected'
//                                 );
//                             }

//                             if (
//                                 globalSelectedText &&
//                                 window.stationMarkers[item.id_station]
//                                     .textMarker
//                             ) {
//                                 globalSelectedText.setZIndexOffset(0);
//                                 globalSelectedText._icon.classList.remove(
//                                     'marker-selected'
//                                 );
//                             }

//                             // On active l'animation seulement au marker ouvert
//                             if (
//                                 window.stationMarkers[item.id_station]
//                                     .textMarker
//                             ) {
//                                 window.stationMarkers[
//                                     item.id_station
//                                 ].textMarker.setZIndexOffset(1000);
//                                 window.stationMarkers[
//                                     item.id_station
//                                 ].textMarker._icon.classList.add(
//                                     'marker-selected'
//                                 );
//                             }
//                             stationMarker._icon.classList.add(
//                                 'marker-selected'
//                             );

//                             // On met à jour les variables marker globales
//                             globalSelectedMarker = stationMarker;
//                             globalSelectedText =
//                                 window.stationMarkers[item.id_station]
//                                     .textMarker;
//                             globalSelectedStationId = item.id_station;
//                             window.lastSelectedStationData = item;

//                             console.log('Click on station: ' + item.id_station);
//                             openSidePanel_stationRef(
//                                 item.id_station,
//                                 item.nom_station,
//                                 mesure
//                             );
//                         })
//                         .addTo(atmo_ref_layer);

//                     // On store les données de la station dans le marker
//                     stationMarker.stationId = item.id_station;
//                     stationMarker.stationData = item;

//                     // Store la référence du marker dans l'objet global
//                     window.stationMarkers[item.id_station] = {
//                         marker: stationMarker,
//                         data: item,
//                     };

//                     // Effect hover: Animation du marker selectionné
//                     function hoverMarker() {
//                         stationMarker.setZIndexOffset(1000);
//                         if (window.stationMarkers[item.id_station].textMarker) {
//                             window.stationMarkers[
//                                 item.id_station
//                             ].textMarker.setZIndexOffset(1000);
//                         }

//                         // Creation de la liste des polluants mesurés
//                         let pollutantsHTML = '';
//                         if (item.variables) {
//                             pollutantsHTML =
//                                 '<div class="mt-2"><strong>Polluants mesurés:</strong>';
//                             pollutantsHTML +=
//                                 '<ul class="list-unstyled mb-0 ps-2">';

//                             // Process polluant
//                             Object.entries(item.variables || {}).forEach(
//                                 ([id, pollutantData]) => {
//                                     // Safely handle missing or malformed data
//                                     if (!pollutantData) {
//                                         return; // Skip this iteration if pollutantData is null or undefined
//                                     }

//                                     // On formate le nom du polluant - safely handle non-string labels
//                                     let formattedName = '';
//                                     if (
//                                         pollutantData.label &&
//                                         typeof pollutantData.label === 'string'
//                                     ) {
//                                         formattedName = formatPollutantName(
//                                             pollutantData.label
//                                         );
//                                     } else {
//                                         // Fallback if label is not a string or is missing
//                                         formattedName = `Polluant ${id}`;
//                                     }

//                                     // Check if this pollutant is still being measured
//                                     // Default to false if en_service is undefined
//                                     let isActive = Boolean(
//                                         pollutantData.en_service
//                                     );
//                                     let statusHTML = '';

//                                     // If not active, show when it was stopped
//                                     if (!isActive && pollutantData.date_fin) {
//                                         try {
//                                             const endDate = new Date(
//                                                 pollutantData.date_fin
//                                             );
//                                             // Check if date is valid before formatting
//                                             if (!isNaN(endDate.getTime())) {
//                                                 const formattedDate =
//                                                     endDate.toLocaleDateString();
//                                                 statusHTML = `<span class="badge bg-secondary ms-2">Arrêté le ${formattedDate}</span>`;
//                                             } else {
//                                                 statusHTML = `<span class="badge bg-secondary ms-2">Date d'arrêt inconnue</span>`;
//                                             }
//                                         } catch (e) {
//                                             console.warn(
//                                                 'Error formatting date:',
//                                                 e
//                                             );
//                                             statusHTML = `<span class="badge bg-secondary ms-2">Date d'arrêt inconnue</span>`;
//                                         }
//                                     }

//                                     // Add status indicator
//                                     const statusIndicator = isActive
//                                         ? '<i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>'
//                                         : '<i class="bi bi-circle-fill text-secondary me-1" style="font-size: 0.6rem;"></i>';

//                                     // Add the pollutant to the HTML
//                                     pollutantsHTML += `<li>${statusIndicator}${formattedName}${statusHTML}</li>`;
//                                 }
//                             );

//                             pollutantsHTML += '</ul></div>';
//                         }

//                         // Check overall station status
//                         let stationStatusHTML = '';
//                         if (item.en_service === false) {
//                             stationStatusHTML =
//                                 '<div class="alert alert-warning py-1 mt-2 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i>Station hors service</div>';
//                         } else {
//                             stationStatusHTML =
//                                 '<div class="badge bg-success mt-2"><i class="bi bi-broadcast-pin me-1"></i>Station active</div>';
//                         }

//                         // Show device info with enhanced details
//                         deviceInfo._div.innerHTML = `
//                             <div class="card border-0 shadow-sm">
//                                 <div class="card-body p-3">
//                                     <h5 class="card-title mb-1" id="device-name">${item.nom_station}</h5>
//                                     <p class="card-text text-muted mb-2" id="device-details">Type: Station de référence</p>
//                                     ${pollutantsHTML}
//                                     ${stationStatusHTML}
//                                 </div>
//                             </div>
//                         `;

//                         deviceInfo._div.style.display = 'block';
//                     }

//                     function resetMarker() {
//                         // Don't reset if this is the selected marker
//                         if (globalSelectedMarker !== stationMarker) {
//                             stationMarker.setZIndexOffset(0);
//                             if (
//                                 window.stationMarkers[item.id_station]
//                                     .textMarker
//                             ) {
//                                 window.stationMarkers[
//                                     item.id_station
//                                 ].textMarker.setZIndexOffset(0);
//                             }
//                         }
//                         deviceInfo._div.style.display = 'none';
//                     }

//                     stationMarker
//                         .on('mouseover', hoverMarker)
//                         .on('mouseout', resetMarker);
//                 }
//             }); //end each

//             //ajouter la layer sur la carte
//             map.addLayer(atmo_ref_layer);
//         }, //end ajax sucess
//         error: function (xhr, status, error) {
//             console.error('Error:', error);
//             console.error('Status:', status);
//             console.error('Response:', xhr.responseText);
//         },
//     }); //end ajax

//     /*
//      *************************************************************************
//      ************************************************************************
//      */

//     //2. Deuxime Call pour afficher la dernière mesure dispo pour chaque station (mesure/dernière)
//     // en fonction de la mesure sélectionnée et du pas de temps
//     // on adapte les icones en fonctions (couleurs) et on affiche la mesure sur l'icone
//     let full_url_derniere = `
//       https://api.atmosud.org/observations/stations/mesures/derniere?
//       format=json&
//       nom_polluant=${mesure_atmo}&
//       temporalite=${pas_de_temps_atmo}&
//       download=false
//         `.replace(/\s+/g, '');

//     $.ajax({
//         method: 'GET',
//         url: full_url_derniere,
//         success: function (data) {
//             console.log('API dernière:');
//             const end = Date.now();
//             const requestTimer = (end - start) / 1000;
//             console.log(
//                 `Data gathered in %c${requestTimer} sec`,
//                 'color: red;'
//             );
//             console.log('full url derniere: ' + full_url_derniere);
//             console.log(data);

//             $.each(data.mesures, function (key, value) {
//                 // Remove any existing markers for this station to avoid duplicates
//                 atmo_ref_layer.eachLayer(function (layer) {
//                     if (
//                         layer._icon &&
//                         layer._icon.className.includes(value.id_station) &&
//                         value.valeur != null
//                     ) {
//                         console.log('Removed doublons');
//                         atmo_ref_layer.removeLayer(layer);
//                     }
//                 });

//                 //on récupère la valeur mesurée
//                 var valeur_polluant = value['valeur'];
//                 var icon_param = {
//                     iconUrl:
//                         'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
//                     iconSize: [50, 50], // size of the icon
//                     iconAnchor: [5, 50], // point of the icon which will correspond to marker's location
//                     popupAnchor: [0, -10],
//                     tooltipAnchor: [-50, -10],
//                     className: value.id_station,
//                 };

//                 let colorCode = getColorCodeForValue(
//                     valeur_polluant,
//                     mesure_atmo
//                 );

//                 // Set the icon URL based on the color code
//                 if (colorCode !== 'default') {
//                     icon_param.iconUrl =
//                         'img/stationsRefAtmoSud/refStationAtmoSud_' +
//                         colorCode +
//                         '.png';
//                 }

//                 //création des icones
//                 var refStationsAtmoSud_icon = L.icon(icon_param);

//                 // Create the main marker
//                 let stationMarker = L.marker([value['lat'], value['lon']], {
//                     icon: refStationsAtmoSud_icon,
//                 })
//                     .on('click', function () {
//                         // If a marker is already selected, remove the animation
//                         if (
//                             globalSelectedMarker &&
//                             globalSelectedMarker !== stationMarker
//                         ) {
//                             globalSelectedMarker.setZIndexOffset(0);
//                             globalSelectedMarker._icon.classList.remove(
//                                 'marker-selected'
//                             );
//                         }

//                         if (
//                             globalSelectedText &&
//                             globalSelectedText !== textMarker
//                         ) {
//                             globalSelectedText.setZIndexOffset(0);
//                             globalSelectedText._icon.classList.remove(
//                                 'marker-selected'
//                             );
//                         }

//                         // Apply animation only to the newly selected marker
//                         stationMarker.setZIndexOffset(1000);
//                         textMarker.setZIndexOffset(1000);
//                         stationMarker._icon.classList.add('marker-selected');
//                         textMarker._icon.classList.add('marker-selected');

//                         // Update the selected marker
//                         globalSelectedMarker = stationMarker;
//                         globalSelectedText = textMarker;
//                         globalSelectedStationId = value.id_station;
//                         window.lastSelectedStationData = value;

//                         console.log('Click on station: ' + value.id_station);
//                         openSidePanel_stationRef(
//                             value.id_station,
//                             value.nom_station,
//                             mesure
//                         );
//                     })
//                     .addTo(atmo_ref_layer);

//                 // Store station data with the marker
//                 stationMarker.stationId = value.id_station;
//                 stationMarker.stationData = value;

//                 // Store a reference to this marker in the global object
//                 if (!window.stationMarkers) window.stationMarkers = {};
//                 window.stationMarkers[value.id_station] = {
//                     marker: stationMarker,
//                     data: value,
//                 };

//                 // TEXTE pour affichage de la mesure
//                 //textSize (if number under 10)
//                 var textSize = 32;
//                 var x_position = -12;
//                 var y_position = 48;
//                 //smaller text size if number is greater than 9
//                 if (valeur_polluant >= 10) {
//                     textSize = 25;
//                     x_position = -5;
//                     y_position = 43;
//                 }

//                 if (valeur_polluant >= 100) {
//                     textSize = 20;
//                     x_position = -4;
//                     y_position = 26;
//                 }

//                 var text_param = L.divIcon({
//                     className: 'my-div-icon',
//                     html:
//                         '<div id="textDiv" style="font-size: ' +
//                         textSize +
//                         'px;">' +
//                         Math.round(valeur_polluant) +
//                         '</div>',
//                     iconAnchor: [x_position, y_position],
//                     popupAnchor: [30, -60], // point from which the popup should open relative to the iconAnchor
//                 });

//                 let textMarker = L.marker([value['lat'], value['lon']], {
//                     icon: text_param,
//                 })
//                     .on('click', function () {
//                         // If a marker is already selected, remove the animation
//                         if (
//                             globalSelectedMarker &&
//                             globalSelectedMarker !== stationMarker
//                         ) {
//                             globalSelectedMarker.setZIndexOffset(0);
//                             globalSelectedMarker._icon.classList.remove(
//                                 'marker-selected'
//                             );
//                         }

//                         if (
//                             globalSelectedText &&
//                             globalSelectedText !== textMarker
//                         ) {
//                             globalSelectedText.setZIndexOffset(0);
//                             globalSelectedText._icon.classList.remove(
//                                 'marker-selected'
//                             );
//                         }

//                         // Apply animation only to the newly selected marker
//                         stationMarker.setZIndexOffset(1000);
//                         textMarker.setZIndexOffset(1000);
//                         stationMarker._icon.classList.add('marker-selected');
//                         textMarker._icon.classList.add('marker-selected');

//                         // Update the selected marker
//                         globalSelectedMarker = stationMarker;
//                         globalSelectedText = textMarker;
//                         globalSelectedStationId = value.id_station;
//                         window.lastSelectedStationData = value;

//                         console.log('Click on station: ' + value.id_station);
//                         openSidePanel_stationRef(
//                             value.id_station,
//                             value.nom_station,
//                             mesure
//                         );
//                     })
//                     .addTo(atmo_ref_layer);

//                 // Also store the text marker reference
//                 textMarker.stationId = value.id_station;
//                 textMarker.stationData = value;

//                 if (window.stationMarkers[value.id_station]) {
//                     window.stationMarkers[value.id_station].textMarker =
//                         textMarker;
//                 }

//                 // Effect hover: highlight the point and text
//                 function hoverMarker() {
//                     stationMarker.setZIndexOffset(1000);
//                     textMarker.setZIndexOffset(1000);

//                     // Get the full station data if available
//                     let stationData = null;
//                     if (
//                         window.stationMarkers &&
//                         window.stationMarkers[value.id_station] &&
//                         window.stationMarkers[value.id_station].data
//                     ) {
//                         stationData =
//                             window.stationMarkers[value.id_station].data;
//                     }

//                     // Create a formatted list of pollutants if we have the full station data
//                     let pollutantsHTML = '';
//                     if (stationData && stationData.variables) {
//                         pollutantsHTML =
//                             '<div class="mt-2"><strong>Polluants mesurés:</strong>';
//                         pollutantsHTML +=
//                             '<ul class="list-unstyled mb-0 ps-2">';

//                         // Process each pollutant
//                         Object.entries(stationData.variables).forEach(
//                             ([id, name]) => {
//                                 // Format pollutant name with subscripts
//                                 let formattedName = formatPollutantName(name);

//                                 // Check if this pollutant is still being measured
//                                 let isActive = true;
//                                 let statusHTML = '';

//                                 if (
//                                     stationData.date_fin_mesure &&
//                                     stationData.date_fin_mesure[id]
//                                 ) {
//                                     const endDate = new Date(
//                                         stationData.date_fin_mesure[id]
//                                     );
//                                     const today = new Date();

//                                     if (endDate < today) {
//                                         isActive = false;
//                                         const formattedDate =
//                                             endDate.toLocaleDateString();
//                                         statusHTML = `<span class="badge bg-secondary ms-2">Arrêté le ${formattedDate}</span>`;
//                                     }
//                                 }

//                                 // Add status indicator
//                                 const statusIndicator = isActive
//                                     ? '<i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>'
//                                     : '<i class="bi bi-circle-fill text-secondary me-1" style="font-size: 0.6rem;"></i>';

//                                 pollutantsHTML += `<li>${statusIndicator}${formattedName}${statusHTML}</li>`;
//                             }
//                         );

//                         pollutantsHTML += '</ul></div>';
//                     } else {
//                         // If we don't have the full data, just show the current pollutant
//                         const currentPollutant = formatPollutantName(
//                             value.label_polluant || ''
//                         );
//                         pollutantsHTML = `
//                             <div class="mt-2">
//                                 <strong>Mesure actuelle:</strong>
//                                 <div class="ps-2">
//                                     <i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>
//                                     ${currentPollutant}: <strong>${Math.round(value.valeur)} µg/m³</strong>
//                                 </div>
//                             </div>
//                         `;
//                     }

//                     // Check overall station status
//                     let stationStatusHTML = '';
//                     if (stationData && stationData.en_service === false) {
//                         stationStatusHTML =
//                             '<div class="alert alert-warning py-1 mt-2 mb-0"><i class="bi bi-exclamation-triangle-fill me-1"></i>Station hors service</div>';
//                     } else {
//                         stationStatusHTML =
//                             '<div class="badge bg-success mt-2"><i class="bi bi-broadcast-pin me-1"></i>Station active</div>';
//                     }

//                     // Show device info with enhanced details
//                     deviceInfo._div.innerHTML = `
//                         <div class="card border-0 shadow-sm">
//                             <div class="card-body p-3">
//                                 <h5 class="card-title mb-1" id="device-name">${value.nom_station}</h5>
//                                 <p class="card-text text-muted mb-2" id="device-details">Type: Station de référence</p>
//                                 ${pollutantsHTML}
//                                 ${stationStatusHTML}
//                             </div>
//                         </div>
//                     `;

//                     deviceInfo._div.style.display = 'block';
//                 }

//                 function resetMarker() {
//                     // Don't reset if this is the selected marker
//                     if (globalSelectedMarker !== stationMarker) {
//                         stationMarker.setZIndexOffset(0);
//                         textMarker.setZIndexOffset(0);
//                     }
//                     deviceInfo._div.style.display = 'none';
//                 }

//                 stationMarker
//                     .on('mouseover', hoverMarker)
//                     .on('mouseout', resetMarker);
//                 textMarker
//                     .on('mouseover', hoverMarker)
//                     .on('mouseout', resetMarker);
//             }); //end each

//             //ajouter la layer sur la carte
//             map.addLayer(atmo_ref_layer);
//         }, //end ajax sucess
//         error: function (xhr, status, error) {
//             console.error('Error:', error);
//             console.error('Status:', status);
//             console.error('Response:', xhr.responseText);
//         },
//     }); //end ajax
// } //end function load_atmoSud_stationsRef()

function load_atmoSud_stationsRef() {
    console.log(
        '%cload_atmoSud_stationsRef',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now(); //actual timestamp to measure response time
    // Date actuelle
    const today = new Date();
    atmo_ref_layer.clearLayers();
    pas_de_temps_ = getArrayFromLocalStorage(pas_de_temps_local); //attention revoie un objet !!

    //on récupère le pas de temps et on le convertit pour API atmosud
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
                    .addTo(atmo_ref_layer);

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
                    .addTo(atmo_ref_layer);

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
                            .addTo(atmo_ref_layer);

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
            map.addLayer(atmo_ref_layer);
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
                        .addTo(atmo_ref_layer);

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
        map.addLayer(atmo_ref_layer);
    }
}

function openSidePanel_stationRef(stationID, station_name, mesure) {
    // Afficher des logs pour le débogage
    console.log('➡️ openSidePanel_stationRef');
    console.log('Station ID: ' + stationID);
    console.log('Mesure: ' + mesure);

    // Récupérer le bouton de fermeture du panneau latéral
    var closeButton = document
        .getElementById('toggleSidePanel')
        .querySelector('i');

    // Changer l'icône du bouton de fermeture
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');

    // Définir le pas de temps pour le graphique
    pas_de_temps_chart = pas_de_temps_atmo;

    // Réinitialiser le tableau des mesures
    mesures_array.length = 0;

    // Traiter les mesures reçues
    if (Array.isArray(mesure)) {
        // Si mesure est un tableau, ajouter chaque élément au tableau des mesures
        mesure.forEach((m) => mesures_array.push(m));
    } else {
        // Si mesure est une valeur unique, l'ajouter directement au tableau
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

    // Mettre à jour le btn historique
    btn_historique = document.getElementById(
        'btn_historique_' + historique_chart
    );
    btn_historique.checked = true;

    // conversion du pas de temps au format appli
    var pas_temps_code;
    if (pas_de_temps_atmo == 'quart-horaire') pas_temps_code = 'qh';
    else if (pas_de_temps_atmo == 'horaire') pas_temps_code = 'h';
    else if (pas_de_temps_atmo == 'journalière') pas_temps_code = 'd';
    else if (pas_de_temps_atmo == 'brute') pas_temps_code = '2min';

    // Mettre à jour le btn de pas de temps
    btn_pas_de_temps = document.getElementById(
        'btn_pas_de_temps_' + pas_temps_code
    );
    if (btn_pas_de_temps) btn_pas_de_temps.checked = true;

    // conversion du polluant au format appli
    var mesure_code;
    if (mesure == 'pm1') mesure_code = 'pm1';
    else if (mesure == 'pm25' || mesure == 'pm2.5') mesure_code = 'pm25';
    else if (mesure == 'pm10') mesure_code = 'pm10';
    else if (mesure == 'no2') mesure_code = 'no2';

    // Mettre à jour le btn de polluant
    btn_mesure = document.getElementById('btn_poluant_' + mesure_code);
    if (btn_mesure) btn_mesure.checked = true;

    // On lance la fonction pour récupérer les données historiques
    retreive_historiqueData_stationRef(
        stationID,
        pas_de_temps_chart,
        historique_chart,
        mesures_array
    );

    // Card info station cliqué
    card1_img.src = 'img/stationsRefAtmoSud/refStationAtmoSud_default.png';
    card1_title.innerHTML = station_name;
    card1_subtitle.innerHTML = 'Station de référence AtmoSud';
    card1_text.innerHTML = '';

    // Card info stations atmosud
    card2_text.innerHTML =
        "Le dispositif de mesure d'AtmoSud est assuré par un réseau de plus de 110 stations permanentes et de stations provisoires, en fonction des besoins des territoires. Chaque station est équipée d'un ou plusieurs appareils de mesure, en fonction des problématiques locales de pollution.";
    card2_link.innerHTML = 'AtmoSud.org';
    card2_link.href = 'https://www.atmosud.org';

    // On set les variable pour custom historique
    let using_custom_date_range = false;
    let custom_start_date = null;
    let custom_end_date = null;

    // Onclick sur le bouton historique
    btn_historique_custom.onclick = function (event) {
        // On évite le comportement par défaut du btn
        event.preventDefault();

        // On récupère les dates sélectionnées
        var startDate = btn_historique_start_date.value;
        var endDate = btn_historique_end_date.value;

        console.log('Selected dates:', startDate, endDate);

        // Vérifier si les dates sont valides
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

    // Gestion des boutons historique
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
    // Gestion des boutons pas de temps
    // On désactive les boutons pas de temps 2min (donnée pas dispo pour les stations atmosud)
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

    // Gestion des boutons polluants
    btn_poluant_pm1.onclick = function () {
        if (mesures_array.includes('pm1')) {
            mesures_array = mesures_array.filter((item) => item !== 'pm1');
            btn_poluant_pm1.checked = false;
        } else {
            mesures_array.push('pm1');
            btn_poluant_pm1.checked = true;
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

    // Récupérer la div du graphique et afficher un indicateur de chargement
    const chartDiv = document.getElementById('chartdiv_sensor');
    chartDiv.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="height: 300px;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span class="ms-2">Chargement des données...</span>
        </div>`;

    // Initialiser les variables pour les dates de début et de fin
    let start_date, end_date;

    // Vérifier si des dates personnalisées ont été fournies
    if (custom_start && custom_end) {
        // Étape 5a: Si oui, extraire la partie date des chaînes ISO
        start_date = custom_start.split('T')[0];
        end_date = custom_end.split('T')[0];

        console.log('Using custom date range:', start_date, 'to', end_date);
    } else {
        // Si non, calculer la plage de dates en fonction du paramètre historique
        let hours;
        // Déterminer le nombre d'heures selon la période sélectionnée
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

        // Définir la date de fin (aujourd'hui)
        let endDate = new Date();
        end_date = endDate.toISOString().split('T')[0];

        // Calculer la date de début en fonction de l'historique demandé
        let startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);
        start_date = startDate.toISOString().split('T')[0];

        // Afficher les dates calculées dans la console pour vérification
        console.log('Calculated date range:', start_date, 'to', end_date);
    }

    // Transformer le tableau des mesures en une chaîne de caractères
    // Remplacer 'pm25' par 'pm2.5' pour respecter le format de l'API
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

    // Envoi de la requête à l'API
    fetch(full_url)
        .then((response) => {
            // Vérification de la réponse HTTP
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            // Calcul du temps de réponse
            const requestTimer = (Date.now() - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log(data);

            // Nettoyage de l'affichage précédent
            chartDiv.innerHTML = '';

            // Suppression du graphique précédent s'il existe
            if (amchart_root != undefined) {
                amchart_root.dispose();
            }

            // Gestion du cas où il n'y a pas de données
            if (!data.mesures || data.mesures.length === 0) {
                chartDiv.innerHTML = `
                    <div class="alert alert-warning mt-3">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <strong>Aucune donnée!</strong> Pas de données disponibles pour cette période.
                    </div>`;
                return;
            }

            // Configuration des intervalles de temps selon le pas de temps choisi
            var baseInterval_timeUnit_local;
            var baseInterval_count;

            // Définition des paramètres selon le type d'intervalle
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
                // Initialisation d'un objet pour stocker les données par polluant
                let seriesData = {};

                // Parcours de toutes les mesures pour organiser les données
                data.mesures.forEach((item) => {
                    // Détermination du type de polluant en fonction de son ID
                    let variable;
                    // Association des IDs aux noms des polluants
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

                    // Création d'un tableau vide pour chaque nouveau polluant
                    if (!seriesData[variable]) {
                        seriesData[variable] = [];
                    }

                    // Ajout des données valides uniquement
                    if (item.valeur !== null && item.date_debut) {
                        seriesData[variable].push({
                            value: item.valeur,
                            date: new Date(item.date_debut).getTime(),
                        });
                    }
                });

                // Création de l'élément racine pour le graphique
                amchart_root = am5.Root.new('chartdiv_sensor');

                // Configuration et création du graphique XY
                let chart = amchart_root.container.children.push(
                    am5xy.XYChart.new(amchart_root, {
                        panX: false,
                        panY: false,
                        wheelX: 'panX',
                        wheelY: 'zoomX',
                        paddingLeft: 0,
                    })
                );

                // Ajout d'un curseur interactif pour permettre le zoom sur le graphique
                let cursor = chart.set(
                    'cursor',
                    am5xy.XYCursor.new(amchart_root, {
                        behavior: 'zoomX',
                    })
                );
                // Désactivation de la ligne verticale du curseur
                cursor.lineY.set('visible', false);

                // Création de l'axe X (axe horizontal) pour les dates
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

                // Création de l'axe Y (axe vertical) pour les valeurs numériques
                let yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(amchart_root, {
                        renderer: am5xy.AxisRendererY.new(amchart_root, {}),
                    })
                );

                // Création d'une série pour chaque variable dans les données
                Object.keys(seriesData).forEach((variable) => {
                    // Étape 2: Ignorer les séries vides
                    if (seriesData[variable].length === 0) return;

                    // Étape 3: Trier les points de données par date
                    seriesData[variable].sort((a, b) => a.date - b.date);

                    // Étape 4: Formater le nom d'affichage avec un indice pour NO2
                    let displayName = variable.toUpperCase();
                    if (variable === 'no2') {
                        displayName = 'NO₂'; // Utilisation du caractère Unicode pour l'indice
                    }

                    // Création d'une nouvelle série de lignes lissées pour le graphique
                    let series = chart.series.push(
                        am5xy.SmoothedXLineSeries.new(amchart_root, {
                            name: displayName,
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: 'value',
                            valueXField: 'date',
                            // Étape 6: Configuration de l'infobulle pour chaque série
                            tooltip: am5.Tooltip.new(amchart_root, {
                                labelText:
                                    variable === 'no2'
                                        ? `NO₂: {valueY} µg/m³`
                                        : `${displayName}: {valueY} µg/m³`,
                            }),
                        })
                    );

                    // Configuration du style des lignes du graphique
                    series.strokes.template.setAll({
                        strokeWidth: 2,
                    });

                    // Ajout des données à la série et animation d'apparition
                    series.data.setAll(seriesData[variable]);
                    series.appear(1000);
                });

                // Ajout d'une légende au graphique, centrée horizontalement
                chart.legend = chart.children.push(
                    am5.Legend.new(amchart_root, {
                        centerX: am5.p50,
                        x: am5.p50,
                    })
                );
                let exporting = am5plugins_exporting.Exporting.new(
                    amchart_root,
                    {
                        menu: am5plugins_exporting.ExportingMenu.new(
                            amchart_root,
                            {}
                        ),
                        filePrefix: 'historique_data', // Nom du fichier téléchargé
                        dataSource: data, // Utilisation des données récupérées pour l'export
                    }
                );

                // Animation d'apparition du graphique avec une durée de 1000ms et un délai de 100ms
                chart.appear(1000, 100);
            });
        })
        .catch((error) => {
            // Gestion des erreurs en cas de problème lors de la récupération des données
            console.error('Error:', error);

            // Suppression du spinner de chargement et affichage d'un message d'erreur stylisé
            // en utilisant les classes Bootstrap pour un style d'alerte rouge
            chartDiv.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <i class="bi bi-exclamation-circle-fill me-2"></i>
                    <strong>Erreur!</strong> Impossible de récupérer les données pour cette station.
                    <br>Détails: ${error.message || error}
                </div>`;
        });
}
