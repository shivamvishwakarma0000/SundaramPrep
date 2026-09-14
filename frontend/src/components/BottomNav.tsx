import React from 'react';
import { Home, Zap, UploadCloud, TrendingUp, Newspaper, User } from 'lucide-react';
import type { PortalTab } from '../types';

interface BottomNavProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: PortalTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'practice', label: 'Practice', icon: Zap },
    { id: 'upload', label: 'Upload', icon: UploadCloud },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-dark-surface/95 backdrop-blur border-t border-cool-200 dark:border-dark-border py-1 px-1 pb-safe md:hidden shadow-lg dark:shadow-dark-card transition-colors">
      <div className="flex items-center justify-around w-full max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer min-h-[48px] ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-500 dark:text-dark-muted font-medium hover:text-slate-800 dark:hover:text-dark-text'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 scale-105'
                    : 'text-slate-500 dark:text-dark-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[9px] xs:text-[10px] mt-0.5 tracking-tight whitespace-nowrap leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

