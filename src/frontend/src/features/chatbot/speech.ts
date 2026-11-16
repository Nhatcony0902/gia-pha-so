/**
 * Đọc câu trả lời của chatbot thành tiếng bằng Web Speech API (LMS-020, ADR-0006).
 * Phần xử lý văn bản và bộ đọc tách khỏi React và `window` để test được bằng node.
 */

/** Độ dài tối đa một lần đọc. Chrome hay tự ngắt khi một utterance quá dài. */
export const MAX_UTTERANCE_LENGTH = 180;

const TERMINAL = /[.!?…:;]$/;

/** Chuyển markdown của câu trả lời thành văn bản để đọc: bỏ ký hiệu, link, đọc năm và ngày tự nhiên. */
export function speechText(markdown: string): string {
  const lines = markdown
    .split(/\r?\n/)
    .map((raw) =>
      raw
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/^\s*>\s?/, "")
        .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
        .trim(),
    )
    .filter(Boolean)
    .map((line) => readInline(line))
    .filter(Boolean)
    // mỗi dòng (mục danh sách) là một câu, để giọng đọc ngắt nghỉ
    .map((line) => (TERMINAL.test(line) ? line : `${line}.`));
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function readInline(line: string): string {
  return (
    line
      .replace(/\[([^\]\n]+)\]\([^)\s]*\)/g, "$1")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/__([^_\n]+)__/g, "$1")
      .replace(/`([^`\n]+)`/g, "$1")
      // 12/03/1950 → ngày 12 tháng 3 năm 1950 (không lặp nếu đã có chữ "ngày")
      .replace(
        /(?:ngày\s+)?\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/gi,
        (_, d: string, m: string, y: string) =>
          `ngày ${Number(d)} tháng ${Number(m)} năm ${y}`,
      )
      // 1905 – 1988, 1950 - nay → 1905 đến 1988
      .replace(/\b(\d{3,4})\s*[–—-]\s*(\d{3,4}|nay)\b/g, "$1 đến $2")
      // gạch ngang đứng riêng là chỗ ngắt
      .replace(/\s+[–—-]\s+/g, ", ")
      .replace(/[*_#|`~]/g, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+([,.!?;:])/g, "$1")
      .trim()
  );
}

/** Cắt văn bản thành các đoạn ≤ maxLength, ưu tiên cắt ở cuối câu rồi tới dấu phẩy, cuối cùng mới tới khoảng trắng. */
export function splitSentences(
  text: string,
  maxLength = MAX_UTTERANCE_LENGTH,
): string[] {
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.flatMap((sentence) =>
    sentence.length <= maxLength
      ? [sentence]
      : packPieces(sentence.split(/(?<=[,;:])\s+/), maxLength),
  );
}

function packPieces(pieces: string[], maxLength: number): string[] {
  const chunks: string[] = [];
  let current = "";
  const push = (piece: string) => {
    const next = current ? `${current} ${piece}` : piece;
    if (next.length <= maxLength) current = next;
    else {
      if (current) chunks.push(current);
      current = piece;
    }
  };
  for (const piece of pieces) {
    if (piece.length <= maxLength) push(piece);
    else piece.split(/\s+/).forEach(push);
  }
  if (current) chunks.push(current);
  return chunks;
}

export type VoiceLike = {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
};

/** Chọn giọng tiếng Việt tốt nhất: ưu tiên giọng "Natural"/"Online" (Edge), rồi giọng Google. */
export function pickVietnameseVoice<V extends VoiceLike>(
  voices: readonly V[],
): V | undefined {
  const score = (voice: V) =>
    (/natural/i.test(voice.name) ? 4 : 0) +
    (/online/i.test(voice.name) ? 2 : 0) +
    (/google/i.test(voice.name) ? 1 : 0) +
    (voice.lang.toLowerCase().replace("_", "-") === "vi-vn" ? 1 : 0);
  return voices
    .filter((voice) => /^vi\b/i.test(voice.lang.replace("_", "-")))
    .sort((a, b) => score(b) - score(a))[0];
}

export type UtteranceLike = {
  text: string;
  lang: string;
  voice: VoiceLike | null;
  rate: number;
  volume: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

export type SynthLike = {
  speak(utterance: UtteranceLike): void;
  cancel(): void;
};

/**
 * Đọc lần lượt từng đoạn (đọc xong đoạn này mới đưa đoạn sau). Đưa cả hàng đợi một lúc thì
 * Chrome có thể mất `onend` khi utterance bị thu gom rác, và `cancel()` khó dọn sạch.
 */
export class Speaker {
  private session = 0;
  /** Giữ tham chiếu để utterance đang đọc không bị thu gom rác (lỗi của Chrome). */
  private current: UtteranceLike | null = null;

  constructor(
    private readonly synth: SynthLike,
    private readonly createUtterance: (text: string) => UtteranceLike,
  ) {}

  /** Đọc một câu trả lời. Trả về false nếu không có gì để đọc. */
  speak(
    markdown: string,
    options: { voice?: VoiceLike; rate?: number; onEnd?: () => void } = {},
  ): boolean {
    this.stop();
    const chunks = splitSentences(speechText(markdown));
    if (!chunks.length) return false;
    const session = ++this.session;
    const finish = () => {
      if (session !== this.session) return;
      this.session++;
      this.current = null;
      options.onEnd?.();
    };
    const next = (index: number) => {
      if (session !== this.session) return;
      if (index >= chunks.length) return finish();
      const utterance = this.createUtterance(chunks[index]!);
      utterance.lang = options.voice?.lang ?? "vi-VN";
      if (options.voice) utterance.voice = options.voice;
      utterance.rate = options.rate ?? 1;
      utterance.onend = () => next(index + 1);
      utterance.onerror = () => {
        if (session !== this.session) return; // bị dừng chủ động
        this.synth.cancel();
        finish();
      };
      this.current = utterance;
      this.synth.speak(utterance);
    };
    next(0);
    return true;
  }

  stop() {
    this.session++;
    this.current = null;
    this.synth.cancel();
  }

  /**
   * Safari iOS chỉ cho đọc khi có thao tác của người dùng. Gọi trong lúc bấm gửi
   * để lần tự đọc sau khi stream xong không bị chặn.
   */
  prime() {
    const utterance = this.createUtterance("");
    utterance.volume = 0;
    this.synth.speak(utterance);
  }
}
