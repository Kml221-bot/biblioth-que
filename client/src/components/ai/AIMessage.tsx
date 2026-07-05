import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check } from 'lucide-react';
import { AIMessage as AIMessageType } from '@/services/aiService';

interface AIMessageProps {
  message: AIMessageType;
}

export const AIMessageBubble: React.FC<AIMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Effet de typing progressif pour les messages de l'assistant
  useEffect(() => {
    if (isUser || message.isTyping) {
      setDisplayedText(message.content);
      return;
    }

    // Ne pas animer les anciens messages (chargés depuis le storage)
    const isRecent = Date.now() - new Date(message.timestamp).getTime() < 5000;
    if (!isRecent) {
      setDisplayedText(message.content);
      return;
    }

    setIsAnimating(true);
    setDisplayedText('');
    
    const text = message.content;
    let currentIndex = 0;
    const chunkSize = 3; // Caractères par tick pour un effet fluide mais rapide
    
    const interval = setInterval(() => {
      currentIndex += chunkSize;
      if (currentIndex >= text.length) {
        setDisplayedText(text);
        setIsAnimating(false);
        clearInterval(interval);
      } else {
        setDisplayedText(text.slice(0, currentIndex));
      }
    }, 15);

    return () => clearInterval(interval);
  }, [message.content, message.isTyping, isUser, message.timestamp]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // Indicateur de typing
  if (message.isTyping) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="ai-typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className="max-w-[80%] relative">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {renderContent(displayedText)}
            {isAnimating && (
              <span className="ai-cursor-blink">|</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className={`text-[10px] ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
              {new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {!isUser && !isAnimating && (
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
                title="Copier"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function renderContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const italicParts = part.split(/(\*[^*]+\*)/g);
    return italicParts.map((sub, j) => {
      if (sub.startsWith('*') && sub.endsWith('*')) {
        return (
          <em key={`${i}-${j}`} className="italic">
            {sub.slice(1, -1)}
          </em>
        );
      }
      return <span key={`${i}-${j}`}>{sub}</span>;
    });
  });
}
