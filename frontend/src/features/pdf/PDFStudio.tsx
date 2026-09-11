import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Check, 
  Flag, 
  Image as ImageIcon, 
  Layers, 
  Play 
} from 'lucide-react';
import { api } from '../../api/client';
import { QuestionSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import type { PDFDocument, PDFQuestionDraft } from '../../types';

interface PDFStudioProps {
  onStartPractice?: (docId: string, title: string) => void;
}

export const PDFStudio: React.FC<PDFStudioProps> = ({ onStartPractice }) => {
  const [activeTab, setActiveTab] = useState<'review' | 'library'>('review');
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PDFDocument | null>(null);
  const [drafts, setDrafts] = useState<PDFQuestionDraft[]>([]);
  const [summary, setSummary] = useState({
    total_detected: 0,
    ready_count: 0,
    needs_review_count: 0,
    duplicate_count: 0,
  });

  const [filterMode, setFilterMode] = useState<'ALL' | 'READY' | 'REVIEW' | 'DUPLICATE'>('ALL');
  const [uploading, setUploading] = useState<boolean>(false);
  const [loadingDrafts, setLoadingDrafts] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editing state
  const [editingDraft, setEditingDraft] = useState<PDFQuestionDraft | null>(null);
  const [editStem, setEditStem] = useState<string>('');
  const [editAns, setEditAns] = useState<string>('A');

  // Reporting state
  const [reportingDraft, setReportingDraft] = useState<PDFQuestionDraft | null>(null);
  const [reportIssue, setReportIssue] = useState<string>('WRONG_ANSWER');
  const [reportNotes, setReportNotes] = useState<string>('');

  // AI Generation mode state
  const [generatingAI, setGeneratingAI] = useState<boolean>(false);

  // Upload metrics & interactive MCQ answers
  const [uploadMetrics, setUploadMetrics] = useState<{
    fileName: string;
    uploadedAt: string;
    durationSec: number;
    questionCount: number;
  } | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const fetchDocs = async () => {
    try {
      const res = await api.listPDFDocuments(1, 20);
      const filtered = (res.documents || []).filter(
        (d: any) => !d.file_name.toLowerCase().includes('sample_polity_test')
      );
      setDocuments(filtered);
      if (filtered.length > 0 && !selectedDoc) {
        handleSelectDoc(filtered[0]);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleSelectDoc = async (doc: PDFDocument) => {
    setSelectedDoc(doc);
    setLoadingDrafts(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.getPDFDrafts(doc.id);
      setDrafts(res.drafts);
      setSummary(res.summary);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    const startTime = performance.now();
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadPDF(formData);
      const durationSeconds = Math.max(0.4, Number(((performance.now() - startTime) / 1000).toFixed(1)));
      const count = res.document?.extracted_questions_count || 0;

      setUploadMetrics({
        fileName: file.name,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationSec: durationSeconds,
        questionCount: count,
      });

      if (res.cached) {
        setSuccessMsg(`Cached Document: ${res.message}`);
      } else {
        setSuccessMsg(`Successfully processed ${file.name}: ${count} questions extracted in ${durationSeconds}s.`);
      }

      await fetchDocs();
      if (res.document) {
        handleSelectDoc(res.document);
        setActiveTab('review');
      }
    } catch (err: any) {
      setErrorMsg(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleApproveDraft = async (draft: PDFQuestionDraft) => {
    try {
      await api.approvePDFDraft(draft.id, {
        subject: draft.subject || 'Indian Polity & Governance',
        topic: draft.topic || 'General Topics',
        exam: 'UPSC_CSE',
      });
      setDrafts((prev) =>
        prev.map((d) => (d.id === draft.id ? { ...d, is_imported: true } : d))
      );
      setSuccessMsg('Question approved and imported into Question Bank!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleApproveAllReady = async () => {
    if (!selectedDoc) return;
    try {
      const res = await api.approveAllReadyDrafts(selectedDoc.id, {
        exam: 'UPSC_CSE',
        subject: 'Indian Polity & Governance',
      });
      setDrafts((prev) =>
        prev.map((d) => (!d.is_duplicate ? { ...d, is_imported: true } : d))
      );
      setSuccessMsg(res.message);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleRejectDraft = async (draftId: string) => {
    try {
      await api.rejectPDFDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      setSuccessMsg('Draft discarded.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDraft) return;
    try {
      const res = await api.editPDFDraft(editingDraft.id, {
        question_text: editStem,
        candidate_answer: editAns,
      });
      setDrafts((prev) =>
        prev.map((d) => (d.id === editingDraft.id ? res.draft : d))
      );
      setEditingDraft(null);
      setSuccessMsg('Draft updated successfully.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleGenerateAI = async (mode: 'SIMILAR' | 'REVISION') => {
    if (!selectedDoc) return;
    setGeneratingAI(true);
    setSuccessMsg(null);
    try {
      const res = await api.generateAIQuestions(selectedDoc.id, mode, 3);
      setDrafts((prev) => [...prev, ...res.drafts]);
      setSuccessMsg(res.message);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportingDraft) return;
    try {
      await api.submitReport({
        question_id: reportingDraft.id,
        issue_type: reportIssue,
        description: reportNotes,
      });
      setReportingDraft(null);
      setReportNotes('');
      setSuccessMsg('Question report submitted for pedagogical review.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this PDF and its extracted drafts?')) return;
    try {
      await api.deletePDFDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
        setDrafts([]);
      }
      setSuccessMsg('Document deleted.');
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // Filter drafts based on selected review tab
  const filteredDrafts = (drafts || []).filter((d) => {
    if (filterMode === 'READY') {
      return !d.is_duplicate && ['PDF_VERIFIED', 'SOURCE_VERIFIED', 'AI_VERIFIED'].includes(d.answer_status);
    }
    if (filterMode === 'REVIEW') {
      return !d.is_duplicate && ['NEEDS_REVIEW', 'UNVERIFIED'].includes(d.answer_status);
    }
    if (filterMode === 'DUPLICATE') {
      return d.is_duplicate;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Thin PDF Upload Bar (No Floating Button) */}
      <div className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-saffron-600 dark:text-saffron-400 bg-saffron-50 dark:bg-saffron-950/60 px-2 py-0.5 rounded border border-saffron-200 dark:border-saffron-800">
                PDF MCQ Extractor
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-dark-muted">•</span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Bilingual & Auto-Evaluated
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
              Exam PDF Practice Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
              Upload test papers, select options to instantly get answers, or practice all in exam mode.
            </p>
          </div>

          {/* Thin Upload Action */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-xs transition-all cursor-pointer">
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? 'Processing PDF...' : 'Upload Exam PDF'}</span>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {selectedDoc && onStartPractice && (
              <button
                onClick={() => onStartPractice(selectedDoc.id, selectedDoc.file_name)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Practice in Arena</span>
              </button>
            )}
          </div>
        </div>

        {/* Upload Timing & Throughput Graph */}
        {uploadMetrics && (
          <div className="pt-3 border-t border-slate-100 dark:border-dark-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-50 dark:bg-dark-surface p-2.5 rounded-xl border border-slate-200 dark:border-dark-border">
              <span className="text-[10px] text-slate-400 font-bold block">Uploaded At</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{uploadMetrics.uploadedAt}</span>
            </div>
            <div className="bg-slate-50 dark:bg-dark-surface p-2.5 rounded-xl border border-slate-200 dark:border-dark-border">
              <span className="text-[10px] text-slate-400 font-bold block">Processing Time</span>
              <span className="font-black text-brand-600 dark:text-brand-400">{uploadMetrics.durationSec}s</span>
            </div>
            <div className="bg-slate-50 dark:bg-dark-surface p-2.5 rounded-xl border border-slate-200 dark:border-dark-border">
              <span className="text-[10px] text-slate-400 font-bold block">Questions Extracted</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{uploadMetrics.questionCount} MCQs</span>
            </div>
            <div className="bg-slate-50 dark:bg-dark-surface p-2.5 rounded-xl border border-slate-200 dark:border-dark-border">
              <span className="text-[10px] text-slate-400 font-bold block">Speed Rate</span>
              <span className="font-black text-saffron-600 dark:text-saffron-400">
                {uploadMetrics.questionCount > 0 ? (uploadMetrics.questionCount / uploadMetrics.durationSec).toFixed(1) : 0} Qs/sec
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Studio Navigation Tabs */}
      <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'review'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-900 hover:bg-slate-100'
          }`}
        >
          Review & Extraction Studio
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-900 hover:bg-slate-100'
          }`}
        >
          My PDFs Library ({documents.length})
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: REVIEW STUDIO */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'review' && (
        <div className="space-y-5">
          {/* Active Document Selector Pill Bar */}
          {documents.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider mr-1">Active File:</span>
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-900 hover:border-brand-500 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-xs">{doc.file_name}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
                    }`}>
                      {doc.extracted_questions_count}Q
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Section 10: Processing Stages Pill Bar */}
          {selectedDoc && (
            <div className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border rounded-2xl p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Pipeline Stage:</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {['UPLOADING', 'EXTRACTING', 'ANALYZING', 'VERIFYING', 'READY'].map((st) => {
                    const isDone = selectedDoc.status === 'READY' || (selectedDoc.processing_stage === st);
                    return (
                      <span
                        key={st}
                        className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                          selectedDoc.processing_stage === st
                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse'
                            : isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-cool-100 dark:bg-dark-surface text-slate-400 dark:text-dark-muted'
                        }`}
                      >
                        {st}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Section 12: Question Generation Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateAI('SIMILAR')}
                  disabled={generatingAI}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-royal-700 dark:text-royal-300 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-royal-600 dark:text-royal-400" />
                  <span>Generate Similar</span>
                </button>
                <button
                  onClick={() => handleGenerateAI('REVISION')}
                  disabled={generatingAI}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-royal-700 dark:text-royal-300 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-royal-600 dark:text-royal-400" />
                  <span>Generate Revision</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 5: Review Metrics Bar */}
          {selectedDoc && (
            <div className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border rounded-2xl p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    filterMode === 'ALL'
                      ? 'bg-slate-900 dark:bg-royal-600 text-white border-slate-900 dark:border-royal-600'
                      : 'bg-cool-100 dark:bg-dark-surface text-slate-700 dark:text-slate-300 border-cool-200 dark:border-dark-border hover:bg-cool-200 dark:hover:bg-dark-surface/80'
                  }`}
                >
                  {summary.total_detected} Detected
                </button>
                <button
                  onClick={() => setFilterMode('READY')}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    filterMode === 'READY'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100'
                  }`}
                >
                  ✓ {summary.ready_count} Ready
                </button>
                <button
                  onClick={() => setFilterMode('REVIEW')}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    filterMode === 'REVIEW'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100'
                  }`}
                >
                  ⚠️ {summary.needs_review_count} Need Review
                </button>
                <button
                  onClick={() => setFilterMode('DUPLICATE')}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    filterMode === 'DUPLICATE'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
                  }`}
                >
                  ✕ {summary.duplicate_count} Duplicate
                </button>
              </div>

              {/* Batch Action */}
              {summary.ready_count > 0 && (
                <button
                  onClick={handleApproveAllReady}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve All Ready ({summary.ready_count})</span>
                </button>
              )}
            </div>
          )}

          {/* Question Cards Feed */}
          {loadingDrafts ? (
            <div className="space-y-4">
              <QuestionSkeleton />
              <QuestionSkeleton />
            </div>
          ) : filteredDrafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Questions Found"
              description="No questions match the selected filter. Try selecting 'ALL' or upload a new PDF document."
              actionLabel="Show All Questions"
              onAction={() => setFilterMode('ALL')}
            />
          ) : (
            <div className="space-y-4">
              {filteredDrafts.map((draft, idx) => (
                <div
                  key={draft.id}
                  className="bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-dark-border rounded-2xl p-5 shadow-sm transition-all"
                >
                  {/* Top metadata badge row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500 dark:text-dark-muted">Q.{idx + 1}</span>
                      
                      {/* Verification Status Badge */}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wide border ${
                          draft.answer_status === 'PDF_VERIFIED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                            : draft.answer_status === 'AI_VERIFIED'
                            ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-900/50'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                        }`}
                      >
                        {draft.answer_status}
                      </span>

                      {/* Confidence Score */}
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-dark-surface px-2 py-0.5 rounded">
                        Confidence: {Math.round(draft.confidence_score * 100)}%
                      </span>

                      {/* Duplicate Warning */}
                      {draft.is_duplicate && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          Duplicate
                        </span>
                      )}

                      {/* Imported Marker */}
                      {draft.is_imported && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Imported</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-dark-muted font-semibold">
                      {draft.source_reference || 'Extracted MCQ'}
                    </span>
                  </div>

                  {/* Visual Diagram/Map Image if present */}
                  {draft.question_image_url && (
                    <div className="mb-4 p-3 bg-slate-50 dark:bg-dark-surface rounded-xl border border-slate-200 dark:border-dark-border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Diagram Attached: </span>
                        <span className="text-slate-500 dark:text-dark-muted">{draft.question_image_url}</span>
                      </div>
                    </div>
                  )}

                  {/* Question Stem (Pure White Box, Dark Black Text) */}
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-relaxed mb-4">
                    {draft.question_text}
                  </h4>

                  {/* Interactive Options Grid (Click to Submit & Reveal) */}
                  {(() => {
                    const selectedAns = userAnswers[draft.id];
                    const hasAnswered = Boolean(selectedAns);
                    const isCorrect = selectedAns === draft.candidate_answer;

                    return (
                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {draft.options.map((opt) => {
                            const isUserPick = selectedAns === opt.id;
                            const isCandidate = opt.id === draft.candidate_answer;

                            let btnStyle = 'border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface text-slate-800 dark:text-slate-200 hover:border-brand-500 hover:bg-slate-100';
                            if (hasAnswered) {
                              if (isCandidate) {
                                btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20';
                              } else if (isUserPick) {
                                btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold';
                              } else {
                                btnStyle = 'border-slate-200 opacity-60 bg-slate-50 dark:bg-dark-surface text-slate-500';
                              }
                            }

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setUserAnswers((prev) => ({ ...prev, [draft.id]: opt.id }))}
                                className={`p-3 rounded-xl text-xs sm:text-sm font-semibold border flex items-start gap-2.5 text-left transition-all cursor-pointer ${btnStyle}`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                    hasAnswered && isCandidate
                                      ? 'bg-emerald-600 text-white'
                                      : hasAnswered && isUserPick
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <span className="leading-snug pt-0.5 font-bold text-slate-900 dark:text-white">{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Direct Answer & Key Solution (No Walls of Text - Clean Heading & Essential Takeaway Only) */}
                        {hasAnswered && (
                          <div
                            className={`p-3.5 rounded-xl border text-xs sm:text-sm space-y-1 animate-in fade-in ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between font-black">
                              <span>{isCorrect ? '✅ Correct Answer!' : '❌ Incorrect Selection'}</span>
                              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white dark:bg-dark-card border font-black text-slate-900 dark:text-white shadow-2xs">
                                Verified Option: {draft.candidate_answer}
                              </span>
                            </div>
                            {draft.explanation?.why && (
                              <p className="text-xs text-slate-800 dark:text-slate-200 pt-1 leading-relaxed">
                                <strong className="text-slate-900 dark:text-white font-extrabold">Key Concept: </strong>
                                {draft.explanation.why}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-cool-100 dark:border-dark-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDraft(draft);
                          setEditStem(draft.question_text);
                          setEditAns(draft.candidate_answer);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-cool-200 dark:border-dark-border text-xs text-slate-600 dark:text-slate-300 hover:bg-cool-50 dark:hover:bg-dark-surface font-semibold flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleRejectDraft(draft.id)}
                        className="px-3 py-1.5 rounded-lg border border-cool-200 dark:border-dark-border text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => setReportingDraft(draft)}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 dark:text-dark-muted hover:text-slate-600 dark:hover:text-slate-200 hover:bg-cool-100 dark:hover:bg-dark-surface flex items-center gap-1"
                        title="Report Question Issue"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!draft.is_imported && !draft.is_duplicate && (
                      <button
                        onClick={() => handleApproveDraft(draft)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MY PDFS LIBRARY (Section 9) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Exam Documents Uploaded"
              description="Upload your test series, previous year papers, or study notes to extract and practice questions."
              actionLabel="Upload Exam PDF"
              onAction={() => {
                const el = document.querySelector('input[type="file"]') as HTMLInputElement;
                el?.click();
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-dark-card border border-cool-200 dark:border-dark-border rounded-2xl p-5 shadow-subtle hover:border-royal-300 dark:hover:border-royal-500 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-royal-600 dark:text-royal-400">
                        <FileText className="w-5 h-5" />
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          doc.status === 'READY'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1" title={doc.file_name}>
                      {doc.file_name}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-dark-muted">
                      Uploaded {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Recently'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 my-4 p-3 bg-cool-50 dark:bg-dark-surface rounded-xl text-center">
                      <div>
                        <div className="text-xs text-slate-400 dark:text-dark-muted">Questions</div>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {doc.extracted_questions_count}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 dark:text-dark-muted">Ready</div>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {doc.ready_count || doc.extracted_questions_count}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-cool-100 dark:border-dark-border">
                    <button
                      onClick={() => {
                        handleSelectDoc(doc);
                        setActiveTab('review');
                      }}
                      className="flex-1 py-2 text-center bg-royal-600 hover:bg-royal-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Review & Edit
                    </button>
                    {onStartPractice && (
                      <button
                        onClick={() => onStartPractice(doc.id, doc.file_name)}
                        className="p-2 text-royal-600 dark:text-royal-400 hover:text-royal-800 dark:hover:text-royal-300 rounded-xl hover:bg-royal-50 dark:hover:bg-dark-surface flex items-center justify-center"
                        title="Practice this PDF"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-2 text-slate-400 dark:text-dark-muted hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title="Delete PDF"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Question Modal */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-card rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-cool-200 dark:border-dark-border max-h-[90dvh] overflow-y-auto pb-safe">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 font-display">
              Edit Detected Question
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Question Stem</label>
                <textarea
                  rows={4}
                  value={editStem}
                  onChange={(e) => setEditStem(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Correct Answer</label>
                <select
                  value={editAns}
                  onChange={(e) => setEditAns(e.target.value)}
                  className="w-full min-h-[44px] p-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-dark-surface font-bold text-slate-900 dark:text-white"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingDraft(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-cool-100 dark:hover:bg-dark-surface min-h-[44px] flex items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold min-h-[44px] flex items-center cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Question Modal (Section 13) */}
      {reportingDraft && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-dark-card rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-cool-200 dark:border-dark-border max-h-[90dvh] overflow-y-auto pb-safe">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 font-display">
              Report Question Issue
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mb-4">
              Help our pedagogical team maintain 100% verified question keys.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Issue Type</label>
                <select
                  value={reportIssue}
                  onChange={(e) => setReportIssue(e.target.value)}
                  className="w-full min-h-[44px] p-2.5 text-xs rounded-xl border border-cool-200 dark:border-dark-border focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-dark-surface text-slate-900 dark:text-white font-semibold"
                >
                  <option value="WRONG_ANSWER">Wrong Answer Key</option>
                  <option value="WRONG_EXPLANATION">Wrong or Flawed Explanation</option>
                  <option value="DUPLICATE">Duplicate Question</option>
                  <option value="INCOMPLETE">Incomplete Question / Missing Options</option>
                  <option value="OUTDATED">Outdated Statutory or Legal Fact</option>
                  <option value="FORMATTING_ISSUE">Formatting or OCR Glitch</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Details (Optional)</label>
                <textarea
                  rows={3}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Explain why this answer or question is inaccurate..."
                  className="w-full p-3 text-xs rounded-xl border border-cool-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setReportingDraft(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-cool-100 dark:hover:bg-dark-surface min-h-[44px] flex items-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold min-h-[44px] flex items-center cursor-pointer shadow-xs"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
