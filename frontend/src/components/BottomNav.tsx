import React from 'react';
import { Home, Zap, UploadCloud, TrendingUp, Sparkles, User } from 'lucide-react';
import type { PortalTab } from '../types';

interface BottomNavProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: PortalTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'practice', label: 'Practice', icon: Zap },
    { id: 'upload', label: 'Upload', icon: UploadCloud },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'ai', label: 'AI', icon: Sparkles },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-dark-surface/95 backdrop-blur border-t border-cool-200 dark:border-dark-border py-1.5 px-2 pb-safe md:hidden shadow-lg dark:shadow-dark-card transition-colors">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-dark-muted font-medium hover:text-slate-800 dark:hover:text-dark-text'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 dark:text-dark-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

