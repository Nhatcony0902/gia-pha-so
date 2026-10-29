import type { PrismaClient } from "@prisma/client";

/**
 * Ảnh chụp một dòng họ trong bộ nhớ. Tool của chatbot chỉ đọc từ đây, nên không thể chạm tới dòng họ khác.
 * Một dòng họ chỉ vài trăm đến vài nghìn người (ADR-0002), tải hết mỗi lượt hỏi là đủ nhanh.
 */
export type SnapshotPerson = {
  id: string;
  fullName: string;
  preferredName: string | null;
  aliases: string[];
  gender: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
  birthDate: Date | null;
  birthDatePrecision: "YEAR" | "MONTH" | "DAY" | null;
  deathDate: Date | null;
  deathDatePrecision: "YEAR" | "MONTH" | "DAY" | null;
  isDeceased: boolean;
  occupation: string | null;
  hometown: string | null;
  currentResidence: string | null;
  burialPlace: string | null;
  biography: string | null;
};

export type SnapshotRelationship = {
  typeCode: string;
  fromPersonId: string;
  toPersonId: string;
  parentKind: "BIOLOGICAL" | "ADOPTIVE" | null;
  birthOrder: number | null;
  marriageStatus: "MARRIED" | "DIVORCED" | "SEPARATED" | "WIDOWED" | null;
  marriageOrder: number | null;
};

export type TreeSnapshot = {
  treeId: string;
  treeName: string;
  persons: SnapshotPerson[];
  relationships: SnapshotRelationship[];
};

/** Ai đang hỏi: lấy từ tài khoản đã xác thực, LLM không đổi được. */
export type AskContext = {
  treeId: string;
  userId: string;
  /** Person gắn với tài khoản trong dòng họ này ("tôi"), null nếu chưa gắn. */
  mePersonId: string | null;
};

const personSelect = {
  id: true,
  fullName: true,
  preferredName: true,
  aliases: true,
  gender: true,
  birthDate: true,
  birthDatePrecision: true,
  deathDate: true,
  deathDatePrecision: true,
  isDeceased: true,
  occupation: true,
  hometown: true,
  currentResidence: true,
  burialPlace: true,
  biography: true,
} as const;

export async function loadTreeSnapshot(
  prisma: PrismaClient,
  treeId: string,
): Promise<TreeSnapshot> {
  const [tree, persons, relationships] = await Promise.all([
    prisma.familyTree.findUniqueOrThrow({
      where: { id: treeId },
      select: { name: true },
    }),
    prisma.person.findMany({
      where: { familyTrees: { some: { treeId } } },
      select: personSelect,
    }),
    prisma.relationship.findMany({
      where: { treeId },
      select: {
        typeCode: true,
        fromPersonId: true,
        toPersonId: true,
        parentKind: true,
        birthOrder: true,
        marriageStatus: true,
        marriageOrder: true,
      },
    }),
  ]);
  return { treeId, treeName: tree.name, persons, relationships };
}

/** Quyền đọc lấy từ Membership (LMS-010). Không phải thành viên thì không hỏi được. */
export async function resolveAskContext(
  prisma: PrismaClient,
  userEmail: string,
  treeId?: string,
): Promise<AskContext> {
  const user = await prisma.user.findUnique({
    where: { email: userEmail.trim().toLowerCase() },
    include: { memberships: true },
  });
  if (!user) throw new Error(`Không có tài khoản ${userEmail}`);
  const memberships = treeId
    ? user.memberships.filter((m) => m.treeId === treeId)
    : user.memberships;
  if (memberships.length === 0)
    throw new Error(
      treeId
        ? `${userEmail} không có quyền xem gia phả ${treeId}`
        : `${userEmail} chưa thuộc gia phả nào`,
    );
  if (memberships.length > 1)
    throw new Error(
      `${userEmail} thuộc nhiều gia phả, hãy chọn --tree: ${memberships.map((m) => m.treeId).join(", ")}`,
    );
  const membership = memberships[0]!;
  return {
    treeId: membership.treeId,
    userId: user.id,
    mePersonId: membership.personId,
  };
}
