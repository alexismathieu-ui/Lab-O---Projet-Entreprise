/* ============================================================
   js/auth.js
   Authentification et basculement Admin / Écran.
   ============================================================ */

/**
 * doLogin()
 * Vérifie le mot de passe. Si correct → mode admin.
 * Sinon → message d'erreur et reset champ.
 */
function doLogin() {
  if (document.getElementById('pwdInput').value === ADMIN_PWD) {
    document.getElementById('loginScreen').classList.add('gone');
    setTimeout(() => document.getElementById('loginScreen').style.display = 'none', 420);
    enterAdmin();
  } else {
    document.getElementById('lerr').style.display = 'block';
    document.getElementById('pwdInput').value = '';
    document.getElementById('pwdInput').focus();
  }
}

/**
 * enterAdmin()
 * Active le mode administrateur :
 * arrête le diaporama, affiche la barre admin et les onglets.
 */
function enterAdmin() {
  appMode = 'admin';
  stopSlideshow();
  document.getElementById('adminBar').style.display = 'flex';
  document.getElementById('topNav').classList.remove('hide');
  document.getElementById('btnA').classList.add('on');
  document.getElementById('btnS').classList.remove('on');
  renderSlideshow();
}

/**
 * enterScreen()
 * Active le mode écran public :
 * cache l'UI admin, lance le diaporama automatique.
 */
function enterScreen() {
  appMode = 'screen';
  document.getElementById('loginScreen').classList.add('gone');
  setTimeout(() => document.getElementById('loginScreen').style.display = 'none', 420);
  document.getElementById('adminBar').style.display = 'none';
  document.getElementById('topNav').classList.add('hide');
  closeDrawer();
  renderSlideshow();
  startSlideshow();
}

/**
 * setMode(m)
 * Bascule entre 'admin' et 'screen' via les boutons de la barre admin.
 * @param {string} m - 'admin' | 'screen'
 */
function setMode(m) {
  if (m === 'admin') enterAdmin();
  else enterScreen();
}

/**
 * logout()
 * Déconnecte l'admin et réaffiche l'écran de login.
 */
function logout() {
  appMode = null;
  stopSlideshow();
  document.getElementById('adminBar').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginScreen').classList.remove('gone');
  document.getElementById('pwdInput').value = '';
  document.getElementById('lerr').style.display = 'none';
}
