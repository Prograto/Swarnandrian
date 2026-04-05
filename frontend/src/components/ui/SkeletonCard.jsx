import React from 'react';

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-surface-card border border-theme rounded-2xl p-5 animate-pulse ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-2.5 bg-gray-100 dark:bg-slate-600 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded" />
        <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded w-5/6" />
        <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-surface-card border border-theme rounded-2xl overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-theme">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-theme last:border-0">
          {Array(cols).fill(0).map((_, j) => (
            <div key={j} className="flex-1 h-3 bg-gray-100 dark:bg-slate-700 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="bg-surface-card border border-theme rounded-2xl p-5 animate-pulse">
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-3" />
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
