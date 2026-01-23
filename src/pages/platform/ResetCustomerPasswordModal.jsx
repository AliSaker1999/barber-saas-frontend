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
        <h3 className="text-xl font-semibold mb-4">
          Reset Customer Password
        </h3>

        {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm font-semibold">
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
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
