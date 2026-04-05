import React from 'react';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8 text-center bg-surface text-primary">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <WarningAmberRoundedIcon className="text-red-500" sx={{ fontSize: 28 }} />
          </div>
          <div>
            <p className="text-base font-semibold text-primary">Something went wrong</p>
            <p className="text-sm text-secondary mt-1">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium transition-colors hover:brightness-110"
          >
            <RefreshRoundedIcon sx={{ fontSize: 16 }} />
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
