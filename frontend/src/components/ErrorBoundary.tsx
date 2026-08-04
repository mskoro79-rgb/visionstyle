import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon, RefreshCcw } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/** Phase 13 — catches render-time errors in a subtree so one broken page
 * section (e.g. a malformed chart response) doesn't blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <GlassCard className="text-center py-16 my-8" glow="crimson">
          <AlertOctagon className="h-12 w-12 mx-auto text-crimson-400 mb-4" />
          <p className="text-white/70 mb-2">{this.props.fallbackLabel ?? "Something went wrong rendering this section."}</p>
          {this.state.message && <p className="text-white/40 text-xs mb-6 font-mono">{this.state.message}</p>}
          <Button variant="secondary" onClick={this.handleReset}>
            <RefreshCcw className="h-4 w-4" /> Try Again
          </Button>
        </GlassCard>
      );
    }
    return this.props.children;
  }
}
