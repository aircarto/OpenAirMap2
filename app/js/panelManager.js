import { isSourceActive } from './dataSourceManager.js';
import { retreiveHistoriqueDataStationRef } from './atmoSud_stationsRef.js';
import { retreive_historiqueData_microStation } from './atmoSud_microStations.js';
import { retreive_historiqueData_nebuleAir } from './NebuleAir.js';

class PanelManager {
    constructor() {
        this.state = {
            atmo_ref: {
                deviceId: null,
                pasDeTempsAtmo: '1h',
                historiqueChart: '1j',
                mesuresArray: [],
                pasDeTempsChart: '1h',
                pasDeTemps: '1h',
                customDateRange: {
                    start: null,
                    end: null,
                },
            },
            atmo_micro: {
                deviceId: null,
                pasDeTempsAtmo: '1h',
                historiqueChart: '1j',
                mesuresArray: [],
                pasDeTempsChart: '1h',
                pasDeTemps: '1h',
                customDateRange: {
                    start: null,
                    end: null,
                },
            },
            nebuleair: {
                deviceId: null,
                pasDeTempsAtmo: '1h',
                historiqueChart: '1j',
                mesuresArray: [],
                pasDeTempsChart: '1h',
                pasDeTemps: '1h',
                customDateRange: {
                    start: null,
                    end: null,
                },
            },
        };
        this.buttons = {
            historique: {
                custom: null,
                startDate: null,
                endDate: null,
                '1h': null,
                '3h': null,
                '24h': null,
                '7d': null,
                '30d': null,
                '365d': null,
            },
            pasDeTemps: {
                '2min': null,
                qh: null,
                h: null,
                d: null,
            },
            pollutant: {
                pm1: null,
                pm25: null,
                pm10: null,
                no2: null,
                o3: null,
                so2: null,
            },
        };
        this.currentSource = null;
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

    openPanel(source, deviceId, data) {
        console.log(
            'Opening panel for source:',
            source,
            'deviceId:',
            deviceId,
            'data:',
            data
        );
        if (!isSourceActive(source)) {
            console.log('Source non active:', source);
            return;
        }

        if (!this.state[source]) {
            console.error(`Source ${source} non définie dans l'état`);
            return;
        }

        // Mise à jour de la source courante
        this.currentSource = source;

        // Réinitialisation de l'état des boutons de polluants
        Object.keys(this.buttons.pollutant).forEach((key) => {
            if (this.buttons.pollutant[key]) {
                this.buttons.pollutant[key].checked = false;
            }
        });

        // Réinitialisation du tableau des mesures
        this.state[source].mesuresArray = [];

        // Mettre à jour l'état de la source
        this.state[source].deviceId = deviceId;
        Object.assign(this.state[source], data);

        console.log('État mis à jour pour', source, ':', this.state[source]);

        this.initializeButtons();
        this.setupButtonHandlers();
        this.updateButtonStates(source);
        this.handleAtmoSudSpecificButtons(source);

        // Appeler updateHistoriqueData immédiatement après la mise à jour de l'état
        this.updateHistoriqueData(source);
    }

    initializeButtons() {
        console.log('Initialisation des boutons...');
        this.buttons.historique.custom =
            document.getElementById('apply_date_range');
        this.buttons.historique.startDate =
            document.getElementById('start_date');
        this.buttons.historique.endDate = document.getElementById('end_date');

        ['1h', '3h', '24h', '7d', '30d', '365d'].forEach((periode) => {
            const buttonId = `btn_historique_${periode}`;
            this.buttons.historique[periode] =
                document.getElementById(buttonId);
        });

        Object.keys(this.buttons.pasDeTemps).forEach((key) => {
            const buttonId = `btn_pas_de_temps_${key.replace('-', '')}`;
            this.buttons.pasDeTemps[key] = document.getElementById(buttonId);
        });

        Object.keys(this.buttons.pollutant).forEach((key) => {
            const buttonId = `btn_poluant_${key}`;
            this.buttons.pollutant[key] = document.getElementById(buttonId);
        });
    }

    setupButtonHandlers() {
        this.setupHistoriqueButtonHandlers();
        this.setupPasDeTempsButtonHandlers();
        this.setupPollutantButtonHandlers();
    }

    setupHistoriqueButtonHandlers() {
        const btnHistoriqueCustom = this.buttons.historique.custom;
        const btnHistoriqueStartDate = this.buttons.historique.startDate;
        const btnHistoriqueEndDate = this.buttons.historique.endDate;

        if (btnHistoriqueCustom) {
            btnHistoriqueCustom.onclick = null;
        } else {
            console.warn('Bouton historique personnalisé non trouvé');
        }

        Object.entries(this.buttons.historique).forEach(([id, button]) => {
            if (button) {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                this.buttons.historique[id] = newButton;

                if (id !== 'custom' && id !== 'startDate' && id !== 'endDate') {
                    newButton.addEventListener('click', () => {
                        if (
                            this.state[this.currentSource].historiqueChart ===
                            id
                        )
                            return;

                        // Décocher tous les boutons d'historique
                        Object.entries(this.buttons.historique).forEach(
                            ([otherId, otherButton]) => {
                                if (
                                    otherButton &&
                                    otherId !== 'startDate' &&
                                    otherId !== 'endDate'
                                ) {
                                    otherButton.checked = false;
                                }
                            }
                        );

                        // Cocher le bouton sélectionné
                        newButton.checked = true;

                        // Mettre à jour l'état
                        this.state[this.currentSource].historiqueChart = id;
                        this.state[this.currentSource].customDateRange.start =
                            null;
                        this.state[this.currentSource].customDateRange.end =
                            null;

                        // Appeler updateHistoriqueData avec l'état mis à jour
                        this.updateHistoriqueData(this.currentSource);
                    });
                }
            } else {
                console.warn(`Bouton historique ${id} non trouvé`);
            }
        });
    }

    setupPasDeTempsButtonHandlers() {
        Object.entries(this.buttons.pasDeTemps).forEach(([id, button]) => {
            if (button) {
                button.addEventListener('click', () => {
                    const pasDeTemps = this.convertButtonIdToPasDeTemps(id);
                    if (
                        this.state[this.currentSource].pasDeTempsChart ===
                        pasDeTemps
                    ) {
                        return;
                    }

                    this.state[this.currentSource].pasDeTempsChart = pasDeTemps;
                    this.updatePasDeTempsButtons(false);
                    button.checked = true;
                    this.updateHistoriqueData(this.currentSource);
                });
            } else {
                console.warn(`Bouton pas de temps ${id} non trouvé`);
            }
        });
    }

    setupPollutantButtonHandlers() {
        const polluants = {
            pm1: 'pm1',
            pm25: 'pm2.5',
            pm10: 'pm10',
            no2: 'no2',
            o3: 'o3',
            so2: 'so2',
        };

        Object.entries(polluants).forEach(([buttonId, pollutant]) => {
            const button = document.getElementById(`btn_poluant_${buttonId}`);
            if (button) {
                button.type = 'checkbox';
                button.removeAttribute('name');

                button.addEventListener('click', () => {
                    if (
                        !this.currentSource ||
                        !isSourceActive(this.currentSource)
                    )
                        return;

                    const previousLength =
                        this.state[this.currentSource].mesuresArray.length;

                    if (button.checked) {
                        if (
                            !this.state[
                                this.currentSource
                            ].mesuresArray.includes(pollutant)
                        ) {
                            this.state[this.currentSource].mesuresArray.push(
                                pollutant
                            );
                        }
                    } else {
                        this.state[this.currentSource].mesuresArray =
                            this.state[this.currentSource].mesuresArray.filter(
                                (item) => item !== pollutant
                            );
                    }

                    if (
                        this.state[this.currentSource].mesuresArray.length !==
                        previousLength
                    ) {
                        this.updateHistoriqueData(this.currentSource);
                    }
                });
            }
        });
    }

    isValidDeviceId() {
        return (
            window.globalSelectedDeviceId &&
            (typeof window.globalSelectedDeviceId === 'number' ||
                (typeof window.globalSelectedDeviceId === 'string' &&
                    window.globalSelectedDeviceId.startsWith('FR')))
        );
    }

    updateHistoriqueButtons(checked) {
        Object.entries(this.buttons.historique).forEach(([id, btn]) => {
            if (btn && id !== 'startDate' && id !== 'endDate') {
                btn.checked = checked;
            }
        });
    }

    updatePasDeTempsButtons(checked) {
        Object.values(this.buttons.pasDeTemps).forEach((btn) => {
            if (btn) {
                btn.checked = checked;
            }
        });
    }

    updateButtonStates(source) {
        const pasDeTemps = this.state[source].pasDeTempsChart;
        const buttonId = this.convertPasDeTempsToButtonId(pasDeTemps);

        Object.values(this.buttons.pasDeTemps).forEach((btn) => {
            if (btn) btn.checked = false;
        });

        if (this.buttons.pasDeTemps[buttonId]) {
            this.buttons.pasDeTemps[buttonId].checked = true;
        }

        const historique = this.state[source].historiqueChart;

        Object.values(this.buttons.historique).forEach((btn) => {
            if (
                btn &&
                btn !== this.buttons.historique.startDate &&
                btn !== this.buttons.historique.endDate
            ) {
                btn.checked = false;
            }
        });

        if (this.buttons.historique[historique]) {
            this.buttons.historique[historique].checked = true;
        }

        this.state[source].mesuresArray.forEach((pollutant) => {
            const buttonId = pollutant === 'pm2.5' ? 'pm25' : pollutant;
            if (this.buttons.pollutant[buttonId]) {
                this.buttons.pollutant[buttonId].checked = true;
            }
        });
    }

    updateHistoriqueData(
        source,
        useCustomRange = false,
        startDateTime = null,
        endDateTime = null
    ) {
        console.log(
            'Mise à jour des données historiques pour la source:',
            source,
            {
                useCustomRange,
                startDateTime,
                endDateTime,
                state: this.state[source],
            }
        );

        if (!this.state[source]) {
            console.error('État invalide pour la source:', source);
            return;
        }

        if (window.amchart_root_station) {
            window.amchart_root_station.dispose();
            window.amchart_root_station = undefined;
        }

        const chartDiv = document.getElementById('chartdiv_sensor');
        if (!chartDiv) {
            console.error('Élément chartdiv_sensor non trouvé');
            return;
        }
        chartDiv.innerHTML = '';

        if (source === 'atmo_ref') {
            retreiveHistoriqueDataStationRef(
                this.state[source].deviceId,
                this.state[source].pasDeTempsChart,
                this.state[source].historiqueChart,
                this.state[source].mesuresArray,
                useCustomRange,
                startDateTime,
                endDateTime
            );
        } else if (source === 'atmo_micro') {
            retreive_historiqueData_microStation(
                this.state[source].deviceId,
                this.state[source].pasDeTempsChart,
                this.state[source].historiqueChart,
                this.state[source].mesuresArray,
                useCustomRange,
                startDateTime,
                endDateTime
            );
        } else if (source === 'nebuleair') {
            console.log(
                'Appel à retreive_historiqueData_nebuleAir avec les paramètres:',
                {
                    deviceId: this.state[source].deviceId,
                    pasDeTemps: this.state[source].pasDeTempsAtmo,
                    historique: this.state[source].historiqueChart,
                    mesuresArray: this.state[source].mesuresArray,
                    useCustomRange,
                    startDateTime,
                    endDateTime,
                }
            );

            retreive_historiqueData_nebuleAir(
                this.state[source].deviceId,
                this.state[source].pasDeTempsAtmo,
                this.state[source].historiqueChart,
                this.state[source].mesuresArray,
                useCustomRange,
                startDateTime,
                endDateTime
            );
        }
    }

    handleAtmoSudSpecificButtons(source) {
        if (source === 'atmo_ref') {
            if (this.buttons.pasDeTemps['2min']) {
                this.buttons.pasDeTemps['2min'].disabled = true;
                this.buttons.pasDeTemps['2min'].title =
                    'Pas de temps non disponible pour les stations de référence AtmoSud';
            }
        }
    }
}

export const panelManager = new PanelManager();
