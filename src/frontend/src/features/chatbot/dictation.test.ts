import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  Dictation,
  MAX_LISTEN_MS,
  SILENCE_MS,
  dictationErrorMessage,
  hasUnsureResult,
  mergeDictation,
  recognitionFactory,
  transcriptOf,
  type DictationOutcome,
  type RecognitionLike,
  type RecognitionResultLike,
} from "./dictation";

const result = (
  transcript: string,
  isFinal = false,
  confidence = 0,
): RecognitionResultLike =>
  Object.assign([{ transcript, confidence }], { isFinal });

/** SpeechRecognition giả: ghi lại thao tác, test tự bắn sự kiện. */
class FakeRecognition implements RecognitionLike {
  lang = "";
  continuous = true;
  interimResults = false;
  maxAlternatives = 0;
  onresult: RecognitionLike["onresult"] = null;
  onerror: RecognitionLike["onerror"] = null;
  onend: RecognitionLike["onend"] = null;
  calls: string[] = [];
  failOnStart = false;
  start() {
    this.calls.push("start");
    if (this.failOnStart) throw new Error("InvalidStateError");
  }
  stop() {
    this.calls.push("stop");
  }
  abort() {
    this.calls.push("abort");
  }
  say(...results: RecognitionResultLike[]) {
    this.onresult?.({ results });
  }
}

function setup() {
  const created: FakeRecognition[] = [];
  const dictation = new Dictation(() => {
    const recognition = new FakeRecognition();
    created.push(recognition);
    return recognition;
  });
  const texts: string[] = [];
  const outcomes: DictationOutcome[] = [];
  const ends: Array<string | null> = [];
  const handlers = {
    onText: (text: string) => texts.push(text),
    onEnd: (outcome: DictationOutcome) => {
      outcomes.push(outcome);
      ends.push(outcome.error);
    },
  };
  return { dictation, created, texts, ends, outcomes, handlers };
}

describe("recognitionFactory", () => {
  it("dùng SpeechRecognition hoặc bản có tiền tố webkit", () => {
    class Recognition {}
    assert.ok(recognitionFactory({ SpeechRecognition: Recognition as never }));
    assert.ok(
      recognitionFactory({ webkitSpeechRecognition: Recognition as never }),
    );
  });

  it("Firefox (không có API) thì trả null để ẩn nút micro", () => {
    assert.equal(recognitionFactory({}), null);
    assert.equal(recognitionFactory(undefined), null);
  });
});

describe("ghép chữ nhận dạng", () => {
  it("nối các đoạn, bỏ khoảng trắng thừa", () => {
    assert.equal(
      transcriptOf([result("ông nội tôi "), result(" là ai", true)]),
      "ông nội tôi là ai",
    );
  });

  it("Chrome Android lặp lại câu trước ở đầu đoạn sau thì chỉ giữ bản dài hơn", () => {
    assert.equal(
      transcriptOf([
        result("ông nội", true),
        result("ông nội tôi là ai", true),
      ]),
      "ông nội tôi là ai",
    );
    assert.equal(
      transcriptOf([result("ông nội", true), result("tôi là ai")]),
      "ông nội tôi là ai",
    );
  });

  it("đoạn đã chốt có độ tin cậy thấp là không chắc; 0 là trình duyệt không chấm", () => {
    assert.equal(hasUnsureResult([result("lê đình khang", true, 0.4)]), true);
    assert.equal(hasUnsureResult([result("lê đình khang", true, 0.9)]), false);
    assert.equal(hasUnsureResult([result("lê đình khang", true, 0)]), false);
    assert.equal(hasUnsureResult([result("lê đình", false, 0.2)]), false);
  });

  it("câu mới thì viết hoa chữ đầu, nối tiếp chữ đã gõ thì giữ nguyên", () => {
    assert.equal(mergeDictation("", "ông nội tôi là ai"), "Ông nội tôi là ai");
    assert.equal(
      mergeDictation("Cho mình hỏi", "ông nội tôi là ai"),
      "Cho mình hỏi ông nội tôi là ai",
    );
    assert.equal(
      mergeDictation("Chào bạn. ", "ông nội tôi là ai"),
      "Chào bạn. Ông nội tôi là ai",
    );
    assert.equal(mergeDictation("Cho mình hỏi  ", ""), "Cho mình hỏi");
  });

  it("không vượt độ dài tối đa của câu hỏi", () => {
    assert.equal(mergeDictation("abc", "đây là câu dài", 8), "abc đây ");
  });
});

describe("lời nhắn lỗi", () => {
  it("người dùng hủy thì không báo gì", () => {
    assert.equal(dictationErrorMessage("aborted"), null);
  });

  it("chặn quyền micro thì hướng dẫn cho phép", () => {
    assert.match(dictationErrorMessage("not-allowed")!, /Cho phép ở mục Micro/);
  });

  it("lỗi lạ vẫn có lời nhắn chung", () => {
    assert.match(dictationErrorMessage("bad-grammar")!, /gõ câu hỏi/);
  });
});

describe("Dictation", () => {
  it("nghe tiếng Việt, hiện chữ tạm ngay khi đang nói, nối vào chữ đã gõ", () => {
    const { dictation, created, texts, ends, handlers } = setup();
    assert.equal(dictation.start("Cho mình hỏi", handlers), true);
    const recognition = created[0]!;
    assert.equal(recognition.lang, "vi-VN");
    assert.equal(recognition.interimResults, true);
    assert.equal(recognition.continuous, true);
    assert.equal(dictation.listening, true);

    recognition.say(result("ông nội"));
    recognition.say(result("ông nội tôi là ai", true));
    recognition.onend?.();

    assert.deepEqual(texts, [
      "Cho mình hỏi ông nội",
      "Cho mình hỏi ông nội tôi là ai",
    ]);
    assert.deepEqual(ends, [null]);
    assert.equal(dictation.listening, false);
  });

  it("ngừng giữa câu không bị cắt: chỉ tự dừng sau quãng im lặng dài", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const { dictation, created, handlers } = setup();
      dictation.start("", handlers);
      const recognition = created[0]!;
      recognition.say(result("ông nội"));
      mock.timers.tick(SILENCE_MS - 100);
      recognition.say(result("ông nội tôi là ai"));
      mock.timers.tick(SILENCE_MS - 100);
      assert.deepEqual(recognition.calls, ["start"]);
      mock.timers.tick(100);
      assert.deepEqual(recognition.calls, ["start", "stop"]);
    } finally {
      mock.timers.reset();
    }
  });

  it("nói mãi không ngừng thì dừng ở trần thời gian", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const { dictation, created, handlers } = setup();
      dictation.start("", handlers);
      const recognition = created[0]!;
      for (let t = 0; t < MAX_LISTEN_MS; t += 1_000) {
        recognition.say(result(`câu ${t}`));
        mock.timers.tick(1_000);
      }
      assert.deepEqual(recognition.calls, ["start", "stop"]);
    } finally {
      mock.timers.reset();
    }
  });

  it("báo nghe được chữ và có đoạn không chắc khi kết thúc", () => {
    const { dictation, created, outcomes, handlers } = setup();
    dictation.start("", handlers);
    created[0]!.say(result("lê đình khang", true, 0.42));
    created[0]!.onend?.();
    assert.deepEqual(outcomes, [{ error: null, heard: true, unsure: true }]);
  });

  it("hủy thì xóa hẹn giờ, không gọi stop về sau", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const { dictation, created, handlers } = setup();
      dictation.start("", handlers);
      created[0]!.say(result("ông"));
      dictation.cancel();
      mock.timers.tick(MAX_LISTEN_MS);
      assert.deepEqual(created[0]!.calls, ["start", "abort"]);
    } finally {
      mock.timers.reset();
    }
  });

  it("lỗi trong lúc nghe thì báo khi kết thúc", () => {
    const { dictation, created, ends, handlers } = setup();
    dictation.start("", handlers);
    created[0]!.onerror?.({ error: "no-speech" });
    created[0]!.onend?.();
    assert.match(ends[0]!, /chưa nghe thấy/);
  });

  it("dừng thì vẫn nhận kết quả cuối", () => {
    const { dictation, created, texts, handlers } = setup();
    dictation.start("", handlers);
    dictation.stop();
    created[0]!.say(result("ai sống thọ nhất", true));
    created[0]!.onend?.();
    assert.deepEqual(created[0]!.calls, ["start", "stop"]);
    assert.deepEqual(texts, ["Ai sống thọ nhất"]);
  });

  it("hủy (đã gửi câu hỏi) thì bỏ mọi kết quả về sau, không báo kết thúc", () => {
    const { dictation, created, texts, ends, handlers } = setup();
    dictation.start("", handlers);
    dictation.cancel();
    created[0]!.say(result("muộn", true));
    created[0]!.onerror?.({ error: "aborted" });
    created[0]!.onend?.();
    assert.deepEqual(created[0]!.calls, ["start", "abort"]);
    assert.deepEqual(texts, []);
    assert.deepEqual(ends, []);
    assert.equal(dictation.listening, false);
  });

  it("bắt đầu lượt mới thì hủy lượt cũ, chỉ lượt mới cập nhật ô câu hỏi", () => {
    const { dictation, created, texts, handlers } = setup();
    dictation.start("", handlers);
    dictation.start("", handlers);
    created[0]!.say(result("cũ"));
    created[1]!.say(result("mới"));
    assert.deepEqual(created[0]!.calls, ["start", "abort"]);
    assert.deepEqual(texts, ["Mới"]);
  });

  it("trình duyệt không cho bắt đầu thì báo lỗi, không kẹt trạng thái đang nghe", () => {
    const ends: Array<string | null> = [];
    const dictation = new Dictation(() =>
      Object.assign(new FakeRecognition(), { failOnStart: true }),
    );
    const started = dictation.start("", {
      onText: () => {},
      onEnd: (outcome) => ends.push(outcome.error),
    });
    assert.equal(started, false);
    assert.equal(dictation.listening, false);
    assert.equal(ends.length, 1);
    assert.ok(ends[0]);
  });
});
