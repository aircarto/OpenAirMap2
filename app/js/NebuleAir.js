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

    // Track selected markers for click interaction

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
                //create a marker from icon and store reference
                let nebuleAirMarker = L.marker([value['latitude'], value['longitude']], { 
                    icon: nebuleAir_icon,
                    // Add custom properties to identify this marker
                    deviceId: value['sensorId']  // Store the device ID directly on the marker
                })
                .addTo(nebuleair_layer);

                if (!window.deviceMarkers) window.deviceMarkers = {};
                window.deviceMarkers[value['sensorId']] = {
                    marker: nebuleAirMarker,
                    data: value  // Store the full data object
                };
                
                
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

                    
                    // Store reference to text marker
                    let textMarker = L.marker([value['latitude'], value['longitude']], { 
                        icon: text_param,
                        deviceId: value['sensorId']  // Same device ID on text marker
                    })
                    .on('click', function () {
                        // Si un marker est déjà sélectionné, on enlève l'animation
                        if (globalSelectedMarker && globalSelectedMarker !== nebuleAirMarker) {
                            globalSelectedMarker.setZIndexOffset(0);
                            globalSelectedMarker._icon.classList.remove('marker-selected');
                        }

                        if (globalSelectedText && globalSelectedText !== textMarker) {
                            globalSelectedText.setZIndexOffset(0);
                            globalSelectedText._icon.classList.remove('marker-selected');
                        }

                        // Appliquer l'animation uniquement au nouveau marker sélectionné
                        nebuleAirMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        nebuleAirMarker._icon.classList.add('marker-selected');
                        textMarker._icon.classList.add('marker-selected');

                        // Mettre à jour le marker sélectionné
                        globalSelectedMarker = nebuleAirMarker;
                        globalSelectedText = textMarker;
                        globalSelectedDeviceId = value['sensorId'];
                        

                        console.log("Click on device: " + value['sensorId'])
                        openSidePanel_nebuleAir(value, pas_de_temps_String, "24h", mesures)
                    })
                    .addTo(nebuleair_layer);
                    
                    // Add hover effect - highlight on hover
                    function highlightMarker() {
                        nebuleAirMarker.setZIndexOffset(1000);
                        textMarker.setZIndexOffset(1000);
                        
                        // Show device info
                        deviceInfo._div.querySelector('#device-name').textContent = value['sensorId'];
                        deviceInfo._div.querySelector('#device-details').textContent = `Type: NebuleAir`;
                        deviceInfo._div.style.display = 'block';
                    }
                    
                    function resetMarker() {
                        // Don't reset if this is the selected marker
                        if (globalSelectedMarker !== nebuleAirMarker) {
                            nebuleAirMarker.setZIndexOffset(0);
                            textMarker.setZIndexOffset(0);
                        }
                        deviceInfo._div.style.display = 'none';
                    }
                    
                    // Apply hover effects to both markers
                    nebuleAirMarker.on('mouseover', highlightMarker).on('mouseout', resetMarker);
                    textMarker.on('mouseover', highlightMarker).on('mouseout', resetMarker);
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
    console.log({
        data: data,
        pas_de_temps: pas_de_temps,
        historique: historique,
        mesures: mesures
    })
    // Gestion icone fermeture sidepanel
    var closeButton = document.getElementById('toggleSidePanel').querySelector("i");
    closeButton.classList.replace('bi-chevron-right', 'bi-chevron-left');
    
    console.log("openSidePanel_nebuleAir");

    historique_chart = historique;
    pas_de_temps_chart = pas_de_temps;
    
    // Reset all button states
    var historique_buttons = document.querySelectorAll('[id^="btn_historique_"]');
    var pas_de_temps_buttons = document.querySelectorAll('[id^="btn_pas_de_temps_"]');
    
    historique_buttons.forEach(btn => btn.checked = false);
    pas_de_temps_buttons.forEach(btn => btn.checked = false);

    //il faut passer à la fonction un array pour mesures
    // Clear the array by setting its length to 0
    mesures_array.length = 0;
    if (Array.isArray(mesures)) {
        mesures.forEach(measure => mesures_array.push(measure));
    } else {
        // If it's a single value, push it directly
        mesures_array.push(mesures);
    }

    //on lance la fonction pour récupérer les datas de mesures
    retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps, historique, mesures_array);

    card1_img.src="img/nebuleair/NebuleAir_photo.png"
    card1_title.innerHTML = data.sensorId;
    card1_subtitle.innerHTML = "Capteur citoyen";
    card1_text.innerHTML=""; //empty content from previous opening

    card2_text.innerHTML="Le capteur NebuleAir est un dispositif de mesure de l'air extérieur développé par AirCarto et AtmoSud. Il peut être placé sur le rebord d'une fenêtre ou sur un balcon afin de mesurer le taux de particules fines présent dans l'air. Il communique ses données toutes 2 minutes et les envoies sur les serveurs d'AirCarto via une connexion WIFI."
    card2_link.innerHTML="AirCarto.fr"; //empty content from previous opening
    card2_link.href = "https://aircarto.fr";

    // Historique Button handlers setup
    btn_historique_custom.onclick = function (event){
        event.preventDefault();
        var startDate = btn_historique_start_date.value;
        var endDate = btn_historique_end_date.value;
        var startTime = "00:00";
        var endTime = "23:59";
        console.log({startDate:startDate, startTime:startTime, endDate:endDate, endTime:endTime});
        if (startDate && startTime && endDate && endTime) {
            historique_buttons.forEach(btn => btn.checked = false);
            btn_historique_custom.checked = true;

            let startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
            
            console.log("Date de début:", startDateTime, "Date de fin:", endDateTime);
            retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, null, mesures_array, false, startDateTime, endDateTime);
        } else {
            alert("Veuillez sélectionner une date et une heure de début et de fin.");
        }
    }
    
    //1.historique
    btn_historique_1h.onclick = function() {
        historique_chart = "1h";
        historique_buttons.forEach(btn => btn.checked = false);
        btn_historique_1h.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };
    btn_historique_3h.onclick = function() {
        historique_chart = "3h";
        historique_buttons.forEach(btn => btn.checked = false);
        btn_historique_3h.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };
    btn_historique_24h.onclick = function() {
        historique_chart = "24h";
        historique_buttons.forEach(btn => btn.checked = false);
        btn_historique_24h.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };
    btn_historique_1sem.onclick = function() {
        historique_chart = "7d";
        historique_buttons.forEach(btn => btn.checked = false);
        btn_historique_1sem.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };
    btn_historique_1m.onclick = function() {
        historique_chart = "30d";
        historique_buttons.forEach(btn => btn.checked = false);
        btn_historique_1m.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };
    btn_historique_1a.onclick = function() {
        historique_chart = "365d";
        historique_buttons.forEach(btn => btn.checked = false);
        btn_historique_1a.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };

   //2.pas de temps
    btn_pas_de_temps_2min.onclick = function() {
        pas_de_temps_chart = "2m";
        pas_de_temps_buttons.forEach(btn => btn.checked = false);
        btn_pas_de_temps_2min.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };
    btn_pas_de_temps_qh.onclick = function() {
        pas_de_temps_chart = "15m";
        pas_de_temps_buttons.forEach(btn => btn.checked = false);
        btn_pas_de_temps_qh.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };
    btn_pas_de_temps_h.onclick = function() {
        pas_de_temps_chart = "1h";
        pas_de_temps_buttons.forEach(btn => btn.checked = false);
        btn_pas_de_temps_h.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };
    btn_pas_de_temps_d.onclick = function() {
        pas_de_temps_chart = "1d";
        pas_de_temps_buttons.forEach(btn => btn.checked = false);
        btn_pas_de_temps_d.checked = true;
        retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array);
    };

    //3. Mesures (ATTENTION: ici on peut choisir plusieurs polluants -> add_mesure = true)
    btn_poluant_pm1.onclick = function() {
        if (mesures_array.includes("pm1")) {
            // Remove pm1 from array
            mesures_array = mesures_array.filter(item => item !== "pm1");
            btn_poluant_pm1.checked = false;
        } else {
            // Add pm1 to array
            mesures_array.push("pm1");
            btn_poluant_pm1.checked = true;
        }
        
        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var startTime = btn_historique_start_time.value;
            var endDate = btn_historique_end_date.value;
            var endTime = btn_historique_end_time.value;
            let startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
            retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, null, mesures_array, true, startDateTime, endDateTime);
        } else {
            retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array, true);
        }
    };
    
    btn_poluant_pm25.onclick = function() {
        if (mesures_array.includes("pm25")) {
            mesures_array = mesures_array.filter(item => item !== "pm25");
            btn_poluant_pm25.checked = false;
        } else {
            mesures_array.push("pm25");
            btn_poluant_pm25.checked = true;
        }
        
        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var startTime = btn_historique_start_time.value;
            var endDate = btn_historique_end_date.value;
            var endTime = btn_historique_end_time.value;
            let startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
            retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, null, mesures_array, true, startDateTime, endDateTime);
        } else {
            retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array, true);
        }
    };
    
    btn_poluant_pm10.onclick = function() {
        if (mesures_array.includes("pm10")) {
            mesures_array = mesures_array.filter(item => item !== "pm10");
            btn_poluant_pm10.checked = false;
        } else {
            mesures_array.push("pm10");
            btn_poluant_pm10.checked = true;
        }
        
        if (btn_historique_custom.checked) {
            var startDate = btn_historique_start_date.value;
            var startTime = btn_historique_start_time.value;
            var endDate = btn_historique_end_date.value;
            var endTime = btn_historique_end_time.value;
            let startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
            let endDateTime = new Date(`${endDate}T${endTime}`).toISOString();
            retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, null, mesures_array, true, startDateTime, endDateTime);
        } else {
            retreive_historiqueData_nebuleAir(data.sensorId, pas_de_temps_chart, historique_chart, mesures_array, true);
        }
    };
    
    btn_poluant_no2.disabled = true;

    //adaptation des boutons en fonction de l'historique, du pas de temps et des mesures
    var historique_button_checked = document.getElementById("btn_historique_"+historique);
    if (historique_button_checked) historique_button_checked.checked = true;
    
    // Adaptation for pas_de_temps button
    var pas_de_temps_btn;
    if (pas_de_temps == "2m" || pas_de_temps == "2min") {
        pas_de_temps_btn = "2min";
    } else if (pas_de_temps == "15m" || pas_de_temps == "qh") {
        pas_de_temps_btn = "qh";
    } else if (pas_de_temps == "1h" || pas_de_temps == "h") {
        pas_de_temps_btn = "h";
    } else if (pas_de_temps == "1d" || pas_de_temps == "d") {
        pas_de_temps_btn = "d";
    } else {
        pas_de_temps_btn = pas_de_temps;
    }
    
    console.log("Checking pas de temps button: btn_pas_de_temps_" + pas_de_temps_btn);
    var btn_pas_de_temps = document.getElementById("btn_pas_de_temps_" + pas_de_temps_btn);
    if (btn_pas_de_temps) {
        btn_pas_de_temps.checked = true;
    } else {
        console.warn("Could not find pas de temps button: btn_pas_de_temps_" + pas_de_temps_btn);
    }
    
    // Check the appropriate measure button(s)
    mesures_array.forEach(function(element) {
        var measure_button = document.getElementById("btn_poluant_"+element);
        if (measure_button) measure_button.checked = true;
    });

    //fonction semblable pour tous les types de capteurs
    openSidePanel_generic();
}




/*
RECUPERATION DES DONNEE D'UN CAPTEUR -> CHART
    mesures_array est un array (ex: [PM1, PM2.5])
    mesure est le polluant qu'il faut ajouter à mesure_array (si add_mesure est true)
*/

/*
RECUPERATION DES DONNEE D'UN CAPTEUR -> CHART
    mesures_array est un array (ex: [PM1, PM2.5])
    mesure est le polluant qu'il faut ajouter à mesure_array (si add_mesure est true)
*/

function retreive_historiqueData_nebuleAir(sensorId, pas_de_temps, historique, mesures_array, add_mesure=false, custom_start=null, custom_end=null){
    console.log({
        sensorId: sensorId,
        pas_de_temps: pas_de_temps,
        historique: historique,
        mesures_array: mesures_array,
        add_mesure: add_mesure
    })
    const start = Date.now(); //actual timestamp to measure response time
    //il faut vider le div chartdiv_sensor (dans le cas ou canvasJS l'a utilisé juste avant)
    document.getElementById("chartdiv_sensor").innerHTML = "";
    ////si add_mesure est true alors il faut ajouter le polluant à mesures_array

    console.log("Retreive data for sensor: "  + sensorId );
    console.log("Pas de temps: "  + pas_de_temps );
    console.log("Historique: "  + historique );
    console.log("Mesures array: "  + mesures_array );
    console.log("Adding mesure: " + add_mesure)

    //il faut unchecked les boutons 
    var inputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    inputs.forEach(function(input) {
        input.checked = false;
    });

    //attention pour le pas de temps des boutons il faut convertir ()
    var pas_de_temps_btn;
    switch(pas_de_temps) {
        case "2m":
        case "2min":
            pas_de_temps_btn = "2min";
            break;
        case "15m":
        case "qh":
            pas_de_temps_btn = "qh";
            break;
        case "1h":
        case "h":
            pas_de_temps_btn = "h";
            break;
        case "1d":
        case "d":
            pas_de_temps_btn = "1d";
        case "24h":
            pas_de_temps_btn = "d";
            break;
        default:
            pas_de_temps_btn = pas_de_temps;
    }

    console.log("Setting button: btn_pas_de_temps_" + pas_de_temps_btn);

    //on checked le input qui a été sélectioné
    if (historique) {
        var historique_button_checked = document.getElementById("btn_historique_"+historique);
        if (historique_button_checked) historique_button_checked.checked = true;
    } else if (custom_start && custom_end) {
        var btn_historique_custom = document.getElementById("btn_historique_custom");
        if (btn_historique_custom) btn_historique_custom.checked = true;
    }
    
    var pas_de_temps_button = document.getElementById("btn_pas_de_temps_"+pas_de_temps_btn);
    if (pas_de_temps_button) {
        pas_de_temps_button.checked = true;
    } else {
        console.warn("Could not find pas de temps button for: " + pas_de_temps_btn);
    }
    
    //attention à l'array pour les mesures!!
    //on ajout le checked pour chaque polluant sélectionné
    mesures_array.forEach(function(element) {
        var historique_mesure_checked = document.getElementById("btn_poluant_"+element);
        if (historique_mesure_checked) historique_mesure_checked.checked = true;
    });

    //pour le pas de temps (pour l'URL) il faut convertir (2min, qh, h et d -->en--> 2m, 15m, 1h et 1d)
    //pour le pas de temps (pour l'URL) il faut convertir (2min, qh, h et d -->en--> 2m, 15m, 1h et 1d)
    //pour le pas de temps (pour l'URL) il faut convertir
    var api_pas_de_temps;
    switch(pas_de_temps) {
        case "2m":
        case "2min":
            api_pas_de_temps = "2m";
            break;
        case "15m":
        case "qh":
            api_pas_de_temps = "15m";
            break;
        case "1h":
        case "h":
            api_pas_de_temps = "1h";
            break;
        case "1d":
        case "d":
        case "journalier":
        case "24h":
            api_pas_de_temps = "1d";
            break;
        default:
            api_pas_de_temps = pas_de_temps;
    }



    var full_url;
    if (custom_start && custom_end) {
        // Use custom date range
        full_url = `https://api.aircarto.fr/capteurs/dataNebuleAir?capteurID=${sensorId}&start=${custom_start}&end=${custom_end}&freq=${api_pas_de_temps}`;
    } else {
        // Use relative time range
        full_url = `https://api.aircarto.fr/capteurs/dataNebuleAir?capteurID=${sensorId}&start=-${historique}&stop=now&freq=${api_pas_de_temps}`;
    }
    
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
            if (pas_de_temps == "24h" || pas_de_temps == "1d" || pas_de_temps == "d") {baseInterval_timeUnit_local = "day"; baseInterval_count=1}

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
                if (mesures_array.includes("pm1")) {
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
                }

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
