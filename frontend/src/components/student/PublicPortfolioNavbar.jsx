import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

export default function PublicPortfolioNavbar() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-theme bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F7CF3] to-[#7C8CFF] text-white shadow-[0_12px_30px_rgba(79,124,243,0.24)]">
            <img src="/logo.png" alt="Swarnandrian" className="h-7 w-7 rounded-xl object-cover" />
          </div>
          <div>
            <p className="font-bold text-primary leading-tight">Swarnandrian</p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-secondary leading-tight">Public Portfolio</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-2xl border border-theme bg-surface-card px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-lighter hover:text-primary"
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
          Back
        </button>
      </div>
    </header>
  );
}