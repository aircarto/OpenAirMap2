//Gestion des sources de données depuis la top bar
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
import { loadModPM, loadModIcair, loadModVent } from './atmoSud_mod.js';
import { loadSignalAir } from './SignalAir.js';
import { loadSensorCommunity } from './sensorCommunity.js';
import { loadPurpleAir } from './purpleAir.js';
// import { loadMobileAir } from './MobileAir.js';

/**
 * Charge une source de données spécifique
 * @param {string} source - Le code de la source à charger
 * @param {boolean} isInitialLoad - Indique si c'est le chargement initial
 */
export function loadSource(source, isInitialLoad = false) {
    try {
        // Gestion de la désactivation automatique des sources modPm et icairh
        if (source === 'modPm' || source === 'icairh') {
            const activeSources = getArrayFromLocalStorage('sources_local');
            if (source === 'modPm' && activeSources.includes('icairh')) {
                removeItemFromLocalStorageArray('sources_local', 'icairh');
                clearLayer('icairh');
                updateButtonDisplay('icairh', false);
            } else if (source === 'icairh' && activeSources.includes('modPm')) {
                removeItemFromLocalStorageArray('sources_local', 'modPm');
                clearLayer('modPm');
                updateButtonDisplay('modPm', false);
            }
        }

        // Chargement de la source spécifique
        switch (source) {
            case 'nebuleair':
                loadNebuleAir();
                break;
            case 'sensorCommunity':
                loadSensorCommunity();
                break;
            case 'purpleair':
                loadPurpleAir();
                break;
            case 'atmoMicro':
                loadAtmoSudMicroStation();
                break;
            case 'atmoRef':
                loadAtmoSudStationsRef();
                break;
            case 'modPm':
                loadModPM(getArrayFromLocalStorage('mesuresLocal')[0]);
                break;
            case 'icairh':
                loadModIcair();
                break;
            case 'signalair':
                loadSignalAir();
                break;
            case 'vent':
                loadModVent();
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
    if (activeSources.includes('atmoMicro') && selectedTimeStep === 'd') {
        toastManager.atmoMicroTimeStepDailyWarning();
        clearLayer('atmoMicro');
    }

    if (activeSources.includes('atmoRef') && selectedTimeStep === '2min') {
        // toastManager.atmoRefTimeStepWarning();
        clearLayer('atmoRef');
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
        // Chercher d'abord dans les sources principales
        let buttonCode = Object.keys(sources).find(
            (key) => sources[key].name === button.textContent.trim()
        );

        // Si pas trouvé, chercher dans les sous-sources
        if (!buttonCode) {
            Object.keys(sources).forEach((key) => {
                if (sources[key].isGroup && sources[key].subSources) {
                    const subSourceKey = Object.keys(
                        sources[key].subSources
                    ).find(
                        (subKey) =>
                            sources[key].subSources[subKey].name ===
                            button.textContent.trim()
                    );
                    if (subSourceKey) {
                        buttonCode = subSourceKey;
                    }
                }
            });
        }

        if (!buttonCode) return;

        // Obtenir le code de la source
        let sourceCode;
        if (sources[buttonCode]?.code) {
            sourceCode = sources[buttonCode].code;
        } else {
            // Chercher dans les sous-sources
            Object.keys(sources).forEach((key) => {
                if (
                    sources[key].isGroup &&
                    sources[key].subSources &&
                    sources[key].subSources[buttonCode]
                ) {
                    sourceCode = sources[key].subSources[buttonCode].code;
                }
            });
        }

        // Désactiver le bouton par défaut
        button.classList.remove('active');

        // Ne pas activer le bouton si la source n'est pas dans les sources actives
        if (!activeSources.includes(sourceCode)) {
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
            sourceCode === 'atmoMicro' &&
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
        if (source.isGroup) {
            // Créer le groupe
            const groupDiv = document.createElement('div');
            groupDiv.className = 'dropdown-group';

            // Bouton principal du groupe
            const groupButton = document.createElement('button');
            groupButton.className = 'dropdown-item group-header';
            groupButton.textContent = source.name;
            groupButton.dataset.source = source.code;

            // Sous-menu pour les sources du groupe
            const subMenu = document.createElement('div');
            subMenu.className = 'dropdown-submenu';

            // Ajouter les sous-sources
            Object.values(source.subSources).forEach((subSource) => {
                const subButton = document.createElement('button');
                subButton.className = 'dropdown-item sub-item';
                subButton.textContent = subSource.name;
                subButton.dataset.source = subSource.code;

                // Gestionnaire d'événements pour les sous-sources
                subButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Créer un objet source complet pour la sous-source
                    const fullSubSource = {
                        name: subSource.name,
                        code: subSource.code,
                        activated: subSource.activated,
                    };
                    handleSourceClick(fullSubSource, subButton);
                });

                subMenu.appendChild(subButton);
            });

            groupDiv.appendChild(groupButton);
            groupDiv.appendChild(subMenu);
            dropdownSources.appendChild(groupDiv);
        } else {
            // Source normale
            const button = document.createElement('button');
            button.className = 'dropdown-item';
            button.textContent = source.name;
            button.dataset.source = source.code;

            button.addEventListener('click', () => {
                handleSourceClick(source, button);
            });

            dropdownSources.appendChild(button);
        }
    });

    // Mettre à jour l'affichage des boutons
    updateButtonDisplay();
}

function handleSourceClick(source, button) {
    const activeSources = getArrayFromLocalStorage('sources_local');

    const selectedTimeStep = getArrayFromLocalStorage('pasDeTempsLocal')[0];
    const selectedMeasure = getArrayFromLocalStorage('mesuresLocal')[0];

    // Obtenir le code de la source (gère à la fois les sources principales et les sous-sources)
    const sourceCode = source.code;

    // Vérification spéciale pour NebuleAir
    if (
        sourceCode === 'nebuleair' &&
        !['pm1', 'pm25', 'pm10'].includes(selectedMeasure)
    ) {
        createCustomToast({
            message: `La mesure ${formatPollutantName(selectedMeasure)} n'est pas disponible pour les capteurs NebuleAir opérés par AirCarto, <strong>désactivation de la source</strong>.`,
            type: 'warning',
            title: 'Attention',
            icon: 'exclamation-triangle',
            timer: 5000,
        });
        return;
    }

    // Vérification spéciale pour AtmoSud Stations de référence
    if (sourceCode === 'atmoRef' && selectedTimeStep === '2min') {
        // toastManager.atmoRefTimeStepWarning();
        return;
    }

    if (activeSources.includes(sourceCode)) {
        removeItemFromLocalStorageArray('sources_local', sourceCode);
        clearLayer(sourceCode);
        button.classList.remove('active');
        // Suppression de la popup de choix de date pour signalair
        if (sourceCode === 'signalair') {
            const popup = document.getElementsByClassName('signalair-date-picker-popup')[0];
            if (popup) {
                popup.remove();
            }
        }
    } else {
        addItemToLocalStorageArray('sources_local', sourceCode);
        loadSource(sourceCode);
        button.classList.add('active');
    }

    updateButtonDisplay();
}

export function handleTimeStepChange(timeStep) {
    const activeSources = getArrayFromLocalStorage('sources_local');

    // Vérification pour les modélisations
    if (timeStep === 'd') {
        if (activeSources.includes('modPm')) {
            removeItemFromLocalStorageArray('sources_local', 'modPm');
            clearLayer('modPm');
            createCustomToast({
                message:
                    "Les modélisations ne sont disponibles qu'en pas de temps horaire ou inférieur.",
                type: 'warning',
                title: 'Attention',
                icon: 'exclamation-triangle',
                timer: 5000,
            });
        }
        if (activeSources.includes('icairh')) {
            removeItemFromLocalStorageArray('sources_local', 'icairh');
            clearLayer('icairh');
            createCustomToast({
                message:
                    "Les modélisations ne sont disponibles qu'en pas de temps horaire ou inférieur.",
                type: 'warning',
                title: 'Attention',
                icon: 'exclamation-triangle',
                timer: 5000,
            });
        }
        if (activeSources.includes('vent')) {
            removeItemFromLocalStorageArray('sources_local', 'vent');
            clearLayer('vent');
            createCustomToast({
                message:
                    "Les modélisations ne sont disponibles qu'en pas de temps horaire ou inférieur.",
                type: 'warning',
                title: 'Attention',
                icon: 'exclamation-triangle',
                timer: 5000,
            });
        }
    }

    // Vérification pour AtmoSud Micro-stations
    if (timeStep === 'd' && activeSources.includes('atmoMicro')) {
        toastManager.atmoMicroTimeStepDailyWarning();
        clearLayer('atmoMicro');
    }

    // Mettre à jour l'affichage des boutons
    updateButtonDisplay();
}
