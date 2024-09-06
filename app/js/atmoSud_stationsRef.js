/*
Récupération des données des stations de Référence
->mesure/dernière: problème ne renvoie pas d'infos si pas de mesure
-> Pour la localisation : OBSERVATIONS/STATIONS
DONC
On charge d'abord toutes les stations puis on vient chercher la dernière donnée
*/
var pas_de_temps_chart = "1h"
var pas_de_temps_atmo=""
var pas_de_temps_=""
var historique_chart = "24h"
var mesures_array = [];

function load_atmoSud_stationsRef() {
    console.log("%cload_atmoSud_stationsRef", "color: yellow; font-style: bold; background-color: blue;padding: 2px",);
    const start = Date.now(); //actual timestamp to measure response time
    // Current date
    const today = new Date();
    atmo_ref_layer.clearLayers();
    pas_de_temps_=getArrayFromLocalStorage(pas_de_temps_local) //attention revoie un objet !!
    switch (pas_de_temps_[0]){
        case 'qh':
            pas_de_temps_atmo="quart-horaire"
            break;
        case 'h':
            pas_de_temps_atmo="horaire"
            break;
        case 'd':
            pas_de_temps_atmo="journalière"
            break;
    }
    //on récupère le type de mesure (+ conversion pm25 vers pm2.5)
    var mesures=getArrayFromLocalStorage(mesures_local)
    var mesures_atmo=mesures[0]
    switch (mesures[0]){
        case 'pm25':
            var mesures_atmo="pm2.5"
            break;
    }

    //ATTENTION pas de donnée dispo pour les Stations de Référence au pas de temps 2min
    if (pas_de_temps[0] === '2min') {
        console.warn("Pas de données pour le pas de temps " + pas_de_temps);
        return;
    }

    console.log("Pas de temps : "+ pas_de_temps);
    console.log("Pas de temps Atmo: "+ pas_de_temps_atmo);
    console.log("Mesures : "+ mesures);

    //1. Première request pour charger les identifiants et la localisation des STATIONS
    // on ne veut que les stations qui mesurent le polluant choisis
    // on ne veut que les stations actives (where date_fin_mesure est supérieur à la date d'aujourd'hui)
    let full_url_stations = `
        https://api.atmosud.org/observations/stations?
        format=json&
        nom_polluant=${mesures_atmo}&
        download=false
    `.replace(/\s+/g, '')
    
    $.ajax({
        method: "GET",
        url: full_url_stations,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log("API stations:")
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(`Data gathered in %c${requestTimer} sec`, "color: red;");
            console.log(data);
            $.each(data.stations, function (key, item) {
                var date_fin_Station = new Date(item.date_fin_mesure);
                if (today < date_fin_Station) {
                    //icone gris (par défault lorsque pas de donnée)
                    var icon_param = {
                        iconUrl: 'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                        iconSize: [50, 50], // size of the icon
                        iconAnchor: [5, 40], // point of the icon which will correspond to marker's location
                        //popupAnchor: [30, -60] // point from which the popup should open relative to the iconAnchor
                        className: item.id_station,
                    }
                    var refStationsAtmoSud_icon = L.icon(icon_param);
                    L.marker([item['latitude'], item['longitude']], { icon: refStationsAtmoSud_icon })
                    .on('click', function () {
                        console.log("Click on station: " + item.id_station)
                        openSidePanel_stationRef(item.id_station, item.nom_station)
                    })
                    .addTo(atmo_ref_layer);
            } else {
                //console.log("Some station are off: " + item.id_station);
            }
            })//end each

            //ajouter la layer sur la carte
            map.addLayer(atmo_ref_layer);

        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
      });//end ajax

      /*
      *************************************************************************
      ************************************************************************
      */

     //2. Deuxime Call pour afficher la dernière mesure dispo pour chaque station (mesure/dernière)
     // en fonction de la mesure sélectionnée et du pas de temps
     // on adapte les icones en fonctions (couleurs) et on affiche la mesure sur l'icone
    let full_url_derniere = `
      https://api.atmosud.org/observations/stations/mesures/derniere?
      format=json&
      nom_polluant=${mesures_atmo}&
      temporalite=${pas_de_temps_atmo}&
      download=false
        `.replace(/\s+/g, '')

    $.ajax({
        method: "GET",
        url: full_url_derniere,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log("API dernière:")
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(`Data gathered in %c${requestTimer} sec`, "color: red;");
            console.log(data);
            $.each(data.mesures, function (key, value) {
                //il faut enlever les doublons (stations qui envoient de la données VS stations qui n'ont pas encore envoyé)
                atmo_ref_layer.eachLayer(function (layer) {
                    if (layer._icon.className.includes(value.id_station) && value.valeur != null) {
                      console.log("Removed doublons");
                      atmo_ref_layer.removeLayer(layer)
                    }
                  })
                //on récupère la valeur mesurée
                var valeur_polluant = Math.round(value["valeur"]);
                var icon_param = {
                    iconUrl: 'img/stationsRefAtmoSud/refStationAtmoSud_default.png',
                    iconSize: [50, 50], // size of the icon
                    iconAnchor: [5, 50], // point of the icon which will correspond to marker's location
                    //popupAnchor: [30, -60] // point from which the popup should open relative to the iconAnchor
                  }
                //pour les pm1 et les PM25 on change l'icone (la couleurs)
                if (mesures == "pm1" || mesures == "pm25") {
                    for (let key in seuils_PM1_PM25) {
                        let code = seuils_PM1_PM25[key].code
                        let min = seuils_PM1_PM25[key].min
                        let max = seuils_PM1_PM25[key].max
                        //si la valeur est entre le max et le min
                        if (value['valeur'] >= min & value['valeur'] <= max) {
                            icon_param.iconUrl = 'img/stationsRefAtmoSud/refStationAtmoSud_'+code+'.png';
                        }
                    }
                }
                //pour les pm10
                if (mesures == "pm10") {
                    for (let key in seuils_PM10) {
                        let code = seuils_PM10[key].code
                        let min = seuils_PM10[key].min
                        let max = seuils_PM10[key].max
                        //si la valeur est entre le max et le min
                        if (value['valeur'] >= min & value['valeur'] <= max) {
                            icon_param.iconUrl = 'img/stationsRefAtmoSud/refStationAtmoSud_'+code+'.png';
                        }
                    }
                }
                //création des icones
                var refStationsAtmoSud_icon = L.icon(icon_param);
                //ajout sur la layer
                L.marker([value['lat'], value['lon']], { icon: refStationsAtmoSud_icon })
                .addTo(atmo_ref_layer);

                // TEXTE pour affichage de la mesure
                //textSize (if number under 10)
                var textSize = 32;
                var x_position = -12;
                var y_position = 48;
                //smaller text size if number is greater than 9
                if (valeur_polluant >= 10) {
                    textSize = 25;
                    x_position = -5;
                    y_position = 43;
                    }

                if (valeur_polluant >= 100) {
                    textSize = 20;
                    x_position = -4;
                    y_position = 26;
                    }

                var text_param = L.divIcon({
                    className: 'my-div-icon',
                    html: '<div id="textDiv" style="font-size: ' + textSize + 'px;">' + valeur_polluant + '</div>',
                    iconAnchor: [x_position, y_position],
                    popupAnchor: [30, -60] // point from which the popup should open relative to the iconAnchor

                });

                L.marker([value['lat'], value['lon']], { icon: text_param })
                .on('click', function () {
                        console.log("Click on station: " + (value['nom_station']) + " ("+ value['id_station'] + ")")
                        openSidePanel_stationRef(value['id_station'], value['nom_station'], mesures)
                    })
                .addTo(atmo_ref_layer);

            })//end each
            //ajouter la layer sur la carte
            map.addLayer(atmo_ref_layer);

        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
        });//end ajax

}//end function load_atmoSud_stationsRef()


/*
Ouverture du Side panel
    stationID -> FR1232
    stationName -> AIX LES MILLES
    pas_de_temps -> horaire, journalier
    historique -> 24h
    mesures_array -> PM10, PM25
    mesure -> polluant à ajouter à mesure array
*/

function openSidePanel_stationRef(stationID, station_name, mesures){
    console.log("openSidePanel_stationRef");

     //il faut passer à la fonction un array pour mesures
    // Clear the array by setting its length to 0
    mesures_array.length = 0;
    mesures_array.push(mesures)

    //on lance la fonction pour récupérer les datas de mesures
    retreive_historiqueData_stationRef(stationID, pas_de_temps_atmo, "24h", mesures_array );
    
    //card 1
    card1_img.src="https://www.atmosud.org/sites/sud/files/styles/slider/public/medias/images/2022-04/station_longchamp_1.jpg?itok=y8Oi_LxY"
    card1_title.innerHTML =  station_name;
    card1_subtitle.innerHTML = "Station de référence AtmoSud";

    //card 2
    card2_text.innerHTML="Le dispositif de mesure d’AtmoSud est assuré par un réseau de plus de 110 stations permanentes et de stations provisoires, en fonction des besoins des territoires. Chaque station est équipée d’un ou plusieurs appareils de mesure, en fonction des problématiques locales de pollution. Chaque appareil (appelé analyseur) est spécifique à un polluant et il en mesure sa concentration 7 jours/7 et 24 heures/24. Les stations fixes sont implantées afin de mesurer la qualité de l’air dans différents contextes (trafic, urbain, industriel…) sur des territoires à enjeux pour les populations."
    card2_link.innerHTML="AtmoSud.org"; //empty content from previous opening
    card2_link.href = "https://atmosud.org";
  
    openSidePanel_generic()
  } //end function openSidePanel_stationRef

/*
  RECUPERATION DES DONNEE HISTORIQUE D'UNE STATION
*/

function retreive_historiqueData_stationRef(stationId, pas_de_temps_atmo, historique, mesures_array, mesure, add_mesure){
    const start = Date.now(); //actual timestamp to measure response time
    console.log("⭐⭐⭐ Getting historical data ⭐⭐⭐");
    console.log("Station id: " + stationId);
    console.log("Pas de temps: " + pas_de_temps_atmo);
    console.log("Historique: " + historique);
    console.log("Mesure array->");
    console.log(mesures_array);

    //on doit convertir l'array de mesures en string pour l'url ([pm1, pm25, no2] -> pm1,pm25,pm10)
    var mesures_string_comma = Object.values(mesures_array).join(',');


    let full_url_mesures = `
    https://api.atmosud.org/observations/stations/mesures?
    format=json&
    station_id=${stationId}&
    nom_polluant=${mesures_string_comma}&
    temporalite=${pas_de_temps_atmo}&
    date_debut=2024-09-01&
    date_fin=2024-09-05&
    download=false
      `.replace(/\s+/g, '')
    
    console.log(full_url_mesures);

    $.ajax({
        method: "GET",
        url: full_url_mesures,
        success: function (data) {
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(`Data gathered in %c${requestTimer} sec`, "color: red;");
            console.log(data);
        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
      });//end ajax

}

