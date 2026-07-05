import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpen, LayoutDashboard, BookMarked, Clock, User, LogOut, Menu, X, Moon, Sun, Sparkles, Bot, Shield, ShoppingBag, Brain, Users, Trophy, Coins, CreditCard, WifiOff, PenLine } from 'lucide-react';
import { AccessibilityBar } from '@/components/features/AccessibilityBar';
import { NotificationBell } from '@/components/features/NotificationBell';
import clsx from 'clsx';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAuth } from '@/hooks/useAuth';
import { BiblioTechLogo } from '@/components/brand/BiblioTechLogo';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/catalogue', icon: BookOpen, label: 'Catalogue' },
  { href: '/emprunts', icon: BookMarked, label: 'Mes lectures' },
  { href: '/historique', icon: Clock, label: 'Historique' },
  { href: '/recommandations', icon: Sparkles, label: 'Recommandations' },
  { href: '/bibliai', icon: Bot, label: 'BibliAI' },
  { href: '/quiz', icon: Brain, label: 'Quiz' },
  { href: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { href: '/communautes', icon: Users, label: 'Communautés' },
  { href: '/classement', icon: Trophy, label: 'Classement' },
  { href: '/coins', icon: Coins, label: 'BiblioCoins' },
  { href: '/abonnements', icon: CreditCard, label: 'Abonnements' },
  { href: '/hors-ligne', icon: WifiOff, label: 'Hors-ligne' },
  { href: '/auteur', icon: PenLine, label: 'Espace Auteur' },
  { href: '/profil', icon: User, label: 'Profil' },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isDark, toggleDarkMode } = useDarkMode();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen w-64 bg-card border-r border-border/60 transition-transform duration-300 ease-out z-40',
          'flex flex-col',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* ─── TOP: Logo (fixed) ─── */}
        <div className="p-5 border-b border-border/60 flex items-center justify-between flex-shrink-0">
          <Link href="/dashboard" className="hover:opacity-90 transition-opacity">
            <BiblioTechLogo size="sm" />
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-muted rounded-xl transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── MIDDLE: Navigation (scrollable) ─── */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Les auteurs approuvés vont directement au dashboard auteur
            const href = item.href === '/auteur' && user?.role === 'author'
              ? '/auteur/dashboard'
              : item.href;
            const isActive = location === href || (item.href === '/auteur' && location.startsWith('/auteur'));
            return (
              <Link
                key={item.href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ease-out',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted/70'
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}

          {/* Admin link */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 border border-red-200/60 dark:border-red-800/60 mt-2"
              onClick={() => setIsSidebarOpen(false)}
            >
              <Shield className="w-5 h-5" />
              <span className="font-semibold text-sm">Panel Admin</span>
            </Link>
          )}
        </nav>

        {/* ─── BOTTOM: User actions (always visible, fixed to bottom) ─── */}
        <div className="flex-shrink-0 border-t border-border/60 p-4 space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-foreground hover:bg-muted/70 transition-all duration-200 text-sm"
          >
            {isDark ? (
              <><Sun className="w-5 h-5" /><span className="font-medium">Mode clair</span></>
            ) : (
              <><Moon className="w-5 h-5" /><span className="font-medium">Mode sombre</span></>
            )}
          </button>

          {/* User Info */}
          {user && (
            <div className="px-4 py-2.5 bg-muted/50 rounded-xl">
              <p className="text-sm font-semibold text-foreground truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="md:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-muted rounded-xl transition-colors duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Barre accessibilité flottante */}
      <AccessibilityBar />
    </div>
  );
};
