import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { useNotifications } from "../app/providers/NotificationProvider";
import { Breadcrumbs } from "../components/Breadcrumbs";
import {
  acceptInvitation,
  getInvitationPreview,
  roleLabel,
} from "../features/sharing/api";
import { ApiError } from "../lib/api/client";
import { primaryButtonClass, secondaryButtonClass } from "../lib/ui-classes";

const unusableMessage = {
  EXPIRED: "Link mời đã hết hạn. Hãy nhờ trưởng họ gửi link mới.",
  REVOKED: "Link mời đã bị thu hồi.",
  EXHAUSTED: "Link mời đã hết lượt sử dụng.",
} as const;

export function InvitePage() {
  const { token = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const notice = useNotifications();
  const { isAuthenticated, isInitializing } = useAuth();
  const preview = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => getInvitationPreview(token),
    retry: false,
  });
  const accept = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: (result) => {
      client.invalidateQueries({ queryKey: ["trees"] });
      notice.toast(
        result.alreadyMember
          ? "Bạn đã ở trong gia phả này"
          : "Đã tham gia gia phả",
        "success",
      );
      navigate(`/trees/${result.treeId}/tree`, { replace: true });
    },
    onError: (error) =>
      notice.alert(
        "Không thể tham gia gia phả",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      ),
  });
  const returnTo = encodeURIComponent(location.pathname);

  let content;
  if (preview.isLoading)
    content = <p className="text-content-secondary">Đang mở lời mời…</p>;
  else if (preview.isError || !preview.data)
    content = (
      <>
        <h1 className="m-0 font-display text-3xl font-semibold">
          Link mời không hợp lệ
        </h1>
        <p className="text-content-secondary">
          {preview.error instanceof ApiError && preview.error.status !== 404
            ? preview.error.message
            : "Hãy kiểm tra lại đường link hoặc nhờ trưởng họ gửi link mới."}
        </p>
        <Link to="/" className={secondaryButtonClass}>
          Về trang chủ
        </Link>
      </>
    );
  else {
    const { tree, invitedBy, role, status } = preview.data;
    content = (
      <>
        <p className="m-0 text-xs font-bold tracking-[0.13em] text-accent uppercase">
          LỜI MỜI THAM GIA GIA PHẢ
        </p>
        <h1 className="m-0 font-display text-3xl leading-tight font-semibold">
          {tree.name}
        </h1>
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-content-secondary">
          {tree.originPlace && <span>{tree.originPlace}</span>}
          <span className="inline-flex items-center gap-1">
            <Users size={14} /> {tree.personCount} người trong gia phả
          </span>
        </p>
        <p className="m-0 text-content-secondary">
          <strong className="text-content-primary">{invitedBy.name}</strong> mời
          bạn tham gia với quyền{" "}
          <strong className="text-content-primary">{roleLabel[role]}</strong>.
        </p>
        {status !== "ACTIVE" ? (
          <p className="m-0 rounded-xl border border-[#d9a49d] bg-[#fff8f6] p-3 text-[#a33d32]">
            {unusableMessage[status]}
          </p>
        ) : isInitializing ? null : isAuthenticated ? (
          <button
            type="button"
            className={primaryButtonClass}
            disabled={accept.isPending}
            onClick={() => accept.mutate()}
          >
            {accept.isPending ? "Đang tham gia…" : "Tham gia gia phả"}
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/auth?mode=login&returnTo=${returnTo}`}
              className={primaryButtonClass}
            >
              Đăng nhập để tham gia
            </Link>
            <Link
              to={`/auth?mode=register&returnTo=${returnTo}`}
              className={secondaryButtonClass}
            >
              Tạo tài khoản
            </Link>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="bg-page-gradient min-h-[calc(100vh-4.5rem)] px-5 py-8 text-content-primary sm:px-8">
      <div className="mx-auto max-w-xl">
        <Breadcrumbs
          items={[{ label: "Trang chủ", to: "/" }, { label: "Lời mời" }]}
          light
          className="mb-8"
        />
        <section className="grid gap-4 overflow-hidden rounded-card border border-[rgba(130,167,151,0.4)] bg-[rgba(245,249,246,0.07)]">
          {preview.data?.tree.coverUrl && (
            <img
              src={preview.data.tree.coverUrl}
              alt=""
              className="h-36 w-full object-cover"
            />
          )}
          <div className="grid gap-4 p-6">{content}</div>
        </section>
      </div>
    </main>
  );
}
