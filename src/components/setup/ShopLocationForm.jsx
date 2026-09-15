import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchCompanyProfile,
  updateCompanyProfile
} from "../../features/company/companySlice";
import { requestUserLocation } from "../../features/location/locationSlice";
import Button from "../ui/Button";
import Field from "../ui/Field";
import { InlineError } from "../ui/States";

/*
 * Where the shop actually is.
 *
 * City and area live in ShopIdentityForm because a listing is useless without
 * them; the rest of the address is here because it only matters once someone
 * is on their way. The coordinates are the part that does real work — Explore
 * sorts by distance from them — which is why getting them wrong is worth
 * catching before the server does. A latitude of 3389.37 is a typo, not a
 * shop, and the only symptom would be a shop that never appears near anyone.
 */
export default function ShopLocationForm() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const profile = useAppSelector((state) => state.company.profile);

  const [draft, setDraft] = useState(null);
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  if (profile && hydratedFor !== profile.Id) {
    setDraft({
      street: profile.Street || "",
      building: profile.Building || "",
      floor: profile.Floor || "",
      googleMapLink: profile.GoogleMapLink || "",
      latitude: profile.Latitude ?? "",
      longitude: profile.Longitude ?? ""
    });
    setHydratedFor(profile.Id);
  }

  if (!draft) return null;

  const set = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  async function useMyLocation() {
    setLocating(true);
    setError("");
    try {
      const coords = await dispatch(requestUserLocation()).unwrap();
      set({
        latitude: coords.latitude.toFixed(6),
        longitude: coords.longitude.toFixed(6)
      });
    } catch {
      /* A denied permission is the common case and is not something the owner
         needs to fix — they can still type the numbers. */
      setError(t("location_unavailable"));
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    setError("");

    const hasLat = String(draft.latitude).trim() !== "";
    const hasLng = String(draft.longitude).trim() !== "";
    const lat = hasLat ? Number(draft.latitude) : null;
    const lng = hasLng ? Number(draft.longitude) : null;

    /* One without the other is not a location, and the distance sort would
       silently skip the shop rather than say so. */
    if (hasLat !== hasLng) {
      setError(t("coords_need_both"));
      return;
    }
    if (hasLat && (!Number.isFinite(lat) || Math.abs(lat) > 90)) {
      setError(t("latitude_out_of_range"));
      return;
    }
    if (hasLng && (!Number.isFinite(lng) || Math.abs(lng) > 180)) {
      setError(t("longitude_out_of_range"));
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateCompanyProfile({
          street: draft.street.trim(),
          building: draft.building.trim(),
          floor: draft.floor.trim(),
          googleMapLink: draft.googleMapLink.trim(),
          latitude: lat,
          longitude: lng
        })
      ).unwrap();
      await dispatch(fetchCompanyProfile());
      setSaved(true);
    } catch (err) {
      setError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field
        label={t("street")}
        optional
        optionalLabel={t("optional")}
        value={draft.street}
        onChange={(event) => set({ street: event.target.value })}
      />
      <div className="flex gap-3">
        <Field
          className="flex-1"
          label={t("building")}
          optional
          optionalLabel={t("optional")}
          value={draft.building}
          onChange={(event) => set({ building: event.target.value })}
        />
        <Field
          className="flex-1"
          label={t("floor")}
          optional
          optionalLabel={t("optional")}
          value={draft.floor}
          onChange={(event) => set({ floor: event.target.value })}
        />
      </div>
      <Field
        label={t("map_link")}
        optional
        optionalLabel={t("optional")}
        value={draft.googleMapLink}
        onChange={(event) => set({ googleMapLink: event.target.value })}
        type="url"
        dir="ltr"
        placeholder="https://maps.app.goo.gl/"
        hint={t("map_link_hint")}
      />

      <div>
        <p className="text-label uppercase text-content-muted mb-1.5">
          {t("coordinates")}
        </p>
        <p className="text-caption text-content-muted mb-2">{t("coordinates_hint")}</p>
        <div className="flex gap-3">
          <Field
            className="flex-1"
            label={t("latitude")}
            value={draft.latitude}
            onChange={(event) => set({ latitude: event.target.value })}
            type="number"
            inputMode="decimal"
            dir="ltr"
            placeholder="33.893791"
            inputClassName="tnum"
          />
          <Field
            className="flex-1"
            label={t("longitude")}
            value={draft.longitude}
            onChange={(event) => set({ longitude: event.target.value })}
            type="number"
            inputMode="decimal"
            dir="ltr"
            placeholder="35.501776"
            inputClassName="tnum"
          />
        </div>
        <Button
          variant="secondary"
          block
          className="mt-2"
          icon="navigate"
          onClick={useMyLocation}
          loading={locating}
        >
          {t("use_my_location")}
        </Button>
      </div>

      {error ? <InlineError message={error} /> : null}

      <Button block onClick={save} loading={saving}>
        {saved ? t("saved") : t("save")}
      </Button>
    </div>
  );
}
