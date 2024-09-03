console.log("OpenAirMap V2")

//récupérer la date et l'heure (client side!)
var now = new Date();
var year = now.getFullYear();
var month = (now.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
var day = now.getDate().toString().padStart(2, '0');

var hours = now.getHours().toString().padStart(2, '0');
var minutes = now.getMinutes().toString().padStart(2, '0');
var seconds = now.getSeconds().toString().padStart(2, '0');

var date_YMD = year + '-' + month + '-' + day;
var date_YDM = year + '-' + day + '-' + month;
var formattedTime = hours + ':' + minutes + ':' + seconds;

console.log("Date: " + date_YMD);
console.log("Time: " + formattedTime);

//Amcharts chart
var amchart_root; 

//variable pour les layers leaflet
var nebuleair_layer = new L.layerGroup();
var sensor_commmunity_layer = new L.layerGroup();
var purpleair_layer = new L.layerGroup();
var atmo_micro_layer = new L.layerGroup();
var atmo_ref_layer = new L.layerGroup();
var modelisationPMAtmoSud_layer = new L.layerGroup();
var modelisationICAIRAtmoSud_layer = new L.layerGroup();
var signalair_layer = new L.layerGroup();
var mobileair_layer = new L.layerGroup();


//variable pour le DOM
var sidePanel = document.getElementById('side-panel');
var card1 = document.getElementById('card1');
var card1_body = document.getElementById('card1_body');
var card1_img = document.getElementById('card1_img');
var card1_title = document.getElementById('card1_title');
var card1_text = document.getElementById('card1_text');
var card1_button = document.getElementById('card1_button');

var mapContainer = document.getElementById('map-container');
var dropdown_mesures = document.getElementById('dropdown_mesures');
var dropdown_sources = document.getElementById('dropdown_sources');
var dropdown_pas_de_temps = document.getElementById('dropdown_pas_de_temps');
const mesures_local = 'mesures_local'
const sources_local = 'sources_local'
const pas_de_temps_local = 'pas_de_temps_local'

/*
Pour les dropdown:
  creation d'un bouton
  avec un nom issu de config.js
  un classe de "dropdown-item"
*/

// Function to save array to local storage (erase and save)
function saveArrayToLocalStorage(key, array) {
  localStorage.setItem(key, JSON.stringify(array));
}

 // Function to get array from local storage
function getArrayFromLocalStorage(key) {
  const storedArray = localStorage.getItem(key);
  return storedArray ? JSON.parse(storedArray) : [];
}

  // Function to add item to local storage array
function addItemToLocalStorageArray(key, item) {
  const array = getArrayFromLocalStorage(key);
  array.push(item);
  saveArrayToLocalStorage(key, array);
}

// Function to remove item from local storage array
function removeItemFromLocalStorageArray(key, item) {
  const array = getArrayFromLocalStorage(key);
  const index = array.indexOf(item);
  if (index > -1) {
      array.splice(index, 1);
      saveArrayToLocalStorage(key, array);
  }
}

//vérifier si un élément est dans un js object
function isValueInObject(obj, value) {
  for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
          if (obj[key] === value) {
              //console.log(`Value "${value}" is present in the object.`);
              return true;
          }
      }
  }
  //console.log(`Value "${value}" is not present in the object.`);
  return false;
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

//MESURES dropdown list (attention seul un élément peut etre coché)
for (let key in mesures) {
  if (mesures.hasOwnProperty(key)) {
      let button = document.createElement('button');
      let name = mesures[key].name
      let code = mesures[key].code
      let activated = mesures[key].activated
      button.innerHTML = name; 
      button.classList.add("dropdown-item");
      //save inside local storage the initial config (if empty)
      if(isEmptyObject(getArrayFromLocalStorage(mesures_local))){
        if (activated) {
          addItemToLocalStorageArray(mesures_local, code);
        }
      }
      //on vérifie le local storage (object) pour voir si l'élément est déjà présent
      let check_array=getArrayFromLocalStorage(mesures_local);
      if(isValueInObject(check_array, code)){
        button.classList.add("active");
      }
      //on ajoute la fonction pour le onclick
      button.onclick= function (){
        let check_array=getArrayFromLocalStorage(mesures_local);
        if(isValueInObject(check_array, code)){
          console.warn("on ne peut pas decocher")
        } else {
          //on elève les autres
          localStorage.removeItem(mesures_local);
          let listItems = document.querySelectorAll('#dropdown_mesures li');
          listItems.forEach(li => {
            // Find all button elements inside the current li element
            let buttons = li.querySelectorAll('button');
            // Iterate over each button element and remove the class
            buttons.forEach(button => {
                button.classList.remove('active');
            });
          });
          //on ajoute le nouveau
          addItemToLocalStorageArray(mesures_local, code);
          button.classList.add("active");
          //ICI ON PEUT FETCHER LES DATAS
          console.log("Changement du type de mesure: " + getArrayFromLocalStorage(mesures_local));
          //attention il faut éventuellement vider le cache
          //il faut aussi prendre en compte les source de données déjà ouverte
          console.log("Necessite le renouvellement de: " + getArrayFromLocalStorage(sources_local))
          //loop over the object (ex: ["nebuleair","signalair"])
          for (let item of getArrayFromLocalStorage(sources_local)) {
            //console.log(item);
            clearLayer(code);
            //get the new data
            loadSource(item);
          }
        }
      }
      let li = document.createElement('li'); 
      li.appendChild(button); 
      dropdown_mesures.appendChild(li); 
  }
}

//SOURCE de donnée dropdown List
for (let key in sources) {
  if (sources.hasOwnProperty(key)) {
      let button = document.createElement('button');
      let name = sources[key].name
      let code = sources[key].code
      let activated = sources[key].activated
      button.innerHTML = name; 
      button.classList.add("dropdown-item");
      //save inside local storage the initial config (if empty)
      if(isEmptyObject(getArrayFromLocalStorage(sources_local))){
        if (activated) {
          addItemToLocalStorageArray(sources_local, code);
        }
      }
      //on vérifie le local storage (object) pour voir si l'élément est déja présent
      let check_array=getArrayFromLocalStorage(sources_local);
      if(isValueInObject(check_array, code)){
        button.classList.add("active");
      }
      //on ajoute la fonction pour le onclick
      button.onclick= function (){
        let check_array=getArrayFromLocalStorage(sources_local);
        //si l'élément est déjà coché
        if(isValueInObject(check_array, code)){
          button.classList.remove("active");
          removeItemFromLocalStorageArray(sources_local, code);
          //on elève la layer de la carte
          clearLayer(code);
        } else {
          addItemToLocalStorageArray(sources_local, code);
          button.classList.add("active");
          //ICI ON PEUT FETCHER LES DATAS
          loadSource(code);
        }
      }
      let li = document.createElement('li'); 
      li.appendChild(button); 
      dropdown_sources.appendChild(li); 
  }
}

//Pas de temps dropdown List
for (let key in pas_de_temps) {
  if (pas_de_temps.hasOwnProperty(key)) {
      let button = document.createElement('button');
      let name = pas_de_temps[key].name
      let code = pas_de_temps[key].code
      let activated = pas_de_temps[key].activated
      button.innerHTML = name; 
      button.classList.add("dropdown-item");
      //save inside local storage the initial config (if empty)
      if(isEmptyObject(getArrayFromLocalStorage(pas_de_temps_local))){
        if (activated) {
          addItemToLocalStorageArray(pas_de_temps_local, code);
        }
      }
       //on vérifie le local storage (object) pour voir si l'élément est déjà présent
       let check_array=getArrayFromLocalStorage(pas_de_temps_local);
       if(isValueInObject(check_array, code)){
         button.classList.add("active");
       }

       button.onclick= function (){
        let check_array=getArrayFromLocalStorage(pas_de_temps_local);
        if(isValueInObject(check_array, code)){
          console.warn("on ne peut pas decocher")
        } else {
          //on elève les autres
          localStorage.removeItem(pas_de_temps_local);
          let listItems = document.querySelectorAll('#dropdown_pas_de_temps li');
          listItems.forEach(li => {
            // Find all button elements inside the current li element
            let buttons = li.querySelectorAll('button');
            // Iterate over each button element and remove the class
            buttons.forEach(button => {
                button.classList.remove('active');
            });
          });
          //on ajoute le nouveau
          addItemToLocalStorageArray(pas_de_temps_local, code);
          button.classList.add("active");
          //ICI ON PEUT FETCHER LES DATAS
          console.log("Changement du pas de temps: " + getArrayFromLocalStorage(pas_de_temps_local));
          //attention il faut éventuellement vider le cache
          //il faut aussi prendre en compte les source de données déjà ouverte
          console.log("Necessite le renouvellement de: " + getArrayFromLocalStorage(sources_local))
          //loop over the object (ex: ["nebuleair","signalair"])
          for (let item of getArrayFromLocalStorage(sources_local)) {
            //console.log(item);
            clearLayer(code);
            //get the new data
            loadSource(item);
          }
        }
      }

      let li = document.createElement('li'); 
      li.appendChild(button); 
      dropdown_pas_de_temps.appendChild(li); 
  }
}

//Chargement des sources depuis un bouton
function loadSource(source){
  console.log("Loading data for " + source) ;
  switch(source){
    case 'nebuleair':loadNebuleAir();break;
    case 'sensor_commmunity':loadSensorCommunity();break;
    case 'purpleair':loadSensorCommunity();break;
    case 'atmo_micro':load_atmoSud_microStations();break;
    case 'atmo_ref':load_atmoSud_stationsRef();break;
    case 'mod_pm':loadModPM();break;
    case 'icairh':loadicairh();break;
    case 'vents':loadVents();break;
    case 'signalair':loadSignalAir();break;
    case 'mobileair':loadMobileAir();break;

  }
}

//Enlever les layers lorsque l'on change de pas de temps ou de source
function clearLayer(source){
  console.log("Clearing layer  for " + source) ;
  switch(source){
    case 'nebuleair': nebuleair_layer.clearLayers();break;
    case 'sensor_commmunity': sensor_commmunity_layer.clearLayers();break;
    case 'purpleair': purpleair_layer.clearLayers();break;
    case 'atmo_micro': atmo_micro_layer.clearLayers();break;
    case 'atmo_ref': atmo_ref_layer.clearLayers();break;
    case 'mod_pm': modelisationPMAtmoSud_layer.clearLayers();break;
    case 'icairh': modelisationICAIRAtmoSud_layer.clearLayers();break;
    case 'vents': map.clearLayers();break;
    case 'signalair': signalair_layer.clearLayers();break;
    case 'mobileair': mobileair_layer.clearLayers();break;

  }
}


//chargement des sources depuis la mémoire locale (au démarrage de l'appli)
for (let key in sources) {
  let code = sources[key].code
  //on vérifie le local storage (object) pour voir si l'élément est déjà présent
  let check_array=getArrayFromLocalStorage(sources_local);
  if(isValueInObject(check_array, code)){
    loadSource(code);
  }
}

//actualisation des sources toutes les minutes
//TEST AVEC MOBILEAIR 
function reload_layers(source){
  console.log("⏰ Reloading layers");
  clearLayer("mobileair");
  //get the new data
  loadSource("mobileair");
}

setInterval(reload_layers, 9990000); //60000 -> 1min


//OPEN SIDE PANEL
/*
Sur un grand écran on veut un side panel moins large (col-lg) 
que sur un petit écran (col) sinon il est trop fin
*/
function openSidePanel_generic(){
  //console.log("openSidePane_generic");
  //side panel
  // sur smartphone -> toute la place (col-12)
  // sur ordi petit (sm) -> 6 colonnes
  // sur grand écran (lg) -> 5 colonnes
  sidePanel.classList.add('col-12','col-sm-6', 'col-lg-5'); 
  sidePanel.style.display = 'block';
  //map 
  mapContainer.classList.remove('col-12'); 
  mapContainer.classList.add('col-6', 'col-lg-7');
  mapContainer.style.paddingLeft ='10px'; 
}

function openSidePanel_signalair(data, nuisance_type){
  console.log("Opening side panel for SignalAir");
  card1_img.src="img/signalair/logoSignalAir.png"
  card1_title.innerHTML = "Nuisance: " + nuisance_type;
  card1_text.innerHTML =  `
    Ville:   ${data["city"]} </br>
    <table class="table">
      <tbody>
        <tr>
          <td>Niveau de gêne</td>
          <td>${data["niveau-de-gene"]}</td>
        </tr>
        <tr>
          <td>Symptômes déclarés</td>
          <td>${data["si-oui-quels-symptomes"]}</td>
        </tr>
        <tr>
          <td>Origine de la nuisance</td>
          <td>${data["origine-de-la-nuisance"]} ${data["description-de-lorigine-de-la-nuisance"]}</td>
        </tr>
        <tr>
          <td>Durée de la nuisance</td>
          <td>${data["duree-de-la-nuisance"]}</td>
        </tr>
        <tr>
        <td>Commentaires</td>
        <td>${data["remarque-commentaire"]}</td>
      </tr>
      </tbody>
    </table>
    <a href="https://www.signalair.eu/fr/" target="_blank" class="btn btn-primary" id="card1_button">Faire un signalement</a>

     `;

     openSidePanel_generic() 
}

function openSidePanel_microStation(data){
  console.log("openSidePanel_microStation");
  card1_img.src="img/microStationsAtmoSud/microStation_photo.jpg"
  card1_title.innerHTML = data.nom_site;
  card1_subtitle.innerHTML = "Micro station AtmoSud";

  // Crée une nouvelle div pour les gauges
  const newDiv_gauges = document.createElement('div');
  newDiv_gauges.id = 'squaresContainer';
  card1_text.innerHTML="";  //empty content from previous opening
  card1_text.appendChild(newDiv_gauges);
  createColorSquares();
  // Crée une nouvelle div pour les courbes
  const newDiv_chart = document.createElement('div');
  newDiv_chart.id = 'chart';
  card1_text.appendChild(newDiv_chart);

  openSidePanel_generic()

}

function openSidePanel_stationRef(data){
  console.log("openSidePanel_stationRef");
  card1_img.src="https://www.atmosud.org/sites/sud/files/styles/slider/public/medias/images/2022-04/station_longchamp_1.jpg?itok=y8Oi_LxY"
  card1_title.innerHTML =  data.nom_station;
  card1_subtitle.innerHTML = "Station de référence AtmoSud";

  // Crée une nouvelle div pour les gauges
  const newDiv_gauges = document.createElement('div');
  newDiv_gauges.id = 'squaresContainer';
  card1_text.innerHTML="";  //empty content from previous opening
  card1_text.appendChild(newDiv_gauges);
  createColorSquares();
  // Crée une nouvelle div pour les courbes
  const newDiv_chart = document.createElement('div');
  newDiv_chart.id = 'chart';
  card1_text.appendChild(newDiv_chart);

  openSidePanel_generic()
}

//CLOSE SIDE PANEL
function closeSidePanel(){
  console.log("Closing side panel");
  sidePanel.classList.remove('col-2','col-sm-4','col-lg-3');
  sidePanel.style.display = 'none';
  mapContainer.classList.remove('col-8', 'col-lg-9'); 
  mapContainer.classList.add('col-12'); 
  mapContainer.style.paddingLeft ='30px'; 
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

//Location et Zoom par défaut récupéré dans config.js
//si existe dans Local Storage alors prends les variables en local
if ('Lat' in localStorage) {
  let coordsCenter_local_lat = localStorage.getItem('Lat');
  let coordsCenter_local_long = localStorage.getItem('Long');
  let zoomLevel_local = localStorage.getItem('Zoom');
  map.setView([coordsCenter_local_lat, coordsCenter_local_long], zoomLevel_local);
} else {
  map.setView(coordsCenter, zoomLevel);
} 


// Dès que l'on bouge la cart on enregistre LAT/LONG/ZOOM
map.on('moveend', function() {
 // Get the map's center coordinates
 var center = map.getCenter();
 var currentZoom = map.getZoom();
 var lat = center.lat;
 var lng = center.lng;
 // Log the latitude and longitude to the console
 saveArrayToLocalStorage("Lat", lat);
 saveArrayToLocalStorage("Long", lng);
 saveArrayToLocalStorage("Zoom", currentZoom);
});



