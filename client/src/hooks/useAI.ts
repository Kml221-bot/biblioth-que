import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AIMessage,
  getAIResponse,
  createUserMessage,
  clearConversationHistory,
  saveMessagesToStorage,
  loadMessagesFromStorage,
  clearStoredMessages,
  getSmartSuggestions,
  getPersonalizedRecommendations,
} from '@/services/aiService';

const WELCOME_MESSAGE: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Bonjour ! 👋 Je suis **BibliAI**, l\'assistant intelligent de BiblioTech — propulsé par l\'IA.\n\nJe parle **français, wolof, pular et d\'autres langues** — écris-moi dans ta langue ! 🌍\n\nJe peux t\'aider à :\n- 🌍 Découvrir la **littérature africaine & sénégalaise**\n- ⛩️ Explorer notre section **Manga & BD**\n- 📚 Trouver un livre selon tes goûts\n- 🎯 Obtenir des **recommandations personnalisées**\n- 💡 Répondre à tes questions sur la bibliothèque\n\nQue puis-je faire pour toi ? 😊',
  timestamp: new Date(),
  suggestedFollowUps: [
    '📚 Recommande-moi un livre',
    '🌍 Découvrir la littérature sénégalaise',
    '⛩️ Quels mangas avez-vous ?',
  ],
};

export function useAI(bookId?: string) {
  const bookWelcome: AIMessage = bookId ? {
    id: 'welcome-book',
    role: 'assistant',
    content: '📖 Bonjour ! Je suis **BibliAI**, ton tuteur IA.\n\nJ\'ai accès au contenu de ce livre. Pose-moi n\'importe quelle question :\n- Résumé d\'un chapitre\n- Explication d\'un passage\n- Quiz sur le livre\n- Analyse des personnages\n\nEcris ta question ci-dessous 👇',
    timestamp: new Date(),
    suggestedFollowUps: ['Fais-moi un résumé', 'Crée un quiz sur ce livre', 'Explique le thème principal'],
  } : WELCOME_MESSAGE;

  const [messages, setMessages] = useState<AIMessage[]>(() => {
    if (bookId) return [bookWelcome];
    // Charger l'historique depuis le localStorage
    const stored = loadMessagesFromStorage();
    if (stored && stored.length > 1) return stored;
    return [WELCOME_MESSAGE];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => getSmartSuggestions([WELCOME_MESSAGE]));
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sauvegarder les messages à chaque changement
  useEffect(() => {
    if (messages.length > 1) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);

  // Mettre à jour les suggestions quand les messages changent
  useEffect(() => {
    const nonTypingMessages = messages.filter(m => !m.isTyping);
    setSuggestions(getSmartSuggestions(nonTypingMessages));
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = createUserMessage(content.trim());
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Ajouter un message "typing" temporaire
    const typingMessage: AIMessage = {
      id: 'typing-indicator',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await getAIResponse(content.trim(), bookId);
      
      // Retirer le message "typing" et ajouter la vraie réponse
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing-indicator');
        return [...filtered, response];
      });
    } catch {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing-indicator');
        return [
          ...filtered,
          {
            id: Math.random().toString(36).substr(2, 9),
            role: 'assistant',
            content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearChat = useCallback(() => {
    clearConversationHistory();
    clearStoredMessages();
    setMessages([WELCOME_MESSAGE]);
    setSuggestions(getSmartSuggestions([WELCOME_MESSAGE]));
  }, []);

  const personalizedRecs = getPersonalizedRecommendations();

  return {
    messages,
    isLoading,
    suggestions,
    personalizedRecs,
    sendMessage,
    clearChat,
    messageCount: messages.filter(m => m.role === 'user').length,
  };
}
