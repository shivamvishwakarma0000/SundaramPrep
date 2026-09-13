import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

interface AIFloatingTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AIFloatingTrigger: React.FC<AIFloatingTriggerProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <aside aria-label="AI Assistant Quick Launch" className="contents">
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2">
        {/* Black Pill Badge "AI Assistant" (Matches Reference) */}
        <div className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-black/90 text-white text-xs font-bold shadow-lg border border-white/10 backdrop-blur-md select-none pointer-events-none animate-in fade-in">
          AI Assistant
        </div>

        {/* Glowing Circular AI Assistant Trigger Button */}
        <button
          type="button"
          onClick={onClick}
          aria-label="Open Sundaram AI Assistant"
          title="Open Sundaram AI Assistant"
          className="relative group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/20 focus:outline-none focus:ring-4 focus:ring-purple-400/30 cursor-pointer"
          style={{
            boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5), 0 8px 10px -6px rgba(168, 85, 247, 0.3)',
          }}
        >
          {/* Subtle Outer Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-40 blur-md group-hover:opacity-75 transition-opacity" />
          
          {/* Chat Icon with Sparkle */}
          <div className="relative z-10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>

          {/* Active online pulse dot */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900" />
          </span>
        </button>
      </div>
    </aside>
  );
};
