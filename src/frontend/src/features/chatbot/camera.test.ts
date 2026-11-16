import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cameraConstraints,
  cameraErrorMessage,
  cameraSupported,
  isTransientCameraError,
  prefersNativeCamera,
} from "./camera";

describe("cameraSupported", () => {
  it("có getUserMedia thì mở được camera trong trang", () => {
    assert.equal(
      cameraSupported({ mediaDevices: { getUserMedia: () => undefined } }),
      true,
    );
  });

  it("trang không an toàn (http) hoặc trình duyệt cũ thì không", () => {
    assert.equal(cameraSupported({}), false);
    assert.equal(cameraSupported({ mediaDevices: {} }), false);
    assert.equal(cameraSupported(undefined), false);
  });
});

describe("prefersNativeCamera", () => {
  const win = (matches: boolean) =>
    ({
      matchMedia: (query: string) => {
        assert.equal(query, "(hover: none) and (pointer: coarse)");
        return { matches };
      },
    }) as unknown as Pick<Window, "matchMedia">;

  it("màn hình cảm ứng thì dùng ứng dụng camera của máy", () => {
    assert.equal(prefersNativeCamera(win(true)), true);
  });

  it("máy tính có chuột thì mở camera trong trang", () => {
    assert.equal(prefersNativeCamera(win(false)), false);
    assert.equal(prefersNativeCamera(undefined), false);
  });
});

describe("cameraConstraints", () => {
  it("không xin micro, ưu tiên camera theo hướng được chọn", () => {
    const constraints = cameraConstraints("environment");
    assert.equal(constraints.audio, false);
    assert.deepEqual((constraints.video as MediaTrackConstraints).facingMode, {
      ideal: "environment",
    });
  });
});

const named = (name: string) => Object.assign(new Error("x"), { name });

describe("isTransientCameraError", () => {
  it("camera chưa kịp nhả hoặc đang bận thì đáng thử lại", () => {
    assert.equal(isTransientCameraError(named("NotReadableError")), true);
    assert.equal(isTransientCameraError(named("AbortError")), true);
  });

  it("bị từ chối quyền hoặc không có camera thì không thử lại", () => {
    assert.equal(isTransientCameraError(named("NotFoundError")), false);
    assert.equal(isTransientCameraError(named("NotAllowedError")), false);
    assert.equal(isTransientCameraError(named("SecurityError")), false);
    assert.equal(isTransientCameraError("oops"), false);
  });
});

describe("cameraErrorMessage", () => {
  it("bị từ chối quyền thì hướng dẫn cấp quyền", () => {
    assert.match(
      cameraErrorMessage(named("NotAllowedError")),
      /cho phép Camera/,
    );
  });

  it("không có camera", () => {
    assert.match(cameraErrorMessage(named("NotFoundError")), /Không tìm thấy/);
  });

  it("camera đang bận", () => {
    assert.match(
      cameraErrorMessage(named("NotReadableError")),
      /ứng dụng khác/,
    );
  });

  it("lỗi lạ thì báo chung", () => {
    assert.equal(cameraErrorMessage("oops"), "Không mở được camera.");
    assert.equal(cameraErrorMessage(null), "Không mở được camera.");
  });
});
