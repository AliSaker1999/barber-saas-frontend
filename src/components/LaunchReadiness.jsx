import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import Icon from "./ui/Icon";
import { Card, Pill, SectionHeader } from "./ui/Primitives";
import { InlineError, ListSkeleton } from "./ui/States";
import { useI18n } from "../i18n";

/*
 * Launch readiness.
 *
 * The pre-launch list from the product spec (§32) is only useful if someone
 * can actually check it, so this asks the running backend rather than relying
 * on memory: is the production database reachable, are verification codes
 * really being delivered, is image storage wired, is crash reporting on.
 *
 * Blocking items are the ones that make a public launch pointless — without
 * real SMS/WhatsApp delivery nobody outside the team can finish a first
 * booking — and they are separated from the merely recommended ones so the
 * list can't be misread as "seven things are broken".
 */
export default function LaunchReadiness() {
  const { t } = useI18n();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/health/launch")
      .then((res) => {
        if (!cancelled) setState({ loading: false, data: res.data?.data || null, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            loading: false,
            data: null,
            error: err?.friendlyMessage || t("launch_check_failed")
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t, reloadToken]);

  const recheck = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    setReloadToken((token) => token + 1);
  }, []);

  const { loading, data, error } = state;
  const blockers = data?.blockers?.length || 0;

  return (
    <section className="mb-6">
      <SectionHeader
        title={t("launch_readiness")}
        subtitle={t("launch_readiness_sub")}
        action={t("try_again")}
        onAction={recheck}
      />

      {loading ? (
        <ListSkeleton count={4} height="h-14" />
      ) : error ? (
        <InlineError message={error} onRetry={recheck} />
      ) : data ? (
        <Card padded={false}>
          <div className="flex items-center gap-3 p-4 border-b border-line-subtle">
            <span
              className={`w-10 h-10 rounded-control flex items-center justify-center flex-shrink-0 ${
                data.readyToLaunch
                  ? "bg-state-success-soft text-state-success"
                  : "bg-state-warning-soft text-state-warning"
              }`}
            >
              <Icon name={data.readyToLaunch ? "check" : "alert"} size={20} strokeWidth={2.25} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-body font-bold text-content-primary">
                {data.readyToLaunch ? t("launch_ready") : t("launch_blocked", { n: blockers })}
              </p>
              <p className="text-caption text-content-muted tnum">{data.environment}</p>
            </div>
          </div>

          <ul className="divide-y divide-line-subtle">
            {data.checks.map((check) => (
              <li key={check.key} className="flex items-start gap-3 p-4">
                <span
                  className={`w-6 h-6 rounded-pill flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    check.ok
                      ? "bg-state-success-soft text-state-success"
                      : check.blocking
                      ? "bg-state-danger-soft text-state-danger"
                      : "bg-surface-sunken text-content-muted"
                  }`}
                >
                  <Icon
                    name={check.ok ? "check" : check.blocking ? "x" : "minus"}
                    size={13}
                    strokeWidth={2.75}
                  />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-body-sm font-semibold text-content-primary">{check.label}</p>
                    {!check.ok ? (
                      <Pill tone={check.blocking ? "danger" : "neutral"}>
                        {check.blocking ? t("launch_blocking") : t("launch_recommended")}
                      </Pill>
                    ) : null}
                  </div>
                  {check.detail && !check.ok ? (
                    <p className="mt-0.5 text-caption text-content-secondary">{check.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </section>
  );
}
