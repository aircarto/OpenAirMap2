/* global L, localStorage, document */
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
    renderer: L.svg(),
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
export const changeBaseLayer = (layerName) => {
    baseLayerGroup.clearLayers();
    baseLayers[layerName].addTo(baseLayerGroup);
    localStorage.setItem('baseLayer', layerName);
};

/**
 * Contrôle personnalisé pour les fonds de carte
 * Permet de changer facilement le fond de carte via une interface utilisateur
 */
export const baseLayerControl = L.control({ position: 'bottomleft' });

baseLayerControl.onAdd = function () {
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

    // Récupération du fond de carte sauvegardé
    const savedBaseLayer =
        localStorage.getItem('baseLayer') || 'Carte standard';

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
        if (layerName === savedBaseLayer) {
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
export const initializeMapPosition = () => {
    if (
        'Lat' in localStorage &&
        'Long' in localStorage &&
        'Zoom' in localStorage
    ) {
        const lat = parseFloat(localStorage.getItem('Lat'));
        const lng = parseFloat(localStorage.getItem('Long'));
        const zoom = parseInt(localStorage.getItem('Zoom'));

        if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
            map.setView([lat, lng], zoom);
            return;
        }
    }
    map.setView(config.coordsCenter, config.zoomLevel);
};

/**
 * Configure la sauvegarde automatique de la position et du zoom
 * Sauvegarde les valeurs dans le localStorage à chaque déplacement de la carte
 */
export const setupMapPositionSaving = () => {
    map.on('moveend', function () {
        const center = map.getCenter();
        const currentZoom = map.getZoom();
        localStorage.setItem('Lat', center.lat);
        localStorage.setItem('Long', center.lng);
        localStorage.setItem('Zoom', currentZoom);
    });
};

/**
 * Initialise la carte avec toutes les configurations nécessaires
 */
export const initializeMap = () => {
    initializeMapPosition();
    setupMapPositionSaving();

    const savedBaseLayer = localStorage.getItem('baseLayer');
    if (savedBaseLayer && baseLayers[savedBaseLayer]) {
        changeBaseLayer(savedBaseLayer);
    }
};

/**
 * Crée et gère la légende des seuils pour les petits écrans
 * @param {Object} thresholds - Les seuils à afficher
 */
export function createThresholdLegend(thresholds) {
    // Supprimer l'ancienne légende si elle existe
    const oldLegend = document.querySelector('.legend-seuils');
    if (oldLegend) {
        oldLegend.remove();
    }

    // Créer le conteneur de la légende
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'legend-seuils');

        // Créer le contenu de la légende
        const legendContent = Object.entries(thresholds)
            .map(([key, value]) => {
                const color = getColorForSeuil(key);
                return `
                <div>
                    <i style="background: ${color}"></i>
                    ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value.min} à ${value.max} µg/m³
                </div>
            `;
            })
            .join('');

        div.innerHTML = legendContent;
        return div;
    };

    // Ajouter la légende à la carte
    legend.addTo(map);
}

/**
 * Fonction pour obtenir la couleur en fonction du seuil
 * @param {string} seuil - Le nom du seuil
 * @returns {string} - La couleur hexadécimale correspondante
 */
export function getColorForSeuil(seuil) {
    const colors = {
        bon: '#4ff0e6', // Bleu clair/turquoise
        moyen: '#51ccaa', // Vert
        degrade: '#ede663', // Jaune
        mauvais: '#ed5e58', // Rouge clair
        tresMauvais: '#881b33', // Rouge foncé
        extrMauvais: '#74287d', // Violet
    };
    return colors[seuil] || '#cccccc';
}
