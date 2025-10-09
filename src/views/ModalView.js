// le popup quand on ajoute ou modifie un evenement (ca sapl un modale pour info)

import { evenements } from './App.js';
import { afficherCalendrier } from './CalendarView.js';

export function initModalView() {
  let modal = document.getElementById('modal');

  // quand on clique sur le bouton ajouter
  document.getElementById('btn-add').addEventListener('click', () => {
    window.eventEnCours = null;
    document.getElementById('modal-title').textContent = "Ajouter un evenement";
    document.getElementById('btn-delete').classList.add('hidden');

    // on vide les champs
    ['title', 'date', 'start', 'end', 'description'].forEach(id => {
      document.getElementById(`input-${id}`).value = '';
    });

    modal.classList.remove('hidden');
  });

  // bouton annuler
  document.getElementById('btn-cancel').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // bouton sauvegarder
  document.getElementById('btn-save').addEventListener('click', () => {
    let titre = document.getElementById('input-title').value;
    let date = document.getElementById('input-date').value;
    let heureDebut = document.getElementById('input-start').value;
    let heureFin = document.getElementById('input-end').value;
    let description = document.getElementById('input-description').value;

    if (titre == '' || date == '') {
      alert("faut un titre et une date sinon");
      return;
    }

    // si on edite un event existant
    if (window.eventEnCours != null) {
      Object.assign(evenements[window.eventEnCours], { titre, date, heureDebut, heureFin, description });
    } else {
      evenements.push({ id: Date.now(), titre, date, heureDebut, heureFin, description });
    }

    modal.classList.add('hidden');
    afficherCalendrier();
  });

  // bouton supprimer
  document.getElementById('btn-delete').addEventListener('click', () => {
    if (confirm('sur de vouloir supprimer ?')) {
      evenements.splice(window.eventEnCours, 1);
      modal.classList.add('hidden');
      afficherCalendrier();
    }
  });
}

// quand on veut modifier un event deja existant
export function ouvrirModifierEvent(index) {
  let modal = document.getElementById('modal');
  window.eventEnCours = index;
  let event = evenements[index];

  document.getElementById('modal-title').textContent = "Modifier l'evenement";
  document.getElementById('btn-delete').classList.remove('hidden');

  document.getElementById('input-title').value = event.titre;
  document.getElementById('input-date').value = event.date;
  document.getElementById('input-start').value = event.heureDebut;
  document.getElementById('input-end').value = event.heureFin;
  document.getElementById('input-description').value = event.description;

  modal.classList.remove('hidden');
}
