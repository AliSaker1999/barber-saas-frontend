import { useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import { createTenantAdmin } from "../../features/platformTenants/platformTenantsSlice";
import Modal from "../../components/Modal";

export default function CreateTenantAdminModal({
  tenantId,
  open,
  onClose
}) {
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
      <h3>Create Tenant Admin</h3>

      <form onSubmit={submit}>
        <input
          placeholder="Full name"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button>Create Admin</button>
      </form>
    </Modal>
  );
}
