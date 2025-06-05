import { retreiveHistoriqueDataStationRef } from './atmoSud_stationsRef.js';
import { retreiveHistoriqueDataMicroStation } from './atmoSud_microStations.js';
import { retreive_historiqueData_nebuleAir } from './NebuleAir.js';

export class DataRetriever {
    constructor() {
        this.chartDiv = document.getElementById('chartdiv_sensor');
    }

    clearChart() {
        if (window.amchart_root_station) {
            window.amchart_root_station.dispose();
            window.amchart_root_station = undefined;
        }

        if (this.chartDiv) {
            this.chartDiv.innerHTML = '';
        }
    }

    convertPasDeTempsForNebuleAir(pasDeTemps) {
        const conversions = {
            'quart-horaire': '15m',
            horaire: '1h',
            journalière: '1d',
            '2min': '2m',
        };
        return conversions[pasDeTemps] || pasDeTemps;
    }

    convertPasDeTempsForAtmoSud(pasDeTemps) {
        const conversions = {
            '2min': '2m',
            qh: 'quart-horaire',
            h: 'horaire',
            d: 'journalière',
        };
        return conversions[pasDeTemps] || pasDeTemps;
    }

    retrieveData(
        source,
        state,
        useCustomRange = false,
        startDateTime = null,
        endDateTime = null
    ) {
        if (!this.chartDiv) {
            console.error('Élément chartdiv_sensor non trouvé');
            return;
        }

        this.clearChart();

        let pasDeTemps = state.pasDeTempsChart;
        if (source === 'nebuleair') {
            pasDeTemps = this.convertPasDeTempsForNebuleAir(pasDeTemps);
        } else if (source === 'atmoRef') {
            pasDeTemps = this.convertPasDeTempsForAtmoSud(pasDeTemps);
        }

        switch (source) {
            case 'atmoRef':
                retreiveHistoriqueDataStationRef(
                    state.deviceId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray,
                    false,
                    startDateTime,
                    endDateTime
                );
                break;

            case 'atmoMicro':
                retreiveHistoriqueDataMicroStation(
                    state.deviceId,
                    state.pasDeTempsChart,
                    state.historiqueChart,
                    state.mesuresArray,
                    startDateTime,
                    endDateTime
                );
                break;

            case 'nebuleair':
                retreive_historiqueData_nebuleAir(
                    state.deviceId,
                    pasDeTemps,
                    state.historiqueChart,
                    state.mesuresArray,
                    useCustomRange,
                    startDateTime,
                    endDateTime
                );
                break;

            default:
                console.error('Source de données non reconnue:', source);
        }
    }
}
