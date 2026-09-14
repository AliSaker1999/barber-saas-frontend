import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchOperatingHours,
  saveOperatingHours
} from "../../features/company/companySlice";
import Button from "../ui/Button";
import { InlineError, ListSkeleton } from "../ui/States";
import WeekHoursEditor from "./WeekHoursEditor";
import { weekFromShopHours, shopHoursFromWeek, invalidDays, emptyWeek } from "./weekHours";

/*
 * The shop's own opening hours.
 *
 * Optional, and the copy says so: with no TenantOperatingHours rows, shop
 * discovery derives open/closed from the barbers' rotas instead — which is what
 * most shops rely on today without knowing it.
 *
 * Lifted out of Settings so the wizard and the Settings screen render the same
 * component. The endpoint replaces the whole week in one transaction, so this
 * always sends seven days.
 */
export default function ShopHoursEditor({ onProgress }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const tenantId = useAppSelector((state) => state.auth.user?.tenantId);
  const { operatingHours, hoursLoading, hoursError } = useAppSelector((state) => state.company);

  const [draft, setDraft] = useState(() => emptyWeek(true));
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tenantId) dispatch(fetchOperatingHours(tenantId));
  }, [dispatch, tenantId]);

  /* Derived in render, not in an effect — see BarberHoursEditor for why. */
  if (!hydrated && !hoursLoading && operatingHours?.length) {
    setDraft(weekFromShopHours(operatingHours));
    setHydrated(true);
  }

  const bad = invalidDays(draft);

  async function save() {
    setError("");
    if (bad.length) return;

    setSaving(true);
    try {
      await dispatch(saveOperatingHours(shopHoursFromWeek(draft))).unwrap();
      setSaved(true);
      onProgress?.();
    } catch (err) {
      setError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  }

  if (hoursLoading && !operatingHours?.length) return <ListSkeleton count={4} height="h-16" />;

  return (
    <div className="space-y-3">
      <WeekHoursEditor
        value={draft}
        onChange={(next) => {
          setDraft(next);
          setSaved(false);
        }}
        disabled={saving}
      />

      {error || hoursError ? <InlineError message={error || hoursError} /> : null}

      <Button block onClick={save} loading={saving} disabled={bad.length > 0}>
        {saved ? t("saved") : t("save_hours")}
      </Button>
    </div>
  );
}
