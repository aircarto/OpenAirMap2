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
import { isSourceActive } from './dataSourceManager.js';

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

    // Calcul des dates (30 jours glissants)
    const now = new Date();
    const dateEnd = now.toISOString().split('T')[0];
    const dateStart = new Date(now.setDate(now.getDate() - 30))
        .toISOString()
        .split('T')[0];

    console.log(
        `[SignalAir] Période de recherche: du ${dateStart} au ${dateEnd}`
    );

    // Boucle sur chaque type de signalement
    for (let key in signalair_json) {
        const { code, url, img } = signalair_json[key];
        let full_url;

        // Vérification spéciale pour le type visuel
        if (code === 'visuel') {
            console.log(
                `[SignalAir] Vérification de l'URL pour le type visuel`
            );
            // On essaie avec une période plus longue pour voir si c'est un problème de données
            full_url = `https://www.signalair.eu/fr/flux/geojson/${url}/2025-01-01/${dateEnd}`;
            console.log(`[SignalAir] URL modifiée pour visuel: ${full_url}`);
        } else {
            full_url = `https://www.signalair.eu/fr/flux/geojson/${url}/${dateStart}/${dateEnd}`;
            console.log(`[SignalAir] URL pour ${code}: ${full_url}`);
        }

        fetch(full_url)
            .then((response) => {
                console.log(
                    `[SignalAir] Statut de la réponse pour ${code}:`,
                    response.status
                );
                console.log(
                    `[SignalAir] Headers de la réponse pour ${code}:`,
                    response.headers
                );

                if (!response.ok) {
                    throw new Error(
                        `Erreur HTTP: ${response.status} - ${response.statusText}`
                    );
                }

                return response.text();
            })
            .then((text) => {
                console.log(
                    `[SignalAir] Longueur de la réponse pour ${code}:`,
                    text.length
                );

                // Si la réponse est vide, on considère qu'il n'y a pas de données
                if (!text.trim()) {
                    console.log(
                        `[SignalAir] Pas de données disponibles pour ${code}`
                    );
                    return { type: 'FeatureCollection', features: [] };
                }

                console.log(
                    `[SignalAir] Début de la réponse pour ${code}:`,
                    text.substring(0, 100)
                );

                try {
                    const parsedData = JSON.parse(text);
                    console.log(
                        `[SignalAir] Données parsées pour ${code}:`,
                        parsedData
                    );
                    return parsedData;
                } catch (e) {
                    console.error(
                        `[SignalAir] Erreur de parsing JSON pour ${code}:`,
                        e
                    );
                    console.error(
                        `[SignalAir] Contenu reçu pour ${code}:`,
                        text
                    );
                    throw new Error(`Erreur de parsing JSON: ${e.message}`);
                }
            })
            .then((data) => {
                if (!data || !data.features) {
                    console.warn(
                        `[SignalAir] Pas de données valides pour ${code}`
                    );
                    return;
                }

                console.log(
                    `[SignalAir] Nombre de signalements trouvés pour ${code}:`,
                    data.features.length
                );

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

                    // Fonction pour formater la date
                    const formatDate = (dateString) => {
                        if (!dateString) return 'Date non spécifiée';
                        try {
                            const date = new Date(dateString);
                            if (isNaN(date.getTime())) {
                                return 'Date non spécifiée';
                            }
                            return date.toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                        } catch (e) {
                            return 'Date non spécifiée';
                        }
                    };

                    // Création du marqueur
                    L.marker([lat, long], { icon: signalair_icon })
                        .bindPopup(`<b>${signalair_json[key].name}</b>`)
                        .bindTooltip(
                            `
                            <div class="signalair-tooltip">
                                <div class="tooltip-header">
                                    <h6 class="mb-1">${signalair_json[key].name}</h6>
                                    <small class="text-muted">${formatDate(feature.properties.created_at)}</small>
                                </div>
                                <div class="tooltip-body">
                                    <p class="mb-1"><strong>Ville:</strong> ${feature.properties.city || 'Non spécifiée'}</p>
                                    <p class="mb-1"><strong>Niveau de gêne:</strong> ${feature.properties['niveau-de-gene'] || 'Non spécifié'}</p>
                                    <p class="mb-0"><strong>Durée:</strong> ${feature.properties['duree-de-la-nuisance'] || 'Non spécifiée'}</p>
                                </div>
                            </div>
                        `,
                            {
                                direction: 'top',
                                permanent: false,
                                className: 'signalair-tooltip-container',
                                offset: [0, -10],
                            }
                        )
                        .on('click', () => {
                            console.log(
                                `[SignalAir] Clic sur le signalement ${feature.properties.id_declaration}`
                            );
                            openSidePanel_signalair(feature.properties, code);
                        })
                        .addTo(signalair_layer);
                });

                // Ajout de la couche à la carte
                map.addLayer(signalair_layer);
            })
            .catch((error) => {
                console.error(
                    `[SignalAir] Erreur lors de la récupération des données pour ${code}:`,
                    error
                );
                // Afficher un message à l'utilisateur
                const errorMessage = `[SignalAir] Impossible de charger les données ${code}: ${error.message}`;
                console.error(errorMessage);
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
