import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Target, 
  RotateCcw, 
  Bookmark as BookmarkIcon, 
  ArrowRight, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  Trash2,
  Lightbulb,
  FileCheck2,
  Brain,
  Search
} from 'lucide-react';
import { api } from '../../api/client';
import type { MistakeItem, BookmarkItem, ExamType, Question, PracticeMode } from '../../types';
import { CardSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

interface PracticeHubProps {
  currentExam: ExamType;
  onStartMode: (mode: PracticeMode, subject?: string, topic?: string) => void;
  onOpenAIWithQuestion: (question: Question, actionType: 'HINGLISH' | 'WHY_WRONG' | 'MEMORY_TRICK') => void;
}

type PracticeSubView = 'hub' | 'mistakes' | 'bookmarks';

export const PracticeHub: React.FC<PracticeHubProps> = ({
  currentExam,
  onStartMode,
  onOpenAIWithQuestion,
}) => {
  const [subView, setSubView] = useState<PracticeSubView>('hub');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTopic, setSearchTopic] = useState<string>('');
  const [isMistakesBookmarksOpen, setIsMistakesBookmarksOpen] = useState<boolean>(false);
  const [isModulesOpen, setIsModulesOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadHubData() {
      try {
        const hubRes = await api.getPracticeHub(currentExam);
        setSubjects(hubRes.subjects || []);
      } catch (e) {
        console.error('Failed to load practice hub:', e);
      }
    }
    loadHubData();
  }, [currentExam]);

  const loadMistakes = async () => {
    setSubView('mistakes');
    setLoading(true);
    try {
      const res = await api.getMistakes(1, 20);
      setMistakes(res.mistakes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    setSubView('bookmarks');
    setLoading(true);
    try {
      const res = await api.getBookmarks(1, 20);
      setBookmarks(res.bookmarks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (questionId: string) => {
    try {
      await api.toggleBookmark(questionId);
      setBookmarks((prev) => prev.filter((b) => b.question.id !== questionId));
    } catch (e) {
      console.error(e);
    }
  };

  // Section 11: Single-Feature UI - Mistakes Notebook
  if (subView === 'mistakes') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubView('hub')}
                className="text-xs font-black text-brand-600 hover:underline cursor-pointer"
              >
                ← Back to Practice
              </button>
              <span className="text-slate-300">•</span>
              <h2 className="text-base sm:text-lg font-black font-display text-slate-900">
                Mistake Engine Notebook
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartMode('MISTAKE_PRACTICE')}
              disabled={mistakes.length === 0}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice My Mistakes</span>
            </button>
            <span className="text-xs font-black bg-rose-50 text-rose-700 px-2.5 py-1.5 rounded-xl border border-rose-200">
              {mistakes.length} Active
            </span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={2} />
          </div>
        ) : mistakes.length === 0 ? (
          <EmptyState
            emoji="🎉"
            title="No mistakes yet 🎉"
            description="Keep practicing. Your mistakes will appear here automatically."
            actionLabel="Start Practice"
            onAction={() => onStartMode('PRACTICE')}
          />
        ) : (
          <div className="space-y-3">
            {mistakes.map((m, idx) => (
              <div
                key={m.mistake_id || idx}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-900">{m.question.subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{m.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      Failed {m.repeated_count}x
                    </span>
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed whitespace-pre-line">
                  {m.question.question_text}
                </div>

                {/* Correct Answer & Explanation */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-black text-emerald-700">
                    Correct Option: {m.question.correct_answer}
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {m.question.explanation?.why}
                  </p>
                </div>

                {/* AI Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {m.question.source_reference || 'Official Reference'}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenAIWithQuestion(m.question, 'WHY_WRONG')}
                      className="text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer"
                    >
                      Why is this trap?
                    </button>
                    <button
                      onClick={() => onOpenAIWithQuestion(m.question, 'MEMORY_TRICK')}
                      className="text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-200 cursor-pointer"
                    >
                      Memory Trick
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Section 11: Single-Feature UI - Bookmarked Questions
  if (subView === 'bookmarks') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in transition-colors">
        <div className="flex items-center justify-between bg-white border-2 border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubView('hub')}
                className="text-xs font-black text-brand-600 hover:underline cursor-pointer"
              >
                ← Back to Practice
              </button>
              <span className="text-slate-300">•</span>
              <h2 className="text-base sm:text-lg font-black font-display text-slate-900">
                Bookmarked Questions
              </h2>
            </div>
          </div>
          <span className="text-xs font-black bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
            {bookmarks.length} Saved
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={2} />
          </div>
        ) : bookmarks.length === 0 ? (
          <EmptyState
            emoji="🔖"
            title="No Bookmarks Saved Yet"
            description="Tap the bookmark icon while solving questions to collect high-yield items here."
            actionLabel="Start Practice"
            onAction={() => onStartMode('PRACTICE')}
          />
        ) : (
          <div className="space-y-3">
            {bookmarks.map((b) => (
              <div
                key={b.bookmark_id}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-900">{b.question.subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{b.question.topic}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveBookmark(b.question.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed whitespace-pre-line">
                  {b.question.question_text}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-black text-slate-900">
                    Correct Option: {b.question.correct_answer}
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {b.question.explanation?.why}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Primary Practice Hub View - Pure White Boxes, No Shadows, No Verbose Text
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in pb-12 transition-colors">
      {/* 1. INSTANT 10-QUESTION TOPIC SEARCH MOCK GENERATOR */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
              Topic-Wise 10-Question Mock Test
            </span>
            <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 mt-1">
              Search Any Topic & Start Instant 10-Question Test
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Type any syllabus topic to practice 10 questions. After completion, take 10 more or search another topic.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchTopic.trim()) {
              onStartMode('MOCK_TEST', undefined, searchTopic.trim());
            }
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              placeholder="Search topic (e.g. Dandi March, Fundamental Rights, Monetary Policy, 1857 Revolt)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!searchTopic.trim()}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Start 10-Q Mock Test</span>
          </button>
        </form>

        {/* Quick Topic Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold text-slate-400">Popular:</span>
          {['Dandi March', 'Fundamental Rights', 'Monetary Policy', 'Revolt of 1857', 'National Parks', 'Judiciary'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSearchTopic(t);
                onStartMode('MOCK_TEST', undefined, t);
              }}
              className="text-[11px] font-bold text-slate-700 hover:text-brand-700 bg-slate-100 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Top Banner (Pure White Box, Crisp 2px Border) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-brand-600">
            Practice Hub
          </span>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 mt-0.5 tracking-tight">
            Curriculum Practice Modes
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onStartMode('QUICK_10')}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Quick 10 Blitz</span>
          </button>
          <button
            onClick={() => onStartMode('FOCUS_TEST')}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer border border-slate-700"
          >
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Focus Test</span>
          </button>
        </div>
      </div>

      {/* 6 Distinct Practice Modes Grid (Pure White Cards, No Shadows, NO Verbose Text) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Mode 1: LEARN MODE */}
        <div
          onClick={() => onStartMode('LEARN')}
          className="bg-white border-2 border-slate-200 hover:border-amber-500 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Instant Feedback
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-700 transition-colors">
              Learn Mode
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-amber-700">
            <span>Start Learn Mode</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 2: STANDARD PRACTICE */}
        <div
          onClick={() => onStartMode('PRACTICE')}
          className="bg-white border-2 border-slate-200 hover:border-brand-600 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                Nav & Skips
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-brand-600 transition-colors">
              Standard Practice
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-brand-600">
            <span>Start Practice</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 3: FOCUS MODE */}
        <div
          onClick={() => onStartMode('FOCUS_TEST')}
          className="bg-white border-2 border-slate-200 hover:border-flagGreen-600 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-flagGreen-50 border border-flagGreen-200 text-flagGreen-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-flagGreen-800 bg-flagGreen-50 border border-flagGreen-200 px-2 py-0.5 rounded-full">
                Proctor Sim
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-flagGreen-600 transition-colors">
              Focus Mode
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-flagGreen-600">
            <span>Enter Focus Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 4: QUICK 10 BLITZ */}
        <div
          onClick={() => onStartMode('QUICK_10')}
          className="bg-white border-2 border-slate-200 hover:border-amber-500 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                10 Rapid Qs
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
              Quick 10 Blitz
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-amber-700">
            <span>Launch Quick 10</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 5: MOCK TEST (10 Real Randomized Questions) */}
        <div
          onClick={() => onStartMode('MOCK_TEST')}
          className="bg-white border-2 border-slate-200 hover:border-emerald-600 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                10 Qs Random
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
              Mock Test
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-emerald-700">
            <span>Start Mock Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 6: SMART REVISION */}
        <div
          onClick={() => onStartMode('SMART_REVISION')}
          className="bg-white border-2 border-slate-200 hover:border-violet-600 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-800 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                Cognitive Set
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-violet-700 transition-colors">
              Smart Revision
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-violet-700">
            <span>Launch Revision Set</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE SECTION 1: Mistakes Notebook & Saved Bookmarks (Hidden by default, expands on click) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setIsMistakesBookmarksOpen(prev => !prev)}
          className="w-full flex items-center justify-between cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-black shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black font-display text-slate-900">
                Mistake Engine & Saved Bookmarks
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Practice failed questions and review bookmarked high-yield problems
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
              {isMistakesBookmarksOpen ? 'Hide' : 'Click to Open'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isMistakesBookmarksOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isMistakesBookmarksOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-slate-100 animate-in fade-in duration-200">
            {/* Mistakes Notebook Launcher */}
            <div
              onClick={loadMistakes}
              className="bg-slate-50 border-2 border-slate-200 hover:border-rose-500 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-rose-700 bg-white border border-rose-200 px-2.5 py-0.5 rounded-full">
                    Mistake Engine
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                  Mistakes Notebook
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-black text-rose-700">
                <span>Open Mistakes</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Saved Bookmarks Launcher */}
            <div
              onClick={loadBookmarks}
              className="bg-slate-50 border-2 border-slate-200 hover:border-amber-500 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookmarkIcon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-white border border-amber-200 px-2.5 py-0.5 rounded-full">
                    High-Yield
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                  Saved Bookmarks
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-black text-amber-800">
                <span>Open Bookmarks</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COLLAPSIBLE SECTION 2: Subject & Module Practice (Hidden by default, expands on click) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setIsModulesOpen(prev => !prev)}
          className="w-full flex items-center justify-between cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center font-black shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black font-display text-slate-900">
                Subject & Module Practice
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Real official syllabus modules (Polity, History, Economy, Geography, Ecology, CSAT)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-lg">
              {isModulesOpen ? 'Hide Modules' : 'Click to Expand (6 Modules)'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isModulesOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isModulesOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100 animate-in fade-in duration-200">
            {(subjects.length > 0 ? subjects : [
              { id: "polity", name: "Indian Polity & Governance" },
              { id: "history", name: "Modern Indian History" },
              { id: "economy", name: "Indian Economy & Fiscal Policy" },
              { id: "geography", name: "Physical & Indian Geography" },
              { id: "environment", name: "Ecology, Biodiversity & Climate" },
              { id: "aptitude", name: "CSAT / Quantitative Aptitude" },
            ]).map((s, idx) => (
              <div
                key={idx}
                onClick={() => onStartMode('PRACTICE', s.name)}
                className="p-4 rounded-xl border-2 border-slate-200 hover:border-brand-600 bg-white hover:bg-slate-50 cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center font-bold text-xs">
                      <BookOpen className="w-4 h-4 text-brand-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                      Syllabus Module
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-brand-600 transition-colors">
                    {s.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-brand-600">
                  <span>Start Practice</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
