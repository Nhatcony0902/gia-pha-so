import type {
  FamilyTreeInput,
  FamilyTreeSummary,
  Gender,
  PersonCreateInput,
  PersonNode,
  PrimitiveRelationship,
  RelationshipInput,
} from "@family-tree/shared-types";
import {
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formFieldClass,
  formLabelClass,
} from "../../lib/ui-classes";

const fieldClass = formFieldClass;
const labelClass = formLabelClass;

export function DialogShell({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return createPortal(
    <div
      className="fixed inset-0 z-90 grid place-items-center overflow-y-auto bg-[rgba(4,15,13,0.72)] p-4 backdrop-blur-xs"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto ${wide ? "w-[min(68rem,100%)]" : "w-[min(42rem,100%)]"} rounded-2xl bg-surface-soft p-5 text-ink shadow-[0_24px_70px_rgba(0,0,0,0.42)] md:p-6`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="management-dialog-title"
      >
        <header className="mb-5 flex items-center justify-between gap-4">
          <h2
            id="management-dialog-title"
            className="m-0 font-display text-2xl"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-[#e6ece8] text-[#314a42]"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

export function PersonAddChoiceDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (mode: "new" | "existing") => void;
}) {
  return (
    <DialogShell title="Thêm thành viên" onClose={onClose}>
      <p className="mt-0 mb-4 text-sm text-ink-subtle">
        Chọn cách bạn muốn thêm người vào gia phả hiện tại.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="flex min-h-36 cursor-pointer flex-col items-start gap-3 rounded-xl border border-border-default bg-white p-5 text-left text-ink transition hover:border-accent hover:bg-[#fff8e9]"
          onClick={() => onSelect("new")}
        >
          <span className="grid size-10 place-items-center rounded-full bg-[#e6efe9] text-accent-deep">
            <UserPlus size={20} />
          </span>
          <span>
            <strong className="block">Tạo thành viên mới</strong>
            <small className="mt-1 block leading-5 text-ink-subtle">
              Nhập thông tin để tạo một hồ sơ hoàn toàn mới.
            </small>
          </span>
        </button>
        <button
          type="button"
          className="flex min-h-36 cursor-pointer flex-col items-start gap-3 rounded-xl border border-border-default bg-white p-5 text-left text-ink transition hover:border-accent hover:bg-[#fff8e9]"
          onClick={() => onSelect("existing")}
        >
          <span className="grid size-10 place-items-center rounded-full bg-[#e6efe9] text-accent-deep">
            <Link2 size={20} />
          </span>
          <span>
            <strong className="block">Thêm từ gia phả khác</strong>
            <small className="mt-1 block leading-5 text-ink-subtle">
              Liên kết một hồ sơ đã có mà không tạo bản sao.
            </small>
          </span>
        </button>
      </div>
    </DialogShell>
  );
}

export function TreeFormDialog({
  tree,
  pending,
  onClose,
  onSubmit,
}: {
  tree?: FamilyTreeSummary;
  pending: boolean;
  onClose: () => void;
  onSubmit: (value: FamilyTreeInput) => void;
}) {
  const [form, setForm] = useState<FamilyTreeInput>({
    name: tree?.name ?? "",
    description: tree?.description ?? "",
    originPlace: tree?.originPlace ?? "",
    coverUrl: tree?.coverUrl ?? "",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      description: form.description?.trim() || null,
      originPlace: form.originPlace?.trim() || null,
      coverUrl: form.coverUrl?.trim() || null,
    });
  };
  return (
    <DialogShell
      title={tree ? "Chỉnh sửa gia phả" : "Tạo gia phả mới"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-4">
        <label className={labelClass}>
          Tên gia phả <span className="sr-only">(bắt buộc)</span>
          <input
            autoFocus
            required
            maxLength={200}
            className={fieldClass}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Ví dụ: Gia phả họ Nguyễn"
          />
        </label>
        <label className={labelClass}>
          Quê quán / nguồn gốc
          <input
            maxLength={500}
            className={fieldClass}
            value={form.originPlace ?? ""}
            onChange={(event) =>
              setForm({ ...form, originPlace: event.target.value })
            }
          />
        </label>
        <label className={labelClass}>
          Ảnh bìa (URL)
          <input
            type="url"
            className={fieldClass}
            value={form.coverUrl ?? ""}
            onChange={(event) =>
              setForm({ ...form, coverUrl: event.target.value })
            }
            placeholder="https://..."
          />
        </label>
        <label className={labelClass}>
          Mô tả
          <textarea
            rows={4}
            maxLength={2000}
            className={fieldClass}
            value={form.description ?? ""}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        <footer className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className={compactSecondaryButtonClass}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="submit"
            className={compactPrimaryButtonClass}
            disabled={pending || !form.name.trim()}
          >
            {pending ? "Đang lưu…" : tree ? "Lưu thay đổi" : "Tạo gia phả"}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

type PersonForm = {
  fullName: string;
  preferredName: string;
  gender: Gender;
  birthDate: string;
  birthPlace: string;
  hometown: string;
  occupation: string;
  phone: string;
  email: string;
  biography: string;
};

export function PersonCreateDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (value: PersonCreateInput) => void;
}) {
  const [form, setForm] = useState<PersonForm>({
    fullName: "",
    preferredName: "",
    gender: "UNKNOWN",
    birthDate: "",
    birthPlace: "",
    hometown: "",
    occupation: "",
    phone: "",
    email: "",
    biography: "",
  });
  const set = (key: keyof PersonForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nullable = (value: string) => value.trim() || null;
    onSubmit({
      fullName: form.fullName.trim(),
      preferredName: nullable(form.preferredName),
      gender: form.gender,
      birthDate: form.birthDate
        ? new Date(`${form.birthDate}T00:00:00.000Z`).toISOString()
        : null,
      birthDatePrecision: form.birthDate ? "DAY" : null,
      birthPlace: nullable(form.birthPlace),
      hometown: nullable(form.hometown),
      occupation: nullable(form.occupation),
      phone: nullable(form.phone),
      email: nullable(form.email),
      biography: nullable(form.biography),
    });
  };
  return (
    <DialogShell title="Thêm thành viên" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Họ và tên
          <input
            autoFocus
            required
            maxLength={200}
            className={fieldClass}
            value={form.fullName}
            onChange={(event) => set("fullName", event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Tên thường gọi
          <input
            className={fieldClass}
            value={form.preferredName}
            onChange={(event) => set("preferredName", event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Giới tính
          <select
            className={fieldClass}
            value={form.gender}
            onChange={(event) => set("gender", event.target.value)}
          >
            <option value="UNKNOWN">Chưa rõ</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </label>
        <label className={labelClass}>
          Ngày sinh
          <input
            type="date"
            className={fieldClass}
            value={form.birthDate}
            onChange={(event) => set("birthDate", event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Nơi sinh
          <input
            className={fieldClass}
            value={form.birthPlace}
            onChange={(event) => set("birthPlace", event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Quê quán
          <input
            className={fieldClass}
            value={form.hometown}
            onChange={(event) => set("hometown", event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Nghề nghiệp
          <input
            className={fieldClass}
            value={form.occupation}
            onChange={(event) => set("occupation", event.target.value)}
          />
        </label>
        <label className={labelClass}>
          Số điện thoại
          <input
            className={fieldClass}
            value={form.phone}
            onChange={(event) => set("phone", event.target.value)}
          />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Email
          <input
            type="email"
            className={fieldClass}
            value={form.email}
            onChange={(event) => set("email", event.target.value)}
          />
        </label>
        <label className={`${labelClass} md:col-span-2`}>
          Tiểu sử
          <textarea
            rows={3}
            className={fieldClass}
            value={form.biography}
            onChange={(event) => set("biography", event.target.value)}
          />
        </label>
        <footer className="mt-2 flex justify-end gap-2 md:col-span-2">
          <button
            type="button"
            className={compactSecondaryButtonClass}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="submit"
            className={compactPrimaryButtonClass}
            disabled={pending || !form.fullName.trim()}
          >
            {pending ? "Đang thêm…" : "Thêm thành viên"}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

const dateInput = (value: string | null) => value?.slice(0, 10) ?? "";

export function RelationshipFormDialog({
  persons,
  relationship,
  pending,
  onClose,
  onSubmit,
}: {
  persons: PersonNode[];
  relationship?: PrimitiveRelationship;
  pending: boolean;
  onClose: () => void;
  onSubmit: (value: RelationshipInput) => void;
}) {
  const [form, setForm] = useState({
    type: relationship?.type ?? ("PARENT_CHILD" as const),
    fromPersonId: relationship?.fromPersonId ?? "",
    toPersonId: relationship?.toPersonId ?? "",
    parentKind: relationship?.parentKind ?? ("BIOLOGICAL" as const),
    birthOrder: relationship?.birthOrder?.toString() ?? "",
    marriageStatus: relationship?.marriageStatus ?? ("MARRIED" as const),
    marriageOrder: relationship?.marriageOrder?.toString() ?? "",
    startedAt: dateInput(relationship?.startedAt ?? null),
    endedAt: dateInput(relationship?.endedAt ?? null),
  });
  const [activeMemberSlot, setActiveMemberSlot] = useState<
    "fromPersonId" | "toPersonId"
  >("fromPersonId");
  const [memberSearch, setMemberSearch] = useState("");
  const relationshipFieldsRef = useRef<HTMLDivElement>(null);
  const [relationshipFieldsHeight, setRelationshipFieldsHeight] = useState(0);
  const selectedFirst = persons.find(
    (person) => person.id === form.fromPersonId,
  );
  const selectedSecond = persons.find(
    (person) => person.id === form.toPersonId,
  );
  const choosePerson = (personId: string) => {
    setForm((current) => ({ ...current, [activeMemberSlot]: personId }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const number = (value: string) => (value ? Number(value) : null);
    onSubmit({
      type: form.type,
      fromPersonId: form.fromPersonId,
      toPersonId: form.toPersonId,
      ...(form.type === "PARENT_CHILD"
        ? {
            parentKind: form.parentKind,
            birthOrder: number(form.birthOrder),
          }
        : {
            marriageStatus: form.marriageStatus,
            marriageOrder: number(form.marriageOrder),
            startedAt: form.startedAt
              ? new Date(`${form.startedAt}T00:00:00.000Z`).toISOString()
              : null,
            startedAtPrecision: form.startedAt ? ("DAY" as const) : null,
            endedAt: form.endedAt
              ? new Date(`${form.endedAt}T00:00:00.000Z`).toISOString()
              : null,
            endedAtPrecision: form.endedAt ? ("DAY" as const) : null,
          }),
    });
  };
  const firstLabel = form.type === "PARENT_CHILD" ? "Bố/mẹ" : "Người thứ nhất";
  const secondLabel = form.type === "PARENT_CHILD" ? "Con" : "Người thứ hai";
  const normalizedSearch = memberSearch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLocaleLowerCase("vi")
    .trim();
  const visiblePersons = persons.filter((person) =>
    `${person.fullName} ${person.preferredName ?? ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLocaleLowerCase("vi")
      .includes(normalizedSearch),
  );
  useEffect(() => {
    const fields = relationshipFieldsRef.current;
    if (relationship || !fields) return;
    const measure = () =>
      setRelationshipFieldsHeight(fields.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(fields);
    return () => observer.disconnect();
  }, [relationship]);
  return (
    <DialogShell
      title={relationship ? "Chỉnh sửa quan hệ" : "Thêm quan hệ"}
      onClose={onClose}
      wide={!relationship}
    >
      <form
        onSubmit={submit}
        className={`grid gap-4 ${relationship ? "" : "md:grid-cols-[minmax(17rem,0.85fr)_minmax(20rem,1.15fr)]"}`}
      >
        {!relationship && (
          <aside
            className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 rounded-lg border border-border-control bg-white p-3 md:h-[var(--member-panel-height)]"
            style={
              relationshipFieldsHeight
                ? ({
                    "--member-panel-height": `${relationshipFieldsHeight}px`,
                  } as CSSProperties)
                : undefined
            }
          >
            <h3 className="m-0 text-sm font-bold">Chọn thành viên</h3>
            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
              />
              <input
                type="text"
                className={`${fieldClass} h-11 pl-9 pr-9`}
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Tìm tên thành viên"
                aria-label="Tìm thành viên"
              />
              {memberSearch && (
                <button
                  type="button"
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-ink-subtle hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"
                  onClick={() => setMemberSearch("")}
                  aria-label="Xóa nội dung tìm kiếm"
                  title="Xóa nội dung tìm kiếm"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="grid min-h-0 max-h-[42vh] content-start gap-1 overflow-y-auto md:max-h-none">
              {visiblePersons.map((person) => {
                const assignedRole =
                  person.id === form.fromPersonId
                    ? firstLabel
                    : person.id === form.toPersonId
                      ? secondLabel
                      : null;
                const alreadyInOtherSlot =
                  activeMemberSlot === "fromPersonId"
                    ? person.id === form.toPersonId
                    : person.id === form.fromPersonId;
                return (
                  <button
                    key={person.id}
                    type="button"
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-transparent bg-white px-2 py-1.5 text-left text-sm focus:border-focus focus:bg-white focus:outline-none focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 ${assignedRole ? "border-accent" : ""}`}
                    onClick={() => choosePerson(person.id)}
                    disabled={alreadyInOtherSlot}
                  >
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt=""
                        className="size-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dbe6e0] font-bold">
                        {person.fullName.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {person.fullName}
                    </span>
                    {assignedRole && (
                      <span className="shrink-0 text-xs text-accent-deep">
                        {assignedRole}
                      </span>
                    )}
                  </button>
                );
              })}
              {!visiblePersons.length && (
                <p className="m-0 px-2 py-4 text-center text-sm text-ink-subtle">
                  Không tìm thấy thành viên phù hợp.
                </p>
              )}
            </div>
          </aside>
        )}
        <div
          ref={relationshipFieldsRef}
          className="grid grid-cols-1 content-start gap-4 md:self-start"
        >
          <label className={labelClass}>
            Loại quan hệ
            {relationship ? (
              <span className={`${fieldClass} bg-[#edf2ef]`}>
                {form.type === "PARENT_CHILD" ? "Bố/mẹ – con" : "Vợ chồng"}
              </span>
            ) : (
              <select
                className={`${fieldClass} cursor-pointer`}
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.target.value as typeof form.type,
                  })
                }
              >
                <option value="PARENT_CHILD">Bố/mẹ – con</option>
                <option value="SPOUSE">Vợ chồng</option>
              </select>
            )}
          </label>
          {relationship ? (
            <>
              <div className={labelClass}>
                {firstLabel}
                <span className={`${fieldClass} bg-[#edf2ef]`}>
                  {selectedFirst?.fullName ?? "Thành viên"}
                </span>
              </div>
              <div className={labelClass}>
                {secondLabel}
                <span className={`${fieldClass} bg-[#edf2ef]`}>
                  {selectedSecond?.fullName ?? "Thành viên"}
                </span>
              </div>
            </>
          ) : (
            <div className="grid gap-4">
              {[
                {
                  person: selectedFirst,
                  label: firstLabel,
                  slot: "fromPersonId" as const,
                },
                {
                  person: selectedSecond,
                  label: secondLabel,
                  slot: "toPersonId" as const,
                },
              ].map(({ person, label, slot }) => (
                <div className={labelClass} key={slot}>
                  <span>{label}</span>
                  <div className="relative">
                    <button
                      type="button"
                      className={`${fieldClass} h-11 cursor-pointer text-left ${person ? "pr-10" : ""} ${activeMemberSlot === slot ? "border-focus" : ""}`}
                      onClick={() => setActiveMemberSlot(slot)}
                      aria-pressed={activeMemberSlot === slot}
                    >
                      {person?.fullName ?? (
                        <span className="text-ink-subtle">Chưa chọn</span>
                      )}
                    </button>
                    {person && (
                      <button
                        type="button"
                        className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-ink-subtle hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"
                        onClick={() => {
                          setForm((current) => ({ ...current, [slot]: "" }));
                          setActiveMemberSlot(slot);
                        }}
                        aria-label={`Bỏ ${label.toLocaleLowerCase("vi")}`}
                        title={`Bỏ ${label.toLocaleLowerCase("vi")}`}
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {form.type === "PARENT_CHILD" ? (
            <>
              <label className={labelClass}>
                Loại bố/mẹ
                <select
                  className={`${fieldClass} cursor-pointer`}
                  value={form.parentKind}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      parentKind: event.target.value as typeof form.parentKind,
                    })
                  }
                >
                  <option value="BIOLOGICAL">Ruột</option>
                  <option value="ADOPTIVE">Nuôi</option>
                </select>
              </label>
              <label className={labelClass}>
                Thứ tự sinh của người con
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={form.birthOrder}
                  onChange={(event) =>
                    setForm({ ...form, birthOrder: event.target.value })
                  }
                />
              </label>
            </>
          ) : (
            <>
              <label className={labelClass}>
                Trạng thái
                <select
                  className={`${fieldClass} cursor-pointer`}
                  value={form.marriageStatus}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      marriageStatus: event.target
                        .value as typeof form.marriageStatus,
                    })
                  }
                >
                  <option value="MARRIED">Kết hôn</option>
                  <option value="DIVORCED">Ly hôn</option>
                  <option value="SEPARATED">Ly thân</option>
                  <option value="WIDOWED">Góa</option>
                </select>
              </label>
              <label className={labelClass}>
                Lần kết hôn thứ
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={form.marriageOrder}
                  onChange={(event) =>
                    setForm({ ...form, marriageOrder: event.target.value })
                  }
                />
              </label>
              <label className={labelClass}>
                Ngày bắt đầu
                <input
                  type="date"
                  className={fieldClass}
                  value={form.startedAt}
                  onChange={(event) =>
                    setForm({ ...form, startedAt: event.target.value })
                  }
                />
              </label>
              <label className={labelClass}>
                Ngày kết thúc
                <input
                  type="date"
                  className={fieldClass}
                  value={form.endedAt}
                  onChange={(event) =>
                    setForm({ ...form, endedAt: event.target.value })
                  }
                />
              </label>
            </>
          )}
        </div>
        <footer className={`mt-2 flex justify-end gap-2 ${relationship ? "" : "md:col-span-2"}`}>
          <button
            type="button"
            className={compactSecondaryButtonClass}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="submit"
            className={compactPrimaryButtonClass}
            disabled={
              pending ||
              !form.fromPersonId ||
              !form.toPersonId ||
              persons.length < 2 ||
              form.fromPersonId === form.toPersonId
            }
          >
            {pending
              ? "Đang lưu…"
              : relationship
                ? "Lưu thay đổi"
                : "Thêm quan hệ"}
          </button>
        </footer>
      </form>
    </DialogShell>
  );
}

export function RelationshipManagerDialog({
  persons,
  relationships,
  deletingId,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: {
  persons: PersonNode[];
  relationships: PrimitiveRelationship[];
  deletingId?: string;
  onAdd: () => void;
  onEdit: (relationship: PrimitiveRelationship) => void;
  onDelete: (relationship: PrimitiveRelationship) => void;
  onClose: () => void;
}) {
  const names = new Map(persons.map((person) => [person.id, person.fullName]));
  return (
    <DialogShell title="Quản lý quan hệ" onClose={onClose}>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className={compactPrimaryButtonClass}
          onClick={onAdd}
          disabled={persons.length < 2}
        >
          <Plus size={16} /> Thêm quan hệ
        </button>
      </div>
      <div className="max-h-[60vh] divide-y divide-[#dce5e0] overflow-y-auto rounded-xl border border-border-control bg-white">
        {relationships.map((relationship) => (
          <div key={relationship.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-ink-strong">
                {relationship.type === "PARENT_CHILD"
                  ? "Bố/mẹ – con"
                  : "Vợ chồng"}
              </strong>
              <span className="block truncate text-sm text-ink-muted">
                {names.get(relationship.fromPersonId)} →{" "}
                {names.get(relationship.toPersonId)}
              </span>
            </div>
            <button
              type="button"
              className={compactSecondaryButtonClass}
              onClick={() => onEdit(relationship)}
            >
              <Pencil size={15} /> Sửa
            </button>
            <button
              type="button"
              className="grid size-9 cursor-pointer place-items-center rounded-lg border border-[#d9a49d] bg-[#fff8f6] text-[#a33d32] disabled:opacity-50"
              disabled={deletingId === relationship.id}
              onClick={() => onDelete(relationship)}
              aria-label="Xóa quan hệ"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!relationships.length && (
          <p className="m-0 p-8 text-center text-sm text-ink-subtle">
            Gia phả chưa có quan hệ nào.
          </p>
        )}
      </div>
    </DialogShell>
  );
}
