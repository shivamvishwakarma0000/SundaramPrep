import React, { useEffect, useState } from 'react';
import { 
  BarChart as BarChartIcon, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { 
  CheckCircle2, 
  Clock, 
  Flame, 
  Compass,
  Sparkles,
  Play
} from 'lucide-react';
import { api } from '../../api/client';
import type { StudentAnalytics } from '../../types';
import { CardSkeleton, ChartSkeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';

interface AnalyticsViewProps {
  onOpenAIWithPrompt: (prompt: string) => void;
  onNavigateToPractice?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onOpenAIWithPrompt, onNavigateToPractice }) => {
  const [data, setData] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs_work' | 'mastered'>('all');

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStudentAnalytics();
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
  }, []);

  const totalQuestions = data?.metrics?.total_questions_solved || 0;
  const hasAttempted = totalQuestions > 0;

  const hasSubjectData = Boolean(
    hasAttempted &&
    data?.subjects && 
    data.subjects.length > 0 &&
    data.subjects.some((s) => s.attempts > 0)
  );

  const subjectChartData = (data?.subjects || [])
    .filter((s) => s.attempts > 0)
    .map((s) => ({
      name: s.subject.replace('Indian ', '').replace(' & Governance', ''),
      accuracy: s.accuracy,
      color: s.accuracy >= 70 ? '#046A38' : (s.accuracy >= 50 ? '#D4AF37' : '#DC2626')
    }));

  const filteredTopics = (data?.topics || []).filter((t) => {
    if (activeFilter === 'needs_work') return t.accuracy < 60;
    if (activeFilter === 'mastered') return t.accuracy >= 60;
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
      {/* Overview Banner - Clean White Box, Crisp Border */}
      <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900/40 text-xs font-bold mb-1">
            <span>📈 Real Exam Progress</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Performance & Diagnostics
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-dark-muted mt-0.5">
            Real performance calculated strictly from your completed tests.
          </p>
        </div>
      </div>

      {/* 4 CORE DIAGNOSTIC BOXES - NO DUMMY DATA (Clean White Box, Crisp Border, Dark Text) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Accuracy */}
        <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border hover:border-brand-600 dark:hover:border-brand-500 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-dark-muted font-extrabold">
            <span>Accuracy</span>
            <CheckCircle2 className="w-4 h-4 text-flagGreen-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
            {hasAttempted ? `${data?.metrics?.accuracy || 0}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted font-bold">
            {hasAttempted ? `${totalQuestions} questions attempted` : 'No questions solved yet'}
          </div>
        </div>

        {/* Metric 2: Speed */}
        <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border hover:border-brand-600 dark:hover:border-brand-500 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-dark-muted font-extrabold">
            <span>Speed Pace</span>
            <Clock className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
            {hasAttempted && data?.metrics?.speed_seconds ? `${data.metrics.speed_seconds}s` : '--'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted font-bold">
            {hasAttempted && data?.metrics?.speed_seconds ? 'Avg seconds per question' : 'Awaiting first test'}
          </div>
        </div>

        {/* Metric 3: Consistency */}
        <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border hover:border-brand-600 dark:hover:border-brand-500 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-dark-muted font-extrabold">
            <span>Consistency</span>
            <Flame className="w-4 h-4 text-saffron-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
            {hasAttempted && data?.metrics?.consistency_score ? `${data.metrics.consistency_score}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted font-bold">
            {data?.metrics?.streak_days ? `${data.metrics.streak_days}-day streak` : '0-day streak'}
          </div>
        </div>

        {/* Metric 4: Syllabus Coverage */}
        <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border hover:border-brand-600 dark:hover:border-brand-500 rounded-2xl p-4 sm:p-5 shadow-sm space-y-1 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-dark-muted font-extrabold">
            <span>Coverage</span>
            <Compass className="w-4 h-4 text-gold-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
            {hasAttempted && data?.metrics?.coverage_percentage ? `${data.metrics.coverage_percentage}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-dark-muted font-bold">
            {hasAttempted ? 'Modules attempted' : 'Solve tests to increase'}
          </div>
        </div>
      </div>

      {/* Subject Performance & Topic Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance Index: INITIALLY DO NOT SHOW BARS IF NO DATA */}
        <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                Subject Performance Index
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Section-wise accuracy across syllabus subjects.
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-dark-muted font-mono font-bold">Live Data</span>
          </div>

          {!hasSubjectData ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-dark-surface rounded-xl border border-slate-200 dark:border-dark-border text-xs space-y-2.5">
              <BarChartIcon className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-extrabold text-slate-900 dark:text-white text-sm">No Subject Tests Attempted Yet</p>
              <p className="max-w-xs mx-auto text-slate-500 dark:text-dark-muted">
                Subject performance bars will appear here once you solve questions in Practice Arena or upload an exam PDF.
              </p>
              {onNavigateToPractice && (
                <button
                  onClick={onNavigateToPractice}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start First Test</span>
                </button>
              )}
            </div>
          ) : (
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
          )}
        </div>

        {/* Topic-Level Breakdown */}
        <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                  Topic Mastery
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted">
                  Detailed accuracy by syllabus topic.
                </p>
              </div>

              {/* Simple Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-surface p-1 rounded-xl text-[11px] font-bold">
                {[
                  { id: 'all', label: 'All Topics' },
                  { id: 'needs_work', label: 'Needs Work (<60%)' },
                  { id: 'mastered', label: 'Mastered (≥60%)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      activeFilter === tab.id
                        ? 'bg-white dark:bg-dark-card text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-dark-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topics List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {!hasAttempted || filteredTopics.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-dark-muted">
                  No topic attempts recorded yet. Start practicing to unlock topic analytics.
                </div>
              ) : (
                filteredTopics.map((t, idx) => {
                  const isMastered = t.accuracy >= 60;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="max-w-[65%]">
                        <span className="font-extrabold text-slate-900 dark:text-white block truncate">{t.topic}</span>
                        <span className="text-[10px] text-slate-500 dark:text-dark-muted font-semibold">{t.subject} · {t.attempts} attempts</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className={`font-black text-sm ${isMastered ? 'text-flagGreen-600' : 'text-rose-600'}`}>
                            {t.accuracy}%
                          </span>
                        </div>

                        {!isMastered && (
                          <button
                            onClick={() =>
                              onOpenAIWithPrompt(
                                `Provide a high-yield summary for "${t.topic}" in ${t.subject}. Give 3 key points and a memory trick.`
                              )
                            }
                            className="p-1.5 rounded-lg bg-saffron-100 dark:bg-saffron-950/60 hover:bg-saffron-200 text-saffron-800 dark:text-saffron-300 cursor-pointer"
                            title="AI Revision"
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
