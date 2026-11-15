import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GeoScope ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-space-950 text-white p-6 font-mono">
          <div className="p-6 bg-red-950/60 border border-red-500/40 rounded-xl max-w-lg">
            <h2 className="text-lg font-bold text-red-400 mb-2">GEOSCOPE CRITICAL FAULT INTERCEPTED</h2>
            <p className="text-xs text-gray-300 mb-4 font-mono">{this.state.error?.message || String(this.state.error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded"
            >
              RELOAD MISSION CONTROL
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
