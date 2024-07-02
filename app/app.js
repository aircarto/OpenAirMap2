console.log("OpenAirMap V2")
var sidePanel = document.getElementById('side-panel');
var mapContainer = document.getElementById('map-container');
var dropdown_mesures = document.getElementById('dropdown_mesures');

//create dropdown list
for (var key in mesures) {
  if (mesures.hasOwnProperty(key)) {
      console.log(mesures[key].name);
      var button = document.createElement('button');
      button.innerHTML = mesures[key].name; // Set the text content of the LI element
      button.className="dropdown-item";
      var li = document.createElement('li'); // Create a new LI element
      li.appendChild(button); // Append the LI element to the UL
      dropdown_mesures.appendChild(li); // Append the LI element to the UL
  }
}


function closeSidePanel(){
  console.log("Closing side panel");
  sidePanel.classList.remove('col-2'); 
  mapContainer.classList.remove('col-10'); 
  mapContainer.classList.add('col-12'); 
}

 //Automatic location 
function goToPosition(position) {
  map.setView(
    [position.coords.latitude, position.coords.longitude],
    zoomLevel
  );
}

function notAllowed(err) {
  console.log("Vous n'avez pas autorisé la détection de la position.")
  //openToast("Vous n'avez pas autorisé la détection de la position."); 
  map.setView(coordsCenter, zoomLevel);
}

//Leaflet Map obj creation
let coordsCenter = config.coordsCenter;
let zoomLevel = config.zoomLevel;

var map = L.map("map", {
  //zoomControl: isMobile == true ? false : true,
  minZoom: config.minZoom,
  maxZoom: config.maxZoom,
  renderer: L.canvas(),
  maxBounds: L.latLngBounds(config.boundNE, config.boundSW),
});

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }
).addTo(map);

 //Location test
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(goToPosition, notAllowed);
} else {
  map.setView(coordsCenter, zoomLevel);
}
