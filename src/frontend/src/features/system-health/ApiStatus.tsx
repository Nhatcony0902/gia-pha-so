import { useQuery } from "@tanstack/react-query";
import { getHealth } from "./api";
import { useAuth } from "../../app/providers/AuthProvider";

export function ApiStatus() {
  const { isAuthenticated, user } = useAuth();
  const health = useQuery({
    queryKey: ["health", isAuthenticated],
    queryFn: getHealth,
  });
  const status = health.isError ? "error" : (health.data?.status ?? "loading");
  const dotClass =
    status === "ok"
      ? "bg-status-success"
      : status === "error"
        ? "bg-status-danger"
        : "bg-status-pending";

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-outline text-content-on-outline mt-8 inline-flex max-w-full items-center gap-2 border px-4 py-3 font-sans text-sm"
      data-status={status}
    >
      <span className={`rounded-pill size-2 shrink-0 ${dotClass}`} />
      {health.isLoading && "Đang kết nối API..."}
      {health.isError && "API chưa sẵn sàng"}
      {health.isSuccess &&
        health.data.status === "degraded" &&
        "API hoạt động, DB chưa kết nối"}
      {health.isSuccess &&
        health.data.status === "ok" &&
        `API và DB đang hoạt động · ${health.data.authenticated && user ? `Đã đăng nhập với ${user.email}` : "Chưa đăng nhập"}`}
    </div>
  );
}
