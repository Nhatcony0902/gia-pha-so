import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import {
  getNotifications,
  readAllNotifications,
  readNotification,
} from "../features/events/api";
import { formFieldClass } from "../lib/ui-classes";

const notificationTypeLabel = (type: string) => {
  if (type.startsWith("ACCOUNT_")) return "Tài khoản";
  if (type.startsWith("FAMILY_TREE_")) return "Gia phả";
  if (type.startsWith("EVENT_")) return "Sự kiện";
  return "Hệ thống";
};

const relativeTime = (value: string) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("vi-VN", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
};

const fullDateTime = (value: string) => {
  const date = new Date(value);
  const pad = (part: number) => part.toString().padStart(2, "0");

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["app-notifications"],
    queryFn: getNotifications,
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
  const read = useMutation({
    mutationFn: readNotification,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["app-notifications"] }),
  });
  const readAll = useMutation({
    mutationFn: readAllNotifications,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["app-notifications"] }),
  });
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...(query.data?.notifications ?? [])]
      .filter(
        (item) =>
          !keyword ||
          `${item.title} ${item.message} ${item.type} ${item.sourceName}`
            .toLowerCase()
            .includes(keyword),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [query.data, search]);
  if (!user) return null;
  return (
    <div ref={panelRef} className="relative shrink-0">
      <button
        type="button"
        className="relative grid size-9 cursor-pointer place-items-center rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/12"
        aria-label={`Thông báo${query.data?.unreadCount ? `, ${query.data.unreadCount} chưa đọc` : ""}`}
        aria-expanded={open}
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void query.refetch();
        }}
      >
        <Bell size={17} />
        {Boolean(query.data?.unreadCount) && (
          <span className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full border-2 border-[#203a34] bg-[#e3a44a] px-1 text-[0.58rem] font-extrabold text-[#1b302b]">
            {Math.min(query.data!.unreadCount, 99)}
          </span>
        )}
      </button>
      {open && (
        <section className="absolute top-[calc(100%+0.65rem)] right-0 z-60 w-[min(30rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#c9d7d0] bg-[#f9fbfa] text-ink shadow-[0_12px_30px_rgba(24,55,47,0.16)]">
          <header className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <h2 className="m-0 font-display text-xl font-semibold">
              Thông báo ({query.data?.notifications.length ?? 0})
            </h2>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent text-sm font-bold text-accent-deep disabled:opacity-50"
              disabled={!query.data?.unreadCount || readAll.isPending}
              onClick={() => readAll.mutate()}
            >
              <CheckCheck size={15} /> Đọc tất cả
            </button>
          </header>
          <div className="grid gap-2 border-b border-border-default bg-[#f1f6f3] p-2.5">
            <label className="relative">
              <Search
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle"
                size={13}
              />
              <input
                className={`${formFieldClass} py-2 pl-9 text-sm`}
                value={search}
                onChange={(input) => setSearch(input.target.value)}
                placeholder="Tìm thông báo…"
              />
            </label>
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            {query.isLoading && (
              <p className="p-4 text-center text-sm text-ink-muted">
                Đang tải thông báo…
              </p>
            )}
            {!query.isLoading && !filtered.length && (
              <p className="p-6 text-center text-sm text-ink-muted">
                Không có thông báo phù hợp.
              </p>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`flex w-full cursor-pointer gap-3 border-0 border-b border-border-default px-4 py-3 text-left transition-colors last:border-b-0 ${item.readAt ? "bg-white hover:bg-[#f4f7f5] focus-visible:bg-[#f4f7f5]" : "bg-[#edf6f1] hover:bg-[#e2f0e8] focus-visible:bg-[#e2f0e8]"}`}
                onClick={() => {
                  if (!item.readAt) read.mutate(item.id);
                  setOpen(false);
                  if (item.actionUrl) navigate(item.actionUrl);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="mb-0.5 block text-[0.7rem] font-bold tracking-wide text-accent-deep uppercase">
                    {notificationTypeLabel(item.type)}
                  </span>
                  <strong className="block truncate text-sm">
                    {item.title}
                  </strong>
                  {item.message && (
                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-ink-muted">
                      {item.message}
                    </span>
                  )}
                  <span className="mt-1 block text-xs text-ink-subtle">
                    {item.sourceName} ·{" "}
                    <time
                      dateTime={item.createdAt}
                      title={fullDateTime(item.createdAt)}
                    >
                      {relativeTime(item.createdAt)}
                    </time>
                  </span>
                </span>
                {!item.readAt && (
                  <span
                    className="size-2.5 shrink-0 self-center rounded-full bg-[#c8862f]"
                    aria-label="Chưa đọc"
                  />
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
