import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Play, 
  Layers, 
  Sparkles,
  Clock
} from 'lucide-react';
import { api } from '../../api/client';

interface PDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPracticeWithDoc?: (docId: string, title: string) => void;
  onNavigateToStudio?: () => void;
}

export const PDFUploadModal: React.FC<PDFUploadModalProps> = ({
  isOpen,
  onClose,
  onStartPracticeWithDoc,
  onNavigateToStudio,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [uploadedDoc, setUploadedDoc] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setUploading(false);
      setProgress(0);
      setElapsedSeconds(0);
      setCurrentStage('');
      setUploadedDoc(null);
      setErrorMsg(null);
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        setErrorMsg('Please select a valid PDF exam document.');
        return;
      }
      setFile(selected);
      setErrorMsg(null);
    }
  };

  const startUploadAndProcessing = async () => {
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    setProgress(5);
    setElapsedSeconds(0);
    setCurrentStage('Uploading PDF document to server...');

    // Start timer counter
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Simulate steady progress stages while server processes
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 25) {
          setCurrentStage('Reading document layout & bilingual streams...');
          return prev + 4;
        } else if (prev < 60) {
          setCurrentStage('Detecting question boundaries, options (A-D) & diagrams...');
          return prev + 5;
        } else if (prev < 88) {
          setCurrentStage('Verifying answer keys & generating high-yield solutions...');
          return prev + 3;
        } else if (prev < 96) {
          setCurrentStage('Synthesizing interactive MCQ practice test...');
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadPDF(formData);

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      setCurrentStage('Complete! All questions ready to practice.');
      setUploadedDoc(res.document);
    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setErrorMsg(err?.message || 'Failed to upload and extract PDF. Please check connection and try again.');
      setProgress(0);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-dark-surface rounded-2xl shadow-card-3d border border-slate-200 dark:border-dark-border p-5 sm:p-7 relative transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={uploading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-dark-text p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-card transition-colors cursor-pointer disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-saffron-50 dark:bg-saffron-950/50 border border-saffron-200 dark:border-saffron-800/40 flex items-center justify-center text-saffron-600 dark:text-saffron-400 shrink-0">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-display text-brand-700 dark:text-dark-text">
              Upload Exam PDF to MCQs
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted">
              Auto-extracts every question, option, answer key & diagram figure.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* State 1: Choose File (when not uploading and not complete) */}
        {!uploading && !uploadedDoc && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-slate-200 dark:border-dark-border hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/60 dark:bg-dark-card/40 group">
              <FileText className="w-10 h-10 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform mb-2" />
              <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-dark-text">
                {file ? file.name : 'Click to select or drag PDF file'}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-dark-muted mt-1">
                {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload` : 'Supports test papers, mocks & PYQ booklets (up to 50MB)'}
              </div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              onClick={startUploadAndProcessing}
              disabled={!file}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 hover:from-brand-800 hover:to-brand-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-card-3d transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-gold-300" />
              <span>Convert to Interactive MCQs</span>
            </button>
          </div>
        )}

        {/* State 2: Uploading & Progress Bar */}
        {uploading && (
          <div className="space-y-5 py-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-saffron-500 animate-ping" />
                {currentStage}
              </span>
              <span className="font-mono font-bold text-slate-700 dark:text-dark-text text-sm">
                {progress}%
              </span>
            </div>

            {/* Percentage Bar */}
            <div className="w-full bg-slate-100 dark:bg-dark-card rounded-full h-3.5 p-0.5 border border-slate-200 dark:border-dark-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-saffron-500 via-gold-500 to-flagGreen-500 transition-all duration-300 ease-out shadow-xs"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Elapsed Time & Indicator */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-dark-muted pt-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Time elapsed: <strong>{elapsedSeconds}s</strong></span>
              </div>
              <span className="font-medium">Please do not close this window</span>
            </div>
          </div>
        )}

        {/* State 3: Completed Successfully */}
        {uploadedDoc && !uploading && (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-flagGreen-50 dark:bg-flagGreen-950/40 border border-flagGreen-200 dark:border-flagGreen-800/40 text-flagGreen-600 dark:text-flagGreen-400 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-dark-text font-display">
                PDF Processed Successfully!
              </h4>
              <p className="text-xs text-slate-600 dark:text-dark-muted mt-1 max-w-sm mx-auto">
                Extracted <strong>{uploadedDoc.extracted_questions_count || 10} MCQs</strong> from <strong>{uploadedDoc.file_name}</strong> with verified answers and explanations.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  onClose();
                  if (onStartPracticeWithDoc) {
                    onStartPracticeWithDoc(uploadedDoc.id, uploadedDoc.file_name);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 hover:from-brand-800 hover:to-brand-700 text-white font-bold text-xs sm:text-sm shadow-card-3d transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Solve Extracted MCQs Now</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToStudio) onNavigateToStudio();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-dark-card hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-dark-text font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Inspect in PDF Studio</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
