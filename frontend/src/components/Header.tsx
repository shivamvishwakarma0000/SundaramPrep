import React, { useState } from 'react';
import { Flame, Sparkles, User as UserIcon, Sun, Moon, Laptop } from 'lucide-react';
import type { ExamType, User } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  user: User | null;
  currentExam: ExamType;
  onExamChange: (exam: ExamType) => void;
  onOpenAI: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentExam,
  onExamChange,
  onOpenAI,
  onOpenAuth,
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const examOptions: { id: ExamType; label: string }[] = [
    { id: 'UPSC_CSE', label: 'UPSC CSE' },
    { id: 'SSC_CGL', label: 'SSC CGL' },
    { id: 'BANK_PO', label: 'Banking (PO/Clerk)' },
    { id: 'RAILWAY_RRB', label: 'Railway (RRB)' },
    { id: 'STATE_PSC', label: 'State PSC' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-dark-surface/95 backdrop-blur border-b border-cool-200 dark:border-dark-border px-3 sm:px-6 py-2.5 sm:py-3 shadow-subtle dark:shadow-dark-card transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img
            src="/favicon.png"
            alt="Sundaram Prep Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-xs ring-2 ring-brand-400/50 dark:ring-brand-500/50 bg-white dark:bg-dark-surface shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-bold font-display tracking-tight text-slate-900 dark:text-dark-text leading-tight">
                SUNDARAM PREP
              </h1>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-semibold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 rounded border border-brand-200 dark:border-brand-800">
                PRO
              </span>
            </div>
            <p className="hidden xs:block sm:block text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-dark-muted tracking-wide leading-none mt-0.5">
              Practice. Focus. Improve.
            </p>
          </div>
        </div>

        {/* Exam Target Selector & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Target Exam Dropdown - Compact on mobile, spacious on tablet/desktop */}
          <div className="relative">
            <select
              value={currentExam}
              aria-label="Select Target Exam"
              onChange={(e) => onExamChange(e.target.value as ExamType)}
              className="bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 text-slate-900 dark:text-dark-text text-[11px] sm:text-xs md:text-sm font-semibold py-1.5 px-2 sm:px-3 rounded-xl border border-cool-200 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors cursor-pointer max-w-[95px] xs:max-w-[120px] sm:max-w-none truncate"
            >
              {examOptions.map((opt) => (
                <option key={opt.id} value={opt.id} className="dark:bg-dark-surface dark:text-dark-text">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Selector Button */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              aria-label="Toggle Theme"
              className="p-1.5 sm:p-2 rounded-xl bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 text-slate-700 dark:text-dark-text border border-cool-200 dark:border-dark-border transition-colors cursor-pointer flex items-center justify-center min-h-[36px] min-w-[36px]"
              title={`Current Theme: ${theme}`}
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              )}
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-dark-surface rounded-xl shadow-elevated border border-cool-200 dark:border-dark-border py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setTheme('light');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    theme === 'light'
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40'
                      : 'text-slate-700 dark:text-dark-muted hover:bg-cool-50 dark:hover:bg-dark-card'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Light
                </button>
                <button
                  onClick={() => {
                    setTheme('dark');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    theme === 'dark'
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40'
                      : 'text-slate-700 dark:text-dark-muted hover:bg-cool-50 dark:hover:bg-dark-card'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-violet-400" />
                  Dark
                </button>
                <button
                  onClick={() => {
                    setTheme('system');
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    theme === 'system'
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40'
                      : 'text-slate-700 dark:text-dark-muted hover:bg-cool-50 dark:hover:bg-dark-card'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  System
                </button>
              </div>
            )}
          </div>

          {/* Streak Badge */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold shadow-xs">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500 shrink-0" />
            <span>{user ? user.streak_count : 7}d</span>
          </div>

          {/* Sundaram AI Trigger */}
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-violet-600 to-brand-600 hover:from-violet-700 hover:to-brand-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-200 shrink-0" />
            <span className="hidden sm:inline">Sundaram AI</span>
            <span className="sm:hidden text-[11px]">AI</span>
          </button>

          {/* User Profile / Login */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 bg-white dark:bg-dark-card hover:bg-cool-50 dark:hover:bg-slate-700 text-slate-700 dark:text-dark-text border border-cool-300 dark:border-dark-border p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[36px]"
          >
            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-dark-muted shrink-0" />
            <span className="hidden md:inline">
              {user ? (user.name || user.full_name || 'Aspirant').split(' ')[0] : 'Sign In'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

