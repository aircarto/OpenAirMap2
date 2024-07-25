function loadMobileAir() {
    console.log("%cloadMobileAir", "color: yellow; font-style: bold; background-color: blue;padding: 2px",);
    mobileair_layer.clearLayers();
    var mesures=getArrayFromLocalStorage(mesures_local)
    console.log("Mesures : "+ mesures);

    var capteur_ID = "002"

    let full_url_mobileair = `
    https://api.aircarto.fr/capteurs/dataMobileAir?capteurID=${capteur_ID}&
    start=-7d&
    stop=now
    format=json&
    `.replace(/\s+/g, '')

    //Getting data from API
    $.ajax({
        method: "GET",
        url: full_url_mobileair,
        // data: ({timespan: timespanLower}),
        success: function (data) {
            console.log(data);
            $.each(data, function (key, value) {

                //création de ronds
                L.circle([value['lat'], value['lon']], {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 0.5,
                    radius: 5
                }).addTo(mobileair_layer);

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