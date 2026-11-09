/** Zalo không có URL chia sẻ công khai cho web (plugin chính thức cần mã Official Account),
 * nên gửi link mời theo hai cách:
 * - Điện thoại: bảng chia sẻ của hệ điều hành (Web Share API), người dùng chọn Zalo.
 * - Máy tính: chép sẵn tin nhắn mời rồi mở Zalo Web để dán vào nhóm. */
export const ZALO_WEB_URL = "https://chat.zalo.me/";

const expiryFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function inviteMessage({
  treeName,
  url,
  expiresAt,
  maxUses,
}: {
  treeName: string;
  url: string;
  expiresAt: string;
  maxUses: number | null;
}) {
  const limit = maxUses ? ` Link dùng được cho tối đa ${maxUses} người.` : "";
  return [
    `Mời bạn vào gia phả "${treeName}" trên Gia Phả Số.`,
    "Bấm link rồi đăng nhập (chưa có tài khoản thì đăng ký) là xem được cây gia phả:",
    url,
    `Link hết hạn ngày ${expiryFormat.format(new Date(expiresAt))}.${limit}`,
  ].join("\n");
}

export type ZaloShareResult = "shared" | "cancelled" | "copied";

export interface ZaloShareEnv {
  /** Màn hình cảm ứng: ưu tiên bảng chia sẻ của máy, nơi có ứng dụng Zalo. */
  isTouchDevice: boolean;
  share?: (data: { title?: string; text: string }) => Promise<void>;
  writeClipboard: (text: string) => Promise<void>;
  openWindow: (url: string) => void;
}

export function browserZaloShareEnv(): ZaloShareEnv {
  return {
    isTouchDevice: window.matchMedia("(pointer: coarse)").matches,
    share:
      typeof navigator.share === "function"
        ? (data) => navigator.share(data)
        : undefined,
    writeClipboard: (text) => navigator.clipboard.writeText(text),
    openWindow: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}

const isAbort = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

/** Lỗi chép clipboard được ném ra để giao diện báo người dùng chép tay. */
export async function shareToZalo(
  text: string,
  env: ZaloShareEnv,
  title?: string,
): Promise<ZaloShareResult> {
  if (env.isTouchDevice && env.share) {
    try {
      await env.share({ title, text });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
      // Trình duyệt từ chối chia sẻ: chuyển sang chép tin nhắn.
    }
  }
  // Chép trước khi mở tab mới: tab mới lấy mất focus thì clipboard bị chặn.
  await env.writeClipboard(text);
  env.openWindow(ZALO_WEB_URL);
  return "copied";
}
