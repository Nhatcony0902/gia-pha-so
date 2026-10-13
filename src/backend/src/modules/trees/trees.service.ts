import { createHash } from "node:crypto";
import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CloudinarySignature,
  FamilyTreeGraph,
  FamilyTreeListResponse,
  FamilyTreeSummary,
  PersonSidebarDetail,
  PersonListResponse,
  PrimitiveRelationshipType,
  RelatedPerson,
} from "@family-tree/shared-types";
import { PrismaService } from "../database/prisma.service.js";
import type { AddPersonImageDto, UpdatePersonDto } from "./trees.dto.js";

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
        clanBranch: person.clanBranch,
        generationName: person.generationName,
        familyPosition: person.familyPosition,
        phone: person.phone,
        email: person.email,
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
      clanBranch: person.clanBranch,
      generationName: person.generationName,
      familyPosition: person.familyPosition,
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
    const { birthDate, deathDate, socialLinks, ...fields } = body;
    await this.prisma.person.update({
      where: { id: personId },
      data: {
        ...fields,
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
