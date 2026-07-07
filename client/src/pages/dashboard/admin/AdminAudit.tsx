
import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, Shield, Search } from 'lucide-react';
import { useAdminAudit } from './hooks/useAdminData';

export default function AdminAudit() {
  const { logs, loading, fetchLogs } = useAdminAudit();
  const [filterAction, setFilterAction] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFilter = () => {
    fetchLogs({ action: filterAction || undefined });
  };

  // Extraire les actions uniques pour le filtre
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const inp = "px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-2 items-center">
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className={inp}>
          <option value="">Toutes les actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={handleFilter} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          Filtrer
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucune action dans le journal</p>
          <p className="text-xs text-muted-foreground mt-1">Les actions admin seront enregistrées ici automatiquement</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {logs.map(log => {
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <Shield className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {log.action}
                      {log.cible_type && (
                        <span className="text-xs text-muted-foreground ml-2">
                          → {log.cible_type} {log.cible_id?.slice(0, 8)}...
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Admin: {log.admin_id.slice(0, 8)}... · {new Date(log.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                      {log.ip_address && <> · IP: {log.ip_address}</>}
                    </p>
                  </div>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  }
                </button>
                {isExpanded && log.details && Object.keys(log.details).length > 0 && (
                  <div className="px-4 pb-3 pt-1 border-t border-border">
                    <pre className="text-xs text-muted-foreground bg-muted p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
