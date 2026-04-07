/* ============================================================
   js/sidebar.js
   Sidebar droite : horloge temps réel, météo Open-Meteo,
   question du jour (rotation à minuit), votes/réponses,
   réponses précédentes (⭐), page de réponse QR.
   ============================================================ */

/* ────────────────────────────────────────
   HORLOGE
──────────────────────────────────────── */

/**
 * IIFE de l'horloge.
 * Met à jour la date et l'heure chaque seconde.
 * Déclenche updateQuestion() lors du passage à minuit.
 */
(function initClock() {
  const DAYS   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  let lastDay = -1;

  function tick() {
    const n = new Date();
    document.getElementById('sbDate').textContent =
      `${DAYS[n.getDay()]} ${n.getDate()} ${MONTHS[n.getMonth()]}`;
    document.getElementById('sbTime').textContent =
      `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
    if (n.getDate() !== lastDay) { lastDay = n.getDate(); updateQuestion(); }
  }

  tick();
  setInterval(tick, 1000);
})();

/* ────────────────────────────────────────
   QUESTION DU JOUR
──────────────────────────────────────── */

/**
 * updateQuestion()
 * Rafraîchit l'affichage de la question du jour dans la sidebar et dans la page QR.
 * Appelé au chargement et à chaque passage à minuit.
 */
function updateQuestion() {
  const q = todayQuestion();
  document.getElementById('qText').textContent      = q;
  document.getElementById('qrQuestion').textContent = q;
  renderVotes();
}

/**
 * togglePrev()
 * Affiche/masque le panneau des réponses précédentes (clic sur ⭐).
 * Peuple la liste depuis D.prevAnswers (réponses acceptées des jours passés).
 */
function togglePrev() {
  const el  = document.getElementById('prevAnswers');
  const btn = document.getElementById('starBtn');
  const open = el.classList.contains('open');
  if (!open) {
    const ul = document.getElementById('prevList');
    ul.innerHTML = '';
    const prev = (D.prevAnswers || []).slice(-10).reverse();
    if (!prev.length) {
      ul.innerHTML = '<li style="color:var(--gray)">Aucune réponse précédente.</li>';
    } else {
      prev.forEach(a => {
        const li = document.createElement('li');
        li.textContent = `${a.name} : ${a.text}`;
        ul.appendChild(li);
      });
    }
    el.classList.add('open'); btn.classList.add('active');
  } else {
    el.classList.remove('open'); btn.classList.remove('active');
  }
}

/* ────────────────────────────────────────
   VOTES
──────────────────────────────────────── */

/**
 * renderVotes()
 * Affiche les votes/réponses dans la sidebar (D.votes).
 * Présentation en lignes grises (style maquette), sans barre de progression.
 */
function renderVotes() {
  const el = document.getElementById('sbVotes');
  el.innerHTML = '';
  if (!D.votes.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--gray);padding:4px 0;font-weight:600">Aucune réponse pour l\'instant.</div>';
    return;
  }
  [...D.votes].reverse().forEach(v => {
    const d = document.createElement('div');
    d.className = 'v-item fade-in';
    /* Nom en rouge (fidèle maquette) + ligne grise de texte */
    d.innerHTML = `
      <div class="v-name">${h(v.name)}</div>
      <div class="v-text">${h(v.text)}</div>`;
    el.appendChild(d);
  });
}

/* ────────────────────────────────────────
   MÉTÉO (API Open-Meteo, gratuit)
──────────────────────────────────────── */

/**
 * fetchWeather()
 * Appelle Open-Meteo avec les coordonnées de config.js.
 * Met à jour l'icône, la température et les détails (vent/humidité).
 * Rafraîchit toutes les 30 minutes.
 */
async function fetchWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&timezone=auto`;
    const r   = await fetch(url);
    const d   = await r.json();
    const c   = d.current;
    document.getElementById('tempDisplay').textContent   = `${Math.round(c.temperature_2m)}°C`;
    document.getElementById('weatherIcon').textContent   = wIcon(c.weathercode);
    document.getElementById('weatherDetail').textContent = `Vent ${Math.round(c.windspeed_10m)} km/h · Hum. ${c.relativehumidity_2m}%`;
  } catch (e) {
    document.getElementById('weatherDetail').textContent = 'Météo indisponible';
  }
}

/**
 * wIcon(code)
 * Retourne l'emoji météo correspondant au code WMO de l'API Open-Meteo.
 * @param {number} code
 * @returns {string}
 */
function wIcon(code) {
  if (code === 0)  return '☀️';
  if (code <= 2)   return '🌤';
  if (code <= 3)   return '☁️';
  if (code <= 49)  return '🌫';
  if (code <= 59)  return '🌦';
  if (code <= 69)  return '🌧';
  if (code <= 79)  return '❄️';
  if (code <= 82)  return '🌧';
  if (code <= 86)  return '🌨';
  return '⛈';
}

fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);

/* ────────────────────────────────────────
   PAGE DE RÉPONSE QR
──────────────────────────────────────── */

/**
 * openQRPage()
 * Affiche la page plein écran de réponse à la question du jour.
 * Réinitialise le formulaire et la question courante.
 */
function openQRPage() {
  document.getElementById('qrQuestion').textContent    = todayQuestion();
  document.getElementById('qrName').value              = '';
  document.getElementById('qrAnswer').value            = '';
  document.getElementById('qrSuccess').style.display   = 'none';
  document.getElementById('qrPage').style.display      = 'flex';
}

/**
 * submitQR()
 * Soumet la réponse de l'utilisateur : ajout dans D.pendingAnswers,
 * sauvegarde, confirmation visuelle, fermeture après 2.5s.
 */
function submitQR() {
  const name   = document.getElementById('qrName').value.trim();
  const answer = document.getElementById('qrAnswer').value.trim();
  if (!name || !answer) return;
  if (!D.pendingAnswers) D.pendingAnswers = [];
  D.pendingAnswers.push({
    name, text: answer,
    question: todayQuestion(),
    type: 'chat', /* différentie des pendingPosts */
    date: new Date().toISOString()
  });
  saveData();
  updateNotifBadge(); /* met à jour le badge de la cloche */
  document.getElementById('qrSuccess').style.display = 'block';
  document.getElementById('qrName').value            = '';
  document.getElementById('qrAnswer').value          = '';
  setTimeout(() => { document.getElementById('qrPage').style.display = 'none'; }, 2500);
}

/**
 * updateNotifBadge()
 * Met à jour le badge rouge sur la cloche dans le drawer admin.
 * Affiche le nombre total de notifications en attente.
 */
function updateNotifBadge() {
  const count   = countPendingNotifs();
  const badge   = document.getElementById('notifBadge');
  if (!badge) return;
  badge.textContent = count > 9 ? '9+' : String(count);
  badge.classList.toggle('show', count > 0);
}
