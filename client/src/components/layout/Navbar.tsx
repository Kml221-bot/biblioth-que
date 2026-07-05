import React from 'react';
import { Link } from 'wouter';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { BiblioTechLogo } from '@/components/brand/BiblioTechLogo';
import { CoinBalance } from '@/components/features/CoinBalance';

interface NavbarProps {
  isDark?: boolean;
  onThemeToggle?: () => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isDark = false,
  onThemeToggle,
  isAuthenticated = false,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/">
          <a className="hover:opacity-90 transition-opacity">
            <BiblioTechLogo size="sm" textClassName="hidden sm:inline" />
          </a>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {isAuthenticated && (
            <>
              <Link href="/dashboard">
                <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  Dashboard
                </a>
              </Link>
              <Link href="/catalogue">
                <a className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  Catalogue
                </a>
              </Link>
            </>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Solde BiblioCoins */}
          {isAuthenticated && <CoinBalance showLabel />}

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Auth Buttons */}
          <div className="hidden sm:flex gap-2">
            {isAuthenticated ? (
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:shadow-md transition-all"
              >
                Déconnexion
              </button>
            ) : (
              <>
                <Link href="/login">
                  <a className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors">
                    Connexion
                  </a>
                </Link>
                <Link href="/register">
                  <a className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:shadow-md transition-all">
                    S'inscrire
                  </a>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {isOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="container py-4 space-y-4">
            {isAuthenticated && (
              <>
                <Link href="/dashboard">
                  <a className="block text-sm font-medium text-foreground hover:text-primary transition-colors">
                    Dashboard
                  </a>
                </Link>
                <Link href="/catalogue">
                  <a className="block text-sm font-medium text-foreground hover:text-primary transition-colors">
                    Catalogue
                  </a>
                </Link>
              </>
            )}
            <div className="border-t border-border pt-4 space-y-2">
              {isAuthenticated ? (
                <button
                  onClick={onLogout}
                  className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:shadow-md transition-all"
                >
                  Déconnexion
                </button>
              ) : (
                <>
                  <Link href="/login">
                    <a className="block px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors text-center">
                      Connexion
                    </a>
                  </Link>
                  <Link href="/register">
                    <a className="block px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:shadow-md transition-all text-center">
                      S'inscrire
                    </a>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
