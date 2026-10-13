import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { useNotifications } from "../app/providers/NotificationProvider";
import logo from "../assets/images/logo.svg";

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
    <header className="app-header">
      <nav className="navbar" aria-label="Điều hướng chính">
        <Link to="/" className="brand">
          <img className="brand-logo" src={logo} alt="" />
          <span>Gia Phả Số</span>
        </Link>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="nav-actions"
          onClick={() => setOpen((value) => !value)}
        >
          ☰<span className="sr-only">Mở menu</span>
        </button>
        <div
          id="nav-actions"
          className={`nav-actions ${open ? "nav-actions-open" : ""}`}
        >
          {!isInitializing && !user && (
            <>
              <Link
                className="nav-link"
                to="/auth?mode=login"
                onClick={() => setOpen(false)}
              >
                Đăng nhập
              </Link>
              <Link
                className="button-primary nav-button"
                to="/auth?mode=register"
                onClick={() => setOpen(false)}
              >
                Đăng ký
              </Link>
            </>
          )}
          {user && (
            <div className="user-menu">
              <span className="avatar">
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
              <span className="user-name">{user.name}</span>
              <button className="nav-link" type="button" onClick={onLogout}>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
