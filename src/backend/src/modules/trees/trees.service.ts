import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  FamilyTreeGraph,
  FamilyTreeListResponse,
  FamilyTreeSummary,
  PersonSidebarDetail,
  PrimitiveRelationshipType,
  RelatedPerson,
} from "@family-tree/shared-types";
import { PrismaService } from "../database/prisma.service.js";

const iso = (value: Date | null) => value?.toISOString() ?? null;

@Injectable()
export class TreesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private summary(tree: {
    id: string;
    name: string;
    description: string | null;
    coverUrl: string | null;
    originPlace: string | null;
    updatedAt: Date;
    _count: { persons: number };
  }): FamilyTreeSummary {
    return {
      id: tree.id,
      name: tree.name,
      description: tree.description,
      coverUrl: tree.coverUrl,
      originPlace: tree.originPlace,
      personCount: tree._count.persons,
      updatedAt: tree.updatedAt.toISOString(),
    };
  }

  private async ownedTree(treeId: string, userId: string) {
    const tree = await this.prisma.familyTree.findFirst({
      where: { id: treeId, createdById: userId },
      include: { _count: { select: { persons: true } } },
    });
    if (!tree)
      throw new NotFoundException({
        code: "TREE_NOT_FOUND",
        message: "Không tìm thấy gia phả",
      });
    return tree;
  }

  async list(userId: string): Promise<FamilyTreeListResponse> {
    const trees = await this.prisma.familyTree.findMany({
      where: { createdById: userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { persons: true } } },
    });
    return {
      createdByMe: trees.map((tree) => this.summary(tree)),
      sharedWithMe: [],
    };
  }

  async graph(treeId: string, userId: string): Promise<FamilyTreeGraph> {
    const tree = await this.ownedTree(treeId, userId);
    const [memberships, relationships] = await Promise.all([
      this.prisma.familyTreePerson.findMany({
        where: { treeId },
        include: { person: true },
        orderBy: { person: { fullName: "asc" } },
      }),
      this.prisma.relationship.findMany({
        where: { treeId },
        orderBy: [{ typeCode: "asc" }, { id: "asc" }],
      }),
    ]);
    return {
      tree: this.summary(tree),
      nodes: memberships.map(({ person }) => ({
        id: person.id,
        fullName: person.fullName,
        preferredName: person.preferredName,
        gender: person.gender,
        avatarUrl: person.avatarUrl,
        birthDate: iso(person.birthDate),
        birthDatePrecision: person.birthDatePrecision,
        deathDate: iso(person.deathDate),
        deathDatePrecision: person.deathDatePrecision,
        isDeceased: person.isDeceased,
      })),
      edges: relationships.map((relationship) => ({
        id: relationship.id,
        type: relationship.typeCode as PrimitiveRelationshipType,
        fromPersonId: relationship.fromPersonId,
        toPersonId: relationship.toPersonId,
        parentKind: relationship.parentKind,
        birthOrder: relationship.birthOrder,
        marriageStatus: relationship.marriageStatus,
        marriageOrder: relationship.marriageOrder,
        startedAt: iso(relationship.startedAt),
        startedAtPrecision: relationship.startedAtPrecision,
        endedAt: iso(relationship.endedAt),
        endedAtPrecision: relationship.endedAtPrecision,
      })),
    };
  }

  async person(
    treeId: string,
    personId: string,
    userId: string,
  ): Promise<PersonSidebarDetail> {
    await this.ownedTree(treeId, userId);
    const membership = await this.prisma.familyTreePerson.findUnique({
      where: { treeId_personId: { treeId, personId } },
      include: { person: true },
    });
    if (!membership)
      throw new NotFoundException({
        code: "PERSON_NOT_FOUND",
        message: "Không tìm thấy thành viên trong gia phả",
      });
    const [
      visibleMemberships,
      parentRelations,
      childRelations,
      spouseRelations,
    ] = await Promise.all([
      this.prisma.familyTreePerson.findMany({
        where: { personId, tree: { createdById: userId } },
        include: {
          tree: { include: { _count: { select: { persons: true } } } },
        },
        orderBy: { tree: { updatedAt: "desc" } },
      }),
      this.prisma.relationship.findMany({
        where: { treeId, typeCode: "PARENT_CHILD", toPersonId: personId },
        include: { fromPerson: true },
      }),
      this.prisma.relationship.findMany({
        where: { treeId, typeCode: "PARENT_CHILD", fromPersonId: personId },
        include: { toPerson: true },
        orderBy: { birthOrder: "asc" },
      }),
      this.prisma.relationship.findMany({
        where: {
          treeId,
          typeCode: "SPOUSE",
          OR: [{ fromPersonId: personId }, { toPersonId: personId }],
        },
        include: { fromPerson: true, toPerson: true },
        orderBy: { marriageOrder: "asc" },
      }),
    ]);
    const childIds = childRelations.map((relation) => relation.toPersonId);
    const coParentRelations = childIds.length
      ? await this.prisma.relationship.findMany({
          where: {
            treeId,
            typeCode: "PARENT_CHILD",
            toPersonId: { in: childIds },
            fromPersonId: { not: personId },
          },
          include: { fromPerson: true },
        })
      : [];
    const person = membership.person;
    const relatedPerson = (value: typeof person): RelatedPerson => ({
      id: value.id,
      fullName: value.fullName,
      preferredName: value.preferredName,
      gender: value.gender,
      avatarUrl: value.avatarUrl,
      isDeceased: value.isDeceased,
      birthDate: iso(value.birthDate),
      birthDatePrecision: value.birthDatePrecision,
    });
    const spouseById = new Map(
      spouseRelations.map((relation) => {
        const partner =
          relation.fromPersonId === personId
            ? relation.toPerson
            : relation.fromPerson;
        return [partner.id, { relation, partner }] as const;
      }),
    );
    const coParentByChild = new Map<string, typeof coParentRelations>();
    for (const relation of coParentRelations) {
      coParentByChild.set(relation.toPersonId, [
        ...(coParentByChild.get(relation.toPersonId) ?? []),
        relation,
      ]);
    }
    const families = new Map<
      string,
      {
        partner: RelatedPerson | null;
        relationshipStatus:
          | NonNullable<(typeof spouseRelations)[number]["marriageStatus"]>
          | "CO_PARENT"
          | null;
        children: RelatedPerson[];
      }
    >();
    for (const [partnerId, { relation, partner }] of spouseById) {
      families.set(partnerId, {
        partner: relatedPerson(partner),
        relationshipStatus: relation.marriageStatus,
        children: [],
      });
    }
    for (const childRelation of childRelations) {
      const coParents = coParentByChild.get(childRelation.toPersonId) ?? [];
      if (!coParents.length) {
        const family = families.get("single") ?? {
          partner: null,
          relationshipStatus: null,
          children: [],
        };
        family.children.push(relatedPerson(childRelation.toPerson));
        families.set("single", family);
        continue;
      }
      for (const coParent of coParents) {
        const spouse = spouseById.get(coParent.fromPersonId);
        const family = families.get(coParent.fromPersonId) ?? {
          partner: relatedPerson(coParent.fromPerson),
          relationshipStatus: spouse?.relation.marriageStatus ?? "CO_PARENT",
          children: [],
        };
        if (
          !family.children.some(
            (child) => child.id === childRelation.toPersonId,
          )
        )
          family.children.push(relatedPerson(childRelation.toPerson));
        families.set(coParent.fromPersonId, family);
      }
    }
    return {
      id: person.id,
      fullName: person.fullName,
      preferredName: person.preferredName,
      aliases: person.aliases,
      gender: person.gender,
      avatarUrl: person.avatarUrl,
      birthDate: iso(person.birthDate),
      birthDatePrecision: person.birthDatePrecision,
      birthPlace: person.birthPlace,
      deathDate: iso(person.deathDate),
      deathDatePrecision: person.deathDatePrecision,
      deathPlace: person.deathPlace,
      isDeceased: person.isDeceased,
      hometown: person.hometown,
      currentResidence: person.currentResidence,
      nationality: person.nationality,
      ethnicity: person.ethnicity,
      religion: person.religion,
      occupation: person.occupation,
      biography: person.biography,
      visibleTrees: visibleMemberships.map(({ tree: visibleTree }) =>
        this.summary(visibleTree),
      ),
      parents: parentRelations.map((relation) => ({
        person: relatedPerson(relation.fromPerson),
        parentKind: relation.parentKind!,
      })),
      partnerFamilies: [...families.values()],
    };
  }
}
