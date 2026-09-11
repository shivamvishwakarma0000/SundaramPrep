import React from 'react';
import { UploadCloud, Sparkles } from 'lucide-react';

interface PDFUploadFABProps {
  onClick: () => void;
}

export const PDFUploadFAB: React.FC<PDFUploadFABProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label="Upload Exam PDF"
      className="fixed bottom-20 md:bottom-7 right-4 sm:right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 hover:from-brand-800 hover:to-brand-700 text-white px-4 sm:px-5 py-3 sm:py-3.5 rounded-full shadow-floating border-2 border-saffron-500/80 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group backdrop-blur-xs"
    >
      <div className="relative">
        <UploadCloud className="w-5 h-5 text-saffron-300 group-hover:-translate-y-0.5 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron-500"></span>
        </span>
      </div>
      <span className="text-xs sm:text-sm font-bold tracking-wide">
        Upload Exam PDF
      </span>
      <Sparkles className="w-3.5 h-3.5 text-gold-300 hidden sm:inline" />
    </button>
  );
};
