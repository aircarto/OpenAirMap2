/*
Récupération des données des micro stations
-> API ATMOSUD "OBSERVATIONS/CAPTEURS/DERNIERES"
-> Ou plutot "OBSERVATIONS/CAPTEURS/SITES"

En réponse on a:

valeur          valeur corrigée
valeur_brute    valeur brute
valeur_ref      valeur corrigée si existe sinon valeur brute

*/

function load_atmoSud_microStations() {
    console.log(
        '%cload_atmoSud_microStations',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const start = Date.now();
    //need to switch pas de temps: d->journalier h->horaire qh -> quart horaire
    atmo_micro_layer.clearLayers();
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
            let filteredData = data;
            if (pas_de_temps[0] === '2min') {
                filteredData = data.filter(
                    (item) => item.modele_capteur === 'NebuleAir'
                );
                console.log(filteredData);
                console.warn(
                    'Uniquement micro-stations NebuleAir pour le pas de temps ' +
                        pas_de_temps
                );
            }
            $.each(filteredData, function (key, value) {
                // ICONE
                var icon_param = {
                    iconUrl:
                        'img/microStationsAtmoSud/microStationAtmoSud_default.png',
                    iconSize: [50, 50],
                    iconAnchor: [5, 40],
                    popupAnchor: [0, -10],
                    tooltipAnchor: [-50, -10],
                };

                // Changement d'icône selon la mesure et la valeur brute
                console.log('##################################');
                console.log(mesures);

                // Use the helper functions from app.js instead of duplicating the logic
                let valueToCheck = value['valeur_brute'];
                let colorCode = getColorCodeForValue(valueToCheck, mesures[0]);

                // Set the icon URL based on the color code
                if (colorCode !== 'default') {
                    icon_param.iconUrl =
                        'img/microStationsAtmoSud/microStationAtmoSud_' +
                        colorCode +
                        '.png';
                }

                console.log(
                    icon_param.iconUrl,
                    Math.round(parseFloat(valueToCheck))
                );

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
                            pas_de_temps_atmo,
                            '24h',
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
            //ajouter la layer sur la carte
            map.addLayer(atmo_micro_layer);
        }, //end ajax sucess
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    }); //end ajax
}

function openSidePanel_microStation(
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
    mesures_array.length = 0;
    if (Array.isArray(mesures_atmo)) {
        mesures_atmo.forEach((measure) => mesures_array.push(measure));
    } else {
        // If it's a single value, push it directly
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

    if (btn_poluant_no2.disabled) {
        btn_poluant_no2.disabled = false;
    }
    console.log('mesures atmo', mesures_atmo);
    //on met les boutons des filtres à jour
    btn_historique = document.getElementById('btn_historique_' + historique);
    btn_historique.checked = true;
    btn_pas_de_temps = document.getElementById(
        'btn_pas_de_temps_' + pas_de_temps[pas_de_temps_atmo].code
    );
    btn_pas_de_temps.checked = true;
    btn_mesure = document.getElementById(
        'btn_poluant_' + mesures[mesures_atmo[0].toUpperCase()].code
    );
    btn_mesure.checked = true;

    console.log('openSidePanel_microStation');

    mesures_array.length = 0;
    mesures_array.push(mesures_atmo);

    retreive_historiqueData_microStation(
        data.id_site,
        pas_de_temps_atmo,
        historique,
        mesures_array
    );

    card1_img.src = 'img/microStationsAtmoSud/microStationAtmoSud_default.png';
    card1_title.innerHTML = data.nom_site;
    card1_subtitle.innerHTML = 'Micro-station AtmoSud';
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
    btn_historique_1sem.onclick = function () {
        historique_chart = '7d';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_1sem.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };
    btn_historique_1m.onclick = function () {
        historique_chart = '30d';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_1m.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };
    btn_historique_1a.onclick = function () {
        historique_chart = '365d';
        historique_buttons.forEach((btn) => (btn.checked = false));
        btn_historique_1a.checked = true;
        retreive_historiqueData_microStation(
            data.id_site,
            pas_de_temps_chart,
            historique_chart,
            mesures_array
        );
    };

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
            var startTime = btn_historique_start_time.value;
            var endDate = btn_historique_end_date.value;
            var endTime = btn_historique_end_time.value;
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
            var startTime = btn_historique_start_time.value;
            var endDate = btn_historique_end_date.value;
            var endTime = btn_historique_end_time.value;
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
            var startTime = btn_historique_start_time.value;
            var endDate = btn_historique_end_date.value;
            var endTime = btn_historique_end_time.value;
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
            var startTime = btn_historique_start_time.value;
            var endDate = btn_historique_end_date.value;
            var endTime = btn_historique_end_time.value;
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

    openSidePanel_generic();
}

function retreive_historiqueData_microStation(
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

    // if (add_mesure) {
    //     mesures_array.push(mesure);
    // }

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
    // switch (pas_de_temps) {
    //     case "brute": pas_de_temps = "none"; break;
    //     case "quart-horaire": pas_de_temps = "quart-horaire"; break;
    //     case "horaire": pas_de_temps = "horaire"; break;
    //     case "journalier": pas_de_temps = "journalier"; break;
    //     default: pas_de_temps = "none";
    // }
    console.log('hours: ' + hours);

    const end_date = custom_end || new Date().toISOString();
    const start_date =
        custom_start ||
        new Date(Date.now() - hours * 3600 * 1000).toISOString();

    let full_url = `https://api.atmosud.org/observations/capteurs/mesures?
        debut=${start_date}
        &fin=${end_date}
        &id_site=${sensorId}
        &format=json
        &download=false
        &nb_dec=0
        &valeur_brute=true
        &variable=${mesures_array.join(',')}
        &aggregation=${pas_de_temps}
        &type_capteur=true`.replace(/\s+/g, '');
    console.log(full_url);

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
                        seriesData[variable] = [];
                    }
                    seriesData[variable].push({
                        value: item.valeur_ref,
                        date: new Date(item.time).getTime(),
                    });
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

                let cursor = chart.set(
                    'cursor',
                    am5xy.XYCursor.new(amchart_root, {
                        behavior: 'zoomX',
                    })
                );
                cursor.lineY.set('visible', false);

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

                // Create a series for each variable in the data
                Object.keys(seriesData).forEach((variable) => {
                    let series = chart.series.push(
                        am5xy.SmoothedXLineSeries.new(amchart_root, {
                            name: variable.toUpperCase(),
                            xAxis: xAxis,
                            yAxis: yAxis,
                            valueYField: 'value',
                            valueXField: 'date',
                            tooltip: am5.Tooltip.new(amchart_root, {
                                labelText: `${variable.toUpperCase()}: {valueY} µg/m³ ${data.find((item) => item.variable === variable).valeur === null ? '(donnée brute)' : '(donnée corrigée)'}`,
                            }),
                        })
                    );

                    series.strokes.template.setAll({
                        strokeWidth: 2,
                    });

                    series.data.setAll(seriesData[variable]);
                    series.appear(1000);
                });

                chart.appear(1000, 100);
            });
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        },
    });
}
