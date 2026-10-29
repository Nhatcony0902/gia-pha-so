import { useQuery } from "@tanstack/react-query";
import type { EventCategory, TimelineEntry } from "@family-tree/shared-types";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageBreadcrumbBar, PageHeading } from "../components/PageHeader";
import { getTimeline } from "../features/events/api";
import {
  categoryLabel,
  categoryTone,
  eventCategories,
} from "../features/events/constants";
import { StyledCheckbox } from "../features/family-tree/ListFilterControls";
import {
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formInputClass,
  formSelectClass,
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
const lunarLabel = (date: Date, includeYear = true) => {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-chinese", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(date);
    const part = (type: string) =>
      parts.find((item) => String(item.type) === type)?.value ?? "";
    const lunarDay = part("day").match(/\d+/)?.[0].padStart(2, "0") ?? "";
    const lunarMonth = part("month").match(/\d+/)?.[0].padStart(2, "0") ?? "";
    const lunarYear = part("relatedYear") || String(date.getFullYear());
    return includeYear
      ? `${lunarDay}/${lunarMonth}/${lunarYear}`
      : `${lunarDay}/${lunarMonth}`;
  } catch {
    return "Âm lịch";
  }
};
const eventTime = (entry: TimelineEntry) =>
  entry.kind !== "EVENT"
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
        className={`${compactSecondaryButtonClass} min-h-11 w-fit whitespace-nowrap bg-white`}
        onClick={() => {
          setDraft(value);
          setOpen((current) => !current);
        }}
      >
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <Columns3 size={16} /> Danh mục ({value.length}/{allCategories.length})
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 flex max-h-[26rem] w-72 flex-col rounded-xl border border-border-control bg-white p-2">
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
      onClick={(event) => event.stopPropagation()}
      className={`block w-full min-w-0 overflow-hidden rounded-md border border-l-[3px] px-2 py-1.5 text-ink no-underline transition-colors ${selected ? "border-focus bg-[#e9f1ed]" : "border-transparent bg-[#f5f8f6] hover:bg-[#e9f1ed]"}`}
      style={{
        borderLeftColor: selected
          ? "var(--color-focus)"
          : categoryTone[entry.category],
      }}
      title={entry.title}
    >
      <strong
        className="line-clamp-2 min-w-0 text-xs leading-4"
        title={entry.title}
      >
        {entry.title}
      </strong>
      <span className="block min-w-0 truncate text-[0.7rem] text-ink-subtle">
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
  onDateSelect,
  selectedId,
}: {
  entries: TimelineEntry[];
  treeId: string;
  cursor: Date;
  onCursorChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  selectedId: string | null;
}) {
  const now = new Date();
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const leadingDays = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();
  const visibleDayCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const days = Array.from({ length: visibleDayCount }, (_, index) => {
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
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border-default px-3 py-2">
        <button
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-control border-0 bg-transparent text-ink-soft transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"
          type="button"
          aria-label="Tháng trước"
          title="Tháng trước"
          onClick={() =>
            onCursorChange(
              new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
            )
          }
        >
          <ChevronLeft size={17} />
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2">
          <h2 className="m-0 whitespace-nowrap font-display text-lg capitalize">
            {monthFormat.format(cursor)}
          </h2>
        </div>
        <button
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-control border-0 bg-transparent text-ink-soft transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"
          type="button"
          aria-label="Tháng sau"
          title="Tháng sau"
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
              const isSelected = dayKey(date) === dayKey(cursor);
              const dayEntries = grouped.get(dayKey(date)) ?? [];
              return (
                <div
                  key={date.toISOString()}
                  onClick={inMonth ? () => onDateSelect(date) : undefined}
                  className={`min-w-0 p-2 transition-colors ${isSelected ? "cursor-pointer border border-focus bg-[#f8fbf9]" : `border-r border-b border-border-default ${inMonth ? "cursor-pointer bg-white hover:bg-[#f8fbf9]" : "bg-[#f3f5f4] text-[#9aa7a1]"}`}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-1">
                    <button
                      type="button"
                      aria-label={`Chuyển đến ngày ${dayFormat.format(date)}`}
                      disabled={!inMonth}
                      onClick={() => onDateSelect(date)}
                      className={`grid size-7 place-items-center rounded-full border-0 text-sm font-bold ${inMonth ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" : "cursor-default"} ${isToday ? "bg-[#285f51] text-white" : "bg-transparent text-inherit"}`}
                    >
                      {date.getDate()}
                    </button>
                    <span className="max-w-24 truncate text-xs font-medium text-[#987136]">
                      {lunarLabel(date, false)}
                    </span>
                  </div>
                  <div className="grid min-w-0 gap-1.5 overflow-hidden">
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
  const detailPath = entry.eventId
    ? `/trees/${treeId}/events/${entry.eventId}`
    : `/trees/${treeId}/persons/${entry.personId}`;
  const marker = (
    <>
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-5 z-10 h-px w-5 bg-[#78978a]"
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-[1.55rem] z-10 size-2.5 -translate-y-1/2 rounded-full border-2 border-white"
        style={{ backgroundColor: categoryTone[entry.category] }}
      />
    </>
  );
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onFocus();
      }}
      className={`group relative mb-2 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 outline-none transition-colors last:mb-0 hover:bg-[#f8fbf9] focus-visible:border-focus ${selected ? "border-focus bg-[#f8fbf9]" : "border-border-default bg-white hover:border-[#9eb4aa]"}`}
    >
      {marker}
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#e1ebe6] text-ink-subtle">
        {entry.imageUrl ? (
          <img src={entry.imageUrl} alt="" className="size-full object-cover" />
        ) : entry.kind === "EVENT" ? (
          <CalendarDays size={19} />
        ) : (
          <UserRound size={19} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="line-clamp-2 text-sm leading-5" title={entry.title}>
          {entry.title}
        </strong>
        <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-subtle">
          <span>{categoryLabel[entry.category]}</span>
          {entry.eventId && <span>{eventTime(entry)}</span>}
          {entry.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {entry.location}
            </span>
          )}
        </span>
      </span>
      <Link
        to={detailPath}
        onClick={(event) => event.stopPropagation()}
        className="group/detail inline-flex shrink-0 items-center gap-1 text-xs font-bold text-accent-deep no-underline hover:underline hover:underline-offset-2"
      >
        Chi tiết
        <ChevronRight
          size={14}
          className="transition-transform group-hover/detail:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

export function TimelinePage() {
  const { treeId = "" } = useParams();
  const navigate = useNavigate();
  const now = new Date();
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [categories, setCategories] = useState<VisibleCategory[]>(() =>
    allCategories.map(([key]) => key),
  );
  const [calendarMonth, setCalendarMonth] = useState(() => now);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["timeline", treeId],
    queryFn: () => getTimeline(treeId),
    enabled: Boolean(treeId),
  });
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return [...(query.data?.entries ?? [])]
      .filter((entry) => categories.includes(entry.category))
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
  }, [query.data?.entries, categories, search, sort]);
  const groups = useMemo(() => {
    const result: Array<{ date: string; entries: TimelineEntry[] }> = [];
    for (const entry of filtered) {
      const key = dayKey(entry.startAt);
      const previous = result.at(-1);
      if (previous?.date === key) previous.entries.push(entry);
      else result.push({ date: key, entries: [entry] });
    }
    if (
      filtered.length > 0 &&
      selectedDate &&
      !result.some((group) => group.date === selectedDate)
    ) {
      result.push({ date: selectedDate, entries: [] });
    }
    result.sort(
      (left, right) =>
        (sort === "asc" ? 1 : -1) * left.date.localeCompare(right.date),
    );
    return result;
  }, [filtered, selectedDate, sort]);
  useEffect(() => {
    if (!selectedDate || !query.data) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`timeline-day-${selectedDate}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedDate, groups, query.data]);
  const focusOnCalendar = (entry: TimelineEntry) => {
    const date = new Date(entry.startAt);
    setSelectedDate(dayKey(date));
    setSelectedId(entry.id);
    setCalendarMonth(date);
  };
  const focusDate = (date: Date) => {
    setSelectedDate(dayKey(date));
    setSelectedId(null);
    setCalendarMonth(date);
  };
  const resetFilters = () => {
    setSearch("");
    setSelectedDate("");
    setSort("desc");
    setCategories(allCategories.map(([key]) => key));
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface-page px-4 py-4 text-ink md:px-6">
      <PageBreadcrumbBar
        headerClassName="z-3 -mx-4 -mt-4 mb-6 border-b border-border-default bg-[rgba(249,251,250,0.96)] px-5 md:-mx-6"
        contentClassName="w-full justify-between gap-4"
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
          <span>{query.data?.entries.length ?? 0} dấu mốc</span>
          {query.data?.canManage && (
            <div className="flex items-center gap-2">
              <button
                className={compactPrimaryButtonClass}
                type="button"
                onClick={() => navigate(`/trees/${treeId}/events/new`)}
              >
                <Plus size={16} /> Thêm sự kiện
              </button>
            </div>
          )}
        </div>
      </PageBreadcrumbBar>
      <div className="mx-auto max-w-[120rem]">
        <div className="mb-4 grid items-center gap-4 xl:grid-cols-[minmax(12rem,0.35fr)_minmax(0,2fr)]">
          <PageHeading
            className="mb-0"
            title="Dòng thời gian"
          />
          <section
            aria-label="Bộ lọc dòng thời gian"
          >
            <div className="flex flex-wrap justify-end gap-3">
              <div className="w-[min(20rem,calc(100vw-2rem))]">
                <span className="relative">
                  <Search
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
                    size={15}
                  />
                  <input
                    className={`${formInputClass} py-2 pl-9 text-sm`}
                    aria-label="Tìm kiếm sự kiện"
                    value={search}
                    onChange={(input) => setSearch(input.target.value)}
                    placeholder="Tên sự kiện, thành viên, địa điểm…"
                  />
                </span>
              </div>
              <div className="w-fit">
                <input
                  type="date"
                  className={`${formInputClass} w-fit py-2 text-sm`}
                  aria-label="Lọc và chuyển đến ngày"
                  value={selectedDate}
                  onChange={(input) => {
                    if (input.target.value) {
                      focusDate(new Date(`${input.target.value}T00:00:00`));
                    } else {
                      setSelectedDate("");
                      setSelectedId(null);
                    }
                  }}
                />
              </div>
              <div className="w-fit">
                <select
                  className={`${formSelectClass} min-h-11 w-fit py-2 text-sm`}
                  aria-label="Sắp xếp theo thời gian"
                  value={sort}
                  onChange={(input) =>
                    setSort(input.target.value as typeof sort)
                  }
                >
                  <option value="desc">Mới nhất</option>
                  <option value="asc">Cũ nhất</option>
                </select>
              </div>
              <div className="w-fit">
                <CategoryPicker value={categories} onChange={setCategories} />
              </div>
              <div className="flex w-fit items-end">
                <button
                  type="button"
                  className={`${compactSecondaryButtonClass} min-h-11 w-fit whitespace-nowrap bg-white`}
                  onClick={resetFilters}
                >
                  <RotateCcw size={15} /> Đặt lại bộ lọc
                </button>
              </div>
            </div>
          </section>
        </div>

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
          <div className="grid w-full min-w-0 gap-4 xl:h-[max(38rem,calc(100dvh-16rem))] xl:grid-cols-[minmax(19rem,0.9fr)_minmax(0,1.6fr)]">
            <section
              className={`${surfaceCardClass} flex h-[min(38rem,calc(100dvh-8rem))] min-h-[28rem] min-w-0 flex-col overflow-hidden xl:h-full xl:min-h-0`}
              aria-label="Danh sách dòng thời gian"
            >
              <header className="flex shrink-0 items-center justify-between border-b border-border-default bg-[#f8faf9] px-4 py-3">
                <div>
                  <h2 className="m-0 font-display text-lg">Timeline</h2>
                </div>
                <CalendarDays size={19} className="text-accent-deep" />
              </header>
              <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]">
                {!filtered.length && (
                  <div className="grid min-h-52 place-items-center p-6 text-center text-sm text-ink-muted">
                    Không có dấu mốc phù hợp với bộ lọc.
                  </div>
                )}
                <div
                  className={`relative min-h-full py-3 ${filtered.length ? "before:absolute before:top-0 before:bottom-0 before:left-[7.25rem] before:z-0 before:block before:w-px before:bg-[#78978a] before:content-['']" : ""}`}
                >
                  {groups.map((group) => (
                    <section
                      key={group.date}
                      id={`timeline-day-${group.date}`}
                      className="relative z-10 grid grid-cols-[6rem_minmax(0,1fr)] gap-6 px-4 pb-4 last:pb-1"
                    >
                      <div className="sticky top-2 z-10 self-start rounded-lg bg-[#edf3f0] px-2 py-2 text-right">
                        <time
                          className="block font-display text-sm font-bold text-ink"
                          dateTime={group.date}
                        >
                          {dayFormat.format(new Date(`${group.date}T00:00:00`))}
                        </time>
                        <span className="mt-1 block text-xs font-medium text-accent-deep">
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
              onDateSelect={focusDate}
              selectedId={selectedId}
            />
          </div>
        )}
      </div>
    </main>
  );
}
