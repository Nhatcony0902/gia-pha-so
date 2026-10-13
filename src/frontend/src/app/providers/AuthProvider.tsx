import type { AuthResponse, AuthUser } from "@family-tree/shared-types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  publicApi,
  refreshAccessToken,
  setAccessToken,
  setSessionExpiredHandler,
} from "../../lib/api/client";
import { useNotifications } from "./NotificationProvider";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  acceptSession: (result: AuthResponse) => void;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setInitializing] = useState(true);
  const notifications = useNotifications();
  const acceptSession = useCallback((result: AuthResponse) => {
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);
  const expire = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    notifications.alert(
      "Phiên đăng nhập đã hết hạn",
      "Vui lòng đăng nhập lại để tiếp tục.",
      "warning",
    );
  }, [notifications]);
  useEffect(() => {
    setSessionExpiredHandler(expire);
    refreshAccessToken()
      .then(acceptSession)
      .catch(() => setAccessToken(null))
      .finally(() => setInitializing(false));
    return () => setSessionExpiredHandler(null);
  }, [acceptSession, expire]);
  const logout = useCallback(async () => {
    try {
      await publicApi("/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      acceptSession,
      logout,
    }),
    [user, isInitializing, acceptSession, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
