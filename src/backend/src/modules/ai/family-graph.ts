import type {
  AskContext,
  SnapshotPerson,
  SnapshotRelationship,
  TreeSnapshot,
} from "./tree-snapshot.js";

/** Lỗi trả về cho LLM dưới dạng kết quả tool, không làm hỏng cả lượt hỏi. */
export class ToolError extends Error {}

/** Bỏ dấu, viết thường, gộp khoảng trắng: "Lê Đình  Khang" → "le dinh khang". */
export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

type ParentEdge = {
  personId: string;
  kind: SnapshotRelationship["parentKind"];
  birthOrder: number | null;
};
type SpouseEdge = {
  personId: string;
  status: SnapshotRelationship["marriageStatus"];
  order: number | null;
};

const formatDate = (
  date: Date | null,
  precision: SnapshotPerson["birthDatePrecision"],
) => {
  if (!date) return null;
  const iso = date.toISOString();
  if (precision === "YEAR") return iso.slice(0, 4);
  if (precision === "MONTH") return iso.slice(0, 7);
  return iso.slice(0, 10);
};

/** Tuổi tròn. Chỉ tính theo ngày khi cả hai mốc đủ ngày, còn lại lấy hiệu số năm. */
export function yearsBetween(
  start: Date,
  startPrecision: SnapshotPerson["birthDatePrecision"],
  end: Date,
  endPrecision: SnapshotPerson["birthDatePrecision"],
) {
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  if (startPrecision !== "DAY" || endPrecision !== "DAY") return years;
  const beforeBirthday =
    end.getUTCMonth() < start.getUTCMonth() ||
    (end.getUTCMonth() === start.getUTCMonth() &&
      end.getUTCDate() < start.getUTCDate());
  return beforeBirthday ? years - 1 : years;
}

/** Đồ thị một dòng họ, dựng từ snapshot. Mọi tool của chatbot đi qua lớp này. */
export class FamilyGraph {
  private readonly byId = new Map<string, SnapshotPerson>();
  private readonly parents = new Map<string, ParentEdge[]>();
  private readonly children = new Map<string, ParentEdge[]>();
  private readonly spouses = new Map<string, SpouseEdge[]>();
  private readonly generations = new Map<string, number>();

  constructor(
    readonly snapshot: TreeSnapshot,
    readonly context: AskContext,
    private readonly now = new Date(),
  ) {
    for (const person of snapshot.persons) this.byId.set(person.id, person);
    const push = <T>(map: Map<string, T[]>, key: string, value: T) =>
      map.set(key, [...(map.get(key) ?? []), value]);
    for (const rel of snapshot.relationships) {
      if (!this.byId.has(rel.fromPersonId) || !this.byId.has(rel.toPersonId))
        continue;
      if (rel.typeCode === "PARENT_CHILD") {
        push(this.parents, rel.toPersonId, {
          personId: rel.fromPersonId,
          kind: rel.parentKind,
          birthOrder: rel.birthOrder,
        });
        push(this.children, rel.fromPersonId, {
          personId: rel.toPersonId,
          kind: rel.parentKind,
          birthOrder: rel.birthOrder,
        });
      } else if (rel.typeCode === "SPOUSE") {
        const edge = { status: rel.marriageStatus, order: rel.marriageOrder };
        push(this.spouses, rel.fromPersonId, {
          personId: rel.toPersonId,
          ...edge,
        });
        push(this.spouses, rel.toPersonId, {
          personId: rel.fromPersonId,
          ...edge,
        });
      }
    }
  }

  get persons() {
    return this.snapshot.persons;
  }

  /** "me" là người đang hỏi. Id ngoài dòng họ bị từ chối, kể cả khi tồn tại ở dòng họ khác. */
  person(idOrMe: string) {
    const id = idOrMe === "me" ? this.context.mePersonId : idOrMe;
    if (!id)
      throw new ToolError(
        'Tài khoản đang hỏi chưa được gắn với hồ sơ nào trong gia phả, nên không biết "tôi" là ai.',
      );
    const person = this.byId.get(id);
    if (!person)
      throw new ToolError(
        `Không có người với id "${idOrMe}" trong dòng họ này. Hãy dùng find_person để lấy đúng personId.`,
      );
    return person;
  }

  parentsOf(id: string) {
    return this.parents.get(id) ?? [];
  }

  childrenOf(id: string) {
    return this.children.get(id) ?? [];
  }

  spousesOf(id: string) {
    return this.spouses.get(id) ?? [];
  }

  /**
   * Đời thứ mấy: tổ không có cha mẹ là đời 1, con là đời cha mẹ + 1.
   * Người lấy vào họ (không có cha mẹ trong cây) tính cùng đời với vợ/chồng.
   */
  generation(id: string): number {
    const cached = this.generations.get(id);
    if (cached !== undefined) return cached;
    this.generations.set(id, 1); // chặn vòng lặp nếu dữ liệu lỗi
    const parents = this.parentsOf(id);
    let value = 1;
    if (parents.length)
      value = 1 + Math.max(...parents.map((p) => this.generation(p.personId)));
    else {
      const spouseWithParents = this.spousesOf(id).find(
        (s) => this.parentsOf(s.personId).length,
      );
      if (spouseWithParents)
        value = this.generation(spouseWithParents.personId);
    }
    this.generations.set(id, value);
    return value;
  }

  age(person: SnapshotPerson) {
    if (!person.birthDate) return null;
    if (person.isDeceased)
      return person.deathDate
        ? yearsBetween(
            person.birthDate,
            person.birthDatePrecision,
            person.deathDate,
            person.deathDatePrecision,
          )
        : null;
    return yearsBetween(
      person.birthDate,
      person.birthDatePrecision,
      this.now,
      "DAY",
    );
  }

  /** So ai lớn hơn: theo ngày sinh, thiếu thì theo thứ tự con trong nhà. Null nếu không biết. */
  isOlder(a: string, b: string): boolean | null {
    const pa = this.byId.get(a)!;
    const pb = this.byId.get(b)!;
    if (
      pa.birthDate &&
      pb.birthDate &&
      pa.birthDate.getTime() !== pb.birthDate.getTime()
    )
      return pa.birthDate < pb.birthDate;
    const sharedParent = this.parentsOf(a).find((p) =>
      this.parentsOf(b).some((q) => q.personId === p.personId),
    );
    if (!sharedParent) return null;
    const orderA = sharedParent.birthOrder;
    const orderB = this.parentsOf(b).find(
      (q) => q.personId === sharedParent.personId,
    )!.birthOrder;
    if (orderA === null || orderB === null || orderA === orderB) return null;
    return orderA < orderB;
  }

  link(id: string) {
    return `/trees/${this.snapshot.treeId}/persons/${id}`;
  }

  /** Tóm tắt một người để trả cho LLM. Luôn kèm personId và link hồ sơ. */
  summary(person: SnapshotPerson) {
    return {
      personId: person.id,
      name: person.fullName,
      ...(person.id === this.context.mePersonId ? { isMe: true } : {}),
      gender:
        person.gender === "MALE"
          ? "nam"
          : person.gender === "FEMALE"
            ? "nữ"
            : "không rõ",
      born: formatDate(person.birthDate, person.birthDatePrecision),
      died: person.isDeceased
        ? (formatDate(person.deathDate, person.deathDatePrecision) ??
          "đã mất, không rõ năm")
        : null,
      age: this.age(person),
      generation: this.generation(person.id),
      link: this.link(person.id),
    };
  }
}
