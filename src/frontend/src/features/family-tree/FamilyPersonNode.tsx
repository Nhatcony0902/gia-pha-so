import type { PersonNode } from "@family-tree/shared-types";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type FamilyPersonNodeData = PersonNode & {
  selectedPerson: boolean;
} & Record<string, unknown>;
export type FamilyFlowNode = Node<FamilyPersonNodeData, "person">;

const year = (date: string | null) =>
  date ? new Date(date).getUTCFullYear() : null;

export function FamilyPersonNode({ data: person }: NodeProps<FamilyFlowNode>) {
  const initials = person.fullName
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const genderLabel =
    person.gender === "MALE"
      ? "Nam"
      : person.gender === "FEMALE"
        ? "Nữ"
        : "Chưa rõ";
  const lifespan = [year(person.birthDate), year(person.deathDate)]
    .filter(Boolean)
    .join(" – ");
  return (
    <article
      className={`family-node family-node-${person.gender.toLowerCase()} ${person.isDeceased ? "family-node-deceased" : ""} ${person.selectedPerson ? "family-node-selected" : ""}`}
      aria-label={`${person.fullName}, ${genderLabel}${person.isDeceased ? ", đã mất" : ""}`}
    >
      <Handle id="child-target" type="target" position={Position.Top} />
      <Handle
        id="pair-target-left"
        type="target"
        position={Position.Left}
        className="family-horizontal-handle"
      />
      <Handle
        id="pair-source-left"
        type="source"
        position={Position.Left}
        className="family-horizontal-handle"
      />
      <div className="family-node-avatar">
        {person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials}
      </div>
      <div className="family-node-copy">
        <strong>{person.preferredName ?? person.fullName}</strong>
        <span>
          {genderLabel}
          {lifespan ? ` · ${lifespan}` : ""}
        </span>
        {person.isDeceased && <small>Đã mất</small>}
      </div>
      <Handle
        id="pair-target-right"
        type="target"
        position={Position.Right}
        className="family-horizontal-handle"
      />
      <Handle
        id="pair-source-right"
        type="source"
        position={Position.Right}
        className="family-horizontal-handle"
      />
      <Handle id="parent-source" type="source" position={Position.Bottom} />
    </article>
  );
}
