// les URLs utilisées dans l'application 
// Call API

export const API_atmoSud = {
    url_base: 'https://api.atmosud.org',
    // url_base: '172.16.13.182:8080',
    url_capteurs_sites: '/observations/capteurs/sites',
    url_capteurs_mesures: '/observations/capteurs/mesures',
    url_capteurs_mesures_dernieres: '/observations/capteurs/mesures/dernieres',
    url_capteurs_mesures_historique:
        '/observations/capteurs/mesures/historique',
    url_stations: '/observations/stations',
    url_stations_mesures_derniere: '/observations/stations/mesures/derniere',
    url_stations_mesures: '/observations/stations/mesures',
    url_taxonomy_station: '/jsonapi/taxonomy_term/station',
};

export const API_airCarto = {
    url_base: 'https://api.aircarto.fr',
    url_capteurs_metadata: '/capteurs/metadata',
    url_capteurs_data: '/capteurs/dataNebuleAir',
};
