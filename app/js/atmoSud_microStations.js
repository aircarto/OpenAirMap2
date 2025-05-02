// Récupération des données des micro-stations AtmoSud
// Cette fonction charge les données des micro-stations AtmoSud et les affiche sur la carte

import { atmoMicroLayer } from '../app.js';
import {
    formatPollutantName,
    getArrayFromLocalStorage,
    getColorCodeForValue,
    openSidePanelGeneric,
} from './utils.js';
import { isSourceActive } from './dataSourceManager.js';
import { panelManager } from './panelManager.js';
import { startSpinner, stopSpinner } from './spinnerManager.js';
import { API_atmoSud } from '../config.js';

import { createCustomToast } from './toaster.js';

// Variables locales au module
var pas_de_temps_chart = 'horaire';
var historique_chart = '24h';
var mesures_array = [];
var isFetching = false; // Variable pour gérer l'état des appels API
var customDateRange = {
    start: null,
    end: null,
};

// Définition des constantes globales
const POLLUTANT_COLORS = {
    pm1: '#FF5733',
    'pm2.5': '#33A1FF',
    pm10: '#33FF57',
    no2: '#A133FF',
};
const card1_img = document.getElementById('card1_img');
const card1_title = document.getElementById('card1_title');
const card1_text = document.getElementById('card1_text');
const card2_link = document.getElementById('card2_link');
/**
 * Cette fonction charge les micro-stations AtmoSud sur la carte
 * Elle fait plusieurs choses :
 * 1. Vérifie qu'aucun autre chargement n'est en cours
 * 2. Récupère les paramètres de l'utilisateur (temps, mesures)
 * 3. Appelle l'API AtmoSud pour obtenir les données
 * 4. Affiche les stations sur la carte avec des marqueurs
 */
export async function loadAtmoSudMicroStation() {
    try {
        // On vérifie si un chargement est déjà en cours pour éviter les doublons
        // if (isFetching) {
        //     console.log('Un chargement est déjà en cours, on attend...');
        //     return;
        // }
        // isFetching = true; // On indique qu'un chargement commence

        // On nettoie la carte en enlevant tous les marqueurs existants
        atmoMicroLayer.clearLayers();

        // On récupère le pas de temps choisi par l'utilisateur
        // Le pas de temps c'est l'intervalle entre chaque mesure (ex: toutes les heures)
        var pas_de_temps = getArrayFromLocalStorage('pasDeTempsLocal');
        var pas_de_temps_atmo = '';

        // On convertit le pas de temps en format compatible avec l'API AtmoSud
        switch (pas_de_temps[0]) {
            case 'instantane':
                pas_de_temps_atmo = 'brute';
                pas_de_temps_chart = pas_de_temps_atmo;
                break;
            case '2min':
                pas_de_temps_atmo = 'brute';
                pas_de_temps_chart = 'brute';
                break;
            case 'qh':
                pas_de_temps_atmo = 'quart-horaire';
                pas_de_temps_chart = 'quart-horaire';
                break;
            case 'h':
                pas_de_temps_atmo = 'horaire';
                pas_de_temps_chart = 'horaire';
                break;
            case 'd':
                // Si c'est quotidien, on ne fait rien car c'est géré ailleurs
                return;
            default:
                pas_de_temps_atmo = 'horaire';
                pas_de_temps_chart = 'horaire';
        }

        // On récupère les polluants que l'utilisateur veut voir
        var mesures = getArrayFromLocalStorage('mesuresLocal');
        if (['so2', 'nh3', 'o3', 'h2s'].includes(mesures[0])) {
            console.log('#########################');
            console.log('mesure non supportée :' + mesures[0]);
            console.log('#########################');
            return;
        }
        mesures_array = [...mesures];
        var mesures_atmo = mesures;

        // Cas spécial pour PM2.5 qui s'écrit différemment dans l'API
        if (mesures[0] === 'pm25') {
            mesures_atmo = ['pm2.5'];
        }

        // Liste de tous les polluants possibles
        let allPollutants = ['pm1', 'pm2.5', 'pm10', 'no2'];

        // On construit l'URL pour appeler l'API AtmoSud pour récupérer les dernieres mesures disponible
        let full_url_derniere = `
            ${API_atmoSud.url_base}${API_atmoSud.url_capteurs_mesures_dernieres}?
            format=json
            &download=false
            &valeur_brute=true
            &type_capteur=true
            &variable=${mesures_atmo}
            &aggregation=${pas_de_temps_atmo}
        `.replace(/\s+/g, '');

        // On appelle l'API et on attend la réponse
        const data = await fetchAPI(full_url_derniere);
        console.log(`${full_url_derniere} :`, data);
        isFetching = false; // On indique que le chargement est terminé

        let fullUrlCapteurSite =
            `${API_atmoSud.url_base}${API_atmoSud.url_capteurs_sites}?
            format=json
            &variable=${mesures_atmo}
            &actifs=181
        `.replace(/\s+/g, '');
        let dataCapteurSite = await fetchAPI(fullUrlCapteurSite);
        console.log(`${fullUrlCapteurSite} : `, dataCapteurSite);
        // On vérifie que les données reçues sont bien un tableau
        if (!Array.isArray(data)) {
            throw new Error('Les données reçues ne sont pas au bon format');
        }

        // On filtre les données pour ne garder que le polluant sélectionné
        let filteredData = data.filter(async (item) => {
            if (!item || !item.variable) return false;

            let selectedPollutant = mesures[0];
            if (selectedPollutant === 'pm25') {
                selectedPollutant = 'pm2.5';
            }
            //ABA- Todo: Appliquer le marqueur par defaut initialement à tous les capteurs pour ensuite les modifier en fonction de la valeur mesurée comme pour les Stations de référence
            dataCapteurSite.forEach((capteur) => {
                if (capteur.id_site === item.id_site) {
                    // Filter capteur.variables to only keep pollutants from allPollutants
                    if (capteur.variables) {
                        capteur.variables =
                            typeof capteur.variables === 'string'
                                ? capteur.variables
                                      .split(',')
                                      .map((v) => v.trim())
                                      .filter((variable) =>
                                          allPollutants.includes(
                                              variable.toLowerCase()
                                          )
                                      )
                                : Array.isArray(capteur.variables)
                                  ? capteur.variables.filter((variable) =>
                                        allPollutants.includes(
                                            variable.toLowerCase()
                                        )
                                    )
                                  : [];
                    }
                    item.variablesMesure = capteur.variables;
                }
            });
            return item.variable.toLowerCase() === selectedPollutant;
        });

        // Filtre supplémentaire pour le pas de temps de 2 minutes
        if (pas_de_temps[0] === '2min') {
            filteredData = filteredData.filter(
                (item) => item.pas_de_temps === 120
            );
        }

        // Si on n'a pas de données, on affiche un message d'avertissement
        if (filteredData.length === 0) {
            createCustomToast({
                message:
                    'Aucune donnée disponible pour les critères sélectionnés',
                type: 'warning',
                title: 'Attention',
                icon: 'exclamation-triangle',
                timer: 5000,
            });
            return;
        }

        // Pour chaque station dans les données filtrées
        for (const value of filteredData) {
            // On vérifie que les données sont complètes
            if (!value || !value.id_site || !value.lat || !value.lon) {
                console.warn('Données incomplètes pour un capteur:', value);
                continue;
            }

            // On prépare l'icône du marqueur
            var icon_param = {
                iconUrl:
                    'img/microStationsAtmoSud/microStationAtmoSud_default.png',
                iconSize: [50, 50],
                iconAnchor: [5, 40],
                popupAnchor: [0, -10],
                tooltipAnchor: [-50, -10],
            };

            // On détermine la couleur de l'icône selon la valeur mesurée
            let valueToCheck = value['valeur_ref'];
            let colorCode = getColorCodeForValue(valueToCheck, mesures[0]);

            if (colorCode !== 'default') {
                let iconColorCode = colorCode;
                if (colorCode === 'tres_mauvais') {
                    iconColorCode = 'tresMauvais';
                } else if (colorCode === 'extr_mauvais') {
                    iconColorCode = 'ExtrMauvais';
                }
                icon_param.iconUrl =
                    'img/microStationsAtmoSud/microStationAtmoSud_' +
                    iconColorCode +
                    '.png';
            }

            // On crée le marqueur sur la carte
            var microStation_icon = L.icon(icon_param);
            let microStationMarker = L.marker([value['lat'], value['lon']], {
                icon: microStation_icon,
            }).addTo(atmoMicroLayer);

            // On stocke des informations sur le marqueur
            microStationMarker.deviceId = value['id_site'];
            microStationMarker.deviceData = value;

            // On garde une référence à tous les marqueurs
            if (!window.deviceMarkers) window.deviceMarkers = {};
            window.deviceMarkers[value['id_site']] = {
                marker: microStationMarker,
                data: value,
            };

            // On prépare l'affichage de la valeur
            let roundedvalue = Math.round(parseFloat(value['valeur_ref']));
            var textSize = 32;
            var x_position = -12;
            var y_position = 40;
            var checkPosition = 'right: -15px;';

            // On ajuste la taille du texte selon la valeur
            if (roundedvalue >= 10) {
                textSize = 25;
                x_position = -12;
                y_position = 35;
                checkPosition = 'right: -12px;';
            }
            if (roundedvalue >= 100) {
                textSize = 20;
                x_position = -10;
                y_position = 32;
                checkPosition = 'right: -10px;';
            }
            if (roundedvalue >= 1000) {
                textSize = 16;
                x_position = -8;
                y_position = 30;
                checkPosition = 'right: -8px;';
            }

            // On crée le texte qui sera affiché sur le marqueur
            var text_param = L.divIcon({
                className: 'my-div-icon',
                html:
                    '<div id="textDiv" style="font-size: ' +
                    textSize +
                    'px; position: relative; display: flex; align-items: center; justify-content: center; width: 100%;">' +
                    roundedvalue +
                    (value['valeur'] !== null
                        ? '<i class="bi bi-check-circle-fill" style="position: absolute; top: -10px; ' +
                          checkPosition +
                          ' font-size: 12px; color: #28a745;"></i>'
                        : '') +
                    '</div>',
                iconAnchor: [x_position, y_position],
                popupAnchor: [30, -60],
            });

            // On ajoute le texte sur la carte
            let textMarker = L.marker([value['lat'], value['lon']], {
                icon: text_param,
            })
                .on('click', function () {
                    // Quand on clique sur un marqueur
                    console.log('click on micro station:', value['nom_site']);

                    // On désélectionne le marqueur précédent s'il existe
                    if (
                        globalSelectedMarker &&
                        globalSelectedMarker !== microStationMarker &&
                        globalSelectedMarker._icon
                    ) {
                        globalSelectedMarker.setZIndexOffset(0);
                        globalSelectedMarker._icon.classList.remove(
                            'marker-selected'
                        );
                    }

                    if (
                        globalSelectedText &&
                        globalSelectedText !== textMarker &&
                        globalSelectedText._icon
                    ) {
                        globalSelectedText.setZIndexOffset(0);
                        globalSelectedText._icon.classList.remove(
                            'marker-selected'
                        );
                    }

                    // On met en surbrillance le nouveau marqueur
                    microStationMarker.setZIndexOffset(1000);
                    textMarker.setZIndexOffset(1000);
                    if (microStationMarker._icon) {
                        microStationMarker._icon.classList.add(
                            'marker-selected'
                        );
                    }
                    if (textMarker._icon) {
                        textMarker._icon.classList.add('marker-selected');
                    }

                    // On met à jour les variables globales
                    globalSelectedMarker = microStationMarker;
                    globalSelectedText = textMarker;
                    globalSelectedDeviceId = value['id_site'];
                    window.lastSelectedDeviceData = value;

                    // On ouvre le panneau latéral avec les détails
                    openSidePanelMicroStation(
                        value,
                        pas_de_temps_atmo,
                        historique_chart,
                        mesures_atmo
                    );
                })
                .addTo(atmoMicroLayer);

            // On stocke des informations sur le texte
            textMarker.deviceId = value['id_site'];
            textMarker.deviceData = value;

            if (window.deviceMarkers[value['id_site']]) {
                window.deviceMarkers[value['id_site']].textMarker = textMarker;
            }

            // Fonction appelée quand on survole un marqueur
            function highlightMarker() {
                microStationMarker.setZIndexOffset(1000);
                textMarker.setZIndexOffset(1000);
                // console.log(
                //     'value: ',
                //     new Date(value['time']).toLocaleString()
                // );

                // On crée une infobulle
                const tooltip = document.createElement('div');
                tooltip.className = 'custom-tooltip';
                tooltip.innerHTML = `
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-2">
                            <h6 class="card-title mb-1">${value['nom_site']}</h6>
                            <div class="d-flex flex-column">
                                <small class="text-muted mb-1">
                                    <i class="bi bi-clock me-1"></i>
                                    Dernière mise à jour: ${new Date(value['time']).toLocaleString()}
                                </small>
                                <small class="text-muted mb-1">
                                    <i class="bi bi-info-circle me-1"></i>
                                    ${value['modele_capteur']} - ${value['marque_capteur']}
                                </small>
                                <small class="text-muted">
                                    Polluants mesurés:<br>
                                    ${value['variablesMesure'].map((polluant) => `<span class="text-success">●</span> <span class="fw-semibold">${formatPollutantName(polluant)}</span>`).join('<br>')}
                                </small>
                            </div>
                        </div>
                    </div>
                `;

                // On positionne l'infobulle
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

                // On ajoute l'infobulle à la page
                document.body.appendChild(tooltip);
                microStationMarker.tooltip = tooltip;
                textMarker.tooltip = tooltip;
            }

            // Fonction appelée quand on quitte un marqueur
            function resetMarker() {
                if (globalSelectedMarker !== microStationMarker) {
                    microStationMarker.setZIndexOffset(0);
                    textMarker.setZIndexOffset(0);
                }

                if (microStationMarker.tooltip) {
                    microStationMarker.tooltip.remove();
                    microStationMarker.tooltip = null;
                    textMarker.tooltip = null;
                }
            }

            // On ajoute les événements de survol aux marqueurs
            microStationMarker
                .on('mouseover', highlightMarker)
                .on('mouseout', resetMarker);
            textMarker
                .on('mouseover', highlightMarker)
                .on('mouseout', resetMarker);
        }
    } catch (error) {
        // Si une erreur se produit, on l'affiche
        console.error('Erreur dans loadAtmoSudMicroStation:', error);
        showErrorNotification(error.message);
    }
}

// Fonction pour ouvrir le panneau latéral avec les informations du capteur
export function openSidePanelMicroStation(
    data,
    pas_de_temps_atmo,
    historique,
    mesures_atmo
) {
    if (!isSourceActive('atmo_micro')) {
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

    console.log('data capteur cliqué: ', data);

    // Mise à jour des informations de la carte
    card1_img.src = 'img/microStationsAtmoSud/microStationAtmoSud_default.png';
    card1_title.innerHTML = data.site_info
        ? data.site_info.nom_site
        : data.nom_site;
    card1_subtitle.innerHTML =
        'Micro-station AtmoSud - ' +
        (data.site_info ? data.site_info.modele_capteur : data.modele_capteur);
    card1_text.innerHTML = '';

    card2_text.innerHTML =
        "Les micro-stations sont des capteurs de mesure de la qualité de l'air déployés par AtmoSud pour compléter le réseau de stations de référence.";
    card2_link.innerHTML = 'AtmoSud.org';
    card2_link.href = 'https://www.atmosud.org';

    // Utiliser le gestionnaire de panneau pour configurer les boutons
    panelManager.openPanel('atmo_micro', data.id_site, {
        pasDeTempsAtmo: pas_de_temps_atmo,
        historiqueChart: historique,
        mesuresArray: mesures_atmo,
        pasDeTempsChart: pas_de_temps_atmo,
        pasDeTemps: pas_de_temps_atmo,
        customDateRange: customDateRange,
    });

    openSidePanelGeneric();
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
    add_mesure = false,
    custom_start = null,
    custom_end = null
) {
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
        pas_de_temps_chart = pas_de_temps;
        historique_chart = historique;

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
        } else if (customDateRange.start && customDateRange.end) {
            params.append('debut', customDateRange.start);
            params.append('fin', customDateRange.end);
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

        console.log('Paramètres de la requête à /capteurs/mesures:', {
            'Date de début': params.get('debut'),
            'Date de fin': params.get('fin'),
            'ID du site': params.get('id_site'),
            Format: params.get('format'),
            Téléchargement: params.get('download'),
            'Nombre décimales': params.get('nb_dec'),
            'Valeur brute': params.get('valeur_brute'),
            'Variable(s)': params.get('variable'),
            'Type capteur': params.get('type_capteur'),
            Agrégation: params.get('aggregation'),
        });

        // Appel à l'API pour récupérer les données
        const data = await fetchAPI(full_url);
        console.log('data: ', data);

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
        if (pas_de_temps === '2min') {
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
        showErrorNotification(error.message);
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
            paddingBottom: 100,
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
            numberFormat: `#.#  ${unite}`,
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
// Exporter les variables qui pourraient être nécessaires ailleurs
export { pas_de_temps_chart, historique_chart, mesures_array };

// Fonction utilitaire pour les appels API
async function fetchAPI(url, options = {}) {
    startSpinner('Chargement des données...');
    try {
        const response = await fetch(url, {
            method: 'GET',
            ...options,
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Validation des données
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

// Fonction pour afficher les notifications d'erreur
function showErrorNotification(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.innerHTML = `
        <h5>Erreur lors de la récupération des données</h5>
        <p>${message}</p>
        <p>Veuillez réessayer plus tard ou contacter l'administrateur.</p>
    `;
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translateX(-50%)';
    errorDiv.style.zIndex = '1000';
    document.body.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.remove();
    }, 10000);
}
