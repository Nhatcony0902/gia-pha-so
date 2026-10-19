import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { getTreePersons } from "../features/family-tree/api";
import { secondaryButtonClass, surfaceCardClass } from "../lib/ui-classes";

type TimelineEvent = {
  date: string;
  personId: string;
  personName: string;
  kind: "birth" | "death";
  place: string | null;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));

export function TimelinePage() {
  const { treeId = "" } = useParams();
  const query = useQuery({
    queryKey: ["tree-persons", treeId],
    queryFn: () => getTreePersons(treeId),
    enabled: Boolean(treeId),
  });
  const events: TimelineEvent[] = (query.data?.persons ?? [])
    .flatMap((person) => {
      const result: TimelineEvent[] = [];
      if (person.birthDate)
        result.push({
          date: person.birthDate,
          personId: person.id,
          personName: person.fullName,
          kind: "birth",
          place: person.birthPlace,
        });
      if (person.deathDate)
        result.push({
          date: person.deathDate,
          personId: person.id,
          personName: person.fullName,
          kind: "death",
          place: person.deathPlace,
        });
      return result;
    })
    .sort((left, right) => left.date.localeCompare(right.date));

  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-surface-page px-5 py-6 text-ink md:px-8">
      <div className="mx-auto max-w-5xl">
        <Breadcrumbs
          items={[
            { label: "Trang chủ", to: "/" },
            { label: "Danh sách gia phả", to: "/trees" },
            {
              label: query.data?.tree.name ?? "Gia phả",
              to: `/trees/${treeId}/tree`,
            },
            { label: "Dòng thời gian" },
          ]}
          className="mb-7"
        />
        <header className="mb-8">
          <p className="m-0 text-xs font-bold tracking-widest text-accent-deep uppercase">
            Lịch sử gia đình
          </p>
          <h1 className="mt-2 mb-2 font-display text-3xl">Dòng thời gian</h1>
          <p className="m-0 text-ink-muted">
            Các dấu mốc sinh và mất của thành viên trong gia phả đang chọn.
          </p>
        </header>

        {query.isLoading && (
          <p className="text-ink-muted">Đang tải dòng thời gian…</p>
        )}
        {query.isError && (
          <section className={`${surfaceCardClass} p-6`}>
            <h2 className="mt-0 font-display text-xl">
              Không thể tải dòng thời gian
            </h2>
            <button
              className={secondaryButtonClass}
              type="button"
              onClick={() => query.refetch()}
            >
              Thử lại
            </button>
          </section>
        )}
        {query.data && events.length === 0 && (
          <section className="rounded-xl border border-dashed border-[#aebfb6] bg-white/60 p-8 text-center text-ink-muted">
            <CalendarDays className="mx-auto mb-3" aria-hidden="true" />
            <h2 className="mb-2 font-display text-xl text-ink">
              Chưa có dấu mốc
            </h2>
            <p className="m-0">
              Bổ sung ngày sinh hoặc ngày mất trong hồ sơ thành viên để tạo dòng
              thời gian.
            </p>
          </section>
        )}
        {events.length > 0 && (
          <ol className="relative m-0 list-none border-l-2 border-[#b8c9c0] p-0 pl-7">
            {events.map((event) => (
              <li
                key={`${event.personId}-${event.kind}`}
                className={`${surfaceCardClass} relative mb-5 p-5 last:mb-0`}
              >
                <span
                  className={`absolute top-6 -left-[2.22rem] size-4 rounded-full border-4 border-surface-page ${event.kind === "birth" ? "bg-[#3e7968]" : "bg-[#8a6a63]"}`}
                />
                <time
                  className="text-sm font-bold text-[#805824]"
                  dateTime={event.date}
                >
                  {formatDate(event.date)}
                </time>
                <h2 className="mt-1 mb-1 font-display text-xl">
                  {event.kind === "birth" ? "Ngày sinh" : "Ngày mất"} ·{" "}
                  <Link
                    className="text-ink-strong underline decoration-[#a9bdb3] underline-offset-4"
                    to={`/trees/${treeId}/persons/${event.personId}`}
                  >
                    {event.personName}
                  </Link>
                </h2>
                {event.place && (
                  <p className="m-0 text-sm text-ink-muted">
                    Địa điểm: {event.place}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
