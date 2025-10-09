// partie ou on gere les boutons "mois", "semaine" etc

import { vueActuelle, dateActuelle } from './App.js';
import { afficherCalendrier } from './CalendarView.js';

export function initAgendaView() {
  // chage,ent de vue (semaine / mois / annee)
  let boutonsVue = document.querySelectorAll('.btn-view');

  boutonsVue.forEach(bouton => {
    bouton.addEventListener('click', () => {
      // on enleve les active partout
      boutonsVue.forEach(b => b.classList.remove('active'));
      bouton.classList.add('active');

      // on change la vue actuelle
      window.vueActuelle = bouton.getAttribute('data-view');

      // et on raffiche le calendrier
      afficherCalendrier();
    });
  });

  // bouton pour naviguer
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (vueActuelle === 'week') {
      dateActuelle.setDate(dateActuelle.getDate() - 7);
    } else if (vueActuelle === 'month') {
      dateActuelle.setMonth(dateActuelle.getMonth() - 1);
    } else {
      dateActuelle.setFullYear(dateActuelle.getFullYear() - 1);
    }
    afficherCalendrier();
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (vueActuelle === 'week') {
      dateActuelle.setDate(dateActuelle.getDate() + 7);
    } else if (vueActuelle === 'month') {
      dateActuelle.setMonth(dateActuelle.getMonth() + 1);
    } else {
      dateActuelle.setFullYear(dateActuelle.getFullYear() + 1);
    }
    afficherCalendrier();
  });

  // bouton aujourdhui
  document.getElementById('btn-today').addEventListener('click', () => {
    window.dateActuelle = new Date();
    afficherCalendrier();
  });

}
