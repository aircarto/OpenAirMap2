// Fonction pour formater une chaîne de caractères
export function formatString(str) {
    // On remplace les underscores par des espaces
    let formattedStr = str.replace(/_/g, ' ');

    // les consonnes
    const consonants = 'bcdfghjklmnpqrstvwxz';

    // les voyelles en majuscules
    const uppercaseVowels = 'AEIOUYÀÁÂÄÆÈÉÊËÌÍÎÏÒÓÔÖŒÙÚÛÜÝ';

    // Ajout d'une apostrophe entre une consonne et une voyelle en majuscule
    formattedStr = formattedStr.replace(
        new RegExp(
            `([${consonants}${consonants.toUpperCase()}])([${uppercaseVowels}])`,
            'g'
        ),
        "$1'$2"
    );

    // Ajout d'une apostrophe entre une consonne et une voyelle en minuscule si pas d'apostrophe précédemment ajoutée
    formattedStr = formattedStr.replace(/([^'\s-])([A-Z])/g, '$1 $2');

    formattedStr.trim();
    return formattedStr;
}

// Fonction pour formater les noms du polluants
export function formatPollutantName(name) {
    if (!name || typeof name !== 'string') {
        console.warn('formatPollutantName received non-string value:', name);
        return String(name || '');
    }

    return name
        .replace(/NO2/g, 'NO<sub>2</sub>')
        .replace(/NOx/g, 'NO<sub>x</sub>')
        .replace(/SO2/g, 'SO<sub>2</sub>')
        .replace(/O3/g, 'O<sub>3</sub>')
        .replace(/CO2/g, 'CO<sub>2</sub>')
        .replace(/H2S/g, 'H<sub>2</sub>S')
        .replace(/NH3/g, 'NH<sub>3</sub>');
}

// Fonction pour obtenir le code couleur en fonction de la valeur et du polluant
export function getColorCodeForValue(value, pollutant) {
    const thresholds = getThresholdsForPollutant(pollutant);

    let colorCode = 'default';

    // On arrondit la valeur pour assurer une comparaison cohérente
    const roundedValue = Math.round(parseFloat(value));

    // On vérifie chaque plage de seuils
    for (let key in thresholds) {
        const min = thresholds[key].min;
        const max = thresholds[key].max;

        if (roundedValue >= min && roundedValue <= max) {
            colorCode = thresholds[key].code;
            break;
        }
    }

    return colorCode;
}

export function getThresholdsForPollutant(pollutant) {
    if (pollutant === 'pm10') {
        return seuils_PM10;
    } else if (pollutant === 'no2') {
        return seuils_NO2_24h;
    } else {
        // Par défaut pour PM1 et PM2.5
        return seuils_PM1_PM25;
    }
}
