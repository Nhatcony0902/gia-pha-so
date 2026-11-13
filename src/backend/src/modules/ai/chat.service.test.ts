import "reflect-metadata";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ChatStreamEvent } from "@family-tree/shared-types";
import type {
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import type { PrismaService } from "../database/prisma.service.js";
import type { AgentEvent } from "./agent.js";
import {
  ChatService,
  describeChatError,
  suggestionsFor,
  trimHistory,
  type ChatAi,
} from "./chat.service.js";
import { streamAgentAnswer } from "./sse.js";
import { leDinhSnapshot, pid } from "./testing/le-dinh-snapshot.js";

const snapshot = leDinhSnapshot();
const TREE = snapshot.treeId;

/** Prisma giả: chỉ các truy vấn ChatService và loadTreeSnapshot dùng. */
function fakePrisma() {
  const memberships = [
    { treeId: TREE, userId: "minh-user", personId: pid("minh") },
    { treeId: TREE, userId: "unlinked-user", personId: null },
  ];
  return {
    membership: {
      findUnique: async ({
        where: { treeId_userId: key },
      }: {
        where: { treeId_userId: { treeId: string; userId: string } };
      }) =>
        memberships.find(
          (m) => m.treeId === key.treeId && m.userId === key.userId,
        ) ?? null,
    },
    familyTree: {
      findUniqueOrThrow: async () => ({ name: snapshot.treeName }),
    },
    person: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const person = snapshot.persons.find((p) => p.id === id);
        return person ? { id: person.id, fullName: person.fullName } : null;
      },
      findMany: async () => snapshot.persons,
    },
    relationship: { findMany: async () => snapshot.relationships },
  } as unknown as PrismaService;
}

/** Model giả trả lời ngay một câu, ghi lại request. */
function oneShotModel(answer: string) {
  const requests: GenerateContentParameters[] = [];
  return {
    requests,
    async generateContentStream(params: GenerateContentParameters) {
      requests.push(params);
      return (async function* () {
        yield {
          candidates: [
            { content: { role: "model", parts: [{ text: answer }] } },
          ],
          usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 5 },
        } as unknown as GenerateContentResponse;
      })();
    },
  };
}

class TestChatService extends ChatService {
  configured = true;
  constructor(readonly fakeAi: ChatAi) {
    super(fakePrisma());
  }
  protected override isConfigured() {
    return this.configured;
  }
  protected override createAi() {
    return this.fakeAi;
  }
}

const savedLimit = process.env.AI_DAILY_QUESTION_LIMIT;
const savedImageLimit = process.env.AI_DAILY_IMAGE_LIMIT;
const jpeg = {
  mimeType: "image/jpeg" as const,
  data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64"),
};

describe("ChatService", () => {
  let model: ReturnType<typeof oneShotModel>;
  let service: TestChatService;
  beforeEach(() => {
    model = oneShotModel("Xin chào");
    service = new TestChatService({
      model,
      chatModel: "fake",
      contentStore: null,
    });
  });
  afterEach(() => {
    if (savedLimit === undefined) delete process.env.AI_DAILY_QUESTION_LIMIT;
    else process.env.AI_DAILY_QUESTION_LIMIT = savedLimit;
    if (savedImageLimit === undefined) delete process.env.AI_DAILY_IMAGE_LIMIT;
    else process.env.AI_DAILY_IMAGE_LIMIT = savedImageLimit;
  });

  it("gửi ảnh kèm câu hỏi cho model và trừ hạn mức ảnh", async () => {
    process.env.AI_DAILY_IMAGE_LIMIT = "1";
    const session = await service.prepare(TREE, "minh-user", {
      question: "Bia này của ai?",
      image: jpeg,
    });
    await session.run(() => {}, new AbortController().signal);
    const last = (
      model.requests[0]!.contents as Array<{
        parts: Array<Record<string, unknown>>;
      }>
    ).at(-1)!;
    assert.deepEqual(last.parts[0], { inlineData: jpeg });

    const context = await service.context(TREE, "minh-user");
    assert.equal(context.limits.dailyImages, 1);
    assert.equal(context.limits.remainingImagesToday, 0);
    assert.ok(context.limits.imageMaxBytes > 0);

    const error = await service
      .prepare(TREE, "minh-user", { question: "Ảnh nữa", image: jpeg })
      .catch((e: unknown) => e);
    assert.ok(error instanceof HttpException);
    assert.equal(error.getStatus(), 429);
    assert.equal(
      (error.getResponse() as { code: string }).code,
      "AI_IMAGE_QUOTA_EXCEEDED",
    );
    // hết lượt ảnh vẫn hỏi bằng chữ được, và lượt bị từ chối không bị trừ
    await service.prepare(TREE, "minh-user", { question: "Chữ thôi" });
    const after = await service.context(TREE, "minh-user");
    assert.equal(after.limits.remainingToday, after.limits.dailyQuestions - 2);
  });

  it("AI_DAILY_IMAGE_LIMIT=0 thì tắt gửi ảnh", async () => {
    process.env.AI_DAILY_IMAGE_LIMIT = "0";
    const error = await service
      .prepare(TREE, "minh-user", { question: "?", image: jpeg })
      .catch((e: unknown) => e);
    assert.ok(error instanceof HttpException);
    assert.match(
      (error.getResponse() as { message: string }).message,
      /chưa bật/,
    );
  });

  it("ảnh hỏng thì trả 400 INVALID_IMAGE và không mất lượt hỏi", async () => {
    const error = await service
      .prepare(TREE, "minh-user", {
        question: "?",
        image: { mimeType: "image/png", data: jpeg.data },
      })
      .catch((e: unknown) => e);
    assert.ok(error instanceof HttpException);
    assert.equal(error.getStatus(), 400);
    assert.equal(
      (error.getResponse() as { code: string }).code,
      "INVALID_IMAGE",
    );
    const context = await service.context(TREE, "minh-user");
    assert.equal(context.limits.remainingToday, context.limits.dailyQuestions);
  });

  it("người không thuộc gia phả nhận 404, kể cả khi hỏi", async () => {
    await assert.rejects(service.context(TREE, "stranger"), NotFoundException);
    await assert.rejects(
      service.prepare(TREE, "stranger", { question: "Ai thọ nhất?" }),
      NotFoundException,
    );
    await assert.rejects(
      service.prepare("other-tree", "minh-user", { question: "?" }),
      NotFoundException,
    );
  });

  it("chưa cấu hình GEMINI_API_KEY thì báo 503 nhưng màn hình chat vẫn mở được", async () => {
    service.configured = false;
    await assert.rejects(
      service.prepare(TREE, "minh-user", { question: "?" }),
      ServiceUnavailableException,
    );
    const context = await service.context(TREE, "minh-user");
    assert.equal(context.available, false);
  });

  it("context trả người đang hỏi, gợi ý và hạn mức", async () => {
    const context = await service.context(TREE, "minh-user");
    assert.equal(context.treeName, snapshot.treeName);
    assert.deepEqual(context.me, {
      personId: pid("minh"),
      name: "Lê Đình Minh",
    });
    assert.ok(context.suggestions.includes("Ông nội tôi là ai?"));
    const unlinked = await service.context(TREE, "unlinked-user");
    assert.equal(unlinked.me, null);
    assert.ok(!unlinked.suggestions.some((s) => /tôi/.test(s)));
  });

  it('"tôi" lấy từ Membership của tài khoản, không lấy từ request', async () => {
    const session = await service.prepare(TREE, "minh-user", {
      question: "Tôi là ai?",
    });
    const result = await session.run(() => {}, new AbortController().signal);
    assert.equal(result.answer, "Xin chào");
    const instruction = String(model.requests[0]!.config!.systemInstruction);
    assert.match(instruction, /Người đang hỏi: Lê Đình Minh/);
  });

  it("hết hạn mức trong ngày thì trả 429 AI_QUOTA_EXCEEDED", async () => {
    process.env.AI_DAILY_QUESTION_LIMIT = "2";
    await service.prepare(TREE, "minh-user", { question: "1" });
    await service.prepare(TREE, "minh-user", { question: "2" });
    const error = await service
      .prepare(TREE, "minh-user", { question: "3" })
      .catch((e: unknown) => e);
    assert.ok(error instanceof HttpException);
    assert.equal(error.getStatus(), 429);
    assert.equal(
      (error.getResponse() as { code: string }).code,
      "AI_QUOTA_EXCEEDED",
    );
    // người khác vẫn hỏi được
    await service.prepare(TREE, "unlinked-user", { question: "1" });
    const context = await service.context(TREE, "minh-user");
    assert.equal(context.limits.remainingToday, 0);
  });

  it("embedding lỗi thì vẫn trả lời bằng các tool còn lại", async () => {
    service = new TestChatService({
      model,
      chatModel: "fake",
      contentStore: {
        forTree: async () => {
          throw new Error("embedding API down");
        },
      },
    });
    const session = await service.prepare(TREE, "minh-user", {
      question: "Ai từng đi bộ đội?",
    });
    const result = await session.run(() => {}, new AbortController().signal);
    assert.equal(result.answer, "Xin chào");
    const declared = (
      model.requests[0]!.config!.tools as Array<{
        functionDeclarations: Array<{ name: string }>;
      }>
    )[0]!.functionDeclarations.map((d) => d.name);
    assert.ok(!declared.includes("search_content"));
  });
});

describe("trimHistory", () => {
  it("giữ tối đa 6 lượt gần nhất, bắt đầu bằng lượt người dùng, bỏ lượt rỗng", () => {
    const turns = Array.from({ length: 9 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      text: `lượt ${i}`,
    }));
    const trimmed = trimHistory([...turns, { role: "user", text: "   " }]);
    assert.equal(trimmed[0]!.role, "user");
    assert.ok(trimmed.length <= 6);
    assert.equal(trimmed.at(-1)!.text, "lượt 8");
    assert.equal(trimHistory(undefined).length, 0);
  });
});

describe("gợi ý và lỗi", () => {
  it("gợi ý theo việc tài khoản đã gắn hồ sơ hay chưa", () => {
    assert.ok(suggestionsFor(true).some((s) => s.includes("tôi")));
    assert.ok(!suggestionsFor(false).some((s) => s.includes("tôi")));
  });

  it("không lộ chi tiết lỗi nội bộ", () => {
    assert.equal(describeChatError({ status: 429 }).code, "AI_RATE_LIMITED");
    const generic = describeChatError(new Error("password=secret"));
    assert.equal(generic.code, "AI_ERROR");
    assert.ok(!generic.message.includes("secret"));
  });
});

/** Response giả đủ cho streamAgentAnswer. */
function fakeResponse() {
  const emitter = new EventEmitter();
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    chunks: [] as string[],
    writableEnded: false,
    destroyed: false,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name.toLowerCase()] = value;
      return res;
    },
    flushHeaders() {},
    write(chunk: string) {
      res.chunks.push(chunk);
      return true;
    },
    end() {
      res.writableEnded = true;
      emitter.emit("close");
      return res;
    },
    on(event: string, listener: () => void) {
      emitter.on(event, listener);
      return res;
    },
    /** Client ngắt kết nối giữa chừng. */
    disconnect() {
      res.destroyed = true;
      emitter.emit("close");
    },
  };
  return res;
}

const parseFrames = (chunks: string[]) =>
  chunks
    .filter((c) => c.startsWith("data: "))
    .map((c) => JSON.parse(c.slice(6)) as ChatStreamEvent);

const result = {
  answer: "Ông nội của bạn là Lê Đình Thọ.",
  persons: [],
  trace: [],
  rounds: 1,
  tokens: { input: 10, output: 2 },
};

describe("streamAgentAnswer", () => {
  it("gửi sự kiện của agent rồi done, đúng định dạng SSE", async () => {
    const res = fakeResponse();
    await streamAgentAnswer(
      res as never,
      async (emit) => {
        emit({ type: "tool", name: "get_relatives", label: "Đang tra cứu…" });
        emit({ type: "delta", text: "Ông nội" });
        return result;
      },
      describeChatError,
    );
    assert.equal(res.statusCode, 200);
    assert.match(res.headers["content-type"]!, /text\/event-stream/);
    assert.ok(res.chunks.every((c) => c.endsWith("\n\n")));
    const events = parseFrames(res.chunks);
    assert.deepEqual(
      events.map((e) => e.type),
      ["tool", "delta", "done"],
    );
    assert.deepEqual(events[2], {
      type: "done",
      answer: result.answer,
      persons: [],
      usage: { rounds: 1, inputTokens: 10, outputTokens: 2 },
    });
    assert.ok(res.writableEnded);
  });

  it("lỗi giữa chừng thành sự kiện error, không lộ chi tiết", async () => {
    const res = fakeResponse();
    await streamAgentAnswer(
      res as never,
      async () => {
        throw Object.assign(new Error("quota"), { status: 429 });
      },
      describeChatError,
    );
    const events = parseFrames(res.chunks);
    assert.deepEqual(events, [
      { type: "error", ...describeChatError({ status: 429 }) },
    ]);
  });

  it("client ngắt kết nối thì hủy lượt hỏi và không ghi thêm", async () => {
    const res = fakeResponse();
    let aborted = false;
    await streamAgentAnswer(
      res as never,
      (emit: (event: AgentEvent) => void, signal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
          emit({ type: "delta", text: "…" });
          res.disconnect();
        }),
      describeChatError,
    );
    assert.ok(aborted);
    assert.deepEqual(
      parseFrames(res.chunks).map((e) => e.type),
      ["delta"],
    );
  });
});
