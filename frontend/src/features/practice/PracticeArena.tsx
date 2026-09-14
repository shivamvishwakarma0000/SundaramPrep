import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Bookmark as BookmarkIcon, 
  AlertTriangle,
  Maximize2,
  Grid,
  Brain,
  Lightbulb
} from 'lucide-react';
import { api } from '../../api/client';
import type { Question, QuizSession, ExamType, PracticeMode } from '../../types';
import { ResultView } from './ResultView';
import { AITutorModal } from '../assistant/AITutorModal';
import { QuestionSkeleton } from '../../components/common/Skeleton';


interface PracticeArenaProps {
  mode: PracticeMode | string;
  currentExam: ExamType;
  subject?: string;
  topic?: string;
  documentId?: string;
  documentIds?: string[];
  documentTitle?: string;
  onOpenAIWithQuestion?: (question: Question, actionType: 'HINGLISH' | 'WHY_WRONG' | 'MEMORY_TRICK') => void;
  onExit: () => void;
  onRestartWithTopic?: (topic: string) => void;
}

export const PracticeArena: React.FC<PracticeArenaProps> = ({
  mode,
  currentExam,
  subject,
  topic,
  documentId,
  documentIds,
  documentTitle,
  onExit,
  onRestartWithTopic,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Record<string, { selected?: string; isCorrect: boolean; isSkipped?: boolean; explanation?: any; correct_answer?: string }>
  >({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState<boolean>(true);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const isTimerRunning = true;
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completionData, setCompletionData] = useState<any>(null);

  // Focus Mode Fullscreen & Violations State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [focusViolations, setFocusViolations] = useState<number>(0);
  const [focusScore, setFocusScore] = useState<number>(100);
  const [warningModal, setWarningModal] = useState<{ show: boolean; title: string; message: string } | null>(null);

  // Submitting Running Progress Bar State (0% to 100%)
  const [isSubmittingTest, setIsSubmittingTest] = useState<boolean>(false);
  const [submitProgress, setSubmitProgress] = useState<number>(0);
  const [submitStageText, setSubmitStageText] = useState<string>('Locking test responses...');

  // Question Navigator Drawer State
  const [isNavigatorOpen, setIsNavigatorOpen] = useState<boolean>(false);

  // AI Tutor Modal State
  const [isAITutorOpen, setIsAITutorOpen] = useState<boolean>(false);

  const arenaContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Session
  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      try {
        let count = 10;
        if (documentIds && documentIds.length > 0 && mode !== 'MOCK_TEST') count = 200; // Load all questions if direct PDF practice
        else if (documentId && mode !== 'MOCK_TEST') count = 200; // Load all questions from uploaded PDF
        else if (mode === 'FOCUS_TEST') count = 25; // Standard focus block
        else if (mode === 'MOCK_TEST') count = 25;

        const res = await api.startPractice({
          exam: currentExam,
          session_type: mode,
          subject,
          topic,
          document_id: documentId,
          document_ids: documentIds,
          count,
        });

        if (mounted) {
          setQuestions(res.questions);
          setSession(res.session);
          setTimerSeconds(res.session.time_limit_seconds || 0);
          setFocusScore(res.session.focus_score ?? 100);
          setFocusViolations(res.session.focus_violations_count ?? 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [mode, currentExam, subject, topic, documentId, documentIds]);

  // Tab switch / Window blur violation monitor for FOCUS_TEST mode
  useEffect(() => {
    if (mode !== 'FOCUS_TEST' || isCompleted || loading || !session) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        try {
          const res = await api.recordFocusViolation({
            session_id: session.id,
            violation_type: 'TAB_SWITCH',
            details: 'User navigated away from active test tab.',
          });
          setFocusViolations(res.focus_violations_count);
          setFocusScore(res.focus_score);

          if (res.is_terminated) {
            setWarningModal({
              show: true,
              title: res.warning_title || 'Test Auto-Submitted',
              message: res.warning_message || 'Maximum focus violations (3/3) exceeded. Your test has been automatically locked and submitted.',
            });
            handleCompleteSession();
          } else {
            setWarningModal({
              show: true,
              title: res.warning_title || `Focus Violation Warning (${res.focus_violations_count}/3)`,
              message: res.warning_message || `Tab switching is strictly monitored in Focus Test Mode. 3 violations will trigger instant test termination.`,
            });
          }
        } catch (e) {
          console.error('Focus event logging failed:', e);
        }
      }
    };

    const handleWindowBlur = async () => {
      if (!document.hidden) {
        try {
          const res = await api.recordFocusViolation({
            session_id: session.id,
            violation_type: 'WINDOW_BLUR',
            details: 'Application window lost active focus.',
          });
          setFocusViolations(res.focus_violations_count);
          setFocusScore(res.focus_score);
        } catch (e) {
          console.error(e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [mode, isCompleted, loading, session]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Timer Tick
  useEffect(() => {
    if (!isTimerRunning || isCompleted || loading) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (mode === 'FOCUS_TEST' || mode === 'MOCK_TEST' || mode === 'QUICK_10') {
          if (prev <= 1) {
            clearInterval(interval);
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        }
        return prev + 1; // Count up for untimed practice
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, isCompleted, loading, mode]);

  const currentQ = questions[currentIndex];
  const currentSubmission = currentQ ? submittedAnswers[currentQ.id] : null;

  const handleSelectOption = (optId: string) => {
    // In FOCUS_TEST, once submitted answer is locked
    if (currentSubmission && mode === 'FOCUS_TEST') return;
    
    setSelectedOption(optId);

    // In MOCK_TEST, PRACTICE, FOCUS_TEST, PDF_PRACTICE, etc. answers are shown after submit
  };

  const submitAnswerDirect = async (optId: string, isSkipped: boolean = false) => {
    if (!currentQ || !session) return;
    try {
      const res = await api.submitResponse({
        session_id: session.id,
        question_id: currentQ.id,
        selected_option: optId || undefined,
        is_skipped: isSkipped,
        time_taken_seconds: 10,
      });

      setSubmittedAnswers((prev) => ({
        ...prev,
        [currentQ.id]: {
          selected: optId,
          isCorrect: Boolean(res.is_correct),
          isSkipped: Boolean(res.is_skipped),
          explanation: res.explanation || currentQ.explanation,
          correct_answer: res.correct_answer || currentQ.correct_answer,
        },
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    submitAnswerDirect(selectedOption, false);
  };

  const handleSkip = () => {
    submitAnswerDirect('', true);
    handleNext();
  };

  const handleNext = () => {
    // If option was selected but not explicitly submitted, submit in background
    if (selectedOption && !currentSubmission) {
      submitAnswerDirect(selectedOption, false);
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      const nextQ = questions[currentIndex + 1];
      const existing = submittedAnswers[nextQ?.id];
      setSelectedOption(existing?.selected || null);
    } else {
      handleCompleteSession();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      const prevQ = questions[currentIndex - 1];
      const existing = submittedAnswers[prevQ?.id];
      setSelectedOption(existing?.selected || null);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentQ) return;
    try {
      const res = await api.toggleBookmark(currentQ.id);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (res.bookmarked) next.add(currentQ.id);
        else next.delete(currentQ.id);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteSession = async () => {
    setIsSubmittingTest(true);
    setSubmitProgress(12);
    setSubmitStageText('Locking test responses & evaluating answers...');

    // Smooth running progress animation (0% -> 100%)
    const progressTimer = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev < 35) {
          setSubmitStageText('Evaluating accuracy & calculating negative marks...');
          return prev + 12;
        } else if (prev < 70) {
          setSubmitStageText('Computing Focus Integrity & Sectional Time Analytics...');
          return prev + 10;
        } else if (prev < 92) {
          setSubmitStageText('Updating Mistake Engine & Syncing Daily Targets...');
          return prev + 6;
        }
        return prev;
      });
    }, 160);

    let compData = null;
    if (session) {
      try {
        compData = await api.completeSession(session.id);
        setCompletionData(compData);
      } catch (e) {
        console.error(e);
      }
    }

    clearInterval(progressTimer);
    setSubmitProgress(100);
    setSubmitStageText('Test Evaluated Successfully! Loading Scorecard...');

    setTimeout(() => {
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsSubmittingTest(false);
      setIsCompleted(true);
    }, 450);
  };

  const requestFullscreenMode = async () => {
    if (arenaContainerRef.current) {
      try {
        await arenaContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (e) {
        console.error('Fullscreen request failed:', e);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <QuestionSkeleton />
      </div>
    );
  }

  if (!loading && questions.length === 0) {
    return (
      <div className="py-12">
        <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-8 sm:p-12 text-center shadow-subtle flex flex-col items-center justify-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-2xl flex items-center justify-center mb-4">
            📝
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-dark-text mb-2">
            No Questions Available
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-dark-muted mb-6 max-w-sm">
            There are currently no active questions for this mode and exam target. Please try another mode or upload a PDF.
          </p>
          <button
            onClick={onExit}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm shadow-xs cursor-pointer"
          >
            Return to Practice Hub
          </button>
        </div>
      </div>
    );
  }

  const handleRestartTopic = async (topicName: string) => {
    if (onRestartWithTopic) {
      onRestartWithTopic(topicName);
      return;
    }
    setLoading(true);
    setIsCompleted(false);
    setCompletionData(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setSubmittedAnswers({});
    try {
      const res = await api.startPractice({
        exam: currentExam,
        session_type: 'MOCK_TEST',
        count: 10,
        topic: topicName,
      });
      setSession(res.session);
      setQuestions(res.questions);
      setTimerSeconds(res.session.time_limit_seconds || 600);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Finished State: Render rich ResultView
  if (isCompleted && completionData) {
    return (
      <ResultView
        session={completionData.session}
        stats={completionData.stats}
        activeTopic={topic}
        aiCoach={completionData.ai_coach}
        newPersonalBests={completionData.new_personal_bests}
        subjectBreakdown={completionData.subject_breakdown}
        topicBreakdown={completionData.topic_breakdown}
        onReviewAnswers={() => {
          setIsCompleted(false);
          setCurrentIndex(0);
        }}
        onPracticeMistakes={() => {
          window.location.reload();
        }}
        onRestartTopic={handleRestartTopic}
        onReturnToHub={onExit}
      />
    );
  }


  const isDarkThemeOrProctored = isFullscreen || mode === 'FOCUS_TEST';

  return (
    <div 
      ref={arenaContainerRef}
      className={`space-y-4 max-w-4xl mx-auto ${isDarkThemeOrProctored ? 'p-4 sm:p-6 bg-slate-900 text-slate-100 min-h-screen' : ''}`}
    >
      {/* Focus Mode Fullscreen Trigger Prompt (if not entered yet) */}
      {mode === 'FOCUS_TEST' && !isFullscreen && !isCompleted && (
        <div className="bg-indigo-950 text-white p-4 rounded-2xl border border-indigo-800 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold">Focus Mode Proctored Simulation</h4>
              <p className="text-[11px] text-indigo-200">
                Fullscreen is recommended. Tab switches and window blurs trigger Focus Violations.
              </p>
            </div>
          </div>
          <button
            onClick={requestFullscreenMode}
            className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Enter Fullscreen
          </button>
        </div>
      )}

      {/* Top Arena Navigation Bar */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between transition-colors ${
        isDarkThemeOrProctored 
          ? 'bg-slate-800/90 border-slate-700 text-white' 
          : 'bg-white dark:bg-dark-surface border-cool-200 dark:border-dark-border shadow-subtle dark:shadow-dark-card'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onExit}
            className={`text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              isDarkThemeOrProctored
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-dark-text'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
          <div className={`h-4 w-[1px] ${isDarkThemeOrProctored ? 'bg-slate-700' : 'bg-cool-200 dark:bg-dark-border'}`} />
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900/40">
            {mode.replace('_', ' ')}
          </span>
          <span className={`text-xs font-bold ${
            isDarkThemeOrProctored ? 'text-white' : 'text-slate-700 dark:text-dark-text'
          }`}>
            Q {currentIndex + 1} <span className={`font-normal ${isDarkThemeOrProctored ? 'text-slate-400' : 'text-slate-400 dark:text-dark-muted'}`}>/ {questions.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold ${
            mode === 'FOCUS_TEST' && timerSeconds < 120 
              ? 'bg-rose-900/70 text-rose-200 border border-rose-700/60 animate-pulse' 
              : isDarkThemeOrProctored
              ? 'bg-slate-800 border border-slate-700 text-slate-100'
              : 'bg-slate-100 dark:bg-dark-card text-slate-800 dark:text-dark-text'
          }`}>
            <Timer className="w-3.5 h-3.5" />
            {formatTimer(timerSeconds)}
          </div>

          {/* Focus Score badge if Focus Mode */}
          {mode === 'FOCUS_TEST' && (
            <div className="hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-950/60 text-indigo-200 border border-indigo-800/60">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Focus: {focusScore} ({focusViolations}/3)
            </div>
          )}

          {/* Question Navigator Grid Button */}
          <button
            onClick={() => setIsNavigatorOpen(true)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isDarkThemeOrProctored
                ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                : 'bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 text-slate-700 dark:text-dark-text'
            }`}
            title="Question Navigator"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleToggleBookmark}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              currentQ && bookmarkedIds.has(currentQ.id)
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                : isDarkThemeOrProctored
                ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
                : 'bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 text-slate-600 dark:text-dark-muted'
            }`}
            title="Bookmark Question"
          >
            <BookmarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Card */}
      {currentQ ? (
        <div className={`rounded-2xl p-4 sm:p-6 md:p-8 border shadow-card dark:shadow-dark-card space-y-4 sm:space-y-6 transition-colors ${
          isDarkThemeOrProctored 
            ? 'bg-slate-800/90 border-slate-700 text-slate-100' 
            : 'bg-white dark:bg-dark-surface border-cool-200 dark:border-dark-border'
        }`}>
          {/* Question Meta tags */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {documentTitle ? (
                <span className="font-bold text-saffron-700 dark:text-saffron-300 bg-saffron-50 dark:bg-saffron-950/60 border border-saffron-200 dark:border-saffron-900/40 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                  📄 {documentTitle}
                </span>
              ) : (
                <span className="font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/40 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                  {currentQ.subject || 'General Studies'}
                </span>
              )}
              <span className={isDarkThemeOrProctored ? 'text-slate-500' : 'text-slate-400 dark:text-dark-muted'}>·</span>
              <span className={`font-semibold ${isDarkThemeOrProctored ? 'text-slate-300' : 'text-slate-600 dark:text-dark-muted'}`}>
                {currentQ.topic}
              </span>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
              currentQ.difficulty === 'EASY' 
                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40' 
                : (currentQ.difficulty === 'HARD' 
                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40' 
                    : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40')
            }`}>
              {currentQ.difficulty}
            </span>
          </div>

          {/* Question Stem - Responsive Fluid Typography clamp() */}
          <h3 className={`text-base sm:text-lg lg:text-xl font-bold leading-relaxed font-display text-fluid-q break-words min-w-0 ${
            isDarkThemeOrProctored ? 'text-white' : 'text-slate-900 dark:text-dark-text'
          }`}>
            {currentQ.question_text}
          </h3>

          {/* Diagram / Map image if available */}
          {currentQ.image_url && (
            <div className={`my-4 p-3 rounded-xl border flex flex-col items-center ${
              isDarkThemeOrProctored
                ? 'bg-slate-900/60 border-slate-700'
                : 'bg-slate-50 dark:bg-dark-card border-cool-200 dark:border-dark-border'
            }`}>
              <img 
                src={currentQ.image_url} 
                alt="Question Diagram" 
                className="max-h-56 sm:max-h-72 object-contain rounded-lg shadow-2xs w-auto max-w-full" 
              />
              <span className={`text-[10px] mt-1 font-medium ${
                isDarkThemeOrProctored ? 'text-slate-400' : 'text-slate-400 dark:text-dark-muted'
              }`}>Exhibit / Map Reference</span>
            </div>
          )}

          {/* Options List & Feedback Section */}
          {(() => {
            const correctKey = currentSubmission?.correct_answer || currentQ.correct_answer;
            const correctOptObj = currentQ.options.find((o) => o.id === correctKey);
            const correctOptText = correctOptObj ? `: ${correctOptObj.text}` : '';
            const effectiveExplanation = currentSubmission?.explanation || currentQ.explanation;

            return (
              <>
                {/* Options List - Touch targets min 48px */}
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    const isThisTheCorrectAnswer = Boolean(correctKey && opt.id === correctKey);
                    
                    // Color styles depending on mode and submission
                    let optStyle = isDarkThemeOrProctored
                      ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-100'
                      : 'bg-slate-50 dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-700/60 border-slate-200 dark:border-dark-border text-slate-800 dark:text-dark-text';
                    
                    if (mode !== 'FOCUS_TEST' && currentSubmission) {
                      if (isThisTheCorrectAnswer) {
                        optStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-2 ring-emerald-500/40 shadow-xs';
                      } else if (isSelected && !currentSubmission.isCorrect) {
                        optStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 dark:border-rose-500 text-rose-950 dark:text-rose-100 font-bold ring-2 ring-rose-500/40 shadow-xs';
                      }
                    } else if (isSelected) {
                      optStyle = isDarkThemeOrProctored
                        ? 'bg-brand-600/30 border-brand-500 text-white font-bold ring-2 ring-brand-500/40 shadow-xs'
                        : 'bg-brand-50/90 dark:bg-brand-950/60 border-brand-600 dark:border-brand-500 text-brand-950 dark:text-brand-200 font-bold ring-2 ring-brand-600/30';
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        disabled={Boolean(currentSubmission && mode === 'FOCUS_TEST')}
                        className={`w-full min-h-[48px] p-3.5 sm:p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start gap-3.5 cursor-pointer overflow-hidden ${optStyle}`}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          mode !== 'FOCUS_TEST' && currentSubmission && isThisTheCorrectAnswer
                            ? 'bg-emerald-600 text-white'
                            : mode !== 'FOCUS_TEST' && currentSubmission && isSelected && !currentSubmission.isCorrect
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-brand-600 text-white'
                            : isDarkThemeOrProctored
                            ? 'bg-slate-700 text-slate-200'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-dark-muted'
                        }`}>
                          {opt.id}
                        </span>
                        <span className="flex-1 leading-relaxed break-words min-w-0">{opt.text}</span>

                        {mode !== 'FOCUS_TEST' && currentSubmission && isThisTheCorrectAnswer && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {mode !== 'FOCUS_TEST' && currentSubmission && isSelected && !currentSubmission.isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* INSTANT ANSWER & SOLUTION CARD (Directly below question) */}
                {mode !== 'FOCUS_TEST' && currentSubmission && (
                  <div className={`p-5 rounded-2xl border space-y-4 animate-in fade-in transition-colors box-3d ${
                    currentSubmission.isCorrect 
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200' 
                      : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-950 dark:text-rose-200'
                  }`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {currentSubmission.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Correct! Option {correctKey}{correctOptText} is the right answer.</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Incorrect. The correct answer is Option {correctKey}{correctOptText}.</span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setIsAITutorOpen(true)}
                        className="px-3 py-1 bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 font-bold text-xs rounded-lg shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-dark-border ml-auto"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Ask AI Tutor
                      </button>
                    </div>

                    {/* Structured Pedagogical Explanations */}
                    {effectiveExplanation && (
                      <div className="bg-white/95 dark:bg-dark-surface/95 p-4 rounded-xl border border-slate-200 dark:border-dark-border space-y-3 text-xs text-slate-800 dark:text-dark-text shadow-xs">
                        <div>
                          <span className="font-bold text-brand-700 dark:text-brand-400 block mb-0.5">The "Why" & Verified Reason:</span>
                          <p className="leading-relaxed text-slate-700 dark:text-dark-muted">
                            {effectiveExplanation.why || 'Curriculum aligned explanation verified for competitive exam benchmarks.'}
                          </p>
                        </div>
                        {effectiveExplanation.quick_fact && (
                          <div className="bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                            <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5 flex items-center gap-1">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Quick Fact
                            </span>
                            <p className="text-amber-950 dark:text-amber-200">{effectiveExplanation.quick_fact}</p>
                          </div>
                        )}
                        {effectiveExplanation.memory_trick && (
                          <div className="bg-indigo-50/80 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900/40">
                            <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-0.5 flex items-center gap-1">
                              <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Memory Trick (Mnemonic)
                            </span>
                            <p className="text-indigo-950 dark:text-indigo-200 font-medium">{effectiveExplanation.memory_trick}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Action Button Controls */}
          <div className={`flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t ${
            isDarkThemeOrProctored ? 'border-slate-700' : 'border-cool-200 dark:border-dark-border'
          }`}>
            <div className="flex items-center gap-1.5 xs:gap-2 flex-wrap">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`px-3 xs:px-3.5 py-2 disabled:opacity-40 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                  isDarkThemeOrProctored
                    ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
                    : 'bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 text-slate-700 dark:text-dark-text'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Prev
              </button>

              {mode !== 'FOCUS_TEST' && (
                <button
                  onClick={handleSkip}
                  className={`px-3 xs:px-3.5 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                    isDarkThemeOrProctored
                      ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
                      : 'bg-slate-100 dark:bg-dark-card hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-dark-muted'
                  }`}
                >
                  Skip
                </button>
              )}

              {/* In-Question Ask AI button */}
              <button
                onClick={() => setIsAITutorOpen(true)}
                className={`px-2.5 xs:px-3.5 py-2 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isDarkThemeOrProctored
                    ? 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border-indigo-800/60'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 text-indigo-900 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Ask AI
              </button>
            </div>

            <div className="flex items-center gap-1.5 xs:gap-2 flex-wrap">
              {mode !== 'LEARN' && !currentSubmission && (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedOption}
                  className="px-4 xs:px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Submit
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4 xs:px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Question Navigator Drawer Modal */}
      {isNavigatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-surface rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-cool-200 dark:border-dark-border transition-colors max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-cool-200 dark:border-dark-border pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text font-display">Question Navigator</h4>
              <button 
                onClick={() => setIsNavigatorOpen(false)}
                className="text-xs font-bold text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-dark-text cursor-pointer p-1"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-7 gap-2 max-h-72 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const sub = submittedAnswers[q.id];
                const isCur = idx === currentIndex;
                const isBk = bookmarkedIds.has(q.id);

                let bg = 'bg-slate-100 dark:bg-dark-card text-slate-700 dark:text-dark-muted';
                if (sub?.isSkipped) bg = 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
                else if (sub?.isCorrect) bg = 'bg-emerald-500 text-white';
                else if (sub) bg = 'bg-rose-500 text-white';

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      const ex = submittedAnswers[q.id];
                      setSelectedOption(ex?.selected || null);
                      setIsNavigatorOpen(false);
                    }}
                    className={`relative p-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${bg} ${
                      isCur ? 'ring-2 ring-brand-600 dark:ring-brand-400 ring-offset-2 dark:ring-offset-dark-surface' : ''
                    }`}
                  >
                    {idx + 1}
                    {isBk && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-dark-muted pt-2 border-t border-cool-200 dark:border-dark-border">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Answered</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Skipped</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Bookmarked</span>
            </div>
          </div>
        </div>
      )}

      {/* Focus Mode 3-Strike Warning Modal */}
      {warningModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in zoom-in-95">
          <div className="bg-white dark:bg-dark-surface rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-rose-200 dark:border-rose-900/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-dark-text font-display">{warningModal.title}</h3>
              <p className="text-xs text-slate-600 dark:text-dark-muted mt-1.5 leading-relaxed">{warningModal.message}</p>
            </div>
            <button
              onClick={() => setWarningModal(null)}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              I Understand & Return to Test
            </button>
          </div>
        </div>
      )}

      {/* In-Question AI Tutor Modal */}
      <AITutorModal
        isOpen={isAITutorOpen}
        onClose={() => setIsAITutorOpen(false)}
        question={currentQ}
        userSelectedOption={selectedOption}
      />

      {/* Submitting Running Progress Bar Modal (0% - 100%) */}
      {isSubmittingTest && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            {/* Animated Pulsing Icon */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-brand-500/20 rounded-full animate-ping" />
              <div className="w-20 h-20 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg border border-brand-400/30">
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white font-display">
                Submitting Your Test...
              </h3>
              <p className="text-xs text-slate-300 font-medium min-h-[20px] transition-all">
                {submitStageText}
              </p>
            </div>

            {/* Running Progress Bar (0% -> 100%) */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold text-slate-300 px-1">
                <span>Evaluation Progress</span>
                <span className="text-brand-400 font-bold">{Math.round(submitProgress)}%</span>
              </div>
              <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${Math.min(100, Math.max(0, submitProgress))}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Analyzing performance against exam benchmarks</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

