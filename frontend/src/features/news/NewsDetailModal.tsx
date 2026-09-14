import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Bookmark, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Send, 
  Share2, 
  Layers, 
  BookOpen, 
  Check,
  Zap
} from 'lucide-react';
import { api } from '../../api/client';
import type { NewsArticleItem } from '../../types';

interface NewsDetailModalProps {
  articleId: string | null;
  onClose: () => void;
  onBookmarkToggled?: (articleId: string, isBookmarked: boolean) => void;
  onBookmarkToggle?: () => void;
}

type AIViewMode = 'STANDARD' | 'SHORT' | 'DETAILED' | 'SIMPLE' | 'PRELIMS' | 'MAINS' | 'HINDI' | 'HINGLISH';

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  articleId,
  onClose,
  onBookmarkToggled,
  onBookmarkToggle
}) => {
  const [article, setArticle] = useState<NewsArticleItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiMode, setAiMode] = useState<AIViewMode>('STANDARD');
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  
  // MCQ Interactive State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({});

  // Contextual Chat State
  const [chatQuery, setChatQuery] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!articleId) return;

    let isMounted = true;
    async function loadArticle() {
      setLoading(true);
      try {
        const res = await api.getNewsDetail(articleId!);
        if (isMounted && res) {
          setArticle(res);
          setIsBookmarked(Boolean(res.is_bookmarked));
        }
      } catch (e) {
        // Safe fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadArticle();
    return () => { isMounted = false; };
  }, [articleId]);

  if (!articleId) return null;

  const handleAIModeChange = async (mode: AIViewMode) => {
    setAiMode(mode);
    if (mode === 'STANDARD') {
      setAiContent(null);
      return;
    }

    setAiLoading(true);
    const actionMap: Record<string, string> = {
      SHORT: 'SHORT_SUMMARY',
      DETAILED: 'DETAILED_EXPLANATION',
      SIMPLE: 'EXPLAIN_SIMPLY',
      PRELIMS: 'PRELIMS_NOTES',
      MAINS: 'MAINS_NOTES',
      HINDI: 'HINDI',
      HINGLISH: 'HINGLISH',
    };

    try {
      const res = await api.executeNewsAIAction(articleId, actionMap[mode] || 'EXPLAIN_SIMPLY');
      if (res?.result) {
        setAiContent(res.result);
      }
    } catch (e) {
      setAiContent('Could not generate transformation. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!article) return;
    try {
      const token = localStorage.getItem('sundaram_token');
      if (!token) {
        alert('Please sign in to save articles to your revision notebook.');
        return;
      }
      const nextState = !isBookmarked;
      setIsBookmarked(nextState);
      await api.toggleNewsBookmark(article.id, nextState ? 'POST' : 'DELETE');
      onBookmarkToggled?.(article.id, nextState);
      onBookmarkToggle?.();
    } catch (e) {
      setIsBookmarked(!isBookmarked);
    }
  };

  const handleOptionSelect = (mcqIndex: number, optionId: string) => {
    setSelectedAnswers(prev => ({ ...prev, [mcqIndex]: optionId }));
    setRevealedExplanations(prev => ({ ...prev, [mcqIndex]: true }));
  };

  const handleSendChat = async (promptToSend?: string) => {
    const query = (promptToSend || chatQuery).trim();
    if (!query || chatLoading || !article) return;

    const newHistory = [...chatHistory, { role: 'user', content: query }];
    setChatHistory(newHistory);
    setChatQuery('');
    setChatLoading(true);

    try {
      const res = await api.chatAboutNews(article.id, query, chatHistory);
      if (res?.reply) {
        setChatHistory([...newHistory, { role: 'assistant', content: res.reply }]);
      }
    } catch (e) {
      setChatHistory([...newHistory, { role: 'assistant', content: 'Temporary network glitch. Please try asking again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && article) {
      navigator.clipboard.writeText(`${article.title} - Read UPSC Analysis on Sundaram Prep: ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-4xl w-full h-[92vh] max-h-[920px] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-dark-card/50 shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {article && (
              <>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                  {article.category}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {article.gs_paper}
                </span>
                <span className="text-xs text-slate-500 dark:text-dark-muted font-medium">
                  {article.source}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleToggleBookmark}
              aria-label={isBookmarked ? "Remove from saved" : "Save article"}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-300 dark:border-amber-800'
                  : 'bg-white dark:bg-dark-card text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-900'
              }`}
              title={isBookmarked ? "Saved in revision list" : "Save article"}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              aria-label="Share article"
              className="p-2 rounded-xl bg-white dark:bg-dark-card text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Share / Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Quick Transformation Toolbar */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-blue-50/60 via-purple-50/40 to-indigo-50/60 dark:from-slate-900/80 dark:via-purple-950/20 dark:to-indigo-950/20 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-black text-blue-700 dark:text-blue-400 mr-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Lens:</span>
          </div>
          {[
            { id: 'STANDARD', label: 'Full Analysis' },
            { id: 'SHORT', label: '⚡ 60-Word Summary' },
            { id: 'SIMPLE', label: '🌱 Explain Simply' },
            { id: 'PRELIMS', label: '🎯 Prelims Notes' },
            { id: 'MAINS', label: '📝 Mains Notes' },
            { id: 'HINDI', label: '🇮🇳 हिंदी' },
            { id: 'HINGLISH', label: '🗣️ Hinglish' },
          ].map((tab) => {
            const isActive = aiMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleAIModeChange(tab.id as AIViewMode)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs scale-102'
                    : 'bg-white/80 dark:bg-dark-card hover:bg-white text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-7">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500 font-medium">Synthesizing UPSC Analysis with Gemini AI...</span>
            </div>
          ) : article ? (
            <>
              {/* Hero Image with GS Paper & Category Badges */}
              <div className="relative w-full h-52 sm:h-64 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-800">
                <img
                  src={article.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80'}
                  alt={article.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 text-white shadow-md border border-white/20 backdrop-blur-md">
                    {article.gs_paper || 'GS-II'}
                  </span>
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-black/60 text-white border border-white/10 backdrop-blur-md">
                    {article.category || 'General Studies'}
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white/95 font-medium">
                  <span className="font-bold drop-shadow-xs">{article.source}</span>
                  <span className="bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-xs text-[11px] font-bold">
                    {article.read_time_minutes || 3} min read
                  </span>
                </div>
              </div>

              {/* Article Headline & Metadata */}
              <div className="space-y-3">
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white leading-tight">
                  {article.title}
                </h1>

                <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-dark-muted flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Source: {article.source}
                    </span>
                    <span>•</span>
                    <span>{new Date(article.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>•</span>
                    <span>{article.read_time_minutes || 3} min read</span>
                  </div>

                  {article.original_url && article.original_url !== '#' && (
                    <a
                      href={article.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Read Original Article</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Dynamic AI Mode Output Banner (when non-standard mode chosen) */}
              {aiMode !== 'STANDARD' && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/90 dark:from-slate-900 dark:via-blue-950/40 dark:to-purple-950/40 border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Gemini UPSC Lens: {aiMode}
                    </span>
                    <button
                      onClick={() => handleAIModeChange('STANDARD')}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Back to Standard
                    </button>
                  </div>
                  {aiLoading ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-blue-600 font-bold">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Generating customized perspective...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-800 dark:text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">
                      {aiContent}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 1: Why in News & What Happened */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Why is it in the News?</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {article.why_in_news || article.short_summary}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>What Happened? (Core Facts)</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {article.what_happened || article.detailed_summary || article.short_summary}
                  </p>
                </div>
              </div>

              {/* SECTION 2: Background & UPSC Relevance */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Institutional Background & Constitutional Context</span>
                </h3>
                <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {article.background || "Contextual background aligned with official administrative notifications and statutory precedents."}
                </div>
              </div>

              {/* SECTION 3: High-Yield Prelims Perspective */}
              {article.prelims_facts && article.prelims_facts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Prelims High-Yield Facts</span>
                    </h3>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                      Direct MCQ Traps
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                    <ul className="space-y-2">
                      {article.prelims_facts.map((fact, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* SECTION 4: Comprehensive Mains Perspective */}
              {article.mains_perspective && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Mains Analytical Perspective</span>
                  </h3>
                  <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 space-y-4">
                    {article.mains_perspective.dimensions && (
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-500 dark:text-dark-muted mb-1.5">
                          Multi-Dimensional Angles:
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {article.mains_perspective.dimensions.map((dim, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-900/60">
                              {dim}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {article.mains_perspective.challenges && article.mains_perspective.challenges.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 mb-1">
                          Key Challenges & Governance Bottlenecks:
                        </h4>
                        <ul className="list-disc list-inside text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
                          {article.mains_perspective.challenges.map((ch, idx) => (
                            <li key={idx}>{ch}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {article.mains_perspective.way_forward && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 mb-1">
                          Way Forward & Policy Roadmap:
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                          {article.mains_perspective.way_forward}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 5: Possible Mains Question */}
              {article.possible_mains_questions && article.possible_mains_questions.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/50 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
                    UPSC Mains Practice Question
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed italic">
                    "{article.possible_mains_questions[0]}"
                  </p>
                </div>
              )}

              {/* SECTION 6: Practice MCQs (Interactive Self-Check) */}
              {article.practice_mcqs && article.practice_mcqs.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Interactive Practice MCQs ({article.practice_mcqs.length})</span>
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-dark-muted font-medium">
                      Test your immediate retention
                    </span>
                  </div>

                  <div className="space-y-4">
                    {article.practice_mcqs.map((mcq, idx) => {
                      const userSelection = selectedAnswers[idx];
                      const isRevealed = revealedExplanations[idx];
                      const isCorrect = userSelection === mcq.correct_answer;

                      return (
                        <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 space-y-3.5">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                            <span className="text-blue-600 dark:text-sky-400 font-black mr-1.5">Q{idx + 1}.</span>
                            {mcq.question}
                          </p>

                          {/* Options */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {mcq.options.map((opt) => {
                              const isThisSelected = userSelection === opt.id;
                              const isThisCorrect = opt.id === mcq.correct_answer;

                              let optClass = "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";
                              if (isRevealed) {
                                if (isThisCorrect) {
                                  optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-bold";
                                } else if (isThisSelected && !isCorrect) {
                                  optClass = "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100";
                                }
                              }

                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleOptionSelect(idx, opt.id)}
                                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-start gap-2 ${optClass}`}
                                >
                                  <span className="w-5 h-5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-black shrink-0 text-[10px]">
                                    {opt.id}
                                  </span>
                                  <span className="leading-snug">{opt.text}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation Reveal */}
                          {isRevealed && (
                            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-950 dark:text-emerald-200 space-y-1 animate-in fade-in">
                              <span className="font-black flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Correct Answer: Option {mcq.correct_answer}
                              </span>
                              <p className="leading-relaxed font-medium">
                                {mcq.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 7: Ask AI About This News (Interactive Contextual Q&A) */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Ask Sundaram AI About This News
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
                    Article context preserved
                  </span>
                </div>

                {/* Preset Prompt Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "Give a 150-word Mains model answer",
                    "Explain background in simple Hindi",
                    "List 3 critical judicial precedents",
                    "What are the arguments for and against?"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(preset)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      {preset} →
                    </button>
                  ))}
                </div>

                {/* Chat History */}
                {chatHistory.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 space-y-3 max-h-60 overflow-y-auto">
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 shadow-2xs'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 font-bold py-1">
                        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Input Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Ask any doubt regarding this current affairs topic..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatQuery.trim() || chatLoading}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Article not found or unavailable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
