import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Lightbulb, 
  AlertCircle, 
  Languages, 
  Brain, 
  Repeat, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../../api/client';
import type { Question } from '../../types';

interface AITutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  userSelectedOption?: string | null;
}

export const AITutorModal: React.FC<AITutorModalProps> = ({
  isOpen,
  onClose,
  question,
  userSelectedOption,
}) => {
  const [activeAction, setActiveAction] = useState<string>('DETAILED_EXPLANATION');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('Sundaram AI Tutor');
  const [copied, setCopied] = useState<boolean>(false);
  const autoTriggeredRef = useRef<string | null>(null);

  const actions = [
    { id: 'DETAILED_EXPLANATION', label: 'Detailed Explanation', icon: BookOpen, color: 'text-slate-800 bg-slate-100 hover:bg-slate-200' },
    { id: 'WHY_WRONG', label: 'Why is my answer wrong?', icon: AlertCircle, color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
    { id: 'EXPLAIN_SIMPLY', label: 'Explain Simply', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { id: 'EXPLAIN_HINDI', label: 'Explain in Hindi', icon: Languages, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
    { id: 'EXPLAIN_HINGLISH', label: 'Explain in Hinglish', icon: Languages, color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
    { id: 'MEMORY_TRICK', label: 'Memory Trick', icon: Brain, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { id: 'SIMILAR_QUESTION', label: 'Similar Question', icon: Repeat, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
  ];

  const handleTriggerAction = async (actionId: string) => {
    if (!question) return;
    setActiveAction(actionId);
    setLoading(true);
    setResponse(null);
    try {
      const res = await api.tutorQuestionAction({
        action_type: actionId,
        question_id: question.id,
        question: question,
        user_selected: userSelectedOption || undefined,
        language_mode: actionId === 'EXPLAIN_HINDI' ? 'HI' : (actionId === 'EXPLAIN_HINGLISH' ? 'HINGLISH' : 'EN')
      });
      setResponse(res.reply);
      if (res.model_used) setModelUsed(res.model_used);
    } catch (err: any) {
      setResponse(`Could not load explanation: ${err.message || 'Error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-Click Auto Trigger on Open
  useEffect(() => {
    if (isOpen && question) {
      const key = `${question.id}_${userSelectedOption || 'none'}`;
      if (autoTriggeredRef.current !== key) {
        autoTriggeredRef.current = key;
        const isIncorrect = Boolean(
          userSelectedOption && 
          question.correct_answer && 
          userSelectedOption !== question.correct_answer
        );
        const initialAction = isIncorrect ? 'WHY_WRONG' : 'DETAILED_EXPLANATION';
        handleTriggerAction(initialAction);
      }
    } else if (!isOpen) {
      autoTriggeredRef.current = null;
      setResponse(null);
      setLoading(false);
    }
  }, [isOpen, question?.id, userSelectedOption]);

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !question) return null;

  const userOptText = question.options?.find(o => o.id === userSelectedOption)?.text;
  const correctOptText = question.options?.find(o => o.id === question.correct_answer)?.text;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl border border-cool-200 dark:border-dark-border overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cool-200 dark:border-dark-border bg-gradient-to-r from-brand-950 via-indigo-900 to-brand-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-display">Sundaram AI Tutor</h3>
              <p className="text-[11px] text-slate-300">Targeted question analysis, distractor breakdown & memory pegs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Context Snippet */}
        <div className="p-4 bg-slate-50 dark:bg-dark-surface border-b border-cool-200 dark:border-dark-border text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-brand-900 dark:text-royal-300 uppercase tracking-wider text-[10px] bg-brand-100 dark:bg-brand-950/60 px-2 py-0.5 rounded border border-transparent dark:border-brand-800/40">
              {question.subject || 'General Studies'}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600 dark:text-dark-muted font-medium">{question.topic || 'General Topic'}</span>
          </div>

          <p className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {question.question_text}
          </p>

          <div className="flex items-center gap-4 pt-1 text-[11px] flex-wrap">
            {userSelectedOption && (
              <span className={`flex items-center gap-1 font-medium ${
                userSelectedOption === question.correct_answer 
                  ? 'text-emerald-700 dark:text-emerald-400' 
                  : 'text-rose-700 dark:text-rose-400'
              }`}>
                Your Answer: <strong>Option {userSelectedOption}{userOptText ? `: ${userOptText}` : ''}</strong>
              </span>
            )}
            {question.correct_answer && (
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer: <strong className="text-emerald-800 dark:text-emerald-300">Option {question.correct_answer}{correctOptText ? `: ${correctOptText}` : ''}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Action Prompt Chips */}
        <div className="p-3 bg-white dark:bg-dark-card border-b border-cool-200 dark:border-dark-border overflow-x-auto flex items-center gap-2 scrollbar-none">
          {actions.map((act) => {
            const Icon = act.icon;
            const isSelected = activeAction === act.id;
            return (
              <button
                key={act.id}
                onClick={() => handleTriggerAction(act.id)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-950 dark:bg-royal-600 text-white shadow-xs ring-2 ring-brand-900/30 dark:ring-royal-500/30'
                    : `${act.color} dark:bg-dark-surface dark:text-slate-200 dark:border dark:border-dark-border`
                } ${loading ? 'opacity-70 pointer-events-none' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {act.label}
              </button>
            );
          })}
        </div>

        {/* Response Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-white dark:bg-dark-card">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-brand-900 dark:border-royal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Sundaram AI is analyzing question nuances...
              </p>
              <p className="text-[11px] text-slate-400 dark:text-dark-muted">
                Synthesizing answer proof, elimination rationale & high-yield mnemonics
              </p>
            </div>
          ) : response ? (
            <div className="space-y-3">
              <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-100 whitespace-pre-wrap font-normal leading-relaxed text-xs sm:text-sm bg-slate-50 dark:bg-dark-surface p-4.5 rounded-xl border border-cool-200 dark:border-dark-border shadow-xs">
                {response}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-dark-muted pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Verified by: {modelUsed}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleTriggerAction(activeAction)}
                    className="text-brand-900 dark:text-royal-400 font-semibold hover:underline cursor-pointer"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Click any action above to explore</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-dark-surface border-t border-cool-200 dark:border-dark-border flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-dark-muted hidden sm:inline">
            Tailored specifically to this question
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-card rounded-lg transition-all cursor-pointer ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
