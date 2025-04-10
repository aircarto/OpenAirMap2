/**
 * Gestionnaire centralisé des sources de données
 * Ce module gère l'état et les interactions entre les différentes sources de données
 */

import { getArrayFromLocalStorage } from '../app.js';

// État des sources de données
let activeSources = [];

// Fonction pour initialiser l'état des sources
export function initializeDataSources() {
    activeSources = getArrayFromLocalStorage('sources_local') || [];
}

// Fonction pour vérifier si une source est active
export function isSourceActive(sourceId) {
    return activeSources.includes(sourceId);
}

// Fonction pour mettre à jour l'état d'une source
export function updateSourceState(sourceId, isActive) {
    if (isActive && !activeSources.includes(sourceId)) {
        activeSources.push(sourceId);
    } else if (!isActive) {
        activeSources = activeSources.filter((id) => id !== sourceId);
    }
}

// Fonction pour obtenir les sources actives
export function getActiveSources() {
    return [...activeSources];
}

// Fonction pour vérifier si une source est la seule source active
export function isOnlyActiveSource(sourceId) {
    return activeSources.length === 1 && activeSources[0] === sourceId;
}

// Fonction pour désactiver toutes les sources sauf une
export function deactivateOtherSources(keepSourceId) {
    activeSources = [keepSourceId];
}

// Initialisation au chargement du module
initializeDataSources();
