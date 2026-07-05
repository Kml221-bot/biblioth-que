// ─── Composant de gestion 2FA TOTP pour les admins BiblioTech ────────────────
// Usage : <Admin2FA token={sessionToken} />
// Le composant gère le cycle complet : status → setup → scan QR → vérifier → actif.

import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, QrCode, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Admin2FAProps {
  token: string;
}

type Step = 'idle' | 'loading' | 'setup' | 'verify-setup' | 'enabled' | 'disable';

export const Admin2FA: React.FC<Admin2FAProps> = ({ token }) => {
  const [step, setStep]       = useState<Step>('loading');
  const [qrCode, setQrCode]   = useState('');
  const [secret, setSecret]   = useState('');
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Récupérer le statut 2FA au montage ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/2fa/status', { headers })
      .then(r => r.json())
      .then(data => setStep(data.enabled ? 'enabled' : 'idle'))
      .catch(() => setStep('idle'));
  }, []);

  // ── Démarrer le setup ────────────────────────────────────────────────────────
  async function startSetup() {
    setError(''); setStep('loading');
    const r = await fetch('/api/admin/2fa/setup', { method: 'POST', headers });
    const data = await r.json();
    if (!r.ok) { setError(data.message || 'Erreur'); setStep('idle'); return; }
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setStep('setup');
  }

  // ── Confirmer le scan (premier code) ────────────────────────────────────────
  async function verifySetup() {
    setError('');
    const r = await fetch('/api/admin/2fa/verify-setup', {
      method: 'POST', headers, body: JSON.stringify({ code }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.message || 'Code invalide'); return; }
    setSuccess('2FA activé avec succès !');
    setCode(''); setStep('enabled');
  }

  // ── Désactiver le 2FA ────────────────────────────────────────────────────────
  async function disable2FA() {
    setError('');
    const r = await fetch('/api/admin/2fa/disable', {
      method: 'DELETE', headers, body: JSON.stringify({ code }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.message || 'Code invalide'); return; }
    setSuccess('2FA désactivé.');
    setCode(''); setStep('idle');
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement…
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 max-w-md">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        {step === 'enabled'
          ? <ShieldCheck className="w-6 h-6 text-green-500" />
          : <Shield className="w-6 h-6 text-muted-foreground" />}
        <div>
          <h3 className="font-semibold">Double authentification (TOTP)</h3>
          <p className="text-xs text-muted-foreground">
            {step === 'enabled' ? 'Actif — votre compte admin est sécurisé' : 'Non activé'}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error   && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950/30 rounded px-3 py-2">{success}</p>}

      {/* IDLE : bouton d'activation */}
      {step === 'idle' && (
        <Button onClick={startSetup} className="w-full gap-2">
          <QrCode className="w-4 h-4" />
          Activer le 2FA
        </Button>
      )}

      {/* SETUP : afficher QR code */}
      {step === 'setup' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scannez ce QR code avec <strong>Google Authenticator</strong>, <strong>Authy</strong> ou toute app compatible TOTP.
          </p>
          <div className="flex justify-center">
            <img src={qrCode} alt="QR Code 2FA" className="w-44 h-44 rounded-lg border" />
          </div>
          <div className="bg-muted rounded p-2 text-xs font-mono break-all text-center">
            {secret}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Code de secours — conservez-le en lieu sûr.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setStep('verify-setup')}>
            J'ai scanné le QR code →
          </Button>
        </div>
      )}

      {/* VERIFY-SETUP : saisir le premier code */}
      {step === 'verify-setup' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Entrez le code à 6 chiffres affiché dans votre app pour confirmer la configuration.
          </p>
          <Input
            placeholder="123456"
            maxLength={6}
            inputMode="numeric"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-xl tracking-widest font-mono"
          />
          <Button onClick={verifySetup} className="w-full gap-2" disabled={code.length !== 6}>
            <KeyRound className="w-4 h-4" />
            Vérifier et activer
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep('setup')}>
            ← Retour au QR code
          </Button>
        </div>
      )}

      {/* ENABLED : options de gestion */}
      {step === 'enabled' && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 rounded p-3">
            Chaque action admin sensible demandera votre code TOTP via <code>POST /api/admin/2fa/verify</code>.
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800"
            onClick={() => { setStep('disable'); setCode(''); setError(''); }}
          >
            <ShieldOff className="w-4 h-4" />
            Désactiver le 2FA
          </Button>
        </div>
      )}

      {/* DISABLE : confirmer avec un code valide */}
      {step === 'disable' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Entrez votre code TOTP actuel pour désactiver le 2FA.
          </p>
          <Input
            placeholder="123456"
            maxLength={6}
            inputMode="numeric"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-xl tracking-widest font-mono"
          />
          <Button
            onClick={disable2FA}
            variant="destructive"
            className="w-full"
            disabled={code.length !== 6}
          >
            Confirmer la désactivation
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => { setStep('enabled'); setError(''); }}>
            ← Annuler
          </Button>
        </div>
      )}
    </div>
  );
};
