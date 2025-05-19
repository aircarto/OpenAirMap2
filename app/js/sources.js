import { sources } from './appConfig.js';
import {
    getArrayFromLocalStorage,
    removeItemFromLocalStorageArray,
    formatPollutantName,
    addItemToLocalStorageArray,
} from './utils.js';
import { clearLayer } from './layers.js';
import { toastManager, createCustomToast } from './toaster.js';
import { loadNebuleAir } from './NebuleAir.js';
import { loadAtmoSudMicroStation } from './atmoSud_microStations.js';
import { loadAtmoSudStationsRef } from './atmoSud_stationsRef.js';
import { loadModPM, loadModIcair } from './atmoSud_mod.js';
import { loadSignalAir } from './SignalAir.js';
import { loadSensorCommunity } from './sensorCommunity.js';
// import { loadMobileAir } from './MobileAir.js';

/**
 * Charge une source de données spécifique
 * @param {string} source - Le code de la source à charger
 * @param {boolean} isInitialLoad - Indique si c'est le chargement initial
 */
export function loadSource(source, isInitialLoad = false) {
    console.log('Loading data for ' + source);
    try {
        // Gestion de la désactivation automatique des sources mod_pm et icairh
        if (source === 'mod_pm' || source === 'icairh') {
            const activeSources = getArrayFromLocalStorage('sources_local');
            if (source === 'mod_pm' && activeSources.includes('icairh')) {
                removeItemFromLocalStorageArray('sources_local', 'icairh');
                clearLayer('icairh');
                updateButtonDisplay('icairh', false);
            } else if (
                source === 'icairh' &&
                activeSources.includes('mod_pm')
            ) {
                removeItemFromLocalStorageArray('sources_local', 'mod_pm');
                clearLayer('mod_pm');
                updateButtonDisplay('mod_pm', false);
            }
        }

        // Chargement de la source spécifique
        switch (source) {
            case 'nebuleair':
                loadNebuleAir();
                break;
            case 'sensor_commmunity':
                loadSensorCommunity();
                break;
            case 'purpleair':
                // Ces sources ne sont pas encore implémentées
                console.warn(
                    `La source ${source} n'est pas encore implémentée`
                );
                break;
            case 'atmo_micro':
                loadAtmoSudMicroStation();
                break;
            case 'atmo_ref':
                loadAtmoSudStationsRef();
                break;
            case 'mod_pm':
                loadModPM(getArrayFromLocalStorage('mesuresLocal')[0]);
                break;
            case 'icairh':
                loadModIcair();
                break;
            case 'signalair':
                loadSignalAir();
                break;
            case 'mobileair':
                // Cette source n'est pas encore implémentée
                console.warn(
                    "La source mobileair n'est pas encore implémentée"
                );
                break;
        }
    } catch (error) {
        console.error(
            `Erreur lors du chargement de la source ${source}:`,
            error
        );
        toastManager.dataError(source, error.message);
    }
}

/**
 * Vérifie les conditions initiales des sources
 */
export function checkInitialConditions() {
    const activeSources = getArrayFromLocalStorage('sources_local');
    const selectedTimeStep = getArrayFromLocalStorage('pasDeTempsLocal')[0];

    // Vérifier d'abord les conditions de pas de temps sans notification
    if (activeSources.includes('atmo_micro') && selectedTimeStep === 'd') {
        removeItemFromLocalStorageArray('sources_local', 'atmo_micro');
        clearLayer('atmo_micro');
    }

    if (
        activeSources.includes('atmo_ref') &&
        (selectedTimeStep === '2min' || selectedTimeStep === 'instantane')
    ) {
        removeItemFromLocalStorageArray('sources_local', 'atmo_ref');
        clearLayer('atmo_ref');
    }

    if (
        activeSources.includes('nebuleair') &&
        selectedTimeStep === 'instantane'
    ) {
        removeItemFromLocalStorageArray('sources_local', 'nebuleair');
        clearLayer('nebuleair');
    }

    // Charger les sources actives au démarrage
    if (activeSources && activeSources.length > 0) {
        activeSources.forEach((source) => {
            loadSource(source, true);
        });
    }

    // Mettre à jour l'affichage des boutons une seule fois à la fin
    updateButtonDisplay();
}

/**
 * Met à jour l'affichage des boutons de sources
 */
export function updateButtonDisplay() {
    const activeSources = getArrayFromLocalStorage('sources_local');
    const selectedTimeStep = getArrayFromLocalStorage('pasDeTempsLocal')[0];
    const selectedMeasure = getArrayFromLocalStorage('mesuresLocal')[0];

    document.querySelectorAll('#dropdown_sources button').forEach((button) => {
        const buttonCode = Object.keys(sources).find(
            (key) => sources[key].name === button.textContent.trim()
        );

        if (!buttonCode) return;

        const sourceCode = sources[buttonCode].code;

        // Désactiver le bouton par défaut
        button.classList.remove('active');

        // Ne pas activer le bouton si la source n'est pas dans les sources actives
        if (!activeSources.includes(sourceCode)) {
            return;
        }

        // Vérifications spécifiques pour chaque source
        if (sourceCode === 'atmo_micro' && selectedTimeStep === 'd') {
            toastManager.atmoMicroTimeStepDailyWarning();
            return;
        }

        if (
            sourceCode === 'nebuleair' &&
            !['pm1', 'pm25', 'pm10'].includes(selectedMeasure)
        ) {
            removeItemFromLocalStorageArray('sources_local', sourceCode);
            createCustomToast({
                message: `La mesure ${formatPollutantName(selectedMeasure)} n'est pas disponible pour les capteurs NebuleAir opérés par AirCarto, <strong>désactivation de la source</strong>.`,
                type: 'warning',
                title: 'Attention',
                icon: 'exclamation-triangle',
                timer: 5000,
            });
            return;
        }

        if (
            sourceCode === 'atmo_micro' &&
            ['so2', 'nh3', 'o3', 'h2s', 'c6h6'].includes(selectedMeasure)
        ) {
            removeItemFromLocalStorageArray('sources_local', sourceCode);
            createCustomToast({
                message: `La mesure ${formatPollutantName(selectedMeasure)} n'est pas disponible pour les capteurs AtmoSud Micro-stations, <strong>désactivation de la source</strong>.`,
                type: 'warning',
                title: 'Attention',
                icon: 'exclamation-triangle',
                timer: 5000,
            });
            return;
        }

        // Si toutes les conditions sont passées, activer le bouton
        button.classList.add('active');
    });
}

/**
 * Initialise les boutons des sources dans le menu déroulant
 */
export function initializeSourceButtons() {
    const dropdownSources = document.getElementById('dropdown_sources');
    if (!dropdownSources) return;

    // Vider le menu déroulant
    dropdownSources.innerHTML = '';

    // Créer un bouton pour chaque source
    Object.values(sources).forEach((source) => {
        const button = document.createElement('button');
        button.className = 'dropdown-item';
        button.textContent = source.name;
        button.dataset.source = source.code;

        // Ajouter l'événement de clic
        button.addEventListener('click', () => {
            const activeSources = getArrayFromLocalStorage('sources_local');
            const selectedTimeStep =
                getArrayFromLocalStorage('pasDeTempsLocal')[0];

            // Vérification spéciale pour NebuleAir
            if (
                source.code === 'nebuleair' &&
                selectedTimeStep === 'instantane'
            ) {
                createCustomToast({
                    message: `Le pas de temps instantané n'est pas disponible pour les capteurs NebuleAir.`,
                    type: 'warning',
                    title: 'Attention',
                    icon: 'exclamation-triangle',
                    timer: 5000,
                });
                return;
            }

            // Vérification spéciale pour AtmoSud Stations de référence
            if (
                source.code === 'atmo_ref' &&
                (selectedTimeStep === 'instantane' ||
                    selectedTimeStep === '2min')
            ) {
                createCustomToast({
                    message: `Le pas de temps ${selectedTimeStep === 'instantane' ? 'instantané' : '2 minutes'} n'est pas disponible pour les stations de référence AtmoSud.`,
                    type: 'warning',
                    title: 'Attention',
                    icon: 'exclamation-triangle',
                    timer: 5000,
                });
                return;
            }

            if (activeSources.includes(source.code)) {
                removeItemFromLocalStorageArray('sources_local', source.code);
                clearLayer(source.code);
                button.classList.remove('active');
            } else {
                addItemToLocalStorageArray('sources_local', source.code);
                loadSource(source.code);
                button.classList.add('active');
            }
        });

        dropdownSources.appendChild(button);
    });

    // Mettre à jour l'affichage des boutons
    updateButtonDisplay();
}
