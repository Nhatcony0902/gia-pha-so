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
const PERSON_NODE_WIDTH = 200;
const PERSON_NODE_HEIGHT = 80;
const NODE_WIDTH = PERSON_NODE_WIDTH;
const NODE_HEIGHT = PERSON_NODE_HEIGHT;
const JUNCTION_SIZE = 1;
const PARTNER_GAP = 104;
const FAMILY_GAP = 32;
const FAMILY_GROUP_GAP = 80;
const GENERATION_GAP = 190;
const LOWERED_PAIR_TOP_GAP = 22;
const LOWERED_PAIR_LANE_GAP = 18;

export type FamilyTreeFlowNode = FamilyFlowNode | FamilyJunctionFlowNode;
export type FamilyEdgeData = {
  personIds: string[];
  kind?: "pair" | "family";
  relationshipKey?: string;
  routeY?: number;
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

const junctionPosition = (centerX: number, centerY: number) => ({
  x: centerX - JUNCTION_SIZE / 2,
  y: centerY - JUNCTION_SIZE / 2,
});

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

type PositionedComponent = {
  personIds: string[];
  width: number;
  parentGroupKey: string | null;
  siblingOrder: number;
  desiredStart: number;
  sortAnchor: number;
  elkCenter: number;
};

const componentWidth = (personIds: string[]) =>
  personIds.length * NODE_WIDTH + (personIds.length - 1) * PARTNER_GAP;

/**
 * Finds the closest non-overlapping starts to the requested starts while
 * preserving component order. This is a one-dimensional isotonic regression:
 * siblings that request the same center spread equally around that center,
 * while crowded family groups move only as much as necessary.
 */
function packComponents(components: PositionedComponent[], gaps: number[]) {
  if (!components.length) return [];

  const offsets = [0];
  for (let index = 1; index < components.length; index++) {
    offsets[index] =
      offsets[index - 1]! + components[index - 1]!.width + gaps[index - 1]!;
  }

  type Block = {
    first: number;
    last: number;
    average: number;
    weight: number;
  };
  const blocks: Block[] = [];
  components.forEach((component, index) => {
    blocks.push({
      first: index,
      last: index,
      average: component.desiredStart - offsets[index]!,
      weight: 1,
    });
    while (
      blocks.length > 1 &&
      blocks[blocks.length - 2]!.average > blocks[blocks.length - 1]!.average
    ) {
      const right = blocks.pop()!;
      const left = blocks.pop()!;
      const weight = left.weight + right.weight;
      blocks.push({
        first: left.first,
        last: right.last,
        average:
          (left.average * left.weight + right.average * right.weight) / weight,
        weight,
      });
    }
  });

  const starts = new Array<number>(components.length);
  for (const block of blocks) {
    for (let index = block.first; index <= block.last; index++) {
      starts[index] = block.average + offsets[index]!;
    }
  }
  return starts;
}

export async function layoutGraph(graph: FamilyTreeGraph) {
  const { unions, parentsByChild } = buildUnions(graph);
  const singleParentChildren = new Map<string, string[]>();
  for (const [childId, parentIds] of parentsByChild) {
    if (parentIds.length !== 1) continue;
    const parentId = parentIds[0]!;
    singleParentChildren.set(parentId, [
      ...(singleParentChildren.get(parentId) ?? []),
      childId,
    ]);
  }
  const siblingOrderByChild = new Map<string, number>();
  for (const relationship of graph.edges) {
    if (
      relationship.type !== "PARENT_CHILD" ||
      relationship.birthOrder === null
    )
      continue;
    siblingOrderByChild.set(
      relationship.toPersonId,
      Math.min(
        siblingOrderByChild.get(relationship.toPersonId) ??
          Number.POSITIVE_INFINITY,
        relationship.birthOrder,
      ),
    );
  }
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
  const elkBounds = (elkResult.children ?? []).reduce(
    (bounds, node) => ({
      left: Math.min(bounds.left, node.x ?? 0),
      right: Math.max(bounds.right, (node.x ?? 0) + NODE_WIDTH),
    }),
    { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY },
  );
  const elkGraphCenter = Number.isFinite(elkBounds.left)
    ? (elkBounds.left + elkBounds.right) / 2
    : 0;
  const positions = new Map<string, { x: number; y: number }>();
  const generations = new Map<number, string[]>();
  for (const person of graph.nodes) {
    const row = generation.get(person.id) ?? 0;
    generations.set(row, [...(generations.get(row) ?? []), person.id]);
  }
  const orderedGenerations = [...generations.entries()].sort(
    ([firstRow], [secondRow]) => firstRow - secondRow,
  );
  const componentsByGeneration = new Map(
    orderedGenerations.map(([row, personIds]) => [
      row,
      orderGeneration(personIds, unions, elkX),
    ]),
  );
  type ComponentPlacement = { anchor: number; suggestedStart: number };
  const averagePlacement = (placements: ComponentPlacement[]) =>
    placements.length
      ? {
          anchor:
            placements.reduce(
              (total, placement) => total + placement.anchor,
              0,
            ) / placements.length,
          suggestedStart:
            placements.reduce(
              (total, placement) => total + placement.suggestedStart,
              0,
            ) / placements.length,
        }
      : null;
  const familyAnchorForChild = (childId: string) => {
    const parentIds = parentsByChild.get(childId) ?? [];
    if (parentIds.length >= 2) {
      const firstPosition = positions.get(parentIds[0]!);
      const secondPosition = positions.get(parentIds[1]!);
      if (!firstPosition || !secondPosition) return null;
      return (
        (Math.min(firstPosition.x, secondPosition.x) +
          PERSON_NODE_WIDTH +
          Math.max(firstPosition.x, secondPosition.x)) /
        2
      );
    }
    const parentPosition = positions.get(parentIds[0]!);
    return parentPosition ? parentPosition.x + PERSON_NODE_WIDTH / 2 : null;
  };
  const parentPlacement = (component: string[]) =>
    averagePlacement(
      component.flatMap((personId, personIndex) => {
        const anchor = familyAnchorForChild(personId);
        if (anchor === null) return [];
        const personCenter =
          personIndex * (NODE_WIDTH + PARTNER_GAP) + PERSON_NODE_WIDTH / 2;
        return [{ anchor, suggestedStart: anchor - personCenter }];
      }),
    );
  const childPlacement = (component: string[]) => {
    const localX = new Map(
      component.map((personId, index) => [
        personId,
        index * (NODE_WIDTH + PARTNER_GAP),
      ]),
    );
    const couplePlacements = [...unions.values()].flatMap((union) => {
      const firstX = localX.get(union.firstPersonId);
      const secondX = localX.get(union.secondPersonId);
      if (firstX === undefined || secondX === undefined || !union.childIds.size)
        return [];
      const childCenters = [...union.childIds].flatMap((childId) => {
        const childPosition = positions.get(childId);
        return childPosition ? [childPosition.x + PERSON_NODE_WIDTH / 2] : [];
      });
      if (!childCenters.length) return [];
      const anchor =
        childCenters.reduce((total, center) => total + center, 0) /
        childCenters.length;
      const unionCenter =
        (Math.min(firstX, secondX) +
          PERSON_NODE_WIDTH +
          Math.max(firstX, secondX)) /
        2;
      return [{ anchor, suggestedStart: anchor - unionCenter }];
    });
    const singleParentPlacements = component.flatMap((parentId) => {
      const parentX = localX.get(parentId);
      if (parentX === undefined) return [];
      const childCenters = (singleParentChildren.get(parentId) ?? []).flatMap(
        (childId) => {
          const childPosition = positions.get(childId);
          return childPosition ? [childPosition.x + PERSON_NODE_WIDTH / 2] : [];
        },
      );
      if (!childCenters.length) return [];
      const anchor =
        childCenters.reduce((total, center) => total + center, 0) /
        childCenters.length;
      const parentCenter = parentX + PERSON_NODE_WIDTH / 2;
      return [{ anchor, suggestedStart: anchor - parentCenter }];
    });
    return averagePlacement([...couplePlacements, ...singleParentPlacements]);
  };
  const parentGroupKey = (component: string[]) => {
    const keys = component.flatMap((personId) => {
      const parentIds = parentsByChild.get(personId);
      return parentIds?.length ? [[...parentIds].sort().join("::")] : [];
    });
    return [...new Set(keys)].sort().join("|") || null;
  };
  const siblingOrder = (component: string[]) =>
    Math.min(
      ...component.map(
        (personId) =>
          siblingOrderByChild.get(personId) ?? Number.POSITIVE_INFINITY,
      ),
    );
  const placeGeneration = (
    row: number,
    getPlacement: (component: string[]) => ComponentPlacement | null,
  ) => {
    const generationComponents = componentsByGeneration.get(row) ?? [];
    const components: PositionedComponent[] = generationComponents.map(
      (component) => {
        const left = Math.min(...component.map((id) => elkX.get(id) ?? 0));
        const right = Math.max(
          ...component.map((id) => (elkX.get(id) ?? 0) + NODE_WIDTH),
        );
        const elkCenter = (left + right) / 2 - elkGraphCenter;
        const placement = getPlacement(component);
        const currentStart = positions.get(component[0]!)?.x;
        return {
          personIds: component,
          width: componentWidth(component),
          parentGroupKey: parentGroupKey(component),
          siblingOrder: siblingOrder(component),
          desiredStart:
            placement?.suggestedStart ??
            currentStart ??
            elkCenter - componentWidth(component) / 2,
          sortAnchor:
            placement?.anchor ??
            (currentStart === undefined
              ? elkCenter
              : currentStart + componentWidth(component) / 2),
          elkCenter,
        };
      },
    );
    const groupedComponents = new Map<string, PositionedComponent[]>();
    components.forEach((component, index) => {
      const key = component.parentGroupKey ?? `unattached:${index}`;
      groupedComponents.set(key, [
        ...(groupedComponents.get(key) ?? []),
        component,
      ]);
    });
    const familyGroups = [...groupedComponents.values()].map((group) => {
      group.sort((first, second) => {
        const orderDifference = first.siblingOrder - second.siblingOrder;
        if (Number.isFinite(orderDifference) && orderDifference)
          return orderDifference;
        return (
          first.sortAnchor - second.sortAnchor ||
          first.elkCenter - second.elkCenter
        );
      });
      const innerStarts = packComponents(
        group,
        group.slice(0, -1).map(() => FAMILY_GAP),
      );
      const left = Math.min(...innerStarts);
      const right = Math.max(
        ...group.map(
          (component, index) => innerStarts[index]! + component.width,
        ),
      );
      return {
        components: group,
        innerStarts,
        left,
        width: right - left,
        parentGroupKey: group[0]!.parentGroupKey,
        sortAnchor:
          group.reduce((total, component) => total + component.sortAnchor, 0) /
          group.length,
        elkCenter:
          group.reduce((total, component) => total + component.elkCenter, 0) /
          group.length,
      };
    });
    familyGroups.sort(
      (first, second) =>
        first.sortAnchor - second.sortAnchor ||
        first.elkCenter - second.elkCenter,
    );
    const groupStarts = packComponents(
      familyGroups.map((group) => ({
        personIds: [],
        width: group.width,
        parentGroupKey: group.parentGroupKey,
        siblingOrder: Number.POSITIVE_INFINITY,
        desiredStart: group.left,
        sortAnchor: group.sortAnchor,
        elkCenter: group.elkCenter,
      })),
      familyGroups
        .slice(0, -1)
        .map((group, index) =>
          group.parentGroupKey &&
          familyGroups[index + 1]!.parentGroupKey &&
          group.parentGroupKey !== familyGroups[index + 1]!.parentGroupKey
            ? FAMILY_GROUP_GAP
            : FAMILY_GAP,
        ),
    );

    familyGroups.forEach((group, groupIndex) => {
      const shift = groupStarts[groupIndex]! - group.left;
      group.components.forEach((component, componentIndex) => {
        let x = group.innerStarts[componentIndex]! + shift;
        component.personIds.forEach((personId, personIndex) => {
          positions.set(personId, { x, y: row * GENERATION_GAP });
          x += NODE_WIDTH;
          if (personIndex < component.personIds.length - 1) x += PARTNER_GAP;
        });
      });
    });
  };
  const reconciledParentPlacements = (row: number) => {
    const rowComponents = componentsByGeneration.get(row) ?? [];
    const familyGroups = new Map<string, string[][]>();
    for (const component of rowComponents) {
      const key = parentGroupKey(component) ?? `unattached:${component[0]}`;
      familyGroups.set(key, [...(familyGroups.get(key) ?? []), component]);
    }
    const placements = new Map<string, ComponentPlacement>();
    for (const components of familyGroups.values()) {
      const deltas = components.flatMap((component) =>
        component.flatMap((personId) => {
          const personPosition = positions.get(personId);
          if (!personPosition) return [];
          const parentCenter = familyAnchorForChild(personId);
          if (parentCenter === null) return [];
          return [parentCenter - (personPosition.x + PERSON_NODE_WIDTH / 2)];
        }),
      );
      if (!deltas.length) continue;
      const delta =
        deltas.reduce((total, value) => total + value, 0) / deltas.length;
      for (const component of components) {
        const currentStart = positions.get(component[0]!)!.x;
        const suggestedStart = currentStart + delta;
        placements.set(component[0]!, {
          anchor: suggestedStart + componentWidth(component) / 2,
          suggestedStart,
        });
      }
    }
    return placements;
  };

  for (const [row] of orderedGenerations) placeGeneration(row, parentPlacement);

  for (let pass = 0; pass < 16; pass++) {
    for (const [row] of [...orderedGenerations].reverse())
      placeGeneration(row, childPlacement);
    for (const [row] of orderedGenerations.slice(1)) {
      const placements = reconciledParentPlacements(row);
      placeGeneration(
        row,
        (component) =>
          placements.get(component[0]!) ?? parentPlacement(component),
      );
    }
  }
  for (const [row] of [...orderedGenerations].reverse())
    placeGeneration(row, childPlacement);

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
  const loweredPairRoutes = new Map<string, number>();
  const loweredPairsByRow = new Map<
    number,
    Array<{ key: string; left: number; right: number }>
  >();
  for (const union of unions.values()) {
    const firstPosition = positions.get(union.firstPersonId)!;
    const secondPosition = positions.get(union.secondPersonId)!;
    const left = Math.min(firstPosition.x, secondPosition.x);
    const right = Math.max(firstPosition.x, secondPosition.x);
    const hasPersonBetween = graph.nodes.some((person) => {
      if (
        person.id === union.firstPersonId ||
        person.id === union.secondPersonId
      )
        return false;
      const position = positions.get(person.id)!;
      return (
        position.y === firstPosition.y &&
        position.x > left &&
        position.x < right
      );
    });
    if (!hasPersonBetween) continue;
    loweredPairsByRow.set(firstPosition.y, [
      ...(loweredPairsByRow.get(firstPosition.y) ?? []),
      { key: union.key, left, right },
    ]);
  }
  for (const [rowY, rowPairs] of loweredPairsByRow) {
    const lanes: Array<Array<{ left: number; right: number }>> = [];
    rowPairs
      .sort(
        (first, second) =>
          first.right - first.left - (second.right - second.left) ||
          first.left - second.left,
      )
      .forEach((pair) => {
        let lane = lanes.findIndex((intervals) =>
          intervals.every(
            (interval) =>
              pair.right <= interval.left || pair.left >= interval.right,
          ),
        );
        if (lane < 0) {
          lane = lanes.length;
          lanes.push([]);
        }
        lanes[lane]!.push(pair);
        loweredPairRoutes.set(
          pair.key,
          rowY +
            PERSON_NODE_HEIGHT +
            LOWERED_PAIR_TOP_GAP +
            lane * LOWERED_PAIR_LANE_GAP,
        );
      });
  }

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
    const unionX = (leftPosition.x + PERSON_NODE_WIDTH + rightPosition.x) / 2;
    const loweredRouteY = loweredPairRoutes.get(union.key);
    const unionY = loweredRouteY ?? leftPosition.y + PERSON_NODE_HEIGHT / 2;
    const presentation = relationshipPresentation(
      union.relationship?.marriageStatus ?? undefined,
    );
    nodes.push({
      id: unionId,
      type: "junction",
      position: junctionPosition(unionX, unionY),
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
      type: loweredRouteY === undefined ? "straight" : "relationship-route",
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
        routeY: loweredRouteY,
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
      position: junctionPosition(
        unionX,
        unionY + (closestChildY - unionY) * 0.48,
      ),
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
        data: {
          personIds: [leftId, rightId, childId],
          kind: "family",
          relationshipKey: `family:${union.key}::${childId}`,
        },
        style: { stroke: "#52796e", strokeWidth: 2 },
      });
    }
  }

  for (const [childId, parentIds] of parentsByChild) {
    if (pairedChildren.has(childId)) continue;
    for (const parentId of parentIds) {
      const relationship = graph.edges.find(
        (edge) =>
          edge.type === "PARENT_CHILD" &&
          edge.fromPersonId === parentId &&
          edge.toPersonId === childId,
      );
      if (!relationship) continue;
      edges.push({
        id: `single-parent-${parentId}-${childId}`,
        source: parentId,
        target: childId,
        sourceHandle: "parent-source",
        targetHandle: "child-target",
        type: "smoothstep",
        className: "family-edge family-edge-parent",
        zIndex: 1,
        data: {
          personIds: [parentId, childId],
          kind: "family",
          relationshipKey: `parent:${relationship.id}`,
        },
        style: { stroke: "#52796e", strokeWidth: 2 },
      });
    }
  }
  return { nodes, edges };
}
