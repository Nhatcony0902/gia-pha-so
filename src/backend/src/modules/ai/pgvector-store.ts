import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { ContentSearcher } from "./agent.js";
import {
  SEARCH_NOTE,
  personDocument,
  type Embedder,
} from "./content-search.js";
import { FamilyGraph, ToolError } from "./family-graph.js";

/** Số chiều của cột `PersonEmbedding.embedding` (migration person_embeddings, ADR-0005). */
export const EMBEDDING_DIMENSIONS = 768;
const TOP_K = 5;

type SqlClient = Pick<PrismaClient, "$queryRaw" | "$executeRaw">;

export const contentHash = (modelKey: string, text: string) =>
  createHash("sha256").update(`${modelKey}\n${text}`).digest("hex");

const vectorLiteral = (vector: number[]) => {
  if (vector.length !== EMBEDDING_DIMENSIONS)
    throw new Error(
      `Embedding có ${vector.length} chiều, cột pgvector cần ${EMBEDDING_DIMENSIONS}. Kiểm tra GEMINI_EMBEDDING_DIMENSIONS.`,
    );
  return `[${vector.join(",")}]`;
};

/**
 * Việc cần làm để chỉ mục khớp dữ liệu hiện tại: ai cần embed (mới hoặc văn bản/model đổi)
 * và ai cần xóa (không còn văn bản để tìm). Hàm thuần, test được không cần DB.
 */
export function planSync(
  graph: FamilyGraph,
  modelKey: string,
  stored: Map<string, string>,
) {
  const toEmbed: Array<{ personId: string; text: string; hash: string }> = [];
  const toDelete: string[] = [];
  for (const person of graph.persons) {
    const text = personDocument(person);
    if (!text) {
      if (stored.has(person.id)) toDelete.push(person.id);
      continue;
    }
    const hash = contentHash(modelKey, text);
    if (stored.get(person.id) !== hash)
      toEmbed.push({ personId: person.id, text, hash });
  }
  return { toEmbed, toDelete };
}

/**
 * Tool `search_content` trên pgvector. Thay cho hook ChangeService (chưa có): trước mỗi lượt hỏi
 * so hash văn bản của từng người với bản đã embed, chỉ embed lại người có thay đổi.
 * Tìm kiếm luôn lọc theo dòng họ đang hỏi (join FamilyTreePerson), nên không lộ dòng họ khác.
 */
export class PgVectorContentStore {
  constructor(
    private readonly db: SqlClient,
    private readonly embedder: Embedder,
    readonly modelKey: string,
  ) {}

  async sync(graph: FamilyGraph) {
    const ids = graph.persons.map((p) => p.id);
    if (!ids.length) return { embedded: 0, deleted: 0 };
    const rows = await this.db.$queryRaw<
      Array<{ personId: string; contentHash: string }>
    >`SELECT "personId", "contentHash" FROM "PersonEmbedding" WHERE "personId" IN (${Prisma.join(ids)})`;
    const { toEmbed, toDelete } = planSync(
      graph,
      this.modelKey,
      new Map(rows.map((r) => [r.personId, r.contentHash])),
    );
    if (toEmbed.length) {
      const vectors = await this.embedder.embed(
        toEmbed.map((d) => d.text),
        "document",
      );
      for (const [i, doc] of toEmbed.entries())
        await this.db.$executeRaw`
          INSERT INTO "PersonEmbedding" ("personId", "model", "contentHash", "embedding", "updatedAt")
          VALUES (${doc.personId}, ${this.modelKey}, ${doc.hash}, ${vectorLiteral(vectors[i]!)}::vector, NOW())
          ON CONFLICT ("personId") DO UPDATE SET
            "model" = EXCLUDED."model",
            "contentHash" = EXCLUDED."contentHash",
            "embedding" = EXCLUDED."embedding",
            "updatedAt" = NOW()`;
    }
    if (toDelete.length)
      await this.db
        .$executeRaw`DELETE FROM "PersonEmbedding" WHERE "personId" IN (${Prisma.join(toDelete)})`;
    return { embedded: toEmbed.length, deleted: toDelete.length };
  }

  /** Đồng bộ rồi trả về searcher gắn với đúng dòng họ của graph. */
  async forTree(graph: FamilyGraph): Promise<ContentSearcher> {
    await this.sync(graph);
    return { search: (args) => this.search(graph, args) };
  }

  async search(graph: FamilyGraph, args: { query: string }) {
    const query = args.query?.trim();
    if (!query) throw new ToolError("Thiếu nội dung cần tìm.");
    const [vector] = await this.embedder.embed([query], "query");
    const literal = vectorLiteral(vector!);
    const rows = await this.db.$queryRaw<
      Array<{ personId: string; score: number }>
    >`
      SELECT e."personId", 1 - (e."embedding" <=> ${literal}::vector) AS score
      FROM "PersonEmbedding" e
      JOIN "FamilyTreePerson" ftp
        ON ftp."personId" = e."personId" AND ftp."treeId" = ${graph.snapshot.treeId}
      WHERE e."model" = ${this.modelKey}
      ORDER BY e."embedding" <=> ${literal}::vector
      LIMIT ${TOP_K}`;
    const results = rows.flatMap((row) => {
      // Chỉ trả người có trong snapshot (vừa đọc cùng quyền), văn bản lấy từ dữ liệu hiện tại.
      const person = graph.persons.find((p) => p.id === row.personId);
      const content = person && personDocument(person);
      if (!person || !content) return [];
      return [
        {
          ...graph.summary(person),
          score: Math.round(Number(row.score) * 1000) / 1000,
          content,
        },
      ];
    });
    if (!results.length)
      return {
        results: [],
        note: "Dòng họ chưa có tiểu sử hay nội dung văn bản nào.",
      };
    return { results, note: SEARCH_NOTE };
  }
}
