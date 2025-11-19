// Contrôleur responsable de la gestion du filtrage et de l'export des événements
// Gère le formulaire de filtre, la génération de listes et l'export PDF

class FilterController {
    
    // Constructeur du contrôleur de filtrage
    // prend en paramettre eventController - Contrôleur d'événements pour charger les données
    
    constructor(eventController) {
        this.eventController = eventController;
    }

    // Obtient le label textuel d'un emoji pour l'export PDF
    getEmojiLabel(emoji) {
        if (!emoji) return '';
        const emojiOption = EMOJI_OPTIONS.find(opt => opt.value === emoji);
        return emojiOption ? `[${emojiOption.label}]` : '';
    }

    
    // Gère la soumission du formulaire de filtre
    // Valide les dates et affiche la liste filtrée
    // prend en paramettre startDateStr - Date de début au format string
    // prend en paramettre endDateStr - Date de fin au format string
    // prend en paramettre agendaIds - IDs des agendas à inclure
    // prend en paramettre allAgendas - Liste de tous les agendas
    // prend en paramettre keywords - Mots-clés pour la recherche
    // prend en paramettre emojis - Emojis sélectionnés pour filtrer
    
     
    async handleFilterSubmit(startDateStr, endDateStr, agendaIds, allAgendas, keywords = '', emojis = []) {
        // Valide que les champs de date ne sont pas vides
        if (!isNotEmpty(startDateStr) || !isNotEmpty(endDateStr)) {
            alert(ERROR_MESSAGES.FILTER.MISSING_DATES);
            return;
        }

        // Convertit les dates
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        // Valide les dates avec dateUtils
        if (!isValidDateRange(startDate, endDate)) {
            alert(ERROR_MESSAGES.EVENT.INVALID_DATE);
            return;
        }

        const token = getToken();
        if (!token) return;

        try {
            // Récupére les événements filtrés via le contrôleur d'événements
            let filtered = await this.eventController.filterEvents(
                startDate,
                endDate,
                agendaIds,
                allAgendas
            );

            // Applique le filtre par mots-clés
            if (keywords) {
                const keywordsLower = keywords.toLowerCase();
                filtered = filtered.filter(event => {
                    const titleMatch = event.title && event.title.toLowerCase().includes(keywordsLower);
                    const descMatch = event.description && event.description.toLowerCase().includes(keywordsLower);
                    return titleMatch || descMatch;
                });
            }

            // Applique le filtre par emojis
            if (emojis.length > 0) {
                filtered = filtered.filter(event => {
                    return event.emoji && emojis.includes(event.emoji);
                });
            }

            // Génére et affiche la liste filtrée
            this.generateFilteredList(filtered);

        } catch (err) {
            console.error('Erreur lors du filtrage des événements :', err);
        }
    }

    
    // Génère l'affichage HTML de la liste d'événements filtrés
    // prend en paramettre events - Liste des événements filtrés
    
    generateFilteredList(events) {
        const modal = document.getElementById('search-results-modal');
        const resultDiv = document.getElementById('filter-results-list');
        
        if (!modal || !resultDiv) {
            return;
        }

        // Affiche la modale
        modal.classList.remove('hidden');

        if (events.length === 0) {
            resultDiv.innerHTML = '<div class="no-results"><i class="uil uil-info-circle"></i><p>Aucun événement trouvé pour cette période.</p></div>';
            return;
        }

        // Crée le HTML de la liste
        let html = '<div class="search-results-list">';
        
        events.forEach(ev => {
            const eventDate = new Date(ev.start);
            const formattedDate = formatDateFrench(eventDate);
            const eventTitle = ev.emoji ? `${ev.emoji} ${ev.title}` : ev.title;
            const agendaColor = ev._agendaColor || THEME_COLORS.DEFAULT_AGENDA;
            
            html += `
                <div class="search-result-item" style="border-left-color: ${agendaColor};">
                    <div class="result-title">${eventTitle}</div>
                    <div class="result-info">
                        <span><i class="uil uil-calendar-alt" style="color: ${agendaColor};"></i> ${formattedDate}</span>
                        <span><i class="uil uil-folder" style="color: ${agendaColor};"></i> ${ev._agendaName || 'Agenda'}</span>
                    </div>
                    ${ev.description ? `<div class="result-description">${ev.description}</div>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        
        resultDiv.innerHTML = html;

        // Attache le gestionnaire d'export PDF
        const exportBtn = document.getElementById('export-pdf-btn');
        if (exportBtn) {
            // Clone pour supprimer les anciens listeners
            const newExportBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
            newExportBtn.addEventListener('click', () => {
                this.exportFilteredEvents(events);
            });
        }
        
        // Bouton fermer
        const closeBtn = document.getElementById('close-search-results');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔴 Closing search modal');
                modal.classList.add('hidden');
            });
        }
        
        // Fermer en cliquant sur l'overlay
        const overlay = modal.querySelector('.search-modal-overlay');
        if (overlay) {
            const newOverlay = overlay.cloneNode(true);
            overlay.parentNode.replaceChild(newOverlay, overlay);
            newOverlay.addEventListener('click', () => {
                console.log('🔴 Closing via overlay');
                modal.classList.add('hidden');
            });
        }
    }

    
    // Exporte les événements filtrés en PDF
    // Utilise jsPDF pour générer le document
    // prend en paramettre events - Liste des événements à exporter
     
    exportFilteredEvents(events) {
        if (!window.jspdf) {
            alert('La bibliothèque jsPDF n\'est pas chargée. Impossible d\'exporter en PDF.');
            return;
        }

        try {
            // Crée un nouveau document PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Titre du document
            doc.setFontSize(18);
            doc.text('Liste des événements filtrés', 20, 20);

            // Ajoute la date de génération
            doc.setFontSize(10);
            doc.text(`Généré le ${formatDateFrench(new Date())}`, 20, 30);

            let yPosition = 45;
            const pageHeight = doc.internal.pageSize.height;
            const marginBottom = 20;

            // Ajoute chaque événement
            events.forEach((ev, index) => {
                // Vérifie s'il faut ajouter une nouvelle page
                if (yPosition > pageHeight - marginBottom) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Formate les données
                const eventDate = new Date(ev.start);
                const formattedDate = formatDateFrench(eventDate);
                // Remplace l'emoji par son label textuel pour éviter les problèmes d'encodage PDF
                const emojiLabel = this.getEmojiLabel(ev.emoji);
                const eventTitle = emojiLabel ? `${emojiLabel} ${ev.title}` : ev.title;

                // Ajoute le titre de l'événement
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(eventTitle, 20, yPosition);
                yPosition += 7;

                // Ajoute les détails
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text(`Date: ${formattedDate}`, 25, yPosition);
                yPosition += 6;
                doc.text(`Agenda: ${ev._agendaName || 'Agenda'}`, 25, yPosition);
                yPosition += 6;

                // Ajoute la description si présente
                if (ev.description) {
                    const descLines = doc.splitTextToSize(`Description: ${ev.description}`, 170);
                    descLines.forEach(line => {
                        if (yPosition > pageHeight - marginBottom) {
                            doc.addPage();
                            yPosition = 20;
                        }
                        doc.text(line, 25, yPosition);
                        yPosition += 6;
                    });
                }

                // Ajoute un séparateur
                yPosition += 5;
                doc.setDrawColor(200, 200, 200);
                doc.line(20, yPosition, 190, yPosition);
                yPosition += 10;
            });

            // Télécharge le PDF
            const filename = `evenements_${new Date().getTime()}.pdf`;
            doc.save(filename);

            console.log(`✅ PDF exporté: ${filename}`);

        } catch (err) {
            console.error('Erreur lors de l\'export PDF:', err);
            alert('Erreur lors de l\'export PDF: ' + err.message);
        }
    }

    
    // Réinitialise le formulaire de filtre et les résultats
     
    resetFilter() {
        // Réinitialise les champs de date
        document.getElementById('filter-start').value = '';
        document.getElementById('filter-end').value = '';
        document.getElementById('filter-keywords').value = '';
        
        // Désélectionne tous les boutons emoji
        document.querySelectorAll('.emoji-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });

        const resultDiv = document.getElementById('filter-results');
        if (resultDiv) {
            resultDiv.innerHTML = '';
            resultDiv.style.display = 'none';
        }
    }
}
