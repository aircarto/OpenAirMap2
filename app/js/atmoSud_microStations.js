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
    map,
    deviceInfo,
    openSidePanelGeneric,
    formatString,
    card1_img,
    card1_title,
    card1_text,
    atmo_micro_layer,
    seuils_PM1_PM25,
    seuils_PM10,
    sources,
    pas_de_temps,
} from '../app.js';

// Variables locales au module
var pas_de_temps_chart = 'horaire'; // Valeur par défaut modifiée pour correspondre à l'API
var historique_chart = '24h';
var mesures_array = []; // Tableau vide par défaut, sera rempli avec les valeurs du localStorage

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
export function loadAtmoSudMicroStation() {
    console.log(
        '%cloadAtmoSudMicroStation',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now();
    atmo_micro_layer.clearLayers();

    //need to switch pas de temps: d->journalier h->horaire qh -> quart horaire
    var pas_de_temps = getArrayFromLocalStorage(pasDeTempsLocal); //attention revoie un objet !!
    console.log('Pas de temps récupéré du localStorage:', pas_de_temps);

    var pas_de_temps_atmo = '';
    switch (pas_de_temps[0]) {
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
            pas_de_temps_atmo = 'journalier';
            pas_de_temps_chart = 'journalier';
            break;
        default:
            pas_de_temps_atmo = 'horaire';
            pas_de_temps_chart = 'horaire';
    }

    //on récupère le type de mesure (+ conversion pm25 vers pm2.5)
    var mesures = getArrayFromLocalStorage(mesuresLocal);
    mesures_array = [...mesures]; // Copier les mesures du localStorage dans mesures_array
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

    let allPollutants = ['pm1', 'pm2.5', 'pm10', 'no2'];

    console.log('Pas de temps : ' + pas_de_temps);
    console.log('Pas de temps Atmo: ' + pas_de_temps_atmo);
    console.log('Mesures : ' + mesures);

    // Construire l'URL de l'API selon l'exemple fourni
    let full_url_derniere = `
    https://api.atmosud.org/observations/capteurs/mesures/dernieres?
    format=json
    &download=false
    &valeur_brute=true
    &type_capteur=true
    &variable=${allPollutants.join(',')}
    &aggregation=${pas_de_temps_atmo}
    &nb_dec=1
    `.replace(/\s+/g, '');

    console.log("URL de l'API AtmoSud:", full_url_derniere);

    $.ajax({
        method: 'GET',
        url: full_url_derniere,
        success: function (data) {
            console.log('Réponse API:', data);
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );

            // Vérifier si les données sont valides
            if (!data || !Array.isArray(data)) {
                console.warn(
                    'Aucune donnée disponible ou format invalide pour les micro-stations AtmoSud'
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

            // Filtrer les données selon le polluant sélectionné
            let filteredData = data.filter((item) => {
                // Convertir le polluant sélectionné pour la comparaison
                let selectedPollutant = mesures[0];
                if (selectedPollutant === 'pm25') {
                    selectedPollutant = 'pm2.5';
                }
                return (
                    item.variable &&
                    item.variable.toLowerCase() === selectedPollutant
                );
            });

            console.log(
                'Données filtrées pour le polluant:',
                mesures[0],
                filteredData
            );

            if (pas_de_temps[0] === '2min') {
                // Filtrer uniquement les capteurs de type NebuleAir pour éviter la confusion avec la source nebuleair
                filteredData = filteredData.filter(
                    (item) => item.modele_capteur === 'NebuleAir'
                );
            }

            // Vérifier si nous avons des données après le filtrage
            if (filteredData.length === 0) {
                console.warn(
                    'Aucune donnée disponible après filtrage pour le polluant:',
                    mesures[0]
                );
                return;
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

                        // Appliquer l'animation uniquement au nouveau marker sélectionné
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

                        // Mettre à jour le marker sélectionné
                        globalSelectedMarker = microStationMarker;
                        globalSelectedText = textMarker;
                        globalSelectedDeviceId = value['id_site']; // Store the selected device ID
                        window.lastSelectedDeviceData = value; // Store the full device data

                        console.log('Click on device: ' + value['id_site']);
                        openSidePanelMicroStation(
                            value,
                            pas_de_temps_atmo,
                            historique_chart,
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

                    // Création d'un tooltip personnalisé avec Bootstrap
                    const tooltip = document.createElement('div');
                    tooltip.className = 'custom-tooltip';
                    tooltip.innerHTML = `
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-2">
                                <h6 class="card-title mb-1">${value['nom_site']}</h6>
                                <div class="d-flex flex-column">
                                    <small class="text-muted mb-1">
                                        <i class="bi bi-geo-alt me-1"></i>
                                        ${value['lat'].toFixed(6)}, ${value['lon'].toFixed(6)}
                                    </small>
                                    <small class="text-muted mb-1">
                                        <i class="bi bi-clock me-1"></i>
                                        Dernière mise à jour: ${new Date(value['time']).toLocaleString()}
                                    </small>
                                    <small class="text-muted">
                                        <i class="bi bi-info-circle me-1"></i>
                                        ${value['modele_capteur']} - ${value['marque_capteur']}
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
                    microStationMarker.tooltip = tooltip;
                    textMarker.tooltip = tooltip;
                }

                function resetMarker() {
                    // Don't reset if this is the selected marker
                    if (globalSelectedMarker !== microStationMarker) {
                        microStationMarker.setZIndexOffset(0);
                        textMarker.setZIndexOffset(0);
                    }

                    // Suppression du tooltip
                    if (microStationMarker.tooltip) {
                        microStationMarker.tooltip.remove();
                        microStationMarker.tooltip = null;
                        textMarker.tooltip = null;
                    }
                }

                // Apply hover effects to both markers
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

// Fonction pour ouvrir le panneau latéral avec les informations du capteur
export function openSidePanelMicroStation(
    data,
    pas_de_temps_atmo,
    historique,
    mesures_atmo
) {
    // Gestion icone fermeture sidepanel
    var closeButton = document
        .getElementById('toggleSidePanel')
        .querySelector('i');
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');

    historique_chart = historique;
    pas_de_temps_chart = pas_de_temps_atmo;
    console.log('Pas de temps initial:', pas_de_temps_chart);
    mesures_array.length = 0;
    // Si mesures_atmo est un tableau, ajouter chaque élément au tableau mesures_array
    if (Array.isArray(mesures_atmo)) {
        mesures_atmo.forEach((measure) => mesures_array.push(measure));
    } else {
        // Si mesures_atmo n'est pas un tableau, ajouter la valeur à mesures_array
        mesures_array.push(mesures_atmo);
    }

    //on réinitialise les boutons
    var historique_buttons = document.querySelectorAll(
        '[id^="btn_historique_"]'
    );
    var pas_de_temps_buttons = document.querySelectorAll(
        '[id^="btn_pas_de_temps_"]'
    );
    var polluants_buttons = document.querySelectorAll('[id^="btn_poluant_"]');

    historique_buttons.forEach((btn) => (btn.checked = false));
    pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
    polluants_buttons.forEach((btn) => (btn.checked = false));

    // Activer/désactiver les boutons de polluants en fonction de ce que l'appareil peut mesurer

    // Récupérer les polluants disponibles pour cette station
    let availablePollutants = [];

    // Vérifier si nous avons la nouvelle structure de données ou l'ancienne
    if (data.pollutants) {
        // Nouvelle structure
        availablePollutants = Object.keys(data.pollutants);
    } else if (data.allPollutantsData) {
        // Structure intermédiaire (stockée dans le marker)
        availablePollutants = Object.keys(data.allPollutantsData);
    } else if (
        window.deviceMarkers &&
        window.deviceMarkers[data.id_site] &&
        window.deviceMarkers[data.id_site].allPollutantsData
    ) {
        // Récupérer depuis l'objet global deviceMarkers
        availablePollutants = Object.keys(
            window.deviceMarkers[data.id_site].allPollutantsData
        );
    } else {
        // Ancienne structure - on n'a qu'un seul polluant
        // Convertir pm25 en pm2.5 si nécessaire
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

    console.log(
        'Polluants disponibles pour cet appareil:',
        availablePollutants
    );

    // Activer les boutons pour les polluants disponibles
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

    console.log('mesures atmo', mesures_atmo);
    //on met les boutons des filtres à jour
    const btn_historique = document.getElementById(
        'btn_historique_' + historique
    );
    if (btn_historique) {
        btn_historique.checked = true;
    }

    // Convertir le pas de temps pour l'interface
    let btn_pas_de_temps_id = 'btn_pas_de_temps_h'; // Valeur par défaut
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

    const btn_pas_de_temps = document.getElementById(btn_pas_de_temps_id);
    if (btn_pas_de_temps) {
        btn_pas_de_temps.checked = true;
    }

    // Sélectionner le bouton du polluant actif
    let activeMeasure = '';
    if (Array.isArray(mesures_atmo)) {
        activeMeasure = mesures_atmo[0];
    } else {
        activeMeasure = mesures_atmo;
    }

    // Convertir pm25 en pm2.5 si nécessaire
    if (activeMeasure === 'pm25') {
        activeMeasure = 'pm2.5';
    }

    console.log('Polluant actif:', activeMeasure);

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
        // Si le polluant actif n'est pas disponible, sélectionner le premier disponible
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

    console.log('openSidePanelMicroStation');
    console.log('mesures_array après sélection:', mesures_array);

    // Déterminer l'ID du site à utiliser
    const siteId = data.site_info ? data.id_site : data.id_site;

    // Utiliser l'ID du site pour récupérer les données historiques
    console.log(
        'Appel à retreive_historiqueData_microStation avec pas_de_temps_atmo:',
        pas_de_temps_atmo
    );
    retreive_historiqueData_microStation(
        siteId,
        pas_de_temps_atmo,
        historique,
        mesures_array
    );

    // Mettre à jour les informations de la carte
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

    // Historique Button handlers setup
    btn_historique_custom.onclick = function (event) {
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
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

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
    };

    btn_historique_1h.onclick = function () {
        historique_chart = '1h';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_1h.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };
    btn_historique_3h.onclick = function () {
        historique_chart = '3h';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_3h.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };
    btn_historique_24h.onclick = function () {
        historique_chart = '24h';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_24h.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

    // Vérifier si le bouton existe avant d'ajouter l'événement
    if (btn_historique_7d) {
        btn_historique_7d.onclick = function () {
            historique_chart = '7d';
            historique_buttons.forEach((btn) => (btn.checked = false));
            btn_historique_7d.checked = true;
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        };
    }

    if (btn_historique_30d) {
        btn_historique_30d.onclick = function () {
            historique_chart = '30d';
            historique_buttons.forEach((btn) => (btn.checked = false));
            btn_historique_30d.checked = true;
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        };
    }

    if (btn_historique_365d) {
        btn_historique_365d.onclick = function () {
            historique_chart = '365d';
            historique_buttons.forEach((btn) => (btn.checked = false));
            btn_historique_365d.checked = true;
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        };
    }

    // Pas de temps Button handlers setup
    btn_pas_de_temps_2min.onclick = function () {
        pas_de_temps_chart = 'brute';
        pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
        btn_pas_de_temps_2min.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };
    btn_pas_de_temps_qh.onclick = function () {
        pas_de_temps_chart = 'quart-horaire';
        pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
        btn_pas_de_temps_qh.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };
    btn_pas_de_temps_h.onclick = function () {
        pas_de_temps_chart = 'horaire';
        pas_de_temps_buttons.forEach((btn) => (btn.checked = false));
        btn_pas_de_temps_h.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };
    btn_pas_de_temps_d.disabled = true;

    btn_poluant_pm1.onclick = function () {
        if (mesures_array.includes('pm1')) {
            // Remove pm1 from array
            mesures_array = mesures_array.filter((item) => item !== 'pm1');
            btn_poluant_pm1.checked = false;
        } else {
            // Add pm1 to array
            mesures_array.push('pm1');
            btn_poluant_pm1.checked = true;
        }
        // check if custom histoical date or nah before retreive_historiqueData_microStation
        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var startTime = '00:00';
            var endDate = btn_historique_end_date.value;
            var endTime = '23:59';
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
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    btn_poluant_pm25.onclick = function () {
        if (mesures_array.includes('pm2.5')) {
            mesures_array = mesures_array.filter((item) => item !== 'pm2.5');
            btn_poluant_pm25.checked = false;
        } else {
            mesures_array.push('pm2.5');
            btn_poluant_pm25.checked = true;
        }
        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var startTime = '00:00';
            var endDate = btn_historique_end_date.value;
            var endTime = '23:59';
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
            console.log(data);
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    btn_poluant_pm10.onclick = function () {
        if (mesures_array.includes('pm10')) {
            mesures_array = mesures_array.filter((item) => item !== 'pm10');
            btn_poluant_pm10.checked = false;
        } else {
            mesures_array.push('pm10');
            btn_poluant_pm10.checked = true;
        }
        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var startTime = '00:00';
            var endDate = btn_historique_end_date.value;
            var endTime = '23:59';
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
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    btn_poluant_no2.onclick = function () {
        if (mesures_array.includes('no2')) {
            mesures_array = mesures_array.filter((item) => item !== 'no2');
            btn_poluant_no2.checked = false;
        } else {
            mesures_array.push('no2');
            btn_poluant_no2.checked = true;
        }
        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var startTime = '00:00';
            var endDate = btn_historique_end_date.value;
            var endTime = '23:59';
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
            retreive_historiqueData_microStation(
                data.id_site,
                pas_de_temps_chart,
                historique_chart,
                mesures_array
            );
        }
    };

    openSidePanelGeneric();
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
    console.log('retreiving data for:', {
        sensorId: sensorId,
        pas_de_temps: pas_de_temps,
        historique: historique,
        mesures_array: mesures_array,
        add_mesure: add_mesure,
    });

    const start = Date.now();
    document.getElementById('chartdiv_sensor').innerHTML = '';

    // Convert historique string to number of hours
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

    console.log('hours: ' + hours);

    const end_date = custom_end || new Date().toISOString();
    const start_date =
        custom_start ||
        new Date(Date.now() - hours * 3600 * 1000).toISOString();

    // Construire l'URL en fonction du pas de temps
    let full_url = `https://api.atmosud.org/observations/capteurs/mesures?
        debut=${start_date}
        &fin=${end_date}
        &id_site=${sensorId}
        &format=json
        &download=false
        &nb_dec=0
        &valeur_brute=true
        &variable=${mesures_array}
        &aggregation=${pas_de_temps}
        &type_capteur=true`.replace(/\s+/g, '');
    console.log('URL complète:', full_url);

    $.ajax({
        method: 'GET',
        url: full_url,
        success: function (data) {
            const requestTimer = (Date.now() - start) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log(data);

            if (amchart_root != undefined) {
                amchart_root.dispose();
            }
            var baseInterval_timeUnit_local;
            var baseInterval_count;
            if (
                pas_de_temps == '2m' ||
                pas_de_temps == '2min' ||
                pas_de_temps == 'brute'
            ) {
                baseInterval_timeUnit_local = 'minute';
                baseInterval_count = 2;
            }
            if (
                pas_de_temps == '15m' ||
                pas_de_temps == 'qh' ||
                pas_de_temps == 'quart-horaire'
            ) {
                baseInterval_timeUnit_local = 'minute';
                baseInterval_count = 15;
            }
            if (
                pas_de_temps == '1h' ||
                pas_de_temps == 'h' ||
                pas_de_temps == 'horaire'
            ) {
                baseInterval_timeUnit_local = 'hour';
                baseInterval_count = 1;
            }
            if (
                pas_de_temps == '24h' ||
                pas_de_temps == '1d' ||
                pas_de_temps == 'journalier'
            ) {
                baseInterval_timeUnit_local = 'day';
                baseInterval_count = 1;
            }

            am5.ready(function () {
                // Group data by variable
                let seriesData = {};
                data.forEach((item) => {
                    const variable = item.variable;
                    if (!seriesData[variable]) {
                        seriesData[variable] = {
                            corrected: [], // valeur_ref quand valeur n'est pas null
                            raw: [], // valeur_ref quand valeur est null
                        };
                    }

                    // Vérifier si la donnée est corrigée ou non
                    if (item.valeur !== null) {
                        // Donnée corrigée
                        seriesData[variable].corrected.push({
                            value: item.valeur_ref,
                            date: new Date(item.time).getTime(),
                        });
                    } else {
                        // Donnée non corrigée (brute)
                        seriesData[variable].raw.push({
                            value: item.valeur_ref,
                            date: new Date(item.time).getTime(),
                        });
                    }
                });

                amchart_root = am5.Root.new('chartdiv_sensor');

                let chart = amchart_root.container.children.push(
                    am5xy.XYChart.new(amchart_root, {
                        panX: false,
                        panY: false,
                        wheelX: 'panX',
                        wheelY: 'zoomX',
                        paddingLeft: 0,
                    })
                );

                let xAxis = chart.xAxes.push(
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

                let yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(amchart_root, {
                        renderer: am5xy.AxisRendererY.new(amchart_root, {}),
                    })
                );

                let cursor = chart.set(
                    'cursor',
                    am5xy.XYCursor.new(amchart_root, {
                        behavior: 'zoomX',
                        xAxis: xAxis,
                        yAxis: yAxis,
                    })
                );
                cursor.lineY.set('visible', false);

                // Définir les couleurs pour les polluants
                const pollutantColors = {
                    pm1: '#FF5733', // Orange
                    'pm2.5': '#33A1FF', // Bleu
                    pm10: '#33FF57', // Vert
                    no2: '#A133FF', // Violet
                };

                // Créer une série pour chaque variable dans les données
                Object.keys(seriesData).forEach((variable) => {
                    // Convertir le nom du polluant pour correspondre aux couleurs des marqueurs
                    let colorKey = variable;
                    if (variable === 'pm2.5') {
                        colorKey = 'pm25';
                    }
                    const color = pollutantColors[colorKey] || '#000000';

                    // Série pour les données corrigées
                    if (seriesData[variable].corrected.length > 0) {
                        let series = chart.series.push(
                            am5xy.SmoothedXLineSeries.new(amchart_root, {
                                name: variable.toUpperCase() + ' (corrigé)',
                                xAxis: xAxis,
                                yAxis: yAxis,
                                valueYField: 'value',
                                valueXField: 'date',
                                tooltip: am5.Tooltip.new(amchart_root, {
                                    labelText: `${variable.toUpperCase()}: {valueY} µg/m³ (donnée corrigée)`,
                                }),
                            })
                        );

                        series.strokes.template.setAll({
                            strokeWidth: 2,
                            stroke: am5.color(color),
                        });

                        series.data.setAll(seriesData[variable].corrected);
                        series.appear(1000);
                    }

                    // Série pour les données non corrigées (brutes)
                    if (seriesData[variable].raw.length > 0) {
                        let series = chart.series.push(
                            am5xy.SmoothedXLineSeries.new(amchart_root, {
                                name: variable.toUpperCase() + ' (brut)',
                                xAxis: xAxis,
                                yAxis: yAxis,
                                valueYField: 'value',
                                valueXField: 'date',
                                tooltip: am5.Tooltip.new(amchart_root, {
                                    labelText: `${variable.toUpperCase()}: {valueY} µg/m³ (donnée brute)`,
                                }),
                            })
                        );

                        series.strokes.template.setAll({
                            strokeWidth: 2,
                            stroke: am5.color(color),
                            strokeDasharray: [10, 5],
                        });

                        series.data.setAll(seriesData[variable].raw);
                        series.appear(1000);
                    }
                });

                // Ajouter une légende en dessous du graphique
                let legend = chart.children.push(
                    am5.Legend.new(amchart_root, {
                        centerX: am5.percent(50),
                        x: am5.percent(50),
                        layout: am5.GridLayout.new(amchart_root, {
                            maxColumns: 2,
                            fixedWidthGrid: true,
                        }),
                    })
                );

                legend.data.setAll(chart.series.values);

                chart.appear(1000, 100);
            });
            // Activer l'exportation avec plusieurs formats
            let exporting = am5plugins_exporting.Exporting.new(amchart_root, {
                menu: am5plugins_exporting.ExportingMenu.new(amchart_root, {}),
                filePrefix: 'historique_data', // Nom du fichier téléchargé
                dataSource: data, // Utilisation des données récupérées pour l'export
            });
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    });
}

// Exporter les variables qui pourraient être nécessaires ailleurs
export { pas_de_temps_chart, historique_chart, mesures_array };
