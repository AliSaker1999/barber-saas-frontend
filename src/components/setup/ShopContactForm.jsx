import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchCompanyProfile,
  updateCompanyProfile
} from "../../features/company/companySlice";
import Button from "../ui/Button";
import Field from "../ui/Field";
import { InlineError } from "../ui/States";

/*
 * How a customer reaches the shop other than by phone, and the two numbers
 * the shop needs for its own paperwork.
 *
 * A sibling of ShopIdentityForm rather than another `section` branch of it:
 * the wizard asks for identity, /company/profile asks for everything, and
 * bolting a sixth branch onto a prop that is hardwired in three places is how
 * that component stops being readable. Each sibling owns its own draft, its
 * own Save and its own validation, which is also why /company/profile no
 * longer has a single page-wide edit mode.
 *
 * The parent owns the profile fetch; these forms read what is already there.
 */
export default function ShopContactForm() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const profile = useAppSelector((state) => state.company.profile);

  const [draft, setDraft] = useState(null);
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  /* Derived in render, so a refetch after save re-seeds the draft without an
     effect writing state behind the form's back. */
  if (profile && hydratedFor !== profile.Id) {
    setDraft({
      email: profile.Email || "",
      websiteUrl: profile.WebsiteUrl || "",
      taxNumber: profile.TaxNumber || "",
      registrationNumber: profile.RegistrationNumber || ""
    });
    setHydratedFor(profile.Id);
  }

  if (!draft) return null;

  const set = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  async function save() {
    setError("");

    const email = draft.email.trim();
    /* The server's zod schema rejects a malformed address with a 400 that
       names the field; catching it here saves the round trip. */
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError(t("invalid_email"));
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateCompanyProfile({
          email,
          websiteUrl: draft.websiteUrl.trim(),
          taxNumber: draft.taxNumber.trim(),
          registrationNumber: draft.registrationNumber.trim()
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
        label={t("email_address")}
        optional
        optionalLabel={t("optional")}
        value={draft.email}
        onChange={(event) => set({ email: event.target.value })}
        type="email"
        inputMode="email"
        dir="ltr"
        autoComplete="email"
      />
      <Field
        label={t("website")}
        optional
        optionalLabel={t("optional")}
        value={draft.websiteUrl}
        onChange={(event) => set({ websiteUrl: event.target.value })}
        type="url"
        dir="ltr"
        placeholder="https://"
      />
      <Field
        label={t("tax_number")}
        optional
        optionalLabel={t("optional")}
        value={draft.taxNumber}
        onChange={(event) => set({ taxNumber: event.target.value })}
        dir="ltr"
        inputClassName="tnum"
        hint={t("tax_number_hint")}
      />
      <Field
        label={t("registration_number")}
        optional
        optionalLabel={t("optional")}
        value={draft.registrationNumber}
        onChange={(event) => set({ registrationNumber: event.target.value })}
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
