// partie connexion / deconnexion
// a faire, modifier plus tard

import { afficherCalendrier } from './CalendarView.js';

export function initLoginView() {
  let pageLogin = document.getElementById('page-login');
  let pageAgenda = document.getElementById('page-agenda');

  // quand on clique sur le bouton login
  document.getElementById('btn-login').addEventListener('click', () => {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

    // si on a mis quelque chose
    if (username != '' && password != '') {
      window.utilisateur = username;
      document.getElementById('user-name').textContent = "Connecte : " + username;

      // on cache la page login et on montre l'agenda
      pageLogin.classList.add('hidden');
      pageAgenda.classList.remove('hidden');
      afficherCalendrier();
    } else {
      alert("faut remplir les deux champs sinon ca marche pas");
    }
  });

  // bouton deconnexion
  document.getElementById('btn-logout').addEventListener('click', () => {
    window.utilisateur = null;
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    pageLogin.classList.remove('hidden');
    pageAgenda.classList.add('hidden');
  });
}
