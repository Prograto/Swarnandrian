import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

export default function PublicPortfolioNavbar() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-theme bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:pr-8">
        <Link to="/" className="flex items-center gap-3 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-transparent">
            <img src="/logo.png" alt="Swarnandrian" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="font-bold text-primary leading-tight">Swarnandrian</p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-secondary leading-tight">Public Portfolio</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-2xl bg-surface-card px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-lighter hover:text-primary focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
          Back
        </button>
      </div>
    </header>
  );
}