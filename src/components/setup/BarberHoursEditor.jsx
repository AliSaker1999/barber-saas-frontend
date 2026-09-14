import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchWorkingHours,
  saveWeeklyWorkingHours
} from "../../features/workingHours/workingHoursSlice";
import Button from "../ui/Button";
import { InlineError, ListSkeleton } from "../ui/States";
import WeekHoursEditor from "./WeekHoursEditor";
import { weekFromBarberHours, barberDaysFromWeek, invalidDays, emptyWeek } from "./weekHours";

/*
 * One barber's week.
 *
 * The draft is derived during render rather than set in an effect — the old
 * screen did `useEffect(() => setDraft(hours))`, which is now an eslint error
 * (`react-hooks/set-state-in-effect`) and, more practically, meant the form
 * fought the server on every refetch.
 *
 * `hydratedFor` keys the draft to the barber it belongs to, so switching
 * barbers re-derives instead of showing the previous person's rota.
 */
export default function BarberHoursEditor({ barberId, onProgress }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const serverDays = useAppSelector((state) => state.workingHours.byBarber[barberId]);
  const loading = useAppSelector((state) => state.workingHours.loading);

  const [draft, setDraft] = useState(() => emptyWeek(false));
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (barberId) dispatch(fetchWorkingHours(barberId));
  }, [dispatch, barberId]);

  /* Render-phase derive: legal, and the pattern the migrated Settings screen
     already uses. It runs once per barber, not on every render. */
  if (serverDays && hydratedFor !== barberId) {
    setDraft(weekFromBarberHours(serverDays));
    setHydratedFor(barberId);
    setSaved(false);
  }

  const bad = invalidDays(draft);
  const worksAnyDay = draft.some((day) => day.active);

  async function save() {
    setError("");
    if (bad.length) return;

    setSaving(true);
    try {
      await dispatch(
        saveWeeklyWorkingHours({ barberId, days: barberDaysFromWeek(draft) })
      ).unwrap();
      setSaved(true);
      onProgress?.();
    } catch (err) {
      setError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !serverDays) return <ListSkeleton count={4} height="h-16" />;

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

      {!worksAnyDay ? (
        <p className="text-body-sm text-content-secondary">{t("rota_no_days_warning")}</p>
      ) : null}

      {error ? <InlineError message={error} /> : null}

      <Button block onClick={save} loading={saving} disabled={bad.length > 0}>
        {saved ? t("saved") : t("save_hours")}
      </Button>
    </div>
  );
}
