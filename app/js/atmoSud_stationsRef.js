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
    var mesure=getArrayFromLocalStorage(mesures_local)
    
    var mesure_atmo=mesure[0]
    switch (mesure[0]){
        case 'pm25':
            var mesure_atmo="pm2.5"
            break;
    }

    //ATTENTION pas de donnée dispo pour les Stations de Référence au pas de temps 2min
    if (pas_de_temps[0] === '2min') {
        console.warn("Pas de données pour le pas de temps " + pas_de_temps);
        return;
    }

    console.log("Pas de temps : "+ pas_de_temps);
    console.log("Pas de temps Atmo: "+ pas_de_temps_atmo);
    console.log("Mesure : "+ mesure);

    //1. Première request pour charger les identifiants et la localisation des STATIONS
    // on ne veut que les stations qui mesurent le polluant choisis
    // on ne veut que les stations actives (where date_fin_mesure est supérieur à la date d'aujourd'hui)
    let full_url_stations = `
        https://api.atmosud.org/observations/stations?
        format=json&
        nom_polluant=${mesure_atmo}&
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
                        openSidePanel_stationRef(item.id_station, item.nom_station, mesure)
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
      nom_polluant=${mesure_atmo}&
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
                if (mesure == "pm1" || mesure == "pm25") {
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
                if (mesure == "pm10") {
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
                        localStorage.setItem("selected_station_ref_id", value['id_station'] )
                        openSidePanel_stationRef(value['id_station'], value['nom_station'], mesure)
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
    pas_de_temps -> horaire, journalier, quart-horaire
    historique -> 24h
    mesures_array -> PM10, PM25
    mesures -> polluant à ajouter à mesure array
*/

function openSidePanel_stationRef(stationID, station_name, mesure){
    console.log("➡️ openSidePanel_stationRef");
    console.log("Station ID: " + stationID);
    console.log("Mesure: " + mesure);

    //il faut passer à la fonction un array pour mesures
    // Clear the array by setting its length to 0
    mesures_array.length = 0;
    mesures_array.push(mesure)

    //on lance la fonction pour récupérer les datas de mesures
    //mesures_array est vide
    retreive_historiqueData_stationRef(stationID, pas_de_temps_atmo, "24h", mesures_array, mesure, false);
    
    //card 1
    card1_img.src="https://www.atmosud.org/sites/sud/files/styles/slider/public/medias/images/2022-04/station_longchamp_1.jpg?itok=y8Oi_LxY"
    card1_title.innerHTML =  station_name;
    card1_subtitle.innerHTML = "Station de référence AtmoSud";

    //card 2
    card2_text.innerHTML="Le dispositif de mesure d’AtmoSud est assuré par un réseau de plus de 110 stations permanentes et de stations provisoires, en fonction des besoins des territoires. Chaque station est équipée d’un ou plusieurs appareils de mesure, en fonction des problématiques locales de pollution. Chaque appareil (appelé analyseur) est spécifique à un polluant et il en mesure sa concentration 7 jours/7 et 24 heures/24. Les stations fixes sont implantées afin de mesurer la qualité de l’air dans différents contextes (trafic, urbain, industriel…) sur des territoires à enjeux pour les populations."
    card2_link.innerHTML="AtmoSud.org"; //empty content from previous opening
    card2_link.href = "https://atmosud.org";
    
    
    //on ajoute la fonction onclick sur chaque bouton
    //1.historique
    btn_historique_1h.onclick = function() {
        historique_chart = "1h";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };
    btn_historique_3h.onclick = function() {
        historique_chart = "3h";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };
    btn_historique_24h.onclick = function() {
        historique_chart = "24h";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };
    btn_historique_1sem.onclick = function() {
        historique_chart = "7d";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    }
    btn_historique_1m.onclick = function() {
        historique_chart = "30d";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };
    btn_historique_1a.onclick = function() {
        historique_chart = "365d";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };

    //2.pas de temps
    btn_pas_de_temps_2min.onclick = function() {
        pas_de_temps_chart = "2m";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };
    btn_pas_de_temps_qh.onclick = function() {
        pas_de_temps_chart = "15m";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };
    btn_pas_de_temps_h.onclick = function() {
        pas_de_temps_chart = "1h";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };
    btn_pas_de_temps_d.onclick = function() {
        pas_de_temps_chart = "1d";
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart , mesures_array);
    };

    //3. Mesures (ATTENTION: ici on peut choisir plusieurs polluants -> add_mesure = true)
    btn_poluant_pm1.onclick = function() {
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart, mesures_array, "pm1", true);
    };
    btn_poluant_pm25.onclick = function() {
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart, mesures_array, "pm25", true);
    };
    btn_poluant_pm10.onclick = function() {
        retreive_historiqueData_stationRef(stationID, pas_de_temps_chart, historique_chart, mesures_array, "pm10", true);
    };

  
    openSidePanel_generic()
  } //end function openSidePanel_stationRef

/*
  RECUPERATION DES DONNEE HISTORIQUE D'UNE STATION
*/

function retreive_historiqueData_stationRef(stationId, pas_de_temps_atmo, historique, mesures_array, mesure, add_mesure){
    const start = Date.now(); //actual timestamp to measure response time
    //il faut vider le div chartdiv_sensor (dans le cas ou canvasJS l'a utilisé juste avant)
    document.getElementById("chartdiv_sensor").innerHTML = "";

    console.log("⭐⭐⭐ Getting historical data ⭐⭐⭐");
    console.log("Station id: " + stationId);
    console.log("Pas de temps: " + pas_de_temps_atmo); //horaire, quart-horaire, journalière
    console.log("Historique: " + historique);
    console.log("Mesure: "  + mesure);

     ////si add_mesure est true alors il faut ajouter le polluant à mesures_array
     if (add_mesure) {
        console.log("need to add mesure to array"); 
        mesures_array.push(mesure)
     }

    console.log("Mesures array: "  + mesures_array );


    //ATTENTION! Pour l'API d'AtmoSud il faut écrire pm2.5 et non pm25
    //on doit convertir l'array de mesures en string pour l'url ([pm1, pm25, no2] -> pm1,pm25,pm10)
    // et on doit également remplacer pm25 par pm2.5
    var mesures_string_comma = mesures_array[0]
        .map(value => value === 'pm25' ? 'pm2.5' : value)
        .join(',');

     //il faut unchecked les boutons 
     var inputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
     inputs.forEach(function(input) {
         input.checked = false;
     });

     //attention pour le pas de temps des boutons il faut convertir ()
    var pas_de_temps_btn;
    if (pas_de_temps_atmo == "quart-horaire" || pas_de_temps == "qh") {pas_de_temps_btn = "qh"}
    if (pas_de_temps_atmo == "horaire" || pas_de_temps == "h") {pas_de_temps_btn = "h"}
    if (pas_de_temps_atmo == "journalière" || pas_de_temps == "d") {pas_de_temps_btn = "d"}

    console.log("btn_pas_de_temps_"+pas_de_temps_btn)


     //on checked le input qui a été sélectioné
    var historique_button_checked = document.getElementById("btn_historique_"+historique);
    historique_button_checked.checked = true;
    var historique_button_checked = document.getElementById("btn_pas_de_temps_"+pas_de_temps_btn);
    historique_button_checked.checked = true;
    //attention à l'array pour les mesures!!
    //on ajout le checked pour chaque polluant sélectionné
    mesures_array.forEach(function(element) {
        var historique_mesure_checked = document.getElementById("btn_poluant_"+element);
        historique_mesure_checked.checked = true;
    });


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

            //création du root element de AMChart
            //si le root élément a déjà été crée il faut le supprimer
            if (amchart_root != undefined) {
                console.log("DISPOSE AMChart root (already created)")
                amchart_root.dispose();
              }

              //il faut crée des timeUnit AMCHART spécifique en fonction du pas de temps
            var baseInterval_timeUnit_local;
            var baseInterval_count;
            if (pas_de_temps_atmo == "quart-horaire" || pas_de_temps == "qh") {baseInterval_timeUnit_local = "minute"; baseInterval_count=15}
            if (pas_de_temps_atmo == "horaire" || pas_de_temps == "h") {baseInterval_timeUnit_local = "hour"; baseInterval_count=1}
            if (pas_de_temps_atmo == "journalière" || pas_de_temps == "1d") {baseInterval_timeUnit_local = "day"; baseInterval_count=1}

              am5.ready(function() {

                //prepare the data
                let data_PM1 = data.mesures.map(function (e) {
                    return { value: e.valeur, date: new Date(e.date_debut).getTime() }
                });
               
                // Create root element
                amchart_root = am5.Root.new("chartdiv_sensor");

                // Create chart
         
                var chart = amchart_root.container.children.push(am5xy.XYChart.new(amchart_root, {
                    panX: false,
                    panY: false,
                    wheelX: "panX",
                    wheelY: "zoomX",
                    paddingLeft: 0
                }));


                // Add cursor
                // sans le cursor le tooltip n'apparait pas...
                var cursor = chart.set("cursor", am5xy.XYCursor.new(amchart_root, {
                    behavior: "zoomX"
                }));

                cursor.lineY.set("visible", false);


                //ajout de l'axe X (horizonzal -> datetime)
                var xAxis = chart.xAxes.push(am5xy.DateAxis.new(amchart_root, {
                    maxDeviation: 0.2,
                    baseInterval: {
                        timeUnit: baseInterval_timeUnit_local,  //il faut adapter en fonction du pas de temps! (valeur possible AMCHART: minute, hour, day, week, month, year)
                        count: baseInterval_count
                    },
                    renderer: am5xy.AxisRendererX.new(amchart_root, {
                        minorGridEnabled:true
                    }),
                    tooltip: am5.Tooltip.new(amchart_root, {})
                 }));

          
                //ajout de l'axe Y (vertical -> data)
                var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(amchart_root, {
                    renderer: am5xy.AxisRendererY.new(amchart_root, {})
                }));

                //PM1
                //ajout des données (series) en ligne simple (LineSeries) ou en lignes smoothed (SmoothedXLineSeries)
                var series_PM1 = chart.series.push(am5xy.SmoothedXLineSeries.new(amchart_root, {
                    name: "PM1",
                    xAxis: xAxis,
                    yAxis: yAxis,
                    valueYField: "value",
                    valueXField: "date",
                    tooltip: am5.Tooltip.new(amchart_root, {
                        labelText: "PM1: {valueY} µg/m³"
                    })
                }));

                //on peut changer ici la taille du trait
                series_PM1.strokes.template.setAll({
                    strokeWidth: 2
                });

                series_PM1.data.setAll(data_PM1);        
                series_PM1.appear(1000);


                chart.appear(1000, 100);

            }); //end am5 ready


        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
      });//end ajax

}

