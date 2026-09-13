import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Flame, 
  Award, 
  Target, 
  CheckCircle2, 
  Globe, 
  Bell, 
  Moon, 
  Sun,
  Lock, 
  Save
} from 'lucide-react';
import { api } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { CardSkeleton } from '../../components/common/Skeleton';
import type { StudentProfileData, ExamType } from '../../types';

interface ProfileViewProps {
  currentExam: ExamType;
  onExamChange: (exam: ExamType) => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentExam,
  onExamChange,
}) => {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingGoal, setEditingGoal] = useState<number>(30);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.getProfile();
        setProfile(data);
        setEditingGoal(data.user.daily_goal || 30);
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveGoal = async () => {
    try {
      await api.updateProfile({ daily_goal: editingGoal });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !profile) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <CardSkeleton className="h-32" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CardSkeleton className="h-24" />
          <CardSkeleton className="h-24" />
          <CardSkeleton className="h-24" />
          <CardSkeleton className="h-24" />
        </div>
        <CardSkeleton className="h-64" />
      </div>
    );
  }

  const { user, stats, settings } = profile;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Header Profile Card */}
      <div className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border rounded-2xl p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-950 to-royal-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-sm">
            {user.name ? user.name[0] : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                {user.name}
              </h2>
              {user.email_verified && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-semibold bg-cool-100 dark:bg-dark-surface text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-transparent dark:border-dark-border">
                Target: {user.target_exam}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-dark-muted">
                Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Exam Readiness Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted mb-1">
            <span className="text-xs font-medium">Questions Solved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 dark:text-white">
            {stats.questions_solved}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted mt-0.5">Total attempts</div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted mb-1">
            <span className="text-xs font-medium">Tests Taken</span>
            <Award className="w-4 h-4 text-royal-600 dark:text-royal-400" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 dark:text-white">
            {stats.tests_taken}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted mt-0.5">Focus + Practice</div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted mb-1">
            <span className="text-xs font-medium">Net Accuracy</span>
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 dark:text-white">
            {stats.overall_accuracy}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted mt-0.5">-0.66 penalty included</div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted mb-1">
            <span className="text-xs font-medium">Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold font-display text-slate-900 dark:text-white">
            {stats.streak}d
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">Active habit</div>
        </div>
      </div>

      {/* 3. Settings Grid (Section 12 Compliance) */}
      <div className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-5 text-slate-900 dark:text-white">
        <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
          Account & Practice Preferences
        </h3>

        <div className="space-y-4 text-xs">
          {/* Target Exam Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-cool-50 dark:bg-dark-surface rounded-xl border border-cool-200 dark:border-dark-border">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Primary Exam Target</div>
              <div className="text-slate-500 dark:text-dark-muted mt-0.5">
                Calibrates syllabus, question difficulty, and AI reasoning depth.
              </div>
            </div>
            <select
              value={currentExam}
              onChange={(e) => onExamChange(e.target.value as ExamType)}
              className="bg-white dark:bg-dark-card border border-cool-300 dark:border-dark-border text-slate-900 dark:text-white font-semibold text-xs py-2 px-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none min-h-[44px] cursor-pointer"
            >
              <option value="UPSC_CSE">UPSC Civil Services (CSE)</option>
              <option value="SSC_CGL">SSC Combined Graduate Level</option>
              <option value="BANK_PO">Banking PO (IBPS / SBI)</option>
              <option value="RAILWAY_RRB">Railway Recruitment Board</option>
              <option value="STATE_PSC">State PSC</option>
            </select>
          </div>

          {/* Daily Goal Target */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-cool-50 dark:bg-dark-surface rounded-xl border border-cool-200 dark:border-dark-border">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Daily Goal (Questions / Day)</div>
              <div className="text-slate-500 dark:text-dark-muted mt-0.5">
                Sets your target for daily consistency and streak completion.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="150"
                value={editingGoal}
                onChange={(e) => setEditingGoal(parseInt(e.target.value) || 30)}
                className="w-20 bg-white dark:bg-dark-card border border-cool-300 dark:border-dark-border text-slate-900 dark:text-white font-bold text-center py-2 px-2 rounded-xl min-h-[44px]"
              />
              <button
                onClick={handleSaveGoal}
                className="flex items-center gap-1.5 bg-brand-950 dark:bg-brand-600 hover:bg-brand-900 dark:hover:bg-brand-700 text-white font-semibold py-2 px-3.5 rounded-xl transition-colors min-h-[44px] cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              Preferences saved successfully!
            </div>
          )}

          {/* Linguistic & Theme Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500 dark:text-dark-muted" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Language Mode</div>
                  <div className="text-slate-500 dark:text-dark-muted text-[11px]">{settings.language === 'EN' ? 'English (Bilingual support)' : 'Hindi'}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-royal-600 dark:text-royal-400 bg-royal-50 dark:bg-royal-950/40 px-2 py-0.5 rounded border border-royal-200 dark:border-royal-900/50">
                Active
              </span>
            </div>

            {/* Interactive Theme Switcher */}
            <div className="p-3 border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-slate-500 dark:text-dark-muted" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Appearance Theme</div>
                  <div className="text-slate-500 dark:text-dark-muted text-[11px] capitalize">{theme} Mode Active</div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-cool-100 dark:bg-dark-card p-1 rounded-lg border border-cool-200 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'bg-white dark:bg-dark-surface shadow-xs text-amber-600 font-bold'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Light mode"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'bg-white dark:bg-dark-surface shadow-xs text-royal-400 font-bold'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Dark mode"
                >
                  <Moon className="w-3.5 h-3.5 text-brand-400" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div className="p-3 border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500 dark:text-dark-muted" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Daily Reminders</div>
                  <div className="text-slate-500 dark:text-dark-muted text-[11px]">Morning briefing & streak alert</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50">
                Enabled
              </span>
            </div>

            <div className="p-3 border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 dark:text-dark-muted" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Account Security</div>
                  <div className="text-slate-500 dark:text-dark-muted text-[11px]">HTTP-Only Cookies & Resend OTP</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50">
                Active
              </span>
            </div>
          </div>

          {/* Email Change Section (Requirement 6: Old email trusted until new verified) */}
          <div className="pt-4 border-t border-cool-200 dark:border-dark-border">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Primary Email Address
            </h4>
            <div className="p-4 rounded-xl border border-cool-200 dark:border-dark-border bg-cool-50/50 dark:bg-dark-surface space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Active Email</div>
                  <div className="text-xs text-slate-500 dark:text-dark-muted">{user.email}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Trusted & Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted">
                To update your email, enter a new address. A 6-digit OTP will be sent to the new address. Your current email remains trusted until the new address is verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
