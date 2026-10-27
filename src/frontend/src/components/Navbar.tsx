import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Clock3,
  GitFork,
  List,
  Network,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { NotificationBell } from "./NotificationBell";

const menuItemClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-semibold no-underline transition-colors ${isActive ? "border-accent text-white" : "border-transparent text-content-secondary hover:text-white"}`;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [treeMenuOpen, setTreeMenuOpen] = useState(false);
  const treeSelectorRef = useRef<HTMLDivElement>(null);
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
  const treePathSegment = location.pathname.split("/")[3] ?? "";
  const treeView =
    treePathSegment === "events"
      ? "timeline"
      : treePathSegment === "persons"
        ? "members"
        : ["tree", "members", "relationships", "timeline"].includes(
              treePathSegment,
            )
          ? treePathSegment
          : "tree";
  const availableTrees = [
    ...(trees.data?.createdByMe ?? []),
    ...(trees.data?.sharedWithMe ?? []),
  ];
  const selectedTree = availableTrees.find((tree) => tree.id === treeId);

  useEffect(() => {
    if (!treeMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!treeSelectorRef.current?.contains(event.target as Node)) {
        setTreeMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTreeMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [treeMenuOpen]);

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
    <div ref={treeSelectorRef} className="relative min-w-0 shrink">
      <button
        type="button"
        className="flex h-10 w-[clamp(10rem,20vw,16rem)] max-w-[calc(100vw-7rem)] cursor-pointer items-center gap-1.5 rounded-lg border border-white/50 bg-[rgba(18,38,33,0.58)] px-2.5 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition hover:border-white hover:bg-[rgba(18,38,33,0.82)] focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Chuyển gia phả"
        aria-haspopup="menu"
        aria-controls="tree-selector-menu"
        aria-expanded={treeMenuOpen}
        disabled={trees.isLoading || !availableTrees.length}
        onClick={() => setTreeMenuOpen((value) => !value)}
      >
        <Network size={14} className="shrink-0 opacity-80" />
        <span className="min-w-0 flex-1 truncate text-xs font-bold tracking-[0.015em]">
          {selectedTree?.name ??
            (trees.isLoading ? "Đang tải gia phả…" : "Gia phả đang chọn")}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${treeMenuOpen ? "rotate-180" : ""}`}
        />
      </button>
      {treeMenuOpen && (
        <div
          id="tree-selector-menu"
          role="menu"
          aria-label="Danh sách gia phả"
          className="absolute top-[calc(100%+0.55rem)] left-0 z-50 w-full overflow-hidden rounded-xl border border-[#cad8d1] bg-[#f7faf8] p-2 text-ink shadow-[0_18px_50px_rgba(6,24,19,0.3)]"
        >
          {trees.data?.createdByMe.length ? (
            <div className="mb-1 last:mb-0">
              <p className="m-0 px-3 pt-2 pb-1.5 text-[0.68rem] font-bold tracking-[0.13em] text-[#8a672f] uppercase">
                Gia phả của tôi
              </p>
              {trees.data.createdByMe.map((tree) => (
                <button
                  key={tree.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={tree.id === treeId}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 px-2.5 py-2 text-left text-xs transition-colors ${tree.id === treeId ? "bg-[#dfeae4] font-bold text-[#183d32]" : "bg-transparent text-[#415c52] hover:bg-[#eaf1ed] hover:text-[#183d32]"}`}
                  onClick={() => {
                    navigate(`/trees/${tree.id}/${treeView}`);
                    setTreeMenuOpen(false);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{tree.name}</span>
                  {tree.id === treeId && (
                    <Check size={16} className="shrink-0 text-[#a76f20]" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
          {trees.data?.sharedWithMe.length ? (
            <div className="mb-1 border-t border-[#dde6e1] pt-1 first:border-0 first:pt-0 last:mb-0">
              <p className="m-0 px-3 pt-2 pb-1.5 text-[0.68rem] font-bold tracking-[0.13em] text-[#8a672f] uppercase">
                Được chia sẻ với tôi
              </p>
              {trees.data.sharedWithMe.map((tree) => (
                <button
                  key={tree.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={tree.id === treeId}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 px-2.5 py-2 text-left text-xs transition-colors ${tree.id === treeId ? "bg-[#dfeae4] font-bold text-[#183d32]" : "bg-transparent text-[#415c52] hover:bg-[#eaf1ed] hover:text-[#183d32]"}`}
                  onClick={() => {
                    navigate(`/trees/${tree.id}/${treeView}`);
                    setTreeMenuOpen(false);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{tree.name}</span>
                  {tree.id === treeId && (
                    <Check size={16} className="shrink-0 text-[#a76f20]" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 border-t border-[#dde6e1] bg-transparent px-2.5 py-2.5 text-left text-xs font-bold text-[#9a6720] transition-colors hover:bg-[#fff3d9] hover:text-[#70470d]"
            onClick={() => {
              navigate("/trees?create=1");
              setTreeMenuOpen(false);
              setOpen(false);
            }}
          >
            <Plus size={16} className="shrink-0" />
            Tạo gia phả mới
          </button>
        </div>
      )}
    </div>
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
        className={({ isActive }) =>
          menuItemClass({ isActive: isActive || treeView === "members" })
        }
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
      to="/trees"
      end
      onClick={() => setOpen(false)}
    >
      Danh sách gia phả
    </NavLink>
  ) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(82,121,110,0.55)] bg-[rgba(32,58,52,0.96)] text-content-primary backdrop-blur-[14px]">
      <nav
        className="relative mx-auto flex min-h-16 max-w-[100rem] items-center gap-3 px-4"
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
        <div className="ml-auto hidden min-w-0 items-center gap-3 min-[901px]:flex">
          <NotificationBell />
          {accountActions}
        </div>
        <div className="ml-auto min-[901px]:hidden">
          <NotificationBell />
        </div>
        <button
          className="rounded-lg border border-outline bg-transparent px-3 py-2 text-white min-[901px]:hidden"
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
