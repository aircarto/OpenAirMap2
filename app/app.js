// Import des modules nécessaires pour l'application
import { initializeMap } from './js/mapConfig.js';
import { initializeMapEvents, initializeResizeEvents } from './js/mapEvents.js';
import { initializeMeasurementSelectors } from './js/measurements.js';
import {
    initializeRefreshControl,
    startAutoRefresh,
    updateTimeDisplay,
} from './js/autoRefresh.js';
import {
    checkInitialConditions,
    updateButtonDisplay,
    initializeSourceButtons,
} from './js/sources.js';
import { initializeModelisationButtons } from './js/modelisations.js';
import {
    initializeSidePanelButtons,
    initializeMobileCloseButton,
} from './js/sidePanel.js';
import { initializeDefaultValues } from './js/utils.js';

// Affichage de la version de l'application dans la console
console.log('OpenAirMap V2');

// Récupération et affichage de la date et l'heure actuelle
const now = new Date();
const dateYMD = now.toISOString().split('T')[0];
const formattedTime = now.toLocaleTimeString('fr-FR');
console.log('Date:', dateYMD);
console.log('Time:', formattedTime);

// Initialisation du bouton de basculement des polluants
const togglePollutants = document.getElementById('togglePollutants');
const btn_polluants = document.getElementById('btn_polluants');

if (togglePollutants && btn_polluants) {
    togglePollutants.addEventListener('click', () => {
        const isHidden = btn_polluants.style.display === 'none';
        btn_polluants.style.display = isHidden ? 'flex' : 'none';

        const icon = togglePollutants.querySelector('i');
        icon.classList.toggle('bi-chevron-down');
        icon.classList.toggle('bi-chevron-up');
        togglePollutants.innerHTML = `
            <i class="bi ${isHidden ? 'bi-chevron-up' : 'bi-chevron-down'}"></i>
            ${isHidden ? 'Masquer les polluants' : 'Afficher les polluants'}
        `;
    });
}

/**
 * Fonction d'initialisation principale
 */
function initializeApp() {
    // Initialiser les valeurs par défaut
    initializeDefaultValues();

    // Initialiser la carte
    initializeMap();

    // Initialiser les événements de la carte
    initializeMapEvents();
    initializeResizeEvents();

    // Initialiser les sélecteurs de mesure et de pas de temps
    initializeMeasurementSelectors();

    // Initialiser les boutons des sources
    initializeSourceButtons();

    // Initialiser les boutons des modélisations
    initializeModelisationButtons();

    // Initialiser le contrôle de rafraîchissement
    initializeRefreshControl();

    // Initialiser les contrôles du panneau latéral
    initializeSidePanelButtons();
    initializeMobileCloseButton();

    // Vérifier les conditions initiales des sources
    checkInitialConditions();

    // Mettre à jour l'affichage des boutons de sources
    updateButtonDisplay();

    // Mettre à jour l'affichage de l'horloge
    updateTimeDisplay();

    // Démarrer le rafraîchissement automatique si configuré
    startAutoRefresh();
}

// Initialiser l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', initializeApp);
