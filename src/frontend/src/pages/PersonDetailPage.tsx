import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PersonSidebarDetail,
  PersonUpdateInput,
} from "@family-tree/shared-types";
import {
  ArrowLeft,
  Camera,
  Edit3,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useNotifications } from "../app/providers/NotificationProvider";
import {
  addPersonImage,
  deletePerson,
  deletePersonImage,
  getPersonDetail,
  updatePerson,
  uploadPersonImage,
} from "../features/family-tree/api";
import { primaryButtonClass, secondaryButtonClass } from "../lib/ui-classes";

type Field = {
  key: keyof PersonUpdateInput;
  label: string;
  type?:
    | "date"
    | "textarea"
    | "gender"
    | "precision"
    | "boolean"
    | "aliases"
    | "json";
  span?: boolean;
};
const sections: Array<{ title: string; fields: Field[] }> = [
  {
    title: "Thông tin định danh",
    fields: [
      { key: "fullName", label: "Họ và tên" },
      { key: "preferredName", label: "Tên thường gọi" },
      { key: "title", label: "Danh xưng / học hàm" },
      { key: "maidenName", label: "Tên trước hôn nhân" },
      {
        key: "aliases",
        label: "Tên khác (phân cách bằng dấu phẩy)",
        type: "aliases",
        span: true,
      },
      { key: "gender", label: "Giới tính", type: "gender" },
      { key: "identificationCode", label: "Mã định danh" },
      { key: "bloodType", label: "Nhóm máu" },
    ],
  },
  {
    title: "Dòng họ",
    fields: [
      { key: "clanBranch", label: "Chi họ" },
      { key: "generationName", label: "Đời / thế hệ" },
      { key: "familyPosition", label: "Vai vế trong gia đình" },
    ],
  },
  {
    title: "Sinh – mất",
    fields: [
      { key: "birthDate", label: "Ngày sinh", type: "date" },
      {
        key: "birthDatePrecision",
        label: "Độ chính xác ngày sinh",
        type: "precision",
      },
      { key: "birthPlace", label: "Nơi sinh" },
      { key: "isDeceased", label: "Đã mất", type: "boolean" },
      { key: "deathDate", label: "Ngày mất", type: "date" },
      {
        key: "deathDatePrecision",
        label: "Độ chính xác ngày mất",
        type: "precision",
      },
      { key: "deathPlace", label: "Nơi mất" },
      { key: "burialPlace", label: "Nơi an táng" },
    ],
  },
  {
    title: "Quê quán và nơi cư trú",
    fields: [
      { key: "hometown", label: "Quê quán" },
      { key: "currentResidence", label: "Nơi ở hiện tại" },
      { key: "address", label: "Địa chỉ", span: true },
      { key: "nationality", label: "Quốc tịch" },
      { key: "ethnicity", label: "Dân tộc" },
      { key: "religion", label: "Tôn giáo" },
    ],
  },
  {
    title: "Học tập và công việc",
    fields: [
      { key: "occupation", label: "Nghề nghiệp" },
      { key: "employer", label: "Nơi công tác" },
      { key: "education", label: "Học vấn", type: "textarea", span: true },
    ],
  },
  {
    title: "Liên hệ",
    fields: [
      { key: "phone", label: "Số điện thoại" },
      { key: "email", label: "Email" },
      {
        key: "socialLinks",
        label: "Liên kết mạng xã hội (JSON)",
        type: "json",
        span: true,
      },
    ],
  },
  {
    title: "Tiểu sử và ghi chú",
    fields: [
      { key: "biography", label: "Tiểu sử", type: "textarea", span: true },
      { key: "notes", label: "Ghi chú", type: "textarea", span: true },
    ],
  },
];

const toForm = (person: PersonSidebarDetail): Record<string, unknown> => ({
  ...person,
  birthDate: person.birthDate?.slice(0, 10) ?? "",
  deathDate: person.deathDate?.slice(0, 10) ?? "",
  aliases: person.aliases.join(", "),
  socialLinks: person.socialLinks
    ? JSON.stringify(person.socialLinks, null, 2)
    : "",
});

export function PersonDetailPage() {
  const { treeId = "", personId = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const notice = useNotifications();
  const query = useQuery({
    queryKey: ["person", treeId, personId],
    queryFn: () => getPersonDetail(treeId, personId),
    enabled: Boolean(treeId && personId),
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (query.data) setForm(toForm(query.data));
  }, [query.data]);
  const save = useMutation({
    mutationFn: async () => {
      let socialLinks: Record<string, string> | null = null;
      if (String(form.socialLinks ?? "").trim())
        socialLinks = JSON.parse(String(form.socialLinks));
      const payload: PersonUpdateInput = {};
      for (const section of sections)
        for (const field of section.fields) {
          const value = form[field.key];
          if (field.type === "aliases")
            payload.aliases = String(value ?? "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
          else if (field.type === "json") payload.socialLinks = socialLinks;
          else if (field.type === "date")
            (payload as Record<string, unknown>)[field.key] = value
              ? new Date(`${value}T00:00:00.000Z`).toISOString()
              : null;
          else
            (payload as Record<string, unknown>)[field.key] =
              value === "" ? null : value;
        }
      payload.avatarUrl = (form.avatarUrl as string) || null;
      payload.avatarPublicId = (form.avatarPublicId as string) || null;
      return updatePerson(treeId, personId, payload);
    },
    onSuccess: (person) => {
      client.setQueryData(["person", treeId, personId], person);
      client.invalidateQueries({ queryKey: ["tree-persons", treeId] });
      client.invalidateQueries({ queryKey: ["tree-graph", treeId] });
      setEditing(false);
      notice.toast("Đã lưu thông tin thành viên", "success");
    },
    onError: (error) =>
      notice.alert(
        "Không thể lưu",
        error instanceof Error ? error.message : "Dữ liệu chưa hợp lệ",
      ),
  });
  const upload = async (file: File, avatar: boolean) => {
    setUploading(true);
    try {
      const image = await uploadPersonImage(treeId, personId, file);
      if (avatar) {
        setForm((current) => ({
          ...current,
          avatarUrl: image.secure_url,
          avatarPublicId: image.public_id,
        }));
        setEditing(true);
      } else {
        await addPersonImage(treeId, personId, {
          url: image.secure_url,
          publicId: image.public_id,
          caption: null,
          takenAt: null,
          width: image.width,
          height: image.height,
          format: image.format,
          bytes: image.bytes,
          sortOrder: query.data?.images.length ?? 0,
        });
        await client.invalidateQueries({
          queryKey: ["person", treeId, personId],
        });
      }
      notice.toast(
        avatar ? "Ảnh đại diện đã sẵn sàng, hãy bấm Lưu" : "Đã thêm ảnh",
        "success",
      );
    } catch (error) {
      notice.alert(
        "Không thể tải ảnh",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      );
    } finally {
      setUploading(false);
    }
  };
  if (query.isLoading)
    return (
      <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center bg-[#edf2ee] text-[#61736a]">
        Đang tải hồ sơ thành viên…
      </main>
    );
  if (!query.data)
    return (
      <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center bg-[#edf2ee] text-[#8d3d32]">
        Không tìm thấy thành viên hoặc bạn không có quyền xem.
      </main>
    );
  const person = query.data;
  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-[#edf2ee] px-4 py-6 text-[#18332e] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/trees/${treeId}?person=${personId}`}
            className="flex items-center gap-2 text-[#805824] no-underline"
          >
            <ArrowLeft size={18} /> Trở lại gia phả
          </Link>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setForm(toForm(person));
                    setEditing(false);
                  }}
                >
                  <X size={16} /> Hủy
                </button>
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={save.isPending}
                  onClick={() => save.mutate()}
                >
                  <Save size={16} />{" "}
                  {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => setEditing(true)}
              >
                <Edit3 size={16} /> Chỉnh sửa
              </button>
            )}
            <button
              type="button"
              className={`${secondaryButtonClass} text-[#a33d32]`}
              onClick={async () => {
                if (
                  await notice.confirm(
                    "Xóa thành viên",
                    `Xóa ${person.fullName} khỏi gia phả và các quan hệ liên quan?`,
                  )
                ) {
                  await deletePerson(treeId, personId);
                  navigate(`/trees/${treeId}?tab=members`);
                  notice.toast("Đã xóa thành viên", "success");
                }
              }}
            >
              <Trash2 size={16} /> Xóa
            </button>
          </div>
        </div>
        <section className="mb-5 flex flex-col items-center gap-5 rounded-2xl border border-[#cad7d0] bg-white p-6 shadow-sm sm:flex-row">
          <div className="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-full bg-[#dbe6e0] font-display text-4xl font-bold text-[#36584e]">
            {form.avatarUrl ? (
              <img
                src={String(form.avatarUrl)}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              person.fullName[0]
            )}
            <label className="absolute inset-x-0 bottom-0 flex cursor-pointer justify-center bg-black/55 py-2 text-white">
              <Camera size={17} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(event) =>
                  event.target.files?.[0] && upload(event.target.files[0], true)
                }
              />
            </label>
          </div>
          <div>
            <p className="m-0 text-xs font-bold tracking-widest text-[#a06e2b]">
              HỒ SƠ THÀNH VIÊN
            </p>
            <h1 className="mt-1 mb-1 font-display text-3xl">
              {person.fullName}
            </h1>
            <p className="m-0 text-[#61736a]">
              {person.isDeceased ? "Đã mất" : "Còn sống"} · Chỉ chủ sở hữu gia
              phả có quyền xem và chỉnh sửa
            </p>
          </div>
        </section>
        <div className="grid gap-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-[#cad7d0] bg-white p-5 shadow-sm"
            >
              <h2 className="mt-0 mb-4 font-display text-xl">
                {section.title}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => (
                  <label
                    key={field.key}
                    className={`grid gap-1.5 text-sm font-bold text-[#526a60] ${field.span ? "md:col-span-2" : ""}`}
                  >
                    {field.label}
                    <FieldInput
                      field={field}
                      value={form[field.key]}
                      disabled={!editing}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          [field.key]: value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        <section className="mt-5 rounded-2xl border border-[#cad7d0] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="m-0 font-display text-xl">Thư viện ảnh</h2>
              <p className="mt-1 mb-0 text-sm text-[#61736a]">
                Ảnh được lưu trữ an toàn trên Cloudinary.
              </p>
            </div>
            <label className={`${primaryButtonClass} cursor-pointer`}>
              <Upload size={16} /> {uploading ? "Đang tải…" : "Thêm ảnh"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(event) =>
                  Array.from(event.target.files ?? []).forEach(
                    (file) => void upload(file, false),
                  )
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {person.images.map((image) => (
              <figure
                key={image.id}
                className="group relative m-0 aspect-square overflow-hidden rounded-xl bg-[#e7ede9]"
              >
                <img
                  src={image.url}
                  alt={image.caption ?? "Ảnh thành viên"}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Xóa ảnh"
                  onClick={async () => {
                    if (
                      await notice.confirm(
                        "Xóa ảnh",
                        "Ảnh sẽ bị xóa khỏi Cloudinary và không thể khôi phục.",
                      )
                    ) {
                      await deletePersonImage(treeId, personId, image.id);
                      await client.invalidateQueries({
                        queryKey: ["person", treeId, personId],
                      });
                    }
                  }}
                  className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              </figure>
            ))}
            {!person.images.length && (
              <p className="col-span-full py-8 text-center text-[#71827a]">
                Chưa có ảnh liên quan.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: Field;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const common =
    "w-full rounded-lg border border-[#c8d5ce] bg-[#fbfcfb] px-3 py-2.5 font-normal text-[#18332e] disabled:border-transparent disabled:bg-[#f1f5f2] disabled:text-[#52645c]";
  if (field.type === "textarea" || field.type === "json")
    return (
      <textarea
        rows={field.type === "json" ? 4 : 3}
        className={common}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  if (field.type === "gender")
    return (
      <select
        className={common}
        disabled={disabled}
        value={String(value ?? "UNKNOWN")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="MALE">Nam</option>
        <option value="FEMALE">Nữ</option>
        <option value="OTHER">Khác</option>
        <option value="UNKNOWN">Chưa rõ</option>
      </select>
    );
  if (field.type === "precision")
    return (
      <select
        className={common}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Chưa xác định</option>
        <option value="DAY">Chính xác đến ngày</option>
        <option value="MONTH">Chính xác đến tháng</option>
        <option value="YEAR">Chính xác đến năm</option>
      </select>
    );
  if (field.type === "boolean")
    return (
      <select
        className={common}
        disabled={disabled}
        value={String(Boolean(value))}
        onChange={(event) => onChange(event.target.value === "true")}
      >
        <option value="false">Còn sống</option>
        <option value="true">Đã mất</option>
      </select>
    );
  return (
    <input
      type={
        field.type === "date"
          ? "date"
          : field.key === "email"
            ? "email"
            : "text"
      }
      className={common}
      disabled={disabled}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
