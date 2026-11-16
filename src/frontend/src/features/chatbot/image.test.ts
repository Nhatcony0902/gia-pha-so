import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ImagePrepareError,
  SOURCE_MAX_BYTES,
  base64Bytes,
  fitWithin,
  imageFromClipboard,
  prepareChatImage,
} from "./image";

describe("fitWithin", () => {
  it("thu nhỏ theo cạnh dài, giữ tỉ lệ", () => {
    assert.deepEqual(fitWithin(4000, 3000, 1280), { width: 1280, height: 960 });
    assert.deepEqual(fitWithin(3000, 4000, 1280), { width: 960, height: 1280 });
  });

  it("ảnh nhỏ thì giữ nguyên, không phóng to", () => {
    assert.deepEqual(fitWithin(640, 480, 1280), { width: 640, height: 480 });
  });

  it("ảnh rất dẹt vẫn có kích thước ít nhất 1 px", () => {
    assert.deepEqual(fitWithin(10000, 2, 256), { width: 256, height: 1 });
  });
});

describe("base64Bytes", () => {
  it("tính đúng số byte, kể cả phần đệm =", () => {
    for (const text of ["", "a", "ab", "abc", "abcd", "Gia phả họ Lê"]) {
      const base64 = Buffer.from(text).toString("base64");
      assert.equal(base64Bytes(base64), Buffer.byteLength(text));
    }
  });
});

describe("imageFromClipboard", () => {
  const item = (kind: string, type: string, file: unknown) => ({
    kind,
    type,
    getAsFile: () => file,
  });

  it("lấy ảnh đầu tiên, bỏ qua chữ và tệp khác", () => {
    const image = { name: "anh.png" };
    const data = {
      items: [
        item("string", "text/plain", null),
        item("file", "application/pdf", { name: "a.pdf" }),
        item("file", "image/png", image),
      ],
    } as unknown as DataTransfer;
    assert.equal(imageFromClipboard(data), image);
  });

  it("không có ảnh thì trả null", () => {
    assert.equal(imageFromClipboard(null), null);
    assert.equal(
      imageFromClipboard({
        items: [item("string", "text/plain", null)],
      } as unknown as DataTransfer),
      null,
    );
  });
});

describe("prepareChatImage", () => {
  it("từ chối tệp không phải ảnh hoặc quá lớn trước khi giải mã", async () => {
    await assert.rejects(
      prepareChatImage(new Blob(["x"], { type: "application/pdf" }), 1000),
      ImagePrepareError,
    );
    const huge = { type: "image/jpeg", size: SOURCE_MAX_BYTES + 1 } as Blob;
    await assert.rejects(prepareChatImage(huge, 1000), /dưới 25 MB/);
  });
});
