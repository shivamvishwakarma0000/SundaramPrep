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
  Save,
  Camera,
  GraduationCap,
  Sliders,
  Zap,
  BookOpen
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
  const [profile, setProfile] = useState<StudentProfileData | null>(() => {
    try {
      const cached = localStorage.getItem('sundaram_profile_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('sundaram_profile_cache');
    } catch {
      return true;
    }
  });
  const [editingGoal, setEditingGoal] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('sundaram_user_daily_goal');
      if (stored) return parseInt(stored, 10);
      const cached = localStorage.getItem('sundaram_profile_cache');
      if (cached) {
        const p = JSON.parse(cached);
        if (p?.user?.daily_goal) return p.user.daily_goal;
      }
    } catch {}
    return 40;
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sundaram_reminders_enabled') === 'true' || 
        (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
    } catch {
      return true;
    }
  });

  const handleToggleReminders = async () => {
    if (!remindersEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            setRemindersEnabled(true);
            localStorage.setItem('sundaram_reminders_enabled', 'true');
            api.updateProfile({ reminders_enabled: true } as any).catch(console.error);
            new Notification('Sundaram Prep Daily Briefing', {
              body: '🎯 Daily reminders active: Morning UPSC briefing & streak alert enabled!',
              icon: '/icons/icon-192.png'
            });
            return;
          }
        } catch (e) {
          console.warn('Notification permission error:', e);
        }
      }
      setRemindersEnabled(true);
      localStorage.setItem('sundaram_reminders_enabled', 'true');
    } else {
      setRemindersEnabled(false);
      localStorage.setItem('sundaram_reminders_enabled', 'false');
      api.updateProfile({ reminders_enabled: false } as any).catch(console.error);
    }
  };

  const handleTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Sundaram Prep Daily Briefing', {
        body: '📰 Today\'s Briefing: Supreme Court bench upholds key privacy judgment. Complete your 35 daily questions!',
        icon: '/icons/icon-192.png'
      });
    } else {
      alert('Alert enabled! You will receive daily morning exam briefings and streak notifications.');
    }
  };

  // Custom Home Poster Upload State (Synced with Home View)
  const [customPoster, setCustomPoster] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sundaram_custom_motivation_card_image');
    } catch {
      return null;
    }
  });
  const posterInputRef = React.useRef<HTMLInputElement | null>(null);

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomPoster(base64);
      try {
        localStorage.setItem('sundaram_custom_motivation_card_image', base64);
        window.dispatchEvent(new CustomEvent('sundaram_custom_motivation_card_image_updated', { detail: base64 }));
      } catch (err) {
        console.warn('Failed to save poster locally:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPoster = () => {
    setCustomPoster(null);
    try {
      localStorage.removeItem('sundaram_custom_motivation_card_image');
      window.dispatchEvent(new CustomEvent('sundaram_custom_motivation_card_image_updated', { detail: null }));
    } catch (err) {
      console.warn('Failed to reset poster locally:', err);
    }
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.getProfile();
        setProfile(data);
        try {
          localStorage.setItem('sundaram_profile_cache', JSON.stringify(data));
        } catch {}
        const storedGoal = localStorage.getItem('sundaram_user_daily_goal');
        if (storedGoal) {
          setEditingGoal(parseInt(storedGoal, 10));
        } else if (data.user.daily_goal) {
          setEditingGoal(data.user.daily_goal);
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveGoal = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // 1. Sync to backend profile and today's daily goal record
      await Promise.allSettled([
        api.updateProfile({ daily_goal: editingGoal }),
        api.updateDailyGoal(editingGoal)
      ]);

      // 2. Real-time client-side persistence and cache update
      try {
        localStorage.setItem('sundaram_user_daily_goal', editingGoal.toString());
        const cached = localStorage.getItem('sundaram_home_summary_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.daily_goal) {
            parsed.daily_goal.target_questions = editingGoal;
          }
          localStorage.setItem('sundaram_home_summary_cache', JSON.stringify(parsed));
        }
        // Update profile cache as well
        const profCache = localStorage.getItem('sundaram_profile_cache');
        if (profCache) {
          const p = JSON.parse(profCache);
          if (p.user) p.user.daily_goal = editingGoal;
          localStorage.setItem('sundaram_profile_cache', JSON.stringify(p));
        }
        // 3. Dispatch real-time cross-view event
        window.dispatchEvent(new CustomEvent('sundaram_daily_goal_updated', { detail: editingGoal }));
      } catch {}

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e: any) {
      setSaveError(e?.message || 'Unable to update your preferences. Please try again.');
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. Header Profile Card with Subtle Watermark */}
      <div className="relative overflow-hidden bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-colors group">
        {/* Subtle Watermark SVG */}
        <GraduationCap className="absolute -right-5 -bottom-5 w-32 h-32 text-slate-400/5 dark:text-slate-200/5 pointer-events-none select-none transition-transform group-hover:scale-105" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0B2545] to-[#1E3A8A] text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white truncate">
                {user.name || 'Sundaram Aspirant'}
              </h2>
              {user.email_verified ? (
                <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-dark-border">
                  Standard Account
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] font-bold bg-slate-100 dark:bg-dark-surface text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-dark-border">
                Target: {user.target_exam || currentExam}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-dark-muted">
                Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Exam Readiness Stats (4 Dynamic Metric Cards with Beautiful Watermarks) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Box 1: Questions Solved with CheckCircle Watermark */}
        <div className="relative overflow-hidden bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs transition-colors group">
          <CheckCircle2 className="absolute -right-3 -bottom-3 w-20 h-20 text-emerald-500/10 dark:text-emerald-400/10 pointer-events-none select-none transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted mb-1">
              <span className="text-xs font-semibold">Questions Solved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white">
              {stats.questions_solved}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-dark-muted mt-1">Total attempts</div>
          </div>
        </div>

        {/* Box 2: Tests Taken with Award Watermark */}
        <div className="relative overflow-hidden bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs transition-colors group">
          <Award className="absolute -right-3 -bottom-3 w-20 h-20 text-brand-500/10 dark:text-sky-400/10 pointer-events-none select-none transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted mb-1">
              <span className="text-xs font-semibold">Tests Taken</span>
              <Award className="w-4 h-4 text-brand-600 dark:text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white">
              {stats.tests_taken}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-dark-muted mt-1">Focus + Practice</div>
          </div>
        </div>

        {/* Box 3: Net Accuracy with Target Watermark */}
        <div className="relative overflow-hidden bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs transition-colors group">
          <Target className="absolute -right-3 -bottom-3 w-20 h-20 text-indigo-500/10 dark:text-indigo-400/10 pointer-events-none select-none transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted mb-1">
              <span className="text-xs font-semibold">Net Accuracy</span>
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white">
              {stats.overall_accuracy}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-dark-muted mt-1">-0.66 penalty included</div>
          </div>
        </div>

        {/* Box 4: Study Streak with Flame Watermark */}
        <div className="relative overflow-hidden bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs transition-colors group">
          <Flame className="absolute -right-3 -bottom-3 w-20 h-20 text-amber-500/10 dark:text-amber-400/10 pointer-events-none select-none transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex items-center justify-between text-slate-400 dark:text-dark-muted mb-1">
              <span className="text-xs font-semibold">Study Streak</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white">
              {stats.streak}d
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold mt-1">Active habit</div>
          </div>
        </div>
      </div>

      {/* 3. Account & Practice Preferences Card with Sliders Watermark */}
      <div className="relative overflow-hidden bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 text-slate-900 dark:text-white transition-colors group">
        <Sliders className="absolute -right-6 -bottom-6 w-36 h-36 text-slate-400/5 dark:text-slate-200/5 pointer-events-none select-none transition-transform group-hover:scale-105" />
        <div className="relative z-10 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white">
            Account & Practice Preferences
          </h3>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved successfully!
            </span>
          )}
          {saveError && (
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 animate-in fade-in">
              {saveError}
            </span>
          )}
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Target Exam Switcher */}
          <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-dark-surface rounded-2xl border border-slate-200/80 dark:border-dark-border group">
            <BookOpen className="absolute -right-3 -bottom-3 w-16 h-16 text-slate-400/5 dark:text-slate-200/5 pointer-events-none select-none transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="font-bold text-slate-900 dark:text-white">Primary Exam Target</div>
              <div className="text-slate-500 dark:text-dark-muted mt-0.5">
                Calibrates syllabus, question difficulty, and AI reasoning depth.
              </div>
            </div>
            <select
              value={currentExam}
              onChange={(e) => onExamChange(e.target.value as ExamType)}
              className="relative z-10 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-900 dark:text-white font-bold text-xs py-2 px-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none min-h-[42px] cursor-pointer"
            >
              <option value="UPSC_CSE">UPSC Civil Services (CSE)</option>
              <option value="SSC_CGL">SSC Combined Graduate Level</option>
              <option value="BANK_PO">Banking PO (IBPS / SBI)</option>
              <option value="RAILWAY_RRB">Railway Recruitment Board</option>
              <option value="STATE_PSC">State PSC</option>
            </select>
          </div>

          {/* Daily Goal Target */}
          <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-dark-surface rounded-2xl border border-slate-200/80 dark:border-dark-border group">
            <Zap className="absolute -right-3 -bottom-3 w-16 h-16 text-amber-500/5 dark:text-amber-400/5 pointer-events-none select-none transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="font-bold text-slate-900 dark:text-white">Daily Goal (Questions / Day)</div>
              <div className="text-slate-500 dark:text-dark-muted mt-0.5">
                Sets your target for daily consistency and streak completion.
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="150"
                value={editingGoal}
                onChange={(e) => setEditingGoal(parseInt(e.target.value) || 30)}
                className="w-20 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-900 dark:text-white font-bold text-center py-2 px-2 rounded-xl min-h-[42px]"
              />
              <button
                onClick={handleSaveGoal}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-[#0B2545] hover:bg-[#133A6B] disabled:opacity-50 text-white font-black py-2 px-4 rounded-xl transition-all min-h-[42px] cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Linguistic & Theme Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="relative overflow-hidden p-4 border border-slate-200/80 dark:border-dark-border bg-slate-50 dark:bg-dark-surface rounded-2xl flex items-center justify-between group">
              <Globe className="absolute -right-2 -bottom-2 w-14 h-14 text-slate-400/5 dark:text-slate-200/5 pointer-events-none select-none transition-transform group-hover:scale-110" />
              <div className="relative z-10 flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-slate-500 dark:text-dark-muted" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Language Mode</div>
                  <div className="text-slate-500 dark:text-dark-muted text-[11px]">
                    {settings?.language === 'EN' ? 'English (Bilingual support)' : 'English & Hindi'}
                  </div>
                </div>
              </div>
              <span className="relative z-10 text-xs font-bold text-brand-700 dark:text-sky-400 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-0.5 rounded-full border border-brand-200 dark:border-brand-900/50">
                Active
              </span>
            </div>

            {/* Interactive Theme Switcher */}
            <div className="relative overflow-hidden p-4 border border-slate-200/80 dark:border-dark-border bg-slate-50 dark:bg-dark-surface rounded-2xl flex items-center justify-between group">
              <Moon className="absolute -right-2 -bottom-2 w-14 h-14 text-slate-400/5 dark:text-slate-200/5 pointer-events-none select-none transition-transform group-hover:scale-110" />
              <div className="relative z-10 flex items-center gap-2.5">
                <Moon className="w-4 h-4 text-slate-500 dark:text-dark-muted" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Appearance Theme</div>
                  <div className="text-slate-500 dark:text-dark-muted text-[11px] capitalize">{theme} Mode Active</div>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-1 bg-white dark:bg-dark-card p-1 rounded-xl border border-slate-200 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
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
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'bg-brand-950/60 text-sky-300 border border-brand-800 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Dark mode"
                >
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Daily Reminders with Real Notification API toggle */}
            <div className="relative overflow-hidden p-4 border border-slate-200/80 dark:border-dark-border bg-slate-50 dark:bg-dark-surface rounded-2xl flex items-center justify-between gap-3 group">
              <Bell className="absolute -right-2 -bottom-2 w-14 h-14 text-emerald-500/5 dark:text-emerald-400/5 pointer-events-none select-none transition-transform group-hover:scale-110" />
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 text-slate-500 dark:text-dark-muted shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white">Daily Reminders</div>
                  <div className="text-slate-500 dark:text-dark-muted text-[11px] truncate">
                    Morning briefing & streak alert
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-2 shrink-0">
                {remindersEnabled && (
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                    title="Send a sample notification to your device"
                  >
                    Test Alert
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleReminders}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    remindersEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={remindersEnabled}
                  title={remindersEnabled ? 'Click to disable reminders' : 'Click to enable daily reminders'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      remindersEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Custom Motivation Card Poster Upload */}
            <div className="relative overflow-hidden p-4 border border-slate-200/80 dark:border-dark-border bg-slate-50 dark:bg-dark-surface rounded-2xl flex items-center justify-between gap-3 group">
              <Camera className="absolute -right-2 -bottom-2 w-14 h-14 text-indigo-500/5 dark:text-indigo-400/5 pointer-events-none select-none transition-transform group-hover:scale-110" />
              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <Camera className="w-4 h-4 text-slate-500 dark:text-dark-muted shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white">Home Poster Image</div>
                  <div className="text-slate-500 dark:text-dark-muted text-[11px] truncate">
                    {customPoster ? 'Custom IAS wallpaper active' : 'Upload custom motivation poster'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="file"
                  ref={posterInputRef}
                  onChange={handlePosterUpload}
                  accept="image/*"
                  className="hidden"
                />
                {customPoster && (
                  <button
                    type="button"
                    onClick={handleResetPoster}
                    className="text-[10px] font-bold text-slate-500 hover:text-red-600 bg-white dark:bg-dark-card px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-dark-border transition-colors cursor-pointer"
                    title="Reset to default poster"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => posterInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-300" />
                  <span>{customPoster ? 'Change' : 'Upload Image'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Email Change Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-dark-border">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              PRIMARY EMAIL ADDRESS
            </h4>
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-dark-border bg-slate-50/60 dark:bg-dark-surface space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Current Active Email</div>
                  <div className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">{user.email}</div>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Trusted & Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted leading-relaxed">
                To update your email, enter a new address. A 6-digit OTP will be sent to the new address. Your current email remains trusted until the new address is verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
