//Gestion de l'ouverture et de la fermeture du panneau latéral

import { map } from './mapConfig.js';

/**
 * Variables pour les éléments DOM du panneau latéral
 */
export const sidePanel = document.getElementById('side-panel');
export const card1 = document.getElementById('card1');
export const card1_body = document.getElementById('card1_body');
export const card1_img = document.getElementById('card1_img');
export const card1_title = document.getElementById('card1_title');
export const card1_text = document.getElementById('card1_text');
export const card1_button = document.getElementById('card1_button');
export const card2 = document.getElementById('card2');
export const card2_title = document.getElementById('card2_title');
export const card2_text = document.getElementById('card2_text');
export const card2_button = document.getElementById('card2_button');
export const card2_link = document.getElementById('card2_link');
export const mapContainer = document.getElementById('map-container');

// Variables globales pour l'état du side panel
let sidePanelState = {
    isOpen: false,
    isExpanded: false,
};

/**
 * Met à jour l'état du panneau latéral
 * @param {boolean} isOpen - Si le panneau est ouvert
 * @param {boolean} isExpanded - Si le panneau est agrandi
 */
export function updatePanelState(isOpen, isExpanded) {
    sidePanelState.isOpen = isOpen;
    sidePanelState.isExpanded = isExpanded;
    updateButtonsState();
}

/**
 * Ouvre le panneau latéral générique
 * Ajuste la mise en page du conteneur de la carte
 */
export function openSidePanelGeneric() {

    // D'abord mettre à jour l'état
    sidePanelState.isOpen = true;
    sidePanelState.isExpanded = false;

    // Ensuite appliquer les changements visuels
    sidePanel.style.display = 'block';
    mapContainer.classList.remove('col-12');
    mapContainer.classList.add('col-12', 'col-sm-6', 'col-lg-7');
    sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
    document.body.classList.add('side-panel-open');

    // Forcer un reflow pour s'assurer que les dimensions sont calculées
    sidePanel.offsetHeight;

    // Mettre à jour les boutons
    updateButtonsState();

    // Utiliser setTimeout pour s'assurer que le DOM est mis à jour
    setTimeout(() => {
        updateButtonsPosition();
        map.invalidateSize();
    }, 0);
}

/**
 * Ferme le panneau latéral
 * Restaure la mise en page du conteneur de la carte
 */
export function closeSidePanel() {

    // D'abord mettre à jour l'état
    sidePanelState.isOpen = false;
    sidePanelState.isExpanded = false;

    // Ensuite appliquer les changements visuels
    sidePanel.style.display = 'none';
    mapContainer.classList.remove('col-12', 'col-sm-6', 'col-lg-7');
    mapContainer.classList.add('col-12');
    sidePanel.classList.remove('col-12', 'col-sm-6', 'col-lg-5', 'expanded');
    document.body.classList.remove('side-panel-open');

    // Mettre à jour les boutons
    updateButtonsState();
    updateButtonsPosition();

    map.invalidateSize();
}

/**
 * Bouton d'ouverture et de fermeture du panneau latéral
 * Met à jour l'état des boutons en fonction de l'état du panneau
 */
export function updateButtonsState() {
    const toggleButton = document.getElementById('toggleSidePanel');
    const collapseButton = document.getElementById('collapseSidePanel');
    const reduceButton = document.getElementById('reduceSidePanel');

    if (toggleButton && collapseButton && reduceButton) {
        if (!sidePanelState.isOpen) {
            // Panneau fermé
            toggleButton
                .querySelector('i')
                .classList.replace('bi-chevron-left', 'bi-chevron-right');
            collapseButton.style.display = 'none';
            reduceButton.style.display = 'none';
        } else {
            // Panneau ouvert
            if (sidePanelState.isExpanded) {
                // Panneau agrandi - flèche vers la gauche pour réduire
                toggleButton
                    .querySelector('i')
                    .classList.replace('bi-chevron-right', 'bi-chevron-left');
                toggleButton.style.display = 'none';
                collapseButton.style.display = 'none';
                reduceButton.style.display = 'block';
            } else {
                // Panneau normal - flèche vers la droite pour agrandir
                toggleButton
                    .querySelector('i')
                    .classList.replace('bi-chevron-left', 'bi-chevron-right');
                toggleButton.style.display = 'block';
                collapseButton.style.position = 'absolute';
                collapseButton.style.right = '10px';
                collapseButton.style.top = '50%';
                collapseButton.style.transform = 'none';
                collapseButton.style.zIndex = '1100';
                collapseButton.style.display = 'block';
                reduceButton.style.display = 'none';
            }
        }
    }
}

/**
 * Ouvre le panneau latéral pour les données SignalAir
 * @param {Object} data - Les données du signalement
 * @param {string} nuisance_type - Le type de nuisance
 */
export function openSidePanel_signalair(data, nuisance_type) {
    card1_img.src = 'img/signalair/logoSignalAir.png';
    card1_title.innerHTML = 'Nuisance: ' + nuisance_type;
    card1_text.innerHTML = `
        Ville:   ${data['city']} </br>
        <table class="table">
            <tbody>
                <tr>
                    <td>Niveau de gêne</td>
                    <td>${data['niveau-de-gene']}</td>
                </tr>
                <tr>
                    <td>Symptômes déclarés</td>
                    <td>${data['si-oui-quels-symptomes']}</td>
                </tr>
                <tr>
                    <td>Origine de la nuisance</td>
                    <td>${data['origine-de-la-nuisance']} ${data['description-de-lorigine-de-la-nuisance']}</td>
                </tr>
                <tr>
                    <td>Durée de la nuisance</td>
                    <td>${data['duree-de-la-nuisance']}</td>
                </tr>
                <tr>
                    <td>Commentaires</td>
                    <td>${data['remarque-commentaire']}</td>
                </tr>
            </tbody>
        </table>
        <a href="https://www.signalair.eu/fr/" target="_blank" class="btn btn-primary" id="card1_button">Faire un signalement</a>
    `;

    openSidePanelGeneric();
}

/**
 * Initialise les boutons d'ouverture et de fermeture panneau latéral
 */
export function initializeSidePanelButtons() {
    const toggleButton = document.getElementById('toggleSidePanel');
    const collapseButton = document.getElementById('collapseSidePanel');
    const reduceButton = document.getElementById('reduceSidePanel');

    if (toggleButton && collapseButton && reduceButton) {
        // Mettre à jour l'état initial des boutons
        updateButtonsState();

        toggleButton.addEventListener('click', function () {
            // Mettre à jour l'état initial
            sidePanelState.isOpen = sidePanel.style.display !== 'none';
            sidePanelState.isExpanded =
                sidePanel.classList.contains('expanded');

            if (!sidePanelState.isOpen) {
                // Ouvrir le panneau
                openSidePanelGeneric();
            } else if (!sidePanelState.isExpanded) {
                // Agrandir le panneau
                sidePanel.classList.add('expanded');
                mapContainer.classList.add('map-collapsed');
                mapContainer.style.display = 'none';
                sidePanelState.isExpanded = true;

                // Redimensionner le graphique si nécessaire
                if (window.amchart_root) {
                    setTimeout(() => {
                        window.amchart_root.resize();
                    }, 300);
                }

                // Forcer une mise à jour des boutons
                setTimeout(() => {
                    updateButtonsState();
                }, 100);
            }

            if (map) {
                map.invalidateSize();
            }
        });

        collapseButton.addEventListener('click', function () {
            if (sidePanelState.isExpanded) {
                // Réduire le panneau
                sidePanel.classList.remove('expanded');
                mapContainer.classList.remove('map-collapsed');
                mapContainer.style.display = 'block';
                sidePanelState.isExpanded = false;

                updateButtonsState();
            } else {
                // Fermer le panneau
                closeSidePanel();
            }

            if (map) {
                map.invalidateSize();
            }
        });

        reduceButton.addEventListener('click', function () {
            // Réduire le panneau
            sidePanel.classList.remove('expanded');
            mapContainer.classList.remove('map-collapsed');
            mapContainer.style.display = 'block';
            sidePanelState.isExpanded = false;

            // Redimensionner le graphique si nécessaire
            if (window.amchart_root) {
                setTimeout(() => {
                    window.amchart_root.resize();
                }, 300);
            }

            updateButtonsState();

            if (map) {
                map.invalidateSize();
            }
        });
    }
}

/**
 * Initialise le bouton de fermeture mobile
 */
export function initializeMobileCloseButton() {
    const closeButton = document.getElementById('closeSidePanelMobile');
    if (closeButton) {
        closeButton.addEventListener('click', function () {
            const toggleButton = document.getElementById('toggleSidePanel');
            const toggleIcon = toggleButton.querySelector('i');

            closeSidePanel();
            toggleIcon.classList.replace('bi-chevron-left', 'bi-chevron-right');
        });
    }
}

/**
 * Met à jour la visibilité des boutons du panneau latéral
 */
export function updateToggleButtonVisibility() {
    const toggleButton = document.getElementById('toggleSidePanel');
    if (window.globalSelectedDeviceId) {
        toggleButton.classList.remove('hidden');
    } else {
        toggleButton.classList.add('hidden');
    }
}

// Ajouter cette fonction pour gérer le positionnement des boutons
function updateButtonsPosition() {
    const toggleButton = document.getElementById('toggleSidePanel');
    const collapseButton = document.getElementById('collapseSidePanel');

    if (toggleButton && collapseButton) {
        // Attendre que le panneau soit visible et mesurable
        if (sidePanel.style.display === 'block') {
            // Utiliser getBoundingClientRect pour une mesure plus précise
            const sidePanelRect = sidePanel.getBoundingClientRect();

            // Positionner les boutons par rapport au panneau
            const buttonPosition = sidePanelRect.right + 20;

            toggleButton.style.position = 'fixed';
            collapseButton.style.position = 'fixed';
            toggleButton.style.left = `${buttonPosition}px`;
            collapseButton.style.left = `${buttonPosition}px`;
        } else {
            // Panneau fermé, positionner à gauche
            toggleButton.style.position = 'fixed';
            collapseButton.style.position = 'fixed';
            toggleButton.style.left = '20px';
            collapseButton.style.left = '20px';
        }
    }
}

// Modifier l'initialisation des observateurs
document.addEventListener('DOMContentLoaded', function () {
    // Observateur pour les changements de style du panneau latéral
    const sidePanelObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (
                mutation.type === 'attributes' &&
                (mutation.attributeName === 'style' ||
                    mutation.attributeName === 'class')
            ) {
                updateButtonsPosition();
            }
        });
    });

    sidePanelObserver.observe(sidePanel, {
        attributes: true,
        attributeFilter: ['style', 'class'],
    });

    // Observateur existant pour data-selected-device
    const deviceObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (
                mutation.type === 'attributes' &&
                mutation.attributeName === 'data-selected-device'
            ) {
                updateToggleButtonVisibility();
            }
        });
    });

    deviceObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-selected-device'],
    });

    // Initialisation initiale
    updateToggleButtonVisibility();
    updateButtonsPosition();
});
