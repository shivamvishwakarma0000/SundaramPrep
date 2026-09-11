import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  BookOpen, 
  ExternalLink
} from 'lucide-react';
import { api } from '../../api/client';
import type { Question } from '../../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  modelUsed?: string;
  notice?: string;
}

interface SundaramAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activeQuestionContext?: Question | null;
  initialPrompt?: string | null;
}

export const SundaramAIAssistant: React.FC<SundaramAIAssistantProps> = ({
  isOpen,
  onClose,
  activeQuestionContext,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Namaste! I am **Sundaram AI**, your dedicated exam preparation mentor.\n\nI deliver high-yield conceptual clarity, mnemonics, and doubt resolution. How can I help you today?",
      timestamp: 'Just now',
    },
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [languageMode, setLanguageMode] = useState<'EN' | 'HI' | 'HINGLISH'>('EN');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle initial prompt if passed from another view
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  const handleSend = async (queryToSend?: string) => {
    const query = (queryToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.askAssistant(
        query,
        activeQuestionContext
          ? {
              question_text: activeQuestionContext.question_text,
              options: activeQuestionContext.options,
              correct_answer: activeQuestionContext.correct_answer,
              subject: activeQuestionContext.subject,
            }
          : undefined,
        languageMode
      );

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources,
        modelUsed: res.model_used,
        notice: res.notice,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error connecting to Sundaram AI: ${err.message || 'Please check connection'}`,
        timestamp: 'Error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const quickChips = [
    { label: 'Explain in Hinglish', action: 'Explain this concept in conversational Hinglish with a practical example.' },
    { label: 'Give Memory Trick', action: 'Give me a high-retention memory trick or mnemonic for this topic.' },
    { label: 'Why is my answer wrong?', action: 'Why is my selected answer wrong and what was the conceptual trap?' },
    { label: 'Summarize Topic', action: 'Give me a 2-minute high-yield summary of this subject topic for quick revision.' },
    { label: 'Create 5 MCQs', action: 'Generate 5 high-yield MCQs from this topic with answer keys and explanations.' },
    { label: 'Current Affairs Link', action: 'What are the most recent 2024-2026 developments or Supreme Court rulings on this topic?' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-dark-card h-full shadow-2xl flex flex-col border-l border-cool-200 dark:border-dark-border animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-cool-200 dark:border-dark-border bg-gradient-to-r from-brand-950 to-brand-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/80 border border-violet-400/40 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-violet-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold font-display text-white">
                  Sundaram AI
                </h3>
                <span className="text-[10px] bg-violet-500/30 text-violet-200 px-1.5 py-0.2 rounded border border-violet-400/30">
                  Study Mentor
                </span>
              </div>
              <p className="text-[11px] text-brand-300">
                Practice. Focus. Improve.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10 text-xs">
              {(['EN', 'HI', 'HINGLISH'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguageMode(lang)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    languageMode === lang
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-brand-200 hover:text-white'
                  }`}
                >
                  {lang === 'HINGLISH' ? 'Hinglish' : lang === 'HI' ? 'हिंदी' : 'Eng'}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-brand-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active Context Banner if question is selected */}
        {activeQuestionContext && (
          <div className="bg-cool-100 dark:bg-dark-surface border-b border-cool-200 dark:border-dark-border px-4 py-2 text-xs flex items-center justify-between text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 truncate">
              <BookOpen className="w-3.5 h-3.5 text-brand-700 dark:text-royal-400 flex-shrink-0" />
              <span className="font-semibold text-brand-950 dark:text-white">Context:</span>
              <span className="truncate">{activeQuestionContext.topic} ({activeQuestionContext.subject})</span>
            </div>
            <span className="text-[10px] text-royal-600 dark:text-royal-400 font-bold bg-white dark:bg-dark-card px-1.5 py-0.5 rounded border border-cool-200 dark:border-dark-border">
              Active
            </span>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cool-50/50 dark:bg-dark-bg">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm shadow-xs ${
                    isUser
                      ? 'bg-royal-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-dark-card text-slate-800 dark:text-slate-100 border border-cool-200 dark:border-dark-border rounded-tl-xs space-y-2'
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed font-normal">
                    {msg.text}
                  </div>

                  {/* Sources or References */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-cool-100 dark:border-dark-border text-[11px] text-slate-500 dark:text-dark-muted">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>Verified Reference Sources:</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {msg.sources.map((src, i) => (
                          <li key={i}>{src}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Development notice */}
                  {msg.notice && (
                    <div className="mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200 dark:border-amber-900/50">
                      {msg.notice}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-dark-muted mt-1 px-1">{msg.timestamp}</span>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/50 p-3 rounded-2xl w-fit animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin text-violet-600 dark:text-violet-400" />
              <span>Sundaram AI is formulating high-yield explanation...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div className="p-2 border-t border-cool-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-x-auto scrollbar-none flex items-center gap-1.5">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.action)}
              className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-cool-100 dark:bg-dark-surface hover:bg-violet-100 dark:hover:bg-violet-950/50 hover:text-violet-900 dark:hover:text-violet-300 text-slate-700 dark:text-slate-300 border border-cool-200 dark:border-dark-border transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Bar with safe area padding */}
        <div className="p-3 pb-safe border-t border-cool-200 dark:border-dark-border bg-white dark:bg-dark-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Sundaram AI (e.g. 'Give memory trick for DPSP')..."
              className="flex-1 bg-cool-100 dark:bg-dark-surface text-xs sm:text-sm py-2.5 px-3.5 rounded-xl border border-cool-200 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="bg-brand-950 dark:bg-brand-600 hover:bg-brand-900 dark:hover:bg-brand-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
