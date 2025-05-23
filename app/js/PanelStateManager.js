export class PanelStateManager {
    constructor() {
        this.state = {
            atmo_ref: this.createDefaultSourceState(),
            atmo_micro: this.createDefaultSourceState(),
            nebuleair: this.createDefaultSourceState(),
        };
        this.currentSource = null;
    }

    createDefaultSourceState() {
        return {
            deviceId: null,
            historiqueChart: '1j',
            mesuresArray: [],
            pasDeTempsChart: '1h',
            pasDeTemps: '1h',
            customDateRange: {
                start: null,
                end: null,
            },
        };
    }

    setCurrentSource(source) {
        this.currentSource = source;
    }

    getCurrentSource() {
        return this.currentSource;
    }

    getSourceState(source) {
        return this.state[source];
    }

    updateSourceState(source, updates) {
        if (this.state[source]) {
            Object.assign(this.state[source], updates);
        }
    }

    updateMesuresArray(source, mesures) {
        if (this.state[source]) {
            this.state[source].mesuresArray = mesures;
        }
    }

    updateCustomDateRange(source, start, end) {
        if (this.state[source]) {
            this.state[source].customDateRange = { start, end };
        }
    }
}
