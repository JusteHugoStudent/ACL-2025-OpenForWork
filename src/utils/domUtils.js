// Utilitaires pour manipuler le DOM et générer des éléments dynamiquement
// Génère les boutons emoji pour les filtres
// Utilise EMOJI_OPTIONS de constants.js

function generateEmojiFilterButtons() {
    const container = document.getElementById('filter-emoji-buttons');
    if (!container) return;

    // Vide le contenu existant
    container.innerHTML = '';

    // Génére un bouton pour chaque emoji
    EMOJI_OPTIONS.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'emoji-btn';
        button.dataset.emoji = option.value;
        button.textContent = option.value;
        button.title = option.label; // Info-bulle avec le label
        
        // Ajouter l'événement de sélection
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            button.classList.toggle('selected');
            console.log('🎯 Emoji toggled:', option.value, 'Selected:', button.classList.contains('selected'));
        });
        
        container.appendChild(button);
    });
    
    console.log('✅ Generated', EMOJI_OPTIONS.length, 'emoji buttons with click handlers');
}

// Génère les options emoji pour le select de la modale
// Utilise EMOJI_OPTIONS de constants.js

function generateEmojiSelectOptions() {
    const select = document.getElementById('input-color');
    if (!select) return;

    // Vide le contenu existant
    select.innerHTML = '';

    // Génére une option pour chaque emoji
    EMOJI_OPTIONS.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = `${option.value} ${option.label}`;
        select.appendChild(optionElement);
    });
}

// Initialise tous les éléments dynamiques du DOM au chargement
// À appeler au démarrage de l'application

function initializeDynamicDOM() {
    generateEmojiFilterButtons();
    generateEmojiSelectOptions();
    console.log('✅ Éléments DOM dynamiques initialisés depuis constants.js');
}

// Auto-initialisation au chargement du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDynamicDOM);
} else {
    // DOM déjà chargé
    initializeDynamicDOM();
}
