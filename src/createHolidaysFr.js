const fs = require('fs');
const path = require('path');

class CreateHolidaysFr {
    constructor() {
        this.holidays = [];
    }

    /**
     * Calcule la date de Pâques pour une année donnée
     * @param {number} year - L'année
     * @returns {Date} - La date de Pâques
     */
    calculateEaster(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        
        return new Date(year, month - 1, day);
    }

    /**
     * Génère tous les jours fériés français pour une année donnée
     * @param {number} year - L'année
     * @returns {Array} - Liste des jours fériés
     */
    generateFrenchHolidays(year) {
        const holidays = [];
        const easter = this.calculateEaster(year);

        // Jours fériés fixes
        const fixedHolidays = [
            { month: 0, day: 1, name: "Jour de l'An" },
            { month: 4, day: 1, name: "Fête du Travail" },
            { month: 4, day: 8, name: "Fête de la Victoire 1945" },
            { month: 6, day: 14, name: "Fête Nationale" },
            { month: 7, day: 15, name: "Assomption" },
            { month: 10, day: 1, name: "Toussaint" },
            { month: 10, day: 11, name: "Armistice 1918" },
            { month: 11, day: 25, name: "Noël" }
        ];

        // Ajouter les jours fériés fixes
        fixedHolidays.forEach(holiday => {
            const date = new Date(year, holiday.month, holiday.day);
            const dateStr = date.toISOString().split('T')[0];
            
            holidays.push({
                id: `holiday-${year}-${holiday.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                title: `🎉 ${holiday.name}`,
                start: dateStr,
                allDay: true,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                textColor: 'white',
                extendedProps: {
                    description: `Jour férié français - ${holiday.name}`,
                    source: 'holiday-fr',
                    type: 'fixed'
                },
                editable: false,
                classNames: ['holiday-event', 'holiday-fixed']
            });
        });

        // Jours fériés mobiles (basés sur Pâques)
        const mobileHolidays = [
            { offset: 1, name: "Lundi de Pâques" },
            { offset: 39, name: "Ascension" },
            { offset: 50, name: "Lundi de Pentecôte" }
        ];

        // Ajout
        mobileHolidays.forEach(holiday => {
            const date = new Date(easter);
            date.setDate(easter.getDate() + holiday.offset);
            const dateStr = date.toISOString().split('T')[0];
            
            holidays.push({
                id: `holiday-${year}-${holiday.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                title: `🎉 ${holiday.name}`,
                start: dateStr,
                allDay: true,
                backgroundColor: '#e67e22',
                borderColor: '#d68910',
                textColor: 'white',
                extendedProps: {
                    description: `Jour férié français - ${holiday.name} (basé sur Pâques)`,
                    source: 'holiday-fr',
                    type: 'mobile'
                },
                editable: false,
                classNames: ['holiday-event', 'holiday-mobile']
            });
        });

        return holidays;
    }

    /**
     * Génère tous les jours fériés français entre deux années
     * @param {number} startYear - Année de début
     * @param {number} endYear - Année de fin
     * @returns {Array} - Liste complète des jours fériés
     */
    generateHolidaysRange(startYear, endYear) {
        console.log(`🎯 Génération des jours fériés français de ${startYear} à ${endYear}...`);
        
        this.holidays = [];
        
        for (let year = startYear; year <= endYear; year++) {
            const yearHolidays = this.generateFrenchHolidays(year);
            this.holidays.push(...yearHolidays);
            console.log(`📅 ${year}: ${yearHolidays.length} jours fériés générés`);
        }

        // Trie
        this.holidays.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        console.log(`✅ Total: ${this.holidays.length} jours fériés générés`);
        return this.holidays;
    }

    /**
     * Sauvegarde les jours fériés dans un fichier JSON
     * @param {string} filename - Nom du fichier de sortie
     * @param {string} outputDir - Répertoire de sortie (optionnel)
     */
    saveToFile(filename = 'holidaysFr.json', outputDir = './src') {
        const filePath = path.join(outputDir, filename);
        
        try {
            // Créer le répertoire s'il n'existe pas
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Sauvegarder le fichier
            fs.writeFileSync(filePath, JSON.stringify(this.holidays, null, 2), 'utf8');
            
            return filePath;
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde:', error.message);
            throw error;
        }
    }

    /**
     * Méthode principale pour créer le fichier de jours fériés
     * @param {number} startYear - Année de début
     * @param {number} endYear - Année de fin
     * @param {string} filename - Nom du fichier (optionnel)
     * @param {string} outputDir - Répertoire de sortie (optionnel)
     */
    create(startYear, endYear, filename = `holidaysFr.json`, outputDir = './src') {
        console.log(`🚀 CreateHolidaysFr: Création du fichier ${filename}...`);
        
        // Valider les paramètres
        if (startYear > endYear) {
            throw new Error('L\'année de début doit être inférieure ou égale à l\'année de fin');
        }
        
        if (startYear < 1900 || endYear > 2100) {
            console.warn('⚠️ Attention: Les années en dehors de 1900-2100 peuvent donner des résultats incorrects');
        }

        // Générer les jours fériés
        this.generateHolidaysRange(startYear, endYear);

        // Sauvegarder le fichier
        const filePath = this.saveToFile(filename, outputDir);

        // Statistiques finales
        const fixedCount = this.holidays.filter(h => h.extendedProps.type === 'fixed').length;
        const mobileCount = this.holidays.filter(h => h.extendedProps.type === 'mobile').length;
        const yearsCount = endYear - startYear + 1;

        console.log(`📈 Statistiques:`);
        console.log(`   - Période: ${yearsCount} années (${startYear} à ${endYear})`);
        console.log(`   - Jours fériés fixes: ${fixedCount}`);
        console.log(`   - Jours fériés mobiles: ${mobileCount}`);
        console.log(`   - Total: ${this.holidays.length} jours fériés`);
        console.log(`🎉 CreateHolidaysFr: Fichier créé avec succès !`);

        return {
            filePath,
            totalHolidays: this.holidays.length,
            years: yearsCount,
            holidays: this.holidays
        };
    }
}

module.exports = CreateHolidaysFr;