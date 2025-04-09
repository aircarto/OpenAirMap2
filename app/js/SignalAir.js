/*
Récupération des données des signalements

https://www.signalair.eu/fr/flux/[format]/[id]/[date_deb]/[date_fin].

Odeurs :gq1jrnp9
Bruits : yq7b5jal
Visuels : 28qg73y9
Brûlages : yib5aa1n

Par défaut on affiche les trois derniers jours

*/

import { map, signalair_layer } from '../app.js';

// Configuration des types de signalements
const signalair_json = {
    odeur: { name: 'odeur', code: 'odeur', url: 'gq1jrnp9', img: 'odeur.png' },
    bruits: {
        name: 'bruit',
        code: 'bruit',
        url: 'yq7b5jal',
        img: 'bruits.png',
    },
    visuel: {
        name: 'visuel',
        code: 'visuel',
        url: '28qg73y9',
        img: 'visuel.png',
    },
    brûlage: {
        name: 'brûlage',
        code: 'brulage',
        url: 'yib5aa1n',
        img: 'brulage.png',
    },
};

/**
 * Charge les données SignalAir sur la carte
 */
export function loadSignalAir() {
    console.log(
        '%cSignalAir',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );

    // Nettoyage de la couche existante
    signalair_layer.clearLayers();

    // Calcul des dates (3 derniers jours)
    const now = new Date();
    const dateEnd = now.toISOString().split('T')[0];
    const dateStart = new Date(now.setDate(now.getDate() - 3))
        .toISOString()
        .split('T')[0];

    // Boucle sur chaque type de signalement
    for (let key in signalair_json) {
        const { code, url, img } = signalair_json[key];
        const full_url = `https://www.signalair.eu/fr/flux/geojson/${url}/${dateStart}/${dateEnd}`;

        fetch(full_url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                if (data && data.features) {
                    data.features.forEach((feature) => {
                        const [long, lat] = feature.geometry.coordinates;

                        // Configuration de l'icône
                        const icon_param = {
                            iconUrl: `img/signalair/${img}`,
                            iconSize: [35, 35],
                            iconAnchor: [15, 15],
                            popupAnchor: [0, -10],
                        };

                        const signalair_icon = L.icon(icon_param);

                        // Création du marqueur
                        L.marker([lat, long], { icon: signalair_icon })
                            .bindPopup(`<b>${signalair_json[key].name}</b>`)
                            .on('click', () => {
                                console.log(
                                    'Clicked on signalair id',
                                    feature.properties.id_declaration
                                );
                                openSidePanel_signalair(
                                    feature.properties,
                                    code
                                );
                            })
                            .addTo(signalair_layer);
                    });

                    // Ajout de la couche à la carte
                    map.addLayer(signalair_layer);
                } else {
                    console.log(`Pas de données pour ${code}`);
                }
            })
            .catch((error) => {
                console.error(
                    'Erreur lors de la récupération des données SignalAir:',
                    error
                );
            });
    }
}

/**
 * Ouvre le panneau latéral avec les informations du signalement
 * @param {Object} data - Les données du signalement
 * @param {string} nuisance_type - Le type de nuisance
 */
export function openSidePanel_signalair(data, nuisance_type) {
    console.log('Ouverture du panneau latéral pour SignalAir');

    // Mise à jour du contenu du panneau
    card1_img.src = 'img/signalair/logoSignalAir.png';
    card1_title.innerHTML = 'Nuisance: ' + nuisance_type;
    card1_text.innerHTML = `
        Ville: ${data.city} </br>
        <table class="table">
            <tbody>
                <tr>
                    <td>Niveau de gêne</td>
                    <td>${data['niveau-de-gene']}</td>
                </tr>
                <tr>
                    <td>Symptômes déclarés</td>
                    <td>${data['si-oui-quels-symptomes']}</td>
                </tr>
                <tr>
                    <td>Origine de la nuisance</td>
                    <td>${data['origine-de-la-nuisance']} ${data['description-de-lorigine-de-la-nuisance']}</td>
                </tr>
                <tr>
                    <td>Durée de la nuisance</td>
                    <td>${data['duree-de-la-nuisance']}</td>
                </tr>
                <tr>
                    <td>Commentaires</td>
                    <td>${data['remarque-commentaire']}</td>
                </tr>
            </tbody>
        </table>
        <a href="https://www.signalair.eu/fr/" target="_blank" class="btn btn-primary" id="card1_button">Faire un signalement</a>
    `;

    // Ouverture du panneau latéral
    openSidePanelGeneric();
}
