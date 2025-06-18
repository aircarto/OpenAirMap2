export class DateManager {
    formatDateForNebuleAir(date) {
        return date.toISOString().split('.')[0] + 'Z';
    }

    formatDateForAPI(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    formatDateForSource(date, source) {
        return source === 'nebuleair'
            ? this.formatDateForNebuleAir(date)
            : this.formatDateForAPI(date);
    }

    validateDateRange(startDate, endDate) {
        if (!startDate || !endDate) {
            return {
                valid: false,
                error: 'Veuillez sélectionner une date de début et une date de fin',
            };
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return {
                valid: false,
                error: 'La date de début doit être antérieure à la date de fin',
            };
        }

        return {
            valid: true,
            start,
            end,
        };
    }

    setTimeToStartOfDay(date) {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    }

    setTimeToEndOfDay(date) {
        const newDate = new Date(date);
        newDate.setHours(23, 59, 59, 999);
        return newDate;
    }
}
