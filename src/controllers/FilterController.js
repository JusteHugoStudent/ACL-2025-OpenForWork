/**
 * FilterController.js
 * Contrôleur responsable de la gestion du filtrage et de l'export des événements
 * Gère le formulaire de filtre, la génération de listes et l'export PDF
 */

class FilterController {
    /**
     * Constructeur du contrôleur de filtrage
     * @param {EventControllerFront} eventController - Contrôleur d'événements pour charger les données
     */
    constructor(eventController) {
        this.eventController = eventController;
    }

    /**
     * Gère la soumission du formulaire de filtre
     * Valide les dates et affiche la liste filtrée
     * @param {string} startDateStr - Date de début au format string
     * @param {string} endDateStr - Date de fin au format string
     * @param {Array<string>} agendaIds - IDs des agendas à inclure
     * @param {Array} allAgendas - Liste de tous les agendas
     * @param {string} keywords - Mots-clés pour la recherche
     * @param {Array<string>} emojis - Emojis sélectionnés pour filtrer
     * @returns {Promise<void>}
     */
    async handleFilterSubmit(startDateStr, endDateStr, agendaIds, allAgendas, keywords = '', emojis = []) {
        // Valider que les champs de date ne sont pas vides
        if (!isNotEmpty(startDateStr) || !isNotEmpty(endDateStr)) {
            alert(ERROR_MESSAGES.FILTER.MISSING_DATES);
            return;
        }

        // Convertir les dates
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        // Valider les dates avec dateUtils
        if (!isValidDateRange(startDate, endDate)) {
            alert(ERROR_MESSAGES.EVENT.INVALID_DATE);
            return;
        }

        const token = getToken();
        if (!token) return;

        try {
            // Récupérer les événements filtrés via le contrôleur d'événements
            let filtered = await this.eventController.filterEvents(
                startDate,
                endDate,
                agendaIds,
                allAgendas
            );

            // Appliquer le filtre par mots-clés
            if (keywords) {
                const keywordsLower = keywords.toLowerCase();
                filtered = filtered.filter(event => {
                    const titleMatch = event.title && event.title.toLowerCase().includes(keywordsLower);
                    const descMatch = event.description && event.description.toLowerCase().includes(keywordsLower);
                    return titleMatch || descMatch;
                });
            }

            // Appliquer le filtre par emojis
            if (emojis.length > 0) {
                filtered = filtered.filter(event => {
                    return event.emoji && emojis.includes(event.emoji);
                });
            }

            // Générer et afficher la liste filtrée
            this.generateFilteredList(filtered);

        } catch (err) {
            console.error('Erreur lors du filtrage des événements :', err);
        }
    }

    /**
     * Génère l'affichage HTML de la liste d'événements filtrés
     * @param {Array} events - Liste des événements filtrés
     */
    generateFilteredList(events) {
        const resultDiv = document.getElementById('filter-results');
        
        if (!resultDiv) {
            return;
        }

        // Afficher la div des résultats
        resultDiv.style.display = 'block';

        if (events.length === 0) {
            resultDiv.innerHTML = '<h4>📋 Résultats</h4><p style="padding: 10px; color: white;">Aucun événement trouvé pour cette période.</p>';
            return;
        }

        // Créer le HTML de la liste avec le titre
        let html = '<h4>📋 Résultats</h4><ul style="list-style: none; padding: 0;">';
        
        events.forEach(ev => {
            const eventDate = new Date(ev.start);
            const formattedDate = formatDateFrench(eventDate);
            const eventTitle = ev.emoji ? `${ev.emoji} ${ev.title}` : ev.title;
            
            html += `
                <li style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${eventTitle}</strong><br>
                    <span style="color: #666; font-size: 0.9em;">
                        📅 ${formattedDate}<br>
                        📂 ${ev._agendaName || 'Agenda'}
                    </span>
                    ${ev.description ? `<br><span style="color: #999; font-size: 0.85em;">${ev.description}</span>` : ''}
                </li>
            `;
        });
        
        html += '</ul>';
        
        // Ajouter un bouton d'export PDF
        html += `
            <div style="padding: 10px; text-align: center;">
                <button id="export-pdf-btn" style="
                    padding: 10px 20px;
                    background-color: ${THEME_COLORS.AGENDA_PRINCIPAL};
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1em;
                ">
                    📄 Exporter en PDF
                </button>
            </div>
        `;
        
        resultDiv.innerHTML = html;

        // Attacher le gestionnaire d'événement au bouton d'export
        const exportBtn = document.getElementById('export-pdf-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportFilteredEvents(events);
            });
        }
    }

    /**
     * Exporte les événements filtrés en PDF
     * Utilise jsPDF pour générer le document
     * @param {Array} events - Liste des événements à exporter
     */
    exportFilteredEvents(events) {
        if (!window.jspdf) {
            alert('La bibliothèque jsPDF n\'est pas chargée. Impossible d\'exporter en PDF.');
            return;
        }

        try {
            // Créer un nouveau document PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Titre du document
            doc.setFontSize(18);
            doc.text('Liste des événements filtrés', 20, 20);

            // Ajouter la date de génération
            doc.setFontSize(10);
            doc.text(`Généré le ${formatDateFrench(new Date())}`, 20, 30);

            let yPosition = 45;
            const pageHeight = doc.internal.pageSize.height;
            const marginBottom = 20;

            // Ajouter chaque événement
            events.forEach((ev, index) => {
                // Vérifier s'il faut ajouter une nouvelle page
                if (yPosition > pageHeight - marginBottom) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Formater les données
                const eventDate = new Date(ev.start);
                const formattedDate = formatDateFrench(eventDate);
                const eventTitle = ev.emoji ? `${ev.emoji} ${ev.title}` : ev.title;

                // Ajouter le titre de l'événement
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(eventTitle, 20, yPosition);
                yPosition += 7;

                // Ajouter les détails
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text(`Date: ${formattedDate}`, 25, yPosition);
                yPosition += 6;
                doc.text(`Agenda: ${ev._agendaName || 'Agenda'}`, 25, yPosition);
                yPosition += 6;

                // Ajouter la description si présente
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

                // Ajouter un séparateur
                yPosition += 5;
                doc.setDrawColor(200, 200, 200);
                doc.line(20, yPosition, 190, yPosition);
                yPosition += 10;
            });

            // Télécharger le PDF
            const filename = `evenements_${new Date().getTime()}.pdf`;
            doc.save(filename);

            console.log(`✅ PDF exporté: ${filename}`);

        } catch (err) {
            console.error('Erreur lors de l\'export PDF:', err);
            alert('Erreur lors de l\'export PDF: ' + err.message);
        }
    }

    /**
     * Réinitialise le formulaire de filtre et les résultats
     */
    resetFilter() {
        // Réinitialiser les champs de date
        document.getElementById('filter-start').value = '';
        document.getElementById('filter-end').value = '';
        document.getElementById('filter-keywords').value = '';
        
        // Désélectionner tous les boutons emoji
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
