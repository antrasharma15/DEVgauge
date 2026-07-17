"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-zinc-200">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-red-500/20 bg-red-950/5 backdrop-blur-md flex flex-col gap-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto animate-pulse">
              <AlertOctagon className="w-7 h-7" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h1 className="text-lg font-bold text-zinc-100">Application Error Encountered</h1>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                An unexpected rendering exception was caught. We have safely isolated this crash to prevent further data corruption.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Application
              </button>

              <button
                onClick={this.toggleDetails}
                className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold py-1 transition-colors cursor-pointer"
              >
                {this.state.showDetails ? (
                  <>Hide Technical Logs <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Show Technical Logs <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            </div>

            {this.state.showDetails && (
              <div className="text-left rounded-xl bg-black/60 border border-zinc-900 p-4 font-mono text-[9px] text-red-400/80 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                <p className="font-bold text-red-400 mb-1">{this.state.error?.toString()}</p>
                <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
