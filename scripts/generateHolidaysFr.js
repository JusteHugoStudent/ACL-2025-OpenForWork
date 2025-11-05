//utilisation : node /scripts/generateHolidaysFr.js 1950 2050

const CreateHolidaysFr = require('../src/createHolidaysFr');

function main() {
    // Récupérer les arguments de la ligne de commande
    const args = process.argv.slice(2);
    
    // Valeurs par défaut
    let startYear = 2024;
    let endYear = 2026;
    
    // Si des arguments sont fournis, les utiliser
    if (args.length >= 1) {
        startYear = parseInt(args[0]);
    }
    if (args.length >= 2) {
        endYear = parseInt(args[1]);
    }
    
    // Valider les années
    if (isNaN(startYear) || isNaN(endYear)) {
        process.exit(1);
    }
    
    if (startYear > endYear) {
        process.exit(1);
    }
    
    try {
        // Créer une instance de la classe
        const holidayCreator = new CreateHolidaysFr();
        
        // Générer le fichier
        const result = holidayCreator.create(startYear, endYear);
        
    } catch (error) {
        process.exit(1);
    }
}

// Lancer le script
main();