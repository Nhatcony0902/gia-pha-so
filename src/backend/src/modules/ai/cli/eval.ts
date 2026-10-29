/**
 * Chạy bộ câu hỏi đánh giá chatbot và ghi báo cáo vào docs/ai/eval-results/ (LMS-016).
 *   npm run ai:eval -w @family-tree/api
 *   npm run ai:eval -w @family-tree/api -- --only Q01,Q13 --no-search
 * Cần đã seed dòng họ Lê Đình (npm run db:seed). Chấm tự động chỉ để sàng lọc, vẫn phải đọc lại câu trả lời.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { askFamilyAgent, type AgentResult } from "../agent.js";
import { gradeAnswer } from "../eval/grade.js";
import { evalQuestions, type EvalQuestion } from "../eval/questions.js";
import { createSession, parseArgs, withRetry } from "./setup.js";

const DEFAULT_ASKER = "minh@example.com";
const { flags } = parseArgs(process.argv.slice(2));
const only =
  typeof flags.only === "string" ? new Set(flags.only.split(",")) : null;
const questions = evalQuestions.filter((q) => !only || only.has(q.id));
const noSearch = Boolean(flags["no-search"]);
const session = await createSession({ noSearch });

type Row = {
  question: EvalQuestion;
  result?: AgentResult;
  error?: string;
  seconds: number;
  grade: { pass: boolean; failures: string[] };
};
const rows: Row[] = [];

try {
  for (const question of questions) {
    const started = Date.now();
    process.stdout.write(`${question.id} ${question.question} … `);
    try {
      const { graph, contentIndex } = await session.graphFor(
        question.as ?? DEFAULT_ASKER,
      );
      const result = await withRetry(() =>
        askFamilyAgent({
          model: session.gemini.model,
          modelName: session.gemini.config.chatModel,
          graph,
          contentIndex,
          question: question.question,
        }),
      );
      const grade = gradeAnswer(
        question,
        result.answer,
        result.trace.map((t) => t.name),
      );
      rows.push({
        question,
        result,
        grade,
        seconds: (Date.now() - started) / 1000,
      });
      console.log(
        grade.pass ? "ĐẠT" : `CHƯA ĐẠT (${grade.failures.join("; ")})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      rows.push({
        question,
        error: message,
        seconds: (Date.now() - started) / 1000,
        grade: { pass: false, failures: [`lỗi: ${message}`] },
      });
      console.log(`LỖI: ${message}`);
    }
  }
} finally {
  await session.close();
}

const cell = (value: string) =>
  value.replace(/\|/g, "\\|").replace(/\n+/g, " ");
const passed = rows.filter((r) => r.grade.pass).length;
const groups = [...new Set(rows.map((r) => r.question.group))];
const tokens = rows.reduce(
  (sum, r) => ({
    input: sum.input + (r.result?.tokens.input ?? 0),
    output: sum.output + (r.result?.tokens.output ?? 0),
  }),
  { input: 0, output: 0 },
);
const now = new Date();
const stamp = now.toISOString().slice(0, 16).replace("T", " ");
const { chatModel, embeddingModel, embeddingDimensions } =
  session.gemini.config;

const report = `# Kết quả đánh giá chatbot – ${stamp} UTC

- Chat model: \`${chatModel}\` · Embedding: ${noSearch ? "tắt `search_content`" : `\`${embeddingModel}\` (${embeddingDimensions} chiều)`}
- Dữ liệu: dòng họ mẫu Lê Đình (\`src/backend/prisma/seed-data/le-dinh-family.ts\`)
- Chấm tự động: **${passed}/${rows.length} đạt**. Chấm tự động chỉ sàng lọc theo từ khóa, cần đọc lại từng câu trả lời.
- Token: ${tokens.input} vào + ${tokens.output} ra (${rows.length ? Math.round((tokens.input + tokens.output) / rows.length) : 0} token/câu)

| Nhóm | Đạt |
|---|---|
${groups
  .map((g) => {
    const inGroup = rows.filter((r) => r.question.group === g);
    return `| ${g} | ${inGroup.filter((r) => r.grade.pass).length}/${inGroup.length} |`;
  })
  .join("\n")}

| ID | Câu hỏi | Kết quả | Tool đã gọi | Thời gian |
|---|---|---|---|---|
${rows
  .map(
    (r) =>
      `| ${r.question.id} | ${cell(r.question.question)} | ${r.grade.pass ? "Đạt" : `Chưa đạt: ${cell(r.grade.failures.join("; "))}`} | ${r.result ? r.result.trace.map((t) => t.name).join(", ") || "–" : "–"} | ${r.seconds.toFixed(1)}s |`,
  )
  .join("\n")}

## Chi tiết
${rows
  .map(
    (r) => `
### ${r.question.id} · ${r.question.group}${r.question.as ? ` · hỏi bằng ${r.question.as}` : ""}
**Hỏi:** ${r.question.question}

**Đáp án đúng:** ${r.question.expected}

**Chatbot trả lời:**

${
  r.error
    ? `> Lỗi: ${r.error}`
    : r
        .result!.answer.split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
}

${
  r.result?.trace.length
    ? `<details><summary>${r.result.trace.length} lần gọi tool, ${r.result.rounds} vòng</summary>

${r.result.trace.map((t) => `- \`${t.name}(${JSON.stringify(t.args)})\`${t.error ? ` → lỗi: ${t.error}` : ""}`).join("\n")}

</details>
`
    : ""
}`,
  )
  .join("")}`;

const dir = new URL("../../../../../../docs/ai/eval-results/", import.meta.url);
await mkdir(dir, { recursive: true });
const file = new URL(
  `${now.toISOString().slice(0, 10)}-${chatModel.replace(/[^a-z0-9.-]/gi, "_")}${only ? "-partial" : ""}.md`,
  dir,
);
await writeFile(file, report);
console.log(`\n${passed}/${rows.length} đạt. Báo cáo: ${fileURLToPath(file)}`);
