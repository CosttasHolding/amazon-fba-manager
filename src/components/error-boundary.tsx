"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function DefaultFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { locale } = useLocale();
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t("error.something_went_wrong", locale)}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("error.unexpected_error", locale)}
        </p>
        {error && (
          <details className="mb-6 text-start">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              {t("error.view_details", locale)}
            </summary>
            <pre className="mt-2 p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {t("error.retry", locale)}
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {t("error.go_to_dashboard", locale)}
          </a>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
