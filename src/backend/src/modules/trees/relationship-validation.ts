export type ParentRelationshipInput = {
  fromPersonId: string;
  toPersonId: string;
  parentKind: "BIOLOGICAL" | "ADOPTIVE";
};

export function canonicalSpousePair(
  firstPersonId: string,
  secondPersonId: string,
) {
  if (firstPersonId === secondPersonId)
    throw new Error("A person cannot be their own spouse");
  return [firstPersonId, secondPersonId].sort() as [string, string];
}

export function validateParentRelationships(edges: ParentRelationshipInput[]) {
  const seen = new Set<string>();
  const biologicalParents = new Map<string, Set<string>>();
  const children = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.fromPersonId === edge.toPersonId)
      throw new Error("A person cannot be their own parent");
    const key = `${edge.fromPersonId}:${edge.toPersonId}:${edge.parentKind}`;
    if (seen.has(key)) throw new Error("Duplicate parent-child relationship");
    seen.add(key);
    if (edge.parentKind === "BIOLOGICAL") {
      const parents =
        biologicalParents.get(edge.toPersonId) ?? new Set<string>();
      parents.add(edge.fromPersonId);
      if (parents.size > 2)
        throw new Error(
          "A person cannot have more than two biological parents",
        );
      biologicalParents.set(edge.toPersonId, parents);
    }
    const next = children.get(edge.fromPersonId) ?? new Set<string>();
    next.add(edge.toPersonId);
    children.set(edge.fromPersonId, next);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (personId: string) => {
    if (visiting.has(personId))
      throw new Error(
        "Parent-child relationships cannot contain an ancestry cycle",
      );
    if (visited.has(personId)) return;
    visiting.add(personId);
    for (const childId of children.get(personId) ?? []) visit(childId);
    visiting.delete(personId);
    visited.add(personId);
  };
  for (const personId of children.keys()) visit(personId);
}
