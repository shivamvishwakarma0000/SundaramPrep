import React, { useEffect, useState } from 'react';
import { 
  Flame, 
  Target, 
  UploadCloud, 
  Sparkles, 
  ArrowRight, 
  Play, 
  BarChart3,
  BookOpen,
  Zap
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
  onOpenUploadModal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onLaunchQuick10,
  onLaunchFocusTest,
  onOpenAIWithPrompt,
  onOpenUploadModal,
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
      <div className="space-y-6 max-w-5xl mx-auto">
        <CardSkeleton rows={2} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
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
    <div className="space-y-6 max-w-5xl mx-auto transition-colors">
      {/* 1. Header Hero Banner: Deep Navy & Tricolour Accents */}
      <div className="box-3d p-5 sm:p-7 relative overflow-hidden">
        {/* Subtle Watermark Tricolour Aura */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-l from-saffron-500/10 to-transparent pointer-events-none rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-64 h-24 bg-gradient-to-r from-flagGreen-500/10 to-transparent pointer-events-none rounded-tr-full" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <img
              src="/favicon.png"
              alt="Sundaram Prep Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-brand-600/30 bg-white dark:bg-dark-card shrink-0 shadow-subtle"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-flagGreen-500 animate-ping" />
                <span className="text-[11px] font-bold text-saffron-600 dark:text-saffron-400 uppercase tracking-widest">
                  FOR A BRIGHTER TOMORROW
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-display text-brand-700 dark:text-dark-text tracking-tight">
                SUNDARAM PREP
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-dark-muted mt-0.5 tracking-wide">
                Practice. Focus. Improve.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Streak Box */}
            <div className="flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2 bg-saffron-50 dark:bg-saffron-950/40 border border-saffron-200 dark:border-saffron-900/50 text-saffron-900 dark:text-saffron-300 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs">
              <Flame className="w-6 h-6 text-saffron-500 fill-saffron-500 shrink-0" />
              <div>
                <div className="text-lg leading-none font-extrabold">{summary.streak}</div>
                <div className="text-[10px] text-saffron-700 dark:text-saffron-400 font-semibold mt-0.5">Day Streak</div>
              </div>
            </div>

            {/* Daily Target Progress */}
            <div className="flex-1 sm:flex-initial bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/50 text-brand-950 dark:text-brand-200 p-3 rounded-xl text-xs shadow-xs min-w-[150px] space-y-1.5">
              <div className="flex items-center justify-between font-bold text-[11px] text-brand-900 dark:text-brand-300">
                <span>Daily Target</span>
                <span>{summary.daily_goal.solved_today}/{summary.daily_goal.target_questions} Qs</span>
              </div>
              <div className="w-full bg-brand-200 dark:bg-brand-900/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-600 dark:bg-brand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.daily_goal.progress_percentage}%` }}
                />
              </div>
              {/* Daily Target Pill Options */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[20, 50, 100].map((count) => {
                  const isSelected = summary.daily_goal.target_questions === count;
                  return (
                    <button
                      key={count}
                      onClick={async () => {
                        try {
                          const res = await api.updateDailyGoal(count);
                          setSummary((prev) => prev ? { ...prev, daily_goal: res.daily_goal } : null);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white/90 dark:bg-dark-card text-slate-600 dark:text-dark-muted hover:bg-white'
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
      </div>

      {/* 2. CORE 4 ELEVATED 3D BOXES (Clean, Uncluttered, Maximum Clarity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* BOX 1: 🚀 START PRACTICE */}
        <div
          onClick={() => onNavigate('practice')}
          className="box-3d p-6 cursor-pointer flex flex-col justify-between group border-l-4 border-l-brand-600"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 fill-brand-600 dark:fill-brand-400" />
              </div>
              <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-full border border-brand-200 dark:border-brand-800">
                Instant MCQs
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-dark-text group-hover:text-brand-600 transition-colors">
              Start Practice Arena
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-dark-muted mt-2 leading-relaxed">
              Solve exam MCQs with real-time answer reveals and verified explanations directly below each question.
            </p>
          </div>

          <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-dark-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLaunchQuick10();
              }}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-slate-700 dark:text-dark-text transition-colors"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Quick 10</span>
            </button>
            <div className="flex items-center gap-1 text-xs font-extrabold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
              <span>Begin Now</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* BOX 2: 📄 UPLOAD PDF & SOLVE */}
        <div
          onClick={onOpenUploadModal}
          className="box-3d p-6 cursor-pointer flex flex-col justify-between group border-l-4 border-l-saffron-500"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-saffron-50 dark:bg-saffron-950/60 border border-saffron-200 dark:border-saffron-800 flex items-center justify-center text-saffron-600 dark:text-saffron-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-saffron-600 dark:text-saffron-400 bg-saffron-50 dark:bg-saffron-950/60 px-2.5 py-1 rounded-full border border-saffron-200 dark:border-saffron-800">
                Auto-Parser
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-dark-text group-hover:text-saffron-600 transition-colors">
              Upload PDF & Solve
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-dark-muted mt-2 leading-relaxed">
              Upload any test paper PDF. We automatically extract all questions and convert them to interactive MCQs with a live progress bar.
            </p>
          </div>

          <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-dark-border">
            <span className="text-xs font-bold text-slate-500 dark:text-dark-muted">
              Fast · Bilingual · 100% Extracted
            </span>
            <div className="flex items-center gap-1 text-xs font-extrabold text-saffron-600 dark:text-saffron-400 group-hover:translate-x-1 transition-transform">
              <span>Upload PDF</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* BOX 3: 🎯 FOCUS TEST */}
        <div
          onClick={onLaunchFocusTest}
          className="box-3d p-6 cursor-pointer flex flex-col justify-between group border-l-4 border-l-flagGreen-600"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-flagGreen-50 dark:bg-flagGreen-950/60 border border-flagGreen-200 dark:border-flagGreen-800 flex items-center justify-center text-flagGreen-600 dark:text-flagGreen-400 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-flagGreen-600 dark:text-flagGreen-400 bg-flagGreen-50 dark:bg-flagGreen-950/60 px-2.5 py-1 rounded-full border border-flagGreen-200 dark:border-flagGreen-800">
                Proctor Sim
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-dark-text group-hover:text-flagGreen-600 transition-colors">
              Timed Focus Test
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-dark-muted mt-2 leading-relaxed">
              Full-screen exam conditions with negative marking, time countdown, and focus score integrity tracker.
            </p>
          </div>

          <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-dark-border">
            <span className="text-xs font-bold text-slate-500 dark:text-dark-muted">
              25 Questions · 25 Minutes
            </span>
            <div className="flex items-center gap-1 text-xs font-extrabold text-flagGreen-600 dark:text-flagGreen-400 group-hover:translate-x-1 transition-transform">
              <span>Launch Test</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* BOX 4: 📊 PROGRESS & MISTAKES */}
        <div
          onClick={() => onNavigate('progress')}
          className="box-3d p-6 cursor-pointer flex flex-col justify-between group border-l-4 border-l-gold-500"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gold-50 dark:bg-gold-950/60 border border-gold-200 dark:border-gold-800 flex items-center justify-center text-gold-600 dark:text-gold-400 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-950/60 px-2.5 py-1 rounded-full border border-gold-200 dark:border-gold-800">
                Visual Analytics
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-dark-text group-hover:text-gold-600 transition-colors">
              Progress & Mistake Engine
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-dark-muted mt-2 leading-relaxed">
              Colorful multi-color bar graphs, accuracy analytics, and personalized mistake notebook to turn weaknesses into strengths.
            </p>
          </div>

          <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-dark-border">
            <span className="text-xs font-bold text-slate-500 dark:text-dark-muted">
              Colourful Charts · Mistake Drill
            </span>
            <div className="flex items-center gap-1 text-xs font-extrabold text-gold-600 dark:text-gold-400 group-hover:translate-x-1 transition-transform">
              <span>View Report</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick High-Yield Daily Capsule */}
      <div className="box-3d p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-dark-muted uppercase tracking-wider">
              High-Yield Exam Capsule · {summary.daily_current_affairs.date}
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text">
              {summary.daily_current_affairs.title}
            </h4>
          </div>
        </div>

        <button
          onClick={() =>
            onOpenAIWithPrompt(
              `Provide a high-yield 3-minute exam breakdown: "${summary.daily_current_affairs.title}". Structure with Answer, Why, Quick Fact, Memory Trick.`
            )
          }
          className="px-4 py-2 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 dark:hover:bg-slate-700 text-brand-700 dark:text-brand-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-saffron-500" />
          <span>Explain with AI</span>
        </button>
      </div>
    </div>
  );
};
