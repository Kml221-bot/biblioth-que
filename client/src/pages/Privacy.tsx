import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Shield, ArrowLeft } from 'lucide-react';
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

export default function Privacy() {
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
                <Shield className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">Politique de Confidentialité</h1>
            <p className="text-lg text-muted-foreground">
              Dernière mise à jour : 8 Mars 2026
            </p>
          </div>

          <Card className="mb-8">
            <CardBody className="p-8 md:p-12">
              <div className="prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold text-foreground mb-4">1. Introduction</h2>
                <p className="text-muted-foreground mb-6">
                  BiblioTech ("nous", "notre" ou "nos") s'engage à protéger votre vie privée. 
                  Cette politique de confidentialité explique comment nous collectons, utilisons, 
                  partageons et protégeons vos informations personnelles lorsque vous utilisez 
                  notre plateforme de gestion de bibliothèque.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">2. Informations que nous collectons</h2>
                <p className="text-muted-foreground mb-4">
                  Nous collectons les types d'informations suivants :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li><strong>Informations de compte :</strong> nom, adresse email, mot de passe (chiffré)</li>
                  <li><strong>Informations de profil :</strong> préférences de lecture, historique d'emprunts</li>
                  <li><strong>Données d'utilisation :</strong> pages visitées, livres consultés, recherches effectuées</li>
                  <li><strong>Informations techniques :</strong> adresse IP, type de navigateur, système d'exploitation</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">3. Comment nous utilisons vos informations</h2>
                <p className="text-muted-foreground mb-4">
                  Nous utilisons vos informations pour :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Fournir et améliorer nos services</li>
                  <li>Personnaliser votre expérience et vos recommandations</li>
                  <li>Gérer vos emprunts et votre historique de lecture</li>
                  <li>Communiquer avec vous concernant votre compte et nos services</li>
                  <li>Assurer la sécurité de notre plateforme</li>
                  <li>Analyser l'utilisation de nos services pour les améliorer</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">4. Partage de vos informations</h2>
                <p className="text-muted-foreground mb-6">
                  Nous ne vendons jamais vos données personnelles. Nous ne partageons vos informations 
                  qu'avec votre consentement explicite ou dans les cas suivants :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li>Avec des prestataires de services qui nous aident à exploiter notre plateforme</li>
                  <li>Pour nous conformer à des obligations légales</li>
                  <li>Pour protéger nos droits, notre propriété ou notre sécurité</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">5. Sécurité des données</h2>
                <p className="text-muted-foreground mb-6">
                  Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles 
                  appropriées pour protéger vos données personnelles contre tout accès non autorisé, 
                  modification, divulgation ou destruction. Cela inclut le chiffrement des données, 
                  des contrôles d'accès stricts et des audits de sécurité réguliers.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">6. Vos droits</h2>
                <p className="text-muted-foreground mb-4">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                  <li><strong>Droit d'accès :</strong> consulter les données que nous détenons sur vous</li>
                  <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
                  <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                  <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                  <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                  <li><strong>Droit de limitation :</strong> limiter le traitement de vos données</li>
                </ul>

                <h2 className="text-2xl font-bold text-foreground mb-4">7. Cookies</h2>
                <p className="text-muted-foreground mb-6">
                  Nous utilisons des cookies et des technologies similaires pour améliorer votre expérience. 
                  Pour plus d'informations, consultez notre <Link href="/cookies"><a className="text-primary hover:underline">Politique de Cookies</a></Link>.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">8. Conservation des données</h2>
                <p className="text-muted-foreground mb-6">
                  Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir 
                  nos services et respecter nos obligations légales. Lorsque vous supprimez votre compte, 
                  nous supprimons ou anonymisons vos données personnelles dans un délai raisonnable.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">9. Modifications de cette politique</h2>
                <p className="text-muted-foreground mb-6">
                  Nous pouvons mettre à jour cette politique de confidentialité de temps en temps. 
                  Nous vous informerons de tout changement important par email ou via une notification 
                  sur notre plateforme.
                </p>

                <h2 className="text-2xl font-bold text-foreground mb-4">10. Nous contacter</h2>
                <p className="text-muted-foreground mb-4">
                  Pour toute question concernant cette politique de confidentialité ou pour exercer 
                  vos droits, contactez-nous :
                </p>
                <ul className="list-none text-muted-foreground space-y-2 mb-6">
                  <li>Email : privacy@bibliotech.com</li>
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
