import {
    modelisationPMAtmoSud_layer,
    map,
    modelisationICAIRAtmoSud_layer,
} from '../app.js';

// Définition de la projection EPSG:2154 (Lambert 93)
L.CRS.EPSG2154 = L.extend({}, L.CRS.EPSG3857, {
    code: 'EPSG:2154',
    projection: L.Projection.LonLat,
    transformation: new L.Transformation(1, 0, -1, 0),
    scale: function (zoom) {
        return 256 * Math.pow(2, zoom);
    },
});

/**
 * Affiche les informations sur les couches actives dans la console
 */
export function logActiveLayers() {
    console.log('=== Couches actives sur la carte ===');
    console.log(
        'Couche PM AtmoSud:',
        modelisationPMAtmoSud_layer.getLayers().length > 0
            ? 'Active'
            : 'Inactive'
    );
    if (modelisationPMAtmoSud_layer.getLayers().length > 0) {
        const activeLayer = modelisationPMAtmoSud_layer.getLayers()[0];
        console.log('URL WMS:', activeLayer._url);
        console.log('Nom de la couche:', activeLayer.options.layers);
        console.log(
            'Pas de temps:',
            JSON.parse(localStorage.getItem('pasDeTempsLocal'))[0]
        );
    }
    console.log('===================================');
}

/**
 * Charge la couche de modélisation des PM sur la carte
 * @param {string} compoundUpper - Le polluant à afficher (PM1, PM25, PM10)
 */
export function loadModPM(compoundUpper) {
    console.log(
        '%cloadModPm',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    console.log('Polluant sélectionné:', compoundUpper);

    // Désactiver la couche ICAIR'H si elle est active
    if (modelisationICAIRAtmoSud_layer.getLayers().length > 0) {
        modelisationICAIRAtmoSud_layer.clearLayers();
        console.log("Couche ICAIR'H désactivée");
    }

    // Nettoyage de la couche existante
    modelisationPMAtmoSud_layer.clearLayers();
    console.log('Couche nettoyée');

    // Récupération du pas de temps sélectionné
    const pasDeTemps = JSON.parse(localStorage.getItem('pasDeTempsLocal'))[0];
    console.log('Pas de temps sélectionné:', pasDeTemps);

    let string_layer;
    let wmsUrl;
    let wmsOptions;

    switch (compoundUpper) {
        case 'PM1':
            string_layer = 'paca_pm1_h24';
            console.log('Pas de modélisation AtmoSud pour les PM1');
            openToast('Pas de modélisation AtmoSud pour les PM1');
            break;
        case 'PM2.5':
            if (pasDeTemps === 'd') {
                // Mode journalier
                string_layer = `azurjour:paca-pm2_5-${new Date().toISOString().split('T')[0]}`;
                wmsUrl =
                    'https://geoservices.atmosud.org/geoserver/azurjour/wms';
            } else {
                // Mode horaire ou inférieur
                string_layer = 'paca_pm2_5_h24';
                wmsUrl =
                    'https://azurh-geoservices.atmosud.org/geoserver/azur_heure/ows';
            }
            console.log('Création de la couche WMS pour PM2.5:', string_layer);
            wmsOptions = {
                layers: string_layer,
                format: 'image/png',
                transparent: true,
                opacity: 0.6,
                version: '1.1.1',
                styles: '',
                noWrap: true,
                pane: 'overlayPane',
                zIndex: 1000,
            };
            const pm25Layer = new L.tileLayer.wms(wmsUrl, wmsOptions);
            console.log("Couche PM2.5 créée, tentative d'ajout à la carte");
            pm25Layer.addTo(modelisationPMAtmoSud_layer);
            console.log('Couche PM2.5 ajoutée à modelisationPMAtmoSud_layer');
            break;
        case 'PM10':
            if (pasDeTemps === 'd') {
                // Mode journalier
                string_layer = `azurjour:paca-pm10-${new Date().toISOString().split('T')[0]}`;
                wmsUrl =
                    'https://geoservices.atmosud.org/geoserver/azurjour/wms';
            } else {
                // Mode horaire ou inférieur
                string_layer = 'paca_pm10_h24';
                wmsUrl =
                    'https://azurh-geoservices.atmosud.org/geoserver/azur_heure/ows';
            }
            console.log('Création de la couche WMS pour PM10:', string_layer);
            wmsOptions = {
                layers: string_layer,
                format: 'image/png',
                transparent: true,
                opacity: 0.6,
                version: '1.1.1',
                styles: '',
                noWrap: true,
                pane: 'overlayPane',
                zIndex: 1000,
            };
            const pm10Layer = new L.tileLayer.wms(wmsUrl, wmsOptions);
            console.log("Couche PM10 créée, tentative d'ajout à la carte");
            pm10Layer.addTo(modelisationPMAtmoSud_layer);
            console.log('Couche PM10 ajoutée à modelisationPMAtmoSud_layer');
            break;
        default:
            console.error('Polluant non reconnu:', compoundUpper);
    }

    // Vérification finale
    console.log('Vérification finale de la couche');
    console.log(
        'La couche est-elle sur la carte?',
        map.hasLayer(modelisationPMAtmoSud_layer)
    );
    console.log(
        'Nombre total de couches dans modelisationPMAtmoSud_layer:',
        modelisationPMAtmoSud_layer.getLayers().length
    );

    // Afficher les informations sur les couches actives
    logActiveLayers();

    // Ajustement de la vue de la carte pour s'assurer que la zone est visible
    const southWest = L.latLng(43.296482, 5.36978); // Centre de la région PACA
    const northEast = L.latLng(44.5, 7.5); // Coin nord-est de la région
    map.fitBounds(L.latLngBounds(southWest, northEast));
}
export function loadModIcair() {
    console.log(
        '%cloadModIcair',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    console.log('Date utilisée:', dateStr);
    const pasDeTemps = JSON.parse(localStorage.getItem('pasDeTempsLocal'))[0];

    // Désactiver la couche PM si elle est active
    if (modelisationPMAtmoSud_layer.getLayers().length > 0) {
        modelisationPMAtmoSud_layer.clearLayers();
        console.log('Couche PM désactivée');
    }

    if (pasDeTemps === 'd') {
        new L.tileLayer.wms(
            'https://geoservices.atmosud.org/geoserver/azurjour/wms',
            {
                version: '1.1.1',
                layers: `paca-multi-${new Date().toISOString().split('T')[0]}`,
                format: 'image/png',
                crs: L.CRS.EPSG4326,
                transparent: true,
                opacity: 0.6,
                pane: 'overlayPane',
                zIndex: 1000,
            }
        ).addTo(modelisationICAIRAtmoSud_layer);
    } else {
        new L.tileLayer.wms(
            'https://azurh-geoservices.atmosud.org/geoserver/azur_heure/ows',
            {
                version: '1.1.1',
                layers: 'paca_icairh_h24',
                format: 'image/png',
                crs: L.CRS.EPSG4326,
                transparent: true,
                opacity: 0.6,
                pane: 'overlayPane',
                zIndex: 1000,
            }
        ).addTo(modelisationICAIRAtmoSud_layer);
    }
}
