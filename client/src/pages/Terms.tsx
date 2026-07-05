import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { FileText, ArrowLeft } from 'lucide-react';
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

export default function Terms() {
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
                <FileText className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">Conditions d'Utilisation</h1>
            <p className="text-lg text-muted-foreground">
              Dernière mise à jour : 8 Mars 2026
            </p>
          </div>

          <Card className="mb-8">
            <CardBody className="p-8 md:p-12">
              <div className="prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptation des conditions</h2>
                <p className="text-muted-foreground mb-6">
                  En accédant et en utilisant BiblioTech, vous acceptez d'être lié par ces conditions 
                  d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">2. Description du service</h2>
                <p className="text-muted-foreground mb-6">
                  BiblioTech est une plateforme de gestion de bibliothèque en ligne qui permet aux utilisateurs 
                  de parcourir, emprunter et gérer des livres numériques et physiques. Nous nous réservons le 
                  droit de modifier, suspendre ou interrompre tout aspect du service à tout moment.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">3. Compte utilisateur</h2>
                <p className="text-muted-foreground mb-4">
                  Pour utiliser certaines fonctionnalités de BiblioTech, vous devez créer un compte. Vous vous engagez à :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Fournir des informations exactes et complètes lors de l'inscription</li>
                  <li>Maintenir la sécurité de votre mot de passe</li>
                  <li>Nous informer immédiatement de toute utilisation non autorisée de votre compte</li>
                  <li>Être responsable de toutes les activités effectuées sous votre compte</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">4. Règles d'emprunt</h2>
                <p className="text-muted-foreground mb-4">
                  Les règles suivantes s'appliquent aux emprunts de livres :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Les utilisateurs gratuits peuvent emprunter jusqu'à 3 livres simultanément</li>
                  <li>Les utilisateurs Premium peuvent emprunter un nombre illimité de livres</li>
                  <li>La durée d'emprunt standard est de 14 jours</li>
                  <li>Les livres peuvent être renouvelés si aucune réservation n'est en attente</li>
                  <li>Les retards peuvent entraîner des restrictions temporaires</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">5. Utilisation acceptable</h2>
                <p className="text-muted-foreground mb-4">
                  Vous acceptez de ne pas :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Utiliser le service à des fins illégales ou non autorisées</li>
                  <li>Violer les droits de propriété intellectuelle</li>
                  <li>Télécharger ou transmettre des virus ou du code malveillant</li>
                  <li>Tenter d'accéder de manière non autorisée à nos systèmes</li>
                  <li>Harceler, abuser ou nuire à d'autres utilisateurs</li>
                  <li>Créer plusieurs comptes pour contourner les limitations</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">6. Propriété intellectuelle</h2>
                <p className="text-muted-foreground mb-6">
                  Tout le contenu disponible sur BiblioTech, y compris les textes, graphiques, logos, 
                  et logiciels, est la propriété de BiblioTech ou de ses concédants de licence et est 
                  protégé par les lois sur le droit d'auteur et la propriété intellectuelle.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">7. Abonnements et paiements</h2>
                <p className="text-muted-foreground mb-4">
                  Pour les abonnements Premium :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Les frais sont facturés mensuellement à l'avance</li>
                  <li>L'abonnement se renouvelle automatiquement sauf annulation</li>
                  <li>Vous pouvez annuler à tout moment depuis votre profil</li>
                  <li>Aucun remboursement n'est accordé pour les périodes partielles</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">8. Résiliation</h2>
                <p className="text-muted-foreground mb-6">
                  Nous nous réservons le droit de suspendre ou de résilier votre compte si vous violez 
                  ces conditions d'utilisation. Vous pouvez également fermer votre compte à tout moment 
                  depuis les paramètres de votre profil.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">9. Limitation de responsabilité</h2>
                <p className="text-muted-foreground mb-6">
                  BiblioTech est fourni "tel quel" sans garantie d'aucune sorte. Nous ne sommes pas 
                  responsables des dommages indirects, accessoires ou consécutifs résultant de l'utilisation 
                  ou de l'impossibilité d'utiliser notre service.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">10. Modifications des conditions</h2>
                <p className="text-muted-foreground mb-6">
                  Nous pouvons modifier ces conditions à tout moment. Les modifications importantes seront 
                  notifiées par email ou via notre plateforme. Votre utilisation continue du service après 
                  de telles modifications constitue votre acceptation des nouvelles conditions.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">11. Droit applicable</h2>
                <p className="text-muted-foreground mb-6">
                  Ces conditions sont régies par les lois françaises. Tout litige sera soumis à la 
                  juridiction exclusive des tribunaux de Paris, France.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">12. Contact</h2>
                <p className="text-muted-foreground mb-4">
                  Pour toute question concernant ces conditions d'utilisation :
                </p>
                <ul className="list-none text-muted-foreground space-y-2 mb-6">
                  <li>Email : legal@bibliotech.com</li>
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
