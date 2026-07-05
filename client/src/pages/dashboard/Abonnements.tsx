import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Star, Zap, BookOpen, Download, Infinity, Users, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  isPopular?: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    price: '0',
    period: 'toujours',
    description: 'Pour découvrir BiblioTech',
    icon: <BookOpen className="w-6 h-6" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
    features: [
      '3 premiers chapitres gratuits par livre',
      'Accès au catalogue complet',
      'BibliAI (5 questions/jour)',
      'Quiz et recommandations',
      'Marketplace',
    ],
  },
  {
    id: 'student',
    name: 'Étudiant',
    price: '2 000',
    period: 'mois',
    description: 'Pour les étudiants actifs',
    icon: <Star className="w-6 h-6" />,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/30',
    isPopular: true,
    badge: 'Le plus choisi',
    features: [
      'Tout le plan Gratuit',
      'Accès illimité aux livres Étudiant',
      '50 BiblioCoins offerts/mois',
      'BibliAI illimité',
      'Téléchargement de 5 livres/mois',
      'Classement & badges exclusifs',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '3 500',
    period: 'mois',
    description: 'Accès total sans limite',
    icon: <Crown className="w-6 h-6" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/30',
    badge: 'Pack Plus',
    features: [
      'Tout le plan Étudiant',
      'Accès illimité à TOUT le catalogue',
      '200 BiblioCoins offerts/mois',
      'Téléchargement illimité hors-ligne',
      'Accès prioritaire aux nouveautés',
      'Support prioritaire',
      'Badge Premium exclusif',
    ],
  },
  {
    id: 'school',
    name: 'Établissement',
    price: 'Sur devis',
    period: '',
    description: 'Pour les écoles et universités',
    icon: <Users className="w-6 h-6" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/30',
    features: [
      'Accès multi-utilisateurs',
      'Tableau de bord administrateur',
      'Catalogue personnalisé par filière',
      'Statistiques de lecture',
      'Intégration LMS',
      'Support dédié',
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Abonnements() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch('/api/subscriptions/current', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setCurrentPlan(json.data?.plan ?? 'free');
        }
      } catch { /* silencieux */ }
    };
    fetchCurrentPlan();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (planId === 'school') {
      window.open('mailto:contact@bibliotech.sn?subject=Abonnement Établissement', '_blank');
      return;
    }
    if (planId === currentPlan) return;

    setSubscribing(planId);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        window.location.href = '/login';
        return;
      }

      // Rafraîchir si le token expire dans moins de 60 secondes
      const expiresAt = session.expires_at ?? 0;
      const now = Math.floor(Date.now() / 1000);
      let accessToken = session.access_token;
      if (expiresAt - now < 60) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session?.access_token) {
          accessToken = refreshed.session.access_token;
        }
      }

      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ planId }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.message || json.data?.message || 'Erreur lors de la souscription');
        return;
      }

      // Si Naboopay retourne une URL de paiement → rediriger
      const paymentUrl = json.paymentUrl ?? json.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      // Activation immédiate (sandbox / plan gratuit)
      setSuccess(planId);
      setCurrentPlan(planId);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      alert('Erreur réseau. Réessaie dans un moment.');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* En-tête */}
        <motion.div variants={itemVariants} className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Zap className="w-3.5 h-3.5" />
            Abonnements BiblioTech
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Choisissez votre plan
          </h1>
          <p className="text-muted-foreground">
            Accédez à des milliers de livres numériques. Commencez gratuitement,
            évoluez quand vous voulez.
          </p>
        </motion.div>

        {/* Plans */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"
        >
          {PLANS.map(plan => {
            const isActive = currentPlan === plan.id;
            const isBuying = subscribing === plan.id;
            const isDone = success === plan.id;

            return (
              <motion.div
                key={plan.id}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all ${plan.bgColor} ${plan.borderColor} ${
                  plan.isPopular ? 'shadow-xl shadow-primary/10' : ''
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${
                    plan.id === 'student' ? 'bg-primary text-primary-foreground' : 'bg-amber-500 text-white'
                  }`}>
                    {plan.badge}
                  </span>
                )}

                {/* Icône + Nom */}
                <div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${plan.bgColor} border ${plan.borderColor}`}>
                    <span className={plan.color}>{plan.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                </div>

                {/* Prix */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground">
                        {plan.price !== 'Sur devis' ? 'FCFA/' : ''}{plan.period}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.color}`} />
                      <span className="text-sm text-muted-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isActive || isBuying}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-muted text-muted-foreground cursor-default'
                      : isDone
                        ? 'bg-green-500 text-white'
                        : plan.id === 'student'
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
                          : plan.id === 'premium'
                            ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20'
                            : 'bg-card border border-border text-foreground hover:border-primary/30'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isBuying ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : isActive ? (
                    <><Check className="w-4 h-4" /> Plan actuel</>
                  ) : isDone ? (
                    <><Check className="w-4 h-4" /> Souscrit !</>
                  ) : plan.id === 'school' ? (
                    'Nous contacter'
                  ) : (
                    `Choisir ${plan.name}`
                  )}
                </button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Note paiement */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border"
        >
          <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Paiement sécurisé via <strong>Wave</strong> ou <strong>Orange Money</strong>.
            Résiliation possible à tout moment depuis votre profil.
            Les abonnements se renouvellent automatiquement.
          </p>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
