import {
  Camera,
  LoaderCircle,
  SwitchCamera,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DialogShell } from "../family-tree/ManagementDialogs";
import {
  compactPrimaryButtonClass,
  compactSecondaryButtonClass,
} from "../../lib/ui-classes";
import {
  cameraConstraints,
  cameraErrorMessage,
  captureFrame,
  CAMERA_LOST_MESSAGE,
  CAMERA_RETRY_MS,
  isTransientCameraError,
  type CameraFacing,
} from "./camera";

/**
 * Hộp thoại chụp ảnh bằng camera của máy tính. Ảnh chụp chỉ được đưa cho `onCapture`,
 * không lưu ở đâu. Camera tắt ngay khi đóng hộp thoại.
 */
export function CameraCapture({
  onCapture,
  onClose,
  onPickFile,
}: {
  onCapture: (photo: Blob) => void;
  onClose: () => void;
  /** Mở bộ chọn tệp thay cho camera (khi camera không dùng được). */
  onPickFile: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<CameraFacing>("environment");
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    const stopStream = () =>
      stream?.getTracks().forEach((track) => track.stop());
    setReady(false);
    setError(null);
    void (async () => {
      try {
        // StrictMode (dev) chạy effect hai lần liên tiếp: lần đầu bị hủy ngay thì không mở camera.
        await Promise.resolve();
        if (cancelled) return;
        const constraints = cameraConstraints(facing);
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (cause) {
          // Vừa đóng rồi mở lại ngay thì camera chưa kịp nhả: chờ một nhịp rồi thử lại một lần.
          if (cancelled || !isTransientCameraError(cause)) throw cause;
          await new Promise((resolve) => setTimeout(resolve, CAMERA_RETRY_MS));
          if (cancelled) return;
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        }
        // Hộp thoại đã đóng trong lúc chờ cấp quyền: tắt camera ngay.
        if (cancelled) return stopStream();
        const video = videoRef.current;
        if (!video) return stopStream();
        // Camera tự ngắt (rút webcam, ứng dụng khác chiếm): không để khung hình đen như đang sẵn sàng.
        // Tự gọi track.stop() thì không phát sự kiện này.
        const track = stream.getVideoTracks()[0];
        const onEnded = () => {
          if (cancelled) return;
          setReady(false);
          setError(CAMERA_LOST_MESSAGE);
        };
        track?.addEventListener("ended", onEnded);
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        if (!track || track.readyState === "ended") return onEnded();
        setReady(true);
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled)
          setCanSwitch(
            devices.filter((device) => device.kind === "videoinput").length > 1,
          );
      } catch (cause) {
        if (!cancelled) setError(cameraErrorMessage(cause));
      }
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facing, attempt]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !ready || capturing) return;
    setCapturing(true);
    try {
      onCapture(await captureFrame(video));
    } catch {
      // Ẩn khung hình để hiện lỗi; "Thử lại" sẽ mở lại camera.
      setReady(false);
      setError("Không chụp được ảnh, bạn thử lại nhé.");
      setCapturing(false);
    }
  };

  return (
    <DialogShell title="Chụp ảnh" onClose={onClose}>
      <div className="grid gap-4">
        <div className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl bg-[#0d1b18]">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`size-full object-contain ${ready ? "" : "invisible"}`}
            aria-label="Hình từ camera"
          />
          {!ready && (
            <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 p-6 text-center text-sm text-white">
              {error ? (
                <>
                  <TriangleAlert size={26} className="text-accent" />
                  <p className="m-0 max-w-sm" role="alert">
                    {error}
                  </p>
                </>
              ) : (
                <>
                  <LoaderCircle size={26} className="animate-spin" />
                  <p className="m-0">Đang mở camera…</p>
                </>
              )}
            </div>
          )}
        </div>
        <p className="m-0 text-xs text-ink-muted">
          Đưa bia mộ, trang gia phả hoặc ảnh cũ vào giữa khung hình, đủ sáng và
          rõ chữ. Ảnh chỉ dùng cho câu hỏi này, không lưu trên máy chủ.
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {error ? (
            <>
              <button
                type="button"
                className={compactSecondaryButtonClass}
                onClick={() => {
                  onClose();
                  onPickFile();
                }}
              >
                Chọn ảnh có sẵn
              </button>
              <button
                type="button"
                className={compactPrimaryButtonClass}
                onClick={() => setAttempt((n) => n + 1)}
              >
                Thử lại
              </button>
            </>
          ) : (
            <>
              {canSwitch && (
                <button
                  type="button"
                  className={compactSecondaryButtonClass}
                  onClick={() =>
                    setFacing((f) => (f === "user" ? "environment" : "user"))
                  }
                  disabled={!ready || capturing}
                >
                  <SwitchCamera size={16} /> Đổi camera
                </button>
              )}
              <button
                type="button"
                className={compactPrimaryButtonClass}
                onClick={() => void capture()}
                disabled={!ready || capturing}
                autoFocus
              >
                <Camera size={16} /> Chụp
              </button>
            </>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
