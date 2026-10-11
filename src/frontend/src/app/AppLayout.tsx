import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";

export function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <Outlet />
    </div>
  );
}
