/**
 * Hỏi bằng giọng nói: đọc chính tả vào ô câu hỏi bằng Web Speech API (LMS-021, ADR-0007).
 * Phần xử lý tách khỏi React và `window` để test được bằng node.
 *
 * TypeScript chưa có kiểu cho SpeechRecognition nên khai báo phần cần dùng ở đây.
 */

/**
 * Cách nghe theo P-147 (GlucoCare, plan 260930-scope-guard-and-voice): người lớn tuổi hay ngừng giữa câu,
 * nên nghe liên tục và chỉ tự dừng sau một quãng im lặng dài, hoặc khi chạm trần thời gian.
 */
export const SILENCE_MS = 2_500;
export const MAX_LISTEN_MS = 30_000;
/**
 * Kết quả chốt có độ tin cậy dưới mức này hay là tên người nghe sai. Chrome trả 0 khi không có điểm,
 * nên 0 coi là không biết chứ không phải không chắc.
 */
export const UNSURE_CONFIDENCE = 0.6;

type TranscriptLike = { transcript: string; confidence?: number };

/** Một kết quả nhận dạng: `[0]` là phương án tốt nhất. */
export type RecognitionResultLike = ArrayLike<TranscriptLike> & {
  isFinal: boolean;
};

export type RecognitionResultEventLike = {
  results: ArrayLike<RecognitionResultLike>;
};

export type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export type RecognitionFactory = () => RecognitionLike;

type SpeechWindow = {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
};

/** Chrome, Edge, Safari có SpeechRecognition (Chrome, Safari còn dùng tiền tố webkit). Firefox thì không. */
export function recognitionFactory(
  win: SpeechWindow | undefined = globalThis.window as SpeechWindow | undefined,
): RecognitionFactory | null {
  const Recognition = win?.SpeechRecognition ?? win?.webkitSpeechRecognition;
  return Recognition ? () => new Recognition() : null;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Ghép mọi đoạn đã nhận dạng (cả đoạn chưa chốt) thành một câu. Chrome Android khi nghe liên tục
 * hay trả lại cả câu trước ở đầu đoạn sau ("ông nội" rồi "ông nội tôi là ai"): giữ bản dài hơn.
 */
export function transcriptOf(results: ArrayLike<RecognitionResultLike>) {
  const parts: string[] = [];
  for (const result of Array.from(results)) {
    const text = clean(result[0]?.transcript ?? "");
    if (!text) continue;
    const previous = parts.at(-1);
    if (previous && text.toLowerCase().startsWith(previous.toLowerCase()))
      parts[parts.length - 1] = text;
    else parts.push(text);
  }
  return parts.join(" ");
}

/** Có đoạn đã chốt mà trình duyệt không chắc (hay là tên người nghe sai). */
export function hasUnsureResult(results: ArrayLike<RecognitionResultLike>) {
  return Array.from(results).some((result) => {
    const confidence = result[0]?.confidence ?? 0;
    return result.isFinal && confidence > 0 && confidence < UNSURE_CONFIDENCE;
  });
}

/**
 * Nối câu vừa nói vào chữ đã gõ sẵn trong ô. Bắt đầu câu mới thì viết hoa chữ đầu
 * (trình duyệt thường trả chữ thường, không dấu câu).
 */
export function mergeDictation(
  base: string,
  spoken: string,
  maxLength?: number,
) {
  const head = base.trimEnd();
  let text = spoken.trim();
  if (text && (!head || /[.!?…]$/.test(head)))
    text = text.charAt(0).toLocaleUpperCase("vi-VN") + text.slice(1);
  const merged = !text ? head : head ? `${head} ${text}` : text;
  return maxLength === undefined ? merged : merged.slice(0, maxLength);
}

/** Lỗi của SpeechRecognition (`event.error`) thành lời nhắn cho người dùng. `null`: không cần báo. */
export function dictationErrorMessage(error: string): string | null {
  switch (error) {
    case "aborted":
      return null;
    case "no-speech":
      return "Mình chưa nghe thấy gì. Bạn đưa máy sát miệng hơn rồi bấm micro nói lại nhé.";
    case "not-allowed":
      // Biểu tượng bên trái địa chỉ trang mỗi nơi một khác: chữ i (http://localhost), ổ khóa (Edge),
      // hai thanh trượt (Chrome mới, https).
      return "Trình duyệt đang chặn micro. Bấm biểu tượng bên trái địa chỉ trang (chữ i, ổ khóa hoặc hai thanh trượt), chọn Cho phép ở mục Micro, tải lại trang rồi bấm micro. Bạn vẫn gõ câu hỏi được.";
    case "service-not-allowed":
      return "Máy này chưa bật nhận dạng giọng nói (iPhone: bật Siri hoặc Đọc chính tả trong Cài đặt). Bạn gõ câu hỏi nhé.";
    case "audio-capture":
      return "Không tìm thấy micro. Bạn kiểm tra micro rồi thử lại.";
    case "network":
      return "Nhận dạng giọng nói cần kết nối mạng. Bạn kiểm tra mạng rồi thử lại.";
    case "language-not-supported":
    case "language-unavailable":
      return "Trình duyệt này chưa nhận dạng được tiếng Việt. Bạn thử Chrome hoặc Edge nhé.";
    default:
      return "Không nhận dạng được giọng nói. Bạn thử lại hoặc gõ câu hỏi nhé.";
  }
}

export type DictationOutcome = {
  /** Lời nhắn khi có lỗi cần báo. */
  error: string | null;
  /** Đã nghe được chữ nào chưa. */
  heard: boolean;
  /** Có đoạn trình duyệt không chắc: nhắc người dùng đọc lại trước khi gửi. */
  unsure: boolean;
};

export type DictationHandlers = {
  /** Nội dung ô câu hỏi sau mỗi lần nhận dạng (chữ cũ + câu đang nói). */
  onText: (text: string) => void;
  /** Kết thúc lượt nghe (không gọi khi bị hủy). */
  onEnd: (outcome: DictationOutcome) => void;
};

export type DictationTiming = { silenceMs: number; maxListenMs: number };

/**
 * Một lượt nghe tại một thời điểm. Nghe liên tục (`continuous`) để người nói ngừng giữa câu không bị cắt;
 * tự dừng sau `silenceMs` không có chữ mới, hoặc sau `maxListenMs`.
 */
export class Dictation {
  private active: RecognitionLike | null = null;
  private clearTimers: () => void = () => {};

  constructor(
    private readonly create: RecognitionFactory,
    private readonly timing: DictationTiming = {
      silenceMs: SILENCE_MS,
      maxListenMs: MAX_LISTEN_MS,
    },
  ) {}

  get listening() {
    return this.active !== null;
  }

  start(
    base: string,
    handlers: DictationHandlers,
    options: { maxLength?: number } = {},
  ) {
    this.cancel();
    const recognition = this.create();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const outcome: DictationOutcome = {
      error: null,
      heard: false,
      unsure: false,
    };
    let silence: ReturnType<typeof setTimeout> | undefined;
    const cap = setTimeout(() => recognition.stop(), this.timing.maxListenMs);
    this.clearTimers = () => {
      clearTimeout(silence);
      clearTimeout(cap);
    };
    recognition.onresult = (event) => {
      if (this.active !== recognition) return;
      const heard = transcriptOf(event.results);
      if (heard) outcome.heard = true;
      outcome.unsure ||= hasUnsureResult(event.results);
      handlers.onText(mergeDictation(base, heard, options.maxLength));
      clearTimeout(silence);
      silence = setTimeout(() => recognition.stop(), this.timing.silenceMs);
    };
    recognition.onerror = (event) => {
      outcome.error = dictationErrorMessage(event.error);
    };
    recognition.onend = () => {
      // Lượt đã bị thay hoặc hủy thì không báo nữa.
      if (this.active !== recognition) return;
      this.clearTimers();
      this.active = null;
      handlers.onEnd(outcome);
    };
    this.active = recognition;
    try {
      recognition.start();
    } catch {
      this.clearTimers();
      this.active = null;
      handlers.onEnd({
        ...outcome,
        error: dictationErrorMessage("start-failed"),
      });
      return false;
    }
    return true;
  }

  /** Dừng nghe nhưng vẫn nhận phần vừa nói (kết quả cuối còn về sau khi dừng). */
  stop() {
    this.active?.stop();
  }

  /** Hủy ngay, bỏ mọi kết quả về sau (ví dụ khi đã gửi câu hỏi). */
  cancel() {
    const recognition = this.active;
    this.active = null;
    this.clearTimers();
    recognition?.abort();
  }
}
