import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, BookOpen } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BookCoverPlaceholder } from '@/components/features/BookCoverPlaceholder';
import { getHistory, getActiveBorrows, type HistoryItem } from '@/services/borrowStore';

function buildMonthlyData(history: HistoryItem[]) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const counts: Record<string, { emprunts: number; retours: number }> = {};
  history.forEach(item => {
    const bKey = months[new Date(item.borrowDate).getMonth()];
    const rKey = months[new Date(item.returnDate).getMonth()];
    if (!counts[bKey]) counts[bKey] = { emprunts: 0, retours: 0 };
    counts[bKey].emprunts++;
    if (!counts[rKey]) counts[rKey] = { emprunts: 0, retours: 0 };
    counts[rKey].retours++;
  });
  // Ajouter les emprunts actifs
  getActiveBorrows().forEach(b => {
    const bKey = months[new Date(b.borrowDate).getMonth()];
    if (!counts[bKey]) counts[bKey] = { emprunts: 0, retours: 0 };
    counts[bKey].emprunts++;
  });
  return Object.entries(counts).map(([month, data]) => ({ month, ...data }));
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Historique() {
  const [history, setHistory] = useState<HistoryItem[]>(getHistory());
  const [filter, setFilter] = useState<'all' | 'returned' | 'overdue' | 'renewed'>('all');

  // Actualiser quand un emprunt est retourné
  useEffect(() => {
    const update = () => setHistory(getHistory());
    window.addEventListener('borrowsUpdated', update);
    return () => window.removeEventListener('borrowsUpdated', update);
  }, []);

  const filteredHistory = filter === 'all' ? history : history.filter(item => item.status === filter);
  const monthlyData = buildMonthlyData(history);

  const totalBorrows = history.length + getActiveBorrows().length;
  const avgDays = history.length > 0 ? Math.round(history.reduce((s, i) => s + i.daysKept, 0) / history.length) : 0;
  const totalReturned = history.filter(i => i.status === 'returned').length;
  const overdue = history.filter(i => i.status === 'overdue').length;
  const active = getActiveBorrows().length;

  const pieData = [
    { name: 'Retournés', value: totalReturned },
    { name: 'En retard', value: overdue },
    { name: 'En cours de lecture', value: active },
  ].filter(d => d.value > 0);

  const getStatusColor = (status: string) => {
    switch (status) { case 'returned': return 'success'; case 'overdue': return 'danger'; case 'renewed': return 'warning'; default: return 'default'; }
  };
  const getStatusLabel = (status: string) => {
    switch (status) { case 'returned': return 'Retourné'; case 'overdue': return 'En retard'; case 'renewed': return 'Renouvelé'; default: return 'Inconnu'; }
  };

  return (
    <DashboardLayout>
      <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl font-bold text-foreground mb-2">Historique</h1>
          <p className="text-lg text-muted-foreground">Consultez votre historique d'emprunts et vos statistiques</p>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants}>
          <motion.div variants={itemVariants}>
            <Card><CardBody className="text-center">
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Total emprunts</p>
              <p className="text-3xl font-bold text-foreground">{totalBorrows}</p>
            </CardBody></Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card><CardBody className="text-center">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Moyenne (jours)</p>
              <p className="text-3xl font-bold text-foreground">{avgDays}</p>
            </CardBody></Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card><CardBody className="text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Retournés</p>
              <p className="text-3xl font-bold text-foreground">{totalReturned}</p>
            </CardBody></Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card><CardBody className="text-center">
              <Calendar className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">En cours</p>
              <p className="text-3xl font-bold text-foreground">{active}</p>
            </CardBody></Card>
          </motion.div>
        </motion.div>

        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={containerVariants}>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b"><h3 className="text-xl font-bold text-foreground">Tendance mensuelle</h3></CardHeader>
              <CardBody>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                      <Legend />
                      <Bar dataKey="emprunts" fill="#3b82f6" name="Emprunts" />
                      <Bar dataKey="retours" fill="#10b981" name="Retours" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">Aucune donnée — empruntez puis retournez des livres pour voir les statistiques</div>
                )}
              </CardBody>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="border-b"><h3 className="text-xl font-bold text-foreground">Distribution par statut</h3></CardHeader>
              <CardBody>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                        label={({ name, value }: { name: string; value: number }) => `${name} (${value})`}
                        outerRadius={80} fill="#8884d8" dataKey="value">
                        {pieData.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">Aucune donnée disponible</div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="flex flex-wrap gap-2">
            {(['all', 'returned', 'overdue', 'renewed'] as const).map((status) => (
              <button key={status} onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${filter === status ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}>
                {status === 'all' ? 'Tous' : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div className="space-y-3" variants={containerVariants}>
          <h3 className="text-xl font-bold text-foreground">Détail des emprunts</h3>
          {filteredHistory.map((item) => (
            <motion.div key={item.id} variants={itemVariants}>
              <Card>
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted shadow-sm">
                      <BookCoverPlaceholder title={item.title} author={item.author} id={item.id} variant="sm" category={item.category} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground mb-1 truncate">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2 truncate">{item.author}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Commencé : {new Date(item.borrowDate).toLocaleDateString('fr-FR')}</span>
                        <span>Retourné : {new Date(item.returnDate).toLocaleDateString('fr-FR')}</span>
                        <span>Durée : {item.daysKept} jours</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(item.status) as any} size="sm">{getStatusLabel(item.status)}</Badge>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {filteredHistory.length === 0 && (
          <motion.div variants={itemVariants}>
            <Card><CardBody className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">{history.length === 0 ? 'Aucun emprunt retourné. Empruntez puis retournez des livres pour voir l\'historique.' : 'Aucun emprunt avec ce statut'}</p>
            </CardBody></Card>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
