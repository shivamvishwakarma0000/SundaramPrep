interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an unexpected issue while loading this content. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`bg-white dark:bg-dark-surface border border-red-200 dark:border-red-900/40 rounded-2xl p-8 sm:p-10 text-center shadow-subtle flex flex-col items-center justify-center max-w-md mx-auto transition-colors ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-dark-text tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-sm text-slate-600 dark:text-dark-muted leading-relaxed max-w-xs mb-6">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-brand-600 hover:bg-slate-800 dark:hover:bg-brand-700 active:scale-98 text-white font-semibold text-sm shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
