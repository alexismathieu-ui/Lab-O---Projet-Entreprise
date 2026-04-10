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
  const pwdInput    = document.getElementById('pwdInput');
  const loginScreen = document.getElementById('loginScreen');
  const lerr        = document.getElementById('lerr');
  if (!pwdInput) return;
  if (pwdInput.value === ADMIN_PWD) {
    if (loginScreen) { loginScreen.classList.add('gone'); setTimeout(() => { loginScreen.style.display = 'none'; }, 420); }
    enterAdmin();
  } else {
    if (lerr)     lerr.style.display = 'block';
    pwdInput.value = '';
    pwdInput.focus();
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
  const adminBar = document.getElementById('adminBar');
  const topNav   = document.getElementById('topNav');
  const btnA     = document.getElementById('btnA');
  const btnS     = document.getElementById('btnS');
  if (adminBar) adminBar.style.display = 'flex';
  if (topNav)   topNav.classList.remove('hide');
  if (btnA)     btnA.classList.add('on');
  if (btnS)     btnS.classList.remove('on');
  renderSlideshow();
}

/**
 * enterScreen()
 * Active le mode écran public :
 * cache l'UI admin, lance le diaporama automatique.
 */
function enterScreen() {
  appMode = 'screen';
  // Ces éléments n'existent que dans index.html, pas dans totem.html → vérification null
  const loginScreen = document.getElementById('loginScreen');
  const adminBar    = document.getElementById('adminBar');
  const topNav      = document.getElementById('topNav');
  if (loginScreen) {
    loginScreen.classList.add('gone');
    setTimeout(() => { loginScreen.style.display = 'none'; }, 420);
  }
  if (adminBar) adminBar.style.display = 'none';
  if (topNav)   topNav.classList.add('hide');
  if (typeof closeDrawer === 'function') closeDrawer();
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
  const adminBar    = document.getElementById('adminBar');
  const loginScreen = document.getElementById('loginScreen');
  const pwdInput    = document.getElementById('pwdInput');
  const lerr        = document.getElementById('lerr');
  if (adminBar)    adminBar.style.display = 'none';
  if (loginScreen) { loginScreen.style.display = 'flex'; loginScreen.classList.remove('gone'); }
  if (pwdInput)    pwdInput.value = '';
  if (lerr)        lerr.style.display = 'none';
}
