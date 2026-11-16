import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  FunctionCall,
  GenerateContentParameters,
  GenerateContentResponse,
  Part,
} from "@google/genai";
import {
  MAX_TOOL_ROUNDS,
  NOT_ENOUGH_DATA,
  askFamilyAgent,
  sanitizeAnswer,
  systemInstruction,
  type AgentEvent,
} from "./agent.js";
import { ContentIndex, type Embedder } from "./content-search.js";
import { FamilyGraph } from "./family-graph.js";
import { containsPhrase, gradeAnswer } from "./eval/grade.js";
import { evalQuestions } from "./eval/questions.js";
import { askAs, leDinhSnapshot, pid } from "./testing/le-dinh-snapshot.js";

const graph = () => new FamilyGraph(leDinhSnapshot(), askAs("minh"));

type Turn = FunctionCall[] | string | { text: string; calls: FunctionCall[] };

/**
 * Model giả dạng stream: trả lần lượt các lượt đã soạn, ghi lại request để kiểm tra.
 * Chữ được cắt thành hai chunk, usage chỉ có ở chunk cuối như Gemini thật.
 */
function scriptedModel(turns: Turn[]) {
  const requests: GenerateContentParameters[] = [];
  let index = 0;
  const chunk = (parts: Part[], last: boolean) =>
    ({
      candidates: [{ content: { role: "model", parts } }],
      ...(last
        ? { usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 } }
        : {}),
    }) as unknown as GenerateContentResponse;
  return {
    requests,
    async generateContentStream(params: GenerateContentParameters) {
      const { abortSignal: _signal, ...config } = params.config ?? {};
      requests.push(structuredClone({ ...params, config }));
      const turn = turns[Math.min(index++, turns.length - 1)]!;
      const text =
        typeof turn === "string" ? turn : Array.isArray(turn) ? "" : turn.text;
      const calls =
        typeof turn === "string" ? [] : Array.isArray(turn) ? turn : turn.calls;
      const middle = Math.ceil(text.length / 2);
      const chunks = [
        ...(text
          ? [
              chunk([{ text: text.slice(0, middle) }], false),
              chunk([{ text: text.slice(middle) }], false),
            ]
          : []),
        chunk(
          calls.map((functionCall) => ({ functionCall })),
          true,
        ),
      ];
      return (async function* () {
        yield* chunks;
      })();
    },
  };
}

const functionResponses = (params: GenerateContentParameters) =>
  (
    params.contents as Array<{
      parts: Array<{ functionResponse?: { response: Record<string, any> } }>;
    }>
  )
    .flatMap((c) => c.parts)
    .map((p) => p.functionResponse?.response)
    .filter(Boolean) as Array<Record<string, any>>;

describe("askFamilyAgent", () => {
  it("gọi tool, đưa kết quả lại cho model rồi trả câu trả lời", async () => {
    const model = scriptedModel([
      [
        {
          id: "c1",
          name: "get_relatives",
          args: { personId: "me", relation: "parents" },
        },
      ],
      [
        {
          id: "c2",
          name: "get_relatives",
          args: { personId: pid("tho"), relation: "parents" },
        },
      ],
      "Ông nội của bạn là [Lê Đình Khang](/trees/x/persons/y).",
    ]);
    const result = await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "Ông nội tôi là ai?",
    });
    assert.match(result.answer, /Lê Đình Khang/);
    assert.equal(result.rounds, 2);
    assert.deepEqual(
      result.trace.map((t) => t.name),
      ["get_relatives", "get_relatives"],
    );
    assert.deepEqual(result.tokens, { input: 300, output: 30 });

    const last = model.requests.at(-1)!;
    const responses = functionResponses(last);
    assert.equal(responses.length, 2);
    assert.deepEqual(
      responses[1]!.output.relatives
        .map((r: { name: string }) => r.name)
        .sort(),
      ["Lê Đình Khang", "Đỗ Thị Hiền"],
    );
    // lượt của model (kèm function call) được giữ nguyên trong lịch sử
    assert.equal((last.contents as Array<{ role: string }>)[1]!.role, "model");
  });

  it("lỗi tool được trả về cho model, không làm hỏng lượt hỏi", async () => {
    const model = scriptedModel([
      [
        {
          id: "c1",
          name: "get_relatives",
          args: { personId: "seed-person-william", relation: "parents" },
        },
      ],
      "Không có người này trong dòng họ.",
    ]);
    const result = await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "?",
    });
    assert.match(result.trace[0]!.error!, /Không có người/);
    assert.match(
      functionResponses(model.requests.at(-1)!)[0]!.error,
      /Không có người/,
    );
    assert.equal(result.answer, "Không có người này trong dòng họ.");
  });

  it(`gọi tool quá ${MAX_TOOL_ROUNDS} vòng thì dừng và nói không đủ dữ liệu`, async () => {
    const model = scriptedModel([
      [{ id: "c", name: "get_stats", args: { metric: "overview" } }],
    ]);
    const result = await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "?",
    });
    assert.equal(result.answer, NOT_ENOUGH_DATA);
    assert.equal(model.requests.length, MAX_TOOL_ROUNDS + 1);
    assert.equal(result.trace.length, MAX_TOOL_ROUNDS);
  });

  it("không có chỉ mục nội dung thì không khai báo search_content", async () => {
    const model = scriptedModel(["ok"]);
    await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "?",
    });
    const declared = (
      model.requests[0]!.config!.tools as Array<{
        functionDeclarations: Array<{ name: string }>;
      }>
    )[0]!.functionDeclarations.map((d) => d.name);
    assert.ok(!declared.includes("search_content"));
    assert.ok(declared.includes("find_relationship"));
  });

  it("system prompt nói rõ người đang hỏi", () => {
    assert.match(systemInstruction(graph()), /Người đang hỏi: Lê Đình Minh/);
    assert.match(
      systemInstruction(new FamilyGraph(leDinhSnapshot(), askAs(null))),
      /chưa gắn với hồ sơ nào/,
    );
  });

  it("stream trạng thái tool và từng đoạn chữ, bỏ phần chữ viết trước khi gọi tool", async () => {
    const khang = graph().link(pid("khang"));
    const model = scriptedModel([
      {
        text: "Để mình tra cứu.",
        calls: [{ name: "find_person", args: { name: "Khang" } }],
      },
      `Cụ là [Lê Đình Khang](${khang}).`,
    ]);
    const events: AgentEvent[] = [];
    const result = await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "Cụ Khang là ai?",
      onEvent: (event) => events.push(event),
    });
    assert.deepEqual(
      events.map((e) => e.type),
      ["delta", "delta", "discard", "tool", "delta", "delta"],
    );
    assert.deepEqual(events[3], {
      type: "tool",
      name: "find_person",
      label: 'Đang tìm "Khang" trong gia phả…',
    });
    const streamed = events
      .slice(4)
      .map((e) => (e.type === "delta" ? e.text : ""))
      .join("");
    assert.equal(streamed, result.answer);
    assert.deepEqual(result.persons, [
      { personId: pid("khang"), name: "Lê Đình Khang", link: khang },
    ]);
  });

  it("đưa lịch sử hội thoại vào trước câu hỏi hiện tại", async () => {
    const model = scriptedModel(["ok"]);
    await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "Còn bà nội?",
      history: [
        { role: "user", text: "Ông nội tôi là ai?" },
        { role: "assistant", text: "Ông nội của bạn là Lê Đình Khang." },
      ],
    });
    const contents = model.requests[0]!.contents as Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    assert.deepEqual(
      contents.map((c) => [c.role, c.parts[0]!.text]),
      [
        ["user", "Ông nội tôi là ai?"],
        ["model", "Ông nội của bạn là Lê Đình Khang."],
        ["user", "Còn bà nội?"],
      ],
    );
  });

  it("vượt trần token đầu vào thì dừng gọi tool", async () => {
    const model = scriptedModel([
      [{ name: "get_stats", args: { metric: "overview" } }],
    ]);
    const result = await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "?",
      maxInputTokens: 150,
    });
    assert.equal(result.answer, NOT_ENOUGH_DATA);
    assert.equal(model.requests.length, 2);
  });

  it("dừng ngay khi người dùng hủy", async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      askFamilyAgent({
        model: scriptedModel(["ok"]),
        modelName: "fake",
        graph: graph(),
        question: "?",
        signal: controller.signal,
      }),
    );
  });
});

describe("câu hỏi kèm ảnh (LMS-019)", () => {
  const image = { mimeType: "image/jpeg", data: "/9j/AAAA" };

  it("đặt ảnh trước chữ trong lượt hỏi cuối và bật quy tắc đọc ảnh", async () => {
    const model = scriptedModel([
      [{ id: "c1", name: "find_person", args: { name: "Lê Đình Khang" } }],
      "Bia mộ này của cụ [Lê Đình Khang](/trees/x/persons/y).",
    ]);
    const result = await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "Bia này của ai?",
      history: [
        { role: "user", text: "Chào" },
        { role: "assistant", text: "Chào bạn" },
      ],
      image,
    });
    assert.match(result.answer, /Lê Đình Khang/);
    const first = model.requests[0]!;
    const contents = first.contents as Array<{
      role: string;
      parts: Array<Record<string, any>>;
    }>;
    const last = contents.at(-1)!;
    assert.deepEqual(last.parts, [
      { inlineData: image },
      { text: "Bia này của ai?" },
    ]);
    // lịch sử chỉ có chữ
    assert.ok(
      contents.slice(0, -1).every((c) => c.parts.every((p) => !p.inlineData)),
    );
    assert.match(String(first.config!.systemInstruction), /không phải yêu cầu/);
    // vòng sau vẫn giữ ảnh trong lượt hỏi (Gemini cần cả hội thoại)
    const second = model.requests[1]!.contents as typeof contents;
    assert.ok(second.some((c) => c.parts.some((p) => p.inlineData)));
  });

  it("không có ảnh thì system prompt giữ nguyên như trước", async () => {
    const model = scriptedModel(["Xin chào"]);
    await askFamilyAgent({
      model,
      modelName: "fake",
      graph: graph(),
      question: "Chào",
    });
    const instruction = String(model.requests[0]!.config!.systemInstruction);
    assert.doesNotMatch(instruction, /kèm một ảnh/);
    assert.equal(instruction, systemInstruction(graph(), new Date()));
  });
});

describe("sanitizeAnswer", () => {
  it("giữ link hồ sơ trong dòng họ, bỏ link tới người lạ hoặc dòng họ khác", () => {
    const g = graph();
    const minh = g.link(pid("minh"));
    const { text, persons } = sanitizeAnswer(
      `[Lê Đình Minh](${minh}), [William](/trees/${g.snapshot.treeId}/persons/seed-person-william), [Bịa](/trees/khac/persons/${pid("minh")}), [web](https://example.com)`,
      g,
    );
    assert.equal(text, `[Lê Đình Minh](${minh}), William, Bịa, web`);
    assert.deepEqual(
      persons.map((p) => p.name),
      ["Lê Đình Minh"],
    );
  });
});

/** Embedder giả: vector đếm từ (đã bỏ dấu) theo một bộ từ khóa cố định. */
const keywordEmbedder: Embedder = {
  async embed(texts) {
    const vocabulary = [
      "bo doi",
      "hy sinh",
      "bac si",
      "sai gon",
      "thay do",
      "chu nho",
    ];
    const norm = (t: string) =>
      t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
    return texts.map((t) =>
      vocabulary.map((w) => (norm(t).includes(w) ? 1 : 0)),
    );
  },
};

describe("search_content", () => {
  it("chỉ mục hóa người có tiểu sử/nghề nghiệp và trả kết quả gần nghĩa nhất", async () => {
    const index = await ContentIndex.build(graph(), keywordEmbedder);
    const { results } = await index.search({ query: "ai đi bộ đội hy sinh" });
    assert.equal(results[0]!.name, "Lê Đình Dũng");
    assert.match(results[0]!.content, /liệt sĩ/);
    assert.ok(results[0]!.link.includes(pid("dung")));
  });
});

describe("chấm câu trả lời", () => {
  it("khớp nguyên từ, phải đúng dấu", () => {
    assert.ok(containsPhrase("Bà ấy là Cô của bạn.", "cô"));
    assert.ok(!containsPhrase("Bạn có hai người em.", "cô"));
    assert.ok(!containsPhrase("Bà ấy là bác sĩ.", "bác sĩ nhi"));
  });

  it("chấm theo mustInclude, mustIncludeAny, mustNotInclude và tool đã gọi", () => {
    const q28 = evalQuestions.find((q) => q.id === "Q28")!;
    assert.equal(
      gradeAnswer(q28, "Trong dòng họ không có ai tên William.", []).pass,
      true,
    );
    assert.deepEqual(
      gradeAnswer(q28, "Ông nội của William là Philip.", []).failures.length,
      2,
    );
    const q13 = evalQuestions.find((q) => q.id === "Q13")!;
    assert.deepEqual(
      gradeAnswer(q13, "Đỗ Thị Hiền thọ 94 tuổi.", []).failures,
      ["không gọi get_stats"],
    );
  });

  it("bộ câu hỏi đủ ≥ 20 câu, id không trùng", () => {
    assert.ok(evalQuestions.length >= 20);
    assert.equal(
      new Set(evalQuestions.map((q) => q.id)).size,
      evalQuestions.length,
    );
  });
});
