import { mobileair_layer } from './layers.js';
import { map, getColorForSeuil } from './mapConfig.js';
import { getArrayFromLocalStorage, formatPollutantName } from './utils.js';
import { seuilsPm1Pm25, seuilsPm10, pasDeTemps } from './appConfig.js';
import {
    card1Img,
    card1Title,
    card1Subtitle,
    card1Text,
    card2Text,
    card2Link,
    openSidePanelGeneric,
    closeSidePanel,
} from './sidePanel.js';

var selected_point_timespan = null;
var old_selected_point_timespan = null;

var circles = {};
var mesuresArray = [];
// Cache pour stocker les données récupérées par capteur
var mobileAirDataCache = {};
// Stockage des polylines par session pour affichage conditionnel
var sessionPolylines = {};
// Mémorisation de la dernière période sélectionnée pour l'auto refresh
var lastSelectedPeriod = null;

/**
 * Popup draggable pour la sélection dynamique des dates
 */
function showDatePickerPopupMobileAir() {
    // Supprimer d'anciens popups
    document
        .querySelectorAll('.mobileair-draggable')
        .forEach((el) => el.remove());

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

            // Vérifier si la période dépasse 31 jours
            if (diffDays > 31) {
                document.getElementById('mobileair-days-counter').textContent =
                    `⚠️ Période trop longue (${diffDays} jours) - Maximum 31 jours autorisé`;
                document.getElementById('mobileair-days-counter').style.color =
                    '#dc3545';
            } else {
                document.getElementById('mobileair-days-counter').textContent =
                    `Affichage des données sur ${diffDays} jours`;
                document.getElementById('mobileair-days-counter').style.color =
                    '#000';
            }
        }
    };

    updateDaysCounter();

    popup
        .querySelector('#mobileair-date-start')
        .addEventListener('change', () => {
            updateDaysCounter();
            validateDateRange();
        });
    popup
        .querySelector('#mobileair-date-end')
        .addEventListener('change', () => {
            updateDaysCounter();
            validateDateRange();
        });

    /**
     * Validation en temps réel de la plage de dates
     */
    const validateDateRange = () => {
        const start = document.getElementById('mobileair-date-start').value;
        const end = document.getElementById('mobileair-date-end').value;
        const applyButton = document.getElementById('mobileair-apply-dates');

        if (start && end) {
            const startObj = new Date(start);
            const endObj = new Date(end);
            const diffTime = Math.abs(endObj - startObj);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays > 31) {
                applyButton.disabled = true;
                applyButton.style.opacity = '0.5';
                applyButton.title =
                    'Période trop longue - Maximum 31 jours autorisé';
            } else {
                applyButton.disabled = false;
                applyButton.style.opacity = '1';
                applyButton.title = 'Appliquer la période sélectionnée';
            }
        } else {
            applyButton.disabled = false;
            applyButton.style.opacity = '1';
            applyButton.title = 'Appliquer la période sélectionnée';
        }
    };

    /**
     * Bouton fermer
     */
    popup
        .querySelector('.close-btn')
        .addEventListener('click', () => popup.remove());

    /**
     * Bouton réinitialiser
     */
    popup
        .querySelector('#mobileair-reset-dates')
        .addEventListener('click', () => {
            document.getElementById('mobileair-date-start').value =
                startDateStr;
            document.getElementById('mobileair-date-end').value = endDateStr;
            updateDaysCounter();
            validateDateRange();
        });

    /**
     * Bouton appliquer
     */
    popup
        .querySelector('#mobileair-apply-dates')
        .addEventListener('click', () => {
            const start = document.getElementById('mobileair-date-start').value;
            const end = document.getElementById('mobileair-date-end').value;

            if (!start || !end) {
                alert(
                    'Veuillez sélectionner une date de début et une date de fin'
                );
                return;
            }
            if (new Date(start) > new Date(end)) {
                alert('La date de début doit être antérieure à la date de fin');
                return;
            }

            // Vérifier que la période ne dépasse pas 31 jours
            const startObj = new Date(start);
            const endObj = new Date(end);
            const diffTime = Math.abs(endObj - startObj);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays > 31) {
                alert(
                    `La période sélectionnée (${diffDays} jours) dépasse la limite autorisée de 31 jours. Veuillez choisir une période plus courte.`
                );
                return;
            }

            // Mémoriser la période sélectionnée pour l'auto refresh
            lastSelectedPeriod = {
                startDate: start,
                endDate: end,
            };

            popup.remove();
            mobileair_layer.clearLayers();
            loadMobileAir(start, end);
        });

    /**
     * Rendre le popup draggable
     */
    let isDragging = false,
        offsetX = 0,
        offsetY = 0;

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
    // Vider le cache à chaque nouveau chargement
    mobileAirDataCache = {};
    sessionPolylines = {};

    // Si aucune date n'est fournie, utiliser la dernière période sélectionnée
    if (!startDate || !endDate) {
        if (
            lastSelectedPeriod &&
            lastSelectedPeriod.startDate &&
            lastSelectedPeriod.endDate
        ) {
            // Utiliser la dernière période sélectionnée pour l'auto refresh
            startDate = lastSelectedPeriod.startDate;
            endDate = lastSelectedPeriod.endDate;
            console.log(
                `Auto refresh MobileAir avec la période mémorisée: ${startDate} à ${endDate}`
            );
        } else {
            // Aucune période mémorisée, afficher la popup de sélection
            showDatePickerPopupMobileAir();
            return;
        }
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
                getDataMobileAir(
                    value['sensorToken'],
                    mesure,
                    mesureMajuscule,
                    startDate,
                    endDate
                );
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
function getDataMobileAir(
    sensorToken,
    mesure,
    mesureMajuscule,
    startDate,
    endDate
) {
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

            // Stocker les données dans le cache pour réutilisation
            mobileAirDataCache[sensorToken] = {
                data: data,
                startDate: startDate,
                endDate: endDate,
            };

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

            // Créer et stocker les polylines sans les ajouter à la layer
            Object.keys(groupedData).forEach((sessionId) => {
                const polyline = L.polyline(groupedData[sessionId], {
                    color: 'blue',
                    opacity: 0.2,
                    weight: 0.8,
                });

                // Stocker la polyline avec une clé unique (sensorToken + sessionId)
                const polylineKey = `${sensorToken}_${sessionId}`;
                sessionPolylines[polylineKey] = polyline;
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
                const frenchDate = dateMesure.toLocaleDateString(
                    'fr-FR',
                    options
                );

                let mobileAirTooltip = `
                    <b>MobileAir ${value['sensorId']} (session n° ${value['sessionId']})</b><br/>
                    ${frenchDate.slice(0, -5)}<br/>
                    ${formatPollutantName(mesureMajuscule)}: ${value[mesureMajuscule]} µg/m&sup3;
                `;

                const circle = L.circleMarker(
                    [value['lat'], value['lon']],
                    circle_param
                )
                    .bindTooltip(mobileAirTooltip, {
                        direction: 'center',
                        offset: [0, -50],
                    })
                    .on('click', function () {
                        // console.log('Click on sensor: ' + value['sensorId']);
                        openSidePanel_mobileAir(value, mesure);
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

    // Masquer toutes les polylines existantes
    hideAllSessionPolylines();

    // Afficher la polyline de la session sélectionnée
    toggleSessionPolylines(data.sensorId, data.sessionId, true);

    // Card 1
    card1Img.src = 'img/nebuleair/NebuleAir_photo.png';
    card1Title.innerHTML = 'MobileAir ' + data.sensorId;
    card1Subtitle.innerHTML = 'Capteur citoyen de mesure en mobilité';
    // card1Text.innerHTML = `Session n°${data.sessionId}`;

    // Card 2
    card2Text.innerHTML = `Le MobileAir est un capteur mobile de la qualité de l'air.
        Il fonctionne sur batterie et communique les mesures en temps réel via le réseau mobile.
        Il est équipé d'une puce GPS qui permet la géolocalisation des données.`;
    card2Link.innerHTML = 'AirCarto.fr';

    document.getElementById('togglePollutants').disabled = true;
    document.getElementById('btn_historique_3h').disabled = true;
    document.getElementById('btn_historique_24h').disabled = true;
    document.getElementById('btn_historique_7d').disabled = true;
    document.getElementById('btn_historique_365d').disabled = true;
    document.getElementById('btn_pasDeTemps_scan').disabled = true;
    document.getElementById('btn_pasDeTemps_qh').disabled = true;
    document.getElementById('btn_pasDeTemps_h').disabled = true;
    document.getElementById('btn_pasDeTemps_d').disabled = true;

    // Données historiques
    retreive_historiqueData_mobileAir(
        data.sensorId,
        data.sessionId,
        mesuresArray,
        false
    );

    openSidePanelGeneric();
}

/**
 * Récupération des données d'une session pour le graphique
 */
function retreive_historiqueData_mobileAir(
    sensorId,
    sessionId,
    mesure,
    add_mesure
) {
    const start = Date.now();

    if (add_mesure) {
        mesuresArray.push(mesure);
    }

    // console.log(`Récupération data sensor ${sensorId}, session ${sessionId}`);
    // console.log('Mesures:', mesuresArray);

    // Fonction pour créer le graphique avec les données
    const createChart = (data) => {
        const duration = (Date.now() - start) / 1000;
        // console.log(`Data gathered in %c${duration} sec`, 'color: red;');
        console.log('Data:', data);

        const filteredData = data.filter(
            (item) => item.sessionId === sessionId
        );
        // console.log('Filtered session data:', filteredData);

        // Déterminer le polluant à afficher selon la mesure sélectionnée
        const mesureActuelle = mesuresArray[0]; // Récupérer la première mesure du tableau
        const mesureMajuscule = mesureActuelle.toUpperCase();
        const dataForChart = filteredData.map((item) => ({
            x: new Date(item.time).getTime(), // millisecondes
            y: item[mesureMajuscule],
        }));

        // Graphique CanvasJS
        var chart = new CanvasJS.Chart('chartdiv_sensor', {
            zoomEnabled: true,
            exportEnabled: true,
            exportFileName: `MobileAir_${sensorId}_Session_${sessionId}_${mesureMajuscule}`,
            exportOptions: {
                exportFormat: 'PNG',
                exportFormatOptions: {
                    quality: 1,
                    backgroundColor: '#ffffff',
                    width: 800,
                    height: 400,
                },
            },
            // Optimisation de l'espace pour éviter l'espace blanc
            width: null, // Utilise toute la largeur disponible
            height: null, // Utilise toute la hauteur disponible
            title: {
                text: `Évolution ${formatPollutantName(mesureMajuscule)} - MobileAir ${sensorId}`,
                fontSize: 16,
                fontFamily: 'Arial, sans-serif',
            },
            subtitles: [
                {
                    text: `Session n°${sessionId}`,
                    fontSize: 12,
                    fontFamily: 'Arial, sans-serif',
                },
            ],
            axisY: {
                title: `${formatPollutantName(mesureMajuscule)} (µg/m³)`,
                titleFontSize: 12,
                // Optimisation de l'espace
                margin: 0,
                labelMaxWidth: 50,
            },
            axisX: {
                // Optimisation de l'espace
                margin: 0,
                labelMaxWidth: 80,
            },
            toolTip: {
                content: function (e) {
                    const pointTime = e.entries[0].dataPoint.x;
                    const pointValue = e.entries[0].dataPoint.y;
                    const date = new Date(pointTime).toLocaleString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Paris',
                    });

                    return `<b>${formatPollutantName(mesureMajuscule)}</b><br/>${date}<br/>Valeur: ${pointValue} µg/m³`;
                },
                updated: function (e) {
                    const pointTime = e.entries[0].dataPoint.x;

                    if (!selected_point_timespan) {
                        selected_point_timespan = pointTime;
                        highlight_circle_on_map(
                            selected_point_timespan,
                            old_selected_point_timespan
                        );
                    } else if (selected_point_timespan !== pointTime) {
                        old_selected_point_timespan = selected_point_timespan;
                        selected_point_timespan = pointTime;
                        highlight_circle_on_map(
                            selected_point_timespan,
                            old_selected_point_timespan
                        );
                    }
                },
            },
            data: [
                {
                    type: 'area',
                    xValueType: 'dateTime',
                    dataPoints: dataForChart,
                    name: mesureMajuscule,
                    color: '#1f77b4',
                },
            ],
        });

        chart.render();

        // Forcer le redimensionnement pour optimiser l'espace
        setTimeout(() => {
            chart.render();
        }, 100);
    };

    // Vérifier d'abord si les données sont disponibles dans le cache
    if (mobileAirDataCache[sensorId] && mobileAirDataCache[sensorId].data) {
        console.log(
            `Utilisation des données en cache pour le capteur ${sensorId}`
        );
        createChart(mobileAirDataCache[sensorId].data);
        return;
    }

    // Si pas de données en cache, faire l'appel API
    console.log(`Appel API pour récupérer les données du capteur ${sensorId}`);
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
            createChart(data);
        },
        error: function (xhr, status, error) {
            console.error(
                'Erreur récupération historique:',
                error,
                xhr.responseText
            );
        },
    });
}

/**
 * Affiche/masque les polylines d'une session spécifique
 */
function toggleSessionPolylines(sensorId, sessionId, show = true) {
    const polylineKey = `${sensorId}_${sessionId}`;
    const polyline = sessionPolylines[polylineKey];

    if (polyline) {
        if (show) {
            // Afficher la polyline
            polyline.addTo(mobileair_layer);
        } else {
            // Masquer la polyline
            mobileair_layer.removeLayer(polyline);
        }
    }
}

/**
 * Masque toutes les polylines de session
 */
function hideAllSessionPolylines() {
    Object.values(sessionPolylines).forEach((polyline) => {
        mobileair_layer.removeLayer(polyline);
    });
}

/**
 * Ferme le panneau latéral et masque les polylines MobileAir
 */
export function closeSidePanelMobileAir() {
    hideAllSessionPolylines();
    closeSidePanel();
}

/**
 * Réinitialise la période mémorisée (utile pour forcer une nouvelle sélection)
 */
export function resetMobileAirPeriod() {
    lastSelectedPeriod = null;
    console.log('Période MobileAir réinitialisée');
}

/**
 * Mise en surbrillance du point sélectionné sur la carte
 */
function highlight_circle_on_map(
    selected_point_timespan,
    old_selected_point_timespan
) {
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
