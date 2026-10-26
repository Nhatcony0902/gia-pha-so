import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PersonCreateInput,
  PersonSidebarDetail,
  PersonUpdateInput,
} from "@family-tree/shared-types";
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronRight,
  Edit3,
  Link2,
  Save,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useNotifications } from "../app/providers/NotificationProvider";
import { Breadcrumbs } from "../components/Breadcrumbs";
import {
  addPersonImage,
  createPerson,
  deletePerson,
  deletePersonImage,
  getPersonDetail,
  getPersonLinkCandidates,
  getTreeGraph,
  linkPerson,
  updatePerson,
  uploadPersonImage,
} from "../features/family-tree/api";
import { PersonSidebar } from "../features/family-tree/PersonSidebar";
import { ShareDialog } from "../features/sharing/ShareDialog";
import {
  compactDangerButtonClass,
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formFieldClass,
  formLabelClass,
  surfaceCardClass,
} from "../lib/ui-classes";

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

const emptyForm: Record<string, unknown> = {
  fullName: "",
  gender: "UNKNOWN",
  isDeceased: false,
  aliases: "",
  socialLinks: "",
};

const toPayload = (form: Record<string, unknown>): PersonUpdateInput => {
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
  return payload;
};

export function PersonDetailPage() {
  const { treeId = "", personId = "" } = useParams();
  const isCreating = personId === "new";
  const navigate = useNavigate();
  const [pageSearchParams] = useSearchParams();
  const client = useQueryClient();
  const notice = useNotifications();
  const creationMode =
    pageSearchParams.get("mode") === "existing" ? "existing" : "new";
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    [],
  );
  const [candidateSidebar, setCandidateSidebar] = useState<{
    treeId: string;
    personId: string;
  } | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const query = useQuery({
    queryKey: ["person", treeId, personId],
    queryFn: () => getPersonDetail(treeId, personId),
    enabled: Boolean(treeId && personId && !isCreating),
  });
  const creationTree = useQuery({
    queryKey: ["tree-graph", treeId],
    queryFn: () => getTreeGraph(treeId),
    enabled: Boolean(treeId && isCreating),
  });
  const linkCandidates = useQuery({
    queryKey: ["person-link-candidates", treeId],
    queryFn: () => getPersonLinkCandidates(treeId),
    enabled: Boolean(treeId && isCreating && creationMode === "existing"),
  });
  const candidateDetail = useQuery({
    queryKey: ["person", candidateSidebar?.treeId, candidateSidebar?.personId],
    queryFn: () =>
      getPersonDetail(candidateSidebar!.treeId, candidateSidebar!.personId),
    enabled: Boolean(candidateSidebar),
  });
  const [editing, setEditing] = useState(isCreating);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(() =>
    isCreating ? { ...emptyForm } : {},
  );
  const [uploading, setUploading] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [pendingImages, setPendingImages] = useState<
    Array<{ file: File; previewUrl: string }>
  >([]);
  const pendingImageUrls = useRef<string[]>([]);
  useEffect(
    () => () => {
      pendingImageUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  useEffect(() => {
    if (query.data) setForm(toForm(query.data));
  }, [query.data]);
  const save = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (isCreating) {
        const fullName = String(payload.fullName ?? "").trim();
        if (!fullName)
          throw new Error("Họ và tên thành viên không được để trống");
        return createPerson(treeId, {
          ...payload,
          fullName,
        } satisfies PersonCreateInput);
      }
      return updatePerson(treeId, personId, payload);
    },
    onSuccess: async (person) => {
      setEditing(false);
      let savedPerson = person;
      let avatarUploadFailed = false;
      let failedImageCount = 0;
      if (isCreating && pendingAvatar) {
        try {
          const avatar = await uploadPersonImage(
            treeId,
            person.id,
            pendingAvatar.file,
          );
          savedPerson = await updatePerson(treeId, person.id, {
            avatarUrl: avatar.secure_url,
            avatarPublicId: avatar.public_id,
          });
        } catch {
          avatarUploadFailed = true;
        }
      }
      client.setQueryData(["person", treeId, person.id], savedPerson);
      if (isCreating && pendingImages.length) {
        for (const [index, pendingImage] of pendingImages.entries()) {
          try {
            const image = await uploadPersonImage(
              treeId,
              person.id,
              pendingImage.file,
            );
            await addPersonImage(treeId, person.id, {
              url: image.secure_url,
              publicId: image.public_id,
              caption: null,
              takenAt: null,
              width: image.width,
              height: image.height,
              format: image.format,
              bytes: image.bytes,
              sortOrder: index,
            });
          } catch {
            failedImageCount += 1;
          }
        }
        await client.invalidateQueries({
          queryKey: ["person", treeId, person.id],
        });
        pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        const galleryPreviewUrls = new Set(
          pendingImages.map((image) => image.previewUrl),
        );
        pendingImageUrls.current = pendingImageUrls.current.filter(
          (url) => !galleryPreviewUrls.has(url),
        );
        setPendingImages([]);
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ["trees"] }),
        client.invalidateQueries({ queryKey: ["tree-persons", treeId] }),
        client.invalidateQueries({ queryKey: ["tree-graph", treeId] }),
      ]);
      if (isCreating) {
        if (pendingAvatar) {
          URL.revokeObjectURL(pendingAvatar.previewUrl);
          pendingImageUrls.current = pendingImageUrls.current.filter(
            (url) => url !== pendingAvatar.previewUrl,
          );
          setPendingAvatar(null);
        }
        navigate(`/trees/${treeId}/persons/${person.id}`, { replace: true });
        if (avatarUploadFailed || failedImageCount)
          notice.alert(
            "Một số ảnh chưa được tải lên",
            [
              avatarUploadFailed ? "Ảnh đại diện" : "",
              failedImageCount ? `${failedImageCount} ảnh thư viện` : "",
            ]
              .filter(Boolean)
              .join(" và ") +
              " tải lên không thành công. Bạn có thể thử lại trong trang chi tiết.",
          );
      }
      notice.toast(
        isCreating ? "Đã thêm thành viên" : "Đã lưu thông tin thành viên",
        "success",
      );
    },
    onError: (error) =>
      notice.alert(
        "Không thể lưu",
        error instanceof Error ? error.message : "Dữ liệu chưa hợp lệ",
      ),
  });
  const linkExistingPerson = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        selectedCandidateIds.map((candidateId) =>
          linkPerson(treeId, candidateId),
        ),
      );
      const linked = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (!linked.length) {
        const reason = failed[0]?.reason;
        throw reason instanceof Error
          ? reason
          : new Error("Không thể thêm các thành viên đã chọn");
      }
      return {
        linked,
        failedCount: failed.length,
        requestedCount: results.length,
      };
    },
    onSuccess: async ({ linked, failedCount, requestedCount }) => {
      linked.forEach((person) =>
        client.setQueryData(["person", treeId, person.id], person),
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["trees"] }),
        client.invalidateQueries({ queryKey: ["tree-persons", treeId] }),
        client.invalidateQueries({ queryKey: ["tree-graph", treeId] }),
        client.invalidateQueries({
          queryKey: ["person-link-candidates", treeId],
        }),
      ]);
      setSelectedCandidateIds([]);
      if (requestedCount === 1 && failedCount === 0)
        navigate(`/trees/${treeId}/persons/${linked[0]!.id}`, {
          replace: true,
        });
      else navigate(`/trees/${treeId}/members`, { replace: true });
      notice.toast(`Đã thêm ${linked.length} thành viên`, "success");
      if (failedCount)
        notice.alert(
          "Một số thành viên chưa được thêm",
          `${failedCount} thành viên liên kết không thành công. Vui lòng thử lại.`,
        );
    },
    onError: (error) =>
      notice.alert(
        "Không thể thêm thành viên",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      ),
  });
  const remove = useMutation({
    mutationFn: () => deletePerson(treeId, personId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["trees"] });
      client.invalidateQueries({ queryKey: ["tree-persons", treeId] });
      client.invalidateQueries({ queryKey: ["tree-graph", treeId] });
      navigate(`/trees/${treeId}/members`);
      notice.toast("Đã xóa thành viên", "success");
    },
    onError: (error) =>
      notice.alert(
        "Không thể xóa thành viên",
        error instanceof Error ? error.message : "Vui lòng thử lại",
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
  const candidateKeyword = candidateSearch.trim().toLocaleLowerCase("vi");
  const candidateGroupsByTree = new Map<
    string,
    {
      tree: { id: string; name: string };
      persons: NonNullable<typeof linkCandidates.data>["persons"];
    }
  >();
  for (const candidate of linkCandidates.data?.persons ?? []) {
    for (const sourceTree of candidate.sourceTrees) {
      const matches = [
        candidate.fullName,
        candidate.preferredName,
        sourceTree.name,
      ].some((value) =>
        value?.toLocaleLowerCase("vi").includes(candidateKeyword),
      );
      if (candidateKeyword && !matches) continue;
      const group = candidateGroupsByTree.get(sourceTree.id) ?? {
        tree: sourceTree,
        persons: [],
      };
      group.persons.push(candidate);
      candidateGroupsByTree.set(sourceTree.id, group);
    }
  }
  const candidateGroups = [...candidateGroupsByTree.values()].sort((a, b) =>
    a.tree.name.localeCompare(b.tree.name, "vi"),
  );
  if (isCreating)
    return (
      <main className="min-h-[calc(100vh-4.5rem)] bg-surface-page px-4 py-6 text-ink md:px-8">
        <div
          className={`mx-auto w-full transition-[padding-right] duration-250 ${creationMode === "existing" && candidateSidebar ? "min-[801px]:pr-92" : ""}`}
        >
          <Breadcrumbs
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Danh sách gia phả", to: "/trees" },
              { label: "Gia phả", to: `/trees/${treeId}/tree` },
              { label: "Thành viên", to: `/trees/${treeId}/members` },
              { label: "Thêm thành viên" },
            ]}
            className="mb-5"
          />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              to={`/trees/${treeId}/members`}
              className="flex items-center gap-2 text-[#805824] no-underline"
            >
              <ArrowLeft size={18} /> Trở lại danh sách thành viên
            </Link>
            <div className="flex gap-2">
              <Link
                to={`/trees/${treeId}/members`}
                className={`${compactSecondaryButtonClass} no-underline`}
              >
                <X size={16} /> Hủy
              </Link>
              <button
                type="button"
                className={compactPrimaryButtonClass}
                disabled={
                  creationMode === "new"
                    ? save.isPending || !String(form.fullName ?? "").trim()
                    : linkExistingPerson.isPending ||
                      !selectedCandidateIds.length
                }
                onClick={() =>
                  creationMode === "new"
                    ? save.mutate()
                    : linkExistingPerson.mutate()
                }
              >
                {creationMode === "new" ? (
                  <Save size={16} />
                ) : (
                  <Link2 size={16} />
                )}
                {save.isPending || linkExistingPerson.isPending
                  ? "Đang thêm…"
                  : creationMode === "new"
                    ? "Tạo thành viên"
                    : selectedCandidateIds.length
                      ? `Thêm ${selectedCandidateIds.length} thành viên`
                      : "Thêm vào gia phả"}
              </button>
            </div>
          </div>
          {creationMode === "existing" ? (
            <div className="relative min-h-[34rem]">
              <section className={`${surfaceCardClass} p-5`}>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h1 className="m-0 font-display text-2xl">
                      Chọn thành viên từ gia phả khác
                    </h1>
                    <p className="mt-1 mb-0 text-sm text-ink-subtle">
                      Chỉ hiển thị thành viên chưa có trong gia phả đang xử lý.
                    </p>
                    {selectedCandidateIds.length > 0 && (
                      <button
                        type="button"
                        className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-xs font-bold text-accent-deep"
                        onClick={() => setSelectedCandidateIds([])}
                      >
                        Đã chọn {selectedCandidateIds.length} · Bỏ chọn tất cả
                      </button>
                    )}
                  </div>
                  <label className="relative min-w-64 flex-1 sm:max-w-sm">
                    <span className="sr-only">Tìm thành viên</span>
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
                    />
                    <input
                      type="search"
                      className={`${formFieldClass} pl-10`}
                      placeholder="Tìm theo tên hoặc gia phả…"
                      value={candidateSearch}
                      onChange={(event) =>
                        setCandidateSearch(event.target.value)
                      }
                    />
                  </label>
                </div>
                {linkCandidates.isLoading ? (
                  <p className="py-10 text-center text-ink-subtle">
                    Đang tải thành viên từ các gia phả khác…
                  </p>
                ) : linkCandidates.isError ? (
                  <div className="py-10 text-center">
                    <p className="text-[#8d3d32]">
                      Không thể tải danh sách thành viên.
                    </p>
                    <button
                      type="button"
                      className={compactSecondaryButtonClass}
                      onClick={() => linkCandidates.refetch()}
                    >
                      Thử lại
                    </button>
                  </div>
                ) : candidateGroups.length ? (
                  <div className="grid gap-7">
                    {candidateGroups.map((group) => (
                      <section key={group.tree.id}>
                        <div className="mb-3 flex items-center justify-between gap-3 border-b border-border-default pb-2">
                          <h2 className="m-0 font-display text-xl">
                            {group.tree.name}
                          </h2>
                          <span className="text-xs text-ink-subtle">
                            {group.persons.length} thành viên
                          </span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {group.persons.map((candidate) => {
                            const selected = selectedCandidateIds.includes(
                              candidate.id,
                            );
                            return (
                              <article
                                key={`${group.tree.id}-${candidate.id}`}
                                className={`flex items-stretch overflow-hidden rounded-xl border transition-colors ${selected ? "border-accent bg-[#fff8e9] shadow-sm" : "border-border-default bg-white hover:bg-surface-hover"}`}
                              >
                                <label className="flex shrink-0 cursor-pointer items-center px-3 pl-4">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    disabled={linkExistingPerson.isPending}
                                    onChange={() => {
                                      setSelectedCandidateIds((current) =>
                                        current.includes(candidate.id)
                                          ? current.filter(
                                              (id) => id !== candidate.id,
                                            )
                                          : [...current, candidate.id],
                                      );
                                      setCandidateSidebar({
                                        treeId: group.tree.id,
                                        personId: candidate.id,
                                      });
                                    }}
                                    className="size-4 accent-[#b87b24]"
                                    aria-label={`Chọn ${candidate.fullName}`}
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-3 text-left"
                                  onClick={() => {
                                    setSelectedCandidateIds((current) =>
                                      current.includes(candidate.id)
                                        ? current.filter(
                                            (id) => id !== candidate.id,
                                          )
                                        : [...current, candidate.id],
                                    );
                                    setCandidateSidebar({
                                      treeId: group.tree.id,
                                      personId: candidate.id,
                                    });
                                  }}
                                  disabled={linkExistingPerson.isPending}
                                >
                                  {candidate.avatarUrl ? (
                                    <img
                                      src={candidate.avatarUrl}
                                      alt=""
                                      className="size-12 shrink-0 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#dbe6e0] font-bold text-ink-soft">
                                      {candidate.fullName[0]}
                                    </span>
                                  )}
                                  <span className="min-w-0 flex-1">
                                    <strong className="block truncate text-sm text-ink">
                                      {candidate.fullName}
                                    </strong>
                                    <span className="mt-1 block text-xs text-ink-subtle">
                                      {selected
                                        ? "Đã chọn · Nhấn để bỏ chọn và xem thông tin"
                                        : "Nhấn để chọn và xem thông tin"}
                                    </span>
                                  </span>
                                </button>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-ink-subtle">
                    {candidateSearch.trim()
                      ? "Không tìm thấy thành viên phù hợp."
                      : "Không có thành viên nào từ gia phả khác để thêm."}
                  </p>
                )}
              </section>
              {candidateSidebar && (
                <PersonSidebar
                  treeId={candidateSidebar.treeId}
                  person={candidateDetail.data}
                  loading={candidateDetail.isLoading}
                  placement="fixed"
                  onClose={() => setCandidateSidebar(null)}
                  onSelectPerson={(nextPersonId) =>
                    setCandidateSidebar((current) =>
                      current
                        ? { ...current, personId: nextPersonId }
                        : current,
                    )
                  }
                />
              )}
            </div>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,0.95fr)_minmax(0,1.65fr)]">
              <aside className="grid gap-5">
                <section
                  className={`${surfaceCardClass} flex flex-col items-center gap-4 p-6 text-center`}
                >
                  <div className="relative grid size-35 shrink-0 place-items-center overflow-hidden rounded-full bg-[#dbe6e0] font-display text-4xl font-bold text-ink-soft">
                    {pendingAvatar ? (
                      <img
                        src={pendingAvatar.previewUrl}
                        alt="Ảnh đại diện xem trước"
                        className="size-full object-cover"
                      />
                    ) : (
                      (String(form.fullName ?? "").trim()[0] ?? "?")
                    )}
                    <label className="absolute inset-x-0 bottom-0 flex cursor-pointer justify-center bg-black/55 py-2 text-white">
                      <Camera size={17} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (pendingAvatar) {
                            URL.revokeObjectURL(pendingAvatar.previewUrl);
                            pendingImageUrls.current =
                              pendingImageUrls.current.filter(
                                (url) => url !== pendingAvatar.previewUrl,
                              );
                          }
                          const previewUrl = URL.createObjectURL(file);
                          pendingImageUrls.current.push(previewUrl);
                          setPendingAvatar({ file, previewUrl });
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="m-0 text-xs font-bold tracking-widest text-accent-deep">
                      HỒ SƠ THÀNH VIÊN MỚI
                    </p>
                    <h1 className="mt-1 mb-1 font-display text-2xl">
                      {String(form.fullName ?? "").trim() || "Chưa nhập họ tên"}
                    </h1>
                  </div>
                </section>
                <section className={`${surfaceCardClass} p-5`}>
                  <div className="mb-2">
                    <h2 className="m-0 font-display text-xl">Gia phả</h2>
                  </div>
                  <article className="py-3">
                    <Link
                      to={`/trees/${treeId}/tree`}
                      className="flex items-center justify-between gap-3 text-ink-soft no-underline transition-colors hover:text-accent-deep"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm leading-5 font-semibold">
                          {creationTree.data?.tree.name ??
                            (creationTree.isLoading
                              ? "Đang tải gia phả…"
                              : "Gia phả hiện tại")}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-subtle">
                          {creationTree.data
                            ? `${creationTree.data.tree.personCount} thành viên hiện tại`
                            : "Thành viên sẽ được thêm vào gia phả này"}
                        </span>
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    </Link>
                  </article>
                </section>
                <section className={`${surfaceCardClass} p-5`}>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="m-0 font-display text-xl">Thư viện ảnh</h2>
                    <label
                      className={`${compactPrimaryButtonClass} cursor-pointer`}
                    >
                      <Upload size={16} /> Thêm ảnh
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          const selectedImages = Array.from(
                            event.target.files ?? [],
                          ).map((file) => {
                            const previewUrl = URL.createObjectURL(file);
                            pendingImageUrls.current.push(previewUrl);
                            return { file, previewUrl };
                          });
                          setPendingImages((current) => [
                            ...current,
                            ...selectedImages,
                          ]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {pendingImages.length ? (
                    <div className="grid grid-cols-3 gap-3">
                      {pendingImages.map((image, index) => (
                        <figure
                          key={`${image.file.name}-${image.file.lastModified}-${index}`}
                          className="group relative m-0 aspect-square overflow-hidden rounded-xl bg-[#e7ede9]"
                        >
                          <img
                            src={image.previewUrl}
                            alt={image.file.name}
                            className="size-full object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Bỏ ảnh ${image.file.name}`}
                            onClick={() => {
                              URL.revokeObjectURL(image.previewUrl);
                              pendingImageUrls.current =
                                pendingImageUrls.current.filter(
                                  (url) => url !== image.previewUrl,
                                );
                              setPendingImages((current) =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              );
                            }}
                            className="absolute top-2 right-2 grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 size={15} />
                          </button>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-ink-subtle">
                      Chưa có ảnh được chọn.
                    </p>
                  )}
                </section>
              </aside>
              <div className="grid gap-5">
                {sections.map((section) => (
                  <section
                    key={section.title}
                    className={`${surfaceCardClass} p-5`}
                  >
                    <h2 className="mt-0 mb-4 font-display text-xl">
                      {section.title}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) => (
                        <label
                          key={field.key}
                          className={`${formLabelClass} ${field.span ? "md:col-span-2" : ""}`}
                        >
                          {field.label}
                          {field.key === "fullName" && " *"}
                          <FieldInput
                            field={field}
                            value={form[field.key]}
                            disabled={false}
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
            </div>
          )}
        </div>
      </main>
    );
  if (query.isLoading)
    return (
      <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center bg-surface-page text-ink-muted">
        Đang tải hồ sơ thành viên…
      </main>
    );
  if (!query.data)
    return (
      <main className="grid min-h-[calc(100vh-4.5rem)] place-items-center bg-surface-page text-[#8d3d32]">
        Không tìm thấy thành viên hoặc bạn không có quyền xem.
      </main>
    );
  const person = query.data;
  const currentTree = person.visibleTrees.find((tree) => tree.id === treeId);
  const canEdit = currentTree?.myRole === "ADMIN";
  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-surface-page px-4 py-6 text-ink md:px-8">
      <div className="mx-auto w-full">
        <Breadcrumbs
          items={[
            { label: "Trang chủ", to: "/" },
            { label: "Danh sách gia phả", to: "/trees" },
            {
              label: currentTree?.name ?? "Gia phả",
              to: `/trees/${treeId}/tree`,
            },
            { label: "Thành viên", to: `/trees/${treeId}/members` },
            { label: person.fullName },
          ]}
          className="mb-5"
        />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/trees/${treeId}/tree?person=${personId}`}
            className="flex items-center gap-2 text-[#805824] no-underline"
          >
            <ArrowLeft size={18} /> Trở lại gia phả
          </Link>
          {canEdit && (
            <div className="flex gap-2">
              {!editing && (
                <button
                  type="button"
                  className={compactSecondaryButtonClass}
                  onClick={() => setInviteOpen(true)}
                >
                  <UserPlus size={16} /> Mời người này
                </button>
              )}
              {editing ? (
                <>
                  <button
                    type="button"
                    className={compactSecondaryButtonClass}
                    onClick={() => {
                      setForm(toForm(person));
                      setEditing(false);
                    }}
                  >
                    <X size={16} /> Hủy
                  </button>
                  <button
                    type="button"
                    className={compactPrimaryButtonClass}
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
                  className={compactPrimaryButtonClass}
                  onClick={() => setEditing(true)}
                >
                  <Edit3 size={16} /> Chỉnh sửa
                </button>
              )}
              <button
                type="button"
                className={compactDangerButtonClass}
                disabled={remove.isPending}
                onClick={async () => {
                  if (
                    await notice.confirm(
                      "Xóa thành viên",
                      `Xóa ${person.fullName} khỏi gia phả và các quan hệ liên quan?`,
                    )
                  ) {
                    remove.mutate();
                  }
                }}
              >
                <Trash2 size={16} /> {remove.isPending ? "Đang xóa…" : "Xóa"}
              </button>
            </div>
          )}
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,0.95fr)_minmax(0,1.65fr)]">
          <aside className="grid gap-5">
            <section
              className={`${surfaceCardClass} flex flex-col items-center gap-4 p-6 text-center`}
            >
              <div className="relative grid size-35 shrink-0 place-items-center overflow-hidden rounded-full bg-[#dbe6e0] font-display text-4xl font-bold text-ink-soft">
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
                      event.target.files?.[0] &&
                      upload(event.target.files[0], true)
                    }
                  />
                </label>
              </div>
              <div>
                <p className="m-0 text-xs font-bold tracking-widest text-accent-deep">
                  HỒ SƠ THÀNH VIÊN
                </p>
                <h1 className="mt-1 mb-1 font-display text-2xl">
                  {person.fullName}
                </h1>
              </div>
            </section>
            <section className={`${surfaceCardClass} p-5`}>
              <div className="mb-2">
                <h2 className="m-0 font-display text-xl">Gia phả</h2>
              </div>
              {person.visibleTrees.length ? (
                <div className="divide-y divide-[#e2e8e4]">
                  {person.visibleTrees.map((tree) => {
                    const relatives = [...tree.relatives].sort(
                      (left, right) => {
                        const order = { PARENT: 0, SPOUSE: 1, CHILD: 2 };
                        return order[left.role] - order[right.role];
                      },
                    );
                    return (
                      <article key={tree.id} className="py-3">
                        <Link
                          to={`/trees/${tree.id}/tree?person=${person.id}`}
                          className="flex items-center justify-between gap-3 text-ink-soft no-underline transition-colors hover:text-accent-deep"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm leading-5 font-semibold">
                              {tree.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-ink-subtle">
                              {tree.personCount} thành viên · {relatives.length}{" "}
                              người thân
                            </span>
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                        </Link>
                        {relatives.length ? (
                          <div className="mt-3 grid gap-1.5">
                            {relatives.map((relative) => (
                              <Link
                                key={`${relative.relationshipId}-${relative.role}`}
                                to={`/trees/${tree.id}/persons/${relative.person.id}`}
                                className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f0f5f2] p-2 text-ink-strong no-underline transition-colors hover:bg-[#e3ece7]"
                              >
                                {relative.person.avatarUrl ? (
                                  <img
                                    src={relative.person.avatarUrl}
                                    alt=""
                                    className="size-8 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#d8e5de] text-xs font-bold">
                                    {relative.person.fullName[0]}
                                  </span>
                                )}
                                <span className="min-w-0 flex-1">
                                  <strong className="block truncate text-xs">
                                    {relative.person.fullName}
                                  </strong>
                                  <small className="block truncate text-[0.68rem] text-ink-subtle">
                                    {relative.label}
                                  </small>
                                </span>
                                <ChevronRight
                                  aria-hidden="true"
                                  className="size-3.5 shrink-0 text-[#82938b]"
                                />
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 mb-0 text-xs text-[#82938b]">
                            Chưa có quan hệ người thân trong gia phả này.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="m-0 py-3 text-sm text-ink-subtle">
                  Chưa có gia phả nào được liên kết.
                </p>
              )}
            </section>
            <section className={`${surfaceCardClass} p-5`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="m-0 font-display text-xl">Thư viện ảnh</h2>
                </div>
                {canEdit && (
                  <label
                    className={`${compactPrimaryButtonClass} cursor-pointer`}
                  >
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
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
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
                    {canEdit && (
                      <button
                        type="button"
                        aria-label="Xóa ảnh"
                        onClick={async () => {
                          if (
                            await notice.confirm(
                              "Xóa ảnh",
                              "Ảnh sẽ bị xóa và không thể khôi phục.",
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
                    )}
                  </figure>
                ))}
                {!person.images.length && (
                  <p className="col-span-full py-8 text-center text-ink-subtle">
                    Chưa có ảnh liên quan.
                  </p>
                )}
              </div>
            </section>
          </aside>
          <div className="grid gap-5">
            {sections.map((section) => (
              <section
                key={section.title}
                className={`${surfaceCardClass} p-5`}
              >
                <h2 className="mt-0 mb-4 font-display text-xl">
                  {section.title}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <label
                      key={field.key}
                      className={`${formLabelClass} ${field.span ? "md:col-span-2" : ""}`}
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
        </div>
      </div>
      {inviteOpen && (
        <ShareDialog
          treeId={treeId}
          treeName={currentTree?.name ?? "Gia phả"}
          initialPersonId={person.id}
          initialEmail={person.email}
          onClose={() => setInviteOpen(false)}
        />
      )}
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
  const common = `${formFieldClass} disabled:border-transparent disabled:bg-[#f1f5f2] disabled:text-[#52645c]`;
  const selectClass = `${common} appearance-none pr-10`;
  const selectArrow = (
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#52645c]"
    />
  );
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
      <div className="relative">
        <select
          className={selectClass}
          disabled={disabled}
          value={String(value ?? "UNKNOWN")}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="MALE">Nam</option>
          <option value="FEMALE">Nữ</option>
          <option value="OTHER">Khác</option>
          <option value="UNKNOWN">Chưa rõ</option>
        </select>
        {selectArrow}
      </div>
    );
  if (field.type === "precision")
    return (
      <div className="relative">
        <select
          className={selectClass}
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">Chưa xác định</option>
          <option value="DAY">Chính xác đến ngày</option>
          <option value="MONTH">Chính xác đến tháng</option>
          <option value="YEAR">Chính xác đến năm</option>
        </select>
        {selectArrow}
      </div>
    );
  if (field.type === "boolean")
    return (
      <div className="relative">
        <select
          className={selectClass}
          disabled={disabled}
          value={String(Boolean(value))}
          onChange={(event) => onChange(event.target.value === "true")}
        >
          <option value="false">Còn sống</option>
          <option value="true">Đã mất</option>
        </select>
        {selectArrow}
      </div>
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
