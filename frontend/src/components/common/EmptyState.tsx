import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  emoji?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  emoji = '🎯',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return <span>{emoji}</span>;
    if (React.isValidElement(icon)) {
      return icon;
    }
    try {
      const IconComponent = icon as any;
      return <IconComponent className="w-7 h-7 text-royal-600 dark:text-royal-400" />;
    } catch {
      return <span>{emoji}</span>;
    }
  };

  return (
    <div
      className={`bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-8 sm:p-12 text-center shadow-subtle flex flex-col items-center justify-center max-w-lg mx-auto transition-colors ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-100 dark:border-brand-900/40 flex items-center justify-center text-3xl mb-4 shadow-xs">
        {renderIcon()}
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-dark-text tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-sm text-slate-600 dark:text-dark-muted leading-relaxed max-w-sm mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-semibold text-sm shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-dark-surface cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
