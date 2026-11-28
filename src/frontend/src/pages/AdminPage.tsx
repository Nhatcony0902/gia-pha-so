import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AiSettings,
  InvitationStatus,
  TreeInvitation,
  TreeMember,
  TreeRole,
} from "@family-tree/shared-types";
import {
  Crown,
  Link2,
  LoaderCircle,
  Mail,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { useNotifications } from "../app/providers/NotificationProvider";
import { PageBreadcrumbBar } from "../components/PageHeader";
import {
  AiConsentPanel,
  LivingDetailsOption,
  errorText,
  useAiSettings,
} from "../features/chatbot/AiConsentPanel";
import { getChatContext } from "../features/chatbot/api";
import { getTrees } from "../features/family-tree/api";
import {
  getTreeInvitations,
  getTreeMembers,
  removeTreeMember,
  revokeTreeInvitation,
  roleLabel,
  updateTreeMemberRole,
} from "../features/sharing/api";
import { ShareDialog } from "../features/sharing/ShareDialog";
import {
  compactDangerButtonClass,
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formSelectClass,
} from "../lib/ui-classes";

/**
 * Trang quản trị gia phả cho trưởng họ (LMS-010): người có quyền truy cập và vai trò,
 * lời mời, trợ lý AI và riêng tư (LMS-023). Chỉ dùng các API có sẵn và API đổi vai trò.
 * Hàng chờ duyệt (LMS-011) và thống kê (LMS-008) sẽ thêm vào đây khi có.
 */

const routeStateClass =
  "grid min-h-[calc(100dvh-4rem)] place-content-center justify-items-center gap-[0.8rem] bg-surface-page p-4 text-center text-ink [&>h1]:m-0 [&>p]:m-0";
const cardClass = "rounded-2xl border border-border-default bg-surface";
const sectionClass = `${cardClass} grid gap-4 p-4 sm:p-5`;
const sectionTitleClass =
  "m-0 flex items-center gap-2 font-display text-lg font-semibold text-ink";
const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });
const formatDate = (iso: string) => dateFormat.format(new Date(iso));

/** Vai trò chọn được lúc này. Biên tập viên mở khi có quy trình duyệt (LMS-011). */
const roleOptions: Array<{ role: TreeRole; disabled?: boolean }> = [
  { role: "ADMIN" },
  { role: "VIEWER" },
  { role: "EDITOR", disabled: true },
];

const statusTone: Record<InvitationStatus, string> = {
  ACTIVE: "bg-[#e5f2ec] text-[#24624a]",
  EXPIRED: "bg-[#f3ede2] text-[#7a6440]",
  REVOKED: "bg-[#f4e6e3] text-[#963c31]",
  EXHAUSTED: "bg-[#f3ede2] text-[#7a6440]",
};
const statusLabel: Record<InvitationStatus, string> = {
  ACTIVE: "Đang hoạt động",
  EXPIRED: "Hết hạn",
  REVOKED: "Đã thu hồi",
  EXHAUSTED: "Hết lượt",
};

export function AdminPage() {
  const { treeId = "" } = useParams();
  const trees = useQuery({ queryKey: ["trees"], queryFn: getTrees });
  const tree = [
    ...(trees.data?.createdByMe ?? []),
    ...(trees.data?.sharedWithMe ?? []),
  ].find((item) => item.id === treeId);

  if (trees.isLoading)
    return (
      <main className={routeStateClass}>
        <LoaderCircle className="animate-spin text-focus" size={32} />
        <p>Đang mở trang quản trị…</p>
      </main>
    );
  if (!tree)
    return (
      <main className={routeStateClass}>
        <h1>Không tìm thấy gia phả</h1>
        <p>Gia phả không tồn tại hoặc bạn không có quyền xem.</p>
        <Link to="/trees">Về danh sách</Link>
      </main>
    );
  if (tree.myRole !== "ADMIN")
    return (
      <main className={routeStateClass}>
        <h1>Chỉ trưởng họ mới mở được trang này</h1>
        <p>Bạn đang có quyền {roleLabel[tree.myRole].toLowerCase()}.</p>
        <Link to={`/trees/${treeId}/tree`}>Về cây gia phả</Link>
      </main>
    );
  return (
    <AdminView
      key={treeId}
      treeId={treeId}
      treeName={tree.name}
      personCount={tree.personCount}
    />
  );
}

function AdminView({
  treeId,
  treeName,
  personCount,
}: {
  treeId: string;
  treeName: string;
  personCount: number;
}) {
  const client = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const members = useQuery({
    queryKey: ["tree-members", treeId],
    queryFn: () => getTreeMembers(treeId),
  });
  const invitations = useQuery({
    queryKey: ["tree-invitations", treeId],
    queryFn: () => getTreeInvitations(treeId),
  });
  const chat = useQuery({
    queryKey: ["chat-context", treeId],
    queryFn: () => getChatContext(treeId),
  });

  const memberList = members.data?.members ?? [];
  const admins = memberList.filter((m) => m.role === "ADMIN").length;
  const activeInvitations = (invitations.data?.invitations ?? []).filter(
    (i) => i.status === "ACTIVE",
  ).length;
  const ai = chat.data?.ai;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-surface-page px-4 py-4 text-ink md:px-6">
      <PageBreadcrumbBar
        headerClassName="z-3 -mx-4 -mt-4 mb-6 border-b border-border-default bg-[rgba(249,251,250,0.96)] px-5 md:-mx-6"
        // Tên gia phả dài trên điện thoại: cuộn ngang thanh breadcrumb thay vì tràn cả trang.
        breadcrumbClassName="overflow-x-auto [scrollbar-width:none]"
        items={[
          { label: "Trang chủ", to: "/" },
          { label: "Danh sách gia phả", to: "/trees" },
          { label: treeName, to: `/trees/${treeId}/tree` },
          { label: "Quản trị" },
        ]}
      />
      <div className="mx-auto grid w-full max-w-5xl gap-5 pb-10">
        <div className="grid gap-1">
          <h1 className="m-0 font-display text-2xl font-semibold">
            Quản trị gia phả
          </h1>
          <p className="m-0 text-ink-muted">
            Quản lý người có quyền truy cập, lời mời và trợ lý AI của {treeName}
            .
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Người trong cây"
            value={personCount}
            to={`/trees/${treeId}/members`}
          />
          <StatCard
            label="Người có quyền truy cập"
            value={members.data ? memberList.length : "…"}
            hint={
              members.data
                ? `${admins} trưởng họ · ${memberList.length - admins} chỉ xem`
                : undefined
            }
          />
          <StatCard
            label="Lời mời còn hiệu lực"
            value={invitations.data ? activeInvitations : "…"}
          />
          <StatCard
            label="Trợ lý AI"
            value={ai ? (ai.enabled ? "Đang bật" : "Đang tắt") : "…"}
            hint={
              ai?.enabled
                ? ai.shareLivingDetails
                  ? "Chia sẻ chi tiết người còn sống"
                  : "Ẩn chi tiết người còn sống"
                : undefined
            }
            tone={ai && !ai.enabled ? "muted" : "default"}
          />
        </div>

        <MembersSection
          treeId={treeId}
          members={memberList}
          loading={members.isLoading}
          error={members.isError ? errorText(members.error) : null}
        />

        <InvitationsSection
          treeId={treeId}
          invitations={invitations.data?.invitations ?? []}
          loading={invitations.isLoading}
          onCreate={() => setShareOpen(true)}
        />

        <section className={sectionClass} aria-labelledby="admin-ai">
          <h2 id="admin-ai" className={sectionTitleClass}>
            <Sparkles size={18} className="text-accent-deep" /> Trợ lý AI và
            riêng tư
          </h2>
          {chat.isLoading && <p className="m-0 text-ink-subtle">Đang tải…</p>}
          {chat.data && !chat.data.available && (
            <p className="m-0 rounded-lg border border-[#e2c58f] bg-[#fdf6e8] px-3 py-2 text-sm text-[#6d4c17]">
              Máy chủ chưa cấu hình GEMINI_API_KEY nên trợ lý AI chưa chạy được.
              Bạn vẫn đặt trước được cài đặt dưới đây.
            </p>
          )}
          {ai &&
            (ai.enabled ? (
              <AiEnabledSettings
                treeId={treeId}
                settings={ai}
                onChanged={() =>
                  client.invalidateQueries({
                    queryKey: ["chat-context", treeId],
                  })
                }
              />
            ) : (
              <AiConsentPanel
                embedded
                treeId={treeId}
                settings={ai}
                onChanged={() =>
                  client.invalidateQueries({
                    queryKey: ["chat-context", treeId],
                  })
                }
              />
            ))}
        </section>
      </div>
      {shareOpen && (
        <ShareDialog
          treeId={treeId}
          treeName={treeName}
          onClose={() => setShareOpen(false)}
        />
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
  to,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  to?: string;
  tone?: "default" | "muted";
}) {
  const body = (
    <>
      <span className="text-sm text-ink-muted">{label}</span>
      <strong
        className={`font-display text-2xl font-semibold ${tone === "muted" ? "text-ink-muted" : "text-ink"}`}
      >
        {value}
      </strong>
      {hint && <span className="text-xs text-ink-subtle">{hint}</span>}
    </>
  );
  const className = `${cardClass} grid content-start gap-1 p-4`;
  return to ? (
    <Link
      to={to}
      className={`${className} text-inherit no-underline transition-colors hover:border-focus`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function MembersSection({
  treeId,
  members,
  loading,
  error,
}: {
  treeId: string;
  members: TreeMember[];
  loading: boolean;
  error: string | null;
}) {
  const client = useQueryClient();
  const notice = useNotifications();
  const navigate = useNavigate();
  const { user } = useAuth();

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: TreeRole }) =>
      updateTreeMemberRole(treeId, userId, role),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["tree-members", treeId] });
      notice.toast(
        `Đã đổi vai trò thành ${roleLabel[result.role].toLowerCase()}`,
        "success",
      );
      // Tự rút quyền trưởng họ: không còn ở lại trang quản trị được.
      if (result.userId === user?.id && result.role !== "ADMIN") {
        void client.invalidateQueries({ queryKey: ["trees"] });
        navigate(`/trees/${treeId}/tree`);
      }
    },
    onError: (err) => notice.toast(errorText(err), "error"),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeTreeMember(treeId, userId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tree-members", treeId] });
      notice.toast("Đã xóa quyền truy cập", "success");
    },
    onError: (err) => notice.toast(errorText(err), "error"),
  });

  const onRoleChange = async (member: TreeMember, role: TreeRole) => {
    const isMe = member.userId === user?.id;
    const ok =
      role === "ADMIN"
        ? await notice.confirm(
            "Cấp quyền trưởng họ",
            `${member.name} sẽ sửa được toàn bộ gia phả, mời và xóa người, bật/tắt trợ lý AI.`,
          )
        : isMe
          ? await notice.confirm(
              "Rút quyền trưởng họ của bạn",
              "Bạn sẽ chỉ còn quyền xem và không vào lại được trang quản trị.",
            )
          : true;
    if (ok) changeRole.mutate({ userId: member.userId, role });
  };

  return (
    <section className={sectionClass} aria-labelledby="admin-members">
      <h2 id="admin-members" className={sectionTitleClass}>
        <Users size={18} className="text-accent-deep" /> Người có quyền truy cập
      </h2>
      {loading && <p className="m-0 text-ink-subtle">Đang tải…</p>}
      {error && (
        <p role="alert" className="m-0 text-sm text-[#a33d32]">
          {error}
        </p>
      )}
      <ul className="m-0 grid list-none gap-2 p-0">
        {members.map((member) => {
          const isMe = member.userId === user?.id;
          const busy =
            (changeRole.isPending &&
              changeRole.variables?.userId === member.userId) ||
            (remove.isPending && remove.variables === member.userId);
          return (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default px-4 py-3"
            >
              <div className="grid min-w-0 gap-0.5 text-sm">
                <span className="flex flex-wrap items-center gap-1.5">
                  <strong className="text-ink">{member.name}</strong>
                  {isMe && <span className="text-ink-subtle">(bạn)</span>}
                  {member.isCreator && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f6ead3] px-2 py-0.5 text-xs font-bold text-accent-deep">
                      <Crown size={12} /> Người tạo
                    </span>
                  )}
                </span>
                <span className="break-all text-ink-subtle">
                  {member.email} · vào ngày {formatDate(member.joinedAt)}
                </span>
                {member.person && (
                  <Link
                    to={`/trees/${treeId}/persons/${member.person.id}`}
                    className="w-fit text-ink-soft"
                  >
                    Hồ sơ: {member.person.fullName}
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`role-${member.userId}`}>
                  Vai trò của {member.name}
                </label>
                <select
                  id={`role-${member.userId}`}
                  className={`${formSelectClass} min-h-9 w-auto py-1.5 text-sm`}
                  value={member.role}
                  disabled={member.isCreator || busy}
                  title={
                    member.isCreator
                      ? "Người tạo gia phả luôn là trưởng họ"
                      : undefined
                  }
                  onChange={(event) =>
                    void onRoleChange(member, event.target.value as TreeRole)
                  }
                >
                  {roleOptions.map(({ role, disabled }) => (
                    <option
                      key={role}
                      value={role}
                      disabled={disabled && member.role !== role}
                    >
                      {roleLabel[role]}
                      {disabled ? " (sắp có)" : ""}
                    </option>
                  ))}
                </select>
                {member.role !== "ADMIN" && (
                  <button
                    type="button"
                    className={compactSecondaryButtonClass}
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await notice.confirm(
                          "Xóa quyền truy cập",
                          `${member.name} sẽ không xem được gia phả này nữa.`,
                        )
                      )
                        remove.mutate(member.userId);
                    }}
                  >
                    <UserMinus size={15} /> Xóa
                  </button>
                )}
                {busy && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin text-focus"
                    aria-label="Đang lưu"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-xs text-ink-muted">
        Muốn xóa một trưởng họ thì đổi họ về "{roleLabel.VIEWER}" trước. Vai trò{" "}
        {roleLabel.EDITOR.toLowerCase()} sẽ mở khi có quy trình duyệt thay đổi.
      </p>
    </section>
  );
}

function InvitationsSection({
  treeId,
  invitations,
  loading,
  onCreate,
}: {
  treeId: string;
  invitations: TreeInvitation[];
  loading: boolean;
  onCreate: () => void;
}) {
  const client = useQueryClient();
  const notice = useNotifications();
  const revoke = useMutation({
    mutationFn: (invitationId: string) =>
      revokeTreeInvitation(treeId, invitationId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tree-invitations", treeId] });
      notice.toast("Đã thu hồi lời mời", "success");
    },
    onError: (err) => notice.toast(errorText(err), "error"),
  });

  return (
    <section className={sectionClass} aria-labelledby="admin-invitations">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-invitations" className={sectionTitleClass}>
          <Mail size={18} className="text-accent-deep" /> Lời mời
        </h2>
        <button
          type="button"
          className={compactPrimaryButtonClass}
          onClick={onCreate}
        >
          <UserPlus size={16} /> Mời người mới
        </button>
      </div>
      {loading && <p className="m-0 text-ink-subtle">Đang tải…</p>}
      {!loading && invitations.length === 0 && (
        <p className="m-0 text-sm text-ink-muted">
          Chưa có lời mời nào. Bấm "Mời người mới" để gửi email hoặc tạo link
          chung gửi vào nhóm Zalo.
        </p>
      )}
      <ul className="m-0 grid list-none gap-2 p-0">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default px-4 py-3 text-sm"
          >
            <div className="grid min-w-0 gap-0.5">
              <span className="flex flex-wrap items-center gap-1.5">
                {invitation.email ? (
                  <Mail size={14} className="shrink-0 text-ink-subtle" />
                ) : (
                  <Link2 size={14} className="shrink-0 text-ink-subtle" />
                )}
                <strong className="break-all text-ink">
                  {invitation.email ?? "Link chung"}
                </strong>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusTone[invitation.status]}`}
                >
                  {statusLabel[invitation.status]}
                </span>
              </span>
              <span className="text-ink-subtle">
                {roleLabel[invitation.role]} · đã dùng {invitation.useCount}
                {invitation.maxUses ? `/${invitation.maxUses}` : ""} lượt · hết
                hạn {formatDate(invitation.expiresAt)} · tạo bởi{" "}
                {invitation.createdBy.name}
                {invitation.person
                  ? ` · gắn hồ sơ ${invitation.person.fullName}`
                  : ""}
              </span>
            </div>
            {invitation.status === "ACTIVE" && (
              <button
                type="button"
                className={compactSecondaryButtonClass}
                disabled={
                  revoke.isPending && revoke.variables === invitation.id
                }
                onClick={async () => {
                  if (
                    await notice.confirm(
                      "Thu hồi lời mời",
                      "Người chưa dùng link sẽ không vào được gia phả bằng lời mời này nữa.",
                    )
                  )
                    revoke.mutate(invitation.id);
                }}
              >
                <Trash2 size={15} /> Thu hồi
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AiEnabledSettings({
  treeId,
  settings,
  onChanged,
}: {
  treeId: string;
  settings: AiSettings;
  onChanged: () => void;
}) {
  const notice = useNotifications();
  const save = useAiSettings(treeId, onChanged);
  return (
    <div className="grid gap-3">
      <p className="m-0 flex items-start gap-2 text-sm text-ink-soft">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#24624a]" />
        <span>
          <strong className="text-ink">Đang bật</strong>
          {settings.enabledAt && ` từ ngày ${formatDate(settings.enabledAt)}`}.
          Mỗi câu hỏi gửi dữ liệu gia phả cần thiết sang Gemini.
        </span>
      </p>
      <LivingDetailsOption
        checked={settings.shareLivingDetails}
        disabled={save.isPending}
        onChange={(value) =>
          save.mutate({ enabled: true, shareLivingDetails: value })
        }
      />
      {save.isError && (
        <p role="alert" className="m-0 text-sm text-[#a33d32]">
          {errorText(save.error)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/trees/${treeId}/chat`}
          className={`${compactSecondaryButtonClass} no-underline`}
        >
          <Sparkles size={15} /> Mở Hỏi đáp AI
        </Link>
        <button
          type="button"
          className={compactDangerButtonClass}
          disabled={save.isPending}
          onClick={async () => {
            if (
              await notice.confirm(
                "Tắt trợ lý AI?",
                "Mọi người, kể cả bạn, sẽ không hỏi được nữa cho tới khi bật lại. Dữ liệu tìm kiếm đã tạo cho AI bị xóa.",
              )
            )
              save.mutate({ enabled: false });
          }}
        >
          <ShieldOff size={15} /> Tắt trợ lý AI
        </button>
        {save.isPending && (
          <LoaderCircle size={16} className="animate-spin text-focus" />
        )}
      </div>
    </div>
  );
}
