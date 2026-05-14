# Health Tracker — Design Spec

**Date :** 2026-05-14
**Auteur :** Nicolas BARI
**Période de suivi :** 14 mai 2026 (midi) → 13 juin 2026 inclus (31 jours)

## 1. Objectif

App web personnelle pour suivre 3× par jour (matin / midi / soir) pendant un mois :
- Une note de bien-être (1 à 5)
- La prise ou non d'un cachet
- La survenue ou non d'une crise

Exigences :
- Saisie en quelques secondes depuis téléphone
- Hébergée en ligne, accessible partout
- Visuellement soignée (effet "waouh" minimaliste, sans kitsch, sans emoji, sans 3D)
- Export de qualité médicale à la fin de la période

## 2. Architecture

- **Single-page app statique** : `index.html` + `styles.css` + `app.js`
- **Pas de framework, pas de build step** : vanilla JS / CSS moderne
- **Stockage** : `localStorage` du navigateur, clé `health-tracker-v1`, valeur = JSON sérialisé
- **PWA légère** : `manifest.json` (nom, icônes, theme color, display=standalone) + `service-worker.js` minimal pour cache offline des assets
- **Hébergement** : GitHub Pages (branche `main`, dossier racine)
- **Pas de backend, pas d'auth, pas de sync** — données 100% locales sur l'appareil utilisé

### Modèle de données

```js
{
  "version": 1,
  "startDate": "2026-05-14",
  "entries": {
    "2026-05-14": {
      "midi":  { "note": 4, "cachet": true,  "crise": false, "savedAt": "2026-05-14T12:34:00+02:00" },
      "soir":  { "note": 3, "cachet": true,  "crise": true,  "savedAt": "2026-05-14T20:10:00+02:00" }
    },
    "2026-05-15": { ... }
  }
}
```

Une entrée n'existe dans `entries[date]` que si elle a été validée. Les slots manquants = pas saisis.

### Logique de créneau "en cours"

Selon l'heure locale du navigateur :
- **Matin** : 04h00 – 11h59
- **Midi** : 12h00 – 17h59
- **Soir** : 18h00 – 03h59

Le slot du créneau en cours est mis en avant visuellement.

## 3. Direction visuelle

- **Dark mode par défaut**, fond `#0A0A0F` avec dégradé radial subtil bleu profond → violet sourd en haut
- **Typographie** : Inter variable (Google Fonts), graisses 300 / 400 / 600. Tabular numerals pour les chiffres.
- **Cards en glassmorphism subtil** : `background: rgba(255,255,255,0.03)`, `backdrop-filter: blur(12px)`, bordure 1px `rgba(255,255,255,0.08)`, radius 16px
- **Accent color** : vert d'eau `#7FD1B9` (états validés et interactifs)
- **Couleur "crise"** : rouge sourd `#E26D5C` (jamais flashy)
- **Icônes** : Lucide Icons (SVG inline, traits fins 1.5px) — `sun`, `sun-medium`, `moon`, `pill`, `zap`
- **Espacements généreux**, hiérarchie typographique forte
- **Micro-animations** :
  - Fade+slide 200ms ease-out quand une card passe en état "rempli"
  - Cercles de note avec transition fill 150ms
  - Heatmap mensuelle révélée en cascade au chargement (stagger 15ms par cellule)
  - Pas de transition gratuite ailleurs

## 4. Écrans

### 4.1 Écran principal (`index.html`)

Scroll vertical, mobile-first (max-width ~480px centré sur desktop).

**A. En-tête**
- Date du jour en grand, format français long ("jeudi 14 mai")
- Sous-titre : `Jour N / 31`

**B. Section "Aujourd'hui"**

3 cards empilées (Matin / Midi / Soir).

État **vide** :
- Icône + label ("Midi") + plage horaire indicative ("12h–18h")
- 5 cercles tappables pour la note 1→5 (se remplissent au tap, transition 150ms)
- Toggle "Cachet" (switch minimaliste)
- Toggle "Crise"
- Bouton "Valider" qui apparaît seulement quand la note est sélectionnée

État **rempli** :
- Card réduite en hauteur
- Affichage synthèse : gros chiffre de la note + pastille discrète "Cachet" si pris + pastille "Crise" si présente
- Tap sur la card → repasse en mode édition pré-rempli

Le slot du créneau en cours a une bordure plus visible (`rgba(127,209,185,0.3)`).

**C. Section "Le mois"**

Heatmap 31 jours, grille 7 colonnes × 5 lignes (max).
- Chaque jour = un carré de ~36px subdivisé en 3 bandes verticales (matin/midi/soir)
- Couleur par bande selon la note : palette du gris foncé (note basse) → vert d'eau saturé (note 5)
- Bande grise neutre si non saisie
- Liseré rouge sourd autour de la cellule si une crise a eu lieu ce jour-là
- Tap sur un jour → overlay modal de saisie/édition pour ce jour (3 créneaux)

**D. Footer**
- Bouton texte discret "Exporter le suivi" → ouvre `export.html`

### 4.2 Écran export (`export.html`)

Page HTML séparée optimisée pour impression PDF (A4, marges 18mm, fond blanc, texte noir).

Contenu :

1. **En-tête médical**
   - Titre : "Suivi quotidien — santé"
   - Période : "14 mai 2026 → 13 juin 2026"
   - Nombre de jours suivis (avec au moins 1 entrée) / Taux de complétion (entrées saisies / 93 possibles)

2. **Synthèse statistique** (tableau)
   - Note moyenne par créneau (matin / midi / soir)
   - % de prise de cachet par créneau
   - Nombre total de crises + répartition par créneau
   - Comparaison semaine 1 vs semaine 4 (delta de note moyenne)

3. **Graphique évolution** (SVG inline)
   - Courbe : note moyenne quotidienne sur 31 jours
   - Axe X = jours, axe Y = 1→5
   - Traits fins, sobres, lisibles en N&B

4. **Tableau jour par jour**
   - 31 lignes, colonnes : Date, Matin (note/cachet/crise), Midi (...), Soir (...)
   - Cellules vides explicites pour les créneaux non saisis ("—")

Bouton en haut de page (caché à l'impression via `@media print`) : "Imprimer / Enregistrer en PDF".

### 4.3 Export CSV

Bouton secondaire sur `export.html` : "Télécharger CSV brut".

Format : une ligne par créneau saisi.
```
date,creneau,note,cachet,crise,saved_at
2026-05-14,midi,4,1,0,2026-05-14T12:34:00+02:00
```

## 5. Comportements clés

- **Pas de prompt de confirmation** lors de la saisie : tap "Valider" → enregistré, card collapse en animation
- **Édition rétroactive autorisée** : tap sur card rempli ou sur jour passé → mode édition
- **Persistance immédiate** : chaque validation écrit dans `localStorage` (try/catch sur quota)
- **Date affichée = "aujourd'hui" selon le navigateur** : si tu ouvres l'app à 2h du matin, le créneau "soir" de la veille reste considéré comme l'actuel (cf. logique 04h-04h)
- **Bornes de la période** : seuls les 31 jours de la période sont saisissables. La heatmap n'affiche que ces 31 cases. Hors période → message "Suivi terminé, voir l'export"

## 6. Structure du projet

```
health-tracker/
  index.html
  export.html
  styles.css
  app.js
  export.js
  manifest.json
  service-worker.js
  icons/
    icon-192.png
    icon-512.png
  docs/
    superpowers/
      specs/
        2026-05-14-health-tracker-design.md
  README.md
```

## 7. Décisions explicites (YAGNI)

- **Pas de** : auth, multi-appareil, sync cloud, notifications push, rappels, mode clair, customisation des seuils horaires, multilangue, sauvegarde auto, undo
- **Pas de** : framework JS, bundler, tests automatisés (projet d'un mois, usage personnel)
- **Oui à** : export PDF qualité médicale, export CSV, édition rétroactive, PWA pour raccourci écran d'accueil

## 8. Critères de succès

1. Je peux saisir un créneau en < 5 secondes depuis mon tel
2. L'écran principal donne immédiatement une vue claire de ma progression du mois
3. L'export PDF est présentable à un médecin sans retouche
4. Aucune perte de données pendant les 31 jours d'usage
5. Le design provoque un effet "waouh" minimaliste à l'ouverture
