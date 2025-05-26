import { map } from './mapConfig.js';
import { saveArrayToLocalStorage, getArrayFromLocalStorage } from './utils.js';
import { loadSource } from './sources.js';
import { clearLayer } from './layers.js';

/**
 * Gère le déplacement de la carte
 */
export function handleMapMove() {
    const center = map.getCenter();
    saveArrayToLocalStorage('Lat', center.lat);
    saveArrayToLocalStorage('Long', center.lng);
}

/**
 * Gère le zoom de la carte
 */
export function handleMapZoom() {
    const zoom = map.getZoom();
    saveArrayToLocalStorage('Zoom', zoom);
}

/**
 * Gère le clic sur la carte
 * @param {Event} e - L'événement de clic
 */
// export function handleMapClick(e) {
//     // Ne rien faire si le clic est sur un marqueur
//     if (e.originalEvent.target.classList.contains('leaflet-marker-icon')) {
//         return;
//     }

//     // Ne rien faire si le clic est sur le panneau latéral
//     const sidePanel = document.getElementById('side-panel');
//     if (sidePanel && sidePanel.contains(e.originalEvent.target)) {
//         return;
//     }

//     // Ne rien faire si le clic est sur un contrôle de la carte
//     if (e.originalEvent.target.closest('.leaflet-control')) {
//         return;
//     }

// }

/**
 * Initialise les événements de la carte
 */
export function initializeMapEvents() {
    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapZoom);
    // map.on('click', handleMapClick);
}

/**
 * Gère le redimensionnement de la fenêtre
 */
export function handleWindowResize() {
    map.invalidateSize();
}

/**
 * Initialise les événements de redimensionnement
 */
export function initializeResizeEvents() {
    window.addEventListener('resize', handleWindowResize);
}
