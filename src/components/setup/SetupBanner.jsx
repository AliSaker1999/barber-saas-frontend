import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchSetupStatus } from "../../features/setup/setupSlice";
import Icon from "../ui/Icon";

/*
 * "Two steps left before customers can book."
 *
 * Offered, never imposed. An owner who opens the app at 9am with three people
 * waiting must land on Today and be able to work — so this is one dismissible
 * line above the day's numbers, not a redirect into a wizard.
 *
 * Dismissal is per shop and per device, in localStorage: it is a preference
 * about this banner, not a claim that the setup is finished, and the row in
 * the More sheet stays there either way.
 */
const DISMISS_KEY = "ajmal_setup_banner_dismissed";

function isDismissed(tenantId) {
  try {
    return localStorage.getItem(`${DISMISS_KEY}:${tenantId}`) === "1";
  } catch {
    return false;
  }
}

export default function SetupBanner() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const tenantId = useAppSelector((state) => state.auth.user?.tenantId);
  const status = useAppSelector((state) => state.setup.status);

  const [dismissed, setDismissed] = useState(() => isDismissed(tenantId));

  useEffect(() => {
    dispatch(fetchSetupStatus());
  }, [dispatch]);

  const blockers = status?.blockers?.length || 0;
  if (!status || status.ready || !blockers || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(`${DISMISS_KEY}:${tenantId}`, "1");
    } catch {
      /* Private mode, or site data blocked — the banner just comes back. */
    }
  };

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 p-3 rounded-card bg-brand-gold-soft border border-brand-gold">
      <Icon name="alert" size={18} className="flex-shrink-0 text-brand-gold-text" />

      <Link to="/company/setup" className="flex-1 min-w-0">
        <span className="block text-body-sm font-bold text-content-primary">
          {t("setup_steps_left", { n: blockers })}
        </span>
        <span className="block text-caption text-content-secondary">
          {t("setup_banner_sub")}
        </span>
      </Link>

      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="w-11 h-11 flex items-center justify-center rounded-control text-content-muted flex-shrink-0"
      >
        <Icon name="x" size={17} />
      </button>
    </div>
  );
}
