var config = {
	"coordsCenter": [43.29490421, 5.37188392], //loc par défaut pour la carte
	"zoomLevel": 12,                            //zoom por défaut
	"minZoom": 1,
	"maxZoom": 21,                              //dézoom max
	"compoundUpper": "PM25",                    //polluant affiché par défaut
	"timespanLower": 60,                        //pas de temps de base 2min, 15min, 60min ou journéé (??)
	"timeLength": 24,                           // historique
	"display": "atmosudmicro, nebuleair",       //source des données par défaut
	"boundSW": [-90, -180],                     //bloquer la carte sur une zone
	"boundNE": [90, 180]

}

var mesures = {
	"PM1" : {"name": "PM1", "code": "pm1", "activated": true},
	"PM2.5": {"name": "PM2.5", "code": "pm25", "activated": false},
	"PM10": {"name": "PM10", "code": "pm10", "activated": false},
	"NO2": {"name": "NO<sub>2</sub>", "code": "no2", "activated": false},
	"O3": {"name": "O<sub>3</sub>", "code": "o3", "activated": false},
	"SO2": {"name": "SO<sub>2</sub>", "code": "so2", "activated": false}
}

var sources = {
	"nebuleair" : {"name": "Capteurs NebuleAir", "code": "nebuleair", "activated": true},
	"sensor.community": {"name": "Capteurs Sensor.Community", "code": "sensor_commmunity", "activated": false},
	"purpleair": {"name": "Capteurs PurpleAir", "code": "purpleair", "activated": false},
	"microstation_atmosud": {"name": "Micro-stations AtmoSud", "code": "atmo_micro", "activated": false},
	"stationRef_atmosud": {"name": "Stations de référence AtmoSud", "code": "atmo_ref", "activated": false},
	"Mod_horaire_pm": {"name": "Modélisation horaire PM AtmoSud", "code": "mod_pm", "activated": false},
	"Mod_horaire_icairh": {"name": "Modélisation horaire ICAIRh AtmoSud", "code": "icairh", "activated": false},
	"vents": {"name": "Vents", "code": "vents", "activated": false},
	"signalair": {"name": "Signal'Air", "code": "signalair", "activated": false}
}

var pas_de_temps = {
	"direct" : {"name": "2 minutes", "code": "2min", "activated": true},
	"quart-horaire": {"name": "Quart-horaire", "code": "qh", "activated": false},
	"hoaraire": {"name": "Horaire", "code": "h", "activated": false},
	"journalier": {"name": "Journalier", "code": "j", "activated": false}
}

