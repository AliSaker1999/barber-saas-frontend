import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import { createTenantAdmin } from "../../features/platformTenants/platformTenantsSlice";
import Modal from "../../components/Modal";

export default function CreateTenantAdminModal({ tenantId, open, onClose }) {
  const dispatch = useAppDispatch();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async e => {
    e.preventDefault();
    await dispatch(
      createTenantAdmin({
        tenantId,
        admin: { fullName, email, password }
      })
    );
    setFullName("");
    setEmail("");
    setPassword("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 w-96">
        <h3 className="text-xl font-semibold mb-4 text-app-text">
          Create Tenant Admin
        </h3>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full px-3 py-2 bg-app-surface border-2 border-app-border rounded-[12px]"
            placeholder="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          <input
            className="w-full px-3 py-2 bg-app-surface border-2 border-app-border rounded-[12px]"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full px-3 py-2 bg-app-surface border-2 border-app-border rounded-[12px]"
            placeholder="Password"
            type="password"
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
              Create Admin
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
