import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import { resetCustomerPassword } from "../../features/platformCustomers/platformCustomersSlice";
import Modal from "../../components/Modal";

export default function ResetCustomerPasswordModal({
  customerId,
  open,
  onClose
}) {
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async e => {
    e.preventDefault();
    if (!customerId) return;

    try {
      setLoading(true);
      setError(null);
      await dispatch(
        resetCustomerPassword({
          id: customerId,
          password
        })
      ).unwrap();

      setPassword("");
      onClose();
    } catch (err) {
      setError(err || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-96 p-6">
        <h3 className="text-xl font-semibold mb-4 text-app-text">
          Reset Customer Password
        </h3>

        {error && (
            <div className="mb-4 p-3 bg-app-surface-2 text-red-600 rounded-[12px] text-sm font-semibold border border-red-100">
                {error}
            </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 bg-app-surface border-2 border-app-border rounded-[12px] focus:outline-none focus:ring-2 focus:ring-app-accent"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[12px] text-app-muted bg-app-surface border-app-border hover:bg-app-surface-2"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-app-accent text-white rounded-[12px] hover:bg-app-accent-dark disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
