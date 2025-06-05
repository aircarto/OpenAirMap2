import { modelisations } from './appConfig.js';
import {
    getArrayFromLocalStorage,
    removeItemFromLocalStorageArray,
    addItemToLocalStorageArray,
} from './utils.js';
import { clearLayer } from './layers.js';
import { loadModPM, loadModIcair, loadModVent } from './atmoSud_mod.js';

// Fonction pour obtenir le nom du polluant actif
function getActivePollutantName() {
    const activePollutants = getArrayFromLocalStorage('mesuresLocal');
    if (!activePollutants || activePollutants.length === 0) return '';

    const pollutantCode = activePollutants[0];
    const pollutantNames = {
        pm1: 'PM₁',
        pm25: 'PM₂.₅',
        pm10: 'PM₁₀',
        no2: 'NO₂',
        so2: 'SO₂',
        o3: 'O₃',
        h2s: 'H₂S',
        nh3: 'NH₃',
        c6h6: 'C₆H₆',
    };

    return pollutantNames[pollutantCode] || pollutantCode;
}

// Fonction pour mettre à jour le texte du bouton de modélisation
export function updateModelisationButtonText() {
    const selectedOptionSpan = document.getElementById(
        'modelisation-selected-option'
    );
    if (!selectedOptionSpan) return;

    const activeSources = getArrayFromLocalStorage('sources_local');
    const activeModelisation = Object.values(modelisations).find((model) =>
        activeSources.includes(model.code)
    );

    if (activeModelisation) {
        if (activeModelisation.code === 'modPm') {
            const pollutantName = getActivePollutantName();
            selectedOptionSpan.textContent = `${activeModelisation.name} ${pollutantName}`;
        } else {
            selectedOptionSpan.textContent = activeModelisation.name;
        }
    } else {
        selectedOptionSpan.textContent = 'Cartes de modélisation';
    }
}

export function initializeModelisationButtons() {
    const dropdownModelisations = document.getElementById(
        'dropdown_modelisations'
    );
    const selectedOptionSpan = document.getElementById(
        'modelisation-selected-option'
    );

    if (!dropdownModelisations || !selectedOptionSpan) {
        console.error('Éléments manquants:', {
            dropdown: !dropdownModelisations,
            selectedOption: !selectedOptionSpan,
        });
        return;
    }

    // Vider le menu déroulant
    dropdownModelisations.innerHTML = '';

    // Créer un bouton pour chaque modélisation
    Object.values(modelisations).forEach((model) => {
        const button = document.createElement('button');
        button.className = 'dropdown-item';
        button.textContent = model.name;
        button.dataset.model = model.code;

        // Ajouter une infobulle avec la description
        button.title = model.description;

        button.addEventListener('click', () => {
            console.log('Clic sur:', model.name);
            const activeSources = getArrayFromLocalStorage('sources_local');

            // Vérifier si l'autre modélisation est active
            const otherModel = Object.values(modelisations).find(
                (m) => m.code !== model.code
            );
            if (activeSources.includes(otherModel.code)) {
                removeItemFromLocalStorageArray(
                    'sources_local',
                    otherModel.code
                );
                clearLayer(otherModel.code);
            }

            if (activeSources.includes(model.code)) {
                removeItemFromLocalStorageArray('sources_local', model.code);
                clearLayer(model.code);
                button.classList.remove('active');
            } else {
                addItemToLocalStorageArray('sources_local', model.code);
                loadModelisation(model.code);
                button.classList.add('active');
            }

            updateButtonDisplay();
        });

        dropdownModelisations.appendChild(button);
    });

    // Mettre à jour l'affichage des boutons
    updateButtonDisplay();
}

function loadModelisation(modelCode) {
    try {
        switch (modelCode) {
            case 'modPm':
                loadModPM(getArrayFromLocalStorage('mesuresLocal')[0]);
                break;
            case 'icairh':
                loadModIcair();
                break;
            case 'vent':
                loadModVent();
                break;
        }
    } catch (error) {
        console.error(
            `Erreur lors du chargement de la modélisation ${modelCode}:`,
            error
        );
    }
}

function updateButtonDisplay() {
    const activeSources = getArrayFromLocalStorage('sources_local');
    const selectedOptionSpan = document.getElementById(
        'modelisation-selected-option'
    );

    document
        .querySelectorAll('#dropdown_modelisations button')
        .forEach((button) => {
            const modelCode = button.dataset.model;
            const isActive = activeSources.includes(modelCode);
            button.classList.toggle('active', isActive);
        });

    updateModelisationButtonText();
}
