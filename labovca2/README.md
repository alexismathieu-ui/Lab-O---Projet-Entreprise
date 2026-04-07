# Lab'O Village by CA — Diaporama v2

## Structure du projet

```
labovca2/
├── index.html              ← Point d'entrée (ouvrir dans le navigateur)
│
├── css/
│   ├── variables.css       ← Tokens : couleurs, polices, radius
│   ├── layout.css          ← Login, barre admin, navigation, grille principale
│   ├── slides.css          ← Diapositives, transitions, ticker, ruban
│   └── components.css      ← Sidebar, drawer admin, boutons, QR
│
├── js/
│   ├── config.js           ← Config + données par défaut (partenaires thématiques inclus)
│   ├── store.js            ← État global D, localStorage, helpers
│   ├── auth.js             ← Login, mode admin / écran
│   ├── slideshow.js        ← Moteur diaporama, transitions sweep/circle, ruban
│   ├── sidebar.js          ← Horloge, météo, question du jour, votes, QR
│   └── drawer.js           ← Panel modération (6 sections + notifications)
│
└── assets/                 ← Dossier pour images statiques
```

## Utilisation

1. Ouvrir `index.html` dans Chrome / Firefox / Edge / Safari
2. **Mode écran** : cliquer "Mode écran →" (pas de mot de passe)
3. **Mode admin** : saisir `admin123` (modifiable dans `js/config.js`)

## Panel de modération (☰ burger)

| Section | Rôle |
|---|---|
| Gérer les posts | Créer / modifier / supprimer les diapos Startups |
| Gérer les annonces | Modérer les posts envoyés depuis l'interface mobile |
| Gérer le chat | Accepter / refuser les réponses à la question du jour |
| Gérer le calendrier | CRUD des diapos Évènements |
| Gérer les nouveautés | CRUD des items du bandeau ticker en bas |
| Gérer les partenaires | CRUD des thématiques partenaires |
| Questions du jour | Éditer les questions mois par mois |

La **cloche 🔔** affiche toutes les demandes en attente (chat + posts mobiles).

## Partenaires

Une diapositive = une thématique (8 thématiques préconfigurées) :
🎓 Écoles · 🏦 Banque/Finance · ⚖️ Juridique · ⚡ Énergie · 📡 Télécom/Transport · 🏢 Institutions · 🚀 Innovation · 🌐 Réseaux

## Configuration

Dans `js/config.js` :
- `ADMIN_PWD` → mot de passe
- `SLIDE_MS` → durée par diapo (ms)
- `WEATHER_LAT / WEATHER_LON` → coordonnées météo
