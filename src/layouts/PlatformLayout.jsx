import { Link, Outlet } from "react-router-dom";

export default function PlatformLayout() {
  return (
    <div>
      <h2>Platform Dashboard</h2>

      <nav>
        <Link to="tenants">Tenants</Link>
      </nav>

      <Outlet />
    </div>
  );
}
