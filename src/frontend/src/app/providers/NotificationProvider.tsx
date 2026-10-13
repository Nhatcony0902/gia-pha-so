import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Tone = "success" | "info" | "warning" | "error";
type Toast = { id: number; message: string; tone: Tone; expiresAt: number };
type Dialog =
  | { kind: "alert"; title: string; message: string; tone: Tone }
  | {
      kind: "confirm";
      title: string;
      message: string;
      resolve: (value: boolean) => void;
    };
type NotificationContextValue = {
  toast: (message: string, tone?: Tone) => void;
  alert: (title: string, message: string, tone?: Tone) => void;
  confirm: (title: string, message: string) => Promise<boolean>;
};
const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [now, setNow] = useState(Date.now());
  const nextId = useRef(0);
  const previousFocus = useRef<HTMLElement | null>(null);
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const active = dialogs[0];
  const dismissToast = useCallback(
    (id: number) =>
      setToasts((items) => items.filter((item) => item.id !== id)),
    [],
  );
  const toast = useCallback(
    (message: string, tone: Tone = "info") => {
      const id = ++nextId.current;
      const expiresAt = Date.now() + 3000;
      setToasts((items) => [...items, { id, message, tone, expiresAt }]);
      window.setTimeout(() => dismissToast(id), 3000);
    },
    [dismissToast],
  );
  const alert = useCallback(
    (title: string, message: string, tone: Tone = "error") =>
      setDialogs((items) => [
        ...items,
        { kind: "alert", title, message, tone },
      ]),
    [],
  );
  const confirm = useCallback(
    (title: string, message: string) =>
      new Promise<boolean>((resolve) =>
        setDialogs((items) => [
          ...items,
          { kind: "confirm", title, message, resolve },
        ]),
      ),
    [],
  );
  const close = useCallback((answer = false) => {
    setDialogs((items) => {
      const first = items[0];
      if (first?.kind === "confirm") first.resolve(answer);
      return items.slice(1);
    });
  }, []);
  useEffect(() => {
    if (!active) return;
    previousFocus.current = document.activeElement as HTMLElement;
    actionRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
      if (event.key === "Tab") {
        const controls = panelRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), [href], input:not(:disabled)",
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus();
    };
  }, [active, close]);
  useEffect(() => {
    if (!toasts.length) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [toasts.length]);

  const value = useMemo(
    () => ({ toast, alert, confirm }),
    [toast, alert, confirm],
  );
  return (
    <NotificationContext.Provider value={value}>
      {children}
      {createPortal(
        <>
          <div className="toast-region" aria-live="polite">
            {toasts.map((item) => (
              <div key={item.id} className={`toast toast-${item.tone}`}>
                <span className="toast-message">{item.message}</span>
                <span className="toast-countdown">
                  {Math.max(0, Math.ceil((item.expiresAt - now) / 1000))}s
                </span>
                <button
                  className="toast-close"
                  type="button"
                  aria-label="Đóng thông báo"
                  onClick={() => dismissToast(item.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {active && (
            <div className="dialog-backdrop">
              <div
                ref={panelRef}
                className="dialog-panel"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
              >
                <p className="dialog-kicker">
                  {active.kind === "confirm" ? "XÁC NHẬN" : "THÔNG BÁO"}
                </p>
                <h2 id="dialog-title">{active.title}</h2>
                <p id="dialog-description">{active.message}</p>
                <div className="dialog-actions">
                  {active.kind === "confirm" && (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => close(false)}
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    ref={actionRef}
                    type="button"
                    className="button-primary"
                    onClick={() => close(true)}
                  >
                    {active.kind === "confirm" ? "Xác nhận" : "Đã hiểu"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body,
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value)
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  return value;
}
