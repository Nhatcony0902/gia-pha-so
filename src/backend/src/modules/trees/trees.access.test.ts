import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { TreeRole } from "@family-tree/shared-types";
import type { PrismaService } from "../database/prisma.service.js";
import { TreesService } from "./trees.service.js";

const TREE = "tree-1";
const roles: Record<string, TreeRole> = { admin: "ADMIN", viewer: "VIEWER" };

/** Prisma giả: gia phả chỉ "tìm thấy" khi user có Membership, giống điều kiện thật. */
function service() {
  const tree = {
    id: TREE,
    name: "Họ Phạm",
    description: null,
    coverUrl: null,
    originPlace: null,
    createdById: "admin",
    updatedAt: new Date(),
    _count: { persons: 0 },
  };
  const prisma = {
    familyTree: {
      async findFirst({
        where,
      }: {
        where: { memberships: { some: { userId: string } } };
      }) {
        const role = roles[where.memberships.some.userId];
        return role ? { ...tree, memberships: [{ role }] } : null;
      },
      async update() {
        return { ...tree, memberships: [{ role: "ADMIN" }] };
      },
    },
    familyTreePerson: { findMany: async () => [] },
    relationship: { findMany: async () => [] },
  };
  return new TreesService(prisma as unknown as PrismaService);
}

describe("TreesService phân quyền", () => {
  it("Viewer đọc được cây và biết vai trò của mình", async () => {
    const graph = await service().graph(TREE, "viewer");
    assert.equal(graph.tree.myRole, "VIEWER");
  });

  it("Viewer ghi bị chặn 403", async () => {
    await assert.rejects(
      service().updateTree(TREE, "viewer", { name: "Đổi tên" }),
      ForbiddenException,
    );
    await assert.rejects(
      service().createPerson(TREE, "viewer", { fullName: "Phạm Văn C" }),
      ForbiddenException,
    );
  });

  it("Admin ghi được", async () => {
    const summary = await service().updateTree(TREE, "admin", {
      name: "Đổi tên",
    });
    assert.equal(summary.myRole, "ADMIN");
  });

  it("người ngoài nhận 404 cho cả đọc lẫn ghi", async () => {
    await assert.rejects(service().graph(TREE, "stranger"), NotFoundException);
    await assert.rejects(
      service().updateTree(TREE, "stranger", { name: "x" }),
      NotFoundException,
    );
  });
});
