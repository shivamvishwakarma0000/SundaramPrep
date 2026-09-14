import React, { useEffect, useState } from 'react';
import { 
  BarChart as BarChartIcon, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
} from 'recharts';
import { 
  CheckCircle2, 
  Clock, 
  Flame, 
  Compass,
  Sparkles,
  Play,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api/client';
import type { StudentAnalytics } from '../../types';
import { CardSkeleton, ChartSkeleton } from '../../components/common/Skeleton';

interface AnalyticsViewProps {
  onOpenAIWithPrompt: (prompt: string) => void;
  onNavigateToPractice?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onOpenAIWithPrompt, onNavigateToPractice }) => {
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshedToast, setRefreshedToast] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs_work' | 'mastered'>('all');

  const loadAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await api.getStudentAnalytics();
      setData(res);
      if (isManualRefresh) {
        setRefreshedToast(true);
        setTimeout(() => setRefreshedToast(false), 2000);
      }
    } catch (e: any) {
      console.error('Failed to load student analytics:', e);
      setError(e?.message || 'Unable to load performance data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics(false);
  }, []);

  const totalQuestions = data?.metrics?.total_questions_solved || 0;
  const hasAttempted = totalQuestions > 0;

  const hasSubjectData = Boolean(
    hasAttempted &&
    data?.subjects && 
    data.subjects.length > 0 &&
    data.subjects.some((s) => s.attempts > 0)
  );

  // Format speed seconds into a clean human readable string
  const formatSpeed = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--';
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    return `${seconds}s`;
  };

  const subjectChartData = (data?.subjects || [])
    .filter((s) => s.attempts > 0)
    .map((s) => ({
      name: s.subject.replace('Indian ', '').replace(' & Governance', '').replace('General ', ''),
      fullName: s.subject,
      accuracy: s.accuracy,
      attempts: s.attempts,
      color: s.accuracy >= 65 ? '#10B981' : (s.accuracy >= 45 ? '#F59E0B' : '#EF4444')
    }));

  const filteredTopics = (data?.topics || []).filter((t) => {
    if (activeFilter === 'needs_work') return t.accuracy < 60;
    if (activeFilter === 'mastered') return t.accuracy >= 60;
    return true;
  });

  // Skeleton loading state
  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <CardSkeleton rows={2} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
          <CardSkeleton rows={2} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-5">
            <CardSkeleton rows={5} />
          </div>
        </div>
      </div>
    );
  }

  // Graceful error state with retry
  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white dark:bg-dark-card border border-rose-200 dark:border-rose-900/50 rounded-3xl p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Unable to load performance data</h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted">
              We couldn't connect to your analytics engine. Please check your connection and try again.
            </p>
          </div>
          <button
            onClick={() => loadAnalytics(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 animate-in fade-in pb-12 transition-colors">
      
      {/* ========================================================================= */}
      {/* 1. TOP HERO / TITLE CARD                                                  */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all">
        {/* Soft background ambient gradient & Diagnostics Watermark */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-50/50 via-sky-50/20 to-transparent dark:from-blue-950/20 dark:via-transparent pointer-events-none" />
        <div className="absolute right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-blue-900 dark:text-blue-100">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40 text-[11px] font-extrabold mb-2 shadow-2xs">
              <span>📈 Real Exam Progress</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight">
              Performance & Diagnostics
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
              Real performance calculated strictly from your completed tests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAnalytics(true)}
              disabled={refreshing}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-dark-surface dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-2xs transition-all cursor-pointer ${
                refreshing ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              title="Refresh Analytics from server"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600 dark:text-sky-400' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : refreshedToast ? '✓ Updated' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 4 EQUAL PERFORMANCE METRIC CARDS                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Accuracy */}
        <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Accuracy
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {hasAttempted ? `${data?.metrics?.accuracy || 0}%` : '0%'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
              {hasAttempted ? `${totalQuestions} questions attempted` : 'No questions solved yet'}
            </div>
          </div>
        </div>

        {/* Metric 2: Speed Pace */}
        <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Speed Pace
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {formatSpeed(data?.metrics?.speed_seconds || 0)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
              {hasAttempted && data?.metrics?.speed_seconds ? 'Avg seconds per question' : 'Awaiting first test'}
            </div>
          </div>
        </div>

        {/* Metric 3: Consistency */}
        <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Consistency
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-900/50 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {hasAttempted && data?.metrics?.consistency_score ? `${data.metrics.consistency_score}%` : '0%'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
              {data?.metrics?.streak_days ? `${data.metrics.streak_days}-day streak` : '0-day streak'}
            </div>
          </div>
        </div>

        {/* Metric 4: Coverage */}
        <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Coverage
            </span>
            <div className="w-7 h-7 rounded-lg bg-yellow-50 dark:bg-yellow-950/60 border border-yellow-200/70 dark:border-yellow-900/50 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {hasAttempted && data?.metrics?.coverage_percentage ? `${data.metrics.coverage_percentage}%` : '0%'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
              {hasAttempted ? 'Modules attempted' : 'Solve tests to increase'}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN ANALYTICS GRID: SUBJECT PERFORMANCE INDEX & TOPIC MASTERY        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ======================================================================= */}
        {/* LEFT COLUMN: Subject Performance Index (7 cols on Desktop)              */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          {/* Subtle Decorative Background Watermark: Analytics Bars */}
          <div className="absolute right-3 bottom-2 w-36 h-36 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-slate-900 dark:text-white">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 19h16v2H4zm1-4h3v3H5zm5-6h3v9h-3zm5-5h3v14h-3z" />
            </svg>
          </div>

          <div className="space-y-4 relative z-10">
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white">
                  Subject Performance Index
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Section-wise accuracy across syllabus subjects.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/40 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Data
              </span>
            </div>

            {/* Content: Chart vs Empty State */}
            {!hasSubjectData ? (
              <div className="py-12 px-4 text-center bg-slate-50/70 dark:bg-dark-surface/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                  <BarChartIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                    No subject performance data yet.
                  </p>
                  <p className="max-w-xs mx-auto text-slate-500 dark:text-slate-400 leading-relaxed">
                    Complete a practice test to see your subject performance.
                  </p>
                </div>
                {onNavigateToPractice && (
                  <button
                    onClick={onNavigateToPractice}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Practice</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fill: '#64748B' }} 
                      stroke="#CBD5E1"
                      interval={0}
                      angle={-10}
                      textAnchor="end"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 11, fill: '#64748B' }} 
                      stroke="#CBD5E1" 
                      unit="%"
                    />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}% accuracy (${item.payload.attempts} attempts)`, 
                        item.payload.fullName
                      ]}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '12px',
                        border: '1px solid #1E293B',
                        fontSize: '12px',
                        color: '#F8FAFC',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {subjectChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart Legend / Guidance Footer */}
          {hasSubjectData && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Mastered (≥65%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Moderate (45-64%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Needs Work (&lt;45%)</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: Topic Mastery (5 cols on Desktop)                         */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          {/* Subtle Decorative Background Watermark: Target / Mastery */}
          <div className="absolute right-3 bottom-2 w-36 h-36 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-slate-900 dark:text-white">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
            </svg>
          </div>

          <div className="space-y-4 relative z-10">
            {/* Card Header & Filter Tabs */}
            <div className="space-y-3">
              <div>
                <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white">
                  Topic Mastery
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed accuracy by syllabus topic.
                </p>
              </div>

              {/* 3 Working Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-surface p-1 rounded-2xl text-[11px] font-bold">
                {[
                  { id: 'all', label: 'All Topics' },
                  { id: 'needs_work', label: 'Needs Work (<60%)' },
                  { id: 'mastered', label: 'Mastered (≥60%)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-center transition-all cursor-pointer ${
                      activeFilter === tab.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Topics List */}
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {!hasAttempted || filteredTopics.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-dark-surface/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  {activeFilter === 'all' 
                    ? 'No topic attempts recorded yet. Start practicing to unlock topic analytics.' 
                    : `No topics currently in "${activeFilter === 'needs_work' ? 'Needs Work' : 'Mastered'}" category.`}
                </div>
              ) : (
                filteredTopics.map((t, idx) => {
                  const isMastered = t.accuracy >= 60;

                  return (
                    <div
                      key={idx}
                      className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 hover:bg-white dark:bg-dark-surface/60 dark:hover:bg-dark-surface flex items-center justify-between gap-3 text-xs shadow-2xs hover:shadow-xs transition-all"
                    >
                      <div className="max-w-[70%] min-w-0">
                        <span className="font-black text-slate-900 dark:text-white block truncate text-xs sm:text-sm">
                          {t.topic}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block truncate mt-0.5">
                          {t.subject} · {t.attempts} attempts
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                          isMastered 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40' 
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40'
                        }`}>
                          {t.accuracy}%
                        </span>

                        {!isMastered && (
                          <button
                            onClick={() =>
                              onOpenAIWithPrompt(
                                `Provide a high-yield summary for "${t.topic}" in ${t.subject}. Give 3 key points and a memory trick.`
                              )
                            }
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 transition-colors cursor-pointer"
                            title="AI Memory Trick & Revision"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick AI Diagnostics CTA Footer */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Need revision plan for weak topics?
            </span>
            <button
              onClick={() => onOpenAIWithPrompt("Analyze my weak topics and give me a 3-day targeted revision schedule.")}
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-400 hover:underline font-bold text-xs cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Ask Sundaram AI</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
