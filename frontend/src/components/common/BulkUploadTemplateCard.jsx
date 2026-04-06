import React from 'react';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';

export default function BulkUploadTemplateCard({
  title,
  description,
  columns = [],
  notes = [],
  onDownload,
  downloadLabel = 'Download template',
  formatLabel = 'Excel (.xlsx)',
  className = '',
}) {
  return (
    <div className={`rounded-2xl border border-dashed border-theme bg-surface-card/80 p-4 ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{title}</p>
          <p className="text-xs text-secondary mt-0.5">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="badge badge-medium text-[11px]">{formatLabel}</span>
          <button
            type="button"
            onClick={onDownload}
            className="btn btn-secondary btn-sm inline-flex items-center gap-1"
            disabled={!onDownload}
          >
            <DownloadRoundedIcon sx={{ fontSize: 14 }} />
            {downloadLabel}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-surface-lighter border border-theme p-3">
        <p className="text-xs font-semibold text-primary mb-1">Header example</p>
        <p className="text-[11px] font-mono text-secondary break-words leading-5">
          {columns.join(' | ')}
        </p>
      </div>

      {notes.length > 0 && (
        <div className="mt-3 rounded-2xl bg-surface-lighter border border-theme p-3 space-y-1">
          {notes.map((note) => (
            <p key={note} className="text-[11px] leading-5 text-secondary">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}