import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getTrees } from "../features/family-tree/api";
import { secondaryButtonClass } from "../lib/ui-classes";

const sectionHeadingClass =
  "mb-[1.2rem] flex items-center justify-between gap-4 [&>h2]:m-0 [&>h2]:font-display [&>h2]:text-[1.45rem] [&>h2]:font-semibold [&>span]:text-sm [&>span]:text-content-muted";
const treeGridClass =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] gap-[1.2rem]";
const emptyStateClass =
  "rounded-card border border-dashed border-[rgba(130,167,151,0.5)] bg-black/8 p-8 text-content-secondary [&>h3]:mt-0 [&>h3]:mb-[0.45rem] [&>h3]:text-content-primary [&>p]:m-0";

export function TreesPage() {
  const query = useQuery({ queryKey: ["trees"], queryFn: getTrees });
  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-[linear-gradient(150deg,#12211f_0%,#19342e_55%,#24483d_100%)] px-[max(1.25rem,calc((100vw-76rem)/2))] py-[clamp(2rem,5vw,4.5rem)] text-content-primary">
      <header>
        <p className="m-0 text-xs font-bold tracking-[0.13em] text-accent uppercase">
          KHÔNG GIAN GIA PHẢ
        </p>
        <h1 className="my-[0.7rem] font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-none font-semibold">
          Gia phả của bạn
        </h1>
        <span className="text-[1.05rem] text-content-secondary">
          Chọn một gia phả để khám phá các thế hệ và mối quan hệ.
        </span>
      </header>
      <section className="mt-14" aria-labelledby="owned-trees-title">
        <div className={sectionHeadingClass}>
          <h2 id="owned-trees-title">Gia phả của tôi</h2>
          {query.data && <span>{query.data.createdByMe.length} gia phả</span>}
        </div>
        {query.isLoading && (
          <div className={treeGridClass} aria-label="Đang tải">
            <div className="grid min-h-72 animate-[skeleton-pulse_1.2s_infinite_alternate] grid-rows-[7.5rem_1fr] overflow-hidden rounded-card border border-[rgba(130,167,151,0.4)] bg-[rgba(245,249,246,0.07)]" />
          </div>
        )}
        {query.isError && (
          <div className={`${emptyStateClass} [&_button]:mt-4`}>
            <h3>Không thể tải danh sách gia phả</h3>
            <button
              className={secondaryButtonClass}
              type="button"
              onClick={() => query.refetch()}
            >
              Thử lại
            </button>
          </div>
        )}
        {query.data?.createdByMe.length === 0 && (
          <div className={emptyStateClass}>
            <h3>Chưa có gia phả</h3>
            <p>Dữ liệu gia phả mẫu sẽ xuất hiện sau khi chạy seed.</p>
          </div>
        )}
        <div className={treeGridClass}>
          {query.data?.createdByMe.map((tree) => (
            <Link
              className="grid min-h-72 grid-rows-[7.5rem_1fr] overflow-hidden rounded-card border border-[rgba(130,167,151,0.4)] bg-[rgba(245,249,246,0.07)] text-inherit no-underline shadow-none transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-[3px] hover:border-accent hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] focus-visible:-translate-y-[3px] focus-visible:border-accent focus-visible:shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
              to={`/trees/${tree.id}`}
              key={tree.id}
            >
              <div className="grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#476f61,#1b352f)] font-display text-[2rem] font-semibold text-accent [&_img]:size-full [&_img]:object-cover">
                {tree.coverUrl ? (
                  <img src={tree.coverUrl} alt="" />
                ) : (
                  <span>⌘</span>
                )}
              </div>
              <div className="flex flex-col p-[1.15rem]">
                <p className="m-0 text-xs font-bold tracking-[0.13em] text-accent uppercase">
                  {tree.originPlace ?? "Chưa cập nhật nguồn gốc"}
                </p>
                <h3 className="mt-[0.45rem] mb-[0.55rem] font-display text-[1.3rem] font-semibold">
                  {tree.name}
                </h3>
                <span className="leading-normal text-content-secondary">
                  {tree.description ?? "Chưa có mô tả"}
                </span>
                <footer className="mt-auto flex items-baseline gap-[0.35rem] pt-4 text-sm text-content-muted">
                  <strong className="text-white">{tree.personCount}</strong>{" "}
                  thành viên <b className="ml-auto text-accent">Khám phá →</b>
                </footer>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-14" aria-labelledby="shared-trees-title">
        <div className={sectionHeadingClass}>
          <h2 id="shared-trees-title">Được chia sẻ với tôi</h2>
          <span>Sắp ra mắt</span>
        </div>
        <div className={emptyStateClass}>
          <h3>Chưa có gia phả được chia sẻ</h3>
          <p>Tính năng chia sẻ sẽ được bổ sung trong phiên bản tiếp theo.</p>
        </div>
      </section>
    </main>
  );
}
