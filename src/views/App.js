// global
export let utilisateur = null;
export let vueActuelle = "week";
export let dateActuelle = new Date();
export let evenements = [];
export let eventEnCours = null;

// import de toute les vue
import { initLoginView } from "./LoginView.js";
import { initAgendaView } from "./AgendaView.js";
import { afficherCalendrier } from "./CalendarView.js";
import { initModalView } from "./ModalView.js";

//  quand la page charge on fait tout 
window.addEventListener("DOMContentLoaded", function () {
    initLoginView();
    initAgendaView();
    initModalView();
    afficherCalendrier();
});

//  fcn pr formater la date
//  ca sert a avoir 2025-10-09 par exemple
export function formatDate(date) {
    let annee = date.getFullYear();
    let mois = String(date.getMonth() + 1).padStart(2, "0");
    let jour = String(date.getDate()).padStart(2, "0");
    return annee + "-" + mois + "-" + jour;
}
