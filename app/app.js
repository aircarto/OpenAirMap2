// console.log('OpenAirMap V2');

// //récupérer la date et l'heure (client side!)
// var now = new Date();
// var year = now.getFullYear();
// var month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
// var day = now.getDate().toString().padStart(2, '0');

// var hours = now.getHours().toString().padStart(2, '0');
// var minutes = now.getMinutes().toString().padStart(2, '0');
// var seconds = now.getSeconds().toString().padStart(2, '0');

// var date_YMD = year + '-' + month + '-' + day;
// var date_YDM = year + '-' + day + '-' + month;
// var formattedTime = hours + ':' + minutes + ':' + seconds;

// console.log('Date: ' + date_YMD);
// console.log('Time: ' + formattedTime);

// //Amcharts chart
// var amchart_root;

// //variable pour les layers leaflet
// var nebuleair_layer = new L.layerGroup();
// var sensor_commmunity_layer = new L.layerGroup();
// var purpleair_layer = new L.layerGroup();
// var atmo_micro_layer = new L.layerGroup();
// var atmo_ref_layer = new L.layerGroup();
// var modelisationPMAtmoSud_layer = new L.layerGroup();
// var modelisationICAIRAtmoSud_layer = new L.layerGroup();
// var signalair_layer = new L.layerGroup();
// var mobileair_layer = new L.layerGroup();

// //variable pour le DOM
// var sidePanel = document.getElementById('side-panel');
// var card1 = document.getElementById('card1');
// var card1_body = document.getElementById('card1_body');
// var card1_img = document.getElementById('card1_img');
// var card1_title = document.getElementById('card1_title');
// var card1_text = document.getElementById('card1_text');
// var card1_button = document.getElementById('card1_button');
// var card2 = document.getElementById('card2');
// var card2_title = document.getElementById('card2_title');
// var card2_text = document.getElementById('card2_text');
// var card2_button = document.getElementById('card2_button');

// var mapContainer = document.getElementById('map-container');
// var dropdown_mesures = document.getElementById('dropdown_mesures');
// var dropdown_sources = document.getElementById('dropdown_sources');
// var dropdown_pas_de_temps = document.getElementById('dropdown_pas_de_temps');
// const mesures_local = 'mesures_local';
// const sources_local = 'sources_local';
// const pas_de_temps_local = 'pas_de_temps_local';

// //1.historique
// var btn_historique_custom = document.getElementById('apply_date_range');
// var btn_historique_start_date = document.getElementById('start_date');
// var btn_historique_start_time = document.getElementById('start_time');
// var btn_historique_end_date = document.getElementById('end_date');
// var btn_historique_end_time = document.getElementById('end_time');
// var btn_historique_1h = document.getElementById('btn_historique_1h');
// var btn_historique_3h = document.getElementById('btn_historique_3h');
// var btn_historique_24h = document.getElementById('btn_historique_24h');
// var btn_historique_1sem = document.getElementById('btn_historique_7d');
// var btn_historique_1m = document.getElementById('btn_historique_30d');
// var btn_historique_1a = document.getElementById('btn_historique_365d');
// //2.pas de temps
// var btn_pas_de_temps_2min = document.getElementById('btn_pas_de_temps_2min');
// var btn_pas_de_temps_qh = document.getElementById('btn_pas_de_temps_qh');
// var btn_pas_de_temps_h = document.getElementById('btn_pas_de_temps_h');
// var btn_pas_de_temps_d = document.getElementById('btn_pas_de_temps_d');
// //3. Mesures (ATTENTION: ici on peut choisir plusieurs polluants -> add_mesure = true)
// var btn_poluant_pm1 = document.getElementById('btn_poluant_pm1');
// var btn_poluant_pm25 = document.getElementById('btn_poluant_pm25');
// var btn_poluant_pm10 = document.getElementById('btn_poluant_pm10');
// var btn_poluant_no2 = document.getElementById('btn_poluant_no2');

// // Selected markers tracking
// var globalSelectedMarker = null;
// var globalSelectedText = null;
// var globalSelectedDeviceId = null;

// // fonction permettant de mettre en forme les lieux
// function formatString(str) {
//     // On remplace les underscores par des espaces
//     let formattedStr = str.replace(/_/g, ' ');

//     // les consonnes
//     const consonants = 'bcdfghjklmnpqrstvwxz';

//     // les voyelles en majuscules
//     const uppercaseVowels = 'AEIOUYÀÁÂÄÆÈÉÊËÌÍÎÏÒÓÔÖŒÙÚÛÜÝ';

//     // Ajout d'une apostrophe entre une consonne et une voyelle en majuscule
//     formattedStr = formattedStr.replace(
//         new RegExp(
//             `([${consonants}${consonants.toUpperCase()}])([${uppercaseVowels}])`,
//             'g'
//         ),
//         "$1'$2"
//     );

//     // Ajout d'une apostrophe entre une consonne et une voyelle en minuscule si pas d'apostrophe précédemment ajoutée
//     formattedStr = formattedStr.replace(/([^'\s-])([A-Z])/g, '$1 $2');

//     formattedStr.trim();
//     return formattedStr;
// }

// // Fonction pour formater les noms du polluants
// function formatPollutantName(name) {
//     if (!name || typeof name !== 'string') {
//         console.warn('formatPollutantName received non-string value:', name);
//         return String(name || '');
//     }

//     return name
//         .replace(/NO2/g, 'NO<sub>2</sub>')
//         .replace(/NOx/g, 'NO<sub>x</sub>')
//         .replace(/SO2/g, 'SO<sub>2</sub>')
//         .replace(/O3/g, 'O<sub>3</sub>')
//         .replace(/CO2/g, 'CO<sub>2</sub>')
//         .replace(/H2S/g, 'H<sub>2</sub>S')
//         .replace(/NH3/g, 'NH<sub>3</sub>');
// }

// /*
// Pour les dropdown:
//   creation d'un bouton
//   avec un nom issu de config.js
//   un classe de "dropdown-item"
// */

// // Function to save array to local storage (erase and save)
// function saveArrayToLocalStorage(key, array) {
//     localStorage.setItem(key, JSON.stringify(array));
// }

// // Function to get array from local storage
// function getArrayFromLocalStorage(key) {
//     const storedArray = localStorage.getItem(key);
//     return storedArray ? JSON.parse(storedArray) : [];
// }

// // Function to add item to local storage array
// function addItemToLocalStorageArray(key, item) {
//     const array = getArrayFromLocalStorage(key);
//     array.push(item);
//     saveArrayToLocalStorage(key, array);
// }

// // Function to remove item from local storage array
// function removeItemFromLocalStorageArray(key, item) {
//     const array = getArrayFromLocalStorage(key);
//     const index = array.indexOf(item);
//     if (index > -1) {
//         array.splice(index, 1);
//         saveArrayToLocalStorage(key, array);
//     }
// }

// // Fonction pour mettre à jour l'affichage de l'heure en fonction du pas de temps sélectionné
// function updateTimeDisplay() {
//     const now = new Date();
//     const horlogeButton = document.getElementById('button_horloge');

//     // Récupère le pas de temps actuellement sélectionné depuis le localStorage
//     const selectedTimeStep = getArrayFromLocalStorage(pas_de_temps_local)[0];

//     let displayText = '';

//     switch (selectedTimeStep) {
//         case 'instantane':
//         case '2min':
//             // Affiche l'heure actuelle pour le pas de temps de 2 minutes
//             displayText = now.toLocaleTimeString('fr-FR', {
//                 hour: '2-digit',
//                 minute: '2-digit',
//             });
//             break;

//         case 'qh':
//             // Affiche le dernier quart d'heure terminé
//             const currentMinutes = now.getMinutes();
//             const lastQuarterHour = new Date(now);

//             // Trouve le dernier quart d'heure complet
//             if (currentMinutes < 15) {
//                 // Si on est dans le premier quart, retourne au dernier quart de l'heure précédente
//                 lastQuarterHour.setHours(
//                     lastQuarterHour.getHours() - 1,
//                     45,
//                     0,
//                     0
//                 );
//             } else if (currentMinutes < 30) {
//                 // Entre 15-29 minutes, le dernier quart était 0-15
//                 lastQuarterHour.setMinutes(0, 0, 0);
//             } else if (currentMinutes < 45) {
//                 // Entre 30-44 minutes, le dernier quart était 15-30
//                 lastQuarterHour.setMinutes(15, 0, 0);
//             } else {
//                 // Entre 45-59 minutes, le dernier quart était 30-45
//                 lastQuarterHour.setMinutes(30, 0, 0);
//             }

//             const endOfLastQuarter = new Date(lastQuarterHour);
//             endOfLastQuarter.setMinutes(lastQuarterHour.getMinutes() + 15);

//             displayText = `${lastQuarterHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endOfLastQuarter.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
//             break;

//         case 'h':
//             // Affiche la dernière heure complète
//             const lastHour = new Date(now);
//             lastHour.setHours(lastHour.getHours() - 1, 0, 0, 0);
//             const nextHour = new Date(lastHour);
//             nextHour.setHours(lastHour.getHours() + 1);

//             displayText = `${lastHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${nextHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
//             break;

//         case 'd':
//             // Affiche uniquement la date d'hier
//             const yesterday = new Date(now);
//             yesterday.setDate(yesterday.getDate() - 1);

//             // Formate avec juste JJ/MM
//             displayText = yesterday.toLocaleDateString('fr-FR', {
//                 day: '2-digit',
//                 month: '2-digit',
//             });
//             break;

//         default:
//             displayText = now.toLocaleTimeString('fr-FR', {
//                 hour: '2-digit',
//                 minute: '2-digit',
//             });
//     }

//     horlogeButton.innerHTML = displayText;
// }
// // Fonction pour actualiser automatiquement les données en fonction du pas de temps sélectionné
// function setupAutoRefresh() {
//     // Efface tout intervalle de rafraîchissement existant
//     if (window.refreshInterval) {
//         clearInterval(window.refreshInterval);
//     }

//     // Récupère le pas de temps actuel depuis le localStorage
//     const selectedTimeStep = getArrayFromLocalStorage(pas_de_temps_local)[0];

//     // Détermine l'intervalle de rafraîchissement en millisecondes selon le pas de temps
//     let refreshIntervalMs;
//     switch (selectedTimeStep) {
//         case 'instantane':
//         case '2min':
//             refreshIntervalMs = 2 * 60 * 1000; // 2 minutes
//             break;
//         case 'qh':
//             refreshIntervalMs = 15 * 60 * 1000; // 15 minutes
//             break;
//         case 'h':
//             refreshIntervalMs = 60 * 60 * 1000; // 1 heure
//             break;
//         case 'd':
//             refreshIntervalMs = 24 * 60 * 60 * 1000; // 1 jour
//             break;
//         default:
//             refreshIntervalMs = 5 * 60 * 1000; // Par défaut 5 minutes
//     }

//     console.log(
//         `Rafraîchissement automatique réglé sur ${refreshIntervalMs / 1000} secondes basé sur le pas de temps '${selectedTimeStep}'`
//     );

//     // Configure l'intervalle pour rafraîchir toutes les sources de données actives
//     window.refreshInterval = setInterval(() => {
//         console.log(
//             '⏰ Rafraîchissement automatique des données selon le pas de temps'
//         );

//         // Stocke l'ID de l'appareil actuellement sélectionné et l'état du panneau avant le rafraîchissement
//         const currentDeviceId = globalSelectedDeviceId;
//         const sidePanelOpen =
//             document.getElementById('side-panel').style.display !== 'none';

//         console.log(
//             'Appareil sélectionné avant rafraîchissement:',
//             currentDeviceId
//         );
//         console.log('Panneau latéral ouvert:', sidePanelOpen);

//         // Stocke les données actuelles de l'appareil si disponibles
//         if (
//             currentDeviceId &&
//             window.deviceMarkers &&
//             window.deviceMarkers[currentDeviceId]
//         ) {
//             window.lastSelectedDeviceData =
//                 window.deviceMarkers[currentDeviceId].data;
//         }

//         // Réinitialise l'objet des marqueurs d'appareils
//         window.deviceMarkers = {};

//         // Réinitialise les références des marqueurs sélectionnés mais garde l'ID de l'appareil
//         globalSelectedMarker = null;
//         globalSelectedText = null;

//         // Récupère toutes les sources actives depuis le localStorage
//         const activeSources = getArrayFromLocalStorage(sources_local);

//         // Rafraîchit chaque source active
//         activeSources.forEach((source) => {
//             clearLayer(source);
//             loadSource(source);
//         });

//         // Met à jour l'affichage de l'heure
//         updateTimeDisplay();

//         // Si un appareil était sélectionné et le panneau latéral ouvert, essaie de le restaurer
//         if (currentDeviceId && sidePanelOpen) {
//             console.log(
//                 "Tentative de restauration de l'appareil sélectionné:",
//                 currentDeviceId
//             );
//             // Utilise un délai pour s'assurer que les couches sont chargées
//             setTimeout(() => {
//                 findAndHighlightMarker(currentDeviceId);
//             }, 1000); // Délai de 1 seconde pour s'assurer que les couches sont complètement chargées
//         }
//     }, refreshIntervalMs);
// }

// // Fonction pour trouver et mettre en évidence un marqueur sur la carte
// function findAndHighlightMarker(deviceId) {
//     console.log(`Tentative de remise en évidence de l'appareil: ${deviceId}`);

//     // On efface d'abord les références globales des marqueurs pour éviter les conflits
//     if (globalSelectedMarker) {
//         if (globalSelectedMarker._icon) {
//             globalSelectedMarker._icon.classList.remove('marker-selected');
//         }
//         globalSelectedMarker.setZIndexOffset(0);
//         globalSelectedMarker = null;
//     }

//     if (globalSelectedText) {
//         if (globalSelectedText._icon) {
//             globalSelectedText._icon.classList.remove('marker-selected');
//         }
//         globalSelectedText.setZIndexOffset(0);
//         globalSelectedText = null;
//     }

//     // On attend que les couches soient complètement chargées
//     setTimeout(() => {
//         let found = false;
//         console.log('Recherche du marqueur avec deviceId:', deviceId);

//         // On convertit deviceId en chaîne de caractères si ce n'est pas déjà fait
//         const deviceIdStr = String(deviceId || '');

//         // On essaie plusieurs méthodes de recherche

//         // Méthode 1: Vérifier si le marqueur est dans la couche nebuleair
//         if (deviceIdStr.indexOf('nebuleair') >= 0) {
//             nebuleair_layer.eachLayer(function (layer) {
//                 // On ignore si ce n'est pas un marqueur ou s'il n'a pas d'icône
//                 if (!layer._icon) return;

//                 // On essaie les deux options pour trouver l'ID de l'appareil
//                 const layerDeviceId =
//                     (layer.options && layer.options.deviceId) || layer.deviceId;

//                 if (layerDeviceId == deviceId) {
//                     console.log('Marqueur NebuleAir trouvé:', layer);

//                     // On cherche le marqueur de texte correspondant
//                     let textMarker = null;
//                     nebuleair_layer.eachLayer(function (textLayer) {
//                         if (!textLayer._icon) return;

//                         const textLayerDeviceId =
//                             (textLayer.options && textLayer.options.deviceId) ||
//                             textLayer.deviceId;

//                         if (
//                             textLayerDeviceId == deviceId &&
//                             textLayer !== layer
//                         ) {
//                             textMarker = textLayer;
//                         }
//                     });

//                     // On applique la mise en évidence
//                     layer.setZIndexOffset(1000);
//                     if (layer._icon)
//                         layer._icon.classList.add('marker-selected');
//                     globalSelectedMarker = layer;

//                     if (textMarker) {
//                         textMarker.setZIndexOffset(1000);
//                         if (textMarker._icon)
//                             textMarker._icon.classList.add('marker-selected');
//                         globalSelectedText = textMarker;
//                     }

//                     found = true;

//                     // On réouvre le panneau latéral si nécessaire
//                     if (
//                         document.getElementById('side-panel').style.display ===
//                             'none' &&
//                         layer.deviceData
//                     ) {
//                         openSidePanel_nebuleAir(
//                             layer.deviceData,
//                             getArrayFromLocalStorage(pas_de_temps_local)[0],
//                             '24h',
//                             getArrayFromLocalStorage(mesures_local)[0]
//                         );
//                     }

//                     return false;
//                 }
//             });
//         }
//         // Méthode 2: Vérifier si le marqueur est dans la couche atmo_micro
//         else {
//             atmo_micro_layer.eachLayer(function (layer) {
//                 // On ignore si ce n'est pas un marqueur ou s'il n'a pas d'icône
//                 if (!layer._icon) return;

//                 // On essaie les deux options pour trouver l'ID de l'appareil
//                 const layerDeviceId =
//                     (layer.options && layer.options.deviceId) || layer.deviceId;

//                 if (layerDeviceId == deviceId) {
//                     console.log('Marqueur AtmoSud trouvé:', layer);

//                     // On cherche le marqueur de texte correspondant
//                     let textMarker = null;
//                     atmo_micro_layer.eachLayer(function (textLayer) {
//                         if (!textLayer._icon) return;

//                         const textLayerDeviceId =
//                             (textLayer.options && textLayer.options.deviceId) ||
//                             textLayer.deviceId;

//                         if (
//                             textLayerDeviceId == deviceId &&
//                             textLayer !== layer
//                         ) {
//                             textMarker = textLayer;
//                         }
//                     });

//                     // On applique la mise en évidence
//                     layer.setZIndexOffset(1000);
//                     if (layer._icon)
//                         layer._icon.classList.add('marker-selected');
//                     globalSelectedMarker = layer;

//                     if (textMarker) {
//                         textMarker.setZIndexOffset(1000);
//                         if (textMarker._icon)
//                             textMarker._icon.classList.add('marker-selected');
//                         globalSelectedText = textMarker;
//                     }

//                     found = true;

//                     // On réouvre le panneau latéral si nécessaire
//                     if (
//                         document.getElementById('side-panel').style.display ===
//                             'none' &&
//                         layer.deviceData
//                     ) {
//                         // On récupère le pas de temps actuel et on le convertit pour AtmoSud
//                         var pas_de_temps =
//                             getArrayFromLocalStorage(pas_de_temps_local)[0];
//                         var pas_de_temps_atmo = '';
//                         switch (pas_de_temps) {
//                             case '2min':
//                                 pas_de_temps_atmo = 'brute';
//                                 break;
//                             case 'qh':
//                                 pas_de_temps_atmo = 'quart-horaire';
//                                 break;
//                             case 'h':
//                                 pas_de_temps_atmo = 'horaire';
//                                 break;
//                             case 'd':
//                                 pas_de_temps_atmo = 'journalier';
//                                 break;
//                         }

//                         // On récupère les mesures actuelles et on les convertit pour AtmoSud si nécessaire
//                         var mesures =
//                             getArrayFromLocalStorage(mesures_local)[0];
//                         var mesures_atmo = mesures;
//                         if (mesures === 'pm25') {
//                             mesures_atmo = 'pm2.5';
//                         }

//                         openSidePanel_microStation(
//                             layer.deviceData,
//                             pas_de_temps_atmo,
//                             '24h',
//                             mesures_atmo
//                         );
//                     }

//                     return false;
//                 }
//             });
//         }

//         // Si on n'a pas trouvé le marqueur, on essaie d'autres méthodes
//         if (!found) {
//             console.warn(
//                 `Impossible de trouver le marqueur pour l'appareil: ${deviceId}`
//             );

//             // Méthode 3: On essaie d'utiliser les données stockées de l'appareil
//             if (window.lastSelectedDeviceData) {
//                 console.log(
//                     'Réouverture du panneau latéral avec les données stockées'
//                 );

//                 if (deviceIdStr.indexOf('nebuleair') >= 0) {
//                     openSidePanel_nebuleAir(
//                         window.lastSelectedDeviceData,
//                         getArrayFromLocalStorage(pas_de_temps_local)[0],
//                         '24h',
//                         getArrayFromLocalStorage(mesures_local)[0]
//                     );
//                 } else {
//                     // Pour les microStations AtmoSud
//                     var pas_de_temps =
//                         getArrayFromLocalStorage(pas_de_temps_local)[0];
//                     var pas_de_temps_atmo = '';
//                     switch (pas_de_temps) {
//                         case '2min':
//                             pas_de_temps_atmo = 'brute';
//                             break;
//                         case 'qh':
//                             pas_de_temps_atmo = 'quart-horaire';
//                             break;
//                         case 'h':
//                             pas_de_temps_atmo = 'horaire';
//                             break;
//                         case 'd':
//                             pas_de_temps_atmo = 'journalier';
//                             break;
//                     }

//                     // On récupère les mesures et on les convertit pour AtmoSud si nécessaire
//                     var mesures = getArrayFromLocalStorage(mesures_local)[0];
//                     var mesures_atmo = mesures;
//                     if (mesures === 'pm25') {
//                         mesures_atmo = 'pm2.5';
//                     }

//                     openSidePanel_microStation(
//                         window.lastSelectedDeviceData,
//                         pas_de_temps_atmo,
//                         '24h',
//                         mesures_atmo
//                     );
//                 }
//             }
//         }
//     }, 1000);
// }

// // Fonction pour mettre à jour les boutons de seuil en fonction du polluant sélectionné
// function updateThresholdButtons() {
//     // On récupère le polluant actuellement sélectionné
//     const selectedPollutant = getArrayFromLocalStorage(mesures_local)[0];

//     // On détermine quel ensemble de seuils utiliser
//     const thresholds = getThresholdsForPollutant(selectedPollutant);

//     // On met à jour l'info-bulle de chaque bouton avec la plage appropriée
//     document
//         .getElementById('btn_bon')
//         .setAttribute(
//             'data-bs-title',
//             `${thresholds.bon.min} à ${thresholds.bon.max} µg/m³`
//         );

//     document
//         .getElementById('btn_moyen')
//         .setAttribute(
//             'data-bs-title',
//             `${thresholds.moyen.min} à ${thresholds.moyen.max} µg/m³`
//         );

//     document
//         .getElementById('btn_degrade')
//         .setAttribute(
//             'data-bs-title',
//             `${thresholds.degrade.min} à ${thresholds.degrade.max} µg/m³`
//         );

//     document
//         .getElementById('btn_mauvais')
//         .setAttribute(
//             'data-bs-title',
//             `${thresholds.mauvais.min} à ${thresholds.mauvais.max} µg/m³`
//         );

//     document
//         .getElementById('btn_tres_mauvais')
//         .setAttribute(
//             'data-bs-title',
//             `${thresholds.tres_mauvais.min} à ${thresholds.tres_mauvais.max} µg/m³`
//         );

//     document
//         .getElementById('btn_extr_mauvais')
//         .setAttribute('data-bs-title', `>${thresholds.extr_mauvais.min} µg/m³`);

//     // On réinitialise les info-bulles pour les mettre à jour
//     const tooltipTriggerList = document.querySelectorAll(
//         '[data-bs-toggle="tooltip"]'
//     );
//     [...tooltipTriggerList].map((tooltipTriggerEl) => {
//         // On supprime toute info-bulle existante
//         const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
//         if (tooltip) {
//             tooltip.dispose();
//         }
//         // On crée une nouvelle info-bulle
//         return new bootstrap.Tooltip(tooltipTriggerEl);
//     });
// }

// // Fonction auxiliaire pour obtenir l'ensemble de seuils approprié pour un polluant
// function getThresholdsForPollutant(pollutant) {
//     if (pollutant === 'pm10') {
//         return seuils_PM10;
//     } else if (pollutant === 'no2') {
//         return seuils_NO2_24h;
//     } else {
//         // Par défaut pour PM1 et PM2.5
//         return seuils_PM1_PM25;
//     }
// }

// // Fonction pour obtenir le code couleur en fonction de la valeur et du polluant
// function getColorCodeForValue(value, pollutant) {
//     const thresholds = getThresholdsForPollutant(pollutant);

//     let colorCode = 'default';

//     // On arrondit la valeur pour assurer une comparaison cohérente
//     const roundedValue = Math.round(parseFloat(value));

//     // On vérifie chaque plage de seuils
//     for (let key in thresholds) {
//         const min = thresholds[key].min;
//         const max = thresholds[key].max;

//         if (roundedValue >= min && roundedValue <= max) {
//             colorCode = thresholds[key].code;
//             break;
//         }
//     }

//     return colorCode;
// }

// // On initialise l'horloge au chargement de la page
// document.addEventListener('DOMContentLoaded', function () {
//     updateTimeDisplay();
//     // On met à jour l'horloge toutes les minutes
//     setInterval(updateTimeDisplay, 60000);

//     // On configure le rafraîchissement automatique des données
//     setupAutoRefresh();

//     // On initialise les boutons de seuil en fonction du polluant sélectionné
//     updateThresholdButtons();
// });

// //vérifier si un élément est dans un js object
// function isValueInObject(obj, value) {
//     for (let key in obj) {
//         if (obj.hasOwnProperty(key)) {
//             if (obj[key] === value) {
//                 //console.log(`Value "${value}" is present in the object.`);
//                 return true;
//             }
//         }
//     }
//     //console.log(`Value "${value}" is not present in the object.`);
//     return false;
// }

// function isEmptyObject(obj) {
//     return Object.keys(obj).length === 0;
// }

// //MESURES dropdown list (attention seul un élément peut etre coché)
// // Boucle pour créer les boutons de mesures dans le menu déroulant
// for (let key in mesures) {
//     if (mesures.hasOwnProperty(key)) {
//         let button = document.createElement('button');
//         let name = mesures[key].name;
//         let code = mesures[key].code;
//         let activated = mesures[key].activated;
//         button.innerHTML = name;
//         button.classList.add('dropdown-item');
//         // Si le stockage local est vide, on sauvegarde la configuration initiale
//         if (isEmptyObject(getArrayFromLocalStorage(mesures_local))) {
//             if (activated) {
//                 addItemToLocalStorageArray(mesures_local, code);
//             }
//         }
//         // On vérifie si le code est déjà dans le stockage local
//         let check_array = getArrayFromLocalStorage(mesures_local);
//         if (isValueInObject(check_array, code)) {
//             button.classList.add('active');
//         }
//         // Action quand on clique sur le bouton
//         button.onclick = function () {
//             let check_array = getArrayFromLocalStorage(mesures_local);
//             if (isValueInObject(check_array, code)) {
//                 console.warn('on ne peut pas decocher');
//             } else {
//                 // On supprime les autres sélections
//                 localStorage.removeItem(mesures_local);
//                 let listItems = document.querySelectorAll(
//                     '#dropdown_mesures li'
//                 );
//                 listItems.forEach((li) => {
//                     let buttons = li.querySelectorAll('button');
//                     buttons.forEach((button) => {
//                         button.classList.remove('active');
//                     });
//                 });
//                 // On active le nouveau choix
//                 addItemToLocalStorageArray(mesures_local, code);
//                 button.classList.add('active');
//                 // Mise à jour du texte du bouton principal
//                 document
//                     .querySelector('#dropdown_mesures')
//                     .closest('.dropdown')
//                     .querySelector('.selected-option').innerHTML = name;

//                 updateThresholdButtons();

//                 // Rechargement des données
//                 console.log(
//                     'Changement du type de mesure: ' +
//                         getArrayFromLocalStorage(mesures_local)
//                 );
//                 console.log(
//                     'Necessite le renouvellement de: ' +
//                         getArrayFromLocalStorage(sources_local)
//                 );
//                 // On met à jour chaque source active
//                 for (let item of getArrayFromLocalStorage(sources_local)) {
//                     clearLayer(code);
//                     loadSource(item);
//                 }
//             }
//         };
//         let li = document.createElement('li');
//         li.appendChild(button);
//         dropdown_mesures.appendChild(li);
//     }
// }

// // Boucle pour créer les boutons des sources de données
// for (let key in sources) {
//     if (sources.hasOwnProperty(key)) {
//         let button = document.createElement('button');
//         let name = sources[key].name;
//         let code = sources[key].code;
//         let activated = sources[key].activated;
//         button.innerHTML = name;
//         button.classList.add('dropdown-item');
//         // Configuration initiale du stockage local
//         if (isEmptyObject(getArrayFromLocalStorage(sources_local))) {
//             if (activated) {
//                 addItemToLocalStorageArray(sources_local, code);
//             }
//         }
//         // Vérification si la source est déjà active
//         let check_array = getArrayFromLocalStorage(sources_local);
//         if (isValueInObject(check_array, code)) {
//             button.classList.add('active');
//         }
//         // Action lors du clic sur une source
//         button.onclick = function () {
//             let check_array = getArrayFromLocalStorage(sources_local);
//             if (isValueInObject(check_array, code)) {
//                 button.classList.remove('active');
//                 removeItemFromLocalStorageArray(sources_local, code);
//                 clearLayer(code);
//             } else {
//                 addItemToLocalStorageArray(sources_local, code);
//                 button.classList.add('active');
//                 loadSource(code);
//             }
//         };
//         let li = document.createElement('li');
//         li.appendChild(button);
//         dropdown_sources.appendChild(li);
//     }
// }

// // Boucle pour créer les boutons des pas de temps
// for (let key in pas_de_temps) {
//     if (pas_de_temps.hasOwnProperty(key)) {
//         let button = document.createElement('button');
//         let name = pas_de_temps[key].name;
//         let code = pas_de_temps[key].code;
//         let activated = pas_de_temps[key].activated;
//         button.innerHTML = name;
//         button.classList.add('dropdown-item');
//         // Configuration initiale du stockage local
//         if (isEmptyObject(getArrayFromLocalStorage(pas_de_temps_local))) {
//             if (activated) {
//                 addItemToLocalStorageArray(pas_de_temps_local, code);
//             }
//         }
//         // Vérification si le pas de temps est déjà actif
//         let check_array = getArrayFromLocalStorage(pas_de_temps_local);
//         if (isValueInObject(check_array, code)) {
//             button.classList.add('active');
//         }

//         button.onclick = function () {
//             let check_array = getArrayFromLocalStorage(pas_de_temps_local);
//             if (isValueInObject(check_array, code)) {
//                 console.warn('on ne peut pas decocher');
//             } else {
//                 // Suppression des autres sélections
//                 localStorage.removeItem(pas_de_temps_local);
//                 let listItems = document.querySelectorAll(
//                     '#dropdown_pas_de_temps li'
//                 );
//                 listItems.forEach((li) => {
//                     let buttons = li.querySelectorAll('button');
//                     buttons.forEach((button) => {
//                         button.classList.remove('active');
//                     });
//                 });
//                 // Activation du nouveau pas de temps
//                 addItemToLocalStorageArray(pas_de_temps_local, code);
//                 button.classList.add('active');
//                 // Mise à jour du texte du bouton principal
//                 document
//                     .querySelector('#dropdown_pas_de_temps')
//                     .closest('.dropdown')
//                     .querySelector('.selected-option').innerHTML = name;

//                 // Mise à jour des données
//                 console.log(
//                     'Changement du pas de temps: ' +
//                         getArrayFromLocalStorage(pas_de_temps_local)
//                 );
//                 console.log(
//                     'Necessite le renouvellement de: ' +
//                         getArrayFromLocalStorage(sources_local)
//                 );
//                 // Actualisation de chaque source active
//                 for (let item of getArrayFromLocalStorage(sources_local)) {
//                     clearLayer(code);
//                     loadSource(item);
//                 }
//                 updateTimeDisplay();
//                 setupAutoRefresh();
//             }
//         };

//         let li = document.createElement('li');
//         li.appendChild(button);
//         dropdown_pas_de_temps.appendChild(li);
//     }
// }
// //Chargement des sources depuis un bouton
// function loadSource(source) {
//     console.log('Loading data for ' + source);
//     switch (source) {
//         case 'nebuleair':
//             loadNebuleAir();
//             break;
//         case 'sensor_commmunity':
//             loadSensorCommunity();
//             break;
//         case 'purpleair':
//             loadSensorCommunity();
//             break;
//         case 'atmo_micro':
//             load_atmoSud_microStations();
//             break;
//         case 'atmo_ref':
//             load_atmoSud_stationsRef();
//             break;
//         case 'mod_pm':
//             loadModPM();
//             break;
//         case 'icairh':
//             loadicairh();
//             break;
//         case 'vents':
//             loadVents();
//             break;
//         case 'signalair':
//             loadSignalAir();
//             break;
//         case 'mobileair':
//             loadMobileAir();
//             break;
//     }
// }

// //Enlever les layers lorsque l'on change de pas de temps ou de source
// function clearLayer(source) {
//     console.log('Clearing layer  for ' + source);
//     switch (source) {
//         case 'nebuleair':
//             nebuleair_layer.clearLayers();
//             break;
//         case 'sensor_commmunity':
//             sensor_commmunity_layer.clearLayers();
//             break;
//         case 'purpleair':
//             purpleair_layer.clearLayers();
//             break;
//         case 'atmo_micro':
//             atmo_micro_layer.clearLayers();
//             break;
//         case 'atmo_ref':
//             atmo_ref_layer.clearLayers();
//             break;
//         case 'mod_pm':
//             modelisationPMAtmoSud_layer.clearLayers();
//             break;
//         case 'icairh':
//             modelisationICAIRAtmoSud_layer.clearLayers();
//             break;
//         case 'vents':
//             map.clearLayers();
//             break;
//         case 'signalair':
//             signalair_layer.clearLayers();
//             break;
//         case 'mobileair':
//             mobileair_layer.clearLayers();
//             break;
//     }
// }

// //chargement des sources depuis la mémoire locale (au démarrage de l'appli)
// for (let key in sources) {
//     let code = sources[key].code;
//     //on vérifie le local storage (object) pour voir si l'élément est déjà présent
//     let check_array = getArrayFromLocalStorage(sources_local);
//     if (isValueInObject(check_array, code)) {
//         loadSource(code);
//     }
// }

// //actualisation des sources toutes les minutes
// //TEST AVEC MOBILEAIR
// function reload_layers(source) {
//     console.log('⏰ Reloading layers');
//     clearLayer('mobileair');
//     //get the new data
//     loadSource('mobileair');
// }

// setInterval(reload_layers, 9990000); //60000 -> 1min

// //OPEN SIDE PANEL
// /*
// Sur un grand écran on veut un side panel moins large (col-lg)
// que sur un petit écran (col) sinon il est trop fin
// */
// function openSidePanel_generic() {
//     //console.log("openSidePane_generic");
//     //side panel
//     // sur smartphone -> toute la place (col-12)
//     // sur ordi petit (sm) -> 6 colonnes
//     // sur grand écran (lg) -> 5 colonnes
//     sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
//     sidePanel.style.display = 'block';
//     //map
//     // sur smartphone -> disparait (col-0)
//     // sur ordi petit (sm) -> 6 colonnes
//     // sur grand écran (lg) -> 7 colonnes
//     mapContainer.classList.remove('col-12');
//     mapContainer.classList.add('d-none', 'd-sm-block', 'col-sm-6', 'col-lg-7');
//     mapContainer.style.paddingLeft = '10px';
// }

// function openSidePanel_signalair(data, nuisance_type) {
//     console.log('Opening side panel for SignalAir');
//     card1_img.src = 'img/signalair/logoSignalAir.png';
//     card1_title.innerHTML = 'Nuisance: ' + nuisance_type;
//     card1_text.innerHTML = `
//     Ville:   ${data['city']} </br>
//     <table class="table">
//       <tbody>
//         <tr>
//           <td>Niveau de gêne</td>
//           <td>${data['niveau-de-gene']}</td>
//         </tr>
//         <tr>
//           <td>Symptômes déclarés</td>
//           <td>${data['si-oui-quels-symptomes']}</td>
//         </tr>
//         <tr>
//           <td>Origine de la nuisance</td>
//           <td>${data['origine-de-la-nuisance']} ${data['description-de-lorigine-de-la-nuisance']}</td>
//         </tr>
//         <tr>
//           <td>Durée de la nuisance</td>
//           <td>${data['duree-de-la-nuisance']}</td>
//         </tr>
//         <tr>
//         <td>Commentaires</td>
//         <td>${data['remarque-commentaire']}</td>
//       </tr>
//       </tbody>
//     </table>
//     <a href="https://www.signalair.eu/fr/" target="_blank" class="btn btn-primary" id="card1_button">Faire un signalement</a>

//      `;

//     openSidePanel_generic();
// }

// //CLOSE SIDE PANEL
// function closeSidePanel() {
//     console.log('Closing side panel');
//     sidePanel.classList.remove('col-2', 'col-sm-4', 'col-lg-3');
//     sidePanel.style.display = 'none';
//     mapContainer.classList.remove('col-8', 'col-lg-9');
//     mapContainer.classList.add('col-12');
//     mapContainer.style.paddingLeft = '30px';
// }

// //Leaflet Map obj creation
// let coordsCenter = config.coordsCenter;
// let zoomLevel = config.zoomLevel;

// let map = L.map('map', {
//     //zoomControl: isMobile == true ? false : true,
//     minZoom: config.minZoom,
//     maxZoom: config.maxZoom,
//     renderer: L.canvas(),
//     maxBounds: L.latLngBounds(config.boundNE, config.boundSW),
// });

// L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
//     attribution:
//         '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
// }).addTo(map);

// // Ajout d'un écouteur d'événement sur le bouton pour ouvrir/fermer le panneau latéral
// document
//     .getElementById('toggleSidePanel')
//     .addEventListener('click', function () {
//         const sidePanel = document.getElementById('side-panel');
//         const mapContainer = document.getElementById('map-container');
//         const icon = this.querySelector('i');

//         if (sidePanel.style.display === 'none') {
//             // Ouverture du panneau latéral : on ajoute les classes nécessaires pour l'affichage
//             sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
//             sidePanel.style.display = 'block';
//             document.body.classList.add('side-panel-open');
//             mapContainer.classList.remove('col-12');
//             mapContainer.classList.add(
//                 'd-none',
//                 'd-sm-block',
//                 'col-sm-6',
//                 'col-lg-7'
//             );
//             icon.classList.replace('bi-chevron-right', 'bi-chevron-left');
//         } else {
//             // Fermeture du panneau latéral : on retire les classes et on cache le panneau
//             sidePanel.classList.remove('col-12', 'col-sm-6', 'col-lg-5');
//             sidePanel.style.display = 'none';
//             document.body.classList.remove('side-panel-open');
//             mapContainer.classList.remove(
//                 'd-none',
//                 'd-sm-block',
//                 'col-sm-6',
//                 'col-lg-7'
//             );
//             mapContainer.classList.add('col-12');
//             icon.classList.replace('bi-chevron-left', 'bi-chevron-right');
//         }

//         // On force la mise à jour de la taille de la carte
//         map.invalidateSize();
//     });

// // Ajout d'un écouteur d'événement sur le bouton de fermeture mobile
// document
//     .getElementById('closeSidePanelMobile')
//     .addEventListener('click', function () {
//         const sidePanel = document.getElementById('side-panel');
//         const mapContainer = document.getElementById('map-container');
//         const toggleButton = document.getElementById('toggleSidePanel');
//         const toggleIcon = toggleButton.querySelector('i');

//         // Fermeture du panneau latéral sur mobile : même logique que la fermeture normale
//         sidePanel.classList.remove('col-12', 'col-sm-6', 'col-lg-5');
//         sidePanel.style.display = 'none';
//         document.body.classList.remove('side-panel-open');
//         mapContainer.classList.remove(
//             'd-none',
//             'd-sm-block',
//             'col-sm-6',
//             'col-lg-7'
//         );
//         mapContainer.classList.add('col-12');
//         toggleIcon.classList.replace('bi-chevron-left', 'bi-chevron-right');

//         // On force la mise à jour de la taille de la carte
//         map.invalidateSize();
//     });
// // Initialisation du conteneur device-info
// const deviceInfo = L.control({ position: 'bottomright' });

// deviceInfo.onAdd = function () {
//     this._div = L.DomUtil.create('div', 'device-info');
//     // Structure minimale qui sera remplacée
//     this._div.innerHTML = '<div></div>';
//     this._div.style.display = 'none';
//     return this._div;
// };

// deviceInfo.addTo(map);

// //Location et Zoom par défaut récupéré dans config.js
// //si existe dans Local Storage alors prends les variables en local
// if ('Lat' in localStorage) {
//     let coordsCenter_local_lat = localStorage.getItem('Lat');
//     let coordsCenter_local_long = localStorage.getItem('Long');
//     let zoomLevel_local = localStorage.getItem('Zoom');
//     map.setView(
//         [coordsCenter_local_lat, coordsCenter_local_long],
//         zoomLevel_local
//     );
// } else {
//     map.setView(coordsCenter, zoomLevel);
// }

// // on set l'affichage des boutons de choix de pas de temps et de mesures
// const storedTimeStep = getArrayFromLocalStorage('pas_de_temps_local')[0];
// const timeStepName =
//     pas_de_temps[
//         Object.keys(pas_de_temps).find(
//             (key) => pas_de_temps[key].code === storedTimeStep
//         )
//     ].name;
// document
//     .querySelector('#dropdown_pas_de_temps')
//     .closest('.dropdown')
//     .querySelector('.selected-option').innerHTML = timeStepName;
// const storedMesure = getArrayFromLocalStorage('mesures_local')[0];
// const mesureName =
//     mesures[
//         Object.keys(mesures).find((key) => mesures[key].code === storedMesure)
//     ].name;
// document
//     .querySelector('#dropdown_mesures')
//     .closest('.dropdown')
//     .querySelector('.selected-option').innerHTML = mesureName;

// // Dès que l'on bouge la cart on enregistre LAT/LONG/ZOOM
// map.on('moveend', function () {
//     // Get the map's center coordinates
//     var center = map.getCenter();
//     var currentZoom = map.getZoom();
//     var lat = center.lat;
//     var lng = center.lng;
//     saveArrayToLocalStorage('Lat', lat);
//     saveArrayToLocalStorage('Long', lng);
//     saveArrayToLocalStorage('Zoom', currentZoom);
// });

// Importations des modules
import {
    loadAtmoSudMicroStations,
    openSidePanelMicroStation,
    retreiveHistoriqueDataMicroStation, // Utilisez le nom exact tel qu'exporté
} from './js/atmosud-micro-stations.js';

console.log('OpenAirMap V2');

// Récupérer la date et l'heure (client side!)
const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
const day = now.getDate().toString().padStart(2, '0');

const hours = now.getHours().toString().padStart(2, '0');
const minutes = now.getMinutes().toString().padStart(2, '0');
const seconds = now.getSeconds().toString().padStart(2, '0');

const dateYMD = year + '-' + month + '-' + day;
const dateYDM = year + '-' + day + '-' + month;
const formattedTime = hours + ':' + minutes + ':' + seconds;

console.log('Date: ' + dateYMD);
console.log('Time: ' + formattedTime);

// Amcharts chart
let amchartRoot;

// Variables pour les layers leaflet
const nebuleairLayer = new L.layerGroup();
const sensorCommmuityLayer = new L.layerGroup();
const purpleairLayer = new L.layerGroup();
const atmoMicroLayer = new L.layerGroup();
const atmoRefLayer = new L.layerGroup();
const modelisationPMAtmoSudLayer = new L.layerGroup();
const modelisationICAIRAtmoSudLayer = new L.layerGroup();
const signalairLayer = new L.layerGroup();
const mobileairLayer = new L.layerGroup();

// Variables pour le DOM
const sidePanel = document.getElementById('side-panel');
const card1 = document.getElementById('card1');
const card1Body = document.getElementById('card1_body');
const card1Img = document.getElementById('card1_img');
const card1Title = document.getElementById('card1_title');
const card1Text = document.getElementById('card1_text');
const card1Button = document.getElementById('card1_button');
const card2 = document.getElementById('card2');
const card2Title = document.getElementById('card2_title');
const card2Text = document.getElementById('card2_text');
const card2Button = document.getElementById('card2_button');

const mapContainer = document.getElementById('map-container');
const dropdownMesures = document.getElementById('dropdown_mesures');
const dropdownSources = document.getElementById('dropdown_sources');
const dropdownPasDeTemps = document.getElementById('dropdown_pas_de_temps');
const MESURES_LOCAL = 'mesures_local';
const SOURCES_LOCAL = 'sources_local';
const PAS_DE_TEMPS_LOCAL = 'pas_de_temps_local';

// 1.historique
const btnHistoriqueCustom = document.getElementById('apply_date_range');
const btnHistoriqueStartDate = document.getElementById('start_date');
const btnHistoriqueStartTime = document.getElementById('start_time');
const btnHistoriqueEndDate = document.getElementById('end_date');
const btnHistoriqueEndTime = document.getElementById('end_time');
const btnHistorique1h = document.getElementById('btn_historique_1h');
const btnHistorique3h = document.getElementById('btn_historique_3h');
const btnHistorique24h = document.getElementById('btn_historique_24h');
const btnHistorique1sem = document.getElementById('btn_historique_7d');
const btnHistorique1m = document.getElementById('btn_historique_30d');
const btnHistorique1a = document.getElementById('btn_historique_365d');
// 2.pas de temps
const btnPasDeTemps2min = document.getElementById('btn_pas_de_temps_2min');
const btnPasDeTempsQh = document.getElementById('btn_pas_de_temps_qh');
const btnPasDeTempsH = document.getElementById('btn_pas_de_temps_h');
const btnPasDeTempsD = document.getElementById('btn_pas_de_temps_d');
// 3. Mesures (ATTENTION: ici on peut choisir plusieurs polluants -> add_mesure = true)
const btnPoluantPm1 = document.getElementById('btn_poluant_pm1');
const btnPoluantPm25 = document.getElementById('btn_poluant_pm25');
const btnPoluantPm10 = document.getElementById('btn_poluant_pm10');
const btnPoluantNo2 = document.getElementById('btn_poluant_no2');

const pasDeTemps = {
    brute: { name: '2 minutes', code: '2min', activated: true },
    'quart-horaire': { name: 'Quart-horaire', code: 'qh', activated: false },
    horaire: { name: 'Horaire', code: 'h', activated: false },
    journalier: { name: 'Journalier', code: 'd', activated: false },
};

// Selected markers tracking
let globalSelectedMarker = null;
let globalSelectedText = null;
let globalSelectedDeviceId = null;

// Fonction permettant de mettre en forme les lieux
function formatString(str) {
    // On remplace les underscores par des espaces
    let formattedStr = str.replace(/_/g, ' ');

    // les consonnes
    const consonants = 'bcdfghjklmnpqrstvwxz';

    // les voyelles en majuscules
    const uppercaseVowels = 'AEIOUYÀÁÂÄÆÈÉÊËÌÍÎÏÒÓÔÖŒÙÚÛÜÝ';

    // Ajout d'une apostrophe entre une consonne et une voyelle en majuscule
    formattedStr = formattedStr.replace(
        new RegExp(
            `([${consonants}${consonants.toUpperCase()}])([${uppercaseVowels}])`,
            'g'
        ),
        "$1'$2"
    );

    // Ajout d'une apostrophe entre une consonne et une voyelle en minuscule si pas d'apostrophe précédemment ajoutée
    formattedStr = formattedStr.replace(/([^'\s-])([A-Z])/g, '$1 $2');

    formattedStr.trim();
    return formattedStr;
}

// Fonction pour formater les noms du polluants
function formatPollutantName(name) {
    if (!name || typeof name !== 'string') {
        console.warn('formatPollutantName received non-string value:', name);
        return String(name || '');
    }

    return name
        .replace(/NO2/g, 'NO<sub>2</sub>')
        .replace(/NOx/g, 'NO<sub>x</sub>')
        .replace(/SO2/g, 'SO<sub>2</sub>')
        .replace(/O3/g, 'O<sub>3</sub>')
        .replace(/CO2/g, 'CO<sub>2</sub>')
        .replace(/H2S/g, 'H<sub>2</sub>S')
        .replace(/NH3/g, 'NH<sub>3</sub>');
}

// Function to save array to local storage (erase and save)
function saveArrayToLocalStorage(key, array) {
    localStorage.setItem(key, JSON.stringify(array));
}

// Function to get array from local storage
function getArrayFromLocalStorage(key) {
    console.log(key);
    const storedArray = localStorage.getItem(key);
    return storedArray ? JSON.parse(storedArray) : [];
}

// Function to add item to local storage array
function addItemToLocalStorageArray(key, item) {
    const array = getArrayFromLocalStorage(key);
    array.push(item);
    saveArrayToLocalStorage(key, array);
}

// Function to remove item from local storage array
function removeItemFromLocalStorageArray(key, item) {
    const array = getArrayFromLocalStorage(key);
    const index = array.indexOf(item);
    if (index > -1) {
        array.splice(index, 1);
        saveArrayToLocalStorage(key, array);
    }
}

// Fonction pour mettre à jour l'affichage de l'heure en fonction du pas de temps sélectionné
function updateTimeDisplay() {
    const now = new Date();
    const horlogeButton = document.getElementById('button_horloge');

    // Récupère le pas de temps actuellement sélectionné depuis le localStorage
    const selectedTimeStep = getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL)[0];

    let displayText = '';

    switch (selectedTimeStep) {
        case 'instantane':
        case '2min':
            // Affiche l'heure actuelle pour le pas de temps de 2 minutes
            displayText = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
            break;

        case 'qh':
            // Affiche le dernier quart d'heure terminé
            const currentMinutes = now.getMinutes();
            const lastQuarterHour = new Date(now);

            // Trouve le dernier quart d'heure complet
            if (currentMinutes < 15) {
                // Si on est dans le premier quart, retourne au dernier quart de l'heure précédente
                lastQuarterHour.setHours(
                    lastQuarterHour.getHours() - 1,
                    45,
                    0,
                    0
                );
            } else if (currentMinutes < 30) {
                // Entre 15-29 minutes, le dernier quart était 0-15
                lastQuarterHour.setMinutes(0, 0, 0);
            } else if (currentMinutes < 45) {
                // Entre 30-44 minutes, le dernier quart était 15-30
                lastQuarterHour.setMinutes(15, 0, 0);
            } else {
                // Entre 45-59 minutes, le dernier quart était 30-45
                lastQuarterHour.setMinutes(30, 0, 0);
            }

            const endOfLastQuarter = new Date(lastQuarterHour);
            endOfLastQuarter.setMinutes(lastQuarterHour.getMinutes() + 15);

            displayText = `${lastQuarterHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endOfLastQuarter.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            break;

        case 'h':
            // Affiche la dernière heure complète
            const lastHour = new Date(now);
            lastHour.setHours(lastHour.getHours() - 1, 0, 0, 0);
            const nextHour = new Date(lastHour);
            nextHour.setHours(lastHour.getHours() + 1);

            displayText = `${lastHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${nextHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            break;

        case 'd':
            // Affiche uniquement la date d'hier
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            // Formate avec juste JJ/MM
            displayText = yesterday.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
            });
            break;

        default:
            displayText = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
    }

    horlogeButton.innerHTML = displayText;
}

// Fonction pour actualiser automatiquement les données en fonction du pas de temps sélectionné
function setupAutoRefresh() {
    // Efface tout intervalle de rafraîchissement existant
    if (window.refreshInterval) {
        clearInterval(window.refreshInterval);
    }

    // Récupère le pas de temps actuel depuis le localStorage
    const selectedTimeStep = getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL)[0];

    // Détermine l'intervalle de rafraîchissement en millisecondes selon le pas de temps
    let refreshIntervalMs;
    switch (selectedTimeStep) {
        case 'instantane':
        case '2min':
            refreshIntervalMs = 2 * 60 * 1000; // 2 minutes
            break;
        case 'qh':
            refreshIntervalMs = 15 * 60 * 1000; // 15 minutes
            break;
        case 'h':
            refreshIntervalMs = 60 * 60 * 1000; // 1 heure
            break;
        case 'd':
            refreshIntervalMs = 24 * 60 * 60 * 1000; // 1 jour
            break;
        default:
            refreshIntervalMs = 5 * 60 * 1000; // Par défaut 5 minutes
    }

    console.log(
        `Rafraîchissement automatique réglé sur ${refreshIntervalMs / 1000} secondes basé sur le pas de temps '${selectedTimeStep}'`
    );

    // Configure l'intervalle pour rafraîchir toutes les sources de données actives
    window.refreshInterval = setInterval(() => {
        console.log(
            '⏰ Rafraîchissement automatique des données selon le pas de temps'
        );

        // Stocke l'ID de l'appareil actuellement sélectionné et l'état du panneau avant le rafraîchissement
        const currentDeviceId = globalSelectedDeviceId;
        const sidePanelOpen =
            document.getElementById('side-panel').style.display !== 'none';

        console.log(
            'Appareil sélectionné avant rafraîchissement:',
            currentDeviceId
        );
        console.log('Panneau latéral ouvert:', sidePanelOpen);

        // Stocke les données actuelles de l'appareil si disponibles
        if (
            currentDeviceId &&
            window.deviceMarkers &&
            window.deviceMarkers[currentDeviceId]
        ) {
            window.lastSelectedDeviceData =
                window.deviceMarkers[currentDeviceId].data;
        }

        // Réinitialise l'objet des marqueurs d'appareils
        window.deviceMarkers = {};

        // Réinitialise les références des marqueurs sélectionnés mais garde l'ID de l'appareil
        globalSelectedMarker = null;
        globalSelectedText = null;

        // Récupère toutes les sources actives depuis le localStorage
        const activeSources = getArrayFromLocalStorage(SOURCES_LOCAL);

        // Rafraîchit chaque source active
        activeSources.forEach((source) => {
            clearLayer(source);
            loadSource(source);
        });

        // Met à jour l'affichage de l'heure
        updateTimeDisplay();

        // Si un appareil était sélectionné et le panneau latéral ouvert, essaie de le restaurer
        if (currentDeviceId && sidePanelOpen) {
            console.log(
                "Tentative de restauration de l'appareil sélectionné:",
                currentDeviceId
            );
            // Utilise un délai pour s'assurer que les couches sont chargées
            setTimeout(() => {
                findAndHighlightMarker(currentDeviceId);
            }, 1000); // Délai de 1 seconde pour s'assurer que les couches sont complètement chargées
        }
    }, refreshIntervalMs);
}

// Fonction pour trouver et mettre en évidence un marqueur sur la carte
function findAndHighlightMarker(deviceId) {
    console.log(`Tentative de remise en évidence de l'appareil: ${deviceId}`);

    // On efface d'abord les références globales des marqueurs pour éviter les conflits
    if (globalSelectedMarker) {
        if (globalSelectedMarker._icon) {
            globalSelectedMarker._icon.classList.remove('marker-selected');
        }
        globalSelectedMarker.setZIndexOffset(0);
        globalSelectedMarker = null;
    }

    if (globalSelectedText) {
        if (globalSelectedText._icon) {
            globalSelectedText._icon.classList.remove('marker-selected');
        }
        globalSelectedText.setZIndexOffset(0);
        globalSelectedText = null;
    }

    // On attend que les couches soient complètement chargées
    setTimeout(() => {
        let found = false;
        console.log('Recherche du marqueur avec deviceId:', deviceId);

        // On convertit deviceId en chaîne de caractères si ce n'est pas déjà fait
        const deviceIdStr = String(deviceId || '');

        // On essaie plusieurs méthodes de recherche

        // Méthode 1: Vérifier si le marqueur est dans la couche nebuleair
        if (deviceIdStr.indexOf('nebuleair') >= 0) {
            nebuleairLayer.eachLayer(function (layer) {
                // On ignore si ce n'est pas un marqueur ou s'il n'a pas d'icône
                if (!layer._icon) return;

                // On essaie les deux options pour trouver l'ID de l'appareil
                const layerDeviceId =
                    (layer.options && layer.options.deviceId) || layer.deviceId;

                if (layerDeviceId == deviceId) {
                    console.log('Marqueur NebuleAir trouvé:', layer);

                    // On cherche le marqueur de texte correspondant
                    let textMarker = null;
                    nebuleairLayer.eachLayer(function (textLayer) {
                        if (!textLayer._icon) return;

                        const textLayerDeviceId =
                            (textLayer.options && textLayer.options.deviceId) ||
                            textLayer.deviceId;

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            textMarker = textLayer;
                        }
                    });

                    // On applique la mise en évidence
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    globalSelectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        globalSelectedText = textMarker;
                    }

                    found = true;

                    // On réouvre le panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        openSidePanelNebuleAir(
                            layer.deviceData,
                            getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL)[0],
                            '24h',
                            getArrayFromLocalStorage(MESURES_LOCAL)[0]
                        );
                    }

                    return false;
                }
            });
        }
        // Méthode 2: Vérifier si le marqueur est dans la couche atmo_micro
        else {
            atmoMicroLayer.eachLayer(function (layer) {
                // On ignore si ce n'est pas un marqueur ou s'il n'a pas d'icône
                if (!layer._icon) return;

                // On essaie les deux options pour trouver l'ID de l'appareil
                const layerDeviceId =
                    (layer.options && layer.options.deviceId) || layer.deviceId;

                if (layerDeviceId == deviceId) {
                    console.log('Marqueur AtmoSud trouvé:', layer);

                    // On cherche le marqueur de texte correspondant
                    let textMarker = null;
                    atmoMicroLayer.eachLayer(function (textLayer) {
                        if (!textLayer._icon) return;

                        const textLayerDeviceId =
                            (textLayer.options && textLayer.options.deviceId) ||
                            textLayer.deviceId;

                        if (
                            textLayerDeviceId == deviceId &&
                            textLayer !== layer
                        ) {
                            textMarker = textLayer;
                        }
                    });

                    // On applique la mise en évidence
                    layer.setZIndexOffset(1000);
                    if (layer._icon)
                        layer._icon.classList.add('marker-selected');
                    globalSelectedMarker = layer;

                    if (textMarker) {
                        textMarker.setZIndexOffset(1000);
                        if (textMarker._icon)
                            textMarker._icon.classList.add('marker-selected');
                        globalSelectedText = textMarker;
                    }

                    found = true;

                    // On réouvre le panneau latéral si nécessaire
                    if (
                        document.getElementById('side-panel').style.display ===
                            'none' &&
                        layer.deviceData
                    ) {
                        // On récupère le pas de temps actuel et on le convertit pour AtmoSud
                        var pasDeTemps =
                            getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL)[0];
                        var pasDeTempsAtmo = '';
                        switch (pasDeTemps) {
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
                                pasDeTempsAtmo = 'journalier';
                                break;
                        }

                        // On récupère les mesures actuelles et on les convertit pour AtmoSud si nécessaire
                        var mesures =
                            getArrayFromLocalStorage(MESURES_LOCAL)[0];
                        var mesuresAtmo = mesures;
                        if (mesures === 'pm25') {
                            mesuresAtmo = 'pm2.5';
                        }

                        // Utilisation de la fonction importée du module
                        openSidePanelMicroStation(
                            layer.deviceData,
                            pasDeTempsAtmo,
                            '24h',
                            mesuresAtmo,
                            {
                                card1_img: card1Img,
                                card1_title: card1Title,
                                card1_subtitle:
                                    document.getElementById('card1_subtitle'),
                                card1_text: card1Text,
                                card2_text: card2Text,
                                card2_link:
                                    document.getElementById('card2_link'),
                                btn_historique_custom: btnHistoriqueCustom,
                                btn_historique_start_date:
                                    btnHistoriqueStartDate,
                                btn_historique_end_date: btnHistoriqueEndDate,
                                btn_poluant_pm1: btnPoluantPm1,
                                btn_poluant_pm25: btnPoluantPm25,
                                btn_poluant_pm10: btnPoluantPm10,
                                btn_poluant_no2: btnPoluantNo2,
                                btn_historique_1h: btnHistorique1h,
                                btn_historique_3h: btnHistorique3h,
                                btn_historique_24h: btnHistorique24h,
                                btn_historique_1sem: btnHistorique1sem,
                                btn_historique_1m: btnHistorique1m,
                                btn_historique_1a: btnHistorique1a,
                                btn_pas_de_temps_2min: btnPasDeTemps2min,
                                btn_pas_de_temps_qh: btnPasDeTempsQh,
                                btn_pas_de_temps_h: btnPasDeTempsH,
                                btn_pas_de_temps_d: btnPasDeTempsD,
                                openSidePanel_generic: openSidePanelGeneric,
                                retreive_historiqueData_microStation:
                                    retrieveHistoriqueDataMicroStation,
                                pas_de_temps: pas_de_temps,
                                am5: am5,
                                am5xy: am5xy,
                                am5plugins_exporting: am5plugins_exporting,
                                amchart_root: amchartRoot,
                            }
                        );
                    }

                    return false;
                }
            });
        }

        // Si on n'a pas trouvé le marqueur, on essaie d'autres méthodes
        if (!found) {
            console.warn(
                `Impossible de trouver le marqueur pour l'appareil: ${deviceId}`
            );

            // Méthode 3: On essaie d'utiliser les données stockées de l'appareil
            if (window.lastSelectedDeviceData) {
                console.log(
                    'Réouverture du panneau latéral avec les données stockées'
                );

                if (deviceIdStr.indexOf('nebuleair') >= 0) {
                    openSidePanelNebuleAir(
                        window.lastSelectedDeviceData,
                        getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL)[0],
                        '24h',
                        getArrayFromLocalStorage(MESURES_LOCAL)[0]
                    );
                } else {
                    // Pour les microStations AtmoSud
                    var pasDeTemps =
                        getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL)[0];
                    var pasDeTempsAtmo = '';
                    switch (pasDeTemps) {
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
                            pasDeTempsAtmo = 'journalier';
                            break;
                    }

                    // On récupère les mesures et on les convertit pour AtmoSud si nécessaire
                    var mesures = getArrayFromLocalStorage(MESURES_LOCAL)[0];
                    var mesuresAtmo = mesures;
                    if (mesures === 'pm25') {
                        mesuresAtmo = 'pm2.5';
                    }

                    // Utilisation de la fonction importée du module
                    openSidePanelMicroStation(
                        window.lastSelectedDeviceData,
                        pasDeTempsAtmo,
                        '24h',
                        mesuresAtmo,
                        {
                            card1_img: card1Img,
                            card1_title: card1Title,
                            card1_subtitle:
                                document.getElementById('card1_subtitle'),
                            card1_text: card1Text,
                            card2_text: card2Text,
                            card2_link: document.getElementById('card2_link'),
                            btn_historique_custom: btnHistoriqueCustom,
                            btn_historique_start_date: btnHistoriqueStartDate,
                            btn_historique_end_date: btnHistoriqueEndDate,
                            btn_poluant_pm1: btnPoluantPm1,
                            btn_poluant_pm25: btnPoluantPm25,
                            btn_poluant_pm10: btnPoluantPm10,
                            btn_poluant_no2: btnPoluantNo2,
                            btn_historique_1h: btnHistorique1h,
                            btn_historique_3h: btnHistorique3h,
                            btn_historique_24h: btnHistorique24h,
                            btn_historique_1sem: btnHistorique1sem,
                            btn_historique_1m: btnHistorique1m,
                            btn_historique_1a: btnHistorique1a,
                            btn_pas_de_temps_2min: btnPasDeTemps2min,
                            btn_pas_de_temps_qh: btnPasDeTempsQh,
                            btn_pas_de_temps_h: btnPasDeTempsH,
                            btn_pas_de_temps_d: btnPasDeTempsD,
                            openSidePanel_generic: openSidePanelGeneric,
                            retreive_historiqueData_microStation:
                                retrieveHistoriqueDataMicroStation,
                            pas_de_temps: pas_de_temps,
                            am5: am5,
                            am5xy: am5xy,
                            am5plugins_exporting: am5plugins_exporting,
                            amchart_root: amchartRoot,
                        }
                    );
                }
            }
        }
    }, 1000);
}

// Fonction pour mettre à jour les boutons de seuil en fonction du polluant sélectionné
function updateThresholdButtons() {
    // On récupère le polluant actuellement sélectionné
    const selectedPollutant = getArrayFromLocalStorage(MESURES_LOCAL)[0];

    // On détermine quel ensemble de seuils utiliser
    const thresholds = getThresholdsForPollutant(selectedPollutant);

    // On met à jour l'info-bulle de chaque bouton avec la plage appropriée
    document
        .getElementById('btn_bon')
        .setAttribute(
            'data-bs-title',
            `${thresholds.bon.min} à ${thresholds.bon.max} µg/m³`
        );

    document
        .getElementById('btn_moyen')
        .setAttribute(
            'data-bs-title',
            `${thresholds.moyen.min} à ${thresholds.moyen.max} µg/m³`
        );

    document
        .getElementById('btn_degrade')
        .setAttribute(
            'data-bs-title',
            `${thresholds.degrade.min} à ${thresholds.degrade.max} µg/m³`
        );

    document
        .getElementById('btn_mauvais')
        .setAttribute(
            'data-bs-title',
            `${thresholds.mauvais.min} à ${thresholds.mauvais.max} µg/m³`
        );

    document
        .getElementById('btn_tres_mauvais')
        .setAttribute(
            'data-bs-title',
            `${thresholds.tres_mauvais.min} à ${thresholds.tres_mauvais.max} µg/m³`
        );

    document
        .getElementById('btn_extr_mauvais')
        .setAttribute('data-bs-title', `>${thresholds.extr_mauvais.min} µg/m³`);

    // On réinitialise les info-bulles pour les mettre à jour
    const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
    );
    [...tooltipTriggerList].map((tooltipTriggerEl) => {
        // On supprime toute info-bulle existante
        const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (tooltip) {
            tooltip.dispose();
        }
        // On crée une nouvelle info-bulle
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Fonction auxiliaire pour obtenir l'ensemble de seuils approprié pour un polluant
function getThresholdsForPollutant(pollutant) {
    if (pollutant === 'pm10') {
        return seuils_PM10;
    } else if (pollutant === 'no2') {
        return seuils_NO2_24h;
    } else {
        // Par défaut pour PM1 et PM2.5
        return seuils_PM1_PM25;
    }
}

// Fonction pour obtenir le code couleur en fonction de la valeur et du polluant
function getColorCodeForValue(value, pollutant) {
    const thresholds = getThresholdsForPollutant(pollutant);

    let colorCode = 'default';

    // On arrondit la valeur pour assurer une comparaison cohérente
    const roundedValue = Math.round(parseFloat(value));

    // On vérifie chaque plage de seuils
    for (let key in thresholds) {
        const min = thresholds[key].min;
        const max = thresholds[key].max;

        if (roundedValue >= min && roundedValue <= max) {
            colorCode = thresholds[key].code;
            break;
        }
    }

    return colorCode;
}

// On initialise l'horloge au chargement de la page
document.addEventListener('DOMContentLoaded', function () {
    updateTimeDisplay();
    // On met à jour l'horloge toutes les minutes
    setInterval(updateTimeDisplay, 60000);

    // On configure le rafraîchissement automatique des données
    setupAutoRefresh();

    // On initialise les boutons de seuil en fonction du polluant sélectionné
    updateThresholdButtons();
});

// Vérifier si un élément est dans un js object
function isValueInObject(obj, value) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] === value) {
                return true;
            }
        }
    }
    return false;
}

function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}

// Leaflet Map obj creation
let coordsCenter = config.coordsCenter;
let zoomLevel = config.zoomLevel;

let map = L.map('map', {
    // zoomControl: isMobile == true ? false : true,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    renderer: L.canvas(),
    maxBounds: L.latLngBounds(config.boundNE, config.boundSW),
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

// Initialisation du conteneur device-info
const deviceInfo = L.control({ position: 'bottomright' });

deviceInfo.onAdd = function () {
    this._div = L.DomUtil.create('div', 'device-info');
    // Structure minimale qui sera remplacée
    this._div.innerHTML = '<div></div>';
    this._div.style.display = 'none';
    return this._div;
};

deviceInfo.addTo(map);

// MESURES dropdown list (attention seul un élément peut être coché)
// Boucle pour créer les boutons de mesures dans le menu déroulant
for (let key in mesures) {
    if (mesures.hasOwnProperty(key)) {
        let button = document.createElement('button');
        let name = mesures[key].name;
        let code = mesures[key].code;
        let activated = mesures[key].activated;
        button.innerHTML = name;
        button.classList.add('dropdown-item');
        // Si le stockage local est vide, on sauvegarde la configuration initiale
        if (isEmptyObject(getArrayFromLocalStorage(MESURES_LOCAL))) {
            if (activated) {
                addItemToLocalStorageArray(MESURES_LOCAL, code);
            }
        }
        // On vérifie si le code est déjà dans le stockage local
        let checkArray = getArrayFromLocalStorage(MESURES_LOCAL);
        if (isValueInObject(checkArray, code)) {
            button.classList.add('active');
        }
        // Action quand on clique sur le bouton
        button.onclick = function () {
            let checkArray = getArrayFromLocalStorage(MESURES_LOCAL);
            if (isValueInObject(checkArray, code)) {
                console.warn('on ne peut pas décocher');
            } else {
                // On supprime les autres sélections
                localStorage.removeItem(MESURES_LOCAL);
                let listItems = document.querySelectorAll(
                    '#dropdown_mesures li'
                );
                listItems.forEach((li) => {
                    let buttons = li.querySelectorAll('button');
                    buttons.forEach((button) => {
                        button.classList.remove('active');
                    });
                });
                // On active le nouveau choix
                addItemToLocalStorageArray(MESURES_LOCAL, code);
                button.classList.add('active');
                // Mise à jour du texte du bouton principal
                document
                    .querySelector('#dropdown_mesures')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML = name;

                updateThresholdButtons();

                // Rechargement des données
                console.log(
                    'Changement du type de mesure: ' +
                        getArrayFromLocalStorage(MESURES_LOCAL)
                );
                console.log(
                    'Necessite le renouvellement de: ' +
                        getArrayFromLocalStorage(SOURCES_LOCAL)
                );
                // On met à jour chaque source active
                for (let item of getArrayFromLocalStorage(SOURCES_LOCAL)) {
                    clearLayer(code);
                    loadSource(item);
                }
            }
        };
        let li = document.createElement('li');
        li.appendChild(button);
        dropdownMesures.appendChild(li);
    }
}

// Boucle pour créer les boutons des sources de données
for (let key in sources) {
    if (sources.hasOwnProperty(key)) {
        let button = document.createElement('button');
        let name = sources[key].name;
        let code = sources[key].code;
        let activated = sources[key].activated;
        button.innerHTML = name;
        button.classList.add('dropdown-item');
        // Configuration initiale du stockage local
        if (isEmptyObject(getArrayFromLocalStorage(SOURCES_LOCAL))) {
            if (activated) {
                addItemToLocalStorageArray(SOURCES_LOCAL, code);
            }
        }
        // Vérification si la source est déjà active
        let checkArray = getArrayFromLocalStorage(SOURCES_LOCAL);
        if (isValueInObject(checkArray, code)) {
            button.classList.add('active');
        }
        // Action lors du clic sur une source
        button.onclick = function () {
            let checkArray = getArrayFromLocalStorage(SOURCES_LOCAL);
            if (isValueInObject(checkArray, code)) {
                button.classList.remove('active');
                removeItemFromLocalStorageArray(SOURCES_LOCAL, code);
                clearLayer(code);
            } else {
                addItemToLocalStorageArray(SOURCES_LOCAL, code);
                button.classList.add('active');
                loadSource(code);
            }
        };
        let li = document.createElement('li');
        li.appendChild(button);
        dropdownSources.appendChild(li);
    }
}

// Boucle pour créer les boutons des pas de temps
for (let key in pas_de_temps) {
    if (pas_de_temps.hasOwnProperty(key)) {
        let button = document.createElement('button');
        let name = pas_de_temps[key].name;
        let code = pas_de_temps[key].code;
        let activated = pas_de_temps[key].activated;
        button.innerHTML = name;
        button.classList.add('dropdown-item');
        // Configuration initiale du stockage local
        if (isEmptyObject(getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL))) {
            if (activated) {
                addItemToLocalStorageArray(PAS_DE_TEMPS_LOCAL, code);
            }
        }
        // Vérification si le pas de temps est déjà actif
        let checkArray = getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL);
        if (isValueInObject(checkArray, code)) {
            button.classList.add('active');
        }

        button.onclick = function () {
            let checkArray = getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL);
            if (isValueInObject(checkArray, code)) {
                console.warn('on ne peut pas décocher');
            } else {
                // Suppression des autres sélections
                localStorage.removeItem(PAS_DE_TEMPS_LOCAL);
                let listItems = document.querySelectorAll(
                    '#dropdown_pas_de_temps li'
                );
                listItems.forEach((li) => {
                    let buttons = li.querySelectorAll('button');
                    buttons.forEach((button) => {
                        button.classList.remove('active');
                    });
                });
                // Activation du nouveau pas de temps
                addItemToLocalStorageArray(PAS_DE_TEMPS_LOCAL, code);
                button.classList.add('active');
                // Mise à jour du texte du bouton principal
                document
                    .querySelector('#dropdown_pas_de_temps')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML = name;

                // Mise à jour des données
                console.log(
                    'Changement du pas de temps: ' +
                        getArrayFromLocalStorage(PAS_DE_TEMPS_LOCAL)
                );
                console.log(
                    'Necessite le renouvellement de: ' +
                        getArrayFromLocalStorage(SOURCES_LOCAL)
                );
                // Actualisation de chaque source active
                for (let item of getArrayFromLocalStorage(SOURCES_LOCAL)) {
                    clearLayer(code);
                    loadSource(item);
                }
                updateTimeDisplay();
                setupAutoRefresh();
            }
        };

        let li = document.createElement('li');
        li.appendChild(button);
        dropdownPasDeTemps.appendChild(li);
    }
}

// Chargement des sources depuis un bouton
function loadSource(source) {
    console.log('Loading data for ' + source);
    switch (source) {
        case 'nebuleair':
            loadNebuleAir();
            break;
        case 'sensor_commmunity':
            loadSensorCommunity();
            break;
        case 'purpleair':
            loadSensorCommunity();
            break;
        case 'atmo_micro':
            // Utilisation de la fonction importée du module avec les dépendances nécessaires
            loadAtmoSudMicroStations({
                atmoMicroLayer: atmoMicroLayer,
                getArrayFromLocalStorage,
                pasDeTempsLocal: 'pas_de_temps_local', // Passez la chaîne directement
                mesuresLocal: 'mesures_local', // Passez la chaîne directement
                map,
                deviceInfo,
                // Passez les références aux variables globales
                globalSelectedMarker: window.globalSelectedMarker,
                globalSelectedText: window.globalSelectedText,
                globalSelectedDeviceId: window.globalSelectedDeviceId,
                // Passez des fonctions pour mettre à jour les variables globales
                setGlobalSelectedMarker: (marker) => {
                    window.globalSelectedMarker = marker;
                },
                setGlobalSelectedText: (text) => {
                    window.globalSelectedText = text;
                },
                setGlobalSelectedDeviceId: (id) => {
                    window.globalSelectedDeviceId = id;
                },
                formatString,
                getColorCodeForValue,
                openSidePanelMicroStation: (
                    data,
                    pasDeTempsAtmo,
                    historique,
                    mesuresAtmo
                ) => {
                    openSidePanelMicroStation(
                        data,
                        pasDeTempsAtmo,
                        historique,
                        mesuresAtmo,
                        {
                            card1Img: card1Img,
                            card1Title: card1Title,
                            card1Subtitle:
                                document.getElementById('card1_subtitle'),
                            card1Text: card1Text,
                            card2Text: card2Text,
                            card2Link: document.getElementById('card2_link'),
                            btnHistoriqueCustom: btnHistoriqueCustom,
                            btnHistoriqueStartDate: btnHistoriqueStartDate,
                            btnHistoriqueEndDate: btnHistoriqueEndDate,
                            btnPoluantPm1: btnPoluantPm1,
                            btnPoluantPm25: btnPoluantPm25,
                            btnPoluantPm10: btnPoluantPm10,
                            btnPoluantNo2: btnPoluantNo2,
                            btnHistorique1h: btnHistorique1h,
                            btnHistorique3h: btnHistorique3h,
                            btnHistorique24h: btnHistorique24h,
                            btnHistorique1sem: btnHistorique1sem,
                            btnHistorique1m: btnHistorique1m,
                            btnHistorique1a: btnHistorique1a,
                            btnPasDeTemps2min: btnPasDeTemps2min,
                            btnPasDeTempsQh: btnPasDeTempsQh,
                            btnPasDeTempsH: btnPasDeTempsH,
                            btnPasDeTempsD: btnPasDeTempsD,
                            openSidePanelGeneric: openSidePanelGeneric,
                            pasDeTemps: pasDeTemps,
                            am5: am5,
                            am5xy: am5xy,
                            am5pluginsExporting: am5plugins_exporting,
                            amchartRoot: amchartRoot,
                        }
                    );
                },
            });
            break;

        // case 'atmo_ref':
        //     load_atmoSud_stationsRef();
        //     break;
        // case 'mod_pm':
        //     loadModPM();
        //     break;
        // case 'icairh':
        //     loadIcairh();
        //     break;
        // case 'vents':
        //     loadVents();
        //     break;
        // case 'signalair':
        //     loadSignalAir();
        //     break;
        // case 'mobileair':
        //     loadMobileAir();
        //     break;
    }
}

// Enlever les layers lorsque l'on change de pas de temps ou de source
function clearLayer(source) {
    console.log('Clearing layer for ' + source);
    switch (source) {
        case 'nebuleair':
            nebuleairLayer.clearLayers();
            break;
        case 'sensor_commmunity':
            sensorCommmuityLayer.clearLayers();
            break;
        case 'purpleair':
            purpleairLayer.clearLayers();
            break;
        case 'atmo_micro':
            atmoMicroLayer.clearLayers();
            break;
        case 'atmo_ref':
            atmoRefLayer.clearLayers();
            break;
        case 'mod_pm':
            modelisationPMAtmoSudLayer.clearLayers();
            break;
        case 'icairh':
            modelisationICAIRAtmoSudLayer.clearLayers();
            break;
        case 'vents':
            map.clearLayers();
            break;
        case 'signalair':
            signalairLayer.clearLayers();
            break;
        case 'mobileair':
            mobileairLayer.clearLayers();
            break;
    }
}

// Chargement des sources depuis la mémoire locale (au démarrage de l'appli)
for (let key in sources) {
    let code = sources[key].code;
    // On vérifie le local storage (object) pour voir si l'élément est déjà présent
    let checkArray = getArrayFromLocalStorage(SOURCES_LOCAL);
    if (isValueInObject(checkArray, code)) {
        loadSource(code);
    }
}

// Actualisation des sources toutes les minutes
// TEST AVEC MOBILEAIR
function reloadLayers(source) {
    console.log('⏰ Reloading layers');
    clearLayer('mobileair');
    // Get the new data
    loadSource('mobileair');
}

setInterval(reloadLayers, 9990000); // 60000 -> 1min

// OPEN SIDE PANEL
/*
Sur un grand écran on veut un side panel moins large (col-lg) 
que sur un petit écran (col) sinon il est trop fin
*/
function openSidePanelGeneric() {
    // Side panel
    // Sur smartphone -> toute la place (col-12)
    // Sur ordi petit (sm) -> 6 colonnes
    // Sur grand écran (lg) -> 5 colonnes
    sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
    sidePanel.style.display = 'block';
    // Map
    // Sur smartphone -> disparait (col-0)
    // Sur ordi petit (sm) -> 6 colonnes
    // Sur grand écran (lg) -> 7 colonnes
    mapContainer.classList.remove('col-12');
    mapContainer.classList.add('d-none', 'd-sm-block', 'col-sm-6', 'col-lg-7');
    mapContainer.style.paddingLeft = '10px';
}

function openSidePanelSignalair(data, nuisanceType) {
    console.log('Opening side panel for SignalAir');
    card1Img.src = 'img/signalair/logoSignalAir.png';
    card1Title.innerHTML = 'Nuisance: ' + nuisanceType;
    card1Text.innerHTML = `
    Ville:   ${data['city']} </br>
    <table class="table">
      <tbody>
        <tr>
          <td>Niveau de gêne</td>
          <td>${data['niveau-de-gene']}</td>
        </tr>
        <tr>
          <td>Symptômes déclarés</td>
          <td>${data['si-oui-quels-symptomes']}</td>
        </tr>
        <tr>
          <td>Origine de la nuisance</td>
          <td>${data['origine-de-la-nuisance']} ${data['description-de-lorigine-de-la-nuisance']}</td>
        </tr>
        <tr>
          <td>Durée de la nuisance</td>
          <td>${data['duree-de-la-nuisance']}</td>
        </tr>
        <tr>
        <td>Commentaires</td>
        <td>${data['remarque-commentaire']}</td>
      </tr>
      </tbody>
    </table>
    <a href="https://www.signalair.eu/fr/" target="_blank" class="btn btn-primary" id="card1_button">Faire un signalement</a>
    `;

    openSidePanelGeneric();
}

// CLOSE SIDE PANEL
function closeSidePanel() {
    console.log('Closing side panel');
    sidePanel.classList.remove('col-2', 'col-sm-4', 'col-lg-3');
    sidePanel.style.display = 'none';
    mapContainer.classList.remove('col-8', 'col-lg-9');
    mapContainer.classList.add('col-12');
    mapContainer.style.paddingLeft = '30px';
}

// Ajout d'un écouteur d'événement sur le bouton pour ouvrir/fermer le panneau latéral
document
    .getElementById('toggleSidePanel')
    .addEventListener('click', function () {
        const sidePanel = document.getElementById('side-panel');
        const mapContainer = document.getElementById('map-container');
        const icon = this.querySelector('i');

        if (sidePanel.style.display === 'none') {
            // Ouverture du panneau latéral : on ajoute les classes nécessaires pour l'affichage
            sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
            sidePanel.style.display = 'block';
            document.body.classList.add('side-panel-open');
            mapContainer.classList.remove('col-12');
            mapContainer.classList.add(
                'd-none',
                'd-sm-block',
                'col-sm-6',
                'col-lg-7'
            );
            icon.classList.replace('bi-chevron-right', 'bi-chevron-left');
        } else {
            // Fermeture du panneau latéral : on retire les classes et on cache le panneau
            sidePanel.classList.remove('col-12', 'col-sm-6', 'col-lg-5');
            sidePanel.style.display = 'none';
            document.body.classList.remove('side-panel-open');
            mapContainer.classList.remove(
                'd-none',
                'd-sm-block',
                'col-sm-6',
                'col-lg-7'
            );
            mapContainer.classList.add('col-12');
            icon.classList.replace('bi-chevron-left', 'bi-chevron-right');
        }

        // On force la mise à jour de la taille de la carte
        map.invalidateSize();
    });

// Ajout d'un écouteur d'événement sur le bouton de fermeture mobile
document
    .getElementById('closeSidePanelMobile')
    .addEventListener('click', function () {
        const sidePanel = document.getElementById('side-panel');
        const mapContainer = document.getElementById('map-container');
        const toggleButton = document.getElementById('toggleSidePanel');
        const toggleIcon = toggleButton.querySelector('i');

        // Fermeture du panneau latéral sur mobile : même logique que la fermeture normale
        sidePanel.classList.remove('col-12', 'col-sm-6', 'col-lg-5');
        sidePanel.style.display = 'none';
        document.body.classList.remove('side-panel-open');
        mapContainer.classList.remove(
            'd-none',
            'd-sm-block',
            'col-sm-6',
            'col-lg-7'
        );
        mapContainer.classList.add('col-12');
        toggleIcon.classList.replace('bi-chevron-left', 'bi-chevron-right');

        // On force la mise à jour de la taille de la carte
        map.invalidateSize();
    });

// Location et Zoom par défaut récupéré dans config.js
// Si existe dans Local Storage alors prends les variables en local
if ('Lat' in localStorage) {
    let coordsCenterLocalLat = localStorage.getItem('Lat');
    let coordsCenterLocalLong = localStorage.getItem('Long');
    let zoomLevelLocal = localStorage.getItem('Zoom');
    map.setView([coordsCenterLocalLat, coordsCenterLocalLong], zoomLevelLocal);
} else {
    map.setView(coordsCenter, zoomLevel);
}

// On set l'affichage des boutons de choix de pas de temps et de mesures
const storedTimeStep = getArrayFromLocalStorage('pas_de_temps_local')[0];
const timeStepName =
    pas_de_temps[
        Object.keys(pas_de_temps).find(
            (key) => pas_de_temps[key].code === storedTimeStep
        )
    ].name;
document
    .querySelector('#dropdown_pas_de_temps')
    .closest('.dropdown')
    .querySelector('.selected-option').innerHTML = timeStepName;
const storedMesure = getArrayFromLocalStorage('mesures_local')[0];
const mesureName =
    mesures[
        Object.keys(mesures).find((key) => mesures[key].code === storedMesure)
    ].name;
document
    .querySelector('#dropdown_mesures')
    .closest('.dropdown')
    .querySelector('.selected-option').innerHTML = mesureName;

// Dès que l'on bouge la carte on enregistre LAT/LONG/ZOOM
map.on('moveend', function () {
    // Get the map's center coordinates
    var center = map.getCenter();
    var currentZoom = map.getZoom();
    var lat = center.lat;
    var lng = center.lng;
    saveArrayToLocalStorage('Lat', lat);
    saveArrayToLocalStorage('Long', lng);
    saveArrayToLocalStorage('Zoom', currentZoom);
});

// Exposer les fonctions nécessaires globalement (pour la transition)
window.openSidePanelMicroStation = (
    data,
    pasDeTempsAtmo,
    historique,
    mesuresAtmo
) => {
    openSidePanelMicroStation(data, pasDeTempsAtmo, historique, mesuresAtmo, {
        card1_img: card1Img,
        card1_title: card1Title,
        card1_subtitle: document.getElementById('card1_subtitle'),
        card1_text: card1Text,
        card2_text: card2Text,
        card2_link: document.getElementById('card2_link'),
        btn_historique_custom: btnHistoriqueCustom,
        btn_historique_start_date: btnHistoriqueStartDate,
        btn_historique_end_date: btnHistoriqueEndDate,
        btn_poluant_pm1: btnPoluantPm1,
        btn_poluant_pm25: btnPoluantPm25,
        btn_poluant_pm10: btnPoluantPm10,
        btn_poluant_no2: btnPoluantNo2,
        btn_historique_1h: btnHistorique1h,
        btn_historique_3h: btnHistorique3h,
        btn_historique_24h: btnHistorique24h,
        btn_historique_1sem: btnHistorique1sem,
        btn_historique_1m: btnHistorique1m,
        btn_historique_1a: btnHistorique1a,
        btn_pas_de_temps_2min: btnPasDeTemps2min,
        btn_pas_de_temps_qh: btnPasDeTempsQh,
        btn_pas_de_temps_h: btnPasDeTempsH,
        btn_pas_de_temps_d: btnPasDeTempsD,
        openSidePanel_generic: openSidePanelGeneric,
        retreive_historiqueData_microStation:
            retrieveHistoriqueDataMicroStation,
        pas_de_temps: pas_de_temps,
        am5: am5,
        am5xy: am5xy,
        am5plugins_exporting: am5plugins_exporting,
        amchart_root: amchartRoot,
    });
};

// Exporter les fonctions qui doivent être accessibles depuis d'autres modules
export {
    loadSource,
    clearLayer,
    openSidePanelGeneric,
    closeSidePanel,
    getArrayFromLocalStorage,
    saveArrayToLocalStorage,
    addItemToLocalStorageArray,
    removeItemFromLocalStorageArray,
    updateTimeDisplay,
    setupAutoRefresh,
    findAndHighlightMarker,
    getColorCodeForValue,
    formatString,
    formatPollutantName,
};
