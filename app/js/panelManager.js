//layout présent dans index.html (id="side-panel")
// script pour adapter le comportement du panneau latéral en fonction des inputs utilisateurs
// en focntion du type d'appareil sélectionnés (station reference, micro-station ou NebuleAir)

import { isSourceActive } from './dataSourceManager.js';
import { retreiveHistoriqueDataStationRef } from './atmoSud_stationsRef.js';
import { retreive_historiqueData_microStation } from './atmoSud_microStations.js';
import { retreive_historiqueData_nebuleAir } from './NebuleAir.js';
import { updatePanelState } from './sidePanel.js';
import { PanelStateManager } from './PanelStateManager.js';
import { ButtonManager } from './ButtonManager.js';
import { DateManager } from './DateManager.js';
import { DataRetriever } from './DataRetriever.js';

// Variables globales pour l'état du side panel
let sidePanelState = {
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
                        console.log('#######################');
                        console.log('setupHistoriqueButtonHandlers');
                        console.log('source: ', source);
                        console.log('state: ', state);
                        console.log('id: ', id);
                        console.log('#######################');
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
        console.log('setupPasDeTempsButtonHandlers');
        console.log('buttons: ', this.buttonManager.buttons.pasDeTemps);
        const source = this.stateManager.getCurrentSource();
        console.log('source: ', source);
        const state = this.stateManager.getSourceState(source);
        console.log('state: ', state);
        console.log('#######################');
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
        console.log('#######################');
        const selectedDevice = window.lastSelectedDevice;
        console.log('selectedDevice: ', selectedDevice);
        console.log('#######################');
        if (!isSourceActive(source)) {
            console.log('Source non active:', source);
            return;
        }

        updatePanelState(true, false);
        this.stateManager.setCurrentSource(source);
        this.stateManager.updateSourceState(source, { deviceId, ...data });

        this.updateButtonStates(source);
        this.handleAtmoSudSpecificButtons(source);
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

    handleAtmoSudSpecificButtons(source) {
        if (source === 'atmo_ref') {
            this.buttonManager.setButtonDisabled(
                'pasDeTemps',
                '2min',
                true,
                'Pas de temps non disponible pour les stations de référence AtmoSud'
            );
        } else if (source === 'atmo_micro') {
            this.buttonManager.setButtonDisabled(
                'pasDeTemps',
                'd',
                true,
                'pas de temps non disponible pour les micro-stations AtmoSud'
            );
            const deviceData =
                window.deviceMarkers?.[
                    this.stateManager.getSourceState(source).deviceId
                ]?.data;
            if (deviceData?.pas_de_temps) {
                const pasDeTempsEnMinutes = Math.round(
                    deviceData.pas_de_temps / 60
                );
                const label = document.querySelector(
                    'label[for="btn_pas_de_temps_2min"]'
                );
                if (label) {
                    label.textContent = `${pasDeTempsEnMinutes} min`;
                }
            }
        }
    }

    handlePollutantButtons(source) {
        console.log('handlePollutantButtons');
        console.log('source: ', source);
        console.log('#######################');

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
        } else {
            // Pour les autres sources, on utilise les données du capteur
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
        };
        return conversions[pasDeTemps] || pasDeTemps;
    }

    convertButtonIdToPasDeTemps(buttonId) {
        const conversions = {
            qh: 'quart-horaire',
            h: 'horaire',
            d: 'journalière',
            '2min': '2min',
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
