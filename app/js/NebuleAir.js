// Récupération des données des capteurs NebuleAir
// Cette fonction charge les données des capteurs NebuleAir et les affiche sur la carte

import {
    getArrayFromLocalStorage,
    pasDeTempsLocal,
    mesuresLocal,
    getColorCodeForValue,
    map,
    openSidePanelGeneric,
    nebuleairLayer,
    seuils_PM10,
    formatPollutantName,
} from '../app.js';
import { isSourceActive } from './dataSourceManager.js';
import { panelManager } from './panelManager.js';

// Variables locales au module
var state = {
    pasDeTempsChart: '1h',
    historiqueChart: '24h',
    mesuresArray: [],
    customDateRange: {
        start: null,
        end: null,
    },
};

// Fonction principale exportée
export function loadNebuleAir() {
    nebuleairLayer.clearLayers();
    var pas_de_temps = getArrayFromLocalStorage(pasDeTempsLocal);
    var mesures = getArrayFromLocalStorage(mesuresLocal);

    // Vérification si le polluant est supporté
    if (!['pm1', 'pm25', 'pm10'].includes(mesures[0])) {
        console.log('Polluant non supporté pour NebuleAir');
        return;
    }

    let mesure_StringA = mesures[0];
    let mesure_String = `${mesure_StringA}`;
    let pas_de_tempsA = pas_de_temps[0];
    let pas_de_temps_String = `${pas_de_tempsA}`;
    let mesure_majuscule = mesure_String.toUpperCase();
    let mesure_maj_pas_de_temps = mesure_majuscule;

    if (pas_de_temps_String != '2min') {
        mesure_maj_pas_de_temps = mesure_majuscule + '_' + pas_de_temps_String;
    }

    $.ajax({
        method: 'GET',
        url: 'https://api.aircarto.fr/capteurs/metadata?capteurType=NebuleAir',
        success: function (data) {
            console.log('NebuleAir AirCarto : ', data);
            var displayed = data.filter((e) => e.displayMap == true);
            $.each(displayed, function (key, value) {
                var icon_param = {
                    iconUrl: 'img/nebuleair/nebuleAir_default.png',
                    iconSize: [40, 40],
                    iconAnchor: [5, 40],
                };

                if (value.connected) {
                    icon_param.iconSize = [50, 50];
                    if (mesures == 'pm1' || mesures == 'pm25') {
                        let valueToCheck = value[mesure_maj_pas_de_temps];
                        let colorCode = getColorCodeForValue(
                            valueToCheck,
                            mesures
                        );
                        if (colorCode !== 'default') {
                            icon_param.iconUrl =
                                'img/nebuleair/nebuleAir_' + colorCode + '.png';
                        }
                    }
                    if (mesures == 'pm10') {
                        for (let key in seuils_PM10) {
                            let code = seuils_PM10[key].code;
                            let min = seuils_PM10[key].min;
                            let max = seuils_PM10[key].max;
                            let value_rounded = Math.round(
                                value[mesure_maj_pas_de_temps]
                            );
                            if (value_rounded >= min && value_rounded <= max) {
                                icon_param.iconUrl =
                                    'img/nebuleair/nebuleAir_' + code + '.png';
                            }
                        }
                    }
                }

                var nebuleAir_icon = L.icon(icon_param);
                let nebuleAirMarker = L.marker(
                    [value['latitude'], value['longitude']],
                    {
                        icon: nebuleAir_icon,
                        deviceId: value['sensorId'],
                    }
                ).addTo(nebuleairLayer);

                if (!window.deviceMarkers) window.deviceMarkers = {};
                window.deviceMarkers[value['sensorId']] = {
                    marker: nebuleAirMarker,
                    data: value,
                };

                if (value.connected) {
                    let roundedvalue = Math.round(
                        parseFloat(value[mesure_maj_pas_de_temps])
                    );
                    var textSize = 32;
                    var x_position = -10;
                    var y_position = 38;

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
                        html: `<div id="textDiv" style="font-size: ${textSize}px;">${roundedvalue}</div>`,
                        iconAnchor: [x_position, y_position],
                    });

                    let textMarker = L.marker(
                        [value['latitude'], value['longitude']],
                        {
                            icon: text_param,
                            deviceId: value['sensorId'],
                        }
                    )
                        .on('click', function () {
                            if (
                                globalSelectedMarker &&
                                globalSelectedMarker !== nebuleAirMarker
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

                            nebuleAirMarker.setZIndexOffset(1000);
                            textMarker.setZIndexOffset(1000);
                            nebuleAirMarker._icon.classList.add(
                                'marker-selected'
                            );
                            textMarker._icon.classList.add('marker-selected');

                            globalSelectedMarker = nebuleAirMarker;
                            globalSelectedText = textMarker;
                            globalSelectedDeviceId = value['sensorId'];

                            openSidePanelNebuleAir(
                                value,
                                pas_de_temps_String,
                                state.historiqueChart,
                                mesures
                            );
                        })
                        .addTo(nebuleairLayer);

                    function highlightMarker() {
                        nebuleAirMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        // console.log('value: ', value);
                        // console.log(
                        //     'value: ',
                        //     new Date(value.time).toLocaleString()
                        // );

                        const tooltip = document.createElement('div');
                        tooltip.className = 'custom-tooltip';
                        tooltip.innerHTML = `
                            <div class="card border-0 shadow-sm">
                                <div class="card-body p-2">
                                    <h6 class="card-title mb-1">${value['sensorId']}</h6>
                                    <div class="d-flex flex-column">
                                        <small class="text-muted mb-1">
                                            <i class="bi bi-info-circle me-1"></i>
                                            NebuleAir - AirCarto
                                        </small>
                                        <small class="text-muted">
                                            Polluants mesurés:
                                            <ul class="list-unstyled ms-3 mb-0">
                                                ${value.PM1 !== undefined ? '<li><span class="text-success">●</span><span class="fw-semibold"> PM₁</span></li>' : ''}
                                                ${value.PM25 !== undefined ? '<li><span class="text-success">●</span><span class="fw-semibold"> PM₂.₅</span></li>' : ''}
                                                ${value.PM10 !== undefined ? '<li><span class="text-success">●</span><span class="fw-semibold"> PM₁₀</span></li>' : ''}
                                            </ul>
                                        </small>
                                    </div>
                                </div>
                            </div>
                        `;

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

                        document.body.appendChild(tooltip);
                        nebuleAirMarker.tooltip = tooltip;
                        textMarker.tooltip = tooltip;
                    }

                    function resetMarker() {
                        if (globalSelectedMarker !== nebuleAirMarker) {
                            nebuleAirMarker.setZIndexOffset(0);
                            textMarker.setZIndexOffset(0);
                        }

                        if (nebuleAirMarker.tooltip) {
                            nebuleAirMarker.tooltip.remove();
                            nebuleAirMarker.tooltip = null;
                            textMarker.tooltip = null;
                        }
                    }

                    nebuleAirMarker
                        .on('mouseover', highlightMarker)
                        .on('mouseout', resetMarker);
                    textMarker
                        .on('mouseover', highlightMarker)
                        .on('mouseout', resetMarker);
                }
            });
            map.addLayer(nebuleairLayer);
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    });
}

export function openSidePanelNebuleAir(
    data,
    pas_de_temps,
    historique,
    mesures
) {
    if (!isSourceActive('nebuleair')) {
        return;
    }

    const closeButton = document
        .getElementById('toggleSidePanel')
        .querySelector('i');
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');
    closeButton.parentElement.classList.remove('hidden');

    const fullScreenButton = document
        .getElementById('expandSidePanel')
        .querySelector('i');
    fullScreenButton.classList.replace('bi-expand', 'bi-compress');
    fullScreenButton.parentElement.classList.remove('hidden');

    card1_img.src = 'img/nebuleair/NebuleAir_photo.png';
    card1_title.innerHTML = data.sensorId;
    card1_subtitle.innerHTML = 'Capteur citoyen';
    card1_text.innerHTML = '';

    card2_text.innerHTML =
        "Le capteur NebuleAir est un dispositif de mesure de l'air extérieur développé par AirCarto et AtmoSud. Il peut être placé sur le rebord d'une fenêtre ou sur un balcon afin de mesurer le taux de particules fines présent dans l'air. Il communique ses données toutes 2 minutes et les envoies sur les serveurs d'AirCarto via une connexion WIFI.";
    card2_link.innerHTML = 'AirCarto.fr';
    card2_link.href = 'https://aircarto.fr';

    // Utiliser le panelManager pour ouvrir le panneau
    panelManager.openPanel('nebuleair', data.sensorId, {
        pasDeTempsChart: pas_de_temps,
        historiqueChart: state.historiqueChart,
        mesuresArray: mesures,
        customDateRange: {
            start: null,
            end: null,
        },
    });

    openSidePanelGeneric();
}

export function retreive_historiqueData_nebuleAir(
    sensorId,
    pas_de_temps,
    historique,
    mesuresArray = [],
    useCustomRange = false,
    custom_start = null,
    custom_end = null
) {
    console.log(
        'Début de retreive_historiqueData_nebuleAir avec les paramètres:',
        {
            sensorId,
            pas_de_temps,
            historique,
            mesuresArray,
            useCustomRange,
            custom_start,
            custom_end,
        }
    );
    console.log('mesuresArray:', mesuresArray);

    if (!isSourceActive('nebuleair')) {
        console.log('Source NebuleAir non active, annulation de la requête');
        return;
    }

    if (!sensorId) {
        console.log('Aucun capteur sélectionné, annulation de la requête');
        return;
    }

    const start = Date.now();
    const chartDiv = document.getElementById('chartdiv_sensor');
    if (!chartDiv) {
        console.error('Élément chartdiv_sensor non trouvé');
        return;
    }
    chartDiv.innerHTML = '';

    var api_pas_de_temps;
    switch (pas_de_temps) {
        case '2min':
            api_pas_de_temps = '2m';
            break;
        case 'qh':
            api_pas_de_temps = '15m';
            break;
        case 'h':
            api_pas_de_temps = '1h';
            break;
        case 'd':
            api_pas_de_temps = '1d';
            break;
        default:
            api_pas_de_temps = pas_de_temps;
    }

    var full_url;
    if (useCustomRange && custom_start && custom_end) {
        full_url = `https://api.aircarto.fr/capteurs/dataNebuleAir?capteurID=${sensorId}&start=${custom_start}&end=${custom_end}&freq=${api_pas_de_temps}`;
    } else {
        full_url = `https://api.aircarto.fr/capteurs/dataNebuleAir?capteurID=${sensorId}&start=-${historique}&stop=now&freq=${api_pas_de_temps}`;
    }

    console.log("URL de l'API:", full_url);

    $.ajax({
        method: 'GET',
        url: full_url,
        success: function (data) {
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(`Données récupérées en ${requestTimer} secondes`);
            console.log('Données reçues:', data);

            var baseInterval_timeUnit_local;
            var baseInterval_count;
            if (pas_de_temps == '2m' || pas_de_temps == '2min') {
                baseInterval_timeUnit_local = 'minute';
                baseInterval_count = 2;
            }
            if (pas_de_temps == '15m' || pas_de_temps == 'qh') {
                baseInterval_timeUnit_local = 'minute';
                baseInterval_count = 15;
            }
            if (pas_de_temps == '1h' || pas_de_temps == 'h') {
                baseInterval_timeUnit_local = 'hour';
                baseInterval_count = 1;
            }
            if (
                pas_de_temps == '24h' ||
                pas_de_temps == '1d' ||
                pas_de_temps == 'd'
            ) {
                baseInterval_timeUnit_local = 'day';
                baseInterval_count = 1;
            }

            if (window.amchart_root) {
                window.amchart_root.dispose();
            }

            am5.ready(function () {
                createNebuleAirChart(
                    data,
                    {
                        timeUnit: baseInterval_timeUnit_local,
                        count: baseInterval_count,
                    },
                    mesuresArray
                );
            });
        },
        error: function (xhr, status, error) {
            console.error('Erreur lors de la récupération des données:', error);
            console.error('Status:', status);
            console.error('Réponse:', xhr.responseText);
        },
    });
}

// Configuration du graphique principal
function createChart(root) {
    return root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: 'panX',
            wheelY: 'zoomX',
            paddingLeft: 0,
            paddingBottom: 100,
            layout: am5.GridLayout.new(root, {
                maxColumns: 1,
                fixedWidthGrid: true,
            }),
        })
    );
}

// Configuration des axes
function configureAxes(chart, root, baseInterval) {
    const xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
            maxDeviation: 0.2,
            baseInterval: {
                timeUnit: baseInterval.timeUnit,
                count: baseInterval.count,
            },
            renderer: am5xy.AxisRendererX.new(root, {
                minorGridEnabled: true,
            }),
            tooltip: am5.Tooltip.new(root, {}),
        })
    );

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            min: 0,
        })
    );

    return { xAxis, yAxis };
}

// Configuration du curseur
function configureCursor(chart, root) {
    const cursor = chart.set(
        'cursor',
        am5xy.XYCursor.new(root, {
            behavior: 'zoomX',
        })
    );
    cursor.lineY.set('visible', false);
    return cursor;
}

// Détection des polluants disponibles
function getAvailablePollutants(data) {
    if (!data || data.length === 0) return [];

    const firstDataPoint = data[0];
    const pollutants = [];

    if (firstDataPoint.PM1 !== undefined) pollutants.push('PM1');
    if (firstDataPoint.PM25 !== undefined) pollutants.push('PM2.5');
    if (firstDataPoint.PM10 !== undefined) pollutants.push('PM10');

    return pollutants;
}

// Création d'une série pour un polluant
function createSeries(chart, root, pollutant, axes, data) {
    const polluantCompare = pollutant.toLowerCase().replace('2.5', '25');
    const dataPoints = data.map((e) => ({
        value: e[pollutant === 'PM2.5' ? 'PM25' : pollutant],
        date: new Date(e.time).getTime(),
    }));

    const series = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
            name: pollutant,
            xAxis: axes.xAxis,
            yAxis: axes.yAxis,
            valueYField: 'value',
            valueXField: 'date',
            tooltip: am5.Tooltip.new(root, {
                labelText: `${formatPollutantName(pollutant)}: {valueY} µg/m³`,
            }),
        })
    );

    series.strokes.template.setAll({
        strokeWidth: 2,
    });

    series.data.setAll(dataPoints);
    series.appear(1000);

    return {
        series,
        name: pollutant,
        compare: polluantCompare,
    };
}

// Configuration de la légende
// function configureLegend(chart, root, allSeries, mesuresArray) {
//     const legend = chart.children.push(
//         am5.Legend.new(root, {
//             centerX: am5.percent(50),
//             x: am5.percent(50),
//             y: am5.percent(95),
//             layout: am5.GridLayout.new(root, {
//                 maxColumns: 2,
//                 fixedWidthGrid: true,
//             }),
//             paddingTop: 10,
//             paddingBottom: 10,
//             marginTop: 10,
//             marginBottom: 10,
//         })
//     );

//     legend.itemContainers.template.events.on('click', function (ev) {
//         const clickedSeries = ev.target.dataItem.dataContext;
//         const seriesInfo = allSeries.find((s) => s.series === clickedSeries);

//         if (seriesInfo) {
//             if (mesuresArray.includes(seriesInfo.compare)) {
//                 seriesInfo.series.set('visible', false);
//                 mesuresArray = mesuresArray.filter(
//                     (item) => item !== seriesInfo.compare
//                 );
//             } else {
//                 seriesInfo.series.set('visible', true);
//                 mesuresArray.push(seriesInfo.compare);
//             }
//         }
//     });

//     legend.data.setAll(chart.series.values);
//     return legend;
// }

// Fonction principale de création du graphique
function createNebuleAirChart(data, baseInterval, mesuresArray) {
    try {
        // Initialisation
        window.amchart_root = am5.Root.new('chartdiv_sensor');
        window.amchart_root.locale = am5locales_fr_FR;

        // Création du graphique
        const chart = createChart(window.amchart_root);

        // Configuration des axes
        const axes = configureAxes(chart, window.amchart_root, baseInterval);

        // Configuration du curseur
        configureCursor(chart, window.amchart_root);

        // Détection des polluants disponibles
        const availablePollutants = getAvailablePollutants(data);

        // Création des séries
        const allSeries = availablePollutants
            .filter((pollutant) => {
                const polluantCompare = pollutant
                    .toLowerCase()
                    .replace('2.5', '25');
                return mesuresArray.includes(polluantCompare);
            })
            .map((pollutant) =>
                createSeries(chart, window.amchart_root, pollutant, axes, data)
            );

        // Configuration de la légende
        // configureLegend(chart, window.amchart_root, allSeries, mesuresArray);

        // Animation finale
        chart.appear(1000, 100);
    } catch (error) {
        console.error('Erreur lors de la création du graphique:', error);
        // Gestion des erreurs à implémenter selon les besoins
    }
}

export const { pasDeTempsChart, historiqueChart, mesuresArray } = state;
