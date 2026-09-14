import Icon from "../ui/Icon";
import { Card, Pill } from "../ui/Primitives";
import { useI18n } from "../../i18n";
import { STEP_FOR_CHECK } from "./setupSteps";

/*
 * What is left before customers can book.
 *
 * Modelled on LaunchReadiness, which does the same job for the platform — with
 * one difference that matters: that one renders `check.label` straight from the
 * server. Fine for a SUPER_ADMIN console, useless to a shop owner reading the
 * app in Arabic, so this endpoint sends keys and the translation happens here.
 *
 * `onStep` makes each row a shortcut into the wizard at that step. Without it
 * the list is read-only, which is what the final "you're ready" screen wants.
 */

export default function SetupChecklist({ status, onStep, className = "" }) {
  const { t } = useI18n();
  if (!status) return null;

  const blockers = status.blockers?.length || 0;

  return (
    <Card padded={false} className={className}>
      <div className="flex items-center gap-3 p-4 border-b border-line-subtle">
        <span
          className={`w-10 h-10 rounded-control flex items-center justify-center flex-shrink-0 ${
            status.ready
              ? "bg-state-success-soft text-state-success"
              : "bg-state-warning-soft text-state-warning"
          }`}
        >
          <Icon name={status.ready ? "check" : "alert"} size={20} strokeWidth={2.25} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-body font-bold text-content-primary">
            {status.ready ? t("setup_ready_title") : t("setup_steps_left", { n: blockers })}
          </p>
          <p className="text-caption text-content-muted">
            {status.ready ? t("setup_ready_sub") : t("setup_steps_left_sub")}
          </p>
        </div>
      </div>

      {/* IsActive is the one thing in shop discovery an owner cannot change, so
          it is explained rather than offered as a task. */}
      {status.isLive === false ? (
        <p className="px-4 py-3 text-body-sm text-state-danger border-b border-line-subtle">
          {t("setup_paused")}
        </p>
      ) : null}

      <ul className="divide-y divide-line-subtle">
        {status.checks.map((check) => {
          const body = (
            <>
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

              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-sm font-semibold text-content-primary">
                    {t(`setup_check_${check.key}`)}
                  </span>
                  {!check.ok ? (
                    <Pill tone={check.blocking ? "danger" : "neutral"}>
                      {check.blocking ? t("setup_required") : t("setup_optional")}
                    </Pill>
                  ) : null}
                </span>

                <span className="block mt-0.5 text-caption text-content-secondary">
                  {checkDetail(check, t)}
                </span>
              </span>

              {onStep && !check.ok ? (
                <Icon name="chevron-right" size={16} className="flex-shrink-0 text-content-muted mt-1" />
              ) : null}
            </>
          );

          return (
            <li key={check.key}>
              {onStep && !check.ok ? (
                <button
                  type="button"
                  onClick={() => onStep(STEP_FOR_CHECK[check.key])}
                  className="w-full flex items-start gap-3 p-4 text-start min-h-[44px]"
                >
                  {body}
                </button>
              ) : (
                <div className="flex items-start gap-3 p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/*
 * The sentence under each row.
 *
 * "Bookable" is the one that has to explain itself: it is the only check whose
 * failure an owner can look at their own shop and disagree with, because they
 * have barbers and they have services — just not joined up.
 */
function checkDetail(check, t) {
  if (check.key === "bookable") {
    if (check.ok) return t("setup_detail_bookable_ok", { n: check.count });
    if (check.detail?.missingServices) {
      return t("setup_detail_missing_services", { n: check.detail.missingServices });
    }
    if (check.detail?.missingHours) {
      return t("setup_detail_missing_hours", { n: check.detail.missingHours });
    }
    return t("setup_detail_bookable_none");
  }

  if (typeof check.count === "number") {
    return check.ok
      ? t(`setup_detail_${check.key}_ok`, { n: check.count })
      : t(`setup_detail_${check.key}_none`);
  }

  return check.ok ? t(`setup_detail_${check.key}_ok`) : t(`setup_detail_${check.key}_none`);
}
