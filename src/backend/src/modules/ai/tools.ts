import { FamilyGraph, ToolError, normalizeText } from "./family-graph.js";

/**
 * Các tool có cấu trúc của chatbot (ADR-0004). Hàm thuần trên FamilyGraph, test được không cần LLM.
 * `search_content` cần embedding nên nằm ở content-search.ts.
 */

const HONORIFICS = new Set([
  "cu",
  "ong",
  "ba",
  "bac",
  "chu",
  "co",
  "di",
  "cau",
  "thim",
  "mo",
  "anh",
  "chi",
  "em",
  "chau",
  "giao",
  "do",
]);

export function findPerson(graph: FamilyGraph, args: { name: string }) {
  const tokens = normalizeText(args.name ?? "")
    .split(" ")
    .filter(Boolean);
  // "bác Phúc", "cụ Khang" → bỏ từ xưng hô ở đầu, nhưng giữ lại nếu cả câu chỉ có từ xưng hô
  while (tokens.length > 1 && HONORIFICS.has(tokens[0]!)) tokens.shift();
  if (!tokens.length) throw new ToolError("Thiếu tên cần tìm.");
  const query = tokens.join(" ");

  const score = (candidate: string) => {
    const name = normalizeText(candidate);
    if (name === query) return 3;
    if (name.endsWith(` ${query}`)) return 2; // khớp tên gọi: "Minh" → "Lê Đình Minh"
    return ` ${name} `.includes(` ${query} `) ? 1 : 0;
  };
  const matches = graph.persons
    .map((person) => ({
      person,
      score: Math.max(
        ...[person.fullName, person.preferredName ?? "", ...person.aliases]
          .filter(Boolean)
          .map(score),
      ),
    }))
    .filter((match) => match.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        graph.generation(a.person.id) - graph.generation(b.person.id),
    )
    .slice(0, 10);

  if (!matches.length)
    return {
      matches: [],
      note: `Không có ai tên "${args.name}" trong dòng họ này.`,
    };
  return {
    matches: matches.map(({ person }) => ({
      ...graph.summary(person),
      aliases: person.aliases,
      occupation: person.occupation,
    })),
    ...(matches.length > 1
      ? {
          note: "Có nhiều người khớp tên. Nếu câu hỏi không đủ để phân biệt, hãy hỏi lại người dùng.",
        }
      : {}),
  };
}

const RELATIONS = ["parents", "children", "spouses", "siblings"] as const;
type Relation = (typeof RELATIONS)[number];

const kindLabel = (kind: string | null) =>
  kind === "ADOPTIVE" ? "con nuôi" : "con ruột";
const marriageLabel: Record<string, string> = {
  MARRIED: "đang là vợ chồng",
  DIVORCED: "đã ly hôn",
  SEPARATED: "đã ly thân",
  WIDOWED: "đến khi một người mất",
};

export function getRelatives(
  graph: FamilyGraph,
  args: { personId: string; relation: Relation },
) {
  if (!RELATIONS.includes(args.relation))
    throw new ToolError(`relation phải là một trong: ${RELATIONS.join(", ")}`);
  const person = graph.person(args.personId);
  const id = person.id;
  const byBirth = <T extends { born: string | null }>(items: T[]) =>
    [...items].sort((a, b) =>
      (a.born ?? "9999").localeCompare(b.born ?? "9999"),
    );

  let relatives: Array<Record<string, unknown> & { born: string | null }>;
  if (args.relation === "parents")
    relatives = graph.parentsOf(id).map((edge) => ({
      ...graph.summary(graph.person(edge.personId)),
      link_type: edge.kind === "ADOPTIVE" ? "cha/mẹ nuôi" : "cha/mẹ ruột",
    }));
  else if (args.relation === "children")
    relatives = byBirth(
      graph.childrenOf(id).map((edge) => ({
        ...graph.summary(graph.person(edge.personId)),
        link_type: kindLabel(edge.kind),
        birthOrder: edge.birthOrder,
      })),
    );
  else if (args.relation === "spouses")
    relatives = graph
      .spousesOf(id)
      .sort((a, b) => (a.order ?? 1) - (b.order ?? 1))
      .map((edge) => ({
        ...graph.summary(graph.person(edge.personId)),
        marriageOrder: edge.order,
        marriageStatus: edge.status ? marriageLabel[edge.status] : null,
      }));
  else {
    const myParents = graph.parentsOf(id);
    const siblingIds = new Set(
      myParents.flatMap((p) =>
        graph.childrenOf(p.personId).map((c) => c.personId),
      ),
    );
    siblingIds.delete(id);
    relatives = byBirth(
      [...siblingIds].map((siblingId) => {
        const theirParents = graph.parentsOf(siblingId);
        const shared = myParents.filter((p) =>
          theirParents.some((q) => q.personId === p.personId),
        );
        const adopted = [...myParents, ...theirParents].some(
          (p) => p.kind === "ADOPTIVE",
        );
        const sharedGender = shared.map((p) => graph.person(p.personId).gender);
        const type = adopted
          ? "anh chị em nuôi"
          : shared.length >= 2 &&
              myParents.length === shared.length &&
              theirParents.length === shared.length
            ? "anh chị em ruột (cùng cha mẹ)"
            : sharedGender.includes("MALE")
              ? "cùng cha khác mẹ"
              : "cùng mẹ khác cha";
        const older = graph.isOlder(siblingId, id);
        return {
          ...graph.summary(graph.person(siblingId)),
          siblingType: type,
          comparedToPerson:
            older === null
              ? "không rõ lớn hay nhỏ hơn"
              : older
                ? "lớn hơn"
                : "nhỏ hơn",
        };
      }),
    );
  }
  return {
    person: graph.summary(person),
    relation: args.relation,
    relatives,
    ...(relatives.length ? {} : { note: "Không có dữ liệu cho quan hệ này." }),
  };
}

type Step = { id: string; via: "parent" | "child" | "spouse" };

/**
 * BFS tìm đường ngắn nhất.
 * - bloodOnly: chỉ đi lên tổ tiên rồi xuống (lên* xuống*), tức quan hệ máu mủ/nuôi dưỡng qua tổ tiên chung.
 * - còn lại: đi tự do, kể cả qua hôn nhân (thông gia, dâu rể).
 */
function shortestPath(
  graph: FamilyGraph,
  from: string,
  to: string,
  bloodOnly: boolean,
) {
  type State = { id: string; down: boolean };
  const key = (s: State) => `${s.id}|${bloodOnly && s.down ? "down" : "up"}`;
  const previous = new Map<string, { step: Step; prev: string | null }>();
  const start: State = { id: from, down: false };
  previous.set(key(start), { step: { id: from, via: "parent" }, prev: null });
  const queue: State[] = [start];
  let goal: string | null = null;
  while (queue.length) {
    const current = queue.shift()!;
    if (current.id === to) {
      goal = key(current);
      break;
    }
    const next: Array<Step & { down: boolean }> = [
      ...(bloodOnly && current.down
        ? []
        : graph
            .parentsOf(current.id)
            .map((e) => ({
              id: e.personId,
              via: "parent" as const,
              down: false,
            }))),
      ...graph
        .childrenOf(current.id)
        .map((e) => ({ id: e.personId, via: "child" as const, down: true })),
      ...(bloodOnly
        ? []
        : graph
            .spousesOf(current.id)
            .map((e) => ({
              id: e.personId,
              via: "spouse" as const,
              down: true,
            }))),
    ];
    for (const { down, ...step } of next) {
      const state = { id: step.id, down };
      if (previous.has(key(state))) continue;
      previous.set(key(state), { step, prev: key(current) });
      queue.push(state);
    }
  }
  if (!goal) return null;
  const steps: Step[] = [];
  for (
    let node = previous.get(goal)!;
    node.prev !== null;
    node = previous.get(node.prev)!
  )
    steps.unshift(node.step);
  return steps;
}

const stepLabel = (via: Step["via"], gender: string) => {
  if (via === "parent") return gender === "FEMALE" ? "mẹ" : "cha";
  if (via === "child") return gender === "FEMALE" ? "con gái" : "con trai";
  return gender === "FEMALE" ? "vợ" : "chồng";
};

export function findRelationship(
  graph: FamilyGraph,
  args: { fromPersonId: string; toPersonId: string },
) {
  const from = graph.person(args.fromPersonId);
  const to = graph.person(args.toPersonId);
  if (from.id === to.id) throw new ToolError("Hai người là cùng một người.");
  const steps =
    shortestPath(graph, from.id, to.id, true) ??
    shortestPath(graph, from.id, to.id, false);
  if (!steps)
    return {
      from: graph.summary(from),
      to: graph.summary(to),
      related: false,
      note: "Không tìm thấy đường quan hệ nào giữa hai người trong dòng họ.",
    };

  let previousName = from.fullName;
  const path = steps.map((step) => {
    const person = graph.person(step.id);
    const line = `${person.fullName} là ${stepLabel(step.via, person.gender)} của ${previousName}`;
    previousName = person.fullName;
    return line;
  });

  const ups = steps.findIndex((s) => s.via !== "parent");
  const up = ups === -1 ? steps.length : ups;
  const rest = steps.slice(up);
  const bloodLine = rest.every((s) => s.via === "child");
  const analysis: Record<string, unknown> = {
    generationsUpFromFirstPerson: up,
    generationsDownToSecondPerson: bloodLine ? rest.length : null,
    viaMarriage: !bloodLine,
  };
  if (up > 0) {
    const firstParent = graph.person(steps[0]!.id);
    analysis.side =
      firstParent.gender === "FEMALE"
        ? "bên ngoại (họ mẹ)"
        : "bên nội (họ cha)";
  }
  if (bloodLine && up > 0 && rest.length > 0) {
    const ancestor = graph.person(steps[up - 1]!.id);
    const fromBranch = up >= 2 ? steps[up - 2]!.id : from.id;
    const toBranch = steps[up]!.id;
    const older = graph.isOlder(fromBranch, toBranch);
    const sharedParents = graph
      .parentsOf(fromBranch)
      .filter((p) =>
        graph.parentsOf(toBranch).some((q) => q.personId === p.personId),
      );
    analysis.commonAncestor = graph.summary(ancestor);
    analysis.branches = {
      firstPersonBranch: graph.person(fromBranch).fullName,
      secondPersonBranch: graph.person(toBranch).fullName,
      olderBranch:
        older === null
          ? "không rõ"
          : older
            ? graph.person(fromBranch).fullName
            : graph.person(toBranch).fullName,
      halfSiblings: sharedParents.length === 1,
    };
  }
  return {
    from: graph.summary(from),
    to: graph.summary(to),
    related: true,
    path,
    analysis,
    note: "Chưa có quy tắc xưng hô tất định (LMS-007). Suy ra cách gọi từ path và analysis theo quy tắc trong hướng dẫn.",
  };
}

const METRICS = [
  "overview",
  "longest_lived",
  "oldest_living",
  "youngest_living",
  "most_children",
  "average_lifespan",
] as const;
type Metric = (typeof METRICS)[number];

export function getStats(graph: FamilyGraph, args: { metric: Metric }) {
  if (!METRICS.includes(args.metric))
    throw new ToolError(`metric phải là một trong: ${METRICS.join(", ")}`);
  const persons = graph.persons;
  const living = persons.filter((p) => !p.isDeceased);
  const deceasedWithAge = persons
    .filter((p) => p.isDeceased && graph.age(p) !== null)
    .map((p) => ({ person: p, age: graph.age(p)! }));
  const top = <T>(items: T[]) => items.slice(0, 5);

  switch (args.metric) {
    case "overview": {
      const perGeneration = new Map<number, number>();
      for (const p of persons) {
        const g = graph.generation(p.id);
        perGeneration.set(g, (perGeneration.get(g) ?? 0) + 1);
      }
      return {
        metric: args.metric,
        treeName: graph.snapshot.treeName,
        total: persons.length,
        male: persons.filter((p) => p.gender === "MALE").length,
        female: persons.filter((p) => p.gender === "FEMALE").length,
        unknownGender: persons.filter(
          (p) => p.gender !== "MALE" && p.gender !== "FEMALE",
        ).length,
        living: living.length,
        deceased: persons.length - living.length,
        generations: perGeneration.size,
        perGeneration: [...perGeneration.entries()]
          .sort(([a], [b]) => a - b)
          .map(([generation, count]) => ({ generation, count })),
        note: "Số người tính cả người lấy vào họ (vợ/chồng), họ được xếp cùng đời với vợ/chồng.",
      };
    }
    case "longest_lived":
      return {
        metric: args.metric,
        ranking: top(deceasedWithAge.sort((a, b) => b.age - a.age)).map(
          ({ person }) => graph.summary(person),
        ),
        missingData: persons.filter(
          (p) => p.isDeceased && graph.age(p) === null,
        ).length,
      };
    case "oldest_living":
    case "youngest_living": {
      const known = living.filter((p) => p.birthDate);
      known.sort((a, b) => a.birthDate!.getTime() - b.birthDate!.getTime());
      if (args.metric === "youngest_living") known.reverse();
      return {
        metric: args.metric,
        ranking: top(known).map((p) => graph.summary(p)),
        missingData: living.length - known.length,
      };
    }
    case "most_children": {
      const counts = persons
        .map((p) => {
          const kids = graph.childrenOf(p.id);
          return {
            person: p,
            total: kids.length,
            adopted: kids.filter((k) => k.kind === "ADOPTIVE").length,
          };
        })
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total);
      return {
        metric: args.metric,
        ranking: top(counts).map((c) => ({
          ...graph.summary(c.person),
          children: c.total,
          adoptedChildren: c.adopted,
        })),
      };
    }
    case "average_lifespan": {
      const total = deceasedWithAge.reduce((sum, item) => sum + item.age, 0);
      return {
        metric: args.metric,
        averageLifespan: deceasedWithAge.length
          ? Math.round((total / deceasedWithAge.length) * 10) / 10
          : null,
        basedOn: deceasedWithAge.length,
        missingData: persons.filter(
          (p) => p.isDeceased && graph.age(p) === null,
        ).length,
      };
    }
  }
}

export { METRICS, RELATIONS };
