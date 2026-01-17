import { Outlet } from "react-router-dom";

export default function CustomerLayout() {
  return (
    <div>
      <h2>Customer</h2>
      <Outlet />
    </div>
  );
}
