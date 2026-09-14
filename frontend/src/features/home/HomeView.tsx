import React, { useEffect, useState, useRef } from 'react';
import { 
  Flame, 
  Target, 
  FileText, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Shield
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
  const [uploadStats, setUploadStats] = useState<{
    fileName: string;
    questionCount: number;
    timeTaken: string;
    timestamp: string;
    docId: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHome = async () => {
    try {
      const data = await api.getHomeSummary();
      if (data) {
        if (data.daily_goal && data.daily_goal.solved_today === 11) {
          data.daily_goal.solved_today = 0;
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
  const targetQ = summary.daily_goal?.target_questions || 35;
  const solvedQ = summary.daily_goal?.solved_today || 0;
  const targetProgress = Math.min(100, Math.round((solvedQ / Math.max(1, targetQ)) * 100));

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

        {/* Study Desk Visual: Crisp on the right side, smoothly dissolving toward center */}
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[52%] lg:w-[46%] h-full pointer-events-none overflow-hidden select-none z-0">
          <img
            src="/assets/hero_upsc_study.jpg"
            alt="UPSC Preparation Study Desk"
            className="w-full h-full object-cover object-right sm:object-center opacity-85 sm:opacity-95 contrast-[1.05]"
          />
          {/* Smooth left-to-center fade: navy on the left dissolving to transparent on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#071A35] via-[#071A35]/60 via-35% to-transparent" />
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

            {/* Action Button */}
            <div className="pt-1">
              <button
                onClick={() => onNavigate('practice')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs px-4 py-2 rounded-full shadow-md shadow-blue-500/25 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-white" />
                <span>Start Practicing</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Cards + High-End Integrated Stats */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end gap-3">
            {/* Top Floating Dynamic Cards */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 w-full">
              {/* Dynamic Active Streak Card */}
              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-2.5 sm:p-3 shadow-lg border border-white/25 dark:border-slate-800 flex items-center gap-2.5 text-slate-900 dark:text-white shrink-0">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-amber-500">
                  <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm font-black leading-tight text-slate-900 dark:text-white">
                    {summary.streak} Days
                  </div>
                  <div className="text-[9px] text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider">
                    Active Streak
                  </div>
                </div>
              </div>

              {/* Dynamic Today's Target Card */}
              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-2.5 sm:p-3 shadow-lg border border-white/25 dark:border-slate-800 min-w-[145px] text-slate-900 dark:text-white shrink-0">
                <div className="flex items-center justify-between text-[11px] mb-1.5 gap-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Today's Target</span>
                  <span className="font-black text-blue-600 dark:text-sky-400">{solvedQ}/{targetQ} Qs</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${targetProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Seamless Educational Caption floating cleanly over the background */}
            <div className="inline-flex items-center justify-between gap-2.5 text-[10px] text-white/90 font-bold backdrop-blur-md px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 shadow-sm">
              <span>Civil Services Examination</span>
              <span className="text-amber-300">Dream · Prepare · Achieve</span>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Notification Strip (if upload action was performed) */}
      {uploadStats && (
        <div className="bg-white dark:bg-dark-card border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Processed <strong className="text-slate-900 dark:text-white">{uploadStats.fileName}</strong>: {uploadStats.questionCount} MCQs extracted in {uploadStats.timeTaken} at {uploadStats.timestamp}
            </span>
          </div>
          <button
            onClick={() => onNavigate('upload')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Solve Extracted MCQs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT LAYOUT: Motivational Card (Left) + 4 Feature Cards (Right) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN: Motivational Side Card (Section 13) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="relative rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow min-h-[440px] h-full flex flex-col justify-between p-6 sm:p-7 text-white border border-slate-200/80 dark:border-slate-800 group">
            {/* Background Hiker Mountain Landscape Visual */}
            <img
              src="/assets/mountain_ias_hiker.jpg"
              alt="Hiker standing on mountain summit looking at sunrise"
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            />
            {/* Dark contrast gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/70" />

            {/* Motivational Content */}
            <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
              <div>
                <span className="text-4xl sm:text-5xl font-serif text-white/70 block leading-none select-none">“</span>
                <h3 className="text-xl sm:text-2xl font-black font-display leading-tight tracking-tight mt-1 text-white drop-shadow-sm">
                  Small steps<br />
                  every day lead to<br />
                  big results.
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-3 drop-shadow-sm">
                  Keep going, future IAS is waiting for you!
                </p>
              </div>

              <div className="pt-6">
                <span className="inline-block bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-white border border-white/25 mb-2.5 shadow-xs">
                  {currentExamLabel}
                </span>
                <p className="text-xs text-slate-300 font-medium italic drop-shadow-sm leading-relaxed">
                  "The journey of a thousand miles begins with a single step."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4 Feature Cards (2x2 Grid, Section 14, 15, 16) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4.5">
          {/* ------------------------------------------------------------------- */}
          {/* CARD 1: Start Practice Arena (Blue Accent, Bullseye Watermark)       */}
          {/* ------------------------------------------------------------------- */}
          <div
            onClick={() => onNavigate('practice')}
            className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            {/* Subtle Decorative Background Watermark (Section 15) */}
            <svg 
              className="absolute -right-4 -bottom-4 w-44 h-44 text-blue-500 opacity-[0.07] dark:opacity-[0.04] pointer-events-none select-none" 
              viewBox="0 0 100 100" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              aria-hidden="true"
            >
              <circle cx="50" cy="50" r="42" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="30" />
              <circle cx="50" cy="50" r="18" />
              <circle cx="50" cy="50" r="6" fill="currentColor" />
              <line x1="50" y1="5" x2="50" y2="25" />
              <line x1="50" y1="75" x2="50" y2="95" />
              <line x1="5" y1="50" x2="25" y2="50" />
              <line x1="75" y1="50" x2="95" y2="50" />
            </svg>

            <div className="relative z-10">
              {/* Header: Icon Container + Status Pill */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform shadow-2xs">
                  <Target className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Answers
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-black font-display text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Start Practice Arena
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Instant MCQs with real-time feedback & high-yield takeaways.
              </p>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLaunchQuick10();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Quick 10</span>
              </button>
              <div className="flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                <span>Start</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* CARD 2: Upload PDF (Purple Accent, Document Watermark)              */}
          {/* ------------------------------------------------------------------- */}
          <div
            onClick={onOpenUploadModal}
            className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-400 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            {/* Subtle Decorative Background Watermark (Section 15) */}
            <svg 
              className="absolute -right-4 -bottom-4 w-44 h-44 text-purple-500 opacity-[0.07] dark:opacity-[0.04] pointer-events-none select-none" 
              viewBox="0 0 100 100" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              aria-hidden="true"
            >
              <path d="M28 15h32l16 16v54H28z" />
              <path d="M60 15v16h16" />
              <line x1="38" y1="45" x2="66" y2="45" />
              <line x1="38" y1="58" x2="66" y2="58" />
              <line x1="38" y1="71" x2="54" y2="71" />
            </svg>

            <div className="relative z-10">
              {/* Header: Icon Container + Status Pill */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/70 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform shadow-2xs">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Auto-Extract
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-black font-display text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Upload PDF
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Convert test paper PDFs into interactive MCQs with speed metrics.
              </p>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <Zap className="w-3 h-3 text-purple-500" />
                <span>Fast · Bilingual</span>
              </span>
              <div className="flex items-center gap-1 text-xs font-black text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                <span>Upload</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* CARD 3: Time Focus Test (Green Accent, Stopwatch Watermark)         */}
          {/* ------------------------------------------------------------------- */}
          <div
            onClick={onLaunchFocusTest}
            className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            {/* Subtle Decorative Background Watermark (Section 15) */}
            <svg 
              className="absolute -right-4 -bottom-4 w-44 h-44 text-emerald-500 opacity-[0.07] dark:opacity-[0.04] pointer-events-none select-none" 
              viewBox="0 0 100 100" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              aria-hidden="true"
            >
              <circle cx="50" cy="55" r="36" />
              <path d="M50 19v-6m-8 0h16" />
              <path d="M50 55l14-14" />
              <circle cx="50" cy="55" r="4" fill="currentColor" />
            </svg>

            <div className="relative z-10">
              {/* Header: Icon Container + Status Pill */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shadow-2xs">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Proctor Sim
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-black font-display text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Time Focus Test
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Timed simulation with negative marking and focus integrity tracking.
              </p>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <Shield className="w-3 h-3 text-emerald-500" />
                <span>Strict Countdown</span>
              </span>
              <div className="flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Launch</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* CARD 4: Progress & Mistake (Orange Accent, Chart Watermark)         */}
          {/* ------------------------------------------------------------------- */}
          <div
            onClick={() => onNavigate('progress')}
            className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            {/* Subtle Decorative Background Watermark (Section 15) */}
            <svg 
              className="absolute -right-4 -bottom-4 w-44 h-44 text-amber-500 opacity-[0.07] dark:opacity-[0.04] pointer-events-none select-none" 
              viewBox="0 0 100 100" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              aria-hidden="true"
            >
              <path d="M15 85h70" />
              <rect x="22" y="55" width="12" height="30" rx="2" />
              <rect x="42" y="40" width="12" height="45" rx="2" />
              <rect x="62" y="25" width="12" height="60" rx="2" />
              <path d="M22 45l22-15 20 8 18-20" />
              <path d="M74 18h8v8" />
            </svg>

            <div className="relative z-10">
              {/* Header: Icon Container + Status Pill */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform shadow-2xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 uppercase tracking-wide">
                  <span className="text-amber-500">✦</span>
                  Analytics
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-black font-display text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Progress & Mistake
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Accuracy, speed, consistency metrics, and error notebook drills.
              </p>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <TrendingUp className="w-3 h-3 text-amber-500" />
                <span>Track · Improve · Excel</span>
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
      {/* 3. POWERED BY AI BANNER (Section 18)                                      */}
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
    </div>
  );
};
