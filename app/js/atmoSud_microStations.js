/*
Récupération des données des micro stations
-> API ATMOSUD "OBSERVATIONS/CAPTEURS/DERNIERES"
-> Ou plutot "OBSERVATIONS/CAPTEURS/SITES"

En réponse on a:

valeur          valeur corrigée
valeur_brute    valeur brute
valeur_ref      valeur corrigée si existe sinon valeur brute

*/

// Récupération des données des micro-stations AtmoSud
// Cette fonction charge les données des micro-stations AtmoSud et les affiche sur la carte

import {
    getArrayFromLocalStorage,
    pasDeTempsLocal,
    mesuresLocal,
    getColorCodeForValue,
    openSidePanelGeneric,
    card1_img,
    card1_title,
    card1_text,
    card2_link,
    atmoMicroLayer,
} from '../app.js';

import { isSourceActive } from './dataSourceManager.js';

import { createCustomToast } from './toaster.js';

// Variables locales au module
var pas_de_temps_chart = 'horaire';
var historique_chart = '24h';
var mesures_array = [];
var isFetching = false; // Variable pour gérer l'état des appels API

// Déclaration des variables pour les boutons d'historique
let btn_historique_custom;
let btn_historique_start_date;
let btn_historique_end_date;
let btn_historique_1h;
let btn_historique_3h;
let btn_historique_24h;
let btn_historique_7d;
let btn_historique_30d;
let btn_historique_365d;
let btn_pas_de_temps_2min;
let btn_pas_de_temps_qh;
let btn_pas_de_temps_h;
let btn_pas_de_temps_d;
let btn_poluant_pm1;
let btn_poluant_pm25;
let btn_poluant_pm10;
let btn_poluant_no2;
let btn_poluant_so2;
let btn_poluant_o3;
let btn_poluant_h2s;
let btn_poluant_nh3;

// Initialisation des boutons au chargement du DOM
document.addEventListener('DOMContentLoaded', function () {
    btn_historique_custom = document.getElementById('apply_date_range');
    btn_historique_start_date = document.getElementById('start_date');
    btn_historique_end_date = document.getElementById('end_date');
    btn_historique_1h = document.getElementById('btn_historique_1h');
    btn_historique_3h = document.getElementById('btn_historique_3h');
    btn_historique_24h = document.getElementById('btn_historique_24h');
    btn_historique_7d = document.getElementById('btn_historique_7d');
    btn_historique_30d = document.getElementById('btn_historique_30d');
    btn_historique_365d = document.getElementById('btn_historique_365d');
    btn_pas_de_temps_2min = document.getElementById('btn_pas_de_temps_2min');
    btn_pas_de_temps_qh = document.getElementById('btn_pas_de_temps_qh');
    btn_pas_de_temps_h = document.getElementById('btn_pas_de_temps_h');
    btn_pas_de_temps_d = document.getElementById('btn_pas_de_temps_d');
    btn_poluant_pm1 = document.getElementById('btn_poluant_pm1');
    btn_poluant_pm25 = document.getElementById('btn_poluant_pm25');
    btn_poluant_pm10 = document.getElementById('btn_poluant_pm10');
    btn_poluant_no2 = document.getElementById('btn_poluant_no2');
    btn_poluant_so2 = document.getElementById('btn_poluant_so2');
    btn_poluant_o3 = document.getElementById('btn_poluant_o3');
    btn_poluant_h2s = document.getElementById('btn_poluant_h2s');
    btn_poluant_nh3 = document.getElementById('btn_poluant_nh3');
});

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
        if (isFetching) {
            console.log('Un chargement est déjà en cours, on attend...');
            return;
        }
        isFetching = true; // On indique qu'un chargement commence

        // On nettoie la carte en enlevant tous les marqueurs existants
        atmoMicroLayer.clearLayers();

        // On récupère le pas de temps choisi par l'utilisateur
        // Le pas de temps c'est l'intervalle entre chaque mesure (ex: toutes les heures)
        var pas_de_temps = getArrayFromLocalStorage(pasDeTempsLocal);
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
        var mesures = getArrayFromLocalStorage(mesuresLocal);
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
            https://api.atmosud.org/observations/capteurs/mesures/dernieres?
            format=json
            &download=false
            &valeur_brute=true
            &type_capteur=true
            &variable=${mesures_atmo}
            &aggregation=${pas_de_temps_atmo}
            &nb_dec=1
        `.replace(/\s+/g, '');

        // On appelle l'API et on attend la réponse
        const data = await fetchAPI(full_url_derniere);
        isFetching = false; // On indique que le chargement est terminé

        let fullUrlCapteurSite = `https://preprod-api.atmosud.org/observations/capteurs/sites?format=json`;
        let dataCapteurSite = await fetchAPI(fullUrlCapteurSite);
        console.log('dataCapteurSite: ', dataCapteurSite);
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
            console.log('item: ', item);
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
            var x_position = -10;
            var y_position = 41;

            // On ajuste la taille du texte selon la valeur
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

            // On crée le texte qui sera affiché sur le marqueur
            var text_param = L.divIcon({
                className: 'my-div-icon',
                html:
                    '<div id="textDiv" style="font-size: ' +
                    textSize +
                    'px; position: relative;">' +
                    roundedvalue +
                    (value['valeur'] !== null
                        ? '<i class="bi bi-check-circle-fill" style="position: absolute; top: -10px; right: -15px; font-size: 12px; color: #28a745;"></i>'
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
                                    ${value['variablesMesure'].map((polluant) => `<span class="text-success">●</span> ${polluant}`).join('<br>')}
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
    var closeButton = document
        .getElementById('toggleSidePanel')
        .querySelector('i');
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');

    historique_chart = historique;
    pas_de_temps_chart = pas_de_temps_atmo;
    mesures_array.length = 0;

    if (Array.isArray(mesures_atmo)) {
        mesures_atmo.forEach((measure) => mesures_array.push(measure));
    } else {
        mesures_array.push(mesures_atmo);
    }

    var historique_buttons = document.querySelectorAll(
        '[id^="btn_historique_"]'
    );
    var pas_de_temps_buttons = document.querySelectorAll(
        '[id^="btn_pas_de_temps_"]'
    );
    var polluants_buttons = document.querySelectorAll('[id^="btn_poluant_"]');

    historique_buttons.forEach(
        (btn) => ((btn.checked = false), (btn.disabled = false))
    );
    pas_de_temps_buttons.forEach(
        (btn) => ((btn.checked = false), (btn.disabled = false))
    );
    polluants_buttons.forEach(
        (btn) => ((btn.checked = false), (btn.disabled = false))
    );

    btn_poluant_so2.disabled = true;
    btn_poluant_o3.disabled = true;
    btn_poluant_h2s.disabled = true;
    btn_poluant_nh3.disabled = true;

    let availablePollutants = [];

    if (data.pollutants) {
        availablePollutants = Object.keys(data.pollutants);
    } else if (data.allPollutantsData) {
        availablePollutants = Object.keys(data.allPollutantsData);
    } else if (
        window.deviceMarkers &&
        window.deviceMarkers[data.id_site] &&
        window.deviceMarkers[data.id_site].allPollutantsData
    ) {
        availablePollutants = Object.keys(
            window.deviceMarkers[data.id_site].allPollutantsData
        );
    } else {
        const pollutant =
            data.variable === 'PM25'
                ? 'pm2.5'
                : data.variable
                  ? data.variable.toLowerCase()
                  : '';
        if (pollutant) {
            availablePollutants = [pollutant];
        }
    }

    if (
        availablePollutants.includes('pm1') ||
        availablePollutants.includes('PM1')
    ) {
        btn_poluant_pm1.disabled = false;
    }
    if (
        availablePollutants.includes('pm2.5') ||
        availablePollutants.includes('PM2.5')
    ) {
        btn_poluant_pm25.disabled = false;
    }
    if (
        availablePollutants.includes('pm10') ||
        availablePollutants.includes('PM10')
    ) {
        btn_poluant_pm10.disabled = false;
    }
    if (
        availablePollutants.includes('no2') ||
        availablePollutants.includes('NO2')
    ) {
        btn_poluant_no2.disabled = false;
    }

    const btn_historique = document.getElementById(
        'btn_historique_' + historique
    );
    if (btn_historique) {
        btn_historique.checked = true;
    }

    let btn_pas_de_temps_id = 'btn_pas_de_temps_h';
    const previousPasDeTemps = getArrayFromLocalStorage(pasDeTempsLocal);

    if (previousPasDeTemps && previousPasDeTemps[0] === 'instantane') {
        if (data && data.pas_de_temps) {
            const timeStepInSeconds = data.pas_de_temps;
            switch (timeStepInSeconds) {
                case 120:
                    btn_pas_de_temps_id = 'btn_pas_de_temps_2min';
                    break;
                case 900:
                    btn_pas_de_temps_id = 'btn_pas_de_temps_qh';
                    break;
                case 3600:
                    btn_pas_de_temps_id = 'btn_pas_de_temps_h';
                    break;
                case 86400:
                    btn_pas_de_temps_id = 'btn_pas_de_temps_d';
                    break;
                default:
                    btn_pas_de_temps_id = 'btn_pas_de_temps_2min';
                    const button2min =
                        document.getElementById(btn_pas_de_temps_id);
                    if (button2min) {
                        const timeStepInMinutes = Math.round(
                            timeStepInSeconds / 60
                        );
                        button2min.value = `${timeStepInMinutes}min`;
                        const label = document.querySelector(
                            `label[for="${btn_pas_de_temps_id}"]`
                        );
                        if (label) {
                            label.textContent = `${timeStepInMinutes}min`;
                        }
                        button2min.checked = true;
                        pas_de_temps_chart = `${timeStepInMinutes}min`;
                    }
            }
        }
    } else {
        switch (pas_de_temps_atmo) {
            case 'brute':
                btn_pas_de_temps_id = 'btn_pas_de_temps_2min';
                break;
            case 'quart-horaire':
                btn_pas_de_temps_id = 'btn_pas_de_temps_qh';
                break;
            case 'horaire':
                btn_pas_de_temps_id = 'btn_pas_de_temps_h';
                break;
            case 'journalier':
                btn_pas_de_temps_id = 'btn_pas_de_temps_d';
                break;
        }
    }

    const btn_pas_de_temps = document.getElementById(btn_pas_de_temps_id);
    if (btn_pas_de_temps) {
        btn_pas_de_temps.checked = true;
    }

    let activeMeasure = '';
    if (Array.isArray(mesures_atmo)) {
        activeMeasure = mesures_atmo[0];
    } else {
        activeMeasure = mesures_atmo;
    }

    if (activeMeasure === 'pm25') {
        activeMeasure = 'pm2.5';
    }

    if (activeMeasure === 'pm1' && !btn_poluant_pm1.disabled) {
        btn_poluant_pm1.checked = true;
        mesures_array = ['pm1'];
    } else if (
        (activeMeasure === 'pm2.5' || activeMeasure === 'pm25') &&
        !btn_poluant_pm25.disabled
    ) {
        btn_poluant_pm25.checked = true;
        mesures_array = ['pm2.5'];
    } else if (activeMeasure === 'pm10' && !btn_poluant_pm10.disabled) {
        btn_poluant_pm10.checked = true;
        mesures_array = ['pm10'];
    } else if (activeMeasure === 'no2' && !btn_poluant_no2.disabled) {
        btn_poluant_no2.checked = true;
        mesures_array = ['no2'];
    } else {
        if (!btn_poluant_pm25.disabled) {
            btn_poluant_pm25.checked = true;
            mesures_array = ['pm2.5'];
        } else if (!btn_poluant_pm10.disabled) {
            btn_poluant_pm10.checked = true;
            mesures_array = ['pm10'];
        } else if (!btn_poluant_pm1.disabled) {
            btn_poluant_pm1.checked = true;
            mesures_array = ['pm1'];
        } else if (!btn_poluant_no2.disabled) {
            btn_poluant_no2.checked = true;
            mesures_array = ['no2'];
        }
    }

    const siteId = data.site_info ? data.id_site : data.id_site;
    retreive_historiqueData_microStation(
        siteId,
        pas_de_temps_atmo,
        historique,
        mesures_array
    );

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

    btn_historique_custom.onclick = function (event) {
        event.preventDefault();
        var startDate = btn_historique_start_date.value;
        var endDate = btn_historique_end_date.value;
        var startTime = '00:00';
        var endTime = '23:59';

        if (startDate && startTime && endDate && endTime) {
            historique_buttons.forEach((btn) => (btn.checked = false));
            btn_historique_custom.checked = true;

            let startDateTime = new Date(
                `${startDate}T${startTime}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                null,
                mesures_array,
                false,
                startDateTime,
                endDateTime
            );
        } else {
            alert(
                'Veuillez sélectionner une date et une heure de début et de fin.'
            );
        }
    };

    // Gestionnaire d'événement pour le bouton d'historique 1 heure
    btn_historique_1h.onclick = function () {
        historique_chart = '1h';
        // Désélection de tous les autres boutons d'historique
        document.querySelectorAll('[id^="btn_historique_"]').forEach((btn) => {
            if (btn !== btn_historique_1h) {
                btn.checked = false;
            }
        });
        // Mise à jour des données avec la nouvelle période
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    // Gestionnaire d'événement pour le bouton d'historique 3 heures
    btn_historique_3h.onclick = function () {
        historique_chart = '3h';
        // Désélection de tous les autres boutons d'historique
        document.querySelectorAll('[id^="btn_historique_"]').forEach((btn) => {
            if (btn !== btn_historique_3h) {
                btn.checked = false;
            }
        });
        // Mise à jour des données avec la nouvelle période
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    // Gestionnaire d'événement pour le bouton d'historique 24 heures
    btn_historique_24h.onclick = function () {
        historique_chart = '24h';
        // Désélection de tous les autres boutons d'historique
        document.querySelectorAll('[id^="btn_historique_"]').forEach((btn) => {
            if (btn !== btn_historique_24h) {
                btn.checked = false;
            }
        });
        // Mise à jour des données avec la nouvelle période
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    // Gestionnaire d'événement pour le bouton d'historique 7 jours
    if (btn_historique_7d) {
        btn_historique_7d.onclick = function () {
            historique_chart = '7d';
            // Désélection de tous les autres boutons d'historique
            document
                .querySelectorAll('[id^="btn_historique_"]')
                .forEach((btn) => {
                    if (btn !== btn_historique_7d) {
                        btn.checked = false;
                    }
                });
            // Mise à jour des données avec la nouvelle période
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        };
    }

    // Gestionnaire d'événement pour le bouton d'historique 30 jours
    if (btn_historique_30d) {
        btn_historique_30d.onclick = function () {
            historique_chart = '30d';
            // Désélection de tous les autres boutons d'historique
            document
                .querySelectorAll('[id^="btn_historique_"]')
                .forEach((btn) => {
                    if (btn !== btn_historique_30d) {
                        btn.checked = false;
                    }
                });
            // Mise à jour des données avec la nouvelle période
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        };
    }

    // Gestionnaire d'événement pour le bouton d'historique 365 jours
    if (btn_historique_365d) {
        btn_historique_365d.onclick = function () {
            historique_chart = '365d';
            // Désélection de tous les autres boutons d'historique
            document
                .querySelectorAll('[id^="btn_historique_"]')
                .forEach((btn) => {
                    if (btn !== btn_historique_365d) {
                        btn.checked = false;
                    }
                });
            // Mise à jour des données avec la nouvelle période
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        };
    }

    // Gestionnaire d'événement pour le bouton de pas de temps 2 minutes
    btn_pas_de_temps_2min.onclick = function () {
        // On utilise '2min' au lieu de 'brute' pour éviter la vérification du pas de temps du capteur
        pas_de_temps_chart = '2min';
        // Désélection de tous les autres boutons de pas de temps
        document
            .querySelectorAll('[id^="btn_pas_de_temps_"]')
            .forEach((btn) => {
                if (btn !== btn_pas_de_temps_2min) {
                    btn.checked = false;
                }
            });
        // Mise à jour des données avec le nouveau pas de temps
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    // Gestionnaire d'événement pour le bouton de pas de temps quart-horaire
    btn_pas_de_temps_qh.onclick = function () {
        pas_de_temps_chart = 'quart-horaire';
        // Désélection de tous les autres boutons de pas de temps
        document
            .querySelectorAll('[id^="btn_pas_de_temps_"]')
            .forEach((btn) => {
                if (btn !== btn_pas_de_temps_qh) {
                    btn.checked = false;
                }
            });
        // Mise à jour des données avec le nouveau pas de temps
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    // Gestionnaire d'événement pour le bouton de pas de temps horaire
    btn_pas_de_temps_h.onclick = function () {
        pas_de_temps_chart = 'horaire';
        // Désélection de tous les autres boutons de pas de temps
        document
            .querySelectorAll('[id^="btn_pas_de_temps_"]')
            .forEach((btn) => {
                if (btn !== btn_pas_de_temps_h) {
                    btn.checked = false;
                }
            });
        // Mise à jour des données avec le nouveau pas de temps
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    btn_pas_de_temps_d.disabled = true;

    setupPollutantButtonHandlers();

    openSidePanelGeneric();
}

function setupPollutantButtonHandlers() {
    const buttons = {
        pm1: 'pm1',
        pm25: 'pm2.5',
        pm10: 'pm10',
        no2: 'no2',
        so2: 'so2',
        o3: 'o3',
        h2s: 'h2s',
        nh3: 'nh3',
    };

    Object.entries(buttons).forEach(([buttonId, pollutant]) => {
        const button = document.getElementById(`btn_poluant_${buttonId}`);
        if (button) {
            // Supprimer tous les gestionnaires d'événements existants
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            // Changer le type en checkbox
            newButton.type = 'checkbox';

            // Supprimer l'attribut name pour éviter le comportement radio
            newButton.removeAttribute('name');

            newButton.addEventListener('change', function () {
                // Vérifier si la source micro est active
                if (!isSourceActive('atmo_micro')) {
                    return;
                }

                // Mise à jour du tableau des mesures
                if (this.checked) {
                    if (!mesures_array.includes(pollutant)) {
                        mesures_array.push(pollutant);
                    }
                } else {
                    mesures_array = mesures_array.filter(
                        (item) => item !== pollutant
                    );
                }

                // Mise à jour des données uniquement si un capteur est sélectionné
                if (window.globalSelectedDeviceId) {
                    retreive_historiqueData_microStation(
                        window.globalSelectedDeviceId,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }
    });
}

function setupPasDeTempsButtonHandlers() {
    const buttons = {
        '2min': '2min',
        'quarter-hour': 'quarter-hour',
        hourly: 'hourly',
        daily: 'daily',
    };

    Object.entries(buttons).forEach(([buttonId, timeStep]) => {
        const button = document.getElementById(`btn_pas_de_temps_${buttonId}`);
        if (button) {
            // Supprimer tous les gestionnaires d'événements existants
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', function () {
                // Vérifier si la source micro est active
                if (!isSourceActive('atmo_micro')) {
                    return;
                }

                // Mise à jour du pas de temps
                pas_de_temps_chart = timeStep;

                // Mise à jour des données uniquement si un capteur est sélectionné
                if (window.globalSelectedDeviceId) {
                    retreive_historiqueData_microStation(
                        window.globalSelectedDeviceId,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }
    });
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
        if (sensorId !== window.globalSelectedDeviceId) {
            console.log(
                'Le capteur sélectionné a changé, annulation de la requête'
            );
            return;
        }

        // Vérification de la présence d'un ID de capteur
        if (!sensorId) {
            throw new Error('ID du capteur non défini');
        }

        // Nettoyage de la zone de graphique
        const chartDiv = document.getElementById('chartdiv_sensor');
        if (chartDiv) {
            chartDiv.innerHTML = '';
        }

        // Nettoyage de toutes les instances amCharts existantes
        if (window.amchart_root) {
            try {
                window.amchart_root.dispose();
                window.amchart_root = null;
            } catch (e) {
                console.warn(
                    "Erreur lors du nettoyage de l'instance amCharts:",
                    e
                );
            }
        }

        // Calcul de la période d'historique en heures
        let hours;
        switch (historique) {
            case '1h':
                hours = 1;
                break;
            case '3h':
                hours = 3;
                break;
            case '24h':
                hours = 24;
                break;
            case '7d':
                hours = 24 * 7;
                break;
            case '30d':
                hours = 24 * 30;
                break;
            case '365d':
                hours = 24 * 365;
                break;
            default:
                hours = 24;
        }

        // Définition des dates de début et de fin
        const end_date = custom_end || new Date().toISOString();
        const start_date =
            custom_start ||
            new Date(Date.now() - hours * 3600 * 1000).toISOString();

        // Vérification de la présence de mesures à récupérer
        if (
            !mesures_array ||
            !Array.isArray(mesures_array) ||
            mesures_array.length === 0
        ) {
            throw new Error('Aucune mesure sélectionnée');
        }

        // Conversion des mesures pour l'API (ex: 'pm25' -> 'pm2.5')
        const mesures_api = mesures_array
            .map((mesure) => (mesure === 'pm25' ? 'pm2.5' : mesure))
            .join(',');

        // Construction des paramètres de l'URL avec URLSearchParams pour un encodage correct
        const params = new URLSearchParams({
            debut: start_date,
            fin: end_date,
            id_site: sensorId,
            format: 'json',
            download: 'false',
            nb_dec: '0',
            valeur_brute: 'true',
            variable: mesures_api,
            type_capteur: 'true',
        });

        // Gestion spéciale du paramètre aggregation selon le pas de temps
        if (pas_de_temps === '2min') {
            params.append('aggregation', 'brute');
        } else {
            params.append('aggregation', pas_de_temps);
        }

        // Construction de l'URL complète pour l'appel API
        const full_url = `https://api.atmosud.org/observations/capteurs/mesures?${params.toString()}`;

        // Appel à l'API pour récupérer les données
        const data = await fetchAPI(full_url);

        // Vérification de la validité des données reçues
        if (!data || !Array.isArray(data)) {
            throw new Error("Format de données invalide reçu de l'API");
        }

        // Nettoyage du graphique précédent s'il existe
        if (window.amchart_root) {
            window.amchart_root.dispose();
            window.amchart_root = undefined;
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

        // Initialisation du graphique avec amCharts 5
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

            // Création de la racine du graphique
            window.amchart_root = am5.Root.new('chartdiv_sensor');

            // Configuration du graphique XY (axes X et Y)
            let chart = window.amchart_root.container.children.push(
                am5xy.XYChart.new(window.amchart_root, {
                    panX: false,
                    panY: false,
                    wheelX: 'panX',
                    wheelY: 'zoomX',
                    paddingLeft: 0,
                })
            );

            // Configuration de l'axe X (temps)
            let xAxis = chart.xAxes.push(
                am5xy.DateAxis.new(window.amchart_root, {
                    maxDeviation: 0.2,
                    baseInterval: baseIntervalConfig,
                    renderer: am5xy.AxisRendererX.new(window.amchart_root, {
                        minorGridEnabled: true, // Affiche les grilles mineures
                    }),
                    tooltip: am5.Tooltip.new(window.amchart_root, {}),
                    // Format des dates selon l'intervalle
                    dateFormats: {
                        minute: 'HH:mm',
                        hour: 'HH:mm',
                        day: 'dd/MM HH:mm',
                    },
                    periodChangeDateFormats: {
                        minute: 'HH:mm',
                        hour: 'HH:mm',
                        day: 'dd/MM HH:mm',
                    },
                })
            );

            // Configuration de l'axe Y (valeurs)
            let yAxis = chart.yAxes.push(
                am5xy.ValueAxis.new(window.amchart_root, {
                    renderer: am5xy.AxisRendererY.new(window.amchart_root, {}),
                })
            );

            // Configuration du curseur pour l'interaction
            let cursor = chart.set(
                'cursor',
                am5xy.XYCursor.new(window.amchart_root, {
                    behavior: 'zoomX', // Comportement du curseur
                    xAxis: xAxis,
                    yAxis: yAxis,
                })
            );
            cursor.lineY.set('visible', false); // Cache la ligne verticale du curseur

            // Définition des couleurs pour chaque polluant
            const pollutantColors = {
                pm1: '#FF5733',
                'pm2.5': '#33A1FF',
                pm10: '#33FF57',
                no2: '#A133FF',
            };

            // Création des séries de données pour chaque polluant
            let seriesData = {};
            data.forEach((item) => {
                const variable = item.variable;
                if (!seriesData[variable]) {
                    seriesData[variable] = {
                        corrected: [], // Données corrigées
                        raw: [], // Données brutes
                    };
                }

                // Séparation des données selon leur type (corrigées ou brutes)
                if (item.valeur !== null) {
                    seriesData[variable].corrected.push({
                        value: item.valeur_ref,
                        date: new Date(item.time).getTime(),
                    });
                } else {
                    seriesData[variable].raw.push({
                        value: item.valeur_ref,
                        date: new Date(item.time).getTime(),
                    });
                }
            });

            // Création des séries de données pour chaque polluant
            Object.keys(seriesData).forEach((variable) => {
                // Gestion des noms de variables (ex: pm2.5 -> pm25)
                let colorKey = variable;
                if (variable === 'pm2.5') {
                    colorKey = 'pm25';
                }
                const color = pollutantColors[colorKey] || '#000000';

                // Création de la série pour les données corrigées
                if (seriesData[variable].corrected.length > 0) {
                    let series = chart.series.push(
                        am5xy.SmoothedXLineSeries.new(window.amchart_root, {
                            name: variable.toUpperCase() + ' (corrigé)',
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: 'value',
                            valueXField: 'date',
                            tooltip: am5.Tooltip.new(window.amchart_root, {
                                labelText: `${variable.toUpperCase()}: {valueY} µg/m³ (donnée corrigée)`,
                            }),
                        })
                    );

                    // Configuration du style de la ligne
                    series.strokes.template.setAll({
                        strokeWidth: 2,
                        stroke: am5.color(color),
                    });

                    // Ajout des données à la série
                    series.data.setAll(seriesData[variable].corrected);
                    series.appear(1000); // Animation d'apparition
                }

                // Création de la série pour les données brutes
                if (seriesData[variable].raw.length > 0) {
                    let series = chart.series.push(
                        am5xy.SmoothedXLineSeries.new(window.amchart_root, {
                            name: variable.toUpperCase() + ' (brut)',
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: 'value',
                            valueXField: 'date',
                            tooltip: am5.Tooltip.new(window.amchart_root, {
                                labelText: `${variable.toUpperCase()}: {valueY} µg/m³ (donnée brute)`,
                            }),
                        })
                    );

                    // Configuration du style de la ligne (pointillés pour les données brutes)
                    series.strokes.template.setAll({
                        strokeWidth: 2,
                        stroke: am5.color(color),
                        strokeDasharray: [10, 5], // Style pointillé
                    });

                    // Ajout des données à la série
                    series.data.setAll(seriesData[variable].raw);
                    series.appear(1000); // Animation d'apparition
                }
            });

            // Création et configuration de la légende
            let legend = chart.children.push(
                am5.Legend.new(window.amchart_root, {
                    centerX: am5.percent(50), // Centrage horizontal
                    x: am5.percent(50),
                    layout: am5.GridLayout.new(window.amchart_root, {
                        maxColumns: 2, // Maximum 2 colonnes
                        fixedWidthGrid: true, // Grille de largeur fixe
                    }),
                })
            );

            // Ajout des séries à la légende
            legend.data.setAll(chart.series.values);

            // Animation d'apparition du graphique
            chart.appear(1000, 100);

            // Configuration de l'exportation des données
            let exporting = am5plugins_exporting.Exporting.new(
                window.amchart_root,
                {
                    menu: am5plugins_exporting.ExportingMenu.new(
                        window.amchart_root,
                        {}
                    ),
                    filePrefix: 'historique_data',
                    dataSource: data,
                }
            );
        });
    } catch (error) {
        console.error(
            'Erreur dans retreive_historiqueData_microStation:',
            error
        );
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

// Exporter les variables qui pourraient être nécessaires ailleurs
export { pas_de_temps_chart, historique_chart, mesures_array };

// Fonction utilitaire pour les appels API
async function fetchAPI(url, options = {}) {
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

        return data;
    } catch (error) {
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
