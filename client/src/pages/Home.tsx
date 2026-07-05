import React, { useState, useEffect } from 'react';
const bannerImage = '/image.png';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  BookOpen, ArrowRight, Star, Sparkles, WifiOff, Brain, Highlighter,
  Smartphone, Clock, Search, BookMarked, Shield, Headphones,
  CheckCircle2, ChevronRight, Zap, GraduationCap, Users,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BookCoverPlaceholder } from '@/components/features/BookCoverPlaceholder';
import { useDarkMode } from '@/hooks/useDarkMode';
import { BiblioTechLogo } from '@/components/brand/BiblioTechLogo';
import { fetchPublishedBooks } from '@/services/booksSupabase';
import type { GoogleBook } from '@/services/googleBooksService';

/* ── Animations ── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

/* ── Data ── */

const TOP_FEATURES = [
  {
    icon: WifiOff,
    title: 'Lecture hors-ligne',
    desc: 'Télécharge tes livres et lis dans le bus, en cours ou à la maison — même sans Wi-Fi.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Brain,
    title: 'BibliAI, ton tuteur IA',
    desc: 'Pose n\'importe quelle question sur le livre que tu lis. Résumés, quiz, explications — en français.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Highlighter,
    title: 'Notes & surlignage',
    desc: 'Surligne, annote, et retrouve tes notes synchronisées sur tous tes appareils.',
    color: 'from-amber-500 to-orange-600',
  },
];

const PLANS = [
  {
    name: 'Gratuit',
    price: '0',
    period: '',
    features: ['3 emprunts / mois', 'Lecture en ligne', '5 livres offline', 'BibliAI limité'],
    cta: 'Commencer gratuitement',
    popular: false,
    gradient: 'from-gray-600 to-gray-700',
  },
  {
    name: 'Étudiant',
    price: '2 000',
    period: '/ mois',
    features: ['Emprunts illimités', 'PDF téléchargeables', '15 livres offline', 'BibliAI illimité', 'Notes & surlignage'],
    cta: 'Essai gratuit 7 jours',
    popular: true,
    gradient: 'from-[#1B7A3D] to-emerald-600',
  },
  {
    name: 'Premium',
    price: '3 500',
    period: '/ mois',
    features: ['Tout Étudiant +', 'Audiobooks illimités', 'Offline illimité', 'Qualité audio HD', 'Badge Premium'],
    cta: 'Essai gratuit 7 jours',
    popular: false,
    gradient: 'from-violet-600 to-purple-700',
  },
];



export default function Home() {
  const { isDark, toggleDarkMode } = useDarkMode();
  const [isAuthenticated] = useState(false);
  const [previewBooks, setPreviewBooks] = useState<GoogleBook[]>([]);

  useEffect(() => {
    fetchPublishedBooks()
      .then(books => setPreviewBooks(books.slice(0, 6)))
      .catch(() => setPreviewBooks([]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar isDark={isDark} onThemeToggle={toggleDarkMode} isAuthenticated={isAuthenticated} />

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-20 pb-28 sm:pt-28 sm:pb-40 bg-black">
        {/* Background */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1.02 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bannerImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/85" />
        </motion.div>

        {/* Accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="container relative z-10">
          <motion.div className="max-w-3xl mx-auto text-center" variants={stagger} initial="hidden" animate="visible">
            {/* Badge */}
            <motion.div variants={fadeUp} className="mb-5 flex justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Un vaste catalogue de livres numériques
              </span>
            </motion.div>

            {/* Titre principal */}
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-5 leading-[1.1] tracking-tight">
              Tes livres, partout.{' '}
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Même sans internet.
              </span>
            </motion.h1>

            {/* Sous-titre */}
            <motion.p variants={fadeUp} className="text-base sm:text-lg text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
              La bibliothèque numérique accessible à tous, partout dans le monde.
              Informatique, Développement Personnel, Littérature Africaine et bien plus encore.
            </motion.p>

            {/* CTA */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <a className="group px-8 py-3.5 bg-gradient-to-r from-[#1B7A3D] to-emerald-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.03] inline-flex items-center justify-center gap-2 text-base">
                  🚀 Essai gratuit 7 jours
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Link>
              <Link href="/login">
                <a className="px-8 py-3.5 border border-white/25 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300 inline-flex items-center justify-center text-base backdrop-blur-sm">
                  Se connecter
                </a>
              </Link>
            </motion.div>

            {/* Stats Hero */}
            <motion.div variants={fadeUp} className="mt-14 grid grid-cols-3 gap-4 sm:gap-8">
              {[
                { icon: BookOpen, label: 'Vaste catalogue', sub: 'Livres numériques' },
                { icon: WifiOff, label: 'Lecture offline', sub: 'Sans internet' },
                { icon: Brain, label: 'IA tuteur', sub: 'BibliAI inclus' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 backdrop-blur-sm mb-2">
                    <s.icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-white">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.sub}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>



      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — TOP 3 FEATURES
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-muted/30 relative overflow-hidden">
        <div className="container relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
              Fonctionnalités <span className="text-violet-600 dark:text-violet-400">principales</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tout ce dont tu as besoin pour une expérience de lecture complète
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {TOP_FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className="group">
                <div className="h-full p-8 rounded-2xl bg-card border-2 border-border/60 hover:border-violet-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-violet-500/5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>



      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — CATALOGUE PREVIEW
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-muted/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="container relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
              Explorez une collection <span className="text-primary">d'exception</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Accédez à un vaste catalogue d'ouvrages soigneusement sélectionnés. Inscrivez-vous pour débloquer l'accès complet.
            </motion.p>
          </motion.div>

          {/* Grille de livres */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {previewBooks.length > 0
              ? previewBooks.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                >
                  <Link href="/register">
                    <a className="group block">
                      <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-border group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/10 transition-all duration-500 relative bg-muted group-hover:scale-[1.03]">
                        <BookCoverPlaceholder title={book.title} author={book.authors[0]} id={book.id} category={book.category} />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-3 text-center backdrop-blur-sm">
                          <BookOpen className="w-5 h-5 text-white mb-2" />
                          <p className="text-white text-xs font-bold leading-tight">{book.title}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-foreground">{(book.rating || 0).toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto truncate">{book.category}</span>
                      </div>
                    </a>
                  </Link>
                </motion.div>
              ))
              : Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
              ))
            }
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 text-center"
          >
            <Link href="/register">
              <a className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.03] transition-all duration-300">
                Découvrir tout le catalogue
                <ArrowRight className="w-5 h-5" />
              </a>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — COMMENT ÇA MARCHE
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="container">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-3xl sm:text-5xl font-extrabold text-foreground mb-14 text-center"
          >
            Comment ça marche
          </motion.h2>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            {[
              {
                step: '01',
                icon: Smartphone,
                title: 'Inscris-toi gratuitement',
                desc: 'En 10 secondes. Pas de carte bancaire, juste ton email.',
                color: 'text-emerald-500',
              },
              {
                step: '02',
                icon: BookMarked,
                title: 'Choisis ton abonnement',
                desc: 'Gratuit, Étudiant (2 000F) ou Premium (3 500F). Essai 7 jours offert.',
                color: 'text-violet-500',
              },
              {
                step: '03',
                icon: Headphones,
                title: 'Lis et écoute partout',
                desc: 'Sur ton téléphone, même sans internet. Avec BibliAI pour t\'aider.',
                color: 'text-amber-500',
              },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeUp}>
                <div className="text-center">
                  <div className={`text-6xl font-extrabold ${item.color} opacity-20 mb-3`}>{item.step}</div>
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-4`}>
                    <item.icon className={`w-7 h-7 ${item.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — SOCIAL PROOF
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-6">
              <GraduationCap className="w-6 h-6 text-primary" />
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Pensé pour faciliter votre quotidien
              </span>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { quote: "Enfin une app qui marche sans internet ! Je lis dans le Dem Dikk maintenant.", name: "Fatou D.", univ: "UCAD — Info L2", emoji: "👩🏾‍💻" },
                { quote: "BibliAI m'a aidé à comprendre le droit constitutionnel en 10 minutes. Incroyable.", name: "Moussa N.", univ: "UGB — Droit L3", emoji: "👨🏾‍⚖️" },
                { quote: "L'abonnement est tellement rentable comparé au prix des livres. Je suis abonnée depuis le jour 1.", name: "Aminata S.", univ: "ESP — Gestion M1", emoji: "👩🏾‍💼" },
              ].map((t) => (
                <div key={t.name} className="p-5 rounded-2xl bg-card border border-border/60 text-left">
                  <span className="text-2xl mb-3 block">{t.emoji}</span>
                  <p className="text-sm text-foreground italic mb-3">"{t.quote}"</p>
                  <p className="text-xs font-bold text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.univ}</p>
                </div>
              ))}
            </motion.div>


          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — CTA FINAL
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[#1B7A3D] via-emerald-600 to-teal-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-0 w-72 h-72 bg-white/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/10 rounded-full blur-[100px]" />
        </div>
        <div className="container relative z-10">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-extrabold mb-5">
              7 jours gratuits.
              <br />
              Annule quand tu veux.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-white/80 mb-8 max-w-lg mx-auto">
              Pas de carte bancaire. Paye avec Wave si tu continues. Rejoins les premiers étudiants sénégalais sur BiblioTech.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <a className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-[#1B7A3D] font-extrabold rounded-xl hover:shadow-2xl hover:shadow-black/20 hover:scale-[1.03] transition-all duration-300 text-lg">
                  🚀 Commencer mon essai gratuit
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-4 text-sm text-white/50">
              Déjà membre ? <Link href="/login"><a className="text-white underline hover:text-white/90">Se connecter</a></Link>
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — TARIFS
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] -ml-48" />
        <div className="container relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-extrabold text-foreground mb-4">
              Choisissez votre <span className="text-[#1B7A3D]">abonnement</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-xl mx-auto">
              Un plan pour chaque besoin. Paiement simple via Wave ou Orange Money.
            </motion.p>
          </motion.div>

          {/* Plans tarifaires */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {PLANS.map((plan) => (
              <motion.div key={plan.name} variants={fadeUp} className="relative">
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-4 py-1 rounded-full bg-gradient-to-r from-[#1B7A3D] to-emerald-600 text-white text-xs font-bold shadow-lg">
                      ⭐ Le plus choisi
                    </span>
                  </div>
                )}
                <div className={`h-full rounded-2xl p-7 transition-all duration-300 ${
                  plan.popular
                    ? 'bg-card border-2 border-[#1B7A3D] shadow-xl shadow-emerald-500/10 scale-[1.03]'
                    : 'bg-card border-2 border-border/60 hover:border-border'
                }`}>
                  <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">FCFA {plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <a className={`block w-full py-3 rounded-xl text-center font-bold text-sm transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-[#1B7A3D] to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/20'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}>
                      {plan.cta}
                    </a>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Réassurance */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
          >
            {[
              { icon: Shield, text: 'Paiement sécurisé' },
              { icon: Clock, text: 'Annulation à tout moment' },
              { icon: Zap, text: 'Activation instantanée' },
            ].map((r) => (
              <span key={r.text} className="flex items-center gap-1.5">
                <r.icon className="w-3.5 h-3.5" /> {r.text}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <BiblioTechLogo size="sm" className="mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                La bibliothèque numérique accessible à tous, partout dans le monde.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features"><a className="hover:text-foreground transition-colors">Fonctionnalités</a></Link></li>
                <li><Link href="/pricing"><a className="hover:text-foreground transition-colors">Tarifs</a></Link></li>
                <li><Link href="/security"><a className="hover:text-foreground transition-colors">Sécurité</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about"><a className="hover:text-foreground transition-colors">À propos</a></Link></li>
                <li><Link href="/blog"><a className="hover:text-foreground transition-colors">Blog</a></Link></li>
                <li><Link href="/contact"><a className="hover:text-foreground transition-colors">Contact</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy"><a className="hover:text-foreground transition-colors">Confidentialité</a></Link></li>
                <li><Link href="/terms"><a className="hover:text-foreground transition-colors">Conditions</a></Link></li>
                <li><Link href="/cookies"><a className="hover:text-foreground transition-colors">Cookies</a></Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 BiblioTech. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
