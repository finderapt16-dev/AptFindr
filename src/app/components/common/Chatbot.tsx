import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useApartmentsContext } from '../../contexts/ApartmentsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../hooks/useFavorites';
import {
  generateChatbotReply,
  getTenantWelcome,
  TENANT_QUICK_PROMPTS,
  type ChatbotReply,
} from '../../utils/chatbotEngine';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  actions?: { label: string; path: string }[];
}

interface ChatbotProps {
  userRole?: 'student' | 'employee' | 'landlord' | 'admin' | null;
}

export function Chatbot({ userRole }: ChatbotProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { apartments, isLoading, error } = useApartmentsContext();
  const { favorites } = useFavorites();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatContext = useMemo(
    () => ({
      apartments,
      isLoading,
      error,
      userRole: userRole ?? null,
      userName: user?.name,
      favoriteCount: favorites.length,
    }),
    [apartments, isLoading, error, userRole, user?.name, favorites.length],
  );

  const pushBotReply = useCallback((reply: ChatbotReply) => {
    const botMessage: Message = {
      id: `${Date.now()}-bot`,
      text: reply.text,
      sender: 'bot',
      timestamp: new Date(),
      actions: reply.actions,
    };
    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
  }, []);

  const respondToUser = useCallback(
    (userText: string) => {
      const reply = generateChatbotReply(userText, chatContext);
      typingTimerRef.current = setTimeout(() => pushBotReply(reply), 650);
    },
    [chatContext, pushBotReply],
  );

  useEffect(() => {
    if (!isOpen || messages.length > 0) return;

    setMessages([
      {
        id: 'welcome',
        text: getTenantWelcome(user?.name),
        sender: 'bot',
        timestamp: new Date(),
        actions: [{ label: 'Browse apartments', path: '/browse' }],
      },
    ]);
  }, [isOpen, messages.length, user?.name]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (text?: string) => {
    const trimmed = (text ?? inputValue).trim();
    if (trimmed === '') return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    respondToUser(trimmed);
  };

  const handleQuickPrompt = (message: string) => {
    handleSend(message);
  };

  const handleAction = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          aria-label="Open apartment assistant chat"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full sm:w-[400px] h-[min(640px,calc(100vh-3rem))] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-amber-100 mx-6 sm:mx-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Tenant Assistant</h3>
                <p className="text-xs opacity-90 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {isLoading
                    ? 'Loading listings…'
                    : error
                      ? 'Offline tips only'
                      : `${apartments.filter((a) => a.isPublished !== false).length} live listings`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-amber-50/50 to-white">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'bot' && (
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-amber-700" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${message.sender === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 border border-amber-100 shadow-sm rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{renderMessageText(message.text)}</p>
                      <p
                        className={`text-[10px] mt-1.5 ${
                          message.sender === 'user' ? 'text-amber-100' : 'text-slate-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {message.sender === 'bot' && message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {message.actions.map((action) => (
                          <Button
                            key={`${message.id}-${action.path}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-full border-amber-200 text-amber-800 hover:bg-amber-50"
                            onClick={() => handleAction(action.path)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.sender === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 justify-start">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-amber-700" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-white border border-amber-100 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="px-3 pt-2 pb-1 border-t border-amber-100 bg-white">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">
              Quick questions
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
              {TENANT_QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleQuickPrompt(prompt.message)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-amber-100 bg-white">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about listings, price, map, favorites…"
                className="flex-1 rounded-xl border-amber-200 focus-visible:ring-amber-400"
                disabled={isTyping}
              />
              <Button
                onClick={() => handleSend()}
                disabled={inputValue.trim() === '' || isTyping}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shrink-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
