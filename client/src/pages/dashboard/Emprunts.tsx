import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, BookMarked, Zap, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { BookCoverPlaceholder } from '@/components/features/BookCoverPlaceholder';
import { getActiveBorrows, type BorrowedBook } from '@/services/borrowStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function getReadingProgress(borrow: BorrowedBook): number {
  const elapsed = Math.max(0, 30 - Math.round((new Date(borrow.dueDate).getTime() - Date.now()) / 86400000));
  return Math.min(100, Math.round((elapsed / 30) * 100));
}

export default function Emprunts() {
  const [lectures, setLectures] = useState<BorrowedBook[]>(getActiveBorrows());

  useEffect(() => {
    const update = () => setLectures(getActiveBorrows());
    window.addEventListener('borrowsUpdated', update);
    return () => window.removeEventListener('borrowsUpdated', update);
  }, []);

  const xpTotal = lectures.length * 50;

  return (
    <DashboardLayout>
      <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <BookMarked className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Mes lectures</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lectures.length > 0
                  ? `${lectures.length} livre${lectures.length > 1 ? 's' : ''} en cours de lecture`
                  : 'Aucune lecture en cours'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" variants={containerVariants}>
          <motion.div variants={itemVariants}>
            <Card>
              <CardBody className="text-center py-5">
                <p className="text-sm text-muted-foreground mb-1">Livres en cours</p>
                <p className="text-4xl font-bold text-primary">{lectures.length}</p>
              </CardBody>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardBody className="text-center py-5">
                <p className="text-sm text-muted-foreground mb-1">Livres lus</p>
                <p className="text-4xl font-bold text-violet-500">{lectures.length}</p>
              </CardBody>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardBody className="text-center py-5">
                <p className="text-sm text-muted-foreground mb-1">XP gagné</p>
                <p className="text-4xl font-bold text-amber-500">{xpTotal}</p>
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>

        {/* Liste des lectures */}
        {lectures.length > 0 ? (
          <motion.div className="space-y-4" variants={containerVariants}>
            <h2 className="text-lg font-semibold text-foreground">En cours</h2>
            {lectures.map((lecture) => {
              const progress = getReadingProgress(lecture);
              return (
                <motion.div key={lecture.id} variants={itemVariants}>
                  <Card>
                    <CardBody>
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                          <BookCoverPlaceholder
                            title={lecture.title}
                            author={lecture.author}
                            id={lecture.id}
                            variant="sm"
                            category={lecture.category}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base text-foreground truncate">{lecture.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{lecture.author}</p>

                          {/* Progression */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Progression</span>
                              <span className="text-xs font-semibold text-primary">{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              <span>+{progress > 0 ? Math.round(progress / 2) : 0} XP</span>
                            </div>
                            <Link
                              href={`/lecture?id=${encodeURIComponent(lecture.id)}&source=catalogue`}
                              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              Continuer <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <Card>
              <CardBody className="text-center py-16">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Aucune lecture en cours</h3>
                <p className="text-muted-foreground mb-6">
                  Commence à lire un livre depuis le catalogue pour le retrouver ici.
                </p>
                <Link
                  href="/catalogue"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  <BookOpen className="w-4 h-4" />
                  Parcourir le catalogue
                </Link>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
