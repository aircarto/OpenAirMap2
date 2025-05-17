import { isSourceActive } from './dataSourceManager.js';
import { retreiveHistoriqueDataStationRef } from './atmoSud_stationsRef.js';
import { retreive_historiqueData_microStation } from './atmoSud_microStations.js';
import { retreive_historiqueData_nebuleAir } from './NebuleAir.js';
import { updatePanelState } from './sidePanel.js';

// Variables globales pour l'état du side panel
let sidePanelState = {
    isOpen: false,
    isExpanded: false,
};

class PanelManager {
    constructor() {
        this.state = {
            atmo_ref: {
                deviceId: null,
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
                h2s: null,
                nh3: null,
            },
        };
        this.currentSource = null;

        // Initialiser les boutons après le chargement du DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeButtons();
            this.setupButtonHandlers();

            // Ajouter un écouteur pour le collapse
            const dateRangeForm = document.getElementById('dateRangeForm');
            if (dateRangeForm) {
                dateRangeForm.addEventListener('shown.bs.collapse', () => {
                    console.log('Formulaire de plage de dates affiché');
                    // Réinitialiser les boutons quand le formulaire est affiché
                    this.initializeButtons();
                    this.setupButtonHandlers();
                });
            }

            // Délégation d'événements pour le bouton Appliquer
            document.addEventListener('click', (event) => {
                if (event.target && event.target.id === 'apply_date_range') {
                    console.log('Bouton Appliquer cliqué via délégation');
                    this.handleCustomDateRange();
                }
            });
        });
    }

    convertPasDeTempsToButtonId(pasDeTemps) {
        const conversions = {
            'quart-horaire': 'qh',
            horaire: 'h',
            journalière: 'd',
            '2min': '2min',
            brute: '2min',
        };

        // Gérer les pas de temps dynamiques (ex: "5min", "15min")
        if (pasDeTemps.match(/^\d+min$/)) {
            return pasDeTemps;
        }

        return conversions[pasDeTemps] || pasDeTemps;
    }

    convertButtonIdToPasDeTemps(buttonId) {
        const conversions = {
            qh: 'quart-horaire',
            h: 'horaire',
            d: 'journalière',
            '2min': '2min',
        };

        // Gérer les pas de temps dynamiques (ex: "5min", "15min")
        if (buttonId.match(/^\d+min$/)) {
            return buttonId;
        }

        return conversions[buttonId] || buttonId;
    }

    openPanel(source, deviceId, data) {
        if (!isSourceActive(source)) {
            console.log('Source non active:', source);
            return;
        }

        if (!this.state[source]) {
            console.error(`Source ${source} non définie dans l'état`);
            return;
        }

        // Mise à jour de l'état du panneau
        updatePanelState(true, false);

        // Mise à jour de la source courante
        this.currentSource = source;

        // Réinitialisation de l'état des boutons de polluants
        Object.keys(this.buttons.pollutant).forEach((key) => {
            if (this.buttons.pollutant[key]) {
                this.buttons.pollutant[key].checked = false;
                // Désactiver les boutons non supportés par NebuleAir
                if (source === 'nebuleair') {
                    if (['no2', 'o3', 'so2', 'nh3', 'h2s'].includes(key)) {
                        this.buttons.pollutant[key].disabled = true;
                        this.buttons.pollutant[key].title =
                            'Polluant non supporté par NebuleAir';
                    } else {
                        this.buttons.pollutant[key].disabled = false;
                        this.buttons.pollutant[key].title = '';
                    }
                } else if (source === 'atmo_micro') {
                    // Récupérer les données du capteur depuis window.deviceMarkers
                    const deviceData = window.deviceMarkers?.[deviceId]?.data;

                    if (deviceData && deviceData.variablesMesure) {
                        const variablesMesure = deviceData.variablesMesure.map(
                            (v) => v.toUpperCase()
                        );

                        const polluantMapping = {
                            pm1: 'PM1',
                            pm25: 'PM2.5',
                            pm10: 'PM10',
                            no2: 'NO2',
                            o3: 'O3',
                            so2: 'SO2',
                            h2s: 'H2S',
                            nh3: 'NH3',
                        };

                        const polluantMesure = variablesMesure.includes(
                            polluantMapping[key]
                        );
                        this.buttons.pollutant[key].disabled = !polluantMesure;
                        this.buttons.pollutant[key].title = polluantMesure
                            ? ''
                            : 'Polluant non mesuré par cette station';
                    } else {
                        console.log(
                            'Aucune donnée de polluants trouvée pour ce capteur'
                        );
                        this.buttons.pollutant[key].disabled = false;
                        this.buttons.pollutant[key].title = '';
                    }
                } else if (source === 'atmo_ref') {
                    console.log('mesuresArray: ', data.mesuresArray);
                    const deviceData = window.lastSelectedDeviceData;
                    if (deviceData && deviceData.polluantMesure) {
                        const polluantMapping = {
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

                        Object.entries(this.buttons.pollutant).forEach(
                            ([key, button]) => {
                                const polluantMesure =
                                    deviceData.polluantMesure.includes(
                                        polluantMapping[key]
                                    );
                                button.disabled = !polluantMesure;
                                button.title = polluantMesure
                                    ? ''
                                    : 'Polluant non mesuré par cette station';
                            }
                        );
                    }
                } else {
                    this.buttons.pollutant[key].disabled = false;
                    this.buttons.pollutant[key].title = '';
                }
            }
        });

        // Désactiver le bouton de pas de temps journalier pour atmo_micro
        if (source === 'atmo_micro' && this.buttons.pasDeTemps['d']) {
            this.buttons.pasDeTemps['d'].disabled = true;
            this.buttons.pasDeTemps['d'].title =
                'Pas de temps non disponible pour les micro-stations AtmoSud';
        } else if (this.buttons.pasDeTemps['d']) {
            this.buttons.pasDeTemps['d'].disabled = false;
            this.buttons.pasDeTemps['d'].title = '';
        }

        // Réinitialisation du tableau des mesures
        this.state[source].mesuresArray = [];

        // Mettre à jour l'état de la source
        this.state[source].deviceId = deviceId;
        Object.assign(this.state[source], data);

        this.initializeButtons();
        this.setupButtonHandlers();
        this.updateButtonStates(source);
        this.handleAtmoSudSpecificButtons(source);

        // Appeler updateHistoriqueData immédiatement après la mise à jour de l'état
        this.updateHistoriqueData(source);
    }

    initializeButtons() {
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
            btnHistoriqueCustom.addEventListener('click', () => {
                if (
                    !btnHistoriqueStartDate.value ||
                    !btnHistoriqueEndDate.value
                ) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erreur',
                        text: 'Veuillez sélectionner une date de début et une date de fin',
                    });
                    return;
                }

                const startDate = new Date(btnHistoriqueStartDate.value);
                const endDate = new Date(btnHistoriqueEndDate.value);

                if (startDate > endDate) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erreur',
                        text: 'La date de début doit être antérieure à la date de fin',
                    });
                    return;
                }

                // Décocher tous les boutons d'historique prédéfinis
                Object.entries(this.buttons.historique).forEach(
                    ([otherId, otherButton]) => {
                        if (
                            otherButton &&
                            otherId !== 'startDate' &&
                            otherId !== 'endDate' &&
                            otherId !== 'custom'
                        ) {
                            otherButton.checked = false;
                        }
                    }
                );

                // Mettre à jour l'état avec la plage personnalisée
                this.state[this.currentSource].historiqueChart = 'custom';
                this.state[this.currentSource].customDateRange.start =
                    startDate;
                this.state[this.currentSource].customDateRange.end = endDate;

                console.log(
                    "Mise à jour de l'état avec la plage personnalisée:",
                    {
                        source: this.currentSource,
                        startDate,
                        endDate,
                    }
                );

                // Appeler updateHistoriqueData avec la plage personnalisée
                this.updateHistoriqueData(
                    this.currentSource,
                    true,
                    startDate,
                    endDate
                );
            });
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

                    // Conserver la plage de dates personnalisée si elle existe
                    const useCustomRange =
                        this.state[this.currentSource].historiqueChart ===
                        'custom';
                    let startDate = null;
                    let endDate = null;

                    if (useCustomRange) {
                        // Formater les dates selon la source
                        if (this.currentSource === 'nebuleair') {
                            startDate = this.formatDateForNebuleAir(
                                this.state[this.currentSource].customDateRange
                                    .start
                            );
                            endDate = this.formatDateForNebuleAir(
                                this.state[this.currentSource].customDateRange
                                    .end
                            );
                        } else {
                            startDate = this.formatDateForAPI(
                                this.state[this.currentSource].customDateRange
                                    .start
                            );
                            endDate = this.formatDateForAPI(
                                this.state[this.currentSource].customDateRange
                                    .end
                            );
                        }
                    }

                    this.updateHistoriqueData(
                        this.currentSource,
                        useCustomRange,
                        startDate,
                        endDate
                    );
                });
            } else {
                console.warn(`Bouton pas de temps ${id} non trouvé`);
            }
        });
    }

    setupPollutantButtonHandlers() {
        const polluants = {
            pm1: 'pm1',
            pm25: this.currentSource === 'nebuleair' ? 'pm25' : 'pm2.5',
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
                        // Conserver la plage de dates personnalisée si elle existe
                        const useCustomRange =
                            this.state[this.currentSource].historiqueChart ===
                            'custom';
                        let startDate = null;
                        let endDate = null;

                        if (useCustomRange) {
                            // Formater les dates selon la source
                            if (this.currentSource === 'nebuleair') {
                                startDate = this.formatDateForNebuleAir(
                                    this.state[this.currentSource]
                                        .customDateRange.start
                                );
                                endDate = this.formatDateForNebuleAir(
                                    this.state[this.currentSource]
                                        .customDateRange.end
                                );
                            } else {
                                startDate = this.formatDateForAPI(
                                    this.state[this.currentSource]
                                        .customDateRange.start
                                );
                                endDate = this.formatDateForAPI(
                                    this.state[this.currentSource]
                                        .customDateRange.end
                                );
                            }
                        }

                        this.updateHistoriqueData(
                            this.currentSource,
                            useCustomRange,
                            startDate,
                            endDate
                        );
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

        // Mapping des polluants selon la source
        const polluants = {
            'pm2.5': 'pm25',
            pm25: 'pm25',
            pm1: 'pm1',
            pm10: 'pm10',
            no2: 'no2',
            o3: 'o3',
            so2: 'so2',
        };

        this.state[source].mesuresArray.forEach((pollutant) => {
            const buttonId = polluants[pollutant] || pollutant;
            if (this.buttons.pollutant[buttonId]) {
                this.buttons.pollutant[buttonId].checked = true;
            }
        });
    }

    formatDateForNebuleAir(date) {
        // Formater la date au format YYYY-MM-DDTHH:mm:ssZ
        return date.toISOString().split('.')[0] + 'Z';
    }

    updateHistoriqueData(
        source,
        useCustomRange = false,
        startDateTime = null,
        endDateTime = null
    ) {
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

        // Convertir le pas de temps selon la source
        let pasDeTemps = this.state[source].pasDeTempsChart;
        if (source === 'nebuleair') {
            const conversions = {
                'quart-horaire': '15m',
                horaire: '1h',
                journalière: '1d',
                '2min': '2m',
            };
            pasDeTemps = conversions[pasDeTemps] || pasDeTemps;
        }

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
                    pasDeTemps: pasDeTemps,
                    historique: this.state[source].historiqueChart,
                    mesuresArray: this.state[source].mesuresArray,
                    useCustomRange,
                    startDateTime: startDateTime
                        ? this.formatDateForNebuleAir(new Date(startDateTime))
                        : null,
                    endDateTime: endDateTime
                        ? this.formatDateForNebuleAir(new Date(endDateTime))
                        : null,
                }
            );

            retreive_historiqueData_nebuleAir(
                this.state[source].deviceId,
                pasDeTemps,
                this.state[source].historiqueChart,
                this.state[source].mesuresArray,
                useCustomRange,
                startDateTime
                    ? this.formatDateForNebuleAir(new Date(startDateTime))
                    : null,
                endDateTime
                    ? this.formatDateForNebuleAir(new Date(endDateTime))
                    : null
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
        } else if (source === 'atmo_micro') {
            const deviceData =
                window.deviceMarkers?.[this.state[source].deviceId]?.data;
            if (
                deviceData &&
                deviceData.pas_de_temps &&
                this.buttons.pasDeTemps['2min']
            ) {
                const pasDeTempsEnSecondes = deviceData.pas_de_temps;
                const pasDeTempsEnMinutes = Math.round(
                    pasDeTempsEnSecondes / 60
                );

                // Mettre à jour le texte du label
                const label = document.querySelector(
                    'label[for="btn_pas_de_temps_2min"]'
                );
                if (label) {
                    label.textContent = `${pasDeTempsEnMinutes} min`;
                }

                // Mettre à jour le pas de temps dans l'état si nécessaire
                if (this.state[source].pasDeTempsChart === '2min') {
                    this.state[source].pasDeTempsChart =
                        `${pasDeTempsEnMinutes}min`;
                }
            }
        }
    }

    formatDateForAPI(date) {
        // Formater la date au format YYYY-MM-DDTHH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    handleCustomDateRange() {
        const startDate = document.getElementById('start_date').value;
        const endDate = document.getElementById('end_date').value;

        console.log('Dates sélectionnées:', { start: startDate, end: endDate });

        if (!startDate || !endDate) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Veuillez sélectionner une date de début et une date de fin',
            });
            return;
        }

        // Créer les dates avec des heures spécifiques
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Début de la journée (00:00:00)

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Fin de la journée (23:59:59)

        if (start > end) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'La date de début doit être antérieure à la date de fin',
            });
            return;
        }

        // Décocher tous les boutons d'historique prédéfinis
        Object.entries(this.buttons.historique).forEach(
            ([otherId, otherButton]) => {
                if (
                    otherButton &&
                    otherId !== 'startDate' &&
                    otherId !== 'endDate' &&
                    otherId !== 'custom'
                ) {
                    otherButton.checked = false;
                }
            }
        );

        // Mettre à jour l'état avec la plage personnalisée
        this.state[this.currentSource].historiqueChart = 'custom';
        this.state[this.currentSource].customDateRange.start = start;
        this.state[this.currentSource].customDateRange.end = end;

        console.log("Mise à jour de l'état avec la plage personnalisée:", {
            source: this.currentSource,
            start: this.formatDateForAPI(start),
            end: this.formatDateForAPI(end),
        });

        // Appeler updateHistoriqueData avec la plage personnalisée
        this.updateHistoriqueData(
            this.currentSource,
            true,
            this.formatDateForAPI(start),
            this.formatDateForAPI(end)
        );
    }
}

export const panelManager = new PanelManager();
