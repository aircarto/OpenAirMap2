/**
 * Module de gestion des stations de référence AtmoSud
 * Ce module gère l'affichage et l'interaction avec les stations de référence AtmoSud
 */

import { atmoRefLayer } from './layers.js';
import {
    formatPollutantName,
    getArrayFromLocalStorage,
    getColorCodeForValue,
    formatTimeAgo,
} from './utils.js';
import { isSourceActive } from './dataSourceManager.js';
import { panelManager } from './panelManager.js';
import { startSpinner, stopSpinner } from './spinnerManager.js';
import { apiAtmoSud } from '../config.js';
import { openSidePanelGeneric } from './sidePanel.js';
import {
    createRefStationMarker,
    createRefDefaultMarkers,
} from './markerManager.js';
import { toastManager } from './toaster.js';
import { POLLUTANT_COLORS } from './appConfig.js';

// Variables locales au module
const state = {
    pasDeTempsChart: '1h',
    pasDeTempsAtmo: '',
    pasDeTemps: '',
    historiqueChart: '24h',
    mesuresArray: [],
    globalSelectedDeviceId: null,
    customDateRange: {
        start: null,
        end: null,
    },
};

// Déclaration des variables pour les boutons
const buttons = {
    historique: {
        custom: null,
        startDate: null,
        endDate: null,
        '1h': null,
        '3h': null,
        '24h': null,
        '7d': null,
        '30d': null,
        '365d': null,
    },
    pasDeTemps: {
        '2min': null,
        qh: null,
        h: null,
        d: null,
    },
    polluants: {
        pm1: null,
        pm25: null,
        pm10: null,
        no2: null,
        o3: null,
        so2: null,
        h2s: null,
        nh3: null,
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

// Fonctions utilitaires pour la gestion d'amCharts
function createChart(root, stationName) {
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

    // ➕ Ajout du titre du graphique
    chart.children.unshift(
        am5.Label.new(root, {
            text: `Données de la station ${stationName}`,
            fontSize: 20,
            fontWeight: '500',
            textAlign: 'center',
            x: am5.p50,
            centerX: am5.p50,
            paddingTop: 10,
            paddingBottom: 10,
        })
    );

    return chart;
}

function configureAxes(chart, root, baseInterval, unite) {
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
            min: 0,
            max: isYAxisCapped ? yAxisMaxValue : undefined,
            numberFormat: `#.# `,
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

function createSeries(chart, root, pollutant, axes, data, unite) {
    const polluantCompare = pollutant.toLowerCase().replace('2.5', '25');
    const colorKey = polluantCompare === 'pm2.5' ? 'pm25' : polluantCompare;
    const color = POLLUTANT_COLORS[colorKey] || '#000000';

    const validatedData = data.filter((item) => item.validated);
    const nonValidatedData = data.filter((item) => !item.validated);

    const series = chart.series.push(
        am5xy.LineSeries.new(root, {
            name: `${pollutant.toUpperCase()} (Validée)`,
            xAxis: axes.xAxis,
            yAxis: axes.yAxis,
            valueYField: 'value',
            valueXField: 'date',
            tooltip: am5.Tooltip.new(root, {
                labelText: `${formatPollutantName(pollutant.toUpperCase())}: {valueY} ${unite} (Validée)`,
            }),
            fill: am5.color(color),
            stroke: am5.color(color),
            connect: false,
        })
    );

    series.strokes.template.setAll({
        strokeWidth: 2,
        stroke: am5.color(color),
    });

    series.data.setAll(validatedData);
    series.appear(1000);

    // Création de la série pour les données non validées
    const nonValidatedSeries = chart.series.push(
        am5xy.LineSeries.new(root, {
            name: `${pollutant.toUpperCase()} (Non validée)`,
            xAxis: axes.xAxis,
            yAxis: axes.yAxis,
            valueYField: 'value',
            valueXField: 'date',
            tooltip: am5.Tooltip.new(root, {
                labelText: `${formatPollutantName(pollutant.toUpperCase())}: {valueY} µg/m³ (Non validée)`,
            }),
            fill: am5.color(color),
            stroke: am5.color(color),
            connect: false,
        })
    );

    nonValidatedSeries.strokes.template.setAll({
        strokeWidth: 2,
        stroke: am5.color(color),
        strokeDasharray: [5, 5],
    });

    nonValidatedSeries.data.setAll(nonValidatedData);
    nonValidatedSeries.appear(1000);

    return {
        series: [series, nonValidatedSeries],
        name: pollutant,
        compare: polluantCompare,
    };
}

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

    // Ajout de toutes les séries à la légende
    allSeries.forEach((seriesGroup) => {
        if (Array.isArray(seriesGroup.series)) {
            seriesGroup.series.forEach((series) => {
                legend.data.push(series);
            });
        }
    });

    return legend;
}

/**
 * Fonction principale pour charger les infos des stations de référence AtmoSud
 * Récupère les données des stations et les affiche sur la carte
 * Call depuis l'API
 * trigger createStationMarker pour la création des points sur la carte
 */
export function loadAtmoSudStationsRef() {
    const start = Date.now();
    const today = new Date();

    // Initialisation de la couche si elle n'existe pas
    if (!window.atmoRefLayer) {
        window.atmoRefLayer = atmoRefLayer;
    }

    window.atmoRefLayer.clearLayers();

    // S'assurer que la couche est sur la carte
    if (!window.atmoRefLayer) {
        window.atmoRefLayer = atmoRefLayer;
    }

    state.pasDeTemps = getArrayFromLocalStorage('pasDeTempsLocal');

    // Conversion du pas de temps pour l'API AtmoSud
    switch (state.pasDeTemps[0]) {
        case '2min':
            state.pasDeTempsAtmo = 'brute';
            break;
        case 'instantané':
            state.pasDeTempsAtmo = 'quart-horaire';
            break;
        case 'qh':
            state.pasDeTempsAtmo = 'quart-horaire';
            break;
        case 'h':
            state.pasDeTempsAtmo = 'horaire';
            break;
        case 'd':
            state.pasDeTempsAtmo = 'journalière';
            break;
    }

    // Récupération et conversion des mesures
    const mesure = getArrayFromLocalStorage('mesuresLocal');
    let mesureAtmo = mesure[0];
    if (mesure[0] === 'pm25') {
        mesureAtmo = 'pm2.5';
    }

    // Vérification de la disponibilité des données
    if (state.pasDeTemps[0] === '2min') {
        toastManager.atmoRefTimeStepWarning();
        return;
    }

    // Initialisation de l'objet global pour les stations
    if (!window.stationMarkers) {
        window.stationMarkers = {};
    }

    // Construction de l'URL pour la première requête API
    const fullUrlStations = `
        ${apiAtmoSud.urlBase}${apiAtmoSud.urlStations}?
        format=json&
        nom_polluant=${mesureAtmo}&
        station_en_service=true&
        download=false&
        metadata=true
    `.replace(/\s+/g, '');

    // Premier appel API pour obtenir les informations des stations
    fetch(fullUrlStations)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            // Traitement des stations actives
            let stationsActives = 0;
            window.stationsRef = []; // Initialisation de window.stationsRef
            data.stations.forEach((item) => {
                const dateFinStation = new Date(item.date_fin_mesure);
                if (today < dateFinStation || item.date_fin_mesure === null) {
                    window.stationMarkers[item.id_station] = {
                        data: item,
                        hasValue: false,
                    };
                    window.stationsRef.push(item); // Ajout de la station active à window.stationsRef
                    stationsActives++;
                }
            });

            // Création des marqueurs par défaut pour toutes les stations actives
            createRefDefaultMarkers();

            // Construction de l'URL pour la deuxième requête API
            let delais = '';
            if (state.pasDeTemps[0] === 'instantane') {
                delais = '181';
            } else if (state.pasDeTemps[0] === 'qh') {
                delais = '19';
            } else if (state.pasDeTemps[0] === 'h') {
                delais = '64';
            } else if (state.pasDeTemps[0] === 'd') {
                delais = '1444';
            }
            const fullUrlDerniere = `
                ${apiAtmoSud.urlBase}${apiAtmoSud.urlStationsMesuresDerniere}?
                format=json&
                nom_polluant=${mesureAtmo}&
                temporalite=${state.pasDeTemps[0] === 'instantane' ? 'quart-horaire' : state.pasDeTempsAtmo}&
                delais=${delais}&
                download=false
            `.replace(/\s+/g, '');

            return fetch(fullUrlDerniere)
                .then((response) => {
                    if (!response.ok) {
                        console.warn(
                            `Erreur lors de la récupération des mesures: ${response.status}`
                        );
                        return { mesures: [] }; // Retourne un tableau vide en cas d'erreur
                    }
                    return response.json();
                })
                .then((data) => ({ data, url: fullUrlDerniere }));
        })
        .then((result) => {
            const { data, url: fullUrlDerniere } = result;
            // Traitement des données de mesure
            if (data.mesures && data.mesures.length > 0) {
                data.mesures.forEach((value) => {
                    const stationData =
                        window.stationMarkers[value.id_station]?.data;
                    if (!stationData) return;

                    const valeurPolluant = value.valeur;

                    const iconParam = {
                        iconUrl:
                            'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                        iconSize: [50, 50],
                        iconAnchor: [5, 40],
                        popupAnchor: [0, -25],
                        tooltipAnchor: [0, -25],
                        className: value.id_station,
                    };

                    const colorCode = getColorCodeForValue(
                        valeurPolluant,
                        mesure[0]
                    );
                    if (colorCode !== 'default') {
                        iconParam.iconUrl = `img/stationsRefAtmoSud/refStationAtmoSud_${colorCode}.png`;
                    }

                    createRefStationMarker(
                        value,
                        iconParam,
                        stationData,
                        mesure
                    );
                });
            }

            // S'assurer que la couche est sur la carte
            if (!window.atmoRefLayer) {
                window.atmoRefLayer = atmoRefLayer;
            }
        })
        .catch((error) => {
            console.error('Error fetching data:', error);
            // En cas d'erreur, on s'assure que les marqueurs par défaut sont affichés
            if (
                window.stationMarkers &&
                Object.keys(window.stationMarkers).length > 0
            ) {
                createRefDefaultMarkers();
                // S'assurer que la couche est sur la carte
                if (!window.atmoRefLayer) {
                    window.atmoRefLayer = atmoRefLayer;
                }
            }
        });
}

/**
 * Récupère l'image d'une station AtmoSud si disponible
 * @param {string} stationId - ID de la station
 * @returns {Promise<string>} URL de l'image de la station ou URL de l'image par défaut
 */
async function getStationImage(stationId) {
    try {
        // Construction de l'URL pour l'API AtmoSud (URL exacte de l'ancien code)
        const urlAtmoJsonAPI = `https://www.atmosud.org/jsonapi/taxonomy_term/station?filter[field_station_id_station]=${stationId}&include=field_station_pictures`;

        // Utilisation du proxy CORS (URL exacte de l'ancien code)
        const proxyUrl = `https://corsproxy.io/?${urlAtmoJsonAPI}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Vérification de la présence d'images
        if (!data.included || data.included.length === 0) {
            console.warn('Aucune image disponible pour la station');
            return 'img/stationsRefAtmoSud/station_default.png';
        }

        // Récupération de la première image (URL exacte de l'ancien code)
        const firstImage = data.included[0];
        const imageUrl = `https://www.atmosud.org/sites/sud/files/medias/images/2022-04/${firstImage.attributes.name}`;
        const imageUrl2 = `https://www.atmosud.org/sites/sud/files/medias/images/2022-05/${firstImage.attributes.name}`;

        // Vérification de la validité de l'URL de l'image
        const isValid = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = imageUrl;
        });

        if (!isValid) {
            const isValid2 = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = imageUrl2;
            });

            if (!isValid2) {
                return 'img/stationsRefAtmoSud/station_default.png';
            }

            return imageUrl2;
        }

        return imageUrl;
    } catch (error) {
        console.error("Erreur lors de la récupération de l'image:", error);
        return 'img/stationsRefAtmoSud/station_default.png';
    }
}

/**
 * Ouvre le panneau latéral pour une station
 * @param {string} deviceId - ID de la station
 * @param {string} station_name - Nom de la station
 * @param {Array} mesure - Mesures sélectionnées
 */
export function openSidePanelStationRef(deviceId, station_name, mesure) {
    if (!isSourceActive('atmoRef')) {
        return;
    }

    if (state.pasDeTemps[0] === 'd') {
        state.historiqueChart = '7d';
    } else if (state.pasDeTemps[0] === 'instantane') {
        state.pasDeTempsAtmo = 'quart-horaire';
    }
    document.getElementById('togglePollutants').disabled = false;
    document.getElementById('btn_historique_3h').disabled = false;
    document.getElementById('btn_historique_24h').disabled = false;
    document.getElementById('btn_historique_7d').disabled = false;
    document.getElementById('btn_historique_365d').disabled = false;
    document.getElementById('btn_pasDeTemps_scan').disabled = false;
    document.getElementById('btn_pasDeTemps_qh').disabled = false;
    document.getElementById('btn_pasDeTemps_h').disabled = false;
    document.getElementById('btn_pasDeTemps_d').disabled = false;

    // Récupération de l'image de la station
    const card1Img = document.getElementById('card1Img');
    if (card1Img) {
        card1Img.src = 'img/stationsRefAtmoSud/refStationAtmoSud_default.png';
        getStationImage(window.globalSelectedDeviceId)
            .then((imageUrl) => {
                card1Img.src = imageUrl;
            })
            .catch((error) => {
                console.error(
                    "Erreur lors de la mise à jour de l'image:",
                    error
                );
            });
    }

    // Conversion du polluant pour l'API
    let polluantAPI = mesure[0];
    if (polluantAPI === 'pm25') {
        polluantAPI = 'pm2.5';
    }

    // Mise à jour des informations de la carte
    card1Title.innerHTML = station_name;
    card1Subtitle.innerHTML = 'Station de référence AtmoSud';
    card1Text.innerHTML = '';

    card2Text.innerHTML =
        "Les stations de référence sont des stations de mesure de la qualité de l'air déployées par AtmoSud pour mesurer précisément la qualité de l'air.";
    card2Link.innerHTML = 'AtmoSud.org';
    card2Link.href = 'https://www.atmosud.org';

    // Utiliser le gestionnaire de panneau pour configurer les boutons
    panelManager.openPanel('atmoRef', deviceId, {
        pasDeTempsAtmo: state.pasDeTempsAtmo,
        historiqueChart: state.historiqueChart,
        mesuresArray: [polluantAPI],
        pasDeTempsChart: state.pasDeTempsAtmo,
        pasDeTemps: state.pasDeTemps,
        customDateRange: state.customDateRange,
    });

    openSidePanelGeneric();
}

/**
 * Récupère les données historiques d'une station de référence AtmoSud
 * Fabrication du charts
 * Source -> API AtmoSud
 * @param {string} stationId - ID de la station
 * @param {string} pasDeTemps - Pas de temps
 * @param {string} historique - Période historique
 * @param {Array} mesuresArray - Tableau des mesures
 * @param {boolean} addMesure - Ajouter une mesure
 * @param {string} customStart - Date de début personnalisée
 * @param {string} customEnd - Date de fin personnalisée
 */
export function retreiveHistoriqueDataStationRef(
    stationId,
    pasDeTemps,
    historique,
    mesuresArray,
    addMesure = false,
    customStart = null,
    customEnd = null
) {
    startSpinner('Chargement des données historiques...');

    // Nettoyage complet du graphique précédent
    const chartDiv = document.getElementById('chartdiv_sensor');
    if (chartDiv) {
        chartDiv.innerHTML = '';
    }

    // Nettoyage de toutes les instances amCharts existantes
    if (window.amchart_root) {
        try {
            window.amchart_root.dispose();
        } catch (e) {
            console.warn("Erreur lors du nettoyage de l'instance amCharts:", e);
        }
        window.amchart_root = undefined;
    }

    // Réinitialisation des données
    state.mesuresArray = [...mesuresArray];
    state.pasDeTempsChart = pasDeTemps;
    state.historiqueChart = historique;

    // Conversion du pas de temps pour l'API
    let pasDeTempsAPI;
    switch (pasDeTemps) {
        case 'brute':
        case '2min':
            pasDeTempsAPI = 'brute';
            break;
        case 'quart-horaire':
        case 'qh':
            pasDeTempsAPI = 'quart-horaire';
            break;
        case 'horaire':
        case 'h':
            pasDeTempsAPI = 'horaire';
            break;
        case 'journalière':
        case 'd':
            pasDeTempsAPI = 'journalière';
            break;
        default:
            pasDeTempsAPI = pasDeTemps;
    }

    // Construction de l'URL avec les paramètres
    let fullUrl = `${apiAtmoSud.urlBase}${apiAtmoSud.urlStationsMesures}?
        format=json&
        station_id=${stationId}&
        nom_polluant=${state.mesuresArray.join(',')}&
        temporalite=${pasDeTempsAPI}&
        download=false&
        metadata=true`.replace(/\s+/g, '');

    // Ajout des paramètres de date
    if (customStart && customEnd) {
        fullUrl += `&date_debut=${customStart}&date_fin=${customEnd}`;
    } else if (state.customDateRange.start && state.customDateRange.end) {
        fullUrl += `&date_debut=${state.customDateRange.start}&date_fin=${state.customDateRange.end}`;
    } else if (historique) {
        const endDate = new Date();
        const startDate = new Date();

        switch (historique) {
            case '1h':
                startDate.setHours(startDate.getHours() - 1);
                break;
            case '3h':
                startDate.setHours(startDate.getHours() - 3);
                break;
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '365d':
                startDate.setDate(startDate.getDate() - 365);
                break;
        }

        fullUrl += `&date_debut=${startDate.toISOString()}&date_fin=${endDate.toISOString()}`;
    }

    // Appel API
    fetch(fullUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (!data.mesures || data.mesures.length === 0) {
                console.warn('Aucune donnée disponible');
                stopSpinner();
                return;
            }

            // Initialisation des données pour le graphique
            const seriesData = {};

            // Traitement des données
            data.mesures.forEach((item) => {
                let nomPolluant;
                const labelLower = item.label_polluant.toLowerCase();

                // Vérification de tous les formats possibles pour chaque polluant
                if (
                    labelLower.includes('pm1') ||
                    labelLower.includes('particules en suspension <1 µm')
                ) {
                    nomPolluant = 'pm1';
                }
                if (
                    labelLower.includes('pm2.5') ||
                    labelLower.includes('particules en suspension <2.5 µm')
                ) {
                    nomPolluant = 'pm2.5';
                }
                if (
                    labelLower.includes('pm10') ||
                    labelLower.includes('particules en suspension <10 µm')
                ) {
                    nomPolluant = 'pm10';
                }
                if (
                    labelLower.includes('no2') ||
                    labelLower.includes("dioxyde d'azote")
                ) {
                    nomPolluant = 'no2';
                }
                if (labelLower.includes('o3') || labelLower.includes('ozone')) {
                    nomPolluant = 'o3';
                }
                if (
                    labelLower.includes('so2') ||
                    labelLower.includes('dioxyde de soufre')
                ) {
                    nomPolluant = 'so2';
                }
                if (
                    labelLower.includes('h2s') ||
                    labelLower.includes('sulfure dhydrogène')
                ) {
                    nomPolluant = 'h2s';
                }
                if (
                    labelLower.includes('c6h6') ||
                    labelLower.includes('benzene')
                ) {
                    nomPolluant = 'c6h6';
                }

                if (nomPolluant && state.mesuresArray.includes(nomPolluant)) {
                    if (!seriesData[nomPolluant]) {
                        seriesData[nomPolluant] = {
                            data: [],
                            label: item.label_polluant,
                        };
                    }
                    if (item.valeur !== null) {
                        seriesData[nomPolluant].data.push({
                            value: item.valeur,
                            date: new Date(item.date_debut).getTime(),
                            validated:
                                item.validation === 'validée' ? true : false,
                        });
                    }
                }
            });

            // Tri des données par date pour chaque polluant
            Object.keys(seriesData).forEach((polluant) => {
                seriesData[polluant].data.sort((a, b) => a.date - b.date);
            });

            // Récupération de l'unité de mesure
            const unite = data.mesures[0].unite;

            const stationName = data.mesures[0].nom_station;

            // Création du graphique
            am5.ready(function () {
                // Vérification que l'élément existe toujours
                const chartDiv = document.getElementById('chartdiv_sensor');

                if (!chartDiv) {
                    console.error("L'élément chartdiv_sensor n'existe plus");
                    return;
                }

                // Nettoyage supplémentaire pour s'assurer qu'il n'y a pas d'instances résiduelles
                if (window.amchart_root) {
                    try {
                        window.amchart_root.dispose();
                    } catch (e) {
                        console.warn(
                            "Erreur lors du nettoyage de l'instance amCharts:",
                            e
                        );
                    }
                }

                // Création du root element
                window.amchart_root = am5.Root.new('chartdiv_sensor');
                window.amchart_root.locale = am5locales_fr_FR;
                // Création du graphique
                const chart = createChart(window.amchart_root, stationName);

                // Configuration des axes
                let baseIntervalConfig = {
                    timeUnit: 'minute',
                    count: 1,
                };

                // Ajustement de l'intervalle en fonction du pas de temps
                if (state.pasDeTempsChart === '2min') {
                    baseIntervalConfig = {
                        timeUnit: 'minute',
                        count: 2,
                    };
                } else if (state.pasDeTempsChart === 'quart-horaire') {
                    baseIntervalConfig = {
                        timeUnit: 'minute',
                        count: 15,
                    };
                } else if (state.pasDeTempsChart === 'horaire') {
                    baseIntervalConfig = {
                        timeUnit: 'hour',
                        count: 1,
                    };
                } else if (state.pasDeTempsChart === 'journalière') {
                    baseIntervalConfig = {
                        timeUnit: 'day',
                        count: 1,
                    };
                }

                const axes = configureAxes(
                    chart,
                    window.amchart_root,
                    baseIntervalConfig,
                    unite
                );

                // Configuration du curseur
                configureCursor(chart, window.amchart_root);

                // Création des séries pour chaque polluant
                const allSeries = [];
                Object.keys(seriesData).forEach((polluant) => {
                    const series = createSeries(
                        chart,
                        window.amchart_root,
                        polluant,
                        axes,
                        seriesData[polluant].data,
                        unite
                    );
                    allSeries.push(series);
                });

                configureLegend(
                    chart,
                    window.amchart_root,
                    allSeries,
                    mesuresArray
                );

                // Animation
                chart.appear(1000, 100);
                stopSpinner();
                am5plugins_exporting.Exporting.new(window.amchart_root, {
                    menu: am5plugins_exporting.ExportingMenu.new(
                        window.amchart_root,
                        {}
                    ),
                    filePrefix: 'historique_data',
                    dataSource: data.mesures,
                });
            });
        })
        .catch((error) => {
            console.error('Erreur lors de la récupération des données:', error);
            stopSpinner();
            // Nettoyage en cas d'erreur
            if (window.amchart_root) {
                try {
                    window.amchart_root.dispose();
                } catch (e) {
                    console.warn(
                        "Erreur lors du nettoyage de l'instance amCharts:",
                        e
                    );
                }
                window.amchart_root = undefined;
            }
        });
}

// Dans la fonction qui crée le tooltip pour les stations de référence
function createRefStationTooltip(stationData) {
    return `
        <div class="card border-0 shadow-sm">
            <div class="card-body p-2">
                <h6 class="card-title mb-1">${stationData.nom_station}</h6>
                <div class="d-flex flex-column">
                    ${
                        stationData.time
                            ? `
                        <small class="text-muted mb-1">
                            <i class="bi bi-clock me-1"></i>
                            Dernière mise à jour: ${formatTimeAgo(stationData.time)}
                        </small>
                    `
                            : ''
                    }
                    <small class="text-muted mb-1">
                        <i class="bi bi-geo-alt me-1"></i>
                        ${stationData.latitude.toFixed(4)}, ${stationData.longitude.toFixed(4)}
                    </small>
                    <small class="text-muted">
                        Polluants mesurés:
                        <ul class="list-unstyled ms-3 mb-0">
                            ${stationData.polluants.map((polluant) => `<li>${polluant}</li>`).join('')}
                        </ul>
                    </small>
                </div>
            </div>
        </div>
    `;
}
