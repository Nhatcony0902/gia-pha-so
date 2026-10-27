import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventCategory, TimelineEntry } from "@family-tree/shared-types";
import {
  ArrowDownAZ,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  MapPin,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageBreadcrumbBar, PageHeading } from "../components/PageHeader";
import { useNotifications } from "../app/providers/NotificationProvider";
import { createEvent, getTimeline } from "../features/events/api";
import {
  categoryLabel,
  categoryTone,
  eventCategories,
} from "../features/events/constants";
import { EventFormDialog } from "../features/events/EventFormDialog";
import { StyledCheckbox } from "../features/family-tree/ListFilterControls";
import {
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formFieldClass,
  formLabelClass,
  surfaceCardClass,
} from "../lib/ui-classes";

type VisibleCategory = EventCategory | "BIRTH" | "DEATH";

const allCategories: Array<[VisibleCategory, string]> = [
  ...eventCategories,
  ["BIRTH", "Ngày sinh"],
  ["DEATH", "Ngày mất"],
];
const dayFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const monthFormat = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  year: "numeric",
});
const dayKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const lunarLabel = (date: Date) => {
  try {
    return new Intl.DateTimeFormat("vi-VN-u-ca-chinese", {
      day: "numeric",
      month: "long",
    }).format(date);
  } catch {
    return "Âm lịch";
  }
};
const eventTime = (entry: TimelineEntry) =>
  entry.isAllDay
    ? "Cả ngày"
    : new Date(entry.startAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

function CategoryPicker({
  value,
  onChange,
}: {
  value: VisibleCategory[];
  onChange: (categories: VisibleCategory[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div className="relative" ref={popupRef}>
      <button
        type="button"
        className={`${compactSecondaryButtonClass} w-full justify-between bg-white`}
        onClick={() => {
          setDraft(value);
          setOpen((current) => !current);
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Columns3 size={16} /> Danh mục hiển thị
        </span>
        <span className="rounded-full bg-[#e3ece7] px-2 py-0.5 text-xs">
          {value.length}/{allCategories.length}
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 flex max-h-[26rem] w-72 flex-col rounded-xl border border-border-control bg-white p-2 shadow-xl">
          <div className="grid min-h-0 gap-1 overflow-auto">
            <StyledCheckbox
              className="rounded-lg px-2 py-2 text-sm font-bold hover:bg-surface-hover"
              checked={draft.length === allCategories.length}
              indeterminate={
                draft.length > 0 && draft.length < allCategories.length
              }
              onChange={() =>
                setDraft(
                  draft.length === allCategories.length
                    ? []
                    : allCategories.map(([key]) => key),
                )
              }
              label="Chọn tất cả"
            />
            {allCategories.map(([key, label]) => (
              <StyledCheckbox
                key={key}
                className="rounded-lg px-2 py-2 text-sm hover:bg-surface-hover"
                checked={draft.includes(key)}
                onChange={() =>
                  setDraft((current) =>
                    current.includes(key)
                      ? current.filter((item) => item !== key)
                      : [...current, key],
                  )
                }
                label={
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: categoryTone[key] }}
                    />
                    {label}
                  </span>
                }
              />
            ))}
          </div>
          <div className="mt-2 flex justify-end border-t border-[#e4ebe7] pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-strong px-4 py-2 text-sm font-bold text-white hover:bg-[#203b34]"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              <Check size={14} /> Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarEntry({
  entry,
  treeId,
  selected,
}: {
  entry: TimelineEntry;
  treeId: string;
  selected: boolean;
}) {
  const to = entry.eventId
    ? `/trees/${treeId}/events/${entry.eventId}`
    : `/trees/${treeId}/persons/${entry.personId}`;
  return (
    <Link
      id={`calendar-entry-${entry.id}`}
      to={to}
      className={`block rounded-md border-l-[3px] px-2 py-1.5 text-ink no-underline transition ${selected ? "bg-[#fff1d4] ring-2 ring-[#d29a43] ring-offset-1" : "bg-[#f5f8f6] hover:bg-[#e9f1ed]"}`}
      style={{ borderLeftColor: categoryTone[entry.category] }}
      title={`${entry.title} · ${eventTime(entry)}`}
    >
      <strong className="block truncate text-xs leading-4">
        {entry.title}
      </strong>
      <span className="block text-[0.7rem] text-ink-subtle">
        {eventTime(entry)}
      </span>
    </Link>
  );
}

function CalendarPanel({
  entries,
  treeId,
  cursor,
  onCursorChange,
  selectedId,
}: {
  entries: TimelineEntry[];
  treeId: string;
  cursor: Date;
  onCursorChange: (date: Date) => void;
  selectedId: string | null;
}) {
  const now = new Date();
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const grouped = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.startAt);
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }
  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`calendar-entry-${selectedId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedId, cursor]);
  return (
    <section
      className={`${surfaceCardClass} flex h-full min-h-0 flex-col overflow-hidden`}
      aria-label="Lịch sự kiện"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border-default px-4 py-3">
        <button
          className={compactSecondaryButtonClass}
          type="button"
          aria-label="Tháng trước"
          onClick={() =>
            onCursorChange(
              new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
            )
          }
        >
          <ChevronLeft size={17} />
        </button>
        <div className="text-center">
          <h2 className="m-0 font-display text-xl capitalize">
            {monthFormat.format(cursor)}
          </h2>
          <button
            type="button"
            className="mt-0.5 cursor-pointer border-0 bg-transparent text-sm font-semibold text-accent-deep"
            onClick={() =>
              onCursorChange(new Date(now.getFullYear(), now.getMonth(), 1))
            }
          >
            Về tháng hiện tại
          </button>
        </div>
        <button
          className={compactSecondaryButtonClass}
          type="button"
          aria-label="Tháng sau"
          onClick={() =>
            onCursorChange(
              new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
            )
          }
        >
          <ChevronRight size={17} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[48rem]">
          <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-border-default bg-[#f3f7f4] text-center text-xs font-bold tracking-wide text-ink-subtle uppercase">
            {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"].map(
              (label) => (
                <div key={label} className="py-2.5">
                  {label}
                </div>
              ),
            )}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date) => {
              const inMonth = date.getMonth() === cursor.getMonth();
              const isToday = dayKey(date) === dayKey(now);
              const dayEntries = grouped.get(dayKey(date)) ?? [];
              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-36 border-r border-b border-border-default p-2 ${inMonth ? "bg-white" : "bg-[#f6f8f7] text-ink-subtle"}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-1">
                    <span
                      className={`grid size-7 place-items-center rounded-full text-sm font-bold ${isToday ? "bg-[#285f51] text-white" : ""}`}
                    >
                      {date.getDate()}
                    </span>
                    <span className="max-w-24 truncate text-xs font-medium text-[#987136]">
                      {lunarLabel(date)}
                    </span>
                  </div>
                  <div className="grid max-h-24 gap-1.5 overflow-y-auto pr-0.5">
                    {dayEntries.map((entry) => (
                      <CalendarEntry
                        key={entry.id}
                        entry={entry}
                        treeId={treeId}
                        selected={entry.id === selectedId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineRow({
  entry,
  treeId,
  selected,
  onFocus,
}: {
  entry: TimelineEntry;
  treeId: string;
  selected: boolean;
  onFocus: () => void;
}) {
  const profilePath = `/trees/${treeId}/persons/${entry.personId}`;
  const marker = (
    <>
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-5 z-10 h-px w-5 bg-[#78978a]"
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-[1.55rem] z-10 size-2.5 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
        style={{ backgroundColor: categoryTone[entry.category] }}
      />
    </>
  );
  if (!entry.eventId)
    return (
      <Link
        to={profilePath}
        className={`group relative mb-2 flex items-center gap-3 rounded-lg border border-border-default bg-white px-3 py-2.5 text-ink no-underline shadow-sm transition last:mb-0 hover:border-[#9eb4aa] hover:bg-[#f8fbf9] ${selected ? "border-[#d29a43] bg-[#fff6e5] ring-2 ring-[#e6bc78]/45" : ""}`}
      >
        {marker}
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm">{entry.title}</strong>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-subtle">
            <span>{categoryLabel[entry.category]}</span>
            {entry.location && <span>{entry.location}</span>}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-ink-subtle" />
      </Link>
    );
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onFocus();
      }}
      className={`group relative mb-2 flex cursor-pointer items-center gap-3 rounded-lg border border-border-default bg-white px-3 py-2.5 shadow-sm outline-none transition last:mb-0 hover:border-[#9eb4aa] hover:bg-[#f8fbf9] focus-visible:ring-2 focus-visible:ring-focus ${selected ? "border-[#d29a43] bg-[#fff6e5] ring-2 ring-[#e6bc78]/45" : ""}`}
    >
      {marker}
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{entry.title}</strong>
        <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-subtle">
          <span>{categoryLabel[entry.category]}</span>
          <span>{eventTime(entry)}</span>
          {entry.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {entry.location}
            </span>
          )}
        </span>
      </span>
      <Link
        to={`/trees/${treeId}/events/${entry.eventId}`}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-bold text-accent-deep no-underline hover:bg-[#fff0cf]"
      >
        Chi tiết <ChevronRight size={14} />
      </Link>
    </div>
  );
}

export function TimelinePage() {
  const { treeId = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const notice = useNotifications();
  const now = new Date();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [categories, setCategories] = useState<VisibleCategory[]>(() =>
    allCategories.map(([key]) => key),
  );
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const query = useQuery({
    queryKey: ["timeline", treeId],
    queryFn: () => getTimeline(treeId),
    enabled: Boolean(treeId),
  });
  const create = useMutation({
    mutationFn: (body: Parameters<typeof createEvent>[1]) =>
      createEvent(treeId, body),
    onSuccess: async ({ id }) => {
      await client.invalidateQueries({ queryKey: ["timeline", treeId] });
      setFormOpen(false);
      notice.toast("Đã tạo sự kiện", "success");
      navigate(`/trees/${treeId}/events/${id}`);
    },
    onError: (error) =>
      notice.alert(
        "Không thể tạo sự kiện",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      ),
  });
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    const from = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const to = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    return [...(query.data?.entries ?? [])]
      .filter((entry) => categories.includes(entry.category))
      .filter((entry) => {
        const time = new Date(entry.startAt).getTime();
        return (from === null || time >= from) && (to === null || time <= to);
      })
      .filter(
        (entry) =>
          !keyword ||
          `${entry.title} ${entry.description ?? ""} ${entry.location ?? ""}`
            .toLocaleLowerCase("vi")
            .includes(keyword),
      )
      .sort(
        (left, right) =>
          (sort === "asc" ? 1 : -1) * left.startAt.localeCompare(right.startAt),
      );
  }, [
    query.data?.entries,
    categories,
    startDate,
    endDate,
    search,
    sort,
  ]);
  const groups = useMemo(() => {
    const result: Array<{ date: string; entries: TimelineEntry[] }> = [];
    for (const entry of filtered) {
      const key = dayKey(entry.startAt);
      const previous = result.at(-1);
      if (previous?.date === key) previous.entries.push(entry);
      else result.push({ date: key, entries: [entry] });
    }
    return result;
  }, [filtered]);
  const focusOnCalendar = (entry: TimelineEntry) => {
    const date = new Date(entry.startAt);
    setSelectedId(entry.id);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };
  const resetFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setSort("desc");
    setCategories(allCategories.map(([key]) => key));
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface-page px-4 py-4 text-ink md:px-6">
      <PageBreadcrumbBar
        headerClassName="z-3 -mx-4 -mt-4 mb-5 border-b border-border-default bg-[rgba(249,251,250,0.96)] px-5 py-[0.85rem] md:-mx-6"
        contentClassName="flex w-full flex-col items-start justify-between gap-4 min-[801px]:flex-row min-[801px]:items-center"
        items={[
          { label: "Trang chủ", to: "/" },
          { label: "Danh sách gia phả", to: "/trees" },
          {
            label: query.data?.tree.name ?? "Gia phả",
            to: `/trees/${treeId}/tree`,
          },
          { label: "Dòng thời gian" },
        ]}
      >
          <div className="flex w-full flex-wrap items-center justify-between gap-[1.2rem] text-[0.84rem] text-[#5d7167] min-[801px]:w-auto">
            <span>
              {query.data?.entries.length ?? 0} dấu mốc
            </span>
            {query.data?.canManage && (
              <div className="flex items-center gap-2">
                <button
                  className={compactPrimaryButtonClass}
                  type="button"
                  onClick={() => setFormOpen(true)}
                >
                  <Plus size={16} /> Thêm sự kiện
                </button>
              </div>
            )}
          </div>
      </PageBreadcrumbBar>
      <div className="mx-auto flex max-w-[100rem] flex-col">
        <PageHeading
          className="mb-5"
          title="Dòng thời gian"
          description={
            <>Hiển thị {filtered.length}/{query.data?.entries.length ?? 0} dấu mốc của {query.data?.tree.name ?? "gia phả"}.</>
          }
        />

        <section
          className={`${surfaceCardClass} mb-4 p-4`}
          aria-label="Bộ lọc dòng thời gian"
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6 xl:grid-cols-[repeat(14,minmax(0,1fr))]">
            <label className={`${formLabelClass} col-span-2 md:col-span-6 xl:col-span-3`}>
              Tìm kiếm
              <span className="relative">
                <Search
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
                  size={15}
                />
                <input
                  className={`${formFieldClass} py-2 pl-9 text-sm`}
                  value={search}
                  onChange={(input) => setSearch(input.target.value)}
                  placeholder="Tên sự kiện, thành viên, địa điểm…"
                />
              </span>
            </label>
            <label className={`${formLabelClass} col-span-1 md:col-span-3 xl:col-span-2`}>
              Từ ngày
              <input
                type="date"
                className={`${formFieldClass} py-2 text-sm`}
                value={startDate}
                max={endDate || undefined}
                onChange={(input) => setStartDate(input.target.value)}
              />
            </label>
            <label className={`${formLabelClass} col-span-1 md:col-span-3 xl:col-span-2`}>
              Đến ngày
              <input
                type="date"
                className={`${formFieldClass} py-2 text-sm`}
                value={endDate}
                min={startDate || undefined}
                onChange={(input) => setEndDate(input.target.value)}
              />
            </label>
            <div className={`${formLabelClass} col-span-1 md:col-span-2 xl:col-span-2`}>
              Phân loại
              <CategoryPicker value={categories} onChange={setCategories} />
            </div>
            <div className={`${formLabelClass} col-span-1 md:col-span-2 xl:col-span-2`}>
              Sắp xếp
              <button
                className={`${compactSecondaryButtonClass} justify-start bg-white`}
                type="button"
                onClick={() =>
                  setSort((value) => (value === "asc" ? "desc" : "asc"))
                }
              >
                <ArrowDownAZ size={15} />
                {sort === "asc" ? "Cũ nhất trước" : "Mới nhất trước"}
              </button>
            </div>
            <div className="col-span-2 flex items-end md:col-span-2 xl:col-span-3">
              <button
                type="button"
                className={`${compactSecondaryButtonClass} w-full bg-white`}
                onClick={resetFilters}
              >
                <RotateCcw size={15} /> Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </section>

        {query.isLoading && (
          <div className={`${surfaceCardClass} p-6 text-sm text-ink-muted`}>
            Đang tải dòng thời gian…
          </div>
        )}
        {query.isError && (
          <div className={`${surfaceCardClass} p-6`}>
            <p>Không thể tải dòng thời gian.</p>
            <button
              className={compactSecondaryButtonClass}
              onClick={() => query.refetch()}
            >
              Thử lại
            </button>
          </div>
        )}
        {query.data && (
          <div className="grid w-full min-w-0 gap-4 xl:h-[max(34rem,calc(100dvh-23rem))] xl:grid-cols-[minmax(19rem,0.62fr)_minmax(0,1.38fr)] xl:overflow-hidden">
            <section
              className={`${surfaceCardClass} flex h-[min(38rem,calc(100dvh-8rem))] min-h-[28rem] min-w-0 flex-col overflow-hidden xl:h-full xl:min-h-0`}
              aria-label="Danh sách dòng thời gian"
            >
              <header className="flex shrink-0 items-center justify-between border-b border-border-default bg-[#f8faf9] px-4 py-3">
                <div>
                  <h2 className="m-0 font-display text-lg">Timeline</h2>
                  <p className="mt-0.5 mb-0 text-sm text-ink-subtle">
                    Chọn sự kiện để định vị trên lịch
                  </p>
                </div>
                <CalendarDays size={19} className="text-accent-deep" />
              </header>
              <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]">
                {!filtered.length && (
                  <div className="grid min-h-52 place-items-center p-6 text-center text-sm text-ink-muted">
                    Không có dấu mốc phù hợp với bộ lọc.
                  </div>
                )}
                <div className="relative min-h-full py-3 before:absolute before:top-0 before:bottom-0 before:left-[7.25rem] before:z-0 before:block before:w-px before:bg-[#78978a] before:content-['']">
                  {groups.map((group) => (
                    <section
                      key={group.date}
                      className="relative z-10 grid grid-cols-[6rem_minmax(0,1fr)] gap-6 px-4 pb-4 last:pb-1"
                    >
                      <div className="sticky top-2 z-10 self-start rounded-lg bg-[#edf3f0] px-2 py-2 text-right shadow-[0_1px_0_rgba(24,51,46,0.08)]">
                        <time
                          className="block font-display text-base font-bold text-ink"
                          dateTime={group.date}
                        >
                          {dayFormat.format(new Date(`${group.date}T00:00:00`))}
                        </time>
                        <span className="mt-1 block text-sm font-medium text-accent-deep">
                          {lunarLabel(new Date(`${group.date}T00:00:00`))}
                        </span>
                      </div>
                      <div className="min-w-0">
                        {group.entries.map((entry) => (
                          <TimelineRow
                            key={entry.id}
                            entry={entry}
                            treeId={treeId}
                            selected={entry.id === selectedId}
                            onFocus={() => focusOnCalendar(entry)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </section>
            <CalendarPanel
              entries={filtered}
              treeId={treeId}
              cursor={calendarMonth}
              onCursorChange={setCalendarMonth}
              selectedId={selectedId}
            />
          </div>
        )}
      </div>
      {formOpen && (
        <EventFormDialog
          onClose={() => setFormOpen(false)}
          onSave={(input) => create.mutate(input)}
          pending={create.isPending}
        />
      )}
    </main>
  );
}
