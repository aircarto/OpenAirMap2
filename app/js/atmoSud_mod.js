/*
Affichage des cartes de modélisation
Principalement les cartes d'AmtoSud
-> rasters WMS
*/

import {
    modelisationPMAtmoSud_layer,
    modelisationICAIRAtmoSud_layer,
    modelisationVentLayer,
} from './layers.js';
import { toastManager, createCustomToast } from './toaster.js';

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

// Fonction utilitaire pour obtenir l'heure de la couche
function getLayerHour() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Récupération du pas de temps
    const pasDeTemps = JSON.parse(localStorage.getItem('pasDeTempsLocal'))[0];

    // Conversion en UTC (soustraire 2 heures)
    const utcHours = (hours + 24 - 2) % 24;

    // Détermination de l'heure de la couche
    let layerHour = 24; // Par défaut, on utilise h24

    // Si on est au pas de temps quart d'heure et dans les 15 premières minutes
    if (pasDeTemps === 'qh' && minutes < 15) {
        if (utcHours === 0) {
            layerHour = 23; // h23 pour minuit UTC
        } else {
            layerHour = (utcHours + 24 - 1) % 24;
        }
    }

    return layerHour;
}

// Fonction utilitaire pour obtenir le nom de la couche
function getLayerName(prefix, hour) {
    return `${prefix}_h${String(hour).padStart(2, '0')}`;
}

// Fonction utilitaire pour construire l'URL WMTS
function buildWmtsUrl(wmtsUrl, workspace, layerName) {
    const baseUrl = `${wmtsUrl}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.1.1&LAYER=${workspace}:${layerName}&TILEMATRIXSET=EPSG:900913&FORMAT=image/png8&TILEMATRIX=EPSG:900913:{z}&TILEROW={y}&TILECOL={x}`;
    return baseUrl;
}

/**
 * Charge la couche de modélisation des PM sur la carte
 * Vient chercher les données sur le serveur WMS d'AtmoSud (geoserver ou azurh)
 * @param {string} compoundUpper - Le polluant à afficher (PM1, PM25, PM10)
 */
export function loadModPM(compoundUpper) {
    console.log(
        '%cloadModPm',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );
    console.log('Polluant sélectionné:', compoundUpper);

    // Récupération du pas de temps sélectionné
    const pasDeTemps = JSON.parse(localStorage.getItem('pasDeTempsLocal'))[0];
    console.log('Pas de temps sélectionné:', pasDeTemps);

    // Vérification du pas de temps journalier
    if (pasDeTemps === 'd') {
        createCustomToast({
            message:
                "Les modélisations ne sont disponibles qu'en pas de temps horaire ou inférieur.",
            type: 'warning',
            title: 'Attention',
            icon: 'exclamation-triangle',
            timer: 5000,
            toast: true,
            position: 'top',
        });
        return;
    }

    // Désactiver la couche ICAIR'H si elle est active
    if (modelisationICAIRAtmoSud_layer.getLayers().length > 0) {
        modelisationICAIRAtmoSud_layer.clearLayers();
        console.log("Couche ICAIR'H désactivée");
    }

    // Nettoyage de la couche existante
    modelisationPMAtmoSud_layer.clearLayers();
    console.log('Couche nettoyée');

    const wmtsUrl =
        'https://azurh-geoservices.atmosud.org/geoserver/gwc/service/wmts';
    const workspace = 'azur_heure';
    const wmtsOptions = {
        layer: '',
        style: '',
        tilematrixSet: 'EPSG:900913',
        format: 'image/png8',
        version: '1.1.1',
        opacity: 0.7,
        pane: 'overlayPane',
        zIndex: 1000,
        minZoom: 0,
        maxZoom: 16,
        attribution: 'AtmoSud',
        tileSize: 256,
        crs: L.CRS.EPSG3857,
        bounds: [
            [41.3, 3.0],
            [44.5, 7.5],
        ],
    };

    const layerHour = getLayerHour();
    console.log('Heure UTC de la couche:', layerHour);

    switch (compoundUpper) {
        case 'pm1':
            console.log('Pas de modélisation AtmoSud pour les PM1');
            toastManager.atmoModPm1Warning();
            return;
        case 'pm25':
            const pm25LayerName = getLayerName('paca_pm2_5', layerHour);
            wmtsOptions.layer = `${workspace}:${pm25LayerName}`;
            const pm25Layer = L.tileLayer(
                buildWmtsUrl(wmtsUrl, workspace, pm25LayerName),
                wmtsOptions
            );
            pm25Layer.addTo(modelisationPMAtmoSud_layer);
            break;
        case 'pm10':
            const pm10LayerName = getLayerName('paca_pm10', layerHour);
            wmtsOptions.layer = `${workspace}:${pm10LayerName}`;
            const pm10Layer = L.tileLayer(
                buildWmtsUrl(wmtsUrl, workspace, pm10LayerName),
                wmtsOptions
            );
            pm10Layer.addTo(modelisationPMAtmoSud_layer);
            break;
        case 'no2':
            const no2LayerName = getLayerName('paca_no2', layerHour);
            wmtsOptions.layer = `${workspace}:${no2LayerName}`;
            const no2Layer = L.tileLayer(
                buildWmtsUrl(wmtsUrl, workspace, no2LayerName),
                wmtsOptions
            );
            no2Layer.addTo(modelisationPMAtmoSud_layer);
            break;
        case 'o3':
            const o3LayerName = getLayerName('paca_o3', layerHour);
            wmtsOptions.layer = `${workspace}:${o3LayerName}`;
            const o3Layer = L.tileLayer(
                buildWmtsUrl(wmtsUrl, workspace, o3LayerName),
                wmtsOptions
            );
            o3Layer.addTo(modelisationPMAtmoSud_layer);
            break;
        case 'so2':
            const so2LayerName = getLayerName('paca_so2', layerHour);
            wmtsOptions.layer = `${workspace}:${so2LayerName}`;
            const so2Layer = L.tileLayer(
                buildWmtsUrl(wmtsUrl, workspace, so2LayerName),
                wmtsOptions
            );
            so2Layer.addTo(modelisationPMAtmoSud_layer);
            break;
        default:
            createCustomToast({
                message: 'Polluant non reconnu: ' + compoundUpper,
                type: 'error',
                title: 'Erreur',
                icon: 'error',
                timer: 5000,
                toast: true,
                position: 'top',
            });
    }

    // Vérification finale
    console.log('Vérification finale de la couche');
    console.log(
        'Nombre total de couches dans modelisationPMAtmoSud_layer:',
        modelisationPMAtmoSud_layer.getLayers().length
    );

    // Afficher les informations sur les couches actives
    logActiveLayers();
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

    // Vérification du pas de temps journalier
    if (pasDeTemps === 'd') {
        createCustomToast({
            message:
                "Les modélisations ne sont disponibles qu'en pas de temps horaire ou inférieur.",
            type: 'warning',
            title: 'Attention',
            icon: 'exclamation-triangle',
            timer: 5000,
            toast: true,
            position: 'top',
        });
        return;
    }

    // Désactiver la couche PM si elle est active
    if (modelisationPMAtmoSud_layer.getLayers().length > 0) {
        modelisationPMAtmoSud_layer.clearLayers();
        console.log('Couche PM désactivée');
    }

    const wmtsUrl =
        'https://azurh-geoservices.atmosud.org/geoserver/gwc/service/wmts';
    const workspace = 'azur_heure';

    const layerHour = getLayerHour();
    const layerName = getLayerName('paca_icairh', layerHour);

    console.log('Heure UTC de la couche:', layerHour);
    console.log('Nom de la couche:', layerName);

    const wmtsOptions = {
        layer: `${workspace}:${layerName}`,
        style: '',
        tilematrixSet: 'EPSG:900913',
        format: 'image/png8',
        version: '1.1.1',
        opacity: 0.7,
        pane: 'overlayPane',
        zIndex: 1000,
        minZoom: 0,
        maxZoom: 16,
        attribution: 'AtmoSud',
        tileSize: 256,
        crs: L.CRS.EPSG3857,
        bounds: [
            [41.3, 3.0],
            [44.5, 7.5],
        ],
    };

    const icairLayer = L.tileLayer(
        buildWmtsUrl(wmtsUrl, workspace, layerName),
        wmtsOptions
    );

    icairLayer.addTo(modelisationICAIRAtmoSud_layer);
}

//TODO
// si il est H entre +0 et +15 min En cas de pas de temps 15 min pour modélisation horaire on affiche l'heure précédente h23
// si il est H entre +16 En cas de pas de temps 15 min pour modélisation horaire on affiche l'heure suivante h24

// Pour garder une référence à la couche active
let velocityLayer = null;

export function loadModVent() {
    console.log(
        '%cloadModVent',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );

    const pasDeTemps = JSON.parse(localStorage.getItem('pasDeTempsLocal'))?.[0];

    if (pasDeTemps === 'd') {
        createCustomToast({
            message:
                "Les modélisations vent ne sont disponibles qu'en pas de temps horaire ou inférieur.",
            type: 'warning',
            title: 'Attention',
            icon: 'exclamation-triangle',
            timer: 5000,
            toast: true,
            position: 'top',
        });
        return;
    }

    // Nettoyage de la couche existante
    modelisationVentLayer.clearLayers();
    velocityLayer = null;
    console.log('Couche vent nettoyée');

    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const dateStr = `${yyyy}${MM}${dd}`;

    const windUrl = `https://meteo.atmosud.org/${dateStr}/wind_field_${HH}.json`;
    console.log('URL vent:', windUrl);

    // Charge la nouvelle couche GeoJSON
    $.getJSON(windUrl, function (data) {
        velocityLayer = L.velocityLayer({
            displayValues: false,
            displayOptions: false,
            data: data,
            velocityScale: 0.002,
            lineWidth: 2,
            colorScale: [
                '#3288bd', // vent très faible (bleu foncé)
                '#66c2a5', // bleu-vert
                '#abdda4', // vert clair
                '#e6f598', // jaune pâle
                '#fee08b', // jaune
                '#fdae61', // orange
                '#f46d43', // rouge-orangé
                '#d53e4f', // rouge foncé (vent fort)
            ],
            minVelocity: 0,
            maxVelocity: 30,
            overlayName: 'wind_layer',
        });

        velocityLayer.addTo(modelisationVentLayer);
        console.log('Couche vent ajoutée');
    }).fail(() => {
        createCustomToast({
            message: 'Impossible de charger les données de vent à cette heure.',
            type: 'error',
            title: 'Erreur de chargement',
            icon: 'exclamation-triangle',
            timer: 5000,
            toast: true,
            position: 'top',
        });
    });
}
