/**
 * Module de gestion du spinner de chargement
 * Ce module gère l'affichage et la disparition du spinner pendant le chargement des données
 */

// Élément du DOM pour le spinner
let spinnerElement = null;

/**
 * Crée et affiche le spinner
 * @param {string} [message='Chargement en cours...'] - Message à afficher sous le spinner
 */
export function startSpinner(message = 'Chargement en cours...') {
    // Si le spinner existe déjà, on le supprime
    if (spinnerElement) {
        stopSpinner();
    }

    // Création du conteneur du spinner
    spinnerElement = document.createElement('div');
    spinnerElement.className = 'spinner-container';
    spinnerElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;

    // Création du spinner
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    `;

    // Création du message
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.cssText = `
        margin-top: 20px;
        font-size: 16px;
        color: #333;
    `;

    // Ajout des éléments au conteneur
    spinnerElement.appendChild(spinner);
    spinnerElement.appendChild(messageElement);

    // Ajout du style d'animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Ajout du spinner au body
    document.body.appendChild(spinnerElement);
}

/**
 * Supprime le spinner
 */
export function stopSpinner() {
    if (spinnerElement) {
        spinnerElement.remove();
        spinnerElement = null;
    }
}
