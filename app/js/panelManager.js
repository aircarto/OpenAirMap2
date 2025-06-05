//layout présent dans index.html (id="side-panel")
// script pour adapter le comportement du panneau latéral en fonction des inputs utilisateurs
// en focntion du type d'appareil sélectionnés (station reference, micro-station ou NebuleAir)

import { isSourceActive } from './dataSourceManager.js';
import { retreiveHistoriqueDataStationRef } from './atmoSud_stationsRef.js';
import { retreiveHistoriqueDataMicroStation } from './atmoSud_microStations.js';
import { retreive_historiqueData_nebuleAir } from './NebuleAir.js';
import { updatePanelState } from './sidePanel.js';
import { PanelStateManager } from './PanelStateManager.js';
import { ButtonManager } from './ButtonManager.js';
import { DateManager } from './DateManager.js';
import { DataRetriever } from './DataRetriever.js';

// Variables globales pour l'état du side panel
const sidePanelState = {
    isOpen: false,
    isExpanded: false,
};

class PanelManager {
    constructor() {
        this.stateManager = new PanelStateManager();
        this.buttonManager = new ButtonManager();
        this.dateManager = new DateManager();
        this.dataRetriever = new DataRetriever();

        this.currentSource = null;

        document.addEventListener('DOMContentLoaded', () => {
            this.initializeButtons();
            this.setupButtonHandlers();
            this.setupDateRangeForm();
        });
    }

    initializeButtons() {
        this.buttonManager.initializeButtons();
    }

    setupButtonHandlers() {
        this.setupHistoriqueButtonHandlers();
        this.setupPasDeTempsButtonHandlers();
        this.setupPollutantButtonHandlers();
    }

    setupHistoriqueButtonHandlers() {
        Object.entries(this.buttonManager.buttons.historique).forEach(
            ([id, button]) => {
                if (
                    button &&
                    id !== 'custom' &&
                    id !== 'startDate' &&
                    id !== 'endDate'
                ) {
                    button.addEventListener('click', () => {
                        const source = this.stateManager.getCurrentSource();
                        if (!source) return;

                        const state = this.stateManager.getSourceState(source);
                        if (state.historiqueChart === id) return;

                        this.buttonManager.resetButtonStates('historique');
                        this.buttonManager.setButtonState(
                            'historique',
                            id,
                            true
                        );

                        this.stateManager.updateSourceState(source, {
                            historiqueChart: id,
                            customDateRange: { start: null, end: null },
                        });

                        const dateRangeForm =
                            document.getElementById('dateRangeForm');
                        if (dateRangeForm) {
                            const bsCollapse = new bootstrap.Collapse(
                                dateRangeForm,
                                { toggle: false }
                            );
                            bsCollapse.hide();
                        }

                        this.updateHistoriqueData(source);
                    });
                }
            }
        );
    }

    setupPasDeTempsButtonHandlers() {
        const source = this.stateManager.getCurrentSource();
        const state = this.stateManager.getSourceState(source);
        Object.entries(this.buttonManager.buttons.pasDeTemps).forEach(
            ([id, button]) => {
                if (button) {
                    button.addEventListener('click', () => {
                        const source = this.stateManager.getCurrentSource();
                        if (!source) return;

                        const state = this.stateManager.getSourceState(source);
                        const pasDeTemps = this.convertButtonIdToPasDeTemps(id);

                        if (state.pasDeTempsChart === pasDeTemps) return;

                        this.stateManager.updateSourceState(source, {
                            pasDeTempsChart: pasDeTemps,
                        });

                        this.buttonManager.resetButtonStates('pasDeTemps');
                        this.buttonManager.setButtonState(
                            'pasDeTemps',
                            id,
                            true
                        );

                        const useCustomRange =
                            state.historiqueChart === 'custom';
                        let startDate = null;
                        let endDate = null;

                        if (useCustomRange) {
                            startDate = state.customDateRange.start;
                            endDate = state.customDateRange.end;
                        }

                        this.updateHistoriqueData(
                            source,
                            useCustomRange,
                            startDate,
                            endDate
                        );
                    });
                }
            }
        );
    }

    setupPollutantButtonHandlers() {
        const polluants = {
            pm1: 'pm1',
            pm25: 'pm2.5',
            pm10: 'pm10',
            no2: 'no2',
            o3: 'o3',
            so2: 'so2',
            h2s: 'h2s',
            nh3: 'nh3',
            c6h6: 'c6h6',
        };

        Object.entries(polluants).forEach(([buttonId, pollutant]) => {
            const button = document.getElementById(`btn_poluant_${buttonId}`);
            if (button) {
                button.type = 'checkbox';
                button.removeAttribute('name');

                button.addEventListener('click', () => {
                    const source = this.stateManager.getCurrentSource();
                    if (!source || !isSourceActive(source)) return;

                    const state = this.stateManager.getSourceState(source);
                    const previousLength = state.mesuresArray.length;

                    if (button.checked) {
                        if (!state.mesuresArray.includes(pollutant)) {
                            state.mesuresArray.push(pollutant);
                        }
                    } else {
                        state.mesuresArray = state.mesuresArray.filter(
                            (item) => item !== pollutant
                        );
                    }

                    if (state.mesuresArray.length !== previousLength) {
                        const useCustomRange =
                            state.historiqueChart === 'custom';
                        const startDate = useCustomRange
                            ? state.customDateRange.start
                            : null;
                        const endDate = useCustomRange
                            ? state.customDateRange.end
                            : null;

                        this.updateHistoriqueData(
                            source,
                            useCustomRange,
                            startDate,
                            endDate
                        );
                    }
                });
            }
        });
    }

    setupDateRangeForm() {
        const dateRangeForm = document.getElementById('dateRangeForm');
        if (dateRangeForm) {
            dateRangeForm.addEventListener('shown.bs.collapse', () => {
                this.initializeButtons();
                this.setupButtonHandlers();
            });
        }

        document.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'apply_date_range') {
                this.handleCustomDateRange();
            }
        });
    }

    openPanel(source, deviceId, data) {
        console.log('#######################');
        console.log('openPanel');
        console.log('source: ', source);
        console.log('deviceId: ', deviceId);
        console.log('data: ', data);
        console.log('deviceData: ', window.lastSelectedDeviceData);
        console.log('#######################');

        if (!isSourceActive(source)) {
            console.log('Source non active:', source);
            return;
        }
        this.buttonManager.resetButtonStates('pollutant');

        updatePanelState(true, false);
        this.stateManager.setCurrentSource(source);
        this.stateManager.updateSourceState(source, { deviceId, ...data });

        this.updateButtonStates(source);
        this.handleSpecificButtons(source);
        this.handlePollutantButtons(source);
        this.updateHistoriqueData(source);
    }

    handleCustomDateRange() {
        const startDate = this.buttonManager.getButton(
            'historique',
            'startDate'
        ).value;
        const endDate = this.buttonManager.getButton(
            'historique',
            'endDate'
        ).value;

        const validation = this.dateManager.validateDateRange(
            startDate,
            endDate
        );
        if (!validation.valid) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: validation.error,
            });
            return;
        }

        const start = this.dateManager.setTimeToStartOfDay(validation.start);
        const end = this.dateManager.setTimeToEndOfDay(validation.end);

        const source = this.stateManager.getCurrentSource();
        const formattedStart = this.dateManager.formatDateForSource(
            start,
            source
        );
        const formattedEnd = this.dateManager.formatDateForSource(end, source);

        this.stateManager.updateSourceState(source, {
            historiqueChart: 'custom',
            customDateRange: { start: formattedStart, end: formattedEnd },
        });

        this.buttonManager.resetButtonStates('historique');
        this.updateHistoriqueData(source, true, formattedStart, formattedEnd);
    }

    updateHistoriqueData(
        source,
        useCustomRange = false,
        startDateTime = null,
        endDateTime = null
    ) {
        const state = this.stateManager.getSourceState(source);
        if (!state) return;

        this.dataRetriever.retrieveData(
            source,
            state,
            useCustomRange,
            startDateTime,
            endDateTime
        );
    }

    updateButtonStates(source) {
        const state = this.stateManager.getSourceState(source);
        if (!state) return;

        // Mise à jour des boutons de pas de temps
        const pasDeTemps = state.pasDeTempsChart;
        const buttonId = this.convertPasDeTempsToButtonId(pasDeTemps);
        this.buttonManager.resetButtonStates('pasDeTemps');
        this.buttonManager.setButtonState('pasDeTemps', buttonId, true);

        // Mise à jour des boutons d'historique
        const historique = state.historiqueChart;
        this.buttonManager.resetButtonStates('historique');
        this.buttonManager.setButtonState('historique', historique, true);

        // Mise à jour des boutons de polluants
        state.mesuresArray.forEach((pollutant) => {
            const buttonId = this.getPollutantButtonId(pollutant);
            this.buttonManager.setButtonState('pollutant', buttonId, true);
        });
    }

    handleSpecificButtons(source) {
        // Réinitialiser l'état de tous les boutons de pas de temps
        Object.keys(this.buttonManager.buttons.pasDeTemps).forEach(
            (buttonId) => {
                this.buttonManager.setButtonDisabled(
                    'pasDeTemps',
                    buttonId,
                    false
                );
            }
        );

        if (source === 'atmoRef') {
            this.buttonManager.setButtonDisabled(
                'pasDeTemps',
                'scan',
                true,
                'Pas de temps non disponible pour les stations de référence AtmoSud'
            );
        } else if (source === 'atmoMicro') {
            this.buttonManager.setButtonDisabled(
                'pasDeTemps',
                'd',
                true,
                'pas de temps non disponible pour les micro-stations AtmoSud'
            );
            const deviceData = window.lastSelectedDeviceData;
            if (deviceData?.pasDeTemps) {
                const pasDeTempsEnMinutes = Math.round(
                    deviceData.pasDeTemps / 60
                );
                const label = document.querySelector(
                    'label[for="btn_pasDeTemps_scan"]'
                );
                if (label) {
                    // On réinitialise d'abord le texte du label
                    label.textContent = 'scan';
                    // Puis on ajoute le pas de temps en minutes
                    label.textContent += ` ${pasDeTempsEnMinutes} min`;
                }

                // On coche le bouton scan si le pas de temps est brute
                const state = this.stateManager.getSourceState(source);
                if (state?.pasDeTempsChart === 'brute') {
                    const scanButton = document.getElementById(
                        'btn_pasDeTemps_scan'
                    );
                    if (scanButton) {
                        scanButton.checked = true;
                    }
                }
            }
        } else if (source === 'nebuleair') {
            const label = document.querySelector(
                'label[for="btn_pasDeTemps_scan"]'
            );
            if (label) {
                // On réinitialise d'abord le texte du label
                label.textContent = 'scan';
                // Puis on ajoute le pas de temps en minutes
                label.textContent += ` 2 min`;
            }

            // On vérifie le pas de temps actuel
            const state = this.stateManager.getSourceState(source);
            if (state?.pasDeTempsChart === '2min') {
                // On sélectionne le bouton scan uniquement si le pas de temps est 2 min
                const scanButton = document.getElementById(
                    'btn_pasDeTemps_scan'
                );
                if (scanButton) {
                    scanButton.checked = true;
                }
            }
        }
    }

    handlePollutantButtons(source) {
        // Liste de tous les polluants possibles
        const allPollutants = {
            pm1: 'PM1',
            pm25: 'PM25',
            pm10: 'PM10',
            no2: 'NO2',
            o3: 'O3',
            so2: 'SO2',
            h2s: 'H2S',
            nh3: 'NH3',
            c6h6: 'C6H6',
        };

        if (source === 'nebuleair') {
            // Pour NebuleAir, on n'active que PM1, PM2.5 et PM10
            Object.entries(allPollutants).forEach(([buttonId, pollutant]) => {
                const isSupported = ['pm1', 'pm25', 'pm10'].includes(buttonId);
                this.buttonManager.setButtonDisabled(
                    'pollutant',
                    buttonId,
                    !isSupported,
                    `Polluant ${pollutant} non supporté par les capteurs NebuleAir`
                );
            });
        } else if (source === 'atmoRef') {
            // Pour les stations de référence AtmoSud
            const deviceData = window.lastSelectedDeviceData;
            if (!deviceData || !deviceData.variables) return;

            // Récupération des polluants supportés
            const supportedPollutants = new Set();
            Object.values(deviceData.variables)
                .filter((variable) => variable.en_service)
                .forEach((variable) => {
                    const labelLower = variable.label.toLowerCase();
                    // Vérification exacte des formats pour chaque polluant pour éviter conflit PM10/PM1
                    if (
                        labelLower === 'pm1' ||
                        labelLower === 'particules en suspension <1 µm'
                    ) {
                        supportedPollutants.add('pm1');
                    }
                    if (
                        labelLower === 'pm2.5' ||
                        labelLower === 'particules en suspension <2.5 µm'
                    ) {
                        supportedPollutants.add('pm25');
                    }
                    if (
                        labelLower === 'pm10' ||
                        labelLower === 'particules en suspension <10 µm'
                    ) {
                        supportedPollutants.add('pm10');
                    }
                    if (
                        labelLower === 'no2' ||
                        labelLower === "dioxyde d'azote"
                    ) {
                        supportedPollutants.add('no2');
                    }
                    if (labelLower === 'o3' || labelLower === 'ozone') {
                        supportedPollutants.add('o3');
                    }
                    if (
                        labelLower === 'so2' ||
                        labelLower === 'dioxyde de soufre'
                    ) {
                        supportedPollutants.add('so2');
                    }
                });

            // Gestion des boutons de polluants
            Object.entries(allPollutants).forEach(([buttonId, pollutant]) => {
                const isSupported = supportedPollutants.has(buttonId);
                this.buttonManager.setButtonDisabled(
                    'pollutant',
                    buttonId,
                    !isSupported,
                    `Polluant ${pollutant} non supporté par cette station`
                );
            });
        } else {
            // Pour les autres sources
            const deviceData = window.lastSelectedDeviceData;
            if (!deviceData || !deviceData.polluantMesure) return;

            const supportedPollutants = deviceData.polluantMesure.map((p) =>
                p.toLowerCase()
            );

            Object.entries(allPollutants).forEach(([buttonId, pollutant]) => {
                const isSupported = supportedPollutants.includes(
                    pollutant.toLowerCase()
                );
                this.buttonManager.setButtonDisabled(
                    'pollutant',
                    buttonId,
                    !isSupported,
                    `Polluant ${pollutant} non supporté par ce capteur`
                );
            });
        }
    }

    convertPasDeTempsToButtonId(pasDeTemps) {
        const conversions = {
            'quart-horaire': 'qh',
            horaire: 'h',
            journalière: 'd',
            '2min': '2min',
            brute: 'scan',
        };
        return conversions[pasDeTemps] || pasDeTemps;
    }

    convertButtonIdToPasDeTemps(buttonId) {
        const conversions = {
            qh: 'quart-horaire',
            h: 'horaire',
            d: 'journalière',
            '2min': '2min',
            scan: 'brute',
        };
        return conversions[buttonId] || buttonId;
    }

    getPollutantButtonId(pollutant) {
        const conversions = {
            'pm2.5': 'pm25',
            pm25: 'pm25',
            pm1: 'pm1',
            pm10: 'pm10',
            no2: 'no2',
            o3: 'o3',
            so2: 'so2',
            h2s: 'h2s',
            nh3: 'nh3',
            c6h6: 'c6h6',
        };
        return conversions[pollutant] || pollutant;
    }
}

export const panelManager = new PanelManager();
