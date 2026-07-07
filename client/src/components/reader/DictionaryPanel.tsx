
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, Languages, Globe, Loader2, Volume2,
  ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface DictionaryPanelProps {
  word: string;
  isOpen: boolean;
  onClose: () => void;
  theme: {
    bg: string;
    text: string;
    headerBg: string;
    headerBorder: string;
    accent: string;
    mutedText: string;
  };
}

interface DictionaryResult {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ audio?: string; text?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
    }>;
  }>;
  sourceUrls?: string[];
}

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: { language: string; confidence: number };
}

interface WikipediaResult {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

type TabType = 'definition' | 'translate' | 'wikipedia';

// ─── Composant principal ──────────────────────────────────
export default function DictionaryPanel({
  word,
  isOpen,
  onClose,
  theme,
}: DictionaryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('definition');
  const [loading, setLoading] = useState(false);
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null);
  const [transResult, setTransResult] = useState<TranslationResult | null>(null);
  const [wikiResult, setWikiResult] = useState<WikipediaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<'en' | 'fr'>('en');
  const [expanded, setExpanded] = useState(false);

  // ─── Chercher la définition ─────────────────────────────
  const fetchDefinition = useCallback(async (w: string) => {
    setLoading(true);
    setError(null);
    setDictResult(null);

    try {
      // Essayer d'abord en français
      let res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/fr/${encodeURIComponent(w)}`);

      if (!res.ok) {
        // Fallback en anglais
        res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
      }

      if (!res.ok) {
        setError('Aucune définition trouvée.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setDictResult(data[0]);
      } else {
        setError('Aucune définition trouvée.');
      }
    } catch {
      setError('Erreur de connexion. Vérifiez votre internet.');
    }
    setLoading(false);
  }, []);

  // ─── Traduction ─────────────────────────────────────────
  const fetchTranslation = useCallback(async (w: string, target: string) => {
    setLoading(true);
    setError(null);
    setTransResult(null);

    try {
      // Utiliser l'API MyMemory (gratuite, pas de clé requise)
      const sourceLang = target === 'en' ? 'fr' : 'en';
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=${sourceLang}|${target}`
      );

      if (!res.ok) {
        setError('Erreur de traduction.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data?.responseData?.translatedText) {
        setTransResult({
          translatedText: data.responseData.translatedText,
          detectedLanguage: data.responseData.detectedLanguage
            ? {
                language: data.responseData.detectedLanguage,
                confidence: data.responseData.match || 0,
              }
            : undefined,
        });
      } else {
        setError('Traduction non disponible.');
      }
    } catch {
      setError('Erreur de connexion.');
    }
    setLoading(false);
  }, []);

  // ─── Wikipedia ──────────────────────────────────────────
  const fetchWikipedia = useCallback(async (w: string) => {
    setLoading(true);
    setError(null);
    setWikiResult(null);

    try {
      // API Wikipedia en français
      const res = await fetch(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(w)}`
      );

      if (!res.ok) {
        // Fallback en anglais
        const resEn = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(w)}`
        );
        if (!resEn.ok) {
          setError('Aucun article Wikipedia trouvé.');
          setLoading(false);
          return;
        }
        const dataEn = await resEn.json();
        setWikiResult(dataEn);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setWikiResult(data);
    } catch {
      setError('Erreur de connexion.');
    }
    setLoading(false);
  }, []);

  // ─── Charger les données au changement de tab ───────────
  React.useEffect(() => {
    if (!isOpen || !word) return;

    if (activeTab === 'definition' && !dictResult) {
      fetchDefinition(word);
    } else if (activeTab === 'translate' && !transResult) {
      fetchTranslation(word, targetLang);
    } else if (activeTab === 'wikipedia' && !wikiResult) {
      fetchWikipedia(word);
    }
  }, [isOpen, word, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reset quand le mot change ──────────────────────────
  React.useEffect(() => {
    setDictResult(null);
    setTransResult(null);
    setWikiResult(null);
    setError(null);
    setActiveTab('definition');
  }, [word]);

  // ─── Jouer la prononciation ─────────────────────────────
  const playAudio = useCallback((url: string) => {
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }, []);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'definition', label: 'Définir', icon: <BookOpen size={14} /> },
    { id: 'translate', label: 'Traduire', icon: <Languages size={14} /> },
    { id: 'wikipedia', label: 'Wikipedia', icon: <Globe size={14} /> },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[65] rounded-t-3xl shadow-2xl"
        style={{
          backgroundColor: theme.bg,
          border: `1px solid ${theme.headerBorder}`,
          maxHeight: expanded ? '80vh' : '50vh',
          transition: 'max-height 0.3s ease',
        }}
      >
        {/* Poignée + expand */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-full"
            style={{ color: theme.mutedText }}
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.headerBorder }} />
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: theme.mutedText }}>
            <X size={18} />
          </button>
        </div>

        {/* Mot sélectionné */}
        <div className="px-4 pb-2">
          <h3 className="text-xl font-bold" style={{ color: theme.text }}>
            « {word} »
          </h3>
        </div>

        {/* Onglets */}
        <div className="flex items-center gap-1 px-4 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? `${theme.accent}20` : 'transparent',
                color: activeTab === tab.id ? theme.accent : theme.mutedText,
                border: `1px solid ${activeTab === tab.id ? theme.accent : 'transparent'}`,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: expanded ? '60vh' : '30vh' }}>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: theme.accent }} />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: theme.mutedText }}>{error}</p>
            </div>
          )}

          {/* ─── Définition ──────────────────────────── */}
          {activeTab === 'definition' && dictResult && !loading && (
            <div className="space-y-4">
              {/* Phonétique */}
              {(dictResult.phonetic || dictResult.phonetics?.length) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: theme.mutedText }}>
                    {dictResult.phonetic}
                  </span>
                  {dictResult.phonetics?.map((p, i) =>
                    p.audio ? (
                      <button
                        key={i}
                        onClick={() => playAudio(p.audio!)}
                        className="p-1 rounded-full transition-colors hover:bg-black/10"
                        title="Écouter la prononciation"
                      >
                        <Volume2 size={14} style={{ color: theme.accent }} />
                      </button>
                    ) : null
                  )}
                </div>
              )}

              {/* Significations */}
              {dictResult.meanings.map((meaning, i) => (
                <div key={i} className="space-y-2">
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: theme.accent }}
                  >
                    {meaning.partOfSpeech}
                  </p>
                  {meaning.definitions.slice(0, 3).map((def, j) => (
                    <div key={j} className="pl-3 border-l-2" style={{ borderColor: `${theme.accent}40` }}>
                      <p className="text-sm" style={{ color: theme.text }}>
                        {j + 1}. {def.definition}
                      </p>
                      {def.example && (
                        <p className="text-xs italic mt-1" style={{ color: theme.mutedText }}>
                          « {def.example} »
                        </p>
                      )}
                      {def.synonyms && def.synonyms.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: theme.mutedText }}>
                          Synonymes : {def.synonyms.slice(0, 5).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ─── Traduction ───────────────────────────── */}
          {activeTab === 'translate' && !loading && (
            <div className="space-y-4">
              {/* Sélecteur de langue */}
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: theme.mutedText }}>Traduire vers :</span>
                {(['en', 'fr'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setTargetLang(lang);
                      setTransResult(null);
                      fetchTranslation(word, lang);
                    }}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: targetLang === lang ? `${theme.accent}20` : 'transparent',
                      color: targetLang === lang ? theme.accent : theme.mutedText,
                      border: `1px solid ${targetLang === lang ? theme.accent : theme.headerBorder}`,
                    }}
                  >
                    {lang === 'en' ? '🇬🇧 Anglais' : '🇫🇷 Français'}
                  </button>
                ))}
              </div>

              {transResult && (
                <div
                  className="p-4 rounded-2xl"
                  style={{ backgroundColor: `${theme.accent}08`, border: `1px solid ${theme.headerBorder}` }}
                >
                  <p className="text-xs mb-1" style={{ color: theme.mutedText }}>Traduction :</p>
                  <p className="text-lg font-semibold" style={{ color: theme.text }}>
                    {transResult.translatedText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── Wikipedia ────────────────────────────── */}
          {activeTab === 'wikipedia' && wikiResult && !loading && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {wikiResult.thumbnail && (
                  <img
                    src={wikiResult.thumbnail.source}
                    alt={wikiResult.title}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
                    {wikiResult.title}
                  </h4>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: theme.text }}>
                    {wikiResult.extract}
                  </p>
                </div>
              </div>
              {wikiResult.content_urls?.desktop?.page && (
                <a
                  href={wikiResult.content_urls.desktop.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: theme.accent }}
                >
                  <ExternalLink size={12} />
                  Lire l'article complet sur Wikipedia
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
