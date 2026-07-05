import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Mail, MessageSquare, Send, ArrowLeft, CheckCircle } from 'lucide-react';
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

export default function Contact() {
  const { isDark, toggleDarkMode } = useDarkMode();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Le message est requis';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Le message doit contenir au moins 10 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

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
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <MessageSquare className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">Contactez-nous</h1>
            <p className="text-xl text-muted-foreground">
              Une question ? Une suggestion ? N'hésitez pas à nous contacter
            </p>
          </div>

          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-500 font-medium">
                Merci pour votre message ! Nous vous répondrons dans les plus brefs délais.
              </p>
            </motion.div>
          )}

          <Card>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                      errors.name ? 'border-red-500' : 'border-border'
                    }`}
                    placeholder="Votre nom"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                      errors.email ? 'border-red-500' : 'border-border'
                    }`}
                    placeholder="votre@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className={`w-full px-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none ${
                      errors.message ? 'border-red-500' : 'border-border'
                    }`}
                    placeholder="Votre message..."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Envoyer le message
                </button>
              </form>
            </CardBody>
          </Card>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <span>Ou envoyez-nous un email à <a href="mailto:contact@bibliotech.com" className="text-primary hover:underline">contact@bibliotech.com</a></span>
            </div>
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
