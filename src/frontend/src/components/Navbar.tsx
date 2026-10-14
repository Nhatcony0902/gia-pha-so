import { useQuery } from "@tanstack/react-query";
import { Clock3, GitFork, List, Network } from "lucide-react";
import { useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { useNotifications } from "../app/providers/NotificationProvider";
import logo from "../assets/images/logo.svg";
import { getTrees } from "../features/family-tree/api";
import { primaryButtonClass } from "../lib/ui-classes";

const menuItemClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-semibold no-underline transition-colors ${isActive ? "border-accent text-white" : "border-transparent text-content-secondary hover:text-white"}`;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isInitializing, logout } = useAuth();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const treeMatch = useMatch("/trees/:treeId/*");
  const treeId = treeMatch?.params.treeId;
  const trees = useQuery({
    queryKey: ["trees"],
    queryFn: getTrees,
    enabled: Boolean(user && treeId),
  });
  const treeView = ["tree", "members", "relationships", "timeline"].includes(
    location.pathname.split("/")[3] ?? "",
  )
    ? location.pathname.split("/")[3]
    : "tree";
  const availableTrees = [
    ...(trees.data?.createdByMe ?? []),
    ...(trees.data?.sharedWithMe ?? []),
  ];

  const onLogout = async () => {
    if (
      !(await notifications.confirm(
        "Đăng xuất?",
        "Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng các tính năng cá nhân.",
      ))
    )
      return;
    await logout();
    setOpen(false);
    notifications.toast("Đã đăng xuất", "success");
  };
  const initials = user?.name
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const accountActions =
    !isInitializing && !user ? (
      <div className="flex flex-col items-stretch gap-3 min-[901px]:flex-row min-[901px]:items-center">
        <Link
          className="px-3 py-2 text-content-secondary no-underline hover:text-white"
          to="/auth?mode=login"
          onClick={() => setOpen(false)}
        >
          Đăng nhập
        </Link>
        <Link
          className={`${primaryButtonClass} justify-center text-center no-underline`}
          to="/auth?mode=register"
          onClick={() => setOpen(false)}
        >
          Đăng ký
        </Link>
      </div>
    ) : user ? (
      <div className="flex flex-wrap items-center gap-3 min-[901px]:flex-nowrap">
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xs font-bold text-ink [&_img]:size-full [&_img]:object-cover">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            initials
          )}
        </span>
        <span className="max-w-32 flex-1 truncate">{user.name}</span>
        <button
          className="cursor-pointer border-0 bg-transparent px-2 py-2 text-content-secondary hover:text-white"
          type="button"
          onClick={onLogout}
        >
          Đăng xuất
        </button>
      </div>
    ) : null;

  const treeSelector = treeId ? (
    <label className="relative min-w-0 shrink">
      <span className="sr-only">Chuyển gia phả</span>
      <select
        aria-label="Chuyển gia phả"
        className="w-[clamp(8rem,22vw,15rem)] cursor-pointer appearance-none truncate rounded-md border border-[rgba(215,169,93,0.55)] bg-[#203a34] py-2 pr-8 pl-3 text-xs font-bold tracking-[0.04em] text-accent outline-none transition-colors hover:border-accent focus:border-accent"
        value={treeId}
        disabled={trees.isLoading || !availableTrees.length}
        onChange={(event) => {
          navigate(`/trees/${event.target.value}/${treeView}`);
          setOpen(false);
        }}
      >
        {!availableTrees.length && (
          <option value={treeId}>
            {trees.isLoading ? "Đang tải gia phả…" : "Gia phả đang chọn"}
          </option>
        )}
        {trees.data?.createdByMe.length ? (
          <optgroup label="Gia phả của tôi">
            {trees.data.createdByMe.map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.name}
              </option>
            ))}
          </optgroup>
        ) : null}
        {trees.data?.sharedWithMe.length ? (
          <optgroup label="Được chia sẻ với tôi">
            {trees.data.sharedWithMe.map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[0.65rem] text-accent">
        ▾
      </span>
    </label>
  ) : null;

  const treeNavigation = treeId ? (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 min-[901px]:flex-nowrap">
      <NavLink
        className={menuItemClass}
        to={`/trees/${treeId}/tree`}
        onClick={() => setOpen(false)}
      >
        <Network size={16} /> Cây gia phả
      </NavLink>
      <NavLink
        className={menuItemClass}
        to={`/trees/${treeId}/members`}
        onClick={() => setOpen(false)}
      >
        <List size={16} /> Thành viên
      </NavLink>
      <NavLink
        className={menuItemClass}
        to={`/trees/${treeId}/relationships`}
        onClick={() => setOpen(false)}
      >
        <GitFork size={16} /> Quan hệ
      </NavLink>
      <NavLink
        className={menuItemClass}
        to={`/trees/${treeId}/timeline`}
        onClick={() => setOpen(false)}
      >
        <Clock3 size={16} /> Dòng thời gian
      </NavLink>
    </div>
  ) : user ? (
    <NavLink
      className={menuItemClass}
      to="/"
      end
      onClick={() => setOpen(false)}
    >
      Danh sách gia phả
    </NavLink>
  ) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(82,121,110,0.55)] bg-[rgba(32,58,52,0.96)] text-content-primary backdrop-blur-[14px]">
      <nav
        className="relative mx-auto flex min-h-14 max-w-[100rem] items-center gap-3 px-4"
        aria-label="Điều hướng chính"
      >
        <div className="flex min-w-0 shrink items-center gap-3">
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-3 font-display font-bold text-inherit no-underline"
          >
            <img
              className="size-10 rounded-full object-cover"
              src={logo}
              alt=""
            />
            {!treeId && <span className="hidden sm:inline">Gia Phả Số</span>}
          </Link>
          {treeSelector}
        </div>
        <div className="hidden min-w-0 flex-1 justify-center min-[901px]:flex">
          {treeNavigation}
        </div>
        <div className="ml-auto hidden min-w-0 min-[901px]:block">
          {accountActions}
        </div>
        <button
          className="ml-auto rounded-lg border border-outline bg-transparent px-3 py-2 text-white min-[901px]:hidden"
          type="button"
          aria-expanded={open}
          aria-controls="nav-actions"
          onClick={() => setOpen((value) => !value)}
        >
          ☰<span className="sr-only">Mở menu</span>
        </button>
        <div
          id="nav-actions"
          className={`${open ? "flex" : "hidden"} absolute top-16 right-4 left-4 flex-col items-stretch gap-4 rounded-xl border border-outline bg-[#29483e] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.3)] min-[901px]:hidden`}
        >
          {treeNavigation}
          {accountActions}
        </div>
      </nav>
    </header>
  );
}
