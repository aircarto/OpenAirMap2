import { mesures, pas_de_temps } from './appConfig.js';
import {
    getArrayFromLocalStorage,
    saveArrayToLocalStorage,
    addItemToLocalStorageArray,
    removeItemFromLocalStorageArray,
    formatPollutantName,
    getThresholdsForPollutant,
} from './utils.js';
import { clearLayer } from './layers.js';
import { loadSource } from './sources.js';
import { toastManager, createCustomToast } from './toaster.js';
import { updateTimeDisplay, startAutoRefresh } from './autoRefresh.js';

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
        activeSources.includes('atmo_micro') &&
        ['so2', 'nh3', 'o3', 'h2s', 'c6h6'].includes(measure)
    ) {
        removeItemFromLocalStorageArray('sources_local', 'atmo_micro');
        clearLayer('atmo_micro');
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
    if (activeSources.includes('atmo_micro')) {
        if (timeStep === 'd') {
            toastManager.atmoMicroTimeStepDailyWarning();
            removeItemFromLocalStorageArray('sources_local', 'atmo_micro');
            clearLayer('atmo_micro');
        } else if (timeStep === '2min') {
            toastManager.atmoMicroTimeStepWarning();
        }
    }

    // Vérification pour AtmoSud Stations de référence
    if (
        activeSources.includes('atmo_ref') &&
        (timeStep === '2min' || timeStep === 'instantane')
    ) {
        toastManager.atmoRefTimeStepWarning();
        removeItemFromLocalStorageArray('sources_local', 'atmo_ref');
        clearLayer('atmo_ref');
    }

    // Vérification pour NebuleAir
    if (activeSources.includes('nebuleair') && timeStep === 'instantane') {
        createCustomToast({
            message: `Les capteurs NebuleAir opérés par AirCarto ne sont pas disponibles pour le pas de temps instantané. Source désactivée.`,
            type: 'warning',
            title: 'Attention',
            icon: 'exclamation-triangle',
            timer: 5000,
        });
        removeItemFromLocalStorageArray('sources_local', 'nebuleair');
        clearLayer('nebuleair');
    }

    // Rechargement des sources actives
    const updatedActiveSources = getArrayFromLocalStorage('sources_local');
    updatedActiveSources.forEach((source) => {
        clearLayer(source);
        loadSource(source);
    });

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
        btn_tres_mauvais: `${thresholds.tres_mauvais.min} à ${thresholds.tres_mauvais.max} µg/m³`,
        btn_extr_mauvais: `>${thresholds.extr_mauvais.min} µg/m³`,
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
    Object.entries(pas_de_temps).forEach(([key, timeStep]) => {
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
                .querySelector('#dropdown_pas_de_temps')
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
                    .querySelectorAll('#dropdown_pas_de_temps button')
                    .forEach((btn) => btn.classList.remove('active'));
                addItemToLocalStorageArray('pasDeTempsLocal', timeStep.code);
                button.classList.add('active');
                document
                    .querySelector('#dropdown_pas_de_temps')
                    .closest('.dropdown')
                    .querySelector('.selected-option').innerHTML =
                    timeStep.name;
                handleTimeStepChange(timeStep.code);
            }
        };

        const li = document.createElement('li');
        li.appendChild(button);
        document.getElementById('dropdown_pas_de_temps').appendChild(li);
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
