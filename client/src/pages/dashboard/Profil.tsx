import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Save, Edit2, X, Trophy, Crown, Wallet, Flame, Target } from 'lucide-react';
import { BadgeShowcase } from '@/components/features/BadgeShowcase';
import { computeGamification, type GamificationData } from '@/services/badgeSystem';
import { getUserStats } from '@/services/epubService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  memberSince: string;
  plan: string;
  role: string;
  walletBalance: number;
  filiere: string;
  universite: string;
  preferences: {
    notifications: boolean;
    newsletter: boolean;
    recommendations: boolean;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const planLabels: Record<string, string> = {
  free: '🆓 Gratuit',
  student: '🎓 Étudiant',
  premium: '👑 Premium',
  school: '🏫 École',
};

export default function Profil() {
  const { showToast } = useToast();
  const { user, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [readingStats, setReadingStats] = useState<{
    streak: number; biblioCoins: number; xp: number; weeklyGoal: number; weeklyProgress: number;
  } | null>(null);

  useEffect(() => {
    setGamification(computeGamification());
  }, []);

  useEffect(() => {
    if (user?.id) {
      getUserStats(user.id).then(s => setReadingStats({
        streak:        s.currentStreak,
        biblioCoins:   s.biblioCoins,
        xp:            s.xp,
        weeklyGoal:    s.weeklyGoal,
        weeklyProgress: s.weeklyProgress,
      })).catch(() => null);
    }
  }, [user?.id]);

  const buildProfile = (): UserProfile => {
    return {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.whatsappNumber || '',
      address: '',
      memberSince: user?.memberSince ? new Date(user.memberSince).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      plan: user?.plan || 'free',
      role: user?.role || 'user',
      walletBalance: user?.walletBalance || 0,
      filiere: user?.filiere || '',
      universite: user?.universite || '',
      preferences: {
        notifications: true,
        newsletter: true,
        recommendations: true,
      },
    };
  };

  const [profile, setProfile] = useState<UserProfile>(buildProfile);
  const [editedProfile, setEditedProfile] = useState(profile);

  // Mettre à jour quand le user change
  useEffect(() => {
    if (user) {
      const p = buildProfile();
      setProfile(p);
      if (!isEditing) setEditedProfile(p);
    }
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile);
  };

  const handleSave = async () => {
    try {
      // Sauvegarder dans Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          first_name: editedProfile.firstName,
          last_name: editedProfile.lastName,
          whatsapp_number: editedProfile.phone || null,
          filiere: editedProfile.filiere || null,
          universite: editedProfile.universite || null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      setProfile(editedProfile);
      setIsEditing(false);
      await refreshProfile();
      showToast('Profil mis à jour avec succès ✅', 'success');
    } catch (err) {
      if (import.meta.env.DEV) console.error('Erreur sauvegarde profil:', err);
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleChange = (field: keyof UserProfile, value: any) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePreferenceChange = (key: keyof UserProfile['preferences']) => {
    setEditedProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key],
      },
    }));
  };

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Mon profil</h1>
            <p className="text-lg text-muted-foreground">
              Gérez vos informations personnelles et vos préférences
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </button>
          )}
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Membre depuis {new Date(profile.memberSince).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardBody className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Informations personnelles
                </h3>
                <div className="space-y-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Prénom
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedProfile.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                      />
                    ) : (
                      <p className="text-foreground">{profile.firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Nom
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedProfile.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                      />
                    ) : (
                      <p className="text-foreground">{profile.lastName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedProfile.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                      />
                    ) : (
                      <p className="text-foreground">{profile.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Téléphone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedProfile.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                      />
                    ) : (
                      <p className="text-foreground">{profile.phone}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Adresse
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedProfile.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                      />
                    ) : (
                      <p className="text-foreground">{profile.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Préférences
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEditing ? editedProfile.preferences.notifications : profile.preferences.notifications}
                      onChange={() => handlePreferenceChange('notifications')}
                      disabled={!isEditing}
                      className="w-4 h-4 rounded border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-foreground">
                      Recevoir les notifications de la bibliothèque
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEditing ? editedProfile.preferences.newsletter : profile.preferences.newsletter}
                      onChange={() => handlePreferenceChange('newsletter')}
                      disabled={!isEditing}
                      className="w-4 h-4 rounded border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-foreground">
                      S'abonner à la newsletter
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEditing ? editedProfile.preferences.recommendations : profile.preferences.recommendations}
                      onChange={() => handlePreferenceChange('recommendations')}
                      disabled={!isEditing}
                      className="w-4 h-4 rounded border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-foreground">
                      Recevoir des recommandations personnalisées
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="pt-6 border-t border-border flex gap-3">
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Account Stats */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Livres empruntés</p>
                <p className="text-3xl font-bold text-primary">3</p>
              </CardBody>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Livres favoris</p>
                <p className="text-3xl font-bold text-primary">12</p>
              </CardBody>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardBody className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Avis donnés</p>
                <p className="text-3xl font-bold text-primary">8</p>
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>

        {/* BibliCoins + Streak + Objectif hebdo */}
        {readingStats && (
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🪙</span>
                  <h3 className="text-lg font-bold text-foreground">Mes récompenses de lecture</h3>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* BibliCoins */}
                  <div className="text-center space-y-1">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mx-auto">
                      <span className="text-2xl">🪙</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{readingStats.biblioCoins.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">BibliCoins gagnés</p>
                  </div>
                  {/* Streak */}
                  <div className="text-center space-y-1">
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto">
                      <Flame className="w-7 h-7 text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{readingStats.streak}</p>
                    <p className="text-xs text-muted-foreground">Jours consécutifs</p>
                  </div>
                  {/* Objectif hebdomadaire */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 justify-center">
                      <Target className="w-5 h-5 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Objectif hebdo</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{readingStats.weeklyProgress} min</span>
                        <span>{readingStats.weeklyGoal} min</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round((readingStats.weeklyProgress / Math.max(readingStats.weeklyGoal, 1)) * 100))}%` }}
                        />
                      </div>
                      <p className="text-xs text-primary font-semibold text-center">
                        {Math.min(100, Math.round((readingStats.weeklyProgress / Math.max(readingStats.weeklyGoal, 1)) * 100))}% de l'objectif
                      </p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Section Badges & Niveaux */}
        {gamification && (
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Mes Badges & Progression</h3>
                    <p className="text-sm text-muted-foreground">
                      {gamification.unlockedCount}/{gamification.totalCount} badges débloqués · {gamification.xp} XP
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <BadgeShowcase data={gamification} />
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Danger Zone */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="border-b bg-red-50 dark:bg-red-900/10">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
                Zone dangereuse
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Les actions suivantes sont irréversibles. Veuillez être prudent.
              </p>
              <button className="w-full px-6 py-3 border border-red-500 text-red-600 dark:text-red-400 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200">
                Supprimer mon compte
              </button>
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
