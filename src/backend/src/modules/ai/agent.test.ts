import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  FunctionCall,
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import {
  MAX_TOOL_ROUNDS,
  NOT_ENOUGH_DATA,
  askFamilyAgent,
  systemInstruction,
} from "./agent.js";
import { ContentIndex, type Embedder } from "./content-search.js";
import { FamilyGraph } from "./family-graph.js";
import { containsPhrase, gradeAnswer } from "./eval/grade.js";
import { evalQuestions } from "./eval/questions.js";
import { askAs, leDinhSnapshot, pid } from "./testing/le-dinh-snapshot.js";

const graph = () => new FamilyGraph(leDinhSnapshot(), askAs("minh"));

/** Model giả: trả lần lượt các lượt đã soạn, ghi lại request để kiểm tra. */
function scriptedModel(turns: Array<FunctionCall[] | string>) {
  const requests: GenerateContentParameters[] = [];
  let index = 0;
  return {
    requests,
    async generateContent(params: GenerateContentParameters) {
      requests.push(structuredClone(params));
      const turn = turns[Math.min(index++, turns.length - 1)]!;
      const calls = typeof turn === "string" ? [] : turn;
      return {
        functionCalls: calls.length ? calls : undefined,
        text: typeof turn === "string" ? turn : undefined,
        candidates: [
          {
            content: {
              role: "model",
              parts: calls.map((functionCall) => ({ functionCall })),
            },
          },
        ],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 },
      } as unknown as GenerateContentResponse;
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
