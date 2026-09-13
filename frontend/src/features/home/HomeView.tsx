import React, { useEffect, useState, useRef } from 'react';
import { 
  Flame, 
  UploadCloud, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  FileText 
} from 'lucide-react';
import { api } from '../../api/client';
import type { StudentHomeSummary, PortalTab } from '../../types';

interface HomeViewProps {
  onNavigate: (tab: PortalTab) => void;
  onLaunchQuick10: () => void;
  onLaunchFocusTest: () => void;
  onOpenAIWithPrompt: (prompt: string) => void;
  onOpenUploadModal: () => void;
}

const DEFAULT_SUMMARY: StudentHomeSummary = {
  greeting: "Welcome, Aspirant",
  target_exam: "UPSC_CSE",
  streak: 7,
  daily_goal: {
    id: "default-goal",
    target_questions: 30,
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
    if (cached) return JSON.parse(cached);
  } catch {}
  return DEFAULT_SUMMARY;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onLaunchQuick10,
  onLaunchFocusTest,
  onOpenUploadModal,
}) => {
  const [summary, setSummary] = useState<StudentHomeSummary>(getInitialSummary);

  // Thin Upload Bar State & Timing Metrics
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

  // Handle file selection for thin upload strip
  const handleThinFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    const startTime = Date.now();

    // Visual timer counter
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
    <div className="space-y-5 max-w-5xl mx-auto transition-colors">
      {/* 1. Header Banner with Streak & Daily Target (Clean White Card, Crisp Border) */}
      <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/favicon.png"
            alt="Sundaram Prep Logo"
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-brand-600/20 bg-white dark:bg-dark-surface shrink-0"
          />
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
              SUNDARAM PREP
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-dark-muted">
              Practice. Focus. Improve.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak Box */}
          <div className="flex items-center gap-2 bg-saffron-50 dark:bg-saffron-950/40 border border-saffron-200 dark:border-saffron-900/50 text-saffron-900 dark:text-saffron-300 px-3 py-2 rounded-xl text-xs font-extrabold">
            <Flame className="w-5 h-5 text-saffron-500 fill-saffron-500 shrink-0" />
            <div>
              <div className="text-base leading-none font-black">{summary.streak} Days</div>
              <div className="text-[10px] text-saffron-700 dark:text-saffron-400 font-semibold mt-0.5">Active Streak</div>
            </div>
          </div>

          {/* Daily Solved Box */}
          <div className="bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-900 dark:text-white px-3.5 py-2 rounded-xl text-xs font-bold min-w-[130px]">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-500 dark:text-dark-muted font-semibold">Today's Target</span>
              <span className="font-extrabold text-brand-600 dark:text-brand-400">{summary.daily_goal.solved_today}/{summary.daily_goal.target_questions} Qs</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${summary.daily_goal.progress_percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. THIN PDF UPLOAD SECTION (NO FLOATING BUTTON - SLIM & FAST) */}
      <div className="bg-white dark:bg-dark-card border-2 border-dashed border-slate-300 dark:border-dark-border hover:border-brand-600 dark:hover:border-brand-500 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all">
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.txt"
          onChange={handleThinFileUpload}
          disabled={uploading}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-saffron-50 dark:bg-saffron-950/40 border border-saffron-200 dark:border-saffron-800 flex items-center justify-center text-saffron-600 dark:text-saffron-400 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  Quick PDF Upload
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Instant MCQs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted truncate">
                Upload any question paper PDF to auto-extract MCQs with timer & speed graph.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{uploading ? `Extracting (${uploadDuration || 0}s)...` : 'Select Exam PDF'}</span>
            </button>
            <button
              onClick={onOpenUploadModal}
              className="px-3 py-2 bg-slate-100 dark:bg-dark-surface hover:bg-slate-200 text-slate-700 dark:text-dark-text text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Full Upload Studio
            </button>
          </div>
        </div>

        {/* Upload Status / Timing Graph Result */}
        {uploadStats && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Processed <strong className="text-slate-900 dark:text-white">{uploadStats.fileName}</strong>: {uploadStats.questionCount} MCQs extracted in {uploadStats.timeTaken} at {uploadStats.timestamp}
              </span>
            </div>
            <button
              onClick={() => onNavigate('upload')}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Solve Extracted MCQs</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {uploadError && (
          <div className="mt-2 pt-2 border-t border-rose-100 text-xs text-rose-600 font-bold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* 3. CORE 4 BOXES IN 2 ROWS & 2 COLUMNS (Calibrated for 11–11.5 inch Tablet & Desktop) */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
        {/* BOX 1: 🚀 START PRACTICE ARENA */}
        <div
          onClick={() => onNavigate('practice')}
          className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border hover:border-brand-600 dark:hover:border-brand-500 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between group transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform text-lg sm:text-xl">
                🚀
              </div>
              <span className="text-[10px] sm:text-[11px] font-black text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-brand-200 dark:border-brand-800 uppercase tracking-wide">
                Live Answers
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-black font-display text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
              Start Practice Arena
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-dark-muted mt-1 leading-snug">
              Instant MCQs with instant feedback & key exam takeaways.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-dark-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLaunchQuick10();
              }}
              className="text-[11px] font-extrabold px-2 py-1 rounded-lg bg-slate-100 dark:bg-dark-surface hover:bg-slate-200 text-slate-900 dark:text-white transition-colors cursor-pointer"
            >
              Quick 10
            </button>
            <div className="flex items-center gap-1 text-xs font-black text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
              <span>Start</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* BOX 2: 📄 UPLOAD PDF & SOLVE */}
        <div
          onClick={onOpenUploadModal}
          className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border hover:border-saffron-500 dark:hover:border-saffron-400 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between group transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-saffron-50 dark:bg-saffron-950/60 border border-saffron-200 dark:border-saffron-800 flex items-center justify-center text-saffron-600 dark:text-saffron-400 group-hover:scale-105 transition-transform text-lg sm:text-xl">
                📄
              </div>
              <span className="text-[10px] sm:text-[11px] font-black text-saffron-700 dark:text-saffron-300 bg-saffron-50 dark:bg-saffron-950/60 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-saffron-200 dark:border-saffron-800 uppercase tracking-wide">
                Auto-Extract
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-black font-display text-slate-900 dark:text-white group-hover:text-saffron-600 transition-colors">
              Upload PDF
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-dark-muted mt-1 leading-snug">
              Convert test paper PDFs into interactive MCQs with speed metrics.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-dark-border">
            <span className="text-[11px] font-bold text-slate-600 dark:text-dark-muted">
              Fast · Bilingual
            </span>
            <div className="flex items-center gap-1 text-xs font-black text-saffron-600 dark:text-saffron-400 group-hover:translate-x-1 transition-transform">
              <span>Upload</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* BOX 3: ⏱️ TIME FOCUS TEST */}
        <div
          onClick={onLaunchFocusTest}
          className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border hover:border-flagGreen-600 dark:hover:border-flagGreen-500 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between group transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-flagGreen-50 dark:bg-flagGreen-950/60 border border-flagGreen-200 dark:border-flagGreen-800 flex items-center justify-center text-flagGreen-600 dark:text-flagGreen-400 group-hover:scale-105 transition-transform text-lg sm:text-xl">
                ⏱️
              </div>
              <span className="text-[10px] sm:text-[11px] font-black text-flagGreen-700 dark:text-flagGreen-300 bg-flagGreen-50 dark:bg-flagGreen-950/60 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-flagGreen-200 dark:border-flagGreen-800 uppercase tracking-wide">
                Proctor Sim
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-black font-display text-slate-900 dark:text-white group-hover:text-flagGreen-600 transition-colors">
              Time Focus Test
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-dark-muted mt-1 leading-snug">
              Timed simulation with negative marking and focus integrity tracking.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-dark-border">
            <span className="text-[11px] font-bold text-slate-600 dark:text-dark-muted">
              Strict Countdown
            </span>
            <div className="flex items-center gap-1 text-xs font-black text-flagGreen-600 dark:text-flagGreen-400 group-hover:translate-x-1 transition-transform">
              <span>Launch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* BOX 4: 📈 PROGRESS & MISTAKE */}
        <div
          onClick={() => onNavigate('progress')}
          className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border hover:border-gold-500 dark:hover:border-gold-400 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between group transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gold-50 dark:bg-gold-950/60 border border-gold-200 dark:border-gold-800 flex items-center justify-center text-gold-600 dark:text-gold-400 group-hover:scale-105 transition-transform text-lg sm:text-xl">
                📈
              </div>
              <span className="text-[10px] sm:text-[11px] font-black text-gold-700 dark:text-gold-300 bg-gold-50 dark:bg-gold-950/60 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-gold-200 dark:border-gold-800 uppercase tracking-wide">
                Analytics
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-black font-display text-slate-900 dark:text-white group-hover:text-gold-600 transition-colors">
              Progress & Mistake
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-dark-muted mt-1 leading-snug">
              Accuracy, speed, consistency metrics, and error notebook drills.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-dark-border">
            <span className="text-[11px] font-bold text-slate-600 dark:text-dark-muted">
              Live Diagnostics
            </span>
            <div className="flex items-center gap-1 text-xs font-black text-gold-600 dark:text-gold-400 group-hover:translate-x-1 transition-transform">
              <span>Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
