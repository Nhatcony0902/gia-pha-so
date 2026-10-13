import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./providers/AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();
  if (isInitializing)
    return (
      <div
        role="status"
        className="grid min-h-[calc(100vh-4.5rem)] place-items-center text-content-secondary"
      >
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  if (!isAuthenticated)
    return (
      <Navigate
        to={`/auth?mode=login&returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  return children;
}
