/*
Récupération des données des signalements

https://www.signalair.eu/fr/flux/[format]/[id]/[date_deb]/[date_fin].

Odeurs :gq1jrnp9
Bruits : yq7b5jal
Visuels : 28qg73y9
Brûlages : yib5aa1n

Par défaut on affiche les trois derniers jours

*/

var signalair_json = {
    "odeur": {"name": "odeur", "code" : "odeur", "url" : "gq1jrnp9", "img": "odeur.png" },
    "bruits": {"name": "bruit", "code" : "bruit", "url" : "yq7b5jal", "img": "bruits.png" },
    "visuel": {"name": "visuel", "code" : "visuel", "url" : "28qg73y9", "img": "visuel.png" },
    "brûlage": {"name": "brûlage", "code" : "brulage", "url" : "yib5aa1n", "img": "brulage.png"}
}

// Subtract 3 days from the current date
var now2 = new Date();
now2.setDate(now2.getDate() - 3);
var year = now2.getFullYear();
var month = (now2.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
var day_minus3 = now2.getDate().toString().padStart(2, '0');
// Format the date
var date_YMD_minus3 = year + '-' + month + '-' + day_minus3;
//console.log(date_YMD_minus3);

function loadSignalAir() {
    console.log("%cSignalAir", "color: yellow; font-style: bold; background-color: blue;padding: 2px",);
    const url_odeurs = 'https://www.signalair.eu/fr/flux/geojson/gq1jrnp9/';
    
    //loop inside signalair JSON
    for (let key in signalair_json) {
        let code = signalair_json[key].code
        let url = signalair_json[key].url
        let full_url = 'https://www.signalair.eu/fr/flux/geojson/'+url+'/'+date_YMD_minus3+'/'+date_YMD
        let img = signalair_json[key].img
        //console.log(full_url);
        $.ajax({
            url: full_url,
            method: 'GET',
            //dataType: 'json',  
            success: function(data) {
                if (data) {
                    //console.log(data);              
                    $.each(data.features, function(index, value){
                        var coordinates = value.geometry.coordinates;
                        var lat = coordinates[1];  
                        var long = coordinates[0]; 
                        //image des points sur la carte
                        var icon_param = {
                            iconUrl: 'img/signalair/' + img,
                            iconSize: [35, 35], // size of the icon
                            iconAnchor: [15, 15], // point of the icon which will correspond to marker's location
                            popupAnchor: [0, -10]
                        }
                        var signalair_odeur_icon = L.icon(icon_param);
                        //popup lorsque l'on clique sur un élément
                        var signalAirPopup = '<b>'+signalair_json[key].name+'<b>'
                        L.marker([lat, long], { icon: signalair_odeur_icon })
                        .bindPopup(signalAirPopup)
                        .on('click', function (){
                            //lorsque l'on clique sur un élément
                            console.log("Clicked on signalair id " + value.properties.id_declaration)
                            openSidePanel_signalair(value.properties, code)
                        })
                        .addTo(signalair);
                    }); //end each
                    //ajouter la layer sur la carte
                    map.addLayer(signalair);
                } else{
                    console.log("No data for " + code)
                }
            },
            error: function(xhr, status, error) {
            //console.error('Error fetching data from signalair:', error);  // Handle error
            // Log errors if the AJAX request fails
            console.error('Error:', error);
            console.error('Status:', status);
            console.error('Response:', xhr.responseText);
            }
        });
    }
      //fin de la loop
}

