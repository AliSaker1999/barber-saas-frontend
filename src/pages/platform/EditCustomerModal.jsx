import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import {
  updateCustomerPlatform,
  clearPlatformCustomersError
} from "../../features/platformCustomers/platformCustomersSlice";
import BottomSheet from "../../components/ui/BottomSheet";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import { Toggle } from "../../components/ui/Primitives";
import { InlineError } from "../../components/ui/States";

/*
 * Platform staff tooling — deliberately English-only, see REDESIGN.md.
 *
 * Two things replaced here. It reported failures through a native `alert()`
 * carrying a raw error object, and it carried its own private `Field` and
 * `Checkbox` components — a third set of form controls in a codebase that has
 * one.
 *
 * Saving used to appear to do nothing: the thunk handed its camelCase form
 * back to a reducer that spread it onto a row the list reads in PascalCase, so
 * the card kept showing the old name. The thunk re-reads the list now.
 */

const GENDER_OPTIONS = [
  { value: "Male", label: "Male", icon: "gender-male" },
  { value: "Female", label: "Female", icon: "gender-female" },
  { value: "Other", label: "Other", icon: "gender-other" }
];

export default function EditCustomerModal({ customer, isOpen, onClose }) {
  const dispatch = useAppDispatch();

  const [form, setForm] = useState(null);
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (customer && hydratedFor !== customer.Id) {
    setForm({
      fullName: customer.FullName || "",
      phoneNumber: customer.PhoneNumber || "",
      gender: customer.Gender || "",
      birthdate: customer.Birthdate ? customer.Birthdate.split("T")[0] : "",
      allowSMS: customer.AllowSMS ?? true,
      allowWhatsApp: customer.AllowWhatsApp ?? true,
      allowEmail: customer.AllowEmail ?? true
    });
    setHydratedFor(customer.Id);
  }

  if (!customer || !form) return null;

  const set = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  };

  async function save() {
    setError("");
    if (!form.fullName.trim()) {
      setError("Add a name.");
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateCustomerPlatform({
          id: customer.Id,
          data: { ...form, fullName: form.fullName.trim() }
        })
      ).unwrap();
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : "Could not save the customer.");
      /* This sheet shows it; the page banner should not repeat it. */
      dispatch(clearPlatformCustomersError());
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={isOpen}
      onClose={onClose}
      dismissible={!saving}
      title={`Edit ${customer.FullName || "customer"}`}
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
      <div className="space-y-3">
        <Field
          label="Full name"
          value={form.fullName}
          onChange={(event) => set({ fullName: event.target.value })}
        />
        <Field
          label="Phone number"
          value={form.phoneNumber}
          onChange={(event) => set({ phoneNumber: event.target.value })}
          type="tel"
          dir="ltr"
          inputClassName="tnum"
        />

        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-label uppercase text-content-muted mb-1.5">Gender</p>
            <Select
              value={form.gender}
              onChange={(event) => set({ gender: event.target.value })}
              options={GENDER_OPTIONS}
              placeholder="Not set"
              aria-label="Gender"
            />
          </div>
          <Field
            className="flex-1"
            label="Date of birth"
            value={form.birthdate}
            onChange={(event) => set({ birthdate: event.target.value })}
            type="date"
            dir="ltr"
          />
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-label uppercase text-content-muted">How we may contact them</p>
          {[
            { key: "allowSMS", label: "SMS" },
            { key: "allowWhatsApp", label: "WhatsApp" },
            { key: "allowEmail", label: "Email" }
          ].map((channel) => (
            <div
              key={channel.key}
              className="rounded-card bg-surface-sunken px-3.5 py-2.5"
            >
              <Toggle
                label={channel.label}
                checked={form[channel.key]}
                onChange={(next) => set({ [channel.key]: next })}
              />
            </div>
          ))}
        </div>

        {error ? <InlineError message={error} /> : null}
      </div>
    </BottomSheet>
  );
}
