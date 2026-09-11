import React, { useState } from 'react';
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
  HelpCircle 
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
  const [activeAction, setActiveAction] = useState<string>('EXPLAIN_SIMPLY');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('Sundaram AI Tutor');

  if (!isOpen || !question) return null;

  const actions = [
    { id: 'EXPLAIN_SIMPLY', label: 'Explain Simply', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { id: 'WHY_WRONG', label: 'Why is my answer wrong?', icon: AlertCircle, color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
    { id: 'EXPLAIN_HINDI', label: 'Explain in Hindi', icon: Languages, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
    { id: 'EXPLAIN_HINGLISH', label: 'Explain in Hinglish', icon: Languages, color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
    { id: 'MEMORY_TRICK', label: 'Memory Trick', icon: Brain, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { id: 'SIMILAR_QUESTION', label: 'Similar Question', icon: Repeat, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { id: 'DETAILED_EXPLANATION', label: 'Detailed Explanation', icon: BookOpen, color: 'text-slate-700 bg-slate-100 hover:bg-slate-200' },
  ];

  const handleTriggerAction = async (actionId: string) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl border border-cool-200 dark:border-dark-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-cool-200 dark:border-dark-border bg-gradient-to-r from-brand-950 via-indigo-900 to-brand-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-display">Sundaram AI Tutor</h3>
              <p className="text-[11px] text-slate-300">Context-aware question reasoning & mnemonics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Context Snippet */}
        <div className="p-4 bg-slate-50 dark:bg-dark-surface border-b border-cool-200 dark:border-dark-border text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-900 dark:text-royal-300 uppercase tracking-wider text-[10px] bg-brand-100 dark:bg-brand-950/60 px-2 py-0.5 rounded border border-transparent dark:border-brand-800/40">
              {question.subject || 'General Studies'}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600 dark:text-dark-muted font-medium">{question.topic}</span>
          </div>
          <p className="line-clamp-2 font-medium text-slate-800 dark:text-slate-100">{question.question_text}</p>
          {userSelectedOption && (
            <div className="flex items-center gap-3 pt-1 text-[11px]">
              <span className="text-slate-500 dark:text-dark-muted">
                Your Answer: <strong className="text-slate-900 dark:text-white">{userSelectedOption}</strong>
              </span>
              {question.correct_answer && (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Correct: <strong className="text-emerald-800 dark:text-emerald-300">{question.correct_answer}</strong>
                </span>
              )}
            </div>
          )}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-brand-950 dark:bg-royal-600 text-white shadow-xs'
                    : `${act.color} dark:bg-dark-surface dark:text-slate-200 dark:border dark:border-dark-border`
                }`}
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
              <div className="w-8 h-8 border-3 border-brand-900 dark:border-royal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-slate-500 dark:text-dark-muted">
                Sundaram AI is analyzing question nuances...
              </p>
            </div>
          ) : response ? (
            <div className="space-y-3">
              <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-100 whitespace-pre-wrap font-normal leading-relaxed text-xs sm:text-sm bg-slate-50 dark:bg-dark-surface p-4 rounded-xl border border-cool-200 dark:border-dark-border">
                {response}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-dark-muted pt-1">
                <span>Model: {modelUsed}</span>
                <button
                  onClick={() => handleTriggerAction(activeAction)}
                  className="text-brand-900 dark:text-royal-400 font-semibold hover:underline"
                >
                  Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Select an AI Tutor action above</p>
              <p className="text-[11px] text-slate-400 dark:text-dark-muted max-w-sm mx-auto">
                Ask for intuitive plain-language breakdowns, Hindi or Hinglish phrasing, diagnostic distractor trap checks, or memory pegs.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-dark-surface border-t border-cool-200 dark:border-dark-border flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-dark-card rounded-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
