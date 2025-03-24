import {
    formatString,
    getColorCodeForValue,
    formatPollutantName,
    getThresholdsForPollutant,
} from './utils.js';

// Variables locales au module
let mesures_array = [];
let historique_chart = '24h';
let pas_de_temps_chart = 'horaire';

/**
 * Charge les données des micro-stations AtmoSud
 * @param {Object} dependencies - Dépendances nécessaires
 */
export function loadAtmoSudMicroStations(dependencies) {
    const {
        atmoMicroLayer,
        getArrayFromLocalStorage,
        pasDeTempsLocal,
        mesuresLocal,
        map,
        deviceInfo,
        // Récupérez les références aux variables globales
        globalSelectedMarker,
        globalSelectedText,
        globalSelectedDeviceId,
        // Récupérez les fonctions pour mettre à jour les variables globales
        setGlobalSelectedMarker,
        setGlobalSelectedText,
        setGlobalSelectedDeviceId,
        formatString,
        getColorCodeForValue,
        openSidePanelMicroStation,
    } = dependencies;

    console.log(
        '%cloadAtmoSudMicroStations',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const START_TIME = Date.now();

    atmoMicroLayer.clearLayers();
    const pasDeTemps = getArrayFromLocalStorage(pasDeTempsLocal);
    console.log('pasDeTemps', pasDeTemps);
    let pasDeTempsAtmo = '';
    switch (pasDeTemps[0]) {
        case '2min':
            pasDeTempsAtmo = 'brute';
            break;
        case 'qh':
            pasDeTempsAtmo = 'quart-horaire';
            break;
        case 'h':
            pasDeTempsAtmo = 'horaire';
            break;
        case 'd':
            pasDeTempsAtmo = 'journalier';
            break;
    }

    const mesures = getArrayFromLocalStorage(mesuresLocal);
    const selectedMeasure = mesures[0];
    const selectedMeasureAtmo =
        selectedMeasure === 'pm25' ? 'pm2.5' : selectedMeasure;

    const ALL_POLLUTANTS = ['pm1', 'pm2.5', 'pm10', 'no2'];

    if (pasDeTemps[0] === 'd') {
        alert('Pas de données pour le pas de temps ' + pasDeTemps);
        return;
    }

    console.log('Pas de temps : ' + pasDeTemps);
    console.log('Pas de temps Atmo: ' + pasDeTempsAtmo);
    console.log('Mesure sélectionnée : ' + selectedMeasure);
    console.log('Tous les polluants demandés : ' + ALL_POLLUTANTS);

    const FULL_URL_DERNIERE = `
    https://api.atmosud.org/observations/capteurs/mesures/dernieres?
    format=json
    &download=false
    &valeur_brute=true
    &type_capteur=true
    &variable=${ALL_POLLUTANTS.join(',')}
    &aggregation=${pasDeTempsAtmo}
    &nb_dec=1
    `.replace(/\s+/g, '');

    $.ajax({
        method: 'GET',
        url: FULL_URL_DERNIERE,
        success: function handleApiSuccess(data) {
            console.log(FULL_URL_DERNIERE);
            console.log(data);
            const endTime = Date.now();
            const requestTimer = (endTime - START_TIME) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );

            let siteData = {};
            data.forEach((item) => {
                if (!siteData[item.id_site]) {
                    siteData[item.id_site] = {
                        siteInfo: {
                            idSite: item.id_site,
                            nomSite: item.nom_site,
                            lat: item.lat,
                            lon: item.lon,
                            modeleCapteur: item.modele_capteur,
                        },
                        pollutants: {},
                    };
                }
                siteData[item.id_site].pollutants[item.variable] = item;
            });

            console.log('Données organisées par site:', siteData);

            let filteredSites = Object.values(siteData).filter((site) => {
                return Object.keys(site.pollutants).some(
                    (key) =>
                        key.toLowerCase() === selectedMeasureAtmo.toLowerCase()
                );
            });

            if (pasDeTemps[0] === '2min') {
                filteredSites = filteredSites.filter(
                    (site) => site.siteInfo.modeleCapteur === 'NebuleAir'
                );
                console.warn(
                    'Uniquement micro-stations NebuleAir pour le pas de temps ' +
                        pasDeTemps
                );
            }

            console.log(
                'Sites filtrés pour le polluant ' + selectedMeasureAtmo + ':',
                filteredSites
            );

            filteredSites.forEach((site) => {
                let value = site.pollutants[selectedMeasureAtmo.toUpperCase()];

                const ICON_PARAMS = {
                    iconUrl:
                        'img/microStationsAtmoSud/microStationAtmoSud_default.png',
                    iconSize: [50, 50],
                    iconAnchor: [5, 40],
                    popupAnchor: [0, -10],
                    tooltipAnchor: [-50, -10],
                };

                let valueToCheck = value['valeur_brute'];
                let colorCode = getColorCodeForValue(
                    valueToCheck,
                    selectedMeasure
                );

                if (colorCode !== 'default') {
                    ICON_PARAMS.iconUrl =
                        'img/microStationsAtmoSud/microStationAtmoSud_' +
                        colorCode +
                        '.png';
                }

                const microStationIcon = L.icon(ICON_PARAMS);

                let microStationMarker = L.marker(
                    [site.siteInfo.lat, site.siteInfo.lon],
                    {
                        icon: microStationIcon,
                    }
                ).addTo(atmoMicroLayer);

                microStationMarker.deviceId = site.siteInfo.idSite;
                microStationMarker.deviceData = site;
                microStationMarker.allPollutantsData = site.pollutants;

                if (!window.deviceMarkers) window.deviceMarkers = {};
                window.deviceMarkers[site.siteInfo.idSite] = {
                    marker: microStationMarker,
                    data: value,
                    allPollutantsData: site.pollutants,
                    siteInfo: site.siteInfo,
                };

                let roundedValue = Math.round(
                    parseFloat(value['valeur_brute'])
                );
                let textSize = 32;
                let xPosition = -10;
                let yPosition = 41;

                if (roundedValue >= 10) {
                    textSize = 25;
                    xPosition = -5;
                    yPosition = 32;
                }
                if (roundedValue >= 100) {
                    textSize = 20;
                    xPosition = -4;
                    yPosition = 26;
                }

                const TEXT_PARAMS = L.divIcon({
                    className: 'my-div-icon',
                    html:
                        '<div id="textDiv" style="font-size: ' +
                        textSize +
                        'px;">' +
                        roundedValue +
                        '</div>',
                    iconAnchor: [xPosition, yPosition],
                    popupAnchor: [30, -60],
                });

                let textMarker = L.marker(
                    [site.siteInfo.lat, site.siteInfo.lon],
                    {
                        icon: TEXT_PARAMS,
                    }
                )
                    .on('click', function handleMarkerClick() {
                        // Utilisez les variables globales via window
                        if (
                            window.globalSelectedMarker &&
                            window.globalSelectedMarker !== microStationMarker
                        ) {
                            window.globalSelectedMarker.setZIndexOffset(0);
                            window.globalSelectedMarker._icon.classList.remove(
                                'marker-selected'
                            );
                        }

                        if (
                            window.globalSelectedText &&
                            window.globalSelectedText !== textMarker
                        ) {
                            window.globalSelectedText.setZIndexOffset(0);
                            window.globalSelectedText._icon.classList.remove(
                                'marker-selected'
                            );
                        }

                        microStationMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        microStationMarker._icon.classList.add(
                            'marker-selected'
                        );
                        textMarker._icon.classList.add('marker-selected');

                        // Utilisez les fonctions de mise à jour
                        setGlobalSelectedMarker(microStationMarker);
                        setGlobalSelectedText(textMarker);
                        setGlobalSelectedDeviceId(site.siteInfo.idSite);

                        window.lastSelectedDeviceData = site;

                        console.log('Click on device: ' + site.siteInfo.idSite);
                        openSidePanelMicroStation(site, pasDeTempsAtmo, '24h', [
                            selectedMeasureAtmo,
                        ]);
                    })
                    .addTo(atmoMicroLayer);

                textMarker.deviceId = site.siteInfo.idSite;
                textMarker.deviceData = site;

                if (window.deviceMarkers[site.siteInfo.idSite]) {
                    window.deviceMarkers[site.siteInfo.idSite].textMarker =
                        textMarker;
                }

                function handleMarkerHighlight() {
                    microStationMarker.setZIndexOffset(1000);
                    textMarker.setZIndexOffset(1000);

                    let pollutantsHTML = '';
                    let availablePollutants = [];

                    if (site.pollutants) {
                        availablePollutants = Object.keys(site.pollutants);
                    } else if (site.allPollutantsData) {
                        availablePollutants = Object.keys(
                            site.allPollutantsData
                        );
                    } else if (
                        window.deviceMarkers &&
                        window.deviceMarkers[site.siteInfo.idSite] &&
                        window.deviceMarkers[site.siteInfo.idSite]
                            .allPollutantsData
                    ) {
                        availablePollutants = Object.keys(
                            window.deviceMarkers[site.siteInfo.idSite]
                                .allPollutantsData
                        );
                    }

                    if (availablePollutants.length > 0) {
                        pollutantsHTML =
                            '<div class="mt-2"><strong>Polluants mesurés:</strong>';
                        pollutantsHTML +=
                            '<ul class="list-unstyled mb-0 ps-2">';
                        availablePollutants.forEach((pollutant) => {
                            let formattedName = '';

                            switch (pollutant.toLowerCase()) {
                                case 'pm1':
                                    formattedName = 'PM1';
                                    break;
                                case 'pm2.5':
                                    formattedName = 'PM2.5';
                                    break;
                                case 'pm10':
                                    formattedName = 'PM10';
                                    break;
                                case 'no2':
                                    formattedName = 'NO₂';
                                    break;
                                default:
                                    formattedName = pollutant.toUpperCase();
                            }

                            const statusIndicator =
                                '<i class="bi bi-circle-fill text-success me-1" style="font-size: 0.6rem;"></i>';
                            pollutantsHTML += `<li>${statusIndicator}${formattedName}</li>`;
                        });

                        pollutantsHTML += '</ul></div>';
                    }

                    const nomSite = site.siteInfo
                        ? site.siteInfo.nomSite
                        : site.nomSite;
                    const modeleCapteur = site.siteInfo
                        ? site.siteInfo.modeleCapteur
                        : site.modeleCapteur;

                    deviceInfo._div.innerHTML = `
                            <div class="card border-0 shadow-sm">
                                <div class="card-body p-3">
                                    <h5 class="card-title mb-1">${formatString(nomSite)}</h5>
                                    <p class="card-text text-muted mb-2">Type: ${modeleCapteur}</p>
                                    ${pollutantsHTML}
                                    <div class="badge bg-success mt-2"><i class="bi bi-broadcast-pin me-1"></i>Capteur actif</div>
                                </div>
                            </div>
                        `;

                    deviceInfo._div.style.display = 'block';
                }

                function handleMarkerReset() {
                    // Utilisez window.globalSelectedMarker au lieu de globalSelectedMarker
                    if (window.globalSelectedMarker !== microStationMarker) {
                        microStationMarker.setZIndexOffset(0);
                        textMarker.setZIndexOffset(0);
                    }
                    deviceInfo._div.style.display = 'none';
                }

                microStationMarker
                    .on('mouseover', handleMarkerHighlight)
                    .on('mouseout', handleMarkerReset);
                textMarker
                    .on('mouseover', handleMarkerHighlight)
                    .on('mouseout', handleMarkerReset);
            });

            map.addLayer(atmoMicroLayer);
        },
        error: function handleApiError(xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    });
}

/**
 * Ouvre le panneau latéral pour afficher les détails d'une micro-station
 * @param {Object} data - Données de la station
 * @param {string} pasDeTempsAtmo - Pas de temps AtmoSud
 * @param {string} historique - Période d'historique
 * @param {Array|string} mesuresAtmo - Mesures à afficher
 * @param {Object} dependencies - Dépendances nécessaires
 */
export function openSidePanelMicroStation(
    data,
    pasDeTempsAtmo,
    historique,
    mesuresAtmo,
    dependencies
) {
    const {
        card1Img,
        card1Title,
        card1Subtitle,
        card1Text,
        card2Text,
        card2Link,
        btnHistoriqueCustom,
        btnHistoriqueStartDate,
        btnHistoriqueEndDate,
        btnPoluantPm1,
        btnPoluantPm25,
        btnPoluantPm10,
        btnPoluantNo2,
        btnHistorique1h,
        btnHistorique3h,
        btnHistorique24h,
        btnHistorique1sem,
        btnHistorique1m,
        btnHistorique1a,
        btnPasDeTemps2min,
        btnPasDeTempsQh,
        btnPasDeTempsH,
        btnPasDeTempsD,
        openSidePanelGeneric,
        pasDeTemps,
        am5,
        am5xy,
        am5pluginsExporting,
        amchartRoot,
    } = dependencies;

    // Gestion icone fermeture sidepanel
    const closeButton = document
        .getElementById('toggleSidePanel')
        .querySelector('i');
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');

    let mesuresArray = [];
    let historiqueChart = historique;
    let pasDeTempsChart = pasDeTempsAtmo;
    mesuresArray.length = 0;

    // Si mesuresAtmo est un tableau, ajouter chaque élément au tableau mesuresArray
    if (Array.isArray(mesuresAtmo)) {
        mesuresAtmo.forEach((measure) => mesuresArray.push(measure));
    } else {
        // Si mesuresAtmo n'est pas un tableau, ajouter la valeur à mesuresArray
        mesuresArray.push(mesuresAtmo);
    }

    //on réinitialise les boutons
    const historiqueButtons = document.querySelectorAll(
        '[id^="btn_historique_"]'
    );
    const pasDeTempsButtons = document.querySelectorAll(
        '[id^="btn_pas_de_temps_"]'
    );
    const polluantsButtons = document.querySelectorAll('[id^="btn_poluant_"]');

    historiqueButtons.forEach((btn) => (btn.checked = false));
    pasDeTempsButtons.forEach((btn) => (btn.checked = false));
    polluantsButtons.forEach((btn) => (btn.checked = false));

    // Désactiver tous les boutons de polluants par défaut
    btnPoluantPm1.disabled = true;
    btnPoluantPm25.disabled = true;
    btnPoluantPm10.disabled = true;
    btnPoluantNo2.disabled = true;

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
        btnPoluantPm1.disabled = false;
    }
    if (
        availablePollutants.includes('pm2.5') ||
        availablePollutants.includes('PM2.5')
    ) {
        btnPoluantPm25.disabled = false;
    }
    if (
        availablePollutants.includes('pm10') ||
        availablePollutants.includes('PM10')
    ) {
        btnPoluantPm10.disabled = false;
    }
    if (
        availablePollutants.includes('no2') ||
        availablePollutants.includes('NO2')
    ) {
        btnPoluantNo2.disabled = false;
    }

    console.log('mesures atmo', mesuresAtmo);
    //on met les boutons des filtres à jour
    const btnHistorique = document.getElementById(
        'btn_historique_' + historique
    );
    btnHistorique.checked = true;
    const btnPasDeTemps = document.getElementById(
        'btn_pas_de_temps_' + pasDeTemps[pasDeTempsAtmo].code
    );
    btnPasDeTemps.checked = true;

    // Sélectionner le bouton du polluant actif
    let activeMeasure = '';
    if (Array.isArray(mesuresAtmo)) {
        activeMeasure = mesuresAtmo[0];
    } else {
        activeMeasure = mesuresAtmo;
    }

    // Convertir pm25 en pm2.5 si nécessaire
    if (activeMeasure === 'pm25') {
        activeMeasure = 'pm2.5';
    }

    console.log('Polluant actif:', activeMeasure);

    if (activeMeasure === 'pm1' && !btnPoluantPm1.disabled) {
        btnPoluantPm1.checked = true;
        mesuresArray = ['pm1'];
    } else if (
        (activeMeasure === 'pm2.5' || activeMeasure === 'pm25') &&
        !btnPoluantPm25.disabled
    ) {
        btnPoluantPm25.checked = true;
        mesuresArray = ['pm2.5'];
    } else if (activeMeasure === 'pm10' && !btnPoluantPm10.disabled) {
        btnPoluantPm10.checked = true;
        mesuresArray = ['pm10'];
    } else if (activeMeasure === 'no2' && !btnPoluantNo2.disabled) {
        btnPoluantNo2.checked = true;
        mesuresArray = ['no2'];
    } else {
        // Si le polluant actif n'est pas disponible, sélectionner le premier disponible
        if (!btnPoluantPm25.disabled) {
            btnPoluantPm25.checked = true;
            mesuresArray = ['pm2.5'];
        } else if (!btnPoluantPm10.disabled) {
            btnPoluantPm10.checked = true;
            mesuresArray = ['pm10'];
        } else if (!btnPoluantPm1.disabled) {
            btnPoluantPm1.checked = true;
            mesuresArray = ['pm1'];
        } else if (!btnPoluantNo2.disabled) {
            btnPoluantNo2.checked = true;
            mesuresArray = ['no2'];
        }
    }
    console.log('openSidePanel_microStation');
    console.log('mesuresArray après sélection:', mesuresArray);

    // Déterminer l'ID du site à utiliser
    const siteId = data.siteInfo ? data.siteInfo.idSite : data.idSite;

    // Utiliser l'ID du site pour récupérer les données historiques
    retreiveHistoriqueDataMicroStation(
        siteId,
        pasDeTempsAtmo,
        historique,
        mesuresArray,
        false,
        null,
        null,
        dependencies
    );

    // Mettre à jour les informations de la carte
    card1Img.src = 'img/microStationsAtmoSud/microStationAtmoSud_default.png';
    card1Title.innerHTML = data.siteInfo.nomSite;
    card1Subtitle.innerHTML =
        'Micro-station AtmoSud - ' + data.siteInfo.modeleCapteur;
    card1Text.innerHTML = '';

    card2Text.innerHTML =
        "Les micro-stations sont des capteurs de mesure de la qualité de l'air déployés par AtmoSud pour compléter le réseau de stations de référence.";
    card2Link.innerHTML = 'AtmoSud.org';
    card2Link.href = 'https://www.atmosud.org';

    // Historique Button handlers setup
    btnHistoriqueCustom.onclick = function (event) {
        event.preventDefault();
        const startDate = btnHistoriqueStartDate.value;
        const endDate = btnHistoriqueEndDate.value;
        const START_TIME = '00:00';
        const END_TIME = '23:59';
        console.log({
            startDate: startDate,
            startTime: START_TIME,
            endDate: endDate,
            endTime: END_TIME,
        });
        if (startDate && START_TIME && endDate && END_TIME) {
            historiqueButtons.forEach((btn) => (btn.checked = false));
            btnHistoriqueCustom.checked = true;

            let startDateTime = new Date(
                `${startDate}T${START_TIME}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${END_TIME}`).toISOString();

            console.log(
                'Date de début:',
                startDateTime,
                'Date de fin:',
                endDateTime
            );
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                null,
                mesuresArray,
                false,
                startDateTime,
                endDateTime,
                dependencies
            );
        } else {
            alert(
                'Veuillez sélectionner une date et une heure de début et de fin.'
            );
        }
    };

    btnHistorique1h.onclick = function () {
        historiqueChart = '1h';
        historiqueButtons.forEach((btn) => (btn.checked = false));
        btnHistorique1h.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };
    btnHistorique3h.onclick = function () {
        historiqueChart = '3h';
        historiqueButtons.forEach((btn) => (btn.checked = false));
        btnHistorique3h.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };
    btnHistorique24h.onclick = function () {
        historiqueChart = '24h';
        historiqueButtons.forEach((btn) => (btn.checked = false));
        btnHistorique24h.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };
    btnHistorique1sem.onclick = function () {
        historiqueChart = '7d';
        historiqueButtons.forEach((btn) => (btn.checked = false));
        btnHistorique1sem.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };
    btnHistorique1m.onclick = function () {
        historiqueChart = '30d';
        historiqueButtons.forEach((btn) => (btn.checked = false));
        btnHistorique1m.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };
    btnHistorique1a.onclick = function () {
        historiqueChart = '365d';
        historiqueButtons.forEach((btn) => (btn.checked = false));
        btnHistorique1a.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };

    // Pas de temps Button handlers setup
    btnPasDeTemps2min.onclick = function () {
        pasDeTempsChart = 'brute';
        pasDeTempsButtons.forEach((btn) => (btn.checked = false));
        btnPasDeTemps2min.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };
    btnPasDeTempsQh.onclick = function () {
        pasDeTempsChart = 'quart-horaire';
        pasDeTempsButtons.forEach((btn) => (btn.checked = false));
        btnPasDeTempsQh.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };
    btnPasDeTempsH.onclick = function () {
        pasDeTempsChart = 'horaire';
        pasDeTempsButtons.forEach((btn) => (btn.checked = false));
        btnPasDeTempsH.checked = true;
        retreiveHistoriqueDataMicroStation(
            data.siteInfo.idSite,
            pasDeTempsChart,
            historiqueChart,
            mesuresArray,
            false,
            null,
            null,
            dependencies
        );
    };
    btnPasDeTempsD.disabled = true;

    btnPoluantPm1.onclick = function () {
        if (mesuresArray.includes('pm1')) {
            mesuresArray = mesuresArray.filter((item) => item !== 'pm1');
            btnPoluantPm1.checked = false;
        } else {
            mesuresArray.push('pm1');
            btnPoluantPm1.checked = true;
        }
        if (btnHistoriqueCustom.checked) {
            const startDate = btnHistoriqueStartDate.value;
            const START_TIME = '00:00';
            const endDate = btnHistoriqueEndDate.value;
            const END_TIME = '23:59';
            let startDateTime = new Date(
                `${startDate}T${START_TIME}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${END_TIME}`).toISOString();
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                null,
                mesuresArray,
                false,
                startDateTime,
                endDateTime,
                dependencies
            );
        } else {
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                historiqueChart,
                mesuresArray,
                false,
                null,
                null,
                dependencies
            );
        }
    };

    btnPoluantPm25.onclick = function () {
        if (mesuresArray.includes('pm2.5')) {
            mesuresArray = mesuresArray.filter((item) => item !== 'pm2.5');
            btnPoluantPm25.checked = false;
        } else {
            mesuresArray.push('pm2.5');
            btnPoluantPm25.checked = true;
        }
        if (btnHistoriqueCustom.checked) {
            const startDate = btnHistoriqueStartDate.value;
            const START_TIME = '00:00';
            const endDate = btnHistoriqueEndDate.value;
            const END_TIME = '23:59';
            let startDateTime = new Date(
                `${startDate}T${START_TIME}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${END_TIME}`).toISOString();
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                null,
                mesuresArray,
                false,
                startDateTime,
                endDateTime,
                dependencies
            );
        } else {
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                historiqueChart,
                mesuresArray,
                false,
                null,
                null,
                dependencies
            );
        }
    };

    btnPoluantPm10.onclick = function () {
        if (mesuresArray.includes('pm10')) {
            mesuresArray = mesuresArray.filter((item) => item !== 'pm10');
            btnPoluantPm10.checked = false;
        } else {
            mesuresArray.push('pm10');
            btnPoluantPm10.checked = true;
        }
        if (btnHistoriqueCustom.checked) {
            const startDate = btnHistoriqueStartDate.value;
            const START_TIME = '00:00';
            const endDate = btnHistoriqueEndDate.value;
            const END_TIME = '23:59';
            let startDateTime = new Date(
                `${startDate}T${START_TIME}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${END_TIME}`).toISOString();
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                null,
                mesuresArray,
                false,
                startDateTime,
                endDateTime,
                dependencies
            );
        } else {
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                historiqueChart,
                mesuresArray,
                false,
                null,
                null,
                dependencies
            );
        }
    };

    btnPoluantNo2.onclick = function () {
        if (mesuresArray.includes('no2')) {
            mesuresArray = mesuresArray.filter((item) => item !== 'no2');
            btnPoluantNo2.checked = false;
        } else {
            mesuresArray.push('no2');
            btnPoluantNo2.checked = true;
        }
        if (btnHistoriqueCustom.checked) {
            const startDate = btnHistoriqueStartDate.value;
            const START_TIME = '00:00';
            const endDate = btnHistoriqueEndDate.value;
            const END_TIME = '23:59';
            let startDateTime = new Date(
                `${startDate}T${START_TIME}`
            ).toISOString();
            let endDateTime = new Date(`${endDate}T${END_TIME}`).toISOString();
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                null,
                mesuresArray,
                false,
                startDateTime,
                endDateTime,
                dependencies
            );
        } else {
            retreiveHistoriqueDataMicroStation(
                data.siteInfo.idSite,
                pasDeTempsChart,
                historiqueChart,
                mesuresArray,
                false,
                null,
                null,
                dependencies
            );
        }
    };

    openSidePanelGeneric();
}
/**
 * Récupère les données historiques pour une micro-station
 * @param {string} sensorId - ID de la station
 * @param {string} pasDeTemps - Pas de temps des données
 * @param {string} historique - Période d'historique
 * @param {Array} mesuresArray - Tableau des mesures à afficher
 * @param {boolean} addMesure - Indique s'il faut ajouter une mesure
 * @param {string} customStart - Date de début personnalisée
 * @param {string} customEnd - Date de fin personnalisée
 * @param {Object} dependencies - Dépendances nécessaires
 */
export function retreiveHistoriqueDataMicroStation(
    sensorId,
    pasDeTemps,
    historique,
    mesuresArray,
    addMesure = false,
    customStart = null,
    customEnd = null,
    dependencies
) {
    const { am5, am5xy, am5plugins_exporting } = dependencies;

    console.log('retreiving data for:', {
        sensorId: sensorId,
        pasDeTemps: pasDeTemps,
        historique: historique,
        mesuresArray: mesuresArray,
        addMesure: addMesure,
    });

    const START = Date.now();
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

    const endDate = customEnd || new Date().toISOString();
    const startDate =
        customStart || new Date(Date.now() - hours * 3600 * 1000).toISOString();

    let fullUrl = `https://api.atmosud.org/observations/capteurs/mesures?
        debut=${startDate}
        &fin=${endDate}
        &id_site=${sensorId}
        &format=json
        &download=false
        &nb_dec=0
        &valeur_brute=true
        &variable=${mesuresArray}
        &aggregation=${pasDeTemps}
        &type_capteur=true`.replace(/\s+/g, '');
    console.log(fullUrl);

    $.ajax({
        method: 'GET',
        url: fullUrl,
        success: function (data) {
            const requestTimer = (Date.now() - START) / 1000;
            console.log(
                `Data gathered in %c${requestTimer} sec`,
                'color: red;'
            );
            console.log(data);

            // Référence à la variable amchartRoot depuis les dépendances
            if (dependencies.amchartRoot != undefined) {
                dependencies.amchartRoot.dispose();
            }

            var baseIntervalTimeUnitLocal;
            var baseIntervalCount;
            if (
                pasDeTemps == '2m' ||
                pasDeTemps == '2min' ||
                pasDeTemps == 'brute'
            ) {
                baseIntervalTimeUnitLocal = 'minute';
                baseIntervalCount = 2;
            }
            if (
                pasDeTemps == '15m' ||
                pasDeTemps == 'qh' ||
                pasDeTemps == 'quart-horaire'
            ) {
                baseIntervalTimeUnitLocal = 'minute';
                baseIntervalCount = 15;
            }
            if (
                pasDeTemps == '1h' ||
                pasDeTemps == 'h' ||
                pasDeTemps == 'horaire'
            ) {
                baseIntervalTimeUnitLocal = 'hour';
                baseIntervalCount = 1;
            }
            if (
                pasDeTemps == '24h' ||
                pasDeTemps == '1d' ||
                pasDeTemps == 'journalier'
            ) {
                baseIntervalTimeUnitLocal = 'day';
                baseIntervalCount = 1;
            }

            am5.ready(function () {
                // Group data by variable
                let seriesData = {};
                data.forEach((item) => {
                    const variable = item.variable;
                    if (!seriesData[variable]) {
                        seriesData[variable] = [];
                    }
                    seriesData[variable].push({
                        value: item.valeur_ref,
                        date: new Date(item.time).getTime(),
                    });
                });

                // Créer une nouvelle instance de root et la stocker dans les dépendances
                dependencies.amchartRoot = am5.Root.new('chartdiv_sensor');

                let chart = dependencies.amchartRoot.container.children.push(
                    am5xy.XYChart.new(dependencies.amchartRoot, {
                        panX: false,
                        panY: false,
                        wheelX: 'panX',
                        wheelY: 'zoomX',
                        paddingLeft: 0,
                    })
                );

                let cursor = chart.set(
                    'cursor',
                    am5xy.XYCursor.new(dependencies.amchartRoot, {
                        behavior: 'zoomX',
                    })
                );
                cursor.lineY.set('visible', false);

                let xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(dependencies.amchartRoot, {
                        maxDeviation: 0.2,
                        baseInterval: {
                            timeUnit: baseIntervalTimeUnitLocal,
                            count: baseIntervalCount,
                        },
                        renderer: am5xy.AxisRendererX.new(
                            dependencies.amchartRoot,
                            {
                                minorGridEnabled: true,
                            }
                        ),
                        tooltip: am5.Tooltip.new(dependencies.amchartRoot, {}),
                    })
                );

                let yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(dependencies.amchartRoot, {
                        renderer: am5xy.AxisRendererY.new(
                            dependencies.amchartRoot,
                            {}
                        ),
                    })
                );

                // Create a series for each variable in the data
                Object.keys(seriesData).forEach((variable) => {
                    let series = chart.series.push(
                        am5xy.SmoothedXLineSeries.new(
                            dependencies.amchartRoot,
                            {
                                name: variable.toUpperCase(),
                                xAxis: xAxis,
                                yAxis: yAxis,
                                valueYField: 'value',
                                valueXField: 'date',
                                tooltip: am5.Tooltip.new(
                                    dependencies.amchartRoot,
                                    {
                                        labelText: `${variable.toUpperCase()}: {valueY} µg/m³ ${data.find((item) => item.variable === variable).valeur === null ? '(donnée brute)' : '(donnée corrigée)'}`,
                                    }
                                ),
                            }
                        )
                    );

                    series.strokes.template.setAll({
                        strokeWidth: 1,
                    });

                    series.data.setAll(seriesData[variable]);
                    series.appear(1000);
                });

                chart.appear(1000, 100);
            });

            // Activer l'exportation avec plusieurs formats
            let exporting = am5plugins_exporting.Exporting.new(
                dependencies.amchartRoot,
                {
                    menu: am5plugins_exporting.ExportingMenu.new(
                        dependencies.amchartRoot,
                        {
                            items: [
                                {
                                    label: 'Télécharger',
                                    menu: [
                                        { type: 'png', label: 'Image (PNG)' },
                                        { type: 'jpg', label: 'Image (JPG)' },
                                        { type: 'csv', label: 'Données (CSV)' },
                                        {
                                            type: 'xlsx',
                                            label: 'Données (XLSX)',
                                        },
                                        {
                                            type: 'json',
                                            label: 'Données (JSON)',
                                        },
                                    ],
                                },
                            ],
                        }
                    ),
                    filePrefix: 'historique_data', // Nom du fichier téléchargé
                    dataSource: data, // Utilisation des données récupérées pour l'export
                }
            );
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    });
}
