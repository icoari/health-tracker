# Suivi santé

Web app perso pour un suivi quotidien (matin / midi / soir) sur 31 jours :
note de bien-être 1→5, prise de cachet, présence de crise.

## Stack

- HTML / CSS / JS vanilla, aucun build
- `localStorage` pour les données (clé `health-tracker-v1`)
- PWA légère (manifest + service worker offline)
- Hébergement : GitHub Pages

## Lancer en local

Ouvre `index.html` dans un navigateur. Pour tester le service worker il faut servir via HTTP :

```powershell
python -m http.server 8000
# puis http://localhost:8000
```

## Déploiement GitHub Pages

1. Push sur la branche `main`
2. Repo Settings → Pages → Source : `main` / root
3. URL : `https://<user>.github.io/health-tracker/`
4. Sur le tel : ouvre l'URL, "Ajouter à l'écran d'accueil"

## Export pour médecin

`export.html` → bouton "Imprimer / PDF" → "Enregistrer en PDF"
Contient : synthèse stat, courbe d'évolution, détail jour par jour.
Bouton secondaire pour télécharger le CSV brut.

## Période

Configurable en haut de `app.js` (`START_DATE`, `TOTAL_DAYS`).
Période actuelle : 14 mai → 13 juin 2026.
