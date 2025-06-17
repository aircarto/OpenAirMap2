export class ButtonManager {
    constructor() {
        this.buttons = {
            historique: {
                custom: null,
                startDate: null,
                endDate: null,
                '3h': null,
                '24h': null,
                '7d': null,
                '365d': null,
            },
            pasDeTemps: {
                scan: null,
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

        this.buttons.pasDeTemps.scan = document.getElementById(
            'btn_pasDeTemps_scan'
        );
        ['qh', 'h', 'd'].forEach((key) => {
            const buttonId = `btn_pasDeTemps_${key}`;
            this.buttons.pasDeTemps[key] = document.getElementById(buttonId);
        });

        Object.keys(this.buttons.pollutant).forEach((key) => {
            const buttonId = `btn_poluant_${key}`;
            this.buttons.pollutant[key] = document.getElementById(buttonId);
        });
    }

    getButton(type, id) {
        return this.buttons[type]?.[id];
    }

    setButtonState(type, id, checked) {
        console.log(type, id, checked);
        const button = this.getButton(type, id);
        if (!button.disabled) {
            button.checked = checked;
        }
    }

    setButtonDisabled(type, id, disabled, title = '') {
        const button = this.getButton(type, id);
        if (button) {
            
            button.disabled = disabled;
            button.title = title;
        }
    }

    resetButtonStates(type) {
        Object.values(this.buttons[type]).forEach((btn) => {
            if (btn) {
                btn.checked = false;
            }
        });
    }
}
