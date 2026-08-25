import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-4">✂️</div>
          <h1 className="text-xl font-black text-app-text mb-2">Something went wrong</h1>
          <p className="text-sm text-app-muted mb-6">
            The app hit an unexpected error. Reloading usually fixes it — your data is safe.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-6 py-3 rounded-xl bg-app-accent text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
