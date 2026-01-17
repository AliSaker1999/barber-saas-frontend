import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchServices,
  addService,
  toggleService
} from "../../features/services/servicesSlice";

export default function Services() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(state => state.services);
  const tenantId = useAppSelector(state => state.auth.user.tenantId);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    dispatch(fetchServices(tenantId));
  }, [dispatch, tenantId]);

  const submit = e => {
    e.preventDefault();

    dispatch(addService({
      name,
      price: Number(price),
      durationMinutes: Number(duration)
    }));

    setName("");
    setPrice("");
    setDuration("");
  };

  return (
    <div>
      <h2>Services</h2>

      <form onSubmit={submit}>
        <input
          placeholder="Service name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          placeholder="Price"
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
        <input
          placeholder="Duration (min)"
          type="number"
          value={duration}
          onChange={e => setDuration(e.target.value)}
        />
        <button>Add</button>
      </form>

      {loading && <p>Loading...</p>}

      <ul>
        {items.map(s => (
          <li key={s.Id}>
            {s.Name} – {s.DurationMinutes} min – ${s.Price}
            <button onClick={() => dispatch(toggleService(s.Id))}>
              {s.IsActive ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
