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
import { primaryButtonClass, secondaryButtonClass } from "../../lib/ui-classes";

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

const toastToneClass: Record<Tone, string> = {
  success: "border-l-[#3f9b63]",
  info: "border-l-outline",
  warning: "border-l-[#c28b32]",
  error: "border-l-[#c84d3c]",
};

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
          <div
            className="fixed top-[5.5rem] right-4 z-100 grid w-[min(23rem,calc(100vw-2rem))] gap-[0.65rem]"
            aria-live="polite"
          >
            {toasts.map((item) => (
              <div
                key={item.id}
                className={`grid animate-[toast-in_0.2s_ease-out] grid-cols-[1fr_auto_auto] items-center gap-[0.7rem] rounded-[0.65rem] border-l-4 bg-white px-4 py-[0.95rem] text-[#18332e] shadow-[0_12px_35px_rgba(0,0,0,0.22)] ${toastToneClass[item.tone]}`}
              >
                <span>{item.message}</span>
                <span className="min-w-[1.8rem] text-[0.78rem] text-[#687a71] tabular-nums">
                  {Math.max(0, Math.ceil((item.expiresAt - now) / 1000))}s
                </span>
                <button
                  className="size-7 cursor-pointer rounded-full border-0 bg-[#e7ede9] text-xl leading-none text-[#31473e] hover:bg-[#d6e1db] focus-visible:bg-[#d6e1db]"
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
            <div className="fixed inset-0 z-110 grid place-items-center bg-[rgba(4,15,13,0.7)] p-4 backdrop-blur-xs">
              <div
                ref={panelRef}
                className="w-[min(28rem,100%)] rounded-[0.85rem] bg-[#f9fbfa] p-[1.6rem] text-[#18332e] shadow-[0_24px_70px_rgba(0,0,0,0.4)]"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
              >
                <p className="text-xs font-bold tracking-[0.14em] text-accent">
                  {active.kind === "confirm" ? "XÁC NHẬN" : "THÔNG BÁO"}
                </p>
                <h2
                  id="dialog-title"
                  className="mt-1.5 mb-[0.7rem] font-display"
                >
                  {active.title}
                </h2>
                <p
                  id="dialog-description"
                  className="leading-[1.55] text-[#61736a]"
                >
                  {active.message}
                </p>
                <div className="mt-[1.4rem] flex justify-end gap-[0.7rem]">
                  {active.kind === "confirm" && (
                    <button
                      type="button"
                      className={`${secondaryButtonClass} text-[#18332e]`}
                      onClick={() => close(false)}
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    ref={actionRef}
                    type="button"
                    className={primaryButtonClass}
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
