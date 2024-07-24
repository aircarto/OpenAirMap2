/*
Récupération des données des micro stations
-> API ATMOSUD "OBSERVATIONS/CAPTEURS/DERNIERES"
-> Ou plutot "OBSERVATIONS/CAPTEURS/SITES"

En réponse on a:

valeur          valeur corrigée
valeur_brute    valeur brute
valeur_ref      valeur corrigée si existe sinon valeur brute

*/


function load_atmoSud_microStations() {
    console.log("%cload_atmoSud_microStations", "color: yellow; font-style: bold; background-color: blue;padding: 2px",);
    const start = Date.now();
    //need to switch pas de temps: d->journalier h->horaire qh -> quart horaire
    atmo_micro_layer.clearLayers();
    var pas_de_temps=getArrayFromLocalStorage(pas_de_temps_local) //attention revoie un objet !!
    var pas_de_temps_atmo=""
    switch (pas_de_temps[0]){
        case 'qh':
            var pas_de_temps_atmo="quart-horaire"
            break;
        case 'h':
            var pas_de_temps_atmo="horaire"
            break;
        case 'd':
            var pas_de_temps_atmo="journalier"
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

    //ATTENTION pas de donnée dispo pour les micro-stations au pas de temps 2min ou journalier
    if (pas_de_temps[0] === '2min' || pas_de_temps[0] === 'd') {
        console.warn("Pas de données pour le pas de temps " + pas_de_temps);
        return;
    }

    console.log("Pas de temps : "+ pas_de_temps);
    console.log("Pas de temps Atmo: "+ pas_de_temps_atmo);
    console.log("Mesures : "+ mesures);

    let full_url_derniere = `
    https://api.atmosud.org/observations/capteurs/mesures/dernieres?
    format=json
    &download=false
    &valeur_brute=true
    &type_capteur=true
    &variable=${mesures_atmo}
    &aggregation=${pas_de_temps_atmo}
    &nb_dec=1
    `.replace(/\s+/g, '')

    $.ajax({
        method: "GET",
        url: full_url_derniere,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log(full_url_derniere)
            const end = Date.now();
            const requestTimer = (end - start) / 1000;
            console.log(`Data gathered in %c${requestTimer} sec`, "color: red;");
            console.log(data);
            $.each(data, function (key, value) {
                //ICONE
                //image des points sur la carte (créer un icone et le place sur la carte en marker)
                //par défaut c'est le point gris
                var icon_param = {
                    iconUrl: 'img/microStationsAtmoSud/microStationAtmoSud_default.png',
                    iconSize: [50, 50], // size of the icon
                    iconAnchor: [5, 40], // point of the icon which will correspond to marker's location
                    popupAnchor: [0, -10],
                    tooltipAnchor: [-50, -10]
                }
                //pour les pm1 et les PM25 on change l'icone
                if (mesures == "pm1" || mesures == "pm25") {
                    for (let key in seuils_PM1_PM25) {
                        let code = seuils_PM1_PM25[key].code
                        let min = seuils_PM1_PM25[key].min
                        let max = seuils_PM1_PM25[key].max
                        //si la valeur est entre le max et le min
                        if (value['valeur_brute'] >= min & value['valeur_brute'] <= max) {
                            icon_param.iconUrl = 'img/microStationsAtmoSud/microStationAtmoSud_'+code+'.png';
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
                        if (value['valeur_brute'] >= min & value['valeur_brute'] <= max) {
                            icon_param.iconUrl = 'img/microStationsAtmoSud/microStationAtmoSud_'+code+'.png';
                        }
                    }
                }
                //Tooltip
                var microStation_Tooltip = value['nom_site'];
                //create icons
                var microStation_icon = L.icon(icon_param);
                //create a marker from icon
                L.marker([value['lat'], value['lon']], { icon: microStation_icon })
                .addTo(atmo_micro_layer);

                //TEXTE
                let roundedvalue = Math.round(parseFloat(value['valeur_brute']));
                //textSize (if number under 10)
                var textSize = 32;
                var x_position = -10;
                var y_position = 41;
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

                L.marker([value['lat'], value['lon']], { icon: text_param })
                .on('click', function () {
                    console.log("Click on device: " + value['id_site'])
                    openSidePanel_microStation(value)
               })
                .bindTooltip(microStation_Tooltip, {direction: 'center'})
                .addTo(atmo_micro_layer);

            })//end $each
            //ajouter la layer sur la carte
            map.addLayer(atmo_micro_layer);
        }, //end ajax sucess
        error: function(xhr, status, error){
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
        } 
      });//end ajax

}//end function load_atmoSud_microStations