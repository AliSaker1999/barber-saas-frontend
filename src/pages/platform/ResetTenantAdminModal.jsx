import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import {
  resetTenantAdminPassword,
  clearPlatformTenantsError
} from "../../features/platformTenants/platformTenantsSlice";
import BottomSheet from "../../components/ui/BottomSheet";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import { InlineError } from "../../components/ui/States";

/*
 * Platform staff tooling — deliberately English-only, see REDESIGN.md.
 *
 * This used to `await dispatch(...)` without `.unwrap()`, then clear the field
 * and close unconditionally. A rejected thunk resolves normally, so a failed
 * reset looked exactly like a successful one: the operator walked away
 * believing the shop owner's password had changed when it had not.
 */
export default function ResetTenantAdminModal({ tenantId, open, onClose }) {
  const dispatch = useAppDispatch();

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!tenantId) return;

    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      await dispatch(resetTenantAdminPassword({ tenantId, password })).unwrap();
      setPassword("");
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : "Could not reset the password.");
      /* This sheet shows it; the page banner should not repeat it. */
      dispatch(clearPlatformTenantsError());
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setError("");
    setPassword("");
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      dismissible={!busy}
      title="Reset the shop admin's password"
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" block onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button block onClick={submit} loading={busy}>
            Reset password
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-body-sm text-content-secondary">
          Their current password stops working immediately. Nobody is emailed —
          pass the new one on yourself.
        </p>
        <Field
          label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
