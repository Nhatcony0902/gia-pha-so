import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma, type Relationship } from "@prisma/client";
import type {
  CloudinarySignature,
  FamilyTreeGraph,
  FamilyTreeListResponse,
  FamilyTreeSummary,
  PersonSidebarDetail,
  PersonLinkCandidatesResponse,
  PersonListResponse,
  PrimitiveRelationshipType,
  RelatedPerson,
} from "@family-tree/shared-types";
import { PrismaService } from "../database/prisma.service.js";
import type {
  AddPersonImageDto,
  CreatePersonDto,
  CreateRelationshipDto,
  CreateTreeDto,
  UpdatePersonDto,
  UpdateRelationshipDto,
  UpdateTreeDto,
} from "./trees.dto.js";
import {
  canonicalSpousePair,
  validateParentRelationships,
} from "./relationship-validation.js";

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

  private relationshipSummary(relationship: Relationship) {
    return {
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

  async createTree(userId: string, body: CreateTreeDto) {
    const name = body.name?.trim();
    if (!name)
      throw new BadRequestException({
        code: "TREE_NAME_REQUIRED",
        message: "Tên gia phả không được để trống",
      });
    const tree = await this.prisma.familyTree.create({
      data: {
        ...body,
        name,
        createdById: userId,
      },
      include: { _count: { select: { persons: true } } },
    });
    return this.summary(tree);
  }

  async updateTree(treeId: string, userId: string, body: UpdateTreeDto) {
    await this.ownedTree(treeId, userId);
    const name = body.name?.trim();
    if (body.name !== undefined && !name)
      throw new BadRequestException({
        code: "TREE_NAME_REQUIRED",
        message: "Tên gia phả không được để trống",
      });
    const tree = await this.prisma.familyTree.update({
      where: { id: treeId },
      data: { ...body, ...(name ? { name } : {}) },
      include: { _count: { select: { persons: true } } },
    });
    return this.summary(tree);
  }

  async deleteTree(treeId: string, userId: string) {
    await this.ownedTree(treeId, userId);
    const memberships = await this.prisma.familyTreePerson.findMany({
      where: { treeId },
      select: { personId: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.relationship.deleteMany({ where: { treeId } });
      await tx.familyTreePerson.deleteMany({ where: { treeId } });
      await tx.familyTree.delete({ where: { id: treeId } });
      for (const { personId } of memberships) {
        if ((await tx.familyTreePerson.count({ where: { personId } })) === 0)
          await tx.person.delete({ where: { id: personId } });
      }
    });
    return { success: true };
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
      edges: relationships.map((relationship) =>
        this.relationshipSummary(relationship),
      ),
    };
  }

  async persons(treeId: string, userId: string): Promise<PersonListResponse> {
    const tree = await this.ownedTree(treeId, userId);
    const memberships = await this.prisma.familyTreePerson.findMany({
      where: { treeId },
      include: { person: true },
      orderBy: { person: { fullName: "asc" } },
    });
    return {
      tree: this.summary(tree),
      persons: memberships.map(({ person }) => ({
        id: person.id,
        fullName: person.fullName,
        preferredName: person.preferredName,
        gender: person.gender,
        avatarUrl: person.avatarUrl,
        birthDate: iso(person.birthDate),
        birthPlace: person.birthPlace,
        deathDate: iso(person.deathDate),
        deathPlace: person.deathPlace,
        isDeceased: person.isDeceased,
        hometown: person.hometown,
        currentResidence: person.currentResidence,
        nationality: person.nationality,
        ethnicity: person.ethnicity,
        religion: person.religion,
        occupation: person.occupation,
        phone: person.phone,
        email: person.email,
      })),
    };
  }

  async createPerson(treeId: string, userId: string, body: CreatePersonDto) {
    await this.ownedTree(treeId, userId);
    const fullName = body.fullName?.trim();
    if (!fullName)
      throw new BadRequestException({
        code: "PERSON_NAME_REQUIRED",
        message: "Họ và tên thành viên không được để trống",
      });
    const { birthDate, deathDate, socialLinks, ...fields } = body;
    const person = await this.prisma.person.create({
      data: {
        ...fields,
        fullName,
        birthDate: birthDate ? new Date(birthDate) : null,
        deathDate: deathDate ? new Date(deathDate) : null,
        ...(socialLinks !== undefined
          ? {
              socialLinks: socialLinks === null ? Prisma.JsonNull : socialLinks,
            }
          : {}),
        familyTrees: { create: { treeId } },
      },
    });
    return this.person(treeId, person.id, userId);
  }

  async personLinkCandidates(
    treeId: string,
    userId: string,
  ): Promise<PersonLinkCandidatesResponse> {
    await this.ownedTree(treeId, userId);
    const memberships = await this.prisma.familyTreePerson.findMany({
      where: {
        treeId: { not: treeId },
        tree: { createdById: userId },
        person: { familyTrees: { none: { treeId } } },
      },
      include: {
        tree: { select: { id: true, name: true } },
        person: true,
      },
      orderBy: [{ person: { fullName: "asc" } }, { tree: { name: "asc" } }],
    });
    const candidates = new Map<
      string,
      PersonLinkCandidatesResponse["persons"][number]
    >();
    for (const { person, tree } of memberships) {
      const current = candidates.get(person.id);
      if (current) {
        current.sourceTrees.push(tree);
        continue;
      }
      candidates.set(person.id, {
        id: person.id,
        fullName: person.fullName,
        preferredName: person.preferredName,
        gender: person.gender,
        avatarUrl: person.avatarUrl,
        birthDate: iso(person.birthDate),
        birthPlace: person.birthPlace,
        deathDate: iso(person.deathDate),
        deathPlace: person.deathPlace,
        isDeceased: person.isDeceased,
        hometown: person.hometown,
        currentResidence: person.currentResidence,
        nationality: person.nationality,
        ethnicity: person.ethnicity,
        religion: person.religion,
        occupation: person.occupation,
        phone: person.phone,
        email: person.email,
        sourceTrees: [tree],
      });
    }
    return { persons: [...candidates.values()] };
  }

  async linkPerson(treeId: string, personId: string, userId: string) {
    await this.ownedTree(treeId, userId);
    const existing = await this.prisma.familyTreePerson.findUnique({
      where: { treeId_personId: { treeId, personId } },
    });
    if (existing)
      throw new ConflictException({
        code: "PERSON_ALREADY_IN_TREE",
        message: "Thành viên đã có trong gia phả này",
      });
    const sourceMembership = await this.prisma.familyTreePerson.findFirst({
      where: {
        personId,
        treeId: { not: treeId },
        tree: { createdById: userId },
      },
    });
    if (!sourceMembership)
      throw new NotFoundException({
        code: "PERSON_LINK_SOURCE_NOT_FOUND",
        message: "Không tìm thấy thành viên trong gia phả khác của bạn",
      });
    try {
      await this.prisma.familyTreePerson.create({ data: { treeId, personId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException({
          code: "PERSON_ALREADY_IN_TREE",
          message: "Thành viên đã có trong gia phả này",
        });
      throw error;
    }
    return this.person(treeId, personId, userId);
  }

  private async normalizedRelationship(
    treeId: string,
    body: CreateRelationshipDto,
    excludeId?: string,
  ) {
    if (body.fromPersonId === body.toPersonId)
      throw new BadRequestException({
        code: "RELATIONSHIP_SELF_REFERENCE",
        message: "Không thể tạo quan hệ của một thành viên với chính họ",
      });
    const membershipCount = await this.prisma.familyTreePerson.count({
      where: {
        treeId,
        personId: { in: [body.fromPersonId, body.toPersonId] },
      },
    });
    if (membershipCount !== 2)
      throw new BadRequestException({
        code: "RELATIONSHIP_PERSON_NOT_IN_TREE",
        message: "Hai thành viên phải cùng thuộc gia phả này",
      });

    let fromPersonId = body.fromPersonId;
    let toPersonId = body.toPersonId;
    if (body.type === "SPOUSE")
      [fromPersonId, toPersonId] = canonicalSpousePair(
        fromPersonId,
        toPersonId,
      );

    const duplicate = await this.prisma.relationship.findFirst({
      where: {
        treeId,
        typeCode: body.type,
        fromPersonId,
        toPersonId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate)
      throw new BadRequestException({
        code: "RELATIONSHIP_DUPLICATE",
        message: "Quan hệ này đã tồn tại trong gia phả",
      });

    if (body.type === "PARENT_CHILD") {
      const existing = await this.prisma.relationship.findMany({
        where: {
          treeId,
          typeCode: "PARENT_CHILD",
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      try {
        validateParentRelationships([
          ...existing.map((relationship) => ({
            fromPersonId: relationship.fromPersonId,
            toPersonId: relationship.toPersonId,
            parentKind: relationship.parentKind!,
          })),
          {
            fromPersonId,
            toPersonId,
            parentKind: body.parentKind ?? "BIOLOGICAL",
          },
        ]);
      } catch (error) {
        throw new BadRequestException({
          code: "INVALID_PARENT_RELATIONSHIP",
          message:
            error instanceof Error && error.message.includes("two biological")
              ? "Một thành viên không thể có quá hai cha/mẹ ruột"
              : "Quan hệ cha/mẹ - con tạo thành vòng lặp hoặc không hợp lệ",
        });
      }
      return {
        typeCode: body.type,
        fromPersonId,
        toPersonId,
        parentKind: body.parentKind ?? "BIOLOGICAL",
        birthOrder: body.birthOrder ?? null,
        marriageStatus: null,
        marriageOrder: null,
        startedAt: null,
        startedAtPrecision: null,
        endedAt: null,
        endedAtPrecision: null,
      };
    }

    const startedAt = body.startedAt ? new Date(body.startedAt) : null;
    const endedAt = body.endedAt ? new Date(body.endedAt) : null;
    if (startedAt && endedAt && endedAt < startedAt)
      throw new BadRequestException({
        code: "RELATIONSHIP_DATE_ORDER",
        message: "Ngày kết thúc không được trước ngày bắt đầu",
      });
    return {
      typeCode: body.type,
      fromPersonId,
      toPersonId,
      parentKind: null,
      birthOrder: null,
      marriageStatus: body.marriageStatus ?? "MARRIED",
      marriageOrder: body.marriageOrder ?? null,
      startedAt,
      startedAtPrecision: startedAt ? (body.startedAtPrecision ?? "DAY") : null,
      endedAt,
      endedAtPrecision: endedAt ? (body.endedAtPrecision ?? "DAY") : null,
    };
  }

  async createRelationship(
    treeId: string,
    userId: string,
    body: CreateRelationshipDto,
  ) {
    await this.ownedTree(treeId, userId);
    const data = await this.normalizedRelationship(treeId, body);
    const relationship = await this.prisma.relationship.create({
      data: { treeId, ...data },
    });
    return this.relationshipSummary(relationship);
  }

  async updateRelationship(
    treeId: string,
    relationshipId: string,
    userId: string,
    body: UpdateRelationshipDto,
  ) {
    await this.ownedTree(treeId, userId);
    const current = await this.prisma.relationship.findFirst({
      where: { id: relationshipId, treeId },
    });
    if (!current)
      throw new NotFoundException({
        code: "RELATIONSHIP_NOT_FOUND",
        message: "Không tìm thấy quan hệ trong gia phả",
      });
    const value = <T>(next: T | undefined, fallback: T) =>
      next === undefined ? fallback : next;
    const merged: CreateRelationshipDto = {
      type: value(body.type, current.typeCode as CreateRelationshipDto["type"]),
      fromPersonId: value(body.fromPersonId, current.fromPersonId),
      toPersonId: value(body.toPersonId, current.toPersonId),
      parentKind: value(body.parentKind, current.parentKind),
      birthOrder: value(body.birthOrder, current.birthOrder),
      marriageStatus: value(body.marriageStatus, current.marriageStatus),
      marriageOrder: value(body.marriageOrder, current.marriageOrder),
      startedAt: value(body.startedAt, iso(current.startedAt)),
      startedAtPrecision: value(
        body.startedAtPrecision,
        current.startedAtPrecision,
      ),
      endedAt: value(body.endedAt, iso(current.endedAt)),
      endedAtPrecision: value(body.endedAtPrecision, current.endedAtPrecision),
    };
    const data = await this.normalizedRelationship(
      treeId,
      merged,
      relationshipId,
    );
    const relationship = await this.prisma.relationship.update({
      where: { id: relationshipId },
      data,
    });
    return this.relationshipSummary(relationship);
  }

  async deleteRelationship(
    treeId: string,
    relationshipId: string,
    userId: string,
  ) {
    await this.ownedTree(treeId, userId);
    const deleted = await this.prisma.relationship.deleteMany({
      where: { id: relationshipId, treeId },
    });
    if (!deleted.count)
      throw new NotFoundException({
        code: "RELATIONSHIP_NOT_FOUND",
        message: "Không tìm thấy quan hệ trong gia phả",
      });
    return { success: true };
  }

  async person(
    treeId: string,
    personId: string,
    userId: string,
  ): Promise<PersonSidebarDetail> {
    await this.ownedTree(treeId, userId);
    const membership = await this.prisma.familyTreePerson.findUnique({
      where: { treeId_personId: { treeId, personId } },
      include: {
        person: {
          include: {
            images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          },
        },
      },
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
    const relatedPerson = (value: {
      id: string;
      fullName: string;
      preferredName: string | null;
      gender: (typeof person)["gender"];
      avatarUrl: string | null;
      isDeceased: boolean;
      birthDate: Date | null;
      birthDatePrecision: (typeof person)["birthDatePrecision"];
    }): RelatedPerson => ({
      id: value.id,
      fullName: value.fullName,
      preferredName: value.preferredName,
      gender: value.gender,
      avatarUrl: value.avatarUrl,
      isDeceased: value.isDeceased,
      birthDate: iso(value.birthDate),
      birthDatePrecision: value.birthDatePrecision,
    });
    const visibleTreeIds = visibleMemberships.map(({ treeId: id }) => id);
    const visibleRelations = visibleTreeIds.length
      ? await this.prisma.relationship.findMany({
          where: {
            treeId: { in: visibleTreeIds },
            OR: [{ fromPersonId: personId }, { toPersonId: personId }],
          },
          include: { fromPerson: true, toPerson: true },
          orderBy: [{ treeId: "asc" }, { typeCode: "asc" }, { id: "asc" }],
        })
      : [];
    const relativesByTree = new Map<
      string,
      Array<{
        relationshipId: string;
        role: "PARENT" | "CHILD" | "SPOUSE";
        label: string;
        person: RelatedPerson;
      }>
    >();
    for (const relation of visibleRelations) {
      const personIsFrom = relation.fromPersonId === personId;
      const relative = personIsFrom ? relation.toPerson : relation.fromPerson;
      let role: "PARENT" | "CHILD" | "SPOUSE";
      let label: string;
      if (relation.typeCode === "SPOUSE") {
        role = "SPOUSE";
        const relationshipLabel =
          relation.marriageStatus === "DIVORCED"
            ? "đã ly hôn"
            : relation.marriageStatus === "SEPARATED"
              ? "ly thân"
              : relation.marriageStatus === "WIDOWED"
                ? "góa"
                : "kết hôn";
        const partnerLabel =
          relative.gender === "MALE"
            ? "Chồng"
            : relative.gender === "FEMALE"
              ? "Vợ"
              : "Vợ/chồng";
        label = `${partnerLabel} · ${relationshipLabel}`;
      } else if (personIsFrom) {
        role = "CHILD";
        label =
          relative.gender === "MALE"
            ? "Con trai"
            : relative.gender === "FEMALE"
              ? "Con gái"
              : "Con";
      } else {
        role = "PARENT";
        const parentLabel =
          relative.gender === "MALE"
            ? "Bố"
            : relative.gender === "FEMALE"
              ? "Mẹ"
              : "Cha/mẹ";
        label = `${parentLabel}${relation.parentKind === "ADOPTIVE" ? " nuôi" : ""}`;
      }
      relativesByTree.set(relation.treeId, [
        ...(relativesByTree.get(relation.treeId) ?? []),
        {
          relationshipId: relation.id,
          role,
          label,
          person: relatedPerson(relative),
        },
      ]);
    }
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
      title: person.title,
      maidenName: person.maidenName,
      education: person.education,
      employer: person.employer,
      phone: person.phone,
      email: person.email,
      address: person.address,
      bloodType: person.bloodType,
      identificationCode: person.identificationCode,
      socialLinks: person.socialLinks as Record<string, string> | null,
      biography: person.biography,
      notes: person.notes,
      burialPlace: person.burialPlace,
      images: person.images.map((image) => ({
        id: image.id,
        url: image.url,
        publicId: image.publicId,
        caption: image.caption,
        takenAt: iso(image.takenAt),
        width: image.width,
        height: image.height,
        format: image.format,
        bytes: image.bytes,
        sortOrder: image.sortOrder,
      })),
      visibleTrees: visibleMemberships.map(({ tree: visibleTree }) => ({
        ...this.summary(visibleTree),
        relatives: relativesByTree.get(visibleTree.id) ?? [],
      })),
      parents: parentRelations.map((relation) => ({
        person: relatedPerson(relation.fromPerson),
        parentKind: relation.parentKind!,
      })),
      partnerFamilies: [...families.values()],
    };
  }

  private async ownedPerson(treeId: string, personId: string, userId: string) {
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
    return membership.person;
  }

  async updatePerson(
    treeId: string,
    personId: string,
    userId: string,
    body: UpdatePersonDto,
  ) {
    await this.ownedPerson(treeId, personId, userId);
    if (body.fullName !== undefined && !body.fullName.trim())
      throw new BadRequestException({
        code: "PERSON_NAME_REQUIRED",
        message: "Họ và tên thành viên không được để trống",
      });
    const { birthDate, deathDate, socialLinks, ...fields } = body;
    await this.prisma.person.update({
      where: { id: personId },
      data: {
        ...fields,
        ...(body.fullName !== undefined
          ? { fullName: body.fullName.trim() }
          : {}),
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
        ...(deathDate !== undefined
          ? { deathDate: deathDate ? new Date(deathDate) : null }
          : {}),
        ...(socialLinks !== undefined
          ? {
              socialLinks: socialLinks === null ? Prisma.JsonNull : socialLinks,
            }
          : {}),
      },
    });
    return this.person(treeId, personId, userId);
  }

  async deletePerson(treeId: string, personId: string, userId: string) {
    await this.ownedPerson(treeId, personId, userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.relationship.deleteMany({
        where: {
          treeId,
          OR: [{ fromPersonId: personId }, { toPersonId: personId }],
        },
      });
      await tx.familyTreePerson.delete({
        where: { treeId_personId: { treeId, personId } },
      });
      if ((await tx.familyTreePerson.count({ where: { personId } })) === 0)
        await tx.person.delete({ where: { id: personId } });
    });
    return { success: true };
  }

  async addPersonImage(
    treeId: string,
    personId: string,
    userId: string,
    body: AddPersonImageDto,
  ) {
    await this.ownedPerson(treeId, personId, userId);
    return this.prisma.personImage.create({
      data: {
        ...body,
        takenAt: body.takenAt ? new Date(body.takenAt) : null,
        personId,
      },
    });
  }

  async deletePersonImage(
    treeId: string,
    personId: string,
    imageId: string,
    userId: string,
  ) {
    await this.ownedPerson(treeId, personId, userId);
    const image = await this.prisma.personImage.findFirst({
      where: { id: imageId, personId },
    });
    if (!image)
      throw new NotFoundException({
        code: "IMAGE_NOT_FOUND",
        message: "Không tìm thấy ảnh",
      });
    await this.destroyCloudinaryAsset(image.publicId);
    await this.prisma.personImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  async cloudinarySignature(
    treeId: string,
    personId: string,
    userId: string,
  ): Promise<CloudinarySignature> {
    await this.ownedPerson(treeId, personId, userId);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret)
      throw new ServiceUnavailableException({
        code: "CLOUDINARY_NOT_CONFIGURED",
        message: "Cloudinary chưa được cấu hình",
      });
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `gia-pha-so/members/${personId}`;
    const signature = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
      .digest("hex");
    return { cloudName, apiKey, timestamp, signature, folder };
  }

  private async destroyCloudinaryAsset(publicId: string) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret) return;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${secret}`)
      .digest("hex");
    const body = new FormData();
    body.set("public_id", publicId);
    body.set("timestamp", String(timestamp));
    body.set("api_key", apiKey);
    body.set("signature", signature);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      { method: "POST", body },
    );
    if (!response.ok)
      throw new ServiceUnavailableException({
        code: "CLOUDINARY_DELETE_FAILED",
        message: "Không thể xóa ảnh trên Cloudinary",
      });
  }
}
