import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import type { ContentSearcher } from "../agent.js";
import { ContentIndex, withFileCache } from "../content-search.js";
import { FamilyGraph } from "../family-graph.js";
import { createGemini } from "../gemini.js";
import { PgVectorContentStore } from "../pgvector-store.js";
import { loadTreeSnapshot, resolveAskContext } from "../tree-snapshot.js";

/**
 * Dựng mọi thứ một lượt hỏi cần, theo tài khoản đang hỏi. Dùng chung cho ai:chat và ai:eval.
 * Mặc định search_content chạy trên pgvector như server. `memory: true` giữ vector trong bộ nhớ
 * (cache ra file), dùng khi DB chưa có migration person_embeddings.
 */
export async function createSession(
  options: { noSearch?: boolean; memory?: boolean } = {},
) {
  const prisma = new PrismaClient();
  const gemini = createGemini();
  const modelKey = `${gemini.config.embeddingModel}@${gemini.config.embeddingDimensions}`;
  const fileCached = options.memory
    ? await withFileCache(
        gemini.embedder,
        fileURLToPath(
          new URL("../../../../.cache/ai-embeddings.json", import.meta.url),
        ),
        modelKey,
      )
    : null;
  const store = new PgVectorContentStore(prisma, gemini.embedder, modelKey);
  const indexes = new Map<string, ContentIndex>();

  return {
    prisma,
    gemini,
    async graphFor(email: string, treeId?: string) {
      const context = await resolveAskContext(prisma, email, treeId);
      const graph = new FamilyGraph(
        await loadTreeSnapshot(prisma, context.treeId),
        context,
      );
      let contentIndex: ContentSearcher | null = null;
      if (options.noSearch) contentIndex = null;
      else if (fileCached) {
        let index = indexes.get(context.treeId);
        if (!index) {
          index = await ContentIndex.build(graph, fileCached);
          indexes.set(context.treeId, index);
        }
        contentIndex = index;
      } else contentIndex = await store.forTree(graph);
      return { graph, contentIndex };
    },
    close: () => prisma.$disconnect(),
  };
}

export function parseArgs(argv: string[]) {
  const flags: Record<string, string | true> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) rest.push(arg);
    else if (argv[i + 1] && !argv[i + 1]!.startsWith("--"))
      flags[arg.slice(2)] = argv[++i]!;
    else flags[arg.slice(2)] = true;
  }
  return { flags, rest };
}

/** Free tier của Gemini hay trả 429/503: thử lại vài lần, chờ tăng dần. */
export async function withRetry<T>(
  run: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (attempt >= attempts || (status !== 429 && status !== 503))
        throw error;
      const waitMs = 15_000 * attempt;
      console.warn(`  Gemini trả ${status}, thử lại sau ${waitMs / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}
