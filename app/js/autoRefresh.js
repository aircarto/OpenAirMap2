/* global document, window, console, clearInterval, setInterval */

/*
Relance les loads de data pour les points et leur valeurs
*/
import { getArrayFromLocalStorage } from './utils.js';
import { loadSource, updateButtonDisplay } from './sources.js';
import {
    atmoMicroLayer,
    atmoRefLayer,
    nebuleairLayer,
    sensorCommunityLayer,
    purpleairLayer,
    clearLayer,
    findAndHighlightMarker,
} from './layers.js';
import { toastManager } from './toaster.js';

/**
 * Nettoie tous les tooltips actifs
 */
const cleanupTooltips = () => {
    // Supprimer tous les tooltips personnalisés
    const tooltips = document.querySelectorAll('.custom-tooltip');
    tooltips.forEach((tooltip) => {
        if (tooltip.mousemoveHandler) {
            document.removeEventListener('mousemove', tooltip.mousemoveHandler);
        }
        tooltip.remove();
    });
};

/**
 * Démarre le rafraîchissement automatique des données
 */
export const startAutoRefresh = () => {
    // Arrêt de tout intervalle de rafraîchissement existant
    if (window.refreshInterval) {
        clearInterval(window.refreshInterval);
    }

    // Récupération du pas de temps actuel
    const selectedTimeStep = getArrayFromLocalStorage('pasDeTempsLocal')[0];

    // Détermination de l'intervalle de rafraîchissement en millisecondes
    let refreshIntervalMs;
    switch (selectedTimeStep) {
        case 'instantane': {
            refreshIntervalMs = 60 * 1000; // 60 secondes
            break;
        }
        case '2min': {
            refreshIntervalMs = 2 * 60 * 1000; // 2 minutes
            break;
        }
        case 'qh': {
            refreshIntervalMs = 15 * 60 * 1000; // 15 minutes
            break;
        }
        case 'h': {
            refreshIntervalMs = 60 * 60 * 1000; // 1 heure
            break;
        }
        case 'd': {
            refreshIntervalMs = 24 * 60 * 60 * 1000; // 1 jour
            break;
        }
        default: {
            refreshIntervalMs = 5 * 60 * 1000; // Par défaut 5 minutes
        }
    }

    console.log(
        `Rafraîchissement automatique réglé sur ${refreshIntervalMs / 1000} secondes basé sur le pas de temps '${selectedTimeStep}'`
    );

    // Configuration de l'intervalle de rafraîchissement
    window.refreshInterval = setInterval(() => {
        // Vérification si un rafraîchissement est déjà en cours
        if (window.isRefreshing) {
            console.log('Un rafraîchissement est déjà en cours, attente...');
            return;
        }
        window.isRefreshing = true;

        console.log(
            '⏰ Rafraîchissement automatique des données selon le pas de temps'
        );

        // Nettoyage des tooltips avant le rafraîchissement
        cleanupTooltips();

        // Sauvegarde de l'état actuel avant le rafraîchissement
        const currentDeviceId = window.globalSelectedDeviceId;
        const sidePanelOpen =
            document.getElementById('side-panel').style.display !== 'none';
        const lastSelectedData = window.lastSelectedDeviceData;

        // Sauvegarde des données actuelles de l'appareil si disponible
        if (
            currentDeviceId &&
            window.deviceMarkers &&
            window.deviceMarkers[currentDeviceId]
        ) {
            window.lastSelectedDeviceData =
                window.deviceMarkers[currentDeviceId].data;
        }

        // Réinitialisation des marqueurs
        window.deviceMarkers = {};
        window.globalSelectedMarker = null;
        window.globalSelectedText = null;

        // Récupération et rafraîchissement des sources actives
        const activeSources = getArrayFromLocalStorage('sources_local');
        const refreshPromises = activeSources.map((source) => {
            clearLayer(source);
            return loadSource(source);
        });

        // Attente de la fin de tous les rafraîchissements
        Promise.all(refreshPromises)
            .then(() => {
                // Mise à jour de l'affichage
                updateTimeDisplay();
                updateButtonDisplay();

                // Vérifier si un marqueur est sélectionné (ancien ou nouveau)
                const deviceIdToRestore = window.globalSelectedDeviceId;

                if (deviceIdToRestore) {
                    console.log(
                        `%cRestauration du marqueur ${deviceIdToRestore} après rafraîchissement`,
                        'color: blue; font-weight: bold'
                    );

                    // Attendre que les couches soient complètement chargées
                    let attempts = 0;
                    const maxAttempts = 10;
                    const checkLayersLoaded = setInterval(() => {
                        attempts++;
                        const allLayersLoaded = [
                            nebuleairLayer,
                            atmoMicroLayer,
                            atmoRefLayer,
                            sensorCommunityLayer,
                        ].every((layer) => layer.getLayers().length > 0);

                        if (allLayersLoaded || attempts >= maxAttempts) {
                            clearInterval(checkLayersLoaded);
                            console.log(
                                `%cTentative ${attempts}/${maxAttempts} de restauration du marqueur ${deviceIdToRestore}`,
                                'color: blue; font-weight: bold'
                            );

                            findAndHighlightMarker(deviceIdToRestore);
                        }
                    }, 500);
                }
            })
            .catch((error) => {
                console.error('Erreur lors du rafraîchissement:', error);
                toastManager.dataError('refresh', error.message);
            })
            .finally(() => {
                window.isRefreshing = false;
            });
    }, refreshIntervalMs);
};

/**
 * Arrête le rafraîchissement automatique
 */
export const stopAutoRefresh = () => {
    if (window.refreshInterval) {
        clearInterval(window.refreshInterval);
        window.refreshInterval = null;
    }
};

/**
 * Met à jour le taux de rafraîchissement
 * @param {number} newRate - Le nouveau taux de rafraîchissement en secondes
 */
export const updateRefreshRate = (newRate) => {
    if (newRate > 0) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
};

/**
 * Initialise le contrôle de rafraîchissement
 */
export const initializeRefreshControl = () => {
    const refreshControl = document.getElementById('refresh-control');
    if (refreshControl) {
        refreshControl.addEventListener('change', (e) => {
            updateRefreshRate(parseInt(e.target.value));
        });
    }

    // Mettre à jour l'horloge toutes les secondes
    setInterval(updateTimeDisplay, 1000);
};

/**
 * Met à jour l'affichage de l'heure en fonction du pas de temps sélectionné
 */
export const updateTimeDisplay = () => {
    const now = new Date();
    const horlogeButton = document.getElementById('button_horloge');
    const selectedTimeStep = getArrayFromLocalStorage('pasDeTempsLocal')[0];
    let displayText = '';

    switch (selectedTimeStep) {
        case 'instantane':
        case '2min': {
            displayText = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
            break;
        }

        case 'qh': {
            const currentMinutes = now.getMinutes();
            const lastQuarterHour = new Date(now);

            if (currentMinutes < 15) {
                lastQuarterHour.setHours(
                    lastQuarterHour.getHours() - 1,
                    45,
                    0,
                    0
                );
            } else if (currentMinutes < 30) {
                lastQuarterHour.setMinutes(0, 0, 0);
            } else if (currentMinutes < 45) {
                lastQuarterHour.setMinutes(15, 0, 0);
            } else {
                lastQuarterHour.setMinutes(30, 0, 0);
            }

            const endOfLastQuarter = new Date(lastQuarterHour);
            endOfLastQuarter.setMinutes(lastQuarterHour.getMinutes() + 15);

            displayText = `${lastQuarterHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endOfLastQuarter.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            break;
        }

        case 'h': {
            const lastHour = new Date(now);
            lastHour.setHours(lastHour.getHours() - 1, 0, 0, 0);
            const nextHour = new Date(lastHour);
            nextHour.setHours(lastHour.getHours() + 1);

            displayText = `${lastHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${nextHour.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            break;
        }

        case 'd': {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            displayText = yesterday.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
            });
            break;
        }

        default: {
            displayText = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
        }
    }

    if (horlogeButton) {
        horlogeButton.innerHTML = displayText;
    }
};
