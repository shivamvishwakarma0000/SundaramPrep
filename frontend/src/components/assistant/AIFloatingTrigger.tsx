import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

interface AIFloatingTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AIFloatingTrigger: React.FC<AIFloatingTriggerProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <aside aria-label="AI Assistant Quick Launch" className="contents">
      <button
        type="button"
        onClick={onClick}
        aria-label="Open Sundaram AI Assistant Study Mentor"
        title="Open Sundaram AI Study Mentor"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-brand-950 via-royal-900 to-brand-900 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-amber-400/40 hover:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-400/30 cursor-pointer"
        style={{
          boxShadow: '0 10px 25px -5px rgba(13, 50, 105, 0.4), 0 8px 10px -6px rgba(255, 103, 31, 0.2)',
        }}
      >
        {/* Glowing 3D Orb Effect */}
        <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-500 p-0.5 shadow-inner">
          <div className="w-full h-full rounded-full bg-brand-950 flex items-center justify-center overflow-hidden">
            <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-300 animate-pulse" />
          </div>
          {/* Active online pulse dot */}
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-brand-950"></span>
          </span>
        </div>

        {/* Text Label - shown on tablet & desktop, icon on tiny screens */}
        <div className="hidden sm:flex flex-col text-left pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold font-display tracking-tight text-white flex items-center gap-1">
              Sundaram AI
            </span>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Mentor
            </span>
          </div>
          <span className="text-[10px] text-slate-300 font-medium leading-none">
            Ask doubts & tricks
          </span>
        </div>

        {/* Subtle hover beacon */}
        <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
          <Bot className="w-4 h-4 text-amber-300/80" />
        </div>
      </button>
    </aside>
  );
};
