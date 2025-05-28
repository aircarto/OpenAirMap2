import { API_KEYS } from '../config.js';
import { getArrayFromLocalStorage, getColorCodeForValue } from './utils.js';
import { purpleair_layer } from './layers.js';
import { isSourceActive } from './dataSourceManager.js';
import { seuils_PM1_PM25, seuils_PM10 } from './appConfig.js';

// État global pour les marqueurs PurpleAir
const purpleAirMarkerState = {
    markers: {},
    selectedMarker: null,
    selectedText: null,
    selectedDeviceId: null,
};

// Index des champs dans le tableau de données
const FIELD_INDEX = {
    sensor_index: 0,
    last_modified: 1,
    date_created: 2,
    name: 3,
    model: 4,
    latitude: 5,
    longitude: 6,
    altitude: 7,
    pm1_0_cf_1: 8, // PM1.0 brut (CF=1)
    pm1_0_atm: 9, // PM1.0 corrigé (ATM)
    pm2_5_atm: 10, // PM2.5 corrigé (ATM)
    pm2_5_cf_1: 11, // PM2.5 brut (CF=1)
    pm10_0_atm: 12, // PM10.0 corrigé (ATM)
    pm10_0_cf_1: 13, // PM10.0 brut (CF=1)
};

// Mapping des codes de couleur vers les noms de fichiers
const COLOR_TO_FILENAME = {
    bon: 'bon',
    moyen: 'moyen',
    degrade: 'degrade',
    mauvais: 'mauvais',
    tres_mauvais: 'tresMauvais',
    extr_mauvais: 'extrMauvais',
};

export function loadPurpleAir() {
    console.log(
        '%cloadPurpleAir',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );

    // Vérifier si la source est active
    if (!isSourceActive('purpleair')) {
        console.log('Source PurpleAir non active');
        return;
    }

    // Vérifier si la couche existe
    if (!purpleair_layer) {
        console.error("La couche PurpleAir n'existe pas");
        return;
    }

    // Nettoyer la couche existante
    purpleair_layer.clearLayers();

    // Récupération des paramètres de configuration
    const pas_de_temps = getArrayFromLocalStorage('pasDeTempsLocal');
    const mesures = getArrayFromLocalStorage('mesuresLocal');

    console.log('Paramètres de configuration:', { pas_de_temps, mesures });

    // Vérification si le pas de temps est instantané
    if (pas_de_temps[0] !== 'instantane') {
        console.log("PurpleAir n'est disponible qu'en mode instantané");
        return;
    }

    // Vérification si le polluant est supporté
    if (!['pm1', 'pm25', 'pm10'].includes(mesures[0])) {
        console.log('Polluant non supporté pour PurpleAir');
        return;
    }

    // Construction de la requête
    const url = 'https://api.purpleair.com/v1/sensors';
    const params = new URLSearchParams({
        fields: 'sensor_index,name,model,latitude,longitude,altitude,date_created,last_modified,pm1.0_atm,pm2.5_atm,pm10.0_atm,pm1.0_cf_1,pm2.5_cf_1,pm10.0_cf_1',
        location_type: 0, // 0 = outdoor
        max_age: 10800, // 3 heures en secondes
        nwlng: -5.0, // Ouest de la France
        selng: 8.0, // Est de la France
        nwlat: 51.0, // Nord de la France
        selat: 42.0, // Sud de la France
    });

    console.log('URL de la requête:', `${url}?${params.toString()}`);

    // Appel à l'API
    fetch(`${url}?${params.toString()}`, {
        headers: {
            'X-API-Key': API_KEYS.purpleAir,
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log('Données PurpleAir reçues:', data);
            if (data.data && data.data.length > 0) {
                console.log(`Nombre de capteurs trouvés: ${data.data.length}`);
                data.data.forEach((sensorData) => {
                    // Vérification des coordonnées avant de créer le marqueur
                    if (
                        sensorData[FIELD_INDEX.latitude] &&
                        sensorData[FIELD_INDEX.longitude]
                    ) {
                        console.log('Création du marqueur pour le capteur:', {
                            name: sensorData[FIELD_INDEX.name],
                            lat: sensorData[FIELD_INDEX.latitude],
                            lng: sensorData[FIELD_INDEX.longitude],
                        });
                        createPurpleAirMarker(
                            sensorData,
                            pas_de_temps[0],
                            mesures[0]
                        );
                    } else {
                        console.warn(
                            'Capteur ignoré - coordonnées manquantes:',
                            sensorData
                        );
                    }
                });
            } else {
                console.log('Aucun capteur trouvé dans la zone spécifiée');
            }
        })
        .catch((error) => {
            console.error(
                'Erreur lors de la récupération des données PurpleAir:',
                error
            );
        });
}

function createPurpleAirMarker(sensorData, pas_de_temps, mesure) {
    // Vérification supplémentaire des coordonnées
    const lat = sensorData[FIELD_INDEX.latitude];
    const lng = sensorData[FIELD_INDEX.longitude];

    if (!lat || !lng) {
        console.error('Coordonnées invalides pour le capteur:', sensorData);
        return;
    }

    // Vérifier si les coordonnées sont dans des plages valides
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error('Coordonnées hors limites pour le capteur:', {
            name: sensorData[FIELD_INDEX.name],
            lat,
            lng,
        });
        return;
    }

    // Déterminer la valeur en fonction du polluant (toujours en CF=1)
    let value;
    switch (mesure) {
        case 'pm1':
            value = sensorData[FIELD_INDEX.pm1_0_cf_1];
            break;
        case 'pm25':
            value = sensorData[FIELD_INDEX.pm2_5_cf_1];
            break;
        case 'pm10':
            value = sensorData[FIELD_INDEX.pm10_0_cf_1];
            break;
    }

    console.log('Valeur finale du capteur:', {
        name: sensorData[FIELD_INDEX.name],
        value: value,
        pas_de_temps: pas_de_temps,
        mesure: mesure,
        lat: lat,
        lng: lng,
    });

    // Créer l'icône du marqueur
    const icon_param = {
        iconUrl: 'img/purpleAir/purpleAir_default.png',
        iconSize: [50, 50],
        iconAnchor: [5, 40],
        popupAnchor: [0, -10],
        tooltipAnchor: [-50, -10],
    };

    // Appliquer la couleur en fonction de la valeur
    if (value !== null && !isNaN(value)) {
        const colorCode = getColorCodeForValue(value, mesure);
        if (colorCode !== 'default') {
            const filename = COLOR_TO_FILENAME[colorCode] || colorCode;
            icon_param.iconUrl = `img/purpleAir/purpleAir_${filename}.png`;
        }
    }

    console.log("Paramètres de l'icône:", icon_param);

    // Créer le marqueur avec les coordonnées vérifiées
    const marker = L.marker([parseFloat(lat), parseFloat(lng)], {
        icon: L.icon(icon_param),
        zIndexOffset: 1000,
    });

    // Créer le marqueur de texte si une valeur est disponible
    let textMarker = null;
    if (value !== null && !isNaN(value)) {
        const roundedValue = Math.round(value); // Arrondi à l'entier le plus proche
        const textSize = getTextSize(roundedValue);
        const textPosition = getTextPosition(roundedValue);

        const text_param = L.divIcon({
            className: 'my-div-icon',
            html: `<div id="textDiv" style="font-size: ${textSize}px; text-align: center; width: 50px; margin-left: -25px;">${roundedValue}</div>`,
            iconAnchor: textPosition,
            popupAnchor: [30, -60],
        });

        textMarker = L.marker([parseFloat(lat), parseFloat(lng)], {
            icon: text_param,
            zIndexOffset: 1000,
        });
    }

    // Configurer les événements du marqueur
    setupPurpleAirMarkerEvents(marker, textMarker, sensorData, value);

    // Stocker les marqueurs dans l'état global
    purpleAirMarkerState.markers[sensorData[FIELD_INDEX.sensor_index]] = {
        marker,
        textMarker,
        data: sensorData,
        value,
    };

    // Ajouter les marqueurs à la couche
    try {
        purpleair_layer.addLayer(marker);
        if (textMarker) {
            purpleair_layer.addLayer(textMarker);
        }
        console.log(
            'Marqueurs ajoutés à la couche pour le capteur:',
            sensorData[FIELD_INDEX.name]
        );
    } catch (error) {
        console.error(
            "Erreur lors de l'ajout des marqueurs à la couche:",
            error
        );
    }
}

function showPurpleAirPopup(sensorData) {
    console.log('showPurpleAirPopup appelé avec les données:', sensorData);

    // Supprimer les anciens éléments
    document
        .querySelectorAll('.purpleair-draggable')
        .forEach((el) => el.remove());

    // Récupérer le pas de temps sélectionné
    const pas_de_temps = getArrayFromLocalStorage('pasDeTempsLocal')[0];
    console.log('Pas de temps sélectionné:', pas_de_temps);

    // Utiliser uniquement les valeurs CF=1 (brutes)
    const pm1Value = sensorData[FIELD_INDEX.pm1_0_cf_1];
    const pm25Value = sensorData[FIELD_INDEX.pm2_5_cf_1];
    const pm10Value = sensorData[FIELD_INDEX.pm10_0_cf_1];

    console.log('Valeurs mesurées:', {
        pm1Value,
        pm25Value,
        pm10Value,
    });

    // Obtenir les seuils pour chaque polluant
    const pm1Seuil = getColorCodeForValue(pm1Value, 'pm1');
    const pm25Seuil = getColorCodeForValue(pm25Value, 'pm25');
    const pm10Seuil = getColorCodeForValue(pm10Value, 'pm10');

    // Obtenir les couleurs pour chaque seuil
    const pm1Color = getColorForSeuil(pm1Seuil);
    const pm25Color = getColorForSeuil(pm25Seuil);
    const pm10Color = getColorForSeuil(pm10Seuil);

    // Création du conteneur draggable
    const popup = document.createElement('div');
    popup.className = 'purpleair-draggable';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = '10000';
    popup.style.backgroundColor = 'white';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    popup.style.padding = '16px';
    popup.style.minWidth = '300px';
    popup.style.maxWidth = '400px';

    popup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <strong>Capteur PurpleAir: ${sensorData[FIELD_INDEX.name]}</strong>
            <button class="close-btn" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 0; line-height: 1;">×</button>
        </div>
        <div style="text-align: center; margin-bottom: 16px; color: #6c757d; font-size: 14px;">
            Valeurs instantanées (CF=1)
        </div>
        <div class="values-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
            <div class="value-item" style="text-align: center; padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
                <span class="value-label" style="display: block; font-size: 14px; color: #6c757d; margin-bottom: 4px;">PM1</span>
                <span class="value-number" style="display: block; font-size: 24px; font-weight: bold; color: #2D93AD; margin-bottom: 4px;">${pm1Value.toFixed(1)}</span>
                <span class="value-unit" style="display: block; font-size: 12px; color: #6c757d;">µg/m³</span>
                <span class="value-seuil" style="display: block; font-size: 12px; color: ${pm1Color}; margin-top: 4px; font-weight: bold;">Seuil: ${pm1Seuil}</span>
            </div>
            <div class="value-item" style="text-align: center; padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
                <span class="value-label" style="display: block; font-size: 14px; color: #6c757d; margin-bottom: 4px;">PM2.5</span>
                <span class="value-number" style="display: block; font-size: 24px; font-weight: bold; color: #2D93AD; margin-bottom: 4px;">${pm25Value.toFixed(1)}</span>
                <span class="value-unit" style="display: block; font-size: 12px; color: #6c757d;">µg/m³</span>
                <span class="value-seuil" style="display: block; font-size: 12px; color: ${pm25Color}; margin-top: 4px; font-weight: bold;">Seuil: ${pm25Seuil}</span>
            </div>
            <div class="value-item" style="text-align: center; padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
                <span class="value-label" style="display: block; font-size: 14px; color: #6c757d; margin-bottom: 4px;">PM10</span>
                <span class="value-number" style="display: block; font-size: 24px; font-weight: bold; color: #2D93AD; margin-bottom: 4px;">${pm10Value.toFixed(1)}</span>
                <span class="value-unit" style="display: block; font-size: 12px; color: #6c757d;">µg/m³</span>
                <span class="value-seuil" style="display: block; font-size: 12px; color: ${pm10Color}; margin-top: 4px; font-weight: bold;">Seuil: ${pm10Seuil}</span>
            </div>
        </div>
        <div style="text-align: center;">
            <a href="https://www.purpleair.com/map?select=${sensorData[FIELD_INDEX.sensor_index]}" 
               target="_blank" 
               style="display: inline-block; width: 100%; padding: 8px 16px; background-color: #2D93AD; border-color: #2D93AD; color: white; text-decoration: none; border-radius: 4px;">
                Voir les données sur PurpleAir
            </a>
        </div>
    `;

    // Fermer le popup
    popup
        .querySelector('.close-btn')
        .addEventListener('click', () => popup.remove());

    // Ajout au DOM
    document.body.appendChild(popup);
    console.log('Popup ajouté au DOM');
}

function createGauge(containerId, title, value, seuils) {
    // Création des bandes de couleur basées sur les seuils
    const bands = Object.entries(seuils).map(([key, seuil]) => ({
        startValue: seuil.min,
        endValue: seuil.max,
        color: getColorForSeuil(key),
    }));

    // Configuration de la jauge
    const root = am5.Root.new(containerId);
    root.setThemes([am5themes_Animated.new(root)]);

    // Création du conteneur de la jauge
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: 'none',
            wheelY: 'none',
            layout: root.verticalLayout,
        })
    );

    // Configuration de l'axe Y
    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            min: 0,
            max: Math.max(...bands.map((band) => band.endValue)),
            strictMinMax: true,
            renderer: am5xy.AxisRendererY.new(root, {
                minGridDistance: 30,
            }),
        })
    );

    // Ajout des bandes de couleur
    bands.forEach((band) => {
        const range = yAxis.createAxisRange(
            yAxis.makeDataItem({
                value: band.startValue,
                endValue: band.endValue,
            })
        );
        range.get('axisFill').setAll({
            fill: am5.color(band.color),
            fillOpacity: 1,
        });
    });

    // Configuration de l'axe X
    const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
            categoryField: 'category',
            renderer: am5xy.AxisRendererX.new(root, {}),
            tooltip: am5.Tooltip.new(root, {}),
        })
    );
    xAxis.data.setAll([{ category: 'value' }]);

    // Création de la série pour l'aiguille
    const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            name: 'Value',
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: 'value',
            categoryXField: 'category',
            tooltip: am5.Tooltip.new(root, {
                labelText: '{valueY}',
            }),
        })
    );

    // Configuration de l'aiguille
    series.columns.template.setAll({
        width: am5.percent(100),
        fill: am5.color('#2D93AD'),
        stroke: am5.color('#2D93AD'),
    });

    // Ajout des données
    series.data.setAll([
        {
            category: 'value',
            value: value,
        },
    ]);

    // Ajout du titre
    const titleLabel = chart.plotContainer.children.push(
        am5.Label.new(root, {
            text: title,
            fontSize: 20,
            centerX: am5.percent(50),
            centerY: am5.percent(20),
            populateText: true,
        })
    );

    // Ajout de la valeur
    const valueLabel = chart.plotContainer.children.push(
        am5.Label.new(root, {
            text: Math.round(value).toString(),
            fontSize: 30,
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            populateText: true,
        })
    );

    // Animation
    series.appear(1000, 100);

    // Nettoyage lors de la destruction
    root.dom.addEventListener('click', function () {
        root.dispose();
    });
}

function getColorForSeuil(seuil) {
    const colors = {
        bon: '#4ff0e6', // Bleu clair/turquoise
        moyen: '#51ccaa', // Vert
        degrade: '#ede663', // Jaune
        mauvais: '#ed5e58', // Rouge clair
        tres_mauvais: '#881b33', // Rouge foncé
        extr_mauvais: '#74287d', // Violet
    };
    return colors[seuil] || '#cccccc';
}

function setupPurpleAirMarkerEvents(marker, textMarker, sensorData, value) {
    const highlightMarker = () => {
        marker.setZIndexOffset(2000);
        if (textMarker) textMarker.setZIndexOffset(2000);

        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-body p-2">
                    <h6 class="card-title mb-1">${sensorData[FIELD_INDEX.name]}</h6>
                    <div class="d-flex flex-column">
                        <small class="text-muted mb-1">
                            <i class="bi bi-info-circle me-1"></i>
                            PurpleAir - ${sensorData[FIELD_INDEX.model]}
                        </small>
                        <small class="text-muted mb-1">
                            <i class="bi bi-geo-alt me-1"></i>
                            ${sensorData[FIELD_INDEX.latitude].toFixed(4)}, ${sensorData[FIELD_INDEX.longitude].toFixed(4)}
                        </small>
                        <small class="text-muted">
                            Dernière mise à jour: ${new Date(sensorData[FIELD_INDEX.last_modified] * 1000).toLocaleString()}
                        </small>
                        <small class="text-muted">
                            Polluants mesurés:
                            <ul class="list-unstyled ms-3 mb-0">
                                <li><span class="text-muted">●</span> <span class="fw-semibold">PM<sub>1</sub></span></li>
                                <li><span class="text-muted">●</span> <span class="fw-semibold">PM<sub>2.5</sub></span></li>
                                <li><span class="text-muted">●</span> <span class="fw-semibold">PM<sub>10</sub></span></li>
                            </ul>
                        </small>
                    </div>
                </div>
            </div>
        `;

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

        document.body.appendChild(tooltip);
        marker.tooltip = tooltip;
        if (textMarker) textMarker.tooltip = tooltip;
    };

    const resetMarker = () => {
        if (purpleAirMarkerState.selectedMarker !== marker) {
            marker.setZIndexOffset(1000);
            if (textMarker) textMarker.setZIndexOffset(1000);
        }

        if (marker.tooltip) {
            marker.tooltip.remove();
            marker.tooltip = null;
            if (textMarker) textMarker.tooltip = null;
        }
    };

    const clickHandler = () => {
        console.log('Click sur le marqueur PurpleAir');

        // Réinitialiser les autres types de marqueurs
        resetOtherMarkers();

        // Mettre à jour l'état des marqueurs PurpleAir
        if (
            purpleAirMarkerState.selectedMarker &&
            purpleAirMarkerState.selectedMarker !== marker
        ) {
            purpleAirMarkerState.selectedMarker.setZIndexOffset(1000);
            purpleAirMarkerState.selectedMarker._icon.classList.remove(
                'marker-selected'
            );
        }

        if (
            purpleAirMarkerState.selectedText &&
            purpleAirMarkerState.selectedText !== textMarker
        ) {
            purpleAirMarkerState.selectedText.setZIndexOffset(1000);
            purpleAirMarkerState.selectedText._icon.classList.remove(
                'marker-selected'
            );
        }

        marker.setZIndexOffset(2000);
        if (textMarker) textMarker.setZIndexOffset(2000);
        marker._icon.classList.add('marker-selected');
        if (textMarker) textMarker._icon.classList.add('marker-selected');

        purpleAirMarkerState.selectedMarker = marker;
        purpleAirMarkerState.selectedText = textMarker;
        purpleAirMarkerState.selectedDeviceId =
            sensorData[FIELD_INDEX.sensor_index];

        console.log('État du marqueur mis à jour, appel de showPurpleAirPopup');
        // Afficher le popup avec les jauges
        showPurpleAirPopup(sensorData);
    };

    marker
        .on('mouseover', highlightMarker)
        .on('mouseout', resetMarker)
        .on('click', clickHandler);

    if (textMarker) {
        textMarker
            .on('mouseover', highlightMarker)
            .on('mouseout', resetMarker)
            .on('click', clickHandler);
    }
}

function getTextSize(value) {
    if (value >= 100) return 20;
    if (value >= 10) return 25;
    return 32;
}

function getTextPosition(value) {
    if (value >= 100) return [-13, 31];
    if (value >= 10) return [-13, 34];
    return [-13, 39];
}

function resetOtherMarkers() {
    // Pour l'instant, on ne fait rien car les autres types de marqueurs ne sont pas encore implémentés
    return;
}

// Export des variables d'état
export { purpleAirMarkerState };
