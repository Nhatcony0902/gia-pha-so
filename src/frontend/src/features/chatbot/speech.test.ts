import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_UTTERANCE_LENGTH,
  Speaker,
  pickVietnameseVoice,
  speechText,
  splitSentences,
  type UtteranceLike,
} from "./speech";

describe("speechText", () => {
  it("đọc tên trong link hồ sơ, bỏ đường dẫn và chữ đậm", () => {
    assert.equal(
      speechText(
        "Ông nội của bạn là cụ **[Lê Đình Khang](/trees/t1/persons/p1)**.",
      ),
      "Ông nội của bạn là cụ Lê Đình Khang.",
    );
  });

  it("đọc khoảng năm và ngày tháng tự nhiên", () => {
    assert.equal(
      speechText("Cụ Khang (1905 – 1988), mất ngày 05/03/1988."),
      "Cụ Khang (1905 đến 1988), mất ngày 5 tháng 3 năm 1988.",
    );
    assert.equal(
      speechText("Sinh 12/11/1950"),
      "Sinh ngày 12 tháng 11 năm 1950.",
    );
    assert.equal(speechText("Bác Phúc (1950-nay)"), "Bác Phúc (1950 đến nay).");
  });

  it("mỗi mục danh sách thành một câu, bỏ ký hiệu đầu dòng và tiêu đề", () => {
    assert.equal(
      speechText(
        "## Các con của bạn\n\n- [Lê Đình An](/trees/t/persons/a) – con trưởng\n- Lê Thị Bình\n1. Lê Đình Cường",
      ),
      "Các con của bạn. Lê Đình An, con trưởng. Lê Thị Bình. Lê Đình Cường.",
    );
  });

  it("không để sót ký tự markdown", () => {
    const text = speechText("> `find_person` trả về *__không có__* ai | ~");
    assert.doesNotMatch(text, /[*_#|`~>]/);
  });

  it("câu trả lời rỗng thì không có gì để đọc", () => {
    assert.equal(speechText("  \n\n - \n"), "");
  });
});

describe("splitSentences", () => {
  it("cắt theo câu", () => {
    assert.deepEqual(splitSentences("Câu một. Câu hai! Câu ba? Hết…"), [
      "Câu một.",
      "Câu hai!",
      "Câu ba?",
      "Hết…",
    ]);
  });

  it("câu quá dài thì cắt ở dấu phẩy rồi tới khoảng trắng, không đoạn nào vượt giới hạn", () => {
    const long = `${Array.from({ length: 30 }, (_, i) => `người thứ ${i + 1}`).join(", ")}.`;
    const chunks = splitSentences(long);
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((c) => c.length <= MAX_UTTERANCE_LENGTH));
    assert.equal(chunks.join(" "), long);

    const noComma = "chữ ".repeat(100).trim();
    const pieces = splitSentences(noComma, 50);
    assert.ok(pieces.every((c) => c.length <= 50));
    assert.equal(pieces.join(" "), noComma);
  });
});

describe("pickVietnameseVoice", () => {
  const voices = [
    { name: "Microsoft David", lang: "en-US" },
    { name: "Microsoft An", lang: "vi-VN" },
    { name: "Microsoft HoaiMy Online (Natural) - Vietnamese", lang: "vi-VN" },
    { name: "Google Tiếng Việt", lang: "vi-VN" },
  ];

  it("ưu tiên giọng Natural/Online", () => {
    assert.equal(pickVietnameseVoice(voices)?.name, voices[2]!.name);
  });

  it("nhận cả mã ngôn ngữ dạng vi_VN và vi", () => {
    assert.equal(
      pickVietnameseVoice([{ name: "Linh", lang: "vi_VN" }])?.name,
      "Linh",
    );
    assert.equal(pickVietnameseVoice([{ name: "X", lang: "vi" }])?.name, "X");
  });

  it("không có giọng tiếng Việt thì trả undefined", () => {
    assert.equal(pickVietnameseVoice([voices[0]!]), undefined);
    assert.equal(pickVietnameseVoice([]), undefined);
  });
});

function fakeSynth() {
  const spoken: UtteranceLike[] = [];
  let cancelled = 0;
  const synth = {
    speak: (u: UtteranceLike) => spoken.push(u),
    cancel: () => {
      cancelled++;
    },
  };
  const create = (text: string): UtteranceLike => ({
    text,
    lang: "",
    voice: null,
    rate: 1,
    volume: 1,
    onend: null,
    onerror: null,
  });
  return {
    speaker: new Speaker(synth, create),
    spoken,
    cancelled: () => cancelled,
  };
}

describe("Speaker", () => {
  it("đọc lần lượt từng câu, đọc xong mới báo kết thúc", () => {
    const { speaker, spoken } = fakeSynth();
    let ended = 0;
    const voice = { name: "HoaiMy", lang: "vi-VN" };
    assert.equal(
      speaker.speak("Câu một. Câu hai.", { voice, onEnd: () => ended++ }),
      true,
    );
    assert.equal(spoken.length, 1);
    assert.equal(spoken[0]!.text, "Câu một.");
    assert.equal(spoken[0]!.voice, voice);
    assert.equal(spoken[0]!.lang, "vi-VN");
    spoken[0]!.onend?.();
    assert.equal(spoken.length, 2);
    assert.equal(ended, 0);
    spoken[1]!.onend?.();
    assert.equal(ended, 1);
  });

  it("không có giọng thì vẫn đặt lang vi-VN để trình duyệt tự chọn", () => {
    const { speaker, spoken } = fakeSynth();
    speaker.speak("Xin chào.");
    assert.equal(spoken[0]!.lang, "vi-VN");
    assert.equal(spoken[0]!.voice, null);
  });

  it("dừng giữa chừng thì không đọc tiếp và không báo kết thúc", () => {
    const { speaker, spoken, cancelled } = fakeSynth();
    let ended = 0;
    speaker.speak("Một. Hai.", { onEnd: () => ended++ });
    speaker.stop();
    assert.ok(cancelled() >= 1);
    spoken[0]!.onerror?.(); // trình duyệt báo "interrupted" sau cancel
    spoken[0]!.onend?.();
    assert.equal(spoken.length, 1);
    assert.equal(ended, 0);
  });

  it("đọc câu trả lời mới thì bỏ câu đang đọc", () => {
    const { speaker, spoken } = fakeSynth();
    let firstEnded = 0;
    speaker.speak("Cũ một. Cũ hai.", { onEnd: () => firstEnded++ });
    speaker.speak("Mới.");
    spoken[0]!.onend?.(); // callback trễ của câu cũ
    assert.deepEqual(
      spoken.map((u) => u.text),
      ["Cũ một.", "Mới."],
    );
    assert.equal(firstEnded, 0);
  });

  it("lỗi khi đọc thì dừng hẳn và báo kết thúc", () => {
    const { speaker, spoken } = fakeSynth();
    let ended = 0;
    speaker.speak("Một. Hai.", { onEnd: () => ended++ });
    spoken[0]!.onerror?.();
    assert.equal(ended, 1);
    assert.equal(spoken.length, 1);
  });

  it("không có chữ để đọc thì trả false", () => {
    const { speaker, spoken } = fakeSynth();
    assert.equal(speaker.speak("  "), false);
    assert.equal(spoken.length, 0);
  });
});
