import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { FamilyGraph, ToolError } from "./family-graph.js";
import type { SnapshotPerson } from "./tree-snapshot.js";

/**
 * Tool `search_content`: tìm theo nghĩa trong tiểu sử, nghề nghiệp, nơi ở.
 * Prototype giữ vector trong bộ nhớ (cache ra file). S03 chuyển sang pgvector.
 */
export type Embedder = {
  embed(texts: string[], kind: "document" | "query"): Promise<number[][]>;
};

/** Văn bản đại diện một người. Null nếu không có gì ngoài tên để tìm. */
export function personDocument(person: SnapshotPerson) {
  const parts = [
    person.occupation && `Nghề nghiệp: ${person.occupation}.`,
    person.hometown && `Quê quán: ${person.hometown}.`,
    person.currentResidence && `Nơi ở hiện tại: ${person.currentResidence}.`,
    person.burialPlace && `Nơi an táng: ${person.burialPlace}.`,
    person.biography && `Tiểu sử: ${person.biography}`,
  ].filter(Boolean);
  return parts.length ? `${person.fullName}. ${parts.join(" ")}` : null;
}

const cosine = (a: number[], b: number[]) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

export class ContentIndex {
  private constructor(
    private readonly graph: FamilyGraph,
    private readonly embedder: Embedder,
    private readonly entries: Array<{
      person: SnapshotPerson;
      text: string;
      vector: number[];
    }>,
  ) {}

  static async build(graph: FamilyGraph, embedder: Embedder) {
    const docs = graph.persons
      .map((person) => ({ person, text: personDocument(person) }))
      .filter((doc): doc is { person: SnapshotPerson; text: string } =>
        Boolean(doc.text),
      );
    const vectors = docs.length
      ? await embedder.embed(
          docs.map((d) => d.text),
          "document",
        )
      : [];
    return new ContentIndex(
      graph,
      embedder,
      docs.map((doc, i) => ({ ...doc, vector: vectors[i]! })),
    );
  }

  async search(args: { query: string }) {
    const query = args.query?.trim();
    if (!query) throw new ToolError("Thiếu nội dung cần tìm.");
    if (!this.entries.length)
      return {
        results: [],
        note: "Dòng họ chưa có tiểu sử hay nội dung văn bản nào.",
      };
    const [vector] = await this.embedder.embed([query], "query");
    const results = this.entries
      .map((entry) => ({ entry, score: cosine(vector!, entry.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ entry, score }) => ({
        ...this.graph.summary(entry.person),
        score: Math.round(score * 1000) / 1000,
        content: entry.text,
      }));
    return {
      results,
      note: "Kết quả xếp theo độ gần nghĩa, không phải kết quả nào cũng liên quan. Chỉ dùng kết quả có nội dung thật sự trả lời câu hỏi.",
    };
  }
}

/** Bọc embedder bằng cache file để không gọi lại API cho văn bản đã embed. */
export async function withFileCache(
  embedder: Embedder,
  filePath: string,
  namespace: string,
): Promise<Embedder> {
  let cache: Record<string, number[]> = {};
  try {
    cache = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    // chưa có cache
  }
  const key = (text: string, kind: string) =>
    `${namespace}:${kind}:${createHash("sha256").update(text).digest("hex")}`;
  return {
    async embed(texts, kind) {
      const missing = texts.filter((t) => !cache[key(t, kind)]);
      if (missing.length) {
        const vectors = await embedder.embed(missing, kind);
        missing.forEach((t, i) => (cache[key(t, kind)] = vectors[i]!));
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify(cache));
      }
      return texts.map((t) => cache[key(t, kind)]!);
    },
  };
}
