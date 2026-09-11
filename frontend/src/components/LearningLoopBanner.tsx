import React from 'react';
import { ChevronRight, FileText, Database, Zap, Target, Award, BarChart3, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import type { PortalTab } from '../types';

interface LearningLoopBannerProps {
  onNavigate: (tab: PortalTab) => void;
  onOpenAI: () => void;
}

export const LearningLoopBanner: React.FC<LearningLoopBannerProps> = ({ onNavigate, onOpenAI }) => {
  const steps = [
    { label: 'PDF / CA', icon: FileText, tab: 'upload' as PortalTab },
    { label: 'Question Bank', icon: Database, tab: 'practice' as PortalTab },
    { label: 'Practice', icon: Zap, tab: 'practice' as PortalTab },
    { label: 'Focus Test', icon: Target, tab: 'practice' as PortalTab },
    { label: 'Results', icon: Award, tab: 'progress' as PortalTab },
    { label: 'Analytics', icon: BarChart3, tab: 'progress' as PortalTab },
    { label: 'Weak Topics', icon: AlertCircle, tab: 'progress' as PortalTab },
    { label: 'AI Revision', icon: Sparkles, action: 'open_ai' },
    { label: 'Improvement', icon: TrendingUp, tab: 'progress' as PortalTab },
  ];

  return (
    <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-royal-700 text-white rounded-2xl p-4 sm:p-6 shadow-card overflow-hidden relative">
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-800/80 border border-brand-700 text-xs font-semibold text-brand-200 mb-1.5">
              <span>The Sundaram Learning Loop</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-white">
              Systematic Mastery Engine
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-brand-200 max-w-sm">
            Continuous cycle turning raw exam sources into verified mastery without cognitive fatigue.
          </p>
        </div>

        {/* Horizontal scrollable step chain */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isAI = step.action === 'open_ai';
            return (
              <React.Fragment key={idx}>
                <button
                  onClick={() => {
                    if (isAI) onOpenAI();
                    else if (step.tab) onNavigate(step.tab);
                  }}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isAI
                      ? 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-sm ring-1 ring-violet-300'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-90" />
                  <span>{step.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-brand-400/60 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-royal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
};
