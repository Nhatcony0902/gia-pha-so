import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyGraph, ToolError, normalizeText } from "./family-graph.js";
import { askAs, leDinhSnapshot, pid } from "./testing/le-dinh-snapshot.js";
import {
  findPerson,
  findRelationship,
  getRelatives,
  getStats,
} from "./tools.js";

const NOW = new Date("2026-10-29T00:00:00.000Z");
const graphAs = (key: string | null = "minh") =>
  new FamilyGraph(leDinhSnapshot(), askAs(key), NOW);
const names = (items: Array<{ name: string }>) => items.map((i) => i.name);

describe("find_person", () => {
  const graph = graphAs();

  it('bỏ dấu và từ xưng hô: "cụ đồ khang" ra Lê Đình Khang', () => {
    assert.equal(normalizeText("Lê Đình  KHANG"), "le dinh khang");
    assert.deepEqual(
      names(findPerson(graph, { name: "cụ đồ khang" }).matches),
      ["Lê Đình Khang"],
    );
    assert.deepEqual(names(findPerson(graph, { name: "bac Phuc" }).matches), [
      "Lê Đình Phúc",
    ]);
  });

  it("trùng tên thì trả hết và nhắc hỏi lại", () => {
    const result = findPerson(graph, { name: "Bảo" });
    assert.deepEqual(names(result.matches).sort(), [
      "Lê Đình Bảo",
      "Nguyễn Văn Bảo",
    ]);
    assert.ok(result.note);
  });

  it("không có ai thì trả danh sách rỗng, không đoán", () => {
    assert.deepEqual(findPerson(graph, { name: "Lê Đình Hoàng" }).matches, []);
    assert.deepEqual(findPerson(graph, { name: "William" }).matches, []);
  });

  it("đánh dấu người đang hỏi và kèm link hồ sơ", () => {
    const [minh] = findPerson(graph, { name: "Lê Đình Minh" }).matches;
    assert.equal(minh!.isMe, true);
    assert.equal(
      minh!.link,
      `/trees/seed-tree-le-dinh-an-phu/persons/${pid("minh")}`,
    );
  });
});

describe("get_relatives", () => {
  const graph = graphAs();
  const relatives = (
    personId: string,
    relation: "parents" | "children" | "spouses" | "siblings",
  ) =>
    getRelatives(graph, { personId, relation }).relatives as unknown as Array<
      Record<string, unknown> & { name: string }
    >;

  it("ông bà nội của Minh đi qua cha: Thọ → Khang và Hiền (không phải Lụa)", () => {
    assert.deepEqual(names(relatives("me", "parents")).sort(), [
      "Bùi Thị Hoa",
      "Lê Đình Thọ",
    ]);
    assert.deepEqual(names(relatives(pid("tho"), "parents")).sort(), [
      "Lê Đình Khang",
      "Đỗ Thị Hiền",
    ]);
  });

  it("anh chị em: ruột, cùng cha khác mẹ, nuôi", () => {
    const ofMinh = relatives("me", "siblings");
    assert.deepEqual(names(ofMinh), ["Lê Đình Quang", "Lê Thị Thảo"]);
    assert.ok(
      ofMinh.every(
        (s) =>
          s.siblingType === "anh chị em ruột (cùng cha mẹ)" &&
          s.comparedToPerson === "nhỏ hơn",
      ),
    );

    const ofTho = relatives(pid("tho"), "siblings");
    const phuc = ofTho.find((s) => s.name === "Lê Đình Phúc")!;
    assert.equal(phuc.siblingType, "cùng cha khác mẹ");
    assert.equal(phuc.comparedToPerson, "lớn hơn");
    assert.equal(
      ofTho.find((s) => s.name === "Lê Thị Hạnh")!.comparedToPerson,
      "nhỏ hơn",
    );

    const ofNgoc = relatives(pid("ngoc"), "siblings");
    assert.equal(
      ofNgoc.find((s) => s.name === "Lê Đình An")!.siblingType,
      "anh chị em nuôi",
    );
  });

  it("con nuôi được ghi rõ", () => {
    const ofLoc = relatives(pid("loc"), "children");
    assert.deepEqual(names(ofLoc), [
      "Lê Đình Toàn",
      "Lê Thị Ngọc",
      "Lê Đình An",
    ]);
    assert.equal(
      ofLoc.find((c) => c.name === "Lê Đình An")!.link_type,
      "con nuôi",
    );
  });

  it("vợ chồng theo thứ tự, có trạng thái hôn nhân", () => {
    const wives = relatives(pid("khang"), "spouses");
    assert.deepEqual(names(wives), ["Phạm Thị Lụa", "Đỗ Thị Hiền"]);
    assert.equal(
      relatives(pid("loc"), "spouses")[0]!.marriageStatus,
      "đã ly hôn",
    );
    assert.deepEqual(names(relatives(pid("quang"), "spouses")), [
      "Đặng Thị Vân",
    ]);
  });

  it("personId ngoài dòng họ bị từ chối", () => {
    assert.throws(
      () =>
        getRelatives(graph, {
          personId: "seed-person-william",
          relation: "parents",
        }),
      ToolError,
    );
  });

  it('tài khoản chưa gắn hồ sơ thì "me" báo lỗi rõ ràng', () => {
    assert.throws(
      () =>
        getRelatives(graphAs(null), { personId: "me", relation: "parents" }),
      /chưa được gắn/,
    );
  });
});

describe("find_relationship", () => {
  const graph = graphAs();
  const analysis = (to: string) =>
    findRelationship(graph, { fromPersonId: "me", toPersonId: pid(to) })
      .analysis as Record<string, any>;

  it("bác Phúc: lên 2 đời tới cụ Khang, xuống 1, nhánh Phúc lớn hơn, cùng cha khác mẹ", () => {
    const a = analysis("phuc");
    assert.equal(a.generationsUpFromFirstPerson, 2);
    assert.equal(a.generationsDownToSecondPerson, 1);
    assert.equal(a.side, "bên nội (họ cha)");
    assert.equal(a.commonAncestor.name, "Lê Đình Khang");
    assert.equal(a.branches.olderBranch, "Lê Đình Phúc");
    assert.equal(a.branches.halfSiblings, true);
  });

  it("cô Hạnh: nhánh bố lớn hơn", () => {
    assert.equal(analysis("hanh").branches.olderBranch, "Lê Đình Thọ");
  });

  it("anh họ Hùng và chị họ Thu: cùng đời, nhánh bên kia lớn hơn", () => {
    for (const [key, branch] of [
      ["hung", "Lê Đình Phúc"],
      ["thu", "Lê Thị Mai"],
    ] as const) {
      const a = analysis(key);
      assert.equal(a.generationsUpFromFirstPerson, 2);
      assert.equal(a.generationsDownToSecondPerson, 2);
      assert.equal(a.branches.olderBranch, branch);
    }
  });

  it("đường thẳng: Nam lên 3 đời là cụ Khang", () => {
    const result = findRelationship(graphAs("nam"), {
      fromPersonId: "me",
      toPersonId: pid("khang"),
    });
    assert.equal(
      (result.analysis as Record<string, unknown>).generationsUpFromFirstPerson,
      3,
    );
    assert.equal(
      (result.analysis as Record<string, unknown>)
        .generationsDownToSecondPerson,
      0,
    );
  });

  it("quan hệ thông gia đi qua hôn nhân", () => {
    const result = findRelationship(graph, {
      fromPersonId: "me",
      toPersonId: pid("van"),
    });
    assert.equal(
      (result.analysis as Record<string, unknown>).viaMarriage,
      true,
    );
    assert.equal(result.path!.at(-1), "Đặng Thị Vân là vợ của Lê Đình Quang");
  });
});

describe("get_stats", () => {
  const graph = graphAs();

  it("tổng quan: 54 người, 26 nam, 28 nữ, 10 đã mất, 5 đời", () => {
    const o = getStats(graph, { metric: "overview" }) as Record<string, any>;
    assert.equal(o.total, 54);
    assert.equal(o.male, 26);
    assert.equal(o.female, 28);
    assert.equal(o.deceased, 10);
    assert.equal(o.generations, 5);
    assert.deepEqual(
      o.perGeneration.map((g: { count: number }) => g.count),
      [3, 11, 21, 14, 5],
    );
  });

  it("sống thọ nhất: cụ Hiền 94 tuổi", () => {
    const [first, second] = (
      getStats(graph, { metric: "longest_lived" }) as any
    ).ranking;
    assert.equal(first.name, "Đỗ Thị Hiền");
    assert.equal(first.age, 94);
    assert.equal(second.name, "Vũ Thị Tâm");
    assert.equal(second.age, 88);
  });

  it("lớn tuổi nhất còn sống: Lê Đình Thọ", () => {
    const [first] = (getStats(graph, { metric: "oldest_living" }) as any)
      .ranking;
    assert.equal(first.name, "Lê Đình Thọ");
    assert.equal(first.age, 81);
  });

  it("nhiều con nhất: cụ Khang 5 con", () => {
    const [first] = (getStats(graph, { metric: "most_children" }) as any)
      .ranking;
    assert.equal(first.name, "Lê Đình Khang");
    assert.equal(first.children, 5);
  });

  it("metric lạ bị từ chối", () => {
    assert.throws(
      () => getStats(graph, { metric: "richest" as never }),
      ToolError,
    );
  });
});

describe("đáp án câu ghép trong bộ đánh giá", () => {
  const graph = graphAs();

  it("Q23: cháu nội sinh sớm nhất của cụ Khang là Lê Đình Hùng", () => {
    const sons = (
      getRelatives(graph, { personId: pid("khang"), relation: "children" })
        .relatives as any[]
    ).filter((c) => c.gender === "nam");
    const grandchildren = sons.flatMap(
      (son) =>
        getRelatives(graph, { personId: son.personId, relation: "children" })
          .relatives as any[],
    );
    grandchildren.sort((a, b) => a.born.localeCompare(b.born));
    assert.equal(grandchildren[0].name, "Lê Đình Hùng");
  });
});
