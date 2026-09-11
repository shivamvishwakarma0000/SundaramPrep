export function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`}
    />
  );
}

export function CardSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-5 shadow-subtle space-y-4 animate-pulse ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <SkeletonBox className="w-32 h-4" />
            <SkeletonBox className="w-20 h-3" />
          </div>
        </div>
        <SkeletonBox className="w-12 h-6 rounded-full" />
      </div>
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBox key={i} className={`h-3.5 rounded ${i === rows - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}

export function QuestionSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-6 sm:p-8 shadow-card space-y-6 animate-pulse">
      {/* Question metadata header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-20 h-6 rounded-full" />
          <SkeletonBox className="w-24 h-6 rounded-full" />
        </div>
        <SkeletonBox className="w-8 h-8 rounded-lg" />
      </div>

      {/* Question stem */}
      <div className="space-y-3 pt-2">
        <SkeletonBox className="w-full h-5" />
        <SkeletonBox className="w-11/12 h-5" />
        <SkeletonBox className="w-3/4 h-5" />
      </div>

      {/* Options */}
      <div className="space-y-3 pt-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-4 rounded-xl border border-cool-200 dark:border-dark-border bg-cool-50 dark:bg-dark-card"
          >
            <SkeletonBox className="w-7 h-7 rounded-full shrink-0" />
            <SkeletonBox className="w-4/5 h-4" />
          </div>
        ))}
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between pt-4 border-t border-cool-200 dark:border-dark-border">
        <SkeletonBox className="w-24 h-10 rounded-xl" />
        <SkeletonBox className="w-32 h-10 rounded-xl" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-surface border border-cool-200 dark:border-dark-border rounded-2xl p-6 shadow-subtle space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <SkeletonBox className="w-40 h-5" />
        <SkeletonBox className="w-20 h-4" />
      </div>
      <div className="flex items-end justify-between gap-3 h-48 pt-6">
        {[40, 75, 55, 90, 60, 85, 50].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div
              className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-lg transition-all"
              style={{ height: `${h}%` }}
            />
            <SkeletonBox className="w-8 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
