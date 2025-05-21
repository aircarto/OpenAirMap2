// Configuration de la carte
export const config = {
    coordsCenter: [43.296482, 5.36978],
    zoomLevel: 10,
    minZoom: 8,
    maxZoom: 18,
    compoundUpper: 'PM25', //polluant affiché par défaut
    timespanLower: 60, //pas de temps de base 2min, 15min, 60min ou journéé (??)
    timeLength: 24, // historique
    display: 'atmosudmicro, nebuleair', //source des données par défaut
    boundSW: [42.5, 3.5],
    boundNE: [44.5, 7.5],
};

export const mesures = {
    pm1: { name: 'PM1', code: 'pm1', activated: true }, // Particules fines de diamètre inférieur à 1 µm
    pm25: { name: 'PM2.5', code: 'pm25', activated: false }, // Particules fines de diamètre inférieur à 2.5 µm
    pm10: { name: 'PM10', code: 'pm10', activated: false }, // Particules fines de diamètre inférieur à 10 µm
    no2: { name: 'NO2', code: 'no2', activated: false }, // Dioxyde d'azote
    so2: { name: 'SO2', code: 'so2', activated: false }, // Dioxyde de soufre
    o3: { name: 'O3', code: 'o3', activated: false }, // Ozone
    h2s: { name: 'H2S', code: 'h2s', activated: false }, // Sulfure d'hydrogène
    nh3: { name: 'NH3', code: 'nh3', activated: false }, // Ammoniac
    c6h6: { name: 'C6H6', code: 'c6h6', activated: false }, // Benzène
};

export const sources = {
    // sensor_community: {
    //     name: 'Sensor.Community',
    //     code: 'sensor_commmunity',
    //     activated: false,
    // }, // Réseau de capteurs Sensor.Community
    // purpleair: { name: 'PurpleAir', code: 'purpleair', activated: false }, // Capteurs PurpleAir
    atmo_ref: {
        name: 'Station de référence atmosud',
        code: 'atmo_ref',
        activated: true,
    }, // Stations de référence AtmoSud
    atmo_micro: {
        name: 'Miccrocapteurs qualifiés',
        code: 'atmo_micro',
        activated: true,
    }, // Micro-stations AtmoSud
    nebuleair: { name: 'NebuleAir', code: 'nebuleair', activated: true }, // Capteurs citoyens NebuleAir
    mod_pm: { name: 'Modélisation', code: 'mod_pm', activated: true }, // Modélisation des particules fines
    icairh: { name: 'ICAIR', code: 'icairh', activated: false }, // Modélisation ICAIR'H
    signalair: { name: 'SignalAir', code: 'signalair', activated: false }, // Capteurs SignalAir
    // mobileair: { name: 'MobileAir', code: 'mobileair', activated: false }, // Capteurs mobiles
};

export const pas_de_temps = {
    instantane: { name: 'Scan', code: 'instantane', activated: false }, // Valeurs instantanées
    deux_min: { name: '2 minutes', code: '2min', activated: true }, // Moyenne sur 2 minutes
    quart_heure: { name: '15 minutes', code: 'qh', activated: false }, // Moyenne sur 15 minutes
    heure: { name: 'Heure', code: 'h', activated: false }, // Moyenne horaire
    jour: { name: 'Jour', code: 'd', activated: false }, // Moyenne journalière
};
// Configuration des seuils pour les particules fines PM1 et PM2.5
export const seuils_PM1_PM25 = {
    bon: { code: 'bon', min: 0, max: 10 }, // Qualité de l'air bonne (0-10 µg/m³)
    moyen: { code: 'moyen', min: 11, max: 20 }, // Qualité de l'air moyenne (11-20 µg/m³)
    degrade: { code: 'degrade', min: 21, max: 25 }, // Qualité de l'air dégradée (21-25 µg/m³)
    mauvais: { code: 'mauvais', min: 26, max: 50 }, // Qualité de l'air mauvaise (26-50 µg/m³)
    tres_mauvais: { code: 'tres_mauvais', min: 51, max: 75 }, // Qualité de l'air très mauvaise (51-75 µg/m³)
    extr_mauvais: { code: 'extr_mauvais', min: 76, max: 999 }, // Qualité de l'air extrêmement mauvaise (>75 µg/m³)
};

// Configuration des seuils pour les particules fines PM10
export const seuils_PM10 = {
    bon: { code: 'bon', min: 0, max: 20 }, // Qualité de l'air bonne (0-20 µg/m³)
    moyen: { code: 'moyen', min: 21, max: 40 }, // Qualité de l'air moyenne (21-40 µg/m³)
    degrade: { code: 'degrade', min: 41, max: 50 }, // Qualité de l'air dégradée (41-50 µg/m³)
    mauvais: { code: 'mauvais', min: 51, max: 100 }, // Qualité de l'air mauvaise (51-100 µg/m³)
    tres_mauvais: { code: 'tres_mauvais', min: 101, max: 150 }, // Qualité de l'air très mauvaise (101-150 µg/m³)
    extr_mauvais: { code: 'extr_mauvais', min: 151, max: 10000 }, // Qualité de l'air extrêmement mauvaise (>150 µg/m³)
};

// Configuration des seuils pour le dioxyde d'azote (NO2) sur 24h
export const seuils_NO2_24h = {
    bon: { code: 'bon', min: 0, max: 40 }, // Qualité de l'air bonne (0-40 µg/m³)
    moyen: { code: 'moyen', min: 41, max: 90 }, // Qualité de l'air moyenne (41-90 µg/m³)
    degrade: { code: 'degrade', min: 91, max: 120 }, // Qualité de l'air dégradée (91-120 µg/m³)
    mauvais: { code: 'mauvais', min: 121, max: 230 }, // Qualité de l'air mauvaise (121-230 µg/m³)
    tres_mauvais: { code: 'tres_mauvais', min: 231, max: 340 }, // Qualité de l'air très mauvaise (231-340 µg/m³)
    extr_mauvais: { code: 'extr_mauvais', min: 341, max: 999 }, // Qualité de l'air extrêmement mauvaise (>340 µg/m³)
};

export const seuilsO3_24h = {
    bon: { code: 'bon', min: 0, max: 100 },
    moyen: { code: 'moyen', min: 101, max: 120 },
    degrade: { code: 'degrade', min: 121, max: 140 },
    mauvais: { code: 'mauvais', min: 141, max: 160 },
    tres_mauvais: { code: 'tres_mauvais', min: 161, max: 180 },
    extr_mauvais: { code: 'extr_mauvais', min: 181, max: 999 },
};

export const seuilsSO2_24h = {
    bon: { code: 'bon', min: 0, max: 40 },
    moyen: { code: 'moyen', min: 41, max: 80 },
    degrade: { code: 'degrade', min: 81, max: 120 },
    mauvais: { code: 'mauvais', min: 121, max: 160 },
    tres_mauvais: { code: 'tres_mauvais', min: 161, max: 200 },
    extr_mauvais: { code: 'extr_mauvais', min: 201, max: 999 },
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
