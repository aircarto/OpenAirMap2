function formatMapData(data, pas_de_temps, polluant, source) {
    let formattedData = [];

    if (source === 'nebuleair') {
        // Format pour NebuleAir AirCarto
        formattedData = data.map((device) => {
            // Handle parameter names - check if using 2min format or with suffix
            let mesure_maj = polluant.toUpperCase();
            let paramName =
                pas_de_temps === '2min'
                    ? mesure_maj
                    : `${mesure_maj}_${pas_de_temps}`;

            return {
                id: device.sensorId,
                latitude: device.latitude,
                longitude: device.longitude,
                valeur_brute: parseFloat(device[paramName]),
                valeur_corrige: false, // NebuleAir doesn't seem to have corrected values
                source: 'nebuleair',
                mesure: polluant,
                pas_de_temps: pas_de_temps,
                plage_historique: '24h', // Default value, can be adjusted
                marque: 'AirCarto', // Based on common knowledge, adjust if needed
                modele: 'NebuleAir',
                date_derniere_mesure: device.timeUTC || device.time || false,
                id_campagne: false,
                date_mise_en_service: false,
                date_fin_de_service: false,
                type_connexion: false,
                type_alim: false,
                proprietaire: false,
                connected: device.connected,
                iconPrefix: 'img/nebuleair/nebuleAir_',
                rawDeviceData: device, // Store original data for side panel
                openSidePanelFunction: (rawData, pdt, timespan, mes) => {
                    openSidePanel_nebuleAir(rawData, pdt, timespan, mes);
                },
            };
        });
    } else if (source === 'atmosud_micro') {
        // Format pour micro-stations AtmoSud
        formattedData = data.map((device) => {
            return {
                id: device.id_site,
                latitude: device.lat,
                longitude: device.lon,
                valeur_brute: parseFloat(device.valeur_brute),
                valeur_corrige:
                    device.valeur !== null ? parseFloat(device.valeur) : false,
                source: 'atmosud_micro',
                mesure: device.variable
                    ? device.variable.toLowerCase()
                    : polluant,
                pas_de_temps: device.pas_de_temps
                    ? device.pas_de_temps.toString()
                    : pas_de_temps,
                plage_historique: '24h', // Default value, can be adjusted
                marque: device.marque_capteur || false,
                modele: device.modele_capteur || false,
                date_derniere_mesure: device.time || false,
                id_campagne: false, // AtmoSud data appears not to have this field
                date_mise_en_service: false,
                date_fin_de_service: false,
                type_connexion: false,
                type_alim: false,
                proprietaire: 'AtmoSud',
                connected: true, // AtmoSud devices are considered connected if data is returned
                iconPrefix: 'img/microStationsAtmoSud/microStationAtmoSud_',
                rawDeviceData: device, // Store original data for side panel
                openSidePanelFunction: (rawData, pdt, timespan, mes) => {
                    openSidePanel_microStation(rawData, timespan, pdt, mes);
                },
            };
        });

        // Filter NebuleAir devices for 2min data if needed
        if (pas_de_temps === '2min') {
            formattedData = formattedData.filter(
                (item) => item.modele === 'NebuleAir'
            );
        }
    }

    // Add color code based on pollution thresholds
    formattedData.forEach((device) => {
        // Set default icon
        device.iconUrl = `${device.iconPrefix}default.png`;

        if (device.connected) {
            let roundedValue = Math.round(device.valeur_brute);

            // Apply color coding by pollution level
            if (
                device.mesure === 'pm1' ||
                device.mesure === 'pm25' ||
                device.mesure === 'pm2.5'
            ) {
                for (let key in seuils_PM1_PM25) {
                    let code = seuils_PM1_PM25[key].code;
                    let min = seuils_PM1_PM25[key].min;
                    let max = seuils_PM1_PM25[key].max;

                    if (roundedValue >= min && roundedValue <= max) {
                        device.iconUrl = `${device.iconPrefix}${code}.png`;
                        break;
                    }
                }
            } else if (device.mesure === 'pm10') {
                for (let key in seuils_PM10) {
                    let code = seuils_PM10[key].code;
                    let min = seuils_PM10[key].min;
                    let max = seuils_PM10[key].max;

                    if (roundedValue >= min && roundedValue <= max) {
                        device.iconUrl = `${device.iconPrefix}${code}.png`;
                        break;
                    }
                }
            }

            // Calculate text size and position based on value
            device.textSize = 32;
            device.textXPosition = -10;
            device.textYPosition = 38;

            if (roundedValue >= 10) {
                device.textSize = 25;
                device.textXPosition = -5;
                device.textYPosition = 32;
            }

            if (roundedValue >= 100) {
                device.textSize = 20;
                device.textXPosition = -4;
                device.textYPosition = 26;
            }
        }
    });

    return formattedData;
}

function format_graph_data(data, polluant_arr, source) {}

function displayFormattedDataOnMap(formattedData, layer) {
    // Clear existing markers from the layer
    layer.clearLayers();

    // Process each device and add markers
    formattedData.forEach((device) => {
        // Skip if not connected
        if (!device.connected) return;

        // Create the main icon marker
        var icon_param = {
            iconUrl: device.iconUrl,
            iconSize: [50, 50],
            iconAnchor: [5, 40],
            popupAnchor: [0, -10],
        };

        var marker_icon = L.icon(icon_param);
        let deviceMarker = L.marker([device.latitude, device.longitude], {
            icon: marker_icon,
        }).addTo(layer);

        // Create text marker showing the value
        let roundedValue = Math.round(device.valeur_brute);
        var text_param = L.divIcon({
            className: 'my-div-icon',
            html:
                '<div id="textDiv" style="font-size: ' +
                device.textSize +
                'px;">' +
                roundedValue +
                '</div>',
            iconAnchor: [device.textXPosition, device.textYPosition],
        });

        let textMarker = L.marker([device.latitude, device.longitude], {
            icon: text_param,
        })
            .on('click', function () {
                // Handle marker selection
                if (
                    globalSelectedMarker &&
                    globalSelectedMarker !== deviceMarker
                ) {
                    globalSelectedMarker.setZIndexOffset(0);
                    globalSelectedMarker._icon.classList.remove(
                        'marker-selected'
                    );
                }

                if (globalSelectedText && globalSelectedText !== textMarker) {
                    globalSelectedText.setZIndexOffset(0);
                    globalSelectedText._icon.classList.remove(
                        'marker-selected'
                    );
                }

                // Highlight selected marker
                deviceMarker.setZIndexOffset(1000);
                textMarker.setZIndexOffset(1000);
                deviceMarker._icon.classList.add('marker-selected');
                textMarker._icon.classList.add('marker-selected');

                // Update global references
                globalSelectedMarker = deviceMarker;
                globalSelectedText = textMarker;

                console.log('Click on device: ' + device.id);

                // Open appropriate side panel
                if (device.source === 'nebuleair') {
                    openSidePanel_nebuleAir(
                        device.rawDeviceData,
                        device.pas_de_temps,
                        device.plage_historique,
                        device.mesure
                    );
                } else if (device.source === 'atmosud_micro') {
                    openSidePanel_microStation(
                        device.rawDeviceData,
                        device.plage_historique,
                        device.pas_de_temps,
                        device.mesure
                    );
                }
            })
            .addTo(layer);

        // Add hover effect
        function highlightMarker() {
            deviceMarker.setZIndexOffset(1000);
            textMarker.setZIndexOffset(1000);

            // Show device info in tooltip
            deviceInfo._div.querySelector('#device-name').textContent =
                device.id;
            deviceInfo._div.querySelector('#device-details').textContent =
                `Type: ${device.modele}`;
            deviceInfo._div.style.display = 'block';
        }

        function resetMarker() {
            if (globalSelectedMarker !== deviceMarker) {
                deviceMarker.setZIndexOffset(0);
                textMarker.setZIndexOffset(0);
            }
            deviceInfo._div.style.display = 'none';
        }

        // Apply hover effects to both markers
        deviceMarker
            .on('mouseover', highlightMarker)
            .on('mouseout', resetMarker);
        textMarker.on('mouseover', highlightMarker).on('mouseout', resetMarker);
    });

    // Add the layer to the map
    map.addLayer(layer);
}
