
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useAdminConfig } from './hooks/useAdminData';
import { useAuth } from '@/contexts/AuthContext';

// Groupes de configuration pour l'affichage
const CONFIG_GROUPS: Record<string, { label: string; icon: string; keys: string[] }> = {
  tarification: {
    label: '💰 Tarification',
    icon: '💰',
    keys: ['prix_abonnement_etudiant', 'prix_abonnement_premium', 'prix_abonnement_ecole_min', 'prix_abonnement_ecole_max', 'prix_location_min', 'prix_achat_min', 'prix_auteur_min'],
  },
  commissions: {
    label: '📊 Commissions',
    icon: '📊',
    keys: ['commission_numerique', 'commission_physique'],
  },
  limites: {
    label: '📏 Limites',
    icon: '📏',
    keys: ['emprunts_gratuits_free', 'duree_emprunt_jours', 'duree_essai_jours', 'offline_limit_free', 'offline_limit_student', 'offline_limit_premium'],
  },
  parrainage: {
    label: '🤝 Parrainage',
    icon: '🤝',
    keys: ['credit_parrainage_parrain', 'credit_parrainage_filleul'],
  },
  amendes: {
    label: '⚠️ Amendes',
    icon: '⚠️',
    keys: ['prolongation_auto_jours', 'amende_palier_1_jours', 'amende_palier_1_montant', 'amende_palier_2_jours', 'amende_palier_2_montant', 'amende_palier_3_jours', 'amende_palier_3_montant'],
  },
  technique: {
    label: '⚙️ Technique',
    icon: '⚙️',
    keys: ['url_signee_duree_heures', 'bibliai_max_messages_heure', 'bibliai_memoire_messages', 'communaute_max_membres'],
  },
};

export default function AdminConfig() {
  const { user } = useAuth();
  const { config, loading, fetchConfig, updateConfig } = useAdminConfig();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const handleSave = async (id: string, cle: string) => {
    const newValue = editValues[cle];
    if (newValue === undefined) return;

    setSaving(cle);
    try {
      await updateConfig(id, newValue, user?.id || '');
      fetchConfig();
      setEditValues(prev => { const copy = { ...prev }; delete copy[cle]; return copy; });
      notify(`✅ "${cle}" mis à jour`);
    } catch {
      notify('❌ Erreur de sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  const getConfigValue = (cle: string) => {
    if (cle in editValues) return editValues[cle];
    const item = config.find(c => c.cle === cle);
    return item?.valeur || '';
  };

  const getConfigItem = (cle: string) => config.find(c => c.cle === cle);

  const isModified = (cle: string) => {
    const item = config.find(c => c.cle === cle);
    return cle in editValues && editValues[cle] !== item?.valeur;
  };

  const inp = "px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium">{notification}</div>
      )}

      <p className="text-sm text-muted-foreground">
        Ces paramètres contrôlent le fonctionnement de BiblioTech. Les modifications sont appliquées immédiatement.
      </p>

      {Object.entries(CONFIG_GROUPS).map(([groupKey, group]) => (
        <motion.div key={groupKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-muted/50 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">{group.label}</h3>
          </div>
          <div className="divide-y divide-border">
            {group.keys.map(cle => {
              const item = getConfigItem(cle);
              if (!item) return null;
              const modified = isModified(cle);
              return (
                <div key={cle} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cle}</p>
                    <p className="text-xs text-muted-foreground">{item.description || ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="text"
                      value={getConfigValue(cle)}
                      onChange={e => setEditValues(prev => ({ ...prev, [cle]: e.target.value }))}
                      className={`${inp} w-28 text-right ${modified ? 'border-primary ring-1 ring-primary/30' : ''}`}
                    />
                    {modified && (
                      <>
                        <button onClick={() => handleSave(item.id, cle)} disabled={saving === cle}
                          className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                          <Save className={`w-4 h-4 ${saving === cle ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setEditValues(prev => { const copy = { ...prev }; delete copy[cle]; return copy; })}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
