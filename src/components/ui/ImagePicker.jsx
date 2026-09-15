import { useI18n } from "../../i18n";
import Icon from "./Icon";
import Button from "./Button";

/*
 * Pick a picture.
 *
 * Lifted out of ShopIdentityForm when the barber profile needed the same
 * thing. Both screens previously opened a modal that said "choose a photo"
 * and whose only button opened the file picker — a dialog between the tap and
 * the thing the tap already meant. The label below *is* the file input, so
 * there is one tap instead of three.
 */
export default function ImagePicker({
  label,
  hint,
  value,
  busy,
  onPick,
  onClear,
  aspect = "w-24 h-24 rounded-card"
}) {
  const { t } = useI18n();

  return (
    <div>
      {label ? (
        <p className="text-label uppercase text-content-muted mb-1.5">{label}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <div
          className={`${aspect} flex-shrink-0 overflow-hidden bg-surface-sunken border border-line-subtle flex items-center justify-center`}
        >
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon name="image" size={22} className="text-content-muted" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {hint ? <p className="text-caption text-content-muted mb-2">{hint}</p> : null}
          <div className="flex gap-2">
            <label className="press inline-flex items-center justify-center min-h-[44px] px-4 gap-2 rounded-control bg-surface-raised border border-line-strong text-body font-semibold text-content-primary cursor-pointer">
              <Icon name="camera" size={17} />
              {busy ? t("uploading") : value ? t("change") : t("upload")}
              <input type="file" accept="image/*" onChange={onPick} className="sr-only" />
            </label>
            {value ? (
              <Button variant="ghost" onClick={onClear}>
                {t("remove")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
