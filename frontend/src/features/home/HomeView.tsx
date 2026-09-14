import React, { useEffect, useState, useRef } from 'react';
import { 
  Flame, 
  Target, 
  FileText, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  Zap,
  Shield,
  Newspaper
} from 'lucide-react';
import { api } from '../../api/client';
import type { StudentHomeSummary, PortalTab, ExamType } from '../../types';

interface HomeViewProps {
  onNavigate: (tab: PortalTab) => void;
  onLaunchQuick10: () => void;
  onLaunchFocusTest: () => void;
  onOpenAIWithPrompt: (prompt: string) => void;
  onOpenUploadModal: () => void;
  currentExam?: ExamType;
}

const DEFAULT_SUMMARY: StudentHomeSummary = {
  greeting: "Welcome, Aspirant",
  target_exam: "UPSC_CSE",
  streak: 1,
  daily_goal: {
    id: "default-goal",
    target_questions: 35,
    target_study_minutes: 60,
    solved_today: 0,
    minutes_today: 0,
    date: new Date().toISOString().split("T")[0],
    is_achieved: false,
    progress_percentage: 0,
  },
  continue_practice: null,
  quick_10_ready: true,
  daily_current_affairs: {
    title: "Supreme Court Bench on Article 21 & Privacy Jurisprudence",
    date: "Today",
    key_takeaway: "Reaffirms Puttaswamy proportionality test on state surveillance limits.",
    exam_relevance: "UPSC GS-II (Polity & Governance)"
  },
  weak_topic: {
    topic: "Writ Jurisdiction (Art 32 vs 226)",
    subject: "Indian Polity",
    error_rate: 57,
    recommendation: "Review Habeas Corpus & Certiorari distinctions with Sundaram AI"
  },
  weekly_progress: []
};

function getInitialSummary(): StudentHomeSummary {
  try {
    const cached = localStorage.getItem("sundaram_home_summary_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      // Clean up legacy cached 11 from old test state so student starts fresh at 0
      if (parsed.daily_goal && parsed.daily_goal.solved_today === 11) {
        parsed.daily_goal.solved_today = 0;
      }
      return parsed;
    }
  } catch {}
  return DEFAULT_SUMMARY;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onLaunchQuick10,
  onLaunchFocusTest,
  onOpenAIWithPrompt,
  onOpenUploadModal,
  currentExam = 'UPSC_CSE',
}) => {
  const [summary, setSummary] = useState<StudentHomeSummary>(getInitialSummary);

  // Hidden File Input for instant upload capability
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadDuration, setUploadDuration] = useState<number | null>(null);
  const [_uploadStats, setUploadStats] = useState<{
    fileName: string;
    questionCount: number;
    timeTaken: string;
    timestamp: string;
    docId: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom motivation card image (persisted in localStorage & synced from Profile)
  const [customMotivationImage, setCustomMotivationImage] = useState<string>(() => {
    try {
      return localStorage.getItem('sundaram_custom_motivation_card_image') || '/assets/mountain_ias_hiker.jpg';
    } catch {
      return '/assets/mountain_ias_hiker.jpg';
    }
  });

  // Real-time custom daily target (synced with Profile settings)
  const [customDailyTarget, setCustomDailyTarget] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem('sundaram_user_daily_goal');
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  });

  // 1-Second Full-Screen Sparkles Celebration Pop-Out State
  const [showSparkleCelebration, setShowSparkleCelebration] = useState<boolean>(false);

  useEffect(() => {
    const handleGoalUpdated = (e: any) => {
      const newGoal = e.detail || (typeof window !== 'undefined' ? parseInt(localStorage.getItem('sundaram_user_daily_goal') || '0', 10) : 0);
      if (newGoal > 0) {
        setCustomDailyTarget(newGoal);
        setSummary((prev) => ({
          ...prev,
          daily_goal: {
            ...prev.daily_goal,
            target_questions: newGoal,
          },
        }));
      }
    };

    const handlePosterUpdated = (e: any) => {
      setCustomMotivationImage(e.detail || '/assets/mountain_ias_hiker.jpg');
    };

    window.addEventListener('sundaram_daily_goal_updated', handleGoalUpdated);
    window.addEventListener('sundaram_custom_motivation_card_image_updated', handlePosterUpdated);

    return () => {
      window.removeEventListener('sundaram_daily_goal_updated', handleGoalUpdated);
      window.removeEventListener('sundaram_custom_motivation_card_image_updated', handlePosterUpdated);
    };
  }, []);

  const loadHome = async () => {
    try {
      const data = await api.getHomeSummary();
      if (data) {
        if (data.daily_goal && data.daily_goal.solved_today === 11) {
          data.daily_goal.solved_today = 0;
        }
        // If user has a locally configured daily target, preserve it
        const storedGoal = localStorage.getItem('sundaram_user_daily_goal');
        if (storedGoal && data.daily_goal) {
          data.daily_goal.target_questions = parseInt(storedGoal, 10);
        }
        setSummary(data);
        localStorage.setItem("sundaram_home_summary_cache", JSON.stringify(data));
      }
    } catch (e: any) {
      console.warn('Background home summary refresh deferred:', e);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  // Safe dynamic metrics calculation (Zero division prevention)
  const targetQ = customDailyTarget || summary.daily_goal?.target_questions || 40;
  const solvedQ = summary.daily_goal?.solved_today || 0;
  const targetProgress = Math.min(100, Math.round((solvedQ / Math.max(1, targetQ)) * 100));

  // Trigger 1-second full-screen celebration sparkles when daily target questions are completed
  useEffect(() => {
    if (solvedQ >= targetQ && targetQ > 0 && solvedQ > 0) {
      const todayKey = `sundaram_celebrated_${new Date().toDateString()}_${targetQ}`;
      const alreadyCelebrated = sessionStorage.getItem(todayKey);
      if (!alreadyCelebrated) {
        sessionStorage.setItem(todayKey, 'true');
        setShowSparkleCelebration(true);
        const timer = setTimeout(() => {
          setShowSparkleCelebration(false);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [solvedQ, targetQ]);

  const examMap: Record<string, string> = {
    UPSC_CSE: 'UPSC CSE',
    SSC_CGL: 'SSC CGL',
    BANK_PO: 'Banking PO',
    RAILWAY_RRB: 'Railway RRB',
    STATE_PSC: 'State PSC'
  };
  const currentExamLabel = examMap[currentExam || summary.target_exam || 'UPSC_CSE'] || 'UPSC CSE';

  // Handle direct file selection
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    const startTime = Date.now();

    const timerInterval = setInterval(() => {
      setUploadDuration(Math.round((Date.now() - startTime) / 100) / 10);
    }, 100);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadPDF(formData);

      clearInterval(timerInterval);
      const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

      setUploadStats({
        fileName: file.name,
        questionCount: res.document?.extracted_questions_count || 0,
        timeTaken: `${totalSeconds}s`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        docId: res.document?.id || '',
      });
      loadHome();
    } catch (err: any) {
      clearInterval(timerInterval);
      setUploadError(err.message || 'Upload failed. Please try a standard PDF paper.');
    } finally {
      setUploading(false);
      setUploadDuration(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto transition-colors">
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.txt"
        onChange={handleDirectFileUpload}
        disabled={uploading}
        className="hidden"
      />

      {uploading && (
        <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-xs font-bold p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>Extracting questions from exam PDF... ({uploadDuration || 0}s elapsed)</span>
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400">Processing with Sundaram AI</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Deep Navy Gradient, Target Badge, Dynamic Stats, Visual) */}
      {/* Sleek, compact hero height with smoothly blended background visual */}
      {/* ========================================================================= */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#071A35] via-[#0B2A55] to-[#0A2246] border border-white/10 shadow-xl py-5 px-5 sm:py-6 sm:px-7 lg:py-6 lg:px-8 text-white">
        {/* Soft background ambient light blooms */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Study Desk Visual: Crisp on the right side, completely seamless gradient fade toward center & left */}
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0">
          <img
            src="/assets/hero_upsc_study.jpg"
            alt="UPSC Preparation Study Desk"
            className="w-full h-full object-cover object-right opacity-90 contrast-[1.05]"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, transparent 28%, rgba(0,0,0,0.2) 42%, rgba(0,0,0,0.7) 60%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 28%, rgba(0,0,0,0.2) 42%, rgba(0,0,0,0.7) 60%, black 100%)'
            }}
          />
          {/* Multi-stage harmonizing gradient eliminating any color difference or edge line */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#071A35] via-[#071A35]/80 via-40% to-transparent" />
          <div className="absolute inset-0 bg-[#071A35]/20 mix-blend-multiply" />
        </div>

        {/* Academic watermark emblem in hero */}
        <div className="absolute right-6 -bottom-8 w-48 h-48 pointer-events-none opacity-[0.03] select-none text-sky-200">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
          </svg>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Left Column: Heading, Badges, CTA */}
          <div className="lg:col-span-7 space-y-2.5">
            {/* Target Exam Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold text-sky-200 shadow-xs">
              <Target className="w-3 h-3 text-sky-400" />
              <span>{currentExamLabel}</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black font-display tracking-tight text-white leading-tight">
              Your {currentExamLabel.includes('UPSC') ? 'UPSC' : currentExamLabel} Journey{' '}
              <span className="bg-gradient-to-r from-sky-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                Starts Here
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-lg leading-snug line-clamp-2">
              Smart practice, expert guidance and AI support to help you crack {currentExamLabel} with confidence.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] sm:text-[11px] font-semibold text-white shadow-2xs">
                🎯 MCQs
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] sm:text-[11px] font-semibold text-white shadow-2xs">
                📝 Answer Writing
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] sm:text-[11px] font-semibold text-white shadow-2xs">
                📊 Progress Tracking
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] sm:text-[11px] font-semibold text-white shadow-2xs">
                ✨ AI Tutor
              </span>
            </div>

            {/* CTA Button Row */}
            <div className="pt-2">
              <button
                onClick={() => onNavigate('practice')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-blue-500/25 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Target className="w-4 h-4" />
                <span>Start Practicing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Target & Streak Dashboard Widgets */}
          <div className="lg:col-span-5 flex flex-col items-end justify-center gap-2.5">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full justify-end">
              {/* Active Streak Card */}
              <div className="flex items-center gap-2.5 bg-white/95 text-slate-900 px-4 py-2.5 rounded-2xl shadow-lg border border-white/40 flex-1 sm:flex-initial min-w-[130px]">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                  <Flame className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black font-display leading-tight">
                    {summary.streak || 1} Days
                  </div>
                  <div className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider">
                    ACTIVE STREAK
                  </div>
                </div>
              </div>

              {/* Today's Target Widget */}
              <div className="bg-white/95 text-slate-900 px-4 py-2.5 rounded-2xl shadow-lg border border-white/40 flex-1 sm:flex-initial min-w-[140px]">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>Today's Target</span>
                  <span className="font-extrabold text-blue-700">{solvedQ}/{targetQ} Qs</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${targetProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Slanted Handwritten Dream Prepare Achieve script from Image 3 */}
            <div className="hidden sm:flex flex-col items-center -rotate-6 select-none mr-2 mt-0.5">
              <span className="text-sky-200 font-serif italic text-base sm:text-lg font-black tracking-wide drop-shadow-sm">
                Dream · Prepare · Achieve
              </span>
              <svg className="w-32 h-2 text-sky-300/80 -mt-0.5" viewBox="0 0 120 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 6C30 2 90 2 116 5" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Direct PDF Upload Status Banner (appears when uploading) */}
      {uploading && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Processing your exam PDF... extracting bilingual MCQs ({uploadDuration}s)</span>
          </div>
          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded font-black">AI Engine Active</span>
        </div>
      )}

      {/* Direct Upload Error Feedback */}
      {uploadError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT LAYOUT: Vertical Motivational Card + 4 Feature Cards (Image 2) */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 sm:gap-5">
        {/* LEFT COLUMN: Vertical Motivational Banner Card (Matching Image 2 Reference) */}
        <div className="w-full lg:w-[260px] xl:w-[280px] shrink-0 flex flex-col">
          <div className="relative rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow min-h-[380px] sm:min-h-[420px] h-full flex flex-col justify-between p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 group">
            {/* Background Visual (Responsive fit for any custom uploaded dimension) */}
            <img
              src={customMotivationImage}
              alt="Inspirational UPSC study background"
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            />

            {/* Top Light Mist Gradient Overlay for 100% Crisp Dark Typography */}
            <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/95 via-white/80 via-40% to-transparent dark:from-slate-950/95 dark:via-slate-950/80 pointer-events-none" />

            {/* Bottom Dark Gradient Overlay for Quote Legibility */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/95 via-slate-950/60 via-40% to-transparent pointer-events-none" />

            {/* Top Section */}
            <div className="relative z-10">
              <span className="text-3xl sm:text-4xl font-serif text-slate-800 dark:text-slate-100 block leading-none select-none">“</span>
              <h3 className="text-base sm:text-[17px] font-black font-display leading-tight tracking-tight text-slate-900 dark:text-white mt-1">
                Small steps<br />
                every day lead to<br />
                big results.
              </h3>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                Keep going, future IAS is waiting for you!
              </p>
            </div>

            {/* Bottom Section */}
            <div className="relative z-10 pt-4">
              <span className="inline-block bg-[#0B2545]/90 backdrop-blur-md px-3 py-0.5 rounded-full text-[10px] font-black text-white border border-white/20 mb-2 shadow-xs">
                {currentExamLabel}
              </span>
              <p className="text-[11px] text-slate-100 font-medium italic leading-relaxed drop-shadow-sm">
                "The journey of a thousand miles begins with a single step."
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4 Feature Cards (Expansive 2x2 Grid Matching Image 2) */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* CARD 1: Start Practice Arena */}
          <div
            onClick={() => onNavigate('practice')}
            className="relative overflow-hidden bg-gradient-to-br from-blue-50/90 via-white to-sky-50/50 dark:from-blue-950/30 dark:via-dark-card dark:to-slate-900 border border-blue-200/90 dark:border-blue-800/50 hover:border-blue-500 dark:hover:border-blue-400 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
          >
            {/* Rich Fluid Background Curve Watermark */}
            <div className="absolute right-0 top-0 bottom-0 w-56 pointer-events-none opacity-20 dark:opacity-25 select-none text-blue-600 dark:text-blue-400 flex items-center justify-end pr-1 transition-transform group-hover:scale-105 duration-300">
              <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" stroke="currentColor">
                <circle cx="150" cy="100" r="80" strokeWidth="6" strokeDasharray="6 6" />
                <circle cx="150" cy="100" r="50" strokeWidth="4" />
                <circle cx="150" cy="100" r="20" strokeWidth="3" fill="currentColor" fillOpacity="0.3" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white dark:bg-blue-500 shadow-md shadow-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Target className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-800 text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Answers
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                Start Practice Arena
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                Instant MCQs with real-time feedback & high-yield takeaways.
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 mt-3 border-t border-blue-100 dark:border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLaunchQuick10();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl bg-white dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs transition-colors cursor-pointer"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Quick 10</span>
              </button>
              <div className="flex items-center gap-1 text-xs font-black text-blue-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform">
                <span>Start</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* CARD 2: Upload PDF */}
          <div
            onClick={onOpenUploadModal}
            className="relative overflow-hidden bg-gradient-to-br from-purple-50/90 via-white to-fuchsia-50/50 dark:from-purple-950/30 dark:via-dark-card dark:to-slate-900 border border-purple-200/90 dark:border-purple-800/50 hover:border-purple-500 dark:hover:border-purple-400 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
          >
            {/* Rich Document Watermark */}
            <div className="absolute right-0 top-0 bottom-0 w-52 pointer-events-none opacity-20 dark:opacity-25 select-none text-purple-600 dark:text-purple-400 flex items-center justify-end pr-2 transition-transform group-hover:scale-105 duration-300">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M28 15h32l16 16v54H28z" fill="currentColor" fillOpacity="0.08" />
                <path d="M60 15v16h16" />
                <line x1="38" y1="45" x2="66" y2="45" strokeWidth="3" />
                <line x1="38" y1="58" x2="66" y2="58" strokeWidth="3" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white dark:bg-purple-500 shadow-md shadow-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 dark:bg-purple-950/80 border border-purple-300/80 dark:border-purple-800 text-[10px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-wide shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Auto-Extract
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                Upload PDF
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                Convert test paper PDFs into interactive MCQs with speed metrics.
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 mt-3 border-t border-purple-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Zap className="w-3.5 h-3.5 text-purple-500" />
                <span>Fast · Bilingual</span>
              </span>
              <div className="flex items-center gap-1 text-xs font-black text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                <span>Upload</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* CARD 3: Time Focus Test */}
          <div
            onClick={onLaunchFocusTest}
            className="relative overflow-hidden bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-dark-card dark:to-slate-900 border border-emerald-200/90 dark:border-emerald-800/50 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
          >
            {/* Rich Clock Dial Watermark */}
            <div className="absolute right-0 top-0 bottom-0 w-52 pointer-events-none opacity-20 dark:opacity-25 select-none text-emerald-600 dark:text-emerald-400 flex items-center justify-end pr-2 transition-transform group-hover:scale-105 duration-300">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="50" cy="50" r="38" fill="currentColor" fillOpacity="0.08" />
                <path d="M50 20v-8m-10 0h20" />
                <path d="M50 50l16-16" strokeWidth="3" />
                <circle cx="50" cy="50" r="4" fill="currentColor" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white dark:bg-emerald-500 shadow-md shadow-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300/80 dark:border-emerald-800 text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Proctor Sim
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Time Focus Test
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                Timed simulation with negative marking and focus integrity tracking.
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 mt-3 border-t border-emerald-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Strict Countdown</span>
              </span>
              <div className="flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Launch</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* CARD 4: Progress & Mistake */}
          <div
            onClick={() => onNavigate('progress')}
            className="relative overflow-hidden bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 dark:from-amber-950/30 dark:via-dark-card dark:to-slate-900 border border-amber-200/90 dark:border-amber-800/50 hover:border-amber-500 dark:hover:border-amber-400 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
          >
            {/* Rich Growth Chart Watermark */}
            <div className="absolute right-0 top-0 bottom-0 w-56 pointer-events-none opacity-20 dark:opacity-25 select-none text-amber-600 dark:text-amber-400 flex items-center justify-end pr-2 transition-transform group-hover:scale-105 duration-300">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 85h70" strokeWidth="3" />
                <rect x="22" y="55" width="12" height="30" rx="2" fill="currentColor" fillOpacity="0.15" />
                <rect x="42" y="40" width="12" height="45" rx="2" fill="currentColor" fillOpacity="0.2" />
                <rect x="62" y="25" width="12" height="60" rx="2" fill="currentColor" fillOpacity="0.25" />
                <path d="M25 45l20-15 20 5 18-18" strokeWidth="3" strokeDasharray="3 3" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white dark:bg-amber-500 shadow-md shadow-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100/80 dark:bg-amber-950/80 border border-amber-300/80 dark:border-amber-800 text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide shadow-2xs">
                  <span className="font-extrabold">+</span> Analytics
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Progress & Mistake
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                Accuracy, speed, consistency metrics, and error notebook drills.
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 mt-3 border-t border-amber-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span>Track • Improve • Excel</span>
              </span>
              <div className="flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>Review</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DAILY CURRENT AFFAIRS HIGHLIGHT BANNER                                 */}
      {/* ========================================================================= */}
      <section 
        onClick={() => onNavigate('news')}
        className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-blue-800/60 hover:border-blue-500/80 transition-all cursor-pointer group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        {/* Soft Background Watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none opacity-10 select-none text-blue-400 flex items-center justify-end pr-4">
          <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" stroke="currentColor">
            <circle cx="150" cy="100" r="75" strokeWidth="4" strokeDasharray="6 6" />
            <circle cx="150" cy="100" r="45" strokeWidth="3" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-sky-300 shrink-0 group-hover:scale-105 transition-transform shadow-2xs backdrop-blur-md">
            <Newspaper className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                UPSC Daily Pulse
              </span>
              <span className="text-[10px] text-sky-200 font-bold bg-white/10 px-2 py-0.5 rounded-full">
                PIB • The Hindu • Indian Express
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black font-display text-white group-hover:text-sky-300 transition-colors truncate">
              {summary.daily_current_affairs?.title || "Today's UPSC Current Affairs & Gemini Analysis"}
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5 line-clamp-1">
              {summary.daily_current_affairs?.key_takeaway || "Read structured Prelims facts, Mains frameworks, and practice MCQs."}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 self-end sm:self-center shrink-0">
          <span className="bg-sky-400 text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-sm group-hover:bg-sky-300 transition-colors flex items-center gap-1.5">
            <span>Read Today's News</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. POWERED BY AI BANNER (Section 18)                                      */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-r from-blue-50/80 via-purple-50/80 to-indigo-50/80 dark:from-slate-900/90 dark:via-purple-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        {/* Subtle Decorative Background Watermark: AI Sparkle */}
        <div className="absolute right-28 -bottom-6 w-36 h-36 pointer-events-none opacity-[0.05] dark:opacity-[0.03] select-none text-purple-700 dark:text-purple-300">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black font-display bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-300 dark:to-blue-300 bg-clip-text text-transparent">
              Powered by AI
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5 truncate">
              Get instant help, clear concepts and personalized guidance with AI Tutor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <button
            onClick={() => onOpenAIWithPrompt("Hello! How can Sundaram AI Tutor help me master my exam topics?")}
            className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Chat with AI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <img
            src="/assets/ai_robot_avatar.jpg"
            alt="Sundaram AI Mentor Avatar"
            className="w-12 h-12 rounded-full border-2 border-purple-300 dark:border-purple-600 shadow-md object-cover shrink-0"
          />
        </div>
      </section>

      {/* Daily Goal Achieved - Full Screen 1 Second Sparkle Celebration Pop-Out */}
      {showSparkleCelebration && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center animate-in zoom-in-75 fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200" />
          <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center animate-bounce">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.9)] border-4 border-white animate-pulse">
                <Sparkles className="w-12 h-12 text-amber-950 fill-amber-400" />
              </div>
              <span className="absolute -top-3 -left-3 text-3xl animate-ping">✨</span>
              <span className="absolute -top-4 -right-3 text-2xl animate-ping delay-100">🌟</span>
              <span className="absolute -bottom-2 -left-4 text-2xl animate-ping delay-200">🎉</span>
              <span className="absolute -bottom-3 -right-3 text-3xl animate-ping delay-150">✨</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg mt-4">
              Daily Goal Completed! 🎯
            </h3>
            <p className="text-sm font-bold text-amber-200 drop-shadow mt-1">
              {solvedQ} / {targetQ} Questions Done for Today
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
