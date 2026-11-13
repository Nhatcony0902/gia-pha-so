import { BadRequestException } from "@nestjs/common";
import type { ChatImage, ChatImageMimeType } from "@family-tree/shared-types";

/** Ảnh gửi kèm câu hỏi (LMS-019, ADR-0006). Không lưu, chỉ kiểm tra rồi gửi cho model. */

export const CHAT_IMAGE_MIME_TYPES: readonly ChatImageMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
/** 1.5 MB sau khi giải mã. Trình duyệt đã nén ảnh xuống cạnh dài 1280 px nên thường chỉ vài trăm KB. */
export const CHAT_IMAGE_MAX_BYTES = 1_572_864;
/** Độ dài base64 tương ứng, dùng để chặn sớm ở DTO. */
export const CHAT_IMAGE_MAX_BASE64_LENGTH =
  Math.ceil(CHAT_IMAGE_MAX_BYTES / 3) * 4;
/** Giới hạn body JSON của route chat: ảnh base64 + câu hỏi + lịch sử. Express mặc định chỉ 100 KB. */
export const CHAT_BODY_LIMIT = "3mb";

const invalid = (message: string) =>
  new BadRequestException({ code: "INVALID_IMAGE", message });

/** Nhận dạng ảnh theo vài byte đầu, không tin `mimeType` client gửi. */
export function sniffImageType(bytes: Uint8Array): ChatImageMimeType | null {
  const starts = (signature: number[], offset = 0) =>
    signature.every((byte, i) => bytes[offset + i] === byte);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  // "RIFF" .... "WEBP"
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}

/**
 * Giải mã và kiểm tra ảnh: base64 hợp lệ, đúng dung lượng, nội dung thật sự là JPEG/PNG/WebP
 * và khớp `mimeType`. Trả về ảnh đã chuẩn hóa (base64 không khoảng trắng) để gửi cho Gemini.
 */
export function decodeChatImage(
  image: ChatImage,
): ChatImage & { bytes: number } {
  const data = image.data.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4 === 1)
    throw invalid("Ảnh gửi kèm bị hỏng, bạn chọn lại ảnh nhé");
  const buffer = Buffer.from(data, "base64");
  if (buffer.length > CHAT_IMAGE_MAX_BYTES)
    throw invalid(
      `Ảnh quá lớn (tối đa ${(CHAT_IMAGE_MAX_BYTES / 1024 / 1024).toFixed(1)} MB)`,
    );
  const actual = sniffImageType(buffer);
  if (!actual) throw invalid("Chỉ nhận ảnh JPEG, PNG hoặc WebP");
  if (actual !== image.mimeType)
    throw invalid("Định dạng ảnh không khớp với nội dung");
  return {
    mimeType: actual,
    data: buffer.toString("base64"),
    bytes: buffer.length,
  };
}
