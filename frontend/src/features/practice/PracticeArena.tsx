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
  onOpenAIWithQuestion?: (question: Question, actionType: 'HINGLISH' | 'WHY_WRONG' | 'MEMORY_TRICK') => void;
  onExit: () => void;
}

export const PracticeArena: React.FC<PracticeArenaProps> = ({
  mode,
  currentExam,
  onExit,
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
        if (mode === 'FOCUS_TEST') count = 25; // Standard focus block
        else if (mode === 'MOCK_TEST') count = 30;
        else if (mode === 'QUICK_10') count = 10;

        const res = await api.startPractice({
          exam: currentExam,
          session_type: mode,
          count: count,
        });

        if (mounted) {
          setSession(res.session);
          setQuestions(res.questions);
          setFocusScore(res.session.focus_score ?? 100);
          setFocusViolations(res.session.focus_violations_count ?? 0);
          
          if (res.session.time_limit_seconds) {
            setTimerSeconds(res.session.time_limit_seconds);
          } else {
            setTimerSeconds(0);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to start practice session:', err);
        setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [mode, currentExam]);

  // Focus Mode Violations Listener (visibilitychange, fullscreenchange, blur)
  useEffect(() => {
    if (mode !== 'FOCUS_TEST' || isCompleted || loading || !session) return;

    const handleViolation = async (violationType: string, details: string) => {
      try {
        const res = await api.recordFocusViolation({
          session_id: session.id,
          violation_type: violationType,
          details: details,
        });
        setFocusScore(res.focus_score);
        setFocusViolations(res.focus_violations_count);
        setWarningModal({
          show: true,
          title: res.warning_title,
          message: res.warning_message,
        });

        if (res.is_terminated) {
          handleCompleteSession();
        }
      } catch (e) {
        console.error('Failed to record focus violation:', e);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('VISIBILITY_HIDDEN', 'Student tab switched or browser minimized');
      }
    };

    const onFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);
      if (!inFullscreen && !isCompleted) {
        handleViolation('FULLSCREEN_EXIT', 'Student exited fullscreen mode');
      }
    };

    const onBlur = () => {
      if (!document.hidden) {
        handleViolation('WINDOW_BLUR', 'Browser window lost focus');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [mode, isCompleted, loading, session]);

  // Timer Tick
  useEffect(() => {
    if (isCompleted || loading || !isTimerRunning) return;

    const interval = setInterval(() => {
      if (session?.time_limit_seconds) {
        // Countdown timer
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      } else {
        // Count-up timer
        setTimerSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCompleted, loading, isTimerRunning, session]);

  const currentQ = questions[currentIndex];
  const currentSubmission = currentQ ? submittedAnswers[currentQ.id] : null;

  // Option selection
  const handleSelectOption = (optId: string) => {
    // In FOCUS_TEST & PRACTICE, once submitted answer is locked
    if (currentSubmission && mode !== 'LEARN') return;
    setSelectedOption(optId);

    // In LEARN MODE: Instant feedback on click!
    if (mode === 'LEARN') {
      submitAnswerDirect(optId, false);
    }
  };

  const submitAnswerDirect = async (optId: string, isSkipped: boolean = false) => {
    if (!currentQ || !session) return;
    try {
      const res = await api.submitResponse({
        session_id: session.id,
        question_id: currentQ.id,
        selected_option: isSkipped ? undefined : optId,
        is_skipped: isSkipped,
        time_taken_seconds: 15,
      });

      setSubmittedAnswers((prev) => ({
        ...prev,
        [currentQ.id]: {
          selected: isSkipped ? undefined : optId,
          isCorrect: res.is_correct || false,
          isSkipped: isSkipped,
          explanation: res.explanation,
          correct_answer: res.correct_answer || undefined,
        },
      }));

      setSession((prev) => prev ? { ...prev, ...res.session_summary } : null);
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  const handleSubmit = () => {
    if (!selectedOption || !currentQ || !session || currentSubmission) return;
    submitAnswerDirect(selectedOption, false);
  };

  const handleSkip = () => {
    if (!currentQ || !session || currentSubmission) return;
    submitAnswerDirect('', true);
    handleNext();
  };

  const handleNext = () => {
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
    if (session) {
      try {
        const data = await api.completeSession(session.id);
        setCompletionData(data);
      } catch (e) {
        console.error(e);
      }
    }
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsCompleted(true);
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

  // Finished State: Render rich ResultView
  if (isCompleted && completionData) {
    return (
      <ResultView
        session={completionData.session}
        stats={completionData.stats}
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
        onReturnToHub={onExit}
      />
    );
  }


  return (
    <div 
      ref={arenaContainerRef}
      className={`space-y-4 max-w-4xl mx-auto ${isFullscreen ? 'p-6 bg-slate-900 text-white min-h-screen' : ''}`}
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
            className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Enter Fullscreen
          </button>
        </div>
      )}

      {/* Top Arena Navigation Bar */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between transition-colors ${
        isFullscreen 
          ? 'bg-slate-800/80 border-slate-700' 
          : 'bg-white dark:bg-dark-surface border-cool-200 dark:border-dark-border shadow-subtle dark:shadow-dark-card'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onExit}
            className="text-xs font-bold text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-dark-text transition-all flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
          <div className="h-4 w-[1px] bg-cool-200 dark:bg-dark-border" />
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900/40">
            {mode.replace('_', ' ')}
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-dark-text">
            Q {currentIndex + 1} <span className="text-slate-400 dark:text-dark-muted font-normal">/ {questions.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold ${
            mode === 'FOCUS_TEST' && timerSeconds < 120 
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 animate-pulse' 
              : 'bg-slate-100 dark:bg-dark-card text-slate-800 dark:text-dark-text'
          }`}>
            <Timer className="w-3.5 h-3.5" />
            {formatTimer(timerSeconds)}
          </div>

          {/* Focus Score badge if Focus Mode */}
          {mode === 'FOCUS_TEST' && (
            <div className="hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Focus: {focusScore} ({focusViolations}/3)
            </div>
          )}

          {/* Question Navigator Grid Button */}
          <button
            onClick={() => setIsNavigatorOpen(true)}
            className="w-8 h-8 rounded-xl bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-dark-text transition-all cursor-pointer"
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
        <div className={`rounded-2xl p-6 sm:p-8 border shadow-card dark:shadow-dark-card space-y-6 transition-colors ${
          isFullscreen 
            ? 'bg-slate-800/90 border-slate-700 text-white' 
            : 'bg-white dark:bg-dark-surface border-cool-200 dark:border-dark-border'
        }`}>
          {/* Question Meta tags */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/40 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                {currentQ.subject || 'General Studies'}
              </span>
              <span className="text-slate-400 dark:text-dark-muted">·</span>
              <span className="text-slate-600 dark:text-dark-muted font-semibold">{currentQ.topic}</span>
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
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-dark-text leading-relaxed font-display text-fluid-q">
            {currentQ.question_text}
          </h3>

          {/* Diagram / Map image if available */}
          {currentQ.image_url && (
            <div className="my-4 p-3 bg-slate-50 dark:bg-dark-card rounded-xl border border-cool-200 dark:border-dark-border flex flex-col items-center">
              <img 
                src={currentQ.image_url} 
                alt="Question Diagram" 
                className="max-h-56 sm:max-h-72 object-contain rounded-lg shadow-2xs w-auto max-w-full" 
              />
              <span className="text-[10px] text-slate-400 dark:text-dark-muted mt-1 font-medium">Exhibit / Map Reference</span>
            </div>
          )}

          {/* Options List - Touch targets min 48px */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              
              // Color styles depending on mode and submission
              let optStyle = 'bg-slate-50 dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-700/60 border-cool-200 dark:border-dark-border text-slate-800 dark:text-dark-text';
              
              if (mode === 'LEARN' && currentSubmission) {
                if (opt.id === currentSubmission.correct_answer) {
                  optStyle = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-semibold';
                } else if (isSelected && !currentSubmission.isCorrect) {
                  optStyle = 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-200 font-semibold';
                }
              } else if (isSelected) {
                optStyle = 'bg-brand-50/80 dark:bg-brand-950/60 border-brand-600 dark:border-brand-500 text-brand-950 dark:text-brand-200 font-semibold ring-1 ring-brand-600/30';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  disabled={Boolean(currentSubmission && mode !== 'LEARN')}
                  className={`w-full min-h-[48px] p-3.5 sm:p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start gap-3.5 cursor-pointer ${optStyle}`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    isSelected ? 'bg-brand-600 text-white' : 'bg-cool-200 dark:bg-slate-700 text-slate-700 dark:text-dark-muted'
                  }`}>
                    {opt.id}
                  </span>
                  <span className="flex-1 leading-relaxed">{opt.text}</span>

                  {mode === 'LEARN' && currentSubmission && opt.id === currentSubmission.correct_answer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {mode === 'LEARN' && currentSubmission && isSelected && !currentSubmission.isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* LEARN MODE: Instant Feedback Card */}
          {mode === 'LEARN' && currentSubmission && (
            <div className={`p-5 rounded-2xl border space-y-4 animate-in fade-in transition-colors ${
              currentSubmission.isCorrect 
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-200' 
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {currentSubmission.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Correct! Well done.</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <span>Incorrect. The correct answer is Option {currentSubmission.correct_answer}.</span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setIsAITutorOpen(true)}
                  className="px-3 py-1 bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 font-bold text-xs rounded-lg shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer border border-cool-200 dark:border-dark-border"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Ask AI
                </button>
              </div>

              {/* Structured Pedagogical Explanations */}
              {currentSubmission.explanation && (
                <div className="bg-white/90 dark:bg-dark-surface/90 p-4 rounded-xl border border-cool-200 dark:border-dark-border space-y-3 text-xs text-slate-800 dark:text-dark-text">
                  <div>
                    <span className="font-bold text-brand-700 dark:text-brand-400 block mb-0.5">The "Why":</span>
                    <p className="leading-relaxed text-slate-700 dark:text-dark-muted">{currentSubmission.explanation.why}</p>
                  </div>
                  {currentSubmission.explanation.quick_fact && (
                    <div className="bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                      <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5 flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Quick Fact
                      </span>
                      <p className="text-amber-950 dark:text-amber-200">{currentSubmission.explanation.quick_fact}</p>
                    </div>
                  )}
                  {currentSubmission.explanation.memory_trick && (
                    <div className="bg-indigo-50/80 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900/40">
                      <span className="font-bold text-indigo-900 dark:text-indigo-300 block mb-0.5 flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Memory Trick (Mnemonic)
                      </span>
                      <p className="text-indigo-950 dark:text-indigo-200 font-medium">{currentSubmission.explanation.memory_trick}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Button Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-cool-200 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-3.5 py-2 bg-cool-100 dark:bg-dark-card hover:bg-cool-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-dark-text font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Prev
              </button>

              {mode !== 'FOCUS_TEST' && (
                <button
                  onClick={handleSkip}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-dark-card hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-dark-muted font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Skip
                </button>
              )}

              {/* In-Question Ask AI button */}
              <button
                onClick={() => setIsAITutorOpen(true)}
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 text-indigo-900 dark:text-indigo-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-900/40"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Ask AI
              </button>
            </div>

            <div className="flex items-center gap-2">
              {mode !== 'LEARN' && !currentSubmission && (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedOption}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Submit
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-dark-surface rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-cool-200 dark:border-dark-border transition-colors">
            <div className="flex items-center justify-between border-b border-cool-200 dark:border-dark-border pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text font-display">Question Navigator</h4>
              <button 
                onClick={() => setIsNavigatorOpen(false)}
                className="text-xs font-bold text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-dark-text cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2.5 max-h-64 overflow-y-auto p-1">
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
    </div>
  );
};

