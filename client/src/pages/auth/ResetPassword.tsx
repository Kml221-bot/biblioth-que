import React, { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { AuthBrandingPanel } from './AuthPage';

type Step = 'email' | 'success';

export default function ResetPassword() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError("L'email est requis"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email invalide'); return; }
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('success');
      showToast('Email de réinitialisation envoyé !', 'success');
    } catch { setError("Erreur lors de l'envoi"); showToast("Erreur lors de l'envoi", 'error'); }
    finally { setIsLoading(false); }
  };

  const inp = (hasErr: boolean) => `w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 bg-white ${hasErr ? 'border-red-400' : 'border-gray-200 hover:border-[#1B7A3D]/40'}`;

  return (
    <div className="auth-page-root">
      <AuthBrandingPanel />

      <div className="auth-right-panel">
        <motion.div className="auth-form-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div className="auth-card">
            {step === 'email' ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#1B7A3D]/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-[#1B7A3D]" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Réinitialiser le mot de passe</h1>
                  <p className="text-sm text-gray-500">Entrez votre email pour recevoir les instructions</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="auth-label">Adresse email</label>
                    <div className="relative">
                      <Mail className="auth-input-icon" />
                      <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="vous@exemple.com" className={inp(!!error)} />
                    </div>
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                  </div>

                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">Nous vous enverrons un email avec un lien pour réinitialiser votre mot de passe.</p>
                  </div>

                  <button type="submit" disabled={isLoading} className="auth-submit-btn">
                    {isLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Envoi en cours…</> : 'Envoyer les instructions'}
                  </button>

                  <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-[#1B7A3D] font-medium hover:underline transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                  </Link>
                </form>
              </>
            ) : (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Email envoyé avec succès !</h2>
                  <p className="text-gray-500">Vérifiez votre email <span className="font-semibold text-gray-900">{email}</span> pour les instructions de réinitialisation.</p>
                </div>
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <p className="text-sm text-amber-800"><strong>Conseil :</strong> Vérifiez votre dossier spam si vous ne voyez pas l'email dans les prochaines minutes.</p>
                </div>
                <Link href="/login" className="auth-submit-btn" style={{ display: 'flex' }}>Retour à la connexion</Link>
                <button onClick={() => { setStep('email'); setEmail(''); }} className="text-sm text-[#1B7A3D] hover:underline">Utiliser une autre adresse email</button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-5 px-1">
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} BiblioTech</p>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B7A3D] transition-all group"><ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Accueil</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
