import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inviteMessage,
  shareToZalo,
  ZALO_WEB_URL,
  type ZaloShareEnv,
} from "./zalo-share";

const message = (maxUses: number | null) =>
  inviteMessage({
    treeName: "Họ Lê Đình",
    url: "https://giapha.example/invite/abc",
    // 23:30 ngày 15/11 giờ UTC là ngày 16/11 ở Việt Nam
    expiresAt: "2026-11-15T23:30:00.000Z",
    maxUses,
  });

function fakeEnv(overrides: Partial<ZaloShareEnv> = {}) {
  const calls = { shared: [] as string[], copied: [] as string[], opened: [] as string[] };
  const env: ZaloShareEnv = {
    isTouchDevice: false,
    share: async ({ text }) => {
      calls.shared.push(text);
    },
    writeClipboard: async (text) => {
      calls.copied.push(text);
    },
    openWindow: (url) => {
      calls.opened.push(url);
    },
    ...overrides,
  };
  return { env, calls };
}

describe("inviteMessage", () => {
  it("có tên gia phả, link trên một dòng riêng và ngày hết hạn theo giờ Việt Nam", () => {
    const lines = message(null).split("\n");
    assert.match(lines[0], /"Họ Lê Đình"/);
    assert.equal(lines[2], "https://giapha.example/invite/abc");
    assert.equal(lines[3], "Link hết hạn ngày 16/11/2026.");
  });

  it("ghi giới hạn số người khi link có giới hạn lượt dùng", () => {
    assert.match(message(5), /tối đa 5 người\.$/);
  });
});

describe("shareToZalo", () => {
  it("điện thoại: mở bảng chia sẻ của máy, không chép và không mở Zalo Web", async () => {
    const { env, calls } = fakeEnv({ isTouchDevice: true });
    assert.equal(await shareToZalo("lời mời", env), "shared");
    assert.deepEqual(calls.shared, ["lời mời"]);
    assert.deepEqual(calls.copied, []);
    assert.deepEqual(calls.opened, []);
  });

  it("điện thoại: người dùng đóng bảng chia sẻ thì dừng, không mở Zalo Web", async () => {
    const abort = Object.assign(new Error("cancel"), { name: "AbortError" });
    const { env, calls } = fakeEnv({
      isTouchDevice: true,
      share: async () => {
        throw abort;
      },
    });
    assert.equal(await shareToZalo("lời mời", env), "cancelled");
    assert.deepEqual(calls.opened, []);
  });

  it("điện thoại: bảng chia sẻ lỗi thì chuyển sang chép tin nhắn và mở Zalo Web", async () => {
    const { env, calls } = fakeEnv({
      isTouchDevice: true,
      share: async () => {
        throw new Error("NotAllowedError");
      },
    });
    assert.equal(await shareToZalo("lời mời", env), "copied");
    assert.deepEqual(calls.copied, ["lời mời"]);
    assert.deepEqual(calls.opened, [ZALO_WEB_URL]);
  });

  it("máy tính: chép tin nhắn rồi mới mở Zalo Web", async () => {
    const order: string[] = [];
    const { env, calls } = fakeEnv({
      writeClipboard: async () => {
        order.push("copy");
      },
      openWindow: () => {
        order.push("open");
      },
    });
    assert.equal(await shareToZalo("lời mời", env), "copied");
    assert.deepEqual(order, ["copy", "open"]);
    assert.deepEqual(calls.shared, []);
  });

  it("máy tính: không chép được thì báo lỗi và không mở Zalo Web", async () => {
    const { env, calls } = fakeEnv({
      writeClipboard: async () => {
        throw new Error("Document is not focused");
      },
    });
    await assert.rejects(shareToZalo("lời mời", env), /not focused/);
    assert.deepEqual(calls.opened, []);
  });
});
