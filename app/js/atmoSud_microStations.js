// Récupération des données des micro-stations AtmoSud
// Cette fonction charge les données des micro-stations AtmoSud et les affiche sur la carte

import { atmoMicroLayer } from './layers.js';
import {
    formatPollutantName,
    getArrayFromLocalStorage,
    getColorCodeForValue,
} from './utils.js';
import { isSourceActive } from './dataSourceManager.js';
import { panelManager } from './panelManager.js';
import { startSpinner, stopSpinner } from './spinnerManager.js';
import { API_atmoSud } from '../config.js';
import { openSidePanelGeneric } from './sidePanel.js';
import { createCustomToast } from './toaster.js';
import { mesures as supportedMesures } from './appConfig.js';

// Constantes
const POLLUTANT_COLORS = {
    pm1: '#FF5733',
    'pm2.5': '#33A1FF',
    pm10: '#33FF57',
    no2: '#A133FF',
};

// Éléments DOM
const card1_img = document.getElementById('card1_img');
const card1_title = document.getElementById('card1_title');
const card1_text = document.getElementById('card1_text');
const card2_link = document.getElementById('card2_link');

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
let isFetching = false;
let isYAxisCapped = false;
let yAxisMaxValue = 90;

// Log pour vérifier l'import de mesures
console.log('Mesures supportées importées:', supportedMesures);

/**
 * Fonctions principales pour la gestion des micro-stations
 */

/**
 * Charge les micro-stations AtmoSud sur la carte
 * @returns {Promise<void>}
 */
export async function loadAtmoSudMicroStation() {
    try {
        atmoMicroLayer.clearLayers();
        const pas_de_temps = getArrayFromLocalStorage('pasDeTempsLocal');
        const pas_de_temps_atmo = convertTimeStep(pas_de_temps[0]);

        if (pas_de_temps_atmo === 'd') return;

        const mesures = getArrayFromLocalStorage('mesuresLocal');
        if (!validateMesures(mesures[0])) return;

        state.mesuresArray = [...mesures];
        const mesures_atmo = mesures[0] === 'pm25' ? ['pm2.5'] : mesures;

        const dataCapteurSite = await fetchCapteurSites(mesures_atmo);
        initializeMicroStationMarkers(dataCapteurSite);

        const data = await fetchDernieresMesures(
            mesures_atmo,
            pas_de_temps_atmo
        );
        if (!validateData(data)) return;

        const filteredData = filterAndProcessData(data, pas_de_temps[0]);
        if (filteredData.length === 0) {
            showNoDataWarning();
            return;
        }

        await processAndDisplayStations(
            filteredData,
            dataCapteurSite,
            pas_de_temps_atmo
        );
    } catch (error) {
        handleError('loadAtmoSudMicroStation', error);
    }
}

/**
 * Fonctions utilitaires pour la gestion des données
 */

function convertTimeStep(pas_de_temps) {
    const timeStepMap = {
        instantane: 'brute',
        '2min': 'brute',
        qh: 'quart-horaire',
        h: 'horaire',
        d: 'd',
    };

    const converted = timeStepMap[pas_de_temps] || 'horaire';
    state.pasDeTempsChart = converted;
    return converted;
}

function validateMesures(mesure) {
    if (['so2', 'nh3', 'o3', 'h2s', 'c6h6'].includes(mesure)) {
        console.warn('Mesure non supportée:', mesure);
        return false;
    }
    return true;
}

async function fetchCapteurSites(mesures_atmo) {
    const fullUrlCapteurSite =
        `${API_atmoSud.url_base}${API_atmoSud.url_capteurs_sites}?format=json&variable=${mesures_atmo}&actifs=2880`.replace(
            /\s+/g,
            ''
        );
    return await fetchAPI(fullUrlCapteurSite);
}

async function fetchDernieresMesures(mesures_atmo, pas_de_temps_atmo) {
    console.log('################################');
    console.log('pas_de_temps_atmo', pas_de_temps_atmo);
    console.log('################################');
    let delais = '';
    if (pas_de_temps_atmo === 'horaire') {
        delais = '64';
    } else if (pas_de_temps_atmo === 'quart-horaire') {
        delais = '19';
    } else if (pas_de_temps_atmo === 'brute') {
        delais = '181';
    }
    const full_url_derniere =
        `${API_atmoSud.url_base}${API_atmoSud.url_capteurs_mesures_dernieres}?format=json&download=false&valeur_brute=true&type_capteur=true&variable=${mesures_atmo}&aggregation=${pas_de_temps_atmo}&delais=${delais}`.replace(
            /\s+/g,
            ''
        );
    // let capteurs_mesures_dernieres = await fetchAPI(full_url_derniere);
    // for (let i = 0; i < capteurs_mesures_dernieres.length; i++) {
    //     if (capteurs_mesures_dernieres[i].modele_capteur != 'NebuleAir') {
    //         console.log(capteurs_mesures_dernieres[i].modele_capteur);
    //     }
    // }
    return await fetchAPI(full_url_derniere);
}

function validateData(data) {
    if (!Array.isArray(data)) {
        throw new Error('Les données reçues ne sont pas au bon format');
    }
    return true;
}

function filterAndProcessData(data, pas_de_temps) {
    let filteredData = data;
    if (pas_de_temps === '2min') {
        filteredData = data.filter((item) => item.pas_de_temps === 120);
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
}

function showNoDataWarning() {
    createCustomToast({
        message: 'Aucune donnée disponible pour les critères sélectionnés',
        type: 'warning',
        title: 'Attention',
        icon: 'exclamation-triangle',
        timer: 5000,
    });
}

/**
 * Fonctions de gestion du panneau latéral
 */

export function openSidePanelMicroStation(
    data,
    pas_de_temps_atmo,
    historique,
    mesures_atmo
) {
    if (!isSourceActive('atmo_micro')) return;

    updateCardInfo(data);
    panelManager.openPanel('atmo_micro', data.id_site, {
        pasDeTempsAtmo: pas_de_temps_atmo,
        historiqueChart: historique,
        mesuresArray: mesures_atmo,
        pasDeTempsChart: pas_de_temps_atmo,
        pasDeTemps: pas_de_temps_atmo,
        customDateRange: state.customDateRange,
    });

    openSidePanelGeneric();
}

function updateCardInfo(data) {
    card1_img.src = 'img/microStationsAtmoSud/microStationAtmoSud_default.png';
    card1_title.innerHTML = data.site_info
        ? data.site_info.nom_site
        : data.nom_site;
    card1_subtitle.innerHTML = `Micro-station AtmoSud - ${data.site_info ? data.site_info.modele_capteur : data.modele_capteur}`;
    card1_text.innerHTML = '';

    card2_text.innerHTML =
        "Les micro-stations sont des capteurs de mesure de la qualité de l'air déployés par AtmoSud pour compléter le réseau de stations de référence.";
    card2_link.innerHTML = 'AtmoSud.org';
    card2_link.href = 'https://www.atmosud.org';
}

/**
 * Fonction principale pour récupérer les données historiques d'une micro-station
 * @param {string} sensorId - Identifiant unique de la station
 * @param {string} pas_de_temps - Période d'agrégation des données ('brute', 'quart-horaire', 'horaire', 'journalier')
 * @param {string} historique - Période de temps pour l'historique ('1h', '3h', '24h', '7d', '30d', '365d')
 * @param {Array} mesures_array - Liste des polluants à récupérer (ex: ['pm2.5', 'pm10'])
 * @param {boolean} add_mesure - Indique si on ajoute une mesure (non utilisé actuellement)
 * @param {string} custom_start - Date de début personnalisée (optionnel)
 * @param {string} custom_end - Date de fin personnalisée (optionnel)
 */
export async function retreive_historiqueData_microStation(
    sensorId,
    pas_de_temps,
    historique,
    mesures_array,
    custom_start = null,
    custom_end = null
) {
    console.log('################################');
    console.log('custom_start', custom_start);
    console.log('custom_end', custom_end);
    console.log('################################');

    for (let i = 0; i < mesures_array.length; i++) {
        if (mesures_array[i] === 'pm25') {
            mesures_array[i] = 'pm2.5';
        }
    }
    try {
        // Vérification que le capteur sélectionné est toujours le même
        let testSensorId = String(sensorId);
        if (
            testSensorId.startsWith('FR') ||
            testSensorId.startsWith('nebule')
        ) {
            console.log(
                "Le capteur sélectionné n'est pas une micro-station, annulation de la requête"
            );
            return;
        }

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
        state.pasDeTempsChart = pas_de_temps;
        state.historiqueChart = historique;

        // Construction des paramètres de l'URL avec URLSearchParams pour un encodage correct
        const params = new URLSearchParams({
            id_site: sensorId,
            format: 'json',
            download: 'false',
            nb_dec: '1',
            valeur_brute: 'true',
            variable: mesures_array.join(','),
            type_capteur: 'true',
        });

        // Gestion spéciale du paramètre aggregation selon le pas de temps
        if (pas_de_temps === '2min') {
            params.append('aggregation', 'brute');
        } else {
            params.append('aggregation', pas_de_temps);
        }

        // Ajout des paramètres de date
        if (custom_start && custom_end) {
            params.append('debut', custom_start);
            params.append('fin', custom_end);
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
        const full_url = `${API_atmoSud.url_base}${API_atmoSud.url_capteurs_mesures}?${params.toString()}`;
        console.log("URL de l'API:", full_url); // Pour le débogage

        // Appel à l'API pour récupérer les données
        const data = await fetchAPI(full_url);

        // Vérification de la validité des données reçues
        if (!data || !Array.isArray(data)) {
            throw new Error("Format de données invalide reçu de l'API");
        }

        // Configuration de l'intervalle de temps pour l'axe X
        let baseIntervalConfig = {
            timeUnit: 'minute',
            count: 1,
        };
        //api.atmosud.org/observations/capteurs/mesures?id_site=1145&format=json&download=false&nb_dec=1&valeur_brute=true&variable=pm25&type_capteur=true&aggregation=horaire&d
        // Ajustement de l'intervalle en fonction du pas de temps
        https: if (pas_de_temps === '2min') {
            baseIntervalConfig = {
                timeUnit: 'minute',
                count: 2,
            };
        } else if (pas_de_temps === 'quart-horaire') {
            baseIntervalConfig = {
                timeUnit: 'minute',
                count: 15,
            };
        } else if (pas_de_temps === 'horaire') {
            baseIntervalConfig = {
                timeUnit: 'hour',
                count: 1,
            };
        } else if (pas_de_temps === 'journalier') {
            baseIntervalConfig = {
                timeUnit: 'day',
                count: 1,
            };
        }

        // Récupération de l'unité de mesure
        let unite = data[0].unite;

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
            let chart = createChart(window.amchart_root);
            const axes = configureAxes(
                chart,
                window.amchart_root,
                baseIntervalConfig,
                unite
            );
            configureCursor(chart, window.amchart_root);

            let seriesData = {};
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
                const colorKey = variable === 'pm2.5' ? 'pm25' : variable;

                if (seriesData[variable].corrected.length > 0) {
                    allSeries.push(
                        createSeries(
                            chart,
                            window.amchart_root,
                            variable,
                            axes,
                            seriesData[variable].corrected,
                            'corrigée'
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
                            'brute'
                        )
                    );
                }
            });

            // configureLegend(chart, window.amchart_root, allSeries);
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
        console.error(
            'Erreur dans retreive_historiqueData_microStation:',
            error
        );
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
            paddingBottom: 15,
            layout: am5.GridLayout.new(root, {
                maxColumns: 1,
                fixedWidthGrid: true,
            }),
        })
    );
}

// Configuration des axes
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

// Création d'une série pour un polluant
function createSeries(chart, root, pollutant, axes, data, type = 'corrigée') {
    const polluantCompare = pollutant.toLowerCase().replace('2.5', '25');
    const colorKey = polluantCompare === 'pm2.5' ? 'pm25' : polluantCompare;
    const color = POLLUTANT_COLORS[colorKey] || '#000000';

    const series = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
            name: `${pollutant.toUpperCase()} (${type})`,
            xAxis: axes.xAxis,
            yAxis: axes.yAxis,
            valueYField: 'value',
            valueXField: 'date',
            tooltip: am5.Tooltip.new(root, {
                labelText: `${formatPollutantName(pollutant.toUpperCase())}: {valueY} µg/m³ (donnée ${type})`,
            }),
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
}

/**
 * Fonctions de gestion des erreurs et des appels API
 */

function handleError(context, error) {
    console.error(`Erreur dans ${context}:`, error);
    showErrorNotification(error.message);
    stopSpinner();
}

function showErrorNotification(message) {
    createCustomToast({
        message: message,
        type: 'error',
        title: 'Erreur',
        icon: 'exclamation-circle',
        timer: 5000,
    });
}

async function fetchAPI(url, options = {}) {
    startSpinner('Chargement des données...');
    try {
        const response = await fetch(url, {
            method: 'GET',
            ...options,
        });

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
}

/**
 * Fonctions de gestion du graphique
 */

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

/**
 * Fonctions de gestion des marqueurs et des événements
 */

function initializeMicroStationMarkers(dataCapteurSite) {
    if (!window.microStationMarkers) {
        window.microStationMarkers = {};
    }
    window.microStationMarkers = {};

    dataCapteurSite.forEach((capteur) => {
        window.microStationMarkers[capteur.id_site] = {
            data: capteur,
            hasValue: false,
            marker: null,
            textMarker: null,
        };
    });
}

async function processAndDisplayStations(
    filteredData,
    dataCapteurSite,
    pas_de_temps_atmo
) {
    for (const value of filteredData) {
        if (!validateStationData(value)) continue;

        updateStationMarker(value);
        const { microStationMarker, textMarker } = createStationMarkers(value);
        setupMarkerEvents(
            microStationMarker,
            textMarker,
            value,
            dataCapteurSite,
            pas_de_temps_atmo
        );
    }

    createDefaultMarkers(dataCapteurSite, pas_de_temps_atmo);
}

function validateStationData(value) {
    if (!value || !value.id_site || !value.lat || !value.lon) {
        console.warn('Données incomplètes pour un capteur:', value);
        return false;
    }
    return true;
}

function updateStationMarker(value) {
    if (!window.microStationMarkers[value.id_site]) {
        window.microStationMarkers[value.id_site] = {
            data: value,
            hasValue: false,
            marker: null,
            textMarker: null,
        };
    }
    window.microStationMarkers[value.id_site].data = value;
    window.microStationMarkers[value.id_site].hasValue = true;
}

function createStationMarkers(value) {
    const icon_param = createMarkerIcon(value);
    const microStationMarker = L.marker([value.lat, value.lon], {
        icon: L.icon(icon_param),
        zIndexOffset: 1000,
    }).addTo(atmoMicroLayer);

    microStationMarker.deviceId = value.id_site;
    microStationMarker.deviceData = value;

    const textMarker = createTextMarker(value);
    textMarker.addTo(atmoMicroLayer);

    // Lier les z-index des marqueurs
    microStationMarker.on('add', () => {
        const zIndex = microStationMarker.getZIndex();
        textMarker.setZIndexOffset(zIndex);
    });

    window.microStationMarkers[value.id_site].marker = microStationMarker;
    window.microStationMarkers[value.id_site].textMarker = textMarker;

    return { microStationMarker, textMarker };
}

function createMarkerIcon(value) {
    const icon_param = {
        iconUrl: 'img/microStationsAtmoSud/microStationAtmoSud_default.png',
        iconSize: [50, 50],
        iconAnchor: [5, 40],
        popupAnchor: [0, -10],
        tooltipAnchor: [-50, -10],
    };

    const valueToCheck = value.valeur_ref;
    const colorCode = getColorCodeForValue(valueToCheck, state.mesuresArray[0]);

    if (colorCode !== 'default') {
        const iconColorCode =
            colorCode === 'tres_mauvais'
                ? 'tresMauvais'
                : colorCode === 'extr_mauvais'
                  ? 'ExtrMauvais'
                  : colorCode;
        icon_param.iconUrl = `img/microStationsAtmoSud/microStationAtmoSud_${iconColorCode}.png`;
    }

    return icon_param;
}

function calculateTextParameters(value) {
    let textSize = 32;
    let x_position = 5;
    let y_position = 42;
    let checkPosition = 'right: 0px;';

    if (value >= 1000) {
        textSize = 16;
        x_position = 8; // Ajusté pour les nombres à 4 chiffres
        y_position = 42;
        // checkPosition = 'right: -12px;';
    } else if (value >= 100) {
        textSize = 20;
        x_position = 6; // Ajusté pour les nombres à 3 chiffres
        y_position = 42;
        // checkPosition = 'right: -14px;';
    } else if (value >= 10) {
        textSize = 26;
        x_position = 8;
        y_position = 42;
        // checkPosition = 'right: -16px;';
    }

    return { textSize, x_position, y_position, checkPosition };
}

function createTextMarkerHTML(value, textSize, checkPosition, stationData) {
    const hasValue = stationData.valeur !== null;
    const checkIcon = hasValue
        ? `<i class="bi bi-check-circle-fill" style="position: absolute; top: -10px; ${checkPosition} font-size: 14px; color: #28a745;"></i>`
        : '';

    return `<div id="textDiv" style="font-size: ${textSize}px; position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #333; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">
        ${value}
        ${checkIcon}
    </div>`;
}

function createTextMarker(value) {
    const roundedvalue = Math.round(parseFloat(value.valeur_ref));
    const { textSize, x_position, y_position, checkPosition } =
        calculateTextParameters(roundedvalue);

    const text_param = L.divIcon({
        className: 'my-div-icon',
        html: createTextMarkerHTML(
            roundedvalue,
            textSize,
            checkPosition,
            value
        ),
        iconAnchor: [x_position, y_position],
        popupAnchor: [30, -60],
        iconSize: [50, 50],
    });

    const textMarker = L.marker([value.lat, value.lon], {
        icon: text_param,
        zIndexOffset: 1000,
    });
    textMarker.deviceId = value.id_site;
    textMarker.deviceData = value;

    return textMarker;
}

function setupMarkerEvents(
    microStationMarker,
    textMarker,
    value,
    dataCapteurSite,
    pas_de_temps_atmo
) {
    const highlightMarker = () => {
        const zIndex = 2000; // Valeur plus élevée pour le marqueur survolé
        microStationMarker.setZIndexOffset(zIndex);
        textMarker.setZIndexOffset(zIndex);
        const tooltip = createTooltip(value, dataCapteurSite);
        document.body.appendChild(tooltip);
        microStationMarker.tooltip = tooltip;
        textMarker.tooltip = tooltip;
    };

    const resetMarker = () => {
        if (state.selectedMarker !== microStationMarker) {
            const zIndex = 1000; // Retour à la valeur normale
            microStationMarker.setZIndexOffset(zIndex);
            textMarker.setZIndexOffset(zIndex);
        }
        if (microStationMarker.tooltip) {
            microStationMarker.tooltip.remove();
            microStationMarker.tooltip = null;
            textMarker.tooltip = null;
        }
    };

    microStationMarker
        .on('mouseover', highlightMarker)
        .on('mouseout', resetMarker);
    textMarker
        .on('mouseover', highlightMarker)
        .on('mouseout', resetMarker)
        .on('click', () =>
            handleMarkerClick(
                microStationMarker,
                textMarker,
                value,
                pas_de_temps_atmo
            )
        );
}

function createDefaultMarkers(dataCapteurSite, pas_de_temps_atmo) {
    const pas_de_temps = getArrayFromLocalStorage('pasDeTempsLocal');

    Object.values(window.microStationMarkers).forEach((station) => {
        if (!station.hasValue) {
            // Pour le pas de temps 2min, on n'affiche que les capteurs NebuleAir
            if (pas_de_temps[0] === '2min') {
                if (station.data.modele_capteur === 'NebuleAir') {
                    const defaultMarker = createDefaultMarker(
                        station.data,
                        dataCapteurSite,
                        pas_de_temps_atmo
                    );
                    station.marker = defaultMarker;
                }
            } else {
                // Pour les autres pas de temps, on garde le comportement actuel
                const defaultMarker = createDefaultMarker(
                    station.data,
                    dataCapteurSite,
                    pas_de_temps_atmo
                );
                station.marker = defaultMarker;
            }
        }
    });
}

function createDefaultMarker(stationData, dataCapteurSite, pas_de_temps_atmo) {
    const defaultMarker = L.marker([stationData.lat, stationData.lon], {
        icon: L.icon({
            iconUrl: 'img/microStationsAtmoSud/microStationAtmoSud_default.png',
            iconSize: [50, 50],
            iconAnchor: [5, 40],
            popupAnchor: [0, -10],
            tooltipAnchor: [-50, -10],
        }),
    }).addTo(atmoMicroLayer);

    defaultMarker.deviceId = stationData.id_site;
    defaultMarker.deviceData = stationData;

    defaultMarker
        .on('click', () =>
            handleMarkerClick(
                defaultMarker,
                null,
                stationData,
                pas_de_temps_atmo
            )
        )
        .on('mouseover', () => {
            defaultMarker.setZIndexOffset(1000);
            const tooltip = createTooltip(stationData, dataCapteurSite);
            document.body.appendChild(tooltip);
            defaultMarker.tooltip = tooltip;
        })
        .on('mouseout', () => {
            if (state.selectedMarker !== defaultMarker) {
                defaultMarker.setZIndexOffset(0);
            }
            if (defaultMarker.tooltip) {
                defaultMarker.tooltip.remove();
                defaultMarker.tooltip = null;
            }
        });

    return defaultMarker;
}

/**
 * Fonctions de gestion des tooltips et des clics
 */

function handleMarkerClick(marker, textMarker, stationData, pas_de_temps_atmo) {
    console.log('click on micro station:', stationData.nom_site);

    resetPreviousMarker();
    highlightNewMarker(marker, textMarker);
    updateGlobalState(marker, textMarker, stationData);
    openSidePanelMicroStation(
        stationData,
        pas_de_temps_atmo,
        state.historiqueChart,
        state.mesuresArray
    );
}

function resetPreviousMarker() {
    if (state.selectedMarker && state.selectedMarker._icon) {
        state.selectedMarker.setZIndexOffset(0);
        state.selectedMarker._icon.classList.remove('marker-selected');
    }

    if (state.selectedText && state.selectedText._icon) {
        state.selectedText.setZIndexOffset(0);
        state.selectedText._icon.classList.remove('marker-selected');
    }
}

function highlightNewMarker(marker, textMarker) {
    marker.setZIndexOffset(1000);
    if (marker._icon) {
        marker._icon.classList.add('marker-selected');
    }

    if (textMarker) {
        textMarker.setZIndexOffset(1000);
        if (textMarker._icon) {
            textMarker._icon.classList.add('marker-selected');
        }
    }
}

function updateGlobalState(marker, textMarker, stationData) {
    state.selectedMarker = marker;
    state.selectedText = textMarker;
    state.selectedDeviceId = stationData.id_site;
    window.lastSelectedDeviceData = stationData;
}

function createTooltip(stationData, dataCapteurSite) {
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';

    const polluantsActifs = getActivePollutants(stationData, dataCapteurSite);
    const formattedPollutants = formatPollutantsList(
        polluantsActifs,
        stationData
    );

    tooltip.innerHTML = createTooltipHTML(stationData, formattedPollutants);
    tooltip.style.cssText = getTooltipStyles();

    return tooltip;
}

function getActivePollutants(stationData, dataCapteurSite) {
    const capteurInfo = dataCapteurSite?.find(
        (capteur) => capteur.id_site === stationData.id_site
    );

    if (capteurInfo?.variables) {
        return Array.isArray(capteurInfo.variables)
            ? capteurInfo.variables
            : capteurInfo.variables.split(',').map((v) => v.trim());
    }

    if (stationData.variables) {
        return Array.isArray(stationData.variables)
            ? stationData.variables
            : stationData.variables.split(',').map((v) => v.trim());
    }

    return [];
}

function formatPollutantsList(polluantsActifs, stationData) {
    const processedPollutants = new Set();

    const formattedPollutants = polluantsActifs
        .filter((polluant) => {
            const normalizedPolluant = normalizePollutantName(polluant);
            if (
                !normalizedPolluant ||
                processedPollutants.has(normalizedPolluant)
            ) {
                return false;
            }

            const isSupported = Object.values(supportedMesures).some(
                (mesure) => mesure.code === normalizedPolluant
            );

            if (isSupported) {
                processedPollutants.add(normalizedPolluant);
            }

            return isSupported;
        })
        .map((polluant) => formatPollutantDisplay(polluant));

    stationData.polluantMesure = Array.from(processedPollutants).map((p) =>
        p.toUpperCase()
    );
    return formattedPollutants;
}

function normalizePollutantName(polluant) {
    return polluant
        .toLowerCase()
        .replace('pm2.5', 'pm25')
        .replace('pm1.0', 'pm1')
        .replace('pm10.0', 'pm10')
        .replace('air pres.', '')
        .replace('air temp.', '')
        .replace('air hum.', '')
        .replace(' nombre', '')
        .trim();
}

function formatPollutantDisplay(polluant) {
    const normalizedPolluant = normalizePollutantName(polluant);

    const pollutantFormats = {
        pm1: '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>1</sub></span>',
        pm25: '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>2.5</sub></span>',
        pm10: '<span class="text-muted">●</span> <span class="fw-semibold">PM<sub>10</sub></span>',
        no2: '<span class="text-muted">●</span> <span class="fw-semibold">NO<sub>2</sub></span>',
        so2: '<span class="text-muted">●</span> <span class="fw-semibold">SO<sub>2</sub></span>',
        o3: '<span class="text-muted">●</span> <span class="fw-semibold">O<sub>3</sub></span>',
        h2s: '<span class="text-muted">●</span> <span class="fw-semibold">H<sub>2</sub>S</span>',
        nh3: '<span class="text-muted">●</span> <span class="fw-semibold">NH<sub>3</sub></span>',
    };

    return (
        pollutantFormats[normalizedPolluant] ||
        `<span class="text-muted">●</span> <span class="fw-semibold">${formatPollutantName(polluant)}</span>`
    );
}

function createTooltipHTML(stationData, formattedPollutants) {
    return `
        <div class="card border-0 shadow-sm">
            <div class="card-body p-2">
                <h6 class="card-title mb-1">${stationData.nom_site}</h6>
                <div class="d-flex flex-column">
                    ${
                        stationData.time
                            ? `
                        <small class="text-muted mb-1">
                            <i class="bi bi-clock me-1"></i>
                            Dernière mise à jour: ${new Date(stationData.time).toLocaleString()}
                        </small>
                    `
                            : ''
                    }
                    <small class="text-muted mb-1">
                        <i class="bi bi-info-circle me-1"></i>
                        ${stationData.modele_capteur || ''} - ${stationData.marque_capteur || ''}
                    </small>
                    <small class="text-muted">
                        Polluants mesurés:<br>
                        ${formattedPollutants.join('<br>')}
                    </small>
                </div>
            </div>
        </div>
    `;
}

function getTooltipStyles() {
    return `
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
}
