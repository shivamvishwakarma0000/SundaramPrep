import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Target, 
  RotateCcw, 
  Bookmark as BookmarkIcon, 
  ArrowRight, 
  BookOpen, 
  ChevronRight, 
  Trash2,
  Lightbulb,
  FileCheck2,
  Brain
} from 'lucide-react';
import { api } from '../../api/client';
import type { MistakeItem, BookmarkItem, ExamType, Question, SmartRevisionSummary, PracticeMode } from '../../types';
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
  const [revisionSummary, setRevisionSummary] = useState<SmartRevisionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadHubData() {
      try {
        const [hubRes, revRes] = await Promise.all([
          api.getPracticeHub(currentExam),
          api.getSmartRevisionSummary().catch(() => null)
        ]);
        setSubjects(hubRes.subjects);
        if (revRes) setRevisionSummary(revRes);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border p-4 rounded-2xl shadow-subtle dark:shadow-dark-card transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubView('hub')}
                className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                ← Back to Practice
              </button>
              <span className="text-slate-300 dark:text-dark-muted">•</span>
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-dark-text">
                Mistake Engine Notebook
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
              Targeted review of questions you answered incorrectly. Automatically resolved once mastered twice.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartMode('MISTAKE_PRACTICE')}
              disabled={mistakes.length === 0}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Practice My Mistakes
            </button>
            <span className="text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
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
                className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-subtle dark:shadow-dark-card space-y-3 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-cool-100 dark:border-dark-border pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-dark-text">{m.question.subject}</span>
                    <span className="text-slate-400 dark:text-dark-muted">•</span>
                    <span className="text-slate-600 dark:text-dark-muted">{m.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                      Failed {m.repeated_count}x
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-dark-muted">
                      {m.attempt_count} attempts
                    </span>
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-dark-text leading-relaxed whitespace-pre-line">
                  {m.question.question_text}
                </div>

                {/* Correct Answer & Explanation */}
                <div className="bg-cool-50 dark:bg-dark-card p-3 rounded-xl border border-cool-200 dark:border-dark-border text-xs space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">
                    Correct Option: {m.question.correct_answer}
                  </div>
                  <p className="text-slate-600 dark:text-dark-muted leading-relaxed">
                    {m.question.explanation?.why}
                  </p>
                </div>

                {/* AI Actions */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 dark:text-dark-muted italic">
                    {m.question.source_reference || 'UPSC / SSC Reference'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenAIWithQuestion(m.question, 'WHY_WRONG')}
                      className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer"
                    >
                      Why is this trap?
                    </button>
                    <button
                      onClick={() => onOpenAIWithQuestion(m.question, 'MEMORY_TRICK')}
                      className="text-xs font-bold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950/70 px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-900/40 transition-colors cursor-pointer"
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
        <div className="flex items-center justify-between bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border p-4 rounded-2xl shadow-subtle dark:shadow-dark-card transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubView('hub')}
                className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                ← Back to Practice
              </button>
              <span className="text-slate-300 dark:text-dark-muted">•</span>
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-dark-text">
                Bookmarked Questions
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
              High-yield and tricky questions saved for rapid revision before exams.
            </p>
          </div>
          <span className="text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50">
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
                className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-subtle dark:shadow-dark-card space-y-3 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-cool-100 dark:border-dark-border pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-dark-text">{b.question.subject}</span>
                    <span className="text-slate-400 dark:text-dark-muted">•</span>
                    <span className="text-slate-600 dark:text-dark-muted">{b.question.topic}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveBookmark(b.question.id)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-dark-text leading-relaxed whitespace-pre-line">
                  {b.question.question_text}
                </div>

                <div className="bg-cool-50 dark:bg-dark-card p-3 rounded-xl border border-cool-200 dark:border-dark-border text-xs space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Correct Option: {b.question.correct_answer}
                  </div>
                  <p className="text-slate-600 dark:text-dark-muted leading-relaxed">
                    {b.question.explanation?.why}
                  </p>
                </div>

                {b.notes && (
                  <div className="text-xs text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                    <strong>Note:</strong> {b.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }


  // Primary Practice Hub View
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in pb-12 transition-colors">
      {/* Top Banner */}
      <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-5 sm:p-6 shadow-subtle dark:shadow-dark-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Practice Hub
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-dark-text mt-0.5 tracking-tight">
            5 Pedagogical Practice Modes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-dark-muted mt-0.5">
            Choose your learning mode: untimed intuition drills, structured practice, or full proctored focus simulation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onStartMode('QUICK_10')}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Quick 10</span>
          </button>
          <button
            onClick={() => onStartMode('FOCUS_TEST')}
            className="flex items-center gap-1.5 bg-indigo-900 dark:bg-indigo-950 hover:bg-indigo-800 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer border border-indigo-700/50"
          >
            <Target className="w-4 h-4 text-indigo-300" />
            <span>Focus Test</span>
          </button>
        </div>
      </div>

      {/* 5 Distinct Practice Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Mode 1: LEARN MODE */}
        <div
          onClick={() => onStartMode('LEARN')}
          className="group bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-dark-surface border border-amber-200 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-500 p-5 rounded-2xl shadow-subtle dark:shadow-dark-card cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lightbulb className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded">
              Instant Feedback
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-dark-text group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
            Learn Mode
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
            Immediate explanation on tap: Why, Quick Fact, and Memory Trick. Perfect for initial conceptual learning.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-amber-800 dark:text-amber-400 gap-1">
            <span>Start Learn Mode</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 2: PRACTICE MODE */}
        <div
          onClick={() => onStartMode('PRACTICE')}
          className="group bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-dark-surface border border-blue-200 dark:border-blue-900/40 hover:border-blue-400 dark:hover:border-blue-500 p-5 rounded-2xl shadow-subtle dark:shadow-dark-card cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded">
              Navigator & Skips
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-dark-text group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors">
            Standard Practice
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
            Optional timer, question navigator grid, skips, bookmarks, and pause/resume later flexibility.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-blue-800 dark:text-blue-400 gap-1">
            <span>Start Practice</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 3: FOCUS MODE */}
        <div
          onClick={() => onStartMode('FOCUS_TEST')}
          className="group bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-dark-surface border border-indigo-200 dark:border-indigo-900/40 hover:border-indigo-400 dark:hover:border-indigo-500 p-5 rounded-2xl shadow-subtle dark:shadow-dark-card cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
              Proctored Simulation
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-dark-text group-hover:text-indigo-800 dark:group-hover:text-indigo-300 transition-colors">
            Focus Mode
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
            100 questions, strict timer, locked answers, and 3-strike Focus Violations system with separate Focus Score.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-indigo-800 dark:text-indigo-400 gap-1">
            <span>Enter Focus Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 4: QUICK 10 BLITZ */}
        <div
          onClick={() => onStartMode('QUICK_10')}
          className="group bg-gradient-to-br from-amber-50/40 to-white dark:from-amber-950/15 dark:to-dark-surface border border-cool-200 dark:border-dark-border hover:border-amber-300 dark:hover:border-amber-500 p-5 rounded-2xl shadow-subtle dark:shadow-dark-card cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded">
              Fast 10-Question Mix
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-dark-text group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
            Quick 10 Blitz
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
            10 rapid questions mixing weak topics, past mistakes, and current affairs. Under 10 minutes.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-amber-800 dark:text-amber-400 gap-1">
            <span>Launch Quick 10</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 5: MOCK TEST */}
        <div
          onClick={() => onStartMode('MOCK_TEST')}
          className="group bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-dark-surface border border-cool-200 dark:border-dark-border hover:border-emerald-300 dark:hover:border-emerald-500 p-5 rounded-2xl shadow-subtle dark:shadow-dark-card cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
              Official Pattern
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-dark-text group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
            Mock Test
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
            Full exam simulation with negative marking (-0.66 penalty) and post-test sectional analytics.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-800 dark:text-emerald-400 gap-1">
            <span>Start Mock Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 6: TODAY'S SMART REVISION */}
        <div
          onClick={() => onStartMode('SMART_REVISION')}
          className="group bg-gradient-to-br from-violet-50/60 to-white dark:from-violet-950/20 dark:to-dark-surface border border-violet-200 dark:border-violet-900/40 hover:border-violet-400 dark:hover:border-violet-500 p-5 rounded-2xl shadow-subtle dark:shadow-dark-card cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 rounded">
              Cognitive Set
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-dark-text group-hover:text-violet-800 dark:group-hover:text-violet-300 transition-colors">
            Smart Revision
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1 leading-relaxed">
            {revisionSummary?.recommended_formula || "Synthesized from your mistakes, weak topics, and current affairs."}
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-violet-800 dark:text-violet-400 gap-1">
            <span>Launch Revision Set</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Mistake Notebook & Saved Bookmarks Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Mistakes Notebook Launcher */}
        <div
          onClick={loadMistakes}
          className="group bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-dark-surface border border-rose-200 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-500 p-5 rounded-2xl shadow-subtle dark:shadow-dark-card cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 px-2.5 py-0.5 rounded">
              Mistake Engine
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-dark-text group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
            Mistakes Notebook
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
            Review questions you missed. Automatically tracks repeat errors and re-tests until mastery.
          </p>
          <div className="mt-4 flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
            <span className="flex items-center gap-1">
              Open Mistake Notebook
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartMode('MISTAKE_PRACTICE');
              }}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
            >
              Practice Mistakes
            </button>
          </div>
        </div>

        {/* Saved Bookmarks Launcher */}
        <div
          onClick={loadBookmarks}
          className="group bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-dark-surface border border-amber-200 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-500 p-5 rounded-2xl shadow-subtle dark:shadow-dark-card cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookmarkIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2.5 py-0.5 rounded">
              High-Yield
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-dark-text group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
            Saved Bookmarks
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
            Revisit critical questions, tricky assertion-reasons, and personal study notes.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-amber-800 dark:text-amber-400 gap-1">
            <span>Open Bookmarks</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Subject-Wise Practice Grid */}
      <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-5 sm:p-6 shadow-subtle dark:shadow-dark-card space-y-4 transition-colors">
        <div>
          <h3 className="text-base font-bold font-display text-slate-900 dark:text-dark-text">
            Subject & Module Practice
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted">
            Organized according to the official examination syllabus.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjects.map((s, idx) => (
            <div
              key={idx}
              onClick={() => onStartMode('PRACTICE', s.name)}
              className="p-4 rounded-xl border border-cool-200 dark:border-dark-border hover:border-brand-600 dark:hover:border-brand-500 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cool-100 dark:bg-dark-card text-slate-900 dark:text-dark-text flex items-center justify-center font-bold text-xs">
                    <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-dark-muted">
                    {s.mastery}% Mastery
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {s.name}
                </h4>
                <div className="text-[11px] text-slate-400 dark:text-dark-muted mt-1">
                  {s.questions_count} Questions Available
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-cool-100 dark:border-dark-border flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                <span>Start Practice</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

