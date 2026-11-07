import type { ChatStreamEvent } from "@family-tree/shared-types";
import type { Response } from "express";
import type { AgentEvent, AgentResult } from "./agent.js";

const HEARTBEAT_MS = 15_000;

/** Dòng SSE cho một sự kiện. Chỉ dùng `data:` chứa JSON có trường `type`. */
export const sseFrame = (event: ChatStreamEvent) =>
  `data: ${JSON.stringify(event)}\n\n`;

/**
 * Trả lời chat dạng SSE trên một request POST (ADR-0004). Không dùng `@Sse()` của Nest vì nó chỉ
 * hợp với GET, mà client cần gửi body và header Authorization (EventSource không gửi được).
 * Client đóng kết nối thì hủy luôn lượt gọi LLM để khỏi tốn token.
 */
export async function streamAgentAnswer(
  res: Pick<
    Response,
    | "status"
    | "setHeader"
    | "flushHeaders"
    | "write"
    | "end"
    | "on"
    | "writableEnded"
    | "destroyed"
  >,
  run: (
    emit: (event: AgentEvent) => void,
    signal: AbortSignal,
  ) => Promise<AgentResult>,
  describeError: (error: unknown) => { code: string; message: string },
) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  const open = () => !res.writableEnded && !res.destroyed;
  const send = (event: ChatStreamEvent) => {
    if (open()) res.write(sseFrame(event));
  };
  const heartbeat = setInterval(() => {
    if (open()) res.write(": ping\n\n");
  }, HEARTBEAT_MS);

  try {
    const result = await run(send, controller.signal);
    send({
      type: "done",
      answer: result.answer,
      persons: result.persons,
      usage: {
        rounds: result.rounds,
        inputTokens: result.tokens.input,
        outputTokens: result.tokens.output,
      },
    });
  } catch (error) {
    if (!controller.signal.aborted)
      send({ type: "error", ...describeError(error) });
  } finally {
    clearInterval(heartbeat);
    if (open()) res.end();
  }
}
