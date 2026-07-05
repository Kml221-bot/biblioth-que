import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, BookOpen, MessageSquare, Brain, Zap, Heart } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { AIChat } from '@/components/ai/AIChat';
import { getPersonalizedRecommendations } from '@/services/aiService';
import { BookCoverPlaceholder } from '@/components/features/BookCoverPlaceholder';

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
    icon: Brain,
    title: 'IA Intelligente',
    desc: 'Réponses contextuelles et personnalisées',
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    icon: Sparkles,
    title: 'Recommandations',
    desc: '"Parce que vous aimez X → voici Y"',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: MessageSquare,
    title: 'Historique',
    desc: 'Vos conversations sont sauvegardées',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Zap,
    title: 'Questions rapides',
    desc: 'Boutons d\'accès rapide intégrés',
    gradient: 'from-amber-500 to-orange-500',
  },
];

export default function AIPage() {
  const personalizedRecs = getPersonalizedRecommendations();
  const params = new URLSearchParams(window.location.search);
  const bookIdFromUrl = params.get('bookId') || undefined;

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-2">
                BibliAI
                <span className="ai-badge-pro" style={{ fontSize: '11px', padding: '2px 8px' }}>IA</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Votre assistant intelligent pour découvrir des livres
              </p>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          variants={containerVariants}
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={itemVariants}>
              <Card>
                <CardBody className="flex items-center gap-3 py-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <f.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{f.desc}</p>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface — Main */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <Card className="overflow-hidden">
              <AIChat bookId={bookIdFromUrl} />
            </Card>
          </motion.div>

          {/* Sidebar — Personnalisation */}
          <motion.div variants={itemVariants} className="space-y-4">
            {/* Recommandations personnalisées sidebar */}
            {personalizedRecs.length > 0 && (
              <Card>
                <CardBody>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    Pour vous
                  </h3>
                  <div className="space-y-3">
                    {personalizedRecs.slice(0, 3).map((rec) => (
                      <div key={String(rec.book.id)} className="group cursor-pointer">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                          <span className="text-rose-400">♥</span> Parce que vous aimez <strong className="text-foreground">{rec.because}</strong>
                        </p>
                        <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                          <div className="w-8 h-11 rounded flex-shrink-0 overflow-hidden bg-muted">
                            <BookCoverPlaceholder title={rec.book.title} author={rec.book.author} id={String(rec.book.id)} variant="sm" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{rec.book.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{rec.book.author}</p>
                            <p className="text-[10px] text-purple-500 italic mt-0.5 line-clamp-1">{rec.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Info Card */}
            <Card>
              <CardBody>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Astuces
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Posez des questions en <strong className="text-foreground">wolof, français ou pular</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Utilisez le bouton <strong className="text-foreground">⚡ Questions rapides</strong> pour un accès direct</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Demandez des <strong className="text-foreground">recommandations personnalisées</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Cliquez <strong className="text-foreground">🤟</strong> pour le clavier pictogrammes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Votre <strong className="text-foreground">historique est conservé</strong> entre vos sessions</span>
                  </li>
                </ul>
              </CardBody>
            </Card>

            {/* Powered by */}
            <div className="text-center py-3">
              <p className="text-[10px] text-muted-foreground">
                Propulsé par <span className="font-semibold text-purple-500">BibliAI</span>
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Intelligence artificielle au service de la lecture 📚
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
