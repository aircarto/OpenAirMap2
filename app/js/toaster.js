// Configuration par défaut des toasters (notifications)
const defaultConfig = {
    position: 'top',
    timer: 3000,
    showConfirmButton: false,
    toast: true,
    width: 'auto',
    padding: '1em',
    html: true,
    customClass: {
        popup: 'custom-toast',
        title: 'toast-title',
        content: 'toast-content',
    },
    didOpen: (toast) => {
        // Ajuster la position sur mobile
        if (window.innerWidth <= 768) {
            toast.style.margin = '0.5rem auto';
        }
    },
};

// Types de toasters prédéfinis
const toastTypes = {
    SUCCESS: {
        icon: 'success',
        title: 'Succès',
        background: 'rgba(46, 213, 115, 0.95)',
        color: 'white',
    },
    ERROR: {
        icon: 'error',
        title: 'Erreur',
        background: 'rgba(255, 71, 87, 0.95)',
        color: 'white',
    },
    WARNING: {
        icon: 'warning',
        title: 'Attention',
        background: 'rgba(255, 159, 67, 0.95)',
        color: '#2c3e50',
    },
    INFO: {
        icon: 'info',
        title: 'Information',
        background: 'rgba(52, 152, 219, 0.95)',
        color: 'white',
    },
};

// Fonction pour créer un toaster personnalisé
export function createToast(message, type = 'info', config = {}) {
    // Attendre que la notification précédente soit terminée
    return new Promise((resolve) => {
        const checkAndShow = () => {
            if (!Swal.isVisible()) {
                const toastConfig = {
                    ...defaultConfig,
                    ...config,
                    ...toastTypes[type.toUpperCase()],
                    html: message,
                    customClass: {
                        popup: 'custom-toast',
                    },
                };

                const toast = Swal.fire(toastConfig);
                resolve(toast);
            } else {
                setTimeout(checkAndShow, 100);
            }
        };
        checkAndShow();
    });
}

// Initialisation du conteneur de toast
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
document.body.appendChild(toastContainer);

// Fonctions prédéfinies pour les cas d'utilisation courants
export const toastManager = {
    // Notification de chargement des données
    dataLoading: (source) => {
        return createToast(
            `Chargement des données ${source} en cours...`,
            'info',
            { timer: 2000 }
        );
    },

    // Notification de succès de chargement
    dataLoaded: function (source) {
        return createToast('Données chargées avec succès', 'success');
    },

    // Notification d'erreur de chargement
    dataError: function (source, error) {
        return createToast('Erreur lors du chargement des données', 'error');
    },

    // Notification de changement de source
    sourceChanged: (source) => {
        return createToast(`Source de données changée: ${source}`, 'info');
    },

    // Notification de changement de polluant
    pollutantChanged: (pollutant) => {
        return createToast(`Polluant sélectionné: ${pollutant}`, 'info');
    },

    // Notification de changement de pas de temps
    timeStepChanged: (timeStep) => {
        return createToast(`Pas de temps modifié: ${timeStep}`, 'info');
    },

    // Notification de sélection d'un capteur
    sensorSelected: (sensorName) => {
        return createToast(`Capteur sélectionné: ${sensorName}`, 'info');
    },

    // Notification de mise à jour des données
    dataUpdated: () => {
        return createToast('Données mises à jour', 'success');
    },

    // Notification de zone sans données
    noDataInArea: () => {
        return createToast(
            'Aucune donnée disponible dans cette zone',
            'warning'
        );
    },

    // Notification de connexion perdue
    connectionLost: () => {
        return createToast(
            'Connexion perdue - Tentative de reconnexion...',
            'error',
            { timer: 5000 }
        );
    },

    // Notification de reconnexion réussie
    reconnected: () => {
        return createToast('Connexion rétablie', 'success');
    },

    // Notification pour le cas spécifique AtmoSud Micro-stations avec pas de temps 2min
    atmoMicroTimeStepWarning: () => {
        const toast = createToast(
            'Pour la source donnée AtmoSud micro-station, uniquement les modéles NebuleAir sont disponibles au pas de temps 2 minutes',
            'info',
            { timer: 5000 }
        );
        return toast;
    },

    // Notification pour les stations de référence AtmoSud avec pas de temps 2min ou instantané
    atmoRefTimeStepWarning: () => {
        const toast = createToast(
            'Les stations de référence AtmoSud ne sont pas disponibles aux pas de temps 2 minutes et instantané. Source désactivée.',
            'warning',
            { timer: 5000 }
        );
        return toast;
    },

    // Notification pour les micro stations AtmoSud avec le pas de temps journalier
    atmoMicroTimeStepDailyWarning: () => {
        const toast = createToast(
            'Les micro stations AtmoSud ne sont pas disponibles au pas de temps journalier',
            'warning',
            { timer: 5000 }
        );
        return toast;
    },

    //Notification pour la modélisation PM1
    atmoModPm1Warning: () => {
        const toast = createToast(
            "La modélisation PM1 n'est pas disponible",
            'warning',
            { timer: 5000 }
        );
        return toast;
    },
};

// Fonction pour créer un toaster personnalisé avec des options avancées
export function createCustomToast(options) {
    const {
        message,
        type = 'info',
        title,
        icon,
        timer,
        position,
        showConfirmButton,
        toast,
        html = true,
    } = options;
    return createToast(message, type, {
        ...defaultConfig,
        title: title || toastTypes[type.toUpperCase()].title,
        icon: icon || toastTypes[type.toUpperCase()].icon,
        timer: timer || defaultConfig.timer,
        position: position || defaultConfig.position,
        showConfirmButton: showConfirmButton || defaultConfig.showConfirmButton,
        toast: toast || defaultConfig.toast,
        html,
        customClass: {
            popup: 'custom-toast',
            title: 'toast-title',
            content: 'toast-content',
        },
    });
}
