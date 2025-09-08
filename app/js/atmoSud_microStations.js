/* eslint-env browser */
// Récupération des données des micro-stations AtmoSud
// Cette fonction charge les données des micro-stations AtmoSud et les affiche sur la carte

import { atmoMicroLayer } from './layers.js';
import { formatPollutantName, getArrayFromLocalStorage } from './utils.js';
import { isSourceActive } from './dataSourceManager.js';
import { panelManager } from './panelManager.js';
import { startSpinner, stopSpinner } from './spinnerManager.js';
import { apiAtmoSud } from '../config.js';
import { openSidePanelGeneric } from './sidePanel.js';
import { toastManager, createCustomToast } from './toaster.js';
import {
    initializeMicroStationMarkers,
    processAndDisplayStations,
} from './markerManager.js';
import { POLLUTANT_COLORS } from './appConfig.js';

// Constantes

// Éléments DOM
const card1Img = document.getElementById('card1Img');
const card1Title = document.getElementById('card1Title');
const card1Text = document.getElementById('card1Text');
const card2Link = document.getElementById('card2Link');

// État global
const state = {
    pasDeTempsChart: 'horaire',
    pasDeTempsAtmo: '',
    pasDeTemps: '',
    historiqueChart: '24h',
    mesuresArray: [],
    selectedMarker: null,
    selectedText: null,
    selectedDeviceId: null,
    customDateRange: {
        start: null,
        end: null,
    },
};

// Variables de contrôle
const isFetching = false;
let isYAxisCapped = false;
let yAxisMaxValue = 90;

/**
 * Fonctions principales pour la gestion des micro-stations
 */

/**
 * Charge les micro-stations AtmoSud sur la carte
 * @returns {Promise<void>}
 */
export const loadAtmoSudMicroStation = async () => {
    try {
        atmoMicroLayer.clearLayers();
        const pasDeTemps = getArrayFromLocalStorage('pasDeTempsLocal')[0];
        const pasDeTempsAtmo = convertTimeStep(pasDeTemps);

        if (pasDeTemps === 'd') {
            toastManager.atmoMicroTimeStepDailyWarning();
            return;
        }

        const mesures = getArrayFromLocalStorage('mesuresLocal');
        if (!validateMesures(mesures[0])) return;

        state.mesuresArray = [...mesures];
        const mesuresAtmo = mesures[0] === 'pm25' ? ['pm2.5'] : mesures;

        const dataCapteurSite = await fetchCapteurSites(mesuresAtmo);
        initializeMicroStationMarkers(dataCapteurSite);

        const data = await fetchDernieresMesures(mesuresAtmo, pasDeTemps);
        if (!validateData(data)) return;

        const filteredData = filterAndProcessData(data, pasDeTemps[0]);
        if (filteredData.length === 0) {
            showNoDataWarning();
            return;
        }

        await processAndDisplayStations(
            filteredData,
            dataCapteurSite,
            pasDeTempsAtmo
        );
    } catch (error) {
        handleError('loadAtmoSudMicroStation', error);
    }
};

/**
 * Fonctions utilitaires pour la gestion des données
 */

const convertTimeStep = (pasDeTemps) => {
    const timeStepMap = {
        instantane: 'brute',
        '2min': 'brute',
        qh: 'quart-horaire',
        h: 'horaire',
        d: 'd',
    };

    const converted = timeStepMap[pasDeTemps] || 'horaire';
    state.pasDeTempsChart = converted;
    return converted;
};

const validateMesures = (mesure) => {
    if (['so2', 'nh3', 'o3', 'h2s', 'c6h6'].includes(mesure)) {
        console.warn('Mesure non supportée:', mesure);
        return false;
    }
    return true;
};

const fetchCapteurSites = async (mesuresAtmo) => {
    const fullUrlCapteurSite =
        `${apiAtmoSud.urlBase}${apiAtmoSud.urlCapteursSites}?format=json&variable=${mesuresAtmo}&actifs=2880`.replace(
            /\s+/g,
            ''
        );
    return await fetchAPI(fullUrlCapteurSite);
};

const fetchDernieresMesures = async (mesuresAtmo, pasDeTemps) => {
    let delais = '';
    if (pasDeTemps === 'h') {
        delais = '64';
    } else if (pasDeTemps === 'qh') {
        delais = '19';
    } else if (pasDeTemps === '2min') {
        delais = '10';
    } else if (pasDeTemps === 'instantane') {
        delais = '181';
    }
    pasDeTemps = convertTimeStep(pasDeTemps);

    const fullUrlDerniere =
        `${apiAtmoSud.urlBase}${apiAtmoSud.urlCapteursMesuresDernieres}?format=json&download=false&valeur_brute=true&type_capteur=true&variable=${mesuresAtmo}&aggregation=${pasDeTemps}&delais=${delais}`.replace(
            /\s+/g,
            ''
        );
    return await fetchAPI(fullUrlDerniere);
};

const validateData = (data) => {
    if (!Array.isArray(data)) {
        throw new Error('Les données reçues ne sont pas au bon format');
    }
    return true;
};

const filterAndProcessData = (data, pasDeTemps) => {
    let filteredData = data;
    if (pasDeTemps === '2min') {
        filteredData = data.filter((item) => item.pas_de_temps <= 120);
    }
    const uniqueMeasures = {};
    filteredData.forEach((measure) => {
        if (
            !uniqueMeasures[measure.id_site] ||
            new Date(measure.time) >
                new Date(uniqueMeasures[measure.id_site].time)
        ) {
            uniqueMeasures[measure.id_site] = measure;
        }
    });

    return Object.values(uniqueMeasures);
};

const showNoDataWarning = () => {
    createCustomToast({
        message: 'Aucune donnée disponible pour les critères sélectionnés',
        type: 'warning',
        title: 'Attention',
        icon: 'exclamation-triangle',
        timer: 5000,
    });
};

/**
 * Fonctions de gestion du panneau latéral
 */

export const openSidePanelMicroStation = (
    data,
    pasDeTempsAtmo,
    historique,
    mesuresAtmo
) => {
    if (!isSourceActive('atmoMicro')) return;
    document.getElementById('togglePollutants').disabled = false;
    document.getElementById('btn_historique_3h').disabled = false;
    document.getElementById('btn_historique_24h').disabled = false;
    document.getElementById('btn_historique_7d').disabled = false;
    document.getElementById('btn_historique_365d').disabled = false;
    document.getElementById('btn_pasDeTemps_scan').disabled = false;
    document.getElementById('btn_pasDeTemps_qh').disabled = false;
    document.getElementById('btn_pasDeTemps_h').disabled = false;
    document.getElementById('btn_pasDeTemps_d').disabled = false;

    updateCardInfo(data);
    if (pasDeTempsAtmo === 'quart-horaire') {
        pasDeTempsAtmo = 'qh';
    } else if (pasDeTempsAtmo === 'journalière') {
        pasDeTempsAtmo = 'd';
    } else if (pasDeTempsAtmo === 'instantanée') {
        pasDeTempsAtmo = 'brute';
    } else if (pasDeTempsAtmo === 'horaire') {
        pasDeTempsAtmo = 'h';
    }

    panelManager.openPanel('atmoMicro', data.id_site, {
        pasDeTempsAtmo: pasDeTempsAtmo,
        historiqueChart: historique,
        mesuresArray: mesuresAtmo,
        pasDeTempsChart: pasDeTempsAtmo,
        pasDeTemps: pasDeTempsAtmo,
        customDateRange: state.customDateRange,
    });

    openSidePanelGeneric();
};

const updateCardInfo = (data) => {
    if (data.modele_capteur === 'NebuleAir') {
        card1Img.src = 'img/nebuleair/NebuleAir_photo.png';
    } else if (data.modele_capteur === 'Kunak PRO') {
        card1Img.src = 'img/microStationsAtmoSud/kunak-air-pro.jpg';
    } else if (data.modele_capteur === 'PMo') {
        card1Img.src = 'img/microStationsAtmoSud/nexelec-pmo.jpg';
    } else {
        card1Img.src = 'img/microStationsAtmoSud/microStation_photo.jpg';
    }

    card1Title.innerHTML = data.site_info
        ? data.site_info.nom_site
        : data.nom_site;
    card1Subtitle.innerHTML = `Micro-station AtmoSud - ${data.site_info ? data.site_info.modele_capteur : data.modele_capteur}`;
    card1Text.innerHTML = '';

    card2Text.innerHTML =
        "Les micro-stations sont des capteurs de mesure de la qualité de l'air déployés par AtmoSud pour compléter le réseau de stations de référence.";
    card2Link.innerHTML = 'AtmoSud.org';
    card2Link.href = 'https://www.atmosud.org';
};

/**
 * Fonction principale pour récupérer les données historiques d'une micro-station
 * @param {string} sensorId - Identifiant unique de la station
 * @param {string} pasDeTemps - Période d'agrégation des données ('brute', 'quart-horaire', 'horaire', 'journalier')
 * @param {string} historique - Période de temps pour l'historique ('1h', '3h', '24h', '7d', '30d', '365d')
 * @param {Array} mesuresArray - Liste des polluants à récupérer (ex: ['pm2.5', 'pm10'])
 * @param {boolean} add_mesure - Indique si on ajoute une mesure (non utilisé actuellement)
 * @param {string} customStart - Date de début personnalisée (optionnel)
 * @param {string} customEnd - Date de fin personnalisée (optionnel)
 */
export const retreiveHistoriqueDataMicroStation = async (
    sensorId,
    pasDeTemps,
    historique,
    mesuresArray,
    customStart = null,
    customEnd = null
) => {
    // Formatage du pas de temps pour call API
    if (pasDeTemps === 'qh') {
        pasDeTemps = 'quart-horaire';
    } else if (pasDeTemps === 'h') {
        pasDeTemps = 'horaire';
    } else if (pasDeTemps === 'd') {
        pasDeTemps = 'journalier';
    }

    // Formatage des mesures pour call API
    for (let i = 0; i < mesuresArray.length; i++) {
        if (mesuresArray[i] === 'pm25') {
            mesuresArray[i] = 'pm2.5';
        }
    }
    try {
        // Démarrage du spinner
        startSpinner('Chargement des données historiques...');

        // Vérification de la présence d'un ID de capteur
        if (!sensorId) {
            throw new Error('ID du capteur non défini');
        }

        // Nettoyage de la zone de graphique
        const chartDiv = document.getElementById('chartdiv_sensor');
        if (chartDiv) {
            chartDiv.innerHTML = '';
        }

        // Mise à jour des variables d'état
        state.pasDeTempsChart = pasDeTemps;
        state.historiqueChart = historique;

        // Construction des paramètres de l'URL avec URLSearchParams pour un encodage correct
        const params = new URLSearchParams({
            id_site: sensorId,
            format: 'json',
            download: 'false',
            nb_dec: '1',
            valeur_brute: 'true',
            variable: mesuresArray.join(','),
            type_capteur: 'true',
        });

        // Gestion spéciale du paramètre aggregation selon le pas de temps
        if (pasDeTemps === '2min') {
            params.append('aggregation', 'brute');
        } else {
            params.append('aggregation', pasDeTemps);
        }

        // Ajout des paramètres de date
        if (customStart && customEnd) {
            params.append('debut', customStart);
            params.append('fin', customEnd);
        } else if (state.customDateRange.start && state.customDateRange.end) {
            params.append('debut', state.customDateRange.start);
            params.append('fin', state.customDateRange.end);
        } else if (historique) {
            const now = new Date();
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

            params.append('debut', startDate.toISOString());
            params.append('fin', now.toISOString());
        }

        // Construction de l'URL complète pour l'appel API
        const fullUrl = `${apiAtmoSud.urlBase}${apiAtmoSud.urlCapteursMesures}?${params.toString()}`;

        // Appel à l'API pour récupérer les données
        const data = await fetchAPI(fullUrl);

        // Vérification de la validité des données reçues
        if (!data || !Array.isArray(data)) {
            throw new Error("Format de données invalide reçu de l'API");
        }

        // Configuration de l'intervalle de temps pour l'axe X
        let baseIntervalConfig = {
            timeUnit: 'minute',
            count: 1,
        };

        // Ajustement de l'intervalle en fonction du pas de temps
        if (pasDeTemps === '2min') {
            baseIntervalConfig = {
                timeUnit: 'minute',
                count: 2,
            };
        } else if (pasDeTemps === 'quart-horaire') {
            baseIntervalConfig = {
                timeUnit: 'minute',
                count: 15,
            };
        } else if (pasDeTemps === 'horaire') {
            baseIntervalConfig = {
                timeUnit: 'hour',
                count: 1,
            };
        } else if (pasDeTemps === 'journalier') {
            baseIntervalConfig = {
                timeUnit: 'day',
                count: 1,
            };
        }

        // Récupération de l'unité de mesure
        const unite = data[0].unite;
        const sensorName = data[0].nom_site;

        // Initialisation du graphique avec amCharts 5
        am5.ready(function () {
            const chartDiv = document.getElementById('chartdiv_sensor');

            if (!chartDiv) {
                console.error("L'élément chartdiv_sensor n'existe plus");
                return;
            }

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

            window.amchart_root = am5.Root.new('chartdiv_sensor');

            window.amchart_root.locale = am5locales_fr_FR;
            const chart = createChart(window.amchart_root, sensorName);
            const axes = configureAxes(
                chart,
                window.amchart_root,
                baseIntervalConfig,
                unite
            );
            const cursor = configureCursor(chart, window.amchart_root);

            const seriesData = {};
            data.forEach((item) => {
                const variable = item.variable;
                if (!seriesData[variable]) {
                    seriesData[variable] = {
                        corrected: [],
                        raw: [],
                    };
                }

                const dataPoint = {
                    value: item.valeur_ref,
                    date: new Date(item.time).getTime(),
                };

                if (item.valeur !== null) {
                    seriesData[variable].corrected.push(dataPoint);
                } else {
                    seriesData[variable].raw.push(dataPoint);
                }
            });

            const allSeries = [];
            Object.keys(seriesData).forEach((variable) => {
                if (seriesData[variable].corrected.length > 0) {
                    allSeries.push(
                        createSeries(
                            chart,
                            window.amchart_root,
                            variable,
                            axes,
                            seriesData[variable].corrected,
                            'corrigée',
                            unite
                        )
                    );
                }

                if (seriesData[variable].raw.length > 0) {
                    allSeries.push(
                        createSeries(
                            chart,
                            window.amchart_root,
                            variable,
                            axes,
                            seriesData[variable].raw,
                            'brute',
                            unite
                        )
                    );
                }
            });

            configureLegend(
                chart,
                window.amchart_root,
                allSeries,
                mesuresArray
            );

            chart.appear(1000, 100);
            stopSpinner();
            am5plugins_exporting.Exporting.new(window.amchart_root, {
                menu: am5plugins_exporting.ExportingMenu.new(
                    window.amchart_root,
                    {}
                ),
                filePrefix: 'historique_data',
                dataSource: data,
            });
        });
    } catch (error) {
        console.error('Erreur dans retreiveHistoriqueDataMicroStation:', error);
        stopSpinner();
        showErrorNotification(error.message);
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
    }
};

const createChart = (root, sensorName) => {
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: 'panX',
            wheelY: 'zoomX',
            paddingLeft: 0,
            paddingRight: 15,
            paddingBottom: 50,
            layout: am5.GridLayout.new(root, {
                maxColumns: 1,
                fixedWidthGrid: true,
            }),
            colors: {
                colors: [],
            },
            height: am5.percent(100),
        })
    );

    // Ajout de la gestion du redimensionnement
    chart.events.on('sizechanged', function () {
        chart.set('height', am5.percent(100));
    });

    // ➕ Ajout du titre du graphique
    chart.children.unshift(
        am5.Label.new(root, {
            text: `Données du capteur ${sensorName}`, // <-- Titre personnalisé
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
};

// Configuration des axes
const configureAxes = (chart, root, baseInterval, unite) => {
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
            numberFormat: '#.#',
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
};

// Configuration du curseur
const configureCursor = (chart, root) => {
    const cursor = chart.set(
        'cursor',
        am5xy.XYCursor.new(root, {
            behavior: 'zoomX',
        })
    );
    cursor.lineY.set('visible', false);
    return cursor;
};

// Création d'une série pour un polluant
const createSeries = (
    chart,
    root,
    pollutant,
    axes,
    data,
    type = 'corrigée',
    unite
) => {
    const polluantCompare = pollutant.toLowerCase().replace('2.5', '25');
    const colorKey = polluantCompare === 'pm2.5' ? 'pm25' : polluantCompare;
    const color = POLLUTANT_COLORS[colorKey] || '#000000';

    const series = chart.series.push(
        am5xy.LineSeries.new(root, {
            name: `${pollutant.toUpperCase()} (${type})`,
            xAxis: axes.xAxis,
            yAxis: axes.yAxis,
            valueYField: 'value',
            valueXField: 'date',
            tooltip: am5.Tooltip.new(root, {
                labelText: `${formatPollutantName(pollutant.toUpperCase())}: {valueY} ${unite} (donnée ${type})`,
                pointerOrientation: 'horizontal',
                getFillFromSprite: false,
                getStrokeFromSprite: false,
                background: am5.Rectangle.new(root, {
                    fill: am5.color(color),
                    fillOpacity: 0.4,
                }),
            }),
            fill: am5.color(color),
            stroke: am5.color(color),
            connect: true,
            minBulletDistance: 10,
            tensionX: 0.8,
            tensionY: 0.8,
        })
    );

    series.strokes.template.setAll({
        strokeWidth: 2,
        stroke: am5.color(color),
        ...(type === 'brute' && { strokeDasharray: [5, 5] }),
    });

    series.data.setAll(data);
    series.appear(1000);

    return {
        series,
        name: pollutant,
        compare: polluantCompare,
        type,
    };
};

const configureLegend = (chart, root, allSeries, mesuresArray) => {
    const legend = chart.children.push(
        am5.Legend.new(root, {
            centerX: am5.percent(50),
            x: am5.percent(60),
            y: am5.percent(20),
            layout: am5.GridLayout.new(root, {
                maxColumns: 5,
                fixedWidthGrid: true,
            }),
            paddingTop: 10,
            paddingBottom: 10,
            marginBottom: 10,
        })
    );

    legend.data.setAll(chart.series.values);
    return legend;
};

/**
 * Fonctions de gestion des erreurs et des appels API
 */

const handleError = (context, error) => {
    console.error(`Erreur dans ${context}:`, error);
    showErrorNotification(error.message);
    stopSpinner();
};

const showErrorNotification = (message) => {
    createCustomToast({
        message: message,
        type: 'error',
        title: 'Erreur',
        icon: 'exclamation-circle',
        timer: 5000,
    });
};

const fetchAPI = async (url, options = {}) => {
    startSpinner('Chargement des données...');
    try {
        const response = await fetch(url, {
            method: 'GET',
            ...options,
        });

        if (response.status === 204) {
            stopSpinner();
            createCustomToast({
                message:
                    'Aucune donnée disponible pour les critères sélectionnés',
                type: 'info',
                title: 'Information',
                icon: 'info-circle',
                timer: 5000,
            });
            return []; // Retourne un tableau vide pour une réponse 204
        }

        if (!response.ok) {
            throw new Error(
                `Erreur HTTP: ${response.status} - ${response.statusText}`
            );
        }

        const data = await response.json();
        if (!data) {
            throw new Error("Aucune donnée reçue de l'API");
        }

        stopSpinner();
        return data;
    } catch (error) {
        stopSpinner();
        console.error("Erreur lors de l'appel API:", error);
        showErrorNotification(error.message);
        throw error;
    }
};

/**
 * Fonctions de gestion du graphique
 */

export const toggleYAxisCapping = () => {
    isYAxisCapped = !isYAxisCapped;
    updateYAxisMax();
    return isYAxisCapped;
};

export const setYAxisMaxValue = (value) => {
    yAxisMaxValue = value;
    if (isYAxisCapped) {
        updateYAxisMax();
    }
};

const updateYAxisMax = () => {
    if (window.amchart_root) {
        const chart = window.amchart_root.container.children.getIndex(0);
        if (chart) {
            const yAxis = chart.yAxes.getIndex(0);
            if (yAxis) {
                yAxis.set('max', isYAxisCapped ? yAxisMaxValue : undefined);
            }
        }
    }
};

// Initialisation des événements pour le capping de l'axe Y
document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.getElementById('toggleYAxisCapping');
    const maxValueInput = document.getElementById('yAxisMaxValue');

    if (toggleButton) {
        toggleButton.addEventListener('click', function () {
            const isCapped = toggleYAxisCapping();
            this.classList.toggle('active', isCapped);
            maxValueInput.disabled = !isCapped;
        });
    }

    if (maxValueInput) {
        maxValueInput.addEventListener('change', function () {
            const value = parseInt(this.value);
            if (value > 0) {
                setYAxisMaxValue(value);
            }
        });
    }
});

// Export des variables d'état
export { state };
