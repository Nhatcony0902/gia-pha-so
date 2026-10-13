import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { useNotifications } from "../app/providers/NotificationProvider";
import logo from "../assets/images/logo.svg";
import { primaryButtonClass } from "../lib/ui-classes";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isInitializing, logout } = useAuth();
  const notifications = useNotifications();
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
  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(82,121,110,0.55)] bg-[rgba(18,33,31,0.94)] text-content-primary backdrop-blur-[14px]">
      <nav
        className="mx-auto flex min-h-18 max-w-7xl items-center justify-between px-5"
        aria-label="Điều hướng chính"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-[0.7rem] font-display font-bold text-inherit no-underline"
        >
          <img className="size-9 rounded-full object-cover" src={logo} alt="" />
          <span>Gia Phả Số</span>
        </Link>
        <button
          className="block rounded-lg border border-outline bg-transparent px-[0.65rem] py-[0.45rem] text-white min-[801px]:hidden"
          type="button"
          aria-expanded={open}
          aria-controls="nav-actions"
          onClick={() => setOpen((value) => !value)}
        >
          ☰<span className="sr-only">Mở menu</span>
        </button>
        <div
          id="nav-actions"
          className={`${
            open ? "flex" : "hidden"
          } absolute top-16 right-4 left-4 flex-col items-stretch gap-[0.8rem] rounded-[0.7rem] border border-outline bg-[#18332e] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.3)] min-[801px]:static min-[801px]:flex min-[801px]:flex-row min-[801px]:items-center min-[801px]:border-0 min-[801px]:bg-transparent min-[801px]:p-0 min-[801px]:shadow-none`}
        >
          {!isInitializing && !user && (
            <>
              <Link
                className="cursor-pointer border-0 bg-transparent px-3 py-[0.65rem] text-content-secondary no-underline hover:text-white focus-visible:text-white"
                to="/auth?mode=login"
                onClick={() => setOpen(false)}
              >
                Đăng nhập
              </Link>
              <Link
                className={`${primaryButtonClass} text-center no-underline`}
                to="/auth?mode=register"
                onClick={() => setOpen(false)}
              >
                Đăng ký
              </Link>
            </>
          )}
          {user && (
            <div className="flex flex-wrap items-center gap-[0.8rem] min-[801px]:flex-nowrap">
              <Link
                className="cursor-pointer border-0 bg-transparent px-3 py-[0.65rem] text-content-secondary no-underline hover:text-white focus-visible:text-white"
                to="/trees"
                onClick={() => setOpen(false)}
              >
                Gia phả
              </Link>
              <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-accent text-[0.78rem] font-bold text-[#18332e] [&_img]:size-full [&_img]:object-cover">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials
                )}
              </span>
              <span className="max-w-40 flex-1 truncate">{user.name}</span>
              <button
                className="cursor-pointer border-0 bg-transparent px-3 py-[0.65rem] text-content-secondary hover:text-white focus-visible:text-white"
                type="button"
                onClick={onLogout}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
