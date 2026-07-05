// ============================================================
// BiblioTech — Contexte d'authentification (Supabase Auth)
// Gère inscription, connexion, déconnexion, sessions
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Profile, SubscriptionPlan } from '@/types/database';

// ── Types ────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  memberSince: Date;
  isActive: boolean;
  role: 'user' | 'author' | 'admin' | 'super_admin';
  plan: SubscriptionPlan;
  walletBalance: number;
  whatsappNumber?: string;
  filiere?: string;
  niveauAcademique?: string;
  universite?: string;
  referralCode?: string;
  preferredCategories: string[];
  trialEndsAt?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  preferredCategories: string[];
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 15000;
const PROFILE_TIMEOUT_MS = 8000;
const CURRENT_USER_KEY = 'bibliotech:currentUserId';

class TimeoutError extends Error {
  constructor(message = "La requete a pris trop de temps. Verifie ta connexion internet puis reessaie.") {
    super(message);
    this.name = "TimeoutError";
  }
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message?: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timeoutId));
}

function ensureSupabaseConfigured() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error("Configuration Supabase manquante. Verifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.");
  }
}

function getFallbackRole(authUser: { email?: string; user_metadata?: Record<string, unknown> }): AppUser['role'] {
  const metadataRole = authUser.user_metadata?.role;
  if (
    metadataRole === 'user' ||
    metadataRole === 'author' ||
    metadataRole === 'admin' ||
    metadataRole === 'super_admin'
  ) {
    return metadataRole;
  }
  // Le rôle admin est déterminé uniquement par le champ `role` de la table profiles Supabase
  // (jamais par une variable d'environnement exposée dans le bundle JS)
  return 'user';
}

// ── Helpers ──────────────────────────────────────────────────

/** Transforme un profil Supabase en AppUser */
function profileToAppUser(profile: Profile): AppUser {
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatar: profile.avatar_url || undefined,
    memberSince: new Date(profile.created_at),
    isActive: profile.is_active,
    role: profile.role,
    plan: profile.plan,
    walletBalance: profile.wallet_balance,
    whatsappNumber: profile.whatsapp_number || undefined,
    filiere: profile.filiere || undefined,
    niveauAcademique: profile.niveau_academique || undefined,
    universite: profile.universite || undefined,
    referralCode: profile.referral_code || undefined,
    preferredCategories: profile.preferred_categories || [],
    trialEndsAt: profile.trial_ends_at ? new Date(profile.trial_ends_at) : undefined,
  };
}

/** Récupère le profil depuis la table profiles */
async function fetchProfile(userId: string): Promise<AppUser | null> {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      PROFILE_TIMEOUT_MS,
      "Connexion au profil trop lente. Le profil sera charge plus tard."
    );

    if (error || !data) {
      console.error('Erreur récupération profil:', error?.message);
      return null;
    }

    return profileToAppUser(data as Profile);
  } catch (err) {
    console.warn('Profil indisponible, fallback vers Supabase Auth:', err);
    return null;
  }
}

/** Crée un AppUser minimal depuis les données auth Supabase */
function authUserToAppUser(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string }): AppUser {
  return {
    id: authUser.id,
    email: authUser.email || '',
    firstName: (authUser.user_metadata?.first_name as string) || '',
    lastName: (authUser.user_metadata?.last_name as string) || '',
    memberSince: new Date(authUser.created_at || Date.now()),
    isActive: true,
    role: getFallbackRole(authUser),
    plan: 'free',
    walletBalance: 0,
    preferredCategories: Array.isArray(authUser.user_metadata?.preferred_categories)
      ? authUser.user_metadata?.preferred_categories as string[]
      : [],
  };
}

// ── Provider ─────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Initialisation : récupérer la session existante ────────
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        ensureSupabaseConfigured();
        const { data: { session: existingSession } } = await withTimeout(
          supabase.auth.getSession(),
          PROFILE_TIMEOUT_MS,
          "Initialisation de la session trop lente."
        );
        if (existingSession?.user && mounted) {
          localStorage.setItem(CURRENT_USER_KEY, existingSession.user.id);
          setSession(existingSession);
          const profile = await fetchProfile(existingSession.user.id);
          if (profile && mounted) {
            setUser(profile);
          } else if (mounted) {
            // Fallback : utiliser les données auth
            setUser(authUserToAppUser(existingSession.user));
          }
        }
      } catch (err) {
        console.error('Erreur initialisation session:', err);
      } finally {
        if (mounted) setIsInitializing(false);
      }
    }

    initSession();

    // Écouter les changements d'auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          localStorage.setItem(CURRENT_USER_KEY, newSession.user.id);
          // Petit délai pour laisser le trigger créer le profil
          setTimeout(async () => {
            const profile = await fetchProfile(newSession.user.id);
            if (profile && mounted) {
              setUser(profile);
            } else if (mounted) {
              setUser(authUserToAppUser(newSession.user));
            }
          }, 500);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem(CURRENT_USER_KEY);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          const profile = await fetchProfile(newSession.user.id);
          if (profile && mounted) setUser(profile);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Login email/password ───────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      ensureSupabaseConfigured();
      const { data, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        }),
        AUTH_TIMEOUT_MS,
        "Connexion trop lente. Verifie ta connexion internet ou l'etat de Supabase, puis reessaie."
      );

      if (authError) {
        const messages: Record<string, string> = {
          'Invalid login credentials': 'Email ou mot de passe incorrect.',
          'Email not confirmed': 'Vérifie ton email pour confirmer ton compte.',
          'Too many requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
        };
        throw new Error(messages[authError.message] || authError.message);
      }

      if (data.user) {
        localStorage.setItem(CURRENT_USER_KEY, data.user.id);
        setSession(data.session);
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setUser(profile);
        } else {
          // Fallback
          setUser(authUserToAppUser(data.user));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Inscription ────────────────────────────────────────────
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      ensureSupabaseConfigured();
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
              preferred_categories: data.preferredCategories,
            },
          },
        }),
        AUTH_TIMEOUT_MS,
        "Inscription trop lente. Verifie ta connexion internet ou l'etat de Supabase, puis reessaie."
      );

      if (authError) {
        const messages: Record<string, string> = {
          'User already registered': 'Un compte avec cet email existe déjà.',
          'Password should be at least 6 characters': 'Le mot de passe doit faire au moins 6 caractères.',
          'Signup requires a valid password': 'Mot de passe invalide.',
        };
        throw new Error(messages[authError.message] || authError.message);
      }

      // Si Supabase demande la confirmation email
      if (authData.user && !authData.session) {
        throw new Error('Compte cree. Verifie ton email pour confirmer ton inscription avant de te connecter.');
      }

      if (authData.user) {
        localStorage.setItem(CURRENT_USER_KEY, authData.user.id);
        setSession(authData.session);
        // Attendre que le trigger crée le profil
        await new Promise(resolve => setTimeout(resolve, 1000));
        const profile = await fetchProfile(authData.user.id);
        if (profile) {
          setUser(profile);
        } else {
          setUser(authUserToAppUser(authData.user));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'inscription";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Login Google OAuth ─────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (authError) {
      setError('Erreur de connexion Google. Réessaie.');
    }
  }, []);

  // ── Déconnexion ────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
    setSession(null);
    setError(null);
  }, []);

  // ── Rafraîchir le profil ───────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const profile = await fetchProfile(session.user.id);
    if (profile) setUser(profile);
  }, [session]);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    isInitializing,
    error,
    login,
    register,
    loginWithGoogle,
    logout,
    clearError,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── Hook ─────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return context;
};

export { AuthContext };
