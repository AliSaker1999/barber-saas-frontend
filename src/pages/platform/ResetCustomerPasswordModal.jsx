import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import {
  resetCustomerPassword,
  clearPlatformCustomersError
} from "../../features/platformCustomers/platformCustomersSlice";
import BottomSheet from "../../components/ui/BottomSheet";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import { InlineError } from "../../components/ui/States";

/*
 * Platform staff tooling — deliberately English-only, see REDESIGN.md.
 *
 * This is the modal that used to white-screen the Customers page. The thunk
 * had no rejectWithValue, so `.unwrap()` rejected with RTK's SerializedError
 * *object*; `setError(err)` stored the object and `{error}` rendered it as a
 * React child, which React refuses. The one dialog here that tried to handle
 * its errors properly was the only one that could crash the app.
 */
export default function ResetCustomerPasswordModal({ customerId, open, onClose }) {
  const dispatch = useAppDispatch();

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!customerId) return;

    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      await dispatch(resetCustomerPassword({ id: customerId, password })).unwrap();
      setPassword("");
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : "Could not reset the password.");
      /* This sheet shows it; the page banner should not repeat it. */
      dispatch(clearPlatformCustomersError());
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
      title="Reset customer password"
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
          The customer is not told. Give them the new password yourself.
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
