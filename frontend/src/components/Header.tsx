import React from 'react';
import { 
  User as UserIcon, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Home, 
  FileEdit, 
  UploadCloud, 
  TrendingUp 
} from 'lucide-react';
import type { ExamType, User, PortalTab } from '../types';
import { useTheme } from '../context/ThemeContext';
import { SundaramLogo } from './common/SundaramLogo';

interface HeaderProps {
  user: User | null;
  currentExam: ExamType;
  onExamChange: (exam: ExamType) => void;
  onOpenAI?: () => void;
  onOpenAuth: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  streakCount?: number;
  activeTab?: PortalTab;
  onTabSelect?: (tab: PortalTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentExam,
  onExamChange,
  onOpenAuth,
  canGoBack = false,
  onGoBack,
  activeTab = 'home',
  onTabSelect,
}) => {
  const { theme, setTheme } = useTheme();

  const examOptions: { id: ExamType; label: string }[] = [
    { id: 'UPSC_CSE', label: 'UPSC CSE' },
    { id: 'SSC_CGL', label: 'SSC CGL' },
    { id: 'BANK_PO', label: 'Banking PO' },
    { id: 'RAILWAY_RRB', label: 'Railway RRB' },
    { id: 'STATE_PSC', label: 'State PSC' },
  ];

  const navItems: { id: PortalTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'practice', label: 'Practice', icon: FileEdit },
    { id: 'upload', label: 'Upload PDF', icon: UploadCloud },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-slate-200/80 dark:border-dark-border px-3 sm:px-6 py-2.5 shadow-subtle dark:shadow-dark-card transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Phone Back Button */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
          {canGoBack && onGoBack && (
            <button
              onClick={onGoBack}
              aria-label="Back"
              className="p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-dark-card hover:bg-slate-200 text-brand-700 dark:text-dark-text border border-slate-300 dark:border-dark-border transition-colors cursor-pointer flex items-center gap-1 shrink-0 font-extrabold text-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Back</span>
            </button>
          )}
          <SundaramLogo size="sm" className="w-8 h-8 sm:w-10 sm:h-10" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-base font-black font-display tracking-tight text-brand-700 dark:text-dark-text leading-tight whitespace-nowrap">
                SUNDARAM PREP
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-md border border-amber-300/50 dark:border-amber-800">
                PRO
              </span>
            </div>
            <p className="hidden sm:block text-[10px] font-semibold text-slate-500 dark:text-dark-muted tracking-wide leading-none mt-0.5">
              Practice. Focus. Improve.
            </p>
          </div>
        </div>

        {/* Center: Integrated 6 Navigation Tabs (Tablet/Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabSelect?.(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 shadow-2xs'
                    : 'text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-dark-text hover:bg-slate-100 dark:hover:bg-dark-card border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Controls (Exam, Theme, Streak, AI Tutor, Sign In) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Target Exam Dropdown */}
          <div className="relative">
            <select
              value={currentExam}
              aria-label="Select Target Exam"
              onChange={(e) => onExamChange(e.target.value as ExamType)}
              className="bg-slate-50 dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-dark-text text-[11px] sm:text-xs font-bold py-1.5 px-2 sm:px-3 rounded-xl border border-slate-200 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors cursor-pointer"
            >
              {examOptions.map((opt) => (
                <option key={opt.id} value={opt.id} className="dark:bg-dark-surface dark:text-dark-text">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle Theme"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-50 dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border cursor-pointer transition-colors shrink-0 shadow-2xs"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            )}
          </button>

          {/* User Profile / Login */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-dark-text border border-slate-300 dark:border-dark-border px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-dark-muted shrink-0" />
            <span className="hidden sm:inline font-semibold">
              {user ? (user.name || user.full_name || 'Aspirant').split(' ')[0] : 'Sign In'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

