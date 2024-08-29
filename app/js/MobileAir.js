function loadMobileAir() {
    console.log("%cloadMobileAir", "color: yellow; font-style: bold; background-color: blue;padding: 2px",);
    mobileair_layer.clearLayers();
    var mesures=getArrayFromLocalStorage(mesures_local)
    console.log("Mesures : "+ mesures);
    //il faut faire passer le type de mesure en maj (différence dans le JSON et dans l'appli)
    let mesure_StringA = mesures[0];
    let mesure_String =`${mesure_StringA}`;
    let mesure_majuscule = mesure_String.toUpperCase();

    var capteur_ID = "002"

    let full_url_mobileair = `
    https://api.aircarto.fr/capteurs/dataMobileAir?capteurID=${capteur_ID}&
    start=-2d&
    end=now&
    GPSnull=false&
    format=JSON
    `.replace(/\s+/g, '')

    //Getting data from API
    $.ajax({
        method: "GET",
        url: full_url_mobileair,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log(data);
             //création de l'array de points pour la polyline
            //prepare the data
            let polyLine_data = data.map(function (e) {
                return [e.lat, e.lon]
              });
            var polyline = L.polyline(polyLine_data, {
                color: 'gray'
            }).addTo(mobileair_layer);

            //pour chaque data on crée un point sur la carte
            $.each(data, function (key, value) {
                //création de ronds
                var circle_param = {
                    
                    fillOpacity: 1,
                    radius: 5   
                }
                //en fonction du polluant (mesures) on adapte la couleur
                    //pour les pm1 et les pm25
                    if (mesures == "pm1" || mesures == "pm25") {
                        for (let key in seuils_PM1_PM25) {
                            let color_hex = seuils_PM1_PM25[key].color_hex
                            let min = seuils_PM1_PM25[key].min
                            let max = seuils_PM1_PM25[key].max
                            let value_rounded = Math.round(value[mesure_majuscule]);
                            //si la valeur est entre le max et le min
                            if (value_rounded >= min & value_rounded <= max) {
                                circle_param.color = color_hex;
                                circle_param.fillColor = color_hex;
                            }
                        }
                    }
                    //pour les pm10
                    if (mesures == "pm10") {
                        for (let key in seuils_PM10) {
                            let color_hex = seuils_PM10[key].color_hex
                            let min = seuils_PM10[key].min
                            let max = seuils_PM10[key].max
                            let value_rounded = Math.round(value[mesure_majuscule]);

                            //si la valeur est entre le max et le min
                            if (value_rounded >= min & value_rounded <= max) {
                                circle_param.color = color_hex;
                                circle_param.fillColor = color_hex;

                            }
                        }
                    }
                
                if (mesures == "pm1") {var mobileAirTooltip = 'MobileAir '+value['sensorId']+'<br />PM1: ' + value['PM1'];}
                if (mesures == "pm25") {var mobileAirTooltip = 'MobileAir '+value['sensorId']+'<br />PM2.5: ' + value['PM25'];}
                if (mesures == "pm10") {var mobileAirTooltip = 'MobileAir '+value['sensorId']+'<br />PM10: ' + value['PM10'];}

                L.circle([value['lat'], value['lon']], circle_param)
                .bindTooltip(mobileAirTooltip, {
                    direction: 'center',
                    offset: [0, -50]
                })
                .addTo(mobileair_layer);

            }); //end each

           
        //ajouter la layer sur la carte
        map.addLayer(mobileair_layer);
        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
      });//end ajax
}//end loadMobilAir function