import type {
  ChatHistoryTurn,
  ChatPersonRef,
  ChatStreamEvent,
} from "@family-tree/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { streamChat } from "./api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "streaming" | "done" | "error" | "stopped";
  /** Trạng thái tool đang chạy ("Đang xác định quan hệ…"). */
  toolLabel?: string;
  persons?: ChatPersonRef[];
};

const HISTORY_TURNS = 6;
const storageKey = (treeId: string) => `chatbot:${treeId}`;
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

/** Hội thoại giữ trong sessionStorage theo gia phả: tải lại trang không mất, đóng tab thì xóa. */
function loadMessages(treeId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(treeId));
    const messages = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    // câu trả lời đang stream dở lúc tải lại trang thì coi như đã dừng
    return messages.map((m) =>
      m.status === "streaming"
        ? { ...m, status: "stopped", toolLabel: undefined }
        : m,
    );
  } catch {
    return [];
  }
}

/** Các cặp hỏi – đáp đã hoàn tất gần nhất, gửi kèm để hiểu câu hỏi nối tiếp. */
export function historyFrom(messages: ChatMessage[]): ChatHistoryTurn[] {
  const turns: ChatHistoryTurn[] = [];
  for (let i = 0; i + 1 < messages.length; i++) {
    const question = messages[i]!;
    const answer = messages[i + 1]!;
    if (
      question.role === "user" &&
      answer.role === "assistant" &&
      answer.status === "done"
    )
      turns.push(
        { role: "user", text: question.text },
        { role: "assistant", text: answer.text },
      );
  }
  return turns.slice(-HISTORY_TURNS);
}

export function useChat(treeId: string, onFinished?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessages(treeId),
  );
  const controllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Rời trang thì hủy câu đang hỏi. Trang chat được mount lại khi đổi gia phả (key = treeId).
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(treeId), JSON.stringify(messages));
    } catch {
      // sessionStorage có thể bị chặn, hội thoại vẫn chạy bình thường
    }
  }, [messages, treeId]);

  const streaming = messages.some((m) => m.status === "streaming");

  const send = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || controllerRef.current) return;
      const history = historyFrom(messagesRef.current);
      const answerId = newId();
      const update = (patch: (m: ChatMessage) => Partial<ChatMessage>) =>
        setMessages((current) =>
          current.map((m) => (m.id === answerId ? { ...m, ...patch(m) } : m)),
        );
      setMessages((current) => [
        ...current,
        { id: newId(), role: "user", text: question, status: "done" },
        { id: answerId, role: "assistant", text: "", status: "streaming" },
      ]);

      const controller = new AbortController();
      controllerRef.current = controller;
      let finished = false;
      const onEvent = (event: ChatStreamEvent) => {
        if (event.type === "tool") update(() => ({ toolLabel: event.label }));
        else if (event.type === "delta")
          update((m) => ({ text: m.text + event.text, toolLabel: undefined }));
        else if (event.type === "discard") update(() => ({ text: "" }));
        else if (event.type === "done") {
          finished = true;
          update(() => ({
            text: event.answer,
            persons: event.persons,
            status: "done",
            toolLabel: undefined,
          }));
        } else if (event.type === "error") {
          finished = true;
          update(() => ({
            text: event.message,
            status: "error",
            toolLabel: undefined,
          }));
        }
      };
      try {
        await streamChat(
          treeId,
          { question, history },
          onEvent,
          controller.signal,
        );
        if (!finished)
          update(() => ({
            text: "Kết nối bị gián đoạn trước khi có câu trả lời. Bạn thử lại nhé.",
            status: "error",
            toolLabel: undefined,
          }));
      } catch (error) {
        if (controller.signal.aborted)
          update((m) => ({
            status: "stopped",
            toolLabel: undefined,
            text: m.text,
          }));
        else
          update(() => ({
            text:
              error instanceof ApiError
                ? error.message
                : "Không kết nối được máy chủ. Bạn thử lại nhé.",
            status: "error",
            toolLabel: undefined,
          }));
      } finally {
        controllerRef.current = null;
        onFinished?.();
      }
    },
    [treeId, onFinished],
  );

  const stop = useCallback(() => controllerRef.current?.abort(), []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setMessages([]);
  }, []);

  /** Hỏi lại câu của một câu trả lời lỗi/đã dừng: bỏ cặp đó rồi gửi lại. */
  const retry = useCallback(
    (answerId: string) => {
      const list = messagesRef.current;
      const index = list.findIndex((m) => m.id === answerId);
      const question = list[index - 1];
      if (index < 1 || question?.role !== "user") return;
      const remaining = list.filter((_, i) => i !== index && i !== index - 1);
      messagesRef.current = remaining;
      setMessages(remaining);
      void send(question.text);
    },
    [send],
  );

  return { messages, streaming, send, stop, reset, retry };
}
