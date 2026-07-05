import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Check, BookOpen, ArrowLeft, Sparkles } from 'lucide-react';
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

const plans = [
  {
    name: 'Gratuit',
    price: '0€',
    period: 'par mois',
    description: 'Parfait pour commencer votre aventure de lecture',
    features: [
      'Accès au catalogue complet',
      'Jusqu\'à 3 emprunts simultanés',
      'Historique de lecture basique',
      'Recherche standard',
      'Support communautaire',
    ],
    cta: 'Commencer gratuitement',
    popular: false,
  },
  {
    name: 'Premium',
    price: '9.99€',
    period: 'par mois',
    description: 'Pour les lecteurs passionnés qui veulent plus',
    features: [
      'Tout du plan Gratuit',
      'Emprunts illimités',
      'Recommandations personnalisées IA',
      'Historique complet avec statistiques',
      'Réservations prioritaires',
      'Mode lecture avancé',
      'Support prioritaire 24/7',
      'Accès anticipé aux nouveautés',
      'Export de données',
    ],
    cta: 'Passer à Premium',
    popular: true,
  },
];

export default function Pricing() {
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
            <h1 className="text-5xl font-bold text-foreground mb-6">Tarifs simples et transparents</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choisissez le plan qui correspond à vos besoins de lecture
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className={`h-full relative ${plan.popular ? 'border-2 border-primary' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="px-4 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full flex items-center gap-1">
                        <Sparkles className="w-4 h-4" />
                        Populaire
                      </div>
                    </div>
                  )}
                  <CardBody className="p-8">
                    <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground mb-6">{plan.description}</p>
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ml-2">{plan.period}</span>
                    </div>
                    <Link href="/register">
                      <a className={`w-full px-6 py-3 font-semibold rounded-lg transition-all duration-200 hover:scale-105 inline-flex items-center justify-center mb-8 ${
                        plan.popular
                          ? 'bg-primary text-primary-foreground hover:shadow-lg'
                          : 'border border-border text-foreground hover:bg-muted'
                      }`}>
                        {plan.cta}
                      </a>
                    </Link>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div variants={itemVariants} className="mt-16 text-center">
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Questions sur nos tarifs ?
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Notre équipe est là pour vous aider à choisir le meilleur plan pour vos besoins
              </p>
              <Link href="/contact">
                <a className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-all duration-200">
                  Nous contacter
                </a>
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-12">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
                Foire aux questions
              </h3>
              <div className="space-y-4">
                {[
                  {
                    q: 'Puis-je changer de plan à tout moment ?',
                    a: 'Oui, vous pouvez passer du plan Gratuit au plan Premium ou annuler votre abonnement à tout moment.',
                  },
                  {
                    q: 'Y a-t-il un engagement ?',
                    a: 'Non, aucun engagement. Vous pouvez annuler votre abonnement Premium quand vous le souhaitez.',
                  },
                  {
                    q: 'Quels sont les moyens de paiement acceptés ?',
                    a: 'Nous acceptons les cartes bancaires (Visa, Mastercard, American Express) et PayPal.',
                  },
                ].map((faq, idx) => (
                  <Card key={idx}>
                    <CardBody>
                      <h4 className="font-semibold text-foreground mb-2">{faq.q}</h4>
                      <p className="text-muted-foreground">{faq.a}</p>
                    </CardBody>
                  </Card>
                ))}
              </div>
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
