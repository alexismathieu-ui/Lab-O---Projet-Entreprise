/* ============================================================
   js/config.js
   Configuration globale et données par défaut.
   Les partenaires sont organisés en thématiques (une diapo = un groupe).
   Chaque partenaire peut avoir un logo (base64 ou chemin assets/logos/).
   ============================================================ */

/** Mot de passe du mode admin */
const ADMIN_PWD = "admin123";

/** Durée d'affichage de chaque diapositive (ms) — modifiable via ⚙ Paramètres */
let SLIDE_MS = (() => {
  const saved = parseInt(localStorage.getItem('labovca_slide_ms'), 10);
  return (!isNaN(saved) && saved >= 3000 && saved <= 120000) ? saved : 15000;
})();

/**
 * setSlideDuration(ms)
 * Met à jour SLIDE_MS, le persiste dans localStorage,
 * et redémarre le diaporama si on est en mode écran.
 */
function setSlideDuration(ms) {
  ms = Math.max(3000, Math.min(120000, parseInt(ms, 10) || 15000));
  SLIDE_MS = ms;
  localStorage.setItem('labovca_slide_ms', String(ms));
  // Redémarre le diaporama si actif
  if (typeof appMode !== 'undefined' && appMode === 'screen') {
    if (typeof stopSlideshow  === 'function') stopSlideshow();
    if (typeof startSlideshow === 'function') startSlideshow();
  }
}

/** Clé IndexedDB */
/** Clé IndexedDB — incrémenter si on veut forcer un reset client */
const LS_KEY = "labovca_data_v7";

/** Coordonnées météo (Orléans, France) */
const WEATHER_LAT = 47.9029;
const WEATHER_LON = 1.9039;

/* ============================================================
   Données par défaut (premier lancement ou reset)
   ============================================================ */
const DEFAULT_DATA = {

  /* ── Startups (une diapo = une startup) ── */
  startups: [],

  /* ── Évènements (gérés via "Gérer le calendrier") ── */
  events: [],

  /* ── Annonces (slides image dans "Évènements et Actualités") ──
     Créées directement par l'admin, pas de validation requise.
     photo : base64 de l'image à afficher en plein cadre
     name  : nom / libellé de l'annonce
  ── */
  announcements: [],

  /* ── Partenaires : UNE DIAPO PAR THÉMATIQUE ──
     Chaque objet = une diapositive dans l'onglet "Partenaires".
     Géré entièrement via le panel de modération.
  ── */
  partners: [],

  /* ── Ticker bas de page (séparés par |) ── */
  ticker: "Nouveau partenariat signé | Conférence le 15 avril | Bienvenue aux nouvelles startups | Découvrez les ateliers du mois",

  /* ── Titre de la bannière rouge ── */
  banner: "Nouveauté LAB'O le Village by CA",

  /* ── Nouveautés affichées dans le bandeau — validées par admin ── */
  news: [],

  /* ── Nouveautés en attente de validation (soumises via QR) ── */
  pendingNews: [],

  /* ── Questions du jour par mois ── */
  questions: {
    1:  ["Quelle est votre résolution innovation pour cette nouvelle année ?","Comment l'IA va-t-elle transformer votre secteur ?","Quel entrepreneur vous inspire le plus ?","Quelle technologie sera incontournable en 2026 ?","Comment définissez-vous le succès ?"],
    2:  ["Quelle compétence avez-vous développée ce mois-ci ?","Quel est votre plus grand défi en ce moment ?","Comment favorisez-vous la créativité dans votre équipe ?","Quelle lecture professionnelle vous a marqué ?","Quel conseil donneriez-vous à votre moi d'il y a 5 ans ?"],
    3:  ["Quelle startup vous inspire le plus aujourd'hui ?","Quel impact positif votre projet a-t-il sur la société ?","Comment gérez-vous l'échec dans votre parcours ?","Quelle est votre vision du travail de demain ?","Qu'est-ce qui vous a amené à l'entrepreneuriat ?"],
    4:  ["Comment intégrez-vous le développement durable ?","Quelle est la prochaine grande étape pour votre projet ?","Quel est votre superpower professionnel ?","Comment construisez-vous votre réseau ?","Quelle innovation locale vous surprend le plus ?"],
    5:  ["Comment maintenez-vous votre motivation au quotidien ?","Quel outil ne pourriez-vous plus quitter ?","Comment mesurez-vous l'impact de votre startup ?","Quelle est votre philosophie de management ?","Qu'est-ce qui distingue une bonne idée d'une grande idée ?"],
    6:  ["Quel est votre plus grand apprentissage de l'année ?","Comment adaptez-vous votre stratégie face à l'incertitude ?","Quel partenariat rêvez-vous de nouer ?","Comment créez-vous de la valeur pour vos clients ?","Qu'est-ce qui vous rend unique sur votre marché ?"],
    7:  ["Comment rechargez-vous vos batteries professionnelles ?","Quel projet vous a le plus appris ?","Comment restez-vous informé des tendances de votre secteur ?","Quelle est la décision la plus courageuse de votre carrière ?","Comment conciliez-vous vie pro et vie perso ?"],
    8:  ["Comment préparez-vous la rentrée pour votre startup ?","Quel talent souhaitez-vous recruter ?","Comment la crise vous a-t-elle rendu plus résilient ?","Quel est votre prochain objectif à 90 jours ?","Comment vous entourez-vous des bonnes personnes ?"],
    9:  ["Quelle opportunité allez-vous saisir ce mois-ci ?","Comment définissez-vous votre proposition de valeur ?","Quel événement attendez-vous avec impatience ?","Comment cultivez-vous l'innovation continue ?","Quelle est votre plus grande fierté entrepreneuriale ?"],
    10: ["Comment préparez-vous la fin d'année ?","Quel bilan tirez-vous du 3ème trimestre ?","Comment fidélisez-vous vos meilleurs clients ?","Quelle tendance tech observez-vous en ce moment ?","Comment accélérez-vous votre croissance ?"],
    11: ["Quelle gratitude professionnelle exprimez-vous ce mois-ci ?","Comment terminez-vous l'année en beauté ?","Quel projet 2026 vous enthousiasme le plus ?","Comment transmettez-vous vos valeurs à votre équipe ?","Quel est votre rituel de fin d'année ?"],
    12: ["Quel est votre mot pour résumer cette année ?","Quelle leçon garderez-vous pour toujours ?","Comment célébrez-vous les succès de votre équipe ?","Quels sont vos vœux pour l'écosystème startup ?","Quelle est votre ambition pour 2026 ?"]
  },

  /* ── Réponses acceptées (historique ⭐) ── */
  prevAnswers: [],

  /* ── Messages en attente de modération (réponses question du jour) ── */
  pendingAnswers: [],

  /* ── Votes / réponses affichés dans la sidebar (alimenté par la modération) ── */
  votes: []
};
