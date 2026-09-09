import Icon from "./Icon";
import { Pill } from "./Primitives";
import { formatWaitRange } from "../../utils/format";
import { QUEUE_STATUS, queueHeadline, queueStage } from "../../utils/queueStatus";
import { useI18n } from "../../i18n";

/*
 * Queue status, in two sizes.
 *
 * Queue visibility is the product's differentiator, so the numbers are the
 * design: a very large tabular position, an honest wait *range* underneath,
 * and a four-step progress line so "where am I in this process" needs no
 * explanation.
 *
 * Status ids come from the backend Queue table:
 *   1 WAITING   2 IN_PROGRESS   6 AWAITING_PAYMENT   7 PENDING_APPROVAL
 */

/* ---------------------------------------------------------------------------
   Compact — the Home-screen hero when the customer is in a queue.
   ------------------------------------------------------------------------- */
export function QueueStatusBanner({ queue, onTrack }) {
  const { t } = useI18n();
  const headline = queueHeadline(queue, t);
  if (!headline) return null;

  const position = Number(queue.position ?? 0);
  const showNumber = headline.key === "waiting";

  return (
    <button
      type="button"
      onClick={onTrack}
      className="press w-full text-start bg-surface-inverse rounded-card p-4 flex items-center gap-4"
    >
      <span className="flex-shrink-0 w-16 h-16 rounded-card bg-brand-gold text-content-on-gold flex flex-col items-center justify-center">
        {showNumber ? (
          <>
            <span className="text-[26px] leading-none font-extrabold tnum">{position}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
              {t("in_line_short")}
            </span>
          </>
        ) : (
          <Icon name="scissors" size={26} />
        )}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-label uppercase text-content-inverse/60">
          {queue.tenantName}
        </span>
        <span className="block text-h3 text-content-inverse mt-0.5 truncate">{headline.title}</span>
        <span className="block text-body-sm text-content-inverse/70 tnum truncate">
          {headline.sub}
        </span>
      </span>

      <Icon name="chevron-right" size={20} className="text-content-inverse/60 flex-shrink-0" />
    </button>
  );
}

/* ---------------------------------------------------------------------------
   Full — the live queue tracker screen's centrepiece.
   ------------------------------------------------------------------------- */
export function QueueStatusHero({ queue, stale = false }) {
  const { t } = useI18n();
  const headline = queueHeadline(queue, t);
  if (!headline) return null;

  const position = Number(queue.position ?? 0);
  const showNumber = headline.key === "waiting";

  return (
    <div className="text-center py-6">
      {showNumber ? (
        <>
          <p className="text-label uppercase text-content-muted">{t("your_position")}</p>
          <div className="mt-2 flex items-baseline justify-center gap-1.5">
            <span className="text-content-muted text-h1 font-semibold">#</span>
            <span className="text-[76px] leading-none font-extrabold text-content-primary tnum">
              {position}
            </span>
          </div>
          <p className="mt-3 text-h2 text-brand-gold-text tnum">{formatWaitRange(queue.waitTime, t)}</p>
        </>
      ) : (
        <>
          <span
            className={`inline-flex w-20 h-20 rounded-pill items-center justify-center mb-4 ${
              headline.tone === "success"
                ? "bg-state-success-soft text-state-success"
                : "bg-state-warning-soft text-state-warning"
            }`}
          >
            <Icon name={headline.key === "serving" ? "scissors" : "clock"} size={34} />
          </span>
          <h2 className="text-display text-content-primary">{headline.title}</h2>
          <p className="mt-2 text-body text-content-secondary max-w-[30ch] mx-auto">{headline.sub}</p>
        </>
      )}

      {stale ? (
        <div className="mt-4 flex justify-center">
          <Pill tone="warning" icon="wifi-off">
            {t("queue_not_live")}
          </Pill>
        </div>
      ) : (
        <p className="mt-4 text-caption text-content-muted">{t("queue_updates_live")}</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Progress — Joined → Almost your turn → Your turn → In the chair.
   ------------------------------------------------------------------------- */
export function QueueProgress({ queue }) {
  const { t } = useI18n();

  const stage = queueStage(queue);

  const steps = [
    { label: t("queue_step_joined"), icon: "check" },
    { label: t("queue_step_close"), icon: "users" },
    { label: t("queue_step_turn"), icon: "bell" },
    { label: t("queue_step_service"), icon: "scissors" }
  ];

  return (
    <ol className="flex items-start gap-1" aria-label={t("queue_progress")}>
      {steps.map((step, index) => {
        const done = index < stage;
        const current = index === stage;

        return (
          <li key={step.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-full flex items-center gap-1">
              {/* Connector on the leading side of every step but the first. */}
              <span
                aria-hidden="true"
                className={`h-[2px] flex-1 rounded-pill ${
                  index === 0 ? "opacity-0" : done || current ? "bg-brand-gold" : "bg-line-subtle"
                }`}
              />
              <span
                className={`w-7 h-7 rounded-pill flex items-center justify-center flex-shrink-0 border-2 ${
                  done
                    ? "bg-brand-gold border-brand-gold text-content-on-gold"
                    : current
                    ? "bg-surface-raised border-brand-gold text-brand-gold-text"
                    : "bg-surface-raised border-line-subtle text-content-muted"
                }`}
              >
                <Icon name={step.icon} size={14} strokeWidth={2.25} />
              </span>
              <span
                aria-hidden="true"
                className={`h-[2px] flex-1 rounded-pill ${
                  index === steps.length - 1 ? "opacity-0" : done ? "bg-brand-gold" : "bg-line-subtle"
                }`}
              />
            </div>
            <span
              className={`text-[10.5px] leading-tight text-center ${
                current ? "font-bold text-content-primary" : "text-content-muted"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
