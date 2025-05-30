// Récupération des données des capteurs Sensor.Community
// Cette fonction charge les données des capteurs Sensor.Community et les affiche sur la carte

import { sensorCommunityLayer } from './layers.js';
import { getArrayFromLocalStorage } from './utils.js';
import { isSourceActive } from './dataSourceManager.js';
import { createCustomToast } from './toaster.js';
import { createSensorCommunityMarker } from './markerManager.js';

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

/**
 * Normalise le type de mesure pour la compatibilité avec notre système
 * @param {string} valueType - Type de mesure original
 * @returns {string} - Type de mesure normalisé
 */
function normalizeValueType(valueType) {
    // Mapping des types de mesures Sensor.Community vers nos codes
    const mapping = {
        P0: 'pm1', // PM1
        P1: 'pm10', // PM10
        P2: 'pm25', // PM2.5
        SDS_P1: 'pm10',
        SDS_P2: 'pm25',
    };
    return mapping[valueType] || valueType;
}

/**
 * Charge les capteurs Sensor.Community sur la carte
 * @returns {Promise<void>}
 */
export async function loadSensorCommunity() {
    console.log('loadSensorCommunity');
    try {
        // Vérification si la source est active
        if (!isSourceActive('sensor_community')) {
            console.log('Source Sensor.Community non active');
            return;
        }

        // Nettoyage de la couche
        sensorCommunityLayer.clearLayers();

        // Récupération des paramètres de configuration
        const pas_de_temps = getArrayFromLocalStorage('pasDeTempsLocal')[0];
        const mesures = getArrayFromLocalStorage('mesuresLocal');

        // Vérification si le polluant est supporté
        const mesure = mesures[0];
        if (!['pm1', 'pm25', 'pm10'].includes(mesure)) {
            createCustomToast({
                message: `Le polluant ${mesure} n'est pas supporté pour Sensor.Community.`,
                type: 'warning',
                title: 'Attention',
                icon: 'exclamation-triangle',
                timer: 5000,
            });
            return;
        } else if (pas_de_temps != 'instantane' && pas_de_temps != '2min') {
            createCustomToast({
                message: `Le pas de temps ${pas_de_temps} n'est pas supporté pour Sensor.Community.`,
                type: 'warning',
                title: 'Attention',
                icon: 'exclamation-triangle',
                timer: 5000,
            });
            return;
        }

        // Construction de l'URL pour l'API Sensor.Community
        const url =
            'https://data.sensor.community/airrohr/v1/filter/country=FR';

        // Appel à l'API
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Données Sensor.Community reçues:', data);

        // Log des types de mesures disponibles
        if (data && data.length > 0) {
            const uniqueValueTypes = new Set();
            data.forEach((sensor) => {
                if (sensor.sensordatavalues) {
                    sensor.sensordatavalues.forEach((value) => {
                        uniqueValueTypes.add(value.value_type);
                    });
                }
            });
            console.log(
                'Types de mesures disponibles:',
                Array.from(uniqueValueTypes)
            );
        }

        // Traitement des données reçues
        if (data && data.length > 0) {
            data.forEach((sensor) => {
                // Vérification des coordonnées
                if (
                    sensor.location &&
                    sensor.location.latitude &&
                    sensor.location.longitude
                ) {
                    // Normalisation des types de mesures
                    if (sensor.sensordatavalues) {
                        sensor.sensordatavalues = sensor.sensordatavalues.map(
                            (value) => ({
                                ...value,
                                value_type: normalizeValueType(
                                    value.value_type
                                ),
                            })
                        );
                    }

                    // Création du marqueur pour chaque capteur
                    createSensorCommunityMarker(sensor, pas_de_temps, mesure);
                }
            });
        }
    } catch (error) {
        console.error(
            'Erreur lors du chargement des capteurs Sensor.Community:',
            error
        );
        createCustomToast({
            message: 'Erreur lors du chargement des capteurs Sensor.Community',
            type: 'error',
            title: 'Erreur',
            icon: 'exclamation-circle',
            timer: 5000,
        });
    }
}

/**
 * Récupère les données historiques d'un capteur Sensor.Community NE MARCHE PAS
 * @param {string} deviceId - ID du capteur
 * @param {string} startDate - Date de début (format ISO)
 * @param {string} endDate - Date de fin (format ISO)
 * @returns {Promise<Object>} - Données historiques du capteur
 */
export async function getSensorCommunityHistoricalData(
    deviceId,
    startDate,
    endDate
) {
    try {
        // Construction de l'URL avec les dates
        const url = `https://data.sensor.community/airrohr/v1/filter/device_id=${deviceId}&start=${startDate}&end=${endDate}`;
        console.log('Requête Sensor.Community:', {
            deviceId,
            url,
            startDate,
            endDate,
        });

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Réponse brute de l'API:", data);

        if (!data || data.length === 0) {
            console.log('Aucune donnée trouvée pour le capteur:', deviceId);
            throw new Error(
                "Le capteur existe mais n'a pas envoyé de données récemment"
            );
        }

        // Normalisation des types de mesures
        const normalizedData = data.map((sensor) => ({
            ...sensor,
            sensordatavalues: sensor.sensordatavalues.map((value) => ({
                ...value,
                value_type: normalizeValueType(value.value_type),
            })),
        }));

        return normalizedData;
    } catch (error) {
        console.error(
            'Erreur lors de la récupération des données historiques:',
            error
        );
        throw error;
    }
}

/**
 * Crée une fenêtre popup draggable pour afficher le graphique
 * @param {string} deviceId - ID du capteur
 * @returns {HTMLElement} - Élément de la fenêtre popup
 */
function createDraggablePopup(deviceId) {
    // Suppression de l'ancienne fenêtre si elle existe
    const oldPopup = document.getElementById('sensor-community-popup');
    if (oldPopup) {
        oldPopup.remove();
    }

    // Création de la fenêtre popup
    const popup = document.createElement('div');
    popup.id = 'sensor-community-popup';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 400px;
        min-height: 300px;
    `;

    // Création de l'en-tête
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
        cursor: move;
    `;

    const title = document.createElement('h5');
    title.textContent = `Capteur Sensor.Community - ${deviceId}`;
    title.style.margin = '0';

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0 5px;
    `;
    closeButton.onclick = () => popup.remove();

    header.appendChild(title);
    header.appendChild(closeButton);
    popup.appendChild(header);

    // Création du conteneur pour le graphique
    const chartContainer = document.createElement('div');
    chartContainer.id = 'chartdiv_sensor';
    chartContainer.style.cssText = `
        width: 100%;
        height: 300px;
    `;
    popup.appendChild(chartContainer);

    // Ajout de la fenêtre au document
    document.body.appendChild(popup);

    // Rendre la fenêtre draggable
    new PlainDraggable(popup, {
        handle: header,
        containment: document.body,
    });

    return popup;
}

/**
 * Affiche les données historiques d'un capteur Sensor.Community dans un graphique
 * @param {string} deviceId - ID du capteur
 * @param {string} mesure - Type de mesure à afficher
 * @param {string} historique - Période historique ('24h', '7d', etc.)
 */
export async function displaySensorCommunityHistoricalData(
    deviceId,
    mesure,
    historique = '24h'
) {
    try {
        // Création de la fenêtre popup
        const popup = createDraggablePopup(deviceId);

        // Calcul des dates pour les 24 dernières heures
        const endDate = new Date();
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - 24);

        // Formatage des dates pour l'API
        const formatDate = (date) => {
            return date.toISOString().replace('T', ' ').slice(0, 19);
        };

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        // Ajout d'un message d'information
        const infoMessage = document.createElement('div');
        infoMessage.style.cssText = `
            background-color: #f8f9fa;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 4px;
            font-size: 0.9em;
            color: #666;
        `;
        infoMessage.innerHTML = `
            <i class="fas fa-info-circle"></i>
            Les données historiques sont limitées aux dernières 24 heures pour les capteurs Sensor.Community.
            <br>
            <small>Note: Les données peuvent avoir un délai de 5-10 minutes.</small>
        `;
        popup.insertBefore(infoMessage, popup.firstChild);

        // Récupération des données historiques avec les dates
        const data = await getSensorCommunityHistoricalData(
            deviceId,
            formattedStartDate,
            formattedEndDate
        );

        if (!data || data.length === 0) {
            throw new Error('Aucune donnée disponible pour ce capteur');
        }

        // Préparation des données pour le graphique
        const chartData = data
            .map((sensor) => {
                const value = sensor.sensordatavalues?.find(
                    (v) => v.value_type === mesure
                )?.value;
                if (value === undefined) {
                    console.log(
                        'Valeur non trouvée pour la mesure:',
                        mesure,
                        'dans:',
                        sensor.sensordatavalues
                    );
                    return null;
                }
                return {
                    date: new Date(sensor.timestamp),
                    value: parseFloat(value),
                };
            })
            .filter((point) => point !== null && !isNaN(point.value));

        console.log('Données préparées pour le graphique:', chartData);

        if (chartData.length === 0) {
            throw new Error('Aucune donnée valide pour le graphique');
        }

        // Création du graphique avec amCharts
        am5.ready(function () {
            const chartDiv = document.getElementById('chartdiv_sensor');
            if (!chartDiv) {
                console.error("L'élément chartdiv_sensor n'existe pas");
                return;
            }

            // Nettoyage du graphique précédent
            if (window.amchart_root) {
                window.amchart_root.dispose();
            }

            // Création du graphique
            window.amchart_root = am5.Root.new('chartdiv_sensor');
            const chart = window.amchart_root.container.children.push(
                am5xy.XYChart.new(window.amchart_root, {
                    panY: false,
                    layout: window.amchart_root.verticalLayout,
                })
            );

            // Création des axes
            const xAxis = chart.xAxes.push(
                am5xy.DateAxis.new(window.amchart_root, {
                    baseInterval: { timeUnit: 'minute', count: 1 },
                    renderer: am5xy.AxisRendererX.new(window.amchart_root, {}),
                    tooltip: am5.Tooltip.new(window.amchart_root, {}),
                })
            );

            const yAxis = chart.yAxes.push(
                am5xy.ValueAxis.new(window.amchart_root, {
                    renderer: am5xy.AxisRendererY.new(window.amchart_root, {}),
                })
            );

            // Création de la série
            const series = chart.series.push(
                am5xy.LineSeries.new(window.amchart_root, {
                    name: mesure.toUpperCase(),
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueXField: 'date',
                    valueYField: 'value',
                    tooltip: am5.Tooltip.new(window.amchart_root, {
                        labelText: '{valueY}',
                    }),
                })
            );

            // Ajout des données
            series.data.setAll(chartData);

            // Ajout du curseur
            chart.set(
                'cursor',
                am5xy.XYCursor.new(window.amchart_root, {
                    behavior: 'zoomX',
                })
            );

            // Ajout de la légende
            const legend = chart.children.push(
                am5.Legend.new(window.amchart_root, {
                    centerX: am5.p50,
                    x: am5.p50,
                })
            );
            legend.data.setAll([series]);

            // Mise à jour du graphique
            series.appear(1000);
            chart.appear(1000, 100);
        });
    } catch (error) {
        console.error(
            "Erreur lors de l'affichage des données historiques:",
            error
        );
        createCustomToast({
            message:
                error.message ||
                "Erreur lors de l'affichage des données historiques",
            type: 'error',
            title: 'Erreur',
            icon: 'exclamation-circle',
            timer: 5000,
        });
    }
}

// Export des variables d'état
export { state };
