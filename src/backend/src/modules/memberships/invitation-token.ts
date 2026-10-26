import { createHash, randomBytes } from "node:crypto";
import type { InvitationStatus } from "@family-tree/shared-types";

/** 32 byte ngẫu nhiên, mã hóa base64url để nhét thẳng vào URL. */
export const generateInvitationToken = () =>
  randomBytes(32).toString("base64url");

/** DB chỉ lưu hash, lộ DB cũng không dùng được link. */
export const hashInvitationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

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
