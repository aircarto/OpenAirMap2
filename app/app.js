console.log("OpenAirMap V2")


var sidePanel = document.getElementById('side-panel');
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
//todo: UN SEUL ELEMENT PEUT ETRE COCHE + ON NE PEUT PAS DECOCHER !!
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
          button.classList.remove("active");
          removeItemFromLocalStorageArray(mesures_local, code)
        } else {
          addItemToLocalStorageArray(mesures_local, code);
          button.classList.add("active");
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
      button.className="dropdown-item";
      button.classList.add("dropdown-item");
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
        if(isValueInObject(check_array, code)){
          button.classList.remove("active");
          removeItemFromLocalStorageArray(sources_local, code)
        } else {
          addItemToLocalStorageArray(sources_local, code);
          button.classList.add("active");
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
      button.innerHTML = pas_de_temps[key].name; 
      button.className="dropdown-item";
      let li = document.createElement('li'); 
      li.appendChild(button); 
      dropdown_pas_de_temps.appendChild(li); 
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
