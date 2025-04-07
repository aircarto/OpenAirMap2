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
    pas_de_temps_local,
    mesures_local,
    getColorCodeForValue,
    map,
    deviceInfo,
    openSidePanel_generic,
    formatString,
    card1_img,
    card1_title,
    card1_text,
    atmo_micro_layer,
    seuils_PM1_PM25,
    seuils_PM10,
} from '../app.js';

// Variables locales au module
var pas_de_temps_chart = '1h';
var historique_chart = '24h';
var mesures_array = [];

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
});

// Fonction principale exportée
export function load_atmoSud_microStations() {
    console.log(
        '%cload_atmoSud_microStations',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now();
    atmo_micro_layer.clearLayers();

    //need to switch pas de temps: d->journalier h->horaire qh -> quart horaire
    var pas_de_temps = getArrayFromLocalStorage(pas_de_temps_local); //attention revoie un objet !!
    var pas_de_temps_atmo = '';
    switch (pas_de_temps[0]) {
        case '2min':
            var pas_de_temps_atmo = 'brute';
            break;
        case 'qh':
            var pas_de_temps_atmo = 'quart-horaire';
            break;
        case 'h':
            var pas_de_temps_atmo = 'horaire';
            break;
        case 'd':
            var pas_de_temps_atmo = 'journalier';
            break;
    }
    //on récupère le type de mesure (+ conversion pm25 vers pm2.5)
    var mesures = getArrayFromLocalStorage(mesures_local);
    var mesures_atmo = mesures;
    switch (mesures[0]) {
        case 'pm25':
            var mesures_atmo = ['pm2.5'];
            break;
    }

    //ATTENTION pas de donnée dispo pour les micro-stations au pas de temps 2min ou journalier
    if (pas_de_temps[0] === 'd') {
        alert('Pas de données pour le pas de temps ' + pas_de_temps);
        return;
    }

    console.log('Pas de temps : ' + pas_de_temps);
    console.log('Pas de temps Atmo: ' + pas_de_temps_atmo);
    console.log('Mesures : ' + mesures);

    // Construire l'URL de l'API selon l'exemple fourni
    let full_url_derniere = `
    https://api.atmosud.org/observations/capteurs/mesures?
    format=json
    &download=false
    &valeur_brute=true
    &type_capteur=true
    &variable=${mesures_atmo}
    &aggregation=${pas_de_temps_atmo}
    &nb_dec=1
    `.replace(/\s+/g, '');

    $.ajax({
        method: 'GET',
        url: full_url_derniere,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log(full_url_derniere);
            console.log(data);
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );

            // Vérifier si les données sont valides
            if (!data || data.length === 0) {
                console.warn(
                    'Aucune donnée disponible pour les micro-stations AtmoSud'
                );
                // Afficher un message dans l'interface utilisateur
                const infoDiv = document.createElement('div');
                infoDiv.className = 'alert alert-warning';
                infoDiv.innerHTML =
                    'Aucune donnée disponible pour les micro-stations AtmoSud pour le pas de temps sélectionné.';
                infoDiv.style.position = 'absolute';
                infoDiv.style.top = '10px';
                infoDiv.style.left = '50%';
                infoDiv.style.transform = 'translateX(-50%)';
                infoDiv.style.zIndex = '1000';
                document.body.appendChild(infoDiv);

                // Supprimer le message après 5 secondes
                setTimeout(() => {
                    infoDiv.remove();
                }, 5000);
                return;
            }

            let filteredData = data;
            if (pas_de_temps[0] === '2min') {
                // Filtrer uniquement les capteurs de type NebuleAir pour éviter la confusion avec la source nebuleair
                filteredData = data.filter(
                    (item) => item.modele_capteur === 'NebuleAir'
                );
                console.log(filteredData);
                console.warn(
                    'Uniquement micro-stations NebuleAir pour le pas de temps ' +
                        pas_de_temps
                );

                // Si aucun capteur NebuleAir n'est trouvé, afficher un message
                if (filteredData.length === 0) {
                    console.warn(
                        'Aucun capteur NebuleAir trouvé dans les micro-stations AtmoSud'
                    );
                    // Ajouter un message dans l'interface utilisateur
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'alert alert-info';
                    infoDiv.innerHTML =
                        'Aucun capteur NebuleAir disponible pour le pas de temps 2min dans les micro-stations AtmoSud.';
                    infoDiv.style.position = 'absolute';
                    infoDiv.style.top = '10px';
                    infoDiv.style.left = '50%';
                    infoDiv.style.transform = 'translateX(-50%)';
                    infoDiv.style.zIndex = '1000';
                    document.body.appendChild(infoDiv);

                    // Supprimer le message après 5 secondes
                    setTimeout(() => {
                        infoDiv.remove();
                    }, 5000);
                }
            }

            // Stocker les IDs des capteurs disponibles pour vérification ultérieure
            const availableSensorIds = filteredData.map((item) => item.id_site);
            console.log('Capteurs disponibles:', availableSensorIds);

            $.each(filteredData, function (key, value) {
                // Vérifier si les données du capteur sont valides
                if (!value || !value.id_site || !value.lat || !value.lon) {
                    console.warn('Données de capteur invalides:', value);
                    return; // Ignorer ce capteur
                }

                // ICONE
                var icon_param = {
                    iconUrl:
                        'img/microStationsAtmoSud/microStationAtmoSud_default.png',
                    iconSize: [50, 50],
                    iconAnchor: [5, 40],
                    popupAnchor: [0, -10],
                    tooltipAnchor: [-50, -10],
                };

                // Use the helper functions from app.js instead of duplicating the logic
                let valueToCheck = value['valeur_brute'];
                let colorCode = getColorCodeForValue(valueToCheck, mesures[0]);

                // Set the icon URL based on the color code
                if (colorCode !== 'default') {
                    // Convertir le code de couleur pour correspondre au nom du fichier
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

                // Tooltip
                var microStation_icon = L.icon(icon_param);

                // Création du marqueur principal (point de mesure)
                let microStationMarker = L.marker(
                    [value['lat'], value['lon']],
                    {
                        icon: microStation_icon,
                    }
                ).addTo(atmo_micro_layer);

                // Store device data with the marker
                microStationMarker.deviceId = value['id_site'];
                microStationMarker.deviceData = value;

                // Store a reference to this marker in a global object for easy access
                if (!window.deviceMarkers) window.deviceMarkers = {};
                window.deviceMarkers[value['id_site']] = {
                    marker: microStationMarker,
                    data: value,
                };

                // TEXTE
                let roundedvalue = Math.round(
                    parseFloat(value['valeur_brute'])
                );
                var textSize = 32;
                var x_position = -10;
                var y_position = 41;

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
                    popupAnchor: [30, -60],
                });

                let textMarker = L.marker([value['lat'], value['lon']], {
                    icon: text_param,
                })
                    .on('click', function () {
                        // Si un marker est déjà sélectionné, on enlève l'animation
                        if (
                            globalSelectedMarker &&
                            globalSelectedMarker !== microStationMarker
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
                        microStationMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        microStationMarker._icon.classList.add(
                            'marker-selected'
                        );
                        textMarker._icon.classList.add('marker-selected');

                        // Mettre à jour le marker sélectionné
                        globalSelectedMarker = microStationMarker;
                        globalSelectedText = textMarker;
                        globalSelectedDeviceId = value['id_site']; // Store the selected device ID
                        window.lastSelectedDeviceData = value; // Store the full device data

                        console.log('Click on device: ' + value['id_site']);
                        openSidePanel_microStation(
                            value,
                            '24h',
                            pas_de_temps_atmo,
                            mesures_atmo
                        );
                    })
                    .addTo(atmo_micro_layer);

                // Also store the text marker reference
                textMarker.deviceId = value['id_site'];
                textMarker.deviceData = value;

                if (window.deviceMarkers[value['id_site']]) {
                    window.deviceMarkers[value['id_site']].textMarker =
                        textMarker;
                }

                // Effet hover : mise en avant du point et du texte
                function highlightMarker() {
                    microStationMarker.setZIndexOffset(1000);
                    textMarker.setZIndexOffset(1000);

                    // Show device info
                    deviceInfo._div.querySelector('#device-name').textContent =
                        formatString(value['nom_site']);
                    deviceInfo._div.querySelector(
                        '#device-details'
                    ).textContent = `Type: ${value['modele_capteur']}`;
                    deviceInfo._div.style.display = 'block';
                }

                function resetMarker() {
                    // Don't reset if this is the selected marker
                    if (globalSelectedMarker !== microStationMarker) {
                        microStationMarker.setZIndexOffset(0);
                        textMarker.setZIndexOffset(0);
                    }
                    deviceInfo._div.style.display = 'none';
                }

                microStationMarker
                    .on('mouseover', highlightMarker)
                    .on('mouseout', resetMarker);
                textMarker
                    .on('mouseover', highlightMarker)
                    .on('mouseout', resetMarker);
            });
            //end $each
        }, //end ajax sucess
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);

            // Afficher un message d'erreur dans l'interface utilisateur
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.innerHTML = `
                <h5>Erreur lors de la récupération des données</h5>
                <p>Impossible de récupérer les données des micro-stations AtmoSud.</p>
                <p>Erreur: ${error}</p>
                <p>Veuillez réessayer plus tard ou contacter l'administrateur.</p>
            `;
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '10px';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translateX(-50%)';
            errorDiv.style.zIndex = '1000';
            document.body.appendChild(errorDiv);

            // Supprimer le message après 10 secondes
            setTimeout(() => {
                errorDiv.remove();
            }, 10000);
        },
    }); //end ajax
}

// Fonction pour mettre en évidence un marqueur
export function highlightMarker() {
    // ... existing code ...
}

// Fonction pour réinitialiser un marqueur
export function resetMarker() {
    // ... existing code ...
}

// Fonction pour ouvrir le panneau latéral avec les informations du capteur
export function openSidePanel_microStation(
    data,
    historique,
    pas_de_temps_atmo,
    mesures_atmo
) {
    console.log('openSidePanel_microStation', data);

    try {
        // Vérifier si les données sont valides
        if (!data || !data.id_site) {
            throw new Error('Données du capteur invalides ou incomplètes');
        }

        // Mettre à jour les variables locales
        historique_chart = historique;
        pas_de_temps_chart = pas_de_temps_atmo;

        // Reset all button states
        var historique_buttons = document.querySelectorAll(
            '[id^="btn_historique_"]'
        );
        var pas_de_temps_buttons = document.querySelectorAll(
            '[id^="btn_pas_de_temps_"]'
        );

        historique_buttons.forEach((btn) => (btn.checked = false));
        pas_de_temps_buttons.forEach((btn) => (btn.checked = false));

        // Sélectionner le bouton d'historique par défaut (24h)
        if (btn_historique_24h) {
            btn_historique_24h.checked = true;
        }

        // Sélectionner le bouton de pas de temps par défaut (horaire)
        if (btn_pas_de_temps_h) {
            btn_pas_de_temps_h.checked = true;
        }

        //il faut passer à la fonction un array pour mesures
        // Clear the array by setting its length to 0
        mesures_array.length = 0;
        if (Array.isArray(mesures_atmo)) {
            mesures_atmo.forEach((measure) => mesures_array.push(measure));
        } else {
            // If it's a single value, push it directly
            mesures_array.push(mesures_atmo);
        }

        // Sélectionner les boutons de polluants en fonction des mesures
        if (mesures_array.includes('pm1') && btn_poluant_pm1) {
            btn_poluant_pm1.checked = true;
        }
        if (mesures_array.includes('pm2.5') && btn_poluant_pm25) {
            btn_poluant_pm25.checked = true;
        }
        if (mesures_array.includes('pm10') && btn_poluant_pm10) {
            btn_poluant_pm10.checked = true;
        }

        // Mettre à jour le contenu du panneau latéral
        card1_img.src =
            'img/microStationsAtmoSud/microStationAtmoSud_default.png';
        card1_title.innerHTML = data.nom_site || 'Capteur inconnu';

        // Vérifier si les données nécessaires sont présentes
        const valeur =
            data.valeur_brute !== undefined
                ? `${data.valeur_brute} µg/m³`
                : 'Non disponible';
        const type = data.modele_capteur || 'Non spécifié';
        const date = data.date_mesure
            ? new Date(data.date_mesure).toLocaleString()
            : 'Non disponible';

        card1_text.innerHTML = `
            <p>Type: ${type}</p>
            <p>Valeur: ${valeur}</p>
            <p>Dernière mise à jour: ${date}</p>
            <div id="loading-indicator" class="text-center mt-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement des données historiques...</p>
            </div>
        `;

        // Ouvrir le panneau latéral
        openSidePanel_generic();

        // Récupérer directement les données historiques sans vérification préalable
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_atmo,
            historique,
            mesures_array
        );

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_historique_custom) {
            const newBtnHistoriqueCustom =
                btn_historique_custom.cloneNode(true);
            btn_historique_custom.parentNode.replaceChild(
                newBtnHistoriqueCustom,
                btn_historique_custom
            );
            btn_historique_custom = newBtnHistoriqueCustom;
        }

        // Historique Button handlers setup
        if (btn_historique_custom) {
            btn_historique_custom.addEventListener('click', function (event) {
                event.preventDefault();
                var startDate = btn_historique_start_date.value;
                var endDate = btn_historique_end_date.value;
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
                    btn_historique_custom.checked = true;

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
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_historique_1h) {
            const newBtnHistorique1h = btn_historique_1h.cloneNode(true);
            btn_historique_1h.parentNode.replaceChild(
                newBtnHistorique1h,
                btn_historique_1h
            );
            btn_historique_1h = newBtnHistorique1h;
        }

        //1.historique
        if (btn_historique_1h) {
            btn_historique_1h.addEventListener('change', function () {
                if (this.checked) {
                    historique_chart = '1h';
                    historique_buttons.forEach((btn) => (btn.checked = false));
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_historique_3h) {
            const newBtnHistorique3h = btn_historique_3h.cloneNode(true);
            btn_historique_3h.parentNode.replaceChild(
                newBtnHistorique3h,
                btn_historique_3h
            );
            btn_historique_3h = newBtnHistorique3h;
        }

        if (btn_historique_3h) {
            btn_historique_3h.addEventListener('change', function () {
                if (this.checked) {
                    historique_chart = '3h';
                    historique_buttons.forEach((btn) => (btn.checked = false));
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_historique_24h) {
            const newBtnHistorique24h = btn_historique_24h.cloneNode(true);
            btn_historique_24h.parentNode.replaceChild(
                newBtnHistorique24h,
                btn_historique_24h
            );
            btn_historique_24h = newBtnHistorique24h;
        }

        if (btn_historique_24h) {
            btn_historique_24h.addEventListener('change', function () {
                if (this.checked) {
                    historique_chart = '24h';
                    historique_buttons.forEach((btn) => (btn.checked = false));
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_historique_7d) {
            const newBtnHistorique7d = btn_historique_7d.cloneNode(true);
            btn_historique_7d.parentNode.replaceChild(
                newBtnHistorique7d,
                btn_historique_7d
            );
            btn_historique_7d = newBtnHistorique7d;
        }

        if (btn_historique_7d) {
            btn_historique_7d.addEventListener('change', function () {
                if (this.checked) {
                    historique_chart = '7d';
                    historique_buttons.forEach((btn) => (btn.checked = false));
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_historique_30d) {
            const newBtnHistorique30d = btn_historique_30d.cloneNode(true);
            btn_historique_30d.parentNode.replaceChild(
                newBtnHistorique30d,
                btn_historique_30d
            );
            btn_historique_30d = newBtnHistorique30d;
        }

        if (btn_historique_30d) {
            btn_historique_30d.addEventListener('change', function () {
                if (this.checked) {
                    historique_chart = '30d';
                    historique_buttons.forEach((btn) => (btn.checked = false));
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_historique_365d) {
            const newBtnHistorique365d = btn_historique_365d.cloneNode(true);
            btn_historique_365d.parentNode.replaceChild(
                newBtnHistorique365d,
                btn_historique_365d
            );
            btn_historique_365d = newBtnHistorique365d;
        }

        if (btn_historique_365d) {
            btn_historique_365d.addEventListener('change', function () {
                if (this.checked) {
                    historique_chart = '365d';
                    historique_buttons.forEach((btn) => (btn.checked = false));
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_pas_de_temps_2min) {
            const newBtnPasDeTemps2min = btn_pas_de_temps_2min.cloneNode(true);
            btn_pas_de_temps_2min.parentNode.replaceChild(
                newBtnPasDeTemps2min,
                btn_pas_de_temps_2min
            );
            btn_pas_de_temps_2min = newBtnPasDeTemps2min;
        }

        //2.pas de temps
        if (btn_pas_de_temps_2min) {
            btn_pas_de_temps_2min.addEventListener('change', function () {
                if (this.checked) {
                    pas_de_temps_chart = 'brute';
                    pas_de_temps_buttons.forEach(
                        (btn) => (btn.checked = false)
                    );
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_pas_de_temps_qh) {
            const newBtnPasDeTempsQh = btn_pas_de_temps_qh.cloneNode(true);
            btn_pas_de_temps_qh.parentNode.replaceChild(
                newBtnPasDeTempsQh,
                btn_pas_de_temps_qh
            );
            btn_pas_de_temps_qh = newBtnPasDeTempsQh;
        }

        if (btn_pas_de_temps_qh) {
            btn_pas_de_temps_qh.addEventListener('change', function () {
                if (this.checked) {
                    pas_de_temps_chart = 'quart-horaire';
                    pas_de_temps_buttons.forEach(
                        (btn) => (btn.checked = false)
                    );
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_pas_de_temps_h) {
            const newBtnPasDeTempsH = btn_pas_de_temps_h.cloneNode(true);
            btn_pas_de_temps_h.parentNode.replaceChild(
                newBtnPasDeTempsH,
                btn_pas_de_temps_h
            );
            btn_pas_de_temps_h = newBtnPasDeTempsH;
        }

        if (btn_pas_de_temps_h) {
            btn_pas_de_temps_h.addEventListener('change', function () {
                if (this.checked) {
                    pas_de_temps_chart = 'horaire';
                    pas_de_temps_buttons.forEach(
                        (btn) => (btn.checked = false)
                    );
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_pas_de_temps_d) {
            const newBtnPasDeTempsD = btn_pas_de_temps_d.cloneNode(true);
            btn_pas_de_temps_d.parentNode.replaceChild(
                newBtnPasDeTempsD,
                btn_pas_de_temps_d
            );
            btn_pas_de_temps_d = newBtnPasDeTempsD;
        }

        if (btn_pas_de_temps_d) {
            btn_pas_de_temps_d.addEventListener('change', function () {
                if (this.checked) {
                    pas_de_temps_chart = 'journalier';
                    pas_de_temps_buttons.forEach(
                        (btn) => (btn.checked = false)
                    );
                    this.checked = true;
                    retreive_historiqueData_microStation(
                        data.id_site,
                        pas_de_temps_chart,
                        historique_chart,
                        mesures_array
                    );
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_poluant_pm1) {
            const newBtnPoluantPm1 = btn_poluant_pm1.cloneNode(true);
            btn_poluant_pm1.parentNode.replaceChild(
                newBtnPoluantPm1,
                btn_poluant_pm1
            );
            btn_poluant_pm1 = newBtnPoluantPm1;
        }

        //3. Mesures
        if (btn_poluant_pm1) {
            btn_poluant_pm1.addEventListener('change', function () {
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

                    if (
                        btn_historique_custom &&
                        btn_historique_custom.checked
                    ) {
                        var startDate = btn_historique_start_date.value;
                        var endDate = btn_historique_end_date.value;
                        let startDateTime = new Date(
                            `${startDate}T00:00`
                        ).toISOString();
                        let endDateTime = new Date(
                            `${endDate}T23:59`
                        ).toISOString();
                        retreive_historiqueData_microStation(
                            data.id_site,
                            pas_de_temps_chart,
                            null,
                            mesures_array,
                            true,
                            startDateTime,
                            endDateTime
                        );
                    } else {
                        retreive_historiqueData_microStation(
                            data.id_site,
                            pas_de_temps_chart,
                            historique_chart,
                            mesures_array,
                            true
                        );
                    }
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_poluant_pm25) {
            const newBtnPoluantPm25 = btn_poluant_pm25.cloneNode(true);
            btn_poluant_pm25.parentNode.replaceChild(
                newBtnPoluantPm25,
                btn_poluant_pm25
            );
            btn_poluant_pm25 = newBtnPoluantPm25;
        }

        if (btn_poluant_pm25) {
            btn_poluant_pm25.addEventListener('change', function () {
                if (this.checked) {
                    if (mesures_array.includes('pm2.5')) {
                        mesures_array = mesures_array.filter(
                            (item) => item !== 'pm2.5'
                        );
                        this.checked = false;
                    } else {
                        mesures_array.push('pm2.5');
                        this.checked = true;
                    }

                    if (
                        btn_historique_custom &&
                        btn_historique_custom.checked
                    ) {
                        var startDate = btn_historique_start_date.value;
                        var endDate = btn_historique_end_date.value;
                        let startDateTime = new Date(
                            `${startDate}T00:00`
                        ).toISOString();
                        let endDateTime = new Date(
                            `${endDate}T23:59`
                        ).toISOString();
                        retreive_historiqueData_microStation(
                            data.id_site,
                            pas_de_temps_chart,
                            null,
                            mesures_array,
                            true,
                            startDateTime,
                            endDateTime
                        );
                    } else {
                        retreive_historiqueData_microStation(
                            data.id_site,
                            pas_de_temps_chart,
                            historique_chart,
                            mesures_array,
                            true
                        );
                    }
                }
            });
        }

        // Supprimer les anciens gestionnaires d'événements pour éviter les doublons
        if (btn_poluant_pm10) {
            const newBtnPoluantPm10 = btn_poluant_pm10.cloneNode(true);
            btn_poluant_pm10.parentNode.replaceChild(
                newBtnPoluantPm10,
                btn_poluant_pm10
            );
            btn_poluant_pm10 = newBtnPoluantPm10;
        }

        if (btn_poluant_pm10) {
            btn_poluant_pm10.addEventListener('change', function () {
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

                    if (
                        btn_historique_custom &&
                        btn_historique_custom.checked
                    ) {
                        var startDate = btn_historique_start_date.value;
                        var endDate = btn_historique_end_date.value;
                        let startDateTime = new Date(
                            `${startDate}T00:00`
                        ).toISOString();
                        let endDateTime = new Date(
                            `${endDate}T23:59`
                        ).toISOString();
                        retreive_historiqueData_microStation(
                            data.id_site,
                            pas_de_temps_chart,
                            null,
                            mesures_array,
                            true,
                            startDateTime,
                            endDateTime
                        );
                    } else {
                        retreive_historiqueData_microStation(
                            data.id_site,
                            pas_de_temps_chart,
                            historique_chart,
                            mesures_array,
                            true
                        );
                    }
                }
            });
        }

        if (btn_poluant_no2) {
            btn_poluant_no2.disabled = true;
        }
    } catch (error) {
        console.error("Erreur lors de l'ouverture du panneau latéral:", error);
        card1_text.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h5>Erreur</h5>
                <p>Une erreur est survenue lors de l'affichage des informations du capteur.</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Fonction pour récupérer les données historiques
export function retreive_historiqueData_microStation(
    sensorId,
    pas_de_temps,
    historique,
    mesures_array,
    add_mesure = false,
    custom_start = null,
    custom_end = null
) {
    console.log('retreive_historiqueData_microStation', {
        sensorId,
        pas_de_temps,
        historique,
        mesures_array,
        add_mesure,
        custom_start,
        custom_end,
    });

    // Vérifier si les paramètres sont valides
    if (!sensorId) {
        console.error('ID du capteur manquant');
        updateChartWithError('ID du capteur manquant');
        return;
    }

    // Définir les dates de début et de fin
    let startDate, endDate;

    try {
        if (custom_start && custom_end) {
            startDate = custom_start;
            endDate = custom_end;
        } else {
            const now = new Date();
            endDate = now.toISOString();

            // Calculer la date de début en fonction de l'historique
            startDate = new Date(now);
            switch (historique) {
                case '1h':
                    startDate.setHours(now.getHours() - 1);
                    break;
                case '3h':
                    startDate.setHours(now.getHours() - 3);
                    break;
                case '6h':
                    startDate.setHours(now.getHours() - 6);
                    break;
                case '12h':
                    startDate.setHours(now.getHours() - 12);
                    break;
                case '24h':
                    startDate.setHours(now.getHours() - 24);
                    break;
                case '7d':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(now.getDate() - 30);
                    break;
                case '365d':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate.setHours(now.getHours() - 24); // Par défaut, 24h
            }
            startDate = startDate.toISOString();
        }

        console.log('Période de données:', {
            startDate,
            endDate,
            historique,
        });

        // Afficher un indicateur de chargement
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement des données historiques...</p>
            `;
        }

        // Convertir le tableau de mesures en chaîne de caractères
        const mesuresString = Array.isArray(mesures_array)
            ? mesures_array.join(',')
            : mesures_array;

        // Construire l'URL de l'API
        let full_url_historique = `
        https://api.atmosud.org/observations/capteurs/mesures?
        format=json
        &download=false
        &valeur_brute=true
        &type_capteur=true
        &variable=${mesuresString}
        &aggregation=${pas_de_temps}
        &debut=${startDate}
        &fin=${endDate}
        &id_site=${sensorId}
        &nb_dec=1
        `.replace(/\s+/g, '');

        console.log('URL historique:', full_url_historique);

        // Faire la requête AJAX
        $.ajax({
            method: 'GET',
            url: full_url_historique,
            timeout: 30000, // Timeout après 30 secondes
            success: function (data) {
                console.log('Données historiques reçues:', data);

                // Vérifier si les données sont valides
                if (!data || data.length === 0) {
                    console.warn('Aucune donnée historique disponible');
                    updateChartWithError(
                        'Aucune donnée historique disponible pour cette période'
                    );
                    return;
                }

                // Traiter les données et mettre à jour le graphique
                updateChartWithData(data);
            },
            error: function (xhr, status, error) {
                console.error(
                    'Erreur lors de la récupération des données historiques:',
                    error
                );
                console.error('Status:', status);
                console.error('Réponse:', xhr.responseText);

                let errorMessage = 'Erreur lors de la récupération des données';

                if (status === 'timeout') {
                    errorMessage =
                        'La requête a pris trop de temps. Veuillez réessayer.';
                } else if (xhr.status === 404) {
                    errorMessage = `Le capteur avec l'ID ${sensorId} n'est pas trouvé ou n'est plus disponible sur l'API AtmoSud.`;
                    console.warn(
                        `Capteur ${sensorId} non trouvé sur l'API AtmoSud`
                    );

                    // Ajouter un message plus détaillé dans le panneau latéral
                    card1_text.innerHTML += `
                        <div class="alert alert-warning mt-3" role="alert">
                            <h5>Capteur non disponible</h5>
                            <p>Le capteur avec l'ID ${sensorId} n'est pas trouvé ou n'est plus disponible sur l'API AtmoSud.</p>
                            <p>Il est possible que ce capteur ait été retiré ou que son ID ait changé.</p>
                            <p>Veuillez essayer de recharger la page pour obtenir les données les plus récentes.</p>
                        </div>
                    `;
                } else if (xhr.status === 500) {
                    errorMessage =
                        'Erreur serveur. Veuillez réessayer plus tard.';
                }

                updateChartWithError(errorMessage);
            },
        });
    } catch (error) {
        console.error(
            'Erreur lors de la récupération des données historiques:',
            error
        );
        updateChartWithError('Erreur inattendue: ' + error.message);
    }
}

// Fonction pour mettre à jour le graphique avec les données
function updateChartWithData(data) {
    try {
        // Supprimer l'indicateur de chargement
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        // Vérifier si les données sont valides
        if (!data || data.length === 0) {
            updateChartWithError('Aucune donnée disponible pour cette période');
            return;
        }

        // Trier les données par date
        data.sort((a, b) => new Date(a.time) - new Date(b.time));

        // Préparer les données pour le graphique
        const chartData = data.map((item) => {
            return {
                date: new Date(item.time).getTime(), // Convertir en timestamp pour amCharts
                value: parseFloat(item.valeur_brute) || 0,
            };
        });

        // Ajouter un titre et le nombre de points de données
        card1_text.innerHTML += `
            <div class="mt-3">
                <h5>Données historiques</h5>
                <p>${data.length} points de données disponibles</p>
            </div>
        `;

        // Vérifier si Chart.js est disponible
        if (typeof Chart !== 'undefined') {
            // Créer le graphique avec Chart.js
            const ctx = document
                .getElementById('chartdiv_sensor')
                .getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.map((item) =>
                        new Date(item.date).toLocaleTimeString()
                    ),
                    datasets: [
                        {
                            label: 'Valeur (µg/m³)',
                            data: chartData.map((item) => item.value),
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1,
                            fill: false,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Heure',
                            },
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Valeur (µg/m³)',
                            },
                            beginAtZero: true,
                        },
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return `Valeur: ${context.parsed.y} µg/m³`;
                                },
                            },
                        },
                    },
                },
            });
        } else {
            // Utiliser amcharts par défaut
            console.log("Utilisation d'amcharts pour le graphique");

            try {
                // Vérifier si amcharts 5 est disponible
                if (window.am5) {
                    // Nettoyer le conteneur existant
                    const chartContainer =
                        document.getElementById('chartdiv_sensor');
                    chartContainer.innerHTML = '';

                    // Déterminer l'intervalle de temps pour l'axe X
                    let baseInterval_timeUnit = 'minute';
                    let baseInterval_count = 1;

                    // Ajuster l'intervalle en fonction de la période couverte
                    const timeRange =
                        chartData.length > 0
                            ? chartData[chartData.length - 1].date -
                              chartData[0].date
                            : 0;

                    if (timeRange > 7 * 24 * 60 * 60 * 1000) {
                        // Plus d'une semaine
                        baseInterval_timeUnit = 'day';
                        baseInterval_count = 1;
                    } else if (timeRange > 24 * 60 * 60 * 1000) {
                        // Plus d'un jour
                        baseInterval_timeUnit = 'hour';
                        baseInterval_count = 1;
                    } else if (timeRange > 60 * 60 * 1000) {
                        // Plus d'une heure
                        baseInterval_timeUnit = 'minute';
                        baseInterval_count = 15;
                    }

                    // Créer le graphique avec amcharts 5
                    am5.ready(function () {
                        // Créer l'élément racine
                        const root = am5.Root.new('chartdiv_sensor');

                        // Créer le graphique
                        const chart = root.container.children.push(
                            am5xy.XYChart.new(root, {
                                panX: false,
                                panY: false,
                                wheelX: 'panX',
                                wheelY: 'zoomX',
                                paddingLeft: 0,
                            })
                        );

                        // Ajouter un curseur
                        const cursor = chart.set(
                            'cursor',
                            am5xy.XYCursor.new(root, {
                                behavior: 'zoomX',
                            })
                        );

                        cursor.lineY.set('visible', false);

                        // Créer l'axe X (temps)
                        const xAxis = chart.xAxes.push(
                            am5xy.DateAxis.new(root, {
                                maxDeviation: 0.2,
                                baseInterval: {
                                    timeUnit: baseInterval_timeUnit,
                                    count: baseInterval_count,
                                },
                                renderer: am5xy.AxisRendererX.new(root, {
                                    minorGridEnabled: true,
                                }),
                                tooltip: am5.Tooltip.new(root, {}),
                            })
                        );

                        // Créer l'axe Y (valeur)
                        const yAxis = chart.yAxes.push(
                            am5xy.ValueAxis.new(root, {
                                renderer: am5xy.AxisRendererY.new(root, {}),
                            })
                        );

                        // Ajouter les données
                        const series = chart.series.push(
                            am5xy.SmoothedXLineSeries.new(root, {
                                name: 'Valeur (µg/m³)',
                                xAxis: xAxis,
                                yAxis: yAxis,
                                valueYField: 'value',
                                valueXField: 'date',
                                tooltip: am5.Tooltip.new(root, {
                                    labelText: 'Valeur: {valueY} µg/m³',
                                }),
                            })
                        );

                        // Définir l'épaisseur de la ligne
                        series.strokes.template.setAll({
                            strokeWidth: 2,
                        });

                        // Définir les données
                        series.data.setAll(chartData);

                        // Faire apparaître la série avec une animation
                        series.appear(1000);

                        // Ajouter une légende
                        const legend = chart.children.push(
                            am5.Legend.new(root, {
                                centerX: am5.percent(50),
                                x: am5.percent(50),
                                layout: root.horizontalLayout,
                            })
                        );

                        legend.data.push(series);

                        // Ajouter un bouton pour exporter les données
                        const exportButton = root.container.children.push(
                            am5.Button.new(root, {
                                labelText: 'Exporter',
                                x: am5.percent(100),
                                centerX: am5.percent(100),
                                paddingRight: 10,
                                layout: root.horizontalLayout,
                            })
                        );

                        exportButton.events.on('click', function () {
                            am5.exporting.export('csv', {
                                data: chartData,
                                fields: ['date', 'value'],
                            });
                        });

                        // Faire apparaître le graphique avec une animation
                        chart.appear(1000, 100);

                        // Stocker la référence au graphique pour pouvoir le détruire plus tard
                        window.amchart_root = root;

                        // Forcer la mise à jour de la taille du conteneur
                        root.resize();

                        // Ajouter un événement de redimensionnement pour s'assurer que le graphique s'adapte
                        window.addEventListener('resize', function () {
                            if (window.amchart_root) {
                                window.amchart_root.resize();
                            }
                        });
                    });
                } else {
                    throw new Error("amcharts 5 n'est pas disponible");
                }
            } catch (error) {
                console.error(
                    "Erreur lors de l'utilisation d'amcharts:",
                    error
                );
                card1_text.innerHTML += `
                    <div class="alert alert-warning mt-3" role="alert">
                        <h5>Attention</h5>
                        <p>Impossible d'afficher le graphique car amcharts n'est pas correctement chargé.</p>
                        <p>Erreur: ${error.message}</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du graphique:', error);
        updateChartWithError(
            "Erreur lors de l'affichage des données: " + error.message
        );
    }
}

// Fonction pour afficher une erreur dans le panneau latéral
function updateChartWithError(errorMessage) {
    // Supprimer l'indicateur de chargement
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }

    // Afficher le message d'erreur
    card1_text.innerHTML += `
        <div class="alert alert-warning mt-3" role="alert">
            <h5>Attention</h5>
            <p>${errorMessage}</p>
            <hr>
            <p class="mb-0">Vous pouvez essayer de recharger la page pour obtenir les données les plus récentes.</p>
            <p class="mb-0">Si le problème persiste, il est possible que le capteur ne soit plus disponible dans l'API AtmoSud.</p>
        </div>
    `;
}

// Exporter les variables qui pourraient être nécessaires ailleurs
export { pas_de_temps_chart, historique_chart, mesures_array };
