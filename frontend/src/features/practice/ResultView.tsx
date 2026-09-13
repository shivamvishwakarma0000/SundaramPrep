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
  activeTopic?: string;
  aiCoach?: AICoachSummary | null;
  newPersonalBests?: { type: string; label: string; value: string }[];
  subjectBreakdown?: { subject: string; correct: number; total: number; accuracy: number; status: string }[];
  topicBreakdown?: { topic: string; subject: string; correct: number; total: number; accuracy: number; status: string }[];
  onReviewAnswers: () => void;
  onPracticeMistakes: () => void;
  onRestartTopic?: (topic: string) => void;
  onReturnToHub: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  session,
  stats,
  activeTopic,
  aiCoach,
  newPersonalBests = [],
  subjectBreakdown = [],
  topicBreakdown = [],
  onReviewAnswers,
  onPracticeMistakes,
  onRestartTopic,
  onReturnToHub,
}) => {
  const currentTopic = activeTopic || (session as any).topic_id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12 transition-colors">
      {/* 10-Question Topic Practice & Retake Banner */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
              10-Question Topic Mock
            </span>
            {currentTopic && (
              <span className="text-xs font-black text-slate-800">
                Topic: <strong className="text-brand-600 font-black">{currentTopic}</strong>
              </span>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-900">
            {currentTopic ? `Ready for 10 more on "${currentTopic}"?` : 'Search & Practice Any Topic (10 Questions)'}
          </h3>
          <p className="text-xs text-slate-500">
            Take instant 10-question tests on any topic or search another syllabus area.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {currentTopic && onRestartTopic && (
            <button
              onClick={() => onRestartTopic(currentTopic)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Take 10 More on This Topic</span>
            </button>
          )}
          <button
            onClick={onReturnToHub}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <span>Search Different Topic</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
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
      <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 sm:p-6 md:p-8 border border-cool-200 dark:border-dark-border shadow-card dark:shadow-dark-card transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cool-200 dark:border-dark-border pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/40 px-2.5 py-1 rounded-md">
              {session.session_type?.replace('_', ' ')} Complete
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-display text-slate-900 dark:text-dark-text mt-2">
              Performance Summary
            </h2>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
              Standard UPSC/SSC negative marking model applied (-0.66 penalty for incorrect in focus/mock modes).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start sm:self-auto">
            <button
              onClick={onReviewAnswers}
              className="px-3.5 sm:px-4 py-2 bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 text-slate-800 dark:text-dark-text text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Review Answers
            </button>
            <button
              onClick={onReturnToHub}
              className="px-3.5 sm:px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              Practice Arena
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 pt-6">
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

        {/* Visual Progress Bar Chart: Question Breakdown */}
        <div className="pt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-dark-text">Question Distribution & Accuracy Chart</span>
            <span className="text-slate-500 dark:text-dark-muted">{stats.correct + stats.wrong + stats.skipped} / {session.total_questions || (stats.correct + stats.wrong + stats.skipped)} Questions Attempted</span>
          </div>

          {/* Multi-color Stacked Bar Chart */}
          <div className="w-full bg-slate-100 dark:bg-dark-card rounded-full h-4 p-0.5 flex overflow-hidden border border-slate-200 dark:border-dark-border shadow-inner">
            {stats.correct > 0 && (
              <div 
                className="bg-flagGreen-500 h-full rounded-l-full transition-all duration-500 relative group"
                style={{ width: `${(stats.correct / Math.max(1, (session.total_questions || stats.correct + stats.wrong + stats.skipped))) * 100}%` }}
                title={`Correct: ${stats.correct}`}
              />
            )}
            {stats.wrong > 0 && (
              <div 
                className="bg-rose-500 h-full transition-all duration-500 relative group"
                style={{ width: `${(stats.wrong / Math.max(1, (session.total_questions || stats.correct + stats.wrong + stats.skipped))) * 100}%` }}
                title={`Incorrect: ${stats.wrong}`}
              />
            )}
            {stats.skipped > 0 && (
              <div 
                className="bg-amber-400 h-full transition-all duration-500 relative group"
                style={{ width: `${(stats.skipped / Math.max(1, (session.total_questions || stats.correct + stats.wrong + stats.skipped))) * 100}%` }}
                title={`Skipped: ${stats.skipped}`}
              />
            )}
            {stats.unattempted > 0 && (
              <div 
                className="bg-slate-300 dark:bg-slate-600 h-full rounded-r-full transition-all duration-500 relative group"
                style={{ width: `${(stats.unattempted / Math.max(1, (session.total_questions || stats.correct + stats.wrong + stats.skipped))) * 100}%` }}
                title={`Unattempted: ${stats.unattempted}`}
              />
            )}
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-600 dark:text-dark-muted pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-flagGreen-500" />
              <span>Correct ({stats.correct})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Incorrect ({stats.wrong})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span>Skipped ({stats.skipped})</span>
            </div>
            {stats.unattempted > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400" />
                <span>Unattempted ({stats.unattempted})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Coach Summary Card */}
      {aiCoach && (
        <div className="box-3d p-6 text-white shadow-card-3d border border-brand-800 space-y-4 bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gold-400" />
              </div>
              <h3 className="text-base font-bold font-display">Sundaram AI Coach Insights</h3>
            </div>
            <span className="text-[10px] text-slate-300 font-medium">Post-Test Cognitive Synthesis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-1">
              <span className="text-flagGreen-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> What Improved
              </span>
              <p className="text-slate-100 font-medium leading-relaxed">{aiCoach.what_improved}</p>
            </div>

            <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-1">
              <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Key Weakness Trap
              </span>
              <p className="text-slate-100 font-medium leading-relaxed">{aiCoach.biggest_weakness}</p>
            </div>
          </div>

          <div className="bg-brand-800/40 p-4 rounded-xl border border-brand-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-gold-300 font-bold uppercase tracking-wider text-[10px]">
                Today's Prescriptive Action
              </span>
              <p className="text-white font-semibold mt-0.5">{aiCoach.short_recommendation}</p>
            </div>

            {stats.wrong > 0 && (
              <button
                onClick={onPracticeMistakes}
                className="px-4 py-2 bg-white text-brand-900 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
              >
                Practice My Mistakes ({stats.wrong})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sectional Performance & Topic Breakdown with Colourful Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-slate-200 dark:border-dark-border shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            Subject Performance Bars
          </h4>
          <div className="space-y-3">
            {subjectBreakdown.length > 0 ? (
              subjectBreakdown.map((subj, idx) => {
                // Multi-color palette rotation (Navy, Saffron, Flag Green, Gold)
                const barColors = [
                  'from-brand-600 to-brand-500',
                  'from-saffron-500 to-amber-500',
                  'from-flagGreen-600 to-emerald-500',
                  'from-gold-500 to-yellow-500',
                ];
                const barColor = barColors[idx % barColors.length];

                return (
                  <div key={idx} className="bg-slate-50 dark:bg-dark-card p-3 rounded-xl border border-slate-200/80 dark:border-dark-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{subj.subject}</span>
                      <span className="font-black text-sm text-slate-900 dark:text-white">{subj.accuracy}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                        style={{ width: `${subj.accuracy}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>{subj.correct} of {subj.total} correct</span>
                      <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                        subj.status === 'STRONG' ? 'bg-flagGreen-100 dark:bg-emerald-950/60 text-flagGreen-800 dark:text-emerald-300' : (subj.status === 'IMPROVING' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300')
                      }`}>
                        {subj.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 dark:text-dark-muted py-4 text-center">Comprehensive subject data will appear here.</p>
            )}
          </div>
        </div>

        {/* Topic Breakdown */}
        <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-slate-200 dark:border-dark-border shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-saffron-600 dark:text-saffron-400" />
            Topic Breakdown & Weak Areas
          </h4>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {topicBreakdown.length > 0 ? (
              topicBreakdown.map((top, idx) => {
                const barColors = [
                  'from-saffron-500 to-amber-500',
                  'from-brand-600 to-brand-500',
                  'from-gold-500 to-yellow-500',
                  'from-flagGreen-600 to-emerald-500',
                ];
                const barColor = barColors[idx % barColors.length];

                return (
                  <div key={idx} className="bg-slate-50 dark:bg-dark-card p-3 rounded-xl border border-slate-200/80 dark:border-dark-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="max-w-[70%]">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">{top.topic}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{top.subject}</span>
                      </div>
                      <span className="font-black text-sm text-slate-900 dark:text-white">{top.accuracy}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                        style={{ width: `${top.accuracy}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                      <span>{top.correct} of {top.total} correct</span>
                      <span className={`font-bold uppercase text-[9px] px-1.5 py-0.2 rounded ${
                        top.status === 'STRONG' ? 'bg-flagGreen-100 dark:bg-emerald-950/60 text-flagGreen-800 dark:text-emerald-300' : (top.status === 'IMPROVING' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300')
                      }`}>
                        {top.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 dark:text-dark-muted py-4 text-center">Topic analytics will appear after more attempts.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

