import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Target, 
  RotateCcw, 
  Bookmark as BookmarkIcon, 
  ArrowRight, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  Trash2,
  Lightbulb,
  FileCheck2,
  Brain,
  Search,
  CheckSquare,
  Square,
  UploadCloud
} from 'lucide-react';
import { api } from '../../api/client';
import type { MistakeItem, BookmarkItem, ExamType, Question, PracticeMode } from '../../types';
import { CardSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

interface PracticeHubProps {
  currentExam: ExamType;
  onStartMode: (mode: PracticeMode, subject?: string, topic?: string) => void;
  onStartPDFMockTest?: (documentIds: string[], title: string) => void;
  onNavigateToUpload?: () => void;
  onOpenAIWithQuestion: (question: Question, actionType: 'HINGLISH' | 'WHY_WRONG' | 'MEMORY_TRICK') => void;
}

type PracticeSubView = 'hub' | 'mistakes' | 'bookmarks';

export const PracticeHub: React.FC<PracticeHubProps> = ({
  currentExam,
  onStartMode,
  onStartPDFMockTest,
  onNavigateToUpload,
  onOpenAIWithQuestion,
}) => {
  const [subView, setSubView] = useState<PracticeSubView>('hub');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTopic, setSearchTopic] = useState<string>('');
  const [isMistakesBookmarksOpen, setIsMistakesBookmarksOpen] = useState<boolean>(false);
  const [isModulesOpen, setIsModulesOpen] = useState<boolean>(false);

  // PDF Mock Test States
  const [uploadedPDFs, setUploadedPDFs] = useState<any[]>([]);
  const [selectedPDFIds, setSelectedPDFIds] = useState<string[]>([]);
  const [loadingPDFs, setLoadingPDFs] = useState<boolean>(false);



  useEffect(() => {
    async function loadHubData() {
      try {
        const hubRes = await api.getPracticeHub(currentExam);
        setSubjects(hubRes.subjects || []);
      } catch (e) {
        console.error('Failed to load practice hub:', e);
      }
    }
    loadHubData();
  }, [currentExam]);

  // Load uploaded PDF documents for custom mock tests
  useEffect(() => {
    async function loadPDFs() {
      setLoadingPDFs(true);
      try {
        const res = await api.listPDFDocuments(1, 50);
        if (res && res.documents) {
          setUploadedPDFs(res.documents);
          // By default, auto-select all uploaded PDFs
          if (res.documents.length > 0) {
            setSelectedPDFIds(res.documents.map((d: any) => d.id));
          }
        }
      } catch (e) {
        console.warn('Failed to load PDF documents for mock test:', e);
      } finally {
        setLoadingPDFs(false);
      }
    }
    loadPDFs();
  }, []);

  const toggleSelectAllPDFs = () => {
    if (selectedPDFIds.length === uploadedPDFs.length) {
      setSelectedPDFIds([]);
    } else {
      setSelectedPDFIds(uploadedPDFs.map((d) => d.id));
    }
  };

  const togglePDFSelection = (id: string) => {
    setSelectedPDFIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStartPDFMockTest = () => {
    if (selectedPDFIds.length === 0) return;
    const isAll = selectedPDFIds.length === uploadedPDFs.length && uploadedPDFs.length > 0;
    const title = isAll 
      ? "All Uploaded Papers (10-Q Mock)" 
      : (selectedPDFIds.length === 1 
          ? (uploadedPDFs.find(p => p.id === selectedPDFIds[0])?.file_name || "Uploaded PDF Mock") 
          : `${selectedPDFIds.length} Selected Papers (10-Q Mock)`);

    if (onStartPDFMockTest) {
      onStartPDFMockTest(selectedPDFIds, title);
    } else {
      onStartMode('MOCK_TEST', undefined, title);
    }
  };

  const totalQuestionsInSelection = uploadedPDFs
    .filter((d) => selectedPDFIds.includes(d.id))
    .reduce((sum, d) => sum + (d.extracted_questions_count || d.ready_count || 0), 0);

  const loadMistakes = async () => {
    setSubView('mistakes');
    setLoading(true);
    try {
      const res = await api.getMistakes(1, 20);
      setMistakes(res.mistakes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    setSubView('bookmarks');
    setLoading(true);
    try {
      const res = await api.getBookmarks(1, 20);
      setBookmarks(res.bookmarks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (questionId: string) => {
    try {
      await api.toggleBookmark(questionId);
      setBookmarks((prev) => prev.filter((b) => b.question.id !== questionId));
    } catch (e) {
      console.error(e);
    }
  };

  // Section 11: Single-Feature UI - Mistakes Notebook
  if (subView === 'mistakes') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-2 border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubView('hub')}
                className="text-xs font-black text-brand-600 hover:underline cursor-pointer"
              >
                ← Back to Practice
              </button>
              <span className="text-slate-300">•</span>
              <h2 className="text-base sm:text-lg font-black font-display text-slate-900">
                Mistake Engine Notebook
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartMode('MISTAKE_PRACTICE')}
              disabled={mistakes.length === 0}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice My Mistakes</span>
            </button>
            <span className="text-xs font-black bg-rose-50 text-rose-700 px-2.5 py-1.5 rounded-xl border border-rose-200">
              {mistakes.length} Active
            </span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={2} />
          </div>
        ) : mistakes.length === 0 ? (
          <EmptyState
            emoji="🎉"
            title="No mistakes yet 🎉"
            description="Keep practicing. Your mistakes will appear here automatically."
            actionLabel="Start Practice"
            onAction={() => onStartMode('PRACTICE')}
          />
        ) : (
          <div className="space-y-3">
            {mistakes.map((m, idx) => (
              <div
                key={m.mistake_id || idx}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-900">{m.question.subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{m.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      Failed {m.repeated_count}x
                    </span>
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed whitespace-pre-line">
                  {m.question.question_text}
                </div>

                {/* Correct Answer & Explanation */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-black text-emerald-700">
                    Correct Option: {m.question.correct_answer}
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {m.question.explanation?.why}
                  </p>
                </div>

                {/* AI Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {m.question.source_reference || 'Official Reference'}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onOpenAIWithQuestion(m.question, 'WHY_WRONG')}
                      className="text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer"
                    >
                      Why is this trap?
                    </button>
                    <button
                      onClick={() => onOpenAIWithQuestion(m.question, 'MEMORY_TRICK')}
                      className="text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-200 cursor-pointer"
                    >
                      Memory Trick
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Section 11: Single-Feature UI - Bookmarked Questions
  if (subView === 'bookmarks') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in transition-colors">
        <div className="flex items-center justify-between bg-white border-2 border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubView('hub')}
                className="text-xs font-black text-brand-600 hover:underline cursor-pointer"
              >
                ← Back to Practice
              </button>
              <span className="text-slate-300">•</span>
              <h2 className="text-base sm:text-lg font-black font-display text-slate-900">
                Bookmarked Questions
              </h2>
            </div>
          </div>
          <span className="text-xs font-black bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
            {bookmarks.length} Saved
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={2} />
          </div>
        ) : bookmarks.length === 0 ? (
          <EmptyState
            emoji="🔖"
            title="No Bookmarks Saved Yet"
            description="Tap the bookmark icon while solving questions to collect high-yield items here."
            actionLabel="Start Practice"
            onAction={() => onStartMode('PRACTICE')}
          />
        ) : (
          <div className="space-y-3">
            {bookmarks.map((b) => (
              <div
                key={b.bookmark_id}
                className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-900">{b.question.subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{b.question.topic}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveBookmark(b.question.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed whitespace-pre-line">
                  {b.question.question_text}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-black text-slate-900">
                    Correct Option: {b.question.correct_answer}
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {b.question.explanation?.why}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Primary Practice Hub View - Pure White Boxes, No Shadows, No Verbose Text
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in pb-12 transition-colors">
      {/* 1. INSTANT 10-QUESTION TOPIC SEARCH MOCK GENERATOR (Rounded-3xl SaaS card) */}
      <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-3.5 relative overflow-hidden transition-colors">
        {/* Subtle Watermark: Globe / Topic Search */}
        <div className="absolute right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-brand-900 dark:text-brand-100">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 dark:text-sky-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/60 px-2.5 py-0.5 rounded-full">
              TOPIC-WISE 10-QUESTION MOCK TEST
            </span>
            <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white mt-1.5 tracking-tight">
              Search Any Topic & Start Instant 10-Question Test
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-dark-muted mt-0.5">
              Type any syllabus topic to practice 10 questions. After completion, take 10 more or search another topic.
            </p>
          </div>


        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchTopic.trim()) {
              onStartMode('MOCK_TEST', undefined, searchTopic.trim());
            }
          }}
          className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              placeholder="Search topic (e.g. Dandi March, Fundamental Rights, Monetary Policy, 1857 Revolt)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white dark:focus:bg-dark-card transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!searchTopic.trim()}
            className="px-5 py-2.5 bg-[#0B2545] hover:bg-[#133A6B] disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Start 10-Q Mock Test</span>
          </button>
        </form>

        {/* Quick Topic Chips */}
        <div className="relative z-10 flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-bold text-slate-400">Popular:</span>
          {['Dandi March', 'Fundamental Rights', 'Monetary Policy', 'Revolt of 1857', 'National Parks', 'Judiciary'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSearchTopic(t);
                onStartMode('MOCK_TEST', undefined, t);
              }}
              className="text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-brand-700 dark:hover:text-brand-300 bg-slate-100 dark:bg-dark-surface hover:bg-brand-50 dark:hover:bg-slate-800 hover:border-brand-300 border border-slate-200 dark:border-dark-border px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 2. INSTANT 10-QUESTION MOCK TEST FROM YOUR UPLOADED PDF PAPERS */}
      <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 relative overflow-hidden transition-all">
        {/* Subtle Watermark: PDF Paper */}
        <div className="absolute right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-[0.035] dark:opacity-[0.025] select-none text-emerald-900 dark:text-emerald-100">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FileCheck2 className="w-3 h-3" />
                <span>PDF QUESTION BANK MOCK TEST</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-dark-muted">
                {uploadedPDFs.length} Papers in Database
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 dark:text-white mt-1.5 tracking-tight">
              Take Mock Test from Your Uploaded PDFs
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-dark-muted mt-0.5">
              Select any single PDF, multiple PDFs, or all uploaded papers. The AI will generate a randomized 10-question mock test exclusively from your selected documents.
            </p>
          </div>

          {uploadedPDFs.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSelectAllPDFs}
                className="px-3.5 py-2 bg-slate-100 dark:bg-dark-surface hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-dark-text text-xs font-black rounded-xl border border-slate-200 dark:border-dark-border transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {selectedPDFIds.length === uploadedPDFs.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Select All PDFs ({uploadedPDFs.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* PDF Documents Selector Grid */}
        {loadingPDFs ? (
          <div className="p-6 text-center text-xs font-bold text-slate-400">
            Loading your uploaded question papers...
          </div>
        ) : uploadedPDFs.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-dark-border text-center space-y-2 bg-slate-50/50 dark:bg-dark-surface/40">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-dark-text">
              No Question Papers Uploaded Yet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-dark-muted max-w-md mx-auto">
              Upload any previous year question paper or coaching test in PDF Studio to take customized mock tests from your papers.
            </p>
            {onNavigateToUpload && (
              <button
                type="button"
                onClick={onNavigateToUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B2545] hover:bg-[#133A6B] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer mt-2"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Go to PDF Studio</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {uploadedPDFs.map((doc) => {
                const isSelected = selectedPDFIds.includes(doc.id);
                const qCount = doc.extracted_questions_count || doc.ready_count || 0;
                return (
                  <div
                    key={doc.id}
                    onClick={() => togglePDFSelection(doc.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                      isSelected
                        ? 'border-brand-600 dark:border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-950 dark:text-brand-100 shadow-xs ring-1 ring-brand-500/20'
                        : 'border-slate-200/80 dark:border-dark-border hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-dark-surface/60 text-slate-800 dark:text-dark-text'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="shrink-0 text-brand-600 dark:text-brand-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-brand-600/10" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold truncate" title={doc.file_name}>
                          {doc.file_name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-dark-muted flex items-center gap-1.5 mt-0.5">
                          <span>{doc.subject || 'General Studies'}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected 
                        ? 'bg-brand-200/80 dark:bg-brand-900/60 text-brand-900 dark:text-brand-200' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-dark-muted'
                    }`}>
                      {qCount} Qs
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Selection Summary & Start Mock Test Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-dark-border">
              <div className="text-xs text-slate-600 dark:text-dark-muted flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {selectedPDFIds.length} PDF{selectedPDFIds.length === 1 ? '' : 's'} Selected
                </span>
                <span>·</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {totalQuestionsInSelection} Questions Pool Available
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartPDFMockTest}
                disabled={selectedPDFIds.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Start 10-Q Mock Test from Selected PDF{selectedPDFIds.length === 1 ? '' : 's'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Banner (Practice Hub Header) */}
      <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-sky-400">
            PRACTICE HUB
          </span>
          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white mt-1 tracking-tight">
            Curriculum Practice Modes
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onStartMode('QUICK_10')}
            className="flex items-center gap-1.5 bg-[#0B2545] hover:bg-[#133A6B] text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Quick 10 Blitz</span>
          </button>
          <button
            onClick={() => onStartMode('FOCUS_TEST')}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer border border-slate-700"
          >
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Focus Test</span>
          </button>
        </div>
      </div>

      {/* 6 Distinct Practice Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Mode 1: LEARN MODE */}
        <div
          onClick={() => onStartMode('LEARN')}
          className="bg-gradient-to-br from-amber-500/[0.14] via-amber-500/[0.04] to-white dark:from-amber-950/45 dark:via-dark-card dark:to-slate-900 border-2 border-amber-200/90 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-500 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Expanded Rich Watermark: Lightbulb */}
          <div className="absolute -right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-20 dark:opacity-25 select-none text-amber-500 dark:text-amber-400 transition-transform group-hover:scale-110 duration-300">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C7.03 2 3 6.03 3 11c0 2.76 1.25 5.23 3.22 6.88.54.45.88 1.11.88 1.82V20c0 .55.45 1 1 1h7.8c.55 0 1-.45 1-1v-.3c0-.71.34-1.37.88-1.82C19.75 16.23 21 13.76 21 11c0-4.97-4.03-9-9-9z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100/80 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                Instant Feedback
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              Learn Mode
            </h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed font-medium">
              Immediate answer breakdown, conceptual insights and high-yield key takeaways.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-amber-200/60 dark:border-dark-border flex items-center justify-between text-xs font-black text-amber-700 dark:text-amber-400">
            <span>Start Learn Mode</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 2: STANDARD PRACTICE */}
        <div
          onClick={() => onStartMode('PRACTICE')}
          className="bg-gradient-to-br from-blue-500/[0.14] via-blue-500/[0.04] to-white dark:from-blue-950/45 dark:via-dark-card dark:to-slate-900 border-2 border-blue-200/90 dark:border-blue-800/60 hover:border-brand-500 dark:hover:border-sky-400 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Expanded Rich Watermark: Book */}
          <div className="absolute -right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-20 dark:opacity-25 select-none text-brand-600 dark:text-sky-400 transition-transform group-hover:scale-110 duration-300">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100/80 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800/80 text-brand-700 dark:text-sky-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-800 dark:text-sky-300 bg-blue-100/90 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                Nav & Skips
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-sky-400 transition-colors">
              Standard Practice
            </h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed font-medium">
              Full navigation, review marking, question skipping and comprehensive test summary.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-blue-200/60 dark:border-dark-border flex items-center justify-between text-xs font-black text-brand-700 dark:text-sky-400">
            <span>Start Practice</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 3: FOCUS MODE */}
        <div
          onClick={() => onStartMode('FOCUS_TEST')}
          className="bg-gradient-to-br from-emerald-500/[0.14] via-emerald-500/[0.04] to-white dark:from-emerald-950/45 dark:via-dark-card dark:to-slate-900 border-2 border-emerald-200/90 dark:border-emerald-800/60 hover:border-emerald-500 dark:hover:border-emerald-400 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Expanded Rich Watermark: Target / Timer */}
          <div className="absolute -right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-20 dark:opacity-25 select-none text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110 duration-300">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                Proctor Sim
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Focus Mode
            </h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed font-medium">
              Real exam pressure simulation with strict timing, negative marking, and proctoring.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-emerald-200/60 dark:border-dark-border flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-400">
            <span>Enter Focus Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 4: QUICK 10 BLITZ */}
        <div
          onClick={() => onStartMode('QUICK_10')}
          className="bg-gradient-to-br from-orange-500/[0.14] via-amber-500/[0.04] to-white dark:from-orange-950/45 dark:via-dark-card dark:to-slate-900 border-2 border-orange-200/90 dark:border-orange-800/60 hover:border-orange-400 dark:hover:border-orange-400 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Expanded Rich Watermark: Zap */}
          <div className="absolute -right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-20 dark:opacity-25 select-none text-orange-500 dark:text-orange-400 transition-transform group-hover:scale-110 duration-300">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100/80 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-800/80 text-orange-800 dark:text-orange-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 dark:text-orange-300 bg-orange-100/90 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-800/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                10 Rapid Qs
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              Quick 10 Blitz
            </h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed font-medium">
              Fast-paced rapid fire session designed for daily consistency and retention drills.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-orange-200/60 dark:border-dark-border flex items-center justify-between text-xs font-black text-orange-700 dark:text-orange-400">
            <span>Launch Quick 10</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 5: MOCK TEST (10 Real Randomized Questions) */}
        <div
          onClick={() => onStartMode('MOCK_TEST')}
          className="bg-gradient-to-br from-teal-500/[0.14] via-emerald-500/[0.04] to-white dark:from-teal-950/45 dark:via-dark-card dark:to-slate-900 border-2 border-teal-200/90 dark:border-teal-800/60 hover:border-teal-500 dark:hover:border-teal-400 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Expanded Rich Watermark: Document */}
          <div className="absolute -right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-20 dark:opacity-25 select-none text-teal-600 dark:text-teal-400 transition-transform group-hover:scale-110 duration-300">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100/80 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-100/90 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-800/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                10 Qs Random
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Mock Test
            </h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed font-medium">
              Randomized multi-subject paper testing overall syllabus readiness and speed.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-teal-200/60 dark:border-dark-border flex items-center justify-between text-xs font-black text-teal-700 dark:text-teal-400">
            <span>Start Mock Test</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Mode 6: SMART REVISION */}
        <div
          onClick={() => onStartMode('SMART_REVISION')}
          className="bg-gradient-to-br from-purple-500/[0.14] via-violet-500/[0.04] to-white dark:from-purple-950/45 dark:via-dark-card dark:to-slate-900 border-2 border-purple-200/90 dark:border-purple-800/60 hover:border-purple-500 dark:hover:border-purple-400 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
        >
          {/* Expanded Rich Watermark: Brain */}
          <div className="absolute -right-4 -bottom-6 w-36 h-36 pointer-events-none opacity-20 dark:opacity-25 select-none text-purple-600 dark:text-purple-400 transition-transform group-hover:scale-110 duration-300">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.28 19.57 10.59 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100/80 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-800/80 text-purple-800 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-800/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                Cognitive Set
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
              Smart Revision
            </h3>
            <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 leading-relaxed font-medium">
              Targeted spaced repetition covering weak areas, bookmark tags, and tricky traps.
            </p>
          </div>
          <div className="relative z-10 mt-5 pt-3 border-t border-purple-200/60 dark:border-dark-border flex items-center justify-between text-xs font-black text-purple-700 dark:text-purple-400">
            <span>Launch Revision Set</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE SECTION 1: Mistakes Notebook & Saved Bookmarks (Hidden by default, expands on click) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setIsMistakesBookmarksOpen(prev => !prev)}
          className="w-full flex items-center justify-between cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-black shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black font-display text-slate-900">
                Mistake Engine & Saved Bookmarks
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Practice failed questions and review bookmarked high-yield problems
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
              {isMistakesBookmarksOpen ? 'Hide' : 'Click to Open'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isMistakesBookmarksOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isMistakesBookmarksOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-slate-100 animate-in fade-in duration-200">
            {/* Mistakes Notebook Launcher */}
            <div
              onClick={loadMistakes}
              className="bg-slate-50 border-2 border-slate-200 hover:border-rose-500 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-rose-700 bg-white border border-rose-200 px-2.5 py-0.5 rounded-full">
                    Mistake Engine
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                  Mistakes Notebook
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-black text-rose-700">
                <span>Open Mistakes</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Saved Bookmarks Launcher */}
            <div
              onClick={loadBookmarks}
              className="bg-slate-50 border-2 border-slate-200 hover:border-amber-500 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookmarkIcon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-white border border-amber-200 px-2.5 py-0.5 rounded-full">
                    High-Yield
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                  Saved Bookmarks
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-black text-amber-800">
                <span>Open Bookmarks</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COLLAPSIBLE SECTION 2: Subject & Module Practice (Hidden by default, expands on click) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setIsModulesOpen(prev => !prev)}
          className="w-full flex items-center justify-between cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center font-black shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black font-display text-slate-900">
                Subject & Module Practice
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Real official syllabus modules (Polity, History, Economy, Geography, Ecology, CSAT)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-lg">
              {isModulesOpen ? 'Hide Modules' : 'Click to Expand (6 Modules)'}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isModulesOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isModulesOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100 animate-in fade-in duration-200">
            {(subjects.length > 0 ? subjects : [
              { id: "polity", name: "Indian Polity & Governance" },
              { id: "history", name: "Modern Indian History" },
              { id: "economy", name: "Indian Economy & Fiscal Policy" },
              { id: "geography", name: "Physical & Indian Geography" },
              { id: "environment", name: "Ecology, Biodiversity & Climate" },
              { id: "aptitude", name: "CSAT / Quantitative Aptitude" },
            ]).map((s, idx) => (
              <div
                key={idx}
                onClick={() => onStartMode('PRACTICE', s.name)}
                className="p-4 rounded-xl border-2 border-slate-200 hover:border-brand-600 bg-white hover:bg-slate-50 cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center font-bold text-xs">
                      <BookOpen className="w-4 h-4 text-brand-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                      Syllabus Module
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-brand-600 transition-colors">
                    {s.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-brand-600">
                  <span>Start Practice</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
};
