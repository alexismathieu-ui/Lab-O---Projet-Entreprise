/* ============================================================
   js/store.js
   État global (D), persistance IndexedDB, helpers partagés.
   Toutes les modifications de données passent par saveData().
   IndexedDB remplace localStorage : pas de limite de taille,
   ce qui permet de stocker les logos et photos en base64.
   ============================================================ */

/**
 * saveData()
 * Enregistre D dans IndexedDB (fire-and-forget).
 * Appelé après chaque modification (save drawer, modération, QR submit).
 */
function saveData() {
  idbSave(LS_KEY, D).catch(e => console.warn('Sauvegarde IDB échouée :', e));
}

/**
 * loadData()
 * Charge les données depuis IndexedDB.
 * Migration automatique depuis localStorage si présent.
 * Fusionne avec DEFAULT_DATA pour gérer les nouvelles clés.
 * @returns {Promise<Object>}
 */
async function loadData() {
  /* ── Essai IndexedDB ── */
  const saved = await idbLoad(LS_KEY);
  if (saved) return Object.assign({}, DEFAULT_DATA, saved);

  /* ── Migration depuis localStorage (ancienne version) ── */
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const legacy = JSON.parse(raw);
      const data   = Object.assign({}, DEFAULT_DATA, legacy);
      await idbSave(LS_KEY, data);
      localStorage.removeItem(LS_KEY);
      return data;
    }
  } catch (e) {
    console.warn('Migration localStorage échouée :', e);
  }

  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

async function syncFromAPI() {
  try {
    const [startups, annonces, question, alert, ticker] = await Promise.all([
      fetch('/api/coworkers').then(r => r.json()),
      fetch('/api/annonces?status=approved').then(r => r.json()),
      fetch('/api/question').then(r => r.json()),
      fetch('/api/alert').then(r => r.json()),
      fetch('/api/posts?status=approved').then(r => r.json()),
    ]);
    // Mappe les coworkers (startups) au format attendu par buildStartupSlide
    D.startups = (startups || []).map(c => ({
      name: c.company,
      floor: c.floor,
      logo: c.logo || c.avatar || '',
      ceo: c.name,
      description: c.bio,
      contact: c.contact,
      website: c.website,
    }));
    D.announcements = (annonces || []).map(a => ({
      name: a.title,
      description: a.description,
    }));
if (question && question.text) D.questions._active = question.text;
    // Si le mois courant a des questions dans le drawer, on ignore _active
    const moisCourant = new Date().getMonth() + 1;
    if (D.questions && D.questions[moisCourant] && D.questions[moisCourant].length) {
      delete D.questions._active;
    }
    // Sync des posts en attente → drawer admin
    const pendingPosts = await fetch('/api/posts?status=pending').then(r => r.json());
    if (Array.isArray(pendingPosts)) {
      D.pendingAnswers = pendingPosts.map(p => ({
        name: p.author || 'Anonyme',
        text: p.text,
        question: D.questions._active || '',
        type: 'chat',
        date: p.createdAt,
        _id: p._id,
        accepted: p.status === 'approved',
        rejected: p.status === 'rejected',
      }));
    }

    // Sync des annonces en attente → drawer admin
    const pendingAnnonces = await fetch('/api/annonces?status=pending').then(r => r.json());
    if (Array.isArray(pendingAnnonces)) {
      D.pendingNews = pendingAnnonces.map(a => ({
        text: a.title + (a.description ? ' — ' + a.description : ''),
        name: a.author || 'Anonyme',
        date: a.createdAt,
        _id: a._id,
        accepted: a.status === 'approved',
        rejected: a.status === 'rejected',
      }));
    }

    saveData();
    renderSlideshow();
    if (typeof updateQuestion === 'function') updateQuestion();
    if (typeof updateNotifBadge === 'function') updateNotifBadge();
  } catch(e) { console.warn('Sync API échouée:', e); }
}

/* ── État global partagé par tous les modules ── */
let D = {}; /* rempli par initApp() dans index.html */

/* ── Variables d'interface ── */
let appMode    = null;         /* 'admin' | 'screen' | null */
let curTab     = 'all';        /* onglet diaporama actif */
let curIdx     = 0;            /* index diapo courante */
let slideTimer = null;         /* setInterval du diaporama */
let drawerSection = 'posts';   /* section active dans le drawer admin */
let draft      = null;         /* copie de travail pour l'édition */
let ribbonAnims = [];          /* handles requestAnimationFrame du ruban */

/**
 * h(s)
 * Échappe les caractères HTML spéciaux pour prévenir les injections XSS.
 * @param {*} s
 * @returns {string}
 */
function h(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * todayQuestion()
 * Retourne la question du jour selon le mois et le jour courants.
 * @returns {string}
 */
function todayQuestion() {
  const n   = new Date();
  const qs  = D.questions && D.questions[n.getMonth() + 1];
  // Si le mois a des questions → on prend celle du jour (boucle sur la liste)
  if (qs && qs.length) return qs[(n.getDate() - 1) % qs.length];
  // Sinon fallback sur la question forcée depuis MongoDB
  if (D.questions && D.questions._active) return D.questions._active;
  // Dernier fallback : avril
  const fallback = D.questions && D.questions[4];
  return (fallback && fallback[0]) || 'Quelle est votre actualité du moment ?';
}

/**
 * partnerName(p)
 * Retourne le nom d'un partenaire, qu'il soit une chaîne ou un objet {name, logo}.
 * @param {string|Object} p
 * @returns {string}
 */
function partnerName(p) {
  return typeof p === 'string' ? p : (p && p.name ? p.name : '');
}

/**
 * partnerLogo(p)
 * Retourne le logo d'un partenaire ou null.
 * @param {string|Object} p
 * @returns {string|null}
 */
function partnerLogo(p) {
  return typeof p === 'object' && p && p.logo ? p.logo : null;
}

/**
 * buildSlideList(tab)
 * Construit la liste ordonnée de diapositives pour un onglet donné.
 *   'all'      : startups + annonces + calendrier + partenaires
 *   'startups' : startups uniquement
 *   'events'   : annonces uniquement (images)
 *   'calendar' : une seule slide regroupant tous les évènements
 *   'partners' : thématiques partenaires
 * @param {string} tab
 * @returns {Array<{type, data, idx}>}
 */
function buildSlideList(tab) {
  const anns = (D.announcements || []).map((s, i) => ({ type: 'announcement', data: s, idx: i }));
  const cal  = D.events && D.events.length
    ? [{ type: 'calendar', data: D.events, idx: 0 }]
    : [];

  if (tab === 'all') return [
    ...D.startups.map((s, i)  => ({ type: 'startup',  data: s, idx: i })),
    ...anns,
    ...cal,
    ...D.partners.map((s, i)  => ({ type: 'partner',  data: s, idx: i }))
  ];
  if (tab === 'startups')  return D.startups.map((s, i) => ({ type: 'startup', data: s, idx: i }));
  if (tab === 'events')    return anns;
  if (tab === 'calendar')  return cal;
  if (tab === 'partners')  return D.partners.map((s, i) => ({ type: 'partner', data: s, idx: i }));
  return [];
}

/**
 * getSlides()
 * Raccourci pour obtenir les slides de l'onglet courant.
 * @returns {Array}
 */
function getSlides() { return buildSlideList(curTab); }

/**
 * countPendingNotifs()
 * Compte le total des notifications en attente (réponses QR + news soumises).
 * @returns {number}
 */
function countPendingNotifs() {
  const pa = (D.pendingAnswers || []).filter(a => !a.accepted && !a.rejected).length;
  const pn = (D.pendingNews   || []).filter(n => !n.accepted && !n.rejected).length;
  return pa + pn;
}

/**
 * fmtDate(isoStr)
 * Formate une chaîne ISO (ou Date) en "JJ/MM/AAAA à HH:MM".
 * @param {string|Date} isoStr
 * @returns {string}
 */
function fmtDate(isoStr) {
  try {
    const d = new Date(isoStr);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,'0');
    const mn = String(d.getMinutes()).padStart(2,'0');
    return `Le ${dd}/${mm}/${yy} à ${hh}:${mn}`;
  } catch { return ''; }
}

/**
 * parseFrDate(str)
 * Tente de parser une date au format "15 Avril 2026" ou "15/04/2026".
 * Retourne un timestamp ou Infinity si non parsable.
 * @param {string} str
 * @returns {number}
 */
function parseFrDate(str) {
  if (!str) return Infinity;
  const MONTHS = {
    'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3,
    'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'aout': 7,
    'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11
  };
  const parts = str.toLowerCase().trim().split(/[\s/]+/);
  if (parts.length === 3) {
    const day  = parseInt(parts[0], 10);
    const mon  = MONTHS[parts[1]] !== undefined ? MONTHS[parts[1]] : parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(mon) && !isNaN(year)) {
      return new Date(year, mon, day).getTime();
    }
  }
  const ts = new Date(str).getTime();
  return isNaN(ts) ? Infinity : ts;
}
