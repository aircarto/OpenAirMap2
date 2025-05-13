import { config } from './appConfig.js';

/**
 * Configuration de la carte Leaflet
 * Initialisation avec les paramètres de configuration définis dans appConfig.js
 */
export const map = L.map('map', {
    center: config.coordsCenter,
    zoom: config.zoomLevel,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    renderer: L.canvas(),
});

/**
 * Définition des différents fonds de carte disponibles
 * Chaque fond de carte est une couche TileLayer avec ses propres paramètres
 */
export const baseLayers = {
    'Carte standard': L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            pane: 'tilePane',
        }
    ),
    Satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
            pane: 'tilePane',
        }
    ),
    Terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution:
            '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
        pane: 'tilePane',
    }),
    Rues: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        pane: 'tilePane',
    }),
};

/**
 * Groupe de couches pour les fonds de carte
 * Permet de gérer facilement le changement de fond de carte
 */
export const baseLayerGroup = L.layerGroup();

// Ajout de la couche par défaut (Carte standard)
baseLayers['Carte standard'].addTo(baseLayerGroup);
baseLayerGroup.addTo(map);

/**
 * Change le fond de carte actif
 * @param {string} layerName - Nom de la couche à activer
 */
export function changeBaseLayer(layerName) {
    baseLayerGroup.clearLayers();
    baseLayers[layerName].addTo(baseLayerGroup);
}

/**
 * Contrôle personnalisé pour les fonds de carte
 * Permet de changer facilement le fond de carte via une interface utilisateur
 */
export const baseLayerControl = L.control({ position: 'bottomleft' });

baseLayerControl.onAdd = function (map) {
    const div = L.DomUtil.create(
        'div',
        'leaflet-control-layers leaflet-control-layers-collapsed'
    );
    const toggleButton = L.DomUtil.create(
        'a',
        'leaflet-control-layers-toggle',
        div
    );
    toggleButton.href = '#';
    toggleButton.title = 'Changer le fond de carte';
    toggleButton.innerHTML = '<i class="bi bi-layers"></i>';

    const container = L.DomUtil.create(
        'div',
        'leaflet-control-layers-base',
        div
    );
    container.style.display = 'none';

    // Création des boutons radio pour chaque fond de carte
    Object.keys(baseLayers).forEach((layerName) => {
        const label = L.DomUtil.create(
            'label',
            'leaflet-control-layers-base',
            container
        );
        const input = L.DomUtil.create('input', '', label);
        input.type = 'radio';
        input.name = 'baseLayer';
        input.value = layerName;
        if (layerName === 'Carte standard') {
            input.checked = true;
        }
        label.appendChild(document.createTextNode(' ' + layerName));

        // Gestion du changement de fond de carte
        input.onchange = function () {
            changeBaseLayer(layerName);
        };
    });

    // Gestion du clic sur le bouton de basculement
    L.DomEvent.on(toggleButton, 'click', function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);

        if (container.style.display === 'none') {
            container.style.display = 'block';
            div.classList.remove('leaflet-control-layers-collapsed');
        } else {
            container.style.display = 'none';
            div.classList.add('leaflet-control-layers-collapsed');
        }
    });

    return div;
};

// Ajout du contrôle à la carte
baseLayerControl.addTo(map);

/**
 * Initialise la position et le zoom de la carte
 * Récupère les valeurs sauvegardées dans le localStorage si elles existent
 * Sinon utilise les valeurs par défaut de la configuration
 */
export function initializeMapPosition() {
    if ('Lat' in localStorage) {
        const coordsCenter_local_lat = localStorage.getItem('Lat');
        const coordsCenter_local_long = localStorage.getItem('Long');
        const zoomLevel_local = localStorage.getItem('Zoom');
        map.setView(
            [coordsCenter_local_lat, coordsCenter_local_long],
            zoomLevel_local
        );
    } else {
        map.setView(config.coordsCenter, config.zoomLevel);
    }
}

/**
 * Configure la sauvegarde automatique de la position et du zoom
 * Sauvegarde les valeurs dans le localStorage à chaque déplacement de la carte
 */
export function setupMapPositionSaving() {
    map.on('moveend', function () {
        const center = map.getCenter();
        const currentZoom = map.getZoom();
        localStorage.setItem('Lat', center.lat);
        localStorage.setItem('Long', center.lng);
        localStorage.setItem('Zoom', currentZoom);
    });
}

/**
 * Initialise la carte avec toutes les configurations nécessaires
 */
export function initializeMap() {
    initializeMapPosition();
    setupMapPositionSaving();
}
