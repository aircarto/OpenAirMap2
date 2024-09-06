var pas_de_temps_chart = "1h"
var historique_chart = "24h"
var mesures_array = [];

function loadNebuleAir() {
    console.log("%cloadNebuleAir", "color: yellow; font-style: bold; background-color: blue;padding: 2px",);
    nebuleair_layer.clearLayers();
    var pas_de_temps=getArrayFromLocalStorage(pas_de_temps_local)
    var mesures=getArrayFromLocalStorage(mesures_local)
    console.log("Pas de temps : "+ pas_de_temps);
    console.log("Mesures : "+ mesures);
    let mesure_StringA = mesures[0];
    let mesure_String =`${mesure_StringA}`;
    let pas_de_tempsA = pas_de_temps[0];
    let pas_de_temps_String =`${pas_de_tempsA}`;
    //on fait passer pm1 en upperCase car dans le JSON d'AirCarto c'est en maj (PM1)
    let mesure_majuscule = mesure_String.toUpperCase();
    let mesure_maj_pas_de_temps = mesure_majuscule
    //si on est pas en 2min il faut ajouter le pas de temps (PM1_d)
    if (pas_de_temps_String != "2min") {
        mesure_maj_pas_de_temps = mesure_majuscule + "_"+ pas_de_temps_String
    }

    $.ajax({
        method: "GET",
        url: "https://api.aircarto.fr/capteurs/metadata?capteurType=NebuleAir",
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log(data);
            //on ne traite que les nebuleair dont le parametre "displayMap" est true
            var displayed = data.filter((e) => e.displayMap == true);
            $.each(displayed, function (key, value) {
                //ICONE
                //image des points sur la carte (créer un icone et le place sur la carte en marker)
                //par défaut c'est le point gris
                var icon_param = {
                    iconUrl: 'img/nebuleair/nebuleAir_default.png',
                    iconSize: [40, 40], // size of the icon
                    iconAnchor: [5, 40] // point of the icon which will correspond to marker's location   
                }                

                //si le capteur est connecté on change la couleur
                if (value.connected) {
                    //les icone connectés sont plus grand que les gris
                    icon_param.iconSize= [50, 50]
                    //en fonction du polluant (mesures) on adapte la couleur
                    //pour les pm1 et les pm25
                    if (mesures == "pm1" || mesures == "pm25") {
                        for (let key in seuils_PM1_PM25) {
                            let code = seuils_PM1_PM25[key].code
                            let min = seuils_PM1_PM25[key].min
                            let max = seuils_PM1_PM25[key].max
                            let value_rounded = Math.round(value[mesure_maj_pas_de_temps]);

                            //si la valeur est entre le max et le min
                            if (value_rounded >= min & value_rounded <= max) {
                                icon_param.iconUrl = 'img/nebuleair/nebuleAir_'+code+'.png';
                            }
                        }
                    }
                    //pour les pm10
                    if (mesures == "pm10") {
                        for (let key in seuils_PM10) {
                            let code = seuils_PM10[key].code
                            let min = seuils_PM10[key].min
                            let max = seuils_PM10[key].max
                            let value_rounded = Math.round(value[mesure_maj_pas_de_temps]);

                            //si la valeur est entre le max et le min
                            if (value_rounded >= min & value_rounded <= max) {
                                icon_param.iconUrl = 'img/nebuleair/nebuleAir_'+code+'.png';
                            }
                        }
                    }
              
                } 
                //create icons
                var nebuleAir_icon = L.icon(icon_param);
                //create a marker from icon
                L.marker([value['latitude'], value['longitude']], { icon: nebuleAir_icon })
                .addTo(nebuleair_layer);
                
                
                //TEXTE
                //si le capteur est connecté on affiche la valeur (ajout d'un marker)
                if (value.connected) {
                    let roundedvalue = Math.round(parseFloat(value[mesure_maj_pas_de_temps]));
                    //textSize (if number under 10)
                    var textSize = 32;
                    var x_position = -10;
                    var y_position = 38;
                    //smaller text size if number is greater than 9
                    if (roundedvalue >= 10) {
                        textSize = 25;
                        x_position = -5;
                        y_position = 32;
                        }

                    if (roundedvalue >= 100) {
                        textSize = 20;
                        x_position = -4;
                        y_position = 26;
                        }

                    var text_param = L.divIcon({
                        className: 'my-div-icon',
                        html: '<div id="textDiv" style="font-size: ' + textSize + 'px;">' + roundedvalue + '</div>',
                        iconAnchor: [x_position, y_position],
                      });
                    
                    //tooltip -> survol
                    //Popup -> lorsque l'on clique
                    var nebuleAirTooltip = value['sensorId'];
                    var nebuleAirPopup = '<b>'+value['sensorId']+'<b>'
                    
                    L.marker([value['latitude'], value['longitude']], { icon: text_param })
                    .bindTooltip(nebuleAirTooltip, {
                        direction: 'center',
                        offset: [0, -50] })
                    .bindPopup(nebuleAirPopup,{
                        offset: [20, -30]
                    })
                    .on('click', function () {
                        console.log("Click on device: " + value['sensorId'])
                        openSidePanel_nebuleAir(value, pas_de_temps, "24h", mesures)
                    })
                    .addTo(nebuleair_layer);
                }


                

            }); //end each
            //ajouter la layer sur la carte
            map.addLayer(nebuleair_layer);
           
               
        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
      });//end ajax
} //end function loadNebuleAir()

//OUVERTURE DU SIDE PANEL
function openSidePanel_nebuleAir(data, pas_de_temps, historique, mesures){
    console.log("openSidePanel_nebuleAir");

    //il faut passer à la fonction un array pour mesures
    // Clear the array by setting its length to 0
    mesures_array.length = 0;
    mesures_array.push(mesures)

    //on lance la fonction pour récupérer les datas de mesures
    retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps, historique, mesures_array );

    card1_img.src="img/nebuleair/NebuleAir_photo.png"
    card1_title.innerHTML =  data.sensorId;
    card1_subtitle.innerHTML = "Capteur citoyen";
    card1_text.innerHTML=""; //empty content from previous opening

    card2_text.innerHTML="Le capteur NebuleAir est un dispositif de mesure de l'air extérieur développé par AirCarto et AtmoSud. Il peut être placé sur le rebord d'une fenêtre ou sur un balcon afin de mesurer le taux de particules fines présent dans l'air. Il communique ses données toutes 2 minutes et les envoies sur les serveurs d'AirCarto via une connexion WIFI."
    card2_link.innerHTML="AirCarto.fr"; //empty content from previous opening
    card2_link.href = "https://aircarto.fr";

    //on ajoute la fonction onclick sur chaque bouton
    //1.historique
    var btn_historique_1h = document.getElementById("btn_historique_1h");
    var btn_historique_3h = document.getElementById("btn_historique_3h");
    var btn_historique_24h = document.getElementById("btn_historique_24h");
    var btn_historique_1sem = document.getElementById("btn_historique_7d");
    var btn_historique_1m = document.getElementById("btn_historique_30d");
    var btn_historique_1a = document.getElementById("btn_historique_365d");

    btn_historique_1h.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, '1h', mesures_array);
        historique_chart = "1h";
    };
    btn_historique_3h.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, '3h', mesures_array);
        historique_chart = "3h";
    };
    btn_historique_24h.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, '24h', mesures_array);
        historique_chart = "24h";
    };
    btn_historique_1sem.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, '7d', mesures_array);
        historique_chart = "7d";
    };
    btn_historique_1m.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, '30d', mesures_array);
        historique_chart = "30d";
    };
    btn_historique_1a.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, '365d', mesures_array);
        historique_chart = "365d";
    };

    //2.pas de temps
    var btn_pas_de_temps_2min = document.getElementById("btn_pas_de_temps_2min");
    var btn_pas_de_temps_qh = document.getElementById("btn_pas_de_temps_qh");
    var btn_pas_de_temps_h = document.getElementById("btn_pas_de_temps_h");
    var btn_pas_de_temps_d = document.getElementById("btn_pas_de_temps_d");
    
    btn_pas_de_temps_2min.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, '2m', historique_chart, mesures_array);
        pas_de_temps_chart = "2m";
    };
    btn_pas_de_temps_qh.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, '15m', historique_chart, mesures_array);
        pas_de_temps_chart = "15m";
    };
    btn_pas_de_temps_h.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, '1h', historique_chart, mesures_array);
        pas_de_temps_chart = "1h";
    };
    btn_pas_de_temps_d.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, '1d', historique_chart, mesures_array);
        pas_de_temps_chart = "1d";
    };

    //3. Mesures (ATTENTION: ici on peut choisir plusieurs polluants -> add_mesure = true)
    var btn_poluant_pm1 = document.getElementById("btn_poluant_pm1");
    var btn_poluant_pm25 = document.getElementById("btn_poluant_pm25");
    var btn_poluant_pm10 = document.getElementById("btn_poluant_pm10");

    btn_poluant_pm1.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array, "pm1", true);
    };
    btn_poluant_pm25.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array, "pm25", true);
    };
    btn_poluant_pm10.onclick = function() {
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array, "pm10", true);
    };

    //adaptation des boutons en fonction de l'historique, du pas de temps et des mesures
    var historique_button_checked = document.getElementById("btn_historique_"+historique);
    historique_button_checked.checked = true;
    var historique_button_checked = document.getElementById("btn_pas_de_temps_"+pas_de_temps);
    historique_button_checked.checked = true;
    var historique_mesure_checked = document.getElementById("btn_poluant_"+mesures);
    historique_mesure_checked.checked = true;

    // Crée une nouvelle div
    // -> plutot sur la carte!
    /*
    const newDiv_gauges = document.createElement('div');
    newDiv_gauges.id = 'squaresContainer';
    card1_text.innerHTML="";  //empty content from previous opening
    card1_text.appendChild(newDiv_gauges);
    createColorSquares();
    */

    //fonction semblable pour tous les types de capteurs
    openSidePanel_generic()
  
  } //end openside panel


/*
RECUPERATION DES DONNEE D'UN CAPTEUR -> CHART
    mesures_array est un array (ex: [PM1, PM2.5])
    mesure est le polluant qu'il faut ajouter à mesure_array (si add_mesure est true)
*/

function retreive_historiqueData_nebuleAir(sensorId, pas_de_temps, historique, mesures_array, mesure, add_mesure){
    const start = Date.now(); //actual timestamp to measure response time
    //il faut vider le div chartdiv_sensor (dans le cas ou canvasJS l'a utilisé juste avant)
    document.getElementById("chartdiv_sensor").innerHTML = "";
    ////si add_mesure est true alors il faut ajouter le polluant à mesures_array
    if (add_mesure) {
       console.log("need to add mesure to array"); 
       mesures_array.push(mesure)
    }

    console.log("Retreive data for sensor: "  + sensorId );
    console.log("Pas de temps: "  + pas_de_temps );
    console.log("Historique: "  + historique );
    console.log("Mesures: "  + mesures_array );
    console.log("Adding mesure: " + add_mesure)

    //il faut unchecked les boutons 
    var inputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    inputs.forEach(function(input) {
        input.checked = false;
    });

    //attention pour le pas de temps des boutons il faut convertir ()
    var pas_de_temps_btn;
    if (pas_de_temps == "2m" || pas_de_temps == "2min" ) {pas_de_temps_btn = "2min"}
    if (pas_de_temps == "15m" || pas_de_temps == "qh") {pas_de_temps_btn = "qh"}
    if (pas_de_temps == "1h" || pas_de_temps == "h") {pas_de_temps_btn = "h"}
    if (pas_de_temps == "24h" || pas_de_temps == "1d") {pas_de_temps_btn = "d"}

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
    

    //pour le pas de temps (pour l'URL) il faut convertir (2min, qh, h et d -->en--> 2m, 15m, 1h et 1d)
    if (pas_de_temps == "2min") {pas_de_temps = "2m"}
    if (pas_de_temps == "qh") {pas_de_temps = "15m"}
    if (pas_de_temps == "h") {pas_de_temps = "1h"}
    if (pas_de_temps == "d") {pas_de_temps = "1d"}

    full_url= `https://api.aircarto.fr/capteurs/dataNebuleAir?capteurID=${sensorId}&start=-${historique}&stop=now&freq=${pas_de_temps}`
    console.log(full_url);

    $.ajax({
        method: "GET",
        url: full_url,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(`Data gathered in %c${requestTimer} sec`, "color: red;");
            console.log(data);

            //il faut crée des timeUnit AMCHART spécifique en fonction du pas de temps
            var baseInterval_timeUnit_local;
            var baseInterval_count;
            if (pas_de_temps == "2m" || pas_de_temps == "2min" ) {baseInterval_timeUnit_local = "minute"; baseInterval_count=2}
            if (pas_de_temps == "15m" || pas_de_temps == "qh") {baseInterval_timeUnit_local = "minute"; baseInterval_count=15}
            if (pas_de_temps == "1h" || pas_de_temps == "h") {baseInterval_timeUnit_local = "hour"; baseInterval_count=1}
            if (pas_de_temps == "24h" || pas_de_temps == "1d") {baseInterval_timeUnit_local = "day"; baseInterval_count=1}

            //création du root element de AMChart
            //si le root élément a déjà été crée il faut le supprimer
            if (amchart_root != undefined) {
                console.log("DISPOSE AMChart root (already created)")
                amchart_root.dispose();
              }

            am5.ready(function() {

                //prepare the data
                let data_PM1 = data.map(function (e) {
                    return { value: e.PM1, date: new Date(e.time).getTime() }
                });
                let data_PM25 = data.map(function (e) {
                    return { value: e.PM25, date: new Date(e.time).getTime() }
                });
                let data_PM10 = data.map(function (e) {
                    return { value: e.PM10, date: new Date(e.time).getTime() }
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

                //PM2.5
                if (mesures_array.includes("pm25")) {
                    var series_PM25 = chart.series.push(am5xy.SmoothedXLineSeries.new(amchart_root, {
                        name: "PM2.5",
                        xAxis: xAxis,
                        yAxis: yAxis,
                        valueYField: "value",
                        valueXField: "date",
                        tooltip: am5.Tooltip.new(amchart_root, {
                            labelText: "PM2.5: {valueY} µg/m³"
                        })
                    }));
                    //on peut changer ici la taille du trait
                    series_PM25.strokes.template.setAll({
                        strokeWidth: 2
                    });
                    series_PM25.data.setAll(data_PM25);        
                    series_PM25.appear(1000);
                }

                //PM10
                if (mesures_array.includes("pm10")) {
                    var series_PM10 = chart.series.push(am5xy.SmoothedXLineSeries.new(amchart_root, {
                        name: "PM10",
                        xAxis: xAxis,
                        yAxis: yAxis,
                        valueYField: "value",
                        valueXField: "date",
                        tooltip: am5.Tooltip.new(amchart_root, {
                            labelText: "PM10: {valueY} µg/m³"
                        })
                    }));
                    //on peut changer ici la taille du trait
                    series_PM10.strokes.template.setAll({
                        strokeWidth: 2
                    });
                    series_PM10.data.setAll(data_PM10);        
                    series_PM10.appear(1000);
                }

                chart.appear(1000, 100);

            }); //end am5 ready


        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
      });//end ajax
  } //end retreive data