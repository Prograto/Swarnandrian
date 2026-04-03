import React from 'react';

export default function PaginationControls({ page, total, limit, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-theme bg-surface-card px-4 py-3">
      <p className="text-xs text-secondary">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn-secondary text-xs disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn-secondary text-xs disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
