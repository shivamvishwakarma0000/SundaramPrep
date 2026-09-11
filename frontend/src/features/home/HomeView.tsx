import React, { useEffect, useState } from 'react';
import { 
  Flame, 
  Target, 
  Zap, 
  UploadCloud, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Play, 
  RotateCcw 
} from 'lucide-react';
import { api } from '../../api/client';
import type { StudentHomeSummary, PortalTab } from '../../types';
import { CardSkeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';

interface HomeViewProps {
  onNavigate: (tab: PortalTab) => void;
  onLaunchQuick10: () => void;
  onLaunchFocusTest: () => void;
  onOpenAIWithPrompt: (prompt: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onLaunchQuick10,
  onLaunchFocusTest,
  onOpenAIWithPrompt,
}) => {
  const [summary, setSummary] = useState<StudentHomeSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadHome = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHomeSummary();
      setSummary(data);
    } catch (e: any) {
      console.error('Failed to load home summary:', e);
      setError(e?.message || 'Could not load your study dashboard. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto">
        <CardSkeleton rows={2} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="py-12">
        <ErrorState
          title="Unable to load dashboard"
          message={error || 'An error occurred while fetching your learning progress.'}
          onRetry={loadHome}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto transition-colors">
      {/* 1. Greeting, Streak & Daily Goal Hero */}
      <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-5 sm:p-6 shadow-subtle dark:shadow-dark-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <img
            src="/sundaram-logo.png"
            alt="Sundaram Prep Logo"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-sm ring-2 ring-brand-400/40 dark:ring-brand-500/40 bg-white dark:bg-dark-card shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                Exam Readiness OS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-dark-text tracking-tight text-fluid-h2">
              {summary.greeting}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-dark-muted mt-0.5">
              Practice. Focus. Improve.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {/* Streak Indicator */}
          <div className="flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
            <div>
              <div className="text-base leading-none font-extrabold">{summary.streak}</div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">Days Active</div>
            </div>
          </div>

          {/* Daily Goal Gauge & Selector */}
          <div className="flex-1 sm:flex-initial bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/50 text-brand-950 dark:text-brand-200 p-3 rounded-xl text-xs shadow-xs min-w-[140px] sm:min-w-[160px] space-y-2">
            <div className="flex items-center justify-between font-bold text-[11px] text-brand-900 dark:text-brand-300">
              <span>Daily Goal</span>
              <span>{summary.daily_goal.solved_today}/{summary.daily_goal.target_questions} Qs</span>
            </div>
            <div className="w-full bg-brand-200 dark:bg-brand-900/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-600 dark:bg-brand-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${summary.daily_goal.progress_percentage}%` }}
              />
            </div>
            {/* 20 / 50 / 100 Daily Goal Selector */}
            <div className="flex items-center justify-between gap-1 pt-0.5">
              {[20, 50, 100].map((count) => {
                const isSelected = summary.daily_goal.target_questions === count;
                return (
                  <button
                    key={count}
                    onClick={async () => {
                      try {
                        const res = await api.updateDailyGoal(count);
                        setSummary((prev) => prev ? {
                          ...prev,
                          daily_goal: res.daily_goal
                        } : null);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-600 dark:bg-brand-600 text-white shadow-xs'
                        : 'bg-white/80 dark:bg-dark-card text-slate-600 dark:text-dark-muted hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    {count}Q
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Actions: Continue Practice, Quick 10, Focus Test, Upload PDF */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Continue Practice */}
        <button
          onClick={() => onNavigate('practice')}
          className="group text-left bg-gradient-to-br from-brand-950 via-brand-900 to-indigo-950 text-white p-4 rounded-2xl shadow-card transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between cursor-pointer border border-brand-800/40"
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-brand-200 mb-3">
            <Play className="w-4 h-4 fill-brand-200" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Continue Practice</div>
            <div className="text-[10px] text-brand-300 mt-0.5 truncate">
              {summary.continue_practice ? `${summary.continue_practice.subject} (${summary.continue_practice.progress})` : 'Indian Polity'}
            </div>
          </div>
        </button>

        {/* Quick 10 */}
        <button
          onClick={onLaunchQuick10}
          className="group text-left bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border hover:border-brand-400 dark:hover:border-brand-500 p-4 rounded-2xl shadow-subtle dark:shadow-dark-card transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-dark-text">Quick 10 Blitz</div>
            <div className="text-[10px] text-slate-500 dark:text-dark-muted mt-0.5">Instant 10-Q sprint</div>
          </div>
        </button>

        {/* Focus Test */}
        <button
          onClick={onLaunchFocusTest}
          className="group text-left bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border hover:border-violet-400 dark:hover:border-violet-500 p-4 rounded-2xl shadow-subtle dark:shadow-dark-card transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-dark-text">Focus Test</div>
            <div className="text-[10px] text-slate-500 dark:text-dark-muted mt-0.5">Timed • Proctor simulation</div>
          </div>
        </button>

        {/* Upload PDF */}
        <button
          onClick={() => onNavigate('upload')}
          className="group text-left bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border hover:border-emerald-400 dark:hover:border-emerald-500 p-4 rounded-2xl shadow-subtle dark:shadow-dark-card transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-dark-text">Upload PDF</div>
            <div className="text-[10px] text-slate-500 dark:text-dark-muted mt-0.5">Auto-parse & verify</div>
          </div>
        </button>
      </div>

      {/* 3. Daily Current Affairs Capsule & Top Weak Topic (Tablet 2-Column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Current Affairs */}
        <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-subtle dark:shadow-dark-card flex flex-col justify-between space-y-3 transition-colors">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Daily Current Affairs</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-dark-muted font-mono">
                {summary.daily_current_affairs.date}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text line-clamp-1">
              {summary.daily_current_affairs.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed line-clamp-2">
              {summary.daily_current_affairs.key_takeaway}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-cool-100 dark:border-dark-border">
            <span className="text-[10px] bg-cool-100 dark:bg-dark-card text-slate-600 dark:text-dark-muted font-semibold px-2 py-0.5 rounded">
              {summary.daily_current_affairs.exam_relevance}
            </span>
            <button
              onClick={() =>
                onOpenAIWithPrompt(
                  `Provide a concise 3-minute exam breakdown of current affairs: "${summary.daily_current_affairs.title}". Structure with Answer, Why, Quick Fact, Memory Trick.`
                )
              }
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Explain with AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Weak Topic 1-Click AI Revision */}
        <div className="bg-gradient-to-br from-violet-50 to-brand-50 dark:from-violet-950/20 dark:to-brand-950/20 border border-violet-200 dark:border-violet-900/40 rounded-2xl p-4 sm:p-5 shadow-subtle dark:shadow-dark-card flex flex-col justify-between space-y-3 transition-colors">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-violet-900 dark:text-violet-300 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>Priority Weak Spot</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                {summary.weak_topic?.error_rate || 57}% Error Rate
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text line-clamp-1">
              {summary.weak_topic?.topic || 'Writ Jurisdiction (Art 32 vs 226)'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed line-clamp-2">
              {summary.weak_topic?.recommendation || 'Frequent confusion between Habeas Corpus and Certiorari traps.'}
            </p>
          </div>

          <button
            onClick={() =>
              onOpenAIWithPrompt(
                `I am struggling with "${summary.weak_topic?.topic}" in ${summary.weak_topic?.subject}. Give me a 2-minute high-yield breakdown: 1) Core rules, 2) Examiner traps, 3) High retention memory trick.`
              )
            }
            className="w-full py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-200" />
            <span>1-Click AI Revision</span>
          </button>
        </div>
      </div>

      {/* 4. Weekly Progress Sparkline */}
      <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-subtle dark:shadow-dark-card space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-muted">
              Weekly Progress
            </h3>
            <p className="text-sm font-bold text-slate-900 dark:text-dark-text">
              7-Day Practice Consistency
            </p>
          </div>
          <button
            onClick={() => onNavigate('progress')}
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Full Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-2">
          {summary.weekly_progress.map((d, i) => (
            <div key={i} className="text-center">
              <div className="h-16 bg-cool-50 dark:bg-dark-card rounded-xl flex items-end justify-center p-1 relative border border-cool-100 dark:border-dark-border">
                <div
                  className="w-full bg-brand-600 dark:bg-brand-500 rounded-lg transition-all duration-500"
                  style={{ height: `${Math.min(100, Math.max(15, (d.solved / 40) * 100))}%` }}
                />
              </div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-dark-text mt-1.5">{d.day}</div>
              <div className="text-[9px] text-slate-400 dark:text-dark-muted font-semibold">{d.solved}Q</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

