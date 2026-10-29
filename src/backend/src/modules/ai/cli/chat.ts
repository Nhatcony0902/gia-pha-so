/**
 * Hỏi thử chatbot từ terminal (prototype LMS-016).
 *   npm run ai:chat -w @family-tree/api -- "Ông nội tôi là ai?"
 *   npm run ai:chat -w @family-tree/api -- --as nam@example.com
 * Không truyền câu hỏi thì vào chế độ hỏi liên tục. --tree <id> khi tài khoản thuộc nhiều gia phả,
 * --no-search để tắt search_content (phương án dự phòng của ADR-0004).
 */
import { createInterface } from "node:readline/promises";
import { askFamilyAgent } from "../agent.js";
import { createSession, parseArgs, withRetry } from "./setup.js";

const { flags, rest } = parseArgs(process.argv.slice(2));
const email = typeof flags.as === "string" ? flags.as : "minh@example.com";
const session = await createSession({ noSearch: Boolean(flags["no-search"]) });

try {
  const { graph, contentIndex } = await session.graphFor(
    email,
    typeof flags.tree === "string" ? flags.tree : undefined,
  );
  const me = graph.context.mePersonId
    ? graph.person("me").fullName
    : "chưa gắn hồ sơ";
  console.log(
    `Gia phả: ${graph.snapshot.treeName} · hỏi với tư cách ${email} (${me}) · model ${session.gemini.config.chatModel}\n`,
  );

  const ask = async (question: string) => {
    const started = Date.now();
    const result = await withRetry(() =>
      askFamilyAgent({
        model: session.gemini.model,
        modelName: session.gemini.config.chatModel,
        graph,
        contentIndex,
        question,
      }),
    );
    for (const call of result.trace)
      console.log(
        `  ↳ ${call.name}(${JSON.stringify(call.args)})${call.error ? ` ✗ ${call.error}` : ""}`,
      );
    console.log(`\n${result.answer}\n`);
    console.log(
      `  (${result.rounds} vòng tool · ${result.tokens.input}+${result.tokens.output} token · ${((Date.now() - started) / 1000).toFixed(1)}s)\n`,
    );
  };

  if (rest.length) await ask(rest.join(" "));
  else {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    for (;;) {
      const question = (await rl.question("Bạn: ")).trim();
      if (!question || question === "exit") break;
      await ask(question);
    }
    rl.close();
  }
} finally {
  await session.close();
}
