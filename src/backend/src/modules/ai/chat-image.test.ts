import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  CHAT_IMAGE_MAX_BYTES,
  decodeChatImage,
  sniffImageType,
} from "./chat-image.js";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x24, 0, 0, 0]),
  Buffer.from("WEBPVP8 "),
]);
const GIF = Buffer.from("GIF89a....");
const b64 = (buffer: Buffer) => buffer.toString("base64");

const codeOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof BadRequestException);
    const response = error.getResponse() as { code: string; message: string };
    assert.equal(response.code, "INVALID_IMAGE");
    return response.message;
  }
  assert.fail("phải báo lỗi");
};

describe("sniffImageType", () => {
  it("nhận ra JPEG, PNG, WebP theo byte đầu", () => {
    assert.equal(sniffImageType(JPEG), "image/jpeg");
    assert.equal(sniffImageType(PNG), "image/png");
    assert.equal(sniffImageType(WEBP), "image/webp");
  });

  it("không nhận định dạng khác hoặc dữ liệu quá ngắn", () => {
    assert.equal(sniffImageType(GIF), null);
    assert.equal(sniffImageType(Buffer.from("RIFF")), null);
    assert.equal(sniffImageType(new Uint8Array()), null);
  });
});

describe("decodeChatImage", () => {
  it("trả ảnh đã chuẩn hóa: bỏ tiền tố data: và khoảng trắng", () => {
    const data = b64(JPEG);
    const image = decodeChatImage({
      mimeType: "image/jpeg",
      data: `data:image/jpeg;base64,${data.slice(0, 4)}\n${data.slice(4)}`,
    });
    assert.deepEqual(image, {
      mimeType: "image/jpeg",
      data,
      bytes: JPEG.length,
    });
  });

  it("chặn nội dung không phải ảnh dù mimeType khai là ảnh", () => {
    assert.match(
      codeOf(() => decodeChatImage({ mimeType: "image/png", data: b64(GIF) })),
      /JPEG, PNG hoặc WebP/,
    );
    const html = b64(Buffer.from("<script>alert(1)</script>"));
    assert.match(
      codeOf(() => decodeChatImage({ mimeType: "image/jpeg", data: html })),
      /JPEG, PNG hoặc WebP/,
    );
  });

  it("chặn mimeType không khớp nội dung", () => {
    assert.match(
      codeOf(() => decodeChatImage({ mimeType: "image/png", data: b64(JPEG) })),
      /không khớp/,
    );
  });

  it("chặn base64 hỏng hoặc rỗng", () => {
    assert.match(
      codeOf(() => decodeChatImage({ mimeType: "image/jpeg", data: "%%%" })),
      /bị hỏng/,
    );
    assert.match(
      codeOf(() => decodeChatImage({ mimeType: "image/jpeg", data: "  " })),
      /bị hỏng/,
    );
  });

  it("chặn ảnh quá dung lượng", () => {
    const big = Buffer.alloc(CHAT_IMAGE_MAX_BYTES + 1);
    JPEG.copy(big);
    assert.match(
      codeOf(() => decodeChatImage({ mimeType: "image/jpeg", data: b64(big) })),
      /quá lớn/,
    );
    const atLimit = Buffer.alloc(CHAT_IMAGE_MAX_BYTES);
    JPEG.copy(atLimit);
    assert.equal(
      decodeChatImage({ mimeType: "image/jpeg", data: b64(atLimit) }).bytes,
      CHAT_IMAGE_MAX_BYTES,
    );
  });
});
