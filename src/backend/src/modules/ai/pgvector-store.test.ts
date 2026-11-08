import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { personDocument, type Embedder } from "./content-search.js";
import { FamilyGraph } from "./family-graph.js";
import {
  EMBEDDING_DIMENSIONS,
  PgVectorContentStore,
  contentHash,
  planSync,
} from "./pgvector-store.js";
import { askAs, leDinhSnapshot, pid } from "./testing/le-dinh-snapshot.js";

const MODEL = "fake-embedding@768";
const graph = () => new FamilyGraph(leDinhSnapshot(), askAs("minh"));

/** Toàn bộ hash đúng như sau một lần sync. */
const freshHashes = (g: FamilyGraph) =>
  new Map(
    g.persons.flatMap((p) => {
      const text = personDocument(p);
      return text ? [[p.id, contentHash(MODEL, text)] as const] : [];
    }),
  );

describe("planSync", () => {
  it("lần đầu embed mọi người có văn bản, bỏ qua người chỉ có tên", () => {
    const g = graph();
    const { toEmbed, toDelete } = planSync(g, MODEL, new Map());
    const withText = g.persons.filter((p) => personDocument(p));
    assert.equal(toEmbed.length, withText.length);
    assert.ok(toEmbed.length > 0 && toEmbed.length <= g.persons.length);
    assert.equal(toDelete.length, 0);
  });

  it("không có gì đổi thì không embed lại", () => {
    const g = graph();
    const plan = planSync(g, MODEL, freshHashes(g));
    assert.deepEqual(plan, { toEmbed: [], toDelete: [] });
  });

  it("đổi tiểu sử của một người thì chỉ embed lại người đó", () => {
    const snapshot = leDinhSnapshot();
    const stored = freshHashes(new FamilyGraph(snapshot, askAs("minh")));
    const dung = snapshot.persons.find((p) => p.id === pid("dung"))!;
    dung.biography = `${dung.biography ?? ""} Được truy tặng huân chương.`;
    const plan = planSync(
      new FamilyGraph(snapshot, askAs("minh")),
      MODEL,
      stored,
    );
    assert.deepEqual(
      plan.toEmbed.map((d) => d.personId),
      [pid("dung")],
    );
  });

  it("xóa hết văn bản thì xóa embedding; đổi model thì embed lại tất cả", () => {
    const snapshot = leDinhSnapshot();
    const stored = freshHashes(graph());
    assert.equal(
      planSync(graph(), "other-model@768", stored).toEmbed.length,
      stored.size,
    );
    const dung = snapshot.persons.find((p) => p.id === pid("dung"))!;
    Object.assign(dung, {
      biography: null,
      occupation: null,
      hometown: null,
      currentResidence: null,
      burialPlace: null,
    });
    const plan = planSync(
      new FamilyGraph(snapshot, askAs("minh")),
      MODEL,
      stored,
    );
    assert.deepEqual(plan.toDelete, [pid("dung")]);
  });
});

describe("PgVectorContentStore", () => {
  const embedder: Embedder = {
    async embed(texts) {
      return texts.map(() => Array(EMBEDDING_DIMENSIONS).fill(0.1));
    },
  };

  /** DB giả: ghi lại câu SQL, trả kết quả soạn sẵn. */
  function fakeDb(rows: unknown[]) {
    const queries: Array<{ sql: string; values: unknown[] }> = [];
    const record = (strings: TemplateStringsArray, ...values: unknown[]) => {
      queries.push({ sql: strings.join("?"), values });
    };
    return {
      queries,
      $queryRaw: async (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) => {
        record(strings, ...values);
        return rows;
      },
      $executeRaw: async (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) => {
        record(strings, ...values);
        return 1;
      },
    };
  }

  it("tìm kiếm lọc theo dòng họ đang hỏi và bỏ người không có trong snapshot", async () => {
    const g = graph();
    const db = fakeDb([
      { personId: pid("dung"), score: 0.8123 },
      { personId: "person-of-other-tree", score: 0.7 },
    ]);
    const store = new PgVectorContentStore(db as never, embedder, MODEL);
    const { results } = (await store.search(g, { query: "bộ đội" })) as {
      results: Array<{ name: string; score: number; content: string }>;
    };
    assert.deepEqual(
      results.map((r) => [r.name, r.score]),
      [["Lê Đình Dũng", 0.812]],
    );
    const sql = db.queries[0]!;
    assert.match(sql.sql, /JOIN "FamilyTreePerson"/);
    assert.ok(sql.values.includes(g.snapshot.treeId));
    assert.ok(sql.values.includes(MODEL));
  });

  it("embedding sai số chiều thì báo lỗi rõ ràng", async () => {
    const store = new PgVectorContentStore(
      fakeDb([]) as never,
      { embed: async (texts) => texts.map(() => [1, 2, 3]) },
      MODEL,
    );
    await assert.rejects(
      store.search(graph(), { query: "x" }),
      /GEMINI_EMBEDDING_DIMENSIONS/,
    );
  });
});
