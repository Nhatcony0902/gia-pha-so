import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FamilyTreeInput,
  FamilyTreeSummary,
} from "@family-tree/shared-types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useNotifications } from "../app/providers/NotificationProvider";
import { PageBreadcrumbBar, PageHeading } from "../components/PageHeader";
import {
  createTree,
  deleteTree,
  getTrees,
  updateTree,
} from "../features/family-tree/api";
import { TreeFormDialog } from "../features/family-tree/ManagementDialogs";
import { roleLabel } from "../features/sharing/api";
import {
  compactDangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../lib/ui-classes";

const sectionHeadingClass =
  "mb-[1.2rem] flex items-center justify-between gap-4 [&>h2]:m-0 [&>h2]:font-display [&>h2]:text-[1.3rem] [&>h2]:font-semibold [&>span]:text-sm [&>span]:text-content-muted";
const treeGridClass =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] gap-4";
const treeCardClass =
  "overflow-hidden rounded-card border border-[rgba(130,167,151,0.4)] bg-[rgba(245,249,246,0.07)] transition-[border-color,background-color] duration-200 hover:border-accent hover:bg-[rgba(245,249,246,0.1)]";
const treeEditButtonClass =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-control border border-accent bg-accent px-3 py-1.5 text-sm font-bold text-[#182b27] hover:not-disabled:bg-[#e6bd77] disabled:cursor-not-allowed disabled:opacity-55";
const emptyStateClass =
  "rounded-card border border-dashed border-[rgba(130,167,151,0.5)] bg-black/8 p-8 text-content-secondary [&>h3]:mt-0 [&>h3]:mb-[0.45rem] [&>h3]:text-content-primary [&>p]:m-0";

function TreeCard({
  tree,
  onEdit,
  onDelete,
  deleting,
}: {
  tree: FamilyTreeSummary;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <article className={`${treeCardClass} grid min-h-64 grid-rows-[1fr_auto]`}>
      <Link
        className="grid grid-rows-[5.5rem_1fr] text-inherit no-underline"
        to={`/trees/${tree.id}/tree`}
      >
        <div className="grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#476f61,#1b352f)] font-display text-[1.75rem] font-semibold text-accent [&_img]:size-full [&_img]:object-cover">
          {tree.coverUrl ? <img src={tree.coverUrl} alt="" /> : <span>⌘</span>}
        </div>
        <div className="flex flex-col p-4 pb-3">
          <p className="m-0 text-xs font-bold tracking-[0.13em] text-accent uppercase">
            {tree.originPlace ?? "Chưa cập nhật nguồn gốc"}
          </p>
          <h3 className="mt-[0.45rem] mb-[0.55rem] font-display text-[1.15rem] font-semibold">
            {tree.name}
          </h3>
          <span className="line-clamp-2 text-sm leading-normal text-content-secondary">
            {tree.description ?? "Chưa có mô tả"}
          </span>
          <div className="mt-auto flex items-baseline gap-[0.35rem] pt-4 text-sm text-content-muted">
            <strong className="text-white">{tree.personCount}</strong> thành
            viên
            <b className="ml-auto text-accent">Khám phá →</b>
          </div>
        </div>
      </Link>
      <footer className="flex justify-end gap-2 border-t border-[rgba(130,167,151,0.28)] px-4 py-2.5">
        <button type="button" className={treeEditButtonClass} onClick={onEdit}>
          <Pencil size={15} /> Sửa
        </button>
        <button
          type="button"
          className={compactDangerButtonClass}
          disabled={deleting}
          onClick={onDelete}
        >
          <Trash2 size={15} /> {deleting ? "Đang xóa…" : "Xóa"}
        </button>
      </footer>
    </article>
  );
}

export function TreesPage() {
  const client = useQueryClient();
  const notice = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; tree: FamilyTreeSummary } | null
  >(searchParams.get("create") === "1" ? { mode: "create" } : null);
  const closeDialog = () => {
    setDialog(null);
    if (searchParams.has("create")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("create");
      setSearchParams(nextParams, { replace: true });
    }
  };
  const query = useQuery({ queryKey: ["trees"], queryFn: getTrees });
  const save = useMutation({
    mutationFn: (input: FamilyTreeInput) =>
      dialog?.mode === "edit"
        ? updateTree(dialog.tree.id, input)
        : createTree(input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["trees"] });
      notice.toast(
        dialog?.mode === "edit" ? "Đã cập nhật gia phả" : "Đã tạo gia phả",
        "success",
      );
      closeDialog();
    },
    onError: (error) =>
      notice.alert(
        "Không thể lưu gia phả",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      ),
  });
  const remove = useMutation({
    mutationFn: deleteTree,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["trees"] });
      notice.toast("Đã xóa gia phả", "success");
    },
    onError: (error) =>
      notice.alert(
        "Không thể xóa gia phả",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      ),
  });
  const requestDelete = async (tree: FamilyTreeSummary) => {
    const accepted = await notice.confirm(
      "Xóa gia phả",
      `Xóa “${tree.name}”, toàn bộ quan hệ và ${tree.personCount} thành viên chỉ thuộc gia phả này? Hành động này không thể hoàn tác.`,
    );
    if (accepted) remove.mutate(tree.id);
  };
  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-[linear-gradient(150deg,#203a34_0%,#29483e_55%,#355b4a_100%)] px-[max(1.25rem,calc((100vw-76rem)/2))] py-[clamp(1.5rem,3vw,3rem)] text-content-primary">
      <PageBreadcrumbBar
        items={[
          { label: "Trang chủ", to: "/" },
          { label: "Danh sách gia phả" },
        ]}
        light
        headerClassName="mb-7"
        contentClassName="flex items-center"
      />
      <PageHeading
        className="mb-0"
        eyebrow="KHÔNG GIAN GIA PHẢ"
        eyebrowClassName="m-0 text-xs font-bold tracking-[0.13em] text-accent uppercase"
        title="Gia phả của bạn"
        titleClassName="my-[0.7rem] font-display text-[clamp(1.9rem,3vw,2.8rem)] leading-tight font-semibold"
      />
      <section className="mt-9" aria-labelledby="owned-trees-title">
        <div className={sectionHeadingClass}>
          <h2 id="owned-trees-title">Gia phả của tôi</h2>
          <div className="flex items-center gap-3">
            {query.data && <span>{query.data.createdByMe.length} gia phả</span>}
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => setDialog({ mode: "create" })}
            >
              <Plus size={18} /> Thêm gia phả
            </button>
          </div>
        </div>
        {query.isLoading && (
          <div className={treeGridClass} aria-label="Đang tải">
            <div className="grid min-h-64 animate-[skeleton-pulse_1.2s_infinite_alternate] grid-rows-[5.5rem_1fr] overflow-hidden rounded-card border border-[rgba(130,167,151,0.4)] bg-[rgba(245,249,246,0.07)]" />
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
            <p>Hãy tạo gia phả đầu tiên để bắt đầu thêm các thành viên.</p>
          </div>
        )}
        <div className={treeGridClass}>
          {query.data?.createdByMe.map((tree) => (
            <TreeCard
              tree={tree}
              key={tree.id}
              onEdit={() => setDialog({ mode: "edit", tree })}
              onDelete={() => void requestDelete(tree)}
              deleting={remove.isPending && remove.variables === tree.id}
            />
          ))}
        </div>
      </section>
      <section className="mt-9" aria-labelledby="shared-trees-title">
        <div className={sectionHeadingClass}>
          <h2 id="shared-trees-title">Được chia sẻ với tôi</h2>
          {query.data && <span>{query.data.sharedWithMe.length} gia phả</span>}
        </div>
        {query.data?.sharedWithMe.length === 0 && (
          <div className={emptyStateClass}>
            <h3>Chưa có gia phả được chia sẻ</h3>
            <p>Các gia phả người khác chia sẻ với bạn sẽ xuất hiện tại đây.</p>
          </div>
        )}
        <div className={treeGridClass}>
          {query.data?.sharedWithMe.map((tree) => (
            <Link
              key={tree.id}
              to={`/trees/${tree.id}/tree`}
              className={`${treeCardClass} grid min-h-48 grid-rows-[1fr] p-4 text-content-primary no-underline`}
            >
              <span className="text-xs font-bold tracking-[0.13em] text-accent uppercase">
                {tree.originPlace ?? "Gia phả được chia sẻ"}
              </span>
              <strong className="mt-2 text-base">{tree.name}</strong>
              <span className="mt-2 text-sm text-content-secondary">
                {tree.description ?? "Chưa có mô tả"}
              </span>
              <span className="mt-auto pt-4 text-sm text-content-muted">
                <strong className="text-content-primary">
                  {tree.personCount}
                </strong>{" "}
                thành viên · Bạn là {roleLabel[tree.myRole].toLowerCase()}
              </span>
            </Link>
          ))}
        </div>
      </section>
      {dialog && (
        <TreeFormDialog
          tree={dialog.mode === "edit" ? dialog.tree : undefined}
          pending={save.isPending}
          onClose={() => !save.isPending && closeDialog()}
          onSubmit={(value) => save.mutate(value)}
        />
      )}
    </main>
  );
}
