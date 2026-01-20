import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchStaff,
  addStaff,
  toggleStaff
} from "../../features/staff/staffSlice";

export default function Staff() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(s => s.staff);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  const submit = e => {
    e.preventDefault();
    dispatch(addStaff({ email, fullName: name }));
    setEmail("");
    setName("");
  };

  return (
    <div>
      <h2>Barbers</h2>

      <form onSubmit={submit}>
        <input
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button>Add Barber</button>
      </form>

      {loading && <p>Loading...</p>}

      <ul>
        {items.map(u => (
          <li key={u.Id}>
            {u.FullName} – {u.Email}
            <button onClick={() => dispatch(toggleStaff({
              id: u.Id,
              isAvailable: !u.IsAvailable
            }))}>
              {u.IsAvailable ? "Set Unavailable" : "Set Available"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
