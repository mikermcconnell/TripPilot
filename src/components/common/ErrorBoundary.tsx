import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  resetError?: () => void;
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-500 mb-4">
          We encountered an unexpected error. Please try refreshing the page.
        </p>
        {error && (
          <details className="text-left bg-slate-100 rounded-lg p-4 mb-4">
            <summary className="font-bold text-sm text-slate-700 cursor-pointer">
              Error Details
            </summary>
            <pre className="text-xs text-red-600 mt-2 overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        {resetError && (
          <button
            onClick={resetError}
            className="btn-press px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 font-bold rounded-xl transition-all"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

export { DefaultErrorFallback as ErrorFallback };
