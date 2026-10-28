import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  EventCategory,
  FamilyEventDetail,
  FamilyEventInput,
} from "@family-tree/shared-types";
import {
  CalendarPlus,
  Camera,
  Check,
  Clock3,
  Download,
  FileText,
  Image as ImageIcon,
  Pencil,
  Save,
  Search,
  Send,
  Trash2,
  Undo2,
  Upload,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { PageBreadcrumbBar, PageHeading } from "../components/PageHeader";
import { useNotifications } from "../app/providers/NotificationProvider";
import {
  addEventGuests,
  addEventMedia,
  acceptEventInvitation,
  createEvent,
  deleteEvent,
  deleteEventGuest,
  deleteEventMedia,
  declineEventInvitation,
  getEvent,
  getTimeline,
  setEventCover,
  updateEvent,
  uploadEventFile,
} from "../features/events/api";
import { eventCategories } from "../features/events/constants";
import { getTreeMembers } from "../features/sharing/api";
import { getTreePersons } from "../features/family-tree/api";
import { StyledCheckbox } from "../features/family-tree/ListFilterControls";
import {
  compactDangerButtonClass,
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formFieldClass,
  formInputClass,
  formLabelClass,
  formSelectClass,
  formTextareaClass,
  surfaceCardClass,
} from "../lib/ui-classes";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Vui lòng thử lại";

type EventFormState = {
  title: string;
  category: EventCategory;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
};

const localInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIso = (value: string) => new Date(value).toISOString();

const nextMinuteInputValue = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  return localInputValue(date.toISOString());
};

const emptyForm: EventFormState = {
  title: "",
  category: "DEATH_ANNIVERSARY",
  description: "",
  location: "",
  startAt: "",
  endAt: "",
};

const toForm = (event: FamilyEventDetail): EventFormState => ({
  title: event.title,
  category: event.category,
  description: event.description ?? "",
  location: event.location ?? "",
  startAt: localInputValue(event.startAt),
  endAt: localInputValue(event.endAt),
});

const toPayload = (form: EventFormState): FamilyEventInput => ({
  title: form.title.trim(),
  category: form.category,
  description: form.description.trim() || null,
  location: form.location.trim() || null,
  startAt: toIso(form.startAt),
  endAt: form.endAt ? toIso(form.endAt) : null,
});

const eventDateErrors = (form: EventFormState) => {
  const errors: { startAt: string | null; endAt: string | null } = {
    startAt: null,
    endAt: null,
  };
  if (!form.startAt) return errors;
  const startAt = new Date(form.startAt);
  if (Number.isNaN(startAt.getTime())) {
    errors.startAt = "Thời gian bắt đầu không hợp lệ.";
  } else if (startAt <= new Date()) {
    errors.startAt = "Thời gian bắt đầu không hợp lệ.";
  }
  if (form.endAt) {
    const endAt = new Date(form.endAt);
    if (
      Number.isNaN(endAt.getTime()) ||
      (!Number.isNaN(startAt.getTime()) && endAt <= startAt)
    ) {
      errors.endAt = "Thời gian kết thúc không hợp lệ.";
    }
  }
  return errors;
};

const eventStatus = (startAt: string, endAt: string | null) => {
  const now = Date.now();
  if (new Date(startAt).getTime() > now) return "Chưa diễn ra";
  if (endAt && new Date(endAt).getTime() <= now) return "Đã kết thúc";
  return "Đang diễn ra";
};

export function EventDetailPage() {
  const { treeId = "", eventId = "" } = useParams();
  const isCreating = eventId === "new";
  const navigate = useNavigate();
  const client = useQueryClient();
  const notice = useNotifications();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const guestPickerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(isCreating);
  const [form, setForm] = useState<EventFormState>(() => ({ ...emptyForm }));
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [selectedGuestEmails, setSelectedGuestEmails] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingCover, setPendingCover] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [statusVersion, setStatusVersion] = useState(0);
  const event = useQuery({
    queryKey: ["event", treeId, eventId],
    queryFn: () => getEvent(treeId, eventId),
    enabled: Boolean(treeId && eventId && !isCreating),
  });
  const creationContext = useQuery({
    queryKey: ["timeline", treeId],
    queryFn: () => getTimeline(treeId),
    enabled: Boolean(treeId && isCreating),
  });
  const members = useQuery({
    queryKey: ["tree-members", treeId],
    queryFn: () => getTreeMembers(treeId),
    enabled: Boolean(event.data?.canEdit),
  });
  const persons = useQuery({
    queryKey: ["tree-persons", treeId],
    queryFn: () => getTreePersons(treeId),
    enabled: Boolean(event.data?.canEdit),
  });
  useEffect(() => {
    if (event.data) setForm(toForm(event.data));
  }, [event.data]);
  useEffect(
    () => () => {
      if (pendingCover) URL.revokeObjectURL(pendingCover.previewUrl);
    },
    [pendingCover],
  );
  useEffect(() => {
    if (!event.data?.startAt) return;
    const now = Date.now();
    const nextTransition = [event.data.startAt, event.data.endAt]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => value > now)
      .sort((left, right) => left - right)[0];
    if (!nextTransition) return;
    const timer = window.setTimeout(
      () => {
        setStatusVersion((current) => current + 1);
        void event.refetch();
      },
      Math.min(nextTransition - now + 100, 2_147_483_647),
    );
    return () => window.clearTimeout(timer);
  }, [event.data?.endAt, event.data?.startAt, event.refetch, statusVersion]);
  useEffect(() => {
    if (!guestPickerOpen) return;
    const close = (pointerEvent: PointerEvent) => {
      if (!guestPickerRef.current?.contains(pointerEvent.target as Node)) {
        setGuestPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [guestPickerOpen]);
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["event", treeId, eventId] }),
      client.invalidateQueries({ queryKey: ["timeline", treeId] }),
      client.invalidateQueries({ queryKey: ["app-notifications"] }),
    ]);
  };
  const update = useMutation({
    mutationFn: async (body: FamilyEventInput) => {
      const updated = await updateEvent(treeId, eventId, body);
      if (!pendingCover) return updated;
      const uploaded = await uploadEventFile(
        treeId,
        eventId,
        pendingCover.file,
      );
      if (uploaded.resource_type !== "image")
        throw new Error("Tệp tải lên không phải là hình ảnh");
      return setEventCover(treeId, eventId, {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      });
    },
    onSuccess: async () => {
      await refresh();
      setPendingCover(null);
      if (coverRef.current) coverRef.current.value = "";
      setEditing(false);
      notice.toast("Đã cập nhật sự kiện", "success");
    },
    onError: (error) => notice.alert("Không thể cập nhật", errorText(error)),
  });
  const create = useMutation({
    mutationFn: async (body: FamilyEventInput) => {
      const created = await createEvent(treeId, body);
      if (!pendingCover) return created;
      const uploaded = await uploadEventFile(treeId, created.id, pendingCover.file);
      if (uploaded.resource_type !== "image")
        throw new Error("Tệp tải lên không phải là hình ảnh");
      await setEventCover(treeId, created.id, {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      });
      return created;
    },
    onSuccess: async ({ id }) => {
      await client.invalidateQueries({ queryKey: ["timeline", treeId] });
      setPendingCover(null);
      if (coverRef.current) coverRef.current.value = "";
      notice.toast("Đã tạo sự kiện", "success");
      navigate(`/trees/${treeId}/events/${id}`, { replace: true });
      setEditing(false);
    },
    onError: (error) => notice.alert("Không thể tạo sự kiện", errorText(error)),
  });
  const addGuests = useMutation({
    mutationFn: (emails: string[]) =>
      addEventGuests(treeId, eventId, { emails }),
    onSuccess: async () => {
      await refresh();
      setSelectedGuestEmails([]);
      setGuestPickerOpen(false);
      notice.toast("Đã gửi lời mời tham gia sự kiện", "success");
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
  const confirmGuestRemoval = async (guest: FamilyEventDetail["guests"][number]) => {
    const pending = guest.status === "PENDING";
    const confirmed = await notice.confirm(
      pending ? "Thu hồi lời mời?" : "Xóa người khỏi sự kiện?",
      pending
        ? `Lời mời gửi đến ${guest.email} sẽ bị thu hồi.`
        : `${guest.name ?? guest.email} sẽ bị xóa khỏi danh sách người tham gia.`,
    );
    if (confirmed) removeGuest.mutate(guest.id);
  };
  const reinviteGuest = async (guest: FamilyEventDetail["guests"][number]) => {
    const confirmed = await notice.confirm(
      "Mời lại thành viên?",
      `Một thông báo mời tham gia mới sẽ được gửi đến ${guest.email}.`,
    );
    if (confirmed) addGuests.mutate([guest.email]);
  };
  const acceptInvitation = useMutation({
    mutationFn: () => acceptEventInvitation(treeId, eventId),
    onSuccess: async () => {
      await refresh();
      notice.toast("Bạn đã chấp nhận tham gia sự kiện", "success");
    },
    onError: (error) =>
      notice.alert("Không thể chấp nhận lời mời", errorText(error)),
  });
  const declineInvitation = useMutation({
    mutationFn: () => declineEventInvitation(treeId, eventId),
    onSuccess: async () => {
      await refresh();
      notice.toast("Bạn đã từ chối lời mời tham gia sự kiện", "success");
    },
    onError: (error) =>
      notice.alert("Không thể từ chối lời mời", errorText(error)),
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
  const selectedMembers = useMemo(() => {
    const selected = new Set(selectedGuestEmails);
    return uninvitedMembers.filter((member) => selected.has(member.email));
  }, [selectedGuestEmails, uninvitedMembers]);
  const invitationOptions = useMemo(() => {
    const accountMembers = members.data?.members ?? [];
    const invited = new Set(
      (event.data?.guests ?? []).map((guest) => guest.email.toLowerCase()),
    );
    const keyword = memberSearch.trim().toLowerCase();
    return (persons.data?.persons ?? [])
      .map((person) => {
        const account = accountMembers.find(
          (member) =>
            member.person?.id === person.id ||
            (person.email != null &&
              member.email.toLowerCase() === person.email.toLowerCase()),
        );
        return {
          id: person.id,
          name: person.preferredName?.trim() || person.fullName,
          email: account?.email ?? person.email,
          inviteEmail: account?.email ?? null,
          avatarUrl: person.avatarUrl ?? account?.avatarUrl ?? null,
          fullName: person.fullName,
        };
      })
      .filter(
        (person) =>
          !person.inviteEmail ||
          !invited.has(person.inviteEmail.toLowerCase()),
      )
      .filter(
        (person) =>
          !keyword ||
          `${person.name} ${person.fullName} ${person.email ?? ""}`
            .toLowerCase()
            .includes(keyword),
      );
  }, [
    members.data?.members,
    persons.data?.persons,
    event.data?.guests,
    memberSearch,
  ]);
  const availableInviteEmails = invitationOptions.flatMap((person) =>
    person.inviteEmail ? [person.inviteEmail] : [],
  );
  const allAvailableSelected =
    availableInviteEmails.length > 0 &&
    availableInviteEmails.every((email) => selectedGuestEmails.includes(email));
  const toggleAllAvailable = () => {
    const availableEmails = new Set(availableInviteEmails);
    setSelectedGuestEmails((current) =>
      allAvailableSelected
        ? current.filter((emailAddress) => !availableEmails.has(emailAddress))
        : [...new Set([...current, ...availableEmails])],
    );
  };
  const images =
    event.data?.media.filter((item) => item.type === "IMAGE") ?? [];
  const documents =
    event.data?.media.filter((item) => item.type === "DOCUMENT") ?? [];

  const pageLoading = isCreating ? creationContext.isLoading : event.isLoading;
  const pageError = isCreating
    ? creationContext.isError ||
      (creationContext.data != null && !creationContext.data.canManage)
    : event.isError || !event.data;

  if (pageLoading)
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface-page p-6 text-ink-muted">
        Đang tải sự kiện…
      </main>
    );
  if (pageError)
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-surface-page p-6 text-ink">
        <section className={`${surfaceCardClass} mx-auto max-w-3xl p-6`}>
          <h1 className="font-display text-xl">
            {isCreating
              ? "Bạn không có quyền tạo sự kiện"
              : "Không thể mở sự kiện"}
          </h1>
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
  const guestGroups = (
    [
      ["ACCEPTED", "Đã chấp nhận"],
      ["PENDING", "Chờ xác nhận"],
      ["DECLINED", "Đã từ chối"],
    ] as const
  ).map(([status, label]) => ({
    status,
    label,
    guests: (detail?.guests ?? []).filter((guest) => guest.status === status),
  }));
  const treeName =
    detail?.treeName ?? creationContext.data?.tree.name ?? "Gia phả";
  const canManage = isCreating ? true : Boolean(detail?.canManage);
  const canEdit = isCreating ? true : Boolean(detail?.canEdit);
  const canRespondToInvitation = Boolean(
    detail && new Date(detail.startAt) > new Date(),
  );
  const minimumStartAt = nextMinuteInputValue();
  const minimumEndAt = form.startAt
    ? nextMinuteInputValue(form.startAt)
    : undefined;
  const dateErrors = editing
    ? eventDateErrors(form)
    : { startAt: null, endAt: null };
  const hasDateError = Boolean(dateErrors.startAt || dateErrors.endAt);
  const status = detail ? eventStatus(detail.startAt, detail.endAt) : null;
  const displayStatus = status ?? "Chưa diễn ra";
  const statusTextClass =
    displayStatus === "Đang diễn ra"
      ? "text-[#28634f]"
      : displayStatus === "Đã kết thúc"
        ? "text-ink-muted"
        : "text-[#8a6428]";
  const creatorName = detail?.createdBy.name ?? user?.name ?? "Chưa xác định";
  const creatorEmail = detail?.createdBy.email ?? user?.email ?? "";
  const saveDetails = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!form.title.trim() || !form.startAt) return;
    if (hasDateError) return;
    const payload = toPayload(form);
    if (isCreating) create.mutate(payload);
    else update.mutate(payload);
  };
  const toggleGuest = (email: string) =>
    setSelectedGuestEmails((current) =>
      current.includes(email)
        ? current.filter((item) => item !== email)
        : [...current, email],
    );
  const removeEvent = async () => {
    if (!detail) return;
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
    <main className="min-h-[calc(100vh-4.5rem)] bg-surface-page px-4 py-6 text-ink md:px-8">
      <div className="mx-auto w-full">
        <PageBreadcrumbBar
          items={[
            { label: "Trang chủ", to: "/" },
            { label: "Danh sách gia phả", to: "/trees" },
            { label: treeName, to: `/trees/${treeId}/tree` },
            { label: "Dòng thời gian", to: `/trees/${treeId}/timeline` },
            { label: isCreating ? "Thêm sự kiện" : detail?.title ?? "Sự kiện" },
          ]}
          headerClassName="z-3 -mx-4 -mt-6 mb-5 border-b border-border-default bg-[rgba(249,251,250,0.96)] px-5 md:-mx-8"
        >
          {canManage && (
            <div className="flex w-full flex-wrap items-center gap-2 min-[801px]:w-auto">
              {editing ? (
                <>
                  <button
                    type="button"
                    className={compactSecondaryButtonClass}
                    onClick={() => {
                      if (isCreating) {
                        navigate(`/trees/${treeId}/timeline`);
                        return;
                      }
                      if (detail) setForm(toForm(detail));
                      setPendingCover(null);
                      if (coverRef.current) coverRef.current.value = "";
                      setEditing(false);
                    }}
                  >
                    <X size={15} /> Hủy
                  </button>
                  <button
                    type="submit"
                    form="event-details-form"
                    className={compactPrimaryButtonClass}
                    disabled={
                      create.isPending ||
                      update.isPending ||
                      !form.title.trim() ||
                      !form.startAt ||
                      hasDateError
                    }
                  >
                    {isCreating ? (
                      <CalendarPlus size={15} />
                    ) : (
                      <Save size={15} />
                    )}
                    {create.isPending || update.isPending
                      ? "Đang lưu…"
                      : isCreating
                        ? "Tạo sự kiện"
                        : "Lưu thay đổi"}
                  </button>
                </>
              ) : (
                <>
                  <span
                    title={
                      canEdit
                        ? undefined
                        : "Không thể chỉnh sửa sau khi sự kiện đã bắt đầu"
                    }
                  >
                    <button
                      type="button"
                      className={compactSecondaryButtonClass}
                      disabled={!canEdit}
                      onClick={() => setEditing(true)}
                    >
                      <Pencil size={15} /> Chỉnh sửa
                    </button>
                  </span>
                  <button
                    type="button"
                    className={compactDangerButtonClass}
                    onClick={() => void removeEvent()}
                  >
                    <Trash2 size={15} /> Xóa
                  </button>
                </>
              )}
            </div>
          )}
        </PageBreadcrumbBar>
        <PageHeading
          title={isCreating ? "Thêm sự kiện" : "Chi tiết sự kiện"}
        />
        {detail?.myInvitationStatus && (
          <section className={`${surfaceCardClass} mb-5 flex flex-wrap items-center justify-between gap-3 p-4`}>
            <div>
              <h2 className="m-0 font-display text-base">
                {detail.myInvitationStatus === "PENDING"
                  ? "Bạn được mời tham gia sự kiện này"
                  : detail.myInvitationStatus === "ACCEPTED"
                    ? "Bạn đã chấp nhận lời mời"
                    : "Bạn đã từ chối lời mời"}
              </h2>
              <p className="mt-1 mb-0 text-sm text-ink-muted">
                {detail.myInvitationStatus === "PENDING"
                  ? canRespondToInvitation
                    ? "Xác nhận để tham gia cùng gia đình."
                    : "Sự kiện đã bắt đầu, lời mời không thể thay đổi."
                  : detail.myInvitationStatus === "ACCEPTED"
                    ? "Trạng thái tham gia: Đã chấp nhận."
                    : "Trạng thái tham gia: Đã từ chối."}
              </p>
            </div>
            {detail.myInvitationStatus === "PENDING" &&
              canRespondToInvitation && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={compactSecondaryButtonClass}
                  disabled={declineInvitation.isPending}
                  onClick={() => declineInvitation.mutate()}
                >
                  <X size={15} />
                  {declineInvitation.isPending ? "Đang từ chối…" : "Từ chối"}
                </button>
                <button
                  type="button"
                  className={compactPrimaryButtonClass}
                  disabled={acceptInvitation.isPending}
                  onClick={() => acceptInvitation.mutate()}
                >
                  <Check size={15} />
                  {acceptInvitation.isPending ? "Đang xác nhận…" : "Chấp nhận"}
                </button>
              </div>
            )}
          </section>
        )}
        <div className="grid items-start gap-5 min-[801px]:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.95fr)]">
          <div className="grid content-start gap-5">
            <section className={surfaceCardClass}>
              <div className="p-5">
                <form
                  id="event-details-form"
                  className="grid gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)]"
                  onSubmit={saveDetails}
                >
                  <aside className="grid content-start gap-5 rounded-xl bg-[#f1f6f3] p-4">
                    <div className="grid gap-2">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border-default bg-[#dfe9e4]">
                        {pendingCover?.previewUrl || detail?.coverUrl ? (
                          <img
                            src={pendingCover?.previewUrl ?? detail!.coverUrl!}
                            alt={`Ảnh đại diện ${detail?.title ?? form.title}`}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="grid size-full place-items-center text-ink-subtle">
                            <span className="grid justify-items-center gap-2 text-xs">
                              <ImageIcon size={28} />
                              Chưa có ảnh đại diện
                            </span>
                          </span>
                        )}
                        {editing && (isCreating || detail?.canManage) && (
                          <label
                            className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/55 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black/65 ${update.isPending ? "cursor-wait" : "cursor-pointer"}`}
                          >
                            <Camera size={17} />
                            {pendingCover || detail?.coverUrl
                              ? "Thay ảnh đại diện"
                              : "Thêm ảnh đại diện"}
                            <input
                              ref={coverRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={create.isPending || update.isPending}
                              onChange={(input) => {
                                const file = input.target.files?.[0];
                                if (!file) return;
                                if (!file.type.startsWith("image/")) {
                                  notice.alert(
                                    "Ảnh không hợp lệ",
                                    "Ảnh đại diện phải là một tệp hình ảnh.",
                                  );
                                  input.target.value = "";
                                  return;
                                }
                                setPendingCover({
                                  file,
                                  previewUrl: URL.createObjectURL(file),
                                });
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    {editing ? (
                      <label className="grid gap-2">
                        <textarea
                          className={`${formTextareaClass} min-h-20 resize-none bg-white text-center font-display text-lg font-semibold`}
                          aria-label="Tên sự kiện"
                          required
                          rows={2}
                          maxLength={200}
                          value={form.title}
                          onChange={(input) =>
                            setForm((current) => ({
                              ...current,
                              title: input.target.value,
                            }))
                          }
                          placeholder="Ví dụ: Giỗ họ năm 2027"
                          autoFocus={isCreating}
                        />
                      </label>
                    ) : (
                      <h2 className="m-0 break-words text-center font-display text-xl leading-snug font-semibold text-ink">
                        {form.title}
                      </h2>
                    )}
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/65 px-3 py-2.5">
                        <span className="font-medium text-ink-subtle">
                          Trạng thái
                        </span>
                        <strong
                          className={`inline-flex items-center gap-2 ${statusTextClass}`}
                        >
                          <span className="size-2 rounded-full bg-current opacity-75" />
                          {displayStatus}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/65 px-3 py-2.5">
                        <span className="font-medium text-ink-subtle">
                          Người tạo
                        </span>
                        <span className="grid min-w-0 justify-items-end">
                          <strong className="max-w-full truncate text-right text-ink">
                            {creatorName}
                          </strong>
                          {creatorEmail && (
                            <span className="max-w-full truncate text-right text-xs text-ink-subtle">
                              {creatorEmail}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </aside>
                  <div className="grid content-start gap-4">
                    <label className={formLabelClass}>
                      Phân loại
                      <select
                        className={formSelectClass}
                        disabled={!editing}
                        value={form.category}
                        onChange={(input) =>
                          setForm((current) => ({
                            ...current,
                            category: input.target.value as EventCategory,
                          }))
                        }
                      >
                        {eventCategories.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className={`${formLabelClass} content-start`}>
                        Bắt đầu
                        <input
                          id="event-start-at"
                          className={formInputClass}
                          aria-invalid={Boolean(dateErrors.startAt)}
                          aria-describedby={dateErrors.startAt ? "event-start-at-error" : undefined}
                          disabled={!editing}
                          required
                          type="datetime-local"
                          min={minimumStartAt}
                          value={form.startAt}
                          onChange={(input) =>
                            setForm((current) => ({
                              ...current,
                              startAt: input.target.value,
                            }))
                          }
                        />
                        {dateErrors.startAt && (
                          <span id="event-start-at-error" className="text-xs font-medium text-red-600">
                            {dateErrors.startAt}
                          </span>
                        )}
                      </label>
                      <label className={`${formLabelClass} content-start`}>
                        Kết thúc
                        <input
                          id="event-end-at"
                          className={formInputClass}
                          aria-invalid={Boolean(dateErrors.endAt)}
                          aria-describedby={dateErrors.endAt ? "event-end-at-error" : undefined}
                          disabled={!editing}
                          type="datetime-local"
                          min={minimumEndAt}
                          value={form.endAt}
                          onChange={(input) =>
                            setForm((current) => ({
                              ...current,
                              endAt: input.target.value,
                            }))
                          }
                        />
                        {dateErrors.endAt && (
                          <span id="event-end-at-error" className="text-xs font-medium text-red-600">
                            {dateErrors.endAt}
                          </span>
                        )}
                      </label>
                    </div>
                    <label className={formLabelClass}>
                      Địa điểm
                      <input
                        className={formInputClass}
                        disabled={!editing}
                        maxLength={500}
                        value={form.location}
                        onChange={(input) =>
                          setForm((current) => ({
                            ...current,
                            location: input.target.value,
                          }))
                        }
                        placeholder="Nhà thờ họ, địa chỉ…"
                      />
                    </label>
                    <label className={formLabelClass}>
                      Mô tả
                      <textarea
                        className={`${formTextareaClass} min-h-28`}
                        disabled={!editing}
                        maxLength={5000}
                        value={form.description}
                        onChange={(input) =>
                          setForm((current) => ({
                            ...current,
                            description: input.target.value,
                          }))
                        }
                        placeholder="Nội dung, chương trình, lưu ý cho người tham gia…"
                      />
                    </label>
                  </div>
                </form>
              </div>
            </section>

            {detail ? (
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
                          ? "Có thể tải lên khi sự kiện bắt đầu"
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
                  Tính năng tải ảnh và tài liệu sẽ mở khi sự kiện bắt đầu.
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
                      {detail.canUploadMedia && (
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
                      {detail.canUploadMedia && (
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
            ) : (
              <section className={`${surfaceCardClass} p-5`}>
                <h2 className="mt-0 mb-3 font-display text-lg">
                  Ảnh & tài liệu
                </h2>
                <p className="m-0 text-sm text-ink-muted">
                  Bạn có thể tải tư liệu lên sau khi tạo sự kiện.
                </p>
              </section>
            )}
          </div>

          {detail ? (
            <aside className={`${surfaceCardClass} self-start p-5`}>
            <div className="mb-4 flex items-center">
              <h2 className="m-0 flex items-center gap-2 font-display text-lg">
                <Users size={18} /> Người được mời ({detail.guests.length})
              </h2>
            </div>
            {detail.canEdit && (
              <div className="mb-4 grid gap-3">
                <div ref={guestPickerRef} className="relative">
                  <Search
                    className="absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle"
                    size={14}
                  />
                  <input
                    className={`${formFieldClass} py-2 pl-8 text-sm`}
                    type="search"
                    aria-label="Tìm tên hoặc email trong gia phả"
                    aria-expanded={guestPickerOpen}
                    aria-controls="event-guest-picker"
                    value={memberSearch}
                    onFocus={() => setGuestPickerOpen(true)}
                    onChange={(input) => {
                      setMemberSearch(input.target.value);
                      setGuestPickerOpen(true);
                    }}
                    placeholder="Tìm tên hoặc email…"
                  />
                  {guestPickerOpen && (
                    <div
                      id="event-guest-picker"
                      className="absolute top-full left-0 z-30 mt-2 flex max-h-96 w-full min-w-0 flex-col rounded-xl border border-border-control bg-white p-2 shadow-xl"
                    >
                      <div className="grid min-h-0 gap-1 overflow-y-auto">
                        <StyledCheckbox
                          className="rounded-lg px-2 py-2 text-sm font-bold hover:bg-surface-hover"
                          checked={allAvailableSelected}
                          indeterminate={
                            selectedGuestEmails.some((email) =>
                              availableInviteEmails.includes(email),
                            ) && !allAvailableSelected
                          }
                          disabled={!availableInviteEmails.length}
                          onChange={toggleAllAvailable}
                          label={`Chọn tất cả (${availableInviteEmails.length})`}
                        />
                        {invitationOptions.map((person) => (
                          <div
                            key={person.id}
                            title={
                              person.inviteEmail
                                ? undefined
                                : "Chưa có tài khoản."
                            }
                          >
                            <StyledCheckbox
                              className="rounded-lg px-2 py-2 text-sm hover:bg-surface-hover"
                              checked={
                                person.inviteEmail != null &&
                                selectedGuestEmails.includes(person.inviteEmail)
                              }
                              disabled={!person.inviteEmail}
                              onChange={() => {
                                if (person.inviteEmail) {
                                  toggleGuest(person.inviteEmail);
                                }
                              }}
                              label={
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#d9e7e0] text-sm font-bold text-ink-soft">
                                    {person.avatarUrl ? (
                                      <img
                                        src={person.avatarUrl}
                                        alt=""
                                        className="size-full object-cover"
                                      />
                                    ) : (
                                      person.name.slice(0, 1).toUpperCase()
                                    )}
                                  </span>
                                  <span className="flex min-w-0 flex-col">
                                    <strong className="truncate">{person.name}</strong>
                                    <span className="truncate text-sm text-ink-subtle">
                                      {person.email ?? "Chưa có tài khoản"}
                                    </span>
                                  </span>
                                </span>
                              }
                            />
                          </div>
                        ))}
                        {(members.isLoading || persons.isLoading) && (
                          <p className="m-0 px-2 py-3 text-center text-xs text-ink-subtle">
                            Đang tải danh sách thành viên…
                          </p>
                        )}
                        {!members.isLoading &&
                          !persons.isLoading &&
                          !invitationOptions.length && (
                          <p className="m-0 px-2 py-3 text-center text-xs text-ink-subtle">
                            Không có thành viên phù hợp.
                          </p>
                          )}
                      </div>
                    </div>
                  )}
                </div>
                {selectedMembers.length > 0 && (
                  <div className="grid gap-2">
                    <p className="m-0 text-sm font-bold text-ink-soft">
                      Người sẽ được mời ({selectedMembers.length})
                    </p>
                    <div className="grid gap-1">
                      {selectedMembers.map((member) => (
                        <div
                          key={member.userId}
                          className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f3f7f4] px-3 py-2"
                        >
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#d9e7e0] text-sm font-bold text-ink-soft">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              member.name.slice(0, 1).toUpperCase()
                            )}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <strong className="truncate text-sm">{member.name}</strong>
                            <span className="truncate text-xs text-ink-subtle">
                              {member.email}
                            </span>
                             <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-[#986c2b]">
                               <Clock3 size={12} /> Chưa gửi lời mời
                             </span>
                          </span>
                          <button
                            type="button"
                            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-ink-subtle hover:bg-surface-hover hover:text-ink"
                            aria-label={`Bỏ chọn ${member.email}`}
                            onClick={() => toggleGuest(member.email)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  <button
                    type="button"
                    className={`${compactPrimaryButtonClass} w-full`}
                    disabled={addGuests.isPending}
                    onClick={() => addGuests.mutate(selectedGuestEmails)}
                  >
                    <Send size={14} />
                    {addGuests.isPending
                      ? "Đang gửi lời mời…"
                      : `Gửi lời mời (${selectedMembers.length})`}
                  </button>
                  </div>
                )}
              </div>
            )}
            <div className="grid gap-4">
              {guestGroups.map((group) => (
                <section key={group.status}>
                  <div className="mb-2 border-b border-border-default pb-2">
                    <h3 className="m-0 text-sm font-bold text-ink-soft">
                      {group.label} ({group.guests.length})
                    </h3>
                  </div>
                  <div className="grid gap-2">
                    {group.guests.map((guest) => (
                      <div
                        key={guest.id}
                        className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f3f7f4] px-3 py-2"
                      >
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#d9e7e0] text-sm font-bold">
                          {guest.avatarUrl ? (
                            <img
                              src={guest.avatarUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            (guest.name ?? guest.email)
                              .slice(0, 1)
                              .toUpperCase()
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-sm">
                            {guest.name ?? guest.email}
                          </strong>
                          {guest.name && (
                            <span className="block truncate text-xs text-ink-subtle">
                              {guest.email}
                            </span>
                          )}
                          <span
                            className={`mt-0.5 inline-flex items-center gap-1 text-xs font-semibold ${guest.status === "ACCEPTED" ? "text-[#28634f]" : guest.status === "DECLINED" ? "text-[#a33d32]" : "text-[#986c2b]"}`}
                          >
                            {guest.status === "ACCEPTED" ? (
                              <Check size={12} />
                            ) : guest.status === "DECLINED" ? (
                              <X size={12} />
                            ) : (
                              <Clock3 size={12} />
                            )}
                            {guest.status === "ACCEPTED"
                              ? "Đã chấp nhận"
                              : guest.status === "DECLINED"
                                ? "Đã từ chối"
                                : "Chờ xác nhận"}
                          </span>
                        </div>
                        {detail.canEdit && (
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                            {guest.status === "PENDING" && (
                              <button
                                type="button"
                                className={`${compactDangerButtonClass} text-xs`}
                                onClick={() => void confirmGuestRemoval(guest)}
                                aria-label={`Thu hồi lời mời cho ${guest.email}`}
                              >
                                <Undo2 size={13} /> Thu hồi
                              </button>
                            )}
                            {guest.status === "ACCEPTED" && (
                              <button
                                type="button"
                                className={`${compactDangerButtonClass} text-xs`}
                                onClick={() => void confirmGuestRemoval(guest)}
                                aria-label={`Xóa ${guest.email} khỏi sự kiện`}
                              >
                                <Trash2 size={13} /> Xóa
                              </button>
                            )}
                            {guest.status === "DECLINED" && (
                              <>
                                <button
                                  type="button"
                                  className={`${compactSecondaryButtonClass} text-xs`}
                                  onClick={() => void reinviteGuest(guest)}
                                  aria-label={`Mời lại ${guest.email}`}
                                >
                                  <UserPlus size={13} /> Mời lại
                                </button>
                                <button
                                  type="button"
                                  className={`${compactDangerButtonClass} min-h-7 px-1.5 py-0.5 text-xs`}
                                  onClick={() => void confirmGuestRemoval(guest)}
                                  aria-label={`Xóa ${guest.email}`}
                                >
                                  <Trash2 size={13} /> Xóa
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {!group.guests.length && (
                      <p className="m-0 py-2 text-xs text-ink-subtle">
                        Chưa có người nào.
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
            </aside>
          ) : (
            <aside className={`${surfaceCardClass} self-start p-5`}>
              <h2 className="mt-0 mb-3 flex items-center gap-2 font-display text-lg">
                <Users size={18} /> Người được mời
              </h2>
              <p className="m-0 text-sm text-ink-muted">
                Bạn có thể thêm người được mời sau khi tạo sự kiện.
              </p>
            </aside>
          )}
        </div>
      </div>
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
