import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Bot, X, Zap, MessageSquare, Sparkles, ChevronDown } from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { AIMessageBubble } from './AIMessage';
import { AIRecommendations, PersonalizedRecommendations } from './AIRecommendations';
import { QUICK_ACTIONS } from '@/services/aiService';

interface AIChatProps {
  bookId?: string;
  compact?: boolean;
}

export const AIChat: React.FC<AIChatProps> = ({ bookId, compact = false }) => {
  const { messages, isLoading, suggestions, personalizedRecs, sendMessage, clearChat, messageCount } = useAI(bookId);
  const [input, setInput] = useState('');
  const [showPicto, setShowPicto] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll en bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Détecter si on est scrollé vers le haut
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
    setShowQuickActions(false);
  };

  const handleSuggestionClick = (text: string) => {
    if (isLoading) return;
    sendMessage(text);
    setShowQuickActions(false);
  };

  // Pictogrammes pour les personnes sourdes-muettes
  const PICTOGRAMS = [
    { emoji: '📚', label: 'Livre', text: 'Je cherche un livre' },
    { emoji: '🌍', label: 'Afrique', text: 'Livres africains sénégalais' },
    { emoji: '⛩️', label: 'Manga', text: 'Recommande-moi un manga' },
    { emoji: '🔍', label: 'Chercher', text: 'Comment chercher un livre ?' },
    { emoji: '🤝', label: 'Emprunter', text: 'Comment emprunter un livre ?' },
    { emoji: '⭐', label: 'Top', text: 'Quels sont les meilleurs livres ?' },
    { emoji: '👤', label: 'Profil', text: 'Comment voir mon profil ?' },
    { emoji: '🏆', label: 'Badges', text: 'Comment gagner des badges ?' },
    { emoji: '🛒', label: 'Acheter', text: 'Je veux acheter un livre' },
    { emoji: '📖', label: 'Lire', text: 'Je veux lire en ligne' },
    { emoji: '💡', label: 'Aide', text: 'Aide-moi' },
    { emoji: '🇸🇳', label: 'Sénégal', text: 'Auteurs sénégalais' },
  ];

  return (
    <div className={`flex flex-col ${compact ? 'h-full' : 'h-[calc(100vh-12rem)] max-h-[700px]'}`}>
      {/* Chat Header */}
      <div className="ai-chat-header">
        <div className="flex items-center gap-3">
          <div className="ai-chat-avatar">
            <Bot className="w-5 h-5 text-white" />
            <span className="ai-chat-status-dot" />
          </div>
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              BibliAI
              <span className="ai-badge-pro">IA</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {isLoading ? (
                <span className="ai-status-typing">
                  <span className="ai-typing-text">En train d'écrire</span>
                  <span className="ai-typing-ellipsis">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </span>
              ) : (
                <>Assistant intelligent · {messageCount} message{messageCount !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowQuickActions(v => !v)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              showQuickActions 
                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Questions rapides"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            title="Effacer la conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-border bg-card"
          >
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Questions rapides
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSuggestionClick(action.query)}
                    disabled={isLoading}
                    className="ai-quick-action-btn"
                  >
                    <span className="text-lg">{action.emoji}</span>
                    <span className="text-xs font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 relative">
        {messages.map((message) => (
          <div key={message.id}>
            <AIMessageBubble message={message} />
            {message.role === 'assistant' && message.books && (
              <AIRecommendations books={message.books} />
            )}
            {message.role === 'assistant' && message.recommendations && (
              <PersonalizedRecommendations recommendations={message.recommendations} />
            )}
            {/* Follow-up suggestions inline */}
            {message.role === 'assistant' && message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && !message.isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="ml-11 mt-2 flex flex-wrap gap-1.5"
              >
                {message.suggestedFollowUps.map((followUp) => (
                  <button
                    key={followUp}
                    onClick={() => handleSuggestionClick(followUp)}
                    disabled={isLoading}
                    className="ai-followup-btn"
                  >
                    {followUp}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="ai-scroll-bottom-btn"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Smart Suggestions Bar */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-card/80 backdrop-blur-sm">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Suggestions
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 ai-suggestions-scroll">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
                className="ai-suggestion-chip"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pictogram Keyboard */}
      <AnimatePresence>
        {showPicto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-card"
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">🤟 Clavier pictogrammes</p>
                <button onClick={() => setShowPicto(false)} className="p-1 rounded hover:bg-muted">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {PICTOGRAMS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleSuggestionClick(p.text)}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20 dark:hover:border-purple-700 transition-all text-center"
                  >
                    <span className="text-xl">{p.emoji}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-border bg-card rounded-b-xl"
      >
        <div className="flex items-center gap-2">
          {/* Bouton pictogrammes */}
          <button
            type="button"
            onClick={() => setShowPicto(v => !v)}
            className={`p-2.5 rounded-xl border transition-all flex-shrink-0 ${
              showPicto
                ? 'bg-purple-600 text-white border-purple-600'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
            title="Clavier pictogrammes (sourds-muets)"
          >
            🤟
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écris en français, wolof, pular... 🌍"
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="ai-send-btn"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
