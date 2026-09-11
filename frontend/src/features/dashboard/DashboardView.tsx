import React from 'react';
import { Zap, Target, FileText, Sparkles, Flame, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { ExamType, User, WeakTopic, PortalTab } from '../../types';

interface DashboardViewProps {
  user: User | null;
  currentExam: ExamType;
  weakTopics: WeakTopic[];
  onNavigate: (tab: PortalTab) => void;
  onOpenAIWithPrompt: (prompt: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  currentExam,
  weakTopics,
  onNavigate,
  onOpenAIWithPrompt,
}) => {
  const examNameMap: Record<ExamType, string> = {
    UPSC_CSE: 'UPSC Civil Services Examination',
    SSC_CGL: 'SSC Combined Graduate Level',
    BANK_PO: 'Banking Probationary Officer (IBPS / SBI)',
    RAILWAY_RRB: 'Railway Recruitment Board (NTPC)',
    STATE_PSC: 'State Public Service Commission',
  };

  return (
    <div className="space-y-6">
      {/* Target Exam Status Hero */}
      <div className="bg-white border border-cool-200 rounded-2xl p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-royal-600">
              Active Exam Target
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
            {examNameMap[currentExam]}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Questions, Focus Tests, and AI explanations are strictly calibrated to official syllabus standards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('practice')}
            className="flex items-center gap-2 bg-royal-600 hover:bg-royal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>Start Practice</span>
          </button>
          <button
            onClick={() => onNavigate('practice')}
            className="flex items-center gap-2 bg-brand-950 hover:bg-brand-900 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Target className="w-4 h-4 text-brand-300" />
            <span>Launch Focus Test</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-cool-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Questions Solved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900">
            {user ? user.questions_solved : 142}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            +18 today
          </div>
        </div>

        <div className="bg-white border border-cool-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900">
            {user ? user.streak_count : 7} <span className="text-sm font-semibold text-slate-500">days</span>
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            Top 5% consistency
          </div>
        </div>

        <div className="bg-white border border-cool-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Overall Accuracy</span>
            <ShieldCheck className="w-4 h-4 text-royal-600" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900">
            78.4%
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Negative-marking factored
          </div>
        </div>

        <div className="bg-white border border-cool-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Weak Spots Found</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold font-display text-rose-600">
            {weakTopics.length || 3}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Ready for AI revision
          </div>
        </div>
      </div>

      {/* Weak Topics Alert & AI 1-Click Revision */}
      <div className="bg-gradient-to-br from-violet-50 to-brand-50 border border-violet-200 rounded-2xl p-5 sm:p-6 shadow-subtle">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-brand-950 font-display">
                Algorithmic Weak Topic Detection
              </h3>
              <p className="text-xs text-slate-600">
                Sundaram AI identified conceptual blindspots from your recent sessions.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('progress')}
            className="text-xs font-bold text-violet-700 hover:text-violet-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {(weakTopics.slice(0, 3)).map((wt, idx) => (
            <div
              key={idx}
              className="bg-white/90 border border-violet-100 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-violet-900">{wt.subject}</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                    {Math.round(wt.weakness_score * 100)}% Error Rate
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                  {wt.topic}
                </h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {wt.recommendation || 'Frequent confusion detected in statement-based options.'}
                </p>
              </div>

              <button
                onClick={() =>
                  onOpenAIWithPrompt(
                    `I am struggling with the topic "${wt.topic}" in ${wt.subject}. Please give me a 3-minute high-yield breakdown: Answer key points, Why students fail it, Quick Fact, and a memorable Memory Trick.`
                  )
                }
                className="mt-3 w-full py-1.5 px-2.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-700" />
                <span>1-Click AI Revision</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Practice */}
        <div
          onClick={() => onNavigate('practice')}
          className="group bg-white hover:bg-cool-50 border border-cool-200 rounded-2xl p-5 shadow-subtle cursor-pointer transition-all hover:border-brand-300 hover:shadow-card"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-royal-600 transition-colors">
            Topic-Wise Practice
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Untimed drill with instant pedagogical feedback: Answer, Why, Quick Fact, Memory Trick.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-royal-600 gap-1">
            <span>Enter Arena</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Focus Test */}
        <div
          onClick={() => onNavigate('practice')}
          className="group bg-white hover:bg-cool-50 border border-cool-200 rounded-2xl p-5 shadow-subtle cursor-pointer transition-all hover:border-brand-300 hover:shadow-card"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-brand-950 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-900 transition-colors">
            Exam Focus Test
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Exact exam simulation with countdown timer, negative marking (1/3rd penalty), and full review scorecard.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-brand-900 gap-1">
            <span>Start Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* PDF Intelligence */}
        <div
          onClick={() => onNavigate('upload')}
          className="group bg-white hover:bg-cool-50 border border-cool-200 rounded-2xl p-5 shadow-subtle cursor-pointer transition-all hover:border-brand-300 hover:shadow-card"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
            PDF Intelligence Studio
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload test papers or notes. Auto-extract questions, verify missing keys with AI reasoning, and import into your bank.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-700 gap-1">
            <span>Upload PDF</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
