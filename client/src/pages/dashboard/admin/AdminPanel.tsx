// ============================================================
// BiblioTech — Panel Admin (Layout principal)
// Navigation latérale + sections modulaires
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, LayoutDashboard, BookOpen, Users, BookMarked,
  DollarSign, Settings, FileText, PenLine,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import AdminOverview from './AdminOverview';
import AdminCatalogue from './AdminCatalogue';
import AdminUsers from './AdminUsers';
import AdminBorrows from './AdminBorrows';
import AdminFinances from './AdminFinances';
import AdminConfig from './AdminConfig';
import AdminAudit from './AdminAudit';
import AdminAuthors from './AdminAuthors';

// ── Sections ─────────────────────────────────────────────────

type AdminSection = 'overview' | 'catalogue' | 'authors' | 'users' | 'borrows' | 'finances' | 'config' | 'audit';

const SECTIONS: { id: AdminSection; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'overview',  label: 'Vue d\'ensemble', icon: LayoutDashboard, desc: 'Stats et alertes' },
  { id: 'catalogue', label: 'Catalogue',        icon: BookOpen,        desc: 'Gestion des livres' },
  { id: 'authors',   label: 'Auteurs',           icon: PenLine,         desc: 'Validation auteurs & livres' },
  { id: 'users',     label: 'Utilisateurs',      icon: Users,           desc: 'Profils et rôles' },
  { id: 'borrows',   label: 'Emprunts',          icon: BookMarked,      desc: 'Suivi emprunts' },
  { id: 'finances',  label: 'Finances',          icon: DollarSign,      desc: 'Revenus et transactions' },
  { id: 'config',    label: 'Configuration',     icon: Settings,        desc: 'Paramètres plateforme' },
  { id: 'audit',     label: 'Journal d\'audit',  icon: FileText,        desc: 'Historique actions' },
];

// ── Composant principal ──────────────────────────────────────

export default function AdminPanel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

  // Rediriger si pas admin
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      setLocation('/dashboard');
    }
    if (!user) setLocation('/login');
  }, [user, setLocation]);

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null;
  }

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel Administrateur</h1>
            <p className="text-sm text-muted-foreground">
              BiblioTech — Gestion complète
            </p>
          </div>
          <span className="ml-auto text-xs font-medium px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </span>
        </div>

        {/* Navigation par onglets */}
        <div className="flex gap-1 border-b border-border overflow-x-auto pb-px">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Contenu de la section active */}
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeSection === 'overview'  && <AdminOverview />}
          {activeSection === 'catalogue' && <AdminCatalogue />}
          {activeSection === 'authors'   && <AdminAuthors />}
          {activeSection === 'users'     && <AdminUsers />}
          {activeSection === 'borrows'   && <AdminBorrows />}
          {activeSection === 'finances'  && <AdminFinances />}
          {activeSection === 'config'    && <AdminConfig />}
          {activeSection === 'audit'     && <AdminAudit />}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
