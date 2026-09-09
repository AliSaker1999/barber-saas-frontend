import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { IconButton } from "./Button";
import { useI18n } from "../../i18n";

/*
 * TopBar — one row, one title, at most two trailing actions.
 *
 * `back` renders a chevron that mirrors in Arabic. `transparent` is for screens
 * whose hero photograph runs under the bar (the shop profile), where the bar
 * only gains a background once the page is scrolled.
 */
export default function TopBar({
  title,
  subtitle,
  back = false,
  onBack,
  actions,
  transparent = false,
  sticky = true,
  center = false,
  className = ""
}) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <header
      className={[
        sticky ? "sticky top-0 z-40" : "",
        transparent
          ? "bg-transparent"
          : "bg-surface-base/95 backdrop-blur-lg border-b border-line-subtle",
        "pt-[env(safe-area-inset-top)]",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-1 h-14 px-2">
        {back ? (
          <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            aria-label={t("back")}
            className={`tap-target flex items-center justify-center rounded-control flex-shrink-0 ${
              transparent
                ? "bg-surface-raised/90 backdrop-blur text-content-primary shadow-sm"
                : "text-content-primary hover:bg-surface-sunken"
            }`}
          >
            <Icon name="chevron-left" size={22} />
          </button>
        ) : (
          <span className="w-2" />
        )}

        <div className={`flex-1 min-w-0 px-1 ${center ? "text-center" : ""}`}>
          {title ? (
            <h1 className="text-h3 text-content-primary truncate">{title}</h1>
          ) : null}
          {subtitle ? (
            <p className="text-caption text-content-muted truncate">{subtitle}</p>
          ) : null}
        </div>

        {actions ? <div className="flex items-center gap-0.5 flex-shrink-0">{actions}</div> : <span className="w-2" />}
      </div>
    </header>
  );
}

export { IconButton };
