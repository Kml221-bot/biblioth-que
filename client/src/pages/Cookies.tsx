import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Cookie, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardBody } from '@/components/ui/Card';
import { useDarkMode } from '@/hooks/useDarkMode';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export default function Cookies() {
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
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Cookie className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">Politique de Cookies</h1>
            <p className="text-lg text-muted-foreground">
              Dernière mise à jour : 8 Mars 2026
            </p>
          </div>

          <Card className="mb-8">
            <CardBody className="p-8 md:p-12">
              <div className="prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold text-foreground mb-4">Qu'est-ce qu'un cookie ?</h2>
                <p className="text-muted-foreground mb-6">
                  Un cookie est un petit fichier texte stocké sur votre appareil lorsque vous visitez 
                  un site web. Les cookies permettent au site de mémoriser vos actions et préférences 
                  (comme la langue, la taille de police, etc.) pendant une période donnée, afin que vous 
                  n'ayez pas à les saisir à nouveau lors de votre prochaine visite.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">Comment nous utilisons les cookies</h2>
                <p className="text-muted-foreground mb-6">
                  BiblioTech utilise des cookies pour améliorer votre expérience sur notre plateforme. 
                  Nous utilisons différents types de cookies pour diverses raisons détaillées ci-dessous.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">Types de cookies que nous utilisons</h2>
                
                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">1. Cookies essentiels</h3>
                <p className="text-muted-foreground mb-4">
                  Ces cookies sont nécessaires au fonctionnement de notre site web. Ils permettent :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>La gestion de votre session de connexion</li>
                  <li>La sécurité et la prévention de la fraude</li>
                  <li>Le fonctionnement des fonctionnalités de base du site</li>
                </ul>
                <p className="text-muted-foreground mb-6">
                  <strong>Durée de conservation :</strong> Session ou jusqu'à 30 jours
                </p>

                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2. Cookies de préférences</h3>
                <p className="text-muted-foreground mb-4">
                  Ces cookies permettent de mémoriser vos préférences et choix :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Votre langue préférée</li>
                  <li>Le thème (mode clair/sombre)</li>
                  <li>Les paramètres d'affichage</li>
                  <li>Les préférences de notification</li>
                </ul>
                <p className="text-muted-foreground mb-6">
                  <strong>Durée de conservation :</strong> Jusqu'à 1 an
                </p>

                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">3. Cookies analytiques</h3>
                <p className="text-muted-foreground mb-4">
                  Ces cookies nous aident à comprendre comment les visiteurs utilisent notre site :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Pages visitées et temps passé sur chaque page</li>
                  <li>Parcours de navigation</li>
                  <li>Taux de rebond et sources de trafic</li>
                  <li>Performances du site</li>
                </ul>
                <p className="text-muted-foreground mb-6">
                  <strong>Durée de conservation :</strong> Jusqu'à 2 ans
                </p>

                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">4. Cookies de fonctionnalité</h3>
                <p className="text-muted-foreground mb-4">
                  Ces cookies permettent d'améliorer les fonctionnalités et la personnalisation :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Recommandations de livres personnalisées</li>
                  <li>Historique de recherche</li>
                  <li>Listes de favoris</li>
                  <li>Paramètres de lecture</li>
                </ul>
                <p className="text-muted-foreground mb-6">
                  <strong>Durée de conservation :</strong> Jusqu'à 1 an
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">Cookies tiers</h2>
                <p className="text-muted-foreground mb-6">
                  Nous pouvons également utiliser des cookies de services tiers de confiance pour nous 
                  aider à analyser l'utilisation de notre site et à améliorer nos services. Ces tiers 
                  ont leurs propres politiques de confidentialité concernant la manière dont ils utilisent 
                  ces informations.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">Gestion des cookies</h2>
                <p className="text-muted-foreground mb-4">
                  Vous pouvez contrôler et/ou supprimer les cookies comme vous le souhaitez. Vous pouvez :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Supprimer tous les cookies déjà présents sur votre appareil</li>
                  <li>Configurer la plupart des navigateurs pour empêcher le placement de cookies</li>
                  <li>Gérer vos préférences de cookies dans les paramètres de votre compte BiblioTech</li>
                </ul>
                <p className="text-muted-foreground mb-6">
                  Veuillez noter que si vous supprimez les cookies ou refusez de les accepter, vous 
                  pourriez ne pas être en mesure d'utiliser toutes les fonctionnalités que nous offrons, 
                  et certaines de nos pages pourraient ne pas s'afficher correctement.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">Configuration de votre navigateur</h2>
                <p className="text-muted-foreground mb-4">
                  La plupart des navigateurs web acceptent automatiquement les cookies, mais vous pouvez 
                  généralement modifier les paramètres de votre navigateur pour refuser les cookies si 
                  vous le préférez. Voici comment gérer les cookies dans les navigateurs les plus courants :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li><strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies</li>
                  <li><strong>Firefox :</strong> Options → Vie privée et sécurité → Cookies</li>
                  <li><strong>Safari :</strong> Préférences → Confidentialité → Cookies</li>
                  <li><strong>Edge :</strong> Paramètres → Cookies et autorisations de site</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">Modifications de cette politique</h2>
                <p className="text-muted-foreground mb-6">
                  Nous pouvons mettre à jour cette politique de cookies de temps en temps pour refléter 
                  les changements dans nos pratiques ou pour d'autres raisons opérationnelles, légales 
                  ou réglementaires.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">Contact</h2>
                <p className="text-muted-foreground mb-4">
                  Si vous avez des questions concernant notre utilisation des cookies :
                </p>
                <ul className="list-none text-muted-foreground space-y-2 mb-6">
                  <li>Email : cookies@bibliotech.com</li>
                  <li>Adresse : BiblioTech, 123 Rue de la Lecture, 75001 Paris, France</li>
                </ul>
              </div>
            </CardBody>
          </Card>

          <div className="text-center">
            <Link href="/contact">
              <a className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105">
                Des questions ? Contactez-nous
              </a>
            </Link>
          </div>
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
