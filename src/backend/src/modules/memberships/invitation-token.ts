import { createHash, randomBytes } from "node:crypto";
import type { InvitationStatus } from "@family-tree/shared-types";

/** 32 byte ngẫu nhiên, mã hóa base64url để nhét thẳng vào URL. */
export const generateInvitationToken = () =>
  randomBytes(32).toString("base64url");

/** DB chỉ lưu hash, lộ DB cũng không dùng được link. */
export const hashInvitationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** Che email cho trang xem trước công khai: "nguyenvana@gmail.com" → "ng***@gmail.com". */
export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, Math.min(2, local.length - 1))}***@${domain}`;
}

export function invitationStatus(
  invitation: {
    revokedAt: Date | null;
    expiresAt: Date;
    maxUses: number | null;
    useCount: number;
  },
  now = new Date(),
): InvitationStatus {
  if (invitation.revokedAt) return "REVOKED";
  if (invitation.expiresAt <= now) return "EXPIRED";
  if (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses)
    return "EXHAUSTED";
  return "ACTIVE";
}
