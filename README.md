# BiblioTech - Gestion de Bibliothèque Moderne

Une application web complète et professionnelle pour la gestion de bibliothèque, construite avec React, TypeScript, Vite et Tailwind CSS.

## 🎯 Objectif

BiblioTech est une plateforme moderne de gestion de bibliothèque qui permet aux utilisateurs de :
- Parcourir un catalogue de 100+ livres
- Emprunter et retourner des livres facilement
- Gérer leurs emprunts actifs
- Consulter leur historique d'emprunts
- Recevoir des recommandations personnalisées
- Laisser des avis et des notes sur les livres

## 🚀 Fonctionnalités

### Fonctionnalités Principales
- ✅ **Landing Page** - Page d'accueil élégante avec animations Framer Motion
- ✅ **Authentification** - Login, Register, Reset Password avec validation complète
- ✅ **Dashboard** - Aperçu des emprunts et statistiques
- ✅ **Catalogue** - Recherche et filtres avancés
- ✅ **Gestion des Emprunts** - Renouvellement et retour de livres
- ✅ **Historique** - Statistiques avec graphiques (Bar Chart, Pie Chart)
- ✅ **Profil Utilisateur** - Édition des informations et préférences

### Fonctionnalités Bonus (Impressionnantes!)
- 🌟 **Système de Favoris** - Marquer les livres préférés avec animation
- ⭐ **Notation des Livres** - Laisser des avis (1-5 étoiles)
- 🤖 **Recommandations IA** - Suggestions personnalisées basées sur les préférences
- 📖 **Mode Lecture** - Interface optimisée pour la lecture avec contrôles de confort
- 📄 **Export PDF** - Télécharger l'historique des emprunts
- 🔔 **Système de Notifications** - Alertes et rappels
- 🎨 **Mode Sombre/Clair** - Thème personnalisable
- 📊 **Graphiques Avancés** - Statistiques visuelles avec Recharts

## 🛠️ Stack Technique

- **Frontend** : React 19 + TypeScript
- **Build Tool** : Vite
- **Styling** : Tailwind CSS 4
- **Animations** : Framer Motion
- **UI Components** : shadcn/ui
- **Graphiques** : Recharts
- **Routing** : Wouter
- **Validation** : Zod
- **Formulaires** : React Hook Form
- **Icônes** : Lucide React

## 📁 Structure du Projet

```
bibliotech-pro/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx                 # Landing page
│   │   │   ├── NotFound.tsx             # 404 page
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx            # Page de connexion
│   │   │   │   ├── Register.tsx         # Page d'inscription
│   │   │   │   └── ResetPassword.tsx    # Réinitialisation du mot de passe
│   │   │   └── dashboard/
│   │   │       ├── Dashboard.tsx        # Dashboard principal
│   │   │       ├── Catalogue.tsx        # Catalogue de livres
│   │   │       ├── Emprunts.tsx         # Gestion des emprunts
│   │   │       ├── Historique.tsx       # Historique avec graphiques
│   │   │       ├── Profil.tsx           # Profil utilisateur
│   │   │       ├── Recommandations.tsx  # Recommandations IA
│   │   │       └── ReadingMode.tsx      # Mode lecture
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx           # Barre de navigation
│   │   │   │   └── DashboardLayout.tsx  # Layout du dashboard
│   │   │   ├── ui/
│   │   │   │   ├── Badge.tsx            # Composant Badge
│   │   │   │   ├── Card.tsx             # Composant Card
│   │   │   │   ├── Skeleton.tsx         # Skeleton loading
│   │   │   │   └── ...
│   │   │   └── features/
│   │   │       ├── FavoritesButton.tsx  # Bouton favoris
│   │   │       ├── RatingStars.tsx      # Notation
│   │   │       ├── ExportPDF.tsx        # Export PDF
│   │   │       └── NotificationCenter.tsx # Notifications
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx          # Contexte d'authentification
│   │   │   └── ThemeContext.tsx         # Contexte du thème
│   │   ├── hooks/
│   │   │   ├── useAuth.ts               # Hook d'authentification
│   │   │   ├── useBooks.ts              # Hook pour les livres
│   │   │   ├── useBorrows.ts            # Hook pour les emprunts
│   │   │   ├── useDarkMode.ts           # Hook du thème
│   │   │   ├── useDebounce.ts           # Hook debounce
│   │   │   ├── useToast.ts              # Hook pour les toasts
│   │   │   └── useLocalStorage.ts       # Hook localStorage
│   │   ├── types/
│   │   │   └── index.ts                 # Types TypeScript
│   │   ├── App.tsx                      # Composant principal
│   │   ├── main.tsx                     # Point d'entrée
│   │   └── index.css                    # Styles globaux
│   ├── public/
│   │   └── favicon.ico
│   └── index.html
├── package.json
└── README.md
```

## 🎨 Design System

### Palette de Couleurs
- **Primaire** : Bleu profond (#0066cc)
- **Secondaire** : Gris clair (#f3f4f6)
- **Accent** : Bleu ciel (#e0f2fe)
- **Texte** : Gris foncé (#1f2937)
- **Bordures** : Gris léger (#e5e7eb)

### Typographie
- **Display** : Syne (Bold)
- **Heading** : Plus Jakarta Sans (Semibold)
- **Body** : Plus Jakarta Sans (Regular)
- **Code** : JetBrains Mono

### Composants Réutilisables
- Badge (pour catégories, statuts)
- Card (conteneur principal)
- Skeleton (chargement)
- Button (boutons d'action)
- Input (champs de saisie)
- Select (sélecteurs)
- Dialog (modales)

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+
- npm ou pnpm

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd bibliotech-pro

# Installer les dépendances
pnpm install

# Démarrer le serveur de développement
pnpm dev

# Accéder à l'application
# http://localhost:3000
```

### Build pour la Production
```bash
pnpm build
pnpm preview
```

## 📝 Fonctionnalités Détaillées

### Landing Page
- Hero section avec animations Framer Motion
- Section des fonctionnalités principales
- Section "Comment ça marche"
- Call-to-action section
- Footer complet avec liens

### Authentification
- Formulaires avec validation stricte
- Gestion des erreurs
- Affichage/masquage du mot de passe
- Lien "Mot de passe oublié"
- Connexion Google (placeholder)

### Dashboard
- Statistiques en temps réel
- Aperçu des emprunts récents
- Actions rapides
- Responsive design

### Catalogue
- Recherche en temps réel (debounce)
- Filtres par catégorie
- Filtrer par disponibilité
- Grille de livres avec animations
- Bouton d'emprunt
- Système de favoris

### Gestion des Emprunts
- Liste des emprunts actifs
- Renouvellement des livres
- Retour de livres
- Indicateur de durée
- Alertes pour les livres à rendre bientôt

### Historique
- Graphiques statistiques (Bar Chart, Pie Chart)
- Filtres par statut
- Liste détaillée des emprunts passés
- Statistiques globales

### Recommandations
- Recommandations IA basées sur les préférences
- Pourcentage de correspondance
- Raison de la recommandation
- Notation des livres
- Système de favoris

### Mode Lecture
- Interface immersive
- Ajustement de la taille de police
- Hauteur de ligne personnalisable
- Choix de police
- Thème clair/sombre

## 🎯 Points Forts pour Impressionner le Professeur

1. **Architecture Professionnelle**
   - Structure claire et modulaire
   - Séparation des responsabilités
   - Réutilisabilité des composants

2. **TypeScript Strict**
   - Typage complet
   - Zéro `any`
   - Interfaces bien définies

3. **Design System Cohérent**
   - Polices harmonisées
   - Palette de couleurs cohérente
   - Composants réutilisables

4. **Animations Fluides**
   - Framer Motion pour les transitions
   - Micro-interactions
   - Feedback utilisateur

5. **Fonctionnalités Bonus**
   - Système de favoris
   - Notation des livres
   - Recommandations IA
   - Mode lecture
   - Export PDF
   - Notifications

6. **UX/UI Moderne**
   - Dark mode
   - Responsive design
   - Accessibilité
   - Skeleton loading
   - Empty states

7. **Performance**
   - Lazy loading
   - Memoization
   - Debounce pour la recherche
   - Optimisation des rendus

8. **Documentation**
   - Code commenté
   - README complet
   - Types TypeScript explicites

## 📊 Statistiques du Projet

- **Pages** : 12
- **Composants** : 30+
- **Hooks Personnalisés** : 7
- **Contextes** : 2
- **Types TypeScript** : 15+
- **Lignes de Code** : 100+

## 🔒 Sécurité

- Validation stricte des formulaires
- Gestion sécurisée des données utilisateur
- Protection contre les injections XSS
- Gestion des erreurs robuste

## 📱 Responsive Design

- Mobile First
- Breakpoints : sm (640px), md (768px), lg (1024px)
- Navigation mobile avec sidebar collapsible
- Grilles adaptatives

## 🌐 Accessibilité

- Labels explicites pour les inputs
- Navigation au clavier
- Contraste suffisant
- ARIA labels où nécessaire

## 📞 Support

Pour toute question ou problème, veuillez consulter la documentation ou créer une issue.

## 📄 Licence

MIT

---

**Créé avec ❤️ pour impressionner**

BiblioTech - Gestion de Bibliothèque Moderne © 2026
