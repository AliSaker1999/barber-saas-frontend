import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import {
  updateTenantPlatform,
  clearPlatformTenantsError
} from "../../features/platformTenants/platformTenantsSlice";
import BottomSheet from "../../components/ui/BottomSheet";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import { Toggle } from "../../components/ui/Primitives";
import { InlineError } from "../../components/ui/States";

/*
 * Platform staff tooling — deliberately English-only, see REDESIGN.md.
 *
 * Reported failures through a native `alert()` with a raw error object, and
 * carried its own private `Field` component.
 *
 * It also read `tenant.Phone` while createTenant INSERTs into `PhoneNumber` —
 * two columns for one fact. A shop created from this very screen therefore
 * opened with an empty phone field, and saving wrote "" into `Phone` while the
 * real number stayed in `PhoneNumber`. createTenant now writes `Phone` like
 * everything else; this reads both so rows created before that still show
 * their number.
 */
export default function EditTenantModal({ tenant, isOpen, onClose }) {
  const dispatch = useAppDispatch();

  const [form, setForm] = useState(null);
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (tenant && hydratedFor !== tenant.Id) {
    setForm({
      name: tenant.Name || "",
      slug: tenant.Slug || "",
      phone: tenant.Phone || tenant.PhoneNumber || "",
      whatsappNumber: tenant.WhatsappNumber || "",
      email: tenant.Email || "",
      websiteUrl: tenant.WebsiteUrl || "",
      city: tenant.City || "",
      area: tenant.Area || "",
      street: tenant.Street || "",
      building: tenant.Building || "",
      floor: tenant.Floor || "",
      googleMapLink: tenant.GoogleMapLink || "",
      taxNumber: tenant.TaxNumber || "",
      registrationNumber: tenant.RegistrationNumber || "",
      maxAdvanceBookingDays: String(tenant.MaxAdvanceBookingDays ?? 30),
      allowSameDayBooking: tenant.AllowSameDayBooking ?? true,
      cancellationPolicyHours: String(tenant.CancellationPolicyHours ?? 24)
    });
    setHydratedFor(tenant.Id);
  }

  if (!tenant || !form) return null;

  const set = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  };

  async function save() {
    setError("");

    if (!form.name.trim() || !form.slug.trim()) {
      setError("A shop needs a name and a slug.");
      return;
    }
    const days = Number(form.maxAdvanceBookingDays);
    const hours = Number(form.cancellationPolicyHours);
    if (!Number.isInteger(days) || days < 1) {
      setError("Booking window must be a whole number of days, at least 1.");
      return;
    }
    if (!Number.isInteger(hours) || hours < 0) {
      setError("Cancellation window must be a whole number of hours.");
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateTenantPlatform({
          tenantId: tenant.Id,
          data: {
            ...form,
            name: form.name.trim(),
            slug: form.slug.trim(),
            maxAdvanceBookingDays: days,
            cancellationPolicyHours: hours
          }
        })
      ).unwrap();
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : "Could not save the shop.");
      /* This sheet shows it; the page banner should not repeat it. */
      dispatch(clearPlatformTenantsError());
    } finally {
      setSaving(false);
    }
  }

  const text = (key, label, extra = {}) => (
    <Field
      label={label}
      value={form[key]}
      onChange={(event) => set({ [key]: event.target.value })}
      {...extra}
    />
  );

  return (
    <BottomSheet
      open={isOpen}
      onClose={onClose}
      dismissible={!saving}
      title={`Settings for ${tenant.Name}`}
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" block onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button block onClick={save} loading={saving}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="space-y-3">
          <p className="text-label uppercase text-content-muted">Identity</p>
          {text("name", "Shop name")}
          {text("slug", "Slug", { dir: "ltr", hint: "Used in the booking link" })}
        </section>

        <section className="space-y-3">
          <p className="text-label uppercase text-content-muted">Contact</p>
          {text("phone", "Phone number", { type: "tel", dir: "ltr", inputClassName: "tnum" })}
          {text("whatsappNumber", "WhatsApp", { type: "tel", dir: "ltr", inputClassName: "tnum" })}
          {text("email", "Email", { type: "email", dir: "ltr" })}
          {text("websiteUrl", "Website", { type: "url", dir: "ltr" })}
        </section>

        <section className="space-y-3">
          <p className="text-label uppercase text-content-muted">Where it is</p>
          <div className="flex gap-3">
            <div className="flex-1">{text("city", "City")}</div>
            <div className="flex-1">{text("area", "Area")}</div>
          </div>
          {text("street", "Street")}
          <div className="flex gap-3">
            <div className="flex-1">{text("building", "Building")}</div>
            <div className="flex-1">{text("floor", "Floor")}</div>
          </div>
          {text("googleMapLink", "Map link", { type: "url", dir: "ltr" })}
        </section>

        <section className="space-y-3">
          <p className="text-label uppercase text-content-muted">Paperwork</p>
          {text("taxNumber", "Tax number", { dir: "ltr", inputClassName: "tnum" })}
          {text("registrationNumber", "Registration number", {
            dir: "ltr",
            inputClassName: "tnum"
          })}
        </section>

        <section className="space-y-3">
          <p className="text-label uppercase text-content-muted">Booking rules</p>
          {text("maxAdvanceBookingDays", "How far ahead customers can book", {
            type: "number",
            inputMode: "numeric",
            min: "1",
            dir: "ltr",
            inputClassName: "tnum",
            hint: "In days."
          })}
          <div className="rounded-card bg-surface-sunken px-3.5 py-2.5">
            <Toggle
              label="Same-day booking"
              hint={
                form.allowSameDayBooking
                  ? "Customers can book a slot for today."
                  : "The earliest customers can book is tomorrow."
              }
              checked={form.allowSameDayBooking}
              onChange={(next) => set({ allowSameDayBooking: next })}
            />
          </div>
          {text("cancellationPolicyHours", "Free cancellation window", {
            type: "number",
            inputMode: "numeric",
            min: "0",
            dir: "ltr",
            inputClassName: "tnum",
            hint: "In hours before the appointment."
          })}
        </section>

        {error ? <InlineError message={error} /> : null}
      </div>
    </BottomSheet>
  );
}
