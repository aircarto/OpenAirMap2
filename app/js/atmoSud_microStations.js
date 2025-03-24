// /*
// Récupération des données des micro stations
// -> API ATMOSUD "OBSERVATIONS/CAPTEURS/DERNIERES"
// -> Ou plutot "OBSERVATIONS/CAPTEURS/SITES"

// En réponse on a:

// valeur          valeur corrigée
// valeur_brute    valeur brute
// valeur_ref      valeur corrigée si existe sinon valeur brute

// */
// function load_atmoSud_microStations() {
//     console.log(
//         '%cload_atmoSud_microStations',
//         'color: yellow; font-style: bold; background-color: blue;padding: 2px'
//     );
//     const start = Date.now();

//     atmo_micro_layer.clearLayers();
//     var pas_de_temps = getArrayFromLocalStorage(pas_de_temps_local);
//     var pas_de_temps_atmo = '';
//     switch (pas_de_temps[0]) {
//         case '2min':
//             var pas_de_temps_atmo = 'brute';
//             break;
//         case 'qh':
//             var pas_de_temps_atmo = 'quart-horaire';
//             break;
//         case 'h':
//             var pas_de_temps_atmo = 'horaire';
//             break;
//         case 'd':
//             var pas_de_temps_atmo = 'journalier';
//             break;
//     }

//     // On récupère le type de mesure sélectionné par l'utilisateur pour l'affichage
//     var mesures = getArrayFromLocalStorage(mesures_local);
//     var selectedMeasure = mesures[0];
//     var selectedMeasureAtmo =
//         selectedMeasure === 'pm25' ? 'pm2.5' : selectedMeasure;

//     // Mais on va demander tous les polluants disponibles
//     var allPollutants = ['pm1', 'pm2.5', 'pm10', 'no2'];

//     if (pas_de_temps[0] === 'd') {
//         alert('Pas de données pour le pas de temps ' + pas_de_temps);
//         return;
//     }

//     console.log('Pas de temps : ' + pas_de_temps);
//     console.log('Pas de temps Atmo: ' + pas_de_temps_atmo);
//     console.log('Mesure sélectionnée : ' + selectedMeasure);
//     console.log('Tous les polluants demandés : ' + allPollutants);

//     let full_url_derniere = `
//     https://api.atmosud.org/observations/capteurs/mesures/dernieres?
//     format=json
//     &download=false
//     &valeur_brute=true
//     &type_capteur=true
//     &variable=${allPollutants.join(',')}
//     &aggregation=${pas_de_temps_atmo}
//     &nb_dec=1
//     `.replace(/\s+/g, '');

//     $.ajax({
//         method: 'GET',
//         url: full_url_derniere,
//         success: function (data) {
//             console.log(full_url_derniere);
//             console.log(data);
//             const end = Date.now();
//             const requestTimer = (end - start) / 1000;
//             console.log(
//                 `Data gathered in %c${requestTimer} sec`,
//                 'color: red;'
//             );

//             // Organiser les données par site et par polluant
//             let siteData = {};
//             data.forEach((item) => {
//                 if (!siteData[item.id_site]) {
//                     siteData[item.id_site] = {
//                         site_info: {
//                             id_site: item.id_site,
//                             nom_site: item.nom_site,
//                             lat: item.lat,
//                             lon: item.lon,
//                             modele_capteur: item.modele_capteur,
//                         },
//                         pollutants: {},
//                     };
//                 }
//                 siteData[item.id_site].pollutants[item.variable] = item;
//             });

//             console.log('Données organisées par site:', siteData);

//             // Filtrer les sites qui ont le polluant sélectionné
//             let filteredSites = Object.values(siteData).filter((site) => {
//                 return Object.keys(site.pollutants).some(
//                     (key) =>
//                         key.toLowerCase() === selectedMeasureAtmo.toLowerCase()
//                 );
//             });

//             if (pas_de_temps[0] === '2min') {
//                 filteredSites = filteredSites.filter(
//                     (site) => site.site_info.modele_capteur === 'NebuleAir'
//                 );
//                 console.warn(
//                     'Uniquement micro-stations NebuleAir pour le pas de temps ' +
//                         pas_de_temps
//                 );
//             }

//             console.log(
//                 'Sites filtrés pour le polluant ' + selectedMeasureAtmo + ':',
//                 filteredSites
//             );

//             // Créer les marqueurs pour chaque site
//             filteredSites.forEach((site) => {
//                 // Adapter pour gérer la casse des polluants
//                 let value = site.pollutants[selectedMeasureAtmo.toUpperCase()];

//                 // ICONE
//                 var icon_param = {
//                     iconUrl:
//                         'img/microStationsAtmoSud/microStationAtmoSud_default.png',
//                     iconSize: [50, 50],
//                     iconAnchor: [5, 40],
//                     popupAnchor: [0, -10],
//                     tooltipAnchor: [-50, -10],
//                 };

//                 // Use the helper functions from app.js instead of duplicating the logic
//                 let valueToCheck = value['valeur_brute'];
//                 let colorCode = getColorCodeForValue(
//                     valueToCheck,
//                     selectedMeasure
//                 );

//                 // Set the icon URL based on the color code
//                 if (colorCode !== 'default') {
//                     icon_param.iconUrl =
//                         'img/microStationsAtmoSud/microStationAtmoSud_' +
//                         colorCode +
//                         '.png';
//                 }

//                 // Tooltip
//                 var microStation_icon = L.icon(icon_param);

//                 // Création du marqueur principal (point de mesure)
//                 let microStationMarker = L.marker(
//                     [site.site_info.lat, site.site_info.lon],
//                     {
//                         icon: microStation_icon,
//                     }
//                 ).addTo(atmo_micro_layer);

//                 // Store device data with the marker
//                 microStationMarker.deviceId = site.site_info.id_site;
//                 microStationMarker.deviceData = site;
//                 microStationMarker.allPollutantsData = site.pollutants;

//                 // Store a reference to this marker in a global object for easy access
//                 if (!window.deviceMarkers) window.deviceMarkers = {};
//                 window.deviceMarkers[site.site_info.id_site] = {
//                     marker: microStationMarker,
//                     data: value,
//                     allPollutantsData: site.pollutants,
//                     site_info: site.site_info,
//                 };

//                 // TEXTE
//                 let roundedvalue = Math.round(
//                     parseFloat(value['valeur_brute'])
//                 );
//                 var textSize = 32;
//                 var x_position = -10;
//                 var y_position = 41;

//                 if (roundedvalue >= 10) {
//                     textSize = 25;
//                     x_position = -5;
//                     y_position = 32;
//                 }
//                 if (roundedvalue >= 100) {
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
//                         roundedvalue +
//                         '</div>',
//                     iconAnchor: [x_position, y_position],
//                     popupAnchor: [30, -60],
//                 });

//                 let textMarker = L.marker(
//                     [site.site_info.lat, site.site_info.lon],
//                     {
//                         icon: text_param,
//                     }
//                 )
//                     .on('click', function () {
//                         // Si un marker est déjà sélectionné, on enlève l'animation
//                         if (
//                             globalSelectedMarker &&
//                             globalSelectedMarker !== microStationMarker
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

//                         // Appliquer l'animation uniquement au nouveau marker sélectionné
//                         microStationMarker.setZIndexOffset(1000);
//                         textMarker.setZIndexOffset(1000);
//                         microStationMarker._icon.classList.add(
//                             'marker-selected'
//                         );
//                         textMarker._icon.classList.add('marker-selected');

//                         // Mettre à jour le marker sélectionné
//                         globalSelectedMarker = microStationMarker;
//                         globalSelectedText = textMarker;
//                         globalSelectedDeviceId = site.site_info.id_site;
//                         window.lastSelectedDeviceData = site;

//                         console.log(
//                             'Click on device: ' + site.site_info.id_site
//                         );
//                         openSidePanel_microStation(
//                             site,
//                             pas_de_temps_atmo,
//                             '24h',
//                             [selectedMeasureAtmo] // Utiliser la version en majuscules
//                         );
//                     })
//                     .addTo(atmo_micro_layer);

//                 // Also store the text marker reference
//                 textMarker.deviceId = site.site_info.id_site;
//                 textMarker.deviceData = site;

//                 if (window.deviceMarkers[site.site_info.id_site]) {
//                     window.deviceMarkers[site.site_info.id_site].textMarker =
//                         textMarker;
//                 }

//                 // Effet hover : mise en avant du point et du texte
//                 // Dans atmoSud_microStations.js
//                 function highlightMarker() {
//                     microStationMarker.setZIndexOffset(1000);
//                     textMarker.setZIndexOffset(1000);

//                     // Récupérer les polluants disponibles
//                     let pollutantsHTML = '';
//                     let availablePollutants = [];

//                     // Déterminer les polluants disponibles selon la structure des données
//                     if (site.pollutants) {
//                         availablePollutants = Object.keys(site.pollutants);
//                     } else if (site.allPollutantsData) {
//                         availablePollutants = Object.keys(
//                             site.allPollutantsData
//                         );
//                     } else if (
//                         window.deviceMarkers &&
//                         window.deviceMarkers[site.site_info.id_site] &&
//                         window.deviceMarkers[site.site_info.id_site]
//                             .allPollutantsData
//                     ) {
//                         availablePollutants = Object.keys(
//                             window.deviceMarkers[site.site_info.id_site]
//                                 .allPollutantsData
//                         );
//                     }

//                     // Générer le HTML pour les polluants
//                     if (availablePollutants.length > 0) {
//                         pollutantsHTML =
//                             '<div class="mt-2"><strong>Polluants mesurés:</strong>';
//                         pollutantsHTML +=
//                             '<ul class="list-unstyled mb-0 ps-2">';

//                         availablePollutants.forEach((pollutant) => {
//                             let formattedName = '';

//                             // Formater le nom du polluant
//                             switch (pollutant.toLowerCase()) {
//                                 case 'pm1':
//                                     formattedName = 'PM1';
//                                     break;
//                                 case 'pm2.5':
//                                     formattedName = 'PM2.5';
//                                     break;
//                                 case 'pm10':
//                                     formattedName = 'PM10';
//                                     break;
//                                 case 'no2':
//                                     formattedName = 'NO₂';
//                                     break;
//                                 default:
//                                     formattedName = pollutant.toUpperCase();
//                             }

//                             let statusIndicator =
//                                 '<i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>';
//                             pollutantsHTML += `<li>${statusIndicator}${formattedName}</li>`;
//                         });

//                         pollutantsHTML += '</ul></div>';
//                     }

//                     // Déterminer le nom et le modèle à afficher selon la structure des données
//                     const nomSite = site.site_info
//                         ? site.site_info.nom_site
//                         : site.nom_site;
//                     const modeleCapteur = site.site_info
//                         ? site.site_info.modele_capteur
//                         : site.modele_capteur;

//                     // Construction et affichage de la carte d'information
//                     deviceInfo._div.innerHTML = `
//                         <div class="card border-0 shadow-sm">
//                             <div class="card-body p-3">
//                                 <h5 class="card-title mb-1">${formatString(nomSite)}</h5>
//                                 <p class="card-text text-muted mb-2">Type: ${modeleCapteur}</p>
//                                 ${pollutantsHTML}
//                                 <div class="badge bg-success mt-2"><i class="bi bi-broadcast-pin me-1"></i>Capteur actif</div>
//                             </div>
//                         </div>
//                     `;

//                     // Afficher l'info-bulle
//                     deviceInfo._div.style.display = 'block';
//                 }

//                 function resetMarker() {
//                     // Don't reset if this is the selected marker
//                     if (globalSelectedMarker !== microStationMarker) {
//                         microStationMarker.setZIndexOffset(0);
//                         textMarker.setZIndexOffset(0);
//                     }
//                     deviceInfo._div.style.display = 'none';
//                 }

//                 microStationMarker
//                     .on('mouseover', highlightMarker)
//                     .on('mouseout', resetMarker);
//                 textMarker
//                     .on('mouseover', highlightMarker)
//                     .on('mouseout', resetMarker);
//             });

//             //ajouter la layer sur la carte
//             map.addLayer(atmo_micro_layer);
//         },
//         error: function (xhr, status, error) {
//             console.error('Error:', error);
//             console.error('Status:', status);
//             console.error('Response:', xhr.responseText);
//         },
//     });
// }
// function openSidePanel_microStation(
//     data,
//     pas_de_temps_atmo,
//     historique,
//     mesures_atmo
// ) {
//     // Gestion icone fermeture sidepanel
//     var closeButton = document
//         .getElementById('toggleSidePanel')
//         .querySelector('i');
//     closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');

//     historique_chart = historique;
//     pas_de_temps_chart = pas_de_temps_atmo;
//     mesures_array.length = 0;
//     // Si mesures_atmo est un tableau, ajouter chaque élément au tableau mesures_array
//     if (Array.isArray(mesures_atmo)) {
//         mesures_atmo.forEach((measure) => mesures_array.push(measure));
//     } else {
//         // Si mesures_atmo n'est pas un tableau, ajouter la valeur à mesures_array
//         mesures_array.push(mesures_atmo);
//     }

//     //on réinitialise les boutons
//     var historique_buttons = document.querySelectorAll(
//         '[id^="btn_historique_"]'
//     );
//     var pas_de_temps_buttons = document.querySelectorAll(
//         '[id^="btn_pas_de_temps_"]'
//     );
//     var polluants_buttons = document.querySelectorAll('[id^="btn_poluant_"]');

//     historique_buttons.forEach((btn) => (btn.checked = false));
//     pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
//     polluants_buttons.forEach((btn) => (btn.checked = false));

//     // Activer/désactiver les boutons de polluants en fonction de ce que l'appareil peut mesurer

//     // Désactiver tous les boutons de polluants par défaut
//     btn_poluant_pm1.disabled = true;
//     btn_poluant_pm25.disabled = true;
//     btn_poluant_pm10.disabled = true;
//     btn_poluant_no2.disabled = true;

//     // Récupérer les polluants disponibles pour cette station
//     let availablePollutants = [];

//     // Vérifier si nous avons la nouvelle structure de données ou l'ancienne
//     if (data.pollutants) {
//         // Nouvelle structure
//         availablePollutants = Object.keys(data.pollutants);
//     } else if (data.allPollutantsData) {
//         // Structure intermédiaire (stockée dans le marker)
//         availablePollutants = Object.keys(data.allPollutantsData);
//     } else if (
//         window.deviceMarkers &&
//         window.deviceMarkers[data.id_site] &&
//         window.deviceMarkers[data.id_site].allPollutantsData
//     ) {
//         // Récupérer depuis l'objet global deviceMarkers
//         availablePollutants = Object.keys(
//             window.deviceMarkers[data.id_site].allPollutantsData
//         );
//     } else {
//         // Ancienne structure - on n'a qu'un seul polluant
//         // Convertir pm25 en pm2.5 si nécessaire
//         const pollutant =
//             data.variable === 'PM25'
//                 ? 'pm2.5'
//                 : data.variable
//                   ? data.variable.toLowerCase()
//                   : '';
//         if (pollutant) {
//             availablePollutants = [pollutant];
//         }
//     }

//     console.log(
//         'Polluants disponibles pour cet appareil:',
//         availablePollutants
//     );

//     // Activer les boutons pour les polluants disponibles
//     if (
//         availablePollutants.includes('pm1') ||
//         availablePollutants.includes('PM1')
//     ) {
//         btn_poluant_pm1.disabled = false;
//     }
//     if (
//         availablePollutants.includes('pm2.5') ||
//         availablePollutants.includes('PM2.5')
//     ) {
//         btn_poluant_pm25.disabled = false;
//     }
//     if (
//         availablePollutants.includes('pm10') ||
//         availablePollutants.includes('PM10')
//     ) {
//         btn_poluant_pm10.disabled = false;
//     }
//     if (
//         availablePollutants.includes('no2') ||
//         availablePollutants.includes('NO2')
//     ) {
//         btn_poluant_no2.disabled = false;
//     }

//     console.log('mesures atmo', mesures_atmo);
//     //on met les boutons des filtres à jour
//     const btn_historique = document.getElementById(
//         'btn_historique_' + historique
//     );
//     btn_historique.checked = true;
//     btn_pas_de_temps = document.getElementById(
//         'btn_pas_de_temps_' + pas_de_temps[pas_de_temps_atmo].code
//     );
//     btn_pas_de_temps.checked = true;

//     // Sélectionner le bouton du polluant actif
//     let activeMeasure = '';
//     if (Array.isArray(mesures_atmo)) {
//         activeMeasure = mesures_atmo[0];
//     } else {
//         activeMeasure = mesures_atmo;
//     }

//     // Convertir pm25 en pm2.5 si nécessaire
//     if (activeMeasure === 'pm25') {
//         activeMeasure = 'pm2.5';
//     }

//     console.log('Polluant actif:', activeMeasure);

//     if (activeMeasure === 'pm1' && !btn_poluant_pm1.disabled) {
//         btn_poluant_pm1.checked = true;
//         mesures_array = ['pm1'];
//     } else if (
//         (activeMeasure === 'pm2.5' || activeMeasure === 'pm25') &&
//         !btn_poluant_pm25.disabled
//     ) {
//         btn_poluant_pm25.checked = true;
//         mesures_array = ['pm2.5'];
//     } else if (activeMeasure === 'pm10' && !btn_poluant_pm10.disabled) {
//         btn_poluant_pm10.checked = true;
//         mesures_array = ['pm10'];
//     } else if (activeMeasure === 'no2' && !btn_poluant_no2.disabled) {
//         btn_poluant_no2.checked = true;
//         mesures_array = ['no2'];
//     } else {
//         // Si le polluant actif n'est pas disponible, sélectionner le premier disponible
//         if (!btn_poluant_pm25.disabled) {
//             btn_poluant_pm25.checked = true;
//             mesures_array = ['pm2.5'];
//         } else if (!btn_poluant_pm10.disabled) {
//             btn_poluant_pm10.checked = true;
//             mesures_array = ['pm10'];
//         } else if (!btn_poluant_pm1.disabled) {
//             btn_poluant_pm1.checked = true;
//             mesures_array = ['pm1'];
//         } else if (!btn_poluant_no2.disabled) {
//             btn_poluant_no2.checked = true;
//             mesures_array = ['no2'];
//         }
//     }

//     console.log('openSidePanel_microStation');
//     console.log('mesures_array après sélection:', mesures_array);

//     // Déterminer l'ID du site à utiliser
//     const siteId = data.site_info ? data.site_info.id_site : data.id_site;

//     // Utiliser l'ID du site pour récupérer les données historiques
//     retreive_historiqueData_microStation(
//         siteId,
//         pas_de_temps_atmo,
//         historique,
//         mesures_array
//     );

//     // Mettre à jour les informations de la carte
//     card1_img.src = 'img/microStationsAtmoSud/microStationAtmoSud_default.png';
//     card1_title.innerHTML = data.site_info.nom_site;
//     card1_subtitle.innerHTML =
//         'Micro-station AtmoSud - ' + data.site_info.modele_capteur;
//     card1_text.innerHTML = '';

//     card2_text.innerHTML =
//         "Les micro-stations sont des capteurs de mesure de la qualité de l'air déployés par AtmoSud pour compléter le réseau de stations de référence.";
//     card2_link.innerHTML = 'AtmoSud.org';
//     card2_link.href = 'https://www.atmosud.org';

//     // Historique Button handlers setup
//     btn_historique_custom.onclick = function (event) {
//         event.preventDefault();
//         var startDate = btn_historique_start_date.value;
//         var endDate = btn_historique_end_date.value;
//         var startTime = '00:00';
//         var endTime = '23:59';
//         console.log({
//             startDate: startDate,
//             startTime: startTime,
//             endDate: endDate,
//             endTime: endTime,
//         });
//         if (startDate && startTime && endDate && endTime) {
//             historique_buttons.forEach((btn) => (btn.checked = false));
//             btn_historique_custom.checked = true;

//             let startDateTime = new Date(
//                 `${startDate}T${startTime}`
//             ).toISOString();
//             let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

//             console.log(
//                 'Date de début:',
//                 startDateTime,
//                 'Date de fin:',
//                 endDateTime
//             );
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 null,
//                 mesures_array,
//                 false,
//                 startDateTime,
//                 endDateTime
//             );
//         } else {
//             alert(
//                 'Veuillez sélectionner une date et une heure de début et de fin.'
//             );
//         }
//     };

//     btn_historique_1h.onclick = function () {
//         historique_chart = '1h';
//         historique_buttons.forEach((btn) => (btn.checked = false));
//         btn_historique_1h.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_3h.onclick = function () {
//         historique_chart = '3h';
//         historique_buttons.forEach((btn) => (btn.checked = false));
//         btn_historique_3h.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_24h.onclick = function () {
//         historique_chart = '24h';
//         historique_buttons.forEach((btn) => (btn.checked = false));
//         btn_historique_24h.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_1sem.onclick = function () {
//         historique_chart = '7d';
//         historique_buttons.forEach((btn) => (btn.checked = false));
//         btn_historique_1sem.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_1m.onclick = function () {
//         historique_chart = '30d';
//         historique_buttons.forEach((btn) => (btn.checked = false));
//         btn_historique_1m.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_historique_1a.onclick = function () {
//         historique_chart = '365d';
//         historique_buttons.forEach((btn) => (btn.checked = false));
//         btn_historique_1a.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };

//     // Pas de temps Button handlers setup
//     btn_pas_de_temps_2min.onclick = function () {
//         pas_de_temps_chart = 'brute';
//         pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
//         btn_pas_de_temps_2min.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_pas_de_temps_qh.onclick = function () {
//         pas_de_temps_chart = 'quart-horaire';
//         pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
//         btn_pas_de_temps_qh.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_pas_de_temps_h.onclick = function () {
//         pas_de_temps_chart = 'horaire';
//         pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
//         btn_pas_de_temps_h.checked = true;
//         retreive_historiqueData_microStation(
//             data.site_info.id_site,
//             pas_de_temps_chart,
//             historique_chart,
//             mesures_array
//         );
//     };
//     btn_pas_de_temps_d.disabled = true;

//     btn_poluant_pm1.onclick = function () {
//         if (mesures_array.includes('pm1')) {
//             // Remove pm1 from array
//             mesures_array = mesures_array.filter((item) => item !== 'pm1');
//             btn_poluant_pm1.checked = false;
//         } else {
//             // Add pm1 to array
//             mesures_array.push('pm1');
//             btn_poluant_pm1.checked = true;
//         }
//         // check if custom histoical date or nah before retreive_historiqueData_microStation
//         if (btn_historique_custom.checked) {
//             var startDate = btn_historique_start_date.value;
//             var startTime = '00:00';
//             var endDate = btn_historique_end_date.value;
//             var endTime = '23:59';
//             let startDateTime = new Date(
//                 `${startDate}T${startTime}`
//             ).toISOString();
//             let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 null,
//                 mesures_array,
//                 false,
//                 startDateTime,
//                 endDateTime
//             );
//         } else {
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 historique_chart,
//                 mesures_array
//             );
//         }
//     };

//     btn_poluant_pm25.onclick = function () {
//         if (mesures_array.includes('pm2.5')) {
//             mesures_array = mesures_array.filter((item) => item !== 'pm2.5');
//             btn_poluant_pm25.checked = false;
//         } else {
//             mesures_array.push('pm2.5');
//             btn_poluant_pm25.checked = true;
//         }
//         if (btn_historique_custom.checked) {
//             var startDate = btn_historique_start_date.value;
//             var startTime = '00:00';
//             var endDate = btn_historique_end_date.value;
//             var endTime = '23:59';
//             let startDateTime = new Date(
//                 `${startDate}T${startTime}`
//             ).toISOString();
//             let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 null,
//                 mesures_array,
//                 false,
//                 startDateTime,
//                 endDateTime
//             );
//         } else {
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 historique_chart,
//                 mesures_array
//             );
//         }
//     };

//     btn_poluant_pm10.onclick = function () {
//         if (mesures_array.includes('pm10')) {
//             mesures_array = mesures_array.filter((item) => item !== 'pm10');
//             btn_poluant_pm10.checked = false;
//         } else {
//             mesures_array.push('pm10');
//             btn_poluant_pm10.checked = true;
//         }
//         if (btn_historique_custom.checked) {
//             var startDate = btn_historique_start_date.value;
//             var startTime = '00:00';
//             var endDate = btn_historique_end_date.value;
//             var endTime = '23:59';
//             let startDateTime = new Date(
//                 `${startDate}T${startTime}`
//             ).toISOString();
//             let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 null,
//                 mesures_array,
//                 false,
//                 startDateTime,
//                 endDateTime
//             );
//         } else {
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 historique_chart,
//                 mesures_array
//             );
//         }
//     };

//     btn_poluant_no2.onclick = function () {
//         if (mesures_array.includes('no2')) {
//             mesures_array = mesures_array.filter((item) => item !== 'no2');
//             btn_poluant_no2.checked = false;
//         } else {
//             mesures_array.push('no2');
//             btn_poluant_no2.checked = true;
//         }
//         if (btn_historique_custom.checked) {
//             var startDate = btn_historique_start_date.value;
//             var startTime = '00:00';
//             var endDate = btn_historique_end_date.value;
//             var endTime = '23:59';
//             let startDateTime = new Date(
//                 `${startDate}T${startTime}`
//             ).toISOString();
//             let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 null,
//                 mesures_array,
//                 false,
//                 startDateTime,
//                 endDateTime
//             );
//         } else {
//             retreive_historiqueData_microStation(
//                 data.site_info.id_site,
//                 pas_de_temps_chart,
//                 historique_chart,
//                 mesures_array
//             );
//         }
//     };

//     openSidePanel_generic();
// }

// function retreive_historiqueData_microStation(
//     sensorId,
//     pas_de_temps,
//     historique,
//     mesures_array,
//     add_mesure = false,
//     custom_start = null,
//     custom_end = null
// ) {
//     console.log('retreiving data for:', {
//         sensorId: sensorId,
//         pas_de_temps: pas_de_temps,
//         historique: historique,
//         mesures_array: mesures_array,
//         add_mesure: add_mesure,
//     });

//     const start = Date.now();
//     document.getElementById('chartdiv_sensor').innerHTML = '';

//     // if (add_mesure) {
//     //     mesures_array.push(mesure);
//     // }

//     // Convert historique string to number of hours
//     let hours;
//     switch (historique) {
//         case '1h':
//             hours = 1;
//             break;
//         case '3h':
//             hours = 3;
//             break;
//         case '24h':
//             hours = 24;
//             break;
//         case '7d':
//             hours = 24 * 7;
//             break;
//         case '30d':
//             hours = 24 * 30;
//             break;
//         case '365d':
//             hours = 24 * 365;
//             break;
//         default:
//             hours = 24;
//     }
//     // switch (pas_de_temps) {
//     //     case "brute": pas_de_temps = "none"; break;
//     //     case "quart-horaire": pas_de_temps = "quart-horaire"; break;
//     //     case "horaire": pas_de_temps = "horaire"; break;
//     //     case "journalier": pas_de_temps = "journalier"; break;
//     //     default: pas_de_temps = "none";
//     // }
//     console.log('hours: ' + hours);

//     const end_date = custom_end || new Date().toISOString();
//     const start_date =
//         custom_start ||
//         new Date(Date.now() - hours * 3600 * 1000).toISOString();

//     let full_url = `https://api.atmosud.org/observations/capteurs/mesures?
//         debut=${start_date}
//         &fin=${end_date}
//         &id_site=${sensorId}
//         &format=json
//         &download=false
//         &nb_dec=0
//         &valeur_brute=true
//         &variable=${mesures_array}
//         &aggregation=${pas_de_temps}
//         &type_capteur=true`.replace(/\s+/g, '');
//     console.log(full_url);

//     $.ajax({
//         method: 'GET',
//         url: full_url,
//         success: function (data) {
//             const requestTimer = (Date.now() - start) / 1000;
//             console.log(
//                 `Data gathered in %c${requestTimer} sec`,
//                 'color: red;'
//             );
//             console.log(data);

//             if (amchart_root != undefined) {
//                 amchart_root.dispose();
//             }
//             var baseInterval_timeUnit_local;
//             var baseInterval_count;
//             if (
//                 pas_de_temps == '2m' ||
//                 pas_de_temps == '2min' ||
//                 pas_de_temps == 'brute'
//             ) {
//                 baseInterval_timeUnit_local = 'minute';
//                 baseInterval_count = 2;
//             }
//             if (
//                 pas_de_temps == '15m' ||
//                 pas_de_temps == 'qh' ||
//                 pas_de_temps == 'quart-horaire'
//             ) {
//                 baseInterval_timeUnit_local = 'minute';
//                 baseInterval_count = 15;
//             }
//             if (
//                 pas_de_temps == '1h' ||
//                 pas_de_temps == 'h' ||
//                 pas_de_temps == 'horaire'
//             ) {
//                 baseInterval_timeUnit_local = 'hour';
//                 baseInterval_count = 1;
//             }
//             if (
//                 pas_de_temps == '24h' ||
//                 pas_de_temps == '1d' ||
//                 pas_de_temps == 'journalier'
//             ) {
//                 baseInterval_timeUnit_local = 'day';
//                 baseInterval_count = 1;
//             }

//             am5.ready(function () {
//                 // Group data by variable
//                 let seriesData = {};
//                 data.forEach((item) => {
//                     const variable = item.variable;
//                     if (!seriesData[variable]) {
//                         seriesData[variable] = [];
//                     }
//                     seriesData[variable].push({
//                         value: item.valeur_ref,
//                         date: new Date(item.time).getTime(),
//                     });
//                 });

//                 amchart_root = am5.Root.new('chartdiv_sensor');

//                 let chart = amchart_root.container.children.push(
//                     am5xy.XYChart.new(amchart_root, {
//                         panX: false,
//                         panY: false,
//                         wheelX: 'panX',
//                         wheelY: 'zoomX',
//                         paddingLeft: 0,
//                     })
//                 );

//                 let cursor = chart.set(
//                     'cursor',
//                     am5xy.XYCursor.new(amchart_root, {
//                         behavior: 'zoomX',
//                     })
//                 );
//                 cursor.lineY.set('visible', false);

//                 let xAxis = chart.xAxes.push(
//                     am5xy.DateAxis.new(amchart_root, {
//                         maxDeviation: 0.2,
//                         baseInterval: {
//                             timeUnit: baseInterval_timeUnit_local,
//                             count: baseInterval_count,
//                         },
//                         renderer: am5xy.AxisRendererX.new(amchart_root, {
//                             minorGridEnabled: true,
//                         }),
//                         tooltip: am5.Tooltip.new(amchart_root, {}),
//                     })
//                 );

//                 let yAxis = chart.yAxes.push(
//                     am5xy.ValueAxis.new(amchart_root, {
//                         renderer: am5xy.AxisRendererY.new(amchart_root, {}),
//                     })
//                 );

//                 // Create a series for each variable in the data
//                 Object.keys(seriesData).forEach((variable) => {
//                     let series = chart.series.push(
//                         am5xy.SmoothedXLineSeries.new(amchart_root, {
//                             name: variable.toUpperCase(),
//                             xAxis: xAxis,
//                             yAxis: yAxis,
//                             valueYField: 'value',
//                             valueXField: 'date',
//                             tooltip: am5.Tooltip.new(amchart_root, {
//                                 labelText: `${variable.toUpperCase()}: {valueY} µg/m³ ${data.find((item) => item.variable === variable).valeur === null ? '(donnée brute)' : '(donnée corrigée)'}`,
//                             }),
//                         })
//                     );

//                     series.strokes.template.setAll({
//                         strokeWidth: 1,
//                     });

//                     series.data.setAll(seriesData[variable]);
//                     series.appear(1000);
//                 });

//                 chart.appear(1000, 100);
//             });
//             // Activer l'exportation avec plusieurs formats
//             let exporting = am5plugins_exporting.Exporting.new(amchart_root, {
//                 menu: am5plugins_exporting.ExportingMenu.new(amchart_root, {}),
//                 filePrefix: 'historique_data', // Nom du fichier téléchargé
//                 dataSource: data, // Utilisation des données récupérées pour l'export
//             });
//         },
//         error: function (xhr, status, error) {
//             console.error('Error:', error);
//             console.error('Status:', status);
//             console.error('Response:', xhr.responseText);
//         },
//     });
// }
