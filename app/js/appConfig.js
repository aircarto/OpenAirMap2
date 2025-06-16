// Configuration de la carte
export const config = {
    coordsCenter: [43.296482, 5.36978],
    zoomLevel: 10,
    minZoom: 2,
    maxZoom: 18,
    compoundUpper: 'PM25', //polluant affiché par défaut
    timespanLower: 60, //pas de temps de base 2min, 15min, 60min ou journéé (??)
    timeLength: 24, // historique
    display: 'atmosudmicro, nebuleair', //source des données par défaut
    boundSW: [42.5, 3.5],
    boundNE: [44.5, 7.5],
};

export const mesures = {
    pm1: { name: 'PM1', code: 'pm1', activated: false }, // Particules fines de diamètre inférieur à 1 µm
    pm25: { name: 'PM2.5', code: 'pm25', activated: true }, // Particules fines de diamètre inférieur à 2.5 µm
    pm10: { name: 'PM10', code: 'pm10', activated: false }, // Particules fines de diamètre inférieur à 10 µm
    no2: { name: 'NO2', code: 'no2', activated: false }, // Dioxyde d'azote
    so2: { name: 'SO2', code: 'so2', activated: false }, // Dioxyde de soufre
    o3: { name: 'O3', code: 'o3', activated: false }, // Ozone
    // h2s: { name: 'H2S', code: 'h2s', activated: false }, // Sulfure d'hydrogène
    // nh3: { name: 'NH3', code: 'nh3', activated: false }, // Ammoniac
    // c6h6: { name: 'C6H6', code: 'c6h6', activated: false }, // Benzène
};

export const sources = {
    atmoRef: {
        name: 'Station de référence atmosud',
        code: 'atmoRef',
        activated: true,
    }, // Stations de référence AtmoSud
    atmoMicro: {
        name: 'Microcapteurs qualifiés',
        code: 'atmoMicro',
        activated: true,
    }, // Micro-stations AtmoSud
    communautaire: {
        name: 'Autres capteurs communautaires',
        code: 'communautaire',
        activated: false,
        isGroup: true,
        subSources: {
            nebuleair: {
                name: 'NebuleAir',
                code: 'nebuleair',
                activated: false,
            },
            sensorCommunity: {
                name: 'Sensor.Community',
                code: 'sensorCommunity',
                activated: false,
            },
            purpleair: {
                name: 'PurpleAir',
                code: 'purpleair',
                activated: false,
            },
        },
    },
    signalair: { name: 'SignalAir', code: 'signalair', activated: false }, // Capteurs SignalAir
};

export const modelisations = {
    // modPm: {
    //     name: 'Modélisation Horaires',
    //     code: 'modPm',
    //     activated: false,
    //     description: 'Carte de modélisation',
    // },
    icairh: {
        name: "ICAIR'H (modélisation multipolluant)",
        code: 'icairh',
        activated: false,
        description: "Modélisation ICAIR'H",
    },
    vent: {
        name: 'Vent',
        code: 'vent',
        activated: false,
        description: 'Modélisation Vent',
    },
};

export const pasDeTemps = {
    instantane: { name: 'Scan', code: 'instantane', activated: false }, // Valeurs instantanées
    deuxMin: { name: '≤ 2 minutes', code: '2min', activated: false }, // Moyenne sur 2 minutes
    quartHeure: { name: '15 minutes', code: 'qh', activated: false }, // Moyenne sur 15 minutes
    heure: { name: 'Heure', code: 'h', activated: true }, // Moyenne horaire
    jour: { name: 'Jour', code: 'd', activated: false }, // Moyenne journalière
};
// // Configuration des seuils pour les particules fines PM1 et PM2.5
// export const seuilsPm1Pm25 = {
//     bon: { code: 'bon', min: 0, max: 10 }, // Qualité de l'air bonne (0-10 µg/m³)
//     moyen: { code: 'moyen', min: 11, max: 20 }, // Qualité de l'air moyenne (11-20 µg/m³)
//     degrade: { code: 'degrade', min: 21, max: 25 }, // Qualité de l'air dégradée (21-25 µg/m³)
//     mauvais: { code: 'mauvais', min: 26, max: 50 }, // Qualité de l'air mauvaise (26-50 µg/m³)
//     tresMauvais: { code: 'tresMauvais', min: 51, max: 75 }, // Qualité de l'air très mauvaise (51-75 µg/m³)
//     extrMauvais: { code: 'extrMauvais', min: 76, max: 9999 }, // Qualité de l'air extrêmement mauvaise (>75 µg/m³)
// };

// // Configuration des seuils pour les particules fines PM10
// export const seuilsPm10 = {
//     bon: { code: 'bon', min: 0, max: 20 }, // Qualité de l'air bonne (0-20 µg/m³)
//     moyen: { code: 'moyen', min: 21, max: 40 }, // Qualité de l'air moyenne (21-40 µg/m³)
//     degrade: { code: 'degrade', min: 41, max: 50 }, // Qualité de l'air dégradée (41-50 µg/m³)
//     mauvais: { code: 'mauvais', min: 51, max: 100 }, // Qualité de l'air mauvaise (51-100 µg/m³)
//     tresMauvais: { code: 'tresMauvais', min: 101, max: 150 }, // Qualité de l'air très mauvaise (101-150 µg/m³)
//     extrMauvais: { code: 'extrMauvais', min: 151, max: 10000 }, // Qualité de l'air extrêmement mauvaise (>150 µg/m³)
// };

// // Configuration des seuils pour le dioxyde d'azote (NO2) sur 24h
// export const seuilsNo2_24h = {
//     bon: { code: 'bon', min: 0, max: 40 }, // Qualité de l'air bonne (0-40 µg/m³)
//     moyen: { code: 'moyen', min: 41, max: 90 }, // Qualité de l'air moyenne (41-90 µg/m³)
//     degrade: { code: 'degrade', min: 91, max: 120 }, // Qualité de l'air dégradée (91-120 µg/m³)
//     mauvais: { code: 'mauvais', min: 121, max: 230 }, // Qualité de l'air mauvaise (121-230 µg/m³)
//     tresMauvais: { code: 'tresMauvais', min: 231, max: 340 }, // Qualité de l'air très mauvaise (231-340 µg/m³)
//     extrMauvais: { code: 'extrMauvais', min: 341, max: 9999 }, // Qualité de l'air extrêmement mauvaise (>340 µg/m³)
// };

// export const seuilsO3_24h = {
//     bon: { code: 'bon', min: 0, max: 100 },
//     moyen: { code: 'moyen', min: 101, max: 120 },
//     degrade: { code: 'degrade', min: 121, max: 140 },
//     mauvais: { code: 'mauvais', min: 141, max: 160 },
//     tresMauvais: { code: 'tresMauvais', min: 161, max: 180 },
//     extrMauvais: { code: 'extrMauvais', min: 181, max: 9999 },
// };

// export const seuilsSo2_24h = {
//     bon: { code: 'bon', min: 0, max: 40 },
//     moyen: { code: 'moyen', min: 41, max: 80 },
//     degrade: { code: 'degrade', min: 81, max: 120 },
//     mauvais: { code: 'mauvais', min: 121, max: 160 },
//     tresMauvais: { code: 'tresMauvais', min: 161, max: 200 },
//     extrMauvais: { code: 'extrMauvais', min: 201, max: 9999 },
// };

// Configuration des seuils pour les particules fines PM1 et PM2.5
export const seuilsPm1Pm25 = {
    bon: { code: 'bon', min: 0, max: 5 },
    moyen: { code: 'moyen', min: 6, max: 15 },
    degrade: { code: 'degrade', min: 16, max: 50 },
    mauvais: { code: 'mauvais', min: 51, max: 90 },
    tresMauvais: { code: 'tresMauvais', min: 91, max: 140 },
    extrMauvais: { code: 'extrMauvais', min: 141, max: 9999 },
};

// Configuration des seuils pour les particules fines PM10
export const seuilsPm10 = {
    bon: { code: 'bon', min: 0, max: 15 },
    moyen: { code: 'moyen', min: 16, max: 45 },
    degrade: { code: 'degrade', min: 46, max: 120 },
    mauvais: { code: 'mauvais', min: 121, max: 195 },
    tresMauvais: { code: 'tresMauvais', min: 196, max: 270 },
    extrMauvais: { code: 'extrMauvais', min: 271, max: 10000 },
};

// Configuration des seuils pour le dioxyde d'azote (NO2)
export const seuilsNo2 = {
    bon: { code: 'bon', min: 0, max: 10 },
    moyen: { code: 'moyen', min: 11, max: 25 },
    degrade: { code: 'degrade', min: 26, max: 60 },
    mauvais: { code: 'mauvais', min: 61, max: 100 },
    tresMauvais: { code: 'tresMauvais', min: 101, max: 150 },
    extrMauvais: { code: 'extrMauvais', min: 151, max: 9999 },
};

export const seuilsO3 = {
    bon: { code: 'bon', min: 0, max: 60 },
    moyen: { code: 'moyen', min: 61, max: 100 },
    degrade: { code: 'degrade', min: 101, max: 120 },
    mauvais: { code: 'mauvais', min: 121, max: 160 },
    tresMauvais: { code: 'tresMauvais', min: 161, max: 180 },
    extrMauvais: { code: 'extrMauvais', min: 181, max: 9999 },
};

export const seuilsSo2 = {
    bon: { code: 'bon', min: 0, max: 20 },
    moyen: { code: 'moyen', min: 21, max: 40 },
    degrade: { code: 'degrade', min: 41, max: 125 },
    mauvais: { code: 'mauvais', min: 126, max: 190 },
    tresMauvais: { code: 'tresMauvais', min: 191, max: 275 },
    extrMauvais: { code: 'extrMauvais', min: 276, max: 9999 },
};

// Définition des couleurs pour les polluants dans les graphiques
export const POLLUTANT_COLORS = {
    pm1: '#b7cee5', // Bleu très clair
    pm25: '#66b2ff', // Bleu clair/moyen
    pm10: '#0066cc', // Bleu foncé
    no2: '#A133FF',
    o3: '#FFEEAD',
    so2: '#D4A5A5',
    h2s: '#9B59B6',
    nh3: '#3498DB',
};
