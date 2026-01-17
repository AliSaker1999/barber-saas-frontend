import { Link, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

export default function CompanyLayout() {
  const user = useAppSelector(state => state.auth.user);

  return (
    <div>
      <h2>Company Dashboard</h2>

      <nav>
        <Link to="queue">Queue</Link>
        <Link to="appointments">Appointments</Link>

        {user.role === "ADMIN" && (
          <>
            <Link to="services">Services</Link>
            <Link to="barbers">Barbers</Link>
            <Link to="staff">Staff</Link>
            <Link to="settings">Settings</Link>
          </>
        )}
      </nav>

      <Outlet />
    </div>
  );
}
