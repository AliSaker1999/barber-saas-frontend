import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchBarbers,
  createBarber,
  toggleBarberService,
  toggleAvailability
} from "../../features/barbers/barbersSlice";
import { fetchStaff } from "../../features/staff/staffSlice";
import { fetchServices } from "../../features/services/servicesSlice";
import BarberWorkingHours from "./BarberWorkingHours";

export default function Barbers() {
  const dispatch = useAppDispatch();
  const barbers = useAppSelector(s => s.barbers.items);
  const staff = useAppSelector(s => s.staff.items);
  const services = useAppSelector(s => s.services.items);

  const [selectedBarber, setSelectedBarber] = useState(null);

  useEffect(() => {
    dispatch(fetchStaff());
    dispatch(fetchBarbers());
    dispatch(fetchServices());
  }, [dispatch]);

  return (
    <div>
      <h2>Barbers</h2>

      <h3>Create Barber Profile</h3>
      <ul>
        {staff.map(u => (
          <li key={u.Id}>
            {u.FullName}
            <button onClick={() => dispatch(createBarber(u.Id))}>
              Make Barber
            </button>
          </li>
        ))}
      </ul>

      <h3>Existing Barbers</h3>
      <ul>
  {barbers.map(b => (
    <li key={b.Id}>
      <strong>{b.FullName}</strong>{" "}
      <button onClick={() => setSelectedBarber(b)}>
        Configure
      </button>

      <label style={{ marginLeft: 10 }}>
        <input
          type="checkbox"
          checked={b.IsAvailable}
          onChange={e =>
            dispatch(
              toggleAvailability({
                barberId: b.Id,
                isAvailable: e.target.checked
              })
            )
          }
        />
        Available
      </label>
    </li>
  ))}
</ul>


      {selectedBarber && (
        <div style={{ marginTop: 20 }}>
          <h3>
            Services for {selectedBarber.FullName}
            <BarberWorkingHours barber={selectedBarber} />
          </h3>

          <ul>
            {services.map(s => (
              <li key={s.Id}>
                <label>
                  <input
                    type="checkbox"
                    checked={
                      selectedBarber.ServiceIds?.includes(s.Id)
                    }
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
