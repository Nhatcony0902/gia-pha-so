import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import type { ContentSearcher } from "../agent.js";
import { isAiEnabled, snapshotForAi } from "../ai-privacy.js";
import { ContentIndex, withFileCache } from "../content-search.js";
import { FamilyGraph } from "../family-graph.js";
import { createGemini } from "../gemini.js";
import { PgVectorContentStore } from "../pgvector-store.js";
import { CLI_RETRY } from "../retry.js";
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
      // Cùng luật riêng tư với server (LMS-023): gia phả chưa bật AI thì không gửi dữ liệu đi.
      const settings = await prisma.familyTree.findUniqueOrThrow({
        where: { id: context.treeId },
        select: { aiEnabledAt: true, aiShareLivingDetails: true },
      });
      if (!isAiEnabled(settings))
        throw new Error(
          `Gia phả ${context.treeId} chưa bật trợ lý AI. Admin bật trên trang Hỏi đáp AI, hoặc chạy lại npm run db:seed với dữ liệu mẫu.`,
        );
      const graph = new FamilyGraph(
        snapshotForAi(
          await loadTreeSnapshot(prisma, context.treeId),
          settings,
          context.mePersonId,
        ),
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

/** Tham số gọi model dùng chung cho ai:chat và ai:eval: chờ lâu, có model dự phòng. */
export function agentModelOptions(gemini: ReturnType<typeof createGemini>) {
  return {
    model: gemini.model,
    modelName: gemini.config.chatModel,
    fallbackModelName: gemini.config.fallbackChatModel,
    retry: CLI_RETRY,
    onRetry: (message: string) =>
      console.warn(`
  ↻ ${message}`),
  };
}
