import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import { askFamilyAgent, type AgentEvent } from "./agent.js";
import { FamilyGraph } from "./family-graph.js";
import {
  isDailyQuotaError,
  isTransientError,
  retryDelay,
  sleep,
  withRetry,
} from "./retry.js";
import { askAs, leDinhSnapshot } from "./testing/le-dinh-snapshot.js";

const apiError = (status: number, message = "error") =>
  Object.assign(new Error(message), { status });
const overloaded = () =>
  apiError(503, "This model is currently experiencing high demand.");
const dailyQuota = () =>
  apiError(429, "Quota exceeded for GenerateRequestsPerDayPerProjectPerModel");
const fetchFailed = () =>
  new TypeError("fetch failed", {
    cause: Object.assign(new Error("other side closed"), {
      code: "UND_ERR_SOCKET",
    }),
  });

const chunk = (text: string) =>
  ({
    candidates: [{ content: { role: "model", parts: [{ text }] } }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 },
  }) as unknown as GenerateContentResponse;

/** Một lượt gọi model: ném lỗi ngay, stream một đoạn rồi đứt, hoặc trả lời. */
type Step = Error | { partial: string; error: Error } | string;

function flakyModel(steps: Step[]) {
  const models: string[] = [];
  let index = 0;
  return {
    models,
    async generateContentStream(params: GenerateContentParameters) {
      models.push(params.model);
      const step = steps[Math.min(index++, steps.length - 1)]!;
      if (step instanceof Error) throw step;
      return (async function* () {
        if (typeof step === "string") {
          yield chunk(step);
          return;
        }
        yield chunk(step.partial);
        throw step.error;
      })();
    },
  };
}

const ask = (
  model: ReturnType<typeof flakyModel>,
  options: Partial<Parameters<typeof askFamilyAgent>[0]> = {},
) =>
  askFamilyAgent({
    model,
    modelName: "main",
    graph: new FamilyGraph(leDinhSnapshot(), askAs("minh")),
    question: "Ông nội tôi là ai?",
    retry: { attempts: 3, baseDelayMs: 1 },
    ...options,
  });

describe("phân loại lỗi Gemini", () => {
  it("503, 500, 429 và rớt mạng là lỗi tạm thời", () => {
    assert.ok(isTransientError(overloaded()));
    assert.ok(isTransientError(apiError(500)));
    assert.ok(isTransientError(apiError(429)));
    assert.ok(isTransientError(fetchFailed()));
    assert.ok(
      isTransientError(
        new TypeError("terminated", {
          cause: Object.assign(new Error("read"), { code: "ECONNRESET" }),
        }),
      ),
    );
  });

  it("400, 401, 403, 404, lỗi code và người dùng hủy thì không thử lại", () => {
    for (const status of [400, 401, 403, 404])
      assert.equal(isTransientError(apiError(status)), false);
    assert.equal(isTransientError(new Error("x is undefined")), false);
    const abort = new DOMException("aborted", "AbortError");
    assert.equal(isTransientError(abort), false);
  });

  it("nhận ra 429 do hết quota trong ngày", () => {
    assert.ok(isDailyQuotaError(dailyQuota()));
    assert.equal(isDailyQuotaError(apiError(429, "per minute")), false);
    assert.equal(isDailyQuotaError(overloaded()), false);
  });

  it("thời gian chờ tăng gấp đôi", () => {
    const policy = { attempts: 4, baseDelayMs: 1000 };
    assert.deepEqual(
      [1, 2, 3].map((attempt) => retryDelay(policy, attempt)),
      [1000, 2000, 4000],
    );
  });

  it("sleep dừng ngay khi bị hủy", async () => {
    const controller = new AbortController();
    const waiting = sleep(60_000, controller.signal);
    controller.abort();
    await assert.rejects(waiting, { name: "AbortError" });
  });

  it("withRetry thử lại lỗi tạm thời, bỏ qua lỗi thật", async () => {
    const policy = { attempts: 3, baseDelayMs: 1 };
    let calls = 0;
    const value = await withRetry(
      async () => {
        if (++calls < 3) throw fetchFailed();
        return "ok";
      },
      policy,
      () => {},
    );
    assert.equal(value, "ok");
    assert.equal(calls, 3);

    calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw apiError(400);
        },
        policy,
        () => {},
      ),
    );
    assert.equal(calls, 1);
  });
});

describe("chatbot thử lại khi Gemini lỗi tạm thời", () => {
  it("503 rồi rớt mạng, lần thứ ba trả lời được", async () => {
    const model = flakyModel([overloaded(), fetchFailed(), "Lê Đình Khang"]);
    const messages: string[] = [];
    const result = await ask(model, {
      onRetry: (message) => messages.push(message),
    });
    assert.equal(result.answer, "Lê Đình Khang");
    assert.equal(result.retries, 2);
    assert.equal(result.model, "main");
    assert.deepEqual(model.models, ["main", "main", "main"]);
    assert.match(messages[0]!, /HTTP 503/);
    assert.match(messages[1]!, /fetch failed/);
  });

  it("model chính lỗi hết lượt thì chuyển sang model dự phòng", async () => {
    const model = flakyModel([
      overloaded(),
      overloaded(),
      overloaded(),
      "Lê Đình Khang",
    ]);
    const result = await ask(model, { fallbackModelName: "backup" });
    assert.equal(result.answer, "Lê Đình Khang");
    assert.equal(result.model, "backup");
    assert.deepEqual(model.models, ["main", "main", "main", "backup"]);
  });

  it("hết quota trong ngày thì chuyển ngay, không chờ thử lại", async () => {
    const model = flakyModel([dailyQuota(), "ok"]);
    const result = await ask(model, { fallbackModelName: "backup" });
    assert.equal(result.answer, "ok");
    assert.deepEqual(model.models, ["main", "backup"]);
  });

  it("không có model dự phòng thì báo lỗi sau khi hết lượt thử", async () => {
    const model = flakyModel([overloaded()]);
    await assert.rejects(ask(model), { status: 503 });
    assert.equal(model.models.length, 3);
  });

  it("model dự phòng cũng lỗi thì báo lỗi, không lặp vô hạn", async () => {
    const model = flakyModel([overloaded()]);
    await assert.rejects(ask(model, { fallbackModelName: "backup" }), {
      status: 503,
    });
    assert.deepEqual(model.models, [
      "main",
      "main",
      "main",
      "backup",
      "backup",
      "backup",
    ]);
  });

  it("lỗi thật (400) không thử lại", async () => {
    const model = flakyModel([apiError(400, "bad request"), "ok"]);
    await assert.rejects(ask(model, { fallbackModelName: "backup" }), {
      status: 400,
    });
    assert.equal(model.models.length, 1);
  });

  it("đứt giữa chừng thì bỏ phần chữ đã stream rồi viết lại", async () => {
    const model = flakyModel([
      { partial: "Ông nội của", error: fetchFailed() },
      "Lê Đình Khang",
    ]);
    const events: AgentEvent[] = [];
    const result = await ask(model, { onEvent: (e) => events.push(e) });
    assert.equal(result.answer, "Lê Đình Khang");
    assert.deepEqual(
      events.map((e) => e.type),
      ["delta", "discard", "delta"],
    );
  });

  it("người dùng hủy trong lúc chờ thử lại thì dừng ngay", async () => {
    const controller = new AbortController();
    const model = flakyModel([overloaded(), "ok"]);
    const pending = ask(model, {
      retry: { attempts: 3, baseDelayMs: 60_000 },
      signal: controller.signal,
      onRetry: () => controller.abort(),
    });
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(model.models.length, 1);
  });
});
