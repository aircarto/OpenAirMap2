//Gestion de l'ouverture et de la fermeture du panneau latéral

import { map } from './mapConfig.js';

/**
 * Variables pour les éléments DOM du panneau latéral
 */
export const sidePanel = document.getElementById('side-panel');
export const card1 = document.getElementById('card1');
export const card1_body = document.getElementById('card1_body');
export const card1Img = document.getElementById('card1Img');
export const card1Title = document.getElementById('card1Title');
export const card1Subtitle = document.getElementById('card1Subtitle');
export const card1Text = document.getElementById('card1Text');
export const card1_button = document.getElementById('card1_button');
export const card2 = document.getElementById('card2');
export const card2_title = document.getElementById('card2_title');
export const card2Text = document.getElementById('card2Text');
export const card2_button = document.getElementById('card2_button');
export const card2Link = document.getElementById('card2Link');
export const mapContainer = document.getElementById('map-container');

// Variables globales pour l'état du side panel
const sidePanelState = {
    isOpen: false,
    isExpanded: false,
};

/**
 * Vérifie si l'écran est considéré comme petit (mobile)
 * @returns {boolean} True si l'écran est petit
 */
function isSmallScreen() {
    // Détection plus robuste pour les appareils mobiles
    const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Pour Safari sur iOS, utiliser une détection plus large
    if (isIOS && isSafari) {
        return window.innerWidth <= 768;
    }

    // Pour les autres appareils, utiliser le breakpoint Bootstrap
    return window.innerWidth < 576 || isMobile;
}

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

    // Gestion responsive différente pour mobile et desktop
    if (isSmallScreen()) {
        // Forcer les styles pour mobile - écraser toutes les classes Bootstrap
        sidePanel.style.position = 'fixed';
        sidePanel.style.top = '0';
        sidePanel.style.left = '0';
        sidePanel.style.width = '100%';
        sidePanel.style.height = '100vh';
        sidePanel.style.zIndex = '9999';
        sidePanel.style.backgroundColor = 'white';
        sidePanel.style.overflowY = 'auto';
        sidePanel.style.padding = '20px 15px';
        sidePanel.style.marginTop = '0';
        sidePanel.style.marginLeft = '0';
        sidePanel.style.marginRight = '0';
        sidePanel.style.marginBottom = '0';
        sidePanel.style.boxSizing = 'border-box';

        // Supprimer toutes les classes Bootstrap qui peuvent interférer
        sidePanel.className = '';
        sidePanel.classList.add('mobile-side-panel');

        // Masquer complètement le conteneur de carte
        mapContainer.style.display = 'none';
        mapContainer.style.visibility = 'hidden';

        // Supprimer les classes Bootstrap du conteneur de carte
        mapContainer.classList.remove('col-12', 'col-sm-6', 'col-lg-7');
    } else {
        // Sur desktop, layout normal
        sidePanel.style.position = '';
        sidePanel.style.top = '';
        sidePanel.style.left = '';
        sidePanel.style.width = '';
        sidePanel.style.height = '';
        sidePanel.style.zIndex = '';
        sidePanel.style.backgroundColor = '';
        sidePanel.style.overflowY = '';
        sidePanel.style.padding = '';
        sidePanel.style.marginTop = '';
        sidePanel.style.marginLeft = '';
        sidePanel.style.marginRight = '';
        sidePanel.style.marginBottom = '';
        sidePanel.style.boxSizing = '';

        // Restaurer les classes Bootstrap pour desktop
        sidePanel.className = 'vh-100 overflow-auto';

        mapContainer.style.display = 'block';
        mapContainer.style.visibility = 'visible';
        mapContainer.classList.remove('col-12');
        mapContainer.classList.add('col-12', 'col-sm-6', 'col-lg-7');
        sidePanel.classList.add('col-12', 'col-sm-6', 'col-lg-5');
    }

    document.body.classList.add('side-panel-open');

    // Forcer un reflow pour s'assurer que les dimensions sont calculées
    sidePanel.offsetHeight;

    // Mettre à jour les boutons
    updateButtonsState();

    // Utiliser setTimeout pour s'assurer que le DOM est mis à jour
    setTimeout(() => {
        updateButtonsPosition();
        if (map) {
            map.invalidateSize();
        }
    }, 100);
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

    // Restaurer les styles par défaut
    sidePanel.style.position = '';
    sidePanel.style.top = '';
    sidePanel.style.left = '';
    sidePanel.style.width = '';
    sidePanel.style.height = '';
    sidePanel.style.zIndex = '';
    sidePanel.style.backgroundColor = '';
    sidePanel.style.overflowY = '';
    sidePanel.style.padding = '';
    sidePanel.style.marginTop = '';
    sidePanel.style.marginLeft = '';
    sidePanel.style.marginRight = '';
    sidePanel.style.marginBottom = '';
    sidePanel.style.boxSizing = '';

    // Restaurer l'affichage du conteneur de carte
    mapContainer.style.display = 'block';
    mapContainer.style.visibility = 'visible';

    // Restaurer les classes Bootstrap selon le mode
    if (isSmallScreen()) {
        // Sur mobile, supprimer toutes les classes
        sidePanel.className = '';
        mapContainer.classList.remove('col-12', 'col-sm-6', 'col-lg-7');
        mapContainer.classList.add('col-12');
    } else {
        // Sur desktop, restaurer les classes Bootstrap
        sidePanel.className = 'vh-100 overflow-auto';
        mapContainer.classList.remove('col-12', 'col-sm-6', 'col-lg-7');
        mapContainer.classList.add('col-12');
        sidePanel.classList.remove(
            'col-12',
            'col-sm-6',
            'col-lg-5',
            'expanded'
        );
    }

    document.body.classList.remove('side-panel-open');

    // Mettre à jour les boutons
    updateButtonsState();
    updateButtonsPosition();

    // Redimensionner la carte avec un délai pour Safari iOS
    setTimeout(() => {
        if (map) {
            map.invalidateSize();
        }
    }, 100);
}

/**
 * Bouton d'ouverture et de fermeture du panneau latéral
 * Met à jour l'état des boutons en fonction de l'état du panneau
 */
export function updateButtonsState() {
    const toggleButton = document.getElementById('toggleSidePanel');
    const collapseButton = document.getElementById('collapseSidePanel');
    const reduceButton = document.getElementById('reduceSidePanel');
    const mobileCloseButton = document.getElementById('closeSidePanelMobile');

    if (isSmallScreen()) {
        // Sur mobile : masquer les boutons complexes, gérer le bouton de fermeture mobile
        if (toggleButton) {
            toggleButton.style.display = 'none';
            toggleButton.style.pointerEvents = 'none';
        }
        if (collapseButton) {
            collapseButton.style.display = 'none';
            collapseButton.style.pointerEvents = 'none';
        }
        if (reduceButton) {
            reduceButton.style.display = 'none';
            reduceButton.style.pointerEvents = 'none';
        }

        // Afficher le bouton de fermeture mobile seulement si le panneau est ouvert
        if (mobileCloseButton) {
            if (sidePanelState.isOpen) {
                mobileCloseButton.style.display = 'block';
                mobileCloseButton.style.pointerEvents = 'auto';
                mobileCloseButton.style.position = 'fixed';
                mobileCloseButton.style.top = '80px';
                mobileCloseButton.style.right = '20px';
                mobileCloseButton.style.zIndex = '1200';
                mobileCloseButton.style.backgroundColor = 'white';
                mobileCloseButton.style.border = '2px solid #6c757d';
                mobileCloseButton.style.boxShadow =
                    '0 2px 8px rgba(0, 0, 0, 0.3)';
                mobileCloseButton.style.padding = '10px 12px';
                mobileCloseButton.style.borderRadius = '50%';
                mobileCloseButton.style.cursor = 'pointer';
                // Améliorer la visibilité sur Safari iOS
                mobileCloseButton.style.webkitAppearance = 'none';
                mobileCloseButton.style.webkitTapHighlightColor =
                    'rgba(0,0,0,0.1)';
            } else {
                mobileCloseButton.style.display = 'none';
                mobileCloseButton.style.pointerEvents = 'none';
            }
        }
    } else {
        // Sur desktop : logique normale
        if (mobileCloseButton) {
            mobileCloseButton.style.display = 'none';
            mobileCloseButton.style.pointerEvents = 'none';
        }

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
                        .classList.replace(
                            'bi-chevron-right',
                            'bi-chevron-left'
                        );
                    toggleButton.style.display = 'none';
                    collapseButton.style.display = 'none';
                    reduceButton.style.display = 'block';
                } else {
                    // Panneau normal - flèche vers la droite pour agrandir
                    toggleButton
                        .querySelector('i')
                        .classList.replace(
                            'bi-chevron-left',
                            'bi-chevron-right'
                        );
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

                // Attendre que le panneau soit complètement visible
                requestAnimationFrame(() => {
                    // Redimensionner le graphique si nécessaire
                    if (window.amchart_root) {
                        // Forcer le redimensionnement du conteneur
                        const chartDiv =
                            document.getElementById('chartdiv_sensor');
                        if (chartDiv) {
                            // Forcer une mise à jour des dimensions du conteneur
                            chartDiv.style.width = '100%';
                            chartDiv.style.height = '100%';

                            // Forcer un reflow
                            chartDiv.offsetHeight;
                        }

                        // Forcer un redimensionnement immédiat
                        window.amchart_root.resize();

                        // Puis un second redimensionnement après un court délai
                        setTimeout(() => {
                            window.amchart_root.resize();
                        }, 100);
                    }
                });

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

                // Attendre que le panneau soit complètement visible
                requestAnimationFrame(() => {
                    // Redimensionner le graphique si nécessaire
                    if (window.amchart_root) {
                        // Forcer le redimensionnement du conteneur
                        const chartDiv =
                            document.getElementById('chartdiv_sensor');
                        if (chartDiv) {
                            // Forcer une mise à jour des dimensions du conteneur
                            chartDiv.style.width = '100%';
                            chartDiv.style.height = '100%';

                            // Forcer un reflow
                            chartDiv.offsetHeight;
                        }

                        // Forcer un redimensionnement immédiat
                        window.amchart_root.resize();

                        // Puis un second redimensionnement après un court délai
                        setTimeout(() => {
                            window.amchart_root.resize();
                        }, 100);
                    }
                });

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
                // Attendre que le DOM soit complètement mis à jour
                requestAnimationFrame(() => {
                    window.amchart_root.resize();

                    // Vérifier si le redimensionnement a été effectif
                    setTimeout(() => {}, 100);
                });
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
        // Fonction de fermeture
        const closePanel = function () {
            // Fermer le panneau
            closeSidePanel();

            // Mettre à jour l'état des boutons
            updateButtonsState();
            updateToggleButtonVisibility();

            // Redimensionner la carte avec un délai pour Safari iOS
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 150);
        };

        // Ajouter plusieurs types d'événements pour une meilleure compatibilité
        closeButton.addEventListener('click', closePanel);
        closeButton.addEventListener('touchend', function (e) {
            e.preventDefault();
            closePanel();
        });

        // Gestion spécifique pour Safari iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(
            navigator.userAgent
        );

        if (isIOS && isSafari) {
            // Ajouter des styles spécifiques pour iOS
            closeButton.style.webkitUserSelect = 'none';
            closeButton.style.webkitTouchCallout = 'none';
            closeButton.style.webkitTapHighlightColor = 'rgba(0,0,0,0.1)';

            // Événement spécifique pour iOS
            closeButton.addEventListener('touchstart', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });

            closeButton.addEventListener('touchend', function (e) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
                closePanel();
            });
        }
    }
}

/**
 * Met à jour la visibilité des boutons du panneau latéral
 */
export function updateToggleButtonVisibility() {
    const toggleButton = document.getElementById('toggleSidePanel');
    const collapseButton = document.getElementById('collapseSidePanel');
    const reduceButton = document.getElementById('reduceSidePanel');
    const mobileCloseButton = document.getElementById('closeSidePanelMobile');

    // Vérifier si lastSelectedDeviceData existe et n'est pas null/undefined
    const hasDeviceData =
        window.lastSelectedDeviceData &&
        window.lastSelectedDeviceData !== null &&
        window.lastSelectedDeviceData !== undefined;

    if (isSmallScreen()) {
        // Sur mobile : masquer les boutons complexes, gérer le bouton de fermeture mobile
        if (toggleButton) {
            toggleButton.style.display = 'none';
            toggleButton.style.pointerEvents = 'none';
        }
        if (collapseButton) {
            collapseButton.style.display = 'none';
            collapseButton.style.pointerEvents = 'none';
        }
        if (reduceButton) {
            reduceButton.style.display = 'none';
            reduceButton.style.pointerEvents = 'none';
        }

        // Le bouton de fermeture mobile est géré par updateButtonsState()
        if (mobileCloseButton) {
            mobileCloseButton.style.pointerEvents = hasDeviceData
                ? 'auto'
                : 'none';
        }
    } else {
        // Sur desktop : logique normale
        if (mobileCloseButton) {
            mobileCloseButton.style.display = 'none';
            mobileCloseButton.style.pointerEvents = 'none';
        }

        if (hasDeviceData) {
            // Afficher les boutons et permettre l'interaction
            if (toggleButton) {
                toggleButton.classList.remove('hidden');
                toggleButton.style.pointerEvents = 'auto';
            }
            if (collapseButton) {
                collapseButton.classList.remove('hidden');
                collapseButton.style.pointerEvents = 'auto';
            }
            if (reduceButton) {
                reduceButton.classList.remove('hidden');
                reduceButton.style.pointerEvents = 'auto';
            }
        } else {
            // Masquer les boutons et empêcher l'interaction
            if (toggleButton) {
                toggleButton.classList.add('hidden');
                toggleButton.style.pointerEvents = 'none';
            }
            if (collapseButton) {
                collapseButton.classList.add('hidden');
                collapseButton.style.pointerEvents = 'none';
            }
            if (reduceButton) {
                reduceButton.classList.add('hidden');
                reduceButton.style.pointerEvents = 'none';
            }
        }
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

    // Écouteur pour le redimensionnement de la fenêtre
    window.addEventListener('resize', function () {
        // Mettre à jour l'état des boutons lors du redimensionnement
        updateButtonsState();
        updateToggleButtonVisibility();
        updateButtonsPosition();

        // Redimensionner la carte si nécessaire
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    });

    // Fonction pour surveiller les changements de window.lastSelectedDeviceData
    function watchLastSelectedDeviceData() {
        let currentValue = window.lastSelectedDeviceData;

        // Vérifier périodiquement si la valeur a changé
        setInterval(() => {
            if (window.lastSelectedDeviceData !== currentValue) {
                currentValue = window.lastSelectedDeviceData;
                updateToggleButtonVisibility();
                updateButtonsState();
            }
        }, 100); // Vérifier toutes les 100ms
    }

    // Démarrer la surveillance
    watchLastSelectedDeviceData();

    // Initialisation initiale avec délai pour Safari iOS
    setTimeout(() => {
        updateToggleButtonVisibility();
        updateButtonsState();
        updateButtonsPosition();
    }, 200);
});
