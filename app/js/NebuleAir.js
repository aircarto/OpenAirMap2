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

// Variables locales au module
var pasDeTempsChart = '1h';
var historique_chart = '24h';
var mesures_array = [];

// Déclaration des variables pour les boutons d'historique
let btnHistoriqueCustom;
let btnHistoriqueStartDate;
let btnHistoriqueEndDate;
let btnHistorique1h;
let btnHistorique3h;
let btnHistorique24h;
let btnHistorique7d;
let btnHistorique30d;
let btnHistorique365d;
let btnPasDeTemps2min;
let btnPasDeTempsQh;
let btnPasDeTempsH;
let btnPasDeTempsD;
let btnPoluantPm1;
let btnPoluantPm25;
let btnPoluantPm10;
let btnPoluantNo2;

// Initialisation des boutons au chargement du DOM
document.addEventListener('DOMContentLoaded', function () {
    btnHistoriqueCustom = document.getElementById('apply_date_range');
    btnHistoriqueStartDate = document.getElementById('start_date');
    btnHistoriqueEndDate = document.getElementById('end_date');
    btnHistorique1h = document.getElementById('btn_historique_1h');
    btnHistorique3h = document.getElementById('btn_historique_3h');
    btnHistorique24h = document.getElementById('btn_historique_24h');
    btnHistorique7d = document.getElementById('btn_historique_7d');
    btnHistorique30d = document.getElementById('btn_historique_30d');
    btnHistorique365d = document.getElementById('btn_historique_365d');
    btnPasDeTemps2min = document.getElementById('btn_pas_de_temps_2min');
    btnPasDeTempsQh = document.getElementById('btn_pas_de_temps_qh');
    btnPasDeTempsH = document.getElementById('btn_pas_de_temps_h');
    btnPasDeTempsD = document.getElementById('btn_pas_de_temps_d');
    btnPoluantPm1 = document.getElementById('btn_poluant_pm1');
    btnPoluantPm25 = document.getElementById('btn_poluant_pm25');
    btnPoluantPm10 = document.getElementById('btn_poluant_pm10');
    btnPoluantNo2 = document.getElementById('btn_poluant_no2');
});

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

    historique_chart = historique;
    pasDeTempsChart = pas_de_temps;

    // Reset all button states
    var historique_buttons = document.querySelectorAll(
        '[id^="btn_historique_"]'
    );
    var pas_de_temps_buttons = document.querySelectorAll(
        '[id^="btn_pas_de_temps_"]'
    );

    historique_buttons.forEach((btn) => (btn.checked = false));
    pas_de_temps_buttons.forEach((btn) => (btn.checked = false));

    //il faut passer à la fonction un array pour mesures
    // Clear the array by setting its length to 0
    mesures_array.length = 0;
    if (Array.isArray(mesures)) {
        mesures.forEach((measure) => mesures_array.push(measure));
    } else {
        // If it's a single value, push it directly
        mesures_array.push(mesures);
    }

    // Définir l'historique par défaut en fonction du pas de temps
    if (pas_de_temps === '2min' || pas_de_temps === '2m') {
        historique_chart = '1h';
    } else if (pas_de_temps === 'h') {
        historique_chart = '7d';
    } else if (pas_de_temps === 'd') {
        historique_chart = '30d';
    }

    //on lance la fonction pour récupérer les datas de mesures
    retreive_historiqueData_nebuleAir(
        data.sensorId,
        pas_de_temps,
        historique_chart,
        mesures_array
    );

    card1_img.src = 'img/nebuleair/NebuleAir_photo.png';
    card1_title.innerHTML = data.sensorId;
    card1_subtitle.innerHTML = 'Capteur citoyen';
    card1_text.innerHTML = ''; //empty content from previous opening

    card2_text.innerHTML =
        "Le capteur NebuleAir est un dispositif de mesure de l'air extérieur développé par AirCarto et AtmoSud. Il peut être placé sur le rebord d'une fenêtre ou sur un balcon afin de mesurer le taux de particules fines présent dans l'air. Il communique ses données toutes 2 minutes et les envoies sur les serveurs d'AirCarto via une connexion WIFI.";
    card2_link.innerHTML = 'AirCarto.fr'; //empty content from previous opening
    card2_link.href = 'https://aircarto.fr';

    // Historique Button handlers setup
    if (btnHistoriqueCustom) {
        btnHistoriqueCustom.addEventListener('click', function (event) {
            event.preventDefault();
            var startDate = btnHistoriqueStartDate.value;
            var endDate = btnHistoriqueEndDate.value;
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
                btnHistoriqueCustom.checked = true;

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
                    pasDeTempsChart,
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
        });
    }

    //1.historique
    if (btnHistorique1h) {
        btnHistorique1h.addEventListener('change', function () {
            if (this.checked) {
                historique_chart = '1h';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    if (btnHistorique3h) {
        btnHistorique3h.addEventListener('change', function () {
            if (this.checked) {
                historique_chart = '3h';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    if (btnHistorique24h) {
        btnHistorique24h.addEventListener('change', function () {
            if (this.checked) {
                historique_chart = '24h';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    if (btnHistorique7d) {
        btnHistorique7d.addEventListener('change', function () {
            if (this.checked) {
                historique_chart = '7d';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    if (btnHistorique30d) {
        btnHistorique30d.addEventListener('change', function () {
            if (this.checked) {
                historique_chart = '30d';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    if (btnHistorique365d) {
        btnHistorique365d.addEventListener('change', function () {
            if (this.checked) {
                historique_chart = '365d';
                historique_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    //2.pas de temps
    if (btnPasDeTemps2min) {
        btnPasDeTemps2min.addEventListener('change', function () {
            if (this.checked) {
                pasDeTempsChart = '2m';
                pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    if (btnPasDeTempsQh) {
        btnPasDeTempsQh.addEventListener('change', function () {
            if (this.checked) {
                pasDeTempsChart = '15m';
                pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    if (btnPasDeTempsH) {
        btnPasDeTempsH.addEventListener('change', function () {
            if (this.checked) {
                pasDeTempsChart = '1h';
                pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    if (btnPasDeTempsD) {
        btnPasDeTempsD.addEventListener('change', function () {
            if (this.checked) {
                pasDeTempsChart = '1d';
                pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
                this.checked = true;
                retreive_historiqueData_nebuleAir(
                    data.sensorId,
                    pasDeTempsChart,
                    historique_chart,
                    mesures_array
                );
            }
        });
    }

    //3. Mesures
    if (btnPoluantPm1) {
        btnPoluantPm1.addEventListener('change', function () {
            if (this.checked) {
                if (mesures_array.includes('pm1')) {
                    mesures_array = mesures_array.filter(
                        (item) => item !== 'pm1'
                    );
                    this.checked = false;
                } else {
                    mesures_array.push('pm1');
                    this.checked = true;
                }

                if (btnHistoriqueCustom && btnHistoriqueCustom.checked) {
                    var startDate = btnHistoriqueStartDate.value;
                    var endDate = btnHistoriqueEndDate.value;
                    let startDateTime = new Date(
                        `${startDate}T00:00`
                    ).toISOString();
                    let endDateTime = new Date(
                        `${endDate}T23:59`
                    ).toISOString();
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        pasDeTempsChart,
                        null,
                        mesures_array,
                        true,
                        startDateTime,
                        endDateTime
                    );
                } else {
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        pasDeTempsChart,
                        historique_chart,
                        mesures_array,
                        true
                    );
                }
            }
        });
    }

    if (btnPoluantPm25) {
        btnPoluantPm25.addEventListener('change', function () {
            if (this.checked) {
                if (mesures_array.includes('pm25')) {
                    mesures_array = mesures_array.filter(
                        (item) => item !== 'pm25'
                    );
                    this.checked = false;
                } else {
                    mesures_array.push('pm25');
                    this.checked = true;
                }

                if (btnHistoriqueCustom && btnHistoriqueCustom.checked) {
                    var startDate = btnHistoriqueStartDate.value;
                    var endDate = btnHistoriqueEndDate.value;
                    let startDateTime = new Date(
                        `${startDate}T00:00`
                    ).toISOString();
                    let endDateTime = new Date(
                        `${endDate}T23:59`
                    ).toISOString();
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        pasDeTempsChart,
                        null,
                        mesures_array,
                        true,
                        startDateTime,
                        endDateTime
                    );
                } else {
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        pasDeTempsChart,
                        historique_chart,
                        mesures_array,
                        true
                    );
                }
            }
        });
    }

    if (btnPoluantPm10) {
        btnPoluantPm10.addEventListener('change', function () {
            if (this.checked) {
                if (mesures_array.includes('pm10')) {
                    mesures_array = mesures_array.filter(
                        (item) => item !== 'pm10'
                    );
                    this.checked = false;
                } else {
                    mesures_array.push('pm10');
                    this.checked = true;
                }

                if (btnHistoriqueCustom && btnHistoriqueCustom.checked) {
                    var startDate = btnHistoriqueStartDate.value;
                    var endDate = btnHistoriqueEndDate.value;
                    let startDateTime = new Date(
                        `${startDate}T00:00`
                    ).toISOString();
                    let endDateTime = new Date(
                        `${endDate}T23:59`
                    ).toISOString();
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        pasDeTempsChart,
                        null,
                        mesures_array,
                        true,
                        startDateTime,
                        endDateTime
                    );
                } else {
                    retreive_historiqueData_nebuleAir(
                        data.sensorId,
                        pasDeTempsChart,
                        historique_chart,
                        mesures_array,
                        true
                    );
                }
            }
        });
    }

    if (btnPoluantNo2) {
        btnPoluantNo2.disabled = true;
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
    //pour le pas de temps (pour l'URL) il faut convertir (2min, qh, h et d -->en--> 2m, 15m, 1h et 1d)
    //pour le pas de temps (pour l'URL) il faut convertir
    var api_pas_de_temps;
    switch (pas_de_temps) {
        case '2m':
        case '2min':
            api_pas_de_temps = '2m';
            break;
        case '15m':
        case 'qh':
            api_pas_de_temps = '15m';
            break;
        case '1h':
        case 'h':
            api_pas_de_temps = '1h';
            break;
        case '1d':
        case 'd':
        case 'journalier':
        case '24h':
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
                amchart_root.dispose();
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
export { pasDeTempsChart, historique_chart, mesures_array };
