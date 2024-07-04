/*
Récupération des données des signalements

https://www.signalair.eu/fr/flux/[format]/[id]/[date_deb]/[date_fin].

Odeurs :gq1jrnp9
Bruits : yq7b5jal
Visuels : 28qg73y9
Brûlages : yib5aa1n



*/

function loadSignalAir() {
    console.log("%cSignalAir", "color: yellow; font-style: bold; background-color: blue;padding: 2px",);
    const url_odeurs = 'https://www.signalair.eu/fr/flux/geojson/gq1jrnp9/';  
    $.ajax({
        url: url_odeurs,
        method: 'GET',
        dataType: 'json',  
        success: function(data) {
            //console.log(data);              
            $.each(data.features, function(index, value){
                var coordinates = value.geometry.coordinates;
                var lat = coordinates[1];  
                var long = coordinates[0]; 
                //image des points sur la carte
                var icon_param = {
                    iconUrl: 'img/signalair/odeur.png',
                    iconSize: [35, 35], // size of the icon
                    iconAnchor: [0, 0], // point of the icon which will correspond to marker's location
                }
                var signalair_odeur_icon = L.icon(icon_param);
                L.marker([lat, long], { icon: signalair_odeur_icon })
                .on('click', function (){
                    //lorsque l'on clique sur un élément
                    console.log("Clicked on signalair id " + value.properties.id_declaration)
                    openSidePanel_signalair(value.properties, "odeur")
                })
                .addTo(signalair);
            }); //end each
            //ajouter la layer sur la carte
            map.addLayer(signalair);
        },
        error: function(xhr, status, error) {
          console.error('Error fetching data from signalair:', error);  // Handle error
        }
      });
}

