import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { snapshotForAi } from "./ai-privacy.js";
import { personDocument } from "./content-search.js";
import { FamilyGraph } from "./family-graph.js";
import { leDinhSnapshot, pid } from "./testing/le-dinh-snapshot.js";
import { findPerson } from "./tools.js";

const snapshot = leDinhSnapshot();
const living = snapshot.persons.filter(
  (p) => !p.isDeceased && (p.occupation || p.biography || p.currentResidence),
);
const deceased = snapshot.persons.find((p) => p.isDeceased && p.biography)!;
const hidden = () =>
  snapshotForAi(snapshot, { aiShareLivingDetails: false }, null);

describe("snapshotForAi (LMS-023)", () => {
  it("dữ liệu mẫu có người còn sống mang chi tiết để kiểm", () => {
    assert.ok(living.length > 0);
    assert.ok(deceased);
  });

  it("mặc định ẩn nghề nghiệp, nơi ở, tiểu sử và rút ngày sinh về năm của người còn sống", () => {
    const redacted = hidden();
    for (const original of living) {
      const person = redacted.persons.find((p) => p.id === original.id)!;
      assert.equal(person.detailsHidden, true);
      assert.equal(person.occupation, null);
      assert.equal(person.currentResidence, null);
      assert.equal(person.biography, null);
      assert.equal(person.fullName, original.fullName);
      assert.equal(person.hometown, original.hometown);
      if (original.birthDate) {
        assert.equal(person.birthDatePrecision, "YEAR");
        assert.equal(
          person.birthDate!.getUTCFullYear(),
          original.birthDate.getUTCFullYear(),
        );
        assert.equal(person.birthDate!.getUTCMonth(), 0);
        assert.equal(person.birthDate!.getUTCDate(), 1);
      }
    }
    // không sửa snapshot gốc
    assert.ok(living.some((p) => p.occupation || p.biography));
    assert.equal(living[0]!.detailsHidden, undefined);
  });

  it("người đã mất và chính người đang hỏi giữ nguyên", () => {
    const me = living[0]!;
    const redacted = snapshotForAi(
      snapshot,
      { aiShareLivingDetails: false },
      me.id,
    );
    assert.deepEqual(
      redacted.persons.find((p) => p.id === deceased.id),
      deceased,
    );
    assert.deepEqual(
      redacted.persons.find((p) => p.id === me.id),
      me,
    );
  });

  it("Admin chọn chia sẻ chi tiết thì gửi nguyên snapshot", () => {
    assert.equal(
      snapshotForAi(snapshot, { aiShareLivingDetails: true }, null),
      snapshot,
    );
  });

  it("tool và văn bản embedding chỉ thấy bản đã ẩn", () => {
    const graph = new FamilyGraph(hidden(), {
      treeId: snapshot.treeId,
      userId: "u",
      mePersonId: pid("minh"),
    });
    for (const original of living) {
      if (original.id === pid("minh")) continue;
      const person = graph.person(original.id);
      const document = personDocument(person) ?? "";
      if (original.biography) assert.ok(!document.includes(original.biography));
      if (original.currentResidence)
        assert.ok(!document.includes(original.currentResidence));
      if (original.occupation)
        assert.ok(!document.includes(original.occupation));
      assert.equal(graph.summary(person).detailsHidden, true);
    }
    const other = living.find((p) => p.id !== pid("minh"))!;
    const found = findPerson(graph, { name: other.fullName });
    assert.equal(found.matches[0]!.occupation, null);
  });
});
