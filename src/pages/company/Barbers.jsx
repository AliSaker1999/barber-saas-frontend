import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchBarbers,
  createBarber,
  toggleBarberService,
  toggleAvailability
} from "../../features/barbers/barbersSlice";
import { fetchServices } from "../../features/services/servicesSlice";
import BarberWorkingHours from "./BarberWorkingHours";

export default function Barbers() {
  const dispatch = useAppDispatch();

  const barbers = useAppSelector(s => s.barbers.items);
  const services = useAppSelector(s => s.services.items);

  const [selectedBarber, setSelectedBarber] = useState(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    dispatch(fetchBarbers());
    dispatch(fetchServices());
  }, [dispatch]);

  const submit = e => {
    e.preventDefault();

    dispatch(createBarber({ fullName, email, password }))
      .unwrap()
      .then(() => {
        setFullName("");
        setEmail("");
        setPassword("");
        dispatch(fetchBarbers());
      });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Barbers</h1>

      {/* ADD BARBER */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Add Barber</h2>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="border rounded px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="md:col-span-3 bg-blue-600 text-white rounded py-2 hover:bg-blue-700">
            Create Barber
          </button>
        </form>
      </div>

      {/* BARBERS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-3">Existing Barbers</h2>

          {barbers.length === 0 && (
            <p className="text-sm text-gray-500">No barbers yet.</p>
          )}

          <ul className="space-y-2">
            {barbers.map(b => (
              <li
                key={b.Id}
                className={`p-3 rounded border cursor-pointer ${
                  selectedBarber?.Id === b.Id
                    ? "border-blue-600 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedBarber(b)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{b.FullName}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      b.IsAvailable
                        ? "bg-green-600 text-white"
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    {b.IsAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* CONFIG */}
        <div className="md:col-span-2 bg-white rounded shadow p-4">
          {!selectedBarber && (
            <p className="text-gray-500">Select a barber to configure.</p>
          )}

          {selectedBarber && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {selectedBarber.FullName}
                </h2>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedBarber.IsAvailable}
                    onChange={e =>
                      dispatch(
                        toggleAvailability({
                          barberId: selectedBarber.Id,
                          isAvailable: e.target.checked
                        })
                      )
                    }
                  />
                  <span className="text-sm">Available</span>
                </label>
              </div>

              {/* SERVICES */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Services</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {services.map(s => (
                    <label
                      key={s.Id}
                      className="flex items-center gap-2 text-sm border rounded px-2 py-1 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBarber.ServiceIds?.includes(s.Id)}
                        onChange={() =>
                          dispatch(
                            toggleBarberService({
                              barberId: selectedBarber.Id,
                              serviceId: s.Id
                            })
                          )
                        }
                      />
                      {s.Name}
                    </label>
                  ))}
                </div>
              </div>

              <BarberWorkingHours barber={selectedBarber} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
