// Gestion du menu sur la top bar (polluants et pas de temps)
// note. ne concerne pas les sources de données
import { mesures, pasDeTemps } from './appConfig.js';
import {
    getArrayFromLocalStorage,
    addItemToLocalStorageArray,
    removeItemFromLocalStorageArray,
    formatPollutantName,
    getThresholdsForPollutant,
} from './utils.js';
import { clearLayer } from './layers.js';
import { loadSource, updateButtonDisplay } from './sources.js';
import { toastManager, createCustomToast } from './toaster.js';
import { updateTimeDisplay, startAutoRefresh } from './autoRefresh.js';
import { updateModelisationButtonText } from './modelisations.js';

/**
 * Gère le changement de mesure
 * @param {string} measure - Le code de la mesure sélectionnée
 */
export function handleMeasureChange(measure) {
    // Vérification des sources incompatibles
    const activeSources = getArrayFromLocalStorage('sources_local');

    // Vérification pour NebuleAir
    if (
        activeSources.includes('nebuleair') &&
        !['pm1', 'pm25', 'pm10'].includes(measure)
    ) {
        removeItemFromLocalStorageArray('sources_local', 'nebuleair');
        clearLayer('nebuleair');
        createCustomToast({
            message: `La mesure ${formatPollutantName(measure)} n'est pas disponible pour les capteurs NebuleAir opérés par AirCarto, <strong>désactivation de la source</strong>.`,
            type: 'warning',
            title: 'Attention',
            icon: 'exclamation-triangle',
            timer: 5000,
        });
    }

    // Vérification pour AtmoSud Micro-stations
    if (
        activeSources.includes('atmoMicro') &&
        ['so2', 'nh3', 'o3', 'h2s', 'c6h6'].includes(measure)
    ) {
        removeItemFromLocalStorageArray('sources_local', 'atmoMicro');
        clearLayer('atmoMicro');
        createCustomToast({
            message: `La mesure ${formatPollutantName(measure)} n'est pas disponible pour les capteurs AtmoSud Micro-stations, <strong>désactivation de la source</strong>.`,
            type: 'warning',
            title: 'Attention',
            icon: 'exclamation-triangle',
            timer: 5000,
        });
    }

    // Mise à jour des boutons de seuil
    updateThresholdButtons();

    // Rechargement des sources actives
    const updatedActiveSources = getArrayFromLocalStorage('sources_local');
    updatedActiveSources.forEach((source) => {
        clearLayer(source);
        loadSource(source);
    });

    // Mise à jour du texte de modélisation
    updateModelisationButtonText();

    // Mise à jour de l'affichage
    updateTimeDisplay();
    startAutoRefresh();
}

/**
 * Gère le changement de pas de temps
 * @param {string} timeStep - Le code du pas de temps sélectionné
 */
export function handleTimeStepChange(timeStep) {
    const activeSources = getArrayFromLocalStorage('sources_local');

    // Vérification pour AtmoSud Micro-stations
    if (activeSources.includes('atmoMicro')) {
        if (timeStep === 'd') {
            toastManager.atmoMicroTimeStepDailyWarning();
            removeItemFromLocalStorageArray('sources_local', 'atmoMicro');
            clearLayer('atmoMicro');
        } else if (timeStep === '2min') {
            toastManager.atmoMicroTimeStepWarning();
        }
    }

    // Vérification pour AtmoSud Stations de référence
    if (activeSources.includes('atmoRef') && timeStep === '2min') {
        createCustomToast({
            message: `Le pas de temps 2 minutes n'est pas disponible pour les stations de référence AtmoSud, <strong>désactivation de la source</strong>.`,
            type: 'warning',
            title: 'Attention',
            icon: 'exclamation-triangle',
            timer: 5000,
        });
        removeItemFromLocalStorageArray('sources_local', 'atmoRef');
        clearLayer('atmoRef');
    }

    // Rechargement des sources actives
    const updatedActiveSources = getArrayFromLocalStorage('sources_local');
    updatedActiveSources.forEach((source) => {
        clearLayer(source);
        loadSource(source);
    });

    // Mise à jour de l'affichage des boutons
    updateButtonDisplay();

    // Mise à jour de l'affichage
    updateTimeDisplay();
    startAutoRefresh();
}

/**
 * Met à jour les boutons de seuil en fonction du polluant sélectionné
 */
export function updateThresholdButtons() {
    const selectedPollutant = getArrayFromLocalStorage('mesuresLocal')[0];
    const thresholds = getThresholdsForPollutant(selectedPollutant);

    // Mise à jour des info-bulles des boutons
    const buttons = {
        btn_bon: `${thresholds.bon.min} à ${thresholds.bon.max} µg/m³`,
        btn_moyen: `${thresholds.moyen.min} à ${thresholds.moyen.max} µg/m³`,
        btn_degrade: `${thresholds.degrade.min} à ${thresholds.degrade.max} µg/m³`,
        btn_mauvais: `${thresholds.mauvais.min} à ${thresholds.mauvais.max} µg/m³`,
        btn_tresMauvais: `${thresholds.tresMauvais.min} à ${thresholds.tresMauvais.max} µg/m³`,
        btn_extrMauvais: `>${thresholds.extrMauvais.min} µg/m³`,
    };

    Object.entries(buttons).forEach(([id, value]) => {
        const button = document.getElementById(id);
        if (button) {
            button.setAttribute('data-bs-title', value);
        }
    });

    // Réinitialisation des info-bulles
    const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
    );
    [...tooltipTriggerList].map((tooltipTriggerEl) => {
        const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (tooltip) {
            tooltip.dispose();
        }
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialise les sélecteurs de mesure et de pas de temps
 */
export function initializeMeasurementSelectors() {
    // Initialisation des boutons de mesures
    Object.entries(mesures).forEach(([key, mesure]) => {
        const button = document.createElement('button');
        button.innerHTML = formatPollutantName(mesure.name);
        button.classList.add('dropdown-item');

        if (
            mesure.activated &&
            isEmptyObject(getArrayFromLocalStorage('mesuresLocal'))
        ) {
            addItemToLocalStorageArray('mesuresLocal', mesure.code);
        }

        if (
            isValueInObject(
                getArrayFromLocalStorage('mesuresLocal'),
                mesure.code
            )
        ) {
            button.classList.add('active');
            document
                .querySelector('#dropdown_mesures')
                .closest('.dropdown')
                .querySelector('.selected-option').innerHTML =
                formatPollutantName(mesure.name);
        }

        button.onclick = () => {
            if (
                !isValueInObject(
                    getArrayFromLocalStorage('mesuresLocal'),
                    mesure.code
                )
            ) {
                localStorage.removeItem('mesuresLocal');
                document
                    .querySelectorAll('#dropdown_mesures button')
                    .forEach((btn) => btn.classList.remove('active'));
                addItemToLocalStorageArray('mesuresLocal', mesure.code);
                button.classList.add('active');
                document
                    .querySelector('#dropdown_mesures')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML =
                    formatPollutantName(mesure.name);
                handleMeasureChange(mesure.code);
            }
        };

        const li = document.createElement('li');
        li.appendChild(button);
        document.getElementById('dropdown_mesures').appendChild(li);
    });

    // Initialisation des boutons de pas de temps
    Object.entries(pasDeTemps).forEach(([key, timeStep]) => {
        const button = document.createElement('button');
        button.innerHTML = timeStep.name;
        button.classList.add('dropdown-item');

        if (
            timeStep.activated &&
            isEmptyObject(getArrayFromLocalStorage('pasDeTempsLocal'))
        ) {
            addItemToLocalStorageArray('pasDeTempsLocal', timeStep.code);
        }

        if (
            isValueInObject(
                getArrayFromLocalStorage('pasDeTempsLocal'),
                timeStep.code
            )
        ) {
            button.classList.add('active');
            document
                .querySelector('#dropdown_pasDeTemps')
                .closest('.dropdown')
                .querySelector('.selected-option').innerHTML = timeStep.name;
        }

        button.onclick = () => {
            if (
                !isValueInObject(
                    getArrayFromLocalStorage('pasDeTempsLocal'),
                    timeStep.code
                )
            ) {
                localStorage.removeItem('pasDeTempsLocal');
                document
                    .querySelectorAll('#dropdown_pasDeTemps button')
                    .forEach((btn) => btn.classList.remove('active'));
                addItemToLocalStorageArray('pasDeTempsLocal', timeStep.code);
                button.classList.add('active');
                document
                    .querySelector('#dropdown_pasDeTemps')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML =
                    timeStep.name;
                handleTimeStepChange(timeStep.code);
            }
        };

        const li = document.createElement('li');
        li.appendChild(button);
        document.getElementById('dropdown_pasDeTemps').appendChild(li);
    });

    // Mettre à jour les boutons de seuil
    updateThresholdButtons();
}

/**
 * Vérifie si une valeur est présente dans un objet
 * @param {Object} obj - L'objet à vérifier
 * @param {*} value - La valeur à rechercher
 * @returns {boolean} - True si la valeur est trouvée
 */
function isValueInObject(obj, value) {
    return Object.values(obj).includes(value);
}

/**
 * Vérifie si un objet est vide
 * @param {Object} obj - L'objet à vérifier
 * @returns {boolean} - True si l'objet est vide
 */
function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}
