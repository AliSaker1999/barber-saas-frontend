import { useCallback, useMemo, useState } from "react";
import LaunchReadiness from "../../components/LaunchReadiness";

const recommendedVariables = [
  {
    key: "VITE_API_URL",
    label: "HTTP API URL",
    description: "The base URL that the web client uses to reach the backend REST and GraphQL APIs.",
    example: "https://barber-saas-backend-l4iz.onrender.com/api"
  },
  {
    key: "VITE_WS_URL",
    label: "WebSocket URL",
    description: "The endpoint used by the Socket.IO client for live queue/notification updates",
    example: "https://barber-saas-backend-l4iz.onrender.com"
  }
];

const showKeys = new Set(["MODE", "BASE_URL", "DEV", "PROD"]);

/*
 * Platform staff tooling, and specifically a developer tool — deliberately
 * English-only, see REDESIGN.md.
 */
export default function EnvPage() {
  const [copyMessage, setCopyMessage] = useState("");

  const visibleEnv = useMemo(() => {
    const entries = [];
    Object.entries(import.meta.env).forEach(([key, value]) => {
      if (key.startsWith("VITE_") || showKeys.has(key)) {
        entries.push({ key, value });
      }
    });

    recommendedVariables.forEach(item => {
      if (!entries.find(entry => entry.key === item.key)) {
        entries.push({ key: item.key, value: undefined });
      }
    });

    return entries.sort((a, b) => a.key.localeCompare(b.key));
  }, []);

  const snippet = useMemo(() => {
    return recommendedVariables
      .map(item => `${item.key}=${import.meta.env[item.key] || item.example}`)
      .join("\n");
  }, []);

  const handleCopySnippet = useCallback(async () => {
    if (!navigator?.clipboard) {
      setCopyMessage("Clipboard not available");
      return;
    }
    try {
      await navigator.clipboard.writeText(`# Copy to .env.local\n${snippet}`);
      setCopyMessage("Copied! Paste into .env.local");
      setTimeout(() => setCopyMessage(""), 2500);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setCopyMessage("Unable to copy");
    }
  }, [snippet]);

  return (
    <div className="min-h-screen bg-surface-base py-8">
      <div className="max-w-5xl mx-auto space-y-6 px-4">
        {/* What actually blocks a public launch, checked against the live
            backend rather than a checklist someone has to remember. */}
        <LaunchReadiness />

        <div className="bg-surface-raised rounded-card border border-line-subtle p-8 space-y-4">
          <h1 className="text-3xl font-black text-content-primary">.env / Environment</h1>
          <p className="text-content-muted">
            The values below reflect what Vite exposes to the client build. Copy the snippet into a <span className="font-mono text-sm">.env.local</span> file at the project root, then restart the dev server for changes to take effect.
          </p>
          <p className="text-sm text-content-muted">
            We encourage sourcing the URLs from environment variables so you can target staging, QA, or preview deployments without a code change.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {recommendedVariables.map(item => {
            const value = import.meta.env[item.key];
            return (
              <div key={item.key} className="bg-surface-raised rounded-control border border-line-subtle p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-content-muted">{item.label}</p>
                    <p className="text-xs text-content-muted">{item.key}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${value ? "bg-surface-sunken text-brand-gold-text" : "bg-surface-sunken text-content-muted"}`}>
                    {value ? "Configured" : "Default"}
                  </span>
                </div>
                <p className="text-sm text-content-primary min-h-[3rem]">{item.description}</p>
                <div className="text-sm font-mono text-content-primary bg-surface-sunken rounded-control px-3 py-2 border border-dashed border-line-subtle">
                  {value || item.example}
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-surface-raised rounded-card border border-line-subtle p-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-content-primary">Sample .env.local</h2>
              <p className="text-sm text-content-muted">Paste this into <span className="font-mono">.env.local</span> or edit <span className="font-mono">.env</span> for build-time values.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* The status used to replace the button's own label, so the
                  control lost its name and the outcome was never announced. */}
              <span role="status" className="text-caption text-content-muted">
                {copyMessage}
              </span>
              <button
                onClick={handleCopySnippet}
                className="press min-h-[44px] px-4 bg-brand-gold text-content-on-gold font-semibold rounded-control text-body-sm"
              >
                Copy snippet
              </button>
            </div>
          </div>
          <pre className="bg-surface-sunken text-xs text-content-primary rounded-control p-4 font-mono overflow-x-auto">
{`# Auto-generated by the platform view\n${snippet}`}
          </pre>
          <p className="text-xs text-content-muted">Restart the Vite dev server after editing the file so the CLI picks up the new values.</p>
        </div>
        <div className="bg-surface-raised rounded-card border border-line-subtle">
          <div className="px-6 py-4 border-b border-line-subtle flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-content-primary">Exposed environment variables</h3>
              <p className="text-sm text-content-muted">These are the keys currently available via <span className="font-mono">import.meta.env</span>.</p>
            </div>
          </div>
          <div className="divide-y divide-line-subtle">
            {visibleEnv.length === 0 && (
              <div className="p-6 text-sm text-content-muted">No custom variables have been defined yet.</div>
            )}
            {visibleEnv.map(entry => (
              <div key={entry.key} className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-content-primary break-all">{entry.key}</p>
                  <p className="text-xs text-content-muted">{entry.key === "MODE" ? "Build mode" : ""}</p>
                </div>
                <div className="text-sm font-mono text-content-muted break-all">
                  {entry.value ?? "(not set)"}
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 text-xs text-content-muted border-t border-line-subtle">
            Environment variables are baked into the build. Changing values requires restarting the dev server or rebuilding the project for production deployments.
          </div>
        </div>
      </div>
    </div>
  );
}