import { Component } from "react";
import { captureException } from "../core/monitoring/sentry";

/*
 * The last thing standing when a render throws.
 *
 * Deliberately plain: no hooks, no i18n, no design-system imports. Whatever
 * broke may well be one of those, and a crash screen that can itself crash is
 * worse than none. The colours are the semantic tokens, which are plain CSS
 * variables, so this stays theme-aware without importing anything.
 *
 * The emoji it used to lead with is gone — the spec bans them, and a bouncing
 * pair of scissors is a strange thing to meet at the moment the app fails.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info?.componentStack);
    captureException(error, { componentStack: info?.componentStack });
  }

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-h2 text-content-primary mb-2">Something went wrong</h1>
          <p className="text-body-sm text-content-secondary mb-6">
            The app hit an unexpected error. Reloading usually fixes it, and nothing you
            have saved is lost.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="press min-h-[44px] px-6 rounded-control bg-brand-gold text-content-on-gold font-semibold text-body-sm"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
