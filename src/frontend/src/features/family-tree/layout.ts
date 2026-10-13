import type {
  FamilyTreeGraph,
  MarriageStatus,
  PersonNode,
  PrimitiveRelationship,
} from "@family-tree/shared-types";
import type { Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { FamilyJunctionFlowNode } from "./FamilyJunctionNode";
import type { FamilyFlowNode } from "./FamilyPersonNode";

const elk = new ELK();
const NODE_WIDTH = 220;
const NODE_HEIGHT = 88;
const PARTNER_GAP = 120;
const FAMILY_GAP = 145;
const FAMILY_GROUP_GAP = 425;
const GENERATION_GAP = 260;

export type FamilyTreeFlowNode = FamilyFlowNode | FamilyJunctionFlowNode;
export type FamilyEdgeData = {
  personIds: string[];
  kind?: "pair" | "family";
  relationshipKey?: string;
};
type FamilyEdge = Edge<FamilyEdgeData>;
type FamilyUnion = {
  key: string;
  firstPersonId: string;
  secondPersonId: string;
  relationship?: PrimitiveRelationship;
  childIds: Set<string>;
};

const pairKey = (first: string, second: string) =>
  [first, second].sort().join("::");

function relationshipPresentation(status?: MarriageStatus) {
  switch (status) {
    case "DIVORCED":
      return {
        label: "Ly hôn",
        color: "#b85b4b",
        dash: "8 5",
        className: "divorced",
      };
    case "SEPARATED":
      return {
        label: "Ly thân",
        color: "#c1842f",
        dash: "3 5",
        className: "separated",
      };
    case "WIDOWED":
      return {
        label: "Góa",
        color: "#7c6d8f",
        dash: undefined,
        className: "widowed",
      };
    case "MARRIED":
      return {
        label: "Kết hôn",
        color: "#a96f25",
        dash: undefined,
        className: "married",
      };
    default:
      return {
        label: "Có con chung",
        color: "#788982",
        dash: "2 5",
        className: "co-parents",
      };
  }
}

function buildUnions(graph: FamilyTreeGraph) {
  const unions = new Map<string, FamilyUnion>();
  const parentsByChild = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.type !== "PARENT_CHILD") continue;
    const parents = parentsByChild.get(edge.toPersonId) ?? [];
    if (!parents.includes(edge.fromPersonId)) parents.push(edge.fromPersonId);
    parentsByChild.set(edge.toPersonId, parents);
  }
  for (const relationship of graph.edges.filter(
    (edge) => edge.type === "SPOUSE",
  )) {
    const pair = [relationship.fromPersonId, relationship.toPersonId].sort();
    const firstPersonId = pair[0]!;
    const secondPersonId = pair[1]!;
    const key = pairKey(firstPersonId, secondPersonId);
    unions.set(key, {
      key,
      firstPersonId,
      secondPersonId,
      relationship,
      childIds: new Set(),
    });
  }
  for (const [childId, parents] of parentsByChild) {
    if (parents.length < 2) continue;
    const pair = parents.slice(0, 2).sort();
    const firstPersonId = pair[0]!;
    const secondPersonId = pair[1]!;
    const key = pairKey(firstPersonId, secondPersonId);
    const union = unions.get(key) ?? {
      key,
      firstPersonId,
      secondPersonId,
      childIds: new Set<string>(),
    };
    union.childIds.add(childId);
    unions.set(key, union);
  }
  return { unions, parentsByChild };
}

function calculateGenerations(
  graph: FamilyTreeGraph,
  unions: Map<string, FamilyUnion>,
) {
  const generation = new Map(graph.nodes.map((person) => [person.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const edge of graph.edges) {
      if (edge.type !== "PARENT_CHILD") continue;
      const next = (generation.get(edge.fromPersonId) ?? 0) + 1;
      if (next > (generation.get(edge.toPersonId) ?? 0)) {
        generation.set(edge.toPersonId, next);
        changed = true;
      }
    }
    for (const union of unions.values()) {
      const shared = Math.max(
        generation.get(union.firstPersonId) ?? 0,
        generation.get(union.secondPersonId) ?? 0,
      );
      if (generation.get(union.firstPersonId) !== shared) {
        generation.set(union.firstPersonId, shared);
        changed = true;
      }
      if (generation.get(union.secondPersonId) !== shared) {
        generation.set(union.secondPersonId, shared);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return generation;
}

function orderGeneration(
  personIds: string[],
  unions: Map<string, FamilyUnion>,
  elkX: Map<string, number>,
) {
  const adjacency = new Map(personIds.map((id) => [id, new Set<string>()]));
  for (const union of unions.values()) {
    if (
      !adjacency.has(union.firstPersonId) ||
      !adjacency.has(union.secondPersonId)
    )
      continue;
    adjacency.get(union.firstPersonId)!.add(union.secondPersonId);
    adjacency.get(union.secondPersonId)!.add(union.firstPersonId);
  }
  const remaining = new Set(personIds);
  const components: string[][] = [];
  while (remaining.size) {
    const seed = [...remaining].sort(
      (a, b) => (elkX.get(a) ?? 0) - (elkX.get(b) ?? 0),
    )[0]!;
    const component: string[] = [];
    const queue = [seed];
    remaining.delete(seed);
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbour of adjacency.get(current) ?? []) {
        if (remaining.delete(neighbour)) queue.push(neighbour);
      }
    }
    const endpoints = component.filter(
      (id) => (adjacency.get(id)?.size ?? 0) <= 1,
    );
    let current = (endpoints.length ? endpoints : component).sort(
      (a, b) => (elkX.get(a) ?? 0) - (elkX.get(b) ?? 0),
    )[0]!;
    const ordered: string[] = [];
    const unused = new Set(component);
    while (unused.size) {
      ordered.push(current);
      unused.delete(current);
      const next = [...(adjacency.get(current) ?? [])]
        .filter((id) => unused.has(id))
        .sort((a, b) => (elkX.get(a) ?? 0) - (elkX.get(b) ?? 0))[0];
      current =
        next ??
        [...unused].sort((a, b) => (elkX.get(a) ?? 0) - (elkX.get(b) ?? 0))[0]!;
    }
    components.push(ordered);
  }
  return components.sort(
    (a, b) =>
      Math.min(...a.map((id) => elkX.get(id) ?? 0)) -
      Math.min(...b.map((id) => elkX.get(id) ?? 0)),
  );
}

export async function layoutGraph(graph: FamilyTreeGraph) {
  const { unions, parentsByChild } = buildUnions(graph);
  const generation = calculateGenerations(graph, unions);
  const elkResult = await elk.layout({
    id: "root",
    layoutOptions: { "elk.algorithm": "layered", "elk.direction": "DOWN" },
    children: graph.nodes.map((person) => ({
      id: person.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: graph.edges
      .filter((edge) => edge.type === "PARENT_CHILD")
      .map((edge) => ({
        id: edge.id,
        sources: [edge.fromPersonId],
        targets: [edge.toPersonId],
      })),
  });
  const elkX = new Map(
    (elkResult.children ?? []).map((node) => [node.id, node.x ?? 0]),
  );
  const positions = new Map<string, { x: number; y: number }>();
  const generations = new Map<number, string[]>();
  for (const person of graph.nodes) {
    const row = generation.get(person.id) ?? 0;
    generations.set(row, [...(generations.get(row) ?? []), person.id]);
  }
  const orderedGenerations = [...generations.entries()].sort(
    ([firstRow], [secondRow]) => firstRow - secondRow,
  );
  for (const [row, personIds] of orderedGenerations) {
    const components = orderGeneration(personIds, unions, elkX);
    const elkAnchor = (component: string[]) =>
      Math.min(...component.map((id) => elkX.get(id) ?? 0));
    const parentAnchor = (component: string[]) => {
      const parentCenters = component.flatMap((personId) =>
        (parentsByChild.get(personId) ?? []).flatMap((parentId) => {
          const parentPosition = positions.get(parentId);
          return parentPosition ? [parentPosition.x + NODE_WIDTH / 2] : [];
        }),
      );
      if (!parentCenters.length) return null;
      return (
        parentCenters.reduce((total, center) => total + center, 0) /
        parentCenters.length
      );
    };
    components.sort((first, second) => {
      const firstParentAnchor = parentAnchor(first);
      const secondParentAnchor = parentAnchor(second);
      if (firstParentAnchor !== null && secondParentAnchor !== null) {
        const difference = firstParentAnchor - secondParentAnchor;
        if (difference) return difference;
      } else if (firstParentAnchor !== null) {
        return -1;
      } else if (secondParentAnchor !== null) {
        return 1;
      }
      return elkAnchor(first) - elkAnchor(second);
    });
    const parentGroupKey = (component: string[]) => {
      const keys = component.flatMap((personId) => {
        const parentIds = parentsByChild.get(personId);
        return parentIds?.length ? [[...parentIds].sort().join("::")] : [];
      });
      return [...new Set(keys)].sort().join("|") || null;
    };
    const parentGroupKeys = components.map(parentGroupKey);
    const gapAfter = (index: number) => {
      const currentKey = parentGroupKeys[index];
      const nextKey = parentGroupKeys[index + 1];
      return currentKey && nextKey && currentKey !== nextKey
        ? FAMILY_GROUP_GAP
        : FAMILY_GAP;
    };
    const rowWidth = components.reduce((total, component, index) => {
      const componentWidth =
        component.length * NODE_WIDTH + (component.length - 1) * PARTNER_GAP;
      const followingGap = index < components.length - 1 ? gapAfter(index) : 0;
      return total + componentWidth + followingGap;
    }, 0);
    let x = -rowWidth / 2;
    components.forEach((component, componentIndex) => {
      component.forEach((personId, personIndex) => {
        positions.set(personId, { x, y: row * GENERATION_GAP });
        x += NODE_WIDTH;
        if (personIndex < component.length - 1) x += PARTNER_GAP;
      });
      if (componentIndex < components.length - 1) x += gapAfter(componentIndex);
    });
  }

  const people = new Map<string, PersonNode>(
    graph.nodes.map((person) => [person.id, person]),
  );
  const nodes: FamilyTreeFlowNode[] = graph.nodes.map((person) => ({
    id: person.id,
    type: "person",
    position: positions.get(person.id) ?? { x: 0, y: 0 },
    data: { ...people.get(person.id)!, selectedPerson: false },
  }));
  const edges: FamilyEdge[] = [];
  const pairedChildren = new Set<string>();

  for (const union of unions.values()) {
    const firstPosition = positions.get(union.firstPersonId)!;
    const secondPosition = positions.get(union.secondPersonId)!;
    const leftId =
      firstPosition.x <= secondPosition.x
        ? union.firstPersonId
        : union.secondPersonId;
    const rightId =
      leftId === union.firstPersonId
        ? union.secondPersonId
        : union.firstPersonId;
    const leftPosition = positions.get(leftId)!;
    const rightPosition = positions.get(rightId)!;
    const unionId = `union-${union.key}`;
    const unionX = (leftPosition.x + NODE_WIDTH + rightPosition.x) / 2;
    const unionY = leftPosition.y + NODE_HEIGHT / 2;
    const presentation = relationshipPresentation(
      union.relationship?.marriageStatus ?? undefined,
    );
    nodes.push({
      id: unionId,
      type: "junction",
      position: { x: unionX, y: unionY },
      data: {
        personIds: [leftId, rightId],
        kind: "pair",
        relationshipKey: union.key,
      },
      selectable: false,
      draggable: false,
      focusable: false,
    });
    edges.push({
      id: `pair-${union.key}`,
      source: leftId,
      target: rightId,
      sourceHandle: "pair-source-right",
      targetHandle: "pair-target-left",
      type: "straight",
      label: presentation.label,
      labelStyle: { fill: presentation.color, fontWeight: 700 },
      labelBgStyle: { fill: "#f8faf9", fillOpacity: 1 },
      labelBgPadding: [5, 3],
      labelBgBorderRadius: 4,
      zIndex: 2,
      className: `family-edge family-edge-pair family-edge-${presentation.className}`,
      data: {
        personIds: [leftId, rightId],
        kind: "pair",
        relationshipKey: union.key,
      },
      style: {
        stroke: presentation.color,
        strokeWidth: 2.5,
        strokeDasharray: presentation.dash,
      },
    });
    if (!union.childIds.size) continue;
    const childIds = [...union.childIds];
    childIds.forEach((id) => pairedChildren.add(id));
    const closestChildY = Math.min(
      ...childIds.map((id) => positions.get(id)!.y),
    );
    const branchId = `branch-${union.key}`;
    nodes.push({
      id: branchId,
      type: "junction",
      position: { x: unionX, y: unionY + (closestChildY - unionY) * 0.48 },
      data: { personIds: [leftId, rightId, ...childIds], kind: "family" },
      selectable: false,
      draggable: false,
      focusable: false,
    });
    edges.push({
      id: `trunk-${union.key}`,
      source: unionId,
      target: branchId,
      sourceHandle: "junction-source",
      targetHandle: "junction-target",
      type: "straight",
      className: "family-edge family-edge-parent",
      zIndex: 1,
      data: {
        personIds: [leftId, rightId, ...childIds],
        kind: "family",
      },
      style: { stroke: "#52796e", strokeWidth: 2 },
    });
    for (const childId of childIds) {
      edges.push({
        id: `child-${union.key}-${childId}`,
        source: branchId,
        target: childId,
        sourceHandle: "junction-source",
        targetHandle: "child-target",
        type: "smoothstep",
        className: "family-edge family-edge-parent",
        zIndex: 1,
        data: { personIds: [leftId, rightId, childId], kind: "family" },
        style: { stroke: "#52796e", strokeWidth: 2 },
      });
    }
  }

  for (const [childId, parentIds] of parentsByChild) {
    if (pairedChildren.has(childId)) continue;
    for (const parentId of parentIds) {
      edges.push({
        id: `single-parent-${parentId}-${childId}`,
        source: parentId,
        target: childId,
        sourceHandle: "parent-source",
        targetHandle: "child-target",
        type: "smoothstep",
        className: "family-edge family-edge-parent",
        zIndex: 1,
        data: { personIds: [parentId, childId], kind: "family" },
        style: { stroke: "#52796e", strokeWidth: 2 },
      });
    }
  }
  return { nodes, edges };
}
