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

/**
 * Ouvre le panneau latéral générique
 * Ajuste la mise en page du conteneur de la carte
 */
export function openSidePanelGeneric() {
    sidePanel.style.display = 'block';
    mapContainer.classList.remove('col-12');
    mapContainer.classList.add('col-12', 'col-sm-6', 'col-lg-7');
    sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
    document.body.classList.add('side-panel-open');
    map.invalidateSize();
}

/**
 * Ferme le panneau latéral
 * Restaure la mise en page du conteneur de la carte
 */
export function closeSidePanel() {
    sidePanel.style.display = 'none';
    mapContainer.classList.remove('col-12', 'col-sm-6', 'col-lg-7');
    mapContainer.classList.add('col-12');
    sidePanel.classList.remove('col-12', 'col-sm-6', 'col-lg-5');
    document.body.classList.remove('side-panel-open');
    map.invalidateSize();
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
 * Initialise les boutons du panneau latéral
 */
export function initializeSidePanelButtons() {
    // Bouton d'agrandissement/réduction du panneau latéral
    const expandButton = document.getElementById('expandSidePanel');
    const collapseButton = document.getElementById('collapseSidePanel');

    if (expandButton && collapseButton) {
        expandButton.addEventListener('click', function () {
            console.log('chart :', window.amchart_root);
            sidePanel.classList.add('expanded');
            mapContainer.classList.add('map-collapsed');
            sidePanel.style.display = 'block';
            mapContainer.style.display = 'none';

            expandButton.style.display = 'none';
            collapseButton.style.display = 'block';

            if (window.amchart_root) {
                setTimeout(() => {
                    window.amchart_root.resize();
                }, 300);
            }

            if (map) {
                map.invalidateSize();
            }
        });

        collapseButton.addEventListener('click', function () {
            sidePanel.classList.remove('expanded');
            mapContainer.classList.remove('map-collapsed');
            sidePanel.style.display = 'block';
            mapContainer.style.display = 'block';

            collapseButton.style.display = 'none';
            expandButton.style.display = 'block';

            if (map) {
                map.invalidateSize();
            }
        });
    }
}

/**
 * Initialise le bouton de basculement du panneau latéral
 */
export function initializeToggleButton() {
    const toggleButton = document.getElementById('toggleSidePanel');
    if (toggleButton) {
        toggleButton.addEventListener('click', function () {
            const icon = this.querySelector('i');

            if (sidePanel.style.display === 'none') {
                openSidePanelGeneric();
                icon.classList.replace('bi-chevron-right', 'bi-chevron-left');
            } else {
                closeSidePanel();
                icon.classList.replace('bi-chevron-left', 'bi-chevron-right');
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
    const fullScreenButton = document.getElementById('expandSidePanel');
    if (window.globalSelectedDeviceId) {
        toggleButton.classList.remove('hidden');
        fullScreenButton.classList.remove('hidden');
    } else {
        toggleButton.classList.add('hidden');
        fullScreenButton.classList.add('hidden');
    }
}

// Initialisation de l'observateur pour la visibilité des boutons
document.addEventListener('DOMContentLoaded', function () {
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (
                mutation.type === 'attributes' &&
                mutation.attributeName === 'data-selected-device'
            ) {
                updateToggleButtonVisibility();
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-selected-device'],
    });

    updateToggleButtonVisibility();
});
