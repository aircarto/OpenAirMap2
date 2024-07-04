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

//variable pour les layers leaflet
var nebuleair = new L.layerGroup();
var sensor_commmunity = new L.layerGroup();
var sensor_commmunity = new L.layerGroup();
var atmo_micro = new L.layerGroup();
var atmo_ref = new L.layerGroup();
var modelisationPMAtmoSud = new L.layerGroup();
var modelisationICAIRAtmoSud = new L.layerGroup();
var signalair = new L.layerGroup();
var purpleAir = new L.layerGroup();

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

// Function to save array to local storage
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

//Mesures dropdown list (attention seul un élément peut etre coché)
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
            //pas forcément besoin d'un remove layer mais plutot d'un clearLayed
            //TODO clear the cache!!
            //removeSource(code);
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

//Source de donnée dropdown List
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
          removeSource(code);
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
    case 'atmo_micro':loadAtmoMicro();break;
    case 'atmo_ref':loadAtmoRef();break;
    case 'mod_pm':loadModPM();break;
    case 'icairh':loadicairh();break;
    case 'vents':loadVents();break;
    case 'signalair':loadSignalAir();break;
  }
}

//Enlever les sources depuis un bouton
function removeSource(source){
  console.log("Remove data for " + source) ;
  switch(source){
    case 'nebuleair': map.removeLayer(nebuleair);break;
    case 'sensor_commmunity': map.removeLayer(sensor_commmunity);break;
    case 'purpleair': map.removeLayer(purpleair);break;
    case 'atmo_micro': map.removeLayer(atmo_micro);break;
    case 'atmo_ref': map.removeLayer(atmo_ref);break;
    case 'mod_pm': map.removeLayer(mod_pm);break;
    case 'icairh': map.removeLayer(mod_pm);break;
    case 'vents': map.removeLayer(mod_pm);break;
    case 'signalair': map.removeLayer(signalair);break;
  }
}

//Enlever les layer depuis un bouton
function clearLayer(source){
  console.log("Clearing layer  for " + source) ;
  switch(source){
    case 'nebuleair': nebuleair.clearLayers();break;
    case 'sensor_commmunity': map.removeLayer(sensor_commmunity);break;
    case 'purpleair': map.removeLayer(purpleair);break;
    case 'atmo_micro': map.removeLayer(atmo_micro);break;
    case 'atmo_ref': map.removeLayer(atmo_ref);break;
    case 'mod_pm': map.removeLayer(mod_pm);break;
    case 'icairh': map.removeLayer(mod_pm);break;
    case 'vents': map.removeLayer(mod_pm);break;
    case 'signalair': map.removeLayer(signalair);break;
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

//side panel
function openSidePanel_signalair(data, nuisance_type){
  console.log("Opening side panel for SignalAir");
  console.log(data.city);
  card1_title.innerHTML = "Nuisance: " + nuisance_type;
  sidePanel.classList.add('col-2');
  sidePanel.style.display = 'block'; 
  mapContainer.classList.remove('col-12'); 
  mapContainer.classList.add('col-10');
  mapContainer.style.paddingLeft ='10px'; 
}


function closeSidePanel(){
  console.log("Closing side panel");
  sidePanel.classList.remove('col-2');
  sidePanel.style.display = 'none';
  mapContainer.classList.remove('col-10'); 
  mapContainer.classList.add('col-12'); 
  mapContainer.style.paddingLeft ='30px'; 

}

 //Automatic location 
function goToPosition(position) {
  map.setView(
    [position.coords.latitude, position.coords.longitude],
    zoomLevel
  );
}

function notAllowed(err) {
  //console.log("Vous n'avez pas autorisé la détection de la position.")
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
