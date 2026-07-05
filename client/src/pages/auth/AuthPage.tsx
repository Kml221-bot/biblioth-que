import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Check, ArrowLeft, BookOpen, Brain, BarChart3, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { bookCategories } from '@/data/booksData';
import type { LoginCredentials, RegisterData } from '@/contexts/AuthContext';
import { BiblioTechLogo, BiblioTechMark } from '@/components/brand/BiblioTechLogo';

const fadeSlide = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

/* ── Branding features ────────────────────────────────────────── */
const features = [
  { icon: Search, title: 'CATALOGUE', desc: 'Trouvez rapidement le livre qu\'il vous faut' },
  { icon: BookOpen, title: 'GESTION', desc: 'Empruntez, réservez et suivez vos activités' },
  { icon: Brain, title: 'IA INTÉGRÉE', desc: 'BiblioAI vous accompagne à chaque étape' },
  { icon: BarChart3, title: 'TABLEAU DE BORD', desc: 'Suivez les statistiques et activités' },
];

/* ── Left Branding Panel (reused in both pages) ───────────────── */
export function AuthBrandingPanel() {
  return (
    <>
      {/* Desktop: left column */}
      <div className="auth-brand-panel">
        <img src="/auth-bg-dark.png" alt="" className="auth-brand-bg" fetchPriority="high" decoding="async" />
        <div className="auth-brand-overlay" />
        <div className="auth-brand-content">
          <div className="auth-brand-top">
            <div className="auth-brand-logo">
              <BiblioTechMark className="h-9 w-9" />
            </div>
            <h2 className="auth-brand-title">
              Biblio<span style={{ color: '#1B7A3D' }}>Tech</span>
            </h2>
            <p className="auth-brand-tagline">La bibliothèque de demain,<br /><span style={{ color: '#34d399' }}>au service de tous.</span></p>
            <p className="auth-brand-desc">Gérez, explorez et vivez la lecture autrement avec une solution intelligente et innovante.</p>
          </div>
          <div className="auth-brand-features">
            {features.map((f) => (
              <div key={f.title} className="auth-brand-feature">
                <div className="auth-brand-feature-icon"><f.icon className="w-5 h-5" /></div>
                <div>
                  <p className="auth-brand-feature-title">{f.title}</p>
                  <p className="auth-brand-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Mobile: top banner */}
      <div className="auth-brand-mobile">
        <img src="/auth-bg.png" alt="" className="auth-brand-mobile-bg" fetchPriority="high" decoding="async" />
        <div className="auth-brand-mobile-overlay" />
        <div className="auth-brand-mobile-content">
          <BiblioTechLogo size="sm" variant="light" />
          <p className="text-white/80 text-sm mt-1">La bibliothèque de demain, au service de tous.</p>
        </div>
      </div>
    </>
  );
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, loginWithGoogle, isLoading, error: authError, clearError } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginData, setLoginData] = useState<LoginCredentials>({ email: '', password: '', rememberMe: false });

  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showConfPwd, setShowConfPwd] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regData, setRegData] = useState<RegisterData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    preferredCategories: [],
  });

  const validateLogin = () => {
    const e: Record<string, string> = {};
    if (!loginData.email) e.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.email)) e.email = 'Email invalide';
    if (!loginData.password) e.password = 'Le mot de passe est requis';
    else if (loginData.password.length < 6) e.password = 'Au moins 6 caractères';
    setLoginErrors(e);
    return !Object.keys(e).length;
  };

  const validateRegister = () => {
    const e: Record<string, string> = {};
    if (!regData.firstName.trim()) e.firstName = 'Requis';
    if (!regData.lastName.trim()) e.lastName = 'Requis';
    if (!regData.email) e.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regData.email)) e.email = 'Email invalide';
    if (!regData.password) e.password = 'Requis';
    else if (regData.password.length < 8) e.password = 'Au moins 8 caractères';
    if (regData.password !== regData.confirmPassword) e.confirmPassword = 'Ne correspond pas';
    if (regData.preferredCategories.length !== 3) e.preferredCategories = 'Choisis exactement 3 genres';
    if (!regData.agreeToTerms) e.agreeToTerms = 'Requis';
    setRegErrors(e);
    return !Object.keys(e).length;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    try { await login(loginData); showToast('Connexion réussie !', 'success'); setLocation('/dashboard'); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Erreur', 'error'); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;
    try { await register(regData); showToast('Inscription réussie !', 'success'); setLocation('/dashboard'); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Erreur', 'error'); }
  };

  const onLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (authError) clearError();
    const { name, value, type, checked } = e.target;
    setLoginData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    if (loginErrors[name]) setLoginErrors(p => ({ ...p, [name]: '' }));
  };

  const onRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setRegData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    if (regErrors[name]) setRegErrors(p => ({ ...p, [name]: '' }));
  };

  const togglePreferredCategory = (category: string) => {
    setRegData(prev => {
      const selected = prev.preferredCategories.includes(category);
      if (selected) {
        return { ...prev, preferredCategories: prev.preferredCategories.filter(item => item !== category) };
      }
      if (prev.preferredCategories.length >= 3) return prev;
      return { ...prev, preferredCategories: [...prev.preferredCategories, category] };
    });
    if (regErrors.preferredCategories) setRegErrors(p => ({ ...p, preferredCategories: '' }));
  };

  const switchTab = (t: 'login' | 'register') => { if (authError) clearError(); setActiveTab(t); };

  const inp = (err: boolean) => `w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 bg-white ${err ? 'border-red-400' : 'border-gray-200 hover:border-[#1B7A3D]/40'}`;
  const inpR = (err: boolean) => `w-full pl-10 pr-10 py-3 rounded-xl border text-sm text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 bg-white ${err ? 'border-red-400' : 'border-gray-200 hover:border-[#1B7A3D]/40'}`;
  const pwdStr = regData.password ? (regData.password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(regData.password) ? 1 : 0) + (/[0-9]/.test(regData.password) ? 1 : 0) : 0;

  return (
    <div className="auth-page-root">
      <AuthBrandingPanel />

      {/* ── RIGHT: Form panel ── */}
      <div className="auth-right-panel">
        <motion.div className="auth-form-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div className="auth-card">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenue sur BiblioTech 👋</h1>
              <p className="text-sm text-gray-500">Connectez-vous pour accéder à votre espace personnel</p>
            </div>

            <div className="auth-tabs">
              <button type="button" onClick={() => switchTab('login')} className={`auth-tab ${activeTab === 'login' ? 'auth-tab-active' : ''}`}><User className="w-4 h-4" /> Connexion</button>
              <button type="button" onClick={() => switchTab('register')} className={`auth-tab ${activeTab === 'register' ? 'auth-tab-active' : ''}`}><User className="w-4 h-4" /> Inscription</button>
            </div>

            {authError && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{authError}</div>}

            <AnimatePresence mode="wait">
              {activeTab === 'login' ? (
                <motion.form key="login" variants={fadeSlide} initial="hidden" animate="visible" exit="exit" onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="auth-label">Email ou nom d'utilisateur</label>
                    <div className="relative"><User className="auth-input-icon" /><input id="login-email" type="email" name="email" value={loginData.email} onChange={onLoginChange} placeholder="Entrez votre email ou nom d'utilisateur" className={inp(!!loginErrors.email)} /></div>
                    {loginErrors.email && <p className="text-xs text-red-500 mt-1">{loginErrors.email}</p>}
                  </div>
                  <div>
                    <label className="auth-label">Mot de passe</label>
                    <div className="relative"><Lock className="auth-input-icon" /><input id="login-password" type={showPassword ? 'text' : 'password'} name="password" value={loginData.password} onChange={onLoginChange} placeholder="Entrez votre mot de passe" className={inpR(!!loginErrors.password)} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-eye-btn">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                    {loginErrors.password && <p className="text-xs text-red-500 mt-1">{loginErrors.password}</p>}
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="rememberMe" checked={loginData.rememberMe} onChange={onLoginChange} className="w-4 h-4 rounded border-gray-300 accent-[#1B7A3D]" /><span className="text-sm text-gray-500">Se souvenir de moi</span></label>
                    <Link href="/reset-password" className="text-sm text-[#1B7A3D] font-medium hover:underline">Mot de passe oublié ?</Link>
                  </div>
                  <button type="submit" disabled={isLoading} className="auth-submit-btn">
                    {isLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Connexion…</> : <><User className="w-4 h-4" /> Se connecter</>}
                  </button>
                  <div className="auth-divider"><span>ou continuer avec</span></div>
                  <div className="grid grid-cols-1 gap-3">
                    <button type="button" onClick={() => loginWithGoogle()} className="auth-social-btn"><svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continuer avec Google</button>
                  </div>
                </motion.form>
              ) : (
                <motion.form key="register" variants={fadeSlide} initial="hidden" animate="visible" exit="exit" onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="auth-label">Prénom</label><div className="relative"><User className="auth-input-icon" /><input type="text" name="firstName" value={regData.firstName} onChange={onRegChange} placeholder="Prénom" className={inp(!!regErrors.firstName)} /></div>{regErrors.firstName && <p className="text-xs text-red-500 mt-1">{regErrors.firstName}</p>}</div>
                    <div><label className="auth-label">Nom</label><div className="relative"><User className="auth-input-icon" /><input type="text" name="lastName" value={regData.lastName} onChange={onRegChange} placeholder="Nom" className={inp(!!regErrors.lastName)} /></div>{regErrors.lastName && <p className="text-xs text-red-500 mt-1">{regErrors.lastName}</p>}</div>
                  </div>
                  <div><label className="auth-label">Email</label><div className="relative"><Mail className="auth-input-icon" /><input type="email" name="email" value={regData.email} onChange={onRegChange} placeholder="vous@exemple.com" className={inp(!!regErrors.email)} /></div>{regErrors.email && <p className="text-xs text-red-500 mt-1">{regErrors.email}</p>}</div>
                  <div><label className="auth-label">Mot de passe</label><div className="relative"><Lock className="auth-input-icon" /><input type={showRegPwd ? 'text' : 'password'} name="password" value={regData.password} onChange={onRegChange} placeholder="••••••••" className={inpR(!!regErrors.password)} /><button type="button" onClick={() => setShowRegPwd(!showRegPwd)} className="auth-eye-btn">{showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{regErrors.password && <p className="text-xs text-red-500 mt-1">{regErrors.password}</p>}{regData.password && <div className="mt-2 flex gap-1">{[0,1,2].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i < pwdStr ? 'bg-[#1B7A3D]' : 'bg-gray-200'}`} />)}</div>}</div>
                  <div><label className="auth-label">Confirmer</label><div className="relative"><Lock className="auth-input-icon" /><input type={showConfPwd ? 'text' : 'password'} name="confirmPassword" value={regData.confirmPassword} onChange={onRegChange} placeholder="••••••••" className={inpR(!!regErrors.confirmPassword)} /><button type="button" onClick={() => setShowConfPwd(!showConfPwd)} className="auth-eye-btn">{showConfPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{regErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{regErrors.confirmPassword}</p>}</div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="auth-label mb-0">Genres préférés</label>
                      <span className="text-xs text-gray-400">{regData.preferredCategories.length}/3</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {bookCategories.map(category => {
                        const selected = regData.preferredCategories.includes(category.label);
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => togglePreferredCategory(category.label)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all ${
                              selected
                                ? 'border-[#1B7A3D] bg-[#1B7A3D]/10 text-[#1B7A3D]'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-[#1B7A3D]/40'
                            }`}
                          >
                            <span>{category.emoji}</span>
                            <span>{category.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {regErrors.preferredCategories && <p className="text-xs text-red-500 mt-1">{regErrors.preferredCategories}</p>}
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" name="agreeToTerms" checked={regData.agreeToTerms} onChange={onRegChange} className="w-4 h-4 rounded border-gray-300 accent-[#1B7A3D] mt-0.5" /><span className="text-xs text-gray-500">J'accepte les <Link href="/terms" className="text-[#1B7A3D] hover:underline">conditions</Link> et la <Link href="/privacy" className="text-[#1B7A3D] hover:underline">politique de confidentialité</Link></span></label>
                  <button type="submit" disabled={isLoading} className="auth-submit-btn">{isLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Inscription…</> : <><Check className="w-4 h-4" /> S'inscrire</>}</button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex gap-2">
                <span className="text-[#1B7A3D] text-2xl font-serif leading-none select-none">"</span>
                <div><p className="text-sm text-gray-600 italic">Un livre est un jardin que l'on porte dans sa poche.</p><p className="text-xs text-gray-400 mt-1">— Proverbe arabe</p></div>
              </div>
            </div>
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
