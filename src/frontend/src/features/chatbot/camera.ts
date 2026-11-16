/** Chụp ảnh bằng camera ngay trong trang chat (LMS-019, ADR-0006). */

/** `environment`: camera sau (chụp bia mộ, trang giấy). `user`: camera trước. */
export type CameraFacing = "environment" | "user";

type MediaNavigator = {
  mediaDevices?: { getUserMedia?: unknown };
};

/** Trình duyệt mở được camera trong trang (cần HTTPS hoặc localhost). */
export function cameraSupported(
  nav: MediaNavigator | undefined = globalThis.navigator,
): boolean {
  return typeof nav?.mediaDevices?.getUserMedia === "function";
}

/**
 * Điện thoại, máy tính bảng: dùng ứng dụng camera của máy (qua `<input capture>`),
 * vì có lấy nét, đèn flash và ảnh nét hơn khung hình video.
 */
export function prefersNativeCamera(
  win: Pick<Window, "matchMedia"> | undefined = globalThis.window,
): boolean {
  return (
    win?.matchMedia?.("(hover: none) and (pointer: coarse)").matches === true
  );
}

export function cameraConstraints(
  facing: CameraFacing,
): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };
}

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error
    ? String((error as { name: unknown }).name)
    : "";
}

/** Camera đang chạy thì bị ngắt giữa chừng. */
export const CAMERA_LOST_MESSAGE =
  "Camera vừa bị ngắt. Bạn kiểm tra lại camera rồi bấm Thử lại.";

/** Chờ bao lâu trước khi thử mở lại camera sau một lỗi tạm thời. */
export const CAMERA_RETRY_MS = 500;

/**
 * Lỗi có thể tự hết sau một nhịp: webcam vừa được tắt chưa kịp nhả (đóng hộp thoại rồi mở lại ngay)
 * thì trình duyệt báo đang bận. Bị từ chối quyền hoặc không có camera thì không thử lại.
 */
export function isTransientCameraError(error: unknown): boolean {
  return ["NotReadableError", "AbortError"].includes(errorName(error));
}

/** Thông báo cho người dùng khi không mở được camera. */
export function cameraErrorMessage(error: unknown): string {
  switch (errorName(error)) {
    case "NotAllowedError":
    case "SecurityError":
      return "Trang chưa được phép dùng camera. Bạn bấm vào biểu tượng ổ khóa cạnh địa chỉ trang, cho phép Camera rồi thử lại.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Không tìm thấy camera trên máy này.";
    case "NotReadableError":
    case "AbortError":
      return "Camera đang được ứng dụng khác dùng. Bạn đóng ứng dụng đó rồi thử lại.";
    default:
      return "Không mở được camera.";
  }
}

/** Chụp khung hình hiện tại của video thành ảnh JPEG. */
export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const { videoWidth: width, videoHeight: height } = video;
  if (!width || !height) throw new Error("Camera chưa sẵn sàng");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không tạo được canvas");
  context.drawImage(video, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Không chụp được khung hình");
  return blob;
}
