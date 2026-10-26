import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatedTreeInvitation,
  InvitationStatus,
} from "@family-tree/shared-types";
import { Check, Copy, Link2, Trash2, UserMinus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useNotifications } from "../../app/providers/NotificationProvider";
import {
  compactDangerButtonClass,
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
  formFieldClass,
  formLabelClass,
} from "../../lib/ui-classes";
import { DialogShell } from "../family-tree/ManagementDialogs";
import {
  createTreeInvitation,
  getTreeInvitations,
  getTreeMembers,
  inviteUrl,
  removeTreeMember,
  revokeTreeInvitation,
  roleLabel,
} from "./api";

const statusLabel: Record<InvitationStatus, string> = {
  ACTIVE: "Đang hoạt động",
  EXPIRED: "Hết hạn",
  REVOKED: "Đã thu hồi",
  EXHAUSTED: "Hết lượt",
};
const sectionTitleClass = "mt-0 mb-3 font-display text-lg";
const rowClass =
  "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface px-4 py-3";
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Vui lòng thử lại";

export function ShareDialog({
  treeId,
  treeName,
  onClose,
}: {
  treeId: string;
  treeName: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const notice = useNotifications();
  const { user } = useAuth();
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState("");
  const [created, setCreated] = useState<CreatedTreeInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const members = useQuery({
    queryKey: ["tree-members", treeId],
    queryFn: () => getTreeMembers(treeId),
  });
  const invitations = useQuery({
    queryKey: ["tree-invitations", treeId],
    queryFn: () => getTreeInvitations(treeId),
  });
  const create = useMutation({
    mutationFn: () =>
      createTreeInvitation(treeId, {
        expiresInDays,
        maxUses: maxUses ? Number(maxUses) : null,
      }),
    onSuccess: (invitation) => {
      setCreated(invitation);
      setCopied(false);
      client.invalidateQueries({ queryKey: ["tree-invitations", treeId] });
    },
    onError: (error) =>
      notice.alert("Không thể tạo link mời", errorMessage(error)),
  });
  const revoke = useMutation({
    mutationFn: (invitationId: string) =>
      revokeTreeInvitation(treeId, invitationId),
    onSuccess: (_, invitationId) => {
      if (created?.id === invitationId) setCreated(null);
      client.invalidateQueries({ queryKey: ["tree-invitations", treeId] });
      notice.toast("Đã thu hồi link mời", "success");
    },
    onError: (error) =>
      notice.alert("Không thể thu hồi link", errorMessage(error)),
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => removeTreeMember(treeId, userId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["tree-members", treeId] });
      notice.toast("Đã xóa quyền truy cập", "success");
    },
    onError: (error) =>
      notice.alert("Không thể xóa quyền truy cập", errorMessage(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notice.toast("Đã sao chép link mời", "success");
    } catch {
      notice.alert(
        "Không thể sao chép",
        "Trình duyệt chặn quyền sao chép. Hãy bôi đen link và sao chép thủ công.",
      );
    }
  };

  return (
    <DialogShell title={`Chia sẻ "${treeName}"`} onClose={onClose}>
      <div className="grid gap-6">
        <section>
          <h3 className={sectionTitleClass}>Tạo link mời</h3>
          <p className="mt-0 mb-3 text-sm text-ink-subtle">
            Ai có link và đăng nhập sẽ vào gia phả với quyền{" "}
            <strong>{roleLabel.VIEWER}</strong>. Gửi link vào nhóm Zalo của họ
            là tiện nhất.
          </p>
          <form
            onSubmit={submit}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <label className={formLabelClass}>
              Hết hạn sau
              <select
                className={formFieldClass}
                value={expiresInDays}
                onChange={(event) =>
                  setExpiresInDays(Number(event.target.value))
                }
              >
                <option value={1}>1 ngày</option>
                <option value={7}>7 ngày</option>
                <option value={30}>30 ngày</option>
              </select>
            </label>
            <label className={formLabelClass}>
              Giới hạn lượt dùng
              <input
                type="number"
                min={1}
                max={1000}
                className={formFieldClass}
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
                placeholder="Không giới hạn"
              />
            </label>
            <button
              type="submit"
              className={compactPrimaryButtonClass}
              disabled={create.isPending}
            >
              <Link2 size={16} />
              {create.isPending ? "Đang tạo…" : "Tạo link"}
            </button>
          </form>
          {created && (
            <div className="mt-3 grid gap-2 rounded-xl border border-accent bg-[#fff9ee] p-3">
              <div className="flex gap-2">
                <input
                  readOnly
                  className={`${formFieldClass} font-mono text-xs`}
                  value={inviteUrl(created.token)}
                  onFocus={(event) => event.target.select()}
                  aria-label="Link mời"
                />
                <button
                  type="button"
                  className={compactPrimaryButtonClass}
                  onClick={() => void copy(inviteUrl(created.token))}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Đã chép" : "Sao chép"}
                </button>
              </div>
              <p className="m-0 text-xs text-ink-subtle">
                Link chỉ hiện một lần. Đóng hộp thoại này thì không xem lại được
                nữa, cần thì tạo link mới.
              </p>
            </div>
          )}
        </section>

        <section>
          <h3 className={sectionTitleClass}>Link đã tạo</h3>
          {invitations.isLoading && (
            <p className="text-sm text-ink-subtle">Đang tải…</p>
          )}
          {invitations.data?.invitations.length === 0 && (
            <p className="text-sm text-ink-subtle">Chưa có link mời nào.</p>
          )}
          <div className="grid gap-2">
            {invitations.data?.invitations.map((invitation) => (
              <div key={invitation.id} className={rowClass}>
                <div className="grid gap-0.5 text-sm">
                  <strong>{statusLabel[invitation.status]}</strong>
                  <span className="text-ink-subtle">
                    Đã dùng {invitation.useCount}
                    {invitation.maxUses !== null
                      ? `/${invitation.maxUses}`
                      : ""}{" "}
                    lượt · hết hạn{" "}
                    {dateFormat.format(new Date(invitation.expiresAt))}
                  </span>
                </div>
                {invitation.status === "ACTIVE" && (
                  <button
                    type="button"
                    className={compactDangerButtonClass}
                    disabled={
                      revoke.isPending && revoke.variables === invitation.id
                    }
                    onClick={async () => {
                      if (
                        await notice.confirm(
                          "Thu hồi link mời",
                          "Link sẽ không dùng được nữa. Những người đã vào gia phả vẫn giữ quyền truy cập.",
                        )
                      )
                        revoke.mutate(invitation.id);
                    }}
                  >
                    <Trash2 size={15} /> Thu hồi
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className={sectionTitleClass}>Người có quyền truy cập</h3>
          {members.isLoading && (
            <p className="text-sm text-ink-subtle">Đang tải…</p>
          )}
          <div className="grid gap-2">
            {members.data?.members.map((member) => (
              <div key={member.userId} className={rowClass}>
                <div className="grid gap-0.5 text-sm">
                  <strong>
                    {member.name}
                    {member.userId === user?.id ? " (bạn)" : ""}
                  </strong>
                  <span className="text-ink-subtle">
                    {member.email} · {roleLabel[member.role]}
                  </span>
                </div>
                {member.role !== "ADMIN" && (
                  <button
                    type="button"
                    className={compactSecondaryButtonClass}
                    disabled={
                      removeMember.isPending &&
                      removeMember.variables === member.userId
                    }
                    onClick={async () => {
                      if (
                        await notice.confirm(
                          "Xóa quyền truy cập",
                          `${member.name} sẽ không xem được gia phả này nữa.`,
                        )
                      )
                        removeMember.mutate(member.userId);
                    }}
                  >
                    <UserMinus size={15} /> Xóa
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </DialogShell>
  );
}
