var seuils_PM1_PM25 = {
    "bon": {"code":"bon","min": 0, "max": 10},
    "moyen": {"code":"moyen","min": 11, "max": 20},
    "degrade": {"code":"degrade","min": 21, "max": 25},
    "mauvais": {"code":"mauvais","min": 26, "max": 50},
    "tres_mauvais": {"code":"tres_mauvais","min": 51, "max": 75},
    "extr_mauvais": {"code":"extr_mauvais","min": 76, "max": 99999}
}

var seuils_PM10 = {
    "bon": {"code":"bon","min": 0, "max": 20},
    "moyen": {"code":"moyen","min": 21, "max": 40},
    "degrade": {"code":"degrade","min": 41, "max": 50},
    "mauvais": {"code":"mauvais","min": 51, "max": 100},
    "tres_mauvais": {"code":"tres_mauvais","min": 101, "max": 150},
    "extr_mauvais": {"code":"extr_mauvais","min": 151, "max": 99999}
}

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
                    iconAnchor: [5, 40], // point of the icon which will correspond to marker's location
                    popupAnchor: [0, -10],
                    tooltipAnchor: [-50, -10]
                }

                //Tooltip
                var nebuleAirTooltip = value['sensorId'];

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
                            //si la valeur est entre le max et le min
                            if (value[mesure_maj_pas_de_temps] >= min & value[mesure_maj_pas_de_temps] <= max) {
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
                            //si la valeur est entre le max et le min
                            if (value[mesure_maj_pas_de_temps] >= min & value[mesure_maj_pas_de_temps] <= max) {
                                icon_param.iconUrl = 'img/nebuleair/nebuleAir_'+code+'.png';
                            }
                        }
                    }
              
                } 
                //create icons
                var nebuleAir_icon = L.icon(icon_param);
                //create a marker from icon
                L.marker([value['latitude'], value['longitude']], { icon: nebuleAir_icon })
                .bindTooltip(nebuleAirTooltip, {direction: 'center'})
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
                        popupAnchor: [30, -60] // point from which the popup should open relative to the iconAnchor
                      });

                    L.marker([value['latitude'], value['longitude']], { icon: text_param })
                    .on('click', function () {
                        console.log("Click on device: " + value['sensorId'])
                        openSidePanel_nebuleAir(value)
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
function openSidePanel_nebuleAir(data){
    console.log("openSidePanel_nebuleAir");
    retreive_historiqueData_nebuleAir(data.sensorId);
    card1_img.src="img/nebuleair/NebuleAir_nev.png"
    card1_title.innerHTML =  data.sensorId;
    card1_subtitle.innerHTML = "Capteur citoyen";
  
    // Crée une nouvelle div
    const newDiv_gauges = document.createElement('div');
    newDiv_gauges.id = 'squaresContainer';
    card1_text.innerHTML="";  //empty content from previous opening
    card1_text.appendChild(newDiv_gauges);
    createColorSquares();
  
    openSidePanel_generic()
  
  } //end openside panel

//RECUPERATION DES DONNEE D'UN CAPTEUR
function retreive_historiqueData_nebuleAir(sensorId){
    const start = Date.now(); //actual timestamp to measure response time
    console.log("Retreive data for sensor: "  + sensorId);
    full_url= `https://api.aircarto.fr/capteurs/dataNebuleAir?capteurID=${sensorId}&start=-2h&stop=now`
    $.ajax({
        method: "GET",
        url: full_url,
        // data: ({timespan: timespanLower}),
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
            am5.ready(function() {
                //création de l'élément root
                amchart_root = am5.Root.new("chartdiv_sensor");
                //prepare the data
                let data_PM1 = data.map(function (e) {
                    return { value: e.PM1, date: new Date(e.time).getTime() }
                  });
                //Instantiating the chart (création du chart XYChart)
                var chart = amchart_root.container.children.push(
                    am5xy.XYChart.new(amchart_root, {
                      panX: true,
                      panY: true,
                      wheelX: "panX",
                      wheelY: "zoomX",
                      maxTooltipDistance: 0,
                      pinchZoomX: true,
                    })
                  );
                //ajout de l'axe X (horizonzal -> datetime)
                var xAxis = chart.xAxes.push(
                    am5xy.DateAxis.new(amchart_root, {
                      renderer: am5xy.AxisRendererX.new(amchart_root, {}),
                      baseInterval: {
                        timeUnit: "minute",
                        count: 1
                      }
                    })
                  );
                //ajout de l'axe Y (vertical -> data)
                var yAxis = chart.yAxes.push(
                    am5xy.ValueAxis.new(amchart_root, {
                      renderer: am5xy.AxisRendererY.new(amchart_root, {})
                    })
                  );
                
                //ajout des données (series) en ligne (LineSeries)
                let series_PM1 = chart.series.push(
                    am5xy.LineSeries.new(amchart_root, {
                        name: "PM1",
                        xAxis: xAxis,
                        yAxis: yAxis,
                        valueYField: "value",
                        valueXField: "date",
                        legendValueText: "{valueY}",
                        tooltip: am5.Tooltip.new(amchart_root, {
                            pointerOrientation: "horizontal",
                            labelText: "{valueY}"
                        })
                  }));
                
                //ajout des datas
                series_PM1.data.setAll(data_PM1);
                series_PM1.appear();
                //load chart
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