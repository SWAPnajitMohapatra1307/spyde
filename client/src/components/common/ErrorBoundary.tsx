import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('SPYDE Uncaught UI Exception:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas text-bone flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-canvas-card border border-accent-red/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-red/15 border border-accent-red/30 flex items-center justify-center text-accent-red">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono uppercase text-accent-red font-bold tracking-wider">
                Shield Runtime Intercept
              </div>
              <h2 className="text-xl font-black text-bone">Application Interface Error</h2>
              <p className="text-xs text-bone-muted leading-relaxed">
                An unexpected exception was caught by the SPYDE UI boundary. State integrity has been preserved.
              </p>
              {this.state.error?.message && (
                <div className="p-3 rounded-xl bg-canvas border border-white/5 text-[11px] font-mono text-accent-red/90 break-words text-left">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3.5 px-5 rounded-xl bg-primary hover:bg-primary/90 text-canvas font-bold text-xs tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application Session</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}