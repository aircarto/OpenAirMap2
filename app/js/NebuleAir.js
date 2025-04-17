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
    seuils_PM1_PM25,
    seuils_PM10,
} from '../app.js';
import { createCustomToast } from './toaster.js';
import { isSourceActive } from './dataSourceManager.js';

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
        so2: null,
        o3: null,
        h2s: null,
        nh3: null,
    },
};

// Variables pour stocker les gestionnaires d'événements
const eventHandlers = {
    historique: {},
    pasDeTemps: {},
    polluants: {},
};

// Initialisation des boutons au chargement du DOM
document.addEventListener('DOMContentLoaded', function () {
    // Initialisation des boutons d'historique
    Object.keys(buttons.historique).forEach((key) => {
        buttons.historique[key] = document.getElementById(
            `btn_historique_${key}`
        );
    });

    // Initialisation des boutons de pas de temps
    Object.keys(buttons.pasDeTemps).forEach((key) => {
        buttons.pasDeTemps[key] = document.getElementById(
            `btn_pas_de_temps_${key}`
        );
    });

    // Initialisation des boutons de polluants
    Object.keys(buttons.polluants).forEach((key) => {
        buttons.polluants[key] = document.getElementById(`btn_poluant_${key}`);
    });

    // Configuration des gestionnaires d'événements
    setupButtonHandlers();
});

function setupButtonHandlers() {
    // Vérifier si la source NebuleAir est active
    if (!isSourceActive('nebuleair')) {
        console.log(
            'Source NebuleAir non active, annulation de la configuration des boutons'
        );
        return;
    }

    console.log('Configuration des gestionnaires de boutons');

    // Nettoyer les anciens gestionnaires d'événements
    cleanupEventHandlers();

    setupHistoriqueButtonHandlers();
    setupPasDeTempsButtonHandlers();
    setupPollutantButtonHandlers();
}

function cleanupEventHandlers() {
    // Nettoyer les gestionnaires d'historique
    Object.keys(eventHandlers.historique).forEach((key) => {
        const btn = document.getElementById(`btn_historique_${key}`);
        if (btn) {
            btn.removeEventListener('click', eventHandlers.historique[key]);
        }
    });

    // Nettoyer les gestionnaires de pas de temps
    Object.keys(eventHandlers.pasDeTemps).forEach((key) => {
        const btn = document.getElementById(`btn_pas_de_temps_${key}`);
        if (btn) {
            btn.removeEventListener('click', eventHandlers.pasDeTemps[key]);
        }
    });

    // Nettoyer les gestionnaires de polluants
    Object.keys(eventHandlers.polluants).forEach((key) => {
        const btn = document.getElementById(`btn_poluant_${key}`);
        if (btn) {
            btn.removeEventListener('change', eventHandlers.polluants[key]);
        }
    });

    // Réinitialiser les objets de stockage
    eventHandlers.historique = {};
    eventHandlers.pasDeTemps = {};
    eventHandlers.polluants = {};
}

function setupHistoriqueButtonHandlers() {
    if (!isSourceActive('nebuleair')) {
        return;
    }

    console.log("Configuration des boutons d'historique");

    const periodes = ['1h', '3h', '24h', '7d', '30d', '365d'];
    periodes.forEach((periode) => {
        const btn = buttons.historique[periode];
        if (btn) {
            const handler = () => {
                if (!isSourceActive('nebuleair')) {
                    return;
                }
                state.historiqueChart = periode;
                // Réinitialiser la plage de dates personnalisée
                state.customDateRange.start = null;
                state.customDateRange.end = null;
                Object.values(buttons.historique).forEach((b) => {
                    if (b) {
                        b.checked = false;
                    }
                });
                if (btn) {
                    btn.checked = true;
                }
                retreive_historiqueData_nebuleAir(
                    state.globalSelectedDeviceId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            };

            // Stocker la référence du gestionnaire
            eventHandlers.historique[periode] = handler;

            // Ajouter le gestionnaire d'événements
            btn.addEventListener('click', handler);
        }
    });

    // Configuration des boutons de plage personnalisée
    const startDateBtn = buttons.historique.startDate;
    const endDateBtn = buttons.historique.endDate;
    const customBtn = buttons.historique.custom;

    if (startDateBtn && endDateBtn && customBtn) {
        const customHandler = (event) => {
            event.preventDefault();
            const startDate = startDateBtn.value;
            const endDate = endDateBtn.value;
            const startTime = '00:00';
            const endTime = '23:59';

            if (startDate && startTime && endDate && endTime) {
                state.historiqueChart = 'custom';
                Object.values(buttons.historique).forEach((b) => {
                    if (b) {
                        b.checked = false;
                    }
                });
                if (customBtn) {
                    customBtn.checked = true;
                }
                retreive_historiqueData_nebuleAir(
                    state.globalSelectedDeviceId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        };

        // Stocker la référence du gestionnaire
        eventHandlers.historique.custom = customHandler;

        // Ajouter le gestionnaire d'événements
        customBtn.addEventListener('click', customHandler);
    }
}

function setupPasDeTempsButtonHandlers() {
    if (!isSourceActive('nebuleair')) {
        return;
    }

    console.log('Configuration des boutons de pas de temps');

    const pasDeTemps = ['2min', 'qh', 'h', 'd'];
    pasDeTemps.forEach((periode) => {
        const btn = document.getElementById(`btn_pas_de_temps_${periode}`);
        console.log(`Bouton ${periode} trouvé:`, btn);

        if (btn) {
            const handler = () => {
                console.log(`Clic sur le bouton ${periode}`);
                if (!isSourceActive('nebuleair')) {
                    return;
                }
                state.pasDeTempsChart = periode;
                Object.values(buttons.pasDeTemps).forEach((b) => {
                    if (b) {
                        b.checked = false;
                    }
                });
                if (btn) {
                    btn.checked = true;
                }
                console.log(
                    'Appel de retreive_historiqueData_nebuleAir avec:',
                    {
                        deviceId: state.globalSelectedDeviceId,
                        pasDeTemps: state.pasDeTempsChart,
                        historique: state.historiqueChart,
                        mesures: state.mesuresArray,
                    }
                );
                retreive_historiqueData_nebuleAir(
                    state.globalSelectedDeviceId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            };

            // Stocker la référence du gestionnaire
            eventHandlers.pasDeTemps[periode] = handler;

            // Ajouter le gestionnaire d'événements
            btn.addEventListener('click', handler);
        } else {
            console.warn(`Bouton ${periode} non trouvé`);
        }
    });
}

function setupPollutantButtonHandlers() {
    console.log('Configuration des boutons de polluants');

    const polluants = {
        pm1: 'pm1',
        pm25: 'pm2.5',
        pm10: 'pm10',
        no2: 'no2',
        o3: 'o3',
        so2: 'so2',
        h2s: 'h2s',
        nh3: 'nh3',
    };

    Object.entries(polluants).forEach(([buttonId, pollutant]) => {
        const button = document.getElementById(`btn_poluant_${buttonId}`);
        if (button) {
            console.log(`Configuration du bouton ${buttonId}`);

            // Changer le type en checkbox
            button.type = 'checkbox';

            // Supprimer l'attribut name pour éviter le comportement radio
            button.removeAttribute('name');

            const handler = function (e) {
                console.log(`Événement change détecté pour ${buttonId}`);
                console.log(`État du bouton: ${this.checked}`);

                // Vérifier si la source NebuleAir est active
                if (!isSourceActive('nebuleair')) {
                    return;
                }

                // Mise à jour du tableau des mesures
                if (this.checked) {
                    if (!state.mesuresArray.includes(pollutant)) {
                        state.mesuresArray.push(pollutant);
                    }
                } else {
                    state.mesuresArray = state.mesuresArray.filter(
                        (item) => item !== pollutant
                    );
                }

                console.log('Mesures après mise à jour:', state.mesuresArray);

                // Mise à jour des données uniquement si un capteur est sélectionné
                if (state.globalSelectedDeviceId) {
                    // Nettoyage complet du graphique avant la mise à jour
                    if (window.amchart_root) {
                        window.amchart_root.dispose();
                        window.amchart_root = undefined;
                    }
                    document.getElementById('chartdiv_sensor').innerHTML = '';

                    retreive_historiqueData_nebuleAir(
                        state.globalSelectedDeviceId,
                        state.pasDeTempsChart,
                        state.historiqueChart,
                        state.mesuresArray
                    );
                }
            };

            // Stocker la référence du gestionnaire
            eventHandlers.polluants[buttonId] = handler;

            // Ajouter le gestionnaire d'événements
            button.addEventListener('change', handler);
        } else {
            console.warn(`Bouton ${buttonId} non trouvé`);
        }
    });
}

// Fonction principale exportée
export function loadNebuleAir() {
    console.log('loadNebuleAir');
    nebuleairLayer.clearLayers();
    var pas_de_temps = getArrayFromLocalStorage(pasDeTempsLocal);
    var mesures = getArrayFromLocalStorage(mesuresLocal);

    // Vérification si le polluant est supporté
    if (!['pm1', 'pm25', 'pm10'].includes(mesures[0])) {
        console.log('Polluant non supporté pour NebuleAir');
        return;
    }

    console.log('Pas de temps : ' + pas_de_temps);
    console.log('Mesures : ' + mesures);

    let mesure_StringA = mesures[0];
    let mesure_String = `${mesure_StringA}`;
    let pas_de_tempsA = pas_de_temps[0];
    let pas_de_temps_String = `${pas_de_tempsA}`;
    //on fait passer pm1 en upperCase car dans le JSON d'AirCarto c'est en maj (PM1)
    let mesure_majuscule = mesure_String.toUpperCase();
    let mesure_maj_pas_de_temps = mesure_majuscule;
    //si on est pas en 2min il faut ajouter le pas de temps (PM1_d)
    if (pas_de_temps_String != '2min') {
        mesure_maj_pas_de_temps = mesure_majuscule + '_' + pas_de_temps_String;
    }

    // Track selected markers for click interaction

    $.ajax({
        method: 'GET',
        url: 'https://api.aircarto.fr/capteurs/metadata?capteurType=NebuleAir',
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log(data);
            // if (mesures[0] === 'no2') {
            //     createCustomToast({
            //         message:
            //             'Mesure NO<sub>2</sub> non disponible pour NebuleAir airCarto',
            //         type: 'warning',
            //         title: 'Attention',
            //         icon: 'exclamation-triangle',
            //         timer: 5000,
            //         html: true,
            //     });
            //     return;
            // }
            //on ne traite que les nebuleair dont le parametre "displayMap" est true
            var displayed = data.filter((e) => e.displayMap == true);
            $.each(displayed, function (key, value) {
                //ICONE
                //image des points sur la carte (créer un icone et le place sur la carte en marker)
                //par défaut c'est le point gris
                var icon_param = {
                    iconUrl: 'img/nebuleair/nebuleAir_default.png',
                    iconSize: [40, 40], // size of the icon
                    iconAnchor: [5, 40], // point of the icon which will correspond to marker's location
                };

                //si le capteur est connecté on change la couleur
                if (value.connected) {
                    //les icone connectés sont plus grand que les gris
                    icon_param.iconSize = [50, 50];
                    //en fonction du polluant (mesures) on adapte la couleur
                    //pour les pm1 et les pm25
                    if (mesures == 'pm1' || mesures == 'pm25') {
                        for (let key in seuils_PM1_PM25) {
                            let code = seuils_PM1_PM25[key].code;
                            let min = seuils_PM1_PM25[key].min;
                            let max = seuils_PM1_PM25[key].max;
                            // let value_rounded = Math.round(value[mesure_maj_pas_de_temps]);
                            // get the value to check
                            let valueToCheck = value[mesure_maj_pas_de_temps];

                            let colorCode = getColorCodeForValue(
                                valueToCheck,
                                mesures
                            );

                            //si la valeur est entre le max et le min
                            // if (value_rounded >= min & value_rounded <= max) {
                            //     icon_param.iconUrl = 'img/nebuleair/nebuleAir_'+code+'.png';
                            // }
                            if (colorCode !== 'default') {
                                icon_param.iconUrl =
                                    'img/nebuleair/nebuleAir_' +
                                    colorCode +
                                    '.png';
                            }
                        }
                    }
                    //pour les pm10
                    if (mesures == 'pm10') {
                        for (let key in seuils_PM10) {
                            let code = seuils_PM10[key].code;
                            let min = seuils_PM10[key].min;
                            let max = seuils_PM10[key].max;
                            let value_rounded = Math.round(
                                value[mesure_maj_pas_de_temps]
                            );
                            //si la valeur est entre le max et le min
                            if (
                                (value_rounded >= min) &
                                (value_rounded <= max)
                            ) {
                                icon_param.iconUrl =
                                    'img/nebuleair/nebuleAir_' + code + '.png';
                            }
                        }
                    }
                }
                //create icons
                var nebuleAir_icon = L.icon(icon_param);
                //create a marker from icon and store reference
                let nebuleAirMarker = L.marker(
                    [value['latitude'], value['longitude']],
                    {
                        icon: nebuleAir_icon,
                        // Add custom properties to identify this marker
                        deviceId: value['sensorId'], // Store the device ID directly on the marker
                    }
                ).addTo(nebuleairLayer);

                if (!window.deviceMarkers) window.deviceMarkers = {};
                window.deviceMarkers[value['sensorId']] = {
                    marker: nebuleAirMarker,
                    data: value, // Store the full data object
                };

                //TEXTE
                //si le capteur est connecté on affiche la valeur (ajout d'un marker)
                if (value.connected) {
                    let roundedvalue = Math.round(
                        parseFloat(value[mesure_maj_pas_de_temps])
                    );
                    //textSize (if number under 10)
                    var textSize = 32;
                    var x_position = -10;
                    var y_position = 38;
                    //smaller text size if number is greater than 9
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
                        html:
                            '<div id="textDiv" style="font-size: ' +
                            textSize +
                            'px;">' +
                            roundedvalue +
                            '</div>',
                        iconAnchor: [x_position, y_position],
                    });

                    // Store reference to text marker
                    let textMarker = L.marker(
                        [value['latitude'], value['longitude']],
                        {
                            icon: text_param,
                            deviceId: value['sensorId'], // Same device ID on text marker
                        }
                    )
                        .on('click', function () {
                            // Si un marker est déjà sélectionné, on enlève l'animation
                            console.log(
                                'click on NebuleAir',
                                value['sensorId']
                            );
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

                            // Appliquer l'animation uniquement au nouveau marker sélectionné
                            nebuleAirMarker.setZIndexOffset(1000);
                            textMarker.setZIndexOffset(1000);
                            nebuleAirMarker._icon.classList.add(
                                'marker-selected'
                            );
                            textMarker._icon.classList.add('marker-selected');

                            // Mettre à jour le marker sélectionné
                            globalSelectedMarker = nebuleAirMarker;
                            globalSelectedText = textMarker;
                            globalSelectedDeviceId = value['sensorId'];

                            openSidePanelNebuleAir(
                                value,
                                pas_de_temps_String,
                                '24h',
                                mesures
                            );
                        })
                        .addTo(nebuleairLayer);

                    // Add hover effect - highlight on hover
                    function highlightMarker() {
                        nebuleAirMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);

                        // Création d'un tooltip personnalisé avec Bootstrap
                        const tooltip = document.createElement('div');
                        tooltip.className = 'custom-tooltip';
                        tooltip.innerHTML = `
                            <div class="card border-0 shadow-sm">
                                <div class="card-body p-2">
                                    <h6 class="card-title mb-1">${value['sensorId']}</h6>
                                    <div class="d-flex flex-column">
                                        <small class="text-muted mb-1">
                                            <i class="bi bi-wifi ${value['connected'] ? 'text-success' : ''} me-1"></i>
                                            ${value['connected'] ? 'Connecté' : 'Déconnecté'}
                                        </small>
                                        <small class="text-muted">
                                            Polluants mesurés:
                                            <ul class="list-unstyled ms-3 mb-0">
                                                ${value.PM1 !== undefined ? '<li><span class="text-success">●</span> PM1</li>' : ''}
                                                ${value.PM25 !== undefined ? '<li><span class="text-success">●</span> PM2.5</li>' : ''}
                                                ${value.PM10 !== undefined ? '<li><span class="text-success">●</span> PM10</li>' : ''}
                                            </ul>
                                        </small>
                                    </div>
                                </div>
                            </div>
                        `;

                        // Style du tooltip
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

                        // Ajout du tooltip directement au body pour éviter les problèmes de z-index
                        document.body.appendChild(tooltip);

                        // Stockage de la référence du tooltip
                        nebuleAirMarker.tooltip = tooltip;
                        textMarker.tooltip = tooltip;
                    }

                    function resetMarker() {
                        // Don't reset if this is the selected marker
                        if (globalSelectedMarker !== nebuleAirMarker) {
                            nebuleAirMarker.setZIndexOffset(0);
                            textMarker.setZIndexOffset(0);
                        }

                        // Suppression du tooltip
                        if (nebuleAirMarker.tooltip) {
                            nebuleAirMarker.tooltip.remove();
                            nebuleAirMarker.tooltip = null;
                            textMarker.tooltip = null;
                        }
                    }

                    // Apply hover effects to both markers
                    nebuleAirMarker
                        .on('mouseover', highlightMarker)
                        .on('mouseout', resetMarker);
                    textMarker
                        .on('mouseover', highlightMarker)
                        .on('mouseout', resetMarker);
                }
            }); //end each
            //ajouter la layer sur la carte
            map.addLayer(nebuleairLayer);
        }, //end ajax sucess
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    }); //end ajax
} //end function loadNebuleAir()

// Fonction pour ouvrir le panneau latéral
export function openSidePanelNebuleAir(
    data,
    pas_de_temps,
    historique,
    mesures
) {
    console.log({
        data: data,
        pas_de_temps: pas_de_temps,
        historique: historique,
        mesures: mesures,
    });
    const pollButttons = document.getElementById('btn_polluants');
    pollButttons.style.display = 'none';
    // Gestion icone fermeture sidepanel
    var closeButton = document
        .getElementById('toggleSidePanel')
        .querySelector('i');
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');

    console.log('openSidePanelNebuleAir');

    // Mise à jour de l'ID du capteur sélectionné
    window.globalSelectedDeviceId = data.sensorId;

    state.historiqueChart = historique;
    state.pasDeTempsChart = pas_de_temps;

    // Reset all button states
    var historique_buttons = document.querySelectorAll(
        '[id^="btn_historique_"]'
    );
    var pas_de_temps_buttons = document.querySelectorAll(
        '[id^="btn_pas_de_temps_"]'
    );

    historique_buttons.forEach(
        (btn) => ((btn.checked = false), (btn.disabled = false))
    );
    pas_de_temps_buttons.forEach(
        (btn) => ((btn.checked = false), (btn.disabled = false))
    );

    buttons.polluants.so2.disabled = true;
    buttons.polluants.o3.disabled = true;
    buttons.polluants.h2s.disabled = true;
    buttons.polluants.nh3.disabled = true;

    //il faut passer à la fonction un array pour mesures
    // Clear the array by setting its length to 0
    state.mesuresArray.length = 0;
    if (Array.isArray(mesures)) {
        mesures.forEach((measure) => state.mesuresArray.push(measure));
    } else {
        // If it's a single value, push it directly
        state.mesuresArray.push(mesures);
    }

    // Définir l'historique par défaut en fonction du pas de temps
    if (pas_de_temps === '2min' || pas_de_temps === '2m') {
        state.historiqueChart = '1h';
    } else if (pas_de_temps === 'h') {
        state.historiqueChart = '7d';
    } else if (pas_de_temps === 'd') {
        state.historiqueChart = '30d';
    }

    //on lance la fonction pour récupérer les datas de mesures
    retreive_historiqueData_nebuleAir(
        data.sensorId,
        pas_de_temps,
        state.historiqueChart,
        state.mesuresArray
    );

    card1_img.src = 'img/nebuleair/NebuleAir_photo.png';
    card1_title.innerHTML = data.sensorId;
    card1_subtitle.innerHTML = 'Capteur citoyen';
    card1_text.innerHTML = ''; //empty content from previous opening

    card2_text.innerHTML =
        "Le capteur NebuleAir est un dispositif de mesure de l'air extérieur développé par AirCarto et AtmoSud. Il peut être placé sur le rebord d'une fenêtre ou sur un balcon afin de mesurer le taux de particules fines présent dans l'air. Il communique ses données toutes 2 minutes et les envoies sur les serveurs d'AirCarto via une connexion WIFI.";
    card2_link.innerHTML = 'AirCarto.fr'; //empty content from previous opening
    card2_link.href = 'https://aircarto.fr';

    // Historique custom Button handlers setup
    if (buttons.historique.custom) {
        buttons.historique.custom.addEventListener('click', function (event) {
            event.preventDefault();
            var startDate = buttons.historique.startDate.value;
            var endDate = buttons.historique.endDate.value;
            var startTime = '00:00';
            var endTime = '23:59';
            console.log({
                startDate: startDate,
                startTime: startTime,
                endDate: endDate,
                endTime: endTime,
            });
            if (startDate && startTime && endDate && endTime) {
                historique_buttons.forEach((btn) => (btn.checked = false));
                buttons.historique.custom.checked = true;

                let startDateTime = new Date(
                    `${startDate}T${startTime}`
                ).toISOString();
                let endDateTime = new Date(
                    `${endDate}T${endTime}`
                ).toISOString();

                console.log(
                    'Date de début:',
                    startDateTime,
                    'Date de fin:',
                    endDateTime
                );
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    null,
                    state.mesuresArray,
                    false,
                    startDateTime,
                    endDateTime
                );
            } else {
                alert(
                    'Veuillez sélectionner une date et une heure de début et de fin.'
                );
            }
        });
    }

    //1.historique
    if (buttons.historique['1h']) {
        buttons.historique['1h'].addEventListener('change', function () {
            if (this.checked) {
                state.historiqueChart = '1h';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    if (buttons.historique['3h']) {
        buttons.historique['3h'].addEventListener('change', function () {
            if (this.checked) {
                state.historiqueChart = '3h';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    if (buttons.historique['24h']) {
        buttons.historique['24h'].addEventListener('change', function () {
            if (this.checked) {
                state.historiqueChart = '24h';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    if (buttons.historique['7d']) {
        buttons.historique['7d'].addEventListener('change', function () {
            if (this.checked) {
                state.historiqueChart = '7d';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    if (buttons.historique['30d']) {
        buttons.historique['30d'].addEventListener('change', function () {
            if (this.checked) {
                state.historiqueChart = '30d';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    if (buttons.historique['365d']) {
        buttons.historique['365d'].addEventListener('change', function () {
            if (this.checked) {
                state.historiqueChart = '365d';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    //2.pas de temps
    if (buttons.pasDeTemps['2min']) {
        buttons.pasDeTemps['2min'].addEventListener('change', function () {
            if (this.checked) {
                state.pasDeTempsChart = '2m';
                pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    if (buttons.pasDeTemps['qh']) {
        buttons.pasDeTemps['qh'].addEventListener('change', function () {
            if (this.checked) {
                state.pasDeTempsChart = '15m';
                pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    if (buttons.pasDeTemps['h']) {
        buttons.pasDeTemps['h'].addEventListener('change', function () {
            if (this.checked) {
                state.pasDeTempsChart = '1h';
                pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    if (buttons.pasDeTemps['d']) {
        buttons.pasDeTemps['d'].addEventListener('change', function () {
            if (this.checked) {
                state.pasDeTempsChart = '1d';
                pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray
                );
            }
        });
    }

    //3. Mesures
    if (buttons.polluants.pm1) {
        buttons.polluants.pm1.addEventListener('change', function () {
            if (this.checked) {
                if (state.mesuresArray.includes('pm1')) {
                    state.mesuresArray = state.mesuresArray.filter(
                        (item) => item !== 'pm1'
                    );
                    this.checked = false;
                } else {
                    state.mesuresArray.push('pm1');
                    this.checked = true;
                }

                if (
                    buttons.historique.custom &&
                    buttons.historique.custom.checked
                ) {
                    var startDate = buttons.historique.startDate.value;
                    var endDate = buttons.historique.endDate.value;
                    let startDateTime = new Date(
                        `${startDate}T00:00`
                    ).toISOString();
                    let endDateTime = new Date(
                        `${endDate}T23:59`
                    ).toISOString();
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        state.pasDeTempsChart,
                        null,
                        state.mesuresArray,
                        true,
                        startDateTime,
                        endDateTime
                    );
                } else {
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        state.pasDeTempsChart,
                        state.historiqueChart,
                        state.mesuresArray,
                        true
                    );
                }
            }
        });
    }

    if (buttons.polluants.pm25) {
        buttons.polluants.pm25.addEventListener('change', function () {
            if (this.checked) {
                if (state.mesuresArray.includes('pm25')) {
                    state.mesuresArray = state.mesuresArray.filter(
                        (item) => item !== 'pm25'
                    );
                    this.checked = false;
                } else {
                    state.mesuresArray.push('pm25');
                    this.checked = true;
                }

                if (
                    buttons.historique.custom &&
                    buttons.historique.custom.checked
                ) {
                    var startDate = buttons.historique.startDate.value;
                    var endDate = buttons.historique.endDate.value;
                    let startDateTime = new Date(
                        `${startDate}T00:00`
                    ).toISOString();
                    let endDateTime = new Date(
                        `${endDate}T23:59`
                    ).toISOString();
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        state.pasDeTempsChart,
                        null,
                        state.mesuresArray,
                        true,
                        startDateTime,
                        endDateTime
                    );
                } else {
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        state.pasDeTempsChart,
                        state.historiqueChart,
                        state.mesuresArray,
                        true
                    );
                }
            }
        });
    }

    if (buttons.polluants.pm10) {
        buttons.polluants.pm10.addEventListener('change', function () {
            if (this.checked) {
                if (state.mesuresArray.includes('pm10')) {
                    state.mesuresArray = state.mesuresArray.filter(
                        (item) => item !== 'pm10'
                    );
                    this.checked = false;
                } else {
                    state.mesuresArray.push('pm10');
                    this.checked = true;
                }

                if (
                    buttons.historique.custom &&
                    buttons.historique.custom.checked
                ) {
                    var startDate = buttons.historique.startDate.value;
                    var endDate = buttons.historique.endDate.value;
                    let startDateTime = new Date(
                        `${startDate}T00:00`
                    ).toISOString();
                    let endDateTime = new Date(
                        `${endDate}T23:59`
                    ).toISOString();
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        state.pasDeTempsChart,
                        null,
                        state.mesuresArray,
                        true,
                        startDateTime,
                        endDateTime
                    );
                } else {
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        state.pasDeTempsChart,
                        state.historiqueChart,
                        state.mesuresArray,
                        true
                    );
                }
            }
        });
    }

    if (buttons.polluants.no2) {
        buttons.polluants.no2.disabled = true;
    }

    //fonction semblable pour tous les types de capteurs
    openSidePanelGeneric();
}

// Fonction pour récupérer les données historiques
export function retreive_historiqueData_nebuleAir(
    sensorId,
    pas_de_temps,
    historique,
    mesures_array,
    add_mesure = false,
    custom_start = null,
    custom_end = null
) {
    // Vérifier si la source NebuleAir est active
    if (!isSourceActive('nebuleair')) {
        console.log('Source NebuleAir non active, annulation de la requête');
        return;
    }

    // Vérification que le capteur sélectionné est toujours le même
    console.log('Capteur sélectionné:', window.globalSelectedDeviceId);
    console.log('Capteur demandé:', sensorId);
    if (sensorId !== window.globalSelectedDeviceId) {
        console.log(
            'Le capteur sélectionné a changé, annulation de la requête'
        );
        return;
    }

    console.log({
        sensorId: sensorId,
        pas_de_temps: pas_de_temps,
        historique: historique,
        mesures_array: mesures_array,
        add_mesure: add_mesure,
    });
    const start = Date.now(); //actual timestamp to measure response time
    //il faut vider le div chartdiv_sensor (dans le cas ou canvasJS l'a utilisé juste avant)
    document.getElementById('chartdiv_sensor').innerHTML = '';
    ////si add_mesure est true alors il faut ajouter le polluant à mesures_array

    console.log('Retreive data for sensor: ' + sensorId);
    console.log('Pas de temps: ' + pas_de_temps);
    console.log('Historique: ' + historique);
    console.log('Mesures array: ' + mesures_array);
    console.log('Adding mesure: ' + add_mesure);

    //il faut unchecked les boutons
    var inputs = document.querySelectorAll(
        'input[type="checkbox"], input[type="radio"]'
    );
    inputs.forEach(function (input) {
        input.checked = false;
    });

    //attention pour le pas de temps des boutons il faut convertir ()
    var pas_de_temps_btn;
    switch (pas_de_temps) {
        case '2m':
        case '2min':
            pas_de_temps_btn = '2min';
            break;
        case '15m':
        case 'qh':
            pas_de_temps_btn = 'qh';
            break;
        case '1h':
        case 'h':
            pas_de_temps_btn = 'h';
            break;
        case '1d':
        case 'd':
            pas_de_temps_btn = '1d';
        case '24h':
            pas_de_temps_btn = 'd';
            break;
        default:
            pas_de_temps_btn = pas_de_temps;
    }

    console.log('Setting button: btn_pas_de_temps_' + pas_de_temps_btn);

    //on checked le input qui a été sélectioné
    if (historique) {
        var historique_button_checked = document.getElementById(
            'btn_historique_' + historique
        );
        if (historique_button_checked) historique_button_checked.checked = true;
    } else if (custom_start && custom_end) {
        var btnHistoriqueCustom = document.getElementById(
            'btnHistoriqueCustom'
        );
        if (btnHistoriqueCustom) btnHistoriqueCustom.checked = true;
    }

    var pas_de_temps_button = document.getElementById(
        'btn_pas_de_temps_' + pas_de_temps_btn
    );
    if (pas_de_temps_button) {
        pas_de_temps_button.checked = true;
    } else {
        console.warn(
            'Could not find pas de temps button for: ' + pas_de_temps_btn
        );
    }

    //attention à l'array pour les mesures!!
    //on ajout le checked pour chaque polluant sélectionné
    mesures_array.forEach(function (element) {
        var historique_mesure_checked = document.getElementById(
            'btn_poluant_' + element
        );
        if (historique_mesure_checked) historique_mesure_checked.checked = true;
    });

    //pour le pas de temps (pour l'URL) il faut convertir (2min, qh, h et d -->en--> 2m, 15m, 1h et 1d)
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
    if (custom_start && custom_end) {
        // Use custom date range
        full_url = `https://api.aircarto.fr/capteurs/dataNebuleAir?capteurID=${sensorId}&start=${custom_start}&end=${custom_end}&freq=${api_pas_de_temps}`;
    } else {
        // Use relative time range
        full_url = `https://api.aircarto.fr/capteurs/dataNebuleAir?capteurID=${sensorId}&start=-${historique}&stop=now&freq=${api_pas_de_temps}`;
    }

    console.log(full_url);

    $.ajax({
        method: 'GET',
        url: full_url,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log(data);

            //il faut crée des timeUnit AMCHART spécifique en fonction du pas de temps
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

            //création du root element de AMChart
            //si le root élément a déjà été crée il faut le supprimer
            if (amchart_root != undefined) {
                console.log('DISPOSE AMChart root (already created)');
                window.amchart_root.dispose();
            }

            am5.ready(function () {
                // Création du root element
                amchart_root = am5.Root.new('chartdiv_sensor');

                // Création du graphique
                var chart = amchart_root.container.children.push(
                    am5xy.XYChart.new(amchart_root, {
                        panX: false,
                        panY: false,
                        wheelX: 'panX',
                        wheelY: 'zoomX',
                        paddingLeft: 0,
                        paddingBottom: 100, // Ajout d'espace pour la légende
                        layout: am5.GridLayout.new(amchart_root, {
                            maxColumns: 1,
                            fixedWidthGrid: true,
                        }),
                    })
                );

                // Ajout du curseur
                var cursor = chart.set(
                    'cursor',
                    am5xy.XYCursor.new(amchart_root, {
                        behavior: 'zoomX',
                    })
                );
                cursor.lineY.set('visible', false);

                // Ajout de l'axe X
                var xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(amchart_root, {
                        maxDeviation: 0.2,
                        baseInterval: {
                            timeUnit: baseInterval_timeUnit_local,
                            count: baseInterval_count,
                        },
                        renderer: am5xy.AxisRendererX.new(amchart_root, {
                            minorGridEnabled: true,
                        }),
                        tooltip: am5.Tooltip.new(amchart_root, {}),
                    })
                );

                // Ajout de l'axe Y
                var yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(amchart_root, {
                        renderer: am5xy.AxisRendererY.new(amchart_root, {}),
                    })
                );

                // Préparation des données pour chaque polluant
                let seriesData = {};
                let availablePollutants = [];

                // Vérification des polluants disponibles dans les données
                if (data.length > 0) {
                    const firstDataPoint = data[0];
                    if (firstDataPoint.PM1 !== undefined)
                        availablePollutants.push('PM1');
                    if (firstDataPoint.PM25 !== undefined)
                        availablePollutants.push('PM2.5');
                    if (firstDataPoint.PM10 !== undefined)
                        availablePollutants.push('PM10');
                }

                // Création des séries pour tous les polluants disponibles
                let allSeries = [];
                availablePollutants.forEach((pollutant) => {
                    // Convertir le nom du polluant pour la comparaison
                    let polluantCompare = pollutant.toLowerCase();
                    if (polluantCompare === 'pm2.5') {
                        polluantCompare = 'pm25';
                    }

                    let dataPoints = data.map((e) => ({
                        value: e[pollutant === 'PM2.5' ? 'PM25' : pollutant],
                        date: new Date(e.time).getTime(),
                    }));

                    let series = chart.series.push(
                        am5xy.SmoothedXLineSeries.new(amchart_root, {
                            name: pollutant,
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: 'value',
                            valueXField: 'date',
                            tooltip: am5.Tooltip.new(amchart_root, {
                                labelText: `${pollutant}: {valueY} µg/m³`,
                            }),
                            visible: mesures_array.includes(polluantCompare),
                        })
                    );

                    series.strokes.template.setAll({
                        strokeWidth: 2,
                    });

                    series.data.setAll(dataPoints);
                    series.appear(1000);

                    // Stocker la série pour une utilisation ultérieure
                    allSeries.push({
                        series: series,
                        name: pollutant,
                        compare: polluantCompare,
                    });
                });

                // Création de la légende
                let legend = chart.children.push(
                    am5.Legend.new(amchart_root, {
                        centerX: am5.percent(50),
                        x: am5.percent(50),
                        y: am5.percent(95),
                        layout: am5.GridLayout.new(amchart_root, {
                            maxColumns: 2,
                            fixedWidthGrid: true,
                        }),
                        paddingTop: 10,
                        paddingBottom: 10,
                        marginTop: 10,
                        marginBottom: 10,
                    })
                );

                // Configuration des interactions de la légende
                legend.itemContainers.template.events.on(
                    'click',
                    function (ev) {
                        const clickedSeries = ev.target.dataItem.dataContext;
                        const seriesInfo = allSeries.find(
                            (s) => s.series === clickedSeries
                        );

                        if (seriesInfo) {
                            if (mesures_array.includes(seriesInfo.compare)) {
                                seriesInfo.series.set('visible', false);
                                mesures_array = mesures_array.filter(
                                    (item) => item !== seriesInfo.compare
                                );
                            } else {
                                seriesInfo.series.set('visible', true);
                                mesures_array.push(seriesInfo.compare);
                            }
                        }
                    }
                );

                // Ajout de toutes les séries à la légende
                legend.data.setAll(chart.series.values);

                // Animation
                chart.appear(1000, 100);
            }); //end am5 ready
        }, //end ajax sucess
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    }); //end ajax
} //end retreive data

// Exporter les variables qui pourraient être nécessaires ailleurs
export const { pasDeTempsChart, historiqueChart, mesuresArray } = state;
