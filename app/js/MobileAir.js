import { mobileair_layer } from './layers.js';
import { map, getColorForSeuil } from './mapConfig.js';
import { getArrayFromLocalStorage } from './utils.js';
import { seuilsPm1Pm25, seuilsPm10, pasDeTemps } from './appConfig.js';
import {
    card1Img,
    card1Title,
    card1Subtitle,
    card1Text,
    card2Text,
    card2Link,
    openSidePanelGeneric,
} from './sidePanel.js';

var selected_point_timespan = null;
var old_selected_point_timespan = null;

var circles = {};
var mesuresArray = [];

/**
 * Popup draggable pour la sélection dynamique des dates
 */
function showDatePickerPopupMobileAir() {
    // Supprimer d'anciens popups
    document.querySelectorAll('.mobileair-draggable').forEach(el => el.remove());

    // Créer le conteneur
    const popup = document.createElement('div');
    popup.className = 'mobileair-draggable';

    // Dates par défaut : 7 derniers jours
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const today = new Date().toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    popup.innerHTML = `
        <div class="drag-header">
            <strong>Période MobileAir</strong>
            <button class="close-btn">×</button>
        </div>
        <div class="drag-content">
            <p id="mobileair-days-counter" class="days-counter"></p>

            <label for="mobileair-date-start">Date de début</label>
            <input type="date" id="mobileair-date-start" max="${today}" value="${startDateStr}">

            <label for="mobileair-date-end">Date de fin</label>
            <input type="date" id="mobileair-date-end" max="${today}" value="${endDateStr}">

            <div class="popup-actions">
                <button class="btn-reset" id="mobileair-reset-dates">Réinitialiser</button>
                <button class="btn-apply" id="mobileair-apply-dates">Appliquer</button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    /**
     * Mise à jour du texte du compteur
     */
    const updateDaysCounter = () => {
        const start = document.getElementById('mobileair-date-start').value;
        const end = document.getElementById('mobileair-date-end').value;

        if (start && end) {
            const startObj = new Date(start);
            const endObj = new Date(end);
            const diffTime = Math.abs(endObj - startObj);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            document.getElementById('mobileair-days-counter').textContent =
                `Affichage des données sur ${diffDays} jours`;
        }
    };

    updateDaysCounter();

    popup.querySelector('#mobileair-date-start').addEventListener('change', updateDaysCounter);
    popup.querySelector('#mobileair-date-end').addEventListener('change', updateDaysCounter);

    /**
     * Bouton fermer
     */
    popup.querySelector('.close-btn').addEventListener('click', () => popup.remove());

    /**
     * Bouton réinitialiser
     */
    popup.querySelector('#mobileair-reset-dates').addEventListener('click', () => {
        document.getElementById('mobileair-date-start').value = startDateStr;
        document.getElementById('mobileair-date-end').value = endDateStr;
        updateDaysCounter();
    });

    /**
     * Bouton appliquer
     */
    popup.querySelector('#mobileair-apply-dates').addEventListener('click', () => {
        const start = document.getElementById('mobileair-date-start').value;
        const end = document.getElementById('mobileair-date-end').value;

        if (!start || !end) {
            alert('Veuillez sélectionner une date de début et une date de fin');
            return;
        }
        if (new Date(start) > new Date(end)) {
            alert('La date de début doit être antérieure à la date de fin');
            return;
        }

        popup.remove();
        mobileair_layer.clearLayers();
        loadMobileAir(start, end);
    });

    /**
     * Rendre le popup draggable
     */
    let isDragging = false, offsetX = 0, offsetY = 0;

    const header = popup.querySelector('.drag-header');
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - popup.offsetLeft;
        offsetY = e.clientY - popup.offsetTop;
        popup.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            popup.style.left = `${e.clientX - offsetX}px`;
            popup.style.top = `${e.clientY - offsetY}px`;
            popup.style.transform = 'none'; // annule le centrage
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        popup.style.transition = '';
    });

    // Position initiale au centre
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
}



/**
 * Fonction principale pour charger les données MobileAir
 */
export function loadMobileAir(startDate, endDate) {
    // console.log(
    //     '%cloadMobileAir',
    //     'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    // );

    mobileair_layer.clearLayers();

    if (!startDate || !endDate) {
        showDatePickerPopupMobileAir();
        return;
    }

    // console.log(`[MobileAir] Période de recherche: du ${startDate} au ${endDate}`);

    const mesures = getArrayFromLocalStorage('mesuresLocal');
    const mesure = mesures[0]; // on récupère la première mesure
    const mesureMajuscule = mesure.toUpperCase();

    // console.log('Mesures sélectionnées : ' + mesures);

    const fullUrl_mobileair_list = `https://api.aircarto.fr/capteurs/metadata?capteurType=MobileAir&format=JSON`;

    $.ajax({
        method: 'GET',
        url: fullUrl_mobileair_list,
        success: function (data) {
            $.each(data, function (key, value) {
                // console.log('Sensor token: ' + value['sensorToken']);
                getDataMobileAir(value['sensorToken'], mesure, mesureMajuscule, startDate, endDate);
            });
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    });
}

/**
 * Récupération et affichage des données pour un capteur MobileAir
 */
function getDataMobileAir(sensorToken, mesure, mesureMajuscule, startDate, endDate) {
    const startParam = `${startDate}T00:00:00Z`;
    const endParam = `${endDate}T23:59:59Z`;

    const fullUrl_mobileair = `
        https://api.aircarto.fr/capteurs/dataMobileAir?capteurID=${sensorToken}&
        start=${startParam}&
        end=${endParam}&
        GPSnull=false&
        format=JSON
    `.replace(/\s+/g, '');

    // console.log('URL mobileAir: ' + fullUrl_mobileair);

    $.ajax({
        method: 'GET',
        url: fullUrl_mobileair,
        success: function (data) {
            if (!data || data.length === 0) {
                // console.warn('No data received for sensor ' + sensorToken);
                return;
            }

            // console.log(`Data received for sensor ${sensorToken}:`, data);

            // --- Polylines par session ---
            function groupBySessionId(arr) {
                return arr.reduce((acc, item) => {
                    if (!acc[item.sessionId]) {
                        acc[item.sessionId] = [];
                    }
                    acc[item.sessionId].push([item.lat, item.lon]);
                    return acc;
                }, {});
            }

            const groupedData = groupBySessionId(data);

            Object.keys(groupedData).forEach((sessionId) => {
                L.polyline(groupedData[sessionId], {
                    color: 'gray',
                    opacity: 0.5,
                }).addTo(mobileair_layer); // ajouté dans la layer
            });

            // --- Points individuels ---
            $.each(data, function (key, value) {
                let circle_param = {
                    opacity: 0,
                    fillOpacity: 1,
                    radius: 8,
                };

                // Coloration en fonction des seuils
                const valueRounded = Math.round(value[mesureMajuscule]);
                if (mesure === 'pm1' || mesure === 'pm25') {
                    for (let key in seuilsPm1Pm25) {
                        const min = seuilsPm1Pm25[key].min;
                        const max = seuilsPm1Pm25[key].max;
                        if (valueRounded >= min && valueRounded <= max) {
                            const color = getColorForSeuil(key);
                            circle_param.color = color;
                            circle_param.fillColor = color;
                        }
                    }
                } else if (mesure === 'pm10') {
                    for (let key in seuilsPm10) {
                        const min = seuilsPm10[key].min;
                        const max = seuilsPm10[key].max;
                        if (valueRounded >= min && valueRounded <= max) {
                            const color = getColorForSeuil(key);
                            circle_param.color = color;
                            circle_param.fillColor = color;
                        }
                    }
                }

                // Tooltip
                const dateMesure = new Date(value['time']);
                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Europe/Paris',
                    timeZoneName: 'short',
                };
                const frenchDate = dateMesure.toLocaleDateString('fr-FR', options);

                let mobileAirTooltip = `
                    <b>MobileAir ${value['sensorId']} (session n° ${value['sessionId']})</b><br/>
                    ${frenchDate}<br/>
                    ${mesure.toUpperCase()}: ${value[mesureMajuscule]} µg/m&sup3;
                `;

                const circle = L.circleMarker([value['lat'], value['lon']], circle_param)
                    .bindTooltip(mobileAirTooltip, {
                        direction: 'center',
                        offset: [0, -50],
                    })
                    .on('click', function () {
                        // console.log('Click on sensor: ' + value['sensorId']);
                        openSidePanel_mobileAir(value, pasDeTemps, '24h', mesure);
                    })
                    .addTo(mobileair_layer);

                // Stockage pour le surlignage
                const unixTimestamp = new Date(value['time']).getTime(); // millisecondes
                circles[unixTimestamp] = circle;
            });

            map.addLayer(mobileair_layer);
        },
        error: function (xhr, status, error) {
            console.error('Erreur API MobileAir:', error, xhr.responseText);
        },
    });
}

/**
 * Ouverture du panneau latéral avec infos capteur
 */
function openSidePanel_mobileAir(data, mesure) {
    // console.log('openSidePanel_mobileAir');

    mesuresArray.length = 0;
    mesuresArray.push(mesure);

    // Card 1
    card1Img.src = 'img/nebuleair/NebuleAir_photo.png';
    card1Title.innerHTML = 'MobileAir ' + data.sensorId ;
    card1Subtitle.innerHTML = 'Capteur citoyen de mesure en mobilité' ;
    card1Text.innerHTML = `Session n°${data.sessionId}`;

    // Card 2
    card2Text.innerHTML = `Le MobileAir est un capteur mobile de la qualité de l'air.
        Il fonctionne sur batterie et communique les mesures en temps réel via le réseau mobile.
        Il est équipé d'une puce GPS qui permet la géolocalisation des données.`;
    card2Link.innerHTML = 'AirCarto.fr';

    // Données historiques
    retreive_historiqueData_mobileAir(data.sensorId, data.sessionId, mesuresArray, false);

    openSidePanelGeneric();
}

/**
 * Récupération des données d'une session pour le graphique
 */
function retreive_historiqueData_mobileAir(sensorId, sessionId, mesure, add_mesure) {
    const start = Date.now();

    if (add_mesure) {
        mesuresArray.push(mesure);
    }

    // console.log(`Récupération data sensor ${sensorId}, session ${sessionId}`);
    // console.log('Mesures:', mesuresArray);
    console.log(mesure);
    const fullUrl_mobileair = `
        https://api.aircarto.fr/capteurs/dataMobileAir?capteurID=${sensorId}&
        sessionID=${sessionId}&
        start=-20d&
        end=now&
        GPSnull=false&
        format=JSON
    `.replace(/\s+/g, '');

    $.ajax({
        method: 'GET',
        url: fullUrl_mobileair,
        success: function (data) {
            const duration = (Date.now() - start) / 1000;
            // console.log(`Data gathered in %c${duration} sec`, 'color: red;');

            const filteredData = data.filter((item) => item.sessionId === sessionId);
            // console.log('Filtered session data:', filteredData);

            const dataForChart_pm1 = filteredData.map((item) => ({
                x: new Date(item.time).getTime(), // millisecondes
                y: item.PM1,
            }));

            // Graphique CanvasJS
            var chart = new CanvasJS.Chart('chartdiv_sensor', {
                zoomEnabled: true,
                toolTip: {
                    updated: function (e) {
                        const pointTime = e.entries[0].dataPoint.x;

                        if (!selected_point_timespan) {
                            selected_point_timespan = pointTime;
                            highlight_circle_on_map(selected_point_timespan, old_selected_point_timespan);
                        } else if (selected_point_timespan !== pointTime) {
                            old_selected_point_timespan = selected_point_timespan;
                            selected_point_timespan = pointTime;
                            highlight_circle_on_map(selected_point_timespan, old_selected_point_timespan);
                        }
                    },
                },
                data: [
                    {
                        type: 'area',
                        xValueType: 'dateTime',
                        dataPoints: dataForChart_pm1,
                    },
                ],
            });

            chart.render();
        },
        error: function (xhr, status, error) {
            console.error('Erreur récupération historique:', error, xhr.responseText);
        },
    });
}

/**
 * Mise en surbrillance du point sélectionné sur la carte
 */
function highlight_circle_on_map(selected_point_timespan, old_selected_point_timespan) {
    if (circles[selected_point_timespan]) {
        circles[selected_point_timespan].setStyle({
            opacity: 1,
            color: 'red',
        });
    }

    if (circles[old_selected_point_timespan]) {
        circles[old_selected_point_timespan].setStyle({
            opacity: 0,
        });
    }
}
