import React from 'react';
import { 
  Award, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Flame, 
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import type { QuizSession, AICoachSummary } from '../../types';

interface ResultViewProps {
  session: QuizSession;
  stats: {
    score: number;
    accuracy: number;
    correct: number;
    wrong: number;
    skipped: number;
    unattempted: number;
    avg_time_per_question: number;
    focus_score: number;
    focus_violations?: number;
  };
  aiCoach?: AICoachSummary | null;
  newPersonalBests?: { type: string; label: string; value: string }[];
  subjectBreakdown?: { subject: string; correct: number; total: number; accuracy: number; status: string }[];
  topicBreakdown?: { topic: string; subject: string; correct: number; total: number; accuracy: number; status: string }[];
  onReviewAnswers: () => void;
  onPracticeMistakes: () => void;
  onReturnToHub: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  session,
  stats,
  aiCoach,
  newPersonalBests = [],
  subjectBreakdown = [],
  topicBreakdown = [],
  onReviewAnswers,
  onPracticeMistakes,
  onReturnToHub,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12 transition-colors">
      {/* Personal Best Celebration Banner */}
      {newPersonalBests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                Personal Best Detected
              </span>
              <h4 className="text-base font-bold mt-0.5">
                {newPersonalBests.map(b => `${b.label}: ${b.value}`).join(' · ')}
              </h4>
            </div>
          </div>
          <Sparkles className="w-6 h-6 text-amber-200 hidden sm:block" />
        </div>
      )}

      {/* Main Scorecard Header */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 sm:p-8 border border-cool-200 dark:border-dark-border shadow-card dark:shadow-dark-card transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cool-200 dark:border-dark-border pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/40 px-2.5 py-1 rounded-md">
              {session.session_type?.replace('_', ' ')} Complete
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-dark-text mt-2">
              Performance Summary
            </h2>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
              Standard UPSC/SSC negative marking model applied (-0.66 penalty for incorrect in focus/mock modes).
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={onReviewAnswers}
              className="px-4 py-2 bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 text-slate-800 dark:text-dark-text text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Review Answers
            </button>
            <button
              onClick={onReturnToHub}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              Practice Arena
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-6">
          <div className="bg-slate-50 dark:bg-dark-card rounded-xl p-3 border border-cool-200 dark:border-dark-border text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-dark-muted">Score</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-dark-text mt-0.5">{stats.score}</p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Marks</span>
          </div>

          <div className="bg-slate-50 dark:bg-dark-card rounded-xl p-3 border border-cool-200 dark:border-dark-border text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-dark-muted">Accuracy</span>
            <p className={`text-xl sm:text-2xl font-black mt-0.5 ${stats.accuracy >= 70 ? 'text-emerald-600 dark:text-emerald-400' : (stats.accuracy >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}`}>
              {stats.accuracy}%
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Target &gt; 70%</span>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Correct</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.correct}</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500">+{stats.correct * 2} Marks</span>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-xl p-3 border border-rose-100 dark:border-rose-900/40 text-center">
            <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300">Incorrect</span>
            <p className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5">{stats.wrong}</p>
            <span className="text-[10px] text-rose-600 dark:text-rose-500">To Mistakes</span>
          </div>

          <div className="bg-slate-50 dark:bg-dark-card rounded-xl p-3 border border-cool-200 dark:border-dark-border text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-dark-muted">Skipped</span>
            <p className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 mt-0.5">{stats.skipped}</p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">0 Penalty</span>
          </div>

          <div className="bg-slate-50 dark:bg-dark-card rounded-xl p-3 border border-cool-200 dark:border-dark-border text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-dark-muted">Avg Pace</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-dark-text mt-0.5">{stats.avg_time_per_question}s</p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Per Question</span>
          </div>

          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/40 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-300 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Focus Score
            </span>
            <p className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-300 mt-0.5">{stats.focus_score}</p>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Discipline Index</span>
          </div>
        </div>
      </div>

      {/* AI Coach Summary Card */}
      {aiCoach && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-brand-950 rounded-2xl p-6 text-white shadow-card border border-indigo-900/50 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <h3 className="text-base font-bold font-display">Sundaram AI Coach Insights</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Post-Test Cognitive Synthesis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> What Improved
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">{aiCoach.what_improved}</p>
            </div>

            <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Biggest Weakness
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">{aiCoach.biggest_weakness}</p>
            </div>
          </div>

          <div className="bg-indigo-900/30 p-4 rounded-xl border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-amber-300 font-bold uppercase tracking-wider text-[10px]">
                Today's Prescriptive Action
              </span>
              <p className="text-white font-semibold mt-0.5">{aiCoach.short_recommendation}</p>
            </div>

            {stats.wrong > 0 && (
              <button
                onClick={onPracticeMistakes}
                className="px-3.5 py-1.5 bg-white text-brand-950 font-bold text-xs rounded-lg hover:bg-slate-100 transition-all self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
              >
                Practice My Mistakes ({stats.wrong})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sectional Performance & Topic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-cool-200 dark:border-dark-border shadow-subtle dark:shadow-dark-card space-y-4 transition-colors">
          <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text font-display flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            Subject Performance
          </h4>
          <div className="space-y-3">
            {subjectBreakdown.length > 0 ? (
              subjectBreakdown.map((subj, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-dark-card p-3 rounded-xl border border-cool-200 dark:border-dark-border flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{subj.subject}</span>
                    <p className="text-[11px] text-slate-500 dark:text-dark-muted">{subj.correct} of {subj.total} correct</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-black text-sm ${subj.accuracy >= 70 ? 'text-emerald-600 dark:text-emerald-400' : (subj.accuracy >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}`}>
                      {subj.accuracy}%
                    </span>
                    <span className={`block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 ${
                      subj.status === 'STRONG' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40' : (subj.status === 'IMPROVING' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40')
                    }`}>
                      {subj.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 dark:text-dark-muted py-4 text-center">Comprehensive subject data will appear here.</p>
            )}
          </div>
        </div>

        {/* Topic Breakdown */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-cool-200 dark:border-dark-border shadow-subtle dark:shadow-dark-card space-y-4 transition-colors">
          <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            Topic Breakdown & Weak Areas
          </h4>
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {topicBreakdown.length > 0 ? (
              topicBreakdown.map((top, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-dark-card p-3 rounded-xl border border-cool-200 dark:border-dark-border flex items-center justify-between text-xs">
                  <div className="max-w-[70%]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{top.topic}</span>
                    <span className="text-[10px] text-slate-500 dark:text-dark-muted">{top.subject}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-black text-sm ${top.accuracy >= 70 ? 'text-emerald-600 dark:text-emerald-400' : (top.accuracy >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}`}>
                      {top.accuracy}%
                    </span>
                    <span className={`block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 ${
                      top.status === 'STRONG' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40' : (top.status === 'IMPROVING' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40')
                    }`}>
                      {top.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 dark:text-dark-muted py-4 text-center">Topic analytics will appear after more attempts.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

