import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import { resetTenantAdminPassword } from "../../features/platformTenants/platformTenantsSlice";
import Modal from "../../components/Modal";

export default function ResetTenantAdminModal({ tenantId, open, onClose }) {
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState("");

  const submit = async e => {
    e.preventDefault();
    await dispatch(
      resetTenantAdminPassword({ tenantId, password })
    );
    setPassword("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 w-96">
        <h3 className="text-xl font-semibold mb-4 text-app-text">
          Reset Admin Password
        </h3>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full px-3 py-2 bg-app-surface border-2 border-app-border rounded-[12px]"
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[12px] text-app-muted bg-app-surface border-app-border"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-app-accent text-white rounded-[12px] hover:bg-app-accent-dark"
            >
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
