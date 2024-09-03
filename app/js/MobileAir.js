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
    start=-6d&
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
                
                //création du tooltip (qui change en fonction du polluant)
                var dateMesure= new Date(value['time']);
                // Options for formatting the date in French
                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Europe/Paris',
                    timeZoneName: 'short'
                };
                const frenchDate = dateMesure.toLocaleDateString('fr-FR', options);

                if (mesures == "pm1") { var mobileAirTooltip = '<b>MobileAir '+value['sensorId']+' (session n° '+ value['sessionId']+')</b><br/>'+frenchDate+'<br/>PM1: ' + value['PM1'] + ' µg/m&sup3';}
                if (mesures == "pm25") {var mobileAirTooltip = '<b>MobileAir '+value['sensorId']+' (session n° '+ value['sessionId']+')</b><br/>'+frenchDate+'<br/>session ID: '+ value['sessionId']+'<br/>PM2.5: ' + value['PM25']+ ' µg/m&sup3';}
                if (mesures == "pm10") {var mobileAirTooltip = '<b>MobileAir '+value['sensorId']+' (session n° '+ value['sessionId']+')</b><br/>'+frenchDate+'<br/>session ID: '+ value['sessionId']+'<br/>PM10: ' + value['PM10']+ ' µg/m&sup3';}

                L.circle([value['lat'], value['lon']], circle_param)
                .bindTooltip(mobileAirTooltip, {
                    direction: 'center',
                    offset: [0, -50]
                })
                .on('click', function () {
                    console.log("Click on path from sensor: " + value['sensorId'])
                    openSidePanel_mobileAir(value, pas_de_temps, "24h", mesures)
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

function openSidePanel_mobileAir(data, pas_de_temps, historique, mesures){
    console.log("openSidePanel_mobileAir");
    //il faut passer à la fonction un array pour mesures
    // Clear the array by setting its length to 0
    mesures_array.length = 0;
    mesures_array.push(mesures)
    //card 1
    card1_img.src="img/nebuleair/NebuleAir_photo.png"
    card1_title.innerHTML =  "MobileAir "+data.sensorId;
    card1_subtitle.innerHTML = "Capteur citoyen de mesure en mobilité";
    card1_text.innerHTML=""; //empty content from previous opening
    //card 2
    card2_text.innerHTML="Le MobileAir est un capteur mobile de la qualité de l'air. Il fonctionne sur batterie et communique les mesures en temps réel via le résau mobile. Il est équipé d'une puce GPS qui permet la géolocalisation des données."; //empty content from previous opening
    card2_link.innerHTML="AirCarto.fr"; //empty content from previous opening

    //on lance la fonction pour récupérer les datas de mesures
    retreive_historiqueData_mobileAir(data.sensorId, data.sessionId, mesures_array );

    //fonction semblable pour tous les types de capteurs
    openSidePanel_generic();
} //end openSidePanel_mobileAir


/*
RECUPERATION DES DONNEE D'UNE SESSION -> CHART
mesures_array est un array (ex: [PM1, PM2.5])
mesure est le polluant qu'il faut ajouter à mesure_array (si add_mesure est true)
*/
function retreive_historiqueData_mobileAir(sensorId, sessionId, mesure, add_mesure){
    const start = Date.now(); //actual timestamp to measure response time
    if (add_mesure) {
        console.log("need to add mesure to array"); 
        mesures_array.push(mesure)
     }
     console.log("Retreive data for sensor: "  + sensorId );
     console.log("Session ID: "  + sessionId );
     console.log("Mesures: "  + mesures_array );
     console.log("Adding mesure: " + add_mesure);

    let full_url_mobileair = `
    https://api.aircarto.fr/capteurs/dataMobileAir?capteurID=${sensorId}&
    sessionID=${sessionId}&
    start=-6d&
    end=now&
    GPSnull=false&
    format=JSON
    `.replace(/\s+/g, '')

    console.log(full_url_mobileair);

    $.ajax({
        method: "GET",
        url: full_url_mobileair,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(`Data gathered in %c${requestTimer} sec`, "color: red;");
            //on ne récupère que la data de la session
            console.log("data flitered for sessionID:" + sessionId);
            const filteredData = data.filter(item => item.sessionId === sessionId);
            console.log(filteredData);

            //Ici on utilise un graph chart.js
            
             // Convert the raw data
            const times = filteredData.map(d => new Date(d.time));
            const pm1Values = filteredData.map(d => d.PM1);

            // Create the chart
            const ctx = document.getElementById('chartcanvas_sensor').getContext('2d');
            const myChart = new Chart(ctx, {
                type: 'line',
                data: {
                labels: times,
                datasets: [{
                    label: 'PM1 Levels Over Time',
                    data: filteredData.map(d => ({ x: new Date(d.time), y: d.PM1 })),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                }]
                },
                options: {
                responsive: true,
                scales: {
                    x: {
                    type: 'time',
                    time: {
                        unit: 'minute'
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                    },
                    y: {
                    title: {
                        display: true,
                        text: 'PM1'
                    }
                    }
                },
                plugins: {
                    tooltip: {
                    callbacks: {
                        label: function(context) {
                        const dataPoint = context.raw;
                        console.log('Tooltip Data:', dataPoint);
                        return `Time: ${dataPoint.x.toLocaleString()}, PM1: ${dataPoint.y}`;
                        }
                    }
                    }
                },
                onHover: function(event, chartElement) {
                    if (chartElement.length > 0) {
                    const element = chartElement[0];
                    const dataPoint = rawData[element.index];
                    console.log('Hovered Data Point:', dataPoint);
                    }
                }
                }
            });
           


        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
      });//end ajax

} //fin retreive_historique data

