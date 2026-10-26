import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationStatus,
} from "./invitation-token.js";

const now = new Date("2026-10-26T00:00:00Z");
const active = {
  revokedAt: null,
  expiresAt: new Date("2026-11-02T00:00:00Z"),
  maxUses: null,
  useCount: 0,
};

describe("invitation token", () => {
  it("sinh token URL-safe, không trùng nhau", () => {
    const a = generateInvitationToken();
    const b = generateInvitationToken();
    assert.match(a, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(a, b);
  });

  it("hash ổn định và không chứa token gốc", () => {
    const token = generateInvitationToken();
    assert.equal(hashInvitationToken(token), hashInvitationToken(token));
    assert.notEqual(hashInvitationToken(token), token);
  });
});

describe("invitationStatus", () => {
  it("còn hạn, chưa thu hồi, không giới hạn lượt thì ACTIVE", () => {
    assert.equal(invitationStatus(active, now), "ACTIVE");
  });

  it("thu hồi được ưu tiên hơn hết hạn", () => {
    assert.equal(
      invitationStatus(
        { ...active, revokedAt: now, expiresAt: new Date(0) },
        now,
      ),
      "REVOKED",
    );
  });

  it("đúng thời điểm hết hạn thì EXPIRED", () => {
    assert.equal(
      invitationStatus({ ...active, expiresAt: now }, now),
      "EXPIRED",
    );
  });

  it("dùng đủ maxUses thì EXHAUSTED", () => {
    assert.equal(
      invitationStatus({ ...active, maxUses: 3, useCount: 2 }, now),
      "ACTIVE",
    );
    assert.equal(
      invitationStatus({ ...active, maxUses: 3, useCount: 3 }, now),
      "EXHAUSTED",
    );
  });
});
