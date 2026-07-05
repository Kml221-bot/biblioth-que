# BiblioTech - Stratégie de Design

## Approche Choisie : Modern Minimalism avec Accent Sophistiqué

### Design Movement
**Modern Minimalism Sophistiqué** - Inspiré par les interfaces SaaS premium (Notion, Linear, Figma). Épuré, fonctionnel, mais avec des détails raffinés qui créent de la profondeur.

### Core Principles
1. **Clarté hiérarchique** - Typographie et espacements créent une hiérarchie visuelle claire
2. **Minimalisme intentionnel** - Chaque élément a un but ; pas de décoration inutile
3. **Profondeur subtile** - Ombres douces, gradients discrets, et micro-interactions créent de la dimension
4. **Accessibilité premium** - Design accessible qui ne sacrifie pas l'élégance

### Color Philosophy
- **Primaire** : Bleu profond (oklch(0.623 0.214 259.815)) - Confiance, professionnalisme, stabilité
- **Secondaire** : Gris neutre (oklch(0.967 0.001 286.375)) - Équilibre, clarté
- **Accent** : Ambre/Orange doux (oklch(0.92 0.004 286.32)) - Énergie, appel à l'action, accent de chaleur
- **Fond** : Blanc pur (oklch(1 0 0)) - Clarté maximale, minimalisme
- **Texte** : Gris très foncé (oklch(0.235 0.015 65)) - Lisibilité optimale, professionnel

**Intention émotionnelle** : Sophistication accessible, confiance professionnelle, innovation douce

### Layout Paradigm
- **Landing Page** : Asymétrique avec sections alternées (contenu à gauche/image à droite, puis inversé)
- **Dashboard** : Sidebar persistant + contenu principal avec grille flexible
- **Éviter** : Layouts centrés génériques, grilles uniformes

### Signature Elements
1. **Cartes avec ombres progressives** - Ombres douces qui augmentent au hover
2. **Dividers subtils** - Lignes très légères pour séparer les sections
3. **Badges avec coins arrondis** - Badges pour catégories, statuts, tags
4. **Icônes Lucide** - Cohérence visuelle avec Lucide React

### Interaction Philosophy
- **Hover effects** : Légère élévation + changement de couleur subtil
- **Transitions** : 200-300ms, easing smooth (ease-in-out)
- **Focus states** : Anneau visible pour accessibilité
- **Feedback immédiat** : Toast notifications pour actions

### Animation
- **Entrées de page** : Fade-in + slide-up léger (200ms)
- **Cartes** : Scale(1.02) + shadow au hover
- **Transitions de route** : Fade-in/out (150ms)
- **Skeleton loading** : Pulse subtil (gris clair)
- **Micro-interactions** : Bounce léger sur les boutons CTA

### Typography System
- **Titres (Display)** : Syne Bold (700) - 32-48px, lettrage -0.5px
- **Titres (Section)** : Syne SemiBold (600) - 24-28px
- **Sous-titres** : Plus Jakarta Sans Regular (400) - 16-18px, couleur grise
- **Corps** : Plus Jakarta Sans Regular (400) - 14-16px
- **Code/Technique** : JetBrains Mono Regular (400) - 12-14px
- **Boutons** : Plus Jakarta Sans SemiBold (600) - 14px

### Polices à importer
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

---

## Palette de Couleurs Détaillée

### Primaire (Bleu)
- `--primary`: oklch(0.623 0.214 259.815) - Bleu principal
- `--primary-foreground`: oklch(1 0 0) - Blanc pour texte sur primaire

### Secondaire (Gris)
- `--secondary`: oklch(0.98 0.001 286.375) - Gris très clair
- `--secondary-foreground`: oklch(0.4 0.015 65) - Gris foncé

### Accent (Ambre)
- `--accent`: oklch(0.92 0.004 286.32) - Ambre doux
- `--accent-foreground`: oklch(0.141 0.005 285.823) - Noir pour contraste

### Backgrounds
- `--background`: oklch(1 0 0) - Blanc pur
- `--card`: oklch(1 0 0) - Blanc pur
- `--muted`: oklch(0.967 0.001 286.375) - Gris très clair

### Borders
- `--border`: oklch(0.92 0.004 286.32) - Gris clair pour bordures
- `--input`: oklch(0.92 0.004 286.32) - Gris clair pour inputs

---

## Composants Signature

### Boutons
- **Primary** : Fond bleu, texte blanc, ombre douce
- **Secondary** : Fond gris clair, texte bleu, pas d'ombre
- **Outline** : Bordure bleue, fond transparent, texte bleu
- **Ghost** : Pas de fond, texte bleu, hover: fond gris très clair

### Cartes
- Bordure très légère (gris clair)
- Ombre douce (0 4px 6px rgba(0,0,0,0.07))
- Padding généreux (24px)
- Coins arrondis (8px)
- Hover: Ombre augmente, scale léger

### Inputs
- Bordure gris clair
- Padding 12px 16px
- Focus: Anneau bleu subtil
- Placeholder gris moyen

---

## Résumé pour Développement
✅ Minimaliste mais sophistiqué
✅ Typographie hiérarchisée et claire
✅ Couleurs harmonieuses (bleu + gris + ambre)
✅ Animations subtiles et fluides
✅ Accessibilité intégrée
✅ Responsive et moderne
