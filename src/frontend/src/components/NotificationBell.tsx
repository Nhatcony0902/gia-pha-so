import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import {
  getNotifications,
  readAllNotifications,
  readNotification,
} from "../features/events/api";
import { formFieldClass } from "../lib/ui-classes";

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

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [tree, setTree] = useState("ALL");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
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
  const trees = useMemo(() => {
    const map = new Map<string, string>();
    query.data?.notifications.forEach((item) =>
      map.set(item.treeId, item.treeName),
    );
    return [...map.entries()];
  }, [query.data]);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...(query.data?.notifications ?? [])]
      .filter(
        (item) =>
          status === "ALL" ||
          (status === "UNREAD" ? !item.readAt : Boolean(item.readAt)),
      )
      .filter((item) => tree === "ALL" || item.treeId === tree)
      .filter(
        (item) =>
          !keyword ||
          `${item.title} ${item.message} ${item.treeName}`
            .toLowerCase()
            .includes(keyword),
      )
      .sort(
        (left, right) =>
          (sort === "desc" ? -1 : 1) *
          left.createdAt.localeCompare(right.createdAt),
      );
  }, [query.data, search, status, tree, sort]);
  if (!user) return null;
  return (
    <div ref={panelRef} className="relative shrink-0">
      <button
        type="button"
        className="relative grid size-9 cursor-pointer place-items-center rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/12"
        aria-label={`Thông báo${query.data?.unreadCount ? `, ${query.data.unreadCount} chưa đọc` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={17} />
        {Boolean(query.data?.unreadCount) && (
          <span className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full border-2 border-[#203a34] bg-[#e3a44a] px-1 text-[0.58rem] font-extrabold text-[#1b302b]">
            {Math.min(query.data!.unreadCount, 99)}
          </span>
        )}
      </button>
      {open && (
        <section className="absolute top-[calc(100%+0.65rem)] right-0 z-60 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#c9d7d0] bg-[#f9fbfa] text-ink shadow-[0_20px_60px_rgba(3,18,14,0.34)]">
          <header className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <div>
              <h2 className="m-0 font-display text-lg">Thông báo</h2>
              <p className="m-0 text-[0.68rem] text-ink-subtle">
                {query.data?.unreadCount ?? 0} chưa đọc
              </p>
            </div>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent text-xs font-bold text-accent-deep disabled:opacity-50"
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
                className={`${formFieldClass} py-1.5 pl-8 text-xs`}
                value={search}
                onChange={(input) => setSearch(input.target.value)}
                placeholder="Tìm thông báo…"
              />
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <select
                className={`${formFieldClass} py-1.5 text-[0.68rem]`}
                value={status}
                onChange={(input) =>
                  setStatus(input.target.value as typeof status)
                }
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UNREAD">Chưa đọc</option>
                <option value="READ">Đã đọc</option>
              </select>
              <select
                className={`${formFieldClass} py-1.5 text-[0.68rem]`}
                value={tree}
                onChange={(input) => setTree(input.target.value)}
              >
                <option value="ALL">Mọi gia phả</option>
                {trees.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-border-control bg-white px-2 text-[0.68rem] font-bold text-ink-soft"
                onClick={() =>
                  setSort((value) => (value === "desc" ? "asc" : "desc"))
                }
              >
                <SlidersHorizontal size={12} />
                {sort === "desc" ? "Mới nhất" : "Cũ nhất"}
              </button>
            </div>
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            {query.isLoading && (
              <p className="p-4 text-center text-xs text-ink-muted">
                Đang tải thông báo…
              </p>
            )}
            {!query.isLoading && !filtered.length && (
              <p className="p-6 text-center text-xs text-ink-muted">
                Không có thông báo phù hợp.
              </p>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`flex w-full cursor-pointer gap-3 border-0 border-b border-border-default px-4 py-3 text-left last:border-b-0 ${item.readAt ? "bg-white" : "bg-[#edf6f1]"}`}
                onClick={() => {
                  if (!item.readAt) read.mutate(item.id);
                  setOpen(false);
                  navigate(
                    item.eventId
                      ? `/trees/${item.treeId}/events/${item.eventId}`
                      : `/trees/${item.treeId}/timeline`,
                  );
                }}
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-[#c8862f]"}`}
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs">
                    {item.title}
                  </strong>
                  <span className="mt-1 block line-clamp-2 text-[0.7rem] leading-4 text-ink-muted">
                    {item.message}
                  </span>
                  <span className="mt-1 block text-[0.63rem] text-ink-subtle">
                    {item.treeName} · {relativeTime(item.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
