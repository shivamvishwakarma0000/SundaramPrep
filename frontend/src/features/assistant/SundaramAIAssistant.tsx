import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  BookOpen, 
  ExternalLink,
  Square,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  BrainCircuit,
  Compass,
  Zap
} from 'lucide-react';
import { api, streamAssistantChat } from '../../api/client';
import type { Question } from '../../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  modelUsed?: string;
  notice?: string;
  isStreaming?: boolean;
}

interface SundaramAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activeQuestionContext?: Question | null;
  initialPrompt?: string | null;
}

const WELCOME_PROMPTS = [
  {
    icon: Zap,
    title: 'Polity Memory Trick',
    query: 'Give me a high-retention memory trick for Fundamental Rights Articles 14 to 32.',
    category: 'Memory Trick'
  },
  {
    icon: BrainCircuit,
    title: 'Economy Mechanism',
    query: 'Why does the Reserve Bank of India increase the Repo Rate during inflation? Explain the transmission channel.',
    category: 'Conceptual'
  },
  {
    icon: Compass,
    title: 'Geography & Ecology',
    query: 'What is the exact legal and ecological difference between a National Park and a Wildlife Sanctuary under WPA 1972?',
    category: 'High-Yield'
  },
  {
    icon: HelpCircle,
    title: 'Sundaram Prep Strategy',
    query: 'How does Sundaram Prep help me eliminate repeated mistakes, and what is the best strategy for Focus Mode?',
    category: 'Strategy'
  }
];

export const SundaramAIAssistant: React.FC<SundaramAIAssistantProps> = ({
  isOpen,
  onClose,
  activeQuestionContext,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [languageMode, setLanguageMode] = useState<'EN' | 'HI' | 'HINGLISH'>('EN');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle initial prompt if passed from question action
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Adjust textarea height dynamically
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearConversation = () => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
    setMessages([]);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setMessages(prev => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].sender === 'assistant') {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          isStreaming: false,
          notice: 'Generation stopped by user'
        };
      }
      return updated;
    });
  };

  const handleSend = async (customQuery?: string) => {
    const query = (customQuery || inputQuery).trim();
    if (!query || isGenerating) return;

    // Reset input
    if (!customQuery) {
      setInputQuery('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now() + 1}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: Message = {
      id: userMessageId,
      sender: 'user',
      text: query,
      timestamp,
    };

    const initialAssistantMsg: Message = {
      id: assistantMessageId,
      sender: 'assistant',
      text: '',
      timestamp,
      isStreaming: true,
    };

    // Prepare conversation history for backend context
    const conversationHistory = messages.map(m => ({
      role: m.sender as 'user' | 'assistant',
      content: m.text,
    }));

    setMessages(prev => [...prev, userMsg, initialAssistantMsg]);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';

    const contextPayload = activeQuestionContext ? {
      question_text: activeQuestionContext.question_text,
      options: activeQuestionContext.options,
      correct_answer: activeQuestionContext.correct_answer,
      subject: activeQuestionContext.subject,
      topic: activeQuestionContext.topic,
    } : undefined;

    try {
      await streamAssistantChat(
        {
          query,
          conversation_history: conversationHistory,
          context: contextPayload,
          language_mode: languageMode,
        },
        (token: string) => {
          accumulatedText += token;
          setMessages(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(m => m.id === assistantMessageId);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                text: accumulatedText,
                isStreaming: true,
              };
            }
            return updated;
          });
        },
        (doneData) => {
          setMessages(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(m => m.id === assistantMessageId);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                isStreaming: false,
                modelUsed: doneData.model_used,
                sources: doneData.sources,
              };
            }
            return updated;
          });
          setIsGenerating(false);
          abortControllerRef.current = null;
        },
        async (error) => {
          // Fallback to standard request if stream failed
          try {
            const fallbackRes = await api.askAssistant(
              query,
              contextPayload,
              languageMode
            );
            setMessages(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(m => m.id === assistantMessageId);
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  text: fallbackRes.reply,
                  modelUsed: fallbackRes.model_used,
                  sources: fallbackRes.sources,
                  notice: fallbackRes.notice,
                  isStreaming: false,
                };
              }
              return updated;
            });
          } catch (fbErr: any) {
            setMessages(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(m => m.id === assistantMessageId);
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  text: `I encountered a momentary connection disruption: ${error.message || 'Service unavailable'}. Please try again or rephrase.`,
                  isStreaming: false,
                };
              }
              return updated;
            });
          } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
          }
        },
        controller.signal
      );
    } catch {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateLast = () => {
    // Find last user message
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
    if (lastUserMsg && !isGenerating) {
      handleSend(lastUserMsg.text);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Sundaram AI Chat Assistant"
    >
      <div 
        className="w-full sm:max-w-[460px] md:max-w-[500px] bg-slate-50 dark:bg-slate-950 h-full shadow-2xl flex flex-col border-l border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-right duration-300 relative"
      >
        {/* Modern Header */}
        <header className="p-3.5 sm:p-4 border-b border-slate-800 bg-[#0B2545] text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-md flex-shrink-0">
              <div className="w-full h-full rounded-[10px] bg-[#0B2545] flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-sky-400" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-[#0B2545]"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black font-display text-white tracking-tight">
                  Sundaram AI
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-300 border border-blue-400/30">
                  Mentor
                </span>
              </div>
              <p className="text-[11px] text-sky-200/80 font-medium leading-none">
                UPSC • SSC • State PSCs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10 text-xs">
              {(['EN', 'HI', 'HINGLISH'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguageMode(lang)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    languageMode === lang
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title={`Switch to ${lang}`}
                >
                  {lang === 'HINGLISH' ? 'Hinglish' : lang === 'HI' ? 'हिंदी' : 'Eng'}
                </button>
              ))}
            </div>

            {/* Clear Conversation */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearConversation}
                className="p-1.5 rounded-xl text-slate-300 hover:text-rose-300 hover:bg-white/10 transition-colors cursor-pointer"
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Active Question Context Bar */}
        {activeQuestionContext && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50 px-3.5 py-2 text-xs flex items-center justify-between text-blue-950 dark:text-blue-200 shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="font-semibold">Context Active:</span>
              <span className="truncate">{activeQuestionContext.topic} ({activeQuestionContext.subject})</span>
            </div>
            <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
              Exam Drill
            </span>
          </div>
        )}

        {/* Message Feed / Welcome Screen */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-6 px-2 space-y-5 animate-in fade-in duration-300">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-blue-600 dark:text-sky-400" />
                </div>
              </div>

              <div className="max-w-xs space-y-1.5">
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                  Sundaram AI Study Mentor
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  Your 24/7 competitive exam assistant for instant high-yield answers, doubt clearing, and ranker strategy.
                </p>
              </div>

              {/* Suggested Questions Grid */}
              <div className="w-full space-y-2 pt-2 text-left">
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Suggested Prompts:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {WELCOME_PROMPTS.map((prompt, idx) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(prompt.query)}
                        className="group flex items-start gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors truncate">
                              {prompt.title}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                              {prompt.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 font-medium">
                            {prompt.query}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isCopied = copiedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs shadow-sm font-medium'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-xs space-y-2.5 shadow-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    ) : (
                      <>
                        {msg.text ? (
                          <div className="relative leading-relaxed">
                            <MarkdownRenderer content={msg.text} />
                            {msg.isStreaming && (
                              <span className="inline-block w-1.5 h-4 ml-1 bg-blue-600 animate-pulse align-middle" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-1 text-xs text-blue-600 dark:text-sky-400 font-bold">
                            <Sparkles className="w-4 h-4 animate-spin" />
                            <span className="animate-pulse">Sundaram AI is preparing answer...</span>
                          </div>
                        )}

                        {/* Verified Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                            <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3 text-blue-600 dark:text-sky-400" />
                              <span>Reference:</span>
                            </div>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {msg.sources.map((src, i) => (
                                <li key={i}>{src}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Model Tag or Notice */}
                        {msg.notice && (
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                            {msg.notice}
                          </div>
                        )}

                        {/* Actions on Assistant Message */}
                        {!msg.isStreaming && msg.text && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {msg.modelUsed ? `Model: ${msg.modelUsed}` : 'Sundaram Prep Verified'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.text)}
                                className="flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer font-bold"
                                title="Copy answer"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-[10px] text-emerald-500">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span className="text-[10px]">Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions / Status Footer */}
        {isGenerating ? (
          <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0">
            <button
              type="button"
              onClick={handleStopGeneration}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Generating</span>
            </button>
          </div>
        ) : messages.length > 0 && (
          <div className="px-3.5 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs shrink-0">
            <button
              type="button"
              onClick={handleRegenerateLast}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 font-bold transition-colors cursor-pointer"
              title="Regenerate last response"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Regenerate last answer</span>
            </button>
            <span className="text-[10px] text-slate-400 font-medium">
              Enter to send
            </span>
          </div>
        )}

        {/* Input Composer */}
        <footer className="p-3 pb-safe border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500 transition-all"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => {
                setInputQuery(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Sundaram AI any question..."
              className="flex-1 bg-transparent text-xs sm:text-sm py-2 px-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none max-h-32 min-h-[38px] scrollbar-none font-medium"
            />
            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl transition-colors shadow-xs flex items-center justify-center cursor-pointer shrink-0"
                title="Stop generation"
                aria-label="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputQuery.trim()}
                className="bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 p-2 rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0"
                title="Send message"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </footer>
      </div>
    </div>
  );
};
