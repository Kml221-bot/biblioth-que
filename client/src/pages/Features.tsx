import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { BookOpen, BookMarked, History, TrendingUp, Search, Users, Clock, Shield, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardBody } from '@/components/ui/Card';
import { useDarkMode } from '@/hooks/useDarkMode';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const features = [
  {
    icon: BookOpen,
    title: 'Catalogue de livres',
    description: 'Accédez à une vaste collection de livres soigneusement organisés par catégories, auteurs et genres.',
    details: [
      'Plus de 5000 livres disponibles',
      'Descriptions détaillées et résumés',
      'Couvertures haute qualité',
      'Métadonnées complètes',
    ],
  },
  {
    icon: BookMarked,
    title: 'Emprunts simplifiés',
    description: 'Empruntez des livres en un clic avec un système de gestion automatisé et intuitif.',
    details: [
      'Emprunt instantané',
      'Gestion des dates de retour',
      'Notifications automatiques',
      'Renouvellement facile',
    ],
  },
  {
    icon: History,
    title: 'Historique de lecture',
    description: 'Suivez tous vos emprunts passés et gardez une trace de vos lectures.',
    details: [
      'Historique complet',
      'Statistiques de lecture',
      'Notes personnelles',
      'Export de données',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Recommandations',
    description: 'Découvrez de nouveaux livres basés sur vos préférences et votre historique de lecture.',
    details: [
      'Algorithme intelligent',
      'Suggestions personnalisées',
      'Tendances du moment',
      'Nouveautés ciblées',
    ],
  },
  {
    icon: Search,
    title: 'Recherche avancée',
    description: 'Trouvez rapidement le livre que vous cherchez avec notre moteur de recherche puissant.',
    details: [
      'Recherche par titre, auteur, ISBN',
      'Filtres multiples',
      'Résultats instantanés',
      'Suggestions automatiques',
    ],
  },
  {
    icon: Users,
    title: 'Communauté',
    description: 'Connectez-vous avec d\'autres lecteurs et partagez vos avis et recommandations.',
    details: [
      'Avis et commentaires',
      'Notes et évaluations',
      'Listes de lecture partagées',
      'Clubs de lecture',
    ],
  },
  {
    icon: Clock,
    title: 'Disponibilité en temps réel',
    description: 'Consultez la disponibilité des livres en temps réel et réservez-les instantanément.',
    details: [
      'Statut en direct',
      'File d\'attente',
      'Réservations',
      'Alertes de disponibilité',
    ],
  },
  {
    icon: Shield,
    title: 'Sécurité et confidentialité',
    description: 'Vos données sont protégées avec les plus hauts standards de sécurité.',
    details: [
      'Chiffrement des données',
      'Authentification sécurisée',
      'Confidentialité garantie',
      'Conformité RGPD',
    ],
  },
];

export default function Features() {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <div className="min-h-screen bg-background">
      <Navbar isDark={isDark} onThemeToggle={toggleDarkMode} isAuthenticated={false} />

      <div className="container py-20">
        <Link href="/">
          <a className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </a>
        </Link>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">Fonctionnalités</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Découvrez toutes les fonctionnalités qui font de BiblioTech la plateforme 
              de gestion de bibliothèque la plus complète
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card hoverable className="h-full">
                  <CardBody>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {feature.description}
                        </p>
                        <ul className="space-y-2">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div variants={itemVariants} className="mt-16 text-center">
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Prêt à découvrir toutes ces fonctionnalités ?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Inscrivez-vous gratuitement et commencez à explorer BiblioTech dès aujourd'hui
              </p>
              <Link href="/register">
                <a className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105">
                  Commencer gratuitement
                </a>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <footer className="border-t border-border bg-muted/30 py-8 mt-20">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 BiblioTech. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
