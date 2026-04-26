# Handoff: Dashboard Widgets — E-commerce

## Overview
Bibliothèque de **16 widgets de dashboard** pour une plateforme e-commerce, avec deux modes de présentation :
1. **Galerie** (canvas pan/zoom) — chaque widget isolé pour comparaison
2. **Dashboard assemblé** — composition complète en grille de production

Inclut un système de design complet (tokens couleurs/typo/espacement), modes clair/sombre, et 3 tweaks live (thème, coins arrondis, typographie).

## About the Design Files
Les fichiers de ce bundle sont des **références de design en HTML/JSX** — prototypes montrant l'apparence et le comportement attendus, pas du code de production à copier tel quel. Tout est en React 18 inline avec Babel standalone, sans build step, sans framework.

La tâche est de **recréer ces designs dans l'environnement cible de votre codebase** (React + design system existant, Vue, SwiftUI, etc.) en utilisant les patterns et bibliothèques établis. Si aucun environnement n'existe encore, choisissez le framework approprié.

## Fidelity
**High-fidelity (hifi)** : couleurs exactes (oklch), typographie, espacement, états hover, animations, et interactions sont définitifs. Recréez pixel-perfect en utilisant les composants/librairies de votre codebase (par ex. shadcn/ui, Recharts, TanStack Table).

---

## Design Tokens

### Couleurs (palette terracotta + crème, multi-niveaux)

#### Light theme
| Token | Valeur oklch | Usage |
|---|---|---|
| `--bg` | `oklch(0.9938 0.0013 106.4231)` | Fond principal (crème) |
| `--surface` | `oklch(0.9938 0.0013 106.4231)` | Cartes |
| `--surface-2` | `oklch(0.9425 0.0068 97.3550)` | Surface secondaire (header tableau, chips) |
| `--surface-3` | `oklch(0.9334 0.0068 97.3561)` | Surface tertiaire |
| `--ink` | `oklch(0.2174 0.0019 106.5582)` | Texte principal |
| `--ink-2` | `oklch(0.3361 0.0139 95.4669)` | Texte secondaire |
| `--ink-3` | `oklch(0.6124 0.0044 106.5301)` | Texte muté / labels |
| `--ink-4` | `oklch(0.7661 0.0071 97.3826)` | Texte désactivé |
| `--line` | `oklch(0.8947 0.0029 84.5598)` | Bordure standard |
| `--line-2` | `oklch(0.8347 0.0029 84.5598)` | Bordure forte |
| `--accent` | `oklch(0.6169 0.0689 38.1469)` | Primary (terracotta chaud) |
| `--accent-2` | `oklch(0.5513 0.0682 43.8987)` | Primary foncé |
| `--accent-3` | `oklch(0.7200 0.0700 38)` | Primary clair |
| `--accent-4` | `oklch(0.9000 0.0300 38)` | Primary très clair (fond chip d'icône) |

#### Dark theme
| Token | Valeur oklch |
|---|---|
| `--bg` | `oklch(0.2389 0.0019 106.5407)` |
| `--surface` | `oklch(0.2682 0.0018 106.5218)` |
| `--surface-2` | `oklch(0.3088 0.0018 106.5021)` |
| `--surface-3` | `oklch(0.3628 0.0051 106.6491)` |
| `--ink` | `oklch(0.9938 0.0013 106.4231)` |
| `--ink-2` | `oklch(0.8134 0.0070 97.3739)` |
| `--ink-3` | `oklch(0.6500 0.0070 97.3739)` |
| `--line` | `oklch(0.3628 0.0051 106.6491)` |
| `--accent` | `oklch(0.6789 0.0635 39.2202)` |

#### Couleurs de graphiques (multi-séries)
| Token | Light | Dark |
|---|---|---|
| `--c1` | `oklch(0.5513 0.0682 43.8987)` | `oklch(0.6789 0.0635 39.2202)` |
| `--c2` | `oklch(0.7553 0.0759 293.1440)` | `oklch(0.7553 0.0759 293.1440)` |
| `--c3` | `oklch(0.8821 0.0126 91.5300)` | `oklch(0.5000 0.0400 91)` |
| `--c4` | `oklch(0.9126 0.0165 297.5043)` | `oklch(0.4500 0.0260 290)` |
| `--c5` | `oklch(0.5516 0.0719 42.5982)` | `oklch(0.5516 0.0719 42.5982)` |

#### Sémantiques
| Token | Light | Dark |
|---|---|---|
| `--positive` | `oklch(0.6000 0.1500 142)` | `oklch(0.7200 0.1700 142)` |
| `--negative` | `oklch(0.5800 0.2200 25)` | `oklch(0.7000 0.2000 25)` |
| `--warn` | `oklch(0.7000 0.1700 80)` | `oklch(0.7800 0.1500 80)` |

### Typographie
- **Sans (UI)** : stack système (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`)
- **Mono** : `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` — utilisé pour valeurs numériques (`font-variant-numeric: tabular-nums`), IDs, codes
- **Échelle** :
  - `num-xl` : 40px / 600 / -0.03em (KPI principaux)
  - `num-l` : 30px / 600 / -0.02em
  - `num-m` : 22px / 600 / -0.02em
  - Title widget : 13px / 600 / -0.01em
  - Label : 11px / uppercase / 0.04em letter-spacing
  - Body table : 13px

### Espacement & rayons
- **Radius** : `--radius: 15px` (cartes), `--radius-sm: 11px` (boutons), `--radius-lg: 19px` (gros conteneurs)
- **Variante "sharp"** : 4/2/8px ; **"pill"** : 22/14/28px
- **Padding widget** : 22px
- **Gap grille** : 16px

### Ombres
```
--shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.05)
--shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)
--shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)
```

---

## Widgets (16)

### Section 01 — KPI / Métriques

#### W01: KPI Éditorial (`W_KpiEditorial`)
- **Layout** : 300×200, padding 22px
- **Header** : icône 24×24 (fond `--accent-4`, couleur `--accent`) + titre 13px / 600
- **Valeur** : devise petite (`--ink-3`) + nombre `num-xl` (40px)
- **Footer** : badge delta arrondi (`delta-bg pos/neg`) + sparkline 84×26 inline
- **Props** : `title`, `value`, `currency`, `delta`, `data` (array), `accent`

#### W02: KPI Barres (`W_KpiBars`)
- Identique à W01 mais sparkline en barres 7 jours, dernière barre highlight
- Header chip "7j" en haut à droite

#### W03: KPI Typographique inversé (`W_KpiTypo`)
- **Fond fixe** dans les deux thèmes : `oklch(0.18 0 0)` (presque noir)
- **Texte** : `oklch(0.97 0 0)` (blanc cassé) — ne suit pas le toggle thème pour rester un point de contraste
- Valeur 56px / 700, devise en italic 22px couleur `--accent`
- Labels en `rgba(255,255,255,0.x)` pour gradation

#### W04: KPI avec Anneau (`W_KpiRing`)
- SVG 80×80, anneau `stroke-width: 6`, animé via `stroke-dashoffset` (transition 1s)
- Pourcentage centré 14px / 600
- À droite : valeur `num-l` + cible `de XK`

### Section 02 — Graphiques

#### W05: Courbe interactive (`W_LineChart`)
- **Tailles** : 600×260 viewBox, padding `padL=36 padR=16 padT=24 padB=28`
- **Y-axis** : 5 ticks, gridlines en `var(--line)` dashed `2,3` sauf base solid
- **Y-labels** : `€{Math.round(max*(1-t)/1000)}k` en mono 10px
- **Aire** sous la courbe : opacity 0.08
- **Hover** : zone rectangulaire invisible par point pour le hit-testing, point grossit (3→5px), crosshair vertical apparaît
- **Tooltip** : positionné en %, fond `--ink`, mois 10px + valeur 14px
- **Selector période** : `<select>` Mensuel/Hebdo/Annuel

#### W06: Barres réel vs objectif (`W_BarChart`)
- 6 catégories, hauteur max 200px, barre 70% de largeur cellule, max 56px
- **Ligne d'objectif** dashed `1.5px` au-dessus de chaque barre, label "obj" 9px mono
- Couleur barre : `--accent` si dépasse l'objectif, `--c3` sinon
- Tooltip on hover

#### W07: Donut éclaté (`W_DonutExploded`)
- SVG 200×200, rayons : ext=70 / int=50
- **Hover** : segment se décale de 8px sur l'axe radial (`Math.cos(mid)*8`)
- Centre : "TOTAL" 10px + "100K€" 22px serif
- Légende à droite, ligne entière clickable, surface `--surface-2` au hover

#### W08: Gauge arc segmenté (`W_Gauge`)
- 40 segments lignes radiales (3px stroke), arc `−1.1π → 0.1π`
- Segments remplis en `--accent` avec opacity progressive `0.5 + (i/segments)*0.5`
- Centre : valeur 42px serif + "/ max" mono
- Bas : 2 stats côte à côte (En ligne / Magasin) dans bloc `--surface-2`

### Section 03 — Avancés

#### W09: Heatmap horaire (`W_Heatmap`)
- Grille 7 jours × 8 plages horaires (00, 03, 06, 09, 12, 15, 18, 21)
- Cellules 28px hauteur, gap 4px, border-radius 4px
- Couleur : `color-mix(in oklab, var(--accent) ${v*100}%, var(--surface-2))`
- **Hover** : scale(1.15), affiche tooltip "Lun 15h · 87% activité"
- Légende dégradée + chip "Pic à 15h"

#### W10: Tunnel de conversion (`W_Funnel`)
- 5 étapes empilées verticalement
- Barre 28px hauteur, gradient `linear-gradient(90deg, var(--accent), var(--accent-3))`
- Header de ligne : numéro dans carré 18×18 + nom + valeur mono + drop-off `−X%` en rouge si > 0
- Animation : `transition: width 1s ease-out`

#### W11: Carte expéditions (`W_Map`)
- SVG abstrait 100×80 viewBox avec grille fine (0.2px), forme de continent stylisée
- 6 dots (Paris, Lyon, etc.), rayon proportionnel à `√count`, halo opacity 0.25
- Routes : lignes dashed `1,1` depuis Paris vers chaque hub
- Overlay top-left : badge mono "494 colis · 6 hubs"
- Overlay bottom-right : indicateur "En transit" avec dot pulsant

#### W12: Classement pays (`W_Ranking`)
- 5 pays avec emoji drapeau (22×22 background `--surface-2`)
- Nom + valeur mono + delta (positive/negative)
- Barre 6px rounded, gradient terracotta
- Animation : `width 1s ease-out`

### Section 04 — Listes & contenus

#### W13: Calendrier (`W_Calendar`)
- 4 événements verticaux, séparés par bordures
- Bloc date 44px avec jour 9px / date 18px serif
- État actif : fond `--ink`, texte `--bg`
- Chip tag coloré à droite (campagne / marketing / stock / email)
- Icône clock + heure

#### W14: Activité (`W_Activity`)
- Timeline avec ligne verticale entre items (left:5px, width:1px, `--line-2`)
- Dot 11px coloré par catégorie, ring 3px `--surface` autour
- User en bold + action + détail muted + timestamp mono

#### W15: Tableau triable (`W_Table`)
- Header `--surface-2`, sortable au clic (toggle asc/desc, indicateur ↑/↓)
- Recherche live sur `name` (input dans bouton-style border)
- Boutons : Exporter (secondaire) + Nouveau (primary `--ink`)
- Status pills : `pill-ok` (vert), `pill-warn` (ambre), `pill-bad` (rouge)
- ID en mono 11px `--ink-3`, étoile `--accent` pour rating

#### W16: Stacked bars (`W_Stacked`)
- 6 mois × 3 segments (Premium/Standard/Basique)
- Barre 60% width max 38px, segments séparés par 2px gap
- Légende horizontale avec carrés 8×8

---

## Interactions & Behavior

### Animations
- **Apparition widget** : `fadeUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)` (translateY 8px → 0, opacity 0 → 1)
- **Anneau de progression** : `stroke-dashoffset` transition 1s ease-out
- **Barres** : `width/height 1s ease-out` (funnel, ranking) ou `0.6s` (bar chart)
- **Donut hover** : transform 0.3s
- **Heatmap hover** : transform 0.15s

### Tweaks (système live)
3 contrôles persistés via `__edit_mode_set_keys` :
- `theme` : `light` / `dark` (set `data-theme` sur `<html>`)
- `radius` : `sharp` / `soft` / `pill` (set `data-radius`)
- `typo` : `system` / `inter` / `ibm` / `geist` (set `data-typo`)

### Hovers documentés
- Tous les graphiques : tooltips avec valeurs précises
- Tableau : ligne entière `--surface-2` background
- Donut : segment éclaté + ligne légende mise en valeur
- Heatmap : cellule scale 1.15 + détail temporel
- Carte : pas d'interaction sur les dots (statique mais préparé)

### Tri & filtre (W15 Table)
- Clic en-tête colonne : toggle direction, première fois desc
- Recherche : filter case-insensitive sur `name` uniquement
- Comparaison : `typeof === 'number' ? a - b : String(a).localeCompare(String(b))`

---

## State Management

### Local par widget
- `hover` : index hovered (line, donut, heatmap, bar)
- `period` : sélecteur de période (line chart)
- `tab` : tab actif (gauge)
- `sort` (col, dir) + `filter` : table

### Global (App)
- `tweaks` : `{theme, radius, typo}` — persisté via la convention `EDITMODE-BEGIN/END` markers
- `view` : `'canvas' | 'dashboard'` — non persisté

---

## Layout du Dashboard assemblé

Container max-width 1320px, padding `70px 28px 40px`, gap 16px entre rows.

| Row | Grille | Widgets |
|---|---|---|
| Header | flex justify-between | Salutation + boutons (Période, Export, Nouveau produit) |
| 1 | `repeat(4, 1fr)` | KpiEditorial · KpiBars · KpiTypo · KpiRing |
| 2 | `2fr 1fr` | LineChart · Gauge |
| 3 | `1.1fr 1.2fr 1fr` | DonutExploded · BarChart · Ranking |
| 4 | `repeat(3, 1fr)` | Heatmap · Funnel · Map |
| 5 | `repeat(3, 1fr)` | Stacked · Calendar · Activity |
| 6 | full | Table |

---

## Données factices (mocks)
Toutes les données sont générées dans `utils.jsx` (`MOCK`) ou inline dans chaque widget. À remplacer par les vraies sources :
- `MOCK.monthly` : 12 mois revenus
- `MOCK.weekly` : 7 jours
- `MOCK.daily`, `MOCK.bars`, `MOCK.hours`
- Mocks de produits, événements, pays, segments dans les widgets respectifs

---

## Assets
- **Aucune image externe** — tout est SVG inline (icônes, charts, map abstraite)
- **Emojis drapeaux** dans W16 — à remplacer par des SVG icons si pas de support emoji dans le codebase cible
- **Polices** : système (zero asset). Optionnel : Inter, IBM Plex, Geist via Google Fonts.

---

## Files (dans ce bundle)
- `Widgets Dashboard.html` — entry point
- `styles.css` — tous les tokens + composants atomiques
- `utils.jsx` — `Sparkline`, `BarSpark`, `Icon`, `MOCK`, `fmt`
- `widgets-a.jsx` — W01-W08 (KPIs, line, bar, donut, gauge)
- `widgets-b.jsx` — W09-W16 (calendar, table, heatmap, funnel, map, activity, stacked, ranking)
- `app.jsx` — composition canvas + dashboard + tweaks
- `design-canvas.jsx` — composant interne pour la galerie pan/zoom (à ne pas porter ; utiliser une grille simple)
- `tweaks-panel.jsx` — panneau de tweaks (à ne pas porter ; utiliser la lib UI du codebase)

---

## Recommandations d'implémentation

1. **Recharts ou Visx** pour les charts (line, bar, donut, stacked) au lieu de SVG manuel
2. **TanStack Table** pour le tableau triable
3. **shadcn/ui** ou équivalent pour les primitives (Button, Card, Tabs, Badge, Tooltip)
4. **Framer Motion** pour les transitions list (fadeUp à la mount)
5. La **heatmap** et la **gauge segmentée** restent SVG sur mesure — peu de bénéfice à utiliser une lib
6. Les icônes peuvent être remplacées par **Lucide** (la majorité existe : revenue → wallet, users → users, cart → shopping-cart, etc.)
7. La **carte abstraite** (W11) : à remplacer par une vraie carte (Mapbox / MapLibre) ou conserver l'illustration stylisée selon le besoin
