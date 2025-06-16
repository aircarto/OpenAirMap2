import { signalair_layer } from './layers.js';
import { map } from './mapConfig.js';

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

    // Si aucune date n'est fournie, afficher le popup de sélection
    if (!startDate || !endDate) {
        showDatePickerPopup();
        return;
    }

    console.log(
        `[SignalAir] Période de recherche: du ${startDate} au ${endDate}`
    );

    // Boucle sur chaque type de signalement
    for (const key in signalair_json) {
        const { code, url, img } = signalair_json[key];
        let fullUrl;

        // Vérification spéciale pour le type visuel
        if (code === 'visuel') {
            // console.log(
            //     `[SignalAir] Vérification de l'URL pour le type visuel`
            // );
            // On essaie avec une période plus longue pour voir si c'est un problème de données
            fullUrl = `https://www.signalair.eu/fr/flux/geojson/${url}/2025-01-01/${endDate}`;
            // console.log(`[SignalAir] URL modifiée pour visuel: ${fullUrl}`);
        } else {
            fullUrl = `https://www.signalair.eu/fr/flux/geojson/${url}/${startDate}/${endDate}`;
            // console.log(`[SignalAir] URL pour ${code}: ${fullUrl}`);
        }

        fetch(fullUrl)
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
                        .on('click', () => {
                            console.log(
                                `[SignalAir] Clic sur le signalement ${feature.properties.id_declaration}`
                            );
                            showDraggableSignalairPopup(
                                feature.properties,
                                signalair_json[key].name
                            );
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

function showDraggableSignalairPopup(data, nuisanceType) {
    // Supprimer les anciens éléments
    document
        .querySelectorAll('.signalair-draggable')
        .forEach((el) => el.remove());
    console.log(data);
    // Création du conteneur draggable
    const popup = document.createElement('div');
    popup.className = 'signalair-draggable';
    popup.innerHTML = `
        <div class="drag-header">
            <strong>Signalement: ${nuisanceType}</strong>
            <button class="close-btn">×</button>
        </div>
        <div class="drag-content">
            <p><strong>Ville:</strong> ${data.city || 'Non spécifiée'}</p>
            <p><strong>Niveau de gêne:</strong> ${data['niveau-de-gene'] || 'Non spécifié'}</p>
            <p><strong>Symptômes:</strong> ${data['si-oui-quels-symptomes'] || 'Aucun'}</p>
            <p><strong>Origine:</strong> ${data['origine-de-la-nuisance'] || 'Non spécifiée'}</p>
            <p><strong>Date:</strong> ${formatDate(data.date)}</p>
            <p><strong>Durée:</strong> ${data['duree-de-la-nuisance'] || 'Non spécifiée'}</p>
            ${data['remarque-commentaire'] ? `<p><strong>Commentaires:</strong> ${data['remarque-commentaire']}</p>` : ''}
            <p><strong>Faire un signalement:</strong> <a href="https://www.signalair.eu/fr/" target="_blank">SignalAir</a></p>
        </div>
    `;

    // Fermer le popup
    popup
        .querySelector('.close-btn')
        .addEventListener('click', () => popup.remove());

    // Rendre draggable
    let isDragging = false,
        offsetX,
        offsetY;

    const header = popup.querySelector('.drag-header');
    header.style.cursor = 'move';
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - popup.offsetLeft;
        offsetY = e.clientY - popup.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            popup.style.left = `${e.clientX - offsetX}px`;
            popup.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => (isDragging = false));

    // Ajout au DOM
    document.body.appendChild(popup);
}

const formatDate = (dateString) => {
    if (!dateString) return 'Non spécifiée';
    const date = new Date(dateString.replace(' ', 'T')); // Pour compatibilité ISO
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

/**
 * Affiche le popup de sélection de dates
 */
function showDatePickerPopup() {
    // Supprimer les anciens éléments
    document
        .querySelectorAll('.signalair-date-picker-popup')
        .forEach((el) => el.remove());

    // Création du conteneur draggable
    const popup = document.createElement('div');
    popup.className = 'signalair-date-picker-popup';

    // Initialiser les dates par défaut (30 derniers jours)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const today = new Date().toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    popup.innerHTML = `
        <div class="signalair-date-picker-header">
            <h3>Sélection de la période</h3>
            <button class="close-btn">×</button>
        </div>
        <div class="signalair-date-picker-content">
            <div class="signalair-date-picker-inputs">
                <div class="signalair-date-picker-group">
                    <label for="signalair-date-start">Date de début</label>
                    <input type="date" id="signalair-date-start" class="form-control" max="${today}" value="${startDateStr}">
                </div>
                <div class="signalair-date-picker-group">
                    <label for="signalair-date-end">Date de fin</label>
                    <input type="date" id="signalair-date-end" class="form-control" max="${today}" value="${endDateStr}">
                </div>
            </div>
            <div class="signalair-date-picker-actions">
                <button class="btn-reset" id="signalair-reset-dates">Réinitialiser</button>
                <button class="btn-apply" id="signalair-apply-dates">Appliquer</button>
            </div>
        </div>
    `;

    // Ajout au DOM avant d'ajouter les écouteurs d'événements
    document.body.appendChild(popup);

    // Fermer le popup
    popup
        .querySelector('.close-btn')
        .addEventListener('click', () => popup.remove());

    // Ajouter les écouteurs d'événements
    popup
        .querySelector('#signalair-reset-dates')
        .addEventListener('click', () => {
            resetSignalAirDates();
            popup.remove();
        });
    popup
        .querySelector('#signalair-apply-dates')
        .addEventListener('click', () => {
            applySignalAirDates();
            popup.remove();
        });

    // Rendre draggable
    let isDragging = false,
        offsetX,
        offsetY;

    const header = popup.querySelector('.signalair-date-picker-header');
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - popup.offsetLeft;
        offsetY = e.clientY - popup.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            popup.style.left = `${e.clientX - offsetX}px`;
            popup.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => (isDragging = false));
}
