// le calendrier 

import { vueActuelle, dateActuelle, evenements } from "./App.js";
import { ouvrirModifierEvent } from "./ModalView.js";
import { formatDate } from "./App.js";

// fnc qui decide quel affichage montrer (semaine, mois ou année)
export function afficherCalendrier() {
    // je cache tout d’abord sinon les 3 vues s’empilent et c’est moche
    document.getElementById("view-week").classList.add("hidden");
    document.getElementById("view-month").classList.add("hidden");
    document.getElementById("view-year").classList.add("hidden");

    // ensuite je montre la bonne vue selon la variable globale
    if (vueActuelle == "week") {
        afficherVueSemaine(); // semaine
    } else if (vueActuelle == "month") {
        afficherVueMois(); // vue mois
    } else {
        afficherVueAnnee(); // vue année
    }
}

// vue semaine
// ici je montre les 7 jours avec les evenements du jour
function afficherVueSemaine() {
    let vue = document.getElementById("view-week");
    vue.classList.remove("hidden");
    vue.innerHTML = ""; // on vide au cas ou

    // noms des jours 
    let jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    let jour = dateActuelle.getDay(); // jour actuel (0 = dimanche)
    let diff = jour === 0 ? -6 : 1 - jour; // calcul pour trouver le lundi 
    let lundi = new Date(dateActuelle);
    lundi.setDate(dateActuelle.getDate() + diff);

    // on fais une boucle sur 7 jours
    for (let i = 0; i < 7; i++) {
        let jourActuel = new Date(lundi);
        jourActuel.setDate(lundi.getDate() + i);

        let divJour = document.createElement("div");
        divJour.className = "day";

        // titre du jour genre "Mar 8/10"
        let header = document.createElement("div");
        header.className = "day-header";
        header.textContent = jours[i] + " " + jourActuel.getDate() + "/" + (jourActuel.getMonth() + 1);
        divJour.appendChild(header);

        // on recup la date formatée pour comparer avec les events
        let dateStr = formatDate(jourActuel);

        // on parcours tous les events pour voir si yen a ce jour la
        evenements.forEach((ev, index) => {
            if (ev.date == dateStr) {
                let divEvent = document.createElement("div");
                divEvent.className = "event";
                divEvent.textContent = ev.heureDebut + " - " + ev.titre;

                // quand on clique sur un event, ouvre la fenetre pour le modifier
                divEvent.addEventListener("click", () => ouvrirModifierEvent(index));
                divJour.appendChild(divEvent);
            }
        });

        vue.appendChild(divJour);
    }

    // on met a jour le titre en haut (genre Semaine du 7/10)
    document.getElementById("current-period").textContent =
        "Semaine du " + lundi.getDate() + "/" + (lundi.getMonth() + 1);
}

// vue mois
function afficherVueMois() {
    let vue = document.getElementById("view-month");
    vue.classList.remove("hidden");
    vue.innerHTML = "";

    let annee = dateActuelle.getFullYear();
    let mois = dateActuelle.getMonth();

    // premier jour du mois
    let premierJour = new Date(annee, mois, 1);
    let jourSemaine = premierJour.getDay();
    // calcul pour que le mois commence bien un lundi
    let debut = jourSemaine === 0 ? 6 : jourSemaine - 1;
    let dernierJour = new Date(annee, mois + 1, 0);
    let nbJours = dernierJour.getDate();

    // on rajoute des cases vides avant le 1er (sinon tout est decale)
    for (let i = 0; i < debut; i++) vue.appendChild(document.createElement("div"));

    // je boucle sur tous les jours du mois
    for (let i = 1; i <= nbJours; i++) {
        let divJour = document.createElement("div");
        divJour.className = "month-day";

        // numero du jour (ex: 8)
        let numero = document.createElement("div");
        numero.className = "month-day-number";
        numero.textContent = i;
        divJour.appendChild(numero);

        // je check les events de ce jour
        let date = new Date(annee, mois, i);
        let dateStr = formatDate(date);

        evenements.forEach((ev, index) => {
            if (ev.date == dateStr) {
                let divEvent = document.createElement("div");
                divEvent.className = "event";
                divEvent.textContent = ev.titre;
                divEvent.addEventListener("click", () => ouvrirModifierEvent(index));
                divJour.appendChild(divEvent);
            }
        });

        vue.appendChild(divJour);
    }

    // noms des mois 
    let nomsMois = [
        "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
    ];

    // titre du mois en haut (genre Octobre 2025)
    document.getElementById("current-period").textContent = nomsMois[mois] + " " + annee;
}

// vue annee
function afficherVueAnnee() {
    let vue = document.getElementById("view-year");
    vue.classList.remove("hidden");
    vue.innerHTML = "";

    let annee = dateActuelle.getFullYear();
    let nomsMois = [
        "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
    ];

    // pour chaque mois on compte combien d’evenements ya
    for (let i = 0; i < 12; i++) {
        let divMois = document.createElement("div");
        divMois.className = "year-month";

        let titre = document.createElement("h4");
        titre.textContent = nomsMois[i];
        divMois.appendChild(titre);

        // on filtre les events du mois i
        let count = evenements.filter(e => {
            let d = new Date(e.date);
            return d.getMonth() == i && d.getFullYear() == annee;
        }).length;

        let texte = document.createElement("p");
        texte.textContent = count + " evenement(s)";
        divMois.appendChild(texte);
        vue.appendChild(divMois);
    }

    // le titre principal ( Annee 2025)
    document.getElementById("current-period").textContent = "Annee " + annee;
}
