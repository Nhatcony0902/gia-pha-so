import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatContextResponse } from "@family-tree/shared-types";
import {
  Info,
  LoaderCircle,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Square,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router-dom";
import { PageBreadcrumbBar } from "../components/PageHeader";
import { getChatContext } from "../features/chatbot/api";
import { ChatMarkdown } from "../features/chatbot/ChatMarkdown";
import { useChat, type ChatMessage } from "../features/chatbot/useChat";
import {
  compactSecondaryButtonClass,
  secondaryButtonClass,
} from "../lib/ui-classes";

const routeStateClass =
  "grid min-h-[calc(100dvh-4rem)] place-content-center justify-items-center gap-[0.8rem] bg-surface-page p-4 text-center text-ink [&>h1]:m-0 [&>p]:m-0";

export function ChatPage() {
  const { treeId = "" } = useParams();
  // Đổi gia phả thì dựng lại toàn bộ hội thoại.
  return <ChatView key={treeId} treeId={treeId} />;
}

function ChatView({ treeId }: { treeId: string }) {
  const client = useQueryClient();
  const context = useQuery({
    queryKey: ["chat-context", treeId],
    queryFn: () => getChatContext(treeId),
    enabled: Boolean(treeId),
  });
  const refreshContext = useCallback(
    () => void client.invalidateQueries({ queryKey: ["chat-context", treeId] }),
    [client, treeId],
  );
  const chat = useChat(treeId, refreshContext);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [chat.messages]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [draft]);

  if (context.isLoading)
    return (
      <main className={routeStateClass}>
        <LoaderCircle className="animate-spin text-focus" size={32} />
        <p>Đang mở trợ lý gia phả…</p>
      </main>
    );
  if (context.isError || !context.data)
    return (
      <main className={routeStateClass}>
        <h1>Không thể mở trợ lý</h1>
        <p>Gia phả không tồn tại hoặc bạn không có quyền xem.</p>
        <button
          className={secondaryButtonClass}
          onClick={() => context.refetch()}
        >
          Thử lại
        </button>
        <Link to="/trees">Về danh sách</Link>
      </main>
    );

  const info = context.data;
  const outOfQuota = info.limits.remainingToday <= 0;
  const canAsk = info.available && !outOfQuota && !chat.streaming;
  const ask = (question: string) => {
    if (!canAsk || !question.trim()) return;
    stickToBottom.current = true;
    setDraft("");
    void chat.send(question);
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Bộ gõ tiếng Việt đang ghép chữ thì Enter không phải là gửi.
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      ask(draft);
    }
  };
  const nearLimit = draft.length > info.limits.questionMaxLength * 0.8;

  return (
    <main className="grid h-[calc(100dvh-4rem)] grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] bg-surface-page text-ink">
      <PageBreadcrumbBar
        sticky={false}
        breadcrumbClassName="overflow-hidden"
        items={[
          { label: "Trang chủ", to: "/" },
          { label: "Danh sách gia phả", to: "/trees" },
          { label: info.treeName, to: `/trees/${treeId}/tree` },
          { label: "Hỏi đáp AI" },
        ]}
      >
        {chat.messages.length > 0 && (
          <button
            type="button"
            className={compactSecondaryButtonClass}
            onClick={chat.reset}
          >
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Cuộc trò chuyện mới</span>
          </button>
        )}
      </PageBreadcrumbBar>

      <div
        ref={listRef}
        className="min-h-0 overflow-y-auto"
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-6">
          {chat.messages.length === 0 ? (
            <EmptyState
              info={info}
              treeId={treeId}
              onPick={ask}
              disabled={!canAsk}
            />
          ) : (
            chat.messages.map((message) =>
              message.role === "user" ? (
                <UserBubble key={message.id} text={message.text} />
              ) : (
                <AssistantBubble
                  key={message.id}
                  message={message}
                  onRetry={canAsk ? () => chat.retry(message.id) : undefined}
                />
              ),
            )
          )}
        </div>
      </div>

      <footer className="border-t border-border-default bg-surface-soft">
        <form
          className="mx-auto grid w-full max-w-3xl gap-1.5 px-4 py-3"
          onSubmit={onSubmit}
        >
          {!info.available && (
            <Notice tone="warning">
              Trợ lý AI chưa được bật trên máy chủ. Quản trị viên cần cấu hình
              <code className="mx-1 rounded bg-[#f3e7cf] px-1">
                GEMINI_API_KEY
              </code>
              cho backend.
            </Notice>
          )}
          {info.available && outOfQuota && (
            <Notice tone="warning">
              Bạn đã dùng hết {info.limits.dailyQuestions} câu hỏi hôm nay. Hẹn
              bạn ngày mai nhé.
            </Notice>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-border-control bg-surface p-1.5 focus-within:border-focus">
            <label htmlFor="chat-question" className="sr-only">
              Câu hỏi cho trợ lý gia phả
            </label>
            <textarea
              id="chat-question"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={info.limits.questionMaxLength}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={!info.available || outOfQuota}
              placeholder="Đặt câu hỏi về gia phả…"
              className="max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-ink outline-none placeholder:text-ink-subtle disabled:cursor-not-allowed"
            />
            {chat.streaming ? (
              <button
                type="button"
                onClick={chat.stop}
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-outline bg-surface text-ink-soft hover:bg-surface-hover"
                aria-label="Dừng trả lời"
                title="Dừng trả lời"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canAsk || !draft.trim()}
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-accent bg-accent text-[#182b27] hover:not-disabled:bg-[#e6bd77] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Gửi câu hỏi"
                title="Gửi (Enter)"
              >
                <SendHorizontal size={18} />
              </button>
            )}
          </div>
          <p className="m-0 flex flex-wrap justify-between gap-x-3 px-1 text-xs text-ink-muted">
            <span>
              Trả lời dựa trên dữ liệu trong gia phả và có thể sai. Hãy kiểm tra
              lại trên hồ sơ.
            </span>
            <span className={nearLimit ? "font-bold text-accent-deep" : ""}>
              {nearLimit
                ? `${draft.length}/${info.limits.questionMaxLength} ký tự`
                : `Còn ${info.limits.remainingToday}/${info.limits.dailyQuestions} câu hôm nay`}
            </span>
          </p>
        </form>
      </footer>
    </main>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "warning" | "info";
  children: ReactNode;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${tone === "warning" ? "border-[#e2c58f] bg-[#fdf6e8] text-[#6d4c17]" : "border-[#c4d6cd] bg-[#f1f7f4] text-ink-soft"}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function EmptyState({
  info,
  treeId,
  onPick,
  disabled,
}: {
  info: ChatContextResponse;
  treeId: string;
  onPick: (question: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="grid justify-items-center gap-4 py-6 text-center sm:py-12">
      <span className="grid size-14 place-items-center rounded-full bg-[#f6ead3] text-accent-deep">
        <Sparkles size={26} />
      </span>
      <div className="grid gap-1.5">
        <h1 className="m-0 font-display text-2xl font-semibold text-ink">
          Hỏi đáp về gia phả
        </h1>
        <p className="m-0 max-w-xl text-ink-muted">
          Trợ lý trả lời bằng dữ liệu thật của {info.treeName}: ai là ai, xưng
          hô thế nào, ai sống thọ nhất, ai từng làm nghề gì…
        </p>
      </div>
      {info.me ? (
        <p className="m-0 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-ink-soft">
          <UserRound size={15} /> Bạn đang hỏi với tư cách{" "}
          <Link
            to={`/trees/${treeId}/persons/${info.me.personId}`}
            className="font-bold text-ink"
          >
            {info.me.name}
          </Link>
        </p>
      ) : (
        <div className="max-w-xl text-left">
          <Notice tone="info">
            Tài khoản của bạn chưa gắn với hồ sơ nào trong gia phả này, nên trợ
            lý chưa hiểu “tôi” là ai. Bạn vẫn hỏi được về người khác bằng tên.
            Nhờ trưởng họ gửi lời mời có chọn hồ sơ của bạn để gắn.
          </Notice>
        </div>
      )}
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {info.suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion)}
            className="cursor-pointer rounded-xl border border-border-default bg-surface px-4 py-3 text-left text-sm text-ink-soft transition-colors hover:not-disabled:border-focus hover:not-disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="m-0 max-w-[85%] rounded-2xl rounded-br-md bg-ink-strong px-4 py-2.5 whitespace-pre-wrap text-white">
        {text}
      </p>
    </div>
  );
}

function AssistantBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: () => void;
}) {
  const waiting = message.status === "streaming" && !message.text;
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#f6ead3] text-accent-deep"
        aria-hidden
      >
        <Sparkles size={16} />
      </span>
      <div
        className={`grid max-w-[calc(100%-2.75rem)] min-w-0 gap-2.5 rounded-2xl rounded-tl-md border px-4 py-3 ${message.status === "error" ? "border-[#e5b5ad] bg-[#fff8f6] text-[#8a3328]" : "border-border-default bg-surface"}`}
        aria-busy={message.status === "streaming"}
      >
        {waiting ? (
          <p
            className="m-0 inline-flex items-center gap-2 text-sm text-ink-muted"
            aria-live="polite"
          >
            <LoaderCircle size={15} className="animate-spin" />
            {message.toolLabel ?? "Đang suy nghĩ…"}
          </p>
        ) : message.status === "error" ? (
          <p className="m-0 inline-flex items-start gap-2">
            <TriangleAlert size={16} className="mt-1 shrink-0" />
            {message.text}
          </p>
        ) : (
          message.text && <ChatMarkdown text={message.text} />
        )}
        {message.status === "stopped" && (
          <p className="m-0 text-sm text-ink-muted italic">Đã dừng trả lời.</p>
        )}
        {message.status === "done" &&
          message.persons &&
          message.persons.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-[#e4ebe7] pt-2.5">
              <span className="text-xs font-bold text-ink-label">
                Hồ sơ liên quan:
              </span>
              {message.persons.map((person) => (
                <Link
                  key={person.personId}
                  to={person.link}
                  className="inline-flex items-center gap-1 rounded-full border border-border-default bg-surface-soft px-2.5 py-1 text-xs font-semibold text-ink-soft no-underline hover:border-focus hover:bg-surface-hover"
                >
                  <UserRound size={12} /> {person.name}
                </Link>
              ))}
            </div>
          )}
        {(message.status === "error" || message.status === "stopped") &&
          onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`${compactSecondaryButtonClass} w-fit`}
            >
              <RotateCcw size={14} /> Hỏi lại
            </button>
          )}
      </div>
    </div>
  );
}
