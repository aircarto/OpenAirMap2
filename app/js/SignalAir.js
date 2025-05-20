import { signalair_layer } from './layers.js';
import { map } from './mapConfig.js';
import { openSidePanelGeneric } from './sidePanel.js';

// Configuration des types de signalements
const signalair_json = {
    odeur: {
        name: 'odeur',
        code: 'odeur',
        url: 'gq1jrnp9',
        img: 'odeur.png',
    },
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
 * @param {string} [startDate] - Date de début au format YYYY-MM-DD
 * @param {string} [endDate] - Date de fin au format YYYY-MM-DD
 */
export function loadSignalAir(startDate, endDate) {
    console.log(
        '%cSignalAir',
        'color: yellow; font-style: bold; background-color: blue;padding: 2px'
    );

    // Nettoyage de la couche existante
    signalair_layer.clearLayers();

    // Calcul des dates si non fournies (veille)
    if (!startDate || !endDate) {
        const now = new Date();
        now.setDate(now.getDate() - 1); // On se place à la veille
        endDate = now.toISOString().split('T')[0];
        startDate = endDate; // Même date que la fin pour n'avoir que la veille
    }

    console.log(
        `[SignalAir] Période de recherche: du ${startDate} au ${endDate}`
    );

    // Boucle sur chaque type de signalement
    for (let key in signalair_json) {
        const { code, url, img } = signalair_json[key];
        let full_url;

        // Vérification spéciale pour le type visuel
        if (code === 'visuel') {
            // console.log(
            //     `[SignalAir] Vérification de l'URL pour le type visuel`
            // );
            // On essaie avec une période plus longue pour voir si c'est un problème de données
            full_url = `https://www.signalair.eu/fr/flux/geojson/${url}/2025-01-01/${endDate}`;
            // console.log(`[SignalAir] URL modifiée pour visuel: ${full_url}`);
        } else {
            full_url = `https://www.signalair.eu/fr/flux/geojson/${url}/${startDate}/${endDate}`;
            // console.log(`[SignalAir] URL pour ${code}: ${full_url}`);
        }

        fetch(full_url)
            .then((response) => {
                // console.log(
                //     `[SignalAir] Statut de la réponse pour ${code}:`,
                //     response.status
                // );
                // console.log(
                //     `[SignalAir] Headers de la réponse pour ${code}:`,
                //     response.headers
                // );

                if (!response.ok) {
                    throw new Error(
                        `Erreur HTTP: ${response.status} - ${response.statusText}`
                    );
                }

                return response.text();
            })
            .then((text) => {
                // console.log(
                //     `[SignalAir] Longueur de la réponse pour ${code}:`,
                //     text.length
                // );

                // Si la réponse est vide, on considère qu'il n'y a pas de données
                if (!text.trim()) {
                    // console.log(
                    //     `[SignalAir] Pas de données disponibles pour ${code}`
                    // );
                    return { type: 'FeatureCollection', features: [] };
                }

                // console.log(
                //     `[SignalAir] Début de la réponse pour ${code}:`,
                //     text.substring(0, 100)
                // );

                try {
                    const parsedData = JSON.parse(text);
                    // console.log(
                    //     `[SignalAir] Données parsées pour ${code}:`,
                    //     parsedData
                    // );
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

                // console.log(
                //     `[SignalAir] Nombre de signalements trouvés pour ${code}:`,
                //     data.features.length
                // );

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
                            openSidePanel_signalair(feature.properties, key);
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
 * Crée et injecte la div de sélection de dates dans le side panel (pour l'instant)
 */
function createDateRangeSelector() {
    const dateRangeDiv = document.createElement('div');
    dateRangeDiv.className = 'signalair-date-range';
    dateRangeDiv.innerHTML = `
        <h4>Période de recherche</h4>
        <div class="date-range-inputs">
            <div class="date-input-group">
                <label for="signalair-date-start">Date de début</label>
                <input type="date" id="signalair-date-start" class="form-control">
            </div>
            <div class="date-input-group">
                <label for="signalair-date-end">Date de fin</label>
                <input type="date" id="signalair-date-end" class="form-control">
            </div>
            <div class="date-range-actions">
                <button class="btn-reset" id="signalair-reset-dates">Réinitialiser</button>
                <button class="btn-apply" id="signalair-apply-dates">Appliquer</button>
            </div>
        </div>
    `;

    // Insérer la div au début du panneau latéral
    const sidePanel = document.getElementById('side-panel');
    if (sidePanel) {
        sidePanel.insertBefore(dateRangeDiv, sidePanel.firstChild);
    } else {
        console.error("Le panneau latéral (side-panel) n'a pas été trouvé");
    }

    // Initialiser les dates par défaut (30 derniers jours)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('signalair-date-start').value = startDate
        .toISOString()
        .split('T')[0];
    document.getElementById('signalair-date-end').value = endDate
        .toISOString()
        .split('T')[0];

    // Ajouter les écouteurs d'événements
    document
        .getElementById('signalair-reset-dates')
        .addEventListener('click', resetSignalAirDates);
    document
        .getElementById('signalair-apply-dates')
        .addEventListener('click', applySignalAirDates);
}

/**
 * Réinitialise les dates aux valeurs par défaut
 */
function resetSignalAirDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('signalair-date-start').value = startDate
        .toISOString()
        .split('T')[0];
    document.getElementById('signalair-date-end').value = endDate
        .toISOString()
        .split('T')[0];

    loadSignalAir();
}

/**
 * Applique les dates sélectionnées et recharge les données
 */
function applySignalAirDates() {
    const startDate = document.getElementById('signalair-date-start').value;
    const endDate = document.getElementById('signalair-date-end').value;

    if (!startDate || !endDate) {
        alert('Veuillez sélectionner une date de début et une date de fin');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('La date de début doit être antérieure à la date de fin');
        return;
    }

    loadSignalAir(startDate, endDate);
}

// Exporter les fonctions pour qu'elles soient accessibles globalement
window.resetSignalAirDates = resetSignalAirDates;
window.applySignalAirDates = applySignalAirDates;

/**
 * Ouvre le panneau latéral avec les informations du signalement
 * @param {Object} data - Les données du signalement
 * @param {string} nuisance_type - Le type de nuisance
 */
export function openSidePanel_signalair(data, nuisance_type) {
    console.log('Ouverture du panneau latéral pour SignalAir');

    // Masquer le conteneur du graphique
    document.getElementById('card3').style.display = 'none';

    // Mise à jour du contenu du panneau
    card1_img.src = 'img/signalair/logoSignalAir.png';
    card1_title.innerHTML = `<h3 class="mb-3">Signalement de ${nuisance_type}</h3>`;
    card1_text.innerHTML = `
        <div class="signalair-info-container">
            <div class="info-card">
                <h4>Localisation</h4>
                <p class="info-value">${data.city || 'Non spécifiée'}</p>
            </div>
            
            <div class="info-card">
                <h4>Niveau de gêne</h4>
                <p class="info-value">${data['niveau-de-gene'] || 'Non spécifié'}</p>
            </div>
            
            <div class="info-card">
                <h4>Symptômes déclarés</h4>
                <p class="info-value">${data['si-oui-quels-symptomes'] || 'Aucun symptôme déclaré'}</p>
            </div>
            
            <div class="info-card">
                <h4>Origine de la nuisance</h4>
                <p class="info-value">${data['origine-de-la-nuisance'] || 'Non spécifiée'}</p>
                ${data['description-de-lorigine-de-la-nuisance'] ? `<p class="info-details">${data['description-de-lorigine-de-la-nuisance']}</p>` : ''}
            </div>
            
            <div class="info-card">
                <h4>Durée de la nuisance</h4>
                <p class="info-value">${data['duree-de-la-nuisance'] || 'Non spécifiée'}</p>
            </div>
            
            ${
                data['remarque-commentaire']
                    ? `
            <div class="info-card">
                <h4>Commentaires</h4>
                <p class="info-value">${data['remarque-commentaire']}</p>
            </div>
            `
                    : ''
            }
        </div>
    `;

    // Créer et injecter le sélecteur de dates
    createDateRangeSelector();

    // Mise à jour de la deuxième carte avec la description de Signal'Air
    card2_title.innerHTML = '<h3 class="mb-3">À propos de Signal\'Air</h3>';
    card2_text.innerHTML = `
        <div class="signalair-description">
            <p>Signal'Air est une plateforme collaborative qui permet aux citoyens de signaler les nuisances environnementales qu'ils rencontrent dans leur quotidien.</p>
            
            <p>Que ce soit des odeurs désagréables, des bruits excessifs, des problèmes visuels ou des brûlages illégaux, Signal'Air offre un moyen simple et efficace de partager ces informations avec les autorités compétentes.</p>
            
            <p>Votre participation contribue à une meilleure compréhension des problèmes environnementaux locaux et aide à mettre en place des solutions adaptées.</p>
            
            <div class="action-buttons">
                <a href="https://www.signalair.eu/fr/" target="_blank" class="btn btn-primary btn-lg">Faire un signalement</a>
            </div>
        </div>
    `;

    // Ouverture du panneau latéral
    openSidePanelGeneric();
}
