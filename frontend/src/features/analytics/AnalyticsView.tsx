import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Flame, 
  SlidersHorizontal,
  Compass,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import type { StudentAnalytics } from '../../types';
import { CardSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';

interface AnalyticsViewProps {
  onOpenAIWithPrompt: (prompt: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onOpenAIWithPrompt }) => {
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weakThreshold, setWeakThreshold] = useState<number>(50);
  const [strongThreshold, setStrongThreshold] = useState<number>(70);
  const [activeTab, setActiveTab] = useState<'all' | 'weak' | 'improving' | 'strong'>('all');

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStudentAnalytics(weakThreshold, strongThreshold);
      setData(res);
    } catch (e: any) {
      console.error('Failed to load student analytics:', e);
      setError(e?.message || 'Could not load your performance analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [weakThreshold, strongThreshold]);

  const subjectChartData = (data?.subjects || [
    { subject: 'Polity', accuracy: 82.5 },
    { subject: 'History', accuracy: 68.0 },
    { subject: 'Economy', accuracy: 64.2 },
    { subject: 'Geography', accuracy: 48.5 },
    { subject: 'Science', accuracy: 72.0 },
    { subject: 'Current Affairs', accuracy: 76.5 },
  ]).map((s) => ({
    name: s.subject.replace('Indian ', '').replace(' & Governance', ''),
    accuracy: s.accuracy,
    color: s.accuracy >= strongThreshold ? '#16A34A' : (s.accuracy >= weakThreshold ? '#F59E0B' : '#DC2626')
  }));

  const filteredTopics = (data?.topics || []).filter((t) => {
    if (activeTab === 'weak') return t.accuracy < weakThreshold;
    if (activeTab === 'improving') return t.accuracy >= weakThreshold && t.accuracy < strongThreshold;
    if (activeTab === 'strong') return t.accuracy >= strongThreshold;
    return true;
  });

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <CardSkeleton rows={2} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <CardSkeleton rows={4} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-12">
        <ErrorState
          title="Unable to load analytics"
          message={error}
          onRetry={loadAnalytics}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in pb-12 transition-colors">
      {/* Overview Banner */}
      <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-5 sm:p-6 shadow-subtle dark:shadow-dark-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 border border-brand-100 dark:border-brand-900/40 text-xs font-bold mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Core Learning Loop: Step 6 & 7 (Analytics & Mastery)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-dark-text tracking-tight">
            Cognitive Analytics & Readiness
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-dark-muted mt-0.5">
            4-dimensional diagnostic tracking: Accuracy, Speed, Consistency, and Syllabus Coverage.
          </p>
        </div>

        {/* Configurable Threshold Controls */}
        <div className="bg-slate-50 dark:bg-dark-card border border-cool-200 dark:border-dark-border p-3 rounded-xl flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-dark-text font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-dark-muted" />
            <span>Thresholds:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold">Weak &lt; {weakThreshold}%</span>
            <input
              type="range"
              min="30"
              max="60"
              value={weakThreshold}
              onChange={(e) => setWeakThreshold(Number(e.target.value))}
              className="w-16 h-1.5 bg-rose-200 dark:bg-rose-900/60 rounded-lg accent-rose-600 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">Strong &gt; {strongThreshold}%</span>
            <input
              type="range"
              min="65"
              max="85"
              value={strongThreshold}
              onChange={(e) => setStrongThreshold(Number(e.target.value))}
              className="w-16 h-1.5 bg-emerald-200 dark:bg-emerald-900/60 rounded-lg accent-emerald-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 4 Core Diagnostic Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Accuracy */}
        <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border p-4 sm:p-5 rounded-2xl shadow-subtle dark:shadow-dark-card space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-dark-muted font-bold">
            <span>Accuracy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-dark-text font-display">
            {data?.metrics.accuracy ?? 74.5}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
            Across {data?.metrics.total_questions_solved ?? 142} solved questions
          </div>
        </div>

        {/* Metric 2: Speed */}
        <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border p-4 sm:p-5 rounded-2xl shadow-subtle dark:shadow-dark-card space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-dark-muted font-bold">
            <span>Speed Pace</span>
            <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-dark-text font-display">
            {data?.metrics.speed_seconds ?? 42}s <span className="text-xs font-normal text-slate-400 dark:text-dark-muted">/ Q</span>
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
            Optimal pace for Prelims Paper I
          </div>
        </div>

        {/* Metric 3: Consistency */}
        <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border p-4 sm:p-5 rounded-2xl shadow-subtle dark:shadow-dark-card space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-dark-muted font-bold">
            <span>Consistency</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-dark-text font-display">
            {data?.metrics.consistency_score ?? 85.7}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
            {data?.metrics.streak_days ?? 7}-day active streak
          </div>
        </div>

        {/* Metric 4: Coverage */}
        <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border p-4 sm:p-5 rounded-2xl shadow-subtle dark:shadow-dark-card space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-dark-muted font-bold">
            <span>Syllabus Coverage</span>
            <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-dark-text font-display">
            {data?.metrics.coverage_percentage ?? 62.5}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
            Core GS modules attempted
          </div>
        </div>
      </div>

      {/* Subject Performance & Topic Mastery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance Bar Chart */}
        <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-5 shadow-subtle dark:shadow-dark-card space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 dark:text-dark-text">
                Subject Performance Index (%)
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Accuracy computed across official examination curriculum.
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-dark-muted font-mono">Real-time Neon Aggregation</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Accuracy']}
                  contentStyle={{
                    backgroundColor: 'var(--surface-app)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-app)',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                  }}
                />
                <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                  {subjectChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic-Level Analytics with Threshold Filters */}
        <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-5 shadow-subtle dark:shadow-dark-card space-y-4 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900 dark:text-dark-text">
                  Topic-Level Mastery
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted">
                  Algorithmic classification based on your configured thresholds.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-card p-1 rounded-xl text-[11px] font-bold">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'weak', label: 'Weak' },
                  { id: 'improving', label: 'Improving' },
                  { id: 'strong', label: 'Strong' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-dark-surface text-slate-900 dark:text-dark-text shadow-2xs font-extrabold'
                        : 'text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-dark-text'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topics List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-dark-muted">Loading topic analytics...</div>
              ) : filteredTopics.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-dark-muted">No topics match this threshold.</div>
              ) : (
                filteredTopics.map((t, idx) => {
                  const isWeak = t.accuracy < weakThreshold;
                  const isStrong = t.accuracy >= strongThreshold;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-cool-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="max-w-[65%]">
                        <span className="font-bold text-slate-900 dark:text-dark-text block truncate">{t.topic}</span>
                        <span className="text-[10px] text-slate-500 dark:text-dark-muted font-medium">{t.subject} · {t.attempts} attempts</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className={`font-black text-sm ${isStrong ? 'text-emerald-600 dark:text-emerald-400' : (isWeak ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')}`}>
                            {t.accuracy}%
                          </span>
                          <span className={`block text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            isStrong ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40' : (isWeak ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40')
                          }`}>
                            {isStrong ? 'Strong' : (isWeak ? 'Weak' : 'Improving')}
                          </span>
                        </div>

                        {isWeak && (
                          <button
                            onClick={() =>
                              onOpenAIWithPrompt(
                                `I have low accuracy (${t.accuracy}%) on "${t.topic}" in ${t.subject}. Provide a 2-minute high-yield breakdown: 1) Core rules, 2) Examiner traps, 3) High retention memory trick.`
                              )
                            }
                            className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 hover:bg-violet-200 dark:hover:bg-violet-900 text-violet-800 dark:text-violet-300 cursor-pointer"
                            title="1-Click AI Revision"
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
        </div>
      </div>
    </div>
  );
};

