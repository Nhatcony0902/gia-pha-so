import type { ChatImage } from "@family-tree/shared-types";

/** Ảnh gửi kèm câu hỏi (LMS-019, ADR-0006): nén ở trình duyệt trước khi gửi. */

/** Cạnh dài tối đa khi gửi cho AI. Đủ để đọc chữ trên bia mộ hay trang giấy. */
export const IMAGE_MAX_SIDE = 1280;
/** Ảnh nhỏ lưu cùng hội thoại trong sessionStorage. */
export const THUMBNAIL_MAX_SIDE = 256;
/** Ảnh gốc lớn hơn mức này thì từ chối luôn, không cố giải mã. */
export const SOURCE_MAX_BYTES = 25 * 1024 * 1024;
/** Câu hỏi mặc định khi người dùng chỉ gửi ảnh. */
export const DEFAULT_IMAGE_QUESTION = "Ảnh này liên quan tới ai trong gia phả?";

export type PreparedImage = ChatImage & {
  /** Data URL của ảnh nhỏ để hiện trong hội thoại. */
  thumbnail: string;
  bytes: number;
};

export class ImagePrepareError extends Error {}

/** Kích thước mới giữ tỉ lệ, cạnh dài không vượt `maxSide`, không phóng to. */
export function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Số byte thật của một chuỗi base64. */
export function base64Bytes(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** Ảnh lấy từ khay nhớ tạm (Ctrl+V), nếu có. */
export function imageFromClipboard(data: DataTransfer | null): File | null {
  for (const item of Array.from(data?.items ?? []))
    if (item.kind === "file" && item.type.startsWith("image/"))
      return item.getAsFile();
  return null;
}

/** Các mức nén thử lần lượt cho tới khi ảnh nhỏ hơn giới hạn của server. */
const ATTEMPTS = [
  { side: IMAGE_MAX_SIDE, quality: 0.85 },
  { side: IMAGE_MAX_SIDE, quality: 0.7 },
  { side: 1024, quality: 0.6 },
  { side: 800, quality: 0.5 },
];

/**
 * Giải mã ảnh, thu nhỏ và nén JPEG. Ảnh PNG có nền trong suốt được phủ nền trắng.
 * Ném `ImagePrepareError` với thông báo cho người dùng nếu không xử lý được.
 */
export async function prepareChatImage(
  file: Blob,
  maxBytes: number,
): Promise<PreparedImage> {
  if (!file.type.startsWith("image/"))
    throw new ImagePrepareError("Bạn chỉ gửi được tệp ảnh.");
  if (file.size > SOURCE_MAX_BYTES)
    throw new ImagePrepareError("Ảnh quá lớn, bạn chọn ảnh dưới 25 MB nhé.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImagePrepareError(
      "Trình duyệt không đọc được ảnh này (ảnh HEIC của iPhone thì bạn chụp màn hình rồi gửi lại nhé).",
    );
  }
  try {
    for (const attempt of ATTEMPTS) {
      const data = await encodeJpeg(bitmap, attempt.side, attempt.quality);
      const bytes = base64Bytes(data);
      if (bytes <= maxBytes) {
        const thumbnail = `data:image/jpeg;base64,${await encodeJpeg(bitmap, THUMBNAIL_MAX_SIDE, 0.7)}`;
        return { mimeType: "image/jpeg", data, thumbnail, bytes };
      }
    }
    throw new ImagePrepareError("Ảnh quá chi tiết, không nén nhỏ được.");
  } finally {
    bitmap.close();
  }
}

async function encodeJpeg(
  bitmap: ImageBitmap,
  maxSide: number,
  quality: number,
): Promise<string> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context)
    throw new ImagePrepareError("Trình duyệt không xử lý được ảnh.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new ImagePrepareError("Trình duyệt không xử lý được ảnh.");
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000)
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  return btoa(binary);
}
