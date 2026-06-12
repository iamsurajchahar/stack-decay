import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Something went wrong</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={this.handleRetry} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
