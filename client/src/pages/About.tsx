import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { BookOpen, Target, Eye, Users, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { useDarkMode } from '@/hooks/useDarkMode';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

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

export default function About() {
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
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">À propos de BiblioTech</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              BiblioTech est une plateforme moderne conçue pour simplifier la gestion des bibliothèques 
              et faciliter l'accès aux livres pour tous.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-16">
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                Notre Mission
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Notre mission est de démocratiser l'accès à la lecture en créant une plateforme intuitive 
                qui connecte les lecteurs avec les livres qu'ils aiment. Nous croyons que chaque personne 
                devrait avoir accès à une bibliothèque riche et diversifiée, sans contraintes géographiques 
                ou financières.
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-16">
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Eye className="w-8 h-8 text-primary" />
                Notre Vision
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Nous envisageons un monde où la lecture est accessible à tous, où la gestion de bibliothèque 
                est simplifiée grâce à la technologie, et où chaque lecteur peut découvrir facilement son 
                prochain livre préféré. BiblioTech aspire à devenir la référence mondiale en matière de 
                gestion de bibliothèque numérique.
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                Notre Équipe
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                BiblioTech est développé par une équipe passionnée de développeurs, designers et bibliothécaires 
                qui partagent une vision commune : rendre la lecture plus accessible et agréable pour tous.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { role: 'Développement', description: 'Experts en technologies web modernes' },
                  { role: 'Design UX/UI', description: 'Créateurs d\'expériences utilisateur exceptionnelles' },
                  { role: 'Bibliothéconomie', description: 'Spécialistes en gestion de bibliothèque' },
                ].map((team, index) => (
                  <div key={index} className="text-center">
                    <h3 className="text-xl font-semibold text-foreground mb-2">{team.role}</h3>
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-16 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">Rejoignez-nous</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Faites partie de la communauté BiblioTech et découvrez une nouvelle façon de lire
            </p>
            <Link href="/register">
              <a className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105">
                Commencer maintenant
              </a>
            </Link>
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
