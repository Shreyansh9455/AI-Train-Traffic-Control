import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

/**
 * Class-based Error Boundary Component (Root & Section Level)
 * ─────────────────────────────────────────────────────────────────────────────
 * Catches any render-time JavaScript exceptions anywhere in the child tree,
 * logs full stack traces to the console, and displays a graceful control-room
 * styled fallback panel with recovery options.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [ErrorBoundary Caught Exception]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isFullScreen = this.props.fullScreen !== false;

      return (
        <div
          className={`${
            isFullScreen ? 'min-h-screen' : 'min-h-[300px]'
          } bg-panel-base flex items-center justify-center p-6 select-none`}
        >
          <div className="max-w-lg w-full bg-panel-card border border-rose-500/40 rounded-3xl p-8 shadow-2xl shadow-rose-950/50 text-center">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-rose-950/70 border border-rose-800/60 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-950/40">
              <AlertTriangle className="w-8 h-8 text-signal-red" />
            </div>

            {/* Error Header */}
            <h1 className="text-2xl font-extrabold text-ink-primary tracking-tight mb-2">
              Application Error Detected
            </h1>
            <p className="text-xs text-ink-secondary mb-6 leading-relaxed">
              An unexpected render-time exception occurred in the interface. The system has prevented a total crash.
            </p>

            {/* Error Message Snippet */}
            {this.state.error && (
              <div className="bg-panel-base/90 rounded-xl border border-panel-border p-4 text-left mb-6 text-xs font-mono text-rose-300 overflow-auto max-h-36">
                <span className="text-ink-muted text-[10px] uppercase block mb-1">Error Trace:</span>
                {this.state.error.toString()}
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-panel-surface border border-panel-border hover:border-panel-rail text-ink-secondary hover:text-ink-primary text-xs font-semibold font-mono transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Recovering</span>
              </button>

              <button
                onClick={this.handleReload}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-signal-red text-xs font-bold font-mono transition-all shadow-md shadow-rose-950/30 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
