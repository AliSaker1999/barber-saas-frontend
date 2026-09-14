import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchCompanyProfile,
  updateCompanyProfile
} from "../../features/company/companySlice";
import { uploadImage } from "../../services/media";
import Button from "../ui/Button";
import Field from "../ui/Field";
import Icon from "../ui/Icon";
import { InlineError } from "../ui/States";

/*
 * The part of a shop's profile that has to exist before it is worth listing.
 *
 * Deliberately a subset of /company/profile, not a replacement: tax numbers,
 * registration numbers and deposit policy are real fields but nobody needs
 * them to take a booking, and a wizard that asks for them loses the owner
 * before it gets to the part that matters.
 *
 * `section` splits it so the wizard can ask for the name and the pictures on
 * separate screens while both write through the same endpoint.
 */
export default function ShopIdentityForm({ section = "identity", onProgress }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const profile = useAppSelector((state) => state.company.profile);

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dispatch(fetchCompanyProfile());
  }, [dispatch]);

  /* Derived in render once the profile lands, so the form never fights a
     refetch and never sets state from an effect. */
  if (profile && draft === null) {
    setDraft({
      name: profile.Name || "",
      nameAr: profile.NameAr || "",
      city: profile.City || "",
      area: profile.Area || "",
      phone: profile.Phone || profile.PhoneNumber || "",
      whatsappNumber: profile.WhatsappNumber || "",
      logoUrl: profile.LogoUrl || "",
      coverImageUrl: profile.CoverImageUrl || ""
    });
  }

  if (!draft) return null;

  const set = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  async function pick(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(field);
    setError("");
    try {
      const result = await uploadImage(file, "tenant");
      const url = result?.url || result;
      set({ [field]: url });
      /* Saved immediately: an owner who picks a photo and then leaves the step
         should not silently lose it. */
      await dispatch(updateCompanyProfile({ [field]: url })).unwrap();
      onProgress?.();
    } catch (err) {
      setError(typeof err === "string" ? err : t("upload_failed"));
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  }

  async function save() {
    setError("");
    if (section === "identity" && (!draft.name.trim() || !draft.city.trim())) {
      setError(t("identity_needs_name_city"));
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateCompanyProfile(
          section === "identity"
            ? {
                name: draft.name.trim(),
                nameAr: draft.nameAr.trim(),
                city: draft.city.trim(),
                area: draft.area.trim(),
                phone: draft.phone.trim(),
                whatsappNumber: draft.whatsappNumber.trim()
              }
            : { logoUrl: draft.logoUrl, coverImageUrl: draft.coverImageUrl }
        )
      ).unwrap();
      await dispatch(fetchCompanyProfile());
      setSaved(true);
      onProgress?.();
    } catch (err) {
      setError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  }

  if (section === "look") {
    return (
      <div className="space-y-4">
        <ImagePicker
          label={t("shop_logo")}
          hint={t("shop_logo_hint")}
          value={draft.logoUrl}
          busy={uploading === "logoUrl"}
          onPick={(event) => pick(event, "logoUrl")}
          onClear={() => set({ logoUrl: "" })}
          aspect="w-24 h-24 rounded-card"
        />
        <ImagePicker
          label={t("shop_cover")}
          hint={t("shop_cover_hint")}
          value={draft.coverImageUrl}
          busy={uploading === "coverImageUrl"}
          onPick={(event) => pick(event, "coverImageUrl")}
          onClear={() => set({ coverImageUrl: "" })}
          aspect="w-full h-32 rounded-card"
        />

        {error ? <InlineError message={error} /> : null}

        <Button block onClick={save} loading={saving}>
          {saved ? t("saved") : t("save")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field
        label={t("shop_name")}
        value={draft.name}
        onChange={(event) => set({ name: event.target.value })}
      />
      <Field
        label={t("shop_name_ar")}
        optional
        optionalLabel={t("optional")}
        value={draft.nameAr}
        onChange={(event) => set({ nameAr: event.target.value })}
        dir="rtl"
        hint={t("shop_name_ar_hint")}
      />
      <div className="flex gap-3">
        <Field
          className="flex-1"
          label={t("city")}
          value={draft.city}
          onChange={(event) => set({ city: event.target.value })}
          hint={t("city_hint")}
        />
        <Field
          className="flex-1"
          label={t("area")}
          optional
          optionalLabel={t("optional")}
          value={draft.area}
          onChange={(event) => set({ area: event.target.value })}
        />
      </div>
      <Field
        label={t("phone_number")}
        value={draft.phone}
        onChange={(event) => set({ phone: event.target.value })}
        type="tel"
        inputMode="tel"
        dir="ltr"
        placeholder="03 123 456"
        inputClassName="tnum"
      />
      <Field
        label={t("whatsapp_number")}
        optional
        optionalLabel={t("optional")}
        value={draft.whatsappNumber}
        onChange={(event) => set({ whatsappNumber: event.target.value })}
        type="tel"
        inputMode="tel"
        dir="ltr"
        inputClassName="tnum"
      />

      {error ? <InlineError message={error} /> : null}

      <Button block onClick={save} loading={saving}>
        {saved ? t("saved") : t("save")}
      </Button>
    </div>
  );
}

function ImagePicker({ label, hint, value, busy, onPick, onClear, aspect }) {
  const { t } = useI18n();

  return (
    <div>
      <p className="text-label uppercase text-content-muted mb-1.5">{label}</p>

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
          <p className="text-caption text-content-muted mb-2">{hint}</p>
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
