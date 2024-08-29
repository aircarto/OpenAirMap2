var config = {
	"coordsCenter": [43.29490421, 5.37188392], //loc par défaut pour la carte
	"zoomLevel": 9,                            //zoom por défaut
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
	"mobileair": {"name": "MobileAir", "code": "mobileair", "activated": false},
	"signalair": {"name": "Signal'Air", "code": "signalair", "activated": false}
}

var pas_de_temps = {
	"direct" : {"name": "2 minutes", "code": "2min", "activated": true},
	"quart-horaire": {"name": "Quart-horaire", "code": "qh", "activated": false},
	"hoaraire": {"name": "Horaire", "code": "h", "activated": false},
	"journalier": {"name": "Journalier", "code": "d", "activated": false}
}

var seuils_PM1_PM25 = {
    "bon": {"code":"bon", "color_hex":"#79c5cc","min": 0, "max": 10},
    "moyen": {"code":"moyen", "color_hex":"#64bca6","min": 11, "max": 20},
    "degrade": {"code":"degrade", "color_hex":"#ebe95f","min": 21, "max": 25},
    "mauvais": {"code":"mauvais", "color_hex":"#e85957","min": 26, "max": 50},
    "tres_mauvais": {"code":"tres_mauvais", "color_hex":"#941f36","min": 51, "max": 75},
    "extr_mauvais": {"code":"extr_mauvais", "color_hex":"#89207d","min": 76, "max": 99999}
}

var seuils_PM10 = {
    "bon": {"code":"bon", "color_hex":"#79c5cc","min": 0, "max": 20},
    "moyen": {"code":"moyen", "color_hex":"#64bca6","min": 21, "max": 40},
    "degrade": {"code":"degrade", "color_hex":"#ebe95f","min": 41, "max": 50},
    "mauvais": {"code":"mauvais", "color_hex":"#e85957","min": 51, "max": 100},
    "tres_mauvais": {"code":"tres_mauvais", "color_hex":"#941f36","min": 101, "max": 150},
    "extr_mauvais": {"code":"extr_mauvais", "color_hex":"#89207d","min": 151, "max": 99999}
}

