import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Shield, Lock, Key, Eye, Server, CheckCircle, ArrowLeft } from 'lucide-react';
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

const securityFeatures = [
  {
    icon: Lock,
    title: 'Chiffrement de bout en bout',
    description: 'Toutes vos données sont chiffrées avec les algorithmes les plus avancés (AES-256) pour garantir leur confidentialité.',
  },
  {
    icon: Key,
    title: 'Authentification sécurisée',
    description: 'Système d\'authentification robuste avec support de l\'authentification à deux facteurs (2FA) pour protéger votre compte.',
  },
  {
    icon: Server,
    title: 'Infrastructure sécurisée',
    description: 'Nos serveurs sont hébergés dans des centres de données certifiés avec surveillance 24/7 et sauvegardes automatiques.',
  },
  {
    icon: Eye,
    title: 'Protection de la vie privée',
    description: 'Nous ne partageons jamais vos données personnelles avec des tiers. Votre vie privée est notre priorité absolue.',
  },
];

const certifications = [
  'Conformité RGPD',
  'Certification ISO 27001',
  'Audit de sécurité annuel',
  'Tests de pénétration réguliers',
  'Surveillance continue',
  'Plan de reprise d\'activité',
];

export default function Security() {
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
                <Shield className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">Sécurité et Protection</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Votre sécurité et la protection de vos données sont au cœur de nos priorités
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {securityFeatures.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card hoverable className="h-full">
                  <CardBody>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div variants={itemVariants} className="mb-16">
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
                Nos engagements de sécurité
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certifications.map((cert, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-16">
            <Card>
              <CardBody className="p-8 md:p-12">
                <h2 className="text-3xl font-bold text-foreground mb-6">
                  Protection des données personnelles
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Chez BiblioTech, nous prenons la protection de vos données personnelles très au sérieux. 
                    Toutes les informations que vous nous confiez sont stockées de manière sécurisée et 
                    ne sont utilisées que dans le cadre de nos services.
                  </p>
                  <p>
                    Nous utilisons des technologies de chiffrement de pointe pour protéger vos données 
                    lors de leur transmission et de leur stockage. Nos systèmes sont régulièrement audités 
                    par des experts en sécurité indépendants.
                  </p>
                  <p>
                    Vous gardez le contrôle total de vos données. Vous pouvez à tout moment consulter, 
                    modifier ou supprimer vos informations personnelles depuis votre profil.
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-16">
            <Card>
              <CardBody className="p-8 md:p-12">
                <h2 className="text-3xl font-bold text-foreground mb-6">
                  Sécurité des comptes
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Nous recommandons fortement l'activation de l'authentification à deux facteurs (2FA) 
                    pour renforcer la sécurité de votre compte. Cette fonctionnalité ajoute une couche 
                    de protection supplémentaire en demandant un code de vérification en plus de votre mot de passe.
                  </p>
                  <p>
                    Nos systèmes détectent automatiquement les activités suspectes et vous alertent 
                    en cas de tentative de connexion inhabituelle. Vous recevez également des notifications 
                    pour toute modification importante de votre compte.
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center">
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Des questions sur la sécurité ?
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Notre équipe de sécurité est disponible pour répondre à toutes vos questions
              </p>
              <Link href="/contact">
                <a className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105">
                  Nous contacter
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
