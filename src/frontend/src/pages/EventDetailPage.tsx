import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FamilyEventInput } from "@family-tree/shared-types";
import {
  CalendarClock,
  Download,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageBreadcrumbBar } from "../components/PageHeader";
import { useNotifications } from "../app/providers/NotificationProvider";
import {
  addEventGuests,
  addEventMedia,
  deleteEvent,
  deleteEventGuest,
  deleteEventMedia,
  getEvent,
  updateEvent,
  uploadEventFile,
} from "../features/events/api";
import { categoryLabel, categoryTone } from "../features/events/constants";
import { EventFormDialog } from "../features/events/EventFormDialog";
import { getTreeMembers } from "../features/sharing/api";
import {
  compactDangerButtonClass,
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formFieldClass,
  surfaceCardClass,
} from "../lib/ui-classes";

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "full",
  timeStyle: "short",
});
const shortDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Vui lòng thử lại";

export function EventDetailPage() {
  const { treeId = "", eventId = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const notice = useNotifications();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const event = useQuery({
    queryKey: ["event", treeId, eventId],
    queryFn: () => getEvent(treeId, eventId),
    enabled: Boolean(treeId && eventId),
  });
  const members = useQuery({
    queryKey: ["tree-members", treeId],
    queryFn: () => getTreeMembers(treeId),
    enabled: Boolean(event.data?.canManage),
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["event", treeId, eventId] }),
      client.invalidateQueries({ queryKey: ["timeline", treeId] }),
      client.invalidateQueries({ queryKey: ["app-notifications"] }),
    ]);
  };
  const update = useMutation({
    mutationFn: (body: FamilyEventInput) => updateEvent(treeId, eventId, body),
    onSuccess: async () => {
      await refresh();
      setEditing(false);
      notice.toast("Đã cập nhật sự kiện", "success");
    },
    onError: (error) => notice.alert("Không thể cập nhật", errorText(error)),
  });
  const addGuests = useMutation({
    mutationFn: (emails: string[]) =>
      addEventGuests(treeId, eventId, { emails }),
    onSuccess: async () => {
      await refresh();
      setEmail("");
      notice.toast("Đã cập nhật danh sách khách mời", "success");
    },
    onError: (error) =>
      notice.alert("Không thể thêm khách mời", errorText(error)),
  });
  const removeGuest = useMutation({
    mutationFn: (guestId: string) => deleteEventGuest(treeId, eventId, guestId),
    onSuccess: refresh,
    onError: (error) =>
      notice.alert("Không thể xóa khách mời", errorText(error)),
  });
  const removeMedia = useMutation({
    mutationFn: (mediaId: string) => deleteEventMedia(treeId, eventId, mediaId),
    onSuccess: refresh,
    onError: (error) => notice.alert("Không thể xóa tư liệu", errorText(error)),
  });
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const uploaded = await uploadEventFile(treeId, eventId, file);
        await addEventMedia(treeId, eventId, {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          type: file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT",
          originalName: file.name,
          mimeType: file.type || null,
          format: uploaded.format ?? null,
          bytes: uploaded.bytes ?? file.size,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
        });
      }
    },
    onSuccess: async () => {
      await refresh();
      notice.toast("Đã tải tư liệu lên", "success");
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (error) => notice.alert("Không thể tải tư liệu", errorText(error)),
  });
  const invitedEmails = new Set(
    event.data?.guests.map((guest) => guest.email.toLowerCase()) ?? [],
  );
  const uninvitedMembers = useMemo(
    () =>
      (members.data?.members ?? []).filter(
        (member) => !invitedEmails.has(member.email.toLowerCase()),
      ),
    [members.data?.members, event.data?.guests],
  );
  const availableMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    return uninvitedMembers.filter(
      (member) =>
        !keyword ||
        `${member.name} ${member.email}`.toLowerCase().includes(keyword),
    );
  }, [uninvitedMembers, memberSearch]);
  const images =
    event.data?.media.filter((item) => item.type === "IMAGE") ?? [];
  const documents =
    event.data?.media.filter((item) => item.type === "DOCUMENT") ?? [];

  if (event.isLoading)
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface-page p-6 text-ink-muted">
        Đang tải sự kiện…
      </main>
    );
  if (event.isError || !event.data)
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface-page p-6 text-ink">
        <section className={`${surfaceCardClass} mx-auto max-w-3xl p-6`}>
          <h1 className="font-display text-xl">Không thể mở sự kiện</h1>
          <button
            className={compactSecondaryButtonClass}
            onClick={() => navigate(`/trees/${treeId}/timeline`)}
          >
            Về dòng thời gian
          </button>
        </section>
      </main>
    );
  const detail = event.data;
  const submitEmail = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (email.trim()) addGuests.mutate([email.trim()]);
  };
  const removeEvent = async () => {
    if (
      !(await notice.confirm(
        "Xóa sự kiện?",
        "Sự kiện, danh sách khách mời và toàn bộ tư liệu đính kèm sẽ bị xóa khỏi hệ thống.",
      ))
    )
      return;
    try {
      await deleteEvent(treeId, eventId);
      notice.toast("Đã xóa sự kiện", "success");
      navigate(`/trees/${treeId}/timeline`);
    } catch (error) {
      notice.alert("Không thể xóa sự kiện", errorText(error));
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface-page px-4 py-5 text-ink md:px-6">
      <div className="mx-auto max-w-[92rem]">
        <PageBreadcrumbBar
          items={[
            { label: "Danh sách gia phả", to: "/trees" },
            { label: detail.treeName, to: `/trees/${treeId}/tree` },
            { label: "Dòng thời gian", to: `/trees/${treeId}/timeline` },
            { label: detail.title },
          ]}
          headerClassName="mb-4"
          contentClassName="flex items-center"
        />
        <header className={`${surfaceCardClass} mb-4 overflow-hidden`}>
          <div
            className="h-1.5"
            style={{ background: categoryTone[detail.category] }}
          />
          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-[#edf3ef] px-2.5 py-1 text-[0.7rem] font-bold text-ink-soft">
                {categoryLabel[detail.category]}
              </span>
              <h1 className="mt-2 mb-2 font-display text-2xl md:text-3xl">
                {detail.title}
              </h1>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={15} />
                  {detail.isAllDay
                    ? shortDate.format(new Date(detail.startAt))
                    : dateTime.format(new Date(detail.startAt))}
                  {detail.endAt
                    ? ` – ${detail.isAllDay ? shortDate.format(new Date(detail.endAt)) : dateTime.format(new Date(detail.endAt))}`
                    : ""}
                </span>
                {detail.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={15} />
                    {detail.location}
                  </span>
                )}
              </div>
            </div>
            {detail.canManage && (
              <div className="flex gap-2">
                <button
                  className={compactSecondaryButtonClass}
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={15} /> Sửa
                </button>
                <button
                  className={compactDangerButtonClass}
                  onClick={() => void removeEvent()}
                >
                  <Trash2 size={15} /> Xóa
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.9fr)]">
          <div className="grid content-start gap-4">
            <section className={`${surfaceCardClass} p-5`}>
              <h2 className="mt-0 mb-3 font-display text-lg">
                Thông tin sự kiện
              </h2>
              <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
                {detail.description || "Chưa có mô tả cho sự kiện này."}
              </p>
              <p className="mt-4 mb-0 border-t border-border-default pt-3 text-xs text-ink-subtle">
                Tạo bởi {detail.createdBy.name} · cập nhật{" "}
                {dateTime.format(new Date(detail.updatedAt))}
              </p>
            </section>

            <section className={`${surfaceCardClass} p-5`}>
              <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="m-0 font-display text-lg">Ảnh & tài liệu</h2>
                  <p className="mt-1 mb-0 text-xs text-ink-subtle">
                    Lưu trữ trên Cloudinary; nhấn vào tư liệu để xem.
                  </p>
                </div>
                {detail.canManage && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      onChange={(input) =>
                        input.target.files?.length &&
                        upload.mutate(Array.from(input.target.files))
                      }
                    />
                    <button
                      className={compactPrimaryButtonClass}
                      disabled={!detail.canUploadMedia || upload.isPending}
                      title={
                        !detail.canUploadMedia
                          ? "Có thể tải lên sau khi sự kiện kết thúc"
                          : undefined
                      }
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={15} />
                      {upload.isPending ? "Đang tải…" : "Tải tư liệu"}
                    </button>
                  </>
                )}
              </header>
              {detail.canManage && !detail.canUploadMedia && (
                <p className="rounded-lg bg-[#fff7e8] px-3 py-2 text-xs text-[#7a571e]">
                  Tính năng tải ảnh và tài liệu sẽ mở sau khi sự kiện kết thúc.
                </p>
              )}
              {!detail.media.length && (
                <div className="rounded-xl border border-dashed border-border-default p-7 text-center text-sm text-ink-muted">
                  <ImageIcon className="mx-auto mb-2" size={22} />
                  Chưa có tư liệu nào.
                </div>
              )}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((item) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-lg border border-border-default bg-[#eef3f0]"
                    >
                      <button
                        className="block aspect-square w-full cursor-zoom-in border-0 bg-transparent p-0"
                        onClick={() => setPreview(item.url)}
                      >
                        <img
                          src={item.url}
                          alt={item.originalName}
                          className="size-full object-cover"
                        />
                      </button>
                      {detail.canManage && (
                        <button
                          className="absolute top-1.5 right-1.5 grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-black/60 text-white opacity-0 group-hover:opacity-100"
                          onClick={() => removeMedia.mutate(item.id)}
                          aria-label={`Xóa ${item.originalName}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {documents.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {documents.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-border-default px-3 py-2"
                    >
                      <FileText
                        size={19}
                        className="shrink-0 text-accent-deep"
                      />
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-ink"
                      >
                        {item.originalName}
                      </a>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Xem ${item.originalName}`}
                        className="text-ink-subtle"
                      >
                        <Download size={16} />
                      </a>
                      {detail.canManage && (
                        <button
                          className="cursor-pointer border-0 bg-transparent text-[#a33d32]"
                          onClick={() => removeMedia.mutate(item.id)}
                          aria-label={`Xóa ${item.originalName}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className={`${surfaceCardClass} self-start p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="m-0 flex items-center gap-2 font-display text-lg">
                <Users size={18} /> Người được mời
              </h2>
              <span className="rounded-full bg-[#e4eee9] px-2 py-0.5 text-xs font-bold">
                {detail.guests.length}
              </span>
            </div>
            {detail.canManage && (
              <div className="mb-4 grid gap-3 border-b border-border-default pb-4">
                <form className="flex gap-2" onSubmit={submitEmail}>
                  <input
                    className={`${formFieldClass} min-w-0 py-2 text-sm`}
                    type="email"
                    required
                    value={email}
                    onChange={(input) => setEmail(input.target.value)}
                    placeholder="Thêm email bất kỳ"
                  />
                  <button
                    className={compactPrimaryButtonClass}
                    disabled={addGuests.isPending}
                  >
                    <Mail size={14} />
                    <span className="sr-only">Thêm</span>
                  </button>
                </form>
                <div>
                  <div className="relative mb-2">
                    <Search
                      className="absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle"
                      size={14}
                    />
                    <input
                      className={`${formFieldClass} py-1.5 pl-8 text-xs`}
                      value={memberSearch}
                      onChange={(input) => setMemberSearch(input.target.value)}
                      placeholder="Tìm email trong gia phả…"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border-default bg-[#f8faf9] p-1">
                    {availableMembers.slice(0, 20).map((member) => (
                      <button
                        key={member.userId}
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-xs hover:bg-[#e5eee9]"
                        onClick={() => addGuests.mutate([member.email])}
                      >
                        <UserPlus size={13} />
                        <span className="min-w-0 flex-1 truncate">
                          <strong>{member.name}</strong> · {member.email}
                        </span>
                      </button>
                    ))}
                    {!availableMembers.length && (
                      <p className="m-0 px-2 py-3 text-center text-xs text-ink-subtle">
                        Không còn thành viên phù hợp.
                      </p>
                    )}
                  </div>
                  {uninvitedMembers.length > 0 && (
                    <button
                      type="button"
                      className="mt-2 w-full cursor-pointer border-0 bg-transparent text-xs font-bold text-accent-deep"
                      onClick={() =>
                        addGuests.mutate(
                          uninvitedMembers.map((member) => member.email),
                        )
                      }
                    >
                      Mời tất cả email trong gia phả ({uninvitedMembers.length})
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="grid gap-2">
              {detail.guests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f3f7f4] px-3 py-2"
                >
                  <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#d9e7e0] text-[0.65rem] font-bold">
                    {guest.avatarUrl ? (
                      <img
                        src={guest.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      (guest.name ?? guest.email).slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs">
                      {guest.name ?? guest.email}
                    </strong>
                    {guest.name && (
                      <span className="block truncate text-[0.68rem] text-ink-subtle">
                        {guest.email}
                      </span>
                    )}
                  </div>
                  {detail.canManage && (
                    <button
                      className="cursor-pointer border-0 bg-transparent text-ink-subtle hover:text-[#a33d32]"
                      onClick={() => removeGuest.mutate(guest.id)}
                      aria-label={`Xóa ${guest.email}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {!detail.guests.length && (
                <p className="m-0 py-4 text-center text-sm text-ink-muted">
                  Chưa mời thành viên nào.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
      {editing && (
        <EventFormDialog
          event={detail}
          onClose={() => setEditing(false)}
          onSave={(input) => update.mutate(input)}
          pending={update.isPending}
        />
      )}
      {preview && (
        <div
          className="fixed inset-0 z-100 grid place-items-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full border border-white/40 bg-black/40 text-white"
            onClick={() => setPreview(null)}
            aria-label="Đóng"
          >
            <X />
          </button>
          <img
            src={preview}
            alt="Xem ảnh sự kiện"
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(click) => click.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
