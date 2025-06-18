// Récupération des données des capteurs NebuleAir
// Cette fonction charge les données des capteurs NebuleAir et les affiche sur la carte

import { nebuleairLayer } from './layers.js';
import {
    formatPollutantName,
    getArrayFromLocalStorage,
    getColorCodeForValue,
} from './utils.js';
import { apiAirCarto } from '../config.js';

import { isSourceActive } from './dataSourceManager.js';
import { panelManager } from './panelManager.js';
import { startSpinner, stopSpinner } from './spinnerManager.js';
import { openSidePanelGeneric } from './sidePanel.js';
import { POLLUTANT_COLORS } from './appConfig.js';
import { createNebuleAirMarker } from './markerManager.js';
// Variables locales au module
const state = {
    pasDeTempsChart: '1h',
    historiqueChart: '24h',
    mesuresArray: [],
    customDateRange: {
        start: null,
        end: null,
    },
};

let isYAxisCapped = false;
let yAxisMaxValue = 90;

export function toggleYAxisCapping() {
    isYAxisCapped = !isYAxisCapped;
    updateYAxisMax();
    return isYAxisCapped;
}

export function setYAxisMaxValue(value) {
    yAxisMaxValue = value;
    if (isYAxisCapped) {
        updateYAxisMax();
    }
}

function updateYAxisMax() {
    if (window.amchart_root) {
        const chart = window.amchart_root.container.children.getIndex(0);
        if (chart) {
            const yAxis = chart.yAxes.getIndex(0);
            if (yAxis) {
                yAxis.set('max', isYAxisCapped ? yAxisMaxValue : undefined);
            }
        }
    }
}

// Fonction principale exportée
export function loadNebuleAir() {
    nebuleairLayer.clearLayers();
    const pasDeTemps = getArrayFromLocalStorage('pasDeTempsLocal');
    const mesures = getArrayFromLocalStorage('mesuresLocal');

    // Vérification si le polluant est supporté
    if (!['pm1', 'pm25', 'pm10'].includes(mesures[0])) {
        console.log('Polluant non supporté pour NebuleAir');
        return;
    }

    const mesure_StringA = mesures[0];
    const mesure_String = `${mesure_StringA}`;
    const pasDeTempsA = pasDeTemps[0];
    const pasDeTemps_String = `${pasDeTempsA}`;
    const mesure_majuscule = mesure_String.toUpperCase();
    let mesure_maj_pasDeTemps = mesure_majuscule;

    if (pasDeTemps_String != '2min' && pasDeTemps_String != 'instantane') {
        mesure_maj_pasDeTemps = mesure_majuscule + '_' + pasDeTemps_String;
    }

    fetch(
        `${apiAirCarto.urlBase}${apiAirCarto.urlCapteursMetadata}?capteurType=NebuleAir`
    )
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            const displayed = data.filter((e) => e.displayMap == true);
            displayed.forEach((value) => {
                const { nebuleAirMarker, textMarker } = createNebuleAirMarker(
                    value,
                    mesure_maj_pasDeTemps,
                    mesures
                );

                nebuleAirMarker.addTo(nebuleairLayer);
                if (textMarker) {
                    textMarker.addTo(nebuleairLayer);
                }
            });
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

export function openSidePanelNebuleAir(data, pasDeTemps, historique, mesures) {
    if (!isSourceActive('nebuleair')) {
        return;
    }

    if (pasDeTemps === 'd') {
        state.historiqueChart = '7d';
    }

    // Stockage des données du capteur sélectionné
    window.lastSelectedDeviceData = data;

    card1Img.src = 'img/nebuleair/NebuleAir_photo.png';
    card1Title.innerHTML = data.sensorId;
    card1Subtitle.innerHTML = 'Capteur citoyen';
    card1Text.innerHTML = '';

    card2Text.innerHTML =
        "Le capteur NebuleAir est un dispositif de mesure de l'air extérieur développé par AirCarto et AtmoSud. Il peut être placé sur le rebord d'une fenêtre ou sur un balcon afin de mesurer le taux de particules fines présent dans l'air. Il communique ses données toutes 2 minutes et les envoies sur les serveurs d'AirCarto via une connexion WIFI.";
    card2Link.innerHTML = 'AirCarto.fr';
    card2Link.href = 'https://aircarto.fr';

    // Utiliser le panelManager pour ouvrir le panneau

    if (pasDeTemps === 'instantane') {
        pasDeTemps = '2min';
    }
    panelManager.openPanel('nebuleair', data.sensorId, {
        pasDeTempsChart: pasDeTemps,
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
    pasDeTemps,
    historique,
    mesuresArray = [],
    useCustomRange = false,
    customStart = null,
    customEnd = null
) {
    if (pasDeTemps === 'brute') {
        pasDeTemps = '2m';
    }

    for (let i = 0; i < mesuresArray.length; i++) {
        if (mesuresArray[i] === 'pm2.5') {
            mesuresArray[i] = 'pm25';
        }
    }

    if (!isSourceActive('nebuleair')) {
        console.log('Source NebuleAir non active, annulation de la requête');
        return;
    }

    if (!sensorId) {
        console.log('Aucun capteur sélectionné, annulation de la requête');
        return;
    }

    startSpinner('Chargement des données historiques...');

    const start = Date.now();
    const chartDiv = document.getElementById('chartdiv_sensor');
    if (!chartDiv) {
        console.error('Élément chartdiv_sensor non trouvé');
        return;
    }
    chartDiv.innerHTML = '';

    let api_pasDeTemps;
    switch (pasDeTemps) {
        case '2min':
        case 'instantane':
            api_pasDeTemps = '2m';
            break;
        case 'qh':
            api_pasDeTemps = '15m';
            break;
        case 'h':
            api_pasDeTemps = '1h';
            break;
        case 'd':
            api_pasDeTemps = '1d';
            break;
        default:
            api_pasDeTemps = pasDeTemps;
    }

    let fullUrl;
    if (useCustomRange && customStart && customEnd) {
        fullUrl = `${apiAirCarto.urlBase}${apiAirCarto.urlCapteursData}?capteurID=${sensorId}&start=${customStart}&end=${customEnd}&freq=${api_pasDeTemps}`;
    } else {
        fullUrl = `${apiAirCarto.urlBase}${apiAirCarto.urlCapteursData}?capteurID=${sensorId}&start=-${historique}&stop=now&freq=${api_pasDeTemps}`;
    }

    fetch(fullUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            // console.log(`Données récupérées en ${requestTimer} secondes`);
            // console.log('Données reçues:', data);

            let baseInterval_timeUnit_local;
            let baseInterval_count;
            if (pasDeTemps == '2m' || pasDeTemps == '2min') {
                baseInterval_timeUnit_local = 'minute';
                baseInterval_count = 2;
            }
            if (pasDeTemps == '15m' || pasDeTemps == 'qh') {
                baseInterval_timeUnit_local = 'minute';
                baseInterval_count = 15;
            }
            if (pasDeTemps == '1h' || pasDeTemps == 'h') {
                baseInterval_timeUnit_local = 'hour';
                baseInterval_count = 1;
            }
            if (
                pasDeTemps == '24h' ||
                pasDeTemps == '1d' ||
                pasDeTemps == 'd'
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
        })
        .catch((error) => {
            stopSpinner();
            console.error('Erreur lors de la récupération des données:', error);
        });
}

// Configuration du graphique principal
function createChart(root, sensorName) {
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: 'panX',
            wheelY: 'zoomX',
            paddingLeft: 0,
            paddingBottom: 50,
            layout: am5.GridLayout.new(root, {
                maxColumns: 1,
                fixedWidthGrid: true,
            }),
            colors: {
                colors: [],
            },
            height: am5.percent(100),
            paddingRight: 15,
        })
    );

    // Ajout de la gestion du redimensionnement
    chart.events.on('sizechanged', function () {
        chart.set('height', am5.percent(100));
    });

    chart.children.unshift(
        am5.Label.new(root, {
            text: `Données du capteur ${sensorName}`, // <-- Titre personnalisé
            fontSize: 20,
            fontWeight: '500',
            textAlign: 'center',
            x: am5.p50,
            centerX: am5.p50,
            paddingTop: 10,
            // paddingBottom: 10,
        })
    );

    return chart;
}

// Configuration des axes
function configureAxes(chart, root, baseInterval) {
    const unite = 'µg/m³';
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
            dateFormatter: {
                format: function (date) {
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1)
                        .toString()
                        .padStart(2, '0');
                    return `${day}/${month}`;
                },
            },
        })
    );

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            numberFormat: `#.#`,
            min: 0,
            max: isYAxisCapped ? yAxisMaxValue : undefined,
        })
    );

    // Ajouter le label après la création de l'axe
    yAxis.children.unshift(
        am5.Label.new(root, {
            text: unite,
            rotation: -90,
            y: am5.p50,
            centerX: am5.p50,
            centerY: am5.p50,
            fontWeight: '500',
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
    if (firstDataPoint.PM25 !== undefined) pollutants.push('PM25');
    if (firstDataPoint.PM10 !== undefined) pollutants.push('PM10');

    return pollutants;
}

// Création d'une série pour un polluant
function createSeries(chart, root, pollutant, axes, data) {
    const polluantCompare = pollutant.toLowerCase().replace('2.5', '25');
    const colorKey = polluantCompare === 'pm2.5' ? 'pm25' : polluantCompare;
    const color = POLLUTANT_COLORS[colorKey] || '#000000';

    const dataPoints = data.map((e) => ({
        value: e[pollutant === 'PM2.5' ? 'PM25' : pollutant],
        date: new Date(e.time).getTime(),
    }));

    const series = chart.series.push(
        am5xy.LineSeries.new(root, {
            name: pollutant,
            xAxis: axes.xAxis,
            yAxis: axes.yAxis,
            valueYField: 'value',
            valueXField: 'date',
            tooltip: am5.Tooltip.new(root, {
                labelText: `${formatPollutantName(pollutant)}: {valueY} µg/m³`,
            }),
            fill: am5.color(color),
            stroke: am5.color(color),
            connect: false,
        })
    );

    series.strokes.template.setAll({
        strokeWidth: 2,
        stroke: am5.color(color),
        strokeDasharray: [5, 5],
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
function configureLegend(chart, root, allSeries, mesuresArray) {
    const legend = chart.children.push(
        am5.Legend.new(root, {
            centerX: am5.percent(50),
            x: am5.percent(60),
            y: am5.percent(20),
            layout: am5.GridLayout.new(root, {
                maxColumns: 3,
                fixedWidthGrid: true,
            }),
            paddingTop: 10,
            paddingBottom: 10,
            marginBottom: 10,
        })
    );

    legend.data.setAll(chart.series.values);
    return legend;
}

// Fonction principale de création du graphique
function createNebuleAirChart(data, baseInterval, mesuresArray) {
    try {
        // Initialisation
        window.amchart_root = am5.Root.new('chartdiv_sensor');
        window.amchart_root.locale = am5locales_fr_FR;

        // Vérification des données
        if (!data || data.length === 0) {
            const chartDiv = document.getElementById('chartdiv_sensor');
            if (chartDiv) {
                chartDiv.innerHTML = `
                    <div class="alert alert-warning m-3" role="alert">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Aucune donnée historique disponible pour ce capteur.
                    </div>
                `;
            }
            stopSpinner();
            return;
        }

        const sensorName = data[0].sensorId;

        // Création du graphique
        const chart = createChart(window.amchart_root, sensorName);

        // Configuration des axes
        const axes = configureAxes(chart, window.amchart_root, baseInterval);

        // Configuration du curseur
        configureCursor(chart, window.amchart_root);

        // Détection des polluants disponibles
        const availablePollutants = getAvailablePollutants(data);

        // Création des séries
        availablePollutants
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
        configureLegend(
            chart,
            window.amchart_root,
            availablePollutants,
            mesuresArray
        );
        // Animation finale
        chart.appear(1000, 100);
        stopSpinner();
    } catch (error) {
        console.error('Erreur lors de la création du graphique:', error);
        const chartDiv = document.getElementById('chartdiv_sensor');
        if (chartDiv) {
            chartDiv.innerHTML = `
                <div class="alert alert-danger m-3" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Une erreur est survenue lors de l'affichage des données.
                </div>
            `;
        }
        stopSpinner();
    }
}

export const { pasDeTempsChart, historiqueChart, mesuresArray } = state;
