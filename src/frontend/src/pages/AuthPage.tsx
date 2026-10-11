import type { AuthResponse } from "@family-tree/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../app/providers/AuthProvider";
import { useNotifications } from "../app/providers/NotificationProvider";
import { ApiError, publicApi } from "../lib/api/client";

type Mode = "login" | "register" | "forgot-password";
const emailSchema = z.string().email("Email không hợp lệ");
const passwordSchema = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu cần có chữ")
  .regex(/\d/, "Mật khẩu cần có số");
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự"),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Mật khẩu xác nhận không khớp",
  });
const emailFormSchema = z.object({ email: emailSchema });
const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Mã xác thực gồm 6 chữ số"),
});
const resetSchema = z
  .object({ password: passwordSchema, passwordConfirmation: z.string() })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Mật khẩu xác nhận không khớp",
  });
type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;
type EmailInput = z.infer<typeof emailFormSchema>;
type OtpInput = z.infer<typeof otpSchema>;
type ResetInput = z.infer<typeof resetSchema>;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      className="button-primary submit-button"
      disabled={busy}
      type="submit"
    >
      {busy ? "Đang xử lý…" : children}
    </button>
  );
}

export function AuthPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("mode");
  const mode: Mode =
    requested === "register" || requested === "forgot-password"
      ? requested
      : "login";
  const { isAuthenticated, isInitializing, acceptSession } = useAuth();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const [registerEmail, setRegisterEmail] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });
  const emailForm = useForm<EmailInput>({
    resolver: zodResolver(emailFormSchema),
  });
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) });
  const resetForm = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  useEffect(() => {
    if (!expiresAt) return;
    const update = () =>
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  const showError = (error: unknown) => {
    console.error("[AuthPage] Authentication request failed", error);
    const value =
      error instanceof ApiError
        ? error
        : new Error("Không thể hoàn tất yêu cầu");
    notifications.alert(
      "Thao tác không thành công",
      value.message,
      error instanceof ApiError && error.status === 429 ? "warning" : "error",
    );
  };
  const finishLogin = (result: AuthResponse, message: string) => {
    acceptSession(result);
    notifications.toast(message, "success");
    const returnTo = params.get("returnTo");
    navigate(
      returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/",
      { replace: true },
    );
  };
  const switchMode = (next: Mode) => {
    setRegisterEmail(null);
    setResetEmail(null);
    setResetToken(null);
    setParams({ mode: next });
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  if (!isInitializing && isAuthenticated) return <Navigate to="/" replace />;
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <p className="auth-eyebrow">DIGITAL FAMILY TREE / FOUNDATION</p>
        <h1>Giữ mạch nguồn, kể tiếp câu chuyện.</h1>
        <p>
          Không gian số để lưu giữ thành viên, quan hệ và ký ức của dòng họ theo
          cách rõ ràng, có kiểm chứng.
        </p>
      </section>
      <section className="auth-card" aria-labelledby="auth-title">
        {mode !== "forgot-password" && !registerEmail && (
          <div className="auth-tabs">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Đăng nhập
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              Đăng ký
            </button>
          </div>
        )}
        {mode === "login" && (
          <>
            <h2 id="auth-title">Chào mừng trở lại</h2>
            <p className="auth-subtitle">
              Đăng nhập để tiếp tục với gia phả của bạn.
            </p>
            <form
              onSubmit={loginForm.handleSubmit((data) =>
                run(async () =>
                  finishLogin(
                    await publicApi<AuthResponse>("/auth/login", {
                      method: "POST",
                      body: JSON.stringify(data),
                    }),
                    "Đăng nhập thành công",
                  ),
                ),
              )}
            >
              <Field
                label="Email"
                error={loginForm.formState.errors.email?.message}
              >
                <input
                  type="email"
                  autoComplete="email"
                  {...loginForm.register("email")}
                />
              </Field>
              <Field
                label="Mật khẩu"
                error={loginForm.formState.errors.password?.message}
              >
                <input
                  type="password"
                  autoComplete="current-password"
                  {...loginForm.register("password")}
                />
              </Field>
              <button
                className="text-button forgot-link"
                type="button"
                onClick={() => switchMode("forgot-password")}
              >
                Quên mật khẩu?
              </button>
              <SubmitButton busy={busy}>Đăng nhập</SubmitButton>
            </form>
            <GoogleSection
              busy={busy}
              onCredential={(credential) =>
                run(async () =>
                  finishLogin(
                    await publicApi<AuthResponse>("/auth/google", {
                      method: "POST",
                      body: JSON.stringify({ credential }),
                    }),
                    "Đăng nhập thành công",
                  ),
                )
              }
              onError={() =>
                notifications.alert(
                  "Thao tác không thành công",
                  "Không thể đăng nhập với Google",
                )
              }
            />
          </>
        )}
        {mode === "register" && !registerEmail && (
          <>
            <h2 id="auth-title">Tạo tài khoản</h2>
            <p className="auth-subtitle">
              Bắt đầu lưu giữ câu chuyện của gia đình bạn.
            </p>
            <form
              onSubmit={registerForm.handleSubmit((data) =>
                run(async () => {
                  await publicApi("/auth/register", {
                    method: "POST",
                    body: JSON.stringify(data),
                  });
                  setRegisterEmail(data.email.toLowerCase());
                  setExpiresAt(Date.now() + 600_000);
                  otpForm.reset();
                  notifications.toast(
                    "Mã xác thực đã được gửi tới email",
                    "success",
                  );
                }),
              )}
            >
              <Field
                label="Họ và tên"
                error={registerForm.formState.errors.name?.message}
              >
                <input autoComplete="name" {...registerForm.register("name")} />
              </Field>
              <Field
                label="Email"
                error={registerForm.formState.errors.email?.message}
              >
                <input
                  type="email"
                  autoComplete="email"
                  {...registerForm.register("email")}
                />
              </Field>
              <Field
                label="Mật khẩu"
                error={registerForm.formState.errors.password?.message}
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  {...registerForm.register("password")}
                />
              </Field>
              <Field
                label="Xác nhận mật khẩu"
                error={
                  registerForm.formState.errors.passwordConfirmation?.message
                }
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  {...registerForm.register("passwordConfirmation")}
                />
              </Field>
              <SubmitButton busy={busy}>Đăng ký</SubmitButton>
            </form>
            <GoogleSection
              busy={busy}
              onCredential={(credential) =>
                run(async () =>
                  finishLogin(
                    await publicApi<AuthResponse>("/auth/google", {
                      method: "POST",
                      body: JSON.stringify({ credential }),
                    }),
                    "Đăng nhập thành công",
                  ),
                )
              }
              onError={() =>
                notifications.alert(
                  "Thao tác không thành công",
                  "Không thể tiếp tục với Google",
                )
              }
            />
          </>
        )}
        {mode === "register" && registerEmail && (
          <OtpPanel
            title="Xác thực email"
            email={registerEmail}
            secondsLeft={secondsLeft}
            busy={busy}
            form={otpForm}
            onSubmit={(data) =>
              run(async () =>
                finishLogin(
                  await publicApi<AuthResponse>("/auth/register/verify", {
                    method: "POST",
                    body: JSON.stringify({
                      email: registerEmail,
                      code: data.code,
                    }),
                  }),
                  "Đăng ký thành công",
                ),
              )
            }
            onResend={() =>
              run(async () => {
                await publicApi("/auth/register/resend", {
                  method: "POST",
                  body: JSON.stringify({ email: registerEmail }),
                });
                setExpiresAt(Date.now() + 600_000);
                notifications.toast("Đã gửi mã xác thực mới", "success");
              })
            }
            onBack={() => switchMode("register")}
          />
        )}
        {mode === "forgot-password" && !resetEmail && (
          <>
            <button
              className="back-link"
              type="button"
              onClick={() => switchMode("login")}
            >
              ← Quay lại đăng nhập
            </button>
            <h2 id="auth-title">Quên mật khẩu</h2>
            <p className="auth-subtitle">
              Nhập email của tài khoản đăng nhập bằng mật khẩu để nhận mã xác
              thực.
            </p>
            <form
              onSubmit={emailForm.handleSubmit((data) =>
                run(async () => {
                  await publicApi("/auth/password-reset/request", {
                    method: "POST",
                    body: JSON.stringify(data),
                  });
                  setResetEmail(data.email.toLowerCase());
                  setExpiresAt(Date.now() + 600_000);
                  notifications.toast("Gửi mã xác thực thành công", "success");
                }),
              )}
            >
              <Field
                label="Email"
                error={emailForm.formState.errors.email?.message}
              >
                <input
                  type="email"
                  autoComplete="email"
                  {...emailForm.register("email")}
                />
              </Field>
              <SubmitButton busy={busy}>Gửi mã xác thực</SubmitButton>
            </form>
          </>
        )}
        {mode === "forgot-password" && resetEmail && !resetToken && (
          <OtpPanel
            title="Nhập mã xác thực"
            email={resetEmail}
            secondsLeft={secondsLeft}
            busy={busy}
            form={otpForm}
            onSubmit={(data) =>
              run(async () => {
                const result = await publicApi<{ resetToken: string }>(
                  "/auth/password-reset/verify",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      email: resetEmail,
                      code: data.code,
                    }),
                  },
                );
                setResetToken(result.resetToken);
              })
            }
            onResend={() =>
              run(async () => {
                await publicApi("/auth/password-reset/request", {
                  method: "POST",
                  body: JSON.stringify({ email: resetEmail }),
                });
                setExpiresAt(Date.now() + 600_000);
                notifications.toast(
                  "Gửi mã xác thực mới thành công",
                  "success",
                );
              })
            }
            onBack={() => switchMode("forgot-password")}
          />
        )}
        {mode === "forgot-password" && resetToken && (
          <>
            <h2 id="auth-title">Đặt mật khẩu mới</h2>
            <p className="auth-subtitle">
              Mật khẩu mới cần có ít nhất 8 ký tự, gồm chữ và số.
            </p>
            <form
              onSubmit={resetForm.handleSubmit((data) =>
                run(async () => {
                  await publicApi("/auth/password-reset/confirm", {
                    method: "POST",
                    body: JSON.stringify({ resetToken, ...data }),
                  });
                  notifications.toast(
                    "Đổi mật khẩu thành công. Hãy đăng nhập lại.",
                    "success",
                  );
                  setResetToken(null);
                  setResetEmail(null);
                  setParams({ mode: "login" });
                }),
              )}
            >
              <Field
                label="Mật khẩu mới"
                error={resetForm.formState.errors.password?.message}
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  {...resetForm.register("password")}
                />
              </Field>
              <Field
                label="Xác nhận mật khẩu"
                error={resetForm.formState.errors.passwordConfirmation?.message}
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  {...resetForm.register("passwordConfirmation")}
                />
              </Field>
              <SubmitButton busy={busy}>Cập nhật mật khẩu</SubmitButton>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

function GoogleSection({
  busy,
  onCredential,
  onError,
}: {
  busy: boolean;
  onCredential: (credential: string) => void;
  onError: () => void;
}) {
  const configured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  return (
    <>
      <div className="auth-divider">
        <span>hoặc</span>
      </div>
      <div className={busy ? "google-disabled" : "google-button"}>
        {configured ? (
          <GoogleLogin
            onSuccess={(response) =>
              response.credential
                ? onCredential(response.credential)
                : onError()
            }
            onError={onError}
            width="320"
          />
        ) : (
          <button
            type="button"
            className="button-secondary submit-button"
            disabled
          >
            Google chưa được cấu hình
          </button>
        )}
      </div>
    </>
  );
}

function OtpPanel({
  title,
  email,
  secondsLeft,
  busy,
  form,
  onSubmit,
  onResend,
  onBack,
}: {
  title: string;
  email: string;
  secondsLeft: number;
  busy: boolean;
  form: ReturnType<typeof useForm<OtpInput>>;
  onSubmit: (data: OtpInput) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <button className="back-link" type="button" onClick={onBack}>
        ← Đổi email
      </button>
      <h2 id="auth-title">{title}</h2>
      <p className="auth-subtitle">
        Mã 6 chữ số đã được gửi tới <strong>{email}</strong>.
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Field label="Mã xác thực" error={form.formState.errors.code?.message}>
          <input
            className="otp-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            {...form.register("code")}
          />
        </Field>
        <p className="otp-timer">
          {secondsLeft > 0
            ? `Mã hết hạn sau ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            : "Mã có thể đã hết hạn"}
        </p>
        <SubmitButton busy={busy}>Xác thực</SubmitButton>
        <button
          type="button"
          className="text-button resend-button"
          disabled={busy || secondsLeft > 540}
          onClick={onResend}
        >
          Gửi lại mã
        </button>
      </form>
    </>
  );
}
