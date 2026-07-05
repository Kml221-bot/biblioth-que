import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { BookOpen, Calendar, User, ArrowLeft, ArrowRight } from 'lucide-react';
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

const blogPosts = [
  {
    title: 'Comment choisir son prochain livre',
    excerpt: 'Découvrez nos conseils pour trouver le livre parfait selon vos goûts et vos envies du moment.',
    author: 'Marie Dubois',
    date: '15 Mars 2026',
    category: 'Conseils',
    readTime: '5 min',
  },
  {
    title: 'L\'impact de la lecture sur l\'apprentissage',
    excerpt: 'Une étude approfondie sur les bienfaits de la lecture régulière sur le développement cognitif.',
    author: 'Jean Martin',
    date: '10 Mars 2026',
    category: 'Recherche',
    readTime: '8 min',
  },
  {
    title: 'Les meilleurs livres pour apprendre la programmation',
    excerpt: 'Notre sélection des ouvrages incontournables pour débuter ou se perfectionner en développement.',
    author: 'Sophie Laurent',
    date: '5 Mars 2026',
    category: 'Technologie',
    readTime: '6 min',
  },
  {
    title: 'Organiser sa bibliothèque personnelle',
    excerpt: 'Astuces et méthodes pour classer et gérer efficacement votre collection de livres.',
    author: 'Pierre Rousseau',
    date: '1 Mars 2026',
    category: 'Organisation',
    readTime: '4 min',
  },
  {
    title: 'La lecture numérique vs papier',
    excerpt: 'Comparaison objective des avantages et inconvénients de chaque format de lecture.',
    author: 'Claire Bernard',
    date: '25 Février 2026',
    category: 'Analyse',
    readTime: '7 min',
  },
  {
    title: 'Créer un club de lecture en ligne',
    excerpt: 'Guide complet pour lancer et animer une communauté de lecteurs passionnés.',
    author: 'Thomas Petit',
    date: '20 Février 2026',
    category: 'Communauté',
    readTime: '5 min',
  },
];

export default function Blog() {
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
            <h1 className="text-5xl font-bold text-foreground mb-6">Blog BiblioTech</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Découvrez nos articles sur la lecture, les livres et la gestion de bibliothèque
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card hoverable className="h-full">
                  <CardBody>
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                        {post.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{post.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{post.readTime} de lecture</span>
                      <button className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 text-sm font-semibold">
                        Lire plus
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div variants={itemVariants} className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">Plus d'articles à venir...</p>
            <Link href="/register">
              <a className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105">
                Rejoindre BiblioTech
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
