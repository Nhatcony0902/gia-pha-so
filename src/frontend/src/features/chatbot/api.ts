import type {
  ChatContextResponse,
  ChatRequest,
  ChatStreamEvent,
} from "@family-tree/shared-types";
import {
  ApiError,
  apiGet,
  authorizedFetch,
  errorFromResponse,
} from "../../lib/api/client";

export const getChatContext = (treeId: string) =>
  apiGet<ChatContextResponse>(`/trees/${treeId}/chat`);

/**
 * Tách luồng SSE thành từng sự kiện. Chỉ đọc dòng `data:` (JSON), bỏ qua comment `: ping`.
 * Không dùng EventSource vì nó không gửi được POST body và header Authorization.
 */
export async function readSseEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ChatStreamEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = (frame: string) => {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) return;
    try {
      onEvent(JSON.parse(data) as ChatStreamEvent);
    } catch {
      // khung hỏng thì bỏ qua, không làm hỏng cả câu trả lời
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    frames.forEach(flush);
    if (done) break;
  }
  if (buffer.trim()) flush(buffer);
}

/** Gửi câu hỏi, gọi `onEvent` cho từng sự kiện stream. Lỗi trước khi mở stream ném ApiError. */
export async function streamChat(
  treeId: string,
  request: ChatRequest,
  onEvent: (event: ChatStreamEvent) => void,
  signal: AbortSignal,
) {
  const response = await authorizedFetch(`/trees/${treeId}/chat`, {
    method: "POST",
    body: JSON.stringify(request),
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!response.ok) throw await errorFromResponse(response);
  if (!response.body)
    throw new ApiError(
      0,
      "STREAM_UNSUPPORTED",
      "Trình duyệt không hỗ trợ stream",
    );
  await readSseEvents(response.body, onEvent);
}
