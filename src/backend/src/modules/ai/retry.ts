/**
 * Xử lý lỗi tạm thời khi gọi Gemini (LMS-016). Free tier hay trả 503 "high demand", 429 và
 * thỉnh thoảng rớt kết nối ("fetch failed"): những lỗi này thử lại hoặc đổi model dự phòng là qua.
 */

export type RetryPolicy = {
  /** Số lần gọi tối đa với mỗi model (tính cả lần đầu). */
  attempts: number;
  /** Thời gian chờ trước lần thử lại thứ nhất; các lần sau gấp đôi. */
  baseDelayMs: number;
  /**
   * Chờ tối đa bấy nhiêu ms cho mỗi chunk (kể cả chunk đầu). Gemini đôi khi giữ kết nối mà không
   * trả gì (hay gặp ngay sau 503); quá hạn thì coi như lỗi tạm thời để thử lại / đổi model.
   * Bỏ trống thì không giới hạn.
   */
  timeoutMs?: number;
};

/** Web: người dùng đang chờ, chỉ chờ ngắn (1s, 2s) rồi chuyển model dự phòng. */
export const WEB_RETRY: RetryPolicy = {
  attempts: 3,
  baseDelayMs: 1_000,
  timeoutMs: 30_000,
};
/** CLI (ai:chat, ai:eval): không ai chờ, chờ lâu hơn để qua đợt quá tải (10s, 20s, 40s). */
export const CLI_RETRY: RetryPolicy = {
  attempts: 4,
  baseDelayMs: 10_000,
  timeoutMs: 90_000,
};

/** Gemini không trả dữ liệu trong thời hạn `timeoutMs`. */
export class GeminiTimeoutError extends Error {
  override name = "GeminiTimeoutError";
  constructor(ms: number) {
    super(`Gemini không phản hồi sau ${ms / 1000}s`);
  }
}

/**
 * Chờ `promise` tối đa `ms`. Quá hạn thì gọi `onTimeout` (để hủy request) và ném
 * GeminiTimeoutError; người dùng hủy (`signal`) thì ném lý do hủy ngay.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number | undefined,
  signal?: AbortSignal,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(signal!.reason);
    };
    const timer =
      ms === undefined
        ? undefined
        : setTimeout(() => {
            cleanup();
            onTimeout?.();
            reject(new GeminiTimeoutError(ms));
          }, ms);
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const NETWORK_ERROR =
  /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|UND_ERR_|network/i;

function statusOf(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function errorText(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as { cause?: unknown }).cause;
  const causeText =
    cause instanceof Error
      ? `${cause.message} ${(cause as { code?: string }).code ?? ""}`
      : "";
  return `${error.message} ${causeText}`;
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

/** Lỗi 429 vì hết số request trong ngày (free tier): thử lại trong vài phút cũng vô ích. */
export function isDailyQuotaError(error: unknown) {
  return statusOf(error) === 429 && /PerDay|per day/i.test(errorText(error));
}

/** Lỗi tạm thời: quá tải, lỗi server, rớt mạng. Lỗi 400/401/403/404 là lỗi thật, không thử lại. */
export function isTransientError(error: unknown) {
  if (isAbortError(error)) return false;
  if (error instanceof GeminiTimeoutError) return true;
  const status = statusOf(error);
  if (status !== undefined) return RETRYABLE_STATUS.has(status);
  return NETWORK_ERROR.test(errorText(error));
}

export function retryDelay(policy: RetryPolicy, attempt: number) {
  return policy.baseDelayMs * 2 ** (attempt - 1);
}

/** Chờ `ms`, dừng ngay (ném AbortError) nếu người dùng hủy. */
export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function shortError(error: unknown) {
  const status = statusOf(error);
  if (status !== undefined) return `HTTP ${status}`;
  if (error instanceof GeminiTimeoutError) return error.message;
  return errorText(error).trim().slice(0, 80);
}

/** Thử lại `run` khi gặp lỗi tạm thời (dùng cho embedding ở CLI). */
export async function withRetry<T>(
  run: () => Promise<T>,
  policy: RetryPolicy = CLI_RETRY,
  onRetry: (message: string) => void = (message) => console.warn(message),
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (
        attempt >= policy.attempts ||
        !isTransientError(error) ||
        isDailyQuotaError(error)
      )
        throw error;
      const waitMs = retryDelay(policy, attempt);
      onRetry(
        `  Gemini lỗi (${shortError(error)}), thử lại sau ${waitMs / 1000}s…`,
      );
      await sleep(waitMs);
    }
  }
}
