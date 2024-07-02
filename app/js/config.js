var config = {
	"coordsCenter": [43.29490421, 5.37188392], //loc par défaut pour la carte
	"zoomLevel": 15,                            //zoom por défaut
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
	"PM1" : {"name": "PM1", "code": "pm1"},
	"PM2.5": {"name": "PM2.5", "code": "pm25"},
	"PM10": {"name": "PM10", "code": "pm10"},
	"NO2": {"name": "NO<sub>2</sub>", "code": "no2"},
	"O3": {"name": "O<sub>3</sub>", "code": "o3"},
	"SO3": {"name": "SO<sub>2</sub>", "code": "so2"}
}

var sources = {
	"nebuleair" : {"name": "Capteurs NebuleAir", "code": "nebuleair"},
	"sensor.community": {"name": "Capteurs Sensor.Community", "code": "pm25"},
	"purpleair": {"name": "PM10", "code": "pm10"},
	"microstation_atmosud": {"name": "NO<sub>2</sub>", "code": "no2"},
	"stationRef_atmosud": {"name": "O<sub>3</sub>", "code": "o3"},
	"Mod_horaire_pm": {"name": "SO<sub>2</sub>", "code": "so2"},
	"Mod_horaire_icairh": {"name": "SO<sub>2</sub>", "code": "so2"},
	"vents": {"name": "SO<sub>2</sub>", "code": "so2"}
}

var pas_de_temps = {
	"direct" : {"name": "2 minutes", "code": "2min"},
	"quart-horaire": {"name": "Quart-horaire", "code": "qh"},
	"hoaraire": {"name": "Horaire", "code": "h"},
	"journalier": {"name": "Journalier", "code": "j"}
}

