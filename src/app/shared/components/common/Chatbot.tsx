import { Bot, MessageCircle, Send, Sparkles, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useApartmentsContext } from "../../contexts/ApartmentsContext";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../hooks/useFavorites";
import {
  fetchApartmentViews,
  fetchFavorites as fetchDashboardFavorites,
  fetchNotifications,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
  type DashboardNotificationRow,
} from "../../services/dashboardSupabaseService";
import {
  generateChatbotReply,
  getChatbotWelcome,
  getQuickPromptsForRole,
  type ChatbotReply,
} from "../../utils/chatbotEngine";
import { isTenantVisibleApartment } from "../../utils/listingVisibility";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  category?: ChatbotReply["category"];
  intent?: string;
  actions?: { label: string; path: string }[];
}

const CHAT_HISTORY_LIMIT = 30;

function chatStorageKey(userId?: string, role?: string | null) {
  return userId && role ? `rentiloilo_chat_history:${role}:${userId}` : null;
}

function serializeMessages(messages: Message[]) {
  return messages.slice(-CHAT_HISTORY_LIMIT).map((message) => ({
    ...message,
    timestamp: message.timestamp.toISOString(),
  }));
}

function restoreMessages(rawValue: string | null): Message[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as Array<Omit<Message, "timestamp"> & { timestamp: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((message) => message.sender === "user" || message.sender === "bot")
      .slice(-CHAT_HISTORY_LIMIT)
      .map((message) => ({
        ...message,
        timestamp: Number.isNaN(Date.parse(message.timestamp)) ? new Date() : new Date(message.timestamp),
      }));
  } catch {
    return [];
  }
}

interface ChatbotProps {
  userRole?: "student" | "employee" | "landlord" | "admin" | null;
}

export function Chatbot({ userRole }: ChatbotProps) {
  const navigate = useNavigate();
  const { user, users } = useAuth();
  const { apartments, isLoading, isRefreshing, error } = useApartmentsContext();
  const { favorites } = useFavorites();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [viewRows, setViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [favoriteRows, setFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotificationRow[]>([]);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const resolvedRole = userRole ?? null;
  const quickPrompts = useMemo(() => getQuickPromptsForRole(resolvedRole), [resolvedRole]);
  const assistantTitle = resolvedRole === "admin"
    ? "Admin Assistant"
    : resolvedRole === "landlord"
      ? "Landlord Assistant"
      : "Tenant Assistant";

  const liveListingCount = useMemo(
    () => apartments.filter(isTenantVisibleApartment).length,
    [apartments],
  );

  const chatContext = useMemo(
    () => ({
      apartments,
      isLoading: isLoading || runtimeLoading,
      isRefreshing,
      error,
      assistantWarning: runtimeError,
      userRole: resolvedRole,
      userId: user?.id,
      userName: user?.name,
      favoriteCount: favorites.length,
      users,
      viewRows,
      favoriteRows,
      notifications,
      history: messages.slice(-8).map((message) => ({
        sender: message.sender,
        text: message.text,
      })),
    }),
    [
      apartments,
      isLoading,
      isRefreshing,
      runtimeLoading,
      error,
      runtimeError,
      resolvedRole,
      user?.id,
      user?.name,
      favorites.length,
      users,
      viewRows,
      favoriteRows,
      notifications,
      messages,
    ],
  );

  const pushBotReply = useCallback((reply: ChatbotReply, requestId: number, originalQuestion: string) => {
    if (requestId !== requestIdRef.current) return;

    const botMessage: Message = {
      id: `${Date.now()}-bot`,
      text: reply.message,
      sender: "bot",
      timestamp: new Date(),
      category: reply.category,
      intent: reply.intent,
      actions: reply.actions,
    };

    setMessages((prev) => [...prev, botMessage]);
    setLastFailedQuestion(reply.category === "error" ? originalQuestion : null);
    setIsTyping(false);
  }, []);

  const respondToUser = useCallback(
    (userText: string, requestId: number) => {
      const reply = generateChatbotReply(userText, chatContext);
      typingTimerRef.current = setTimeout(() => pushBotReply(reply, requestId, userText), 500);
    },
    [chatContext, pushBotReply],
  );

  useEffect(() => {
    const key = chatStorageKey(user?.id, resolvedRole);
    setLastFailedQuestion(null);
    setInputValue("");

    if (!key) {
      setMessages([]);
      return;
    }

    setMessages(restoreMessages(localStorage.getItem(key)));
  }, [resolvedRole, user?.id]);

  useEffect(() => {
    const key = chatStorageKey(user?.id, resolvedRole);
    if (!key || messages.length === 0) return;
    localStorage.setItem(key, JSON.stringify(serializeMessages(messages)));
  }, [messages, resolvedRole, user?.id]);

  useEffect(() => {
    if (!isOpen || messages.length > 0) return;

    setMessages([
      {
        id: "welcome",
        text: getChatbotWelcome(user?.name, resolvedRole),
        sender: "bot",
        timestamp: new Date(),
        category: "project_answer",
        intent: "welcome",
        actions: resolvedRole === "admin"
          ? [{ label: "Open dashboard", path: "/dashboard" }]
          : resolvedRole === "landlord"
            ? [{ label: "My properties", path: "/dashboard?section=properties" }]
            : [{ label: "Browse apartments", path: "/browse" }],
      },
    ]);
  }, [isOpen, messages.length, resolvedRole, user?.name]);

  useEffect(() => {
    if (!isOpen || !user?.id || !resolvedRole) return;

    let active = true;
    setRuntimeLoading(true);
    setRuntimeError(null);

    const notificationRequest = fetchNotifications(user.id);
    const sharedRequests: Promise<[DashboardApartmentViewRow[], DashboardFavoriteRow[]]> = Promise.all([
      fetchApartmentViews(),
      fetchDashboardFavorites(),
    ]);

    void Promise.all([notificationRequest, sharedRequests])
      .then(([loadedNotifications, [loadedViews, loadedFavorites]]) => {
        if (!active) return;
        setNotifications(loadedNotifications);
        setViewRows(loadedViews);
        setFavoriteRows(loadedFavorites);
      })
      .catch((loadError) => {
        if (!active) return;
        console.warn("Failed to load chatbot runtime data:", loadError);
        setRuntimeError("Some assistant data could not be loaded.");
      })
      .finally(() => {
        if (active) setRuntimeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, resolvedRole, user?.id]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const appendBotMessage = (text: string, category: ChatbotReply["category"], intent: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-bot-${intent}`,
        text,
        sender: "bot",
        timestamp: new Date(),
        category,
        intent,
      },
    ]);
  };

  const handleSend = (text?: string) => {
    if (isTyping) return;

    const trimmed = (text ?? inputValue).trim();
    if (!trimmed) {
      appendBotMessage("Please enter a question about the platform.", "clarification", "empty");
      return;
    }

    if (trimmed.length > 800) {
      appendBotMessage("Please keep your question shorter and focused on the platform.", "clarification", "message_too_long");
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      text: trimmed,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);
    setLastFailedQuestion(null);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    respondToUser(trimmed, requestId);
  };

  const retryLastQuestion = () => {
    if (!lastFailedQuestion || isTyping) return;
    const question = lastFailedQuestion;
    setLastFailedQuestion(null);
    handleSend(question);
  };

  const handleAction = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const assistantStatus = isLoading
    ? "Loading platform data..."
    : isRefreshing || runtimeLoading
      ? "Refreshing live data..."
    : error
      ? "Workflow tips only"
      : runtimeError
        ? "Live listings, limited analytics"
      : resolvedRole === "admin"
        ? "Project-only admin help"
        : resolvedRole === "landlord"
          ? "Project-only landlord help"
          : `${liveListingCount} live listings`;

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          aria-label="Open apartment assistant chat"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full border-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:from-amber-600 hover:to-orange-700"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 mx-6 flex h-[min(640px,calc(100vh-3rem))] w-full max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl sm:mx-0 sm:w-[400px]">
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{assistantTitle}</h3>
                <p className="flex items-center gap-1 text-xs opacity-90">
                  <Sparkles className="h-3 w-3" />
                  {assistantStatus}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="rounded-full text-white hover:bg-white/20"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-amber-50/50 to-white p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.sender === "bot" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <Bot className="h-4 w-4 text-amber-700" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${message.sender === "user" ? "order-first" : ""}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        message.sender === "user"
                          ? "rounded-br-md bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                          : message.category === "unrelated" || message.category === "unauthorized" || message.category === "error"
                            ? "rounded-bl-md border border-red-100 bg-white text-slate-800 shadow-sm"
                            : "rounded-bl-md border border-amber-100 bg-white text-slate-800 shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{renderMessageText(message.text)}</p>
                      <p className={`mt-1.5 text-[10px] ${message.sender === "user" ? "text-amber-100" : "text-slate-400"}`}>
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {message.sender === "bot" && message.actions && message.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {message.actions.map((action) => (
                          <Button
                            key={`${message.id}-${action.path}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-full border-amber-200 text-xs text-amber-800 hover:bg-amber-50"
                            onClick={() => handleAction(action.path)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.sender === "user" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start gap-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Bot className="h-4 w-4 text-amber-700" />
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:0ms]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:150ms]" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              {lastFailedQuestion && !isTyping && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={retryLastQuestion}
                    className="h-8 rounded-full border-red-200 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Retry last question
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-amber-100 bg-white px-3 pb-1 pt-2">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Quick questions
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleSend(prompt.message)}
                  className="flex-shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-amber-100 bg-white p-3">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about platform features..."
                className="flex-1 rounded-xl border-amber-200 focus-visible:ring-amber-400"
                disabled={isTyping}
                maxLength={800}
                aria-label="Ask the platform assistant"
              />
              <Button
                onClick={() => handleSend()}
                disabled={inputValue.trim() === "" || isTyping}
                className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
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
