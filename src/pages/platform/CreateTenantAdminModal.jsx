import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import {
  createTenantAdmin,
  clearPlatformTenantsError
} from "../../features/platformTenants/platformTenantsSlice";
import BottomSheet from "../../components/ui/BottomSheet";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import { InlineError } from "../../components/ui/States";

/*
 * Platform staff tooling — deliberately English-only, see REDESIGN.md.
 *
 * Same fault as the reset dialogs: `await dispatch(...)` with no `.unwrap()`,
 * then clear and close regardless. A duplicate email — the most likely failure
 * here — produced a silent no-op that read as success, and the shop sat there
 * with no admin while the operator believed they had made one.
 */

const empty = { fullName: "", email: "", password: "" };

export default function CreateTenantAdminModal({ tenantId, open, onClose, onCreated }) {
  const dispatch = useAppDispatch();

  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  };

  async function submit() {
    if (!tenantId) return;

    setError("");
    if (!form.fullName.trim()) {
      setError("Add the admin's name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("That email address does not look right.");
      return;
    }
    if (form.password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      await dispatch(
        createTenantAdmin({
          tenantId,
          admin: {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            password: form.password
          }
        })
      ).unwrap();
      setForm(empty);
      onCreated?.(tenantId);
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : "Could not create the admin account.");
      /* This sheet shows it; the page banner should not repeat it. */
      dispatch(clearPlatformTenantsError());
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setError("");
    setForm(empty);
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      dismissible={!busy}
      title="Add a shop admin"
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" block onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button block onClick={submit} loading={busy}>
            Create admin
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-body-sm text-content-secondary">
          This is the account the shop owner signs in with.
        </p>
        <Field
          label="Full name"
          value={form.fullName}
          onChange={(event) => set({ fullName: event.target.value })}
          autoComplete="name"
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(event) => set({ email: event.target.value })}
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={form.password}
          onChange={(event) => set({ password: event.target.value })}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        {error ? <InlineError message={error} /> : null}
      </div>
    </BottomSheet>
  );
}
